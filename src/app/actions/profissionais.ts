'use server'

import { prisma } from '@/lib/prisma'
import { ActionResult } from '@/types/domain'

export type ProfissionalPublico = {
    id: string
    nome: string
    fotoUrl: string | null
}

/**
 * Busca a lista de profissionais ativos para exibição pública.
 * Implementa 'select' restritivo para evitar vazamento de PII (Personally Identifiable Information).
 */
export async function buscarProfissionais(): Promise<ActionResult<{ profissionais: ProfissionalPublico[] }>> {
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
}