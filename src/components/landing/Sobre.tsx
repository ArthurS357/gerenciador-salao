import { memo } from 'react'

const Sobre = memo(function Sobre() {
    return (
        <section
            id="sobre"
            className="relative py-24 md:py-36 px-6 md:px-16 bg-[#120a05] overflow-hidden"
        >
            {/* Atmosfera */}
            <div aria-hidden="true" className="pointer-events-none absolute inset-0">
                <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-[rgba(197,168,124,0.15)] to-transparent" />
                <div className="absolute -bottom-[10%] right-[5%] w-[45%] h-[60%] rounded-full bg-[radial-gradient(ellipse,rgba(139,90,43,0.12)_0%,transparent_65%)] blur-3xl" />
                <div className="absolute top-[20%] -left-[5%] w-[35%] h-[50%] rounded-full bg-[radial-gradient(ellipse,rgba(92,64,51,0.15)_0%,transparent_65%)] blur-3xl" />
                <div
                    className="absolute inset-0 opacity-[0.015]"
                    style={{
                        backgroundImage: 'linear-gradient(rgba(197,168,124,1) 1px,transparent 1px),linear-gradient(90deg,rgba(197,168,124,1) 1px,transparent 1px)',
                        backgroundSize: '96px 96px',
                    }}
                />
            </div>

            <div className="relative z-10 max-w-[1100px] mx-auto grid grid-cols-1 md:grid-cols-2 gap-16 md:gap-24 items-center">

                {/* Imagem com frame */}
                <div className="relative w-full aspect-[4/5] group">
                    {/* Frame decorativo */}
                    <div
                        className="absolute inset-[-10px] border border-[rgba(197,168,124,0.12)]"
                        style={{ clipPath: 'polygon(12px 0,100% 0,100% calc(100% - 12px),calc(100% - 12px) 100%,0 100%,0 12px)' }}
                    />
                    <div
                        className="absolute inset-[-20px] border border-[rgba(197,168,124,0.05)]"
                        style={{ clipPath: 'polygon(18px 0,100% 0,100% calc(100% - 18px),calc(100% - 18px) 100%,0 100%,0 18px)' }}
                    />

                    {/* Imagem */}
                    <div className="relative w-full h-full overflow-hidden" style={{ clipPath: 'polygon(12px 0,100% 0,100% calc(100% - 12px),calc(100% - 12px) 100%,0 100%,0 12px)' }}>
                        <img
                            src="https://images.unsplash.com/photo-1560066984-138dadb4c035?q=80&w=1074&auto=format&fit=crop"
                            alt="Interior do Salão LmLu Mattielo"
                            className="w-full h-full object-cover transition-transform duration-700 ease-out group-hover:scale-105"
                            loading="lazy"
                        />
                        {/* Overlay de cor que unifica com o tema */}
                        <div className="absolute inset-0 bg-gradient-to-t from-[#120a05]/60 via-transparent to-transparent" />
                    </div>

                    {/* Badge flutuante */}
                    <div className="absolute bottom-6 left-6 flex items-center gap-3 px-4 py-2.5 bg-[#120a05]/80 backdrop-blur-sm border border-[rgba(197,168,124,0.18)]" style={{ clipPath: 'polygon(6px 0,100% 0,100% calc(100% - 6px),calc(100% - 6px) 100%,0 100%,0 6px)' }}>
                        <div className="w-1.5 h-1.5 rounded-full bg-[#c5a87c]/70" />
                        <span className="font-sans text-[0.58rem] font-medium tracking-[0.25em] uppercase text-[#c5a87c]/70">
                            Desde 2016 · São Paulo
                        </span>
                    </div>
                </div>

                {/* Texto */}
                <div className="flex flex-col">
                    <div className="flex items-center gap-3 mb-8">
                        <div className="h-px w-8 bg-gradient-to-r from-transparent to-[#c5a87c]/60" />
                        <span className="font-sans text-[0.62rem] font-medium tracking-[0.3em] uppercase text-[#c5a87c]/60">
                            Nossa Essência
                        </span>
                    </div>

                    <h2 className="font-serif text-[2.2rem] md:text-[3rem] font-light text-white/90 mb-2 leading-[1.1] tracking-[-0.01em]">
                        A arte de revelar
                    </h2>
                    <h2 className="font-serif text-[2.2rem] md:text-[3rem] font-semibold italic text-[#c5a87c] mb-8 leading-[1.1] tracking-[-0.01em]">
                        a sua melhor versão
                    </h2>

                    <div className="w-8 h-px mb-8 bg-gradient-to-r from-[#c5a87c]/40 to-transparent" />

                    <p className="text-[0.92rem] leading-[1.9] mb-5 text-white/40 font-light">
                        Fundado com a missão de transformar o cuidado pessoal em uma experiência de puro luxo e bem-estar, o LmLu Mattielo é mais que um salão de beleza.
                    </p>
                    <p className="text-[0.92rem] leading-[1.9] text-white/35 font-light">
                        Nossa equipe combina técnicas avançadas, produtos de excelência internacional e atendimento personalizado para resultados que respeitam e realçam a sua identidade única.
                    </p>

                    {/* Métricas internas */}
                    <div className="flex gap-10 mt-12 pt-10 border-t border-[rgba(197,168,124,0.08)]">
                        {[
                            { num: '8+', label: 'Anos de experiência' },
                            { num: '2k+', label: 'Clientes atendidos' },
                            { num: '100%', label: 'Satisfação' },
                        ].map(({ num, label }) => (
                            <div key={label}>
                                <span className="block font-serif text-[1.8rem] font-light text-[#c5a87c] leading-none">{num}</span>
                                <span className="block font-sans text-[0.58rem] font-normal tracking-[0.15em] uppercase text-white/30 mt-1.5">{label}</span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </section>
    )
})

export default Sobre