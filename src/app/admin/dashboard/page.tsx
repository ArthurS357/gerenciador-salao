'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import {
    criarFuncionario,
    inativarFuncionario,
    listarEquipaAdmin,
    atualizarFuncionarioCompleto,
    excluirFuncionarioPermanente,
    editarFuncionarioCompleto // <-- Nova importação para salvar serviços
} from '@/app/actions/admin'
import { listarServicosAdmin } from '@/app/actions/servico'

type FormData = {
    nome: string
    email: string
    cpf: string
    telefone: string
    especialidade: string
    comissao: number
    servicosIds: string[]
}

type Mensagem = { texto: string; tipo: 'sucesso' | 'erro' | 'info' | '' }

const FORM_INICIAL: FormData = {
    nome: '', email: '', cpf: '', telefone: '', especialidade: '', comissao: 40, servicosIds: []
}

export default function TorreControleDashboard() {
    const [equipa, setEquipa] = useState<any[]>([])
    const [servicosDisponiveis, setServicosDisponiveis] = useState<any[]>([])
    const [editState, setEditState] = useState<Record<string, any>>({})
    const [mensagem, setMensagem] = useState<Mensagem>({ texto: '', tipo: '' })
    const [isModalOpen, setIsModalOpen] = useState(false)
    const [formData, setFormData] = useState<FormData>(FORM_INICIAL)

    // Estados de controle de fluxo e UI
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [idAcaoLoading, setIdAcaoLoading] = useState<string | null>(null)

    // NOVO ESTADO: Controle do Modal de Edição de Serviços
    const [modalServicos, setModalServicos] = useState<{ id: string, nome: string, servicosIds: string[] } | null>(null)
    const [loadingServicos, setLoadingServicos] = useState(false)

    const carregarEquipa = useCallback(async () => {
        try {
            const res = await listarEquipaAdmin()
            if (res.sucesso) {
                setEquipa(res.equipa)

                // Carrega o estado de permissões de cada funcionário
                const estadoInicial: Record<string, any> = {}
                res.equipa.forEach((p: any) => {
                    estadoInicial[p.id] = {
                        comissao: p.comissao,
                        podeVerComissao: p.podeVerComissao,
                        podeAgendar: p.podeAgendar,
                        podeVerHistorico: p.podeVerHistorico
                    }
                })
                setEditState(estadoInicial)
            }
        } catch (error) {
            console.error("Falha ao carregar a equipa:", error)
        }
    }, [])

    const carregarServicos = useCallback(async () => {
        try {
            const res = await listarServicosAdmin()
            if (res.sucesso) {
                setServicosDisponiveis(res.servicos)
            }
        } catch (error) {
            console.error("Falha ao carregar os serviços:", error)
        }
    }, [])

    useEffect(() => {
        void carregarEquipa()
        void carregarServicos()
    }, [carregarEquipa, carregarServicos])

    // --- AÇÃO: CADASTRAR NOVO PROFISSIONAL ---
    const handleCadastrarEquipe = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault()
        if (isSubmitting) return

        setIsSubmitting(true)
        setMensagem({ texto: 'A processar cadastro...', tipo: 'info' })

        try {
            const res = await criarFuncionario(formData)
            if (res.sucesso) {
                setMensagem({ texto: 'Profissional cadastrado! Senha temporária: Mudar@123', tipo: 'sucesso' })
                setIsModalOpen(false)
                setFormData(FORM_INICIAL)
                void carregarEquipa()
            } else {
                setMensagem({ texto: res.erro || 'Falha ao registrar profissional.', tipo: 'erro' })
            }
        } catch (error) {
            setMensagem({ texto: 'Erro de comunicação com o servidor.', tipo: 'erro' })
        } finally {
            setIsSubmitting(false)
        }
    }

    // --- AÇÃO: SALVAR PERMISSÕES ---
    const handleSalvarPermissoes = async (id: string) => {
        if (idAcaoLoading) return
        setIdAcaoLoading(id)
        setMensagem({ texto: 'A salvar permissões...', tipo: 'info' })

        try {
            const res = await atualizarFuncionarioCompleto(id, editState[id])
            if (res.sucesso) {
                setMensagem({ texto: 'Permissões atualizadas com sucesso!', tipo: 'sucesso' })
                void carregarEquipa()
            } else {
                setMensagem({ texto: res.erro || 'Erro ao atualizar.', tipo: 'erro' })
            }
        } catch (error) {
            setMensagem({ texto: 'Falha de conexão ao salvar permissões.', tipo: 'erro' })
        } finally {
            setIdAcaoLoading(null)
        }
    }

    // --- AÇÃO: SALVAR SERVIÇOS DO PROFISSIONAL EXISTENTE ---
    const handleSalvarServicosExistente = async () => {
        if (!modalServicos) return
        setLoadingServicos(true)

        try {
            const res = await editarFuncionarioCompleto(modalServicos.id, {
                servicosIds: modalServicos.servicosIds
            })

            if (res.sucesso) {
                setMensagem({ texto: `Serviços de ${modalServicos.nome} atualizados!`, tipo: 'sucesso' })
                setModalServicos(null)
                void carregarEquipa()
            } else {
                setMensagem({ texto: res.erro || 'Erro ao atualizar serviços.', tipo: 'erro' })
            }
        } catch (error) {
            setMensagem({ texto: 'Erro de comunicação.', tipo: 'erro' })
        } finally {
            setLoadingServicos(false)
        }
    }

    // --- AÇÃO: INATIVAR ---
    const handleInativar = async (id: string, nome: string) => {
        if (idAcaoLoading) return
        if (!confirm(`Tem a certeza que deseja desativar o acesso de ${nome}?`)) return

        setIdAcaoLoading(id)
        try {
            const res = await inativarFuncionario(id)
            if (res.sucesso) {
                setMensagem({ texto: 'Profissional inativado com sucesso.', tipo: 'sucesso' })
                void carregarEquipa()
            } else setMensagem({ texto: res.erro || 'Não foi possível inativar.', tipo: 'erro' })
        } catch {
            setMensagem({ texto: 'Erro de comunicação ao inativar.', tipo: 'erro' })
        } finally {
            setIdAcaoLoading(null)
        }
    }

    // --- AÇÃO: EXCLUIR DEFINITIVO ---
    const handleExcluir = async (id: string, nome: string) => {
        if (idAcaoLoading) return
        if (!confirm(`ATENÇÃO: Deseja EXCLUIR DEFINITIVAMENTE a conta de ${nome}?`)) return

        setIdAcaoLoading(id)
        try {
            const res = await excluirFuncionarioPermanente(id)
            if (res.sucesso) {
                setMensagem({ texto: 'Funcionário excluído permanentemente.', tipo: 'sucesso' })
                void carregarEquipa()
            } else setMensagem({ texto: res.erro || 'Não foi possível excluir.', tipo: 'erro' })
        } catch {
            setMensagem({ texto: 'Erro de comunicação ao excluir.', tipo: 'erro' })
        } finally {
            setIdAcaoLoading(null)
        }
    }

    // --- CONTROLES DE INPUT ---
    const campo = <K extends keyof FormData>(key: K) =>
        (e: React.ChangeEvent<HTMLInputElement>) =>
            setFormData((prev) => ({ ...prev, [key]: key === 'comissao' ? Number(e.target.value) : e.target.value }))

    const setValorEdit = (id: string, campo: string, valor: any) => {
        setEditState(prev => ({ ...prev, [id]: { ...prev[id], [campo]: valor } }))
    }

    // Toggle para o modal de CRIAÇÃO
    const handleServicoToggleNovo = (servicoId: string) => {
        setFormData(prev => ({
            ...prev,
            servicosIds: prev.servicosIds.includes(servicoId)
                ? prev.servicosIds.filter(id => id !== servicoId)
                : [...prev.servicosIds, servicoId]
        }))
    }

    // Toggle para o modal de EDIÇÃO
    const handleServicoToggleEdicao = (servicoId: string) => {
        setModalServicos(prev => {
            if (!prev) return prev
            return {
                ...prev,
                servicosIds: prev.servicosIds.includes(servicoId)
                    ? prev.servicosIds.filter(id => id !== servicoId)
                    : [...prev.servicosIds, servicoId]
            }
        })
    }

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
                    className={`mb-6 p-4 rounded font-bold text-center ${mensagem.tipo === 'erro' ? 'bg-red-100 text-red-700' :
                        mensagem.tipo === 'info' ? 'bg-blue-100 text-blue-700' :
                            'bg-green-100 text-green-700'
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
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead className="bg-[#5C4033] text-white">
                            <tr>
                                <th className="p-4 text-sm font-semibold">Nome &amp; Contacto</th>
                                <th className="p-4 text-sm font-semibold text-center">Comissão</th>
                                <th className="p-4 text-sm font-semibold text-center">Vê Finanças?</th>
                                <th className="p-4 text-sm font-semibold text-center">Pode Agendar?</th>
                                <th className="p-4 text-sm font-semibold text-center">Vê Histórico?</th>
                                <th className="p-4 text-sm font-semibold text-right">Ações</th>
                            </tr>
                        </thead>
                        <tbody>
                            {equipa.length === 0 ? (
                                <tr className="border-b border-gray-100">
                                    <td colSpan={6} className="p-8 text-center text-gray-500">
                                        Nenhum profissional ativo na equipa. Clique em &quot;+ Novo Profissional&quot;.
                                    </td>
                                </tr>
                            ) : (
                                equipa.map((prof) => {
                                    const estado = editState[prof.id]
                                    if (!estado) return null

                                    const isLoading = idAcaoLoading === prof.id

                                    return (
                                        <tr key={prof.id} className="border-b border-gray-100 hover:bg-gray-50">
                                            <td className="p-4">
                                                <p className="font-bold text-gray-800">{prof.nome}</p>
                                                <p className="text-xs text-gray-500">{prof.email}</p>
                                                <p className="text-xs text-[#8B5A2B] mt-1">{prof.especialidade ?? '-'}</p>
                                            </td>
                                            <td className="p-4 text-center">
                                                <div className="inline-flex items-center border border-gray-300 rounded overflow-hidden">
                                                    <input
                                                        type="number"
                                                        min={0}
                                                        max={100}
                                                        disabled={isLoading}
                                                        value={estado.comissao}
                                                        onChange={(e) => setValorEdit(prof.id, 'comissao', Number(e.target.value))}
                                                        className="w-14 px-2 py-1 text-center font-bold text-[#8B5A2B] outline-none focus:bg-orange-50 disabled:bg-gray-100 text-sm"
                                                    />
                                                    <span className="bg-gray-100 px-2 py-1 text-gray-500 font-bold border-l border-gray-300 text-sm">%</span>
                                                </div>
                                            </td>
                                            <td className="p-4 text-center">
                                                <input type="checkbox" disabled={isLoading} checked={estado.podeVerComissao} onChange={e => setValorEdit(prof.id, 'podeVerComissao', e.target.checked)} className="w-4 h-4 accent-[#8B5A2B]" />
                                            </td>
                                            <td className="p-4 text-center">
                                                <input type="checkbox" disabled={isLoading} checked={estado.podeAgendar} onChange={e => setValorEdit(prof.id, 'podeAgendar', e.target.checked)} className="w-4 h-4 accent-[#8B5A2B]" />
                                            </td>
                                            <td className="p-4 text-center">
                                                <input type="checkbox" disabled={isLoading} checked={estado.podeVerHistorico} onChange={e => setValorEdit(prof.id, 'podeVerHistorico', e.target.checked)} className="w-4 h-4 accent-[#8B5A2B]" />
                                            </td>
                                            <td className="p-4 text-right">
                                                <div className="flex flex-col gap-2 items-end justify-center">
                                                    <div className="flex gap-2">
                                                        <button
                                                            onClick={() => setModalServicos({
                                                                id: prof.id,
                                                                nome: prof.nome,
                                                                servicosIds: prof.servicos?.map((s: any) => s.id) || []
                                                            })}
                                                            disabled={isLoading}
                                                            className="px-3 py-1 bg-blue-50 text-blue-700 border border-blue-200 rounded text-xs font-bold hover:bg-blue-100 transition-colors"
                                                        >
                                                            Serviços ({prof.servicos?.length || 0})
                                                        </button>
                                                        <button
                                                            onClick={() => handleSalvarPermissoes(prof.id)}
                                                            disabled={isLoading}
                                                            className={`px-3 py-1 rounded text-xs font-bold border transition-colors ${isLoading
                                                                ? 'bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed'
                                                                : 'bg-green-50 text-green-700 border-green-200 hover:bg-green-100'
                                                                }`}
                                                        >
                                                            {isLoading ? '...' : 'Salvar Permissões'}
                                                        </button>
                                                    </div>
                                                    <div className="flex gap-2 mt-1">
                                                        <button
                                                            onClick={() => handleInativar(prof.id, prof.nome)}
                                                            disabled={isLoading}
                                                            className={`px-3 py-1 rounded text-xs font-bold border transition-colors ${isLoading
                                                                ? 'bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed'
                                                                : 'bg-orange-50 text-orange-600 border-orange-200 hover:bg-orange-100'
                                                                }`}
                                                        >
                                                            Desativar
                                                        </button>
                                                        <button
                                                            onClick={() => handleExcluir(prof.id, prof.nome)}
                                                            disabled={isLoading}
                                                            className={`px-3 py-1 rounded text-xs font-bold border transition-colors ${isLoading
                                                                ? 'bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed'
                                                                : 'bg-red-50 text-red-600 border-red-200 hover:bg-red-100'
                                                                }`}
                                                        >
                                                            Excluir
                                                        </button>
                                                    </div>
                                                </div>
                                            </td>
                                        </tr>
                                    )
                                })
                            )}
                        </tbody>
                    </table>
                </div>
            </section>

            {/* Modal de Cadastro de Novo Profissional */}
            {isModalOpen && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
                    <div className="bg-white p-8 rounded-lg shadow-xl w-full max-w-lg border-t-4 border-[#5C4033] max-h-[90vh] overflow-y-auto">
                        <h2 className="text-2xl font-bold text-[#5C4033] mb-6">Cadastrar Profissional</h2>
                        <form onSubmit={handleCadastrarEquipe} className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-1">Nome Completo</label>
                                    <input required disabled={isSubmitting} type="text" value={formData.nome} className="w-full border rounded px-3 py-2 disabled:bg-gray-100 outline-none focus:border-[#8B5A2B]" onChange={campo('nome')} />
                                </div>
                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-1">E-mail Corporativo</label>
                                    <input required disabled={isSubmitting} type="email" value={formData.email} className="w-full border rounded px-3 py-2 disabled:bg-gray-100 outline-none focus:border-[#8B5A2B]" onChange={campo('email')} />
                                </div>
                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-1">CPF</label>
                                    <input required disabled={isSubmitting} type="text" value={formData.cpf} className="w-full border rounded px-3 py-2 disabled:bg-gray-100 outline-none focus:border-[#8B5A2B]" onChange={campo('cpf')} />
                                </div>
                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-1">Especialidade</label>
                                    <input type="text" disabled={isSubmitting} placeholder="Ex: Colorimetria" value={formData.especialidade} className="w-full border rounded px-3 py-2 disabled:bg-gray-100 outline-none focus:border-[#8B5A2B]" onChange={campo('especialidade')} />
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-1">Comissão Padrão (%)</label>
                                <input
                                    required
                                    disabled={isSubmitting}
                                    type="number"
                                    min="0"
                                    max="100"
                                    value={formData.comissao}
                                    className="w-full border rounded px-3 py-2 disabled:bg-gray-100 outline-none focus:border-[#8B5A2B]"
                                    onChange={campo('comissao')}
                                />
                            </div>

                            <div className="mt-4 pt-4 border-t border-gray-100">
                                <label className="block text-sm font-semibold text-gray-700 mb-2">Serviços Habilitados</label>
                                <p className="text-xs text-gray-500 mb-3">Marque os serviços que este profissional realiza.</p>

                                <div className="grid grid-cols-2 gap-3 max-h-40 overflow-y-auto p-3 border border-gray-200 rounded-lg bg-gray-50">
                                    {servicosDisponiveis.length === 0 ? (
                                        <span className="text-sm text-gray-500 col-span-2 text-center py-2">Nenhum serviço cadastrado.</span>
                                    ) : (
                                        servicosDisponiveis.map(servico => (
                                            <label key={servico.id} className="flex items-start space-x-2 text-sm text-gray-700 cursor-pointer hover:bg-white p-1 rounded transition-colors">
                                                <input
                                                    type="checkbox"
                                                    checked={formData.servicosIds.includes(servico.id)}
                                                    onChange={() => handleServicoToggleNovo(servico.id)}
                                                    disabled={isSubmitting}
                                                    className="w-4 h-4 mt-0.5 accent-[#8B5A2B] rounded border-gray-300"
                                                />
                                                <span className="leading-tight">{servico.nome}</span>
                                            </label>
                                        ))
                                    )}
                                </div>
                            </div>

                            <div className="flex justify-end gap-3 mt-6 pt-4">
                                <button
                                    type="button"
                                    disabled={isSubmitting}
                                    onClick={() => { setIsModalOpen(false); setFormData(FORM_INICIAL) }}
                                    className="px-4 py-2 text-gray-600 font-bold hover:bg-gray-100 rounded disabled:opacity-50 transition-colors"
                                >
                                    Cancelar
                                </button>
                                <button
                                    type="submit"
                                    disabled={isSubmitting}
                                    className="px-5 py-2 bg-[#5C4033] text-white font-bold rounded shadow-sm hover:bg-[#3e2b22] disabled:opacity-70 transition-colors"
                                >
                                    {isSubmitting ? 'Salvando...' : 'Salvar Cadastro'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Modal de Edição de Serviços de Profissional Existente */}
            {modalServicos && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
                    <div className="bg-white p-8 rounded-lg shadow-xl w-full max-w-md border-t-4 border-[#8B5A2B]">
                        <h2 className="text-xl font-bold text-[#5C4033] mb-2">Serviços Habilitados</h2>
                        <p className="text-sm text-gray-500 mb-6">Ajustando o portfólio de <strong>{modalServicos.nome}</strong></p>

                        <div className="grid grid-cols-1 gap-3 max-h-64 overflow-y-auto p-3 border border-gray-200 rounded-lg bg-gray-50 mb-6">
                            {servicosDisponiveis.length === 0 ? (
                                <span className="text-sm text-gray-500 text-center py-2">Nenhum serviço cadastrado no salão.</span>
                            ) : (
                                servicosDisponiveis.map(servico => (
                                    <label key={servico.id} className="flex items-center space-x-3 text-sm text-gray-700 cursor-pointer hover:bg-white p-2 rounded transition-colors border border-transparent hover:border-gray-200">
                                        <input
                                            type="checkbox"
                                            checked={modalServicos.servicosIds.includes(servico.id)}
                                            onChange={() => handleServicoToggleEdicao(servico.id)}
                                            disabled={loadingServicos}
                                            className="w-4 h-4 accent-[#8B5A2B] rounded border-gray-300"
                                        />
                                        <span className="font-medium">{servico.nome}</span>
                                    </label>
                                ))
                            )}
                        </div>

                        <div className="flex justify-end gap-3">
                            <button
                                type="button"
                                disabled={loadingServicos}
                                onClick={() => setModalServicos(null)}
                                className="px-4 py-2 text-gray-600 font-bold hover:bg-gray-100 rounded transition-colors"
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={handleSalvarServicosExistente}
                                disabled={loadingServicos}
                                className="px-5 py-2 bg-[#8B5A2B] text-white font-bold rounded shadow-sm hover:bg-[#704620] disabled:opacity-70 transition-colors"
                            >
                                {loadingServicos ? 'Salvando...' : 'Atualizar Serviços'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}