'use client'

import { useState } from 'react'
import { salvarPerfilEExpediente } from '@/app/actions/profissional'
import { useRouter } from 'next/navigation'

const DIAS_SEMANA = ['Domingo', 'Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira', 'Sábado']

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

    // Estados Globais
    const [salvando, setSalvando] = useState(false)
    const [mensagem, setMensagem] = useState({ texto: '', tipo: '' })

    // Estados dos Campos
    const [fotoUrl, setFotoUrl] = useState<string | null>(fotoUrlInicial)
    const [expedientes, setExpedientes] = useState<Expediente[]>(expedientesIniciais)

    // Atualiza um dia específico na lista de expedientes
    const atualizarExpediente = (index: number, campo: keyof Expediente, valor: any) => {
        const novaEscala = [...expedientes]
        novaEscala[index] = { ...novaEscala[index], [campo]: valor }
        setExpedientes(novaEscala)
    }

    // Upload de Imagem (Usa a rota /api/upload que já existe no seu projeto)
    const handleUploadFoto = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (!file) return

        setMensagem({ texto: 'A enviar foto...', tipo: 'info' })
        const formData = new FormData()
        formData.append('file', file)

        try {
            const res = await fetch('/api/upload', { method: 'POST', body: formData })
            const data = await res.json()
            if (data.url) {
                setFotoUrl(data.url)
                setMensagem({ texto: 'Foto carregada! Clique em "Salvar Alterações" para confirmar.', tipo: 'info' })
            } else {
                throw new Error()
            }
        } catch (error) {
            setMensagem({ texto: 'Falha ao processar o upload da imagem.', tipo: 'erro' })
        }
    }

    // Envio Final
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setSalvando(true)
        setMensagem({ texto: 'A guardar configurações...', tipo: 'info' })

        // Chama a Server Action do seu arquivo profissional.ts
        const res = await salvarPerfilEExpediente(fotoUrl, expedientes)

        if (res.sucesso) {
            setMensagem({ texto: 'Perfil e horários guardados com sucesso!', tipo: 'sucesso' })
            router.refresh() // Recarrega a página para garantir que os dados estão sincronizados
        } else {
            setMensagem({ texto: res.erro || 'Erro ao guardar configurações.', tipo: 'erro' })
        }

        setSalvando(false)
    }

    return (
        <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-sm border border-[#e5d9c5] overflow-hidden flex flex-col md:flex-row animate-in fade-in">

            {/* COLUNA ESQUERDA: FOTO DO PERFIL */}
            <div className="w-full md:w-1/3 bg-gray-50 border-r border-[#e5d9c5] p-8 flex flex-col items-center border-b md:border-b-0">
                <h2 className="font-bold text-[#5C4033] mb-6">Apresentação</h2>

                <div className="w-40 h-40 rounded-full border-4 border-white shadow-md bg-gray-200 overflow-hidden relative group mb-4">
                    {fotoUrl ? (
                        <img src={fotoUrl} alt="Perfil" className="w-full h-full object-cover" />
                    ) : (
                        <svg className="w-full h-full text-gray-400 p-8" fill="currentColor" viewBox="0 0 24 24"><path d="M24 20.993V24H0v-2.996A14.977 14.977 0 0112.004 15c4.904 0 9.26 2.354 11.996 5.993zM16.002 8.999a4 4 0 11-8 0 4 4 0 018 0z" /></svg>
                    )}
                    <label className="absolute inset-0 bg-black/60 text-white flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 cursor-pointer transition-opacity">
                        <svg className="w-6 h-6 mb-1" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"></path><path strokeLinecap="round" strokeLinejoin="round" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z"></path></svg>
                        <span className="text-xs font-bold uppercase tracking-wider">Alterar</span>
                        <input type="file" accept="image/*" onChange={handleUploadFoto} className="hidden" />
                    </label>
                </div>
                <p className="text-xs text-gray-400 text-center px-4">Esta foto será exibida no sistema de agendamento para os clientes.</p>
            </div>

            {/* COLUNA DIREITA: ESCALA DE TRABALHO E SUBMIT */}
            <div className="w-full md:w-2/3 p-8 flex flex-col">
                <div className="mb-6">
                    <h2 className="font-bold text-[#5C4033] mb-1">Escala Semanal</h2>
                    <p className="text-sm text-gray-500">Defina os dias e os horários em que atende. Isto gerará a sua agenda automaticamente.</p>
                </div>

                {mensagem.texto && (
                    <div className={`mb-6 p-4 rounded-lg text-sm font-bold border ${mensagem.tipo === 'sucesso' ? 'bg-green-50 text-green-700 border-green-200' : mensagem.tipo === 'erro' ? 'bg-red-50 text-red-700 border-red-200' : 'bg-blue-50 text-blue-700 border-blue-200'}`}>
                        {mensagem.texto}
                    </div>
                )}

                <div className="grid grid-cols-1 gap-3 flex-1 overflow-y-auto mb-6 pr-2">
                    {expedientes.map((exp, index) => (
                        <div key={index} className={`flex items-center justify-between p-4 rounded-xl border transition-all ${exp.ativo ? 'bg-orange-50/40 border-[#8B5A2B]/40 shadow-sm' : 'bg-white border-gray-100 hover:border-gray-200'}`}>

                            <label className="flex items-center cursor-pointer min-w-[120px]">
                                <input
                                    type="checkbox"
                                    checked={exp.ativo}
                                    onChange={e => atualizarExpediente(index, 'ativo', e.target.checked)}
                                    className="w-4 h-4 accent-[#8B5A2B] rounded mr-3 cursor-pointer"
                                />
                                <span className={`font-bold uppercase tracking-wider text-xs ${exp.ativo ? 'text-[#8B5A2B]' : 'text-gray-400'}`}>
                                    {DIAS_SEMANA[index]}
                                </span>
                            </label>

                            <div className={`flex items-center gap-2 md:gap-4 ${exp.ativo ? 'opacity-100' : 'opacity-20 pointer-events-none'}`}>
                                <input
                                    type="time"
                                    value={exp.horaInicio}
                                    onChange={e => atualizarExpediente(index, 'horaInicio', e.target.value)}
                                    className="border border-gray-300 rounded-lg px-2 py-1 md:px-3 md:py-2 text-sm outline-none focus:border-[#8B5A2B] font-medium bg-white"
                                />
                                <span className="text-gray-400 font-bold text-xs">ATÉ</span>
                                <input
                                    type="time"
                                    value={exp.horaFim}
                                    onChange={e => atualizarExpediente(index, 'horaFim', e.target.value)}
                                    className="border border-gray-300 rounded-lg px-2 py-1 md:px-3 md:py-2 text-sm outline-none focus:border-[#8B5A2B] font-medium bg-white"
                                />
                            </div>
                        </div>
                    ))}
                </div>

                <div className="flex justify-end pt-6 border-t border-gray-100 mt-auto">
                    <button
                        type="submit"
                        disabled={salvando}
                        className="w-full md:w-auto bg-[#8B5A2B] text-white px-8 py-3 rounded-xl font-bold uppercase tracking-wider text-sm hover:bg-[#704620] transition-colors disabled:opacity-50 shadow-md flex justify-center items-center gap-2"
                    >
                        {salvando ? (
                            <>
                                <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                                Guardando...
                            </>
                        ) : 'Salvar Alterações'}
                    </button>
                </div>
            </div>
        </form>
    )
}