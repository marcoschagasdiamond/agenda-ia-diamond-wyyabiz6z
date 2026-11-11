// Timeline do card (coluna direita do painel de detalhes) — modelo Ummense.
// Caixa de anotação com menções @ (usuário/equipe), anexos (upload do computador,
// vínculo de arquivos já enviados na Agenda ou arquivos do Google Drive do
// usuário — conectores de app), abas de filtro e feed cronológico dos eventos.
import { useEffect, useRef, useState, useMemo } from 'react'
import {
  Paperclip,
  Smile,
  Send,
  Loader2,
  Trash2,
  Circle,
  Clock,
  HelpCircle,
  File as FileIcon,
  Folder,
  FolderOpen,
  ExternalLink,
  HardDrive,
} from 'lucide-react'
import { Textarea } from '@/components/ui/textarea'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { useAuth } from '@/hooks/use-auth'
import { toast } from '@/hooks/use-toast'
import { diamondApi } from '@/services/diamondApi'
import {
  ROTULOS_ABA_TIMELINE,
  criarAnotacaoCard,
  excluirEventoCard,
  iniciais,
  listarEventosCard,
  meuNome,
  tempoRelativoPtBr,
  type AbaTimeline,
  type EventoCard,
} from '@/services/eventosCard'
import { PickerArquivosDrive } from '@/components/fluxo/PickerArquivosDrive'
import { PickerPastasDrive } from '@/components/fluxo/PickerPastasDrive'
import { linkAbrirDrive, linkAbrirPastaDrive, type ArquivoDrive } from '@/services/driveService'
import type { CardArquivo, CardPastaDrive, MembroEquipe } from '@/types'

const ABAS: AbaTimeline[] = ['todos', 'anotacoes', 'minhas', 'registros']

interface Props {
  cardId: string
  eventos: EventoCard[]
  membros: MembroEquipe[]
  onRecarregar: () => Promise<void> | void
}

export default function TimelineCard({ cardId, eventos, membros, onRecarregar }: Props) {
  const { user } = useAuth()
  const [aba, setAba] = useState<AbaTimeline>('todos')
  const [textoAnotacao, setTextoAnotacao] = useState('')
  const [enviando, setEnviando] = useState(false)
  const [excluindoId, setExcluindoId] = useState<string | null>(null)
  // Anexos da anotação: arquivos novos (upload) e arquivos já enviados na Agenda
  const [anexosPendentes, setAnexosPendentes] = useState<File[]>([])
  const [anexosAgenda, setAnexosAgenda] = useState<CardArquivo[]>([])
  const [enviandoAnexo, setEnviandoAnexo] = useState(false)
  // Anexos do Google Drive escolhidos no picker (vínculo, sem upload local)
  const [anexosDrive, setAnexosDrive] = useState<ArquivoDrive[]>([])
  const [pickerDriveAberto, setPickerDriveAberto] = useState(false)
  // Pastas do Google Drive: picker + vínculos já persistidos (card_pastas_drive)
  const [pastasVinculadas, setPastasVinculadas] = useState<CardPastaDrive[]>([])
  const [pickerPastasAberto, setPickerPastasAberto] = useState(false)
  const [vinculandoPasta, setVinculandoPasta] = useState(false)
  const [menuAnexoAberto, setMenuAnexoAberto] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Arquivos do card já enviados (para vínculo) — carregados na montagem
  useEffect(() => {
    if (!cardId) return
    let cancelado = false
    diamondApi
      .listCardArquivos(cardId)
      .then((lista) => {
        // registros do Drive não têm arquivo local para reanexar
        if (!cancelado) setAnexosAgenda(lista.filter((a) => a.tipo_origem !== 'drive'))
      })
      .catch(() => {})
    return () => {
      cancelado = true
    }
  }, [cardId])

  // Pastas do Google Drive já vinculadas ao card
  useEffect(() => {
    if (!cardId) return
    let cancelado = false
    diamondApi
      .listCardPastasDrive(cardId)
      .then((lista) => {
        if (!cancelado) setPastasVinculadas(lista)
      })
      .catch(() => {})
    return () => {
      cancelado = true
    }
  }, [cardId])

  const meusMembros = useMemo(
    () => membros.filter((m) => m.usuario === user?.id),
    [membros, user?.id],
  )

  const eventosFiltrados = useMemo(() => {
    switch (aba) {
      case 'anotacoes':
        return eventos.filter((e) => e.tipo_evento === 'anotacao')
      case 'minhas':
        return eventos.filter((e) => e.tipo_evento === 'anotacao' && e.autor === user?.id)
      case 'registros':
        return eventos.filter((e) => e.tipo_evento !== 'anotacao')
      default:
        return eventos
    }
  }, [eventos, aba, user?.id])

  const adicionarAnexos = (files: FileList | null) => {
    if (!files || files.length === 0) return
    setAnexosPendentes((prev) => [...prev, ...Array.from(files)])
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const removerAnexoPendente = (nome: string) => {
    setAnexosPendentes((prev) => prev.filter((f) => f.name !== nome))
  }

  const vincularAnexoAgenda = (arq: CardArquivo) => {
    setAnexosAgenda((prev) => prev.filter((a) => a.id !== arq.id))
    setAnexosPendentes((prev) => [
      ...prev,
      new File([], arq.nome, { type: `__agenda__:${arq.id}:${arq.arquivo}` }),
    ])
    toast({ title: `Arquivo "${arq.nome}" vinculado à anotação.` })
  }

  // Google Drive: adiciona o vínculo (sem upload) à lista de anexos pendentes
  const escolherArquivoDrive = (arq: ArquivoDrive) => {
    setAnexosDrive((prev) => (prev.some((a) => a.id === arq.id) ? prev : [...prev, arq]))
    setPickerDriveAberto(false)
    setMenuAnexoAberto(false)
    toast({ title: `Arquivo "${arq.nome}" do Drive vinculado à anotação.` })
  }

  const removerAnexoDrive = (id: string) => {
    setAnexosDrive((prev) => prev.filter((a) => a.id !== id))
  }

  // Pasta do Google Drive: cria o vínculo na hora (card_pastas_drive) e
  // registra um evento de sistema na timeline
  const escolherPastaDrive = async (pasta: ArquivoDrive) => {
    if (!cardId || vinculandoPasta) return
    setVinculandoPasta(true)
    try {
      const rec = await diamondApi.vincularCardPastaDrive({
        card: cardId,
        nome: pasta.nome,
        drive_file_id: pasta.id,
        drive_url: linkAbrirPastaDrive(pasta),
        criado_por: user?.id,
      })
      setPastasVinculadas((prev) => [rec, ...prev.filter((p) => p.id !== rec.id)])
      setPickerPastasAberto(false)
      toast({ title: `Pasta "${pasta.nome}" do Drive vinculada ao card.` })
    } catch (err) {
      console.error('Falha ao vincular pasta do Drive:', err)
      toast({
        title: `Falha ao vincular a pasta "${pasta.nome}" do Drive`,
        variant: 'destructive',
      })
    } finally {
      setVinculandoPasta(false)
    }
  }

  const handleEnviarAnotacao = async () => {
    const texto = textoAnotacao.trim()
    if ((!texto && anexosPendentes.length === 0 && anexosDrive.length === 0) || !cardId) return
    setEnviando(true)
    try {
      // 1. Upload real dos arquivos novos do computador (coleção card_arquivos)
      const anexados: Array<{ id: string; nome: string; url: string }> = []
      for (const file of anexosPendentes) {
        const marcador = (file as File & { type?: string }).type || ''
        if (marcador.startsWith('__agenda__:')) {
          // 2. Vínculo de arquivo já enviado na Agenda
          const [, idArq, campo] = marcador.split(':')
          const rec = { id: idArq, arquivo: campo }
          anexados.push({
            id: idArq,
            nome: file.name,
            url: diamondApi.getCardArquivoUrl(rec),
          })
          continue
        }
        try {
          const fd = new FormData()
          fd.append('card', cardId)
          fd.append('nome', file.name)
          fd.append('arquivo', file)
          fd.append('tamanho', String(file.size))
          fd.append('tipo', file.type || 'application/octet-stream')
          if (user?.id) fd.append('criado_por', user.id)
          const criado = await diamondApi.uploadCardArquivo(fd)
          anexados.push({
            id: criado.id,
            nome: criado.nome || file.name,
            url: diamondApi.getCardArquivoUrl(criado),
          })
        } catch (err) {
          console.error('Falha no upload do anexo da timeline:', file.name, err)
          toast({
            title: `Falha ao enviar o arquivo "${file.name}"`,
            variant: 'destructive',
          })
        }
      }

      // 3. Vínculos do Google Drive: um registro em card_arquivos com tipo_origem='drive'
      const vinculadosDrive: Array<{ id: string; nome: string; url: string }> = []
      for (const arq of anexosDrive) {
        try {
          const rec = await diamondApi.vincularCardArquivoDrive({
            card: cardId,
            nome: arq.nome,
            drive_file_id: arq.id,
            drive_url: linkAbrirDrive(arq),
            criado_por: user?.id,
          })
          vinculadosDrive.push({ id: rec.id, nome: rec.nome, url: linkAbrirDrive(arq) })
        } catch (err) {
          console.error('Falha ao vincular arquivo do Drive:', arq.nome, err)
          toast({
            title: `Falha ao vincular o arquivo "${arq.nome}" do Drive`,
            variant: 'destructive',
          })
        }
      }

      // 4. Anotação com o texto + links dos anexos embutidos
      const todosAnexos = [...anexados, ...vinculadosDrive]
      const linhasAnexo = todosAnexos.map((a) => `📎 [${a.nome}](${a.url})`).join('\n')
      const textoFinal = [texto, linhasAnexo].filter(Boolean).join('\n')
      const criada = await criarAnotacaoCard(cardId, textoFinal, {
        anexos: todosAnexos.map((a) => ({ id: a.id, nome: a.nome, url: a.url })),
      })
      if (criada) {
        setTextoAnotacao('')
        setAnexosPendentes([])
        setAnexosDrive([])
        setMenuAnexoAberto(false)
        await onRecarregar()
        toast({ title: 'Anotação registrada na timeline!' })
      } else {
        toast({ title: 'Erro ao salvar anotação', variant: 'destructive' })
      }
    } finally {
      setEnviando(false)
    }
  }

  const handleExcluir = async (ev: EventoCard) => {
    if (excluindoId) return
    setExcluindoId(ev.id)
    try {
      const ok = await excluirEventoCard(ev.id)
      if (ok) {
        await onRecarregar()
        toast({ title: 'Evento removido da timeline.' })
      } else {
        toast({ title: 'Erro ao remover evento', variant: 'destructive' })
      }
    } finally {
      setExcluindoId(null)
    }
  }

  const renderAvatarAutor = (ev: EventoCard) => {
    const nome = ev.expand?.autor?.name || ev.expand?.autor?.email || 'Sistema'
    return (
      <Avatar className="w-7 h-7 rounded-full ring-1 ring-black/5 shrink-0">
        <AvatarImage
          src={`https://img.usecurling.com/ppl/128?seed=${encodeURIComponent(nome)}`}
          alt={nome}
        />
        <AvatarFallback className="bg-gradient-to-br from-[#1E40AF] to-[#0F766E] text-white text-[9px] font-bold">
          {iniciais(nome)}
        </AvatarFallback>
      </Avatar>
    )
  }

  /** Links de anexo embutidos no texto da anotação (📎 [nome](url)) ficam clicáveis. */
  const renderTextoComAnexos = (texto: string) => {
    const partes = texto.split(/(📎 \[[^\]]+\]\([^)]+\))/g)
    return partes.map((parte, i) => {
      const m = parte.match(/^📎 \[([^\]]+)\]\(([^)]+)\)$/)
      if (m) return renderAnexoInline(parte, i)
      return <span key={i}>{parte}</span>
    })
  }

  const renderFeed = () => {
    if (eventosFiltrados.length === 0) {
      const msg =
        aba === 'minhas'
          ? 'Você ainda não escreveu nenhuma anotação neste card.'
          : aba === 'anotacoes'
            ? 'Nenhuma anotação neste card ainda.'
            : aba === 'registros'
              ? 'Nenhum registro de sistema ainda.'
              : 'Nada por aqui ainda.'
      return <p className="text-xs text-[#8A93A0] py-6 text-center">{msg}</p>
    }

    return (
      <div className="space-y-4">
        {eventosFiltrados.map((ev) => {
          const nomeAutor =
            meuNome(user) === (ev.expand?.autor?.name || '')
              ? meuNome(user)
              : ev.expand?.autor?.name || ev.expand?.autor?.email || 'Sistema'
          const podeExcluir = ev.autor === user?.id
          return (
            <div key={ev.id} className="flex items-start gap-2.5 group">
              {renderAvatarAutor(ev)}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="text-xs font-bold text-[#1A1D21]">{nomeAutor}</span>
                  <span className="text-[11px] text-[#8A93A0]">
                    {tempoRelativoPtBr(ev.created)}
                  </span>
                  {podeExcluir && (
                    <button
                      type="button"
                      onClick={() => handleExcluir(ev)}
                      title="Remover evento"
                      className="opacity-0 group-hover:opacity-100 transition-opacity text-[#CBD5E1] hover:text-red-500 ml-auto"
                    >
                      {excluindoId === ev.id ? (
                        <Loader2 className="w-3 h-3 animate-spin" />
                      ) : (
                        <Trash2 className="w-3 h-3" />
                      )}
                    </button>
                  )}
                </div>
                {ev.tipo_evento === 'anotacao' ? (
                  <p className="text-xs text-[#1A1D21] whitespace-pre-wrap break-words mt-0.5 leading-relaxed">
                    {renderTextoComMencaoEAnexos(ev.texto || '', membros, user)}
                  </p>
                ) : (
                  <p className="text-xs text-[#5B6470] whitespace-pre-wrap break-words mt-0.5 leading-relaxed">
                    {ev.texto}
                  </p>
                )}
              </div>
            </div>
          )
        })}
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-1 pb-3">
        <h3 className="text-base font-bold text-[#1A1D21]">Timeline</h3>
        <div className="flex items-center gap-2 text-[#8A93A0]">
          <Clock className="w-3.5 h-3.5" />
          <HelpCircle className="w-3.5 h-3.5" />
        </div>
      </div>

      {/* Caixa de anotação com menções @ e anexos */}
      <div className="rounded-xl border border-[#E5E1D8] bg-white p-3 shadow-xs">
        <Textarea
          rows={3}
          value={textoAnotacao}
          onChange={(e) => setTextoAnotacao(e.target.value)}
          placeholder="Escreva uma anotação neste card. Use @ para mencionar um usuário ou uma equipe."
          className="text-xs border-0 p-0 shadow-none focus-visible:ring-0 resize-none text-[#1A1D21]"
        />

        {/* Anexos pendentes da anotação (computador/Agenda e Google Drive) */}
        {(anexosPendentes.length > 0 || anexosDrive.length > 0) && (
          <div className="flex flex-wrap gap-1.5 mt-2">
            {anexosPendentes.map((f) => (
              <span
                key={f.name}
                className="inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full bg-[#F4F2EE] text-[#1A1D21] max-w-[180px]"
              >
                <FileIcon className="w-3 h-3 text-[#0F766E] shrink-0" />
                <span className="truncate">{f.name}</span>
                <button
                  type="button"
                  onClick={() => removerAnexoPendente(f.name)}
                  className="text-[#8A93A0] hover:text-red-500 shrink-0"
                >
                  ✕
                </button>
              </span>
            ))}
            {anexosDrive.map((arq) => (
              <span
                key={arq.id}
                className="inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full bg-[#2563EB]/10 text-[#2563EB] max-w-[180px]"
              >
                <HardDrive className="w-3 h-3 shrink-0" />
                <span className="truncate">{arq.nome}</span>
                <button
                  type="button"
                  onClick={() => removerAnexoDrive(arq.id)}
                  className="text-[#2563EB]/60 hover:text-red-500 shrink-0"
                >
                  ✕
                </button>
              </span>
            ))}
          </div>
        )}

        <div className="flex items-center justify-end gap-1.5 pt-2.5 border-t border-[#F1EFEA] mt-2">
          <input
            ref={fileInputRef}
            type="file"
            multiple
            className="hidden"
            onChange={(e) => adicionarAnexos(e.target.files)}
          />
          <Popover open={menuAnexoAberto} onOpenChange={setMenuAnexoAberto}>
            <PopoverTrigger asChild>
              <button
                type="button"
                title="Anexar arquivo"
                className="w-7 h-7 rounded-md hover:bg-[#F4F2EE] flex items-center justify-center text-[#8A93A0]"
              >
                {enviandoAnexo ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Paperclip className="w-3.5 h-3.5" />
                )}
              </button>
            </PopoverTrigger>
            <PopoverContent className="w-72 p-3" align="end">
              <p className="text-[10px] font-semibold text-[#8A93A0] uppercase tracking-wider mb-2">
                Anexar arquivo
              </p>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="w-full flex items-center gap-2 px-2 py-2 rounded-lg text-left text-xs text-[#1A1D21] hover:bg-[#F4F2EE]"
              >
                <FileIcon className="w-4 h-4 text-[#0F766E]" />
                Enviar arquivo do computador…
              </button>
              <button
                type="button"
                onClick={() => {
                  setMenuAnexoAberto(false)
                  setPickerDriveAberto(true)
                }}
                className="w-full flex items-center gap-2 px-2 py-2 rounded-lg text-left text-xs text-[#1A1D21] hover:bg-[#F4F2EE]"
              >
                <HardDrive className="w-4 h-4 text-[#2563EB]" />
                Google Drive…
              </button>
              <button
                type="button"
                onClick={() => {
                  setMenuAnexoAberto(false)
                  setPickerPastasAberto(true)
                }}
                className="w-full flex items-center gap-2 px-2 py-2 rounded-lg text-left text-xs text-[#1A1D21] hover:bg-[#F4F2EE]"
              >
                <Folder className="w-4 h-4 text-[#F59E0B]" />
                Pasta do Google Drive…
              </button>
              <p className="text-[10px] font-semibold text-[#8A93A0] uppercase tracking-wider mt-2 mb-1">
                Arquivos já enviados neste card
              </p>
              {anexosAgenda.length === 0 ? (
                <p className="text-[11px] text-[#8A93A0] px-2 py-1">
                  Nenhum arquivo enviado ainda neste card.
                </p>
              ) : (
                <div className="max-h-40 overflow-y-auto">
                  {anexosAgenda.map((arq) => (
                    <button
                      key={arq.id}
                      type="button"
                      onClick={() => vincularAnexoAgenda(arq)}
                      className="w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-left text-xs text-[#1A1D21] hover:bg-[#F4F2EE]"
                    >
                      <FolderOpen className="w-3.5 h-3.5 text-[#5B6470] shrink-0" />
                      <span className="truncate">{arq.nome}</span>
                    </button>
                  ))}
                </div>
              )}
            </PopoverContent>
          </Popover>
          <button
            type="button"
            title="Emoji"
            onClick={() => setTextoAnotacao((t) => t + '🙂')}
            className="w-7 h-7 rounded-md hover:bg-[#F4F2EE] flex items-center justify-center text-[#8A93A0]"
          >
            <Smile className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            title="Enviar anotação"
            disabled={!textoAnotacao.trim() || enviando}
            onClick={handleEnviarAnotacao}
            className="w-7 h-7 rounded-md hover:bg-[#F4F2EE] flex items-center justify-center text-[#0F766E] disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {enviando ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Send className="w-3.5 h-3.5" />
            )}
          </button>
        </div>

        {/* Picker de PASTAS do Google Drive (conectores de app) */}
        <Dialog open={pickerPastasAberto} onOpenChange={setPickerPastasAberto}>
          <DialogContent className="max-w-md bg-white border border-[#E5E1D8]">
            <DialogHeader>
              <DialogTitle className="text-base font-bold text-[#1A1D21] flex items-center gap-2">
                <Folder className="w-5 h-5 text-[#F59E0B]" />
                Pasta do Google Drive
              </DialogTitle>
              <DialogDescription className="text-xs text-[#5B6470]">
                Escolha uma pasta do seu Drive para vincular ao card. Nada é baixado: o card guarda
                o link de abertura da pasta.
              </DialogDescription>
            </DialogHeader>
            <div className="pt-1">
              <PickerPastasDrive onSelecionar={escolherPastaDrive} />
            </div>
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
              <DialogDescription className="text-xs text-[#5B6470]">
                Escolha um arquivo do seu Drive para vincular a esta anotação. Nada é baixado: o
                card guarda o link de abertura do arquivo.
              </DialogDescription>
            </DialogHeader>
            <div className="pt-1">
              <PickerArquivosDrive onSelecionar={escolherArquivoDrive} />
            </div>
          </DialogContent>
        </Dialog>

        {/* Sugestões de menção @ */}
        {textoAnotacao.includes('@') && membros.length > 0 && (
          <div className="mt-2 border-t border-[#F1EFEA] pt-2 space-y-1">
            <p className="text-[10px] font-semibold text-[#8A93A0] uppercase tracking-wider">
              Mencionar
            </p>
            <div className="flex flex-wrap gap-1.5">
              {membros.slice(0, 8).map((m) => {
                const nome = m.nome || m.email
                return (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => setTextoAnotacao((t) => t.replace(/@(\w*)$/, `@${nome} `))}
                    className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-[#F4F2EE] hover:bg-[#0F766E]/10 text-[#1A1D21]"
                  >
                    @{nome}
                  </button>
                )
              })}
            </div>
          </div>
        )}
      </div>

      {/* Abas */}
      <div className="flex items-center gap-3 flex-wrap px-1 py-3 border-b border-[#E5E1D8]">
        {ABAS.map((a) => (
          <button
            key={a}
            type="button"
            onClick={() => setAba(a)}
            className={`text-[11px] font-bold tracking-wide transition-colors ${
              aba === a
                ? 'text-[#2563EB] underline underline-offset-4 decoration-2'
                : 'text-[#8A93A0] hover:text-[#1A1D21]'
            }`}
          >
            {ROTULOS_ABA_TIMELINE[a]}
          </button>
        ))}
      </div>

      {/* Pastas do Google Drive vinculadas ao card (vínculo, sem upload local) */}
      {pastasVinculadas.length > 0 && (
        <div className="px-1 pb-2 space-y-1.5">
          <p className="text-[10px] font-semibold text-[#8A93A0] uppercase tracking-wider">
            Pastas do Google Drive vinculadas
          </p>
          {pastasVinculadas.map((pasta) => (
            <a
              key={pasta.id}
              href={pasta.drive_url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 rounded-lg border border-[#E5E1D8] bg-white px-2.5 py-2 hover:bg-[#F4F2EE] group/pasta"
            >
              <Folder className="w-4 h-4 text-[#F59E0B] shrink-0" />
              <span className="flex-1 min-w-0 truncate text-xs font-medium text-[#1A1D21]">
                {pasta.nome}
              </span>
              <span className="inline-flex items-center gap-1 rounded-full bg-[#2563EB]/10 px-2 py-0.5 text-[9px] font-bold text-[#2563EB] shrink-0">
                <HardDrive className="w-2.5 h-2.5" />
                GOOGLE DRIVE
              </span>
              <ExternalLink className="w-3 h-3 text-[#8A93A0] shrink-0 opacity-0 group-hover/pasta:opacity-100" />
            </a>
          ))}
        </div>
      )}

      {/* Feed cronológico */}
      <div className="flex-1 overflow-y-auto px-1 py-4">{renderFeed()}</div>
    </div>
  )
}

/** Pedaço 📎 [nome](url) do feed — links do Drive ganham ícone próprio. */
function renderAnexoInline(parte: string, chave: number) {
  const m = parte.match(/^📎 \[([^\]]+)\]\(([^)]+)\)$/)
  if (!m) return parte
  const ehDrive = /^https:\/\/(drive|docs)\.google\.com/.test(m[2])
  return (
    <a
      key={chave}
      href={m[2]}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center gap-1 text-[#0F766E] font-semibold hover:underline mr-1"
    >
      {ehDrive ? (
        <HardDrive className="w-3 h-3 text-[#2563EB]" />
      ) : (
        <Paperclip className="w-3 h-3" />
      )}
      {m[1]}
      <ExternalLink className="w-2.5 h-2.5" />
    </a>
  )
}

/**
 * Divide o texto da anotação por anexos (📎 [nome](url)) e menções (@Nome).
 * Links do Google Drive (drive.google.com / docs.google.com) são abertos em
 * nova aba direto no Drive — nunca como download local.
 */
function renderTextoComMencaoEAnexos(
  texto: string,
  membros: MembroEquipe[],
  user: { id: string; name?: string } | null,
) {
  const partes = texto.split(/(📎 \[[^\]]+\]\([^)]+\))/g)
  return partes.map((parte, i) => {
    const m = parte.match(/^📎 \[([^\]]+)\]\(([^)]+)\)$/)
    if (m) return renderAnexoInline(parte, i)
    return <span key={i}>{renderTextoComMencao(parte, membros, user)}</span>
  })
}

/** Rola os @menções em negrito dentro do texto da anotação. */
function renderTextoComMencao(
  texto: string,
  membros: MembroEquipe[],
  user: { id: string; name?: string } | null,
) {
  // Nomes possíveis de menções (aproximação: nomes de membros seguidos de espaço/pontuação)
  const nomes = Array.from(
    new Set(
      membros
        .map((m) => m.nome || m.email)
        .filter(Boolean)
        .map((n) => n as string),
    ),
  )
  let partes: Array<{ tipo: 'texto' | 'mencao'; valor: string }> = [{ tipo: 'texto', valor: texto }]
  for (const nome of nomes) {
    const novas: Array<{ tipo: 'texto' | 'mencao'; valor: string }> = []
    for (const p of partes) {
      if (p.tipo === 'mencao') {
        novas.push(p)
        continue
      }
      const pedacos = p.valor.split(`@${nome}`)
      pedacos.forEach((pedaco, i) => {
        if (i > 0) novas.push({ tipo: 'mencao', valor: `@${nome}` })
        if (pedaco) novas.push({ tipo: 'texto', valor: pedaco })
      })
    }
    partes = novas
  }
  return partes.map((p, i) =>
    p.tipo === 'mencao' ? (
      <span key={i} className="font-bold text-[#1A1D21]">
        {p.valor}
      </span>
    ) : (
      <span key={i}>{p.valor}</span>
    ),
  )
}
