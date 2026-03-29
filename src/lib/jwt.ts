import 'server-only' // Correção Crítica: Protege o módulo de ser enviado para o cliente

import { SignJWT } from 'jose'
import { cookies } from 'next/headers'

// ── Constantes de Negócio ────────────────────────────────────────────────────
// Tempo de vida unificado para garantir que JWT e Cookie expirem no mesmo milissegundo
const EXPIRACAO_SESSAO_SEGUNDOS = 60 * 60 * 4 // 4 horas

// ── JWT Secret (Lazy Evaluation) ─────────────────────────────────────────────
let cachedSecret: Uint8Array | null = null

/**
 * Avalia o secret de forma preguiçosa (apenas quando chamado).
 * Isso impede que o 'npm run build' do Next.js crashe caso a variável
 * de ambiente não esteja presente na pipeline de CI/CD.
 */
export function getJwtSecret(): Uint8Array {
    if (cachedSecret) return cachedSecret

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
        cachedSecret = new TextEncoder().encode('dev-only-lmlu-jwt-secret-not-for-prod-2026')
        return cachedSecret
    }

    if (secret.length < 32) {
        console.warn('[LmLu] AVISO: JWT_SECRET deve ter ≥32 caracteres para segurança adequada.')
    }

    cachedSecret = new TextEncoder().encode(secret)
    return cachedSecret
}

// ── Sessão de Cliente ────────────────────────────────────────────────────────
/**
 * Emite um JWT httpOnly para o cliente autenticado.
 * Chamar APENAS após validação completa de identidade.
 */
export async function criarSessaoCliente(clienteId: string, nome: string): Promise<void> {
    const token = await new SignJWT({ role: 'CLIENTE', nome })
        .setProtectedHeader({ alg: 'HS256' })
        .setSubject(clienteId)
        .setIssuedAt()
        .setExpirationTime(`${EXPIRACAO_SESSAO_SEGUNDOS}s`) // Usa a constante
        .sign(getJwtSecret()) // Lazy load do secret em runtime

    const cookieStore = await cookies()
    cookieStore.set('cliente_session', token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: EXPIRACAO_SESSAO_SEGUNDOS, // Sincronizado com o JWT
        path: '/',
    })
}