// "Germinar" semente → card de demanda: cascata categoria → fluxo → coluna
// (mesmo padrão do ModalCriarCardMensagem do /chat). O card nasce gravando
// fluxo_id E status (coluna válida) JUNTOS — nunca card órfão de coluna —
// levando título, descrição, parceiro e negócio da semente.
import { useEffect, useMemo, useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import type { DestinoMoverCategoria } from '@/components/fluxo/CardKanbanDiamond'
import type { DestinoCardFluxo } from '@/components/chat/ModalCriarCardMensagem'

interface Props {
  aberto: boolean
  onFechar: () => void
  /** Título sugerido (texto da semente) — editável. */
  tituloSemente: string
  descricaoSemente: string
  destinos: DestinoMoverCategoria[]
  criando: boolean
  onConfirmar: (titulo: string, descricao: string, destino: DestinoCardFluxo) => void
}

export default function ModalGerminarSemente({
  aberto,
  onFechar,
  tituloSemente,
  descricaoSemente,
  destinos,
  criando,
  onConfirmar,
}: Props) {
  const [titulo, setTitulo] = useState('')
  const [descricao, setDescricao] = useState('')
  const [categoriaId, setCategoriaId] = useState('')
  const [fluxoId, setFluxoId] = useState('')
  const [colunaChave, setColunaChave] = useState('')

  useEffect(() => {
    if (!aberto) return
    const primeiraLinha = (tituloSemente || '').trim().split('\n')[0] || 'Demanda da semente'
    setTitulo(primeiraLinha.slice(0, 120))
    setDescricao(descricaoSemente || '')
    setCategoriaId('')
    setFluxoId('')
    setColunaChave('')
  }, [aberto, tituloSemente, descricaoSemente])

  const categoria = useMemo(
    () => destinos.find((c) => c.id === categoriaId),
    [destinos, categoriaId],
  )
  const fluxosDaCategoria = categoria?.fluxos ?? []
  const fluxo = useMemo(
    () => fluxosDaCategoria.find((f) => f.id === fluxoId),
    [fluxosDaCategoria, fluxoId],
  )
  const colunasDoFluxo = fluxo?.colunas ?? []
  // Obrigatório escolher a coluna: sem destino válido o card nasceria órfão.
  const destinoValido = Boolean(categoriaId && fluxoId && colunaChave)

  function escolherCategoria(id: string) {
    setCategoriaId(id)
    setFluxoId('')
    setColunaChave('')
  }

  function escolherFluxo(id: string) {
    setFluxoId(id)
    setColunaChave('')
  }

  function confirmar() {
    if (!destinoValido) return
    onConfirmar(titulo.trim(), descricao, {
      fluxoId,
      colunaChave,
      colunaTitulo: colunasDoFluxo.find((c) => c.chave === colunaChave)?.titulo || colunaChave,
    })
  }

  return (
    <Dialog open={aberto} onOpenChange={(o) => !o && onFechar()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <span>🌱</span> Germinar semente como demanda
          </DialogTitle>
          <DialogDescription>
            A semente sai do cofre ativo e vira um card de demanda no Fluxo.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label htmlFor="germinar-titulo">Título do card</Label>
            <input
              id="germinar-titulo"
              value={titulo}
              onChange={(e) => setTitulo(e.target.value)}
              className="w-full rounded-md border bg-background px-3 py-2 text-sm"
              placeholder="Título do card"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="germinar-descricao">Descrição</Label>
            <textarea
              id="germinar-descricao"
              value={descricao}
              onChange={(e) => setDescricao(e.target.value)}
              rows={4}
              className="w-full rounded-md border bg-background px-3 py-2 text-sm resize-y"
              placeholder="Descrição do card"
            />
          </div>

          {/* Cascata categoria → fluxo → coluna (obrigatória: card nunca órfão) */}
          <div className="rounded-md border border-dashed border-emerald-300 bg-emerald-50/40 p-3 space-y-2.5">
            <p className="text-[11px] font-semibold text-emerald-700 uppercase tracking-wide">
              Destino no Fluxo
            </p>
            <div className="space-y-1.5">
              <Label htmlFor="germinar-categoria">Categoria</Label>
              <select
                id="germinar-categoria"
                value={categoriaId}
                onChange={(e) => escolherCategoria(e.target.value)}
                className="w-full rounded-md border bg-background px-3 py-2 text-sm"
              >
                <option value="">Escolha a categoria</option>
                {destinos.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.nome}
                  </option>
                ))}
              </select>
            </div>
            {categoriaId && fluxosDaCategoria.length > 0 && (
              <div className="space-y-1.5">
                <Label htmlFor="germinar-fluxo">Fluxo</Label>
                <select
                  id="germinar-fluxo"
                  value={fluxoId}
                  onChange={(e) => escolherFluxo(e.target.value)}
                  className="w-full rounded-md border bg-background px-3 py-2 text-sm"
                >
                  <option value="">Escolha o fluxo</option>
                  {fluxosDaCategoria.map((f) => (
                    <option key={f.id} value={f.id}>
                      {f.nome}
                    </option>
                  ))}
                </select>
              </div>
            )}
            {fluxoId && colunasDoFluxo.length > 0 && (
              <div className="space-y-1.5">
                <Label htmlFor="germinar-coluna">Coluna</Label>
                <select
                  id="germinar-coluna"
                  value={colunaChave}
                  onChange={(e) => setColunaChave(e.target.value)}
                  className="w-full rounded-md border bg-background px-3 py-2 text-sm"
                >
                  <option value="">Escolha a coluna</option>
                  {colunasDoFluxo.map((c) => (
                    <option key={c.id} value={c.chave}>
                      {c.titulo}
                    </option>
                  ))}
                </select>
              </div>
            )}
            <p className="text-[11px] text-emerald-700/80">
              {destinoValido
                ? `O card será criado em "${colunasDoFluxo.find((c) => c.chave === colunaChave)?.titulo}", no fluxo escolhido.`
                : 'Escolha categoria, fluxo e coluna para germinar a semente.'}
            </p>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onFechar} disabled={criando}>
            Cancelar
          </Button>
          <Button onClick={confirmar} disabled={criando || !titulo.trim() || !destinoValido}>
            {criando ? 'Germinando…' : '🌱 Germinar'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
