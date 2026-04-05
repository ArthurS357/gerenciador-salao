import React, { useEffect, useState } from 'react'
import { Loader2, X } from 'lucide-react'
import { obterHistoricoCliente, type HistoricoClienteData } from '@/app/actions/cliente'
import { fmt, logError } from './helpers'
import { STATUS_BADGE_THEME, STATUS_LABEL } from '@/lib/status-mapper'
import type { StatusAgendamento } from '@prisma/client'

interface Props {
    clienteId: string;
    onClose: () => void;
}

export function ModalHistoricoCliente({ clienteId, onClose }: Props) {
    const [dadosHistorico, setDadosHistorico] = useState<HistoricoClienteData | null>(null)
    const [loadingHistorico, setLoadingHistorico] = useState(true)

    useEffect(() => {
        const fetchHistory = async () => {
            try {
                const res = await obterHistoricoCliente(clienteId)
                if (res.sucesso) setDadosHistorico(res.data.dados)
                else logError('obterHistoricoCliente', res.erro)
            } catch (error) {
                logError('abrirModalHistorico', error)
            } finally {
                setLoadingHistorico(false)
            }
        }
        fetchHistory()
    }, [clienteId])

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <div className="bg-card rounded-2xl shadow-2xl w-[95%] sm:w-[90%] md:w-full md:max-w-lg max-h-[85vh] overflow-y-auto max-h-[85vh] flex flex-col">
                <div className="p-6 border-b border-border flex items-center justify-between shrink-0">
                    <div>
                        <h2 className="text-xl font-bold text-foreground">Histórico do Cliente</h2>
                        {dadosHistorico && (
                            <p className="text-sm text-muted-foreground mt-1">
                                {dadosHistorico.cliente.nome} · Total gasto:{' '}
                                <strong className="text-primary">R$ {fmt(dadosHistorico.totalGasto)}</strong>
                            </p>
                        )}
                    </div>
                    <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-muted transition-colors text-muted-foreground">
                        <X className="w-5 h-5" />
                    </button>
                </div>
                <div className="overflow-y-auto flex-1 p-6">
                    {loadingHistorico ? (
                        <div className="flex flex-col items-center py-10 gap-3 text-muted-foreground">
                            <Loader2 className="w-6 h-6 animate-spin text-primary" />
                            <p className="text-sm">Carregando histórico...</p>
                        </div>
                    ) : !dadosHistorico || dadosHistorico.agendamentos.length === 0 ? (
                        <p className="text-sm text-center text-muted-foreground py-10">Nenhum agendamento registrado.</p>
                    ) : (
                        <div className="space-y-3">
                            {dadosHistorico.agendamentos.map(ag => (
                                <div key={ag.id} className={`p-4 rounded-xl border ${ag.status === 'FINALIZADO' ? 'bg-green-50/50 border-green-200' : ag.status === 'CANCELADO' ? 'bg-red-50/50 border-red-200' : 'bg-muted/30 border-border'}`}>
                                    <div className="flex justify-between items-start gap-3">
                                        <div className="min-w-0">
                                            <p className="text-sm font-semibold text-foreground">
                                                {new Date(ag.dataHoraInicio).toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })}
                                            </p>
                                            <p className="text-xs text-muted-foreground mt-0.5">Profissional: {ag.funcionario.nome}</p>
                                            <p className="text-xs text-muted-foreground mt-0.5">{ag.servicos.map(s => s.servico.nome).join(', ')}</p>
                                        </div>
                                        <div className="text-right shrink-0">
                                            <p className="text-sm font-bold text-primary">R$ {fmt(ag.valorBruto)}</p>
                                            <span className={`text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-full border ${STATUS_BADGE_THEME[ag.status as StatusAgendamento]}`}>
                                                {STATUS_LABEL[ag.status as StatusAgendamento]}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
                <div className="p-4 border-t border-border shrink-0">
                    <button type="button" onClick={onClose} className="w-full py-2.5 text-sm font-bold text-muted-foreground hover:bg-muted rounded-xl transition-colors">Fechar</button>
                </div>
            </div>
        </div>
    )
}
