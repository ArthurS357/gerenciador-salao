'use server'

import { prisma } from '@/lib/prisma'
import { verificarSessaoCliente, verificarSessaoFuncionario } from '@/app/actions/auth'
import { ActionResult } from '@/types/domain'
import { schemaAvaliacao } from '@/lib/schemas'

// ── 1. Criar Avaliação (NPS do Cliente) ──────────────────────────────────────
/**
 * Apenas o próprio cliente autenticado pode avaliar o seu agendamento.
 * Evita IDOR: verifica que o agendamentoId pertence à sessão ativa antes de gravar.
 */
export async function criarAvaliacao(
    agendamentoId: string,
    nota: number,
    comentario?: string
): Promise<ActionResult> {
    try {
        // ── Blindagem: Apenas clientes autenticados podem avaliar ────────────
        const sessao = await verificarSessaoCliente()
        if (!sessao.logado) {
            return { sucesso: false, erro: 'Faça login para avaliar seu atendimento.' }
        }

        // ── Validação da nota: via Zod ───────────────────────────────────────
        const validacao = schemaAvaliacao.safeParse({ agendamentoId, nota, comentario })
        if (!validacao.success) {
            return { sucesso: false, erro: validacao.error.issues[0]?.message ?? 'Dados de avaliação inválidos.' }
        }

        // ── Anti-IDOR: confirma que o agendamento pertence a este cliente ────
        // Sem essa verificação, qualquer cliente logado poderia avaliar o
        // agendamento de outro cliente apenas passando outro agendamentoId.
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

        // ── Idempotência: impede avaliação dupla ─────────────────────────────
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
        console.error('Erro ao salvar avaliação:', error)
        return { sucesso: false, erro: 'Falha técnica ao tentar salvar a avaliação.' }
    }
}

// ── 2. Listar Avaliações (Painel Admin) ──────────────────────────────────────

// Tipo exportado apenas para uso no front-end admin — não é uma Server Action
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
        // ── Blindagem RBAC: apenas ADMIN pode ler avaliações no painel ───────
        const sessao = await verificarSessaoFuncionario()
        if (!sessao.logado || sessao.role !== 'ADMIN') {
            return { sucesso: false, erro: 'Acesso negado. Área restrita à administração.' }
        }

        const avaliacoes = await prisma.avaliacao.findMany({
            orderBy: { criadoEm: 'desc' },
            // Usando select explícito em vez de include para bater com
            // AvaliacaoAdminItem e eliminar o cast "as AvaliacaoAdminItem[]"
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
        })

        const somaNotas = avaliacoes.reduce((acc, av) => acc + av.nota, 0)
        const mediaGeral = avaliacoes.length > 0
            ? Math.round((somaNotas / avaliacoes.length) * 10) / 10 // 1 casa decimal
            : 0

        return { sucesso: true, avaliacoes, mediaGeral }
    } catch (error) {
        console.error('Erro ao listar avaliações:', error)
        return { sucesso: false, erro: 'Falha ao carregar as avaliações.' }
    }
}