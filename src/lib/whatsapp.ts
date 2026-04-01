'use server'

/**
 * whatsapp.ts — Integração WhatsApp Business com Z-API
 *
 * Variáveis de ambiente para modo produção (Z-API):
 * ZAPI_INSTANCE — ID da instância Z-API
 * ZAPI_TOKEN    — Token de autenticação da Z-API
 *
 * Sem essas variáveis, opera em modo desenvolvimento:
 * · verificarNumeroExisteNoWhatsApp → valida apenas o formato do número
 * · enviarMensagemWhatsApp          → simula envio com [Z-API SIMULADA]
 *
 * Feature Toggle: Se as credenciais não existirem, o sistema funciona normalmente
 * em modo simulado, sem quebrar o fluxo da aplicação.
 */

/** Valida formato brasileiro: DDD (2 dígitos) + número (8 ou 9 dígitos) */
function validarFormato(telefoneLimpo: string): boolean {
    return /^(\d{2})(9\d{8}|\d{8})$/.test(telefoneLimpo)
}

export async function verificarNumeroExisteNoWhatsApp(telefone: string): Promise<boolean> {
    const ZAPI_INSTANCE = process.env.ZAPI_INSTANCE
    const ZAPI_TOKEN = process.env.ZAPI_TOKEN

    const limpo = telefone.replace(/\D/g, '')

    if (!validarFormato(limpo)) return false

    // Fallback: Se credenciais não configuradas, aceita o formato
    if (!ZAPI_INSTANCE || !ZAPI_TOKEN) {
        console.log('[Z-API SIMULADA] Verificação de número em modo simulado')
        return true
    }

    try {
        const numeroComDDI = `55${limpo}`
        const res = await fetch(
            `https://api.z-api.io/instances/${ZAPI_INSTANCE}/token/${ZAPI_TOKEN}/phone-exists/${numeroComDDI}`,
            {
                method: 'GET',
                signal: AbortSignal.timeout(5_000),
            }
        )

        if (!res.ok) {
            console.error(`[Z-API Error] HTTP ${res.status} ao verificar número. Permitindo por fallback.`)
            return true
        }

        const data = await res.json() as { exists?: boolean; value?: boolean }
        return data.exists === true || data.value === true
    } catch (err) {
        console.warn('[Z-API] Verificação falhou (Timeout/Rede) — permitindo por precaução:', err)
        return true
    }
}

export async function enviarMensagemWhatsApp(telefone: string, mensagem: string): Promise<boolean> {
    const ZAPI_INSTANCE = process.env.ZAPI_INSTANCE
    const ZAPI_TOKEN = process.env.ZAPI_TOKEN

    const limpo = telefone.replace(/\D/g, '')

    // Feature Toggle: Fallback seguro quando credenciais não existem
    if (!ZAPI_INSTANCE || !ZAPI_TOKEN) {
        console.log(`\n📱 [Z-API SIMULADA] Para: +55${limpo}\n"${mensagem}"\n`)
        return true
    }

    try {
        const numeroComDDI = `55${limpo}`
        const res = await fetch(
            `https://api.z-api.io/instances/${ZAPI_INSTANCE}/token/${ZAPI_TOKEN}/send-text`,
            {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    phone: numeroComDDI,
                    message: mensagem,
                }),
                signal: AbortSignal.timeout(10_000),
            }
        )

        if (!res.ok) {
            const errorBody = await res.text().catch(() => 'No body')
            console.error(`[Z-API Error] Falha no envio: HTTP ${res.status} - ${errorBody}`)
            return false
        }

        return true
    } catch (err) {
        console.error('[Z-API] Falha de rede ao enviar mensagem:', err)
        return false
    }
}