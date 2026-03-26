'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
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
    const colors = ['bg-amber-100 text-amber-700', 'bg-orange-100 text-orange-700', 'bg-stone-100 text-stone-700', 'bg-yellow-100 text-yellow-700']
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
        <div className="min-h-screen bg-stone-50 font-sans">

            {/* ── TOPO ── */}
            <div className="bg-white border-b border-stone-200 px-6 py-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-stone-800 tracking-tight">Torre de Controlo</h1>
                    <p className="text-sm text-stone-500 mt-0.5">Gestão de equipa, permissões e escalas de trabalho</p>
                </div>
                <button
                    onClick={() => { setCredenciaisNovo(null); setIsModalOpen(true) }}
                    className="inline-flex items-center gap-2 bg-[#8B5A2B] hover:bg-[#704620] text-white px-5 py-2.5 rounded-lg font-semibold text-sm transition-colors shadow-sm"
                >
                    <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path d="M12 5v14M5 12h14" /></svg>
                    Novo Profissional
                </button>
            </div>

            {/* ── NAVEGAÇÃO ── */}
            <nav className="bg-white border-b border-stone-200 px-6 py-2.5 overflow-x-auto">
                <div className="flex gap-1 min-w-max">
                    {[
                        { href: '/admin/dashboard', label: 'Equipa', ativo: true },
                        { href: '/admin/financeiro', label: 'Financeiro' },
                        { href: '/admin/estoque', label: 'Estoque' },
                        { href: '/admin/servicos', label: 'Serviços' },
                        { href: '/admin/agendamentos', label: 'Agendamentos' },
                        { href: '/admin/clientes', label: 'Clientes' },
                        { href: '/admin/avaliacoes', label: 'Avaliações' },
                    ].map(({ href, label, ativo }) => (
                        <Link key={href} href={href}
                            className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors whitespace-nowrap ${ativo
                                ? 'bg-[#5C4033] text-white'
                                : 'text-stone-600 hover:bg-stone-100'}`}>
                            {label}
                        </Link>
                    ))}
                </div>
            </nav>

            <div className="p-6 space-y-6 max-w-7xl mx-auto">

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
                                <span className="font-mono text-sm font-bold text-stone-800">{credenciaisNovo.email}</span>
                            </div>
                            <div className="bg-white border border-amber-200 rounded-lg px-4 py-2.5">
                                <span className="text-[10px] text-amber-600 uppercase font-bold block mb-0.5">Senha Temporária</span>
                                <span className="font-mono text-sm font-bold text-stone-800">{credenciaisNovo.senhaTemp}</span>
                            </div>
                        </div>
                    </div>
                )}

                {/* ── MÉTRICAS ── */}
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                    {[
                        { label: 'Total da Equipa', valor: equipa.length, cor: 'border-stone-300', textCor: 'text-stone-800' },
                        { label: 'Ativos', valor: totalAtivos, cor: 'border-emerald-400', textCor: 'text-emerald-700' },
                        { label: 'Inativos', valor: totalInativos, cor: 'border-red-300', textCor: 'text-red-600' },
                    ].map(({ label, valor, cor, textCor }) => (
                        <div key={label} className={`bg-white border-l-4 ${cor} rounded-xl px-5 py-4 shadow-sm`}>
                            <p className="text-xs font-semibold text-stone-500 uppercase tracking-wide">{label}</p>
                            <p className={`text-3xl font-bold mt-1 ${textCor}`}>{valor}</p>
                        </div>
                    ))}
                </div>

                {/* ── PESQUISA ── */}
                <div className="relative">
                    <svg className="absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" /></svg>
                    <input
                        type="text"
                        placeholder="Pesquisar por nome ou e-mail..."
                        value={busca}
                        onChange={e => setBusca(e.target.value)}
                        className="w-full pl-10 pr-4 py-2.5 bg-white border border-stone-300 rounded-xl text-sm outline-none focus:ring-2 focus:ring-[#8B5A2B]/20 focus:border-[#8B5A2B] transition-all"
                    />
                </div>

                {/* ── TABELA DE EQUIPA ── */}
                <div className="bg-white rounded-xl shadow-sm border border-stone-200 overflow-hidden">
                    <div className="px-5 py-4 border-b border-stone-100 flex items-center justify-between">
                        <h2 className="font-bold text-stone-800">Profissionais ({equipaFiltrada.length})</h2>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="bg-stone-50 border-b border-stone-200">
                                    <th className="px-5 py-3 text-left font-semibold text-stone-600 uppercase text-xs tracking-wider">Profissional</th>
                                    <th className="px-5 py-3 text-left font-semibold text-stone-600 uppercase text-xs tracking-wider">Especialidade</th>
                                    <th className="px-5 py-3 text-center font-semibold text-stone-600 uppercase text-xs tracking-wider">Status</th>
                                    <th className="px-5 py-3 text-right font-semibold text-stone-600 uppercase text-xs tracking-wider">Ações</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-stone-100">
                                {equipaFiltrada.length === 0 ? (
                                    <tr>
                                        <td colSpan={4} className="px-5 py-12 text-center text-stone-400 text-sm">
                                            {busca ? 'Nenhum profissional encontrado para a pesquisa.' : 'Nenhum profissional cadastrado.'}
                                        </td>
                                    </tr>
                                ) : (
                                    equipaFiltrada.map(prof => (
                                        <tr key={prof.id} className="hover:bg-stone-50 transition-colors">
                                            <td className="px-5 py-3.5">
                                                <div className="flex items-center gap-3">
                                                    <Avatar nome={prof.nome} />
                                                    <div>
                                                        <p className="font-semibold text-stone-800 leading-tight">{prof.nome}</p>
                                                        <p className="text-xs text-stone-400 mt-0.5">{prof.email}</p>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-5 py-3.5 text-stone-500 text-sm">{prof.especialidade || '—'}</td>
                                            <td className="px-5 py-3.5 text-center">
                                                <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-bold ${prof.ativo
                                                    ? 'bg-emerald-100 text-emerald-700'
                                                    : 'bg-red-100 text-red-600'}`}>
                                                    {prof.ativo ? 'Ativo' : 'Inativo'}
                                                </span>
                                            </td>
                                            <td className="px-5 py-3.5">
                                                <div className="flex justify-end gap-2">
                                                    <button
                                                        onClick={() => setModalServicos({ id: prof.id, nome: prof.nome, servicosIds: prof.servicos.map(s => s.id) })}
                                                        className="px-3 py-1.5 text-xs font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors"
                                                    >
                                                        Portfólio
                                                    </button>
                                                    <button
                                                        onClick={() => setModalAcessos({ ...prof })}
                                                        className="px-3 py-1.5 text-xs font-semibold text-stone-700 bg-stone-100 hover:bg-stone-200 rounded-lg transition-colors"
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
                        <div className="px-6 py-5 border-b border-stone-100 flex items-center gap-3">
                            <Avatar nome={modalAcessos.nome} />
                            <div className="flex-1 min-w-0">
                                <h2 className="font-bold text-stone-800 truncate">{modalAcessos.nome}</h2>
                                <p className="text-xs text-stone-500">Editar permissões e escala de trabalho</p>
                            </div>
                            <button onClick={() => setModalAcessos(null)} className="text-stone-400 hover:text-stone-700 p-1 rounded-lg hover:bg-stone-100 transition-colors">
                                <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M18 6 6 18M6 6l12 12" /></svg>
                            </button>
                        </div>

                        <div className="flex border-b border-stone-200 px-6">
                            {(['permissoes', 'escala'] as const).map(aba => (
                                <button key={aba} onClick={() => setAbaAtiva(aba)}
                                    className={`py-3 px-1 mr-5 text-sm font-semibold border-b-2 transition-colors ${abaAtiva === aba
                                        ? 'border-[#8B5A2B] text-[#8B5A2B]'
                                        : 'border-transparent text-stone-400 hover:text-stone-600'}`}>
                                    {aba === 'permissoes' ? 'Permissões' : 'Escala de Trabalho'}
                                </button>
                            ))}
                        </div>

                        <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-stone-50/50">
                            {abaAtiva === 'permissoes' && (
                                <div className="space-y-5">
                                    <Campo label="Comissão (%)">
                                        <input
                                            type="number" min={0} max={100}
                                            value={modalAcessos.comissao}
                                            onChange={e => setModalAcessos({ ...modalAcessos, comissao: Number(e.target.value) })}
                                            className="w-full border border-stone-300 rounded-lg px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-[#8B5A2B]/20 focus:border-[#8B5A2B] bg-white"
                                        />
                                    </Campo>
                                    <div className="space-y-2">
                                        {permissoesSistema.map(({ key, label, desc }) => (
                                            <label key={key} className="flex items-center gap-3 p-3.5 bg-white border border-stone-200 rounded-xl cursor-pointer hover:border-stone-300 transition-colors">
                                                <input
                                                    type="checkbox"
                                                    checked={modalAcessos[key]}
                                                    onChange={e => setModalAcessos({ ...modalAcessos, [key]: e.target.checked })}
                                                    className="w-4 h-4 accent-[#8B5A2B] rounded"
                                                />
                                                <div>
                                                    <p className="text-sm font-semibold text-stone-800">{label}</p>
                                                    <p className="text-xs text-stone-400 mt-0.5">{desc}</p>
                                                </div>
                                            </label>
                                        ))}
                                    </div>
                                </div>
                            )}
                            {abaAtiva === 'escala' && (
                                <div className="space-y-2">
                                    {modalAcessos.expedientes.map((exp, index) => (
                                        <div key={exp.diaSemana} className={`flex items-center gap-3 p-3.5 rounded-xl border ${exp.ativo ? 'bg-amber-50/70 border-amber-200' : 'bg-white border-stone-200'}`}>
                                            <label className="flex items-center gap-2 min-w-[110px] cursor-pointer">
                                                <input
                                                    type="checkbox" checked={exp.ativo}
                                                    onChange={e => atualizarExpedienteLocal(index, 'ativo', e.target.checked)}
                                                    className="w-4 h-4 accent-[#8B5A2B] rounded"
                                                />
                                                <span className="text-xs font-bold text-stone-700 uppercase tracking-wide">{DIAS_SEMANA[exp.diaSemana]}</span>
                                            </label>
                                            <div className={`flex gap-2 flex-1 justify-end ${exp.ativo ? '' : 'opacity-30 pointer-events-none'}`}>
                                                <input type="time" value={exp.horaInicio}
                                                    onChange={e => atualizarExpedienteLocal(index, 'horaInicio', e.target.value)}
                                                    className="border border-stone-300 rounded-lg px-2.5 py-1.5 text-xs bg-white outline-none focus:border-[#8B5A2B]"
                                                />
                                                <span className="text-stone-400 self-center text-xs">até</span>
                                                <input type="time" value={exp.horaFim}
                                                    onChange={e => atualizarExpedienteLocal(index, 'horaFim', e.target.value)}
                                                    className="border border-stone-300 rounded-lg px-2.5 py-1.5 text-xs bg-white outline-none focus:border-[#8B5A2B]"
                                                />
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        <div className="px-6 py-4 bg-white border-t border-stone-100 flex gap-3">
                            <button onClick={() => setModalAcessos(null)} className="flex-1 py-2.5 border border-stone-300 text-stone-700 font-semibold rounded-xl hover:bg-stone-50 text-sm transition-colors">Cancelar</button>
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
                        <div className="px-6 py-5 border-b border-stone-100 flex items-center justify-between">
                            <div>
                                <h2 className="font-bold text-stone-800">Cadastrar Profissional</h2>
                                <p className="text-xs text-stone-500 mt-0.5">A senha temporária será Mudar@123</p>
                            </div>
                            <button onClick={() => { setIsModalOpen(false); reset() }} className="text-stone-400 hover:text-stone-700 p-1 rounded-lg hover:bg-stone-100">
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
                                            className={`w-full border rounded-lg px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-[#8B5A2B]/20 focus:border-[#8B5A2B] transition-all ${errors.nome ? 'border-red-400 bg-red-50' : 'border-stone-300'}`}
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
                                            className={`w-full border rounded-lg px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-[#8B5A2B]/20 focus:border-[#8B5A2B] transition-all ${errors.email ? 'border-red-400 bg-red-50' : 'border-stone-300'}`}
                                        />
                                    </Campo>
                                </div>
                                <Campo label="CPF" erro={errors.cpf?.message}>
                                    <input
                                        {...register('cpf')}
                                        type="text"
                                        placeholder="000.000.000-00"
                                        disabled={isSubmitting}
                                        className="w-full border border-stone-300 rounded-lg px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-[#8B5A2B]/20 focus:border-[#8B5A2B] transition-all"
                                    />
                                </Campo>
                                <Campo label="Especialidade">
                                    <input
                                        {...register('especialidade')}
                                        type="text"
                                        placeholder="Ex: Colorimetria"
                                        disabled={isSubmitting}
                                        className="w-full border border-stone-300 rounded-lg px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-[#8B5A2B]/20 focus:border-[#8B5A2B] transition-all"
                                    />
                                </Campo>
                            </div>

                            <div className="flex gap-3 pt-2 border-t border-stone-100">
                                <button type="button" onClick={() => { setIsModalOpen(false); reset() }} disabled={isSubmitting}
                                    className="flex-1 py-2.5 border border-stone-300 text-stone-700 font-semibold rounded-xl hover:bg-stone-50 text-sm transition-colors">
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
                        <div className="px-6 py-5 border-b border-stone-100 flex items-center justify-between">
                            <div>
                                <h2 className="font-bold text-stone-800">Serviços Habilitados</h2>
                                <p className="text-xs text-stone-500 mt-0.5">Portfólio de <strong className="text-stone-700">{modalServicos.nome}</strong></p>
                            </div>
                            <button onClick={() => setModalServicos(null)} className="text-stone-400 hover:text-stone-700 p-1 rounded-lg hover:bg-stone-100">
                                <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M18 6 6 18M6 6l12 12" /></svg>
                            </button>
                        </div>

                        <div className="p-6">
                            <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                                {servicosDisponiveis.length === 0 ? (
                                    <p className="text-sm text-stone-400 text-center py-6">Nenhum serviço cadastrado.</p>
                                ) : servicosDisponiveis.map(servico => (
                                    <label key={servico.id} className="flex items-center gap-3 p-3 bg-stone-50 border border-stone-200 rounded-xl cursor-pointer hover:bg-white hover:border-stone-300 transition-colors">
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
                                        <span className="text-sm font-medium text-stone-700">{servico.nome}</span>
                                    </label>
                                ))}
                            </div>

                            <div className="flex gap-3 mt-5 pt-4 border-t border-stone-100">
                                <button onClick={() => setModalServicos(null)} disabled={loadingAcao}
                                    className="flex-1 py-2.5 border border-stone-300 text-stone-700 font-semibold rounded-xl hover:bg-stone-50 text-sm transition-colors">
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
