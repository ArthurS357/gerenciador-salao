'use server'

import { prisma } from '@/lib/prisma';

export async function buscarProfissionais() {
    try {
        const profissionais = await prisma.funcionario.findMany({
            where: { role: 'PROFISSIONAL' },
            select: { id: true, nome: true },
            orderBy: { nome: 'asc' }
        });
        return { sucesso: true, profissionais };
    } catch (error) {
        console.error('Erro ao buscar profissionais:', error);
        return { sucesso: false, profissionais: [] };
    }
}