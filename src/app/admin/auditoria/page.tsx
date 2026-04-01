'use client'

import { useState, useEffect, useCallback } from 'react'
import AdminHeader from '@/components/admin/AdminHeader'
import { HistoricoAuditoria } from '@/components/admin/HistoricoAuditoria'
import { buscarAuditoriaGlobal } from '@/app/actions/auditoria'
import type { AuditLogComUsuario, AcaoAuditoria, TabelaAfetada } from '@/app/actions/auditoria'
import { Loader2, Search, X, ShieldAlert } from 'lucide-react'

// ── TIPOS ──────────────────────────────────────────────────────────────────

type FiltrosAuditoria = {
  tabelaAfetada: string
  acao: string
  desde: string   // string do <input type="date">
  ate: string
}

const FILTROS_INICIAIS: FiltrosAuditoria = {
  tabelaAfetada: '',
  acao: '',
  desde: '',
  ate: '',
}

// ── LISTAS DE OPÇÕES ───────────────────────────────────────────────────────

const TABELAS: { valor: TabelaAfetada | ''; label: string }[] = [
  { valor: '', label: 'Todas as Entidades' },
  { valor: 'Agendamento', label: 'Agendamento' },
  { valor: 'Funcionario', label: 'Funcionário' },
  { valor: 'Cliente', label: 'Cliente' },
  { valor: 'Produto', label: 'Produto' },
  { valor: 'Servico', label: 'Serviço' },
  { valor: 'ItemProduto', label: 'Item de Produto' },
  { valor: 'ItemServico', label: 'Item de Serviço' },
]

const ACOES: { valor: AcaoAuditoria | ''; label: string }[] = [
  { valor: '', label: 'Todas as Ações' },
  { valor: 'FECHAMENTO_COMANDA', label: 'Fechamento de Comanda' },
  { valor: 'ALTERACAO_COMISSAO', label: 'Alteração de Comissão' },
  { valor: 'EXCLUSAO_CLIENTE', label: 'Exclusão de Cliente' },
  { valor: 'EDICAO_PRECO', label: 'Edição de Preço' },
  { valor: 'CRIACAO_AGENDAMENTO', label: 'Criação de Agendamento' },
  { valor: 'CANCELAMENTO_AGENDAMENTO', label: 'Cancelamento de Agendamento' },
  { valor: 'CRIACAO_FUNCIONARIO', label: 'Criação de Funcionário' },
  { valor: 'EDICAO_FUNCIONARIO', label: 'Edição de Funcionário' },
  { valor: 'EXCLUSAO_FUNCIONARIO', label: 'Exclusão de Funcionário' },
  { valor: 'ALTERACAO_ESTOQUE', label: 'Alteração de Estoque' },
  { valor: 'ANONIMIZACAO_CLIENTE', label: 'Anonimização de Cliente' },
]

// ── HELPERS ────────────────────────────────────────────────────────────────

function parseDateInput(value: string, endOfDay = false): Date | undefined {
  if (!value) return undefined
  const [year, month, day] = value.split('-').map(Number)
  const d = new Date(year, month - 1, day)
  if (endOfDay) {
    d.setHours(23, 59, 59, 999)
  } else {
    d.setHours(0, 0, 0, 0)
  }
  return d
}

// ── PÁGINA ─────────────────────────────────────────────────────────────────

export default function PainelAuditoriaPage() {
  const [logs, setLogs] = useState<AuditLogComUsuario[]>([])
  const [total, setTotal] = useState(0)
  const [isLoading, setIsLoading] = useState(true)
  const [erro, setErro] = useState<string | null>(null)

  // Filtros ativos (aplicados na query)
  const [filtrosAtivos, setFiltrosAtivos] = useState<FiltrosAuditoria>(FILTROS_INICIAIS)
  // Filtros sendo editados (antes de aplicar)
  const [filtrosRascunho, setFiltrosRascunho] = useState<FiltrosAuditoria>(FILTROS_INICIAIS)

  const carregarLogs = useCallback(async (filtros: FiltrosAuditoria) => {
    setIsLoading(true)
    setErro(null)

    const resultado = await buscarAuditoriaGlobal({
      tabelaAfetada: filtros.tabelaAfetada || undefined,
      acao: filtros.acao || undefined,
      desde: parseDateInput(filtros.desde, false),
      ate: parseDateInput(filtros.ate, true),
      limit: 100,
    })

    if (resultado.sucesso && resultado.data) {
      setLogs(resultado.data.logs)
      setTotal(resultado.data.total)
    } else {
      setErro(resultado.erro ?? 'Erro desconhecido ao carregar auditoria.')
      setLogs([])
      setTotal(0)
    }

    setIsLoading(false)
  }, [])

  // Carga inicial
  useEffect(() => {
    carregarLogs(FILTROS_INICIAIS)
  }, [carregarLogs])

  const handleAplicarFiltros = () => {
    setFiltrosAtivos(filtrosRascunho)
    carregarLogs(filtrosRascunho)
  }

  const handleLimparFiltros = () => {
    setFiltrosRascunho(FILTROS_INICIAIS)
    setFiltrosAtivos(FILTROS_INICIAIS)
    carregarLogs(FILTROS_INICIAIS)
  }

  const filtrosAplicados =
    filtrosAtivos.tabelaAfetada !== '' ||
    filtrosAtivos.acao !== '' ||
    filtrosAtivos.desde !== '' ||
    filtrosAtivos.ate !== ''

  return (
    <div className="min-h-screen bg-background p-4 md:p-8 font-sans">
      <AdminHeader
        titulo="Auditoria & Compliance"
        subtitulo="Rastreabilidade completa de todas as operações sensíveis do sistema."
        abaAtiva="Auditoria"
      />

      <div className="max-w-7xl mx-auto px-4 md:px-0">

        {/* ── PAINEL DE FILTROS ─────────────────────────────────────────── */}
        <section className="bg-card border border-border rounded-2xl shadow-sm mb-8">
          <div className="p-5 border-b border-border bg-muted/30 rounded-t-2xl flex items-center gap-3">
            <ShieldAlert className="w-5 h-5 text-primary shrink-0" />
            <div>
              <h2 className="text-base font-bold text-foreground">Filtros de Investigação</h2>
              <p className="text-xs text-muted-foreground mt-0.5">Refine por entidade, tipo de ação ou período.</p>
            </div>
          </div>

          <div className="p-5 grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
            {/* Dropdown: Entidade */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                Entidade
              </label>
              <select
                value={filtrosRascunho.tabelaAfetada}
                onChange={e => setFiltrosRascunho(f => ({ ...f, tabelaAfetada: e.target.value }))}
                className="w-full bg-background border border-border rounded-xl px-3 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors"
              >
                {TABELAS.map(({ valor, label }) => (
                  <option key={valor} value={valor}>{label}</option>
                ))}
              </select>
            </div>

            {/* Dropdown: Ação */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                Tipo de Ação
              </label>
              <select
                value={filtrosRascunho.acao}
                onChange={e => setFiltrosRascunho(f => ({ ...f, acao: e.target.value }))}
                className="w-full bg-background border border-border rounded-xl px-3 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors"
              >
                {ACOES.map(({ valor, label }) => (
                  <option key={valor} value={valor}>{label}</option>
                ))}
              </select>
            </div>

            {/* Data Início */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                Data Início
              </label>
              <input
                type="date"
                value={filtrosRascunho.desde}
                onChange={e => setFiltrosRascunho(f => ({ ...f, desde: e.target.value }))}
                className="w-full bg-background border border-border rounded-xl px-3 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors"
              />
            </div>

            {/* Data Fim */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                Data Fim
              </label>
              <input
                type="date"
                value={filtrosRascunho.ate}
                onChange={e => setFiltrosRascunho(f => ({ ...f, ate: e.target.value }))}
                className="w-full bg-background border border-border rounded-xl px-3 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors"
              />
            </div>
          </div>

          {/* Botões de Ação */}
          <div className="px-5 pb-5 flex flex-col sm:flex-row gap-3 justify-end">
            {filtrosAplicados && (
              <button
                onClick={handleLimparFiltros}
                disabled={isLoading}
                className="flex items-center justify-center gap-2 px-5 py-2.5 bg-muted text-muted-foreground rounded-xl text-sm font-bold hover:bg-red-50 hover:text-red-600 hover:border-red-200 border border-border transition-all disabled:opacity-50"
              >
                <X className="w-4 h-4" />
                Limpar Filtros
              </button>
            )}
            <button
              onClick={handleAplicarFiltros}
              disabled={isLoading}
              className="flex items-center justify-center gap-2 px-6 py-2.5 bg-primary text-primary-foreground rounded-xl text-sm font-bold hover:opacity-90 transition-all disabled:opacity-50 shadow-sm"
            >
              {isLoading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Search className="w-4 h-4" />
              )}
              {isLoading ? 'Carregando...' : 'Aplicar Filtros'}
            </button>
          </div>
        </section>

        {/* ── BADGE DE RESULTADOS ───────────────────────────────────────── */}
        {!isLoading && !erro && (
          <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="flex items-center gap-3">
              <span className="text-sm text-muted-foreground">
                {filtrosAplicados ? 'Resultados filtrados:' : 'Todos os registros:'}
              </span>
              <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-primary/10 text-primary border border-primary/20">
                {logs.length} de {total} evento{total !== 1 ? 's' : ''}
              </span>
              {total > 100 && (
                <span className="text-xs text-amber-600 bg-amber-50 border border-amber-200 px-3 py-1 rounded-full font-semibold">
                  ⚠ Exibindo os 100 mais recentes. Use filtros para refinar.
                </span>
              )}
            </div>

            {filtrosAplicados && (
              <div className="flex flex-wrap gap-2 text-xs">
                {filtrosAtivos.tabelaAfetada && (
                  <span className="bg-blue-50 text-blue-700 border border-blue-200 px-2.5 py-1 rounded-full font-semibold">
                    Entidade: {filtrosAtivos.tabelaAfetada}
                  </span>
                )}
                {filtrosAtivos.acao && (
                  <span className="bg-purple-50 text-purple-700 border border-purple-200 px-2.5 py-1 rounded-full font-semibold">
                    Ação: {ACOES.find(a => a.valor === filtrosAtivos.acao)?.label ?? filtrosAtivos.acao}
                  </span>
                )}
                {filtrosAtivos.desde && (
                  <span className="bg-green-50 text-green-700 border border-green-200 px-2.5 py-1 rounded-full font-semibold">
                    De: {new Date(filtrosAtivos.desde + 'T00:00:00').toLocaleDateString('pt-BR')}
                  </span>
                )}
                {filtrosAtivos.ate && (
                  <span className="bg-orange-50 text-orange-700 border border-orange-200 px-2.5 py-1 rounded-full font-semibold">
                    Até: {new Date(filtrosAtivos.ate + 'T00:00:00').toLocaleDateString('pt-BR')}
                  </span>
                )}
              </div>
            )}
          </div>
        )}

        {/* ── ESTADOS: ERRO / LOADING / VAZIO ──────────────────────────── */}
        {erro && (
          <div className="p-6 bg-red-50 border border-red-200 rounded-2xl text-red-700 font-semibold text-sm text-center shadow-sm">
            ❌ {erro}
          </div>
        )}

        {isLoading && (
          <div className="flex flex-col items-center justify-center py-24 gap-4 text-muted-foreground">
            <Loader2 className="w-10 h-10 animate-spin text-primary" />
            <p className="text-sm font-semibold">Carregando registros de auditoria...</p>
          </div>
        )}

        {/* ── TIMELINE DE RESULTADOS ─────────────────────────────────── */}
        {!isLoading && !erro && (
          <HistoricoAuditoria
            logs={logs}
            titulo={
              filtrosAplicados
                ? 'Resultados da Investigação'
                : 'Trilha de Auditoria Global'
            }
          />
        )}
      </div>
    </div>
  )
}
