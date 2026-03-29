import { prisma } from '@/lib/prisma';
import { notFound, redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import { jwtVerify } from 'jose';
import PainelComanda from '@/components/PainelComanda';
import { JWT_SECRET } from '@/lib/jwt'

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

    // Passo 3: Buscar permissões atualizadas do usuário logado
    const usuarioLogado = await prisma.funcionario.findUnique({
        where: { id: funcionarioId },
        select: { role: true, podeVerComissao: true }
    });

    // Se for ADMIN, vê tudo. Se for PROFISSIONAL, depende da trava do banco.
    const podeVerFinancas = usuarioLogado?.role === 'ADMIN' || usuarioLogado?.podeVerComissao === true;

    // Passo 4: Busca consolidada da comanda
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
        return notFound();
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

    // Passo 5: Busca os produtos do catálogo disponíveis para venda extra
    const produtosDisponiveis = await prisma.produto.findMany({
        where: { ativo: true, estoque: { gt: 0 } },
        select: { id: true, nome: true, precoVenda: true, estoque: true },
        orderBy: { nome: 'asc' }
    });

    // Passo 4.1: Sanitização Rigorosa de Dados (DTO)
    // Se o usuário não puder ver as finanças, os preços não devem sequer trafegar na rede.
    const agendamentoSanitizado = {
        ...agendamento,
        servicos: agendamento.servicos.map(s => ({
            ...s,
            precoCobrado: podeVerFinancas ? s.precoCobrado : null,
        })),
        produtos: agendamento.produtos.map(p => ({
            ...p,
            precoCobrado: podeVerFinancas ? p.precoCobrado : 0,
        }))
    };

    return (
        <div className="min-h-screen bg-[#fdfbf7] p-4 md:p-8 font-sans flex items-start md:items-center justify-center pt-32">
            <div className="w-full max-w-4xl">
                <PainelComanda
                    agendamento={agendamentoSanitizado}
                    produtosDisponiveis={produtosDisponiveis}
                    podeVerFinancas={podeVerFinancas} // <-- Repassando a permissão
                />
            </div>
        </div>
    );
}