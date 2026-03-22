'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { obterDadosPainelProfissional } from '@/app/actions/profissional'
import { logoutFuncionario } from '@/app/actions/auth'
import type { AgendamentoProfissional } from '@/types/domain'

type PainelData = {
    profissional: {
        nome: string
        podeVerComissao: boolean
        taxaComissao: number
        comissaoMensal: number
    }
    agendamentosHoje: AgendamentoProfissional[]
}

export default function DashboardProfissionalPage() {
    const router = useRouter()
    const [dados, setDados] = useState<PainelData | null>(null)
    const [erro, setErro] = useState('')

    const carregar = useCallback(async () => {
        const res = await obterDadosPainelProfissional()
        if (res.sucesso) {
            setDados(res as PainelData)
        } else {
            setErro(res.erro ?? 'Erro ao carregar os dados.')
        }
    }, [])

    useEffect(() => {
        void carregar()
    }, [carregar])

    const formatarHora = (dataString: string) =>
        new Intl.DateTimeFormat('pt-BR', { hour: '2-digit', minute: '2-digit' }).format(
            new Date(dataString)
        )

    // ⚠️ CORREÇÃO CRÍTICA: cookies httpOnly NÃO podem ser removidos via document.cookie.
    // A remoção deve ser feita via Server Action.
    const fazerLogout = async () => {
        await logoutFuncionario()
        router.push('/login-profissional')
    }

    if (erro)
        return (
            <div className="p-8 text-center text-red-500 font-bold">{erro}</div>
        )

    if (!dados)
        return (
            <div className="p-8 text-center text-gray-500">A carregar a sua agenda...</div>
        )

    const { profissional, agendamentosHoje } = dados

    return (
        <div className="min-h-screen bg-[#fdfbf7] p-4 md:p-8 font-sans">
            <header className="mb-8 border-b-2 border-[#5C4033] pb-4 flex justify-between items-center">
                <div>
                    <h1 className="text-2xl md:text-3xl font-bold text-[#5C4033]">
                        Olá, {profissional.nome}
                    </h1>
                    <p className="text-gray-500 mt-1">O seu painel de atendimentos de hoje</p>
                </div>
                <button
                    onClick={() => { void fazerLogout() }}
                    className="text-sm font-bold text-red-500 hover:underline"
                >
                    Sair da Conta
                </button>
            </header>

            {profissional.podeVerComissao && (
                <div className="bg-[#5C4033] text-white p-6 rounded-lg shadow-lg mb-8 flex justify-between items-center">
                    <div>
                        <p className="text-sm text-[#e5d9c5] font-semibold uppercase tracking-wider mb-1">
                            Comissões do Mês ({profissional.taxaComissao}%)
                        </p>
                        <p className="text-3xl font-bold">R$ {profissional.comissaoMensal.toFixed(2)}</p>
                    </div>
                    <div className="text-right hidden md:block">
                        <p className="text-sm text-[#e5d9c5]">Serviços concluídos</p>
                    </div>
                </div>
            )}

            <section>
                <h2 className="text-xl font-bold text-[#5C4033] mb-4 flex items-center gap-2">
                    <span>📅</span> Agenda de Hoje
                </h2>

                <div className="space-y-4">
                    {agendamentosHoje.length === 0 ? (
                        <div className="bg-white p-8 rounded-lg shadow border border-[#e5d9c5] text-center text-gray-500">
                            Você não possui nenhum agendamento pendente para hoje.
                        </div>
                    ) : (
                        agendamentosHoje.map((ag) => (
                            <div
                                key={ag.id}
                                className={`bg-white p-5 md:p-6 rounded-lg shadow border-l-4 transition-all ${ag.concluido
                                        ? 'border-gray-300 opacity-60'
                                        : 'border-[#8B5A2B] hover:shadow-md'
                                    }`}
                            >
                                <div className="flex flex-col md:flex-row justify-between md:items-center gap-4">
                                    <div>
                                        <div className="flex items-center gap-3 mb-1">
                                            <span className="bg-gray-100 text-gray-800 font-bold px-3 py-1 rounded text-lg">
                                                {formatarHora(ag.dataHoraInicio)}
                                            </span>
                                            {ag.concluido && (
                                                <span className="text-xs bg-gray-200 text-gray-600 px-2 py-1 rounded font-bold uppercase">
                                                    Finalizado
                                                </span>
                                            )}
                                        </div>
                                        <h3 className="text-lg font-bold text-gray-800 mt-2">{ag.cliente.nome}</h3>
                                        <p className="text-sm text-gray-500">{ag.cliente.telefone}</p>
                                        <div className="mt-3 flex flex-wrap gap-2">
                                            {ag.servicos.map((item) => (
                                                <span
                                                    key={item.id}
                                                    className="text-xs bg-orange-50 text-orange-800 border border-orange-200 px-2 py-1 rounded-full"
                                                >
                                                    {item.servico.nome}
                                                </span>
                                            ))}
                                        </div>
                                    </div>

                                    {!ag.concluido && (
                                        <Link
                                            href={`/profissional/comanda/${ag.id}`}
                                            className="bg-[#8B5A2B] text-white px-6 py-3 rounded font-bold hover:bg-[#704620] text-center w-full md:w-auto"
                                        >
                                            Abrir Comanda
                                        </Link>
                                    )}
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </section>
        </div>
    )
}