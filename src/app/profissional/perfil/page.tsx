'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { obterPerfilEExpediente } from '@/app/actions/profissional'
import FormularioPerfil from './FormularioPerfil'

export default function PerfilProfissionalPage() {
    const [carregando, setCarregando] = useState(true)
    const [dados, setDados] = useState<{ fotoUrl: string | null, expedientes: { diaSemana: number, horaInicio: string, horaFim: string, ativo: boolean }[] } | null>(null)

    useEffect(() => {
        const carregarDados = async () => {
            const res = await obterPerfilEExpediente()
            if (res.sucesso) {
                setDados({ fotoUrl: res.data.fotoUrl, expedientes: res.data.expedientes })
            }
            setCarregando(false)
        }
        carregarDados()
    }, [])

    if (carregando) {
        return (
            <div className="min-h-screen flex flex-col gap-4 items-center justify-center bg-[#fdfbf7]">
                <svg className="animate-spin h-8 w-8 text-marrom-claro" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                <p className="text-marrom-claro font-bold uppercase tracking-wider text-sm">A carregar o seu perfil...</p>
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-[#fdfbf7] font-sans pb-12">
            <header className="bg-white border-b border-gray-200 px-8 py-6 mb-8 shadow-sm">
                <div className="max-w-4xl mx-auto flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
                    <div>
                        <h1 className="text-2xl font-black text-marrom-medio tracking-tight">O Meu Perfil</h1>
                        <p className="text-sm text-gray-500 mt-1">Gerencie os seus dados, horários e segurança.</p>
                    </div>
                    <nav className="flex gap-2 p-1 bg-gray-100/60 backdrop-blur rounded-xl w-fit">
                        <Link href="/profissional/agenda" className="text-gray-500 px-4 py-2 rounded-lg font-semibold text-sm hover:bg-white/50 transition-all">Minha Agenda</Link>
                        <Link href="/profissional/perfil" className="bg-white text-marrom-medio px-4 py-2 rounded-lg shadow-sm font-bold text-sm">Configurações</Link>
                    </nav>
                </div>
            </header>

            <main className="max-w-4xl mx-auto px-4 sm:px-6">
                {dados && (
                    <FormularioPerfil fotoUrlInicial={dados.fotoUrl} expedientesIniciais={dados.expedientes} />
                )}
            </main>
        </div>
    )
}