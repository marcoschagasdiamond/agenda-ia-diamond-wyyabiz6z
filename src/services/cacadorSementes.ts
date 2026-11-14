// Serviço do "Caçador de Sementes" — Diamantina (agente nativo 'diamantina-cacador-sementes').
// Lê a coleção sugestoes_sementes (migration 1762800021/0022 + campos do pacote dos 4)
// e aciona a caçada sob demanda via POST /backend/v1/cacador-sementes/gerar — mesmo
// padrão do gerarResumoDia em src/services/diamondApi.ts (fetch com Authorization no
// token do pb.authStore, nunca $http).
import pb from '@/lib/pocketbase/client'

/** Uma sugestão de germinação devolvida pelo agente (json sugestoes). */
export interface SugestaoGerminacao {
  folha_id?: string
  tese?: string
  motivo?: string
  contra_argumento?: string
  titulo_card_sugerido?: string
  prioridade?: string
  urgente?: boolean
  /** Score determinístico calculado pelo hook (dias no cofre, revisão vencida, movimento…). */
  score?: number
  /** Tipo do motivo principal: movimento_recente | revisao_vencida | tempo_cofre | tese_aquecida. */
  tipo_motivo?: string
}

/** Rastro por sugestão (json status_registros): madura / germinada / ignorada. */
export interface StatusSugestao {
  status?: string
  tipo_motivo?: string
  germinada_em?: string
  ignorada_em?: string
}

/** Resumo textual da caçada (json resumo). */
export interface ResumoCacada {
  texto?: string
  total_urgentes?: number
}

/** Item da seção "Oportunidades do Caçador" (endpoint /oportunidades e json cacador do resumo). */
export interface OportunidadeCacadorItem {
  folha_id: string
  tese: string
  titulo: string
  motivo: string
  contra_argumento: string
  prioridade: string
  urgente: boolean
  score: number
  status: string
}

export interface OportunidadesCacador {
  total: number
  urgentes: number
  itens: OportunidadeCacadorItem[]
  texto: string
  disponivel: boolean
  data_geracao?: string
}

/** Registro do dia na coleção sugestoes_sementes (um por usuário/data). */
export interface SugestoesSementeDia {
  id: string
  usuario: string
  data_geracao: string
  sugestoes?: SugestaoGerminacao[] | string | null
  /** Rastro por sugestão: { [folha_id]: StatusSugestao }. */
  status_registros?: Record<string, StatusSugestao> | string | null
  /** Pesos de aprendizado por tipo de motivo: { germinou: {}, ignorou: {} }. */
  preferencias_cacador?: Record<string, Record<string, number>> | string | null
  /** Resumo textual da caçada: { texto, total_urgentes }. */
  resumo?: ResumoCacada | string | null
  mensagem_vazia?: string
  total_sementes?: number
  total_maduras?: number
  total_geradas?: number
  total_germinadas?: number
  total_ignoradas?: number
  gerado_por?: string
  status?: string
  created: string
  updated: string
}

const BASE = `${import.meta.env.VITE_POCKETBASE_URL}/backend/v1/cacador-sementes`

/** Data de hoje no fuso local, no formato AAAA-MM-DD usado em data_geracao. */
export const dataDeHojeLocal = (): string => {
  const agora = new Date()
  return new Date(agora.getTime() - agora.getTimezoneOffset() * 60000).toISOString().slice(0, 10)
}

/** Aceita o campo json como array (já parseado) ou string serializada. */
export const parseSugestoesGerminacao = (
  registro: SugestoesSementeDia | null,
): SugestaoGerminacao[] => {
  if (!registro) return []
  const bruto = registro.sugestoes
  if (!bruto) return []
  if (Array.isArray(bruto)) return bruto.filter(Boolean)
  if (typeof bruto === 'string') {
    try {
      const parsed = JSON.parse(bruto)
      return Array.isArray(parsed) ? parsed.filter(Boolean) : []
    } catch {
      return []
    }
  }
  return []
}

/** Aceita o campo json de um registro (status_registros / resumo / preferencias) como objeto ou string. */
const parseCampoJson = <T>(bruto: unknown, padrao: T): T => {
  if (!bruto) return padrao
  if (typeof bruto === 'object') return bruto as T
  if (typeof bruto === 'string') {
    try {
      const parsed = JSON.parse(bruto)
      return (parsed === null || parsed === undefined ? padrao : parsed) as T
    } catch {
      return padrao
    }
  }
  return padrao
}

/** Rastro (madura/germinada/ignorada) por folha_id do registro selecionado. */
export const parseStatusRegistros = (
  registro: SugestoesSementeDia | null,
): Record<string, StatusSugestao> => parseCampoJson(registro?.status_registros, {})

/** Resumo textual da caçada ({ texto, total_urgentes }). */
export const parseResumoCacada = (registro: SugestoesSementeDia | null): ResumoCacada =>
  parseCampoJson(registro?.resumo, {})

/** Interpreta o json "cacador" do Resumo do Dia ou a resposta do endpoint /oportunidades. */
export const parseOportunidadesCacador = (bruto: unknown): OportunidadesCacador | null => {
  const opp = parseCampoJson<OportunidadesCacador | null>(bruto, null)
  if (!opp || typeof opp !== 'object') return null
  return {
    total: Number(opp.total) || 0,
    urgentes: Number(opp.urgentes) || 0,
    itens: Array.isArray(opp.itens) ? opp.itens.filter(Boolean) : [],
    texto: opp.texto || '',
    disponivel: Boolean(opp.disponivel),
    data_geracao: opp.data_geracao,
  }
}

const authHeaders = () => ({
  'Content-Type': 'application/json',
  Authorization: pb.authStore.token,
})

/** Lista o registro de sugestões do dia do usuário (cron 21h + gerar agora). */
export async function listarSugestoesDoDia(): Promise<SugestoesSementeDia | null> {
  try {
    const lista = await pb.collection('sugestoes_sementes').getList<SugestoesSementeDia>(1, 1, {
      filter: `usuario = "${pb.authStore.model?.id}" && data_geracao = "${dataDeHojeLocal()}"`,
      sort: '-created',
    })
    return lista.items[0] || null
  } catch {
    return null
  }
}

/** Lista o histórico de caçadas (dias anteriores), paginado. */
export async function listarSugestoesPaginado(
  pagina: number,
  porPagina = 7,
): Promise<{ itens: SugestoesSementeDia[]; total: number }> {
  const lista = await pb
    .collection('sugestoes_sementes')
    .getList<SugestoesSementeDia>(pagina, porPagina, {
      filter: `usuario = "${pb.authStore.model?.id}"`,
      sort: '-data_geracao',
    })
  return { itens: lista.items, total: lista.totalItems }
}

/** Registra o feedback de GERMINADA numa sugestão (aprendizado do Caçador). */
export async function marcarFeedbackGerminada(
  dataGeracao: string,
  folhaId: string,
): Promise<{ sucesso: boolean; total_germinadas?: number }> {
  const res = await fetch(`${BASE}/germinar`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify({ data_geracao: dataGeracao, folha_id: folhaId }),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.error || 'Falha ao registrar a germinação.')
  }
  return await res.json()
}

/** Registra o feedback de IGNORADA numa sugestão (aprendizado do Caçador). */
export async function marcarFeedbackIgnorada(
  dataGeracao: string,
  folhaId: string,
): Promise<{ sucesso: boolean; total_ignoradas?: number }> {
  const res = await fetch(`${BASE}/ignorar`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify({ data_geracao: dataGeracao, folha_id: folhaId }),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.error || 'Falha ao registrar o ignore.')
  }
  return await res.json()
}

/** Pede à Diamantina que (re)cace sementes maduras agora via hook backend. */
export async function gerarSugestoesAgora(): Promise<{
  sucesso: boolean
  sugestao_id?: string
  atualizado?: boolean
  total_sementes?: number
  total_maduras?: number
  total_sugestoes?: number
}> {
  const res = await fetch(`${BASE}/gerar`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify({}),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.error || 'Falha ao caçar sementes maduras.')
  }
  return await res.json()
}

/** Seção "Oportunidades do Caçador" para o Resumo do Dia (GET /oportunidades). */
export async function listarOportunidadesCacador(
  data?: string,
): Promise<OportunidadesCacador | null> {
  try {
    const qs = data ? `?data=${encodeURIComponent(data)}` : ''
    const res = await fetch(`${BASE}/oportunidades${qs}`, { headers: authHeaders() })
    if (!res.ok) return null
    const json = await res.json()
    return parseOportunidadesCacador(json)
  } catch {
    return null
  }
}
