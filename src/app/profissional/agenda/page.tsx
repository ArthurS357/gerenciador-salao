import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { jwtVerify } from 'jose';
import { prisma } from '@/lib/prisma';
import Link from 'next/link';

// Mesma chave secreta usada na autenticação
const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET || 'chave_secreta_desenvolvimento');

export default async function AgendaProfissionalPage() {
    // Passo 1: Recupera o cookie de sessão criptografado
    const cookieStore = await cookies();
    const token = cookieStore.get('funcionario_session')?.value;

    if (!token) {
        redirect('/login-profissional');
    }

    let funcionarioId = '';
    let funcionarioNome = '';

    try {
        // Descriptografa o token para descobrir qual profissional está acessando
        const { payload } = await jwtVerify(token, JWT_SECRET);
        funcionarioId = payload.sub as string;
    } catch (error) {
        // Se o token for inválido ou expirado, expulsa para o login
        redirect('/login-profissional');
    }

    // Passo 2: Busca os dados do profissional e sua agenda pendente no Prisma
    const funcionario = await prisma.funcionario.findUnique({
        where: { id: funcionarioId },
        select: { nome: true }
    });

    if (!funcionario) redirect('/login-profissional');
    funcionarioNome = funcionario.nome;

    const agendamentos = await prisma.agendamento.findMany({
        where: {
            funcionarioId: funcionarioId,
            concluido: false // Traz apenas o que ainda não foi para o caixa
        },
        orderBy: { dataHoraInicio: 'asc' }, // Ordena do mais cedo para o mais tarde
        include: { cliente: true } // Traz os dados do cliente atrelado à reserva
    });

    // Função auxiliar para formatar a hora (Ex: 14:30)
    const formatarHora = (data: Date) => {
        return new Intl.DateTimeFormat('pt-BR', { hour: '2-digit', minute: '2-digit' }).format(data);
    };

    // Passo 3: Renderização da Interface
    return (
        <div className="min-h-screen bg-[#fdfbf7] p-4 md:p-8 font-sans">
            <div className="max-w-4xl mx-auto">

                {/* Cabeçalho da Agenda */}
                <header className="flex justify-between items-center border-b-2 border-[#5C4033] pb-4 mb-8">
                    <div>
                        <h1 className="text-3xl font-bold text-[#5C4033]">Sua Agenda</h1>
                        <p className="text-gray-600 font-medium mt-1">Olá, {funcionarioNome}</p>
                    </div>
                    <button className="text-sm font-semibold text-red-600 hover:underline">
                        Sair do Sistema
                    </button>
                </header>

                {/* Lista de Atendimentos */}
                {agendamentos.length === 0 ? (
                    <div className="bg-white p-10 rounded-lg shadow text-center border border-[#e5d9c5]">
                        <p className="text-gray-500 text-lg">Sua agenda está livre no momento.</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 gap-4">
                        {agendamentos.map((agendamento) => (
                            <div
                                key={agendamento.id}
                                className="bg-white p-6 rounded-lg shadow border-l-4 border-[#8B5A2B] flex flex-col md:flex-row justify-between items-start md:items-center gap-4 hover:shadow-md transition-shadow"
                            >
                                <div>
                                    <div className="flex items-center gap-3 mb-2">
                                        <span className="bg-[#e5d9c5] text-[#5C4033] px-3 py-1 rounded-full text-sm font-bold">
                                            {formatarHora(agendamento.dataHoraInicio)} - {formatarHora(agendamento.dataHoraFim)}
                                        </span>
                                        {/* Validação de LGPD Visual */}
                                        {agendamento.cliente.anonimizado && (
                                            <span className="bg-red-100 text-red-700 px-2 py-1 rounded text-xs font-bold">LGPD</span>
                                        )}
                                    </div>
                                    <h3 className="text-xl font-bold text-gray-800">{agendamento.cliente.nome}</h3>
                                    <p className="text-sm text-gray-500 mt-1">
                                        Valor Estimado (Bruto): R$ {agendamento.valorBruto.toFixed(2)}
                                    </p>
                                </div>

                                {/* Botão que levará o profissional para o componente PainelComanda que já criamos */}
                                <Link
                                    href={`/profissional/comanda/${agendamento.id}`}
                                    className="w-full md:w-auto text-center bg-[#5C4033] text-white px-6 py-3 rounded font-bold hover:bg-[#3e2b22] transition-colors"
                                >
                                    Abrir Comanda Digital
                                </Link>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}