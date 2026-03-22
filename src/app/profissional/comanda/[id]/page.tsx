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
    // Passo 1: Extrair o ID da URL de forma assíncrona (Next.js 15+)
    const resolvedParams = await params;

    // Passo 2: Validar o token do profissional/admin logado
    const cookieStore = await cookies();
    const token = cookieStore.get('funcionario_session')?.value;

    if (!token) redirect('/login-profissional');

    let funcionarioId = '';
    let role = '';
    try {
        const { payload } = await jwtVerify(token, JWT_SECRET);
        funcionarioId = payload.sub as string;
        role = payload.role as string;
    } catch {
        redirect('/login-profissional');
    }

    // Passo 3: Busca consolidada da comanda (incluindo serviços e produtos já adicionados)
    const agendamento = await prisma.agendamento.findUnique({
        where: { id: resolvedParams.id },
        include: { 
            cliente: { select: { nome: true, telefone: true } },
            funcionario: { select: { nome: true } },
            servicos: {
                include: { servico: { select: { nome: true } } }
            },
            produtos: {
                include: { produto: { select: { nome: true } } }
            }
        },
    });

    if (!agendamento) {
        return notFound(); // Mostra a página de erro 404 padrão do Next.js
    }

    // Trava de segurança: impede que um profissional abra a comanda de outro (exceto ADMIN)
    if (agendamento.funcionarioId !== funcionarioId && role !== 'ADMIN') {
        return (
            <div className="min-h-screen flex items-center justify-center bg-[#fdfbf7]">
                <div className="bg-red-50 text-red-700 p-6 rounded-lg shadow border border-red-200 text-center font-bold">
                    Acesso Negado: Você não tem permissão para visualizar este atendimento.
                </div>
            </div>
        );
    }

    // Passo 4: Busca os produtos do catálogo que estão disponíveis para venda extra
    const produtosDisponiveis = await prisma.produto.findMany({
        where: { ativo: true, estoque: { gt: 0 } },
        select: { id: true, nome: true, precoVenda: true, estoque: true },
        orderBy: { nome: 'asc' }
    });

    return (
        <div className="min-h-screen bg-[#fdfbf7] p-4 md:p-8 font-sans flex items-start md:items-center justify-center pt-32">
            <div className="w-full max-w-4xl">
                {/* Renderiza o componente interativo com os dados consolidados */}
                <PainelComanda
                    agendamento={agendamento}
                    produtosDisponiveis={produtosDisponiveis}
                />
            </div>
        </div>
    );
}