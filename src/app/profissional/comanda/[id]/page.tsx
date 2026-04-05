import { prisma } from '@/lib/prisma';
import { notFound, redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import { jwtVerify } from 'jose';
import PainelComanda from '@/components/PainelComanda';
import { getJwtSecret } from '@/lib/jwt';
import HistoricoAuditoria from '@/components/admin/HistoricoAuditoria';
import { decimalParaNumero } from '@/lib/decimal-utils';

interface PageProps {
    params: Promise<{ id: string }>;
}

export default async function ComandaPage({ params }: PageProps) {
    // 1. Resolve os parâmetros assíncronos da URL (padrão do Next.js 15+)
    const resolvedParams = await params;

    const cookieStore = await cookies();
    const token = cookieStore.get('funcionario_session')?.value;

    if (!token) redirect('/login-profissional');

    let funcionarioId = '';
    let role = '';

    try {
        const { payload } = await jwtVerify(token, getJwtSecret());
        funcionarioId = payload.sub as string;
        role = payload.role as string;
    } catch (error) {
        console.warn(`[Auth-Funcionario] Falha na validação de sessão: ${error instanceof Error ? error.message : 'Desconhecido'}`);
        redirect('/login-profissional');
    }

    const usuarioLogado = await prisma.funcionario.findUnique({
        where: { id: funcionarioId },
        select: { role: true, podeVerComissao: true }
    });

    const podeVerFinancas = usuarioLogado?.role === 'ADMIN' || usuarioLogado?.podeVerComissao === true;

    // 2. Busca os dados da comanda no banco
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

    // 3. Valida as permissões de acesso da comanda
    if (agendamento.funcionarioId !== funcionarioId && role !== 'ADMIN') {
        return (
            <div className="min-h-screen flex items-center justify-center bg-[#fdfbf7]">
                <div className="bg-red-50 text-red-700 p-6 rounded-lg shadow border border-red-200 text-center font-bold">
                    Acesso Negado: Você não tem permissão para visualizar este atendimento.
                </div>
            </div>
        );
    }

    const produtosDisponiveis = await prisma.produto.findMany({
        where: { ativo: true, estoque: { gt: 0 } },
        select: { id: true, nome: true, precoVenda: true, estoque: true },
        orderBy: { nome: 'asc' }
    });

    const agendamentoSanitizado = {
        ...agendamento,
        servicos: agendamento.servicos.map(s => ({
            ...s,
            precoCobrado: podeVerFinancas && s.precoCobrado != null ? decimalParaNumero(s.precoCobrado) : null,
        })),
        produtos: agendamento.produtos.map(p => ({
            ...p,
            precoCobrado: podeVerFinancas && p.precoCobrado != null ? decimalParaNumero(p.precoCobrado) : 0,
        }))
    };

    // 4. Renderiza a interface com o Painel principal e o Histórico de Auditoria
    return (
        <div className="min-h-screen bg-[#fdfbf7] p-4 md:p-8 font-sans flex items-start justify-center pt-32">
            {/* Adicionado space-y-8 para espaçar o painel principal do histórico */}
            <div className="w-full max-w-4xl space-y-8">
                <PainelComanda
                    agendamento={agendamentoSanitizado}
                    produtosDisponiveis={produtosDisponiveis.map(p => ({ ...p, precoVenda: decimalParaNumero(p.precoVenda) }))}
                    podeVerFinancas={podeVerFinancas}
                />

                {/* Componente visual do Log de Auditoria incluído no final do fluxo */}
                <HistoricoAuditoria comandaId={resolvedParams.id} />
            </div>
        </div>
    );
}