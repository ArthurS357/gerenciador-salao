import { buscarAuditoriaGlobal } from '@/app/actions/auditoria';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import AdminHeader from '@/components/admin/AdminHeader';

export default async function AuditoriaGlobalPage() {
    const resposta = await buscarAuditoriaGlobal({});

    return (
        <div className="min-h-screen bg-background font-sans">
            <AdminHeader
                titulo="Trilha de Auditoria"
                subtitulo="Monitoramento global de todas as ações sensíveis do salão."
                abaAtiva="Auditoria"
            />

            <div className="max-w-7xl mx-auto px-4 md:px-8 pb-12 mt-6">
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
        </div>
    );
}
