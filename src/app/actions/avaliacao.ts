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