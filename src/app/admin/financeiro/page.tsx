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
    // Estado controlado para cada linha — substitui o anti-pattern getElementById
    const [editState, setEditState] = useState<EditState>({})

    const carregarDados = useCallback(async () => {
        const res = await obterResumoFinanceiro()
        if (res.sucesso) {
            setDados(res)
            // Inicializa o estado de edição com os valores actuais do banco
            const estado: EditState = {}
            res.equipe.forEach((p) => {
                estado[p.id] = { comissao: p.comissao, podeVerComissao: p.podeVerComissao }
            })
            setEditState(estado)
        }
    }, [])

    useEffect(() => {
        void carregarDados()
    }, [carregarDados])

    const handleAtualizarRegras = async (prof: FuncionarioResumo) => {
        const estado = editState[prof.id]
        if (!estado) return

        const res = await atualizarComissaoFuncionario(prof.id, estado.comissao, estado.podeVerComissao)
        if (res.sucesso) {
            setMensagem({ texto: 'Regras de comissão atualizadas com sucesso.', tipo: 'sucesso' })
            void carregarDados()
        } else {
            setMensagem({ texto: res.erro, tipo: 'erro' })
        }
    }

    const setComissao = (id: string, comissao: number) =>
        setEditState((prev) => ({ ...prev, [id]: { ...prev[id]!, comissao } }))

    const setPodeVer = (id: string, podeVerComissao: boolean) =>
        setEditState((prev) => ({ ...prev, [id]: { ...prev[id]!, podeVerComissao } }))

    if (!dados) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-[#fdfbf7]">
                <p className="text-gray-500">Carregando balanço...</p>
            </div>
        )
    }

    const cards = [
        { label: 'Faturamento Bruto', valor: dados.faturamentoBruto, cor: 'border-blue-500', textCor: 'text-gray-800' },
        { label: 'Custo de Produtos', valor: dados.custoProdutos, cor: 'border-red-500', textCor: 'text-red-600' },
        { label: 'Comissões Pagas', valor: dados.totalComissoes, cor: 'border-orange-500', textCor: 'text-orange-600' },
        { label: 'Lucro Líquido', valor: dados.lucroLiquido, cor: 'border-green-500', textCor: 'text-green-600' },
    ] as const

    return (
        <div className="min-h-screen bg-[#fdfbf7] p-8 font-sans">
            <header className="mb-8 border-b-2 border-[#5C4033] pb-4 flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold text-[#5C4033]">Painel Financeiro</h1>
                    <p className="text-gray-500 mt-1">Visão global de faturamento, custos e metas de equipe.</p>
                </div>
                <Link href="/admin/dashboard" className="text-sm font-bold text-[#8B5A2B] hover:underline">
                    &larr; Voltar
                </Link>
            </header>

            {/* Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-10">
                {cards.map(({ label, valor, cor, textCor }) => (
                    <div key={label} className={`bg-white p-6 rounded-lg shadow border-l-4 ${cor}`}>
                        <p className="text-sm font-semibold text-gray-500">{label}</p>
                        <p className={`text-2xl font-bold ${textCor}`}>R$ {valor.toFixed(2)}</p>
                    </div>
                ))}
            </div>

            {mensagem && (
                <div
                    className={`mb-6 p-4 rounded text-center font-bold ${mensagem.tipo === 'sucesso' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                        }`}
                >
                    {mensagem.texto}
                </div>
            )}

            {/* Gestão de comissões — estado controlado */}
            <section className="bg-white rounded-lg shadow overflow-hidden border border-[#e5d9c5]">
                <h2 className="bg-[#5C4033] text-white p-4 text-lg font-bold">
                    Gestão de Comissões por Profissional
                </h2>
                <table className="w-full text-left border-collapse">
                    <thead>
                        <tr className="bg-gray-50 border-b border-gray-200">
                            <th className="p-4 text-sm font-semibold text-gray-700">Profissional</th>
                            <th className="p-4 text-sm font-semibold text-center text-gray-700">Taxa (%)</th>
                            <th className="p-4 text-sm font-semibold text-center text-gray-700">Vê Comissão?</th>
                            <th className="p-4 text-sm font-semibold text-right text-gray-700">Ações</th>
                        </tr>
                    </thead>
                    <tbody>
                        {dados.equipe.map((p) => {
                            const estado = editState[p.id]
                            if (!estado) return null
                            return (
                                <tr key={p.id} className="border-b border-gray-100">
                                    <td className="p-4 font-bold text-gray-800">{p.nome}</td>
                                    <td className="p-4 text-center">
                                        <input
                                            type="number"
                                            min={0}
                                            max={100}
                                            value={estado.comissao}
                                            onChange={(e) => setComissao(p.id, Number(e.target.value))}
                                            className="w-20 border rounded px-2 py-1 text-center"
                                        />
                                    </td>
                                    <td className="p-4 text-center">
                                        <input
                                            type="checkbox"
                                            checked={estado.podeVerComissao}
                                            onChange={(e) => setPodeVer(p.id, e.target.checked)}
                                            className="w-5 h-5 accent-[#8B5A2B]"
                                        />
                                    </td>
                                    <td className="p-4 text-right">
                                        <button
                                            onClick={() => handleAtualizarRegras(p)}
                                            className="bg-[#8B5A2B] text-white px-4 py-2 rounded text-sm font-bold hover:bg-[#704620]"
                                        >
                                            Salvar Regras
                                        </button>
                                    </td>
                                </tr>
                            )
                        })}
                    </tbody>
                </table>
            </section>
        </div>
    )
}