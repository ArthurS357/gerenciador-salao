import { Skeleton } from "@/components/ui/skeleton"

export default function DashboardLoading() {
    return (
        <div className="flex flex-col gap-6 p-8">
            {/* Header / Título da Página */}
            <div className="flex items-center justify-between">
                <div>
                    <Skeleton className="h-8 w-64 mb-2" />
                    <Skeleton className="h-4 w-48" />
                </div>
                {/* Botão de Ação (ex: Novo Agendamento) */}
                <Skeleton className="h-10 w-32" />
            </div>

            {/* Cards de Métricas (Ex: Faturamento, Clientes, etc) */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {Array.from({ length: 4 }).map((_, i) => (
                    <div key={i} className="p-6 rounded-xl border bg-card shadow-sm">
                        <Skeleton className="h-4 w-24 mb-4" /> {/* Título do Card */}
                        <Skeleton className="h-8 w-32 mb-1" /> {/* Valor */}
                        <Skeleton className="h-3 w-16" />      {/* Subtítulo/Variação */}
                    </div>
                ))}
            </div>

            {/* Tabela ou Lista Principal (Ex: Próximos Atendimentos) */}
            <div className="rounded-xl border bg-card shadow-sm p-6 mt-4">
                <Skeleton className="h-6 w-48 mb-6" /> {/* Título da Seção */}

                <div className="space-y-4">
                    {/* Linhas da Tabela */}
                    {Array.from({ length: 5 }).map((_, i) => (
                        <div key={i} className="flex items-center justify-between border-b pb-4 last:border-0 last:pb-0">
                            <div className="flex items-center gap-4">
                                <Skeleton className="h-10 w-10 rounded-full" /> {/* Avatar */}
                                <div className="space-y-2">
                                    <Skeleton className="h-4 w-32" /> {/* Nome */}
                                    <Skeleton className="h-3 w-24" /> {/* Serviço */}
                                </div>
                            </div>
                            <Skeleton className="h-4 w-16" /> {/* Horário/Valor */}
                        </div>
                    ))}
                </div>
            </div>
        </div>
    )
}