import { isValidPhoneNumber, parsePhoneNumberFromString } from 'libphonenumber-js'

const DIGITOS_REPETIDOS = /^(\d)\1+$/

/**
 * Lista de DDDs válidos no Brasil (ANATEL)
 * Evita cadastros de números inexistentes como (00), (10), (20), etc.
 */
const DDDS_VALIDOS = new Set([
    '11', '12', '13', '14', '15', '16', '17', '18', '19',
    '21', '22', '24', '27', '28',
    '31', '32', '33', '34', '35', '37', '38',
    '41', '42', '43', '44', '45', '46', '47', '48', '49',
    '51', '53', '54', '55',
    '61', '62', '63', '64', '65', '66', '67', '68', '69',
    '71', '73', '74', '75', '77', '79',
    '81', '82', '83', '84', '85', '86', '87', '88', '89',
    '91', '92', '93', '94', '95', '96', '97', '98', '99'
]);

function normalizarTelefone(telefone: string): string {
    return telefone.replace(/\D/g, '')
}

/**
 * Valida se o número é um CELULAR brasileiro válido.
 * Verifica: DDD real, nono dígito, repetições e metadados da biblioteca.
 */
export function validarNumeroBrasileiro(telefone: string): boolean {
    const digitos = normalizarTelefone(telefone)

    // 1. Verificações básicas de integridade
    if (digitos.length !== 11) return false
    if (DIGITOS_REPETIDOS.test(digitos)) return false

    // 2. Validação de DDD Geográfico
    const ddd = digitos.substring(0, 2)
    if (!DDDS_VALIDOS.has(ddd)) return false

    // 3. Validação profunda via metadados (Mobile/Celular)
    const phoneNumber = parsePhoneNumberFromString(`+55${digitos}`, 'BR')
    return !!phoneNumber && phoneNumber.isValid() && phoneNumber.getType() === 'MOBILE'
}

/**
 * Valida qualquer telefone brasileiro (Fixo ou Celular) com DDD.
 * Útil para cadastros mais permissivos.
 */
export function validarTelefoneBrasileiro(telefoneRaw: string): boolean {
    const digitos = normalizarTelefone(telefoneRaw)

    if (digitos.length < 10 || digitos.length > 11) return false
    if (DIGITOS_REPETIDOS.test(digitos)) return false

    const ddd = digitos.substring(0, 2)
    if (!DDDS_VALIDOS.has(ddd)) return false

    // Confia na biblioteca para validar a estrutura final do número
    return isValidPhoneNumber(`+55${digitos}`, 'BR')
}

/**
 * Helper para formatar o número antes de salvar no banco de dados.
 * Remove máscaras e garante o formato limpo.
 */
export function sanitizarParaBanco(telefone: string): string {
    return normalizarTelefone(telefone)
}