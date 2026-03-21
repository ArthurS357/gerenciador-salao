'use client'

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
    criarFuncionario,
    inativarFuncionario,
    listarEquipaAdmin
} from '@/app/actions/admin';

export default function TorreControleDashboard() {
    const [equipa, setEquipa] = useState<any[]>([]);
    const [mensagem, setMensagem] = useState({ texto: '', tipo: '' });
    const [isModalOpen, setIsModalOpen] = useState(false);

    const [formData, setFormData] = useState({
        nome: '', email: '', cpf: '', telefone: '', especialidade: '', comissao: 40
    });

    useEffect(() => {
        carregarEquipa();
    }, []);

    const carregarEquipa = async () => {
        const res = await listarEquipaAdmin();
        if (res.sucesso) setEquipa(res.equipa);
    };

    const handleCadastrarEquipe = async (e: React.FormEvent) => {
        e.preventDefault();
        setMensagem({ texto: 'A cadastrar...', tipo: 'info' });

        const res = await criarFuncionario(formData);

        if (res.sucesso) {
            setMensagem({ texto: 'Profissional cadastrado! Senha temporária: Mudar@123', tipo: 'sucesso' });
            setIsModalOpen(false);
            carregarEquipa();
        } else {
            setMensagem({ texto: res.erro || 'Erro ao cadastrar.', tipo: 'erro' });
        }
    };

    const handleInativar = async (id: string, nome: string) => {
        const confirmar = confirm(`Tem a certeza que deseja desativar o acesso de ${nome}? O histórico financeiro será mantido.`);
        if (!confirmar) return;

        const res = await inativarFuncionario(id);
        if (res.sucesso) {
            setMensagem({ texto: 'Profissional inativado com sucesso.', tipo: 'sucesso' });
            carregarEquipa();
        } else {
            setMensagem({ texto: res.erro || 'Erro ao inativar.', tipo: 'erro' });
        }
    };

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

            {/* Menu de Navegação Global do Admin */}
            <nav className="flex flex-wrap gap-3 mb-8">
                <Link href="/admin/dashboard" className="bg-[#5C4033] text-white px-5 py-2 rounded shadow font-bold text-sm">
                    Equipa (Atual)
                </Link>
                <Link href="/admin/financeiro" className="bg-white text-[#5C4033] border border-[#e5d9c5] px-5 py-2 rounded shadow-sm font-bold text-sm hover:border-[#8B5A2B] hover:bg-orange-50 transition-colors">
                    Financeiro
                </Link>
                <Link href="/admin/estoque" className="bg-white text-[#5C4033] border border-[#e5d9c5] px-5 py-2 rounded shadow-sm font-bold text-sm hover:border-[#8B5A2B] hover:bg-orange-50 transition-colors">
                    Estoque de Produtos
                </Link>
                <Link href="/admin/servicos" className="bg-white text-[#5C4033] border border-[#e5d9c5] px-5 py-2 rounded shadow-sm font-bold text-sm hover:border-[#8B5A2B] hover:bg-orange-50 transition-colors">
                    Portfólio / Serviços
                </Link>
                <Link href="/admin/agendamentos" className="bg-white text-[#5C4033] border border-[#e5d9c5] px-5 py-2 rounded shadow-sm font-bold text-sm hover:border-[#8B5A2B] hover:bg-orange-50 transition-colors">
                    Agendamentos Globais
                </Link>
                <Link href="/admin/clientes" className="bg-white text-[#5C4033] border border-[#e5d9c5] px-5 py-2 rounded shadow-sm font-bold text-sm hover:border-[#8B5A2B] hover:bg-orange-50 transition-colors">
                    Base de Clientes
                </Link>
            </nav>

            {mensagem.texto && (
                <div className={`mb-6 p-4 rounded font-bold text-center ${mensagem.tipo === 'erro' ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
                    {mensagem.texto}
                </div>
            )}

            {/* Tabela de Equipa Dinâmica */}
            <section className="bg-white rounded-lg shadow overflow-hidden border border-[#e5d9c5]">
                <div className="bg-gray-50 px-4 py-3 border-b border-gray-200">
                    <h2 className="font-bold text-gray-700">Gestão de Equipa e Perfis</h2>
                </div>
                <table className="w-full text-left border-collapse">
                    <thead className="bg-[#5C4033] text-white">
                        <tr>
                            <th className="p-4 text-sm font-semibold">Nome & Contacto</th>
                            <th className="p-4 text-sm font-semibold">Especialidade</th>
                            <th className="p-4 text-sm font-semibold text-center">Comissão</th>
                            <th className="p-4 text-sm font-semibold text-right">Ações</th>
                        </tr>
                    </thead>
                    <tbody>
                        {equipa.length === 0 ? (
                            <tr className="border-b border-gray-100">
                                <td colSpan={4} className="p-8 text-center text-gray-500">
                                    Nenhum profissional ativo na equipa. Clique em "+ Novo Profissional".
                                </td>
                            </tr>
                        ) : (
                            equipa.map(prof => (
                                <tr key={prof.id} className="border-b border-gray-100 hover:bg-gray-50">
                                    <td className="p-4">
                                        <p className="font-bold text-gray-800">{prof.nome}</p>
                                        <p className="text-xs text-gray-500">{prof.email}</p>
                                    </td>
                                    <td className="p-4 text-gray-600">{prof.especialidade || '-'}</td>
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