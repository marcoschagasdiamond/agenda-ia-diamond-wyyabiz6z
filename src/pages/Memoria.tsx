import React, { useState, useEffect, useRef, useCallback } from 'react'
import {
  Brain,
  Send,
  Loader2,
  RefreshCw,
  Sparkles,
  User,
  Search,
  FolderOpen,
  MessageSquare,
  History,
  SlidersHorizontal,
  X,
  ChevronLeft,
  ChevronRight,
  CalendarDays,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { useToast } from '@/hooks/use-toast'
import { conversarComAnalistaStream } from '@/services/analistaMemoria'
import {
  buscaSemanticaMemoria,
  listarEpisodiosMemoria,
  type ResultadoSemantico,
  type EpisodioMemoria,
  type FiltrosBuscaSemantica,
  type TipoFiltroBusca,
} from '@/services/dossiesMemoria'
import ListaDossiesMemoria from '@/components/memoria/ListaDossiesMemoria'
import { cn } from '@/lib/utils'

type AbaMemoria = 'chat' | 'dossies' | 'semantica' | 'linha_tempo'

interface Mensagem {
  id: string
  sender: 'user' | 'assistant'
  content: string
  erro?: boolean
}

const CHIPS_SUGESTOES = [
  'O que decidimos com o cliente X na última conversa?',
  'Quais demandas do projeto Y estão paradas?',
  'Que sementes tenho no cofre com o parceiro Z?',
  'Resuma o histórico do contato A',
  'O que decidimos esta semana?',
]

const CHIPS_SEMANTICA = [
  'aquela conversa em que desistimos do preço alto',
  'o momento em que o cliente pediu agilidade',
  'quando o projeto ficou travado por falta de aprovação',
]

const TIPOS_FILTRO: Array<{ valor: TipoFiltroBusca | ''; rotulo: string }> = [
  { valor: '', rotulo: 'Todos os tipos' },
  { valor: 'dossie', rotulo: 'Dossiês' },
  { valor: 'resumo_dia', rotulo: 'Resumos do dia' },
  { valor: 'folha', rotulo: 'Registros da Folha' },
  { valor: 'card', rotulo: 'Cards de fluxo' },
  { valor: 'chat', rotulo: 'Conversas' },
  { valor: 'episodio', rotulo: 'Episódios' },
  { valor: 'memoria_compartilhada', rotulo: 'Memória compartilhada' },
]

const MENSAGEM_BOAS_VINDAS: Mensagem = {
  id: 'welcome',
  sender: 'assistant',
  content:
    'Olá! Eu sou a Diamantina, sua Analista de Memória — o segundo cérebro do Agenda IA Diamond.\nPergunte em português sobre seus contatos, projetos, fluxos, conversas, sementes do cofre ou resumos do dia, e eu respondo com base nos dados reais do sistema, indicando sempre de onde tirei cada informação. Começo pelos dossiês consolidados — mais rápidos e consistentes — e vou além quando o dossiê não cobre.',
}

// —— Painel de filtros da Busca Semântica (tipo, período, pessoa, negócio, projeto) ——
function PainelFiltrosSemantica({
  filtros,
  onChange,
  onLimpar,
  aplicados,
}: {
  filtros: FiltrosBuscaSemantica
  onChange: (f: FiltrosBuscaSemantica) => void
  onLimpar: () => void
  aplicados: string[]
}) {
  const temFiltro = Boolean(
    filtros.tipo_entidade ||
    filtros.data_inicio ||
    filtros.data_fim ||
    filtros.pessoa ||
    filtros.negocio ||
    filtros.projeto,
  )
  const set = (patch: Partial<FiltrosBuscaSemantica>) => onChange({ ...filtros, ...patch })

  return (
    <div className="bg-white border border-[#E5E1D8] rounded-xl p-3 shadow-2xs space-y-2.5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5 text-xs font-semibold text-[#1A1D21]">
          <SlidersHorizontal className="w-3.5 h-3.5 text-[#0F766E]" /> Filtros
          {temFiltro && (
            <Badge className="bg-[#0F766E]/10 text-[#0F766E] text-[9px] border-transparent">
              ativos
            </Badge>
          )}
        </div>
        {temFiltro && (
          <button
            type="button"
            onClick={onLimpar}
            className="text-[10px] text-[#5B6470] hover:text-[#0F766E] flex items-center gap-1"
          >
            <X className="w-3 h-3" /> limpar
          </button>
        )}
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        <label className="block">
          <span className="text-[10px] font-medium text-[#5B6470] uppercase tracking-wide">
            Tipo
          </span>
          <select
            value={filtros.tipo_entidade || ''}
            onChange={(e) => set({ tipo_entidade: e.target.value as TipoFiltroBusca | '' })}
            className="mt-0.5 w-full h-8 text-xs rounded-md border border-[#E5E1D8] bg-white px-2 focus:outline-none focus:ring-1 focus:ring-[#0F766E]"
          >
            {TIPOS_FILTRO.map((t) => (
              <option key={t.valor} value={t.valor}>
                {t.rotulo}
              </option>
            ))}
          </select>
        </label>
        <div>
          <span className="text-[10px] font-medium text-[#5B6470] uppercase tracking-wide">
            Período
          </span>
          <div className="flex items-center gap-1 mt-0.5">
            <Input
              type="date"
              value={filtros.data_inicio || ''}
              onChange={(e) => set({ data_inicio: e.target.value })}
              className="h-8 text-[11px] bg-white border-[#E5E1D8]"
            />
            <span className="text-[10px] text-[#5B6470]">até</span>
            <Input
              type="date"
              value={filtros.data_fim || ''}
              onChange={(e) => set({ data_fim: e.target.value })}
              className="h-8 text-[11px] bg-white border-[#E5E1D8]"
            />
          </div>
        </div>
        <Input
          value={filtros.pessoa || ''}
          onChange={(e) => set({ pessoa: e.target.value })}
          placeholder="Pessoa (nome do contato)"
          className="h-8 text-xs bg-white border-[#E5E1D8]"
        />
        <Input
          value={filtros.negocio || ''}
          onChange={(e) => set({ negocio: e.target.value })}
          placeholder="Negócio"
          className="h-8 text-xs bg-white border-[#E5E1D8]"
        />
        <Input
          value={filtros.projeto || ''}
          onChange={(e) => set({ projeto: e.target.value })}
          placeholder="Projeto"
          className="h-8 text-xs bg-white border-[#E5E1D8] sm:col-span-2"
        />
      </div>
      {aplicados.length > 0 && (
        <div className="flex flex-wrap gap-1 pt-0.5">
          {aplicados.map((f) => (
            <Badge
              key={f}
              variant="outline"
              className="text-[9px] border-[#0F766E]/30 text-[#0F766E] bg-[#0F766E]/5"
            >
              {f}
            </Badge>
          ))}
        </div>
      )}
    </div>
  )
}

// —— Aba Linha do Tempo: episódios da memória episódica, agrupados por data, paginados ——
function AbaLinhaTempo() {
  const [episodios, setEpisodios] = useState<EpisodioMemoria[]>([])
  const [page, setPage] = useState(1)
  const [totalItens, setTotalItens] = useState(0)
  const [carregando, setCarregando] = useState(true)
  const [expandido, setExpandido] = useState<string | null>(null)
  const PER_PAGE = 7

  const carregar = useCallback(async (p: number) => {
    setCarregando(true)
    try {
      const res = await listarEpisodiosMemoria(p, PER_PAGE)
      setEpisodios(res.itens)
      setPage(res.page)
      setTotalItens(res.totalItens)
    } catch {
      setEpisodios([])
      setTotalItens(0)
    } finally {
      setCarregando(false)
    }
  }, [])

  useEffect(() => {
    carregar(1)
  }, [carregar])

  const totalPaginas = Math.max(1, Math.ceil(totalItens / PER_PAGE))

  return (
    <div className="flex-1 p-4 overflow-y-auto bg-[#F4F2EE]/40 min-h-0 space-y-3">
      <div>
        <h3 className="text-sm font-bold text-[#1A1D21]">Linha do Tempo</h3>
        <p className="text-[11px] text-[#5B6470]">
          Um episódio por dia: o que foi feito, o que ficou pendente e o que foi carregado do dia
          anterior. {totalItens > 0 ? `${totalItens} episódio(s) na memória.` : ''}
        </p>
      </div>

      {carregando ? (
        <div className="flex items-center justify-center py-10 text-xs text-[#5B6470] gap-2">
          <Loader2 className="w-4 h-4 animate-spin text-[#0F766E]" /> Carregando episódios…
        </div>
      ) : episodios.length === 0 ? (
        <div className="text-xs text-[#5B6470] bg-white border border-[#E5E1D8] rounded-xl p-4">
          Nenhum episódio registrado ainda. A cada dia com atividade na Folha, a Diamantina cria um
          episódio aqui — com as pendências que foram carregadas do dia anterior.
        </div>
      ) : (
        <div className="space-y-2">
          {episodios.map((ep) => {
            const aberto = expandido === ep.id
            const pendencias = (() => {
              try {
                const v =
                  typeof ep.pendencias_carregadas === 'string'
                    ? JSON.parse(ep.pendencias_carregadas || '[]')
                    : ep.pendencias_carregadas
                return Array.isArray(v) ? v : []
              } catch {
                return []
              }
            })()
            return (
              <div
                key={ep.id}
                className="bg-white border border-[#E5E1D8] rounded-xl p-3 shadow-2xs"
              >
                <button
                  type="button"
                  onClick={() => setExpandido(aberto ? null : ep.id)}
                  className="w-full text-left"
                >
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-lg bg-[#0F766E]/10 text-[#0F766E] flex items-center justify-center">
                        <CalendarDays className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="text-xs font-semibold text-[#1A1D21]">
                          {formatarDataEpisodio(ep.data)}
                        </div>
                        <div className="text-[10px] text-[#5B6470]">
                          {ep.titulo || `${ep.total_registros ?? 0} registro(s) no dia`}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5">
                      {pendencias.length > 0 && (
                        <Badge
                          variant="outline"
                          className="text-[9px] border-amber-200 text-amber-700 bg-amber-50"
                        >
                          {pendencias.length} pendência(s) carregada(s)
                        </Badge>
                      )}
                      <Badge
                        variant="outline"
                        className="text-[9px] border-[#E5E1D8] text-[#5B6470]"
                      >
                        {aberto ? 'fechar' : 'abrir'}
                      </Badge>
                    </div>
                  </div>
                  <p
                    className={cn(
                      'text-[11px] text-[#1A1D21] mt-2 whitespace-pre-wrap leading-relaxed',
                      !aberto && 'line-clamp-2',
                    )}
                  >
                    {ep.resumo || 'Sem resumo registrado.'}
                  </p>
                </button>
                {aberto && (
                  <div className="mt-2 pt-2 border-t border-[#E5E1D8] space-y-1.5">
                    {pendencias.length > 0 && (
                      <div>
                        <div className="text-[10px] font-semibold text-[#5B6470] uppercase tracking-wide">
                          Pendências carregadas do dia anterior
                        </div>
                        <ul className="list-disc list-inside text-[11px] text-[#1A1D21] mt-1 space-y-0.5">
                          {pendencias.map((p: string, i: number) => (
                            <li key={i}>{String(p)}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                    {ep.created && (
                      <p className="text-[10px] text-[#5B6470]">
                        Registrado em {new Date(ep.created).toLocaleString('pt-BR')}
                      </p>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {totalPaginas > 1 && (
        <div className="flex items-center justify-between pt-1">
          <Button
            variant="outline"
            size="sm"
            disabled={page <= 1 || carregando}
            onClick={() => carregar(page - 1)}
            className="h-8 text-xs border-[#E5E1D8] gap-1"
          >
            <ChevronLeft className="w-3.5 h-3.5" /> Anterior
          </Button>
          <span className="text-[11px] text-[#5B6470]">
            Página {page} de {totalPaginas}
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={page >= totalPaginas || carregando}
            onClick={() => carregar(page + 1)}
            className="h-8 text-xs border-[#E5E1D8] gap-1"
          >
            Próxima <ChevronRight className="w-3.5 h-3.5" />
          </Button>
        </div>
      )}
    </div>
  )
}

const formatarDataEpisodio = (data: string): string => {
  if (!data) return 'Data desconhecida'
  const d = new Date(`${String(data).slice(0, 10)}T12:00:00`)
  if (isNaN(d.getTime())) return String(data)
  return d.toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long' })
}

export default function Memoria() {
  const { toast } = useToast()
  const [aba, setAba] = useState<AbaMemoria>('chat')
  const [mensagens, setMensagens] = useState<Mensagem[]>([MENSAGEM_BOAS_VINDAS])
  const [texto, setTexto] = useState('')
  const [carregando, setCarregando] = useState(false)
  const [conversationId, setConversationId] = useState<string | null>(null)
  const fimRef = useRef<HTMLDivElement>(null)

  // Busca semântica (com filtros)
  const [perguntaSemantica, setPerguntaSemantica] = useState('')
  const [resultadosSemanticos, setResultadosSemanticos] = useState<ResultadoSemantico[] | null>(
    null,
  )
  const [observacaoSemantica, setObservacaoSemantica] = useState('')
  const [buscandoSemantica, setBuscandoSemantica] = useState(false)
  const [filtros, setFiltros] = useState<FiltrosBuscaSemantica>({})
  const [filtrosAplicados, setFiltrosAplicados] = useState<string[]>([])

  useEffect(() => {
    fimRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [mensagens, carregando])

  const enviarPergunta = useCallback(
    async (perguntaOriginal: string) => {
      const pergunta = perguntaOriginal.trim()
      if (!pergunta || carregando) return

      setTexto('')
      setMensagens((prev) => [
        ...prev,
        { id: `u-${Date.now()}`, sender: 'user', content: pergunta },
      ])
      setCarregando(true)

      const respostaId = `a-${Date.now()}`
      setMensagens((prev) => [...prev, { id: respostaId, sender: 'assistant', content: '' }])

      try {
        const resultado = await conversarComAnalistaStream(
          pergunta,
          conversationId,
          (textoAcumulado) => {
            setMensagens((prev) =>
              prev.map((m) => (m.id === respostaId ? { ...m, content: textoAcumulado } : m)),
            )
          },
        )

        if (resultado.conversation_id) setConversationId(resultado.conversation_id)

        setMensagens((prev) =>
          prev.map((m) =>
            m.id === respostaId ? { ...m, content: resultado.content || 'Compreendido.' } : m,
          ),
        )
      } catch (err) {
        const mensagemErro = (err as Error)?.message || 'Falha desconhecida.'
        setMensagens((prev) =>
          prev.map((m) =>
            m.id === respostaId
              ? {
                  ...m,
                  erro: true,
                  content:
                    'Desculpe, tive uma instabilidade temporária ao consultar sua memória. Pode tentar de novo?',
                }
              : m,
          ),
        )
        toast({
          title: 'Erro na Analista de Memória',
          description: mensagemErro,
          variant: 'destructive',
        })
      } finally {
        setCarregando(false)
      }
    },
    [carregando, conversationId, toast],
  )

  const rodarBuscaSemantica = useCallback(
    async (perguntaOriginal: string) => {
      const pergunta = perguntaOriginal.trim()
      if (!pergunta || buscandoSemantica) return
      setBuscandoSemantica(true)
      setPerguntaSemantica(pergunta)
      setResultadosSemanticos(null)
      setObservacaoSemantica('')
      try {
        const res = await buscaSemanticaMemoria(pergunta, filtros)
        setResultadosSemanticos(res.resultados || [])
        setObservacaoSemantica(res.observacao || '')
        setFiltrosAplicados(res.filtros_aplicados || [])
        if (!res.resultados || res.resultados.length === 0) {
          toast({
            title: 'Nada encontrado por significado',
            description:
              res.observacao ||
              (res.filtros_aplicados && res.filtros_aplicados.length > 0
                ? 'Nenhum registro passou pelos filtros aplicados.'
                : 'Tente reformular a pergunta.'),
          })
        }
      } catch (err) {
        toast({
          title: 'Erro na busca semântica',
          description: (err as Error)?.message || 'Falha desconhecida.',
          variant: 'destructive',
        })
      } finally {
        setBuscandoSemantica(false)
      }
    },
    [buscandoSemantica, filtros, toast],
  )

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      enviarPergunta(texto)
    }
  }

  const novaSessao = () => {
    setConversationId(null)
    setMensagens([
      {
        ...MENSAGEM_BOAS_VINDAS,
        id: `welcome-${Date.now()}`,
        content:
          'Nova sessão iniciada. A memória durável da Diamantina continua preservada — os destaques das conversas anteriores seguem disponíveis. Sobre o que vamos analisar agora?',
      },
    ])
  }

  return (
    <div className="flex flex-col h-[calc(100vh-7.5rem)] max-w-4xl mx-auto bg-white rounded-xl border border-[#E5E1D8] shadow-xs overflow-hidden">
      {/* Cabeçalho */}
      <div className="p-4 border-b border-[#E5E1D8] flex items-center justify-between bg-[#FAFAF9]">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-[#0F766E] flex items-center justify-center text-white shadow-sm">
            <Brain className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-bold text-[#1A1D21]">Analista de Memória</h2>
              <Badge
                className="bg-emerald-50 text-emerald-700 text-[10px] border-emerald-200"
                variant="outline"
              >
                Segundo cérebro · Memória em camadas
              </Badge>
            </div>
            <p className="text-[11px] text-[#5B6470]">
              Dossiês consolidados + busca por significado + dados em tempo real — citando sempre a
              origem de cada informação.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 flex-wrap">
          <Button
            variant={aba === 'chat' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setAba('chat')}
            className={cn(
              'text-xs h-8 gap-1 border-[#E5E1D8]',
              aba === 'chat' && 'bg-[#0F766E] hover:bg-[#0D5C56] text-white border-transparent',
            )}
          >
            <MessageSquare className="w-3.5 h-3.5" /> Conversar
          </Button>
          <Button
            variant={aba === 'dossies' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setAba('dossies')}
            className={cn(
              'text-xs h-8 gap-1 border-[#E5E1D8]',
              aba === 'dossies' && 'bg-[#0F766E] hover:bg-[#0D5C56] text-white border-transparent',
            )}
          >
            <FolderOpen className="w-3.5 h-3.5" /> Dossiês
          </Button>
          <Button
            variant={aba === 'semantica' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setAba('semantica')}
            className={cn(
              'text-xs h-8 gap-1 border-[#E5E1D8]',
              aba === 'semantica' &&
                'bg-[#0F766E] hover:bg-[#0D5C56] text-white border-transparent',
            )}
          >
            <Search className="w-3.5 h-3.5" /> Busca semântica
          </Button>
          <Button
            variant={aba === 'linha_tempo' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setAba('linha_tempo')}
            className={cn(
              'text-xs h-8 gap-1 border-[#E5E1D8]',
              aba === 'linha_tempo' &&
                'bg-[#0F766E] hover:bg-[#0D5C56] text-white border-transparent',
            )}
          >
            <History className="w-3.5 h-3.5" /> Linha do Tempo
          </Button>
          {aba === 'chat' && (
            <Button
              variant="outline"
              size="sm"
              onClick={novaSessao}
              className="text-xs h-8 border-[#E5E1D8] text-[#5B6470] gap-1"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Nova conversa
            </Button>
          )}
        </div>
      </div>

      {aba === 'chat' && (
        <>
          {/* Feed de mensagens */}
          <div className="flex-1 p-4 overflow-y-auto space-y-4 bg-[#F4F2EE]/40 min-h-0">
            {mensagens.map((msg) => {
              const isUser = msg.sender === 'user'
              return (
                <div
                  key={msg.id}
                  className={`flex items-start gap-2.5 max-w-[85%] ${isUser ? 'ml-auto flex-row-reverse' : ''}`}
                >
                  <div
                    className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 text-xs font-bold ${
                      isUser ? 'bg-[#E5E1D8] text-[#1A1D21]' : 'bg-[#0F766E] text-white shadow-2xs'
                    }`}
                  >
                    {isUser ? <User className="w-4 h-4" /> : <Brain className="w-4 h-4" />}
                  </div>

                  <div
                    className={`p-3.5 rounded-2xl text-xs leading-relaxed shadow-2xs whitespace-pre-wrap ${
                      msg.erro
                        ? 'bg-red-50 text-red-900 border border-red-200 rounded-tl-none'
                        : isUser
                          ? 'bg-[#0F766E] text-white rounded-tr-none'
                          : 'bg-white text-[#1A1D21] border border-[#E5E1D8] rounded-tl-none'
                    }`}
                  >
                    {msg.content || '…'}
                  </div>
                </div>
              )
            })}

            {carregando && (
              <div className="flex items-center gap-2 text-xs text-[#5B6470] p-2 animate-pulse">
                <Sparkles className="w-4 h-4 text-[#0F766E]" />
                <span>Diamantina está pensando…</span>
              </div>
            )}
            <div ref={fimRef} />
          </div>

          {/* Chips de sugestões */}
          <div className="px-4 pt-3 pb-1 bg-white border-t border-[#E5E1D8]">
            <div className="flex flex-wrap gap-1.5">
              {CHIPS_SUGESTOES.map((chip) => (
                <button
                  key={chip}
                  type="button"
                  disabled={carregando}
                  onClick={() => enviarPergunta(chip)}
                  className="text-[11px] px-2.5 py-1 rounded-full border border-[#E5E1D8] bg-[#FAFAF9] text-[#5B6470] hover:bg-[#0F766E]/5 hover:border-[#0F766E]/40 hover:text-[#0F766E] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {chip}
                </button>
              ))}
            </div>
          </div>

          {/* Campo de envio */}
          <div className="p-3 bg-white">
            <form
              onSubmit={(e) => {
                e.preventDefault()
                enviarPergunta(texto)
              }}
              className="flex items-end gap-2"
            >
              <Textarea
                rows={2}
                value={texto}
                onChange={(e) => setTexto(e.target.value)}
                onKeyDown={handleKeyDown}
                disabled={carregando}
                placeholder="Pergunte sobre seus negócios: 'O que decidimos com o cliente X?', 'Quais demandas estão paradas?'…"
                className="text-xs resize-none border-[#E5E1D8] focus-visible:ring-1 focus-visible:ring-[#0F766E]"
              />
              <Button
                type="submit"
                disabled={carregando || !texto.trim()}
                className="bg-[#0F766E] hover:bg-[#0D5C56] text-white h-14 px-4 shrink-0 shadow-sm"
              >
                {carregando ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Send className="w-4 h-4" />
                )}
              </Button>
            </form>
            <p className="text-[10px] text-[#5B6470] mt-1.5 text-center">
              Pressione Enter para enviar. Shift + Enter para quebra de linha.
            </p>
          </div>
        </>
      )}

      {aba === 'dossies' && (
        <div className="flex-1 p-4 overflow-hidden bg-[#F4F2EE]/40 min-h-0">
          <ListaDossiesMemoria />
        </div>
      )}

      {aba === 'linha_tempo' && <AbaLinhaTempo />}

      {aba === 'semantica' && (
        <div className="flex-1 p-4 overflow-y-auto bg-[#F4F2EE]/40 min-h-0 space-y-3">
          <div>
            <h3 className="text-sm font-bold text-[#1A1D21]">Busca por significado</h3>
            <p className="text-[11px] text-[#5B6470]">
              Descreva o que você lembra — mesmo sem as palavras exatas do registro. Use os filtros
              para restringir por tipo, período, pessoa, negócio ou projeto.
            </p>
          </div>

          <PainelFiltrosSemantica
            filtros={filtros}
            onChange={setFiltros}
            onLimpar={() => setFiltros({})}
            aplicados={filtrosAplicados}
          />

          <div className="flex flex-wrap gap-1.5">
            {CHIPS_SEMANTICA.map((chip) => (
              <button
                key={chip}
                type="button"
                disabled={buscandoSemantica}
                onClick={() => rodarBuscaSemantica(chip)}
                className="text-[11px] px-2.5 py-1 rounded-full border border-[#E5E1D8] bg-[#FAFAF9] text-[#5B6470] hover:bg-[#0F766E]/5 hover:border-[#0F766E]/40 hover:text-[#0F766E] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {chip}
              </button>
            ))}
          </div>
          <form
            onSubmit={(e) => {
              e.preventDefault()
              rodarBuscaSemantica(perguntaSemantica)
            }}
            className="flex items-center gap-2"
          >
            <Input
              value={perguntaSemantica}
              onChange={(e) => setPerguntaSemantica(e.target.value)}
              placeholder="Ex.: 'aquela conversa em que desistimos do preço alto'…"
              className="text-xs h-9 bg-white border-[#E5E1D8]"
              disabled={buscandoSemantica}
            />
            <Button
              type="submit"
              disabled={buscandoSemantica || !perguntaSemantica.trim()}
              className="bg-[#0F766E] hover:bg-[#0D5C56] text-white h-9 px-4 shrink-0"
            >
              {buscandoSemantica ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Search className="w-4 h-4" />
              )}
            </Button>
          </form>

          {resultadosSemanticos !== null && (
            <div className="space-y-2">
              {resultadosSemanticos.length === 0 ? (
                <div className="text-xs text-[#5B6470] bg-white border border-[#E5E1D8] rounded-xl p-4">
                  {observacaoSemantica || 'Nada encontrado ainda com esse significado.'}
                </div>
              ) : (
                resultadosSemanticos.map((r) => (
                  <div
                    key={r.id}
                    className="bg-white border border-[#E5E1D8] rounded-xl p-3 shadow-2xs"
                  >
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <span className="text-xs font-semibold text-[#1A1D21]">{r.fonte}</span>
                      <div className="flex items-center gap-1.5">
                        <Badge
                          variant="outline"
                          className="text-[9px] border-[#E5E1D8] text-[#5B6470]"
                        >
                          {r.tipo}
                        </Badge>
                        <Badge
                          variant="outline"
                          className={cn(
                            'text-[9px]',
                            r.confianca === 'alta'
                              ? 'border-emerald-200 text-emerald-700 bg-emerald-50'
                              : r.confianca === 'media'
                                ? 'border-amber-200 text-amber-700 bg-amber-50'
                                : 'border-[#E5E1D8] text-[#5B6470] bg-[#FAFAF9]',
                          )}
                        >
                          confiança {r.confianca}
                        </Badge>
                      </div>
                    </div>
                    <p className="text-[11px] text-[#1A1D21] mt-1.5 whitespace-pre-wrap leading-relaxed">
                      {r.trecho}
                    </p>
                    <p className="text-[10px] text-[#5B6470] mt-1.5 italic">
                      {r.justificativa}
                      {r.data ? ` · ${new Date(r.data).toLocaleDateString('pt-BR')}` : ''}
                    </p>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
