import React, { useState } from 'react'
import { Loader2 } from 'lucide-react'
import { editarCliente } from '@/app/actions/cliente'
import { clienteFormSchema, formatarTelefone, formatarCPF, ErrorAlert, logError, toDateInputValue, type FormClienteType } from './helpers'
import { CalendarDays } from 'lucide-react'

export type ClienteParaEdicao = {
    id: string; nome: string; telefone: string; email?: string | null; cpf?: string | null; dataNascimento?: Date | string | null;
}

interface Props {
    cliente: ClienteParaEdicao;
    onClose: () => void;
    onSuccess: () => void;
}

export function ModalEditarCliente({ cliente, onClose, onSuccess }: Props) {
    const [formEditar, setFormEditar] = useState<FormClienteType>({
        nome: cliente.nome,
        telefone: cliente.telefone,
        email: cliente.email || '',
        cpf: cliente.cpf || '',
        dataNascimento: toDateInputValue(cliente.dataNascimento),
    })
    const [loadingEditar, setLoadingEditar] = useState(false)
    const [erroEditar, setErroEditar] = useState('')

    const handleEditarCliente = async (e: React.FormEvent) => {
        e.preventDefault()
        const validacao = clienteFormSchema.safeParse(formEditar)
        if (!validacao.success) { setErroEditar(validacao.error.issues[0]?.message || 'Dados inválidos'); return }

        setLoadingEditar(true)
        setErroEditar('')
        try {
            const res = await editarCliente(cliente.id, {
                nome: formEditar.nome,
                telefone: formEditar.telefone,
                email: formEditar.email || null,
                cpf: formEditar.cpf || null,
                dataNascimento: formEditar.dataNascimento || null,
            })
            if (res.sucesso) onSuccess()
            else setErroEditar(res.erro)
        } catch (error) {
            setErroEditar('Falha ao editar cliente')
            logError('handleEditarCliente', error)
        } finally {
            setLoadingEditar(false)
        }
    }

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <div className="bg-card rounded-2xl shadow-2xl w-full max-w-md p-6 border-t-4 border-t-primary animate-in fade-in slide-in-from-bottom-4 duration-300">
                <h2 className="text-2xl font-bold text-foreground">Editar Cliente</h2>
                <p className="text-sm text-muted-foreground mt-1">A editar: <strong className="text-foreground">{cliente.nome}</strong></p>

                {erroEditar && <div className="mt-4"><ErrorAlert message={erroEditar} onDismiss={() => setErroEditar('')} /></div>}

                <form onSubmit={handleEditarCliente} className="space-y-4 mt-6">
                    <div>
                        <label className="block text-sm font-semibold text-foreground mb-2">Nome completo *</label>
                        <input required type="text" value={formEditar.nome} onChange={(e) => setFormEditar({ ...formEditar, nome: e.target.value })} className="w-full border border-border rounded-lg px-4 py-2.5 outline-none focus:border-primary focus:ring-2 focus:ring-primary/10 transition-colors bg-white" />
                    </div>
                    <div>
                        <label className="block text-sm font-semibold text-foreground mb-2">WhatsApp / Telefone *</label>
                        <input required type="tel" value={formEditar.telefone} onChange={(e) => setFormEditar({ ...formEditar, telefone: formatarTelefone(e.target.value) })} maxLength={15} className="w-full border border-border rounded-lg px-4 py-2.5 outline-none focus:border-primary focus:ring-2 focus:ring-primary/10 transition-colors bg-white" />
                    </div>
                    <div>
                        <label className="block text-sm font-semibold text-foreground mb-2">Email <span className="text-muted-foreground font-normal">(opcional)</span></label>
                        <input type="email" value={formEditar.email || ''} onChange={(e) => setFormEditar({ ...formEditar, email: e.target.value })} className="w-full border border-border rounded-lg px-4 py-2.5 outline-none focus:border-primary focus:ring-2 focus:ring-primary/10 transition-colors bg-white" />
                    </div>
                    <div>
                        <label className="block text-sm font-semibold text-foreground mb-2">CPF <span className="text-muted-foreground font-normal">(opcional)</span></label>
                        <input type="text" value={formEditar.cpf || ''} onChange={(e) => setFormEditar({ ...formEditar, cpf: formatarCPF(e.target.value) })} maxLength={14} className="w-full border border-border rounded-lg px-4 py-2.5 outline-none focus:border-primary focus:ring-2 focus:ring-primary/10 transition-colors bg-white" />
                    </div>
                    <div>
                        <label className="block text-sm font-semibold text-foreground mb-2 flex items-center gap-1.5">
                            <CalendarDays className="w-4 h-4 text-muted-foreground" />
                            Data de Nascimento <span className="text-muted-foreground font-normal">(opcional)</span>
                        </label>
                        <input
                            type="date"
                            max={new Date().toISOString().split('T')[0]}
                            value={formEditar.dataNascimento || ''}
                            onChange={(e) => setFormEditar({ ...formEditar, dataNascimento: e.target.value })}
                            className="w-full border border-border rounded-lg px-4 py-2.5 outline-none focus:border-primary focus:ring-2 focus:ring-primary/10 transition-colors bg-white"
                        />
                    </div>
                    <div className="flex justify-end gap-3 mt-8 pt-4 border-t border-border">
                        <button type="button" onClick={onClose} className="px-5 py-2.5 text-muted-foreground font-bold hover:bg-muted rounded-lg transition-colors text-sm">Cancelar</button>
                        <button type="submit" disabled={loadingEditar} className="px-6 py-2.5 bg-primary hover:bg-primary/90 text-primary-foreground font-bold rounded-lg transition-all flex items-center justify-center gap-2 disabled:opacity-50 text-sm">
                            {loadingEditar ? <><Loader2 className="w-4 h-4 animate-spin" /> A Guardar...</> : 'Salvar Alterações'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    )
}