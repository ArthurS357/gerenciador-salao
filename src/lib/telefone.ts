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