import { isValidPhoneNumber } from 'libphonenumber-js';

export function validarNumeroBrasileiro(telefone: string): boolean {
    try {
        // Remove qualquer caractere que não seja número
        const apenasNumeros = telefone.replace(/\D/g, '');

        // 1. Bloqueia sequências de números repetidos (ex: 11111111111, 00000000000)
        if (/^(\d)\1+$/.test(apenasNumeros)) {
            return false;
        }

        // 2. Exige o tamanho exato de um celular no Brasil com DDD (11 dígitos)
        if (apenasNumeros.length !== 11) {
            return false;
        }

        // 3. O primeiro número após o DDD (nono dígito) deve ser obrigatoriamente '9'
        if (apenasNumeros.substring(2, 3) !== '9') {
            return false;
        }

        // 4. Adiciona o DDI e passa pela validação oficial do Google
        const numeroComDDI = `+55${apenasNumeros}`;
        return isValidPhoneNumber(numeroComDDI, 'BR');
    } catch {
        return false;
    }
}

export function validarTelefoneBrasileiro(telefoneRaw: string): boolean {
    // Passo 1: Removemos qualquer caractere que não seja número (parênteses, traços, etc)
    const telefone = telefoneRaw.replace(/\D/g, '');

    // Passo 2: Verificamos o tamanho básico (10 para fixo, 11 para celular)
    if (telefone.length < 10 || telefone.length > 11) {
        return false;
    }

    // Passo 3: Bloqueamos sequências idênticas (ex: 11111111111, 2222222222)
    if (/^(\d)\1+$/.test(telefone)) {
        return false;
    }

    // Passo 4: Validamos se o DDD existe (de 11 a 99)
    const ddd = parseInt(telefone.substring(0, 2));
    if (ddd < 11 || ddd > 99) {
        return false;
    }

    // Passo 5: Isolamos o primeiro dígito após o DDD (o 3º dígito da string)
    const terceiroDigito = telefone.charAt(2);

    // Passo 6: Aplicamos o bloqueio estrutural da Anatel
    if (telefone.length === 10) {
        // Se for 10 dígitos, é tratado como FIXO. 
        // Telefones fixos obrigatoriamente começam com 2, 3, 4 ou 5.
        if (!['2', '3', '4', '5'].includes(terceiroDigito)) {
            return false; // Bloqueia números como 1188887777
        }
    } else if (telefone.length === 11) {
        // Se for 11 dígitos, é tratado como CELULAR.
        // Celulares obrigatoriamente começam com o dígito 9.
        if (terceiroDigito !== '9') {
            return false; // Bloqueia celulares com formato incorreto
        }
    }

    // Se passou por todas as barreiras, o número tem uma estrutura real e válida.
    return true;
}