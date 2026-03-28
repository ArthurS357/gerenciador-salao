'use client'
import { memo, useState } from 'react'
import { cn } from './cn'
import type { ServicosVitrineProps, Servico } from './types'
// IMPORTANTE: Ajuste o caminho de importação abaixo conforme a pasta onde você salvou
import { ModalAgendamento } from '../ModalAgendamento'
// SVG icons — sem emoji (regra UI/UX)
const ICONES_SVG = [
    // Tesoura (corte)
    <svg key="0" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="6" cy="6" r="3" /><circle cx="6" cy="18" r="3" /><path d="M20 4L8.12 15.88M14.47 14.48L20 20M8.12 8.12L12 12" /></svg>,
    // Flor (tratamento)
    <svg key="1" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /></svg>,
    // Pincel (coloração)
    <svg key="2" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M18.37 2.63L14 7l-1.59-1.59a2 2 0 0 0-2.82 0L8 7l9 9 1.59-1.59a2 2 0 0 0 0-2.82L17 10l4.37-4.37a2.12 2.12 0 1 0-3-3z" /><path d="M9 8c-2 3-4 3.5-7 4l8 10c2-1 6-5 6-7" /></svg>,
    // Gota (hidratação)
    <svg key="3" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z" /></svg>,
    // Estrela (premium)
    <svg key="4" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" /></svg>,
    // Espiral (ondulação)
    <svg key="5" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" /></svg>,
] as const

interface CardProps {
    servico: Servico
    icone: React.ReactNode
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
                'relative flex flex-col p-8 cursor-pointer outline-none group',
                'border-b border-r border-[rgba(197,168,124,0.1)]',
                'transition-all duration-300',
                selecionado
                    ? 'bg-[#fdf8f4] shadow-[inset_0_0_0_1.5px_rgba(197,168,124,0.6)]'
                    : 'bg-white hover:bg-[#faf6f2]'
            )}
        >
            {/* Indicador de seleção — canto superior direito */}
            <div
                aria-hidden="true"
                className={cn(
                    'absolute top-5 right-5 w-5 h-5 rounded-full border transition-all duration-300 flex items-center justify-center',
                    selecionado
                        ? 'bg-marrom-claro border-marrom-claro'
                        : 'border-[rgba(197,168,124,0.3)] group-hover:border-[rgba(197,168,124,0.6)]'
                )}
            >
                {selecionado && (
                    <svg width="9" height="7" viewBox="0 0 9 7" fill="none" aria-hidden="true">
                        <path d="M1 3.5l2.5 2.5L8 1" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                )}
            </div>

            {/* Ícone */}
            <div
                className={cn(
                    'w-10 h-10 rounded-full flex items-center justify-center mb-6 transition-all duration-300',
                    selecionado
                        ? 'bg-marrom-claro/10 text-marrom-claro'
                        : 'bg-[#f3ede6] text-[#9c8070] group-hover:bg-marrom-claro/8 group-hover:text-marrom-claro'
                )}
            >
                {icone}
            </div>

            {/* Nome */}
            <h3 className="font-serif text-[1.2rem] font-semibold text-[#2a1810] mb-2 leading-snug">
                {servico.nome}
            </h3>

            {/* Descrição */}
            <p className="text-[0.8rem] text-[#9c8070] font-light leading-[1.65] mb-auto min-h-[52px]">
                {servico.descricao ?? ''}
            </p>

            {/* Rodapé do card */}
            <div className="flex items-end justify-between mt-6 pt-5 border-t border-[rgba(197,168,124,0.15)]">
                <span className={cn(
                    'font-serif text-[1.4rem] font-light leading-none transition-colors duration-300',
                    selecionado ? 'text-marrom-claro' : 'text-marrom-medio'
                )}>
                    {servico.preco != null ? `R$ ${servico.preco.toFixed(2)}` : 'Sob Consulta'}
                </span>
                {servico.tempoMinutos != null && (
                    <div className="flex items-center gap-1.5 text-[#9c8070]">
                        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                            <circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" />
                        </svg>
                        <span className="text-[0.68rem] font-normal tracking-[0.06em]">
                            {servico.tempoMinutos} min
                        </span>
                    </div>
                )}
            </div>
        </div>
    )
})

const ServicosVitrine = memo(function ServicosVitrine({
    catalogoServicos, servicosSelecionados, toggleServico, totalSelecionado,
}: ServicosVitrineProps) {
    const [busca, setBusca] = useState("");

    // 1. Estado para controlar a abertura do Modal
    const [modalAberto, setModalAberto] = useState(false);

    const servicosFiltrados = catalogoServicos.filter(s =>
        s.nome.toLowerCase().includes(busca.toLowerCase()) ||
        (s.descricao && s.descricao.toLowerCase().includes(busca.toLowerCase()))
    );

    // 2. Transforma o array de IDs em array de Objetos (Servico) para enviar ao Modal
    const servicosParaOModal = catalogoServicos.filter(s =>
        servicosSelecionados.includes(s.id)
    );

    return (
        <section id="servicos" className="relative bg-[#fdfaf6] py-24 md:py-32">
            {/* Linha de transição do escuro */}
            <div aria-hidden="true" className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-[rgba(197,168,124,0.2)] to-transparent" />

            <div className="max-w-[1200px] mx-auto px-6 md:px-16">

                {/* Cabeçalho */}
                <div className="flex flex-col md:flex-row md:items-end justify-between gap-8 mb-10">
                    <div>
                        <div className="flex items-center gap-3 mb-5">
                            <div className="h-px w-8 bg-gradient-to-r from-transparent to-caramelo" />
                            <span className="font-sans text-[0.62rem] font-medium tracking-[0.3em] uppercase text-caramelo">
                                O que oferecemos
                            </span>
                        </div>
                        <h2 className="font-serif text-[2.2rem] md:text-[3rem] font-light text-[#2a1810] leading-[1.1] tracking-[-0.01em]">
                            Tratamentos pensados para
                            <br />
                            <em className="italic text-marrom-claro not-italic font-semibold">realçar</em> você
                        </h2>
                    </div>
                    <p className="text-[0.75rem] text-[#9c8070] font-light tracking-[0.05em] md:text-right max-w-[200px]">
                        Selecione os serviços que deseja
                    </p>
                </div>

                {/* Barra de Busca Elegante */}
                <div className="mb-10 max-w-md">
                    <div className="relative">
                        <input
                            type="text"
                            placeholder="Buscar tratamento..."
                            value={busca}
                            onChange={e => setBusca(e.target.value)}
                            className="w-full pl-11 pr-4 py-3 bg-white border border-[rgba(197,168,124,0.3)] rounded-full outline-none focus:border-marrom-claro shadow-sm transition-all text-[#2a1810] placeholder:text-[#9c8070]/60 text-sm"
                        />
                        <svg className="absolute left-4 top-1/2 -translate-y-1/2 text-[#9c8070]/60" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <circle cx="11" cy="11" r="8"></circle>
                            <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                        </svg>
                    </div>
                </div>

                {/* Grid de cards */}
                <div className="border border-[rgba(197,168,124,0.15)] overflow-hidden shadow-[0_2px_40px_rgba(42,24,16,0.04)]">
                    {servicosFiltrados.length === 0 ? (
                        <div className="p-16 text-center text-[#9c8070]">
                            Nenhum serviço encontrado para &ldquo;{busca}&rdquo;.
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
                            {servicosFiltrados.map((s, i) => (
                                <CardServico
                                    key={s.id}
                                    servico={s}
                                    icone={ICONES_SVG[i % ICONES_SVG.length]}
                                    selecionado={servicosSelecionados.includes(s.id)}
                                    onToggle={() => toggleServico(s.id)}
                                />
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* Barra flutuante de seleção */}
            {servicosSelecionados.length > 0 && (
                <div className="sticky bottom-6 mt-8 mx-6 md:mx-auto md:max-w-[680px]">
                    <div className="flex items-center justify-between gap-4 px-7 py-4 bg-[#2a1810] shadow-[0_12px_40px_rgba(42,24,16,0.35)]"
                        style={{ clipPath: 'polygon(8px 0,100% 0,100% calc(100% - 8px),calc(100% - 8px) 100%,0 100%,0 8px)' }}
                    >
                        <div>
                            <span className="block font-sans text-[0.6rem] font-medium tracking-[0.2em] uppercase text-caramelo/70 mb-1">
                                {servicosSelecionados.length} serviço{servicosSelecionados.length > 1 ? 's' : ''} selecionado{servicosSelecionados.length > 1 ? 's' : ''}
                            </span>
                            <span className="block font-serif text-[1.6rem] font-light text-white">
                                R$ {totalSelecionado.toFixed(2)}
                            </span>
                        </div>
                        {/* 3. Botão substituindo a Tag de âncora anterior */}
                        <button
                            onClick={() => setModalAberto(true)}
                            className="inline-flex items-center gap-2.5 py-3 px-7 bg-caramelo text-[#2a1810] font-sans text-[0.7rem] font-semibold tracking-[0.18em] uppercase transition-colors duration-300 hover:bg-[#d4b896] whitespace-nowrap border-none cursor-pointer"
                        >
                            Confirmar
                            <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true">
                                <path d="M1 6h10M7 2l4 4-4 4" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                        </button>
                    </div>
                </div>
            )}

            {/* 4. Renderiza o Componente do Modal no final da section */}
            <ModalAgendamento
                isOpen={modalAberto}
                onClose={() => setModalAberto(false)}
                servicosSelecionados={servicosParaOModal}
                profissionalId={null}
                onConfirmar={() => setModalAberto(false)}
            />

        </section>
    )
})

export default ServicosVitrine