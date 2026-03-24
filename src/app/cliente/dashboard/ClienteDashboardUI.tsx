'use client'
// src/app/cliente/dashboard/ClienteDashboardUI.tsx
// Client Component: contém toda a interatividade (logout, exclusão de conta, lista de agendamentos).
// Recebe dados já buscados pelo Server Component pai (page.tsx).
// CORRIGIDO: tipos estritos, sem `any`, histórico de agendamentos exibido.

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { logoutCliente } from '@/app/actions/auth'
import { excluirContaCliente } from '@/app/actions/cliente'
import type { HistoricoAgendamentoItem } from '@/app/actions/cliente'

interface ClienteDashboardUIProps {
    clienteId: string
    nomeCliente: string
    agendamentos: HistoricoAgendamentoItem[]
    totalGasto: number
}

const STATUS_BADGE = {
    concluido: 'bg-green-100 text-green-700 border border-green-200',
    pendente: 'bg-orange-100 text-orange-700 border border-orange-200',
} as const

function formatarData(data: Date | string) {
    return new Intl.DateTimeFormat('pt-BR', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    }).format(new Date(data))
}

export default function ClienteDashboardUI({
    clienteId,
    nomeCliente,
    agendamentos,
    totalGasto,
}: ClienteDashboardUIProps) {
    const router = useRouter()
    const [isProcessing, setIsProcessing] = useState(false)

    const handleLogout = async () => {
        await logoutCliente()
        router.push('/')
        router.refresh()
    }

    const handleExcluirConta = async () => {
        const confirmacao = window.confirm(
            'ATENÇÃO: Isso apagará permanentemente seu nome e telefone do nosso sistema. ' +
            'Seu histórico de agendamentos será mantido de forma anônima para controle fiscal. ' +
            'Deseja continuar?'
        )
        if (!confirmacao) return

        setIsProcessing(true)
        const res = await excluirContaCliente(clienteId)

        if (res.sucesso) {
            alert('Sua conta foi excluída com sucesso.')
            router.push('/')
            router.refresh()
        } else {
            alert(res.erro)
            setIsProcessing(false)
        }
    }

    const pendentes = agendamentos.filter(a => !a.concluido)
    const concluidos = agendamentos.filter(a => a.concluido)

    return (
        <div className="min-h-screen bg-[#fdfbf7] p-4 md:p-8 pt-24">
            <div className="max-w-4xl mx-auto space-y-6">

                {/* Header */}
                <div className="bg-white rounded-2xl shadow-sm border border-[#e5d9c5] p-6 md:p-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div>
                        <h1 className="text-2xl md:text-3xl font-bold text-[#5C4033]">
                            Olá, {nomeCliente} 👋
                        </h1>
                        <p className="text-gray-500 mt-1 text-sm">
                            Bem-vinda ao seu painel pessoal.
                        </p>
                    </div>
                    <button
                        onClick={handleLogout}
                        className="bg-gray-100 text-gray-700 px-4 py-2 rounded-lg font-semibold hover:bg-gray-200 transition-colors text-sm"
                    >
                        Sair
                    </button>
                </div>

                {/* Resumo financeiro */}
                {totalGasto > 0 && (
                    <div className="bg-white rounded-2xl shadow-sm border border-[#e5d9c5] p-6 flex items-center justify-between">
                        <div>
                            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Total investido no salão</p>
                            <p className="text-3xl font-bold text-[#8B5A2B] mt-1">
                                R$ {totalGasto.toFixed(2)}
                            </p>
                        </div>
                        <div className="text-4xl">💆‍♀️</div>
                    </div>
                )}

                {/* Próximos agendamentos */}
                <section>
                    <h2 className="font-bold text-[#5C4033] text-lg mb-3 flex items-center gap-2">
                        <span className="w-1.5 h-6 bg-[#8B5A2B] rounded-full inline-block" />
                        Próximos Agendamentos
                    </h2>

                    {pendentes.length === 0 ? (
                        <div className="bg-white rounded-2xl border border-dashed border-[#e5d9c5] p-10 text-center text-gray-400">
                            <p className="text-base font-medium">Nenhum agendamento pendente.</p>
                            <a
                                href="/#agendamento"
                                className="inline-block mt-4 px-6 py-2.5 bg-[#8B5A2B] text-white rounded-lg text-sm font-semibold hover:bg-[#704620] transition-colors"
                            >
                                Agendar Agora
                            </a>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {pendentes.map(ag => (
                                <div key={ag.id} className="bg-white rounded-2xl border border-[#e5d9c5] p-5 shadow-sm flex flex-col md:flex-row gap-4 items-start md:items-center">
                                    <div className="flex flex-col items-center justify-center min-w-[90px] py-3 bg-orange-50 rounded-xl border border-orange-100 text-center">
                                        <span className="text-xl font-black text-[#5C4033] leading-none">
                                            {new Intl.DateTimeFormat('pt-BR', { hour: '2-digit', minute: '2-digit' }).format(new Date(ag.dataHoraInicio))}
                                        </span>
                                        <span className="text-[10px] font-semibold text-[#8B5A2B] mt-1 uppercase tracking-wider">
                                            {new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'short' }).format(new Date(ag.dataHoraInicio))}
                                        </span>
                                    </div>

                                    <div className="flex-1">
                                        <p className="font-semibold text-gray-800 text-sm">
                                            Com: <strong className="text-[#5C4033]">{ag.funcionario.nome}</strong>
                                        </p>
                                        <div className="flex flex-wrap gap-1.5 mt-2">
                                            {ag.servicos.map(s => (
                                                <span key={s.servico.nome} className="text-[10px] font-bold uppercase tracking-wider bg-gray-100 text-gray-600 px-2 py-0.5 rounded">
                                                    {s.servico.nome}
                                                </span>
                                            ))}
                                        </div>
                                    </div>

                                    <span className={`px-2.5 py-1 text-[10px] font-bold rounded uppercase tracking-wider ${STATUS_BADGE.pendente}`}>
                                        Pendente
                                    </span>
                                </div>
                            ))}
                        </div>
                    )}
                </section>

                {/* Histórico */}
                {concluidos.length > 0 && (
                    <section>
                        <h2 className="font-bold text-[#5C4033] text-lg mb-3 flex items-center gap-2">
                            <span className="w-1.5 h-6 bg-green-500 rounded-full inline-block" />
                            Histórico de Visitas
                        </h2>
                        <div className="space-y-3">
                            {concluidos.map(ag => (
                                <div key={ag.id} className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm flex flex-col md:flex-row gap-4 items-start md:items-center">
                                    <div className="flex-1">
                                        <p className="text-xs text-gray-400">{formatarData(ag.dataHoraInicio)}</p>
                                        <p className="font-semibold text-gray-700 text-sm mt-0.5">
                                            Com: {ag.funcionario.nome}
                                        </p>
                                        <div className="flex flex-wrap gap-1.5 mt-2">
                                            {ag.servicos.map(s => (
                                                <span key={s.servico.nome} className="text-[10px] font-bold uppercase tracking-wider bg-gray-100 text-gray-500 px-2 py-0.5 rounded">
                                                    {s.servico.nome}
                                                </span>
                                            ))}
                                        </div>
                                    </div>

                                    <div className="text-right flex flex-col items-end gap-1">
                                        <span className="font-black text-[#8B5A2B]">
                                            R$ {ag.valorBruto.toFixed(2)}
                                        </span>
                                        <span className={`px-2.5 py-1 text-[10px] font-bold rounded uppercase tracking-wider ${STATUS_BADGE.concluido}`}>
                                            Faturado
                                        </span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </section>
                )}

                {/* Zona de perigo LGPD */}
                <section className="bg-red-50 border border-red-200 rounded-2xl p-6">
                    <h3 className="text-red-800 font-bold text-base mb-1">Zona de Perigo</h3>
                    <p className="text-sm text-red-600 mb-4">
                        Ao excluir sua conta, seus dados pessoais serão removidos conforme a LGPD.
                        O histórico financeiro é mantido de forma anônima.
                    </p>
                    <button
                        onClick={handleExcluirConta}
                        disabled={isProcessing}
                        className="bg-red-600 text-white px-4 py-2 rounded-lg font-bold hover:bg-red-700 disabled:opacity-50 transition-colors text-sm"
                    >
                        {isProcessing ? 'Excluindo...' : 'Excluir Meus Dados'}
                    </button>
                </section>

            </div>
        </div>
    )
}