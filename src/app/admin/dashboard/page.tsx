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

type ExpedienteInfo = {
    id?: string
    diaSemana: number
    horaInicio: string
    horaFim: string
    ativo: boolean
}

type ProfissionalResumo = {
    id: string
    nome: string
    email: string
    especialidade: string | null
    ativo: boolean
    comissao: number
    podeVerComissao: boolean
    podeAgendar: boolean
    podeVerHistorico: boolean
    podeCancelar: boolean
    servicos: ServicoResumo[]
    expedientes: ExpedienteInfo[]
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

// ── Componente de Avatar ─────────────────────────────────────────────────────

function Avatar({ nome, size = 'md' }: { nome: string; size?: 'sm' | 'md' }) {
    const initials = nome.split(' ').slice(0, 2).map(n => n[0]).join('').toUpperCase()
    const colors = ['bg-amber-100 text-amber-700', 'bg-orange-100 text-orange-700', 'bg-gray-100 text-gray-700', 'bg-yellow-100 text-yellow-700']
    const color = colors[nome.charCodeAt(0) % colors.length]
    const sizeClass = size === 'sm' ? 'w-8 h-8 text-xs' : 'w-10 h-10 text-sm'
    return (
        <div className={`${sizeClass} ${color} rounded-full flex items-center justify-center font-bold flex-shrink-0`}>
            {initials}
        </div>
    )
}

// ── Componente de Campo com Erro ─────────────────────────────────────────────

function Campo({ label, erro, children, required }: { label: string; erro?: string; children: React.ReactNode; required?: boolean }) {
    return (
        <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                {label}{required && <span className="text-red-500 ml-0.5">*</span>}
            </label>
            {children}
            {erro && <p className="mt-1 text-xs text-red-600 flex items-center gap-1"><span>⚠</span>{erro}</p>}
        </div>
    )
}

// ── Componente Principal ──────────────────────────────────────────────────────

export default function TorreControleDashboard() {
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

    const {
        register,
        handleSubmit,
        reset,
        formState: { errors },
    } = useForm<FormCadastro>({ resolver: zodResolver(schemaCadastro) })

    // ── Dados ────────────────────────────────────────────────────────────────

    useEffect(() => {
        const init = async () => {
            const [resEq, resSv, resNotif] = await Promise.all([
                listarEquipaAdmin(), listarServicosAdmin(), listarNotificacoesAdmin()
            ])
            if (resEq.sucesso && 'equipa' in resEq) setEquipa(resEq.equipa as ProfissionalResumo[])
            if (resSv.sucesso && 'servicos' in resSv) setServicosDisponiveis(resSv.servicos as ServicoResumo[])
            if (resNotif.sucesso && 'notificacoes' in resNotif) setNotificacoes(resNotif.notificacoes as NotificacaoItem[])
        }
        init()
    }, [])

    const recarregarDados = useCallback(async () => {
        const [resEq, resNotif] = await Promise.all([listarEquipaAdmin(), listarNotificacoesAdmin()])
        if (resEq.sucesso && 'equipa' in resEq) setEquipa(resEq.equipa as ProfissionalResumo[])
        if (resNotif.sucesso && 'notificacoes' in resNotif) setNotificacoes(resNotif.notificacoes as NotificacaoItem[])
    }, [])

    const exibirMensagem = (texto: string, tipo: Mensagem['tipo'], ms = 4000) => {
        setMensagem({ texto, tipo })
        if (ms > 0) setTimeout(() => setMensagem({ texto: '', tipo: '' }), ms)
    }

    // ── Ações ────────────────────────────────────────────────────────────────

    const handleLimparAlerta = async (id: string) => {
        await marcarNotificacaoLida(id)
        recarregarDados()
    }

    const onSubmitCadastro = async (data: FormCadastro) => {
        setIsSubmitting(true)
        exibirMensagem('A processar...', 'info', 0)
        const res = await criarFuncionario({
            nome: data.nome,
            email: data.email,
            cpf: data.cpf ?? '',
            telefone: data.telefone ?? '',
            especialidade: data.especialidade ?? '',
            comissao: 40,
            servicosIds: [],
            podeCancelar: false,
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

    const equipaFiltrada = equipa.filter(p =>
        p.nome.toLowerCase().includes(busca.toLowerCase()) ||
        p.email.toLowerCase().includes(busca.toLowerCase())
    )

    const totalAtivos = equipa.filter(p => p.ativo).length
    const totalInativos = equipa.filter(p => !p.ativo).length

    // ── Render ───────────────────────────────────────────────────────────────

    return (
        <div className="min-h-screen bg-[#fdfbf7] font-sans">
            <AdminHeader 
                titulo="Torre de Controlo"
                subtitulo="Gestão de equipa, permissões e escalas de trabalho"
                abaAtiva="Equipa"
                botaoAcao={
                    <button
                        onClick={() => { setCredenciaisNovo(null); setIsModalOpen(true) }}
                        className="flex items-center justify-center gap-2 bg-[#5C4033] text-white px-5 py-2.5 rounded-xl font-bold text-sm hover:bg-[#3e2b22] transition-colors shadow-sm active:scale-[0.98]"
                    >
                        <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
                            <path d="M7 1v12M1 7h12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                        </svg>
                        Novo Profissional
                    </button>
                }
            />

            <div className="px-4 md:px-8 space-y-6 max-w-7xl mx-auto pb-12">
                {/* ── ALERTAS ── */}
                {notificacoes.length > 0 && (
                    <div className="space-y-2">
                        <p className="text-xs font-bold text-red-600 uppercase tracking-wider flex items-center gap-1.5">
                            <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" /><path d="M13.73 21a2 2 0 0 1-3.46 0" /></svg>
                            Alertas Pendentes ({notificacoes.length})
                        </p>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            {notificacoes.map(notif => (
                                <div key={notif.id} className="flex items-start gap-3 bg-red-50 border border-red-200 rounded-xl px-4 py-3">
                                    <p className="text-sm text-red-800 flex-1 leading-snug">{notif.mensagem}</p>
                                    <button
                                        onClick={() => handleLimparAlerta(notif.id)}
                                        className="text-xs font-bold text-red-600 hover:text-red-800 whitespace-nowrap px-2 py-1 rounded border border-red-200 hover:border-red-400 bg-white transition-colors"
                                    >
                                        Dispensar
                                    </button>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* ── FEEDBACK ── */}
                {mensagem.texto && (
                    <div className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium border ${mensagem.tipo === 'erro'
                        ? 'bg-red-50 text-red-700 border-red-200'
                        : mensagem.tipo === 'info'
                            ? 'bg-blue-50 text-blue-700 border-blue-200'
                            : 'bg-emerald-50 text-emerald-700 border-emerald-200'}`}>
                        <span className="text-base">{mensagem.tipo === 'erro' ? '✕' : mensagem.tipo === 'info' ? '⋯' : '✓'}</span>
                        {mensagem.texto}
                    </div>
                )}

                {/* ── CREDENCIAIS NOVO ── */}
                {credenciaisNovo && (
                    <div className="bg-amber-50 border border-amber-200 rounded-xl p-5">
                        <p className="font-bold text-amber-800 mb-3 text-sm">Profissional criado! Compartilhe as credenciais de acesso:</p>
                        <div className="flex flex-wrap gap-3">
                            <div className="bg-white border border-amber-200 rounded-lg px-4 py-2.5">
                                <span className="text-[10px] text-amber-600 uppercase font-bold block mb-0.5">E-mail</span>
                                <span className="font-mono text-sm font-bold text-gray-800">{credenciaisNovo.email}</span>
                            </div>
                            <div className="bg-white border border-amber-200 rounded-lg px-4 py-2.5">
                                <span className="text-[10px] text-amber-600 uppercase font-bold block mb-0.5">Senha Temporária</span>
                                <span className="font-mono text-sm font-bold text-gray-800">{credenciaisNovo.senhaTemp}</span>
                            </div>
                        </div>
                    </div>
                )}

                {/* ── MÉTRICAS ── */}
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4 md:gap-6">
                    {[
                        { label: 'Total da Equipa', valor: equipa.length, cor: 'border-blue-400', bgGrad: 'from-blue-50 to-transparent', textCor: 'text-gray-800' },
                        { label: 'Ativos', valor: totalAtivos, cor: 'border-emerald-400', bgGrad: 'from-emerald-50 to-transparent', textCor: 'text-emerald-700' },
                        { label: 'Inativos', valor: totalInativos, cor: 'border-red-400', bgGrad: 'from-red-50 to-transparent', textCor: 'text-red-600' },
                    ].map(({ label, valor, cor, bgGrad, textCor }) => (
                        <div key={label} className={`relative bg-white p-6 rounded-2xl shadow-sm border border-t-[3px] border-x-gray-100 border-b-gray-100 ${cor} overflow-hidden group`}>
                            <div className={`absolute inset-0 bg-linear-to-br ${bgGrad} opacity-50 transition-opacity duration-500`} />
                            <div className="relative z-10">
                                <p className="text-[11px] md:text-xs font-bold text-gray-400 uppercase tracking-[0.15em]">{label}</p>
                                <p className={`text-2xl md:text-3xl font-black mt-2 tracking-tight ${textCor}`}>{valor}</p>
                            </div>
                        </div>
                    ))}
                </div>

                {/* ── PESQUISA ── */}
                <div className="relative bg-white rounded-xl shadow-sm border border-gray-100 p-1">
                    <svg className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" /></svg>
                    <input
                        type="text"
                        placeholder="Pesquisar por nome ou e-mail..."
                        value={busca}
                        onChange={e => setBusca(e.target.value)}
                        className="w-full pl-11 pr-4 py-3 bg-transparent text-sm outline-none focus:ring-0 transition-all"
                    />
                </div>

                {/* ── TABELA DE EQUIPA ── */}
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                    <div className="px-6 md:px-8 py-5 border-b border-gray-100 bg-gray-50/50">
                        <h2 className="font-bold text-marrom-medio text-lg tracking-tight">Registo de Profissionais</h2>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-gray-50/50 text-gray-400 text-xs uppercase tracking-widest border-b border-gray-100">
                                    <th className="px-6 py-4 font-bold">Profissional</th>
                                    <th className="px-6 py-4 font-bold">Especialidade</th>
                                    <th className="px-6 py-4 font-bold text-center">Status</th>
                                    <th className="px-6 py-4 font-bold text-right">Ações</th>
                                </tr>
                            </thead>
                            <tbody>
                                {equipaFiltrada.length === 0 ? (
                                    <tr>
                                        <td colSpan={4} className="px-5 py-12 text-center text-gray-500 text-sm">
                                            {busca ? 'Nenhum profissional encontrado para a pesquisa.' : 'Nenhum profissional cadastrado.'}
                                        </td>
                                    </tr>
                                ) : (
                                    equipaFiltrada.map(prof => (
                                        <tr key={prof.id} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-3">
                                                    <Avatar nome={prof.nome} />
                                                    <div>
                                                        <p className="font-semibold text-gray-800 text-sm">{prof.nome}</p>
                                                        <p className="text-xs text-gray-400 mt-0.5">{prof.email}</p>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-gray-500 text-sm font-medium">{prof.especialidade || '—'}</td>
                                            <td className="px-6 py-4 text-center">
                                                <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold ${prof.ativo
                                                    ? 'bg-emerald-50 text-emerald-600 border border-emerald-100'
                                                    : 'bg-red-50 text-red-600 border border-red-100'}`}>
                                                    {prof.ativo ? 'Ativo' : 'Inativo'}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <div className="flex justify-end gap-2">
                                                    <button
                                                        onClick={() => setModalServicos({ id: prof.id, nome: prof.nome, servicosIds: prof.servicos.map(s => s.id) })}
                                                        className="px-3 py-1.5 text-xs font-bold text-gray-700 bg-gray-100 hover:bg-gray-200 border border-gray-200 rounded-lg transition-colors"
                                                    >
                                                        Portfólio
                                                    </button>
                                                    <button
                                                        onClick={() => setModalAcessos({ ...prof })}
                                                        className="px-3 py-1.5 text-xs font-bold text-gray-700 bg-gray-100 hover:bg-gray-200 border border-gray-200 rounded-lg transition-colors"
                                                    >
                                                        Gerir Acessos
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            {/* ── MODAL: GERIR ACESSOS E ESCALAS ── */}
            {modalAcessos && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 backdrop-blur-sm">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg flex flex-col max-h-[92vh] overflow-hidden">
                        <div className="px-6 py-5 border-b border-gray-100 flex items-center gap-3">
                            <Avatar nome={modalAcessos.nome} />
                            <div className="flex-1 min-w-0">
                                <h2 className="font-bold text-gray-800 truncate">{modalAcessos.nome}</h2>
                                <p className="text-xs text-gray-500">Editar permissões e escala de trabalho</p>
                            </div>
                            <button onClick={() => setModalAcessos(null)} className="text-gray-400 hover:text-gray-700 p-1 rounded-lg hover:bg-gray-100 transition-colors">
                                <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M18 6 6 18M6 6l12 12" /></svg>
                            </button>
                        </div>

                        <div className="flex border-b border-gray-200 px-6">
                            {(['permissoes', 'escala'] as const).map(aba => (
                                <button key={aba} onClick={() => setAbaAtiva(aba)}
                                    className={`py-3 px-1 mr-5 text-sm font-semibold border-b-2 transition-colors ${abaAtiva === aba
                                        ? 'border-[#8B5A2B] text-[#8B5A2B]'
                                        : 'border-transparent text-gray-400 hover:text-gray-600'}`}>
                                    {aba === 'permissoes' ? 'Permissões' : 'Escala de Trabalho'}
                                </button>
                            ))}
                        </div>

                        <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-gray-50/50">
                            {abaAtiva === 'permissoes' && (
                                <div className="space-y-5">
                                    <Campo label="Comissão (%)">
                                        <input
                                            type="number" min={0} max={100}
                                            value={modalAcessos.comissao}
                                            onChange={e => setModalAcessos({ ...modalAcessos, comissao: Number(e.target.value) })}
                                            className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-[#8B5A2B]/20 focus:border-[#8B5A2B] bg-white"
                                        />
                                    </Campo>
                                    <div className="space-y-2">
                                        {permissoesSistema.map(({ key, label, desc }) => (
                                            <label key={key} className="flex items-center gap-3 p-3.5 bg-white border border-gray-200 rounded-xl cursor-pointer hover:border-gray-300 transition-colors">
                                                <input
                                                    type="checkbox"
                                                    checked={modalAcessos[key]}
                                                    onChange={e => setModalAcessos({ ...modalAcessos, [key]: e.target.checked })}
                                                    className="w-4 h-4 accent-[#8B5A2B] rounded"
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
                                    {modalAcessos.expedientes.map((exp, index) => (
                                        <div key={exp.diaSemana} className={`flex items-center gap-3 p-3.5 rounded-xl border ${exp.ativo ? 'bg-amber-50/70 border-amber-200' : 'bg-white border-gray-200'}`}>
                                            <label className="flex items-center gap-2 min-w-[110px] cursor-pointer">
                                                <input
                                                    type="checkbox" checked={exp.ativo}
                                                    onChange={e => atualizarExpedienteLocal(index, 'ativo', e.target.checked)}
                                                    className="w-4 h-4 accent-[#8B5A2B] rounded"
                                                />
                                                <span className="text-xs font-bold text-gray-700 uppercase tracking-wide">{DIAS_SEMANA[exp.diaSemana]}</span>
                                            </label>
                                            <div className={`flex gap-2 flex-1 justify-end ${exp.ativo ? '' : 'opacity-30 pointer-events-none'}`}>
                                                <input type="time" value={exp.horaInicio}
                                                    onChange={e => atualizarExpedienteLocal(index, 'horaInicio', e.target.value)}
                                                    className="border border-gray-300 rounded-lg px-2.5 py-1.5 text-xs bg-white outline-none focus:border-[#8B5A2B]"
                                                />
                                                <span className="text-gray-400 self-center text-xs">até</span>
                                                <input type="time" value={exp.horaFim}
                                                    onChange={e => atualizarExpedienteLocal(index, 'horaFim', e.target.value)}
                                                    className="border border-gray-300 rounded-lg px-2.5 py-1.5 text-xs bg-white outline-none focus:border-[#8B5A2B]"
                                                />
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        <div className="px-6 py-4 bg-white border-t border-gray-100 flex gap-3">
                            <button onClick={() => setModalAcessos(null)} className="flex-1 py-2.5 border border-gray-300 text-gray-700 font-semibold rounded-xl hover:bg-gray-50 text-sm transition-colors">Cancelar</button>
                            <button onClick={handleSalvarGerenciamento} disabled={loadingAcao} className="flex-1 py-2.5 bg-[#5C4033] text-white font-semibold rounded-xl hover:bg-[#3e2b22] disabled:opacity-60 text-sm transition-colors">
                                {loadingAcao ? 'A salvar...' : 'Salvar Perfil'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ── MODAL: NOVO PROFISSIONAL ── */}
            {isModalOpen && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 backdrop-blur-sm">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
                        <div className="px-6 py-5 border-b border-gray-100 flex items-center justify-between">
                            <div>
                                <h2 className="font-bold text-gray-800">Cadastrar Profissional</h2>
                                <p className="text-xs text-gray-500 mt-0.5">A senha temporária será Mudar@123</p>
                            </div>
                            <button onClick={() => { setIsModalOpen(false); reset() }} className="text-gray-400 hover:text-gray-700 p-1 rounded-lg hover:bg-gray-100">
                                <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M18 6 6 18M6 6l12 12" /></svg>
                            </button>
                        </div>

                        <form onSubmit={handleSubmit(onSubmitCadastro)} className="p-6 space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="col-span-2">
                                    <Campo label="Nome Completo" erro={errors.nome?.message} required>
                                        <input
                                            {...register('nome')}
                                            type="text"
                                            placeholder="Ex: Ana Silva"
                                            disabled={isSubmitting}
                                            className={`w-full border rounded-lg px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-[#8B5A2B]/20 focus:border-[#8B5A2B] transition-all ${errors.nome ? 'border-red-400 bg-red-50' : 'border-gray-300'}`}
                                        />
                                    </Campo>
                                </div>
                                <div className="col-span-2">
                                    <Campo label="E-mail de Login" erro={errors.email?.message} required>
                                        <input
                                            {...register('email')}
                                            type="email"
                                            placeholder="profissional@email.com"
                                            disabled={isSubmitting}
                                            className={`w-full border rounded-lg px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-[#8B5A2B]/20 focus:border-[#8B5A2B] transition-all ${errors.email ? 'border-red-400 bg-red-50' : 'border-gray-300'}`}
                                        />
                                    </Campo>
                                </div>
                                <Campo label="CPF" erro={errors.cpf?.message}>
                                    <input
                                        {...register('cpf')}
                                        type="text"
                                        placeholder="000.000.000-00"
                                        disabled={isSubmitting}
                                        className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-[#8B5A2B]/20 focus:border-[#8B5A2B] transition-all"
                                    />
                                </Campo>
                                <Campo label="Especialidade">
                                    <input
                                        {...register('especialidade')}
                                        type="text"
                                        placeholder="Ex: Colorimetria"
                                        disabled={isSubmitting}
                                        className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-[#8B5A2B]/20 focus:border-[#8B5A2B] transition-all"
                                    />
                                </Campo>
                            </div>

                            <div className="flex gap-3 pt-2 border-t border-gray-100">
                                <button type="button" onClick={() => { setIsModalOpen(false); reset() }} disabled={isSubmitting}
                                    className="flex-1 py-2.5 border border-gray-300 text-gray-700 font-semibold rounded-xl hover:bg-gray-50 text-sm transition-colors">
                                    Cancelar
                                </button>
                                <button type="submit" disabled={isSubmitting}
                                    className="flex-1 py-2.5 bg-[#5C4033] text-white font-semibold rounded-xl hover:bg-[#3e2b22] disabled:opacity-60 text-sm transition-colors">
                                    {isSubmitting ? 'A registar...' : 'Salvar Cadastro'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* ── MODAL: PORTFÓLIO DE SERVIÇOS ── */}
            {modalServicos && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 backdrop-blur-sm">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
                        <div className="px-6 py-5 border-b border-gray-100 flex items-center justify-between">
                            <div>
                                <h2 className="font-bold text-gray-800">Serviços Habilitados</h2>
                                <p className="text-xs text-gray-500 mt-0.5">Portfólio de <strong className="text-gray-700">{modalServicos.nome}</strong></p>
                            </div>
                            <button onClick={() => setModalServicos(null)} className="text-gray-400 hover:text-gray-700 p-1 rounded-lg hover:bg-gray-100">
                                <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M18 6 6 18M6 6l12 12" /></svg>
                            </button>
                        </div>

                        <div className="p-6">
                            <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                                {servicosDisponiveis.length === 0 ? (
                                    <p className="text-sm text-gray-400 text-center py-6">Nenhum serviço cadastrado.</p>
                                ) : servicosDisponiveis.map(servico => (
                                    <label key={servico.id} className="flex items-center gap-3 p-3 bg-gray-50 border border-gray-200 rounded-xl cursor-pointer hover:bg-white hover:border-gray-300 transition-colors">
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
                                            className="w-4 h-4 accent-[#8B5A2B] rounded"
                                        />
                                        <span className="text-sm font-medium text-gray-700">{servico.nome}</span>
                                    </label>
                                ))}
                            </div>

                            <div className="flex gap-3 mt-5 pt-4 border-t border-gray-100">
                                <button onClick={() => setModalServicos(null)} disabled={loadingAcao}
                                    className="flex-1 py-2.5 border border-gray-300 text-gray-700 font-semibold rounded-xl hover:bg-gray-50 text-sm transition-colors">
                                    Cancelar
                                </button>
                                <button onClick={handleSalvarServicosExistente} disabled={loadingAcao}
                                    className="flex-1 py-2.5 bg-[#8B5A2B] text-white font-semibold rounded-xl hover:bg-[#704620] disabled:opacity-60 text-sm transition-colors">
                                    {loadingAcao ? 'A salvar...' : 'Atualizar Portfólio'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
