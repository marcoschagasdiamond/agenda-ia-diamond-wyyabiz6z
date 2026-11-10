// Timeline do card (coluna direita do painel de detalhes) — modelo Ummense.
// Caixa de anotação com menções @ (usuário/equipe), abas de filtro e feed
// cronológico dos eventos (anotações e registros de sistema).
import { useState, useMemo } from 'react'
import { Paperclip, Smile, Send, Loader2, Trash2, Circle, Clock, HelpCircle } from 'lucide-react'
import { Textarea } from '@/components/ui/textarea'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { useAuth } from '@/hooks/use-auth'
import { toast } from '@/hooks/use-toast'
import {
  ROTULOS_ABA_TIMELINE,
  criarAnotacaoCard,
  excluirEventoCard,
  iniciais,
  listarEventosCard,
  meuNome,
  tempoRelativoPtBr,
  type AbaTimeline,
  type EventoCard,
} from '@/services/eventosCard'
import type { MembroEquipe } from '@/types'

const ABAS: AbaTimeline[] = ['todos', 'anotacoes', 'minhas', 'registros', 'conecta']

interface Props {
  cardId: string
  eventos: EventoCard[]
  membros: MembroEquipe[]
  onRecarregar: () => Promise<void> | void
}

export default function TimelineCard({ cardId, eventos, membros, onRecarregar }: Props) {
  const { user } = useAuth()
  const [aba, setAba] = useState<AbaTimeline>('todos')
  const [textoAnotacao, setTextoAnotacao] = useState('')
  const [enviando, setEnviando] = useState(false)
  const [excluindoId, setExcluindoId] = useState<string | null>(null)

  const meusMembros = useMemo(
    () => membros.filter((m) => m.usuario === user?.id),
    [membros, user?.id],
  )
  const ehMembroLogado = meusMembros.length > 0

  const eventosFiltrados = useMemo(() => {
    switch (aba) {
      case 'anotacoes':
        return eventos.filter((e) => e.tipo_evento === 'anotacao')
      case 'minhas':
        return eventos.filter((e) => e.tipo_evento === 'anotacao' && e.autor === user?.id)
      case 'registros':
        return eventos.filter((e) => e.tipo_evento !== 'anotacao')
      case 'conecta':
        return [] // estrutura pronta: sem eventos "conecta" por ora
      default:
        return eventos
    }
  }, [eventos, aba, user?.id])

  const handleEnviarAnotacao = async () => {
    const texto = textoAnotacao.trim()
    if (!texto || !cardId) return
    setEnviando(true)
    try {
      const criada = await criarAnotacaoCard(cardId, texto)
      if (criada) {
        setTextoAnotacao('')
        await onRecarregar()
        toast({ title: 'Anotação registrada na timeline!' })
      } else {
        toast({ title: 'Erro ao salvar anotação', variant: 'destructive' })
      }
    } finally {
      setEnviando(false)
    }
  }

  const handleExcluir = async (ev: EventoCard) => {
    if (excluindoId) return
    setExcluindoId(ev.id)
    try {
      const ok = await excluirEventoCard(ev.id)
      if (ok) {
        await onRecarregar()
        toast({ title: 'Evento removido da timeline.' })
      } else {
        toast({ title: 'Erro ao remover evento', variant: 'destructive' })
      }
    } finally {
      setExcluindoId(null)
    }
  }

  const renderAvatarAutor = (ev: EventoCard) => {
    const nome = ev.expand?.autor?.name || ev.expand?.autor?.email || 'Sistema'
    return (
      <Avatar className="w-7 h-7 rounded-full ring-1 ring-black/5 shrink-0">
        <AvatarImage
          src={`https://img.usecurling.com/ppl/128?seed=${encodeURIComponent(nome)}`}
          alt={nome}
        />
        <AvatarFallback className="bg-gradient-to-br from-[#1E40AF] to-[#0F766E] text-white text-[9px] font-bold">
          {iniciais(nome)}
        </AvatarFallback>
      </Avatar>
    )
  }

  const renderFeed = () => {
    if (eventosFiltrados.length === 0) {
      const msg =
        aba === 'conecta'
          ? 'Conecta: estrutura pronta — sem eventos nesta aba por ora.'
          : aba === 'minhas'
            ? 'Você ainda não escreveu nenhuma anotação neste card.'
            : aba === 'anotacoes'
              ? 'Nenhuma anotação neste card ainda.'
              : aba === 'registros'
                ? 'Nenhum registro de sistema ainda.'
                : 'Nada por aqui ainda.'
      return <p className="text-xs text-[#8A93A0] py-6 text-center">{msg}</p>
    }

    return (
      <div className="space-y-4">
        {eventosFiltrados.map((ev) => {
          const nomeAutor =
            meuNome(user) === (ev.expand?.autor?.name || '')
              ? meuNome(user)
              : ev.expand?.autor?.name || ev.expand?.autor?.email || 'Sistema'
          const podeExcluir = ev.autor === user?.id
          return (
            <div key={ev.id} className="flex items-start gap-2.5 group">
              {renderAvatarAutor(ev)}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="text-xs font-bold text-[#1A1D21]">{nomeAutor}</span>
                  <span className="text-[11px] text-[#8A93A0]">
                    {tempoRelativoPtBr(ev.created)}
                  </span>
                  {podeExcluir && (
                    <button
                      type="button"
                      onClick={() => handleExcluir(ev)}
                      title="Remover evento"
                      className="opacity-0 group-hover:opacity-100 transition-opacity text-[#CBD5E1] hover:text-red-500 ml-auto"
                    >
                      {excluindoId === ev.id ? (
                        <Loader2 className="w-3 h-3 animate-spin" />
                      ) : (
                        <Trash2 className="w-3 h-3" />
                      )}
                    </button>
                  )}
                </div>
                {ev.tipo_evento === 'anotacao' ? (
                  <p className="text-xs text-[#1A1D21] whitespace-pre-wrap break-words mt-0.5 leading-relaxed">
                    {renderTextoComMencao(ev.texto || '', membros, user)}
                  </p>
                ) : (
                  <p className="text-xs text-[#5B6470] whitespace-pre-wrap break-words mt-0.5 leading-relaxed">
                    {ev.texto}
                  </p>
                )}
              </div>
            </div>
          )
        })}
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-1 pb-3">
        <h3 className="text-base font-bold text-[#1A1D21]">Timeline</h3>
        <div className="flex items-center gap-2 text-[#8A93A0]">
          <Clock className="w-3.5 h-3.5" />
          <HelpCircle className="w-3.5 h-3.5" />
        </div>
      </div>

      {/* Caixa de anotação com menções @ */}
      <div className="rounded-xl border border-[#E5E1D8] bg-white p-3 shadow-xs">
        <Textarea
          rows={3}
          value={textoAnotacao}
          onChange={(e) => setTextoAnotacao(e.target.value)}
          placeholder="Escreva uma anotação neste card. Use @ para mencionar um usuário ou uma equipe."
          className="text-xs border-0 p-0 shadow-none focus-visible:ring-0 resize-none text-[#1A1D21]"
        />
        <div className="flex items-center justify-end gap-1.5 pt-2.5 border-t border-[#F1EFEA] mt-2">
          <button
            type="button"
            title="Anexar arquivo"
            onClick={() => toast({ title: 'Anexos na timeline ainda não implementados.' })}
            className="w-7 h-7 rounded-md hover:bg-[#F4F2EE] flex items-center justify-center text-[#8A93A0]"
          >
            <Paperclip className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            title="Emoji"
            onClick={() => setTextoAnotacao((t) => t + '🙂')}
            className="w-7 h-7 rounded-md hover:bg-[#F4F2EE] flex items-center justify-center text-[#8A93A0]"
          >
            <Smile className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            title="Enviar anotação"
            disabled={!textoAnotacao.trim() || enviando}
            onClick={handleEnviarAnotacao}
            className="w-7 h-7 rounded-md hover:bg-[#F4F2EE] flex items-center justify-center text-[#0F766E] disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {enviando ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Send className="w-3.5 h-3.5" />
            )}
          </button>
        </div>

        {/* Sugestões de menção @ */}
        {textoAnotacao.includes('@') && membros.length > 0 && (
          <div className="mt-2 border-t border-[#F1EFEA] pt-2 space-y-1">
            <p className="text-[10px] font-semibold text-[#8A93A0] uppercase tracking-wider">
              Mencionar
            </p>
            <div className="flex flex-wrap gap-1.5">
              {membros.slice(0, 8).map((m) => {
                const nome = m.nome || m.email
                return (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => setTextoAnotacao((t) => t.replace(/@(\w*)$/, `@${nome} `))}
                    className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-[#F4F2EE] hover:bg-[#0F766E]/10 text-[#1A1D21]"
                  >
                    @{nome}
                  </button>
                )
              })}
            </div>
          </div>
        )}
      </div>

      {/* Abas */}
      <div className="flex items-center gap-3 flex-wrap px-1 py-3 border-b border-[#E5E1D8]">
        {ABAS.map((a) => (
          <button
            key={a}
            type="button"
            onClick={() => setAba(a)}
            className={`text-[11px] font-bold tracking-wide transition-colors ${
              aba === a
                ? 'text-[#2563EB] underline underline-offset-4 decoration-2'
                : 'text-[#8A93A0] hover:text-[#1A1D21]'
            }`}
          >
            {ROTULOS_ABA_TIMELINE[a]}
          </button>
        ))}
      </div>

      {/* Feed cronológico */}
      <div className="flex-1 overflow-y-auto px-1 py-4">{renderFeed()}</div>
    </div>
  )
}

/** Rola os @menções em negrito dentro do texto da anotação. */
function renderTextoComMencao(
  texto: string,
  membros: MembroEquipe[],
  user: { id: string; name?: string } | null,
) {
  // Nomes possíveis de menções (aproximação: nomes de membros seguidos de espaço/pontuação)
  const nomes = Array.from(
    new Set(
      membros
        .map((m) => m.nome || m.email)
        .filter(Boolean)
        .map((n) => n as string),
    ),
  )
  let partes: Array<{ tipo: 'texto' | 'mencao'; valor: string }> = [{ tipo: 'texto', valor: texto }]
  for (const nome of nomes) {
    const novas: Array<{ tipo: 'texto' | 'mencao'; valor: string }> = []
    for (const p of partes) {
      if (p.tipo === 'mencao') {
        novas.push(p)
        continue
      }
      const pedacos = p.valor.split(`@${nome}`)
      pedacos.forEach((pedaco, i) => {
        if (i > 0) novas.push({ tipo: 'mencao', valor: `@${nome}` })
        if (pedaco) novas.push({ tipo: 'texto', valor: pedaco })
      })
    }
    partes = novas
  }
  return partes.map((p, i) =>
    p.tipo === 'mencao' ? (
      <span key={i} className="font-bold text-[#1A1D21]">
        {p.valor}
      </span>
    ) : (
      <span key={i}>{p.valor}</span>
    ),
  )
}
