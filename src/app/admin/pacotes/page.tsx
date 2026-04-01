'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { toast } from 'sonner'
import { listarPacotes, criarPacote, editarPacote, togglePacoteAtivo } from '@/app/actions/pacote'
import { listarServicosPublicos, type ServicoPublicoItem } from '@/app/actions/servico'
import AdminHeader from '@/components/admin/AdminHeader'
import { Button } from '@/components/ui/button'
import type { PacoteComServicos } from '@/types/domain'
import {
    Plus,
    Edit2,
    ToggleLeft,
    ToggleRight,
    Package,
    Loader2,
    X,
    Tag,
    ChevronDown,
    ChevronUp,
    Search,
    Percent,
} from 'lucide-react'

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmt(valor: number): string {
    return valor.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function calcDesconto(base: number, final: number): number {
    if (base <= 0) return 0
    return Math.max(0, ((base - final) / base) * 100)
}

// ── Tipos do Formulário ───────────────────────────────────────────────────────

type FormPacote = {
    nome: string
    descricao: string
    valorBase: string
    valorFinal: string
    servicosSelecionados: { servicoId: string; quantidade: number }[]
}

const FORM_VAZIO: FormPacote = {
    nome: '',
    descricao: '',
    valorBase: '',
    valorFinal: '',
    servicosSelecionados: [],
}

// ── Sub-componente: Card de Pacote ────────────────────────────────────────────

function PacoteCard({
    pacote,
    onEditar,
    onToggle,
}: {
    pacote: PacoteComServicos
    onEditar: (p: PacoteComServicos) => void
    onToggle: (id: string) => void
}) {
    const [expandido, setExpandido] = useState(false)

    return (
        <div className={`bg-white rounded-2xl border shadow-sm transition-all ${pacote.ativo ? 'border-border' : 'border-gray-200 opacity-60'}`}>
            {/* Cabeçalho do Card */}
            <div className="p-5">
                <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3 min-w-0">
                        <div className={`p-2.5 rounded-xl shrink-0 ${pacote.ativo ? 'bg-primary/10 text-primary' : 'bg-gray-100 text-gray-400'}`}>
                            <Package className="w-5 h-5" />
                        </div>
                        <div className="min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                                <h3 className="font-bold text-foreground text-base leading-tight">{pacote.nome}</h3>
                                {!pacote.ativo && (
                                    <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-gray-100 text-gray-500 uppercase tracking-wider">Inativo</span>
                                )}
                                {pacote.desconto >= 1 && (
                                    <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-green-100 text-green-700">
                                        -{pacote.desconto.toFixed(0)}% OFF
                                    </span>
                                )}
                            </div>
                            {pacote.descricao && (
                                <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{pacote.descricao}</p>
                            )}
                        </div>
                    </div>

                    {/* Preços */}
                    <div className="text-right shrink-0">
                        {pacote.valorBase > pacote.valorFinal && (
                            <p className="text-xs text-muted-foreground line-through">R$ {fmt(pacote.valorBase)}</p>
                        )}
                        <p className="text-xl font-black text-primary">R$ {fmt(pacote.valorFinal)}</p>
                        <p className="text-[10px] text-muted-foreground uppercase tracking-wider mt-0.5">
                            {(pacote._count?.vendas ?? 0)} {(pacote._count?.vendas ?? 0) === 1 ? 'venda' : 'vendas'}
                        </p>
                    </div>
                </div>

                {/* Serviços resumidos */}
                <div className="mt-3 flex flex-wrap gap-1.5">
                    {pacote.servicos.slice(0, expandido ? undefined : 3).map(item => (
                        <span key={item.id} className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-muted text-foreground">
                            <Tag className="w-3 h-3 text-primary" />
                            {item.quantidade > 1 && <span className="text-primary font-bold">{item.quantidade}x</span>}
                            {item.servico.nome}
                        </span>
                    ))}
                    {!expandido && pacote.servicos.length > 3 && (
                        <button type="button" onClick={() => setExpandido(true)} className="text-xs text-primary font-bold hover:underline flex items-center gap-1">
                            +{pacote.servicos.length - 3} mais <ChevronDown className="w-3 h-3" />
                        </button>
                    )}
                    {expandido && pacote.servicos.length > 3 && (
                        <button type="button" onClick={() => setExpandido(false)} className="text-xs text-primary font-bold hover:underline flex items-center gap-1">
                            Ver menos <ChevronUp className="w-3 h-3" />
                        </button>
                    )}
                </div>
            </div>

            {/* Rodapé com Ações */}
            <div className="px-5 py-3 border-t border-border/50 bg-muted/20 rounded-b-2xl flex items-center justify-between gap-2">
                <button
                    type="button"
                    onClick={() => onToggle(pacote.id)}
                    className={`flex items-center gap-1.5 text-xs font-semibold transition-colors ${
                        pacote.ativo
                            ? 'text-amber-600 hover:text-amber-700'
                            : 'text-green-600 hover:text-green-700'
                    }`}
                >
                    {pacote.ativo
                        ? <><ToggleRight className="w-4 h-4" /> Desativar</>
                        : <><ToggleLeft className="w-4 h-4" /> Ativar</>
                    }
                </button>
                <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onEditar(pacote)}
                    className="h-8 text-xs font-semibold"
                >
                    <Edit2 className="w-3.5 h-3.5 mr-1.5" /> Editar
                </Button>
            </div>
        </div>
    )
}

// ── Sub-componente: Multi-select de Serviços ──────────────────────────────────

function SeletorServicos({
    servicos,
    selecionados,
    onChange,
}: {
    servicos: ServicoPublicoItem[]
    selecionados: { servicoId: string; quantidade: number }[]
    onChange: (s: { servicoId: string; quantidade: number }[]) => void
}) {
    const [busca, setBusca] = useState('')

    const servicosFiltrados = servicos.filter(s =>
        s.nome.toLowerCase().includes(busca.toLowerCase())
    )

    const toggleServico = (servicoId: string) => {
        const jaExiste = selecionados.some(s => s.servicoId === servicoId)
        if (jaExiste) {
            onChange(selecionados.filter(s => s.servicoId !== servicoId))
        } else {
            onChange([...selecionados, { servicoId, quantidade: 1 }])
        }
    }

    const atualizarQuantidade = (servicoId: string, quantidade: number) => {
        if (quantidade < 1) return
        onChange(selecionados.map(s => s.servicoId === servicoId ? { ...s, quantidade } : s))
    }

    return (
        <div className="space-y-2">
            {/* Busca de serviços */}
            <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                <input
                    type="text"
                    placeholder="Buscar serviço..."
                    value={busca}
                    onChange={e => setBusca(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 text-sm border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                />
            </div>

            {/* Lista de serviços disponíveis */}
            <div className="border border-border rounded-xl overflow-hidden max-h-52 overflow-y-auto">
                {servicosFiltrados.length === 0 ? (
                    <p className="text-xs text-center text-muted-foreground py-4">Nenhum serviço encontrado.</p>
                ) : servicosFiltrados.map(servico => {
                    const itemSelecionado = selecionados.find(s => s.servicoId === servico.id)
                    const marcado = !!itemSelecionado

                    return (
                        <div
                            key={servico.id}
                            className={`flex items-center gap-3 px-3 py-2.5 border-b border-border/50 last:border-0 transition-colors ${marcado ? 'bg-primary/5' : 'hover:bg-muted/40'}`}
                        >
                            <input
                                type="checkbox"
                                id={`svc-${servico.id}`}
                                checked={marcado}
                                onChange={() => toggleServico(servico.id)}
                                className="w-4 h-4 accent-primary cursor-pointer shrink-0"
                            />
                            <label htmlFor={`svc-${servico.id}`} className="flex-1 min-w-0 cursor-pointer">
                                <p className="text-sm font-medium text-foreground truncate">{servico.nome}</p>
                                {servico.preco != null && (
                                    <p className="text-xs text-muted-foreground">R$ {fmt(servico.preco)}</p>
                                )}
                            </label>

                            {/* Quantidade — exibida apenas se selecionado */}
                            {marcado && (
                                <div className="flex items-center gap-1.5 shrink-0">
                                    <button type="button" onClick={() => atualizarQuantidade(servico.id, (itemSelecionado?.quantidade ?? 1) - 1)} className="w-6 h-6 rounded-full bg-muted hover:bg-muted/80 text-foreground font-bold text-sm flex items-center justify-center leading-none transition-colors">−</button>
                                    <span className="text-sm font-bold w-5 text-center">{itemSelecionado?.quantidade}</span>
                                    <button type="button" onClick={() => atualizarQuantidade(servico.id, (itemSelecionado?.quantidade ?? 1) + 1)} className="w-6 h-6 rounded-full bg-muted hover:bg-muted/80 text-foreground font-bold text-sm flex items-center justify-center leading-none transition-colors">+</button>
                                </div>
                            )}
                        </div>
                    )
                })}
            </div>

            {selecionados.length > 0 && (
                <p className="text-xs text-primary font-semibold">{selecionados.length} serviço(s) selecionado(s)</p>
            )}
        </div>
    )
}

// ── Página Principal ──────────────────────────────────────────────────────────

export default function GestaoPacksAdminPage() {
    const [pacotes, setPacotes]       = useState<PacoteComServicos[]>([])
    const [servicos, setServicos]     = useState<ServicoPublicoItem[]>([])
    const [loading, setLoading]       = useState(true)
    const [busca, setBusca]           = useState('')
    const [apenasAtivos, setApenasAtivos] = useState(false)

    // Modal de formulário
    const [modalOpen, setModalOpen]           = useState(false)
    const [editandoPacote, setEditandoPacote] = useState<PacoteComServicos | null>(null)
    const [form, setForm]                     = useState<FormPacote>(FORM_VAZIO)
    const [saving, setSaving]                 = useState(false)
    const [erroForm, setErroForm]             = useState('')

    // Desconto calculado em tempo real
    const descontoCalc = useMemo(() => {
        const base  = parseFloat(form.valorBase)
        const final = parseFloat(form.valorFinal)
        if (isNaN(base) || isNaN(final) || base <= 0) return null
        return calcDesconto(base, final)
    }, [form.valorBase, form.valorFinal])

    // ── Carregamento ──────────────────────────────────────────────────────────

    const carregarPacotes = useCallback(async () => {
        setLoading(true)
        try {
            const [resPacotes, resServicos] = await Promise.all([
                listarPacotes(),
                listarServicosPublicos(),
            ])
            if (resPacotes.sucesso)  setPacotes(resPacotes.data.pacotes)
            if (resServicos.sucesso) setServicos(resServicos.data.servicos)
        } catch (error) {
            console.error('[Pacotes] Erro ao carregar:', error)
        } finally {
            setLoading(false)
        }
    }, [])

    useEffect(() => { void carregarPacotes() }, [carregarPacotes])

    // ── Helpers do Formulário ─────────────────────────────────────────────────

    const abrirNovoPacote = () => {
        setEditandoPacote(null)
        setForm(FORM_VAZIO)
        setErroForm('')
        setModalOpen(true)
    }

    const abrirEditarPacote = (pacote: PacoteComServicos) => {
        setEditandoPacote(pacote)
        setForm({
            nome:        pacote.nome,
            descricao:   pacote.descricao ?? '',
            valorBase:   pacote.valorBase.toFixed(2),
            valorFinal:  pacote.valorFinal.toFixed(2),
            servicosSelecionados: pacote.servicos.map(s => ({
                servicoId:  s.servicoId,
                quantidade: s.quantidade,
            })),
        })
        setErroForm('')
        setModalOpen(true)
    }

    const handleSalvar = async (e: React.FormEvent) => {
        e.preventDefault()
        setErroForm('')

        const valorBase  = parseFloat(form.valorBase)
        const valorFinal = parseFloat(form.valorFinal)

        if (!form.nome.trim())              { setErroForm('Informe o nome do pacote.'); return }
        if (isNaN(valorBase) || valorBase <= 0)  { setErroForm('Informe um valor base válido.'); return }
        if (isNaN(valorFinal) || valorFinal < 0) { setErroForm('Informe um valor final válido.'); return }
        if (valorFinal > valorBase + 0.001) { setErroForm('O valor final não pode ser maior que o valor base.'); return }
        if (form.servicosSelecionados.length === 0) { setErroForm('Selecione pelo menos um serviço.'); return }

        setSaving(true)
        try {
            const payload = {
                nome: form.nome.trim(),
                descricao: form.descricao.trim() || null,
                valorBase,
                valorFinal,
                servicos: form.servicosSelecionados,
            }

            const res = editandoPacote
                ? await editarPacote(editandoPacote.id, payload)
                : await criarPacote(payload)

            if (!res.sucesso) { setErroForm(res.erro); return }

            toast.success(editandoPacote ? 'Pacote atualizado!' : 'Pacote criado com sucesso!')
            setModalOpen(false)
            void carregarPacotes()
        } catch {
            setErroForm('Falha técnica ao salvar o pacote.')
        } finally {
            setSaving(false)
        }
    }

    const handleToggleAtivo = async (id: string) => {
        const pacote = pacotes.find(p => p.id === id)
        const acao = pacote?.ativo ? 'desativar' : 'ativar'
        if (!confirm(`Deseja ${acao} este pacote?`)) return

        try {
            const res = await togglePacoteAtivo(id)
            if (!res.sucesso) { toast.error(res.erro); return }
            toast.success(`Pacote ${acao === 'ativar' ? 'ativado' : 'desativado'} com sucesso.`)
            void carregarPacotes()
        } catch {
            toast.error('Falha ao alterar o status do pacote.')
        }
    }

    // ── Filtro ────────────────────────────────────────────────────────────────

    const pacotesFiltrados = pacotes.filter(p => {
        if (apenasAtivos && !p.ativo) return false
        const t = busca.toLowerCase()
        return !t || p.nome.toLowerCase().includes(t) || p.descricao?.toLowerCase().includes(t)
    })

    const totaisAtivos   = pacotes.filter(p => p.ativo).length
    const totaisInativos = pacotes.filter(p => !p.ativo).length

    // ── Render ────────────────────────────────────────────────────────────────

    return (
        <div className="min-h-screen bg-background font-sans">
            <AdminHeader
                titulo="Pacotes de Serviços"
                subtitulo="Crie combos com desconto para aumentar o ticket médio e fidelizar clientes."
                abaAtiva="Pacotes"
                botaoAcao={
                    <Button onClick={abrirNovoPacote} className="bg-primary hover:bg-primary/90 text-primary-foreground font-bold shadow-sm">
                        <Plus className="w-4 h-4 mr-2" /> Novo Pacote
                    </Button>
                }
            />

            <div className="max-w-7xl mx-auto px-4 md:px-8 pb-12 space-y-5">

                {/* ── Estatísticas + Filtros ── */}
                <div className="flex flex-col sm:flex-row gap-3">
                    {/* Busca */}
                    <div className="relative flex-1 bg-white rounded-xl shadow-sm border border-border p-1">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground w-4 h-4" />
                        <input
                            type="text"
                            placeholder="Buscar pacote por nome ou descrição..."
                            value={busca}
                            onChange={e => setBusca(e.target.value)}
                            className="w-full pl-11 pr-4 py-3 bg-transparent text-sm outline-none focus:ring-0 text-foreground"
                        />
                    </div>

                    {/* Toggle: Somente ativos */}
                    <button
                        type="button"
                        onClick={() => setApenasAtivos(v => !v)}
                        className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border font-semibold text-sm transition-all shadow-sm shrink-0 ${
                            apenasAtivos
                                ? 'bg-primary text-primary-foreground border-primary'
                                : 'bg-white text-gray-600 border-border hover:border-primary/50'
                        }`}
                    >
                        {apenasAtivos ? <ToggleRight className="w-4 h-4" /> : <ToggleLeft className="w-4 h-4" />}
                        Somente ativos
                        <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-black ${apenasAtivos ? 'bg-white/20' : 'bg-primary/10 text-primary'}`}>
                            {totaisAtivos}
                        </span>
                    </button>
                </div>

                {/* Contadores */}
                <div className="flex gap-4 text-sm text-muted-foreground">
                    <span><strong className="text-foreground">{totaisAtivos}</strong> ativo(s)</span>
                    {totaisInativos > 0 && <span><strong className="text-foreground">{totaisInativos}</strong> inativo(s)</span>}
                </div>

                {/* ── Grid de Pacotes ── */}
                {loading ? (
                    <div className="flex flex-col items-center justify-center py-20 gap-4 text-muted-foreground">
                        <Loader2 className="w-8 h-8 animate-spin text-primary" />
                        <p className="text-sm font-medium">Carregando pacotes...</p>
                    </div>
                ) : pacotesFiltrados.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-20 gap-4 text-center">
                        <div className="p-5 bg-muted rounded-2xl">
                            <Package className="w-10 h-10 text-muted-foreground" />
                        </div>
                        <div>
                            <p className="font-bold text-foreground">Nenhum pacote encontrado</p>
                            <p className="text-sm text-muted-foreground mt-1">
                                {pacotes.length === 0
                                    ? 'Crie o primeiro pacote clicando em "Novo Pacote".'
                                    : 'Tente ajustar os filtros de busca.'
                                }
                            </p>
                        </div>
                        {pacotes.length === 0 && (
                            <Button onClick={abrirNovoPacote} className="mt-2">
                                <Plus className="w-4 h-4 mr-2" /> Criar primeiro pacote
                            </Button>
                        )}
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                        {pacotesFiltrados.map(pacote => (
                            <PacoteCard
                                key={pacote.id}
                                pacote={pacote}
                                onEditar={abrirEditarPacote}
                                onToggle={handleToggleAtivo}
                            />
                        ))}
                    </div>
                )}
            </div>

            {/* ════════════════════════════════════════════════════════════════
                MODAL: CRIAR / EDITAR PACOTE
            ════════════════════════════════════════════════════════════════ */}
            {modalOpen && (
                <div
                    className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4 z-50"
                    onClick={e => { if (e.target === e.currentTarget) setModalOpen(false) }}
                >
                    <div className="bg-card w-full sm:max-w-xl rounded-t-2xl sm:rounded-2xl shadow-2xl border-t-4 border-t-primary max-h-[95vh] flex flex-col">

                        {/* Cabeçalho */}
                        <div className="px-6 pt-6 pb-4 border-b border-border shrink-0 flex items-center justify-between">
                            <div>
                                <h2 className="text-xl font-black text-foreground">
                                    {editandoPacote ? 'Editar Pacote' : 'Novo Pacote'}
                                </h2>
                                <p className="text-sm text-muted-foreground mt-0.5">
                                    {editandoPacote ? `Editando: ${editandoPacote.nome}` : 'Preencha os dados do novo combo de serviços.'}
                                </p>
                            </div>
                            <button onClick={() => setModalOpen(false)} className="p-1.5 rounded-lg hover:bg-muted transition-colors text-muted-foreground shrink-0">
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        {/* Corpo com scroll */}
                        <form onSubmit={handleSalvar} className="overflow-y-auto flex-1 flex flex-col">
                            <div className="p-6 space-y-5 flex-1">

                                {erroForm && (
                                    <div className="flex items-start gap-3 p-3 bg-red-50 border border-red-200 rounded-lg">
                                        <X className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                                        <p className="text-sm text-red-700 font-medium">{erroForm}</p>
                                    </div>
                                )}

                                {/* Nome */}
                                <div>
                                    <label className="block text-sm font-semibold text-foreground mb-1.5">Nome do Pacote *</label>
                                    <input
                                        type="text"
                                        required
                                        placeholder="Ex: Pacote Noiva Completo"
                                        value={form.nome}
                                        onChange={e => setForm({ ...form, nome: e.target.value })}
                                        className="w-full border border-border rounded-xl px-4 py-2.5 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/10 transition-colors"
                                    />
                                </div>

                                {/* Descrição */}
                                <div>
                                    <label className="block text-sm font-semibold text-foreground mb-1.5">
                                        Descrição <span className="text-muted-foreground font-normal">(opcional)</span>
                                    </label>
                                    <textarea
                                        rows={2}
                                        placeholder="Descreva o que está incluído no pacote..."
                                        value={form.descricao}
                                        onChange={e => setForm({ ...form, descricao: e.target.value })}
                                        className="w-full border border-border rounded-xl px-4 py-2.5 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/10 transition-colors resize-none"
                                    />
                                </div>

                                {/* Valores com desconto calculado */}
                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <label className="block text-sm font-semibold text-foreground mb-1.5">Valor Base (R$) *</label>
                                        <input
                                            type="number"
                                            min="0"
                                            step="0.01"
                                            required
                                            placeholder="0,00"
                                            value={form.valorBase}
                                            onChange={e => setForm({ ...form, valorBase: e.target.value })}
                                            className="w-full border border-border rounded-xl px-4 py-2.5 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/10 transition-colors"
                                        />
                                        <p className="text-xs text-muted-foreground mt-1">Soma dos serviços avulsos</p>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-semibold text-foreground mb-1.5">Valor Final (R$) *</label>
                                        <input
                                            type="number"
                                            min="0"
                                            step="0.01"
                                            required
                                            placeholder="0,00"
                                            value={form.valorFinal}
                                            onChange={e => setForm({ ...form, valorFinal: e.target.value })}
                                            className="w-full border border-border rounded-xl px-4 py-2.5 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/10 transition-colors"
                                        />
                                        <p className="text-xs text-muted-foreground mt-1">Preço cobrado do cliente</p>
                                    </div>
                                </div>

                                {/* Indicador de desconto calculado */}
                                {descontoCalc !== null && (
                                    <div className={`flex items-center gap-2 px-4 py-3 rounded-xl border ${
                                        descontoCalc < 0
                                            ? 'bg-red-50 border-red-200 text-red-700'
                                            : descontoCalc >= 1
                                                ? 'bg-green-50 border-green-200 text-green-700'
                                                : 'bg-gray-50 border-gray-200 text-gray-600'
                                    }`}>
                                        <Percent className="w-4 h-4 shrink-0" />
                                        {descontoCalc < 0 ? (
                                            <p className="text-sm font-bold">Valor final maior que o base — impossível.</p>
                                        ) : descontoCalc < 1 ? (
                                            <p className="text-sm font-medium">Sem desconto aplicado.</p>
                                        ) : (
                                            <p className="text-sm font-bold">
                                                Desconto calculado: <strong>{descontoCalc.toFixed(1)}%</strong>
                                                {' '}(economia de R$ {fmt(parseFloat(form.valorBase) - parseFloat(form.valorFinal))})
                                            </p>
                                        )}
                                    </div>
                                )}

                                {/* Seletor de Serviços */}
                                <div>
                                    <label className="block text-sm font-semibold text-foreground mb-1.5">
                                        Serviços Incluídos *{' '}
                                        <span className="text-muted-foreground font-normal">(selecione e defina quantidades)</span>
                                    </label>
                                    <SeletorServicos
                                        servicos={servicos}
                                        selecionados={form.servicosSelecionados}
                                        onChange={selecionados => setForm({ ...form, servicosSelecionados: selecionados })}
                                    />
                                </div>
                            </div>

                            {/* Rodapé fixo */}
                            <div className="px-6 py-4 border-t border-border shrink-0 flex gap-3">
                                <Button type="button" variant="outline" onClick={() => setModalOpen(false)} disabled={saving} className="flex-1">
                                    Cancelar
                                </Button>
                                <Button type="submit" disabled={saving} className="flex-1 bg-primary hover:bg-primary/90 text-primary-foreground font-bold">
                                    {saving
                                        ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Salvando...</>
                                        : editandoPacote ? 'Salvar Alterações' : 'Criar Pacote'
                                    }
                                </Button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    )
}
