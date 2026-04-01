'use client'

import { useState, useEffect, useCallback, memo } from 'react'
import Link from 'next/link'
import { cn } from './cn'
import { logoutCliente, logoutFuncionario } from '@/app/actions/auth'

export type SessaoProps = {
    logado: boolean;
    role?: 'CLIENTE' | 'PROFISSIONAL' | 'ADMIN' | 'RECEPCIONISTA'; // ← ADICIONADO AQUI
    nome?: string;
    id?: string;
}

export type NavbarProps = { sessao: SessaoProps; }

const NAV_LINKS = [
    { label: 'Serviços', href: '#servicos' },
    { label: 'Agendar', href: '#agendamento' },
    { label: 'Contato', href: '#contato' },
] as const

const IconeAgenda = () => (<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect x="3" y="4" width="18" height="18" rx="2" ry="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" /></svg>)
// const IconeHistorico = () => (<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M3 3h6l2 3H3z" /><path d="M3 8v13h18V8z" /><path d="M7 13h10M7 17h6" /></svg>)
const IconeUser = () => (<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><circle cx="12" cy="8" r="4" /><path d="M4 20c0-4 3.58-7 8-7s8 3 8 7" /></svg>)
const IconeSair = () => (<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><polyline points="16 17 21 12 16 7" /><line x1="21" y1="12" x2="9" y2="12" /></svg>)
const IconeBriefcase = () => (<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect x="2" y="7" width="20" height="14" rx="2" ry="2" /><path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2" /><line x1="12" y1="12" x2="12" y2="16" /><line x1="10" y1="14" x2="14" y2="14" /></svg>)

const Navbar = memo(function Navbar({ sessao }: NavbarProps) {
    const [scrolled, setScrolled] = useState(false)
    const [isVisible, setIsVisible] = useState(true)
    const [menuOpen, setMenuOpen] = useState(false)
    const [loadingLogout, setLoadingLogout] = useState(false)

    useEffect(() => {
        let lastScrollY = window.scrollY
        const onScroll = () => {
            const currentScrollY = window.scrollY
            setScrolled(currentScrollY > 24)
            if (currentScrollY > lastScrollY && currentScrollY > 50) {
                setIsVisible(false)
            } else {
                setIsVisible(true)
            }
            lastScrollY = currentScrollY
        }
        window.addEventListener('scroll', onScroll, { passive: true })
        return () => window.removeEventListener('scroll', onScroll)
    }, [])

    useEffect(() => {
        document.body.style.overflow = menuOpen ? 'hidden' : ''
        return () => { document.body.style.overflow = '' }
    }, [menuOpen])

    const closeMenu = useCallback(() => setMenuOpen(false), [])

    const handleLogoutCliente = async () => {
        setLoadingLogout(true)
        await logoutCliente()
        closeMenu()
        window.location.href = '/'
    }

    const handleLogoutFuncionario = async () => {
        setLoadingLogout(true)
        await logoutFuncionario()
        closeMenu()
        window.location.href = '/login-profissional'
    }

    const isCliente = sessao.logado && sessao.role === 'CLIENTE'
    const isFuncionario = sessao.logado && (sessao.role === 'PROFISSIONAL' || sessao.role === 'ADMIN' || sessao.role === 'RECEPCIONISTA') // ← ADICIONADO AQUI
    const isAdmin = sessao.logado && sessao.role === 'ADMIN'

    // Extrai o primeiro nome para a saudação
    const primeiroNome = sessao.nome ? sessao.nome.split(' ')[0] : '';

    return (
        <>
            <nav
                className={cn(
                    'fixed top-0 left-0 right-0 z-[100] flex items-center justify-between px-8 md:px-20 lg:px-28 transition-all duration-[800ms] ease-out',
                    scrolled || menuOpen
                        ? 'py-4 bg-[#0a0603]/85 backdrop-blur-xl border-b border-[rgba(197,168,124,0.06)]'
                        : 'py-8 bg-transparent border-b border-transparent',
                    isVisible ? 'translate-y-0' : '-translate-y-full'
                )}
            >
                <Link
                    href="/"
                    onClick={closeMenu}
                    className="group flex items-center gap-4 leading-none no-underline relative z-10"
                    aria-label="LM Lú Mattielo — Página inicial"
                >
                    <div className="flex flex-col">
                        <span className="font-serif text-[1.4rem] md:text-[1.8rem] font-medium text-white/95 tracking-[0.02em] transition-colors duration-500 group-hover:text-caramelo">
                            LM Lú Matiello
                        </span>
                        <span className="font-sans text-[0.55rem] md:text-[0.6rem] font-medium tracking-[0.35em] uppercase text-caramelo/60 mt-[3px] transition-all duration-500 group-hover:text-caramelo/90 group-hover:tracking-[0.4em]">
                            Studio de Beleza
                        </span>
                    </div>
                </Link>

                {/* Direita — contextual por role */}
                <div className="flex items-center gap-5 relative z-10">

                    {/* Cliente Logado: Saudação + Painel */}
                    {isCliente && (
                        <div className="hidden md:flex items-center gap-5">
                            <span className="text-[0.8rem] font-serif italic text-white/60">Olá, {primeiroNome}</span>
                            <Link
                                href="/cliente/dashboard"
                                className="flex items-center gap-2 text-[0.65rem] font-medium tracking-[0.2em] uppercase text-caramelo/70 transition-all duration-500 hover:text-caramelo"
                            >
                                O Meu Painel
                            </Link>
                        </div>
                    )}

                    {/* Funcionário Logado: Saudação + Painel */}
                    {isFuncionario && (
                        <div className="hidden md:flex items-center gap-5">
                            <span className="text-[0.8rem] font-serif italic text-white/60">Olá, {primeiroNome}</span>
                            <Link
                                href="/profissional/agenda"
                                className="flex items-center gap-2 text-[0.65rem] font-medium tracking-[0.2em] uppercase text-caramelo/70 transition-all duration-500 hover:text-caramelo"
                            >
                                Minha Agenda
                            </Link>
                        </div>
                    )}

                    {!sessao.logado && (
                        <Link
                            href="/login"
                            className="hidden md:flex items-center gap-2 text-[0.65rem] font-medium tracking-[0.2em] uppercase text-caramelo/70 transition-all duration-500 hover:text-caramelo"
                        >
                            Acesso Cliente
                        </Link>
                    )}

                    {!sessao.logado && (
                        <div aria-hidden="true" className="hidden md:block w-px h-3 bg-white/10" />
                    )}

                    {/* Botão hamburguer */}
                    <button
                        onClick={() => setMenuOpen(v => !v)}
                        aria-expanded={menuOpen}
                        aria-label={menuOpen ? 'Fechar menu' : 'Abrir menu'}
                        className="relative flex flex-col justify-center items-end gap-[6px] w-8 h-8 group"
                    >
                        <span aria-hidden="true" className={cn('block h-px transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] origin-center bg-white/60 group-hover:bg-caramelo', menuOpen ? 'w-full rotate-[-45deg] translate-y-[7px] bg-caramelo' : 'w-full')} />
                        <span aria-hidden="true" className={cn('block h-px transition-all duration-400 ease-out bg-white/40 group-hover:bg-caramelo/70', menuOpen ? 'opacity-0 w-0' : 'w-[65%]')} />
                        <span aria-hidden="true" className={cn('block h-px transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] origin-center bg-white/60 group-hover:bg-caramelo', menuOpen ? 'w-full rotate-[45deg] -translate-y-[7px] bg-caramelo' : 'w-[85%]')} />
                    </button>
                </div>
            </nav>

            {/* OVERLAY */}
            <div
                aria-hidden="true"
                onClick={closeMenu}
                className={cn(
                    'fixed inset-0 z-[98] bg-[#0e0905]/80 backdrop-blur-[4px] transition-all duration-700 ease-out',
                    menuOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
                )}
            />

            {/* DRAWER */}
            <aside
                role="dialog"
                aria-modal="true"
                aria-label="Menu de navegação"
                className={cn(
                    'fixed top-0 right-0 bottom-0 z-[99] w-[min(380px,88vw)] flex flex-col',
                    'bg-[#0a0603] shadow-[-20px_0_60px_rgba(0,0,0,0.8)] border-l border-[rgba(197,168,124,0.05)]',
                    'transition-transform duration-[800ms] ease-[cubic-bezier(0.16,1,0.3,1)]',
                    menuOpen ? 'translate-x-0' : 'translate-x-full'
                )}
            >
                <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
                    <div className="absolute -top-[15%] -right-[10%] w-[65%] h-[55%] rounded-full bg-[radial-gradient(ellipse,rgba(92,64,51,0.15)_0%,transparent_70%)] blur-3xl" />
                    <div className="absolute bottom-[15%] -left-[10%] w-[50%] h-[35%] rounded-full bg-[radial-gradient(ellipse,rgba(197,168,124,0.03)_0%,transparent_70%)] blur-2xl" />
                    <div className="absolute inset-0 opacity-[0.02]" style={{ backgroundImage: 'linear-gradient(rgba(197,168,124,1) 1px, transparent 1px), linear-gradient(90deg, rgba(197,168,124,1) 1px, transparent 1px)', backgroundSize: '96px 96px' }} />
                </div>

                <div className="relative flex items-center justify-between px-10 py-8 flex-shrink-0">
                    <div className="flex flex-col gap-0.5">
                        <div className="flex items-center gap-3">
                            <div className="h-px w-6 bg-gradient-to-r from-transparent to-caramelo/50" />
                            <span className="font-sans text-[0.55rem] font-medium tracking-[0.3em] uppercase text-caramelo/50">
                                {isCliente ? 'Área do Cliente' : isFuncionario ? 'Área Profissional' : 'Navegação'}
                            </span>
                        </div>
                        {sessao.logado && sessao.nome && (
                            <p className="font-serif text-[0.9rem] font-light text-white/50 mt-1 ml-9">
                                Olá, {primeiroNome}
                            </p>
                        )}
                    </div>

                    <button
                        onClick={closeMenu}
                        aria-label="Fechar menu"
                        className="group flex items-center justify-center w-8 h-8 rounded-full border border-white/5 bg-white/[0.02] hover:bg-white/[0.06] hover:border-white/10 transition-all duration-300"
                    >
                        <svg width="10" height="10" viewBox="0 0 14 14" fill="none" aria-hidden="true" className="text-white/40 group-hover:text-white transition-colors">
                            <path d="M1 1l12 12M13 1L1 13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                        </svg>
                    </button>
                </div>

                <div aria-hidden="true" className="relative mx-10 h-px bg-gradient-to-r from-[rgba(197,168,124,0.15)] to-transparent flex-shrink-0" />

                <nav aria-label="Menu principal" className="relative flex flex-col px-10 pt-8 flex-shrink-0">
                    {NAV_LINKS.map(({ label, href }, i) => (
                        <a
                            key={label}
                            href={href}
                            onClick={closeMenu}
                            className={cn(
                                'group flex items-center justify-between py-[1.1rem] border-b border-[rgba(197,168,124,0.04)]',
                                'transition-all duration-[600ms] ease-[cubic-bezier(0.16,1,0.3,1)] hover:border-[rgba(197,168,124,0.2)]',
                                menuOpen ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-8'
                            )}
                            style={{ transitionDelay: menuOpen ? `${150 + i * 60}ms` : '0ms' }}
                        >
                            <span className="font-serif text-[1.2rem] font-light tracking-[0.02em] text-white/40 group-hover:text-caramelo group-hover:translate-x-1.5 transition-all duration-500">
                                {label}
                            </span>
                            <svg className="w-3 h-3 text-caramelo/0 group-hover:text-caramelo/60 transition-all duration-500" viewBox="0 0 12 12" fill="none" aria-hidden="true">
                                <path d="M1 6h10M7 2l4 4-4 4" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                        </a>
                    ))}
                </nav>

                <div className="flex-1" />

                <div
                    className={cn(
                        'relative flex-shrink-0 px-10 pb-10 pt-6',
                        'transition-all duration-700 ease-[cubic-bezier(0.16,1,0.3,1)]',
                        menuOpen ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'
                    )}
                    style={{ transitionDelay: menuOpen ? '380ms' : '0ms' }}
                >
                    <div className="flex items-center gap-3 mb-5">
                        <span className="text-[0.52rem] font-medium tracking-[0.26em] uppercase text-caramelo/35 whitespace-nowrap">
                            {isCliente ? 'Os seus acessos' : isFuncionario ? 'Painel profissional' : 'Área de acesso'}
                        </span>
                        <div aria-hidden="true" className="flex-1 h-px bg-gradient-to-r from-[rgba(197,168,124,0.15)] to-transparent" />
                    </div>

                    {/* MENU CLIENTE LOGADO */}
                    {isCliente && (
                        <div className="flex flex-col gap-2.5">
                            <Link
                                href="/cliente/dashboard#agendamentos"
                                onClick={closeMenu}
                                className="group flex items-center gap-3.5 px-4 py-3.5 border border-[rgba(197,168,124,0.14)] bg-[rgba(197,168,124,0.03)] hover:bg-[rgba(197,168,124,0.07)] hover:border-[rgba(197,168,124,0.28)] transition-all duration-300 active:scale-[0.98]"
                                style={{ clipPath: 'polygon(6px 0,100% 0,100% calc(100% - 6px),calc(100% - 6px) 100%,0 100%,0 6px)' }}
                            >
                                <div className="w-8 h-8 rounded-full border border-[rgba(197,168,124,0.15)] bg-[rgba(197,168,124,0.06)] flex items-center justify-center flex-shrink-0 text-caramelo/70 group-hover:bg-[rgba(197,168,124,0.12)] transition-all duration-300">
                                    <IconeAgenda />
                                </div>
                                <div className="flex flex-col gap-0.5">
                                    <span className="text-[0.7rem] font-medium tracking-[0.08em] text-white/70 group-hover:text-white/90 transition-colors duration-200">
                                        Meus Agendamentos
                                    </span>
                                    <span className="text-[0.56rem] text-white/25 tracking-[0.04em]">
                                        Acesso ao Painel
                                    </span>
                                </div>
                            </Link>

                            <button
                                onClick={() => { void handleLogoutCliente() }}
                                disabled={loadingLogout}
                                className="group flex items-center gap-3 px-4 py-2.5 mt-1 text-left border border-transparent hover:border-red-900/30 hover:bg-red-950/20 transition-all duration-300 disabled:opacity-50"
                            >
                                <IconeSair />
                                <span className="text-[0.65rem] font-medium tracking-[0.1em] uppercase text-white/25 group-hover:text-red-400/70 transition-colors duration-200">
                                    {loadingLogout ? 'A sair...' : 'Terminar Sessão'}
                                </span>
                            </button>
                        </div>
                    )}

                    {/* MENU FUNCIONÁRIO LOGADO */}
                    {isFuncionario && (
                        <div className="flex flex-col gap-2.5">
                            <Link
                                href="/profissional/agenda"
                                onClick={closeMenu}
                                className="group flex items-center gap-3.5 px-4 py-3.5 border border-[rgba(197,168,124,0.14)] bg-[rgba(197,168,124,0.03)] hover:bg-[rgba(197,168,124,0.07)] hover:border-[rgba(197,168,124,0.28)] transition-all duration-300 active:scale-[0.98]"
                                style={{ clipPath: 'polygon(6px 0,100% 0,100% calc(100% - 6px),calc(100% - 6px) 100%,0 100%,0 6px)' }}
                            >
                                <div className="w-8 h-8 rounded-full border border-[rgba(197,168,124,0.15)] bg-[rgba(197,168,124,0.06)] flex items-center justify-center flex-shrink-0 text-caramelo/70 group-hover:bg-[rgba(197,168,124,0.12)] transition-all duration-300">
                                    <IconeAgenda />
                                </div>
                                <div className="flex flex-col gap-0.5">
                                    <span className="text-[0.7rem] font-medium tracking-[0.08em] text-white/70 group-hover:text-white/90 transition-colors duration-200">
                                        Minha Agenda
                                    </span>
                                    <span className="text-[0.56rem] text-white/25 tracking-[0.04em]">
                                        Atendimentos de hoje
                                    </span>
                                </div>
                            </Link>

                            {isAdmin && (
                                <Link
                                    href="/admin/dashboard"
                                    onClick={closeMenu}
                                    className="group flex items-center gap-3.5 px-4 py-3.5 border border-[rgba(197,168,124,0.08)] bg-transparent hover:bg-[rgba(197,168,124,0.04)] hover:border-[rgba(197,168,124,0.18)] transition-all duration-300 active:scale-[0.98]"
                                    style={{ clipPath: 'polygon(6px 0,100% 0,100% calc(100% - 6px),calc(100% - 6px) 100%,0 100%,0 6px)' }}
                                >
                                    <div className="w-8 h-8 rounded-full border border-[rgba(197,168,124,0.08)] flex items-center justify-center flex-shrink-0 text-caramelo/40 group-hover:bg-[rgba(197,168,124,0.08)] transition-all duration-300">
                                        <IconeBriefcase />
                                    </div>
                                    <div className="flex flex-col gap-0.5">
                                        <span className="text-[0.7rem] font-medium tracking-[0.08em] text-white/40 group-hover:text-white/65 transition-colors duration-200">
                                            Painel Administrativo
                                        </span>
                                        <span className="text-[0.56rem] text-white/18 tracking-[0.04em]">
                                            Gestão do salão
                                        </span>
                                    </div>
                                </Link>
                            )}

                            <button
                                onClick={() => { void handleLogoutFuncionario() }}
                                disabled={loadingLogout}
                                className="group flex items-center gap-3 px-4 py-2.5 mt-1 text-left border border-transparent hover:border-red-900/30 hover:bg-red-950/20 transition-all duration-300 disabled:opacity-50"
                            >
                                <IconeSair />
                                <span className="text-[0.65rem] font-medium tracking-[0.1em] uppercase text-white/25 group-hover:text-red-400/70 transition-colors duration-200">
                                    {loadingLogout ? 'A sair...' : 'Terminar Sessão'}
                                </span>
                            </button>
                        </div>
                    )}

                    {/* NÃO LOGADO */}
                    {!sessao.logado && (
                        <div className="flex flex-col gap-3">
                            <Link
                                href="/login"
                                onClick={closeMenu}
                                className="group flex items-center gap-3.5 px-4 py-3.5 border border-[rgba(197,168,124,0.15)] bg-[rgba(197,168,124,0.03)] hover:bg-[rgba(197,168,124,0.08)] hover:border-[rgba(197,168,124,0.3)] transition-all duration-300 active:scale-[0.98]"
                                style={{ clipPath: 'polygon(6px 0,100% 0,100% calc(100% - 6px),calc(100% - 6px) 100%,0 100%,0 6px)' }}
                            >
                                <div className="w-8 h-8 rounded-full border border-[rgba(197,168,124,0.15)] bg-[rgba(197,168,124,0.06)] flex items-center justify-center flex-shrink-0 text-caramelo/70 group-hover:bg-[rgba(197,168,124,0.14)] transition-all duration-300">
                                    <IconeUser />
                                </div>
                                <div className="flex flex-col gap-0.5">
                                    <span className="text-[0.7rem] font-semibold tracking-[0.08em] uppercase text-white/75 group-hover:text-caramelo transition-colors duration-300">
                                        Acesso Cliente
                                    </span>
                                    <span className="text-[0.56rem] font-light text-white/28 tracking-[0.05em] group-hover:text-white/45 transition-colors">
                                        Faça login na sua conta
                                    </span>
                                </div>
                            </Link>

                            <Link
                                href="/login-profissional"
                                onClick={closeMenu}
                                className="group flex items-center justify-between px-4 py-3 border border-transparent hover:border-white/5 hover:bg-white/[0.02] transition-all duration-500"
                            >
                                <span className="text-[0.62rem] font-medium tracking-[0.15em] uppercase text-white/28 group-hover:text-white/55 transition-colors duration-300">
                                    Área Profissional
                                </span>
                            </Link>
                        </div>
                    )}
                </div>
            </aside>
        </>
    )
})

export default Navbar