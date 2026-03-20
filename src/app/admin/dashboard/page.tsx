'use client'

import { useState, useEffect } from 'react';
import {
    gerarAdminInicial,
    criarFuncionario,
    inativarFuncionario
} from '@/app/actions/admin';

export default function TorreControleDashboard() {
    const [mensagem, setMensagem] = useState({ texto: '', tipo: '' });
    const [isModalOpen, setIsModalOpen] = useState(false);

    // Estado do formulário de novo funcionário
    const [formData, setFormData] = useState({
        nome: '', email: '', cpf: '', telefone: '', especialidade: '', comissao: 40
    });

    // Função para injetar o 1º Admin no banco zerado
    const handleGerarAdmin = async () => {
        const res = await gerarAdminInicial();
        setMensagem({
            texto: res.mensagem || res.erro || '',
            tipo: res.sucesso ? 'sucesso' : 'erro'
        });
    };

    // Função para salvar novo profissional
    const handleCadastrarEquipe = async (e: React.FormEvent) => {
        e.preventDefault();
        setMensagem({ texto: 'Cadastrando...', tipo: 'info' });

        const res = await criarFuncionario(formData);

        if (res.sucesso) {
            setMensagem({ texto: 'Profissional cadastrado! Senha temporária: Mudar@123', tipo: 'sucesso' });
            setIsModalOpen(false);
            // Em um app real, aqui você recarregaria a lista de funcionários do banco
        } else {
            setMensagem({ texto: res.erro || 'Erro ao cadastrar.', tipo: 'erro' });
        }
    };

    return (
        <div className="min-h-screen bg-[#fdfbf7] p-8 font-sans">
            <header className="mb-8 border-b-2 border-[#5C4033] pb-4 flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold text-[#5C4033]">Torre de Controle</h1>
                    <p className="text-gray-500 mt-1">Gestão de Equipe e Financeiro</p>
                </div>

                <div className="flex gap-4">
                    {/* Botão Invisível/Debug para gerar o primeiro acesso (Remover em produção) */}
                    <button
                        onClick={handleGerarAdmin}
                        className="bg-gray-200 text-gray-600 px-4 py-2 rounded text-xs hover:bg-gray-300"
                    >
                        ⚙️ Gerar Admin Master
                    </button>

                    <button
                        onClick={() => setIsModalOpen(true)}
                        className="bg-[#8B5A2B] text-white px-4 py-2 rounded font-bold hover:bg-[#704620]"
                    >
                        + Novo Profissional
                    </button>
                </div>
            </header>

            {mensagem.texto && (
                <div className={`mb-6 p-4 rounded font-bold text-center ${mensagem.tipo === 'erro' ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
                    {mensagem.texto}
                </div>
            )}

            {/* Tabela de Exemplo (Em breve conectada ao banco) */}
            <section className="bg-white rounded-lg shadow overflow-hidden border border-[#e5d9c5]">
                <table className="w-full text-left border-collapse">
                    <thead className="bg-[#5C4033] text-white">
                        <tr>
                            <th className="p-4 text-sm font-semibold">Nome</th>
                            <th className="p-4 text-sm font-semibold">Especialidade</th>
                            <th className="p-4 text-sm font-semibold">Comissão</th>
                            <th className="p-4 text-sm font-semibold text-right">Ações</th>
                        </tr>
                    </thead>
                    <tbody>
                        {/* Lista vazia simulada */}
                        <tr className="border-b border-gray-100">
                            <td colSpan={4} className="p-8 text-center text-gray-500">
                                Nenhum profissional cadastrado. Adicione um novo para compor a equipe.
                            </td>
                        </tr>
                    </tbody>
                </table>
            </section>

            {/* Modal de Cadastro de Funcionário */}
            {isModalOpen && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
                    <div className="bg-white p-8 rounded-lg shadow-xl w-full max-w-lg border-t-4 border-[#5C4033]">
                        <h2 className="text-2xl font-bold text-[#5C4033] mb-6">Cadastrar Profissional</h2>

                        <form onSubmit={handleCadastrarEquipe} className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-1">Nome Completo</label>
                                    <input required type="text" className="w-full border rounded px-3 py-2"
                                        onChange={e => setFormData({ ...formData, nome: e.target.value })} />
                                </div>
                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-1">E-mail Corporativo</label>
                                    <input required type="email" className="w-full border rounded px-3 py-2"
                                        onChange={e => setFormData({ ...formData, email: e.target.value })} />
                                </div>
                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-1">CPF</label>
                                    <input required type="text" className="w-full border rounded px-3 py-2"
                                        onChange={e => setFormData({ ...formData, cpf: e.target.value })} />
                                </div>
                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-1">Especialidade</label>
                                    <input type="text" placeholder="Ex: Colorimetria" className="w-full border rounded px-3 py-2"
                                        onChange={e => setFormData({ ...formData, especialidade: e.target.value })} />
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-1">Comissão Padrão (%)</label>
                                <input required type="number" min="0" max="100" className="w-full border rounded px-3 py-2"
                                    value={formData.comissao} onChange={e => setFormData({ ...formData, comissao: Number(e.target.value) })} />
                            </div>

                            <div className="flex justify-end gap-3 mt-6">
                                <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-gray-600 font-bold hover:bg-gray-100 rounded">
                                    Cancelar
                                </button>
                                <button type="submit" className="px-4 py-2 bg-[#5C4033] text-white font-bold rounded hover:bg-[#3e2b22]">
                                    Salvar Cadastro
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}