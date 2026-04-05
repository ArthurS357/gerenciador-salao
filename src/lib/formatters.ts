/**
 * Formata valores monetários interceptando potenciais imprecisões de tipos.
 * Delega a renderização exata para o Intl.NumberFormat.
 * * @param valor - Valor bruto vindo do Prisma (Serializado como String ou Number)
 */
export function formatarMoeda(valor: string | number | null | undefined): string {
    if (valor === null || valor === undefined) return 'R$ 0,00';

    // Se o DTO enviou como string (recomendado pela refatoração), fazemos o parse seguro
    const numero = typeof valor === 'string' ? parseFloat(valor) : valor;

    if (isNaN(numero)) return 'R$ 0,00';

    return new Intl.NumberFormat('pt-BR', {
        style: 'currency',
        currency: 'BRL',
    }).format(numero);
}