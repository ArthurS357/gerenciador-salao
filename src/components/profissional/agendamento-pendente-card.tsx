import Link from 'next/link';
import { formatInTimeZone } from 'date-fns-tz';
import { ptBR } from 'date-fns/locale';
import { Phone, Clock, ArrowRight } from 'lucide-react';
import BotaoCancelarAgendamento from '@/components/BotaoCancelarAgendamento';

interface AgendamentoPendenteCardProps {
    id: string;
    clienteNome: string;
    clienteTelefone: string;
    servicos: string[];
    dataHoraInicio: Date | string;
    permissaoCancelar: boolean;
}

export function AgendamentoPendenteCard({
    id,
    clienteNome,
    clienteTelefone,
    servicos,
    dataHoraInicio,
    permissaoCancelar
}: AgendamentoPendenteCardProps) {
    const data = new Date(dataHoraInicio);
    const fuso = 'America/Sao_Paulo';

    return (
        <div className="group bg-card border border-border rounded-2xl shadow-sm hover:shadow-md hover:border-primary/30 transition-all duration-300 overflow-hidden flex flex-col">
            <div className="p-5 md:p-6 flex flex-col md:flex-row gap-5 md:gap-6 items-start md:items-center">

                {/* Badge de Horário Elegante */}
                <div className="flex flex-row md:flex-col items-center justify-center gap-2 md:gap-0 min-w-[90px] p-3 md:py-4 md:px-0 bg-muted/40 rounded-xl border border-border/50 group-hover:bg-primary/5 group-hover:border-primary/20 transition-colors">
                    <Clock className="w-4 h-4 text-primary md:hidden" />
                    <span className="text-2xl font-black text-foreground leading-none">
                        {formatInTimeZone(data, fuso, 'HH:mm')}
                    </span>
                    <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mt-1">
                        {formatInTimeZone(data, fuso, "dd MMM", { locale: ptBR })}
                    </span>
                </div>

                {/* Informações do Cliente */}
                <div className="flex-1 w-full">
                    <div className="flex justify-between items-start mb-1">
                        <h3 className="text-lg font-bold text-foreground group-hover:text-primary transition-colors">
                            {clienteNome}
                        </h3>
                        {/* Status Mobile */}
                        <span className="md:hidden px-2.5 py-1 text-[9px] font-bold uppercase tracking-wider bg-amber-100 text-amber-800 rounded-full">
                            Aguardando
                        </span>
                    </div>

                    <div className="flex items-center gap-2 text-sm text-muted-foreground mb-4">
                        <Phone className="w-3.5 h-3.5" />
                        <span>{clienteTelefone}</span>
                    </div>

                    <div className="flex flex-wrap gap-2">
                        {servicos.map((servico, index) => (
                            <span key={index} className="text-[10px] font-semibold uppercase tracking-wider bg-secondary/20 text-secondary-foreground px-2.5 py-1 rounded-md border border-border/50">
                                {servico}
                            </span>
                        ))}
                    </div>
                </div>

                {/* Status Desktop */}
                <div className="hidden md:flex flex-col items-end gap-2">
                    <span className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider bg-amber-50 text-amber-700 border border-amber-200/50 rounded-full flex items-center gap-1.5 shadow-sm">
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse"></span>
                        Aguardando
                    </span>
                </div>
            </div>

            {/* Rodapé de Ações */}
            <div className="bg-muted/30 border-t border-border px-5 py-4 flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="w-full sm:w-auto">
                    {permissaoCancelar && <BotaoCancelarAgendamento id={id} />}
                </div>

                <Link
                    href={`/profissional/comanda/${id}`}
                    className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-2.5 bg-primary text-primary-foreground font-bold rounded-xl hover:bg-primary/90 transition-all shadow-sm active:scale-[0.98] text-sm"
                >
                    Abrir Comanda
                    <ArrowRight className="w-4 h-4" />
                </Link>
            </div>
        </div>
    );
}