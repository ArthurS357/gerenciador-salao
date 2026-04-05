// =============================================================================
// Camada de Domínio: Contrato de Mensageria (Interface Segregation + DIP)
//
// Server Actions e Cron Routes dependem DESTA abstração.
// Nunca devem importar ZApiWhatsAppService diretamente.
// Para trocar de provedor (Twilio, Vonage, etc.), basta criar nova
// implementação desta interface — zero alteração nas camadas superiores.
// =============================================================================

export interface ParamsConfirmacao {
  nomeCliente:      string
  telefone:         string
  dataFormatada:    string  // ex: "segunda-feira, 07 de abril"
  horaFormatada:    string  // ex: "14:30"
  nomesServicos:    string  // ex: "Corte, Escova"
  nomeProfissional: string
  valorTotal:       number  // valor bruto em float (R$)
}

export interface ParamsCancelamento {
  nomeCliente:      string
  telefone:         string
  dataFormatada:    string
  horaFormatada:    string
  nomesServicos:    string
  nomeProfissional: string
}

export interface ParamsLembrete {
  nomeCliente:      string
  telefone:         string
  dataFormatada:    string
  horaFormatada:    string
  nomesServicos:    string
  nomeProfissional: string
}

export interface IMessagingService {
  enviarConfirmacao(params: ParamsConfirmacao):   Promise<boolean>
  enviarCancelamento(params: ParamsCancelamento): Promise<boolean>
  enviarLembrete(params: ParamsLembrete):         Promise<boolean>
}
