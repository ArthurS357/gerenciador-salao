'use client'

import { useState } from 'react';

// Passo 2: Tipagem estrita de dados
interface Servico {
    id: string;
    nome: string;
    preco: number;
}

interface ComandaProps {
    agendamentoId: string;
    clienteNome: string;
    servicoInicial: Servico;
}

export default function PainelComanda({ agendamentoId, clienteNome, servicoInicial }: ComandaProps) {
    // Passo 3: Estados de serviços e jornada do atendimento
    const [servicos, setServicos] = useState<Servico[]>([servicoInicial]);
    const [status, setStatus] = useState<'Agendado' | 'Em Atendimento' | 'Concluído'>('Agendado');

    // Passo 4: Função para cross-sell e cálculo em tempo real
    const adicionarServicoExtra = (novoServico: Servico) => {
        setServicos((prevServicos) => [...prevServicos, novoServico]);
    };

    const totalComanda = servicos.reduce((acc, servico) => acc + servico.preco, 0);

    const finalizarAtendimento = async () => {
        setStatus('Concluído');
        // Neste ponto, os dados são enviados para a Server Action de Fechamento (Módulo V)
        console.log(`Comanda ${agendamentoId} enviada ao caixa. Total Bruto: R$ ${totalComanda}`);
    };

    // Passo 5: Estrutura Visual Restrita (Marrom e Branco)
    return (
        <div className="p-6 bg-white rounded-lg shadow-md border border-[#5C4033] max-w-md mx-auto">
            <h2 className="text-2xl font-bold text-[#5C4033] mb-4">Comanda Digital - {clienteNome}</h2>

            {/* Rastreador de Status */}
            <div className="mb-6 flex gap-2">
                <span className={`px-3 py-1 rounded text-sm ${status === 'Agendado' ? 'bg-[#5C4033] text-white font-bold' : 'bg-gray-100 text-gray-500'}`}>Agendado</span>
                <span className={`px-3 py-1 rounded text-sm ${status === 'Em Atendimento' ? 'bg-[#8B5A2B] text-white font-bold' : 'bg-gray-100 text-gray-500'}`}>Atendimento</span>
                <span className={`px-3 py-1 rounded text-sm ${status === 'Concluído' ? 'bg-[#3e2b22] text-white font-bold' : 'bg-gray-100 text-gray-500'}`}>Concluído</span>
            </div>

            {/* Lista Dinâmica de Serviços */}
            <ul className="mb-6 space-y-3">
                {servicos.map((s, index) => (
                    <li key={index} className="flex justify-between border-b border-gray-200 pb-2 text-gray-800">
                        <span>{s.nome}</span>
                        <span className="font-semibold text-[#5C4033]">R$ {s.preco.toFixed(2)}</span>
                    </li>
                ))}
            </ul>

            {/* Totalizador Financeiro */}
            <div className="flex justify-between items-center mb-6 bg-[#fdfbf7] p-4 rounded text-[#5C4033] border border-[#e5d9c5]">
                <span className="font-bold text-lg">Total Parcial:</span>
                <span className="font-bold text-xl">R$ {totalComanda.toFixed(2)}</span>
            </div>

            {/* Ações da Cadeira */}
            <div className="flex flex-col gap-3">
                <button
                    onClick={() => adicionarServicoExtra({ id: 'extra1', nome: 'Design de Sobrancelhas', preco: 60.00 })}
                    disabled={status === 'Concluído'}
                    className="w-full bg-white border-2 border-[#5C4033] text-[#5C4033] py-2 rounded font-semibold hover:bg-[#fdfbf7] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    + Add Serviço (Cross-sell)
                </button>

                {status === 'Agendado' && (
                    <button
                        onClick={() => setStatus('Em Atendimento')}
                        className="w-full bg-[#8B5A2B] text-white py-2 rounded font-semibold hover:bg-[#704620] transition-colors"
                    >
                        Iniciar Atendimento
                    </button>
                )}

                {status === 'Em Atendimento' && (
                    <button
                        onClick={finalizarAtendimento}
                        className="w-full bg-[#5C4033] text-white py-2 rounded font-semibold hover:bg-[#3e2b22] transition-colors"
                    >
                        Finalizar e Enviar ao Caixa
                    </button>
                )}
            </div>
        </div>
    );
}