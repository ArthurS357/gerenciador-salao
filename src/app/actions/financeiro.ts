'use server'

import { prisma } from '@/lib/prisma'
import { Prisma, RoleFuncionario, StatusAgendamento } from '@prisma/client'
import { formatInTimeZone } from 'date-fns-tz'
import { subDays, startOfDay } from 'date-fns'
import { FinanceiroResumo, FuncionarioResumo, ActionResult, ResumoMetodoPagamento } from '@/types/domain'
import { verificarSessaoFuncionario } from '@/app/actions/auth'
import { schemaAtualizarRegrasFuncionario } from '@/lib/schemas'
import { z } from 'zod'
import { decimalParaNumero } from '@/lib/decimal-utils'

// ── Fuso horário canônico ─────────────────────────────────────────────────────
const TZ = 'America/Sao_Paulo'

// ── Schemas de Validação Estrita (Runtime Safety) ─────────────────────────────

const SchemaEstorno = z.object({
    agendamentoId: z.string().min(1, 'ID inválido.'),
    motivo: z.string().trim().min(5, 'É obrigatório informar um motivo válido.'),
})

// ── 1. Resumo Financeiro ──────────────────────────────────────────────────────
export async function obterResumoFinanceiro(
    filtro?: { dataInicio: Date; dataFim: Date }
): Promise<ActionResult<FinanceiroResumo>> {
    try {
        const sessao = await verificarSessaoFuncionario()
        if (!sessao.logado || !sessao.podeVerFinanceiroGlobal) {
            return { sucesso: false, erro: 'Acesso negado. Relatórios restritos à gestão.' }
        }

        const whereClause: Prisma.AgendamentoWhereInput = { status: StatusAgendamento.FINALIZADO }
        if (filtro) {
            whereClause.dataHoraInicio = { gte: filtro.dataInicio, lte: filtro.dataFim }
        }

        const agregacaoAgendamentos = prisma.agendamento.aggregate({
            where: whereClause,
            _sum: {
                valorBruto: true, taxas: true, custoInsumos: true, custoRevenda: true,
                valorComissao: true, valorPago: true, valorPendente: true,
            }
        })

        // CORREÇÃO: filtra apenas comissões já liberadas para não vazar caixa em comandas com dívida
        const comissoesPorProfissional = prisma.agendamento.groupBy({
            by: ['funcionarioId'],
            where: { ...whereClause, comissaoLiberada: true },
            _sum: { valorComissao: true }
        })

        const historicoRecente = prisma.agendamento.findMany({
            where: whereClause,
            select: {
                id: true, dataHoraInicio: true, valorBruto: true, valorComissao: true,
                comissaoLiberada: true,
                cliente: { select: { nome: true } },
                funcionario: { select: { nome: true } },
                servicos: { select: { servico: { select: { nome: true } }, precoCobrado: true } },
                produtos: { select: { quantidade: true, produto: { select: { nome: true } } } }
            },
            orderBy: { dataHoraInicio: 'desc' },
            take: 100
        })

        // ── Agregação de métodos via PagamentoComanda (Single Source of Truth) ──
        const metodosPagamentoAgg = prisma.pagamentoComanda.groupBy({
            by: ['metodo'],
            where: {
                agendamento: whereClause,
            },
            _sum: { valor: true },
        })

        const [agregacao, distribuicaoComissoes, agendamentos, equipe, metodosPagRaw] = await Promise.all([
            agregacaoAgendamentos,
            comissoesPorProfissional,
            historicoRecente,
            prisma.funcionario.findMany({
                where: { role: RoleFuncionario.PROFISSIONAL, ativo: true },
                select: { id: true, nome: true, comissao: true, podeVerComissao: true, podeAgendar: true, podeVerHistorico: true, podeCancelar: true, podeGerenciarClientes: true, podeVerFinanceiroGlobal: true },
            }),
            metodosPagamentoAgg,
        ])

        const faturamentoBruto = decimalParaNumero(agregacao._sum.valorBruto)
        const totalTaxas = decimalParaNumero(agregacao._sum.taxas)
        const custoProdutos = decimalParaNumero(agregacao._sum.custoInsumos) + decimalParaNumero(agregacao._sum.custoRevenda)
        // Usa a soma das comissões liberadas (alinhado com o groupBy filtrado acima)
        const totalComissoes = distribuicaoComissoes.reduce((acc, d) => acc + decimalParaNumero(d._sum.valorComissao), 0)
        const lucroLiquido = faturamentoBruto - custoProdutos - totalComissoes - totalTaxas

        const mapaComissoes = new Map(distribuicaoComissoes.map(d => [d.funcionarioId, decimalParaNumero(d._sum.valorComissao)]))

        // Mapeamento explícito
        const equipeComValores: FuncionarioResumo[] = equipe.map(p => ({
            id: p.id,
            nome: p.nome,
            comissao: decimalParaNumero(p.comissao),
            podeVerComissao: p.podeVerComissao,
            podeAgendar: p.podeAgendar,
            podeVerHistorico: p.podeVerHistorico,
            podeCancelar: p.podeCancelar,
            podeGerenciarClientes: p.podeGerenciarClientes,
            podeVerFinanceiroGlobal: p.podeVerFinanceiroGlobal,
            totalComissaoRecebida: mapaComissoes.get(p.id) ?? 0,
        }))

        const historico = agendamentos.map(ag => ({
            id: ag.id,
            data: ag.dataHoraInicio,
            clienteNome: ag.cliente?.nome || 'Não identificado',
            profissionalNome: ag.funcionario?.nome || 'Não identificado',
            valorBruto: decimalParaNumero(ag.valorBruto),
            // Zera a comissão no display quando há dívida pendente
            valorComissao: ag.comissaoLiberada ? decimalParaNumero(ag.valorComissao) : 0,
            detalheServicos: ag.servicos.map(s => s.servico.nome).join(', '),
            detalheProdutos: ag.produtos.map(p => `${p.quantidade}x ${p.produto.nome}`).join(', '),
        }))

        // Métodos de pagamento agrupados do PagamentoComanda (substitui legado)
        const metodosPagamento: ResumoMetodoPagamento[] = metodosPagRaw.map(m => ({
            metodo: m.metodo,
            total: decimalParaNumero(m._sum.valor),
        }))

        return {
            sucesso: true,
            data: {
                faturamentoBruto,
                custoProdutos,
                totalComissoes,
                lucroLiquido,
                equipe: equipeComValores,
                historico,
                metodosPagamento,
            }
        }
    } catch (error) {
        console.error('[Financeiro] Erro no módulo financeiro:', error)
        return { sucesso: false, erro: 'Falha ao processar dados financeiros.' }
    }
}

// ── 3. Atualização de Regras do Profissional ─────────────────────────────────
export async function atualizarRegrasFuncionario(
    id: string,
    dados: {
        comissao: number
        podeVerComissao: boolean
        podeAgendar: boolean
        podeVerHistorico: boolean
        podeCancelar: boolean
        podeGerenciarClientes: boolean
        podeVerFinanceiroGlobal: boolean
    }
): Promise<ActionResult> {
    try {
        const sessao = await verificarSessaoFuncionario()
        if (!sessao.logado || sessao.role !== 'ADMIN') {
            return { sucesso: false, erro: 'Acesso negado.' }
        }

        const validacao = schemaAtualizarRegrasFuncionario.safeParse({ id, ...dados })
        if (!validacao.success) return { sucesso: false, erro: validacao.error.issues[0]?.message ?? 'Dados inválidos.' }

        await prisma.funcionario.update({
            where: { id },
            data: {
                comissao: validacao.data.comissao,
                podeVerComissao: validacao.data.podeVerComissao,
                podeAgendar: validacao.data.podeAgendar,
                podeVerHistorico: validacao.data.podeVerHistorico,
                podeCancelar: validacao.data.podeCancelar,
                podeGerenciarClientes: validacao.data.podeGerenciarClientes,
                podeVerFinanceiroGlobal: validacao.data.podeVerFinanceiroGlobal,
            },
        })
        return { sucesso: true }
    } catch (error) {
        console.error('[Financeiro] Erro ao atualizar regras do profissional:', error)
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

        const qtdDias = z.number().min(1).max(90).catch(7).parse(dias)
        const agora = new Date()
        const dataLimite = startOfDay(subDays(agora, qtdDias - 1))

        const agendamentos = await prisma.agendamento.findMany({
            where: { dataHoraInicio: { gte: dataLimite }, status: StatusAgendamento.FINALIZADO },
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
                    faturamento: atual.faturamento + decimalParaNumero(ag.valorBruto),
                    atendimentos: atual.atendimentos + 1,
                })
            }
        }

        const chartData = Array.from(mapaDias.entries()).map(([data, valores]) => ({
            data,
            'Faturamento (R$)': valores.faturamento,
            'Atendimentos': valores.atendimentos,
        }))

        return { sucesso: true, data: { chartData } }
    } catch (error) {
        console.error('[Financeiro] Erro ao gerar dados do gráfico:', error)
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
                status: true, valorBruto: true,
                cliente: { select: { nome: true } },
                servicos: {
                    include: {
                        servico: {
                            select: { insumos: { select: { produtoId: true, quantidadeUsada: true } } },
                        },
                    },
                },
                produtos: {
                    select: {
                        produtoId: true,
                        quantidade: true,
                        produto: { select: { tamanhoUnidade: true } },
                    },
                },
            },
        })

        if (!agendamento) return { sucesso: false, erro: 'Agendamento não encontrado.' }
        if (agendamento.status === StatusAgendamento.CANCELADO) return { sucesso: false, erro: 'Não é possível reabrir uma comanda cancelada.' }
        if (agendamento.status !== StatusAgendamento.FINALIZADO) return { sucesso: false, erro: 'A comanda já está aberta.' }

        // Monta o mapa de devoluções de estoque (insumos de serviço + produtos revendidos)
        const estoquesParaRestaurar = new Map<string, number>()

        for (const itemServico of agendamento.servicos) {
            for (const insumo of itemServico.servico.insumos) {
                const anterior = estoquesParaRestaurar.get(insumo.produtoId) ?? 0
                estoquesParaRestaurar.set(insumo.produtoId, anterior + insumo.quantidadeUsada)
            }
        }

        for (const item of agendamento.produtos) {
            if (item.produto) {
                const unidades = item.quantidade * item.produto.tamanhoUnidade
                const anterior = estoquesParaRestaurar.get(item.produtoId) ?? 0
                estoquesParaRestaurar.set(item.produtoId, anterior + unidades)
            }
        }

        const valorBrutoDisplay = decimalParaNumero(agendamento.valorBruto).toFixed(2)

        // Transação de estorno: devolve estoque + apaga registros financeiros + reabre comanda
        await prisma.$transaction(async (tx) => {
            await Promise.all(
                Array.from(estoquesParaRestaurar.entries()).map(([produtoId, qtd]) =>
                    tx.produto.update({
                        where: { id: produtoId },
                        data: { estoque: { increment: qtd } },
                    })
                )
            )

            await tx.pagamentoComanda.deleteMany({ where: { agendamentoId: input.agendamentoId } })
            await tx.dividaCliente.deleteMany({ where: { agendamentoId: input.agendamentoId } })

            await tx.agendamento.update({
                where: { id: input.agendamentoId },
                data: {
                    status: StatusAgendamento.EM_ATENDIMENTO,
                    taxas: 0,
                    custoInsumos: 0,
                    custoRevenda: 0,
                    valorComissao: 0,
                    comissaoSnap: 0,
                    valorPago: 0,
                    valorPendente: 0,
                    comissaoLiberada: false,
                },
            })

            await tx.notificacao.create({
                data: {
                    mensagem: `⚠️ Estorno Financeiro: A comanda de ${agendamento.cliente.nome} (R$ ${valorBrutoDisplay}) foi reaberta por ${sessao.nome}. Motivo: "${input.motivo}"`,
                },
            })
        })

        return { sucesso: true }
    } catch (error) {
        console.error('[Financeiro] Erro ao reabrir comanda:', error)
        return { sucesso: false, erro: 'Falha técnica ao reabrir a comanda.' }
    }
}