'use server'

import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache'


export async function listarProdutosDisponiveis() {
    return await prisma.produto.findMany({
        where: { ativo: true, estoque: { gt: 0 } }, // Apenas com estoque positivo
        orderBy: { nome: 'asc' }
    });
}

export async function adicionarProdutoNaComanda(agendamentoId: string, produtoId: string, quantidade: number) {
    try {
        // Passo 1 e 2: Atualização atômica para evitar race conditions
        // Só atualiza se o estoque atual for >= à quantidade que está sendo comprada
        const produto = await prisma.produto.update({
            where: {
                id: produtoId,
                estoque: { gte: quantidade } // Garante atomicidade
            },
            data: { estoque: { decrement: quantidade } }
        }).catch(() => null);

        if (!produto) {
            return { sucesso: false, erro: 'Estoque insuficiente para esta baixa ou produto não encontrado.' };
        }

        // Passo 3: Adiciona à comanda e consolida o financeiro
        await prisma.$transaction([
            prisma.itemProduto.create({
                data: {
                    agendamentoId,
                    produtoId,
                    quantidade,
                    precoCobrado: produto.precoVenda
                }
            }),
            prisma.agendamento.update({
                where: { id: agendamentoId },
                data: { valorBruto: { increment: produto.precoVenda * quantidade } }
            })
        ]);

        return { sucesso: true };
    } catch (error) {
        return { sucesso: false, erro: 'Falha técnica ao adicionar produto à comanda.' };
    }
}

export async function finalizarComanda(agendamentoId: string) {
    try {
        const agendamento = await prisma.agendamento.findUnique({
            where: { id: agendamentoId },
            include: { funcionario: true }
        })

        if (!agendamento) {
            return { sucesso: false, erro: 'Comanda não encontrada.' }
        }

        if (agendamento.concluido) {
            return { sucesso: false, erro: 'Esta comanda já foi faturada.' }
        }

        // Lógica Matemática de Fecho: Aplicamos uma taxa fixa de cartão de crédito de 3% sobre o Bruto
        const taxaAdquirentePercentual = 3
        const valorTaxaCartao = agendamento.valorBruto * (taxaAdquirentePercentual / 100)

        // Fatura a comanda e guarda o valor da taxa para abater no lucro líquido do painel
        await prisma.agendamento.update({
            where: { id: agendamentoId },
            data: {
                concluido: true,
                taxas: valorTaxaCartao
            }
        })

        revalidatePath('/profissional/agenda')
        revalidatePath(`/profissional/comanda/${agendamentoId}`)

        return { sucesso: true }
    } catch (error) {
        console.error("Erro ao finalizar comanda:", error)
        return { sucesso: false, erro: 'Falha ao processar o faturamento.' }
    }
}