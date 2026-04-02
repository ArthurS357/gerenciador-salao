import { z } from 'zod'
import { AlertCircle, X } from 'lucide-react'

export const clienteFormSchema = z.object({
    nome: z.string().min(3, 'Nome deve ter pelo menos 3 caracteres').max(100),
    telefone: z.string().min(10, 'Telefone inválido').max(15),
    email: z.string().email('Email inválido').or(z.literal('')).optional(),
    cpf: z.string().regex(/^\d{3}\.\d{3}\.\d{3}-\d{2}$|^$/, 'CPF inválido').optional(),
    dataNascimento: z.string().optional(),
})

export type FormClienteType = z.infer<typeof clienteFormSchema>

/** Converte Date | string | null | undefined para o formato YYYY-MM-DD exigido por <input type="date"> */
export function toDateInputValue(date: Date | string | null | undefined): string {
    if (!date) return ''
    const d = new Date(date)
    if (isNaN(d.getTime())) return ''
    return d.toISOString().split('T')[0]
}

export function formatarTelefone(valor: string): string {
    let v = (valor || '').replace(/\D/g, '')
    if (v.length > 11) v = v.slice(0, 11)
    if (v.length > 2) v = v.replace(/^(\d{2})(\d)/g, '($1) $2')
    if (v.length > 7) v = v.replace(/(\d{5})(\d)/, '$1-$2')
    return v
}

export function formatarCPF(valor: string): string {
    let v = (valor || '').replace(/\D/g, '')
    if (v.length > 11) v = v.slice(0, 11)
    if (v.length > 9) v = v.replace(/^(\d{3})(\d{3})(\d{3})(\d)/, '$1.$2.$3-$4')
    else if (v.length > 6) v = v.replace(/^(\d{3})(\d{3})(\d)/, '$1.$2.$3')
    else if (v.length > 3) v = v.replace(/^(\d{3})(\d)/, '$1.$2')
    return v
}

export function exibirTelefone(tel: string): string {
    if (!tel || tel.startsWith('EXCLUIDO')) return 'Anonimizado'
    const v = tel.replace(/\D/g, '')
    if (v.length === 11) return `(${v.slice(0, 2)}) ${v.slice(2, 7)}-${v.slice(7)}`
    if (v.length === 10) return `(${v.slice(0, 2)}) ${v.slice(2, 6)}-${v.slice(6)}`
    return tel
}

export function exibirCPF(cpf: string | null | undefined): string {
    if (!cpf) return '—'
    const v = cpf.replace(/\D/g, '')
    if (v.length === 11) return `${v.slice(0, 3)}.${v.slice(3, 6)}.${v.slice(6, 9)}-${v.slice(9)}`
    return cpf
}

export function fmt(valor: number): string {
    return (valor || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

export function logError(context: string, error: unknown): void {
    console.error(`[${context}]`, error instanceof Error ? error.message : error)
}

export function ErrorAlert({ message, onDismiss }: { message: string; onDismiss?: () => void }) {
    return (
        <div className="flex items-start gap-3 p-3 bg-red-50 border border-red-200 rounded-lg">
            <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-red-700">{message}</p>
            </div>
            {onDismiss && (
                <button onClick={onDismiss} type="button" className="text-red-400 hover:text-red-600 shrink-0">
                    <X className="w-4 h-4" />
                </button>
            )}
        </div>
    )
}