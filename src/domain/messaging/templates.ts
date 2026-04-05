// =============================================================================
// Camada de Domínio: Templates de Mensagem (Pure Functions, zero side-effects)
//
// Cada função recebe um tipo estrito e retorna string.
// Testáveis isoladamente sem qualquer mock de infraestrutura.
// =============================================================================

import type { ParamsConfirmacao, ParamsCancelamento, ParamsLembrete } from './IMessagingService'

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatarMoeda(valor: number): string {
  return valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

// ── Template 1: Confirmação de Agendamento ────────────────────────────────────
// Disparado imediatamente após `criarAgendamentoMultiplo` ser persistido.
// Inclui todos os dados operacionais que o cliente precisa.

export function templateConfirmacao(p: ParamsConfirmacao): string {
  const linhas = [
    `Olá, ${p.nomeCliente}! ✅ Seu agendamento foi confirmado.`,
    '',
    `📅 Data: ${p.dataFormatada}`,
    `⏰ Horário: ${p.horaFormatada}`,
    `✂️ Serviço(s): ${p.nomesServicos}`,
    `👤 Profissional: ${p.nomeProfissional}`,
    `💰 Valor estimado: ${formatarMoeda(p.valorTotal)}`,
    '',
    'Para cancelar ou reagendar, entre em contato conosco.',
  ]
  return linhas.join('\n')
}

// ── Template 2: Cancelamento ──────────────────────────────────────────────────
// Disparado quando admin ou profissional cancela o agendamento.
// Tom empático, sem expor detalhes internos da operação.

export function templateCancelamento(p: ParamsCancelamento): string {
  const linhas = [
    `Olá, ${p.nomeCliente}.`,
    '',
    `Informamos que seu agendamento de *${p.nomesServicos}* com ${p.nomeProfissional},`,
    `previsto para ${p.dataFormatada} às ${p.horaFormatada},`,
    'precisou ser cancelado pela nossa equipe.',
    '',
    'Pedimos desculpas pelo inconveniente. Para reagendar, entre em contato conosco.',
  ]
  return linhas.join('\n')
}

// ── Template 3: Lembrete (48h antes) ─────────────────────────────────────────
// Disparado pelo Cron Job diário. Tom leve e informativo.

export function templateLembrete(p: ParamsLembrete): string {
  const linhas = [
    `Olá, ${p.nomeCliente}! 🔔 Lembrete de agendamento.`,
    '',
    `Você tem *${p.nomesServicos}* marcado para:`,
    `📅 ${p.dataFormatada} às ${p.horaFormatada}`,
    `👤 Com: ${p.nomeProfissional}`,
    '',
    'Te esperamos! 💇',
  ]
  return linhas.join('\n')
}
