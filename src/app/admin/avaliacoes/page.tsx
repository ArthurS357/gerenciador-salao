'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { listarAvaliacoesAdmin, type AvaliacaoAdminItem } from '@/app/actions/avaliacao'

export default function AvaliacoesPage() {
    const [avaliacoes, setAvaliacoes] = useState<AvaliacaoAdminItem[]>([])
    const [mediaGeral, setMediaGeral] = useState(0)
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        const carregarDados = async () => {
            const res = await listarAvaliacoesAdmin()
            if (res.sucesso && res.avaliacoes) {
                setAvaliacoes(res.avaliacoes)
                setMediaGeral(res.mediaGeral ?? 0)
            }
            setLoading(false)
        }
        carregarDados()
    }, [])

    const renderEstrelas = (nota: number) => {
        return (
            <div className="flex gap-1">
                {[1, 2, 3, 4, 5].map((estrela) => (
                    <span key={estrela} className={`text-lg ${nota >= estrela ? 'text-yellow-400' : 'text-gray-200'}`}>
                        ★
                    </span>
                ))}
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-[#fdfbf7] p-8 font-sans">
            <header className="mb-6 border-b-2 border-[#5C4033] pb-4 flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold text-[#5C4033]">Satisfação dos Clientes</h1>
                    <p className="text-gray-500 mt-1">Acompanhe o feedback e a nota NPS do salão.</p>
                </div>

                {/* Badge da Média Geral */}
                {!loading && avaliacoes.length > 0 && (
                    <div className="bg-white px-6 py-3 rounded-xl border border-[#e5d9c5] shadow-sm flex items-center gap-4">
                        <div>
                            <p className="text-xs font-bold text-gray-500 uppercase tracking-widest">Média do Salão</p>
                            <p className="text-2xl font-black text-[#5C4033] mt-1">{mediaGeral.toFixed(1)} <span className="text-yellow-400 text-xl">★</span></p>
                        </div>
                    </div>
                )}
            </header>

            {/* Navegação Horizontal */}
            <nav className="flex flex-wrap gap-3 mb-8">
                <Link href='/admin/dashboard' className="bg-white text-[#5C4033] border border-[#e5d9c5] px-5 py-2 rounded shadow-sm font-bold text-sm hover:border-[#8B5A2B]">Equipa</Link>
                <Link href='/admin/financeiro' className="bg-white text-[#5C4033] border border-[#e5d9c5] px-5 py-2 rounded shadow-sm font-bold text-sm hover:border-[#8B5A2B]">Financeiro</Link>
                <Link href='/admin/agendamentos' className="bg-white text-[#5C4033] border border-[#e5d9c5] px-5 py-2 rounded shadow-sm font-bold text-sm hover:border-[#8B5A2B]">Agendamentos</Link>
                <Link href='/admin/avaliacoes' className="bg-[#5C4033] text-white px-5 py-2 rounded shadow font-bold text-sm">Avaliações</Link>
            </nav>

            {loading ? (
                <div className="flex justify-center p-20 text-gray-400 font-bold uppercase tracking-widest text-sm">
                    A carregar avaliações...
                </div>
            ) : avaliacoes.length === 0 ? (
                <div className="bg-white rounded-xl border border-dashed border-[#e5d9c5] p-16 text-center">
                    <span className="text-4xl">⭐</span>
                    <p className="text-gray-500 font-bold mt-4">Nenhuma avaliação recebida ainda.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {avaliacoes.map((av) => (
                        <div key={av.id} className="bg-white rounded-xl p-6 shadow-sm border border-[#e5d9c5] flex flex-col justify-between">
                            <div>
                                <div className="flex justify-between items-start mb-4">
                                    {renderEstrelas(av.nota)}
                                    <span className="text-xs font-semibold text-gray-400">
                                        {new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'short' }).format(new Date(av.criadoEm))}
                                    </span>
                                </div>

                                {av.comentario ? (
                                    <p className="text-gray-700 text-sm italic mb-6">&quot;{av.comentario}&quot;</p>
                                ) : (
                                    <p className="text-gray-400 text-sm italic mb-6">Sem comentário por escrito.</p>
                                )}
                            </div>

                            <div className="pt-4 border-t border-gray-100 flex flex-col gap-1">
                                <p className="text-xs text-gray-500">
                                    Cliente: <strong className="text-gray-800">{av.agendamento.cliente.nome}</strong>
                                </p>
                                <p className="text-xs text-gray-500">
                                    Profissional: <strong className="text-[#8B5A2B]">{av.agendamento.funcionario.nome}</strong>
                                </p>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    )
}