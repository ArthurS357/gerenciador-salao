'use server'

import { prisma } from '@/lib/prisma';
import { StatusAgendamento } from '@prisma/client';
import { revalidatePath } from 'next/cache';
import { verificarSessaoFuncionario } from '@/app/actions/auth';
import { z } from 'zod';
import type {
    ActionResult,
    FechamentoComanda,
    MetodoPagamentoConfig,
    MetodoPagamento,
    PagamentoComandaInput,
} from '@/types/domain';
import { schemaAdicionarProdutoComanda } from '@/lib/schemas';
import { decimalParaNumero } from '@/lib/decimal-utils';
import {
    calcularCustoRevenda,
    calcularTaxasEPagamentos,
    calcularSnapshotFinanceiro,
    type TaxaConfigInput,
} from '@/domain/financeiro/calculadora';

// ── Schemas internos para finalização V2 ─────────────────────────────────────

const METODOS_VALIDOS = [
    'DINHEIRO', 'PIX', 'CARTAO_DEBITO', 'CARTAO_CREDITO',
    'CORTESIA', 'VOUCHER', 'PERMUTA',
] as const satisfies readonly MetodoPagamento[]

const schemaPagamentoItem = z.object({
    metodo: z.enum(METODOS_VALIDOS, { message: 'Método de pagamento inválido.' }),
    valor: z.coerce.number().positive('Valor do pagamento deve ser maior que zero.'),
    parcelas: z.coerce.number().int().min(1).max(12).default(1),
    bandeira: z.string().default(''),
})

const schemaFinalizarComanda = z.object({
    agendamentoId: z.string().min(1, 'ID do agendamento é necessário.'),
    custoInsumos: z.coerce.number().min(0, 'Custo de insumos não pode ser negativo.').default(0),
    pagamentos: z
        .array(schemaPagamentoItem)
        .min(1, 'Informe ao menos uma forma de pagamento.')
        .max(7, 'Número de métodos de pagamento excede o limite.'),
})

// ── 1. Listagem de Produtos ───────────────────────────────────────────────────
export async function listarProdutosDisponiveis() {
    const sessao = await verificarSessaoFuncionario();
    if (!sessao.logado) throw new Error('Acesso negado.');

    const rows = await prisma.produto.findMany({
        where: { ativo: true, estoque: { gt: 0 } },
        orderBy: { nome: 'asc' }
    });

    // Converte Decimal na fronteira
    return rows.map(r => ({
        ...r,
        precoCusto: decimalParaNumero(r.precoCusto),
        precoVenda: decimalParaNumero(r.precoVenda),
    }));
}

// ── 2. Listagem de Métodos de Pagamento Ativos ────────────────────────────────
/**
 * Retorna os métodos de pagamento configurados no banco (TaxaMetodoPagamento).
 * Usado pela UI do checkout para montar o select de métodos dinamicamente.
 */
export async function listarMetodosPagamento(): Promise<ActionResult<{ metodos: MetodoPagamentoConfig[] }>> {
    const sessao = await verificarSessaoFuncionario();
    if (!sessao.logado) return { sucesso: false, erro: 'Acesso negado.' };

    try {
        const registros = await prisma.taxaMetodoPagamento.findMany({
            where: { ativo: true },
            orderBy: [{ metodo: 'asc' }, { bandeira: 'asc' }],
            select: { id: true, metodo: true, bandeira: true, descricao: true, taxaBase: true, ativo: true },
        });

        // Garante que apenas métodos válidos no domínio são retornados
        const metodos = registros
            .filter(r => (METODOS_VALIDOS as readonly string[]).includes(r.metodo))
            .map(r => ({
                ...r,
                metodo: r.metodo as MetodoPagamento,
                taxaBase: decimalParaNumero(r.taxaBase),
            }));

        // Fallback: se a tabela estiver vazia, retorna os 4 métodos principais (sem bandeira)
        if (metodos.length === 0) {
            const fallback: MetodoPagamentoConfig[] = [
                { id: 'fallback-dinheiro', metodo: 'DINHEIRO', bandeira: '', descricao: 'Dinheiro', taxaBase: 0, ativo: true },
                { id: 'fallback-pix', metodo: 'PIX', bandeira: '', descricao: 'PIX', taxaBase: 0, ativo: true },
                { id: 'fallback-debito', metodo: 'CARTAO_DEBITO', bandeira: '', descricao: 'Cartão de Débito', taxaBase: 1.5, ativo: true },
                { id: 'fallback-credito', metodo: 'CARTAO_CREDITO', bandeira: '', descricao: 'Cartão de Crédito', taxaBase: 3.0, ativo: true },
            ];
            return { sucesso: true, data: { metodos: fallback } };
        }

        return { sucesso: true, data: { metodos } };
    } catch (error) {
        console.error('[Comanda] Erro ao listar métodos de pagamento:', error);
        return { sucesso: false, erro: 'Falha ao carregar os métodos de pagamento.' };
    }
}

// ── 3. Adição de Produto à Comanda (Venda Direta) ─────────────────────────────
export async function adicionarProdutoNaComanda(
    agendamentoId: string,
    produtoId: string,
    quantidadeFrascos: number
): Promise<ActionResult> {
    try {
        const sessao = await verificarSessaoFuncionario();
        if (!sessao.logado) return { sucesso: false, erro: 'Acesso negado.' };

        const validacao = schemaAdicionarProdutoComanda.safeParse({
            agendamentoId,
            produtoId,
            quantidadeFrascos
        });

        if (!validacao.success) {
            return {
                sucesso: false,
                erro: validacao.error.issues[0]?.message ?? 'Dados de entrada inválidos.'
            };
        }

        await prisma.$transaction(async (tx) => {
            const produtoInfo = await tx.produto.findUnique({
                where: { id: produtoId },
                select: { precoVenda: true, tamanhoUnidade: true }
            });

            if (!produtoInfo) throw new Error('Produto não encontrado no catálogo.');

            const precoVenda = decimalParaNumero(produtoInfo.precoVenda);
            const baixaAbsoluta = quantidadeFrascos * produtoInfo.tamanhoUnidade;

            const atualizacaoEstoque = await tx.produto.updateMany({
                where: {
                    id: produtoId,
                    estoque: { gte: baixaAbsoluta }
                },
                data: { estoque: { decrement: baixaAbsoluta } }
            });

            if (atualizacaoEstoque.count === 0) {
                throw new Error('Estoque insuficiente devido a movimentação simultânea.');
            }

            await tx.itemProduto.create({
                data: {
                    agendamentoId,
                    produtoId,
                    quantidade: quantidadeFrascos,
                    precoCobrado: precoVenda
                }
            });

            await tx.agendamento.update({
                where: { id: agendamentoId },
                data: { valorBruto: { increment: precoVenda * quantidadeFrascos } }
            });
        });

        revalidatePath(`/profissional/comanda/${agendamentoId}`);
        return { sucesso: true };
    } catch (error) {
        console.error("[Comanda] Erro ao adicionar produto à comanda:", error);
        return {
            sucesso: false,
            erro: error instanceof Error ? error.message : 'Falha técnica ao adicionar produto à comanda.'
        };
    }
}

// ── 4. Fechamento de Comanda (Suporte a Múltiplos Pagamentos + Dívida) ────────
/**
 * Fecha a comanda com suporte a:
 * - Múltiplos métodos de pagamento simultâneos
 * - Pagamento parcial: gera DividaCliente e retém a comissão do profissional
 * - Taxas dinâmicas lidas de TaxaMetodoPagamento
 * - Snapshot imutável congelado no momento do fechamento (ACID)
 */
export async function finalizarComanda(
    agendamentoId: string,
    custoInsumos: number,
    pagamentos: PagamentoComandaInput[]
): Promise<ActionResult<{ financeiro: FechamentoComanda }>> {
    try {
        // ── Blindagem de Acesso ───────────────────────────────────────────────
        const sessao = await verificarSessaoFuncionario();
        if (!sessao.logado) return { sucesso: false, erro: 'Acesso negado.' };

        // ── Validação Estrita de Entrada (Zod) ────────────────────────────────
        const validacao = schemaFinalizarComanda.safeParse({
            agendamentoId,
            custoInsumos,
            pagamentos,
        });

        if (!validacao.success) {
            return {
                sucesso: false,
                erro: validacao.error.issues[0]?.message ?? 'Dados de fechamento inválidos.'
            };
        }

        const input = validacao.data;

        // ── Super-Transação ACID ───────────────────────────────────────────────
        const resultadoFechamento = await prisma.$transaction(async (tx) => {

            // 1. Carrega o agendamento com todos os dados necessários
            const agendamento = await tx.agendamento.findUnique({
                where: { id: agendamentoId },
                include: {
                    funcionario: { select: { comissao: true } },
                    servicos: {
                        include: {
                            servico: { include: { insumos: { include: { produto: true } } } }
                        }
                    },
                    produtos: { include: { produto: true } }
                }
            });

            if (!agendamento) throw new Error('Comanda não encontrada.');
            if (agendamento.status === StatusAgendamento.FINALIZADO) throw new Error('Esta comanda já foi faturada.');
            if (agendamento.status === StatusAgendamento.CANCELADO) throw new Error('Não é possível faturar uma comanda cancelada.');

            // 2. RBAC: ADMIN e RECEPCIONISTA podem fechar qualquer comanda;
            //    PROFISSIONAL só pode fechar a própria.
            if (
                sessao.role !== 'ADMIN' &&
                sessao.role !== 'RECEPCIONISTA' &&
                sessao.id !== agendamento.funcionarioId
            ) {
                throw new Error('Acesso negado. Você só pode fechar suas próprias comandas.');
            }

            const valorBruto = decimalParaNumero(agendamento.valorBruto);
            const comissaoSnap = decimalParaNumero(agendamento.funcionario.comissao);

            // 3. Lê as taxas dinâmicas configuradas pelo Admin
            const taxasConfigs = await tx.taxaMetodoPagamento.findMany({ where: { ativo: true } });

            // 4. Processamento Físico: Baixa de Insumos da Ficha Técnica
            const consumoTotalInsumos = new Map<string, number>();
            for (const itemServico of agendamento.servicos) {
                for (const insumo of itemServico.servico.insumos) {
                    const atual = consumoTotalInsumos.get(insumo.produtoId) ?? 0;
                    consumoTotalInsumos.set(insumo.produtoId, atual + insumo.quantidadeUsada);
                }
            }

            await Promise.all(
                Array.from(consumoTotalInsumos.entries()).map(async ([produtoId, quantidadeGasta]) => {
                    const resultado = await tx.produto.updateMany({
                        where: { id: produtoId, estoque: { gte: quantidadeGasta } },
                        data: { estoque: { decrement: quantidadeGasta } },
                    });
                    if (resultado.count === 0) {
                        throw new Error(`Estoque insuficiente para o insumo (id: ${produtoId}) no momento do fechamento.`);
                    }
                })
            );

            // 5. Custo de Revenda — função pura de domínio
            const produtosParaCusto = agendamento.produtos.map(p => ({
                precoCobrado: decimalParaNumero(p.precoCobrado),
                quantidade: p.quantidade,
                produto: p.produto ? { precoCusto: decimalParaNumero(p.produto.precoCusto) } : null,
            }));
            const custoRevenda = calcularCustoRevenda(produtosParaCusto);

            // 6. Taxas e pagamentos enriquecidos — função pura de domínio
            const taxasConfigMap = new Map<string, TaxaConfigInput>(
                taxasConfigs.map(t => [`${t.metodo}:${t.bandeira}`, { id: t.id, metodo: t.metodo, bandeira: t.bandeira, taxaBase: decimalParaNumero(t.taxaBase) }])
            );
            const { pagamentosCalculados: pagamentosComTaxa, totalTaxas } =
                calcularTaxasEPagamentos(input.pagamentos, taxasConfigMap);

            // 7+8. Snapshot financeiro imutável — função pura de domínio
            const totalRecebido = input.pagamentos.reduce((sum, p) => sum + p.valor, 0);
            const snapshot = calcularSnapshotFinanceiro(
                valorBruto, totalTaxas, input.custoInsumos, custoRevenda, comissaoSnap, totalRecebido
            );
            const { comissao: valorComissao, valorPago, valorPendente, comissaoLiberada } = snapshot;

            // 9. Cria os registros de PagamentoComanda
            await Promise.all(
                pagamentosComTaxa.map(pag =>
                    tx.pagamentoComanda.create({
                        data: {
                            agendamentoId,
                            metodo: pag.metodo,
                            bandeira: pag.bandeira,
                            valor: pag.valor,
                            parcelas: pag.parcelas,
                            taxaAplicada: pag.taxaAplicada,
                            ...(pag.taxaMetodoId ? { taxaMetodoId: pag.taxaMetodoId } : {}),
                        }
                    })
                )
            );

            // 10. Se houver saldo pendente, registra DividaCliente e retém comissão
            if (valorPendente > 0.01) {
                await tx.dividaCliente.create({
                    data: {
                        clienteId: agendamento.clienteId,
                        agendamentoId,
                        valorOriginal: valorPendente,
                        valorQuitado: 0,
                        status: 'PENDENTE',
                        observacao: `Dívida gerada no fechamento da comanda em ${new Date().toLocaleDateString('pt-BR')}.`,
                    }
                });
            }

            // 11. Selo de Imutabilidade: atualiza o agendamento com o snapshot
            await tx.agendamento.update({
                where: { id: agendamentoId },
                data: {
                    status: StatusAgendamento.FINALIZADO,
                    taxas: totalTaxas,
                    custoInsumos: input.custoInsumos,
                    custoRevenda,
                    valorComissao,
                    comissaoSnap,
                    comissaoLiberada,
                    valorPago,
                    valorPendente,
                }
            });

            return snapshot;
        });

        revalidatePath('/profissional/agenda');
        revalidatePath(`/profissional/comanda/${agendamentoId}`);
        revalidatePath('/admin/estoque');
        revalidatePath('/admin/financeiro');
        revalidatePath('/admin/clientes');

        return { sucesso: true, data: { financeiro: resultadoFechamento } };
    } catch (error) {
        console.error('[Comanda] Erro crítico ao faturar comanda:', error);
        return {
            sucesso: false,
            erro: error instanceof Error ? error.message : 'Falha técnica ao faturar a comanda.'
        };
    }
}
