import styles from './landing.module.css';

export default function Hero({ mounted }: { mounted: boolean }) {
    return (
        <section className={styles.hero}>
            <div className={`${styles.heroConteudo} ${mounted ? styles.visivel : ''}`}>
                <span className={styles.heroTag}>Salão de Alto Padrão</span>
                <h1 className={styles.heroTitulo}>Onde a <em>beleza</em><br />encontra a<br />excelência</h1>
                <p className={styles.heroDesc}>Experiência premium em cuidados capilares e estéticos. Tecnologia e sofisticação em cada detalhe do seu atendimento.</p>
                <div className={styles.heroAcoes}>
                    <a href="#servicos" className={styles.btnPrimario}>Ver Serviços</a>
                    <a href="#agendamento" className={styles.btnSecundario}>Agendar Agora</a>
                </div>
            </div>

            {/* ÁREA VISUAL ATUALIZADA */}
            <div className={styles.heroVisual}>
                <div className={styles.heroVisualGrade} />

                {/* CONTAINER DA IMAGEM 3D */}
                <div className={styles.hero3dContainer}>
                    <img
                        src="/images/logo-hero-render.png"
                        alt="LmLu Mattielo Emblem"
                        className={styles.hero3dImage}
                    />
                </div>

                <div className={styles.heroNumero}>
                    <div className={styles.stat}><span className={styles.statNum}>8+</span><span className={styles.statLabel}>Anos de experiência</span></div>
                    <div className={styles.stat}><span className={styles.statNum}>2k</span><span className={styles.statLabel}>Clientes atendidas</span></div>
                    <div className={styles.stat}><span className={styles.statNum}>100%</span><span className={styles.statLabel}>Satisfação</span></div>
                </div>
            </div>
        </section>
    );
}