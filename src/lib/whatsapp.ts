import { validarNumeroBrasileiro } from './telefone';

export async function verificarNumeroExisteNoWhatsApp(telefone: string): Promise<boolean> {
    // 1. Se o formato já for inválido, nem chama a API (barrando o 11111111 aqui)
    if (!validarNumeroBrasileiro(telefone)) {
        return false;
    }

    // 2. Aqui entraria a chamada real para a sua API do WhatsApp
    // Exemplo de como será quando você tiver a URL da API:
    /*
    const response = await fetch(`https://sua-api.com/verificar/${telefone}`);
    const data = await response.json();
    return data.existe;
    */

    // Por enquanto, como simulação para testar o bloqueio:
    // Vamos fingir que a API verificou e retornou true apenas se o formato for válido.
    return true;
}