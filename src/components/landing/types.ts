// src/components/landing/types.ts
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
    descricao: string | null
    imagensJson: string           // JSON array: '["url1","url2","url3","url4"]'
    valor: number | null
    linkInstagram: string | null
}

export type SessaoRole = 'CLIENTE' | 'PROFISSIONAL' | 'ADMIN' | 'RECEPCIONISTA' // ← ADICIONADO AQUI

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

/**
 * Representa um horário confirmado no wizard de agendamento.
 * Estruturalmente idêntico a AgendamentoConfirmado do ModalAgendamento,
 * mantido aqui para evitar dependência cruzada de módulos.
 */
export interface AgendamentoConfirmado {
    servicoId: string
    dataIso: string // "YYYY-MM-DD"
    hora: string    // "HH:MM"
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
    /** Horários confirmados para cada serviço (wizard multi-step). */
    agendamentosConfirmados: AgendamentoConfirmado[]
    setAgendamentosConfirmados: (ags: AgendamentoConfirmado[]) => void
    mensagem: Mensagem
    handleAgendar: (e: React.FormEvent) => void
    profissionalSelecionado?: Profissional
    toggleServico: (id: string) => void
}