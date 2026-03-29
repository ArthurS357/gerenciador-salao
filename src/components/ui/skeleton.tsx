// src/components/ui/skeleton.tsx
import { cn } from "@/lib/utils"

function Skeleton({
    className,
    ...props
}: React.HTMLAttributes<HTMLDivElement>) {
    return (
        <div
            className={cn(
                "animate-pulse rounded-md bg-marrom-medio/10", // Cor sutil de 'bege' para o luxo
                className
            )}
            {...props}
        />
    )
}

export { Skeleton }