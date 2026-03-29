'use server'

import { prisma } from '@/lib/prisma'
import { revalidatePath } from 'next/cache'
import { verificarSessaoFuncionario } from '@/app/actions/auth'

import { ActionResult } from '@/types/domain'

// Definição da interface explícita para evitar importação dependente de "as unknown"
export type ItemPortfolioDb = {
    id: string
    titulo: string
    valor: number | null
    imagemUrl: string
    linkSocial: string | null
    ativo: boolean
    criadoEm: Date
}

type DadosItemPortfolio = {
    titulo: string
    valor?: number | string | null
    imagemUrl: string
    linkSocial?: string | null
}

// ── BLINDAGEM DE SEGURANÇA ───────────────────────────────────────────────────
async function garantirPermissaoAdmin() {
    const sessao = await verificarSessaoFuncionario()
    if (!sessao.logado || sessao.role !== 'ADMIN') {
        throw new Error('Acesso negado. Apenas a gerência pode alterar o portfólio da vitrine.')
    }
}

// ── 1. LISTAGEM (Pública) ─────────────────────────────────────────────────────

export async function listarPortfolioPublico(): Promise<ActionResult<{ itens: ItemPortfolioDb[] }>> {
    try {
        const itens = await prisma.itemPortfolio.findMany({
            where: { ativo: true },
            orderBy: { criadoEm: 'desc' },
            take: 6,
            select: {
                id: true,
                titulo: true,
                valor: true,
                imagemUrl: true,
                linkSocial: true,
                ativo: true,
                criadoEm: true
            }
        })
        return { sucesso: true, itens }
    } catch {
        return { sucesso: false, erro: 'Falha ao carregar portfólio.' }
    }
}

// ── 2. CRIAÇÃO (Protegida) ────────────────────────────────────────────────────

export async function adicionarItemPortfolio(
    dados: DadosItemPortfolio
): Promise<ActionResult<{ item: ItemPortfolioDb }>> {
    try {
        await garantirPermissaoAdmin()

        if (!dados.titulo?.trim() || !dados.imagemUrl?.trim()) {
            return { sucesso: false, erro: 'Título e imagem são obrigatórios.' }
        }

        const item = await prisma.itemPortfolio.create({
            data: {
                titulo: dados.titulo.trim(),
                valor: dados.valor != null && dados.valor !== '' && !isNaN(Number(dados.valor)) ? Number(dados.valor) : null,
                imagemUrl: dados.imagemUrl.trim(),
                linkSocial: dados.linkSocial?.trim() || null,
            },
            select: {
                id: true,
                titulo: true,
                valor: true,
                imagemUrl: true,
                linkSocial: true,
                ativo: true,
                criadoEm: true
            }
        })

        // Revalida a landing page pública para mostrar a nova imagem imediatamente
        revalidatePath('/')
        // Se houver uma página de gestão administrativa, revalida-a também
        revalidatePath('/admin/portfolio')

        return { sucesso: true, item }
    } catch (error) {
        if (error instanceof Error && error.message.includes('Acesso negado')) return { sucesso: false, erro: error.message }
        return { sucesso: false, erro: 'Falha ao salvar no portfólio.' }
    }
}