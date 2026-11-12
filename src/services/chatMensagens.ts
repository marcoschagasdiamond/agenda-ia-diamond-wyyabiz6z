// Chat interno (coleção chat_mensagens) — mensagens persistidas no banco,
// visibilidade garantida pelas regras da coleção (só remetente/destinatário)
// e reforçada por filtros no carregamento.
import pb from '@/lib/pocketbase/client'
import type { ChatMensagem, ChatConversaResumo, ColaboradorChat } from '@/types'

const COLECAO = 'chat_mensagens'

interface OpcoesListar {
  limite?: number
  page?: number
}

/** Mensagens trocadas com um colaborador (meu par = remetente ou destinatário). */
export async function listarMensagensCom(
  meuId: string,
  outroId: string,
  { limite = 200, page = 1 }: OpcoesListar = {},
): Promise<ChatMensagem[]> {
  const filtro = `(remetente = "${meuId}" && destinatario = "${outroId}") || (remetente = "${outroId}" && destinatario = "${meuId}")`
  const res = await pb
    .collection(COLECAO)
    .getList<ChatMensagem>(page, limite, { filter: filtro, sort: 'created' })
  return res.items
}

/**
 * Agrupa as minhas mensagens por interlocutor (conversa). Como o filtro do
 * banco já restringe a remetente/destinatário, aqui é só organização.
 */
export function agruparConversas(mensagens: ChatMensagem[], meuId: string): ChatConversaResumo[] {
  const mapa = new Map<string, ChatConversaResumo>()
  for (const m of mensagens) {
    const outro = m.remetente === meuId ? m.destinatario : m.remetente
    const atual = mapa.get(outro)
    const naoLida = m.destinatario === meuId && !m.lida_em
    if (!atual) {
      mapa.set(outro, {
        usuario_id: outro,
        ultima: m.texto,
        ultima_criada_em: m.created,
        ultima_propria: m.remetente === meuId,
        nao_lidas: naoLida ? 1 : 0,
      })
      continue
    }
    if (m.created > atual.ultima_criada_em) {
      atual.ultima = m.texto
      atual.ultima_criada_em = m.created
      atual.ultima_propria = m.remetente === meuId
    }
    if (naoLida) atual.nao_lidas += 1
  }
  return Array.from(mapa.values())
}

/** Lista de conversas (resumo por interlocutor), ordenada pela mais recente. */
export async function listarConversas(meuId: string): Promise<ChatConversaResumo[]> {
  const res = await pb.collection(COLECAO).getList<ChatMensagem>(1, 300, {
    filter: `remetente = "${meuId}" || destinatario = "${meuId}"`,
    sort: '-created',
  })
  return agruparConversas(res.items, meuId).sort((a, b) =>
    a.ultima_criada_em < b.ultima_criada_em ? 1 : -1,
  )
}

export async function enviarMensagem(remetenteId: string, destinatarioId: string, texto: string) {
  const rec = await pb.collection(COLECAO).create<ChatMensagem>({
    remetente: remetenteId,
    destinatario: destinatarioId,
    texto,
    lida_em: null,
  })
  return rec
}

/** Marca todas as mensagens recebidas do interlocutor como lidas (agora). */
export async function marcarConversaLida(meuId: string, outroId: string): Promise<ChatMensagem[]> {
  const res = await pb.collection(COLECAO).getFullList<ChatMensagem>({
    filter: `destinatario = "${meuId}" && remetente = "${outroId}" && lida_em = null`,
    fields: 'id',
  })
  if (res.length === 0) return []
  const agora = new Date().toISOString().replace('T', ' ')
  return Promise.all(
    res.map((m) => pb.collection(COLECAO).update<ChatMensagem>(m.id, { lida_em: agora })),
  )
}

/** Total de mensagens NÃO lidas destinadas a mim (badge do menu lateral). */
export async function contarNaoLidas(meuId: string): Promise<number> {
  const res = await pb.collection(COLECAO).getList<ChatMensagem>(1, 1, {
    filter: `destinatario = "${meuId}" && lida_em = null`,
  })
  return res.totalItems
}

/** Mensagens recebidas e não lidas, para contar por conversa no badge da lista. */
export async function listarIdsNaoLidasPorContato(meuId: string): Promise<string[]> {
  const res = await pb.collection(COLECAO).getFullList<ChatMensagem>({
    filter: `destinatario = "${meuId}" && lida_em = null`,
    fields: 'remetente',
  })
  return res.map((m) => m.remetente)
}

/** Nome e telefone do colaborador no cadastro da equipe (para WhatsApp). */
export async function telefoneDoColaborador(userId: string): Promise<string> {
  try {
    const m = await pb.collection('membros_equipe').getFirstListItem(`usuario = "${userId}"`)
    return typeof m.telefone === 'string' ? m.telefone : ''
  } catch {
    return ''
  }
}

/** Lista de colaboradores ativos (id, nome, email, telefone) para o chat. */
export async function listarColaboradores(): Promise<ColaboradorChat[]> {
  const res = await pb.collection('membros_equipe').getFullList({
    filter: `status = "ativo"`,
    sort: 'nome',
  })
  return res
    .filter((m) => !!m.usuario)
    .map((m) => ({
      id: String(m.usuario),
      nome: (m.nome as string) || (m.email as string),
      email: String(m.email),
      telefone: (m.telefone as string) || '',
    }))
}
