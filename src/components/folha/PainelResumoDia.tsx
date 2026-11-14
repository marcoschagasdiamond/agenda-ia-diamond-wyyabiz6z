import React, { useState, useEffect, useCallback } from 'react'
import {
  Sparkles,
  CheckCircle2,
  ListTodo,
  Target,
  Scale,
  History,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  ArrowRight,
  CalendarDays,
  Bot,
  Loader2,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { useToast } from '@/hooks/use-toast'
import { diamondApi } from '@/services/diamondApi'
import { listarOportunidadesCacador, type OportunidadesCacador } from '@/services/cacadorSementes'
import type { ResumoDia, SugestaoCardIA } from '@/types'
import { cn } from '@/lib/utils'
import { Sprout } from 'lucide-react'

interface PainelResumoDiaProps {
  /** Navega para /folha?destaque=<folha_id> destacando o registro de origem da sugestão */
  onDestacarRegistro: (folhaId: string) => void
}

const POR_PAGINA_HISTORICO = 7

const dataDeHojeLocal = () => {
  const agora = new Date()
  return new Date(agora.getTime() - agora.getTimezoneOffset() * 60000).toISOString().slice(0, 10)
}

const formatarDataPtBr = (dataIso?: string) => {
  if (!dataIso) return ''
  const soData = dataIso.slice(0, 10)
  const [ano, mes, dia] = soData.split('-')
  if (!ano || !mes || !dia) return soData
  return `${dia}/${mes}/${ano}`
}

const rotuloRelativoDia = (dataIso?: string) => {
  if (!dataIso) return ''
  const hoje = dataDeHojeLocal()
  if (dataIso.slice(0, 10) === hoje) return 'Hoje'
  const ontem = new Date()
  ontem.setDate(ontem.getDate() - 1)
  const dataOntem = new Date(ontem.getTime() - ontem.getTimezoneOffset() * 60000)
    .toISOString()
    .slice(0, 10)
  if (dataIso.slice(0, 10) === dataOntem) return 'Ontem'
  return ''
}

/** Aceita o campo como array (JSON do banco) ou string serializada */
const parseSugestoes = (resumo: ResumoDia | null): SugestaoCardIA[] => {
  if (!resumo) return []
  const bruto = resumo.sugestoes_cards
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

/** Seções do resumo: cada linha vira um item com marcador */
const SecaoResumo: React.FC<{
  titulo: string
  icone: React.ReactNode
  corTexto: string
  corFundo: string
  texto?: string
}> = ({ titulo, icone, corTexto, corFundo, texto }) => {
  const linhas = (texto || '')
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean)

  return (
    <div className={cn('rounded-xl p-3 space-y-2', corFundo)}>
      <div
        className={cn(
          'flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wide',
          corTexto,
        )}
      >
        {icone}
        <span>{titulo}</span>
      </div>
      {linhas.length === 0 ? (
        <p className="text-xs text-[#5B6470] italic">—</p>
      ) : (
        <ul className="space-y-1.5">
          {linhas.map((linha, i) => {
            const limpa = linha.replace(/^[-•*]\s*/, '')
            return (
              <li
                key={i}
                className="text-xs text-[#1A1D21] leading-relaxed flex items-start gap-1.5"
              >
                <span className={cn('mt-1.5 w-1 h-1 rounded-full shrink-0', corTexto)} />
                <span>{limpa}</span>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}

export const PainelResumoDia: React.FC<PainelResumoDiaProps> = ({ onDestacarRegistro }) => {
  const { toast } = useToast()
  const [resumos, setResumos] = useState<ResumoDia[]>([])
  const [totalHistorico, setTotalHistorico] = useState(0)
  const [pagina, setPagina] = useState(1)
  const [dataSelecionada, setDataSelecionada] = useState<string | null>(null)
  const [carregando, setCarregando] = useState(true)
  const [gerando, setGerando] = useState(false)
  const [oportunidades, setOportunidades] = useState<OportunidadesCacador | null>(null)
  const [carregandoOportunidades, setCarregandoOportunidades] = useState(false)

  const carregar = useCallback(
    async (paginaDesejada = 1) => {
      setCarregando(true)
      try {
        const { itens, total } = await diamondApi.listResumosPaginado(
          paginaDesejada,
          POR_PAGINA_HISTORICO,
        )
        setResumos(itens)
        setTotalHistorico(total)
        setPagina(paginaDesejada)
        setDataSelecionada((atual) => {
          if (atual && itens.some((r) => r.data?.slice(0, 10) === atual)) return atual
          return itens[0]?.data?.slice(0, 10) ?? null
        })
      } catch (err) {
        console.error('Erro ao carregar resumos do dia:', err)
        toast({
          title: 'Erro ao carregar o Resumo do Dia',
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleGerarAgora = async () => {
    setGerando(true)
    try {
      await diamondApi.gerarResumoDia()
      toast({
        title: 'Resumo do Dia gerado pela Diamantina 💎',
        description: 'A organizadora diária leu os registros da Folha e atualizou o resumo.',
      })
      await carregar(1)
    } catch (err) {
      toast({
        title: 'Erro ao gerar o Resumo do Dia',
        description: (err as Error)?.message || 'Tente novamente em instantes.',
        variant: 'destructive',
      })
    } finally {
      setGerando(false)
    }
  }

  const resumoSelecionado =
    resumos.find((r) => r.data?.slice(0, 10) === dataSelecionada) ?? resumos[0] ?? null
  const sugestoes = parseSugestoes(resumoSelecionado)
  const totalPaginas = Math.max(1, Math.ceil(totalHistorico / POR_PAGINA_HISTORICO))
  const rotuloDiaSelecionado = rotuloRelativoDia(resumoSelecionado?.data)

  /** Oportunidades do Caçador para o dia do resumo selecionado. */
  useEffect(() => {
    let vivo = true
    setCarregandoOportunidades(true)
    listarOportunidadesCacador(resumoSelecionado?.data?.slice(0, 10))
      .then((opp) => {
        if (vivo) setOportunidades(opp && opp.disponivel && opp.total > 0 ? opp : null)
      })
      .catch(() => {
        if (vivo) setOportunidades(null)
      })
      .finally(() => {
        if (vivo) setCarregandoOportunidades(false)
      })
    return () => {
      vivo = false
    }
  }, [resumoSelecionado?.data])

  return (
    <Card className="border-[#0F766E]/25 bg-gradient-to-br from-white via-white to-[#0F766E]/[0.04] shadow-sm">
      <CardHeader className="pb-3 border-b border-[#E5E1D8]/60">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="space-y-0.5">
            <CardTitle className="text-sm font-semibold text-[#1A1D21] flex items-center gap-2">
              <span className="flex items-center justify-center w-7 h-7 rounded-full bg-gradient-to-br from-[#0F766E] to-[#134E4A] text-white shadow-sm">
                <Sparkles className="w-3.5 h-3.5" />
              </span>
              Resumo do Dia
              <Badge className="bg-[#0F766E]/10 text-[#0F766E] hover:bg-[#0F766E]/10 border-none text-[9px] px-1.5 py-0 font-bold gap-1">
                <Bot className="w-3 h-3" />
                DIAMANTINA · FUNCIONÁRIA DE IA
              </Badge>
            </CardTitle>
            <CardDescription className="text-xs text-[#5B6470]">
              Toda noite às 22h a Diamantina organiza os registros da Folha — feito, a fazer,
              prioridades, decisões — e sugere cards para os registros soltos.
            </CardDescription>
          </div>

          <div className="flex items-center gap-2">
            <Button
              type="button"
              size="sm"
              onClick={handleGerarAgora}
              disabled={gerando || carregando}
              className="h-8 text-xs gap-1.5 bg-[#0F766E] hover:bg-[#0D5C56] text-white font-semibold shadow-sm"
            >
              {gerando ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  Diamantina organizando...
                </>
              ) : (
                <>
                  <RefreshCw className="w-3.5 h-3.5" />
                  Gerar resumo agora
                </>
              )}
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="pt-4 space-y-4">
        {carregando ? (
          <div className="flex items-center justify-center gap-2 py-8 text-xs text-[#5B6470]">
            <Loader2 className="w-4 h-4 animate-spin text-[#0F766E]" />
            Carregando resumo...
          </div>
        ) : !resumoSelecionado ? (
          <div className="rounded-xl border border-dashed border-[#0F766E]/30 bg-[#0F766E]/5 p-6 text-center space-y-2">
            <p className="text-sm font-semibold text-[#1A1D21]">
              O resumo de hoje ainda não foi gerado
            </p>
            <p className="text-xs text-[#5B6470] max-w-md mx-auto">
              A Diamantina organiza a sua Folha automaticamente todos os dias às 22h. Você também
              pode pedir agora — clique em "Gerar resumo agora".
            </p>
          </div>
        ) : (
          <>
            {/* Cabeçalho do resumo selecionado */}
            <div className="flex flex-wrap items-center gap-2">
              <Badge
                variant="outline"
                className="bg-white border-[#E5E1D8] text-[#1A1D21] text-[11px] font-semibold gap-1"
              >
                <CalendarDays className="w-3 h-3 text-[#0F766E]" />
                {formatarDataPtBr(resumoSelecionado.data)}
                {rotuloDiaSelecionado && (
                  <span className="text-[#0F766E]">· {rotuloDiaSelecionado}</span>
                )}
              </Badge>
              {typeof resumoSelecionado.total_registros === 'number' && (
                <Badge
                  variant="outline"
                  className="bg-white border-[#E5E1D8] text-[#5B6470] text-[11px] font-medium"
                >
                  {resumoSelecionado.total_registros}{' '}
                  {resumoSelecionado.total_registros === 1 ? 'registro lido' : 'registros lidos'}
                </Badge>
              )}
              {resumoSelecionado.gerado_por && (
                <Badge
                  variant="outline"
                  className="bg-white border-[#E5E1D8] text-[#5B6470] text-[11px] font-medium gap-1"
                >
                  <Bot className="w-3 h-3 text-[#0F766E]" />
                  por {resumoSelecionado.gerado_por}
                </Badge>
              )}
            </div>

            {/* Mensagem de dia em branco */}
            {resumoSelecionado.mensagem_sem_registros && (
              <div className="rounded-xl bg-amber-50/70 border border-amber-200 p-3 text-xs text-amber-900 leading-relaxed flex items-start gap-2">
                <Sparkles className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <span>{resumoSelecionado.mensagem_sem_registros}</span>
              </div>
            )}

            {/* Quatro seções do resumo */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <SecaoResumo
                titulo="Feito"
                icone={<CheckCircle2 className="w-3.5 h-3.5" />}
                corTexto="text-emerald-700"
                corFundo="bg-emerald-50/60 border border-emerald-100"
                texto={resumoSelecionado.feito}
              />
              <SecaoResumo
                titulo="A Fazer"
                icone={<ListTodo className="w-3.5 h-3.5" />}
                corTexto="text-amber-700"
                corFundo="bg-amber-50/60 border border-amber-100"
                texto={resumoSelecionado.a_fazer}
              />
              <SecaoResumo
                titulo="Prioridades"
                icone={<Target className="w-3.5 h-3.5" />}
                corTexto="text-rose-700"
                corFundo="bg-rose-50/60 border border-rose-100"
                texto={resumoSelecionado.prioridades}
              />
              <SecaoResumo
                titulo="Decisões"
                icone={<Scale className="w-3.5 h-3.5" />}
                corTexto="text-violet-700"
                corFundo="bg-violet-50/60 border border-violet-100"
                texto={resumoSelecionado.decisoes}
              />
            </div>

            {/* Oportunidades do Caçador (sementes maduras aguardando decisão) */}
            {carregandoOportunidades ? (
              <div className="flex items-center gap-1.5 px-1 text-[11px] text-[#5B6470]">
                <Loader2 className="w-3 h-3 animate-spin text-emerald-600" />
                Consultando o Caçador de Sementes...
              </div>
            ) : oportunidades ? (
              <div className="rounded-xl p-3 space-y-2 bg-emerald-50/60 border border-emerald-100">
                <div className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wide text-emerald-700">
                  <Sprout className="w-3.5 h-3.5" />
                  <span>
                    Oportunidades do Caçador
                    <span className="text-[#5B6470] font-semibold normal-case">
                      {' '}
                      · {oportunidades.total} semente{oportunidades.total === 1 ? '' : 's'} madura
                      {oportunidades.total === 1 ? '' : 's'}
                      {oportunidades.urgentes > 0 ? ` · ${oportunidades.urgentes} urgente(s)` : ''}
                    </span>
                  </span>
                </div>
                {oportunidades.texto && (
                  <p className="text-xs text-[#1A1D21] leading-relaxed">{oportunidades.texto}</p>
                )}
                <ul className="space-y-1.5">
                  {oportunidades.itens.slice(0, 5).map((item, i) => (
                    <li
                      key={`${item.folha_id || 'opp'}-${i}`}
                      className="text-xs text-[#1A1D21] leading-relaxed flex items-start gap-1.5"
                    >
                      <span className="mt-1.5 w-1 h-1 rounded-full shrink-0 bg-emerald-600" />
                      <span>
                        <span className="font-semibold">{item.titulo || item.tese}</span>
                        {item.motivo && <span> — {item.motivo}</span>}
                        {item.urgente && (
                          <Badge className="bg-rose-100 text-rose-800 hover:bg-rose-100 border-none text-[9px] px-1 py-0 font-bold ml-1">
                            urgente
                          </Badge>
                        )}
                        {item.contra_argumento && (
                          <span className="block text-[11px] text-[#5B6470] italic">
                            Contra: {item.contra_argumento}
                          </span>
                        )}
                      </span>
                    </li>
                  ))}
                </ul>
                {oportunidades.itens.length > 5 && (
                  <p className="text-[11px] text-[#5B6470] italic">
                    +{oportunidades.itens.length - 5} oportunidade(s) na aba Sementes da Folha.
                  </p>
                )}
              </div>
            ) : null}

            {/* Sugestões de conversão em card (registros soltos) */}
            <div className="space-y-2">
              <div className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wide text-[#0F766E]">
                <Sparkles className="w-3.5 h-3.5" />
                <span>
                  Sugestões de cards{' '}
                  {sugestoes.length > 0 && (
                    <span className="text-[#5B6470] font-semibold normal-case">
                      ({sugestoes.length}{' '}
                      {sugestoes.length === 1 ? 'registro solto' : 'registros soltos'})
                    </span>
                  )}
                </span>
              </div>

              {sugestoes.length === 0 ? (
                <p className="text-xs text-[#5B6470] italic px-1">
                  Nenhum registro solto pedindo um card neste dia — a Folha está organizada. 💎
                </p>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  {sugestoes.map((s, i) => {
                    const clicavel = Boolean(s.folha_id)
                    return (
                      <button
                        key={`${s.folha_id || 'sug'}-${i}`}
                        type="button"
                        disabled={!clicavel}
                        onClick={() => clicavel && onDestacarRegistro(s.folha_id as string)}
                        className={cn(
                          'text-left p-3 rounded-xl border bg-white transition-all space-y-1.5 group',
                          clicavel
                            ? 'border-[#E5E1D8] hover:border-[#0F766E]/60 hover:shadow-sm cursor-pointer'
                            : 'border-[#E5E1D8] opacity-70 cursor-default',
                        )}
                        title={
                          clicavel
                            ? 'Ver o registro de origem na Folha'
                            : 'Sem registro de origem vinculado'
                        }
                      >
                        <div className="flex items-start justify-between gap-2">
                          <p className="text-xs font-semibold text-[#1A1D21] leading-snug">
                            {s.titulo_sugerido || s.trecho || 'Sugestão de card'}
                          </p>
                          <ArrowRight className="w-3.5 h-3.5 text-[#0F766E] shrink-0 mt-0.5 opacity-0 group-hover:opacity-100 transition-opacity" />
                        </div>
                        {s.trecho && s.titulo_sugerido && (
                          <p className="text-[11px] text-[#5B6470] leading-snug line-clamp-2 italic">
                            "{s.trecho}"
                          </p>
                        )}
                        <div className="flex flex-wrap items-center gap-1.5">
                          {s.destino_sugerido && (
                            <Badge className="bg-[#0F766E]/10 text-[#0F766E] hover:bg-[#0F766E]/10 border-none text-[10px] px-1.5 py-0 font-semibold">
                              {s.destino_sugerido}
                            </Badge>
                          )}
                          {clicavel && (
                            <span className="text-[10px] text-[#5B6470]">
                              clique para ver o registro na Folha
                            </span>
                          )}
                        </div>
                        {s.justificativa && (
                          <p className="text-[11px] text-[#5B6470] leading-snug">
                            {s.justificativa}
                          </p>
                        )}
                      </button>
                    )
                  })}
                </div>
              )}
            </div>

            {/* Histórico de resumos de dias anteriores */}
            <div className="space-y-2 pt-1 border-t border-[#E5E1D8]/60">
              <div className="flex items-center justify-between gap-2 pt-2">
                <div className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wide text-[#5B6470]">
                  <History className="w-3.5 h-3.5" />
                  <span>
                    Histórico de resumos{' '}
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

              {resumos.length <= 1 ? (
                <p className="text-xs text-[#5B6470] italic px-1">
                  Conforme os resumos diários forem gravados, eles aparecem aqui para consulta.
                </p>
              ) : (
                <div className="flex flex-wrap gap-1.5">
                  {resumos.map((r) => {
                    const dataR = r.data?.slice(0, 10) || ''
                    const ativo = dataR === dataSelecionada
                    return (
                      <button
                        key={r.id}
                        type="button"
                        onClick={() => setDataSelecionada(dataR)}
                        className={cn(
                          'px-2.5 py-1 rounded-full text-[11px] font-semibold border transition-colors',
                          ativo
                            ? 'bg-[#0F766E] text-white border-[#0F766E] shadow-sm'
                            : 'bg-white text-[#5B6470] border-[#E5E1D8] hover:border-[#0F766E]/50 hover:text-[#0F766E]',
                        )}
                        title={`Ver resumo de ${formatarDataPtBr(dataR)}`}
                      >
                        {formatarDataPtBr(dataR)}
                        {rotuloRelativoDia(dataR) ? ` · ${rotuloRelativoDia(dataR)}` : ''}
                      </button>
                    )
                  })}
                </div>
              )}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  )
}

export default PainelResumoDia
