'use server';

import { prisma } from '@/lib/prisma';
import { formatInTimeZone, toZonedTime } from 'date-fns-tz';

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

    const duracaoServico = servicos.reduce((acc, s) => acc + (s.tempoMinutos || 0), 0);

    // 1. Correção: Inclusão da regra de buffer idêntica à de criação (Split-Brain evitado)
    const TEMPO_BUFFER_MINUTOS = Number(process.env.TEMPO_BUFFER_MINUTOS) || 5;
    const tempoFinal = (duracaoServico > 0 ? duracaoServico : 30) + TEMPO_BUFFER_MINUTOS;

    // 2. Correção: Parsing à prova de Fuso Horário (Timezone Safe)
    // O sufixo -03:00 obriga o motor do Node a interpretar as bordas do dia exatamente na hora de Brasília
    const inicioDoDiaUTC = new Date(`${dataString}T00:00:00-03:00`);
    const fimDoDiaUTC = new Date(`${dataString}T23:59:59-03:00`);

    // Descobre o dia da semana manipulando a string local em ZonedTime para não retroagir dia no UTC
    const dataAlvoZoned = toZonedTime(`${dataString}T12:00:00Z`, FUSO);
    const diaSemana = dataAlvoZoned.getDay();

    let profissionaisRelevantes: string[] = [];

    if (funcionarioId) {
        const prof = await prisma.funcionario.findUnique({
            where: { id: funcionarioId, ativo: true },
            select: { id: true, servicos: { select: { id: true } } }
        });

        if (prof) {
            const fazTodos = prof.servicos.length === 0 || servicos.every(sReq => prof.servicos.some(sProf => sProf.id === sReq.id));
            if (fazTodos) profissionaisRelevantes.push(prof.id);
        }
    } else {
        const todosProfissionais = await prisma.funcionario.findMany({
            where: { ativo: true },
            select: { id: true, servicos: { select: { id: true } } }
        });

        profissionaisRelevantes = todosProfissionais
            .filter(prof => prof.servicos.length === 0 || servicos.every(sReq => prof.servicos.some(sProf => sProf.id === sReq.id)))
            .map(p => p.id);
    }

    if (profissionaisRelevantes.length === 0) return [];

    // 3. Correção de Performance: Morte das N+1 Queries
    // Busca todos os expedientes e agendamentos com apenas duas requisições globais
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
            concluido: false,
            canceladoEm: null,
            // Cobre eventos que começam antes ou terminam depois do dia, mas invadem a grade de hoje
            dataHoraInicio: { lt: fimDoDiaUTC },
            dataHoraFim: { gt: inicioDoDiaUTC }
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

        // Extração protegida via date-fns-tz
        const bloqueios = agendamentosProf.map(ag => {
            const inicioH = Number(formatInTimeZone(ag.dataHoraInicio, FUSO, 'H'));
            const inicioM = Number(formatInTimeZone(ag.dataHoraInicio, FUSO, 'm'));
            const fimH = Number(formatInTimeZone(ag.dataHoraFim, FUSO, 'H'));
            const fimM = Number(formatInTimeZone(ag.dataHoraFim, FUSO, 'm'));

            // Corrige se o agendamento iniciou ontem à noite (trava desde o minuto 00:00)
            const inicioMinutos = ag.dataHoraInicio < inicioDoDiaUTC ? 0 : (inicioH * 60 + inicioM);
            const fimMinutos = ag.dataHoraFim > fimDoDiaUTC ? 1440 : (fimH * 60 + fimM);

            return { inicio: inicioMinutos, fim: fimMinutos };
        });

        const inicioExpediente = converterParaMinutos(expediente.horaInicio);
        const fimExpediente = converterParaMinutos(expediente.horaFim);

        const intervaloDeBusca = 15;
        let tempoAtual = inicioExpediente;

        while (tempoAtual + tempoFinal <= fimExpediente) {
            const slotInicio = tempoAtual;
            const slotFim = tempoAtual + tempoFinal;

            // 4. Correção: Bloqueio de horário no passado
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