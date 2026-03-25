'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import dynamic from 'next/dynamic' // <-- NOVA IMPORTAÇÃO
import { obterResumoFinanceiro, atualizarComissaoFuncionario } from '@/app/actions/financeiro'
import type { FinanceiroResumo, FuncionarioResumo } from '@/types/domain'
import * as XLSX from 'xlsx'

// Carregamos o componente de PDF dinamicamente, forçando a NÃO renderizar no servidor (ssr: false)
// Isto previne os erros de build do Turbopack
const BotaoExportarPDF = dynamic(() => import('@/components/BotaoExportarPDF'), {
    ssr: false,
    loading: () => <button disabled className="px-5 py-2.5 bg-gray-300 text-white rounded-lg text-sm font-bold opacity-50 cursor-not-allowed">PDF a carregar...</button>
})

type EditState = Record<string, { comissao: number; podeVerComissao: boolean }>
type Mensagem = { texto: string; tipo: 'sucesso' | 'erro' }
type PeriodoFiltro = 'hoje' | 'semana' | 'mes' | 'tudo'

export default function PainelFinanceiroPage() {
    const [dados, setDados] = useState<FinanceiroResumo | null>(null)
    const [mensagem, setMensagem] = useState<Mensagem | null>(null)
    const [editState, setEditState] = useState<EditState>({})
    const [loadingIds, setLoadingIds] = useState<Record<string, boolean>>({})

    const [periodoAtual, setPeriodoAtual] = useState<PeriodoFiltro>('mes')
    const [isLoadingMetrics, setIsLoadingMetrics] = useState(false)

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
        const filtro = obterDatasDoFiltro(periodo)

        const res = await obterResumoFinanceiro(filtro)
        if (res.sucesso) {
            setDados(res)
            const estado: EditState = {}
            res.equipe.forEach((p) => {
                estado[p.id] = { comissao: p.comissao, podeVerComissao: p.podeVerComissao }
            })
            setEditState(estado)
        } else {
            setMensagem({ texto: res.erro, tipo: 'erro' })
        }
        setIsLoadingMetrics(false)
    }, [])

    useEffect(() => {
        let isMounted = true;

        const fetchFinanceiro = async () => {
            if (isMounted) {
                await carregarDados(periodoAtual);
            }
        };

        fetchFinanceiro();

        return () => {
            isMounted = false;
        };
    }, [carregarDados, periodoAtual])

    const handleAtualizarRegras = async (prof: FuncionarioResumo) => {
        const estado = editState[prof.id]
        if (!estado) return

        setLoadingIds((prev) => ({ ...prev, [prof.id]: true }))

        const res = await atualizarComissaoFuncionario(prof.id, estado.comissao, estado.podeVerComissao)
        if (res.sucesso) {
            setMensagem({ texto: `Regras de ${prof.nome} atualizadas com sucesso!`, tipo: 'sucesso' })
            setIsLoadingMetrics(true)
            await carregarDados(periodoAtual)
        } else {
            setMensagem({ texto: res.erro, tipo: 'erro' })
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

    if (!dados) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-[#fdfbf7]">
                <p className="text-gray-500 font-bold uppercase tracking-wider">A carregar métricas...</p>
            </div>
        )
    }

    const cards = [
        { label: 'Faturamento Bruto', valor: dados.faturamentoBruto, cor: 'border-blue-500', textCor: 'text-gray-800' },
        { label: 'Custos (Insumos + Revenda)', valor: dados.custoProdutos, cor: 'border-red-500', textCor: 'text-red-600' },
        { label: 'Comissões Pagas', valor: dados.totalComissoes, cor: 'border-orange-500', textCor: 'text-orange-600' },
        { label: 'Lucro Líquido (Real)', valor: dados.lucroLiquido, cor: 'border-green-500', textCor: 'text-green-600' },
    ] as const

    return (
        <div className="min-h-screen bg-[#fdfbf7] p-8 font-sans">
            <header className="mb-6 border-b-2 border-[#5C4033] pb-4 flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold text-[#5C4033]">Painel Financeiro</h1>
                    <p className="text-gray-500 mt-1">Visão global de faturamento, custos e metas de equipa.</p>
                </div>
            </header>

            <nav className="flex flex-wrap gap-3 mb-8">
                {[
                    { href: '/admin/dashboard', label: 'Equipa (Atual)' },
                    { href: '/admin/financeiro', label: 'Financeiro', ativo: true },
                    { href: '/admin/estoque', label: 'Estoque de Produtos' },
                    { href: '/admin/servicos', label: 'Portfólio / Serviços' },
                    { href: '/admin/agendamentos', label: 'Agendamentos Globais' },
                    { href: '/admin/clientes', label: 'Base de Clientes' },
                    { href: '/admin/avaliacoes', label: 'Avaliações' },
                ].map(({ href, label, ativo }) => (
                    <Link
                        key={href}
                        href={href}
                        className={
                            ativo
                                ? 'bg-[#5C4033] text-white px-5 py-2 rounded shadow font-bold text-sm'
                                : 'bg-white text-[#5C4033] border border-[#e5d9c5] px-5 py-2 rounded shadow-sm font-bold text-sm hover:border-[#8B5A2B] hover:bg-orange-50 transition-colors'
                        }
                    >
                        {label}
                    </Link>
                ))}
            </nav>

            <div className="flex flex-col xl:flex-row items-start xl:items-center justify-between bg-white p-5 rounded-lg shadow-sm border border-[#e5d9c5] mb-6 gap-4">
                <div className="flex flex-col sm:flex-row sm:items-center gap-3 w-full xl:w-auto">
                    <span className="text-sm font-bold text-gray-600 uppercase tracking-wider">Período de Análise:</span>
                    <div className="flex flex-wrap gap-2">
                        {botoesFiltro.map(btn => (
                            <button
                                key={btn.valor}
                                onClick={() => {
                                    if (periodoAtual !== btn.valor) {
                                        setIsLoadingMetrics(true)
                                        setPeriodoAtual(btn.valor)
                                    }
                                }}
                                disabled={isLoadingMetrics}
                                className={`px-4 py-2 rounded text-sm font-bold transition-colors ${periodoAtual === btn.valor
                                    ? 'bg-[#8B5A2B] text-white shadow-sm'
                                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                    }`}
                            >
                                {btn.label}
                            </button>
                        ))}
                    </div>
                </div>

                <div className="flex gap-3 w-full sm:w-auto mt-2 xl:mt-0 pt-4 xl:pt-0 border-t xl:border-0 border-gray-100">
                    <button
                        onClick={exportarParaExcel}
                        disabled={isLoadingMetrics || !dados}
                        className="flex-1 sm:flex-none flex justify-center items-center gap-2 px-5 py-2.5 bg-green-600 text-white rounded-lg font-bold hover:bg-green-700 transition-colors disabled:opacity-50 text-sm shadow-sm"
                    >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path></svg>
                        Excel
                    </button>
                    {/* AQUI ESTÁ O NOVO COMPONENTE ISOLADO! */}
                    <BotaoExportarPDF dados={dados} periodoAtual={periodoAtual} isLoadingMetrics={isLoadingMetrics} />
                </div>
            </div>

            <div className={`grid grid-cols-1 md:grid-cols-4 gap-6 mb-10 transition-opacity duration-300 ${isLoadingMetrics ? 'opacity-40 pointer-events-none' : 'opacity-100'}`}>
                {cards.map(({ label, valor, cor, textCor }) => (
                    <div key={label} className={`bg-white p-6 rounded-lg shadow border-l-4 ${cor}`}>
                        <p className="text-sm font-semibold text-gray-500 uppercase tracking-wide">{label}</p>
                        <p className={`text-2xl font-bold mt-2 ${textCor}`}>R$ {valor.toFixed(2)}</p>
                    </div>
                ))}
            </div>

            {mensagem && (
                <div className={`mb-6 p-4 rounded text-center font-bold shadow-sm ${mensagem.tipo === 'sucesso' ? 'bg-green-100 text-green-700 border border-green-200' : 'bg-red-100 text-red-700 border border-red-200'}`}>
                    {mensagem.texto}
                </div>
            )}

            <section className="bg-white rounded-lg shadow overflow-hidden border border-[#e5d9c5]">
                <h2 className="bg-[#5C4033] text-white p-4 text-lg font-bold">
                    Gestão de Comissões por Profissional
                </h2>
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-gray-50 border-b border-gray-200">
                                <th className="p-4 text-sm font-semibold text-gray-700 uppercase tracking-wider">Profissional</th>
                                <th className="p-4 text-sm font-semibold text-center text-gray-700 uppercase tracking-wider">Taxa (%)</th>
                                <th className="p-4 text-sm font-semibold text-center text-gray-700 uppercase tracking-wider">Acesso Visível?</th>
                                <th className="p-4 text-sm font-semibold text-right text-gray-700 uppercase tracking-wider">Ações</th>
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
                                                    className="bg-[#8B5A2B] text-white px-5 py-2 rounded text-sm font-bold shadow-sm hover:bg-[#704620] hover:shadow transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                                                >
                                                    {isSaving ? 'A Guardar...' : 'Salvar Regras'}
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