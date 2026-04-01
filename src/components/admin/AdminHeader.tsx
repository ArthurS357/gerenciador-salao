'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Menu, X } from 'lucide-react'
import { verificarSessaoFuncionario } from '@/app/actions/auth'
import type { Role } from '@/types/domain'

// ── Definição de Links por Role ───────────────────────────────────────────────

type NavLink = { href: string; label: AbaAtiva }

/**
 * Links visíveis para ADMIN: acesso completo ao painel.
 * Ordem reflete a frequência de uso (tabs mais usadas primeiro).
 */
const LINKS_ADMIN: NavLink[] = [
    { href: '/admin/dashboard', label: 'Equipe' },
    { href: '/admin/financeiro', label: 'Financeiro' },
    { href: '/admin/agendamentos', label: 'Agendamentos' },
    { href: '/admin/clientes', label: 'Clientes' },
    { href: '/admin/pacotes', label: 'Pacotes' },
    { href: '/admin/servicos', label: 'Serviços' },
    { href: '/admin/estoque', label: 'Estoque' },
    { href: '/admin/avaliacoes', label: 'Avaliações' },
    { href: '/admin/auditoria', label: 'Auditoria' },
    { href: '/admin/galeria', label: 'Galeria' },
]

/**
 * Links visíveis para RECEPCIONISTA: agenda, clientes e pacotes.
 * Relatórios financeiros, auditoria e gestão de equipe são ocultados.
 */
const LINKS_RECEPCIONISTA: NavLink[] = [
    { href: '/admin/agendamentos', label: 'Agendamentos' },
    { href: '/admin/clientes', label: 'Clientes' },
    { href: '/admin/pacotes', label: 'Pacotes' },
]

// ── Tipos ─────────────────────────────────────────────────────────────────────

export type AbaAtiva =
    | 'Equipe'
    | 'Financeiro'
    | 'Estoque'
    | 'Serviços'
    | 'Agendamentos'
    | 'Clientes'
    | 'Avaliações'
    | 'Auditoria'
    | 'Galeria'
    | 'Pacotes'

interface AdminHeaderProps {
    titulo: string
    subtitulo: string
    abaAtiva: AbaAtiva
    botaoAcao?: React.ReactNode
}

// ── Componente ────────────────────────────────────────────────────────────────

export default function AdminHeader({ titulo, subtitulo, abaAtiva, botaoAcao }: AdminHeaderProps) {
    const [isMenuOpen, setIsMenuOpen] = useState(false)
    // undefined = carregando a sessão | null = sem permissão | Role = permissão ativa
    const [role, setRole] = useState<Role | null | undefined>(undefined)

    // Obtém a role da sessão ativa para filtrar os links de navegação
    useEffect(() => {
        let cancelado = false
        verificarSessaoFuncionario()
            .then(sessao => {
                if (!cancelado) setRole(sessao.logado ? sessao.role : null)
            })
            .catch(() => {
                if (!cancelado) setRole(null) // fallback seguro em caso de erro
            })

        return () => { cancelado = true }
    }, [])

    // Seleciona os links com base na role. Array vazio enquanto carrega para não piscar links proibidos.
    const links: NavLink[] =
        role === 'ADMIN' ? LINKS_ADMIN :
            role === 'RECEPCIONISTA' ? LINKS_RECEPCIONISTA : []

    return (
        <div className="max-w-7xl mx-auto px-4 md:px-8 pt-8">
            {/* ── Navegação Global ── */}
            <div className="flex gap-4 mb-6">
                <Link
                    href="/"
                    className="text-sm font-bold text-gray-400 hover:text-marrom-medio flex items-center gap-1.5 transition-colors"
                >
                    <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                        <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
                        <polyline points="9 22 9 12 15 12 15 22" />
                    </svg>
                    Página Inicial
                </Link>
                <span className="text-gray-300">|</span>
                <Link
                    href="/admin/dashboard"
                    className="text-sm font-bold text-gray-400 hover:text-marrom-medio flex items-center gap-1.5 transition-colors"
                >
                    <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                        <rect x="3" y="3" width="7" height="7" />
                        <rect x="14" y="3" width="7" height="7" />
                        <rect x="14" y="14" width="7" height="7" />
                        <rect x="3" y="14" width="7" height="7" />
                    </svg>
                    Painel Principal
                </Link>
            </div>

            {/* ── Cabeçalho da Página ── */}
            <header className="mb-6 flex flex-col md:flex-row md:items-end md:justify-between gap-4">
                <div className="flex items-center justify-between w-full md:w-auto">
                    <div>
                        <h1 className="text-2xl sm:text-3xl md:text-4xl font-black text-marrom-medio tracking-tight leading-tight">
                            {titulo}
                        </h1>
                        <p className="text-gray-500 mt-1.5 text-xs sm:text-sm md:text-base">{subtitulo}</p>
                    </div>

                    {/* Hambúrguer Mobile */}
                    <button
                        onClick={() => setIsMenuOpen(!isMenuOpen)}
                        className="md:hidden p-2.5 bg-gray-100 text-marrom-medio rounded-xl hover:bg-gray-200 transition-colors shadow-sm active:scale-95"
                        aria-label="Abrir menu"
                    >
                        {isMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
                    </button>
                </div>

                {botaoAcao && (
                    <div className="w-full sm:w-auto">{botaoAcao}</div>
                )}
            </header>

            {/* ── Navegação Mobile (Dropdown) ── */}
            <div className={`md:hidden overflow-hidden transition-all duration-300 ease-in-out mb-6 ${isMenuOpen ? 'max-h-[500px] opacity-100 translate-y-0' : 'max-h-0 opacity-0 -translate-y-4 pointer-events-none'}`}>
                <nav className="flex flex-col gap-2 p-3 bg-gray-100/60 backdrop-blur-md rounded-2xl border border-gray-200/50 shadow-sm">
                    {links.map(({ href, label }) => {
                        const ativo = label === abaAtiva
                        return (
                            <Link
                                key={href}
                                href={href}
                                onClick={() => setIsMenuOpen(false)}
                                className={
                                    ativo
                                        ? 'bg-white text-marrom-medio px-4 py-3 rounded-xl shadow-sm font-bold text-sm tracking-wide'
                                        : 'text-gray-500 px-4 py-3 rounded-xl font-semibold text-sm tracking-wide hover:bg-white/50 hover:text-gray-900 transition-all'
                                }
                            >
                                {label}
                            </Link>
                        )
                    })}
                </nav>
            </div>

            {/* ── Navegação Desktop (Tabs) ── */}
            <nav className="hidden md:flex flex-wrap gap-2 md:gap-3 mb-10 p-1 md:p-1.5 bg-gray-100/60 backdrop-blur rounded-2xl w-fit border border-gray-200/50">
                {links.map(({ href, label }) => {
                    const ativo = label === abaAtiva
                    return (
                        <Link
                            key={href}
                            href={href}
                            className={
                                ativo
                                    ? 'bg-white text-marrom-medio px-5 py-2.5 rounded-xl shadow-sm font-bold text-sm tracking-wide'
                                    : 'text-gray-500 px-5 py-2.5 rounded-xl font-semibold text-sm tracking-wide hover:bg-white/50 hover:text-gray-900 transition-all'
                            }
                        >
                            {label}
                        </Link>
                    )
                })}
            </nav>
        </div>
    )
}