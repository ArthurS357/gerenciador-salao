'use server'

import { prisma } from '@/lib/prisma'
import type { AgendamentoGlobal } from '@/types/domain'

type ActionResult<T = object> =
    | ({ sucesso: true } & T)
    | { sucesso: false; erro: string }

export async function criarAgendamentoMultiplo(
    clienteId: string,
    funcionarioId: string,
    dataHoraInicio: Date,
    servicosIds: string[]
): Promise<ActionResult<{ agendamentoId: string }>> {
    const TEMPO_BUFFER_MINUTOS = 5

    try {
        if (!servicosIds.length) {
            return { sucesso: false, erro: 'Selecione pelo menos um serviço.' }
        }

        const servicos = await prisma.servico.findMany({
            where: { id: { in: servicosIds } },
        })

        if (servicos.length !== servicosIds.length) {
            return { sucesso: false, erro: 'Um ou mais serviços são inválidos.' }
        }

        let valorBruto = 0
        let tempoTotalMinutos = 0

        const itensParaCriar = servicos.map((s) => {
            valorBruto += s.preco ?? 0
            tempoTotalMinutos += s.tempoMinutos ?? 30
            return { servicoId: s.id, precoCobrado: s.preco }
        })

        const tempoTotalBloqueio = tempoTotalMinutos + TEMPO_BUFFER_MINUTOS
        const dataHoraFim = new Date(dataHoraInicio.getTime() + tempoTotalBloqueio * 60_000)

        const conflito = await prisma.agendamento.findFirst({
            where: {
                funcionarioId,
                concluido: false,
                AND: [
                    { dataHoraInicio: { lt: dataHoraFim } },
                    { dataHoraFim: { gt: dataHoraInicio } },
                ],
            },
        })

        if (conflito) {
            return {
                sucesso: false,
                erro: 'Choque de horários. O profissional não tem agenda disponível para este intervalo total.',
            }
        }

        const novoAgendamento = await prisma.agendamento.create({
            data: {
                clienteId,
                funcionarioId,
                valorBruto,
                taxas: 0,
                dataHoraInicio,
                dataHoraFim,
                concluido: false,
                servicos: { create: itensParaCriar },
            },
        })

        return { sucesso: true, agendamentoId: novoAgendamento.id }
    } catch (error) {
        console.error('Erro na orquestração do agendamento múltiplo:', error)
        return { sucesso: false, erro: 'Falha técnica ao processar a reserva.' }
    }
}

export async function listarAgendamentosGlobais(): Promise<
    ActionResult<{ agendamentos: AgendamentoGlobal[] }>
> {
    try {
        const agendamentos = await prisma.agendamento.findMany({
            orderBy: { dataHoraInicio: 'desc' },
            include: {
                cliente: { select: { nome: true, anonimizado: true, telefone: true } },
                funcionario: { select: { nome: true } },
                servicos: { include: { servico: { select: { id: true, nome: true, preco: true } } } },
                produtos: {
                    include: {
                        produto: { select: { precoCusto: true, nome: true, precoVenda: true } },
                    },
                },
            },
        })
        return { sucesso: true, agendamentos: agendamentos as unknown as AgendamentoGlobal[] }
    } catch {
        return { sucesso: false, erro: 'Falha ao listar agendamentos.' }
    }
}

export async function cancelarAgendamentoPendente(id: string): Promise<ActionResult> {
    try {
        const agendamento = await prisma.agendamento.findUnique({ where: { id } })

        if (!agendamento) {
            return { sucesso: false, erro: 'Agendamento não encontrado.' }
        }

        if (agendamento.concluido) {
            return {
                sucesso: false,
                erro: 'Não é possível cancelar uma comanda que já foi faturada e enviada ao caixa.',
            }
        }

        await prisma.agendamento.delete({ where: { id } })
        return { sucesso: true }
    } catch {
        return { sucesso: false, erro: 'Falha técnica ao tentar cancelar o agendamento.' }
    }
}