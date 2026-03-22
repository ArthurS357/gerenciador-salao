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

    useEffect(() => {
        const onScroll = () => setScrolled(window.scrollY > 24)
        window.addEventListener('scroll', onScroll, { passive: true })
        return () => window.removeEventListener('scroll', onScroll)
    }, [])

    return (
        <nav
            className={cn(
                'fixed top-0 left-0 right-0 z-[100] flex items-center justify-between px-6 md:px-16 transition-all duration-500',
                scrolled
                    ? 'py-3.5 bg-[rgba(20,10,5,0.92)] backdrop-blur-md border-b border-[rgba(197,168,124,0.1)] shadow-[0_1px_32px_rgba(0,0,0,0.4)]'
                    : 'py-5 bg-transparent border-b border-transparent'
            )}
        >
            {/* Linha de luz no topo — aparece ao rolar */}
            <div
                aria-hidden="true"
                className={cn(
                    'pointer-events-none absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-[rgba(197,168,124,0.3)] to-transparent transition-opacity duration-500',
                    scrolled ? 'opacity-100' : 'opacity-0'
                )}
            />

            {/* ── Logo ── */}
            <Link
                href="#"
                className="group flex flex-col leading-none no-underline"
                aria-label="LmLu Mattielo — Página inicial"
            >
                <span className="font-serif text-[1.35rem] font-semibold text-white/85 tracking-[0.02em] transition-colors duration-200 group-hover:text-white">
                    LmLu Mattielo
                </span>
                <span className="font-sans text-[0.55rem] font-normal tracking-[0.3em] uppercase text-[#c5a87c]/60 mt-[2px] transition-colors duration-200 group-hover:text-[#c5a87c]/85">
                    Studio de Beleza
                </span>
            </Link>

            {/* ── Links centrais ── */}
            <div className="hidden md:flex gap-10 items-center absolute left-1/2 -translate-x-1/2">
                {NAV_LINKS.map(({ label, href }) => (
                    <a
                        key={label}
                        href={href}
                        className="relative text-[0.68rem] font-medium tracking-[0.18em] uppercase text-white/40 transition-colors duration-200 hover:text-white/80 after:absolute after:-bottom-0.5 after:left-0 after:h-px after:w-0 after:bg-[#c5a87c]/60 after:transition-[width] after:duration-300 hover:after:w-full"
                    >
                        {label}
                    </a>
                ))}
            </div>

            {/* ── Ações ── */}
            <div className="flex items-center gap-3 md:gap-4">
                <Link
                    href={sessao.logado ? '/cliente/dashboard' : '/login'}
                    className="hidden sm:block text-[0.68rem] font-medium tracking-[0.12em] text-white/45 transition-colors duration-200 hover:text-white/80"
                >
                    {sessao.logado ? 'O Meu Painel' : 'Entrar'}
                </Link>

                {/* Divisor vertical */}
                <div aria-hidden="true" className="hidden sm:block w-px h-3.5 bg-white/10" />

                <Link
                    href="/login-profissional"
                    className="inline-flex items-center gap-1.5 px-5 py-2 border border-[rgba(197,168,124,0.28)] rounded-sm font-sans text-[0.65rem] font-medium tracking-[0.16em] uppercase text-[#c5a87c]/80 transition-all duration-300 hover:bg-[rgba(197,168,124,0.1)] hover:border-[rgba(197,168,124,0.55)] hover:text-[#c5a87c] active:scale-[0.97]"
                >
                    <svg width="10" height="11" viewBox="0 0 10 11" fill="none" aria-hidden="true">
                        <rect x="1" y="4.5" width="8" height="6" rx="1" stroke="currentColor" strokeWidth="1.1" />
                        <path d="M3 4.5V3a2 2 0 0 1 4 0v1.5" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round" />
                    </svg>
                    Área Profissional
                </Link>
            </div>
        </nav>
    )
})

export default Navbar