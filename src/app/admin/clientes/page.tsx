'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { listarTodosClientes, obterHistoricoCliente, excluirClientePermanente, anonimizarClienteLGPD, type HistoricoClienteData } from '@/app/actions/cliente'
import { criarAgendamentoMultiplo } from '@/app/actions/agendamento'
import type { Cliente } from '@/types/domain'

type ClienteListaItem = Cliente & { _count: { agendamentos: number } }

export default function GestaoClientesAdminPage() {
    // ── Estados de Listagem ──────────────────────────────────────────────────
    const [clientes, setClientes] = useState<ClienteListaItem[]>([])
    const [busca, setBusca] = useState('')
    const [loading, setLoading] = useState(true)
    const [acaoLoading, setAcaoLoading] = useState<string | null>(null)

    // ── Estados dos Modais ───────────────────────────────────────────────────
    // 1. Histórico
    const [modalHistoricoOpen, setModalHistoricoOpen] = useState(false)
    const [dadosHistorico, setDadosHistorico] = useState<HistoricoClienteData | null>(null)
    const [loadingHistorico, setLoadingHistorico] = useState(false)

    // 2. Agendamento Rápido
    const [modalAgendarOpen, setModalAgendarOpen] = useState(false)
    const [clienteAgendando, setClienteAgendando] = useState<{ id: string, nome: string } | null>(null)
    const [novaReserva, setNovaReserva] = useState({ funcionarioId: '', dataHora: '', servicoId: '' })
    const [loadingAgendar, setLoadingAgendar] = useState(false)

    const carregarClientes = useCallback(async () => {
        setLoading(true)
        const res = await listarTodosClientes()
        if (res.sucesso && 'clientes' in res) {
            setClientes(res.clientes as ClienteListaItem[])
        }
        setLoading(false)
    }, [])

    useEffect(() => { void carregarClientes() }, [carregarClientes])

    // ── Ações de LGPD / Exclusão ─────────────────────────────────────────────
    const handleExcluir = async (id: string, nome: string) => {
        if (!confirm(`Deseja excluir permanentemente o cliente ${nome}? Isto só é possível se não houver histórico de agendamentos associado.`)) return

        setAcaoLoading(id)
        const res = await excluirClientePermanente(id)
        if (res.sucesso) {
            alert('Cliente excluído fisicamente com sucesso.')
            void carregarClientes()
        } else if ('erro' in res) {
            alert(res.erro)
        }
        setAcaoLoading(null)
    }

    const handleAnonimizar = async (id: string, nome: string) => {
        if (!confirm(`Deseja anonimizar (LGPD) os dados de ${nome}? O histórico financeiro será mantido para os relatórios, mas os dados pessoais serão apagados de forma irreversível.`)) return

        setAcaoLoading(id)
        const res = await anonimizarClienteLGPD(id)
        if (res.sucesso) {
            alert('Dados do cliente anonimizados com sucesso.')
            void carregarClientes()
        } else if ('erro' in res) {
            alert(res.erro)
        }
        setAcaoLoading(null)
    }

    // ── Ações de Agendamento Rápido ──────────────────────────────────────────
    const abrirModalAgendar = (clienteId: string, clienteNome: string) => {
        setClienteAgendando({ id: clienteId, nome: clienteNome })
        setNovaReserva({ funcionarioId: '', dataHora: '', servicoId: '' })
        setModalAgendarOpen(true)
    }

    const handleConfirmarAgendamento = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!clienteAgendando) return
        setLoadingAgendar(true)

        try {
            const dataFormatada = new Date(novaReserva.dataHora)
            const res = await criarAgendamentoMultiplo(
                clienteAgendando.id,
                novaReserva.funcionarioId,
                dataFormatada,
                [novaReserva.servicoId]
            )

            if (res.sucesso) {
                alert("Agendamento criado com sucesso!")
                setModalAgendarOpen(false)
                void carregarClientes() // Para atualizar o contador de visitas
            } else if ('erro' in res) {
                alert(res.erro)
            }
        } catch (error) {
            alert("Falha técnica ao processar formulário.")
        } finally {
            setLoadingAgendar(false)
        }
    }

    // ── Ações de Histórico ───────────────────────────────────────────────────
    const abrirModalHistorico = async (clienteId: string) => {
        setLoadingHistorico(true)
        setModalHistoricoOpen(true)
        setDadosHistorico(null)

        const res = await obterHistoricoCliente(clienteId)

        if (res.sucesso && 'dados' in res) {
            setDadosHistorico(res.dados as HistoricoClienteData)
        } else if ('erro' in res) {
            alert(res.erro)
            setModalHistoricoOpen(false)
        }
        setLoadingHistorico(false)
    }

    // Filtra a lista com base no nome ou telefone
    const clientesFiltrados = clientes.filter(c => {
        const termo = busca.toLowerCase()
        const matchNome = c.nome.toLowerCase().includes(termo)
        const matchTelefone = c.telefone && c.telefone.includes(termo)
        return matchNome || matchTelefone
    })

    return (
        <div className="min-h-screen bg-[#fdfbf7] p-8 font-sans">
            <header className="mb-6 border-b-2 border-[#5C4033] pb-4">
                <h1 className="text-3xl font-bold text-[#5C4033]">Base de Clientes</h1>
                <p className="text-gray-500 mt-1">Histórico de consumo, agendamentos rápidos e proteção de dados (LGPD).</p>
            </header>

            {/* Navegação Horizontal */}
            <nav className="flex flex-wrap gap-3 mb-8">
                <Link href='/admin/dashboard' className="bg-white text-[#5C4033] border border-[#e5d9c5] px-5 py-2 rounded shadow-sm font-bold text-sm hover:border-[#8B5A2B]">Equipa (Atual)</Link>
                <Link href='/admin/financeiro' className="bg-white text-[#5C4033] border border-[#e5d9c5] px-5 py-2 rounded shadow-sm font-bold text-sm hover:border-[#8B5A2B]">Financeiro</Link>
                <Link href='/admin/estoque' className="bg-white text-[#5C4033] border border-[#e5d9c5] px-5 py-2 rounded shadow-sm font-bold text-sm hover:border-[#8B5A2B]">Estoque</Link>
                <Link href='/admin/servicos' className="bg-white text-[#5C4033] border border-[#e5d9c5] px-5 py-2 rounded shadow-sm font-bold text-sm hover:border-[#8B5A2B]">Portfólio / Serviços</Link>
                <Link href='/admin/agendamentos' className="bg-white text-[#5C4033] border border-[#e5d9c5] px-5 py-2 rounded shadow-sm font-bold text-sm hover:border-[#8B5A2B]">Agendamentos Globais</Link>
                <Link href='/admin/clientes' className="bg-[#5C4033] text-white px-5 py-2 rounded shadow font-bold text-sm">Base de Clientes</Link>
            </nav>

            {/* Barra de Pesquisa */}
            <div className="mb-6 bg-white p-4 rounded-lg shadow-sm border border-[#e5d9c5]">
                <input
                    type="text"
                    placeholder="Pesquisar por nome ou telefone..."
                    value={busca}
                    onChange={(e) => setBusca(e.target.value)}
                    className="w-full p-3 border border-gray-300 rounded outline-none focus:border-[#8B5A2B] transition-colors"
                />
            </div>

            {/* Tabela de Clientes */}
            <section className="bg-white rounded-lg shadow overflow-hidden border border-[#e5d9c5]">
                {loading ? (
                    <p className="p-8 text-center text-gray-500 font-bold tracking-wider uppercase text-sm">A carregar clientes...</p>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead className="bg-[#5C4033] text-white">
                                <tr>
                                    <th className="p-4 text-sm font-semibold uppercase tracking-wider">Cliente</th>
                                    <th className="p-4 text-sm font-semibold uppercase tracking-wider text-center">Visitas</th>
                                    <th className="p-4 text-sm font-semibold uppercase tracking-wider text-center">Status</th>
                                    <th className="p-4 text-sm font-semibold text-right uppercase tracking-wider">Ações de Gestão</th>
                                </tr>
                            </thead>
                            <tbody>
                                {clientesFiltrados.length === 0 ? (
                                    <tr><td colSpan={4} className="p-8 text-center text-gray-500">Nenhum cliente encontrado.</td></tr>
                                ) : (
                                    clientesFiltrados.map((cliente) => {
                                        const totalAgendamentos = cliente._count?.agendamentos || 0;
                                        const isLoading = acaoLoading === cliente.id;
                                        const isAnonimizado = cliente.anonimizado;

                                        return (
                                            <tr key={cliente.id} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                                                <td className="p-4">
                                                    <p className={`font-bold ${isAnonimizado ? 'text-gray-400 italic' : 'text-gray-800'}`}>
                                                        {cliente.nome}
                                                    </p>
                                                    <p className="text-xs text-gray-500 mt-1 font-mono">{cliente.telefone || 'Sem contacto'}</p>
                                                </td>
                                                <td className="p-4 text-center font-semibold text-[#8B5A2B]">
                                                    {totalAgendamentos}
                                                </td>
                                                <td className="p-4 text-center">
                                                    <span className={`px-2.5 py-1 text-[0.65rem] font-bold rounded uppercase tracking-wider ${isAnonimizado ? 'bg-gray-100 text-gray-600 border border-gray-200' : 'bg-green-100 text-green-700 border border-green-200'}`}>
                                                        {isAnonimizado ? 'Anonimizado' : 'Ativo'}
                                                    </span>
                                                </td>
                                                <td className="p-4 text-right">
                                                    {!isAnonimizado ? (
                                                        <div className="flex justify-end items-center gap-2">
                                                            {/* Botões de Ação Positiva */}
                                                            <button
                                                                onClick={() => abrirModalAgendar(cliente.id, cliente.nome)}
                                                                className="px-3 py-1.5 bg-[#8B5A2B] text-white rounded text-xs font-bold hover:bg-[#704620] transition-colors shadow-sm"
                                                                title="Nova Marcação"
                                                            >
                                                                Agendar
                                                            </button>
                                                            <button
                                                                onClick={() => abrirModalHistorico(cliente.id)}
                                                                className="px-3 py-1.5 bg-blue-50 text-blue-700 border border-blue-200 rounded text-xs font-bold hover:bg-blue-100 transition-colors shadow-sm"
                                                                title="Ver histórico de serviços e pagamentos"
                                                            >
                                                                Histórico
                                                            </button>

                                                            <div className="w-px h-6 bg-gray-200 mx-1"></div> {/* Separador */}

                                                            {/* Botões de LGPD */}
                                                            <button
                                                                onClick={() => handleAnonimizar(cliente.id, cliente.nome)}
                                                                disabled={isLoading}
                                                                className={`px-3 py-1.5 rounded text-xs font-bold border transition-colors shadow-sm ${isLoading ? 'bg-gray-100 text-gray-400 border-gray-200' : 'bg-orange-50 text-orange-600 border-orange-200 hover:bg-orange-100'}`}
                                                            >
                                                                LGPD
                                                            </button>
                                                            <button
                                                                onClick={() => handleExcluir(cliente.id, cliente.nome)}
                                                                disabled={isLoading || totalAgendamentos > 0}
                                                                className={`px-3 py-1.5 rounded text-xs font-bold border transition-colors shadow-sm ${isLoading || totalAgendamentos > 0 ? 'bg-gray-50 text-gray-300 border-gray-100' : 'bg-red-50 text-red-600 border-red-200 hover:bg-red-100'}`}
                                                            >
                                                                Excluir
                                                            </button>
                                                        </div>
                                                    ) : (
                                                        <span className="text-xs text-gray-400 italic">Ação Irreversível Aplicada</span>
                                                    )}
                                                </td>
                                            </tr>
                                        )
                                    })
                                )}
                            </tbody>
                        </table>
                    </div>
                )}
            </section>

            {/* ── MODAL: AGENDAMENTO RÁPIDO ── */}
            {modalAgendarOpen && clienteAgendando && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
                    <div className="bg-white p-8 rounded-2xl shadow-2xl w-full max-w-md border-t-4 border-[#5C4033]">
                        <h2 className="text-2xl font-bold text-[#5C4033] mb-2">Agendamento Rápido</h2>
                        <p className="text-sm text-gray-500 mb-6">A agendar cliente: <strong className="text-gray-800">{clienteAgendando.nome}</strong></p>

                        <form onSubmit={handleConfirmarAgendamento} className="space-y-4">
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-1">ID do Profissional *</label>
                                <input
                                    required
                                    type="text"
                                    placeholder="Cole o ID do profissional..."
                                    className="w-full border border-gray-300 rounded-lg px-4 py-2.5 outline-none focus:border-[#8B5A2B]"
                                    value={novaReserva.funcionarioId}
                                    onChange={(e) => setNovaReserva({ ...novaReserva, funcionarioId: e.target.value })}
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-1">ID do Serviço *</label>
                                <input
                                    required
                                    type="text"
                                    placeholder="Cole o ID do serviço..."
                                    className="w-full border border-gray-300 rounded-lg px-4 py-2.5 outline-none focus:border-[#8B5A2B]"
                                    value={novaReserva.servicoId}
                                    onChange={(e) => setNovaReserva({ ...novaReserva, servicoId: e.target.value })}
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-1">Data e Hora *</label>
                                <input
                                    required
                                    type="datetime-local"
                                    className="w-full border border-gray-300 rounded-lg px-4 py-2.5 outline-none focus:border-[#8B5A2B]"
                                    value={novaReserva.dataHora}
                                    onChange={(e) => setNovaReserva({ ...novaReserva, dataHora: e.target.value })}
                                />
                            </div>

                            <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-gray-100">
                                <button type="button" onClick={() => setModalAgendarOpen(false)} className="px-5 py-2.5 text-gray-600 font-bold hover:bg-gray-100 rounded-lg">Cancelar</button>
                                <button type="submit" disabled={loadingAgendar} className="px-6 py-2.5 bg-[#5C4033] text-white font-bold rounded-lg hover:bg-[#3e2b22] disabled:opacity-70">
                                    {loadingAgendar ? "A Marcar..." : "Confirmar Agenda"}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* ── MODAL: HISTÓRICO DO CLIENTE ── */}
            {modalHistoricoOpen && (
                <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50 backdrop-blur-sm">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl border-t-4 border-[#8B5A2B] overflow-hidden flex flex-col max-h-[90vh]">
                        {loadingHistorico || !dadosHistorico ? (
                            <div className="p-16 text-center text-gray-500 font-bold">A carregar registos...</div>
                        ) : (
                            <>
                                <div className="px-6 py-5 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
                                    <div>
                                        <h2 className="text-2xl font-bold text-[#5C4033]">{dadosHistorico.cliente.nome}</h2>
                                        <p className="text-sm text-gray-500 font-mono mt-1">{dadosHistorico.cliente.telefone}</p>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">Total Gasto</p>
                                        <p className="text-xl font-black text-green-700">R$ {dadosHistorico.totalGasto.toFixed(2)}</p>
                                    </div>
                                </div>

                                <div className="p-6 overflow-y-auto flex-1 bg-[#fdfbf7] space-y-4">
                                    <h3 className="font-bold text-gray-800 text-sm uppercase tracking-wider mb-3 border-b border-gray-200 pb-2">Histórico de Visitas ({dadosHistorico.agendamentos.length})</h3>

                                    {dadosHistorico.agendamentos.length === 0 ? (
                                        <p className="text-center text-gray-400 italic py-8 bg-white rounded-lg border border-gray-200">Cliente sem histórico de agendamentos.</p>
                                    ) : (
                                        dadosHistorico.agendamentos.map(ag => (
                                            <div key={ag.id} className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
                                                <div className="flex justify-between items-start mb-3 border-b border-gray-50 pb-3">
                                                    <div>
                                                        <span className="font-bold text-gray-800">
                                                            {new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }).format(new Date(ag.dataHoraInicio))}
                                                        </span>
                                                        <p className="text-xs text-gray-500 mt-1">
                                                            Atendido por: <strong className="text-[#5C4033]">{ag.funcionario.nome}</strong>
                                                        </p>
                                                    </div>
                                                    <div className="text-right">
                                                        <span className={`px-2.5 py-1 text-[10px] font-bold rounded uppercase tracking-wider inline-block mb-1 ${ag.concluido ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'}`}>
                                                            {ag.concluido ? 'Faturado' : 'Pendente'}
                                                        </span>
                                                        <p className="font-black text-[#8B5A2B]">R$ {ag.valorBruto.toFixed(2)}</p>
                                                    </div>
                                                </div>

                                                <div className="text-sm text-gray-600">
                                                    <strong>Serviços:</strong> {ag.servicos.map(s => s.servico.nome).join(', ') || '-'}
                                                </div>
                                                {ag.produtos.length > 0 && (
                                                    <div className="text-sm text-gray-600 mt-1">
                                                        <strong>Produtos Comprados:</strong> {ag.produtos.map(p => p.produto.nome).join(', ')}
                                                    </div>
                                                )}
                                            </div>
                                        ))
                                    )}
                                </div>

                                <div className="px-6 py-4 bg-gray-50 border-t border-gray-100 flex justify-end">
                                    <button onClick={() => setModalHistoricoOpen(false)} className="px-6 py-2.5 text-gray-700 bg-white border border-gray-300 font-bold hover:bg-gray-100 rounded-lg transition-colors">Fechar Histórico</button>
                                </div>
                            </>
                        )}
                    </div>
                </div>
            )}
        </div>
    )
}