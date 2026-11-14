// Serviço do "Caçador de Sementes" — Diamantina (agente nativo 'diamantina-cacador-sementes').
// Lê a coleção sugestoes_sementes (migration 1762800021/0022) e aciona a caçada
// sob demanda via POST /backend/v1/cacador-sementes/gerar — mesmo padrão do
// gerarResumoDia em src/services/diamondApi.ts (fetch com Authorization no token
// do pb.authStore, nunca $http).
import pb from '@/lib/pocketbase/client'

/** Uma sugestão de germinação devolvida pelo agente (json sugestoes). */
export interface SugestaoGerminacao {
  folha_id?: string
  tese?: string
  motivo?: string
  titulo_card_sugerido?: string
  prioridade?: string
}

/** Registro do dia na coleção sugestoes_sementes (um por usuário/data). */
export interface SugestoesSementeDia {
  id: string
  usuario: string
  data_geracao: string
  sugestoes?: SugestaoGerminacao[] | string | null
  mensagem_vazia?: string
  total_sementes?: number
  total_maduras?: number
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

/** Lista o histórico recente de caçadas (dias anteriores), paginado. */
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
    headers: {
      'Content-Type': 'application/json',
      Authorization: pb.authStore.token,
    },
    body: JSON.stringify({}),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.error || 'Falha ao caçar sementes maduras.')
  }
  return await res.json()
}
