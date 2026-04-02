'use client'

import { useState, useEffect, useCallback } from 'react'
import {
    listarProdutosAdmin,
    criarProdutoAdmin,
    baixarEstoqueAbsoluto,
    adicionarEstoqueFrascos,
    excluirProdutoLogico,
} from '@/app/actions/produto'
import type { Produto } from '@/types/domain'
import AdminHeader from '@/components/admin/AdminHeader'
import { MetricCard } from '@/components/admin/metric-card'
import { ProdutoRow, obterStatusEstoque } from '@/components/admin/produto-row'
import { Search, Package, Loader2, X, Boxes, AlertTriangle, CircleDollarSign, Percent } from 'lucide-react'

type FormCriar = {
    nome: string
    descricao: string
    precoCusto: number
    precoVenda: number
    unidadeMedida: string
    tamanhoUnidade: number
    estoqueInicialEmFrascos: number
}

type Mensagem = { texto: string; tipo: 'sucesso' | 'erro' | 'info' }
type ModalEntrada = { produtoId: string; nomeProduto: string; quantidadeFrascos: number; tamanhoUnidade: number; unidadeMedida: string } | null

const FORM_INICIAL: FormCriar = {
    nome: '', descricao: '', precoCusto: 0, precoVenda: 0, unidadeMedida: 'un', tamanhoUnidade: 1, estoqueInicialEmFrascos: 0
}

function margem(produto: Produto): number {
    const custo = produto.precoCusto || 0
    if (custo === 0) return 100
    return ((produto.precoVenda - custo) / custo) * 100
}

export default function PainelEstoquePage() {
    const [produtos, setProdutos] = useState<Produto[]>([])
    const [carregando, setCarregando] = useState(true)
    const [mensagem, setMensagem] = useState<Mensagem | null>(null)
    const [filtro, setFiltro] = useState<'todos' | 'alerta'>('todos')
    const [busca, setBusca] = useState('')

    const [modalCriar, setModalCriar] = useState(false)
    const [formData, setFormData] = useState<FormCriar>(FORM_INICIAL)
    const [criando, setCriando] = useState(false)

    const [modalEntrada, setModalEntrada] = useState<ModalEntrada>(null)
    const [entradando, setEntradando] = useState(false)

    const [loadingId, setLoadingId] = useState<string | null>(null)

    useEffect(() => {
        const init = async () => {
            setCarregando(true)
            const res = await listarProdutosAdmin()
            if (res.sucesso) setProdutos(res.data.produtos as Produto[])
            setCarregando(false)
        }
        init()
    }, [])

    const recarregarDados = useCallback(async () => {
        const res = await listarProdutosAdmin()
        if (res.sucesso) setProdutos(res.data.produtos as Produto[])
    }, [])

    const handleCriar = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault()
        if (criando) return
        setCriando(true)

        const res = await criarProdutoAdmin(formData)
        if (res.sucesso) {
            setMensagem({ texto: `"${formData.nome}" adicionado com sucesso.`, tipo: 'sucesso' })
            setModalCriar(false)
            setFormData(FORM_INICIAL)
            recarregarDados()
        } else {
            setMensagem({ texto: res.erro, tipo: 'erro' })
        }
        setCriando(false)
        setTimeout(() => setMensagem(null), 4000)
    }

    const handleAjusteBaixa = async (id: string, tamanhoUnidade: number) => {
        if (loadingId) return
        setLoadingId(id)
        const res = await baixarEstoqueAbsoluto(id, tamanhoUnidade)
        if (!res.sucesso) {
            setMensagem({ texto: res.erro, tipo: 'erro' })
            setTimeout(() => setMensagem(null), 4000)
        }
        await recarregarDados()
        setLoadingId(null)
    }

    const handleEntrada = async () => {
        if (!modalEntrada || entradando) return
        if (modalEntrada.quantidadeFrascos <= 0) {
            setMensagem({ texto: 'Informe uma quantidade maior que zero.', tipo: 'erro' })
            return
        }

        setEntradando(true)
        const res = await adicionarEstoqueFrascos(modalEntrada.produtoId, modalEntrada.quantidadeFrascos)

        if (res.sucesso) {
            setMensagem({ texto: `Estoque de "${modalEntrada.nomeProduto}" atualizado com sucesso.`, tipo: 'sucesso' })
            setModalEntrada(null)
            recarregarDados()
        } else {
            setMensagem({ texto: res.erro, tipo: 'erro' })
        }
        setEntradando(false)
        setTimeout(() => setMensagem(null), 4000)
    }

    const handleInativar = async (id: string, nome: string) => {
        if (loadingId) return
        const ok = confirm(`Remover "${nome}" do catálogo?\nO produto ficará inativo mas o histórico financeiro será mantido.`)
        if (!ok) return

        setLoadingId(id)
        const res = await excluirProdutoLogico(id)
        if (res.sucesso) {
            setMensagem({ texto: res.data.mensagem, tipo: 'sucesso' })
            recarregarDados()
        } else {
            setMensagem({ texto: res.erro, tipo: 'erro' })
        }
        setLoadingId(null)
        setTimeout(() => setMensagem(null), 4000)
    }

    const produtosFiltrados = produtos.filter(p => {
        const atendeStatus = filtro === 'alerta' ? obterStatusEstoque(p.estoque, p.tamanhoUnidade) !== 'ok' : true
        const atendeBusca = p.nome.toLowerCase().includes(busca.toLowerCase())
        return atendeStatus && atendeBusca
    })

    const alertas = produtos.filter(p => obterStatusEstoque(p.estoque, p.tamanhoUnidade) !== 'ok').length

    const valorTotalEstoque = produtos.reduce((acc, p) => {
        const frascosEmEstoque = Math.floor(p.estoque / p.tamanhoUnidade)
        const custoFrasco = p.precoCusto || 0
        return acc + (custoFrasco * frascosEmEstoque)
    }, 0)

    const margemMedia = produtos.length ? produtos.reduce((acc, p) => acc + margem(p), 0) / produtos.length : 0

    const campo = <K extends keyof FormCriar>(key: K) =>
        (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
            const numKeys: Array<keyof FormCriar> = ['precoCusto', 'precoVenda', 'tamanhoUnidade', 'estoqueInicialEmFrascos']
            const isNum = numKeys.includes(key)
            const val = isNum ? (Number(e.target.value) as FormCriar[K]) : (e.target.value as FormCriar[K])
            setFormData(prev => ({ ...prev, [key]: val }))
        }

    return (
        <div className="min-h-screen bg-background font-sans">
            <AdminHeader
                titulo="Gestão de Estoque"
                subtitulo="Controle de insumos, margens de lucro e portfólio de base."
                abaAtiva="Estoque"
                botaoAcao={
                    <button
                        onClick={() => setModalCriar(true)}
                        className="flex items-center justify-center gap-2 bg-primary text-primary-foreground px-5 py-2.5 rounded-xl font-bold text-sm hover:bg-primary/90 transition-colors shadow-sm active:scale-[0.98]"
                    >
                        <Package className="w-4 h-4" /> Novo Produto
                    </button>
                }
            />

            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6 pb-12 mt-6">

                {mensagem && (
                    <div className={`flex items-center gap-3 p-4 rounded-xl text-sm font-bold shadow-sm border animate-in fade-in ${mensagem.tipo === 'sucesso' ? 'bg-green-50 text-green-800 border-green-200' : 'bg-destructive/10 text-destructive border-destructive/20'}`}>
                        <span>{mensagem.tipo === 'sucesso' ? '✓' : '✕'}</span>
                        {mensagem.texto}
                        <button onClick={() => setMensagem(null)} className="ml-auto opacity-50 hover:opacity-100"><X className="w-4 h-4" /></button>
                    </div>
                )}

                {/* ── MÉTRICAS ── */}
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6 mb-10">
                    <MetricCard
                        label={<span className="flex items-center gap-2"><Boxes className="w-4 h-4 text-blue-500" /> Variedade de Produtos</span>}
                        value={produtos.length.toString()}
                        subText="produtos ativos no catálogo"
                        loading={carregando}
                    />
                    <MetricCard
                        label={<span className="flex items-center gap-2"><AlertTriangle className="w-4 h-4 text-red-500" /> Alertas de Estoque</span>}
                        value={alertas.toString()}
                        subText={alertas === 0 ? 'Tudo em ordem' : 'Itens que precisam de reposição'}
                        variant={alertas > 0 ? "danger" : "default"}
                        loading={carregando}
                    />
                    <MetricCard
                        label={<span className="flex items-center gap-2"><CircleDollarSign className="w-4 h-4 text-green-500" /> Valor Imobilizado</span>}
                        value={`R$ ${valorTotalEstoque.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
                        subText="Custo de todo o estoque atual"
                        loading={carregando}
                    />
                    <MetricCard
                        label={<span className="flex items-center gap-2"><Percent className="w-4 h-4 text-purple-500" /> Margem de Lucro Média</span>}
                        value={`${margemMedia.toFixed(1)}%`}
                        subText="Rentabilidade sobre os produtos"
                        loading={carregando}
                    />
                </div>

                {/* ── PESQUISA E FILTROS ── */}
                <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
                    <div className="relative bg-card rounded-xl shadow-sm border border-border p-1 w-full md:w-96">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground w-4 h-4" />
                        <input
                            type="text"
                            placeholder="Pesquisar produto..."
                            value={busca}
                            onChange={(e) => setBusca(e.target.value)}
                            className="w-full pl-11 pr-4 py-3 bg-transparent text-sm outline-none focus:ring-0 transition-all text-foreground"
                        />
                    </div>
                    <div className="flex gap-2 bg-muted/60 p-1 rounded-full w-full md:w-auto">
                        <button
                            onClick={() => setFiltro('todos')}
                            className={`flex-1 md:flex-none px-6 py-2 text-xs font-bold rounded-full transition-all ${filtro === 'todos' ? 'bg-card text-primary shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
                        >
                            Todos ({produtos.length})
                        </button>
                        <button
                            onClick={() => setFiltro('alerta')}
                            className={`flex-1 md:flex-none px-6 py-2 text-xs font-bold rounded-full transition-all ${filtro === 'alerta' ? 'bg-destructive text-destructive-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
                        >
                            Alertas ({alertas})
                        </button>
                    </div>
                </div>

                {/* ── TABELA / LISTA (Progressive Disclosure) ── */}
                <section className="bg-card rounded-2xl shadow-sm border border-border overflow-hidden">
                    <div className="hidden border-b border-border bg-muted/50 px-4 py-3 sm:flex sm:px-6">
                        <span className="w-10"></span> {/* Espaço do Ícone */}
                        <span className="ml-4 flex-1 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Produto & Detalhes</span>
                        <span className="text-right text-[10px] font-bold uppercase tracking-widest text-muted-foreground w-32 mr-6">Estoque Base</span>
                        <span className="w-5"></span> {/* Chevron */}
                    </div>

                    {carregando ? (
                        <div className="p-12 text-center text-muted-foreground font-bold tracking-wider uppercase text-sm flex flex-col items-center justify-center gap-3">
                            <Loader2 className="w-6 h-6 animate-spin text-primary" />
                            A carregar inventário...
                        </div>
                    ) : produtosFiltrados.length === 0 ? (
                        <div className="p-12 text-center flex flex-col items-center justify-center">
                            <div className="w-16 h-16 bg-muted text-muted-foreground rounded-full flex items-center justify-center mb-4">
                                <Package className="w-8 h-8" />
                            </div>
                            <p className="text-lg font-bold text-foreground">Nenhum produto listado</p>
                            <p className="text-sm text-muted-foreground mt-1">{busca ? 'Tente buscar com outras palavras.' : 'Cadastre seu primeiro produto.'}</p>
                        </div>
                    ) : (
                        <div className="flex flex-col">
                            {produtosFiltrados.map((p) => (
                                <ProdutoRow
                                    key={p.id}
                                    produto={p}
                                    isLoading={loadingId === p.id}
                                    onBaixa={handleAjusteBaixa}
                                    onEntrada={(prod) => setModalEntrada({
                                        produtoId: prod.id, nomeProduto: prod.nome, quantidadeFrascos: 1,
                                        tamanhoUnidade: prod.tamanhoUnidade, unidadeMedida: prod.unidadeMedida
                                    })}
                                    onRemover={handleInativar}
                                />
                            ))}
                        </div>
                    )}
                </section>
            </div>

            {/* ── MODAL: Criar Produto ── */}
            {modalCriar && (
                <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50 backdrop-blur-sm">
                    <div className="bg-card rounded-2xl shadow-2xl w-[95%] sm:w-[90%] md:w-full md:max-w-lg border-t-4 border-t-primary max-h-[85vh] animate-in zoom-in-95 duration-200 overflow-hidden max-h-[95vh] flex flex-col">
                        <div className="px-6 py-5 border-b border-border flex justify-between items-start bg-muted/30">
                            <div>
                                <h2 className="text-xl font-bold text-foreground tracking-tight">Cadastrar Produto</h2>
                                <p className="text-xs text-muted-foreground mt-1">Insira os dados da ficha técnica e financeiro.</p>
                            </div>
                            <button onClick={() => { setModalCriar(false); setFormData(FORM_INICIAL) }} className="p-2 text-muted-foreground hover:bg-muted rounded-full transition-colors">
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <div className="overflow-y-auto p-6">
                            <form id="form-criar" onSubmit={handleCriar} className="space-y-6">
                                <div className="space-y-4">
                                    <div>
                                        <label className="block text-[11px] font-bold text-muted-foreground uppercase tracking-widest mb-2">Nome do Produto *</label>
                                        <input required disabled={criando} type="text" placeholder="Ex: Óleo de Argan Premium" value={formData.nome} onChange={campo('nome')} className="w-full border border-border bg-card rounded-lg px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/20 font-medium text-foreground transition-all" />
                                    </div>
                                    <div>
                                        <label className="block text-[11px] font-bold text-muted-foreground uppercase tracking-widest mb-2">Descrição (Opcional)</label>
                                        <input disabled={criando} type="text" placeholder="Uso interno no salão" value={formData.descricao} onChange={campo('descricao')} className="w-full border border-border bg-card rounded-lg px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/20 font-medium text-foreground transition-all" />
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-[11px] font-bold text-muted-foreground uppercase tracking-widest mb-2">Custo (R$) *</label>
                                        <div className="relative">
                                            <span className="absolute left-3 top-1/2 -translate-y-1/2 font-bold text-muted-foreground text-sm">R$</span>
                                            <input required disabled={criando} type="number" step="0.01" min="0" value={formData.precoCusto} onChange={campo('precoCusto')} className="w-full border border-border bg-card rounded-lg pl-9 pr-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/20 font-bold text-foreground transition-all" />
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-[11px] font-bold text-muted-foreground uppercase tracking-widest mb-2">Venda (R$) *</label>
                                        <div className="relative">
                                            <span className="absolute left-3 top-1/2 -translate-y-1/2 font-bold text-muted-foreground text-sm">R$</span>
                                            <input required disabled={criando} type="number" step="0.01" min="0" value={formData.precoVenda} onChange={campo('precoVenda')} className="w-full border border-border bg-card rounded-lg pl-9 pr-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/20 font-bold text-primary transition-all" />
                                        </div>
                                    </div>
                                </div>

                                <div className="p-4 bg-secondary/30 border border-secondary rounded-xl space-y-4">
                                    <div>
                                        <h4 className="font-bold text-foreground text-sm">Ficha Técnica</h4>
                                        <p className="text-[10px] text-muted-foreground mt-0.5">Como este produto é mensurado?</p>
                                    </div>
                                    <div className="grid grid-cols-3 gap-3">
                                        <div className="col-span-1">
                                            <label className="block text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1.5">Medida</label>
                                            <select value={formData.unidadeMedida} onChange={campo('unidadeMedida')} className="w-full border border-border bg-card rounded-lg px-2 py-2.5 text-sm font-semibold outline-none focus:ring-2 focus:ring-primary/20 transition-colors">
                                                <option value="ml">Volume (ml)</option>
                                                <option value="g">Peso (g)</option>
                                                <option value="un">Inteiro (un)</option>
                                            </select>
                                        </div>
                                        <div className="col-span-2">
                                            <label className="block text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1.5">Tamanho de 1 Frasco</label>
                                            <div className="flex items-center gap-2">
                                                <input required type="number" min="1" value={formData.tamanhoUnidade} onChange={campo('tamanhoUnidade')} className="w-full border border-border bg-card rounded-lg px-3 py-2.5 outline-none focus:ring-2 focus:ring-primary/20 font-bold text-sm" />
                                                <span className="text-xs font-black text-primary w-6">{formData.unidadeMedida}</span>
                                            </div>
                                        </div>
                                        <div className="col-span-3 border-t border-border/50 pt-3">
                                            <label className="block text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-2">Frascos no Estoque Atual</label>
                                            <input required type="number" min="0" value={formData.estoqueInicialEmFrascos} onChange={campo('estoqueInicialEmFrascos')} className="w-full border border-border bg-card rounded-lg px-4 py-2.5 outline-none focus:ring-2 focus:ring-primary/20 font-black text-lg transition-colors" />
                                        </div>
                                    </div>
                                </div>
                            </form>
                        </div>
                        <div className="px-6 py-4 bg-muted/30 border-t border-border flex gap-3">
                            <button type="button" onClick={() => { setModalCriar(false); setFormData(FORM_INICIAL) }} className="flex-1 py-2.5 text-muted-foreground font-bold rounded-xl hover:bg-muted text-sm transition-colors">Cancelar</button>
                            <button type="submit" form="form-criar" disabled={criando} className="flex-1 py-2.5 bg-primary text-primary-foreground font-bold rounded-xl hover:bg-primary/90 disabled:opacity-60 text-sm transition-colors flex justify-center items-center gap-2">
                                {criando ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Salvar Produto'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ── MODAL: Entrada em Lote ── */}
            {modalEntrada && (
                <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50 backdrop-blur-sm">
                    <div className="bg-card rounded-2xl shadow-2xl w-[95%] sm:w-[90%] md:w-full md:max-w-sm border-t-4 border-t-blue-500 max-h-[85vh] overflow-y-auto animate-in zoom-in-95 duration-200">
                        <div className="px-6 py-5 border-b border-border flex items-start justify-between bg-muted/30">
                            <div>
                                <p className="text-[10px] font-bold text-blue-600 uppercase tracking-widest mb-1">Entrada de Mercadoria</p>
                                <h2 className="text-lg font-bold text-foreground tracking-tight">{modalEntrada.nomeProduto}</h2>
                            </div>
                            <button disabled={entradando} onClick={() => setModalEntrada(null)} className="p-2 text-muted-foreground hover:bg-muted rounded-full transition-colors">
                                <X className="w-4 h-4" />
                            </button>
                        </div>

                        <form onSubmit={(e) => { e.preventDefault(); void handleEntrada() }} className="p-6 space-y-6">
                            <div>
                                <label className="block text-sm font-bold text-foreground mb-4 text-center">Quantos frascos chegaram?</label>
                                <div className="flex items-center justify-center gap-3">
                                    <input
                                        required type="number" min="1" step="1" autoFocus
                                        value={modalEntrada.quantidadeFrascos}
                                        onChange={e => setModalEntrada(prev => prev ? { ...prev, quantidadeFrascos: Math.max(1, Number(e.target.value)) } : null)}
                                        className="w-28 border border-border bg-card rounded-2xl px-4 py-3 text-3xl font-black text-center text-primary outline-none focus:ring-4 focus:ring-primary/20 shadow-sm"
                                    />
                                    <span className="font-bold text-muted-foreground text-lg">un.</span>
                                </div>
                            </div>

                            <div className="bg-blue-50/50 border border-blue-100 rounded-xl p-4 text-center">
                                <p className="text-[10px] text-blue-600 font-bold uppercase tracking-widest mb-1.5">Adição Real ao Banco</p>
                                <p className="text-xl font-black text-blue-700">
                                    + {modalEntrada.quantidadeFrascos * modalEntrada.tamanhoUnidade} {modalEntrada.unidadeMedida}
                                </p>
                            </div>

                            <div className="pt-2">
                                <button type="submit" disabled={entradando || modalEntrada.quantidadeFrascos <= 0} className="w-full px-5 py-3.5 text-sm bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 transition-colors shadow-lg shadow-blue-600/20 disabled:opacity-50 flex justify-center items-center gap-2">
                                    {entradando ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Confirmar Entrada'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    )
}

