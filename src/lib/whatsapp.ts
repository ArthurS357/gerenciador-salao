'use server'

/**
 * whatsapp.ts — Integração WhatsApp Business
 *
 * Variáveis de ambiente para modo produção:
 * WHATSAPP_API_URL   — URL base do provedor (Z-API, Evolution, Twilio, etc.)
 * WHATSAPP_API_TOKEN — Token de autenticação do provedor
 *
 * Sem essas variáveis, opera em modo desenvolvimento:
 * · verificarNumeroExisteNoWhatsApp → valida apenas o formato do número
 * · enviarMensagemWhatsApp          → loga no console em vez de enviar
 */

/** Valida formato brasileiro: DDD (2 dígitos) + número (8 ou 9 dígitos) */
function validarFormato(telefoneLimpo: string): boolean {
    return /^(\d{2})(9\d{8}|\d{8})$/.test(telefoneLimpo)
}

export async function verificarNumeroExisteNoWhatsApp(telefone: string): Promise<boolean> {
    // 1. Leitura em Runtime: Evita problemas de build-caching estático do Next.js
    const API_URL = process.env.WHATSAPP_API_URL
    const API_TOKEN = process.env.WHATSAPP_API_TOKEN

    const limpo = telefone.replace(/\D/g, '')

    if (!validarFormato(limpo)) return false

    // Sem API configurada: confia apenas no formato
    if (!API_URL || !API_TOKEN) {
        if (process.env.NODE_ENV === 'production') {
            console.warn('[WhatsApp] API não configurada em produção — validando apenas formato.')
        }
        return true
    }

    try {
        // Correção Crítica: Adicionado '55' (DDI do Brasil) que é obrigatório na maioria das APIs
        const numeroComDDI = `55${limpo}`
        const res = await fetch(`${API_URL}/phone-exists/${numeroComDDI}`, {
            headers: { 'Client-Token': API_TOKEN },
            signal: AbortSignal.timeout(5_000),
        })

        // Correção de Resiliência: Diferenciar erro de API (falta de saldo/caiu) de "número inválido"
        if (!res.ok) {
            console.error(`[WhatsApp API Error] HTTP ${res.status} ao verificar número. Permitindo acesso por fallback.`);
            return true; // Fail-Open para não punir clientes por indisponibilidade do fornecedor
        }

        const data = await res.json() as { exists?: boolean; value?: boolean }
        return data.exists === true || data.value === true
    } catch (err) {
        // Timeout, falha de rede ou quebra de JSON no res.json()
        console.warn('[WhatsApp] Verificação falhou (Timeout/Rede) — permitindo por precaução:', err)
        return true
    }
}

export async function enviarMensagemWhatsApp(telefone: string, mensagem: string): Promise<boolean> {
    const API_URL = process.env.WHATSAPP_API_URL
    const API_TOKEN = process.env.WHATSAPP_API_TOKEN

    const limpo = telefone.replace(/\D/g, '')

    if (!API_URL || !API_TOKEN) {
        console.log(`\n📱 [WhatsApp DEV] Para: +55${limpo}\n${mensagem}\n`)
        return true
    }

    try {
        const numeroComDDI = `55${limpo}`
        const res = await fetch(`${API_URL}/send-text`, {
            method: 'POST',
            headers: {
                'Client-Token': API_TOKEN,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ phone: numeroComDDI, message: mensagem }),
            signal: AbortSignal.timeout(10_000),
        })

        if (!res.ok) {
            // Opcional: extrair o texto de erro para log
            const errorBody = await res.text().catch(() => 'No body')
            console.error(`[WhatsApp API Error] Falha no envio: HTTP ${res.status} - ${errorBody}`)
            return false
        }

        return true
    } catch (err) {
        console.error('[WhatsApp] Falha de rede ao enviar mensagem:', err)
        return false
    }
}