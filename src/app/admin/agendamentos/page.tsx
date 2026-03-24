'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import {
    listarAgendamentosGlobais,
    cancelarAgendamentoPendente,
    criarAgendamentoMultiplo,
    editarAgendamentoPendente,
    listarEquipaComExpediente,
    type AgendamentoGlobalItem,
    type FuncionarioComExpedienteItem
} from '@/app/actions/agendamento'

const DIAS_SEMANA = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']

export default function AgendamentosGlobaisPage() {
    // ── Estados Globais (Estritamente Tipados) ──────────────────────────────
    const [agendamentos, setAgendamentos] = useState<AgendamentoGlobalItem[]>([])
    const [equipa, setEquipa] = useState<FuncionarioComExpedienteItem[]>([])
    const [loading, setLoading] = useState(true)

    // ── Estados do Calendário ────────────────────────────────────────────────
    const [dataAtual, setDataAtual] = useState(new Date())
    const [diaSelecionado, setDiaSelecionado] = useState<Date | null>(null)

    // ── Estados dos Modais ───────────────────────────────────────────────────
    const [isModalNovoOpen, setIsModalNovoOpen] = useState(false)
    const [loadingSalvar, setLoadingSalvar] = useState(false)
    const [novaReserva, setNovaReserva] = useState({ clienteId: '', funcionarioId: '', dataHora: '', servicoId: '' })

    const [agendamentoEditando, setAgendamentoEditando] = useState<{ id: string; funcionarioId: string; dataHora: string } | null>(null)
    const [loadingEditar, setLoadingEditar] = useState(false)

    // ── Carregamento de Dados ────────────────────────────────────────────────
    const carregarDados = useCallback(async () => {
        setLoading(true)
        const [resAg, resEq] = await Promise.all([
            listarAgendamentosGlobais(),
            listarEquipaComExpediente()
        ])
        if (resAg.sucesso && resAg.agendamentos) setAgendamentos(resAg.agendamentos)
        if (resEq.sucesso && resEq.equipa) setEquipa(resEq.equipa)
        setLoading(false)
    }, [])

    useEffect(() => { void carregarDados() }, [carregarDados])

    // ── Lógicas do Calendário ────────────────────────────────────────────────
    const mes = dataAtual.getMonth()
    const ano = dataAtual.getFullYear()
    const diasNoMes = new Date(ano, mes + 1, 0).getDate()
    const primeiroDiaDoMes = new Date(ano, mes, 1).getDay()

    const mudarMes = (direcao: number) => {
        setDataAtual(new Date(ano, mes + direcao, 1))
        setDiaSelecionado(null)
    }

    const obterAgendamentosDoDia = (dia: number, mesAlvo: number, anoAlvo: number): AgendamentoGlobalItem[] => {
        return agendamentos.filter(ag => {
            const d = new Date(ag.dataHoraInicio)
            return d.getDate() === dia && d.getMonth() === mesAlvo && d.getFullYear() === anoAlvo
        })
    }

    // ── Ações de Agendamento ─────────────────────────────────────────────────
    const handleCancelar = async (id: string) => {
        if (!confirm("Deseja realmente cancelar/excluir este agendamento?")) return
        const res = await cancelarAgendamentoPendente(id)
        if (res.sucesso) {
            alert("Agendamento excluído com sucesso.")
            void carregarDados()
        } else {
            alert(res.erro || "Ocorreu um erro ao cancelar.")
        }
    }

    const handleCriarAgendamento = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoadingSalvar(true)
        try {
            const dataFormatada = new Date(novaReserva.dataHora)
            const res = await criarAgendamentoMultiplo(
                novaReserva.clienteId, novaReserva.funcionarioId, dataFormatada, [novaReserva.servicoId]
            )
            if (res.sucesso) {
                alert("Agendamento criado com sucesso!")
                setIsModalNovoOpen(false)
                setNovaReserva({ clienteId: '', funcionarioId: '', dataHora: '', servicoId: '' })
                void carregarDados()
            } else {
                alert(res.erro || "Erro ao criar agendamento.")
            }
        } finally {
            setLoadingSalvar(false)
        }
    }

    const abrirModalEdicao = (ag: AgendamentoGlobalItem) => {
        const d = new Date(ag.dataHoraInicio)
        d.setMinutes(d.getMinutes() - d.getTimezoneOffset())
        setAgendamentoEditando({ id: ag.id, funcionarioId: ag.funcionarioId, dataHora: d.toISOString().slice(0, 16) })
    }

    const handleSalvarEdicao = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!agendamentoEditando) return
        setLoadingEditar(true)
        try {
            const dataFormatada = new Date(agendamentoEditando.dataHora)
            const res = await editarAgendamentoPendente(agendamentoEditando.id, agendamentoEditando.funcionarioId, dataFormatada)
            if (res.sucesso) {
                alert("Agendamento atualizado com sucesso!")
                setAgendamentoEditando(null)
                void carregarDados()
            } else {
                alert(res.erro || "Erro ao editar agendamento.")
            }
        } finally {
            setLoadingEditar(false)
        }
    }

    // ── Derivações para o Pop-up Diário ──────────────────────────────────────
    let agendamentosSelecionados: AgendamentoGlobalItem[] = []
    let equipaDoDia: FuncionarioComExpedienteItem[] = []

    if (diaSelecionado) {
        agendamentosSelecionados = obterAgendamentosDoDia(diaSelecionado.getDate(), diaSelecionado.getMonth(), diaSelecionado.getFullYear())

        const diaSemanaIndex = diaSelecionado.getDay()
        equipaDoDia = equipa.filter(prof => {
            const expediente = prof.expedientes?.find((e) => e.diaSemana === diaSemanaIndex)
            return expediente && expediente.ativo
        })
    }

    return (
        <div className="min-h-screen bg-[#fdfbf7] p-8 font-sans">
            <header className="mb-6 border-b-2 border-[#5C4033] pb-4 flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold text-[#5C4033]">Agendamento Global</h1>
                    <p className="text-gray-500 mt-1">Calendário interativo e gestão de horários.</p>
                </div>
                <button
                    onClick={() => setIsModalNovoOpen(true)}
                    className="bg-[#8B5A2B] text-white px-5 py-2.5 rounded font-bold hover:bg-[#704620] shadow-sm transition-colors"
                >
                    + Novo Agendamento
                </button>
            </header>

            {/* Navegação Horizontal */}
            <nav className="flex flex-wrap gap-3 mb-8">
                <Link href='/admin/dashboard' className="bg-white text-[#5C4033] border border-[#e5d9c5] px-5 py-2 rounded shadow-sm font-bold text-sm hover:border-[#8B5A2B]">Equipa (Atual)</Link>
                <Link href='/admin/financeiro' className="bg-white text-[#5C4033] border border-[#e5d9c5] px-5 py-2 rounded shadow-sm font-bold text-sm hover:border-[#8B5A2B]">Financeiro</Link>
                <Link href='/admin/estoque' className="bg-white text-[#5C4033] border border-[#e5d9c5] px-5 py-2 rounded shadow-sm font-bold text-sm hover:border-[#8B5A2B]">Estoque</Link>
                <Link href='/admin/servicos' className="bg-white text-[#5C4033] border border-[#e5d9c5] px-5 py-2 rounded shadow-sm font-bold text-sm hover:border-[#8B5A2B]">Portfólio / Serviços</Link>
                <Link href='/admin/agendamentos' className="bg-[#5C4033] text-white px-5 py-2 rounded shadow font-bold text-sm">Agendamentos Globais</Link>
                <Link href='/admin/clientes' className="bg-white text-[#5C4033] border border-[#e5d9c5] px-5 py-2 rounded shadow-sm font-bold text-sm hover:border-[#8B5A2B]">Base de Clientes</Link>
            </nav>

            {/* CALENDÁRIO MENSAL */}
            <section className="bg-white rounded-xl shadow-sm border border-[#e5d9c5] overflow-hidden mb-8">
                {/* Cabeçalho do Calendário */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-[#e5d9c5] bg-gray-50/50">
                    <button onClick={() => mudarMes(-1)} className="p-2 text-gray-600 hover:text-[#8B5A2B] hover:bg-orange-50 rounded transition-colors font-bold text-xl leading-none">&lt;</button>
                    <h2 className="font-bold text-xl text-[#5C4033] capitalize">
                        {new Intl.DateTimeFormat('pt-BR', { month: 'long', year: 'numeric' }).format(dataAtual)}
                    </h2>
                    <button onClick={() => mudarMes(1)} className="p-2 text-gray-600 hover:text-[#8B5A2B] hover:bg-orange-50 rounded transition-colors font-bold text-xl leading-none">&gt;</button>
                </div>

                {loading ? (
                    <div className="p-20 text-center text-gray-400 font-bold uppercase tracking-widest text-sm">A carregar dados da agenda...</div>
                ) : (
                    <div className="p-6">
                        {/* Dias da Semana */}
                        <div className="grid grid-cols-7 gap-2 mb-2">
                            {DIAS_SEMANA.map(dia => (
                                <div key={dia} className="text-center font-bold text-xs text-gray-400 uppercase tracking-wider py-2">
                                    {dia}
                                </div>
                            ))}
                        </div>

                        {/* Grelha de Dias */}
                        <div className="grid grid-cols-7 gap-2">
                            {/* Espaços vazios do início do mês */}
                            {Array.from({ length: primeiroDiaDoMes }).map((_, i) => (
                                <div key={`empty-${i}`} className="h-24 bg-gray-50/30 rounded-lg border border-transparent"></div>
                            ))}

                            {/* Dias Reais */}
                            {Array.from({ length: diasNoMes }).map((_, i) => {
                                const dia = i + 1
                                const agendamentosNesteDia = obterAgendamentosDoDia(dia, mes, ano)
                                const isHoje = dia === new Date().getDate() && mes === new Date().getMonth() && ano === new Date().getFullYear()

                                return (
                                    <div
                                        key={dia}
                                        onClick={() => setDiaSelecionado(new Date(ano, mes, dia))}
                                        className={`relative h-24 p-2 rounded-lg border transition-all cursor-pointer flex flex-col 
                                            ${isHoje ? 'border-[#8B5A2B] bg-orange-50/20 shadow-[inset_0_0_0_1px_rgba(139,90,43,0.3)]' : 'border-gray-100 hover:border-[#c5a87c] hover:bg-orange-50/10'}
                                        `}
                                    >
                                        <span className={`text-sm font-bold ${isHoje ? 'text-[#8B5A2B]' : 'text-gray-700'}`}>{dia}</span>

                                        <div className="mt-auto flex flex-col gap-1">
                                            {agendamentosNesteDia.length > 0 && (
                                                <div className="text-[10px] font-bold bg-[#8B5A2B] text-white px-1.5 py-0.5 rounded truncate text-center shadow-sm">
                                                    {agendamentosNesteDia.length} Marcaç{agendamentosNesteDia.length > 1 ? 'ões' : 'ão'}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                )
                            })}
                        </div>
                    </div>
                )}
            </section>

            {/* POP-UP: DETALHES DO DIA SELECIONADO */}
            {diaSelecionado && (
                <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-40 backdrop-blur-sm">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl border-t-4 border-[#8B5A2B] flex flex-col max-h-[90vh]">
                        {/* Header do Pop-up */}
                        <div className="px-6 py-5 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
                            <div>
                                <h2 className="text-2xl font-bold text-[#5C4033] capitalize">
                                    {new Intl.DateTimeFormat('pt-BR', { weekday: 'long', day: '2-digit', month: 'long' }).format(diaSelecionado)}
                                </h2>
                                <p className="text-sm text-gray-500 mt-1">Gestão de marcações e profissionais do dia.</p>
                            </div>
                            <button onClick={() => setDiaSelecionado(null)} className="text-gray-400 hover:text-[#8B5A2B] text-3xl leading-none transition-colors">&times;</button>
                        </div>

                        <div className="p-6 overflow-y-auto flex-1 bg-[#fdfbf7]">
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">

                                {/* Coluna Esquerda: Equipa de Plantão */}
                                <div className="md:col-span-1">
                                    <h3 className="font-bold text-gray-800 text-sm uppercase tracking-wider mb-3 border-b border-gray-200 pb-2">Equipa de Plantão</h3>
                                    {equipaDoDia.length === 0 ? (
                                        <p className="text-xs text-gray-500 italic bg-white p-3 rounded border border-gray-100">Nenhum profissional escalado.</p>
                                    ) : (
                                        <div className="space-y-2">
                                            {equipaDoDia.map(prof => {
                                                const exp = prof.expedientes?.find((e) => e.diaSemana === diaSelecionado.getDay())
                                                return (
                                                    <div key={prof.id} className="bg-white p-3 rounded-lg border border-[#e5d9c5] shadow-sm">
                                                        <p className="font-bold text-sm text-[#5C4033]">{prof.nome}</p>
                                                        <p className="text-xs text-gray-500 mt-1 font-mono">{exp?.horaInicio} - {exp?.horaFim}</p>
                                                    </div>
                                                )
                                            })}
                                        </div>
                                    )}
                                </div>

                                {/* Coluna Direita: Agendamentos */}
                                <div className="md:col-span-2">
                                    <h3 className="font-bold text-gray-800 text-sm uppercase tracking-wider mb-3 border-b border-gray-200 pb-2">Agenda ({agendamentosSelecionados.length})</h3>

                                    {agendamentosSelecionados.length === 0 ? (
                                        <div className="bg-white border border-dashed border-gray-300 rounded-lg p-8 text-center">
                                            <p className="text-gray-400 text-sm">Sem clientes agendados para este dia.</p>
                                        </div>
                                    ) : (
                                        <div className="space-y-3">
                                            {agendamentosSelecionados.sort((a, b) => new Date(a.dataHoraInicio).getTime() - new Date(b.dataHoraInicio).getTime()).map(ag => (
                                                <div key={ag.id} className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm flex flex-col gap-3">
                                                    <div className="flex justify-between items-start">
                                                        <div>
                                                            <span className="inline-block bg-orange-50 text-[#8B5A2B] border border-orange-100 font-black text-sm px-2 py-0.5 rounded mb-2">
                                                                {new Intl.DateTimeFormat('pt-BR', { hour: '2-digit', minute: '2-digit' }).format(new Date(ag.dataHoraInicio))}
                                                            </span>
                                                            <h4 className="font-bold text-gray-800 leading-tight">{ag.cliente.nome}</h4>
                                                            <p className="text-xs text-gray-500 font-mono mt-0.5">{ag.cliente.telefone}</p>
                                                        </div>
                                                        <span className={`px-2 py-1 text-[10px] font-bold rounded uppercase tracking-wider ${ag.concluido ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
                                                            {ag.concluido ? 'Faturado' : 'Pendente'}
                                                        </span>
                                                    </div>

                                                    <div className="flex items-center justify-between pt-3 border-t border-gray-50">
                                                        <p className="text-xs text-gray-500">
                                                            Com: <strong className="text-[#5C4033]">{ag.funcionario.nome}</strong>
                                                        </p>
                                                        {!ag.concluido && (
                                                            <div className="flex gap-2">
                                                                <button onClick={() => abrirModalEdicao(ag)} className="text-xs font-bold text-blue-600 hover:underline">Editar</button>
                                                                <button onClick={() => handleCancelar(ag.id)} className="text-xs font-bold text-red-600 hover:underline">Cancelar</button>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal de Criação */}
            {isModalNovoOpen && (
                <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50 backdrop-blur-sm">
                    <div className="bg-white p-8 rounded-2xl shadow-2xl w-full max-w-md border-t-4 border-[#5C4033]">
                        <h2 className="text-2xl font-bold text-[#5C4033] mb-6">Nova Reserva Global</h2>
                        <form onSubmit={handleCriarAgendamento} className="space-y-4">
                            <div><label className="block text-sm font-semibold text-gray-700 mb-1">ID do Cliente *</label><input required type="text" className="w-full border border-gray-300 rounded-lg px-4 py-2.5 outline-none focus:border-[#8B5A2B]" value={novaReserva.clienteId} onChange={(e) => setNovaReserva({ ...novaReserva, clienteId: e.target.value })} /></div>
                            <div><label className="block text-sm font-semibold text-gray-700 mb-1">ID do Profissional *</label><input required type="text" className="w-full border border-gray-300 rounded-lg px-4 py-2.5 outline-none focus:border-[#8B5A2B]" value={novaReserva.funcionarioId} onChange={(e) => setNovaReserva({ ...novaReserva, funcionarioId: e.target.value })} /></div>
                            <div><label className="block text-sm font-semibold text-gray-700 mb-1">ID do Serviço Principal *</label><input required type="text" className="w-full border border-gray-300 rounded-lg px-4 py-2.5 outline-none focus:border-[#8B5A2B]" value={novaReserva.servicoId} onChange={(e) => setNovaReserva({ ...novaReserva, servicoId: e.target.value })} /></div>
                            <div><label className="block text-sm font-semibold text-gray-700 mb-1">Data e Hora *</label><input required type="datetime-local" className="w-full border border-gray-300 rounded-lg px-4 py-2.5 outline-none focus:border-[#8B5A2B]" value={novaReserva.dataHora} onChange={(e) => setNovaReserva({ ...novaReserva, dataHora: e.target.value })} /></div>
                            <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-gray-100">
                                <button type="button" onClick={() => setIsModalNovoOpen(false)} className="px-5 py-2.5 text-gray-600 font-bold hover:bg-gray-100 rounded-lg transition-colors">Cancelar</button>
                                <button type="submit" disabled={loadingSalvar} className="px-6 py-2.5 bg-[#5C4033] text-white font-bold rounded-lg hover:bg-[#3e2b22] disabled:opacity-70 transition-colors">{loadingSalvar ? "A Salvar..." : "Confirmar Agenda"}</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Modal de Edição */}
            {agendamentoEditando && (
                <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50 backdrop-blur-sm">
                    <div className="bg-white p-8 rounded-2xl shadow-2xl w-full max-w-md border-t-4 border-[#8B5A2B]">
                        <h2 className="text-2xl font-bold text-[#5C4033] mb-6">Reagendar Reserva</h2>
                        <form onSubmit={handleSalvarEdicao} className="space-y-4">
                            <div><label className="block text-sm font-semibold text-gray-700 mb-1">ID do Profissional *</label><input required type="text" className="w-full border border-gray-300 rounded-lg px-4 py-2.5 outline-none focus:border-[#8B5A2B]" value={agendamentoEditando.funcionarioId} onChange={(e) => setAgendamentoEditando({ ...agendamentoEditando, funcionarioId: e.target.value })} /></div>
                            <div><label className="block text-sm font-semibold text-gray-700 mb-1">Nova Data e Hora *</label><input required type="datetime-local" className="w-full border border-gray-300 rounded-lg px-4 py-2.5 outline-none focus:border-[#8B5A2B]" value={agendamentoEditando.dataHora} onChange={(e) => setAgendamentoEditando({ ...agendamentoEditando, dataHora: e.target.value })} /></div>
                            <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-gray-100">
                                <button type="button" onClick={() => setAgendamentoEditando(null)} className="px-5 py-2.5 text-gray-600 font-bold hover:bg-gray-100 rounded-lg transition-colors">Cancelar</button>
                                <button type="submit" disabled={loadingEditar} className="px-6 py-2.5 bg-[#8B5A2B] text-white font-bold rounded-lg hover:bg-[#704620] disabled:opacity-70 transition-colors">{loadingEditar ? "A Salvar..." : "Atualizar Agenda"}</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    )
}