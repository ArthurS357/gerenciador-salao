'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { finalizarComanda } from '@/app/actions/comanda'

interface BotaoFinalizarComandaProps {
    agendamentoId: string;
    valorBruto: number;
}

export default function BotaoFinalizarComanda({ agendamentoId, valorBruto }: BotaoFinalizarComandaProps) {
    // Passo 2: Inicializa o estado de segurança para evitar múltiplos cliques
    const [carregando, setCarregando] = useState(false)
    const router = useRouter()

    // Passo 4: Função que processa o clique
    const handleFinalizar = async () => {
        // Confirmação de segurança financeira
        const confirmacao = window.confirm(
            `Deseja faturar esta comanda no valor total de R$ ${valorBruto.toFixed(2)}?\n\nEsta ação descontará os produtos do estoque e calculará as comissões automaticamente.`
        )

        if (!confirmacao) return;

        setCarregando(true)

        try {
            // Passo 3: Executa a ação do backend
            const res = await finalizarComanda(agendamentoId)

            if (res.sucesso) {
                alert('Comanda faturada com sucesso! O lucro líquido já está no sistema.')
                // Redireciona o profissional de volta para a sua agenda após o pagamento
                router.push('/profissional/agenda')
            } else {
                alert(`Erro: ${res.erro}`)
                setCarregando(false)
            }
        } catch {
            alert('Ocorreu um erro técnico ao processar a fatura.')
            setCarregando(false)
        }
    }

    return (
        <button
            onClick={handleFinalizar}
            disabled={carregando}
            className="w-full md:w-auto bg-green-600 text-white px-6 py-3 rounded-lg font-bold hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-sm flex items-center justify-center gap-2"
        >
            {carregando ? (
                <>
                    <svg className="animate-spin h-5 w-5 text-white" viewBox="0 0 24 24" fill="none">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    A Processar Financeiro...
                </>
            ) : (
                'Concluir Agendamento e Faturar'
            )}
        </button>
    )
}