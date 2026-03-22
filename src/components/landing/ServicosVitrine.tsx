'use client'
import { memo } from 'react'
import { cn } from './cn'
import type { ServicosVitrineProps, Servico } from './types'

const ICONES = ['✦', '◈', '◉', '◆', '◇', '⬡'] as const

interface CardProps {
    servico: Servico
    icone: string
    selecionado: boolean
    onToggle: () => void
}

const CardServico = memo(function CardServico({ servico, icone, selecionado, onToggle }: CardProps) {
    return (
        <div
            role="checkbox"
            aria-checked={selecionado}
            tabIndex={0}
            onClick={onToggle}
            onKeyDown={(e) => e.key === ' ' && onToggle()}
            className={cn(
                'bg-white p-10 cursor-pointer transition-[background,box-shadow] outline-none hover:bg-[#faf6f1]',
                selecionado && 'bg-[#fdf8f3] shadow-[inset_0_0_0_2px_#c5a87c]'
            )}
        >
            <div className="flex justify-between items-start mb-6">
                <div className={cn('w-9 h-9 rounded-full flex items-center justify-center text-base flex-shrink-0 transition-colors', selecionado ? 'bg-caramelo text-white' : 'bg-creme-escuro')}>
                    {icone}
                </div>
                <div
                    aria-hidden="true"
                    className={cn('w-[22px] h-[22px] rounded-full border-[1.5px] flex items-center justify-center transition-all flex-shrink-0', selecionado ? 'bg-marrom-claro border-marrom-claro' : 'border-bege-borda')}
                >
                    <svg className={selecionado ? 'block' : 'hidden'} width="10" height="8" viewBox="0 0 10 8" fill="none">
                        <path d="M1 4l3 3 5-6" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                </div>
            </div>

            <div className="font-serif text-[1.35rem] font-semibold text-marrom-profundo mb-2">{servico.nome}</div>
            <div className="text-[0.8rem] text-texto-suave font-light leading-[1.6] mb-6 min-h-[40px]">{servico.descricao}</div>

            <div className="flex items-center justify-between pt-6 border-t border-creme-escuro">
                <span className="font-serif text-2xl font-light text-marrom-claro">
                    {servico.preco != null ? `R$ ${servico.preco.toFixed(2)}` : 'Sob Consulta'}
                </span>
                {servico.tempoMinutos != null && (
                    <span className="text-[0.7rem] font-normal tracking-[0.1em] text-texto-suave uppercase">{servico.tempoMinutos} min</span>
                )}
            </div>
        </div>
    )
})

const ServicosVitrine = memo(function ServicosVitrine({ catalogoServicos, servicosSelecionados, toggleServico, totalSelecionado }: ServicosVitrineProps) {
    return (
        <section id="servicos" className="py-28 px-6 md:px-16 max-w-[1200px] mx-auto">
            <div className="flex items-end justify-between mb-14 gap-6 flex-wrap">
                <div>
                    <p className="text-[0.68rem] font-medium tracking-[0.25em] uppercase text-caramelo mb-3">O que oferecemos</p>
                    <h2 className="font-serif text-[clamp(2rem,3vw,2.75rem)] font-normal text-marrom-profundo leading-[1.15]">
                        Tratamentos pensados<br />para <em className="italic text-marrom-claro">realçar</em> você
                    </h2>
                </div>
                <p className="text-[0.78rem] text-texto-suave font-light tracking-[0.03em] text-right">Clique nos serviços para selecionar</p>
            </div>

            <div className="grid [grid-template-columns:repeat(auto-fill,minmax(280px,1fr))] gap-px bg-bege-borda border border-bege-borda rounded overflow-hidden">
                {catalogoServicos.map((s, i) => (
                    <CardServico
                        key={s.id}
                        servico={s}
                        icone={ICONES[i % ICONES.length]}
                        selecionado={servicosSelecionados.includes(s.id)}
                        onToggle={() => toggleServico(s.id)}
                    />
                ))}
            </div>

            {servicosSelecionados.length > 0 && (
                <div className="sticky bottom-6 mx-auto mt-8 max-w-[680px] py-[1.1rem] px-7 bg-marrom-profundo rounded flex items-center justify-between gap-4 flex-wrap shadow-[0_8px_32px_rgba(42,24,16,0.3)] animate-slide-up">
                    <div className="flex flex-col gap-1">
                        <span className="text-[0.7rem] font-medium tracking-[0.15em] uppercase text-caramelo">
                            {servicosSelecionados.length} serviço{servicosSelecionados.length > 1 ? 's' : ''} selecionado{servicosSelecionados.length > 1 ? 's' : ''}
                        </span>
                        <span className="font-serif text-2xl font-light text-white">R$ {totalSelecionado.toFixed(2)}</span>
                    </div>
                    <a href="#agendamento" className="py-[0.7rem] px-7 bg-caramelo text-marrom-profundo rounded-sm font-sans text-[0.75rem] font-semibold tracking-[0.15em] uppercase no-underline inline-block transition-colors whitespace-nowrap hover:bg-[#d4b896]">
                        Concluir Reserva →
                    </a>
                </div>
            )}
        </section>
    )
})

export default ServicosVitrine