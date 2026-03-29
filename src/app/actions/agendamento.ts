'use server'

import { prisma } from '@/lib/prisma'
import { Prisma } from '@prisma/client'
import { verificarNumeroExisteNoWhatsApp, enviarMensagemWhatsApp } from '@/lib/whatsapp'
import { formatInTimeZone } from 'date-fns-tz'
import { ptBR } from 'date-fns/locale'
import { verificarRateLimit } from '@/lib/rateLimit'
import { after } from 'next/server'
import { verificarSessaoCliente, verificarSessaoFuncionario } from '@/app/actions/auth'
import { ActionResult } from '@/types/domain'
import { schemaCriarAgendamento, schemaEditarAgendamento } from '@/lib/schemas'

// ── Constantes de Domínio ────────────────────────────────────────────────────
const FUSO_HORARIO = 'America/Sao_Paulo'
const TOLERANCIA_ATRASO_MS = 5 * 60_000
const TEMPO_SERVICO_FALLBACK_MINUTOS = 30

// ── Tipagens Estritas ─────────────────────────────────────────────────────────

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
    expedientes: {
        id: string
        diaSemana: number
        horaInicio: string
        horaFim: string
        ativo: boolean
    }[]
}

// ── FUNÇÕES AUXILIARES E DE ABSTRAÇÃO (DRY) ───────────────────────────────────

// Correção: Protege contra 0 sendo interpretado como falsy se configurado no .env
const getTempoBuffer = (): number => {
    const rawBuffer = process.env.TEMPO_BUFFER_MINUTOS;
    return rawBuffer !== undefined ? Number(rawBuffer) : 5;
}

const validarDataRetroativa = (data: Date): boolean => {
    return data >= new Date(Date.now() - TOLERANCIA_ATRASO_MS);
}

// Otimização: Evita a criação de múltiplas strings com date-fns para extração numérica
const extrairMinutosLocal = (dataHora: Date): number => {
    const dateLocal = new Date(dataHora.toLocaleString('en-US', { timeZone: FUSO_HORARIO }));
    return dateLocal.getHours() * 60 + dateLocal.getMinutes();
}

const obterDiaSemanaLocal = (dataHora: Date): number => {
    const dateLocal = new Date(dataHora.toLocaleString('en-US', { timeZone: FUSO_HORARIO }));
    return dateLocal.getDay();
}

// ── FUNÇÃO AUXILIAR: Validador de Expediente Seguro (Timezone Proof) ──────────
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

// ── GUARD DE AUTORIZAÇÃO: Encapsula regras IDOR (DRY) ────────────────────────
function autorizarAcessoAgendamento(
    clienteId: string,
    funcionarioId: string,
    sessaoCli: Awaited<ReturnType<typeof verificarSessaoCliente>>,
    sessaoFunc: Awaited<ReturnType<typeof verificarSessaoFuncionario>>
): boolean {
    if (sessaoFunc.logado && (sessaoFunc.role === 'ADMIN' || sessaoFunc.id === funcionarioId)) return true
    if (sessaoCli.logado && sessaoCli.id === clienteId) return true
    return false
}

// ── FUNÇÕES PRINCIPAIS ────────────────────────────────────────────────────────

export async function criarAgendamentoMultiplo(
    clienteId: string,
    funcionarioId: string,
    dataHoraInicio: Date,
    servicosIds: string[]
): Promise<ActionResult<{ agendamentoId: string }>> {
    const [sessaoCli, sessaoFunc] = await Promise.all([
        verificarSessaoCliente(),
        verificarSessaoFuncionario(),
    ])

    if (!sessaoFunc.logado) {
        if (!sessaoCli.logado) return { sucesso: false, erro: 'Acesso negado. Faça login para agendar.' }
        if (sessaoCli.id !== clienteId) return { sucesso: false, erro: 'Operação não permitida (Violação de Identidade).' }
    }

    const validacao = schemaCriarAgendamento.safeParse({
        clienteId,
        funcionarioId,
        dataHoraInicio,
        servicosIds,
    })

    if (!validacao.success) {
        return {
            sucesso: false,
            erro: validacao.error.issues[0]?.message ?? 'Dados de entrada inválidos.',
        }
    }

    if (!(await verificarRateLimit(clienteId))) {
        return {
            sucesso: false,
            erro: 'Muitas tentativas de agendamento em um curto período. Aguarde um minuto e tente novamente.'
        }
    }

    try {
        if (!validarDataRetroativa(dataHoraInicio)) {
            return { sucesso: false, erro: 'Não é possível registrar agendamentos em horários passados.' };
        }
        if (!servicosIds.length) {
            return { sucesso: false, erro: 'Selecione pelo menos um serviço.' }
        }

        const [cliente, servicos] = await Promise.all([
            prisma.cliente.findUnique({
                where: { id: clienteId },
                select: { nome: true, telefone: true }
            }),
            prisma.servico.findMany({
                where: { id: { in: Array.from(new Set(servicosIds)) } },
            }),
        ])

        if (!cliente || !cliente.telefone) {
            return { sucesso: false, erro: 'Cliente não encontrado ou sem telefone cadastrado.' };
        }

        const telefoneValido = await verificarNumeroExisteNoWhatsApp(cliente.telefone);
        if (!telefoneValido) {
            return { sucesso: false, erro: 'O telefone do cliente é inválido ou não possui WhatsApp ativo.' };
        }

        let valorBruto = 0
        let tempoTotalMinutos = 0

        const itensParaCriar: { servicoId: string; precoCobrado: number | null }[] = []

        for (const reqId of servicosIds) {
            const s = servicos.find(serv => serv.id === reqId)
            if (!s) {
                return { sucesso: false, erro: 'Um ou mais serviços são inválidos.' }
            }
            valorBruto += s.preco ?? 0
            tempoTotalMinutos += s.tempoMinutos ?? TEMPO_SERVICO_FALLBACK_MINUTOS
            itensParaCriar.push({ servicoId: s.id, precoCobrado: s.preco })
        }

        const tempoTotalBloqueio = tempoTotalMinutos + getTempoBuffer()
        const dataHoraFim = new Date(dataHoraInicio.getTime() + tempoTotalBloqueio * 60_000)

        const erroExpediente = await validarHorarioExpediente(funcionarioId, dataHoraInicio, dataHoraFim)
        if (erroExpediente) {
            return { sucesso: false, erro: erroExpediente }
        }

        // Correção Crítica: Transação definida como Serializable para garantir Lock na verificação de choques
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
        }, {
            isolationLevel: Prisma.TransactionIsolationLevel.Serializable
        })

        if (!resultadoTransacao.sucesso) {
            return { sucesso: false, erro: resultadoTransacao.erro }
        }

        const novoAgendamento = resultadoTransacao.novoAgendamento

        // ── INTEGRAÇÃO WHATSAPP ──
        const dataFormatada = formatInTimeZone(
            dataHoraInicio,
            FUSO_HORARIO,
            "EEEE, dd 'de' MMMM 'às' HH:mm",
            { locale: ptBR }
        );

        const nomesServicos = itensParaCriar.map(item => {
            return servicos.find(s => s.id === item.servicoId)?.nome || 'Serviço'
        }).join(', ');

        const mensagemConfirmacao =
            `Olá ${cliente.nome.split(' ')[0]}! 🌟 Sua reserva no Studio LmLu Matiello foi confirmada!\n\n📅 *Data:* ${dataFormatada}\n💅 *Serviço(s):* ${nomesServicos}\n👨‍🎨 *Profissional:* ${novoAgendamento!.funcionario.nome}\n\nPara cancelar ou reagendar, por favor acesse o painel no nosso site. Estamos ansiosos para te receber!`;

        after(async () => {
            await enviarMensagemWhatsApp(cliente.telefone!, mensagemConfirmacao).catch(err => {
                console.warn(`[Background Task] Falha silenciosa ao notificar cliente ${clienteId}:`, err);
            });
        });

        return { sucesso: true, agendamentoId: novoAgendamento!.id }
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
        const [agendamento, sessaoCli, sessaoFunc] = await Promise.all([
            prisma.agendamento.findUnique({
                where: { id },
                include: {
                    produtos: true,
                    cliente: { select: { nome: true } },
                    funcionario: { select: { nome: true } }
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

        if (agendamento.concluido) {
            return { sucesso: false, erro: 'Não é possível cancelar uma comanda que já foi faturada e enviada ao caixa.' }
        }

        const produtosParaRestaurar = agendamento.produtos.reduce((acc, item) => {
            acc[item.produtoId] = (acc[item.produtoId] || 0) + item.quantidade;
            return acc;
        }, {} as Record<string, number>);

        await prisma.$transaction(async (tx) => {
            // Otimização: Executa o restore do estoque paralelamente de forma segura dentro da transação
            const promessasUpdate = Object.entries(produtosParaRestaurar).map(([produtoId, quantidade]) =>
                tx.produto.update({
                    where: { id: produtoId },
                    data: { estoque: { increment: quantidade } }
                })
            );

            await Promise.all(promessasUpdate);

            await tx.agendamento.update({ where: { id }, data: { canceladoEm: new Date() } })

            await tx.notificacao.create({
                data: {
                    mensagem: `⚠️ Agenda Cancelada: O atendimento de ${agendamento.cliente.nome} com ${agendamento.funcionario.nome} foi desmarcado.`
                }
            })
        })

        return { sucesso: true }
    } catch (error) {
        console.error('[Agendamento Error] Falha técnica ao cancelar agendamento:', error)
        return { sucesso: false, erro: 'Falha técnica ao tentar cancelar o agendamento.' }
    }
}

export async function listarAgendamentosGlobais(): Promise<ActionResult<{ agendamentos: AgendamentoGlobalItem[] }>> {
    try {
        const sessao = await verificarSessaoFuncionario();
        if (!sessao.logado || sessao.role !== 'ADMIN') {
            return { sucesso: false, erro: 'Acesso negado. Apenas diretores podem visualizar a agenda global.' }
        }

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

        if (agendamento.concluido) return { sucesso: false, erro: 'Não é possível editar uma comanda que já foi faturada.' }

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

        // Correção Crítica: Isolamento forte adicionado na edição também
        const resultadoTransacao = await prisma.$transaction(async (tx) => {
            const conflito = await tx.agendamento.findFirst({
                where: {
                    funcionarioId,
                    id: { not: id }, // Exclui a si mesmo da busca
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

export async function listarEquipaComExpediente(): Promise<ActionResult<{ equipa: FuncionarioComExpedienteItem[] }>> {
    try {
        const equipa = await prisma.funcionario.findMany({
            where: { ativo: true, role: 'PROFISSIONAL' },
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
        return { sucesso: true, equipa }
    } catch (error) {
        console.error('Erro ao listar equipa com expediente:', error)
        return { sucesso: false, erro: 'Falha ao carregar a equipa.' }
    }
}