/**
 * rateLimit.ts — Rate Limiting via Banco de Dados (Prisma)
 *
 * Ideal para Serverless (Vercel) com custo zero.
 * Garante que o estado seja compartilhado entre todas as instâncias das Serverless Functions.
 *
 * NOTA SÊNIOR: Esta versão utiliza `upsert` para evitar Race Conditions (erros P2002) 
 * causados por requisições simultâneas disparadas no mesmo milissegundo.
 */

import { prisma } from '@/lib/prisma'

const JANELA_MS = 60_000      // 1 minuto de janela
const MAX_REQ = 5             // Limite de 5 tentativas por janela
const BLOQUEIO_MS = 30_000    // 30 segundos de penalidade (castigo)

export async function verificarRateLimit(identificador: string): Promise<boolean> {
    if (!identificador) return false;

    const agora = new Date();

    try {
        // 1. Upsert atômico
        // Garante que o registro exista para este identificador.
        // Se 10 requisições entrarem no mesmo milissegundo, o banco de dados
        // enfileira as operações atômicas sem quebrar a API com erro de Unique Constraint.
        const row = await prisma.rateLimit.upsert({
            where: { identificador },
            create: { identificador, count: 0, windowStart: agora },
            update: {} // Apenas recupera o registro caso ele já exista
        });

        // 2. Verifica se o usuário já está no período de castigo
        if (row.blockedUntil && agora < row.blockedUntil) {
            return false; // Bloqueado, rejeita a requisição imediatamente
        }

        // 3. Avalia se a janela de 1 minuto já expirou
        const tempoDecorrido = agora.getTime() - row.windowStart.getTime();
        const deveResetar = tempoDecorrido > JANELA_MS;

        // 4. Atualização atômica do contador
        // Usamos { increment: 1 } no banco para evitar ler valores defasados da memória (bypassing)
        const updatedRow = await prisma.rateLimit.update({
            where: { identificador },
            data: deveResetar
                ? { count: 1, windowStart: agora, blockedUntil: null } // Reseta a janela
                : { count: { increment: 1 } } // Incrementa o contador atrelado à janela atual
        });

        // 5. Abuso detectado: Aplica a penalidade se o limite estourou
        if (updatedRow.count > MAX_REQ) {
            await prisma.rateLimit.update({
                where: { identificador },
                data: { blockedUntil: new Date(agora.getTime() + BLOQUEIO_MS) }
            });
            console.warn(`[RateLimit] Abuso detectado. Identificador bloqueado no banco: ${identificador.substring(0, 8)}...`);

            return false; // Bloqueia a requisição atual
        }

        // Se chegou até aqui, o limite não foi excedido
        return true;

    } catch (error) {
        console.error('[RateLimit Error] Falha de Banco de Dados:', error);

        // Fail-Open: Se o banco relacional estiver com gargalos (ex: pool de conexões lotado na Vercel),
        // permitimos a requisição para não prejudicar usuários legítimos por instabilidade da infraestrutura.
        return true;
    }
}