'use client'

import { useState, useEffect } from 'react'
import { listarAvaliacoesAdmin, type AvaliacaoAdminItem } from '@/app/actions/avaliacao'
import AdminHeader from '@/components/admin/AdminHeader'

// ── Helpers ───────────────────────────────────────────────────────────────────

function Estrelas({ nota }: { nota: number }) {
    return (
        <div className="flex gap-0.5">
            {[1, 2, 3, 4, 5].map(n => (
                <svg key={n} width="16" height="16" viewBox="0 0 24 24"
                    fill={nota >= n ? '#f59e0b' : 'none'}
                    stroke={nota >= n ? '#f59e0b' : '#d1d5db'}
                    strokeWidth="1.5">
                    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                </svg>
            ))}
        </div>
    )
}

function corNota(nota: number): string {
    if (nota >= 5) return 'bg-emerald-100 text-emerald-700 border-emerald-200'
    if (nota >= 4) return 'bg-green-100 text-green-700 border-green-200'
    if (nota >= 3) return 'bg-yellow-100 text-yellow-700 border-yellow-200'
    if (nota >= 2) return 'bg-orange-100 text-orange-700 border-orange-200'
    return 'bg-red-100 text-red-700 border-red-200'
}

function labelNota(nota: number): string {
    if (nota >= 5) return 'Excelente'
    if (nota >= 4) return 'Ótimo'
    if (nota >= 3) return 'Bom'
    if (nota >= 2) return 'Regular'
    return 'Ruim'
}

// ── Componente Principal ──────────────────────────────────────────────────────

export default function AvaliacoesPage() {
    const [avaliacoes, setAvaliacoes] = useState<AvaliacaoAdminItem[]>([])
    const [mediaGeral, setMediaGeral] = useState(0)
    const [loading, setLoading] = useState(true)
    const [filtroNota, setFiltroNota] = useState<number | null>(null)

    useEffect(() => {
        const carregar = async () => {
            const res = await listarAvaliacoesAdmin()
            if (res.sucesso) {
                setAvaliacoes(res.data.avaliacoes)
                setMediaGeral(res.data.mediaGeral ?? 0)
            }
            setLoading(false)
        }
        carregar()
    }, [])

    // ── Derivações ────────────────────────────────────────────────────────────

    const distribuicao = [5, 4, 3, 2, 1].map(n => ({
        nota: n,
        total: avaliacoes.filter(a => a.nota === n).length,
        pct: avaliacoes.length > 0 ? Math.round((avaliacoes.filter(a => a.nota === n).length / avaliacoes.length) * 100) : 0,
    }))

    const avaliacoesFiltradas = filtroNota !== null
        ? avaliacoes.filter(a => a.nota === filtroNota)
        : avaliacoes

    // ── Render ────────────────────────────────────────────────────────────────

    return (
        <div className="min-h-screen bg-[#fdfbf7] font-sans">
            <AdminHeader
                titulo="Satisfação dos Clientes"
                subtitulo="Acompanhe o feedback e o NPS do salão"
                abaAtiva="Avaliações"
            />

            <div className="px-4 md:px-8 max-w-7xl mx-auto space-y-6 pb-12">

                {loading ? (
                    <div className="flex items-center justify-center py-32 text-gray-400 gap-3">
                        <svg className="animate-spin w-6 h-6 text-marrom-claro" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                        </svg>
                        <span className="text-sm font-medium">A carregar avaliações...</span>
                    </div>
                ) : avaliacoes.length === 0 ? (
                    <div className="bg-white rounded-2xl border border-dashed border-gray-100 p-20 text-center">
                        <svg className="w-12 h-12 text-gray-200 mx-auto mb-4" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
                            <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                        </svg>
                        <p className="text-gray-500 font-semibold">Nenhuma avaliação recebida ainda</p>
                        <p className="text-gray-400 text-sm mt-1">As avaliações aparecerão aqui após os atendimentos concluídos</p>
                    </div>
                ) : (
                    <>
                        {/* ── PAINEL DE MÉTRICAS ── */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">

                            {/* Nota média */}
                            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 flex items-center gap-5">
                                <div className="w-16 h-16 bg-amber-50 border border-amber-200 rounded-2xl flex items-center justify-center flex-shrink-0">
                                    <svg width="28" height="28" viewBox="0 0 24 24" fill="#f59e0b" stroke="#f59e0b" strokeWidth="1">
                                        <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                                    </svg>
                                </div>
                                <div>
                                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Nota Média</p>
                                    <p className="text-4xl font-black text-gray-800 mt-1 leading-none">{mediaGeral.toFixed(1)}</p>
                                    <Estrelas nota={Math.round(mediaGeral)} />
                                </div>
                            </div>

                            {/* Total de avaliações */}
                            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 flex items-center gap-5">
                                <div className="w-16 h-16 bg-blue-50 border border-blue-200 rounded-2xl flex items-center justify-center flex-shrink-0">
                                    <svg width="28" height="28" fill="none" stroke="#3b82f6" strokeWidth="1.5" viewBox="0 0 24 24">
                                        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" />
                                        <path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" />
                                    </svg>
                                </div>
                                <div>
                                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Total de Avaliações</p>
                                    <p className="text-4xl font-black text-gray-800 mt-1 leading-none">{avaliacoes.length}</p>
                                    <p className="text-xs text-gray-400 mt-1">respostas recebidas</p>
                                </div>
                            </div>

                            {/* Distribuição por nota */}
                            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Distribuição</p>
                                <div className="space-y-2">
                                    {distribuicao.map(({ nota, total, pct }) => (
                                        <button
                                            key={nota}
                                            onClick={() => setFiltroNota(filtroNota === nota ? null : nota)}
                                            className={`w-full flex items-center gap-2 group rounded-lg px-2 py-1 transition-colors ${filtroNota === nota ? 'bg-amber-50' : 'hover:bg-gray-50'}`}
                                        >
                                            <span className="text-xs font-bold text-gray-600 w-4">{nota}</span>
                                            <svg width="10" height="10" viewBox="0 0 24 24" fill="#f59e0b"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" /></svg>
                                            <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                                                <div className="h-full bg-amber-400 rounded-full transition-all duration-500" style={{ width: `${pct}%` }} />
                                            </div>
                                            <span className="text-xs font-semibold text-gray-500 w-8 text-right">{total}</span>
                                        </button>
                                    ))}
                                </div>
                                {filtroNota !== null && (
                                    <button onClick={() => setFiltroNota(null)} className="mt-3 w-full text-xs text-gray-400 hover:text-gray-600 underline transition-colors">
                                        Limpar filtro
                                    </button>
                                )}
                            </div>
                        </div>

                        {/* ── FILTRO ATIVO ── */}
                        {filtroNota !== null && (
                            <div className="flex items-center gap-2">
                                <span className="text-sm text-gray-500">Filtrando por:</span>
                                <span className={`text-xs font-bold px-2.5 py-1 rounded-full border ${corNota(filtroNota)}`}>
                                    {filtroNota} estrela{filtroNota !== 1 ? 's' : ''} · {labelNota(filtroNota)}
                                </span>
                                <span className="text-xs text-gray-400">({avaliacoesFiltradas.length} resultado{avaliacoesFiltradas.length !== 1 ? 's' : ''})</span>
                            </div>
                        )}

                        {/* ── LISTA DE AVALIAÇÕES ── */}
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {avaliacoesFiltradas.map(av => (
                                <div key={av.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 flex flex-col gap-4 hover:shadow-md transition-shadow">
                                    {/* Header do card */}
                                    <div className="flex items-start justify-between">
                                        <div className="flex flex-col gap-1.5">
                                            <Estrelas nota={av.nota} />
                                            <span className={`text-xs font-bold px-2 py-0.5 rounded-full border w-fit ${corNota(av.nota)}`}>
                                                {labelNota(av.nota)}
                                            </span>
                                        </div>
                                        <span className="text-xs text-gray-400 font-medium">
                                            {new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' }).format(new Date(av.criadoEm))}
                                        </span>
                                    </div>

                                    {/* Comentário */}
                                    <div className="flex-1">
                                        {av.comentario ? (
                                            <p className="text-sm text-gray-600 italic leading-relaxed">
                                                &ldquo;{av.comentario}&rdquo;
                                            </p>
                                        ) : (
                                            <p className="text-xs text-gray-300 italic">Sem comentário escrito.</p>
                                        )}
                                    </div>

                                    {/* Rodapé do card */}
                                    <div className="pt-3 border-t border-gray-100 space-y-1.5">
                                        <div className="flex items-center gap-2">
                                            <div className="w-6 h-6 bg-gray-100 rounded-full flex items-center justify-center flex-shrink-0">
                                                <svg width="12" height="12" fill="none" stroke="#6b7280" strokeWidth="2" viewBox="0 0 24 24"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></svg>
                                            </div>
                                            <p className="text-xs text-gray-500">
                                                <span className="text-gray-400">Cliente: </span>
                                                <strong className="text-gray-700">{av.agendamento.cliente.nome}</strong>
                                            </p>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <div className="w-6 h-6 bg-amber-50 rounded-full flex items-center justify-center flex-shrink-0">
                                                <svg width="12" height="12" fill="none" stroke="#92400e" strokeWidth="2" viewBox="0 0 24 24"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></svg>
                                            </div>
                                            <p className="text-xs text-gray-500">
                                                <span className="text-gray-400">Profissional: </span>
                                                <strong className="text-marrom-claro">{av.agendamento.funcionario.nome}</strong>
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </>
                )}
            </div>
        </div>
    )
}
