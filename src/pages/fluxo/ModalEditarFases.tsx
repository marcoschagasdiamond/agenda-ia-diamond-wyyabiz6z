import { useState, useEffect } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  ArrowDown,
  ArrowUp,
  CheckCircle2,
  Plus,
  Trash2,
  AlertCircle,
  HelpCircle,
  Layers,
} from 'lucide-react'
import type { ColunaFluxo, CategoriaFluxo } from '@/types'
import { diamondApi } from '@/services/diamondApi'
import { gerarSlugChave } from './fluxoTemplates'

export interface ModalEditarFasesProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  categoriaAtiva: CategoriaFluxo | null
  colunas: ColunaFluxo[]
  onFasesAtualizadas: () => Promise<void>
}

interface FaseItemEditavel {
  id?: string // se já existe no banco
  chave: string
  titulo: string
  cor: string
  ordem: number
  is_conclusao: boolean
  isNew?: boolean
  isDeleted?: boolean
}

export function ModalEditarFases({
  open,
  onOpenChange,
  categoriaAtiva,
  colunas,
  onFasesAtualizadas,
}: ModalEditarFasesProps) {
  const [fases, setFases] = useState<FaseItemEditavel[]>([])
  const [novaFaseTitulo, setNovaFaseTitulo] = useState('')
  const [novaFaseCor, setNovaFaseCor] = useState('#0EA5E9')
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)

  // Quando o modal abre, carrega as colunas da categoria ativa (ou todas as colunas visíveis)
  useEffect(() => {
    if (!open) return

    setErro(null)
    setNovaFaseTitulo('')

    const colunasAlvo = categoriaAtiva
      ? colunas.filter((c) => c.categoria === categoriaAtiva.id)
      : colunas

    const fasesIniciais: FaseItemEditavel[] = [...colunasAlvo]
      .sort((a, b) => (a.ordem || 0) - (b.ordem || 0))
      .map((col, idx) => ({
        id: col.id,
        chave: col.chave,
        titulo: col.titulo,
        cor: col.cor || '#0F766E',
        ordem: idx + 1,
        is_conclusao:
          col.is_conclusao === true ||
          col.titulo.toLowerCase().includes('finalizado') ||
          col.titulo.toLowerCase().includes('termino'),
      }))

    setFases(fasesIniciais)
  }, [open, categoriaAtiva, colunas])

  const fasesVisiveis = fases.filter((f) => !f.isDeleted)

  const handleMoverCima = (idx: number) => {
    if (idx <= 0) return
    const novas = [...fasesVisiveis]
    const temp = novas[idx - 1]
    novas[idx - 1] = novas[idx]
    novas[idx] = temp

    // Reindexar ordens
    const reindexadas = novas.map((f, i) => ({ ...f, ordem: i + 1 }))
    const deletadas = fases.filter((f) => f.isDeleted)
    setFases([...reindexadas, ...deletadas])
  }

  const handleMoverBaixo = (idx: number) => {
    if (idx >= fasesVisiveis.length - 1) return
    const novas = [...fasesVisiveis]
    const temp = novas[idx + 1]
    novas[idx + 1] = novas[idx]
    novas[idx] = temp

    // Reindexar ordens
    const reindexadas = novas.map((f, i) => ({ ...f, ordem: i + 1 }))
    const deletadas = fases.filter((f) => f.isDeleted)
    setFases([...reindexadas, ...deletadas])
  }

  const handleAlterarTitulo = (chave: string, novoTitulo: string) => {
    setFases((prev) => prev.map((f) => (f.chave === chave ? { ...f, titulo: novoTitulo } : f)))
  }

  const handleAlterarCor = (chave: string, novaCor: string) => {
    setFases((prev) => prev.map((f) => (f.chave === chave ? { ...f, cor: novaCor } : f)))
  }

  const handleToggleConclusao = (chave: string) => {
    setFases((prev) =>
      prev.map((f) => {
        if (f.chave === chave) {
          return { ...f, is_conclusao: !f.is_conclusao }
        }
        // Se marcar uma como conclusão, desmarca as outras para ter uma clara fase de conclusão principal
        return f
      }),
    )
  }

  const handleRemoverFase = (chave: string) => {
    setFases((prev) => prev.map((f) => (f.chave === chave ? { ...f, isDeleted: true } : f)))
  }

  const handleAdicionarNovaFase = (e: React.FormEvent) => {
    e.preventDefault()
    const tituloTrim = novaFaseTitulo.trim()
    if (!tituloTrim) return

    const chaveGerada = gerarSlugChave(tituloTrim)
    const ehConclusao =
      tituloTrim.toLowerCase().includes('finaliz') || tituloTrim.toLowerCase().includes('termin')

    const nova: FaseItemEditavel = {
      chave: chaveGerada,
      titulo: tituloTrim,
      cor: novaFaseCor,
      ordem: fasesVisiveis.length + 1,
      is_conclusao: ehConclusao,
      isNew: true,
    }

    setFases((prev) => [...prev, nova])
    setNovaFaseTitulo('')
    setNovaFaseCor('#0F766E')
  }

  const handleSalvarTudo = async () => {
    if (fasesVisiveis.length === 0) {
      setErro('O fluxo deve ter pelo menos 1 fase.')
      return
    }

    // Valida se todos os títulos estão preenchidos
    for (const f of fasesVisiveis) {
      if (!f.titulo.trim()) {
        setErro('Todas as fases devem ter um título.')
        return
      }
    }

    setSalvando(true)
    setErro(null)

    try {
      const catId = categoriaAtiva?.id

      // 1. Processar deletadas (se existiam no banco)
      const deletadas = fases.filter((f) => f.isDeleted && f.id)
      for (const d of deletadas) {
        if (d.id) {
          await diamondApi.deleteColunaFluxo(d.id).catch(() => {})
        }
      }

      // 2. Atualizar ou criar fases visíveis em ordem
      for (let i = 0; i < fasesVisiveis.length; i++) {
        const item = fasesVisiveis[i]
        const ordemFinal = i + 1

        if (item.id && !item.isNew) {
          // Update existente
          await diamondApi.updateColunaFluxo(item.id, {
            titulo: item.titulo.trim(),
            cor: item.cor,
            ordem: ordemFinal,
            is_conclusao: item.is_conclusao,
            categoria: catId || undefined,
          })
        } else {
          // Criação de nova fase
          await diamondApi.createColunaFluxo({
            chave: item.chave,
            titulo: item.titulo.trim(),
            cor: item.cor,
            ordem: ordemFinal,
            is_conclusao: item.is_conclusao,
            categoria: catId || undefined,
          })
        }
      }

      await onFasesAtualizadas()
      onOpenChange(false)
    } catch (err) {
      setErro((err as Error)?.message || 'Erro ao salvar fases.')
    } finally {
      setSalvando(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl bg-white border border-[#E5E1D8] max-h-[90vh] flex flex-col">
        <DialogHeader className="pb-2 border-b border-[#E5E1D8]">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-[#0F766E]/10 text-[#0F766E] flex items-center justify-center">
              <Layers className="w-4 h-4" />
            </div>
            <div>
              <DialogTitle className="text-base font-bold text-[#1A1D21]">
                Editar Fases do Fluxo
              </DialogTitle>
              <DialogDescription className="text-xs text-[#5B6470]">
                {categoriaAtiva
                  ? `Gerenciando colunas/fases da categoria "${categoriaAtiva.nome}".`
                  : 'Gerenciando colunas/fases do board ativo.'}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {erro && (
          <div className="p-2.5 rounded-lg bg-red-50 border border-red-200 text-xs text-red-700 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{erro}</span>
          </div>
        )}

        {/* Lista de Fases ordenadas */}
        <div className="flex-1 overflow-y-auto space-y-2 py-2 pr-1">
          <div className="flex items-center justify-between text-[11px] font-semibold text-[#5B6470] px-2 uppercase tracking-wider">
            <span>Fases ({fasesVisiveis.length})</span>
            <span>Ordem & Ações</span>
          </div>

          {fasesVisiveis.map((fase, idx) => {
            const isPrimeira = idx === 0
            const isUltima = idx === fasesVisiveis.length - 1

            return (
              <div
                key={fase.chave}
                className={`p-2.5 rounded-xl border transition-all flex items-center justify-between gap-2.5 ${
                  fase.is_conclusao
                    ? 'bg-emerald-50/50 border-emerald-200'
                    : 'bg-[#FAFAF9] border-[#E5E1D8]'
                }`}
              >
                {/* Seletor de cor + input de nome da fase */}
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  <span className="text-xs font-bold text-[#5B6470] w-5 text-center shrink-0">
                    {idx + 1}º
                  </span>

                  <input
                    type="color"
                    value={fase.cor}
                    onChange={(e) => handleAlterarCor(fase.chave, e.target.value)}
                    className="w-7 h-7 rounded border border-[#E5E1D8] cursor-pointer shrink-0"
                    title="Alterar cor da fase"
                  />

                  <Input
                    value={fase.titulo}
                    onChange={(e) => handleAlterarTitulo(fase.chave, e.target.value)}
                    placeholder="Nome da fase..."
                    className="text-xs font-semibold bg-white border-[#E5E1D8] h-8"
                  />

                  {/* Botão de Marcar como Conclusão */}
                  <button
                    type="button"
                    onClick={() => handleToggleConclusao(fase.chave)}
                    className={`px-2 py-1 rounded-md text-[11px] font-medium border flex items-center gap-1 shrink-0 transition-colors ${
                      fase.is_conclusao
                        ? 'bg-emerald-600 text-white border-emerald-600 shadow-2xs'
                        : 'bg-white text-[#5B6470] border-[#E5E1D8] hover:border-emerald-500 hover:text-emerald-700'
                    }`}
                    title={
                      fase.is_conclusao
                        ? 'Esta é uma fase de conclusão (ex: Finalizado)'
                        : 'Clique para marcar esta fase como conclusão'
                    }
                  >
                    <CheckCircle2 className="w-3 h-3" />
                    <span>{fase.is_conclusao ? 'Conclusão' : 'Marcar Conclusão'}</span>
                  </button>
                </div>

                {/* Controles de Ordem (Subir / Descer) e Remover */}
                <div className="flex items-center gap-1 shrink-0">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={isPrimeira}
                    onClick={() => handleMoverCima(idx)}
                    className="h-7 w-7 p-0 text-[#5B6470] hover:text-[#1A1D21]"
                    title="Mover para a esquerda / cima"
                  >
                    <ArrowUp className="w-3.5 h-3.5" />
                  </Button>

                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={isUltima}
                    onClick={() => handleMoverBaixo(idx)}
                    className="h-7 w-7 p-0 text-[#5B6470] hover:text-[#1A1D21]"
                    title="Mover para a direita / baixo"
                  >
                    <ArrowDown className="w-3.5 h-3.5" />
                  </Button>

                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => handleRemoverFase(fase.chave)}
                    className="h-7 w-7 p-0 text-red-500 hover:text-red-700 hover:bg-red-50"
                    title="Remover esta fase"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </div>
            )
          })}

          {fasesVisiveis.length === 0 && (
            <div className="p-6 text-center text-xs text-[#5B6470] border border-dashed border-[#E5E1D8] rounded-xl">
              Nenhuma fase cadastrada. Adicione fases abaixo.
            </div>
          )}
        </div>

        {/* Formulário rápido para adicionar nova fase */}
        <form
          onSubmit={handleAdicionarNovaFase}
          className="pt-2 border-t border-[#E5E1D8] flex items-center gap-2 bg-[#F4F2EE]/40 p-2.5 rounded-xl"
        >
          <input
            type="color"
            value={novaFaseCor}
            onChange={(e) => setNovaFaseCor(e.target.value)}
            className="w-8 h-8 rounded border border-[#E5E1D8] cursor-pointer shrink-0"
            title="Cor da nova fase"
          />

          <Input
            placeholder="Nova fase (ex: Em Testes, Homologação)..."
            value={novaFaseTitulo}
            onChange={(e) => setNovaFaseTitulo(e.target.value)}
            className="text-xs bg-white border-[#E5E1D8] h-8 flex-1"
          />

          <Button
            type="submit"
            size="sm"
            disabled={!novaFaseTitulo.trim()}
            className="bg-[#0F766E] hover:bg-[#0D5C56] text-white text-xs h-8 px-3 gap-1 shrink-0"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Adicionar Fase</span>
          </Button>
        </form>

        <div className="text-[11px] text-[#5B6470] flex items-center gap-1.5 pt-1">
          <HelpCircle className="w-3.5 h-3.5 text-[#0F766E] shrink-0" />
          <span>
            A fase de conclusão exibe o bloco "Quantidade de cards finalizados" com botão
            "Visualizar Todos".
          </span>
        </div>

        <DialogFooter className="flex items-center justify-between pt-3 border-t border-[#E5E1D8] mt-2">
          <div className="text-xs text-[#5B6470]">
            {fasesVisiveis.length} {fasesVisiveis.length === 1 ? 'fase' : 'fases'} no fluxo
          </div>

          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => onOpenChange(false)}
              className="text-xs"
            >
              Cancelar
            </Button>
            <Button
              type="button"
              size="sm"
              disabled={salvando}
              onClick={handleSalvarTudo}
              className="bg-[#0F766E] hover:bg-[#0D5C56] text-white text-xs px-4"
            >
              {salvando ? 'Salvando Fases...' : 'Salvar Alterações'}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
