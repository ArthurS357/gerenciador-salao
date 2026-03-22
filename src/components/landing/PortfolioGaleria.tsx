import { memo } from 'react'
import type { PortfolioGaleriaProps } from './types'

const PortfolioGaleria = memo(function PortfolioGaleria({ itensPortfolio }: PortfolioGaleriaProps) {
    if (!itensPortfolio.length) return null

    return (
        <section className="relative bg-[#0e0905] py-24 md:py-32 overflow-hidden">
            {/* Atmosfera */}
            <div aria-hidden="true" className="pointer-events-none absolute inset-0">
                <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-[rgba(197,168,124,0.15)] to-transparent" />
                <div className="absolute -top-[20%] left-[30%] w-[40%] h-[50%] rounded-full bg-[radial-gradient(ellipse,rgba(92,64,51,0.2)_0%,transparent_65%)] blur-3xl" />
            </div>

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

                    <a
                        href="https://instagram.com"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="group inline-flex items-center gap-2.5 text-[0.65rem] font-medium tracking-[0.18em] uppercase text-white/35 transition-colors duration-300 hover:text-[#c5a87c]/80"
                    >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                            <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
                        </svg>
                        Ver Instagram
                        <svg className="w-3 h-3 transition-transform duration-300 group-hover:translate-x-0.5" viewBox="0 0 12 12" fill="none">
                            <path d="M1 6h10M7 2l4 4-4 4" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                    </a>
                </div>

                {/* Grid assimétrico */}
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3 md:gap-4">
                    {itensPortfolio.map((item, i) => (
                        <div
                            key={item.id}
                            className={`group relative overflow-hidden bg-[#1a0f0a] ${i === 0 ? 'row-span-2 col-span-1' : ''}`}
                            style={{ aspectRatio: i === 0 ? 'auto' : '1/1' }}
                        >
                            <img
                                src={item.imagemUrl}
                                alt={item.titulo}
                                className="w-full h-full object-cover transition-transform duration-700 ease-out group-hover:scale-105"
                                loading="lazy"
                            />
                            {/* Overlay */}
                            <div className="absolute inset-0 bg-gradient-to-t from-[#0e0905]/90 via-[#0e0905]/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

                            {/* Info */}
                            <div className="absolute bottom-0 left-0 right-0 p-5 translate-y-2 opacity-0 group-hover:translate-y-0 group-hover:opacity-100 transition-all duration-400 ease-out">
                                <h3 className="font-serif text-[1rem] font-semibold text-white/95 leading-snug mb-1">
                                    {item.titulo}
                                </h3>
                                <div className="flex items-center justify-between">
                                    {item.valor != null && (
                                        <span className="font-serif text-[0.95rem] font-light text-[#c5a87c]">
                                            R$ {item.valor.toFixed(2)}
                                        </span>
                                    )}
                                    {item.linkSocial && (
                                        <a
                                            href={item.linkSocial}
                                            target="_blank"
                                            rel="noreferrer"
                                            className="text-[0.6rem] font-medium tracking-[0.18em] uppercase text-[#c5a87c]/70 hover:text-[#c5a87c] transition-colors"
                                            onClick={(e) => e.stopPropagation()}
                                        >
                                            Ver post →
                                        </a>
                                    )}
                                </div>
                            </div>

                            {/* Borda caramelo no hover */}
                            <div className="absolute inset-0 border border-transparent group-hover:border-[rgba(197,168,124,0.2)] transition-all duration-500 pointer-events-none" />
                        </div>
                    ))}
                </div>
            </div>
        </section>
    )
})

export default PortfolioGaleria