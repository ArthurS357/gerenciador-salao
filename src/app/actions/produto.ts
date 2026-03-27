'use server'

import { prisma } from '@/lib/prisma'
import { revalidatePath } from 'next/cache'
import type { Produto } from '@/types/domain'

type ActionResult<T = object> =
    | ({ sucesso: true } & T)
    | { sucesso: false; erro: string }

type DadosCriarProduto = {
    nome: string
    descricao?: string
    precoCusto: number | string
    precoVenda: number | string
    // Novos campos para a Ficha Técnica
    unidadeMedida: string
    tamanhoUnidade: number | string
    estoqueInicialEmFrascos: number | string
}

type DadosEditarProduto = {
    nome?: string
    descricao?: string
    precoCusto?: number | string
    precoVenda?: number | string
    // A unidade de medida e o tamanho não devem ser alterados após criados 
    // para não quebrar a integridade do estoque passado.
}

// ── 1. LISTAGEM ───────────────────────────────────────────────────────────────

export async function listarProdutosAdmin(): Promise<ActionResult<{ produtos: Produto[] }>> {
    try {
        const produtos = await prisma.produto.findMany({
            where: { ativo: true },
            orderBy: { nome: 'asc' }
        })
        return { sucesso: true, produtos }
    } catch (error) {
        console.error('Erro ao listar produtos:', error)
        return { sucesso: false, erro: 'Falha ao carregar o estoque.' }
    }
}

// ── 2. CRIAÇÃO ────────────────────────────────────────────────────────────────

export async function criarProdutoAdmin(
    dados: DadosCriarProduto
): Promise<ActionResult<{ produto: Produto }>> {
    try {
        const precoCusto = Number(dados.precoCusto) || 0
        const precoVenda = Number(dados.precoVenda) || 0
        const tamanhoUnidade = Number(dados.tamanhoUnidade) || 1
        const estoqueInicialEmFrascos = Number(dados.estoqueInicialEmFrascos) || 0

        if (precoCusto < 0 || precoVenda < 0 || estoqueInicialEmFrascos < 0) {
            return { sucesso: false, erro: 'Valores numéricos não podem ser negativos.' }
        }
        if (precoVenda < precoCusto) {
            return { sucesso: false, erro: 'O preço de venda não pode ser inferior ao custo.' }
        }

        // Cálculo Mágico: Se recebi 3 frascos de 700ml, o banco guarda 2100 (ml)
        const estoqueAbsoluto = estoqueInicialEmFrascos * tamanhoUnidade;

        const produto = await prisma.produto.create({
            data: {
                nome: dados.nome.trim(),
                descricao: dados.descricao?.trim() ?? null,
                precoCusto,
                precoVenda,
                unidadeMedida: dados.unidadeMedida,
                tamanhoUnidade: tamanhoUnidade,
                estoque: estoqueAbsoluto,
            },
        })

        revalidatePath('/admin/estoque')
        return { sucesso: true, produto: produto as unknown as Produto }
    } catch (error) {
        console.error('Erro ao criar produto:', error)
        return { sucesso: false, erro: 'Falha ao cadastrar o produto.' }
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

        const produto = await prisma.produto.update({
            where: { id },
            data: dataUpdate,
        })
        return { sucesso: true, produto: produto as unknown as Produto }
    } catch {
        return { sucesso: false, erro: 'Falha ao editar o produto.' }
    }
}

// ── 4. AJUSTE DE ESTOQUE (Entrada de Frascos) ─────────────────────────────────

export async function adicionarEstoqueFrascos(
    id: string,
    quantidadeFrascos: number
): Promise<ActionResult> {
    try {
        if (quantidadeFrascos <= 0) {
            return { sucesso: false, erro: 'A quantidade de frascos deve ser maior que zero.' }
        }

        const produto = await prisma.produto.findUnique({
            where: { id },
            select: { tamanhoUnidade: true }
        })

        if (!produto) return { sucesso: false, erro: 'Produto não encontrado.' }

        // Multiplica a quantidade de novos frascos pelo tamanho do frasco cadastrado
        const quantidadeAdicionarAbsoluta = quantidadeFrascos * produto.tamanhoUnidade;

        await prisma.produto.update({
            where: { id },
            data: {
                estoque: { increment: quantidadeAdicionarAbsoluta }
            }
        })

        revalidatePath('/admin/estoque')
        return { sucesso: true }
    } catch (error) {
        console.error('Erro ao adicionar estoque:', error)
        return { sucesso: false, erro: 'Falha técnica ao dar entrada no estoque.' }
    }
}

// ── 5. SAÍDA DIRETA DE ESTOQUE (Baixa Manual ou por Ficha Técnica) ────────────

export async function baixarEstoqueAbsoluto(
    id: string,
    quantidadeAbsoluta: number
): Promise<ActionResult<{ produto: Produto }>> {
    try {
        const atual = await prisma.produto.findUnique({
            where: { id },
            select: { estoque: true },
        })

        if (!atual) return { sucesso: false, erro: 'Produto não encontrado.' }

        const novoEstoque = atual.estoque - quantidadeAbsoluta
        if (novoEstoque < 0) {
            return {
                sucesso: false,
                erro: `Estoque insuficiente. Estoque atual: ${atual.estoque}.`,
            }
        }

        const produto = await prisma.produto.update({
            where: { id },
            data: { estoque: { decrement: quantidadeAbsoluta } },
        })
        return { sucesso: true, produto: produto as unknown as Produto }
    } catch {
        return { sucesso: false, erro: 'Erro ao atualizar o estoque.' }
    }
}


// ── 6. INATIVAÇÃO (soft delete — preserva histórico financeiro) ───────────────

export async function excluirProdutoLogico(id: string): Promise<ActionResult<{ mensagem: string }>> {
    try {
        await prisma.produto.update({
            where: { id },
            data: { ativo: false },
        })
        revalidatePath('/admin/estoque')
        return {
            sucesso: true,
            mensagem: 'Produto removido do catálogo. O histórico financeiro foi preservado.',
        }
    } catch {
        return { sucesso: false, erro: 'Falha ao remover o produto do catálogo.' }
    }
}