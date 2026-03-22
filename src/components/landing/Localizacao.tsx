import { memo } from 'react'

const IconePin = () => (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" /><circle cx="12" cy="10" r="3" />
    </svg>
)
const IconeTelefone = () => (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 12 19.79 19.79 0 0 1 1.61 3.27 2 2 0 0 1 3.6 1h3a2 2 0 0 1 2 1.72c.13.96.36 1.9.7 2.81a2 2 0 0 1-.45 2.11L7.91 8.6a16 16 0 0 0 6 6l.96-.96a2 2 0 0 1 2.11-.45c.9.34 1.85.57 2.81.7A2 2 0 0 1 22 16.92z" />
    </svg>
)
const IconeRelogio = () => (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" />
    </svg>
)
const IconeWhatsApp = () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413z" />
    </svg>
)

const WA_NUMERO = '5511947969025'
const WA_URL = `https://wa.me/${WA_NUMERO}?text=${encodeURIComponent('Olá! Vim pelo site e gostaria de agendar um horário no LmLu Matiello. Poderia me ajudar? 😊')}`

const ContatoItem = memo(function ContatoItem({ icone, titulo, children }: { icone: React.ReactNode; titulo: string; children: React.ReactNode }) {
    return (
        <div className="flex items-start gap-4">
            <div className="flex items-center justify-center w-11 h-11 min-w-[44px] rounded-full bg-creme-escuro text-marrom-medio flex-shrink-0">{icone}</div>
            <div>
                <h4 className="font-semibold text-marrom-profundo mb-1 text-[1.05rem]">{titulo}</h4>
                {children}
            </div>
        </div>
    )
})

const Localizacao = memo(function Localizacao() {
    return (
        <section className="py-16 md:py-28 px-6 md:px-16 bg-white border-t border-creme-escuro">
            <div className="max-w-[1100px] mx-auto grid grid-cols-1 md:grid-cols-2 gap-12 md:gap-16 items-center">

                <div>
                    <p className="text-[0.68rem] font-medium tracking-[0.25em] uppercase text-caramelo mb-3">Como nos encontrar</p>
                    <h2 className="font-serif text-[clamp(2rem,3vw,2.75rem)] font-semibold text-marrom-profundo mb-6 leading-[1.15]">Visite o Nosso Espaço</h2>
                    <p className="text-[0.95rem] text-texto-suave leading-[1.8] mb-10">
                        O salão LmLu Matiello está localizado no coração da cidade, projetado para oferecer a você uma experiência de puro conforto e sofisticação desde o momento em que passa pela nossa porta.
                    </p>

                    <div className="flex flex-col gap-6">
                        <ContatoItem icone={<IconePin />} titulo="Endereço">
                            <p className="text-texto-suave text-[0.9rem] leading-[1.5]">Av. da Beleza e Estética, 1000 — Piso Superior<br />Bairro Nobre, São Paulo — SP</p>
                        </ContatoItem>

                        <ContatoItem icone={<IconeTelefone />} titulo="Contato">
                            <a href={`https://wa.me/${WA_NUMERO}`} target="_blank" rel="noopener noreferrer" className="text-texto-suave text-[0.9rem] no-underline inline-flex items-center transition-colors hover:text-marrom-claro" aria-label="Falar via WhatsApp: (11) 94796-9025">
                                (11) 94796-9025
                                <span className="ml-2 text-[0.65rem] font-bold text-[#166534] bg-[#dcfce7] py-0.5 px-[0.4rem] rounded-sm uppercase tracking-[0.05em]">WhatsApp</span>
                            </a>
                            <p className="mt-1 text-texto-suave text-[0.9rem] leading-[1.5]">
                                (11) 4652-1295
                                <span className="ml-2 text-[0.65rem] font-bold text-[#4b5563] bg-[#f3f4f6] py-0.5 px-[0.4rem] rounded-sm uppercase tracking-[0.05em]">Fixo</span>
                            </p>
                        </ContatoItem>

                        <ContatoItem icone={<IconeRelogio />} titulo="Funcionamento">
                            <p className="text-texto-suave text-[0.9rem] leading-[1.5]">Terça a Sábado: 09:00 às 20:00</p>
                            <p className="mt-1 text-[0.8rem] text-red-600 font-medium">Fechado Domingos e Segundas-feiras</p>
                        </ContatoItem>
                    </div>

                    <a href={WA_URL} target="_blank" rel="noopener noreferrer" aria-label="Agendar pelo WhatsApp — abre o WhatsApp com mensagem pronta" className="inline-flex items-center gap-[0.65rem] mt-8 py-[0.9rem] px-8 bg-[#16a34a] text-white rounded font-sans text-[0.85rem] font-semibold tracking-[0.04em] no-underline touch-manipulation transition-[background,transform] duration-200 hover:bg-[#15803d] active:scale-[0.98]">
                        <IconeWhatsApp />
                        Agendar pelo WhatsApp
                    </a>
                </div>

                <div className="w-full h-[400px] bg-[#f3f4f6] rounded-xl overflow-hidden shadow-[0_10px_25px_rgba(0,0,0,0.05)] border-4 border-white">
                    <iframe
                        src="https://maps.google.com/maps?q=Avenida%20Paulista,%201000&t=&z=15&ie=UTF8&iwloc=&output=embed"
                        width="100%" height="100%" style={{ border: 0 }}
                        allowFullScreen loading="lazy" referrerPolicy="no-referrer-when-downgrade"
                        title="Mapa de Localização LmLu Mattielo"
                    />
                </div>

            </div>
        </section>
    )
})

export default Localizacao