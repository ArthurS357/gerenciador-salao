/**
 * whatsapp.ts — Integração WhatsApp Business
 *
 * Variáveis de ambiente para modo produção:
 *   WHATSAPP_API_URL   — URL base do provedor (Z-API, WATI, Twilio, etc.)
 *   WHATSAPP_API_TOKEN — Token de autenticação do provedor
 *
 * Sem essas variáveis, opera em modo desenvolvimento:
 *   · verificarNumeroExisteNoWhatsApp → valida apenas o formato do número
 *   · enviarMensagemWhatsApp          → loga no console em vez de enviar
 */

const API_URL = process.env.WHATSAPP_API_URL
const API_TOKEN = process.env.WHATSAPP_API_TOKEN

/** Valida formato brasileiro: DDD (2 dígitos) + número (8 ou 9 dígitos) */
function validarFormato(telefoneLimpo: string): boolean {
    return /^(\d{2})(9\d{8}|\d{8})$/.test(telefoneLimpo)
}

export async function verificarNumeroExisteNoWhatsApp(telefone: string): Promise<boolean> {
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
        const res = await fetch(`${API_URL}/phone-exists/${limpo}`, {
            headers: { 'Client-Token': API_TOKEN },
            signal: AbortSignal.timeout(5_000),
        })
        if (!res.ok) return false
        const data = await res.json() as { exists?: boolean; value?: boolean }
        return data.exists === true || data.value === true
    } catch (err) {
        // Timeout ou falha de rede: permissivo para não bloquear clientes
        console.warn('[WhatsApp] Verificação falhou — permitindo por precaução:', err)
        return true
    }
}

export async function enviarMensagemWhatsApp(telefone: string, mensagem: string): Promise<boolean> {
    const limpo = telefone.replace(/\D/g, '')

    if (!API_URL || !API_TOKEN) {
        console.log(`\n📱 [WhatsApp DEV] Para: +55${limpo}\n${mensagem}\n`)
        return true
    }

    try {
        const res = await fetch(`${API_URL}/send-text`, {
            method: 'POST',
            headers: {
                'Client-Token': API_TOKEN,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ phone: `55${limpo}`, message: mensagem }),
            signal: AbortSignal.timeout(10_000),
        })
        return res.ok
    } catch (err) {
        console.error('[WhatsApp] Falha ao enviar mensagem:', err)
        return false
    }
}