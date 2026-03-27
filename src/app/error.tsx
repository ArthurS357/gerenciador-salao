'use client' // Error components devem ser sempre Client Components

import { useEffect } from 'react'
import Link from 'next/link'

export default function GlobalError({
    error,
    reset,
}: {
    error: Error & { digest?: string }
    reset: () => void
}) {
    useEffect(() => {
        // Opcional: Enviar o erro para um serviço de monitoramento (ex: Sentry)
        console.error('Erro global interceptado:', error)
    }, [error])

    return (
        <div className="min-h-screen bg-[#fdfbf7] flex flex-col items-center justify-center p-6 text-center">
            <div className="max-w-md w-full bg-white p-10 rounded-2xl shadow-xl border-t-4 border-red-600">
                <div className="text-red-500 mb-4 flex justify-center">
                    <svg className="w-16 h-16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path>
                    </svg>
                </div>
                <h1 className="text-2xl font-bold text-gray-800 mb-2">Algo correu mal</h1>
                <p className="text-gray-500 text-sm mb-8 leading-relaxed">
                    Ocorreu um erro inesperado no sistema. A nossa equipa técnica já foi notificada (se não, avise-nos!).
                </p>
                <div className="flex flex-col gap-3">
                    <button
                        onClick={() => reset()}
                        className="w-full py-3 bg-gray-800 text-white font-bold rounded-xl hover:bg-gray-900 transition-colors"
                    >
                        Tentar Novamente
                    </button>
                    <Link
                        href="/"
                        className="w-full py-3 text-center bg-gray-100 text-gray-700 font-bold rounded-xl hover:bg-gray-200 transition-colors"
                    >
                        Voltar à Página Principal
                    </Link>
                </div>
            </div>
        </div>
    )
}