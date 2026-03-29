import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { jwtVerify } from 'jose'

const REDIRECT_PROFISSIONAL = '/login-profissional'
const REDIRECT_CLIENTE = '/login'

// ── GET SECRET (Otimizado com Memoização para o Edge Runtime) ───────────────
let cachedSecret: Uint8Array | null = null

function getJwtSecret(): Uint8Array {
    // Reutiliza o secret já computado em invocações quentes (Warm Starts) da Vercel
    if (cachedSecret) return cachedSecret

    const secret = process.env.JWT_SECRET

    // No build da Vercel, o secret pode estar ausente. Usamos fallback apenas para build.
    const secretValue = secret ? secret : 'dev-only-lmlu-jwt-secret-not-for-prod-2026'

    cachedSecret = new TextEncoder().encode(secretValue)
    return cachedSecret
}

export async function proxy(request: NextRequest): Promise<NextResponse> {
    const { pathname } = request.nextUrl
    const SECRET = getJwtSecret()

    // 1. Áreas Protegidas (Admin e Profissional)
    if (pathname.startsWith('/admin') || pathname.startsWith('/profissional')) {
        const token = request.cookies.get('funcionario_session')?.value

        if (!token) return NextResponse.redirect(new URL(REDIRECT_PROFISSIONAL, request.url))

        try {
            const { payload } = await jwtVerify(token, SECRET)

            // Validação de Roles
            const isAdmin = payload.role === 'ADMIN'
            const isProf = payload.role === 'PROFISSIONAL'

            if (!isAdmin && !isProf) throw new Error('Unauthorized')

            if (pathname.startsWith('/admin') && !isAdmin) {
                return NextResponse.redirect(new URL(REDIRECT_PROFISSIONAL, request.url))
            }

            // Injeta metadados nos headers para consumo posterior
            const requestHeaders = new Headers(request.headers)
            requestHeaders.set('x-user-id', String(payload.sub))
            requestHeaders.set('x-user-role', String(payload.role))

            return NextResponse.next({ request: { headers: requestHeaders } })
        } catch {
            const res = NextResponse.redirect(new URL(REDIRECT_PROFISSIONAL, request.url))
            res.cookies.delete('funcionario_session') // Limpa cookie inválido/expirado
            return res
        }
    }

    // 2. Área do Cliente
    if (pathname.startsWith('/cliente')) {
        const token = request.cookies.get('cliente_session')?.value

        if (!token) return NextResponse.redirect(new URL(REDIRECT_CLIENTE, request.url))

        try {
            const { payload } = await jwtVerify(token, SECRET)

            if (payload.role !== 'CLIENTE') throw new Error('Unauthorized')

            const requestHeaders = new Headers(request.headers)
            requestHeaders.set('x-user-id', String(payload.sub))

            return NextResponse.next({ request: { headers: requestHeaders } })
        } catch {
            const res = NextResponse.redirect(new URL(REDIRECT_CLIENTE, request.url))
            res.cookies.delete('cliente_session') // Limpa cookie inválido/expirado
            return res
        }
    }

    return NextResponse.next()
}

// Matcher otimizado para não rodar em arquivos estáticos (economiza execução na Vercel)
export const config = {
    matcher: ['/admin/:path*', '/profissional/:path*', '/cliente/:path*'],
}