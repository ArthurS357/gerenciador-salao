"use server"

import { prisma } from "@/lib/prisma";
import { Prisma } from '@prisma/client';
import { startOfDay, endOfDay } from 'date-fns';
import { verificarSessaoFuncionario } from "@/app/actions/auth";
import type { ActionResult } from '@/types/domain';

// ── TIPOS EXPORTADOS ──────────────────────────────────────────────────────────

export type TipoEvento = 'AUDITLOG' | 'AGENDAMENTO_CRIADO' | 'COMANDA_FINALIZADA' | 'ESTORNO'

export type EventoAuditoria = {
    id: string
    tipo: TipoEvento
    acao: string
    entidade: string
    entidadeId: string
    responsavel: string
    timestamp: Date
    detalhes: string | null
}

/**
 * Busca o histórico global de auditoria para o painel de administração geral.
 * Permite filtrar por entidade (ex: COMANDA) e intervalo de datas.
 */
export async function buscarAuditoriaGlobal(filtros: {
    entidade?: string;
    dataInicio?: Date;
    dataFim?: Date;
}) {
    try {
        const sessao = await verificarSessaoFuncionario()
        if (!sessao.logado || (sessao.role !== 'ADMIN' && sessao.role !== 'RECEPCIONISTA')) {
            return { sucesso: false, erro: 'Acesso negado.' }
        }

        const whereClause: Prisma.AuditLogWhereInput = {};

        // Aplica filtro de entidade se fornecido
        if (filtros.entidade) {
            whereClause.entidade = filtros.entidade;
        }

        // Filtro de datas seguro e tipado usando 'timestamp'
        if (filtros.dataInicio || filtros.dataFim) {
            whereClause.timestamp = {
                ...(filtros.dataInicio && { gte: filtros.dataInicio }),
                ...(filtros.dataFim && { lte: filtros.dataFim })
            };
        }

        const logs = await prisma.auditLog.findMany({
            where: whereClause,
            orderBy: { timestamp: 'desc' },
            take: 100,
        });

        return { sucesso: true, logs };
    } catch (error) {
        console.error("Erro ao buscar auditoria global:", error);
        return { sucesso: false, erro: "Falha ao carregar logs globais." };
    }
}

/**
 * Agrega todos os eventos relevantes do dia corrente em uma timeline unificada.
 * Combina AuditLog registrados + agendamentos criados + comandas finalizadas.
 * Requer sessão de funcionário (ADMIN ou RECEPCIONISTA).
 */
export async function buscarEventosDoDia(
    data?: Date
): Promise<ActionResult<{ eventos: EventoAuditoria[] }>> {
    try {
        const sessao = await verificarSessaoFuncionario()
        if (!sessao.logado || (sessao.role !== 'ADMIN' && sessao.role !== 'RECEPCIONISTA')) {
            return { sucesso: false, erro: 'Acesso negado. Restrito à gestão.' }
        }

        const diaAlvo = data ?? new Date()
        const inicio = startOfDay(diaAlvo)
        const fim = endOfDay(diaAlvo)

        // ── 1. AuditLog do dia ─────────────────────────────────────────────────
        const [auditLogs, agendamentosHoje, funcionarios] = await Promise.all([
            prisma.auditLog.findMany({
                where: { timestamp: { gte: inicio, lte: fim } },
                orderBy: { timestamp: 'desc' },
                take: 200,
            }),
            prisma.agendamento.findMany({
                where: { dataHoraInicio: { gte: inicio, lte: fim } },
                select: {
                    id: true,
                    dataHoraInicio: true,
                    concluido: true,
                    canceladoEm: true,
                    valorBruto: true,
                    funcionarioId: true,
                    cliente: { select: { nome: true } },
                    funcionario: { select: { nome: true } },
                },
                orderBy: { dataHoraInicio: 'desc' },
                take: 200,
            }),
            prisma.funcionario.findMany({
                where: { ativo: true },
                select: { id: true, nome: true },
            }),
        ])

        const mapaFuncionarios = new Map(funcionarios.map(f => [f.id, f.nome]))

        // ── 2. Eventos do AuditLog ─────────────────────────────────────────────
        const eventosAudit: EventoAuditoria[] = auditLogs.map(log => ({
            id: log.id,
            tipo: 'AUDITLOG' as TipoEvento,
            acao: log.acao.replace(/_/g, ' '),
            entidade: log.entidade,
            entidadeId: log.entidadeId,
            responsavel: mapaFuncionarios.get(log.usuarioId) ?? `ID: ${log.usuarioId.slice(0, 8)}`,
            timestamp: log.timestamp,
            detalhes: log.detalhes,
        }))

        // ── 3. Eventos sintéticos de Agendamento do dia ────────────────────────
        const eventosAgendamento: EventoAuditoria[] = agendamentosHoje.map(ag => {
            let tipo: TipoEvento
            let acao: string

            if (ag.canceladoEm) {
                tipo = 'ESTORNO'
                acao = `Agendamento cancelado — ${ag.cliente?.nome ?? 'Cliente'}`
            } else if (ag.concluido) {
                tipo = 'COMANDA_FINALIZADA'
                acao = `Comanda finalizada — ${ag.cliente?.nome ?? 'Cliente'} (R$ ${ag.valorBruto.toFixed(2)})`
            } else {
                tipo = 'AGENDAMENTO_CRIADO'
                acao = `Agendamento criado — ${ag.cliente?.nome ?? 'Cliente'}`
            }

            return {
                id: `ag-${ag.id}`,
                tipo,
                acao,
                entidade: 'AGENDAMENTO',
                entidadeId: ag.id,
                responsavel: ag.funcionario?.nome ?? mapaFuncionarios.get(ag.funcionarioId) ?? '—',
                timestamp: ag.dataHoraInicio,
                detalhes: null,
            }
        })

        // ── 4. Merge e ordenação cronológica decrescente ───────────────────────
        const todos = [...eventosAudit, ...eventosAgendamento]
            .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())

        return { sucesso: true, data: { eventos: todos } }
    } catch (error) {
        console.error('[Auditoria] Erro ao buscar eventos do dia:', error)
        return { sucesso: false, erro: 'Falha ao carregar eventos do dia.' }
    }
}

/**
 * Busca o histórico de auditoria de uma entidade específica (como uma comanda).
 * Usado para exibir a linha do tempo no painel do profissional/admin.
 */
export async function buscarHistoricoComanda(comandaId: string) {
    try {
        const sessao = await verificarSessaoFuncionario()
        if (!sessao.logado || (sessao.role !== 'ADMIN' && sessao.role !== 'RECEPCIONISTA')) {
            return { sucesso: false, erro: 'Acesso negado.' }
        }

        const logs = await prisma.auditLog.findMany({
            where: {
                entidade: 'COMANDA',
                entidadeId: comandaId
            },
            orderBy: {
                timestamp: 'desc'
            }
        });

        return { sucesso: true, logs };
    } catch (error) {
        console.error("Erro ao buscar histórico de auditoria da comanda:", error);
        return { sucesso: false, erro: "Falha ao carregar o histórico." };
    }
}