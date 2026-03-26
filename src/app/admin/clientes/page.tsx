'use client'

import { useState, useEffect, useCallback } from 'react'
import { z } from 'zod'
import {
    listarTodosClientes,
    obterHistoricoCliente,
    excluirClientePermanente,
    anonimizarClienteLGPD,
    criarCliente,
    editarCliente,
    type HistoricoClienteData
} from '@/app/actions/cliente'
import { criarAgendamentoMultiplo } from '@/app/actions/agendamento'
import type { Cliente } from '@/types/domain'
import { AlertCircle, Loader2, X } from 'lucide-react'
import AdminHeader from '@/components/admin/AdminHeader'

type ClienteListaItem = Cliente & { _count: { agendamentos: number } }

// ── Validation Schemas ────────────────────────────────────────────────────────

const clienteFormSchema = z.object({
    nome: z.string().min(3, 'Nome deve ter pelo menos 3 caracteres').max(100),
    telefone: z.string().min(10, 'Telefone inválido').max(15),
    email: z.string().email('Email inválido').or(z.literal('')).optional(),
    cpf: z.string().regex(/^\d{3}\.\d{3}\.\d{3}-\d{2}$|^$/, 'CPF inválido').optional(),
})

type FormClienteType = z.infer<typeof clienteFormSchema>

const agendamentoSchema = z.object({
    funcionarioId: z.string().min(1, 'ID do profissional obrigatório'),
    servicoId: z.string().min(1, 'ID do serviço obrigatório'),
    dataHora: z.string().min(1, 'Data e hora obrigatória'),
})

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatarTelefone(valor: string): string {
    let v = valor.replace(/\D/g, '')
    if (v.length > 11) v = v.slice(0, 11)
    if (v.length > 2) v = v.replace(/^(\d{2})(\d)/g, '($1) $2')
    if (v.length > 7) v = v.replace(/(\d{5})(\d)/, '$1-$2')
    return v
}

function formatarCPF(valor: string): string {
    let v = valor.replace(/\D/g, '')
    if (v.length > 11) v = v.slice(0, 11)
    if (v.length > 9) v = v.replace(/^(\d{3})(\d{3})(\d{3})(\d)/, '$1.$2.$3-$4')
    else if (v.length > 6) v = v.replace(/^(\d{3})(\d{3})(\d)/, '$1.$2.$3')
    else if (v.length > 3) v = v.replace(/^(\d{3})(\d)/, '$1.$2')
    return v
}

function exibirTelefone(tel: string): string {
    if (!tel || tel.startsWith('EXCLUIDO')) return 'Anonimizado'
    const v = tel.replace(/\D/g, '')
    if (v.length === 11) return `(${v.slice(0, 2)}) ${v.slice(2, 7)}-${v.slice(7)}`
    if (v.length === 10) return `(${v.slice(0, 2)}) ${v.slice(2, 6)}-${v.slice(6)}`
    return tel
}

function exibirCPF(cpf: string | null | undefined): string {
    if (!cpf) return '—'
    const v = cpf.replace(/\D/g, '')
    if (v.length === 11) return `${v.slice(0, 3)}.${v.slice(3, 6)}.${v.slice(6, 9)}-${v.slice(9)}`
    return cpf
}

function logError(context: string, error: unknown): void {
    console.error(`[${context}]`, error instanceof Error ? error.message : error)
}

// ── Componentes de Erro ────────────────────────────────────────────────────────

interface ErrorAlertProps {
    message: string
    onDismiss?: () => void
}

function ErrorAlert({ message, onDismiss }: ErrorAlertProps) {
    return (
        <div className="flex items-start gap-3 p-3 bg-red-50 border border-red-200 rounded-lg">
            <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-red-700">{message}</p>
            </div>
            {onDismiss && (
                <button onClick={onDismiss} className="text-red-400 hover:text-red-600 flex-shrink-0">
                    <X className="w-4 h-4" />
                </button>
            )}
        </div>
    )
}

// ── Página Principal ──────────────────────────────────────────────────────────

export default function GestaoClientesAdminPage() {
    const [clientes, setClientes] = useState<ClienteListaItem[]>([])
    const [busca, setBusca] = useState('')
    const [loading, setLoading] = useState(true)
    const [acaoLoading, setAcaoLoading] = useState<string | null>(null)

    // Modal: Histórico
    const [modalHistoricoOpen, setModalHistoricoOpen] = useState(false)
    const [dadosHistorico, setDadosHistorico] = useState<HistoricoClienteData | null>(null)
    const [loadingHistorico, setLoadingHistorico] = useState(false)

    // Modal: Agendamento rápido
    const [modalAgendarOpen, setModalAgendarOpen] = useState(false)
    const [clienteAgendando, setClienteAgendando] = useState<{ id: string; nome: string } | null>(null)
    const [novaReserva, setNovaReserva] = useState({ funcionarioId: '', dataHora: '', servicoId: '' })
    const [loadingAgendar, setLoadingAgendar] = useState(false)
    const [erroAgendar, setErroAgendar] = useState('')

    // Modal: Criar cliente
    const [modalCriarOpen, setModalCriarOpen] = useState(false)
    const [formCriar, setFormCriar] = useState<FormClienteType>({ nome: '', telefone: '', email: '', cpf: '' })
    const [loadingCriar, setLoadingCriar] = useState(false)
    const [erroCriar, setErroCriar] = useState('')

    // Modal: Editar cliente
    const [modalEditarOpen, setModalEditarOpen] = useState(false)
    const [clienteEditando, setClienteEditando] = useState<ClienteListaItem | null>(null)
    const [formEditar, setFormEditar] = useState<FormClienteType>({ nome: '', telefone: '', email: '', cpf: '' })
    const [loadingEditar, setLoadingEditar] = useState(false)
    const [erroEditar, setErroEditar] = useState('')

    // ── Carregamento ────────────────────────────────────────────────────────

    const carregarClientes = useCallback(async () => {
        setLoading(true)
        try {
            const res = await listarTodosClientes()

            if (!res.sucesso) {
                logError('carregarClientes', 'Falha ao listar clientes')
                return
            }

            if ('clientes' in res) {
                setClientes(res.clientes as ClienteListaItem[])
            }
        } catch (error) {
            logError('carregarClientes', error)
        } finally {
            setLoading(false)
        }
    }, [])

    useEffect(() => { void carregarClientes() }, [carregarClientes])

    // ── LGPD / Exclusão ─────────────────────────────────────────────────────

    const handleExcluir = async (id: string, nome: string) => {
        if (!confirm(`Deseja excluir permanentemente o cliente ${nome}? Isto só é possível se não houver histórico de agendamentos associado.`)) {
            return
        }

        setAcaoLoading(id)
        try {
            const res = await excluirClientePermanente(id)

            if (!res.sucesso) {
                if ('erro' in res) {
                    logError('excluirClientePermanente', res.erro)
                }
                return
            }

            void carregarClientes()
        } catch (error) {
            logError('handleExcluir', error)
        } finally {
            setAcaoLoading(null)
        }
    }

    const handleAnonimizar = async (id: string, nome: string) => {
        if (!confirm(`Deseja anonimizar (LGPD) os dados de ${nome}? Esta ação é irreversível.`)) {
            return
        }

        setAcaoLoading(id)
        try {
            const res = await anonimizarClienteLGPD(id)

            if (!res.sucesso) {
                if ('erro' in res) {
                    logError('anonimizarClienteLGPD', res.erro)
                }
                return
            }

            void carregarClientes()
        } catch (error) {
            logError('handleAnonimizar', error)
        } finally {
            setAcaoLoading(null)
        }
    }

    // ── Agendamento rápido ───────────────────────────────────────────────────

    const abrirModalAgendar = (clienteId: string, clienteNome: string) => {
        setClienteAgendando({ id: clienteId, nome: clienteNome })
        setNovaReserva({ funcionarioId: '', dataHora: '', servicoId: '' })
        setErroAgendar('')
        setModalAgendarOpen(true)
    }

    const handleConfirmarAgendamento = async (e: React.FormEvent) => {
        e.preventDefault()

        if (!clienteAgendando) {
            setErroAgendar('Cliente não encontrado')
            return
        }

        const validacao = agendamentoSchema.safeParse(novaReserva)
        if (!validacao.success) {
            setErroAgendar(validacao.error.issues[0]?.message || 'Dados inválidos')
            return
        }

        setLoadingAgendar(true)
        setErroAgendar('')

        try {
            const res = await criarAgendamentoMultiplo(
                clienteAgendando.id,
                novaReserva.funcionarioId,
                new Date(novaReserva.dataHora),
                [novaReserva.servicoId]
            )

            if (!res.sucesso) {
                if ('erro' in res) {
                    setErroAgendar(res.erro)
                    logError('criarAgendamentoMultiplo', res.erro)
                }
                return
            }

            setModalAgendarOpen(false)
            void carregarClientes()
        } catch (error) {
            setErroAgendar('Falha técnica ao processar formulário')
            logError('handleConfirmarAgendamento', error)
        } finally {
            setLoadingAgendar(false)
        }
    }

    // ── Histórico ────────────────────────────────────────────────────────────

    const abrirModalHistorico = async (clienteId: string) => {
        setModalHistoricoOpen(true)
        setLoadingHistorico(true)
        setDadosHistorico(null)

        try {
            const res = await obterHistoricoCliente(clienteId)

            if (!res.sucesso) {
                logError('obterHistoricoCliente', 'erro' in res ? res.erro : 'Erro desconhecido')
                setModalHistoricoOpen(false)
                return
            }

            if ('dados' in res) {
                setDadosHistorico(res.dados as HistoricoClienteData)
            }
        } catch (error) {
            logError('abrirModalHistorico', error)
            setModalHistoricoOpen(false)
        } finally {
            setLoadingHistorico(false)
        }
    }

    // ── Criar cliente ────────────────────────────────────────────────────────

    const handleCriarCliente = async (e: React.FormEvent) => {
        e.preventDefault()

        const validacao = clienteFormSchema.safeParse(formCriar)
        if (!validacao.success) {
            const primeiroErro = validacao.error.issues[0]
            setErroCriar(primeiroErro?.message || 'Dados inválidos')
            return
        }

        setLoadingCriar(true)
        setErroCriar('')

        try {
            const res = await criarCliente({
                nome: formCriar.nome,
                telefone: formCriar.telefone,
                email: formCriar.email || null,
                cpf: formCriar.cpf || null,
            })

            if (!res.sucesso) {
                if ('erro' in res) {
                    setErroCriar(res.erro)
                    logError('criarCliente', res.erro)
                }
                return
            }

            setModalCriarOpen(false)
            setFormCriar({ nome: '', telefone: '', email: '', cpf: '' })
            void carregarClientes()
        } catch (error) {
            setErroCriar('Falha ao criar cliente')
            logError('handleCriarCliente', error)
        } finally {
            setLoadingCriar(false)
        }
    }

    // ── Editar cliente ───────────────────────────────────────────────────────

    const abrirModalEditar = (cliente: ClienteListaItem) => {
        setClienteEditando(cliente)
        const c = cliente as ClienteListaItem & { email?: string; cpf?: string }
        setFormEditar({
            nome: cliente.nome,
            telefone: exibirTelefone(cliente.telefone),
            email: c.email ?? '',
            cpf: c.cpf ? exibirCPF(c.cpf) : '',
        })
        setErroEditar('')
        setModalEditarOpen(true)
    }

    const handleEditarCliente = async (e: React.FormEvent) => {
        e.preventDefault()

        if (!clienteEditando) {
            setErroEditar('Cliente não encontrado')
            return
        }

        const validacao = clienteFormSchema.safeParse(formEditar)
        if (!validacao.success) {
            const primeiroErro = validacao.error.issues[0]
            setErroEditar(primeiroErro?.message || 'Dados inválidos')
            return
        }

        setLoadingEditar(true)
        setErroEditar('')

        try {
            const res = await editarCliente(clienteEditando.id, {
                nome: formEditar.nome,
                telefone: formEditar.telefone,
                email: formEditar.email || null,
                cpf: formEditar.cpf || null,
            })

            if (!res.sucesso) {
                if ('erro' in res) {
                    setErroEditar(res.erro)
                    logError('editarCliente', res.erro)
                }
                return
            }

            setModalEditarOpen(false)
            void carregarClientes()
        } catch (error) {
            setErroEditar('Falha ao editar cliente')
            logError('handleEditarCliente', error)
        } finally {
            setLoadingEditar(false)
        }
    }

    // ── Filtro ───────────────────────────────────────────────────────────────

    const clientesFiltrados = clientes.filter(c => {
        const termo = busca.toLowerCase()
        const clienteRecord = c as ClienteListaItem & { email?: string; cpf?: string }
        const matchNome = c.nome.toLowerCase().includes(termo)
        const matchTelefone = c.telefone && c.telefone.includes(termo)
        const matchEmail = clienteRecord.email?.toLowerCase().includes(termo)
        const matchCpf = clienteRecord.cpf?.includes(termo.replace(/\D/g, ''))
        return matchNome || matchTelefone || matchEmail || matchCpf
    })

    // ── Render ───────────────────────────────────────────────────────────────

    return (
        <div className="min-h-screen bg-[#fdfbf7] font-sans">
            <AdminHeader 
                titulo="Base de Clientes"
                subtitulo="Histórico de consumo, agendamentos rápidos e proteção de dados (LGPD)."
                abaAtiva="Clientes"
                botaoAcao={
                    <button
                        onClick={() => {
                            setFormCriar({ nome: '', telefone: '', email: '', cpf: '' })
                            setErroCriar('')
                            setModalCriarOpen(true)
                        }}
                        className="flex items-center justify-center gap-2 bg-marrom-medio text-white px-5 py-2.5 rounded-xl font-bold text-sm hover:bg-[#3e2b22] transition-colors shadow-sm active:scale-[0.98]"
                    >
                        <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
                            <path d="M7 1v12M1 7h12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                        </svg>
                        Novo Cliente
                    </button>
                }
            />

            <div className="max-w-7xl mx-auto px-4 md:px-8 space-y-6 pb-12">
                {/* Pesquisa */}
                <div className="relative bg-white rounded-xl shadow-sm border border-gray-100 p-1">
                    <svg className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" /></svg>
                    <input
                        type="text"
                        placeholder="Pesquisar por nome, telefone, email ou CPF..."
                        value={busca}
                        onChange={(e) => setBusca(e.target.value)}
                        className="w-full pl-11 pr-4 py-3 bg-transparent text-sm outline-none focus:ring-0 transition-all"
                    />
                </div>

                {/* Tabela */}
                <section className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                    <div className="px-6 md:px-8 py-5 border-b border-gray-100 bg-gray-50/50">
                        <h2 className="font-bold text-[#5C4033] text-lg tracking-tight">Diretório Global</h2>
                    </div>
                    {loading ? (
                        <div className="p-8 text-center text-gray-500 font-bold tracking-wider uppercase text-sm flex items-center justify-center gap-2">
                            <Loader2 className="w-4 h-4 animate-spin" />
                            A carregar clientes...
                        </div>
                    ) : clientesFiltrados.length === 0 ? (
                        <div className="p-8 text-center text-gray-500 text-sm">Nenhum cliente encontrado.</div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="bg-gray-50/50 text-gray-400 text-xs uppercase tracking-widest border-b border-gray-100">
                                        <th className="px-6 py-4 font-bold">Cliente</th>
                                        <th className="px-6 py-4 font-bold">Contacto</th>
                                        <th className="px-6 py-4 font-bold text-center">Visitas</th>
                                        <th className="px-6 py-4 font-bold text-center">Status</th>
                                        <th className="px-6 py-4 font-bold text-right">Ações</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {clientesFiltrados.map((cliente) => {
                                    const totalAgendamentos = cliente._count?.agendamentos || 0
                                    const isLoading = acaoLoading === cliente.id
                                    const isAnonimizado = cliente.anonimizado
                                    const c = cliente as ClienteListaItem & { email?: string; cpf?: string }

                                    return (
                                        <tr key={cliente.id} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                                            <td className="px-6 py-4">
                                                <p className={`font-bold text-sm ${isAnonimizado ? 'text-gray-400 italic' : 'text-gray-800'}`}>
                                                    {cliente.nome}
                                                </p>
                                                {c.cpf && (
                                                    <p className="text-xs text-gray-400 mt-0.5 font-mono">
                                                        CPF: {exibirCPF(c.cpf)}
                                                    </p>
                                                )}
                                            </td>
                                            <td className="px-6 py-4">
                                                <p className="text-xs md:text-sm text-gray-700 font-mono">{exibirTelefone(cliente.telefone)}</p>
                                                {c.email && (
                                                    <p className="text-xs text-gray-500 mt-0.5 truncate">{c.email}</p>
                                                )}
                                            </td>
                                            <td className="px-6 py-4 text-center font-semibold text-[#8B5A2B] text-sm">
                                                {totalAgendamentos}
                                            </td>
                                            <td className="px-6 py-4 text-center">
                                                <span className={`px-2 md:px-2.5 py-1 text-[0.6rem] md:text-[0.65rem] font-bold rounded uppercase tracking-wider inline-block ${isAnonimizado ? 'bg-gray-100 text-gray-600 border border-gray-200' : 'bg-green-100 text-green-700 border border-green-200'}`}>
                                                    {isAnonimizado ? 'Anonimizado' : 'Ativo'}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4">
                                                {!isAnonimizado ? (
                                                    <div className="flex justify-end items-center gap-1 md:gap-2 flex-wrap">
                                                        <button
                                                            onClick={() => abrirModalAgendar(cliente.id, cliente.nome)}
                                                            disabled={isLoading}
                                                            className="px-2 md:px-3 py-1 md:py-1.5 bg-[#8B5A2B] text-white rounded text-xs font-bold hover:bg-[#704620] transition-colors shadow-sm disabled:opacity-50"
                                                        >
                                                            Agendar
                                                        </button>
                                                        <button
                                                            onClick={() => abrirModalHistorico(cliente.id)}
                                                            disabled={isLoading}
                                                            className="px-2 md:px-3 py-1 md:py-1.5 bg-blue-50 text-blue-700 border border-blue-200 rounded text-xs font-bold hover:bg-blue-100 transition-colors shadow-sm disabled:opacity-50"
                                                        >
                                                            Histórico
                                                        </button>
                                                        <button
                                                            onClick={() => abrirModalEditar(cliente)}
                                                            disabled={isLoading}
                                                            className="px-2 md:px-3 py-1 md:py-1.5 bg-orange-50 text-orange-700 border border-orange-200 rounded text-xs font-bold hover:bg-orange-100 transition-colors shadow-sm disabled:opacity-50"
                                                        >
                                                            Editar
                                                        </button>

                                                        <div className="w-px h-5 md:h-6 bg-gray-200 mx-0.5 md:mx-1" />

                                                        <button
                                                            onClick={() => handleAnonimizar(cliente.id, cliente.nome)}
                                                            disabled={isLoading}
                                                            className={`px-2 md:px-3 py-1 md:py-1.5 rounded text-xs font-bold border transition-colors shadow-sm ${isLoading ? 'bg-gray-100 text-gray-400 border-gray-200' : 'bg-orange-50 text-orange-600 border-orange-200 hover:bg-orange-100'}`}
                                                        >
                                                            LGPD
                                                        </button>
                                                        <button
                                                            onClick={() => handleExcluir(cliente.id, cliente.nome)}
                                                            disabled={isLoading || totalAgendamentos > 0}
                                                            className={`px-2 md:px-3 py-1 md:py-1.5 rounded text-xs font-bold border transition-colors shadow-sm ${isLoading || totalAgendamentos > 0 ? 'bg-gray-50 text-gray-300 border-gray-100' : 'bg-red-50 text-red-600 border-red-200 hover:bg-red-100'}`}
                                                        >
                                                            Excluir
                                                        </button>
                                                    </div>
                                                ) : (
                                                    <span className="text-xs text-gray-400 italic">Ação Irreversível</span>
                                                )}
                                            </td>
                                        </tr>
                                    )
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
            </section>
            </div>

            {/* ── MODAL: CRIAR CLIENTE ── */}
            {modalCriarOpen && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 border-t-4 border-t-[#5C4033] animate-in fade-in slide-in-from-bottom-4 duration-300">
                        <div>
                            <h2 className="text-2xl font-bold text-[#5C4033]">Novo Cliente</h2>
                            <p className="text-sm text-gray-500 mt-1">Cadastre um novo cliente manualmente.</p>
                        </div>

                        {erroCriar && (
                            <div className="mt-4">
                                <ErrorAlert message={erroCriar} onDismiss={() => setErroCriar('')} />
                            </div>
                        )}

                        <form onSubmit={handleCriarCliente} className="space-y-4 mt-6">
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-2">Nome completo *</label>
                                <input
                                    required
                                    type="text"
                                    placeholder="Ex: Maria Silva"
                                    value={formCriar.nome}
                                    onChange={(e) => setFormCriar({ ...formCriar, nome: e.target.value })}
                                    className="w-full border border-gray-300 rounded-lg px-4 py-2.5 outline-none focus:border-[#8B5A2B] focus:ring-2 focus:ring-[#8B5A2B]/10 transition-colors"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-2">WhatsApp / Telefone *</label>
                                <input
                                    required
                                    type="tel"
                                    placeholder="(11) 90000-0000"
                                    value={formCriar.telefone}
                                    onChange={(e) => setFormCriar({ ...formCriar, telefone: formatarTelefone(e.target.value) })}
                                    maxLength={15}
                                    className="w-full border border-gray-300 rounded-lg px-4 py-2.5 outline-none focus:border-[#8B5A2B] focus:ring-2 focus:ring-[#8B5A2B]/10 transition-colors"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-2">
                                    Email <span className="text-gray-400 font-normal">(opcional)</span>
                                </label>
                                <input
                                    type="email"
                                    placeholder="cliente@email.com"
                                    value={formCriar.email || ''}
                                    onChange={(e) => setFormCriar({ ...formCriar, email: e.target.value })}
                                    className="w-full border border-gray-300 rounded-lg px-4 py-2.5 outline-none focus:border-[#8B5A2B] focus:ring-2 focus:ring-[#8B5A2B]/10 transition-colors"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-2">
                                    CPF <span className="text-gray-400 font-normal">(opcional)</span>
                                </label>
                                <input
                                    type="text"
                                    placeholder="000.000.000-00"
                                    value={formCriar.cpf || ''}
                                    onChange={(e) => setFormCriar({ ...formCriar, cpf: formatarCPF(e.target.value) })}
                                    maxLength={14}
                                    className="w-full border border-gray-300 rounded-lg px-4 py-2.5 outline-none focus:border-[#8B5A2B] focus:ring-2 focus:ring-[#8B5A2B]/10 transition-colors"
                                />
                            </div>

                            <div className="flex justify-end gap-3 mt-8 pt-4 border-t border-gray-100">
                                <button
                                    type="button"
                                    onClick={() => setModalCriarOpen(false)}
                                    className="px-5 py-2.5 text-gray-600 font-bold hover:bg-gray-100 rounded-lg transition-colors text-sm"
                                >
                                    Cancelar
                                </button>
                                <button
                                    type="submit"
                                    disabled={loadingCriar}
                                    className="px-6 py-2.5 bg-[#5C4033] hover:bg-[#3e2b22] text-white font-bold rounded-lg transition-all flex items-center justify-center gap-2 disabled:opacity-50 text-sm"
                                >
                                    {loadingCriar ? (
                                        <>
                                            <Loader2 className="w-4 h-4 animate-spin" />
                                            A Criar...
                                        </>
                                    ) : (
                                        'Criar Cliente'
                                    )}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* ── MODAL: EDITAR CLIENTE ── */}
            {modalEditarOpen && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 border-t-4 border-t-[#8B5A2B] animate-in fade-in slide-in-from-bottom-4 duration-300">
                        <div>
                            <h2 className="text-2xl font-bold text-[#5C4033]">Editar Cliente</h2>
                            <p className="text-sm text-gray-500 mt-1">
                                A editar: <strong className="text-gray-800">{clienteEditando?.nome}</strong>
                            </p>
                        </div>

                        {erroEditar && (
                            <div className="mt-4">
                                <ErrorAlert message={erroEditar} onDismiss={() => setErroEditar('')} />
                            </div>
                        )}

                        <form onSubmit={handleEditarCliente} className="space-y-4 mt-6">
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-2">Nome completo *</label>
                                <input
                                    required
                                    type="text"
                                    value={formEditar.nome}
                                    onChange={(e) => setFormEditar({ ...formEditar, nome: e.target.value })}
                                    className="w-full border border-gray-300 rounded-lg px-4 py-2.5 outline-none focus:border-[#8B5A2B] focus:ring-2 focus:ring-[#8B5A2B]/10 transition-colors"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-2">WhatsApp / Telefone *</label>
                                <input
                                    required
                                    type="tel"
                                    placeholder="(11) 90000-0000"
                                    value={formEditar.telefone}
                                    onChange={(e) => setFormEditar({ ...formEditar, telefone: formatarTelefone(e.target.value) })}
                                    maxLength={15}
                                    className="w-full border border-gray-300 rounded-lg px-4 py-2.5 outline-none focus:border-[#8B5A2B] focus:ring-2 focus:ring-[#8B5A2B]/10 transition-colors"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-2">
                                    Email <span className="text-gray-400 font-normal">(opcional)</span>
                                </label>
                                <input
                                    type="email"
                                    placeholder="cliente@email.com"
                                    value={formEditar.email || ''}
                                    onChange={(e) => setFormEditar({ ...formEditar, email: e.target.value })}
                                    className="w-full border border-gray-300 rounded-lg px-4 py-2.5 outline-none focus:border-[#8B5A2B] focus:ring-2 focus:ring-[#8B5A2B]/10 transition-colors"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-2">
                                    CPF <span className="text-gray-400 font-normal">(opcional)</span>
                                </label>
                                <input
                                    type="text"
                                    placeholder="000.000.000-00"
                                    value={formEditar.cpf || ''}
                                    onChange={(e) => setFormEditar({ ...formEditar, cpf: formatarCPF(e.target.value) })}
                                    maxLength={14}
                                    className="w-full border border-gray-300 rounded-lg px-4 py-2.5 outline-none focus:border-[#8B5A2B] focus:ring-2 focus:ring-[#8B5A2B]/10 transition-colors"
                                />
                            </div>

                            <div className="flex justify-end gap-3 mt-8 pt-4 border-t border-gray-100">
                                <button
                                    type="button"
                                    onClick={() => setModalEditarOpen(false)}
                                    className="px-5 py-2.5 text-gray-600 font-bold hover:bg-gray-100 rounded-lg transition-colors text-sm"
                                >
                                    Cancelar
                                </button>
                                <button
                                    type="submit"
                                    disabled={loadingEditar}
                                    className="px-6 py-2.5 bg-[#8B5A2B] hover:bg-[#704620] text-white font-bold rounded-lg transition-all flex items-center justify-center gap-2 disabled:opacity-50 text-sm"
                                >
                                    {loadingEditar ? (
                                        <>
                                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                            A Guardar...
                                        </>
                                    ) : (
                                        'Salvar Alterações'
                                    )}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* ── MODAL: AGENDAMENTO RÁPIDO ── */}
            {modalAgendarOpen && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 border-t-4 border-t-[#5C4033] animate-in fade-in slide-in-from-bottom-4 duration-300">
                        <div>
                            <h2 className="text-2xl font-bold text-[#5C4033]">Agendamento Rápido</h2>
                            <p className="text-sm text-gray-500 mt-1">
                                Cliente: <strong className="text-gray-800">{clienteAgendando?.nome}</strong>
                            </p>
                        </div>

                        {erroAgendar && (
                            <div className="mt-4">
                                <ErrorAlert message={erroAgendar} onDismiss={() => setErroAgendar('')} />
                            </div>
                        )}

                        <form onSubmit={handleConfirmarAgendamento} className="space-y-4 mt-6">
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-2">ID do Profissional *</label>
                                <input
                                    required
                                    type="text"
                                    placeholder="Cole o ID do profissional..."
                                    value={novaReserva.funcionarioId}
                                    onChange={(e) => setNovaReserva({ ...novaReserva, funcionarioId: e.target.value })}
                                    className="w-full border border-gray-300 rounded-lg px-4 py-2.5 outline-none focus:border-[#8B5A2B] focus:ring-2 focus:ring-[#8B5A2B]/10 transition-colors"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-2">ID do Serviço *</label>
                                <input
                                    required
                                    type="text"
                                    placeholder="Cole o ID do serviço..."
                                    value={novaReserva.servicoId}
                                    onChange={(e) => setNovaReserva({ ...novaReserva, servicoId: e.target.value })}
                                    className="w-full border border-gray-300 rounded-lg px-4 py-2.5 outline-none focus:border-[#8B5A2B] focus:ring-2 focus:ring-[#8B5A2B]/10 transition-colors"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-2">Data e Hora *</label>
                                <input
                                    required
                                    type="datetime-local"
                                    value={novaReserva.dataHora}
                                    onChange={(e) => setNovaReserva({ ...novaReserva, dataHora: e.target.value })}
                                    className="w-full border border-gray-300 rounded-lg px-4 py-2.5 outline-none focus:border-[#8B5A2B] focus:ring-2 focus:ring-[#8B5A2B]/10 transition-colors"
                                />
                            </div>

                            <div className="flex justify-end gap-3 mt-8 pt-4 border-t border-gray-100">
                                <button
                                    type="button"
                                    onClick={() => setModalAgendarOpen(false)}
                                    className="px-5 py-2.5 text-gray-600 font-bold hover:bg-gray-100 rounded-lg transition-colors text-sm"
                                >
                                    Cancelar
                                </button>
                                <button
                                    type="submit"
                                    disabled={loadingAgendar}
                                    className="px-6 py-2.5 bg-[#5C4033] hover:bg-[#3e2b22] text-white font-bold rounded-lg transition-all flex items-center justify-center gap-2 disabled:opacity-50 text-sm"
                                >
                                    {loadingAgendar ? (
                                        <>
                                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                            A Marcar...
                                        </>
                                    ) : (
                                        'Confirmar Agenda'
                                    )}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* ── MODAL: HISTÓRICO DO CLIENTE ── */}
            {modalHistoricoOpen && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl border-t-4 border-t-[#8B5A2B] overflow-hidden flex flex-col max-h-[90vh] animate-in fade-in zoom-in-95 duration-200">
                        {loadingHistorico || !dadosHistorico ? (
                            <div className="p-8 md:p-16 text-center text-gray-500 font-bold flex items-center justify-center gap-2">
                                <Loader2 className="w-4 h-4 animate-spin" />
                                A carregar registos...
                            </div>
                        ) : (
                            <>
                                <div className="px-4 md:px-6 py-4 md:py-5 border-b border-gray-100 flex flex-col md:flex-row md:justify-between md:items-start gap-4 bg-gray-50/50">
                                    <div className="flex-1">
                                        <h2 className="text-xl md:text-2xl font-bold text-[#5C4033]">{dadosHistorico.cliente.nome}</h2>
                                        <p className="text-xs md:text-sm text-gray-500 font-mono mt-1">{exibirTelefone(dadosHistorico.cliente.telefone ?? '')}</p>
                                        {dadosHistorico.cliente.email && (
                                            <p className="text-xs text-gray-400 mt-0.5">{dadosHistorico.cliente.email}</p>
                                        )}
                                        {dadosHistorico.cliente.cpf && (
                                            <p className="text-xs text-gray-400 mt-0.5">CPF: {exibirCPF(dadosHistorico.cliente.cpf)}</p>
                                        )}
                                    </div>
                                    <div className="text-left md:text-right">
                                        <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">Total Gasto</p>
                                        <p className="text-lg md:text-xl font-black text-green-700">R$ {dadosHistorico.totalGasto.toFixed(2)}</p>
                                    </div>
                                </div>

                                <div className="p-4 md:p-6 overflow-y-auto flex-1 bg-[#fdfbf7] space-y-4">
                                    <h3 className="font-bold text-gray-800 text-xs md:text-sm uppercase tracking-wider mb-3 border-b border-gray-200 pb-2">
                                        Histórico de Visitas ({dadosHistorico.agendamentos.length})
                                    </h3>
                                    {dadosHistorico.agendamentos.length === 0 ? (
                                        <p className="text-center text-gray-400 italic py-6 md:py-8 bg-white rounded-lg border border-gray-200 text-sm">
                                            Cliente sem histórico de agendamentos.
                                        </p>
                                    ) : (
                                        dadosHistorico.agendamentos.map(ag => (
                                            <div key={ag.id} className="bg-white border border-gray-200 rounded-xl p-4 md:p-5 shadow-sm">
                                                <div className="flex flex-col md:flex-row md:justify-between md:items-start mb-3 border-b border-gray-50 pb-3 gap-2">
                                                    <div className="flex-1">
                                                        <span className="font-bold text-gray-800 text-sm block">
                                                            {new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }).format(new Date(ag.dataHoraInicio))}
                                                        </span>
                                                        <p className="text-xs text-gray-500 mt-1">
                                                            Atendido por: <strong className="text-[#5C4033]">{ag.funcionario.nome}</strong>
                                                        </p>
                                                    </div>
                                                    <div className="text-left md:text-right">
                                                        <span className={`px-2 md:px-2.5 py-1 text-[10px] font-bold rounded uppercase tracking-wider inline-block mb-1 ${ag.concluido ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'}`}>
                                                            {ag.concluido ? 'Faturado' : 'Pendente'}
                                                        </span>
                                                        <p className="font-black text-[#8B5A2B]">R$ {ag.valorBruto.toFixed(2)}</p>
                                                    </div>
                                                </div>
                                                <div className="text-xs md:text-sm text-gray-600">
                                                    <strong>Serviços:</strong> {ag.servicos.map(s => s.servico.nome).join(', ') || '—'}
                                                </div>
                                                {ag.produtos.length > 0 && (
                                                    <div className="text-xs md:text-sm text-gray-600 mt-2">
                                                        <strong>Produtos:</strong> {ag.produtos.map(p => p.produto.nome).join(', ')}
                                                    </div>
                                                )}
                                            </div>
                                        ))
                                    )}
                                </div>

                                <div className="px-4 md:px-6 py-3 md:py-4 bg-gray-50 border-t border-gray-100 flex justify-end">
                                    <button
                                        onClick={() => setModalHistoricoOpen(false)}
                                        className="px-5 py-2.5 text-gray-600 font-bold hover:bg-gray-100 rounded-lg transition-colors text-sm"
                                    >
                                        Fechar
                                    </button>
                                </div>
                            </>
                        )}
                    </div>
                </div>
            )}
        </div>
    )
}
