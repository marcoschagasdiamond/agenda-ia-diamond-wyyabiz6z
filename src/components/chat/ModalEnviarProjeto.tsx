import { useEffect, useMemo, useState } from 'react'
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { useNavegacao } from '@/contexts/NavegacaoContext'
import { criarCard } from '@/services/diamondApi'
import { toast } from '@/hooks/use-toast'

interface ModalEnviarProjetoProps {
  aberto: boolean
  onFechar: () => void
  textoMensagem: string
}

/**
 * "Enviar a projeto": escolhe o projeto e cria o card no projeto escolhido,
 * com o texto da mensagem preenchido.
 */
export function ModalEnviarProjeto({ aberto, onFechar, textoMensagem }: ModalEnviarProjetoProps) {
  const { projetos, recarregarFluxo } = useNavegacao()
  const [projetoId, setProjetoId] = useState<string>('')
  const [titulo, setTitulo] = useState('')
  const [salvando, setSalvando] = useState(false)

  useEffect(() => {
    if (aberto) {
      setTitulo(derivartitulo(textoMensagem))
      setProjetoId('')
    }
  }, [aberto, textoMensagem])

  const podeSalvar = !!projetoId && titulo.trim().length > 0 && !salvando

  const salvar = async () => {
    if (!podeSalvar) return
    setSalvando(true)
    try {
      await criarCard({
        titulo: titulo.trim(),
        descricao: textoMensagem,
        projeto: projetoId,
        origem: 'chat',
      })
      await recarregarFluxo()
      toast({ title: 'Card criado no projeto' })
      onFechar()
    } catch (e) {
      toast({ title: 'Erro ao criar card', description: String(e), variant: 'destructive' })
    } finally {
      setSalvando(false)
    }
  }

  return (
    <Dialog open={aberto} onOpenChange={(v) => !v && onFechar()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Enviar a projeto</DialogTitle>
          <DialogDescription>
            Cria um card no projeto escolhido com o texto da mensagem preenchido.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label>Projeto</Label>
            <Select value={projetoId} onValueChange={setProjetoId}>
              <SelectTrigger>
                <SelectValue placeholder="Escolha o projeto" />
              </SelectTrigger>
              <SelectContent>
                {projetos.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.nome}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Título do card</Label>
            <Input value={titulo} onChange={(e) => setTitulo(e.target.value)} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onFechar} disabled={salvando}>
            Cancelar
          </Button>
          <Button onClick={salvar} disabled={!podeSalvar}>
            {salvando ? 'Criando...' : 'Criar card'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function derivartitulo(texto: string): string {
  const limpo = (texto || '').replace(/\s+/g, ' ').trim()
  if (!limpo) return ''
  return limpo.length > 60 ? `${limpo.slice(0, 57)}...` : limpo
}
