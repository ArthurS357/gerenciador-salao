'use server'

import { prisma } from '@/lib/prisma'
import { randomUUID } from 'crypto'
import { cookies } from 'next/headers'
import type { Cliente } from '@/types/domain'

type ActionResult<T = object> =
    | ({ sucesso: true } & T)
    | { sucesso: false; erro: string }

export async function excluirMinhaContaLGPD(clienteId: string): Promise<ActionResult> {
    try {
        const hashNome = `Anonimizado_${randomUUID().substring(0, 8)}`
        const hashTelefone = `0000_${randomUUID().substring(0, 8)}`

        await prisma.cliente.update({
            where: { id: clienteId },
            data: { nome: hashNome, telefone: hashTelefone, anonimizado: true },
        })

        const cookieStore = await cookies()
        cookieStore.delete('cliente_session')

        return { sucesso: true }
    } catch (error) {
        console.error('Erro na exclusão de conta via LGPD:', error)
        return { sucesso: false, erro: 'Ocorreu uma falha ao processar o seu pedido.' }
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