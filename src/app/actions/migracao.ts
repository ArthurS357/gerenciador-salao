'use server'

/**
 * Módulo de Migração do Legado (Sistema Grace)
 *
 * Responsabilidades:
 * - Receber o conteúdo de arquivos CSV ou JSON exportados pelo Grace
 * - Processar em chunks para evitar timeout e OOM em ingestões massivas
 * - Preservar o `createdAt` original dos registros
 * - Deduplicar por telefone/CPF (clientes) e nome (produtos) — skip, nunca sobrescreve
 * - Retornar estatísticas da operação
 *
 * Mapeamento de colunas Grace → Schema Prisma
 * ─────────────────────────────────────────────
 * Clientes:  nome | telefone/fone/celular | email | cpf | data_cadastro/created_at
 * Produtos:  nome | descricao | preco_custo/custo | preco_venda/venda | estoque
 *            unidade_medida/unidade | tamanho_unidade/tamanho | data_cadastro/created_at
 */

import { prisma } from '@/lib/prisma'
import { verificarSessaoFuncionario } from '@/app/actions/auth'
import type { ActionResult } from '@/types/domain'

// ── Constantes ────────────────────────────────────────────────────────────────

/** Tamanho do lote para createMany. Equilibra throughput e uso de memória. */
const CHUNK_SIZE = 100

/** Unidades de medida aceitas pelo schema. Valor padrão quando não reconhecida. */
const UNIDADES_VALIDAS = ['ml', 'L', 'g', 'kg', 'unidade'] as const
type UnidadeValida = typeof UNIDADES_VALIDAS[number]

// ── Tipo de resultado público ─────────────────────────────────────────────────

export type ResultadoImportacao = {
    importados: number
    ignorados: number   // duplicatas detectadas antes do insert
    erros: number       // linhas com formato inválido
    mensagens: string[]
}

// ── Utilitários Internos ──────────────────────────────────────────────────────

/** Divide um array em sublotes de tamanho máximo `tamanho`. */
function chunks<T>(arr: T[], tamanho: number): T[][] {
    const result: T[][] = []
    for (let i = 0; i < arr.length; i += tamanho) {
        result.push(arr.slice(i, i + tamanho))
    }
    return result
}

/**
 * Parser de CSV minimalista.
 *
 * Suporta:
 * - CRLF e LF
 * - Campos entre aspas simples ou duplas
 * - Cabeçalho na primeira linha (case-insensitive, trimado)
 * Não suporta quebras de linha dentro de campos — suficiente para exportações Grace.
 */
function parsearCSV(conteudo: string): Record<string, string>[] {
    const linhas = conteudo
        .replace(/\r\n/g, '\n')
        .replace(/\r/g, '\n')
        .split('\n')

    if (linhas.length < 2) return []

    const cabecalho = linhas[0]
        .split(',')
        .map(h => h.trim().toLowerCase().replace(/^["']|["']$/g, ''))

    const registros: Record<string, string>[] = []

    for (let i = 1; i < linhas.length; i++) {
        const linha = linhas[i].trim()
        if (!linha) continue

        // Split com suporte a campos entre aspas contendo vírgulas
        const valores: string[] = []
        let campo = ''
        let dentroDeAspas = false
        let charAspas = ''

        for (let c = 0; c < linha.length; c++) {
            const ch = linha[c]
            if (!dentroDeAspas && (ch === '"' || ch === "'")) {
                dentroDeAspas = true
                charAspas = ch
            } else if (dentroDeAspas && ch === charAspas) {
                dentroDeAspas = false
            } else if (!dentroDeAspas && ch === ',') {
                valores.push(campo.trim())
                campo = ''
            } else {
                campo += ch
            }
        }
        valores.push(campo.trim())

        if (valores.length < cabecalho.length) continue

        const registro: Record<string, string> = {}
        cabecalho.forEach((col, idx) => {
            registro[col] = valores[idx] ?? ''
        })
        registros.push(registro)
    }

    return registros
}

/** Remove tudo que não seja dígito e limita a 11 chars (máximo de CPF/telefone BR). */
function apenasDigitos(v: string, limite = 11): string {
    return v.replace(/\D/g, '').slice(0, limite)
}

/**
 * Tenta converter uma string de data em objeto Date.
 * Aceita ISO 8601 (YYYY-MM-DD) e formato BR (DD/MM/AAAA).
 * Retorna `undefined` se não conseguir parsear.
 */
function parsearData(raw: string): Date | undefined {
    if (!raw) return undefined
    // ISO primeiro
    const tentativaISO = new Date(raw)
    if (!isNaN(tentativaISO.getTime())) return tentativaISO
    // Formato brasileiro DD/MM/AAAA
    const partes = raw.split('/')
    if (partes.length === 3) {
        const [d, m, y] = partes
        const iso = new Date(`${y}-${m?.padStart(2, '0')}-${d?.padStart(2, '0')}`)
        if (!isNaN(iso.getTime())) return iso
    }
    return undefined
}

/** Normaliza unidade de medida para os valores aceitos pelo schema. */
function normalizarUnidade(raw: string): UnidadeValida {
    const lower = raw.toLowerCase().trim()
    if ((UNIDADES_VALIDAS as readonly string[]).includes(lower)) {
        return lower as UnidadeValida
    }
    // Aliases comuns do Grace
    if (lower === 'un' || lower === 'und' || lower === 'pç' || lower === 'pc') return 'unidade'
    if (lower === 'litro' || lower === 'litros') return 'L'
    if (lower === 'grama' || lower === 'gramas') return 'g'
    if (lower === 'mililitro' || lower === 'mililitros') return 'ml'
    if (lower === 'kilo' || lower === 'quilograma') return 'kg'
    return 'unidade'
}

// ── 1. Importar Clientes — CSV ────────────────────────────────────────────────

/**
 * Importa clientes do sistema legado Grace via CSV.
 *
 * Colunas esperadas (case-insensitive, ordem livre):
 *   nome*           — nome do cliente
 *   telefone/fone/celular*  — DDD + número
 *   email           — e-mail (opcional)
 *   cpf             — 11 dígitos (opcional)
 *   data_cadastro / created_at  — data original de cadastro (opcional)
 *
 * Processamento em chunks de 100 para evitar timeout.
 * Duplicatas (telefone ou CPF) são ignoradas sem sobrescrever dados existentes.
 */
export async function importarClientesGraceCSV(
    conteudoCSV: string
): Promise<ActionResult<{ resultado: ResultadoImportacao }>> {
    const sessao = await verificarSessaoFuncionario()
    if (!sessao.logado || sessao.role !== 'ADMIN') {
        return { sucesso: false, erro: 'Acesso negado. Apenas administradores podem importar dados.' }
    }

    if (!conteudoCSV?.trim()) {
        return { sucesso: false, erro: 'Conteúdo CSV vazio.' }
    }

    try {
        const registros = parsearCSV(conteudoCSV)
        if (registros.length === 0) {
            return { sucesso: false, erro: 'Arquivo CSV vazio ou formato inválido. Verifique o separador (vírgula) e o cabeçalho.' }
        }

        // Pré-carrega chaves únicas existentes para deduplicação em memória
        const [telefonesExistentes, cpfsExistentes] = await Promise.all([
            prisma.cliente
                .findMany({ select: { telefone: true } })
                .then(r => new Set(r.map(c => c.telefone))),
            prisma.cliente
                .findMany({ where: { cpf: { not: null } }, select: { cpf: true } })
                .then(r => new Set(r.map(c => c.cpf!))),
        ])

        const resultado: ResultadoImportacao = {
            importados: 0, ignorados: 0, erros: 0, mensagens: []
        }

        // Normalização e filtragem
        type ClienteCandidato = {
            nome: string
            telefone: string
            email: string | null
            cpf: string | null
            createdAt: Date
        }

        const candidatos: ClienteCandidato[] = []

        for (const reg of registros) {
            const nome = reg['nome']?.trim()
            const telefoneRaw =
                reg['telefone'] ?? reg['fone'] ?? reg['celular'] ?? reg['whatsapp'] ?? ''
            const telefone = apenasDigitos(telefoneRaw, 11)

            if (!nome || telefone.length < 10) {
                resultado.erros++
                continue
            }

            // Deduplicação: telefone
            if (telefonesExistentes.has(telefone)) {
                resultado.ignorados++
                continue
            }

            // Deduplicação: CPF
            const cpfRaw = apenasDigitos(reg['cpf'] ?? '', 11)
            const cpf = cpfRaw.length === 11 ? cpfRaw : null
            if (cpf && cpfsExistentes.has(cpf)) {
                resultado.ignorados++
                continue
            }

            // Preserva data de cadastro original ou usa agora
            const dataBruta =
                reg['data_cadastro'] ?? reg['created_at'] ?? reg['datacadastro'] ?? ''
            const createdAt = parsearData(dataBruta) ?? new Date()

            // Marca como visto para deduplicar dentro do próprio CSV
            telefonesExistentes.add(telefone)
            if (cpf) cpfsExistentes.add(cpf)

            candidatos.push({
                nome,
                telefone,
                email: reg['email']?.trim() || null,
                cpf,
                createdAt,
            })
        }

        // Ingestão em chunks com createMany (deduplicação feita em memória acima)
        for (const lote of chunks(candidatos, CHUNK_SIZE)) {
            const criados = await prisma.cliente.createMany({ data: lote })
            resultado.importados += criados.count
        }

        resultado.mensagens.push(
            `Importação concluída: ${resultado.importados} importados, ` +
            `${resultado.ignorados} ignorados (duplicatas), ${resultado.erros} com erro de formato.`
        )

        return { sucesso: true, data: { resultado } }
    } catch (error) {
        console.error('[Migração] Erro ao importar clientes CSV:', error)
        return { sucesso: false, erro: 'Falha técnica durante a importação de clientes.' }
    }
}

// ── 2. Importar Clientes — JSON ───────────────────────────────────────────────

/**
 * Importa clientes a partir de um JSON exportado pelo Grace.
 *
 * Formato esperado: array de objetos com as mesmas chaves do CSV (case-insensitive).
 * Internamente converte para o formato CSV normalizado e reutiliza a pipeline.
 */
export async function importarClientesGraceJSON(
    conteudoJSON: string
): Promise<ActionResult<{ resultado: ResultadoImportacao }>> {
    const sessao = await verificarSessaoFuncionario()
    if (!sessao.logado || sessao.role !== 'ADMIN') {
        return { sucesso: false, erro: 'Acesso negado.' }
    }

    let dados: unknown
    try {
        dados = JSON.parse(conteudoJSON)
    } catch {
        return { sucesso: false, erro: 'JSON inválido ou malformado.' }
    }

    if (!Array.isArray(dados) || dados.length === 0) {
        return { sucesso: false, erro: 'O JSON deve conter um array não-vazio de registros.' }
    }

    // Normaliza chaves para lowercase e converte valores para string
    // (mesmo comportamento do parsearCSV)
    const registros = (dados as Record<string, unknown>[]).map(item => {
        const r: Record<string, string> = {}
        for (const [k, v] of Object.entries(item)) {
            r[k.toLowerCase()] = v == null ? '' : String(v)
        }
        return r
    })

    // Reutiliza a pipeline de importação via CSV sintético
    const header = Object.keys(registros[0] ?? {}).join(',')
    const linhas = registros.map(r =>
        Object.values(r)
            .map(v => (v.includes(',') ? `"${v}"` : v))
            .join(',')
    )
    const csvSintetico = [header, ...linhas].join('\n')

    return importarClientesGraceCSV(csvSintetico)
}

// ── 3. Importar Produtos — CSV ────────────────────────────────────────────────

/**
 * Importa produtos do sistema legado Grace via CSV.
 *
 * Colunas esperadas (case-insensitive, ordem livre):
 *   nome*                  — nome do produto
 *   descricao              — descrição (opcional)
 *   preco_custo / custo    — preço de custo (opcional)
 *   preco_venda / venda*   — preço de venda
 *   estoque                — quantidade em estoque (default: 0)
 *   unidade_medida / unidade — unidade de medida (default: "unidade")
 *   tamanho_unidade / tamanho — tamanho da unidade (default: 1)
 *   data_cadastro / created_at — data original (opcional)
 *
 * Deduplicação: produtos com o mesmo nome são ignorados.
 */
export async function importarProdutosGraceCSV(
    conteudoCSV: string
): Promise<ActionResult<{ resultado: ResultadoImportacao }>> {
    const sessao = await verificarSessaoFuncionario()
    if (!sessao.logado || sessao.role !== 'ADMIN') {
        return { sucesso: false, erro: 'Acesso negado. Apenas administradores podem importar dados.' }
    }

    if (!conteudoCSV?.trim()) {
        return { sucesso: false, erro: 'Conteúdo CSV vazio.' }
    }

    try {
        const registros = parsearCSV(conteudoCSV)
        if (registros.length === 0) {
            return { sucesso: false, erro: 'Arquivo CSV vazio ou formato inválido.' }
        }

        // Pré-carrega nomes existentes para deduplicação
        const nomesExistentes = await prisma.produto
            .findMany({ select: { nome: true } })
            .then(r => new Set(r.map(p => p.nome.toLowerCase().trim())))

        const resultado: ResultadoImportacao = {
            importados: 0, ignorados: 0, erros: 0, mensagens: []
        }

        type ProdutoCandidato = {
            nome: string
            descricao: string | null
            precoCusto: number | null
            precoVenda: number
            estoque: number
            unidadeMedida: string
            tamanhoUnidade: number
            ativo: boolean
            createdAt: Date
        }

        const candidatos: ProdutoCandidato[] = []

        for (const reg of registros) {
            const nome = reg['nome']?.trim()
            if (!nome) { resultado.erros++; continue }

            const nomeKey = nome.toLowerCase()
            if (nomesExistentes.has(nomeKey)) {
                resultado.ignorados++
                continue
            }

            const precoVendaRaw = parseFloat(
                (reg['preco_venda'] ?? reg['venda'] ?? reg['preco'] ?? '0').replace(',', '.')
            )
            if (isNaN(precoVendaRaw) || precoVendaRaw < 0) {
                resultado.erros++
                continue
            }

            const precoCustoRaw = parseFloat(
                (reg['preco_custo'] ?? reg['custo'] ?? '').replace(',', '.')
            )
            const precoCusto = isNaN(precoCustoRaw) || precoCustoRaw < 0 ? null : precoCustoRaw

            const estoqueRaw = parseInt(reg['estoque'] ?? '0', 10)
            const estoque = isNaN(estoqueRaw) || estoqueRaw < 0 ? 0 : estoqueRaw

            const tamanhoRaw = parseFloat(
                (reg['tamanho_unidade'] ?? reg['tamanho'] ?? '1').replace(',', '.')
            )
            const tamanhoUnidade = isNaN(tamanhoRaw) || tamanhoRaw <= 0 ? 1 : tamanhoRaw

            const unidadeMedida = normalizarUnidade(
                reg['unidade_medida'] ?? reg['unidade'] ?? 'unidade'
            )

            const dataBruta =
                reg['data_cadastro'] ?? reg['created_at'] ?? reg['datacadastro'] ?? ''
            const createdAt = parsearData(dataBruta) ?? new Date()

            // Marca como visto para deduplicar dentro do próprio CSV
            nomesExistentes.add(nomeKey)

            candidatos.push({
                nome,
                descricao: reg['descricao']?.trim() || null,
                precoCusto,
                precoVenda: precoVendaRaw,
                estoque,
                unidadeMedida,
                tamanhoUnidade,
                ativo: true,
                createdAt,
            })
        }

        // Ingestão em chunks (deduplicação por nome feita em memória acima)
        for (const lote of chunks(candidatos, CHUNK_SIZE)) {
            const criados = await prisma.produto.createMany({ data: lote })
            resultado.importados += criados.count
        }

        resultado.mensagens.push(
            `Importação concluída: ${resultado.importados} produtos importados, ` +
            `${resultado.ignorados} ignorados (duplicatas de nome), ${resultado.erros} com erro de formato.`
        )

        return { sucesso: true, data: { resultado } }
    } catch (error) {
        console.error('[Migração] Erro ao importar produtos CSV:', error)
        return { sucesso: false, erro: 'Falha técnica durante a importação de produtos.' }
    }
}

// ── 4. Importar Produtos — JSON ───────────────────────────────────────────────

export async function importarProdutosGraceJSON(
    conteudoJSON: string
): Promise<ActionResult<{ resultado: ResultadoImportacao }>> {
    const sessao = await verificarSessaoFuncionario()
    if (!sessao.logado || sessao.role !== 'ADMIN') {
        return { sucesso: false, erro: 'Acesso negado.' }
    }

    let dados: unknown
    try {
        dados = JSON.parse(conteudoJSON)
    } catch {
        return { sucesso: false, erro: 'JSON inválido ou malformado.' }
    }

    if (!Array.isArray(dados) || dados.length === 0) {
        return { sucesso: false, erro: 'O JSON deve conter um array não-vazio de registros.' }
    }

    const registros = (dados as Record<string, unknown>[]).map(item => {
        const r: Record<string, string> = {}
        for (const [k, v] of Object.entries(item)) {
            r[k.toLowerCase()] = v == null ? '' : String(v)
        }
        return r
    })

    const header = Object.keys(registros[0] ?? {}).join(',')
    const linhas = registros.map(r =>
        Object.values(r)
            .map(v => (v.includes(',') ? `"${v}"` : v))
            .join(',')
    )

    return importarProdutosGraceCSV([header, ...linhas].join('\n'))
}
