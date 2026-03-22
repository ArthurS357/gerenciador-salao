/**
 * cn.ts — Utilitário leve para compor classNames sem dependências externas.
 *
 * Substitui template literals multi-linha (causa do hydration mismatch):
 *   className={`\n  fixed top-0\n  left-0\n`}  ← SSR produz whitespace diferente
 *
 * Uso:
 *   cn('fixed top-0', condition && 'opacity-100', 'text-white')
 *   // → "fixed top-0 opacity-100 text-white"
 */
export function cn(...classes: Array<string | false | null | undefined>): string {
    return classes.filter(Boolean).join(' ')
}