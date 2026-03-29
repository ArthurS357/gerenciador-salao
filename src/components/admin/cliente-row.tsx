// src/components/admin/cliente-row.tsx
"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { ChevronDown, CalendarPlus, History, Edit2, ShieldAlert, Trash2 } from "lucide-react";

interface ClienteRowProps {
    cliente: {
        id: string;
        nome: string;
        telefone: string;
        totalGasto: number;
        visitas: number;
    };
    onAgendar?: (id: string) => void;
    onHistorico?: (id: string) => void;
    onEditar?: (id: string) => void;
    onLgpd?: (id: string) => void;
    onExcluir?: (id: string) => void; // <-- ADICIONADO AQUI
}

export function ClienteRow({ cliente, onAgendar, onHistorico, onEditar, onLgpd, onExcluir }: ClienteRowProps) {
    const [expanded, setExpanded] = useState(false);

    // Extrai as iniciais para o Avatar (ex: "Maria Silva" -> "MS")
    const iniciais = cliente.nome !== 'Anonimizado'
        ? cliente.nome.split(" ").slice(0, 2).map((n) => n[0]).join("").toUpperCase()
        : 'LG'; // Iniciais para LGPD/Anonimizado

    return (
        <div className="border-b border-border/50 bg-card last:border-0 transition-all hover:bg-muted/30">
            {/* ── LINHA PRINCIPAL (Área clicável) ── */}
            <div
                onClick={() => setExpanded(!expanded)}
                className="flex cursor-pointer items-center p-4 sm:px-6"
            >
                {/* Avatar */}
                <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-muted text-xs font-bold text-primary">
                    {iniciais}
                </div>

                {/* Info Principal + Sub-label */}
                <div className="ml-4 flex-1 min-w-0">
                    <p className={cn(
                        "truncate text-sm font-semibold text-foreground",
                        cliente.nome === 'Anonimizado' && "text-muted-foreground italic"
                    )}>
                        {cliente.nome}
                    </p>
                    <p className="mt-0.5 truncate font-mono text-xs text-muted-foreground">
                        {cliente.telefone}
                    </p>
                </div>

                {/* Métricas (Oculto no mobile extremo) */}
                <div className="mr-4 text-right hidden sm:block">
                    <p className="font-serif text-sm font-bold text-primary">
                        R$ {cliente.totalGasto.toFixed(2).replace('.', ',')}
                    </p>
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wider mt-0.5">
                        {cliente.visitas} {cliente.visitas === 1 ? "visita" : "visitas"}
                    </p>
                </div>

                {/* Indicador de Expansão animado */}
                <ChevronDown
                    className={cn(
                        "h-5 w-5 text-muted-foreground transition-transform duration-300",
                        expanded && "rotate-180 text-primary"
                    )}
                />
            </div>

            {/* ── ÁREA EXPANDIDA (Progressive Disclosure) ── */}
            <div
                className={cn(
                    "grid transition-all duration-300 ease-in-out",
                    expanded ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
                )}
            >
                <div className="overflow-hidden">
                    {/* Métricas para Mobile (só aparece se a tela for muito pequena) */}
                    <div className="flex justify-between border-t border-border/30 px-4 py-3 sm:hidden bg-muted/20">
                        <span className="text-xs text-muted-foreground">Total Investido:</span>
                        <span className="font-serif text-sm font-bold text-primary">
                            R$ {cliente.totalGasto.toFixed(2).replace('.', ',')}
                        </span>
                    </div>

                    {/* Botões de Ação */}
                    <div className="flex flex-wrap items-center gap-2 border-t border-border/30 bg-muted/10 p-4 sm:px-6">
                        <Button
                            size="sm"
                            onClick={() => onAgendar?.(cliente.id)}
                            disabled={!onAgendar}
                            className="h-8 bg-primary text-xs hover:bg-primary/90 text-primary-foreground font-bold"
                        >
                            <CalendarPlus className="mr-2 h-3.5 w-3.5" /> Agendar
                        </Button>

                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => onHistorico?.(cliente.id)}
                            className="h-8 border-border bg-card text-xs text-foreground hover:bg-muted font-semibold"
                        >
                            <History className="mr-2 h-3.5 w-3.5" /> Histórico
                        </Button>

                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => onEditar?.(cliente.id)}
                            disabled={!onEditar}
                            className="h-8 border-border bg-card text-xs text-foreground hover:bg-muted font-semibold"
                        >
                            <Edit2 className="mr-2 h-3.5 w-3.5" /> Editar
                        </Button>

                        <div className="flex-1" /> {/* Empurra os botões seguintes para a direita */}

                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => onLgpd?.(cliente.id)}
                            disabled={!onLgpd}
                            className="h-8 text-xs text-amber-600 hover:bg-amber-100 hover:text-amber-700 font-semibold"
                        >
                            <ShieldAlert className="mr-2 h-3.5 w-3.5" /> LGPD
                        </Button>

                        {/* NOVO BOTÃO ADICIONADO PARA A AÇÃO DE EXCLUIR */}
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => onExcluir?.(cliente.id)}
                            disabled={!onExcluir}
                            className="h-8 text-xs text-destructive hover:bg-destructive/10 hover:text-destructive font-semibold"
                        >
                            <Trash2 className="mr-2 h-3.5 w-3.5" /> Excluir
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    );
}