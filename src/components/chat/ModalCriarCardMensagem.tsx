import { useEffect, useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'

interface Props {
  aberto: boolean
  onFechar: () => void
  /** Texto da mensagem que origina o card (pré-preenche título e descrição). */
  textoMensagem: string
  criando: boolean
  onConfirmar: (titulo: string, descricao: string) => void
}

/**
 * "Criar demanda/card" a partir de uma mensagem do chat: card novo com o
 * texto da mensagem preenchido (primeira linha vira título).
 */
export default function ModalCriarCardMensagem({
  aberto,
  onFechar,
  textoMensagem,
  criando,
  onConfirmar,
}: Props) {
  const [titulo, setTitulo] = useState('')
  const [descricao, setDescricao] = useState('')

  useEffect(() => {
    if (!aberto) return
    const primeiraLinha = (textoMensagem || '').trim().split('\n')[0] || 'Card do chat'
    setTitulo(primeiraLinha.slice(0, 120))
    setDescricao(textoMensagem || '')
  }, [aberto, textoMensagem])

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
          <p className="text-[11px] text-gray-400">
            O card será criado no painel Fluxo, na primeira coluna do fluxo padrão.
          </p>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onFechar} disabled={criando}>
            Cancelar
          </Button>
          <Button
            onClick={() => onConfirmar(titulo, descricao)}
            disabled={criando || !titulo.trim()}
          >
            {criando ? 'Criando…' : 'Criar card'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
