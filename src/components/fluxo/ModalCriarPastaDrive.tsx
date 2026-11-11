// Modal "Nova pasta no Google Drive" — cria a pasta direto do card via ação
// GOOGLEDRIVE_CREATE_FOLDER do conector (conta de cada usuário) e, em seguida,
// devolve a pasta criada para o caller vinculá-la ao card.
import { useState } from 'react'
import { Folder, Loader2 } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { criarPastaDrive, type ArquivoDrive } from '@/services/driveService'
import { toast } from '@/hooks/use-toast'

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** Chamada com a pasta recém-criada — o caller persiste o vínculo. */
  onCriada: (pasta: ArquivoDrive) => Promise<void> | void
}

export function ModalCriarPastaDrive({ open, onOpenChange, onCriada }: Props) {
  const [nome, setNome] = useState('')
  const [criando, setCriando] = useState(false)

  const handleCriar = async () => {
    if (criando) return
    const nomeLimpo = nome.trim()
    if (!nomeLimpo) return
    setCriando(true)
    try {
      const pasta = await criarPastaDrive(nomeLimpo)
      await onCriada(pasta)
      setNome('')
      onOpenChange(false)
    } catch (err) {
      console.error('Falha ao criar pasta no Google Drive:', err)
      toast({
        title: (err as Error)?.message || 'Falha ao criar a pasta no Google Drive',
        variant: 'destructive',
      })
    } finally {
      setCriando(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm bg-white border border-[#E5E1D8]">
        <DialogHeader>
          <DialogTitle className="text-base font-bold text-[#1A1D21] flex items-center gap-2">
            <Folder className="w-5 h-5 text-[#F59E0B]" />
            Nova pasta no Google Drive
          </DialogTitle>
          <DialogDescription className="text-xs text-[#5B6470]">
            A pasta é criada na raiz do seu Meu Drive e vinculada ao card. Nada é baixado.
          </DialogDescription>
        </DialogHeader>
        <form
          onSubmit={(e) => {
            e.preventDefault()
            handleCriar()
          }}
          className="space-y-3 pt-1"
        >
          <Input
            autoFocus
            value={nome}
            onChange={(e) => setNome(e.target.value)}
            placeholder="Nome da nova pasta..."
            maxLength={200}
            disabled={criando}
          />
          <DialogFooter className="gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => onOpenChange(false)}
              disabled={criando}
            >
              Cancelar
            </Button>
            <Button type="submit" size="sm" disabled={!nome.trim() || criando}>
              {criando ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  Criando...
                </>
              ) : (
                'Criar e vincular'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

export default ModalCriarPastaDrive
