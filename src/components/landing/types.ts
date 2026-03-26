// src/components/landing/types.ts
// ─────────────────────────────────────────────────────────────────────────────
// Contratos centralizados para todos os componentes da landing.
// CORRIGIDO:
//   1. SessaoRole expandida para incluir 'PROFISSIONAL' | 'ADMIN' (antes só tinha 'FUNCIONARIO')
//   2. FormularioReservaProps.sessao usa o tipo completo em vez de Pick<Sessao, 'logado'>
//      que causava o cast `sessao as any` em page.tsx
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

/**
 * Todos os roles possíveis no sistema.
 * Antes era 'CLIENTE' | 'FUNCIONARIO' — mas o backend emite 'PROFISSIONAL' e 'ADMIN'.
 * Isso causava incompatibilidade silenciosa em toda a landing.
 */
export type SessaoRole = 'CLIENTE' | 'PROFISSIONAL' | 'ADMIN'

export interface Sessao {
    logado: boolean
    id?: string
    role?: SessaoRole
    nome?: string
}

/** Tipo discriminado para mensagens de feedback */
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

/**
 * CORRIGIDO: sessao agora recebe o tipo completo Sessao em vez de Pick<Sessao, 'logado'>.
 * O componente já usava .nome internamente com um cast `as any` — agora está tipado corretamente.
 */
export interface FormularioReservaProps {
    sessao: Sessao
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
    toggleServico: (id: string) => void
}