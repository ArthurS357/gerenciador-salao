'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { listarAgendamentosGlobais, cancelarAgendamentoPendente } from '@/app/actions/agendamento'
import type { AgendamentoGlobal } from '@/types/domain'

export default function AgendamentosGlobaisPage() {
    const [agendamentos, setAgendamentos] = useState<AgendamentoGlobal[]>([])
    const [carregando, setCarregando] = useState(true)

    const carregarAgendamentos = useCallback(async () => {
        setCarregando(true)
        const res = await listarAgendamentosGlobais()
        if (res.sucesso) setAgendamentos(res.agendamentos)
        setCarregando(false)
    }, [])

    useEffect(() => {
        void carregarAgendamentos()
    }, [carregarAgendamentos])

    const formatarDataHora = (dataString: string) =>
        new Intl.DateTimeFormat('pt-BR', {
            day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit',
        }).format(new Date(dataString))

    const handleCancelar = async (id: string) => {
        if (!confirm('Tem certeza que deseja cancelar e apagar esta reserva da agenda?')) return

        const res = await cancelarAgendamentoPendente(id)
        if (res.sucesso) {
            alert('Agendamento removido com sucesso.')
            void carregarAgendamentos()
        } else {
            alert(res.erro)
        }
    }

    return (
        <div className="min-h-screen bg-[#fdfbf7] p-8 font-sans">
            <header className="mb-6 border-b-2 border-[#5C4033] pb-4 flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold text-[#5C4033]">Agendamentos Globais</h1>
                    <p className="text-gray-500 mt-1">Controle total da agenda de todos os profissionais</p>
                </div>
                <Link href="/admin/dashboard" className="text-sm font-bold text-[#8B5A2B] hover:underline">
                    &larr; Voltar para o Painel Central
                </Link>
            </header>

            <section className="bg-white rounded-lg shadow overflow-hidden border border-[#e5d9c5]">
                <table className="w-full text-left border-collapse">
                    <thead className="bg-[#5C4033] text-white">
                        <tr>
                            <th className="p-4 text-sm font-semibold">Data e Horário</th>
                            <th className="p-4 text-sm font-semibold">Cliente</th>
                            <th className="p-4 text-sm font-semibold">Profissional</th>
                            <th className="p-4 text-sm font-semibold text-center">Status</th>
                            <th className="p-4 text-sm font-semibold text-right">Ação</th>
                        </tr>
                    </thead>
                    <tbody>
                        {carregando ? (
                            <tr>
                                <td colSpan={5} className="p-8 text-center text-gray-400">
                                    Carregando agenda...
                                </td>
                            </tr>
                        ) : agendamentos.length === 0 ? (
                            <tr>
                                <td colSpan={5} className="p-8 text-center text-gray-500">
                                    A agenda está vazia.
                                </td>
                            </tr>
                        ) : (
                            agendamentos.map((ag) => (
                                <tr key={ag.id} className="border-b border-gray-100 hover:bg-gray-50">
                                    <td className="p-4 font-bold text-gray-800">
                                        {formatarDataHora(ag.dataHoraInicio)}
                                    </td>
                                    <td className="p-4 text-gray-700">
                                        <div className="font-bold">{ag.cliente.nome}</div>
                                        <div className="text-xs text-gray-500">{ag.cliente.telefone}</div>
                                    </td>
                                    <td className="p-4 font-semibold text-[#8B5A2B]">{ag.funcionario.nome}</td>
                                    <td className="p-4 text-center">
                                        {ag.concluido ? (
                                            <span className="bg-gray-200 text-gray-600 px-3 py-1 rounded-full text-xs font-bold">
                                                Faturado/Caixa
                                            </span>
                                        ) : (
                                            <span className="bg-green-100 text-green-700 px-3 py-1 rounded-full text-xs font-bold">
                                                Pendente
                                            </span>
                                        )}
                                    </td>
                                    <td className="p-4 text-right">
                                        {!ag.concluido && (
                                            <button
                                                onClick={() => handleCancelar(ag.id)}
                                                className="text-red-500 font-bold text-sm hover:underline"
                                            >
                                                Cancelar Reserva
                                            </button>
                                        )}
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </section>
        </div>
    )
}