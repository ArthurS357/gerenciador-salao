'use server'

import { prisma } from '@/lib/prisma'
import type { Servico } from '@/types/domain'

type ActionResult<T = object> =
    | ({ sucesso: true } & T)
    | { sucesso: false; erro: string }

type DadosCriarServico = {
    nome: string
    descricao?: string
    preco?: number | string | null
    tempoMinutos?: number | string | null
    imagemUrl?: string | null
}

export async function listarServicosPublicos(): Promise<ActionResult<{ servicos: Servico[] }>> {
    try {
        const servicos = await prisma.servico.findMany({
            where: { ativo: true },
            orderBy: { nome: 'asc' },
        })
        return { sucesso: true, servicos: servicos as Servico[] }
    } catch {
        return { sucesso: false, erro: 'Falha ao listar serviços.' }
    }
}

export async function listarServicosAdmin(): Promise<ActionResult<{ servicos: Servico[] }>> {
    try {
        const servicos = await prisma.servico.findMany({
            where: { ativo: true },
            orderBy: { nome: 'asc' },
        })
        return { sucesso: true, servicos: servicos as Servico[] }
    } catch {
        return { sucesso: false, erro: 'Falha ao listar serviços.' }
    }
}

export async function criarServicoAdmin(
    dados: DadosCriarServico
): Promise<ActionResult<{ servico: Servico }>> {
    try {
        const servico = await prisma.servico.create({
            data: {
                nome: dados.nome,
                descricao: dados.descricao ?? null,
                preco: dados.preco != null && dados.preco !== '' ? Number(dados.preco) : null,
                tempoMinutos:
                    dados.tempoMinutos != null && dados.tempoMinutos !== ''
                        ? Number(dados.tempoMinutos)
                        : null,
                imagemUrl: dados.imagemUrl ?? null,
            },
        })
        return { sucesso: true, servico: servico as Servico }
    } catch {
        return { sucesso: false, erro: 'Falha ao cadastrar o serviço.' }
    }
}