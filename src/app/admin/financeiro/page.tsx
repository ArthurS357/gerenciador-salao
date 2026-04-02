'use client'

import { useState, useEffect, useCallback } from 'react'
import dynamic from 'next/dynamic'
import { obterResumoFinanceiro, atualizarRegrasFuncionario, obterDadosGraficosFinanceiros, obterConfiguracaoSalao, salvarConfiguracaoSalao } from '@/app/actions/financeiro'
import { listarTaxasMetodoPagamento, salvarTaxaMetodoPagamento, excluirTaxaMetodoPagamento, type TaxaMetodoView } from '@/app/actions/taxas'
import { METODOS_PAGAMENTO, BANDEIRAS_CARTAO } from '@/lib/pagamento-constantes'
import { toast } from 'sonner'
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import type { FinanceiroResumo, FuncionarioResumo, ConfiguracaoSalao, MetodoPagamento } from '@/types/domain'
import * as XLSX from 'xlsx'
import { Loader2 } from 'lucide-react'
import { MetricCard } from '@/components/admin/metric-card'

// Correção: Removido as chaves de { AdminHeader }
import AdminHeader from '@/components/admin/AdminHeader'

const BotaoExportarPDF = dynamic(() => import('@/components/BotaoExportarPDF'), {
    ssr: false,
    loading: () => <button disabled className="px-5 py-2.5 bg-muted text-muted-foreground rounded-xl text-sm font-bold opacity-50 shadow-sm">PDF a carregar...</button>
})

type FormTaxa = { metodo: string; bandeira: string; taxaBase: number; descricao: string }

type EditState = Record<string, {
    comissao: number
    podeVerComissao: boolean
    podeAgendar: boolean
    podeVerHistorico: boolean
    podeCancelar: boolean
    podeGerenciarClientes: boolean
    podeVerFinanceiroGlobal: boolean
}>
type PeriodoFiltro = 'hoje' | 'semana' | 'mes' | 'tudo'
type ChartData = { data: string; 'Faturamento (R$)': number; Atendimentos: number }

function isSuccessResponse<T>(response: unknown): response is { sucesso: true; data: T } {
    return typeof response === 'object' && response !== null && 'sucesso' in response && (response as Record<string, unknown>).sucesso === true && 'data' in response
}

function isErrorResponse(response: unknown): response is { sucesso: false; erro: string } {
    return typeof response === 'object' && response !== null && 'sucesso' in response && (response as Record<string, unknown>).sucesso === false && 'erro' in response
}



export default function PainelFinanceiroPage() {
    const [dados, setDados] = useState<FinanceiroResumo | null>(null)
    const [chartData, setChartData] = useState<ChartData[]>([])
    const [editState, setEditState] = useState<EditState>({})
    const [loadingIds, setLoadingIds] = useState<Record<string, boolean>>({})

    // Estado para configuração de taxas legado
    const [configuracao, setConfiguracao] = useState<ConfiguracaoSalao>({ taxaCredito: 3.0, taxaDebito: 1.5, taxaPix: 0.0 })
    const [salvandoConfig, setSalvandoConfig] = useState(false)

    // Estado para taxas por método/bandeira
    const [taxasBandeira, setTaxasBandeira] = useState<TaxaMetodoView[]>([])
    const [formTaxa, setFormTaxa] = useState<FormTaxa>({ metodo: 'CARTAO_CREDITO', bandeira: '', taxaBase: 0, descricao: '' })
    const [salvandoTaxa, setSalvandoTaxa] = useState(false)
    const [excluindoTaxaId, setExcluindoTaxaId] = useState<string | null>(null)

    const [periodoAtual, setPeriodoAtual] = useState<PeriodoFiltro>('mes')
    const [isLoadingMetrics, setIsLoadingMetrics] = useState(true)

    const [mounted, setMounted] = useState(false)
    useEffect(() => {
        const timeoutId = setTimeout(() => setMounted(true), 0)
        return () => clearTimeout(timeoutId)
    }, [])

    const obterDatasDoFiltro = (periodo: PeriodoFiltro) => {
        const hoje = new Date()
        let dataInicio = new Date()
        const dataFim = new Date(hoje.setHours(23, 59, 59, 999))

        switch (periodo) {
            case 'hoje':
                dataInicio.setHours(0, 0, 0, 0)
                break
            case 'semana':
                dataInicio.setDate(dataInicio.getDate() - 7)
                dataInicio.setHours(0, 0, 0, 0)
                break
            case 'mes':
                dataInicio = new Date(hoje.getFullYear(), hoje.getMonth(), 1)
                dataInicio.setHours(0, 0, 0, 0)
                break
            case 'tudo':
                return undefined
        }
        return { dataInicio, dataFim }
    }

    const carregarDados = useCallback(async (periodo: PeriodoFiltro) => {
        setIsLoadingMetrics(true)
        const filtro = obterDatasDoFiltro(periodo)

        const [res, resGraficos, resConfig, resTaxas] = await Promise.all([
            obterResumoFinanceiro(filtro),
            obterDadosGraficosFinanceiros(7),
            obterConfiguracaoSalao(),
            listarTaxasMetodoPagamento(),
        ])

        if (isSuccessResponse<FinanceiroResumo>(res)) {
            const dataResumo = res.data
            setDados(dataResumo)
            const estado: EditState = {}
            dataResumo.equipe.forEach((p) => {
                estado[p.id] = {
                    comissao: p.comissao,
                    podeVerComissao: p.podeVerComissao,
                    podeAgendar: p.podeAgendar,
                    podeVerHistorico: p.podeVerHistorico,
                    podeCancelar: p.podeCancelar,
                    podeGerenciarClientes: p.podeGerenciarClientes,
                    podeVerFinanceiroGlobal: p.podeVerFinanceiroGlobal,
                }
            })
            setEditState(estado)
        } else if (isErrorResponse(res)) {
            toast.error(res.erro)
        } else {
            toast.error('Erro ao carregar dados financeiros')
        }

        if (isSuccessResponse<{ configuracao: ConfiguracaoSalao }>(resConfig)) {
            setConfiguracao(resConfig.data.configuracao)
        }

        if (isSuccessResponse<{ taxas: TaxaMetodoView[] }>(resTaxas)) {
            setTaxasBandeira(resTaxas.data.taxas)
        }

        if (isSuccessResponse<{ chartData: ChartData[] }>(resGraficos)) {
            setChartData(resGraficos.data.chartData)
        } else if (isErrorResponse(resGraficos)) {
            console.error('Erro ao carregar dados gráficos:', resGraficos.erro)
        }

        setIsLoadingMetrics(false)
    }, [])

    useEffect(() => {
        let isMounted = true
        const fetchFinanceiro = async () => { if (isMounted) await carregarDados(periodoAtual) }
        fetchFinanceiro()
        return () => { isMounted = false }
    }, [carregarDados, periodoAtual])

    const handleAtualizarRegras = async (prof: FuncionarioResumo) => {
        const estado = editState[prof.id]
        if (!estado) return

        setLoadingIds((prev) => ({ ...prev, [prof.id]: true }))

        const res = await atualizarRegrasFuncionario(prof.id, {
            comissao: estado.comissao,
            podeVerComissao: estado.podeVerComissao,
            podeAgendar: estado.podeAgendar,
            podeVerHistorico: estado.podeVerHistorico,
            podeCancelar: estado.podeCancelar,
            podeGerenciarClientes: estado.podeGerenciarClientes,
            podeVerFinanceiroGlobal: estado.podeVerFinanceiroGlobal,
        })

        if (isSuccessResponse(res)) {
            toast.success(`Regras de ${prof.nome} atualizadas!`)
            await carregarDados(periodoAtual)
        } else if (isErrorResponse(res)) {
            toast.error(res.erro)
        } else {
            toast.error('Erro ao atualizar regras')
        }
        setLoadingIds((prev) => ({ ...prev, [prof.id]: false }))
    }

    const setComissao = (id: string, comissao: number) =>
        setEditState((prev) => ({ ...prev, [id]: { ...prev[id]!, comissao } }))

    const setPodeVer = (id: string, podeVerComissao: boolean) =>
        setEditState((prev) => ({ ...prev, [id]: { ...prev[id]!, podeVerComissao } }))

    const setPodeAgendar = (id: string, podeAgendar: boolean) =>
        setEditState((prev) => ({ ...prev, [id]: { ...prev[id]!, podeAgendar } }))

    const setPodeVerHistorico = (id: string, podeVerHistorico: boolean) =>
        setEditState((prev) => ({ ...prev, [id]: { ...prev[id]!, podeVerHistorico } }))

    const setPodeCancelar = (id: string, podeCancelar: boolean) =>
        setEditState((prev) => ({ ...prev, [id]: { ...prev[id]!, podeCancelar } }))

    const setPodeGerenciarClientes = (id: string, podeGerenciarClientes: boolean) =>
        setEditState((prev) => ({ ...prev, [id]: { ...prev[id]!, podeGerenciarClientes } }))

    const setPodeVerFinanceiroGlobal = (id: string, podeVerFinanceiroGlobal: boolean) =>
        setEditState((prev) => ({ ...prev, [id]: { ...prev[id]!, podeVerFinanceiroGlobal } }))

    const handleSalvarTaxas = async () => {
        setSalvandoConfig(true)
        const res = await salvarConfiguracaoSalao(configuracao.taxaCredito, configuracao.taxaDebito, configuracao.taxaPix)
        if (isSuccessResponse(res)) {
            toast.success('Taxas da maquininha salvas com sucesso!')
        } else if (isErrorResponse(res)) {
            toast.error(res.erro)
        }
        setSalvandoConfig(false)
    }

    const handleSalvarTaxaBandeira = async () => {
        setSalvandoTaxa(true)
        const res = await salvarTaxaMetodoPagamento({
            metodo: formTaxa.metodo as MetodoPagamento,
            bandeira: formTaxa.bandeira,
            taxaBase: formTaxa.taxaBase,
            descricao: formTaxa.descricao || null,
            ativo: true,
        })
        if (isSuccessResponse(res)) {
            toast.success('Taxa salva com sucesso!')
            await carregarDados(periodoAtual)
        } else if (isErrorResponse(res)) {
            toast.error(res.erro)
        }
        setSalvandoTaxa(false)
    }

    const handleExcluirTaxaBandeira = async (id: string) => {
        setExcluindoTaxaId(id)
        const res = await excluirTaxaMetodoPagamento(id)
        if (isSuccessResponse(res)) {
            toast.success('Taxa removida.')
            setTaxasBandeira(prev => prev.filter(t => t.id !== id))
        } else if (isErrorResponse(res)) {
            toast.error(res.erro)
        }
        setExcluindoTaxaId(null)
    }

    const botoesFiltro: { valor: PeriodoFiltro; label: string }[] = [
        { valor: 'hoje', label: 'Hoje' },
        { valor: 'semana', label: 'Últimos 7 Dias' },
        { valor: 'mes', label: 'Mês Atual' },
        { valor: 'tudo', label: 'Todo o Histórico' },
    ]

    const exportarParaExcel = () => {
        if (!dados) return

        const resumoData = [
            { Métrica: 'Faturamento Bruto', 'Valor (R$)': dados.faturamentoBruto },
            { Métrica: 'Custos (Insumos + Revenda)', 'Valor (R$)': dados.custoProdutos },
            { Métrica: 'Comissões Pagas', 'Valor (R$)': dados.totalComissoes },
            { Métrica: 'Lucro Líquido Real', 'Valor (R$)': dados.lucroLiquido },
        ]
        const wsResumo = XLSX.utils.json_to_sheet(resumoData)

        const equipaData = dados.equipe.map(p => ({
            'Profissional': p.nome,
            'Taxa de Comissão (%)': p.comissao,
            'Total Recebido (R$)': p.totalComissaoRecebida,
            'Acesso Visível à Comanda': p.podeVerComissao ? 'Sim' : 'Não'
        }))
        const wsEquipa = XLSX.utils.json_to_sheet(equipaData)

        const historicoData = dados.historico.map(h => ({
            'Data': new Date(h.data).toLocaleDateString('pt-BR'),
            'Cliente': h.clienteNome,
            'Profissional': h.profissionalNome,
            'Faturamento (R$)': h.valorBruto,
            'Comissão Recebida (R$)': h.valorComissao
        }))
        const wsHistorico = XLSX.utils.json_to_sheet(historicoData)

        const wb = XLSX.utils.book_new()
        XLSX.utils.book_append_sheet(wb, wsResumo, 'Resumo Financeiro')
        XLSX.utils.book_append_sheet(wb, wsEquipa, 'Equipe de Profissionais')
        XLSX.utils.book_append_sheet(wb, wsHistorico, 'Histórico de Atendimentos')

        XLSX.writeFile(wb, `Relatorio_Financeiro_${periodoAtual}.xlsx`)
    }

    return (
        <div className="min-h-screen bg-background p-4 sm:p-6 lg:p-8 font-sans">
            <AdminHeader
                titulo="Visão Financeira"
                subtitulo="Análise de métricas, lucros e evolução do seu salão."
                abaAtiva="Financeiro"
            />

            <div className="max-w-7xl mx-auto px-4 md:px-0">
                {/* BARRA DE FILTROS E EXPORTAÇÃO */}
                <div className="flex flex-col xl:flex-row items-start xl:items-center justify-between mb-8 gap-4">
                    <div className="flex flex-col sm:flex-row sm:items-center gap-4 w-full xl:w-auto">
                        <div className="flex flex-wrap gap-2 p-1 bg-muted/60 rounded-full">
                            {botoesFiltro.map(btn => (
                                <button
                                    key={btn.valor}
                                    onClick={() => {
                                        if (periodoAtual !== btn.valor) {
                                            setPeriodoAtual(btn.valor)
                                        }
                                    }}
                                    disabled={isLoadingMetrics}
                                    className={`px-5 py-2 rounded-full text-[13px] font-bold transition-all ${periodoAtual === btn.valor
                                        ? 'bg-card text-primary shadow-sm'
                                        : 'text-muted-foreground hover:text-foreground disabled:opacity-50'
                                        }`}
                                >
                                    {btn.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="flex gap-3 w-full sm:w-auto mt-2 xl:mt-0 xl:pt-0">
                        <button
                            onClick={exportarParaExcel}
                            disabled={isLoadingMetrics || !dados}
                            className="flex-1 sm:flex-none flex justify-center items-center gap-2 px-5 py-2.5 bg-green-600/10 text-green-700 border border-green-200 rounded-xl font-bold hover:bg-green-600 hover:text-white transition-all disabled:opacity-50 text-sm shadow-sm"
                        >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path></svg>
                            Excel
                        </button>
                        <BotaoExportarPDF dados={dados} periodoAtual={periodoAtual} isLoadingMetrics={isLoadingMetrics} />
                    </div>
                </div>

                {/* CONFIGURAÇÃO DE TAXAS DA MAQUININHA */}
                <section className="bg-card rounded-2xl shadow-sm border border-border mb-8">
                    <div className="p-6 md:p-8 border-b border-border bg-muted/30">
                        <h2 className="text-xl font-bold text-foreground tracking-tight">Taxas da Maquininha</h2>
                        <p className="text-sm text-muted-foreground mt-1">Percentuais cobrados pelo adquirente. A taxa incide <strong>apenas</strong> sobre o valor pago em cartão.</p>
                    </div>
                    <div className="p-6 md:p-8">
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-6">
                            {[
                                { label: 'Crédito (%)', value: configuracao.taxaCredito, key: 'taxaCredito' as const },
                                { label: 'Débito (%)', value: configuracao.taxaDebito, key: 'taxaDebito' as const },
                                { label: 'PIX (%)', value: configuracao.taxaPix, key: 'taxaPix' as const },
                            ].map(campo => (
                                <div key={campo.key}>
                                    <label className="block text-xs font-bold text-muted-foreground uppercase tracking-widest mb-2">{campo.label}</label>
                                    <div className="inline-flex items-center border border-border rounded-lg overflow-hidden w-full">
                                        <input
                                            type="number" min={0} max={20} step={0.1} disabled={salvandoConfig}
                                            value={campo.value}
                                            onChange={e => setConfiguracao(prev => ({ ...prev, [campo.key]: Math.max(0, Math.min(20, parseFloat(e.target.value) || 0)) }))}
                                            className="flex-1 px-3 py-2 text-center font-bold text-primary bg-card outline-none focus:bg-primary/5 disabled:bg-muted"
                                        />
                                        <span className="bg-muted px-3 py-2 text-muted-foreground font-bold border-l border-border text-sm">%</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                        <button
                            onClick={handleSalvarTaxas}
                            disabled={salvandoConfig}
                            className="bg-primary text-primary-foreground font-bold px-6 py-2.5 rounded-xl text-sm hover:bg-primary/90 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-sm flex items-center gap-2"
                        >
                            {salvandoConfig && <Loader2 className="w-4 h-4 animate-spin" />}
                            {salvandoConfig ? 'Salvando...' : 'Salvar Taxas'}
                        </button>
                    </div>
                </section>

                {/* TAXAS POR MÉTODO E BANDEIRA */}
                <section className="bg-card rounded-2xl shadow-sm border border-border mb-8">
                    <div className="p-6 md:p-8 border-b border-border bg-muted/30">
                        <h2 className="text-xl font-bold text-foreground tracking-tight">Taxas por Método e Bandeira</h2>
                        <p className="text-sm text-muted-foreground mt-1">Configure taxas específicas por método de pagamento e bandeira de cartão. Sobrepõe o valor global acima.</p>
                    </div>
                    <div className="p-6 md:p-8 space-y-6">
                        {/* Formulário de adição */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 items-end">
                            <div>
                                <label className="block text-xs font-bold text-muted-foreground uppercase tracking-widest mb-2">Método</label>
                                <select
                                    value={formTaxa.metodo}
                                    onChange={e => setFormTaxa(f => ({ ...f, metodo: e.target.value, bandeira: '' }))}
                                    className="w-full border border-border rounded-lg px-3 py-2.5 bg-card text-sm outline-none focus:border-primary"
                                >
                                    {METODOS_PAGAMENTO.map(m => (
                                        <option key={m} value={m}>{m.replace('_', ' ')}</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-muted-foreground uppercase tracking-widest mb-2">Bandeira</label>
                                <select
                                    value={formTaxa.bandeira}
                                    onChange={e => setFormTaxa(f => ({ ...f, bandeira: e.target.value }))}
                                    disabled={!['CARTAO_DEBITO', 'CARTAO_CREDITO'].includes(formTaxa.metodo)}
                                    className="w-full border border-border rounded-lg px-3 py-2.5 bg-card text-sm outline-none focus:border-primary disabled:opacity-40"
                                >
                                    {BANDEIRAS_CARTAO.map(b => (
                                        <option key={b.valor} value={b.valor}>{b.label}</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-muted-foreground uppercase tracking-widest mb-2">Taxa (%)</label>
                                <div className="inline-flex items-center border border-border rounded-lg overflow-hidden w-full">
                                    <input
                                        type="number" min={0} max={20} step={0.01}
                                        value={formTaxa.taxaBase}
                                        onChange={e => setFormTaxa(f => ({ ...f, taxaBase: parseFloat(e.target.value) || 0 }))}
                                        className="flex-1 px-3 py-2.5 text-center font-bold text-primary bg-card outline-none focus:bg-primary/5"
                                    />
                                    <span className="bg-muted px-3 py-2.5 text-muted-foreground font-bold border-l border-border text-sm">%</span>
                                </div>
                            </div>
                            <button
                                onClick={handleSalvarTaxaBandeira}
                                disabled={salvandoTaxa}
                                className="bg-primary text-primary-foreground font-bold px-6 py-2.5 rounded-xl text-sm hover:bg-primary/90 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                            >
                                {salvandoTaxa && <Loader2 className="w-4 h-4 animate-spin" />}
                                {salvandoTaxa ? 'Salvando...' : 'Salvar Taxa'}
                            </button>
                        </div>

                        {/* Tabela de taxas existentes */}
                        {taxasBandeira.length > 0 && (
                            <div className="w-full overflow-x-auto whitespace-nowrap md:whitespace-normal">
                                <table className="w-full min-w-[500px] text-sm border-collapse">
                                    <thead>
                                        <tr className="bg-muted/30">
                                            <th className="px-4 py-2.5 text-left text-xs font-bold text-muted-foreground uppercase tracking-widest border-b border-border">Método</th>
                                            <th className="px-4 py-2.5 text-left text-xs font-bold text-muted-foreground uppercase tracking-widest border-b border-border">Bandeira</th>
                                            <th className="px-4 py-2.5 text-center text-xs font-bold text-muted-foreground uppercase tracking-widest border-b border-border">Taxa</th>
                                            <th className="px-4 py-2.5 text-center text-xs font-bold text-muted-foreground uppercase tracking-widest border-b border-border">Status</th>
                                            <th className="px-4 py-2.5 border-b border-border" />
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {taxasBandeira.map(taxa => (
                                            <tr key={taxa.id} className="border-b border-border hover:bg-muted/20 transition-colors">
                                                <td className="px-4 py-3 font-medium">{taxa.metodo.replace('_', ' ')}</td>
                                                <td className="px-4 py-3 text-muted-foreground">{taxa.bandeira || 'Padrão'}</td>
                                                <td className="px-4 py-3 text-center font-bold text-primary">{taxa.taxaBase.toFixed(2)}%</td>
                                                <td className="px-4 py-3 text-center">
                                                    <span className={`inline-flex px-2 py-0.5 rounded text-[10px] font-bold uppercase ${taxa.ativo ? 'bg-emerald-100 text-emerald-700' : 'bg-muted text-muted-foreground'}`}>
                                                        {taxa.ativo ? 'Ativo' : 'Inativo'}
                                                    </span>
                                                </td>
                                                <td className="px-4 py-3 text-right">
                                                    <button
                                                        onClick={() => handleExcluirTaxaBandeira(taxa.id)}
                                                        disabled={excluindoTaxaId === taxa.id}
                                                        className="text-xs text-destructive hover:underline disabled:opacity-50"
                                                    >
                                                        {excluindoTaxaId === taxa.id ? 'Removendo...' : 'Remover'}
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                        {taxasBandeira.length === 0 && (
                            <p className="text-sm text-muted-foreground italic text-center py-4">
                                Nenhuma taxa específica configurada. Use o formulário acima para adicionar.
                            </p>
                        )}
                    </div>
                </section>

                {/* MÉTRICAS (CARDS REAPROVEITADOS DA UI) */}
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6 mb-10">
                    <MetricCard
                        label="Faturamento Bruto"
                        value={dados?.faturamentoBruto.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || '0,00'}
                        loading={isLoadingMetrics}
                    />
                    <MetricCard
                        label="Custos Operacionais"
                        value={dados?.custoProdutos.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || '0,00'}
                        loading={isLoadingMetrics}
                        variant="danger"
                    />
                    <MetricCard
                        label="Comissões Repassadas"
                        value={dados?.totalComissoes.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || '0,00'}
                        loading={isLoadingMetrics}
                    />
                    <MetricCard
                        label="Lucro Líquido Real"
                        value={dados?.lucroLiquido.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || '0,00'}
                        loading={isLoadingMetrics}
                    />
                </div>

                {/* BREAKDOWN POR MÉTODO DE PAGAMENTO */}
                {dados && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 mb-10">
                        {[
                            { label: 'Recebido em Dinheiro', value: dados.metodosPagamento.totalDinheiro, cor: 'text-emerald-700', bg: 'bg-emerald-50 border-emerald-200' },
                            { label: 'Recebido em Cartão', value: dados.metodosPagamento.totalCartao, cor: 'text-blue-700', bg: 'bg-blue-50 border-blue-200' },
                            { label: 'Recebido via PIX', value: dados.metodosPagamento.totalPix, cor: 'text-violet-700', bg: 'bg-violet-50 border-violet-200' },
                        ].map(item => (
                            <div key={item.label} className={`rounded-2xl border p-5 ${item.bg} ${isLoadingMetrics ? 'opacity-40' : ''}`}>
                                <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-2">{item.label}</p>
                                <p className={`text-2xl font-black ${item.cor}`}>
                                    R$ {item.value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                </p>
                            </div>
                        ))}
                    </div>
                )}

                {/* GRÁFICOS VISUAIS RECHARTS */}
                {mounted && chartData.length > 0 && (
                    <div className={`grid grid-cols-1 lg:grid-cols-2 gap-6 mb-10 transition-opacity duration-300 ${isLoadingMetrics ? 'opacity-40 pointer-events-none' : 'opacity-100'}`}>
                        <div className="bg-card p-6 md:p-8 rounded-2xl shadow-sm border border-border">
                            <h3 className="text-base font-bold text-foreground tracking-wide mb-6 flex items-center gap-2">
                                <span className="w-2 h-2 rounded-full bg-primary"></span>
                                Faturamento Consolidado
                            </h3>
                            <div className="h-72 w-full">
                                <ResponsiveContainer width="100%" height="100%">
                                    <LineChart data={chartData} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                                        <XAxis dataKey="data" tick={{ fontSize: 12, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
                                        <YAxis tick={{ fontSize: 12, fill: '#9ca3af' }} axisLine={false} tickLine={false} tickFormatter={(value) => `R$${value}`} />
                                        <Tooltip
                                            contentStyle={{ borderRadius: '12px', border: '1px solid #e5e7eb', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                                            formatter={(value: unknown) => {
                                                const numericValue = typeof value === 'number' ? value : 0
                                                return [`R$ ${numericValue.toFixed(2)}`, 'Faturamento'] as [string, string]
                                            }}
                                        />
                                        <Line type="monotone" dataKey="Faturamento (R$)" stroke="#8B5A2B" strokeWidth={3} dot={{ r: 4, fill: '#8B5A2B', strokeWidth: 2, stroke: '#fff' }} activeDot={{ r: 6 }} />
                                    </LineChart>
                                </ResponsiveContainer>
                            </div>
                        </div>

                        <div className="bg-card p-6 md:p-8 rounded-2xl shadow-sm border border-border">
                            <h3 className="text-base font-bold text-foreground tracking-wide mb-6 flex items-center gap-2">
                                <span className="w-2 h-2 rounded-full bg-secondary"></span>
                                Volume de Atendimentos
                            </h3>
                            <div className="h-72 w-full">
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={chartData} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                                        <XAxis dataKey="data" tick={{ fontSize: 12, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
                                        <YAxis allowDecimals={false} tick={{ fontSize: 12, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
                                        <Tooltip
                                            cursor={{ fill: 'rgba(0,0,0,0.05)' }}
                                            contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                                        />
                                        <Bar dataKey="Atendimentos" fill="#c5a87c" radius={[4, 4, 0, 0]} barSize={40} />
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        </div>
                    </div>
                )}

                {/* TABELA DE COMISSÕES */}
                <section className={`bg-card rounded-2xl shadow-sm border border-border transition-opacity mb-10 ${isLoadingMetrics ? 'opacity-40' : 'opacity-100'}`}>
                    <div className="p-6 md:p-8 border-b border-border bg-muted/30">
                        <h2 className="text-xl font-bold text-foreground tracking-tight">Regras de Comissão</h2>
                        <p className="text-sm text-muted-foreground mt-1">Configuração de repasse financeiro por profissional na equipe.</p>
                    </div>
                    <div className="w-full overflow-x-auto whitespace-nowrap md:whitespace-normal">
                        <div className="min-w-[1100px] inline-block align-middle w-full">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="bg-muted/10">
                                        <th className="p-5 text-xs font-bold text-muted-foreground uppercase tracking-widest border-b border-border">Profissional</th>
                                        <th className="p-5 text-xs font-bold text-center text-muted-foreground uppercase tracking-widest border-b border-border">Taxa (%)</th>
                                        <th className="p-5 text-xs font-bold text-center text-muted-foreground uppercase tracking-widest border-b border-border">Recebido (R$)</th>
                                        <th className="p-5 text-xs font-bold text-center text-muted-foreground uppercase tracking-widest border-b border-border">Ver Comissão</th>
                                        <th className="p-5 text-xs font-bold text-center text-muted-foreground uppercase tracking-widest border-b border-border">Pode Agendar</th>
                                        <th className="p-5 text-xs font-bold text-center text-muted-foreground uppercase tracking-widest border-b border-border">Ver Histórico</th>
                                        <th className="p-5 text-xs font-bold text-center text-muted-foreground uppercase tracking-widest border-b border-border">Cancelar</th>
                                        <th className="p-5 text-xs font-bold text-center text-muted-foreground uppercase tracking-widest border-b border-border">Gerir Clientes</th>
                                        <th className="p-5 text-xs font-bold text-center text-muted-foreground uppercase tracking-widest border-b border-border">Ver Financeiro</th>
                                        <th className="p-5 text-xs font-bold text-right text-muted-foreground uppercase tracking-widest border-b border-border">Ações</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {!dados || dados.equipe.length === 0 ? (
                                        <tr><td colSpan={8} className="p-8 text-center text-muted-foreground italic">Nenhum profissional registado com faturamento no período.</td></tr>
                                    ) : (
                                        dados.equipe.map((p) => {
                                            const estado = editState[p.id]
                                            if (!estado) return null
                                            const isSaving = loadingIds[p.id]

                                            const Toggle = ({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) => (
                                                <label className="relative inline-flex items-center cursor-pointer">
                                                    <input type="checkbox" className="sr-only peer" checked={checked} disabled={isSaving} onChange={e => onChange(e.target.checked)} />
                                                    <div className="w-11 h-6 bg-muted rounded-full peer peer-focus:ring-2 peer-focus:ring-primary/20 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:border-border after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                                                </label>
                                            )

                                            return (
                                                <tr key={p.id} className="border-b border-border hover:bg-muted/30 transition-colors">
                                                    <td className="p-4 font-bold text-foreground">{p.nome}</td>
                                                    <td className="p-4 text-center">
                                                        <div className="inline-flex items-center border border-border rounded overflow-hidden">
                                                            <input
                                                                type="number" min={0} max={100} disabled={isSaving}
                                                                value={estado.comissao}
                                                                onChange={(e) => setComissao(p.id, Number(e.target.value))}
                                                                className="w-16 px-2 py-1.5 text-center font-bold text-primary bg-card outline-none focus:bg-primary/5 disabled:bg-muted"
                                                            />
                                                            <span className="bg-muted px-2 py-1.5 text-muted-foreground font-bold border-l border-border">%</span>
                                                        </div>
                                                    </td>
                                                    <td className="p-4 text-center">
                                                        <div className="font-bold text-primary">R$ {p.totalComissaoRecebida?.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || '0,00'}</div>
                                                    </td>
                                                    <td className="p-4 text-center">
                                                        <Toggle checked={estado.podeVerComissao} onChange={v => setPodeVer(p.id, v)} />
                                                    </td>
                                                    <td className="p-4 text-center">
                                                        <Toggle checked={estado.podeAgendar} onChange={v => setPodeAgendar(p.id, v)} />
                                                    </td>
                                                    <td className="p-4 text-center">
                                                        <Toggle checked={estado.podeVerHistorico} onChange={v => setPodeVerHistorico(p.id, v)} />
                                                    </td>
                                                    <td className="p-4 text-center">
                                                        <Toggle checked={estado.podeCancelar} onChange={v => setPodeCancelar(p.id, v)} />
                                                    </td>
                                                    <td className="p-4 text-center">
                                                        <Toggle checked={estado.podeGerenciarClientes} onChange={v => setPodeGerenciarClientes(p.id, v)} />
                                                    </td>
                                                    <td className="p-4 text-center">
                                                        <Toggle checked={estado.podeVerFinanceiroGlobal} onChange={v => setPodeVerFinanceiroGlobal(p.id, v)} />
                                                    </td>
                                                    <td className="p-4 text-right">
                                                        <button
                                                            onClick={() => handleAtualizarRegras(p)}
                                                            disabled={isSaving}
                                                            className="bg-secondary text-foreground font-bold px-5 py-2 rounded-xl text-sm hover:bg-primary hover:text-primary-foreground transition-all disabled:opacity-50 disabled:cursor-not-allowed border border-border hover:border-primary shadow-sm"
                                                        >
                                                            {isSaving ? <Loader2 className="w-4 h-4 animate-spin inline mr-1" /> : null}
                                                            {isSaving ? 'A Guardar...' : 'Atualizar'}
                                                        </button>
                                                    </td>
                                                </tr>
                                            )
                                        })
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </section>
            </div>
        </div>
    )
}