'use server'

import { prisma } from '@/lib/prisma'

type ActionResult<T = object> =
    | ({ sucesso: true } & T)
    | { sucesso: false; erro: string }

export async function criarAvaliacao(
    agendamentoId: string,
    nota: number,
    comentario?: string
): Promise<ActionResult> {
    try {
        if (nota < 1 || nota > 5) {
            return { sucesso: false, erro: 'A nota deve estar entre 1 e 5 estrelas.' }
        }

        const existente = await prisma.avaliacao.findUnique({
            where: { agendamentoId }
        })

        if (existente) {
            return { sucesso: false, erro: 'Você já avaliou este atendimento. Obrigado!' }
        }

        await prisma.avaliacao.create({
            data: {
                agendamentoId,
                nota,
                comentario
            }
        })

        return { sucesso: true }
    } catch (error) {
        console.error('Erro ao salvar avaliação:', error)
        return { sucesso: false, erro: 'Falha técnica ao tentar salvar a avaliação.' }
    }
}

export type AvaliacaoAdminItem = {
    id: string
    nota: number
    comentario: string | null
    criadoEm: Date
    agendamento: {
        cliente: { nome: string }
        funcionario: { nome: string }
        servicos: { servico: { nome: string } }[]
    }
}

export async function listarAvaliacoesAdmin(): Promise<ActionResult<{ avaliacoes: AvaliacaoAdminItem[], mediaGeral: number }>> {
    try {
        const avaliacoes = await prisma.avaliacao.findMany({
            orderBy: { criadoEm: 'desc' },
            include: {
                agendamento: {
                    select: {
                        cliente: { select: { nome: true } },
                        funcionario: { select: { nome: true } },
                        servicos: { select: { servico: { select: { nome: true } } } }
                    }
                }
            }
        })

        // Calcula a média geral do salão
        const somaNotas = avaliacoes.reduce((acc, av) => acc + av.nota, 0)
        const mediaGeral = avaliacoes.length > 0 ? somaNotas / avaliacoes.length : 0

        return {
            sucesso: true,
            avaliacoes: avaliacoes as AvaliacaoAdminItem[],
            mediaGeral
        }
    } catch (error) {
        console.error('Erro ao listar avaliações:', error)
        return { sucesso: false, erro: 'Falha ao carregar as avaliações.' }
    }
}