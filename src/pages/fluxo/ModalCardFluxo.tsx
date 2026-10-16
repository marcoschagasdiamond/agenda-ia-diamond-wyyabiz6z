import { useState, useEffect } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { GitBranch, ArrowRight, Check, PowerOff, Power } from 'lucide-react'
import type { Card, CategoriaFluxo, FluxoKanban, ColunaFluxo } from '@/types'
import { diamondApi } from '@/services/diamondApi'
import { useToast } from '@/hooks/use-toast'

interface ModalCardFluxoProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  card: Card | null
  categorias: CategoriaFluxo[]
  fluxos: FluxoKanban[]
  colunas: ColunaFluxo[]
  onAtualizado: () => Promise<void> | void
}

export function ModalCardFluxo({
  open,
  onOpenChange,
  card,
  categorias,
  fluxos,
  colunas,
  onAtualizado,
}: ModalCardFluxoProps) {
  const { toast } = useToast()

  const [categoriaDestino, setCategoriaDestino] = useState<string>('')
  const [fluxoDestino, setFluxoDestino] = useState<string>('')
  const [faseDestino, setFaseDestino] = useState<string>('')
  const [salvando, setSalvando] = useState(false)
  const [alternandoStatusFluxo, setAlternandoStatusFluxo] = useState(false)

  // Fluxo atual vinculado ao card
  const fluxoAtual = fluxos.find((f) => f.id === card?.fluxo_id)
  const categoriaAtual = categorias.find((c) => c.id === fluxoAtual?.categoria)
  const colunaAtual = colunas.find((c) => c.chave === card?.status)

  // Ao abrir ou mudar o card, inicializa seletores com a localização atual
  useEffect(() => {
    if (!open || !card) return

    const catId = fluxoAtual?.categoria || categorias[0]?.id || ''
    setCategoriaDestino(catId)

    const flxId = card.fluxo_id || fluxos.find((f) => f.categoria === catId)?.id || ''
    setFluxoDestino(flxId)

    const fasesDoFluxo = colunas.filter((c) => !flxId || c.fluxo_id === flxId)
    const faseInicial =
      fasesDoFluxo.find((c) => c.chave === card.status)?.chave || fasesDoFluxo[0]?.chave || ''
    setFaseDestino(faseInicial)
  }, [open, card, fluxoAtual, categorias, fluxos, colunas])

  // Quando categoria destino muda, recalcula fluxos compatíveis
  const handleCategoriaChange = (novaCatId: string) => {
    setCategoriaDestino(novaCatId)
    const fluxosDisponiveis = fluxos.filter(
      (f) => f.categoria === novaCatId && (f.ativo !== false || f.id === card?.fluxo_id),
    )
    const novoFlxId = fluxosDisponiveis[0]?.id || ''
    setFluxoDestino(novoFlxId)

    const fases = colunas.filter((c) => c.fluxo_id === novoFlxId)
    setFaseDestino(fases[0]?.chave || '')
  }

  // Quando fluxo destino muda, recalcula fases compatíveis
  const handleFluxoChange = (novoFlxId: string) => {
    setFluxoDestino(novoFlxId)
    const fases = colunas.filter((c) => c.fluxo_id === novoFlxId)
    setFaseDestino(fases[0]?.chave || '')
  }

  // Salvar revinculação do card
  const handleSalvarRevinculo = async () => {
    if (!card) return
    if (!fluxoDestino) {
      toast({
        title: 'Selecione um fluxo',
        description: 'É necessário selecionar um fluxo de destino.',
        variant: 'destructive',
      })
      return
    }

    setSalvando(true)
    try {
      const flxAlvo = fluxos.find((f) => f.id === fluxoDestino)
      const catAlvo = categorias.find((c) => c.id === flxAlvo?.categoria)
      const faseAlvo = colunas.find((c) => c.chave === faseDestino)

      await diamondApi.updateCard(card.id, {
        fluxo_id: fluxoDestino,
        status: faseDestino || card.status,
      })

      toast({
        title: 'Card revinculado com sucesso!',
        description: `Vinculado a "${catAlvo?.nome || 'Geral'} › ${flxAlvo?.nome || flxAlvo?.titulo}" na fase "${faseAlvo?.titulo || faseDestino}".`,
      })

      await onAtualizado()
      onOpenChange(false)
    } catch (err) {
      toast({
        title: 'Erro ao revincular card',
        description: (err as Error)?.message,
        variant: 'destructive',
      })
    } finally {
      setSalvando(false)
    }
  }

  // Ação de inativar / reativar o fluxo atual vinculado
  const handleAlternarStatusFluxoAtual = async () => {
    if (!fluxoAtual) return
    const novoStatusAtivo = fluxoAtual.ativo === false ? true : false

    const acaoTexto = novoStatusAtivo ? 'reativar' : 'inativar'
    if (
      !confirm(
        `Deseja realmente ${acaoTexto} o fluxo "${fluxoAtual.nome || fluxoAtual.titulo}"? ${
          !novoStatusAtivo
            ? 'Ele deixará de aparecer para novas vinculações, mantendo todos os cards e fases intactos.'
            : 'Ele voltará a aparecer nas listas de fluxos ativos.'
        }`,
      )
    ) {
      return
    }

    setAlternandoStatusFluxo(true)
    try {
      await diamondApi.updateFluxoKanban(fluxoAtual.id, {
        ativo: novoStatusAtivo,
      })

      toast({
        title: novoStatusAtivo ? 'Fluxo reativado!' : 'Fluxo inativado com sucesso!',
        description: `O fluxo "${fluxoAtual.nome || fluxoAtual.titulo}" agora está ${
          novoStatusAtivo ? 'ativo' : 'inativo'
        }.`,
      })

      await onAtualizado()
    } catch (err) {
      toast({
        title: 'Erro ao alterar status do fluxo',
        description: (err as Error)?.message,
        variant: 'destructive',
      })
    } finally {
      setAlternandoStatusFluxo(false)
    }
  }

  if (!card) return null

  // Filtra fluxos ativos na categoria destino selecionada
  const fluxosDisponiveisDestino = fluxos.filter(
    (f) =>
      (!categoriaDestino || f.categoria === categoriaDestino) &&
      (f.ativo !== false || f.id === card.fluxo_id),
  )

  const fasesDisponiveisDestino = colunas.filter((c) => c.fluxo_id === fluxoDestino)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md bg-white border border-[#E5E1D8]">
        <DialogHeader>
          <DialogTitle className="text-base font-bold text-[#1A1D21] flex items-center gap-2">
            <GitBranch className="w-5 h-5 text-[#0F766E]" />
            Vínculo de Fluxo do Card
          </DialogTitle>
          <DialogDescription className="text-xs text-[#5B6470]">
            Consulte a localização atual deste card e revincule-o facilmente para outro fluxo e
            fase.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 pt-2">
          {/* Card em foco */}
          <div className="p-3 bg-[#F4F2EE]/60 rounded-xl border border-[#E5E1D8] space-y-1">
            <span className="text-[10px] uppercase font-bold text-[#5B6470] tracking-wider block">
              Card Selecionado
            </span>
            <h4 className="text-sm font-bold text-[#1A1D21] uppercase line-clamp-2">
              {card.titulo}
            </h4>
          </div>

          {/* Localização Atual */}
          <div className="p-3 rounded-xl border border-[#E5E1D8] bg-white space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-[#5B6470] uppercase tracking-wider">
                Fluxo Vinculado Hoje
              </span>
              {fluxoAtual && (
                <Badge
                  variant="outline"
                  className={`text-[10px] font-semibold border-none px-2 py-0.5 ${
                    fluxoAtual.ativo === false
                      ? 'bg-zinc-200 text-zinc-700'
                      : 'bg-emerald-100 text-emerald-800'
                  }`}
                >
                  {fluxoAtual.ativo === false ? 'Inativo' : 'Ativo'}
                </Badge>
              )}
            </div>

            {fluxoAtual ? (
              <div className="space-y-1.5">
                <div className="flex items-center gap-2 text-xs font-semibold text-[#1A1D21]">
                  <span
                    className="w-2.5 h-2.5 rounded-full shrink-0 shadow-2xs"
                    style={{ backgroundColor: fluxoAtual.cor || '#0F766E' }}
                  />
                  <span>
                    {categoriaAtual ? `${categoriaAtual.nome} › ` : ''}
                    {fluxoAtual.nome || fluxoAtual.titulo}
                  </span>
                </div>

                <div className="flex items-center gap-2 text-[11px] text-[#5B6470] pl-4.5">
                  <span>Fase atual:</span>
                  <span className="font-semibold text-[#0F766E]">
                    {colunaAtual?.titulo || card.status}
                  </span>
                </div>
              </div>
            ) : (
              <p className="text-xs text-amber-700 italic">
                Este card não possui um fluxo diretamente associado.
              </p>
            )}

            {/* Ação rápida para inativar / reativar o fluxo atual */}
            {fluxoAtual && (
              <div className="pt-2 border-t border-[#E5E1D8]/70 flex items-center justify-between">
                <span className="text-[11px] text-[#5B6470]">Status do fluxo:</span>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  disabled={alternandoStatusFluxo}
                  onClick={handleAlternarStatusFluxoAtual}
                  className={`h-7 px-2.5 text-xs font-semibold gap-1.5 ${
                    fluxoAtual.ativo === false
                      ? 'text-emerald-700 hover:text-emerald-800 hover:bg-emerald-50'
                      : 'text-zinc-600 hover:text-red-600 hover:bg-red-50'
                  }`}
                >
                  {fluxoAtual.ativo === false ? (
                    <>
                      <Power className="w-3.5 h-3.5" />
                      Reativar Fluxo
                    </>
                  ) : (
                    <>
                      <PowerOff className="w-3.5 h-3.5" />
                      Inativar Fluxo
                    </>
                  )}
                </Button>
              </div>
            )}
          </div>

          {/* Seleção de Revinculação */}
          <div className="p-3.5 rounded-xl border border-[#0F766E]/30 bg-[#0F766E]/5 space-y-3">
            <span className="text-xs font-bold text-[#0F766E] flex items-center gap-1.5">
              <ArrowRight className="w-3.5 h-3.5" />
              Revincular a Outro Fluxo & Fase
            </span>

            {/* 1. Categoria Destino */}
            <div className="space-y-1">
              <label className="text-[11px] font-semibold text-[#5B6470]">1. Categoria</label>
              <Select value={categoriaDestino} onValueChange={handleCategoriaChange}>
                <SelectTrigger className="text-xs h-8 bg-white border-[#E5E1D8]">
                  <SelectValue placeholder="Selecione a categoria" />
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

            {/* 2. Fluxo Destino */}
            <div className="space-y-1">
              <label className="text-[11px] font-semibold text-[#5B6470]">2. Fluxo Destino</label>
              <Select value={fluxoDestino} onValueChange={handleFluxoChange}>
                <SelectTrigger className="text-xs h-8 bg-white border-[#E5E1D8]">
                  <SelectValue placeholder="Selecione o fluxo" />
                </SelectTrigger>
                <SelectContent>
                  {fluxosDisponiveisDestino.map((flx) => (
                    <SelectItem key={flx.id} value={flx.id}>
                      <span className="flex items-center gap-1.5">
                        <span
                          className="w-2 h-2 rounded-full shrink-0"
                          style={{ backgroundColor: flx.cor || '#0F766E' }}
                        />
                        <span>{flx.nome || flx.titulo}</span>
                        {flx.ativo === false && (
                          <span className="text-[9px] text-zinc-500 italic">(Inativo)</span>
                        )}
                      </span>
                    </SelectItem>
                  ))}
                  {fluxosDisponiveisDestino.length === 0 && (
                    <SelectItem value="__none__" disabled>
                      Nenhum fluxo disponível nesta categoria
                    </SelectItem>
                  )}
                </SelectContent>
              </Select>
            </div>

            {/* 3. Fase Destino */}
            <div className="space-y-1">
              <label className="text-[11px] font-semibold text-[#5B6470]">3. Fase da Coluna</label>
              <Select value={faseDestino} onValueChange={setFaseDestino}>
                <SelectTrigger className="text-xs h-8 bg-white border-[#E5E1D8]">
                  <SelectValue placeholder="Selecione a fase" />
                </SelectTrigger>
                <SelectContent>
                  {fasesDisponiveisDestino.map((col) => (
                    <SelectItem key={col.chave} value={col.chave}>
                      <span className="flex items-center gap-1.5">
                        <span
                          className="w-2 h-2 rounded-full shrink-0"
                          style={{ backgroundColor: col.cor || '#0F766E' }}
                        />
                        <span>{col.titulo}</span>
                      </span>
                    </SelectItem>
                  ))}
                  {fasesDisponiveisDestino.length === 0 && (
                    <SelectItem value="__none__" disabled>
                      Nenhuma fase encontrada no fluxo selecionado
                    </SelectItem>
                  )}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Rodapé com botões de ação */}
          <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#E5E1D8]">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => onOpenChange(false)}
              className="text-xs h-8"
            >
              Cancelar
            </Button>
            <Button
              type="button"
              size="sm"
              disabled={salvando || !fluxoDestino}
              onClick={handleSalvarRevinculo}
              className="bg-[#0F766E] hover:bg-[#0D5C56] text-white text-xs h-8 px-4 font-semibold gap-1.5 shadow-2xs"
            >
              <Check className="w-3.5 h-3.5" />
              {salvando ? 'Salvando...' : 'Confirmar Revinculação'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
