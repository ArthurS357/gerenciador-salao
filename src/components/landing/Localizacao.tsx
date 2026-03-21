import styles from './landing.module.css';

// ── SVG Icons (substituem emojis — melhor acessibilidade e consistência visual)
const IconePin = () => (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor"
        strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
        <circle cx="12" cy="10" r="3" />
    </svg>
);

const IconeTelefone = () => (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor"
        strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 12 19.79 19.79 0 0 1 1.61 3.27 2 2 0 0 1 3.6 1h3a2 2 0 0 1 2 1.72c.13.96.36 1.9.7 2.81a2 2 0 0 1-.45 2.11L7.91 8.6a16 16 0 0 0 6 6l.96-.96a2 2 0 0 1 2.11-.45c.9.34 1.85.57 2.81.7A2 2 0 0 1 22 16.92z" />
    </svg>
);

const IconeRelogio = () => (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor"
        strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <circle cx="12" cy="12" r="10" />
        <polyline points="12 6 12 12 16 14" />
    </svg>
);

const IconeWhatsApp = () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413z" />
    </svg>
);

// ── Mensagem pronta para o WhatsApp (URL encoded)
const WHATSAPP_NUMERO = '5511947969025';
const WHATSAPP_MENSAGEM = encodeURIComponent(
    'Olá! Vim pelo site e gostaria de agendar um horário no LmLu Matiello. Poderia me ajudar? 😊'
);
const WHATSAPP_URL = `https://wa.me/${WHATSAPP_NUMERO}?text=${WHATSAPP_MENSAGEM}`;

export default function Localizacao() {
    return (
        <section className={styles.secaoLocalizacao}>
            <div className={styles.localizacaoInner}>

                {/* ── Coluna de Informações ── */}
                <div>
                    <p className={styles.secaoTag} style={{ color: 'var(--caramelo)' }}>
                        Como nos encontrar
                    </p>
                    <h2 className={styles.localizacaoTitulo}>Visite o Nosso Espaço</h2>
                    <p className={styles.localizacaoDesc}>
                        O salão LmLu Matiello está localizado no coração da cidade, projetado para
                        oferecer a você uma experiência de puro conforto e sofisticação desde o
                        momento em que passa pela nossa porta.
                    </p>

                    <div className={styles.contatosGrid}>

                        {/* Endereço */}
                        <div className={styles.contatoItem}>
                            <span className={styles.contatoIconeSvg} aria-hidden="true">
                                <IconePin />
                            </span>
                            <div>
                                <h4 className={styles.contatoNome}>Endereço</h4>
                                <p className={styles.contatoTexto}>
                                    Av. da Beleza e Estética, 1000 — Piso Superior
                                    <br />Bairro Nobre, São Paulo — SP
                                </p>
                            </div>
                        </div>

                        {/* Telefone + WhatsApp inline */}
                        <div className={styles.contatoItem}>
                            <span className={styles.contatoIconeSvg} aria-hidden="true">
                                <IconeTelefone />
                            </span>
                            <div>
                                <h4 className={styles.contatoNome}>Contato</h4>
                                <a
                                    href={`https://wa.me/${WHATSAPP_NUMERO}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className={styles.contatoLink}
                                    aria-label="Ligar para WhatsApp (11) 94796-9025"
                                >
                                    (11) 94796-9025
                                    <span className={styles.badgeWhatsapp}>WhatsApp</span>
                                </a>
                                <p className={styles.contatoTexto} style={{ marginTop: '0.25rem' }}>
                                    (11) 4652-1295
                                    <span className={styles.badgeFixo}>Fixo</span>
                                </p>
                            </div>
                        </div>

                        {/* Horários */}
                        <div className={styles.contatoItem}>
                            <span className={styles.contatoIconeSvg} aria-hidden="true">
                                <IconeRelogio />
                            </span>
                            <div>
                                <h4 className={styles.contatoNome}>Funcionamento</h4>
                                <p className={styles.contatoTexto}>Terça a Sábado: 09:00 às 20:00</p>
                                <p className={styles.contatoAviso}>Fechado Domingos e Segundas-feiras</p>
                            </div>
                        </div>

                    </div>

                    {/* ── CTA WhatsApp — botão principal ── */}
                    <a
                        href={WHATSAPP_URL}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={styles.btnWhatsapp}
                        aria-label="Agendar pelo WhatsApp — abre o WhatsApp com mensagem pronta"
                    >
                        <IconeWhatsApp />
                        Agendar pelo WhatsApp
                    </a>
                </div>

                {/* ── Mapa ── */}
                <div className={styles.mapaContainer}>
                    <iframe
                        src="https://maps.google.com/maps?q=Avenida%20Paulista,%201000&t=&z=15&ie=UTF8&iwloc=&output=embed"
                        width="100%"
                        height="100%"
                        style={{ border: 0 }}
                        allowFullScreen
                        loading="lazy"
                        referrerPolicy="no-referrer-when-downgrade"
                        title="Mapa de Localização LmLu Mattielo"
                    />
                </div>

            </div>
        </section>
    );
}