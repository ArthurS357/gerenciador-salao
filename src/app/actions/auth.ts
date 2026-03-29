'use server'

import { SignJWT, jwtVerify } from 'jose'
import { cookies } from 'next/headers'
import { prisma } from '@/lib/prisma'
import { compare } from 'bcrypt'
import { JWT_SECRET } from '@/lib/jwt'
import { z } from 'zod'

type LoginFuncionarioResult =
    | { success: true; role: string }
    | { success: false; error: string }

type SessaoClienteResult =
    | { logado: true; id: string; nome: string }
    | { logado: false }

type SessaoFuncionarioResult =
    | { logado: true; id: string; nome: string; role: 'ADMIN' | 'PROFISSIONAL' }
    | { logado: false }

// Schemas estritos para validação de JWT Payload
const SessaoClienteSchema = z.object({
    role: z.literal('CLIENTE'),
    sub: z.string().min(1),
    nome: z.string().min(1),
    anonimizado: z.boolean().optional(),
})

const SessaoFuncionarioSchema = z.object({
    role: z.enum(['ADMIN', 'PROFISSIONAL']),
    sub: z.string().min(1),
})

export async function loginFuncionario(email: string, senhaPlana: string): Promise<LoginFuncionarioResult> {
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
        console.error('[Auth Error] Falha no login do funcionário:', error)
        return { success: false, error: 'Falha no servidor ao autenticar.' }
    }
}

export async function verificarSessaoCliente(): Promise<SessaoClienteResult> {
    try {
        const cookieStore = await cookies()
        const token = cookieStore.get('cliente_session')?.value

        if (!token) return { logado: false }

        const { payload } = await jwtVerify(token, JWT_SECRET)
        const validacao = SessaoClienteSchema.safeParse(payload)

        if (!validacao.success || validacao.data.anonimizado) {
            return { logado: false }
        }

        return { logado: true, id: validacao.data.sub, nome: validacao.data.nome }
    } catch (error) {
        if (error instanceof Error && error.name !== 'JWTExpired') {
            console.warn('[Auth Warning] Falha na verificação da sessão de cliente:', error.message)
        }
        return { logado: false }
    }
}

export async function verificarSessaoFuncionario(): Promise<SessaoFuncionarioResult> {
    try {
        const cookieStore = await cookies()
        const token = cookieStore.get('funcionario_session')?.value

        if (!token) return { logado: false }

        const { payload } = await jwtVerify(token, JWT_SECRET)
        const validacao = SessaoFuncionarioSchema.safeParse(payload)

        if (!validacao.success) return { logado: false }

        const { sub, role } = validacao.data

        const funcionario = await prisma.funcionario.findUnique({
            where: { id: sub },
            select: { nome: true, ativo: true },
        })

        if (!funcionario || !funcionario.ativo) return { logado: false }

        return { logado: true, id: sub, nome: funcionario.nome, role }
    } catch (error) {
        if (error instanceof Error && error.name !== 'JWTExpired') {
            console.warn('[Auth Warning] Falha na verificação da sessão de funcionário:', error.message)
        }
        return { logado: false }
    }
}

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