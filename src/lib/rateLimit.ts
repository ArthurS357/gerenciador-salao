// src/lib/rateLimit.ts

// Cria um mapa em memória para armazenar o histórico de requisições
const rateLimitCache = new Map<string, { count: number; timestamp: number }>();

export function verificarRateLimit(identificador: string): boolean {
    const agora = Date.now();
    const janelaTempoMs = 60 * 1000; // Define a janela de tempo para 1 minuto
    const limiteRequisicoes = 3; // Permite no máximo 3 agendamentos por minuto por usuário

    // Busca o registro atual do usuário no mapa
    const registro = rateLimitCache.get(identificador);

    // Se não houver registro ou o tempo da última requisição já expirou
    if (!registro || (agora - registro.timestamp > janelaTempoMs)) {
        // Cria ou reseta o contador para 1 e atualiza o timestamp
        rateLimitCache.set(identificador, { count: 1, timestamp: agora });
        return true; // Libera a requisição
    }

    // Se o registro existe e ainda está dentro da janela de tempo, verifica o limite
    if (registro.count < limiteRequisicoes) {
        registro.count += 1; // Incrementa o contador
        return true; // Libera a requisição
    }

    // Se o contador exceder o limite, bloqueia a requisição
    return false;
}
