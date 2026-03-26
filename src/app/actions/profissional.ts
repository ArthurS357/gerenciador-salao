'use server'

import { prisma } from '@/lib/prisma'
import { cookies } from 'next/headers'
import { jwtVerify } from 'jose'
import { hash } from 'bcrypt'
import type { AgendamentoProfissional } from '@/types/domain'

const JWT_SECRET = new TextEncoder().encode(
    process.env.JWT_SECRET ?? 'chave_secreta_desenvolvimento'
)

// ── CORREÇÃO: Definição do ActionResult adicionada aqui ──
type ActionResult<T = object> =
    | ({ sucesso: true } & T)
    | { sucesso: false; erro: string }

type ProfissionalInfo = {
    nome: string
    podeVerComissao: boolean
    taxaComissao: number
    comissaoMensal: number
}

type PainelResult =
    | {
        sucesso: true
        profissional: ProfissionalInfo
        agendamentosHoje: AgendamentoProfissional[]
    }
    | { sucesso: false; erro: string }

// Novo tipo para definir a estrutura do expediente retornado
type ExpedientePayload = {
    diaSemana: number
    horaInicio: string
    horaFim: string
    ativo: boolean
    id?: string
    funcionarioId?: string
}

export async function obterDadosPainelProfissional(): Promise<PainelResult> {
    try {
        const cookieStore = await cookies()
        const token = cookieStore.get('funcionario_session')?.value

        if (!token) return { sucesso: false, erro: 'Não autenticado.' }

        const { payload } = await jwtVerify(token, JWT_SECRET)
        const funcionarioId = payload.sub

        if (!funcionarioId) return { sucesso: false, erro: 'Token inválido.' }

        const funcionario = await prisma.funcionario.findUnique({
            where: { id: funcionarioId },
        })

        if (!funcionario) return { sucesso: false, erro: 'Profissional não encontrado.' }

        const agora = new Date()
        const inicioDoDia = new Date(agora.getFullYear(), agora.getMonth(), agora.getDate(), 0, 0, 0)
        const fimDoDia = new Date(agora.getFullYear(), agora.getMonth(), agora.getDate(), 23, 59, 59)

        const agendamentosHoje = await prisma.agendamento.findMany({
            where: {
                funcionarioId,
                dataHoraInicio: { gte: inicioDoDia, lte: fimDoDia },
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
            const inicioDoMes = new Date(agora.getFullYear(), agora.getMonth(), 1)

            const agendamentosMes = await prisma.agendamento.findMany({
                where: {
                    funcionarioId,
                    concluido: true,
                    dataHoraInicio: { gte: inicioDoMes },
                },
                include: { servicos: true },
            })

            for (const ag of agendamentosMes) {
                const valorServicos = ag.servicos.reduce((acc, s) => acc + (s.precoCobrado ?? 0), 0)
                comissaoMensal += valorServicos * (funcionario.comissao / 100)
            }
        }

        return {
            sucesso: true,
            profissional: {
                nome: funcionario.nome,
                podeVerComissao: funcionario.podeVerComissao,
                taxaComissao: funcionario.comissao,
                comissaoMensal,
            },
            agendamentosHoje: agendamentosHoje as unknown as AgendamentoProfissional[],
        }
    } catch (error) {
        console.error('Erro ao carregar painel do profissional:', error)
        return { sucesso: false, erro: 'Falha técnica ao carregar o seu painel.' }
    }
}

// Correção: Substituído 'any[]' pelo tipo definido 'ExpedientePayload[]'
export async function obterPerfilEExpediente(): Promise<ActionResult<{ fotoUrl: string | null, expedientes: ExpedientePayload[] }>> {
    try {
        const cookieStore = await cookies()
        const token = cookieStore.get('funcionario_session')?.value
        if (!token) return { sucesso: false, erro: 'Não autenticado.' }

        const { payload } = await jwtVerify(token, JWT_SECRET)
        const funcionarioId = payload.sub as string

        const funcionario = await prisma.funcionario.findUnique({
            where: { id: funcionarioId },
            include: {
                expedientes: {
                    orderBy: { diaSemana: 'asc' }
                }
            }
        })

        if (!funcionario) return { sucesso: false, erro: 'Profissional não encontrado.' }

        // Correção: Variável tipada explicitamente para evitar 'any' implícito e permitir atribuição posterior
        let expedientes: ExpedientePayload[] = funcionario.expedientes;

        if (expedientes.length === 0) {
            const diasPadrao = Array.from({ length: 7 }).map((_, index) => ({
                diaSemana: index,
                horaInicio: '09:00',
                horaFim: '18:00',
                ativo: false
            }));
            // Correção: Removido 'as any', pois 'diasPadrao' é compatível com 'ExpedientePayload[]'
            expedientes = diasPadrao;
        }

        return {
            sucesso: true,
            fotoUrl: funcionario.fotoUrl,
            expedientes
        }
    } catch {
        // Correção: Removido parâmetro 'error' não utilizado
        return { sucesso: false, erro: 'Erro ao carregar perfil.' }
    }
}

export async function salvarPerfilEExpediente(
    fotoUrl: string | null,
    expedientes: Array<{ diaSemana: number, horaInicio: string, horaFim: string, ativo: boolean }>
): Promise<ActionResult> {
    try {
        const cookieStore = await cookies()
        const token = cookieStore.get('funcionario_session')?.value
        if (!token) return { sucesso: false, erro: 'Não autenticado.' }

        const { payload } = await jwtVerify(token, JWT_SECRET)
        const funcionarioId = payload.sub as string

        // 1. Atualiza a foto do perfil
        if (fotoUrl !== undefined) {
            await prisma.funcionario.update({
                where: { id: funcionarioId },
                data: { fotoUrl }
            })
        }

        // 2. Atualiza ou cria o expediente usando uma transação para segurança
        const transacoes = expedientes.map(exp => {
            return prisma.expediente.upsert({
                where: {
                    funcionarioId_diaSemana: {
                        funcionarioId: funcionarioId,
                        diaSemana: exp.diaSemana
                    }
                },
                update: {
                    horaInicio: exp.horaInicio,
                    horaFim: exp.horaFim,
                    ativo: exp.ativo
                },
                create: {
                    funcionarioId: funcionarioId,
                    diaSemana: exp.diaSemana,
                    horaInicio: exp.horaInicio,
                    horaFim: exp.horaFim,
                    ativo: exp.ativo
                }
            })
        })

        await prisma.$transaction(transacoes)

        return { sucesso: true }
    } catch (error) {
        console.error('Erro ao salvar perfil:', error)
        return { sucesso: false, erro: 'Erro ao salvar o horário de trabalho.' }
    }
}

export async function alterarSenhaProfissional(novaSenha: string): Promise<ActionResult> {
    try {
        const cookieStore = await cookies()
        const token = cookieStore.get('funcionario_session')?.value
        if (!token) return { sucesso: false, erro: 'Não autenticado.' }

        const { payload } = await jwtVerify(token, JWT_SECRET)
        const funcionarioId = payload.sub as string

        const senhaHasheada = await hash(novaSenha, 12)

        await prisma.funcionario.update({
            where: { id: funcionarioId },
            data: { senhaHash: senhaHasheada }
        })

        return { sucesso: true }
    } catch (error) {
        console.error('Erro ao alterar senha:', error)
        return { sucesso: false, erro: 'Falha ao comunicar com o servidor.' }
    }
}