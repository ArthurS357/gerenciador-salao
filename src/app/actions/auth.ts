'use server'

import { SignJWT, jwtVerify } from 'jose'; // ✅ CORREÇÃO 3: jwtVerify adicionado
import { cookies } from 'next/headers';
import { prisma } from '@/lib/prisma';
import { compare } from 'bcrypt';

const JWT_SECRET = new TextEncoder().encode(
    process.env.JWT_SECRET || 'chave_secreta_desenvolvimento'
);

export async function loginCliente(telefone: string, nome: string) {
    try {
        const cliente = await prisma.cliente.upsert({
            where: { telefone },
            update: { nome },
            create: { telefone, nome },
        });

        if (cliente.anonimizado) {
            throw new Error('Esta conta foi desativada e anonimizada.');
        }

        const token = await new SignJWT({ sub: cliente.id, role: 'CLIENTE' })
            .setProtectedHeader({ alg: 'HS256' })
            .setIssuedAt()
            .setExpirationTime('7d')
            .sign(JWT_SECRET);

        const cookieStore = await cookies();
        cookieStore.set('cliente_session', token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            maxAge: 60 * 60 * 24 * 7, // 7 dias — alinhado com o JWT
            path: '/',
        });

        return { success: true, clienteId: cliente.id };
    } catch (error) {
        console.error('Erro no login do cliente:', error);
        return { success: false, error: 'Falha ao autenticar' };
    }
}

export async function loginFuncionario(email: string, senhaPlana: string) {
    try {
        const funcionario = await prisma.funcionario.findUnique({
            where: { email },
        });

        if (!funcionario) {
            return { success: false, error: 'Credenciais inválidas.' };
        }

        const senhaValida = await compare(senhaPlana, funcionario.senhaHash);

        if (!senhaValida) {
            return { success: false, error: 'Credenciais inválidas.' };
        }

        const token = await new SignJWT({ sub: funcionario.id, role: funcionario.role })
            .setProtectedHeader({ alg: 'HS256' })
            .setIssuedAt()
            .setExpirationTime('1d')
            .sign(JWT_SECRET);

        const cookieStore = await cookies();
        cookieStore.set('funcionario_session', token, { // ✅ CORREÇÃO 1: cookie correto
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            maxAge: 60 * 60 * 24, // ✅ CORREÇÃO 2: 1 dia — alinhado com o JWT
            path: '/',
        });

        return { success: true, role: funcionario.role };
    } catch (error) {
        console.error('Erro no login do funcionário:', error);
        return { success: false, error: 'Falha no servidor ao autenticar.' };
    }
}

export async function verificarSessaoCliente() {
    try {
        const cookieStore = await cookies();
        const token = cookieStore.get('cliente_session')?.value;

        if (!token) return { logado: false };

        const { payload } = await jwtVerify(token, JWT_SECRET);

        if (payload.role !== 'CLIENTE') return { logado: false };

        return { logado: true, id: payload.sub as string };
    } catch {
        return { logado: false };
    }
}