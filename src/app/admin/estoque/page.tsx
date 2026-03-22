'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { listarProdutos, criarProduto, ajustarEstoque } from '@/app/actions/produto'
import type { Produto } from '@/types/domain'

type FormData = {
    nome: string
    descricao: string
    precoCusto: number
    precoVenda: number
    estoque: number
}

type Mensagem = { texto: string; tipo: 'sucesso' | 'erro' | 'info' }

const FORM_INICIAL: FormData = { nome: '', descricao: '', precoCusto: 0, precoVenda: 0, estoque: 0 }

export default function PainelEstoquePage() {
    const [produtos, setProdutos] = useState<Produto[]>([])
    const [isModalOpen, setIsModalOpen] = useState(false)
    const [mensagem, setMensagem] = useState<Mensagem | null>(null)
    const [formData, setFormData] = useState<FormData>(FORM_INICIAL)

    const carregarProdutos = useCallback(async () => {
        const res = await listarProdutos()
        if (res.sucesso) setProdutos(res.produtos)
    }, [])

    useEffect(() => {
        void carregarProdutos()
    }, [carregarProdutos])

    const handleSalvarProduto = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault()
        setMensagem({ texto: 'Salvando...', tipo: 'info' })
        const res = await criarProduto(formData)
        if (res.sucesso) {
            setMensagem({ texto: 'Produto cadastrado com sucesso!', tipo: 'sucesso' })
            setIsModalOpen(false)
            setFormData(FORM_INICIAL)
            void carregarProdutos()
        } else {
            setMensagem({ texto: res.erro, tipo: 'erro' })
        }
    }

    const handleAjusteRapido = async (id: string, quantidade: number) => {
        const res = await ajustarEstoque(id, quantidade)
        if (res.sucesso) void carregarProdutos()
        else alert(res.erro)
    }

    const campo =
        <K extends keyof FormData>(key: K) =>
            (e: React.ChangeEvent<HTMLInputElement>) => {
                const val = ['precoCusto', 'precoVenda', 'estoque'].includes(key)
                    ? (Number(e.target.value) as FormData[K])
                    : (e.target.value as FormData[K])
                setFormData((prev) => ({ ...prev, [key]: val }))
            }

    return (
        <div className="min-h-screen bg-[#fdfbf7] p-8 font-sans">
            <header className="mb-8 border-b-2 border-[#5C4033] pb-4 flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold text-[#5C4033]">Gestão de Estoque</h1>
                    <p className="text-gray-500 mt-1">Produtos, Custos e Valores de Venda</p>
                </div>
                <div className="flex items-center gap-4">
                    <Link href="/admin/dashboard" className="text-sm font-bold text-[#8B5A2B] hover:underline">
                        &larr; Voltar
                    </Link>
                    <button
                        onClick={() => setIsModalOpen(true)}
                        className="bg-[#8B5A2B] text-white px-4 py-2 rounded font-bold hover:bg-[#704620]"
                    >
                        + Novo Produto
                    </button>
                </div>
            </header>

            {mensagem && (
                <div
                    className={`mb-6 p-4 rounded font-bold text-center ${mensagem.tipo === 'erro' ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'
                        }`}
                >
                    {mensagem.texto}
                </div>
            )}

            <section className="bg-white rounded-lg shadow overflow-hidden border border-[#e5d9c5]">
                <table className="w-full text-left border-collapse">
                    <thead className="bg-[#5C4033] text-white">
                        <tr>
                            <th className="p-4 text-sm font-semibold">Produto</th>
                            <th className="p-4 text-sm font-semibold text-center">Custo (R$)</th>
                            <th className="p-4 text-sm font-semibold text-center">Venda (R$)</th>
                            <th className="p-4 text-sm font-semibold text-center">Estoque Atual</th>
                            <th className="p-4 text-sm font-semibold text-right">Ajuste Rápido</th>
                        </tr>
                    </thead>
                    <tbody>
                        {produtos.length === 0 ? (
                            <tr>
                                <td colSpan={5} className="p-8 text-center text-gray-500">
                                    Nenhum produto cadastrado no estoque.
                                </td>
                            </tr>
                        ) : (
                            produtos.map((p) => (
                                <tr key={p.id} className="border-b border-gray-100 hover:bg-gray-50">
                                    <td className="p-4">
                                        <div className="font-bold text-gray-800">{p.nome}</div>
                                        <div className="text-xs text-gray-500">{p.descricao ?? 'Sem descrição'}</div>
                                    </td>
                                    <td className="p-4 text-center text-gray-600">{p.precoCusto.toFixed(2)}</td>
                                    <td className="p-4 text-center font-bold text-green-600">
                                        {p.precoVenda.toFixed(2)}
                                    </td>
                                    <td className="p-4 text-center">
                                        <span
                                            className={`px-3 py-1 rounded-full text-xs font-bold ${p.estoque <= 5 ? 'bg-red-100 text-red-700' : 'bg-gray-200 text-gray-800'
                                                }`}
                                        >
                                            {p.estoque} un
                                        </span>
                                    </td>
                                    <td className="p-4 text-right space-x-2">
                                        <button
                                            onClick={() => handleAjusteRapido(p.id, -1)}
                                            className="bg-red-50 text-red-600 px-3 py-1 rounded border border-red-200 hover:bg-red-100 font-bold"
                                        >
                                            - 1
                                        </button>
                                        <button
                                            onClick={() => handleAjusteRapido(p.id, 1)}
                                            className="bg-green-50 text-green-600 px-3 py-1 rounded border border-green-200 hover:bg-green-100 font-bold"
                                        >
                                            + 1
                                        </button>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </section>

            {isModalOpen && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
                    <div className="bg-white p-8 rounded-lg shadow-xl w-full max-w-lg border-t-4 border-[#5C4033]">
                        <h2 className="text-2xl font-bold text-[#5C4033] mb-6">Cadastrar Produto</h2>
                        <form onSubmit={handleSalvarProduto} className="space-y-4">
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-1">Nome do Produto</label>
                                <input required type="text" value={formData.nome} className="w-full border rounded px-3 py-2" onChange={campo('nome')} />
                            </div>
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-1">Descrição</label>
                                <input type="text" value={formData.descricao} className="w-full border rounded px-3 py-2" onChange={campo('descricao')} />
                            </div>
                            <div className="grid grid-cols-3 gap-4">
                                {([
                                    { label: 'Custo (R$)', key: 'precoCusto', step: '0.01' },
                                    { label: 'Venda (R$)', key: 'precoVenda', step: '0.01' },
                                    { label: 'Qtd Inicial', key: 'estoque', step: '1' },
                                ] as const).map(({ label, key, step }) => (
                                    <div key={key}>
                                        <label className="block text-sm font-semibold text-gray-700 mb-1">{label}</label>
                                        <input required type="number" step={step} value={formData[key]} className="w-full border rounded px-3 py-2" onChange={campo(key)} />
                                    </div>
                                ))}
                            </div>
                            <div className="flex justify-end gap-3 mt-6">
                                <button
                                    type="button"
                                    onClick={() => { setIsModalOpen(false); setFormData(FORM_INICIAL) }}
                                    className="px-4 py-2 text-gray-600 font-bold hover:bg-gray-100 rounded"
                                >
                                    Cancelar
                                </button>
                                <button
                                    type="submit"
                                    className="px-4 py-2 bg-[#5C4033] text-white font-bold rounded hover:bg-[#3e2b22]"
                                >
                                    Salvar Produto
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    )
}