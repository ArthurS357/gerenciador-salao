'use client'

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { listarTodosClientes } from '@/app/actions/cliente';

export default function BaseClientesPage() {
    const [clientes, setClientes] = useState<any[]>([]);

    useEffect(() => {
        async function carregar() {
            const res = await listarTodosClientes();
            if (res.sucesso) setClientes(res.clientes);
        }
        carregar();
    }, []);

    return (
        <div className="min-h-screen bg-[#fdfbf7] p-8 font-sans">
            <header className="mb-6 border-b-2 border-[#5C4033] pb-4 flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold text-[#5C4033]">Base de Clientes</h1>
                    <p className="text-gray-500 mt-1">CRM e Gestão de Privacidade (LGPD)</p>
                </div>
                <Link href="/admin/dashboard" className="text-sm font-bold text-[#8B5A2B] hover:underline">
                    &larr; Voltar para o Painel Central
                </Link>
            </header>

            <section className="bg-white rounded-lg shadow overflow-hidden border border-[#e5d9c5]">
                <table className="w-full text-left border-collapse">
                    <thead className="bg-[#5C4033] text-white">
                        <tr>
                            <th className="p-4 text-sm font-semibold">Nome do Cliente</th>
                            <th className="p-4 text-sm font-semibold text-center">Telefone de Contato</th>
                            <th className="p-4 text-sm font-semibold text-center">Total de Agendamentos</th>
                            <th className="p-4 text-sm font-semibold text-right">Status LGPD</th>
                        </tr>
                    </thead>
                    <tbody>
                        {clientes.length === 0 ? (
                            <tr><td colSpan={4} className="p-8 text-center text-gray-500">Nenhum cliente cadastrado.</td></tr>
                        ) : (
                            clientes.map(cli => (
                                <tr key={cli.id} className="border-b border-gray-100 hover:bg-gray-50">
                                    <td className="p-4 font-bold text-gray-800">
                                        {cli.nome}
                                        {cli.anonimizado && <span className="ml-2 text-xs font-normal text-red-500">(Dados Ocultos)</span>}
                                    </td>
                                    <td className="p-4 text-center text-gray-600">{cli.telefone}</td>
                                    <td className="p-4 text-center font-bold text-gray-700">{cli._count.agendamentos}</td>
                                    <td className="p-4 text-right">
                                        {cli.anonimizado ? (
                                            <span className="bg-red-100 text-red-700 px-3 py-1 rounded-full text-xs font-bold">Anonimizado</span>
                                        ) : (
                                            <span className="bg-green-100 text-green-700 px-3 py-1 rounded-full text-xs font-bold">Ativo</span>
                                        )}
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </section>
        </div>
    );
}