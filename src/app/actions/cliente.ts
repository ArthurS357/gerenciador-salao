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
    cliente: { nome: string; telefone: string | null; email: string | null; cpf: string | null; anonimizado: boolean }
    totalGasto: number
    agendamentos: HistoricoAgendamentoItem[]
}

type DadosCliente = {
    nome: string
    telefone: string
    email?: string | null
    cpf?: string | null
}

// ── CRIAR CLIENTE (Admin) ────────────────────────────────────────────────────

export async function criarCliente(dados: DadosCliente): Promise<ActionResult<{ cliente: Cliente }>> {
    try {
        // Validações básicas
        const telefoneLimpo = dados.telefone.replace(/\D/g, '')
        if (telefoneLimpo.length < 10 || telefoneLimpo.length > 11) {
            return { sucesso: false, erro: 'Número de telefone inválido.' }
        }

        const existente = await prisma.cliente.findUnique({ where: { telefone: telefoneLimpo } })
        if (existente) {
            return { sucesso: false, erro: 'Já existe um cliente com este telefone.' }
        }

        // Verificar CPF único se fornecido
        if (dados.cpf) {
            const cpfLimpo = dados.cpf.replace(/\D/g, '')
            if (cpfLimpo.length !== 11) {
                return { sucesso: false, erro: 'CPF inválido. Informe os 11 dígitos.' }
            }
            const cpfExistente = await prisma.cliente.findFirst({ where: { cpf: cpfLimpo } })
            if (cpfExistente) {
                return { sucesso: false, erro: 'Já existe um cliente com este CPF.' }
            }
        }

        const cliente = await prisma.cliente.create({
            data: {
                nome: dados.nome.trim(),
                telefone: telefoneLimpo,
                email: dados.email?.trim() || null,
                cpf: dados.cpf ? dados.cpf.replace(/\D/g, '') : null,
            }
        })

        return { sucesso: true, cliente: cliente as unknown as Cliente }
    } catch (error) {
        console.error('Erro ao criar cliente:', error)
        return { sucesso: false, erro: 'Falha técnica ao criar o cliente.' }
    }
}

// ── EDITAR CLIENTE (Admin) ───────────────────────────────────────────────────

export async function editarCliente(id: string, dados: DadosCliente): Promise<ActionResult> {
    try {
        const telefoneLimpo = dados.telefone.replace(/\D/g, '')
        if (telefoneLimpo.length < 10 || telefoneLimpo.length > 11) {
            return { sucesso: false, erro: 'Número de telefone inválido.' }
        }

        // Verificar telefone único (excluindo o próprio cliente)
        const telefoneExistente = await prisma.cliente.findFirst({
            where: { telefone: telefoneLimpo, NOT: { id } }
        })
        if (telefoneExistente) {
            return { sucesso: false, erro: 'Este telefone já está cadastrado em outro cliente.' }
        }

        // Verificar CPF único se fornecido
        if (dados.cpf) {
            const cpfLimpo = dados.cpf.replace(/\D/g, '')
            if (cpfLimpo.length !== 11) {
                return { sucesso: false, erro: 'CPF inválido. Informe os 11 dígitos.' }
            }
            const cpfExistente = await prisma.cliente.findFirst({
                where: { cpf: cpfLimpo, NOT: { id } }
            })
            if (cpfExistente) {
                return { sucesso: false, erro: 'Este CPF já está cadastrado em outro cliente.' }
            }
        }

        await prisma.cliente.update({
            where: { id },
            data: {
                nome: dados.nome.trim(),
                telefone: telefoneLimpo,
                email: dados.email?.trim() || null,
                cpf: dados.cpf ? dados.cpf.replace(/\D/g, '') : null,
            }
        })

        return { sucesso: true }
    } catch (error) {
        console.error('Erro ao editar cliente:', error)
        return { sucesso: false, erro: 'Falha técnica ao atualizar o cliente.' }
    }
}

// ── EXCLUSÃO / LGPD ──────────────────────────────────────────────────────────

export async function excluirContaCliente(clienteId: string): Promise<ActionResult> {
    try {
        const cliente = await prisma.cliente.findUnique({ where: { id: clienteId } })
        if (!cliente) return { sucesso: false, erro: 'Cliente não encontrado.' }

        await prisma.cliente.update({
            where: { id: clienteId },
            data: {
                nome: 'Cliente Excluído',
                telefone: `EXCLUIDO-${clienteId.substring(0, 8)}`,
                email: null,
                cpf: null,
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

export async function obterHistoricoCliente(clienteId: string): Promise<ActionResult<{ dados: HistoricoClienteData }>> {
    try {
        const cliente = await prisma.cliente.findUnique({ where: { id: clienteId } })
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

        const totalGasto = agendamentos
            .filter(ag => ag.concluido)
            .reduce((acc, ag) => acc + ag.valorBruto, 0)

        return {
            sucesso: true,
            dados: {
                cliente: {
                    nome: cliente.nome,
                    telefone: cliente.telefone,
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    email: (cliente as any).email ?? null,
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    cpf: (cliente as any).cpf ?? null,
                    anonimizado: cliente.anonimizado
                },
                totalGasto,
                agendamentos: agendamentos as unknown as HistoricoAgendamentoItem[]
            }
        }
    } catch (error) {
        console.error('Erro ao obter histórico do cliente:', error)
        return { sucesso: false, erro: 'Falha técnica ao carregar o histórico.' }
    }
}

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