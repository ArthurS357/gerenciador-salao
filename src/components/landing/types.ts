// ─────────────────────────────────────────────────────────────────────────────
// types.ts — Contratos centralizados para todos os componentes da landing
// ─────────────────────────────────────────────────────────────────────────────

export interface Profissional {
    id: string
    nome: string
    fotoUrl: string | null
}

export interface Servico {
    id: string
    nome: string
    descricao: string | null
    preco: number | null
    tempoMinutos: number | null
    imagemUrl?: string | null
}

export interface ItemPortfolio {
    id: string
    titulo: string
    imagemUrl: string
    valor: number | null
    linkSocial: string | null
}

/** Papel do utilizador logado — discrimina o menu exibido na Navbar */
export type SessaoRole = 'CLIENTE' | 'FUNCIONARIO'

export interface Sessao {
    logado: boolean
    id?: string
    /** Definido quando logado: controla qual menu a Navbar exibe */
    role?: SessaoRole
    /** Nome para saudação personalizada no drawer */
    nome?: string
}

/** Tipo discriminado — o campo `tipo` garante narrowing seguro na UI */
export type TipoMensagem = 'erro' | 'sucesso' | 'info' | ''

export interface Mensagem {
    texto: string
    tipo: TipoMensagem
}

// ── Props de componentes ──────────────────────────────────────────────────────

export interface NavbarProps {
    sessao: Sessao
}

export interface ServicosVitrineProps {
    catalogoServicos: Servico[]
    servicosSelecionados: string[]
    toggleServico: (id: string) => void
    totalSelecionado: number
}

export interface PortfolioGaleriaProps {
    itensPortfolio: ItemPortfolio[]
}

export interface FormularioReservaProps {
    sessao: Pick<Sessao, 'logado'>
    mounted: boolean
    profissionais: Profissional[]
    catalogoServicos: Servico[]
    servicosSelecionados: string[]
    totalSelecionado: number
    profissionalId: string
    setProfissionalId: (id: string) => void
    dataHora: string
    setDataHora: (dh: string) => void
    mensagem: Mensagem
    handleAgendar: (e: React.FormEvent) => void
    profissionalSelecionado?: Profissional
}