// "Criar demanda/card" a partir de uma mensagem do chat: card novo com o
// texto da mensagem preenchido, com escolha OPCIONAL do destino em cascata
// categoria → fluxo → coluna (mesmo padrão do "Enviar para fluxo"). Quando o
// destino é escolhido, o card nasce gravando fluxo_id E status juntos (nunca
// card órfão de coluna); sem destino, o card segue sem fluxo como antes.
import { useEffect, useMemo, useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import type { DestinoMoverCategoria } from '@/components/fluxo/CardKanbanDiamond'

/** Destino escolhido na cascata (gravado junto na criação do card). */
export interface DestinoCardFluxo {
  fluxoId: string
  colunaChave: string
  colunaTitulo: string
}

interface Props {
  aberto: boolean
  onFechar: () => void
  /** Texto da mensagem que origina o card (pré-preenche título e descrição). */
  textoMensagem: string
  /** Cascata categoria → fluxo → coluna (mesmos destinos do "Enviar para fluxo"). */
  destinos: DestinoMoverCategoria[]
  criando: boolean
  onConfirmar: (titulo: string, descricao: string, destino: DestinoCardFluxo | null) => void
}

export default function ModalCriarCardMensagem({
  aberto,
  onFechar,
  textoMensagem,
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
    const primeiraLinha = (textoMensagem || '').trim().split('\n')[0] || 'Card do chat'
    setTitulo(primeiraLinha.slice(0, 120))
    setDescricao(textoMensagem || '')
    setCategoriaId('')
    setFluxoId('')
    setColunaChave('')
  }, [aberto, textoMensagem])

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

  function escolherCategoria(id: string) {
    setCategoriaId(id)
    setFluxoId('')
    setColunaChave('')
  }

  function escolherFluxo(id: string) {
    setFluxoId(id)
    setColunaChave('')
  }

  const destino: DestinoCardFluxo | null =
    categoria && fluxo && colunaChave
      ? {
          fluxoId: fluxo.id,
          colunaChave,
          colunaTitulo: colunasDoFluxo.find((c) => c.chave === colunaChave)?.titulo || colunaChave,
        }
      : null

  return (
    <Dialog open={aberto} onOpenChange={(o) => !o && onFechar()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Criar demanda/card a partir da mensagem</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label htmlFor="card-msg-titulo">Título</Label>
            <input
              id="card-msg-titulo"
              value={titulo}
              onChange={(e) => setTitulo(e.target.value)}
              className="w-full rounded-md border bg-background px-3 py-2 text-sm"
              placeholder="Título do card"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="card-msg-descricao">Descrição</Label>
            <textarea
              id="card-msg-descricao"
              value={descricao}
              onChange={(e) => setDescricao(e.target.value)}
              rows={4}
              className="w-full rounded-md border bg-background px-3 py-2 text-sm resize-y"
              placeholder="Descrição do card"
            />
          </div>

          {/* Destino opcional: categoria → fluxo → coluna (cascata) */}
          <div className="rounded-md border border-dashed border-gray-300 p-3 space-y-2.5">
            <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-wide">
              Destino no Fluxo (opcional)
            </p>
            <div className="space-y-1.5">
              <Label htmlFor="card-msg-categoria">Categoria</Label>
              <select
                id="card-msg-categoria"
                value={categoriaId}
                onChange={(e) => escolherCategoria(e.target.value)}
                className="w-full rounded-md border bg-background px-3 py-2 text-sm"
              >
                <option value="">Sem fluxo (depois de alocar no Fluxo)</option>
                {destinos.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.nome}
                  </option>
                ))}
              </select>
            </div>
            {categoriaId && fluxosDaCategoria.length > 0 && (
              <div className="space-y-1.5">
                <Label htmlFor="card-msg-fluxo">Fluxo</Label>
                <select
                  id="card-msg-fluxo"
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
                <Label htmlFor="card-msg-coluna">Coluna</Label>
                <select
                  id="card-msg-coluna"
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
            <p className="text-[11px] text-gray-400">
              {destino
                ? `O card será criado em "${destino.colunaTitulo}", no fluxo escolhido.`
                : 'Sem destino escolhido, o card será criado sem fluxo/coluna (como antes).'}
            </p>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onFechar} disabled={criando}>
            Cancelar
          </Button>
          <Button
            onClick={() => onConfirmar(titulo.trim(), descricao, destino)}
            disabled={criando || !titulo.trim()}
          >
            {criando ? 'Criando…' : 'Criar card'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
