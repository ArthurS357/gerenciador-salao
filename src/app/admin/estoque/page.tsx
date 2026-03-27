'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import {
    listarProdutosAdmin,
    criarProdutoAdmin,
    baixarEstoqueAbsoluto,
    adicionarEstoqueFrascos,
    excluirProdutoLogico,
} from '@/app/actions/produto'
import type { Produto } from '@/types/domain'

// ── Tipos locais ──────────────────────────────────────────────────────────────

type StatusEstoque = 'esgotado' | 'critico' | 'baixo' | 'ok'

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

// ── Constantes ────────────────────────────────────────────────────────────────

const FORM_INICIAL: FormCriar = {
    nome: '', descricao: '', precoCusto: 0, precoVenda: 0, unidadeMedida: 'un', tamanhoUnidade: 1, estoqueInicialEmFrascos: 0
}

const NAV_LINKS = [
    { href: '/admin/dashboard', label: 'Equipe' },
    { href: '/admin/financeiro', label: 'Financeiro' },
    { href: '/admin/estoque', label: 'Estoque', ativo: true },
    { href: '/admin/servicos', label: 'Serviços' },
    { href: '/admin/agendamentos', label: 'Agendamentos Globais' },
    { href: '/admin/clientes', label: 'Base de Clientes' },
] as const

// ── Utilitários ───────────────────────────────────────────────────────────────

function statusEstoque(produto: Produto): StatusEstoque {
    const minAbsoluto = 2 * produto.tamanhoUnidade

    if (produto.estoque === 0) return 'esgotado'
    if (produto.estoque <= Math.floor(minAbsoluto * 0.5)) return 'critico'
    if (produto.estoque <= minAbsoluto) return 'baixo'
    return 'ok'
}

const STATUS_CONFIG: Record<StatusEstoque, { label: string; badge: string; row: string }> = {
    esgotado: {
        label: 'Esgotado',
        badge: 'bg-red-50 text-red-600 border border-red-100 shadow-sm rounded-full',
        row: 'bg-red-50/20',
    },
    critico: {
        label: 'Crítico',
        badge: 'bg-orange-50 text-orange-600 border border-orange-100 shadow-sm rounded-full',
        row: 'bg-orange-50/20',
    },
    baixo: {
        label: 'Atenção',
        badge: 'bg-amber-50 text-amber-600 border border-amber-100 shadow-sm rounded-full',
        row: 'bg-amber-50/10',
    },
    ok: {
        label: 'Normal',
        badge: 'bg-emerald-50 text-emerald-600 border border-emerald-100 shadow-sm rounded-full',
        row: 'hover:bg-gray-50',
    },
}

function margem(produto: Produto): number {
    const custo = produto.precoCusto || 0
    if (custo === 0) return 100
    return ((produto.precoVenda - custo) / custo) * 100
}

// ── Componente principal ──────────────────────────────────────────────────────

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

    // ── Carregamento ──────────────────────────────────────────────────────────

    // 1. Função para carregamento inicial (dentro do useEffect)
    useEffect(() => {
        const init = async () => {
            setCarregando(true)
            const res = await listarProdutosAdmin()
            if (res.sucesso && res.produtos) {
                setProdutos(res.produtos as Produto[])
            }
            setCarregando(false)
        }
        init()
    }, [])

    // 2. Função memoizada para ser chamada manualmente (botões de ação)
    const recarregarDados = useCallback(async () => {
        // Não settamos 'carregando' true aqui para não perder a UI da tabela em atualizações rápidas
        const res = await listarProdutosAdmin()
        if (res.sucesso && res.produtos) {
            setProdutos(res.produtos as Produto[])
        }
    }, [])

    const formatarEstoqueVisivel = (quantidade: number, unidade: string) => {
        if (unidade === 'ml') {
            if (quantidade >= 1000) return `${(quantidade / 1000).toFixed(1)} L`
            return `${quantidade} ml`
        }
        if (unidade === 'g') {
            if (quantidade >= 1000) return `${(quantidade / 1000).toFixed(2)} kg`
            return `${quantidade} g`
        }
        return `${quantidade} un`
    }

    // ── Criar produto ─────────────────────────────────────────────────────────

    const handleCriar = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault()
        if (criando) return

        setCriando(true)
        setMensagem({ texto: 'A cadastrar produto...', tipo: 'info' })

        const res = await criarProdutoAdmin(formData)

        if (res.sucesso) {
            setMensagem({ texto: `"${formData.nome}" adicionado ao catálogo com sucesso.`, tipo: 'sucesso' })
            setModalCriar(false)
            setFormData(FORM_INICIAL)
            recarregarDados()
        } else {
            setMensagem({ texto: res.erro, tipo: 'erro' })
        }
        setCriando(false)
    }

    // ── Baixa Rápida de Estoque ────────────────────────────────────────────────

    const handleAjusteBaixa = async (id: string, tamanhoUnidade: number) => {
        if (loadingId) return
        setLoadingId(id)

        const res = await baixarEstoqueAbsoluto(id, tamanhoUnidade)

        if (!res.sucesso) setMensagem({ texto: res.erro, tipo: 'erro' })
        await recarregarDados()
        setLoadingId(null)
    }

    // ── Entrada em lote ────────────────────────────────────────────────────────

    const handleEntrada = async () => {
        if (!modalEntrada || entradando) return
        if (modalEntrada.quantidadeFrascos <= 0) {
            setMensagem({ texto: 'Informe uma quantidade maior que zero.', tipo: 'erro' })
            return
        }

        setEntradando(true)
        const res = await adicionarEstoqueFrascos(modalEntrada.produtoId, modalEntrada.quantidadeFrascos)

        if (res.sucesso) {
            const adicionado = formatarEstoqueVisivel(modalEntrada.quantidadeFrascos * modalEntrada.tamanhoUnidade, modalEntrada.unidadeMedida)
            setMensagem({
                texto: `+ ${adicionado} adicionados ao estoque de "${modalEntrada.nomeProduto}".`,
                tipo: 'sucesso',
            })
            setModalEntrada(null)
            recarregarDados()
        } else {
            setMensagem({ texto: res.erro, tipo: 'erro' })
        }
        setEntradando(false)
    }

    // ── Inativar produto ──────────────────────────────────────────────────────

    const handleInativar = async (id: string, nome: string) => {
        if (loadingId) return
        const ok = confirm(
            `Remover "${nome}" do catálogo?\n\nO produto ficará inativo mas o histórico financeiro será mantido. Esta ação pode ser revertida pelo suporte.`
        )
        if (!ok) return

        setLoadingId(id)
        const res = await excluirProdutoLogico(id)

        if (res.sucesso) {
            setMensagem({ texto: res.mensagem, tipo: 'sucesso' })
            recarregarDados()
        } else {
            setMensagem({ texto: res.erro, tipo: 'erro' })
        }
        setLoadingId(null)
    }

    // ── Derivações para UI ────────────────────────────────────────────────────

    const produtosFiltrados = produtos.filter(p => {
        const atendeStatus = filtro === 'alerta' ? statusEstoque(p) !== 'ok' : true
        const atendeBusca = p.nome.toLowerCase().includes(busca.toLowerCase())
        return atendeStatus && atendeBusca
    })

    const alertas = produtos.filter(p => statusEstoque(p) !== 'ok').length

    const valorTotalEstoque = produtos.reduce((acc, p) => {
        const frascosEmEstoque = Math.floor(p.estoque / p.tamanhoUnidade)
        const custoFrasco = p.precoCusto || 0
        return acc + (custoFrasco * frascosEmEstoque)
    }, 0)

    const margemMedia = produtos.length
        ? produtos.reduce((acc, p) => acc + margem(p), 0) / produtos.length
        : 0

    // 3. Correção: Tipagem estrita sem 'any'
    const campo = <K extends keyof FormCriar>(key: K) =>
        (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
            const numKeys: Array<keyof FormCriar> = ['precoCusto', 'precoVenda', 'tamanhoUnidade', 'estoqueInicialEmFrascos']
            // O tipo de 'key' já é 'K', que extende 'keyof FormCriar', então é compatível com 'includes'
            const isNum = numKeys.includes(key)

            const val = isNum
                ? (Number(e.target.value) as FormCriar[K])
                : (e.target.value as FormCriar[K])

            setFormData(prev => ({ ...prev, [key]: val }))
        }

    // ── Render ────────────────────────────────────────────────────────────────

    return (
        <div className="min-h-screen bg-[#fdfbf7] font-sans">
            {/* Topo com navegação */}
            <div className="px-4 md:px-8 pt-8 max-w-7xl mx-auto">
                <header className="mb-8 flex flex-col md:flex-row md:justify-between md:items-end gap-4">
                    <div>
                        <h1 className="text-3xl md:text-4xl font-black text-marrom-medio tracking-tight">Gestão de Estoque</h1>
                        <p className="text-gray-500 mt-2 text-sm md:text-base">Controle de repasses, margens de lucro e portfólio de base.</p>
                    </div>
                    <button
                        onClick={() => setModalCriar(true)}
                        className="flex items-center justify-center gap-2 bg-marrom-medio text-white px-5 py-2.5 rounded-xl font-bold text-sm hover:bg-[#3e2b22] transition-colors shadow-sm active:scale-[0.98]"
                    >
                        <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
                            <path d="M7 1v12M1 7h12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                        </svg>
                        Novo Produto
                    </button>
                </header>

                <nav className="flex flex-wrap gap-2 md:gap-3 mb-10 p-1 md:p-1.5 bg-gray-100/60 backdrop-blur rounded-2xl w-fit">
                    {NAV_LINKS.map((link) => (
                        <Link
                            key={link.href}
                            href={link.href}
                            className={
                                'ativo' in link
                                    ? 'bg-white text-marrom-medio px-5 py-2 md:py-2.5 rounded-xl shadow-sm font-bold text-[13px] md:text-sm tracking-wide'
                                    : 'text-gray-500 px-5 py-2 md:py-2.5 rounded-xl font-semibold text-[13px] md:text-sm tracking-wide hover:bg-white/50 hover:text-gray-900 transition-all'
                            }
                        >
                            {link.label}
                        </Link>
                    ))}
                </nav>
            </div>

            <div className="max-w-7xl mx-auto px-4 md:px-8 space-y-6">

                {/* Feedback */}
                {mensagem && (
                    <div
                        className={`flex items-center gap-3 p-4 rounded-lg text-sm font-medium border ${mensagem.tipo === 'sucesso'
                            ? 'bg-green-50 text-green-800 border-green-200'
                            : mensagem.tipo === 'erro'
                                ? 'bg-red-50 text-red-800 border-red-200'
                                : 'bg-blue-50 text-blue-800 border-blue-200'
                            }`}
                    >
                        <span className="text-lg">
                            {mensagem.tipo === 'sucesso' ? '✓' : mensagem.tipo === 'erro' ? '✕' : '·'}
                        </span>
                        {mensagem.texto}
                        <button onClick={() => setMensagem(null)} className="ml-auto opacity-50 hover:opacity-100 text-lg leading-none">×</button>
                    </div>
                )}

                {/* Cards de métricas */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
                    {[
                        {
                            label: 'Total de SKUs',
                            valor: produtos.length.toString(),
                            sub: 'produtos ativos',
                            cor: 'border-sky-400',
                            bgGrad: 'from-sky-50 to-transparent',
                            icon: '📦',
                        },
                        {
                            label: 'Alertas de Estoque',
                            valor: alertas.toString(),
                            sub: alertas === 0 ? 'tudo em ordem' : 'itens a repor',
                            cor: alertas > 0 ? 'border-orange-400' : 'border-emerald-400',
                            bgGrad: alertas > 0 ? 'from-orange-50 to-transparent' : 'from-emerald-50 to-transparent',
                            icon: alertas > 0 ? '⚠️' : '✅',
                        },
                        {
                            label: 'Valor em Estoque',
                            valor: `R$ ${valorTotalEstoque.toFixed(0)}`,
                            sub: 'custo total imobilizado',
                            cor: 'border-marrom-claro',
                            bgGrad: 'from-marrom-claro/10 to-transparent',
                            icon: '💰',
                        },
                        {
                            label: 'Margem Média',
                            valor: `${margemMedia.toFixed(1)}%`,
                            sub: 'sobre todos os produtos',
                            cor: margemMedia >= 40 ? 'border-emerald-400' : 'border-amber-400',
                            bgGrad: margemMedia >= 40 ? 'from-emerald-50 to-transparent' : 'from-amber-50 to-transparent',
                            icon: '📈',
                        },
                    ].map(({ label, valor, sub, cor, bgGrad, icon }) => (
                        <div key={label} className={`relative bg-white p-6 rounded-2xl shadow-sm hover:shadow-md transition-shadow border border-t-[3px] border-x-gray-100 border-b-gray-100 ${cor} overflow-hidden group`}>
                            <div className={`absolute inset-0 bg-gradient-to-br ${bgGrad} opacity-50 group-hover:opacity-100 transition-opacity duration-500`} />
                            <div className="relative z-10 flex items-start justify-between">
                                <div>
                                    <p className="text-[11px] md:text-xs font-bold text-gray-400 uppercase tracking-[0.15em]">{label}</p>
                                    <p className="text-2xl md:text-3xl font-black text-gray-800 mt-2 tracking-tight">{valor}</p>
                                    <p className="text-xs text-gray-400 mt-1 font-medium">{sub}</p>
                                </div>
                                <span className="text-2xl opacity-80">{icon}</span>
                            </div>
                        </div>
                    ))}
                </div>

                {/* Tabela */}
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden mb-12">

                    {/* Barra de filtros e busca */}
                    <div className="flex flex-col md:flex-row items-center justify-between px-6 md:px-8 py-5 border-b border-gray-100 bg-gray-50/50 gap-4">
                        <h2 className="font-bold text-marrom-medio text-lg tracking-tight">Catálogo Interno</h2>

                        <div className="flex flex-col md:flex-row items-center gap-3 w-full md:w-auto">
                            <div className="relative w-full md:w-64">
                                <input
                                    type="text"
                                    placeholder="Pesquisar produto..."
                                    value={busca}
                                    onChange={(e) => setBusca(e.target.value)}
                                    className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-xl outline-none focus:border-marrom-claro focus:ring-2 focus:ring-marrom-claro/10 transition-colors"
                                />
                                <svg className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
                            </div>

                            <div className="flex gap-2 bg-gray-200/50 p-1 rounded-full w-full md:w-auto">
                                <button
                                    onClick={() => setFiltro('todos')}
                                    className={`flex-1 md:flex-none px-4 py-1.5 text-xs font-bold rounded-full transition-all ${filtro === 'todos'
                                        ? 'bg-white text-marrom-medio shadow-sm'
                                        : 'text-gray-500 hover:text-gray-800'
                                        }`}
                                >
                                    Todos ({produtos.length})
                                </button>
                                <button
                                    onClick={() => setFiltro('alerta')}
                                    className={`flex-1 md:flex-none px-4 py-1.5 text-xs font-bold rounded-full transition-all ${filtro === 'alerta'
                                        ? 'bg-orange-600 text-white shadow-sm'
                                        : 'text-gray-500 hover:text-gray-800'
                                        }`}
                                >
                                    Alertas ({alertas})
                                </button>
                            </div>
                        </div>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-gray-50/50 text-gray-400 text-xs uppercase tracking-widest border-b border-gray-100">
                                    <th className="px-6 py-4 font-bold">Produto</th>
                                    <th className="px-6 py-4 font-bold text-center">Tamanho Un.</th>
                                    <th className="px-6 py-4 font-bold text-center">Custo/Venda</th>
                                    <th className="px-6 py-4 font-bold text-center">Estoque Visível</th>
                                    <th className="px-6 py-4 font-bold text-center">Status</th>
                                    <th className="px-6 py-4 font-bold text-right">Ações</th>
                                </tr>
                            </thead>
                            <tbody>
                                {carregando ? (
                                    <tr>
                                        <td colSpan={6} className="px-5 py-16 text-center text-gray-400">
                                            <div className="flex flex-col items-center gap-3">
                                                <div className="w-6 h-6 border-2 border-marrom-claro border-t-transparent rounded-full animate-spin" />
                                                <span className="text-sm">Carregando inventário...</span>
                                            </div>
                                        </td>
                                    </tr>
                                ) : produtosFiltrados.length === 0 ? (
                                    <tr>
                                        <td colSpan={6} className="px-5 py-16 text-center text-gray-500">
                                            {filtro === 'alerta'
                                                ? '✅ Nenhum produto com alerta de estoque. Tudo em ordem!'
                                                : busca
                                                    ? 'Nenhum produto encontrado para essa pesquisa.'
                                                    : 'Nenhum produto cadastrado. Clique em "Novo Produto" para começar.'}
                                        </td>
                                    </tr>
                                ) : (
                                    produtosFiltrados.map((p) => {
                                        const status = statusEstoque(p)
                                        const cfg = STATUS_CONFIG[status]
                                        const isLoading = loadingId === p.id

                                        return (
                                            <tr
                                                key={p.id}
                                                className={`border-b border-gray-100 transition-colors hover:bg-gray-50 ${cfg.row} ${isLoading ? 'opacity-50 pointer-events-none' : ''}`}
                                            >
                                                {/* Produto */}
                                                <td className="px-5 py-4">
                                                    <p className="font-semibold text-gray-800 text-sm">{p.nome}</p>
                                                    <p className="text-xs text-gray-400 mt-0.5 truncate max-w-[200px]">
                                                        {p.descricao ?? 'Sem descrição'}
                                                    </p>
                                                </td>

                                                {/* Tamanho Un. */}
                                                <td className="px-5 py-4 text-center">
                                                    <span className="text-sm font-semibold text-gray-600 bg-gray-100 px-2 py-1 rounded">
                                                        {p.tamanhoUnidade} {p.unidadeMedida}
                                                    </span>
                                                </td>

                                                {/* Custo / Venda */}
                                                <td className="px-5 py-4 text-center">
                                                    <div className="flex flex-col items-center">
                                                        <span className="text-xs text-gray-500">C: R$ {p.precoCusto?.toFixed(2) || '0.00'}</span>
                                                        <span className="text-sm font-bold text-marrom-claro">V: R$ {p.precoVenda.toFixed(2)}</span>
                                                    </div>
                                                </td>

                                                {/* Estoque Visível Inteligente */}
                                                <td className="px-5 py-4 text-center">
                                                    <span className={`text-lg font-black leading-none ${status === 'esgotado' ? 'text-red-600' :
                                                        status === 'critico' ? 'text-orange-600' :
                                                            status === 'baixo' ? 'text-yellow-600' : 'text-gray-800'
                                                        }`}>
                                                        {formatarEstoqueVisivel(p.estoque, p.unidadeMedida)}
                                                    </span>
                                                </td>

                                                {/* Badge de status */}
                                                <td className="px-5 py-4 text-center">
                                                    <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold ${cfg.badge}`}>
                                                        {status === 'esgotado' && <span>●</span>}
                                                        {cfg.label}
                                                    </span>
                                                </td>

                                                {/* Ações */}
                                                <td className="px-5 py-4 text-right">
                                                    <div className="flex items-center justify-end gap-2">

                                                        {/* Botão de Retirar Frasco */}
                                                        <button
                                                            onClick={() => handleAjusteBaixa(p.id, p.tamanhoUnidade)}
                                                            disabled={isLoading || p.estoque < p.tamanhoUnidade}
                                                            title={`Retirar 1 Frasco (${p.tamanhoUnidade} ${p.unidadeMedida})`}
                                                            className="px-2 py-1.5 border border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700 transition-colors disabled:opacity-30 rounded-lg font-bold text-xs"
                                                        >
                                                            - 1 Frasco
                                                        </button>

                                                        {/* Botão de Entrada */}
                                                        <button
                                                            onClick={() => setModalEntrada({
                                                                produtoId: p.id,
                                                                nomeProduto: p.nome,
                                                                quantidadeFrascos: 1,
                                                                tamanhoUnidade: p.tamanhoUnidade,
                                                                unidadeMedida: p.unidadeMedida
                                                            })}
                                                            disabled={isLoading}
                                                            title="Dar entrada em estoque (Frascos)"
                                                            className="px-3 py-1.5 text-xs font-bold bg-blue-50 text-blue-700 border border-blue-200 rounded-lg hover:bg-blue-100 transition-colors disabled:opacity-30 whitespace-nowrap"
                                                        >
                                                            + Dar Entrada
                                                        </button>

                                                        {/* Inativar */}
                                                        <button
                                                            onClick={() => handleInativar(p.id, p.nome)}
                                                            disabled={isLoading}
                                                            title="Remover do catálogo"
                                                            className="p-1.5 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-30"
                                                        >
                                                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                                                                <polyline points="3 6 5 6 21 6" /><path d="M19 6l-1 14H6L5 6" /><path d="M10 11v6M14 11v6" /><path d="M9 6V4h6v2" />
                                                            </svg>
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        )
                                    })
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            {/* ── MODAL: Criar Produto/Insumo ──────────────────────────────────────── */}
            {modalCriar && (
                <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50 backdrop-blur-md">
                    <div className="bg-white rounded-[24px] shadow-2xl w-full max-w-lg border border-gray-100 animate-in fade-in zoom-in-95 duration-300">
                        <div className="px-8 pt-8 pb-5 border-b border-gray-100 flex justify-between items-start">
                            <div>
                                <h2 className="text-xl font-bold text-marrom-medio tracking-tight">Cadastrar Novo Produto</h2>
                                <p className="text-sm text-gray-500 mt-1">Insira os dados da ficha técnica e financeiro.</p>
                            </div>
                            <button
                                type="button"
                                disabled={criando}
                                onClick={() => { setModalCriar(false); setFormData(FORM_INICIAL) }}
                                className="p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600 rounded-full transition-colors disabled:opacity-50"
                            >
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6L6 18M6 6l12 12" /></svg>
                            </button>
                        </div>

                        <form onSubmit={handleCriar} className="p-8 space-y-6">
                            <div className="grid grid-cols-1 gap-5">
                                <div>
                                    <label className="block text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-2">
                                        Nome do Produto *
                                    </label>
                                    <input
                                        required
                                        disabled={criando}
                                        type="text"
                                        placeholder="Ex: Óleo de Argan Premium"
                                        value={formData.nome}
                                        onChange={campo('nome')}
                                        className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-marrom-claro focus:ring-4 focus:ring-marrom-claro/10 transition-all disabled:bg-gray-50 placeholder:text-gray-300 font-medium text-gray-800"
                                    />
                                </div>
                                <div>
                                    <label className="block text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-2">
                                        Descrição (Opcional)
                                    </label>
                                    <input
                                        disabled={criando}
                                        type="text"
                                        placeholder="Uso interno no salão"
                                        value={formData.descricao}
                                        onChange={campo('descricao')}
                                        className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-marrom-claro focus:ring-4 focus:ring-marrom-claro/10 transition-all disabled:bg-gray-50 placeholder:text-gray-300 font-medium text-gray-800"
                                    />
                                </div>
                            </div>

                            {/* Preços */}
                            <div className="grid grid-cols-2 gap-5">
                                <div>
                                    <label className="block text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-2">
                                        Custo (R$) *
                                    </label>
                                    <div className="relative">
                                        <span className="absolute left-4 top-1/2 -translate-y-1/2 font-bold text-gray-400 text-sm">R$</span>
                                        <input
                                            required
                                            disabled={criando}
                                            type="number"
                                            step="0.01"
                                            min="0"
                                            value={formData.precoCusto}
                                            onChange={campo('precoCusto')}
                                            className="w-full border border-gray-200 rounded-xl pl-10 pr-4 py-3 text-sm outline-none focus:border-marrom-claro focus:ring-4 focus:ring-marrom-claro/10 transition-all disabled:bg-gray-50 font-bold text-gray-800"
                                        />
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-2">
                                        Venda (R$) *
                                    </label>
                                    <div className="relative">
                                        <span className="absolute left-4 top-1/2 -translate-y-1/2 font-bold text-gray-400 text-sm">R$</span>
                                        <input
                                            required
                                            disabled={criando}
                                            type="number"
                                            step="0.01"
                                            min="0"
                                            value={formData.precoVenda}
                                            onChange={campo('precoVenda')}
                                            className="w-full border border-gray-200 rounded-xl pl-10 pr-4 py-3 text-sm outline-none focus:border-marrom-claro focus:ring-4 focus:ring-marrom-claro/10 transition-all disabled:bg-gray-50 font-bold text-marrom-claro"
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Configuração de Medidas */}
                            <div className="grid grid-cols-3 gap-5 p-5 bg-orange-50/50 border border-orange-100 rounded-2xl">
                                <div className="col-span-3">
                                    <h4 className="font-bold text-marrom-claro text-sm">Ficha Técnica (Medidas)</h4>
                                    <p className="text-[11px] text-gray-500 mt-1">Como este produto é consumido nos serviços?</p>
                                </div>
                                <div className="col-span-1">
                                    <label className="block text-[10px] font-bold text-gray-600 uppercase tracking-wider mb-1.5">Medida</label>
                                    <select
                                        className="w-full border border-gray-300 bg-white rounded-xl px-2 py-2.5 text-sm font-semibold outline-none focus:border-marrom-claro transition-colors"
                                        value={formData.unidadeMedida}
                                        onChange={campo('unidadeMedida')}
                                    >
                                        <option value="ml">Volume (ml)</option>
                                        <option value="g">Peso (g)</option>
                                        <option value="un">Inteiro (un)</option>
                                    </select>
                                </div>
                                <div className="col-span-2">
                                    <label className="block text-[10px] font-bold text-gray-600 uppercase tracking-wider mb-1.5">Tamanho de 1 Frasco</label>
                                    <div className="flex items-center gap-3">
                                        <input
                                            required
                                            type="number"
                                            min="1"
                                            className="w-full border border-gray-300 rounded-xl px-4 py-2.5 outline-none focus:border-marrom-claro font-bold transition-colors"
                                            value={formData.tamanhoUnidade}
                                            onChange={campo('tamanhoUnidade')}
                                        />
                                        <span className="text-sm font-black text-marrom-claro w-6">{formData.unidadeMedida}</span>
                                    </div>
                                </div>
                                <div className="col-span-3 mt-2 border-t border-orange-100/60 pt-4">
                                    <label className="block text-[11px] font-bold text-gray-600 uppercase tracking-wider mb-2">Frascos em Estoque Agora</label>
                                    <input
                                        required
                                        type="number"
                                        min="0"
                                        className="w-full border border-gray-300 rounded-xl px-4 py-3 outline-none focus:border-marrom-claro font-black text-lg transition-colors"
                                        value={formData.estoqueInicialEmFrascos}
                                        onChange={campo('estoqueInicialEmFrascos')}
                                    />
                                </div>
                            </div>

                            <div className="flex justify-end pt-4">
                                <button
                                    type="submit"
                                    disabled={criando}
                                    className="w-full md:w-auto px-8 py-3.5 text-sm bg-gray-900 text-white font-bold rounded-xl hover:bg-black transition-colors shadow-lg shadow-black/10 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                                >
                                    {criando ? 'Salvando...' : 'Adicionar Produto ao Catálogo'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* ── MODAL: Entrada de Mercadoria (Frascos) ─────────────────────────────── */}
            {modalEntrada && (
                <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50 backdrop-blur-md">
                    <div className="bg-white rounded-[24px] shadow-2xl w-full max-w-sm border border-gray-100 animate-in zoom-in-95 duration-200">
                        <div className="px-8 pt-8 pb-5 border-b border-gray-100 flex items-start justify-between">
                            <div>
                                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5">Entrada em Lote</p>
                                <h2 className="text-xl font-bold text-marrom-medio tracking-tight">{modalEntrada.nomeProduto}</h2>
                            </div>
                            <button
                                type="button"
                                disabled={entradando}
                                onClick={() => setModalEntrada(null)}
                                className="p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600 rounded-full transition-colors"
                            >
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6L6 18M6 6l12 12" /></svg>
                            </button>
                        </div>

                        <form onSubmit={(e) => { e.preventDefault(); void handleEntrada() }} className="p-8 space-y-6">
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-4 text-center">
                                    Quantos frascos completos chegaram?
                                </label>
                                <div className="flex items-center justify-center gap-3">
                                    <input
                                        required
                                        type="number"
                                        min="1"
                                        step="1"
                                        autoFocus
                                        value={modalEntrada.quantidadeFrascos}
                                        onChange={e => setModalEntrada(prev => prev ? { ...prev, quantidadeFrascos: Math.max(1, Number(e.target.value)) } : null)}
                                        className="w-28 border border-gray-200 rounded-2xl px-4 py-3 text-3xl font-black text-center text-marrom-medio outline-none focus:border-marrom-claro focus:ring-4 focus:ring-marrom-claro/10 transition-all shadow-sm"
                                    />
                                    <span className="font-bold text-gray-400 text-lg">un.</span>
                                </div>

                                <div className="bg-orange-50/50 border border-orange-100 rounded-xl p-4 mt-8 text-center flex flex-col items-center justify-center">
                                    <p className="text-[10px] text-orange-600 font-bold uppercase tracking-widest mb-2">Conversão Automática no Banco</p>
                                    <p className="text-xl font-black text-marrom-claro">
                                        + {modalEntrada.quantidadeFrascos * modalEntrada.tamanhoUnidade} {modalEntrada.unidadeMedida}
                                    </p>
                                </div>
                            </div>

                            <div className="flex justify-end pt-2">
                                <button
                                    type="submit"
                                    disabled={entradando || modalEntrada.quantidadeFrascos <= 0}
                                    className="w-full px-5 py-3.5 text-sm bg-gray-900 text-white font-bold rounded-xl hover:bg-black transition-colors shadow-lg shadow-black/10 disabled:opacity-50"
                                >
                                    {entradando ? 'A Processar...' : 'Confirmar Entrada'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    )
}