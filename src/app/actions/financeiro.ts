'use server'

import { prisma } from '@/lib/prisma'
import { Prisma } from '@prisma/client'
import { formatInTimeZone } from 'date-fns-tz'
import type { FinanceiroResumo, FuncionarioResumo, FechamentoComanda } from '@/types/domain'
import { verificarSessaoFuncionario } from '@/app/actions/auth'

// ── Tipo base local ───────────────────────────────────────────────────────────
// Mantém consistência com o padrão do projeto (ver agendamento.ts)
type ActionResult<T = void> =
    | (T extends void ? { sucesso: true } : { sucesso: true } & T)
    | { sucesso: false; erro: string }

// ── Fuso horário canônico ─────────────────────────────────────────────────────
const TZ = 'America/Sao_Paulo'

// ── 1. Fechamento de Comanda ──────────────────────────────────────────────────
/**
 * Única fonte de verdade para o cálculo financeiro de uma comanda.
 *
 * Congela os valores no banco no momento do fechamento (snapshot imutável).
 * Após esta operação, nenhum recálculo dinâmico é feito — alterações futuras
 * em comissões ou preços de custo não afetarão este registro.
 *
 * @param agendamentoId   — ID da comanda a fechar
 * @param taxaAdquirente  — % de taxa do adquirente de cartão (default: 3%)
 * @param custoInsumos    — Valor de insumos validado/editado pelo operador no front-end
 */
export async function calcularFechamentoComanda(
    agendamentoId: string,
    taxaAdquirentePercentual: number = 3,
    custoInsumos: number
): Promise<ActionResult<{ financeiro: FechamentoComanda }>> {
    try {
        // ── Blindagem de Autenticação ────────────────────────────────────────
        const sessao = await verificarSessaoFuncionario()
        if (!sessao.logado) {
            return { sucesso: false, erro: 'Sessão expirada ou acesso negado.' }
        }

        const agendamento = await prisma.agendamento.findUnique({
            where: { id: agendamentoId },
            include: {
                funcionario: { select: { comissao: true } },
                produtos: {
                    include: {
                        produto: { select: { precoCusto: true } },
                    },
                },
            },
        })

        if (!agendamento) {
            return { sucesso: false, erro: 'Agendamento não encontrado no banco de dados.' }
        }
        if (agendamento.concluido) {
            return { sucesso: false, erro: 'Esta comanda já foi fechada.' }
        }

        const valorBruto = agendamento.valorBruto
        // Congela o percentual de comissão vigente neste momento
        const comissaoSnap = agendamento.funcionario.comissao

        // ── Cálculo do custo de revenda (produtos físicos vendidos) ──────────
        // precoCusto é congelado agora; futuras alterações de custo não retroagem.
        let custoRevenda = 0
        for (const item of agendamento.produtos) {
            // Fallback: 50% do preço cobrado caso o custo não esteja cadastrado
            const custoUnitario = item.produto?.precoCusto ?? (item.precoCobrado * 0.5)
            custoRevenda += custoUnitario * item.quantidade
        }

        // ── Regra de negócio unificada ───────────────────────────────────────
        // Uma única fonte de verdade — elimina a discrepância entre resumo e fechamento.
        const valorTaxaCartao = valorBruto * (taxaAdquirentePercentual / 100)
        const deducoesTotais = valorTaxaCartao + custoInsumos + custoRevenda

        // Separação intencional de duas bases de cálculo:
        // 1. baseLiquidaComissao: protege o profissional — comissão nunca pode ser negativa.
        //    Se os custos superarem o faturamento, o profissional recebe R$ 0, não deve dinheiro.
        const baseLiquidaComissao = Math.max(0, valorBruto - deducoesTotais)
        const valorComissao = baseLiquidaComissao * (comissaoSnap / 100)

        // 2. lucroSalao: DEVE refletir prejuízos reais — sem Math.max().
        //    Ex: faturamento R$ 50, custos R$ 70 → lucroSalao = -R$ 20.
        //    Exibir R$ 0,00 aqui mascararia o prejuízo e invalidaria o gestão de caixa.
        const lucroSalao = valorBruto - deducoesTotais - valorComissao

        // ── Snapshot financeiro imutável ─────────────────────────────────────
        // Todos os campos são gravados uma única vez. A coluna `concluido = true`
        // age como "selo" que impede futuros recálculos.
        await prisma.agendamento.update({
            where: { id: agendamentoId },
            data: {
                concluido: true,
                taxas: valorTaxaCartao,       // só a taxa do adquirente
                custoInsumos,                 // insumos validados pelo operador
                custoRevenda,                 // custo de produtos congelado
                valorComissao,                // repasse ao profissional congelado
                comissaoSnap,                 // % utilizada — para auditoria futura
            },
        })

        return {
            sucesso: true,
            financeiro: {
                bruto: valorBruto,
                deducoes: deducoesTotais,
                baseReal: valorBruto - deducoesTotais, // valor real sem floor — front-end vê se "estourou"
                comissao: valorComissao,
                lucroSalao,                            // negativo = prejuízo visível no painel
            },
        }
    } catch (error) {
        console.error('Erro crítico no processamento financeiro:', error)
        return { sucesso: false, erro: 'Falha ao processar o fechamento da comanda.' }
    }
}

// ── 2. Resumo Financeiro ──────────────────────────────────────────────────────
/**
 * Agrega o histórico financeiro somando campos já persistidos.
 * NÃO recalcula nenhum valor — integridade histórica garantida.
 */
export async function obterResumoFinanceiro(
    filtro?: { dataInicio: Date; dataFim: Date }
): Promise<ActionResult<FinanceiroResumo>> {
    try {
        // ── Blindagem de Leitura (Apenas ADMIN) ──────────────────────────────
        const sessao = await verificarSessaoFuncionario()
        if (!sessao.logado || sessao.role !== 'ADMIN') {
            return { sucesso: false, erro: 'Acesso negado. Relatórios financeiros são restritos à diretoria.' }
        }

        const whereClause: Prisma.AgendamentoWhereInput = { concluido: true }

        if (filtro) {
            whereClause.dataHoraInicio = {
                gte: filtro.dataInicio,
                lte: filtro.dataFim,
            }
        }

        // Select explícito: busca apenas os 5 campos financeiros congelados.
        // Sem joins em funcionario ou produtos — sem risco de dados mutáveis.
        const agendamentos = await prisma.agendamento.findMany({
            where: whereClause,
            select: {
                valorBruto: true,
                taxas: true,
                custoInsumos: true,
                custoRevenda: true,
                valorComissao: true,
            },
        })

        let faturamentoBruto = 0
        let custoProdutos = 0
        let totalComissoes = 0
        let totalTaxas = 0

        // Agregação O(N) pura — sem recálculo de regras de negócio
        for (const ag of agendamentos) {
            faturamentoBruto += ag.valorBruto
            totalTaxas += ag.taxas
            custoProdutos += ag.custoInsumos + ag.custoRevenda
            totalComissoes += ag.valorComissao
        }

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

// ── 3. Atualização de Comissão ────────────────────────────────────────────────
/**
 * Atualiza as configurações de comissão de um profissional.
 * Afeta apenas agendamentos FUTUROS — histórico não é impactado (imutável).
 */
export async function atualizarComissaoFuncionario(
    id: string,
    comissao: number,
    podeVerComissao: boolean
): Promise<ActionResult> {
    try {
        // ── Blindagem RBAC (Apenas ADMIN) ────────────────────────────────────
        const sessao = await verificarSessaoFuncionario()
        if (!sessao.logado || sessao.role !== 'ADMIN') {
            return { sucesso: false, erro: 'Acesso negado. Apenas administradores podem alterar comissões.' }
        }

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

// ── 4. Dados para Gráficos ────────────────────────────────────────────────────
/**
 * Retorna faturamento e atendimentos dos últimos N dias.
 *
 * Fuso horário: America/Sao_Paulo — agrupamento por data local correta,
 * sem risco de drift de dia em ambientes Serverless (que rodam em UTC).
 */
export async function obterDadosGraficosFinanceiros(dias: number = 7) {
    try {
        // ── Blindagem de Leitura (Apenas ADMIN) ──────────────────────────────
        const sessao = await verificarSessaoFuncionario()
        if (!sessao.logado || sessao.role !== 'ADMIN') {
            return { sucesso: false, erro: 'Acesso negado. Relatórios financeiros são restritos à diretoria.' }
        }

        // Calcula o início do período no fuso brasileiro para filtrar o banco
        const agora = new Date()
        const inicioStr = formatInTimeZone(
            new Date(agora.getTime() - (dias - 1) * 86_400_000),
            TZ,
            "yyyy-MM-dd'T'00:00:00xxx"
        )
        const dataLimite = new Date(inicioStr)

        const agendamentos = await prisma.agendamento.findMany({
            where: { dataHoraInicio: { gte: dataLimite }, concluido: true },
            select: { dataHoraInicio: true, valorBruto: true },
        })

        // Monta o mapa de dias com chaves no formato brasileiro (fuso correto)
        const mapaDias = new Map<string, { faturamento: number; atendimentos: number }>()

        for (let i = dias - 1; i >= 0; i--) {
            const dia = new Date(agora.getTime() - i * 86_400_000)
            // Formato da chave: "28 mar." — derivado do horário de Brasília
            const chave = formatInTimeZone(dia, TZ, 'dd MMM', { locale: undefined })
                .replace('.', '')
                .toLowerCase()
            mapaDias.set(chave, { faturamento: 0, atendimentos: 0 })
        }

        // Preenche com dados reais, agrupando pela data local de Brasília
        for (const ag of agendamentos) {
            const chave = formatInTimeZone(ag.dataHoraInicio, TZ, 'dd MMM', { locale: undefined })
                .replace('.', '')
                .toLowerCase()
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
/**
 * Máquina de estados: transição inversa de `calcularFechamentoComanda`.
 *
 * RBAC: verificação de sessão feita DENTRO da Server Action — não confia
 * no front-end para restringir acesso, pois Server Actions são endpoints POST.
 *
 * OBRIGATÓRIO: zera todos os campos de snapshot antes de reabrir.
 * Sem isso, relatórios futuros somariam dados "fantasmas" de comandas
 * abertas (concluido=false mas valorComissao > 0).
 *
 * @param agendamentoId — ID da comanda a reabrir
 * @param motivo        — Justificativa obrigatória (registrada em Notificacao para auditoria)
 */
export async function reabrirComanda(
    agendamentoId: string,
    motivo: string
): Promise<ActionResult> {
    try {
        // ── Blindagem RBAC obrigatória (Apenas ADMIN) ────────────────────────
        // Server Actions são endpoints POST públicos — não basta ocultar o botão no front-end.
        // A verificação de role deve ocorrer aqui, antes de qualquer leitura do banco.
        const sessao = await verificarSessaoFuncionario()
        if (!sessao.logado || sessao.role !== 'ADMIN') {
            return { sucesso: false, erro: 'Acesso negado. Apenas administradores podem estornar comandas.' }
        }

        if (!motivo?.trim()) {
            return { sucesso: false, erro: 'É obrigatório informar o motivo da reabertura.' }
        }

        const agendamento = await prisma.agendamento.findUnique({
            where: { id: agendamentoId },
            select: {
                concluido: true,
                canceladoEm: true,
                valorBruto: true,
                cliente: { select: { nome: true } },
            },
        })

        if (!agendamento) {
            return { sucesso: false, erro: 'Agendamento não encontrado.' }
        }
        if (agendamento.canceladoEm) {
            return { sucesso: false, erro: 'Não é possível reabrir uma comanda cancelada.' }
        }
        if (!agendamento.concluido) {
            return { sucesso: false, erro: 'A comanda já está aberta.' }
        }

        // Transação atômica: reabrir + zerar snapshot + registrar auditoria
        await prisma.$transaction([
            // Passo 1: Reverter status e zerar TODOS os campos de snapshot.
            // Não zerá-los corromperia relatórios futuros com valores "fantasmas".
            prisma.agendamento.update({
                where: { id: agendamentoId },
                data: {
                    concluido: false,
                    taxas: 0,
                    custoInsumos: 0,
                    custoRevenda: 0,
                    valorComissao: 0,
                    comissaoSnap: 0,
                },
            }),

            // Passo 2: Auditoria com autoria — log financeiro sem autor é inválido para compliance
            prisma.notificacao.create({
                data: {
                    mensagem:
                        `⚠️ Estorno Financeiro: A comanda de ${agendamento.cliente.nome} ` +
                        `(R$ ${agendamento.valorBruto.toFixed(2)}) foi reaberta por ${sessao.nome}. ` +
                        `Motivo: "${motivo.trim()}"`,
                },
            }),
        ])

        return { sucesso: true }
    } catch (error) {
        console.error('Erro ao reabrir comanda:', error)
        return { sucesso: false, erro: 'Falha técnica ao reabrir a comanda.' }
    }
}