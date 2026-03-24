'use server'

import { SignJWT, jwtVerify } from 'jose'
import { cookies } from 'next/headers'
import { prisma } from '@/lib/prisma'
import { compare } from 'bcrypt'

// Chave secreta para assinatura dos tokens. Em produção, DEVE vir do .env
const JWT_SECRET = new TextEncoder().encode(
    process.env.JWT_SECRET ?? 'chave_secreta_desenvolvimento'
)

// ── 1. Tipos de Retorno (Type Safety) ────────────────────────────────────────

export type LoginResult = {
    success: boolean;
    clienteId?: string;
    error?: string;
    requireNewName?: boolean;          // Acionado em novos cadastros
    requireNameConfirmation?: boolean; // Acionado para segurança de clientes existentes
    maskedName?: string;               // Exemplo: A***** S*****
}

type LoginFuncionarioResult =
    | { success: true; role: string }
    | { success: false; error: string }

type SessaoClienteResult =
    | { logado: true; id: string; nome: string }
    | { logado: false }

type SessaoFuncionarioResult =
    | { logado: true; id: string; nome: string; role: 'ADMIN' | 'PROFISSIONAL' }
    | { logado: false }


// ── 2. Utilitário de Segurança ───────────────────────────────────────────────

/**
 * Mascara o nome do cliente para validação de segurança.
 * Ex: "Arthur Silva" vira "A***** S*****"
 */
function mascararNome(nomeCompleto: string): string {
    return nomeCompleto
        .split(' ')
        .map(palavra => {
            if (palavra.length <= 2) return palavra; // Ignora preposições como "da", "de"
            return palavra.charAt(0).toUpperCase() + '*'.repeat(palavra.length - 1);
        })
        .join(' ');
}


// ── 3. Autenticação de Clientes (Passwordless) ───────────────────────────────

export async function loginCliente(
    telefone: string,
    nome?: string
): Promise<LoginResult> {
    try {
        let cliente = await prisma.cliente.findUnique({ where: { telefone } })

        if (cliente) {
            // Conta inativa por solicitação de exclusão de dados (LGPD)
            if (cliente.anonimizado) {
                return { success: false, error: 'Esta conta foi desativada e anonimizada.' }
            }

            // Desafio de Segurança: Se o cliente digitou apenas o telefone, pedimos a confirmação de identidade
            if (!nome || nome.trim() === '') {
                return {
                    success: false,
                    requireNameConfirmation: true,
                    maskedName: mascararNome(cliente.nome)
                }
            }

            // Validação: Confirma se o primeiro nome fornecido bate com o do banco de dados
            const primeiroNomeBanco = cliente.nome.trim().split(' ')[0].toLowerCase();
            const primeiroNomeInput = nome.trim().split(' ')[0].toLowerCase();

            if (primeiroNomeBanco !== primeiroNomeInput) {
                return {
                    success: false,
                    error: 'O nome inserido não corresponde ao titular deste número. Tente novamente.'
                }
            }
        } else {
            // Fluxo de Cadastro de Novo Cliente
            if (!nome || nome.trim() === '') {
                return { success: false, requireNewName: true }
            }
            cliente = await prisma.cliente.create({
                data: { telefone, nome: nome.trim() }
            })
        }

        // Geração do Token JWT (Válido por 7 dias)
        const token = await new SignJWT({ role: 'CLIENTE' })
            .setProtectedHeader({ alg: 'HS256' })
            .setSubject(cliente.id) // O ID do utilizador vai na propriedade "sub"
            .setIssuedAt()
            .setExpirationTime('7d')
            .sign(JWT_SECRET)

        // Configuração segura do Cookie
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
        return { success: false, error: 'Falha técnica ao autenticar.' }
    }
}


// ── 4. Autenticação de Funcionários (E-mail e Senha) ─────────────────────────

export async function loginFuncionario(
    email: string,
    senhaPlana: string
): Promise<LoginFuncionarioResult> {
    try {
        const funcionario = await prisma.funcionario.findUnique({ where: { email } })

        if (!funcionario || !funcionario.ativo) {
            return { success: false, error: 'Credenciais inválidas.' }
        }

        // Comparação segura de hash
        const senhaValida = await compare(senhaPlana, funcionario.senhaHash)
        if (!senhaValida) {
            return { success: false, error: 'Credenciais inválidas.' }
        }

        // Geração do Token JWT (Válido por 1 dia de trabalho)
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


// ── 5. Validadores de Sessão (Usados no Middleware ou Layouts) ───────────────

export async function verificarSessaoCliente(): Promise<SessaoClienteResult> {
    try {
        const cookieStore = await cookies()
        const token = cookieStore.get('cliente_session')?.value

        if (!token) return { logado: false }

        const { payload } = await jwtVerify(token, JWT_SECRET)

        if (payload.role !== 'CLIENTE' || !payload.sub) return { logado: false }

        // Validação adicional no banco para garantir que a conta não foi excluída enquanto o token era válido
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


// ── 6. Encerramento de Sessões (Logouts) ─────────────────────────────────────

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