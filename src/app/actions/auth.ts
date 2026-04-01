'use server'

import { SignJWT, jwtVerify } from 'jose'
import { cookies } from 'next/headers'
import { prisma } from '@/lib/prisma'
import { compare } from 'bcrypt'
import { getJwtSecret } from '@/lib/jwt'
import { z } from 'zod'
import { cache } from 'react'
import { verificarRateLimit } from '@/lib/rateLimit'

type LoginFuncionarioResult =
    | { success: true; role: string }
    | { success: false; error: string }

type SessaoClienteResult =
    | { logado: true; id: string; nome: string }
    | { logado: false }

type SessaoFuncionarioResult =
    | { logado: true; id: string; nome: string; role: 'ADMIN' | 'PROFISSIONAL' | 'RECEPCIONISTA' }
    | { logado: false }

// ── SCHEMAS ──────────────────────────────────────────────────────────────────
const SessaoClienteSchema = z.object({
    role: z.literal('CLIENTE'),
    sub: z.string().min(1),
    nome: z.string().min(1),
    anonimizado: z.boolean().optional(),
})

const SessaoFuncionarioSchema = z.object({
    role: z.enum(['ADMIN', 'PROFISSIONAL', 'RECEPCIONISTA']),
    sub: z.string().min(1),
})

const EXPIRACAO_SEGUNDOS = 60 * 60 * 24 // 1 dia

// ── ACTIONS DE AUTENTICAÇÃO ──────────────────────────────────────────────────

export async function loginFuncionario(email: string, senhaPlana: string): Promise<LoginFuncionarioResult> {
    try {
        const rateLimitKey = `login_func_${email}`;
        if (!(await verificarRateLimit(rateLimitKey))) {
            return { success: false, error: 'Muitas tentativas. Aguarde 30 segundos.' }
        }

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
            .setExpirationTime(`${EXPIRACAO_SEGUNDOS}s`)
            .sign(getJwtSecret())

        const cookieStore = await cookies()
        cookieStore.set('funcionario_session', token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            maxAge: EXPIRACAO_SEGUNDOS,
            path: '/',
            sameSite: 'lax',
        })

        return { success: true, role: funcionario.role }
    } catch (error) {
        console.error('[Auth Error] Falha no login do funcionário:', error)
        return { success: false, error: 'Falha no servidor ao autenticar.' }
    }
}

export const verificarSessaoCliente = cache(async (): Promise<SessaoClienteResult> => {
    const cookieStore = await cookies()
    try {
        const token = cookieStore.get('cliente_session')?.value

        if (!token) return { logado: false }

        const { payload } = await jwtVerify(token, getJwtSecret())
        const validacao = SessaoClienteSchema.safeParse(payload)

        if (!validacao.success || validacao.data.anonimizado) {
            return { logado: false }
        }

        const clienteAtivo = await prisma.cliente.findUnique({
            where: { id: validacao.data.sub },
            select: { id: true, anonimizado: true }
        })

        if (!clienteAtivo || clienteAtivo.anonimizado) {
            return { logado: false }
        }

        return { logado: true, id: validacao.data.sub, nome: validacao.data.nome }
    } catch (error) {
        if (error instanceof Error && error.name !== 'JWTExpired') {
            console.warn('[Auth Warning] Falha na verificação da sessão de cliente:', error.message)
        }
        return { logado: false }
    }
})

export const verificarSessaoFuncionario = cache(async (): Promise<SessaoFuncionarioResult> => {
    const cookieStore = await cookies()
    try {
        const token = cookieStore.get('funcionario_session')?.value

        if (!token) return { logado: false }

        const { payload } = await jwtVerify(token, getJwtSecret())
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
})

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