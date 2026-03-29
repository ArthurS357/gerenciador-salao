/**
 * Utilitário JWT — NÃO é uma Server Action.
 *
 * Compartilhado entre Server Actions ('use server') e Route Handlers (API Routes).
 * Mantido em /lib para evitar a restrição do Next.js que proíbe exportar
 * não-funções de arquivos marcados com 'use server'.
 */
import { SignJWT } from 'jose'
import { cookies } from 'next/headers'

if (!process.env.JWT_SECRET && process.env.NODE_ENV === 'production') {
    throw new Error(
        'FATAL: JWT_SECRET não está definido nas variáveis de ambiente de produção.'
    )
}

// Única fonte de verdade para a chave de assinatura JWT
export const JWT_SECRET = new TextEncoder().encode(
    process.env.JWT_SECRET ?? 'chave_secreta_desenvolvimento'
)

/**
 * Cria um cookie de sessão para clientes (passwordless).
 * Claims embutidas no payload: `nome` e `anonimizado`.
 * Sem query ao banco na verificação — JWT 100% stateless para clientes.
 * Validade: 4 horas (balanceia UX e segurança sem necessidade de Redis).
 */
export async function criarSessaoCliente(clienteId: string, nome: string) {
    const token = await new SignJWT({ role: 'CLIENTE', nome, anonimizado: false })
        .setProtectedHeader({ alg: 'HS256' })
        .setSubject(clienteId)
        .setIssuedAt()
        .setExpirationTime('4h')
        .sign(JWT_SECRET)

    const cookieStore = await cookies()
    cookieStore.set('cliente_session', token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        maxAge: 60 * 60 * 4,
        path: '/',
        sameSite: 'lax',
    })
}
