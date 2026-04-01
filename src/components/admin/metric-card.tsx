// src/components/admin/metric-card.tsx
import React from "react";
import { cn } from "@/lib/utils";
import { Card } from "@/components/ui/card"; // Assumindo Shadcn Card base

interface MetricCardProps {
    label: string | React.ReactNode;
    value: string | number;
    subText?: string;
    trend?: number; // ex: 8.5 ou -3.2
    loading?: boolean;
    variant?: "default" | "danger";
}

export function MetricCard({ label, value, subText, trend, loading, variant = "default" }: MetricCardProps) {
    return (
        <Card className={cn(
            "p-5 border-t-4 transition-all duration-300",
            variant === "default" ? "border-t-caramelo" : "border-t-red-500",
            loading && "animate-pulse"
        )}>
            <p className="text-[10px] font-bold uppercase tracking-widest text-texto-suave">
                {label}
            </p>

            <div className="mt-3 flex items-baseline gap-1">
                <span className="font-serif text-sm text-texto-suave">R$</span>
                <span className="font-serif text-3xl font-light tracking-tight text-marrom-profundo">
                    {loading ? "---" : value}
                </span>
            </div>

            <div className="mt-3 flex items-center gap-2">
                {trend !== undefined && !loading && (
                    <span className={cn(
                        "rounded-full px-2 py-0.5 text-[10px] font-bold",
                        trend > 0 ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
                    )}>
                        {trend > 0 ? "▲" : "▼"} {Math.abs(trend)}%
                    </span>
                )}
                <span className="text-[11px] text-texto-suave">{subText}</span>
            </div>
        </Card>
    );
}