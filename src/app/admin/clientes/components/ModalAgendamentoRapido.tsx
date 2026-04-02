import React, { useState } from 'react'
import { Loader2 } from 'lucide-react'
import { z } from 'zod'
import { criarAgendamentoMultiplo } from '@/app/actions/agendamento'
import { ErrorAlert, logError } from './helpers'

const agendamentoSchema = z.object({
    funcionarioId: z.string().min(1, 'ID do profissional obrigatório'),
    servicoId: z.string().min(1, 'ID do serviço obrigatório'),
    dataHora: z.string().min(1, 'Data e hora obrigatória'),
})

interface Props {
    cliente: { id: string; nome: string };
    profissionaisList: { id: string; nome: string }[];
    servicosList: { id: string; nome: string }[];
    onClose: () => void;
    onSuccess: () => void;
}

export function ModalAgendamentoRapido({ cliente, profissionaisList, servicosList, onClose, onSuccess }: Props) {
    const [novaReserva, setNovaReserva] = useState({ funcionarioId: '', dataHora: '', servicoId: '' })
    const [loadingAgendar, setLoadingAgendar] = useState(false)
    const [erroAgendar, setErroAgendar] = useState('')

    const handleConfirmarAgendamento = async (e: React.FormEvent) => {
        e.preventDefault()
        const validacao = agendamentoSchema.safeParse(novaReserva)
        if (!validacao.success) { setErroAgendar(validacao.error.issues[0]?.message || 'Dados inválidos'); return }

        setLoadingAgendar(true)
        setErroAgendar('')
        try {
            const res = await criarAgendamentoMultiplo(cliente.id, novaReserva.funcionarioId, new Date(novaReserva.dataHora), [novaReserva.servicoId])
            if (res.sucesso) onSuccess()
            else setErroAgendar(res.erro)
        } catch (error) {
            setErroAgendar('Falha técnica ao processar formulário')
            logError('handleConfirmarAgendamento', error)
        } finally {
            setLoadingAgendar(false)
        }
    }

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <div className="bg-card rounded-2xl shadow-2xl w-[95%] sm:w-[90%] md:w-full md:max-w-md max-h-[85vh] overflow-y-auto p-6 border-t-4 border-t-primary animate-in fade-in slide-in-from-bottom-4 duration-300">
                <h2 className="text-2xl font-bold text-foreground">Agendamento Rápido</h2>
                <p className="text-sm text-muted-foreground mt-1">Cliente: <strong className="text-foreground">{cliente.nome}</strong></p>

                {erroAgendar && <div className="mt-4"><ErrorAlert message={erroAgendar} onDismiss={() => setErroAgendar('')} /></div>}

                <form onSubmit={handleConfirmarAgendamento} className="space-y-4 mt-6">
                    <div>
                        <label className="block text-sm font-semibold text-foreground mb-2">Profissional *</label>
                        <select required value={novaReserva.funcionarioId} onChange={e => setNovaReserva({ ...novaReserva, funcionarioId: e.target.value })} className="w-full border border-border rounded-lg px-4 py-2.5 outline-none focus:border-primary focus:ring-2 focus:ring-primary/10 bg-white text-foreground">
                            <option value="">Selecione...</option>
                            {profissionaisList.map(p => <option key={p.id} value={p.id}>{p.nome}</option>)}
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-semibold text-foreground mb-2">Serviço *</label>
                        <select required value={novaReserva.servicoId} onChange={e => setNovaReserva({ ...novaReserva, servicoId: e.target.value })} className="w-full border border-border rounded-lg px-4 py-2.5 outline-none focus:border-primary focus:ring-2 focus:ring-primary/10 bg-white text-foreground">
                            <option value="">Selecione...</option>
                            {servicosList.map(s => <option key={s.id} value={s.id}>{s.nome}</option>)}
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-semibold text-foreground mb-2">Data e Hora *</label>
                        <input required type="datetime-local" value={novaReserva.dataHora} onChange={e => setNovaReserva({ ...novaReserva, dataHora: e.target.value })} className="w-full border border-border rounded-lg px-4 py-2.5 outline-none focus:border-primary focus:ring-2 focus:ring-primary/10 bg-white text-foreground" />
                    </div>
                    <div className="flex justify-end gap-3 mt-8 pt-4 border-t border-border">
                        <button type="button" onClick={onClose} className="px-5 py-2.5 text-muted-foreground font-bold hover:bg-muted rounded-lg transition-colors text-sm">Cancelar</button>
                        <button type="submit" disabled={loadingAgendar} className="px-6 py-2.5 bg-primary hover:bg-primary/90 text-primary-foreground font-bold rounded-lg transition-all flex items-center justify-center gap-2 disabled:opacity-50 text-sm">
                            {loadingAgendar ? <><Loader2 className="w-4 h-4 animate-spin" /> Agendando...</> : 'Confirmar Agendamento'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    )
}
