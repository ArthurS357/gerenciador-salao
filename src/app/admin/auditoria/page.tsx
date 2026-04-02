export const dynamic = 'force-dynamic'

import { buscarEventosDoDia, type EventoAuditoria, type TipoEvento } from '@/app/actions/auditoria'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import AdminHeader from '@/components/admin/AdminHeader'

// ── Configuração visual por tipo de evento ────────────────────────────────────

const CONFIG_TIPO: Record<TipoEvento, { label: string; cor: string; bg: string }> = {
    AUDITLOG:            { label: 'Auditoria',   cor: 'text-violet-700',  bg: 'bg-violet-100'  },
    AGENDAMENTO_CRIADO:  { label: 'Agendamento', cor: 'text-blue-700',    bg: 'bg-blue-100'    },
    COMANDA_FINALIZADA:  { label: 'Comanda',     cor: 'text-emerald-700', bg: 'bg-emerald-100' },
    ESTORNO:             { label: 'Estorno',     cor: 'text-red-700',     bg: 'bg-red-100'     },
}

function BadgeTipo({ tipo }: { tipo: TipoEvento }) {
    const cfg = CONFIG_TIPO[tipo]
    return (
        <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${cfg.bg} ${cfg.cor}`}>
            {cfg.label}
        </span>
    )
}

function LinhaEvento({ evento }: { evento: EventoAuditoria }) {
    return (
        <div className="flex flex-col sm:flex-row sm:items-start gap-2 border-b border-border pb-4 last:border-0 last:pb-0">
            <div className="flex-shrink-0 pt-0.5">
                <BadgeTipo tipo={evento.tipo} />
            </div>
            <div className="flex-1 min-w-0">
                <p className="font-semibold text-sm text-foreground">{evento.acao}</p>
                <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-1">
                    <span className="text-xs text-muted-foreground">
                        <span className="font-medium">Entidade:</span> {evento.entidade} · {evento.entidadeId.slice(0, 8)}…
                    </span>
                    <span className="text-xs text-muted-foreground">
                        <span className="font-medium">Por:</span> {evento.responsavel}
                    </span>
                </div>
                {evento.detalhes && (
                    <p className="mt-1 text-xs text-muted-foreground italic">{evento.detalhes}</p>
                )}
            </div>
            <span className="flex-shrink-0 text-xs text-muted-foreground whitespace-nowrap">
                {new Date(evento.timestamp).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
            </span>
        </div>
    )
}

// ── Página ────────────────────────────────────────────────────────────────────

export default async function AuditoriaGlobalPage() {
    const resposta = await buscarEventosDoDia()

    const hoje = new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' })

    const eventos = resposta.sucesso && 'data' in resposta ? resposta.data.eventos : []

    const contadores = eventos.reduce<Record<TipoEvento, number>>(
        (acc, e) => ({ ...acc, [e.tipo]: (acc[e.tipo] ?? 0) + 1 }),
        { AUDITLOG: 0, AGENDAMENTO_CRIADO: 0, COMANDA_FINALIZADA: 0, ESTORNO: 0 }
    )

    return (
        <div className="min-h-screen bg-background font-sans">
            <AdminHeader
                titulo="Trilha de Auditoria"
                subtitulo="Monitoramento global de todas as ações sensíveis do salão."
                abaAtiva="Auditoria"
            />

            <div className="max-w-7xl mx-auto px-4 md:px-8 pb-12 mt-6 space-y-6">

                {/* Resumo do dia */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {(Object.entries(CONFIG_TIPO) as [TipoEvento, typeof CONFIG_TIPO[TipoEvento]][]).map(([tipo, cfg]) => (
                        <div key={tipo} className={`rounded-xl border p-4 ${cfg.bg}`}>
                            <p className={`text-xs font-bold uppercase tracking-widest ${cfg.cor}`}>{cfg.label}</p>
                            <p className={`text-3xl font-black mt-1 ${cfg.cor}`}>{contadores[tipo]}</p>
                        </div>
                    ))}
                </div>

                {/* Timeline do dia */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center justify-between flex-wrap gap-2">
                            <span>Eventos de Hoje</span>
                            <span className="text-sm font-normal text-muted-foreground capitalize">{hoje}</span>
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        {!resposta.sucesso ? (
                            <p className="text-sm text-destructive text-center py-4">
                                {'erro' in resposta ? resposta.erro : 'Erro ao carregar auditoria.'}
                            </p>
                        ) : eventos.length === 0 ? (
                            <p className="text-muted-foreground text-center py-6 text-sm">
                                Nenhum evento registrado hoje.
                            </p>
                        ) : (
                            <div className="space-y-4">
                                {eventos.map(evento => (
                                    <LinhaEvento key={evento.id} evento={evento} />
                                ))}
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>
        </div>
    )
}
