import { useState, useEffect } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import {
  Users,
  Copy,
  PlusCircle,
  Link2,
  Trash2,
  ExternalLink,
  Check,
  GitBranch,
  X,
  Loader2,
  FileText,
} from 'lucide-react'
import type { Card, CategoriaFluxo, FluxoKanban, ColunaFluxo } from '@/types'
import { diamondApi } from '@/services/diamondApi'
import { useToast } from '@/hooks/use-toast'

interface ModalCardFamiliaProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  card: Card | null
  todosCards: Card[]
  categorias: CategoriaFluxo[]
  fluxos: FluxoKanban[]
  colunas: ColunaFluxo[]
  onAtualizado: () => Promise<void> | void
  onExcluirCard: (card: Card) => Promise<void> | void
}

type TabAcao = 'resumo' | 'duplicar' | 'novo_filho' | 'vincular_pai'

export function ModalCardFamilia({
  open,
  onOpenChange,
  card,
  todosCards,
  categorias,
  fluxos,
  colunas,
  onAtualizado,
  onExcluirCard,
}: ModalCardFamiliaProps) {
  const { toast } = useToast()

  const [abaAtiva, setAbaAtiva] = useState<TabAcao>('resumo')

  // Subtarefas / cards filhos carregados
  const [filhos, setFilhos] = useState<Card[]>([])
  const [carregandoFilhos, setCarregandoFilhos] = useState(false)

  // Estado para Duplicação
  const [dupTitulo, setDupTitulo] = useState('')
  const [dupCategoria, setDupCategoria] = useState('')
  const [dupFluxo, setDupFluxo] = useState('')
  const [dupFase, setDupFase] = useState('')
  const [duplicando, setDuplicando] = useState(false)

  // Estado para Criar Filho
  const [filhoTitulo, setFilhoTitulo] = useState('')
  const [filhoDescricao, setFilhoDescricao] = useState('')
  const [filhoPrioridade, setFilhoPrioridade] = useState<'baixa' | 'media' | 'alta' | 'urgente'>(
    'media',
  )
  const [criandoFilho, setCriandoFilho] = useState(false)

  // Estado para Vincular a Pai existente
  const [idPaiSelecionado, setIdPaiSelecionado] = useState<string>('')
  const [salvandoPai, setSalvandoPai] = useState(false)

  // Card pai atual
  const cardPaiAtual = todosCards.find((c) => c.id === card?.card_pai)

  // Carrega filhos quando abrir ou mudar o card
  const carregarFilhos = async () => {
    if (!card) return
    setCarregandoFilhos(true)
    try {
      const lista = await diamondApi.listCardsFilhos(card.id)
      setFilhos(lista)
    } catch (err) {
      console.error('Erro ao listar cards filhos:', err)
    } finally {
      setCarregandoFilhos(false)
    }
  }

  useEffect(() => {
    if (open && card) {
      setAbaAtiva('resumo')
      setDupTitulo(`${card.titulo} (Cópia)`)

      const flxAtual = fluxos.find((f) => f.id === card.fluxo_id)
      const catInicial = flxAtual?.categoria || categorias[0]?.id || ''
      setDupCategoria(catInicial)

      const flxInicial = card.fluxo_id || fluxos.find((f) => f.categoria === catInicial)?.id || ''
      setDupFluxo(flxInicial)

      const fasesDoFluxo = colunas.filter((c) => c.fluxo_id === flxInicial)
      setDupFase(
        fasesDoFluxo.find((c) => c.chave === card.status)?.chave ||
          fasesDoFluxo[0]?.chave ||
          card.status,
      )

      setFilhoTitulo('')
      setFilhoDescricao('')
      setFilhoPrioridade(card.prioridade || 'media')

      setIdPaiSelecionado(card.card_pai || '')

      carregarFilhos()
    }
  }, [open, card?.id])

  // Tratar mudança de categoria na duplicação
  const handleDupCategoriaChange = (catId: string) => {
    setDupCategoria(catId)
    const fluxosDisponiveis = fluxos.filter((f) => f.categoria === catId && f.ativo !== false)
    const flxId = fluxosDisponiveis[0]?.id || ''
    setDupFluxo(flxId)
    const fases = colunas.filter((c) => c.fluxo_id === flxId)
    setDupFase(fases[0]?.chave || '')
  }

  // Tratar mudança de fluxo na duplicação
  const handleDupFluxoChange = (flxId: string) => {
    setDupFluxo(flxId)
    const fases = colunas.filter((c) => c.fluxo_id === flxId)
    setDupFase(fases[0]?.chave || '')
  }

  // 1. Duplicar Card com Destino
  const handleConfirmarDuplicar = async () => {
    if (!card || !dupTitulo.trim() || !dupFluxo) {
      toast({
        title: 'Campos incompletos',
        description: 'Informe o título e selecione o fluxo de destino.',
        variant: 'destructive',
      })
      return
    }

    setDuplicando(true)
    try {
      const flxDestino = fluxos.find((f) => f.id === dupFluxo)
      const catDestino = categorias.find((c) => c.id === flxDestino?.categoria)

      await diamondApi.createCard({
        titulo: dupTitulo.trim(),
        descricao: card.descricao,
        fluxo_id: dupFluxo,
        status: dupFase || card.status,
        prioridade: card.prioridade,
        projeto: card.projeto,
        negocio: card.negocio,
        contato: card.contato,
        responsavel: card.responsavel,
        tags: card.tags ? [...card.tags] : [],
        data_prazo: card.data_prazo,
        lembrete_modo: card.lembrete_modo,
        lembrete_antecedencias: card.lembrete_antecedencias,
        card_pai: card.card_pai, // herda mesmo pai se houver
      })

      toast({
        title: 'Card duplicado com sucesso!',
        description: `Destino: "${catDestino?.nome || ''} › ${flxDestino?.nome || flxDestino?.titulo}" na fase "${dupFase}".`,
      })

      await onAtualizado()
      onOpenChange(false)
    } catch (err) {
      toast({
        title: 'Erro ao duplicar card',
        description: (err as Error)?.message,
        variant: 'destructive',
      })
    } finally {
      setDuplicando(false)
    }
  }

  // 2. Criar Card Filho (Subtarefa)
  const handleCriarFilho = async () => {
    if (!card || !filhoTitulo.trim()) {
      toast({
        title: 'Título obrigatório',
        description: 'Digite um título para o card filho.',
        variant: 'destructive',
      })
      return
    }

    setCriandoFilho(true)
    try {
      await diamondApi.createCard({
        titulo: filhoTitulo.trim(),
        descricao: filhoDescricao.trim() || undefined,
        fluxo_id: card.fluxo_id,
        status: card.status,
        prioridade: filhoPrioridade,
        projeto: card.projeto,
        negocio: card.negocio,
        contato: card.contato,
        responsavel: card.responsavel,
        card_pai: card.id,
      })

      toast({
        title: 'Card filho criado com sucesso!',
        description: `Vinculado como subtarefa deste card.`,
      })

      setFilhoTitulo('')
      setFilhoDescricao('')
      await carregarFilhos()
      await onAtualizado()
      setAbaAtiva('resumo')
    } catch (err) {
      toast({
        title: 'Erro ao criar card filho',
        description: (err as Error)?.message,
        variant: 'destructive',
      })
    } finally {
      setCriandoFilho(false)
    }
  }

  // 3. Vincular ou desvincular Pai
  const handleSalvarPai = async (novoPaiId: string | null) => {
    if (!card) return
    setSalvandoPai(true)
    try {
      await diamondApi.updateCard(card.id, {
        card_pai: novoPaiId || undefined,
      })

      toast({
        title: novoPaiId ? 'Card vinculado ao pai!' : 'Vínculo de pai removido',
      })

      await onAtualizado()
      onOpenChange(false)
    } catch (err) {
      toast({
        title: 'Erro ao atualizar relação pai',
        description: (err as Error)?.message,
        variant: 'destructive',
      })
    } finally {
      setSalvandoPai(false)
    }
  }

  // 4. Desvincular um filho
  const handleRemoverFilho = async (filho: Card) => {
    if (
      !confirm(
        `Remover "${filho.titulo}" da hierarquia de filhos deste card? O card não será excluído.`,
      )
    )
      return
    try {
      await diamondApi.updateCard(filho.id, {
        card_pai: undefined,
      })
      toast({
        title: 'Subtarefa desvinculada',
      })
      setFilhos((prev) => prev.filter((f) => f.id !== filho.id))
      await onAtualizado()
    } catch (err) {
      toast({
        title: 'Erro ao desvincular filho',
        description: (err as Error)?.message,
        variant: 'destructive',
      })
    }
  }

  // 5. Copiar URL do card
  const handleCopiarUrl = () => {
    if (!card) return
    const url = `${window.location.origin}/card/${card.id}`
    navigator.clipboard.writeText(url)
    toast({
      title: 'URL copiada!',
      description: 'Link direto para o card copiado para a área de transferência.',
    })
  }

  // 6. Abrir card em nova aba
  const handleAbrirNovaAba = () => {
    if (!card) return
    window.open(`/card/${card.id}`, '_blank')
  }

  // 7. Excluir card
  const handleExcluir = async () => {
    if (!card) return
    onOpenChange(false)
    await onExcluirCard(card)
  }

  if (!card) return null

  // Destino formatado na aba de Duplicar
  const flxAlvoDup = fluxos.find((f) => f.id === dupFluxo)
  const catAlvoDup = categorias.find((c) => c.id === flxAlvoDup?.categoria)
  const faseAlvoDup = colunas.find((c) => c.chave === dupFase)

  // Candidatos para ser card pai (não pode ser ele mesmo nem um dos seus filhos atuais)
  const idsFilhos = new Set(filhos.map((f) => f.id))
  const candidatosPai = todosCards.filter((c) => c.id !== card.id && !idsFilhos.has(c.id))

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl bg-white border border-[#E5E1D8]">
        <DialogHeader>
          <DialogTitle className="text-base font-bold text-[#1A1D21] flex items-center gap-2">
            <Users className="w-5 h-5 text-[#0F766E]" />
            Família, Relações e Ações do Card
          </DialogTitle>
          <DialogDescription className="text-xs text-[#5B6470]">
            Gerencie hierarquia pai/filho, duplicação com destino e atalhos rápidos do card.
          </DialogDescription>
        </DialogHeader>

        {/* Abas de Navegação interna */}
        <div className="flex border-b border-[#E5E1D8] gap-1 pt-1">
          <button
            type="button"
            onClick={() => setAbaAtiva('resumo')}
            className={`px-3 py-1.5 text-xs font-semibold border-b-2 transition-colors ${
              abaAtiva === 'resumo'
                ? 'border-[#0F766E] text-[#0F766E]'
                : 'border-transparent text-[#5B6470] hover:text-[#1A1D21]'
            }`}
          >
            Visão Geral & Ações
          </button>
          <button
            type="button"
            onClick={() => setAbaAtiva('duplicar')}
            className={`px-3 py-1.5 text-xs font-semibold border-b-2 transition-colors ${
              abaAtiva === 'duplicar'
                ? 'border-[#0F766E] text-[#0F766E]'
                : 'border-transparent text-[#5B6470] hover:text-[#1A1D21]'
            }`}
          >
            Duplicar Card
          </button>
          <button
            type="button"
            onClick={() => setAbaAtiva('novo_filho')}
            className={`px-3 py-1.5 text-xs font-semibold border-b-2 transition-colors ${
              abaAtiva === 'novo_filho'
                ? 'border-[#0F766E] text-[#0F766E]'
                : 'border-transparent text-[#5B6470] hover:text-[#1A1D21]'
            }`}
          >
            + Criar Card Filho
          </button>
          <button
            type="button"
            onClick={() => setAbaAtiva('vincular_pai')}
            className={`px-3 py-1.5 text-xs font-semibold border-b-2 transition-colors ${
              abaAtiva === 'vincular_pai'
                ? 'border-[#0F766E] text-[#0F766E]'
                : 'border-transparent text-[#5B6470] hover:text-[#1A1D21]'
            }`}
          >
            Vincular a Card Pai
          </button>
        </div>

        {/* CONTEÚDO DAS ABAS */}
        <div className="pt-3 space-y-4">
          {/* ABA 1: RESUMO & ATALHOS RÁPIDOS */}
          {abaAtiva === 'resumo' && (
            <div className="space-y-4">
              {/* Card Atual */}
              <div className="p-3 bg-[#F4F2EE]/60 rounded-xl border border-[#E5E1D8]">
                <span className="text-[10px] uppercase font-bold text-[#5B6470] tracking-wider block">
                  Card Principal
                </span>
                <h4 className="text-sm font-bold text-[#1A1D21] uppercase mt-0.5">{card.titulo}</h4>
              </div>

              {/* Relação Pai Atual */}
              <div className="p-3 rounded-xl border border-[#E5E1D8] bg-white space-y-2">
                <span className="text-[11px] font-bold text-[#5B6470] uppercase tracking-wider block">
                  Card Pai (Hierarquia Superior)
                </span>
                {cardPaiAtual ? (
                  <div className="flex items-center justify-between p-2 rounded-lg bg-[#0F766E]/5 border border-[#0F766E]/20">
                    <div className="flex items-center gap-2 min-w-0">
                      <GitBranch className="w-4 h-4 text-[#0F766E] shrink-0" />
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-[#1A1D21] truncate uppercase">
                          {cardPaiAtual.titulo}
                        </p>
                        <span className="text-[10px] text-[#5B6470]">
                          Fase: {cardPaiAtual.status}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => window.open(`/card/${cardPaiAtual.id}`, '_blank')}
                        className="h-7 px-2 text-xs text-[#0F766E]"
                        title="Ver card pai"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        disabled={salvandoPai}
                        onClick={() => handleSalvarPai(null)}
                        className="h-7 px-2 text-xs text-red-600 hover:text-red-700 hover:bg-red-50"
                        title="Remover vínculo de pai"
                      >
                        <X className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-between text-xs text-[#5B6470] py-1">
                    <span>Nenhum card pai atribuído (este card é independente).</span>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setAbaAtiva('vincular_pai')}
                      className="h-7 text-xs font-semibold text-[#0F766E] border-[#0F766E]/30"
                    >
                      Vincular Pai
                    </Button>
                  </div>
                )}
              </div>

              {/* Lista de Filhos / Subtarefas */}
              <div className="p-3 rounded-xl border border-[#E5E1D8] bg-white space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-[#5B6470] uppercase tracking-wider">
                    Cards Filhos / Subtarefas ({filhos.length})
                  </span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setAbaAtiva('novo_filho')}
                    className="h-6 px-2 text-[11px] font-semibold text-[#0F766E] hover:bg-[#0F766E]/10"
                  >
                    + Adicionar Filho
                  </Button>
                </div>

                {carregandoFilhos ? (
                  <div className="flex items-center justify-center py-4 text-xs text-[#5B6470] gap-2">
                    <Loader2 className="w-3.5 h-3.5 animate-spin text-[#0F766E]" />
                    Carregando filhos...
                  </div>
                ) : filhos.length === 0 ? (
                  <p className="text-xs text-[#5B6470] italic py-1">
                    Nenhum card filho vinculado. Crie subtarefas para este card para acompanhar o
                    progresso.
                  </p>
                ) : (
                  <div className="max-h-40 overflow-y-auto space-y-1.5">
                    {filhos.map((f) => (
                      <div
                        key={f.id}
                        className="flex items-center justify-between p-2 rounded-lg border border-[#E5E1D8] hover:bg-[#F4F2EE]/50 text-xs"
                      >
                        <div className="min-w-0 flex-1 mr-2">
                          <p className="font-semibold text-[#1A1D21] truncate uppercase">
                            {f.titulo}
                          </p>
                          <span className="text-[10px] text-[#5B6470]">
                            Fase: {f.status} • Prioridade: {f.prioridade || 'Normal'}
                          </span>
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => window.open(`/card/${f.id}`, '_blank')}
                            className="h-6 w-6 p-0 text-[#0F766E]"
                            title="Abrir em nova aba"
                          >
                            <ExternalLink className="w-3 h-3" />
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => handleRemoverFilho(f)}
                            className="h-6 w-6 p-0 text-red-500 hover:text-red-700"
                            title="Desvincular"
                          >
                            <X className="w-3 h-3" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Botões de Ações Rápidas */}
              <div className="pt-2 border-t border-[#E5E1D8] grid grid-cols-2 gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleCopiarUrl}
                  className="h-9 text-xs font-semibold gap-1.5 justify-center border-[#E5E1D8] text-[#1A1D21] hover:bg-[#F4F2EE]"
                >
                  <Copy className="w-3.5 h-3.5 text-[#0F766E]" />
                  Copiar URL do Card
                </Button>

                <Button
                  type="button"
                  variant="outline"
                  onClick={handleAbrirNovaAba}
                  className="h-9 text-xs font-semibold gap-1.5 justify-center border-[#E5E1D8] text-[#1A1D21] hover:bg-[#F4F2EE]"
                >
                  <ExternalLink className="w-3.5 h-3.5 text-[#0F766E]" />
                  Abrir em Nova Aba
                </Button>

                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setAbaAtiva('duplicar')}
                  className="h-9 text-xs font-semibold gap-1.5 justify-center border-[#E5E1D8] text-[#1A1D21] hover:bg-[#F4F2EE]"
                >
                  <Copy className="w-3.5 h-3.5 text-blue-600" />
                  Duplicar Card...
                </Button>

                <Button
                  type="button"
                  variant="outline"
                  onClick={handleExcluir}
                  className="h-9 text-xs font-semibold gap-1.5 justify-center border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  Excluir Card
                </Button>
              </div>
            </div>
          )}

          {/* ABA 2: DUPLICAR CARD */}
          {abaAtiva === 'duplicar' && (
            <div className="space-y-3.5">
              <div className="space-y-1">
                <label className="text-xs font-bold text-[#1A1D21]">Título do Novo Card</label>
                <Input
                  value={dupTitulo}
                  onChange={(e) => setDupTitulo(e.target.value)}
                  placeholder="Nome do card duplicado"
                  className="text-xs h-8 bg-white border-[#E5E1D8]"
                />
              </div>

              {/* Escolha do Destino */}
              <div className="p-3.5 rounded-xl border border-[#0F766E]/30 bg-[#0F766E]/5 space-y-3">
                <span className="text-xs font-bold text-[#0F766E] block">
                  Escolha o Destino da Cópia
                </span>

                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <label className="text-[11px] font-semibold text-[#5B6470]">Categoria</label>
                    <Select value={dupCategoria} onValueChange={handleDupCategoriaChange}>
                      <SelectTrigger className="text-xs h-8 bg-white border-[#E5E1D8]">
                        <SelectValue placeholder="Categoria" />
                      </SelectTrigger>
                      <SelectContent>
                        {categorias.map((cat) => (
                          <SelectItem key={cat.id} value={cat.id}>
                            <span className="flex items-center gap-1.5">
                              <span
                                className="w-2 h-2 rounded-full shrink-0"
                                style={{ backgroundColor: cat.cor || '#0F766E' }}
                              />
                              {cat.nome}
                            </span>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] font-semibold text-[#5B6470]">Fluxo</label>
                    <Select value={dupFluxo} onValueChange={handleDupFluxoChange}>
                      <SelectTrigger className="text-xs h-8 bg-white border-[#E5E1D8]">
                        <SelectValue placeholder="Fluxo" />
                      </SelectTrigger>
                      <SelectContent>
                        {fluxos
                          .filter(
                            (f) =>
                              (!dupCategoria || f.categoria === dupCategoria) && f.ativo !== false,
                          )
                          .map((flx) => (
                            <SelectItem key={flx.id} value={flx.id}>
                              <span className="flex items-center gap-1.5">
                                <span
                                  className="w-2 h-2 rounded-full shrink-0"
                                  style={{ backgroundColor: flx.cor || '#0F766E' }}
                                />
                                {flx.nome || flx.titulo}
                              </span>
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-semibold text-[#5B6470]">Fase / Coluna</label>
                  <Select value={dupFase} onValueChange={setDupFase}>
                    <SelectTrigger className="text-xs h-8 bg-white border-[#E5E1D8]">
                      <SelectValue placeholder="Fase de destino" />
                    </SelectTrigger>
                    <SelectContent>
                      {colunas
                        .filter((c) => c.fluxo_id === dupFluxo)
                        .map((c) => (
                          <SelectItem key={c.chave} value={c.chave}>
                            <span className="flex items-center gap-1.5">
                              <span
                                className="w-2 h-2 rounded-full shrink-0"
                                style={{ backgroundColor: c.cor || '#0F766E' }}
                              />
                              {c.titulo}
                            </span>
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Resumo do Destino */}
                <div className="p-2.5 rounded-lg bg-white border border-[#E5E1D8] text-xs space-y-1">
                  <span className="text-[10px] uppercase font-bold text-[#5B6470]">
                    Destino Confirmado:
                  </span>
                  <p className="font-semibold text-[#1A1D21] flex items-center gap-1.5">
                    <span
                      className="w-2.5 h-2.5 rounded-full shrink-0"
                      style={{ backgroundColor: flxAlvoDup?.cor || '#0F766E' }}
                    />
                    <span>{catAlvoDup?.nome || 'Geral'}</span>
                    <span>›</span>
                    <span>{flxAlvoDup?.nome || flxAlvoDup?.titulo || 'Fluxo'}</span>
                    <span>›</span>
                    <span className="text-[#0F766E]">{faseAlvoDup?.titulo || dupFase}</span>
                  </p>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setAbaAtiva('resumo')}
                  className="text-xs h-8"
                >
                  Voltar
                </Button>
                <Button
                  type="button"
                  size="sm"
                  disabled={duplicando || !dupTitulo.trim() || !dupFluxo}
                  onClick={handleConfirmarDuplicar}
                  className="bg-[#0F766E] hover:bg-[#0D5C56] text-white text-xs h-8 px-4 font-semibold gap-1.5"
                >
                  <Copy className="w-3.5 h-3.5" />
                  {duplicando ? 'Duplicando...' : 'Confirmar e Duplicar'}
                </Button>
              </div>
            </div>
          )}

          {/* ABA 3: CRIAR CARD FILHO */}
          {abaAtiva === 'novo_filho' && (
            <div className="space-y-3.5">
              <div className="space-y-1">
                <label className="text-xs font-bold text-[#1A1D21]">Título da Subtarefa *</label>
                <Input
                  value={filhoTitulo}
                  onChange={(e) => setFilhoTitulo(e.target.value)}
                  placeholder="Ex: Elaborar relatório preliminar..."
                  className="text-xs h-8 bg-white border-[#E5E1D8]"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-[#1A1D21]">Descrição (Opcional)</label>
                <Textarea
                  value={filhoDescricao}
                  onChange={(e) => setFilhoDescricao(e.target.value)}
                  placeholder="Detalhes ou passos desta subtarefa..."
                  rows={3}
                  className="text-xs bg-white border-[#E5E1D8] resize-none"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-[#1A1D21]">Prioridade</label>
                <Select
                  value={filhoPrioridade}
                  onValueChange={(v: 'baixa' | 'media' | 'alta' | 'urgente') =>
                    setFilhoPrioridade(v)
                  }
                >
                  <SelectTrigger className="text-xs h-8 bg-white border-[#E5E1D8]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="baixa">Baixa</SelectItem>
                    <SelectItem value="media">Média</SelectItem>
                    <SelectItem value="alta">Alta</SelectItem>
                    <SelectItem value="urgente">Urgente</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="p-2.5 rounded-lg bg-[#F4F2EE] border border-[#E5E1D8] text-xs text-[#5B6470]">
                O novo card será criado no mesmo fluxo ({card.fluxo_id}) e ficará explicitamente
                vinculado como filho deste card.
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setAbaAtiva('resumo')}
                  className="text-xs h-8"
                >
                  Voltar
                </Button>
                <Button
                  type="button"
                  size="sm"
                  disabled={criandoFilho || !filhoTitulo.trim()}
                  onClick={handleCriarFilho}
                  className="bg-[#0F766E] hover:bg-[#0D5C56] text-white text-xs h-8 px-4 font-semibold gap-1.5"
                >
                  <PlusCircle className="w-3.5 h-3.5" />
                  {criandoFilho ? 'Criando...' : 'Criar Card Filho'}
                </Button>
              </div>
            </div>
          )}

          {/* ABA 4: VINCULAR A CARD PAI */}
          {abaAtiva === 'vincular_pai' && (
            <div className="space-y-3.5">
              <div className="space-y-1">
                <label className="text-xs font-bold text-[#1A1D21]">
                  Escolha um Card Pai Existente
                </label>
                <Select value={idPaiSelecionado} onValueChange={setIdPaiSelecionado}>
                  <SelectTrigger className="text-xs h-8 bg-white border-[#E5E1D8]">
                    <SelectValue placeholder="Selecione o card pai..." />
                  </SelectTrigger>
                  <SelectContent className="max-h-60">
                    <SelectItem value="__none__">Nenhum (Tornar independente)</SelectItem>
                    {candidatosPai.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        <span className="truncate block max-w-sm">
                          {c.titulo} ({c.status})
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <p className="text-xs text-[#5B6470]">
                Ao vincular este card a um pai, ele se torna uma subtarefa subordinada àquele card.
              </p>

              <div className="flex items-center justify-end gap-2 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setAbaAtiva('resumo')}
                  className="text-xs h-8"
                >
                  Voltar
                </Button>
                <Button
                  type="button"
                  size="sm"
                  disabled={salvandoPai || !idPaiSelecionado}
                  onClick={() =>
                    handleSalvarPai(idPaiSelecionado === '__none__' ? null : idPaiSelecionado)
                  }
                  className="bg-[#0F766E] hover:bg-[#0D5C56] text-white text-xs h-8 px-4 font-semibold gap-1.5"
                >
                  <Check className="w-3.5 h-3.5" />
                  {salvandoPai ? 'Salvando...' : 'Salvar Vínculo Pai'}
                </Button>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
