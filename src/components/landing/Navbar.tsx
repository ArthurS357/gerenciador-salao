import Link from "next/link";

export default function Navbar({ sessao }: { sessao: { logado: boolean } }) {
    return (
        <nav className="fixed top-0 left-0 right-0 z-[100] flex items-center justify-between py-5 px-6 md:px-16 bg-creme/92 backdrop-blur-md border-b border-caramelo/20">
            <Link
                href="#"
                className="font-serif text-2xl font-semibold text-marrom-profundo tracking-[0.02em] no-underline"
            >
                LmLu Mattielo
                <small className="block font-sans text-[0.6rem] font-normal tracking-[0.25em] uppercase text-caramelo mt-[1px]">
                    Studio de Beleza
                </small>
            </Link>
            <div className="hidden md:flex gap-10 items-center">
                <a
                    href="#servicos"
                    className="text-[0.72rem] font-medium tracking-[0.15em] uppercase text-texto-suave transition-colors hover:text-marrom-medio"
                >
                    Serviços
                </a>
                <a
                    href="#agendamento"
                    className="text-[0.72rem] font-medium tracking-[0.15em] uppercase text-texto-suave transition-colors hover:text-marrom-medio"
                >
                    Agendar
                </a>
                <a
                    href="#contato"
                    className="text-[0.72rem] font-medium tracking-[0.15em] uppercase text-texto-suave transition-colors hover:text-marrom-medio"
                >
                    Contato
                </a>
            </div>
            <div className="flex items-center gap-4">
                {sessao.logado ? (
                    <Link
                        href="/cliente/dashboard"
                        className="text-[0.72rem] font-medium tracking-[0.1em] text-marrom-claro transition-colors mr-2 hover:text-marrom-profundo"
                    >
                        O Meu Painel
                    </Link>
                ) : (
                    <Link
                        href="/login"
                        className="text-[0.72rem] font-medium tracking-[0.1em] text-marrom-claro transition-colors mr-2 hover:text-marrom-profundo"
                    >
                        Entrar
                    </Link>
                )}
                <Link
                    href="/login-profissional"
                    className="px-6 py-2.5 bg-transparent border-[1.5px] border-marrom-medio rounded-sm font-sans text-[0.72rem] font-medium tracking-[0.15em] uppercase text-marrom-medio transition-all hover:bg-marrom-medio hover:text-white"
                >
                    Acesso Profissional
                </Link>
            </div>
        </nav>
    );
}
