import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { jwtVerify } from 'jose'

const JWT_SECRET = new TextEncoder().encode(
    process.env.JWT_SECRET ?? 'chave_secreta_desenvolvimento'
)

const REDIRECT_PROFISSIONAL = '/login-profissional'
const REDIRECT_CLIENTE = '/login'

// ── SISTEMA DE RATE LIMITING (In-Memory com Cooldown) ──────────────────────
type RateLimitData = {
    count: number;
    windowStart: number;
    blockedUntil?: number;
}

const rateLimitMap = new Map<string, RateLimitData>()

// Configurações exatas: Max 5 requisições em 1 segundo. Se passar, bloqueia por 30s.
const RATE_LIMIT_WINDOW_MS = 1000       // 1 segundo
const MAX_REQUESTS_PER_WINDOW = 5       // Máximo de 5 envios 
const BLOCK_DURATION_MS = 30 * 1000     // Castigo de 30 segundos

function applyRateLimit(request: NextRequest): NextResponse | null {
    if (request.method !== 'POST') return null

    const ip = request.headers.get('x-forwarded-for') ?? request.headers.get('x-real-ip') ?? 'ip-desconhecido'
    const now = Date.now()
    const clientData = rateLimitMap.get(ip)

    // 1. Registo de Novo IP
    if (!clientData) {
        rateLimitMap.set(ip, { count: 1, windowStart: now })
        return null
    }

    // 2. Verifica se o utilizador está cumprindo o castigo (bloqueado)
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

    // 3. Janela de 1 segundo expirou? Reseta a contagem
    if (now - clientData.windowStart > RATE_LIMIT_WINDOW_MS) {
        clientData.count = 1
        clientData.windowStart = now
        clientData.blockedUntil = undefined
        return null
    }

    // 4. Incrementa dentro do mesmo segundo
    clientData.count += 1

    // 5. Se ultrapassou 5 no mesmo segundo, aplica o castigo de 30s
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

// ── MIDDLEWARE PRINCIPAL ──────────────────────────────────────────────────
export async function middleware(request: NextRequest): Promise<NextResponse> {
    const { pathname } = request.nextUrl

    const rateLimitResponse = applyRateLimit(request)
    if (rateLimitResponse) return rateLimitResponse

    // Área Corporativa (/admin e /profissional)
    if (pathname.startsWith('/admin') || pathname.startsWith('/profissional')) {
        const token = request.cookies.get('funcionario_session')?.value

        if (!token) return NextResponse.redirect(new URL(REDIRECT_PROFISSIONAL, request.url))

        try {
            const { payload } = await jwtVerify(token, JWT_SECRET)

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
            const { payload } = await jwtVerify(token, JWT_SECRET)

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