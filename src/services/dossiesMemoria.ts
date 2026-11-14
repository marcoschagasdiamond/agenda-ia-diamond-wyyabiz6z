import { pb } from '@/lib/pocketbase/client'

// ─────────────────────────────────────────────────────────────
// CAMADA 1 — Dossiês consolidados de memória
// Coleção: dossies_memoria (um dossiê por usuario+tipo_entidade+entidade_id)
// Endpoints (hook dossies_memoria.js):
//   GET  /backend/v1/dossies            — lista paginada
//   POST /backend/v1/dossies/regenerar  — regenera/cria 1 dossiê sob demanda
// CAMADA 2 — Busca semântica
//   POST /backend/v1/analista-memoria/busca-semantica
// ─────────────────────────────────────────────────────────────

export type TipoEntidadeDossie = 'contato' | 'negocio' | 'projeto'

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

export interface RespostaBuscaSemantica {
  resultados: ResultadoSemantico[]
  observacao: string
  total_candidatos: number
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

export async function buscaSemanticaMemoria(pergunta: string): Promise<RespostaBuscaSemantica> {
  return pb.send('/backend/v1/analista-memoria/busca-semantica', {
    method: 'POST',
    body: JSON.stringify({ pergunta }),
    headers: { 'Content-Type': 'application/json' },
  })
}
