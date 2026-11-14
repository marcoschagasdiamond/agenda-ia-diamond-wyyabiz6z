// Painel do "Caçador de Sementes" — Diamantina, funcionária de IA (agente nativo
// 'diamantina-cacador-sementes'). Renderiza na aba Sementes da /folha quando
// filtrosFolha.estadoArquivo === 'sementes'. Pacote dos 4:
//  - Sugestões ordenadas por pontuação (ranking visível), motivo + contra-argumento;
//  - Feedback (germinada / ignorada) gravado via endpoints do hook backend;
//  - Histórico por datas (seletor estilo PainelResumoDia) com rastro por sugestão,
//    taxa de acerto e selo "insistente" para sementes recorrentes;
//  - Dashboard do cofre: cartões de resumo, visão por tese, ranking de
//    parceiros/negócios e idade do cofre (semente mais antiga em espera).
// Clique numa sugestão abre o ModalGerminarSemente com o título pré-preenchido.
import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  Loader2,
  RefreshCw,
  Sprout,
  ChevronRight,
  ChevronLeft,
  History,
  Flame,
  Target,
  Trophy,
  Hourglass,
  CheckCircle2,
  XCircle,
  CalendarDays,
  Bot,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  listarSugestoesDoDia,
  listarSugestoesPaginado,
  gerarSugestoesAgora,
  registrarFeedbackSugestao,
  parseSugestoesGerminacao,
  parseStatusRegistros,
  dataDeHojeLocal,
  formatarDataPtBr,
  rotuloRelativoDia,
  totalAparicoes,
  idadeDias,
  type SugestoesSementeDia,
  type SugestaoGerminacao,
} from '@/services/cacadorSementes'
import DashboardCacador from '@/components/folha/DashboardCacador'
import { useToast } from '@/hooks/use-toast'
import { cn } from '@/lib/utils'

interface Props {
  /** Recebe o folha_id da sugestão clicada — a Folha localiza o item e germina. */
  onSugerirGerminacao: (folhaId: string, sugestao: SugestaoGerminacao) => void
}

const POR_PAGINA_HISTORICO = 7

/** Cor/rótulo do badge de status (rastro) de uma sugestão. */
const RASTRO: Record<string, { rotulo: string; classe: string }> = {
  germinada: {
    rotulo: 'Germinada 🌱',
    classe: 'bg-emerald-100 text-emerald-800 border-emerald-300',
  },
  ignorada: {
    rotulo: 'Ignorada',
    classe: 'bg-stone-100 text-stone-600 border-stone-300',
  },
  madura: {
    rotulo: 'Ainda madura',
    classe: 'bg-amber-100 text-amber-900 border-amber-300',
  },
}

/** Linha de uma sugestão: ranking, motivo, contra-argumento, rastro e feedback. */
const CardSugestao: React.FC<{
  sugestao: SugestaoGerminacao
  posicao: number
  insistente: boolean
  status: string
  processando: boolean
  onSugerirGerminacao: Props['onSugerirGerminacao']
  onFeedback: (folhaId: string, tipo: 'germinar' | 'ignorar') => void
}> = ({ sugestao, posicao, insistente, status, processando, onSugerirGerminacao, onFeedback }) => {
  const score = sugestao.score ?? 0
  const rastro = RASTRO[status] || RASTRO.madura
  return (
    <div
      className={cn(
        'p-3 rounded-lg border bg-[#FAFAF9] transition-all space-y-2',
        status === 'germinada'
          ? 'border-emerald-400/70 bg-emerald-50/40'
          : status === 'ignorada'
            ? 'border-[#E5E1D8] opacity-70'
            : 'border-[#E5E1D8] hover:border-emerald-500/50',
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-2.5 min-w-0">
          {/* Posição no ranking pela pontuação */}
          <span
            className={cn(
              'flex items-center justify-center w-6 h-6 rounded-full text-[11px] font-bold shrink-0 mt-0.5',
              posicao === 1
                ? 'bg-amber-100 text-amber-800 ring-1 ring-amber-300'
                : posicao <= 3
                  ? 'bg-emerald-100 text-emerald-800'
                  : 'bg-stone-100 text-stone-600',
            )}
            title={`Pontuação ${score}`}
          >
            {posicao}
          </span>
          <div className="min-w-0 space-y-1">
            <button
              type="button"
              onClick={() => onSugerirGerminacao(sugestao.folha_id || '', sugestao)}
              className="text-left group w-full"
            >
              <p className="text-xs font-semibold text-[#1A1D21] group-hover:text-emerald-800 truncate flex items-center gap-1.5">
                {sugestao.titulo_card_sugerido || sugestao.tese || 'Semente madura'}
                {insistente && (
                  <Badge className="bg-orange-100 text-orange-800 border border-orange-300 text-[9px] px-1 py-0 font-bold gap-0.5 shadow-2xs">
                    <Flame className="w-2.5 h-2.5" /> insistente
                  </Badge>
                )}
              </p>
            </button>
            <div className="flex flex-wrap items-center gap-1.5 text-[11px] text-[#5B6470]">
              {sugestao.tese && <span className="truncate">🎯 {sugestao.tese}</span>}
              {typeof score === 'number' && score > 0 && (
                <span className="font-semibold text-emerald-700">score {score}</span>
              )}
              {sugestao.prioridade && <span>• prioridade {sugestao.prioridade}</span>}
              {sugestao.urgente && <span className="text-rose-700 font-semibold">• urgente</span>}
              {insistente && (
                <span className="text-orange-700">• volta recorrente nas caçadas</span>
              )}
            </div>
            {sugestao.motivo && (
              <p className="text-[11px] text-[#5B6470] leading-relaxed">
                <span className="font-medium text-[#1A1D21]">Por quê:</span> {sugestao.motivo}
              </p>
            )}
            {sugestao.contra_argumento && (
              <p className="text-[11px] text-[#5B6470] leading-relaxed">
                <span className="font-medium text-[#1A1D21]">Por que esperar:</span>{' '}
                {sugestao.contra_argumento}
              </p>
            )}
          </div>
        </div>
        <Badge
          variant="outline"
          className={cn('text-[10px] font-semibold shrink-0', rastro.classe)}
        >
          {rastro.rotulo}
        </Badge>
      </div>

      {/* Feedback (aprendizado): só quando ainda não decidiu */}
      {sugestao.folha_id && status === 'madura' && (
        <div className="flex items-center gap-2 pt-1 pl-[34px]">
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={processando}
            onClick={() => onFeedback(sugestao.folha_id as string, 'germinar')}
            className="h-7 text-[11px] gap-1 border-emerald-300 text-emerald-800 hover:bg-emerald-50"
          >
            {processando ? (
              <Loader2 className="w-3 h-3 animate-spin" />
            ) : (
              <CheckCircle2 className="w-3 h-3" />
            )}
            Germinada
          </Button>
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={processando}
            onClick={() => onFeedback(sugestao.folha_id as string, 'ignorar')}
            className="h-7 text-[11px] gap-1 border-stone-300 text-stone-600 hover:bg-stone-50"
          >
            <XCircle className="w-3 h-3" />
            Ignorar
          </Button>
          <span className="text-[10px] text-[#5B6470]">o Caçador aprende com o seu feedback</span>
        </div>
      )}
    </div>
  )
}

export default function PainelCacadorSementes({ onSugerirGerminacao }: Props) {
  const { toast } = useToast()
  const [registro, setRegistro] = useState<SugestoesSementeDia | null>(null)
  const [historico, setHistorico] = useState<SugestoesSementeDia[]>([])
  const [totalHistorico, setTotalHistorico] = useState(0)
  const [pagina, setPagina] = useState(1)
  const [dataSelecionada, setDataSelecionada] = useState<string | null>(null)
  const [carregando, setCarregando] = useState(true)
  const [gerando, setGerando] = useState(false)
  const [feedbackEmAndamento, setFeedbackEmAndamento] = useState<string | null>(null)

  const carregar = useCallback(
    async (paginaDesejada = 1) => {
      setCarregando(true)
      try {
        const { itens, total } = await listarSugestoesPaginado(paginaDesejada, POR_PAGINA_HISTORICO)
        setHistorico(itens)
        setTotalHistorico(total)
        setPagina(paginaDesejada)
        setDataSelecionada((atual) => {
          if (atual && itens.some((r) => r.data_geracao === atual)) return atual
          return itens[0]?.data_geracao ?? null
        })
      } catch (err) {
        console.error('Erro ao carregar caçadas do Caçador:', err)
        toast({
          title: 'Erro ao carregar as sugestões',
          description: (err as Error)?.message || 'Tente novamente em instantes.',
          variant: 'destructive',
        })
      } finally {
        setCarregando(false)
      }
    },
    [toast],
  )

  useEffect(() => {
    void carregar(1)
  }, [carregar])

  const handleGerar = async () => {
    setGerando(true)
    try {
      await gerarSugestoesAgora()
      toast({
        title: 'Caçada concluída 🌱',
        description: 'Sugestões do Caçador de Sementes atualizadas.',
      })
      await carregar(1)
    } catch (err) {
      toast({
        title: 'Erro ao caçar sementes',
        description: (err as Error)?.message,
        variant: 'destructive',
      })
    } finally {
      setGerando(false)
    }
  }

  /** Feedback (germinar/ignorar) numa sugestão — grava o aprendizado no backend. */
  const handleFeedback = async (folhaId: string, tipo: 'germinar' | 'ignorar') => {
    if (!registro) return
    setFeedbackEmAndamento(folhaId)
    try {
      await registrarFeedbackSugestao(registro.data_geracao, folhaId, tipo)
      toast({
        title: tipo === 'germinar' ? 'Semente germinada! 🌱' : 'Sugestão ignorada',
        description:
          tipo === 'germinar'
            ? 'O Caçador vai priorizar sementes parecidas nas próximas caçadas.'
            : 'O Caçador vai sugerir menos sementes assim nas próximas caçadas.',
      })
      await carregar(pagina)
    } catch (err) {
      toast({
        title: 'Erro ao registrar feedback',
        description: (err as Error)?.message,
        variant: 'destructive',
      })
    } finally {
      setFeedbackEmAndamento(null)
    }
  }

  const ehHoje = registro?.data_geracao === dataDeHojeLocal()

  // Registro mostrado no corpo: o do dia (para caçar/feedback) ou o do seletor de datas.
  const registroCorpo: SugestoesSementeDia | null = useMemo(() => {
    if (dataSelecionada) {
      const doDia = historico.find((r) => r.data_geracao === dataSelecionada)
      if (doDia) return doDia
    }
    return registro
  }, [dataSelecionada, historico, registro])

  const sugestoes = useMemo(
    () => parseSugestoesGerminacao(registroCorpo).sort((a, b) => (b.score || 0) - (a.score || 0)),
    [registroCorpo],
  )
  const statusMap = useMemo(() => parseStatusRegistros(registroCorpo), [registroCorpo])
  const statusDe = (folhaId?: string) => (folhaId && statusMap[folhaId]?.status) || 'madura'

  const totalGeral = registroCorpo?.total_sementes ?? 0
  const totalMaduras = registroCorpo?.total_maduras ?? sugestoes.length
  const totalGerminadas = registroCorpo?.total_germinadas ?? 0
  const totalIgnoradas = registroCorpo?.total_ignoradas ?? 0
  const decididas = totalGerminadas + totalIgnoradas
  const taxaAcerto = decididas > 0 ? Math.round((totalGerminadas / decididas) * 100) : 0

  // Selo "insistente": a contagem de aparições vem de TODAS as caçadas do histórico
  const aparicoesAcumuladas = useMemo(() => {
    const mapa: Record<string, number> = {}
    historico.forEach((r) => {
      parseSugestoesGerminacao(r).forEach((s) => {
        if (!s.folha_id) return
        mapa[s.folha_id] = Math.max(mapa[s.folha_id] || 0, totalAparicoes(s))
      })
    })
    return mapa
  }, [historico])

  const totalPaginas = Math.max(1, Math.ceil(totalHistorico / POR_PAGINA_HISTORICO))
  const rotuloDia = rotuloRelativoDia(registroCorpo?.data_geracao)

  return (
    <div className="bg-white border border-[#E5E1D8] rounded-xl shadow-xs overflow-hidden">
      {/* Cabeçalho */}
      <div className="flex items-center justify-between gap-2 px-4 py-3 border-b border-[#E5E1D8]/70">
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center shrink-0">
            <Sprout className="w-4 h-4 text-emerald-700" />
          </div>
          <div className="min-w-0">
            <h2 className="text-sm font-semibold text-[#1A1D21] truncate flex items-center gap-2">
              Sugestões do Caçador de Sementes
              <Badge className="bg-emerald-100 text-emerald-800 hover:bg-emerald-100 border-none text-[9px] px-1.5 py-0 font-bold gap-1">
                <Bot className="w-3 h-3" />
                DIAMANTINA · FUNCIONÁRIA DE IA
              </Badge>
            </h2>
            <p className="text-[11px] text-[#5B6470] truncate">
              A Diamantina olha para o seu cofre e aponta sementes maduras para germinar hoje.
            </p>
          </div>
        </div>
        <Button
          type="button"
          size="sm"
          onClick={handleGerar}
          disabled={gerando || carregando}
          className="h-8 text-xs bg-[#0F766E] hover:bg-[#0D5C56] gap-1.5 shrink-0"
        >
          {gerando ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <RefreshCw className="w-3.5 h-3.5" />
          )}
          {gerando ? 'Caçando…' : 'Gerar sugestões agora'}
        </Button>
      </div>

      {carregando ? (
        <div className="flex items-center justify-center gap-2 px-4 py-8 text-xs text-[#5B6470]">
          <Loader2 className="w-4 h-4 animate-spin text-[#0F766E]" />
          Buscando sugestões do Caçador…
        </div>
      ) : !registroCorpo ? (
        <div className="px-4 py-6 text-center space-y-2">
          <p className="text-xs font-medium text-[#1A1D21]">
            Nenhuma caçada ainda. O Caçador vai voltar a olhar o cofre às 21h — ou clique em "Gerar
            sugestões agora".
          </p>
        </div>
      ) : (
        <div className="px-4 py-3 space-y-4">
          {/* Dashboard do cofre (cartões, teses, ranking de parceiros, idade) */}
          <DashboardCacador
            itens={historico}
            registroHoje={registro}
            totalSugestoesDia={sugestoes.length}
          />

          {/* Data da caçada exibida */}
          <div className="flex flex-wrap items-center gap-2">
            <Badge
              variant="outline"
              className="bg-white border-[#E5E1D8] text-[#1A1D21] text-[11px] font-semibold gap-1"
            >
              <CalendarDays className="w-3 h-3 text-emerald-700" />
              Caçada de {formatarDataPtBr(registroCorpo.data_geracao)}
              {rotuloDia && <span className="text-emerald-700">· {rotuloDia}</span>}
            </Badge>
            {!ehHoje && (
              <span className="text-[10px] text-[#5B6470]">
                dia anterior — clique no botão acima para caçar as sugestões de hoje
              </span>
            )}
          </div>

          {/* Contadores */}
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[11px] font-medium text-[#5B6470] bg-[#F4F2EE] px-2.5 py-1 rounded-full flex items-center gap-1.5">
              <Sprout className="w-3 h-3 text-emerald-700" />
              Sementes no cofre: <strong className="text-[#1A1D21] font-bold">{totalGeral}</strong>
            </span>
            <span className="text-[11px] font-medium text-[#5B6470] bg-amber-50 border border-amber-200 px-2.5 py-1 rounded-full flex items-center gap-1.5">
              🍒 Maduras para germinar:{' '}
              <strong className="text-amber-800 font-bold">{totalMaduras}</strong>
            </span>
            {decididas > 0 && (
              <span className="text-[11px] font-medium text-[#5B6470] bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-full flex items-center gap-1.5">
                ✅ Taxa de acerto desta caçada:{' '}
                <strong className="text-emerald-800 font-bold">
                  {totalGerminadas} de {decididas} ({taxaAcerto}%)
                </strong>
              </span>
            )}
            {totalIgnoradas > 0 && (
              <span className="text-[11px] font-medium text-[#5B6470] bg-stone-50 border border-stone-200 px-2.5 py-1 rounded-full flex items-center gap-1.5">
                Ignoradas: <strong className="text-stone-700 font-bold">{totalIgnoradas}</strong>
              </span>
            )}
          </div>

          {sugestoes.length === 0 ? (
            <div className="px-2 py-4 text-center space-y-1">
              <p className="text-xs font-medium text-[#1A1D21]">
                {registroCorpo.mensagem_vazia ||
                  'Nada maduro para germinar nesta caçada. As sementes seguardas no cofre ganham pontos a cada dia.'}
              </p>
              <p className="text-[11px] text-[#5B6470]">
                Sementes guardadas no cofre: {totalGeral}
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              <p className="text-[11px] font-bold uppercase tracking-wide text-[#5B6470] flex items-center gap-1.5">
                <Trophy className="w-3.5 h-3.5 text-amber-600" />
                Ranking de oportunidades (por pontuação)
              </p>
              {sugestoes.map((s, idx) => {
                const status = statusDe(s.folha_id)
                const insistente = (aparicoesAcumuladas[s.folha_id || ''] || 0) > 1
                return (
                  <CardSugestao
                    key={`${s.folha_id || idx}-${idx}`}
                    sugestao={s}
                    posicao={idx + 1}
                    insistente={insistente}
                    status={status}
                    processando={feedbackEmAndamento === s.folha_id}
                    onSugerirGerminacao={onSugerirGerminacao}
                    onFeedback={handleFeedback}
                  />
                )
              })}
              <p className="text-[10px] text-[#5B6470]">
                Clique no título para germiná-la como card de demanda; use os botões para dar
                feedback ao Caçador.
              </p>
            </div>
          )}

          {/* Histórico de caçadas — seletor de datas */}
          <div className="space-y-2 pt-1 border-t border-[#E5E1D8]/60">
            <div className="flex items-center justify-between gap-2 pt-2">
              <div className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wide text-[#5B6470]">
                <History className="w-3.5 h-3.5" />
                <span>
                  Histórico de caçadas{' '}
                  <span className="font-semibold normal-case">({totalHistorico})</span>
                </span>
              </div>
              {totalPaginas > 1 && (
                <div className="flex items-center gap-1">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    disabled={pagina <= 1}
                    onClick={() => void carregar(pagina - 1)}
                    className="h-7 w-7 p-0 text-[#5B6470]"
                    title="Página anterior"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </Button>
                  <span className="text-[11px] text-[#5B6470] font-medium">
                    {pagina}/{totalPaginas}
                  </span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    disabled={pagina >= totalPaginas}
                    onClick={() => void carregar(pagina + 1)}
                    className="h-7 w-7 p-0 text-[#5B6470]"
                    title="Próxima página"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                </div>
              )}
            </div>

            {historico.length <= 1 ? (
              <p className="text-xs text-[#5B6470] italic px-1">
                Conforme as caçadas diárias (21h) forem gravadas, elas aparecem aqui para consulta.
              </p>
            ) : (
              <div className="flex flex-wrap gap-1.5">
                {historico.map((r) => {
                  const ativo = r.data_geracao === dataSelecionada
                  return (
                    <button
                      key={r.id}
                      type="button"
                      onClick={() => setDataSelecionada(r.data_geracao)}
                      className={cn(
                        'px-2.5 py-1 rounded-full text-[11px] font-semibold border transition-colors',
                        ativo
                          ? 'bg-emerald-700 text-white border-emerald-700 shadow-sm'
                          : 'bg-white text-[#5B6470] border-[#E5E1D8] hover:border-emerald-600/50 hover:text-emerald-700',
                      )}
                      title={`Ver caçada de ${formatarDataPtBr(r.data_geracao)}`}
                    >
                      {formatarDataPtBr(r.data_geracao)}
                      {rotuloRelativoDia(r.data_geracao)
                        ? ` · ${rotuloRelativoDia(r.data_geracao)}`
                        : ''}
                    </button>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
