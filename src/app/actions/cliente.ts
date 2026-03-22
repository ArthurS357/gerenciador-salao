'use server'

import { prisma } from '@/lib/prisma'
import { cookies } from 'next/headers'
import type { Cliente } from '@/types/domain'

type ActionResult<T = object> =
    | ({ sucesso: true } & T)
    | { sucesso: false; erro: string }

export async function excluirContaCliente(clienteId: string) {
    try {
        const cliente = await prisma.cliente.findUnique({ where: { id: clienteId } })
        if (!cliente) return { sucesso: false, erro: 'Cliente não encontrado.' }

        await prisma.cliente.update({
            where: { id: clienteId },
            data: {
                nome: 'Cliente Excluído',
                // Adicionamos um sufixo com ID para garantir que o telefone não dê conflito de unique
                telefone: `EXCLUIDO-${clienteId.substring(0, 8)}`,
                anonimizado: true,
                senhaHash: null,
            }
        })

        const cookieStore = await cookies()
        cookieStore.delete('cliente_session')

        return { sucesso: true }
    } catch (error) {
        console.error('Erro ao anonimizar cliente:', error)
        return { sucesso: false, erro: 'Falha técnica ao excluir os dados.' }
    }
}

export async function listarTodosClientes(): Promise<ActionResult<{ clientes: Cliente[] }>> {
    try {
        const clientes = await prisma.cliente.findMany({
            orderBy: { nome: 'asc' },
            include: {
                _count: { select: { agendamentos: true } },
            },
        })
        return { sucesso: true, clientes: clientes as unknown as Cliente[] }
    } catch {
        return { sucesso: false, erro: 'Falha ao listar clientes.' }
    }
}