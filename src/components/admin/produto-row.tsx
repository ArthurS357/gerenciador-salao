"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { ChevronDown, Package, Plus, Minus, Trash2, AlertTriangle, CheckCircle2 } from "lucide-react";
import type { Produto } from "@/types/domain";

// ── Utilitários de Estoque Exportados ────────────────────────────────────────

export type StatusEstoque = 'esgotado' | 'critico' | 'baixo' | 'ok';

export function obterStatusEstoque(estoque: number, tamanhoUnidade: number): StatusEstoque {
    const minAbsoluto = 2 * tamanhoUnidade;
    if (estoque === 0) return 'esgotado';
    if (estoque <= Math.floor(minAbsoluto * 0.5)) return 'critico';
    if (estoque <= minAbsoluto) return 'baixo';
    return 'ok';
}

export function formatarEstoqueVisivel(quantidade: number, unidade: string) {
    if (unidade === 'ml') {
        if (quantidade >= 1000) return `${(quantidade / 1000).toFixed(1)} L`;
        return `${quantidade} ml`;
    }
    if (unidade === 'g') {
        if (quantidade >= 1000) return `${(quantidade / 1000).toFixed(2)} kg`;
        return `${quantidade} g`;
    }
    return `${quantidade} un`;
}

const STATUS_CONFIG: Record<StatusEstoque, { label: string; badge: string; icon: React.ReactNode }> = {
    esgotado: { label: 'Esgotado', badge: 'bg-destructive/10 text-destructive border-destructive/20', icon: <AlertTriangle className="w-3.5 h-3.5" /> },
    critico: { label: 'Crítico', badge: 'bg-orange-100 text-orange-700 border-orange-200', icon: <AlertTriangle className="w-3.5 h-3.5" /> },
    baixo: { label: 'Atenção', badge: 'bg-yellow-100 text-yellow-700 border-yellow-200', icon: <AlertTriangle className="w-3.5 h-3.5" /> },
    ok: { label: 'Normal', badge: 'bg-emerald-100 text-emerald-700 border-emerald-200', icon: <CheckCircle2 className="w-3.5 h-3.5" /> },
};

// ── Componente ───────────────────────────────────────────────────────────────

interface ProdutoRowProps {
    produto: Produto;
    isLoading: boolean;
    onBaixa: (id: string, tamanho: number) => void;
    onEntrada: (produto: Produto) => void;
    onRemover: (id: string, nome: string) => void;
}

export function ProdutoRow({ produto, isLoading, onBaixa, onEntrada, onRemover }: ProdutoRowProps) {
    const [expanded, setExpanded] = useState(false);

    const status = obterStatusEstoque(produto.estoque, produto.tamanhoUnidade);
    const config = STATUS_CONFIG[status];
    const frascosCompletos = Math.floor(produto.estoque / produto.tamanhoUnidade);

    return (
        <div className={cn(
            "border-b border-border/50 bg-card last:border-0 transition-all hover:bg-muted/30",
            isLoading && "opacity-50 pointer-events-none"
        )}>
            {/* ── LINHA PRINCIPAL ── */}
            <div onClick={() => setExpanded(!expanded)} className="flex cursor-pointer items-center p-4 sm:px-6 gap-4">

                <div className={cn(
                    "flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl transition-colors",
                    status === 'ok' ? "bg-primary/10 text-primary" : "bg-destructive/10 text-destructive"
                )}>
                    <Package className="h-5 w-5" />
                </div>

                <div className="flex-1 min-w-0">
                    <p className="truncate text-sm font-semibold text-foreground flex items-center gap-2">
                        {produto.nome}
                        <span className={cn("hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider border", config.badge)}>
                            {config.icon} {config.label}
                        </span>
                    </p>
                    <p className="mt-0.5 truncate text-xs text-muted-foreground">
                        {produto.descricao || 'Sem descrição'} • {produto.tamanhoUnidade} {produto.unidadeMedida}/frasco
                    </p>
                </div>

                <div className="text-right">
                    <p className={cn("font-black text-lg leading-none tracking-tight", status !== 'ok' ? "text-destructive" : "text-foreground")}>
                        {formatarEstoqueVisivel(produto.estoque, produto.unidadeMedida)}
                    </p>
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wider mt-1">
                        {frascosCompletos} {frascosCompletos === 1 ? 'Frasco' : 'Frascos'}
                    </p>
                </div>

                <ChevronDown className={cn("h-5 w-5 text-muted-foreground transition-transform duration-300", expanded && "rotate-180 text-primary")} />
            </div>

            {/* ── ÁREA EXPANDIDA ── */}
            <div className={cn("grid transition-all duration-300 ease-in-out", expanded ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0")}>
                <div className="overflow-hidden border-t border-border/30 bg-muted/10">
                    <div className="overflow-x-auto">

                    <div className="flex flex-wrap items-center gap-2 p-4 sm:px-6 border-b border-border/30 bg-card">
                        <Button
                            size="sm"
                            onClick={() => onEntrada(produto)}
                            className="h-8 bg-blue-600 text-xs hover:bg-blue-700 text-white font-bold"
                        >
                            <Plus className="mr-1.5 h-3.5 w-3.5" /> Dar Entrada
                        </Button>

                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => onBaixa(produto.id, produto.tamanhoUnidade)}
                            disabled={produto.estoque < produto.tamanhoUnidade}
                            className="h-8 border-destructive/20 bg-destructive/5 text-xs text-destructive hover:bg-destructive/10 hover:text-destructive font-bold"
                        >
                            <Minus className="mr-1.5 h-3.5 w-3.5" /> Retirar 1 Frasco
                        </Button>

                        <div className="flex-1" />

                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => onRemover(produto.id, produto.nome)}
                            className="h-8 text-xs text-muted-foreground hover:bg-destructive/10 hover:text-destructive font-semibold"
                        >
                            <Trash2 className="mr-1.5 h-3.5 w-3.5" /> Remover
                        </Button>
                    </div>

                    {/* Área de Custos */}
                    <div className="p-4 sm:px-6 bg-muted/30 grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div>
                            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Custo (Frasco)</p>
                            <p className="text-sm font-semibold text-foreground mt-1">R$ {produto.precoCusto?.toFixed(2) || '0.00'}</p>
                        </div>
                        <div>
                            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Venda (Unidade)</p>
                            <p className="text-sm font-bold text-primary mt-1">R$ {produto.precoVenda.toFixed(2)}</p>
                        </div>
                        <div>
                            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Margem</p>
                            <p className="text-sm font-semibold text-emerald-600 mt-1">
                                {produto.precoCusto ? (((produto.precoVenda - produto.precoCusto) / produto.precoCusto) * 100).toFixed(1) : 100}%
                            </p>
                        </div>
                        <div>
                            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Capital Parado</p>
                            <p className="text-sm font-semibold text-foreground mt-1">R$ {((produto.precoCusto || 0) * frascosCompletos).toFixed(2)}</p>
                        </div>
                    </div>

                    </div>
                </div>
            </div>
        </div>
    );
}