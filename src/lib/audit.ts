import { prisma } from "@/lib/prisma";
import { verificarSessaoFuncionario } from "@/app/actions/auth";

/**
 * Registra uma ação sensível no banco de dados para fins de auditoria.
 * Como este arquivo NÃO possui "use server", esta função não é exposta à internet,
 * sendo segura para ser exportada e chamada por outras Server Actions.
 */
export async function registrarAcaoAuditoria(
    acao: string,
    entidade: string,
    entidadeId: string,
    detalhes?: string
) {
    try {
        const sessao = await verificarSessaoFuncionario();

        if (!sessao.logado) {
            console.warn("Tentativa de auditoria sem usuário logado.");
            return { sucesso: false, erro: "Não autorizado" };
        }

        await prisma.auditLog.create({
            data: {
                usuarioId: sessao.id,
                acao,
                entidade,
                entidadeId,
                detalhes: detalhes || null,
            },
        });

        return { sucesso: true };
    } catch (error) {
        console.error("Erro ao registrar log de auditoria:", error);
        return { sucesso: false, erro: "Falha interna no log" };
    }
}