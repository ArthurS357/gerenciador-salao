"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { ChevronDown, CalendarPlus, History, Edit2, ShieldAlert } from "lucide-react";

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
}

export function ClienteRow({ cliente, onAgendar, onHistorico, onEditar, onLgpd }: ClienteRowProps) {
    const [expanded, setExpanded] = useState(false);

    // Extrai as iniciais para o Avatar (ex: "Maria Silva" -> "MS")
    const iniciais = cliente.nome
        .split(" ")
        .slice(0, 2)
        .map((n) => n[0])
        .join("")
        .toUpperCase();

    return (
        <div className="border-b border-bege-borda/50 bg-white last:border-0 transition-all hover:bg-creme-escuro/20">
            {/* ── LINHA PRINCIPAL (Área clicável) ── */}
            <div
                onClick={() => setExpanded(!expanded)}
                className="flex cursor-pointer items-center p-4 sm:px-6"
            >
                {/* Avatar */}
                <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-creme-escuro text-xs font-bold text-marrom-medio">
                    {iniciais}
                </div>

                {/* Info Principal + Sub-label */}
                <div className="ml-4 flex-1 min-w-0">
                    <p className="truncate text-sm font-semibold text-marrom-profundo">
                        {cliente.nome}
                    </p>
                    <p className="mt-0.5 truncate font-mono text-xs text-texto-suave">
                        {cliente.telefone}
                    </p>
                </div>

                {/* Métricas Financeiras (Oculto em telas MUITO pequenas, visível no resto) */}
                <div className="mr-4 text-right hidden sm:block">
                    <p className="font-serif text-sm font-bold text-marrom-claro">
                        R$ {cliente.totalGasto.toFixed(2).replace('.', ',')}
                    </p>
                    <p className="text-[10px] text-texto-suave uppercase tracking-wider mt-0.5">
                        {cliente.visitas} {cliente.visitas === 1 ? "visita" : "visitas"}
                    </p>
                </div>

                {/* Indicador de Expansão animado */}
                <ChevronDown
                    className={cn(
                        "h-5 w-5 text-texto-suave transition-transform duration-300",
                        expanded && "rotate-180 text-marrom-claro"
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
                    <div className="flex justify-between border-t border-bege-borda/30 px-4 py-3 sm:hidden bg-creme/30">
                        <span className="text-xs text-texto-suave">Total Investido:</span>
                        <span className="font-serif text-sm font-bold text-marrom-claro">
                            R$ {cliente.totalGasto.toFixed(2).replace('.', ',')}
                        </span>
                    </div>

                    {/* Botões de Ação */}
                    <div className="flex flex-wrap items-center gap-2 border-t border-bege-borda/30 bg-[#faf6f1] p-4 sm:px-6">
                        <Button
                            size="sm"
                            onClick={() => onAgendar?.(cliente.id)}
                            className="h-8 bg-marrom-medio text-xs hover:bg-marrom-profundo"
                        >
                            <CalendarPlus className="mr-2 h-3.5 w-3.5" /> Agendar
                        </Button>

                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => onHistorico?.(cliente.id)}
                            className="h-8 border-bege-borda bg-white text-xs text-marrom-medio hover:bg-creme hover:text-marrom-profundo"
                        >
                            <History className="mr-2 h-3.5 w-3.5" /> Histórico
                        </Button>

                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => onEditar?.(cliente.id)}
                            className="h-8 border-bege-borda bg-white text-xs text-marrom-medio hover:bg-creme hover:text-marrom-profundo"
                        >
                            <Edit2 className="mr-2 h-3.5 w-3.5" /> Editar
                        </Button>

                        <div className="flex-1" /> {/* Empurra o LGPD para a direita */}

                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => onLgpd?.(cliente.id)}
                            className="h-8 text-xs text-red-600 hover:bg-red-50 hover:text-red-700"
                        >
                            <ShieldAlert className="mr-2 h-3.5 w-3.5" /> LGPD
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    );
}