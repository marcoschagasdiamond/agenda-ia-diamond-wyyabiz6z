import { useState, useEffect } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Loader2,
  AlertTriangle,
  Pencil,
  FolderInput,
  GitBranch,
  UserMinus,
  Unlink,
  Copy,
  Trash2,
} from 'lucide-react'
import type { Card, CategoriaFluxo, FluxoKanban, ColunaFluxo, GrupoFamilia } from '@/types'
import { useToast } from '@/hooks/use-toast'
import { diamondApi } from '@/services/diamondApi'
import { criarEventoCard, textoEventoMovimento } from '@/services/eventosCard'

/**
 * Modal de gestão de um Grupo de Família a partir do menu de 3 pontinhos no
 * cabeçalho do grupo (coluna do Kanban em /fluxo).
 *
 * Ações:
 *  1. Editar (renomear + cor)
 *  2. Encaminhar para outra categoria (grupo + cards para fluxo de outra cat.)
 *  3. Encaminhar para outro fluxo (mesma categoria)
 *  4. Retirar card do fluxo/grupo (sem apagar)
 *  5. Desfazer grupo (cards soltos na coluna)
 *  6. Duplicar grupo (com cards) para outra coluna/fluxo
 *  7. Excluir grupo (com escolha do destino dos cards)
 *
 * REGRA CRÍTICA: qualquer movimentação que troque de coluna grava nos cards um
 * status VÁLIDO do destino (uma fase real do fluxo de destino) — nunca deixa
 * card órfão de coluna (bug de cards sumindo do quadro, já enfrentado antes).
 */

const CORES_GRUPO = [
  '#3B82F6',
  '#0F766E',
  '#10B981',
  '#F59E0B',
  '#EF4444',
  '#8B5CF6',
  '#EC4899',
  '#64748B',
]

/** Ação selecionável direto no menu de 3 pontinhos (abre o modal já na etapa). */
export type ModoGestaoFamilia =
  | 'editar'
  | 'encaminhar_categoria'
  | 'encaminhar_fluxo'
  | 'retirar_card'
  | 'duplicar'
  | 'excluir'
  | 'desfazer'

interface ModalGestaoGrupoFamiliaProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  familia: GrupoFamilia | null
  /** Ação vinda do dropdown de 3 pontinhos — o modal abre já nela (menu principal quando ausente). */
  modoInicial?: ModoGestaoFamilia | null
  cardsDoGrupo: Card[]
  categorias: CategoriaFluxo[]
  fluxos: FluxoKanban[]
  colunas: ColunaFluxo[]
  /** Fluxo atual do board (para saber a categoria atual e excluir o fluxo de origem das opções) */
  fluxoAtualId?: string
  onAtualizado: () => Promise<void> | void
}

type Modo = ModoGestaoFamilia | null

export function ModalGestaoGrupoFamilia({
  open,
  onOpenChange,
  familia,
  modoInicial = null,
  cardsDoGrupo,
  categorias,
  fluxos,
  colunas,
  fluxoAtualId,
  onAtualizado,
}: ModalGestaoGrupoFamiliaProps) {
  const { toast } = useToast()

  const [modo, setModo] = useState<Modo>(null)

  // Editar (renomear + cor)
  const [editNome, setEditNome] = useState('')
  const [editCor, setEditCor] = useState('#3B82F6')
  const [salvandoEdicao, setSalvandoEdicao] = useState(false)

  // Encaminhar (categoria / fluxo) + duplicar
  const [destinoCategoria, setDestinoCategoria] = useState('none')
  const [destinoFluxo, setDestinoFluxo] = useState('none')
  const [destinoFase, setDestinoFase] = useState('none')
  const [movendo, setMovendo] = useState(false)

  // Excluir: destino dos cards
  const [excluirModo, setExcluirModo] = useState<'desagrupar' | 'excluir_tudo'>('desagrupar')
  const [excluindo, setExcluindo] = useState(false)

  // Retirar card
  const [cardRetiradaId, setCardRetiradaId] = useState('none')
  const [retirando, setRetirando] = useState(false)

  // Reset ao abrir / trocar de grupo — já posiciona na ação escolhida no
  // dropdown de 3 pontinhos (o menu 'modoInicial' vira o modo direto).
  useEffect(() => {
    if (open && familia) {
      setModo(modoInicial)
      setEditNome(familia.nome)
      setEditCor(familia.cor || '#3B82F6')
      if (modoInicial === 'encaminhar_categoria') {
        setDestinoCategoria('none')
      }
      setDestinoFluxo('none')
      setDestinoFase('none')
      setExcluirModo('desagrupar')
      setCardRetiradaId('none')
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, familia])

  // Categoria do fluxo atual do board
  const categoriaAtualId =
    (fluxoAtualId && fluxos.find((f) => f.id === fluxoAtualId)?.categoria) ||
    familia?.categoria ||
    ''

  // Categorias distintas da atual (Encaminhar para outra categoria)
  const outrasCategorias = categorias.filter((c) => c.id !== categoriaAtualId)

  // Fluxos ativos da categoria de destino (Encaminhar / Duplicar)
  const fluxosDaCategoriaDestino = fluxos.filter(
    (f) => f.categoria === destinoCategoria && f.ativo !== false,
  )

  // Fases (colunas) do fluxo de destino — fonte da verdade do status VÁLIDO
  const fasesDoFluxoDestino = colunas
    .filter((c) => c.fluxo_id === destinoFluxo)
    .sort((a, b) => (a.ordem || 0) - (b.ordem || 0))

  // Ao trocar a categoria de destino, revalida o fluxo/fase escolhidos
  useEffect(() => {
    if (!fluxosDaCategoriaDestino.some((f) => f.id === destinoFluxo)) {
      setDestinoFluxo('none')
      setDestinoFase('none')
    }
  }, [destinoCategoria]) // eslint-disable-line react-hooks/exhaustive-deps

  // Ao trocar o fluxo de destino, valida a fase (padrão: primeira fase real)
  useEffect(() => {
    if (!fasesDoFluxoDestino.some((f) => f.chave === destinoFase)) {
      setDestinoFase(fasesDoFluxoDestino[0]?.chave || 'none')
    }
  }, [destinoFluxo]) // eslint-disable-line react-hooks/exhaustive-deps

  // ==========================================================
  // HELPERS DE MOVIMENTAÇÃO (regra crítica: status válido)
  // ==========================================================

  /**
   * Resolução do status VÁLIDO no destino: quando o usuário não escolhe fase,
   * usa a PRIMEIRA fase real do fluxo de destino. Nunca grava status inválido
   * (card com status inválido some do quadro — bug já enfrentado).
   */
  function resolverStatusDestino(faseEscolhida?: string): string | null {
    const fases = colunas.filter((c) => c.fluxo_id === destinoFluxo)
    if (fases.length === 0) return null
    const ordenadas = [...fases].sort((a, b) => (a.ordem || 0) - (b.ordem || 0))
    if (
      faseEscolhida &&
      faseEscolhida !== 'none' &&
      ordenadas.some((f) => f.chave === faseEscolhida)
    ) {
      return faseEscolhida
    }
    return ordenadas[0].chave
  }

  /** Move cada card do grupo, preservando o vínculo do grupo e a coluna válida. */
  async function moverCards(cards: Card[], status: string, novoFluxoId: string) {
    for (const card of cards) {
      await diamondApi.updateCard(card.id, {
        status,
        fluxo_id: novoFluxoId,
      })
      try {
        const fluxoDestino = fluxos.find((f) => f.id === novoFluxoId)
        const nomeFluxoDestino = fluxoDestino?.nome || fluxoDestino?.titulo || 'Fluxo'
        const nomeColunaDestino = colunas.find((c) => c.chave === status)?.titulo || status
        const dados = { fluxo_nome: nomeFluxoDestino, coluna_nome: nomeColunaDestino }
        await criarEventoCard(card.id, 'movimento', textoEventoMovimento(dados, ''), dados)
      } catch {
        // timeline é best-effort
      }
    }
  }

  /** Limpa o vínculo do card com o grupo (desagrupar), mantendo o card na coluna. */
  async function desagruparCards(cards: Card[]) {
    for (const card of cards) {
      await diamondApi.updateCard(card.id, { grupo_familia: null })
    }
  }

  // ==========================================================
  // AÇÃO 1: EDITAR (renomear + cor)
  // ==========================================================
  async function handleSalvarEdicao() {
    if (!familia) return
    if (!editNome.trim()) {
      toast({
        title: 'Nome obrigatório',
        description: 'Digite o novo nome do grupo.',
        variant: 'destructive',
      })
      return
    }
    setSalvandoEdicao(true)
    try {
      await diamondApi.updateGrupoFamilia(familia.id, {
        nome: editNome.trim(),
        cor: editCor,
      })
      toast({ title: 'Grupo atualizado!' })
      await onAtualizado()
      onOpenChange(false)
    } catch (err) {
      toast({
        title: 'Erro ao atualizar grupo',
        description: (err as Error)?.message,
        variant: 'destructive',
      })
    } finally {
      setSalvandoEdicao(false)
    }
  }

  // ==========================================================
  // AÇÕES 2 E 3: ENCAMINHAR (para outra categoria / outro fluxo)
  // + AÇÃO 6: DUPLICAR
  // ==========================================================
  async function handleMoverGrupo(duplicar: boolean) {
    if (!familia) return
    const status = resolverStatusDestino(destinoFase)
    if (!destinoFluxo || destinoFluxo === 'none' || !status) {
      toast({
        title: 'Destino incompleto',
        description: 'Escolha o fluxo de destino (ele precisa ter fases).',
        variant: 'destructive',
      })
      return
    }

    setMovendo(true)
    try {
      const colunaDestino = colunas.find((c) => c.chave === status)

      if (duplicar) {
        // Duplicar: cria NOVO grupo no destino e copia os cards para ele.
        const novoGrupo = await diamondApi.createGrupoFamilia({
          nome: `${familia.nome} (Cópia)`,
          cor: familia.cor,
          coluna: colunaDestino?.id || undefined,
          categoria: destinoCategoria !== 'none' ? destinoCategoria : familia.categoria,
          ordem: (familia.ordem || 0) + 1,
        })
        for (const card of cardsDoGrupo) {
          await diamondApi.createCard({
            titulo: card.titulo,
            descricao: card.descricao,
            projeto: card.projeto,
            negocio: card.negocio,
            contato: card.contato,
            grupo_familia: novoGrupo.id,
            prioridade: card.prioridade,
            status, // coluna VÁLIDA do destino — nunca card órfão
            proximo_passo: card.proximo_passo,
            tags: card.tags ? [...card.tags] : [],
            data_prazo: card.data_prazo,
            lembrete_modo: card.lembrete_modo,
            lembrete_antecedencias: card.lembrete_antecedencias,
            fluxo_id: destinoFluxo,
          })
        }
        toast({
          title: 'Grupo duplicado!',
          description: `${cardsDoGrupo.length} card(s) copiado(s) para o novo grupo.`,
        })
      } else {
        // Encaminhar: move o grupo inteiro com os cards.
        await diamondApi.updateGrupoFamilia(familia.id, {
          coluna: colunaDestino?.id || undefined,
          categoria: destinoCategoria !== 'none' ? destinoCategoria : familia.categoria,
        })
        await moverCards(cardsDoGrupo, status, destinoFluxo)
        toast({
          title: 'Grupo encaminhado!',
          description: `${cardsDoGrupo.length} card(s) movido(s) com coluna válida no destino.`,
        })
      }

      await onAtualizado()
      onOpenChange(false)
    } catch (err) {
      toast({
        title: duplicar ? 'Erro ao duplicar grupo' : 'Erro ao encaminhar grupo',
        description: (err as Error)?.message,
        variant: 'destructive',
      })
    } finally {
      setMovendo(false)
    }
  }

  // ==========================================================
  // AÇÃO 4: RETIRAR CARD DO FLUXO/GRUPO (sem apagar)
  // ==========================================================
  async function handleRetirarCard() {
    if (!familia || cardRetiradaId === 'none') {
      toast({
        title: 'Selecione um card',
        description: 'Escolha qual card será retirado do grupo.',
        variant: 'destructive',
      })
      return
    }
    setRetirando(true)
    try {
      await diamondApi.updateCard(cardRetiradaId, { grupo_familia: null })
      toast({ title: 'Card retirado do grupo (mantido na coluna).' })
      await onAtualizado()
      onOpenChange(false)
    } catch (err) {
      toast({
        title: 'Erro ao retirar card',
        description: (err as Error)?.message,
        variant: 'destructive',
      })
    } finally {
      setRetirando(false)
    }
  }

  // ==========================================================
  // AÇÃO 5: DESFAZER GRUPO (cards soltos na coluna, sem apagar)
  // ==========================================================
  async function handleDesfazerGrupo() {
    if (!familia) return
    setMovendo(true)
    try {
      await desagruparCards(cardsDoGrupo)
      await diamondApi.deleteGrupoFamilia(familia.id)
      toast({
        title: 'Grupo desfeito!',
        description: `${cardsDoGrupo.length} card(s) solto(s) na coluna.`,
      })
      await onAtualizado()
      onOpenChange(false)
    } catch (err) {
      toast({
        title: 'Erro ao desfazer grupo',
        description: (err as Error)?.message,
        variant: 'destructive',
      })
    } finally {
      setMovendo(false)
    }
  }

  // ==========================================================
  // AÇÃO 7: EXCLUIR GRUPO (com escolha do destino dos cards)
  // ==========================================================
  async function handleExcluirGrupo() {
    if (!familia) return
    setExcluindo(true)
    try {
      if (excluirModo === 'desagrupar') {
        await desagruparCards(cardsDoGrupo)
      } else {
        for (const card of cardsDoGrupo) {
          await diamondApi.deleteCard(card.id)
        }
      }
      await diamondApi.deleteGrupoFamilia(familia.id)
      toast({
        title: 'Grupo excluído.',
        description:
          excluirModo === 'desagrupar'
            ? `${cardsDoGrupo.length} card(s) mantido(s) na coluna.`
            : `${cardsDoGrupo.length} card(s) excluído(s) junto.`,
      })
      await onAtualizado()
      onOpenChange(false)
    } catch (err) {
      toast({
        title: 'Erro ao excluir grupo',
        description: (err as Error)?.message,
        variant: 'destructive',
      })
    } finally {
      setExcluindo(false)
    }
  }

  if (!familia) return null

  const ocupado = salvandoEdicao || movendo || retirando || excluindo

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base">
            <span
              className="w-2.5 h-2.5 rounded-full"
              style={{ backgroundColor: familia.cor || '#3B82F6' }}
            />
            Grupo &quot;{familia.nome}&quot;
          </DialogTitle>
          <DialogDescription>{cardsDoGrupo.length} card(s) neste grupo</DialogDescription>
        </DialogHeader>

        {/* ===================== EDITAR ===================== */}
        {modo === 'editar' && (
          <div className="space-y-4 py-1">
            <div className="space-y-1.5">
              <Label className="text-xs">Nome do grupo</Label>
              <Input
                autoFocus
                value={editNome}
                onChange={(e) => setEditNome(e.target.value)}
                placeholder="Nome do grupo de família"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Cor</Label>
              <div className="flex flex-wrap gap-2">
                {CORES_GRUPO.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setEditCor(c)}
                    className={`w-7 h-7 rounded-full border-2 transition-transform ${
                      editCor === c ? 'border-[#1A1D21] scale-110' : 'border-transparent'
                    }`}
                    style={{ backgroundColor: c }}
                    aria-label={`Cor ${c}`}
                  />
                ))}
              </div>
            </div>
            <DialogFooter className="gap-2">
              <Button variant="outline" size="sm" onClick={() => setModo(null)} disabled={ocupado}>
                Voltar
              </Button>
              <Button size="sm" onClick={handleSalvarEdicao} disabled={ocupado}>
                {salvandoEdicao ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Salvar'}
              </Button>
            </DialogFooter>
          </div>
        )}

        {/* ===== ENCAMINHAR (categoria / fluxo) + DUPLICAR ===== */}
        {(modo === 'encaminhar_categoria' ||
          modo === 'encaminhar_fluxo' ||
          modo === 'duplicar') && (
          <div className="space-y-4 py-1">
            {(modo === 'encaminhar_categoria' || modo === 'duplicar') && (
              <div className="space-y-1.5">
                <Label className="text-xs">Categoria de destino</Label>
                <Select value={destinoCategoria} onValueChange={(v) => setDestinoCategoria(v)}>
                  <SelectTrigger className="h-9 text-xs">
                    <SelectValue placeholder="Selecione a categoria" />
                  </SelectTrigger>
                  <SelectContent>
                    {(modo === 'duplicar' ? categorias : outrasCategorias).map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.nome}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {modo === 'encaminhar_fluxo' && (
              <div className="space-y-1.5">
                <Label className="text-xs">Fluxo de destino (mesma categoria)</Label>
                <Select value={destinoFluxo} onValueChange={(v) => setDestinoFluxo(v)}>
                  <SelectTrigger className="h-9 text-xs">
                    <SelectValue placeholder="Selecione o fluxo" />
                  </SelectTrigger>
                  <SelectContent>
                    {fluxos
                      .filter(
                        (f) =>
                          f.id !== fluxoAtualId &&
                          f.categoria === categoriaAtualId &&
                          f.ativo !== false,
                      )
                      .map((f) => (
                        <SelectItem key={f.id} value={f.id}>
                          {f.nome || f.titulo}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {modo === 'encaminhar_categoria' && (
              <div className="space-y-1.5">
                <Label className="text-xs">Fluxo de destino (da nova categoria)</Label>
                <Select value={destinoFluxo} onValueChange={(v) => setDestinoFluxo(v)}>
                  <SelectTrigger className="h-9 text-xs">
                    <SelectValue placeholder="Selecione o fluxo" />
                  </SelectTrigger>
                  <SelectContent>
                    {fluxosDaCategoriaDestino.map((f) => (
                      <SelectItem key={f.id} value={f.id}>
                        {f.nome || f.titulo}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {modo === 'duplicar' && (
              <div className="space-y-1.5">
                <Label className="text-xs">Fluxo de destino</Label>
                <Select value={destinoFluxo} onValueChange={(v) => setDestinoFluxo(v)}>
                  <SelectTrigger className="h-9 text-xs">
                    <SelectValue placeholder="Selecione o fluxo" />
                  </SelectTrigger>
                  <SelectContent>
                    {fluxosDaCategoriaDestino.map((f) => (
                      <SelectItem key={f.id} value={f.id}>
                        {f.nome || f.titulo}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="space-y-1.5">
              <Label className="text-xs">Coluna (fase) de destino</Label>
              <Select value={destinoFase} onValueChange={(v) => setDestinoFase(v)}>
                <SelectTrigger className="h-9 text-xs">
                  <SelectValue
                    placeholder={
                      fasesDoFluxoDestino.length === 0
                        ? 'Fluxo sem fases'
                        : 'Primeira fase do fluxo (padrão)'
                    }
                  />
                </SelectTrigger>
                <SelectContent>
                  {fasesDoFluxoDestino.map((f) => (
                    <SelectItem key={f.chave} value={f.chave}>
                      {f.titulo}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-[10px] text-[#5B6470] flex items-start gap-1">
                <AlertTriangle className="w-3 h-3 mt-0.5 shrink-0 text-amber-500" />
                Os cards são gravados com uma coluna válida do fluxo de destino — nenhum card fica
                órfão.
              </p>
            </div>

            <DialogFooter className="gap-2">
              <Button variant="outline" size="sm" onClick={() => setModo(null)} disabled={ocupado}>
                Voltar
              </Button>
              <Button
                size="sm"
                onClick={() => handleMoverGrupo(modo === 'duplicar')}
                disabled={ocupado || !destinoFluxo || destinoFluxo === 'none'}
              >
                {movendo ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : modo === 'duplicar' ? (
                  'Duplicar grupo'
                ) : (
                  'Encaminhar grupo'
                )}
              </Button>
            </DialogFooter>
          </div>
        )}

        {/* ================= RETIRAR CARD ================= */}
        {modo === 'retirar_card' && (
          <div className="space-y-4 py-1">
            <div className="space-y-1.5">
              <Label className="text-xs">Card a retirar do grupo/fluxo</Label>
              <Select value={cardRetiradaId} onValueChange={(v) => setCardRetiradaId(v)}>
                <SelectTrigger className="h-9 text-xs">
                  <SelectValue placeholder="Selecione o card" />
                </SelectTrigger>
                <SelectContent>
                  {cardsDoGrupo.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.titulo || c.id}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-[10px] text-[#5B6470]">
                O card continua existindo na coluna — só perde o vínculo com o grupo.
              </p>
            </div>
            <DialogFooter className="gap-2">
              <Button variant="outline" size="sm" onClick={() => setModo(null)} disabled={ocupado}>
                Voltar
              </Button>
              <Button
                size="sm"
                onClick={handleRetirarCard}
                disabled={ocupado || cardRetiradaId === 'none'}
              >
                {retirando ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Retirar card'}
              </Button>
            </DialogFooter>
          </div>
        )}

        {/* ================= DESFAZER GRUPO ================= */}
        {modo === 'desfazer' && (
          <div className="space-y-4 py-1">
            <p className="text-xs text-[#1A1D21]">
              Desfazer o grupo <span className="font-semibold">&quot;{familia?.nome}&quot;</span>?
              Os {cardsDoGrupo.length} card(s) ficarão{' '}
              <span className="font-semibold">soltos na coluna</span> — nenhum card é apagado.
            </p>
            <DialogFooter className="gap-2">
              <Button variant="outline" size="sm" onClick={() => setModo(null)} disabled={ocupado}>
                Voltar
              </Button>
              <Button size="sm" onClick={handleDesfazerGrupo} disabled={ocupado}>
                {movendo ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Desfazer grupo'}
              </Button>
            </DialogFooter>
          </div>
        )}

        {/* ================= EXCLUIR GRUPO ================= */}
        {modo === 'excluir' && (
          <div className="space-y-4 py-1">
            <div className="space-y-1.5">
              <Label className="text-xs">O que fazer com os {cardsDoGrupo.length} card(s)?</Label>
              <div className="space-y-2">
                <label className="flex items-start gap-2 p-2.5 rounded-lg border border-[#E5E1D8] cursor-pointer hover:bg-[#F4F2EE]/60">
                  <input
                    type="radio"
                    name="excluir_grupo_modo"
                    checked={excluirModo === 'desagrupar'}
                    onChange={() => setExcluirModo('desagrupar')}
                    className="mt-0.5"
                  />
                  <span className="text-xs">
                    <span className="font-semibold">Desagrupar e manter na coluna</span>
                    <span className="block text-[10px] text-[#5B6470]">
                      Os cards ficam soltos na coluna, sem vínculo de grupo. Nada é apagado.
                    </span>
                  </span>
                </label>
                <label className="flex items-start gap-2 p-2.5 rounded-lg border border-[#E5E1D8] cursor-pointer hover:bg-[#F4F2EE]/60">
                  <input
                    type="radio"
                    name="excluir_grupo_modo"
                    checked={excluirModo === 'excluir_tudo'}
                    onChange={() => setExcluirModo('excluir_tudo')}
                    className="mt-0.5"
                  />
                  <span className="text-xs">
                    <span className="font-semibold text-red-600">Excluir os cards junto</span>
                    <span className="block text-[10px] text-[#5B6470]">
                      O grupo e todos os seus cards são apagados definitivamente.
                    </span>
                  </span>
                </label>
              </div>
            </div>
            <DialogFooter className="gap-2">
              <Button variant="outline" size="sm" onClick={() => setModo(null)} disabled={ocupado}>
                Voltar
              </Button>
              <Button
                size="sm"
                variant="destructive"
                onClick={handleExcluirGrupo}
                disabled={ocupado}
              >
                {excluindo ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : excluirModo === 'desagrupar' ? (
                  'Excluir grupo (manter cards)'
                ) : (
                  'Excluir grupo e cards'
                )}
              </Button>
            </DialogFooter>
          </div>
        )}

        {/* ================= MENU PRINCIPAL ================= */}
        {modo === null && (
          <div className="space-y-1.5 py-1">
            {cardsDoGrupo.length === 0 && (
              <p className="text-[11px] text-[#5B6470] px-1 pb-1">Grupo sem cards.</p>
            )}
            <MenuAcao
              icone="pencil"
              titulo="Editar"
              descricao="Renomear o grupo e mudar a cor"
              onClick={() => setModo('editar')}
            />
            <MenuAcao
              icone="folder"
              titulo="Encaminhar para outra categoria"
              descricao="Move o grupo com os cards para um fluxo de outra categoria"
              onClick={() => setModo('encaminhar_categoria')}
            />
            <MenuAcao
              icone="git"
              titulo="Encaminhar para outro fluxo"
              descricao="Move para outro fluxo da mesma categoria"
              onClick={() => setModo('encaminhar_fluxo')}
            />
            <MenuAcao
              icone="user"
              titulo="Retirar card do fluxo"
              descricao="Tira um card do grupo/fluxo sem apagar"
              onClick={() => setModo('retirar_card')}
              disabled={cardsDoGrupo.length === 0}
            />
            <MenuAcao
              icone="unlink"
              titulo="Desfazer grupo"
              descricao="Desagrupa, deixando os cards soltos na coluna"
              onClick={() => setModo('desfazer')}
              disabled={ocupado}
            />
            <MenuAcao
              icone="copy"
              titulo="Duplicar grupo"
              descricao="Copia o grupo com seus cards para outra coluna/fluxo"
              onClick={() => setModo('duplicar')}
            />
            <div className="h-px bg-[#E5E1D8] my-1" />
            <MenuAcao
              icone="trash"
              titulo="Excluir grupo"
              descricao="Apaga o grupo (você escolhe o destino dos cards)"
              onClick={() => setModo('excluir')}
              perigoso
            />
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}

// ============================================================
// ITEM DO MENU PRINCIPAL
// ============================================================
type NomeIconeAcao = 'pencil' | 'folder' | 'git' | 'user' | 'unlink' | 'copy' | 'trash'

function MenuAcao({
  icone,
  titulo,
  descricao,
  onClick,
  disabled,
  perigoso,
}: {
  icone: NomeIconeAcao
  titulo: string
  descricao: string
  onClick: () => void
  disabled?: boolean
  perigoso?: boolean
}) {
  const cores: Record<NomeIconeAcao, string> = {
    pencil: 'text-[#0F766E]',
    folder: 'text-[#2563EB]',
    git: 'text-[#8B5CF6]',
    user: 'text-[#F59E0B]',
    unlink: 'text-[#64748B]',
    copy: 'text-[#0EA5E9]',
    trash: 'text-red-600',
  }
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="w-full flex items-start gap-2.5 p-2 rounded-lg text-left hover:bg-[#F4F2EE] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
    >
      <IconeAcao
        nome={icone}
        className={`w-4 h-4 mt-0.5 shrink-0 ${perigoso ? 'text-red-600' : cores[icone]}`}
      />
      <span className="min-w-0">
        <span
          className={`block text-xs font-semibold ${perigoso ? 'text-red-600' : 'text-[#1A1D21]'}`}
        >
          {titulo}
        </span>
        <span className="block text-[10px] text-[#5B6470]">{descricao}</span>
      </span>
    </button>
  )
}

function IconeAcao({ nome, className }: { nome: NomeIconeAcao; className?: string }) {
  return (
    <span className={className}>
      {nome === 'pencil' && <Pencil className="w-full h-full" />}
      {nome === 'folder' && <FolderInput className="w-full h-full" />}
      {nome === 'git' && <GitBranch className="w-full h-full" />}
      {nome === 'user' && <UserMinus className="w-full h-full" />}
      {nome === 'unlink' && <Unlink className="w-full h-full" />}
      {nome === 'copy' && <Copy className="w-full h-full" />}
      {nome === 'trash' && <Trash2 className="w-full h-full" />}
    </span>
  )
}
