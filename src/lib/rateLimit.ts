/**
 * rateLimit.ts — Rate Limiting via Banco de Dados (Prisma)
 *
 * Ideal para Serverless (Vercel) com custo zero.
 * Garante que o estado seja compartilhado entre todas as instâncias das Serverless Functions.
 */

import { prisma } from '@/lib/prisma'

const JANELA_MS = 60_000      // 1 minuto de janela
const MAX_REQ = 5             // Limite de 5 tentativas por janela
const BLOQUEIO_MS = 30_000    // 30 segundos de penalidade (castigo)

export async function verificarRateLimit(identificador: string): Promise<boolean> {
    if (!identificador) return false;

    const agora = new Date();

    try {
        const registro = await prisma.rateLimit.findUnique({
            where: { identificador }
        });

        // 1. Primeira vez do usuário, cria o registro e libera.
        if (!registro) {
            await prisma.rateLimit.create({
                data: {
                    identificador,
                    count: 1,
                    windowStart: agora,
                }
            });
            return true;
        }

        // 2. Verifica se o usuário está no período de castigo.
        if (registro.blockedUntil && agora < registro.blockedUntil) {
            return false;
        }

        // 3. Verifica se a janela de 1 minuto já expirou (Reseta o contador).
        if (agora.getTime() - registro.windowStart.getTime() > JANELA_MS) {
            await prisma.rateLimit.update({
                where: { identificador },
                data: {
                    count: 1,
                    windowStart: agora,
                    blockedUntil: null,
                }
            });
            return true;
        }

        // 4. Se a janela não expirou, incrementa a requisição.
        const novaContagem = registro.count + 1;

        if (novaContagem > MAX_REQ) {
            // Abuso detectado: Aplica o bloqueio.
            await prisma.rateLimit.update({
                where: { identificador },
                data: {
                    count: novaContagem,
                    blockedUntil: new Date(agora.getTime() + BLOQUEIO_MS)
                }
            });
            console.warn(`[RateLimit] Abuso detectado. Identificador bloqueado no banco: ${identificador.substring(0, 8)}...`);
            return false;
        }

        // Atualiza apenas a contagem caso não tenha passado o limite.
        await prisma.rateLimit.update({
            where: { identificador },
            data: { count: novaContagem }
        });

        return true;

    } catch (error) {
        console.error('[RateLimit Error] Falha ao conectar no Prisma:', error);
        // Fail-Open: Se o banco falhar momentaneamente, permite a requisição
        // para não prejudicar um cliente legítimo por conta de instabilidade de infraestrutura.
        return true;
    }
}