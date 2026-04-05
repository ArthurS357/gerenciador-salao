'use server'

import { prisma } from '@/lib/prisma'
import { Prisma, RoleFuncionario, StatusAgendamento } from '@prisma/client'
import { verificarNumeroExisteNoWhatsApp } from '@/lib/whatsapp'
import { getMessagingService } from '@/services/messaging/getMessagingService'
import { formatInTimeZone } from 'date-fns-tz'
import { ptBR } from 'date-fns/locale'
import { verificarRateLimit } from '@/lib/rateLimit'
import { after } from 'next/server'
import { verificarSessaoCliente, verificarSessaoFuncionario } from '@/app/actions/auth'
import { ActionResult } from '@/types/domain'
import { schemaCriarAgendamento, schemaEditarAgendamento } from '@/lib/schemas'
import { cache } from 'react'
import { decimalParaNumero } from '@/lib/decimal-utils'

// ── Constantes de Domínio ────────────────────────────────────────────────────
const FUSO_HORARIO = 'America/Sao_Paulo'
const TOLERANCIA_ATRASO_MS = 5 * 60_000
const TEMPO_SERVICO_FALLBACK_MINUTOS = 30

/** Status ativos — agendamentos que não foram finalizados nem cancelados. */
const STATUS_ATIVOS: StatusAgendamento[] = [
    StatusAgendamento.AGENDADO,
    StatusAgendamento.CONFIRMADO,
    StatusAgendamento.EM_ATENDIMENTO,
]

// ── Tipagens Estritas ─────────────────────────────────────────────────────────

export type AgendaProfissionalItem = {
    id: string
    clienteId: string
    funcionarioId: string
    dataHoraInicio: Date
    dataHoraFim: Date
    valorBruto: number
    taxas: number
    status: string
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
    status: string
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
    expedientes: {
        id: string
        diaSemana: number
        horaInicio: string
        horaFim: string
        ativo: boolean
    }[]
}

// ── FUNÇÕES AUXILIARES E DE ABSTRAÇÃO (DRY) ───────────────────────────────────

const getTempoBuffer = (): number => {
    const rawBuffer = process.env.TEMPO_BUFFER_MINUTOS;
    return rawBuffer !== undefined ? Number(rawBuffer) : 5;
}

const validarDataRetroativa = (data: Date): boolean => {
    return data >= new Date(Date.now() - TOLERANCIA_ATRASO_MS);
}

const extrairMinutosLocal = (dataHora: Date): number => {
    const horas = Number(formatInTimeZone(dataHora, FUSO_HORARIO, 'H'))
    const minutos = Number(formatInTimeZone(dataHora, FUSO_HORARIO, 'm'))
    return horas * 60 + minutos
}

const obterDiaSemanaLocal = (dataHora: Date): number => {
    const diaISO = Number(formatInTimeZone(dataHora, FUSO_HORARIO, 'i'))
    return diaISO === 7 ? 0 : diaISO
}

async function validarHorarioExpediente(funcionarioId: string, dataHoraInicio: Date, dataHoraFim: Date): Promise<string | null> {
    const diaSemanaInicioLocal = obterDiaSemanaLocal(dataHoraInicio)
    const diaSemanaFimLocal = obterDiaSemanaLocal(dataHoraFim)

    const diasNomes = ['Domingo', 'Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira', 'Sábado']

    const expediente = await prisma.expediente.findUnique({
        where: {
            funcionarioId_diaSemana: { funcionarioId, diaSemana: diaSemanaInicioLocal }
        }
    })

    if (!expediente || !expediente.ativo) {
        return `O profissional selecionado não atende ao(à) ${diasNomes[diaSemanaInicioLocal]}. Por favor, escolha outro dia.`
    }

    const [expHoraIn, expMinIn] = expediente.horaInicio.split(':').map(Number)
    const [expHoraFim, expMinFim] = expediente.horaFim.split(':').map(Number)
    const expInicioMinutos = expHoraIn * 60 + expMinIn
    const expFimMinutos = expHoraFim * 60 + expMinFim

    if (diaSemanaFimLocal !== diaSemanaInicioLocal) {
        return 'A duração dos serviços ultrapassa a meia-noite.'
    }

    const agendamentoInicioMinutos = extrairMinutosLocal(dataHoraInicio)
    const agendamentoFimMinutos = extrairMinutosLocal(dataHoraFim)

    if (agendamentoInicioMinutos < expInicioMinutos || agendamentoFimMinutos > expFimMinutos) {
        return `Horário indisponível. O turno de trabalho deste profissional é das ${expediente.horaInicio} às ${expediente.horaFim}.`
    }

    return null
}

function autorizarAcessoAgendamento(
    clienteId: string,
    funcionarioId: string,
    sessaoCli: Awaited<ReturnType<typeof verificarSessaoCliente>>,
    sessaoFunc: Awaited<ReturnType<typeof verificarSessaoFuncionario>>
): boolean {
    if (sessaoFunc.logado && (sessaoFunc.role === 'ADMIN' || sessaoFunc.role === 'RECEPCIONISTA' || sessaoFunc.id === funcionarioId)) return true
    if (sessaoCli.logado && sessaoCli.id === clienteId) return true
    return false
}

// ── FUNÇÕES PRINCIPAIS ────────────────────────────────────────────────────────

export async function criarAgendamentoMultiplo(
    clienteId: string,
    funcionarioId: string,
    dataHoraInicio: Date,
    servicosIdsRaw: string[]
): Promise<ActionResult<{ agendamentoId: string }>> {
    const [sessaoCli, sessaoFunc] = await Promise.all([
        verificarSessaoCliente(),
        verificarSessaoFuncionario(),
    ])

    if (sessaoFunc.logado) {
        if (sessaoFunc.role !== 'ADMIN' && !sessaoFunc.podeAgendar) {
            return { sucesso: false, erro: 'Acesso negado. Você não tem permissão para criar agendamentos.' }
        }
    } else {
        if (!sessaoCli.logado) return { sucesso: false, erro: 'Acesso negado. Faça login para agendar.' }
        if (sessaoCli.id !== clienteId) return { sucesso: false, erro: 'Operação não permitida (Violação de Identidade).' }
    }

    const validacao = schemaCriarAgendamento.safeParse({
        clienteId,
        funcionarioId,
        dataHoraInicio,
        servicosIds: servicosIdsRaw,
    })

    if (!validacao.success) {
        return {
            sucesso: false,
            erro: validacao.error.issues[0]?.message ?? 'Dados de entrada inválidos.',
        }
    }

    const servicosIds = Array.from(new Set(validacao.data.servicosIds))

    if (!(await verificarRateLimit(clienteId))) {
        return { sucesso: false, erro: 'Muitas tentativas de agendamento em um curto período. Aguarde um minuto e tente novamente.' }
    }

    try {
        if (!validarDataRetroativa(dataHoraInicio)) {
            return { sucesso: false, erro: 'Não é possível registrar agendamentos em horários passados.' };
        }
        if (!servicosIds.length) {
            return { sucesso: false, erro: 'Selecione pelo menos um serviço.' }
        }

        const [cliente, profissionalAlvo] = await Promise.all([
            prisma.cliente.findUnique({
                where: { id: clienteId },
                select: { nome: true, telefone: true }
            }),
            prisma.funcionario.findUnique({
                where: { id: funcionarioId },
                include: { servicos: { where: { id: { in: servicosIds } } } }
            })
        ])

        if (!cliente || !cliente.telefone) {
            return { sucesso: false, erro: 'Cliente não encontrado ou sem telefone cadastrado.' };
        }

        if (!profissionalAlvo) {
            return { sucesso: false, erro: 'Profissional não encontrado.' };
        }

        if (profissionalAlvo.servicos.length !== servicosIds.length) {
            return { sucesso: false, erro: 'O profissional selecionado não oferece um ou mais dos serviços escolhidos.' };
        }

        const servicos = profissionalAlvo.servicos

        const telefoneValido = await verificarNumeroExisteNoWhatsApp(cliente.telefone);
        if (!telefoneValido) {
            return { sucesso: false, erro: 'O telefone do cliente é inválido ou não possui WhatsApp ativo.' };
        }

        let valorBruto = 0
        let tempoTotalMinutos = 0

        const itensParaCriar: { servicoId: string; precoCobrado: number | null }[] = []

        for (const s of servicos) {
            const preco = decimalParaNumero(s.preco)
            valorBruto += preco
            tempoTotalMinutos += s.tempoMinutos ?? TEMPO_SERVICO_FALLBACK_MINUTOS
            itensParaCriar.push({ servicoId: s.id, precoCobrado: preco || null })
        }

        const tempoTotalBloqueio = tempoTotalMinutos + getTempoBuffer()
        const dataHoraFim = new Date(dataHoraInicio.getTime() + tempoTotalBloqueio * 60_000)

        const erroExpediente = await validarHorarioExpediente(funcionarioId, dataHoraInicio, dataHoraFim)
        if (erroExpediente) {
            return { sucesso: false, erro: erroExpediente }
        }

        const resultadoTransacao = await prisma.$transaction(async (tx) => {
            const conflito = await tx.agendamento.findFirst({
                where: {
                    funcionarioId,
                    status: { in: STATUS_ATIVOS },
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
                    status: StatusAgendamento.AGENDADO,
                    servicos: { create: itensParaCriar },
                },
                include: { funcionario: { select: { nome: true } } }
            })

            return { sucesso: true as const, novoAgendamento }
        }, {
            isolationLevel: Prisma.TransactionIsolationLevel.Serializable
        })

        if (!resultadoTransacao.sucesso || !resultadoTransacao.novoAgendamento) {
            return { sucesso: false, erro: resultadoTransacao.erro || 'Falha técnica.' }
        }

        const novoAgendamento = resultadoTransacao.novoAgendamento

        // ── NOTIFICAÇÃO WHATSAPP: Confirmação de agendamento ──
        const dataFormatada = formatInTimeZone(dataHoraInicio, FUSO_HORARIO, "EEEE, dd 'de' MMMM", { locale: ptBR });
        const horaFormatada = formatInTimeZone(dataHoraInicio, FUSO_HORARIO, 'HH:mm', { locale: ptBR });
        const nomesServicos = servicos.map(s => s.nome).join(', ');

        after(async () => {
            try {
                await getMessagingService().enviarConfirmacao({
                    nomeCliente:      cliente.nome,
                    telefone:         cliente.telefone!,
                    dataFormatada,
                    horaFormatada,
                    nomesServicos,
                    nomeProfissional: novoAgendamento.funcionario.nome,
                    valorTotal:       valorBruto,
                })
            } catch (err) {
                console.error(`[Background Task] Falha silenciosa ao notificar confirmação do cliente ${clienteId}:`, err);
            }
        });

        // Correção Crítica: Retorno respeita o contrato ActionResult<T>
        return { sucesso: true, data: { agendamentoId: novoAgendamento.id } }
    } catch (error) {
        console.error('Erro na orquestração do agendamento múltiplo:', error)
        return { sucesso: false, erro: 'Falha técnica ao processar a reserva.' }
    }
}

export async function listarAgendaProfissional(
    funcionarioId: string
): Promise<ActionResult<{ agendamentos: AgendaProfissionalItem[] }>> {
    try {
        const sessao = await verificarSessaoFuncionario();
        if (!sessao.logado) return { sucesso: false, erro: 'Acesso negado.' };
        if (sessao.role !== 'ADMIN' && sessao.id !== funcionarioId) {
            return { sucesso: false, erro: 'Você não tem permissão para ver a agenda de outro profissional.' };
        }

        const rows = await prisma.agendamento.findMany({
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

        // Converte Decimal → number na fronteira
        const agendamentos: AgendaProfissionalItem[] = rows.map(r => ({
            id: r.id,
            clienteId: r.clienteId,
            funcionarioId: r.funcionarioId,
            dataHoraInicio: r.dataHoraInicio,
            dataHoraFim: r.dataHoraFim,
            valorBruto: decimalParaNumero(r.valorBruto),
            taxas: decimalParaNumero(r.taxas),
            status: r.status,
            cliente: r.cliente,
            servicos: r.servicos.map(s => ({
                servico: {
                    nome: s.servico.nome,
                    preco: decimalParaNumero(s.servico.preco),
                    tempoMinutos: s.servico.tempoMinutos,
                }
            })),
            produtos: r.produtos.map(p => ({
                produto: {
                    nome: p.produto.nome,
                    precoVenda: decimalParaNumero(p.produto.precoVenda),
                }
            })),
        }))

        return { sucesso: true, data: { agendamentos } }
    } catch (error) {
        console.error('Erro ao listar agenda do profissional:', error)
        return { sucesso: false, erro: 'Falha ao carregar a sua agenda.' }
    }
}

export async function cancelarAgendamentoPendente(id: string): Promise<ActionResult> {
    try {
        const [agendamento, sessaoCli, sessaoFunc] = await Promise.all([
            prisma.agendamento.findUnique({
                where: { id },
                include: {
                    produtos: true,
                    cliente: { select: { nome: true, telefone: true } },
                    funcionario: { select: { nome: true } },
                    servicos: { include: { servico: { select: { nome: true } } } },
                }
            }),
            verificarSessaoCliente(),
            verificarSessaoFuncionario(),
        ])

        if (!agendamento) {
            return { sucesso: false, erro: 'Agendamento não encontrado.' }
        }

        if (!autorizarAcessoAgendamento(agendamento.clienteId, agendamento.funcionarioId, sessaoCli, sessaoFunc)) {
            return { sucesso: false, erro: 'Acesso negado. Você não tem permissão para cancelar este agendamento.' }
        }

        if (sessaoFunc.logado && sessaoFunc.role !== 'ADMIN' && !sessaoFunc.podeCancelar) {
            return { sucesso: false, erro: 'Acesso negado. Você não tem permissão para cancelar agendamentos.' }
        }

        if (agendamento.status === StatusAgendamento.FINALIZADO) {
            return { sucesso: false, erro: 'Não é possível cancelar uma comanda que já foi faturada e enviada ao caixa.' }
        }

        if (agendamento.status === StatusAgendamento.CANCELADO) {
            return { sucesso: false, erro: 'Este agendamento já foi cancelado.' }
        }

        const produtosParaRestaurar = agendamento.produtos.reduce((acc, item) => {
            acc[item.produtoId] = (acc[item.produtoId] || 0) + item.quantidade;
            return acc;
        }, {} as Record<string, number>);

        await prisma.$transaction(async (tx) => {
            for (const [produtoId, quantidade] of Object.entries(produtosParaRestaurar)) {
                await tx.produto.update({
                    where: { id: produtoId },
                    data: { estoque: { increment: quantidade } }
                });
            }

            await tx.agendamento.update({ where: { id }, data: { status: StatusAgendamento.CANCELADO } })

            await tx.notificacao.create({
                data: {
                    mensagem: `⚠️ Agenda Cancelada: O atendimento de ${agendamento.cliente.nome} com ${agendamento.funcionario.nome} foi desmarcado.`
                }
            })
        })

        // ── NOTIFICAÇÃO WHATSAPP: Cancelamento de agendamento ──
        if (agendamento.cliente.telefone) {
            const dataFormatada = formatInTimeZone(agendamento.dataHoraInicio, FUSO_HORARIO, "EEEE, dd 'de' MMMM", { locale: ptBR });
            const horaFormatada = formatInTimeZone(agendamento.dataHoraInicio, FUSO_HORARIO, 'HH:mm', { locale: ptBR });
            const nomesServicos  = agendamento.servicos.map(s => s.servico.nome).join(', ');

            after(async () => {
                try {
                    await getMessagingService().enviarCancelamento({
                        nomeCliente:      agendamento.cliente.nome,
                        telefone:         agendamento.cliente.telefone!,
                        dataFormatada,
                        horaFormatada,
                        nomesServicos,
                        nomeProfissional: agendamento.funcionario.nome,
                    })
                } catch (err) {
                    console.error(`[Background Task] Falha silenciosa ao notificar cancelamento do agendamento ${id}:`, err);
                }
            });
        }

        return { sucesso: true }
    } catch (error) {
        console.error('[Agendamento Error] Falha técnica ao cancelar agendamento:', error)
        return { sucesso: false, erro: 'Falha técnica ao tentar cancelar o agendamento.' }
    }
}

export async function listarAgendamentosGlobais(): Promise<ActionResult<{ agendamentos: AgendamentoGlobalItem[] }>> {
    try {
        const sessao = await verificarSessaoFuncionario();
        if (!sessao.logado || (sessao.role !== 'ADMIN' && sessao.role !== 'RECEPCIONISTA')) {
            return { sucesso: false, erro: 'Acesso negado. Recurso restrito à gestão.' }
        }

        const rows = await prisma.agendamento.findMany({
            orderBy: { dataHoraInicio: 'desc' },
            include: {
                cliente: { select: { nome: true, telefone: true } },
                funcionario: { select: { nome: true } }
            }
        })

        const agendamentos: AgendamentoGlobalItem[] = rows.map(r => ({
            id: r.id,
            clienteId: r.clienteId,
            funcionarioId: r.funcionarioId,
            dataHoraInicio: r.dataHoraInicio,
            dataHoraFim: r.dataHoraFim,
            valorBruto: decimalParaNumero(r.valorBruto),
            taxas: decimalParaNumero(r.taxas),
            status: r.status,
            cliente: r.cliente,
            funcionario: r.funcionario,
        }))

        return { sucesso: true, data: { agendamentos } }
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
        const [agendamento, sessaoCli, sessaoFunc] = await Promise.all([
            prisma.agendamento.findUnique({
                where: { id },
                include: { servicos: { include: { servico: true } } }
            }),
            verificarSessaoCliente(),
            verificarSessaoFuncionario(),
        ])

        if (!agendamento) return { sucesso: false, erro: 'Agendamento não encontrado.' }

        if (!autorizarAcessoAgendamento(agendamento.clienteId, agendamento.funcionarioId, sessaoCli, sessaoFunc)) {
            return { sucesso: false, erro: 'Acesso negado para editar este agendamento.' }
        }

        if (agendamento.status === StatusAgendamento.FINALIZADO) return { sucesso: false, erro: 'Não é possível editar uma comanda que já foi faturada.' }
        if (agendamento.status === StatusAgendamento.CANCELADO) return { sucesso: false, erro: 'Não é possível editar um agendamento cancelado.' }

        const validacao = schemaEditarAgendamento.safeParse({
            id,
            funcionarioId,
            dataHoraInicio,
        })

        if (!validacao.success) {
            return {
                sucesso: false,
                erro: validacao.error.issues[0]?.message ?? 'Dados de edição inválidos.',
            }
        }

        if (!validarDataRetroativa(dataHoraInicio)) {
            return { sucesso: false, erro: 'Não é possível remanejar para horários no passado.' };
        }

        let tempoTotalMinutos = 0
        agendamento.servicos.forEach(item => {
            tempoTotalMinutos += item.servico.tempoMinutos ?? TEMPO_SERVICO_FALLBACK_MINUTOS
        })
        const dataHoraFim = new Date(dataHoraInicio.getTime() + (tempoTotalMinutos + getTempoBuffer()) * 60_000)

        const erroExpediente = await validarHorarioExpediente(funcionarioId, dataHoraInicio, dataHoraFim)
        if (erroExpediente) {
            return { sucesso: false, erro: erroExpediente }
        }

        const resultadoTransacao = await prisma.$transaction(async (tx) => {
            const conflito = await tx.agendamento.findFirst({
                where: {
                    funcionarioId,
                    id: { not: id },
                    status: { in: STATUS_ATIVOS },
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
        }, {
            isolationLevel: Prisma.TransactionIsolationLevel.Serializable
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

export const listarEquipaComExpediente = cache(async (): Promise<ActionResult<{ equipa: FuncionarioComExpedienteItem[] }>> => {
    try {
        const equipa = await prisma.funcionario.findMany({
            where: { ativo: true, role: RoleFuncionario.PROFISSIONAL },
            select: {
                id: true,
                nome: true,
                expedientes: {
                    select: {
                        id: true,
                        diaSemana: true,
                        horaInicio: true,
                        horaFim: true,
                        ativo: true
                    }
                }
            },
            orderBy: { nome: 'asc' }
        })

        return { sucesso: true, data: { equipa } }
    } catch (error) {
        console.error('Erro ao listar equipa com expediente:', error)
        return { sucesso: false, erro: 'Falha ao carregar a equipa.' }
    }
})