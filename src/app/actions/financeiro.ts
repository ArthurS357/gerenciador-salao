'use server'

import { prisma } from '@/lib/prisma'
import { Prisma } from '@prisma/client'
import { formatInTimeZone } from 'date-fns-tz'
import { subDays, startOfDay } from 'date-fns'
import { FinanceiroResumo, FuncionarioResumo, FechamentoComanda, ActionResult, ConfiguracaoSalao } from '@/types/domain'
import { verificarSessaoFuncionario } from '@/app/actions/auth'
import { schemaAtualizarComissao } from '@/lib/schemas'
import { z } from 'zod'

// ── Fuso horário canônico ─────────────────────────────────────────────────────
const TZ = 'America/Sao_Paulo'

// ── Schemas de Validação Estrita (Runtime Safety) ─────────────────────────────
const SchemaPagamento = z.object({
    metodo: z.string().min(1, 'Método de pagamento inválido.'),
    valor: z.number().min(0.01, 'Valor deve ser maior que zero.'),
    parcelas: z.number().int().min(1).default(1),
    taxaBase: z.number().min(0).default(0),
    taxaMetodoId: z.string().optional(),
})

const SchemaFechamentoNovo = z.object({
    agendamentoId: z.string().min(1, 'ID do agendamento inválido.'),
    pagamentos: z.array(SchemaPagamento).min(1, 'É necessário informar pelo menos um método de pagamento.'),
    custoInsumos: z.number().min(0, 'Custo de insumos não pode ser negativo.'),
})

const SchemaConfiguracaoSalao = z.object({
    taxaCredito: z.coerce.number().min(0, 'Taxa não pode ser negativa.').max(20, 'Taxa não pode exceder 20%.'),
    taxaDebito: z.coerce.number().min(0, 'Taxa não pode ser negativa.').max(20, 'Taxa não pode exceder 20%.'),
    taxaPix: z.coerce.number().min(0, 'Taxa não pode ser negativa.').max(20, 'Taxa não pode exceder 20%.'),
})

const SchemaEstorno = z.object({
    agendamentoId: z.string().min(1, 'ID inválido.'),
    motivo: z.string().trim().min(5, 'É obrigatório informar um motivo válido.'),
})

// ── 1. Fechamento de Comanda ──────────────────────────────────────────────────
export async function calcularFechamentoComanda(
    agendamentoId: string,
    pagamentos: z.infer<typeof SchemaPagamento>[],
    custoInsumos: number
): Promise<ActionResult<{ financeiro: FechamentoComanda }>> {
    try {
        const sessao = await verificarSessaoFuncionario()
        if (!sessao.logado) {
            return { sucesso: false, erro: 'Sessão expirada ou acesso negado.' }
        }

        const validacao = SchemaFechamentoNovo.safeParse({ agendamentoId, pagamentos, custoInsumos })
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

        // ── Blindagem IDOR: Apenas o dono ou Gestão podem fechar a comanda
        if (sessao.role !== 'ADMIN' && sessao.id !== agendamento.funcionarioId && sessao.role !== 'RECEPCIONISTA') {
            return { sucesso: false, erro: 'Acesso negado. Não tem permissão para fechar esta comanda.' }
        }

        const valorBruto = agendamento.valorBruto
        const comissaoSnap = agendamento.funcionario.comissao

        // Processamento de Insumos e Produtos (Revenda)
        let custoRevenda = 0
        for (const item of agendamento.produtos) {
            const custoUnitario = item.produto?.precoCusto ?? (item.precoCobrado * 0.5)
            custoRevenda += custoUnitario * item.quantidade
        }

        // Processamento Múltiplos Pagamentos
        let valorPago = 0
        let valorTaxasTotais = 0

        // Acumuladores de retrocompatibilidade para o Dashboard antigo
        let valorDinheiro = 0
        let valorCartao = 0
        let valorPix = 0

        for (const pag of input.pagamentos) {
            valorPago += pag.valor

            // Regra de Parcelamento: Multiplica a taxa de crédito conforme o número de parcelas
            let taxaAplicada = pag.taxaBase
            if (pag.metodo === 'CARTAO_CREDITO' && pag.parcelas > 1) {
                taxaAplicada = pag.taxaBase * pag.parcelas
            }

            const custoDoMetodo = pag.valor * (taxaAplicada / 100)
            valorTaxasTotais += custoDoMetodo

            // Retrocompatibilidade
            if (pag.metodo === 'DINHEIRO') valorDinheiro += pag.valor
            else if (['CARTAO_CREDITO', 'CARTAO_DEBITO'].includes(pag.metodo)) valorCartao += pag.valor
            else if (pag.metodo === 'PIX') valorPix += pag.valor
        }

        const valorPendente = Math.max(0, valorBruto - valorPago)
        const comissaoLiberada = valorPendente <= 0

        const deducoesTotais = valorTaxasTotais + input.custoInsumos + custoRevenda
        const baseLiquidaComissao = Math.max(0, valorBruto - deducoesTotais)
        const valorComissao = baseLiquidaComissao * (comissaoSnap / 100)
        const lucroSalao = valorBruto - deducoesTotais - valorComissao

        // Transação Atômica
        await prisma.$transaction(async (tx) => {
            await tx.agendamento.update({
                where: { id: input.agendamentoId },
                data: {
                    concluido: true,
                    taxas: valorTaxasTotais,
                    custoInsumos: input.custoInsumos,
                    custoRevenda,
                    valorComissao,
                    comissaoSnap,
                    valorPago,
                    valorPendente,
                    comissaoLiberada,
                    // Campos Legado mantidos atualizados
                    valorDinheiro,
                    valorCartao,
                    valorPix
                },
            })

            for (const pag of input.pagamentos) {
                let taxaAplicada = pag.taxaBase
                if (pag.metodo === 'CARTAO_CREDITO' && pag.parcelas > 1) {
                    taxaAplicada = pag.taxaBase * pag.parcelas
                }

                await tx.pagamentoComanda.create({
                    data: {
                        agendamentoId: input.agendamentoId,
                        metodo: pag.metodo,
                        valor: pag.valor,
                        parcelas: pag.parcelas,
                        taxaAplicada,
                        taxaMetodoId: pag.taxaMetodoId,
                    }
                })
            }

            if (valorPendente > 0) {
                await tx.dividaCliente.create({
                    data: {
                        clienteId: agendamento.clienteId,
                        agendamentoId: input.agendamentoId,
                        valorOriginal: valorPendente,
                        valorQuitado: 0,
                        status: 'PENDENTE'
                    }
                })
            }
        })

        return {
            sucesso: true,
            data: {
                financeiro: {
                    bruto: valorBruto,
                    deducoes: deducoesTotais,
                    baseReal: baseLiquidaComissao,
                    comissao: valorComissao,
                    lucroSalao,
                    // ── Propriedades Adicionadas Corrigindo o Erro do TS ──
                    valorPago,
                    valorPendente,
                    comissaoLiberada
                },
            }
        }
    } catch (error) {
        console.error('[Financeiro] Erro crítico no processamento financeiro:', error)
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
            return { sucesso: false, erro: 'Acesso negado. Relatórios restritos à diretoria.' }
        }

        const whereClause: Prisma.AgendamentoWhereInput = { concluido: true }
        if (filtro) {
            whereClause.dataHoraInicio = { gte: filtro.dataInicio, lte: filtro.dataFim }
        }

        const agregacaoAgendamentos = prisma.agendamento.aggregate({
            where: whereClause,
            _sum: {
                valorBruto: true, taxas: true, custoInsumos: true, custoRevenda: true,
                valorComissao: true, valorDinheiro: true, valorCartao: true, valorPix: true,
                valorPago: true, valorPendente: true
            }
        })

        const comissoesPorProfissional = prisma.agendamento.groupBy({
            by: ['funcionarioId'],
            where: whereClause,
            _sum: { valorComissao: true }
        })

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
            data: ag.dataHoraInicio,
            clienteNome: ag.cliente?.nome || 'Não identificado',
            profissionalNome: ag.funcionario?.nome || 'Não identificado',
            valorBruto: ag.valorBruto,
            valorComissao: ag.valorComissao
        }))

        return {
            sucesso: true,
            data: {
                faturamentoBruto,
                custoProdutos,
                totalComissoes,
                lucroLiquido,
                equipe: equipeComValores as FuncionarioResumo[],
                historico,
                metodosPagamento: {
                    totalDinheiro: agregacao._sum.valorDinheiro || 0,
                    totalCartao: agregacao._sum.valorCartao || 0,
                    totalPix: agregacao._sum.valorPix || 0,
                },
            }
        }
    } catch (error) {
        console.error('[Financeiro] Erro no módulo financeiro:', error)
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
        console.error('[Financeiro] Erro ao atualizar comissão:', error)
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
                concluido: true, canceladoEm: true, valorBruto: true,
                cliente: { select: { nome: true } },
            },
        })

        if (!agendamento) return { sucesso: false, erro: 'Agendamento não encontrado.' }
        if (agendamento.canceladoEm) return { sucesso: false, erro: 'Não é possível reabrir uma comanda cancelada.' }
        if (!agendamento.concluido) return { sucesso: false, erro: 'A comanda já está aberta.' }

        // Remove transações de pagamentos parciais e dívidas relacionadas e zera saldos
        await prisma.$transaction([
            prisma.pagamentoComanda.deleteMany({ where: { agendamentoId: input.agendamentoId } }),
            prisma.dividaCliente.deleteMany({ where: { agendamentoId: input.agendamentoId } }),
            prisma.agendamento.update({
                where: { id: input.agendamentoId },
                data: {
                    concluido: false,
                    taxas: 0,
                    custoInsumos: 0,
                    custoRevenda: 0,
                    valorComissao: 0,
                    comissaoSnap: 0,
                    valorPago: 0,
                    valorPendente: 0,
                    comissaoLiberada: false,
                    valorDinheiro: 0,
                    valorCartao: 0,
                    valorPix: 0,
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
        console.error('[Financeiro] Erro ao reabrir comanda:', error)
        return { sucesso: false, erro: 'Falha técnica ao reabrir a comanda.' }
    }
}

// ── 6. Configuração das Taxas da Maquininha (Retrocompatibilidade) ────────────
export async function obterConfiguracaoSalao(): Promise<ActionResult<{ configuracao: ConfiguracaoSalao }>> {
    try {
        const sessao = await verificarSessaoFuncionario()
        if (!sessao.logado || sessao.role !== 'ADMIN') {
            return { sucesso: false, erro: 'Acesso negado.' }
        }

        const config = await prisma.configuracaoSalao.upsert({
            where: { id: 'config_global' },
            create: { taxaCredito: 3.0, taxaDebito: 1.5, taxaPix: 0.0 },
            update: {},
        })

        return {
            sucesso: true,
            data: { configuracao: { taxaCredito: config.taxaCredito, taxaDebito: config.taxaDebito, taxaPix: config.taxaPix } }
        }
    } catch (error) {
        console.error('[Financeiro] Erro ao obter configuração de taxas:', error)
        return { sucesso: false, erro: 'Falha ao carregar configuração de taxas.' }
    }
}

export async function salvarConfiguracaoSalao(
    taxaCredito: number,
    taxaDebito: number,
    taxaPix: number
): Promise<ActionResult> {
    try {
        const sessao = await verificarSessaoFuncionario()
        if (!sessao.logado || sessao.role !== 'ADMIN') {
            return { sucesso: false, erro: 'Acesso negado.' }
        }

        const validacao = SchemaConfiguracaoSalao.safeParse({ taxaCredito, taxaDebito, taxaPix })
        if (!validacao.success) {
            return { sucesso: false, erro: validacao.error.issues[0]?.message ?? 'Dados de configuração inválidos.' }
        }

        await prisma.configuracaoSalao.upsert({
            where: { id: 'config_global' },
            create: { taxaCredito: validacao.data.taxaCredito, taxaDebito: validacao.data.taxaDebito, taxaPix: validacao.data.taxaPix },
            update: { taxaCredito: validacao.data.taxaCredito, taxaDebito: validacao.data.taxaDebito, taxaPix: validacao.data.taxaPix },
        })

        return { sucesso: true }
    } catch (error) {
        console.error('[Financeiro] Erro ao salvar configuração de taxas:', error)
        return { sucesso: false, erro: 'Falha ao salvar configuração de taxas.' }
    }
}