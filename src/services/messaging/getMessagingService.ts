// =============================================================================
// Factory / Singleton do Serviço de Mensageria
//
// Padrão: Service Locator com override controlado para testes.
// Server Actions e Cron Routes chamam getMessagingService() e recebem
// IMessagingService — nunca sabem se é Z-API, mock ou qualquer outro provedor.
//
// PARA TESTES:
//   import { __setMessagingServiceForTests } from '@/services/messaging/getMessagingService'
//   beforeEach(() => __setMessagingServiceForTests(mockService))
//   afterEach(() => __setMessagingServiceForTests(null))
// =============================================================================

import type { IMessagingService } from '@/domain/messaging/IMessagingService'
import { ZApiWhatsAppService } from './ZApiWhatsAppService'

// Singleton lazy — compatível com serverless (cada invocação pode ser nova)
let _instance: IMessagingService | null = null

export function getMessagingService(): IMessagingService {
  if (!_instance) {
    _instance = new ZApiWhatsAppService()
  }
  return _instance
}

/**
 * Permite injetar um mock em testes sem alterar código de produção.
 * Passe `null` para resetar ao comportamento padrão.
 */
export function __setMessagingServiceForTests(mock: IMessagingService | null): void {
  _instance = mock
}
