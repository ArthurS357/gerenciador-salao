'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
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
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, Clock, Plus, X, Loader2, AlertCircle, CalendarClock, Scissors, UserCheck } from 'lucide-react'

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

// ── Helpers ────────────────────────────────────────────────────────────

function Avatar({ nome }: { nome: string }) {
    const initials = nome.split(' ').slice(0, 2).map(n => n[0]).join('').toUpperCase()
    return (
        <div className="w-10 h-10 bg-primary/10 text-primary border border-primary/20 rounded-full flex items-center justify-center font-bold text-sm flex-shrink-0">
            {initials}
        </div>
    )
}

function Campo({ label, erro, children, required }: { label: string; erro?: string; children: React.ReactNode; required?: boolean }) {
    return (
        <div>
            <label className="block text-[11px] font-bold text-muted-foreground uppercase tracking-widest mb-2">
                {label}{required && <span className="text-destructive ml-0.5">*</span>}
            </label>
            {children}
            {erro && <p className="mt-1 text-xs text-destructive flex items-center gap-1"><AlertCircle className="w-3 h-3" />{erro}</p>}
        </div>
    )
}

// ── Componente Principal ──────────────────────────────────────────────────────

export default function AgendamentosGlobaisPage() {
    const [agendamentos, setAgendamentos] = useState<AgendamentoGlobalItem[]>([])
    const [equipa, setEquipa] = useState<FuncionarioComExpedienteItem[]>([])
    const [clientesList, setClientesList] = useState<{ id: string, nome: string }[]>([])
    const [servicosList, setServicosList] = useState<{ id: string, nome: string }[]>([])

    const [loading, setLoading] = useState(true)
    const [mensagem, setMensagem] = useState<Mensagem | null>(null)
    const timerRef = useRef<NodeJS.Timeout | null>(null)

    const [dataAtual, setDataAtual] = useState(new Date())
    const [diaSelecionado, setDiaSelecionado] = useState<Date | null>(null)

    const [isModalNovoOpen, setIsModalNovoOpen] = useState(false)
    const [loadingSalvar, setLoadingSalvar] = useState(false)

    const [agendamentoEditandoId, setAgendamentoEditandoId] = useState<string | null>(null)
    const [loadingEditar, setLoadingEditar] = useState(false)

    const [modalAcessos, setModalAcessos] = useState<FuncionarioGerenciavel | null>(null)
    const [loadingAcaoProfissional, setLoadingAcaoProfissional] = useState(false)
    const [loadingCancelarId, setLoadingCancelarId] = useState<string | null>(null)

    const formNovo = useForm<FormNovo>({ resolver: zodResolver(schemaNovo) })
    const formEditar = useForm<FormEditar>({ resolver: zodResolver(schemaEditar) })

    const carregarDados = useCallback(async () => {
        setLoading(true)
        try {
            const [resAg, resEq, resCli, resServ] = await Promise.all([
                listarAgendamentosGlobais(),
                listarEquipaComExpediente(),
                listarTodosClientes(),
                listarServicosAdmin()
            ])

            // Resolvido: Acessando a propriedade através do encapsulamento 'data'
            if (resAg.sucesso && resAg.data?.agendamentos) {
                setAgendamentos(resAg.data.agendamentos)
            }
            if (resEq.sucesso && resEq.data?.equipa) {
                setEquipa(resEq.data.equipa)
            }

            // Resolvido: Remoção do 'any', substituído pelo contrato estrutural esperado.
            // Obs: Se as actions de Cliente e Serviço também mudaram para retornar dentro de "data", 
            // altere para resCli.data?.clientes e resServ.data?.servicos respectivamente.
            if (resCli.sucesso && 'clientes' in resCli && Array.isArray(resCli.clientes)) {
                setClientesList(
                    resCli.clientes.map((c: { id: string; nome: string }) => ({ id: c.id, nome: c.nome }))
                )
            }
            if (resServ.sucesso && 'servicos' in resServ && Array.isArray(resServ.servicos)) {
                setServicosList(
                    resServ.servicos.map((s: { id: string; nome: string }) => ({ id: s.id, nome: s.nome }))
                )
            }
        } catch (error) {
            exibirMensagem('Falha ao sincronizar dados. Tente recarregar a página.', 'erro')
        } finally {
            setLoading(false)
        }
    }, [])

    useEffect(() => {
        void carregarDados()
        return () => {
            if (timerRef.current) clearTimeout(timerRef.current)
        }
    }, [carregarDados])

    // CORREÇÃO: Prevenção de Race Condition no feedback visual
    const exibirMensagem = useCallback((texto: string, tipo: Mensagem['tipo'], ms = 4000) => {
        setMensagem({ texto, tipo })
        if (timerRef.current) clearTimeout(timerRef.current)
        if (ms > 0) timerRef.current = setTimeout(() => setMensagem(null), ms)
    }, [])

    const mudarMes = (direcao: number) => {
        setDataAtual(new Date(dataAtual.getFullYear(), dataAtual.getMonth() + direcao, 1))
        setDiaSelecionado(null)
    }

    const obterAgendamentosDoDia = (dia: number, mesAlvo: number, anoAlvo: number) =>
        agendamentos.filter(ag => {
            const d = new Date(ag.dataHoraInicio)
            return d.getDate() === dia && d.getMonth() === mesAlvo && d.getFullYear() === anoAlvo
        })

    const handleCancelar = async (id: string) => {
        setLoadingCancelarId(id)
        try {
            const res = await cancelarAgendamentoPendente(id)
            if (res.sucesso) {
                exibirMensagem('Agendamento cancelado com sucesso.', 'sucesso')
                void carregarDados()
            } else {
                exibirMensagem(res.erro || 'Erro ao cancelar agendamento.', 'erro')
            }
        } catch (err) {
            exibirMensagem('Erro inesperado de comunicação.', 'erro')
        } finally {
            setLoadingCancelarId(null)
        }
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
        } catch (err) {
            exibirMensagem('Falha ao submeter o agendamento.', 'erro')
        } finally {
            setLoadingSalvar(false)
        }
    }

    const abrirModalEdicao = (ag: AgendamentoGlobalItem) => {
        // CORREÇÃO: Solução robusta sem mutar a instância Date com TimezoneOffset
        const d = new Date(ag.dataHoraInicio)
        const tzOffset = d.getTimezoneOffset() * 60000;
        const localISOTime = new Date(d.getTime() - tzOffset).toISOString().slice(0, 16);

        formEditar.reset({
            funcionarioId: ag.funcionarioId,
            dataHora: localISOTime,
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
        } catch (err) {
            exibirMensagem('Falha ao processar atualização.', 'erro')
        } finally {
            setLoadingEditar(false)
        }
    }

    const handleSalvarProfissional = async () => {
        if (!modalAcessos) return
        setLoadingAcaoProfissional(true)

        try {
            const { id, comissao, podeVerComissao, podeAgendar, podeVerHistorico, podeCancelar, expedientes } = modalAcessos
            const [resP, resE] = await Promise.all([
                atualizarFuncionarioCompleto(id, {
                    comissao: Number(comissao) || 0, // Fallback seguro
                    podeVerComissao: Boolean(podeVerComissao),
                    podeAgendar: Boolean(podeAgendar),
                    podeVerHistorico: Boolean(podeVerHistorico),
                    podeCancelar: Boolean(podeCancelar)
                }),
                salvarEscalaFuncionarioAdmin(id, expedientes)
            ])
            if (resP.sucesso && resE.sucesso) {
                exibirMensagem('Perfil do profissional atualizado!', 'sucesso')
                setModalAcessos(null)
                void carregarDados()
            } else {
                exibirMensagem('Erro ao atualizar dados do profissional.', 'erro')
            }
        } catch (err) {
            exibirMensagem('Ocorreu um erro no servidor.', 'erro')
        } finally {
            setLoadingAcaoProfissional(false)
        }
    }

    const atualizarExpedienteLocal = <K extends keyof ExpedienteInfo>(index: number, campo: K, valor: ExpedienteInfo[K]) => {
        if (!modalAcessos) return
        const novos = modalAcessos.expedientes.map((exp, i) => i === index ? { ...exp, [campo]: valor } : exp)
        setModalAcessos({ ...modalAcessos, expedientes: novos })
    }

    const agendamentosSelecionados = diaSelecionado
        ? obterAgendamentosDoDia(diaSelecionado.getDate(), diaSelecionado.getMonth(), diaSelecionado.getFullYear())
        : []

    const equipaDoDia = diaSelecionado
        ? equipa.filter(prof => {
            const exp = prof.expedientes?.find(e => e.diaSemana === diaSelecionado.getDay())
            return exp?.ativo
        })
        : []

    const mesAtual = dataAtual.getMonth()
    const anoAtual = dataAtual.getFullYear()
    const diasNoMes = new Date(anoAtual, mesAtual + 1, 0).getDate()
    const primeiroDiaDoMes = new Date(anoAtual, mesAtual, 1).getDay()
    const hoje = new Date()

    return (
        <div className="min-h-screen bg-background font-sans">
            <AdminHeader
                titulo="Agenda Global"
                subtitulo="Calendário interativo e gestão de turnos."
                abaAtiva="Agendamentos"
                botaoAcao={
                    <button
                        onClick={() => setIsModalNovoOpen(true)}
                        className="flex items-center justify-center gap-2 bg-primary text-primary-foreground px-5 py-2.5 rounded-xl font-bold text-sm hover:bg-primary/90 transition-colors shadow-sm active:scale-[0.98]"
                    >
                        <Plus className="w-4 h-4" /> Nova Reserva
                    </button>
                }
            />

            <div className="max-w-7xl mx-auto px-4 md:px-8 space-y-6 pb-12 mt-6">

                {mensagem && (
                    <div className={`flex items-center gap-3 p-4 rounded-xl text-sm font-bold shadow-sm border animate-in fade-in ${mensagem.tipo === 'sucesso' ? 'bg-green-50 text-green-800 border-green-200' : 'bg-destructive/10 text-destructive border-destructive/20'}`}>
                        <span>{mensagem.tipo === 'sucesso' ? '✓' : '✕'}</span>
                        {mensagem.texto}
                        <button onClick={() => setMensagem(null)} className="ml-auto opacity-50 hover:opacity-100"><X className="w-4 h-4" /></button>
                    </div>
                )}

                {/* ── CALENDÁRIO ── */}
                <div className="bg-card rounded-2xl shadow-sm border border-border overflow-hidden">
                    <div className="flex items-center justify-between px-6 py-5 border-b border-border bg-muted/30">
                        <button onClick={() => mudarMes(-1)} className="p-2 rounded-xl text-muted-foreground hover:bg-muted hover:text-foreground transition-colors border border-transparent hover:border-border">
                            <ChevronLeft className="w-5 h-5" />
                        </button>
                        <h2 className="font-bold text-xl text-foreground capitalize flex items-center gap-2">
                            <CalendarIcon className="w-5 h-5 text-primary" />
                            {new Intl.DateTimeFormat('pt-BR', { month: 'long', year: 'numeric' }).format(dataAtual)}
                        </h2>
                        <button onClick={() => mudarMes(1)} className="p-2 rounded-xl text-muted-foreground hover:bg-muted hover:text-foreground transition-colors border border-transparent hover:border-border">
                            <ChevronRight className="w-5 h-5" />
                        </button>
                    </div>

                    {loading ? (
                        <div className="h-96 flex flex-col gap-3 items-center justify-center text-muted-foreground text-sm font-bold uppercase tracking-widest">
                            <Loader2 className="animate-spin w-6 h-6 text-primary" />
                            Sincronizando Agenda...
                        </div>
                    ) : (
                        <div className="p-6 bg-muted/10">
                            <div className="grid grid-cols-7 mb-4 gap-2">
                                {DIAS_SEMANA_CURTO.map(d => (
                                    <div key={d} className="text-center text-[10px] font-bold text-muted-foreground uppercase tracking-widest bg-card border border-border rounded-lg py-2">{d}</div>
                                ))}
                            </div>
                            <div className="grid grid-cols-7 gap-2">
                                {Array.from({ length: primeiroDiaDoMes }).map((_, i) => (
                                    <div key={`empty-${i}`} className="h-24 sm:h-28 rounded-xl bg-transparent" />
                                ))}
                                {Array.from({ length: diasNoMes }).map((_, i) => {
                                    const dia = i + 1
                                    const agsDia = obterAgendamentosDoDia(dia, mesAtual, anoAtual)
                                    const isHoje = dia === hoje.getDate() && mesAtual === hoje.getMonth() && anoAtual === hoje.getFullYear()
                                    const isSelecionado = diaSelecionado?.getDate() === dia && diaSelecionado?.getMonth() === mesAtual && diaSelecionado?.getFullYear() === anoAtual

                                    return (
                                        <div
                                            key={dia}
                                            onClick={() => setDiaSelecionado(new Date(anoAtual, mesAtual, dia))}
                                            className={`h-24 sm:h-28 p-2 rounded-xl border cursor-pointer flex flex-col transition-all group
                                                ${isSelecionado ? 'border-primary bg-primary/5 shadow-md ring-2 ring-primary/20'
                                                    : isHoje ? 'border-primary/40 bg-primary/5 shadow-sm'
                                                        : 'border-border bg-card hover:border-primary/40 hover:shadow-sm'}`}
                                        >
                                            <span className={`text-sm font-black w-7 h-7 flex items-center justify-center rounded-lg ${isHoje ? 'bg-primary text-primary-foreground' : isSelecionado ? 'text-primary' : 'text-muted-foreground group-hover:text-foreground'}`}>
                                                {dia}
                                            </span>
                                            {agsDia.length > 0 && (
                                                <div className="mt-auto flex flex-col gap-1">
                                                    <span className="text-[10px] font-bold bg-secondary text-secondary-foreground px-2 py-1 rounded-md block text-center uppercase tracking-wider truncate">
                                                        {agsDia.length} <span className="hidden sm:inline">Reservas</span>
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

            {/* ── MODAL: DIA SELECIONADO ── */}
            {diaSelecionado && !modalAcessos && (
                <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-40 backdrop-blur-sm">
                    <div className="bg-card rounded-3xl shadow-2xl w-full max-w-5xl flex flex-col max-h-[90vh] overflow-hidden border-t-4 border-t-primary animate-in zoom-in-95 duration-200">
                        <div className="px-8 py-6 border-b border-border flex items-start justify-between bg-muted/30">
                            <div>
                                <h2 className="text-2xl font-black text-foreground capitalize tracking-tight flex items-center gap-3">
                                    <CalendarClock className="w-6 h-6 text-primary" />
                                    {new Intl.DateTimeFormat('pt-BR', { weekday: 'long', day: '2-digit', month: 'long' }).format(diaSelecionado)}
                                </h2>
                                <p className="text-sm text-muted-foreground mt-2 font-medium flex items-center gap-3">
                                    <span className="text-blue-600 font-bold bg-blue-600/10 border border-blue-600/20 px-2.5 py-1 rounded-md">{agendamentosSelecionados.length} agendamentos</span>
                                    <span className="text-emerald-600 font-bold bg-emerald-600/10 border border-emerald-600/20 px-2.5 py-1 rounded-md">{equipaDoDia.length} profissionais na escala</span>
                                </p>
                            </div>
                            <button onClick={() => setDiaSelecionado(null)} className="text-muted-foreground bg-card border border-border hover:bg-muted hover:text-foreground p-2 rounded-xl transition-colors">
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        <div className="flex-1 overflow-y-auto p-8 bg-background">
                            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                                <div className="lg:col-span-4">
                                    <div className="flex items-center gap-2 mb-4 border-b border-border pb-3">
                                        <UserCheck className="w-4 h-4 text-emerald-600" />
                                        <h3 className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest">Escala do Dia</h3>
                                    </div>
                                    {equipaDoDia.length === 0 ? (
                                        <div className="bg-card border border-dashed border-border rounded-2xl p-6 text-center shadow-sm">
                                            <p className="text-sm text-muted-foreground font-medium">Ninguém escalado para hoje.</p>
                                        </div>
                                    ) : (
                                        <div className="grid grid-cols-1 gap-3">
                                            {equipaDoDia.map(prof => {
                                                const exp = prof.expedientes?.find(e => e.diaSemana === diaSelecionado.getDay())
                                                return (
                                                    <div key={prof.id} className="bg-card border border-border rounded-2xl p-4 shadow-sm flex flex-col gap-3 hover:border-primary/40 transition-all">
                                                        <div className="flex items-center gap-3">
                                                            <Avatar nome={prof.nome} />
                                                            <div className="flex-1 min-w-0">
                                                                <p className="font-bold text-foreground truncate">{prof.nome}</p>
                                                                <span className="inline-block mt-1 px-2 py-0.5 bg-muted text-muted-foreground text-xs rounded-md font-mono font-semibold border border-border">
                                                                    {exp?.horaInicio} – {exp?.horaFim}
                                                                </span>
                                                            </div>
                                                        </div>
                                                        <button onClick={() => setModalAcessos(prof as FuncionarioGerenciavel)} className="w-full py-2 bg-secondary text-secondary-foreground rounded-xl text-xs font-bold hover:bg-primary hover:text-primary-foreground transition-colors border border-border">Ajustar Escala</button>
                                                    </div>
                                                )
                                            })}
                                        </div>
                                    )}
                                </div>
                                <div className="lg:col-span-8">
                                    <div className="flex items-center gap-2 mb-4 border-b border-border pb-3">
                                        <Clock className="w-4 h-4 text-primary" />
                                        <h3 className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest">Timeline de Clientes</h3>
                                    </div>
                                    {agendamentosSelecionados.length === 0 ? (
                                        <div className="bg-card border border-dashed border-border rounded-2xl p-12 text-center shadow-sm flex flex-col items-center justify-center h-[200px]">
                                            <CalendarIcon className="w-10 h-10 text-muted-foreground/50 mb-3" />
                                            <p className="text-sm font-bold text-muted-foreground uppercase tracking-widest">Agenda Livre</p>
                                        </div>
                                    ) : (
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            {[...agendamentosSelecionados].sort((a, b) => new Date(a.dataHoraInicio).getTime() - new Date(b.dataHoraInicio).getTime()).map(ag => (
                                                <div key={ag.id} className="bg-card border border-border rounded-xl p-4 flex flex-col gap-3 hover:border-primary/40 transition-colors shadow-sm">
                                                    <div className="flex items-start justify-between gap-2">
                                                        <div className="flex items-start gap-3">
                                                            <span className="text-xs font-bold bg-primary text-primary-foreground px-2.5 py-1 rounded-lg whitespace-nowrap shadow-sm">{new Intl.DateTimeFormat('pt-BR', { hour: '2-digit', minute: '2-digit' }).format(new Date(ag.dataHoraInicio))}</span>
                                                            <div>
                                                                <p className="font-bold text-foreground text-sm leading-tight">{ag.cliente.nome}</p>
                                                                <p className="text-[11px] text-muted-foreground font-mono mt-1">{ag.cliente.telefone}</p>
                                                            </div>
                                                        </div>
                                                        <span className={`text-[9px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wider flex-shrink-0 border ${ag.concluido ? 'bg-emerald-100 text-emerald-700 border-emerald-200' : 'bg-secondary text-secondary-foreground border-border'}`}>{ag.concluido ? 'Faturado' : 'Pendente'}</span>
                                                    </div>
                                                    <div className="pt-3 border-t border-border mt-1">
                                                        <p className="text-xs text-muted-foreground flex items-center gap-1.5 mb-3"><Scissors className="w-3.5 h-3.5" />Com: <strong className="text-foreground">{ag.funcionario.nome}</strong></p>
                                                        {!ag.concluido && (
                                                            <div className="flex gap-2">
                                                                <button onClick={() => abrirModalEdicao(ag)} className="flex-1 text-xs font-bold text-foreground border border-border bg-muted/50 hover:bg-muted hover:text-primary px-2 py-2 rounded-lg transition-colors">Reagendar</button>
                                                                <button onClick={() => handleCancelar(ag.id)} disabled={loadingCancelarId === ag.id} className="flex-1 text-xs font-bold text-destructive border border-destructive/20 bg-destructive/5 hover:bg-destructive/10 px-2 py-2 rounded-lg transition-colors disabled:opacity-50 flex items-center justify-center gap-1">{loadingCancelarId === ag.id ? <Loader2 className="w-3 h-3 animate-spin" /> : 'Cancelar'}</button>
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

            {/* ── MODAIS (NOVO, EDITAR, ESCALA) ── */}
            {isModalNovoOpen && (
                <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50 backdrop-blur-sm">
                    <div className="bg-card rounded-2xl shadow-2xl w-full max-w-md overflow-hidden border-t-4 border-t-primary animate-in zoom-in-95 duration-200">
                        <div className="px-6 py-5 border-b border-border flex items-center justify-between bg-muted/30">
                            <div><h2 className="font-bold text-foreground text-lg">Nova Reserva Global</h2><p className="text-xs text-muted-foreground mt-0.5">Preencha os dados do agendamento</p></div>
                            <button onClick={() => { setIsModalNovoOpen(false); formNovo.reset() }} className="text-muted-foreground hover:bg-muted p-2 rounded-full transition-colors"><X className="w-5 h-5" /></button>
                        </div>
                        <form onSubmit={formNovo.handleSubmit(onSubmitNovo)} className="p-6 space-y-5">
                            <Campo label="Cliente" erro={formNovo.formState.errors.clienteId?.message} required>
                                <select {...formNovo.register('clienteId')} className={`w-full border rounded-lg px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-primary/20 bg-card transition-all ${formNovo.formState.errors.clienteId ? 'border-destructive bg-destructive/5' : 'border-border focus:border-primary'}`}>
                                    <option value="">Selecione um cliente...</option>
                                    {clientesList.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
                                </select>
                            </Campo>
                            <Campo label="Profissional" erro={formNovo.formState.errors.funcionarioId?.message} required>
                                <select {...formNovo.register('funcionarioId')} className={`w-full border rounded-lg px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-primary/20 bg-card transition-all ${formNovo.formState.errors.funcionarioId ? 'border-destructive bg-destructive/5' : 'border-border focus:border-primary'}`}>
                                    <option value="">Selecione o profissional...</option>
                                    {equipa.map(p => <option key={p.id} value={p.id}>{p.nome}</option>)}
                                </select>
                            </Campo>
                            <Campo label="Serviço" erro={formNovo.formState.errors.servicoId?.message} required>
                                <select {...formNovo.register('servicoId')} className={`w-full border rounded-lg px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-primary/20 bg-card transition-all ${formNovo.formState.errors.servicoId ? 'border-destructive bg-destructive/5' : 'border-border focus:border-primary'}`}>
                                    <option value="">Selecione o serviço...</option>
                                    {servicosList.map(s => <option key={s.id} value={s.id}>{s.nome}</option>)}
                                </select>
                            </Campo>
                            <Campo label="Data e Hora" erro={formNovo.formState.errors.dataHora?.message} required>
                                <input {...formNovo.register('dataHora')} type="datetime-local" className={`w-full border rounded-lg px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-primary/20 bg-card transition-all ${formNovo.formState.errors.dataHora ? 'border-destructive bg-destructive/5' : 'border-border focus:border-primary'}`} />
                            </Campo>
                            <div className="flex gap-3 pt-4 border-t border-border">
                                <button type="button" onClick={() => { setIsModalNovoOpen(false); formNovo.reset() }} className="flex-1 py-3 border border-border text-muted-foreground font-bold rounded-xl hover:bg-muted text-sm transition-colors">Cancelar</button>
                                <button type="submit" disabled={loadingSalvar} className="flex-1 py-3 bg-primary text-primary-foreground font-bold rounded-xl hover:bg-primary/90 disabled:opacity-60 text-sm transition-colors flex items-center justify-center gap-2">{loadingSalvar ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Confirmar Agenda'}</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {agendamentoEditandoId && (
                <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-[60] backdrop-blur-sm">
                    <div className="bg-card rounded-2xl shadow-2xl w-full max-w-md overflow-hidden border-t-4 border-t-primary animate-in zoom-in-95 duration-200">
                        <div className="px-6 py-5 border-b border-border flex items-center justify-between bg-muted/30">
                            <div><h2 className="font-bold text-foreground text-lg">Reagendar Reserva</h2><p className="text-xs text-muted-foreground mt-0.5">Altere o profissional ou a data/hora</p></div>
                            <button onClick={() => { setAgendamentoEditandoId(null); formEditar.reset() }} className="text-muted-foreground hover:bg-muted p-2 rounded-full transition-colors"><X className="w-5 h-5" /></button>
                        </div>
                        <form onSubmit={formEditar.handleSubmit(onSubmitEditar)} className="p-6 space-y-5">
                            <Campo label="Profissional" erro={formEditar.formState.errors.funcionarioId?.message} required>
                                <select {...formEditar.register('funcionarioId')} className={`w-full border rounded-lg px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-primary/20 bg-card transition-all ${formEditar.formState.errors.funcionarioId ? 'border-destructive bg-destructive/5' : 'border-border focus:border-primary'}`}>
                                    <option value="">Selecione o novo profissional...</option>
                                    {equipa.map(p => <option key={p.id} value={p.id}>{p.nome}</option>)}
                                </select>
                            </Campo>
                            <Campo label="Nova Data e Hora" erro={formEditar.formState.errors.dataHora?.message} required>
                                <input {...formEditar.register('dataHora')} type="datetime-local" className={`w-full border rounded-lg px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-primary/20 bg-card transition-all ${formEditar.formState.errors.dataHora ? 'border-destructive bg-destructive/5' : 'border-border focus:border-primary'}`} />
                            </Campo>
                            <div className="flex gap-3 pt-4 border-t border-border">
                                <button type="button" onClick={() => { setAgendamentoEditandoId(null); formEditar.reset() }} className="flex-1 py-3 border border-border text-muted-foreground font-bold rounded-xl hover:bg-muted text-sm transition-colors">Cancelar</button>
                                <button type="submit" disabled={loadingEditar} className="flex-1 py-3 bg-primary text-primary-foreground font-bold rounded-xl hover:bg-primary/90 disabled:opacity-60 text-sm transition-colors flex items-center justify-center gap-2">{loadingEditar ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Atualizar Agenda'}</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {modalAcessos && (
                <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-[60] backdrop-blur-sm">
                    <div className="bg-card rounded-2xl shadow-2xl w-full max-w-lg flex flex-col max-h-[92vh] overflow-hidden border-t-4 border-t-primary animate-in zoom-in-95 duration-200">
                        <div className="px-6 py-5 border-b border-border flex items-center gap-3 bg-muted/30">
                            <Avatar nome={modalAcessos.nome} />
                            <div className="flex-1 min-w-0"><h2 className="font-bold text-foreground truncate">{modalAcessos.nome}</h2><p className="text-xs text-muted-foreground">Configuração de Escala</p></div>
                            <button onClick={() => setModalAcessos(null)} className="text-muted-foreground hover:bg-muted p-2 rounded-full transition-colors"><X className="w-5 h-5" /></button>
                        </div>
                        <div className="flex-1 overflow-y-auto p-6 bg-background space-y-4">
                            <div className="space-y-2">
                                <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest mb-3">Dias de Trabalho Regular</p>
                                {modalAcessos.expedientes.map((exp: ExpedienteInfo, index: number) => (
                                    <div key={exp.diaSemana} className={`flex items-center gap-3 p-3.5 rounded-xl border ${exp.ativo ? 'bg-primary/5 border-primary/20' : 'bg-card border-border'}`}>
                                        <label className="flex items-center gap-2 min-w-[110px] cursor-pointer">
                                            <input type="checkbox" checked={exp.ativo} onChange={e => atualizarExpedienteLocal(index, 'ativo', e.target.checked)} className="w-4 h-4 accent-primary rounded" />
                                            <span className="text-xs font-bold text-foreground uppercase tracking-wide">{DIAS_SEMANA_COMPLETO[exp.diaSemana]}</span>
                                        </label>
                                        <div className={`flex gap-2 flex-1 justify-end items-center ${exp.ativo ? '' : 'opacity-30 pointer-events-none'}`}>
                                            <input type="time" value={exp.horaInicio} onChange={e => atualizarExpedienteLocal(index, 'horaInicio', e.target.value)} className="border border-border rounded-lg px-2.5 py-1.5 text-xs bg-card font-mono outline-none focus:border-primary" />
                                            <span className="text-muted-foreground self-center text-xs">até</span>
                                            <input type="time" value={exp.horaFim} onChange={e => atualizarExpedienteLocal(index, 'horaFim', e.target.value)} className="border border-border rounded-lg px-2.5 py-1.5 text-xs bg-card font-mono outline-none focus:border-primary" />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                        <div className="px-6 py-4 bg-muted/30 border-t border-border flex gap-3">
                            <button onClick={() => setModalAcessos(null)} className="flex-1 py-2.5 text-muted-foreground font-bold rounded-xl hover:bg-muted text-sm transition-colors">Cancelar</button>
                            <button onClick={handleSalvarProfissional} disabled={loadingAcaoProfissional} className="flex-1 py-2.5 bg-primary text-primary-foreground font-bold rounded-xl hover:bg-primary/90 disabled:opacity-60 text-sm transition-colors flex justify-center items-center gap-2">{loadingAcaoProfissional ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Salvar Escala'}</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}