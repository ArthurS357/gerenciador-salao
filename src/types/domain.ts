export type Role = 'ADMIN' | 'PROFISSIONAL' | 'CLIENTE' | 'RECEPCIONISTA'

// ── ENTIDADES BASE ───────────────────────────────────────────────────────────

export interface Funcionario {
    id: string
    nome: string
    email: string
    role: Role
    cpf: string | null
    telefone: string | null
    especialidade: string | null
    descricao: string | null
    fotoUrl: string | null
    comissao: number
    podeAgendar: boolean
    podeVerHistorico: boolean
    podeVerComissao: boolean
    podeCancelar: boolean
    podeGerenciarClientes: boolean
    podeVerFinanceiroGlobal: boolean
    ativo: boolean
}

export interface Cliente {
    id: string
    nome: string
    telefone: string
    anonimizado: boolean
    dataNascimento?: Date | null
    temDividaPendente?: boolean          // flag para indicador visual de inadimplência
    _count?: { agendamentos: number }
    agendamentos?: AgendamentoCliente[]
}

export interface Servico {
    id: string
    nome: string
    descricao: string | null
    preco: number | null
    tempoMinutos: number | null
    imagemUrl: string | null
    ativo: boolean
}

export interface Produto {
    id: string
    nome: string
    descricao: string | null
    precoCusto: number | null
    precoVenda: number
    estoque: number
    unidadeMedida: string
    tamanhoUnidade: number
    estoqueMinimo?: number
    ativo: boolean
    createdAt?: Date
    updatedAt?: Date
}

export interface ItemPortfolio {
    id: string
    titulo: string
    descricao: string | null
    imagensJson: string           // JSON array: '["url1","url2","url3","url4"]'
    valor: number | null
    linkInstagram: string | null
    ativo: boolean
    criadoEm: Date
}

// ── DTOs RESUMIDOS (Para UI e Relacionamentos) ───────────────────────────────

export type FuncionarioResumo = Pick<Funcionario, 'id' | 'nome' | 'comissao' | 'podeVerComissao' | 'podeAgendar' | 'podeVerHistorico' | 'podeCancelar' | 'podeGerenciarClientes' | 'podeVerFinanceiroGlobal'> & {
    totalComissaoRecebida: number
}

export type FuncionarioSimples = Pick<Funcionario, 'nome'>

export type ClienteResumo = Pick<Cliente, 'nome' | 'telefone' | 'anonimizado'>

export type ServicoResumo = Pick<Servico, 'id' | 'nome' | 'preco'>

export type ProdutoResumo = Pick<Produto, 'nome' | 'precoCusto' | 'precoVenda'>

// ── ENTIDADES DE AGENDAMENTO E COMANDAS ──────────────────────────────────────

export interface AgendamentoServico {
    id: string
    servicoId: string
    precoCobrado: number | null
    servico: ServicoResumo
}

export interface AgendamentoItemProduto {
    id: string
    produtoId: string
    quantidade: number
    precoCobrado: number
    produto: ProdutoResumo
}

export interface AgendamentoGlobal {
    id: string
    clienteId: string
    funcionarioId: string
    valorBruto: number
    taxas: number
    dataHoraInicio: Date // Padronizado para Date
    dataHoraFim: Date    // Padronizado para Date
    concluido: boolean
    cliente: ClienteResumo
    funcionario: FuncionarioSimples
    servicos: AgendamentoServico[]
    produtos: AgendamentoItemProduto[]
}

export interface AgendamentoProfissional {
    id: string
    valorBruto: number
    dataHoraInicio: Date // Padronizado para Date
    dataHoraFim: Date    // Padronizado para Date
    concluido: boolean
    cliente: Omit<ClienteResumo, 'anonimizado'> // Usa o Resumo e remove os campos desnecessários
    servicos: AgendamentoServico[]
}

export interface AgendamentoCliente {
    id: string
    valorBruto: number
    dataHoraInicio: Date
    concluido: boolean
    funcionario: FuncionarioSimples
}

// ── RELATÓRIOS E FINANCEIRO ──────────────────────────────────────────────────

export interface AgendamentoHistoricoFinanceiro {
    id: string
    data: Date // Padronizado para Date
    clienteNome: string
    profissionalNome: string
    valorBruto: number
    valorComissao: number
    detalheServicos: string
    detalheProdutos: string
}

export interface ResumoMetodosPagamento {
    totalDinheiro: number
    totalCartao: number
    totalPix: number
}

export interface ConfiguracaoSalao {
    taxaCredito: number
    taxaDebito: number
    taxaPix: number
}

export interface FinanceiroResumo {
    faturamentoBruto: number
    custoProdutos: number
    totalComissoes: number
    lucroLiquido: number
    equipe: FuncionarioResumo[]
    historico: AgendamentoHistoricoFinanceiro[]
    metodosPagamento: ResumoMetodosPagamento
}

export interface FechamentoComanda {
    bruto: number
    deducoes: number
    baseReal: number
    comissao: number
    lucroSalao: number
    valorPago: number           // total efetivamente recebido
    valorPendente: number       // saldo que virou dívida (0 se pagamento integral)
    comissaoLiberada: boolean   // false quando há dívida pendente
}

// ── PAGAMENTOS MÚLTIPLOS ─────────────────────────────────────────────────────

/**
 * Métodos de pagamento suportados pelo motor financeiro.
 * Mapeados para TaxaMetodoPagamento.metodo no banco de dados.
 */
export type MetodoPagamento =
    | 'DINHEIRO'
    | 'PIX'
    | 'CARTAO_DEBITO'
    | 'CARTAO_CREDITO'
    | 'CORTESIA'
    | 'VOUCHER'
    | 'PERMUTA'

/** * Bandeiras suportadas. 
 * A string vazia ('') representa a taxa "Padrão" ou "Genérica" do método.
 */
export type BandeiraCartao = '' | 'VISA' | 'MASTERCARD' | 'ELO' | 'AMEX' | 'HIPERCARD';

/** Configuração de taxa lida do banco (TaxaMetodoPagamento). */
export interface MetodoPagamentoConfig {
    id: string
    metodo: MetodoPagamento
    /** "" = taxa genérica (todas as bandeiras); ex: "VISA" = taxa específica para Visa */
    bandeira: string
    descricao: string | null
    taxaBase: number
    ativo: boolean
}

/**
 * Item de pagamento enviado pelo cliente ao fechar a comanda.
 * `parcelas` é relevante apenas para CARTAO_CREDITO (padrão: 1).
 * `bandeira` é relevante apenas para métodos de cartão (padrão: "").
 */
export interface PagamentoComandaInput {
    metodo: MetodoPagamento;
    bandeira: string;
    valor: number;
    parcelas: number;
}

// ── DÍVIDAS DE CLIENTE ───────────────────────────────────────────────────────

export type StatusDivida = 'PENDENTE' | 'PARCIAL' | 'QUITADA'

export interface DividaCliente {
    id: string
    clienteId: string
    agendamentoId: string | null
    valorOriginal: number
    valorQuitado: number
    status: StatusDivida
    observacao: string | null
    criadoEm: Date
    quitadoEm: Date | null
}

// ── PACOTES DE SERVIÇOS ──────────────────────────────────────────────────────

export interface Pacote {
    id: string
    nome: string
    descricao: string | null
    valorBase: number
    valorFinal: number
    desconto: number        // percentual calculado automaticamente
    ativo: boolean
    criadoEm: Date
    atualizadoEm: Date
}

export interface PacoteServicoItem {
    id: string
    servicoId: string
    quantidade: number
    servico: ServicoResumo
}

export interface PacoteComServicos extends Pacote {
    servicos: PacoteServicoItem[]
    _count?: { vendas: number }
}

// ── UTILITÁRIOS ──────────────────────────────────────────────────────────────

/**
 * Padrão de retorno para Server Actions e API Routes.
 * O generics 'data' previne colisão de tipagem com propriedades nativas do objeto.
 */
export type ActionResult<T = void> =
    | (T extends void ? { sucesso: true } : { sucesso: true; data: T })
    | { sucesso: false; erro: string }
