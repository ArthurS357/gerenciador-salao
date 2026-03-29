import { z } from 'zod'

// ── SCHEMAS DE AGENDAMENTO ───────────────────────────────────────────────────

export const schemaCriarAgendamento = z.object({
    clienteId: z
        .string()
        .min(1, 'clienteId é obrigatório e não pode ser vazio.'),
    funcionarioId: z
        .string()
        .min(1, 'Selecione um profissional válido.'),
    dataHoraInicio: z
        .coerce.date()
        .refine(
            (d) => d > new Date(Date.now() - 5 * 60_000),
            'Não é possível agendar em horários passados.'
        ),
    servicosIds: z
        .array(z.string().min(1, 'ID de serviço inválido.'))
        .min(1, 'Selecione pelo menos um serviço.')
        .max(10, 'Máximo de 10 serviços por agendamento.'),
})

export const schemaEditarAgendamento = z.object({
    id: z.string().min(1, 'ID do agendamento é necessário.'),
    funcionarioId: z.string().min(1, 'ID do funcionário é necessário.'),
    dataHoraInicio: z.coerce.date()
})

// ── SCHEMAS de COMANDA (Vendas Diretas) ──────────────────────────────────────

export const schemaAdicionarProdutoComanda = z.object({
    agendamentoId: z.string().min(1, 'ID do agendamento é necessário.'),
    produtoId: z.string().min(1, 'ID do produto é necessário.'),
    quantidadeFrascos: z
        .number()
        .int('A quantidade deve ser um número inteiro.')
        .positive('A quantidade deve ser maior que zero.')
})

export const schemaFinalizarComanda = z.object({
    agendamentoId: z.string().min(1, 'ID do agendamento é necessário.'),
    taxaAdquirentePercentual: z.number().min(0).max(20).default(3),
    custoInsumosValidado: z.number().min(0)
})

// ── SCHEMAS de CLIENTE (LGPD & CRUD) ─────────────────────────────────────────

export const schemaCliente = z.object({
    nome: z.string().min(1, 'Nome é obrigatório.').max(100),
    telefone: z.string().min(10, 'Telefone inválido.').max(11, 'Telefone inválido.'),
    email: z.string().email('E-mail inválido.').nullable().optional(),
    cpf: z.string().length(11, 'CPF deve ter 11 dígitos.').nullable().optional()
})

// ── SCHEMAS de AVALIAÇÃO ─────────────────────────────────────────────────────

export const schemaAvaliacao = z.object({
    agendamentoId: z.string().min(1),
    nota: z.number().int().min(1).max(5),
    comentario: z.string().max(500).optional()
})

// ── SCHEMAS de SERVIÇO ───────────────────────────────────────────────────────

export const schemaServico = z.object({
    nome: z.string().min(1, 'Nome do serviço é obrigatório.').max(100),
    descricao: z.string().max(500).optional().nullable(),
    preco: z.coerce.number().min(0).nullable().optional(),
    tempoMinutos: z.coerce.number().int().min(1).nullable().optional(),
    imagemUrl: z.string().url('URL da imagem inválida.').optional().nullable().or(z.literal(''))
})

export const schemaInsumoServico = z.object({
    servicoId: z.string().min(1),
    produtoId: z.string().min(1),
    quantidadeUsada: z.number().positive('A quantidade deve ser maior que zero.')
})

// ── SCHEMAS de PRODUTO ───────────────────────────────────────────────────────

export const schemaProduto = z.object({
    nome: z.string().min(1, 'Nome do produto é obrigatório.').max(100),
    descricao: z.string().max(500).optional().nullable(),
    precoCusto: z.coerce.number().min(0).nullable().optional(),
    precoVenda: z.coerce.number().min(0),
    estoque: z.coerce.number().int().min(0),
    unidadeMedida: z.string().min(1),
    tamanhoUnidade: z.coerce.number().positive()
})

// ── SCHEMAS de PROFISSIONAL (Gestão Interna) ─────────────────────────────────

export const schemaExpediente = z.object({
    diaSemana: z.number().min(0).max(6),
    horaInicio: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/),
    horaFim: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/),
    ativo: z.boolean()
})

export const schemaAlterarSenha = z.object({
    novaSenha: z.string()
        .min(6, 'A senha deve ter pelo menos 6 caracteres.')
        .regex(/[A-Za-z]/, 'A senha deve conter pelo menos uma letra.')
        .regex(/\d/, 'A senha deve conter pelo menos um número.')
})

// ── SCHEMAS de PROFISSIONAL ──────────────────────────────────────────────────

export const schemaAtualizarComissao = z.object({
    id: z.string().min(1),
    comissao: z.number().min(0, 'A comissão não pode ser negativa.').max(100, 'A comissão não pode exceder 100%.'),
    podeVerComissao: z.boolean()
})
