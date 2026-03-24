// src/middleware.ts
// Next.js exige este nome exato na raiz de /src (ou raiz do projeto).
// O arquivo anterior chamava-se proxy.ts e exportava `proxy` — ambos erros que
// impediam o middleware de ser executado, deixando /admin, /profissional e /cliente desprotegidos.

import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { jwtVerify } from 'jose'

const JWT_SECRET = new TextEncoder().encode(
    process.env.JWT_SECRET ?? 'chave_secreta_desenvolvimento'
)

const REDIRECT_PROFISSIONAL = '/login-profissional'
const REDIRECT_CLIENTE = '/login'

export async function middleware(request: NextRequest): Promise<NextResponse> {
    const { pathname } = request.nextUrl

    // ── 1. Área Corporativa (/admin e /profissional) ──────────────────────────
    if (pathname.startsWith('/admin') || pathname.startsWith('/profissional')) {
        const token = request.cookies.get('funcionario_session')?.value

        if (!token) {
            return NextResponse.redirect(new URL(REDIRECT_PROFISSIONAL, request.url))
        }

        try {
            const { payload } = await jwtVerify(token, JWT_SECRET)

            const roleValida = payload.role === 'ADMIN' || payload.role === 'PROFISSIONAL'
            if (!roleValida) {
                return NextResponse.redirect(new URL(REDIRECT_PROFISSIONAL, request.url))
            }

            // /admin exige role ADMIN
            if (pathname.startsWith('/admin') && payload.role !== 'ADMIN') {
                return NextResponse.redirect(new URL(REDIRECT_PROFISSIONAL, request.url))
            }

            // Propaga os dados do payload como headers para Server Components downstream
            const requestHeaders = new Headers(request.headers)
            requestHeaders.set('x-user-id', payload.sub ?? '')
            requestHeaders.set('x-user-role', String(payload.role))

            return NextResponse.next({ request: { headers: requestHeaders } })
        } catch {
            // Token expirado, malformado ou assinatura inválida
            const response = NextResponse.redirect(new URL(REDIRECT_PROFISSIONAL, request.url))
            response.cookies.delete('funcionario_session')
            return response
        }
    }

    // ── 2. Área do Cliente (/cliente) ─────────────────────────────────────────
    if (pathname.startsWith('/cliente')) {
        const token = request.cookies.get('cliente_session')?.value

        if (!token) {
            return NextResponse.redirect(new URL(REDIRECT_CLIENTE, request.url))
        }

        try {
            const { payload } = await jwtVerify(token, JWT_SECRET)

            if (payload.role !== 'CLIENTE') {
                return NextResponse.redirect(new URL(REDIRECT_CLIENTE, request.url))
            }

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
    matcher: [
        '/admin/:path*',
        '/profissional/:path*',
        '/cliente/:path*',
    ],
}