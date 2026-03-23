export type Role = 'ADMIN' | 'PROFISSIONAL' | 'CLIENTE'

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
    ativo: boolean
}

export type FuncionarioResumo = Pick<Funcionario, 'id' | 'nome' | 'comissao' | 'podeVerComissao'>

export interface Cliente {
    id: string
    nome: string
    telefone: string
    anonimizado: boolean
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
    precoCusto: number | null // Agora pode ser nulo segundo o Prisma
    precoVenda: number
    estoque: number

    // Novos campos adicionados na modelagem de ficha técnica
    unidadeMedida: string
    tamanhoUnidade: number

    // Opcional, pois pode não existir no banco de dados antigo
    estoqueMinimo?: number

    ativo: boolean
    createdAt?: Date
    updatedAt?: Date
}

export interface AgendamentoServico {
    id: string
    servicoId: string
    precoCobrado: number | null
    servico: Pick<Servico, 'id' | 'nome' | 'preco'>
}

export interface AgendamentoItemProduto {
    id: string
    produtoId: string
    quantidade: number
    precoCobrado: number
    produto: Pick<Produto, 'precoCusto' | 'nome' | 'precoVenda'>
}

export interface AgendamentoGlobal {
    id: string
    clienteId: string
    funcionarioId: string
    valorBruto: number
    taxas: number
    dataHoraInicio: string
    dataHoraFim: string
    concluido: boolean
    cliente: Pick<Cliente, 'nome' | 'anonimizado' | 'telefone'>
    funcionario: Pick<Funcionario, 'nome'>
    servicos: AgendamentoServico[]
    produtos: AgendamentoItemProduto[]
}

export interface AgendamentoProfissional {
    id: string
    valorBruto: number
    dataHoraInicio: string
    dataHoraFim: string
    concluido: boolean
    cliente: Pick<Cliente, 'nome' | 'telefone'>
    servicos: AgendamentoServico[]
}

export interface AgendamentoCliente {
    id: string
    valorBruto: number
    dataHoraInicio: Date
    concluido: boolean
    funcionario: Pick<Funcionario, 'nome'>
}

export interface ItemPortfolioDb {
    id: string
    titulo: string
    imagemUrl: string
    valor: number | null
    linkSocial: string | null
    ativo: boolean
    criadoEm: string
}

export type ActionResult<T = void> =
    | ({ sucesso: true } & (T extends void ? object : T))
    | { sucesso: false; erro: string }

export interface FinanceiroResumo {
    faturamentoBruto: number
    custoProdutos: number
    totalComissoes: number
    lucroLiquido: number
    equipe: FuncionarioResumo[]
}

export interface FechamentoComanda {
    bruto: number
    deducoes: number
    baseReal: number
    comissao: number
    lucroSalao: number
}