'use client'

import { useState, useEffect, useCallback } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import {
    criarFuncionario,
    listarEquipaAdmin,
    atualizarFuncionarioCompleto,
    editarFuncionarioCompleto,
    salvarEscalaFuncionarioAdmin,
    listarNotificacoesAdmin,
    marcarNotificacaoLida,
    type NotificacaoItem
} from '@/app/actions/admin'
import { listarServicosAdmin } from '@/app/actions/servico'
import AdminHeader from '@/components/admin/AdminHeader'
import { ProfissionalRow } from '@/components/admin/profissional-row'
import dynamic from 'next/dynamic'
const AniversariantesWidget = dynamic(
    () => import('@/components/admin/AniversariantesWidget').then(mod => mod.AniversariantesWidget),
    { ssr: false, loading: () => <Skeleton className="h-72 w-full rounded-xl" /> }
)
import { Skeleton } from '@/components/ui/skeleton'
import { UserPlus, Search, AlertCircle, X, Loader2 } from 'lucide-react'

// ── Schemas Zod ──────────────────────────────────────────────────────────────
const schemaCadastro = z.object({
    nome: z.string().min(2, 'Nome deve ter pelo menos 2 caracteres'),
    email: z.string().email('E-mail inválido'),
    cpf: z.string().optional(),
    telefone: z.string().optional(),
    especialidade: z.string().optional(),
})
type FormCadastro = z.infer<typeof schemaCadastro>

// ── Tipos ────────────────────────────────────────────────────────────────────
type ServicoResumo = { id: string; nome: string }
type ExpedienteInfo = { id?: string; diaSemana: number; horaInicio: string; horaFim: string; ativo: boolean }
type ProfissionalResumo = {
    id: string; nome: string; email: string; especialidade: string | null; ativo: boolean; comissao: number;
    podeVerComissao: boolean; podeAgendar: boolean; podeVerHistorico: boolean; podeCancelar: boolean;
    servicos: ServicoResumo[]; expedientes: ExpedienteInfo[];
}
type Mensagem = { texto: string; tipo: 'sucesso' | 'erro' | 'info' | '' }
type PermissaoKey = 'podeVerComissao' | 'podeAgendar' | 'podeVerHistorico' | 'podeCancelar'

// ── Constantes ───────────────────────────────────────────────────────────────
const DIAS_SEMANA = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado']
const permissoesSistema: { key: PermissaoKey; label: string; desc: string }[] = [
    { key: 'podeVerComissao', label: 'Ver Valores Financeiros', desc: 'Visualiza faturamento da comanda.' },
    { key: 'podeAgendar', label: 'Criar Agendamentos', desc: 'Cria novas reservas na agenda.' },
    { key: 'podeVerHistorico', label: 'Ver Histórico Financeiro', desc: 'Acessa comandas já faturadas.' },
    { key: 'podeCancelar', label: 'Cancelar Agendamentos', desc: 'Pode excluir clientes e faturamentos.' },
]

// ── Componente de Avatar Simples (Para Modais) ──────────────────────────────
function Avatar({ nome }: { nome: string }) {
    const initials = nome.split(' ').slice(0, 2).map(n => n[0]).join('').toUpperCase()
    return (
        <div className="w-10 h-10 bg-primary/10 text-primary border border-primary/20 rounded-full flex items-center justify-center font-bold flex-shrink-0">
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

export default function TorreControleDashboard() {
    const [isCarregando, setIsCarregando] = useState(true)
    const [equipa, setEquipa] = useState<ProfissionalResumo[]>([])
    const [servicosDisponiveis, setServicosDisponiveis] = useState<ServicoResumo[]>([])
    const [notificacoes, setNotificacoes] = useState<NotificacaoItem[]>([])
    const [mensagem, setMensagem] = useState<Mensagem>({ texto: '', tipo: '' })
    const [busca, setBusca] = useState('')

    const [isModalOpen, setIsModalOpen] = useState(false)
    const [modalServicos, setModalServicos] = useState<{ id: string; nome: string; servicosIds: string[] } | null>(null)
    const [modalAcessos, setModalAcessos] = useState<ProfissionalResumo | null>(null)
    const [credenciaisNovo, setCredenciaisNovo] = useState<{ email: string; senhaTemp: string } | null>(null)
    const [abaAtiva, setAbaAtiva] = useState<'permissoes' | 'escala'>('permissoes')
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [loadingAcao, setLoadingAcao] = useState(false)

    const { register, handleSubmit, reset, formState: { errors } } = useForm<FormCadastro>({ resolver: zodResolver(schemaCadastro) })

    useEffect(() => {
        const init = async () => {
            try {
                const [resEq, resSv, resNotif] = await Promise.all([listarEquipaAdmin(), listarServicosAdmin(), listarNotificacoesAdmin()])
                if (resEq.sucesso && 'data' in resEq) setEquipa(resEq.data.equipa as ProfissionalResumo[])
                if (resSv.sucesso && 'data' in resSv) setServicosDisponiveis(resSv.data.servicos as ServicoResumo[])
                if (resNotif.sucesso && 'data' in resNotif) setNotificacoes(resNotif.data.notificacoes as NotificacaoItem[])
            } finally {
                setIsCarregando(false)
            }
        }
        init()
    }, [])

    const recarregarDados = useCallback(async () => {
        const [resEq, resNotif] = await Promise.all([listarEquipaAdmin(), listarNotificacoesAdmin()])
        if (resEq.sucesso && 'data' in resEq) setEquipa(resEq.data.equipa as ProfissionalResumo[])
        if (resNotif.sucesso && 'data' in resNotif) setNotificacoes(resNotif.data.notificacoes as NotificacaoItem[])
    }, [])

    const exibirMensagem = (texto: string, tipo: Mensagem['tipo'], ms = 4000) => {
        setMensagem({ texto, tipo })
        if (ms > 0) setTimeout(() => setMensagem({ texto: '', tipo: '' }), ms)
    }

    const handleLimparAlerta = async (id: string) => {
        await marcarNotificacaoLida(id)
        recarregarDados()
    }

    const onSubmitCadastro = async (data: FormCadastro) => {
        setIsSubmitting(true)
        exibirMensagem('A processar...', 'info', 0)

        // ── CORREÇÃO DE TIPAGEM APLICADA AQUI ──
        const res = await criarFuncionario({
            nome: data.nome,
            email: data.email,
            cpf: data.cpf ?? '',
            telefone: data.telefone ?? '',
            especialidade: data.especialidade ?? '',
            comissao: 40,
            servicosIds: [],
            podeCancelar: false,
            podeAgendar: false,      // Obrigatório na tipagem
            podeVerHistorico: false, // Obrigatório na tipagem
        })

        if (res.sucesso) {
            setCredenciaisNovo({ email: data.email, senhaTemp: 'Mudar@123' })
            setIsModalOpen(false)
            reset()
            recarregarDados()
            exibirMensagem('Profissional cadastrado com sucesso!', 'sucesso')
        } else if ('erro' in res) {
            exibirMensagem(res.erro, 'erro')
        }
        setIsSubmitting(false)
    }

    const handleSalvarGerenciamento = async () => {
        if (!modalAcessos) return
        setLoadingAcao(true)
        const resPermissoes = await atualizarFuncionarioCompleto(modalAcessos.id, {
            comissao: Number(modalAcessos.comissao),
            podeVerComissao: modalAcessos.podeVerComissao,
            podeAgendar: modalAcessos.podeAgendar,
            podeVerHistorico: modalAcessos.podeVerHistorico,
            podeCancelar: modalAcessos.podeCancelar,
        })
        const resEscala = await salvarEscalaFuncionarioAdmin(modalAcessos.id, modalAcessos.expedientes)

        if (resPermissoes.sucesso && resEscala.sucesso) {
            exibirMensagem('Perfil atualizado com sucesso!', 'sucesso')
            setModalAcessos(null)
            recarregarDados()
        } else {
            exibirMensagem('Erro ao atualizar os dados.', 'erro')
        }
        setLoadingAcao(false)
    }

    const handleSalvarServicosExistente = async () => {
        if (!modalServicos) return
        setLoadingAcao(true)
        const res = await editarFuncionarioCompleto(modalServicos.id, { servicosIds: modalServicos.servicosIds })
        if (res.sucesso) {
            exibirMensagem('Portfólio atualizado!', 'sucesso')
            setModalServicos(null)
            recarregarDados()
        } else if ('erro' in res) {
            exibirMensagem(res.erro, 'erro')
        }
        setLoadingAcao(false)
    }

    const atualizarExpedienteLocal = <K extends keyof ExpedienteInfo>(index: number, campo: K, valor: ExpedienteInfo[K]) => {
        if (!modalAcessos) return
        const novosExpedientes = [...modalAcessos.expedientes]
        novosExpedientes[index] = { ...novosExpedientes[index], [campo]: valor }
        setModalAcessos({ ...modalAcessos, expedientes: novosExpedientes })
    }

    const handleAlternarStatus = async (id: string, atual: boolean) => {
        if (!confirm(`Deseja ${atual ? 'desativar' : 'reativar'} este profissional?`)) return;
        setLoadingAcao(true);

        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore
        const res = await atualizarFuncionarioCompleto(id, { ativo: !atual });

        if (res.sucesso) recarregarDados();
        else exibirMensagem("Erro ao alterar status", "erro");
        setLoadingAcao(false);
    }

    const equipaFiltrada = equipa.filter(p => p.nome.toLowerCase().includes(busca.toLowerCase()) || p.email.toLowerCase().includes(busca.toLowerCase()))
    const totalAtivos = equipa.filter(p => p.ativo).length
    const totalInativos = equipa.filter(p => !p.ativo).length

    return (
        <div className="min-h-screen bg-background font-sans">
            <AdminHeader
                titulo="Torre de Controle"
                subtitulo="Gestão de equipe, comissões e escalas de trabalho."
                abaAtiva="Equipe"
                botaoAcao={
                    <button
                        onClick={() => { setCredenciaisNovo(null); setIsModalOpen(true) }}
                        className="w-full sm:w-auto flex items-center justify-center gap-2 bg-primary text-primary-foreground px-5 py-2.5 rounded-xl font-bold text-sm hover:bg-primary/90 transition-colors shadow-sm active:scale-[0.98]"
                    >
                        <UserPlus className="w-4 h-4" /> Novo Profissional
                    </button>
                }
            />

            <div className="px-4 md:px-8 space-y-6 max-w-7xl mx-auto pb-12 mt-6">

                {/* ── FEEDBACK E NOTIFICAÇÕES ── */}
                {mensagem.texto && (
                    <div className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold border ${mensagem.tipo === 'erro' ? 'bg-destructive/10 text-destructive border-destructive/20' : mensagem.tipo === 'info' ? 'bg-blue-50 text-blue-700 border-blue-200' : 'bg-emerald-50 text-emerald-700 border-emerald-200'}`}>
                        <span className="text-base">{mensagem.tipo === 'erro' ? '✕' : mensagem.tipo === 'info' ? '⋯' : '✓'}</span>
                        {mensagem.texto}
                    </div>
                )}

                {notificacoes.length > 0 && (
                    <div className="space-y-2 animate-in fade-in slide-in-from-top-2">
                        <p className="text-xs font-bold text-destructive uppercase tracking-wider flex items-center gap-1.5">
                            <AlertCircle className="w-4 h-4" /> Alertas Pendentes ({notificacoes.length})
                        </p>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            {notificacoes.map(notif => (
                                <div key={notif.id} className="flex items-start gap-3 bg-destructive/5 border border-destructive/20 rounded-xl px-4 py-3">
                                    <p className="text-sm text-destructive flex-1 leading-snug font-medium">{notif.mensagem}</p>
                                    <button onClick={() => handleLimparAlerta(notif.id)} className="text-xs font-bold text-destructive hover:bg-destructive/10 px-2 py-1 rounded-md transition-colors">
                                        Dispensar
                                    </button>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {credenciaisNovo && (
                    <div className="bg-primary/10 border border-primary/20 rounded-xl p-5 animate-in fade-in zoom-in-95">
                        <p className="font-bold text-primary mb-3 text-sm">Profissional criado! Compartilhe as credenciais:</p>
                        <div className="flex flex-wrap gap-3">
                            <div className="bg-card border border-border rounded-lg px-4 py-2.5">
                                <span className="text-[10px] text-muted-foreground uppercase font-bold block mb-0.5">E-mail</span>
                                <span className="font-mono text-sm font-bold text-foreground">{credenciaisNovo.email}</span>
                            </div>
                            <div className="bg-card border border-border rounded-lg px-4 py-2.5">
                                <span className="text-[10px] text-muted-foreground uppercase font-bold block mb-0.5">Senha Temp</span>
                                <span className="font-mono text-sm font-bold text-foreground">{credenciaisNovo.senhaTemp}</span>
                            </div>
                        </div>
                    </div>
                )}

                {/* ── CONDICIONAL DE LOADING ── */}
                {isCarregando ? (
                    <div className="space-y-6 animate-in fade-in duration-500">
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 md:gap-6">
                            {Array.from({ length: 3 }).map((_, i) => (
                                <Skeleton key={i} className="h-[120px] w-full rounded-2xl" />
                            ))}
                        </div>

                        <Skeleton className="h-[46px] w-full rounded-xl" />

                        <div className="bg-card rounded-2xl shadow-sm border border-border overflow-hidden p-6 space-y-6">
                            {Array.from({ length: 4 }).map((_, i) => (
                                <div key={i} className="flex items-center gap-4">
                                    <Skeleton className="h-12 w-12 rounded-full" />
                                    <div className="space-y-2 flex-1">
                                        <Skeleton className="h-4 w-[150px]" />
                                        <Skeleton className="h-3 w-[100px]" />
                                    </div>
                                    <Skeleton className="h-8 w-24 rounded-lg hidden sm:block" />
                                </div>
                            ))}
                        </div>
                    </div>
                ) : (
                    <>
                        {/* ── MÉTRICAS ── */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
                            {[
                                { label: 'Total da Equipe', valor: equipa.length, border: 'border-blue-400', bgGrad: 'from-blue-50', text: 'text-foreground' },
                                { label: 'Em Atividade', valor: totalAtivos, border: 'border-emerald-400', bgGrad: 'from-emerald-50', text: 'text-emerald-700' },
                                { label: 'Inativos', valor: totalInativos, border: 'border-destructive', bgGrad: 'from-destructive/10', text: 'text-destructive' },
                            ].map(({ label, valor, border, bgGrad, text }) => (
                                <div key={label} className={`relative bg-card p-6 rounded-2xl shadow-sm border border-t-[3px] border-x-border border-b-border ${border} overflow-hidden group`}>
                                    <div className={`absolute inset-0 bg-gradient-to-br ${bgGrad} to-transparent opacity-50`} />
                                    <div className="relative z-10">
                                        <p className="text-[11px] md:text-xs font-bold text-muted-foreground uppercase tracking-[0.15em]">{label}</p>
                                        <p className={`text-2xl md:text-3xl font-black mt-2 tracking-tight ${text}`}>{valor}</p>
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* ── ANIVERSARIANTES DO MÊS ── */}
                        <AniversariantesWidget />

                        {/* ── PESQUISA ── */}
                        <div className="relative bg-card rounded-xl shadow-sm border border-border p-1">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground w-4 h-4" />
                            <input
                                type="text"
                                placeholder="Pesquisar por nome ou e-mail..."
                                value={busca}
                                onChange={e => setBusca(e.target.value)}
                                className="w-full pl-11 pr-4 py-3 bg-transparent text-sm outline-none focus:ring-0 transition-all text-foreground"
                            />
                        </div>

                        {/* ── TABELA ── */}
                        <div className="bg-card rounded-2xl shadow-sm border border-border overflow-hidden">
                            <div className="hidden border-b border-border bg-muted/50 px-4 py-3 sm:flex sm:px-6">
                                <span className="w-10"></span>
                                <span className="ml-4 flex-1 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Profissional & Especialidade</span>
                                <span className="mr-8 text-right text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Comissão Atual</span>
                                <span className="w-5"></span>
                            </div>

                            <div className="flex flex-col">
                                {equipaFiltrada.length === 0 ? (
                                    <div className="p-16 text-center flex flex-col items-center justify-center">
                                        <div className="w-16 h-16 bg-primary/10 text-primary rounded-full flex items-center justify-center mb-4">
                                            <UserPlus className="w-8 h-8" />
                                        </div>
                                        <p className="text-lg font-bold text-foreground">{busca ? 'Nenhum resultado' : 'Equipe Vazia'}</p>
                                        <p className="text-sm text-muted-foreground mt-1 max-w-sm">Adicione talentos à sua equipe para habilitar os agendamentos online.</p>
                                    </div>
                                ) : (
                                    equipaFiltrada.map(prof => (
                                        <ProfissionalRow
                                            key={prof.id}
                                            profissional={{
                                                id: prof.id,
                                                nome: prof.nome,
                                                cargo: prof.especialidade || 'Membro da Equipe',
                                                comissao: prof.comissao,
                                                ativo: prof.ativo,
                                                expediente: prof.expedientes,
                                                servicosAtribuidos: prof.servicos.map(s => s.nome)
                                            }}
                                            onEditar={() => { setModalAcessos(prof); setAbaAtiva('permissoes') }}
                                            onEditarEscala={() => { setModalAcessos(prof); setAbaAtiva('escala') }}
                                            onEditarPortifolio={() => setModalServicos({ id: prof.id, nome: prof.nome, servicosIds: prof.servicos.map(s => s.id) })}
                                            onAlternarStatus={(id: string, atual: boolean) => handleAlternarStatus(id, atual)}
                                        />
                                    ))
                                )}
                            </div>
                        </div>
                    </>
                )}
            </div>

            {/* ── MODAL: GERIR ACESSOS E ESCALAS ── */}
            {modalAcessos && (
                <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50 backdrop-blur-sm">
                    <div className="bg-card rounded-2xl shadow-2xl w-full max-w-lg flex flex-col max-h-[92vh] overflow-hidden border-t-4 border-t-primary animate-in zoom-in-95 duration-200">
                        <div className="px-6 py-5 border-b border-border flex items-center gap-3 bg-muted/30">
                            <Avatar nome={modalAcessos.nome} />
                            <div className="flex-1 min-w-0">
                                <h2 className="font-bold text-foreground truncate">{modalAcessos.nome}</h2>
                                <p className="text-xs text-muted-foreground">Configuração de Perfil</p>
                            </div>
                            <button onClick={() => setModalAcessos(null)} className="text-muted-foreground hover:bg-muted p-2 rounded-full transition-colors">
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <div className="flex border-b border-border px-6">
                            {(['permissoes', 'escala'] as const).map(aba => (
                                <button key={aba} onClick={() => setAbaAtiva(aba)}
                                    className={`py-3 px-1 mr-5 text-sm font-semibold border-b-2 transition-colors ${abaAtiva === aba ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'}`}>
                                    {aba === 'permissoes' ? 'Permissões e Comissão' : 'Escala Semanal'}
                                </button>
                            ))}
                        </div>

                        <div className="flex-1 overflow-y-auto p-6 bg-background space-y-4">
                            {abaAtiva === 'permissoes' && (
                                <div className="space-y-6">
                                    <div>
                                        <label className="block text-[11px] font-bold text-muted-foreground uppercase tracking-widest mb-2">Comissão Base (%)</label>
                                        <input
                                            type="number" min={0} max={100}
                                            value={modalAcessos.comissao}
                                            onChange={e => setModalAcessos({ ...modalAcessos, comissao: Number(e.target.value) })}
                                            className="w-full border border-border rounded-lg px-4 py-2.5 text-sm font-black text-primary outline-none focus:ring-2 focus:ring-primary/20 bg-card"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest mb-3">Direitos de Acesso</p>
                                        {permissoesSistema.map(({ key, label, desc }) => (
                                            <label key={key} className="flex items-center gap-3 p-3.5 bg-card border border-border rounded-xl cursor-pointer hover:border-primary/30 transition-colors">
                                                <input type="checkbox" checked={modalAcessos[key]} onChange={e => setModalAcessos({ ...modalAcessos, [key]: e.target.checked })} className="w-4 h-4 accent-primary rounded" />
                                                <div>
                                                    <p className="text-sm font-bold text-foreground">{label}</p>
                                                    <p className="text-xs text-muted-foreground mt-0.5">{desc}</p>
                                                </div>
                                            </label>
                                        ))}
                                    </div>
                                </div>
                            )}
                            {abaAtiva === 'escala' && (
                                <div className="space-y-2">
                                    <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest mb-3">Defina os dias de trabalho</p>
                                    {modalAcessos.expedientes.map((exp, index) => (
                                        <div key={exp.diaSemana} className={`flex flex-wrap sm:flex-nowrap items-center justify-between gap-3 p-3.5 rounded-xl border ${exp.ativo ? 'bg-primary/5 border-primary/20' : 'bg-card border-border'}`}>
                                            <label className="flex items-center gap-2 cursor-pointer">
                                                <input type="checkbox" checked={exp.ativo} onChange={e => atualizarExpedienteLocal(index, 'ativo', e.target.checked)} className="w-4 h-4 accent-primary rounded" />
                                                <span className="text-xs font-bold text-foreground uppercase tracking-wide">{DIAS_SEMANA[exp.diaSemana]}</span>
                                            </label>
                                            <div className={`flex items-center gap-2 ${exp.ativo ? '' : 'opacity-30 pointer-events-none'}`}>
                                                <input type="time" value={exp.horaInicio} onChange={e => atualizarExpedienteLocal(index, 'horaInicio', e.target.value)} className="border border-border rounded-md px-2 py-1 text-xs font-mono bg-card outline-none focus:border-primary" />
                                                <span className="text-muted-foreground text-xs">até</span>
                                                <input type="time" value={exp.horaFim} onChange={e => atualizarExpedienteLocal(index, 'horaFim', e.target.value)} className="border border-border rounded-md px-2 py-1 text-xs font-mono bg-card outline-none focus:border-primary" />
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        <div className="px-6 py-4 bg-muted/30 border-t border-border flex gap-3">
                            <button onClick={() => setModalAcessos(null)} className="flex-1 py-2.5 text-muted-foreground font-bold rounded-xl hover:bg-muted text-sm transition-colors">Cancelar</button>
                            <button onClick={handleSalvarGerenciamento} disabled={loadingAcao} className="flex-1 py-2.5 bg-primary text-primary-foreground font-bold rounded-xl hover:bg-primary/90 disabled:opacity-60 text-sm transition-colors flex justify-center items-center gap-2">
                                {loadingAcao ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Salvar Perfil'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ── MODAL: PORTFÓLIO DE SERVIÇOS ── */}
            {modalServicos && (
                <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50 backdrop-blur-sm">
                    <div className="bg-card rounded-2xl shadow-2xl w-full max-w-md overflow-hidden border-t-4 border-t-primary animate-in zoom-in-95 duration-200">
                        <div className="px-6 py-5 border-b border-border flex items-center justify-between bg-muted/30">
                            <div>
                                <h2 className="font-bold text-foreground">Portfólio Atribuído</h2>
                                <p className="text-xs text-muted-foreground mt-0.5">O que <strong className="text-primary">{modalServicos.nome}</strong> atende?</p>
                            </div>
                            <button onClick={() => setModalServicos(null)} className="text-muted-foreground hover:bg-muted p-2 rounded-full transition-colors">
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <div className="p-6">
                            <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                                {servicosDisponiveis.length === 0 ? (
                                    <p className="text-sm text-muted-foreground text-center py-6">Nenhum serviço cadastrado no sistema global.</p>
                                ) : servicosDisponiveis.map(servico => (
                                    <label key={servico.id} className="flex items-center gap-3 p-3 bg-card border border-border rounded-xl cursor-pointer hover:border-primary/30 transition-colors">
                                        <input
                                            type="checkbox"
                                            checked={modalServicos.servicosIds.includes(servico.id)}
                                            disabled={loadingAcao}
                                            onChange={() => setModalServicos({
                                                ...modalServicos,
                                                servicosIds: modalServicos.servicosIds.includes(servico.id)
                                                    ? modalServicos.servicosIds.filter(id => id !== servico.id)
                                                    : [...modalServicos.servicosIds, servico.id]
                                            })}
                                            className="w-4 h-4 accent-primary rounded"
                                        />
                                        <span className="text-sm font-bold text-foreground">{servico.nome}</span>
                                    </label>
                                ))}
                            </div>

                            <div className="flex gap-3 mt-5 pt-4 border-t border-border">
                                <button onClick={() => setModalServicos(null)} disabled={loadingAcao} className="flex-1 py-2.5 text-muted-foreground font-bold rounded-xl hover:bg-muted text-sm transition-colors">
                                    Cancelar
                                </button>
                                <button onClick={handleSalvarServicosExistente} disabled={loadingAcao} className="flex-1 py-2.5 bg-primary text-primary-foreground font-bold rounded-xl hover:bg-primary/90 disabled:opacity-60 text-sm transition-colors flex justify-center items-center gap-2">
                                    {loadingAcao ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Atualizar Portfólio'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* ── MODAL: NOVO PROFISSIONAL ── */}
            {isModalOpen && (
                <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50 backdrop-blur-sm">
                    <div className="bg-card rounded-2xl shadow-2xl w-full max-w-md overflow-hidden border-t-4 border-t-primary animate-in zoom-in-95 duration-200">
                        <div className="px-6 py-5 border-b border-border flex items-center justify-between bg-muted/30">
                            <div>
                                <h2 className="font-bold text-foreground">Cadastrar Profissional</h2>
                                <p className="text-xs text-muted-foreground mt-0.5">A senha temporária padrão será <span className="font-mono bg-card px-1 rounded">Mudar@123</span></p>
                            </div>
                            <button onClick={() => { setIsModalOpen(false); reset() }} className="text-muted-foreground hover:bg-muted p-2 rounded-full transition-colors">
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <form onSubmit={handleSubmit(onSubmitCadastro)} className="p-6 space-y-4">
                            <Campo label="Nome Completo" erro={errors.nome?.message} required>
                                <input {...register('nome')} type="text" placeholder="Ex: Ana Silva" disabled={isSubmitting} className="w-full border border-border rounded-lg px-4 py-2.5 text-sm font-medium outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all bg-card" />
                            </Campo>
                            <Campo label="E-mail de Login" erro={errors.email?.message} required>
                                <input {...register('email')} type="email" placeholder="profissional@email.com" disabled={isSubmitting} className="w-full border border-border rounded-lg px-4 py-2.5 text-sm font-medium outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all bg-card" />
                            </Campo>
                            <div className="grid grid-cols-2 gap-4">
                                <Campo label="CPF" erro={errors.cpf?.message}>
                                    <input {...register('cpf')} type="text" placeholder="000.000.000-00" disabled={isSubmitting} className="w-full border border-border rounded-lg px-4 py-2.5 text-sm font-medium outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all bg-card" />
                                </Campo>
                                <Campo label="Especialidade">
                                    <input {...register('especialidade')} type="text" placeholder="Ex: Colorimetria" disabled={isSubmitting} className="w-full border border-border rounded-lg px-4 py-2.5 text-sm font-medium outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all bg-card" />
                                </Campo>
                            </div>

                            <div className="flex gap-3 pt-4 border-t border-border mt-6">
                                <button type="button" onClick={() => { setIsModalOpen(false); reset() }} disabled={isSubmitting} className="flex-1 py-2.5 text-muted-foreground font-bold rounded-xl hover:bg-muted text-sm transition-colors">
                                    Cancelar
                                </button>
                                <button type="submit" disabled={isSubmitting} className="flex-1 py-2.5 bg-primary text-primary-foreground font-bold rounded-xl hover:bg-primary/90 disabled:opacity-60 text-sm transition-colors flex justify-center items-center gap-2">
                                    {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Salvar Cadastro'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    )
}