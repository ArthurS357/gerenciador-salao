import styles from './landing.module.css';

export default function Localizacao() {
    return (
        <section className={styles.secaoLocalizacao}>
            <div className={styles.localizacaoInner}>
                <div>
                    <h2 className={styles.localizacaoTitulo}>Visite o Nosso Espaço</h2>
                    <p className={styles.localizacaoDesc}>
                        O salão LmLu Mattielo está localizado no coração da cidade, projetado para oferecer a você uma experiência de puro conforto e sofisticação desde o momento em que passa pela nossa porta.
                    </p>

                    <div className={styles.contatosGrid}>
                        <div className={styles.contatoItem}>
                            <span className={styles.contatoIcone}>📍</span>
                            <div>
                                <h4 className={styles.contatoNome}>Endereço Premium</h4>
                                <p className={styles.contatoTexto}>Av. da Beleza e Estética, 1000 - Piso Superior<br />Bairro Nobre, São Paulo - SP</p>
                            </div>
                        </div>

                        <div className={styles.contatoItem}>
                            <span className={styles.contatoIcone}>📞</span>
                            <div>
                                <h4 className={styles.contatoNome}>Central de Atendimento</h4>
                                {/* Link Direto para o WhatsApp */}
                                <a
                                    href="https://wa.me/5511947969025"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className={styles.contatoLink}
                                >
                                    (11) 94796-9025 <span className={styles.badgeWhatsapp}>WhatsApp</span>
                                </a>
                                <p className={styles.contatoTexto} style={{ marginTop: '0.25rem' }}>
                                    (11) 4652-1295 <span className={styles.badgeFixo}>Fixo</span>
                                </p>
                            </div>
                        </div>

                        <div className={styles.contatoItem}>
                            <span className={styles.contatoIcone}>🕒</span>
                            <div>
                                <h4 className={styles.contatoNome}>Horário de Funcionamento</h4>
                                <p className={styles.contatoTexto}>Terça a Sábado: 09:00 às 20:00</p>
                                <p className={styles.contatoAviso}>Fechado aos Domingos e Segundas-feiras</p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Mapa Interativo */}
                <div className={styles.mapaContainer}>
                    <iframe
                        src="https://maps.google.com/maps?q=Avenida%20Paulista,%201000&t=&z=15&ie=UTF8&iwloc=&output=embed"
                        width="100%"
                        height="100%"
                        style={{ border: 0 }}
                        allowFullScreen={true}
                        loading="lazy"
                        referrerPolicy="no-referrer-when-downgrade"
                        title="Mapa de Localização LmLu Mattielo"
                    ></iframe>
                </div>
            </div>
        </section>
    );
}