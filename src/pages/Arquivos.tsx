import React, { useState, useEffect } from 'react'
import { diamondApi } from '@/services/diamondApi'
import type { Pasta, Arquivo, Projeto, PastaDriveArquivos } from '@/types'
import {
  Folder,
  FolderOpen,
  FolderPlus,
  Upload,
  File,
  Sparkles,
  Trash2,
  Download,
  Loader2,
  ArrowRight,
  HardDrive,
  ExternalLink,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useToast } from '@/hooks/use-toast'
import { useAuth } from '@/hooks/use-auth'
import { PickerArquivosDrive } from '@/components/fluxo/PickerArquivosDrive'
import { PickerPastasDrive } from '@/components/fluxo/PickerPastasDrive'
import { linkAbrirDrive, linkAbrirPastaDrive, type ArquivoDrive } from '@/services/driveService'

export default function Arquivos() {
  const { toast } = useToast()
  const { user } = useAuth()
  const [pastas, setPastas] = useState<Pasta[]>([])
  const [arquivos, setArquivos] = useState<Arquivo[]>([])
  const [projetos, setProjetos] = useState<Projeto[]>([])
  const [pastaSelecionada, setPastaSelecionada] = useState<string>('all')

  // Modal Nova Pasta
  const [modalPastaOpen, setModalPastaOpen] = useState(false)
  const [nomePasta, setNomePasta] = useState('')
  const [pastaProjetoId, setPastaProjetoId] = useState('none')

  // Upload Arquivo
  const [uploading, setUploading] = useState(false)
  const [fileToUpload, setFileToUpload] = useState<File | null>(null)
  const [nomeArquivo, setNomeArquivo] = useState('')
  const [uploadPastaId, setUploadPastaId] = useState<string>('none')
  const [modalUploadOpen, setModalUploadOpen] = useState(false)

  // Google Drive (conectores de app) - Arquivos e Pastas
  const [pickerDriveAberto, setPickerDriveAberto] = useState(false)
  const [vinculandoDrive, setVinculandoDrive] = useState(false)
  const [pastasDrive, setPastasDrive] = useState<PastaDriveArquivos[]>([])
  const [pickerPastasDriveAberto, setPickerPastasDriveAberto] = useState(false)
  const [vinculandoPastaDrive, setVinculandoPastaDrive] = useState(false)
  const [excluindoPastaDriveId, setExcluindoPastaDriveId] = useState<string | null>(null)

  // Síntese de Arquivo com IA
  const [modalResumoOpen, setModalResumoOpen] = useState(false)
  const [resumoDoc, setResumoDoc] = useState('')
  const [resumindo, setResumindo] = useState(false)

  const carregar = async () => {
    try {
      const [p, a, proj, pd] = await Promise.all([
        diamondApi.listPastas(),
        diamondApi.listArquivos(),
        diamondApi.listProjetos(),
        diamondApi.listPastasDriveArquivos(),
      ])
      setPastas(p)
      setArquivos(a)
      setProjetos(proj)
      setPastasDrive(pd)
    } catch (err) {
      console.error(err)
    }
  }

  useEffect(() => {
    carregar()
  }, [])

  const handleCriarPasta = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!nomePasta.trim()) return

    try {
      await diamondApi.createPasta({
        nome: nomePasta.trim(),
        projeto: pastaProjetoId !== 'none' ? pastaProjetoId : undefined,
      })
      toast({ title: 'Pasta criada com sucesso!' })
      setNomePasta('')
      setPastaProjetoId('none')
      setModalPastaOpen(false)
      await carregar()
    } catch (err) {
      toast({ title: 'Erro ao criar pasta', variant: 'destructive' })
    }
  }

  const handleUploadSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!fileToUpload) return
    if (fileToUpload.size > 26214400) {
      toast({
        title: 'Arquivo muito grande',
        description: 'O limite máximo por arquivo é de 25MB.',
        variant: 'destructive',
      })
      return
    }

    setUploading(true)
    try {
      const formData = new FormData()
      formData.append('nome', nomeArquivo || fileToUpload.name)
      formData.append('arquivo', fileToUpload)
      if (uploadPastaId !== 'none') {
        formData.append('pasta', uploadPastaId)
      }

      await diamondApi.uploadArquivo(formData)
      toast({ title: 'Upload concluído com sucesso!' })
      setModalUploadOpen(false)
      setFileToUpload(null)
      setNomeArquivo('')
      await carregar()
    } catch (err) {
      toast({ title: 'Erro no upload', variant: 'destructive' })
    } finally {
      setUploading(false)
    }
  }

  const handleExcluirArquivo = async (id: string) => {
    try {
      await diamondApi.deleteArquivo(id)
      toast({ title: 'Arquivo removido com sucesso.' })
      setArquivos((prev) => prev.filter((a) => a.id !== id))
    } catch {
      toast({ title: 'Erro ao remover arquivo', variant: 'destructive' })
    }
  }

  // Google Drive: vincula o arquivo escolhido no picker (registro em arquivos
  // com tipo_origem='drive', sem upload local)
  const handleVincularDrive = async (arq: ArquivoDrive) => {
    setVinculandoDrive(true)
    try {
      await diamondApi.vincularArquivoDrive({
        nome: arq.nome,
        drive_file_id: arq.id,
        drive_url: linkAbrirDrive(arq),
      })
      toast({ title: `Arquivo "${arq.nome}" do Drive vinculado!` })
      setPickerDriveAberto(false)
      await carregar()
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

  // Google Drive: vincula a PASTA escolhida no picker à área /arquivos
  // (coleção arquivos_pastas_drive, sem upload local)
  const handleVincularPastaDrive = async (pasta: ArquivoDrive) => {
    setVinculandoPastaDrive(true)
    try {
      await diamondApi.vincularPastaDriveArquivos({
        nome: pasta.nome,
        drive_file_id: pasta.id,
        drive_url: linkAbrirPastaDrive(pasta),
        criado_por: user?.id,
      })
      toast({ title: `Pasta "${pasta.nome}" do Drive vinculada!` })
      setPickerPastasDriveAberto(false)
      await carregar()
    } catch (err) {
      console.error('Falha ao vincular pasta do Drive em arquivos:', pasta.nome, err)
      toast({
        title: `Falha ao vincular a pasta "${pasta.nome}" do Drive`,
        description: (err as Error)?.message,
        variant: 'destructive',
      })
    } finally {
      setVinculandoPastaDrive(false)
    }
  }

  const handleExcluirPastaDrive = async (id: string, nome: string) => {
    if (!confirm(`Deseja realmente remover o vínculo com a pasta "${nome}"?`)) return
    setExcluindoPastaDriveId(id)
    try {
      await diamondApi.deletePastaDriveArquivos(id)
      setPastasDrive((prev) => prev.filter((p) => p.id !== id))
      toast({ title: 'Vínculo da pasta removido com sucesso.' })
    } catch {
      toast({ title: 'Erro ao remover vínculo da pasta', variant: 'destructive' })
    } finally {
      setExcluindoPastaDriveId(null)
    }
  }

  const handleResumirDocumento = async (file: File) => {
    setResumindo(true)
    setModalResumoOpen(true)
    setResumoDoc('')
    try {
      const res = await diamondApi.resumirArquivo(file)
      setResumoDoc(res.resumo || 'Sem conteúdo extraído.')
    } catch (err) {
      setResumoDoc((err as Error)?.message || 'Erro ao processar documento.')
    } finally {
      setResumindo(false)
    }
  }

  const arquivosFiltrados = arquivos.filter((arq) => {
    if (pastaSelecionada === 'all') return true
    return arq.pasta === pastaSelecionada
  })

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-xl border border-[#E5E1D8] shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl md:text-2xl font-bold tracking-tight text-[#1A1D21]">
              Arquivos & Pastas
            </h1>
            <Badge className="bg-[#0F766E]/10 text-[#0F766E] border-none text-[11px] font-semibold">
              Até 25MB por arquivo
            </Badge>
          </div>
          <p className="text-xs text-[#5B6470] mt-1">
            Organize contratos, mockups, planilhas e propostas com suporte à leitura por IA.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setModalPastaOpen(true)}
            className="text-xs h-9 border-[#E5E1D8] gap-1.5"
          >
            <FolderPlus className="w-4 h-4 text-[#5B6470]" />
            Nova Pasta
          </Button>
          <Button
            variant="outline"
            size="sm"
            disabled={vinculandoDrive}
            onClick={() => setPickerDriveAberto(true)}
            className="text-xs h-9 border-[#2563EB]/40 text-[#2563EB] hover:bg-[#2563EB]/10 hover:text-[#2563EB] gap-1.5"
          >
            {vinculandoDrive ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <HardDrive className="w-4 h-4" />
            )}
            Arquivo do Drive
          </Button>
          <Button
            variant="outline"
            size="sm"
            disabled={vinculandoPastaDrive}
            onClick={() => setPickerPastasDriveAberto(true)}
            className="text-xs h-9 border-[#F59E0B]/50 text-[#F59E0B] hover:bg-[#F59E0B]/10 hover:text-[#D97706] gap-1.5"
          >
            {vinculandoPastaDrive ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Folder className="w-4 h-4" />
            )}
            Pasta do Drive
          </Button>
          <Button
            size="sm"
            onClick={() => setModalUploadOpen(true)}
            className="bg-[#0F766E] hover:bg-[#0D5C56] text-white text-xs h-9 px-4 font-medium shadow-sm gap-1.5"
          >
            <Upload className="w-4 h-4" />
            Upload de Arquivo
          </Button>
        </div>
      </div>

      {/* Grid de Pastas */}
      <div className="space-y-2">
        <h3 className="text-xs font-bold text-[#5B6470] uppercase tracking-wider">
          Estrutura de Pastas
        </h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
          <button
            onClick={() => setPastaSelecionada('all')}
            className={`p-3 rounded-xl border text-left transition-colors flex items-center gap-2.5 ${
              pastaSelecionada === 'all'
                ? 'bg-[#0F766E] text-white border-[#0F766E]'
                : 'bg-white text-[#1A1D21] border-[#E5E1D8] hover:bg-[#F4F2EE]'
            }`}
          >
            <FolderOpen className="w-4 h-4 shrink-0" />
            <div className="truncate">
              <span className="text-xs font-bold block truncate">Todos Arquivos</span>
              <span className="text-[10px] opacity-80">{arquivos.length} itens</span>
            </div>
          </button>

          {pastas.map((pasta) => {
            const count = arquivos.filter((a) => a.pasta === pasta.id).length
            const isSelected = pastaSelecionada === pasta.id
            return (
              <button
                key={pasta.id}
                onClick={() => setPastaSelecionada(pasta.id)}
                className={`p-3 rounded-xl border text-left transition-colors flex items-center gap-2.5 ${
                  isSelected
                    ? 'bg-[#0F766E] text-white border-[#0F766E]'
                    : 'bg-white text-[#1A1D21] border-[#E5E1D8] hover:bg-[#F4F2EE]'
                }`}
              >
                <FolderOpen className="w-4 h-4 shrink-0" />
                <div className="truncate">
                  <span className="text-xs font-bold block truncate">{pasta.nome}</span>
                  <span className="text-[10px] opacity-80">{count} itens</span>
                </div>
              </button>
            )
          })}
        </div>
      </div>

      {/* Seção Pastas do Google Drive */}
      <Card className="border-[#F59E0B]/30 bg-white shadow-xs">
        <CardHeader className="pb-3 border-b border-[#E5E1D8]/60 flex flex-row items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-md bg-[#F59E0B]/10 text-[#F59E0B]">
              <Folder className="w-4 h-4" />
            </div>
            <div>
              <CardTitle className="text-sm font-bold text-[#1A1D21] flex items-center gap-2">
                Pastas do Google Drive ({pastasDrive.length})
                <Badge
                  variant="outline"
                  className="text-[9px] font-bold uppercase tracking-wide text-[#2563EB] border-[#2563EB]/40 bg-[#2563EB]/10 px-1.5 py-0"
                >
                  Drive
                </Badge>
              </CardTitle>
              <p className="text-[11px] text-[#5B6470] mt-0.5">
                Pastas do seu Google Drive vinculadas a esta área. Nada é baixado: o vínculo guarda
                o link direto de abertura.
              </p>
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            disabled={vinculandoPastaDrive}
            onClick={() => setPickerPastasDriveAberto(true)}
            className="text-xs h-8 border-[#F59E0B]/50 text-[#F59E0B] hover:bg-[#F59E0B]/10 hover:text-[#D97706] gap-1.5 shrink-0"
          >
            {vinculandoPastaDrive ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <FolderPlus className="w-3.5 h-3.5" />
            )}
            Vincular Pasta do Drive
          </Button>
        </CardHeader>
        <CardContent className="p-0">
          <div className="divide-y divide-[#E5E1D8]">
            {pastasDrive.map((p) => (
              <div
                key={p.id}
                className="p-3.5 flex items-center justify-between hover:bg-[#FAFAF9] transition-colors"
              >
                <div className="flex items-center gap-3 truncate">
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 bg-[#F59E0B]/10 text-[#F59E0B]">
                    <Folder className="w-4 h-4" />
                  </div>
                  <div className="truncate">
                    <h4 className="text-xs font-bold text-[#1A1D21] truncate">{p.nome}</h4>
                    <p className="text-[10px] text-[#5B6470] flex items-center gap-1.5">
                      Vinculada do Google Drive
                      <Badge
                        variant="outline"
                        className="text-[9px] font-bold uppercase tracking-wide text-[#2563EB] border-[#2563EB]/40 bg-[#2563EB]/10 px-1.5 py-0"
                      >
                        Drive
                      </Badge>
                      <span>•</span>
                      <span>Salva em {p.created?.slice(0, 10)}</span>
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <a
                    href={p.drive_url}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 text-xs text-[#0F766E] hover:underline px-2 py-1 rounded bg-[#F4F2EE]"
                    title="Abrir no Google Drive"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    Abrir no Drive
                  </a>
                  <button
                    disabled={excluindoPastaDriveId === p.id}
                    onClick={() => handleExcluirPastaDrive(p.id, p.nome)}
                    className="p-1.5 text-[#5B6470] hover:text-red-600 transition-colors disabled:opacity-40"
                    title="Remover vínculo da pasta"
                  >
                    {excluindoPastaDriveId === p.id ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Trash2 className="w-3.5 h-3.5" />
                    )}
                  </button>
                </div>
              </div>
            ))}

            {pastasDrive.length === 0 && (
              <div className="py-8 text-center text-xs text-[#5B6470]">
                Nenhuma pasta do Google Drive vinculada ainda. Clique em "Vincular Pasta do Drive"
                acima para adicionar.
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Tabela / Grid de Arquivos */}
      <Card className="border-[#E5E1D8] bg-white shadow-xs">
        <CardHeader className="pb-3 border-b border-[#E5E1D8]/60 flex flex-row items-center justify-between">
          <CardTitle className="text-sm font-bold text-[#1A1D21]">
            Arquivos na Pasta ({arquivosFiltrados.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="divide-y divide-[#E5E1D8]">
            {arquivosFiltrados.map((arq) => {
              const ehDrive = arq.tipo_origem === 'drive'
              const fileUrl = ehDrive
                ? arq.drive_url || '#'
                : `${import.meta.env.VITE_POCKETBASE_URL}/api/files/arquivos/${arq.id}/${arq.arquivo}`

              return (
                <div
                  key={arq.id}
                  className="p-3.5 flex items-center justify-between hover:bg-[#FAFAF9] transition-colors"
                >
                  <div className="flex items-center gap-3 truncate">
                    <div
                      className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                        ehDrive ? 'bg-[#2563EB]/10 text-[#2563EB]' : 'bg-[#F4F2EE] text-[#0F766E]'
                      }`}
                    >
                      {ehDrive ? <HardDrive className="w-4 h-4" /> : <File className="w-4 h-4" />}
                    </div>
                    <div className="truncate">
                      <h4 className="text-xs font-bold text-[#1A1D21] truncate">{arq.nome}</h4>
                      <p className="text-[10px] text-[#5B6470] flex items-center gap-1.5">
                        {ehDrive ? (
                          <>
                            Vinculado do Google Drive
                            <Badge
                              variant="outline"
                              className="text-[9px] font-bold uppercase tracking-wide text-[#2563EB] border-[#2563EB]/40 bg-[#2563EB]/10 px-1.5 py-0"
                            >
                              Drive
                            </Badge>
                          </>
                        ) : (
                          <>Salvo em {arq.created?.slice(0, 10)}</>
                        )}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <a
                      href={fileUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 text-xs text-[#0F766E] hover:underline px-2 py-1 rounded bg-[#F4F2EE]"
                      title={ehDrive ? 'Abrir no Google Drive' : 'Abrir/Baixar arquivo'}
                    >
                      {ehDrive ? (
                        <>
                          <ExternalLink className="w-3.5 h-3.5" />
                          Abrir no Drive
                        </>
                      ) : (
                        <>
                          <Download className="w-3.5 h-3.5" />
                          Baixar
                        </>
                      )}
                    </a>
                    <button
                      onClick={() => handleExcluirArquivo(arq.id)}
                      className="p-1.5 text-[#5B6470] hover:text-red-600 transition-colors"
                      title={ehDrive ? 'Remover vínculo do Drive' : 'Excluir arquivo'}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              )
            })}

            {arquivosFiltrados.length === 0 && (
              <div className="py-12 text-center text-xs text-[#5B6470]">
                Nenhum arquivo encontrado nesta pasta.
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Modal Nova Pasta */}
      <Dialog open={modalPastaOpen} onOpenChange={setModalPastaOpen}>
        <DialogContent className="max-w-sm bg-white border border-[#E5E1D8]">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-[#1A1D21]">
              Criar Nova Pasta
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCriarPasta} className="space-y-3 pt-2">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-[#1A1D21]">Nome da Pasta *</label>
              <Input
                required
                placeholder="Ex: Loja Y - Contratos"
                value={nomePasta}
                onChange={(e) => setNomePasta(e.target.value)}
                className="text-xs border-[#E5E1D8]"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-semibold text-[#5B6470]">
                Vincular a Projeto (Opcional)
              </label>
              <Select value={pastaProjetoId} onValueChange={setPastaProjetoId}>
                <SelectTrigger className="text-xs border-[#E5E1D8]">
                  <SelectValue placeholder="Nenhum" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Nenhum</SelectItem>
                  {projetos.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <DialogFooter className="pt-2">
              <Button
                type="submit"
                size="sm"
                className="bg-[#0F766E] hover:bg-[#0D5C56] text-white text-xs"
              >
                Criar Pasta
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Modal Upload Arquivo */}
      <Dialog open={modalUploadOpen} onOpenChange={setModalUploadOpen}>
        <DialogContent className="max-w-md bg-white border border-[#E5E1D8]">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-[#1A1D21]">
              Upload de Arquivo (Máx 25MB)
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleUploadSubmit} className="space-y-3.5 pt-2">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-[#1A1D21]">Selecionar Arquivo</label>
              <Input
                type="file"
                required
                onChange={(e) => {
                  const f = e.target.files?.[0] || null
                  setFileToUpload(f)
                  if (f && !nomeArquivo) setNomeArquivo(f.name)
                }}
                className="text-xs border-[#E5E1D8]"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-[#1A1D21]">Nome de Exibição</label>
              <Input
                value={nomeArquivo}
                onChange={(e) => setNomeArquivo(e.target.value)}
                placeholder="Ex: Proposta Comercial Loja Y v2"
                className="text-xs border-[#E5E1D8]"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-[#5B6470]">Pasta de Destino</label>
              <Select value={uploadPastaId} onValueChange={setUploadPastaId}>
                <SelectTrigger className="text-xs border-[#E5E1D8]">
                  <SelectValue placeholder="Sem pasta" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Sem pasta (Raiz)</SelectItem>
                  {pastas.map((pasta) => (
                    <SelectItem key={pasta.id} value={pasta.id}>
                      {pasta.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {fileToUpload && (
              <div className="p-2.5 rounded bg-[#F4F2EE] border border-[#E5E1D8] flex items-center justify-between">
                <span className="text-[11px] text-[#5B6470] truncate">{fileToUpload.name}</span>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => handleResumirDocumento(fileToUpload)}
                  className="text-[11px] h-7 border-[#0F766E]/40 text-[#0F766E] gap-1"
                >
                  <Sparkles className="w-3 h-3" />
                  Sintetizar com IA
                </Button>
              </div>
            )}

            <DialogFooter className="pt-2">
              <Button
                type="submit"
                disabled={uploading}
                size="sm"
                className="bg-[#0F766E] hover:bg-[#0D5C56] text-white text-xs"
              >
                {uploading ? 'Enviando...' : 'Fazer Upload'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Picker de arquivos do Google Drive (conectores de app) */}
      <Dialog open={pickerDriveAberto} onOpenChange={setPickerDriveAberto}>
        <DialogContent className="max-w-md bg-white border border-[#E5E1D8]">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-[#1A1D21] flex items-center gap-2">
              <HardDrive className="w-5 h-5 text-[#2563EB]" />
              Google Drive
            </DialogTitle>
            <p className="text-xs text-[#5B6470]">
              Escolha um arquivo do seu Drive para vincular à área de Arquivos.
            </p>
          </DialogHeader>
          <div className="pt-1">
            <PickerArquivosDrive onSelecionar={handleVincularDrive} />
          </div>
        </DialogContent>
      </Dialog>

      {/* Picker de PASTAS do Google Drive (conectores de app) */}
      <Dialog open={pickerPastasDriveAberto} onOpenChange={setPickerPastasDriveAberto}>
        <DialogContent className="max-w-md bg-white border border-[#E5E1D8]">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-[#1A1D21] flex items-center gap-2">
              <Folder className="w-5 h-5 text-[#F59E0B]" />
              Pastas do Google Drive
            </DialogTitle>
            <DialogDescription className="text-xs text-[#5B6470]">
              Escolha uma pasta do seu Drive para vincular à área de Arquivos. Nada é baixado: o
              vínculo guarda o link de abertura direta da pasta no Drive.
            </DialogDescription>
          </DialogHeader>
          <div className="pt-1">
            <PickerPastasDrive onSelecionar={handleVincularPastaDrive} />
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal Síntese Documento */}
      <Dialog open={modalResumoOpen} onOpenChange={setModalResumoOpen}>
        <DialogContent className="max-w-lg bg-white border border-[#E5E1D8]">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-[#1A1D21] flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-[#0F766E]" />
              Síntese Executiva do Documento
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 pt-2">
            {resumindo ? (
              <div className="py-8 text-center space-y-2">
                <Loader2 className="w-8 h-8 animate-spin text-[#0F766E] mx-auto" />
                <p className="text-xs text-[#5B6470]">
                  Extraindo conteúdo e sintetizando com IA Diamond...
                </p>
              </div>
            ) : (
              <div className="max-h-[300px] overflow-y-auto text-xs text-[#1A1D21] whitespace-pre-wrap leading-relaxed p-3 rounded bg-[#F4F2EE]">
                {resumoDoc}
              </div>
            )}
            <DialogFooter className="pt-2">
              <Button size="sm" onClick={() => setModalResumoOpen(false)} className="text-xs">
                Fechar
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
