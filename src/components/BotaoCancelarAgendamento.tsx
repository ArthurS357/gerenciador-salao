'use client'

import { useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { cancelarAgendamentoPendente } from '@/app/actions/agendamento'

export default function BotaoCancelarAgendamento({ id }: { id: string }) {
    const [isPending, startTransition] = useTransition()
    const router = useRouter()

    const handleCancelar = () => {
        const confirmar = window.confirm("Tem a certeza que deseja cancelar esta reserva? Esta ação não pode ser desfeita.")
        if (!confirmar) return

        startTransition(async () => {
            const res = await cancelarAgendamentoPendente(id)

            if (res.sucesso) {
                alert("Reserva cancelada com sucesso.")
                router.refresh()
            } else {
                alert(res.erro || "Falha ao cancelar a reserva.")
            }
        })
    }

    return (
        <button
            onClick={handleCancelar}
            disabled={isPending}
            className="block w-full text-center px-4 py-2 mt-2 bg-red-50 text-red-600 font-bold rounded-lg border border-red-200 hover:bg-red-100 transition-colors shadow-sm disabled:opacity-50 text-sm"
        >
            {isPending ? "A cancelar..." : "Cancelar Reserva"}
        </button>
    )
}