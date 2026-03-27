// src/lib/whatsapp.ts

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export async function verificarNumeroExisteNoWhatsApp(telefone: string): Promise<boolean> {
    // Em produção, isso faria uma requisição à API do WhatsApp para validar o número.
    // Para evitar bloqueio no cadastro local, retornamos true como padrão.
    return true;
}

export async function enviarMensagemWhatsApp(telefone: string, mensagem: string): Promise<boolean> {
    try {
        // Variáveis que você configurará no seu arquivo .env quando assinar uma API
        const API_URL = process.env.WHATSAPP_API_URL;
        const API_TOKEN = process.env.WHATSAPP_API_TOKEN;

        // Se não houver API configurada, rodamos em modo MOCK (Simulação)
        if (!API_URL || !API_TOKEN) {
            console.log('\n=============================================');
            console.log(`[WHATSAPP MOCK] Simulando envio para: ${telefone}`);
            console.log(`Mensagem:\n${mensagem}`);
            console.log('=============================================\n');
            return true;
        }

        // Exemplo de integração real (Padrão genérico de disparo POST, compatível com Z-API / Evolution API)
        const res = await fetch(`${API_URL}/message/sendText`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${API_TOKEN}`,
                'apikey': API_TOKEN
            },
            body: JSON.stringify({
                number: telefone,
                options: { delay: 1200, presence: 'composing' }, // Simula o "Digitando..."
                textMessage: { text: mensagem }
            })
        });

        return res.ok;
    } catch (error) {
        console.error('[WHATSAPP ERROR] Falha ao enviar mensagem de confirmação:', error);
        return false;
    }
}