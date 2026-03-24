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
    funcionarioId: string,
    dataString: string, // Esperado no formato "YYYY-MM-DD"
    servicoId: string
) {
    // Passo B: Obter a duração do serviço que o cliente deseja agendar
    const servico = await prisma.servico.findUnique({
        where: { id: servicoId },
        select: { tempoMinutos: true }
    });

    if (!servico || !servico.tempoMinutos) {
        throw new Error("Serviço não encontrado ou sem tempo definido na base de dados.");
    }

    const duracaoServico = servico.tempoMinutos;

    // Passo C: Determinar o dia da semana utilizando UTC para evitar falhas de fuso horário
    const dataAlvo = new Date(`${dataString}T00:00:00Z`);
    const diaSemana = dataAlvo.getUTCDay(); // 0 = Domingo, ..., 6 = Sábado

    // Passo D: Buscar as regras de expediente do profissional para o dia em questão
    const expediente = await prisma.expediente.findUnique({
        where: {
            funcionarioId_diaSemana: {
                funcionarioId,
                diaSemana
            }
        }
    });

    // Se o registo não existir ou o funcionário não trabalhar neste dia
    if (!expediente || !expediente.ativo) {
        return [];
    }

    // Passo E: Buscar todos os agendamentos já marcados para este profissional neste dia
    const inicioDoDia = new Date(`${dataString}T00:00:00Z`);
    const fimDoDia = new Date(`${dataString}T23:59:59Z`);

    const agendamentos = await prisma.agendamento.findMany({
        where: {
            funcionarioId,
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

    const horariosDisponiveis: string[] = [];
    const intervaloDeBusca = 15; // Testar vagas a cada 15 minutos

    let tempoAtual = inicioExpediente;

    // Enquanto a hora avaliada mais o tempo do serviço não ultrapassarem o fim do turno
    while (tempoAtual + duracaoServico <= fimExpediente) {
        const slotInicio = tempoAtual;
        const slotFim = tempoAtual + duracaoServico;

        // Verificar se a vaga testada colide com algum agendamento já guardado
        const temConflito = bloqueios.some(bloqueio => {
            // Existe sobreposição SE: O início da vaga desejada for antes do fim do bloqueio 
            // E o fim da vaga desejada ultrapassar o início do bloqueio
            return slotInicio < bloqueio.fim && slotFim > bloqueio.inicio;
        });

        // Se a vaga passou no teste, é adicionada ao array de retorno
        if (!temConflito) {
            horariosDisponiveis.push(formatarMinutos(slotInicio));
        }

        // Avançar 15 minutos para testar a próxima possibilidade
        tempoAtual += intervaloDeBusca;
    }

    return horariosDisponiveis;
}