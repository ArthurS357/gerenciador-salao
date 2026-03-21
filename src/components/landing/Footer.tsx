import styles from './landing.module.css';

export default function Footer() {
    return (
        <footer id="contato" className={styles.footer}>
            <span className={styles.footerLogo}>LmLu Matiello</span>
            <span className={styles.footerCopy}>© {new Date().getFullYear()} · Studio de Beleza · Todos os direitos reservados</span>
        </footer>
    );
}