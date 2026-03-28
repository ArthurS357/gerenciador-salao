import React from 'react';

interface GradeHorariosProps {
    diaSelecionado: number | null;
    mesAtual: number;
    anoAtual: number;
    horariosDoDia: string[];
    carregando: boolean;
    onConfirmar: (dataIso: string, hora: string) => void;
    onClose: () => void;
}

export function GradeHorarios({
    diaSelecionado, mesAtual, anoAtual, horariosDoDia, carregando, onConfirmar, onClose
}: GradeHorariosProps) {
    const nomesMeses = [
        'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
        'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
    ];

    if (!diaSelecionado) {
        return <p className="text-sm text-center text-gray-400 font-light py-6">Selecione um dia no calendário acima.</p>;
    }

    if (carregando) {
        return <p className="text-sm text-center text-caramelo font-light py-6 animate-pulse">Buscando agenda da equipe...</p>;
    }

    if (horariosDoDia.length === 0) {
        return (
            <div className="text-center py-4 bg-red-50 rounded-lg border border-red-100 mt-2">
                <p className="text-sm text-red-500 font-medium">Sem profissionais disponíveis</p>
                <p className="text-xs text-red-400 mt-1">Tente escolher outro dia ou remover algum serviço.</p>
            </div>
        );
    }

    return (
        <div className="flex flex-col gap-3">
            <h3 className="text-xs font-semibold tracking-widest uppercase text-gray-500 text-center mb-2">
                Horários Livres para {diaSelecionado} de {nomesMeses[mesAtual]}
            </h3>
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 max-h-[180px] overflow-y-auto pr-1">
                {horariosDoDia.map(hora => {
                    const mesFormatado = String(mesAtual + 1).padStart(2, '0');
                    const diaFormatado = String(diaSelecionado).padStart(2, '0');
                    const dataIso = `${anoAtual}-${mesFormatado}-${diaFormatado}`;

                    return (
                        <button
                            key={hora}
                            onClick={() => {
                                onConfirmar(dataIso, hora);
                                onClose();
                            }}
                            className="py-2 px-1 border border-caramelo/30 rounded-md text-sm font-medium text-caramelo hover:bg-caramelo hover:text-white transition-colors"
                        >
                            {hora}
                        </button>
                    );
                })}
            </div>
        </div>
    );
}