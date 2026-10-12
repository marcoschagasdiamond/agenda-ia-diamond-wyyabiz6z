import React, { useState, useEffect } from 'react'
import { diamondApi } from '@/services/diamondApi'
import type { FolhaDia, Projeto, Contato, Negocio, OrigemTipo } from '@/types'
import {
  FileEdit,
  Sparkles,
  Send,
  Trash2,
  CheckCircle2,
  PhoneCall,
  MessageSquare,
  Mail,
  FileText,
  Clock,
  Building,
  User,
  ArrowRight,
  Loader2,
  Check,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { useToast } from '@/hooks/use-toast'

export default function Folha() {
  const { toast } = useToast()
  const [folhaItems, setFolhaItems] = useState<FolhaDia[]>([])
  const [projetos, setProjetos] = useState<Projeto[]>([])
  const [contatos, setContatos] = useState<Contato[]>([])
  const [negocios, setNegocios] = useState<Negocio[]>([])

  // Formulário de captura
  const [novoRegistro, setNovoRegistro] = useState('')
  const [tipoOrigem, setTipoOrigem] = useState<OrigemTipo>('manual')
  const [origemRef, setOrigemRef] = useState('')
  const [projetoId, setProjetoId] = useState<string>('none')
  const [negocioId, setNegocioId] = useState<string>('none')
  const [contatoId, setContatoId] = useState<string>('none')
  const [loadingAdd, setLoadingAdd] = useState(false)

  // Modal de Organizar com IA
  const [organizando, setOrganizando] = useState(false)
  const [modalRevisaoOpen, setModalRevisaoOpen] = useState(false)
  const [sugestoesIA, setSugestoesIA] = useState<{
    cards: Array<{
      folha_id?: string
      titulo: string
      descricao: string
      projeto_id?: string
      negocio_id?: string
      contato_id?: string
      tags: string[]
      prioridade: 'baixa' | 'media' | 'alta' | 'urgente'
      status: 'novo' | 'em_andamento' | 'bloqueado' | 'concluido'
      proximo_passo: string
    }>
    resumo?: {
      feito?: string
      a_fazer?: string
      prioridades?: string
      decisoes?: string
      proximos_passos?: string
    }
    atualizacoes_contexto?: Array<{
      tipo: 'projeto' | 'contato'
      id: string
      novo_contexto: string
    }>
  } | null>(null)
  const [salvandoRevisao, setSalvandoRevisao] = useState(false)

  const carregarDados = async () => {
    try {
      const [f, p, c, n] = await Promise.all([
        diamondApi.listFolhaDia(),
        diamondApi.listProjetos(),
        diamondApi.listContatos(),
        diamondApi.listNegocios(),
      ])
      setFolhaItems(f)
      setProjetos(p)
      setContatos(c)
      setNegocios(n)
    } catch (err) {
      console.error('Erro ao carregar folha:', err)
    }
  }

  useEffect(() => {
    carregarDados()
  }, [])

  const handleAdicionarRegistro = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!novoRegistro.trim()) return
    setLoadingAdd(true)

    try {
      const hoje = new Date().toISOString().split('T')[0]
      await diamondApi.createFolhaDia({
        data: hoje,
        registro: novoRegistro.trim(),
        tipo_origem: tipoOrigem,
        origem_ref: origemRef.trim() || undefined,
        status: 'pendente',
        projeto: projetoId !== 'none' ? projetoId : undefined,
        negocio: negocioId !== 'none' ? negocioId : undefined,
        contato: contatoId !== 'none' ? contatoId : undefined,
      })

      setNovoRegistro('')
      setOrigemRef('')
      setProjetoId('none')
      setNegocioId('none')
      setContatoId('none')

      toast({
        title: 'Registro capturado',
        description: 'Informação guardada na folha do dia.',
      })

      await carregarDados()
    } catch (err) {
      toast({
        title: 'Erro ao salvar',
        description: (err as Error)?.message || 'Tente novamente.',
        variant: 'destructive',
      })
    } finally {
      setLoadingAdd(false)
    }
  }

  const handleExcluirRegistro = async (id: string) => {
    try {
      await diamondApi.deleteFolhaDia(id)
      toast({ title: 'Registro removido da folha' })
      setFolhaItems((prev) => prev.filter((item) => item.id !== id))
    } catch (err) {
      toast({ title: 'Erro ao remover', variant: 'destructive' })
    }
  }

  const handleOrganizarComIA = async () => {
    const pendentes = folhaItems.filter((f) => f.status === 'pendente')
    if (pendentes.length === 0) {
      toast({
        title: 'Nenhum registro pendente',
        description: 'Lance anotações na folha antes de organizar com a IA.',
      })
      return
    }

    setOrganizando(true)
    try {
      const resultado = await diamondApi.organizarFolha()
      setSugestoesIA(resultado)
      setModalRevisaoOpen(true)
    } catch (err) {
      toast({
        title: 'Falha na IA',
        description: (err as Error)?.message || 'Não foi possível organizar agora.',
        variant: 'destructive',
      })
    } finally {
      setOrganizando(false)
    }
  }

  const handleAprovarESalvar = async () => {
    if (!sugestoesIA) return
    setSalvandoRevisao(true)
    try {
      const hoje = new Date().toISOString().split('T')[0]

      // 1. Criar os cards aprovados
      if (sugestoesIA.cards && sugestoesIA.cards.length > 0) {
        for (const card of sugestoesIA.cards) {
          await diamondApi.createCard({
            titulo: card.titulo,
            descricao: card.descricao,
            projeto: card.projeto_id || undefined,
            negocio: card.negocio_id || undefined,
            contato: card.contato_id || undefined,
            tags: card.tags,
            prioridade: card.prioridade,
            status: card.status,
            proximo_passo: card.proximo_passo,
            criado_por_ia: true,
          })
        }
      }

      // 2. Salvar resumo do dia
      if (sugestoesIA.resumo) {
        await diamondApi.createResumo({
          data: hoje,
          feito: sugestoesIA.resumo.feito || '',
          a_fazer: sugestoesIA.resumo.a_fazer || '',
          prioridades: sugestoesIA.resumo.prioridades || '',
          decisoes: sugestoesIA.resumo.decisoes || '',
          proximos_passos: sugestoesIA.resumo.proximos_passos || '',
          contagem_cards_criados: sugestoesIA.cards?.length || 0,
        })
      }

      // 3. Atualizar contexto histórico de projetos e contatos
      if (sugestoesIA.atualizacoes_contexto) {
        for (const act of sugestoesIA.atualizacoes_contexto) {
          if (act.tipo === 'projeto' && act.id) {
            await diamondApi
              .updateProjeto(act.id, { contexto_resumido: act.novo_contexto })
              .catch(() => {})
          } else if (act.tipo === 'contato' && act.id) {
            await diamondApi
              .updateContato(act.id, { contexto_resumido: act.novo_contexto })
              .catch(() => {})
          }
        }
      }

      // 4. Marcar os registros da folha como processados
      const pendentes = folhaItems.filter((f) => f.status === 'pendente')
      for (const f of pendentes) {
        await diamondApi.updateFolhaDia(f.id, { status: 'processado' })
      }

      toast({
        title: 'Sessão finalizada e organizada com sucesso!',
        description: 'Cards inseridos no Kanban e Resumo do Dia gravado na memória.',
      })

      setModalRevisaoOpen(false)
      await carregarDados()
    } catch (err) {
      toast({
        title: 'Erro ao consolidar',
        description: (err as Error)?.message || 'Erro ao salvar alterações.',
        variant: 'destructive',
      })
    } finally {
      setSalvandoRevisao(false)
    }
  }

  const pendentes = folhaItems.filter((item) => item.status === 'pendente')
  const processados = folhaItems.filter((item) => item.status === 'processado')

  const getOrigemIcon = (tipo?: OrigemTipo) => {
    switch (tipo) {
      case 'whatsapp':
        return <MessageSquare className="w-3.5 h-3.5 text-emerald-600" />
      case 'email':
        return <Mail className="w-3.5 h-3.5 text-blue-600" />
      case 'importado':
        return <FileText className="w-3.5 h-3.5 text-purple-600" />
      default:
        return <PhoneCall className="w-3.5 h-3.5 text-amber-600" />
    }
  }

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-xl border border-[#E5E1D8] shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl md:text-2xl font-bold tracking-tight text-[#1A1D21]">
              Folha em Branco do Dia
            </h1>
            <Badge className="bg-[#0F766E]/10 text-[#0F766E] border-none text-[11px] font-semibold">
              Captura Rápida
            </Badge>
          </div>
          <p className="text-xs text-[#5B6470] mt-1">
            Lance livremente ligações, conversas, e-mails, WhatsApp e anotações. A IA estrutura em
            fluxos e cards.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            onClick={handleOrganizarComIA}
            disabled={organizando || pendentes.length === 0}
            className="bg-[#0F766E] hover:bg-[#0D5C56] text-white text-xs h-9 px-4 font-medium shadow-sm gap-2"
          >
            {organizando ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Organizando com IA...
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                Organizar com IA & Finalizar Sessão
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Formulário de Captura */}
      <Card className="border-[#E5E1D8] bg-white shadow-xs">
        <CardHeader className="pb-3 border-b border-[#E5E1D8]/60">
          <CardTitle className="text-sm font-semibold text-[#1A1D21] flex items-center gap-2">
            <FileEdit className="w-4 h-4 text-[#0F766E]" />
            Nova Captura / Lançamento Rápido
          </CardTitle>
          <CardDescription className="text-xs text-[#5B6470]">
            Escreva como vier: ligações, conversas, prazos. A agenda separa por negócio, pessoa e
            tarefa, e você confirma.
          </CardDescription>
        </CardHeader>
        <form onSubmit={handleAdicionarRegistro}>
          <CardContent className="space-y-4 pt-4">
            {/* Texto de apoio / orientação de uso visível acima do campo */}
            <div className="rounded-lg bg-[#0F766E]/5 border border-[#0F766E]/20 p-3 text-xs text-[#0D5C56] leading-relaxed flex items-start gap-2.5">
              <Sparkles className="w-4 h-4 text-[#0F766E] shrink-0 mt-0.5" />
              <span>
                Escreva como vier: ligações, conversas, prazos. A agenda separa por negócio, pessoa
                e tarefa, e você confirma.
              </span>
            </div>

            <Textarea
              rows={3}
              required
              placeholder="Escreva como vier: ligações, conversas, prazos. A agenda separa por negócio, pessoa e tarefa, e você confirma."
              value={novoRegistro}
              onChange={(e) => setNovoRegistro(e.target.value)}
              className="text-sm border-[#E5E1D8] resize-none"
            />

            {/* Metadados Opcionais da Captura */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 pt-1">
              <div>
                <label className="text-[11px] font-semibold text-[#5B6470] block mb-1">
                  Origem do Registro
                </label>
                <Select value={tipoOrigem} onValueChange={(v) => setTipoOrigem(v as OrigemTipo)}>
                  <SelectTrigger className="text-xs h-8 border-[#E5E1D8]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="manual">Manual / Anotação</SelectItem>
                    <SelectItem value="whatsapp">WhatsApp</SelectItem>
                    <SelectItem value="email">E-mail</SelectItem>
                    <SelectItem value="importado">Importado / Outro</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-[11px] font-semibold text-[#5B6470] block mb-1">
                  Referência (Opcional)
                </label>
                <Input
                  placeholder="Ex: Grupo Diretoria"
                  value={origemRef}
                  onChange={(e) => setOrigemRef(e.target.value)}
                  className="text-xs h-8 border-[#E5E1D8]"
                />
              </div>

              <div>
                <label className="text-[11px] font-semibold text-[#5B6470] block mb-1">
                  Vincular a Projeto
                </label>
                <Select value={projetoId} onValueChange={setProjetoId}>
                  <SelectTrigger className="text-xs h-8 border-[#E5E1D8]">
                    <SelectValue placeholder="Automático (IA)" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Automático (Deixar para IA)</SelectItem>
                    {projetos.map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.nome}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-[11px] font-semibold text-[#5B6470] block mb-1">
                  Vincular a Contato
                </label>
                <Select value={contatoId} onValueChange={setContatoId}>
                  <SelectTrigger className="text-xs h-8 border-[#E5E1D8]">
                    <SelectValue placeholder="Automático (IA)" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Automático (Deixar para IA)</SelectItem>
                    {contatos.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.nome}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <Button
                type="submit"
                disabled={loadingAdd}
                className="bg-[#0F766E] hover:bg-[#0D5C56] text-white text-xs h-8 px-4 font-medium"
              >
                <Send className="w-3.5 h-3.5 mr-1.5" />
                {loadingAdd ? 'Lançando...' : 'Lançar na Folha'}
              </Button>
            </div>
          </CardContent>
        </form>
      </Card>

      {/* Listagem de Registros Pendentes e Processados */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-[#1A1D21] flex items-center gap-2">
            <Clock className="w-4 h-4 text-[#D97706]" />
            Registros Pendentes de Organização ({pendentes.length})
          </h2>
        </div>

        {pendentes.length === 0 ? (
          <div className="bg-white border border-[#E5E1D8] rounded-xl p-8 text-center text-xs text-[#5B6470] space-y-2">
            <p className="font-medium text-[#1A1D21]">Folha em branco limpa.</p>
            <p className="text-[#0D5C56] max-w-md mx-auto">
              Escreva como vier: ligações, conversas, prazos. A agenda separa por negócio, pessoa e
              tarefa, e você confirma.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {pendentes.map((item) => (
              <div
                key={item.id}
                className="p-3.5 rounded-lg border border-[#E5E1D8] bg-white hover:border-[#0F766E]/40 transition-colors shadow-2xs flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <div className="flex items-center gap-1.5 text-[11px] text-[#5B6470]">
                      {getOrigemIcon(item.tipo_origem)}
                      <span className="capitalize font-semibold">{item.tipo_origem}</span>
                      {item.origem_ref && <span>• {item.origem_ref}</span>}
                    </div>
                    <button
                      onClick={() => handleExcluirRegistro(item.id)}
                      className="text-[#5B6470] hover:text-red-600 transition-colors"
                      title="Excluir anotação"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <p className="text-xs text-[#1A1D21] whitespace-pre-wrap leading-relaxed">
                    {item.registro}
                  </p>
                </div>

                <div className="flex items-center gap-2 mt-3 pt-2 border-t border-[#E5E1D8]/60 text-[10px] text-[#5B6470]">
                  {item.expand?.projeto && (
                    <span className="bg-[#F4F2EE] px-1.5 py-0.5 rounded truncate">
                      📁 {item.expand.projeto.nome}
                    </span>
                  )}
                  {item.expand?.contato && (
                    <span className="bg-[#F4F2EE] px-1.5 py-0.5 rounded truncate">
                      👤 {item.expand.contato.nome}
                    </span>
                  )}
                  <span className="ml-auto text-[10px] text-[#5B6470]">
                    {item.created?.slice(11, 16)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Histórico Recente de Processados */}
        {processados.length > 0 && (
          <div className="pt-4">
            <h3 className="text-xs font-semibold text-[#5B6470] uppercase tracking-wider mb-2">
              Processados Recentemente ({processados.length})
            </h3>
            <div className="space-y-1.5">
              {processados.slice(0, 5).map((item) => (
                <div
                  key={item.id}
                  className="p-2.5 rounded bg-white/60 border border-[#E5E1D8] text-xs text-[#5B6470] flex items-center justify-between opacity-80"
                >
                  <div className="truncate pr-4 flex items-center gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                    <span className="truncate">{item.registro}</span>
                  </div>
                  <span className="text-[10px] shrink-0 text-[#5B6470]">
                    {item.data || item.created?.slice(0, 10)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Modal de Revisão e Aprovação da IA */}
      <Dialog open={modalRevisaoOpen} onOpenChange={setModalRevisaoOpen}>
        <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto bg-white border border-[#E5E1D8]">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-[#1A1D21] flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-[#0F766E]" />
              Revisão de Sugestões da IA Diamond
            </DialogTitle>
            <DialogDescription className="text-xs text-[#5B6470]">
              Revise os cards gerados e a síntese executiva antes de gravar no sistema e consolidar
              a memória.
            </DialogDescription>
          </DialogHeader>

          {sugestoesIA && (
            <div className="space-y-5 pt-2">
              {/* Cards Sugeridos */}
              <div>
                <h4 className="text-xs font-bold text-[#1A1D21] uppercase tracking-wider mb-2 flex items-center justify-between">
                  <span>Cards Sugeridos para o Kanban ({sugestoesIA.cards?.length || 0})</span>
                  <span className="text-[11px] text-[#0F766E] normal-case font-medium">
                    Você poderá editar no Kanban
                  </span>
                </h4>
                <div className="space-y-2.5 max-h-[260px] overflow-y-auto pr-1">
                  {sugestoesIA.cards?.map((card, idx) => (
                    <div
                      key={idx}
                      className="p-3 rounded-lg border border-[#E5E1D8] bg-[#F4F2EE]/40 text-xs space-y-1.5"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-bold text-[#1A1D21]">{card.titulo}</span>
                        <div className="flex items-center gap-1.5">
                          <Badge variant="outline" className="text-[10px] capitalize">
                            {card.status.replace('_', ' ')}
                          </Badge>
                          <Badge className="text-[10px] bg-[#0F766E] text-white">
                            {card.prioridade}
                          </Badge>
                        </div>
                      </div>
                      <p className="text-[#5B6470]">{card.descricao}</p>
                      {card.proximo_passo && (
                        <p className="text-[#0F766E] font-medium flex items-center gap-1">
                          <ArrowRight className="w-3 h-3" />
                          Próximo passo: {card.proximo_passo}
                        </p>
                      )}
                      {card.tags && card.tags.length > 0 && (
                        <div className="flex flex-wrap gap-1 pt-1">
                          {card.tags.map((t, i) => (
                            <span
                              key={i}
                              className="text-[9px] bg-white border border-[#E5E1D8] px-1.5 py-0.5 rounded text-[#5B6470]"
                            >
                              #{t}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Resumo do Dia Sugerido */}
              {sugestoesIA.resumo && (
                <div className="border-t border-[#E5E1D8] pt-3 space-y-2 text-xs">
                  <h4 className="font-bold text-[#1A1D21] uppercase tracking-wider text-[11px]">
                    Síntese Executiva Gerada
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                    <div className="bg-[#F4F2EE]/50 p-2.5 rounded border border-[#E5E1D8]">
                      <span className="font-semibold block text-[11px] mb-1">🎯 Prioridades:</span>
                      <p className="text-[#5B6470] whitespace-pre-line">
                        {sugestoesIA.resumo.prioridades}
                      </p>
                    </div>
                    <div className="bg-[#F4F2EE]/50 p-2.5 rounded border border-[#E5E1D8]">
                      <span className="font-semibold block text-[11px] mb-1">💡 Decisões:</span>
                      <p className="text-[#5B6470] whitespace-pre-line">
                        {sugestoesIA.resumo.decisoes}
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          <DialogFooter className="flex justify-between items-center pt-4 border-t border-[#E5E1D8]">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setModalRevisaoOpen(false)}
              className="text-xs"
            >
              Cancelar
            </Button>
            <Button
              type="button"
              size="sm"
              disabled={salvandoRevisao}
              onClick={handleAprovarESalvar}
              className="bg-[#0F766E] hover:bg-[#0D5C56] text-white text-xs px-4"
            >
              {salvandoRevisao ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" />
                  Salvando Fluxo...
                </>
              ) : (
                <>
                  <Check className="w-3.5 h-3.5 mr-1.5" />
                  Aprovar & Salvar no Sistema
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
