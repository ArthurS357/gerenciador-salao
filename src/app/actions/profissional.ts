'use server'

import { prisma } from '@/lib/prisma'
import { hash } from 'bcrypt'
import { formatInTimeZone } from 'date-fns-tz'
import { verificarSessaoFuncionario } from '@/app/actions/auth'
import { Prisma } from '@prisma/client'
import { ActionResult } from '@/types/domain'
import { schemaExpediente, schemaAlterarSenha } from '@/lib/schemas'
import { z } from 'zod'

const TZ = 'America/Sao_Paulo'

// ── Tipagem Estrita ──────────────────────────────────────────────────────────

type ProfissionalInfo = {
    nome: string
    podeVerComissao: boolean
    taxaComissao: number
    comissaoMensal: number
}

// Extrai o tipo exato do agendamento com as relações incluídas
export type AgendamentoComRelações = Prisma.AgendamentoGetPayload<{
    include: {
        cliente: { select: { nome: true, telefone: true } },
        servicos: {
            include: { servico: { select: { id: true, nome: true, preco: true } } }
        }
    }
}>

export type ExpedientePayload = {
    diaSemana: number
    horaInicio: string
    horaFim: string
    ativo: boolean
    id?: string
    funcionarioId?: string
}

// ── Schemas de Validação de Array ─────────────────────────────────────────────
const SchemaLoteExpediente = z.array(schemaExpediente)

// ── 1. Painel Principal ───────────────────────────────────────────────────────
export async function obterDadosPainelProfissional(): Promise<ActionResult<{
    profissional: ProfissionalInfo
    agendamentosHoje: AgendamentoComRelações[]
}>> {
    try {
        const sessao = await verificarSessaoFuncionario()
        if (!sessao.logado) return { sucesso: false, erro: 'Sessão expirada.' }

        const funcionario = await prisma.funcionario.findUnique({
            where: { id: sessao.id },
            select: { nome: true, podeVerComissao: true, comissao: true }
        })

        if (!funcionario) return { sucesso: false, erro: 'Profissional não encontrado.' }

        const agora = new Date()
        const inicioDia = new Date(formatInTimeZone(agora, TZ, "yyyy-MM-dd'T'00:00:00xxx"))
        const fimDia = new Date(formatInTimeZone(agora, TZ, "yyyy-MM-dd'T'23:59:59xxx"))

        const agendamentosHoje = await prisma.agendamento.findMany({
            where: {
                funcionarioId: sessao.id,
                dataHoraInicio: { gte: inicioDia, lte: fimDia },
                canceladoEm: null,
            },
            orderBy: { dataHoraInicio: 'asc' },
            include: {
                cliente: { select: { nome: true, telefone: true } },
                servicos: {
                    include: { servico: { select: { id: true, nome: true, preco: true } } },
                },
            },
        })

        let comissaoMensal = 0
        if (funcionario.podeVerComissao) {
            const inicioMes = new Date(formatInTimeZone(agora, TZ, "yyyy-MM-01'T'00:00:00xxx"))

            // Delegação matemática de agregação para o banco de dados (Alta Performance)
            const agregacao = await prisma.agendamento.aggregate({
                where: {
                    funcionarioId: sessao.id,
                    concluido: true,
                    dataHoraInicio: { gte: inicioMes },
                },
                _sum: { valorComissao: true }
            })
            comissaoMensal = agregacao._sum.valorComissao ?? 0
        }

        return {
            sucesso: true,
            profissional: {
                nome: funcionario.nome,
                podeVerComissao: funcionario.podeVerComissao,
                taxaComissao: funcionario.comissao,
                comissaoMensal,
            },
            agendamentosHoje // Tipagem garantida pelo Prisma, sem 'as unknown'
        }
    } catch (error) {
        console.error('Erro ao carregar painel do profissional:', error)
        return { sucesso: false, erro: 'Falha técnica ao carregar dados.' }
    }
}

// ── 2. Perfil e Expediente ────────────────────────────────────────────────────
export async function obterPerfilEExpediente(): Promise<ActionResult<{
    fotoUrl: string | null
    expedientes: ExpedientePayload[]
}>> {
    try {
        const sessao = await verificarSessaoFuncionario()
        if (!sessao.logado) return { sucesso: false, erro: 'Não autenticado.' }

        const funcionario = await prisma.funcionario.findUnique({
            where: { id: sessao.id },
            select: {
                fotoUrl: true,
                expedientes: {
                    select: { diaSemana: true, horaInicio: true, horaFim: true, ativo: true },
                    orderBy: { diaSemana: 'asc' }
                }
            }
        })

        if (!funcionario) return { sucesso: false, erro: 'Profissional não encontrado.' }

        let expedientes: ExpedientePayload[] = funcionario.expedientes

        if (expedientes.length === 0) {
            expedientes = Array.from({ length: 7 }).map((_, index) => ({
                diaSemana: index,
                horaInicio: '09:00',
                horaFim: '18:00',
                ativo: false,
            }))
        }

        return { sucesso: true, fotoUrl: funcionario.fotoUrl, expedientes }
    } catch {
        return { sucesso: false, erro: 'Erro técnico ao carregar perfil.' }
    }
}

// ── 3. Persistência ───────────────────────────────────────────────────────────
export async function salvarPerfilEExpediente(
    fotoUrl: string | null,
    expedientesRaw: Array<{ diaSemana: number; horaInicio: string; horaFim: string; ativo: boolean }>
): Promise<ActionResult> {
    try {
        const sessao = await verificarSessaoFuncionario()
        if (!sessao.logado) return { sucesso: false, erro: 'Não autorizado.' }

        // Validação estrita em lote do Array (substitui o loop manual e deixa mais legível)
        const validacao = SchemaLoteExpediente.safeParse(expedientesRaw)
        if (!validacao.success) {
            return { sucesso: false, erro: 'Dados de expediente em formato inválido.' }
        }

        const expedientes = validacao.data

        // Transação interativa sequencial (segura para o pool de conexões do Prisma)
        await prisma.$transaction(async (tx) => {
            if (fotoUrl !== undefined) {
                await tx.funcionario.update({
                    where: { id: sessao.id },
                    data: { fotoUrl }
                })
            }

            // Uso do for..of obriga o Node a aguardar cada query antes da próxima, 
            // evitando Deadlocks e exaustão do Pool no caso de 7 upserts disparados ao mesmo tempo.
            for (const exp of expedientes) {
                await tx.expediente.upsert({
                    where: { funcionarioId_diaSemana: { funcionarioId: sessao.id, diaSemana: exp.diaSemana } },
                    update: { horaInicio: exp.horaInicio, horaFim: exp.horaFim, ativo: exp.ativo },
                    create: {
                        funcionarioId: sessao.id,
                        diaSemana: exp.diaSemana,
                        horaInicio: exp.horaInicio,
                        horaFim: exp.horaFim,
                        ativo: exp.ativo
                    }
                })
            }
        })

        return { sucesso: true }
    } catch (error) {
        console.error('Erro ao salvar perfil e escala:', error)
        return { sucesso: false, erro: 'Falha técnica ao salvar o horário de trabalho.' }
    }
}

// ── 4. Alteração de Senha ─────────────────────────────────────────────────────
export async function alterarSenhaProfissional(novaSenha: string): Promise<ActionResult> {
    try {
        const sessao = await verificarSessaoFuncionario()
        if (!sessao.logado) return { sucesso: false, erro: 'Acesso negado.' }

        // Validação via Zod garantindo comprimento mínimo ou formato estrito
        const v = schemaAlterarSenha.safeParse({ novaSenha })
        if (!v.success) return { sucesso: false, erro: v.error.issues[0]?.message ?? 'Senha inválida.' }

        const senhaHash = await hash(v.data.novaSenha, 12)
        await prisma.funcionario.update({
            where: { id: sessao.id },
            data: { senhaHash }
        })

        return { sucesso: true }
    } catch (error) {
        console.error('Erro ao alterar senha do profissional:', error)
        return { sucesso: false, erro: 'Falha ao comunicar com o banco de dados.' }
    }
}