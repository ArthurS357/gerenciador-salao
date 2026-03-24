// src/app/actions/auth-cliente.ts
'use server'

import { prisma } from '@/lib/prisma'
import { cookies } from 'next/headers'
import { SignJWT } from 'jose'

const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET || 'chave_secreta')

// Utilitário para mascarar nomes (Ex: "Arthur Sabino" -> "A***** S*****")
function mascararNome(nome: string): string {
    return nome.split(' ').map(parte => {
        if (parte.length <= 2) return parte; // Não mascara preposições como "da", "de"
        return parte.charAt(0) + '*'.repeat(parte.length - 1);
    }).join(' ');
}

// Nomes falsos para confundir invasores
const NOMES_FALSOS = [
    "João Pedro da Silva", "Maria Eduarda Costa", "Lucas Fernandes",
    "Ana Beatriz Sousa", "Pedro Henrique Lima", "Camila Alves"
];

export async function iniciarLoginCliente(telefoneLimpo: string) {
    // 1. Validação de formato (Apenas números e 11 dígitos para celular BR)
    const regexCelular = /^\d{11}$/;
    if (!regexCelular.test(telefoneLimpo)) {
        return { sucesso: false, erro: 'Número de telemóvel inválido. Formato: (DDD) 9XXXX-XXXX' }
    }

    const cliente = await prisma.cliente.findUnique({
        where: { telefone: telefoneLimpo }
    })

    if (!cliente) {
        // Se não existir, indica ao frontend que deve ir para a tela de registo
        return { sucesso: true, status: 'NOVO_CLIENTE' }
    }

    // Gerar o desafio de identidade
    const nomeRealMascarado = mascararNome(cliente.nome);

    // Pegar 2 nomes falsos aleatórios e mascarar
    const falsosEscolhidos = NOMES_FALSOS.sort(() => 0.5 - Math.random()).slice(0, 2);
    const falsosMascarados = falsosEscolhidos.map(mascararNome);

    // Embaralhar as opções (Real + 2 Falsos)
    const opcoesDesafio = [nomeRealMascarado, ...falsosMascarados].sort(() => 0.5 - Math.random());

    return {
        sucesso: true,
        status: 'DESAFIO_IDENTIDADE',
        opcoes: opcoesDesafio
    }
}

export async function confirmarDesafioLogin(telefoneLimpo: string, nomeMascaradoEscolhido: string) {
    const cliente = await prisma.cliente.findUnique({
        where: { telefone: telefoneLimpo }
    })

    if (!cliente) return { sucesso: false, erro: 'Sessão expirada ou cliente não encontrado.' }

    const nomeRealMascarado = mascararNome(cliente.nome);

    // Verifica se a opção que ele clicou bate com a máscara do nome real do banco
    if (nomeMascaradoEscolhido !== nomeRealMascarado) {
        return { sucesso: false, erro: 'Identidade incorreta. Acesso bloqueado por segurança.' }
    }

    // Login Aprovado: Gerar token JWT
    const token = await new SignJWT({ sub: cliente.id, role: 'CLIENTE', nome: cliente.nome })
        .setProtectedHeader({ alg: 'HS256' })
        .setIssuedAt()
        .setExpirationTime('30d')
        .sign(JWT_SECRET)

    const cookieStore = await cookies()
    cookieStore.set('cliente_session', token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 60 * 60 * 24 * 30 // 30 dias
    })

    return { sucesso: true }
}