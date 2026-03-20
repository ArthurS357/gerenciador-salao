'use client'

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { loginCliente } from '@/app/actions/auth';

export default function LoginPage() {
    // Passo 2: Gerenciamento de estado dos inputs e roteamento
    const [nome, setNome] = useState('');
    const [telefone, setTelefone] = useState('');
    const [erro, setErro] = useState('');
    const [loading, setLoading] = useState(false);
    const router = useRouter();

    // Passo 3: Função que processa o login e conversa com o banco
    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setErro('');

        try {
            // Chama a Server Action criada anteriormente
            const res = await loginCliente(telefone, nome);

            if (res.success) {
                // Redireciona para a página principal ou agenda após o sucesso
                router.push('/');
            } else {
                // Exibe o erro (ex: conta excluída/anonimizada via LGPD)
                setErro(res.error || 'Ocorreu um erro ao tentar entrar.');
            }
        } catch (err) {
            setErro('Falha de comunicação com o servidor.');
        } finally {
            setLoading(false);
        }
    };

    // Passo 4: Renderização da Interface Visual
    return (
        <div className="min-h-screen flex items-center justify-center bg-[#fdfbf7] p-4 font-sans">
            <div className="bg-white p-8 rounded-lg shadow-lg border border-[#e5d9c5] w-full max-w-md">

                {/* Cabeçalho */}
                <div className="text-center mb-8">
                    <h1 className="text-3xl font-bold text-[#5C4033] mb-2">LmLuMattielo</h1>
                    <p className="text-gray-500 text-sm">Acesse sua conta para realizar agendamentos</p>
                </div>

                {/* Exibição de Erros */}
                {erro && (
                    <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 text-sm rounded text-center font-medium">
                        {erro}
                    </div>
                )}

                {/* Formulário */}
                <form onSubmit={handleLogin} className="space-y-5">
                    <div>
                        <label htmlFor="nome" className="block text-sm font-semibold text-[#5C4033] mb-1">
                            Seu Nome Completo
                        </label>
                        <input
                            id="nome"
                            type="text"
                            required
                            value={nome}
                            onChange={(e) => setNome(e.target.value)}
                            className="w-full border border-gray-300 rounded px-4 py-2 focus:outline-none focus:ring-2 focus:ring-[#8B5A2B] focus:border-transparent text-gray-800"
                            placeholder="Ex: Maria Clara"
                        />
                    </div>

                    <div>
                        <label htmlFor="telefone" className="block text-sm font-semibold text-[#5C4033] mb-1">
                            Número de Telefone (WhatsApp)
                        </label>
                        <input
                            id="telefone"
                            type="tel"
                            required
                            value={telefone}
                            onChange={(e) => setTelefone(e.target.value)}
                            className="w-full border border-gray-300 rounded px-4 py-2 focus:outline-none focus:ring-2 focus:ring-[#8B5A2B] focus:border-transparent text-gray-800"
                            placeholder="(11) 90000-0000"
                        />
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full bg-[#5C4033] text-white font-bold py-3 rounded mt-4 hover:bg-[#3e2b22] transition-colors disabled:opacity-70 disabled:cursor-not-allowed"
                    >
                        {loading ? 'Acessando...' : 'Entrar'}
                    </button>
                </form>

            </div>
        </div>
    );
}