'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { obterHorariosDisponiveis, obterDiasAtivosDoFuncionario } from '@/app/actions/agenda';
import { Calendario } from './Calendario';
import { GradeHorarios } from './GradeHorarios';
import type { ModalAgendamentoProps, AgendamentoConfirmado } from './types';

export function ModalAgendamento({
    isOpen,
    onClose,
    servicosSelecionados,
    profissionalId,
    onConfirmar,
}: ModalAgendamentoProps) {
    const hoje = new Date();

    // ── Estado do wizard ─────────────────────────────────────────────────────
    const [stepAtual, setStepAtual] = useState(0);
    const [resultadosParciais, setResultadosParciais] = useState<AgendamentoConfirmado[]>([]);

    // ── Estado do calendário (por step) ──────────────────────────────────────
    const [mesAtual, setMesAtual] = useState(hoje.getMonth());
    const [anoAtual, setAnoAtual] = useState(hoje.getFullYear());
    const [diaSelecionado, setDiaSelecionado] = useState<number | null>(null);
    const [horariosDoDia, setHorariosDoDia] = useState<string[]>([]);
    const [carregando, setCarregando] = useState(false);

    // ── Dias trabalhados pelo profissional ───────────────────────────────────
    const [diasAtivos, setDiasAtivos] = useState<number[] | undefined>(undefined);

    const totalServicos = servicosSelecionados.length;
    const servicoAtual = servicosSelecionados[stepAtual];

    // ── Reseta tudo quando o modal abre ──────────────────────────────────────
    useEffect(() => {
        if (isOpen) {
            setStepAtual(0);
            setResultadosParciais([]);
            resetCalendario();
        }
    }, [isOpen]); // eslint-disable-line react-hooks/exhaustive-deps

    // ── Busca dias ativos quando o profissional muda ou modal abre ───────────
    useEffect(() => {
        if (!isOpen) return;
        let ativo = true;

        const fetchDias = async () => {
            const dias = await obterDiasAtivosDoFuncionario(profissionalId || undefined);
            if (ativo) setDiasAtivos(dias);
        };

        fetchDias();
        return () => { ativo = false; };
    }, [isOpen, profissionalId]);

    // ── Escape key + body scroll lock ────────────────────────────────────────
    useEffect(() => {
        if (!isOpen) return;

        const handleKey = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose();
        };
        document.addEventListener('keydown', handleKey);
        document.body.style.overflow = 'hidden';

        return () => {
            document.removeEventListener('keydown', handleKey);
            document.body.style.overflow = '';
        };
    }, [isOpen, onClose]);

    // ── Busca horários quando o dia é selecionado ────────────────────────────
    useEffect(() => {
        if (!diaSelecionado || !servicoAtual) return;

        let ativo = true;

        const buscarHorarios = async () => {
            setCarregando(true);
            try {
                const mesFormatado = String(mesAtual + 1).padStart(2, '0');
                const diaFormatado = String(diaSelecionado).padStart(2, '0');
                const dataCalendario = `${anoAtual}-${mesFormatado}-${diaFormatado}`;

                // Busca somente para o serviço do step atual
                const vagas = await obterHorariosDisponiveis(
                    profissionalId || undefined,
                    dataCalendario,
                    [servicoAtual.id],
                );

                if (ativo) setHorariosDoDia(vagas);
            } catch {
                if (ativo) setHorariosDoDia([]);
            } finally {
                if (ativo) setCarregando(false);
            }
        };

        buscarHorarios();
        return () => { ativo = false; };
    }, [diaSelecionado, mesAtual, anoAtual, profissionalId, servicoAtual]);

    // ── Helpers ──────────────────────────────────────────────────────────────
    const resetCalendario = () => {
        setMesAtual(hoje.getMonth());
        setAnoAtual(hoje.getFullYear());
        setDiaSelecionado(null);
        setHorariosDoDia([]);
    };

    const alterarMes = useCallback((delta: number) => {
        setMesAtual(prev => {
            let novoMes = prev + delta;
            let novoAno = anoAtual;

            if (novoMes < 0) { novoMes = 11; novoAno--; }
            else if (novoMes > 11) { novoMes = 0; novoAno++; }

            const agora = new Date();
            if (
                novoAno < agora.getFullYear() ||
                (novoAno === agora.getFullYear() && novoMes < agora.getMonth())
            ) return prev;

            setAnoAtual(novoAno);
            setDiaSelecionado(null);
            setHorariosDoDia([]);
            return novoMes;
        });
    }, [anoAtual]);

    // ── Horário selecionado pelo usuário em um step ──────────────────────────
    const handleHorarioSelecionado = (dataIso: string, hora: string) => {
        if (!servicoAtual) return;

        const novoResultado: AgendamentoConfirmado = {
            servicoId: servicoAtual.id,
            dataIso,
            hora,
        };

        // Substitui resultado anterior para o serviço atual (caso usuário volte e reselecione)
        const novosResultados = [
            ...resultadosParciais.filter(r => r.servicoId !== servicoAtual.id),
            novoResultado,
        ];

        if (stepAtual < totalServicos - 1) {
            // Ainda há serviços a agendar → avança para o próximo step
            setResultadosParciais(novosResultados);
            setStepAtual(prev => prev + 1);
            resetCalendario();
        } else {
            // Último (ou único) serviço → confirma tudo e fecha
            // Ordena resultados conforme a ordem original dos serviços selecionados
            const ordenados = servicosSelecionados.map(s =>
                novosResultados.find(r => r.servicoId === s.id)!
            ).filter(Boolean);

            onConfirmar(ordenados);
            onClose();
        }
    };

    // ── Voltar para step anterior ────────────────────────────────────────────
    const voltarStep = () => {
        setStepAtual(prev => prev - 1);
        resetCalendario();
    };

    // ── Formata data para exibição ────────────────────────────────────────────
    const formatarDataHora = (dataIso: string, hora: string) =>
        new Intl.DateTimeFormat('pt-BR', {
            day: '2-digit',
            month: 'short',
        }).format(new Date(`${dataIso}T${hora}`)).replace('.', '') + ` · ${hora}`;

    if (!isOpen) return null;

    return (
        <div
            className="fixed inset-0 z-[100] flex items-center justify-center bg-[#0e0905]/80 backdrop-blur-sm p-4"
            role="dialog"
            aria-modal="true"
            aria-label="Selecionar horário"
        >
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg flex flex-col gap-0 animate-in fade-in zoom-in duration-200 overflow-hidden max-h-[92vh]">

                {/* ── Cabeçalho ── */}
                <div className="flex justify-between items-start border-b border-[rgba(197,168,124,0.2)] p-6 pb-4 flex-shrink-0">
                    <div>
                        <h2 className="text-2xl font-serif font-light text-[#2a1810]">
                            {totalServicos === 1
                                ? 'Escolha seu Horário'
                                : `Serviço ${stepAtual + 1} de ${totalServicos}`}
                        </h2>
                        {totalServicos > 1 && servicoAtual && (
                            <p className="text-sm font-semibold text-[#2a1810]/80 mt-0.5 font-sans">
                                {servicoAtual.nome}
                                {servicoAtual.tempoMinutos && (
                                    <span className="ml-2 text-xs font-normal text-gray-400">
                                        ({servicoAtual.tempoMinutos} min)
                                    </span>
                                )}
                            </p>
                        )}
                        <p className="text-xs text-gray-500 font-sans mt-1">
                            Selecione uma data para ver os horários disponíveis.
                        </p>
                    </div>
                    <button
                        onClick={onClose}
                        className="text-gray-400 hover:text-caramelo transition-colors w-8 h-8 flex items-center justify-center rounded-full hover:bg-caramelo/10 flex-shrink-0"
                        aria-label="Fechar"
                    >
                        ✕
                    </button>
                </div>

                {/* ── Progress bar (multi-serviço) ── */}
                {totalServicos > 1 && (
                    <div className="px-6 pt-4 pb-2 flex-shrink-0">
                        <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
                            {servicosSelecionados.map((s, i) => {
                                const confirmado = resultadosParciais.find(r => r.servicoId === s.id);
                                const isAtual = i === stepAtual;
                                const isCompleto = !!confirmado;
                                const isPendente = !isAtual && !isCompleto;

                                return (
                                    <div
                                        key={s.id}
                                        className={[
                                            'flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap border transition-colors',
                                            isCompleto
                                                ? 'bg-green-50 border-green-200 text-green-700'
                                                : isAtual
                                                    ? 'bg-caramelo/10 border-caramelo/40 text-[#2a1810]'
                                                    : 'bg-gray-50 border-gray-200 text-gray-400',
                                        ].join(' ')}
                                    >
                                        <span>{isCompleto ? '✓' : i + 1}</span>
                                        <span className={isPendente ? 'opacity-60' : ''}>{s.nome}</span>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}

                {/* ── Resumo de horários já confirmados ── */}
                {resultadosParciais.length > 0 && (
                    <div className="px-6 pt-2 flex-shrink-0 space-y-1.5">
                        {resultadosParciais.map(r => {
                            const s = servicosSelecionados.find(sv => sv.id === r.servicoId);
                            return (
                                <div
                                    key={r.servicoId}
                                    className="flex items-center justify-between text-xs py-1.5 px-3 bg-green-50 rounded-lg border border-green-100"
                                >
                                    <span className="text-green-700 font-semibold font-sans">{s?.nome}</span>
                                    <span className="text-green-600 font-mono">
                                        {formatarDataHora(r.dataIso, r.hora)}
                                    </span>
                                </div>
                            );
                        })}
                    </div>
                )}

                {/* ── Calendário ── */}
                <div className="px-6 pt-4 flex-shrink-0">
                    <Calendario
                        mesAtual={mesAtual}
                        anoAtual={anoAtual}
                        diaSelecionado={diaSelecionado}
                        carregando={carregando}
                        alterarMes={alterarMes}
                        setDiaSelecionado={setDiaSelecionado}
                        diasAtivos={diasAtivos}
                    />
                </div>

                {/* ── Grade de horários ── */}
                <div className="px-6 pt-3 pb-5 border-t border-[rgba(197,168,124,0.15)] mt-3 min-h-[120px] flex-shrink-0">
                    <GradeHorarios
                        diaSelecionado={diaSelecionado}
                        mesAtual={mesAtual}
                        anoAtual={anoAtual}
                        horariosDoDia={horariosDoDia}
                        carregando={carregando}
                        onConfirmar={handleHorarioSelecionado}
                    />
                </div>

                {/* ── Rodapé: botão "Voltar" (multi-step) ── */}
                {stepAtual > 0 && (
                    <div className="px-6 pb-5 pt-0 flex-shrink-0 border-t border-gray-50">
                        <button
                            onClick={voltarStep}
                            className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-[#2a1810] transition-colors mt-3 font-sans font-medium"
                        >
                            ← Voltar para {servicosSelecionados[stepAtual - 1]?.nome}
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}