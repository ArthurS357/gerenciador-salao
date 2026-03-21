'use client'

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { listarProdutosDisponiveis, adicionarProdutoNaComanda, finalizarComanda } from '@/app/actions/comanda';

interface PainelComandaProps {
    agendamentoId: string;
    clienteNome: string;
    servicoInicial: { id: string; nome: string; preco: number };
}

export default function PainelComanda({ agendamentoId, clienteNome, servicoInicial }: PainelComandaProps) {
    const router = useRouter();
    const [total, setTotal] = useState(servicoInicial.preco);
    const [produtos, setProdutos] = useState<any[]>([]);
    const [produtoSelecionado, setProdutoSelecionado] = useState('');
    const [qtdProduto, setQtdProduto] = useState(1);
    const [loadingAcao, setLoadingAcao] = useState(false);

    useEffect(() => {
        async function carregar() {
            const lista = await listarProdutosDisponiveis();
            setProdutos(lista);
        }
        carregar();
    }, []);

    const handleAdicionarProduto = async () => {
        if (!produtoSelecionado) return;
        setLoadingAcao(true);

        const res = await adicionarProdutoNaComanda(agendamentoId, produtoSelecionado, qtdProduto);

        if (res.sucesso) {
            const prod = produtos.find(p => p.id === produtoSelecionado);
            setTotal(prev => prev + (prod.precoVenda * qtdProduto));
            alert('Produto adicionado e debitado do estoque!');
        } else {
            alert(res.erro);
        }
        setLoadingAcao(false);
    };

    const handleConcluirAtendimento = async () => {
        const confirmar = confirm(`Finalizar comanda de R$ ${total.toFixed(2)} e enviar para o caixa?`);
        if (!confirmar) return;

        setLoadingAcao(true);
        const res = await finalizarComanda(agendamentoId);

        if (res.sucesso) {
            alert('Atendimento finalizado! Os valores já estão no caixa.');
            router.push('/profissional/agenda');
        } else {
            alert(res.erro);
            setLoadingAcao(false);
        }
    };

    return (
        <div className="bg-white rounded-lg shadow-xl border-t-8 border-[#5C4033] p-8">
            <div className="flex justify-between items-start mb-8 border-b border-gray-100 pb-4">
                <div>
                    <h2 className="text-2xl font-bold text-gray-800">Comanda Aberta</h2>
                    <p className="text-gray-500 font-medium">Cliente: {clienteNome}</p>
                </div>
                <div className="text-right">
                    <p className="text-sm text-gray-500 uppercase tracking-wide">Total Corrente</p>
                    <p className="text-3xl font-bold text-[#8B5A2B]">R$ {total.toFixed(2)}</p>
                </div>
            </div>

            <div className="space-y-6">
                {/* Lançamento de Produtos Consumidos */}
                <div className="bg-[#fdfbf7] p-6 rounded-lg border border-[#e5d9c5]">
                    <h3 className="text-lg font-bold text-[#5C4033] mb-4">Lançar Produtos / Adicionais</h3>

                    <div className="flex gap-4 items-end">
                        <div className="flex-1">
                            <label className="block text-sm font-semibold text-gray-700 mb-1">Produto</label>
                            <select
                                className="w-full border border-gray-300 rounded px-3 py-2 outline-none"
                                value={produtoSelecionado}
                                onChange={e => setProdutoSelecionado(e.target.value)}
                            >
                                <option value="">Selecione um produto...</option>
                                {produtos.map(p => (
                                    <option key={p.id} value={p.id}>
                                        {p.nome} - R$ {p.precoVenda.toFixed(2)} (Estoque: {p.estoque})
                                    </option>
                                ))}
                            </select>
                        </div>
                        <div className="w-24">
                            <label className="block text-sm font-semibold text-gray-700 mb-1">Qtd</label>
                            <input
                                type="number" min="1" value={qtdProduto} onChange={e => setQtdProduto(Number(e.target.value))}
                                className="w-full border border-gray-300 rounded px-3 py-2 text-center outline-none"
                            />
                        </div>
                        <button
                            onClick={handleAdicionarProduto}
                            disabled={loadingAcao || !produtoSelecionado}
                            className="bg-[#5C4033] text-white px-6 py-2 rounded font-bold hover:bg-[#3e2b22] disabled:opacity-50 h-10"
                        >
                            Adicionar
                        </button>
                    </div>
                </div>

                <button
                    onClick={handleConcluirAtendimento}
                    className="w-full bg-green-600 text-white text-lg font-bold py-4 rounded hover:bg-green-700 transition-colors shadow-lg mt-8"
                >
                    Finalizar Atendimento e Enviar para o Caixa
                </button>
            </div>
        </div>
    );
}