'use client'

import { useState } from 'react'
import Link from 'next/link'
import { cn } from './cn'
import type { FormularioReservaProps, TipoMensagem, AgendamentoConfirmado } from './types'
import { ModalAgendamento } from '../ModalAgendamento'
import type { AgendamentoConfirmado as ModalAgendamentoConfirmado } from '../ModalAgendamento/types'

const FEEDBACK: Record<Exclude<TipoMensagem, ''>, string> = {
    sucesso: 'bg-[rgba(52,199,89,0.08)] border border-[rgba(52,199,89,0.2)] text-[#6fcf97]',
    erro: 'bg-[rgba(235,87,87,0.08)] border border-[rgba(235,87,87,0.2)] text-[#f08080]',
    info: 'bg-[rgba(197,168,124,0.08)] border border-[rgba(197,168,124,0.18)] text-caramelo',
}

const INPUT_BASE =
    'w-full py-[0.85rem] px-4 bg-white/[0.04] border border-[rgba(197,168,124,0.15)] text-white/80 font-sans text-[0.875rem] font-light outline-none transition-all duration-300 disabled:opacity-30 disabled:cursor-not-allowed focus:border-[rgba(197,168,124,0.5)] focus:bg-white/[0.07] placeholder:text-white/20'

const DarkInput = function DarkInput(props: React.InputHTMLAttributes<HTMLInputElement>) {
    return <input {...props} className={cn('dark-input', INPUT_BASE, props.className)} />
}

interface DarkSelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
    children: React.ReactNode
}

const DarkSelect = function DarkSelect({ children, ...props }: DarkSelectProps) {
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
}

// Formata "YYYY-MM-DD" + "HH:MM" → exibição humanizada
function formatarDataHora(dataIso: string, hora: string): string {
    try {
        return new Intl.DateTimeFormat('pt-BR', {
            day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit',
        }).format(new Date(`${dataIso}T${hora}`)) + 'h'
    } catch {
        return `${dataIso} ${hora}h`
    }
}

const FormularioReserva = function FormularioReserva({
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
    agendamentosConfirmados,
    setAgendamentosConfirmados,
    mensagem,
    handleAgendar,
    profissionalSelecionado,
    toggleServico,
}: FormularioReservaProps) {
    const [nome, setNome] = useState('')
    const [telefone, setTelefone] = useState('')
    const [modalAberto, setModalAberto] = useState(false)

    const nomeFinal = sessao.logado && sessao.nome ? sessao.nome : nome
    const inicial = (n?: string) => n?.charAt(0).toUpperCase() ?? '?'

    const formatarTelefone = (valor: string) => valor.replace(/[^\d() -]/g, '')

    const isMultiServico = servicosSelecionados.length > 1

    // ── Callback recebido do ModalAgendamento (novo: array de resultados) ──────
    const lidarComHorariosConfirmados = (resultados: ModalAgendamentoConfirmado[]) => {
        // Converte para o tipo local (estruturalmente idêntico)
        const ags: AgendamentoConfirmado[] = resultados.map(r => ({
            servicoId: r.servicoId,
            dataIso: r.dataIso,
            hora: r.hora,
        }))
        setAgendamentosConfirmados(ags)

        // Mantém dataHora sincronizado com o primeiro resultado (compat. com single-service)
        if (resultados.length > 0) {
            setDataHora(`${resultados[0].dataIso}T${resultados[0].hora}:00`)
        }
    }

    // ── "Serviços para o modal" — tipo compatível com ServicoSelecionado ──────
    const servicosParaOModal = catalogoServicos.filter(s =>
        servicosSelecionados.includes(s.id)
    )

    // ── Pronto para agendar ───────────────────────────────────────────────────
    const prontoParaAgendar =
        servicosSelecionados.length > 0 &&
        nomeFinal.length > 2 &&
        telefone.replace(/\D/g, '').length >= 10 &&
        (
            isMultiServico
                ? agendamentosConfirmados.length === servicosSelecionados.length
                : !!dataHora
        )

    // ── Label do botão de submit ──────────────────────────────────────────────
    const labelBotao = () => {
        if (servicosSelecionados.length === 0) return 'Selecione os serviços acima'
        if (!prontoParaAgendar) {
            return isMultiServico
                ? `Selecione todos os horários (${agendamentosConfirmados.length}/${servicosSelecionados.length})`
                : 'Preencha todos os dados e o horário'
        }
        return sessao.logado
            ? `Confirmar ${servicosSelecionados.length} Serviço${servicosSelecionados.length > 1 ? 's' : ''}`
            : 'Registrar e Agendar'
    }

    return (
        <section id="agendamento" className="relative bg-[#0e0905] py-24 md:py-32 overflow-hidden">
            {/* Atmosfera */}
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
                {/* Cabeçalho */}
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

                {/* Card do formulário */}
                <div
                    className="bg-white/[0.03] border border-[rgba(197,168,124,0.1)] p-8 md:p-12 backdrop-blur-sm"
                    style={{ clipPath: 'polygon(12px 0,100% 0,100% calc(100% - 12px),calc(100% - 12px) 100%,0 100%,0 12px)' }}
                >
                    {/* Banner de login */}
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

                    {/* Feedback */}
                    {mensagem.texto && mensagem.tipo && (
                        <div className={cn('flex items-center gap-2 py-3.5 px-5 mb-7 text-[0.8rem] font-light', FEEDBACK[mensagem.tipo])}>
                            <span>{mensagem.tipo === 'sucesso' ? '✓' : mensagem.tipo === 'erro' ? '✕' : '·'}</span>
                            {mensagem.texto}
                        </div>
                    )}

                    {/* Tags de serviços selecionados */}
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
                        {/* 1. Dados do cliente */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-5">
                            <div>
                                <label htmlFor="nome" className="block font-sans text-[0.62rem] font-medium tracking-[0.2em] uppercase text-[rgba(197,168,124,0.75)] mb-2.5">
                                    Nome Completo *
                                </label>
                                <DarkInput
                                    id="nome"
                                    type="text"
                                    required
                                    placeholder="Ex: Ana Silva"
                                    value={nomeFinal}
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
                                    type="tel"
                                    required
                                    placeholder="(11) 90000-0000"
                                    value={telefone}
                                    onChange={(e) => setTelefone(formatarTelefone(e.target.value))}
                                    disabled={sessao.logado}
                                />
                            </div>
                        </div>

                        {/* 2. Seleção de serviço adicional */}
                        <div className="mb-5">
                            <label htmlFor="servicos" className="block font-sans text-[0.62rem] font-medium tracking-[0.2em] uppercase text-[rgba(197,168,124,0.75)] mb-2.5">
                                Adicionar Serviço
                            </label>
                            <DarkSelect
                                id="servicos"
                                onChange={(e) => {
                                    const id = e.target.value
                                    if (id) { toggleServico(id); e.target.value = '' }
                                }}
                                defaultValue=""
                            >
                                <option value="" disabled>Selecione um serviço pelo nome…</option>
                                {catalogoServicos.map(s => (
                                    <option key={s.id} value={s.id}>
                                        {s.nome} — R$ {s.preco?.toFixed(2)}
                                    </option>
                                ))}
                            </DarkSelect>
                        </div>

                        {/* 3. Profissional + Data/Horário */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-5">
                            {/* Profissional */}
                            <div>
                                <label htmlFor="profissional" className="block font-sans text-[0.62rem] font-medium tracking-[0.2em] uppercase text-[rgba(197,168,124,0.75)] mb-2.5">
                                    Profissional
                                </label>
                                <div className="flex gap-3 items-center">
                                    {profissionalId && profissionalSelecionado && (
                                        <div className="w-10 h-10 rounded-full flex-shrink-0 bg-marrom-claro text-white flex items-center justify-center font-bold text-sm overflow-hidden border border-[rgba(197,168,124,0.4)]">
                                            {profissionalSelecionado.fotoUrl
                                                // eslint-disable-next-line @next/next/no-img-element
                                                ? <img src={profissionalSelecionado.fotoUrl} alt={profissionalSelecionado.nome} className="w-full h-full object-cover" />
                                                : inicial(profissionalSelecionado.nome)
                                            }
                                        </div>
                                    )}
                                    <DarkSelect
                                        id="profissional"
                                        value={profissionalId || ''}
                                        onChange={e => {
                                            setProfissionalId(e.target.value)
                                            // Reseta horários ao trocar de profissional
                                            setDataHora('')
                                            setAgendamentosConfirmados([])
                                        }}
                                        style={{ flex: 1 }}
                                    >
                                        <option value="">Qualquer profissional</option>
                                        {profissionais.map(p => (
                                            <option key={p.id} value={p.id}>{p.nome}</option>
                                        ))}
                                    </DarkSelect>
                                </div>
                            </div>

                            {/* Data e Horário */}
                            <div>
                                <label className="block font-sans text-[0.62rem] font-medium tracking-[0.2em] uppercase text-[rgba(197,168,124,0.75)] mb-2.5">
                                    {isMultiServico ? 'Horários dos Serviços *' : 'Data e Horário *'}
                                </label>

                                {/* ── SINGLE SERVICE: botão único ── */}
                                {!isMultiServico && (
                                    <button
                                        type="button"
                                        onClick={() => setModalAberto(true)}
                                        disabled={servicosSelecionados.length === 0}
                                        className={cn(
                                            'w-full py-[0.85rem] px-4 bg-white/[0.04] border text-left font-sans text-[0.875rem] font-light outline-none transition-all duration-300 disabled:opacity-30 disabled:cursor-not-allowed flex justify-between items-center rounded-none',
                                            dataHora
                                                ? 'border-caramelo text-white shadow-[0_0_10px_rgba(197,168,124,0.1)]'
                                                : 'border-[rgba(197,168,124,0.15)] text-white/50 hover:bg-white/[0.07]',
                                        )}
                                    >
                                        <span>
                                            {dataHora
                                                ? new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }).format(new Date(dataHora)) + 'h'
                                                : 'Selecionar na Agenda…'}
                                        </span>
                                        <CalendarIcon />
                                    </button>
                                )}

                                {/* ── MULTI SERVICE: lista de serviços + botão ── */}
                                {isMultiServico && (
                                    <div className="space-y-2">
                                        {catalogoServicos
                                            .filter(s => servicosSelecionados.includes(s.id))
                                            .map((s, i) => {
                                                const conf = agendamentosConfirmados.find(a => a.servicoId === s.id)
                                                return (
                                                    <div
                                                        key={s.id}
                                                        className="flex items-center justify-between py-2 px-3 border border-[rgba(197,168,124,0.12)] bg-white/[0.02]"
                                                    >
                                                        <span className="text-white/50 text-[0.75rem] font-sans">
                                                            <span className="text-caramelo/60 mr-1.5">{i + 1}.</span>
                                                            {s.nome}
                                                        </span>
                                                        {conf ? (
                                                            <span className="text-caramelo text-[0.72rem] font-medium font-mono">
                                                                ✓ {formatarDataHora(conf.dataIso, conf.hora)}
                                                            </span>
                                                        ) : (
                                                            <span className="text-white/25 text-[0.65rem] font-sans">
                                                                A selecionar
                                                            </span>
                                                        )}
                                                    </div>
                                                )
                                            })}

                                        <button
                                            type="button"
                                            onClick={() => setModalAberto(true)}
                                            disabled={servicosSelecionados.length === 0}
                                            className="w-full py-[0.7rem] px-4 border border-[rgba(197,168,124,0.2)] text-white/50 text-[0.8rem] font-sans font-light bg-white/[0.02] hover:bg-white/[0.06] transition-all flex items-center justify-between disabled:opacity-30 disabled:cursor-not-allowed mt-1"
                                        >
                                            <span>
                                                {agendamentosConfirmados.length === 0
                                                    ? 'Selecionar horários na agenda…'
                                                    : agendamentosConfirmados.length === servicosSelecionados.length
                                                        ? 'Todos selecionados — clique para alterar'
                                                        : `${agendamentosConfirmados.length} de ${servicosSelecionados.length} selecionados…`}
                                            </span>
                                            <CalendarIcon />
                                        </button>
                                    </div>
                                )}

                                {servicosSelecionados.length === 0 && (
                                    <p className="text-[0.6rem] text-red-400 mt-1 opacity-70">
                                        Selecione um serviço primeiro
                                    </p>
                                )}
                            </div>
                        </div>

                        {/* Total */}
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

                        {/* CTA */}
                        <button
                            type="submit"
                            disabled={!prontoParaAgendar}
                            className="w-full py-4 mt-5 bg-caramelo text-[#0e0905] border-none font-sans text-[0.72rem] font-semibold tracking-[0.2em] uppercase cursor-pointer transition-all duration-300 hover:enabled:bg-[#d4b896] hover:enabled:shadow-[0_8px_32px_rgba(197,168,124,0.25)] active:enabled:scale-[0.99] disabled:opacity-35 disabled:cursor-not-allowed"
                        >
                            {labelBotao()}
                        </button>
                    </form>
                </div>
            </div>

            {/* Modal de agendamento (single + multi-step) */}
            <ModalAgendamento
                isOpen={modalAberto}
                onClose={() => setModalAberto(false)}
                servicosSelecionados={servicosParaOModal}
                profissionalId={profissionalId || null}
                onConfirmar={lidarComHorariosConfirmados}
            />
        </section>
    )
}

export default FormularioReserva

// ── Ícone do calendário (inline para evitar importação extra) ─────────────────
function CalendarIcon() {
    return (
        <svg className="text-caramelo flex-shrink-0" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
            <line x1="16" y1="2" x2="16" y2="6" />
            <line x1="8" y1="2" x2="8" y2="6" />
            <line x1="3" y1="10" x2="21" y2="10" />
        </svg>
    )
}