import Link from 'next/link'
import { verificarSessaoFuncionario } from '@/app/actions/auth'
import { listarAgendaProfissional } from '@/app/actions/agendamento'
import { ProxAtendimentoCard } from '@/components/profissional/prox-atendimento-card'
import { formatInTimeZone } from 'date-fns-tz'

export default async function ProfissionalDashboardPage() {
    const sessao = await verificarSessaoFuncionario();
    let proximoAgendamento = null;
    let minutosParaInicio = 0;
    let saudacaoNome = '';

    // Se o profissional estiver logado, o TypeScript reconhece a propriedade 'nome' com segurança
    if (sessao.logado && sessao.id) {
        saudacaoNome = sessao.nome ? `, ${sessao.nome.split(' ')[0]}` : '';

        const res = await listarAgendaProfissional(sessao.id);

        if (res.sucesso) {
            const agora = new Date();
            const fuso = 'America/Sao_Paulo';

            // Filtra agendamentos não concluídos e que iniciam a partir de agora
            const pendentes = res.data.agendamentos.filter(ag => {
                const dataAg = new Date(ag.dataHoraInicio);
                return !ag.concluido && dataAg >= agora;
            }).sort((a, b) => new Date(a.dataHoraInicio).getTime() - new Date(b.dataHoraInicio).getTime());

            if (pendentes.length > 0) {
                const prox = pendentes[0];
                const dataInicio = new Date(prox.dataHoraInicio);
                const diaProx = formatInTimeZone(dataInicio, fuso, 'yyyy-MM-dd');
                const diaAgora = formatInTimeZone(agora, fuso, 'yyyy-MM-dd');

                // Só exibe se o próximo agendamento for hoje
                if (diaProx === diaAgora) {
                    minutosParaInicio = Math.floor((dataInicio.getTime() - agora.getTime()) / 60000);
                    proximoAgendamento = prox;
                }
            }
        }
    }

    return (
        <div className="min-h-screen bg-[#fdfbf7] font-sans pb-12 flex flex-col items-center justify-center p-4">
            <div className="max-w-3xl w-full animate-in fade-in zoom-in-95 duration-500">

                <header className="mb-10 text-center">
                    <h1 className="text-3xl md:text-4xl font-black text-marrom-medio tracking-tight">Portal do Profissional</h1>
                    <p className="text-gray-500 mt-3 text-sm md:text-base">
                        Bem-vindo(a) de volta{saudacaoNome}! O que deseja fazer hoje?
                    </p>
                </header>

                {/* Exibe o Card apenas se houver agendamentos pendentes para hoje */}
                {proximoAgendamento && (
                    <div className="mb-10 max-w-md mx-auto">
                        <ProxAtendimentoCard
                            agendamentoId={proximoAgendamento.id}
                            cliente={proximoAgendamento.cliente.nome}
                            telefone={proximoAgendamento.cliente.telefone}
                            servicos={proximoAgendamento.servicos.map(s => s.servico.nome)}
                            minutosParaInicio={minutosParaInicio}
                            dataHoraInicio={proximoAgendamento.dataHoraInicio}
                        />
                    </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6 mb-10">
                    {/* Cartão da Agenda */}
                    <Link href="/profissional/agenda" className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100 hover:border-marrom-claro/50 hover:shadow-md transition-all duration-300 group flex flex-col items-center text-center cursor-pointer">
                        <div className="w-20 h-20 bg-orange-50 rounded-full flex items-center justify-center mb-5 group-hover:bg-marrom-claro group-hover:scale-110 transition-all duration-300">
                            <svg className="w-9 h-9 text-marrom-claro group-hover:text-white transition-colors" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
                                <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                                <line x1="16" y1="2" x2="16" y2="6"></line>
                                <line x1="8" y1="2" x2="8" y2="6"></line>
                                <line x1="3" y1="10" x2="21" y2="10"></line>
                            </svg>
                        </div>
                        <h2 className="text-xl font-bold text-gray-800 mb-2">Acessar a Agenda</h2>
                        <p className="text-sm text-gray-500">Visualize os seus agendamentos, horários marcados e comandas do dia.</p>
                    </Link>

                    {/* Cartão do Perfil */}
                    <Link href="/profissional/perfil" className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100 hover:border-marrom-claro/50 hover:shadow-md transition-all duration-300 group flex flex-col items-center text-center cursor-pointer">
                        <div className="w-20 h-20 bg-stone-100 rounded-full flex items-center justify-center mb-5 group-hover:bg-marrom-medio group-hover:scale-110 transition-all duration-300">
                            <svg className="w-9 h-9 text-marrom-medio group-hover:text-white transition-colors" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                            </svg>
                        </div>
                        <h2 className="text-xl font-bold text-gray-800 mb-2">Meu Perfil</h2>
                        <p className="text-sm text-gray-500">Configure as suas horas de trabalho, foto de apresentação e senha de acesso.</p>
                    </Link>
                </div>

                <div className="text-center">
                    <Link href="/" className="inline-flex items-center gap-2 px-6 py-3.5 bg-white border border-gray-200 text-gray-600 font-bold rounded-xl hover:bg-gray-50 hover:text-gray-900 transition-colors text-sm shadow-sm">
                        <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                        </svg>
                        Voltar para a Página Inicial (Home)
                    </Link>
                </div>

            </div>
        </div>
    )
}