'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import {
    Plus,
    Trash2,
    AlertTriangle,
    CheckCircle2,
    Loader2,
    CreditCard,
    Banknote,
    Smartphone,
} from 'lucide-react'
import { finalizarComanda, listarMetodosPagamento } from '@/app/actions/comanda'
import { Button } from '@/components/ui/button'
import type { PagamentoComandaInput, MetodoPagamento, MetodoPagamentoConfig } from '@/types/domain'

// ── Constantes e Helpers de UI ────────────────────────────────────────────────

const BANDEIRA_LABELS: Record<string, string> = {
    '': 'Padrão (Taxa do Método)',
    VISA: 'Visa',
    MASTERCARD: 'Mastercard',
    ELO: 'Elo',
    AMEX: 'American Express',
    HIPERCARD: 'Hipercard',
}

const METODO_LABELS: Record<MetodoPagamento, string> = {
    DINHEIRO: 'Dinheiro',
    PIX: 'PIX',
    CARTAO_DEBITO: 'Cartão de Débito',
    CARTAO_CREDITO: 'Cartão de Crédito',
    CORTESIA: 'Cortesia',
    VOUCHER: 'Voucher',
    PERMUTA: 'Permuta',
}

const METODO_ICONES: Record<MetodoPagamento, React.ReactNode> = {
    DINHEIRO: <Banknote className="w-3.5 h-3.5" />,
    PIX: <Smartphone className="w-3.5 h-3.5" />,
    CARTAO_DEBITO: <CreditCard className="w-3.5 h-3.5" />,
    CARTAO_CREDITO: <CreditCard className="w-3.5 h-3.5" />,
    CORTESIA: <CheckCircle2 className="w-3.5 h-3.5" />,
    VOUCHER: <Banknote className="w-3.5 h-3.5" />,
    PERMUTA: <Banknote className="w-3.5 h-3.5" />,
}

const METODOS_FALLBACK: MetodoPagamento[] = [
    'DINHEIRO',
    'PIX',
    'CARTAO_DEBITO',
    'CARTAO_CREDITO',
]

function fmt(valor: number): string {
    return valor.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

// ── Tipos internos ────────────────────────────────────────────────────────────

/** Tipo seguro local para os estados manipulados no formulário */
type PagamentoRow = {
    _key: number;
    metodo: MetodoPagamento;
    valor: number;
    parcelas: number;
    bandeira: string;
}

/** Interface auxiliar segura para leitura do config vindo do DB */
type ConfigMetodoSegura = MetodoPagamentoConfig & {
    id?: string;
    taxaBase?: number;
}

// ── Props ─────────────────────────────────────────────────────────────────────

interface BotaoFinalizarComandaProps {
    agendamentoId: string
    valorBruto: number
    custoInsumosEstimado?: number
}

// ── Componente Principal ──────────────────────────────────────────────────────

export default function BotaoFinalizarComanda({
    agendamentoId,
    valorBruto,
    custoInsumosEstimado = 0,
}: BotaoFinalizarComandaProps) {
    const router = useRouter()

    // ── Estado do Modal ───────────────────────────────────────────────────────
    const [mostrarModal, setMostrarModal] = useState(false)
    const [carregando, setCarregando] = useState(false)
    const [carregandoMetodos, setCarregandoMetodos] = useState(true)

    // ── Estado do Formulário ──────────────────────────────────────────────────
    const [custoInsumos, setCustoInsumos] = useState(custoInsumosEstimado)
    const [metodosConfig, setMetodosConfig] = useState<ConfigMetodoSegura[]>([])
    const [metodosAtivos, setMetodosAtivos] = useState<MetodoPagamento[]>(METODOS_FALLBACK)
    const [pagamentos, setPagamentos] = useState<PagamentoRow[]>([
        { _key: 0, metodo: 'DINHEIRO', valor: 0, parcelas: 1, bandeira: '' }
    ])
    const [keyCounter, setKeyCounter] = useState(1)

    // ── Cálculos em Tempo Real ────────────────────────────────────────────────
    const totalPago = pagamentos.reduce((sum, p) => sum + (p.valor || 0), 0)
    const restante = valorBruto - totalPago
    const temDivida = restante > 0.009
    const temExcesso = totalPago > valorBruto + 0.009
    const emDia = Math.abs(restante) < 0.01

    // ── Taxa estimada de maquininha (apenas informativo) ──────────────────────
    // Prioriza taxa específica da bandeira; cai no genérico se não configurado
    const taxaEstimada = pagamentos.reduce((sum, p) => {
        const cfg = metodosConfig.find(m => m.metodo === p.metodo && m.bandeira === p.bandeira)
            ?? metodosConfig.find(m => m.metodo === p.metodo && m.bandeira === '')
        return sum + (p.valor * ((cfg?.taxaBase ?? 0) / 100))
    }, 0)



    // ── Carrega Métodos de Pagamento ao Abrir o Modal ─────────────────────────
    useEffect(() => {
        if (!mostrarModal) return
        let cancelado = false

        listarMetodosPagamento()
            .then(res => {
                if (cancelado) return
                if (res.sucesso && res.data.metodos.length > 0) {
                    setMetodosConfig(res.data.metodos as ConfigMetodoSegura[])
                    setMetodosAtivos(res.data.metodos.map(m => m.metodo))
                }
            })
            .catch(() => { /* mantém os defaults */ })
            .finally(() => {
                if (!cancelado) setCarregandoMetodos(false)
            })

        return () => { cancelado = true }
    }, [mostrarModal])

    // ── Reset ao fechar modal ─────────────────────────────────────────────────
    const fecharModal = useCallback(() => {
        setMostrarModal(false)
        setCarregando(false)
        setCarregandoMetodos(true)
        setPagamentos([{ _key: 0, metodo: 'DINHEIRO', valor: 0, parcelas: 1, bandeira: '' }])
        setKeyCounter(1)
        setCustoInsumos(custoInsumosEstimado)
    }, [custoInsumosEstimado])

    // ── Manipulação da Lista de Pagamentos ────────────────────────────────────
    const adicionarMetodo = () => {
        const jaUsados = new Set(pagamentos.map(p => p.metodo))
        const proximo = metodosAtivos.find(m => !jaUsados.has(m)) ?? metodosAtivos[0]
        if (!proximo) return

        setPagamentos(prev => [
            ...prev,
            { _key: keyCounter, metodo: proximo, valor: 0, parcelas: 1, bandeira: '' }
        ])
        setKeyCounter(c => c + 1)
    }

    const removerMetodo = (key: number) => {
        if (pagamentos.length === 1) return
        setPagamentos(prev => prev.filter(p => p._key !== key))
    }

    const atualizarPagamento = (key: number, delta: Partial<Omit<PagamentoRow, '_key'>>) => {
        setPagamentos(prev =>
            prev.map(p => {
                if (p._key !== key) return p
                const atualizado = { ...p, ...delta }
                if ('metodo' in delta) {
                    // Ao trocar método: reseta bandeira e parcelas
                    atualizado.bandeira = ''
                    if (delta.metodo !== 'CARTAO_CREDITO') {
                        atualizado.parcelas = 1
                    }
                }
                return atualizado
            })
        )
    }

    // ── Submissão ─────────────────────────────────────────────────────────────
    const handleFinalizar = async () => {
        if (temExcesso) {
            toast.error('O total informado excede o valor da comanda.')
            return
        }
        if (pagamentos.some(p => p.valor <= 0)) {
            toast.error('Todos os métodos adicionados precisam ter um valor maior que zero.')
            return
        }

        setCarregando(true)
        try {
            // Mapeamos unindo os inputs do utilizador com os IDs e Taxas do config na base de dados
            const payload = pagamentos.map(p => {
                // Mesmo lookup composto que o motor financeiro: bandeira específica → genérico
                const cfg = metodosConfig.find(m => m.metodo === p.metodo && m.bandeira === p.bandeira)
                    ?? metodosConfig.find(m => m.metodo === p.metodo && m.bandeira === '')

                return {
                    metodo: p.metodo,
                    valor: p.valor,
                    parcelas: p.metodo === 'CARTAO_CREDITO' ? p.parcelas : 1,
                    bandeira: p.bandeira,
                    taxaBase: cfg?.taxaBase ?? 0,
                    taxaMetodoId: cfg?.id,
                } as PagamentoComandaInput
            })

            const res = await finalizarComanda(agendamentoId, custoInsumos, payload)

            if (res.sucesso) {
                const f = res.data.financeiro

                if (f.valorPendente > 0.01) {
                    toast.warning('Comanda registrada com dívida pendente!', {
                        description: `Saldo de R$ ${fmt(f.valorPendente)} registrado como dívida. Comissão retida até quitação.`,
                        duration: 6000,
                    })
                } else {
                    toast.success(`Comanda faturada! Lucro líquido: R$ ${fmt(f.lucroSalao)}`, {
                        description: `Bruto R$ ${fmt(f.bruto)} — Repasse profissional R$ ${fmt(f.comissao)}`,
                    })
                }

                router.push('/profissional/agenda')
            } else {
                toast.error(res.erro ?? 'Erro ao processar a comanda.')
                setCarregando(false)
            }
        } catch {
            toast.error('Ocorreu um erro técnico ao processar a fatura.')
            setCarregando(false)
        }
    }

    // ── Render ────────────────────────────────────────────────────────────────
    return (
        <>
            <Button
                onClick={() => setMostrarModal(true)}
                disabled={carregando}
                className="w-full md:w-auto bg-green-600 hover:bg-green-700 text-white font-bold shadow-sm"
            >
                Concluir Agendamento e Faturar
            </Button>

            {/* ── Backdrop ── */}
            {mostrarModal && (
                <div
                    className="fixed inset-0 z-[9999] flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm p-0 sm:p-4"
                    onClick={(e) => { if (e.target === e.currentTarget) fecharModal() }}
                >
                    {/* ── Card do Modal ── */}
                    <div className="bg-white w-full sm:max-w-lg rounded-t-2xl sm:rounded-2xl shadow-2xl max-h-[95vh] flex flex-col">

                        {/* ── Cabeçalho ── */}
                        <div className="px-6 pt-6 pb-4 border-b border-gray-100 shrink-0">
                            <div className="flex items-start justify-between gap-4">
                                <div>
                                    <h3 className="text-lg font-black text-gray-900 leading-tight">
                                        Confirmar Fechamento de Comanda
                                    </h3>
                                    <p className="text-sm text-gray-500 mt-1">
                                        Valor total da comanda:{' '}
                                        <strong className="text-gray-800 font-bold">R$ {fmt(valorBruto)}</strong>
                                    </p>
                                </div>
                                {/* Alça visual mobile */}
                                <div className="sm:hidden w-12 h-1.5 rounded-full bg-gray-200 mx-auto mt-1 shrink-0" />
                            </div>
                        </div>

                        {/* ── Corpo com scroll ── */}
                        <div className="overflow-y-auto p-6 space-y-5 flex-1">

                            {/* Custo de Insumos */}
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">
                                    Custo de Insumos (R$)
                                </label>
                                <input
                                    type="number"
                                    min="0"
                                    step="0.01"
                                    value={custoInsumos || ''}
                                    placeholder="0,00"
                                    onChange={e =>
                                        setCustoInsumos(Math.max(0, parseFloat(e.target.value) || 0))
                                    }
                                    className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-shadow"
                                />
                                {custoInsumosEstimado > 0 && (
                                    <p className="text-xs text-gray-400 mt-1.5">
                                        Estimativa pela ficha técnica:{' '}
                                        <span className="font-semibold">R$ {fmt(custoInsumosEstimado)}</span>
                                    </p>
                                )}
                            </div>

                            {/* ── Seção de Pagamentos ── */}
                            <div>
                                <div className="flex items-center justify-between mb-3">
                                    <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">
                                        Formas de Pagamento
                                    </span>
                                    {pagamentos.length < metodosAtivos.length && (
                                        <button
                                            type="button"
                                            onClick={adicionarMetodo}
                                            disabled={carregandoMetodos}
                                            className="flex items-center gap-1 text-xs font-bold text-green-600 hover:text-green-700 transition-colors disabled:opacity-40"
                                        >
                                            <Plus className="w-3.5 h-3.5" />
                                            Adicionar método
                                        </button>
                                    )}
                                </div>

                                <div className="space-y-2.5">
                                    {pagamentos.map((pag) => (
                                        <div
                                            key={pag._key}
                                            className="p-3.5 bg-gray-50 rounded-xl border border-gray-100 space-y-2.5"
                                        >
                                            {/* Linha: método + valor + remover */}
                                            <div className="flex gap-2 items-center">
                                                {/* Ícone do método */}
                                                <span className="text-gray-400 shrink-0">
                                                    {METODO_ICONES[pag.metodo]}
                                                </span>

                                                {/* Select de Método */}
                                                <select
                                                    value={pag.metodo}
                                                    onChange={e =>
                                                        atualizarPagamento(pag._key, {
                                                            metodo: e.target.value as MetodoPagamento,
                                                        })
                                                    }
                                                    className="flex-1 min-w-0 px-2.5 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-green-500 cursor-pointer"
                                                >
                                                    {metodosAtivos.map(m => (
                                                        <option key={m} value={m}>
                                                            {METODO_LABELS[m]}
                                                        </option>
                                                    ))}
                                                </select>

                                                {/* Input de Valor */}
                                                <div className="relative w-28 shrink-0">
                                                    <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs text-gray-400 font-semibold pointer-events-none">
                                                        R$
                                                    </span>
                                                    <input
                                                        type="number"
                                                        min="0"
                                                        step="0.01"
                                                        value={pag.valor || ''}
                                                        placeholder="0,00"
                                                        onChange={e =>
                                                            atualizarPagamento(pag._key, {
                                                                valor: Math.max(0, parseFloat(e.target.value) || 0),
                                                            })
                                                        }
                                                        className="w-full pl-8 pr-2 py-2 border border-gray-200 rounded-lg text-sm text-right focus:outline-none focus:ring-2 focus:ring-green-500"
                                                    />
                                                </div>

                                                {/* Botão Remover */}
                                                <button
                                                    type="button"
                                                    onClick={() => removerMetodo(pag._key)}
                                                    disabled={pagamentos.length === 1}
                                                    className="p-1.5 text-gray-300 hover:text-red-500 transition-colors disabled:opacity-0 disabled:cursor-default shrink-0"
                                                    aria-label="Remover este método de pagamento"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </div>

                                            {/* Dentro do loop de pagamentos, quando o método for cartão */}
                                            {(pag.metodo === 'CARTAO_CREDITO' || pag.metodo === 'CARTAO_DEBITO') && (
                                                <div className="flex items-center gap-2 pl-5">
                                                    <label className="text-[10px] text-gray-400 font-bold uppercase">Bandeira:</label>
                                                    <select
                                                        value={pag.bandeira}
                                                        onChange={e => atualizarPagamento(pag._key, { bandeira: e.target.value })}
                                                        className="flex-1 px-2 py-1 border border-gray-100 rounded-lg text-xs bg-white focus:ring-1 focus:ring-green-500"
                                                    >
                                                        {/* Ajuste Pontual: Label Semântico */}
                                                        <option value="">Padrão (Taxa do Método)</option>

                                                        {/* Renderiza apenas bandeiras que possuem taxa específica no banco */}
                                                        {metodosConfig
                                                            .filter(m => m.metodo === pag.metodo && m.bandeira !== "")
                                                            .map(m => (
                                                                <option key={m.id} value={m.bandeira}>
                                                                    {BANDEIRA_LABELS[m.bandeira] || m.bandeira} ({m.taxaBase}%)
                                                                </option>
                                                            ))
                                                        }
                                                    </select>
                                                </div>
                                            )}

                                            {/* Linha de Parcelas — apenas para Cartão de Crédito */}
                                            {pag.metodo === 'CARTAO_CREDITO' && (
                                                <div className="flex items-center gap-2 pl-5">
                                                    <label className="text-xs text-gray-500 font-semibold whitespace-nowrap">
                                                        Parcelas:
                                                    </label>
                                                    <select
                                                        value={pag.parcelas}
                                                        onChange={e =>
                                                            atualizarPagamento(pag._key, {
                                                                parcelas: parseInt(e.target.value, 10),
                                                            })
                                                        }
                                                        className="flex-1 px-2.5 py-1.5 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-green-500"
                                                    >
                                                        {Array.from({ length: 12 }, (_, i) => i + 1).map(n => (
                                                            <option key={n} value={n}>
                                                                {n === 1
                                                                    ? '1x (à vista)'
                                                                    : `${n}x de R$ ${fmt(pag.valor > 0 ? pag.valor / n : 0)}`
                                                                }
                                                            </option>
                                                        ))}
                                                    </select>
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* ── Resumo em Tempo Real ── */}
                            <div className="rounded-xl border border-gray-200 overflow-hidden">
                                <div className="bg-gray-50 px-4 py-2.5 border-b border-gray-200">
                                    <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">
                                        Resumo do Fechamento
                                    </span>
                                </div>
                                <div className="divide-y divide-gray-100 text-sm">
                                    <div className="flex justify-between items-center px-4 py-2.5">
                                        <span className="text-gray-600">Valor da comanda</span>
                                        <span className="font-bold text-gray-900">R$ {fmt(valorBruto)}</span>
                                    </div>
                                    {taxaEstimada > 0.001 && (
                                        <div className="flex justify-between items-center px-4 py-2.5">
                                            <span className="text-gray-400 text-xs">Taxas estimadas (maquininha)</span>
                                            <span className="text-xs text-gray-400">- R$ {fmt(taxaEstimada)}</span>
                                        </div>
                                    )}
                                    <div className="flex justify-between items-center px-4 py-2.5">
                                        <span className="text-gray-600">Total informado</span>
                                        <span className="font-bold text-gray-900">R$ {fmt(totalPago)}</span>
                                    </div>

                                    {/* Linha de saldo — cor muda conforme status */}
                                    <div className={`flex justify-between items-center px-4 py-3 ${temExcesso ? 'bg-red-50' :
                                        temDivida ? 'bg-amber-50' :
                                            emDia && totalPago > 0 ? 'bg-green-50' : ''
                                        }`}>
                                        <span className={`font-bold ${temExcesso ? 'text-red-700' :
                                            temDivida ? 'text-amber-700' :
                                                'text-green-700'
                                            }`}>
                                            {temExcesso ? 'Excesso' : temDivida ? 'Restante (dívida)' : 'Restante'}
                                        </span>
                                        <span className={`font-black text-base ${temExcesso ? 'text-red-700' :
                                            temDivida ? 'text-amber-700' :
                                                'text-green-700'
                                            }`}>
                                            R$ {fmt(Math.abs(restante))}
                                        </span>
                                    </div>
                                </div>
                            </div>

                            {/* ── Banner: Aviso de Dívida Pendente ── */}
                            {temDivida && (
                                <div className="flex gap-3 p-4 bg-amber-50 border border-amber-200 rounded-xl">
                                    <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
                                    <div className="space-y-1">
                                        <p className="text-sm font-bold text-amber-800">
                                            Pagamento parcial detectado
                                        </p>
                                        <p className="text-xs text-amber-700 leading-relaxed">
                                            A diferença de{' '}
                                            <strong>R$ {fmt(restante)}</strong> será registrada como{' '}
                                            <strong>Dívida Pendente</strong> vinculada ao cliente.
                                            A comissão do profissional ficará{' '}
                                            <strong>retida</strong> até a quitação total.
                                        </p>
                                    </div>
                                </div>
                            )}

                            {/* ── Banner: Aviso de Excesso ── */}
                            {temExcesso && (
                                <div className="flex gap-3 p-4 bg-red-50 border border-red-200 rounded-xl">
                                    <AlertTriangle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
                                    <p className="text-sm text-red-800">
                                        O total informado excede o valor da comanda em{' '}
                                        <strong>R$ {fmt(totalPago - valorBruto)}</strong>. Ajuste os valores antes de continuar.
                                    </p>
                                </div>
                            )}
                        </div>

                        {/* ── Rodapé com Ações ── */}
                        <div className="px-6 pb-6 pt-4 border-t border-gray-100 flex gap-3 shrink-0">
                            <Button
                                variant="outline"
                                onClick={fecharModal}
                                disabled={carregando}
                                className="flex-1 font-semibold"
                            >
                                Cancelar
                            </Button>

                            {temDivida ? (
                                /* Botão âmbar — pagamento parcial com geração de dívida */
                                <Button
                                    onClick={handleFinalizar}
                                    disabled={carregando || temExcesso || pagamentos.some(p => p.valor <= 0)}
                                    className="flex-1 bg-amber-500 hover:bg-amber-600 text-white font-bold disabled:opacity-50"
                                >
                                    {carregando ? (
                                        <>
                                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                            Processando...
                                        </>
                                    ) : (
                                        <>
                                            <AlertTriangle className="w-4 h-4 mr-2" />
                                            Registrar com Dívida
                                        </>
                                    )}
                                </Button>
                            ) : (
                                /* Botão verde — pagamento integral */
                                <Button
                                    onClick={handleFinalizar}
                                    disabled={carregando || !emDia || temExcesso}
                                    className="flex-1 bg-green-600 hover:bg-green-700 text-white font-bold disabled:opacity-50"
                                >
                                    {carregando ? (
                                        <>
                                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                            Processando...
                                        </>
                                    ) : (
                                        <>
                                            <CheckCircle2 className="w-4 h-4 mr-2" />
                                            Confirmar e Faturar
                                        </>
                                    )}
                                </Button>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </>
    )
}