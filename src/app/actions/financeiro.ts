'use server'

import { prisma } from '@/lib/prisma'
import type { FinanceiroResumo, FuncionarioResumo, FechamentoComanda } from '@/types/domain'

type ActionResult<T = object> =
    | ({ sucesso: true } & T)
    | { sucesso: false; erro: string }

export async function obterResumoFinanceiro(): Promise<ActionResult<FinanceiroResumo>> {
    try {
        const agendamentos = await prisma.agendamento.findMany({
            where: { concluido: true },
            include: {
                funcionario: true,
                produtos: { include: { produto: true } },
                servicos: true,
            },
        })

        let faturamentoBruto = 0
        let custoProdutos = 0
        let totalComissoes = 0
        let totalTaxas = 0

        for (const ag of agendamentos) {
            faturamentoBruto += ag.valorBruto
            totalTaxas += ag.taxas ?? 0

            // 1. Custo de Insumos Internos (Salvo diretamente no fechamento da comanda pela Ficha Técnica)
            // Usamos 'any' aqui temporariamente caso o TypeScript não reconheça o novo campo até compilar
            const custoInsumosInternos = (ag as any).custoInsumos ?? 0

            // 2. Custo de Revenda (Produtos físicos vendidos diretamente na comanda)
            let custoRevenda = 0
            for (const item of ag.produtos) {
                const custoBase = item.produto?.precoCusto ?? (item.precoCobrado * 0.5); // Fallback
                custoRevenda += custoBase * item.quantidade
            }

            // Agrupamos os custos de revenda com os custos da ficha técnica
            custoProdutos += (custoInsumosInternos + custoRevenda)

            // 3. Comissões (Apenas sobre serviços prestados)
            const valorServicos = ag.servicos.reduce(
                (acc, s) => acc + (s.precoCobrado ?? 0),
                0
            )
            totalComissoes += valorServicos * (ag.funcionario.comissao / 100)
        }

        // Subtraímos todas as despesas reais do salão
        const lucroLiquido = faturamentoBruto - custoProdutos - totalComissoes - totalTaxas

        const equipe = await prisma.funcionario.findMany({
            where: { role: 'PROFISSIONAL', ativo: true },
            select: { id: true, nome: true, comissao: true, podeVerComissao: true },
        })

        return {
            sucesso: true,
            faturamentoBruto,
            custoProdutos,
            totalComissoes,
            lucroLiquido,
            equipe: equipe as FuncionarioResumo[],
        }
    } catch (error) {
        console.error('Erro no módulo financeiro:', error)
        return { sucesso: false, erro: 'Falha ao processar dados financeiros.' }
    }
}

export async function atualizarComissaoFuncionario(
    id: string,
    comissao: number,
    podeVerComissao: boolean
): Promise<ActionResult> {
    try {
        await prisma.funcionario.update({
            where: { id },
            data: { comissao, podeVerComissao },
        })
        return { sucesso: true }
    } catch (error) {
        console.error('Erro ao atualizar comissão:', error)
        return { sucesso: false, erro: 'Erro ao atualizar configurações do profissional.' }
    }
}

export async function calcularFechamentoComanda(
    agendamentoId: string,
    taxaAdquirentePercentual: number = 3,
    custoInsumos: number
): Promise<ActionResult<{ financeiro: FechamentoComanda }>> {
    try {
        const agendamento = await prisma.agendamento.findUnique({
            where: { id: agendamentoId },
            include: { funcionario: true },
        })

        if (!agendamento) {
            return { sucesso: false, erro: 'Agendamento não encontrado no banco de dados.' }
        }

        const valorBruto = agendamento.valorBruto
        const comissaoPercentual = agendamento.funcionario.comissao

        const valorTaxaCartao = valorBruto * (taxaAdquirentePercentual / 100)
        const deducoesTotais = valorTaxaCartao + custoInsumos
        const baseLiquida = valorBruto - deducoesTotais
        const valorRepasseProfissional = baseLiquida * (comissaoPercentual / 100)
        const lucroRetidoSalao = baseLiquida - valorRepasseProfissional

        await prisma.agendamento.update({
            where: { id: agendamentoId },
            data: { taxas: deducoesTotais, concluido: true },
        })

        return {
            sucesso: true,
            financeiro: {
                bruto: valorBruto,
                deducoes: deducoesTotais,
                baseReal: baseLiquida,
                comissao: valorRepasseProfissional,
                lucroSalao: lucroRetidoSalao,
            },
        }
    } catch (error) {
        console.error('Erro crítico no processamento financeiro:', error)
        return { sucesso: false, erro: 'Falha ao processar o fechamento da comanda.' }
    }
}