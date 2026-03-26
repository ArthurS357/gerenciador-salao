import Link from 'next/link'

interface AdminHeaderProps {
    titulo: string
    subtitulo: string
    abaAtiva: 'Equipa' | 'Financeiro' | 'Estoque' | 'Serviços' | 'Agendamentos' | 'Clientes' | 'Avaliações'
    botaoAcao?: React.ReactNode
}

export default function AdminHeader({ titulo, subtitulo, abaAtiva, botaoAcao }: AdminHeaderProps) {
    const links = [
        { href: '/admin/dashboard', label: 'Equipa' },
        { href: '/admin/financeiro', label: 'Financeiro' },
        { href: '/admin/estoque', label: 'Estoque' },
        { href: '/admin/servicos', label: 'Serviços' },
        { href: '/admin/agendamentos', label: 'Agendamentos' },
        { href: '/admin/clientes', label: 'Clientes' },
        { href: '/admin/avaliacoes', label: 'Avaliações' },
    ]

    return (
        <div className="max-w-7xl mx-auto px-4 md:px-8 pt-8">
            <header className="mb-8 flex flex-col md:flex-row md:justify-between md:items-end gap-4">
                <div>
                    <h1 className="text-3xl md:text-4xl font-black text-[#5C4033] tracking-tight">{titulo}</h1>
                    <p className="text-gray-500 mt-2 text-sm md:text-base">{subtitulo}</p>
                </div>
                {botaoAcao && (
                    <div>{botaoAcao}</div>
                )}
            </header>

            <nav className="flex flex-wrap gap-2 md:gap-3 mb-10 p-1 md:p-1.5 bg-gray-100/60 backdrop-blur rounded-2xl w-fit">
                {links.map(({ href, label }) => {
                    const ativo = label === abaAtiva
                    return (
                        <Link
                            key={href}
                            href={href}
                            className={
                                ativo
                                    ? 'bg-white text-[#5C4033] px-5 py-2 md:py-2.5 rounded-xl shadow-sm font-bold text-[13px] md:text-sm tracking-wide'
                                    : 'text-gray-500 px-5 py-2 md:py-2.5 rounded-xl font-semibold text-[13px] md:text-sm tracking-wide hover:bg-white/50 hover:text-gray-900 transition-all'
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