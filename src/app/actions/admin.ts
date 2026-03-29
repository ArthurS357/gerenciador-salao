'use server'

import { prisma } from '@/lib/prisma'
import { hash } from 'bcrypt'
import { randomUUID } from 'crypto'
import { revalidatePath } from 'next/cache'
import { verificarSessaoFuncionario } from '@/app/actions/auth'

// ── Tipagens Estritas ─────────────────────────────────────────────────────────

export type ActionResult<T = void> =
    | (T extends void ? { sucesso: true } : { sucesso: true } & T)
    | { sucesso: false; erro: string }

export type NotificacaoItem = {
    id: string
    mensagem: string
    lida: boolean
    criadoEm: Date
}

export type ServicoResumo = {
    id: string
    nome: string
}

export type ExpedienteInfo = {
    id?: string
    diaSemana: number
    horaInicio: string
    horaFim: string
    ativo: boolean
}

export type ProfissionalResumo = {
    id: string
    nome: string
    email: string
    especialidade: string | null
    ativo: boolean
    comissao: number
    podeVerComissao: boolean
    podeAgendar: boolean
    podeVerHistorico: boolean
    podeCancelar: boolean
    servicos: ServicoResumo[]
    expedientes: ExpedienteInfo[]
}

type DadosCriarFuncionario = {
    nome: string
    email: string
    cpf?: string
    telefone?: string
    especialidade?: string
    descricao?: string
    comissao?: number
    podeAgendar?: boolean
    podeVerHistorico?: boolean
    podeCancelar?: boolean
    servicosIds?: string[]
}

type DadosEditarFuncionario = {
    nome?: string
    email?: string
    cpf?: string
    telefone?: string
    especialidade?: string
    descricao?: string
    comissao?: number
    podeAgendar?: boolean
    podeVerHistorico?: boolean
    servicosIds?: string[]
}

// ── AUXILIARES DE SEGURANÇA ───────────────────────────────────────────────────

async function garantirPermissaoAdmin() {
    const sessao = await verificarSessaoFuncionario()
    if (!sessao.logado || sessao.role !== 'ADMIN') {
        throw new Error('Acesso negado. Requer privilégios de administrador.')
    }
}

// ── 1. CRIAÇÃO E EDIÇÃO ────────────────────────────────────────────────────────

export async function criarFuncionario(
    dados: DadosCriarFuncionario
): Promise<ActionResult<{ funcionario: ProfissionalResumo }>> {
    try {
        await garantirPermissaoAdmin();

        const senhaHash = await hash('Mudar@123', 12)
        const novoFuncionario = await prisma.funcionario.create({
            data: {
                nome: dados.nome, email: dados.email, senhaHash, role: 'PROFISSIONAL',
                cpf: dados.cpf ?? null, telefone: dados.telefone ?? null, especialidade: dados.especialidade ?? null,
                descricao: dados.descricao ?? null, comissao: Number(dados.comissao) || 40.0,
                podeAgendar: dados.podeAgendar ?? false, podeVerHistorico: dados.podeVerHistorico ?? false,
                podeCancelar: dados.podeCancelar ?? false,
                servicos: dados.servicosIds && dados.servicosIds.length > 0 ? { connect: dados.servicosIds.map(id => ({ id })) } : undefined,
            },
            select: {
                id: true, nome: true, email: true, especialidade: true, ativo: true,
                comissao: true, podeVerComissao: true, podeAgendar: true, podeVerHistorico: true, podeCancelar: true,
                servicos: { select: { id: true, nome: true } },
                expedientes: {
                    select: { id: true, diaSemana: true, horaInicio: true, horaFim: true, ativo: true }
                }
            }
        })

        return {
            sucesso: true,
            funcionario: {
                ...novoFuncionario,
                comissao: Number(novoFuncionario.comissao) // Evita erro de serialização do Decimal no Next.js
            } as ProfissionalResumo
        }
    } catch (error) {
        if (error instanceof Error && error.message.includes('Acesso negado')) return { sucesso: false, erro: error.message }
        return { sucesso: false, erro: 'Falha ao criar profissional.' }
    }
}

export async function editarFuncionarioCompleto(
    id: string, dados: DadosEditarFuncionario
): Promise<ActionResult> {
    try {
        await garantirPermissaoAdmin();

        const { servicosIds, ...restoDosDados } = dados;
        await prisma.funcionario.update({
            where: { id },
            data: { ...restoDosDados, ...(servicosIds && { servicos: { set: servicosIds.map(servicoId => ({ id: servicoId })) } }) },
        })
        return { sucesso: true }
    } catch (error) {
        if (error instanceof Error && error.message.includes('Acesso negado')) return { sucesso: false, erro: error.message }
        return { sucesso: false, erro: 'Falha ao atualizar os dados.' }
    }
}

// ── 2. PERMISSÕES E EXCLUSÕES ─────────────────────────────────────────────────

export async function atualizarFuncionarioCompleto(
    id: string, dados: { comissao?: number, podeVerComissao?: boolean, podeAgendar?: boolean, podeVerHistorico?: boolean, podeCancelar?: boolean, ativo?: boolean }
): Promise<ActionResult> {
    try {
        await garantirPermissaoAdmin();

        await prisma.funcionario.update({ where: { id }, data: dados })
        revalidatePath('/admin/dashboard')
        return { sucesso: true }
    } catch (error) {
        if (error instanceof Error && error.message.includes('Acesso negado')) return { sucesso: false, erro: error.message }
        return { sucesso: false, erro: 'Falha ao atualizar permissões.' }
    }
}

export async function inativarFuncionario(id: string): Promise<ActionResult> {
    try {
        await garantirPermissaoAdmin();

        await prisma.funcionario.update({ where: { id }, data: { ativo: false } })
        return { sucesso: true }
    } catch (error) {
        if (error instanceof Error && error.message.includes('Acesso negado')) return { sucesso: false, erro: error.message }
        return { sucesso: false, erro: 'Falha ao inativar funcionário.' }
    }
}

export async function excluirFuncionarioPermanente(id: string): Promise<ActionResult> {
    try {
        await garantirPermissaoAdmin();

        const temAgendamentos = await prisma.agendamento.findFirst({ where: { funcionarioId: id } })
        if (temAgendamentos) return { sucesso: false, erro: 'Possui agendamentos no histórico. Utilize a inativação.' }

        await prisma.funcionario.delete({ where: { id } })
        revalidatePath('/admin/dashboard')
        return { sucesso: true }
    } catch (error) {
        if (error instanceof Error && error.message.includes('Acesso negado')) return { sucesso: false, erro: error.message }
        return { sucesso: false, erro: 'Falha ao excluir o funcionário.' }
    }
}

export async function excluirClientePermanente(id: string): Promise<ActionResult> {
    try {
        await garantirPermissaoAdmin();

        const temAgendamentos = await prisma.agendamento.findFirst({ where: { clienteId: id } })
        if (temAgendamentos) return { sucesso: false, erro: 'O cliente possui histórico financeiro. Utilize a anonimização (LGPD) ou inative-o.' }

        await prisma.cliente.delete({ where: { id } })
        revalidatePath('/admin/clientes')
        return { sucesso: true }
    } catch (error) {
        if (error instanceof Error && error.message.includes('Acesso negado')) return { sucesso: false, erro: error.message }
        return { sucesso: false, erro: 'Falha ao excluir o cliente permanentemente.' }
    }
}

export async function anonimizarClienteLGPD(clienteId: string): Promise<ActionResult<{ mensagem: string }>> {
    try {
        await garantirPermissaoAdmin();

        const hashNome = `Anonimizado_${randomUUID().substring(0, 8)}`
        const hashTelefone = `0000_${randomUUID().substring(0, 8)}`

        await prisma.cliente.update({
            where: { id: clienteId },
            data: { nome: hashNome, telefone: hashTelefone, email: null, cpf: null, anonimizado: true },
        })

        return { sucesso: true, mensagem: 'Cliente anonimizado com sucesso.' }
    } catch (error) {
        if (error instanceof Error && error.message.includes('Acesso negado')) return { sucesso: false, erro: error.message }
        return { sucesso: false, erro: 'Falha ao processar a anonimização.' }
    }
}

// ── 3. LISTAGEM DE EQUIPA E ESCALAS ───────────────────────────────────────────

export async function listarEquipaAdmin(): Promise<ActionResult<{ equipa: ProfissionalResumo[] }>> {
    try {
        await garantirPermissaoAdmin();

        const equipa = await prisma.funcionario.findMany({
            where: { role: 'PROFISSIONAL' }, // <-- REMOVIDO: ativo: true. Agora busca todos (ativos e inativos)
            orderBy: { nome: 'asc' },
            select: {
                id: true, nome: true, email: true, especialidade: true, ativo: true,
                comissao: true, podeVerComissao: true, podeAgendar: true, podeVerHistorico: true, podeCancelar: true,
                servicos: { select: { id: true, nome: true } },
                expedientes: { select: { id: true, diaSemana: true, horaInicio: true, horaFim: true, ativo: true }, orderBy: { diaSemana: 'asc' } }
            }
        })

        const equipaNormalizada = equipa.map(prof => {
            let expedientes = prof.expedientes;
            if (expedientes.length === 0) {
                expedientes = Array.from({ length: 7 }).map((_, index) => ({
                    id: `temp-${index}`,
                    diaSemana: index,
                    horaInicio: '09:00',
                    horaFim: '18:00',
                    ativo: false
                }))
            }
            return {
                ...prof,
                comissao: Number(prof.comissao), // <-- CORREÇÃO: Evita erro de serialização do Decimal no Next.js
                expedientes
            }
        })

        return { sucesso: true, equipa: equipaNormalizada }
    } catch (error) {
        if (error instanceof Error && error.message.includes('Acesso negado')) return { sucesso: false, erro: error.message }
        console.error('Erro ao listar equipa:', error)
        return { sucesso: false, erro: 'Falha ao carregar a equipa.' }
    }
}

export async function salvarEscalaFuncionarioAdmin(
    funcionarioId: string, expedientes: ExpedienteInfo[]
): Promise<ActionResult> {
    try {
        await garantirPermissaoAdmin();

        const transacoes = expedientes.map(exp => {
            return prisma.expediente.upsert({
                where: { funcionarioId_diaSemana: { funcionarioId, diaSemana: exp.diaSemana } },
                update: { horaInicio: exp.horaInicio, horaFim: exp.horaFim, ativo: exp.ativo },
                create: { funcionarioId, diaSemana: exp.diaSemana, horaInicio: exp.horaInicio, horaFim: exp.horaFim, ativo: exp.ativo }
            })
        })
        await prisma.$transaction(transacoes)
        revalidatePath('/admin/dashboard')
        return { sucesso: true }
    } catch (error) {
        if (error instanceof Error && error.message.includes('Acesso negado')) return { sucesso: false, erro: error.message }
        return { sucesso: false, erro: 'Erro ao salvar a escala.' }
    }
}

// ── 4. SISTEMA DE NOTIFICAÇÕES ────────────────────────────────────────────────

export async function listarNotificacoesAdmin(): Promise<ActionResult<{ notificacoes: NotificacaoItem[] }>> {
    try {
        await garantirPermissaoAdmin();

        const notificacoes = await prisma.notificacao.findMany({
            where: { lida: false },
            orderBy: { criadoEm: 'desc' },
            select: { id: true, mensagem: true, lida: true, criadoEm: true }
        })
        return { sucesso: true, notificacoes }
    } catch (error) {
        if (error instanceof Error && error.message.includes('Acesso negado')) return { sucesso: false, erro: error.message }
        return { sucesso: false, erro: 'Erro ao carregar notificações.' }
    }
}

export async function marcarNotificacaoLida(id: string): Promise<ActionResult> {
    try {
        await garantirPermissaoAdmin();

        await prisma.notificacao.update({ where: { id }, data: { lida: true } })
        return { sucesso: true }
    } catch (error) {
        if (error instanceof Error && error.message.includes('Acesso negado')) return { sucesso: false, erro: error.message }
        return { sucesso: false, erro: 'Erro ao limpar alerta.' }
    }
}