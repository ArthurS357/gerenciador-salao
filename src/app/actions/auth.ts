'use server'

import { SignJWT } from 'jose';
import { cookies } from 'next/headers';
import { prisma } from '@/lib/prisma';

const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET || 'chave_secreta_desenvolvimento');

export async function loginCliente(telefone: string, nome: string) {
    try {
        // 1. Busca o cliente ou cria um novo caso não exista (upsert)
        const cliente = await prisma.cliente.upsert({
            where: { telefone },
            update: { nome }, // Atualiza o nome se o cliente digitar diferente
            create: { telefone, nome },
        });

        // 2. Se a conta foi anonimizada (LGPD), não permite o login
        if (cliente.anonimizado) {
            throw new Error('Esta conta foi desativada e anonimizada.');
        }

        // 3. Gera o token JWT usando a biblioteca 'jose'
        const token = await new SignJWT({ sub: cliente.id, role: 'CLIENTE' })
            .setProtectedHeader({ alg: 'HS256' })
            .setIssuedAt()
            .setExpirationTime('7d') // Validade de 7 dias conforme regra
            .sign(JWT_SECRET);

        // 4. Salva o token nos cookies do navegador
        const cookieStore = await cookies(); // 👈 await aqui
        cookieStore.set('cliente_session', token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            maxAge: 60 * 60 * 24 * 7,
            path: '/',
        });

        return { success: true, clienteId: cliente.id };
    } catch (error) {
        console.error('Erro no login do cliente:', error);
        return { success: false, error: 'Falha ao autenticar' };
    }
}