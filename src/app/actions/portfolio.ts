'use server'

import { prisma } from '@/lib/prisma'
import { revalidatePath } from 'next/cache'
import { verificarSessaoFuncionario } from '@/app/actions/auth'
import { ActionResult } from '@/types/domain'
import { z } from 'zod'
import { cache } from 'react'

// ── Tipos de Retorno ──────────────────────────────────────────────────────────

/** Reflecte o modelo actual do DB após a migração multi-imagem */
export type ItemPortfolioDb = {
    id: string
    titulo: string
    descricao: string | null
    valor: number | null
    imagensJson: string           // JSON array: '["url1","url2"]'
    linkInstagram: string | null
    ativo: boolean
    criadoEm: Date
}

// ── Schemas de Validação (Runtime Safety) ────────────────────────────────────

const SchemaPortfolio = z.object({
    titulo: z.string().trim().min(3, 'O título deve ter pelo menos 3 caracteres.'),
    descricao: z.string().trim().optional().nullable(),
    valor: z.coerce.number().min(0, 'O valor não pode ser negativo.').optional().nullable(),
    imagensJson: z.string()
        .min(2, 'É obrigatório fornecer pelo menos 1 imagem.')
        .refine((val) => {
            try {
                const arr = JSON.parse(val) as unknown
                return Array.isArray(arr) && arr.length > 0
            } catch {
                return false
            }
        }, 'O campo imagensJson deve ser um array JSON válido com pelo menos 1 URL.'),
    linkInstagram: z.string().trim().url('Link do Instagram inválido.').optional().nullable().or(z.literal('')),
})

export type DadosItemPortfolio = z.infer<typeof SchemaPortfolio>

// ── Auxiliar de Segurança ─────────────────────────────────────────────────────

async function checarPermissaoAdmin(): Promise<string | null> {
    const sessao = await verificarSessaoFuncionario()
    if (!sessao.logado || sessao.role !== 'ADMIN') {
        return 'Acesso negado. Apenas a gerência pode gerir o portfólio.'
    }
    return null
}

// ── 1. LISTAGEM PÚBLICA (Landing Page) ───────────────────────────────────────

// Cache React: evita N+1 queries ao renderizar a Landing Page em alto tráfego
export const listarPortfolioPublico = cache(async (): Promise<ActionResult<{ itens: ItemPortfolioDb[] }>> => {
    try {
        const itens = await prisma.itemPortfolio.findMany({
            where: { ativo: true },
            orderBy: { criadoEm: 'desc' },
            take: 6,
            select: {
                id: true,
                titulo: true,
                descricao: true,
                valor: true,
                imagensJson: true,
                linkInstagram: true,
                ativo: true,
                criadoEm: true,
            },
        })

        return { sucesso: true, data: { itens } }
    } catch (error) {
        console.error('[Portfolio] Erro ao listar o portfólio público:', error)
        return { sucesso: false, erro: 'Falha ao carregar portfólio.' }
    }
})

// ── 2. LISTAGEM ADMIN (Painel de Gestão) ─────────────────────────────────────

// Sem cache: sempre dados frescos para o admin
export async function listarPortfolioAdmin(): Promise<ActionResult<{ itens: ItemPortfolioDb[] }>> {
    const erroAuth = await checarPermissaoAdmin()
    if (erroAuth) return { sucesso: false, erro: erroAuth }

    try {
        const itens = await prisma.itemPortfolio.findMany({
            orderBy: { criadoEm: 'desc' },
            select: {
                id: true,
                titulo: true,
                descricao: true,
                valor: true,
                imagensJson: true,
                linkInstagram: true,
                ativo: true,
                criadoEm: true,
            },
        })

        return { sucesso: true, data: { itens } }
    } catch (error) {
        console.error('[Portfolio] Erro ao listar portfólio para admin:', error)
        return { sucesso: false, erro: 'Falha ao carregar a galeria.' }
    }
}

// ── 3. CRIAÇÃO (Protegida — ADMIN only) ──────────────────────────────────────

export async function criarItemPortfolio(
    dadosRaw: unknown
): Promise<ActionResult<{ item: ItemPortfolioDb }>> {
    const erroAuth = await checarPermissaoAdmin()
    if (erroAuth) return { sucesso: false, erro: erroAuth }

    const validacao = SchemaPortfolio.safeParse(dadosRaw)
    if (!validacao.success) {
        return { sucesso: false, erro: validacao.error.issues[0]?.message ?? 'Dados inválidos.' }
    }

    const dados = validacao.data

    try {
        const item = await prisma.itemPortfolio.create({
            data: {
                titulo: dados.titulo,
                descricao: dados.descricao ?? null,
                valor: dados.valor ?? null,
                imagensJson: dados.imagensJson,
                linkInstagram: dados.linkInstagram || null,
            },
            select: {
                id: true,
                titulo: true,
                descricao: true,
                valor: true,
                imagensJson: true,
                linkInstagram: true,
                ativo: true,
                criadoEm: true,
            },
        })

        revalidatePath('/admin/galeria')
        revalidatePath('/') // Atualiza a vitrine pública imediatamente

        return { sucesso: true, data: { item } }
    } catch (error) {
        console.error('[Portfolio] Erro ao criar item de portfólio:', error)
        return { sucesso: false, erro: 'Falha ao guardar o item na galeria.' }
    }
}

// ── 4. EXCLUSÃO (Protegida — ADMIN only) ─────────────────────────────────────

export async function excluirItemPortfolio(id: string): Promise<ActionResult> {
    const erroAuth = await checarPermissaoAdmin()
    if (erroAuth) return { sucesso: false, erro: erroAuth }

    if (!id) return { sucesso: false, erro: 'ID inválido.' }

    try {
        await prisma.itemPortfolio.delete({ where: { id } })

        revalidatePath('/admin/galeria')
        revalidatePath('/')

        return { sucesso: true }
    } catch (error) {
        console.error('[Portfolio] Erro ao excluir item de portfólio:', error)
        return { sucesso: false, erro: 'Falha ao excluir o item da galeria.' }
    }
}

// ── 5. ALTERNAR VISIBILIDADE (Ativar / Desativar) ─────────────────────────────

export async function alternarVisibilidadeItem(id: string, ativo: boolean): Promise<ActionResult> {
    const erroAuth = await checarPermissaoAdmin()
    if (erroAuth) return { sucesso: false, erro: erroAuth }

    try {
        await prisma.itemPortfolio.update({
            where: { id },
            data: { ativo },
        })

        revalidatePath('/admin/galeria')
        revalidatePath('/')

        return { sucesso: true }
    } catch (error) {
        console.error('[Portfolio] Erro ao alterar visibilidade:', error)
        return { sucesso: false, erro: 'Falha ao atualizar visibilidade.' }
    }
}