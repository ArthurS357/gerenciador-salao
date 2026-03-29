'use server'

import { SignJWT, jwtVerify } from 'jose'
import { cookies } from 'next/headers'
import { prisma } from '@/lib/prisma'
import { compare } from 'bcrypt'
import { JWT_SECRET } from '@/lib/jwt'

type LoginFuncionarioResult =
    | { success: true; role: string }
    | { success: false; error: string }

type SessaoClienteResult =
    | { logado: true; id: string; nome: string }
    | { logado: false }

type SessaoFuncionarioResult =
    | { logado: true; id: string; nome: string; role: 'ADMIN' | 'PROFISSIONAL' }
    | { logado: false }

// ── Autenticação de Funcionários (E-mail e Senha) ─────────────────────────
export async function loginFuncionario(
    email: string,
    senhaPlana: string
): Promise<LoginFuncionarioResult> {
    try {
        const funcionario = await prisma.funcionario.findUnique({ where: { email } })

        if (!funcionario || !funcionario.ativo) {
            return { success: false, error: 'Credenciais inválidas.' }
        }

        const senhaValida = await compare(senhaPlana, funcionario.senhaHash)
        if (!senhaValida) return { success: false, error: 'Credenciais inválidas.' }

        const token = await new SignJWT({ role: funcionario.role })
            .setProtectedHeader({ alg: 'HS256' })
            .setSubject(funcionario.id)
            .setIssuedAt()
            .setExpirationTime('1d')
            .sign(JWT_SECRET)

        const cookieStore = await cookies()
        cookieStore.set('funcionario_session', token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            maxAge: 60 * 60 * 24,
            path: '/',
            sameSite: 'lax',
        })

        return { success: true, role: funcionario.role }
    } catch (error) {
        console.error('Erro no login do funcionário:', error)
        return { success: false, error: 'Falha no servidor ao autenticar.' }
    }
}

// ── Validadores de Sessão ──────────────────────────────────────────────────────────

/**
 * ESTRATÉGIA HÍBRIDA DE SESSÃO:
 *
 * Cliente  → JWT Stateless. Claims (`nome`, `anonimizado`) estão no payload.
 *             Sem roundtrip ao banco. Risco aceitável pois TTL é curto (4h)
 *             e a anoniimização de clientes é um evento raro/administrativo.
 *
 * Funcionário/Admin → Stateful (Query ao Prisma). Revogação imediata de acesso
 *             ao desativar um usuário com privilégios. A latam de uma findUnique
 *             por PK é de poucos ms e o risco de segurança supera a micro-otimização.
 */
export async function verificarSessaoCliente(): Promise<SessaoClienteResult> {
    try {
        const cookieStore = await cookies()
        const token = cookieStore.get('cliente_session')?.value

        if (!token) return { logado: false }

        const { payload } = await jwtVerify(token, JWT_SECRET)

        // Valida claims obrigatórias estruturalmente
        if (payload.role !== 'CLIENTE' || !payload.sub || typeof payload.nome !== 'string') {
            return { logado: false }
        }

        // Verifica revogação via claim no payload (sem roundtrip ao banco)
        if (payload.anonimizado === true) return { logado: false }

        return { logado: true, id: payload.sub, nome: payload.nome }
    } catch {
        return { logado: false }
    }
}

/**
 * Stateful — mantemos a query ao banco para revogação imediata.
 * Um funcionário desativado perde acesso no próximo request, sem dependência de TTL.
 */
export async function verificarSessaoFuncionario(): Promise<SessaoFuncionarioResult> {
    try {
        const cookieStore = await cookies()
        const token = cookieStore.get('funcionario_session')?.value

        if (!token) return { logado: false }

        const { payload } = await jwtVerify(token, JWT_SECRET)

        const role = payload.role
        if ((role !== 'ADMIN' && role !== 'PROFISSIONAL') || !payload.sub) {
            return { logado: false }
        }

        const funcionario = await prisma.funcionario.findUnique({
            where: { id: payload.sub },
            select: { nome: true, ativo: true },
        })

        if (!funcionario || !funcionario.ativo) return { logado: false }

        return {
            logado: true,
            id: payload.sub,
            nome: funcionario.nome,
            role: role as 'ADMIN' | 'PROFISSIONAL',
        }
    } catch {
        return { logado: false }
    }
}

// ── Logouts ──────────────────────────────────────────────────────────────────
export async function logoutFuncionario(): Promise<{ sucesso: true }> {
    const cookieStore = await cookies()
    cookieStore.delete('funcionario_session')
    return { sucesso: true }
}

export async function logoutCliente(): Promise<{ sucesso: true }> {
    const cookieStore = await cookies()
    cookieStore.delete('cliente_session')
    return { sucesso: true }
}