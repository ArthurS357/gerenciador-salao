'use server'

import { prisma } from '@/lib/prisma'
import { cookies } from 'next/headers'
import { SignJWT, jwtVerify } from 'jose'
import { validarTelefoneBrasileiro } from '@/lib/telefone'
import { verificarNumeroExisteNoWhatsApp } from '@/lib/whatsapp'
import { getJwtSecret, criarSessaoCliente } from '@/lib/jwt' // Corrigido
import { verificarRateLimit } from '@/lib/rateLimit'
import { z } from 'zod'

const SchemaTelefone = z.string().transform(v => v.replace(/\D/g, '')).refine(validarTelefoneBrasileiro, {
    message: 'Número inválido. Insira um telefone real com DDD.'
});

const SchemaRegistro = z.object({
    telefone: SchemaTelefone,
    nome: z.string().trim().min(3, 'O nome deve ter pelo menos 3 caracteres.'),
});

const NOMES_FALSOS = [
    "João Pedro da Silva", "Maria Eduarda Costa", "Lucas Fernandes",
    "Ana Beatriz Sousa", "Pedro Henrique Lima", "Camila Alves",
    "Roberto Carlos", "Juliana Paes", "Fernando Albuquerque",
    "Beatriz Nogueira", "Thiago Silva", "Amanda Moraes"
];

function mascararNome(nome: string): string {
    return nome.split(' ').map(parte => {
        if (parte.length <= 2) return parte;
        return parte.charAt(0) + '*'.repeat(parte.length - 1);
    }).join(' ');
}

export async function iniciarLoginCliente(telefoneForm: string) {
    const validacao = SchemaTelefone.safeParse(telefoneForm);
    if (!validacao.success) return { sucesso: false, erro: validacao.error.issues[0]?.message };

    const telefoneSanitizado = validacao.data;
    const rateLimitKey = `auth_cliente_${telefoneSanitizado}`;

    if (!(await verificarRateLimit(rateLimitKey))) {
        return { sucesso: false, erro: 'Muitas tentativas. Aguarde alguns instantes.' };
    }

    try {
        const cliente = await prisma.cliente.findUnique({
            where: { telefone: telefoneSanitizado }
        });

        if (!cliente) {
            const whatsappAtivo = await verificarNumeroExisteNoWhatsApp(telefoneSanitizado).catch((err) => {
                console.error('[Auth] Falha crítica na API do WhatsApp:', err);
                return false;
            });

            if (!whatsappAtivo) {
                return { sucesso: false, erro: 'Este número não possui um WhatsApp válido ou ativo.' };
            }
            return { sucesso: true, status: 'NOVO_CLIENTE' };
        }

        if (cliente.anonimizado) {
            return { sucesso: false, erro: 'Conta desativada. Entre em contato com o suporte.' };
        }

        const nomeRealMascarado = mascararNome(cliente.nome);
        const opcoesDesafio = new Set<string>();
        opcoesDesafio.add(nomeRealMascarado);

        const falsosMisturados = NOMES_FALSOS.sort(() => 0.5 - Math.random());

        for (const falso of falsosMisturados) {
            const mascarado = mascararNome(falso);
            if (!opcoesDesafio.has(mascarado)) {
                opcoesDesafio.add(mascarado);
            }
            if (opcoesDesafio.size === 3) break;
        }

        while (opcoesDesafio.size < 3) {
            opcoesDesafio.add(`U******* C******** ${opcoesDesafio.size}`);
        }

        const opcoesFinais = Array.from(opcoesDesafio).sort(() => 0.5 - Math.random());

        const preAuthToken = await new SignJWT({ tel: telefoneSanitizado, correto: nomeRealMascarado })
            .setProtectedHeader({ alg: 'HS256' })
            .setExpirationTime('5m')
            .sign(getJwtSecret()) // Corrigido

        const cookieStore = await cookies()
        cookieStore.set('desafio_identidade', preAuthToken, {
            httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax', maxAge: 300
        })

        return { sucesso: true, status: 'DESAFIO_IDENTIDADE', opcoes: opcoesFinais }

    } catch (error) {
        console.error('[Auth] Erro ao iniciar login do cliente:', error);
        return { sucesso: false, erro: 'Falha técnica ao iniciar a sessão.' };
    }
}

export async function confirmarDesafioLogin(telefoneForm: string, nomeMascaradoEscolhido: string) {
    const validacaoTel = SchemaTelefone.safeParse(telefoneForm);
    if (!validacaoTel.success) return { sucesso: false, erro: 'Telefone inválido.' };

    const telefoneSanitizado = validacaoTel.data;
    const cookieStore = await cookies();
    const token = cookieStore.get('desafio_identidade')?.value;

    if (!token) return { sucesso: false, erro: 'O desafio expirou. Inicie o login novamente.' };

    try {
        const { payload } = await jwtVerify(token, getJwtSecret()); // Corrigido

        cookieStore.delete('desafio_identidade');

        if (payload.tel !== telefoneSanitizado) {
            return { sucesso: false, erro: 'Divergência de sessão. Violação de integridade.' };
        }

        if (payload.correto !== nomeMascaradoEscolhido) {
            await verificarRateLimit(`auth_fail_${telefoneSanitizado}`);
            return { sucesso: false, erro: 'Identidade incorreta. Acesso bloqueado.' };
        }

        const cliente = await prisma.cliente.findUnique({ where: { telefone: telefoneSanitizado } });
        if (!cliente || cliente.anonimizado) return { sucesso: false, erro: 'Cliente não encontrado ou banido.' };

        await criarSessaoCliente(cliente.id, cliente.nome);
        return { sucesso: true };
    } catch (error) {
        console.warn(`[Auth] Falha no desafio JWT: ${error instanceof Error ? error.message : 'Desconhecido'}`);
        cookieStore.delete('desafio_identidade');
        return { sucesso: false, erro: 'Desafio inválido ou expirado.' };
    }
}

export async function registrarNovoCliente(telefoneForm: string, nomeForm: string) {
    const validacao = SchemaRegistro.safeParse({ telefone: telefoneForm, nome: nomeForm });

    if (!validacao.success) {
        return { sucesso: false, erro: validacao.error.issues[0]?.message };
    }

    const { telefone: telefoneSanitizado, nome } = validacao.data;
    const rateLimitKey = `registro_cliente_${telefoneSanitizado}`;

    if (!(await verificarRateLimit(rateLimitKey))) {
        return { sucesso: false, erro: 'Muitas tentativas. Aguarde alguns instantes.' };
    }

    try {
        const clienteExistente = await prisma.cliente.findUnique({ where: { telefone: telefoneSanitizado } });
        if (clienteExistente) return { sucesso: false, erro: 'Este telefone já está cadastrado.' };

        const novoCliente = await prisma.cliente.create({
            data: { telefone: telefoneSanitizado, nome }
        });

        await criarSessaoCliente(novoCliente.id, novoCliente.nome);
        return { sucesso: true };
    } catch (error) {
        console.error('[Auth] Erro ao registrar cliente:', error);
        return { sucesso: false, erro: 'Falha técnica ao criar conta.' };
    }
}