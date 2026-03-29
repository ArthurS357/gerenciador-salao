'use server'

import { prisma } from '@/lib/prisma'
import { ActionResult } from '@/types/domain'
import { cache } from 'react'

export type ProfissionalPublico = {
    id: string
    nome: string
    fotoUrl: string | null
}

/**
 * Busca a lista de profissionais ativos para exibição pública.
 * - Implementa 'select' restritivo para evitar vazamento de PII.
 * - Envolvido em React cache() para deduplicação da query no ciclo de vida da requisição,
 * protegendo o banco de dados em caso de tráfego massivo.
 */
export const buscarProfissionais = cache(async (): Promise<ActionResult<{ profissionais: ProfissionalPublico[] }>> => {
    try {
        const profissionais = await prisma.funcionario.findMany({
            where: {
                role: 'PROFISSIONAL',
                ativo: true
            },
            select: {
                id: true,
                nome: true,
                fotoUrl: true
            },
            orderBy: {
                nome: 'asc'
            }
        });

        return {
            sucesso: true,
            profissionais
        };
    } catch (error) {
        console.error('Erro ao buscar profissionais:', error);
        return {
            sucesso: false,
            erro: 'Não foi possível carregar a lista de profissionais no momento.'
        };
    }
})