import { memo } from 'react'

const Footer = memo(function Footer() {
    return (
        <footer id="contato" className="relative bg-[#1a0f0a] overflow-hidden">

            {/* Atmosfera de fundo */}
            <div aria-hidden="true" className="pointer-events-none absolute inset-0">
                <div className="absolute -top-[60%] left-[10%] w-[45%] h-[140%] rounded-full bg-[radial-gradient(ellipse,rgba(92,64,51,0.2)_0%,transparent_65%)] blur-3xl" />
                <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-[rgba(197,168,124,0.25)] to-transparent" />
                <div
                    className="absolute inset-0 opacity-[0.02]"
                    style={{
                        backgroundImage:
                            'linear-gradient(rgba(197,168,124,1) 1px,transparent 1px),linear-gradient(90deg,rgba(197,168,124,1) 1px,transparent 1px)',
                        backgroundSize: '80px 80px',
                    }}
                />
            </div>

            {/* Corpo principal */}
            <div className="relative z-10 max-w-[1200px] mx-auto px-8 md:px-16 pt-14 pb-10">

                {/* Linha superior */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-10 pb-10 border-b border-[rgba(197,168,124,0.1)]">

                    {/* Logo + tagline */}
                    <div>
                        <span className="block font-serif text-[1.5rem] font-semibold text-white/80 tracking-[0.02em] leading-none">
                            LmLu Mattielo
                        </span>
                        <span className="block font-sans text-[0.6rem] font-normal tracking-[0.28em] uppercase text-[#c5a87c]/55 mt-1.5">
                            Studio de Beleza
                        </span>
                    </div>

                    {/* Links rápidos */}
                    <nav aria-label="Links do rodapé" className="flex gap-8 md:gap-10">
                        {[
                            { label: 'Serviços', href: '#servicos' },
                            { label: 'Agendamento', href: '#agendamento' },
                            { label: 'Localização', href: '#contato' },
                        ].map(({ label, href }) => (
                            <a
                                key={label}
                                href={href}
                                className="text-[0.68rem] font-medium tracking-[0.18em] uppercase text-white/30 transition-colors duration-200 hover:text-[#c5a87c]/80"
                            >
                                {label}
                            </a>
                        ))}
                    </nav>

                    {/* CTA WhatsApp */}
                    <a
                        href="https://wa.me/5511947969025"
                        target="_blank"
                        rel="noopener noreferrer"
                        aria-label="Falar pelo WhatsApp"
                        className="inline-flex items-center gap-2.5 px-5 py-2.5 border border-[rgba(197,168,124,0.2)] rounded-sm text-[0.68rem] font-medium tracking-[0.15em] uppercase text-[#c5a87c]/65 transition-all duration-300 hover:border-[rgba(197,168,124,0.45)] hover:text-[#c5a87c] hover:bg-[rgba(197,168,124,0.05)]"
                    >
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413z" />
                        </svg>
                        WhatsApp
                    </a>
                </div>

                {/* Linha inferior */}
                <div className="flex flex-col md:flex-row justify-between items-center gap-3 pt-7">
                    <span className="text-[0.62rem] text-white/18 font-light tracking-[0.1em]">
                        © {new Date().getFullYear()} LmLu Mattielo · Todos os direitos reservados
                    </span>
                    <div className="flex items-center gap-2">
                        <div className="w-1 h-1 rounded-full bg-[#c5a87c]/25" />
                        <span className="text-[0.62rem] text-white/18 font-light tracking-[0.1em]">
                            Studio de Beleza · São Paulo
                        </span>
                    </div>
                </div>
            </div>
        </footer>
    )
})

export default Footer