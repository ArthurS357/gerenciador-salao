// =============================================================================
// Camada de Infraestrutura: Implementação Z-API do IMessagingService
//
// Esta classe é a única no projeto que conhece a Z-API.
// Delega a composição das mensagens para os templates de domínio (DRY).
// =============================================================================

import type {
  IMessagingService,
  ParamsConfirmacao,
  ParamsCancelamento,
  ParamsLembrete,
} from '@/domain/messaging/IMessagingService'
import {
  templateConfirmacao,
  templateCancelamento,
  templateLembrete,
} from '@/domain/messaging/templates'
import { enviarMensagemWhatsApp } from '@/lib/whatsapp'

export class ZApiWhatsAppService implements IMessagingService {
  async enviarConfirmacao(params: ParamsConfirmacao): Promise<boolean> {
    return enviarMensagemWhatsApp(params.telefone, templateConfirmacao(params))
  }

  async enviarCancelamento(params: ParamsCancelamento): Promise<boolean> {
    return enviarMensagemWhatsApp(params.telefone, templateCancelamento(params))
  }

  async enviarLembrete(params: ParamsLembrete): Promise<boolean> {
    return enviarMensagemWhatsApp(params.telefone, templateLembrete(params))
  }
}
