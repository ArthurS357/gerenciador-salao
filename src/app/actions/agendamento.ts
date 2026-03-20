'use server'

import { prisma } from '@/lib/prisma';

const prisma = new PrismaClient();

// Passo 1 e 2: Definir a função com os parâmetros essenciais
export async function criarAgendamentoComBuffer(
    clienteId: string,
    funcionarioId: string,
    dataHoraInicio: Date,
    tempoServicoMinutos: number,
    valorBruto: number
) {
    // A trava sistêmica inegociável exigida pela arquitetura
    const TEMPO_BUFFER_MINUTOS = 5;

    // Passo 3: Calcular o tempo total de bloqueio e o horário de término
    const tempoTotalBloqueio = tempoServicoMinutos + TEMPO_BUFFER_MINUTOS;
    // Multiplicamos por 60000 para converter minutos em milissegundos
    const dataHoraFim = new Date(dataHoraInicio.getTime() + tempoTotalBloqueio * 60000);

    try {
        // Passo 4: Consultar o banco de dados para checar choques de horário
        // A lógica 'lt' (less than) e 'gt' (greater than) cruza as janelas de tempo
        const conflito = await prisma.agendamento.findFirst({
            where: {
                funcionarioId: funcionarioId,
                AND: [
                    { dataHoraInicio: { lt: dataHoraFim } },
                    { dataHoraFim: { gt: dataHoraInicio } }
                ]
            }
        });

        if (conflito) {
            return {
                sucesso: false,
                erro: 'Choque de horários detectado. A agenda bloqueia encaixes neste ínterim.'
            };
        }

        // Passo 5: Inserir o agendamento de forma isolada e segura
        const novoAgendamento = await prisma.agendamento.create({
            data: {
                clienteId,
                funcionarioId,
                valorBruto,
                taxas: 0, // Será preenchido no fechamento (Módulo V)
                dataHoraInicio,
                dataHoraFim,
                concluido: false
            }
        });

        return { sucesso: true, agendamentoId: novoAgendamento.id };

    } catch (error) {
        console.error('Erro na orquestração do agendamento:', error);
        return { sucesso: false, erro: 'Falha técnica ao processar a reserva.' };
    }
}