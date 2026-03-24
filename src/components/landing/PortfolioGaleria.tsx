'use client' // Passo 1: Adicionar diretiva de cliente

import { memo, useState } from 'react'
import type { PortfolioGaleriaProps } from './types'

const PortfolioGaleria = memo(function PortfolioGaleria({ itensPortfolio }: PortfolioGaleriaProps) {
    // Passo 2: Adicionar estado e lógica de filtro
    const [busca, setBusca] = useState('')
    
    const itensFiltrados = itensPortfolio.filter(item => 
        item.titulo.toLowerCase().includes(busca.toLowerCase())
    )

    if (!itensPortfolio.length) return null

    return (
        <section className="relative bg-[#0e0905] py-24 md:py-32 overflow-hidden">
            {/* ... (Atmosfera mantida igual) */}

            <div className="relative z-10 max-w-[1200px] mx-auto px-6 md:px-16">

                {/* Cabeçalho */}
                <div className="flex flex-col md:flex-row md:items-end justify-between gap-8 mb-14">
                    <div>
                        <div className="flex items-center gap-3 mb-5">
                            <div className="h-px w-8 bg-gradient-to-r from-transparent to-[#c5a87c]/60" />
                            <span className="font-sans text-[0.62rem] font-medium tracking-[0.3em] uppercase text-[#c5a87c]/60">
                                Nosso Portfólio
                            </span>
                        </div>
                        <h2 className="font-serif text-[2.2rem] md:text-[3rem] font-light text-white/85 leading-[1.1] tracking-[-0.01em]">
                            Resultados que
                            <em className="block italic text-[#c5a87c] not-italic font-semibold">Inspiram</em>
                        </h2>
                    </div>

                    <div className="flex flex-col items-end gap-4">
                        <a
                            href="https://instagram.com"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="group inline-flex items-center gap-2.5 text-[0.65rem] font-medium tracking-[0.18em] uppercase text-white/35 transition-colors duration-300 hover:text-[#c5a87c]/80"
                        >
                            {/* SVG do Instagram mantido */}
                            Ver Instagram
                        </a>
                        
                        {/* Passo 3: Campo de Pesquisa Escuro */}
                        <div className="relative w-full md:w-64">
                            <input 
                                type="text" 
                                placeholder="Procurar serviço..." 
                                value={busca}
                                onChange={(e) => setBusca(e.target.value)}
                                className="w-full bg-[#1a0f0a] border border-[rgba(197,168,124,0.3)] text-white/80 placeholder-white/30 rounded px-4 py-2 text-sm outline-none focus:border-[#c5a87c] transition-colors"
                            />
                        </div>
                    </div>
                </div>

                {/* Grid assimétrico (Usar itensFiltrados agora) */}
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3 md:gap-4">
                    {itensFiltrados.length === 0 ? (
                        <p className="col-span-full text-white/50 text-sm py-10">Nenhum resultado encontrado.</p>
                    ) : (
                        itensFiltrados.map((item, i) => (
                            <div
                                key={item.id}
                                className={`group relative overflow-hidden bg-[#1a0f0a] ${i === 0 ? 'row-span-2 col-span-1' : ''}`}
                                style={{ aspectRatio: i === 0 ? 'auto' : '1/1' }}
                            >
                                {/* Imagens e overlay mantidos */}
                            </div>
                        ))
                    )}
                </div>
            </div>
        </section>
    )
})

export default PortfolioGaleria