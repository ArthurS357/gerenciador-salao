'use client'

import { useState, useEffect } from 'react';
import { obterResumoFinanceiro, atualizarComissaoFuncionario } from '@/app/actions/financeiro';

export default function PainelFinanceiroPage() {
    const [dados, setDados] = useState<any>(null);
    const [mensagem, setMensagem] = useState({ texto: '', tipo: '' });

    useEffect(() => {
        carregarDados();
    }, []);

    const carregarDados = async () => {
        const res = await obterResumoFinanceiro();
        if (res.sucesso) setDados(res);
    };

    const handleAtualizarRegras = async (id: string, novaComissao: number, podeVer: boolean) => {
        const res = await atualizarComissaoFuncionario(id, novaComissao, podeVer);
        if (res.sucesso) {
            setMensagem({ texto: 'Regras de comissão atualizadas com sucesso.', tipo: 'sucesso' });
            carregarDados();
        } else {
            setMensagem({ texto: res.erro || 'Erro ao atualizar comissão.', tipo: 'erro' });
        }
    };

    if (!dados) return <div className="p-8 text-center text-gray-500">Carregando balanço...</div>;

    return (
        <div className="min-h-screen bg-[#fdfbf7] p-8 font-sans">
            <header className="mb-8 border-b-2 border-[#5C4033] pb-4">
                <h1 className="text-3xl font-bold text-[#5C4033]">Painel Financeiro</h1>
                <p className="text-gray-500 mt-1">Visão global de faturamento, custos e metas de equipe.</p>
            </header>

            {/* Cards de Resumo Objetivo */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-10">
                <div className="bg-white p-6 rounded-lg shadow border-l-4 border-blue-500">
                    <p className="text-sm font-semibold text-gray-500">Faturamento Bruto</p>
                    <p className="text-2xl font-bold text-gray-800">R$ {dados.faturamentoBruto.toFixed(2)}</p>
                </div>
                <div className="bg-white p-6 rounded-lg shadow border-l-4 border-red-500">
                    <p className="text-sm font-semibold text-gray-500">Custo de Produtos</p>
                    <p className="text-2xl font-bold text-red-600">R$ {dados.custoProdutos.toFixed(2)}</p>
                </div>
                <div className="bg-white p-6 rounded-lg shadow border-l-4 border-orange-500">
                    <p className="text-sm font-semibold text-gray-500">Comissões Pagas</p>
                    <p className="text-2xl font-bold text-orange-600">R$ {dados.totalComissoes.toFixed(2)}</p>
                </div>
                <div className="bg-white p-6 rounded-lg shadow border-l-4 border-green-500">
                    <p className="text-sm font-semibold text-gray-500">Lucro Líquido</p>
                    <p className="text-2xl font-bold text-green-600">R$ {dados.lucroLiquido.toFixed(2)}</p>
                </div>
            </div>

            {mensagem.texto && (
                <div className={`mb-6 p-4 rounded text-center font-bold ${mensagem.tipo === 'sucesso' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                    {mensagem.texto}
                </div>
            )}

            {/* Gestão de Equipe e Comissões */}
            <section className="bg-white rounded-lg shadow overflow-hidden border border-[#e5d9c5]">
                <h2 className="bg-[#5C4033] text-white p-4 text-lg font-bold">Gestão de Comissões por Profissional</h2>
                <table className="w-full text-left border-collapse">
                    <thead>
                        <tr className="bg-gray-50 border-b border-gray-200">
                            <th className="p-4 text-sm font-semibold text-gray-700">Profissional</th>
                            <th className="p-4 text-sm font-semibold text-center text-gray-700">Taxa de Comissão (%)</th>
                            <th className="p-4 text-sm font-semibold text-center text-gray-700">Profissional Vê Comissão?</th>
                            <th className="p-4 text-sm font-semibold text-right text-gray-700">Ações</th>
                        </tr>
                    </thead>
                    <tbody>
                        {dados.equipe.map((p: any) => (
                            <tr key={p.id} className="border-b border-gray-100">
                                <td className="p-4 font-bold text-gray-800">{p.nome}</td>
                                <td className="p-4 text-center">
                                    <input
                                        type="number"
                                        defaultValue={p.comissao}
                                        id={`comissao-${p.id}`}
                                        className="w-20 border rounded px-2 py-1 text-center"
                                    />
                                </td>
                                <td className="p-4 text-center">
                                    <input
                                        type="checkbox"
                                        defaultChecked={p.podeVerComissao}
                                        id={`ver-${p.id}`}
                                        className="w-5 h-5 accent-[#8B5A2B]"
                                    />
                                </td>
                                <td className="p-4 text-right">
                                    <button
                                        onClick={() => {
                                            const novaComissao = Number((document.getElementById(`comissao-${p.id}`) as HTMLInputElement).value);
                                            const podeVer = (document.getElementById(`ver-${p.id}`) as HTMLInputElement).checked;
                                            handleAtualizarRegras(p.id, novaComissao, podeVer);
                                        }}
                                        className="bg-[#8B5A2B] text-white px-4 py-2 rounded text-sm font-bold hover:bg-[#704620]"
                                    >
                                        Salvar Regras
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </section>
        </div>
    );
}