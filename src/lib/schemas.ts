import { z } from 'zod'
import { validarTelefoneBrasileiro } from './telefone'

// ── UTILITÁRIO INTERNO ────────────────────────────────────────────────────────

/** Valida CPF usando o algoritmo dos dígitos verificadores (Receita Federal). */
function validarCPF(cpf: string): boolean {
    if (/^(\d)\1{10}$/.test(cpf)) return false

    // Otimização: Substituído parseInt por Number para evitar overhead de parsing complexo
    const calcDigito = (base: string, fator: number): number => {
        let soma = 0
        for (let i = 0; i < fator - 1; i++) soma += Number(base[i]) * (fator - i)
        const resto = (soma * 10) % 11
        return resto === 10 || resto === 11 ? 0 : resto
    }

    return (
        calcDigito(cpf, 10) === Number(cpf[9]) &&
        calcDigito(cpf, 11) === Number(cpf[10])
    )
}

// Reutilização de regras temporais para manter o conceito DRY e segurança de tipos
const dataHoraInicioSchema = z
    .coerce.date()
    .refine((d) => !isNaN(d.getTime()), 'Data e hora inválidas.') // Defesa contra 'Invalid Date'
    .refine(
        (d) => d > new Date(Date.now() - 5 * 60_000),
        'Não é possível agendar em horários passados.'
    )

// ── SCHEMAS DE AGENDAMENTO ───────────────────────────────────────────────────

export const schemaCriarAgendamento = z.object({
    clienteId: z.string().min(1, 'Cliente é obrigatório.'),
    funcionarioId: z.string().min(1, 'Selecione um profissional válido.'),
    dataHoraInicio: dataHoraInicioSchema,
    servicosIds: z
        .array(z.string().min(1, 'ID de serviço inválido.'))
        .min(1, 'Selecione pelo menos um serviço.')
        .max(10, 'Máximo de 10 serviços por agendamento.')
        .refine(
            (ids) => new Set(ids).size === ids.length,
            'Não é permitido adicionar o mesmo serviço mais de uma vez.'
        ),
})

export const schemaEditarAgendamento = z.object({
    id: z.string().min(1, 'ID do agendamento é necessário.'),
    funcionarioId: z.string().min(1, 'ID do funcionário é necessário.'),
    dataHoraInicio: dataHoraInicioSchema,
    servicosIds: z
        .array(z.string().min(1, 'ID de serviço inválido.'))
        .min(1, 'Selecione pelo menos um serviço.')
        .max(10, 'Máximo de 10 serviços por agendamento.')
        .refine(
            (ids) => new Set(ids).size === ids.length,
            'Não é permitido adicionar o mesmo serviço mais de uma vez.'
        )
        .optional(),
})

// ── SCHEMAS de COMANDA (Vendas Diretas) ──────────────────────────────────────

export const schemaAdicionarProdutoComanda = z.object({
    agendamentoId: z.string().min(1, 'ID do agendamento é necessário.'),
    produtoId: z.string().min(1, 'ID do produto é necessário.'),
    quantidade: z
        .coerce
        .number()
        .int('A quantidade deve ser um número inteiro.')
        .positive('A quantidade deve ser maior que zero.')
        .max(9999, 'Quantidade excede o limite permitido.'),
})

export const schemaFinalizarComanda = z.object({
    agendamentoId: z.string().min(1, 'ID do agendamento é necessário.'),
    custoInsumosValidado: z.coerce
        .number()
        .min(0, 'O custo de insumos não pode ser negativo.'),
    valorDinheiro: z.coerce.number().min(0, 'Valor em dinheiro inválido.').default(0),
    valorCartao: z.coerce.number().min(0, 'Valor em cartão inválido.').default(0),
    valorPix: z.coerce.number().min(0, 'Valor em PIX inválido.').default(0),
    tipoCartao: z.enum(['CREDITO', 'DEBITO']).optional(),
})
.refine(
    d => (d.valorDinheiro + d.valorCartao + d.valorPix) > 0,
    { message: 'Informe ao menos uma forma de pagamento.' }
)
.refine(
    d => !(d.valorCartao > 0 && !d.tipoCartao),
    { message: 'Selecione o tipo de cartão (Crédito ou Débito).', path: ['tipoCartao'] }
)

// ── SCHEMAS de CLIENTE (LGPD & CRUD) ─────────────────────────────────────────

export const schemaCliente = z.object({
    nome: z
        .string()
        .trim()
        .min(1, 'Nome é obrigatório.')
        .max(100, 'Nome não pode exceder 100 caracteres.'),
    telefone: z
        .string()
        .trim()
        // Pré-validação barata: só dígitos e tamanho 10..11
        .refine((t) => /^\d{10,11}$/.test(t.replace(/\D/g, '')), {
            message: 'Telefone inválido. Informe DDD + número (10 ou 11 dígitos).',
        })
        // Validação completa com libphonenumber-js + regras adicionais
        .refine((t) => validarTelefoneBrasileiro(t), {
            message: 'Telefone inválido.',
        }),
    email: z
        .string()
        .trim()
        .email('E-mail inválido.')
        .nullable()
        .optional(),
    cpf: z
        .string()
        .length(11, 'CPF deve ter 11 dígitos.')
        .regex(/^\d{11}$/, 'CPF deve conter apenas números.')
        .refine(validarCPF, 'CPF inválido.')
        .nullable()
        .optional(),
})

// ── SCHEMAS de AVALIAÇÃO ─────────────────────────────────────────────────────

export const schemaAvaliacao = z.object({
    agendamentoId: z.string().min(1, 'ID do agendamento é necessário.'),
    nota: z
        .number()
        .int('A nota deve ser um número inteiro.')
        .min(1, 'A nota mínima é 1.')
        .max(5, 'A nota máxima é 5.'),
    comentario: z
        .string()
        .trim()
        .max(500, 'O comentário não pode exceder 500 caracteres.')
        .optional(),
})

// ── SCHEMAS de SERVIÇO ───────────────────────────────────────────────────────

export const schemaServico = z.object({
    nome: z
        .string()
        .trim()
        .min(1, 'Nome do serviço é obrigatório.')
        .max(100, 'Nome não pode exceder 100 caracteres.'),
    descricao: z
        .string()
        .trim()
        .max(500, 'Descrição não pode exceder 500 caracteres.')
        .optional()
        .nullable(),
    preco: z.coerce
        .number()
        .min(0, 'O preço não pode ser negativo.')
        .nullable()
        .optional(),
    tempoMinutos: z.coerce
        .number()
        .int('O tempo deve ser em minutos inteiros.')
        .min(1, 'O tempo mínimo é 1 minuto.')
        .nullable()
        .optional(),
    imagemUrl: z.preprocess(
        (v) => (v === '' ? null : v),
        z.string().url('URL da imagem inválida.').nullable().optional()
    ),
})

export const schemaInsumoServico = z.object({
    servicoId: z.string().min(1, 'ID do serviço é necessário.'),
    produtoId: z.string().min(1, 'ID do produto é necessário.'),
    quantidadeUsada: z.coerce
        .number()
        .positive('A quantidade deve ser maior que zero.'),
})

// ── SCHEMAS de PRODUTO ───────────────────────────────────────────────────────

export const UNIDADES_MEDIDA = ['ml', 'L', 'g', 'kg', 'unidade'] as const
export type UnidadeMedida = (typeof UNIDADES_MEDIDA)[number]

export const schemaProduto = z
    .object({
        nome: z
            .string()
            .trim()
            .min(1, 'Nome do produto é obrigatório.')
            .max(100, 'Nome não pode exceder 100 caracteres.'),
        descricao: z
            .string()
            .trim()
            .max(500, 'Descrição não pode exceder 500 caracteres.')
            .optional()
            .nullable(),
        precoCusto: z.coerce
            .number()
            .min(0, 'O preço de custo não pode ser negativo.')
            .nullable()
            .optional(),
        precoVenda: z.coerce
            .number()
            .min(0, 'O preço de venda não pode ser negativo.'),
        estoque: z.coerce
            .number()
            .int('O estoque deve ser um número inteiro.')
            .min(0, 'O estoque não pode ser negativo.'),
        unidadeMedida: z.enum(UNIDADES_MEDIDA, {
            message: `Unidade de medida inválida. Use: ${UNIDADES_MEDIDA.join(', ')}.`,
        }),
        tamanhoUnidade: z.coerce
            .number()
            .positive('O tamanho da unidade deve ser maior que zero.'),
    })
    .refine(
        ({ precoCusto, precoVenda }) => precoCusto == null || precoCusto <= precoVenda,
        {
            message: 'O preço de custo não pode ser maior que o preço de venda.',
            path: ['precoCusto'],
        }
    )

// ── SCHEMAS de PROFISSIONAL (Gestão Interna) ─────────────────────────────────

export const schemaExpediente = z
    .object({
        diaSemana: z
            .number()
            .int('Dia da semana inválido.')
            .min(0, 'Dia da semana inválido.')
            .max(6, 'Dia da semana inválido.'),
        horaInicio: z
            .string()
            .regex(/^([01]\d|2[0-3]):([0-5]\d)$/, 'Hora de início inválida. Use o formato HH:MM.'),
        horaFim: z
            .string()
            .regex(/^([01]\d|2[0-3]):([0-5]\d)$/, 'Hora de fim inválida. Use o formato HH:MM.'),
        ativo: z.boolean(),
    })
    .refine(({ horaInicio, horaFim }) => horaFim > horaInicio, {
        message: 'A hora de fim deve ser posterior à hora de início.',
        path: ['horaFim'],
    })

export const schemaAlterarSenha = z
    .object({
        senhaAtual: z.string().min(1, 'Informe a senha atual.'),
        novaSenha: z
            .string()
            .min(8, 'A senha deve ter pelo menos 8 caracteres.')
            .regex(/[A-Za-z]/, 'A senha deve conter pelo menos uma letra.')
            .regex(/\d/, 'A senha deve conter pelo menos um número.'),
        confirmarSenha: z.string().min(1, 'Confirme a nova senha.'),
    })
    .refine(({ novaSenha, confirmarSenha }) => novaSenha === confirmarSenha, {
        message: 'As senhas não coincidem.',
        path: ['confirmarSenha'],
    })

// ── SCHEMAS de PROFISSIONAL ──────────────────────────────────────────────────

export const schemaAtualizarComissao = z.object({
    id: z.string().min(1, 'ID do profissional é necessário.'),
    comissao: z.coerce
        .number()
        .min(0, 'A comissão não pode ser negativa.')
        .max(100, 'A comissão não pode exceder 100%.'),
    podeVerComissao: z.boolean(),
})

// ── TIPOS INFERIDOS ──────────────────────────────────────────────────────────

export type CriarAgendamentoInput = z.infer<typeof schemaCriarAgendamento>
export type EditarAgendamentoInput = z.infer<typeof schemaEditarAgendamento>
export type AdicionarProdutoComandaInput = z.infer<typeof schemaAdicionarProdutoComanda>
export type FinalizarComandaInput = z.infer<typeof schemaFinalizarComanda>
export type ClienteInput = z.infer<typeof schemaCliente>
export type AvaliacaoInput = z.infer<typeof schemaAvaliacao>
export type ServicoInput = z.infer<typeof schemaServico>
export type InsumoServicoInput = z.infer<typeof schemaInsumoServico>
export type ProdutoInput = z.infer<typeof schemaProduto>
export type ExpedienteInput = z.infer<typeof schemaExpediente>
export type AlterarSenhaInput = z.infer<typeof schemaAlterarSenha>
export type AtualizarComissaoInput = z.infer<typeof schemaAtualizarComissao>