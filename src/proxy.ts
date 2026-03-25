import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { jwtVerify } from 'jose'

const REDIRECT_PROFISSIONAL = '/login-profissional'
const REDIRECT_CLIENTE = '/login'

// ── FUNÇÃO AUXILIAR: Obter a chave do .env com segurança ───────────────────
function getJwtSecret() {
    const secret = process.env.JWT_SECRET

    if (!secret) {
        if (process.env.NODE_ENV === 'production') {
            // Em produção, a falta do JWT_SECRET no .env é uma falha crítica de segurança.
            throw new Error('FALHA CRÍTICA: Variável JWT_SECRET não configurada no ficheiro .env!')
        }
        console.warn('Aviso: Variável JWT_SECRET ausente no .env. A utilizar fallback de desenvolvimento.')
    }

    return new TextEncoder().encode(secret ?? 'chave_secreta_desenvolvimento')
}

// ── SISTEMA DE RATE LIMITING (In-Memory com Cooldown) ──────────────────────
type RateLimitData = {
    count: number;
    windowStart: number;
    blockedUntil?: number;
}

const rateLimitMap = new Map<string, RateLimitData>()

const RATE_LIMIT_WINDOW_MS = 1000       // 1 segundo
const MAX_REQUESTS_PER_WINDOW = 5       // Máximo de 5 envios 
const BLOCK_DURATION_MS = 30 * 1000     // Castigo de 30 segundos

function applyRateLimit(request: NextRequest): NextResponse | null {
    if (request.method !== 'POST') return null

    const ip = request.headers.get('x-forwarded-for') ?? request.headers.get('x-real-ip') ?? 'ip-desconhecido'
    const now = Date.now()
    const clientData = rateLimitMap.get(ip)

    if (!clientData) {
        rateLimitMap.set(ip, { count: 1, windowStart: now })
        return null
    }

    if (clientData.blockedUntil && now < clientData.blockedUntil) {
        const segundosRestantes = Math.ceil((clientData.blockedUntil - now) / 1000)
        return new NextResponse(
            JSON.stringify({
                sucesso: false,
                erro: `Muitas tentativas. Por segurança, aguarde ${segundosRestantes} segundos.`
            }),
            { status: 429, headers: { 'Content-Type': 'application/json' } }
        )
    }

    if (now - clientData.windowStart > RATE_LIMIT_WINDOW_MS) {
        clientData.count = 1
        clientData.windowStart = now
        clientData.blockedUntil = undefined
        return null
    }

    clientData.count += 1

    if (clientData.count > MAX_REQUESTS_PER_WINDOW) {
        clientData.blockedUntil = now + BLOCK_DURATION_MS
        console.warn(`[RATE LIMIT] IP ${ip} bloqueado por 30s. Excedeu 5 req/segundo.`)

        return new NextResponse(
            JSON.stringify({
                sucesso: false,
                erro: 'Comportamento suspeito detectado. Bloqueio temporário de 30 segundos.'
            }),
            { status: 429, headers: { 'Content-Type': 'application/json' } }
        )
    }

    return null
}

// ── PROXY PRINCIPAL ───────────────────────────────────────────────────────
export async function proxy(request: NextRequest): Promise<NextResponse> {
    const { pathname } = request.nextUrl

    const rateLimitResponse = applyRateLimit(request)
    if (rateLimitResponse) return rateLimitResponse

    // Carrega a chave do .env a cada requisição
    const SECRET = getJwtSecret()

    // Área Corporativa (/admin e /profissional)
    if (pathname.startsWith('/admin') || pathname.startsWith('/profissional')) {
        const token = request.cookies.get('funcionario_session')?.value

        if (!token) return NextResponse.redirect(new URL(REDIRECT_PROFISSIONAL, request.url))

        try {
            const { payload } = await jwtVerify(token, SECRET)

            const roleValida = payload.role === 'ADMIN' || payload.role === 'PROFISSIONAL'
            if (!roleValida) return NextResponse.redirect(new URL(REDIRECT_PROFISSIONAL, request.url))

            if (pathname.startsWith('/admin') && payload.role !== 'ADMIN') {
                return NextResponse.redirect(new URL(REDIRECT_PROFISSIONAL, request.url))
            }

            const requestHeaders = new Headers(request.headers)
            requestHeaders.set('x-user-id', payload.sub ?? '')
            requestHeaders.set('x-user-role', String(payload.role))

            return NextResponse.next({ request: { headers: requestHeaders } })
        } catch {
            const response = NextResponse.redirect(new URL(REDIRECT_PROFISSIONAL, request.url))
            response.cookies.delete('funcionario_session')
            return response
        }
    }

    // Área do Cliente (/cliente)
    if (pathname.startsWith('/cliente')) {
        const token = request.cookies.get('cliente_session')?.value

        if (!token) return NextResponse.redirect(new URL(REDIRECT_CLIENTE, request.url))

        try {
            const { payload } = await jwtVerify(token, SECRET)

            if (payload.role !== 'CLIENTE') return NextResponse.redirect(new URL(REDIRECT_CLIENTE, request.url))

            const requestHeaders = new Headers(request.headers)
            requestHeaders.set('x-user-id', payload.sub ?? '')
            requestHeaders.set('x-user-role', 'CLIENTE')

            return NextResponse.next({ request: { headers: requestHeaders } })
        } catch {
            const response = NextResponse.redirect(new URL(REDIRECT_CLIENTE, request.url))
            response.cookies.delete('cliente_session')
            return response
        }
    }

    return NextResponse.next()
}

export const config = {
    matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
}