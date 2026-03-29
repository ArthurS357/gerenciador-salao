'use server'

import { prisma } from '@/lib/prisma'
import { revalidatePath } from 'next/cache'
import { verificarSessaoFuncionario } from '@/app/actions/auth'

import { ActionResult } from '@/types/domain'
import { schemaProduto } from '@/lib/schemas'

// Definição da interface que substitui a necessidade do cast externo "as unknown as Produto"
export type ProdutoItem = {
    id: string
    nome: string
    descricao: string | null
    precoCusto: number | null
    precoVenda: number
    estoque: number
    unidadeMedida: string
    tamanhoUnidade: number
    ativo: boolean
    createdAt: Date
    updatedAt: Date
}

type DadosCriarProduto = {
    nome: string
    descricao?: string
    precoCusto: number | string
    precoVenda: number | string
    unidadeMedida: string
    tamanhoUnidade: number | string
    estoqueInicialEmFrascos: number | string
}

type DadosEditarProduto = {
    nome?: string
    descricao?: string
    precoCusto?: number | string
    precoVenda?: number | string
}

// ── BLINDAGEM DE SEGURANÇA ───────────────────────────────────────────────────
async function garantirPermissaoAdmin() {
    const sessao = await verificarSessaoFuncionario()
    if (!sessao.logado || sessao.role !== 'ADMIN') {
        throw new Error('Acesso negado. Apenas a gerência pode gerir o catálogo de inventário.')
    }
}

// ── 1. LISTAGEM ───────────────────────────────────────────────────────────────

export async function listarProdutosAdmin(): Promise<ActionResult<{ produtos: ProdutoItem[] }>> {
    try {
        await garantirPermissaoAdmin()

        const produtos = await prisma.produto.findMany({
            where: { ativo: true },
            orderBy: { nome: 'asc' },
            // Mapeamento explícito elimina os erros do TypeScript
            select: {
                id: true, nome: true, descricao: true, precoCusto: true, precoVenda: true,
                estoque: true, unidadeMedida: true, tamanhoUnidade: true, ativo: true,
                createdAt: true, updatedAt: true
            }
        })
        return { sucesso: true, produtos }
    } catch (error) {
        if (error instanceof Error && error.message.includes('Acesso negado')) return { sucesso: false, erro: error.message }
        console.error('Erro ao listar produtos:', error)
        return { sucesso: false, erro: 'Falha ao carregar o estoque.' }
    }
}

// ── 2. CRIAÇÃO ────────────────────────────────────────────────────────────────

export async function criarProdutoAdmin(
    dados: DadosCriarProduto
): Promise<ActionResult<{ produto: ProdutoItem }>> {
    try {
        await garantirPermissaoAdmin()

        const validacao = schemaProduto.safeParse({
            ...dados,
            precoCusto: Number(dados.precoCusto),
            precoVenda: Number(dados.precoVenda),
            tamanhoUnidade: Number(dados.tamanhoUnidade),
            estoque: Number(dados.estoqueInicialEmFrascos) * (Number(dados.tamanhoUnidade) || 1)
        })

        if (!validacao.success) {
            return { sucesso: false, erro: validacao.error.issues[0]?.message ?? 'Dados do produto inválidos.' }
        }

        const { precoCusto, precoVenda, tamanhoUnidade, estoque } = validacao.data

        if (precoVenda < (precoCusto || 0)) {
            return { sucesso: false, erro: 'O preço de venda não pode ser inferior ao custo.' }
        }

        const produto = await prisma.produto.create({
            data: {
                nome: validacao.data.nome.trim(),
                descricao: validacao.data.descricao?.trim() ?? null,
                precoCusto,
                precoVenda,
                unidadeMedida: validacao.data.unidadeMedida,
                tamanhoUnidade,
                estoque,
            },
            select: {
                id: true, nome: true, descricao: true, precoCusto: true, precoVenda: true,
                estoque: true, unidadeMedida: true, tamanhoUnidade: true, ativo: true,
                createdAt: true, updatedAt: true
            }
        })

        revalidatePath('/admin/estoque')
        return { sucesso: true, produto }
    } catch (error) {
        if (error instanceof Error && error.message.includes('Acesso negado')) return { sucesso: false, erro: error.message }
        console.error('Erro ao criar produto:', error)
        return { sucesso: false, erro: 'Falha ao cadastrar o produto.' }
    }
}

// ── 3. EDIÇÃO ─────────────────────────────────────────────────────────────────

export async function editarProduto(
    id: string,
    dados: DadosEditarProduto
): Promise<ActionResult<{ produto: ProdutoItem }>> {
    try {
        await garantirPermissaoAdmin()

        const dataUpdate: Record<string, unknown> = {}

        if (dados.nome !== undefined) dataUpdate.nome = dados.nome.trim()
        if (dados.descricao !== undefined) dataUpdate.descricao = dados.descricao.trim() || null
        if (dados.precoCusto !== undefined) dataUpdate.precoCusto = Number(dados.precoCusto)
        if (dados.precoVenda !== undefined) dataUpdate.precoVenda = Number(dados.precoVenda)

        const produto = await prisma.produto.update({
            where: { id },
            data: dataUpdate,
            select: {
                id: true, nome: true, descricao: true, precoCusto: true, precoVenda: true,
                estoque: true, unidadeMedida: true, tamanhoUnidade: true, ativo: true,
                createdAt: true, updatedAt: true
            }
        })

        revalidatePath('/admin/estoque')
        return { sucesso: true, produto }
    } catch (error) {
        if (error instanceof Error && error.message.includes('Acesso negado')) return { sucesso: false, erro: error.message }
        return { sucesso: false, erro: 'Falha ao editar o produto.' }
    }
}

// ── 4. AJUSTE DE ESTOQUE (Entrada de Frascos) ─────────────────────────────────

export async function adicionarEstoqueFrascos(
    id: string,
    quantidadeFrascos: number
): Promise<ActionResult> {
    try {
        await garantirPermissaoAdmin()

        if (quantidadeFrascos <= 0) {
            return { sucesso: false, erro: 'A quantidade de frascos deve ser maior que zero.' }
        }

        const produto = await prisma.produto.findUnique({
            where: { id },
            select: { tamanhoUnidade: true }
        })

        if (!produto) return { sucesso: false, erro: 'Produto não encontrado.' }

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
        if (error instanceof Error && error.message.includes('Acesso negado')) return { sucesso: false, erro: error.message }
        console.error('Erro ao adicionar estoque:', error)
        return { sucesso: false, erro: 'Falha técnica ao dar entrada no estoque.' }
    }
}

// ── 5. SAÍDA DIRETA DE ESTOQUE (Baixa Manual) ─────────────────────────────────

export async function baixarEstoqueAbsoluto(
    id: string,
    quantidadeAbsoluta: number
): Promise<ActionResult<{ produto: ProdutoItem }>> {
    try {
        await garantirPermissaoAdmin()

        if (quantidadeAbsoluta <= 0) {
            return { sucesso: false, erro: 'A quantidade a baixar deve ser maior que zero.' }
        }

        // Delega o decremento seguro (Race-Condition proof) ao banco de dados com limite de >=
        const produto = await prisma.produto.update({
            where: {
                id,
                estoque: { gte: quantidadeAbsoluta } // Bloqueia atomicamente se não houver stock
            },
            data: { estoque: { decrement: quantidadeAbsoluta } },
            select: {
                id: true, nome: true, descricao: true, precoCusto: true, precoVenda: true,
                estoque: true, unidadeMedida: true, tamanhoUnidade: true, ativo: true,
                createdAt: true, updatedAt: true
            }
        }).catch(() => null)

        if (!produto) {
            return { sucesso: false, erro: 'O produto não possui estoque suficiente para esta baixa.' }
        }

        revalidatePath('/admin/estoque')
        return { sucesso: true, produto }
    } catch (error) {
        if (error instanceof Error && error.message.includes('Acesso negado')) return { sucesso: false, erro: error.message }
        return { sucesso: false, erro: 'Erro ao atualizar o estoque.' }
    }
}

// ── 6. INATIVAÇÃO (soft delete) ───────────────────────────────────────────────

export async function excluirProdutoLogico(id: string): Promise<ActionResult<{ mensagem: string }>> {
    try {
        await garantirPermissaoAdmin()

        await prisma.produto.update({
            where: { id },
            data: { ativo: false },
        })

        revalidatePath('/admin/estoque')
        return {
            sucesso: true,
            mensagem: 'Produto removido do catálogo. O histórico financeiro foi preservado.',
        }
    } catch (error) {
        if (error instanceof Error && error.message.includes('Acesso negado')) return { sucesso: false, erro: error.message }
        return { sucesso: false, erro: 'Falha ao remover o produto do catálogo.' }
    }
}