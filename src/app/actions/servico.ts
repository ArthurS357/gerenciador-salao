'use server'

import { prisma } from '@/lib/prisma'
import { Prisma } from '@prisma/client'
import { revalidatePath } from 'next/cache'
import { verificarSessaoFuncionario } from '@/app/actions/auth'

import { ActionResult } from '@/types/domain'
import { schemaServico, schemaInsumoServico } from '@/lib/schemas'
import { decimalParaNumero } from '@/lib/decimal-utils'

// Helper de conversão Decimal → number na fronteira
function mapServico(row: Record<string, unknown>): ServicoPublicoItem {
    const r = row as { preco?: Prisma.Decimal | null; [k: string]: unknown }
    return { ...r, preco: r.preco != null ? decimalParaNumero(r.preco) : null } as ServicoPublicoItem
}

export type ServicoPublicoItem = {
    id: string
    nome: string
    descricao: string | null
    preco: number | null
    tempoMinutos: number | null
    imagemUrl: string | null
    ativo: boolean
    destaque: boolean
}

type DadosCriarServico = {
    nome: string
    descricao?: string
    preco?: number | string | null
    tempoMinutos?: number | string | null
    imagemUrl?: string | null
}

// Tipo definido para o painel Admin (inclui ficha técnica de produtos)
export type ServicoComInsumosItem = Prisma.ServicoGetPayload<{
    include: {
        insumos: {
            include: {
                produto: {
                    select: { nome: true, unidadeMedida: true }
                }
            }
        }
    }
}>

// ── BLINDAGEM DE SEGURANÇA ───────────────────────────────────────────────────
/**
 * Retorna null se autorizado, ou uma string de erro caso contrário.
 * Elimina o anti-pattern de controle de fluxo via throw Error.
 */
async function checarPermissaoAdmin(): Promise<string | null> {
    const sessao = await verificarSessaoFuncionario()
    if (!sessao.logado || sessao.role !== 'ADMIN') {
        return 'Acesso negado. Apenas a gerência pode alterar os serviços.'
    }
    return null
}

// ── 1. LISTAGENS ──────────────────────────────────────────────────────────────

// Rota Pública (Livre de sessão) - Usada no site para os clientes
export async function listarServicosPublicos(): Promise<ActionResult<{ servicos: ServicoPublicoItem[] }>> {
    try {
        const servicos = await prisma.servico.findMany({
            where: { ativo: true },
            orderBy: { nome: 'asc' },
            select: {
                id: true, nome: true, descricao: true, preco: true,
                tempoMinutos: true, imagemUrl: true, ativo: true, destaque: true
            }
        })
        // Correção Crítica: Encapsulamento correto do payload 'data'
        return { sucesso: true, data: { servicos: servicos.map(mapServico) } }
    } catch (error) {
        console.error('[Serviço] Erro ao listar serviços públicos:', error)
        return { sucesso: false, erro: 'Falha ao listar serviços.' }
    }
}

// Rota Privada (Protegida) - Traz a ficha técnica sensível
export async function listarServicosAdmin(): Promise<ActionResult<{ servicos: ServicoComInsumosItem[] }>> {
    const erroAuth = await checarPermissaoAdmin()
    if (erroAuth) return { sucesso: false, erro: erroAuth }

    try {
        const servicos = await prisma.servico.findMany({
            where: { ativo: true },
            orderBy: { nome: 'asc' },
            include: {
                insumos: {
                    include: {
                        produto: {
                            select: { nome: true, unidadeMedida: true }
                        }
                    }
                }
            }
        })
        // Correção Crítica: Encapsulamento correto do payload 'data'
        return { sucesso: true, data: { servicos } }
    } catch (error) {
        console.error('[Serviço] Erro ao listar serviços do admin:', error)
        return { sucesso: false, erro: 'Falha ao listar serviços detalhados.' }
    }
}

// ── 2. CRIAÇÃO ────────────────────────────────────────────────────────────────

export async function criarServicoAdmin(
    dados: DadosCriarServico
): Promise<ActionResult<{ servico: ServicoPublicoItem }>> {
    const erroAuth = await checarPermissaoAdmin()
    if (erroAuth) return { sucesso: false, erro: erroAuth }

    const validacao = schemaServico.safeParse(dados)
    if (!validacao.success) {
        return { sucesso: false, erro: validacao.error.issues[0]?.message ?? 'Dados do serviço inválidos.' }
    }

    try {
        const servico = await prisma.servico.create({
            data: {
                nome: validacao.data.nome.trim(),
                descricao: validacao.data.descricao ?? null,
                preco: validacao.data.preco ?? null,
                tempoMinutos: validacao.data.tempoMinutos ?? null,
                imagemUrl: validacao.data.imagemUrl ?? null,
            },
            select: {
                id: true, nome: true, descricao: true, preco: true,
                tempoMinutos: true, imagemUrl: true, ativo: true, destaque: true
            }
        })

        revalidatePath('/admin/servicos')

        // Correção Crítica: Encapsulamento correto do payload 'data'
        return { sucesso: true, data: { servico: mapServico(servico as Record<string, unknown>) } }
    } catch (error) {
        console.error('[Serviço] Erro ao cadastrar serviço:', error)
        return { sucesso: false, erro: 'Falha ao cadastrar o serviço.' }
    }
}

// ── 3. LÓGICA DE DESTAQUE (Vitrine / Homepage) ────────────────────────────────

export async function alternarDestaqueServico(id: string, destaque: boolean): Promise<ActionResult> {
    const erroAuth = await checarPermissaoAdmin()
    if (erroAuth) return { sucesso: false, erro: erroAuth }

    try {
        await prisma.servico.update({
            where: { id },
            data: { destaque }
        })

        revalidatePath('/admin/servicos')
        revalidatePath('/')

        return { sucesso: true }
    } catch (error) {
        // Correção Crítica: Remoção de Error Swallowing
        console.error(`[Serviço] Erro ao alternar destaque do serviço ${id}:`, error)
        return { sucesso: false, erro: 'Falha ao alterar o status de destaque.' }
    }
}

// ── 4. GESTÃO DA FICHA TÉCNICA ────────────────────────────────────────────────

export async function adicionarInsumoFichaTecnica(
    servicoId: string,
    produtoId: string,
    quantidadeUsada: number
): Promise<ActionResult> {
    const erroAuth = await checarPermissaoAdmin()
    if (erroAuth) return { sucesso: false, erro: erroAuth }

    const validacao = schemaInsumoServico.safeParse({ servicoId, produtoId, quantidadeUsada })
    if (!validacao.success) {
        return { sucesso: false, erro: validacao.error.issues[0]?.message ?? 'Dados do insumo inválidos.' }
    }

    try {
        await prisma.insumoServico.upsert({
            where: { servicoId_produtoId: { servicoId, produtoId } },
            update: { quantidadeUsada },
            create: { servicoId, produtoId, quantidadeUsada }
        })

        revalidatePath('/admin/servicos')
        return { sucesso: true }
    } catch (error) {
        console.error(`[Serviço] Erro na ficha técnica do serviço ${servicoId}:`, error)
        return { sucesso: false, erro: 'Falha ao gravar insumo na ficha técnica.' }
    }
}

export async function removerInsumoFichaTecnica(idInsumo: string): Promise<ActionResult> {
    const erroAuth = await checarPermissaoAdmin()
    if (erroAuth) return { sucesso: false, erro: erroAuth }

    try {
        await prisma.insumoServico.delete({
            where: { id: idInsumo }
        })

        revalidatePath('/admin/servicos')
        return { sucesso: true }
    } catch (error) {
        // Correção Crítica: Remoção de Error Swallowing
        console.error(`[Serviço] Erro ao remover insumo ${idInsumo} da ficha técnica:`, error)
        return { sucesso: false, erro: 'Falha ao remover insumo da ficha técnica.' }
    }
}