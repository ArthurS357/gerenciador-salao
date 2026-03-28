import React from 'react';

interface CalendarioProps {
    mesAtual: number;
    anoAtual: number;
    diaSelecionado: number | null;
    carregando: boolean;
    setDiaSelecionado: (dia: number) => void;
    alterarMes: (delta: number) => void;
}

export function Calendario({
    mesAtual, anoAtual, diaSelecionado, carregando, setDiaSelecionado, alterarMes
}: CalendarioProps) {
    const hoje = new Date();
    const diasNoMes = new Date(anoAtual, mesAtual + 1, 0).getDate();
    const primeiroDiaDoMes = new Date(anoAtual, mesAtual, 1).getDay();

    const diasVazios = Array.from({ length: primeiroDiaDoMes }, (_, i) => i);
    const dias = Array.from({ length: diasNoMes }, (_, i) => i + 1);

    const nomesMeses = [
        'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
        'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
    ];

    return (
        <div className="flex flex-col gap-4">
            {/* Navegação de Meses */}
            <div className="flex items-center justify-between px-2">
                <button
                    onClick={() => alterarMes(-1)}
                    className="p-2 text-caramelo hover:bg-caramelo/10 rounded-full transition-colors font-bold"
                >
                    &lt;
                </button>
                <span className="font-sans text-sm font-semibold tracking-widest uppercase text-[#2a1810]">
                    {nomesMeses[mesAtual]} {anoAtual}
                </span>
                <button
                    onClick={() => alterarMes(1)}
                    className="p-2 text-caramelo hover:bg-caramelo/10 rounded-full transition-colors font-bold"
                >
                    &gt;
                </button>
            </div>

            {/* Grid do Calendário */}
            <div>
                <div className="grid grid-cols-7 gap-2 text-center mb-2">
                    {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map((d, index) => (
                        <div key={`weekday-${index}`} className="text-[0.65rem] font-bold text-gray-400 uppercase tracking-wider">{d}</div>
                    ))}
                </div>

                <div className="grid grid-cols-7 gap-2 text-center">
                    {diasVazios.map(v => <div key={`empty-${v}`} />)}

                    {dias.map(dia => {
                        const dataDesteDia = new Date(anoAtual, mesAtual, dia);
                        const hojeSemHoras = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate());
                        const diaNoPassado = dataDesteDia < hojeSemHoras;
                        const selecionado = diaSelecionado === dia;

                        return (
                            <button
                                key={`dia-${dia}`}
                                disabled={diaNoPassado || carregando}
                                onClick={() => setDiaSelecionado(dia)}
                                className={`
                                    p-2 rounded-lg text-sm font-medium transition-all duration-200 border
                                    ${selecionado ? 'bg-caramelo text-white border-caramelo shadow-md' : ''}
                                    ${!selecionado && !diaNoPassado ? 'bg-white text-gray-700 border-gray-100 hover:border-caramelo/50 hover:bg-caramelo/5' : ''}
                                    ${diaNoPassado ? 'text-gray-300 cursor-not-allowed border-transparent opacity-50' : ''}
                                `}
                            >
                                {dia}
                            </button>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}