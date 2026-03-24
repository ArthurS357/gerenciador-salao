import { memo } from 'react'

const WA_NUMERO = '5511947969025'
const WA_URL = `https://wa.me/${WA_NUMERO}?text=${encodeURIComponent('Olá! Vim pelo site e gostaria de agendar um horário no LmLu Matiello. Poderia me ajudar? 😊')}`

const InfoItem = memo(function InfoItem({
    icone, titulo, children,
}: {
    icone: React.ReactNode
    titulo: string
    children: React.ReactNode
}) {
    return (
        <div className="flex items-start gap-5">
            <div className="flex items-center justify-center w-10 h-10 flex-shrink-0 border border-[rgba(197,168,124,0.25)] bg-[rgba(197,168,124,0.05)] text-[#8B5A2B]">
                {icone}
            </div>
            <div>
                <h4 className="font-sans text-[0.65rem] font-semibold tracking-[0.2em] uppercase text-[#5C4033] mb-1.5">{titulo}</h4>
                {children}
            </div>
        </div>
    )
})

const Localizacao = memo(function Localizacao() {
    return (
        <section className="relative bg-[#fdfaf6] py-24 md:py-32 overflow-hidden">
            {/* Transição do escuro */}
            <div aria-hidden="true" className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-[rgba(197,168,124,0.2)] to-transparent" />

            {/* Ornamento decorativo */}
            <div aria-hidden="true" className="pointer-events-none absolute top-0 right-0 w-[35%] h-[40%] opacity-30"
                style={{ background: 'radial-gradient(ellipse at 100% 0%, rgba(197,168,124,0.15) 0%, transparent 70%)' }}
            />

            <div className="relative z-10 max-w-[1100px] mx-auto px-6 md:px-16">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-16 md:gap-24 items-start">

                    {/* Coluna de texto */}
                    <div>
                        <div className="flex items-center gap-3 mb-6">
                            <div className="h-px w-8 bg-gradient-to-r from-transparent to-[#c5a87c]" />
                            <span className="font-sans text-[0.62rem] font-medium tracking-[0.3em] uppercase text-[#c5a87c]">
                                Como nos encontrar
                            </span>
                        </div>

                        <h2 className="font-serif text-[2.2rem] md:text-[3rem] font-light text-[#2a1810] mb-3 leading-[1.1] tracking-[-0.01em]">
                            Visite o
                            <em className="block italic text-[#8B5A2B] not-italic font-semibold">Nosso Espaço</em>
                        </h2>

                        <p className="text-[0.88rem] text-[#9c8070] leading-[1.85] mb-10 font-light max-w-[420px]">
                            O LmLu Matiello está no coração da cidade, projetado para oferecer uma experiência de puro conforto e sofisticação desde o momento em que você entra.
                        </p>

                        <div className="flex flex-col gap-7 mb-10">
                            <InfoItem
                                icone={
                                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                                        <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" /><circle cx="12" cy="10" r="3" />
                                    </svg>
                                }
                                titulo="Endereço"
                            >
                                <p className="text-[0.88rem] text-[#6b4c3b] leading-[1.6]">
                                    Estrada Santa Isabel, 1647 — Sala 15
                                    <br />
                                    Boulevard Villa Florida · Caputera, Arujá
                                    <br />
                                    <span className="text-[#9c8070] text-[0.8rem]">CEP 07435-180</span>
                                </p>
                            </InfoItem>

                            <InfoItem
                                icone={
                                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                                        <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 12 19.79 19.79 0 0 1 1.61 3.27 2 2 0 0 1 3.6 1h3a2 2 0 0 1 2 1.72c.13.96.36 1.9.7 2.81a2 2 0 0 1-.45 2.11L7.91 8.6a16 16 0 0 0 6 6l.96-.96a2 2 0 0 1 2.11-.45c.9.34 1.85.57 2.81.7A2 2 0 0 1 22 16.92z" />
                                    </svg>
                                }
                                titulo="Contato"
                            >
                                <div className="flex flex-col gap-1.5">
                                    <a
                                        href={`https://wa.me/${WA_NUMERO}`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="inline-flex items-center gap-2 text-[0.88rem] text-[#6b4c3b] hover:text-[#8B5A2B] transition-colors"
                                        aria-label="WhatsApp"
                                    >
                                        (11) 94796-9025
                                        <span className="text-[0.58rem] font-semibold text-[#166534] bg-[#dcfce7] py-0.5 px-1.5 tracking-[0.06em] uppercase">WhatsApp</span>
                                    </a>
                                    <p className="text-[0.88rem] text-[#9c8070]">(11) 4652-1295 · Fixo</p>
                                </div>
                            </InfoItem>

                            <InfoItem
                                icone={
                                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                                        <circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" />
                                    </svg>
                                }
                                titulo="Funcionamento"
                            >
                                <p className="text-[0.88rem] text-[#6b4c3b] leading-[1.6]">
                                    Terça a Sábado: 09:00 às 19:00
                                </p>
                                <p className="text-[0.78rem] text-red-500/70 font-medium mt-0.5">
                                    Fechado Domingos e Segundas
                                </p>
                            </InfoItem>
                        </div>

                        {/* CTA WhatsApp */}
                        <a
                            href={WA_URL}
                            target="_blank"
                            rel="noopener noreferrer"
                            aria-label="Agendar pelo WhatsApp"
                            className="group inline-flex items-center gap-3 py-3.5 px-7 bg-[#2a1810] text-[#e8d5b0] font-sans text-[0.72rem] font-semibold tracking-[0.16em] uppercase transition-all duration-300 hover:bg-[#3e2518] active:scale-[0.98]"
                            style={{ clipPath: 'polygon(8px 0,100% 0,100% calc(100% - 8px),calc(100% - 8px) 100%,0 100%,0 8px)' }}
                        >
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" className="text-[#c5a87c]">
                                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413z" />
                            </svg>
                            Agendar pelo WhatsApp
                        </a>
                    </div>

                    {/* Mapa */}
                    <div className="flex flex-col gap-4">
                        <div
                            className="w-full h-[420px] bg-[#e8e0d6] overflow-hidden border border-[rgba(197,168,124,0.2)] shadow-[0_8px_40px_rgba(42,24,16,0.08)]"
                            style={{ clipPath: 'polygon(16px 0,100% 0,100% calc(100% - 16px),calc(100% - 16px) 100%,0 100%,0 16px)' }}
                        >
                            <iframe
                                src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d915.3246905101598!2d-46.32287802417501!3d-23.413572464601405!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x94ce7d9daab0dc0b%3A0xf95126263b5144cf!2sLM%20LU%20MATIELLO!5e0!3m2!1spt-BR!2sbr!4v1774354079521!5m2!1spt-BR!2sbr"
                                width="100%"
                                height="100%"
                                style={{ border: 0, filter: 'sepia(20%) contrast(0.95) brightness(1.02)' }}
                                allowFullScreen
                                loading="lazy"
                                referrerPolicy="no-referrer-when-downgrade"
                                title="Localização LmLu Matiello — Arujá SP"
                            />
                        </div>

                        {/* Endereço compacto abaixo do mapa */}
                        <div className="flex items-center gap-3 px-4 py-3 border border-[rgba(197,168,124,0.15)] bg-[rgba(197,168,124,0.03)]">
                            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="rgba(197,168,124,0.7)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                                <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" /><circle cx="12" cy="10" r="3" />
                            </svg>
                            <span className="text-[0.7rem] text-[#9c8070] font-light tracking-[0.04em]">
                                Estrada Santa Isabel, 1647 — Sala 15 · Boulevard Villa Florida · Caputera, Arujá — CEP 07435-180
                            </span>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    )
})

export default Localizacao