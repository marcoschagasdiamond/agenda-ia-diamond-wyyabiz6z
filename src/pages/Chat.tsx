// Chat interno estilo WhatsApp entre colaboradores da conta.
// Lista de conversas à esquerda, balões à direita, envio real pelo
// conector WhatsApp (conta do próprio usuário) quando desejado.
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Send, MessageCircle, Search, ArrowLeft } from 'lucide-react'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { ConnectorButton } from '@/components/skip/ConnectorButton'
import { execute } from '@/lib/skipConnectors'
import pb from '@/lib/pocketbase/client'
import { useAuth } from '@/hooks/use-auth'
import { cn } from '@/lib/utils'
import {
  listarMensagensCom,
  listarConversas,
  enviarMensagem,
  marcarConversaLida,
  listarColaboradores,
  telefoneDoColaborador,
} from '@/services/chatMensagens'
import type { ChatMensagem, ChatConversaResumo, ColaboradorChat } from '@/types'

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

  const [conversas, setConversas] = useState<ChatConversaResumo[]>([])
  const [colaboradores, setColaboradores] = useState<ColaboradorChat[]>([])
  const [selecionado, setSelecionado] = useState<ColaboradorChat | null>(null)
  const [telefone, setTelefone] = useState('')
  const [mensagens, setMensagens] = useState<ChatMensagem[]>([])
  const [rascunho, setRascunho] = useState('')
  const [busca, setBusca] = useState('')
  const [enviando, setEnviando] = useState(false)
  const [carregando, setCarregando] = useState(true)
  const [whatsappEstado, setWhatsappEstado] = useState<'idle' | 'enviando' | 'ok' | 'erro'>('idle')
  const [whatsappErro, setWhatsappErro] = useState<string | null>(null)
  const fimRef = useRef<HTMLDivElement>(null)

  const nomeDe = useCallback(
    (id: string) => colaboradores.find((c) => c.id === id)?.nome || 'Colaborador',
    [colaboradores],
  )

  // Colaboradores (destinatários possíveis) + lista de conversas
  useEffect(() => {
    if (!meuId) return
    let vivo = true
    listarColaboradores()
      .then((lista) => {
        if (vivo) setColaboradores(lista.filter((c) => c.id !== meuId))
      })
      .catch(() => undefined)
    return () => {
      vivo = false
    }
  }, [meuId])

  const atualizarConversas = useCallback(async () => {
    if (!meuId) return
    try {
      setConversas(await listarConversas(meuId))
    } catch {
      // silencioso
    }
  }, [meuId])

  useEffect(() => {
    if (!meuId) return
    atualizarConversas().finally(() => setCarregando(false))
    const interval = window.setInterval(atualizarConversas, 5000)
    let unsub: (() => void) | undefined
    pb.collection('chat_mensagens')
      .subscribe('*', () => void atualizarConversas())
      .then((u) => {
        unsub = u as () => void
      })
      .catch(() => undefined)
    return () => {
      window.clearInterval(interval)
      if (unsub) unsub()
      pb.collection('chat_mensagens').unsubscribe('*')
    }
  }, [meuId, atualizarConversas])

  // Mensagens da conversa aberta
  const atualizarMensagens = useCallback(async () => {
    if (!meuId || !selecionado) return
    try {
      const lista = await listarMensagensCom(meuId, selecionado.id)
      setMensagens(lista)
    } catch {
      // silencioso
    }
  }, [meuId, selecionado])

  useEffect(() => {
    if (!meuId || !selecionado) {
      setMensagens([])
      return
    }
    atualizarMensagens()
    // Marca como lida ao abrir a conversa
    marcarConversaLida(meuId, selecionado.id)
      .then(() => atualizarConversas())
      .catch(() => undefined)
    const interval = window.setInterval(atualizarMensagens, 4000)
    let unsub: (() => void) | undefined
    pb.collection('chat_mensagens')
      .subscribe('*', () => void atualizarMensagens())
      .then((u) => {
        unsub = u as () => void
      })
      .catch(() => undefined)
    return () => {
      window.clearInterval(interval)
      if (unsub) unsub()
      pb.collection('chat_mensagens').unsubscribe('*')
    }
  }, [meuId, selecionado, atualizarMensagens, atualizarConversas])

  // Telefone do colaborador no cadastro da equipe (para WhatsApp real)
  useEffect(() => {
    setWhatsappEstado('idle')
    setWhatsappErro(null)
    if (!selecionado) {
      setTelefone('')
      return
    }
    let vivo = true
    telefoneDoColaborador(selecionado.id).then((tel) => {
      if (vivo) setTelefone(tel)
    })
    return () => {
      vivo = false
    }
  }, [selecionado])

  // Rola para a última mensagem
  useEffect(() => {
    fimRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [mensagens.length])

  async function enviar(e?: React.FormEvent) {
    e?.preventDefault()
    const texto = rascunho.trim()
    if (!meuId || !selecionado || !texto || enviando) return
    setEnviando(true)
    setRascunho('')
    try {
      await enviarMensagem(meuId, selecionado.id, texto)
      await atualizarMensagens()
      await atualizarConversas()
    } catch {
      setRascunho(texto)
    } finally {
      setEnviando(false)
    }
  }

  /** Envio real pelo conector WhatsApp da conta do próprio usuário. */
  async function enviarWhatsapp() {
    if (!selecionado || !rascunho.trim()) return
    if (!telefone.trim()) {
      setWhatsappEstado('erro')
      setWhatsappErro(
        `${selecionado.nome} não tem número de telefone cadastrado na equipe. Cadastre o telefone em Equipe para enviar por WhatsApp.`,
      )
      return
    }
    const texto = rascunho.trim()
    setWhatsappEstado('enviando')
    setWhatsappErro(null)
    try {
      const res = await execute('WHATSAPP_SEND_MESSAGE', {
        text: texto,
        to_number: telefone,
        phone_number_id: '',
      })
      if (res.successful) {
        setWhatsappEstado('ok')
        setRascunho('')
      } else {
        setWhatsappEstado('erro')
        setWhatsappErro(res.error || 'Falha ao enviar pelo WhatsApp.')
      }
    } catch (err) {
      setWhatsappEstado('erro')
      setWhatsappErro(
        err instanceof Error
          ? err.message
          : 'Falha ao enviar pelo WhatsApp. Verifique se sua conta está conectada.',
      )
    }
  }

  const conversasFiltradas = useMemo(() => {
    const termo = busca.trim().toLowerCase()
    const lista = conversas.map((c) => ({ ...c, nome: nomeDe(c.usuario_id) }))
    if (!termo) return lista
    return lista.filter((c) => c.nome.toLowerCase().includes(termo))
  }, [conversas, busca, nomeDe])

  const naoLidasTotal = useMemo(() => conversas.reduce((s, c) => s + c.nao_lidas, 0), [conversas])

  return (
    <div className="flex h-[calc(100vh-64px)] overflow-hidden bg-[#efeae2]">
      {/* Coluna esquerda: lista de conversas */}
      <aside
        className={cn(
          'w-full md:w-[340px] shrink-0 flex flex-col bg-white border-r border-gray-200',
          selecionado && 'hidden md:flex',
        )}
      >
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
              placeholder="Buscar conversa ou colaborador..."
              className="w-full rounded-full bg-gray-100 pl-8 pr-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[#008069]/30"
            />
          </div>
        </div>
        <div className="flex-1 overflow-y-auto">
          {carregando && conversas.length === 0 && (
            <p className="text-xs text-gray-400 text-center py-6">Carregando conversas...</p>
          )}
          {conversasFiltradas.map((c) => (
            <button
              key={c.usuario_id}
              onClick={() =>
                setSelecionado(colaboradores.find((x) => x.id === c.usuario_id) ?? null)
              }
              className={cn(
                'w-full text-left px-4 py-3 flex gap-3 items-center hover:bg-gray-50 border-b border-gray-50',
                selecionado?.id === c.usuario_id && 'bg-gray-100',
              )}
            >
              <Avatar className="h-10 w-10">
                <AvatarFallback className="bg-[#008069]/10 text-[#008069] text-sm font-semibold">
                  {iniciais(c.nome)}
                </AvatarFallback>
              </Avatar>
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
                    {c.ultima}
                  </span>
                  {c.nao_lidas > 0 && (
                    <span className="shrink-0 bg-[#25d366] text-white text-[11px] font-semibold rounded-full min-w-[20px] h-5 px-1.5 flex items-center justify-center">
                      {c.nao_lidas}
                    </span>
                  )}
                </div>
              </div>
            </button>
          ))}
          {!carregando && conversasFiltradas.length === 0 && (
            <p className="text-xs text-gray-400 text-center py-6 px-4">
              Nenhuma conversa ainda. Selecione um colaborador abaixo para começar.
            </p>
          )}

          {/* Iniciar nova conversa */}
          <div className="px-4 py-3 border-t border-gray-100">
            <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide mb-2">
              Colaboradores
            </p>
            <div className="space-y-1 max-h-56 overflow-y-auto">
              {colaboradores
                .filter(
                  (c) =>
                    !conversas.some((conv) => conv.usuario_id === c.id) &&
                    (!busca.trim() || c.nome.toLowerCase().includes(busca.trim().toLowerCase())),
                )
                .map((c) => (
                  <button
                    key={c.id}
                    onClick={() => setSelecionado(c)}
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
      <section className={cn('flex-1 flex flex-col min-w-0', !selecionado && 'hidden md:flex')}>
        {!selecionado ? (
          <div className="flex-1 flex flex-col items-center justify-center text-center px-8">
            <div className="w-20 h-20 rounded-full bg-white flex items-center justify-center shadow-sm mb-4">
              <MessageCircle className="h-9 w-9 text-[#008069]" />
            </div>
            <p className="text-gray-700 font-medium">Chat interno Diamond</p>
            <p className="text-sm text-gray-500 mt-1 max-w-sm">
              Converse com os colaboradores da sua conta. Selecione uma conversa à esquerda para
              começar.
            </p>
          </div>
        ) : (
          <>
            <header className="bg-white border-b border-gray-200 px-3 py-2 flex items-center gap-3">
              <button
                onClick={() => setSelecionado(null)}
                className="md:hidden p-1.5 rounded-full hover:bg-gray-100"
                aria-label="Voltar para conversas"
              >
                <ArrowLeft className="h-5 w-5 text-gray-600" />
              </button>
              <Avatar className="h-9 w-9">
                <AvatarFallback className="bg-[#008069]/10 text-[#008069] text-xs font-semibold">
                  {iniciais(selecionado.nome)}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-gray-900 truncate">{selecionado.nome}</p>
                <p className="text-[11px] text-gray-400 truncate">
                  {telefone ? telefone : selecionado.email}
                </p>
              </div>
              <div className="hidden sm:block">
                <ConnectorButton toolkit="whatsapp" name="WhatsApp" />
              </div>
            </header>

            <div className="flex-1 overflow-y-auto px-4 md:px-10 py-4 space-y-2">
              {mensagens.map((m) => {
                const minha = m.remetente === meuId
                return (
                  <div key={m.id} className={cn('flex', minha ? 'justify-end' : 'justify-start')}>
                    <div
                      className={cn(
                        'max-w-[75%] md:max-w-[60%] rounded-lg px-3 py-2 text-sm shadow-sm',
                        minha
                          ? 'bg-[#d9fdd3] text-gray-900 rounded-br-none'
                          : 'bg-white text-gray-900 rounded-bl-none',
                      )}
                    >
                      <p className="whitespace-pre-wrap break-words">{m.texto}</p>
                      <p className="text-[10px] text-gray-400 text-right mt-0.5">
                        {horaCurta(m.created)}
                        {minha && (m.lida_em ? ' ✓✓' : ' ✓')}
                      </p>
                    </div>
                  </div>
                )
              })}
              {mensagens.length === 0 && (
                <p className="text-center text-xs text-gray-400 pt-10">
                  Nenhuma mensagem ainda. Diga olá! 👋
                </p>
              )}
              <div ref={fimRef} />
            </div>

            {/* Envio por WhatsApp real */}
            <div className="px-3 pt-2">
              {whatsappEstado === 'erro' && whatsappErro && (
                <p className="text-[11px] text-red-600 mb-1">{whatsappErro}</p>
              )}
              {whatsappEstado === 'ok' && (
                <p className="text-[11px] text-emerald-700 mb-1">
                  Mensagem enviada pelo WhatsApp para {telefone}.
                </p>
              )}
            </div>
            <form onSubmit={enviar} className="bg-[#f0f2f5] px-3 py-2.5 flex items-center gap-2">
              <input
                value={rascunho}
                onChange={(e) => setRascunho(e.target.value)}
                placeholder="Digite uma mensagem"
                className="flex-1 rounded-full bg-white px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-[#008069]/30"
              />
              <button
                type="button"
                onClick={enviarWhatsapp}
                disabled={!rascunho.trim() || whatsappEstado === 'enviando'}
                className="h-10 px-3 rounded-full bg-[#25d366] hover:bg-[#1eb85a] disabled:opacity-40 text-white text-xs font-semibold flex items-center gap-1.5 shrink-0"
                title="Enviar esta mensagem pelo seu WhatsApp conectado"
              >
                {whatsappEstado === 'enviando' ? 'Enviando…' : 'Enviar por WhatsApp'}
              </button>
              <button
                type="submit"
                disabled={!rascunho.trim() || enviando}
                className="w-10 h-10 rounded-full bg-[#008069] hover:bg-[#00695c] disabled:opacity-40 text-white flex items-center justify-center shrink-0"
                aria-label="Enviar mensagem"
              >
                <Send className="h-4 w-4" />
              </button>
            </form>
          </>
        )}
      </section>
    </div>
  )
}
