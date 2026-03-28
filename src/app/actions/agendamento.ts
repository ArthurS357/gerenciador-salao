'use server'

import { prisma } from '@/lib/prisma'
import { verificarNumeroExisteNoWhatsApp, enviarMensagemWhatsApp } from '@/lib/whatsapp'
import { formatInTimeZone } from 'date-fns-tz'
import { ptBR } from 'date-fns/locale'
import { verificarRateLimit } from '@/lib/rateLimit'
import { after } from 'next/server'

// ── Tipagens Estritas ─────────────────────────────────────────────────────────

type ActionResult<T = void> =
    | (T extends void ? { sucesso: true } : { sucesso: true } & T)
    | { sucesso: false; erro: string }

export type AgendaProfissionalItem = {
    id: string
    clienteId: string
    funcionarioId: string
    dataHoraInicio: Date
    dataHoraFim: Date
    valorBruto: number
    taxas: number
    concluido: boolean
    cliente: {
        nome: string
        telefone: string
    }
    servicos: {
        servico: {
            nome: string
            preco: number | null
            tempoMinutos: number | null
        }
    }[]
    produtos: {
        produto: {
            nome: string
            precoVenda: number
        }
    }[]
}

export type AgendamentoGlobalItem = {
    id: string
    clienteId: string
    funcionarioId: string
    dataHoraInicio: Date
    dataHoraFim: Date
    valorBruto: number
    taxas: number
    concluido: boolean
    cliente: {
        nome: string
        telefone: string
    }
    funcionario: {
        nome: string
    }
}

export type FuncionarioComExpedienteItem = {
    id: string
    nome: string
    email: string
    role: string
    ativo: boolean
    expedientes: {
        id: string
        diaSemana: number
        horaInicio: string
        horaFim: string
        ativo: boolean
    }[]
}

// ── FUNÇÃO AUXILIAR: Validador de Expediente ──────────────────────────────────
async function validarHorarioExpediente(funcionarioId: string, dataHoraInicio: Date, dataHoraFim: Date): Promise<string | null> {
    const inicioLocal = new Date(dataHoraInicio.toLocaleString('en-US', { timeZone: 'America/Sao_Paulo' }))
    const fimLocal = new Date(dataHoraFim.toLocaleString('en-US', { timeZone: 'America/Sao_Paulo' }))

    const diaSemana = inicioLocal.getDay()
    const diasNomes = ['Domingo', 'Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira', 'Sábado']

    const expediente = await prisma.expediente.findUnique({
        where: {
            funcionarioId_diaSemana: { funcionarioId, diaSemana }
        }
    })

    if (!expediente || !expediente.ativo) {
        return `O profissional selecionado não atende ao(à) ${diasNomes[diaSemana]}. Por favor, escolha outro dia.`
    }

    const [expHoraIn, expMinIn] = expediente.horaInicio.split(':').map(Number)
    const [expHoraFim, expMinFim] = expediente.horaFim.split(':').map(Number)
    const expInicioMinutos = expHoraIn * 60 + expMinIn
    const expFimMinutos = expHoraFim * 60 + expMinFim

    const agendamentoInicioMinutos = inicioLocal.getHours() * 60 + inicioLocal.getMinutes()
    const agendamentoFimMinutos = fimLocal.getHours() * 60 + fimLocal.getMinutes()

    if (fimLocal.getDay() !== diaSemana) {
        return 'A duração dos serviços ultrapassa a meia-noite.'
    }

    if (agendamentoInicioMinutos < expInicioMinutos || agendamentoFimMinutos > expFimMinutos) {
        return `Horário indisponível. O turno de trabalho deste profissional é das ${expediente.horaInicio} às ${expediente.horaFim}.`
    }

    return null
}

// ── FUNÇÕES PRINCIPAIS ────────────────────────────────────────────────────────

export async function criarAgendamentoMultiplo(
    clienteId: string,
    funcionarioId: string,
    dataHoraInicio: Date,
    servicosIds: string[]
): Promise<ActionResult<{ agendamentoId: string }>> {
    const requisicaoPermitida = verificarRateLimit(clienteId);
    
    if (!requisicaoPermitida) {
        return { 
            sucesso: false, 
            erro: 'Muitas tentativas de agendamento em um curto período. Aguarde um minuto e tente novamente.' 
        };
    }

    const TEMPO_BUFFER_MINUTOS = Number(process.env.TEMPO_BUFFER_MINUTOS) || 5

    try {
        const dataAtual = new Date();
        const limitePassado = new Date(dataAtual.getTime() - 5 * 60_000); // Tolerância de 5 minutos

        if (dataHoraInicio < limitePassado) {
            return { sucesso: false, erro: 'Não é possível registrar agendamentos em horários passados.' };
        }
        if (!servicosIds.length) {
            return { sucesso: false, erro: 'Selecione pelo menos um serviço.' }
        }

        const cliente = await prisma.cliente.findUnique({
            where: { id: clienteId },
            select: { nome: true, telefone: true }
        });

        if (!cliente || !cliente.telefone) {
            return { sucesso: false, erro: 'Cliente não encontrado ou sem telefone cadastrado.' };
        }

        const telefoneValido = await verificarNumeroExisteNoWhatsApp(cliente.telefone);
        if (!telefoneValido) {
            return { sucesso: false, erro: 'O telefone do cliente é inválido ou não possui WhatsApp ativo.' };
        }

        const servicos = await prisma.servico.findMany({
            where: { id: { in: Array.from(new Set(servicosIds)) } },
        })

        let valorBruto = 0
        let tempoTotalMinutos = 0

        const itensParaCriar: { servicoId: string; precoCobrado: number | null }[] = []

        for (const reqId of servicosIds) {
            const s = servicos.find(serv => serv.id === reqId)
            if (!s) {
                return { sucesso: false, erro: 'Um ou mais serviços são inválidos.' }
            }
            valorBruto += s.preco ?? 0
            tempoTotalMinutos += s.tempoMinutos ?? 30
            itensParaCriar.push({ servicoId: s.id, precoCobrado: s.preco })
        }

        const tempoTotalBloqueio = tempoTotalMinutos + TEMPO_BUFFER_MINUTOS
        const dataHoraFim = new Date(dataHoraInicio.getTime() + tempoTotalBloqueio * 60_000)

        const erroExpediente = await validarHorarioExpediente(funcionarioId, dataHoraInicio, dataHoraFim)
        if (erroExpediente) {
            return { sucesso: false, erro: erroExpediente }
        }

        // Garante que a checagem e a inserção ocorram juntas (Double Booking Prevention)
        const resultadoTransacao = await prisma.$transaction(async (tx) => {
            const conflito = await tx.agendamento.findFirst({
                where: {
                    funcionarioId,
                    concluido: false,
                    canceladoEm: null,
                    AND: [
                        { dataHoraInicio: { lt: dataHoraFim } },
                        { dataHoraFim: { gt: dataHoraInicio } },
                    ],
                },
            })

            if (conflito) {
                return { sucesso: false as const, erro: 'Choque de horários. O profissional já tem marcações neste intervalo de tempo.' }
            }

            const novoAgendamento = await tx.agendamento.create({
                data: {
                    clienteId,
                    funcionarioId,
                    valorBruto,
                    taxas: 0,
                    dataHoraInicio,
                    dataHoraFim,
                    concluido: false,
                    servicos: { create: itensParaCriar },
                },
                include: { funcionario: { select: { nome: true } } }
            })

            return { sucesso: true as const, novoAgendamento }
        })

        if (!resultadoTransacao.sucesso) {
            return { sucesso: false, erro: resultadoTransacao.erro }
        }

        const novoAgendamento = resultadoTransacao.novoAgendamento

        // ── INTEGRAÇÃO WHATSAPP (Assíncrono, não trava a resposta) ──
        // Formatação robusta de Data com Fuso Horário protegido via date-fns-tz
        const dataFormatada = formatInTimeZone(
            dataHoraInicio, 
            'America/Sao_Paulo', 
            "EEEE, dd 'de' MMMM 'às' HH:mm", 
            { locale: ptBR }
        );

        const nomesServicos = itensParaCriar.map(item => {
            return servicos.find(s => s.id === item.servicoId)?.nome || 'Serviço'
        }).join(', ');

        const mensagemConfirmacao =
            `Olá ${cliente.nome.split(' ')[0]}! 🌟 Sua reserva no Studio LmLu Matiello foi confirmada!

📅 *Data:* ${dataFormatada}
💅 *Serviço(s):* ${nomesServicos}
👨‍🎨 *Profissional:* ${novoAgendamento.funcionario.nome}

Para cancelar ou reagendar, por favor acesse o painel no nosso site. Estamos ansiosos para te receber!`;

        // Disparo em Background Real: after() garante a execução após o envio da resposta,
        // sem atrasar a latência nem ser morto prematuramente em ambientes serverless (Vercel/AWS).
        after(async () => {
            await enviarMensagemWhatsApp(cliente.telefone, mensagemConfirmacao).catch(err => {
                console.warn(`[Background Task] Falha silenciosa ao notificar cliente ${clienteId}:`, err);
            });
        });

        return { sucesso: true, agendamentoId: novoAgendamento.id }
    } catch (error) {
        console.error('Erro na orquestração do agendamento múltiplo:', error)
        return { sucesso: false, erro: 'Falha técnica ao processar a reserva.' }
    }
}

export async function listarAgendaProfissional(
    funcionarioId: string
): Promise<ActionResult<{ agendamentos: AgendaProfissionalItem[] }>> {
    try {
        const agendamentos = await prisma.agendamento.findMany({
            where: {
                funcionarioId,
            },
            orderBy: { dataHoraInicio: 'asc' },
            include: {
                cliente: { select: { nome: true, telefone: true } },
                servicos: { include: { servico: { select: { nome: true, preco: true, tempoMinutos: true } } } },
                produtos: { include: { produto: { select: { nome: true, precoVenda: true } } } },
            },
        })

        return { sucesso: true, agendamentos }
    } catch (error) {
        console.error('Erro ao listar agenda do profissional:', error)
        return { sucesso: false, erro: 'Falha ao carregar a sua agenda.' }
    }
}

export async function cancelarAgendamentoPendente(id: string): Promise<ActionResult> {
    try {
        const agendamento = await prisma.agendamento.findUnique({
            where: { id },
            include: {
                produtos: true,
                cliente: { select: { nome: true } },
                funcionario: { select: { nome: true } }
            }
        })

        if (!agendamento) {
            return { sucesso: false, erro: 'Agendamento não encontrado.' }
        }

        if (agendamento.concluido) {
            return {
                sucesso: false,
                erro: 'Não é possível cancelar uma comanda que já foi faturada e enviada ao caixa.',
            }
        }

        await prisma.$transaction(async (tx) => {
            for (const item of agendamento.produtos) {
                await tx.produto.update({
                    where: { id: item.produtoId },
                    data: { estoque: { increment: item.quantidade } }
                })
            }

            await tx.agendamento.update({ where: { id }, data: { canceladoEm: new Date() } })

            await tx.notificacao.create({
                data: {
                    mensagem: `⚠️ Agenda Cancelada: O atendimento de ${agendamento.cliente.nome} com ${agendamento.funcionario.nome} foi desmarcado. Verifique a necessidade de remanejar o cliente.`
                }
            })
        })

        return { sucesso: true }
    } catch {
        return { sucesso: false, erro: 'Falha técnica ao tentar cancelar o agendamento.' }
    }
}

export async function listarAgendamentosGlobais(): Promise<ActionResult<{ agendamentos: AgendamentoGlobalItem[] }>> {
    try {
        const agendamentos = await prisma.agendamento.findMany({
            orderBy: { dataHoraInicio: 'desc' },
            include: {
                cliente: { select: { nome: true, telefone: true } },
                funcionario: { select: { nome: true } }
            }
        })

        return { sucesso: true, agendamentos }
    } catch (error) {
        console.error('Erro ao listar agendamentos globais:', error)
        return { sucesso: false, erro: 'Falha ao carregar a agenda global.' }
    }
}

export async function editarAgendamentoPendente(
    id: string,
    funcionarioId: string,
    dataHoraInicio: Date
): Promise<ActionResult> {
    try {
        const dataAtual = new Date();
        const limitePassado = new Date(dataAtual.getTime() - 5 * 60_000);

        if (dataHoraInicio < limitePassado) {
            return { sucesso: false, erro: 'Não é possível remanejar para horários no passado.' };
        }

        const agendamento = await prisma.agendamento.findUnique({
            where: { id },
            include: { servicos: { include: { servico: true } } }
        })

        if (!agendamento) return { sucesso: false, erro: 'Agendamento não encontrado.' }
        if (agendamento.concluido) return { sucesso: false, erro: 'Não é possível editar uma comanda que já foi faturada.' }

        const TEMPO_BUFFER_MINUTOS = Number(process.env.TEMPO_BUFFER_MINUTOS) || 5
        let tempoTotalMinutos = 0
        agendamento.servicos.forEach(item => {
            tempoTotalMinutos += item.servico.tempoMinutos ?? 30
        })
        const dataHoraFim = new Date(dataHoraInicio.getTime() + (tempoTotalMinutos + TEMPO_BUFFER_MINUTOS) * 60_000)

        const erroExpediente = await validarHorarioExpediente(funcionarioId, dataHoraInicio, dataHoraFim)
        if (erroExpediente) {
            return { sucesso: false, erro: erroExpediente }
        }

        const resultadoTransacao = await prisma.$transaction(async (tx) => {
            const conflito = await tx.agendamento.findFirst({
                where: {
                    funcionarioId,
                    id: { not: id },
                    concluido: false,
                    canceladoEm: null,
                    AND: [
                        { dataHoraInicio: { lt: dataHoraFim } },
                        { dataHoraFim: { gt: dataHoraInicio } },
                    ],
                },
            })

            if (conflito) {
                return { sucesso: false as const, erro: 'Choque de horários. Profissional indisponível neste novo horário.' }
            }

            await tx.agendamento.update({
                where: { id },
                data: { funcionarioId, dataHoraInicio, dataHoraFim }
            })

            return { sucesso: true as const }
        })

        if (!resultadoTransacao.sucesso) {
            return { sucesso: false, erro: resultadoTransacao.erro }
        }

        return { sucesso: true }
    } catch (error) {
        console.error('Erro ao editar agendamento:', error)
        return { sucesso: false, erro: 'Falha técnica ao atualizar o agendamento.' }
    }
}

export async function listarEquipaComExpediente(): Promise<ActionResult<{ equipa: FuncionarioComExpedienteItem[] }>> {
    try {
        const equipa = await prisma.funcionario.findMany({
            where: { ativo: true, role: 'PROFISSIONAL' },
            include: { expedientes: true },
            orderBy: { nome: 'asc' }
        })
        return { sucesso: true, equipa: equipa as FuncionarioComExpedienteItem[] }
    } catch (error) {
        console.error('Erro ao listar equipa com expediente:', error)
        return { sucesso: false, erro: 'Falha ao carregar a equipa.' }
    }
}