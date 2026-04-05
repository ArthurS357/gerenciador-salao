// =============================================================================
// Cron Route: Lembretes de Agendamento (48h antes)
//
// Segurança: autenticação via header `Authorization: Bearer <CRON_SECRET>`.
// A Vercel injeta este header automaticamente ao invocar o cron.
// Requisições externas sem o segredo recebem 401.
// Se CRON_SECRET não estiver configurado, a rota retorna 503 (fail-secure).
//
// Idempotência: o campo `lembreteEnviado` no Agendamento garante que
// um retry do cron não envie mensagem duplicada ao mesmo cliente.
// =============================================================================

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { StatusAgendamento } from '@prisma/client'
import { getMessagingService } from '@/services/messaging/getMessagingService'
import { formatInTimeZone } from 'date-fns-tz'
import { ptBR } from 'date-fns/locale'
import { addHours } from 'date-fns'

const FUSO_HORARIO = 'America/Sao_Paulo'

// Vercel cron invoca via GET — não usar POST para não conflitar com CSRF policies
export async function GET(req: NextRequest): Promise<NextResponse> {
  // ── Fail-Secure: bloqueia tudo se o segredo não estiver configurado ──────
  const cronSecret = process.env.CRON_SECRET
  if (!cronSecret) {
    console.error('[Cron/Lembretes] CRON_SECRET não configurado — rota recusando todas as requisições.')
    return NextResponse.json({ error: 'Service unavailable' }, { status: 503 })
  }

  // ── Autenticação ──────────────────────────────────────────────────────────
  const authHeader = req.headers.get('authorization')
  if (authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // ── Janela de busca: agendamentos entre 47h e 49h a partir de agora ───────
  // Tolerância de ±1h garante que um cron diário às 10h nunca perca nem
  // duplique disparos em caso de leve variação de horário da Vercel.
  const agora        = new Date()
  const janelaInicio = addHours(agora, 47)
  const janelaFim    = addHours(agora, 49)

  try {
    const agendamentos = await prisma.agendamento.findMany({
      where: {
        dataHoraInicio:  { gte: janelaInicio, lte: janelaFim },
        status:          { in: [StatusAgendamento.AGENDADO, StatusAgendamento.CONFIRMADO] },
        lembreteEnviado: false,  // garante idempotência em retries
      },
      include: {
        cliente:    { select: { nome: true, telefone: true } },
        funcionario:{ select: { nome: true } },
        servicos:   { include: { servico: { select: { nome: true } } } },
      },
    })

    if (agendamentos.length === 0) {
      return NextResponse.json({ enviados: 0, mensagem: 'Nenhum agendamento na janela 48h.' })
    }

    const messagingService = getMessagingService()

    // Processa em paralelo — elimina latência acumulada do loop sequencial
    // (ex: 20 agendamentos × 1s/chamada = 20s sequencial vs ~1-2s paralelo).
    // Promise.allSettled garante que a falha do "Cliente A" nunca cancela
    // o envio para o "Cliente B" — cada Promise é isolada.
    const resultados = await Promise.allSettled(
      agendamentos
        .filter(ag => ag.cliente.telefone)   // descarta sem telefone antes de paralelizar
        .map(async (ag) => {
          const dataFormatada = formatInTimeZone(ag.dataHoraInicio, FUSO_HORARIO, "EEEE, dd 'de' MMMM", { locale: ptBR })
          const horaFormatada = formatInTimeZone(ag.dataHoraInicio, FUSO_HORARIO, 'HH:mm')
          const nomesServicos = ag.servicos.map(s => s.servico.nome).join(', ')

          // Pode lançar — o allSettled captura e isola o erro desta Promise
          const enviou = await messagingService.enviarLembrete({
            nomeCliente:      ag.cliente.nome,
            telefone:         ag.cliente.telefone!,
            dataFormatada,
            horaFormatada,
            nomesServicos,
            nomeProfissional: ag.funcionario.nome,
          })

          if (!enviou) {
            throw new Error(`Z-API retornou falha para agendamento ${ag.id}`)
          }

          // Marca idempotentemente dentro da mesma Promise para manter consistência
          await prisma.agendamento.update({
            where: { id: ag.id },
            data:  { lembreteEnviado: true },
          })

          return ag.id
        })
    )

    const enviados = resultados.filter(r => r.status === 'fulfilled').length
    const falhas   = resultados
      .filter((r): r is PromiseRejectedResult => r.status === 'rejected')
      .map(r => r.reason instanceof Error ? r.reason.message : String(r.reason))

    if (falhas.length > 0) {
      console.warn(`[Cron/Lembretes] ${falhas.length} falha(s) isolada(s):`, falhas)
    }

    console.log(`[Cron/Lembretes] Janela: ${janelaInicio.toISOString()} — ${janelaFim.toISOString()} | Enviados: ${enviados} | Falhas: ${falhas.length}`)

    return NextResponse.json({ enviados, falhas: falhas.length })
  } catch (error) {
    console.error('[Cron/Lembretes] Erro fatal na varredura:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
