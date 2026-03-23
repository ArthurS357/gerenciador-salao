'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { cancelarAgendamentoPendente } from '@/app/actions/agendamento'

export default function BotaoCancelarAgendamento({ id }: { id: string }) {
    const [loading, setLoading] = useState(false)
    const router = useRouter()

    const handleCancelar = async () => {
        const confirmar = window.confirm("Tem a certeza que deseja cancelar esta reserva? Esta ação não pode ser desfeita.")
        if (!confirmar) return

        setLoading(true)
        const res = await cancelarAgendamentoPendente(id)

        if (res.sucesso) {
            alert("Reserva cancelada com sucesso.")
            router.refresh() // Recarrega a página para atualizar a lista
        } else {
            alert(res.erro || "Falha ao cancelar a reserva.")
            setLoading(false)
        }
    }

    return (
        <button
            onClick={handleCancelar}
            disabled={loading}
            className="block w-full text-center px-4 py-2 mt-2 bg-red-50 text-red-600 font-bold rounded-lg border border-red-200 hover:bg-red-100 transition-colors shadow-sm disabled:opacity-50 text-sm"
        >
            {loading ? "A processar..." : "Cancelar Reserva"}
        </button>
    )
}