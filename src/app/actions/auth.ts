'use server'

import { SignJWT } from 'jose';
import { cookies } from 'next/headers';
import { prisma } from '@/lib/prisma';
import { compare } from 'bcrypt';
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

// Lógica passo a passo para o login corporativo
export async function loginFuncionario(email: string, senhaPlana: string) {
    try {
        // 1. Busca no Banco: O Prisma procura o funcionário exato pelo e-mail fornecido.
        const funcionario = await prisma.funcionario.findUnique({
            where: { email },
        });

        // Se o e-mail não existir, bloqueia o acesso.
        if (!funcionario) {
            return { success: false, error: 'Credenciais inválidas.' };
        }

        // 2. Validação Criptográfica: O bcrypt compara a senha digitada com a hash salva.
        const senhaValida = await compare(senhaPlana, funcionario.senhaHash);

        if (!senhaValida) {
            return { success: false, error: 'Credenciais inválidas.' };
        }

        // 3. Criação do Token JWT: Assinamos um token contendo o ID e o nível de acesso (Role).
        const token = await new SignJWT({ sub: funcionario.id, role: funcionario.role })
            .setProtectedHeader({ alg: 'HS256' })
            .setIssuedAt()
            .setExpirationTime('1d') // Sessão de 1 dia (24 horas) para segurança corporativa
            .sign(JWT_SECRET);

        // 4. Injeção nos Cookies: O Next.js salva o token no navegador do usuário de forma segura.
        const cookieStore = await cookies(); // 👈 await aqui
        cookieStore.set('cliente_session', token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            maxAge: 60 * 60 * 24 * 7,
            path: '/',
        });

        // Retorna também a role para o frontend saber para qual tela redirecionar
        return { success: true, role: funcionario.role };
    } catch (error) {
        console.error('Erro no login do funcionário:', error);
        return { success: false, error: 'Falha no servidor ao autenticar.' };
    }
}