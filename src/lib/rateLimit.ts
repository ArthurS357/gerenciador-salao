/**
 * rateLimit.ts — Rate Limiting via Banco de Dados (Prisma)
 *
 * Ideal para Serverless (Vercel) com custo zero.
 * Garante que o estado seja compartilhado entre todas as instâncias das Serverless Functions.
 *
 * NOTA SÊNIOR: Para tráfego de altíssima escala, considere migrar este Rate Limit
 * para Redis (ex: Vercel KV ou Upstash) no futuro, poupando conexões do banco relacional.
 */

import { prisma } from '@/lib/prisma'

const JANELA_MS = 60_000      // 1 minuto de janela
const MAX_REQ = 5             // Limite de 5 tentativas por janela
const BLOQUEIO_MS = 30_000    // 30 segundos de penalidade (castigo)

export async function verificarRateLimit(identificador: string): Promise<boolean> {
    if (!identificador) return false;

    const agora = new Date();

    try {
        // Envolve as operações numa transação para reduzir a janela de Race Condition
        const registro = await prisma.$transaction(async (tx) => {
            const row = await tx.rateLimit.findUnique({
                where: { identificador }
            });

            // 1. Primeira vez do usuário, cria o registro e libera.
            if (!row) {
                return await tx.rateLimit.create({
                    data: { identificador, count: 1, windowStart: agora }
                });
            }

            // 2. Verifica se o usuário está no período de castigo.
            if (row.blockedUntil && agora < row.blockedUntil) {
                return row; // Permanece bloqueado, devolve a linha intacta
            }

            // 3. Verifica se a janela de 1 minuto já expirou (Reseta o contador).
            if (agora.getTime() - row.windowStart.getTime() > JANELA_MS) {
                return await tx.rateLimit.update({
                    where: { identificador },
                    data: { count: 1, windowStart: agora, blockedUntil: null }
                });
            }

            // 4. Operação atômica do banco ao invés de count + 1 em JavaScript.
            // Isto impede que múltiplas requisições no mesmo milissegundo leiam
            // o mesmo "count" antigo da memória e façam o bypass do Rate Limit.
            const updatedRow = await tx.rateLimit.update({
                where: { identificador },
                data: { count: { increment: 1 } }
            });

            // 5. Abuso detectado: Aplica o bloqueio se o limite foi ultrapassado.
            if (updatedRow.count > MAX_REQ) {
                await tx.rateLimit.update({
                    where: { identificador },
                    data: { blockedUntil: new Date(agora.getTime() + BLOQUEIO_MS) }
                });
                console.warn(`[RateLimit] Abuso detectado. Identificador bloqueado no banco: ${identificador.substring(0, 8)}...`);
            }

            return updatedRow;
        });

        // Verificação final baseada no retorno da transação
        if (registro.blockedUntil && agora < registro.blockedUntil) {
            return false;
        }

        return registro.count <= MAX_REQ;

    } catch (error) {
        console.error('[RateLimit Error] Falha DB:', error);
        // Fail-Open: Se o banco falhar momentaneamente, permite a requisição
        // para não prejudicar um cliente legítimo por conta de instabilidade de infraestrutura.
        return true;
    }
}