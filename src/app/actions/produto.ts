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
    estoqueMinimo?: number | string
}

type DadosEditarProduto = {
    nome?: string
    descricao?: string
    precoCusto?: number | string
    precoVenda?: number | string
    estoqueMinimo?: number | string
}

// ── 1. LISTAGEM ───────────────────────────────────────────────────────────────

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

// ── 2. CRIAÇÃO ────────────────────────────────────────────────────────────────

export async function criarProduto(
    dados: DadosCriarProduto
): Promise<ActionResult<{ produto: Produto }>> {
    try {
        const precoCusto = Number(dados.precoCusto)
        const precoVenda = Number(dados.precoVenda)
        const estoque = Number(dados.estoque)
        const estoqueMinimo = dados.estoqueMinimo != null ? Number(dados.estoqueMinimo) : 5

        if (precoCusto < 0 || precoVenda < 0 || estoque < 0) {
            return { sucesso: false, erro: 'Valores numéricos não podem ser negativos.' }
        }
        if (precoVenda < precoCusto) {
            return { sucesso: false, erro: 'O preço de venda não pode ser inferior ao custo.' }
        }

        const produto = await prisma.produto.create({
            data: {
                nome: dados.nome.trim(),
                descricao: dados.descricao?.trim() ?? null,
                precoCusto,
                precoVenda,
                estoque,
                estoqueMinimo,
            },
        })
        return { sucesso: true, produto: produto as Produto }
    } catch {
        return { sucesso: false, erro: 'Falha ao cadastrar o produto. Verifique se o nome já está em uso.' }
    }
}

// ── 3. EDIÇÃO ─────────────────────────────────────────────────────────────────

export async function editarProduto(
    id: string,
    dados: DadosEditarProduto
): Promise<ActionResult<{ produto: Produto }>> {
    try {
        const dataUpdate: Record<string, unknown> = {}

        if (dados.nome !== undefined) dataUpdate.nome = dados.nome.trim()
        if (dados.descricao !== undefined) dataUpdate.descricao = dados.descricao.trim() || null
        if (dados.precoCusto !== undefined) dataUpdate.precoCusto = Number(dados.precoCusto)
        if (dados.precoVenda !== undefined) dataUpdate.precoVenda = Number(dados.precoVenda)
        if (dados.estoqueMinimo !== undefined) dataUpdate.estoqueMinimo = Number(dados.estoqueMinimo)

        const produto = await prisma.produto.update({
            where: { id },
            data: dataUpdate,
        })
        return { sucesso: true, produto: produto as Produto }
    } catch {
        return { sucesso: false, erro: 'Falha ao editar o produto.' }
    }
}

// ── 4. AJUSTE DE ESTOQUE (entrada/saída manual) ───────────────────────────────
// Recebe quantidade POSITIVA para entrada, NEGATIVA para saída.

export async function ajustarEstoque(
    id: string,
    quantidade: number
): Promise<ActionResult<{ produto: Produto }>> {
    try {
        // Leitura prévia para garantir que não vai a negativo
        const atual = await prisma.produto.findUnique({
            where: { id },
            select: { estoque: true },
        })

        if (!atual) return { sucesso: false, erro: 'Produto não encontrado.' }

        const novoEstoque = atual.estoque + quantidade
        if (novoEstoque < 0) {
            return {
                sucesso: false,
                erro: `Estoque insuficiente. Estoque atual: ${atual.estoque} unidade(s).`,
            }
        }

        const produto = await prisma.produto.update({
            where: { id },
            data: { estoque: { increment: quantidade } },
        })
        return { sucesso: true, produto: produto as Produto }
    } catch {
        return { sucesso: false, erro: 'Erro ao atualizar o estoque.' }
    }
}

// ── 5. ENTRADA EM LOTE (recebimento de mercadoria) ────────────────────────────

export async function registrarEntradaEstoque(
    id: string,
    quantidade: number
): Promise<ActionResult<{ produto: Produto }>> {
    if (quantidade <= 0) {
        return { sucesso: false, erro: 'A quantidade de entrada deve ser maior que zero.' }
    }
    return ajustarEstoque(id, quantidade)
}

// ── 6. INATIVAÇÃO (soft delete — preserva histórico financeiro) ───────────────

export async function inativarProduto(id: string): Promise<ActionResult<{ mensagem: string }>> {
    try {
        await prisma.produto.update({
            where: { id },
            data: { ativo: false },
        })
        return {
            sucesso: true,
            mensagem: 'Produto removido do catálogo. O histórico financeiro foi preservado.',
        }
    } catch {
        return { sucesso: false, erro: 'Falha ao remover o produto do catálogo.' }
    }
}