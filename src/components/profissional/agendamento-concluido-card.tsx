import { formatInTimeZone } from 'date-fns-tz';
import { CheckCircle2 } from 'lucide-react';

interface AgendamentoConcluidoCardProps {
    clienteNome: string;
    dataHoraInicio: Date | string;
    valorBruto: number;
}

export function AgendamentoConcluidoCard({
    clienteNome,
    dataHoraInicio,
    valorBruto
}: AgendamentoConcluidoCardProps) {
    const data = new Date(dataHoraInicio);
    const fuso = 'America/Sao_Paulo';

    return (
        <div className="group flex flex-col sm:flex-row sm:justify-between sm:items-center p-4 rounded-xl hover:bg-muted/50 transition-colors border border-transparent hover:border-border gap-3 sm:gap-0">
            <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0 shadow-sm border border-green-200">
                    <CheckCircle2 className="w-5 h-5 text-green-600" />
                </div>
                <div>
                    <p className="font-bold text-foreground text-sm flex items-center gap-2">
                        {clienteNome}
                        <span className="hidden sm:inline-block text-xs font-normal text-muted-foreground bg-background px-2 py-0.5 rounded border border-border shadow-sm">
                            {formatInTimeZone(data, fuso, 'HH:mm')}
                        </span>
                    </p>
                    <div className="flex items-center gap-2 mt-1">
                        <span className="sm:hidden text-xs font-normal text-muted-foreground bg-background px-1.5 py-0.5 rounded border border-border shadow-sm">
                            {formatInTimeZone(data, fuso, 'HH:mm')}
                        </span>
                        <p className="text-[9px] font-bold uppercase tracking-wider text-green-600">
                            Atendimento Faturado
                        </p>
                    </div>
                </div>
            </div>
            <div className="sm:text-right pl-14 sm:pl-0">
                <p className="font-black text-foreground text-lg">
                    R$ {valorBruto.toFixed(2).replace('.', ',')}
                </p>
            </div>
        </div>
    );
}