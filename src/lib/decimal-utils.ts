import { Prisma } from '@prisma/client'

/**
 * Utilitário de infraestrutura: converte campos Prisma.Decimal para string.
 * Evita vazamento de tipos do ORM para a camada de apresentação e preserva
 * a precisão financeira — ao contrário de `.toNumber()`, que reintroduziria
 * arredondamento IEEE 754.
 *
 * Uso: chamar em cada valor Decimal antes de retornar ao frontend.
 *
 * Exemplos:
 *   decimalParaString(agendamento.valorBruto)        → "150.00"
 *   decimalParaString(null)                           → null
 *   decimalParaNumero(agendamento.valorBruto)         → 150  (para cálculos no server)
 */

/** Converte Prisma.Decimal para string. Retorna null se o input for null/undefined. */
export function decimalParaString(val: Prisma.Decimal | null | undefined): string | null {
    if (val == null) return null
    return val.toString()
}

/** Converte Prisma.Decimal para string, com fallback se null. */
export function decimalParaStringOu(val: Prisma.Decimal | null | undefined, fallback: string = '0'): string {
    if (val == null) return fallback
    return val.toString()
}

/**
 * Converte Prisma.Decimal para number **apenas para cálculos server-side**.
 * NÃO use este valor para serializar ao frontend — use decimalParaString.
 */
export function decimalParaNumero(val: Prisma.Decimal | null | undefined): number {
    if (val == null) return 0
    return val.toNumber()
}
