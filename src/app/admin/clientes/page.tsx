'use client'

import React, { useState, useEffect, useCallback } from 'react'
import {
    listarTodosClientes,
    excluirClientePermanente,
    anonimizarClienteLGPD,
    type ClienteResumo,
} from '@/app/actions/cliente'
import { listarEquipaAdmin } from '@/app/actions/admin'
import { listarServicosAdmin } from '@/app/actions/servico'
import { AlertCircle, Loader2, Search } from 'lucide-react'
import AdminHeader from '@/components/admin/AdminHeader'
import { ClienteRow } from '@/components/admin/cliente-row'
import { ModalAgendamento } from '@/components/ModalAgendamento'

// Importação dos Componentes Extraídos
import { exibirTelefone, logError } from './components/helpers'
import { ModalCriarCliente } from './components/ModalCriarCliente'
import { ModalEditarCliente, type ClienteParaEdicao } from './components/ModalEditarCliente'
import { ModalAgendamentoRapido } from './components/ModalAgendamentoRapido'
import { ModalHistoricoCliente } from './components/ModalHistoricoCliente'
import { ModalDividasCliente } from './components/ModalDividasCliente'

// Type Casting seguro
const ModalAgendamentoCompat = ModalAgendamento as React.FC<{ isOpen?: boolean; onClose?: () => void; }>;

export default function GestaoClientesAdminPage() {
    const [clientes, setClientes] = useState<ClienteResumo[]>([])
    const [busca, setBusca] = useState('')
    const [loading, setLoading] = useState(true)
    const [apenasInadimplentes, setApenasInadimplentes] = useState(false)

    // Listas auxiliares (Totalmente tipadas)
    const [profissionaisList, setProfissionaisList] = useState<{ id: string; nome: string }[]>([])
    const [servicosList, setServicosList] = useState<{ id: string; nome: string }[]>([])

    // Controlo de Modais (Estados Simples)
    const [modalCriarOpen, setModalCriarOpen] = useState(false)
    const [clienteEditar, setClienteEditar] = useState<ClienteParaEdicao | null>(null)
    const [clienteAgendar, setClienteAgendar] = useState<{ id: string; nome: string } | null>(null)
    const [clienteHistorico, setClienteHistorico] = useState<string | null>(null)
    const [clienteDividas, setClienteDividas] = useState<{ id: string; nome: string } | null>(null)
    const [modalCalendarioOpen, setModalCalendarioOpen] = useState(false)

    // Carregar Dados
    const carregarClientes = useCallback(async () => {
        setLoading(true)
        try {
            const res = await listarTodosClientes()
            // Early return resolve o bug do TypeScript com Union Types
            if (!res.sucesso) {
                logError('carregarClientes', res.erro)
                setClientes([])
                return
            }
            setClientes(res.data.clientes)
        } catch (error) {
            logError('carregarClientes', error)
            setClientes([])
        } finally {
            setLoading(false)
        }
    }, [])

    useEffect(() => { void carregarClientes() }, [carregarClientes])

    useEffect(() => {
        const fetchAuxiliares = async () => {
            try {
                const [resProf, resServ] = await Promise.all([listarEquipaAdmin(), listarServicosAdmin()])

                if (resProf.sucesso && resProf.data && 'equipa' in resProf.data) {
                    setProfissionaisList(resProf.data.equipa as { id: string; nome: string }[])
                }

                if (resServ.sucesso && resServ.data && 'servicos' in resServ.data) {
                    setServicosList(resServ.data.servicos as { id: string; nome: string }[])
                }
            } catch (err) {
                logError('fetchAuxiliares', err)
            }
        }
        void fetchAuxiliares()
    }, [])

    // Ações LGPD
    const handleExcluir = async (id: string, nome: string) => {
        if (!confirm(`Deseja excluir permanentemente o cliente ${nome}?`)) return
        const res = await excluirClientePermanente(id)
        if (!res.sucesso) {
            alert(res.erro)
            return
        }
        void carregarClientes()
    }

    const handleAnonimizar = async (id: string, nome: string) => {
        if (!confirm(`Deseja anonimizar (LGPD) os dados de ${nome}?`)) return
        const res = await anonimizarClienteLGPD(id)
        if (!res.sucesso) {
            alert(res.erro)
            return
        }
        void carregarClientes()
    }

    // Filtros e Tipagem segura para campos opcionais
    const clientesSeguros = Array.isArray(clientes) ? clientes : []
    const clientesFiltrados = clientesSeguros.filter(c => {
        if (apenasInadimplentes && !c.temDividaPendente) return false
        const termo = (busca || '').toLowerCase()
        if (!termo) return true

        return (
            (c.nome || '').toLowerCase().includes(termo) ||
            (c.telefone && c.telefone.includes(termo)) ||
            (c.email || '').toLowerCase().includes(termo) ||
            (c.cpf || '').includes(termo.replace(/\D/g, ''))
        )
    })

    const totalInadimplentes = clientesSeguros.filter(c => c.temDividaPendente).length

    return (
        <div className="min-h-screen bg-background font-sans">
            <AdminHeader
                titulo="Base de Clientes"
                subtitulo="Diretório inteligente, histórico de consumo e proteção de dados."
                abaAtiva="Clientes"
                botaoAcao={
                    <button
                        onClick={() => setModalCriarOpen(true)}
                        className="flex items-center justify-center gap-2 bg-primary text-primary-foreground px-5 py-2.5 rounded-xl font-bold text-sm shadow-sm active:scale-[0.98] w-max"
                    >
                        <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                            <path d="M7 1v12M1 7h12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                        </svg>
                        Novo Cliente
                    </button>
                }
            />

            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-4 pb-12 mt-6">
                <div className="flex flex-col sm:flex-row gap-3 mb-6">
                    <div className="relative flex-1 bg-white rounded-xl shadow-sm border border-border p-1">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground w-4 h-4" />
                        <input
                            type="text"
                            placeholder="Pesquisar por nome ou telefone..."
                            value={busca}
                            onChange={(e) => setBusca(e.target.value)}
                            className="w-full pl-11 pr-4 py-3 bg-transparent text-sm outline-none"
                        />
                    </div>
                    <button
                        type="button"
                        onClick={() => setApenasInadimplentes(v => !v)}
                        className={`flex items-center gap-2.5 px-4 py-2.5 rounded-xl border font-semibold text-sm transition-all shadow-sm ${apenasInadimplentes ? 'bg-red-600 text-white border-red-700 shadow-red-200' : 'bg-white text-gray-600 border-border hover:border-red-300 hover:text-red-700'}`}
                    >
                        <AlertCircle className="w-4 h-4" /> Inadimplentes
                        {totalInadimplentes > 0 && (
                            <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-black ${apenasInadimplentes ? 'bg-white/20 text-white' : 'bg-red-100 text-red-700'}`}>
                                {totalInadimplentes}
                            </span>
                        )}
                    </button>
                </div>

                <section className="bg-white rounded-2xl shadow-sm border border-border overflow-hidden">
                    <div className="hidden border-b border-border bg-muted/50 px-4 py-3 sm:flex sm:px-6">
                        <span className="w-10" />
                        <span className="ml-4 flex-1 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Cliente & Contato</span>
                        <span className="mr-8 text-right text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Métricas</span>
                        <span className="w-5" />
                    </div>
                    {loading ? (
                        <div className="p-12 text-center text-muted-foreground text-sm flex flex-col items-center gap-3"><Loader2 className="w-6 h-6 animate-spin text-primary" /> Carregando diretório...</div>
                    ) : clientesFiltrados.length === 0 ? (
                        <div className="p-12 text-center text-muted-foreground text-sm">Nenhum cliente encontrado.</div>
                    ) : (
                        <div className="flex flex-col">
                            {clientesFiltrados.map((cliente) => {
                                const isAnonimizado = cliente.anonimizado
                                return (
                                    <ClienteRow
                                        key={cliente.id}
                                        cliente={{
                                            id: cliente.id,
                                            nome: isAnonimizado ? 'Anonimizado' : cliente.nome,
                                            telefone: exibirTelefone(cliente.telefone),
                                            totalGasto: 0,
                                            visitas: cliente._count?.agendamentos ?? 0,
                                            temDividaPendente: cliente.temDividaPendente
                                        }}
                                        onAgendar={!isAnonimizado ? () => setClienteAgendar({ id: cliente.id, nome: cliente.nome }) : undefined}
                                        onHistorico={() => setClienteHistorico(cliente.id)}
                                        onEditar={!isAnonimizado ? () => setClienteEditar({ id: cliente.id, nome: cliente.nome, telefone: exibirTelefone(cliente.telefone), email: cliente.email, cpf: cliente.cpf, dataNascimento: cliente.dataNascimento }) : undefined}
                                        onLgpd={!isAnonimizado ? () => handleAnonimizar(cliente.id, cliente.nome) : undefined}
                                        onExcluir={!isAnonimizado ? () => handleExcluir(cliente.id, cliente.nome) : undefined}
                                        onDividas={cliente.temDividaPendente ? () => setClienteDividas({ id: cliente.id, nome: cliente.nome }) : undefined}
                                    />
                                )
                            })}
                        </div>
                    )}
                </section>
            </div>

            {/* Modais Dinâmicos */}
            {modalCriarOpen && <ModalCriarCliente onClose={() => setModalCriarOpen(false)} onSuccess={() => { setModalCriarOpen(false); void carregarClientes(); }} />}
            {clienteEditar && <ModalEditarCliente cliente={clienteEditar} onClose={() => setClienteEditar(null)} onSuccess={() => { setClienteEditar(null); void carregarClientes(); }} />}
            {clienteAgendar && <ModalAgendamentoRapido cliente={clienteAgendar} profissionaisList={profissionaisList} servicosList={servicosList} onClose={() => setClienteAgendar(null)} onSuccess={() => { setClienteAgendar(null); void carregarClientes(); }} />}
            {clienteHistorico && <ModalHistoricoCliente clienteId={clienteHistorico} onClose={() => setClienteHistorico(null)} />}
            {clienteDividas && <ModalDividasCliente cliente={clienteDividas} onClose={() => setClienteDividas(null)} onSuccess={() => void carregarClientes()} />}
            {modalCalendarioOpen && <ModalAgendamentoCompat isOpen={modalCalendarioOpen} onClose={() => setModalCalendarioOpen(false)} />}
        </div>
    )
}
