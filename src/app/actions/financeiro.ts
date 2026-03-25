'use server'

import { prisma } from '@/lib/prisma'
import { Prisma } from '@prisma/client' // 1. Importação adicionada para usar tipos do Prisma
import type { FinanceiroResumo, FuncionarioResumo, FechamentoComanda } from '@/types/domain'

type ActionResult<T = object> =
    | ({ sucesso: true } & T)
    | { sucesso: false; erro: string }

// 1. Atualizado: Recebe parâmetros opcionais de data
export async function obterResumoFinanceiro(filtro?: { dataInicio: Date; dataFim: Date }): Promise<ActionResult<FinanceiroResumo>> {
    try {
        // Correção 1: Tipagem explícita com Prisma.AgendamentoWhereInput
        const whereClause: Prisma.AgendamentoWhereInput = { concluido: true }

        if (filtro) {
            whereClause.dataHoraInicio = {
                gte: filtro.dataInicio,
                lte: filtro.dataFim,
            }
        }

        const agendamentos = await prisma.agendamento.findMany({
            where: whereClause,
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
            // Correção 2: Substituído 'any' por tipo específico para a propriedade esperada
            const custoInsumosInternos = (ag as { custoInsumos?: number }).custoInsumos ?? 0

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

export async function obterDadosGraficosFinanceiros(dias: number = 7) {
    try {
        const hoje = new Date()
        const dataLimite = new Date()
        dataLimite.setDate(hoje.getDate() - (dias - 1))
        dataLimite.setHours(0, 0, 0, 0)

        const agendamentos = await prisma.agendamento.findMany({
            where: {
                dataHoraInicio: { gte: dataLimite },
                concluido: true
            },
            select: { dataHoraInicio: true, valorBruto: true }
        })

        // Preparar o array com os últimos X dias zerados (para o gráfico não ter buracos)
        const mapaDias = new Map<string, { faturamento: number, atendimentos: number }>()

        for (let i = dias - 1; i >= 0; i--) {
            const d = new Date()
            d.setDate(hoje.getDate() - i)
            const dataFormatada = new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'short' }).format(d)
            mapaDias.set(dataFormatada, { faturamento: 0, atendimentos: 0 })
        }

        // Preencher com os dados reais
        agendamentos.forEach(ag => {
            const dataFormatada = new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'short' }).format(ag.dataHoraInicio)
            if (mapaDias.has(dataFormatada)) {
                const atual = mapaDias.get(dataFormatada)!
                mapaDias.set(dataFormatada, {
                    faturamento: atual.faturamento + ag.valorBruto,
                    atendimentos: atual.atendimentos + 1
                })
            }
        })

        const chartData = Array.from(mapaDias.entries()).map(([data, valores]) => ({
            data,
            'Faturamento (R$)': valores.faturamento,
            'Atendimentos': valores.atendimentos
        }))

        return { sucesso: true, chartData }
    } catch (error) {
        console.error('Erro ao gerar dados do gráfico:', error)
        return { sucesso: false, erro: 'Falha ao carregar gráficos.' }
    }
}