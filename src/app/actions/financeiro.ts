'use server'

import { prisma } from '@/lib/prisma'
import { Prisma } from '@prisma/client'
import { formatInTimeZone } from 'date-fns-tz'
import { subDays, startOfDay } from 'date-fns'
import { FinanceiroResumo, FuncionarioResumo, FechamentoComanda, ActionResult } from '@/types/domain'
import { verificarSessaoFuncionario } from '@/app/actions/auth'
import { schemaAtualizarComissao } from '@/lib/schemas'
import { z } from 'zod'

// ── Fuso horário canônico ─────────────────────────────────────────────────────
const TZ = 'America/Sao_Paulo'

// ── Schemas de Validação Estrita (Runtime Safety) ─────────────────────────────
const SchemaFechamento = z.object({
    agendamentoId: z.string().min(1, 'ID do agendamento inválido.'),
    taxaAdquirentePercentual: z.number().min(0).max(100).default(3),
    custoInsumos: z.number().min(0, 'Custo de insumos não pode ser negativo.'),
})

const SchemaEstorno = z.object({
    agendamentoId: z.string().min(1, 'ID inválido.'),
    motivo: z.string().trim().min(5, 'É obrigatório informar um motivo válido.'),
})

// ── 1. Fechamento de Comanda ──────────────────────────────────────────────────
export async function calcularFechamentoComanda(
    agendamentoId: string,
    taxaAdquirentePercentual: number = 3,
    custoInsumos: number
): Promise<ActionResult<{ financeiro: FechamentoComanda }>> {
    try {
        const sessao = await verificarSessaoFuncionario()
        if (!sessao.logado) {
            return { sucesso: false, erro: 'Sessão expirada ou acesso negado.' }
        }

        const validacao = SchemaFechamento.safeParse({ agendamentoId, taxaAdquirentePercentual, custoInsumos })
        if (!validacao.success) {
            return { sucesso: false, erro: validacao.error.issues[0]?.message ?? 'Dados inválidos.' }
        }

        const input = validacao.data

        const agendamento = await prisma.agendamento.findUnique({
            where: { id: input.agendamentoId },
            include: {
                funcionario: { select: { comissao: true } },
                produtos: { include: { produto: { select: { precoCusto: true } } } },
            },
        })

        if (!agendamento) return { sucesso: false, erro: 'Agendamento não encontrado.' }
        if (agendamento.concluido) return { sucesso: false, erro: 'Esta comanda já foi fechada.' }

        // ── Blindagem IDOR: Apenas o dono ou um ADMIN podem fechar a comanda
        if (sessao.role !== 'ADMIN' && sessao.id !== agendamento.funcionarioId) {
            return { sucesso: false, erro: 'Acesso negado. Não pode fechar comandas de outro profissional.' }
        }

        const valorBruto = agendamento.valorBruto
        const comissaoSnap = agendamento.funcionario.comissao

        let custoRevenda = 0
        for (const item of agendamento.produtos) {
            const custoUnitario = item.produto?.precoCusto ?? (item.precoCobrado * 0.5)
            custoRevenda += custoUnitario * item.quantidade
        }

        const valorTaxaCartao = valorBruto * (input.taxaAdquirentePercentual / 100)
        const deducoesTotais = valorTaxaCartao + input.custoInsumos + custoRevenda

        const baseLiquidaComissao = Math.max(0, valorBruto - deducoesTotais)
        const valorComissao = baseLiquidaComissao * (comissaoSnap / 100)
        const lucroSalao = valorBruto - deducoesTotais - valorComissao

        await prisma.agendamento.update({
            where: { id: input.agendamentoId },
            data: {
                concluido: true,
                taxas: valorTaxaCartao,
                custoInsumos: input.custoInsumos,
                custoRevenda,
                valorComissao,
                comissaoSnap,
            },
        })

        return {
            sucesso: true,
            financeiro: {
                bruto: valorBruto,
                deducoes: deducoesTotais,
                baseReal: valorBruto - deducoesTotais,
                comissao: valorComissao,
                lucroSalao,
            },
        }
    } catch (error) {
        console.error('Erro crítico no processamento financeiro:', error)
        return { sucesso: false, erro: 'Falha ao processar o fechamento da comanda.' }
    }
}

// ── 2. Resumo Financeiro ──────────────────────────────────────────────────────
export async function obterResumoFinanceiro(
    filtro?: { dataInicio: Date; dataFim: Date }
): Promise<ActionResult<FinanceiroResumo>> {
    try {
        const sessao = await verificarSessaoFuncionario()
        if (!sessao.logado || sessao.role !== 'ADMIN') {
            return { sucesso: false, erro: 'Acesso negado. Relatórios financeiros são restritos à diretoria.' }
        }

        const whereClause: Prisma.AgendamentoWhereInput = { concluido: true }
        if (filtro) {
            whereClause.dataHoraInicio = { gte: filtro.dataInicio, lte: filtro.dataFim }
        }

        // Delegação de Agregação Matemática para o Banco de Dados (Previne Out Of Memory)
        const agregacaoAgendamentos = prisma.agendamento.aggregate({
            where: whereClause,
            _sum: { valorBruto: true, taxas: true, custoInsumos: true, custoRevenda: true, valorComissao: true }
        })

        const comissoesPorProfissional = prisma.agendamento.groupBy({
            by: ['funcionarioId'],
            where: whereClause,
            _sum: { valorComissao: true }
        })

        // O histórico limita-se aos últimos 100 registos para exibição na UI sem travar o navegador
        const historicoRecente = prisma.agendamento.findMany({
            where: whereClause,
            select: {
                id: true, dataHoraInicio: true, valorBruto: true, valorComissao: true,
                cliente: { select: { nome: true } }, funcionario: { select: { nome: true } }
            },
            orderBy: { dataHoraInicio: 'desc' },
            take: 100
        })

        const [agregacao, distribuicaoComissoes, agendamentos, equipe] = await Promise.all([
            agregacaoAgendamentos,
            comissoesPorProfissional,
            historicoRecente,
            prisma.funcionario.findMany({
                where: { role: 'PROFISSIONAL', ativo: true },
                select: { id: true, nome: true, comissao: true, podeVerComissao: true },
            })
        ])

        const faturamentoBruto = agregacao._sum.valorBruto || 0
        const totalTaxas = agregacao._sum.taxas || 0
        const custoProdutos = (agregacao._sum.custoInsumos || 0) + (agregacao._sum.custoRevenda || 0)
        const totalComissoes = agregacao._sum.valorComissao || 0
        const lucroLiquido = faturamentoBruto - custoProdutos - totalComissoes - totalTaxas

        const mapaComissoes = new Map(distribuicaoComissoes.map(d => [d.funcionarioId, d._sum.valorComissao || 0]))

        const equipeComValores = equipe.map(p => ({
            ...p,
            totalComissaoRecebida: mapaComissoes.get(p.id) || 0
        }))

        const historico = agendamentos.map(ag => ({
            id: ag.id,
            data: ag.dataHoraInicio.toISOString(),
            clienteNome: ag.cliente?.nome || 'Não identificado',
            profissionalNome: ag.funcionario?.nome || 'Não identificado',
            valorBruto: ag.valorBruto,
            valorComissao: ag.valorComissao
        }))

        return {
            sucesso: true,
            faturamentoBruto,
            custoProdutos,
            totalComissoes,
            lucroLiquido,
            equipe: equipeComValores as FuncionarioResumo[],
            historico
        }
    } catch (error) {
        console.error('Erro no módulo financeiro:', error)
        return { sucesso: false, erro: 'Falha ao processar dados financeiros.' }
    }
}

// ── 3. Atualização de Comissão ────────────────────────────────────────────────
export async function atualizarComissaoFuncionario(
    id: string,
    comissao: number,
    podeVerComissao: boolean
): Promise<ActionResult> {
    try {
        const sessao = await verificarSessaoFuncionario()
        if (!sessao.logado || sessao.role !== 'ADMIN') {
            return { sucesso: false, erro: 'Acesso negado.' }
        }

        const validacao = schemaAtualizarComissao.safeParse({ id, comissao, podeVerComissao })
        if (!validacao.success) return { sucesso: false, erro: validacao.error.issues[0]?.message ?? 'Dados inválidos.' }

        await prisma.funcionario.update({
            where: { id },
            data: { comissao: validacao.data.comissao, podeVerComissao: validacao.data.podeVerComissao },
        })
        return { sucesso: true }
    } catch (error) {
        console.error('Erro ao atualizar comissão:', error)
        return { sucesso: false, erro: 'Erro ao atualizar configurações do profissional.' }
    }
}

// ── 4. Dados para Gráficos ────────────────────────────────────────────────────
export async function obterDadosGraficosFinanceiros(dias: number = 7) {
    try {
        const sessao = await verificarSessaoFuncionario()
        if (!sessao.logado || sessao.role !== 'ADMIN') {
            return { sucesso: false, erro: 'Acesso restrito.' }
        }

        // Proteção contra ataques de negação de serviço (DoS) via loop excessivo
        const qtdDias = z.number().min(1).max(90).catch(7).parse(dias)

        const agora = new Date()
        const dataLimite = startOfDay(subDays(agora, qtdDias - 1))

        const agendamentos = await prisma.agendamento.findMany({
            where: { dataHoraInicio: { gte: dataLimite }, concluido: true },
            select: { dataHoraInicio: true, valorBruto: true },
        })

        const mapaDias = new Map<string, { faturamento: number; atendimentos: number }>()

        for (let i = qtdDias - 1; i >= 0; i--) {
            const diaAlvo = subDays(agora, i)
            const chave = formatInTimeZone(diaAlvo, TZ, 'dd MMM', { locale: undefined }).replace('.', '').toLowerCase()
            mapaDias.set(chave, { faturamento: 0, atendimentos: 0 })
        }

        for (const ag of agendamentos) {
            const chave = formatInTimeZone(ag.dataHoraInicio, TZ, 'dd MMM', { locale: undefined }).replace('.', '').toLowerCase()
            const atual = mapaDias.get(chave)
            if (atual) {
                mapaDias.set(chave, {
                    faturamento: atual.faturamento + ag.valorBruto,
                    atendimentos: atual.atendimentos + 1,
                })
            }
        }

        const chartData = Array.from(mapaDias.entries()).map(([data, valores]) => ({
            data,
            'Faturamento (R$)': valores.faturamento,
            'Atendimentos': valores.atendimentos,
        }))

        return { sucesso: true, chartData }
    } catch (error) {
        console.error('Erro ao gerar dados do gráfico:', error)
        return { sucesso: false, erro: 'Falha ao carregar gráficos.' }
    }
}

// ── 5. Reabertura de Comanda (Estorno / Correção) ─────────────────────────────
export async function reabrirComanda(
    agendamentoId: string,
    motivo: string
): Promise<ActionResult> {
    try {
        const sessao = await verificarSessaoFuncionario()
        if (!sessao.logado || sessao.role !== 'ADMIN') {
            return { sucesso: false, erro: 'Acesso negado. Apenas administradores podem estornar comandas.' }
        }

        const validacao = SchemaEstorno.safeParse({ agendamentoId, motivo })
        if (!validacao.success) return { sucesso: false, erro: validacao.error.issues[0]?.message ?? 'Dados inválidos.' }

        const input = validacao.data

        const agendamento = await prisma.agendamento.findUnique({
            where: { id: input.agendamentoId },
            select: {
                concluido: true, canceladoEm: true, valorBruto: true,
                cliente: { select: { nome: true } },
            },
        })

        if (!agendamento) return { sucesso: false, erro: 'Agendamento não encontrado.' }
        if (agendamento.canceladoEm) return { sucesso: false, erro: 'Não é possível reabrir uma comanda cancelada.' }
        if (!agendamento.concluido) return { sucesso: false, erro: 'A comanda já está aberta.' }

        await prisma.$transaction([
            prisma.agendamento.update({
                where: { id: input.agendamentoId },
                data: {
                    concluido: false, taxas: 0, custoInsumos: 0, custoRevenda: 0, valorComissao: 0, comissaoSnap: 0,
                },
            }),
            prisma.notificacao.create({
                data: {
                    mensagem: `⚠️ Estorno Financeiro: A comanda de ${agendamento.cliente.nome} (R$ ${agendamento.valorBruto.toFixed(2)}) foi reaberta por ${sessao.nome}. Motivo: "${input.motivo}"`,
                },
            }),
        ])

        return { sucesso: true }
    } catch (error) {
        console.error('Erro ao reabrir comanda:', error)
        return { sucesso: false, erro: 'Falha técnica ao reabrir a comanda.' }
    }
}