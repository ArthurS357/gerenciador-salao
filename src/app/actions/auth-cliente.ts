'use server'

import { prisma } from '@/lib/prisma'
import { cookies } from 'next/headers'
import { SignJWT, jwtVerify } from 'jose'
import { validarTelefoneBrasileiro } from '@/lib/telefone'
import { verificarNumeroExisteNoWhatsApp } from '@/lib/whatsapp'
import { JWT_SECRET, criarSessaoCliente } from './auth'

function mascararNome(nome: string): string {
    return nome.split(' ').map(parte => {
        if (parte.length <= 2) return parte;
        return parte.charAt(0) + '*'.repeat(parte.length - 1);
    }).join(' ');
}

const NOMES_FALSOS = [
    "João Pedro da Silva", "Maria Eduarda Costa", "Lucas Fernandes",
    "Ana Beatriz Sousa", "Pedro Henrique Lima", "Camila Alves"
];

export async function iniciarLoginCliente(telefoneForm: string) {
    const telefoneSanitizado = telefoneForm.replace(/\D/g, '');

    if (!validarTelefoneBrasileiro(telefoneSanitizado)) {
        return { sucesso: false, erro: 'Número inválido. Insira um telefone real com DDD.' };
    }

    try {
        const whatsappAtivo = await verificarNumeroExisteNoWhatsApp(telefoneSanitizado);
        if (!whatsappAtivo) {
            return { sucesso: false, erro: 'Este número não possui um WhatsApp válido ou ativo.' };
        }
    } catch (err) {
        console.warn('Falha na checagem do WhatsApp, prosseguindo com login local...', err);
    }

    const cliente = await prisma.cliente.findUnique({
        where: { telefone: telefoneSanitizado }
    })

    if (!cliente) return { sucesso: true, status: 'NOVO_CLIENTE' }

    if (cliente.anonimizado) return { sucesso: false, erro: 'Conta desativada e anonimizada.' }

    const nomeRealMascarado = mascararNome(cliente.nome);
    const falsosEscolhidos = NOMES_FALSOS.sort(() => 0.5 - Math.random()).slice(0, 2);
    const falsosMascarados = falsosEscolhidos.map(mascararNome);
    const opcoesDesafio = [nomeRealMascarado, ...falsosMascarados].sort(() => 0.5 - Math.random());

    // ── Pre-Auth Token: Previne Força Bruta ──────────────────────────────────
    // Salva a resposta correta e o telefone de forma criptografada temporária
    const preAuthToken = await new SignJWT({ tel: telefoneSanitizado, correto: nomeRealMascarado })
        .setProtectedHeader({ alg: 'HS256' })
        .setExpirationTime('5m') // O usuário tem 5 minutos para resolver
        .sign(JWT_SECRET)

    const cookieStore = await cookies()
    cookieStore.set('desafio_identidade', preAuthToken, {
        httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax', maxAge: 300
    })

    return { sucesso: true, status: 'DESAFIO_IDENTIDADE', opcoes: opcoesDesafio }
}

export async function confirmarDesafioLogin(telefoneForm: string, nomeMascaradoEscolhido: string) {
    const cookieStore = await cookies()
    const token = cookieStore.get('desafio_identidade')?.value

    if (!token) return { sucesso: false, erro: 'O desafio expirou. Inicie o login novamente.' }

    try {
        const { payload } = await jwtVerify(token, JWT_SECRET)
        // Destrói o token imediatamente. Errar 1 vez exige recomeçar todo o fluxo.
        cookieStore.delete('desafio_identidade')

        const telefoneSanitizado = telefoneForm.replace(/\D/g, '')
        if (payload.tel !== telefoneSanitizado) return { sucesso: false, erro: 'Divergência de sessão.' }

        if (payload.correto !== nomeMascaradoEscolhido) {
            return { sucesso: false, erro: 'Identidade incorreta. Acesso bloqueado.' }
        }

        const cliente = await prisma.cliente.findUnique({ where: { telefone: telefoneSanitizado } })
        if (!cliente) return { sucesso: false, erro: 'Cliente não encontrado.' }

        await criarSessaoCliente(cliente.id, cliente.nome)
        return { sucesso: true }
    } catch {
        cookieStore.delete('desafio_identidade')
        return { sucesso: false, erro: 'Desafio inválido ou expirado.' }
    }
}

export async function registrarNovoCliente(telefoneForm: string, nome: string) {
    const telefoneSanitizado = telefoneForm.replace(/\D/g, '');

    if (!validarTelefoneBrasileiro(telefoneSanitizado)) return { sucesso: false, erro: 'Telefone inválido.' }
    if (!nome || nome.trim().length < 3) return { sucesso: false, erro: 'Nome inválido.' }

    try {
        const clienteExistente = await prisma.cliente.findUnique({ where: { telefone: telefoneSanitizado } })
        if (clienteExistente) return { sucesso: false, erro: 'Este telefone já está cadastrado.' }

        const novoCliente = await prisma.cliente.create({
            data: { telefone: telefoneSanitizado, nome: nome.trim() }
        })

        await criarSessaoCliente(novoCliente.id, novoCliente.nome)
        return { sucesso: true }
    } catch (error) {
        console.error('Erro ao registrar cliente:', error)
        return { sucesso: false, erro: 'Falha técnica ao criar conta.' }
    }
}