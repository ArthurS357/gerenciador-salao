import styles from './landing.module.css';

export default function Sobre() {
    return (
        <section id="sobre" className={styles.secaoSobre}>
            <div className={styles.sobreInner}>
                <div className={styles.sobreImagem}>
                    {/* Imagem de placeholder elegante (pode ser trocada pela foto real do salão depois) */}
                    <img
                        src="https://images.unsplash.com/photo-1560066984-138dadb4c035?q=80&w=1074&auto=format&fit=crop"
                        alt="Interior do Salão LmLu Matiello"
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    />
                </div>
                <div className={styles.sobreTexto}>
                    <p className={styles.secaoTag}>Nossa Essência</p>
                    <h2>A arte de revelar a <em>sua melhor versão</em></h2>
                    <p>
                        Fundado com a missão de transformar o cuidado pessoal em uma experiência de puro luxo e bem-estar, o LmLu Mattielo é mais que um salão de beleza. É um refúgio desenhado exclusivamente para você.
                    </p>
                    <p>
                        Nossa equipe de especialistas combina técnicas avançadas, produtos de excelência internacional e um atendimento meticulosamente personalizado para garantir resultados impecáveis que respeitam e realçam a sua identidade única.
                    </p>
                </div>
            </div>
        </section>
    );
}