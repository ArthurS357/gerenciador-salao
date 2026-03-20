import { prisma } from '@/lib/prisma';
import { notFound, redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import { jwtVerify } from 'jose';
import PainelComanda from '@/components/PainelComanda';

const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET || 'chave_secreta_desenvolvimento');

interface PageProps {
    params: Promise<{ id: string }>;
}

export default async function ComandaPage({ params }: PageProps) {
    // Passo 2: Extrair o ID da URL e validar o token do profissional logado
    const resolvedParams = await params;

    const cookieStore = await cookies();
    const token = cookieStore.get('funcionario_session')?.value;

    if (!token) redirect('/login-profissional');

    let funcionarioId = '';
    try {
        const { payload } = await jwtVerify(token, JWT_SECRET);
        funcionarioId = payload.sub as string;
    } catch {
        redirect('/login-profissional');
    }

    // Passo 3: Busca segura no banco garantindo a propriedade da comanda
    const agendamento = await prisma.agendamento.findUnique({
        where: { id: resolvedParams.id },
        include: { cliente: true }, // Traz o nome e status LGPD do cliente
    });

    if (!agendamento) {
        return notFound(); // Mostra a página de erro 404 padrão do Next.js
    }

    // Trava de segurança: impede que um profissional abra a comanda de outro
    if (agendamento.funcionarioId !== funcionarioId) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-[#fdfbf7]">
                <div className="bg-red-50 text-red-700 p-6 rounded-lg shadow border border-red-200 text-center font-bold">
                    Acesso Negado: Você não tem permissão para visualizar este atendimento.
                </div>
            </div>
        );
    }

    // Passo 4: Formatação dos dados para o componente visual
    const servicoInicial = {
        id: 'servico-agendado',
        nome: 'Procedimento Inicial',
        preco: agendamento.valorBruto,
    };

    return (
        <div className="min-h-screen bg-[#fdfbf7] p-4 md:p-8 font-sans flex items-center justify-center">
            <div className="w-full max-w-4xl">
                {/* Renderiza o componente interativo que construímos anteriormente */}
                <PainelComanda
                    agendamentoId={agendamento.id}
                    clienteNome={agendamento.cliente.nome}
                    servicoInicial={servicoInicial}
                />
            </div>
        </div>
    );
}