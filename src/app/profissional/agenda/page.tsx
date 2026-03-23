import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { jwtVerify } from 'jose';
import Link from 'next/link';
import { prisma } from '@/lib/prisma';
import { listarAgendaProfissional } from '@/app/actions/agendamento';
import BotaoCancelarAgendamento from '@/components/BotaoCancelarAgendamento';

const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET || 'chave_secreta_desenvolvimento');

export default async function AgendaProfissionalPage() {
    // 1. Verificação rigorosa de Autenticação e Role
    const cookieStore = await cookies();
    const token = cookieStore.get('funcionario_session')?.value;

    if (!token) redirect('/login-profissional');

    let funcionarioId = '';
    let funcionarioRole = '';
    try {
        const { payload } = await jwtVerify(token, JWT_SECRET);
        if (payload.role !== 'PROFISSIONAL' && payload.role !== 'ADMIN') {
            redirect('/login-profissional');
        }
        funcionarioId = payload.sub as string;
        funcionarioRole = payload.role as string;
    } catch {
        redirect('/login-profissional');
    }

    // 2. Consulta as permissões em tempo real no banco de dados (incluindo podeCancelar)
    const usuarioLogado = await prisma.funcionario.findUnique({
        where: { id: funcionarioId },
        select: { podeAgendar: true, podeVerHistorico: true, podeCancelar: true }
    });

    // Administradores têm sempre acesso total; Profissionais dependem da flag no banco
    const permissaoAgendar = funcionarioRole === 'ADMIN' || usuarioLogado?.podeAgendar === true;
    const permissaoHistorico = funcionarioRole === 'ADMIN' || usuarioLogado?.podeVerHistorico === true;
    const permissaoCancelar = funcionarioRole === 'ADMIN' || usuarioLogado?.podeCancelar === true;

    // 3. Resgata a agenda do profissional logado
    const res = await listarAgendaProfissional(funcionarioId);
    const agendamentos = res.sucesso ? res.agendamentos : [];

    // Filtramos para separar o que está pendente do que já foi concluído (faturado)
    const pendentes = agendamentos.filter((a: any) => !a.concluido);
    const concluidos = agendamentos.filter((a: any) => a.concluido);

    const formatarHora = (dataHora: Date) => {
        return new Intl.DateTimeFormat('pt-PT', { hour: '2-digit', minute: '2-digit' }).format(new Date(dataHora));
    };

    const formatarData = (dataHora: Date) => {
        return new Intl.DateTimeFormat('pt-PT', { day: '2-digit', month: 'short', year: 'numeric' }).format(new Date(dataHora));
    };

    return (
        <div className="min-h-screen bg-[#fdfbf7] p-6 md:p-12 font-sans pt-32">
            <div className="max-w-5xl mx-auto space-y-8">

                {/* Cabeçalho */}
                <div className="bg-white p-8 rounded-2xl shadow-sm border border-[#e5d9c5] flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div>
                        <h1 className="text-3xl font-bold text-[#5C4033]">A Minha Agenda</h1>
                        <p className="text-gray-600 mt-1 text-sm tracking-wide">Faça a gestão dos seus atendimentos de forma simples.</p>
                    </div>

                    <div className="flex items-center gap-4 w-full md:w-auto">
                        <div className="hidden md:block px-4 py-2.5 bg-[#8B5A2B]/10 text-[#8B5A2B] rounded-lg font-semibold border border-[#8B5A2B]/20">
                            {new Intl.DateTimeFormat('pt-PT', { weekday: 'long', day: '2-digit', month: 'long' }).format(new Date())}
                        </div>

                        {/* Trava Visual 1: Botão de Novo Agendamento */}
                        {permissaoAgendar && (
                            <button className="w-full md:w-auto px-6 py-2.5 bg-[#8B5A2B] text-white font-bold rounded-lg hover:bg-[#704620] shadow-sm transition-colors border border-[#5C4033]">
                                + Nova Reserva
                            </button>
                        )}
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

                    {/* COLUNA PRINCIPAL: Próximos Atendimentos */}
                    <div className="lg:col-span-2 space-y-6">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="w-2 h-8 bg-[#8B5A2B] rounded-full"></div>
                            <h2 className="text-xl font-bold text-[#5C4033]">Próximos Atendimentos</h2>
                        </div>

                        {pendentes.length === 0 ? (
                            <div className="text-center py-16 bg-white rounded-2xl border border-dashed border-[#e5d9c5] text-gray-500 font-medium">
                                Não há agendamentos pendentes. Bom descanso!
                            </div>
                        ) : (
                            <div className="space-y-4">
                                {pendentes.map((agendamento: any) => (
                                    <div key={agendamento.id} className="bg-white border border-[#e5d9c5] rounded-2xl p-6 shadow-sm hover:shadow-md transition-shadow flex flex-col md:flex-row gap-6 items-start md:items-center">

                                        {/* Bloco de Hora */}
                                        <div className="flex flex-col items-center justify-center min-w-[100px] py-4 bg-orange-50 rounded-xl border border-orange-100">
                                            <span className="text-2xl font-black text-[#5C4033] leading-none">
                                                {formatarHora(agendamento.dataHoraInicio)}
                                            </span>
                                            <span className="text-xs font-semibold text-[#8B5A2B] mt-1 uppercase tracking-wider">
                                                {formatarData(agendamento.dataHoraInicio)}
                                            </span>
                                        </div>

                                        {/* Detalhes do Cliente e Serviços */}
                                        <div className="flex-1 w-full">
                                            <h3 className="text-lg font-bold text-gray-800">{agendamento.cliente.nome}</h3>
                                            <p className="text-sm text-gray-500 mb-3 font-medium flex items-center gap-2">
                                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path></svg>
                                                {agendamento.cliente.telefone}
                                            </p>
                                            <div className="flex flex-wrap gap-2">
                                                {agendamento.servicos.map((item: any) => (
                                                    <span key={item.id} className="text-[0.65rem] font-bold uppercase tracking-wider bg-gray-100 text-gray-600 px-2.5 py-1 rounded">
                                                        {item.servico.nome}
                                                    </span>
                                                ))}
                                            </div>
                                        </div>

                                        {/* Ação: Abrir Comanda e Cancelar (se permitido) */}
                                        <div className="w-full md:w-auto flex flex-col gap-2">
                                            <Link
                                                href={`/profissional/comanda/${agendamento.id}`}
                                                className="block w-full md:w-auto text-center px-6 py-3 bg-[#5C4033] text-white font-bold rounded-xl hover:bg-[#3e2b22] transition-colors shadow-sm"
                                            >
                                                Abrir Comanda
                                            </Link>

                                            {/* Trava Visual de Cancelamento */}
                                            {permissaoCancelar && (
                                                <BotaoCancelarAgendamento id={agendamento.id} />
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* COLUNA LATERAL: Serviços Concluídos Hoje */}
                    <div className="space-y-6">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="w-2 h-8 bg-green-600 rounded-full"></div>
                            <h2 className="text-xl font-bold text-[#5C4033]">Concluídos</h2>
                        </div>

                        {/* Trava Visual 2: Histórico */}
                        {permissaoHistorico ? (
                            <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">
                                {concluidos.length === 0 ? (
                                    <p className="text-sm text-gray-500 text-center py-4">Nenhum atendimento finalizado ainda.</p>
                                ) : (
                                    <div className="space-y-4">
                                        {concluidos.map((agendamento: any) => (
                                            <div key={agendamento.id} className="flex justify-between items-center border-b border-gray-100 pb-4 last:border-0 last:pb-0">
                                                <div>
                                                    <p className="font-bold text-gray-800 text-sm">{formatarHora(agendamento.dataHoraInicio)}</p>
                                                    <p className="text-xs text-gray-500 truncate max-w-[120px]">{agendamento.cliente.nome}</p>
                                                </div>
                                                <div className="text-right">
                                                    <p className="font-black text-green-700 text-sm">€ {agendamento.valorBruto.toFixed(2)}</p>
                                                    <p className="text-[0.6rem] font-bold uppercase tracking-wider text-green-500">Faturado</p>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        ) : (
                            <div className="bg-gray-50 border border-gray-200 rounded-2xl p-8 shadow-sm flex flex-col items-center justify-center text-center">
                                <svg className="w-10 h-10 text-gray-400 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"></path>
                                </svg>
                                <p className="text-sm text-gray-600 font-medium">O seu acesso ao histórico de faturamento está restrito pelas configurações da gerência.</p>
                            </div>
                        )}
                    </div>

                </div>
            </div>
        </div>
    );
}