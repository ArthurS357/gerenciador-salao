import React, { useState, useEffect } from 'react';
import { obterHorariosDisponiveis } from '@/app/actions/agenda';
import { Calendario } from './Calendario';
import { GradeHorarios } from './GradeHorarios';
import type { ModalAgendamentoProps } from './types';

export function ModalAgendamento({
    isOpen,
    onClose,
    servicosSelecionados,
    profissionalId,
    onConfirmar
}: ModalAgendamentoProps) {
    const hoje = new Date();
    const [mesAtual, setMesAtual] = useState(hoje.getMonth());
    const [anoAtual, setAnoAtual] = useState(hoje.getFullYear());

    const [diaSelecionado, setDiaSelecionado] = useState<number | null>(null);
    const [horariosDoDia, setHorariosDoDia] = useState<string[]>([]);
    const [carregando, setCarregando] = useState(false);

    const alterarMes = (delta: number) => {
        let novoMes = mesAtual + delta;
        let novoAno = anoAtual;

        if (novoMes < 0) {
            novoMes = 11;
            novoAno--;
        } else if (novoMes > 11) {
            novoMes = 0;
            novoAno++;
        }

        // Bloqueia navegação para meses passados
        if (novoAno < hoje.getFullYear() || (novoAno === hoje.getFullYear() && novoMes < hoje.getMonth())) {
            return;
        }

        setMesAtual(novoMes);
        setAnoAtual(novoAno);
        setDiaSelecionado(null);
        setHorariosDoDia([]);
    };

    // Comunicação com o backend (Server Action)
    useEffect(() => {
        if (!diaSelecionado || servicosSelecionados.length === 0) return;

        let ativo = true;

        const buscarHorarios = async () => {
            setCarregando(true);
            try {
                const mesFormatado = String(mesAtual + 1).padStart(2, '0');
                const diaFormatado = String(diaSelecionado).padStart(2, '0');
                const dataCalendario = `${anoAtual}-${mesFormatado}-${diaFormatado}`;

                // Extrai apenas os IDs em um array de strings, que é o formato exigido pela Server Action
                const idsServicos = servicosSelecionados.map(s => s.id);

                const vagas = await obterHorariosDisponiveis(profissionalId || undefined, dataCalendario, idsServicos);

                if (ativo) {
                    setHorariosDoDia(vagas);
                }
            } catch (erro) {
                console.error("Erro ao buscar horários", erro);
                if (ativo) setHorariosDoDia([]);
            } finally {
                if (ativo) setCarregando(false);
            }
        };

        buscarHorarios();

        return () => { ativo = false; };
    }, [diaSelecionado, mesAtual, anoAtual, profissionalId, servicosSelecionados]);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-[#0e0905]/80 backdrop-blur-sm p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg p-6 md:p-8 flex flex-col gap-6 animate-in fade-in zoom-in duration-200">

                <div className="flex justify-between items-center border-b border-[rgba(197,168,124,0.2)] pb-4">
                    <div>
                        <h2 className="text-2xl font-serif font-light text-[#2a1810]">Escolha seu Horário</h2>
                        <p className="text-xs text-gray-500 font-sans mt-1">Selecione uma data para ver as opções.</p>
                    </div>
                    <button onClick={onClose} className="text-gray-400 hover:text-caramelo transition-colors w-8 h-8 flex items-center justify-center rounded-full hover:bg-caramelo/10">
                        ✕
                    </button>
                </div>

                <Calendario
                    mesAtual={mesAtual}
                    anoAtual={anoAtual}
                    diaSelecionado={diaSelecionado}
                    carregando={carregando}
                    alterarMes={alterarMes}
                    setDiaSelecionado={setDiaSelecionado}
                />

                <div className="border-t border-[rgba(197,168,124,0.2)] pt-4 min-h-[120px]">
                    <GradeHorarios
                        diaSelecionado={diaSelecionado}
                        mesAtual={mesAtual}
                        anoAtual={anoAtual}
                        horariosDoDia={horariosDoDia}
                        carregando={carregando}
                        onConfirmar={onConfirmar}
                        onClose={onClose}
                    />
                </div>

            </div>
        </div>
    );
}