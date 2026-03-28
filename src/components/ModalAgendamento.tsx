import React, { useState, useEffect } from 'react';

// Tipagens baseadas no seu domínio
interface ServicoSelecionado {
    id: string;
    nome: string;
    tempoMinutos: number | null;
}

interface HorarioDisponivel {
    funcionarioId: string;
    funcionarioNome: string;
    horarios: string[]; // ex: ["09:00", "09:30", "10:00"]
}

interface ModalAgendamentoProps {
    isOpen: boolean;
    onClose: () => void;
    servicosSelecionados: ServicoSelecionado[];
}

export function ModalAgendamento({ isOpen, onClose, servicosSelecionados }: ModalAgendamentoProps) {
    const [servicoAtual, setServicoAtual] = useState<string>(servicosSelecionados[0]?.id || '');
    const [diaSelecionado, setDiaSelecionado] = useState<number | null>(null);
    const [diasDisponiveis, setDiasDisponiveis] = useState<number[]>([]);
    const [horariosDoDia, setHorariosDoDia] = useState<HorarioDisponivel[]>([]);
    const [carregando, setCarregando] = useState(false);

    // Mês atual fixado para simplificação (pode ser expandido para navegação)
    const diasDoMes = Array.from({ length: 30 }, (_, i) => i + 1);

    // Efeito para buscar dias disponíveis de forma assíncrona
    useEffect(() => {
        if (!servicoAtual) return;

        let ativo = true; // Controla se o componente ainda está montado

        const buscarDias = async () => {
            setCarregando(true);

            // Simula o tempo de uma requisição ao backend (API/Server Action)
            await new Promise(resolve => setTimeout(resolve, 300));

            if (ativo) {
                // Simulação: Dias 5, 12, 15 e 22 estão verdes (têm expediente e horário vago)
                setDiasDisponiveis([5, 12, 15, 22]);
                setDiaSelecionado(null);
                setHorariosDoDia([]);
                setCarregando(false);
            }
        };

        buscarDias();

        // Limpeza do efeito caso o componente desmonte ou o servicoAtual mude muito rápido
        return () => { ativo = false; };
    }, [servicoAtual]);

    // Efeito para buscar horários do dia selecionado de forma assíncrona
    useEffect(() => {
        if (!diaSelecionado || !servicoAtual) return;

        let ativo = true;

        const buscarHorarios = async () => {
            setCarregando(true);

            // Simula requisição ao backend
            await new Promise(resolve => setTimeout(resolve, 300));

            if (ativo) {
                setHorariosDoDia([
                    {
                        funcionarioId: '1',
                        funcionarioNome: 'Ana (Especialista)',
                        horarios: ['09:00', '10:00', '14:30']
                    },
                    {
                        funcionarioId: '2',
                        funcionarioNome: 'Carlos (Profissional)',
                        horarios: ['11:00', '15:00', '16:00']
                    }
                ]);
                setCarregando(false);
            }
        };

        buscarHorarios();

        return () => { ativo = false; };
    }, [diaSelecionado, servicoAtual]);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 backdrop-blur-sm">
            <div className="bg-white rounded-xl shadow-lg w-full max-w-lg p-6 flex flex-col gap-6">

                {/* Cabeçalho */}
                <div className="flex justify-between items-center border-b pb-4">
                    <h2 className="text-xl font-bold text-gray-800">Agendar Serviço</h2>
                    <button onClick={onClose} className="text-gray-500 hover:text-gray-800">
                        ✕
                    </button>
                </div>

                {/* Seleção do Serviço */}
                <div className="flex flex-col gap-2">
                    <label className="text-sm font-semibold text-gray-700">Qual serviço deseja agendar agora?</label>
                    <select
                        className="p-2 border rounded-md outline-none focus:ring-2 focus:ring-zinc-800 disabled:opacity-50"
                        value={servicoAtual}
                        onChange={(e) => setServicoAtual(e.target.value)}
                        disabled={carregando}
                    >
                        {servicosSelecionados.map(srv => (
                            <option key={srv.id} value={srv.id}>{srv.nome}</option>
                        ))}
                    </select>
                </div>

                {/* Calendário */}
                <div className="flex flex-col gap-2">
                    <label className="text-sm font-semibold text-gray-700">Selecione um dia disponível:</label>
                    <div className="grid grid-cols-7 gap-2 text-center">
                        {['D', 'S', 'T', 'Q', 'Q', 'S', 'S'].map(d => (
                            <div key={d} className="text-xs font-bold text-gray-400">{d}</div>
                        ))}
                        {diasDoMes.map(dia => {
                            const disponivel = diasDisponiveis.includes(dia);
                            const selecionado = diaSelecionado === dia;

                            return (
                                <button
                                    key={dia}
                                    disabled={!disponivel || carregando}
                                    onClick={() => setDiaSelecionado(dia)}
                                    className={`
                                        p-2 rounded-full text-sm font-medium transition-colors
                                        ${selecionado ? 'bg-zinc-800 text-white' : ''}
                                        ${disponivel && !selecionado ? 'bg-green-100 text-green-700 hover:bg-green-200 cursor-pointer' : ''}
                                        ${!disponivel ? 'text-gray-300 cursor-not-allowed opacity-50' : ''}
                                    `}
                                >
                                    {dia}
                                </button>
                            );
                        })}
                    </div>
                </div>

                {/* Loading State / Horários por Funcionário */}
                {carregando && diaSelecionado && (
                    <div className="flex justify-center border-t pt-4">
                        <span className="text-sm text-gray-500">Buscando horários...</span>
                    </div>
                )}

                {!carregando && diaSelecionado && (
                    <div className="flex flex-col gap-4 border-t pt-4 max-h-48 overflow-y-auto">
                        <h3 className="text-sm font-semibold text-gray-700">Horários disponíveis para o dia {diaSelecionado}:</h3>

                        {horariosDoDia.map(prof => (
                            <div key={prof.funcionarioId} className="flex flex-col gap-2">
                                <span className="text-xs font-bold text-gray-500">{prof.funcionarioNome}</span>
                                <div className="flex flex-wrap gap-2">
                                    {prof.horarios.map(hora => (
                                        <button
                                            key={hora}
                                            className="px-3 py-1 text-sm border border-gray-200 rounded-md hover:border-zinc-800 hover:bg-zinc-50 transition-colors"
                                            onClick={() => alert(`Agendamento confirmado para ${hora} com ${prof.funcionarioNome}`)}
                                        >
                                            {hora}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        ))}

                        {horariosDoDia.length === 0 && (
                            <p className="text-sm text-gray-500">Nenhum horário encontrado para este dia.</p>
                        )}
                    </div>
                )}

            </div>
        </div>
    );
}