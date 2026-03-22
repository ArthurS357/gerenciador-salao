'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { logoutCliente } from '@/app/actions/auth'
import { excluirContaCliente } from '@/app/actions/cliente'

export default function ClienteDashboard({ clienteId, nomeCliente }: { clienteId: string, nomeCliente: string }) {
    const router = useRouter()
    const [isProcessing, setIsProcessing] = useState(false)

    const handleLogout = async () => {
        await logoutCliente()
        router.push('/')
        router.refresh()
    }

    const handleExcluirConta = async () => {
        const confirmacao = window.confirm(
            "ATENÇÃO: Isso apagará permanentemente seu nome e telefone do nosso sistema. Seu histórico de agendamentos será mantido de forma anônima para controle fiscal. Deseja continuar?"
        )

        if (!confirmacao) return

        setIsProcessing(true)
        const res = await excluirContaCliente(clienteId)

        if (res.sucesso) {
            alert("Sua conta foi excluída com sucesso.")
            router.push('/')
            router.refresh()
        } else {
            alert(res.erro)
            setIsProcessing(false)
        }
    }

    return (
        <div className="min-h-screen bg-[#fdfbf7] p-8">
            <div className="max-w-4xl mx-auto bg-white p-8 rounded-lg shadow border border-[#e5d9c5]">
                <div className="flex justify-between items-center border-b pb-6 mb-6">
                    <div>
                        <h1 className="text-3xl font-bold text-[#5C4033]">Olá, {nomeCliente}</h1>
                        <p className="text-gray-500">Bem-vindo ao seu painel de cliente.</p>
                    </div>
                    <button
                        onClick={handleLogout}
                        className="bg-gray-100 text-gray-700 px-4 py-2 rounded font-bold hover:bg-gray-200"
                    >
                        Sair (Logout)
                    </button>
                </div>

                {/* Aqui entrará a lista de agendamentos do cliente no futuro */}
                <div className="mb-12 h-40 bg-gray-50 flex items-center justify-center rounded border border-dashed border-gray-300">
                    <p className="text-gray-500 font-medium">Seus próximos agendamentos aparecerão aqui.</p>
                </div>

                <div className="mt-12 pt-6 border-t border-red-100 bg-red-50 p-6 rounded-lg">
                    <h3 className="text-red-800 font-bold text-lg mb-2">Zona de Perigo</h3>
                    <p className="text-sm text-red-600 mb-4">Ao excluir sua conta, seus dados pessoais serão removidos e você perderá acesso ao sistema.</p>
                    <button
                        onClick={handleExcluirConta}
                        disabled={isProcessing}
                        className="bg-red-600 text-white px-4 py-2 rounded font-bold hover:bg-red-700 disabled:opacity-50"
                    >
                        {isProcessing ? 'Excluindo...' : 'Excluir Meus Dados'}
                    </button>
                </div>
            </div>
        </div>
    )
}