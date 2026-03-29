'server-only'

import { SignJWT } from 'jose'
import { cookies } from 'next/headers'

// ── JWT Secret ───────────────────────────────────────────────────────────────
// Avaliado em runtime — jamais usa fallback silencioso em produção
function buildJwtSecret(): Uint8Array {
    const secret = process.env.JWT_SECRET

    if (!secret) {
        if (process.env.NODE_ENV === 'production') {
            throw new Error(
                '[LmLu] FATAL: JWT_SECRET não configurado. ' +
                'Defina a variável no painel do seu servidor antes de publicar.'
            )
        }
        console.warn(
            '\n⚠️  [LmLu] JWT_SECRET ausente no .env.\n' +
            '   Usando chave fraca EXCLUSIVA para desenvolvimento local.\n' +
            '   NUNCA suba para produção sem configurar JWT_SECRET.\n'
        )
        return new TextEncoder().encode('dev-only-lmlu-jwt-secret-not-for-prod-2026')
    }

    if (secret.length < 32) {
        console.warn('[LmLu] AVISO: JWT_SECRET deve ter ≥32 caracteres para segurança adequada.')
    }

    return new TextEncoder().encode(secret)
}

export const JWT_SECRET = buildJwtSecret()

// ── Sessão de Cliente ────────────────────────────────────────────────────────
/**
 * Emite um JWT httpOnly de 4h para o cliente autenticado.
 * Chamar APENAS após validação completa de identidade.
 */
export async function criarSessaoCliente(clienteId: string, nome: string): Promise<void> {
    const token = await new SignJWT({ role: 'CLIENTE', nome })
        .setProtectedHeader({ alg: 'HS256' })
        .setSubject(clienteId)
        .setIssuedAt()
        .setExpirationTime('4h')
        .sign(JWT_SECRET)

    const cookieStore = await cookies()
    cookieStore.set('cliente_session', token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 60 * 60 * 4, // 4 horas em segundos
        path: '/',
    })
}