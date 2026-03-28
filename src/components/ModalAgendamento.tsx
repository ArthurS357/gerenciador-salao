import React, { useState, useEffect, useRef } from 'react';

// ── Tipos ────────────────────────────────────────────────────────────────────

interface ServicoSelecionado {
    id: string;
    nome: string;
    tempoMinutos: number | null;
}

interface HorarioDisponivel {
    funcionarioId: string;
    funcionarioNome: string;
    horarios: string[];
}

interface ModalAgendamentoProps {
    isOpen: boolean;
    onClose: () => void;
    servicosSelecionados: ServicoSelecionado[];
}

// ── Constantes ────────────────────────────────────────────────────────────────

const MESES = [
    'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
];

const DIAS_SEMANA_CURTO = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

// ── Ícone SVG de fechar ───────────────────────────────────────────────────────

function IconeFechar() {
    return (
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
            <path d="M1 1l12 12M13 1L1 13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
    );
}

// ── Ícone de calendário ───────────────────────────────────────────────────────

function IconeCalendario() {
    return (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
            <line x1="16" y1="2" x2="16" y2="6" />
            <line x1="8" y1="2" x2="8" y2="6" />
            <line x1="3" y1="10" x2="21" y2="10" />
        </svg>
    );
}

// ── Ícone de relógio ──────────────────────────────────────────────────────────

function IconeRelogio() {
    return (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" />
            <polyline points="12 6 12 12 16 14" />
        </svg>
    );
}

// ── Ícone de check ────────────────────────────────────────────────────────────

function IconeCheck() {
    return (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="20 6 9 17 4 12" />
        </svg>
    );
}

// ── Spinner ───────────────────────────────────────────────────────────────────

function Spinner() {
    return (
        <svg className="animate-spin" width="18" height="18" viewBox="0 0 24 24" fill="none">
            <circle className="opacity-20" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
            <path className="opacity-80" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
    );
}

// ── Componente Principal ──────────────────────────────────────────────────────

export function ModalAgendamento({ isOpen, onClose, servicosSelecionados }: ModalAgendamentoProps) {
    const [servicoAtual, setServicoAtual] = useState<string>(servicosSelecionados[0]?.id || '');
    const [dataAtual, setDataAtual] = useState(new Date());
    const [diaSelecionado, setDiaSelecionado] = useState<number | null>(null);
    const [diasDisponiveis, setDiasDisponiveis] = useState<number[]>([]);
    const [horariosDoDia, setHorariosDoDia] = useState<HorarioDisponivel[]>([]);
    const [horarioSelecionado, setHorarioSelecionado] = useState<{ hora: string; profissional: HorarioDisponivel } | null>(null);
    const [carregandoDias, setCarregandoDias] = useState(false);
    const [carregandoHorarios, setCarregandoHorarios] = useState(false);
    const [confirmando, setConfirmando] = useState(false);
    const [confirmado, setConfirmado] = useState(false);
    const overlayRef = useRef<HTMLDivElement>(null);

    const mes = dataAtual.getMonth();
    const ano = dataAtual.getFullYear();
    const hoje = new Date();
    const primeiroDia = new Date(ano, mes, 1).getDay();
    const diasNoMes = new Date(ano, mes + 1, 0).getDate();

    // Busca dias disponíveis ao trocar serviço ou mês
    useEffect(() => {
        if (!servicoAtual || !isOpen) return;
        let ativo = true;

        const buscar = async () => {
            setCarregandoDias(true);
            setDiaSelecionado(null);
            setHorariosDoDia([]);
            setHorarioSelecionado(null);

            await new Promise(r => setTimeout(r, 400));

            if (ativo) {
                setDiasDisponiveis([5, 12, 15, 22, 27]);
                setCarregandoDias(false);
            }
        };

        buscar();
        return () => { ativo = false; };
    }, [servicoAtual, mes, ano, isOpen]);

    // Busca horários ao selecionar dia
    useEffect(() => {
        if (!diaSelecionado || !servicoAtual) return;
        let ativo = true;

        const buscar = async () => {
            setCarregandoHorarios(true);
            setHorarioSelecionado(null);

            await new Promise(r => setTimeout(r, 350));

            if (ativo) {
                setHorariosDoDia([
                    {
                        funcionarioId: '1',
                        funcionarioNome: 'Ana Beatriz',
                        horarios: ['09:00', '10:30', '14:00', '15:30', '17:00'],
                    },
                    {
                        funcionarioId: '2',
                        funcionarioNome: 'Carlos Mendes',
                        horarios: ['11:00', '13:30', '16:00'],
                    },
                ]);
                setCarregandoHorarios(false);
            }
        };

        buscar();
        return () => { ativo = false; };
    }, [diaSelecionado, servicoAtual]);

    // Fecha ao pressionar Escape
    const handleClose = () => {
        setConfirmado(false);
        setHorarioSelecionado(null);
        setDiaSelecionado(null);
        onClose();
    };
    useEffect(() => {
        if (!isOpen) return;
        const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') handleClose(); };
        document.addEventListener('keydown', onKey);
        return () => document.removeEventListener('keydown', onKey);
    }, [isOpen]);

    // Bloqueia scroll do body
    useEffect(() => {
        document.body.style.overflow = isOpen ? 'hidden' : '';
        return () => { document.body.style.overflow = ''; };
    }, [isOpen]);





    const mudarMes = (direcao: number) => {
        setDataAtual(new Date(ano, mes + direcao, 1));
    };

    const handleConfirmar = async () => {
        if (!horarioSelecionado) return;
        setConfirmando(true);
        await new Promise(r => setTimeout(r, 1200));
        setConfirmando(false);
        setConfirmado(true);
    };

    if (!isOpen) return null;

    const servicoInfo = servicosSelecionados.find(s => s.id === servicoAtual);
    const dataSelecionadaFormatada = diaSelecionado
        ? new Intl.DateTimeFormat('pt-BR', { weekday: 'long', day: '2-digit', month: 'long' })
            .format(new Date(ano, mes, diaSelecionado))
        : null;

    // ── Tela de confirmação ───────────────────────────────────────────────────
    if (confirmado && horarioSelecionado && diaSelecionado) {
        return (
            <div
                className="fixed inset-0 z-[200] flex items-center justify-center p-4"
                style={{ background: 'rgba(14,9,5,0.92)' }}
            >
                <div
                    className="w-full max-w-md text-center"
                    style={{
                        animation: 'modalSlideUp 0.4s cubic-bezier(0.16,1,0.3,1) forwards',
                    }}
                >
                    {/* Ícone de sucesso */}
                    <div className="flex items-center justify-center mb-8">
                        <div
                            className="w-20 h-20 flex items-center justify-center"
                            style={{
                                background: 'rgba(197,168,124,0.12)',
                                border: '1px solid rgba(197,168,124,0.3)',
                                clipPath: 'polygon(12px 0,100% 0,100% calc(100% - 12px),calc(100% - 12px) 100%,0 100%,0 12px)',
                            }}
                        >
                            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#c5a87c" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <polyline points="20 6 9 17 4 12" />
                            </svg>
                        </div>
                    </div>

                    <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: '0.65rem', fontWeight: 500, letterSpacing: '0.25em', textTransform: 'uppercase', color: 'rgba(197,168,124,0.6)', marginBottom: '0.75rem' }}>
                        Reserva Confirmada
                    </p>
                    <h2 style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: '2rem', fontWeight: 300, color: 'rgba(255,255,255,0.9)', marginBottom: '1.5rem', lineHeight: 1.2 }}>
                        Até breve no <em style={{ fontStyle: 'italic', color: '#c5a87c' }}>Estúdio</em>
                    </h2>

                    {/* Resumo da reserva */}
                    <div
                        style={{
                            background: 'rgba(197,168,124,0.05)',
                            border: '1px solid rgba(197,168,124,0.15)',
                            padding: '1.5rem',
                            marginBottom: '2rem',
                            clipPath: 'polygon(8px 0,100% 0,100% calc(100% - 8px),calc(100% - 8px) 100%,0 100%,0 8px)',
                        }}
                    >
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                            {[
                                { label: 'Serviço', valor: servicoInfo?.nome ?? '' },
                                { label: 'Profissional', valor: horarioSelecionado.profissional.funcionarioNome },
                                { label: 'Data', valor: dataSelecionadaFormatada ?? '' },
                                { label: 'Horário', valor: horarioSelecionado.hora },
                            ].map(({ label, valor }) => (
                                <div key={label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: '0.7rem', letterSpacing: '0.12em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.3)' }}>
                                        {label}
                                    </span>
                                    <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: '0.85rem', color: 'rgba(255,255,255,0.8)', fontWeight: 500 }}>
                                        {valor}
                                    </span>
                                </div>
                            ))}
                        </div>
                    </div>

                    <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: '0.78rem', color: 'rgba(255,255,255,0.3)', marginBottom: '2rem', fontWeight: 300 }}>
                        Uma confirmação foi enviada ao seu WhatsApp.
                    </p>

                    <button
                        onClick={handleClose}
                        style={{
                            width: '100%',
                            padding: '1rem',
                            background: '#c5a87c',
                            color: '#0e0905',
                            fontFamily: "'DM Sans', sans-serif",
                            fontSize: '0.72rem',
                            fontWeight: 600,
                            letterSpacing: '0.2em',
                            textTransform: 'uppercase',
                            border: 'none',
                            cursor: 'pointer',
                            clipPath: 'polygon(6px 0,100% 0,100% calc(100% - 6px),calc(100% - 6px) 100%,0 100%,0 6px)',
                            transition: 'background 0.2s',
                        }}
                        onMouseEnter={e => (e.currentTarget.style.background = '#d4b896')}
                        onMouseLeave={e => (e.currentTarget.style.background = '#c5a87c')}
                    >
                        Fechar
                    </button>
                </div>

                <style>{`
                    @keyframes modalSlideUp {
                        from { opacity: 0; transform: translateY(24px); }
                        to { opacity: 1; transform: translateY(0); }
                    }
                `}</style>
            </div>
        );
    }

    // ── Modal principal ───────────────────────────────────────────────────────
    return (
        <>
            <style>{`
                @keyframes modalSlideUp {
                    from { opacity: 0; transform: translateY(32px); }
                    to { opacity: 1; transform: translateY(0); }
                }
                @keyframes overlayFade {
                    from { opacity: 0; }
                    to { opacity: 1; }
                }
                .slot-btn:hover { 
                    border-color: rgba(197,168,124,0.7) !important; 
                    background: rgba(197,168,124,0.08) !important;
                    color: #c5a87c !important;
                }
                .slot-btn-active {
                    background: rgba(197,168,124,0.15) !important;
                    border-color: #c5a87c !important;
                    color: #c5a87c !important;
                }
                .dia-btn:hover {
                    border-color: rgba(197,168,124,0.4) !important;
                    background: rgba(197,168,124,0.06) !important;
                }
                .mes-btn:hover {
                    color: rgba(197,168,124,0.9) !important;
                }
                .servico-tab:hover {
                    border-color: rgba(197,168,124,0.3) !important;
                    color: rgba(255,255,255,0.7) !important;
                }
            `}</style>

            {/* Overlay */}
            <div
                ref={overlayRef}
                onClick={(e) => { if (e.target === overlayRef.current) handleClose(); }}
                style={{
                    position: 'fixed',
                    inset: 0,
                    zIndex: 200,
                    background: 'rgba(10,6,3,0.88)',
                    backdropFilter: 'blur(8px)',
                    WebkitBackdropFilter: 'blur(8px)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '1rem',
                    animation: 'overlayFade 0.3s ease forwards',
                }}
            >
                {/* Modal container */}
                <div
                    role="dialog"
                    aria-modal="true"
                    aria-label="Agendar horário"
                    style={{
                        width: '100%',
                        maxWidth: '600px',
                        maxHeight: '92dvh',
                        display: 'flex',
                        flexDirection: 'column',
                        background: '#150d09',
                        border: '1px solid rgba(197,168,124,0.12)',
                        boxShadow: '0 32px 80px rgba(0,0,0,0.7), 0 0 0 1px rgba(197,168,124,0.06)',
                        clipPath: 'polygon(14px 0,100% 0,100% calc(100% - 14px),calc(100% - 14px) 100%,0 100%,0 14px)',
                        animation: 'modalSlideUp 0.45s cubic-bezier(0.16,1,0.3,1) forwards',
                        overflow: 'hidden',
                    }}
                >
                    {/* Header */}
                    <div style={{
                        padding: '1.75rem 2rem 1.25rem',
                        borderBottom: '1px solid rgba(197,168,124,0.08)',
                        flexShrink: 0,
                        position: 'relative',
                    }}>
                        {/* Linha decorativa topo */}
                        <div style={{
                            position: 'absolute',
                            top: 0,
                            left: '2rem',
                            right: '2rem',
                            height: '1px',
                            background: 'linear-gradient(to right, transparent, rgba(197,168,124,0.3), transparent)',
                        }} />

                        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '1rem' }}>
                            <div>
                                <p style={{
                                    fontFamily: "'DM Sans', sans-serif",
                                    fontSize: '0.58rem',
                                    fontWeight: 500,
                                    letterSpacing: '0.28em',
                                    textTransform: 'uppercase',
                                    color: 'rgba(197,168,124,0.55)',
                                    marginBottom: '0.4rem',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '0.5rem',
                                }}>
                                    <span style={{ color: '#c5a87c', opacity: 0.7 }}><IconeCalendario /></span>
                                    Escolha o seu horário
                                </p>
                                <h2 style={{
                                    fontFamily: "'Cormorant Garamond', serif",
                                    fontSize: '1.65rem',
                                    fontWeight: 400,
                                    color: 'rgba(255,255,255,0.88)',
                                    letterSpacing: '-0.01em',
                                    lineHeight: 1.15,
                                }}>
                                    Agendamento <em style={{ fontStyle: 'italic', color: '#c5a87c' }}>Online</em>
                                </h2>
                            </div>

                            {/* Botão fechar */}
                            <button
                                onClick={handleClose}
                                aria-label="Fechar modal de agendamento"
                                style={{
                                    width: '2rem',
                                    height: '2rem',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    color: 'rgba(255,255,255,0.3)',
                                    background: 'rgba(255,255,255,0.04)',
                                    border: '1px solid rgba(255,255,255,0.06)',
                                    borderRadius: '4px',
                                    cursor: 'pointer',
                                    transition: 'all 0.2s',
                                    flexShrink: 0,
                                }}
                                onMouseEnter={e => {
                                    e.currentTarget.style.color = 'rgba(255,255,255,0.7)';
                                    e.currentTarget.style.borderColor = 'rgba(197,168,124,0.3)';
                                }}
                                onMouseLeave={e => {
                                    e.currentTarget.style.color = 'rgba(255,255,255,0.3)';
                                    e.currentTarget.style.borderColor = 'rgba(255,255,255,0.06)';
                                }}
                            >
                                <IconeFechar />
                            </button>
                        </div>

                        {/* Tabs de serviços */}
                        {servicosSelecionados.length > 1 && (
                            <div style={{
                                display: 'flex',
                                gap: '0.5rem',
                                marginTop: '1.25rem',
                                overflowX: 'auto',
                                paddingBottom: '2px',
                            }}>
                                {servicosSelecionados.map(s => (
                                    <button
                                        key={s.id}
                                        className="servico-tab"
                                        onClick={() => setServicoAtual(s.id)}
                                        style={{
                                            padding: '0.4rem 0.875rem',
                                            fontFamily: "'DM Sans', sans-serif",
                                            fontSize: '0.72rem',
                                            fontWeight: 500,
                                            letterSpacing: '0.06em',
                                            whiteSpace: 'nowrap',
                                            cursor: 'pointer',
                                            transition: 'all 0.2s',
                                            border: servicoAtual === s.id
                                                ? '1px solid rgba(197,168,124,0.5)'
                                                : '1px solid rgba(255,255,255,0.08)',
                                            background: servicoAtual === s.id
                                                ? 'rgba(197,168,124,0.1)'
                                                : 'transparent',
                                            color: servicoAtual === s.id
                                                ? '#c5a87c'
                                                : 'rgba(255,255,255,0.4)',
                                            borderRadius: '3px',
                                        }}
                                    >
                                        {s.nome}
                                    </button>
                                ))}
                            </div>
                        )}

                        {/* Serviço único */}
                        {servicosSelecionados.length === 1 && servicoInfo && (
                            <div style={{
                                marginTop: '1rem',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.625rem',
                                padding: '0.5rem 0.875rem',
                                background: 'rgba(197,168,124,0.06)',
                                border: '1px solid rgba(197,168,124,0.15)',
                                borderRadius: '3px',
                                width: 'fit-content',
                            }}>
                                <span style={{ color: 'rgba(197,168,124,0.7)' }}><IconeRelogio /></span>
                                <span style={{
                                    fontFamily: "'DM Sans', sans-serif",
                                    fontSize: '0.72rem',
                                    color: 'rgba(197,168,124,0.85)',
                                    fontWeight: 500,
                                    letterSpacing: '0.04em',
                                }}>
                                    {servicoInfo.nome}
                                    {servicoInfo.tempoMinutos && (
                                        <span style={{ color: 'rgba(197,168,124,0.5)', marginLeft: '0.5rem' }}>
                                            · {servicoInfo.tempoMinutos} min
                                        </span>
                                    )}
                                </span>
                            </div>
                        )}
                    </div>

                    {/* Corpo scrollável */}
                    <div style={{ flex: 1, overflowY: 'auto', padding: '1.5rem 2rem' }}>

                        {/* ── Calendário ── */}
                        <div style={{ marginBottom: '1.5rem' }}>

                            {/* Navegação de mês */}
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
                                <button
                                    className="mes-btn"
                                    onClick={() => mudarMes(-1)}
                                    aria-label="Mês anterior"
                                    style={{
                                        width: '2rem',
                                        height: '2rem',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        color: 'rgba(255,255,255,0.35)',
                                        background: 'none',
                                        border: '1px solid rgba(255,255,255,0.07)',
                                        borderRadius: '3px',
                                        cursor: 'pointer',
                                        transition: 'color 0.2s',
                                    }}
                                >
                                    <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                                        <path d="M15 18l-6-6 6-6" strokeLinecap="round" strokeLinejoin="round" />
                                    </svg>
                                </button>

                                <div style={{ textAlign: 'center' }}>
                                    <p style={{
                                        fontFamily: "'Cormorant Garamond', serif",
                                        fontSize: '1.15rem',
                                        fontWeight: 400,
                                        color: 'rgba(255,255,255,0.8)',
                                        letterSpacing: '0.02em',
                                        textTransform: 'capitalize',
                                    }}>
                                        {MESES[mes]}
                                        <span style={{ color: 'rgba(197,168,124,0.5)', marginLeft: '0.5rem', fontSize: '0.95rem' }}>
                                            {ano}
                                        </span>
                                    </p>
                                </div>

                                <button
                                    className="mes-btn"
                                    onClick={() => mudarMes(1)}
                                    aria-label="Próximo mês"
                                    style={{
                                        width: '2rem',
                                        height: '2rem',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        color: 'rgba(255,255,255,0.35)',
                                        background: 'none',
                                        border: '1px solid rgba(255,255,255,0.07)',
                                        borderRadius: '3px',
                                        cursor: 'pointer',
                                        transition: 'color 0.2s',
                                    }}
                                >
                                    <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                                        <path d="M9 18l6-6-6-6" strokeLinecap="round" strokeLinejoin="round" />
                                    </svg>
                                </button>
                            </div>

                            {/* Nomes dos dias */}
                            <div style={{
                                display: 'grid',
                                gridTemplateColumns: 'repeat(7, 1fr)',
                                marginBottom: '0.625rem',
                            }}>
                                {DIAS_SEMANA_CURTO.map(d => (
                                    <div key={d} style={{
                                        textAlign: 'center',
                                        fontFamily: "'DM Sans', sans-serif",
                                        fontSize: '0.62rem',
                                        fontWeight: 600,
                                        letterSpacing: '0.1em',
                                        textTransform: 'uppercase',
                                        color: 'rgba(255,255,255,0.2)',
                                        padding: '0.25rem 0',
                                    }}>
                                        {d}
                                    </div>
                                ))}
                            </div>

                            {/* Células dos dias */}
                            {carregandoDias ? (
                                <div style={{
                                    height: '180px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    color: 'rgba(197,168,124,0.5)',
                                    gap: '0.625rem',
                                }}>
                                    <Spinner />
                                    <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: '0.8rem', fontWeight: 300 }}>
                                        Verificando disponibilidade...
                                    </span>
                                </div>
                            ) : (
                                <div style={{
                                    display: 'grid',
                                    gridTemplateColumns: 'repeat(7, 1fr)',
                                    gap: '0.25rem',
                                }}>
                                    {/* Espaços vazios antes do primeiro dia */}
                                    {Array.from({ length: primeiroDia }).map((_, i) => (
                                        <div key={`empty-${i}`} />
                                    ))}

                                    {Array.from({ length: diasNoMes }).map((_, i) => {
                                        const dia = i + 1;
                                        const disponivel = diasDisponiveis.includes(dia);
                                        const selecionado = diaSelecionado === dia;
                                        const eHoje = dia === hoje.getDate() && mes === hoje.getMonth() && ano === hoje.getFullYear();
                                        const passado = new Date(ano, mes, dia) < new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate());

                                        return (
                                            <button
                                                key={dia}
                                                className={disponivel && !passado && !selecionado ? 'dia-btn' : ''}
                                                disabled={!disponivel || passado}
                                                onClick={() => setDiaSelecionado(dia)}
                                                aria-label={`${dia} de ${MESES[mes]}${disponivel ? ' — disponível' : ''}`}
                                                aria-pressed={selecionado}
                                                style={{
                                                    aspectRatio: '1',
                                                    display: 'flex',
                                                    flexDirection: 'column',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    gap: '2px',
                                                    fontFamily: "'DM Sans', sans-serif",
                                                    fontSize: '0.82rem',
                                                    fontWeight: selecionado ? 700 : disponivel ? 500 : 400,
                                                    cursor: disponivel && !passado ? 'pointer' : 'default',
                                                    transition: 'all 0.15s ease',
                                                    border: selecionado
                                                        ? '1px solid #c5a87c'
                                                        : eHoje
                                                            ? '1px solid rgba(197,168,124,0.3)'
                                                            : disponivel && !passado
                                                                ? '1px solid rgba(255,255,255,0.06)'
                                                                : '1px solid transparent',
                                                    background: selecionado
                                                        ? 'rgba(197,168,124,0.2)'
                                                        : eHoje
                                                            ? 'rgba(197,168,124,0.06)'
                                                            : 'transparent',
                                                    color: selecionado
                                                        ? '#c5a87c'
                                                        : disponivel && !passado
                                                            ? 'rgba(255,255,255,0.85)'
                                                            : 'rgba(255,255,255,0.18)',
                                                    borderRadius: '3px',
                                                    position: 'relative',
                                                }}
                                            >
                                                {dia}
                                                {/* Ponto indicador de disponibilidade */}
                                                {disponivel && !passado && !selecionado && (
                                                    <span style={{
                                                        width: '3px',
                                                        height: '3px',
                                                        borderRadius: '50%',
                                                        background: '#c5a87c',
                                                        opacity: 0.6,
                                                    }} />
                                                )}
                                                {selecionado && (
                                                    <span style={{
                                                        width: '3px',
                                                        height: '3px',
                                                        borderRadius: '50%',
                                                        background: '#c5a87c',
                                                    }} />
                                                )}
                                            </button>
                                        );
                                    })}
                                </div>
                            )}
                        </div>

                        {/* ── Legenda ── */}
                        {!carregandoDias && (
                            <div style={{
                                display: 'flex',
                                gap: '1.25rem',
                                marginBottom: '1.5rem',
                                paddingTop: '0.75rem',
                                borderTop: '1px solid rgba(197,168,124,0.06)',
                            }}>
                                {[
                                    { cor: '#c5a87c', label: 'Disponível' },
                                    { cor: 'rgba(197,168,124,0.3)', label: 'Hoje' },
                                    { cor: 'rgba(255,255,255,0.15)', label: 'Indisponível' },
                                ].map(({ cor, label }) => (
                                    <div key={label} style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
                                        <span style={{
                                            width: '8px',
                                            height: '8px',
                                            borderRadius: '50%',
                                            background: cor,
                                            flexShrink: 0,
                                        }} />
                                        <span style={{
                                            fontFamily: "'DM Sans', sans-serif",
                                            fontSize: '0.68rem',
                                            color: 'rgba(255,255,255,0.3)',
                                            letterSpacing: '0.04em',
                                        }}>
                                            {label}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        )}

                        {/* ── Horários disponíveis ── */}
                        {diaSelecionado && (
                            <div style={{ animation: 'modalSlideUp 0.3s ease forwards' }}>
                                {/* Cabeçalho da seção */}
                                <div style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '0.75rem',
                                    marginBottom: '1rem',
                                }}>
                                    <div style={{
                                        width: '1.5px',
                                        height: '1.25rem',
                                        background: 'linear-gradient(to bottom, #c5a87c, transparent)',
                                        borderRadius: '1px',
                                    }} />
                                    <p style={{
                                        fontFamily: "'DM Sans', sans-serif",
                                        fontSize: '0.65rem',
                                        fontWeight: 600,
                                        letterSpacing: '0.18em',
                                        textTransform: 'uppercase',
                                        color: 'rgba(255,255,255,0.4)',
                                    }}>
                                        Horários disponíveis
                                        {dataSelecionadaFormatada && (
                                            <span style={{ color: 'rgba(197,168,124,0.6)', marginLeft: '0.5rem', textTransform: 'lowercase', fontWeight: 400 }}>
                                                — {dataSelecionadaFormatada}
                                            </span>
                                        )}
                                    </p>
                                </div>

                                {/* Estado de carregamento */}
                                {carregandoHorarios && (
                                    <div style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '0.75rem',
                                        padding: '1.5rem',
                                        color: 'rgba(197,168,124,0.5)',
                                        background: 'rgba(197,168,124,0.03)',
                                        border: '1px solid rgba(197,168,124,0.08)',
                                        borderRadius: '3px',
                                    }}>
                                        <Spinner />
                                        <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: '0.8rem', fontWeight: 300 }}>
                                            Carregando horários...
                                        </span>
                                    </div>
                                )}

                                {/* Lista de profissionais e slots */}
                                {!carregandoHorarios && horariosDoDia.length > 0 && (
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                                        {horariosDoDia.map(prof => (
                                            <div key={prof.funcionarioId}>
                                                {/* Nome do profissional */}
                                                <p style={{
                                                    fontFamily: "'DM Sans', sans-serif",
                                                    fontSize: '0.7rem',
                                                    fontWeight: 500,
                                                    color: 'rgba(255,255,255,0.45)',
                                                    letterSpacing: '0.1em',
                                                    marginBottom: '0.625rem',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    gap: '0.5rem',
                                                }}>
                                                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
                                                        <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" />
                                                        <circle cx="12" cy="7" r="4" />
                                                    </svg>
                                                    {prof.funcionarioNome}
                                                </p>

                                                {/* Grade de horários */}
                                                <div style={{
                                                    display: 'grid',
                                                    gridTemplateColumns: 'repeat(auto-fill, minmax(70px, 1fr))',
                                                    gap: '0.5rem',
                                                }}>
                                                    {prof.horarios.map(hora => {
                                                        const ativo = horarioSelecionado?.hora === hora && horarioSelecionado?.profissional.funcionarioId === prof.funcionarioId;

                                                        return (
                                                            <button
                                                                key={hora}
                                                                className={`slot-btn ${ativo ? 'slot-btn-active' : ''}`}
                                                                onClick={() => setHorarioSelecionado({ hora, profissional: prof })}
                                                                aria-pressed={ativo}
                                                                style={{
                                                                    padding: '0.625rem 0.5rem',
                                                                    fontFamily: "'DM Sans', sans-serif",
                                                                    fontSize: '0.85rem',
                                                                    fontWeight: ativo ? 700 : 500,
                                                                    letterSpacing: '0.04em',
                                                                    cursor: 'pointer',
                                                                    transition: 'all 0.15s ease',
                                                                    border: ativo
                                                                        ? '1px solid #c5a87c'
                                                                        : '1px solid rgba(255,255,255,0.09)',
                                                                    background: ativo
                                                                        ? 'rgba(197,168,124,0.15)'
                                                                        : 'rgba(255,255,255,0.03)',
                                                                    color: ativo
                                                                        ? '#c5a87c'
                                                                        : 'rgba(255,255,255,0.55)',
                                                                    borderRadius: '3px',
                                                                    display: 'flex',
                                                                    alignItems: 'center',
                                                                    justifyContent: 'center',
                                                                    gap: '0.3rem',
                                                                    position: 'relative',
                                                                }}
                                                            >
                                                                {ativo && (
                                                                    <span style={{ color: '#c5a87c', opacity: 0.8 }}>
                                                                        <IconeCheck />
                                                                    </span>
                                                                )}
                                                                {hora}
                                                            </button>
                                                        );
                                                    })}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}

                                {/* Nenhum horário disponível */}
                                {!carregandoHorarios && horariosDoDia.length === 0 && (
                                    <div style={{
                                        padding: '1.5rem',
                                        textAlign: 'center',
                                        background: 'rgba(235,87,87,0.04)',
                                        border: '1px solid rgba(235,87,87,0.12)',
                                        borderRadius: '3px',
                                    }}>
                                        <p style={{
                                            fontFamily: "'DM Sans', sans-serif",
                                            fontSize: '0.82rem',
                                            color: 'rgba(240,128,128,0.8)',
                                            fontWeight: 300,
                                            lineHeight: 1.5,
                                        }}>
                                            Sem disponibilidade neste dia.
                                            <br />
                                            <span style={{ color: 'rgba(255,255,255,0.35)', fontSize: '0.75rem' }}>
                                                Tente selecionar outra data no calendário.
                                            </span>
                                        </p>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Placeholder quando nenhum dia está selecionado */}
                        {!diaSelecionado && !carregandoDias && (
                            <div style={{
                                padding: '1.25rem',
                                textAlign: 'center',
                                border: '1px dashed rgba(197,168,124,0.12)',
                                borderRadius: '3px',
                                marginTop: '0.5rem',
                            }}>
                                <p style={{
                                    fontFamily: "'DM Sans', sans-serif",
                                    fontSize: '0.78rem',
                                    color: 'rgba(255,255,255,0.22)',
                                    fontWeight: 300,
                                    letterSpacing: '0.04em',
                                }}>
                                    Selecione um dia com ponto <span style={{ color: 'rgba(197,168,124,0.5)' }}>●</span> para ver os horários
                                </p>
                            </div>
                        )}
                    </div>

                    {/* ── Rodapé com CTA ── */}
                    <div style={{
                        padding: '1.25rem 2rem 1.75rem',
                        borderTop: '1px solid rgba(197,168,124,0.08)',
                        flexShrink: 0,
                        background: 'rgba(255,255,255,0.015)',
                    }}>
                        {/* Resumo da seleção */}
                        {horarioSelecionado && (
                            <div style={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                marginBottom: '1rem',
                                padding: '0.75rem 1rem',
                                background: 'rgba(197,168,124,0.06)',
                                border: '1px solid rgba(197,168,124,0.15)',
                                borderRadius: '3px',
                                animation: 'modalSlideUp 0.2s ease forwards',
                            }}>
                                <div>
                                    <p style={{
                                        fontFamily: "'DM Sans', sans-serif",
                                        fontSize: '0.62rem',
                                        color: 'rgba(197,168,124,0.6)',
                                        letterSpacing: '0.12em',
                                        textTransform: 'uppercase',
                                        marginBottom: '0.25rem',
                                    }}>
                                        Horário selecionado
                                    </p>
                                    <p style={{
                                        fontFamily: "'Cormorant Garamond', serif",
                                        fontSize: '1.1rem',
                                        color: 'rgba(255,255,255,0.85)',
                                        fontWeight: 400,
                                    }}>
                                        {horarioSelecionado.hora}
                                        <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.85rem', fontFamily: "'DM Sans', sans-serif", fontWeight: 300, marginLeft: '0.5rem' }}>
                                            com {horarioSelecionado.profissional.funcionarioNome}
                                        </span>
                                    </p>
                                </div>
                                <button
                                    onClick={() => setHorarioSelecionado(null)}
                                    aria-label="Remover seleção de horário"
                                    style={{
                                        width: '1.75rem',
                                        height: '1.75rem',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        color: 'rgba(255,255,255,0.25)',
                                        background: 'none',
                                        border: 'none',
                                        cursor: 'pointer',
                                        borderRadius: '3px',
                                        transition: 'color 0.15s',
                                    }}
                                    onMouseEnter={e => (e.currentTarget.style.color = 'rgba(255,255,255,0.6)')}
                                    onMouseLeave={e => (e.currentTarget.style.color = 'rgba(255,255,255,0.25)')}
                                >
                                    <IconeFechar />
                                </button>
                            </div>
                        )}

                        {/* Botão principal */}
                        <button
                            onClick={handleConfirmar}
                            disabled={!horarioSelecionado || confirmando}
                            style={{
                                width: '100%',
                                padding: '1rem',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '0.625rem',
                                fontFamily: "'DM Sans', sans-serif",
                                fontSize: '0.72rem',
                                fontWeight: 600,
                                letterSpacing: '0.2em',
                                textTransform: 'uppercase',
                                cursor: horarioSelecionado && !confirmando ? 'pointer' : 'not-allowed',
                                transition: 'all 0.25s ease',
                                border: 'none',
                                background: horarioSelecionado && !confirmando
                                    ? '#c5a87c'
                                    : 'rgba(255,255,255,0.06)',
                                color: horarioSelecionado && !confirmando
                                    ? '#2a1810'
                                    : 'rgba(255,255,255,0.2)',
                                clipPath: 'polygon(6px 0,100% 0,100% calc(100% - 6px),calc(100% - 6px) 100%,0 100%,0 6px)',
                                opacity: !horarioSelecionado ? 0.6 : 1,
                            }}
                            onMouseEnter={e => {
                                if (horarioSelecionado && !confirmando) {
                                    e.currentTarget.style.background = '#d4b896';
                                }
                            }}
                            onMouseLeave={e => {
                                if (horarioSelecionado && !confirmando) {
                                    e.currentTarget.style.background = '#c5a87c';
                                }
                            }}
                        >
                            {confirmando ? (
                                <>
                                    <Spinner />
                                    Confirmando reserva...
                                </>
                            ) : horarioSelecionado ? (
                                <>
                                    <IconeCheck />
                                    Confirmar Agendamento
                                </>
                            ) : (
                                'Selecione um horário'
                            )}
                        </button>

                        {/* Nota de privacidade */}
                        <p style={{
                            fontFamily: "'DM Sans', sans-serif",
                            fontSize: '0.62rem',
                            color: 'rgba(255,255,255,0.15)',
                            textAlign: 'center',
                            marginTop: '0.875rem',
                            fontWeight: 300,
                            letterSpacing: '0.03em',
                        }}>
                            A confirmação será enviada via WhatsApp · LGPD
                        </p>
                    </div>
                </div>
            </div>
        </>
    );
}