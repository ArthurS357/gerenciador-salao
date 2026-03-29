import { redirect } from 'next/navigation';
import Link from 'next/link';
import { prisma } from '@/lib/prisma';
import { listarAgendaProfissional, type AgendaProfissionalItem } from '@/app/actions/agendamento';
import { verificarSessaoFuncionario } from '@/app/actions/auth';
import { formatInTimeZone } from 'date-fns-tz';
import { ptBR } from 'date-fns/locale';

// Ícones
import { CalendarDays, LayoutDashboard, Home, Plus, Clock, CheckCircle2 } from 'lucide-react';

// Componentes isolados
import { AgendamentoPendenteCard } from '@/components/profissional/agendamento-pendente-card';
import { AgendamentoConcluidoCard } from '@/components/profissional/agendamento-concluido-card';

const FUSO_HORARIO = 'America/Sao_Paulo';

export default async function AgendaProfissionalPage() {
    const sessao = await verificarSessaoFuncionario();

    if (!sessao.logado || !sessao.id) {
        redirect('/login-profissional');
    }

    const usuarioLogado = await prisma.funcionario.findUnique({
        where: { id: sessao.id },
        select: { podeAgendar: true, podeVerHistorico: true, podeCancelar: true }
    });

    const permissaoAgendar = sessao.role === 'ADMIN' || usuarioLogado?.podeAgendar === true;
    const permissaoHistorico = sessao.role === 'ADMIN' || usuarioLogado?.podeVerHistorico === true;
    const permissaoCancelar = sessao.role === 'ADMIN' || usuarioLogado?.podeCancelar === true;

    const res = await listarAgendaProfissional(sessao.id);

    const agendamentos: AgendaProfissionalItem[] = (res.sucesso && 'agendamentos' in res)
        ? res.agendamentos
        : [];

    const pendentes = agendamentos.filter((a) => !a.concluido);
    const concluidos = agendamentos.filter((a) => a.concluido);

    return (
        <div className="min-h-screen bg-background p-4 sm:p-6 md:p-12 font-sans pt-24 md:pt-32">
            <div className="max-w-6xl mx-auto space-y-8">

                {/* Navegação Global (Breadcrumbs) */}
                <nav className="flex gap-3 px-2">
                    <Link href="/" className="text-sm font-bold text-muted-foreground hover:text-primary flex items-center gap-2 transition-colors">
                        <Home className="w-4 h-4" />
                        <span className="hidden sm:inline">Início</span>
                    </Link>
                    <span className="text-border">/</span>
                    <Link href="/profissional/dashboard" className="text-sm font-bold text-muted-foreground hover:text-primary flex items-center gap-2 transition-colors">
                        <LayoutDashboard className="w-4 h-4" />
                        Painel
                    </Link>
                </nav>

                {/* Cabeçalho Hero */}
                <header className="bg-card p-6 md:p-10 rounded-3xl shadow-sm border border-border flex flex-col md:flex-row justify-between items-start md:items-center gap-6 relative overflow-hidden">
                    {/* Efeito Glow de fundo */}
                    <div className="absolute right-0 top-0 w-64 h-64 bg-primary/5 rounded-full blur-3xl -mr-20 -mt-20 pointer-events-none"></div>

                    <div className="relative z-10">
                        <div className="flex items-center gap-3 mb-2">
                            <div className="p-2.5 bg-primary/10 rounded-xl">
                                <CalendarDays className="w-6 h-6 text-primary" />
                            </div>
                            <h1 className="text-3xl md:text-4xl font-black text-foreground tracking-tight">Minha Agenda</h1>
                        </div>
                        <p className="text-muted-foreground text-sm md:text-base max-w-md ml-1">Gerencie seus horários e acompanhe o faturamento em tempo real.</p>
                    </div>

                    <div className="relative z-10 flex flex-col sm:flex-row items-center gap-3 w-full md:w-auto">
                        <div className="w-full sm:w-auto px-5 py-3 bg-muted/50 text-foreground rounded-xl font-bold border border-border text-center text-sm capitalize shadow-sm">
                            {formatInTimeZone(new Date(), FUSO_HORARIO, "EEEE, dd 'de' MMM", { locale: ptBR })}
                        </div>

                        {permissaoAgendar && (
                            <button className="w-full sm:w-auto px-6 py-3 bg-primary text-primary-foreground font-bold rounded-xl hover:bg-primary/90 shadow-sm transition-all flex items-center justify-center gap-2 text-sm active:scale-95">
                                <Plus className="w-4 h-4" />
                                Nova Reserva
                            </button>
                        )}
                    </div>
                </header>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">

                    {/* COLUNA PRINCIPAL: Pendentes */}
                    <div className="lg:col-span-8 space-y-6">
                        <div className="flex items-center gap-3 mb-2 px-2">
                            <Clock className="w-5 h-5 text-primary" />
                            <h2 className="text-xl font-bold text-foreground">Próximos Atendimentos</h2>
                            <span className="bg-primary/10 text-primary text-xs font-bold px-2.5 py-1 rounded-full">
                                {pendentes.length}
                            </span>
                        </div>

                        {pendentes.length === 0 ? (
                            <div className="flex flex-col items-center justify-center text-center p-12 bg-card rounded-3xl border border-dashed border-border text-muted-foreground font-medium">
                                <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mb-4">
                                    <CheckCircle2 className="w-8 h-8 text-muted-foreground/50" />
                                </div>
                                <p className="text-foreground font-bold text-lg mb-1">Tudo limpo por aqui!</p>
                                <p className="text-sm">Não há agendamentos pendentes. Bom descanso!</p>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                {pendentes.map((agendamento) => (
                                    <AgendamentoPendenteCard
                                        key={agendamento.id}
                                        id={agendamento.id}
                                        clienteNome={agendamento.cliente.nome}
                                        clienteTelefone={agendamento.cliente.telefone}
                                        servicos={agendamento.servicos.map(s => s.servico.nome)}
                                        dataHoraInicio={agendamento.dataHoraInicio}
                                        permissaoCancelar={permissaoCancelar}
                                    />
                                ))}
                            </div>
                        )}
                    </div>

                    {/* COLUNA LATERAL: Concluídos */}
                    <div className="lg:col-span-4 space-y-6">
                        <div className="flex items-center gap-3 mb-2 px-2">
                            <CheckCircle2 className="w-5 h-5 text-green-600" />
                            <h2 className="text-xl font-bold text-foreground">Finalizados</h2>
                        </div>

                        {permissaoHistorico ? (
                            <div className="bg-card border border-border rounded-3xl p-6 shadow-sm">
                                {concluidos.length === 0 ? (
                                    <div className="text-center py-10">
                                        <p className="text-sm text-muted-foreground">Nenhum atendimento finalizado hoje.</p>
                                    </div>
                                ) : (
                                    <div className="space-y-2">
                                        {concluidos.map((agendamento) => (
                                            <AgendamentoConcluidoCard
                                                key={agendamento.id}
                                                clienteNome={agendamento.cliente.nome}
                                                valorBruto={agendamento.valorBruto}
                                                dataHoraInicio={agendamento.dataHoraInicio}
                                            />
                                        ))}
                                    </div>
                                )}
                            </div>
                        ) : (
                            <div className="bg-card border border-border rounded-3xl p-8 shadow-sm flex flex-col items-center justify-center text-center">
                                <div className="p-3 bg-muted rounded-full mb-3">
                                    <svg className="w-6 h-6 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"></path>
                                    </svg>
                                </div>
                                <p className="text-sm text-muted-foreground font-medium">O seu acesso ao histórico de faturamento está restrito pela gerência.</p>
                            </div>
                        )}
                    </div>

                </div>
            </div>
        </div>
    );
}