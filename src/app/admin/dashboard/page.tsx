'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import {
    criarFuncionario,
    inativarFuncionario,
    listarEquipaAdmin,
    atualizarFuncionarioCompleto,
    excluirFuncionarioPermanente,
    editarFuncionarioCompleto
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
    podeCancelar: boolean
}

type Mensagem = { texto: string; tipo: 'sucesso' | 'erro' | 'info' | '' }

const FORM_INICIAL: FormData = {
    nome: '', email: '', cpf: '', telefone: '', especialidade: '', comissao: 40, servicosIds: [], podeCancelar: false
}

export default function TorreControleDashboard() {
    const [equipa, setEquipa] = useState<any[]>([])
    const [servicosDisponiveis, setServicosDisponiveis] = useState<any[]>([])
    const [mensagem, setMensagem] = useState<Mensagem>({ texto: '', tipo: '' })
    const [busca, setBusca] = useState('') // <-- Novo Estado da Barra de Busca

    // Estados de Modais
    const [isModalOpen, setIsModalOpen] = useState(false)
    const [modalServicos, setModalServicos] = useState<{ id: string, nome: string, servicosIds: string[] } | null>(null)
    const [modalAcessos, setModalAcessos] = useState<any | null>(null) // <-- Novo Modal de Permissões
    const [credenciaisNovo, setCredenciaisNovo] = useState<{ email: string, senhaTemp: string } | null>(null)

    const [formData, setFormData] = useState<FormData>(FORM_INICIAL)
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [loadingAcao, setLoadingAcao] = useState(false)

    const carregarEquipa = useCallback(async () => {
        const res = await listarEquipaAdmin()
        if (res.sucesso) setEquipa(res.equipa)
    }, [])

    const carregarServicos = useCallback(async () => {
        const res = await listarServicosAdmin()
        if (res.sucesso) setServicosDisponiveis(res.servicos)
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

        const res = await criarFuncionario(formData)
        if (res.sucesso) {
            setMensagem({ texto: 'Profissional cadastrado com sucesso!', tipo: 'sucesso' })
            // Exibe as credenciais temporárias de forma proeminente
            setCredenciaisNovo({ email: formData.email, senhaTemp: 'Mudar@123' })
            setIsModalOpen(false)
            setFormData(FORM_INICIAL)
            void carregarEquipa()
        } else {
            setMensagem({ texto: res.erro || 'Falha ao registrar profissional.', tipo: 'erro' })
        }
        setIsSubmitting(false)
    }

    // --- AÇÃO: SALVAR PERMISSÕES (VIA MODAL) ---
    const handleSalvarPermissoes = async () => {
        if (!modalAcessos) return
        setLoadingAcao(true)
        setMensagem({ texto: 'A salvar permissões...', tipo: 'info' })

        const res = await atualizarFuncionarioCompleto(modalAcessos.id, {
            comissao: Number(modalAcessos.comissao),
            podeVerComissao: modalAcessos.podeVerComissao,
            podeAgendar: modalAcessos.podeAgendar,
            podeVerHistorico: modalAcessos.podeVerHistorico,
            podeCancelar: modalAcessos.podeCancelar
        })

        if (res.sucesso) {
            setMensagem({ texto: 'Configurações atualizadas com sucesso!', tipo: 'sucesso' })
            setModalAcessos(null)
            void carregarEquipa()
        } else {
            setMensagem({ texto: res.erro || 'Erro ao atualizar.', tipo: 'erro' })
        }
        setLoadingAcao(false)
    }

    // --- AÇÃO: SALVAR SERVIÇOS ---
    const handleSalvarServicosExistente = async () => {
        if (!modalServicos) return
        setLoadingAcao(true)

        const res = await editarFuncionarioCompleto(modalServicos.id, {
            servicosIds: modalServicos.servicosIds
        })

        if (res.sucesso) {
            setMensagem({ texto: `Serviços atualizados com sucesso!`, tipo: 'sucesso' })
            setModalServicos(null)
            void carregarEquipa()
        } else {
            setMensagem({ texto: res.erro || 'Erro ao atualizar serviços.', tipo: 'erro' })
        }
        setLoadingAcao(false)
    }

    // --- AÇÕES DE ZONA DE PERIGO ---
    const handleInativar = async (id: string, nome: string) => {
        if (!confirm(`Tem a certeza que deseja desativar o acesso de ${nome}?`)) return
        setLoadingAcao(true)
        const res = await inativarFuncionario(id)
        if (res.sucesso) {
            setMensagem({ texto: 'Profissional inativado.', tipo: 'sucesso' })
            setModalAcessos(null)
            void carregarEquipa()
        } else setMensagem({ texto: res.erro || 'Erro ao inativar.', tipo: 'erro' })
        setLoadingAcao(false)
    }

    const handleExcluir = async (id: string, nome: string) => {
        if (!confirm(`ATENÇÃO: Deseja EXCLUIR DEFINITIVAMENTE a conta de ${nome}?`)) return
        setLoadingAcao(true)
        const res = await excluirFuncionarioPermanente(id)
        if (res.sucesso) {
            setMensagem({ texto: 'Funcionário excluído permanentemente.', tipo: 'sucesso' })
            setModalAcessos(null)
            void carregarEquipa()
        } else setMensagem({ texto: res.erro || 'Erro ao excluir.', tipo: 'erro' })
        setLoadingAcao(false)
    }

    // Filtro da Barra de Busca
    const equipaFiltrada = equipa.filter(p =>
        p.nome.toLowerCase().includes(busca.toLowerCase()) ||
        p.email.toLowerCase().includes(busca.toLowerCase())
    )

    return (
        <div className="min-h-screen bg-[#fdfbf7] p-8 font-sans">
            <header className="mb-6 border-b-2 border-[#5C4033] pb-4 flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold text-[#5C4033]">Torre de Controlo</h1>
                    <p className="text-gray-500 mt-1">Gestão de Equipa e Permissões Administrativas</p>
                </div>
                <button
                    onClick={() => { setCredenciaisNovo(null); setIsModalOpen(true); }}
                    className="bg-[#8B5A2B] text-white px-5 py-2.5 rounded font-bold hover:bg-[#704620] shadow-sm transition-colors"
                >
                    + Novo Profissional
                </button>
            </header>

            {/* Navegação */}
            <nav className="flex flex-wrap gap-3 mb-8">
                <Link href='/admin/dashboard' className="bg-[#5C4033] text-white px-5 py-2 rounded shadow font-bold text-sm">Equipa (Atual)</Link>
                <Link href='/admin/financeiro' className="bg-white text-[#5C4033] border border-[#e5d9c5] px-5 py-2 rounded shadow-sm font-bold text-sm hover:border-[#8B5A2B]">Financeiro</Link>
                <Link href='/admin/estoque' className="bg-white text-[#5C4033] border border-[#e5d9c5] px-5 py-2 rounded shadow-sm font-bold text-sm hover:border-[#8B5A2B]">Estoque de Produtos</Link>
                <Link href='/admin/servicos' className="bg-white text-[#5C4033] border border-[#e5d9c5] px-5 py-2 rounded shadow-sm font-bold text-sm hover:border-[#8B5A2B]">Portfólio / Serviços</Link>
                <Link href='/admin/agendamentos' className="bg-white text-[#5C4033] border border-[#e5d9c5] px-5 py-2 rounded shadow-sm font-bold text-sm hover:border-[#8B5A2B]">Agendamentos Globais</Link>
                <Link href='/admin/clientes' className="bg-white text-[#5C4033] border border-[#e5d9c5] px-5 py-2 rounded shadow-sm font-bold text-sm hover:border-[#8B5A2B]">Base de Clientes</Link>
            </nav>

            {/* Feedbacks */}
            {mensagem.texto && (
                <div className={`mb-6 p-4 rounded font-bold text-center border shadow-sm ${mensagem.tipo === 'erro' ? 'bg-red-50 text-red-700 border-red-200' : mensagem.tipo === 'info' ? 'bg-blue-50 text-blue-700 border-blue-200' : 'bg-green-50 text-green-700 border-green-200'}`}>
                    {mensagem.texto}
                </div>
            )}

            {/* Aviso de Senha Temporária do Novo Cadastro */}
            {credenciaisNovo && (
                <div className="mb-6 p-6 bg-orange-50 border-2 border-orange-200 rounded-xl shadow-sm">
                    <h3 className="text-lg font-black text-orange-800 mb-2">🎉 Profissional criado com sucesso!</h3>
                    <p className="text-sm text-orange-700 mb-4">Envie estas credenciais ao funcionário para que ele possa aceder ao sistema. Ele poderá alterar a senha posteriormente.</p>
                    <div className="flex gap-4">
                        <div className="bg-white px-4 py-2 border border-orange-100 rounded shadow-sm">
                            <span className="text-xs text-gray-500 uppercase font-bold block">Email</span>
                            <span className="font-mono text-[#5C4033] font-bold">{credenciaisNovo.email}</span>
                        </div>
                        <div className="bg-white px-4 py-2 border border-orange-100 rounded shadow-sm">
                            <span className="text-xs text-gray-500 uppercase font-bold block">Senha Temporária</span>
                            <span className="font-mono text-[#5C4033] font-bold">{credenciaisNovo.senhaTemp}</span>
                        </div>
                    </div>
                </div>
            )}

            {/* Barra de Pesquisa */}
            <div className="mb-6 bg-white p-4 rounded-lg shadow-sm border border-[#e5d9c5]">
                <div className="relative">
                    <input
                        type="text"
                        placeholder="Pesquisar funcionário por nome ou email..."
                        value={busca}
                        onChange={(e) => setBusca(e.target.value)}
                        className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded outline-none focus:border-[#8B5A2B] transition-colors"
                    />
                    <svg className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                    </svg>
                </div>
            </div>

            {/* Tabela Simplificada */}
            <section className="bg-white rounded-lg shadow overflow-hidden border border-[#e5d9c5]">
                <div className="bg-gray-50 px-6 py-4 border-b border-gray-200">
                    <h2 className="font-bold text-gray-700">Membros da Equipa</h2>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead className="bg-[#5C4033] text-white">
                            <tr>
                                <th className="p-4 text-sm font-semibold uppercase tracking-wider">Profissional</th>
                                <th className="p-4 text-sm font-semibold uppercase tracking-wider">Especialidade</th>
                                <th className="p-4 text-sm font-semibold uppercase tracking-wider text-center">Status</th>
                                <th className="p-4 text-sm font-semibold uppercase tracking-wider text-right">Ações de Gestão</th>
                            </tr>
                        </thead>
                        <tbody>
                            {equipaFiltrada.length === 0 ? (
                                <tr>
                                    <td colSpan={4} className="p-8 text-center text-gray-500 font-medium">
                                        Nenhum profissional encontrado.
                                    </td>
                                </tr>
                            ) : (
                                equipaFiltrada.map((prof) => (
                                    <tr key={prof.id} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                                        <td className="p-4">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 rounded-full bg-[#8B5A2B]/10 text-[#8B5A2B] flex items-center justify-center font-bold text-lg border border-[#8B5A2B]/20">
                                                    {prof.nome.charAt(0).toUpperCase()}
                                                </div>
                                                <div>
                                                    <p className="font-bold text-gray-800">{prof.nome}</p>
                                                    <p className="text-xs text-gray-500 font-mono">{prof.email}</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="p-4 text-sm font-medium text-gray-600">
                                            {prof.especialidade || <span className="italic opacity-50">Não definida</span>}
                                        </td>
                                        <td className="p-4 text-center">
                                            <span className={`px-2.5 py-1 text-[0.65rem] font-bold rounded uppercase tracking-wider ${prof.ativo ? 'bg-green-100 text-green-700 border border-green-200' : 'bg-red-100 text-red-700 border border-red-200'}`}>
                                                {prof.ativo ? 'Ativo' : 'Inativo'}
                                            </span>
                                        </td>
                                        <td className="p-4 text-right">
                                            <div className="flex justify-end gap-2">
                                                <button
                                                    onClick={() => setModalServicos({ id: prof.id, nome: prof.nome, servicosIds: prof.servicos?.map((s: any) => s.id) || [] })}
                                                    className="px-4 py-2 bg-blue-50 text-blue-700 border border-blue-200 rounded text-xs font-bold hover:bg-blue-100 transition-colors shadow-sm"
                                                >
                                                    Portfólio ({prof.servicos?.length || 0})
                                                </button>
                                                <button
                                                    onClick={() => setModalAcessos({ ...prof })}
                                                    className="px-4 py-2 bg-gray-100 text-gray-700 border border-gray-300 rounded text-xs font-bold hover:bg-gray-200 transition-colors shadow-sm flex items-center gap-2"
                                                >
                                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"></path><circle cx="12" cy="12" r="3"></circle></svg>
                                                    Gerir Acessos
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </section>

            {/* --- MODAL: GERIR ACESSOS E PERMISSÕES (NOVO) --- */}
            {modalAcessos && (
                <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50 backdrop-blur-sm">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md border-t-4 border-[#8B5A2B] overflow-hidden">
                        <div className="px-6 py-5 border-b border-gray-100 flex justify-between items-center">
                            <div>
                                <h2 className="text-xl font-bold text-[#5C4033]">Gerir Perfil</h2>
                                <p className="text-sm text-gray-500">{modalAcessos.nome}</p>
                            </div>
                            <button onClick={() => setModalAcessos(null)} className="text-gray-400 hover:text-gray-600 text-2xl leading-none">&times;</button>
                        </div>

                        <div className="p-6 space-y-6">
                            {/* Comissão */}
                            <div>
                                <label className="block text-xs font-bold text-gray-600 uppercase tracking-wider mb-2">Taxa de Comissão (%)</label>
                                <input
                                    type="number"
                                    min="0" max="100"
                                    value={modalAcessos.comissao}
                                    onChange={(e) => setModalAcessos({ ...modalAcessos, comissao: e.target.value })}
                                    className="w-full border border-gray-300 rounded-lg px-4 py-2.5 outline-none focus:border-[#8B5A2B] text-lg font-bold text-[#8B5A2B]"
                                />
                            </div>

                            {/* Toggles de Permissões */}
                            <div className="space-y-3">
                                <h3 className="text-xs font-bold text-gray-600 uppercase tracking-wider border-b pb-1">Permissões do Sistema</h3>

                                {[
                                    { key: 'podeVerComissao', label: 'Ver Valores Financeiros', desc: 'Pode visualizar o faturamento da comanda.' },
                                    { key: 'podeAgendar', label: 'Criar Agendamentos', desc: 'Permite criar novas reservas na sua agenda.' },
                                    { key: 'podeVerHistorico', label: 'Ver Histórico Financeiro', desc: 'Acesso às comandas já faturadas.' },
                                    { key: 'podeCancelar', label: 'Cancelar Agendamentos', desc: 'Pode excluir clientes já agendados.' }
                                ].map(({ key, label, desc }) => (
                                    <label key={key} className="flex items-center justify-between p-3 bg-gray-50 border border-gray-200 rounded-xl cursor-pointer hover:bg-gray-100 transition-colors">
                                        <div>
                                            <span className="block text-sm font-bold text-gray-800">{label}</span>
                                            <span className="block text-[10px] text-gray-500 mt-0.5">{desc}</span>
                                        </div>
                                        <div className="relative inline-flex items-center">
                                            <input
                                                type="checkbox"
                                                className="sr-only peer"
                                                checked={modalAcessos[key]}
                                                onChange={(e) => setModalAcessos({ ...modalAcessos, [key]: e.target.checked })}
                                            />
                                            <div className="w-11 h-6 bg-gray-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#8B5A2B]"></div>
                                        </div>
                                    </label>
                                ))}
                            </div>
                        </div>

                        {/* Botões de Ação */}
                        <div className="px-6 py-4 bg-gray-50 border-t border-gray-100 flex flex-col gap-3">
                            <button
                                onClick={handleSalvarPermissoes}
                                disabled={loadingAcao}
                                className="w-full py-3 bg-[#5C4033] text-white font-bold rounded-xl hover:bg-[#3e2b22] transition-colors shadow-sm disabled:opacity-70"
                            >
                                {loadingAcao ? 'A Salvar...' : 'Gravar Configurações'}
                            </button>

                            <div className="flex gap-2 mt-2 pt-4 border-t border-gray-200">
                                <button onClick={() => handleInativar(modalAcessos.id, modalAcessos.nome)} className="flex-1 py-2 text-xs font-bold text-orange-600 bg-orange-50 border border-orange-200 rounded-lg hover:bg-orange-100 transition-colors">
                                    Desativar Acesso
                                </button>
                                <button onClick={() => handleExcluir(modalAcessos.id, modalAcessos.nome)} className="flex-1 py-2 text-xs font-bold text-red-600 bg-red-50 border border-red-200 rounded-lg hover:bg-red-100 transition-colors">
                                    Excluir Conta
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal de Cadastro de Novo Profissional (Mantido a lógica, design ajustado) */}
            {isModalOpen && (
                <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50 backdrop-blur-sm">
                    {/* ... (O código do modal de criação de funcionário original mantido aqui) ... */}
                    <div className="bg-white p-8 rounded-2xl shadow-2xl w-full max-w-lg border-t-4 border-[#5C4033] max-h-[90vh] overflow-y-auto">
                        <h2 className="text-2xl font-bold text-[#5C4033] mb-6">Cadastrar Profissional</h2>
                        <form onSubmit={handleCadastrarEquipe} className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-1">Nome Completo *</label>
                                    <input required disabled={isSubmitting} type="text" value={formData.nome} className="w-full border rounded px-3 py-2 outline-none focus:border-[#8B5A2B]" onChange={e => setFormData({ ...formData, nome: e.target.value })} />
                                </div>
                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-1">E-mail de Login *</label>
                                    <input required disabled={isSubmitting} type="email" value={formData.email} className="w-full border rounded px-3 py-2 outline-none focus:border-[#8B5A2B]" onChange={e => setFormData({ ...formData, email: e.target.value })} />
                                </div>
                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-1">CPF</label>
                                    <input disabled={isSubmitting} type="text" value={formData.cpf} className="w-full border rounded px-3 py-2 outline-none focus:border-[#8B5A2B]" onChange={e => setFormData({ ...formData, cpf: e.target.value })} />
                                </div>
                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-1">Especialidade</label>
                                    <input disabled={isSubmitting} type="text" placeholder="Ex: Colorimetria" value={formData.especialidade} className="w-full border rounded px-3 py-2 outline-none focus:border-[#8B5A2B]" onChange={e => setFormData({ ...formData, especialidade: e.target.value })} />
                                </div>
                            </div>
                            <div className="flex justify-end gap-3 mt-6 pt-4 border-t">
                                <button type="button" disabled={isSubmitting} onClick={() => { setIsModalOpen(false); setFormData(FORM_INICIAL) }} className="px-4 py-2 text-gray-600 font-bold hover:bg-gray-100 rounded">Cancelar</button>
                                <button type="submit" disabled={isSubmitting} className="px-5 py-2 bg-[#5C4033] text-white font-bold rounded shadow-sm hover:bg-[#3e2b22] disabled:opacity-70">{isSubmitting ? 'A Registar...' : 'Salvar Cadastro'}</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Modal de Edição de Serviços (Mantido a lógica) */}
            {modalServicos && (
                <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50 backdrop-blur-sm">
                    <div className="bg-white p-8 rounded-2xl shadow-2xl w-full max-w-md border-t-4 border-[#8B5A2B]">
                        <h2 className="text-xl font-bold text-[#5C4033] mb-2">Serviços Habilitados</h2>
                        <p className="text-sm text-gray-500 mb-6">Ajustando o portfólio de <strong>{modalServicos.nome}</strong></p>

                        <div className="grid grid-cols-1 gap-2 max-h-64 overflow-y-auto p-3 border border-gray-200 rounded-lg bg-gray-50 mb-6">
                            {servicosDisponiveis.length === 0 ? (
                                <span className="text-sm text-gray-500 text-center py-2">Nenhum serviço no salão.</span>
                            ) : (
                                servicosDisponiveis.map(servico => (
                                    <label key={servico.id} className="flex items-center space-x-3 text-sm text-gray-700 cursor-pointer hover:bg-white p-2 rounded transition-colors border border-transparent hover:border-gray-200">
                                        <input
                                            type="checkbox"
                                            checked={modalServicos.servicosIds.includes(servico.id)}
                                            onChange={() => setModalServicos({
                                                ...modalServicos,
                                                servicosIds: modalServicos.servicosIds.includes(servico.id) ? modalServicos.servicosIds.filter(id => id !== servico.id) : [...modalServicos.servicosIds, servico.id]
                                            })}
                                            disabled={loadingAcao}
                                            className="w-4 h-4 accent-[#8B5A2B] rounded"
                                        />
                                        <span className="font-medium">{servico.nome}</span>
                                    </label>
                                ))
                            )}
                        </div>

                        <div className="flex justify-end gap-3">
                            <button type="button" disabled={loadingAcao} onClick={() => setModalServicos(null)} className="px-4 py-2 text-gray-600 font-bold hover:bg-gray-100 rounded">Cancelar</button>
                            <button onClick={handleSalvarServicosExistente} disabled={loadingAcao} className="px-5 py-2 bg-[#8B5A2B] text-white font-bold rounded shadow-sm hover:bg-[#704620] disabled:opacity-70">Atualizar Portfólio</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}