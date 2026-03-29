'use server'

import { prisma } from '@/lib/prisma'
import { verificarSessaoCliente, verificarSessaoFuncionario } from '@/app/actions/auth'
import { ActionResult } from '@/types/domain'
import { schemaAvaliacao } from '@/lib/schemas'
import { Prisma } from '@prisma/client'

// ── 1. Criar Avaliação (NPS do Cliente) ──────────────────────────────────────
export async function criarAvaliacao(
    agendamentoId: string,
    nota: number,
    comentario?: string
): Promise<ActionResult> {
    try {
        // Blindagem: Apenas clientes autenticados podem avaliar
        const sessao = await verificarSessaoCliente()
        if (!sessao.logado) {
            return { sucesso: false, erro: 'Faça login para avaliar seu atendimento.' }
        }

        // Validação da nota: via Zod
        const validacao = schemaAvaliacao.safeParse({ agendamentoId, nota, comentario })
        if (!validacao.success) {
            return { sucesso: false, erro: validacao.error.issues[0]?.message ?? 'Dados de avaliação inválidos.' }
        }

        // Anti-IDOR: confirma que o agendamento pertence a este cliente e está concluído
        const agendamento = await prisma.agendamento.findUnique({
            where: { id: agendamentoId },
            select: { clienteId: true, concluido: true }
        })

        if (!agendamento) {
            return { sucesso: false, erro: 'Agendamento não encontrado.' }
        }
        if (agendamento.clienteId !== sessao.id) {
            return { sucesso: false, erro: 'Acesso negado. Este agendamento não pertence à sua conta.' }
        }
        if (!agendamento.concluido) {
            return { sucesso: false, erro: 'Só é possível avaliar atendimentos concluídos.' }
        }

        // Idempotência básica de leitura
        const existente = await prisma.avaliacao.findUnique({
            where: { agendamentoId }
        })
        if (existente) {
            return { sucesso: false, erro: 'Você já avaliou este atendimento. Obrigado!' }
        }

        await prisma.avaliacao.create({
            data: { agendamentoId, nota, comentario }
        })

        return { sucesso: true }
    } catch (error) {
        // Blindagem contra Race Condition (Double-Click): se duas requests tentarem criar, 
        // o banco de dados disparará o P2002 (Unique Constraint Violation)
        if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
            return { sucesso: false, erro: 'Você já avaliou este atendimento. Obrigado!' }
        }

        console.error('Erro ao salvar avaliação:', error)
        return { sucesso: false, erro: 'Falha técnica ao tentar salvar a avaliação.' }
    }
}

// ── 2. Listar Avaliações (Painel Admin) ──────────────────────────────────────

// Tipo exportado apenas para uso no front-end admin
export type AvaliacaoAdminItem = {
    id: string
    nota: number
    comentario: string | null
    criadoEm: Date
    agendamento: {
        cliente: { nome: string }
        funcionario: { nome: string }
        servicos: { servico: { nome: string } }[]
    }
}

export async function listarAvaliacoesAdmin(): Promise<ActionResult<{ avaliacoes: AvaliacaoAdminItem[], mediaGeral: number }>> {
    try {
        // Blindagem RBAC: apenas ADMIN pode ler avaliações no painel
        const sessao = await verificarSessaoFuncionario()
        if (!sessao.logado || sessao.role !== 'ADMIN') {
            return { sucesso: false, erro: 'Acesso negado. Área restrita à administração.' }
        }

        // Execução Paralela: Avaliações recentes e Média Geral calculada DIRETAMENTE no banco
        const [avaliacoes, agregacao] = await Promise.all([
            prisma.avaliacao.findMany({
                take: 100, // Limite de segurança contra Out Of Memory (OOM)
                orderBy: { criadoEm: 'desc' },
                select: {
                    id: true,
                    nota: true,
                    comentario: true,
                    criadoEm: true,
                    agendamento: {
                        select: {
                            cliente: { select: { nome: true } },
                            funcionario: { select: { nome: true } },
                            servicos: { select: { servico: { select: { nome: true } } } }
                        }
                    }
                }
            }),
            prisma.avaliacao.aggregate({
                _avg: { nota: true }
            })
        ])

        const mediaBruta = agregacao._avg.nota || 0
        const mediaGeral = Math.round(mediaBruta * 10) / 10 // Arredonda para 1 casa decimal

        return { sucesso: true, avaliacoes, mediaGeral }
    } catch (error) {
        console.error('Erro ao listar avaliações:', error)
        return { sucesso: false, erro: 'Falha ao carregar as avaliações.' }
    }
}