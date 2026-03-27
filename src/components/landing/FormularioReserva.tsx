'use client'

import { memo, useState, useEffect } from 'react'
import Link from 'next/link'
import { cn } from './cn'
import type { FormularioReservaProps, TipoMensagem } from './types'
import { obterHorariosDisponiveis } from '@/app/actions/agenda' // Importação da Server Action

const FEEDBACK: Record<Exclude<TipoMensagem, ''>, string> = {
    sucesso: 'bg-[rgba(52,199,89,0.08)] border border-[rgba(52,199,89,0.2)] text-[#6fcf97]',
    erro: 'bg-[rgba(235,87,87,0.08)] border border-[rgba(235,87,87,0.2)] text-[#f08080]',
    info: 'bg-[rgba(197,168,124,0.08)] border border-[rgba(197,168,124,0.18)] text-caramelo',
}

const INPUT_BASE =
    'w-full py-[0.85rem] px-4 bg-white/[0.04] border border-[rgba(197,168,124,0.15)] text-white/80 font-sans text-[0.875rem] font-light outline-none transition-all duration-300 disabled:opacity-30 disabled:cursor-not-allowed focus:border-[rgba(197,168,124,0.5)] focus:bg-white/[0.07] placeholder:text-white/20'

const DarkInput = memo(function DarkInput(props: React.InputHTMLAttributes<HTMLInputElement>) {
    return <input {...props} className={cn('dark-input', INPUT_BASE, props.className)} />
})

interface DarkSelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
    children: React.ReactNode
}

const DarkSelect = memo(function DarkSelect({ children, ...props }: DarkSelectProps) {
    return (
        <div className="relative" style={{ flex: (props.style as React.CSSProperties | undefined)?.flex }}>
            <select
                {...props}
                style={undefined}
                className={cn('dark-select appearance-none pr-10', INPUT_BASE, props.className)}
            >
                {children}
            </select>
            <div className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2" aria-hidden="true">
                <svg width="11" height="6" viewBox="0 0 12 7" fill="none">
                    <path d="M1 1l5 5 5-5" stroke="rgba(197,168,124,0.7)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
            </div>
        </div>
    )
})

const FormularioReserva = memo(function FormularioReserva({
    sessao,
    mounted,
    profissionais,
    catalogoServicos,
    servicosSelecionados,
    totalSelecionado,
    profissionalId,
    setProfissionalId,
    dataHora,
    setDataHora,
    mensagem,
    handleAgendar,
    profissionalSelecionado,
    toggleServico,
}: FormularioReservaProps) {
    const [nome, setNome] = useState('')
    const [telefone, setTelefone] = useState('')

    // Novos estados para gerenciar o calendário e horários
    const [dataCalendario, setDataCalendario] = useState('')
    const [horaSelecionada, setHoraSelecionada] = useState('')
    const [horariosDisponiveis, setHorariosDisponiveis] = useState<string[]>([])
    const [buscandoHorarios, setBuscandoHorarios] = useState(false)

    useEffect(() => {
        if (sessao.logado && sessao.nome) {
            setNome(sessao.nome)
        }
    }, [sessao.logado, sessao.nome])

    // Dispara a busca de slots sempre que os pré-requisitos forem atendidos
    useEffect(() => {
        async function buscarVagas() {
            if (!dataCalendario || servicosSelecionados.length === 0) {
                setHorariosDisponiveis([])
                setHoraSelecionada('')
                setDataHora('')
                return
            }

            setBuscandoHorarios(true)
            setHoraSelecionada('')
            setDataHora('')

            try {
                // Passamos o profissionalId (que pode ser vazio "") para a action
                const vagas = await obterHorariosDisponiveis(profissionalId || undefined, dataCalendario, servicosSelecionados)
                setHorariosDisponiveis(vagas)
            } catch (error) {
                console.error("Erro ao buscar vagas", error)
                setHorariosDisponiveis([])
            } finally {
                setBuscandoHorarios(false)
            }
        }

        buscarVagas()
    }, [profissionalId, dataCalendario, servicosSelecionados, setDataHora])

    const handleSelecionarHora = (hora: string) => {
        setHoraSelecionada(hora)
        // Monta o formato esperado pelo componente pai 'LandingInterativo'
        setDataHora(`${dataCalendario}T${hora}:00`)
    }

    const inicial = (n?: string) => n?.charAt(0).toUpperCase() ?? '?'

    const formatarTelefone = (valor: string) => {
        let v = valor.replace(/\D/g, '')
        if (v.length > 11) v = v.slice(0, 11)
        if (v.length > 2) v = v.replace(/^(\d{2})(\d)/g, '($1) $2')
        if (v.length > 7) v = v.replace(/(\d{5})(\d)/, '$1-$2')
        return v
    }

    const prontoParaAgendar =
        servicosSelecionados.length > 0 &&
        nome.length > 2 &&
        telefone.length >= 14 &&
        dataHora // Exige que a Data e a Hora tenham sido combinadas

    return (
        <section id="agendamento" className="relative bg-[#0e0905] py-24 md:py-32 overflow-hidden">
            {/* Atmosfera (mantida) */}
            <div aria-hidden="true" className="pointer-events-none absolute inset-0">
                <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-[rgba(197,168,124,0.15)] to-transparent" />
                <div className="absolute top-[20%] right-[-5%] w-[40%] h-[60%] rounded-full bg-[radial-gradient(ellipse,rgba(139,90,43,0.1)_0%,transparent_65%)] blur-3xl" />
                <div className="absolute bottom-[-10%] left-[-5%] w-[35%] h-[50%] rounded-full bg-[radial-gradient(ellipse,rgba(92,64,51,0.15)_0%,transparent_65%)] blur-3xl" />
                <div
                    className="absolute inset-0 opacity-[0.02]"
                    style={{
                        backgroundImage: 'linear-gradient(rgba(197,168,124,1) 1px,transparent 1px),linear-gradient(90deg,rgba(197,168,124,1) 1px,transparent 1px)',
                        backgroundSize: '96px 96px',
                    }}
                />
            </div>

            <div className="relative z-10 max-w-[760px] mx-auto px-6 md:px-16">
                <div className="text-center mb-14">
                    <div className="flex items-center justify-center gap-4 mb-6">
                        <div className="h-px w-12 bg-gradient-to-r from-transparent to-caramelo/50" />
                        <span className="font-sans text-[0.62rem] font-medium tracking-[0.3em] uppercase text-caramelo/60">
                            Reserve o seu horário
                        </span>
                        <div className="h-px w-12 bg-gradient-to-l from-transparent to-caramelo/50" />
                    </div>
                    <h2 className="font-serif text-[2.2rem] md:text-[3rem] font-light text-white/85 mb-3 leading-[1.1] tracking-[-0.01em]">
                        Agendamento Online
                    </h2>
                    <p className="text-[0.8rem] text-white/35 font-light tracking-[0.04em]">
                        Escolha o profissional e horário ideal para si
                    </p>
                </div>

                <div
                    className="bg-white/[0.03] border border-[rgba(197,168,124,0.1)] p-8 md:p-12 backdrop-blur-sm"
                    style={{ clipPath: 'polygon(12px 0,100% 0,100% calc(100% - 12px),calc(100% - 12px) 100%,0 100%,0 12px)' }}
                >
                    {mounted && !sessao.logado && (
                        <div
                            className="flex items-center justify-between gap-4 flex-wrap p-5 mb-8 bg-[rgba(197,168,124,0.05)] border border-[rgba(197,168,124,0.15)]"
                            style={{ clipPath: 'polygon(6px 0,100% 0,100% calc(100% - 6px),calc(100% - 6px) 100%,0 100%,0 6px)' }}
                        >
                            <p className="text-[0.75rem] text-white/40 font-light">
                                Já possui cadastro no salão?{' '}
                                <strong className="text-caramelo font-medium">Faça login para agilizar.</strong>
                            </p>
                            <Link
                                href="/login"
                                className="py-2 px-5 border border-[rgba(197,168,124,0.3)] font-sans text-[0.65rem] font-medium tracking-[0.18em] uppercase text-caramelo/80 whitespace-nowrap transition-all hover:bg-[rgba(197,168,124,0.08)] hover:border-[rgba(197,168,124,0.55)]"
                            >
                                Entrar
                            </Link>
                        </div>
                    )}

                    {mensagem.texto && mensagem.tipo && (
                        <div className={cn('flex items-center gap-2 py-3.5 px-5 mb-7 text-[0.8rem] font-light', FEEDBACK[mensagem.tipo])}>
                            <span>{mensagem.tipo === 'sucesso' ? '✓' : mensagem.tipo === 'erro' ? '✕' : '·'}</span>
                            {mensagem.texto}
                        </div>
                    )}

                    {servicosSelecionados.length > 0 && (
                        <div className="flex flex-wrap gap-2 mb-7">
                            {catalogoServicos
                                .filter(s => servicosSelecionados.includes(s.id))
                                .map(s => (
                                    <span
                                        key={s.id}
                                        className="py-1.5 px-3 bg-[rgba(197,168,124,0.1)] border border-[rgba(197,168,124,0.2)] text-[0.68rem] font-medium text-caramelo tracking-[0.06em]"
                                    >
                                        {s.nome}
                                    </span>
                                ))}
                        </div>
                    )}

                    <form onSubmit={handleAgendar}>
                        {/* 1. Dados do Cliente */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-5">
                            <div>
                                <label htmlFor="nome" className="block font-sans text-[0.62rem] font-medium tracking-[0.2em] uppercase text-[rgba(197,168,124,0.75)] mb-2.5">
                                    Nome Completo *
                                </label>
                                <DarkInput
                                    id="nome"
                                    name="nome"
                                    type="text"
                                    required
                                    placeholder="Ex: Ana Silva"
                                    value={nome}
                                    onChange={(e) => setNome(e.target.value)}
                                    disabled={sessao.logado}
                                />
                            </div>
                            <div>
                                <label htmlFor="telefone" className="block font-sans text-[0.62rem] font-medium tracking-[0.2em] uppercase text-[rgba(197,168,124,0.75)] mb-2.5">
                                    Celular / WhatsApp *
                                </label>
                                <DarkInput
                                    id="telefone"
                                    name="telefone"
                                    type="tel"
                                    required
                                    placeholder="(11) 90000-0000"
                                    value={telefone}
                                    onChange={(e) => setTelefone(formatarTelefone(e.target.value))}
                                    disabled={sessao.logado}
                                />
                            </div>
                        </div>

                        {/* 1.5. Seleção de Serviços */}
                        <div className="mb-5">
                            <label htmlFor="servicos" className="block font-sans text-[0.62rem] font-medium tracking-[0.2em] uppercase text-[rgba(197,168,124,0.75)] mb-2.5">
                                Adicionar Serviço
                            </label>
                            <DarkSelect
                                id="servicos"
                                onChange={(e) => {
                                    const idSelecionado = e.target.value;
                                    if (idSelecionado) {
                                        toggleServico(idSelecionado);
                                        e.target.value = "";
                                    }
                                }}
                                defaultValue=""
                            >
                                <option value="" disabled>Selecione um serviço pelo nome...</option>
                                {catalogoServicos.map(s => (
                                    <option key={s.id} value={s.id}>
                                        {s.nome} - R$ {s.preco?.toFixed(2)}
                                    </option>
                                ))}
                            </DarkSelect>
                        </div>

                        {/* 2. Seleção de Profissional e Data */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-5">
                            <div>
                                <label htmlFor="profissional" className="block font-sans text-[0.62rem] font-medium tracking-[0.2em] uppercase text-[rgba(197,168,124,0.75)] mb-2.5">
                                    Profissional
                                </label>
                                <div className="flex gap-3 items-center">
                                    {profissionalId && profissionalSelecionado && (
                                        <div className="w-10 h-10 rounded-full flex-shrink-0 bg-marrom-claro text-white flex items-center justify-center font-bold text-sm overflow-hidden border border-[rgba(197,168,124,0.4)]">
                                            {profissionalSelecionado.fotoUrl
                                                /* eslint-disable-next-line @next/next/no-img-element */
                                                ? <img src={profissionalSelecionado.fotoUrl} alt={`Foto de ${profissionalSelecionado.nome}`} className="w-full h-full object-cover" />
                                                : inicial(profissionalSelecionado.nome)
                                            }
                                        </div>
                                    )}
                                    <DarkSelect
                                        id="profissional"
                                        required={false}
                                        value={profissionalId || ""}
                                        onChange={e => setProfissionalId(e.target.value)}
                                        style={{ flex: 1 }}
                                    >
                                        <option value="">Qualquer profissional disponível</option>
                                        {profissionais.map(p => (
                                            <option key={p.id} value={p.id}>{p.nome}</option>
                                        ))}
                                    </DarkSelect>
                                </div>
                            </div>

                            <div>
                                <label htmlFor="dataCalendario" className="block font-sans text-[0.62rem] font-medium tracking-[0.2em] uppercase text-[rgba(197,168,124,0.75)] mb-2.5">
                                    Selecione a Data *
                                </label>
                                <DarkInput
                                    id="dataCalendario"
                                    type="date"
                                    required
                                    min={new Date().toISOString().split('T')[0]}
                                    value={dataCalendario}
                                    onChange={e => setDataCalendario(e.target.value)}
                                    disabled={servicosSelecionados.length === 0}
                                />
                            </div>

                            {/* Renderização dinâmica dos Slots de Horário */}
                            {dataCalendario && servicosSelecionados.length > 0 && (
                                <div className="col-span-1 md:col-span-2 mt-2 p-5 bg-white/[0.02] border border-[rgba(197,168,124,0.08)]">
                                    <label className="block font-sans text-[0.62rem] font-medium tracking-[0.2em] uppercase text-[rgba(197,168,124,0.75)] mb-4 text-center">
                                        Horários Disponíveis
                                    </label>

                                    {buscandoHorarios ? (
                                        <p className="text-sm text-caramelo/60 font-light text-center animate-pulse">Consultando agenda...</p>
                                    ) : horariosDisponiveis.length > 0 ? (
                                        <div className="grid grid-cols-4 sm:grid-cols-5 md:grid-cols-6 gap-2.5">
                                            {horariosDisponiveis.map(h => (
                                                <button
                                                    key={h}
                                                    type="button"
                                                    onClick={() => handleSelecionarHora(h)}
                                                    className={cn(
                                                        "py-2.5 px-2 rounded-md text-[0.8rem] font-medium transition-all duration-200 border",
                                                        horaSelecionada === h
                                                            ? "bg-caramelo text-[#0e0905] border-caramelo shadow-[0_0_12px_rgba(197,168,124,0.3)]"
                                                            : "bg-white/[0.04] text-caramelo/80 border-[rgba(197,168,124,0.15)] hover:border-caramelo/50 hover:bg-white/[0.08]"
                                                    )}
                                                >
                                                    {h}
                                                </button>
                                            ))}
                                        </div>
                                    ) : (
                                        <div className="bg-[rgba(235,87,87,0.08)] border border-[rgba(235,87,87,0.2)] p-4 rounded-lg text-center mt-3 flex flex-col gap-2">
                                            <p className="text-sm text-[#f08080] font-light">
                                                Infelizmente não temos profissionais disponíveis para realizar todos os serviços selecionados neste mesmo dia.
                                            </p>
                                            <button 
                                                type="button"
                                                onClick={() => (document.getElementById('dataCalendario') as HTMLInputElement | null)?.showPicker()} 
                                                className="text-xs font-bold text-[#f08080] bg-[#f08080]/10 hover:bg-[#f08080]/20 px-3 py-2 rounded transition-colors w-fit mx-auto border border-[#f08080]/20"
                                            >
                                                Gostaria de agendar para outro dia?
                                            </button>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>

                        {servicosSelecionados.length > 0 && totalSelecionado > 0 && (
                            <div className="flex items-center justify-between py-4 mt-2 mb-2 border-t border-[rgba(197,168,124,0.1)]">
                                <span className="font-sans text-[0.65rem] font-medium tracking-[0.2em] uppercase text-[rgba(197,168,124,0.6)]">
                                    Total · {servicosSelecionados.length} serviço{servicosSelecionados.length > 1 ? 's' : ''}
                                </span>
                                <span className="font-serif text-[1.65rem] font-light text-caramelo">
                                    R$ {totalSelecionado.toFixed(2)}
                                </span>
                            </div>
                        )}

                        <button
                            type="submit"
                            disabled={!prontoParaAgendar}
                            className="w-full py-4 mt-5 bg-caramelo text-[#0e0905] border-none font-sans text-[0.72rem] font-semibold tracking-[0.2em] uppercase cursor-pointer transition-all duration-300 hover:enabled:bg-[#d4b896] hover:enabled:shadow-[0_8px_32px_rgba(197,168,124,0.25)] active:enabled:scale-[0.99] disabled:opacity-35 disabled:cursor-not-allowed"
                        >
                            {servicosSelecionados.length === 0
                                ? 'Selecione os serviços acima'
                                : !prontoParaAgendar
                                    ? 'Preencha todos os dados e o horário'
                                    : sessao.logado
                                        ? `Confirmar ${servicosSelecionados.length} Serviço${servicosSelecionados.length > 1 ? 's' : ''}`
                                        : 'Registrar e Agendar'}
                        </button>
                    </form>
                </div>
            </div>
        </section>
    )
})

export default FormularioReserva