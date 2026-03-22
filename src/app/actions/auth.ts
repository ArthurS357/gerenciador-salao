'use server'

import { SignJWT, jwtVerify } from 'jose'
import { cookies } from 'next/headers'
import { prisma } from '@/lib/prisma'
import { compare } from 'bcrypt'

const JWT_SECRET = new TextEncoder().encode(
    process.env.JWT_SECRET ?? 'chave_secreta_desenvolvimento'
)

// ── Tipos de retorno explícitos ───────────────────────────────────────────────

type LoginResult =
    | { success: true; clienteId: string }
    | { success: false; error: string }

type LoginFuncionarioResult =
    | { success: true; role: string }
    | { success: false; error: string }

type SessaoClienteResult =
    | { logado: true; id: string }
    | { logado: false }

// ── Login do cliente (upsert por telefone) ────────────────────────────────────

export async function loginCliente(
    telefone: string,
    nome: string
): Promise<LoginResult> {
    try {
        let cliente = await prisma.cliente.findFirst({ where: { telefone } })

        if (cliente) {
            cliente = await prisma.cliente.update({
                where: { id: cliente.id },
                data: { nome },
            })
        } else {
            cliente = await prisma.cliente.create({ data: { telefone, nome } })
        }

        if (cliente.anonimizado) {
            return { success: false, error: 'Esta conta foi desativada e anonimizada.' }
        }

        const token = await new SignJWT({ sub: cliente.id, role: 'CLIENTE' })
            .setProtectedHeader({ alg: 'HS256' })
            .setIssuedAt()
            .setExpirationTime('7d')
            .sign(JWT_SECRET)

        const cookieStore = await cookies()
        cookieStore.set('cliente_session', token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            maxAge: 60 * 60 * 24 * 7, // 7 dias
            path: '/',
            sameSite: 'lax',
        })

        return { success: true, clienteId: cliente.id }
    } catch (error) {
        console.error('Erro no login do cliente:', error)
        return { success: false, error: 'Falha ao autenticar.' }
    }
}

// ── Login do funcionário ───────────────────────────────────────────────────────

export async function loginFuncionario(
    email: string,
    senhaPlana: string
): Promise<LoginFuncionarioResult> {
    try {
        const funcionario = await prisma.funcionario.findUnique({
            where: { email },
        })

        if (!funcionario || !funcionario.ativo) {
            return { success: false, error: 'Credenciais inválidas.' }
        }

        const senhaValida = await compare(senhaPlana, funcionario.senhaHash)
        if (!senhaValida) {
            return { success: false, error: 'Credenciais inválidas.' }
        }

        const token = await new SignJWT({ sub: funcionario.id, role: funcionario.role })
            .setProtectedHeader({ alg: 'HS256' })
            .setIssuedAt()
            .setExpirationTime('1d')
            .sign(JWT_SECRET)

        const cookieStore = await cookies()
        cookieStore.set('funcionario_session', token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            maxAge: 60 * 60 * 24, // 1 dia
            path: '/',
            sameSite: 'lax',
        })

        return { success: true, role: funcionario.role }
    } catch (error) {
        console.error('Erro no login do funcionário:', error)
        return { success: false, error: 'Falha no servidor ao autenticar.' }
    }
}

// ── Verificação de sessão do cliente ─────────────────────────────────────────

export async function verificarSessaoCliente(): Promise<SessaoClienteResult> {
    try {
        const cookieStore = await cookies()
        const token = cookieStore.get('cliente_session')?.value

        if (!token) return { logado: false }

        const { payload } = await jwtVerify(token, JWT_SECRET)

        if (payload.role !== 'CLIENTE' || !payload.sub) return { logado: false }

        return { logado: true, id: payload.sub }
    } catch {
        return { logado: false }
    }
}

// ── Logout do funcionário (server action — httpOnly cookie não pode ser
//    removido via document.cookie no cliente) ─────────────────────────────────

export async function logoutFuncionario(): Promise<{ sucesso: true }> {
    const cookieStore = await cookies()
    cookieStore.delete('funcionario_session')
    return { sucesso: true }
}

// ── Logout do cliente ─────────────────────────────────────────────────────────

export async function logoutCliente(): Promise<{ sucesso: true }> {
    const cookieStore = await cookies()
    cookieStore.delete('cliente_session')
    return { sucesso: true }
}