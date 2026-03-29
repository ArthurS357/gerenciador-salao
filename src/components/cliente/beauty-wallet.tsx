// src/components/cliente/beauty-wallet.tsx
import { cn } from "@/lib/utils";
import { Sparkles } from "lucide-react";

interface BeautyWalletProps {
    nome: string;
    totalInvestido: string;
    visitas: number;
    tags: string[];
    className?: string; // Permitindo que quem consome injete classes (ex: margens)
}

export function BeautyWalletCard({ nome, totalInvestido, visitas, tags, className }: BeautyWalletProps) {
    // Lógica de Gamificação Sênior: Próximo nível/mimo a cada 10 visitas
    const visitasRestantes = 10 - (visitas % 10);
    // Se o cliente tem 10, 20, 30 visitas, a barra enche 100% momentaneamente antes de resetar no próximo agendamento
    const progresso = visitas > 0 && visitas % 10 === 0 ? 100 : (visitas % 10) * 10;

    return (
        <div className={cn(
            "group relative w-full max-w-sm overflow-hidden rounded-[24px] bg-gradient-to-br from-marrom-profundo to-marrom-medio p-6 text-white shadow-2xl transition-transform hover:scale-[1.02]",
            className // Aplica a prop de classe usando a função cn importada
        )}>
            {/* Elementos Decorativos de Luxo */}
            <div className="absolute -right-10 -top-10 h-40 w-40 rounded-full bg-caramelo/10 blur-3xl transition-opacity group-hover:opacity-100" />
            <div className="absolute -left-10 -bottom-10 h-32 w-32 rounded-full bg-caramelo/5 blur-2xl" />

            <div className="relative z-10">
                {/* Header do Card */}
                <div className="flex items-start justify-between">
                    <div>
                        <p className="text-[9px] font-bold uppercase tracking-[0.3em] text-caramelo/60">
                            LmLu Studio Member
                        </p>
                        <h2 className="mt-1 font-serif text-2xl font-light text-white/90">
                            {nome}
                        </h2>
                    </div>
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-caramelo/20 bg-caramelo/10 text-caramelo shadow-inner">
                        <Sparkles className="h-5 w-5" />
                    </div>
                </div>

                {/* KPIs Principais */}
                <div className="mt-8 flex gap-8">
                    <div>
                        <p className="text-[9px] font-bold uppercase tracking-widest text-caramelo/50">
                            Total Investido
                        </p>
                        <p className="mt-1 font-serif text-2xl text-caramelo">
                            <span className="text-sm mr-1 italic text-caramelo/70">R$</span>
                            {totalInvestido}
                        </p>
                    </div>
                    <div>
                        <p className="text-[9px] font-bold uppercase tracking-widest text-caramelo/50">
                            Visitas
                        </p>
                        <p className="mt-1 font-serif text-2xl text-caramelo">
                            {visitas}
                        </p>
                    </div>
                </div>

                {/* Tags (Serviços preferidos) */}
                {tags && tags.length > 0 && (
                    <div className="mt-6 flex flex-wrap gap-1.5">
                        {tags.map((tag) => (
                            <span
                                key={tag}
                                className="rounded-full border border-caramelo/10 bg-caramelo/5 px-2.5 py-1 text-[9px] font-bold uppercase tracking-wider text-caramelo/80"
                            >
                                {tag}
                            </span>
                        ))}
                    </div>
                )}

                {/* Loyalty Progress Bar (Gamificação) */}
                <div className="mt-6 border-t border-white/10 pt-5">
                    <div className="flex justify-between items-end mb-2">
                        <p className="text-[9px] font-bold uppercase tracking-widest text-caramelo/60">
                            Próxima Recompensa
                        </p>
                        <p className="text-[10px] text-white/50 italic">
                            faltam {visitasRestantes} {visitasRestantes === 1 ? 'visita' : 'visitas'}
                        </p>
                    </div>
                    {/* Fundo da barra com inner shadow para dar profundidade (glassmorphism leve) */}
                    <div className="h-1.5 w-full bg-black/20 rounded-full overflow-hidden border border-white/5 shadow-inner">
                        <div
                            className="h-full bg-gradient-to-r from-caramelo/50 to-caramelo transition-all duration-1000 ease-out relative"
                            style={{ width: `${progresso}%` }}
                        >
                            {/* Brilho animado na barra preenchida */}
                            <div className="absolute inset-0 bg-white/20 animate-pulse" />
                        </div>
                    </div>
                </div>

            </div>
        </div>
    );
}