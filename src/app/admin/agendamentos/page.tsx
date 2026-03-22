'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { listarAgendamentosGlobais, cancelarAgendamentoPendente } from '@/app/actions/agendamento'

export default function AgendamentosGlobaisPage() {
    const [agendamentos, setAgendamentos] = useState<any[]>([])
    const [busca, setBusca] = useState('')
    const [mesFiltro, setMesFiltro] = useState(new Date().getMonth().toString())
    const [loading, setLoading] = useState(true)

    const carregarAgendamentos = useCallback(async () => {
        setLoading(true)
        const res = await listarAgendamentosGlobais()
        if (res.sucesso && res.agendamentos) {
            setAgendamentos(res.agendamentos)
        }
        setLoading(false)
    }, [])

    useEffect(() => { void carregarAgendamentos() }, [carregarAgendamentos])

    const handleCancelar = async (id: string) => {
        if (!confirm("Deseja realmente cancelar/excluir este agendamento?")) return
        const res = await cancelarAgendamentoPendente(id)
        if (res.sucesso) {
            alert("Agendamento excluído com sucesso.")
            void carregarAgendamentos()
        } else {
            alert(res.erro || "Ocorreu um erro ao cancelar.")
        }
    }

    // Filtro Combinado: Busca por Nome (Cliente/Profissional) + Filtro por Mês
    const agendamentosFiltrados = agendamentos.filter(ag => {
        const mesAgendamento = new Date(ag.dataHoraInicio).getMonth().toString()
        const termo = busca.toLowerCase()
        const matchBusca = ag.cliente.nome.toLowerCase().includes(termo) || ag.funcionario.nome.toLowerCase().includes(termo)
        const matchMes = mesFiltro === "todos" || mesAgendamento === mesFiltro

        return matchBusca && matchMes
    })

    return (
        <div className="min-h-screen bg-[#fdfbf7] p-8 font-sans">
            <header className="mb-6 border-b-2 border-[#5C4033] pb-4 flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold text-[#5C4033]">Agendamento Global</h1>
                    <p className="text-gray-500 mt-1">Busque, edite e acompanhe toda a agenda do salão.</p>
                </div>
            </header>

            {/* Navegação Horizontal Uniforme do Admin */}
            <nav className="flex flex-wrap gap-3 mb-8">
                {[
                    { href: '/admin/dashboard', label: 'Equipa (Atual)' },
                    { href: '/admin/financeiro', label: 'Financeiro' },
                    { href: '/admin/estoque', label: 'Estoque de Produtos' },
                    { href: '/admin/servicos', label: 'Portfólio / Serviços' },
                    { href: '/admin/agendamentos', label: 'Agendamentos Globais', ativo: true },
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

            {/* Barra de Ferramentas (Busca e Filtros) */}
            <div className="flex flex-col md:flex-row gap-4 mb-6 bg-white p-4 rounded-lg shadow-sm border border-[#e5d9c5]">
                <input
                    type="text"
                    placeholder="Buscar por cliente ou profissional..."
                    value={busca}
                    onChange={(e) => setBusca(e.target.value)}
                    className="flex-1 p-2.5 border border-gray-300 rounded outline-none focus:border-[#8B5A2B]"
                />
                <select
                    value={mesFiltro}
                    onChange={(e) => setMesFiltro(e.target.value)}
                    className="p-2.5 border border-gray-300 rounded outline-none focus:border-[#8B5A2B]"
                >
                    <option value="todos">Todos os Meses</option>
                    {Array.from({ length: 12 }).map((_, i) => (
                        <option key={i} value={i.toString()}>
                            {new Intl.DateTimeFormat('pt-BR', { month: 'long' }).format(new Date(2024, i, 1))}
                        </option>
                    ))}
                </select>
            </div>

            {/* Tabela de Agenda */}
            <section className="bg-white rounded-lg shadow overflow-hidden border border-[#e5d9c5]">
                {loading ? (
                    <p className="p-8 text-center text-gray-500 font-bold tracking-wider uppercase text-sm">A carregar agenda...</p>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead className="bg-[#5C4033] text-white">
                                <tr>
                                    <th className="p-4 text-sm font-semibold uppercase tracking-wider">Data / Hora</th>
                                    <th className="p-4 text-sm font-semibold uppercase tracking-wider">Cliente</th>
                                    <th className="p-4 text-sm font-semibold uppercase tracking-wider">Profissional</th>
                                    <th className="p-4 text-sm font-semibold uppercase tracking-wider">Status</th>
                                    <th className="p-4 text-sm font-semibold text-right uppercase tracking-wider">Ações</th>
                                </tr>
                            </thead>
                            <tbody>
                                {agendamentosFiltrados.length === 0 ? (
                                    <tr><td colSpan={5} className="p-8 text-center text-gray-500">Nenhum agendamento encontrado para este filtro.</td></tr>
                                ) : (
                                    agendamentosFiltrados.map((ag) => (
                                        <tr key={ag.id} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                                            <td className="p-4 font-bold text-gray-800 whitespace-nowrap">
                                                {new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }).format(new Date(ag.dataHoraInicio))}
                                            </td>
                                            <td className="p-4 text-gray-700 font-medium">
                                                {ag.cliente.nome}
                                                <div className="text-xs text-gray-400 mt-0.5">{ag.cliente.telefone}</div>
                                            </td>
                                            <td className="p-4 font-semibold text-[#8B5A2B]">{ag.funcionario.nome}</td>
                                            <td className="p-4">
                                                <span className={`px-2.5 py-1 text-[0.65rem] font-bold rounded uppercase tracking-wider ${ag.concluido ? 'bg-green-100 text-green-700 border border-green-200' : 'bg-orange-100 text-orange-700 border border-orange-200'}`}>
                                                    {ag.concluido ? 'Concluído' : 'Pendente'}
                                                </span>
                                            </td>
                                            <td className="p-4 text-right flex justify-end gap-2">
                                                {!ag.concluido ? (
                                                    <button onClick={() => handleCancelar(ag.id)} className="bg-red-50 text-red-600 px-4 py-1.5 rounded text-xs font-bold border border-red-200 hover:bg-red-100 transition-colors shadow-sm">
                                                        Excluir
                                                    </button>
                                                ) : (
                                                    <span className="text-xs text-gray-400 italic">Travado (Faturado)</span>
                                                )}
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                )}
            </section>
        </div>
    )
}