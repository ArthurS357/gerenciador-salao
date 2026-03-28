'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { CalendarOff, LogOut, Trash2, Home } from 'lucide-react'
import { logoutCliente } from '@/app/actions/auth'
import { excluirContaCliente } from '@/app/actions/cliente'
import { criarAvaliacao } from '@/app/actions/avaliacao'
import type { HistoricoAgendamentoItem } from '@/app/actions/cliente'

interface ClienteDashboardUIProps {
    clienteId: string
    nomeCliente: string
    agendamentos: HistoricoAgendamentoItem[]
    totalGasto: number
}

type HistoricoItemComAvaliacao = HistoricoAgendamentoItem & {
    avaliacao?: unknown
}

const STATUS_BADGE = {
    concluido: 'bg-[rgba(197,168,124,0.1)] text-caramelo border border-[rgba(197,168,124,0.3)]',
    pendente: 'bg-white text-[#2a1810] border border-[#2a1810]/20 shadow-sm',
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

    // Estados do Modal de Avaliação
    const [avaliandoId, setAvaliandoId] = useState<string | null>(null)
    const [nota, setNota] = useState<number>(5)
    const [comentario, setComentario] = useState('')
    const [avaliadosLocalmente, setAvaliadosLocalmente] = useState<string[]>([])
    const [loadingAvaliacao, setLoadingAvaliacao] = useState(false)

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

    const handleSalvarAvaliacao = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!avaliandoId) return

        setLoadingAvaliacao(true)
        const res = await criarAvaliacao(avaliandoId, nota, comentario)

        if (res.sucesso) {
            alert('Muito obrigado pelo seu feedback!')
            setAvaliadosLocalmente([...avaliadosLocalmente, avaliandoId])
            setAvaliandoId(null)
            setNota(5)
            setComentario('')
        } else {
            alert(res.erro)
        }
        setLoadingAvaliacao(false)
    }

    const pendentes = agendamentos.filter(a => !a.concluido)
    const concluidos = agendamentos.filter(a => a.concluido)

    return (
        <div className="min-h-screen bg-[#fdfaf6] p-4 md:p-8 pt-24 relative selection:bg-caramelo selection:text-white">
            <div className="max-w-4xl mx-auto space-y-10">

                {/* Header Elegante */}
                <div className="bg-white rounded-none border border-[rgba(197,168,124,0.15)] p-8 md:p-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-6 shadow-[0_4px_30px_rgba(42,24,16,0.03)] relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-[radial-gradient(circle,rgba(197,168,124,0.05)_0%,transparent_70%)] rounded-full blur-xl pointer-events-none" />

                    <div className="relative z-10">
                        <div className="flex items-center gap-3 mb-2">
                            <div className="h-px w-6 bg-gradient-to-r from-transparent to-caramelo" />
                            <span className="font-sans text-[0.6rem] font-medium tracking-[0.25em] uppercase text-caramelo">
                                Área do Cliente
                            </span>
                        </div>
                        <h1 className="text-3xl md:text-4xl font-serif font-light text-[#2a1810] tracking-tight">
                            Olá, <em className="italic text-caramelo font-medium">{nomeCliente}</em>
                        </h1>
                        <p className="text-[#9c8070] mt-2 text-[0.85rem] font-light">
                            Acompanhe seus agendamentos e histórico de beleza.
                        </p>
                    </div>

                    {/* Container de Botões (Início e Logout) */}
                    <div className="relative z-10 flex flex-wrap items-center gap-3">
                        <Link
                            href="/"
                            className="flex items-center gap-2 bg-caramelo text-white px-5 py-2.5 rounded-full font-sans text-[0.65rem] font-semibold uppercase tracking-[0.15em] hover:bg-[#d4b896] shadow-sm hover:shadow-md transition-all duration-300"
                        >
                            <Home className="w-3.5 h-3.5" />
                            Página Inicial
                        </Link>

                        <button
                            onClick={handleLogout}
                            className="flex items-center gap-2 border border-[rgba(197,168,124,0.3)] bg-transparent text-[#2a1810] px-5 py-2.5 rounded-full font-sans text-[0.65rem] font-semibold uppercase tracking-[0.15em] hover:bg-[rgba(197,168,124,0.05)] hover:border-caramelo transition-all duration-300"
                        >
                            <LogOut className="w-3.5 h-3.5 text-caramelo" />
                            Sair
                        </button>
                    </div>
                </div>

                {/* Resumo Financeiro Premium */}
                {totalGasto > 0 && (
                    <div className="bg-[#2a1810] rounded-none p-8 md:p-10 flex items-center justify-between relative overflow-hidden shadow-[0_12px_40px_rgba(42,24,16,0.15)]">
                        <div className="absolute top-[-50%] right-[-10%] w-[60%] h-[200%] bg-[radial-gradient(ellipse,rgba(197,168,124,0.15)_0%,transparent_60%)] blur-2xl pointer-events-none" />

                        <div className="relative z-10">
                            <p className="text-[0.65rem] font-sans font-medium text-[rgba(197,168,124,0.7)] uppercase tracking-[0.2em] mb-2">
                                Total investido em você
                            </p>
                            <p className="text-4xl md:text-5xl font-serif font-light text-white tracking-tight">
                                <span className="text-caramelo/60 text-3xl mr-1">R$</span>
                                {totalGasto.toFixed(2)}
                            </p>
                        </div>

                        <div className="relative z-10 hidden md:flex items-center justify-center w-16 h-16 rounded-full border border-[rgba(197,168,124,0.2)] bg-white/5">
                            <svg className="text-caramelo w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
                            </svg>
                        </div>
                    </div>
                )}

                {/* Próximos Agendamentos */}
                <section>
                    <div className="flex items-center gap-3 mb-6">
                        <span className="w-1.5 h-6 bg-caramelo rounded-sm inline-block" />
                        <h2 className="font-serif text-2xl text-[#2a1810] font-light">Próximos Horários</h2>
                    </div>

                    {pendentes.length === 0 ? (
                        <div className="bg-white border border-[rgba(197,168,124,0.15)] p-14 text-center flex flex-col items-center justify-center shadow-sm relative overflow-hidden group">
                            <div className="w-16 h-16 bg-[rgba(197,168,124,0.05)] rounded-full flex items-center justify-center mb-5 group-hover:scale-110 transition-transform duration-500">
                                <CalendarOff className="w-7 h-7 text-caramelo/70" strokeWidth={1.5} />
                            </div>
                            <p className="text-xl font-serif font-medium text-[#2a1810]">Sua agenda está livre</p>
                            <p className="text-[0.8rem] font-light text-[#9c8070] mt-2 mb-8 max-w-xs mx-auto">
                                Que tal reservar um momento exclusivo para cuidar de você hoje?
                            </p>

                            <Link
                                href="/#agendamento"
                                className="inline-flex items-center justify-center gap-2 px-8 py-3.5 bg-caramelo text-[#2a1810] font-sans text-[0.7rem] font-bold uppercase tracking-[0.15em] hover:bg-[#d4b896] transition-colors duration-300"
                            >
                                Agendar Agora
                            </Link>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {pendentes.map(ag => (
                                <div key={ag.id} className="bg-white border border-[rgba(197,168,124,0.15)] p-5 md:p-6 shadow-sm hover:shadow-[0_8px_30px_rgba(42,24,16,0.04)] transition-all duration-300 flex flex-col md:flex-row gap-5 items-start md:items-center group">

                                    {/* Data Block */}
                                    <div className="flex flex-col items-center justify-center min-w-[100px] py-4 bg-[rgba(197,168,124,0.04)] border border-[rgba(197,168,124,0.1)] group-hover:bg-[rgba(197,168,124,0.08)] transition-colors">
                                        <span className="text-2xl font-serif font-medium text-[#2a1810] leading-none">
                                            {new Intl.DateTimeFormat('pt-BR', { hour: '2-digit', minute: '2-digit' }).format(new Date(ag.dataHoraInicio))}
                                        </span>
                                        <span className="text-[0.6rem] font-sans font-bold text-caramelo mt-2 uppercase tracking-widest">
                                            {new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'short' }).format(new Date(ag.dataHoraInicio)).replace('.', '')}
                                        </span>
                                    </div>

                                    {/* Details */}
                                    <div className="flex-1">
                                        <p className="font-sans text-[0.7rem] text-[#9c8070] uppercase tracking-[0.1em] mb-1">
                                            Profissional: <strong className="text-[#2a1810] font-bold">{ag.funcionario.nome}</strong>
                                        </p>
                                        <div className="flex flex-wrap gap-2 mt-3">
                                            {ag.servicos.map(s => (
                                                <span key={s.servico.nome} className="text-[0.65rem] font-medium font-sans uppercase tracking-[0.08em] bg-[#fdfaf6] border border-[rgba(197,168,124,0.2)] text-[#2a1810] px-2.5 py-1">
                                                    {s.servico.nome}
                                                </span>
                                            ))}
                                        </div>
                                    </div>

                                    <span className={`px-3 py-1.5 text-[0.6rem] font-bold uppercase tracking-[0.15em] ${STATUS_BADGE.pendente}`}>
                                        Aguardando
                                    </span>
                                </div>
                            ))}
                        </div>
                    )}
                </section>

                {/* Histórico */}
                {concluidos.length > 0 && (
                    <section>
                        <div className="flex items-center gap-3 mb-6 mt-12">
                            <span className="w-1.5 h-6 bg-[#2a1810] rounded-sm inline-block" />
                            <h2 className="font-serif text-2xl text-[#2a1810] font-light">Seu Histórico</h2>
                        </div>

                        <div className="space-y-4">
                            {concluidos.map(ag => {
                                const itemComAvaliacao = ag as HistoricoItemComAvaliacao;
                                const jaAvaliado = itemComAvaliacao.avaliacao != null || avaliadosLocalmente.includes(ag.id);

                                return (
                                    <div key={ag.id} className="bg-white border border-[rgba(197,168,124,0.15)] p-5 md:p-6 shadow-sm hover:border-[rgba(197,168,124,0.3)] transition-colors duration-300 flex flex-col md:flex-row gap-5 items-start md:items-center">
                                        <div className="flex-1 w-full">
                                            <div className="flex justify-between items-start w-full">
                                                <div>
                                                    <p className="text-[0.65rem] font-sans uppercase tracking-[0.1em] text-[#9c8070]">
                                                        {formatarData(ag.dataHoraInicio).replace('.', '')}
                                                    </p>
                                                    <p className="font-serif text-[1.1rem] text-[#2a1810] mt-1">
                                                        Com {ag.funcionario.nome}
                                                    </p>
                                                </div>
                                                <div className="text-right flex flex-col items-end gap-2">
                                                    <span className="font-serif text-lg text-caramelo font-medium">
                                                        R$ {ag.valorBruto.toFixed(2)}
                                                    </span>
                                                    <span className={`px-2 py-1 text-[0.55rem] font-bold uppercase tracking-[0.15em] ${STATUS_BADGE.concluido}`}>
                                                        Finalizado
                                                    </span>
                                                </div>
                                            </div>

                                            <div className="flex flex-wrap items-center justify-between gap-4 mt-4 pt-4 border-t border-[rgba(197,168,124,0.1)]">
                                                <div className="flex flex-wrap gap-2">
                                                    {ag.servicos.map(s => (
                                                        <span key={s.servico.nome} className="text-[0.6rem] font-medium font-sans uppercase tracking-[0.08em] text-[#9c8070]">
                                                            • {s.servico.nome}
                                                        </span>
                                                    ))}
                                                </div>

                                                {/* Botão de Avaliação Dinâmico */}
                                                {!jaAvaliado ? (
                                                    <button
                                                        onClick={() => setAvaliandoId(ag.id)}
                                                        className="px-4 py-2 border border-caramelo text-caramelo text-[0.65rem] font-bold uppercase tracking-[0.1em] hover:bg-caramelo hover:text-white transition-colors flex items-center gap-1.5"
                                                    >
                                                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" /></svg>
                                                        Avaliar Atendimento
                                                    </button>
                                                ) : (
                                                    <span className="text-[0.65rem] font-medium uppercase tracking-[0.1em] text-[rgba(197,168,124,0.7)] flex items-center gap-1">
                                                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6L9 17l-5-5" /></svg>
                                                        Avaliado
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                )
                            })}
                        </div>
                    </section>
                )}

                {/* Zona de perigo LGPD */}
                <section className="mt-16 pt-8 border-t border-red-100 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                    <div>
                        <h3 className="text-[#2a1810] font-sans font-bold text-[0.7rem] uppercase tracking-[0.1em] mb-1 flex items-center gap-2">
                            <Trash2 className="w-3.5 h-3.5 text-red-500" />
                            Gerenciar Conta
                        </h3>
                        <p className="text-[0.75rem] text-[#9c8070] font-light max-w-md">
                            Ao solicitar a exclusão, seus dados pessoais serão removidos conforme a LGPD. Históricos financeiros permanecem anônimos.
                        </p>
                    </div>
                    <button
                        onClick={handleExcluirConta}
                        disabled={isProcessing}
                        className="bg-transparent border border-red-200 text-red-600 px-5 py-2.5 font-sans text-[0.65rem] font-bold uppercase tracking-[0.1em] hover:bg-red-50 disabled:opacity-50 transition-colors whitespace-nowrap"
                    >
                        {isProcessing ? 'Processando...' : 'Excluir Meus Dados'}
                    </button>
                </section>
            </div>

            {/* Modal de Avaliação Elegante */}
            {avaliandoId && (
                <div className="fixed inset-0 bg-[#0e0905]/80 flex items-center justify-center p-4 z-50 backdrop-blur-sm">
                    <div className="bg-white p-8 md:p-10 shadow-2xl w-full max-w-md border-t-2 border-caramelo animate-in fade-in zoom-in duration-300 relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-[radial-gradient(circle,rgba(197,168,124,0.08)_0%,transparent_70%)] rounded-full blur-xl pointer-events-none" />

                        <div className="text-center mb-8 relative z-10">
                            <h2 className="text-2xl font-serif font-light text-[#2a1810]">Sua Experiência</h2>
                            <p className="text-[#9c8070] text-[0.8rem] font-light mt-2">Sua opinião é fundamental para mantermos nossa excelência.</p>
                        </div>

                        <form onSubmit={handleSalvarAvaliacao} className="space-y-8 relative z-10">
                            {/* Estrelas Interativas */}
                            <div className="flex justify-center gap-3">
                                {[1, 2, 3, 4, 5].map((star) => (
                                    <button
                                        key={star}
                                        type="button"
                                        onClick={() => setNota(star)}
                                        className={`text-3xl transition-all duration-300 hover:scale-110 ${nota >= star ? 'text-caramelo drop-shadow-sm' : 'text-gray-200 hover:text-caramelo/50'}`}
                                    >
                                        ★
                                    </button>
                                ))}
                            </div>

                            <div>
                                <label className="block text-[0.65rem] font-bold text-[#2a1810] uppercase tracking-[0.15em] mb-3 text-center">
                                    Deixe um comentário (Opcional)
                                </label>
                                <textarea
                                    className="w-full border border-[rgba(197,168,124,0.3)] bg-[#fdfaf6] p-4 text-[0.8rem] font-light text-[#2a1810] outline-none focus:border-caramelo focus:bg-white transition-colors resize-none h-28 placeholder:text-[#9c8070]/50"
                                    placeholder="Conte-nos os detalhes do seu atendimento..."
                                    value={comentario}
                                    onChange={(e) => setComentario(e.target.value)}
                                    maxLength={300}
                                />
                            </div>

                            <div className="flex gap-3 pt-2">
                                <button
                                    type="button"
                                    onClick={() => { setAvaliandoId(null); setNota(5); setComentario(''); }}
                                    className="flex-1 py-3.5 text-[#2a1810] font-sans text-[0.7rem] font-bold uppercase tracking-[0.15em] bg-transparent border border-[rgba(197,168,124,0.3)] hover:bg-[rgba(197,168,124,0.05)] transition-colors"
                                >
                                    Cancelar
                                </button>
                                <button
                                    type="submit"
                                    disabled={loadingAvaliacao}
                                    className="flex-1 py-3.5 bg-caramelo text-[#2a1810] font-sans text-[0.7rem] font-bold uppercase tracking-[0.15em] hover:bg-[#d4b896] disabled:opacity-70 transition-colors"
                                >
                                    {loadingAvaliacao ? 'Enviando...' : 'Enviar'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    )
}