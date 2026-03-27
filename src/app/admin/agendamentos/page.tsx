'use client'

import { useState, useEffect, useCallback } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import AdminHeader from '@/components/admin/AdminHeader'
import { listarTodosClientes } from '@/app/actions/cliente'
import { listarServicosAdmin } from '@/app/actions/servico'
import {
    listarAgendamentosGlobais,
    cancelarAgendamentoPendente,
    criarAgendamentoMultiplo,
    editarAgendamentoPendente,
    listarEquipaComExpediente,
    type AgendamentoGlobalItem,
    type FuncionarioComExpedienteItem
} from '@/app/actions/agendamento'
import {
    atualizarFuncionarioCompleto,
    salvarEscalaFuncionarioAdmin,
    type ExpedienteInfo
} from '@/app/actions/admin'

// ── Schemas Zod ──────────────────────────────────────────────────────────────

const schemaNovo = z.object({
    clienteId: z.string().min(1, 'Informe o ID do cliente'),
    funcionarioId: z.string().min(1, 'Selecione um profissional'),
    servicoId: z.string().min(1, 'Informe o ID do serviço'),
    dataHora: z.string().min(1, 'Informe a data e hora'),
})

const schemaEditar = z.object({
    funcionarioId: z.string().min(1, 'Selecione um profissional'),
    dataHora: z.string().min(1, 'Informe a nova data e hora'),
})

type FormNovo = z.infer<typeof schemaNovo>
type FormEditar = z.infer<typeof schemaEditar>

// ── Tipos ────────────────────────────────────────────────────────────────────

interface FuncionarioGerenciavel extends FuncionarioComExpedienteItem {
    comissao: number
    podeVerComissao: boolean
    podeAgendar: boolean
    podeVerHistorico: boolean
    podeCancelar: boolean
}

type Mensagem = { texto: string; tipo: 'sucesso' | 'erro' | 'info' }

// ── Constantes ───────────────────────────────────────────────────────────────

const DIAS_SEMANA_CURTO = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']
const DIAS_SEMANA_COMPLETO = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado']

const permissoesSistema: {
    key: keyof Pick<FuncionarioGerenciavel, 'podeVerComissao' | 'podeAgendar' | 'podeVerHistorico' | 'podeCancelar'>
    label: string
    desc: string
}[] = [
        { key: 'podeVerComissao', label: 'Ver Valores Financeiros', desc: 'Visualiza faturamento da comanda.' },
        { key: 'podeAgendar', label: 'Criar Agendamentos', desc: 'Cria novas reservas na agenda.' },
        { key: 'podeVerHistorico', label: 'Ver Histórico Financeiro', desc: 'Acessa comandas já faturadas.' },
        { key: 'podeCancelar', label: 'Cancelar Agendamentos', desc: 'Pode excluir clientes e faturamentos.' },
    ]

// ── Helper: Avatar ────────────────────────────────────────────────────────────

function Avatar({ nome }: { nome: string }) {
    const initials = nome.split(' ').slice(0, 2).map(n => n[0]).join('').toUpperCase()
    const colors = ['bg-amber-100 text-amber-700', 'bg-orange-100 text-orange-700', 'bg-stone-100 text-stone-700', 'bg-yellow-100 text-yellow-700']
    const color = colors[nome.charCodeAt(0) % colors.length]
    return (
        <div className={`w-8 h-8 ${color} rounded-full flex items-center justify-center font-bold text-xs flex-shrink-0`}>
            {initials}
        </div>
    )
}

// ── Helper: Campo ─────────────────────────────────────────────────────────────

function Campo({ label, erro, children, required }: { label: string; erro?: string; children: React.ReactNode; required?: boolean }) {
    return (
        <div>
            <label className="block text-xs font-semibold text-stone-600 uppercase tracking-wide mb-1.5">
                {label}{required && <span className="text-red-500 ml-0.5">*</span>}
            </label>
            {children}
            {erro && <p className="mt-1 text-xs text-red-600 flex items-center gap-1">⚠ {erro}</p>}
        </div>
    )
}

// ── Componente Principal ──────────────────────────────────────────────────────

export default function AgendamentosGlobaisPage() {
    const [agendamentos, setAgendamentos] = useState<AgendamentoGlobalItem[]>([])
    const [equipa, setEquipa] = useState<FuncionarioComExpedienteItem[]>([])
    const [clientesList, setClientesList] = useState<{id: string, nome: string}[]>([])
    const [servicosList, setServicosList] = useState<{id: string, nome: string}[]>([])
    const [loading, setLoading] = useState(true)
    const [mensagem, setMensagem] = useState<Mensagem | null>(null)

    const [dataAtual, setDataAtual] = useState(new Date())
    const [diaSelecionado, setDiaSelecionado] = useState<Date | null>(null)

    const [isModalNovoOpen, setIsModalNovoOpen] = useState(false)
    const [loadingSalvar, setLoadingSalvar] = useState(false)

    const [agendamentoEditandoId, setAgendamentoEditandoId] = useState<string | null>(null)
    const [loadingEditar, setLoadingEditar] = useState(false)

    const [modalAcessos, setModalAcessos] = useState<FuncionarioGerenciavel | null>(null)
    const [abaAtiva, setAbaAtiva] = useState<'permissoes' | 'escala'>('permissoes')
    const [loadingAcaoProfissional, setLoadingAcaoProfissional] = useState(false)
    const [loadingCancelarId, setLoadingCancelarId] = useState<string | null>(null)

    const formNovo = useForm<FormNovo>({ resolver: zodResolver(schemaNovo) })
    const formEditar = useForm<FormEditar>({ resolver: zodResolver(schemaEditar) })

    // ── Dados ────────────────────────────────────────────────────────────────

    const carregarDados = useCallback(async () => {
        setLoading(true)
        const [resAg, resEq, resCli, resServ] = await Promise.all([
            listarAgendamentosGlobais(),
            listarEquipaComExpediente(),
            listarTodosClientes(),
            listarServicosAdmin()
        ])
        if (resAg.sucesso && resAg.agendamentos) setAgendamentos(resAg.agendamentos)
        if (resEq.sucesso && resEq.equipa) setEquipa(resEq.equipa)
        if (resCli.sucesso && 'clientes' in resCli) setClientesList(resCli.clientes as {id: string, nome: string}[])
        if (resServ.sucesso && 'servicos' in resServ) setServicosList(resServ.servicos as {id: string, nome: string}[])
        setLoading(false)
    }, [])

    useEffect(() => { void carregarDados() }, [carregarDados])

    const exibirMensagem = (texto: string, tipo: Mensagem['tipo'], ms = 4000) => {
        setMensagem({ texto, tipo })
        if (ms > 0) setTimeout(() => setMensagem(null), ms)
    }

    // ── Calendário ───────────────────────────────────────────────────────────

    const mes = dataAtual.getMonth()
    const ano = dataAtual.getFullYear()
    const diasNoMes = new Date(ano, mes + 1, 0).getDate()
    const primeiroDiaDoMes = new Date(ano, mes, 1).getDay()

    const mudarMes = (direcao: number) => {
        setDataAtual(new Date(ano, mes + direcao, 1))
        setDiaSelecionado(null)
    }

    const obterAgendamentosDoDia = (dia: number, mesAlvo: number, anoAlvo: number) =>
        agendamentos.filter(ag => {
            const d = new Date(ag.dataHoraInicio)
            return d.getDate() === dia && d.getMonth() === mesAlvo && d.getFullYear() === anoAlvo
        })

    // ── Ações ────────────────────────────────────────────────────────────────

    const handleCancelar = async (id: string) => {
        setLoadingCancelarId(id)
        const res = await cancelarAgendamentoPendente(id)
        if (res.sucesso) {
            exibirMensagem('Agendamento cancelado com sucesso.', 'sucesso')
            void carregarDados()
        } else {
            exibirMensagem(res.erro || 'Erro ao cancelar agendamento.', 'erro')
        }
        setLoadingCancelarId(null)
    }

    const onSubmitNovo = async (data: FormNovo) => {
        setLoadingSalvar(true)
        try {
            const res = await criarAgendamentoMultiplo(
                data.clienteId,
                data.funcionarioId,
                new Date(data.dataHora),
                [data.servicoId]
            )
            if (res.sucesso) {
                exibirMensagem('Agendamento criado com sucesso!', 'sucesso')
                setIsModalNovoOpen(false)
                formNovo.reset()
                void carregarDados()
            } else {
                exibirMensagem(res.erro || 'Erro ao criar agendamento.', 'erro')
            }
        } finally {
            setLoadingSalvar(false)
        }
    }

    const abrirModalEdicao = (ag: AgendamentoGlobalItem) => {
        const d = new Date(ag.dataHoraInicio)
        d.setMinutes(d.getMinutes() - d.getTimezoneOffset())
        formEditar.reset({
            funcionarioId: ag.funcionarioId,
            dataHora: d.toISOString().slice(0, 16),
        })
        setAgendamentoEditandoId(ag.id)
    }

    const onSubmitEditar = async (data: FormEditar) => {
        if (!agendamentoEditandoId) return
        setLoadingEditar(true)
        try {
            const res = await editarAgendamentoPendente(
                agendamentoEditandoId,
                data.funcionarioId,
                new Date(data.dataHora)
            )
            if (res.sucesso) {
                exibirMensagem('Agendamento atualizado com sucesso!', 'sucesso')
                setAgendamentoEditandoId(null)
                formEditar.reset()
                void carregarDados()
            } else {
                exibirMensagem(res.erro || 'Erro ao editar agendamento.', 'erro')
            }
        } finally {
            setLoadingEditar(false)
        }
    }

    const handleSalvarProfissional = async () => {
        if (!modalAcessos) return
        setLoadingAcaoProfissional(true)
        const { id, comissao, podeVerComissao, podeAgendar, podeVerHistorico, podeCancelar, expedientes } = modalAcessos
        const [resP, resE] = await Promise.all([
            atualizarFuncionarioCompleto(id, { comissao: Number(comissao), podeVerComissao, podeAgendar, podeVerHistorico, podeCancelar }),
            salvarEscalaFuncionarioAdmin(id, expedientes)
        ])
        if (resP.sucesso && resE.sucesso) {
            exibirMensagem('Perfil do profissional atualizado!', 'sucesso')
            setModalAcessos(null)
            void carregarDados()
        } else {
            exibirMensagem('Erro ao atualizar dados do profissional.', 'erro')
        }
        setLoadingAcaoProfissional(false)
    }

    const atualizarExpedienteLocal = <K extends keyof ExpedienteInfo>(index: number, campo: K, valor: ExpedienteInfo[K]) => {
        if (!modalAcessos) return
        const novos = modalAcessos.expedientes.map((exp, i) => i === index ? { ...exp, [campo]: valor } : exp)
        setModalAcessos({ ...modalAcessos, expedientes: novos })
    }

    // ── Derivações do dia selecionado ────────────────────────────────────────

    const agendamentosSelecionados = diaSelecionado
        ? obterAgendamentosDoDia(diaSelecionado.getDate(), diaSelecionado.getMonth(), diaSelecionado.getFullYear())
        : []

    const equipaDoDia = diaSelecionado
        ? equipa.filter(prof => {
            const exp = prof.expedientes?.find(e => e.diaSemana === diaSelecionado.getDay())
            return exp?.ativo
        })
        : []

    const hoje = new Date()

    // ── Render ───────────────────────────────────────────────────────────────

    return (
        <div className="min-h-screen bg-[#fdfbf7] font-sans">
            <AdminHeader
                titulo="Agendamentos Globais"
                subtitulo="Calendário interativo e gestão de horários da equipe"
                abaAtiva="Agendamentos"
                botaoAcao={
                    <button
                        onClick={() => setIsModalNovoOpen(true)}
                        className="flex items-center justify-center gap-2 bg-marrom-medio text-white px-5 py-2.5 rounded-xl font-bold text-sm hover:bg-[#3e2b22] transition-colors shadow-sm active:scale-[0.98]"
                    >
                        <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path d="M12 5v14M5 12h14" /></svg>
                        Novo Agendamento
                    </button>
                }
            />

            <div className="max-w-7xl mx-auto px-4 md:px-8 space-y-6 pb-12">

                {/* ── FEEDBACK ── */}
                {mensagem && (
                    <div className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium border ${mensagem.tipo === 'erro'
                        ? 'bg-red-50 text-red-700 border-red-200'
                        : mensagem.tipo === 'info'
                            ? 'bg-blue-50 text-blue-700 border-blue-200'
                            : 'bg-emerald-50 text-emerald-700 border-emerald-200'}`}>
                        <span>{mensagem.tipo === 'erro' ? '✕' : mensagem.tipo === 'info' ? '⋯' : '✓'}</span>
                        {mensagem.texto}
                    </div>
                )}

                {/* ── CALENDÁRIO ── */}
                <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
                    {/* Cabeçalho do mês */}
                    <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
                        <button onClick={() => mudarMes(-1)} className="p-2 rounded-lg text-gray-500 hover:bg-gray-100 hover:text-gray-800 transition-colors">
                            <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path d="M15 18l-6-6 6-6" /></svg>
                        </button>
                        <h2 className="font-bold text-lg text-gray-800 capitalize">
                            {new Intl.DateTimeFormat('pt-BR', { month: 'long', year: 'numeric' }).format(dataAtual)}
                        </h2>
                        <button onClick={() => mudarMes(1)} className="p-2 rounded-lg text-gray-500 hover:bg-gray-100 hover:text-gray-800 transition-colors">
                            <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path d="M9 18l6-6-6-6" /></svg>
                        </button>
                    </div>

                    {loading ? (
                        <div className="h-72 flex items-center justify-center text-gray-400 text-sm font-medium">
                            <svg className="animate-spin w-5 h-5 mr-2 text-marrom-claro" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>
                            A carregar agenda...
                        </div>
                    ) : (
                        <div className="p-4">
                            {/* Dias da semana */}
                            <div className="grid grid-cols-7 mb-2">
                                {DIAS_SEMANA_CURTO.map(d => (
                                    <div key={d} className="text-center text-xs font-bold text-gray-400 uppercase tracking-wider py-2">{d}</div>
                                ))}
                            </div>
                            {/* Células */}
                            <div className="grid grid-cols-7 gap-1">
                                {Array.from({ length: primeiroDiaDoMes }).map((_, i) => (
                                    <div key={`empty-${i}`} className="h-16 sm:h-20 rounded-lg" />
                                ))}
                                {Array.from({ length: diasNoMes }).map((_, i) => {
                                    const dia = i + 1
                                    const agsDia = obterAgendamentosDoDia(dia, mes, ano)
                                    const isHoje = dia === hoje.getDate() && mes === hoje.getMonth() && ano === hoje.getFullYear()
                                    const isSelecionado = diaSelecionado?.getDate() === dia && diaSelecionado?.getMonth() === mes && diaSelecionado?.getFullYear() === ano

                                    return (
                                        <div
                                            key={dia}
                                            onClick={() => setDiaSelecionado(new Date(ano, mes, dia))}
                                            className={`h-16 sm:h-20 p-1.5 rounded-xl border cursor-pointer flex flex-col transition-all
                                                ${isSelecionado ? 'border-marrom-claro bg-amber-50 shadow-sm ring-1 ring-marrom-claro/30'
                                                    : isHoje ? 'border-marrom-claro/40 bg-orange-50/30'
                                                        : 'border-transparent hover:border-gray-200 hover:bg-gray-50'}`}
                                        >
                                            <span className={`text-xs font-bold ${isHoje ? 'text-marrom-claro' : isSelecionado ? 'text-marrom-claro' : 'text-gray-600'}`}>
                                                {dia}
                                            </span>
                                            {agsDia.length > 0 && (
                                                <div className="mt-auto">
                                                    <span className="text-[9px] font-bold bg-marrom-claro text-white px-1.5 py-0.5 rounded-full block text-center">
                                                        {agsDia.length}
                                                    </span>
                                                </div>
                                            )}
                                        </div>
                                    )
                                })}
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* ── PAINEL LATERAL: DIA SELECIONADO ── */}
            {diaSelecionado && !modalAcessos && (
                <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-40 backdrop-blur-sm">
                    <div className="bg-white rounded-3xl shadow-2xl w-full max-w-5xl flex flex-col max-h-[90vh] overflow-hidden">
                        {/* Header */}
                        <div className="px-8 py-6 border-b border-gray-100 flex items-start justify-between bg-white">
                            <div>
                                <h2 className="text-2xl font-black text-marrom-medio capitalize tracking-tight">
                                    {new Intl.DateTimeFormat('pt-BR', { weekday: 'long', day: '2-digit', month: 'long' }).format(diaSelecionado)}
                                </h2>
                                <p className="text-sm text-gray-500 mt-1 font-medium">
                                    <span className="text-blue-600 font-bold bg-blue-50 px-2 py-0.5 rounded-md">{agendamentosSelecionados.length} agendamentos</span> e <span className="text-emerald-600 font-bold bg-emerald-50 px-2 py-0.5 rounded-md">{equipaDoDia.length} profissionais ativos</span> neste dia.
                                </p>
                            </div>
                            <button onClick={() => setDiaSelecionado(null)} className="text-gray-400 bg-gray-50 hover:bg-gray-100 hover:text-gray-800 p-2 rounded-xl transition-colors">
                                <svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M18 6 6 18M6 6l12 12" /></svg>
                            </button>
                        </div>

                        <div className="flex-1 overflow-y-auto p-8 bg-[#fdfbf7]">
                            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">

                                {/* Coluna Equipe (Esquerda) */}
                                <div className="lg:col-span-4">
                                    <div className="flex items-center gap-2 mb-4">
                                        <div className="w-1.5 h-6 bg-emerald-500 rounded-full"></div>
                                        <h3 className="text-sm font-black text-gray-700 uppercase tracking-widest">Equipe Ativa</h3>
                                    </div>
                                    
                                    {equipaDoDia.length === 0 ? (
                                        <div className="bg-white border-2 border-dashed border-gray-200 rounded-2xl p-6 text-center shadow-sm">
                                            <p className="text-sm text-gray-400 font-medium">Nenhum profissional escalado para hoje.</p>
                                        </div>
                                    ) : (
                                        <div className="grid grid-cols-1 gap-3">
                                            {equipaDoDia.map(prof => {
                                                const exp = prof.expedientes?.find(e => e.diaSemana === diaSelecionado.getDay())
                                                return (
                                                    <div key={prof.id} className="bg-white border border-gray-100 rounded-2xl p-4 shadow-sm flex flex-col gap-3 hover:border-emerald-200 hover:shadow-md transition-all">
                                                        <div className="flex items-center gap-3">
                                                            <Avatar nome={prof.nome} />
                                                            <div className="flex-1 min-w-0">
                                                                <p className="font-bold text-gray-800 truncate">{prof.nome}</p>
                                                                <span className="inline-block mt-1 px-2 py-0.5 bg-gray-100 text-gray-600 text-xs rounded-md font-mono font-semibold">
                                                                    {exp?.horaInicio} – {exp?.horaFim}
                                                                </span>
                                                            </div>
                                                        </div>
                                                        <button
                                                            onClick={() => setModalAcessos(prof as FuncionarioGerenciavel)}
                                                            className="w-full py-2 bg-emerald-50 text-emerald-700 rounded-xl text-xs font-bold hover:bg-emerald-100 transition-colors"
                                                        >
                                                            Editar Escala
                                                        </button>
                                                    </div>
                                                )
                                            })}
                                        </div>
                                    )}
                                </div>

                                {/* Coluna Agenda (Direita) */}
                                <div className="lg:col-span-8">
                                    <div className="flex items-center gap-2 mb-4">
                                        <div className="w-1.5 h-6 bg-marrom-claro rounded-full"></div>
                                        <h3 className="text-sm font-black text-gray-700 uppercase tracking-widest">
                                            Agenda de Clientes
                                        </h3>
                                    </div>

                                    {agendamentosSelecionados.length === 0 ? (
                                        <div className="bg-white border-2 border-dashed border-gray-200 rounded-2xl p-12 text-center shadow-sm flex flex-col items-center justify-center h-[200px]">
                                            <svg className="w-12 h-12 text-gray-300 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="18" rx="2" ry="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" /></svg>
                                            <p className="text-base font-bold text-gray-400">Agenda livre neste dia.</p>
                                        </div>
                                    ) : (
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            {[...agendamentosSelecionados]
                                                .sort((a, b) => new Date(a.dataHoraInicio).getTime() - new Date(b.dataHoraInicio).getTime())
                                                .map(ag => (
                                                    <div key={ag.id} className="bg-white border border-gray-200 rounded-xl p-4 flex flex-col gap-3 hover:border-gray-300 transition-colors">
                                                        <div className="flex items-start justify-between gap-2">
                                                            <div className="flex items-start gap-3">
                                                                <span className="text-xs font-bold bg-amber-50 text-marrom-claro border border-amber-200 px-2.5 py-1 rounded-lg whitespace-nowrap">
                                                                    {new Intl.DateTimeFormat('pt-BR', { hour: '2-digit', minute: '2-digit' }).format(new Date(ag.dataHoraInicio))}
                                                                </span>
                                                                <div>
                                                                    <p className="font-semibold text-gray-800 text-sm leading-tight">{ag.cliente.nome}</p>
                                                                    <p className="text-xs text-gray-400 font-mono mt-0.5">{ag.cliente.telefone}</p>
                                                                </div>
                                                            </div>
                                                            <span className={`text-[10px] font-bold px-2 py-1 rounded-full uppercase tracking-wider flex-shrink-0 ${ag.concluido
                                                                ? 'bg-emerald-100 text-emerald-700'
                                                                : 'bg-gray-100 text-gray-500'}`}>
                                                                {ag.concluido ? 'Faturado' : 'Pendente'}
                                                            </span>
                                                        </div>
                                                        <div className="flex items-center justify-between pt-2.5 border-t border-gray-100">
                                                            <p className="text-xs text-gray-500">
                                                                Com: <strong className="text-gray-700">{ag.funcionario.nome}</strong>
                                                            </p>
                                                            {!ag.concluido && (
                                                                <div className="flex gap-2">
                                                                    <button
                                                                        onClick={() => abrirModalEdicao(ag)}
                                                                        className="text-xs font-semibold text-blue-600 hover:text-blue-800 px-2 py-1 rounded hover:bg-blue-50 transition-colors"
                                                                    >
                                                                        Editar
                                                                    </button>
                                                                    <button
                                                                        onClick={() => handleCancelar(ag.id)}
                                                                        disabled={loadingCancelarId === ag.id}
                                                                        className="text-xs font-semibold text-red-600 hover:text-red-800 px-2 py-1 rounded hover:bg-red-50 transition-colors disabled:opacity-50"
                                                                    >
                                                                        {loadingCancelarId === ag.id ? '...' : 'Cancelar'}
                                                                    </button>
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

            {/* ── MODAL: NOVO AGENDAMENTO ── */}
            {isModalNovoOpen && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 backdrop-blur-sm">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
                        <div className="px-6 py-5 border-b border-gray-100 flex items-center justify-between">
                            <div>
                                <h2 className="font-bold text-gray-800">Nova Reserva Global</h2>
                                <p className="text-xs text-gray-500 mt-0.5">Preencha os dados do agendamento</p>
                            </div>
                            <button onClick={() => { setIsModalNovoOpen(false); formNovo.reset() }} className="text-gray-400 hover:text-gray-700 p-1 rounded-lg hover:bg-gray-100">
                                <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M18 6 6 18M6 6l12 12" /></svg>
                            </button>
                        </div>
                        <form onSubmit={formNovo.handleSubmit(onSubmitNovo)} className="p-6 space-y-4">
                            <Campo label="Cliente" erro={formNovo.formState.errors.clienteId?.message} required>
                                <select
                                    {...formNovo.register('clienteId')}
                                    className={`w-full border rounded-lg px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-marrom-claro/20 focus:border-marrom-claro bg-white transition-all ${formNovo.formState.errors.clienteId ? 'border-red-400 bg-red-50' : 'border-gray-300'}`}
                                >
                                    <option value="">Selecione um cliente...</option>
                                    {clientesList.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
                                </select>
                            </Campo>
                            <Campo label="Profissional" erro={formNovo.formState.errors.funcionarioId?.message} required>
                                <select
                                    {...formNovo.register('funcionarioId')}
                                    className={`w-full border rounded-lg px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-marrom-claro/20 focus:border-marrom-claro bg-white transition-all ${formNovo.formState.errors.funcionarioId ? 'border-red-400 bg-red-50' : 'border-gray-300'}`}
                                >
                                    <option value="">Selecione o profissional...</option>
                                    {equipa.map(p => <option key={p.id} value={p.id}>{p.nome}</option>)}
                                </select>
                            </Campo>
                            <Campo label="Serviço" erro={formNovo.formState.errors.servicoId?.message} required>
                                <select
                                    {...formNovo.register('servicoId')}
                                    className={`w-full border rounded-lg px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-marrom-claro/20 focus:border-marrom-claro bg-white transition-all ${formNovo.formState.errors.servicoId ? 'border-red-400 bg-red-50' : 'border-gray-300'}`}
                                >
                                    <option value="">Selecione o serviço...</option>
                                    {servicosList.map(s => <option key={s.id} value={s.id}>{s.nome}</option>)}
                                </select>
                            </Campo>
                            <Campo label="Data e Hora" erro={formNovo.formState.errors.dataHora?.message} required>
                                <input
                                    {...formNovo.register('dataHora')}
                                    type="datetime-local"
                                    className={`w-full border rounded-lg px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-marrom-claro/20 focus:border-marrom-claro transition-all ${formNovo.formState.errors.dataHora ? 'border-red-400 bg-red-50' : 'border-gray-300'}`}
                                />
                            </Campo>
                            <div className="flex gap-3 pt-2 border-t border-gray-100">
                                <button type="button" onClick={() => { setIsModalNovoOpen(false); formNovo.reset() }}
                                    className="flex-1 py-2.5 border border-gray-300 text-gray-700 font-semibold rounded-xl hover:bg-gray-50 text-sm transition-colors">
                                    Cancelar
                                </button>
                                <button type="submit" disabled={loadingSalvar}
                                    className="flex-1 py-2.5 bg-marrom-medio text-white font-semibold rounded-xl hover:bg-[#3e2b22] disabled:opacity-60 text-sm transition-colors">
                                    {loadingSalvar ? 'A salvar...' : 'Confirmar Agenda'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* ── MODAL: EDITAR AGENDAMENTO ── */}
            {agendamentoEditandoId && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 backdrop-blur-sm">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
                        <div className="px-6 py-5 border-b border-gray-100 flex items-center justify-between">
                            <div>
                                <h2 className="font-bold text-gray-800">Reagendar Reserva</h2>
                                <p className="text-xs text-gray-500 mt-0.5">Altere o profissional ou a data/hora</p>
                            </div>
                            <button onClick={() => { setAgendamentoEditandoId(null); formEditar.reset() }} className="text-gray-400 hover:text-gray-700 p-1 rounded-lg hover:bg-gray-100">
                                <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M18 6 6 18M6 6l12 12" /></svg>
                            </button>
                        </div>
                        <form onSubmit={formEditar.handleSubmit(onSubmitEditar)} className="p-6 space-y-4">
                            <Campo label="Profissional" erro={formEditar.formState.errors.funcionarioId?.message} required>
                                <select
                                    {...formEditar.register('funcionarioId')}
                                    className={`w-full border rounded-lg px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-marrom-claro/20 focus:border-marrom-claro bg-white transition-all ${formEditar.formState.errors.funcionarioId ? 'border-red-400 bg-red-50' : 'border-gray-300'}`}
                                >
                                    <option value="">Selecione o novo profissional...</option>
                                    {equipa.map(p => <option key={p.id} value={p.id}>{p.nome}</option>)}
                                </select>
                            </Campo>
                            <Campo label="Nova Data e Hora" erro={formEditar.formState.errors.dataHora?.message} required>
                                <input
                                    {...formEditar.register('dataHora')}
                                    type="datetime-local"
                                    className={`w-full border rounded-lg px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-marrom-claro/20 focus:border-marrom-claro transition-all ${formEditar.formState.errors.dataHora ? 'border-red-400 bg-red-50' : 'border-gray-300'}`}
                                />
                            </Campo>
                            <div className="flex gap-3 pt-2 border-t border-gray-100">
                                <button type="button" onClick={() => { setAgendamentoEditandoId(null); formEditar.reset() }}
                                    className="flex-1 py-2.5 border border-gray-300 text-gray-700 font-semibold rounded-xl hover:bg-gray-50 text-sm transition-colors">
                                    Cancelar
                                </button>
                                <button type="submit" disabled={loadingEditar}
                                    className="flex-1 py-2.5 bg-marrom-claro text-white font-semibold rounded-xl hover:bg-[#704620] disabled:opacity-60 text-sm transition-colors">
                                    {loadingEditar ? 'A salvar...' : 'Atualizar Agenda'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* ── MODAL: GERIR PERFIL DO PROFISSIONAL ── */}
            {modalAcessos && (
                <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-[60] backdrop-blur-sm">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg flex flex-col max-h-[92vh] overflow-hidden">
                        <div className="px-6 py-5 border-b border-gray-100 flex items-center gap-3">
                            <Avatar nome={modalAcessos.nome} />
                            <div className="flex-1 min-w-0">
                                <h2 className="font-bold text-gray-800 truncate">{modalAcessos.nome}</h2>
                                <p className="text-xs text-gray-500">Permissões e escala de trabalho</p>
                            </div>
                            <button onClick={() => setModalAcessos(null)} className="text-gray-400 hover:text-gray-700 p-1 rounded-lg hover:bg-gray-100 transition-colors">
                                <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M18 6 6 18M6 6l12 12" /></svg>
                            </button>
                        </div>

                        <div className="flex border-b border-gray-200 px-6">
                            {(['permissoes', 'escala'] as const).map(aba => (
                                <button key={aba} onClick={() => setAbaAtiva(aba)}
                                    className={`py-3 px-1 mr-5 text-sm font-semibold border-b-2 transition-colors ${abaAtiva === aba
                                        ? 'border-marrom-claro text-marrom-claro'
                                        : 'border-transparent text-gray-400 hover:text-gray-600'}`}>
                                    {aba === 'permissoes' ? 'Permissões' : 'Escala de Trabalho'}
                                </button>
                            ))}
                        </div>

                        <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-gray-50/50">
                            {abaAtiva === 'permissoes' && (
                                <div className="space-y-5">
                                    <div>
                                        <label className="block text-xs font-bold text-gray-600 uppercase tracking-wide mb-1.5">Comissão (%)</label>
                                        <input
                                            type="number" min={0} max={100}
                                            value={modalAcessos.comissao ?? 0}
                                            onChange={e => setModalAcessos({ ...modalAcessos, comissao: Number(e.target.value) })}
                                            className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-marrom-claro/20 focus:border-marrom-claro bg-white"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        {permissoesSistema.map(({ key, label, desc }) => (
                                            <label key={key} className="flex items-center gap-3 p-3.5 bg-white border border-gray-200 rounded-xl cursor-pointer hover:border-gray-300 transition-colors">
                                                <input
                                                    type="checkbox"
                                                    checked={Boolean(modalAcessos[key])}
                                                    onChange={e => setModalAcessos({ ...modalAcessos, [key]: e.target.checked })}
                                                    className="w-4 h-4 accent-marrom-claro"
                                                />
                                                <div>
                                                    <p className="text-sm font-semibold text-gray-800">{label}</p>
                                                    <p className="text-xs text-gray-400 mt-0.5">{desc}</p>
                                                </div>
                                            </label>
                                        ))}
                                    </div>
                                </div>
                            )}
                            {abaAtiva === 'escala' && (
                                <div className="space-y-2">
                                    {modalAcessos.expedientes.map((exp: ExpedienteInfo, index: number) => (
                                        <div key={exp.diaSemana} className={`flex items-center gap-3 p-3.5 rounded-xl border ${exp.ativo ? 'bg-amber-50/70 border-amber-200' : 'bg-white border-gray-200'}`}>
                                            <label className="flex items-center gap-2 min-w-[110px] cursor-pointer">
                                                <input type="checkbox" checked={exp.ativo}
                                                    onChange={e => atualizarExpedienteLocal(index, 'ativo', e.target.checked)}
                                                    className="w-4 h-4 accent-marrom-claro"
                                                />
                                                <span className="text-xs font-bold text-gray-700 uppercase tracking-wide">{DIAS_SEMANA_COMPLETO[exp.diaSemana]}</span>
                                            </label>
                                            <div className={`flex gap-2 flex-1 justify-end ${exp.ativo ? '' : 'opacity-30 pointer-events-none'}`}>
                                                <input type="time" value={exp.horaInicio}
                                                    onChange={e => atualizarExpedienteLocal(index, 'horaInicio', e.target.value)}
                                                    className="border border-gray-300 rounded-lg px-2.5 py-1.5 text-xs bg-white outline-none focus:border-marrom-claro"
                                                />
                                                <span className="text-gray-400 self-center text-xs">até</span>
                                                <input type="time" value={exp.horaFim}
                                                    onChange={e => atualizarExpedienteLocal(index, 'horaFim', e.target.value)}
                                                    className="border border-gray-300 rounded-lg px-2.5 py-1.5 text-xs bg-white outline-none focus:border-marrom-claro"
                                                />
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        <div className="px-6 py-4 bg-white border-t border-gray-100 flex gap-3">
                            <button onClick={() => setModalAcessos(null)} className="flex-1 py-2.5 border border-gray-300 text-gray-700 font-semibold rounded-xl hover:bg-gray-50 text-sm transition-colors">Cancelar</button>
                            <button onClick={handleSalvarProfissional} disabled={loadingAcaoProfissional}
                                className="flex-1 py-2.5 bg-marrom-medio text-white font-semibold rounded-xl hover:bg-[#3e2b22] disabled:opacity-60 text-sm transition-colors">
                                {loadingAcaoProfissional ? 'A salvar...' : 'Salvar Perfil'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
