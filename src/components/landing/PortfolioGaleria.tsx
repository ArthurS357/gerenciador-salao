'use client'

import { memo, useState } from 'react'
import type { PortfolioGaleriaProps } from './types'

/** Extrai a primeira imagem do campo JSON */
function primeiraImagem(imagensJson: string): string {
    try {
        const arr = JSON.parse(imagensJson) as unknown
        if (Array.isArray(arr) && arr.length > 0 && typeof arr[0] === 'string') {
            return arr[0]
        }
    } catch {
        // Se não for JSON válido, trata como URL directa
    }
    return imagensJson
}

const PortfolioGaleria = memo(function PortfolioGaleria({ itensPortfolio }: PortfolioGaleriaProps) {
    const [busca, setBusca] = useState('')

    const itensFiltrados = itensPortfolio.filter(item =>
        item.titulo.toLowerCase().includes(busca.toLowerCase())
    )

    if (!itensPortfolio.length) return null

    return (
        <section className="relative bg-[#0e0905] py-24 md:py-32 overflow-hidden">
            <div className="relative z-10 max-w-[1200px] mx-auto px-6 md:px-16">

                {/* Cabeçalho */}
                <div className="flex flex-col md:flex-row md:items-end justify-between gap-8 mb-14">
                    <div>
                        <div className="flex items-center gap-3 mb-5">
                            <div className="h-px w-8 bg-gradient-to-r from-transparent to-caramelo/60" />
                            <span className="font-sans text-[0.62rem] font-medium tracking-[0.3em] uppercase text-caramelo/60">
                                Nosso Portfólio
                            </span>
                        </div>
                        <h2 className="font-serif text-[2.2rem] md:text-[3rem] font-light text-white/85 leading-[1.1] tracking-[-0.01em]">
                            Resultados que
                            <em className="block italic text-caramelo not-italic font-semibold">Inspiram</em>
                        </h2>
                    </div>

                    <div className="flex flex-col items-end gap-4">
                        <a
                            href="https://instagram.com"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="group inline-flex items-center gap-2.5 text-[0.65rem] font-medium tracking-[0.18em] uppercase text-white/35 transition-colors duration-300 hover:text-caramelo/80"
                        >
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                                <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z" />
                            </svg>
                            Ver Instagram
                        </a>

                        <div className="relative w-full md:w-64">
                            <input
                                type="text"
                                placeholder="Procurar serviço..."
                                value={busca}
                                onChange={(e) => setBusca(e.target.value)}
                                className="w-full bg-[#1a0f0a] border border-[rgba(197,168,124,0.3)] text-white/80 placeholder-white/30 rounded px-4 py-2 text-sm outline-none focus:border-caramelo transition-colors"
                            />
                        </div>
                    </div>
                </div>

                {/* Grid assimétrico */}
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3 md:gap-4">
                    {itensFiltrados.length === 0 ? (
                        <p className="col-span-full text-white/50 text-sm py-10">Nenhum resultado encontrado.</p>
                    ) : (
                        itensFiltrados.map((item, i) => {
                            const imgUrl = primeiraImagem(item.imagensJson)
                            const destaque = i === 0

                            return (
                                <div
                                    key={item.id}
                                    className={`group relative overflow-hidden bg-[#1a0f0a] ${destaque ? 'row-span-2 col-span-1' : ''}`}
                                    style={{ aspectRatio: destaque ? 'auto' : '1/1' }}
                                >
                                    {imgUrl && (
                                        // eslint-disable-next-line @next/next/no-img-element
                                        <img
                                            src={imgUrl}
                                            alt={item.titulo}
                                            className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                                        />
                                    )}

                                    {/* Overlay com título e link Instagram */}
                                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col justify-end p-4">
                                        <p className="text-white font-bold text-sm leading-tight">{item.titulo}</p>
                                        {item.valor && (
                                            <p className="text-caramelo text-xs font-bold mt-1">
                                                R$ {item.valor.toFixed(2).replace('.', ',')}
                                            </p>
                                        )}
                                        {item.linkInstagram && (
                                            <a
                                                href={item.linkInstagram}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="mt-2 text-[10px] text-white/70 hover:text-caramelo transition-colors"
                                                onClick={(e) => e.stopPropagation()}
                                            >
                                                Ver no Instagram →
                                            </a>
                                        )}
                                    </div>
                                </div>
                            )
                        })
                    )}
                </div>
            </div>
        </section>
    )
})

export default PortfolioGaleria