import React, { useState, useEffect } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Mic,
  Square,
  Pause,
  Play,
  RotateCcw,
  Sparkles,
  Calendar,
  Video,
  CheckSquare,
  ExternalLink,
  AlertTriangle,
  Loader2,
  CheckCircle2,
  Clock,
  User,
  FolderGit2,
  Layers,
  ArrowRight,
} from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { diamondApi } from '@/services/diamondApi'
import { useAudioRecorder } from '@/hooks/use-audio-recorder'
import { Projeto, Contato, FluxoKanban } from '@/types'
import { Link } from 'react-router-dom'

interface ModalNovaReuniaoFolhaProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  projetos: Projeto[]
  contatos: Contato[]
  fluxos: FluxoKanban[]
  onReuniaoConcluida?: () => void
}

type EtapaReuniao = 'gravando' | 'processando' | 'revisao' | 'sucesso'

export function ModalNovaReuniaoFolha({
  open,
  onOpenChange,
  projetos,
  contatos,
  fluxos,
  onReuniaoConcluida,
}: ModalNovaReuniaoFolhaProps) {
  const { toast } = useToast()

  const {
    gravando,
    pausado,
    tempoSegundos,
    audioBlob,
    audioUrl,
    iniciarGravacao,
    pausarGravacao,
    retomarGravacao,
    pararGravacao,
    descartarGravacao,
    erroGravacao,
  } = useAudioRecorder()

  const [etapa, setEtapa] = useState<EtapaReuniao>('gravando')
  const [erroIA, setErroIA] = useState<string | null>(null)
  const [statusProcessamento, setStatusProcessamento] = useState(
    'Transcrevendo áudio e estruturando plano com IA...',
  )

  // Dados extraídos e editáveis
  const [transcricao, setTranscricao] = useState('')
  const [titulo, setTitulo] = useState('')
  const [dataDetectada, setDataDetectada] = useState(false)
  const [dataTextoOriginal, setDataTextoOriginal] = useState<string | null>(null)
  const [dataInicio, setDataInicio] = useState('')
  const [dataFim, setDataFim] = useState('')
  const [linkReuniao, setLinkReuniao] = useState('')
  const [resumo, setResumo] = useState('')
  const [decisoes, setDecisoes] = useState<string[]>([])
  const [proximosPassos, setProximosPassos] = useState<string[]>([])
  const [proximosPassosSelecionados, setProximosPassosSelecionados] = useState<
    Record<number, boolean>
  >({})

  // Vínculos
  const [projetoId, setProjetoId] = useState<string>('none')
  const [contatoId, setContatoId] = useState<string>('none')
  const [fluxoId, setFluxoId] = useState<string>('none')

  // Estado de persistência final
  const [salvandoTudo, setSalvandoTudo] = useState(false)
  const [eventoCriadoId, setEventoCriadoId] = useState<string | null>(null)
  const [cardsCriadosCount, setCardsCriadosCount] = useState(0)

  // Duração máxima sugerida: 25 min (1500 seg)
  const MAX_SEGUNDOS = 1500
  const progressoTempo = Math.min((tempoSegundos / MAX_SEGUNDOS) * 100, 100)

  const formatarTempo = (totalSec: number) => {
    const mins = Math.floor(totalSec / 60)
    const secs = totalSec % 60
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }

  // Ao abrir o modal, reseta ou prepara
  useEffect(() => {
    if (open) {
      setEtapa('gravando')
      setErroIA(null)
      setTranscricao('')
      setTitulo('')
      setDataDetectada(false)
      setDataTextoOriginal(null)
      setDataInicio('')
      setDataFim('')
      setLinkReuniao('')
      setResumo('')
      setDecisoes([])
      setProximosPassos([])
      setProximosPassosSelecionados({})
      setProjetoId('none')
      setContatoId('none')
      setFluxoId('none')
      setEventoCriadoId(null)
      setCardsCriadosCount(0)
    } else {
      if (gravando) {
        descartarGravacao()
      }
    }
  }, [open])

  // Iniciar gravação de microfone
  const handleIniciarGravacao = async () => {
    setErroIA(null)
    try {
      await iniciarGravacao()
      toast({
        title: 'Gravação iniciada',
        description:
          'Microfone ativo. Fale os detalhes da reunião, participantes, prazos e próximos passos.',
      })
    } catch (err: any) {
      toast({
        title: 'Permissão de microfone negada',
        description: err.message || 'Verifique as permissões de áudio no seu navegador.',
        variant: 'destructive',
      })
    }
  }

  // Parar gravação e disparar transcrição + extração OpenAI
  const handlePararEProcessar = async () => {
    const blob = await pararGravacao()
    if (!blob) {
      toast({
        title: 'Áudio não capturado',
        description: 'Fale por pelo menos alguns segundos antes de finalizar.',
        variant: 'destructive',
      })
      return
    }

    setEtapa('processando')
    setStatusProcessamento('Enviando áudio para transcrição com IA...')
    setErroIA(null)

    try {
      // Converte Blob para Base64
      const reader = new FileReader()
      const base64Promise = new Promise<string>((resolve, reject) => {
        reader.onloadend = () => {
          const res = reader.result as string
          const base64 = res.includes(',') ? res.split(',')[1] : res
          resolve(base64)
        }
        reader.onerror = reject
      })
      reader.readAsDataURL(blob)
      const audioBase64 = await base64Promise

      setStatusProcessamento('Transcrevendo fala e extraindo plano executivo com IA...')

      const hoje = new Date()
      const resposta = await diamondApi.transcreverEExtrairReuniao({
        audio_base64: audioBase64,
        mime_type: blob.type || 'audio/webm',
        nome_arquivo: `reuniao_${Date.now()}.webm`,
        data_referencia: hoje.toISOString(),
      })

      if (resposta?.sucesso) {
        const analise = resposta.analise
        setTranscricao(resposta.transcricao || '')
        setTitulo(analise.titulo_sugerido || 'Reunião Diamond')
        setDataDetectada(!!analise.data_detectada && !!analise.data_inicio)
        setDataTextoOriginal(analise.data_texto_original || null)

        // Se data detectada, formata para datetime-local
        if (analise.data_inicio) {
          const dtInicio = new Date(analise.data_inicio)
          if (!isNaN(dtInicio.getTime())) {
            setDataInicio(formatarParaDatetimeLocal(dtInicio))
          }
        } else {
          // Fallback: data de hoje + 1h
          const fallbackData = new Date()
          fallbackData.setHours(fallbackData.getHours() + 1, 0, 0, 0)
          setDataInicio(formatarParaDatetimeLocal(fallbackData))
        }

        if (analise.data_fim) {
          const dtFim = new Date(analise.data_fim)
          if (!isNaN(dtFim.getTime())) {
            setDataFim(formatarParaDatetimeLocal(dtFim))
          }
        } else {
          const dtFimFallback = new Date()
          dtFimFallback.setHours(dtFimFallback.getHours() + 2, 0, 0, 0)
          setDataFim(formatarParaDatetimeLocal(dtFimFallback))
        }

        setLinkReuniao(analise.link_reuniao_sugerido || `https://meet.jit.si/diamond-${Date.now()}`)
        setResumo(analise.resumo || '')
        setDecisoes(Array.isArray(analise.decisoes) ? analise.decisoes : [])

        const passos = Array.isArray(analise.proximos_passos) ? analise.proximos_passos : []
        setProximosPassos(passos)

        // Todos os passos vêm selecionados por padrão
        const mapaCheck: Record<number, boolean> = {}
        passos.forEach((_, idx) => {
          mapaCheck[idx] = true
        })
        setProximosPassosSelecionados(mapaCheck)

        if (analise.projeto_id) setProjetoId(analise.projeto_id)
        if (analise.contato_id) setContatoId(analise.contato_id)

        setEtapa('revisao')
        toast({
          title: 'Reunião transcrita com sucesso!',
          description: analise.data_detectada
            ? `Data detectada: "${analise.data_texto_original || 'Identificada na gravação'}". Revise e confirme.`
            : 'Nenhuma data específica falada no áudio. Você pode definir a data manualmente.',
        })
      }
    } catch (err: any) {
      console.error('Erro ao processar reunião com IA:', err)
      const codigo = err.codigo || ''
      if (
        codigo === 'IA_NAO_CONECTADA' ||
        codigo === 'OPENAI_NAO_CONECTADA' ||
        err.message?.includes('não está conectada') ||
        err.message?.includes('Nenhuma IA está conectada')
      ) {
        setErroIA(
          'Nenhuma IA está conectada. Conecte sua conta OpenAI ou Google Gemini (chave gratuita em aistudio.google.com) em Configurações para transcrever e estruturar reuniões.',
        )
      } else {
        setErroIA(err.message || 'Falha ao processar reunião com o serviço de IA.')
      }
      setEtapa('gravando')
    }
  }

  const formatarParaDatetimeLocal = (d: Date) => {
    const pad = (n: number) => n.toString().padStart(2, '0')
    const ano = d.getFullYear()
    const mes = pad(d.getMonth() + 1)
    const dia = pad(d.getDate())
    const hora = pad(d.getHours())
    const min = pad(d.getMinutes())
    return `${ano}-${mes}-${dia}T${hora}:${min}`
  }

  // Alternar checkbox de próximo passo
  const alternarProximoPasso = (idx: number) => {
    setProximosPassosSelecionados((prev) => ({
      ...prev,
      [idx]: !prev[idx],
    }))
  }

  // Adicionar novo próximo passo manualmente
  const handleAdicionarPasso = () => {
    const novoIdx = proximosPassos.length
    setProximosPassos([...proximosPassos, 'Nova tarefa acordada'])
    setProximosPassosSelecionados({ ...proximosPassosSelecionados, [novoIdx]: true })
  }

  // Confirmar e Salvar: Cria Evento no Calendário + Cards Kanban no BACKLOG + Registro na Folha
  const handleConfirmarTudo = async () => {
    if (!titulo.trim()) {
      toast({ title: 'Informe um título para a reunião', variant: 'destructive' })
      return
    }
    if (!dataInicio) {
      toast({ title: 'Defina a data e hora de início da reunião', variant: 'destructive' })
      return
    }

    setSalvandoTudo(true)
    try {
      // 1. Salva evento no Calendário
      const dtInicioIso = new Date(dataInicio).toISOString()
      const dtFimIso = dataFim ? new Date(dataFim).toISOString() : undefined

      const passosFinal = proximosPassos.filter((_, idx) => proximosPassosSelecionados[idx])

      const payloadEvento = {
        titulo: titulo.trim(),
        descricao: resumo.trim() || transcricao.slice(0, 500),
        data_inicio: dtInicioIso,
        data_fim: dtFimIso,
        categoria: 'reuniao' as const,
        status: 'pendente' as const,
        prioridade: 'alta' as const,
        link_reuniao: linkReuniao.trim(),
        transcricao: transcricao.trim(),
        resumo: resumo.trim(),
        decisoes: JSON.stringify(decisoes),
        proximos_passos: JSON.stringify(passosFinal),
        projeto: projetoId !== 'none' ? projetoId : undefined,
        contato: contatoId !== 'none' ? contatoId : undefined,
      }

      const eventoCriado = await diamondApi.createEventoCalendario(payloadEvento)
      setEventoCriadoId(eventoCriado.id)

      // 2. Determina onde criar os cards do Kanban (Fluxo do projeto ou fluxo selecionado)
      let fluxoDestinoId = fluxoId !== 'none' ? fluxoId : null

      // Se nenhum fluxo selecionado mas tem fluxos disponíveis, usa o primeiro fluxo ativo
      if (!fluxoDestinoId && fluxos.length > 0) {
        fluxoDestinoId = fluxos[0].id
      }

      // Busca as colunas do fluxo para identificar a chave da coluna BACKLOG (ou primeira coluna)
      let statusDestino = 'backlog'
      try {
        const colunas = await diamondApi.listColunasFluxo()
        const colBacklog =
          colunas.find((c) => c.titulo?.toUpperCase().includes('BACKLOG')) ||
          colunas.find((c) => c.chave?.toLowerCase().includes('backlog')) ||
          colunas[0]
        if (colBacklog?.chave) {
          statusDestino = colBacklog.chave
        }
      } catch (eCol) {
        console.warn('Não foi possível carregar colunas do fluxo:', eCol)
      }

      // 3. Cria cards no Kanban para cada próximo passo selecionado
      let criados = 0
      for (const passo of passosFinal) {
        if (!passo.trim()) continue
        try {
          await diamondApi.createCard({
            titulo: passo.trim(),
            descricao: `Tarefa gerada a partir da reunião "${titulo.trim()}".\n\nResumo:\n${resumo.trim()}`,
            projeto: projetoId !== 'none' ? projetoId : undefined,
            contato: contatoId !== 'none' ? contatoId : undefined,
            prioridade: 'alta',
            status: statusDestino,
            fluxo_id: fluxoDestinoId || undefined,
          })
          criados++
        } catch (cardErr) {
          console.warn('Erro ao criar card de próximo passo:', cardErr)
        }
      }
      setCardsCriadosCount(criados)

      // 4. Cria registro na Folha do Dia para manter rastreabilidade histórica
      try {
        const formDataFolha = new FormData()
        const agora = new Date()
        formDataFolha.append('data', agora.toISOString().split('T')[0])
        formDataFolha.append('data_hora', agora.toISOString().slice(0, 16))
        formDataFolha.append(
          'registro',
          `📅 Reunião Agendada: ${titulo.trim()}\nHorário: ${new Date(dataInicio).toLocaleString('pt-BR')}\nLink: ${linkReuniao}\n\nResumo:\n${resumo}\n\nPróximos passos criados no Kanban: ${criados}`,
        )
        formDataFolha.append('tipo_origem', 'manual')
        formDataFolha.append('origem_ref', 'Nova Reunião (Folha IA)')
        formDataFolha.append('status', 'concluido')
        formDataFolha.append('is_reuniao', 'true')
        if (projetoId !== 'none') formDataFolha.append('projeto', projetoId)
        if (contatoId !== 'none') formDataFolha.append('contato', contatoId)

        await diamondApi.createFolhaDia(formDataFolha)
      } catch (folhaErr) {
        console.warn('Aviso ao registrar na Folha do Dia:', folhaErr)
      }

      setEtapa('sucesso')
      toast({
        title: 'Reunião e tarefas salvas com sucesso!',
        description: `Evento agendado no Calendário e ${criados} tarefas enviadas para a coluna BACKLOG do Kanban.`,
      })

      if (onReuniaoConcluida) {
        onReuniaoConcluida()
      }
    } catch (err: any) {
      toast({
        title: 'Erro ao salvar reunião',
        description: err.message || 'Verifique os dados e tente novamente.',
        variant: 'destructive',
      })
    } finally {
      setSalvandoTudo(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[92vh] overflow-y-auto p-0 border-[#E5E1D8]">
        {/* Cabeçalho */}
        <DialogHeader className="p-6 pb-4 border-b border-[#E5E1D8] bg-[#FAFAF9]">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-xl bg-red-100 text-red-600 flex items-center justify-center shrink-0">
                <Mic className="w-5 h-5" />
              </div>
              <div>
                <DialogTitle className="text-base font-bold text-[#1A1D21] flex items-center gap-2">
                  Nova Reunião na Folha do Dia
                  <Badge className="bg-[#0F766E]/10 text-[#0F766E] border-none text-[10px]">
                    OpenAI / Gemini + Jitsi
                  </Badge>
                </DialogTitle>
                <DialogDescription className="text-xs text-[#5B6470]">
                  Grave o alinhamento: a IA transcreve, agenda no Calendário com link online e manda
                  as tarefas para o Kanban.
                </DialogDescription>
              </div>
            </div>

            {/* Status da Etapa */}
            <div className="hidden sm:flex items-center gap-1.5 text-[11px] font-medium text-zinc-500">
              <span className={etapa === 'gravando' ? 'text-[#0F766E] font-bold' : ''}>
                1. Gravar
              </span>
              <span>→</span>
              <span className={etapa === 'revisao' ? 'text-[#0F766E] font-bold' : ''}>
                2. Revisar IA
              </span>
              <span>→</span>
              <span className={etapa === 'sucesso' ? 'text-emerald-600 font-bold' : ''}>
                3. Criado
              </span>
            </div>
          </div>
        </DialogHeader>

        <div className="p-6 space-y-6">
          {/* ============================================================== */}
          {/* ETAPA 1: GRAVANDO / ÁUDIO */}
          {/* ============================================================== */}
          {etapa === 'gravando' && (
            <div className="space-y-6">
              {/* Aviso de Erro de Conexão com IA */}
              {erroIA && (
                <div className="p-4 rounded-xl border border-amber-300 bg-amber-50 text-amber-950 space-y-2">
                  <div className="flex items-start gap-2.5">
                    <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                    <div className="space-y-1">
                      <p className="font-semibold text-xs text-amber-900">
                        Conexão de IA necessária (OpenAI ou Google Gemini)
                      </p>
                      <p className="text-xs text-amber-800 leading-relaxed">{erroIA}</p>
                    </div>
                  </div>
                  <div className="pt-2 pl-7">
                    <Button
                      asChild
                      size="sm"
                      className="bg-[#0F766E] hover:bg-[#0D5C56] text-white text-xs h-8 gap-1.5"
                    >
                      <Link to="/config">
                        <Sparkles className="w-3.5 h-3.5" />
                        <span>Conectar OpenAI ou Gemini em Configurações</span>
                      </Link>
                    </Button>
                  </div>
                </div>
              )}

              {/* Box de Gravação */}
              <div className="p-6 rounded-2xl border-2 border-dashed border-[#E5E1D8] bg-[#FAFAF9] flex flex-col items-center justify-center text-center space-y-4">
                {/* Visualizador de Pulso de Gravação */}
                <div className="relative">
                  <div
                    className={`w-24 h-24 rounded-full flex items-center justify-center transition-all ${
                      gravando
                        ? 'bg-red-500 text-white ring-8 ring-red-100 animate-pulse'
                        : audioUrl
                          ? 'bg-emerald-500 text-white ring-4 ring-emerald-100'
                          : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200'
                    }`}
                  >
                    <Mic className="w-10 h-10" />
                  </div>
                  {gravando && (
                    <span className="absolute -top-1 -right-1 flex h-4 w-4">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-4 w-4 bg-red-600"></span>
                    </span>
                  )}
                </div>

                {/* Timer e Status */}
                <div>
                  <div className="text-3xl font-mono font-bold tracking-tight text-[#1A1D21]">
                    {formatarTempo(tempoSegundos)}
                  </div>
                  <p className="text-xs text-[#5B6470] mt-1">
                    {gravando
                      ? pausado
                        ? 'Gravação em pausa'
                        : 'Gravando áudio da reunião ao vivo...'
                      : audioUrl
                        ? 'Gravação pronta para análise da IA'
                        : 'Pressione o botão para iniciar a reunião'}
                  </p>
                </div>

                {/* Barra de Limite de Tempo (Sugerido até 25min) */}
                <div className="w-full max-w-xs space-y-1">
                  <div className="flex justify-between text-[10px] text-zinc-400">
                    <span>Início</span>
                    <span>Sugerido até ~25 min</span>
                  </div>
                  <Progress value={progressoTempo} className="h-1.5" />
                </div>

                {/* Player do Áudio Gravado */}
                {audioUrl && !gravando && (
                  <div className="w-full max-w-md pt-2">
                    <audio controls src={audioUrl} className="w-full h-9" />
                  </div>
                )}

                {/* Botões de Ação do Gravador */}
                <div className="flex flex-wrap items-center justify-center gap-2 pt-2">
                  {!gravando && !audioUrl && (
                    <Button
                      onClick={handleIniciarGravacao}
                      className="bg-red-600 hover:bg-red-700 text-white font-semibold text-xs h-10 px-5 gap-2 shadow-xs"
                    >
                      <Mic className="w-4 h-4" />
                      <span>Começar Gravação</span>
                    </Button>
                  )}

                  {gravando && (
                    <>
                      {pausado ? (
                        <Button
                          onClick={retomarGravacao}
                          variant="outline"
                          size="sm"
                          className="text-xs h-9 gap-1.5 border-zinc-300"
                        >
                          <Play className="w-3.5 h-3.5 text-emerald-600" />
                          <span>Retomar</span>
                        </Button>
                      ) : (
                        <Button
                          onClick={pausarGravacao}
                          variant="outline"
                          size="sm"
                          className="text-xs h-9 gap-1.5 border-zinc-300"
                        >
                          <Pause className="w-3.5 h-3.5 text-amber-600" />
                          <span>Pausar</span>
                        </Button>
                      )}

                      <Button
                        onClick={handlePararEProcessar}
                        className="bg-[#0F766E] hover:bg-[#0D5C56] text-white font-semibold text-xs h-9 px-4 gap-2 shadow-xs"
                      >
                        <Square className="w-3.5 h-3.5 fill-current" />
                        <span>Concluir Gravação & Transcrever com IA</span>
                      </Button>
                    </>
                  )}

                  {audioUrl && !gravando && (
                    <>
                      <Button
                        onClick={handlePararEProcessar}
                        className="bg-[#0F766E] hover:bg-[#0D5C56] text-white font-semibold text-xs h-10 px-5 gap-2 shadow-xs"
                      >
                        <Sparkles className="w-4 h-4" />
                        <span>Transcrever & Extrair com IA</span>
                      </Button>

                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={descartarGravacao}
                        className="text-xs text-zinc-500 hover:text-red-600 h-9 gap-1"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                        <span>Gravar Novamente</span>
                      </Button>
                    </>
                  )}
                </div>

                {erroGravacao && <p className="text-xs text-red-600 font-medium">{erroGravacao}</p>}
              </div>

              {/* Dica de Uso */}
              <div className="p-3.5 rounded-xl border border-blue-100 bg-blue-50/70 text-xs text-blue-900 flex items-start gap-2.5">
                <Sparkles className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                <div className="space-y-0.5">
                  <p className="font-semibold text-blue-950">
                    Dica para detecção de datas e tarefas:
                  </p>
                  <p className="text-blue-800 text-[11px] leading-relaxed">
                    Você pode falar naturalmente: &quot;reunião com o cliente João quinta às 15h
                    para alinhar a proposta&quot;. A IA (OpenAI ou Gemini) identifica
                    automaticamente a data de realização e gera tarefas para o Kanban.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* ============================================================== */}
          {/* ETAPA 2: PROCESSANDO COM IA */}
          {/* ============================================================== */}
          {etapa === 'processando' && (
            <div className="py-12 flex flex-col items-center justify-center text-center space-y-4">
              <div className="w-16 h-16 rounded-2xl bg-[#0F766E]/10 text-[#0F766E] flex items-center justify-center">
                <Loader2 className="w-8 h-8 animate-spin" />
              </div>
              <div className="space-y-1">
                <h3 className="text-base font-bold text-[#1A1D21]">Processando Reunião com IA</h3>
                <p className="text-xs text-[#5B6470]">{statusProcessamento}</p>
              </div>
              <Badge variant="outline" className="text-[11px] border-zinc-200 text-zinc-600">
                OpenAI Whisper / Google Gemini • Plano de Ação & Kanban
              </Badge>
            </div>
          )}

          {/* ============================================================== */}
          {/* ETAPA 3: REVISÃO DOS DADOS EXTRAÍDOS */}
          {/* ============================================================== */}
          {etapa === 'revisao' && (
            <div className="space-y-6">
              {/* Alerta de detecção de data */}
              {dataDetectada ? (
                <div className="p-3.5 rounded-xl border border-emerald-200 bg-emerald-50 text-emerald-950 flex items-start gap-2.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  <div className="text-xs">
                    <span className="font-semibold text-emerald-900">
                      Data identificada pela IA:{' '}
                    </span>
                    <span className="text-emerald-800">
                      Trecho falado: &quot;{dataTextoOriginal}&quot;. O evento será criado no
                      calendário no horário indicado.
                    </span>
                  </div>
                </div>
              ) : (
                <div className="p-3.5 rounded-xl border border-amber-200 bg-amber-50 text-amber-950 flex items-start gap-2.5">
                  <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                  <div className="text-xs">
                    <span className="font-semibold text-amber-900">
                      Nenhuma data específica falada no áudio.{' '}
                    </span>
                    <span className="text-amber-800">
                      Defina abaixo a data e horário de início da reunião no calendário para
                      agendamento.
                    </span>
                  </div>
                </div>
              )}

              {/* Título e Vínculos */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5 md:col-span-2">
                  <label className="text-xs font-semibold text-[#1A1D21]">Título da Reunião</label>
                  <Input
                    value={titulo}
                    onChange={(e) => setTitulo(e.target.value)}
                    placeholder="Ex: Alinhamento de Contrato com Cliente João"
                    className="text-xs border-[#E5E1D8]"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-[#1A1D21] flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-[#0F766E]" />
                    Início da Reunião
                  </label>
                  <Input
                    type="datetime-local"
                    value={dataInicio}
                    onChange={(e) => setDataInicio(e.target.value)}
                    className="text-xs border-[#E5E1D8]"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-[#1A1D21] flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-zinc-400" />
                    Término da Reunião
                  </label>
                  <Input
                    type="datetime-local"
                    value={dataFim}
                    onChange={(e) => setDataFim(e.target.value)}
                    className="text-xs border-[#E5E1D8]"
                  />
                </div>

                {/* Link de Reunião (Jitsi ou custom) */}
                <div className="space-y-1.5 md:col-span-2">
                  <label className="text-xs font-semibold text-[#1A1D21] flex items-center justify-between">
                    <span className="flex items-center gap-1.5">
                      <Video className="w-3.5 h-3.5 text-indigo-600" />
                      Link da Reunião Online (Jitsi incorporado ou Meet/Zoom)
                    </span>
                    <a
                      href={linkReuniao}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[11px] text-indigo-600 hover:underline flex items-center gap-1"
                    >
                      <ExternalLink className="w-3 h-3" /> Testar Sala
                    </a>
                  </label>
                  <Input
                    value={linkReuniao}
                    onChange={(e) => setLinkReuniao(e.target.value)}
                    placeholder="https://meet.jit.si/..."
                    className="text-xs border-[#E5E1D8] font-mono"
                  />
                  <p className="text-[11px] text-zinc-500">
                    O link Jitsi não requer conta e abre diretamente no aplicativo. Se preferir,
                    cole um link do Google Meet ou Zoom.
                  </p>
                </div>
              </div>

              {/* Vínculo de Projeto e Contato */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 p-3.5 rounded-xl border border-[#E5E1D8] bg-[#FAFAF9]">
                <div className="space-y-1">
                  <label className="text-[11px] font-semibold text-zinc-600 flex items-center gap-1">
                    <FolderGit2 className="w-3 h-3" /> Projeto Vinculado
                  </label>
                  <Select value={projetoId} onValueChange={setProjetoId}>
                    <SelectTrigger className="h-8 text-xs border-[#E5E1D8] bg-white">
                      <SelectValue placeholder="Selecione..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Nenhum projeto</SelectItem>
                      {projetos.map((p) => (
                        <SelectItem key={p.id} value={p.id}>
                          {p.nome}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-semibold text-zinc-600 flex items-center gap-1">
                    <User className="w-3 h-3" /> Contato / Cliente
                  </label>
                  <Select value={contatoId} onValueChange={setContatoId}>
                    <SelectTrigger className="h-8 text-xs border-[#E5E1D8] bg-white">
                      <SelectValue placeholder="Selecione..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Nenhum contato</SelectItem>
                      {contatos.map((c) => (
                        <SelectItem key={c.id} value={c.id}>
                          {c.nome}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-semibold text-zinc-600 flex items-center gap-1">
                    <Layers className="w-3 h-3" /> Fluxo Kanban Destino
                  </label>
                  <Select value={fluxoId} onValueChange={setFluxoId}>
                    <SelectTrigger className="h-8 text-xs border-[#E5E1D8] bg-white">
                      <SelectValue placeholder="Padrão do projeto" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Padrão do sistema</SelectItem>
                      {fluxos.map((f) => (
                        <SelectItem key={f.id} value={f.id}>
                          {f.nome}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Próximos Passos (Kanban BACKLOG) */}
              <div className="space-y-2.5 p-4 rounded-xl border border-[#E5E1D8] bg-white">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <CheckSquare className="w-4 h-4 text-[#0F766E]" />
                    <span className="text-xs font-bold text-[#1A1D21]">
                      Próximos Passos para o Kanban (Coluna BACKLOG)
                    </span>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={handleAdicionarPasso}
                    className="text-xs text-[#0F766E] h-7 px-2 hover:bg-[#0F766E]/10"
                  >
                    + Adicionar Passo
                  </Button>
                </div>

                <p className="text-[11px] text-[#5B6470]">
                  Selecione as ações que devem ser criadas como tarefas na coluna BACKLOG do fluxo
                  Kanban:
                </p>

                <div className="space-y-2 pt-1">
                  {proximosPassos.map((passo, idx) => (
                    <div
                      key={idx}
                      className="flex items-start gap-2.5 p-2.5 rounded-lg border border-zinc-200 bg-zinc-50/50 hover:bg-zinc-50"
                    >
                      <input
                        type="checkbox"
                        checked={!!proximosPassosSelecionados[idx]}
                        onChange={() => alternarProximoPasso(idx)}
                        className="mt-1 h-4 w-4 rounded border-zinc-300 text-[#0F766E] focus:ring-[#0F766E]"
                      />
                      <Input
                        value={passo}
                        onChange={(e) => {
                          const novos = [...proximosPassos]
                          novos[idx] = e.target.value
                          setProximosPassos(novos)
                        }}
                        className="text-xs h-8 border-transparent bg-transparent focus:border-zinc-300 focus:bg-white"
                      />
                    </div>
                  ))}

                  {proximosPassos.length === 0 && (
                    <p className="text-xs text-zinc-400 italic">Nenhum próximo passo extraído.</p>
                  )}
                </div>
              </div>

              {/* Transcrição e Resumo Editáveis */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-[#1A1D21]">Resumo Executivo</label>
                  <Textarea
                    rows={4}
                    value={resumo}
                    onChange={(e) => setResumo(e.target.value)}
                    className="text-xs border-[#E5E1D8]"
                    placeholder="Resumo dos tópicos discutidos..."
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-[#1A1D21]">
                    Transcrição Whisper Completa
                  </label>
                  <Textarea
                    rows={4}
                    value={transcricao}
                    onChange={(e) => setTranscricao(e.target.value)}
                    className="text-xs border-[#E5E1D8]"
                    placeholder="Texto transcrito pela IA..."
                  />
                </div>
              </div>
            </div>
          )}

          {/* ============================================================== */}
          {/* ETAPA 4: SUCESSO / CRIADO */}
          {/* ============================================================== */}
          {etapa === 'sucesso' && (
            <div className="py-8 flex flex-col items-center justify-center text-center space-y-4">
              <div className="w-14 h-14 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <div className="space-y-1">
                <h3 className="text-base font-bold text-[#1A1D21]">
                  Reunião Registrada com Sucesso!
                </h3>
                <p className="text-xs text-[#5B6470] max-w-md">
                  O evento foi criado no seu Calendário com o link da reunião, e {cardsCriadosCount}{' '}
                  tarefas foram enviadas para a coluna BACKLOG do Kanban.
                </p>
              </div>

              <div className="flex flex-wrap items-center justify-center gap-2 pt-2">
                <Button
                  asChild
                  className="bg-[#0F766E] hover:bg-[#0D5C56] text-white text-xs gap-1.5"
                >
                  <Link to="/calendario">
                    <Calendar className="w-3.5 h-3.5" />
                    <span>Ver no Calendário</span>
                  </Link>
                </Button>

                {linkReuniao && (
                  <Button
                    asChild
                    variant="outline"
                    className="text-xs border-indigo-200 text-indigo-700 hover:bg-indigo-50 gap-1.5"
                  >
                    <a href={linkReuniao} target="_blank" rel="noopener noreferrer">
                      <Video className="w-3.5 h-3.5" />
                      <span>Abrir Sala da Reunião</span>
                    </a>
                  </Button>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Rodapé com Ações */}
        <DialogFooter className="p-4 border-t border-[#E5E1D8] bg-[#FAFAF9] flex items-center justify-between">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onOpenChange(false)}
            className="text-xs text-zinc-500"
          >
            {etapa === 'sucesso' ? 'Fechar' : 'Cancelar'}
          </Button>

          {etapa === 'revisao' && (
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setEtapa('gravando')}
                className="text-xs border-zinc-200"
                disabled={salvandoTudo}
              >
                Voltar à Gravação
              </Button>

              <Button
                size="sm"
                onClick={handleConfirmarTudo}
                disabled={salvandoTudo}
                className="bg-[#0F766E] hover:bg-[#0D5C56] text-white font-semibold text-xs h-9 px-4 gap-1.5 shadow-xs"
              >
                {salvandoTudo ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Salvando Calendário & Kanban...</span>
                  </>
                ) : (
                  <>
                    <CheckSquare className="w-3.5 h-3.5" />
                    <span>Criar Evento & Enviar ao Kanban</span>
                  </>
                )}
              </Button>
            </div>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
