'use server'

import { verificarNumeroExisteNoWhatsApp } from '@/lib/whatsapp';

export async function validarWhatsAppAction(telefone: string): Promise<boolean> {
    return await verificarNumeroExisteNoWhatsApp(telefone);
}