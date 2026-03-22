'use server'

import { SignJWT, jwtVerify } from 'jose'
import { cookies } from 'next/headers'
import { prisma } from '@/lib/prisma'
import { compare } from 'bcrypt'

const JWT_SECRET = new TextEncoder().encode(
    process.env.JWT_SECRET ?? 'chave_secreta_desenvolvimento'
)

// ── Tipos de retorno ─────────────────────────────────────────────────────────

export type LoginResult = {
    success: boolean;
    clienteId?: string;
    error?: string;
    requireConfirmation?: boolean;
    registeredName?: string;
}

type LoginFuncionarioResult =
    | { success: true; role: string }
    | { success: false; error: string }

type SessaoClienteResult =
    | { logado: true; id: string; nome: string } // <-- Atualizado para exigir o nome
    | { logado: false }

type SessaoFuncionarioResult =
    | { logado: true; id: string; nome: string; role: 'ADMIN' | 'PROFISSIONAL' }
    | { logado: false }

// ── Login do cliente ──────────────────────────────────────────────────────────

export async function loginCliente(
    telefone: string,
    nome: string,
    forcarLogin: boolean = false
): Promise<LoginResult> {
    try {
        let cliente = await prisma.cliente.findFirst({ where: { telefone } })

        if (cliente && !forcarLogin) {
            const nomeDB = cliente.nome.trim().toLowerCase();
            const nomeInput = nome.trim().toLowerCase();

            if (nomeDB !== nomeInput) {
                return { success: false, requireConfirmation: true, registeredName: cliente.nome }
            }
        }

        if (!cliente) {
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
            maxAge: 60 * 60 * 24 * 7,
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
        const funcionario = await prisma.funcionario.findUnique({ where: { email } })

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

// ── Verificação de sessão do cliente ─────────────────────────────────────────

export async function verificarSessaoCliente(): Promise<SessaoClienteResult> {
    try {
        const cookieStore = await cookies()
        const token = cookieStore.get('cliente_session')?.value

        if (!token) return { logado: false }

        const { payload } = await jwtVerify(token, JWT_SECRET)

        if (payload.role !== 'CLIENTE' || !payload.sub) return { logado: false }

        // <-- NOVA LÓGICA: Buscar o cliente no banco para resgatar o nome
        const cliente = await prisma.cliente.findUnique({
            where: { id: payload.sub },
            select: { nome: true, anonimizado: true }
        })

        if (!cliente || cliente.anonimizado) return { logado: false }

        return { logado: true, id: payload.sub, nome: cliente.nome }
    } catch {
        return { logado: false }
    }
}

// ── Verificação de sessão do funcionário ──────────────────────────────────────

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

// ── Logouts ───────────────────────────────────────────────────────────────────

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