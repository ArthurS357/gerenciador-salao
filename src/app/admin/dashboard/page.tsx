'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { criarFuncionario, inativarFuncionario, listarEquipaAdmin } from '@/app/actions/admin'
import type { Funcionario } from '@/types/domain'

type FormData = {
    nome: string
    email: string
    cpf: string
    telefone: string
    especialidade: string
    comissao: number
}

type Mensagem = { texto: string; tipo: 'sucesso' | 'erro' | 'info' | '' }

const FORM_INICIAL: FormData = {
    nome: '', email: '', cpf: '', telefone: '', especialidade: '', comissao: 40,
}

export default function TorreControleDashboard() {
    const [equipa, setEquipa] = useState<Funcionario[]>([])
    const [mensagem, setMensagem] = useState<Mensagem>({ texto: '', tipo: '' })
    const [isModalOpen, setIsModalOpen] = useState(false)
    const [formData, setFormData] = useState<FormData>(FORM_INICIAL)

    const carregarEquipa = useCallback(async () => {
        const res = await listarEquipaAdmin()
        if (res.sucesso) setEquipa(res.equipa)
    }, [])

    useEffect(() => {
        void carregarEquipa()
    }, [carregarEquipa])

    const handleCadastrarEquipe = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault()
        setMensagem({ texto: 'A cadastrar...', tipo: 'info' })

        const res = await criarFuncionario(formData)

        if (res.sucesso) {
            setMensagem({ texto: 'Profissional cadastrado! Senha temporária: Mudar@123', tipo: 'sucesso' })
            setIsModalOpen(false)
            setFormData(FORM_INICIAL)
            void carregarEquipa()
        } else {
            setMensagem({ texto: res.erro, tipo: 'erro' })
        }
    }

    const handleInativar = async (id: string, nome: string) => {
        const confirmar = confirm(
            `Tem a certeza que deseja desativar o acesso de ${nome}? O histórico financeiro será mantido.`
        )
        if (!confirmar) return

        const res = await inativarFuncionario(id)
        if (res.sucesso) {
            setMensagem({ texto: 'Profissional inativado com sucesso.', tipo: 'sucesso' })
            void carregarEquipa()
        } else {
            setMensagem({ texto: res.erro, tipo: 'erro' })
        }
    }

    const campo = <K extends keyof FormData>(key: K) =>
        (e: React.ChangeEvent<HTMLInputElement>) =>
            setFormData((prev) => ({ ...prev, [key]: key === 'comissao' ? Number(e.target.value) : e.target.value }))

    return (
        <div className="min-h-screen bg-[#fdfbf7] p-8 font-sans">
            <header className="mb-6 border-b-2 border-[#5C4033] pb-4 flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold text-[#5C4033]">Torre de Controlo</h1>
                    <p className="text-gray-500 mt-1">Gestão Central do Salão</p>
                </div>
                <button
                    onClick={() => setIsModalOpen(true)}
                    className="bg-[#8B5A2B] text-white px-4 py-2 rounded font-bold hover:bg-[#704620]"
                >
                    + Novo Profissional
                </button>
            </header>

            {/* Navegação */}
            <nav className="flex flex-wrap gap-3 mb-8">
                {[
                    { href: '/admin/dashboard', label: 'Equipa (Atual)', ativo: true },
                    { href: '/admin/financeiro', label: 'Financeiro' },
                    { href: '/admin/estoque', label: 'Estoque de Produtos' },
                    { href: '/admin/servicos', label: 'Portfólio / Serviços' },
                    { href: '/admin/agendamentos', label: 'Agendamentos Globais' },
                    { href: '/admin/clientes', label: 'Base de Clientes' },
                ].map(({ href, label, ativo }) => (
                    <Link
                        key={href}
                        href={href}
                        className={
                            ativo
                                ? 'bg-[#5C4033] text-white px-5 py-2 rounded shadow font-bold text-sm'
                                : 'bg-white text-[#5C4033] border border-[#e5d9c5] px-5 py-2 rounded shadow-sm font-bold text-sm hover:border-[#8B5A2B] hover:bg-orange-50 transition-colors'
                        }
                    >
                        {label}
                    </Link>
                ))}
            </nav>

            {mensagem.texto && (
                <div
                    className={`mb-6 p-4 rounded font-bold text-center ${mensagem.tipo === 'erro' ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'
                        }`}
                >
                    {mensagem.texto}
                </div>
            )}

            {/* Tabela */}
            <section className="bg-white rounded-lg shadow overflow-hidden border border-[#e5d9c5]">
                <div className="bg-gray-50 px-4 py-3 border-b border-gray-200">
                    <h2 className="font-bold text-gray-700">Gestão de Equipa e Perfis</h2>
                </div>
                <table className="w-full text-left border-collapse">
                    <thead className="bg-[#5C4033] text-white">
                        <tr>
                            <th className="p-4 text-sm font-semibold">Nome &amp; Contacto</th>
                            <th className="p-4 text-sm font-semibold">Especialidade</th>
                            <th className="p-4 text-sm font-semibold text-center">Comissão</th>
                            <th className="p-4 text-sm font-semibold text-right">Ações</th>
                        </tr>
                    </thead>
                    <tbody>
                        {equipa.length === 0 ? (
                            <tr className="border-b border-gray-100">
                                <td colSpan={4} className="p-8 text-center text-gray-500">
                                    Nenhum profissional ativo na equipa. Clique em &quot;+ Novo Profissional&quot;.
                                </td>
                            </tr>
                        ) : (
                            equipa.map((prof) => (
                                <tr key={prof.id} className="border-b border-gray-100 hover:bg-gray-50">
                                    <td className="p-4">
                                        <p className="font-bold text-gray-800">{prof.nome}</p>
                                        <p className="text-xs text-gray-500">{prof.email}</p>
                                    </td>
                                    <td className="p-4 text-gray-600">{prof.especialidade ?? '-'}</td>
                                    <td className="p-4 text-center font-bold text-gray-800">{prof.comissao}%</td>
                                    <td className="p-4 text-right">
                                        <button
                                            onClick={() => handleInativar(prof.id, prof.nome)}
                                            className="bg-red-50 text-red-600 px-3 py-1 rounded text-sm font-bold border border-red-200 hover:bg-red-100"
                                        >
                                            Desativar
                                        </button>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </section>

            {/* Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
                    <div className="bg-white p-8 rounded-lg shadow-xl w-full max-w-lg border-t-4 border-[#5C4033]">
                        <h2 className="text-2xl font-bold text-[#5C4033] mb-6">Cadastrar Profissional</h2>
                        <form onSubmit={handleCadastrarEquipe} className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                {(
                                    [
                                        { label: 'Nome Completo', key: 'nome', type: 'text', required: true },
                                        { label: 'E-mail Corporativo', key: 'email', type: 'email', required: true },
                                        { label: 'CPF', key: 'cpf', type: 'text', required: true },
                                        { label: 'Especialidade', key: 'especialidade', type: 'text', required: false, placeholder: 'Ex: Colorimetria' },
                                    ] as const
                                ).map(({ label, key, type, required, placeholder }) => (
                                    <div key={key}>
                                        <label className="block text-sm font-semibold text-gray-700 mb-1">{label}</label>
                                        <input
                                            required={required}
                                            type={type}
                                            placeholder={placeholder}
                                            value={formData[key]}
                                            className="w-full border rounded px-3 py-2"
                                            onChange={campo(key)}
                                        />
                                    </div>
                                ))}
                            </div>
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-1">Comissão Padrão (%)</label>
                                <input
                                    required
                                    type="number"
                                    min="0"
                                    max="100"
                                    value={formData.comissao}
                                    className="w-full border rounded px-3 py-2"
                                    onChange={campo('comissao')}
                                />
                            </div>
                            <div className="flex justify-end gap-3 mt-6">
                                <button
                                    type="button"
                                    onClick={() => { setIsModalOpen(false); setFormData(FORM_INICIAL) }}
                                    className="px-4 py-2 text-gray-600 font-bold hover:bg-gray-100 rounded"
                                >
                                    Cancelar
                                </button>
                                <button
                                    type="submit"
                                    className="px-4 py-2 bg-[#5C4033] text-white font-bold rounded hover:bg-[#3e2b22]"
                                >
                                    Salvar Cadastro
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    )
}