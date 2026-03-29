import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

/**
 * Utilitário para construção dinâmica e resolução de conflitos de classes Tailwind.
 * Combina o poder condicional do `clsx` com o roteamento de sobreposições do `tailwind-merge`.
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}