import React, { useState, useEffect } from 'react'
import { Loader2, X, Receipt, CheckCircle2, AlertTriangle } from 'lucide-react'
import { listarDividasCliente, quitarDivida, type DividaClienteDetalhada } from '@/app/actions/divida'
import { fmt, logError, ErrorAlert } from './helpers'

interface Props {
    cliente: { id: string; nome: string };
    onClose: () => void;
    onSuccess: () => void;
}

export function ModalDividasCliente({ cliente, onClose, onSuccess }: Props) {
    const [dadosDividas, setDadosDividas] = useState<DividaClienteDetalhada[]>([])
    const [loadingDividas, setLoadingDividas] = useState(true)

    const [dividaSelecionadaId, setDividaSelecionadaId] = useState<string | null>(null)
    const [valorQuitacao, setValorQuitacao] = useState('')
    const [loadingQuitar, setLoadingQuitar] = useState(false)
    const [erroQuitar, setErroQuitar] = useState('')

    const carregarDividas = async () => {
        try {
            const res = await listarDividasCliente(cliente.id)
            if (res.sucesso) setDadosDividas(res.data.dividas as DividaClienteDetalhada[])
        } catch (error) { logError('listarDividasCliente', error) }
        finally { setLoadingDividas(false) }
    }

    useEffect(() => { carregarDividas() }, [cliente.id])

    const handleQuitarDivida = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!dividaSelecionadaId) return
        const valor = parseFloat(valorQuitacao)
        if (isNaN(valor) || valor <= 0) { setErroQuitar('Informe um valor válido maior que zero.'); return }

        setLoadingQuitar(true); setErroQuitar('')
        try {
            const res = await quitarDivida(dividaSelecionadaId, valor)
            if (res.sucesso) {
                setDividaSelecionadaId(null)
                setValorQuitacao('')
                await carregarDividas()
                onSuccess() // Atualiza tabela no fundo
            } else { setErroQuitar(res.erro) }
        } catch (error) {
            setErroQuitar('Falha técnica ao processar a quitação.')
            logError('handleQuitarDivida', error)
        } finally { setLoadingQuitar(false) }
    }

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <div className="bg-card rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] flex flex-col border-t-4 border-t-red-500">
                <div className="p-6 border-b border-border shrink-0">
                    <div className="flex items-start justify-between gap-4">
                        <div>
                            <div className="flex items-center gap-2">
                                <Receipt className="w-5 h-5 text-red-600" />
                                <h2 className="text-xl font-bold text-foreground">Dívidas Pendentes</h2>
                            </div>
                            <p className="text-sm text-muted-foreground mt-1">Cliente: <strong className="text-foreground">{cliente.nome}</strong></p>
                        </div>
                        <button onClick={onClose} className="text-muted-foreground hover:text-foreground shrink-0 p-1 rounded-lg hover:bg-muted transition-colors"><X className="w-5 h-5" /></button>
                    </div>
                </div>

                <div className="overflow-y-auto flex-1 p-6 space-y-4">
                    {loadingDividas ? (
                        <div className="flex flex-col items-center justify-center py-10 gap-3 text-muted-foreground">
                            <Loader2 className="w-6 h-6 animate-spin text-primary" />
                            <p className="text-sm font-medium">Carregando dívidas...</p>
                        </div>
                    ) : dadosDividas.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-10 gap-3">
                            <CheckCircle2 className="w-10 h-10 text-green-500" />
                            <p className="text-sm text-muted-foreground font-medium">Nenhuma dívida encontrada.</p>
                        </div>
                    ) : (
                        <>
                            <div className="space-y-2">
                                {dadosDividas.map(divida => {
                                    const saldoPendente = divida.valorOriginal - divida.valorQuitado
                                    const selecionada = dividaSelecionadaId === divida.id
                                    const isFechada = divida.status === 'QUITADA'

                                    return (
                                        <button key={divida.id} type="button" disabled={isFechada} onClick={() => {
                                            if (isFechada) return
                                            setDividaSelecionadaId(selecionada ? null : divida.id)
                                            setValorQuitacao(selecionada ? '' : fmt(saldoPendente).replace(',', '.'))
                                            setErroQuitar('')
                                        }} className={`w-full text-left p-4 rounded-xl border-2 transition-all ${isFechada ? 'border-green-200 bg-green-50/50 opacity-60 cursor-default' : selecionada ? 'border-red-400 bg-red-50 shadow-sm' : 'border-border bg-muted/20 hover:border-red-200 hover:bg-red-50/30'}`}>
                                            <div className="flex items-center justify-between gap-4">
                                                <div className="min-w-0">
                                                    {divida.agendamento && (
                                                        <p className="text-xs text-muted-foreground mb-1">
                                                            Agendamento de {new Date(divida.agendamento.dataHoraInicio).toLocaleDateString('pt-BR')} · Comanda R$ {fmt(divida.agendamento.valorBruto)}
                                                        </p>
                                                    )}
                                                    <p className="text-sm font-semibold text-foreground">Valor original: R$ {fmt(divida.valorOriginal)}</p>
                                                    {divida.valorQuitado > 0 && <p className="text-xs text-green-700 mt-0.5">Já quitado: R$ {fmt(divida.valorQuitado)}</p>}
                                                </div>
                                                <div className="shrink-0 text-right">
                                                    {isFechada ? (
                                                        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-bold bg-green-100 text-green-700"><CheckCircle2 className="w-3 h-3" /> Quitada</span>
                                                    ) : (
                                                        <>
                                                            <p className="text-lg font-black text-red-700">R$ {fmt(saldoPendente)}</p>
                                                            <p className="text-[10px] text-muted-foreground uppercase tracking-wider">{divida.status === 'PARCIAL' ? 'Parcial' : 'Pendente'}</p>
                                                        </>
                                                    )}
                                                </div>
                                            </div>
                                        </button>
                                    )
                                })}
                            </div>

                            {dividaSelecionadaId && (
                                <form onSubmit={handleQuitarDivida} className="p-4 bg-amber-50 border border-amber-200 rounded-xl space-y-3">
                                    <div className="flex items-center gap-2 mb-1">
                                        <AlertTriangle className="w-4 h-4 text-amber-600" />
                                        <span className="text-sm font-bold text-amber-800">Registrar Pagamento</span>
                                    </div>
                                    {erroQuitar && <ErrorAlert message={erroQuitar} onDismiss={() => setErroQuitar('')} />}
                                    <div>
                                        <label className="block text-xs font-semibold text-amber-800 mb-1.5">Valor recebido (R$)</label>
                                        <input type="number" min="0.01" step="0.01" value={valorQuitacao} onChange={e => setValorQuitacao(e.target.value)} placeholder="0,00" required className="w-full px-3 py-2 border border-amber-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 bg-white" />
                                    </div>
                                    <div className="flex justify-end gap-2">
                                        <button type="button" onClick={() => { setDividaSelecionadaId(null); setValorQuitacao(''); setErroQuitar('') }} className="px-4 py-2 text-sm font-semibold text-amber-700 hover:bg-amber-100 rounded-lg transition-colors">Cancelar</button>
                                        <button type="submit" disabled={loadingQuitar} className="px-5 py-2 bg-amber-600 hover:bg-amber-700 text-white text-sm font-bold rounded-lg transition-colors flex items-center gap-2 disabled:opacity-50">
                                            {loadingQuitar ? <><Loader2 className="w-4 h-4 animate-spin" /> Processando...</> : <><CheckCircle2 className="w-4 h-4" /> Confirmar</>}
                                        </button>
                                    </div>
                                </form>
                            )}
                        </>
                    )}
                </div>
                <div className="p-4 border-t border-border shrink-0">
                    <button type="button" onClick={onClose} className="w-full py-2.5 text-sm font-bold text-muted-foreground hover:bg-muted rounded-xl transition-colors">Fechar</button>
                </div>
            </div>
        </div>
    )
}