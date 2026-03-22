'use client'
import { useState, useEffect, memo } from 'react'
import Link from 'next/link'
import { cn } from './cn'
import type { NavbarProps } from './types'

const NAV_LINKS = [
    { label: 'Serviços', href: '#servicos' },
    { label: 'Agendar', href: '#agendamento' },
    { label: 'Contato', href: '#contato' },
] as const

const Navbar = memo(function Navbar({ sessao }: NavbarProps) {
    const [scrolled, setScrolled] = useState(false)
    const [menuOpen, setMenuOpen] = useState(false)

    useEffect(() => {
        const onScroll = () => setScrolled(window.scrollY > 24)
        window.addEventListener('scroll', onScroll, { passive: true })
        return () => window.removeEventListener('scroll', onScroll)
    }, [])

    useEffect(() => {
        document.body.style.overflow = menuOpen ? 'hidden' : ''
        return () => { document.body.style.overflow = '' }
    }, [menuOpen])

    const closeMenu = () => setMenuOpen(false)

    return (
        <>
            <nav
                className={cn(
                    'fixed top-0 left-0 right-0 z-[100] flex items-center justify-between px-8 md:px-20 lg:px-28 transition-all duration-[800ms] ease-out',
                    scrolled || menuOpen
                        ? 'py-4 bg-[#0a0603]/85 backdrop-blur-xl border-b border-[rgba(197,168,124,0.06)]'
                        : 'py-8 bg-transparent border-b border-transparent'
                )}
            >
                {/* ── Logo ── */}
                <Link
                    href="#"
                    onClick={closeMenu}
                    className="group flex items-center gap-4 leading-none no-underline relative z-10"
                    aria-label="LmLu Mattielo — Página inicial"
                >
                    <div className="flex flex-col">
                        <span className="font-serif text-[1.4rem] md:text-[1.8rem] font-medium text-white/95 tracking-[0.02em] transition-colors duration-500 group-hover:text-[#c5a87c]">
                            LmLu Mattielo
                        </span>
                        <span className="font-sans text-[0.55rem] md:text-[0.6rem] font-medium tracking-[0.35em] uppercase text-[#c5a87c]/60 mt-[3px] transition-all duration-500 group-hover:text-[#c5a87c]/90 group-hover:tracking-[0.4em]">
                            Studio de Beleza
                        </span>
                    </div>
                </Link>

                {/* ── Links centrais — desktop ── */}
                <div className="hidden md:flex gap-12 items-center absolute left-1/2 -translate-x-1/2">
                    {NAV_LINKS.map(({ label, href }) => (
                        <a
                            key={label}
                            href={href}
                            className="group relative text-[0.65rem] font-medium tracking-[0.25em] uppercase text-white/40 transition-colors duration-500 hover:text-white/90"
                        >
                            {label}
                            <span className="absolute -bottom-2 left-0 h-[1px] w-0 bg-gradient-to-r from-transparent via-[#c5a87c]/70 to-transparent transition-all duration-500 group-hover:w-full" />
                        </a>
                    ))}
                </div>

                {/* ── Direita ── */}
                <div className="flex items-center gap-6 relative z-10">
                    <Link
                        href={sessao.logado ? '/cliente/dashboard' : '/login'}
                        className="hidden md:flex items-center gap-2 text-[0.65rem] font-medium tracking-[0.2em] uppercase text-[#c5a87c]/70 transition-all duration-500 hover:text-[#c5a87c]"
                    >
                        <span className="relative">
                            {sessao.logado ? 'O Meu Painel' : 'Acesso Cliente'}
                            <span className="absolute -bottom-1.5 left-0 h-[1px] w-0 bg-[#c5a87c]/50 transition-all duration-500 hover:w-full" />
                        </span>
                    </Link>

                    <div aria-hidden="true" className="hidden md:block w-px h-3 bg-white/10" />

                    {/* ── Botão hamburguer esteticamente integrado ── */}
                    <button
                        onClick={() => setMenuOpen(v => !v)}
                        aria-expanded={menuOpen}
                        aria-label={menuOpen ? 'Fechar menu' : 'Abrir menu'}
                        className="relative flex flex-col justify-center items-end gap-[6px] w-8 h-8 group"
                    >
                        <span
                            aria-hidden="true"
                            className={cn(
                                'block h-px transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] origin-center bg-white/60 group-hover:bg-[#c5a87c]',
                                menuOpen ? 'w-full rotate-[-45deg] translate-y-[7px] bg-[#c5a87c]' : 'w-full'
                            )}
                        />
                        <span
                            aria-hidden="true"
                            className={cn(
                                'block h-px transition-all duration-400 ease-out bg-white/40 group-hover:bg-[#c5a87c]/70',
                                menuOpen ? 'opacity-0 w-0' : 'w-[65%]'
                            )}
                        />
                        <span
                            aria-hidden="true"
                            className={cn(
                                'block h-px transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] origin-center bg-white/60 group-hover:bg-[#c5a87c]',
                                menuOpen ? 'w-full rotate-[45deg] -translate-y-[7px] bg-[#c5a87c]' : 'w-[85%]'
                            )}
                        />
                    </button>
                </div>
            </nav>

            {/* ══════════════════════════════════════════
                OVERLAY
            ══════════════════════════════════════════ */}
            <div
                aria-hidden="true"
                onClick={closeMenu}
                className={cn(
                    'fixed inset-0 z-[98] bg-[#0e0905]/80 backdrop-blur-[4px] transition-all duration-700 ease-out',
                    menuOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
                )}
            >
                {/* Continuidade do ruído do Hero no Overlay para coesão */}
                <div
                    className="absolute inset-0 opacity-[0.02] mix-blend-overlay pointer-events-none"
                    style={{
                        backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='300' height='300'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='300' height='300' filter='url(%23n)'/%3E%3C/svg%3E")`,
                    }}
                />
            </div>

            {/* ══════════════════════════════════════════
                DRAWER 
            ══════════════════════════════════════════ */}
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
                {/* Efeitos de Luz no Background da Gaveta alinhados ao Hero */}
                <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
                    <div className="absolute -top-[15%] -right-[10%] w-[65%] h-[55%] rounded-full bg-[radial-gradient(ellipse,rgba(92,64,51,0.15)_0%,transparent_70%)] blur-3xl" />
                    <div className="absolute bottom-[15%] -left-[10%] w-[50%] h-[35%] rounded-full bg-[radial-gradient(ellipse,rgba(197,168,124,0.03)_0%,transparent_70%)] blur-2xl" />
                    {/* Linhas da Gaveta */}
                    <div
                        className="absolute inset-0 opacity-[0.02]"
                        style={{
                            backgroundImage: "linear-gradient(rgba(197,168,124,1) 1px, transparent 1px), linear-gradient(90deg, rgba(197,168,124,1) 1px, transparent 1px)",
                            backgroundSize: "96px 96px",
                        }}
                    />
                </div>

                {/* Cabeçalho */}
                <div className="relative flex items-center justify-between px-10 py-8 flex-shrink-0">
                    <div className="flex items-center gap-3">
                        <div className="h-px w-6 bg-gradient-to-r from-transparent to-[#c5a87c]/50" />
                        <span className="font-sans text-[0.55rem] font-medium tracking-[0.3em] uppercase text-[#c5a87c]/50">
                            Navegação
                        </span>
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

                {/* Divisor Delicado */}
                <div aria-hidden="true" className="relative mx-10 h-px bg-gradient-to-r from-[rgba(197,168,124,0.15)] to-transparent flex-shrink-0" />

                {/* ── Links de navegação ── */}
                <nav aria-label="Menu principal" className="relative flex flex-col px-10 pt-8 flex-1 overflow-y-auto">
                    {NAV_LINKS.map(({ label, href }, i) => (
                        <a
                            key={label}
                            href={href}
                            onClick={closeMenu}
                            className={cn(
                                'group flex items-center justify-between py-[1.4rem] border-b border-[rgba(197,168,124,0.04)]',
                                'transition-all duration-[600ms] ease-[cubic-bezier(0.16,1,0.3,1)] hover:border-[rgba(197,168,124,0.2)]',
                                menuOpen ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-8'
                            )}
                            style={{ transitionDelay: menuOpen ? `${150 + i * 80}ms` : '0ms' }}
                        >
                            <span className="font-serif text-[1.4rem] font-light tracking-[0.02em] text-white/50 group-hover:text-[#c5a87c] group-hover:translate-x-2 transition-all duration-500">
                                {label}
                            </span>
                            <svg
                                className="w-3.5 h-3.5 text-[#c5a87c]/0 group-hover:text-[#c5a87c]/60 group-hover:-translate-x-1 transition-all duration-500"
                                viewBox="0 0 12 12" fill="none" aria-hidden="true"
                            >
                                <path d="M1 6h10M7 2l4 4-4 4" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                        </a>
                    ))}
                </nav>

                {/* ── Área de acessos inferior ── */}
                <div
                    className={cn(
                        'relative flex-shrink-0 px-10 pb-12 pt-8',
                        'transition-all duration-700 ease-[cubic-bezier(0.16,1,0.3,1)]',
                        menuOpen ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'
                    )}
                    style={{ transitionDelay: menuOpen ? '400ms' : '0ms' }}
                >
                    <div className="flex flex-col gap-3">
                        {/* ── Acesso cliente ── */}
                        <Link
                            href={sessao.logado ? '/cliente/dashboard' : '/login'}
                            onClick={closeMenu}
                            className="group relative flex items-center gap-4 px-5 py-4 rounded-sm border border-[rgba(197,168,124,0.15)] bg-[#c5a87c]/[0.03] hover:bg-[#c5a87c]/[0.08] hover:border-[#c5a87c]/30 overflow-hidden transition-all duration-500"
                        >
                            {/* Hover effect glow */}
                            <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 bg-gradient-to-r from-transparent via-[#c5a87c]/10 to-transparent -translate-x-full group-hover:animate-[shimmer_2s_infinite]" />

                            <div className="flex flex-col gap-1 relative z-10">
                                <span className="text-[0.68rem] font-semibold tracking-[0.15em] uppercase text-white/80 group-hover:text-[#c5a87c] transition-colors duration-300">
                                    {sessao.logado ? 'O Meu Painel' : 'Acesso Cliente'}
                                </span>
                                <span className="text-[0.55rem] font-light text-white/30 tracking-[0.05em] group-hover:text-white/50 transition-colors">
                                    {sessao.logado ? 'Gerenciar agendamentos' : 'Faça login na sua conta'}
                                </span>
                            </div>
                            <svg className="ml-auto w-3 h-3 text-[#c5a87c]/30 group-hover:text-[#c5a87c] transition-colors duration-300 relative z-10" viewBox="0 0 12 12" fill="none" aria-hidden="true">
                                <path d="M1 6h10M7 2l4 4-4 4" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                        </Link>

                        {/* ── Acesso profissional ── */}
                        <Link
                            href="/login-profissional"
                            onClick={closeMenu}
                            className="group flex items-center justify-between px-5 py-3.5 mt-2 rounded-sm border border-transparent hover:border-white/5 hover:bg-white/[0.02] transition-all duration-500"
                        >
                            <span className="text-[0.6rem] font-medium tracking-[0.15em] uppercase text-white/30 group-hover:text-white/60 transition-colors duration-300">
                                Área Profissional
                            </span>
                            <svg className="w-2.5 h-2.5 text-white/10 group-hover:text-white/40 transition-colors duration-300" viewBox="0 0 12 12" fill="none" aria-hidden="true">
                                <path d="M1 6h10M7 2l4 4-4 4" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                        </Link>
                    </div>
                </div>
            </aside>
        </>
    )
})

export default Navbar