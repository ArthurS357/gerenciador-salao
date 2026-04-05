import { StatusAgendamento } from '@prisma/client';

/**
 * Mapeamento estrito da paleta institucional (Marrom e Branco).
 * Utiliza as escalas nativas do Tailwind (Amber/Stone) para simular o 
 * espectro Dourado/Marrom exigido em contrato.
 */
export const STATUS_BADGE_THEME: Record<StatusAgendamento, string> = {
    // Neutro/Espera: Fundo branco/gelo, texto marrom acinzentado
    AGENDADO: 'bg-stone-100 text-stone-800 border-stone-200',

    // Ação Iminente: Marrom intermediário
    CONFIRMADO: 'bg-amber-700 text-white border-amber-800',

    // Ação Crítica: Marrom claro/Dourado de alto destaque
    EM_ATENDIMENTO: 'bg-amber-500 text-white border-amber-600',

    // Consolidação: Marrom muito escuro/Café, indicando encerramento
    FINALIZADO: 'bg-stone-900 text-white border-stone-900',

    // Exceção: Mantém a convenção universal de UI para falhas/cancelamentos
    CANCELADO: 'bg-red-50 text-red-800 border-red-200',
};

export const STATUS_LABEL: Record<StatusAgendamento, string> = {
    AGENDADO: 'Agendado',
    CONFIRMADO: 'Confirmado',
    EM_ATENDIMENTO: 'Em Atendimento',
    FINALIZADO: 'Finalizado',
    CANCELADO: 'Cancelado',
};