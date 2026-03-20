import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export default async function TorreControleDashboard() {
    // Passo 2: Busca de dados simultânea no banco (PostgreSQL/SQLite)
    const [funcionarios, clientes, agendamentosConcluidos] = await Promise.all([
        prisma.funcionario.findMany({
            orderBy: { nome: 'asc' },
        }),
        prisma.cliente.findMany({
            orderBy: { criadoEm: 'desc' },
            take: 50, // Limite para paginação inicial
        }),
        prisma.agendamento.findMany({
            where: { concluido: true },
        })
    ]);

    // Passo 2 (Continuação): Agregação Financeira Simples
    // Calcula o total bruto e o total de taxas deduzidas de todas as comandas concluídas
    const faturamentoBruto = agendamentosConcluidos.reduce((acc, curr) => acc + curr.valorBruto, 0);
    const deducoesTotais = agendamentosConcluidos.reduce((acc, curr) => acc + curr.taxas, 0);
    const baseLiquida = faturamentoBruto - deducoesTotais;
    // (Nota: Para um cálculo exato de comissão retida, cruzaríamos com a comissão de cada funcionário, mas aqui fazemos uma estimativa simplificada para o dashboard)
    const lucroRetidoEstimado = baseLiquida * 0.6; // Supondo que 40% fica com os profissionais em média

    // Passo 3 e 4: Estrutura Visual do Dashboard
    return (
        <div className="min-h-screen bg-[#fdfbf7] p-8 font-sans">
            <header className="mb-8 border-b-2 border-[#5C4033] pb-4 flex justify-between items-center">
                <h1 className="text-3xl font-bold text-[#5C4033]">Torre de Controle LmLuMattielo</h1>
                <button className="bg-[#8B5A2B] text-white px-4 py-2 rounded hover:bg-[#704620]">
                    + Novo Cadastro
                </button>
            </header>

            {/* Resumo Financeiro */}
            <section className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
                <div className="bg-white p-6 rounded-lg shadow border border-[#e5d9c5]">
                    <h3 className="text-gray-500 text-sm font-semibold mb-1">Faturamento Bruto</h3>
                    <p className="text-2xl font-bold text-gray-800">R$ {faturamentoBruto.toFixed(2)}</p>
                </div>
                <div className="bg-white p-6 rounded-lg shadow border border-[#e5d9c5]">
                    <h3 className="text-gray-500 text-sm font-semibold mb-1">Deduções (Taxas/Insumos)</h3>
                    <p className="text-2xl font-bold text-red-600">- R$ {deducoesTotais.toFixed(2)}</p>
                </div>
                <div className="bg-[#5C4033] p-6 rounded-lg shadow text-white">
                    <h3 className="text-gray-300 text-sm font-semibold mb-1">Lucro Líquido Retido</h3>
                    <p className="text-2xl font-bold">R$ {lucroRetidoEstimado.toFixed(2)}</p>
                </div>
            </section>

            {/* Gestão de Equipe */}
            <section className="mb-10">
                <h2 className="text-2xl font-bold text-[#5C4033] mb-4">Gestão de Equipe</h2>
                <div className="bg-white rounded-lg shadow overflow-hidden border border-[#e5d9c5]">
                    <table className="w-full text-left border-collapse">
                        <thead className="bg-[#5C4033] text-white">
                            <tr>
                                <th className="p-4 text-sm font-semibold">Nome</th>
                                <th className="p-4 text-sm font-semibold">Comissão</th>
                                <th className="p-4 text-sm font-semibold">Agendar Clientes</th>
                                <th className="p-4 text-sm font-semibold">Ver Histórico</th>
                                <th className="p-4 text-sm font-semibold text-right">Ações</th>
                            </tr>
                        </thead>
                        <tbody>
                            {funcionarios.map((func) => (
                                <tr key={func.id} className="border-b border-gray-100 hover:bg-gray-50">
                                    <td className="p-4 text-gray-800 font-medium">{func.nome}</td>
                                    <td className="p-4 text-gray-600">{func.comissao}%</td>
                                    <td className="p-4 text-gray-600">{func.podeAgendar ? 'Sim' : 'Não'}</td>
                                    <td className="p-4 text-gray-600">{func.podeVerHistorico ? 'Sim' : 'Não'}</td>
                                    <td className="p-4 text-right">
                                        <button className="text-[#8B5A2B] hover:underline text-sm font-semibold">Editar Permissões</button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </section>

            {/* Base de Clientes */}
            <section>
                <h2 className="text-2xl font-bold text-[#5C4033] mb-4">Base de Clientes (LGPD)</h2>
                <div className="bg-white rounded-lg shadow overflow-hidden border border-[#e5d9c5]">
                    <table className="w-full text-left border-collapse">
                        <thead className="bg-[#e5d9c5] text-[#5C4033]">
                            <tr>
                                <th className="p-4 text-sm font-semibold">Telefone (Login)</th>
                                <th className="p-4 text-sm font-semibold">Nome</th>
                                <th className="p-4 text-sm font-semibold">Status LGPD</th>
                                <th className="p-4 text-sm font-semibold text-right">Ações</th>
                            </tr>
                        </thead>
                        <tbody>
                            {clientes.map((cliente) => (
                                <tr key={cliente.id} className="border-b border-gray-100 hover:bg-gray-50">
                                    <td className="p-4 text-gray-800 font-mono text-sm">{cliente.telefone}</td>
                                    <td className="p-4 text-gray-800">{cliente.nome}</td>
                                    <td className="p-4">
                                        <span className={`px-2 py-1 rounded text-xs font-bold ${cliente.anonimizado ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
                                            {cliente.anonimizado ? 'Anonimizado' : 'Ativo'}
                                        </span>
                                    </td>
                                    <td className="p-4 text-right space-x-3">
                                        <button className="text-[#8B5A2B] hover:underline text-sm font-semibold">Histórico</button>
                                        {!cliente.anonimizado && (
                                            <button className="text-red-600 hover:underline text-sm font-semibold">Excluir/Anonimizar</button>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </section>
        </div>
    );
}