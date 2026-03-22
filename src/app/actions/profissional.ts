'use server'

import { prisma } from '@/lib/prisma'
import { cookies } from 'next/headers'
import { jwtVerify } from 'jose'
import type { AgendamentoProfissional } from '@/types/domain'

const JWT_SECRET = new TextEncoder().encode(
    process.env.JWT_SECRET ?? 'chave_secreta_desenvolvimento'
)

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