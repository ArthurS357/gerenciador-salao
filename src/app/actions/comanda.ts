'use server'

import { prisma } from '@/lib/prisma';

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
        await prisma.agendamento.update({
            where: { id: agendamentoId },
            data: { concluido: true }
        });
        return { sucesso: true };
    } catch (error) {
        return { sucesso: false, erro: 'Falha ao fechar a comanda e enviar para o caixa.' };
    }
}