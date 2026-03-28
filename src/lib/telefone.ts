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
    // 1. Remove tudo que não for número (ex: parênteses, traços, espaços)
    const telefone = telefoneRaw.replace(/\D/g, '');

    // 2. Verifica se o tamanho é 10 (Fixo) ou 11 (Celular)
    if (telefone.length < 10 || telefone.length > 11) {
        return false;
    }

    // 3. Bloqueia sequências de números iguais (ex: 11111111111, 00000000000)
    if (/^(\d)\1+$/.test(telefone)) {
        return false;
    }

    // 4. Bloqueia padrões conhecidos de spam digitados no teclado
    const sequenciasInvalidas = ['12312312312', '12345678909', '01234567890'];
    if (sequenciasInvalidas.includes(telefone)) {
        return false;
    }

    // 5. Validação de DDD (DDDs válidos no Brasil vão de 11 a 99)
    const ddd = parseInt(telefone.substring(0, 2));
    if (ddd < 11 || ddd > 99) {
        return false;
    }

    // 6. Se for celular (11 dígitos), o terceiro dígito deve ser obrigatoriamente 9
    if (telefone.length === 11 && telefone.charAt(2) !== '9') {
        return false;
    }

    return true;
}