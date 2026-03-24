'use server'

import { prisma } from '@/lib/prisma'
import { cookies } from 'next/headers'
import type { Cliente } from '@/types/domain'

type ActionResult<T = object> =
    | ({ sucesso: true } & T)
    | { sucesso: false; erro: string }

export type HistoricoAgendamentoItem = {
    id: string
    dataHoraInicio: Date
    valorBruto: number
    concluido: boolean
    funcionario: { nome: string }
    servicos: { servico: { nome: string } }[]
    produtos: { produto: { nome: string } }[]
}

export type HistoricoClienteData = {
    cliente: { nome: string; telefone: string | null; anonimizado: boolean }
    totalGasto: number
    agendamentos: HistoricoAgendamentoItem[]
}

export async function excluirContaCliente(clienteId: string): Promise<ActionResult> {
    try {
        const cliente = await prisma.cliente.findUnique({ where: { id: clienteId } })
        if (!cliente) return { sucesso: false, erro: 'Cliente não encontrado.' }

        await prisma.cliente.update({
            where: { id: clienteId },
            data: {
                nome: 'Cliente Excluído',
                // Adicionamos um sufixo com ID para garantir que o telefone não dê conflito de unique
                telefone: `EXCLUIDO-${clienteId.substring(0, 8)}`,
                anonimizado: true,
                senhaHash: null,
            }
        })

        const cookieStore = await cookies()
        cookieStore.delete('cliente_session')

        return { sucesso: true }
    } catch (error) {
        console.error('Erro ao anonimizar cliente:', error)
        return { sucesso: false, erro: 'Falha técnica ao excluir os dados.' }
    }
}

export async function listarTodosClientes(): Promise<ActionResult<{ clientes: (Cliente & { _count: { agendamentos: number } })[] }>> {
    try {
        const clientes = await prisma.cliente.findMany({
            orderBy: { nome: 'asc' },
            include: {
                _count: { select: { agendamentos: true } },
            },
        })
        return { sucesso: true, clientes: clientes as unknown as (Cliente & { _count: { agendamentos: number } })[] }
    } catch {
        return { sucesso: false, erro: 'Falha ao listar clientes.' }
    }
}

// ── NOVA FUNÇÃO: Obter Histórico do Cliente ───────────────────────────────────

export async function obterHistoricoCliente(clienteId: string): Promise<ActionResult<{ dados: HistoricoClienteData }>> {
    try {
        const cliente = await prisma.cliente.findUnique({
            where: { id: clienteId }
        })

        if (!cliente) return { sucesso: false, erro: 'Cliente não encontrado.' }

        const agendamentos = await prisma.agendamento.findMany({
            where: { clienteId },
            orderBy: { dataHoraInicio: 'desc' },
            include: {
                funcionario: { select: { nome: true } },
                servicos: { include: { servico: { select: { nome: true } } } },
                produtos: { include: { produto: { select: { nome: true } } } }
            }
        })

        // Soma apenas o valor de comandas já concluídas (faturadas)
        const totalGasto = agendamentos
            .filter(ag => ag.concluido)
            .reduce((acc, ag) => acc + ag.valorBruto, 0)

        return {
            sucesso: true,
            dados: {
                cliente: { nome: cliente.nome, telefone: cliente.telefone, anonimizado: cliente.anonimizado },
                totalGasto,
                agendamentos: agendamentos as unknown as HistoricoAgendamentoItem[]
            }
        }
    } catch (error) {
        console.error('Erro ao obter histórico do cliente:', error)
        return { sucesso: false, erro: 'Falha técnica ao carregar o histórico.' }
    }
}

// Reproveitamos a função que já usa no admin de LGPD
export async function anonimizarClienteLGPD(id: string): Promise<ActionResult> {
    return excluirContaCliente(id);
}
export async function excluirClientePermanente(id: string): Promise<ActionResult> {
    try {
        await prisma.cliente.delete({ where: { id } })
        return { sucesso: true }
    } catch {
        return { sucesso: false, erro: 'Não é possível excluir clientes com histórico financeiro atrelado.' }
    }
}