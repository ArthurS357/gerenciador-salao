import Link from 'next/link';
import styles from './landing.module.css';

export default function Navbar({ sessao }: { sessao: { logado: boolean } }) {
    return (
        <nav className={styles.nav}>
            <a href="#" className={styles.navLogo}>
                LmLu Matiello
                <small>Studio de Beleza</small>
            </a>
            <div className={styles.navLinks}>
                <a href="#servicos">Serviços</a>
                <a href="#agendamento">Agendar</a>
                <a href="#contato">Contato</a>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                {sessao.logado ? (
                    <Link href="/cliente/dashboard" className={styles.navClienteLink}>O Meu Painel</Link>
                ) : (
                    <Link href="/login" className={styles.navClienteLink}>Entrar</Link>
                )}
                <Link href="/login-profissional" className={styles.navBtn}>Acesso Profissional</Link>
            </div>
        </nav>
    );
}