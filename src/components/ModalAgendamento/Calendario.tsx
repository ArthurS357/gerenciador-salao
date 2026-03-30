import React from 'react';

interface CalendarioProps {
    mesAtual: number;
    anoAtual: number;
    diaSelecionado: number | null;
    carregando: boolean;
    setDiaSelecionado: (dia: number) => void;
    alterarMes: (delta: number) => void;
    /** Índices dos dias da semana em que o profissional trabalha (0=Dom…6=Sáb).
     *  undefined = sem filtro (todos os dias disponíveis). */
    diasAtivos?: number[];
}

export function Calendario({
    mesAtual, anoAtual, diaSelecionado, carregando,
    setDiaSelecionado, alterarMes, diasAtivos,
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

    // Verifica se o mês/ano atual é o mês/ano de hoje (para não voltar para o passado)
    const estaNoMesAtual =
        mesAtual === hoje.getMonth() && anoAtual === hoje.getFullYear();

    return (
        <div className="flex flex-col gap-4">
            {/* Navegação de meses */}
            <div className="flex items-center justify-between px-1">
                <button
                    onClick={() => alterarMes(-1)}
                    disabled={estaNoMesAtual}
                    className="p-2 text-caramelo hover:bg-caramelo/10 rounded-full transition-colors font-bold disabled:opacity-30 disabled:cursor-not-allowed"
                    aria-label="Mês anterior"
                >
                    ‹
                </button>
                <span className="font-sans text-sm font-semibold tracking-widest uppercase text-[#2a1810]">
                    {nomesMeses[mesAtual]} {anoAtual}
                </span>
                <button
                    onClick={() => alterarMes(1)}
                    className="p-2 text-caramelo hover:bg-caramelo/10 rounded-full transition-colors font-bold"
                    aria-label="Próximo mês"
                >
                    ›
                </button>
            </div>

            {/* Grid do calendário */}
            <div>
                {/* Cabeçalho dos dias da semana */}
                <div className="grid grid-cols-7 gap-1 text-center mb-2">
                    {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map((d, index) => (
                        <div
                            key={`weekday-${index}`}
                            className="text-[0.62rem] font-bold text-gray-400 uppercase tracking-wider"
                        >
                            {d}
                        </div>
                    ))}
                </div>

                {/* Dias */}
                <div className="grid grid-cols-7 gap-1 text-center">
                    {diasVazios.map(v => <div key={`empty-${v}`} />)}

                    {dias.map(dia => {
                        const dataDesteDia = new Date(anoAtual, mesAtual, dia);
                        const hojeSemHoras = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate());
                        const diaNoPassado = dataDesteDia < hojeSemHoras;

                        // Verifica se o profissional trabalha nesse dia da semana
                        const diaSemana = dataDesteDia.getDay();
                        const diaNaoAtende =
                            diasAtivos !== undefined && diasAtivos.length > 0
                                ? !diasAtivos.includes(diaSemana)
                                : false;

                        const disabled = diaNoPassado || carregando || diaNaoAtende;
                        const selecionado = diaSelecionado === dia;

                        let className = 'p-2 rounded-lg text-sm font-medium transition-all duration-200 border ';

                        if (selecionado) {
                            className += 'bg-caramelo text-white border-caramelo shadow-md ';
                        } else if (disabled) {
                            className += 'text-gray-300 cursor-not-allowed border-transparent opacity-50 ';
                            if (diaNaoAtende && !diaNoPassado) {
                                // Dia de folga do profissional — tooltip implícito via title
                                className += 'line-through ';
                            }
                        } else {
                            className += 'bg-white text-gray-700 border-gray-100 hover:border-caramelo/50 hover:bg-caramelo/5 cursor-pointer ';
                        }

                        return (
                            <button
                                key={`dia-${dia}`}
                                disabled={disabled}
                                onClick={() => setDiaSelecionado(dia)}
                                title={diaNaoAtende && !diaNoPassado ? 'Profissional não atende neste dia' : undefined}
                                className={className}
                                aria-pressed={selecionado}
                                aria-label={`${dia} de ${nomesMeses[mesAtual]}`}
                            >
                                {dia}
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* Legenda quando há filtro de dias */}
            {diasAtivos !== undefined && diasAtivos.length < 7 && (
                <p className="text-[0.6rem] text-center text-gray-400 font-light">
                    Dias riscados: profissional não atende
                </p>
            )}
        </div>
    );
}