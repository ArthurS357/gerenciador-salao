'use server'

import { prisma } from '@/lib/prisma'
import type { Produto } from '@/types/domain'

type ActionResult<T = object> =
    | ({ sucesso: true } & T)
    | { sucesso: false; erro: string }

type DadosCriarProduto = {
    nome: string
    descricao?: string
    precoCusto: number | string
    precoVenda: number | string
    estoque: number | string
}

export async function listarProdutos(): Promise<ActionResult<{ produtos: Produto[] }>> {
    try {
        const produtos = await prisma.produto.findMany({
            where: { ativo: true },
            orderBy: { nome: 'asc' },
        })
        return { sucesso: true, produtos: produtos as Produto[] }
    } catch (error) {
        console.error('Erro ao listar produtos:', error)
        return { sucesso: false, erro: 'Falha ao listar produtos.' }
    }
}

export async function criarProduto(
    dados: DadosCriarProduto
): Promise<ActionResult<{ produto: Produto }>> {
    try {
        const produto = await prisma.produto.create({
            data: {
                nome: dados.nome,
                descricao: dados.descricao ?? null,
                precoCusto: Number(dados.precoCusto),
                precoVenda: Number(dados.precoVenda),
                estoque: Number(dados.estoque),
            },
        })
        return { sucesso: true, produto: produto as Produto }
    } catch {
        return { sucesso: false, erro: 'Falha ao cadastrar o produto.' }
    }
}

export async function ajustarEstoque(
    id: string,
    quantidade: number
): Promise<ActionResult<{ produto: Produto }>> {
    try {
        const produto = await prisma.produto.update({
            where: { id },
            data: { estoque: { increment: quantidade } },
        })
        return { sucesso: true, produto: produto as Produto }
    } catch {
        return { sucesso: false, erro: 'Erro ao atualizar o estoque.' }
    }
}