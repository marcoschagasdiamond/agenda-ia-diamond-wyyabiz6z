import { useState, useEffect, useRef } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Paperclip,
  Upload,
  Trash2,
  Download,
  FileText,
  FileSpreadsheet,
  FileImage,
  FileArchive,
  FileCode,
  File,
  Loader2,
  ExternalLink,
} from 'lucide-react'
import type { Card, CardArquivo } from '@/types'
import { diamondApi } from '@/services/diamondApi'
import { useToast } from '@/hooks/use-toast'
import { useAuth } from '@/hooks/use-auth'

interface ModalCardArquivosProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  card: Card | null
  onAtualizado?: () => Promise<void> | void
}

function formatarTamanho(bytes?: number): string {
  if (!bytes || bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i]
}

function getIconeArquivo(nome: string, tipo?: string) {
  const ext = nome.split('.').pop()?.toLowerCase() || ''
  if (['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg'].includes(ext) || tipo?.startsWith('image/')) {
    return <FileImage className="w-5 h-5 text-emerald-600" />
  }
  if (
    ['pdf', 'doc', 'docx', 'odt', 'txt'].includes(ext) ||
    tipo?.includes('pdf') ||
    tipo?.includes('word')
  ) {
    return <FileText className="w-5 h-5 text-blue-600" />
  }
  if (
    ['xls', 'xlsx', 'csv', 'ods'].includes(ext) ||
    tipo?.includes('sheet') ||
    tipo?.includes('csv')
  ) {
    return <FileSpreadsheet className="w-5 h-5 text-teal-600" />
  }
  if (['zip', 'rar', '7z', 'tar', 'gz'].includes(ext)) {
    return <FileArchive className="w-5 h-5 text-amber-600" />
  }
  if (['json', 'js', 'ts', 'html', 'css', 'sql'].includes(ext)) {
    return <FileCode className="w-5 h-5 text-purple-600" />
  }
  return <File className="w-5 h-5 text-[#5B6470]" />
}

export function ModalCardArquivos({
  open,
  onOpenChange,
  card,
  onAtualizado,
}: ModalCardArquivosProps) {
  const { toast } = useToast()
  const { user } = useAuth()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [arquivos, setArquivos] = useState<CardArquivo[]>([])
  const [carregando, setCarregando] = useState(false)
  const [enviando, setEnviando] = useState(false)
  const [excluindoId, setExcluindoId] = useState<string | null>(null)

  const carregarArquivos = async () => {
    if (!card) return
    setCarregando(true)
    try {
      const lista = await diamondApi.listCardArquivos(card.id)
      setArquivos(lista)
    } catch (err) {
      console.error('Erro ao carregar arquivos do card:', err)
    } finally {
      setCarregando(false)
    }
  }

  useEffect(() => {
    if (open && card) {
      carregarArquivos()
    } else {
      setArquivos([])
    }
  }, [open, card?.id])

  const handleSelecionarArquivo = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files || files.length === 0 || !card) return

    setEnviando(true)
    let sucessoCount = 0
    let falhaCount = 0

    for (let i = 0; i < files.length; i++) {
      const file = files[i]
      try {
        const formData = new FormData()
        formData.append('card', card.id)
        formData.append('nome', file.name)
        formData.append('arquivo', file)
        formData.append('tamanho', String(file.size))
        formData.append('tipo', file.type || 'application/octet-stream')
        if (user?.id) {
          formData.append('criado_por', user.id)
        }

        await diamondApi.uploadCardArquivo(formData)
        sucessoCount++
      } catch (err) {
        console.error('Falha no upload do arquivo:', file.name, err)
        falhaCount++
      }
    }

    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }

    if (sucessoCount > 0) {
      toast({
        title: `${sucessoCount} arquivo(s) anexado(s) com sucesso!`,
      })
      await carregarArquivos()
      if (onAtualizado) await onAtualizado()
    }

    if (falhaCount > 0) {
      toast({
        title: 'Alguns arquivos falharam ao serem anexados',
        description: `${falhaCount} arquivo(s) não puderam ser enviados.`,
        variant: 'destructive',
      })
    }

    setEnviando(false)
  }

  const handleExcluir = async (arquivo: CardArquivo) => {
    if (!confirm(`Deseja realmente remover o arquivo "${arquivo.nome}"?`)) return

    setExcluindoId(arquivo.id)
    try {
      await diamondApi.deleteCardArquivo(arquivo.id)
      setArquivos((prev) => prev.filter((a) => a.id !== arquivo.id))
      toast({
        title: 'Arquivo removido',
        description: `O anexo "${arquivo.nome}" foi excluído.`,
      })
      if (onAtualizado) await onAtualizado()
    } catch (err) {
      toast({
        title: 'Erro ao excluir anexo',
        description: (err as Error)?.message,
        variant: 'destructive',
      })
    } finally {
      setExcluindoId(null)
    }
  }

  if (!card) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl bg-white border border-[#E5E1D8]">
        <DialogHeader>
          <DialogTitle className="text-base font-bold text-[#1A1D21] flex items-center gap-2">
            <Paperclip className="w-5 h-5 text-[#0F766E]" />
            Arquivos Vinculados ao Card
          </DialogTitle>
          <DialogDescription className="text-xs text-[#5B6470]">
            Anexe documentos, imagens, planilhas e outros arquivos diretamente a este card.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 pt-2">
          {/* Informações do card */}
          <div className="p-3 bg-[#F4F2EE]/60 rounded-xl border border-[#E5E1D8] flex items-center justify-between">
            <div className="space-y-0.5">
              <span className="text-[10px] uppercase font-bold text-[#5B6470] tracking-wider block">
                Card
              </span>
              <h4 className="text-sm font-bold text-[#1A1D21] uppercase line-clamp-1">
                {card.titulo}
              </h4>
            </div>
            <Badge variant="outline" className="text-xs font-semibold bg-white border-[#E5E1D8]">
              {arquivos.length} {arquivos.length === 1 ? 'anexo' : 'anexos'}
            </Badge>
          </div>

          {/* Área de Upload / Botão de Anexo */}
          <div className="flex items-center justify-between p-3 rounded-xl border-2 border-dashed border-[#0F766E]/40 bg-[#0F766E]/5">
            <div className="space-y-0.5">
              <p className="text-xs font-semibold text-[#1A1D21]">Adicionar novo anexo</p>
              <p className="text-[11px] text-[#5B6470]">
                Suporta qualquer tipo de arquivo até 50 MB
              </p>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              multiple
              className="hidden"
              onChange={handleSelecionarArquivo}
            />
            <Button
              type="button"
              disabled={enviando}
              onClick={() => fileInputRef.current?.click()}
              className="bg-[#0F766E] hover:bg-[#0D5C56] text-white text-xs h-8 px-3.5 font-semibold gap-1.5 shadow-2xs"
            >
              {enviando ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  Enviando...
                </>
              ) : (
                <>
                  <Upload className="w-3.5 h-3.5" />
                  Anexar Arquivo
                </>
              )}
            </Button>
          </div>

          {/* Lista de Arquivos */}
          <div className="space-y-2">
            <span className="text-[11px] font-bold text-[#5B6470] uppercase tracking-wider block">
              Anexos existentes
            </span>

            {carregando ? (
              <div className="flex items-center justify-center py-8 text-xs text-[#5B6470] gap-2">
                <Loader2 className="w-4 h-4 animate-spin text-[#0F766E]" />
                Carregando anexos...
              </div>
            ) : arquivos.length === 0 ? (
              <div className="text-center py-8 px-4 border border-dashed border-[#E5E1D8] rounded-xl bg-[#F4F2EE]/30">
                <Paperclip className="w-8 h-8 text-[#5B6470]/40 mx-auto mb-2" />
                <p className="text-xs font-semibold text-[#1A1D21]">Nenhum arquivo anexado ainda</p>
                <p className="text-[11px] text-[#5B6470] mt-0.5">
                  Clique no botão acima para adicionar o primeiro arquivo a este card.
                </p>
              </div>
            ) : (
              <div className="max-h-72 overflow-y-auto space-y-1.5 pr-1">
                {arquivos.map((arq) => {
                  const url = diamondApi.getCardArquivoUrl(arq)
                  return (
                    <div
                      key={arq.id}
                      className="group flex items-center justify-between p-2.5 rounded-lg border border-[#E5E1D8] hover:border-[#0F766E]/50 hover:bg-[#0F766E]/5 transition-colors"
                    >
                      <div className="flex items-center gap-2.5 min-w-0 flex-1 mr-2">
                        <div className="shrink-0 p-1.5 rounded-md bg-white border border-[#E5E1D8]">
                          {getIconeArquivo(arq.nome, arq.tipo)}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p
                            className="text-xs font-semibold text-[#1A1D21] truncate"
                            title={arq.nome}
                          >
                            {arq.nome}
                          </p>
                          <div className="flex items-center gap-2 text-[10px] text-[#5B6470]">
                            <span>{formatarTamanho(arq.tamanho)}</span>
                            <span>•</span>
                            <span>{new Date(arq.created).toLocaleDateString('pt-BR')}</span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-1 shrink-0">
                        <Button
                          asChild
                          variant="ghost"
                          size="sm"
                          className="h-7 w-7 p-0 text-[#5B6470] hover:text-[#0F766E]"
                          title="Abrir em nova aba"
                        >
                          <a href={url} target="_blank" rel="noopener noreferrer">
                            <ExternalLink className="w-3.5 h-3.5" />
                          </a>
                        </Button>
                        <Button
                          asChild
                          variant="ghost"
                          size="sm"
                          className="h-7 w-7 p-0 text-[#5B6470] hover:text-[#0F766E]"
                          title="Baixar arquivo"
                        >
                          <a href={url} download={arq.nome}>
                            <Download className="w-3.5 h-3.5" />
                          </a>
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          disabled={excluindoId === arq.id}
                          onClick={() => handleExcluir(arq)}
                          className="h-7 w-7 p-0 text-[#5B6470] hover:text-red-600"
                          title="Excluir anexo"
                        >
                          {excluindoId === arq.id ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <Trash2 className="w-3.5 h-3.5" />
                          )}
                        </Button>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          <div className="flex justify-end pt-2 border-t border-[#E5E1D8]">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => onOpenChange(false)}
              className="text-xs h-8"
            >
              Fechar
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
