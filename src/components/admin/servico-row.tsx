"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { ChevronDown, Edit2, Star, Plus, Trash2, Scissors, Beaker } from "lucide-react";

interface InsumoItem {
    id: string;
    quantidadeUsada: number;
    produto: {
        nome: string;
        unidadeMedida: string;
    };
}

interface ServicoRowProps {
    servico: {
        id: string;
        nome: string;
        preco: number | null;
        tempoMinutos: number | null;
        destaque: boolean;
        insumos: InsumoItem[];
    };
    onEditar?: (id: string) => void;
    onAlternarDestaque?: (id: string, atual: boolean) => void;
    onAdicionarInsumo?: (idServico: string) => void;
    onRemoverInsumo?: (idInsumo: string, nomeProduto: string) => void;
}

export function ServicoRow({
    servico,
    onEditar,
    onAlternarDestaque,
    onAdicionarInsumo,
    onRemoverInsumo,
}: ServicoRowProps) {
    const [expanded, setExpanded] = useState(false);

    return (
        <div className="border-b border-border/50 bg-card last:border-0 transition-all hover:bg-muted/30">
            {/* ── LINHA PRINCIPAL (Visão Vitrine) ── */}
            <div
                onClick={() => setExpanded(!expanded)}
                className="flex cursor-pointer items-center p-4 sm:px-6"
            >
                {/* Ícone do Serviço */}
                <div className={cn(
                    "flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl text-primary transition-colors",
                    servico.destaque ? "bg-primary/10 border border-primary/20" : "bg-muted"
                )}>
                    {servico.destaque ? <Star className="h-5 w-5 fill-primary" /> : <Scissors className="h-5 w-5 opacity-70" />}
                </div>

                {/* Info Principal + Sub-label (Tempo) */}
                <div className="ml-4 flex-1 min-w-0">
                    <p className="truncate text-sm font-semibold text-foreground flex items-center gap-2">
                        {servico.nome}
                        {servico.destaque && (
                            <span className="hidden sm:inline-block px-1.5 py-0.5 rounded text-[8px] font-bold uppercase tracking-widest bg-primary/10 text-primary">
                                Vitrine
                            </span>
                        )}
                    </p>
                    <p className="mt-0.5 truncate font-mono text-xs text-muted-foreground">
                        {servico.tempoMinutos ? `${servico.tempoMinutos} min` : 'Tempo não definido'}
                    </p>
                </div>

                {/* Preço de Venda */}
                <div className="mr-4 text-right">
                    <p className="font-serif text-sm font-bold text-primary">
                        {servico.preco ? `R$ ${servico.preco.toFixed(2).replace('.', ',')}` : 'Sob consulta'}
                    </p>
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wider mt-0.5">
                        {servico.insumos.length} {servico.insumos.length === 1 ? 'insumo' : 'insumos'}
                    </p>
                </div>

                <ChevronDown
                    className={cn(
                        "h-5 w-5 text-muted-foreground transition-transform duration-300",
                        expanded && "rotate-180 text-primary"
                    )}
                />
            </div>

            {/* ── ÁREA EXPANDIDA (Ficha Técnica & Ações) ── */}
            <div
                className={cn(
                    "grid transition-all duration-300 ease-in-out",
                    expanded ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
                )}
            >
                <div className="overflow-hidden border-t border-border/30 bg-muted/10">
                    <div className="overflow-x-auto">

                    {/* Barra de Ações Rápidas do Serviço */}
                    <div className="flex flex-wrap items-center gap-2 p-4 sm:px-6 border-b border-border/30">
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => onEditar?.(servico.id)}
                            className="h-8 border-border bg-card text-xs text-foreground hover:bg-muted font-semibold"
                        >
                            <Edit2 className="mr-2 h-3.5 w-3.5" /> Editar Serviço
                        </Button>

                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => onAlternarDestaque?.(servico.id, servico.destaque)}
                            className={cn(
                                "h-8 border-border text-xs font-semibold",
                                servico.destaque
                                    ? "bg-primary/5 text-primary hover:bg-primary/10 border-primary/20"
                                    : "bg-card text-foreground hover:bg-muted"
                            )}
                        >
                            <Star className={cn("mr-2 h-3.5 w-3.5", servico.destaque && "fill-primary")} />
                            {servico.destaque ? 'Remover Destaque' : 'Destacar na Vitrine'}
                        </Button>
                    </div>

                    {/* Sub-seção: Ficha Técnica (Insumos) */}
                    <div className="p-4 sm:px-6 bg-[#faf6f1]">
                        <div className="flex items-center justify-between mb-3">
                            <h4 className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                                <Beaker className="h-3.5 w-3.5" /> Ficha Técnica (Consumo por atendimento)
                            </h4>
                            <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => onAdicionarInsumo?.(servico.id)}
                                className="h-7 px-2 text-xs text-primary hover:text-primary hover:bg-primary/10"
                            >
                                <Plus className="mr-1 h-3.5 w-3.5" /> Adicionar Produto
                            </Button>
                        </div>

                        {servico.insumos.length === 0 ? (
                            <div className="rounded-xl border border-dashed border-border p-4 text-center">
                                <p className="text-xs text-muted-foreground italic">
                                    Nenhum produto atrelado. O custo deste serviço é zero ou a ficha está incompleta?
                                </p>
                            </div>
                        ) : (
                            <div className="space-y-2">
                                {servico.insumos.map((insumo) => (
                                    <div
                                        key={insumo.id}
                                        className="flex items-center justify-between rounded-lg border border-border/50 bg-white px-3 py-2 shadow-sm transition-colors hover:border-primary/30"
                                    >
                                        <div>
                                            <p className="text-xs font-semibold text-foreground">{insumo.produto.nome}</p>
                                            <p className="text-[10px] text-muted-foreground font-mono mt-0.5">
                                                Consumo: <span className="font-bold text-primary">{insumo.quantidadeUsada} {insumo.produto.unidadeMedida}</span>
                                            </p>
                                        </div>
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            onClick={() => onRemoverInsumo?.(insumo.id, insumo.produto.nome)}
                                            className="h-7 w-7 text-muted-foreground hover:bg-destructive/10 hover:text-destructive rounded-md"
                                            title="Remover insumo"
                                        >
                                            <Trash2 className="h-3.5 w-3.5" />
                                        </Button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    </div>
                </div>
            </div>
        </div>
    );
}