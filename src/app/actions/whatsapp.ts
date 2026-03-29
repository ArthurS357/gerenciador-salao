'use server'

import { verificarNumeroExisteNoWhatsApp } from '@/lib/whatsapp';
import { verificarRateLimit } from '@/lib/rateLimit';
import { z } from 'zod';

// Validação para aceitar apenas os dígitos e garantir tamanho coerente de telefones brasileiros
const SchemaTelefoneWhatsApp = z.string()
    .transform(v => v.replace(/\D/g, ''))
    .refine(v => v.length >= 10 && v.length <= 11, {
        message: 'Telefone deve ter 10 ou 11 dígitos com DDD.'
    });

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