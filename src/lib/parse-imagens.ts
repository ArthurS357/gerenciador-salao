import { Prisma } from '@prisma/client'

/** Converte o campo Json do PostgreSQL para string[]. Retorna [] se o dado
 *  não for um array, protegendo contra corrupção silenciosa em runtime. */
export function parseImagens(json: Prisma.JsonValue): string[] {
    if (Array.isArray(json)) {
        return json.map(String)
    }
    return []
}
