'use server'

import { prisma } from '@/lib/prisma'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { verificarSessaoFuncionario } from '@/app/actions/auth'
import type { ActionResult, DividaCliente, StatusDivida } from '@/types/domain'

// ── Tipos exportados para uso na UI ──────────────────────────────────────────

export type DividaClienteDetalhada = DividaCliente & {
    agendamento: {
        dataHoraInicio: Date
        valorBruto: number
    } | null
}

// ── Schemas de Validação ──────────────────────────────────────────────────────

const schemaQuitarDivida = z.object({
    dividaId: z.string().min(1, 'ID da dívida é necessário.'),
    valorQuitado: z.coerce
        .number()
        .positive('O valor a quitar deve ser maior que zero.')
        .max(1_000_000, 'Valor excede o limite permitido.'),
    observacao: z.string().trim().max(500, 'Observação não pode exceder 500 caracteres.').optional(),
})

// ── Guard de Autorização ──────────────────────────────────────────────────────

async function checarPermissao(): Promise<string | null> {
    const sessao = await verificarSessaoFuncionario()
    if (!sessao.logado || (sessao.role !== 'ADMIN' && sessao.role !== 'RECEPCIONISTA')) {
        return 'Acesso negado.'
    }
    return null
}

// ── 1. Listagem de Dívidas por Cliente ───────────────────────────────────────

export async function listarDividasCliente(
    clienteId: string
): Promise<ActionResult<{ dividas: DividaClienteDetalhada[] }>> {
    const erro = await checarPermissao()
    if (erro) return { sucesso: false, erro }

    if (!clienteId?.trim()) return { sucesso: false, erro: 'ID do cliente é necessário.' }

    try {
        const dividas = await prisma.dividaCliente.findMany({
            where: { clienteId },
            orderBy: { criadoEm: 'desc' },
            select: {
                id: true,
                clienteId: true,
                agendamentoId: true,
                valorOriginal: true,
                valorQuitado: true,
                status: true,
                observacao: true,
                criadoEm: true,
                quitadoEm: true,
                agendamento: {
                    select: {
                        dataHoraInicio: true,
                        valorBruto: true,
                    }
                }
            }
        })

        // Garante que `status` bate com o union type do domínio
        const dividasTypadas = dividas.map(d => ({
            ...d,
            status: d.status as StatusDivida,
        }))

        return { sucesso: true, data: { dividas: dividasTypadas } }
    } catch (error) {
        console.error('[Divida] Erro ao listar dívidas do cliente:', error)
        return { sucesso: false, erro: 'Falha ao carregar o histórico de dívidas.' }
    }
}

// ── 2. Verificar se Cliente tem Dívida Pendente ───────────────────────────────
/**
 * Utilidade leve para a listagem de clientes: evita carregar todas as dívidas
 * somente para exibir o indicador visual de inadimplência.
 */
export async function clienteTemDividaPendente(clienteId: string): Promise<boolean> {
    try {
        const divida = await prisma.dividaCliente.findFirst({
            where: { clienteId, status: { in: ['PENDENTE', 'PARCIAL'] } },
            select: { id: true },
        })
        return divida !== null
    } catch {
        return false
    }
}

// ── 3. Quitar (parcial ou total) uma Dívida ───────────────────────────────────
/**
 * Aplica um pagamento sobre uma DividaCliente.
 * - Quitação total: seta status = 'QUITADA', libera comissão do profissional.
 * - Quitação parcial: seta status = 'PARCIAL'.
 * Utiliza transação para garantir consistência entre DividaCliente e Agendamento.
 */
export async function quitarDivida(
    dividaId: string,
    valorQuitado: number,
    observacao?: string
): Promise<ActionResult<{ novoStatus: StatusDivida; saldoRestante: number }>> {
    const erro = await checarPermissao()
    if (erro) return { sucesso: false, erro }

    const validacao = schemaQuitarDivida.safeParse({ dividaId, valorQuitado, observacao })
    if (!validacao.success) {
        return { sucesso: false, erro: validacao.error.issues[0]?.message ?? 'Dados inválidos.' }
    }

    const input = validacao.data

    try {
        const divida = await prisma.dividaCliente.findUnique({ where: { id: dividaId } })
        if (!divida) return { sucesso: false, erro: 'Dívida não encontrada.' }
        if (divida.status === 'QUITADA') return { sucesso: false, erro: 'Esta dívida já foi integralmente quitada.' }

        const saldoPendente = divida.valorOriginal - divida.valorQuitado
        if (input.valorQuitado > saldoPendente + 0.01) {
            return {
                sucesso: false,
                erro: `Valor excede o saldo pendente de R$ ${saldoPendente.toFixed(2)}.`
            }
        }

        const novoValorQuitado = Math.min(
            divida.valorQuitado + input.valorQuitado,
            divida.valorOriginal
        )
        const saldoRestante = Math.max(0, divida.valorOriginal - novoValorQuitado)

        const novoStatus: StatusDivida =
            saldoRestante < 0.01 ? 'QUITADA'
            : novoValorQuitado > 0 ? 'PARCIAL'
            : 'PENDENTE'

        await prisma.$transaction(async (tx) => {
            await tx.dividaCliente.update({
                where: { id: dividaId },
                data: {
                    valorQuitado: novoValorQuitado,
                    status: novoStatus,
                    quitadoEm: novoStatus === 'QUITADA' ? new Date() : null,
                    observacao: input.observacao ?? divida.observacao,
                }
            })

            // Se dívida totalmente quitada, libera a comissão retida do profissional
            if (novoStatus === 'QUITADA' && divida.agendamentoId) {
                await tx.agendamento.update({
                    where: { id: divida.agendamentoId },
                    data: {
                        comissaoLiberada: true,
                        // Zera o saldo pendente no agendamento também
                        valorPendente: 0,
                        valorPago: { increment: input.valorQuitado },
                    }
                })
            }
        })

        revalidatePath('/admin/clientes')
        revalidatePath('/admin/financeiro')

        return { sucesso: true, data: { novoStatus, saldoRestante } }
    } catch (error) {
        console.error('[Divida] Erro ao quitar dívida:', error)
        return { sucesso: false, erro: 'Falha técnica ao processar a quitação.' }
    }
}
