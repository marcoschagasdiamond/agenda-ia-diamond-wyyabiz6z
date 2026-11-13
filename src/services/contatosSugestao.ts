// Busca de contatos com paginação server-side — a base tem milhares de
// registros, nunca carregar a lista inteira. Consultas leves (id/nome) e
// paginação por página (perPage) com termo de busca no servidor.
import pb from '@/lib/pocketbase/client'

export interface SugestaoContato {
  id: string
  nome: string
}

/**
 * Lista paginada de contatos para sugestão no campo Parceiro.
 * Consulta apenas id+nome no servidor, com filtro de busca e limite de páginas.
 */
export async function listarContatosPaginado(
  busca: string,
  page: number,
  perPage = 20,
): Promise<{ itens: SugestaoContato[]; totalPaginas: number; total: number }> {
  const termo = busca.trim()
  const filtro = termo ? `nome ~ "${termo.replace(/"/g, '\\"')}"` : ''
  try {
    const res = await pb.collection('contatos').getList<SugestaoContato>(page, perPage, {
      fields: 'id,nome',
      filter: filtro,
      sort: 'nome',
    })
    return { itens: res.items, totalPaginas: res.totalPages, total: res.totalItems }
  } catch {
    return { itens: [], totalPaginas: 0, total: 0 }
  }
}
