'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { listarTodosClientes } from '@/app/actions/cliente'
import { excluirClientePermanente, anonimizarClienteLGPD } from '@/app/actions/admin'

export default function GestaoClientesAdminPage() {
    const [clientes, setClientes] = useState<any[]>([])
    const [busca, setBusca] = useState('')
    const [loading, setLoading] = useState(true)
    const [acaoLoading, setAcaoLoading] = useState<string | null>(null)

    const carregarClientes = useCallback(async () => {
        setLoading(true)
        const res = await listarTodosClientes()
        if (res.sucesso && res.clientes) {
            setClientes(res.clientes)
        }
        setLoading(false)
    }, [])

    useEffect(() => { void carregarClientes() }, [carregarClientes])

    const handleExcluir = async (id: string, nome: string) => {
        if (!confirm(`Deseja excluir permanentemente o cliente ${nome}? Isto só é possível se não houver histórico de agendamentos associado.`)) return

        setAcaoLoading(id)
        const res = await excluirClientePermanente(id)
        if (res.sucesso) {
            alert('Cliente excluído fisicamente com sucesso.')
            void carregarClientes()
        } else {
            alert(res.erro || 'Erro ao excluir o cliente.')
        }
        setAcaoLoading(null)
    }

    const handleAnonimizar = async (id: string, nome: string) => {
        if (!confirm(`Deseja anonimizar (LGPD) os dados de ${nome}? O histórico financeiro será mantido para os relatórios, mas os dados pessoais serão apagados de forma irreversível.`)) return

        setAcaoLoading(id)
        const res = await anonimizarClienteLGPD(id)
        if (res.sucesso) {
            alert('Dados do cliente anonimizados com sucesso.')
            void carregarClientes()
        } else {
            alert(res.erro || 'Erro ao anonimizar os dados.')
        }
        setAcaoLoading(null)
    }

    // Filtra a lista com base no nome ou telefone
    const clientesFiltrados = clientes.filter(c => {
        const termo = busca.toLowerCase()
        const matchNome = c.nome.toLowerCase().includes(termo)
        const matchTelefone = c.telefone && c.telefone.includes(termo)
        return matchNome || matchTelefone
    })

    return (
        <div className="min-h-screen bg-[#fdfbf7] p-8 font-sans">
            <header className="mb-6 border-b-2 border-[#5C4033] pb-4">
                <h1 className="text-3xl font-bold text-[#5C4033]">Base de Clientes</h1>
                <p className="text-gray-500 mt-1">Faça a gestão dos clientes e garanta o cumprimento da proteção de dados (LGPD).</p>
            </header>

            {/* Navegação Horizontal Uniforme do Admin */}
            <nav className="flex flex-wrap gap-3 mb-8">
                {[
                    { href: '/admin/dashboard', label: 'Equipa (Atual)' },
                    { href: '/admin/financeiro', label: 'Financeiro' },
                    { href: '/admin/estoque', label: 'Estoque de Produtos' },
                    { href: '/admin/servicos', label: 'Portfólio / Serviços' },
                    { href: '/admin/agendamentos', label: 'Agendamentos Globais' },
                    { href: '/admin/clientes', label: 'Base de Clientes', ativo: true },
                ].map(({ href, label, ativo }) => (
                    <Link
                        key={href}
                        href={href}
                        className={
                            ativo
                                ? 'bg-[#5C4033] text-white px-5 py-2 rounded shadow font-bold text-sm'
                                : 'bg-white text-[#5C4033] border border-[#e5d9c5] px-5 py-2 rounded shadow-sm font-bold text-sm hover:border-[#8B5A2B] hover:bg-orange-50 transition-colors'
                        }
                    >
                        {label}
                    </Link>
                ))}
            </nav>

            {/* Barra de Pesquisa */}
            <div className="mb-6 bg-white p-4 rounded-lg shadow-sm border border-[#e5d9c5]">
                <input
                    type="text"
                    placeholder="Pesquisar por nome ou telefone..."
                    value={busca}
                    onChange={(e) => setBusca(e.target.value)}
                    className="w-full p-3 border border-gray-300 rounded outline-none focus:border-[#8B5A2B] transition-colors"
                />
            </div>

            {/* Tabela de Clientes */}
            <section className="bg-white rounded-lg shadow overflow-hidden border border-[#e5d9c5]">
                {loading ? (
                    <p className="p-8 text-center text-gray-500 font-bold tracking-wider uppercase text-sm">A carregar clientes...</p>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead className="bg-[#5C4033] text-white">
                                <tr>
                                    <th className="p-4 text-sm font-semibold uppercase tracking-wider">Cliente</th>
                                    <th className="p-4 text-sm font-semibold uppercase tracking-wider text-center">Visitas (Total)</th>
                                    <th className="p-4 text-sm font-semibold uppercase tracking-wider text-center">Status</th>
                                    <th className="p-4 text-sm font-semibold text-right uppercase tracking-wider">Ações (LGPD)</th>
                                </tr>
                            </thead>
                            <tbody>
                                {clientesFiltrados.length === 0 ? (
                                    <tr><td colSpan={4} className="p-8 text-center text-gray-500">Nenhum cliente encontrado.</td></tr>
                                ) : (
                                    clientesFiltrados.map((cliente) => {
                                        const totalAgendamentos = cliente._count?.agendamentos || 0;
                                        const isLoading = acaoLoading === cliente.id;
                                        const isAnonimizado = cliente.anonimizado;

                                        return (
                                            <tr key={cliente.id} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                                                <td className="p-4">
                                                    <p className={`font-bold ${isAnonimizado ? 'text-gray-400 italic' : 'text-gray-800'}`}>
                                                        {cliente.nome}
                                                    </p>
                                                    <p className="text-xs text-gray-500 mt-1">{cliente.telefone || 'Sem contacto'}</p>
                                                </td>
                                                <td className="p-4 text-center font-semibold text-[#8B5A2B]">
                                                    {totalAgendamentos}
                                                </td>
                                                <td className="p-4 text-center">
                                                    <span className={`px-2.5 py-1 text-[0.65rem] font-bold rounded uppercase tracking-wider ${isAnonimizado ? 'bg-gray-100 text-gray-600 border border-gray-200' : 'bg-green-100 text-green-700 border border-green-200'}`}>
                                                        {isAnonimizado ? 'Anonimizado' : 'Ativo'}
                                                    </span>
                                                </td>
                                                <td className="p-4 text-right">
                                                    {!isAnonimizado ? (
                                                        <div className="flex justify-end gap-2">
                                                            <button
                                                                onClick={() => handleAnonimizar(cliente.id, cliente.nome)}
                                                                disabled={isLoading}
                                                                title="Mantém o histórico financeiro, mas apaga o nome e contacto."
                                                                className={`px-3 py-1.5 rounded text-xs font-bold border transition-colors shadow-sm ${isLoading
                                                                    ? 'bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed'
                                                                    : 'bg-orange-50 text-orange-600 border-orange-200 hover:bg-orange-100'
                                                                    }`}
                                                            >
                                                                Anonimizar
                                                            </button>
                                                            <button
                                                                onClick={() => handleExcluir(cliente.id, cliente.nome)}
                                                                disabled={isLoading || totalAgendamentos > 0}
                                                                title={totalAgendamentos > 0 ? "Não é possível excluir clientes com histórico financeiro. Use a anonimização." : "Excluir conta definitivamente."}
                                                                className={`px-3 py-1.5 rounded text-xs font-bold border transition-colors shadow-sm ${isLoading || totalAgendamentos > 0
                                                                    ? 'bg-gray-50 text-gray-300 border-gray-100 cursor-not-allowed'
                                                                    : 'bg-red-50 text-red-600 border-red-200 hover:bg-red-100'
                                                                    }`}
                                                            >
                                                                Excluir
                                                            </button>
                                                        </div>
                                                    ) : (
                                                        <span className="text-xs text-gray-400 italic">Ação Irreversível Aplicada</span>
                                                    )}
                                                </td>
                                            </tr>
                                        )
                                    })
                                )}
                            </tbody>
                        </table>
                    </div>
                )}
            </section>
        </div>
    )
}