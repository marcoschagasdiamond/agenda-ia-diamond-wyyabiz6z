import pb from '@/lib/pocketbase/client'

// ─────────────────────────────────────────────────────────────
// CAMADA 1 — Dossiês consolidados de memória
// Coleção: dossies_memoria (um dossiê por usuario+tipo_entidade+entidade_id)
// Endpoints (hook dossies_memoria.js):
//   GET  /backend/v1/dossies            — lista paginada
//   POST /backend/v1/dossies/regenerar  — regenera/cria 1 dossiê sob demanda
// CAMADA 2 — Busca semântica com filtros (hook busca_semantica_memoria.js)
//   POST /backend/v1/analista-memoria/busca-semantica
// CAMADA 3 — Linha do tempo episódica (coleção episodios_memoria)
// ─────────────────────────────────────────────────────────────

export type TipoEntidadeDossie = 'contato' | 'negocio' | 'projeto'

export type TipoFiltroBusca =
  | 'dossie'
  | 'resumo_dia'
  | 'folha'
  | 'card'
  | 'chat'
  | 'episodio'
  | 'memoria_compartilhada'

export interface DossieMemoria {
  id: string
  tipo_entidade: TipoEntidadeDossie
  entidade_id: string
  entidade_nome: string
  nome: string
  resumo: string
  conteudo: string
  demandas_abertas: Array<{ titulo: string; prazo?: string; prioridade?: string }>
  atualizado_em: string
}
export interface ResultadoSemantico {
  id: string
  tipo: string
  fonte: string
  data: string
  trecho: string
  justificativa: string
  confianca: 'alta' | 'media' | 'baixa'
}

export interface FiltrosBuscaSemantica {
  tipo_entidade?: TipoFiltroBusca | ''
  data_inicio?: string
  data_fim?: string
  pessoa?: string
  negocio?: string
  projeto?: string
  limite?: number
}

export interface RespostaBuscaSemantica {
  resultados: ResultadoSemantico[]
  observacao: string
  total_candidatos: number
  filtros_aplicados?: string[]
}

export async function listarDossies(
  page = 1,
  perPage = 20,
  opts: { busca?: string; tipo_entidade?: TipoEntidadeDossie | '' } = {},
): Promise<{ itens: DossieMemoria[]; page: number; totalItens: number }> {
  const params = new URLSearchParams({ page: String(page), perPage: String(perPage) })
  if (opts.busca) params.set('busca', opts.busca)
  if (opts.tipo_entidade) params.set('tipo_entidade', opts.tipo_entidade)
  const res = await pb.send(`/backend/v1/dossies?${params.toString()}`, { method: 'GET' })
  return {
    itens: (res?.itens || []) as DossieMemoria[],
    page: res?.page || page,
    totalItens: res?.totalItens || 0,
  }
}

export async function regenerarDossie(
  tipo_entidade: TipoEntidadeDossie,
  entidade_id: string,
): Promise<{
  sucesso: boolean
  id?: string
  atualizado?: boolean
  mensagem?: string
  error?: string
}> {
  return pb.send('/backend/v1/dossies/regenerar', {
    method: 'POST',
    body: JSON.stringify({ tipo_entidade, entidade_id }),
    headers: { 'Content-Type': 'application/json' },
  })
}

export async function buscaSemanticaMemoria(
  pergunta: string,
  filtros: FiltrosBuscaSemantica = {},
): Promise<RespostaBuscaSemantica> {
  return pb.send('/backend/v1/analista-memoria/busca-semantica', {
    method: 'POST',
    body: JSON.stringify({ pergunta, ...filtros }),
    headers: { 'Content-Type': 'application/json' },
  })
}

// ─────────────────────────────────────────────────────────────
// CAMADA 3 — Episódios (linha do tempo episódica)
// Coleção: episodios_memoria (um episódio por usuario+data; encadeados
// via episodio_anterior, com pendencias_carregadas herdadas do dia anterior)
// ─────────────────────────────────────────────────────────────

export interface EpisodioMemoria {
  id: string
  data: string
  titulo?: string
  resumo: string
  total_registros?: number
  pendencias_carregadas: string | string[] | null
  created: string
  updated: string
}

export async function listarEpisodiosMemoria(
  page = 1,
  perPage = 7,
): Promise<{ itens: EpisodioMemoria[]; page: number; totalItens: number }> {
  const res = await pb.collection('episodios_memoria').getList(page, perPage, {
    sort: '-data',
    fields: 'id,data,resumo,pendencias_carregadas,created,updated',
  })
  return {
    itens: (res.items || []) as unknown as EpisodioMemoria[],
    page: res.page || page,
    totalItens: res.totalItems || 0,
  }
}
