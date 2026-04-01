import { buscarAuditoriaGlobal } from '@/app/actions/auditoria';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default async function AuditoriaGlobalPage() {
    // Busca os logs globais iniciais (trazendo os últimos registros)
    const resposta = await buscarAuditoriaGlobal({});

    return (
        <div className="p-6 space-y-6">
            <div>
                <h1 className="text-3xl font-bold tracking-tight">Trilha de Auditoria</h1>
                <p className="text-muted-foreground">
                    Monitoramento global de todas as ações sensíveis do salão.
                </p>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Últimos Eventos do Sistema</CardTitle>
                </CardHeader>
                <CardContent>
                    {!resposta.sucesso || !resposta.logs || resposta.logs.length === 0 ? (
                        <p className="text-gray-500 text-center py-4">
                            Nenhum registro de auditoria encontrado.
                        </p>
                    ) : (
                        <div className="space-y-4">
                            {/* Mapeamento simples para o administrador bater o olho e ver o que aconteceu */}
                            {resposta.logs.map((log) => (
                                <div key={log.id} className="flex flex-col gap-1 border-b pb-4 last:border-0 last:pb-0">
                                    <div className="flex justify-between items-center">
                                        <span className="font-semibold text-gray-900">{log.acao.replace(/_/g, ' ')}</span>
                                        <span className="text-xs text-gray-500">
                                            {new Date(log.timestamp).toLocaleString('pt-BR')}
                                        </span>
                                    </div>
                                    <p className="text-sm text-gray-600">
                                        <span className="font-medium">Entidade:</span> {log.entidade} | <span className="font-medium">ID:</span> {log.entidadeId}
                                    </p>
                                    <p className="text-sm text-gray-600">
                                        <span className="font-medium">Responsável:</span> {log.usuarioId}
                                    </p>
                                </div>
                            ))}
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}