// "Enviar a projeto": modal que escolhe o projeto e cria o card vinculado a ele,
// com o texto da mensagem preenchido (a criação em si é feita pelo Chat.tsx via
// onConfirmar, usando diamondApi.createCard).
import { useEffect, useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import type { Projeto } from '@/types'

interface Props {
  aberto: boolean
  onFechar: () => void
  /** Projetos disponíveis para vincular o card. */
  projetos: Projeto[]
  /** Texto da mensagem que origina o card (pré-preenche título e descrição). */
  textoMensagem: string
  enviando: boolean
  onConfirmar: (projetoId: string, titulo: string, descricao: string) => void
}

/** Primeira linha da mensagem vira título do card. */
function tituloDaMensagem(texto: string): string {
  const linha = (texto || '').trim().split('\n')[0] || 'Card do chat'
  return linha.slice(0, 120)
}

export default function ModalEnviarProjeto({
  aberto,
  onFechar,
  projetos,
  textoMensagem,
  enviando,
  onConfirmar,
}: Props) {
  const [projetoId, setProjetoId] = useState('')
  const [titulo, setTitulo] = useState('')
  const [descricao, setDescricao] = useState('')

  useEffect(() => {
    if (!aberto) return
    setProjetoId('')
    setTitulo(tituloDaMensagem(textoMensagem))
    setDescricao(textoMensagem || '')
  }, [aberto, textoMensagem])

  const podeConfirmar = !!projetoId && !!titulo.trim() && !enviando

  return (
    <Dialog open={aberto} onOpenChange={(o) => !o && onFechar()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Enviar a projeto</DialogTitle>
          <DialogDescription>
            Cria um card vinculado ao projeto escolhido, com o texto da mensagem preenchido.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label htmlFor="chat-projeto-select">Projeto</Label>
            <select
              id="chat-projeto-select"
              value={projetoId}
              onChange={(e) => setProjetoId(e.target.value)}
              className="w-full rounded-md border bg-background px-3 py-2 text-sm"
            >
              <option value="">Escolha o projeto</option>
              {projetos.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.nome}
                </option>
              ))}
            </select>
            {projetos.length === 0 && (
              <p className="text-[11px] text-gray-400">Nenhum projeto cadastrado.</p>
            )}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="chat-projeto-titulo">Título</Label>
            <input
              id="chat-projeto-titulo"
              value={titulo}
              onChange={(e) => setTitulo(e.target.value)}
              className="w-full rounded-md border bg-background px-3 py-2 text-sm"
              placeholder="Título do card"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="chat-projeto-descricao">Descrição</Label>
            <textarea
              id="chat-projeto-descricao"
              value={descricao}
              onChange={(e) => setDescricao(e.target.value)}
              rows={4}
              className="w-full rounded-md border bg-background px-3 py-2 text-sm resize-y"
              placeholder="Descrição do card"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onFechar} disabled={enviando}>
            Cancelar
          </Button>
          <Button
            onClick={() => projetoId && onConfirmar(projetoId, titulo.trim(), descricao)}
            disabled={!podeConfirmar}
          >
            {enviando ? 'Criando…' : 'Criar card'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
