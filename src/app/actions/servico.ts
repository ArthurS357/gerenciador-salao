'use server'

import { prisma } from '@/lib/prisma'
import { Prisma } from '@prisma/client'
import { revalidatePath } from 'next/cache'
import { verificarSessaoFuncionario } from '@/app/actions/auth'

// ── TIPAGEM ESTRITA ──────────────────────────────────────────────────────────
type ActionResult<T = void> =
    | (T extends void ? { sucesso: true } : { sucesso: true } & T)
    | { sucesso: false; erro: string }

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
async function garantirPermissaoAdmin() {
    const sessao = await verificarSessaoFuncionario()
    if (!sessao.logado || sessao.role !== 'ADMIN') {
        throw new Error('Acesso negado. Apenas a gerência pode alterar os serviços.')
    }
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
        return { sucesso: true, servicos }
    } catch {
        return { sucesso: false, erro: 'Falha ao listar serviços.' }
    }
}

// Rota Privada (Protegida) - Traz a ficha técnica sensível
export async function listarServicosAdmin(): Promise<ActionResult<{ servicos: ServicoComInsumosItem[] }>> {
    try {
        await garantirPermissaoAdmin()

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
        return { sucesso: true, servicos }
    } catch (error) {
        if (error instanceof Error && error.message.includes('Acesso negado')) return { sucesso: false, erro: error.message }
        return { sucesso: false, erro: 'Falha ao listar serviços detalhados.' }
    }
}

// ── 2. CRIAÇÃO ────────────────────────────────────────────────────────────────

export async function criarServicoAdmin(
    dados: DadosCriarServico
): Promise<ActionResult<{ servico: ServicoPublicoItem }>> {
    try {
        await garantirPermissaoAdmin()

        const servico = await prisma.servico.create({
            data: {
                nome: dados.nome.trim(),
                descricao: dados.descricao?.trim() ?? null,
                preco: dados.preco != null && dados.preco !== '' && !isNaN(Number(dados.preco)) ? Number(dados.preco) : null,
                tempoMinutos:
                    dados.tempoMinutos != null && dados.tempoMinutos !== '' && !isNaN(Number(dados.tempoMinutos))
                        ? Number(dados.tempoMinutos)
                        : null,
                imagemUrl: dados.imagemUrl?.trim() ?? null,
            },
            select: {
                id: true, nome: true, descricao: true, preco: true,
                tempoMinutos: true, imagemUrl: true, ativo: true, destaque: true
            }
        })

        revalidatePath('/admin/servicos')
        return { sucesso: true, servico }
    } catch (error) {
        if (error instanceof Error && error.message.includes('Acesso negado')) return { sucesso: false, erro: error.message }
        return { sucesso: false, erro: 'Falha ao cadastrar o serviço.' }
    }
}

// ── 3. LÓGICA DE DESTAQUE (Vitrine / Homepage) ────────────────────────────────

export async function alternarDestaqueServico(id: string, destaque: boolean): Promise<ActionResult> {
    try {
        await garantirPermissaoAdmin()

        await prisma.servico.update({
            where: { id },
            data: { destaque }
        })

        revalidatePath('/admin/servicos')
        revalidatePath('/')

        return { sucesso: true }
    } catch (error) {
        if (error instanceof Error && error.message.includes('Acesso negado')) return { sucesso: false, erro: error.message }
        return { sucesso: false, erro: 'Falha ao alterar o status de destaque.' }
    }
}

// ── 4. GESTÃO DA FICHA TÉCNICA ────────────────────────────────────────────────

export async function adicionarInsumoFichaTecnica(
    servicoId: string,
    produtoId: string,
    quantidadeUsada: number
): Promise<ActionResult> {
    try {
        await garantirPermissaoAdmin()

        if (!quantidadeUsada || isNaN(quantidadeUsada) || quantidadeUsada <= 0) {
            return { sucesso: false, erro: 'A quantidade deve ser um número válido maior que zero.' }
        }

        const insumoExistente = await prisma.insumoServico.findUnique({
            where: { servicoId_produtoId: { servicoId, produtoId } }
        })

        if (insumoExistente) {
            await prisma.insumoServico.update({
                where: { id: insumoExistente.id },
                data: { quantidadeUsada }
            })
        } else {
            await prisma.insumoServico.create({
                data: { servicoId, produtoId, quantidadeUsada }
            })
        }

        revalidatePath('/admin/servicos')
        return { sucesso: true }
    } catch (error) {
        if (error instanceof Error && error.message.includes('Acesso negado')) return { sucesso: false, erro: error.message }
        console.error('Erro na ficha técnica:', error)
        return { sucesso: false, erro: 'Falha ao gravar insumo na ficha técnica.' }
    }
}

export async function removerInsumoFichaTecnica(idInsumo: string): Promise<ActionResult> {
    try {
        await garantirPermissaoAdmin()

        await prisma.insumoServico.delete({
            where: { id: idInsumo }
        })

        revalidatePath('/admin/servicos')
        return { sucesso: true }
    } catch (error) {
        if (error instanceof Error && error.message.includes('Acesso negado')) return { sucesso: false, erro: error.message }
        return { sucesso: false, erro: 'Falha ao remover insumo da ficha técnica.' }
    }
}