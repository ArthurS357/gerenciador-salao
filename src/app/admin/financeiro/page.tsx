'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { obterResumoFinanceiro, atualizarComissaoFuncionario } from '@/app/actions/financeiro'
import type { FinanceiroResumo, FuncionarioResumo } from '@/types/domain'

type EditState = Record<string, { comissao: number; podeVerComissao: boolean }>
type Mensagem = { texto: string; tipo: 'sucesso' | 'erro' }

export default function PainelFinanceiroPage() {
    const [dados, setDados] = useState<FinanceiroResumo | null>(null)
    const [mensagem, setMensagem] = useState<Mensagem | null>(null)
    const [editState, setEditState] = useState<EditState>({})
    const [loadingIds, setLoadingIds] = useState<Record<string, boolean>>({})

    // 1. Função para carregamento inicial (dentro do useEffect)
    useEffect(() => {
        const init = async () => {
            const res = await obterResumoFinanceiro()
            if (res.sucesso) {
                setDados(res)
                const estado: EditState = {}
                res.equipe.forEach((p) => {
                    estado[p.id] = { comissao: p.comissao, podeVerComissao: p.podeVerComissao }
                })
                setEditState(estado)
            }
        }
        init()
    }, [])

    // 2. Função memoizada para ser chamada manualmente (botões de ação)
    const recarregarDados = useCallback(async () => {
        const res = await obterResumoFinanceiro()
        if (res.sucesso) {
            setDados(res)
            const estado: EditState = {}
            res.equipe.forEach((p) => {
                estado[p.id] = { comissao: p.comissao, podeVerComissao: p.podeVerComissao }
            })
            setEditState(estado)
        }
    }, [])

    const handleAtualizarRegras = async (prof: FuncionarioResumo) => {
        const estado = editState[prof.id]
        if (!estado) return

        setLoadingIds((prev) => ({ ...prev, [prof.id]: true }))

        const res = await atualizarComissaoFuncionario(prof.id, estado.comissao, estado.podeVerComissao)
        if (res.sucesso) {
            setMensagem({ texto: `Regras de ${prof.nome} atualizadas com sucesso!`, tipo: 'sucesso' })
            recarregarDados()
        } else {
            setMensagem({ texto: res.erro, tipo: 'erro' })
        }

        setLoadingIds((prev) => ({ ...prev, [prof.id]: false }))
    }

    const setComissao = (id: string, comissao: number) =>
        setEditState((prev) => ({ ...prev, [id]: { ...prev[id]!, comissao } }))

    const setPodeVer = (id: string, podeVerComissao: boolean) =>
        setEditState((prev) => ({ ...prev, [id]: { ...prev[id]!, podeVerComissao } }))

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
                    <p className="text-gray-500 mt-1">Visão global de faturamento, custos e metas de equipe.</p>
                </div>
            </header>

            {/* Menu de Navegação Horizontal */}
            <nav className="flex flex-wrap gap-3 mb-8">
                {[
                    { href: '/admin/dashboard', label: 'Equipa (Atual)' },
                    { href: '/admin/financeiro', label: 'Financeiro', ativo: true },
                    { href: '/admin/estoque', label: 'Estoque de Produtos' },
                    { href: '/admin/servicos', label: 'Portfólio / Serviços' },
                    { href: '/admin/agendamentos', label: 'Agendamentos Globais' },
                    { href: '/admin/clientes', label: 'Base de Clientes' },
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

            {/* Métricas Financeiras */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-10">
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

            {/* Tabela de Comissões */}
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
                                <tr><td colSpan={4} className="p-8 text-center text-gray-500">Nenhum profissional cadastrado.</td></tr>
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