// src/components/profissional/prox-atendimento-card.tsx
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Phone } from "lucide-react";

interface AtendimentoProps {
    cliente: string;
    telefone: string;
    servicos: string[];
    minutosParaInicio: number;
}

export function ProxAtendimentoCard({ cliente, telefone, servicos, minutosParaInicio }: AtendimentoProps) {
    const isUrgente = minutosParaInicio <= 15;

    return (
        <div className={cn(
            "relative overflow-hidden rounded-2xl p-5 transition-all duration-500",
            isUrgente
                ? "bg-marrom-profundo text-white shadow-2xl shadow-marrom-profundo/20"
                : "bg-white border border-bege-borda text-marrom-profundo"
        )}>
            {/* Indicador de urgência animado */}
            {isUrgente && (
                <div className="absolute top-0 left-0 h-1 w-full bg-gradient-to-r from-caramelo via-white to-caramelo animate-shimmer" />
            )}

            <div className="flex items-center justify-between mb-4">
                <span className={cn(
                    "text-[10px] font-bold uppercase tracking-[0.2em]",
                    isUrgente ? "text-caramelo/70" : "text-texto-suave"
                )}>
                    {isUrgente ? "⚡ Próximo Agora" : "Próximo Atendimento"}
                </span>
                <div className="flex items-center gap-2">
                    <div className={cn(
                        "h-1.5 w-1.5 rounded-full animate-pulse",
                        isUrgente ? "bg-caramelo" : "bg-green-500"
                    )} />
                    <span className={cn("text-xs font-semibold", isUrgente ? "text-caramelo" : "text-green-700")}>
                        em {minutosParaInicio} min
                    </span>
                </div>
            </div>

            <div className="flex gap-4 items-start">
                <div className={cn(
                    "flex h-14 w-14 flex-col items-center justify-center rounded-xl",
                    isUrgente ? "bg-caramelo/10 text-caramelo" : "bg-creme-escuro text-marrom-medio"
                )}>
                    <span className="font-serif text-xl leading-none">14</span>
                    <span className="text-[9px] font-bold uppercase">Jan</span>
                </div>

                <div className="flex-1">
                    <h3 className="font-semibold text-lg leading-tight">{cliente}</h3>
                    <p className={cn("text-xs font-mono mt-1", isUrgente ? "text-white/50" : "text-texto-suave")}>
                        {telefone}
                    </p>
                </div>
            </div>

            <div className="mt-4 flex gap-2">
                <Button
                    variant="outline"
                    size="icon"
                    className={cn(
                        "h-11 w-11 rounded-xl",
                        isUrgente && "bg-white/5 border-white/10 hover:bg-white/10 text-white"
                    )}
                    onClick={() => window.open(`https://wa.me/${telefone.replace(/\D/g, "")}`)}
                >
                    <Phone className="h-4 w-4" />
                </Button>

                <Button
                    className={cn(
                        "h-11 flex-1 rounded-xl font-bold uppercase tracking-widest text-[11px]",
                        isUrgente ? "bg-caramelo text-marrom-profundo hover:bg-caramelo/90" : "bg-marrom-medio text-white"
                    )}
                >
                    Abrir Comanda
                </Button>
            </div>
        </div>
    );
}