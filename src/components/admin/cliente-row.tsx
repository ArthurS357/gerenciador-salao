// src/components/admin/cliente-row.tsx
"use client"

import { useState } from "react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
    ChevronDown,
    CalendarPlus,
    History,
    Edit2,
    ShieldAlert,
    Trash2,
    AlertCircle,
    Receipt,
} from "lucide-react"

interface ClienteRowProps {
    cliente: {
        id: string
        nome: string
        telefone: string
        totalGasto?: number
        visitas?: number
        temDividaPendente?: boolean
    }
    onAgendar?: (id: string) => void
    onHistorico?: (id: string) => void
    onEditar?: (id: string) => void
    onLgpd?: (id: string) => void
    onExcluir?: (id: string) => void
    onDividas?: (id: string, nome: string) => void
    onViewDividas?: (id: string, nome: string) => void // Adicionado para compatibilidade com a page.tsx
}

export function ClienteRow({
    cliente,
    onAgendar,
    onHistorico,
    onEditar,
    onLgpd,
    onExcluir,
    onDividas,
    onViewDividas,
}: ClienteRowProps) {
    const [expanded, setExpanded] = useState(false)

    const isAnonimizado = cliente.nome === "Anonimizado"
    const inadimplente = !!cliente.temDividaPendente

    const iniciais = isAnonimizado
        ? "LG"
        : cliente.nome.split(" ").slice(0, 2).map((n) => n[0] || "").join("").toUpperCase()

    // Fallbacks seguros para evitar erros se os dados não vierem da API
    const totalGasto = cliente.totalGasto || 0
    const visitas = cliente.visitas || 0

    // Função unificada para abrir o modal de dívidas
    const handleAbrirDividas = (e: React.MouseEvent) => {
        e.stopPropagation() // Evita fechar/abrir o accordion ao clicar
        if (onViewDividas) onViewDividas(cliente.id, cliente.nome)
        else if (onDividas) onDividas(cliente.id, cliente.nome)
    }

    return (
        <div className="border-b border-border/50 bg-card last:border-0 transition-all hover:bg-muted/30">
            {/* ── LINHA PRINCIPAL ── */}
            <div
                onClick={() => setExpanded(!expanded)}
                className="flex cursor-pointer items-center p-4 sm:px-6 gap-3"
            >
                {/* Avatar — borda vermelha se inadimplente */}
                <div className={cn(
                    "flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-xs font-bold transition-colors",
                    inadimplente
                        ? "bg-red-100 text-red-700 ring-2 ring-red-300"
                        : "bg-muted text-primary"
                )}>
                    {iniciais}
                </div>

                {/* Info Principal */}
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                        <p className={cn(
                            "truncate text-sm font-semibold",
                            isAnonimizado && "text-muted-foreground italic",
                            inadimplente && "text-red-700"
                        )}>
                            {cliente.nome}
                        </p>

                        {/* Badge de Inadimplência */}
                        {inadimplente && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-100 text-red-700 border border-red-200 shrink-0">
                                <AlertCircle className="w-2.5 h-2.5" />
                                Inadimplente
                            </span>
                        )}
                    </div>
                    <p className="mt-0.5 truncate font-mono text-xs text-muted-foreground">
                        {cliente.telefone}
                    </p>
                </div>

                {/* Métricas — oculto no mobile */}
                <div className="mr-4 text-right hidden sm:block shrink-0">
                    <p className="font-serif text-sm font-bold text-primary">
                        R$ {totalGasto.toFixed(2).replace(".", ",")}
                    </p>
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wider mt-0.5">
                        {visitas} {visitas === 1 ? "visita" : "visitas"}
                    </p>
                </div>

                {/* Chevron */}
                <ChevronDown className={cn(
                    "h-5 w-5 text-muted-foreground transition-transform duration-300 shrink-0",
                    expanded && "rotate-180 text-primary"
                )} />
            </div>

            {/* ── ÁREA EXPANDIDA ── */}
            <div className={cn(
                "grid transition-all duration-300 ease-in-out",
                expanded ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
            )}>
                <div className="overflow-hidden">
                    <div className="overflow-x-auto">
                        {/* Métricas para Mobile */}
                        <div className="flex justify-between border-t border-border/30 px-4 py-3 sm:hidden bg-muted/20">
                            <span className="text-xs text-muted-foreground">Total Investido:</span>
                            <span className="font-serif text-sm font-bold text-primary">
                                R$ {totalGasto.toFixed(2).replace(".", ",")}
                            </span>
                        </div>

                        {/* Botões de Ação */}
                        <div className="flex flex-wrap items-center gap-2 border-t border-border/30 bg-muted/10 p-4 sm:px-6">
                            <Button
                                size="sm"
                                onClick={(e) => { e.stopPropagation(); onAgendar?.(cliente.id) }}
                                disabled={!onAgendar}
                                className="h-8 bg-primary text-xs hover:bg-primary/90 text-primary-foreground font-bold"
                            >
                                <CalendarPlus className="mr-2 h-3.5 w-3.5" /> Agendar
                            </Button>

                            <Button
                                variant="outline"
                                size="sm"
                                onClick={(e) => { e.stopPropagation(); onHistorico?.(cliente.id) }}
                                disabled={!onHistorico}
                                className="h-8 border-border bg-card text-xs text-foreground hover:bg-muted font-semibold"
                            >
                                <History className="mr-2 h-3.5 w-3.5" /> Histórico
                            </Button>

                            <Button
                                variant="outline"
                                size="sm"
                                onClick={(e) => { e.stopPropagation(); onEditar?.(cliente.id) }}
                                disabled={!onEditar}
                                className="h-8 border-border bg-card text-xs text-foreground hover:bg-muted font-semibold"
                            >
                                <Edit2 className="mr-2 h-3.5 w-3.5" /> Editar
                            </Button>

                            {/* Botão de Dívidas — apenas se houver pendência */}
                            {inadimplente && (
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={handleAbrirDividas}
                                    className="h-8 text-xs border-red-200 text-red-700 bg-red-50 hover:bg-red-100 hover:text-red-800 font-bold"
                                >
                                    <Receipt className="mr-2 h-3.5 w-3.5" /> Dívidas
                                </Button>
                            )}

                            <div className="flex-1" />

                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={(e) => { e.stopPropagation(); onLgpd?.(cliente.id) }}
                                disabled={!onLgpd}
                                className="h-8 text-xs text-amber-600 hover:bg-amber-100 hover:text-amber-700 font-semibold"
                            >
                                <ShieldAlert className="mr-2 h-3.5 w-3.5" /> LGPD
                            </Button>

                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={(e) => { e.stopPropagation(); onExcluir?.(cliente.id) }}
                                disabled={!onExcluir}
                                className="h-8 text-xs text-destructive hover:bg-destructive/10 hover:text-destructive font-semibold"
                            >
                                <Trash2 className="mr-2 h-3.5 w-3.5" /> Excluir
                            </Button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}