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

export async function listarAgendaProfissional(funcionarioId: string): Promise<
    ActionResult<{ agendamentos: any[] }>
> {
    try {
        const agendamentos = await prisma.agendamento.findMany({
            where: {
                funcionarioId,
                // Opcional: Pode filtrar para mostrar apenas agendamentos de hoje em diante
                // dataHoraInicio: { gte: new Date(new Date().setHours(0,0,0,0)) }
            },
            orderBy: { dataHoraInicio: 'asc' },
            include: {
                cliente: { select: { nome: true, telefone: true } },
                servicos: { include: { servico: { select: { nome: true, preco: true, tempoMinutos: true } } } },
                produtos: { include: { produto: { select: { nome: true, precoVenda: true } } } },
            },
        })

        return { sucesso: true, agendamentos }
    } catch (error) {
        console.error('Erro ao listar agenda do profissional:', error)
        return { sucesso: false, erro: 'Falha ao carregar a sua agenda.' }
    }
}

export async function cancelarAgendamentoPendente(id: string): Promise<ActionResult> {
    try {
        // Passo 1: Buscar o agendamento junto com os produtos atrelados
        const agendamento = await prisma.agendamento.findUnique({
            where: { id },
            include: { produtos: true }
        })

        if (!agendamento) {
            return { sucesso: false, erro: 'Agendamento não encontrado.' }
        }

        if (agendamento.concluido) {
            return {
                sucesso: false,
                erro: 'Não é possível cancelar uma comanda que já foi faturada e enviada ao caixa.',
            }
        }

        // Passo 2, 3 e 4: Abrir transação para devolver estoque e deletar
        await prisma.$transaction(async (tx) => {
            // Restaura o estoque de cada produto que estava na comanda
            for (const item of agendamento.produtos) {
                await tx.produto.update({
                    where: { id: item.produtoId },
                    data: { estoque: { increment: item.quantidade } }
                })
            }

            // Deleta o agendamento (cascade deletará os itens pivô)
            await tx.agendamento.delete({ where: { id } })
        })

        return { sucesso: true }
    } catch {
        return { sucesso: false, erro: 'Falha técnica ao tentar cancelar o agendamento.' }
    }
}

export async function listarAgendamentosGlobais() {
    try {
        const agendamentos = await prisma.agendamento.findMany({
            orderBy: { dataHoraInicio: 'desc' }, // Traz os mais recentes/futuros primeiro
            include: {
                cliente: { select: { nome: true, telefone: true } },
                funcionario: { select: { nome: true } }
            }
        })

        return { sucesso: true, agendamentos }
    } catch (error) {
        console.error('Erro ao listar agendamentos globais:', error)
        return { sucesso: false, erro: 'Falha ao carregar a agenda global.' }
    }
}