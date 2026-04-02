import React, { useState } from 'react'
import { Loader2 } from 'lucide-react'
import { criarCliente } from '@/app/actions/cliente'
import { clienteFormSchema, formatarTelefone, formatarCPF, ErrorAlert, logError, type FormClienteType } from './helpers'
import { CalendarDays } from 'lucide-react'

interface Props {
    onClose: () => void;
    onSuccess: () => void;
}

export function ModalCriarCliente({ onClose, onSuccess }: Props) {
    const [formCriar, setFormCriar] = useState<FormClienteType>({ nome: '', telefone: '', email: '', cpf: '', dataNascimento: '' })
    const [loadingCriar, setLoadingCriar] = useState(false)
    const [erroCriar, setErroCriar] = useState('')

    const handleCriarCliente = async (e: React.FormEvent) => {
        e.preventDefault()
        const validacao = clienteFormSchema.safeParse(formCriar)
        if (!validacao.success) { setErroCriar(validacao.error.issues[0]?.message || 'Dados inválidos'); return }

        setLoadingCriar(true)
        setErroCriar('')
        try {
            const res = await criarCliente({
                nome: formCriar.nome,
                telefone: formCriar.telefone,
                email: formCriar.email || null,
                cpf: formCriar.cpf || null,
                dataNascimento: formCriar.dataNascimento || null,
            })
            if (res.sucesso) onSuccess()
            else setErroCriar(res.erro)
        } catch (error) {
            setErroCriar('Falha ao criar cliente')
            logError('handleCriarCliente', error)
        } finally {
            setLoadingCriar(false)
        }
    }

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <div className="bg-card rounded-2xl shadow-2xl w-full max-w-md p-6 border-t-4 border-t-primary animate-in fade-in slide-in-from-bottom-4 duration-300">
                <h2 className="text-2xl font-bold text-foreground">Novo Cliente</h2>
                <p className="text-sm text-muted-foreground mt-1">Cadastre um novo cliente manualmente.</p>

                {erroCriar && <div className="mt-4"><ErrorAlert message={erroCriar} onDismiss={() => setErroCriar('')} /></div>}

                <form onSubmit={handleCriarCliente} className="space-y-4 mt-6">
                    <div>
                        <label className="block text-sm font-semibold text-foreground mb-2">Nome completo *</label>
                        <input required type="text" placeholder="Ex: Maria Silva" value={formCriar.nome} onChange={(e) => setFormCriar({ ...formCriar, nome: e.target.value })} className="w-full border border-border rounded-lg px-4 py-2.5 outline-none focus:border-primary focus:ring-2 focus:ring-primary/10 transition-colors bg-white" />
                    </div>
                    <div>
                        <label className="block text-sm font-semibold text-foreground mb-2">WhatsApp / Telefone *</label>
                        <input required type="tel" placeholder="(11) 90000-0000" value={formCriar.telefone} onChange={(e) => setFormCriar({ ...formCriar, telefone: formatarTelefone(e.target.value) })} maxLength={15} className="w-full border border-border rounded-lg px-4 py-2.5 outline-none focus:border-primary focus:ring-2 focus:ring-primary/10 transition-colors bg-white" />
                    </div>
                    <div>
                        <label className="block text-sm font-semibold text-foreground mb-2">Email <span className="text-muted-foreground font-normal">(opcional)</span></label>
                        <input type="email" placeholder="cliente@email.com" value={formCriar.email || ''} onChange={(e) => setFormCriar({ ...formCriar, email: e.target.value })} className="w-full border border-border rounded-lg px-4 py-2.5 outline-none focus:border-primary focus:ring-2 focus:ring-primary/10 transition-colors bg-white" />
                    </div>
                    <div>
                        <label className="block text-sm font-semibold text-foreground mb-2">CPF <span className="text-muted-foreground font-normal">(opcional)</span></label>
                        <input type="text" placeholder="000.000.000-00" value={formCriar.cpf || ''} onChange={(e) => setFormCriar({ ...formCriar, cpf: formatarCPF(e.target.value) })} maxLength={14} className="w-full border border-border rounded-lg px-4 py-2.5 outline-none focus:border-primary focus:ring-2 focus:ring-primary/10 transition-colors bg-white" />
                    </div>
                    <div>
                        <label className="block text-sm font-semibold text-foreground mb-2 flex items-center gap-1.5">
                            <CalendarDays className="w-4 h-4 text-muted-foreground" />
                            Data de Nascimento <span className="text-muted-foreground font-normal">(opcional)</span>
                        </label>
                        <input
                            type="date"
                            max={new Date().toISOString().split('T')[0]}
                            value={formCriar.dataNascimento || ''}
                            onChange={(e) => setFormCriar({ ...formCriar, dataNascimento: e.target.value })}
                            className="w-full border border-border rounded-lg px-4 py-2.5 outline-none focus:border-primary focus:ring-2 focus:ring-primary/10 transition-colors bg-white"
                        />
                    </div>
                    <div className="flex justify-end gap-3 mt-8 pt-4 border-t border-border">
                        <button type="button" onClick={onClose} className="px-5 py-2.5 text-muted-foreground font-bold hover:bg-muted rounded-lg transition-colors text-sm">Cancelar</button>
                        <button type="submit" disabled={loadingCriar} className="px-6 py-2.5 bg-primary hover:bg-primary/90 text-primary-foreground font-bold rounded-lg transition-all flex items-center justify-center gap-2 disabled:opacity-50 text-sm">
                            {loadingCriar ? <><Loader2 className="w-4 h-4 animate-spin" /> A Criar...</> : 'Criar Cliente'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    )
}