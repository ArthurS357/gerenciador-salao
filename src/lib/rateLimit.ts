/**
 * rateLimit.ts — Rate Limiting adaptativo
 *
 * PRODUÇÃO (multi-instância/serverless):
 *   Configure UPSTASH_REDIS_REST_URL e UPSTASH_REDIS_REST_TOKEN
 *   → usa Upstash Redis com sliding window
 *
 * DESENVOLVIMENTO (single-instance):
 *   Sem as variáveis acima → usa Map in-memory
 *   ⚠️  Resetado a cada restart — NÃO usar em produção distribuída
 */

import { Ratelimit } from '@upstash/ratelimit'
import { Redis } from '@upstash/redis'

// ── Upstash Redis (produção) ─────────────────────────────────────────────────
let upstashLimiter: Ratelimit | null = null

if (process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN) {
    upstashLimiter = new Ratelimit({
        redis: Redis.fromEnv(),
        // 5 tentativas de agendamento por minuto por clienteId
        limiter: Ratelimit.slidingWindow(5, '60 s'),
        analytics: false,
        prefix: 'lmlu:rl:agendamento',
    })
} else if (process.env.NODE_ENV === 'production') {
    console.warn(
        '[LmLu] AVISO: Rate limiting Redis não configurado em produção.\n' +
        '       Configure UPSTASH_REDIS_REST_URL e UPSTASH_REDIS_REST_TOKEN.'
    )
}

// ── Fallback in-memory (desenvolvimento) ────────────────────────────────────
type MemEntry = { count: number; windowStart: number; blockedUntil?: number }
const memMap = new Map<string, MemEntry>()

const JANELA_MS = 60_000  // 1 minuto
const MAX_REQ = 5       // 5 tentativas por janela
const BLOQUEIO_MS = 30_000  // 30s de castigo

function checkMemory(key: string): boolean {
    const now = Date.now()
    const entry = memMap.get(key)

    if (!entry) {
        memMap.set(key, { count: 1, windowStart: now })
        return true
    }
    if (entry.blockedUntil && now < entry.blockedUntil) return false
    if (now - entry.windowStart > JANELA_MS) {
        memMap.set(key, { count: 1, windowStart: now })
        return true
    }

    entry.count += 1
    if (entry.count > MAX_REQ) {
        entry.blockedUntil = now + BLOQUEIO_MS
        console.warn(`[RateLimit] Chave bloqueada por 30s: ${key.substring(0, 8)}...`)
        return false
    }
    return true
}

// ── API pública (sempre assíncrona para compatibilidade com Upstash) ─────────
export async function verificarRateLimit(identificador: string): Promise<boolean> {
    if (upstashLimiter) {
        const { success } = await upstashLimiter.limit(identificador)
        return success
    }
    return checkMemory(identificador)
}