'use server'

import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';
import { verificarSessaoFuncionario } from '@/app/actions/auth';
import { ActionResult, FechamentoComanda } from '@/types/domain';
import { schemaAdicionarProdutoComanda, schemaFinalizarComanda } from '@/lib/schemas';

// ── 1. Listagem de Produtos ───────────────────────────────────────────────────
export async function listarProdutosDisponiveis() {
    // Blindagem de Leitura
    const sessao = await verificarSessaoFuncionario();
    if (!sessao.logado) throw new Error('Acesso negado.');

    // Otimização no DB: Traz apenas o que tem estoque positivo, 
    // economizando processamento de array.filter em memória.
    return await prisma.produto.findMany({
        where: { ativo: true, estoque: { gt: 0 } },
        orderBy: { nome: 'asc' }
    });
}

// ── 2. Adição de Produto à Comanda (Venda Direta) ─────────────────────────────
export async function adicionarProdutoNaComanda(
    agendamentoId: string,
    produtoId: string,
    quantidadeFrascos: number
): Promise<ActionResult> {
    try {
        // 1. Blindagem de Acesso
        const sessao = await verificarSessaoFuncionario();
        if (!sessao.logado) return { sucesso: false, erro: 'Acesso negado.' };

        // 2. Validação Estrita de Entrada (Zod)
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

        // 3. Transação Interativa (Garante Atomicidade: Tudo ou Nada)
        await prisma.$transaction(async (tx) => {
            const produtoInfo = await tx.produto.findUnique({
                where: { id: produtoId },
                select: { precoVenda: true, tamanhoUnidade: true }
            });

            if (!produtoInfo) throw new Error('Produto não encontrado no catálogo.');

            const baixaAbsoluta = quantidadeFrascos * produtoInfo.tamanhoUnidade;

            // Etapa A: Reduz o estoque físico com Lock Condicional (Optimistic Concurrency Control)
            // Previne Race Conditions (estoque negativo) se 2 recepcionistas venderem o mesmo produto no mesmo milissegundo.
            const atualizacaoEstoque = await tx.produto.updateMany({
                where: {
                    id: produtoId,
                    estoque: { gte: baixaAbsoluta } // Condição de bloqueio: só atualiza se houver estoque
                },
                data: { estoque: { decrement: baixaAbsoluta } }
            });

            if (atualizacaoEstoque.count === 0) {
                throw new Error('Estoque insuficiente devido a movimentação simultânea.');
            }

            // Etapa B: Insere o item na comanda
            await tx.itemProduto.create({
                data: {
                    agendamentoId,
                    produtoId,
                    quantidade: quantidadeFrascos,
                    precoCobrado: produtoInfo.precoVenda
                }
            });

            // Etapa C: Incrementa o valor da comanda baseando no preço oficial congelado
            await tx.agendamento.update({
                where: { id: agendamentoId },
                data: { valorBruto: { increment: produtoInfo.precoVenda * quantidadeFrascos } }
            });
        });

        revalidatePath(`/profissional/comanda/${agendamentoId}`);
        return { sucesso: true };
    } catch (error) {
        console.error("Erro Concorrência/Produto ao adicionar à comanda:", error);
        return {
            sucesso: false,
            erro: error instanceof Error ? error.message : 'Falha técnica ao adicionar produto à comanda.'
        };
    }
}

// ── 3. Fechamento Absoluto (Físico + Financeiro) ──────────────────────────────
/**
 * Unificação da baixa de estoque (Insumos) e do Snapshot Financeiro.
 * Executa todas as atualizações de forma atômica (ACID).
 */
export async function finalizarComanda(
    agendamentoId: string,
    taxaAdquirentePercentual: number = 3,
    custoInsumosValidado: number // Segue a abordagem Híbrida definida anteriormente
): Promise<ActionResult<{ financeiro: FechamentoComanda }>> {
    try {
        // Blindagem de Acesso
        const sessao = await verificarSessaoFuncionario();
        if (!sessao.logado) return { sucesso: false, erro: 'Acesso negado.' };

        // Validação Estrita de Entrada (Zod)
        const validacao = schemaFinalizarComanda.safeParse({
            agendamentoId,
            taxaAdquirentePercentual,
            custoInsumosValidado
        });

        if (!validacao.success) {
            return {
                sucesso: false,
                erro: validacao.error.issues[0]?.message ?? 'Dados de fechamento inválidos.'
            };
        }

        // Inicia a super-transação do fechamento da comanda
        const resultadoFechamento = await prisma.$transaction(async (tx) => {
            const agendamento = await tx.agendamento.findUnique({
                where: { id: agendamentoId },
                include: {
                    funcionario: { select: { comissao: true } },
                    servicos: {
                        include: {
                            servico: { include: { insumos: { include: { produto: true } } } }
                        }
                    },
                    produtos: {
                        include: { produto: true }
                    }
                }
            });

            if (!agendamento) throw new Error('Comanda não encontrada.');
            if (agendamento.concluido) throw new Error('Esta comanda já foi faturada.');

            const valorBruto = agendamento.valorBruto;
            const comissaoSnap = agendamento.funcionario.comissao;

            // 1. Processamento Físico: Baixa de Insumos da Ficha Técnica
            const consumoTotalInsumos = new Map<string, number>();
            for (const itemServico of agendamento.servicos) {
                for (const insumo of itemServico.servico.insumos) {
                    const atual = consumoTotalInsumos.get(insumo.produtoId) || 0;
                    consumoTotalInsumos.set(insumo.produtoId, atual + insumo.quantidadeUsada);
                }
            }

            // Otimização de Performance: Despacha as promises de atualização do banco em paralelo.
            // Impede que o loop segure a transação (e os locks do banco) por muito tempo.
            const operacoesEstoque = Array.from(consumoTotalInsumos.entries()).map(([produtoId, quantidadeGasta]) =>
                tx.produto.update({
                    where: { id: produtoId },
                    data: { estoque: { decrement: quantidadeGasta } }
                })
            );
            await Promise.all(operacoesEstoque);

            // 2. Processamento Financeiro: Custo de Revenda
            let custoRevenda = 0;
            for (const item of agendamento.produtos) {
                const custoUnitario = item.produto?.precoCusto ?? (item.precoCobrado * 0.5);
                custoRevenda += custoUnitario * item.quantidade;
            }

            // 3. Regras de Negócio Financeiras (Imutáveis)
            const valorTaxaCartao = valorBruto * (taxaAdquirentePercentual / 100);
            const deducoesTotais = valorTaxaCartao + custoInsumosValidado + custoRevenda;

            const baseLiquidaComissao = Math.max(0, valorBruto - deducoesTotais);
            const valorComissao = baseLiquidaComissao * (comissaoSnap / 100);
            const lucroSalao = valorBruto - deducoesTotais - valorComissao;

            // 4. Selo de Imutabilidade (Snapshot)
            await tx.agendamento.update({
                where: { id: agendamentoId },
                data: {
                    concluido: true,
                    taxas: valorTaxaCartao,
                    custoInsumos: custoInsumosValidado,
                    custoRevenda,
                    valorComissao,
                    comissaoSnap,
                }
            });

            return {
                bruto: valorBruto,
                deducoes: deducoesTotais,
                baseReal: valorBruto - deducoesTotais,
                comissao: valorComissao,
                lucroSalao,
            };
        });

        // Revalida o cache
        revalidatePath('/profissional/agenda');
        revalidatePath(`/profissional/comanda/${agendamentoId}`);
        revalidatePath('/admin/estoque');
        revalidatePath('/admin/financeiro');

        return { sucesso: true, financeiro: resultadoFechamento };
    } catch (error) {
        console.error("Erro crítico ao faturar comanda:", error);
        return {
            sucesso: false,
            erro: error instanceof Error ? error.message : 'Falha técnica ao faturar a comanda.'
        };
    }
}