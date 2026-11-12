// Chat interno (coleções chat_mensagens e chat_grupos) — mensagens persistidas
// no banco, visibilidade garantida pelas regras das coleções (1-a-1: só
// remetente/destinatário; grupo: só membros) e reforçada por filtros no
// carregamento. Suporta anexos (campo file "anexo") e grupos de conversa.
import pb from '@/lib/pocketbase/client'
import type { ChatMensagem, ChatConversaResumo, ChatGrupo, ColaboradorChat } from '@/types'

const COLECAO = 'chat_mensagens'
const COLECAO_GRUPOS = 'chat_grupos'

interface OpcoesListar {
  limite?: number
  page?: number
}

function urlAnexo(m: ChatMensagem): string | null {
  if (!m.anexo) return null
  return pb.files.getURL(
    m as unknown as { id: string; collectionId?: string; collectionName?: string },
    m.anexo,
  )
}

/** Nome do arquivo anexado à mensagem (campo anexo). */
export function nomeDoAnexo(m: ChatMensagem): string {
  return m.anexo || ''
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

/** Mensagens de um grupo (regras da coleção garantem que sou membro). */
export async function listarMensagensGrupo(
  grupoId: string,
  { limite = 200, page = 1 }: OpcoesListar = {},
): Promise<ChatMensagem[]> {
  const res = await pb.collection(COLECAO).getList<ChatMensagem>(page, limite, {
    filter: `grupo = "${grupoId}"`,
    sort: 'created',
  })
  return res.items
}

/** Nome de exibição de uma mensagem para quem não é o remetente (grupo). */
export function autorNome(m: ChatMensagem): string | null {
  const nome = m.expand?.remetente?.name
  return m.expand?.remetente && nome ? nome : null
}

/** URL pública do anexo da mensagem (imagem/preview ou download). */
export function urlDoAnexo(m: ChatMensagem): string | null {
  return urlAnexo(m)
}

/**
 * Agrupa as minhas mensagens por interlocutor (conversa individual) ou por
 * grupo de chat. Grupos vazios (sem mensagem ainda) entram com os campos
 * zerados, para aparecer na lista assim que criados.
 */
export function agruparConversas(
  mensagens: ChatMensagem[],
  meuId: string,
  grupos: ChatGrupo[] = [],
): ChatConversaResumo[] {
  const mapa = new Map<string, ChatConversaResumo>()

  for (const g of grupos) {
    mapa.set(`g:${g.id}`, {
      grupo_id: g.id,
      eh_grupo: true,
      nome: g.nome,
      ultima: '',
      ultima_criada_em: g.created,
      ultima_propria: false,
      nao_lidas: 0,
    })
  }

  for (const m of mensagens) {
    if (m.grupo) {
      const g = grupos.find((x) => x.id === m.grupo)
      if (!g) continue // não sou membro (regra do banco já deveria ter filtrado)
      const chave = `g:${m.grupo}`
      const atual = mapa.get(chave)
      const naoLida = m.remetente !== meuId && !m.lida_em
      if (!atual) {
        mapa.set(chave, {
          grupo_id: m.grupo,
          eh_grupo: true,
          nome: g.nome,
          ultima: m.texto,
          ultima_criada_em: m.created,
          ultima_propria: m.remetente === meuId,
          nao_lidas: naoLida ? 1 : 0,
          tem_anexo: !!m.anexo,
          nomes_anexos: m.anexo ? [m.anexo] : [],
        })
        continue
      }
      if (m.anexo) {
        atual.tem_anexo = true
        if (atual.nomes_anexos && !atual.nomes_anexos.includes(m.anexo)) {
          atual.nomes_anexos.push(m.anexo)
        }
      }
      if (m.created > atual.ultima_criada_em) {
        atual.ultima = m.texto
        atual.ultima_criada_em = m.created
        atual.ultima_propria = m.remetente === meuId
      }
      if (naoLida) atual.nao_lidas += 1
      continue
    }

    const outro = m.remetente === meuId ? m.destinatario : m.remetente
    if (!outro) continue
    const atual = mapa.get(`u:${outro}`)
    const naoLida = m.destinatario === meuId && !m.lida_em
    if (!atual) {
      mapa.set(`u:${outro}`, {
        usuario_id: outro,
        eh_grupo: false,
        nome: '',
        ultima: m.texto,
        ultima_criada_em: m.created,
        ultima_propria: m.remetente === meuId,
        nao_lidas: naoLida ? 1 : 0,
        tem_anexo: !!m.anexo,
        nomes_anexos: m.anexo ? [m.anexo] : [],
      })
      continue
    }
    if (m.anexo) {
      atual.tem_anexo = true
      if (atual.nomes_anexos && !atual.nomes_anexos.includes(m.anexo)) {
        atual.nomes_anexos.push(m.anexo)
      }
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

/** Lista de conversas (resumo por interlocutor ou grupo), ordenada pela mais recente. */
export async function listarConversas(meuId: string): Promise<ChatConversaResumo[]> {
  const [resMensagens, resGrupos] = await Promise.all([
    pb.collection(COLECAO).getList<ChatMensagem>(1, 300, {
      filter: `remetente = "${meuId}" || destinatario = "${meuId}" || grupo.membros.id ?= "${meuId}"`,
      sort: '-created',
    }),
    listarGruposDoUsuario(),
  ])
  return agruparConversas(resMensagens.items, meuId, resGrupos).sort((a, b) =>
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

/**
 * Envia mensagem com anexo (imagem, PDF, documento). O texto é opcional
 * quando há arquivo. O anexo é enviado junto (FormData) para o campo file.
 */
export async function enviarMensagemComAnexo(dados: {
  remetenteId: string
  destinatarioId?: string
  grupoId?: string
  texto: string
  arquivo: File
}): Promise<ChatMensagem> {
  const form = new FormData()
  form.append('remetente', dados.remetenteId)
  if (dados.destinatarioId) form.append('destinatario', dados.destinatarioId)
  if (dados.grupoId) form.append('grupo', dados.grupoId)
  form.append('texto', dados.texto)
  form.append('anexo', dados.arquivo)
  return pb.collection(COLECAO).create<ChatMensagem>(form)
}

/** Envia mensagem para um grupo (regras exigem ser membro). */
export async function enviarMensagemGrupo(remetenteId: string, grupoId: string, texto: string) {
  const rec = await pb.collection(COLECAO).create<ChatMensagem>({
    remetente: remetenteId,
    grupo: grupoId,
    texto,
    lida_em: null,
  })
  return rec
}

/** Marca como lidas as mensagens recebidas do interlocutor (conversa 1-a-1). */
export async function marcarConversaLida(meuId: string, outroId: string): Promise<ChatMensagem[]> {
  const res = await pb.collection(COLECAO).getFullList<ChatMensagem>({
    filter: `destinatario = "${meuId}" && remetente = "${outroId}" && lida_em = null`,
    fields: 'id',
  })
  return marcarLidasEm(res)
}

/** Marca como lidas todas as mensagens de um grupo em que sou o remetente não. */
export async function marcarGrupoLido(meuId: string, grupoId: string): Promise<ChatMensagem[]> {
  const res = await pb.collection(COLECAO).getFullList<ChatMensagem>({
    filter: `grupo = "${grupoId}" && remetente != "${meuId}" && lida_em = null`,
    fields: 'id',
  })
  return marcarLidasEm(res)
}

async function marcarLidasEm(mensagens: { id: string }[]): Promise<ChatMensagem[]> {
  if (mensagens.length === 0) return []
  const agora = new Date().toISOString().replace('T', ' ')
  return Promise.all(
    mensagens.map((m) => pb.collection(COLECAO).update<ChatMensagem>(m.id, { lida_em: agora })),
  )
}

/** Total de mensagens NÃO lidas destinadas a mim (individual + grupos) para badges. */
export async function contarNaoLidas(meuId: string): Promise<number> {
  const res = await pb.collection(COLECAO).getList<ChatMensagem>(1, 1, {
    filter: `(destinatario = "${meuId}" || grupo.membros.id ?= "${meuId}") && remetente != "${meuId}" && lida_em = null`,
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

/** Lista de grupos de chat dos quais faço parte (membro ou criador). */
export async function listarGruposDoUsuario(): Promise<ChatGrupo[]> {
  try {
    return await pb.collection(COLECAO_GRUPOS).getFullList<ChatGrupo>({
      sort: '-created',
      expand: 'membros,criado_por',
    })
  } catch {
    return []
  }
}

/** Cria um grupo de trabalho/conversa com nome, descrição e membros. */
export async function criarGrupo(dados: {
  nome: string
  descricao?: string
  criadoPorId: string
  membrosIds: string[]
}): Promise<ChatGrupo> {
  return pb.collection(COLECAO_GRUPOS).create<ChatGrupo>({
    nome: dados.nome,
    descricao: dados.descricao || '',
    criado_por: dados.criadoPorId,
    membros: dados.membrosIds,
  })
}

/** Atualiza um grupo que eu criei (nome, descrição, membros). */
export async function atualizarGrupo(
  grupoId: string,
  dados: { nome?: string; descricao?: string; membros?: string[] },
): Promise<ChatGrupo> {
  return pb.collection(COLECAO_GRUPOS).update<ChatGrupo>(grupoId, dados)
}

/** Exclui um grupo que eu criei (mensagens caem junto — cascadeDelete). */
export async function excluirGrupo(grupoId: string): Promise<void> {
  await pb.collection(COLECAO_GRUPOS).delete(grupoId)
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

/** Ids dos membros de um grupo, para expandir depois (números dos participantes). */
export function membrosDoGrupo(g: ChatGrupo): string[] {
  return Array.isArray(g.membros) ? g.membros : []
}
