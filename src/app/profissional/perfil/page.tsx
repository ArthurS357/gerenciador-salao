'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { obterPerfilEExpediente, salvarPerfilEExpediente } from '@/app/actions/profissional'

const DIAS_SEMANA = ['Domingo', 'Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira', 'Sábado']

export default function PerfilProfissionalPage() {
    const [carregando, setCarregando] = useState(true)
    const [salvando, setSalvando] = useState(false)
    const [mensagem, setMensagem] = useState<{ texto: string, tipo: 'sucesso' | 'erro' } | null>(null)

    const [fotoUrl, setFotoUrl] = useState<string | null>(null)
    const [arquivoFoto, setArquivoFoto] = useState<File | null>(null)
    const [previewFoto, setPreviewFoto] = useState<string | null>(null)

    const [expedientes, setExpedientes] = useState<Array<{ diaSemana: number, horaInicio: string, horaFim: string, ativo: boolean }>>([])

    useEffect(() => {
        carregarDados()
    }, [])

    const carregarDados = async () => {
        const res = await obterPerfilEExpediente()
        if (res.sucesso) {
            setFotoUrl(res.fotoUrl)
            setExpedientes(res.expedientes)
        }
        setCarregando(false)
    }

    const handleFotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0]
            setArquivoFoto(file)
            setPreviewFoto(URL.createObjectURL(file))
        }
    }

    const atualizarExpediente = (index: number, campo: string, valor: any) => {
        const novosExpedientes = [...expedientes]
        novosExpedientes[index] = { ...novosExpedientes[index], [campo]: valor }
        setExpedientes(novosExpedientes)
    }

    const handleSalvar = async (e: React.FormEvent) => {
        e.preventDefault()
        setSalvando(true)
        setMensagem(null)

        let urlFinal = fotoUrl

        // Se o utilizador escolheu uma foto nova, faz o upload primeiro
        if (arquivoFoto) {
            const data = new FormData()
            data.append("file", arquivoFoto)

            try {
                const resUpload = await fetch("/api/upload", { method: "POST", body: data })
                const uploadResult = await resUpload.json()

                if (uploadResult.sucesso) {
                    urlFinal = uploadResult.url
                    setFotoUrl(urlFinal)
                } else {
                    setMensagem({ texto: "Falha ao enviar a imagem de perfil.", tipo: 'erro' })
                    setSalvando(false)
                    return
                }
            } catch (error) {
                setMensagem({ texto: "Erro técnico ao subir imagem.", tipo: 'erro' })
                setSalvando(false)
                return
            }
        }

        const res = await salvarPerfilEExpediente(urlFinal, expedientes)

        if (res.sucesso) {
            setMensagem({ texto: "Perfil e horários guardados com sucesso!", tipo: 'sucesso' })
        } else {
            setMensagem({ texto: res.erro || "Falha ao guardar os dados.", tipo: 'erro' })
        }

        setSalvando(false)
    }

    if (carregando) {
        return <div className="min-h-screen flex items-center justify-center bg-[#fdfbf7]"><p className="text-[#8B5A2B] font-bold">A carregar perfil...</p></div>
    }

    return (
        <div className="min-h-screen bg-[#fdfbf7] font-sans pb-12">
            {/* Header / Nav (Ajuste os links conforme a sua estrutura de profissional) */}
            <header className="bg-white border-b border-[#e5d9c5] px-8 py-6 mb-8 shadow-sm">
                <div className="max-w-4xl mx-auto flex justify-between items-center">
                    <h1 className="text-2xl font-bold text-[#5C4033]">O Meu Perfil</h1>
                    <nav className="flex gap-4">
                        <Link href="/profissional/agenda" className="text-gray-600 hover:text-[#8B5A2B] font-semibold transition-colors">Minha Agenda</Link>
                        <Link href="/profissional/perfil" className="text-[#8B5A2B] font-bold border-b-2 border-[#8B5A2B]">Perfil & Horários</Link>
                    </nav>
                </div>
            </header>

            <main className="max-w-4xl mx-auto px-6">
                {mensagem && (
                    <div className={`mb-6 p-4 rounded-lg font-bold text-center border ${mensagem.tipo === 'sucesso' ? 'bg-green-50 text-green-700 border-green-200' : 'bg-red-50 text-red-700 border-red-200'}`}>
                        {mensagem.texto}
                    </div>
                )}

                <form onSubmit={handleSalvar} className="space-y-8">

                    {/* Secção da Imagem */}
                    <div className="bg-white p-8 rounded-xl shadow-sm border border-[#e5d9c5] flex items-center gap-8">
                        <div className="relative">
                            <div className="w-24 h-24 rounded-full bg-gray-100 border-2 border-dashed border-[#c5a87c] overflow-hidden flex items-center justify-center">
                                {previewFoto || fotoUrl ? (
                                    <img src={previewFoto || fotoUrl!} alt="Perfil" className="w-full h-full object-cover" />
                                ) : (
                                    <span className="text-3xl text-gray-300">👤</span>
                                )}
                            </div>
                        </div>
                        <div>
                            <h2 className="text-lg font-bold text-gray-800 mb-1">Foto de Perfil</h2>
                            <p className="text-sm text-gray-500 mb-4">Esta foto será visível para os clientes na hora de agendar consigo.</p>
                            <input
                                type="file"
                                accept="image/*"
                                onChange={handleFotoChange}
                                className="text-sm file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-orange-50 file:text-[#8B5A2B] hover:file:bg-orange-100 cursor-pointer"
                            />
                        </div>
                    </div>

                    {/* Secção do Horário (Escala) */}
                    <div className="bg-white p-8 rounded-xl shadow-sm border border-[#e5d9c5]">
                        <div className="mb-6">
                            <h2 className="text-xl font-bold text-[#5C4033] mb-1">Horário de Atendimento</h2>
                            <p className="text-sm text-gray-500">Defina a sua escala semanal base. Os clientes só poderão agendar nestes horários.</p>
                        </div>

                        <div className="space-y-4">
                            {expedientes.map((exp, index) => (
                                <div key={exp.diaSemana} className={`flex items-center gap-6 p-4 rounded-lg border transition-colors ${exp.ativo ? 'bg-orange-50/30 border-[#e5d9c5]' : 'bg-gray-50 border-gray-100'}`}>

                                    {/* Toggle Ativo/Inativo */}
                                    <label className="relative inline-flex items-center cursor-pointer w-32">
                                        <input type="checkbox" className="sr-only peer" checked={exp.ativo} onChange={(e) => atualizarExpediente(index, 'ativo', e.target.checked)} />
                                        <div className="w-11 h-6 bg-gray-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#8B5A2B]"></div>
                                        <span className={`ml-3 text-sm font-bold ${exp.ativo ? 'text-gray-800' : 'text-gray-400'}`}>
                                            {DIAS_SEMANA[exp.diaSemana]}
                                        </span>
                                    </label>

                                    {/* Horários */}
                                    <div className={`flex items-center gap-3 transition-opacity ${exp.ativo ? 'opacity-100' : 'opacity-40 pointer-events-none'}`}>
                                        <div className="flex flex-col">
                                            <span className="text-[10px] uppercase font-bold text-gray-500 mb-1">Entrada</span>
                                            <input
                                                type="time"
                                                value={exp.horaInicio}
                                                onChange={(e) => atualizarExpediente(index, 'horaInicio', e.target.value)}
                                                className="border border-gray-300 rounded px-3 py-1.5 outline-none focus:border-[#8B5A2B] text-sm font-medium"
                                            />
                                        </div>
                                        <span className="text-gray-400 mt-4">até</span>
                                        <div className="flex flex-col">
                                            <span className="text-[10px] uppercase font-bold text-gray-500 mb-1">Saída</span>
                                            <input
                                                type="time"
                                                value={exp.horaFim}
                                                onChange={(e) => atualizarExpediente(index, 'horaFim', e.target.value)}
                                                className="border border-gray-300 rounded px-3 py-1.5 outline-none focus:border-[#8B5A2B] text-sm font-medium"
                                            />
                                        </div>
                                    </div>

                                    {!exp.ativo && <span className="ml-auto text-xs font-semibold text-gray-400 uppercase tracking-widest">Folga</span>}
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="flex justify-end pt-4">
                        <button
                            type="submit"
                            disabled={salvando}
                            className="bg-[#5C4033] text-white px-8 py-3 rounded-xl font-bold shadow-md hover:bg-[#3e2b22] hover:shadow-lg transition-all disabled:opacity-70 flex items-center gap-2"
                        >
                            {salvando ? 'A Guardar...' : 'Salvar Alterações'}
                        </button>
                    </div>
                </form>
            </main>
        </div>
    )
}