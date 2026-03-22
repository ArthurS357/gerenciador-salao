import { memo } from 'react'
import type { PortfolioGaleriaProps } from './types'

const PortfolioGaleria = memo(function PortfolioGaleria({ itensPortfolio }: PortfolioGaleriaProps) {
    if (!itensPortfolio.length) return null

    return (
        <section className="py-8 pb-28 px-6 md:px-16 max-w-[1200px] mx-auto">
            <div className="flex items-end justify-between mb-14 gap-6 flex-wrap">
                <div>
                    <p className="text-[0.68rem] font-medium tracking-[0.25em] uppercase text-caramelo mb-3">Nosso Portfólio</p>
                    <h2 className="font-serif text-[clamp(2rem,3vw,2.75rem)] font-normal text-marrom-profundo leading-[1.15]">
                        Resultados que <em className="italic text-marrom-claro">Inspiram</em>
                    </h2>
                </div>
            </div>

            <div className="grid [grid-template-columns:repeat(auto-fill,minmax(300px,1fr))] gap-6">
                {itensPortfolio.map((item) => (
                    <div key={item.id} className="group relative rounded-lg overflow-hidden aspect-square bg-gray-200">
                        <img src={item.imagemUrl} alt={item.titulo} className="w-full h-full object-cover" loading="lazy" />

                        {/* Overlay via CSS group-hover — zero handlers JS */}
                        <div className="absolute inset-0 flex flex-col items-center justify-center bg-[rgba(42,24,16,0.7)] p-6 text-center text-white opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                            <h3 className="font-serif text-2xl font-semibold mb-2">{item.titulo}</h3>
                            {item.valor != null && (
                                <p className="text-caramelo font-bold mb-4">R$ {item.valor.toFixed(2)}</p>
                            )}
                            {item.linkSocial && (
                                <a href={item.linkSocial} target="_blank" rel="noreferrer" className="py-2 px-4 border border-caramelo text-caramelo rounded text-[0.8rem] uppercase tracking-[0.1em] transition-colors hover:bg-caramelo hover:text-marrom-profundo">
                                    Ver no Instagram
                                </a>
                            )}
                        </div>
                    </div>
                ))}
            </div>
        </section>
    )
})

export default PortfolioGaleria