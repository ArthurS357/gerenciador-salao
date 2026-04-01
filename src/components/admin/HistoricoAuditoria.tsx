'use client'

import { AuditLogComUsuario } from '@/app/actions/auditoria'
import {
  CheckCircle2,
  AlertTriangle,
  Trash2,
  DollarSign,
  CalendarPlus,
  Edit2,
  User2,
  ChevronDown,
} from 'lucide-react'
import { useState } from 'react'
import { formatInTimeZone } from 'date-fns-tz'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

// ── TIPOS ──────────────────────────────────────────────────────────────

interface HistoricoAuditoriaProps {
  logs: AuditLogComUsuario[]
  titulo?: string
}

// ── MAPA DE ÍCONES POR AÇÃO ────────────────────────────────────────

const iconesAcao = {
  FECHAMENTO_COMANDA: { Icon: CheckCircle2, cor: 'text-green-600', bg: 'bg-green-50' },
  ALTERACAO_COMISSAO: { Icon: AlertTriangle, cor: 'text-amber-600', bg: 'bg-amber-50' },
  EXCLUSAO_CLIENTE: { Icon: Trash2, cor: 'text-red-600', bg: 'bg-red-50' },
  EDICAO_PRECO: { Icon: DollarSign, cor: 'text-blue-600', bg: 'bg-blue-50' },
  CRIACAO_AGENDAMENTO: { Icon: CalendarPlus, cor: 'text-purple-600', bg: 'bg-purple-50' },
  CANCELAMENTO_AGENDAMENTO: { Icon: AlertTriangle, cor: 'text-orange-600', bg: 'bg-orange-50' },
  CRIACAO_FUNCIONARIO: { Icon: User2, cor: 'text-indigo-600', bg: 'bg-indigo-50' },
  EDICAO_FUNCIONARIO: { Icon: Edit2, cor: 'text-sky-600', bg: 'bg-sky-50' },
  EXCLUSAO_FUNCIONARIO: { Icon: Trash2, cor: 'text-red-600', bg: 'bg-red-50' },
  ALTERACAO_ESTOQUE: { Icon: Edit2, cor: 'text-cyan-600', bg: 'bg-cyan-50' },
  ANONIMIZACAO_CLIENTE: { Icon: Trash2, cor: 'text-slate-600', bg: 'bg-slate-50' },
} as const

// ── FORMATAÇÃO ────────────────────────────────────────────────────────

const TZ = 'America/Sao_Paulo'

function formatarAcao(acao: string): string {
  return acao
    .split('_')
    .map(palavra => palavra.charAt(0) + palavra.slice(1).toLowerCase())
    .join(' ')
}

function formatarTimestamp(data: Date): string {
  return formatInTimeZone(data, TZ, 'dd/MM/yyyy HH:mm:ss')
}

// ── COMPONENTE: DIFF VIEWER ────────────────────────────────────────

interface DiffViewerProps {
  antes?: Record<string, any> | null
  depois?: Record<string, any> | null
}

function DiffViewer({ antes, depois }: DiffViewerProps) {
  if (!antes && !depois) {
    return <p className="text-sm text-slate-500">Sem dados disponíveis</p>
  }

  const todasAsCluves = new Set([
    ...Object.keys(antes || {}),
    ...Object.keys(depois || {}),
  ])

  return (
    <div className="space-y-2 text-sm font-mono">
      {Array.from(todasAsCluves).map(chave => {
        const valorAntes = antes?.[chave]
        const valorDepois = depois?.[chave]
        const mudou = JSON.stringify(valorAntes) !== JSON.stringify(valorDepois)

        if (!mudou && valorAntes === undefined) return null

        return (
          <div key={chave} className="flex gap-4">
            <span className="w-32 font-semibold text-slate-700">{chave}:</span>
            <div className="flex-1 space-y-1">
              {valorAntes !== undefined && (
                <div className="text-red-600">
                  ❌ {typeof valorAntes === 'object' ? JSON.stringify(valorAntes) : valorAntes}
                </div>
              )}
              {valorDepois !== undefined && (
                <div className="text-green-600">
                  ✅ {typeof valorDepois === 'object' ? JSON.stringify(valorDepois) : valorDepois}
                </div>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}

// ── COMPONENTE: LINHA DE AUDITORIA ────────────────────────────────────

interface LinhaAuditoriaProps {
  log: AuditLogComUsuario
}

function LinhaAuditoria({ log }: LinhaAuditoriaProps) {
  const [expandido, setExpandido] = useState(false)
  const config = iconesAcao[log.acao as keyof typeof iconesAcao] || {
    Icon: Edit2,
    cor: 'text-slate-600',
    bg: 'bg-slate-50',
  }
  const { Icon, cor, bg } = config

  return (
    <Card className="overflow-hidden">
      <CardContent className="p-4">
        {/* Header */}
        <div className="flex items-start gap-4">
          <div className={`${bg} p-2 rounded-lg shrink-0`}>
            <Icon className={`${cor} w-5 h-5`} />
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-baseline gap-2 flex-wrap">
              <h4 className="font-semibold text-slate-900">
                {formatarAcao(log.acao)}
              </h4>
              <span className="text-xs font-mono text-slate-500">
                {log.tabelaAfetada}#{log.registroId.slice(0, 8)}
              </span>
            </div>

            <div className="mt-1 flex gap-4 text-sm text-slate-600">
              <span>👤 {log.usuarioNome}</span>
              <span>📅 {formatarTimestamp(log.criadoEm)}</span>
            </div>

            {log.motivo && (
              <p className="mt-2 text-sm text-slate-700 italic">
                💬 {log.motivo}
              </p>
            )}
          </div>

          {(log.dadosAntes || log.dadosDepois) && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setExpandido(!expandido)}
              className="shrink-0"
            >
              <ChevronDown
                className={`w-4 h-4 transition-transform ${expandido ? 'rotate-180' : ''}`}
              />
            </Button>
          )}
        </div>

        {/* Diff */}
        {expandido && (log.dadosAntes || log.dadosDepois) && (
          <div className="mt-4 pt-4 border-t border-slate-200 bg-slate-50 rounded p-3">
            <DiffViewer antes={log.dadosAntes} depois={log.dadosDepois} />
          </div>
        )}
      </CardContent>
    </Card>
  )
}

// ── COMPONENTE: HISTÓRICO AUDITORIA (PRINCIPAL) ────────────────────────

export function HistoricoAuditoria({
  logs,
  titulo = 'Histórico de Auditoria',
}: HistoricoAuditoriaProps) {
  if (logs.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{titulo}</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-center text-slate-500 py-8">
            📋 Nenhum evento de auditoria registrado ainda.
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{titulo}</CardTitle>
        <p className="text-sm text-slate-600 mt-1">
          {logs.length} evento{logs.length !== 1 ? 's' : ''} registrado{logs.length !== 1 ? 's' : ''}
        </p>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {logs.map(log => (
            <LinhaAuditoria key={log.id} log={log} />
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
