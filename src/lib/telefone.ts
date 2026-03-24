import { isValidPhoneNumber } from 'libphonenumber-js';

export function validarNumeroBrasileiro(telefone: string): boolean {
    try {
        // Remove qualquer caractere que não seja número
        const apenasNumeros = telefone.replace(/\D/g, '');

        // Um celular no Brasil com DDD tem 11 dígitos (Ex: 11999999999)
        // Um telefone fixo com DDD tem 10 dígitos (Ex: 1144444444)
        if (apenasNumeros.length < 10 || apenasNumeros.length > 11) {
            return false;
        }

        // Adiciona o +55 para forçar a biblioteca a validar estritamente como número brasileiro
        const numeroComDDI = apenasNumeros.startsWith('55')
            ? `+${apenasNumeros}`
            : `+55${apenasNumeros}`;

        return isValidPhoneNumber(numeroComDDI, 'BR');
    } catch (error) {
        return false;
    }
}