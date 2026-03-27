'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { salvarPerfilEExpediente, alterarSenhaProfissional } from '@/app/actions/profissional'

const DIAS_SEMANA = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado']

type Expediente = {
    diaSemana: number
    horaInicio: string
    horaFim: string
    ativo: boolean
}

type FormularioPerfilProps = {
    fotoUrlInicial: string | null
    expedientesIniciais: Expediente[]
}

export default function FormularioPerfil({ fotoUrlInicial, expedientesIniciais }: FormularioPerfilProps) {
    const router = useRouter()
    const [abaAtiva, setAbaAtiva] = useState<'perfil' | 'seguranca'>('perfil')

    // ── Estados Aba 1: Perfil ───────────────────────────────────────────────
    const [salvandoPerfil, setSalvandoPerfil] = useState(false)
    const [mensagemPerfil, setMensagemPerfil] = useState({ texto: '', tipo: '' })
    const [fotoUrl, setFotoUrl] = useState<string | null>(fotoUrlInicial)
    const [previewFoto, setPreviewFoto] = useState<string | null>(null)
    const [arquivoFoto, setArquivoFoto] = useState<File | null>(null)
    const [expedientes, setExpedientes] = useState<Expediente[]>(expedientesIniciais)

    // ── Estados Aba 2: Segurança ────────────────────────────────────────────
    const [salvandoSenha, setSalvandoSenha] = useState(false)
    const [mensagemSenha, setMensagemSenha] = useState({ texto: '', tipo: '' })
    const [senhas, setSenhas] = useState({ nova: '', confirmar: '' })

    // ── Lógica Aba 1 ────────────────────────────────────────────────────────
    const atualizarExpediente = <K extends keyof Expediente>(index: number, campo: K, valor: Expediente[K]) => {
        const novaEscala = [...expedientes]
        novaEscala[index] = { ...novaEscala[index], [campo]: valor }
        setExpedientes(novaEscala)
    }

    const handleFotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0]
            setArquivoFoto(file)
            setPreviewFoto(URL.createObjectURL(file))
        }
    }

    const handleSubmitPerfil = async (e: React.FormEvent) => {
        e.preventDefault()
        setSalvandoPerfil(true)
        setMensagemPerfil({ texto: 'A guardar perfil...', tipo: 'info' })

        let urlFinal = fotoUrl

        if (arquivoFoto) {
            const formData = new FormData()
            formData.append('file', arquivoFoto)
            try {
                const resUpload = await fetch('/api/upload', { method: 'POST', body: formData })
                const data = await resUpload.json()
                if (data.url) {
                    urlFinal = data.url
                    setFotoUrl(urlFinal)
                } else throw new Error()
            } catch {
                setMensagemPerfil({ texto: 'Falha ao enviar a imagem.', tipo: 'erro' })
                setSalvandoPerfil(false)
                return
            }
        }

        const res = await salvarPerfilEExpediente(urlFinal, expedientes)
        if (res.sucesso) {
            setMensagemPerfil({ texto: 'Perfil e horários atualizados!', tipo: 'sucesso' })
            router.refresh()
        } else {
            setMensagemPerfil({ texto: res.erro || 'Erro ao guardar configurações.', tipo: 'erro' })
        }
        setSalvandoPerfil(false)
    }

    // ── Lógica Aba 2 ────────────────────────────────────────────────────────
    const handleSubmitSenha = async (e: React.FormEvent) => {
        e.preventDefault()
        if (senhas.nova !== senhas.confirmar) {
            setMensagemSenha({ texto: 'As senhas não coincidem.', tipo: 'erro' })
            return
        }
        if (senhas.nova.length < 6) {
            setMensagemSenha({ texto: 'A senha deve ter pelo menos 6 caracteres.', tipo: 'erro' })
            return
        }

        setSalvandoSenha(true)
        setMensagemSenha({ texto: 'A atualizar senha...', tipo: 'info' })

        const res = await alterarSenhaProfissional(senhas.nova)
        if (res.sucesso) {
            setMensagemSenha({ texto: 'Senha alterada com sucesso!', tipo: 'sucesso' })
            setSenhas({ nova: '', confirmar: '' })
        } else {
            setMensagemSenha({ texto: res.erro || 'Erro ao alterar senha.', tipo: 'erro' })
        }
        setSalvandoSenha(false)
    }

    // ── Render ──────────────────────────────────────────────────────────────
    return (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden animate-in fade-in">
            
            {/* Navegação Interna (Abas) */}
            <div className="flex border-b border-gray-100 bg-gray-50/50">
                <button
                    onClick={() => setAbaAtiva('perfil')}
                    className={`flex-1 py-4 text-sm font-bold transition-all border-b-2 ${abaAtiva === 'perfil' ? 'border-marrom-claro text-marrom-claro bg-white' : 'border-transparent text-gray-500 hover:bg-gray-50'}`}
                >
                    Informações e Escala
                </button>
                <button
                    onClick={() => setAbaAtiva('seguranca')}
                    className={`flex-1 py-4 text-sm font-bold transition-all border-b-2 ${abaAtiva === 'seguranca' ? 'border-marrom-claro text-marrom-claro bg-white' : 'border-transparent text-gray-500 hover:bg-gray-50'}`}
                >
                    Segurança e Senha
                </button>
            </div>

            {/* ABA 1: PERFIL */}
            {abaAtiva === 'perfil' && (
                <form onSubmit={handleSubmitPerfil} className="flex flex-col md:flex-row">
                    {/* Coluna Foto */}
                    <div className="w-full md:w-1/3 p-6 md:p-8 border-b md:border-b-0 md:border-r border-gray-100 flex flex-col items-center">
                        <div className="relative w-32 h-32 rounded-full border-4 border-white shadow-lg bg-gray-100 overflow-hidden group mb-5">
                            {previewFoto || fotoUrl ? (
                                <Image src={previewFoto || fotoUrl!} alt="Perfil" fill className="object-cover" unoptimized />
                            ) : (
                                <svg className="w-full h-full text-gray-300 p-6" fill="currentColor" viewBox="0 0 24 24"><path d="M24 20.993V24H0v-2.996A14.977 14.977 0 0112.004 15c4.904 0 9.26 2.354 11.996 5.993zM16.002 8.999a4 4 0 11-8 0 4 4 0 018 0z" /></svg>
                            )}
                            <label className="absolute inset-0 bg-black/60 text-white flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 cursor-pointer transition-opacity z-10">
                                <svg className="w-6 h-6 mb-1" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"></path></svg>
                                <span className="text-[10px] font-bold uppercase tracking-wider">Alterar</span>
                                <input type="file" accept="image/*" onChange={handleFotoChange} className="hidden" />
                            </label>
                        </div>
                        <p className="text-xs text-gray-400 text-center">Foto exibida no agendamento para os clientes.</p>
                    </div>

                    {/* Coluna Escala */}
                    <div className="w-full md:w-2/3 p-6 md:p-8 flex flex-col">
                        <h2 className="font-bold text-marrom-medio mb-4 text-lg tracking-tight">Escala Semanal</h2>
                        
                        {mensagemPerfil.texto && (
                            <div className={`mb-5 p-3 rounded-lg text-sm font-bold border ${mensagemPerfil.tipo === 'sucesso' ? 'bg-green-50 text-green-700 border-green-200' : 'bg-red-50 text-red-700 border-red-200'}`}>
                                {mensagemPerfil.texto}
                            </div>
                        )}

                        <div className="grid grid-cols-1 gap-3 flex-1 mb-6">
                            {expedientes.map((exp, index) => (
                                <div key={index} className={`flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-xl border transition-all ${exp.ativo ? 'bg-orange-50/40 border-marrom-claro/30' : 'bg-white border-gray-100'}`}>
                                    <label className="flex items-center cursor-pointer mb-3 sm:mb-0">
                                        <input type="checkbox" checked={exp.ativo} onChange={e => atualizarExpediente(index, 'ativo', e.target.checked)} className="w-4 h-4 accent-marrom-claro rounded mr-3 cursor-pointer" />
                                        <span className={`font-bold uppercase tracking-wider text-xs ${exp.ativo ? 'text-marrom-claro' : 'text-gray-400'}`}>{DIAS_SEMANA[index]}</span>
                                    </label>
                                    <div className={`flex items-center gap-2 ${exp.ativo ? 'opacity-100' : 'opacity-30 pointer-events-none'}`}>
                                        <input type="time" value={exp.horaInicio} onChange={e => atualizarExpediente(index, 'horaInicio', e.target.value)} className="border border-gray-300 rounded-lg px-2 py-1.5 text-sm outline-none focus:border-marrom-claro font-bold bg-white" />
                                        <span className="text-gray-400 font-bold text-[10px] uppercase">até</span>
                                        <input type="time" value={exp.horaFim} onChange={e => atualizarExpediente(index, 'horaFim', e.target.value)} className="border border-gray-300 rounded-lg px-2 py-1.5 text-sm outline-none focus:border-marrom-claro font-bold bg-white" />
                                    </div>
                                </div>
                            ))}
                        </div>

                        <div className="flex justify-end pt-4 border-t border-gray-100">
                            <button type="submit" disabled={salvandoPerfil} className="w-full sm:w-auto bg-marrom-claro text-white px-6 py-2.5 rounded-xl font-bold text-sm hover:bg-[#704620] transition-colors disabled:opacity-50 shadow-sm flex justify-center items-center gap-2">
                                {salvandoPerfil ? 'A Guardar...' : 'Salvar Perfil e Escala'}
                            </button>
                        </div>
                    </div>
                </form>
            )}

            {/* ABA 2: SEGURANÇA */}
            {abaAtiva === 'seguranca' && (
                <form onSubmit={handleSubmitSenha} className="p-6 md:p-8">
                    <div className="max-w-md mx-auto">
                        <div className="text-center mb-8">
                            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"></path></svg>
                            </div>
                            <h2 className="font-bold text-marrom-medio text-xl tracking-tight">Alterar Credenciais</h2>
                            <p className="text-sm text-gray-500 mt-1">Introduza a sua nova senha de acesso ao portal.</p>
                        </div>

                        {mensagemSenha.texto && (
                            <div className={`mb-6 p-4 rounded-lg text-sm font-bold border text-center ${mensagemSenha.tipo === 'sucesso' ? 'bg-green-50 text-green-700 border-green-200' : 'bg-red-50 text-red-700 border-red-200'}`}>
                                {mensagemSenha.texto}
                            </div>
                        )}

                        <div className="space-y-5">
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">Nova Senha</label>
                                <input
                                    type="password"
                                    required
                                    value={senhas.nova}
                                    onChange={e => setSenhas({ ...senhas, nova: e.target.value })}
                                    placeholder="••••••••"
                                    className="w-full border border-gray-300 rounded-xl px-4 py-3 outline-none focus:border-marrom-claro focus:ring-4 focus:ring-marrom-claro/10 transition-all font-medium"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">Confirmar Nova Senha</label>
                                <input
                                    type="password"
                                    required
                                    value={senhas.confirmar}
                                    onChange={e => setSenhas({ ...senhas, confirmar: e.target.value })}
                                    placeholder="••••••••"
                                    className="w-full border border-gray-300 rounded-xl px-4 py-3 outline-none focus:border-marrom-claro focus:ring-4 focus:ring-marrom-claro/10 transition-all font-medium"
                                />
                            </div>
                        </div>

                        <div className="mt-8">
                            <button type="submit" disabled={salvandoSenha || !senhas.nova || !senhas.confirmar} className="w-full bg-marrom-medio text-white px-6 py-3.5 rounded-xl font-bold hover:bg-[#3e2b22] transition-colors disabled:opacity-50 shadow-md">
                                {salvandoSenha ? 'A Atualizar...' : 'Atualizar Senha Segura'}
                            </button>
                        </div>
                    </div>
                </form>
            )}
        </div>
    )
}