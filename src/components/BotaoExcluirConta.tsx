'use client'

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { excluirMinhaContaLGPD } from '@/app/actions/cliente';

export default function BotaoExcluirConta({ clienteId }: { clienteId: string }) {
    const [loading, setLoading] = useState(false);
    const router = useRouter();

    const handleExcluir = async () => {
        // Confirmação de segurança para evitar cliques acidentais
        const confirmar = confirm('Tem a certeza? Esta ação é irreversível e os seus dados serão anonimizados.');
        if (!confirmar) return;

        setLoading(true);
        const res = await excluirMinhaContaLGPD(clienteId);

        if (res.sucesso) {
            alert('A sua conta foi removida com sucesso, em conformidade com a LGPD.');
            router.push('/'); // Redireciona para a página inicial
        } else {
            alert(res.erro);
            setLoading(false);
        }
    };

    return (
        <button
            onClick={handleExcluir}
            disabled={loading}
            className="bg-red-50 text-red-600 border border-red-200 px-4 py-2 rounded font-semibold hover:bg-red-100 transition-colors disabled:opacity-50"
        >
            {loading ? 'A processar exclusão...' : 'Excluir a minha conta (LGPD)'}
        </button>
    );
}