'use server'

import { prisma } from '@/lib/prisma';

export async function listarProdutos() {
    try {
        const produtos = await prisma.produto.findMany({
            where: { ativo: true },
            orderBy: { nome: 'asc' }
        });
        return { sucesso: true, produtos };
    } catch (error) {
        console.error('Erro ao listar produtos:', error);
        return { sucesso: false, produtos: [] };
    }
}

export async function criarProduto(dados: any) {
    try {
        const produto = await prisma.produto.create({
            data: {
                nome: dados.nome,
                descricao: dados.descricao,
                precoCusto: Number(dados.precoCusto),
                precoVenda: Number(dados.precoVenda),
                estoque: Number(dados.estoque),
            }
        });
        return { sucesso: true, produto };
    } catch (error) {
        return { sucesso: false, erro: 'Falha ao cadastrar o produto.' };
    }
}

// Permite adicionar ou remover (usando número negativo) itens do estoque rapidamente
export async function ajustarEstoque(id: string, quantidade: number) {
    try {
        const produto = await prisma.produto.update({
            where: { id },
            data: { estoque: { increment: quantidade } }
        });
        return { sucesso: true, produto };
    } catch (error) {
        return { sucesso: false, erro: 'Erro ao atualizar o estoque.' };
    }
}