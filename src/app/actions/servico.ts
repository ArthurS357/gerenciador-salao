'use server'

import { prisma } from '@/lib/prisma'
import { revalidatePath } from 'next/cache'
import type { Servico } from '@/types/domain'

type ActionResult<T = object> =
    | ({ sucesso: true } & T)
    | { sucesso: false; erro: string }

type DadosCriarServico = {
    nome: string
    descricao?: string
    preco?: number | string | null
    tempoMinutos?: number | string | null
    imagemUrl?: string | null
}

export async function listarServicosPublicos(): Promise<ActionResult<{ servicos: Servico[] }>> {
    try {
        const servicos = await prisma.servico.findMany({
            where: { ativo: true },
            orderBy: { nome: 'asc' },
        })
        return { sucesso: true, servicos: servicos as Servico[] }
    } catch {
        return { sucesso: false, erro: 'Falha ao listar serviços.' }
    }
}

export async function listarServicosAdmin(): Promise<ActionResult<{ servicos: any[] }>> {
    try {
        const servicos = await prisma.servico.findMany({
            where: { ativo: true },
            orderBy: { nome: 'asc' },
            include: {
                // Traz a ficha técnica junto com o serviço
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
    } catch {
        return { sucesso: false, erro: 'Falha ao listar serviços.' }
    }
}

export async function criarServicoAdmin(
    dados: DadosCriarServico
): Promise<ActionResult<{ servico: Servico }>> {
    try {
        const servico = await prisma.servico.create({
            data: {
                nome: dados.nome,
                descricao: dados.descricao ?? null,
                preco: dados.preco != null && dados.preco !== '' ? Number(dados.preco) : null,
                tempoMinutos:
                    dados.tempoMinutos != null && dados.tempoMinutos !== ''
                        ? Number(dados.tempoMinutos)
                        : null,
                imagemUrl: dados.imagemUrl ?? null,
            },
        })
        revalidatePath('/admin/servicos')
        return { sucesso: true, servico: servico as Servico }
    } catch {
        return { sucesso: false, erro: 'Falha ao cadastrar o serviço.' }
    }
}

// ── NOVA LÓGICA: GESTÃO DA FICHA TÉCNICA ──────────────────────────────────────

export async function adicionarInsumoFichaTecnica(
    servicoId: string,
    produtoId: string,
    quantidadeUsada: number
): Promise<ActionResult> {
    try {
        if (quantidadeUsada <= 0) return { sucesso: false, erro: 'A quantidade deve ser maior que zero.' }

        // Verifica se já existe o mesmo produto neste serviço para atualizar em vez de duplicar
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
        console.error('Erro na ficha técnica:', error)
        return { sucesso: false, erro: 'Falha ao gravar insumo na ficha técnica.' }
    }
}

export async function removerInsumoFichaTecnica(idInsumo: string): Promise<ActionResult> {
    try {
        await prisma.insumoServico.delete({
            where: { id: idInsumo }
        })
        revalidatePath('/admin/servicos')
        return { sucesso: true }
    } catch (error) {
        return { sucesso: false, erro: 'Falha ao remover insumo da ficha técnica.' }
    }
}