import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { jwtVerify } from 'jose';

const JWT_SECRET = new TextEncoder().encode(
    process.env.JWT_SECRET || 'chave_secreta_desenvolvimento'
);

// Rotas de redirecionamento centralizadas — fácil de alterar futuramente
const REDIRECT_PROFISSIONAL = '/login-profissional';
const REDIRECT_CLIENTE = '/login';

export async function middleware(request: NextRequest) {
    const { pathname } = request.nextUrl;

    // ── 1. Área Corporativa (/admin e /profissional) ──────────────────────────
    if (pathname.startsWith('/admin') || pathname.startsWith('/profissional')) {
        const token = request.cookies.get('funcionario_session')?.value;

        if (!token) {
            return NextResponse.redirect(new URL(REDIRECT_PROFISSIONAL, request.url));
        }

        try {
            const { payload } = await jwtVerify(token, JWT_SECRET);

            // CORREÇÃO 1: garante que o token pertence a um funcionário,
            // bloqueando tokens de cliente mesmo que sejam JWT válidos
            const roleValida = payload.role === 'ADMIN' || payload.role === 'PROFISSIONAL';
            if (!roleValida) {
                return NextResponse.redirect(new URL(REDIRECT_PROFISSIONAL, request.url));
            }

            // CORREÇÃO 2: /admin exige ADMIN — mantido e explicitado
            if (pathname.startsWith('/admin') && payload.role !== 'ADMIN') {
                return NextResponse.redirect(new URL(REDIRECT_PROFISSIONAL, request.url));
            }

        } catch {
            // Token expirado, malformado ou assinatura inválida
            return NextResponse.redirect(new URL(REDIRECT_PROFISSIONAL, request.url));
        }
    }

    // ── 2. Área do Cliente (/cliente) ─────────────────────────────────────────
    if (pathname.startsWith('/cliente')) {
        const token = request.cookies.get('cliente_session')?.value;

        if (!token) {
            return NextResponse.redirect(new URL(REDIRECT_CLIENTE, request.url));
        }

        try {
            const { payload } = await jwtVerify(token, JWT_SECRET);

            // CORREÇÃO 3: valida que o token é genuinamente de um cliente,
            // impedindo que tokens de funcionário acessem a área do cliente
            if (payload.role !== 'CLIENTE') {
                return NextResponse.redirect(new URL(REDIRECT_CLIENTE, request.url));
            }

        } catch {
            return NextResponse.redirect(new URL(REDIRECT_CLIENTE, request.url));
        }
    }

    // ── 3. Libera rotas públicas ou que passaram por todas as validações ───────
    return NextResponse.next();
}

export const config = {
    matcher: [
        '/admin/:path*',
        '/profissional/:path*',
        '/cliente/:path*',
    ],
};