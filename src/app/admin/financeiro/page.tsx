'use client'

import { useState, useEffect, useCallback } from 'react'
import dynamic from 'next/dynamic'
import { obterResumoFinanceiro, atualizarComissaoFuncionario, obterDadosGraficosFinanceiros } from '@/app/actions/financeiro'
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import type { FinanceiroResumo, FuncionarioResumo } from '@/types/domain'
import * as XLSX from 'xlsx'
import { Loader2 } from 'lucide-react'
import { MetricCard } from '@/components/admin/metric-card'

// Correção: Removido as chaves de { AdminHeader }
import AdminHeader from '@/components/admin/AdminHeader'

const BotaoExportarPDF = dynamic(() => import('@/components/BotaoExportarPDF'), {
    ssr: false,
    loading: () => <button disabled className="px-5 py-2.5 bg-muted text-muted-foreground rounded-xl text-sm font-bold opacity-50 shadow-sm">PDF a carregar...</button>
})

type EditState = Record<string, { comissao: number; podeVerComissao: boolean }>
type Mensagem = { texto: string; tipo: 'sucesso' | 'erro' }
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
    const [mensagem, setMensagem] = useState<Mensagem | null>(null)
    const [editState, setEditState] = useState<EditState>({})
    const [loadingIds, setLoadingIds] = useState<Record<string, boolean>>({})

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

        const [res, resGraficos] = await Promise.all([
            obterResumoFinanceiro(filtro),
            obterDadosGraficosFinanceiros(7)
        ])

        if (isSuccessResponse<FinanceiroResumo>(res)) {
            const dataResumo = res.data
            setDados(dataResumo)
            const estado: EditState = {}
            dataResumo.equipe.forEach((p) => {
                estado[p.id] = { comissao: p.comissao, podeVerComissao: p.podeVerComissao }
            })
            setEditState(estado)
        } else if (isErrorResponse(res)) {
            setMensagem({ texto: res.erro, tipo: 'erro' })
        } else {
            setMensagem({ texto: 'Erro ao carregar dados financeiros', tipo: 'erro' })
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

        const res = await atualizarComissaoFuncionario(prof.id, estado.comissao, estado.podeVerComissao)

        if (isSuccessResponse(res)) {
            setMensagem({ texto: `Regras de ${prof.nome} atualizadas!`, tipo: 'sucesso' })
            await carregarDados(periodoAtual)
        } else if (isErrorResponse(res)) {
            setMensagem({ texto: res.erro, tipo: 'erro' })
        } else {
            setMensagem({ texto: 'Erro ao atualizar regras', tipo: 'erro' })
        }

        setTimeout(() => setMensagem(null), 3000)
        setLoadingIds((prev) => ({ ...prev, [prof.id]: false }))
    }

    const setComissao = (id: string, comissao: number) =>
        setEditState((prev) => ({ ...prev, [id]: { ...prev[id]!, comissao } }))

    const setPodeVer = (id: string, podeVerComissao: boolean) =>
        setEditState((prev) => ({ ...prev, [id]: { ...prev[id]!, podeVerComissao } }))

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
        <div className="min-h-screen bg-background p-4 md:p-8 font-sans">
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

                {mensagem && (
                    <div className={`mb-6 p-4 rounded-xl text-sm text-center font-bold shadow-sm ${mensagem.tipo === 'sucesso' ? 'bg-green-100 text-green-700 border border-green-200' : 'bg-red-100 text-red-700 border border-red-200'}`}>
                        {mensagem.texto}
                    </div>
                )}

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
                    <div className="overflow-x-auto -mx-6 md:mx-0">
                        <div className="min-w-[800px] inline-block align-middle w-full">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="bg-muted/10">
                                        <th className="p-5 text-xs font-bold text-muted-foreground uppercase tracking-widest border-b border-border">Profissional</th>
                                        <th className="p-5 text-xs font-bold text-center text-muted-foreground uppercase tracking-widest border-b border-border">Taxa (%)</th>
                                        <th className="p-5 text-xs font-bold text-center text-muted-foreground uppercase tracking-widest border-b border-border">Recebido (R$)</th>
                                        <th className="p-5 text-xs font-bold text-center text-muted-foreground uppercase tracking-widest border-b border-border">Acesso Visível?</th>
                                        <th className="p-5 text-xs font-bold text-right text-muted-foreground uppercase tracking-widest border-b border-border">Ações</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {!dados || dados.equipe.length === 0 ? (
                                        <tr><td colSpan={5} className="p-8 text-center text-muted-foreground italic">Nenhum profissional registado com faturamento no período.</td></tr>
                                    ) : (
                                        dados.equipe.map((p) => {
                                            const estado = editState[p.id]
                                            if (!estado) return null
                                            const isSaving = loadingIds[p.id]

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
                                                        <label className="relative inline-flex items-center cursor-pointer">
                                                            <input
                                                                type="checkbox" className="sr-only peer"
                                                                checked={estado.podeVerComissao} disabled={isSaving}
                                                                onChange={(e) => setPodeVer(p.id, e.target.checked)}
                                                            />
                                                            <div className="w-11 h-6 bg-muted rounded-full peer peer-focus:ring-2 peer-focus:ring-primary/20 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:border-border after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                                                        </label>
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