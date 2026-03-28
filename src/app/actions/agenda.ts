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
    servicoIds: string[]
) {
    if (!servicoIds || servicoIds.length === 0) return [];

    // Passo B: Obter a duração total dos serviços que o cliente deseja agendar
    const servicos = await prisma.servico.findMany({
        where: { id: { in: servicoIds } },
        select: { id: true, tempoMinutos: true }
    });

    const duracaoServico = servicos.reduce((acc, s) => acc + (s.tempoMinutos || 0), 0);

    // Evitar erro fatal se o serviço não tiver tempo cadastrado (assume 30 minutos como padrão)
    const tempoFinal = duracaoServico > 0 ? duracaoServico : 30;

    // Passo C: Determinar o dia da semana com Parsing Manual para evitar Bug de Fuso Horário (UTC-3)
    const [ano, mes, dia] = dataString.split('-').map(Number);
    const dataAlvo = new Date(ano, mes - 1, dia); // O mês no JS começa em 0
    const diaSemana = dataAlvo.getDay(); // 0 = Domingo, ..., 6 = Sábado

    let profissionaisRelevantes = [];

    if (funcionarioId) {
        // Se um profissional específico foi selecionado
        const prof = await prisma.funcionario.findUnique({
            where: { id: funcionarioId, ativo: true },
            select: { id: true, servicos: { select: { id: true } } }
        });

        if (prof) {
            // CORREÇÃO: Se o profissional não tem serviços atrelados na base (length === 0), assumimos que ele faz TODOS.
            const fazTodos = prof.servicos.length === 0 || servicos.every(sReq => prof.servicos.some(sProf => sProf.id === sReq.id));
            if (fazTodos) profissionaisRelevantes.push(prof.id);
        }
    } else {
        // "Qualquer profissional" - busca quem faz todos os serviços e está ativo
        const todosProfissionais = await prisma.funcionario.findMany({
            where: { ativo: true },
            select: { id: true, servicos: { select: { id: true } } }
        });

        profissionaisRelevantes = todosProfissionais
            .filter(prof => prof.servicos.length === 0 || servicos.every(sReq => prof.servicos.some(sProf => sProf.id === sReq.id)))
            .map(p => p.id);
    }

    if (profissionaisRelevantes.length === 0) return [];

    const horariosDisponiveisGlobal = new Set<string>();

    // Limites do dia (Horário Local) para buscar agendamentos
    const inicioDoDia = new Date(ano, mes - 1, dia, 0, 0, 0);
    const fimDoDia = new Date(ano, mes - 1, dia, 23, 59, 59);

    for (const pId of profissionaisRelevantes) {
        // Passo D: Buscar as regras de expediente do profissional para o dia da semana
        const expediente = await prisma.expediente.findUnique({
            where: {
                funcionarioId_diaSemana: {
                    funcionarioId: pId,
                    diaSemana
                }
            }
        });

        // Se o registro não existir ou o funcionário não trabalhar neste dia
        if (!expediente || !expediente.ativo) continue;

        // Passo E: Buscar todos os agendamentos já marcados para este profissional neste dia
        const agendamentos = await prisma.agendamento.findMany({
            where: {
                funcionarioId: pId,
                dataHoraInicio: { gte: inicioDoDia },
                dataHoraFim: { lte: fimDoDia },
                canceladoEm: null // CORREÇÃO: Não bloquear horários de agendamentos cancelados
            },
            select: { dataHoraInicio: true, dataHoraFim: true }
        });

        // Mapear os agendamentos existentes para minutos baseado na hora local
        const bloqueios = agendamentos.map(ag => {
            const inicioMins = ag.dataHoraInicio.getHours() * 60 + ag.dataHoraInicio.getMinutes();
            const fimMins = ag.dataHoraFim.getHours() * 60 + ag.dataHoraFim.getMinutes();
            return { inicio: inicioMins, fim: fimMins };
        });

        // Passo F: O Motor de Geração e Validação de Vagas (Slots)
        const inicioExpediente = converterParaMinutos(expediente.horaInicio);
        const fimExpediente = converterParaMinutos(expediente.horaFim);

        const intervaloDeBusca = 15; // Testar vagas a cada 15 minutos
        let tempoAtual = inicioExpediente;

        // Enquanto a hora avaliada mais o tempo total dos serviços não ultrapassar o fim do turno
        while (tempoAtual + tempoFinal <= fimExpediente) {
            const slotInicio = tempoAtual;
            const slotFim = tempoAtual + tempoFinal;

            // Verificar se a vaga testada colide com algum agendamento já guardado
            const temConflito = bloqueios.some(bloqueio => {
                // Existe colisão se o inicio desejado for antes do fim do bloqueio 
                // E o fim desejado for depois do inicio do bloqueio
                return slotInicio < bloqueio.fim && slotFim > bloqueio.inicio;
            });

            // Se a vaga passou no teste, é adicionada ao Set (o Set já impede duplicidades de horários se 2 profissionais estiverem livres na mesma hora)
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