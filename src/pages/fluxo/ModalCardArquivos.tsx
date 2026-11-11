import { useState, useEffect, useRef } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
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
  HardDrive,
  Folder,
  Pencil,
  ChevronUp,
  ChevronDown,
} from 'lucide-react'
import { Input } from '@/components/ui/input'
import type { Card, CardArquivo, CardPastaDrive } from '@/types'
import { diamondApi } from '@/services/diamondApi'
import { useToast } from '@/hooks/use-toast'
import { useAuth } from '@/hooks/use-auth'
import { PickerArquivosDrive } from '@/components/fluxo/PickerArquivosDrive'
import { PickerPastasDrive } from '@/components/fluxo/PickerPastasDrive'
import { ModalCriarPastaDrive } from '@/components/fluxo/ModalCriarPastaDrive'
import { linkAbrirDrive, linkAbrirPastaDrive, type ArquivoDrive } from '@/services/driveService'
import { FolderPlus } from 'lucide-react'

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
  const [pickerDriveAberto, setPickerDriveAberto] = useState(false)
  const [vinculandoDrive, setVinculandoDrive] = useState(false)
  // Pastas do Google Drive vinculadas ao card (coleção card_pastas_drive)
  const [pastasDrive, setPastasDrive] = useState<CardPastaDrive[]>([])
  const [pickerPastasAberto, setPickerPastasAberto] = useState(false)
  const [modalNovaPastaAberto, setModalNovaPastaAberto] = useState(false)
  const [vinculandoPasta, setVinculandoPasta] = useState(false)
  const [excluindoPastaId, setExcluindoPastaId] = useState<string | null>(null)
  // Renomear apelido / reordenar pastas do card
  const [editandoPastaId, setEditandoPastaId] = useState<string | null>(null)
  const [apelidoPasta, setApelidoPasta] = useState('')
  const [salvandoApelido, setSalvandoApelido] = useState(false)
  const [movendoPasta, setMovendoPasta] = useState(false)

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

  const carregarPastas = async () => {
    if (!card) return
    try {
      setPastasDrive(await diamondApi.listCardPastasDrive(card.id))
    } catch (err) {
      console.error('Erro ao carregar pastas do Drive do card:', err)
    }
  }

  useEffect(() => {
    if (open && card) {
      carregarArquivos()
      carregarPastas()
    } else {
      setArquivos([])
      setPastasDrive([])
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
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

  // Google Drive: vincula o arquivo escolhido no picker (registro em card_arquivos
  // com tipo_origem='drive', sem upload local)
  const handleVincularDrive = async (arq: ArquivoDrive) => {
    if (!card) return
    setVinculandoDrive(true)
    try {
      await diamondApi.vincularCardArquivoDrive({
        card: card.id,
        nome: arq.nome,
        drive_file_id: arq.id,
        drive_url: linkAbrirDrive(arq),
        criado_por: user?.id,
      })
      toast({ title: `Arquivo "${arq.nome}" do Drive vinculado!` })
      setPickerDriveAberto(false)
      await carregarArquivos()
      if (onAtualizado) await onAtualizado()
    } catch (err) {
      console.error('Falha ao vincular arquivo do Drive:', arq.nome, err)
      toast({
        title: `Falha ao vincular o arquivo "${arq.nome}" do Drive`,
        description: (err as Error)?.message,
        variant: 'destructive',
      })
    } finally {
      setVinculandoDrive(false)
    }
  }

  // Pasta do Google Drive: cria o vínculo (card_pastas_drive, sem upload local)
  const handleVincularPasta = async (pasta: ArquivoDrive) => {
    if (!card) return
    setVinculandoPasta(true)
    try {
      await diamondApi.vincularCardPastaDrive({
        card: card.id,
        nome: pasta.nome,
        drive_file_id: pasta.id,
        drive_url: linkAbrirPastaDrive(pasta),
        criado_por: user?.id,
      })
      toast({ title: `Pasta "${pasta.nome}" do Drive vinculada!` })
      setPickerPastasAberto(false)
      await carregarPastas()
    } catch (err) {
      console.error('Falha ao vincular pasta do Drive:', pasta.nome, err)
      toast({
        title: `Falha ao vincular a pasta "${pasta.nome}" do Drive`,
        description: (err as Error)?.message,
        variant: 'destructive',
      })
    } finally {
      setVinculandoPasta(false)
    }
  }

  /** Lista ordenada por ordem (created desempata vínculos antigos). */
  const pastasOrdenadas = (lista: CardPastaDrive[]) =>
    [...lista].sort((a, b) => {
      const oa = a.ordem ?? Number.MAX_SAFE_INTEGER
      const ob = b.ordem ?? Number.MAX_SAFE_INTEGER
      if (oa !== ob) return oa - ob
      return (a.created || '').localeCompare(b.created || '')
    })

  const salvarApelidoPasta = async () => {
    if (!editandoPastaId) return
    const nome = apelidoPasta.trim()
    if (!nome) return
    setSalvandoApelido(true)
    try {
      const atual = await diamondApi.renomearCardPastaDrive(editandoPastaId, nome)
      setPastasDrive((prev) => prev.map((p) => (p.id === atual.id ? atual : p)))
      setEditandoPastaId(null)
      toast({ title: 'Apelido da pasta atualizado.' })
    } catch (err) {
      toast({
        title: 'Erro ao renomear o apelido da pasta',
        description: (err as Error)?.message,
        variant: 'destructive',
      })
    } finally {
      setSalvandoApelido(false)
    }
  }

  /** Troca a ordem do vínculo com o vizinho (setas ↑/↓) e persiste os dois. */
  const moverPastaModal = async (indice: number, direcao: -1 | 1) => {
    if (movendoPasta) return
    const ordenadas = pastasOrdenadas(pastasDrive)
    const alvo = indice + direcao
    if (alvo < 0 || alvo >= ordenadas.length) return
    const atual = ordenadas[indice]
    const vizinho = ordenadas[alvo]
    if (!atual || !vizinho) return
    setMovendoPasta(true)
    const novas = [...ordenadas]
    novas[indice] = { ...vizinho, ordem: atual.ordem ?? indice }
    novas[alvo] = { ...atual, ordem: vizinho.ordem ?? alvo }
    setPastasDrive(novas)
    try {
      await diamondApi.moverCardPastaDrive(atual.id, vizinho.ordem ?? alvo)
      await diamondApi.moverCardPastaDrive(vizinho.id, atual.ordem ?? indice)
      toast({ title: 'Ordem das pastas atualizada.' })
    } catch (err) {
      setPastasDrive(pastasDrive) // volta ao estado salvo
      toast({
        title: 'Erro ao reordenar as pastas',
        description: (err as Error)?.message,
        variant: 'destructive',
      })
    } finally {
      setMovendoPasta(false)
    }
  }

  const handleExcluirPasta = async (pasta: CardPastaDrive) => {
    if (!confirm(`Deseja realmente remover o vínculo com a pasta "${pasta.nome}"?`)) return
    setExcluindoPastaId(pasta.id)
    try {
      await diamondApi.deleteCardPastaDrive(pasta.id)
      setPastasDrive((prev) => prev.filter((p) => p.id !== pasta.id))
      toast({ title: 'Vínculo da pasta removido', description: `"${pasta.nome}" desvinculada.` })
    } catch (err) {
      toast({
        title: 'Erro ao remover o vínculo da pasta',
        description: (err as Error)?.message,
        variant: 'destructive',
      })
    } finally {
      setExcluindoPastaId(null)
    }
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
              {arquivos.length + pastasDrive.length}{' '}
              {arquivos.length + pastasDrive.length === 1 ? 'anexo' : 'anexos'}
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
              disabled={enviando || vinculandoDrive}
              onClick={() => setPickerDriveAberto(true)}
              variant="outline"
              className="text-[#2563EB] border-[#2563EB]/40 hover:bg-[#2563EB]/10 hover:text-[#2563EB] text-xs h-8 px-3.5 font-semibold gap-1.5"
            >
              {vinculandoDrive ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  Vinculando...
                </>
              ) : (
                <>
                  <HardDrive className="w-3.5 h-3.5" />
                  Google Drive
                </>
              )}
            </Button>
            <Button
              type="button"
              disabled={enviando || vinculandoPasta}
              onClick={() => setPickerPastasAberto(true)}
              variant="outline"
              className="text-[#F59E0B] border-[#F59E0B]/50 hover:bg-[#F59E0B]/10 hover:text-[#D97706] text-xs h-8 px-3 font-semibold gap-1.5"
              title="Vincular pasta existente do Google Drive"
            >
              {vinculandoPasta ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  Vinculando...
                </>
              ) : (
                <>
                  <Folder className="w-3.5 h-3.5" />
                  Pasta do Drive
                </>
              )}
            </Button>
            <Button
              type="button"
              disabled={enviando || vinculandoPasta}
              onClick={() => setModalNovaPastaAberto(true)}
              variant="outline"
              className="text-[#D97706] border-[#D97706]/50 hover:bg-[#F59E0B]/10 hover:text-[#B45309] text-xs h-8 px-3 font-semibold gap-1.5"
              title="Criar uma pasta nova no Drive e vincular a este card"
            >
              <FolderPlus className="w-3.5 h-3.5" />
              Criar no Drive
            </Button>
            <Button
              type="button"
              disabled={enviando || vinculandoDrive || vinculandoPasta}
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
                  const ehDrive = arq.tipo_origem === 'drive'
                  const url = ehDrive ? arq.drive_url || '#' : diamondApi.getCardArquivoUrl(arq)
                  return (
                    <div
                      key={arq.id}
                      className="group flex items-center justify-between p-2.5 rounded-lg border border-[#E5E1D8] hover:border-[#0F766E]/50 hover:bg-[#0F766E]/5 transition-colors"
                    >
                      <div className="flex items-center gap-2.5 min-w-0 flex-1 mr-2">
                        <div className="shrink-0 p-1.5 rounded-md bg-white border border-[#E5E1D8]">
                          {ehDrive ? (
                            <HardDrive className="w-5 h-5 text-[#2563EB]" />
                          ) : (
                            getIconeArquivo(arq.nome, arq.tipo)
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p
                            className="text-xs font-semibold text-[#1A1D21] truncate"
                            title={arq.nome}
                          >
                            {arq.nome}
                          </p>
                          <div className="flex items-center gap-2 text-[10px] text-[#5B6470]">
                            {!ehDrive && <span>{formatarTamanho(arq.tamanho)}</span>}
                            {!ehDrive && <span>•</span>}
                            <span>{new Date(arq.created).toLocaleDateString('pt-BR')}</span>
                            {ehDrive && (
                              <Badge
                                variant="outline"
                                className="ml-1 text-[9px] font-bold uppercase tracking-wide text-[#2563EB] border-[#2563EB]/40 bg-[#2563EB]/10 px-1.5 py-0"
                              >
                                Google Drive
                              </Badge>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-1 shrink-0">
                        <Button
                          asChild
                          variant="ghost"
                          size="sm"
                          className="h-7 w-7 p-0 text-[#5B6470] hover:text-[#0F766E]"
                          title={ehDrive ? 'Abrir no Google Drive' : 'Abrir em nova aba'}
                        >
                          <a href={url} target="_blank" rel="noopener noreferrer">
                            <ExternalLink className="w-3.5 h-3.5" />
                          </a>
                        </Button>
                        {!ehDrive && (
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
                        )}
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          disabled={excluindoId === arq.id}
                          onClick={() => handleExcluir(arq)}
                          className="h-7 w-7 p-0 text-[#5B6470] hover:text-red-600"
                          title={ehDrive ? 'Remover vínculo do Drive' : 'Excluir anexo'}
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

          {/* Pastas do Google Drive vinculadas ao card (acumulam; renomear/reordenar) */}
          {pastasDrive.length > 0 && (
            <div className="space-y-2">
              <span className="text-[11px] font-bold text-[#5B6470] uppercase tracking-wider block">
                Pastas do Google Drive ({pastasDrive.length})
              </span>
              <div className="max-h-52 overflow-y-auto space-y-1.5 pr-1">
                {pastasOrdenadas(pastasDrive).map((pasta, i, arr) => (
                  <div
                    key={pasta.id}
                    className="group flex items-center justify-between p-2.5 rounded-lg border border-[#F59E0B]/40 bg-[#F59E0B]/5 hover:border-[#F59E0B]/60 transition-colors"
                  >
                    <div className="flex items-center gap-2.5 min-w-0 flex-1 mr-2">
                      <div className="shrink-0 p-1.5 rounded-md bg-white border border-[#F59E0B]/40">
                        <Folder className="w-5 h-5 text-[#F59E0B]" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p
                          className="text-xs font-semibold text-[#1A1D21] truncate"
                          title={pasta.nome}
                        >
                          {pasta.nome}
                        </p>
                        <div className="flex items-center gap-2 text-[10px] text-[#5B6470]">
                          <span>{new Date(pasta.created).toLocaleDateString('pt-BR')}</span>
                          <span>•</span>
                          <Badge
                            variant="outline"
                            className="ml-1 text-[9px] font-bold uppercase tracking-wide text-[#2563EB] border-[#2563EB]/40 bg-[#2563EB]/10 px-1.5 py-0"
                          >
                            Google Drive
                          </Badge>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      <Button
                        asChild
                        variant="ghost"
                        size="sm"
                        className="h-7 w-7 p-0 text-[#5B6470] hover:text-[#2563EB]"
                        title="Abrir no Google Drive"
                      >
                        <a href={pasta.drive_url} target="_blank" rel="noopener noreferrer">
                          <ExternalLink className="w-3.5 h-3.5" />
                        </a>
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        disabled={editandoPastaId === pasta.id}
                        onClick={() => {
                          setEditandoPastaId(pasta.id)
                          setApelidoPasta(pasta.nome)
                        }}
                        className="h-7 w-7 p-0 text-[#5B6470] hover:text-[#F59E0B]"
                        title="Renomear apelido"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </Button>
                      <div className="flex flex-col">
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          disabled={i === 0 || movendoPasta}
                          onClick={() => moverPastaModal(i, -1)}
                          className="h-4 w-6 p-0 text-[#5B6470] hover:text-[#1A1D21]"
                          title="Mover para cima"
                        >
                          <ChevronUp className="w-3 h-3" />
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          disabled={i === arr.length - 1 || movendoPasta}
                          onClick={() => moverPastaModal(i, 1)}
                          className="h-4 w-6 p-0 text-[#5B6470] hover:text-[#1A1D21]"
                          title="Mover para baixo"
                        >
                          <ChevronDown className="w-3 h-3" />
                        </Button>
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        disabled={excluindoPastaId === pasta.id}
                        onClick={() => handleExcluirPasta(pasta)}
                        className="h-7 w-7 p-0 text-[#5B6470] hover:text-red-600"
                        title="Remover vínculo da pasta"
                      >
                        {excluindoPastaId === pasta.id ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <Trash2 className="w-3.5 h-3.5" />
                        )}
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

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

        {/* Picker de arquivos do Google Drive (conectores de app) */}
        <Dialog open={pickerDriveAberto} onOpenChange={setPickerDriveAberto}>
          <DialogContent className="max-w-md bg-white border border-[#E5E1D8]">
            <DialogHeader>
              <DialogTitle className="text-base font-bold text-[#1A1D21] flex items-center gap-2">
                <HardDrive className="w-5 h-5 text-[#2563EB]" />
                Google Drive
              </DialogTitle>
              <DialogDescription className="text-xs text-[#5B6470]">
                Escolha um arquivo do seu Drive para vincular a este card.
              </DialogDescription>
            </DialogHeader>
            <div className="pt-1">
              <PickerArquivosDrive onSelecionar={handleVincularDrive} />
            </div>
          </DialogContent>
        </Dialog>

        {/* Picker de PASTAS do Google Drive (conectores de app) */}
        <Dialog open={pickerPastasAberto} onOpenChange={setPickerPastasAberto}>
          <DialogContent className="max-w-md bg-white border border-[#E5E1D8]">
            <DialogHeader>
              <DialogTitle className="text-base font-bold text-[#1A1D21] flex items-center gap-2">
                <Folder className="w-5 h-5 text-[#F59E0B]" />
                Pasta do Google Drive
              </DialogTitle>
              <DialogDescription className="text-xs text-[#5B6470]">
                Escolha uma pasta do seu Drive para vincular a este card. Nada é baixado: o card
                guarda o link de abertura da pasta.
              </DialogDescription>
            </DialogHeader>
            <div className="pt-1">
              <PickerPastasDrive onSelecionar={handleVincularPasta} />
            </div>
          </DialogContent>
        </Dialog>

        {/* Modal para criar pasta nova no Google Drive e já vincular */}
        <ModalCriarPastaDrive
          open={modalNovaPastaAberto}
          onOpenChange={setModalNovaPastaAberto}
          onCriada={handleVincularPasta}
        />

        {/* Editar apelido da pasta vinculada */}
        <Dialog open={!!editandoPastaId} onOpenChange={(o) => !o && setEditandoPastaId(null)}>
          <DialogContent className="max-w-sm bg-white border border-[#E5E1D8]">
            <DialogHeader>
              <DialogTitle className="text-base font-bold text-[#1A1D21]">
                Renomear apelido da pasta
              </DialogTitle>
              <DialogDescription className="text-xs text-[#5B6470]">
                O apelido é só o nome do vínculo no card — a pasta no Drive não é alterada.
              </DialogDescription>
            </DialogHeader>
            <form
              onSubmit={(e) => {
                e.preventDefault()
                salvarApelidoPasta()
              }}
              className="space-y-3 pt-1"
            >
              <Input
                autoFocus
                value={apelidoPasta}
                onChange={(e) => setApelidoPasta(e.target.value)}
                placeholder="Apelido da pasta..."
                maxLength={200}
                disabled={salvandoApelido}
              />
              <DialogFooter className="gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setEditandoPastaId(null)}
                >
                  Cancelar
                </Button>
                <Button type="submit" size="sm" disabled={!apelidoPasta.trim() || salvandoApelido}>
                  {salvandoApelido ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      Salvando...
                    </>
                  ) : (
                    'Salvar'
                  )}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </DialogContent>
    </Dialog>
  )
}
