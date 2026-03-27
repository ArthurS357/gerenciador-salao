'use server';

import { prisma } from '@/lib/prisma';

// Passo A: Funções auxiliares para matemática de horas
function converterParaMinutos(horaString: string): number {
    const [horas, minutos] = horaString.split(':').map(Number);
    return horas * 60 + minutos;
}

function formatarMinutos(minutosTotais: number): string {
    const horas = Math.floor(minutosTotais / 60);
    const minutos = minutosTotais % 60;
    return `${horas.toString().padStart(2, '0')}:${minutos.toString().padStart(2, '0')}`;
}

export async function obterHorariosDisponiveis(
    funcionarioId: string | undefined,
    dataString: string, // Esperado no formato "YYYY-MM-DD"
    servicoIds: string[] // Modificado para receber array de IDs
) {
    if (!servicoIds || servicoIds.length === 0) return [];

    // Passo B: Obter a duração total dos serviços que o cliente deseja agendar
    const servicos = await prisma.servico.findMany({
        where: { id: { in: servicoIds } },
        select: { id: true, tempoMinutos: true }
    });

    const duracaoServico = servicos.reduce((acc, s) => acc + (s.tempoMinutos || 0), 0);

    if (duracaoServico === 0) {
        throw new Error("Serviços não encontrados ou sem tempo definido na base de dados.");
    }

    // Passo C: Determinar o dia da semana utilizando UTC para evitar falhas de fuso horário
    const dataAlvo = new Date(`${dataString}T00:00:00Z`);
    const diaSemana = dataAlvo.getUTCDay(); // 0 = Domingo, ..., 6 = Sábado

    let profissionaisRelevantes = [];

    if (funcionarioId) {
        // Se um profissional específico foi selecionado
        const prof = await prisma.funcionario.findUnique({
            where: { id: funcionarioId, ativo: true },
            select: { id: true, servicos: { select: { id: true } } }
        });
        
        if (prof) {
            // Verifica se o profissional faz todos os serviços solicitados
            const fazTodos = servicos.every(sReq => prof.servicos.some(sProf => sProf.id === sReq.id));
            if (fazTodos) profissionaisRelevantes.push(prof.id);
        }
    } else {
        // "Qualquer profissional" - busca quem faz todos os serviços e está ativo
        const todosProfissionais = await prisma.funcionario.findMany({
            where: { ativo: true },
            select: { id: true, servicos: { select: { id: true } } }
        });

        profissionaisRelevantes = todosProfissionais
            .filter(prof => servicos.every(sReq => prof.servicos.some(sProf => sProf.id === sReq.id)))
            .map(p => p.id);
    }

    if (profissionaisRelevantes.length === 0) return [];

    const horariosDisponiveisGlobal = new Set<string>();

    for (const pId of profissionaisRelevantes) {
        // Passo D: Buscar as regras de expediente do profissional para o dia em questão
        const expediente = await prisma.expediente.findUnique({
            where: {
                funcionarioId_diaSemana: {
                    funcionarioId: pId,
                    diaSemana
                }
            }
        });

        // Se o registo não existir ou o funcionário não trabalhar neste dia
        if (!expediente || !expediente.ativo) continue;

        // Passo E: Buscar todos os agendamentos já marcados para este profissional neste dia
        const inicioDoDia = new Date(`${dataString}T00:00:00Z`);
        const fimDoDia = new Date(`${dataString}T23:59:59Z`);

        const agendamentos = await prisma.agendamento.findMany({
            where: {
                funcionarioId: pId,
                dataHoraInicio: { gte: inicioDoDia },
                dataHoraFim: { lte: fimDoDia }
            },
            select: { dataHoraInicio: true, dataHoraFim: true }
        });

        // Mapear os agendamentos existentes para a nossa métrica base (minutos)
        const bloqueios = agendamentos.map(ag => {
            const inicioMins = ag.dataHoraInicio.getUTCHours() * 60 + ag.dataHoraInicio.getUTCMinutes();
            const fimMins = ag.dataHoraFim.getUTCHours() * 60 + ag.dataHoraFim.getUTCMinutes();
            return { inicio: inicioMins, fim: fimMins };
        });

        // Passo F: O Motor de Geração e Validação de Vagas (Slots)
        const inicioExpediente = converterParaMinutos(expediente.horaInicio);
        const fimExpediente = converterParaMinutos(expediente.horaFim);

        const intervaloDeBusca = 15; // Testar vagas a cada 15 minutos
        let tempoAtual = inicioExpediente;

        // Enquanto a hora avaliada mais o tempo total dos serviços não ultrapassar o fim do turno
        while (tempoAtual + duracaoServico <= fimExpediente) {
            const slotInicio = tempoAtual;
            const slotFim = tempoAtual + duracaoServico;

            // Verificar se a vaga testada colide com algum agendamento já guardado
            const temConflito = bloqueios.some(bloqueio => {
                return slotInicio < bloqueio.fim && slotFim > bloqueio.inicio;
            });

            // Se a vaga passou no teste, é adicionada ao Set para evitar duplicidade de horários
            if (!temConflito) {
                horariosDisponiveisGlobal.add(formatarMinutos(slotInicio));
            }

            // Avançar 15 minutos para testar a próxima possibilidade
            tempoAtual += intervaloDeBusca;
        }
    }

    // Retornar os horários ordenados
    return Array.from(horariosDisponiveisGlobal).sort((a, b) => converterParaMinutos(a) - converterParaMinutos(b));
}