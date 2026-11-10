// Serviço da Timeline dos cards (eventos_card) + Tarefas do card (tarefas_card).
// Modelo Ummense: anotações com menções @, eventos de sistema, feed cronológico.
import pb from '@/lib/pocketbase/client'
import type { Contato, MembroEquipe, User } from '@/types'

export type TipoEventoCard = 'anotacao' | 'sistema' | 'movimento' | 'membro' | 'tarefa'

export interface EventoCard {
  id: string
  card: string
  tipo_evento: TipoEventoCard
  texto?: string
  autor: string
  dados?: Record<string, unknown> | null
  created: string
  updated: string
  expand?: {
    autor?: User
    card?: { id: string; titulo: string }
  }
}

export interface TarefaCard {
  id: string
  card: string
  titulo: string
  concluida?: boolean
  descricao?: string
  data_limite?: string
  responsavel?: string
  criado_por?: string
  ordem?: number
  created: string
  updated: string
  expand?: {
    responsavel?: User
    criado_por?: User
  }
}

export type AbaTimeline = 'todos' | 'anotacoes' | 'minhas' | 'registros'

export const ROTULOS_ABA_TIMELINE: Record<AbaTimeline, string> = {
  todos: 'TODOS',
  anotacoes: 'ANOTAÇÕES',
  minhas: 'MINHAS ANOTAÇÕES',
  registros: 'REGISTROS',
}

// ---------- Ajustes de textos dos eventos (texto já salvo no banco) ----------

function pegaNomesDoDados(
  dados: Record<string, unknown> | null | undefined,
  fallback: string,
): { nomeFluxo: string; nomeColuna: string } {
  const nomeFluxo = (dados?.fluxo_nome as string) || fallback
  const nomeColuna = (dados?.coluna_nome as string) || ''
  return { nomeFluxo, nomeColuna }
}

/** Texto canônico de um evento de movimento de coluna — usado ao criar e ao renderizar. */
export function textoEventoMovimento(
  dados: Record<string, unknown> | null | undefined,
  fallbackFluxo: string,
): string {
  const { nomeFluxo, nomeColuna } = pegaNomesDoDados(dados, fallbackFluxo)
  if (!nomeColuna) return ''
  return `Adicionou o card ao fluxo ${nomeFluxo} na coluna ${nomeColuna}.`
}

/** Texto canônico de um evento de membro adicionado à equipe do card. */
export function textoEventoMembro(nomeMembro: string): string {
  return `Adicionou ${nomeMembro} na equipe do card.`
}

/** Texto canônico do evento de criação do card. */
export function textoEventoCriacao(): string {
  return 'Criou o card.'
}

/** Texto canônico do evento de tarefa criada. */
export function textoEventoTarefa(tituloTarefa: string): string {
  return `Adicionou a tarefa "${tituloTarefa}".`
}

// ---------- API eventos ----------

export async function listarEventosCard(cardId: string): Promise<EventoCard[]> {
  try {
    return await pb.collection('eventos_card').getFullList<EventoCard>({
      filter: `card = "${cardId}"`,
      sort: '-created',
      expand: 'autor',
    })
  } catch {
    return []
  }
}

export async function criarEventoCard(
  cardId: string,
  tipoEvento: TipoEventoCard,
  texto: string,
  dados?: Record<string, unknown>,
): Promise<void> {
  try {
    await pb.collection('eventos_card').create({
      card: cardId,
      tipo_evento: tipoEvento,
      texto,
      autor: pb.authStore.record?.id,
      dados: dados ? JSON.stringify(dados) : undefined,
    })
  } catch (err) {
    // Best-effort: a timeline não deve bloquear a ação principal do usuário
    console.error('Erro ao registrar evento do card:', err)
  }
}

export async function criarAnotacaoCard(
  cardId: string,
  texto: string,
  dados?: Record<string, unknown>,
): Promise<EventoCard | null> {
  try {
    const rec = await pb.collection('eventos_card').create<EventoCard>({
      card: cardId,
      tipo_evento: 'anotacao',
      texto,
      autor: pb.authStore.record?.id,
      dados: dados ? JSON.stringify(dados) : undefined,
    })
    return rec
  } catch (err) {
    console.error('Erro ao salvar anotação:', err)
    return null
  }
}

export async function excluirEventoCard(id: string): Promise<boolean> {
  try {
    await pb.collection('eventos_card').delete(id)
    return true
  } catch {
    return false
  }
}

// ---------- API tarefas do card ----------

export async function listarTarefasCard(cardId: string): Promise<TarefaCard[]> {
  try {
    return await pb.collection('tarefas_card').getFullList<TarefaCard>({
      filter: `card = "${cardId}"`,
      sort: 'created',
      expand: 'responsavel,criado_por',
    })
  } catch {
    return []
  }
}

export async function criarTarefaCard(
  cardId: string,
  titulo: string,
  extras?: { descricao?: string; data_limite?: string; responsavel?: string },
): Promise<TarefaCard | null> {
  try {
    return await pb.collection('tarefas_card').create<TarefaCard>({
      card: cardId,
      titulo,
      concluida: false,
      descricao: extras?.descricao || undefined,
      data_limite: extras?.data_limite || undefined,
      responsavel: extras?.responsavel || undefined,
      criado_por: pb.authStore.record?.id,
    })
  } catch (err) {
    console.error('Erro ao criar tarefa do card:', err)
    return null
  }
}

export async function atualizarTarefaCard(
  id: string,
  data: Partial<TarefaCard>,
): Promise<TarefaCard | null> {
  try {
    return await pb.collection('tarefas_card').update<TarefaCard>(id, data)
  } catch (err) {
    console.error('Erro ao atualizar tarefa do card:', err)
    return null
  }
}

export async function excluirTarefaCard(id: string): Promise<boolean> {
  try {
    await pb.collection('tarefas_card').delete(id)
    return true
  } catch {
    return false
  }
}

// ---------- Tempo relativo em pt-BR ----------

/** "há poucos segundos", "há X min", "há X horas", ontem, data completa. */
export function tempoRelativoPtBr(dataISO: string): string {
  const data = new Date(dataISO)
  const agora = new Date()
  const diffMs = agora.getTime() - data.getTime()
  const minutos = Math.floor(diffMs / 60000)

  if (minutos < 1) return 'há poucos segundos'
  if (minutos < 60) return `há ${minutos} min`

  const horas = Math.floor(minutos / 60)
  if (horas < 24) return `há ${horas} ${horas === 1 ? 'hora' : 'horas'}`

  const dias = Math.floor(horas / 24)
  if (dias === 1) return 'ontem'
  if (dias <= 7) return `há ${dias} dias`

  const mesmaSemana = dias <= 7
  const opcoes: Intl.DateTimeFormatOptions =
    dias > 60 || data.getFullYear() !== agora.getFullYear()
      ? { day: '2-digit', month: '2-digit', year: 'numeric' }
      : mesmaSemana
        ? { weekday: 'short', day: '2-digit', month: '2-digit' }
        : { day: '2-digit', month: '2-digit' }
  return data.toLocaleDateString('pt-BR', opcoes)
}

// ---------- Menções @ (usuário / equipe) ----------

export interface OpcaoMencao {
  id: string
  tipo: 'usuario' | 'equipe'
  nome: string
  email?: string
}

/** Nome principal de exibição de um membro (ou e-mail como fallback). */
export function nomeMembro(m?: MembroEquipe | null): string {
  return m?.nome || m?.expand?.usuario?.name || m?.email || 'Membro'
}

/** Nome do usuário logado. */
export function meuNome(user?: User | null): string {
  return user?.name || user?.email || 'Você'
}

/** Iniciais para avatar fallback. */
export function iniciais(nome: string): string {
  return (
    nome
      .split(' ')
      .filter(Boolean)
      .slice(0, 2)
      .map((n) => n[0]?.toUpperCase())
      .join('') || '?'
  )
}

/** Filtra contatos por nome ou e-mail (busca da seção de contatos vinculados). */
export function filtrarContatosPorBusca(contatos: Contato[], busca: string): Contato[] {
  const q = busca.trim().toLowerCase()
  if (!q) return contatos
  return contatos.filter(
    (c) => c.nome?.toLowerCase().includes(q) || (c.email || '').toLowerCase().includes(q),
  )
}
