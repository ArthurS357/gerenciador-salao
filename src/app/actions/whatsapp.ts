'use server'

import { verificarNumeroExisteNoWhatsApp, enviarMensagemWhatsApp } from '@/lib/whatsapp';
import { verificarRateLimit } from '@/lib/rateLimit';
import { z } from 'zod';

// Validação para aceitar apenas os dígitos e garantir tamanho coerente de telefones brasileiros
const SchemaTelefoneWhatsApp = z.string()
    .transform(v => v.replace(/\D/g, ''))
    .refine(v => v.length >= 10 && v.length <= 11, {
        message: 'Telefone deve ter 10 ou 11 dígitos com DDD.'
    });

// Validação para mensagens WhatsApp
const SchemaMensagemWhatsApp = z.string()
    .min(1, { message: 'Mensagem não pode estar vazia.' })
    .max(4096, { message: 'Mensagem não pode exceder 4096 caracteres.' });

/**
 * Server Action para validação de número.
 * Fortemente blindada para evitar consumo malicioso de cota de API externa.
 */
export async function validarWhatsAppAction(telefoneRaw: string): Promise<boolean> {
    try {
        // 1. Validação em Runtime (evita chamadas inúteis à API)
        const validacao = SchemaTelefoneWhatsApp.safeParse(telefoneRaw);
        if (!validacao.success) return false;

        const telefone = validacao.data;

        // 2. Blindagem de Custo (Denial-of-Wallet)
        // Usa o IP ou um identificador forte para impedir varredura (scanning) de números em massa.
        const rateLimitKey = `wa_val_${telefone}`;
        if (!(await verificarRateLimit(rateLimitKey))) {
            console.warn(`[WhatsApp Security] Tentativa de flood bloqueada para o número: ${telefone}`);
            // Fail-closed: Se houver abuso, dizemos que não tem WhatsApp para barrar o invasor.
            return false;
        }

        // 3. Chamada real à biblioteca
        return await verificarNumeroExisteNoWhatsApp(telefone);

    } catch (error) {
        // Tratamento silencioso para o cliente, log detalhado para o servidor
        console.error('[WhatsApp Action Error] Falha na validação do número:', error);
        return false;
    }
}

/**
 * Server Action para enviar mensagens via WhatsApp.
 * Validações Zod + Rate Limit do Upstash blindam contra abuso.
 */
export async function enviarMensagemWhatsAppAction(
    telefoneRaw: string,
    mensagemRaw: string
): Promise<{ sucesso: boolean; erro?: string }> {
    try {
        // 1. Validação de entrada com Zod
        const validacaoTelefone = SchemaTelefoneWhatsApp.safeParse(telefoneRaw);
        if (!validacaoTelefone.success) {
            return { sucesso: false, erro: 'Telefone inválido.' };
        }

        const validacaoMensagem = SchemaMensagemWhatsApp.safeParse(mensagemRaw);
        if (!validacaoMensagem.success) {
            return { sucesso: false, erro: 'Mensagem inválida.' };
        }

        const telefone = validacaoTelefone.data;
        const mensagem = validacaoMensagem.data;

        // 2. Rate Limit (Upstash) para evitar spam/abuso
        const rateLimitKey = `wa_send_${telefone}`;
        if (!(await verificarRateLimit(rateLimitKey))) {
            console.warn(`[WhatsApp Security] Tentativa de flood bloqueada para envio: ${telefone}`);
            return { sucesso: false, erro: 'Muitas tentativas. Tente novamente mais tarde.' };
        }

        // 3. Chamada real à biblioteca de envio
        const resultado = await enviarMensagemWhatsApp(telefone, mensagem);
        if (!resultado) {
            return { sucesso: false, erro: 'Falha ao enviar mensagem.' };
        }

        return { sucesso: true };

    } catch (error) {
        console.error('[WhatsApp Send Action Error] Falha ao enviar mensagem:', error);
        return { sucesso: false, erro: 'Erro interno ao enviar mensagem.' };
    }
}