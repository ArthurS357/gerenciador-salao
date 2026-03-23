'use server'

import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache'

// 1. Lista produtos para a vitrine da comanda (Revenda)
export async function listarProdutosDisponiveis() {
    return await prisma.produto.findMany({
        // Traz apenas produtos ativos e que tenham pelo menos 1 frasco inteiro em estoque
        // (comparamos o estoque com o tamanhoUnidade)
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
                estoque: { gte: baixaAbsoluta } // Garante que há frascos suficientes
            },
            data: { estoque: { decrement: baixaAbsoluta } }
        }).catch(() => null);

        if (!produtoAtualizado) {
            return { sucesso: false, erro: 'Estoque insuficiente para a quantidade solicitada.' };
        }

        // Passo 3: Adiciona à comanda e consolida o financeiro
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
        return { sucesso: false, erro: 'Falha técnica ao adicionar produto à comanda.' };
    }
}

// 3. Fatura a comanda e processa os custos da Ficha Técnica
export async function finalizarComanda(agendamentoId: string) {
    try {
        // Busca a comanda e todos os serviços realizados, incluindo a ficha técnica (insumos)
        const agendamento = await prisma.agendamento.findUnique({
            where: { id: agendamentoId },
            include: {
                funcionario: true,
                servicos: {
                    include: {
                        servico: {
                            include: { insumos: true }
                        }
                    }
                }
            }
        });

        if (!agendamento) {
            return { sucesso: false, erro: 'Comanda não encontrada.' };
        }

        if (agendamento.concluido) {
            return { sucesso: false, erro: 'Esta comanda já foi faturada.' };
        }

        // Passo 1: Calcular os insumos gastos (Ficha Técnica)
        // Agrupamos caso o mesmo produto seja usado em dois serviços diferentes na mesma comanda
        const consumoTotalInsumos = new Map<string, number>();

        for (const itemServico of agendamento.servicos) {
            for (const insumo of itemServico.servico.insumos) {
                const atual = consumoTotalInsumos.get(insumo.produtoId) || 0;
                consumoTotalInsumos.set(insumo.produtoId, atual + insumo.quantidadeUsada);
            }
        }

        // Passo 2: Preparar todas as transações de banco de dados
        const transacoes = [];

        // 2.1 Adiciona a baixa de estoque de cada insumo consumido
        // Nota: Permitimos que o estoque fique negativo aqui para não travar o faturamento
        // caso alguém tenha esquecido de dar entrada num frasco físico que já está no salão.
        for (const [produtoId, quantidadeTotalGasta] of consumoTotalInsumos.entries()) {
            transacoes.push(
                prisma.produto.update({
                    where: { id: produtoId },
                    data: { estoque: { decrement: quantidadeTotalGasta } }
                })
            );
        }

        // 2.2 Lógica Matemática de Fecho (Cartão)
        const taxaAdquirentePercentual = 3;
        const valorTaxaCartao = agendamento.valorBruto * (taxaAdquirentePercentual / 100);

        // 2.3 Fatura a comanda
        transacoes.push(
            prisma.agendamento.update({
                where: { id: agendamentoId },
                data: {
                    concluido: true,
                    taxas: valorTaxaCartao
                }
            })
        );

        // Executa todas as atualizações de forma atômica (ou tudo funciona, ou nada funciona)
        await prisma.$transaction(transacoes);

        revalidatePath('/profissional/agenda');
        revalidatePath(`/profissional/comanda/${agendamentoId}`);
        revalidatePath('/admin/estoque'); // Atualiza a tela de estoque do admin

        return { sucesso: true };
    } catch (error) {
        console.error("Erro ao finalizar comanda:", error);
        return { sucesso: false, erro: 'Falha ao processar o faturamento e ficha técnica.' };
    }
}