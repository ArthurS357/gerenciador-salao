'use server'

import { prisma } from '@/lib/prisma'
import { revalidatePath } from 'next/cache'
import { verificarSessaoFuncionario } from '@/app/actions/auth'
import { z } from 'zod'
import { ActionResult } from '@/types/domain'
import { schemaProduto } from '@/lib/schemas'

// ── Tipagens ──────────────────────────────────────────────────────────────────
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

// ── Schemas Locais de Validação (Runtime Safety) ──────────────────────────────
const SchemaEdicaoProduto = z.object({
    nome: z.string().min(2, 'Nome muito curto.').optional(),
    descricao: z.string().optional().nullable(),
    precoCusto: z.coerce.number().min(0, 'Custo não pode ser negativo.').optional(),
    precoVenda: z.coerce.number().min(0, 'Preço de venda não pode ser negativo.').optional(),
})

export type DadosEditarProduto = z.infer<typeof SchemaEdicaoProduto>

// ── AUXILIARES DE SEGURANÇA ───────────────────────────────────────────────────
/**
 * Retorna null se autorizado, ou uma string de erro caso contrário.
 * Subsitui a lógica falha de throw Error com validação de string.
 */
async function checarPermissaoAdmin(): Promise<string | null> {
    const sessao = await verificarSessaoFuncionario()
    if (!sessao.logado || sessao.role !== 'ADMIN') {
        return 'Acesso negado. Apenas a gerência pode gerir o catálogo de inventário.'
    }
    return null
}

// ── 1. LISTAGEM ───────────────────────────────────────────────────────────────

export async function listarProdutosAdmin(): Promise<ActionResult<{ produtos: ProdutoItem[] }>> {
    const erroAuth = await checarPermissaoAdmin()
    if (erroAuth) return { sucesso: false, erro: erroAuth }

    try {
        const produtos = await prisma.produto.findMany({
            where: { ativo: true },
            orderBy: { nome: 'asc' },
            select: {
                id: true, nome: true, descricao: true, precoCusto: true, precoVenda: true,
                estoque: true, unidadeMedida: true, tamanhoUnidade: true, ativo: true,
                createdAt: true, updatedAt: true
            }
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
): Promise<ActionResult<{ produto: ProdutoItem }>> {
    const erroAuth = await checarPermissaoAdmin()
    if (erroAuth) return { sucesso: false, erro: erroAuth }

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

    try {
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
        console.error('Erro ao criar produto:', error)
        return { sucesso: false, erro: 'Falha ao cadastrar o produto.' }
    }
}

// ── 3. EDIÇÃO ─────────────────────────────────────────────────────────────────

export async function editarProduto(
    id: string,
    dadosRaw: DadosEditarProduto
): Promise<ActionResult<{ produto: ProdutoItem }>> {
    const erroAuth = await checarPermissaoAdmin()
    if (erroAuth) return { sucesso: false, erro: erroAuth }

    // Validação estrita em runtime para proteger o banco de dados
    const validacao = SchemaEdicaoProduto.safeParse(dadosRaw)
    if (!validacao.success) {
        return { sucesso: false, erro: validacao.error.issues[0]?.message ?? 'Dados inválidos.' }
    }

    try {
        const produto = await prisma.produto.update({
            where: { id },
            data: validacao.data, // Dados já limpos e coerzidos pelo Zod
            select: {
                id: true, nome: true, descricao: true, precoCusto: true, precoVenda: true,
                estoque: true, unidadeMedida: true, tamanhoUnidade: true, ativo: true,
                createdAt: true, updatedAt: true
            }
        })

        revalidatePath('/admin/estoque')
        return { sucesso: true, produto }
    } catch (error) {
        console.error('Erro ao editar produto:', error)
        return { sucesso: false, erro: 'Falha ao editar o produto.' }
    }
}

// ── 4. AJUSTE DE ESTOQUE (Entrada de Frascos) ─────────────────────────────────

export async function adicionarEstoqueFrascos(
    id: string,
    quantidadeFrascos: number
): Promise<ActionResult> {
    const erroAuth = await checarPermissaoAdmin()
    if (erroAuth) return { sucesso: false, erro: erroAuth }

    if (quantidadeFrascos <= 0 || isNaN(quantidadeFrascos)) {
        return { sucesso: false, erro: 'A quantidade de frascos deve ser um número maior que zero.' }
    }

    try {
        await prisma.$transaction(async (tx) => {
            const produto = await tx.produto.findUnique({
                where: { id },
                select: { tamanhoUnidade: true }
            })

            if (!produto) throw new Error('Produto não encontrado.')

            const quantidadeAdicionarAbsoluta = quantidadeFrascos * produto.tamanhoUnidade;

            await tx.produto.update({
                where: { id },
                data: { estoque: { increment: quantidadeAdicionarAbsoluta } }
            })
        })

        revalidatePath('/admin/estoque')
        return { sucesso: true }
    } catch (error) {
        console.error('Erro ao adicionar estoque:', error)
        return {
            sucesso: false,
            erro: error instanceof Error && error.message === 'Produto não encontrado.'
                ? error.message
                : 'Falha técnica ao dar entrada no estoque.'
        }
    }
}

// ── 5. SAÍDA DIRETA DE ESTOQUE (Baixa Manual) ─────────────────────────────────

export async function baixarEstoqueAbsoluto(
    id: string,
    quantidadeAbsoluta: number
): Promise<ActionResult<{ produto: ProdutoItem }>> {
    const erroAuth = await checarPermissaoAdmin()
    if (erroAuth) return { sucesso: false, erro: erroAuth }

    if (quantidadeAbsoluta <= 0 || isNaN(quantidadeAbsoluta)) {
        return { sucesso: false, erro: 'A quantidade a baixar deve ser maior que zero.' }
    }

    try {
        // Correção Crítica: O Prisma não permite cláusulas `where` complexas no método `update`.
        // A atomicidade condicional deve ser feita com `updateMany`.
        const atualizacao = await prisma.produto.updateMany({
            where: {
                id,
                estoque: { gte: quantidadeAbsoluta } // Trava de concorrência
            },
            data: { estoque: { decrement: quantidadeAbsoluta } }
        })

        if (atualizacao.count === 0) {
            return { sucesso: false, erro: 'O produto não possui estoque suficiente para esta baixa ou não foi encontrado.' }
        }

        // Como updateMany não retorna o objeto, fazemos a leitura final separada
        const produto = await prisma.produto.findUniqueOrThrow({
            where: { id },
            select: {
                id: true, nome: true, descricao: true, precoCusto: true, precoVenda: true,
                estoque: true, unidadeMedida: true, tamanhoUnidade: true, ativo: true,
                createdAt: true, updatedAt: true
            }
        })

        revalidatePath('/admin/estoque')
        return { sucesso: true, produto }
    } catch (error) {
        console.error('Erro ao atualizar o estoque:', error)
        return { sucesso: false, erro: 'Erro ao atualizar o estoque.' }
    }
}

// ── 6. INATIVAÇÃO (soft delete) ───────────────────────────────────────────────

export async function excluirProdutoLogico(id: string): Promise<ActionResult<{ mensagem: string }>> {
    const erroAuth = await checarPermissaoAdmin()
    if (erroAuth) return { sucesso: false, erro: erroAuth }

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
    } catch (error) {
        console.error('Erro na exclusão lógica do produto:', error)
        return { sucesso: false, erro: 'Falha ao remover o produto do catálogo.' }
    }
}