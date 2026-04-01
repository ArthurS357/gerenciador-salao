"use server"

import { prisma } from "@/lib/prisma";
import { Prisma } from '@prisma/client';
import { verificarSessaoFuncionario } from "@/app/actions/auth";

/**
 * Registra uma ação sensível no banco de dados para fins de auditoria.
 */
export async function registrarAcaoAuditoria(
    acao: string,
    entidade: string,
    entidadeId: string,
    detalhes?: string
) {
    try {
        // 2. Verificamos a sessão usando a sua função que já possui cache do React
        const sessao = await verificarSessaoFuncionario();

        // 3. Validamos se o funcionário está realmente logado
        if (!sessao.logado) {
            console.warn("Tentativa de auditoria sem usuário logado.");
            return { sucesso: false, erro: "Não autorizado" };
        }

        // 4. Registramos a ação usando o ID recuperado da sessão validada
        await prisma.auditLog.create({
            data: {
                usuarioId: sessao.id,
                acao,
                entidade,
                entidadeId,
                detalhes: detalhes || null,
            },
        });

        return { sucesso: true };
    } catch (error) {
        console.error("Erro ao registrar log de auditoria:", error);
        return { sucesso: false, erro: "Falha interna no log" };
    }
}

/**
 * Busca o histórico global de auditoria para o painel de administração geral.
 * Permite filtrar por entidade (ex: COMANDA) e intervalo de datas.
 */
export async function buscarAuditoriaGlobal(filtros: {
    entidade?: string; // Passo 2: Ajustado para bater com seu schema real
    dataInicio?: Date;
    dataFim?: Date;
}) {
    try {
        // Passo 3: Trocamos o 'any' pelo AuditLogWhereInput gerado pelo Prisma
        const whereClause: Prisma.AuditLogWhereInput = {};

        // Aplica filtro de entidade se fornecido
        if (filtros.entidade) {
            whereClause.entidade = filtros.entidade;
        }

        // Passo 4: Filtro de datas seguro e tipado usando 'timestamp'
        if (filtros.dataInicio || filtros.dataFim) {
            whereClause.timestamp = {
                ...(filtros.dataInicio && { gte: filtros.dataInicio }),
                ...(filtros.dataFim && { lte: filtros.dataFim })
            };
        }

        const logs = await prisma.auditLog.findMany({
            where: whereClause,
            orderBy: { timestamp: 'desc' }, // Passo 5: Ordena por 'timestamp'
            take: 100,
        });

        return { sucesso: true, logs };
    } catch (error) {
        console.error("Erro ao buscar auditoria global:", error);
        return { sucesso: false, erro: "Falha ao carregar logs globais." };
    }
}

/**
 * Busca o histórico de auditoria de uma entidade específica (como uma comanda).
 * Usado para exibir a linha do tempo no painel do profissional/admin.
 */
export async function buscarHistoricoComanda(comandaId: string) {
    try {
        const logs = await prisma.auditLog.findMany({
            where: {
                entidade: 'COMANDA', // Usa a nomenclatura do seu banco
                entidadeId: comandaId
            },
            orderBy: {
                timestamp: 'desc' // Mais recentes primeiro
            }
        });

        return { sucesso: true, logs };
    } catch (error) {
        console.error("Erro ao buscar histórico de auditoria da comanda:", error);
        return { sucesso: false, erro: "Falha ao carregar o histórico." };
    }
}