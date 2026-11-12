// Chat interno estilo WhatsApp entre colaboradores da conta.
// Lista de conversas à esquerda (individuais + grupos), balões à direita,
// anexos (com filtro "só com anexo" e busca por nome de arquivo), busca/abas,
// envio real pelo conector WhatsApp (conta do usuário) e organização de
// mensagem (criar card, enviar para fluxo em cascata, enviar a projeto).
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Send,
  MessageCircle,
  Search,
  ArrowLeft,
  Users,
  Paperclip,
  X,
  FileText,
  Volume2,
  VolumeX,
  Plus,
  Phone,
  Paperclip as IconeAnexoFiltro,
} from 'lucide-react'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { useToast } from '@/hooks/use-toast'
import { ConnectorButton } from '@/components/skip/ConnectorButton'
import { execute } from '@/lib/skipConnectors'
import pb from '@/lib/pocketbase/client'
import { useAuth } from '@/hooks/use-auth'
import { useNavegacao } from '@/contexts/NavegacaoContext'
import { diamondApi } from '@/services/diamondApi'
import { cn } from '@/lib/utils'
import { alternarMudo, estaMudo, tocarSomMensagem } from '@/lib/somNotificacao'
import ModalNovoGrupoChat from '@/components/chat/ModalNovoGrupoChat'
import ModalCriarCardMensagem, {
  type DestinoCardFluxo,
} from '@/components/chat/ModalCriarCardMensagem'
import ModalEnviarProjeto from '@/components/chat/ModalEnviarProjeto'
import { BalaoMensagem, ehImagem } from '@/components/chat/BalaoMensagem'
import type { AlvoConversa, AbaConversas } from '@/components/chat/tiposChat'
import type { DestinoMoverCategoria } from '@/components/fluxo/CardKanbanDiamond'
import type { Card } from '@/types'
import {
  listarMensagensCom,
  listarMensagensGrupo,
  listarConversas,
  enviarMensagem,
  enviarMensagemGrupo,
  enviarMensagemComAnexo,
  marcarConversaLida,
  marcarGrupoLido,
  listarColaboradores,
  listarGruposDoUsuario,
  telefoneDoColaborador,
} from '@/services/chatMensagens'
import type { ChatMensagem, ChatConversaResumo, ChatGrupo, ColaboradorChat } from '@/types'

function iniciais(nome: string): string {
  const partes = nome.trim().split(/\s+/)
  return partes.length >= 2
    ? (partes[0][0] + partes[partes.length - 1][0]).toUpperCase()
    : nome.slice(0, 2).toUpperCase()
}

function horaCurta(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  const hoje = new Date()
  const mesmoDia = d.toDateString() === hoje.toDateString()
  const hora = d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
  if (mesmoDia) return hora
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }) + ' ' + hora
}

export default function Chat() {
  const { user } = useAuth()
  const meuId = user?.id ?? ''
  const navigate = useNavigate()
  const { toast } = useToast()
  const nav = useNavegacao()
  // Conversa aberta compartilhada com a coluna contextual (NavContextColumn)
  const { chatAlvo, setChatAlvo, colunaSecundariaAberta } = nav
  const alvo = chatAlvo
  const setAlvo = setChatAlvo

  const [conversas, setConversas] = useState<ChatConversaResumo[]>([])
  const [grupos, setGrupos] = useState<ChatGrupo[]>([])
  const [colaboradores, setColaboradores] = useState<ColaboradorChat[]>([])
  const [telefone, setTelefone] = useState('')
  const [mensagens, setMensagens] = useState<ChatMensagem[]>([])
  const [rascunho, setRascunho] = useState('')
  const [busca, setBusca] = useState('')
  const [aba, setAba] = useState<AbaConversas>('todas')
  const [soComAnexo, setSoComAnexo] = useState(false)
  const [enviando, setEnviando] = useState(false)
  const [carregando, setCarregando] = useState(true)
  const [whatsappEstado, setWhatsappEstado] = useState<'idle' | 'enviando' | 'ok' | 'erro'>('idle')
  const [whatsappErro, setWhatsappErro] = useState<string | null>(null)

  // Anexo selecionado (ainda não enviado)
  const inputArquivoRef = useRef<HTMLInputElement>(null)
  const [arquivo, setArquivo] = useState<File | null>(null)

  // Modal de novo grupo
  const [modalGrupoAberto, setModalGrupoAberto] = useState(false)

  // Som
  const [mudo, setMudo] = useState(estaMudo())

  // Organização de mensagem (criar card / enviar a projeto)
  const [mensagemOrganizar, setMensagemOrganizar] = useState<ChatMensagem | null>(null)
  const [modalCardAberto, setModalCardAberto] = useState(false)
  const [modalProjetoAberto, setModalProjetoAberto] = useState(false)
  const [criandoCard, setCriandoCard] = useState(false)

  const fimRef = useRef<HTMLDivElement>(null)

  const nomeDe = useCallback(
    (id: string) => colaboradores.find((c) => c.id === id)?.nome || 'Colaborador',
    [colaboradores],
  )

  // Colaboradores (destinatários possíveis) + grupos
  useEffect(() => {
    if (!meuId) return
    let vivo = true
    listarColaboradores()
      .then((lista) => {
        if (vivo) setColaboradores(lista.filter((c) => c.id !== meuId))
      })
      .catch(() => undefined)
    listarGruposDoUsuario()
      .then((gs) => {
        if (vivo) setGrupos(gs)
      })
      .catch(() => undefined)
    return () => {
      vivo = false
    }
  }, [meuId])

  const atualizarConversas = useCallback(async () => {
    if (!meuId) return
    try {
      const [lista, gs] = await Promise.all([listarConversas(meuId), listarGruposDoUsuario()])
      setConversas(lista)
      setGrupos(gs)
    } catch {
      // silencioso
    }
  }, [meuId])

  useEffect(() => {
    if (!meuId) return
    atualizarConversas().finally(() => setCarregando(false))
    const interval = window.setInterval(atualizarConversas, 5000)
    return () => window.clearInterval(interval)
  }, [meuId, atualizarConversas])

  // Mensagens da conversa aberta
  const atualizarMensagens = useCallback(async () => {
    if (!meuId || !alvo) return
    try {
      const lista =
        alvo.tipo === 'grupo'
          ? await listarMensagensGrupo(alvo.id)
          : await listarMensagensCom(meuId, alvo.id)
      setMensagens(lista)
    } catch {
      // silencioso
    }
  }, [meuId, alvo])

  useEffect(() => {
    if (!meuId || !alvo) {
      setMensagens([])
      return
    }
    atualizarMensagens()
    // Marca como lida ao abrir a conversa
    const marcar =
      alvo.tipo === 'grupo' ? marcarGrupoLido(meuId, alvo.id) : marcarConversaLida(meuId, alvo.id)
    marcar.then(() => atualizarConversas()).catch(() => undefined)
    const interval = window.setInterval(atualizarMensagens, 4000)
    return () => window.clearInterval(interval)
  }, [meuId, alvo, atualizarMensagens, atualizarConversas])

  // Som de notificação: checa a cada 4s se chegou mensagem nova (últimos 20s),
  // que eu não tenha enviado; se a conversa em que ela chegou está aberta,
  // não toca (ela está sendo marcada como lida).
  const refMensagens = useRef(mensagens)
  refMensagens.current = mensagens
  const alvoRef = useRef(alvo)
  alvoRef.current = alvo

  const checarNovidadeParaSom = useCallback(async () => {
    if (!meuId || estaMudo()) return
    try {
      const filtro = `(destinatario = "${meuId}" || grupo.membros.id ?= "${meuId}") && remetente != "${meuId}" && lida_em = null`
      const res = await pb.collection('chat_mensagens').getList<ChatMensagem>(1, 1, {
        filter: filtro,
        sort: '-created',
        fields: 'id,created,remetente,destinatario,grupo',
      })
      const ultima = res.items[0]
      if (!ultima) return
      const criada = new Date(ultima.created).getTime()
      if (Number.isNaN(criada) || Date.now() - criada > 20000) return
      // A conversa em que ela chegou está aberta em foco? Não toca.
      const alvoAberto = alvoRef.current
      if (alvoAberto) {
        const chegouNaAberta =
          alvoAberto.tipo === 'grupo'
            ? ultima.grupo === alvoAberto.id
            : !ultima.grupo &&
              (ultima.destinatario === alvoAberto.id || ultima.remetente === alvoAberto.id)
        if (chegouNaAberta) return
      }
      // Já está renderizada em tela? Não toca de novo.
      if (refMensagens.current.some((m) => m.id === ultima.id)) return
      tocarSomMensagem()
    } catch {
      // silencioso
    }
  }, [meuId])

  useEffect(() => {
    if (!meuId) return
    const interval = window.setInterval(() => void checarNovidadeParaSom(), 4000)
    return () => window.clearInterval(interval)
  }, [meuId, checarNovidadeParaSom])

  // Telefone do colaborador no cadastro da equipe (para WhatsApp real)
  useEffect(() => {
    setWhatsappEstado('idle')
    setWhatsappErro(null)
    if (!alvo || alvo.tipo !== 'individual') {
      setTelefone('')
      return
    }
    let vivo = true
    telefoneDoColaborador(alvo.id).then((tel) => {
      if (vivo) setTelefone(tel)
    })
    return () => {
      vivo = false
    }
  }, [alvo])

  // Rola para a última mensagem
  useEffect(() => {
    fimRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [mensagens.length])

  async function enviar(e?: React.FormEvent) {
    e?.preventDefault()
    const texto = rascunho.trim()
    if (!meuId || !alvo || (!texto && !arquivo) || enviando) return
    setEnviando(true)
    const rascunhoEnviado = texto
    const arquivoEnviado = arquivo
    setRascunho('')
    setArquivo(null)
    try {
      if (arquivoEnviado) {
        await enviarMensagemComAnexo({
          remetenteId: meuId,
          destinatarioId: alvo.tipo === 'individual' ? alvo.id : undefined,
          grupoId: alvo.tipo === 'grupo' ? alvo.id : undefined,
          texto,
          arquivo: arquivoEnviado,
        })
      } else if (alvo.tipo === 'grupo') {
        await enviarMensagemGrupo(meuId, alvo.id, texto)
      } else {
        await enviarMensagem(meuId, alvo.id, texto)
      }
      await atualizarMensagens()
      await atualizarConversas()
    } catch {
      setRascunho(rascunhoEnviado)
      setArquivo(arquivoEnviado)
    } finally {
      setEnviando(false)
    }
  }

  async function transmitirWhatsapp(texto: string, numero: string, rotuloAcao: string) {
    setWhatsappEstado('enviando')
    setWhatsappErro(null)
    try {
      const res = await execute('WHATSAPP_SEND_MESSAGE', {
        text: texto,
        to_number: numero,
        phone_number_id: '',
      })
      if (res.successful) {
        setWhatsappEstado('ok')
        return true
      }
      setWhatsappEstado('erro')
      setWhatsappErro(res.error || `Falha ao ${rotuloAcao} pelo WhatsApp.`)
      return false
    } catch (err) {
      setWhatsappEstado('erro')
      setWhatsappErro(
        err instanceof Error
          ? err.message
          : `Falha ao ${rotuloAcao} pelo WhatsApp. Verifique se sua conta está conectada.`,
      )
      return false
    }
  }

  /** Envio real pelo conector WhatsApp da conta do próprio usuário. */
  async function enviarWhatsapp() {
    if (!alvo || alvo.tipo !== 'individual' || !rascunho.trim()) return
    if (!telefone.trim()) {
      setWhatsappEstado('erro')
      setWhatsappErro(
        `${alvo.nome} não tem número de telefone cadastrado na equipe. Cadastre o telefone em Equipe para enviar por WhatsApp.`,
      )
      return
    }
    const ok = await transmitirWhatsapp(rascunho.trim(), telefone, 'enviar')
    if (ok) setRascunho('')
  }

  /**
   * "Chamar no WhatsApp": abre a conversa real enviando a primeira mensagem
   * pelo conector (mesmo mecanismo do "Enviar por WhatsApp"). Bloqueado com
   * aviso quando o colaborador não tem telefone em membros_equipe.telefone.
   */
  async function chamarNoWhatsapp() {
    if (!alvo || alvo.tipo !== 'individual') return
    if (!telefone.trim()) {
      setWhatsappEstado('erro')
      setWhatsappErro(
        `${alvo.nome} não tem número de telefone cadastrado na equipe. Cadastre o telefone em Equipe para chamar no WhatsApp.`,
      )
      return
    }
    const ok = await transmitirWhatsapp(
      `Olá, ${alvo.nome}! Falando pelo chat interno do Agenda IA Diamond.`,
      telefone,
      'chamar',
    )
    if (ok) {
      toast({
        title: 'Chamada enviada',
        description: `Mensagem de abertura enviada para ${telefone}.`,
      })
    }
  }

  // ==========================================================================
  // Organização de mensagem: criar card / enviar para fluxo / enviar a projeto
  // ==========================================================================

  /** Cascata categoria → fluxo → coluna (mesmo padrão do "Mover para" do /fluxo). */
  const destinosFluxo = useMemo<DestinoMoverCategoria[]>(
    () =>
      nav.categoriasComFluxos
        .map((cat) => ({
          id: cat.id,
          nome: cat.nome,
          fluxos: cat.fluxos
            .map((fl) => ({
              id: fl.id,
              nome: fl.nome || fl.titulo || 'Fluxo',
              colunas: nav.colunas
                .filter((c) => c.fluxo_id === fl.id)
                .sort((a, b) => (a.ordem ?? 0) - (b.ordem ?? 0)),
            }))
            .filter((fl) => fl.colunas.length > 0),
        }))
        .filter((cat) => cat.fluxos.length > 0),
    [nav.categoriasComFluxos, nav.colunas],
  )

  const projetos = nav.projetos

  /** Primeira linha da mensagem vira título do card. */
  function tituloDaMensagem(texto: string): string {
    const linha = texto.trim().split('\n')[0] || ''
    return linha.slice(0, 120)
  }

  async function criarCard(payload: Partial<Card>, mensagemOk: string) {
    try {
      await diamondApi.createCard(payload)
      toast({ title: mensagemOk })
    } catch (err) {
      toast({
        title: 'Erro ao criar card',
        description: err instanceof Error ? err.message : undefined,
        variant: 'destructive',
      })
    }
  }

  /**
   * "Criar demanda/card": card novo com o texto da mensagem preenchido.
   * Quando um destino é escolhido no modal (categoria → fluxo → coluna), o
   * card nasce gravando fluxo_id E status juntos — nunca card órfão de coluna.
   */
  async function confirmarCriarCard(
    titulo: string,
    descricao: string,
    destino: DestinoCardFluxo | null,
  ) {
    if (!mensagemOrganizar || !titulo) return
    setCriandoCard(true)
    await criarCard(
      {
        titulo,
        descricao,
        ...(destino ? { fluxo_id: destino.fluxoId, status: destino.colunaChave } : {}),
      },
      destino
        ? `Card criado em "${destino.colunaTitulo}"! Veja no painel Fluxo.`
        : 'Card criado! Veja no painel Fluxo.',
    )
    setCriandoCard(false)
    setModalCardAberto(false)
    setMensagemOrganizar(null)
  }

  /**
   * "Enviar para fluxo": cria o card no destino escolhido em cascata,
   * gravando fluxo_id E status juntos (nunca card órfão de coluna).
   */
  async function enviarMensagemParaFluxo(
    m: ChatMensagem,
    colunaChave: string,
    colunaTitulo: string,
    fluxoId: string,
  ) {
    const titulo = tituloDaMensagem(m.texto) || 'Card do chat'
    await criarCard(
      {
        titulo,
        descricao: m.texto,
        status: colunaChave,
        fluxo_id: fluxoId,
      },
      `Card criado em "${colunaTitulo}"!`,
    )
    void navigate('/fluxo')
  }

  /** "Enviar a projeto": card vinculado ao projeto escolhido. */
  async function enviarMensagemParaProjeto(
    m: ChatMensagem,
    projetoId: string,
    titulo?: string,
    descricao?: string,
  ) {
    await criarCard(
      {
        titulo: (titulo || tituloDaMensagem(m.texto) || 'Card do chat').trim(),
        descricao: descricao ?? m.texto,
        projeto: projetoId,
      },
      'Card criado e vinculado ao projeto!',
    )
    setModalProjetoAberto(false)
    setMensagemOrganizar(null)
  }

  const conversasFiltradas = useMemo(() => {
    const termo = busca.trim().toLowerCase()
    let lista = conversas.map((c) => (c.eh_grupo ? c : { ...c, nome: nomeDe(c.usuario_id || '') }))
    if (aba === 'nao_lidas') lista = lista.filter((c) => c.nao_lidas > 0)
    if (termo) {
      lista = lista.filter(
        (c) =>
          c.nome.toLowerCase().includes(termo) ||
          (c.ultima || '').toLowerCase().includes(termo) ||
          (c.nomes_anexos || []).some((a) => a.toLowerCase().includes(termo)),
      )
    }
    if (soComAnexo) lista = lista.filter((c) => c.tem_anexo)
    return lista
  }, [conversas, busca, aba, nomeDe, soComAnexo])

  const naoLidasTotal = useMemo(() => conversas.reduce((s, c) => s + c.nao_lidas, 0), [conversas])

  const nomeMembroGrupo = useMemo(() => {
    const mapa = new Map(colaboradores.map((c) => [c.id, c.nome]))
    mapa.set(meuId, 'Você')
    return mapa
  }, [colaboradores, meuId])

  function selecionarArquivo(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0]
    if (f) setArquivo(f)
    e.target.value = ''
  }

  const membrosDoAlvo = useMemo(() => {
    if (!alvo || alvo.tipo !== 'grupo') return []
    const g = grupos.find((x) => x.id === alvo.id)
    if (!g) return []
    const ids = Array.isArray(g.membros) ? g.membros : []
    const nomes = ids.map((id) => (id === meuId ? 'Você' : nomeDe(id)))
    return nomes.filter((n, i) => nomes.indexOf(n) === i)
  }, [alvo, grupos, nomeDe, meuId])

  const organizando = !!mensagemOrganizar && !!mensagemOrganizar.texto.trim()

  // No desktop, quando a coluna contextual (NavContextColumn) está aberta ela
  // substitui a lista de conversas embutida — evita duplicação de UI. No mobile
  // (sem segunda coluna) a lista interna permanece completa.
  const listaInternaNoDesktop = !colunaSecundariaAberta
  const classesListaConversas = [
    'w-full',
    'shrink-0',
    'flex-col',
    'bg-white',
    'border-r',
    'border-gray-200',
  ]
  if (alvo) {
    classesListaConversas.push('hidden')
    if (listaInternaNoDesktop) classesListaConversas.push('md:flex', 'md:w-[340px]')
  } else {
    classesListaConversas.push('flex')
    if (listaInternaNoDesktop) classesListaConversas.push('md:flex', 'md:w-[340px]')
    else classesListaConversas.push('md:hidden')
  }

  return (
    <div className="flex h-[calc(100vh-64px)] overflow-hidden bg-[#efeae2]">
      {/* Coluna esquerda: lista de conversas (escondida no desktop quando a
          coluna contextual está aberta — evita duplicação de UI; no mobile e
          com a coluna recolhida, a lista interna permanece) */}
      <aside className={classesListaConversas.join(' ')}>
        <div className="px-4 py-3 bg-[#008069] text-white flex items-center gap-2">
          <MessageCircle className="h-5 w-5" />
          <span className="font-semibold text-sm">Chat interno</span>
          {naoLidasTotal > 0 && (
            <span className="ml-auto bg-[#25d366] text-white text-xs font-semibold rounded-full px-2 py-0.5">
              {naoLidasTotal}
            </span>
          )}
        </div>
        <div className="p-2 border-b border-gray-100">
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-400" />
            <input
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              placeholder="Buscar conversa, grupo ou anexo..."
              className="w-full rounded-full bg-gray-100 pl-8 pr-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[#008069]/30"
            />
          </div>
          <div className="flex gap-1 mt-2">
            <button
              onClick={() => setAba('todas')}
              className={cn(
                'flex-1 rounded-full py-1 text-xs font-medium transition-colors',
                aba === 'todas'
                  ? 'bg-[#008069] text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200',
              )}
            >
              Todas
            </button>
            <button
              onClick={() => setAba('nao_lidas')}
              className={cn(
                'flex-1 rounded-full py-1 text-xs font-medium transition-colors',
                aba === 'nao_lidas'
                  ? 'bg-[#008069] text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200',
              )}
            >
              Não lidas{naoLidasTotal > 0 ? ` (${naoLidasTotal})` : ''}
            </button>
            <button
              onClick={() => setSoComAnexo((v) => !v)}
              className={cn(
                'rounded-full px-2.5 py-1 text-xs font-medium transition-colors flex items-center gap-1',
                soComAnexo
                  ? 'bg-[#008069] text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200',
              )}
              title="Mostrar só conversas com anexo"
            >
              <IconeAnexoFiltro className="h-3 w-3" />
              Com anexo
            </button>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto">
          {carregando && conversas.length === 0 && (
            <p className="text-xs text-gray-400 text-center py-6">Carregando conversas...</p>
          )}
          {conversasFiltradas.map((c) => (
            <button
              key={c.eh_grupo ? `g:${c.grupo_id}` : `u:${c.usuario_id}`}
              onClick={() =>
                c.eh_grupo
                  ? setAlvo({ tipo: 'grupo', id: c.grupo_id!, nome: c.nome })
                  : setAlvo({
                      tipo: 'individual',
                      id: c.usuario_id!,
                      nome: colaboradores.find((x) => x.id === c.usuario_id)?.nome || c.nome,
                    })
              }
              className={cn(
                'w-full text-left px-4 py-3 flex gap-3 items-center hover:bg-gray-50 border-b border-gray-50',
                alvo && alvo.id === (c.eh_grupo ? c.grupo_id : c.usuario_id) && 'bg-gray-100',
              )}
            >
              {c.eh_grupo ? (
                <div className="h-10 w-10 rounded-full bg-[#008069]/10 flex items-center justify-center shrink-0">
                  <Users className="h-5 w-5 text-[#008069]" />
                </div>
              ) : (
                <Avatar className="h-10 w-10">
                  <AvatarFallback className="bg-[#008069]/10 text-[#008069] text-sm font-semibold">
                    {iniciais(c.nome)}
                  </AvatarFallback>
                </Avatar>
              )}
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm font-medium text-gray-900 truncate">{c.nome}</span>
                  <span className="text-[11px] text-gray-400 shrink-0">
                    {horaCurta(c.ultima_criada_em)}
                  </span>
                </div>
                <div className="flex items-center justify-between gap-2 mt-0.5">
                  <span className="text-xs text-gray-500 truncate">
                    {c.ultima_propria && 'Você: '}
                    {c.ultima || 'Novo grupo de conversa'}
                  </span>
                  <span className="shrink-0 flex items-center gap-1.5">
                    {c.tem_anexo && (
                      <IconeAnexoFiltro
                        className="h-3.5 w-3.5 text-gray-400"
                        aria-label="Tem anexo"
                      />
                    )}
                    {c.nao_lidas > 0 && (
                      <span className="bg-[#25d366] text-white text-[11px] font-semibold rounded-full min-w-[20px] h-5 px-1.5 flex items-center justify-center">
                        {c.nao_lidas}
                      </span>
                    )}
                  </span>
                </div>
              </div>
            </button>
          ))}
          {!carregando && conversasFiltradas.length === 0 && (
            <p className="text-xs text-gray-400 text-center py-6 px-4">
              {soComAnexo
                ? 'Nenhuma conversa com anexo.'
                : aba === 'nao_lidas'
                  ? 'Nenhuma conversa não lida.'
                  : 'Nenhuma conversa ainda. Selecione um colaborador abaixo ou crie um grupo.'}
            </p>
          )}

          {/* Botão novo grupo */}
          <div className="px-4 pt-3">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setModalGrupoAberto(true)}
              className="w-full border-[#008069]/30 text-[#008069] hover:bg-[#008069]/5 hover:text-[#008069]"
            >
              <Plus className="h-4 w-4 mr-1" /> Novo grupo de trabalho
            </Button>
          </div>

          {/* Iniciar nova conversa individual */}
          <div className="px-4 py-3 border-t border-gray-100 mt-3">
            <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide mb-2">
              Colaboradores
            </p>
            <div className="space-y-1 max-h-56 overflow-y-auto">
              {colaboradores
                .filter(
                  (c) =>
                    !conversas.some((conv) => !conv.eh_grupo && conv.usuario_id === c.id) &&
                    (!busca.trim() || c.nome.toLowerCase().includes(busca.trim().toLowerCase())),
                )
                .map((c) => (
                  <button
                    key={c.id}
                    onClick={() => setAlvo({ tipo: 'individual', id: c.id, nome: c.nome })}
                    className="w-full flex items-center gap-3 px-2 py-2 rounded-lg hover:bg-gray-50 text-left"
                  >
                    <Avatar className="h-8 w-8">
                      <AvatarFallback className="bg-gray-100 text-gray-600 text-xs font-semibold">
                        {iniciais(c.nome)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0">
                      <p className="text-sm text-gray-800 truncate">{c.nome}</p>
                      <p className="text-[11px] text-gray-400 truncate">{c.email}</p>
                    </div>
                  </button>
                ))}
              {colaboradores.length === 0 && (
                <p className="text-[11px] text-gray-400">
                  Nenhum outro colaborador ativo na equipe.
                </p>
              )}
            </div>
          </div>
        </div>
      </aside>

      {/* Coluna direita: conversa aberta */}
      <section className={cn('flex-1 flex flex-col min-w-0', !alvo && 'hidden md:flex')}>
        {!alvo ? (
          <div className="flex-1 flex flex-col items-center justify-center text-center px-8">
            <div className="w-20 h-20 rounded-full bg-white flex items-center justify-center shadow-sm mb-4">
              <MessageCircle className="h-9 w-9 text-[#008069]" />
            </div>
            <p className="text-gray-700 font-medium">Chat interno Diamond</p>
            <p className="text-sm text-gray-500 mt-1 max-w-sm">
              Converse com os colaboradores da sua conta ou crie grupos de trabalho. Selecione uma
              conversa à esquerda para começar.
            </p>
          </div>
        ) : (
          <>
            <header className="bg-white border-b border-gray-200 px-3 py-2 flex items-center gap-3">
              <button
                onClick={() => setAlvo(null)}
                className="md:hidden p-1.5 rounded-full hover:bg-gray-100"
                aria-label="Voltar para conversas"
              >
                <ArrowLeft className="h-5 w-5 text-gray-600" />
              </button>
              {alvo.tipo === 'grupo' ? (
                <div className="h-9 w-9 rounded-full bg-[#008069]/10 flex items-center justify-center shrink-0">
                  <Users className="h-5 w-5 text-[#008069]" />
                </div>
              ) : (
                <Avatar className="h-9 w-9">
                  <AvatarFallback className="bg-[#008069]/10 text-[#008069] text-xs font-semibold">
                    {iniciais(alvo.nome)}
                  </AvatarFallback>
                </Avatar>
              )}
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-gray-900 truncate">{alvo.nome}</p>
                <p className="text-[11px] text-gray-400 truncate">
                  {alvo.tipo === 'grupo'
                    ? membrosDoAlvo.length > 0
                      ? membrosDoAlvo.join(', ')
                      : 'Grupo de trabalho'
                    : telefone || alvo.nome}
                </p>
              </div>
              {alvo.tipo === 'individual' && (
                <button
                  type="button"
                  onClick={chamarNoWhatsapp}
                  disabled={whatsappEstado === 'enviando'}
                  className="h-8 px-3 rounded-full border border-[#25d366] text-[#1eb85a] hover:bg-[#25d366]/10 disabled:opacity-40 text-xs font-semibold flex items-center gap-1.5 shrink-0"
                  title="Chamar no WhatsApp (mensagem de abertura pela sua conta conectada)"
                >
                  <Phone className="h-3.5 w-3.5" />
                  Chamar no WhatsApp
                </button>
              )}
              <button
                type="button"
                onClick={() => setMudo(alternarMudo())}
                className="p-2 rounded-full hover:bg-gray-100 text-gray-500"
                title={mudo ? 'Ativar som de notificação' : 'Silenciar notificações sonoras'}
                aria-label={mudo ? 'Ativar som' : 'Silenciar'}
              >
                {mudo ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
              </button>
              {alvo.tipo === 'individual' && (
                <div className="hidden sm:block">
                  <ConnectorButton toolkit="whatsapp" name="WhatsApp" />
                </div>
              )}
            </header>

            <div className="flex-1 overflow-y-auto px-4 md:px-10 py-4 space-y-2">
              {mensagens.map((m) => {
                const minha = m.remetente === meuId
                const urlAnexo = m.anexo ? pb.files.getURL(m as never, m.anexo) : null
                return (
                  <BalaoMensagem
                    key={m.id}
                    m={m}
                    minha={minha}
                    mostrarAutor={alvo.tipo === 'grupo'}
                    nomeAutor={nomeMembroGrupo.get(m.remetente) || 'Colaborador'}
                    urlAnexo={urlAnexo}
                    aoCriarCard={(msg) => {
                      setMensagemOrganizar(msg)
                      setModalCardAberto(true)
                    }}
                    aoEnviarFluxo={(msg, chave, tituloColuna, fluxoId) => {
                      void enviarMensagemParaFluxo(msg, chave, tituloColuna, fluxoId)
                    }}
                    aoEnviarProjeto={(msg) => {
                      setMensagemOrganizar(msg)
                      setModalProjetoAberto(true)
                    }}
                    destinosFluxo={destinosFluxo}
                    projetos={projetos.map((p) => ({ id: p.id, nome: p.nome }))}
                    criandoCard={criandoCard}
                  />
                )
              })}
              {mensagens.length === 0 && (
                <p className="text-center text-xs text-gray-400 pt-10">
                  Nenhuma mensagem ainda. Diga olá! 👋
                </p>
              )}
              <div ref={fimRef} />
            </div>

            {/* Envio por WhatsApp real (só conversa individual) */}
            <div className="px-3 pt-2">
              {whatsappEstado === 'erro' && whatsappErro && (
                <p className="text-[11px] text-red-600 mb-1">{whatsappErro}</p>
              )}
              {whatsappEstado === 'ok' && (
                <p className="text-[11px] text-emerald-700 mb-1">
                  {alvo.tipo === 'individual'
                    ? `Ação concluída no WhatsApp para ${telefone}.`
                    : 'Ação concluída no WhatsApp.'}
                </p>
              )}
            </div>
            {arquivo && (
              <div className="mx-3 mb-1 bg-white border border-gray-200 rounded-lg px-3 py-2 flex items-center gap-2 shadow-sm">
                {ehImagem(arquivo.name) ? (
                  <img
                    src={URL.createObjectURL(arquivo)}
                    alt={arquivo.name}
                    className="h-10 w-10 rounded object-cover"
                  />
                ) : (
                  <FileText className="h-5 w-5 text-gray-500" />
                )}
                <span className="text-xs text-gray-700 truncate flex-1">{arquivo.name}</span>
                <button
                  type="button"
                  onClick={() => setArquivo(null)}
                  className="p-1 rounded-full hover:bg-gray-100"
                  aria-label="Remover anexo"
                >
                  <X className="h-4 w-4 text-gray-500" />
                </button>
              </div>
            )}
            <form onSubmit={enviar} className="bg-[#f0f2f5] px-3 py-2.5 flex items-center gap-2">
              <input
                ref={inputArquivoRef}
                type="file"
                className="hidden"
                onChange={selecionarArquivo}
                accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv"
              />
              <button
                type="button"
                onClick={() => inputArquivoRef.current?.click()}
                className="p-2 rounded-full hover:bg-gray-200 text-gray-500 shrink-0"
                title="Anexar imagem, PDF ou documento"
                aria-label="Anexar arquivo"
              >
                <Paperclip className="h-5 w-5" />
              </button>
              <input
                value={rascunho}
                onChange={(e) => setRascunho(e.target.value)}
                placeholder="Digite uma mensagem"
                className="flex-1 rounded-full bg-white px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-[#008069]/30"
              />
              {alvo.tipo === 'individual' && (
                <button
                  type="button"
                  onClick={enviarWhatsapp}
                  disabled={!rascunho.trim() || whatsappEstado === 'enviando'}
                  className="h-10 px-3 rounded-full bg-[#25d366] hover:bg-[#1eb85a] disabled:opacity-40 text-white text-xs font-semibold flex items-center gap-1.5 shrink-0"
                  title="Enviar esta mensagem pelo seu WhatsApp conectado"
                >
                  {whatsappEstado === 'enviando' ? 'Enviando…' : 'Enviar por WhatsApp'}
                </button>
              )}
              <button
                type="submit"
                disabled={(!rascunho.trim() && !arquivo) || enviando}
                className="w-10 h-10 rounded-full bg-[#008069] hover:bg-[#00695c] disabled:opacity-40 text-white flex items-center justify-center shrink-0"
                aria-label="Enviar mensagem"
              >
                <Send className="h-4 w-4" />
              </button>
            </form>
          </>
        )}
      </section>

      {/* Modal: novo grupo */}
      <ModalNovoGrupoChat
        aberto={modalGrupoAberto}
        onFechar={() => setModalGrupoAberto(false)}
        colaboradores={colaboradores}
        meuId={meuId}
        onCriada={(g) => {
          setGrupos((prev) => [g, ...prev])
          setAlvo({ tipo: 'grupo', id: g.id, nome: g.nome })
          void atualizarConversas()
        }}
      />

      {/* Diálogos de organização (criar card / enviar a projeto) */}
      <ModalCriarCardMensagem
        aberto={modalCardAberto}
        onFechar={() => {
          setModalCardAberto(false)
          setMensagemOrganizar(null)
        }}
        textoMensagem={mensagemOrganizar?.texto || ''}
        destinos={destinosFluxo}
        criando={criandoCard}
        onConfirmar={confirmarCriarCard}
      />
      <ModalEnviarProjeto
        aberto={modalProjetoAberto}
        onFechar={() => {
          setModalProjetoAberto(false)
          setMensagemOrganizar(null)
        }}
        projetos={projetos}
        textoMensagem={mensagemOrganizar?.texto || ''}
        enviando={false}
        onConfirmar={(projetoId, titulo, descricao) => {
          void enviarMensagemParaProjeto(
            mensagemOrganizar as ChatMensagem,
            projetoId,
            titulo,
            descricao,
          )
        }}
      />
    </div>
  )
}
