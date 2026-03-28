'use client'

import { useState, useTransition, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { adicionarProdutoNaComanda, finalizarComanda } from '@/app/actions/comanda'

// 1. Definição das Interfaces de Tipagem (Substituem o 'any')

type ServicoDaComanda = {
    id: string;
    precoCobrado: number | null; // Pode ser nulo, tratado no código com || 0
    servico: {
        nome: string;
    };
};

type ProdutoDaComanda = {
    id: string;
    precoCobrado: number;
    quantidade: number;
    produto: {
        nome: string;
    };
};

type AgendamentoComanda = {
    id: string;
    concluido: boolean;
    cliente: {
        nome: string;
        telefone: string;
    };
    servicos: ServicoDaComanda[];
    produtos: ProdutoDaComanda[];
};

type PainelComandaProps = {
    agendamento: AgendamentoComanda;
    produtosDisponiveis: Array<{ id: string, nome: string, precoVenda: number, estoque: number }>;
    podeVerFinancas: boolean;
}

export default function PainelComanda({ agendamento, produtosDisponiveis, podeVerFinancas }: PainelComandaProps) {
    const router = useRouter()

    const [produtoIdSelecionado, setProdutoIdSelecionado] = useState('')
    const [quantidade, setQuantidade] = useState(1)

    const [isAdicionando, setIsAdicionando] = useState(false)
    const [isFinalizando, setIsFinalizando] = useState(false)
    const [erro, setErro] = useState('')
    const [confirmModalOpen, setConfirmModalOpen] = useState(false)
    const [isPending, startTransition] = useTransition()

    // UX: Trava o scroll da página quando o modal for aberto
    useEffect(() => {
        if (confirmModalOpen) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = 'unset';
        }
        return () => { document.body.style.overflow = 'unset'; }
    }, [confirmModalOpen])

    // Cálculos Financeiros Dinâmicos (Com tipos explícitos nos parâmetros do reduce)
    const totalServicos = agendamento.servicos.reduce((acc: number, item: ServicoDaComanda) => acc + (item.precoCobrado || 0), 0)
    const totalProdutos = agendamento.produtos.reduce((acc: number, item: ProdutoDaComanda) => acc + (item.precoCobrado * item.quantidade), 0)
    const valorTotalRevisado = totalServicos + totalProdutos

    const handleAdicionarProduto = async () => {
        if (!produtoIdSelecionado || quantidade < 1) return

        setIsAdicionando(true)
        setErro('')

        const res = await adicionarProdutoNaComanda(agendamento.id, produtoIdSelecionado, quantidade)

        if (res.sucesso) {
            setProdutoIdSelecionado('')
            setQuantidade(1)
            startTransition(() => {
                router.refresh()
            })
        } else {
            setErro(res.erro || 'Erro ao adicionar produto.')
        }

        setIsAdicionando(false)
    }

    const handleFinalizar = async () => {
        setIsFinalizando(true)
        setErro('')

        const res = await finalizarComanda(agendamento.id, 3, 0)
        if (res.sucesso) {
            startTransition(() => {
                router.push('/profissional/agenda')
                router.refresh()
            })
        } else {
            setErro(res.erro || 'Erro ao faturar comanda.')
            setIsFinalizando(false)
            setConfirmModalOpen(false)
        }
    }

    return (
        <div className="bg-white rounded-2xl shadow-xl border border-[#e5d9c5] overflow-hidden">
            {/* Modal Customizado - Mudado para FIXED */}
            {confirmModalOpen && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-9999 p-4 transition-opacity">
                    <div 
                        className="bg-white p-8 rounded-2xl shadow-2xl max-w-sm w-full text-center border border-[#e5d9c5] transform scale-100 transition-transform"
                        role="dialog"
                        aria-modal="true"
                    >
                        <h4 className="text-2xl font-serif text-marrom-medio mb-3">Faturar Comanda?</h4>
                        <p className="text-sm text-gray-600 mb-8 leading-relaxed">
                            {podeVerFinancas 
                                ? `Confirmar faturamento de R$ ${valorTotalRevisado.toFixed(2)}? Esta ação não pode ser desfeita.`
                                : `Confirmar encerramento e envio ao caixa? Após isso, não será possível alterar os itens.`}
                        </p>
                        <div className="flex gap-4 justify-center">
                            <button 
                                onClick={() => setConfirmModalOpen(false)} 
                                disabled={isFinalizando || isPending}
                                className="flex-1 py-3 bg-gray-100 rounded-lg font-bold text-gray-700 hover:bg-gray-200 transition-colors text-sm uppercase tracking-wider disabled:opacity-50"
                            >
                                Cancelar
                            </button>
                            <button 
                                onClick={handleFinalizar} 
                                disabled={isFinalizando || isPending}
                                className="flex-1 py-3 bg-marrom-claro text-white rounded-lg font-bold hover:bg-[#704620] transition-colors text-sm uppercase tracking-wider shadow-md disabled:opacity-50 flex justify-center items-center"
                            >
                                {(isFinalizando || isPending) ? (
                                    <span className="animate-pulse">Processando...</span>
                                ) : 'Confirmar'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
            {/* Cabeçalho da Comanda */}
            <div className="bg-marrom-medio p-8 text-white flex justify-between items-center">
                <div>
                    <h2 className="text-sm font-semibold tracking-[0.2em] uppercase text-caramelo mb-2">Comanda Eletrônica</h2>
                    <h1 className="text-3xl font-serif">{agendamento.cliente.nome}</h1>
                    <p className="text-sm opacity-80 mt-1">{agendamento.cliente.telefone}</p>
                </div>
                <div className="text-right">
                    <p className="text-xs uppercase tracking-wider opacity-70 mb-1">Status</p>
                    {agendamento.concluido ? (
                        <span className="px-3 py-1 bg-green-500/20 border border-green-400 text-green-300 font-bold rounded">FATURADO</span>
                    ) : (
                        <span className="px-3 py-1 bg-orange-500/20 border border-orange-400 text-orange-300 font-bold rounded">EM ABERTO</span>
                    )}
                </div>
            </div>

            <div className="p-8 space-y-8">
                {erro && (
                    <div className="p-4 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm font-bold">
                        {erro}
                    </div>
                )}

                {/* Lista de Serviços */}
                <section>
                    <h3 className="text-lg font-bold text-marrom-medio mb-4 flex items-center gap-2">
                        <div className="w-1.5 h-5 bg-caramelo rounded-full"></div>
                        Serviços Realizados
                    </h3>
                    <div className="space-y-3">
                        {/* Removido 'any', usando o tipo da interface */}
                        {agendamento.servicos.map((item: ServicoDaComanda) => (
                            <div key={item.id} className="flex justify-between items-center p-4 bg-gray-50 rounded-lg border border-gray-100">
                                <span className="font-medium text-gray-700">{item.servico.nome}</span>
                                <span className="font-bold text-marrom-medio">
                                    {podeVerFinancas ? `R$ ${item.precoCobrado?.toFixed(2)}` : 'R$ ***'}
                                </span>
                            </div>
                        ))}
                    </div>
                </section>

                {/* Lista de Produtos */}
                <section>
                    <h3 className="text-lg font-bold text-marrom-medio mb-4 flex items-center gap-2">
                        <div className="w-1.5 h-5 bg-caramelo rounded-full"></div>
                        Produtos Adicionados
                    </h3>
                    {agendamento.produtos.length === 0 ? (
                        <p className="text-sm text-gray-500 italic">Nenhum produto adicionado nesta comanda.</p>
                    ) : (
                        <div className="space-y-3">
                            {/* Removido 'any', usando o tipo da interface */}
                            {agendamento.produtos.map((item: ProdutoDaComanda) => (
                                <div key={item.id} className="flex justify-between items-center p-4 bg-orange-50/50 rounded-lg border border-orange-100">
                                    <div>
                                        <span className="font-medium text-gray-800">{item.produto.nome}</span>
                                        <span className="text-xs text-gray-500 ml-2">x{item.quantidade}</span>
                                    </div>
                                    <span className="font-bold text-marrom-medio">
                                        {podeVerFinancas ? `R$ ${(item.precoCobrado * item.quantidade).toFixed(2)}` : 'R$ ***'}
                                    </span>
                                </div>
                            ))}
                        </div>
                    )}

                    {/* Formulário para adicionar novos produtos */}
                    {!agendamento.concluido && (
                        <div className="mt-4 p-4 border border-[#e5d9c5] rounded-xl bg-white flex flex-col md:flex-row gap-3">
                            <select
                                value={produtoIdSelecionado}
                                onChange={(e) => setProdutoIdSelecionado(e.target.value)}
                                className="flex-1 p-2.5 border border-gray-300 rounded text-sm outline-none focus:border-marrom-claro"
                            >
                                <option value="">Adicionar produto da vitrine...</option>
                                {produtosDisponiveis.map(p => (
                                    <option key={p.id} value={p.id}>
                                        {p.nome} {podeVerFinancas ? `- R$ ${p.precoVenda.toFixed(2)} ` : ''}({p.estoque} em estoque)
                                    </option>
                                ))}
                            </select>
                            <input
                                type="number"
                                min="1"
                                value={quantidade}
                                onChange={(e) => setQuantidade(Number(e.target.value))}
                                className="w-20 p-2.5 border border-gray-300 rounded text-sm text-center outline-none focus:border-marrom-claro"
                            />
                            <button
                                onClick={handleAdicionarProduto}
                                disabled={isAdicionando || !produtoIdSelecionado}
                                className="px-5 py-2.5 bg-gray-100 text-marrom-medio font-bold rounded hover:bg-[#e5d9c5] transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm uppercase tracking-wider"
                            >
                                {isAdicionando ? '...' : 'Incluir'}
                            </button>
                        </div>
                    )}
                </section>

                {/* Rodapé Financeiro e Ações */}
                <div className="mt-12 pt-8 border-t-2 border-dashed border-[#e5d9c5]">
                    {podeVerFinancas ? (
                        <div className="flex flex-col items-end gap-1 mb-8">
                            <p className="text-sm text-gray-500">Subtotal Serviços: R$ {totalServicos.toFixed(2)}</p>
                            <p className="text-sm text-gray-500">Subtotal Produtos: R$ {totalProdutos.toFixed(2)}</p>
                            <h2 className="text-3xl font-serif text-marrom-medio mt-2">
                                Total: R$ {valorTotalRevisado.toFixed(2)}
                            </h2>
                        </div>
                    ) : (
                        <div className="flex flex-col items-end gap-1 mb-8">
                            <p className="text-sm text-gray-500 italic">Os valores estão ocultados pelas configurações de privacidade.</p>
                        </div>
                    )}

                    {!agendamento.concluido && (
                        <button
                            onClick={() => setConfirmModalOpen(true)}
                            disabled={isFinalizando}
                            className="w-full py-4 bg-marrom-claro text-white font-bold rounded-xl text-lg uppercase tracking-widest hover:bg-[#704620] transition-colors shadow-lg disabled:opacity-70 disabled:cursor-not-allowed"
                        >
                            {isFinalizando ? 'A Processar...' : 'Concluir Atendimento'}
                        </button>
                    )}
                </div>
            </div>
        </div>
    )
}