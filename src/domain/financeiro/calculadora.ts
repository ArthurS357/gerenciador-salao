/**
 * Motor Financeiro — Funções Puras de Domínio
 *
 * Todas as funções aqui são puras (sem efeitos colaterais, sem I/O):
 * recebem scalars/arrays, retornam scalars/arrays.
 * Isso garante testabilidade unitária completa e isolamento do banco.
 *
 * Referência de regras de negócio: Fluxo_Financeiro.md (vault Obsidian)
 */

import type { PagamentoComandaInput, FechamentoComanda } from '@/types/domain'

// ── Tipos de entrada da calculadora ──────────────────────────────────────────

/** Registro de taxa lido de TaxaMetodoPagamento (só os campos necessários). */
export type TaxaConfigInput = {
    id: string
    metodo: string
    bandeira: string
    taxaBase: number
}

/** ConfiguracaoSalao do banco (pode ser null se a tabela estiver vazia). */
export type ConfiguracaoFallback = {
    taxaCredito: number | null
    taxaDebito: number | null
    taxaPix: number | null
} | null

/** Item de produto da comanda com apenas os campos usados no custo. */
export type ItemProdutoParaCusto = {
    precoCobrado: number
    quantidade: number
    produto: { precoCusto: number | null } | null
}

// ── Tipos de saída ────────────────────────────────────────────────────────────

/** Pagamento enriquecido com taxa resolvida — pronto para persistir em PagamentoComanda. */
export type PagamentoCalculado = {
    metodo: string
    valor: number
    parcelas: number
    taxaAplicada: number
    taxaMetodoId: string | null
    bandeira: string
}

/** Resultado do processamento de taxas. */
export type ResultadoTaxas = {
    pagamentosCalculados: PagamentoCalculado[]
    totalTaxas: number
}

/** Campos de compatibilidade legada calculados a partir dos pagamentos. */
export type CamposLegado = {
    valorDinheiro: number
    valorCartao: number
    valorPix: number
    metodoPagamento: string
}

// ── Função 1: Custo de Revenda ────────────────────────────────────────────────

/**
 * Calcula o custo de revenda dos produtos adicionados à comanda.
 *
 * Regra: prioriza `precoCusto` do cadastro; se ausente, aplica 50% do
 * preço cobrado como estimativa conservadora de custo de mercadoria.
 */
export function calcularCustoRevenda(produtos: ItemProdutoParaCusto[]): number {
    let total = 0
    for (const item of produtos) {
        const custoUnitario = item.produto?.precoCusto ?? (item.precoCobrado * 0.5)
        total += custoUnitario * item.quantidade
    }
    return total
}

// ── Função 2: Taxas e Pagamentos ─────────────────────────────────────────────

/**
 * Processa cada item de pagamento e resolve sua taxa efetiva:
 *
 * Resolução de taxa (prioridade decrescente):
 *   1. Taxa específica por bandeira: `METODO:BANDEIRA` (ex: "CARTAO_CREDITO:VISA")
 *   2. Taxa genérica do método:      `METODO:`         (ex: "CARTAO_CREDITO:")
 *   3. Fallback legado de ConfiguracaoSalao
 *   4. Zero (DINHEIRO, CORTESIA, VOUCHER, PERMUTA)
 *
 * Escalonamento de parcelas:
 *   taxaEfetiva = taxaBase * parcelas  (somente CARTAO_CREDITO em 2+ parcelas)
 *
 * Regra de negócio documentada: dinheiro NUNCA incide taxa (Fluxo_Financeiro.md).
 */
export function calcularTaxasEPagamentos(
    pagamentos: PagamentoComandaInput[],
    taxasMap: Map<string, TaxaConfigInput>,
    fallback: ConfiguracaoFallback
): ResultadoTaxas {
    let totalTaxas = 0

    const pagamentosCalculados: PagamentoCalculado[] = pagamentos.map(pag => {
        // Lookup: específico por bandeira → genérico do método
        const configMetodo =
            taxasMap.get(`${pag.metodo}:${pag.bandeira}`) ??
            taxasMap.get(`${pag.metodo}:`)

        let taxaBase = configMetodo?.taxaBase

        // Fallback para configuração legada de ConfiguracaoSalao
        if (taxaBase === undefined) {
            if (pag.metodo === 'CARTAO_CREDITO')     taxaBase = fallback?.taxaCredito ?? 3.0
            else if (pag.metodo === 'CARTAO_DEBITO') taxaBase = fallback?.taxaDebito  ?? 1.5
            else if (pag.metodo === 'PIX')           taxaBase = fallback?.taxaPix     ?? 0.0
            else                                     taxaBase = 0  // DINHEIRO, CORTESIA, VOUCHER, PERMUTA
        }

        // Parcelas só se aplicam a crédito; demais métodos são sempre 1x
        const parcelas = pag.metodo === 'CARTAO_CREDITO' ? Math.max(1, pag.parcelas ?? 1) : 1

        // Escalonamento linear: taxa de 3% em 12x = 36% total sobre aquele valor
        const taxaAplicadaReal =
            pag.metodo === 'CARTAO_CREDITO' && parcelas > 1
                ? taxaBase * parcelas
                : taxaBase

        totalTaxas += pag.valor * (taxaAplicadaReal / 100)

        return {
            metodo:       pag.metodo,
            valor:        pag.valor,
            parcelas,
            taxaAplicada: taxaAplicadaReal,
            taxaMetodoId: configMetodo?.id ?? null,
            bandeira:     pag.bandeira,
        }
    })

    return { pagamentosCalculados, totalTaxas }
}

// ── Função 3: Snapshot Financeiro Imutável ───────────────────────────────────

/**
 * Produz o snapshot financeiro do fechamento de comanda.
 *
 * Fórmulas (ref: Fluxo_Financeiro.md):
 *   deduções       = taxas + custoInsumos + custoRevenda
 *   baseLíquida    = max(0, bruto − deduções)
 *   comissão       = baseLíquida × (comissaoSnap / 100)
 *   lucroSalão     = bruto − deduções − comissão
 *   valorPago      = min(totalRecebido, bruto)
 *   valorPendente  = max(0, bruto − totalRecebido)
 *   comissaoLiberada = valorPendente < R$ 0,01
 *
 * Retorna FechamentoComanda (compatível com o tipo de domínio existente).
 */
export function calcularSnapshotFinanceiro(
    valorBruto: number,
    totalTaxas: number,
    custoInsumos: number,
    custoRevenda: number,
    comissaoSnap: number,
    totalRecebido: number
): FechamentoComanda {
    const deducoesTotais   = totalTaxas + custoInsumos + custoRevenda
    const baseLiquida      = Math.max(0, valorBruto - deducoesTotais)
    const valorComissao    = baseLiquida * (comissaoSnap / 100)
    const lucroSalao       = valorBruto - deducoesTotais - valorComissao
    const valorPago        = Math.min(totalRecebido, valorBruto)
    const valorPendente    = Math.max(0, valorBruto - totalRecebido)
    const comissaoLiberada = valorPendente < 0.01

    return {
        bruto:            valorBruto,
        deducoes:         deducoesTotais,
        baseReal:         valorBruto - deducoesTotais,
        comissao:         valorComissao,
        lucroSalao,
        valorPago,
        valorPendente,
        comissaoLiberada,
    }
}

// ── Função 4: Campos Legados ──────────────────────────────────────────────────

/**
 * Calcula os campos de compatibilidade legada para relatórios históricos.
 * Esses campos existem no snapshot do Agendamento por retrocompatibilidade.
 */
export function calcularCamposLegado(pagamentos: PagamentoComandaInput[]): CamposLegado {
    const valorDinheiro = pagamentos
        .filter(p => p.metodo === 'DINHEIRO')
        .reduce((s, p) => s + p.valor, 0)

    const valorCartao = pagamentos
        .filter(p => p.metodo === 'CARTAO_CREDITO' || p.metodo === 'CARTAO_DEBITO')
        .reduce((s, p) => s + p.valor, 0)

    const valorPix = pagamentos
        .filter(p => p.metodo === 'PIX')
        .reduce((s, p) => s + p.valor, 0)

    const metodosUsados   = pagamentos.map(p => p.metodo)
    const metodoPagamento = metodosUsados.length === 1 ? metodosUsados[0] : 'MISTO'

    return { valorDinheiro, valorCartao, valorPix, metodoPagamento }
}
