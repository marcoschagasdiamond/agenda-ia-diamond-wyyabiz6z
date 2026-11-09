import React, { useState, useEffect } from 'react'
import {
  MessageSquare,
  Bug,
  Lightbulb,
  Sparkles,
  HelpCircle,
  CheckCircle2,
  Clock,
  Filter,
  Search,
  RefreshCw,
  Trash2,
  ExternalLink,
  ChevronRight,
  User,
  MapPin,
  Calendar,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Textarea } from '@/components/ui/textarea'
import { useToast } from '@/hooks/use-toast'
import { diamondApi } from '@/services/diamondApi'
import { FeedbackTesteItem, TipoFeedbackTeste, StatusFeedbackTeste } from '@/types'

interface SecaoFeedbackTestadoresProps {
  nomeMaster?: string
}

export function SecaoFeedbackTestadores({ nomeMaster = 'Master' }: SecaoFeedbackTestadoresProps) {
  const { toast } = useToast()

  const [feedbacks, setFeedbacks] = useState<FeedbackTesteItem[]>([])
  const [carregando, setCarregando] = useState(true)
  const [atualizandoStatusId, setAtualizandoStatusId] = useState<string | null>(null)

  // Filtros
  const [filtroTipo, setFiltroTipo] = useState<TipoFeedbackTeste | 'todos'>('todos')
  const [filtroStatus, setFiltroStatus] = useState<StatusFeedbackTeste | 'todos'>('todos')
  const [termoBusca, setTermoBusca] = useState('')

  // Modal de Detalhes / Resolução com Nota
  const [itemSelecionado, setItemSelecionado] = useState<FeedbackTesteItem | null>(null)
  const [modalDetalhesOpen, setModalDetalhesOpen] = useState(false)
  const [respostaTexto, setRespostaTexto] = useState('')

  const carregarFeedbacks = async () => {
    try {
      setCarregando(true)
      const lista = await diamondApi.listarFeedbacksTeste({
        tipo: filtroTipo,
        status: filtroStatus,
        termo: termoBusca,
      })
      setFeedbacks(lista)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Falha ao carregar feedbacks'
      toast({
        title: 'Erro ao carregar feedbacks',
        description: msg,
        variant: 'destructive',
      })
    } finally {
      setCarregando(false)
    }
  }

  useEffect(() => {
    carregarFeedbacks()
  }, [filtroTipo, filtroStatus])

  const handleBuscarComTermo = (e: React.FormEvent) => {
    e.preventDefault()
    carregarFeedbacks()
  }

  // Contadores
  const totalNovos = feedbacks.filter((f) => f.status === 'novo').length
  const totalEmAnalise = feedbacks.filter((f) => f.status === 'em_analise').length
  const totalResolvidos = feedbacks.filter((f) => f.status === 'resolvido').length
  const totalGeral = feedbacks.length

  const handleAtualizarStatus = async (
    id: string,
    novoStatus: StatusFeedbackTeste,
    resposta?: string,
  ) => {
    try {
      setAtualizandoStatusId(id)
      await diamondApi.atualizarStatusFeedback(id, novoStatus, resposta, nomeMaster)
      toast({
        title:
          novoStatus === 'resolvido'
            ? 'Feedback marcado como Resolvido!'
            : novoStatus === 'em_analise'
              ? 'Feedback marcado em Análise'
              : 'Feedback marcado como Novo',
        description:
          novoStatus === 'resolvido'
            ? 'O item foi concluído com sucesso e gravado no histórico.'
            : 'Status atualizado no sistema.',
      })

      // Atualiza na lista local para resposta instantânea
      setFeedbacks((prev) =>
        prev.map((item) =>
          item.id === id
            ? {
                ...item,
                status: novoStatus,
                resposta_master: resposta !== undefined ? resposta : item.resposta_master,
                resolvido_em:
                  novoStatus === 'resolvido' ? new Date().toISOString() : item.resolvido_em,
                resolvido_por: novoStatus === 'resolvido' ? nomeMaster : item.resolvido_por,
              }
            : item,
        ),
      )

      if (modalDetalhesOpen) {
        setModalDetalhesOpen(false)
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Falha ao atualizar status'
      toast({
        title: 'Erro ao atualizar feedback',
        description: msg,
        variant: 'destructive',
      })
    } finally {
      setAtualizandoStatusId(null)
    }
  }

  const handleExcluir = async (id: string) => {
    if (!window.confirm('Tem certeza que deseja excluir permanentemente este feedback de teste?')) {
      return
    }
    try {
      await diamondApi.excluirFeedbackTeste(id)
      setFeedbacks((prev) => prev.filter((f) => f.id !== id))
      toast({
        title: 'Feedback removido',
        description: 'O registro foi excluído da base com sucesso.',
      })
      if (modalDetalhesOpen) setModalDetalhesOpen(false)
    } catch {
      toast({
        title: 'Erro ao excluir',
        description: 'Não foi possível remover o registro.',
        variant: 'destructive',
      })
    }
  }

  const renderBadgeTipo = (tipo: TipoFeedbackTeste) => {
    switch (tipo) {
      case 'bug':
        return (
          <Badge className="bg-rose-100 text-rose-800 border-rose-300 gap-1 text-[11px] font-semibold">
            <Bug className="w-3 h-3 text-rose-700" />
            Problema / Bug
          </Badge>
        )
      case 'sugestao':
        return (
          <Badge className="bg-emerald-100 text-emerald-800 border-emerald-300 gap-1 text-[11px] font-semibold">
            <Lightbulb className="w-3 h-3 text-emerald-700" />
            Sugestão
          </Badge>
        )
      case 'ideia':
        return (
          <Badge className="bg-amber-100 text-amber-900 border-amber-300 gap-1 text-[11px] font-semibold">
            <Sparkles className="w-3 h-3 text-amber-700" />
            Ideia / Recurso
          </Badge>
        )
      case 'outro':
      default:
        return (
          <Badge className="bg-zinc-100 text-zinc-800 border-zinc-300 gap-1 text-[11px] font-semibold">
            <HelpCircle className="w-3 h-3 text-zinc-600" />
            Outro
          </Badge>
        )
    }
  }

  const renderBadgeStatus = (status: StatusFeedbackTeste) => {
    switch (status) {
      case 'novo':
        return (
          <Badge className="bg-blue-100 text-blue-900 border-blue-300 gap-1 text-[10px] font-bold">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-600 animate-pulse" />
            NOVO
          </Badge>
        )
      case 'em_analise':
        return (
          <Badge className="bg-amber-100 text-amber-900 border-amber-300 gap-1 text-[10px] font-bold">
            <Clock className="w-3 h-3 text-amber-700" />
            EM ANÁLISE
          </Badge>
        )
      case 'resolvido':
        return (
          <Badge className="bg-emerald-100 text-emerald-900 border-emerald-300 gap-1 text-[10px] font-bold">
            <CheckCircle2 className="w-3 h-3 text-emerald-700" />
            RESOLVIDO
          </Badge>
        )
      default:
        return null
    }
  }

  const formatarData = (dataIso?: string) => {
    if (!dataIso) return '-'
    try {
      const d = new Date(dataIso)
      return d.toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
    } catch {
      return dataIso
    }
  }

  return (
    <Card className="border-[#0F766E]/30 bg-white shadow-xs overflow-hidden">
      {/* Cabeçalho da Seção */}
      <CardHeader className="border-b border-[#E5E1D8] pb-4 bg-gradient-to-r from-teal-50/50 via-white to-amber-50/40">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <CardTitle className="text-lg font-bold text-zinc-900 flex items-center gap-2">
                <MessageSquare className="w-5 h-5 text-[#0F766E]" />
                <span>Feedback dos Testadores & Relatos de Uso</span>
              </CardTitle>
              {totalNovos > 0 && (
                <Badge className="bg-rose-500 hover:bg-rose-600 text-white font-black text-xs px-2 py-0.5 animate-pulse">
                  {totalNovos} {totalNovos === 1 ? 'novo' : 'novos'}
                </Badge>
              )}
            </div>
            <CardDescription className="text-xs text-zinc-600">
              Central de relatórios enviados pelos testadores e usuários diretamente de qualquer
              tela do Agenda IA Diamond.
            </CardDescription>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={carregarFeedbacks}
              disabled={carregando}
              className="text-xs h-8 border-zinc-300 hover:bg-zinc-100 text-zinc-800"
            >
              <RefreshCw className={`w-3 h-3 mr-1.5 ${carregando ? 'animate-spin' : ''}`} />
              Atualizar
            </Button>
          </div>
        </div>

        {/* Cards de Métricas de Feedbacks */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-3">
          <div className="p-3 rounded-xl border border-blue-200 bg-blue-50/60 flex items-center justify-between">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-blue-900">Novos</p>
              <p className="text-xl font-black text-blue-950 mt-0.5">{totalNovos}</p>
            </div>
            <span className="w-2.5 h-2.5 rounded-full bg-blue-600 animate-ping" />
          </div>

          <div className="p-3 rounded-xl border border-amber-200 bg-amber-50/60 flex items-center justify-between">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-amber-900">
                Em Análise
              </p>
              <p className="text-xl font-black text-amber-950 mt-0.5">{totalEmAnalise}</p>
            </div>
            <Clock className="w-4 h-4 text-amber-700" />
          </div>

          <div className="p-3 rounded-xl border border-emerald-200 bg-emerald-50/60 flex items-center justify-between">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-900">
                Resolvidos
              </p>
              <p className="text-xl font-black text-emerald-950 mt-0.5">{totalResolvidos}</p>
            </div>
            <CheckCircle2 className="w-4 h-4 text-emerald-700" />
          </div>

          <div className="p-3 rounded-xl border border-zinc-200 bg-zinc-50 flex items-center justify-between">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-700">
                Total Gravados
              </p>
              <p className="text-xl font-black text-zinc-900 mt-0.5">{totalGeral}</p>
            </div>
            <MessageSquare className="w-4 h-4 text-zinc-500" />
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-4 sm:p-6 space-y-4">
        {/* Barra de Filtros e Busca */}
        <div className="flex flex-col sm:flex-row gap-2.5 items-stretch sm:items-center justify-between">
          <form onSubmit={handleBuscarComTermo} className="flex-1 flex gap-2">
            <div className="relative flex-1">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
              <Input
                placeholder="Buscar por texto, tela de origem ou autor..."
                value={termoBusca}
                onChange={(e) => setTermoBusca(e.target.value)}
                className="text-xs pl-8 h-8 border-zinc-300"
              />
            </div>
            <Button
              type="submit"
              size="sm"
              variant="outline"
              className="text-xs h-8 border-zinc-300"
            >
              Buscar
            </Button>
          </form>

          <div className="flex items-center gap-2 flex-wrap">
            {/* Filtro por Tipo */}
            <div className="flex items-center gap-1">
              <Filter className="w-3 h-3 text-zinc-400" />
              <Select
                value={filtroTipo}
                onValueChange={(val) => setFiltroTipo(val as TipoFeedbackTeste | 'todos')}
              >
                <SelectTrigger className="text-xs h-8 w-[130px] border-zinc-300">
                  <SelectValue placeholder="Tipo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos os tipos</SelectItem>
                  <SelectItem value="bug">Problemas / Bugs</SelectItem>
                  <SelectItem value="sugestao">Sugestões</SelectItem>
                  <SelectItem value="ideia">Ideias / Recursos</SelectItem>
                  <SelectItem value="outro">Outros</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Filtro por Status */}
            <Select
              value={filtroStatus}
              onValueChange={(val) => setFiltroStatus(val as StatusFeedbackTeste | 'todos')}
            >
              <SelectTrigger className="text-xs h-8 w-[130px] border-zinc-300">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos os status</SelectItem>
                <SelectItem value="novo">Novos</SelectItem>
                <SelectItem value="em_analise">Em análise</SelectItem>
                <SelectItem value="resolvido">Resolvidos</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Lista de Feedbacks */}
        {carregando ? (
          <div className="py-12 text-center text-xs text-zinc-500">
            <RefreshCw className="w-5 h-5 mx-auto animate-spin mb-2 text-[#0F766E]" />
            Carregando feedbacks dos testadores...
          </div>
        ) : feedbacks.length === 0 ? (
          <div className="p-8 rounded-xl border border-dashed border-zinc-300 text-center space-y-2 bg-zinc-50/50">
            <MessageSquare className="w-8 h-8 mx-auto text-zinc-400" />
            <p className="text-xs font-semibold text-zinc-800">
              Nenhum feedback encontrado com os filtros atuais
            </p>
            <p className="text-[11px] text-zinc-500 max-w-sm mx-auto">
              Quando os testadores enviarem relatos pelo botão flutuante de feedback no app, eles
              aparecerão aqui com tela de origem e data.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {feedbacks.map((item) => {
              const estaAtualizando = atualizandoStatusId === item.id
              const nomeConta = item.expand?.conta?.nome_conta
              const isContaEmTeste = item.expand?.conta?.conta_teste

              return (
                <div
                  key={item.id}
                  className={`p-4 rounded-xl border transition-all text-xs bg-white ${
                    item.status === 'novo'
                      ? 'border-blue-300 shadow-xs ring-1 ring-blue-100'
                      : item.status === 'em_analise'
                        ? 'border-amber-200'
                        : 'border-zinc-200 bg-zinc-50/40 opacity-90'
                  }`}
                >
                  {/* Linha superior: Tipo, Status, Data e Rota */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-zinc-100 pb-2.5">
                    <div className="flex items-center gap-2 flex-wrap">
                      {renderBadgeTipo(item.tipo)}
                      {renderBadgeStatus(item.status)}

                      {isContaEmTeste && (
                        <Badge className="bg-amber-100 text-amber-900 border-amber-300 font-bold text-[10px]">
                          Conta de Teste
                        </Badge>
                      )}

                      {nomeConta && (
                        <span className="text-[11px] text-zinc-500">
                          Conta: <strong className="text-zinc-700">{nomeConta}</strong>
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-3 text-[11px] text-zinc-400">
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {formatarData(item.created)}
                      </span>
                    </div>
                  </div>

                  {/* Texto do Feedback */}
                  <div className="py-2.5">
                    <p className="text-xs font-medium text-zinc-900 whitespace-pre-wrap leading-relaxed">
                      {item.texto}
                    </p>
                  </div>

                  {/* Resposta do Master (se houver) */}
                  {item.resposta_master && (
                    <div className="p-2.5 mb-2.5 rounded-lg bg-teal-50 border border-teal-200 text-teal-950 text-[11px]">
                      <p className="font-bold flex items-center gap-1 text-[#0F766E]">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        Anotação / Resposta do Master:
                      </p>
                      <p className="mt-0.5 leading-relaxed">{item.resposta_master}</p>
                      {item.resolvido_em && (
                        <p className="text-[10px] text-teal-700 mt-1">
                          Resolvido por {item.resolvido_por || 'Master'} em{' '}
                          {formatarData(item.resolvido_em)}
                        </p>
                      )}
                    </div>
                  )}

                  {/* Metadados: Autor e Tela de Origem */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-2 border-t border-zinc-100 text-[11px] text-zinc-500">
                    <div className="flex items-center gap-3 flex-wrap">
                      <span className="flex items-center gap-1">
                        <User className="w-3 h-3 text-zinc-400" />
                        <strong className="text-zinc-700">
                          {item.usuario_nome || item.usuario_email || 'Anônimo'}
                        </strong>
                        {item.usuario_email && (
                          <span className="text-zinc-400">({item.usuario_email})</span>
                        )}
                      </span>

                      {item.tela_origem && (
                        <span className="flex items-center gap-1 text-[#0F766E] font-medium">
                          <MapPin className="w-3 h-3" />
                          {item.tela_origem}
                        </span>
                      )}
                    </div>

                    {/* Ações de Gestão de Status */}
                    <div className="flex items-center gap-1.5 self-end sm:self-auto">
                      {item.status !== 'em_analise' && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleAtualizarStatus(item.id, 'em_analise')}
                          disabled={estaAtualizando}
                          className="text-[11px] h-7 border-amber-300 text-amber-800 hover:bg-amber-50"
                        >
                          <Clock className="w-3 h-3 mr-1 text-amber-600" />
                          Em análise
                        </Button>
                      )}

                      {item.status !== 'resolvido' ? (
                        <Button
                          size="sm"
                          onClick={() => {
                            setItemSelecionado(item)
                            setRespostaTexto(item.resposta_master || '')
                            setModalDetalhesOpen(true)
                          }}
                          disabled={estaAtualizando}
                          className="text-[11px] h-7 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold"
                        >
                          <CheckCircle2 className="w-3 h-3 mr-1" />
                          Marcar Resolvido
                        </Button>
                      ) : (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleAtualizarStatus(item.id, 'novo')}
                          disabled={estaAtualizando}
                          className="text-[11px] h-7 text-blue-700 hover:bg-blue-50"
                        >
                          Reabrir
                        </Button>
                      )}

                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleExcluir(item.id)}
                        disabled={estaAtualizando}
                        title="Excluir relato"
                        className="text-[11px] h-7 w-7 p-0 text-zinc-400 hover:text-rose-600 hover:bg-rose-50"
                      >
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </CardContent>

      {/* Modal para Adicionar Resposta e Marcar como Resolvido */}
      <Dialog open={modalDetalhesOpen} onOpenChange={setModalDetalhesOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <div className="w-10 h-10 rounded-full bg-emerald-50 text-emerald-700 flex items-center justify-center mb-1">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <DialogTitle className="text-lg font-bold text-zinc-900">
              Concluir & Marcar como Resolvido
            </DialogTitle>
            <DialogDescription className="text-xs text-zinc-500">
              Você está finalizando este feedback de teste. Pode adicionar uma nota de resolução
              opcional para registro.
            </DialogDescription>
          </DialogHeader>

          {itemSelecionado && (
            <div className="py-2 space-y-3 text-xs">
              <div className="p-3 rounded-lg bg-zinc-50 border border-zinc-200">
                <div className="flex items-center gap-2 mb-1">
                  {renderBadgeTipo(itemSelecionado.tipo)}
                  <span className="text-[11px] text-zinc-500">
                    Origem: <strong>{itemSelecionado.tela_origem || '-'}</strong>
                  </span>
                </div>
                <p className="text-zinc-800 font-medium whitespace-pre-wrap">
                  {itemSelecionado.texto}
                </p>
                <p className="text-[11px] text-zinc-400 mt-2">
                  Autor:{' '}
                  {itemSelecionado.usuario_nome || itemSelecionado.usuario_email || 'Testador'}
                </p>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-zinc-700 uppercase tracking-wider">
                  Nota de Resolução do Master (opcional)
                </label>
                <Textarea
                  value={respostaTexto}
                  onChange={(e) => setRespostaTexto(e.target.value)}
                  placeholder="Ex.: Corrigido no build 0.0.62 / Implementada a melhoria sugerida..."
                  rows={3}
                  className="text-xs resize-none"
                />
              </div>
            </div>
          )}

          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setModalDetalhesOpen(false)}
              className="text-xs"
            >
              Cancelar
            </Button>
            <Button
              size="sm"
              onClick={() => {
                if (itemSelecionado) {
                  handleAtualizarStatus(itemSelecionado.id, 'resolvido', respostaTexto.trim())
                }
              }}
              className="text-xs bg-emerald-600 hover:bg-emerald-700 text-white font-semibold"
            >
              <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
              Confirmar Resolução
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  )
}

export default SecaoFeedbackTestadores
