'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import dynamic from 'next/dynamic'
import { obterResumoFinanceiro, atualizarComissaoFuncionario, obterDadosGraficosFinanceiros } from '@/app/actions/financeiro'
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import type { FinanceiroResumo, FuncionarioResumo } from '@/types/domain'
import * as XLSX from 'xlsx'

// Carregamos o componente de PDF dinamicamente, forçando a NÃO renderizar no servidor (ssr: false)
// Isto previne os erros de build do Turbopack
const BotaoExportarPDF = dynamic(() => import('@/components/BotaoExportarPDF'), {
    ssr: false,
    loading: () => <button disabled className="px-5 py-2.5 bg-gray-300 text-white rounded-lg text-sm font-bold opacity-50 cursor-not-allowed shadow-sm">PDF a carregar...</button>
})

type EditState = Record<string, { comissao: number; podeVerComissao: boolean }>
type Mensagem = { texto: string; tipo: 'sucesso' | 'erro' }
type PeriodoFiltro = 'hoje' | 'semana' | 'mes' | 'tudo'
type ChartData = { data: string; 'Faturamento (R$)': number; Atendimentos: number }

// Type guards para verificar os tipos de resposta
function isSuccessResponse<T>(response: unknown): response is T & { sucesso: true } {
    return typeof response === 'object' && response !== null && 'sucesso' in response && (response as Record<string, unknown>).sucesso === true
}

function isErrorResponse(response: unknown): response is { sucesso: false; erro: string } {
    return typeof response === 'object' && response !== null && 'sucesso' in response && (response as Record<string, unknown>).sucesso === false && 'erro' in response
}

function isFinanceiroResumo(response: unknown): response is FinanceiroResumo {
    return typeof response === 'object' && response !== null && 'equipe' in response
}

function isChartDataResponse(response: unknown): response is { chartData: ChartData[] } {
    return typeof response === 'object' && response !== null && 'chartData' in response
}

export default function PainelFinanceiroPage() {
    const [dados, setDados] = useState<FinanceiroResumo | null>(null)
    const [chartData, setChartData] = useState<ChartData[]>([])
    const [mensagem, setMensagem] = useState<Mensagem | null>(null)
    const [editState, setEditState] = useState<EditState>({})
    const [loadingIds, setLoadingIds] = useState<Record<string, boolean>>({})

    const [periodoAtual, setPeriodoAtual] = useState<PeriodoFiltro>('mes')
    const [isLoadingMetrics, setIsLoadingMetrics] = useState(true)

    // PREVENÇÃO DE ERRO NO RECHARTS: Garante que os gráficos só tentam ler as dimensões após a página estar montada no browser
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

        // Busca os totais e os dados do gráfico ao mesmo tempo
        const [res, resGraficos] = await Promise.all([
            obterResumoFinanceiro(filtro),
            obterDadosGraficosFinanceiros(7)
        ])

        // Processa resposta do resumo financeiro
        if (isSuccessResponse<FinanceiroResumo>(res) && isFinanceiroResumo(res)) {
            setDados(res)
            const estado: EditState = {}
            res.equipe.forEach((p) => {
                estado[p.id] = { comissao: p.comissao, podeVerComissao: p.podeVerComissao }
            })
            setEditState(estado)
        } else if (isErrorResponse(res)) {
            setMensagem({ texto: res.erro, tipo: 'erro' })
        } else {
            setMensagem({ texto: 'Erro ao carregar dados financeiros', tipo: 'erro' })
        }

        // Processa resposta dos dados gráficos
        if (isSuccessResponse<{ chartData: ChartData[] }>(resGraficos) && isChartDataResponse(resGraficos)) {
            setChartData(resGraficos.chartData)
        } else if (isErrorResponse(resGraficos)) {
            console.error('Erro ao carregar dados gráficos:', resGraficos.erro)
        }

        setIsLoadingMetrics(false)
    }, [])

    useEffect(() => {
        let isMounted = true

        const fetchFinanceiro = async () => {
            if (isMounted) await carregarDados(periodoAtual)
        }

        fetchFinanceiro()

        return () => { isMounted = false }
    }, [carregarDados, periodoAtual])

    const handleAtualizarRegras = async (prof: FuncionarioResumo) => {
        const estado = editState[prof.id]
        if (!estado) return

        setLoadingIds((prev) => ({ ...prev, [prof.id]: true }))

        const res = await atualizarComissaoFuncionario(prof.id, estado.comissao, estado.podeVerComissao)

        if (isSuccessResponse(res)) {
            setMensagem({ texto: `Regras de ${prof.nome} atualizadas com sucesso!`, tipo: 'sucesso' })
            await carregarDados(periodoAtual)
        } else if (isErrorResponse(res)) {
            setMensagem({ texto: res.erro, tipo: 'erro' })
        } else {
            setMensagem({ texto: 'Erro ao atualizar regras', tipo: 'erro' })
        }

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
            'Acesso Visível à Comanda': p.podeVerComissao ? 'Sim' : 'Não'
        }))
        const wsEquipa = XLSX.utils.json_to_sheet(equipaData)

        const wb = XLSX.utils.book_new()
        XLSX.utils.book_append_sheet(wb, wsResumo, 'Resumo Financeiro')
        XLSX.utils.book_append_sheet(wb, wsEquipa, 'Equipe de Profissionais')

        XLSX.writeFile(wb, `Relatorio_Financeiro_${periodoAtual}.xlsx`)
    }

    if (!dados && isLoadingMetrics) {
        return (
            <div className="min-h-screen flex flex-col gap-4 items-center justify-center bg-[#fdfbf7]">
                <svg className="animate-spin h-8 w-8 text-[#8B5A2B]" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                <p className="text-[#8B5A2B] font-bold uppercase tracking-wider text-sm">A processar motor financeiro...</p>
            </div>
        )
    }

    if (!dados) return null

    const cards = [
        { label: 'Faturamento Bruto', valor: dados.faturamentoBruto, cor: 'border-blue-400', textCor: 'text-gray-900', bgGrad: 'from-blue-50 to-transparent' },
        { label: 'Custos Operacionais', valor: dados.custoProdutos, cor: 'border-rose-400', textCor: 'text-rose-600', bgGrad: 'from-rose-50 to-transparent' },
        { label: 'Comissões Repassadas', valor: dados.totalComissoes, cor: 'border-orange-400', textCor: 'text-orange-600', bgGrad: 'from-orange-50 to-transparent' },
        { label: 'Lucro Líquido Real', valor: dados.lucroLiquido, cor: 'border-emerald-400', textCor: 'text-emerald-700', bgGrad: 'from-emerald-50 to-transparent' },
    ] as const

    return (
        <div className="min-h-screen bg-[#fdfbf7] p-4 md:p-8 font-sans">
            <header className="mb-8 flex flex-col md:flex-row md:justify-between md:items-end gap-4">
                <div>
                    <h1 className="text-3xl md:text-4xl font-black text-[#5C4033] tracking-tight">Visão Financeira</h1>
                    <p className="text-gray-500 mt-2 text-sm md:text-base">Análise de métricas, lucros e evolução do seu salão.</p>
                </div>
            </header>

            <nav className="flex flex-wrap gap-2 md:gap-3 mb-10 p-1 md:p-1.5 bg-gray-100/60 backdrop-blur rounded-2xl w-fit">
                {[
                    { href: '/admin/dashboard', label: 'Equipa' },
                    { href: '/admin/financeiro', label: 'Financeiro', ativo: true },
                    { href: '/admin/estoque', label: 'Estoque' },
                    { href: '/admin/servicos', label: 'Serviços' },
                    { href: '/admin/agendamentos', label: 'Agendamentos' },
                    { href: '/admin/clientes', label: 'Clientes' },
                ].map(({ href, label, ativo }) => (
                    <Link
                        key={href}
                        href={href}
                        className={
                            ativo
                                ? 'bg-white text-[#5C4033] px-5 py-2 md:py-2.5 rounded-xl shadow-sm font-bold text-[13px] md:text-sm tracking-wide'
                                : 'text-gray-500 px-5 py-2 md:py-2.5 rounded-xl font-semibold text-[13px] md:text-sm tracking-wide hover:bg-white/50 hover:text-gray-900 transition-all'
                        }
                    >
                        {label}
                    </Link>
                ))}
            </nav>

            {/* BARRA DE FILTROS E EXPORTAÇÃO */}
            <div className="flex flex-col xl:flex-row items-start xl:items-center justify-between mb-8 gap-4">
                <div className="flex flex-col sm:flex-row sm:items-center gap-4 w-full xl:w-auto">
                    <div className="flex flex-wrap gap-2 p-1 bg-gray-200/50 rounded-full">
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
                                    ? 'bg-white text-[#5C4033] shadow-sm'
                                    : 'text-gray-500 hover:text-gray-800'
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
                        className="flex-1 sm:flex-none flex justify-center items-center gap-2 px-5 py-2.5 bg-emerald-600/10 text-emerald-700 border border-emerald-200 rounded-xl font-bold hover:bg-emerald-600 hover:text-white transition-all disabled:opacity-50 text-sm shadow-sm"
                    >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path></svg>
                        Excel
                    </button>
                    {/* Componente dinâmico carrega em segurança apenas no cliente */}
                    <BotaoExportarPDF dados={dados} periodoAtual={periodoAtual} isLoadingMetrics={isLoadingMetrics} />
                </div>
            </div>

            {/* MÉTRICAS (CARDS) */}
            <div className={`grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6 mb-10 transition-opacity duration-300 ${isLoadingMetrics ? 'opacity-40 pointer-events-none' : 'opacity-100'}`}>
                {cards.map(({ label, valor, cor, textCor, bgGrad }) => (
                    <div key={label} className={`relative bg-white p-6 rounded-2xl shadow-sm hover:shadow-md transition-shadow border border-t-[3px] border-x-gray-100 border-b-gray-100 ${cor} overflow-hidden group`}>
                        <div className={`absolute inset-0 bg-gradient-to-br ${bgGrad} opacity-50 group-hover:opacity-100 transition-opacity duration-500`} />
                        <div className="relative z-10">
                            <p className="text-[11px] md:text-xs font-bold text-gray-400 uppercase tracking-[0.15em]">{label}</p>
                            <p className={`text-2xl md:text-3xl font-black mt-3 tracking-tight ${textCor}`}>
                                <span className="text-base md:text-lg opacity-70 font-semibold mr-1">R$</span>
                                {valor.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </p>
                        </div>
                    </div>
                ))}
            </div>

            {/* GRÁFICOS VISUAIS RECHARTS (SÓ RENDERIZA DEPOIS DE MONTADO) */}
            {mounted && chartData.length > 0 && (
                <div className={`grid grid-cols-1 lg:grid-cols-2 gap-6 mb-10 transition-opacity duration-300 ${isLoadingMetrics ? 'opacity-40 pointer-events-none' : 'opacity-100'}`}>
                    <div className="bg-white p-6 md:p-8 rounded-2xl shadow-sm border border-gray-100">
                        <h3 className="text-base font-bold text-[#5C4033] tracking-wide mb-6 flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-[#8B5A2B]"></span>
                            Faturamento Consolidado
                        </h3>
                        <div className="h-72 w-full">
                            <ResponsiveContainer width="100%" height="100%">
                                <LineChart data={chartData} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                                    <XAxis dataKey="data" tick={{ fontSize: 12, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
                                    <YAxis tick={{ fontSize: 12, fill: '#9ca3af' }} axisLine={false} tickLine={false} tickFormatter={(value) => `R$${value}`} />
                                    <Tooltip
                                        contentStyle={{ borderRadius: '12px', border: '1px solid #f3f4f6', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)' }}
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

                    <div className="bg-white p-6 md:p-8 rounded-2xl shadow-sm border border-gray-100">
                        <h3 className="text-base font-bold text-[#5C4033] tracking-wide mb-6 flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-[#c5a87c]"></span>
                            Volume de Atendimentos
                        </h3>
                        <div className="h-72 w-full">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={chartData} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                                    <XAxis dataKey="data" tick={{ fontSize: 12, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
                                    <YAxis allowDecimals={false} tick={{ fontSize: 12, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
                                    <Tooltip
                                        cursor={{ fill: '#fdfbf7' }}
                                        contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                                    />
                                    <Bar dataKey="Atendimentos" fill="#c5a87c" radius={[4, 4, 0, 0]} barSize={40} />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                </div>
            )}

            {mensagem && (
                <div className={`mb-6 p-4 rounded text-center font-bold shadow-sm ${mensagem.tipo === 'sucesso' ? 'bg-green-100 text-green-700 border border-green-200' : 'bg-red-100 text-red-700 border border-red-200'}`}>
                    {mensagem.texto}
                </div>
            )}

            {/* TABELA DE COMISSÕES */}
            <section className={`bg-white rounded-2xl shadow-sm border border-gray-100 transition-opacity mb-10 ${isLoadingMetrics ? 'opacity-40' : 'opacity-100'}`}>
                <div className="p-6 md:p-8 border-b border-gray-100">
                    <h2 className="text-xl font-bold text-[#5C4033] tracking-tight">Regras de Comissão</h2>
                    <p className="text-sm text-gray-500 mt-1">Configuração de repasse financeiro por profissional na equipa.</p>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-gray-50/50">
                                <th className="p-5 text-xs font-bold text-gray-400 uppercase tracking-widest border-b border-gray-100">Profissional</th>
                                <th className="p-5 text-xs font-bold text-center text-gray-400 uppercase tracking-widest border-b border-gray-100">Taxa (%)</th>
                                <th className="p-5 text-xs font-bold text-center text-gray-400 uppercase tracking-widest border-b border-gray-100">Acesso Visível?</th>
                                <th className="p-5 text-xs font-bold text-right text-gray-400 uppercase tracking-widest border-b border-gray-100">Ações</th>
                            </tr>
                        </thead>
                        <tbody>
                            {dados.equipe.length === 0 ? (
                                <tr><td colSpan={4} className="p-8 text-center text-gray-500">Nenhum profissional registado.</td></tr>
                            ) : (
                                dados.equipe.map((p) => {
                                    const estado = editState[p.id]
                                    if (!estado) return null
                                    const isSaving = loadingIds[p.id]

                                    return (
                                        <tr key={p.id} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                                            <td className="p-4 font-bold text-gray-800">{p.nome}</td>
                                            <td className="p-4 text-center">
                                                <div className="inline-flex items-center border border-gray-300 rounded overflow-hidden">
                                                    <input
                                                        type="number"
                                                        min={0}
                                                        max={100}
                                                        disabled={isSaving}
                                                        value={estado.comissao}
                                                        onChange={(e) => setComissao(p.id, Number(e.target.value))}
                                                        className="w-16 px-2 py-1 text-center font-bold text-[#8B5A2B] outline-none focus:bg-orange-50 disabled:bg-gray-100"
                                                    />
                                                    <span className="bg-gray-100 px-2 py-1 text-gray-500 font-bold border-l border-gray-300">%</span>
                                                </div>
                                            </td>
                                            <td className="p-4 text-center">
                                                <label className="relative inline-flex items-center cursor-pointer">
                                                    <input
                                                        type="checkbox"
                                                        className="sr-only peer"
                                                        checked={estado.podeVerComissao}
                                                        disabled={isSaving}
                                                        onChange={(e) => setPodeVer(p.id, e.target.checked)}
                                                    />
                                                    <div className="w-11 h-6 bg-gray-200 rounded-full peer peer-focus:ring-4 peer-focus:ring-orange-300 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#8B5A2B]"></div>
                                                </label>
                                            </td>
                                            <td className="p-4 text-right">
                                                    <button
                                                        onClick={() => handleAtualizarRegras(p)}
                                                        disabled={isSaving}
                                                        className="bg-gray-100 text-[#5C4033] font-bold px-5 py-2 rounded-xl text-sm hover:bg-[#5C4033] hover:text-white transition-all disabled:opacity-50 disabled:cursor-not-allowed border border-gray-200 hover:border-[#5C4033]"
                                                    >
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
            </section>
        </div>
    )
}