'use server'

import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';

// 1. Lista produtos para a vitrine da comanda (Revenda)
export async function listarProdutosDisponiveis() {
    return await prisma.produto.findMany({
        // Traz apenas produtos ativos e que tenham pelo menos 1 frasco inteiro em estoque
        // (comparamos o estoque absoluto com o tamanhoUnidade)
        where: {
            ativo: true,
        },
        orderBy: { nome: 'asc' }
    }).then(produtos => produtos.filter(p => p.estoque >= p.tamanhoUnidade));
}

// 2. Adiciona produto inteiro à comanda (Venda Direta para o cliente levar)
export async function adicionarProdutoNaComanda(agendamentoId: string, produtoId: string, quantidadeFrascos: number) {
    try {
        // Passo 1: Descobrir o tamanho do frasco para calcular a baixa absoluta
        const produtoInfo = await prisma.produto.findUnique({
            where: { id: produtoId },
            select: { precoVenda: true, tamanhoUnidade: true }
        });

        if (!produtoInfo) {
            return { sucesso: false, erro: 'Produto não encontrado.' };
        }

        const baixaAbsoluta = quantidadeFrascos * produtoInfo.tamanhoUnidade;

        // Passo 2: Atualização atômica (Só atualiza se o estoque atual for >= à baixa)
        const produtoAtualizado = await prisma.produto.update({
            where: {
                id: produtoId,
                estoque: { gte: baixaAbsoluta } // Proteção no banco de dados contra estoque negativo
            },
            data: { estoque: { decrement: baixaAbsoluta } }
        }).catch(() => null);

        if (!produtoAtualizado) {
            return { sucesso: false, erro: 'Estoque insuficiente para a quantidade solicitada.' };
        }

        // Passo 3: Adiciona à comanda e consolida o financeiro (Valor Bruto)
        await prisma.$transaction([
            prisma.itemProduto.create({
                data: {
                    agendamentoId,
                    produtoId,
                    quantidade: quantidadeFrascos,
                    precoCobrado: produtoInfo.precoVenda
                }
            }),
            prisma.agendamento.update({
                where: { id: agendamentoId },
                data: { valorBruto: { increment: produtoInfo.precoVenda * quantidadeFrascos } }
            })
        ]);

        return { sucesso: true };
    } catch (error) {
        console.error("Erro ao adicionar produto:", error);
        return { sucesso: false, erro: 'Falha técnica ao adicionar produto à comanda.' };
    }
}

// 3. Fatura a comanda e processa os custos da Ficha Técnica e Financeiros
export async function finalizarComanda(agendamentoId: string) {
    try {
        // Busca a comanda com os serviços (e as suas fichas técnicas) e produtos diretos vendidos
        const agendamento = await prisma.agendamento.findUnique({
            where: { id: agendamentoId },
            include: {
                funcionario: true,
                servicos: {
                    include: {
                        servico: {
                            include: {
                                insumos: {
                                    include: { produto: true } // Necessário para acessar o precoCusto
                                }
                            }
                        }
                    }
                },
                produtos: {
                    include: { produto: true } // Necessário para acessar o custo dos produtos de revenda
                }
            }
        });

        if (!agendamento) {
            return { sucesso: false, erro: 'Comanda não encontrada.' };
        }

        if (agendamento.concluido) {
            return { sucesso: false, erro: 'Esta comanda já foi faturada.' };
        }

        let custoTotalDespesas = 0; // Guardará o custo monetário total (insumos + revenda)
        const consumoTotalInsumos = new Map<string, number>();

        // 1.1 Calcular os Insumos Fracionados (Ficha Técnica)
        for (const itemServico of agendamento.servicos) {
            for (const insumo of itemServico.servico.insumos) {
                // Guarda a quantidade física para dar baixa no estoque mais tarde
                const atual = consumoTotalInsumos.get(insumo.produtoId) || 0;
                consumoTotalInsumos.set(insumo.produtoId, atual + insumo.quantidadeUsada);

                // Cálculo Monetário: (Custo do Frasco / Tamanho do Frasco) * Quantidade Usada
                const precoCusto = insumo.produto.precoCusto || 0;
                const tamanhoUnidade = insumo.produto.tamanhoUnidade || 1;
                const custoFracionado = (precoCusto / tamanhoUnidade) * insumo.quantidadeUsada;

                custoTotalDespesas += custoFracionado;
            }
        }

        // 1.2 Calcular os Custos de Produtos de Revenda Direta
        for (const itemProduto of agendamento.produtos) {
            const precoCustoRevenda = itemProduto.produto.precoCusto || 0;
            // A quantidade vendida ao cliente vezes o que o salão pagou pelo produto no fornecedor
            custoTotalDespesas += (precoCustoRevenda * itemProduto.quantidade);
        }

        // Passo 2: Preparar todas as transações de banco de dados
        // Usamos o tipo genérico any devido às assinaturas diferentes do Prisma (update de produto vs agendamento)
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const transacoes: any[] = [];

        // 2.1 Adiciona a baixa física de estoque de cada insumo consumido internamente
        for (const [produtoId, quantidadeTotalGasta] of consumoTotalInsumos.entries()) {
            transacoes.push(
                prisma.produto.update({
                    where: { id: produtoId },
                    data: { estoque: { decrement: quantidadeTotalGasta } }
                })
            );
        }

        // 2.2 Lógica Matemática de Fecho (Cartão)
        // Idealmente, a taxa deve vir de uma configuração do salão ou seleção no momento do checkout
        const taxaAdquirentePercentual = 3;
        const valorTaxaCartao = agendamento.valorBruto * (taxaAdquirentePercentual / 100);

        // 2.3 Fatura a comanda guardando todas as deduções consolidadas
        transacoes.push(
            prisma.agendamento.update({
                where: { id: agendamentoId },
                data: {
                    concluido: true,
                    taxas: valorTaxaCartao,
                    custoInsumos: custoTotalDespesas
                }
            })
        );

        // Executa todas as atualizações de forma atômica (All-or-Nothing)
        await prisma.$transaction(transacoes);

        // Revalida o cache das rotas que dependem destes dados
        revalidatePath('/profissional/agenda');
        revalidatePath(`/profissional/comanda/${agendamentoId}`);
        revalidatePath('/admin/estoque');
        revalidatePath('/admin/financeiro');

        return { sucesso: true };
    } catch (error) {
        console.error("Erro ao finalizar comanda:", error);
        return { sucesso: false, erro: 'Falha ao processar o faturamento e ficha técnica.' };
    }
}