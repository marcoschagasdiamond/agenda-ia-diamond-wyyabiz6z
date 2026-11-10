// Painel de detalhes do card (página /card/:id) — reformado no layout Ummense:
// DUAS COLUNAS —
//   esquerda: Líder + Equipe, textarea grande de detalhes, Tags, contatos
//   vinculados (busca por nome/e-mail), Campos personalizados (categoria card)
//   e Tarefas do card (contador + adição rápida);
//   direita: Timeline (anotações com menções @, abas e feed cronológico).
// Em tela estreita a Timeline cai para baixo da coluna esquerda.
import { useState, useEffect, useMemo, useRef, useCallback } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { diamondApi } from '@/services/diamondApi'
import type { Contato, Card as CardType, Projeto } from '@/types'
import { ArrowLeft, AlignLeft, Tag, Users, Search, X, Loader2, Lock, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import { Input } from '@/components/ui/input'
import { useToast } from '@/hooks/use-toast'
import { useAuth } from '@/hooks/use-auth'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import PainelCamposPersonalizados from '@/components/campos/PainelCamposPersonalizados'
import TimelineCard from '@/components/fluxo/TimelineCard'
import SecaoTarefasCard from '@/components/fluxo/SecaoTarefasCard'
import BarraTagsCard from '@/components/fluxo/BarraTagsCard'
import {
  listarEventosCard,
  criarEventoCard,
  listarTarefasCard,
  filtrarContatosPorBusca,
  iniciais,
  textoEventoCriacao,
  textoEventoMembro,
  meuNome,
  type EventoCard,
  type TarefaCard,
} from '@/services/eventosCard'
import type { MembroEquipe } from '@/types'

export default function CardDetalhes() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { toast } = useToast()
  const { user } = useAuth()

  const [card, setCard] = useState<CardType | null>(null)
  const [contato, setContato] = useState<Contato | null>(null)
  const [projetos, setProjetos] = useState<Projeto[]>([])
  const [contatos, setContatos] = useState<Contato[]>([])
  const [contatosVinculados, setContatosVinculados] = useState<Contato[]>([])
  const [membros, setMembros] = useState<MembroEquipe[]>([])
  const [eventos, setEventos] = useState<EventoCard[]>([])
  const [tarefas, setTarefas] = useState<TarefaCard[]>([])

  const [detalhes, setDetalhes] = useState('')
  const [tagsTexto, setTagsTexto] = useState<string[]>([])
  const [buscaContato, setBuscaContato] = useState('')
  const [salvandoDetalhes, setSalvandoDetalhes] = useState(false)
  const [carregando, setCarregando] = useState(true)

  const timeoutSalvar = useRef<ReturnType<typeof setTimeout> | null>(null)
  const carregarEventosRef = useRef<() => Promise<void> | void>(async () => {})

  // ---------- Carregamento ----------
  const carregar = useCallback(async () => {
    if (!id) return
    try {
      const c = await diamondApi.getCard(id)
      setCard(c)
      setDetalhes(c.descricao || '')
      setTagsTexto(Array.isArray(c.tags) ? c.tags : [])

      const [listaContatos, listaMembros, listaEventos, listaTarefas] = await Promise.all([
        diamondApi.listContatos().catch(() => [] as Contato[]),
        diamondApi.listMembrosEquipe().catch(() => [] as MembroEquipe[]),
        listarEventosCard(id),
        listarTarefasCard(id),
      ])
      setContatos(listaContatos)
      setMembros(listaMembros)
      setEventos(listaEventos)
      setTarefas(listaTarefas)

      if (c.contato) {
        try {
          const ct = await diamondApi.getContato(c.contato)
          setContato(ct)
          setContatosVinculados(ct ? [ct] : [])
        } catch {
          setContato(null)
        }
      } else {
        setContato(null)
        setContatosVinculados([])
      }
    } catch (err) {
      console.error(err)
      toast({ title: 'Erro ao carregar card', variant: 'destructive' })
    } finally {
      setCarregando(false)
    }
  }, [id, toast])

  useEffect(() => {
    carregar()
  }, [carregar])

  const recarregarEventos = useCallback(async () => {
    if (!id) return
    const evs = await listarEventosCard(id)
    setEventos(evs)
  }, [id])
  carregarEventosRef.current = recarregarEventos

  // ---------- Salvamento de detalhes / tags (debounce) ----------
  const agendarSalvarCard = useCallback(
    (payload: Partial<CardType>) => {
      if (!id) return
      if (timeoutSalvar.current) clearTimeout(timeoutSalvar.current)
      timeoutSalvar.current = setTimeout(async () => {
        try {
          setSalvandoDetalhes(true)
          await diamondApi.updateCard(id, payload)
        } catch {
          toast({ title: 'Erro ao salvar detalhes do card', variant: 'destructive' })
        } finally {
          setSalvandoDetalhes(false)
        }
      }, 900)
    },
    [id, toast],
  )

  const handleDetalhesChange = (v: string) => {
    setDetalhes(v)
    agendarSalvarCard({ descricao: v })
  }

  const handleTagsChange = (arr: string[]) => {
    setTagsTexto(arr)
    agendarSalvarCard({ tags: arr })
  }

  // ---------- Membros (Líder/Equipe) ----------
  const lider = card?.responsavel ? membros.find((m) => m.usuario === card.responsavel) : null
  const liderNome = lider
    ? lider.nome || lider.email
    : membros.find((m) => m.usuario === card?.responsavel)?.email || 'Sem líder'
  const equipe = membros.filter((m) => m.usuario && m.usuario !== card?.responsavel)

  const adicionarMembroEquipe = async (m: MembroEquipe) => {
    if (!card) return
    // Equipe do card é deduzida (por ora) do responsável; registrar evento é o que persiste a ação
    await criarEventoCard(card.id, 'membro', textoEventoMembro(m.nome || m.email))
    await recarregarEventos()
    toast({ title: `${m.nome || m.email} adicionado à equipe do card.` })
  }

  // ---------- Contatos vinculados ----------
  const contatosFiltrados = useMemo(
    () => filtrarContatosPorBusca(contatos, buscaContato),
    [contatos, buscaContato],
  )
  const idsVinculados = new Set(contatosVinculados.map((c) => c.id))

  const vincularContato = async (ct: Contato) => {
    if (!card) return
    try {
      await diamondApi.updateCard(card.id, { contato: ct.id })
      setContatosVinculados((prev) => (prev.some((x) => x.id === ct.id) ? prev : [...prev, ct]))
      setBuscaContato('')
      toast({ title: `${ct.nome} vinculado ao card.` })
    } catch {
      toast({ title: 'Erro ao vincular contato', variant: 'destructive' })
    }
  }

  const desvincularContato = async (ct: Contato) => {
    if (!card) return
    try {
      await diamondApi.updateCard(card.id, { contato: undefined })
      setContatosVinculados((prev) => prev.filter((x) => x.id !== ct.id))
      toast({ title: `${ct.nome} desvinculado do card.` })
    } catch {
      toast({ title: 'Erro ao desvincular contato', variant: 'destructive' })
    }
  }

  // ---------- Render ----------
  if (carregando)
    return (
      <div className="p-10 flex items-center justify-center text-xs text-[#5B6470] gap-2">
        <Loader2 className="w-4 h-4 animate-spin" /> Carregando card...
      </div>
    )
  if (!card)
    return <div className="p-10 text-center text-xs text-red-600">Card não encontrado.</div>

  const contatoPrincipal = contatosVinculados[0]

  return (
    <div className="max-w-[1400px] mx-auto p-4 md:p-6 space-y-4">
      {/* Cabeçalho compacto */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 min-w-0">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate('/fluxo')}
            className="text-xs p-2 h-8 text-[#5B6470]"
          >
            <ArrowLeft className="w-4 h-4" /> Voltar ao Fluxo
          </Button>
          <h1 className="text-lg font-bold text-[#1A1D21] truncate ml-1">{card.titulo}</h1>
        </div>
        <div className="flex items-center gap-2">
          {salvandoDetalhes && (
            <span className="inline-flex items-center gap-1 text-[10px] text-[#8A93A0]">
              <Loader2 className="w-3 h-3 animate-spin" /> salvando...
            </span>
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={async () => {
              if (!confirm('Deseja realmente excluir este card?')) return
              try {
                await diamondApi.deleteCard(card.id)
                toast({ title: 'Card excluído com sucesso.' })
                navigate('/fluxo')
              } catch {
                toast({ title: 'Erro ao excluir card', variant: 'destructive' })
              }
            }}
            className="text-xs p-2 h-8 text-red-600 hover:bg-red-50"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </Button>
        </div>
      </div>

      {/* DUAS COLUNAS: esquerda detalhes / direita Timeline */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4 items-start">
        {/* ===================== COLUNA ESQUERDA ===================== */}
        <div className="lg:col-span-3 space-y-4">
          <div className="rounded-2xl bg-white border border-[#E5E1D8] p-5 shadow-xs space-y-4">
            {/* Líder + Equipe */}
            <div className="flex items-center gap-6 flex-wrap">
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-[#5B6470]">Líder</span>
                <Avatar className="w-9 h-9 ring-1 ring-black/5">
                  <AvatarImage
                    src={`https://img.usecurling.com/ppl/128?seed=${encodeURIComponent(liderNome)}`}
                    alt={liderNome}
                  />
                  <AvatarFallback className="bg-gradient-to-br from-[#1E40AF] to-[#0F766E] text-white text-[10px] font-bold">
                    {iniciais(liderNome)}
                  </AvatarFallback>
                </Avatar>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-[#5B6470]">Equipe</span>
                <div className="flex -space-x-2 items-center">
                  {equipe.slice(0, 4).map((m) => {
                    const nome = m.nome || m.email
                    return (
                      <Avatar key={m.id} className="w-8 h-8 ring-2 ring-white" title={nome}>
                        <AvatarImage
                          src={`https://img.usecurling.com/ppl/128?seed=${encodeURIComponent(nome)}`}
                          alt={nome}
                        />
                        <AvatarFallback className="bg-gradient-to-br from-[#0F766E] to-[#1E40AF] text-white text-[9px] font-bold">
                          {iniciais(nome)}
                        </AvatarFallback>
                      </Avatar>
                    )
                  })}
                  {equipe.length === 0 && (
                    <span className="text-[11px] text-[#8A93A0]">Ninguém ainda</span>
                  )}
                </div>
                <button
                  type="button"
                  title="Equipe privada"
                  className="text-[#8A93A0] hover:text-[#5B6470]"
                >
                  <Lock className="w-3.5 h-3.5" />
                </button>
                {/* Adicionar membro (menu de membros ainda não na equipe do card) */}
                {membros.length > equipe.length && (
                  <select
                    value=""
                    onChange={(e) => {
                      const m = membros.find((x) => x.id === e.target.value)
                      if (m) adicionarMembroEquipe(m)
                    }}
                    className="text-[11px] text-[#5B6470] border border-[#E5E1D8] rounded-md px-1.5 py-0.5 bg-white"
                  >
                    <option value="">+ Adicionar</option>
                    {membros
                      .filter((m) => !equipe.some((e) => e.id === m.id))
                      .map((m) => (
                        <option key={m.id} value={m.id}>
                          {m.nome || m.email}
                        </option>
                      ))}
                  </select>
                )}
              </div>
            </div>

            {/* Detalhes do card (textarea grande) */}
            <div className="flex items-start gap-3">
              <AlignLeft className="w-4 h-4 text-[#8A93A0] mt-3 shrink-0" />
              <Textarea
                rows={6}
                value={detalhes}
                onChange={(e) => handleDetalhesChange(e.target.value)}
                placeholder="Escrever detalhes do card..."
                className="text-xs text-[#1A1D21] border-[#E5E1D8] resize-y"
              />
            </div>

            {/* Tags: modelos prontos + criar tag com paleta de cores */}
            <div className="flex items-start gap-3">
              <Tag className="w-4 h-4 text-[#8A93A0] shrink-0 mt-2.5" />
              <div className="flex-1 min-w-0">
                <BarraTagsCard tags={tagsTexto} onChange={handleTagsChange} />
              </div>
            </div>

            {/* Contatos vinculados (busca por nome/e-mail) */}
            <div className="flex items-center gap-3 relative">
              <Users className="w-4 h-4 text-[#8A93A0] shrink-0" />
              <div className="flex-1 relative">
                <Input
                  value={buscaContato}
                  onChange={(e) => setBuscaContato(e.target.value)}
                  placeholder="Pesquise pelo nome ou pelo email do contato ou adicione tags de contatos."
                  className="text-xs text-[#1A1D21] border-[#E5E1D8] pr-8"
                />
                {buscaContato && (
                  <button
                    type="button"
                    onClick={() => setBuscaContato('')}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-[#B3BAC4] hover:text-[#5B6470]"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
                {buscaContato && contatosFiltrados.length > 0 && (
                  <div className="absolute z-20 top-full mt-1 w-full rounded-lg border border-[#E5E1D8] bg-white shadow-md max-h-52 overflow-y-auto">
                    {contatosFiltrados.slice(0, 30).map((ct) => (
                      <button
                        key={ct.id}
                        type="button"
                        onClick={() => vincularContato(ct)}
                        className="w-full text-left px-3 py-2 hover:bg-[#F4F2EE] text-xs text-[#1A1D21] flex items-center gap-2"
                      >
                        <Avatar className="w-5 h-5">
                          <AvatarImage
                            src={`https://img.usecurling.com/ppl/128?seed=${encodeURIComponent(ct.nome)}`}
                            alt={ct.nome}
                          />
                          <AvatarFallback className="bg-gradient-to-br from-[#1E40AF] to-[#0F766E] text-white text-[7px] font-bold">
                            {iniciais(ct.nome)}
                          </AvatarFallback>
                        </Avatar>
                        <span className="truncate">{ct.nome}</span>
                        {ct.email && (
                          <span className="text-[10px] text-[#8A93A0] truncate">{ct.email}</span>
                        )}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
            {contatosVinculados.length > 0 && (
              <div className="flex flex-wrap gap-1.5 pl-7">
                {contatosVinculados.map((ct) => (
                  <span
                    key={ct.id}
                    className="inline-flex items-center gap-1.5 text-[11px] font-medium px-2 py-0.5 rounded-full bg-[#F4F2EE] text-[#1A1D21]"
                  >
                    {ct.nome}
                    <button
                      type="button"
                      onClick={() => desvincularContato(ct)}
                      className="text-[#8A93A0] hover:text-red-500"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
              </div>
            )}

            {/* Campos personalizados (categoria card) — reaproveita o painel existente */}
            <PainelCamposPersonalizados categoria="card" alvo={{ card: card.id }} />
          </div>

          {/* Tarefas do card (seção própria, fora da caixa principal) */}
          <SecaoTarefasCard
            cardId={card.id}
            tarefas={tarefas}
            membros={membros}
            onRecarregar={recarregarEventos}
            onTarefaCriada={() => recarregarEventos()}
          />
        </div>

        {/* ===================== COLUNA DIREITA: TIMELINE ===================== */}
        <div className="lg:col-span-2 rounded-2xl bg-white border border-[#E5E1D8] p-5 shadow-xs lg:sticky lg:top-4 max-h-[calc(100vh-2rem)] overflow-hidden flex flex-col">
          <TimelineCard
            cardId={card.id}
            eventos={eventos}
            membros={membros}
            onRecarregar={recarregarEventos}
          />
        </div>
      </div>
    </div>
  )
}
