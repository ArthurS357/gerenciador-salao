export interface ServicoSelecionado {
    id: string;
    nome: string;
    tempoMinutos: number | null;
}

export interface ModalAgendamentoProps {
    isOpen: boolean;
    onClose: () => void;
    servicosSelecionados: ServicoSelecionado[];
    profissionalId: string | null;
    onConfirmar: (dataIso: string, hora: string) => void;
}