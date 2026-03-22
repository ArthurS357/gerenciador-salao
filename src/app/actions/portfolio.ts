'use server'

import { prisma } from '@/lib/prisma'
import type { ItemPortfolioDb } from '@/types/domain'

type ActionResult<T = object> =
    | ({ sucesso: true } & T)
    | { sucesso: false; erro: string }

type DadosItemPortfolio = {
    titulo: string
    valor?: number | string | null
    imagemUrl: string
    linkSocial?: string | null
}

export async function listarPortfolioPublico(): Promise<ActionResult<{ itens: ItemPortfolioDb[] }>> {
    try {
        const itens = await prisma.itemPortfolio.findMany({
            where: { ativo: true },
            orderBy: { criadoEm: 'desc' },
            take: 6,
        })
        return { sucesso: true, itens: itens as unknown as ItemPortfolioDb[] }
    } catch {
        return { sucesso: false, erro: 'Falha ao carregar portfólio.' }
    }
}

export async function adicionarItemPortfolio(
    dados: DadosItemPortfolio
): Promise<ActionResult<{ item: ItemPortfolioDb }>> {
    try {
        const item = await prisma.itemPortfolio.create({
            data: {
                titulo: dados.titulo,
                valor: dados.valor != null ? Number(dados.valor) : null,
                imagemUrl: dados.imagemUrl,
                linkSocial: dados.linkSocial ?? null,
            },
        })
        return { sucesso: true, item: item as unknown as ItemPortfolioDb }
    } catch {
        return { sucesso: false, erro: 'Falha ao salvar no portfólio.' }
    }
}