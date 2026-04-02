'use server'

import { prisma } from '@/lib/prisma'
import { verificarSessaoFuncionario } from '@/app/actions/auth'
import type { ActionResult } from '@/types/domain'

export type AniversarianteItem = {
    id: string
    nome: string
    telefone: string
    email: string | null
    dataNascimento: Date
    /** Dia do aniversário (1-31) */
    dia: number
    /** Quantidade de atendimentos concluídos — métrica de retenção */
    totalAtendimentos: number
}

/**
 * Lista os clientes que fazem aniversário em um determinado mês.
 *
 * @param mes - Número do mês (1-12). Padrão: mês corrente.
 *
 * Nota: SQLite não possui funções nativas de extração de mês em DateTime.
 * A filtragem é feita em JavaScript após buscar apenas os clientes com
 * `dataNascimento` não-nulo — seguro para o volume esperado de um salão.
 */
export async function listarAniversariantesMes(
    mes?: number
): Promise<ActionResult<{ clientes: AniversarianteItem[]; mes: number }>> {
    const sessao = await verificarSessaoFuncionario()
    if (!sessao.logado || sessao.role !== 'ADMIN') {
        return { sucesso: false, erro: 'Acesso negado. Recurso restrito a administradores.' }
    }

    const mesAlvo = mes != null && mes >= 1 && mes <= 12
        ? mes
        : new Date().getMonth() + 1  // getMonth() retorna 0-11

    try {
        const clientesComAniversario = await prisma.cliente.findMany({
            where: {
                dataNascimento: { not: null },
                anonimizado: false,
            },
            select: {
                id: true,
                nome: true,
                telefone: true,
                email: true,
                dataNascimento: true,
                _count: { select: { agendamentos: { where: { concluido: true } } } },
            },
            orderBy: { nome: 'asc' },
        })

        const aniversariantes: AniversarianteItem[] = clientesComAniversario
            .filter(c => {
                const dt = c.dataNascimento!
                return dt.getMonth() + 1 === mesAlvo
            })
            .map(c => ({
                id: c.id,
                nome: c.nome,
                telefone: c.telefone,
                email: c.email,
                dataNascimento: c.dataNascimento!,
                dia: c.dataNascimento!.getDate(),
                totalAtendimentos: c._count.agendamentos,
            }))
            .sort((a, b) => a.dia - b.dia)  // ordena por dia do mês

        return { sucesso: true, data: { clientes: aniversariantes, mes: mesAlvo } }
    } catch (error) {
        console.error('[Aniversariantes] Erro ao listar aniversariantes:', error)
        return { sucesso: false, erro: 'Falha ao carregar aniversariantes do mês.' }
    }
}
