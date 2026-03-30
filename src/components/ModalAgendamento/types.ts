export interface ServicoSelecionado {
    id: string;
    nome: string;
    tempoMinutos: number | null;
}

/**
 * Representa um horário confirmado para um serviço específico.
 * Usado no wizard multi-step do ModalAgendamento.
 */
export interface AgendamentoConfirmado {
    servicoId: string;
    dataIso: string; // "YYYY-MM-DD"
    hora: string;    // "HH:MM"
}

export interface ModalAgendamentoProps {
    isOpen: boolean;
    onClose: () => void;
    servicosSelecionados: ServicoSelecionado[];
    profissionalId: string | null;
    /**
     * Chamado ao final do wizard com TODOS os horários confirmados.
     * Para 1 serviço: array com 1 item.
     * Para N serviços: array com N itens, na mesma ordem dos serviços selecionados.
     */
    onConfirmar: (resultados: AgendamentoConfirmado[]) => void;
}