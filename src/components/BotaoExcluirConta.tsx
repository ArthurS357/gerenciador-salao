'use client'

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { excluirContaCliente } from '@/app/actions/cliente';
import { logoutCliente } from '@/app/actions/auth';

export default function BotaoExcluirConta({ clienteId }: { clienteId: string }) {
    const [isOpen, setIsOpen] = useState(false);
    const [confirmText, setConfirmText] = useState('');
    const [isPending, startTransition] = useTransition();
    const router = useRouter();

    const handleOpen = () => {
        setIsOpen(true);
        setConfirmText('');
    };

    const handleExcluir = () => {
        if (confirmText !== 'EXCLUIR') return;

        startTransition(async () => {
            const res = await excluirContaCliente(clienteId);

            if (res.sucesso) {
                // Ensure cookies are wiped
                await logoutCliente();
                alert('A sua conta foi removida com sucesso, em conformidade com a LGPD.');
                router.push('/');
                router.refresh(); // forces root layout update
            } else {
                alert(res.erro || "Erro interno ao apagar registo.");
                setIsOpen(false);
            }
        });
    };

    return (
        <>
            <button
                onClick={handleOpen}
                className="bg-red-50 text-red-600 border border-red-200 px-4 py-2 rounded font-semibold hover:bg-red-100 transition-colors"
                type="button"
            >
                Excluir a minha conta (LGPD)
            </button>

            {isOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
                    <div className="bg-white p-8 rounded-2xl shadow-xl w-full max-w-sm transform scale-100 transition-transform">
                        <div className="flex flex-col items-center text-center">
                            <div className="w-12 h-12 bg-red-100 text-red-600 rounded-full flex items-center justify-center mb-4">
                                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" /><line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" /></svg>
                            </div>
                            <h3 className="text-xl font-bold text-gray-900 mb-2">Apagar Permanentemente?</h3>
                            <p className="text-sm text-gray-500 mb-6">Esta ação é irreversível. O seu acesso será suspenso e os metadados ofuscados anonimamente.<br/><br/>Digite <strong>EXCLUIR</strong> para prosseguir.</p>
                            
                            <input 
                                type="text"
                                placeholder="EXCLUIR"
                                value={confirmText}
                                onChange={(e) => setConfirmText(e.target.value)}
                                disabled={isPending}
                                className="w-full border border-gray-300 rounded-lg p-3 text-center tracking-widest uppercase font-mono font-bold outline-none focus:border-red-400 focus:ring-1 focus:ring-red-400 mb-6"
                            />

                            <div className="flex gap-3 w-full">
                                <button 
                                    onClick={() => setIsOpen(false)}
                                    disabled={isPending}
                                    className="flex-1 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold rounded-xl transition-colors disabled:opacity-50"
                                >
                                    Cancelar
                                </button>
                                <button 
                                    onClick={handleExcluir}
                                    disabled={confirmText !== 'EXCLUIR' || isPending}
                                    className="flex-1 py-3 bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                                >
                                    {isPending ? 'Excluindo...' : 'Apagar'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}