'use server'

import { prisma } from '@/lib/prisma'
import { revalidatePath } from 'next/cache'
import { verificarSessaoFuncionario } from '@/app/actions/auth'
import { ActionResult } from '@/types/domain'
import { z } from 'zod'
import { cache } from 'react'

// Definição da interface explícita para tipagem do retorno
export type ItemPortfolioDb = {
    id: string
    titulo: string
    valor: number | null
    imagemUrl: string
    linkSocial: string | null
    ativo: boolean
    criadoEm: Date
}

// ── Schemas de Validação (Runtime Safety) ─────────────────────────────────────
const SchemaPortfolio = z.object({
    titulo: z.string().trim().min(2, 'O título deve ter pelo menos 2 caracteres.'),
    imagemUrl: z.string().trim().url('É necessário fornecer a URL válida de uma imagem.'),
    valor: z.coerce.number().min(0, 'O valor não pode ser negativo.').optional().nullable(),
    linkSocial: z.string().trim().optional().nullable(),
})

export type DadosItemPortfolio = z.infer<typeof SchemaPortfolio>

// ── AUXILIARES DE SEGURANÇA ───────────────────────────────────────────────────
/**
 * Retorna null se autorizado, ou uma string de erro caso contrário.
 * Elimina o anti-pattern de controle de fluxo via throw Error.
 */
async function checarPermissaoAdmin(): Promise<string | null> {
    const sessao = await verificarSessaoFuncionario()
    if (!sessao.logado || sessao.role !== 'ADMIN') {
        return 'Acesso negado. Apenas a gerência pode alterar o portfólio da vitrine.'
    }
    return null
}

// ── 1. LISTAGEM (Pública) ─────────────────────────────────────────────────────

// O uso de cache previne N+1 queries ou consultas redundantes no banco de dados 
// ao renderizar a Landing Page, poupando recursos em alto tráfego.
export const listarPortfolioPublico = cache(async (): Promise<ActionResult<{ itens: ItemPortfolioDb[] }>> => {
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
    } catch (error) {
        console.error('Erro ao listar o portfólio público:', error)
        return { sucesso: false, erro: 'Falha ao carregar portfólio.' }
    }
})

// ── 2. CRIAÇÃO (Protegida) ────────────────────────────────────────────────────

export async function adicionarItemPortfolio(
    dadosRaw: Record<string, unknown>
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
                valor: dados.valor || null,
                imagemUrl: dados.imagemUrl,
                linkSocial: dados.linkSocial || null,
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
        // Revalida a página de gestão administrativa
        revalidatePath('/admin/portfolio')

        return { sucesso: true, item }
    } catch (error) {
        console.error('Erro ao adicionar item ao portfólio:', error)
        return { sucesso: false, erro: 'Falha ao salvar no portfólio.' }
    }
}