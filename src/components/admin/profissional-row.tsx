"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { ChevronDown, Edit2, Clock, Scissors, UserX, UserCheck } from "lucide-react";

interface ExpedienteDia {
    diaSemana: number;
    ativo: boolean;
    horaInicio: string;
    horaFim: string;
}

interface ProfissionalRowProps {
    profissional: {
        id: string;
        nome: string;
        cargo: string;
        comissao: number;
        ativo: boolean;
        expediente: ExpedienteDia[];
        servicosAtribuidos: string[];
    };
    onEditar?: (id: string) => void;
    onEditarEscala?: (id: string) => void;
    onEditarPortifolio?: (id: string) => void;
    onAlternarStatus?: (id: string, atual: boolean) => void;
}

const DIAS_SEMANA = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

export function ProfissionalRow({ profissional, onEditar, onEditarEscala, onEditarPortifolio, onAlternarStatus }: ProfissionalRowProps) {
    const [expanded, setExpanded] = useState(false);
    const iniciais = profissional.nome.split(" ").slice(0, 2).map((n) => n[0]).join("").toUpperCase();

    return (
        <div className={cn("border-b border-border/50 bg-card last:border-0 transition-all hover:bg-muted/30", !profissional.ativo && "opacity-75 grayscale-[0.5]")}>
            {/* ── LINHA PRINCIPAL ── */}
            <div onClick={() => setExpanded(!expanded)} className="flex cursor-pointer items-center p-4 sm:px-6">
                <div className={cn("flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full text-xs font-bold transition-colors", profissional.ativo ? "bg-primary/10 text-primary border border-primary/20" : "bg-muted text-muted-foreground")}>
                    {iniciais}
                </div>

                <div className="ml-4 flex-1 min-w-0">
                    <p className="truncate text-sm font-semibold text-foreground flex items-center gap-2">
                        {profissional.nome}
                        {!profissional.ativo && <span className="px-1.5 py-0.5 rounded text-[8px] font-bold uppercase tracking-widest bg-destructive/10 text-destructive">Inativo</span>}
                    </p>
                    <p className="mt-0.5 truncate font-mono text-xs text-muted-foreground uppercase tracking-widest">{profissional.cargo}</p>
                </div>

                <div className="mr-4 text-right hidden sm:block">
                    <p className="font-serif text-sm font-bold text-primary">{profissional.comissao}%</p>
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wider mt-0.5">Comissão</p>
                </div>

                <ChevronDown className={cn("h-5 w-5 text-muted-foreground transition-transform duration-300", expanded && "rotate-180 text-primary")} />
            </div>

            {/* ── ÁREA EXPANDIDA ── */}
            <div className={cn("grid transition-all duration-300 ease-in-out", expanded ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0")}>
                <div className="overflow-hidden border-t border-border/30 bg-muted/10">
                    <div className="overflow-x-auto">

                    {/* Ações Rápidas */}
                    <div className="flex flex-wrap items-center gap-2 p-4 sm:px-6 border-b border-border/30 bg-[#faf6f1]">
                        <Button size="sm" onClick={() => onEditarEscala?.(profissional.id)} className="h-8 bg-primary text-xs hover:bg-primary/90 text-primary-foreground font-bold">
                            <Clock className="mr-2 h-3.5 w-3.5" /> Escala
                        </Button>
                        <Button variant="outline" size="sm" onClick={() => onEditarPortifolio?.(profissional.id)} className="h-8 border-border bg-card text-xs text-foreground hover:bg-muted font-semibold">
                            <Scissors className="mr-2 h-3.5 w-3.5" /> Portfólio
                        </Button>
                        <Button variant="outline" size="sm" onClick={() => onEditar?.(profissional.id)} className="h-8 border-border bg-card text-xs text-foreground hover:bg-muted font-semibold">
                            <Edit2 className="mr-2 h-3.5 w-3.5" /> Permissões
                        </Button>
                        <div className="flex-1" />
                        <Button variant="ghost" size="sm" onClick={() => onAlternarStatus?.(profissional.id, profissional.ativo)} className={cn("h-8 text-xs font-semibold", profissional.ativo ? "text-destructive hover:bg-destructive/10 hover:text-destructive" : "text-green-600 hover:bg-green-50 hover:text-green-700")}>
                            {profissional.ativo ? <><UserX className="mr-2 h-3.5 w-3.5" /> Desativar</> : <><UserCheck className="mr-2 h-3.5 w-3.5" /> Reativar</>}
                        </Button>
                    </div>

                    <div className="p-4 sm:px-6 space-y-6">
                        {/* Escala Visual */}
                        <div>
                            <h4 className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-2 mb-3">
                                <Clock className="h-3.5 w-3.5" /> Escala Semanal
                            </h4>
                            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2">
                                {[0, 1, 2, 3, 4, 5, 6].map((diaIndex) => {
                                    const diaInfo = profissional.expediente.find(e => e.diaSemana === diaIndex);
                                    const isFolga = !diaInfo || !diaInfo.ativo;
                                    return (
                                        <div key={diaIndex} className={cn("rounded-xl border p-2 text-center transition-colors shadow-sm", isFolga ? "border-border/50 bg-muted/30 opacity-60" : "border-primary/20 bg-card")}>
                                            <p className={cn("text-[10px] font-bold uppercase tracking-widest mb-1", isFolga ? "text-muted-foreground" : "text-primary")}>{DIAS_SEMANA[diaIndex]}</p>
                                            {isFolga ? <p className="text-xs font-semibold text-muted-foreground italic">Folga</p> : <p className="text-xs font-black text-foreground">{diaInfo.horaInicio} - {diaInfo.horaFim}</p>}
                                        </div>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Serviços */}
                        <div>
                            <h4 className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-2 mb-3">
                                <Scissors className="h-3.5 w-3.5" /> Serviços Atendidos ({profissional.servicosAtribuidos.length})
                            </h4>
                            {profissional.servicosAtribuidos.length === 0 ? (
                                <p className="text-sm text-muted-foreground italic bg-card p-3 rounded-lg border border-border">Nenhum serviço atribuído. Este profissional não aparecerá na agenda.</p>
                            ) : (
                                <div className="flex flex-wrap gap-1.5">
                                    {profissional.servicosAtribuidos.map((servico, idx) => (
                                        <span key={idx} className="rounded-full border border-primary/10 bg-primary/5 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-primary/90">{servico}</span>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                    </div>
                </div>
            </div>
        </div>
    );
}