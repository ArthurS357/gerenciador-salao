import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { jwtVerify } from 'jose';
import { prisma } from '@/lib/prisma';
import BotaoExcluirConta from '@/components/BotaoExcluirConta';

const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET || 'chave_secreta_desenvolvimento');

export default async function PainelClientePage() {
    // 1. Verificação do Cookie de Sessão do Cliente
    const cookieStore = await cookies();
    const token = cookieStore.get('cliente_session')?.value;

    if (!token) redirect('/login');

    let clienteId = '';
    try {
        const { payload } = await jwtVerify(token, JWT_SECRET);
        clienteId = payload.sub as string;
    } catch {
        redirect('/login');
    }

    // 2. Procura os dados do cliente e o seu histórico, ordenando pelo mais recente
    const cliente = await prisma.cliente.findUnique({
        where: { id: clienteId },
        include: {
            agendamentos: {
                orderBy: { dataHoraInicio: 'desc' },
                include: { funcionario: true } // Traz o nome do profissional que o atendeu
            }
        }
    });

    if (!cliente || cliente.anonimizado) {
        redirect('/login');
    }

    // Função para formatar a data visualmente
    const formatarData = (data: Date) => {
        return new Intl.DateTimeFormat('pt-BR', {
            day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit'
        }).format(data);
    };

    // 3. Estrutura Visual da Interface (Marrom e Branco)
    return (
        <div className="min-h-screen bg-[#fdfbf7] p-6 md:p-12 font-sans">
            <div className="max-w-4xl mx-auto bg-white p-8 rounded-lg shadow-lg border border-[#e5d9c5]">

                <header className="flex flex-col md:flex-row justify-between items-start md:items-center border-b border-[#e5d9c5] pb-6 mb-8 gap-4">
                    <div>
                        <h1 className="text-3xl font-bold text-[#5C4033]">O meu Painel</h1>
                        <p className="text-gray-600 mt-1">Bem-vindo(a), {cliente.nome}</p>
                    </div>
                    <BotaoExcluirConta clienteId={cliente.id} />
                </header>

                <section>
                    <h2 className="text-2xl font-bold text-[#5C4033] mb-6">Histórico de Atendimentos</h2>

                    {cliente.agendamentos.length === 0 ? (
                        <div className="text-center py-10 bg-gray-50 rounded border border-gray-100 text-gray-500">
                            Ainda não possui agendamentos no nosso espaço.
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {cliente.agendamentos.map(agendamento => (
                                <div key={agendamento.id} className="flex justify-between items-center p-4 border border-gray-100 rounded hover:shadow-sm transition-shadow">
                                    <div>
                                        <p className="font-bold text-gray-800 text-lg">
                                            {formatarData(agendamento.dataHoraInicio)}
                                        </p>
                                        <p className="text-sm text-gray-500">
                                            Profissional: {agendamento.funcionario.nome}
                                        </p>
                                    </div>
                                    <div className="text-right">
                                        <span className={`px-3 py-1 text-xs font-bold rounded-full ${agendamento.concluido ? 'bg-[#e5d9c5] text-[#5C4033]' : 'bg-green-100 text-green-700'}`}>
                                            {agendamento.concluido ? 'Concluído' : 'Agendado'}
                                        </span>
                                        <p className="text-sm font-semibold text-gray-700 mt-2">
                                            R$ {agendamento.valorBruto.toFixed(2)}
                                        </p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </section>

            </div>
        </div>
    );
}