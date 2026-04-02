'use server'

import { prisma } from '@/lib/prisma'
import { verificarSessaoFuncionario } from '@/app/actions/auth'
import { z } from 'zod'
import type { ActionResult, MetodoPagamento } from '@/types/domain'
import { METODOS_COM_BANDEIRA } from '@/lib/pagamento-constantes'
import { revalidatePath } from 'next/cache'

// ── Schema de Validação ───────────────────────────────────────────────────────

const schemaTaxaMetodo = z.object({
    metodo: z.enum(['DINHEIRO', 'PIX', 'CARTAO_DEBITO', 'CARTAO_CREDITO', 'CORTESIA', 'VOUCHER', 'PERMUTA'], {
        message: 'Método de pagamento inválido.',
    }),
    bandeira: z.string().default('').refine(
        v => ['', 'VISA', 'MASTERCARD', 'ELO', 'AMEX', 'HIPERCARD'].includes(v),
        { message: 'Bandeira inválida.' }
    ),
    descricao: z.string().trim().max(100).nullable().optional(),
    taxaBase: z.coerce
        .number()
        .min(0, 'A taxa não pode ser negativa.')
        .max(20, 'A taxa não pode exceder 20%.'),
    ativo: z.boolean().default(true),
})

// ── Tipos exportados ──────────────────────────────────────────────────────────

export type TaxaMetodoView = {
    id: string
    metodo: string
    bandeira: string
    descricao: string | null
    taxaBase: number
    ativo: boolean
    criadoEm: Date
}

type SalvarTaxaInput = z.infer<typeof schemaTaxaMetodo>

// ── Auxiliar de permissão ─────────────────────────────────────────────────────

async function checarAdmin(): Promise<string | null> {
    const sessao = await verificarSessaoFuncionario()
    if (!sessao.logado || sessao.role !== 'ADMIN') return 'Acesso negado. Apenas administradores.'
    return null
}

// ── 1. Listar ─────────────────────────────────────────────────────────────────

export async function listarTaxasMetodoPagamento(): Promise<ActionResult<{ taxas: TaxaMetodoView[] }>> {
    const erro = await checarAdmin()
    if (erro) return { sucesso: false, erro }

    try {
        const taxas = await prisma.taxaMetodoPagamento.findMany({
            orderBy: [{ metodo: 'asc' }, { bandeira: 'asc' }],
            select: { id: true, metodo: true, bandeira: true, descricao: true, taxaBase: true, ativo: true, criadoEm: true },
        })
        return { sucesso: true, data: { taxas } }
    } catch (error) {
        console.error('[Taxas] Erro ao listar:', error)
        return { sucesso: false, erro: 'Falha ao carregar taxas.' }
    }
}

// ── 2. Salvar (upsert por metodo + bandeira) ──────────────────────────────────

export async function salvarTaxaMetodoPagamento(dados: SalvarTaxaInput): Promise<ActionResult<{ taxa: TaxaMetodoView }>> {
    const erroAuth = await checarAdmin()
    if (erroAuth) return { sucesso: false, erro: erroAuth }

    const validacao = schemaTaxaMetodo.safeParse(dados)
    if (!validacao.success) {
        return { sucesso: false, erro: validacao.error.issues[0]?.message ?? 'Dados inválidos.' }
    }

    const { metodo, bandeira, descricao, taxaBase, ativo } = validacao.data

    // Bandeira só faz sentido para métodos de cartão
    const bandeiraNormalizada = METODOS_COM_BANDEIRA.includes(metodo as MetodoPagamento) ? bandeira : ''

    try {
        const taxa = await prisma.taxaMetodoPagamento.upsert({
            where: { metodo_bandeira: { metodo, bandeira: bandeiraNormalizada } },
            create: { metodo, bandeira: bandeiraNormalizada, descricao: descricao ?? null, taxaBase, ativo },
            update: { descricao: descricao ?? null, taxaBase, ativo },
            select: { id: true, metodo: true, bandeira: true, descricao: true, taxaBase: true, ativo: true, criadoEm: true },
        })
        revalidatePath('/admin/financeiro')
        return { sucesso: true, data: { taxa } }
    } catch (error) {
        console.error('[Taxas] Erro ao salvar:', error)
        return { sucesso: false, erro: 'Falha ao salvar taxa.' }
    }
}

// ── 3. Excluir ────────────────────────────────────────────────────────────────

export async function excluirTaxaMetodoPagamento(id: string): Promise<ActionResult> {
    const erro = await checarAdmin()
    if (erro) return { sucesso: false, erro }

    if (!id) return { sucesso: false, erro: 'ID inválido.' }

    try {
        await prisma.taxaMetodoPagamento.delete({ where: { id } })
        revalidatePath('/admin/financeiro')
        return { sucesso: true }
    } catch (error) {
        console.error('[Taxas] Erro ao excluir:', error)
        return { sucesso: false, erro: 'Falha ao excluir taxa.' }
    }
}
