'use client'
import { memo } from 'react'
import Link from 'next/link'
import { cn } from './cn'
import type { FormularioReservaProps, TipoMensagem } from './types'

const FEEDBACK: Record<Exclude<TipoMensagem, ''>, string> = {
    sucesso: 'bg-[rgba(52,199,89,0.1)] border border-[rgba(52,199,89,0.25)] text-[#6fcf97]',
    erro: 'bg-[rgba(235,87,87,0.1)] border border-[rgba(235,87,87,0.25)] text-[#f08080]',
    info: 'bg-[rgba(197,168,124,0.1)] border border-[rgba(197,168,124,0.2)] text-caramelo',
}

// ── inputs para fundo escuro ──────────────────────────────────────────────────
// Classes globais .dark-select e .dark-input definidas em globals.css
// para estilizar <option> e o calendar-picker-indicator (impossível via Tailwind).
const INPUT_BASE = 'w-full py-[0.9rem] px-4 bg-white/[0.06] border border-[rgba(197,168,124,0.2)] rounded-sm text-white/85 font-sans text-[0.875rem] font-light outline-none transition-[border-color,background] duration-200 disabled:opacity-35 disabled:cursor-not-allowed focus:border-[rgba(197,168,124,0.6)] focus:bg-white/[0.09]'

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
            <div className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2" aria-hidden="true">
                <svg width="12" height="7" viewBox="0 0 12 7" fill="none">
                    <path d="M1 1l5 5 5-5" stroke="#c5a87c" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
            </div>
        </div>
    )
})

// ── Componente principal ──────────────────────────────────────────────────────
const FormularioReserva = memo(function FormularioReserva({
    sessao, mounted, profissionais, catalogoServicos, servicosSelecionados,
    totalSelecionado, profissionalId, setProfissionalId, dataHora, setDataHora,
    mensagem, handleAgendar, profissionalSelecionado,
}: FormularioReservaProps) {
    const inicial = (nome?: string) => nome?.charAt(0).toUpperCase() ?? '?'

    return (
        <section id="agendamento" className="bg-marrom-profundo py-28 px-6 md:px-16">
            <div className="max-w-[820px] mx-auto">

                <div className="text-center mb-14">
                    <p className="text-[0.68rem] font-medium tracking-[0.25em] uppercase text-[rgba(197,168,124,0.6)] mb-3">Reserve o seu horário</p>
                    <h2 className="font-serif text-[clamp(2rem,3vw,2.75rem)] font-light text-white mb-3">Agendamento Online</h2>
                    <p className="text-[0.82rem] text-white/40 font-light tracking-[0.05em]">Escolha o profissional e horário ideal para si</p>
                </div>

                <div className="bg-white/[0.04] border border-[rgba(197,168,124,0.15)] rounded p-7 md:p-12 backdrop-blur-sm">

                    {/* Aviso de login */}
                    {mounted && !sessao.logado && (
                        <div className="flex items-center justify-between gap-4 flex-wrap p-5 px-6 mb-7 bg-[rgba(197,168,124,0.07)] border border-[rgba(197,168,124,0.2)] rounded">
                            <p className="text-[0.8rem] text-white/45 font-light m-0">
                                Para finalizar o seu agendamento, <strong className="text-caramelo font-medium">faça login com a sua conta</strong>.
                            </p>
                            <Link href="/login" className="py-2 px-5 border border-[rgba(197,168,124,0.35)] rounded-sm font-sans text-[0.7rem] font-medium tracking-[0.15em] uppercase text-caramelo no-underline whitespace-nowrap transition-all hover:bg-[rgba(197,168,124,0.1)] hover:border-[rgba(197,168,124,0.6)]">
                                Entrar
                            </Link>
                        </div>
                    )}

                    {/* Feedback */}
                    {mensagem.texto && mensagem.tipo && (
                        <div className={cn('flex items-center gap-[0.6rem] py-[0.9rem] px-5 rounded mb-6 text-[0.82rem] font-normal', FEEDBACK[mensagem.tipo])}>
                            {mensagem.tipo === 'sucesso' && '✓ '}
                            {mensagem.tipo === 'erro' && '✕ '}
                            {mensagem.texto}
                        </div>
                    )}

                    {/* Badges de serviços selecionados */}
                    {servicosSelecionados.length > 0 && (
                        <div className="flex flex-wrap gap-2 mb-6 min-h-8">
                            {catalogoServicos.filter(s => servicosSelecionados.includes(s.id)).map(s => (
                                <span key={s.id} className="py-[0.3rem] px-3 bg-[rgba(197,168,124,0.12)] border border-[rgba(197,168,124,0.25)] rounded-sm text-[0.7rem] font-medium text-caramelo tracking-[0.05em] animate-fade-in">
                                    {s.nome}
                                </span>
                            ))}
                        </div>
                    )}

                    <form onSubmit={handleAgendar}>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-5">

                            {/* Profissional */}
                            <div>
                                <label htmlFor="profissional" className="block text-[0.68rem] font-medium tracking-[0.18em] uppercase text-[rgba(197,168,124,0.8)] mb-[0.6rem]">
                                    Profissional
                                </label>
                                <div className="flex gap-3 items-center">
                                    {profissionalId && (
                                        <div className="w-[45px] h-[45px] rounded-full flex-shrink-0 bg-marrom-claro text-white flex items-center justify-center font-bold text-[1.1rem] overflow-hidden border-2 border-caramelo">
                                            {profissionalSelecionado?.fotoUrl
                                                ? <img src={profissionalSelecionado.fotoUrl} alt={`Foto de ${profissionalSelecionado.nome}`} className="w-full h-full object-cover" />
                                                : inicial(profissionalSelecionado?.nome)
                                            }
                                        </div>
                                    )}
                                    <DarkSelect id="profissional" required value={profissionalId} onChange={e => setProfissionalId(e.target.value)} disabled={!sessao.logado} style={{ flex: 1 }}>
                                        <option value="">Qualquer profissional</option>
                                        {profissionais.map(p => <option key={p.id} value={p.id}>{p.nome}</option>)}
                                    </DarkSelect>
                                </div>
                            </div>

                            {/* Data e Horário */}
                            <div>
                                <label htmlFor="dataHora" className="block text-[0.68rem] font-medium tracking-[0.18em] uppercase text-[rgba(197,168,124,0.8)] mb-[0.6rem]">
                                    Data e Horário
                                </label>
                                <DarkInput id="dataHora" type="datetime-local" required value={dataHora} onChange={e => setDataHora(e.target.value)} disabled={!sessao.logado} />
                            </div>
                        </div>

                        {/* Total */}
                        {servicosSelecionados.length > 0 && totalSelecionado > 0 && (
                            <div className="flex items-center justify-between py-4 mt-2 mb-1 border-t border-[rgba(197,168,124,0.15)]">
                                <span className="text-[0.7rem] font-medium tracking-[0.18em] uppercase text-[rgba(197,168,124,0.6)]">
                                    Total · {servicosSelecionados.length} serviço{servicosSelecionados.length > 1 ? 's' : ''}
                                </span>
                                <span className="font-serif text-[1.75rem] font-light text-caramelo">R$ {totalSelecionado.toFixed(2)}</span>
                            </div>
                        )}

                        <button
                            type="submit"
                            disabled={!sessao.logado}
                            className="w-full p-4 mt-5 bg-caramelo text-marrom-profundo border-none rounded font-sans text-[0.78rem] font-semibold tracking-[0.2em] uppercase cursor-pointer transition-[background,transform] duration-200 hover:enabled:bg-[#d4b896] active:enabled:scale-[0.99] disabled:opacity-40 disabled:cursor-not-allowed"
                        >
                            {sessao.logado
                                ? servicosSelecionados.length > 0
                                    ? `Confirmar ${servicosSelecionados.length} Serviço${servicosSelecionados.length > 1 ? 's' : ''}`
                                    : 'Selecione os serviços acima'
                                : 'Faça login para agendar'}
                        </button>
                    </form>
                </div>
            </div>
        </section>
    )
})

export default FormularioReserva