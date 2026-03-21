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
        const produto = await prisma.produto.findUnique({ where: { id: produtoId } });

        if (!produto || produto.estoque < quantidade) {
            return { sucesso: false, erro: 'Estoque insuficiente para esta baixa.' };
        }

        // Transação de banco de dados para garantir que não existam falhas financeiras
        await prisma.$transaction([
            // 1. Dá baixa no estoque
            prisma.produto.update({
                where: { id: produtoId },
                data: { estoque: { decrement: quantidade } }
            }),
            // 2. Registra o produto na comanda do cliente cobrando o preço de venda atual
            prisma.itemProduto.create({
                data: {
                    agendamentoId,
                    produtoId,
                    quantidade,
                    precoCobrado: produto.precoVenda
                }
            }),
            // 3. Incrementa o valor bruto total do agendamento
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