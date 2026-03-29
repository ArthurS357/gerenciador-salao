'use server'

import { prisma } from '@/lib/prisma'
import { cookies } from 'next/headers'
import { verificarSessaoCliente, verificarSessaoFuncionario } from '@/app/actions/auth'

// ── TIPAGEM ESTRITA ──────────────────────────────────────────────────────────
type ActionResult<T = void> =
    | (T extends void ? { sucesso: true } : { sucesso: true } & T)
    | { sucesso: false; erro: string }

export type HistoricoAgendamentoItem = {
    id: string
    dataHoraInicio: Date
    valorBruto: number
    concluido: boolean
    funcionario: { nome: string }
    servicos: { servico: { nome: string } }[]
    produtos: { produto: { nome: string } }[]
    avaliacao?: { id: string; nota: number } | null // <-- ADICIONADO PARA CONTROLAR A UI
}

export type HistoricoClienteData = {
    cliente: { nome: string; telefone: string; email: string | null; cpf: string | null; anonimizado: boolean }
    totalGasto: number
    agendamentos: HistoricoAgendamentoItem[]
}

export type ClienteResumo = {
    id: string
    nome: string
    telefone: string
    email: string | null
    cpf: string | null
    anonimizado: boolean
    _count: { agendamentos: number }
}

export type ClienteDados = {
    id: string
    nome: string
    telefone: string
    email: string | null
    cpf: string | null
    anonimizado: boolean
}

type DadosCliente = {
    nome: string
    telefone: string
    email?: string | null
    cpf?: string | null
}

// ── AUXILIARES DE SEGURANÇA ──────────────────────────────────────────────────
async function garantirPermissaoAdmin() {
    const sessao = await verificarSessaoFuncionario()
    if (!sessao.logado || sessao.role !== 'ADMIN') {
        throw new Error('Acesso negado. Requer privilégios de administrador.')
    }
}

// Garante que a ação só seja feita pelo próprio cliente dono da conta ou por um ADMIN
async function garantirPermissaoDonoOuAdmin(clienteIdAlvo: string) {
    const sessaoCli = await verificarSessaoCliente()
    const sessaoFunc = await verificarSessaoFuncionario()

    const isDono = sessaoCli.logado && sessaoCli.id === clienteIdAlvo
    const isAdmin = sessaoFunc.logado && sessaoFunc.role === 'ADMIN'

    if (!isDono && !isAdmin) {
        throw new Error('Acesso negado. Você só pode visualizar ou alterar os seus próprios dados.')
    }
}

// ── CRIAR CLIENTE (Admin) ────────────────────────────────────────────────────

export async function criarCliente(dados: DadosCliente): Promise<ActionResult<{ cliente: ClienteDados }>> {
    try {
        await garantirPermissaoAdmin()

        const telefoneLimpo = dados.telefone.replace(/\D/g, '')
        if (telefoneLimpo.length < 10 || telefoneLimpo.length > 11) {
            return { sucesso: false, erro: 'Número de telefone inválido.' }
        }

        const existente = await prisma.cliente.findUnique({ where: { telefone: telefoneLimpo } })
        if (existente) return { sucesso: false, erro: 'Já existe um cliente com este telefone.' }

        if (dados.cpf) {
            const cpfLimpo = dados.cpf.replace(/\D/g, '')
            if (cpfLimpo.length !== 11) return { sucesso: false, erro: 'CPF inválido. Informe os 11 dígitos.' }

            const cpfExistente = await prisma.cliente.findUnique({ where: { cpf: cpfLimpo } })
            if (cpfExistente) return { sucesso: false, erro: 'Já existe um cliente com este CPF.' }
        }

        const cliente = await prisma.cliente.create({
            data: {
                nome: dados.nome.trim(),
                telefone: telefoneLimpo,
                email: dados.email?.trim() || null,
                cpf: dados.cpf ? dados.cpf.replace(/\D/g, '') : null,
            },
            select: { id: true, nome: true, telefone: true, email: true, cpf: true, anonimizado: true }
        })

        return { sucesso: true, cliente }
    } catch (error) {
        if (error instanceof Error && error.message.includes('Acesso negado')) return { sucesso: false, erro: error.message }
        console.error('Erro ao criar cliente:', error)
        return { sucesso: false, erro: 'Falha técnica ao criar o cliente.' }
    }
}

// ── EDITAR CLIENTE (Híbrido) ─────────────────────────────────────────────────

export async function editarCliente(id: string, dados: DadosCliente): Promise<ActionResult> {
    try {
        await garantirPermissaoDonoOuAdmin(id)

        const telefoneLimpo = dados.telefone.replace(/\D/g, '')
        if (telefoneLimpo.length < 10 || telefoneLimpo.length > 11) {
            return { sucesso: false, erro: 'Número de telefone inválido.' }
        }

        const telefoneExistente = await prisma.cliente.findFirst({
            where: { telefone: telefoneLimpo, NOT: { id } }
        })
        if (telefoneExistente) return { sucesso: false, erro: 'Este telefone já está cadastrado noutra conta.' }

        if (dados.cpf) {
            const cpfLimpo = dados.cpf.replace(/\D/g, '')
            if (cpfLimpo.length !== 11) return { sucesso: false, erro: 'CPF inválido. Informe os 11 dígitos.' }

            const cpfExistente = await prisma.cliente.findFirst({
                where: { cpf: cpfLimpo, NOT: { id } }
            })
            if (cpfExistente) return { sucesso: false, erro: 'Este CPF já está cadastrado noutra conta.' }
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
        if (error instanceof Error && error.message.includes('Acesso negado')) return { sucesso: false, erro: error.message }
        console.error('Erro ao editar cliente:', error)
        return { sucesso: false, erro: 'Falha técnica ao atualizar o perfil.' }
    }
}

// ── EXCLUSÃO / LGPD (Híbrido) ────────────────────────────────────────────────

export async function excluirContaCliente(clienteId: string): Promise<ActionResult> {
    try {
        await garantirPermissaoDonoOuAdmin(clienteId)

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

        // Apenas apaga a cookie se foi o próprio cliente a excluir a conta
        const sessaoCli = await verificarSessaoCliente()
        if (sessaoCli.logado && sessaoCli.id === clienteId) {
            const cookieStore = await cookies()
            cookieStore.delete('cliente_session')
        }

        return { sucesso: true }
    } catch (error) {
        if (error instanceof Error && error.message.includes('Acesso negado')) return { sucesso: false, erro: error.message }
        console.error('Erro ao anonimizar cliente:', error)
        return { sucesso: false, erro: 'Falha técnica ao excluir os dados.' }
    }
}

// ── LISTAGEM GLOBAL (Apenas Admin) ───────────────────────────────────────────

export async function listarTodosClientes(): Promise<ActionResult<{ clientes: ClienteResumo[] }>> {
    try {
        await garantirPermissaoAdmin()

        const clientes = await prisma.cliente.findMany({
            orderBy: { nome: 'asc' },
            select: {
                id: true, nome: true, telefone: true, email: true, cpf: true, anonimizado: true,
                _count: { select: { agendamentos: true } }
            }
        })
        return { sucesso: true, clientes }
    } catch (error) {
        if (error instanceof Error && error.message.includes('Acesso negado')) return { sucesso: false, erro: error.message }
        return { sucesso: false, erro: 'Falha ao listar clientes.' }
    }
}

// ── HISTÓRICO INDIVIDUAL (Híbrido) ───────────────────────────────────────────

export async function obterHistoricoCliente(clienteId: string): Promise<ActionResult<{ dados: HistoricoClienteData }>> {
    try {
        await garantirPermissaoDonoOuAdmin(clienteId)

        const cliente = await prisma.cliente.findUnique({
            where: { id: clienteId },
            select: { nome: true, telefone: true, email: true, cpf: true, anonimizado: true }
        })

        if (!cliente) return { sucesso: false, erro: 'Cliente não encontrado.' }

        const agendamentos = await prisma.agendamento.findMany({
            where: { clienteId },
            orderBy: { dataHoraInicio: 'desc' },
            select: {
                id: true, dataHoraInicio: true, valorBruto: true, concluido: true,
                funcionario: { select: { nome: true } },
                servicos: { select: { servico: { select: { nome: true } } } },
                produtos: { select: { produto: { select: { nome: true } } } },
                avaliacao: { select: { id: true, nota: true } } // <-- BUSCA AVALIAÇÃO PARA BLOQUEAR O BOTÃO
            }
        })

        const totalGasto = agendamentos
            .filter(ag => ag.concluido)
            .reduce((acc, ag) => acc + ag.valorBruto, 0)

        return {
            sucesso: true,
            dados: {
                cliente,
                totalGasto,
                agendamentos
            }
        }
    } catch (error) {
        if (error instanceof Error && error.message.includes('Acesso negado')) return { sucesso: false, erro: error.message }
        console.error('Erro ao obter histórico do cliente:', error)
        return { sucesso: false, erro: 'Falha técnica ao carregar o histórico.' }
    }
}

export async function anonimizarClienteLGPD(id: string): Promise<ActionResult> {
    return excluirContaCliente(id);
}

export async function excluirClientePermanente(id: string): Promise<ActionResult> {
    try {
        await garantirPermissaoAdmin()
        await prisma.cliente.delete({ where: { id } })
        return { sucesso: true }
    } catch (error) {
        if (error instanceof Error && error.message.includes('Acesso negado')) return { sucesso: false, erro: error.message }
        return { sucesso: false, erro: 'Não é possível excluir clientes com histórico financeiro atrelado.' }
    }
}