'use server'

import { prisma } from '@/lib/prisma'
import { hash } from 'bcrypt'
import { randomUUID } from 'crypto'
import { revalidatePath } from 'next/cache'
import { verificarSessaoFuncionario } from '@/app/actions/auth'
import { z } from 'zod'
import { ActionResult } from '@/types/domain'

// ── Tipagens ──────────────────────────────────────────────────────────────────
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

const SENHA_PADRAO_INICIAL = 'Mudar@123'

// ── Schemas de Validação (Runtime Safety) ─────────────────────────────────────
const SchemaFuncionario = z.object({
    nome: z.string().min(2, 'Nome muito curto.'),
    email: z.string().email('E-mail inválido.'),
    cpf: z.string().optional().nullable(),
    telefone: z.string().optional().nullable(),
    especialidade: z.string().optional().nullable(),
    descricao: z.string().optional().nullable(),
    comissao: z.coerce.number().min(0).max(100).default(40.0),
    podeAgendar: z.boolean().default(false),
    podeVerHistorico: z.boolean().default(false),
    podeCancelar: z.boolean().default(false),
    servicosIds: z.array(z.string()).optional(),
})

const SchemaEdicaoFuncionario = SchemaFuncionario.partial().extend({
    ativo: z.boolean().optional(),
    podeVerComissao: z.boolean().optional()
})

export type DadosCriarFuncionario = z.infer<typeof SchemaFuncionario>
export type DadosEditarFuncionario = z.infer<typeof SchemaEdicaoFuncionario>

// ── AUXILIARES DE SEGURANÇA ───────────────────────────────────────────────────
/**
 * Retorna null se autorizado, ou uma string de erro caso contrário.
 * Elimina o anti-pattern de controle de fluxo via throw Error + String Matching.
 */
async function checarPermissaoAdmin(): Promise<string | null> {
    const sessao = await verificarSessaoFuncionario()
    if (!sessao.logado || sessao.role !== 'ADMIN') {
        return 'Acesso negado. Requer privilégios de administrador.'
    }
    return null
}

// ── 1. CRIAÇÃO E EDIÇÃO ────────────────────────────────────────────────────────

export async function criarFuncionario(
    dadosRaw: DadosCriarFuncionario
): Promise<ActionResult<{ funcionario: ProfissionalResumo }>> {
    const erroAuth = await checarPermissaoAdmin()
    if (erroAuth) return { sucesso: false, erro: erroAuth }

    const validacao = SchemaFuncionario.safeParse(dadosRaw)
    if (!validacao.success) return { sucesso: false, erro: validacao.error.issues[0]?.message || 'Dados inválidos.' }

    const dados = validacao.data

    try {
        const senhaHash = await hash(SENHA_PADRAO_INICIAL, 12)
        const novoFuncionario = await prisma.funcionario.create({
            data: {
                nome: dados.nome, email: dados.email, senhaHash, role: 'PROFISSIONAL',
                cpf: dados.cpf ?? null, telefone: dados.telefone ?? null, especialidade: dados.especialidade ?? null,
                descricao: dados.descricao ?? null, comissao: dados.comissao,
                podeAgendar: dados.podeAgendar, podeVerHistorico: dados.podeVerHistorico,
                podeCancelar: dados.podeCancelar,
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
            data: {
                funcionario: {
                    ...novoFuncionario,
                    comissao: Number(novoFuncionario.comissao)
                }
            }
        }
    } catch (error) {
        console.error('[Admin] Erro na criação de funcionário:', error)
        return { sucesso: false, erro: 'Falha técnica ao criar profissional. O e-mail já pode estar em uso.' }
    }
}

export async function editarFuncionarioCompleto(
    id: string, dadosRaw: DadosEditarFuncionario
): Promise<ActionResult> {
    const erroAuth = await checarPermissaoAdmin()
    if (erroAuth) return { sucesso: false, erro: erroAuth }

    const validacao = SchemaEdicaoFuncionario.safeParse(dadosRaw)
    if (!validacao.success) return { sucesso: false, erro: 'Dados de edição inválidos.' }

    const { servicosIds, ...restoDosDados } = validacao.data;

    try {
        await prisma.funcionario.update({
            where: { id },
            data: {
                ...restoDosDados,
                ...(servicosIds && { servicos: { set: servicosIds.map(servicoId => ({ id: servicoId })) } })
            },
        })
        return { sucesso: true }
    } catch (error) {
        console.error(`[Admin] Erro ao editar funcionário ${id}:`, error)
        return { sucesso: false, erro: 'Falha técnica ao atualizar os dados.' }
    }
}

// ── 2. PERMISSÕES E EXCLUSÕES ─────────────────────────────────────────────────

export async function atualizarFuncionarioCompleto(
    id: string, dadosRaw: Partial<DadosEditarFuncionario>
): Promise<ActionResult> {
    const erroAuth = await checarPermissaoAdmin()
    if (erroAuth) return { sucesso: false, erro: erroAuth }

    const validacao = SchemaEdicaoFuncionario.safeParse(dadosRaw)
    if (!validacao.success) return { sucesso: false, erro: 'Dados inválidos.' }

    try {
        await prisma.funcionario.update({ where: { id }, data: validacao.data })
        revalidatePath('/admin/dashboard')
        return { sucesso: true }
    } catch (error) {
        console.error(`[Admin] Erro ao atualizar permissões do funcionário ${id}:`, error)
        return { sucesso: false, erro: 'Falha ao atualizar permissões.' }
    }
}

export async function inativarFuncionario(id: string): Promise<ActionResult> {
    const erroAuth = await checarPermissaoAdmin()
    if (erroAuth) return { sucesso: false, erro: erroAuth }

    try {
        await prisma.funcionario.update({ where: { id }, data: { ativo: false } })
        return { sucesso: true }
    } catch (error) {
        console.error(`[Admin] Erro ao inativar funcionário ${id}:`, error)
        return { sucesso: false, erro: 'Falha ao inativar funcionário.' }
    }
}

export async function excluirFuncionarioPermanente(id: string): Promise<ActionResult> {
    const erroAuth = await checarPermissaoAdmin()
    if (erroAuth) return { sucesso: false, erro: erroAuth }

    try {
        const temAgendamentos = await prisma.agendamento.findFirst({ where: { funcionarioId: id } })
        if (temAgendamentos) return { sucesso: false, erro: 'Possui agendamentos no histórico. Utilize a inativação para manter a integridade relacional.' }

        await prisma.funcionario.delete({ where: { id } })
        revalidatePath('/admin/dashboard')
        return { sucesso: true }
    } catch (error) {
        console.error(`[Admin] Erro ao excluir funcionário ${id} permanentemente:`, error)
        return { sucesso: false, erro: 'Falha técnica ao excluir o funcionário.' }
    }
}

export async function excluirClientePermanente(id: string): Promise<ActionResult> {
    const erroAuth = await checarPermissaoAdmin()
    if (erroAuth) return { sucesso: false, erro: erroAuth }

    try {
        const temAgendamentos = await prisma.agendamento.findFirst({ where: { clienteId: id } })
        if (temAgendamentos) return { sucesso: false, erro: 'O cliente possui histórico financeiro. Utilize a anonimização (LGPD) ou inative-o.' }

        await prisma.cliente.delete({ where: { id } })
        revalidatePath('/admin/clientes')
        return { sucesso: true }
    } catch (error) {
        console.error(`[Admin] Erro ao excluir cliente ${id} permanentemente:`, error)
        return { sucesso: false, erro: 'Falha ao excluir o cliente permanentemente.' }
    }
}

export async function anonimizarClienteLGPD(clienteId: string): Promise<ActionResult<{ mensagem: string }>> {
    const erroAuth = await checarPermissaoAdmin()
    if (erroAuth) return { sucesso: false, erro: erroAuth }

    try {
        const hashNome = `Anonimizado_${randomUUID().substring(0, 8)}`
        const hashTelefone = `0000_${randomUUID().substring(0, 8)}`

        await prisma.cliente.update({
            where: { id: clienteId },
            data: { nome: hashNome, telefone: hashTelefone, email: null, cpf: null, anonimizado: true },
        })

        return {
            sucesso: true,
            data: { mensagem: 'Cliente anonimizado com sucesso.' }
        }
    } catch (error) {
        console.error(`[Admin] Erro ao anonimizar cliente ${clienteId} (LGPD):`, error)
        return { sucesso: false, erro: 'Falha técnica ao processar a anonimização.' }
    }
}

// ── 3. LISTAGEM DE EQUIPA E ESCALAS ───────────────────────────────────────────

export async function listarEquipaAdmin(): Promise<ActionResult<{ equipa: ProfissionalResumo[] }>> {
    const erroAuth = await checarPermissaoAdmin()
    if (erroAuth) return { sucesso: false, erro: erroAuth }

    try {
        const equipa = await prisma.funcionario.findMany({
            where: { role: 'PROFISSIONAL' },
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
                comissao: Number(prof.comissao),
                expedientes
            }
        })

        return {
            sucesso: true,
            data: { equipa: equipaNormalizada }
        }
    } catch (error) {
        console.error('[Admin] Erro ao listar equipa:', error)
        return { sucesso: false, erro: 'Falha ao carregar a equipa.' }
    }
}

export async function salvarEscalaFuncionarioAdmin(
    funcionarioId: string, expedientes: ExpedienteInfo[]
): Promise<ActionResult> {
    const erroAuth = await checarPermissaoAdmin()
    if (erroAuth) return { sucesso: false, erro: erroAuth }

    try {
        await prisma.$transaction(async (tx) => {
            for (const exp of expedientes) {
                await tx.expediente.upsert({
                    where: { funcionarioId_diaSemana: { funcionarioId, diaSemana: exp.diaSemana } },
                    update: { horaInicio: exp.horaInicio, horaFim: exp.horaFim, ativo: exp.ativo },
                    create: { funcionarioId, diaSemana: exp.diaSemana, horaInicio: exp.horaInicio, horaFim: exp.horaFim, ativo: exp.ativo }
                })
            }
        })
        revalidatePath('/admin/dashboard')
        return { sucesso: true }
    } catch (error) {
        console.error(`[Admin] Erro ao salvar a escala do funcionário ${funcionarioId}:`, error)
        return { sucesso: false, erro: 'Erro técnico ao salvar a escala.' }
    }
}

// ── 4. SISTEMA DE NOTIFICAÇÕES ────────────────────────────────────────────────

export async function listarNotificacoesAdmin(): Promise<ActionResult<{ notificacoes: NotificacaoItem[] }>> {
    const erroAuth = await checarPermissaoAdmin()
    if (erroAuth) return { sucesso: false, erro: erroAuth }

    try {
        const notificacoes = await prisma.notificacao.findMany({
            where: { lida: false },
            orderBy: { criadoEm: 'desc' },
            select: { id: true, mensagem: true, lida: true, criadoEm: true }
        })
        return {
            sucesso: true,
            data: { notificacoes }
        }
    } catch (error) {
        console.error('[Admin] Erro ao carregar notificações:', error)
        return { sucesso: false, erro: 'Erro ao carregar notificações.' }
    }
}

export async function marcarNotificacaoLida(id: string): Promise<ActionResult> {
    const erroAuth = await checarPermissaoAdmin()
    if (erroAuth) return { sucesso: false, erro: erroAuth }

    try {
        await prisma.notificacao.update({ where: { id }, data: { lida: true } })
        return { sucesso: true }
    } catch (error) {
        console.error(`[Admin] Erro ao marcar notificação ${id} como lida:`, error)
        return { sucesso: false, erro: 'Erro ao limpar alerta.' }
    }
}