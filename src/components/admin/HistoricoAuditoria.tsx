import { buscarHistoricoComanda } from '@/app/actions/auditoria';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Clock, ShieldAlert, CheckCircle2 } from 'lucide-react';
import { AuditLog } from '@prisma/client'; // Traz a tipagem exata do seu banco de dados

interface HistoricoAuditoriaProps {
    comandaId: string;
}

export default async function HistoricoAuditoria({ comandaId }: HistoricoAuditoriaProps) {
    // Busca os dados diretamente no Server Component
    const resposta = await buscarHistoricoComanda(comandaId);

    if (!resposta.sucesso || !resposta.logs) {
        return (
            <Card>
                <CardContent className="p-6 text-center text-gray-500">
                    Não foi possível carregar o histórico de auditoria.
                </CardContent>
            </Card>
        );
    }

    const { logs } = resposta;

    // Função auxiliar para escolher o ícone baseado na ação
    const renderizarIcone = (acao: string) => {
        switch (acao) {
            case 'FECHAMENTO_COMANDA':
                return <CheckCircle2 className="w-5 h-5 text-green-500" />;
            case 'ALTERACAO_PRECO':
                return <ShieldAlert className="w-5 h-5 text-amber-500" />;
            default:
                return <Clock className="w-5 h-5 text-blue-500" />;
        }
    };

    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                    <Clock className="w-5 h-5" />
                    Trilha de Auditoria
                </CardTitle>
            </CardHeader>
            <CardContent>
                {logs.length === 0 ? (
                    <p className="text-sm text-gray-500 text-center py-4">
                        Nenhuma ação registrada para esta comanda ainda.
                    </p>
                ) : (
                    <div className="space-y-4">
                        {/* Tipagem de 'log' resolvida aqui */}
                        {logs.map((log: AuditLog) => (
                            <div key={log.id} className="flex gap-4 items-start border-b pb-4 last:border-0 last:pb-0">
                                <div className="mt-1 bg-gray-50 p-2 rounded-full">
                                    {renderizarIcone(log.acao)}
                                </div>
                                <div className="flex-1">
                                    <p className="font-medium text-sm text-gray-900">
                                        {log.acao.replace(/_/g, ' ')}
                                    </p>
                                    <p className="text-xs text-gray-500 mt-1">
                                        Realizado por: <span className="font-semibold">{log.usuarioId}</span>
                                    </p>
                                    {log.detalhes && (
                                        <p className="text-xs text-gray-600 mt-2 bg-gray-50 p-2 rounded border">
                                            {log.detalhes}
                                        </p>
                                    )}
                                </div>
                                <div className="text-xs text-gray-400">
                                    {new Date(log.timestamp).toLocaleString('pt-BR', {
                                        day: '2-digit',
                                        month: '2-digit',
                                        hour: '2-digit',
                                        minute: '2-digit'
                                    })}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </CardContent>
        </Card>
    );
}