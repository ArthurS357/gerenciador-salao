'use server';

import { prisma } from '@/lib/prisma';
import { RoleFuncionario, StatusAgendamento } from '@prisma/client';
import { formatInTimeZone, toZonedTime, fromZonedTime } from 'date-fns-tz';

const FUSO = 'America/Sao_Paulo';

function converterParaMinutos(horaString: string): number {
    const [horas, minutos] = horaString.split(':').map(Number);
    return (horas * 60) + (minutos || 0);
}

function formatarMinutos(minutosTotais: number): string {
    const horas = Math.floor(minutosTotais / 60);
    const minutos = minutosTotais % 60;
    return `${horas.toString().padStart(2, '0')}:${minutos.toString().padStart(2, '0')}`;
}

export async function obterHorariosDisponiveis(
    funcionarioId: string | undefined,
    dataString: string, // Formato "YYYY-MM-DD"
    servicoIds: string[]
) {
    if (!servicoIds || servicoIds.length === 0) return [];

    const servicos = await prisma.servico.findMany({
        where: { id: { in: servicoIds } },
        select: { id: true, tempoMinutos: true }
    });

    if (servicos.length !== servicoIds.length) return []; // Prevenção contra IDs fantasma

    const duracaoServico = servicos.reduce((acc, s) => acc + (s.tempoMinutos || 0), 0);

    const rawBuffer = process.env.TEMPO_BUFFER_MINUTOS;
    const TEMPO_BUFFER_MINUTOS = rawBuffer !== undefined ? Number(rawBuffer) : 5;
    const tempoFinal = (duracaoServico > 0 ? duracaoServico : 30) + TEMPO_BUFFER_MINUTOS;

    // ── CORREÇÃO DE TIMEZONE (DST-Proof) ───────────────────────────────────────
    // Converte a "meia-noite" do fuso local exato do dia solicitado para o UTC real,
    // eliminando o bug de assumir que o fuso será eternamente -03:00.
    const inicioDoDiaUTC = fromZonedTime(`${dataString}T00:00:00`, FUSO);
    const fimDoDiaUTC = fromZonedTime(`${dataString}T23:59:59`, FUSO);

    // Obtém o dia da semana a partir do UTC convertido, de forma segura
    const diaSemana = toZonedTime(inicioDoDiaUTC, FUSO).getDay();

    let profissionaisRelevantes: string[] = [];

    // ── CORREÇÃO DE REGRA DE NEGÓCIO (Fim da Onipotência) ─────────────────────
    if (funcionarioId) {
        const prof = await prisma.funcionario.findUnique({
            where: { id: funcionarioId, ativo: true },
            select: { id: true, servicos: { select: { id: true } } }
        });

        if (prof) {
            // O profissional OBRIGATORIAMENTE deve ter os serviços no seu escopo (length > 0)
            const fazTodos = prof.servicos.length > 0 && servicos.every(sReq => prof.servicos.some(sProf => sProf.id === sReq.id));
            if (fazTodos) profissionaisRelevantes.push(prof.id);
        }
    } else {
        const todosProfissionais = await prisma.funcionario.findMany({
            where: { ativo: true, role: RoleFuncionario.PROFISSIONAL }, // Filtra apenas profissionais
            select: { id: true, servicos: { select: { id: true } } }
        });

        profissionaisRelevantes = todosProfissionais
            .filter(prof => prof.servicos.length > 0 && servicos.every(sReq => prof.servicos.some(sProf => sProf.id === sReq.id)))
            .map(p => p.id);
    }

    if (profissionaisRelevantes.length === 0) return [];

    // ── OTIMIZAÇÃO (Batched Queries Globais) ──────────────────────────────────
    const expedientesGlobais = await prisma.expediente.findMany({
        where: {
            funcionarioId: { in: profissionaisRelevantes },
            diaSemana,
            ativo: true
        }
    });

    const agendamentosGlobais = await prisma.agendamento.findMany({
        where: {
            funcionarioId: { in: profissionaisRelevantes },
            status: { in: [StatusAgendamento.AGENDADO, StatusAgendamento.CONFIRMADO, StatusAgendamento.EM_ATENDIMENTO] },
            dataHoraInicio: { lte: fimDoDiaUTC }, // Usado 'lte/gte' para cobrir exatamente as margens
            dataHoraFim: { gte: inicioDoDiaUTC }
        },
        select: { funcionarioId: true, dataHoraInicio: true, dataHoraFim: true }
    });

    const horariosDisponiveisGlobal = new Set<string>();

    const agora = new Date();
    const isHoje = dataString === formatInTimeZone(agora, FUSO, 'yyyy-MM-dd');
    const agoraSP = toZonedTime(agora, FUSO);
    const agoraMinutos = (agoraSP.getHours() * 60) + agoraSP.getMinutes();

    for (const pId of profissionaisRelevantes) {
        const expediente = expedientesGlobais.find(e => e.funcionarioId === pId);
        if (!expediente) continue;

        const agendamentosProf = agendamentosGlobais.filter(ag => ag.funcionarioId === pId);

        // ── CORREÇÃO DE PERFORMANCE (CPU Aritmética vs String Parser) ─────────
        const bloqueios = agendamentosProf.map(ag => {
            const inicioSP = toZonedTime(ag.dataHoraInicio, FUSO);
            const fimSP = toZonedTime(ag.dataHoraFim, FUSO);

            const inicioMinutosRaw = (inicioSP.getHours() * 60) + inicioSP.getMinutes();
            const fimMinutosRaw = (fimSP.getHours() * 60) + fimSP.getMinutes();

            // Interseta blocos noturnos/madrugada que invadem o dia atual
            const inicioMinutos = ag.dataHoraInicio <= inicioDoDiaUTC ? 0 : inicioMinutosRaw;
            const fimMinutos = ag.dataHoraFim >= fimDoDiaUTC ? 1440 : fimMinutosRaw;

            return { inicio: inicioMinutos, fim: fimMinutos };
        });

        const inicioExpediente = converterParaMinutos(expediente.horaInicio);
        const fimExpediente = converterParaMinutos(expediente.horaFim);

        const intervaloDeBusca = 15;
        let tempoAtual = inicioExpediente;

        while (tempoAtual + tempoFinal <= fimExpediente) {
            const slotInicio = tempoAtual;
            const slotFim = tempoAtual + tempoFinal;

            // Bloqueia marcações no passado se o dia pesquisado for o dia atual
            if (isHoje && slotInicio <= agoraMinutos) {
                tempoAtual += intervaloDeBusca;
                continue;
            }

            const temConflito = bloqueios.some(bloqueio => {
                return slotInicio < bloqueio.fim && slotFim > bloqueio.inicio;
            });

            if (!temConflito) {
                horariosDisponiveisGlobal.add(formatarMinutos(slotInicio));
            }

            tempoAtual += intervaloDeBusca;
        }
    }

    return Array.from(horariosDisponiveisGlobal).sort((a, b) => converterParaMinutos(a) - converterParaMinutos(b));
}

/**
 * Retorna os índices dos dias da semana em que o profissional tem expediente ativo.
 * 0 = Domingo … 6 = Sábado.
 * Se nenhum profissional for informado, retorna todos os dias (sem filtro).
 */
export async function obterDiasAtivosDoFuncionario(
    funcionarioId: string | undefined
): Promise<number[]> {
    if (!funcionarioId) return [0, 1, 2, 3, 4, 5, 6];

    try {
        const expedientes = await prisma.expediente.findMany({
            where: { funcionarioId, ativo: true },
            select: { diaSemana: true },
        });

        // Se o profissional não tiver expediente configurado, não bloqueia o calendário
        if (expedientes.length === 0) return [0, 1, 2, 3, 4, 5, 6];

        return expedientes.map(e => e.diaSemana);
    } catch {
        // Em caso de falha, não bloqueia o fluxo do usuário
        return [0, 1, 2, 3, 4, 5, 6];
    }
}
