'use server'

import { prisma } from '@/lib/prisma';

export async function criarAgendamentoMultiplo(
    clienteId: string,
    funcionarioId: string,
    dataHoraInicio: Date,
    servicosIds: string[]
) {
    const TEMPO_BUFFER_MINUTOS = 5;

    try {
        // 1. Validar se foram selecionados serviços
        if (!servicosIds || servicosIds.length === 0) {
            return { sucesso: false, erro: 'Selecione pelo menos um serviço.' };
        }

        // 2. Procurar os serviços no banco de dados para garantir os preços e tempos reais
        const servicos = await prisma.servico.findMany({
            where: { id: { in: servicosIds } }
        });

        if (servicos.length !== servicosIds.length) {
            return { sucesso: false, erro: 'Um ou mais serviços são inválidos.' };
        }

        // 3. Calcular o valor bruto e o tempo total
        let valorBruto = 0;
        let tempoTotalMinutos = 0;

        const itensParaCriar = servicos.map(s => {
            valorBruto += (s.preco || 0);
            tempoTotalMinutos += (s.tempoMinutos || 30); // 30 min padrão se não houver tempo definido
            return {
                servicoId: s.id,
                precoCobrado: s.preco
            };
        });

        // 4. Calcular janela de bloqueio na agenda
        const tempoTotalBloqueio = tempoTotalMinutos + TEMPO_BUFFER_MINUTOS;
        const dataHoraFim = new Date(dataHoraInicio.getTime() + tempoTotalBloqueio * 60000);

        // 5. Verificar choques de horário
        const conflito = await prisma.agendamento.findFirst({
            where: {
                funcionarioId: funcionarioId,
                concluido: false,
                AND: [
                    { dataHoraInicio: { lt: dataHoraFim } },
                    { dataHoraFim: { gt: dataHoraInicio } }
                ]
            }
        });

        if (conflito) {
            return {
                sucesso: false,
                erro: 'Choque de horários. O profissional não tem agenda disponível para este intervalo total.'
            };
        }

        // 6. Inserir o agendamento e os seus múltiplos serviços atrelados (Transação segura)
        const novoAgendamento = await prisma.agendamento.create({
            data: {
                clienteId,
                funcionarioId,
                valorBruto,
                taxas: 0,
                dataHoraInicio,
                dataHoraFim,
                concluido: false,
                servicos: {
                    create: itensParaCriar
                }
            }
        });

        return { sucesso: true, agendamentoId: novoAgendamento.id };

    } catch (error) {
        console.error('Erro na orquestração do agendamento múltiplo:', error);
        return { sucesso: false, erro: 'Falha técnica ao processar a reserva.' };
    }
}

// Lógica para listar a agenda completa do salão, do mais recente para o mais antigo
export async function listarAgendamentosGlobais() {
    try {
        const agendamentos = await prisma.agendamento.findMany({
            orderBy: { dataHoraInicio: 'desc' },
            include: {
                cliente: { select: { nome: true, anonimizado: true, telefone: true } },
                funcionario: { select: { nome: true } }
            }
        });
        return { sucesso: true, agendamentos };
    } catch (error) {
        return { sucesso: false, agendamentos: [] };
    }
}

// Lógica para o admin cancelar um agendamento (exclusão estrita apenas para itens não faturados)
export async function cancelarAgendamentoPendente(id: string) {
    try {
        const agendamento = await prisma.agendamento.findUnique({ where: { id } });

        // Trava financeira inegociável: não apaga comandas que já geraram receita
        if (agendamento?.concluido) {
            return { sucesso: false, erro: 'Não é possível cancelar uma comanda que já foi faturada e enviada ao caixa.' };
        }

        await prisma.agendamento.delete({ where: { id } });
        return { sucesso: true };
    } catch (error) {
        return { sucesso: false, erro: 'Falha técnica ao tentar cancelar o agendamento.' };
    }
}