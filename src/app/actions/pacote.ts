'use server'

import { prisma } from '@/lib/prisma'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { verificarSessaoFuncionario } from '@/app/actions/auth'
import type { ActionResult, PacoteComServicos } from '@/types/domain'
import { decimalParaNumero } from '@/lib/decimal-utils'

// ── Schemas de Validação ──────────────────────────────────────────────────────

const schemaPacoteServico = z.object({
    servicoId: z.string().min(1, 'ID do serviço é necessário.'),
    quantidade: z.coerce
        .number()
        .int('Quantidade deve ser um número inteiro.')
        .positive('Quantidade deve ser maior que zero.')
        .max(99, 'Quantidade máxima por serviço é 99.')
        .default(1),
})

const schemaPacote = z.object({
    nome: z
        .string()
        .trim()
        .min(2, 'O nome deve ter pelo menos 2 caracteres.')
        .max(100, 'O nome não pode exceder 100 caracteres.'),
    descricao: z
        .string()
        .trim()
        .max(500, 'Descrição não pode exceder 500 caracteres.')
        .nullable()
        .optional(),
    valorBase: z.coerce
        .number()
        .min(0, 'O valor base não pode ser negativo.'),
    valorFinal: z.coerce
        .number()
        .min(0, 'O valor final não pode ser negativo.'),
    servicos: z
        .array(schemaPacoteServico)
        .min(1, 'Selecione pelo menos um serviço.')
        .max(20, 'Um pacote pode ter no máximo 20 serviços.')
        .refine(
            (itens) => new Set(itens.map(i => i.servicoId)).size === itens.length,
            'Não é permitido adicionar o mesmo serviço mais de uma vez.'
        ),
})
    .refine(
        ({ valorBase, valorFinal }) => valorFinal <= valorBase + 0.001,
        { message: 'O valor final não pode ser maior que o valor base.', path: ['valorFinal'] }
    )

type PacoteInput = z.infer<typeof schemaPacote>

// ── Guards de Autorização ─────────────────────────────────────────────────────

async function checarPermissaoRecepcionistaOuAdmin(): Promise<string | null> {
    const sessao = await verificarSessaoFuncionario()
    if (!sessao.logado || (sessao.role !== 'ADMIN' && sessao.role !== 'RECEPCIONISTA')) {
        return 'Acesso negado.'
    }
    return null
}

async function checarPermissaoAdmin(): Promise<string | null> {
    const sessao = await verificarSessaoFuncionario()
    if (!sessao.logado || sessao.role !== 'ADMIN') {
        return 'Acesso negado. Requer privilégios de administrador.'
    }
    return null
}

// ── Utilitário: Cálculo de Desconto ──────────────────────────────────────────

function calcularDesconto(valorBase: number, valorFinal: number): number {
    if (valorBase <= 0) return 0
    return parseFloat((((valorBase - valorFinal) / valorBase) * 100).toFixed(2))
}

// ── 1. Listagem de Pacotes ────────────────────────────────────────────────────

export async function listarPacotes(): Promise<ActionResult<{ pacotes: PacoteComServicos[] }>> {
    const erro = await checarPermissaoRecepcionistaOuAdmin()
    if (erro) return { sucesso: false, erro }

    try {
        const pacotes = await prisma.pacote.findMany({
            orderBy: [{ ativo: 'desc' }, { criadoEm: 'desc' }],
            include: {
                servicos: {
                    include: {
                        servico: { select: { id: true, nome: true, preco: true } }
                    }
                },
                _count: { select: { vendas: true } }
            }
        })

        const pacotesMapeados: PacoteComServicos[] = pacotes.map(p => ({
            ...p,
            valorBase: decimalParaNumero(p.valorBase),
            valorFinal: decimalParaNumero(p.valorFinal),
            desconto: decimalParaNumero(p.desconto),
            servicos: p.servicos.map(s => ({
                ...s,
                servico: { ...s.servico, preco: s.servico.preco != null ? decimalParaNumero(s.servico.preco) : null },
            })),
        }))

        return { sucesso: true, data: { pacotes: pacotesMapeados } }
    } catch (error) {
        console.error('[Pacote] Erro ao listar pacotes:', error)
        return { sucesso: false, erro: 'Falha ao carregar os pacotes.' }
    }
}

// ── 2. Criação de Pacote ──────────────────────────────────────────────────────

export async function criarPacote(
    dados: PacoteInput
): Promise<ActionResult<{ id: string }>> {
    const erro = await checarPermissaoRecepcionistaOuAdmin()
    if (erro) return { sucesso: false, erro }

    const validacao = schemaPacote.safeParse(dados)
    if (!validacao.success) {
        return { sucesso: false, erro: validacao.error.issues[0]?.message ?? 'Dados do pacote inválidos.' }
    }

    const input = validacao.data
    const desconto = calcularDesconto(input.valorBase, input.valorFinal)

    try {
        // Verifica se os serviços referenciados existem e estão ativos
        const servicosExistentes = await prisma.servico.findMany({
            where: {
                id: { in: input.servicos.map(s => s.servicoId) },
                ativo: true,
            },
            select: { id: true }
        })

        if (servicosExistentes.length !== input.servicos.length) {
            return { sucesso: false, erro: 'Um ou mais serviços selecionados não existem ou estão inativos.' }
        }

        const pacote = await prisma.pacote.create({
            data: {
                nome: input.nome,
                descricao: input.descricao ?? null,
                valorBase: input.valorBase,
                valorFinal: input.valorFinal,
                desconto,
                servicos: {
                    create: input.servicos.map(s => ({
                        servicoId: s.servicoId,
                        quantidade: s.quantidade,
                    }))
                }
            },
            select: { id: true }
        })

        revalidatePath('/admin/pacotes')
        return { sucesso: true, data: { id: pacote.id } }
    } catch (error) {
        console.error('[Pacote] Erro ao criar pacote:', error)
        return { sucesso: false, erro: 'Falha técnica ao criar o pacote.' }
    }
}

// ── 3. Edição de Pacote ───────────────────────────────────────────────────────

export async function editarPacote(
    id: string,
    dados: PacoteInput
): Promise<ActionResult> {
    const erro = await checarPermissaoRecepcionistaOuAdmin()
    if (erro) return { sucesso: false, erro }

    if (!id?.trim()) return { sucesso: false, erro: 'ID do pacote é necessário.' }

    const validacao = schemaPacote.safeParse(dados)
    if (!validacao.success) {
        return { sucesso: false, erro: validacao.error.issues[0]?.message ?? 'Dados do pacote inválidos.' }
    }

    const input = validacao.data
    const desconto = calcularDesconto(input.valorBase, input.valorFinal)

    try {
        const existente = await prisma.pacote.findUnique({ where: { id }, select: { id: true } })
        if (!existente) return { sucesso: false, erro: 'Pacote não encontrado.' }

        // Verifica se os serviços referenciados existem e estão ativos
        const servicosExistentes = await prisma.servico.findMany({
            where: {
                id: { in: input.servicos.map(s => s.servicoId) },
                ativo: true,
            },
            select: { id: true }
        })

        if (servicosExistentes.length !== input.servicos.length) {
            return { sucesso: false, erro: 'Um ou mais serviços selecionados não existem ou estão inativos.' }
        }

        // Transação: remove relações antigas e recria com os novos dados
        await prisma.$transaction(async (tx) => {
            await tx.pacoteServico.deleteMany({ where: { pacoteId: id } })

            await tx.pacote.update({
                where: { id },
                data: {
                    nome: input.nome,
                    descricao: input.descricao ?? null,
                    valorBase: input.valorBase,
                    valorFinal: input.valorFinal,
                    desconto,
                    servicos: {
                        create: input.servicos.map(s => ({
                            servicoId: s.servicoId,
                            quantidade: s.quantidade,
                        }))
                    }
                }
            })
        })

        revalidatePath('/admin/pacotes')
        return { sucesso: true }
    } catch (error) {
        console.error('[Pacote] Erro ao editar pacote:', error)
        return { sucesso: false, erro: 'Falha técnica ao editar o pacote.' }
    }
}

// ── 4. Ativar / Desativar Pacote ──────────────────────────────────────────────
/**
 * Apenas ADMIN pode ativar/desativar pacotes.
 * Recepcionistas podem criar e editar, mas não arquivar.
 */
export async function togglePacoteAtivo(id: string): Promise<ActionResult<{ ativo: boolean }>> {
    const erro = await checarPermissaoAdmin()
    if (erro) return { sucesso: false, erro }

    if (!id?.trim()) return { sucesso: false, erro: 'ID do pacote é necessário.' }

    try {
        const pacote = await prisma.pacote.findUnique({
            where: { id },
            select: { id: true, ativo: true }
        })
        if (!pacote) return { sucesso: false, erro: 'Pacote não encontrado.' }

        const novoAtivo = !pacote.ativo

        await prisma.pacote.update({
            where: { id },
            data: { ativo: novoAtivo }
        })

        revalidatePath('/admin/pacotes')
        return { sucesso: true, data: { ativo: novoAtivo } }
    } catch (error) {
        console.error('[Pacote] Erro ao alterar status do pacote:', error)
        return { sucesso: false, erro: 'Falha técnica ao alterar o status do pacote.' }
    }
}
