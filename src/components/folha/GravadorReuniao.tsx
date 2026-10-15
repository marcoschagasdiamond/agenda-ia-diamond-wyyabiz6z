import { useState } from 'react'
import {
  Mic,
  Square,
  Pause,
  Play,
  RotateCcw,
  Sparkles,
  Layers,
  FolderGit2,
  CalendarDays,
  UserCheck,
  Plus,
  Radio,
  FileText,
  Volume2,
  Info,
  Clock,
  Loader2,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { useAudioRecorder } from '@/hooks/use-audio-recorder'
import { useToast } from '@/hooks/use-toast'
import { diamondApi } from '@/services/diamondApi'
import type { Projeto, Contato, ColunaFluxo, MarcoTimeline, FolhaDia } from '@/types'

interface GravadorReuniaoProps {
  projetos: Projeto[]
  contatos: Contato[]
  colunasFluxo: ColunaFluxo[]
  marcosTimeline: MarcoTimeline[]
  onReuniaoCriada: (novaFolha: FolhaDia) => void
  onAbrirCriarProjeto: () => void
  onAbrirCriarContato: () => void
  onAbrirCriarFluxo: () => void
  onAbrirCriarTimeline: () => void
}

export function GravadorReuniao({
  projetos,
  contatos,
  colunasFluxo,
  marcosTimeline,
  onReuniaoCriada,
  onAbrirCriarProjeto,
  onAbrirCriarContato,
  onAbrirCriarFluxo,
  onAbrirCriarTimeline,
}: GravadorReuniaoProps) {
  const { toast } = useToast()
  const {
    gravando,
    pausado,
    tempoSegundos,
    audioBlob,
    audioUrl,
    transcricaoParcial,
    suportaSpeech,
    iniciarGravacao,
    pausarGravacao,
    retomarGravacao,
    pararGravacao,
    descartarGravacao,
    setTranscricaoParcial,
    erroGravacao,
  } = useAudioRecorder()

  const [titulo, setTitulo] = useState('')
  const [notasAdicionais, setNotasAdicionais] = useState('')
  const [projetoId, setProjetoId] = useState('none')
  const [contatoId, setContatoId] = useState('none')
  const [fluxo, setFluxo] = useState('novo')
  const [timeline, setTimeline] = useState('')
  const [salvandoEOrganizando, setSalvandoEOrganizando] = useState(false)
  const [gravacaoFinalizada, setGravacaoFinalizada] = useState(false)

  // Formata tempo (mm:ss)
  const formatarTempo = (totalSec: number) => {
    const mins = Math.floor(totalSec / 60)
    const secs = totalSec % 60
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }

  const handleComecar = async () => {
    try {
      setGravacaoFinalizada(false)
      await iniciarGravacao()
      toast({
        title: 'Gravação iniciada',
        description: 'Microfone ativo. Fale normalmente durante a reunião.',
      })
    } catch (err: any) {
      toast({
        title: 'Erro ao iniciar gravação',
        description: err.message,
        variant: 'destructive',
      })
    }
  }

  const handleParar = async () => {
    const blob = await pararGravacao()
    setGravacaoFinalizada(true)
    if (blob) {
      toast({
        title: 'Gravação concluída!',
        description: `Áudio capturado (${formatarTempo(tempoSegundos)}). Revise os vínculos e clique em "Salvar & Organizar com IA".`,
      })
    }
  }

  const handleDescartar = () => {
    if (window.confirm('Deseja realmente descartar esta gravação?')) {
      descartarGravacao()
      setGravacaoFinalizada(false)
      setTitulo('')
      setNotasAdicionais('')
      toast({ title: 'Gravação descartada' })
    }
  }

  const handleSalvarEOrganizar = async () => {
    if (!audioBlob && !audioUrl && !gravacaoFinalizada) {
      toast({
        title: 'Nenhuma gravação ativa',
        description: 'Grave o áudio da reunião antes de salvar.',
        variant: 'destructive',
      })
      return
    }

    setSalvandoEOrganizando(true)
    try {
      const agora = new Date()
      const dataHoje = agora.toISOString().split('T')[0]
      const dataHoraIso = agora.toISOString().slice(0, 16)

      const tituloFinal =
        titulo.trim() ||
        `Reunião Gravada - ${agora.toLocaleDateString('pt-BR')} ${agora.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`

      const textoRegistro = [
        `🎙️ REUNIÃO GRAVADA: ${tituloFinal}`,
        `Duração: ${formatarTempo(tempoSegundos)}`,
        transcricaoParcial.trim()
          ? `\nTranscrição Capturada:\n${transcricaoParcial.trim()}`
          : '\n[Áudio registrado — aguardando transcrição e síntese]',
        notasAdicionais.trim() ? `\nNotas complementares:\n${notasAdicionais.trim()}` : '',
      ]
        .filter(Boolean)
        .join('\n')

      const statusTranscricao = transcricaoParcial.trim() ? 'processado' : 'aguardando'

      // Prepara o FormData para upload do arquivo de áudio e dados da folha
      const formData = new FormData()
      formData.append('data', dataHoje)
      formData.append('data_hora', dataHoraIso)
      formData.append('registro', textoRegistro)
      formData.append('tipo_origem', 'manual')
      formData.append('origem_ref', `Gravador Folha (${formatarTempo(tempoSegundos)})`)
      formData.append('status', 'pendente')
      formData.append('is_reuniao', 'true')
      formData.append('duracao_gravacao', String(tempoSegundos))
      formData.append('status_transcricao', statusTranscricao)

      if (fluxo && fluxo !== 'none') formData.append('fluxo', fluxo)
      if (projetoId && projetoId !== 'none') formData.append('projeto', projetoId)
      if (contatoId && contatoId !== 'none') formData.append('contato', contatoId)
      if (timeline && timeline.trim()) formData.append('timeline', timeline.trim())

      if (audioBlob) {
        const extensao = audioBlob.type.includes('mp4')
          ? 'mp4'
          : audioBlob.type.includes('ogg')
            ? 'ogg'
            : 'webm'
        const audioFile = new File([audioBlob], `reuniao_${Date.now()}.${extensao}`, {
          type: audioBlob.type || 'audio/webm',
        })
        formData.append('audio_gravacao', audioFile)
      }

      // 1. Cria o registro na folha_dia com o arquivo de áudio
      const folhaCriada = await diamondApi.createFolhaDia(formData)

      // 2. Aciona a IA nativa para organizar a reunião gravada
      try {
        const organizacao = await diamondApi.organizarReuniao({
          folha_id: folhaCriada.id,
          titulo: tituloFinal,
          texto_transcricao: (transcricaoParcial + '\n' + notasAdicionais).trim(),
          projeto_id: projetoId !== 'none' ? projetoId : undefined,
          contato_id: contatoId !== 'none' ? contatoId : undefined,
        })

        if (organizacao?.ata) {
          folhaCriada.ata_organizada = organizacao.ata
          folhaCriada.status_transcricao = 'processado'
        }
      } catch (aiErr: any) {
        console.warn('Organização automática de reunião via IA em segundo plano:', aiErr)
      }

      toast({
        title: 'Reunião gravada e lançada na Folha!',
        description: 'O áudio foi salvo e a reunião organizada como assunto da Folha do Dia.',
      })

      onReuniaoCriada(folhaCriada)

      // Limpa os dados do gravador
      descartarGravacao()
      setGravacaoFinalizada(false)
      setTitulo('')
      setNotasAdicionais('')
    } catch (err: any) {
      toast({
        title: 'Erro ao salvar reunião',
        description: err.message || 'Falha ao salvar áudio na folha.',
        variant: 'destructive',
      })
    } finally {
      setSalvandoEOrganizando(false)
    }
  }

  return (
    <Card className="border-[#0F766E]/40 bg-gradient-to-b from-[#0F766E]/5 to-white shadow-xs overflow-hidden">
      <CardHeader className="pb-3 border-b border-[#E5E1D8]/60">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="flex items-center justify-center w-7 h-7 rounded-lg bg-[#0F766E] text-white">
                <Mic className="w-4 h-4" />
              </span>
              <CardTitle className="text-sm font-bold text-[#1A1D21] flex items-center gap-2">
                Gravador de Reuniões da Folha
              </CardTitle>
              {gravando && (
                <Badge className="bg-red-600 text-white animate-pulse border-none text-[10px] font-semibold gap-1">
                  <Radio className="w-3 h-3 animate-spin" />
                  GRAVANDO
                </Badge>
              )}
              {pausado && (
                <Badge className="bg-amber-500 text-white border-none text-[10px] font-semibold">
                  PAUSADO
                </Badge>
              )}
              {gravacaoFinalizada && !gravando && (
                <Badge className="bg-emerald-600 text-white border-none text-[10px] font-semibold">
                  ÁUDIO PRONTO
                </Badge>
              )}
            </div>
            <CardDescription className="text-xs text-[#5B6470]">
              Grave reuniões completas direto no navegador. O áudio é salvo na folha e a IA organiza
              o resumo executivo, tópicos, decisões e demandas.
            </CardDescription>
          </div>

          {/* Timer Display */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white border border-[#E5E1D8] shadow-2xs">
              <Clock
                className={`w-4 h-4 ${gravando ? 'text-red-600 animate-pulse' : 'text-[#5B6470]'}`}
              />
              <span className="font-mono text-base font-bold text-[#1A1D21]">
                {formatarTempo(tempoSegundos)}
              </span>
            </div>
          </div>
        </div>
      </CardHeader>

      <CardContent className="pt-4 space-y-4">
        {erroGravacao && (
          <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-xs text-red-700 flex items-start gap-2">
            <Info className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
            <span>{erroGravacao}</span>
          </div>
        )}

        {/* Controles Principais de Gravação */}
        <div className="flex flex-wrap items-center gap-2 p-3 bg-white rounded-xl border border-[#E5E1D8]">
          {!gravando && !gravacaoFinalizada && (
            <Button
              type="button"
              onClick={handleComecar}
              className="bg-red-600 hover:bg-red-700 text-white text-xs h-9 px-4 font-semibold shadow-xs gap-2"
            >
              <Mic className="w-4 h-4" />
              Iniciar Gravação de Reunião
            </Button>
          )}

          {gravando && !pausado && (
            <>
              <Button
                type="button"
                variant="outline"
                onClick={pausarGravacao}
                className="text-xs h-9 px-3 text-[#1A1D21] border-[#E5E1D8] gap-1.5"
              >
                <Pause className="w-4 h-4 text-amber-600" />
                Pausar
              </Button>
              <Button
                type="button"
                onClick={handleParar}
                className="bg-[#0F766E] hover:bg-[#0D5C56] text-white text-xs h-9 px-4 font-semibold shadow-xs gap-2"
              >
                <Square className="w-4 h-4 fill-white" />
                Concluir Reunião
              </Button>
            </>
          )}

          {gravando && pausado && (
            <>
              <Button
                type="button"
                onClick={retomarGravacao}
                className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs h-9 px-3 gap-1.5"
              >
                <Play className="w-4 h-4" />
                Continuar
              </Button>
              <Button
                type="button"
                onClick={handleParar}
                className="bg-[#0F766E] hover:bg-[#0D5C56] text-white text-xs h-9 px-4 font-semibold shadow-xs gap-2"
              >
                <Square className="w-4 h-4 fill-white" />
                Concluir Reunião
              </Button>
            </>
          )}

          {(gravando || gravacaoFinalizada) && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleDescartar}
              className="text-xs h-9 px-3 text-[#5B6470] hover:text-red-600 gap-1.5"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Descartar
            </Button>
          )}

          {/* Áudio Player de Preview */}
          {audioUrl && (
            <div className="flex items-center gap-2 ml-auto w-full sm:w-auto pt-2 sm:pt-0 border-t sm:border-t-0 border-[#E5E1D8]">
              <Volume2 className="w-4 h-4 text-[#0F766E] shrink-0" />
              <audio src={audioUrl} controls className="h-8 max-w-full sm:max-w-xs" />
            </div>
          )}
        </div>

        {/* Metadados e Vínculos da Reunião */}
        <div className="space-y-3 p-3.5 rounded-xl border border-[#E5E1D8] bg-white">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-[11px] font-semibold text-[#5B6470] block mb-1">
                Pauta / Título da Reunião
              </label>
              <Input
                placeholder="Ex: Alinhamento Estratégico com Cliente X"
                value={titulo}
                onChange={(e) => setTitulo(e.target.value)}
                className="text-xs h-8 bg-white border-[#E5E1D8]"
              />
            </div>

            <div>
              <label className="text-[11px] font-semibold text-[#5B6470] block mb-1">
                Notas / Pontos-chave adicionais
              </label>
              <Input
                placeholder="Ex: Definido orçamento de R$ 25k, entrega em 15 dias"
                value={notasAdicionais}
                onChange={(e) => setNotasAdicionais(e.target.value)}
                className="text-xs h-8 bg-white border-[#E5E1D8]"
              />
            </div>
          </div>

          {/* Vínculos: Fluxo, Projeto, Timeline, Contato */}
          <div className="pt-2 border-t border-[#E5E1D8]/60">
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#0F766E] block mb-2">
              Vínculos da Reunião (Opcionais)
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
              {/* Fluxo */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-[11px] font-semibold text-[#5B6470] flex items-center gap-1">
                    <Layers className="w-3 h-3 text-[#0F766E]" />
                    Fluxo
                  </label>
                  <button
                    type="button"
                    onClick={onAbrirCriarFluxo}
                    className="text-[10px] font-medium text-[#0F766E] hover:underline flex items-center gap-0.5"
                  >
                    <Plus className="w-3 h-3" />
                    Criar
                  </button>
                </div>
                <Select value={fluxo} onValueChange={setFluxo}>
                  <SelectTrigger className="text-xs h-8 bg-white border-[#E5E1D8]">
                    <SelectValue placeholder="Automático (IA)" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Automático (Deixar para IA)</SelectItem>
                    {colunasFluxo.map((col) => (
                      <SelectItem key={col.id || col.chave} value={col.chave}>
                        {col.titulo}
                      </SelectItem>
                    ))}
                    {!colunasFluxo.some((c) => c.chave === 'novo') && (
                      <SelectItem value="novo">Novo / Triagem</SelectItem>
                    )}
                    {!colunasFluxo.some((c) => c.chave === 'em_andamento') && (
                      <SelectItem value="em_andamento">Em Andamento</SelectItem>
                    )}
                  </SelectContent>
                </Select>
              </div>

              {/* Projeto */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-[11px] font-semibold text-[#5B6470] flex items-center gap-1">
                    <FolderGit2 className="w-3 h-3 text-[#0F766E]" />
                    Projeto
                  </label>
                  <button
                    type="button"
                    onClick={onAbrirCriarProjeto}
                    className="text-[10px] font-medium text-[#0F766E] hover:underline flex items-center gap-0.5"
                  >
                    <Plus className="w-3 h-3" />
                    Criar
                  </button>
                </div>
                <Select value={projetoId} onValueChange={setProjetoId}>
                  <SelectTrigger className="text-xs h-8 bg-white border-[#E5E1D8]">
                    <SelectValue placeholder="Automático (IA)" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Automático (Deixar para IA)</SelectItem>
                    {projetos.map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.nome}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Timeline */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-[11px] font-semibold text-[#5B6470] flex items-center gap-1">
                    <CalendarDays className="w-3 h-3 text-[#0F766E]" />
                    Timeline
                  </label>
                  <button
                    type="button"
                    onClick={onAbrirCriarTimeline}
                    className="text-[10px] font-medium text-[#0F766E] hover:underline flex items-center gap-0.5"
                  >
                    <Plus className="w-3 h-3" />
                    Criar
                  </button>
                </div>
                <Select
                  value={timeline || '__empty__'}
                  onValueChange={(v) => setTimeline(v === '__empty__' ? '' : v)}
                >
                  <SelectTrigger className="text-xs h-8 bg-white border-[#E5E1D8]">
                    <SelectValue placeholder="Nenhum (Livre)" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__empty__">Nenhum (Livre)</SelectItem>
                    {marcosTimeline.map((m) => (
                      <SelectItem key={m.id} value={m.nome}>
                        ⏳ {m.nome}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Contato */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-[11px] font-semibold text-[#5B6470] flex items-center gap-1">
                    <UserCheck className="w-3 h-3 text-[#0F766E]" />
                    Contato
                  </label>
                  <button
                    type="button"
                    onClick={onAbrirCriarContato}
                    className="text-[10px] font-medium text-[#0F766E] hover:underline flex items-center gap-0.5"
                  >
                    <Plus className="w-3 h-3" />
                    Criar
                  </button>
                </div>
                <Select value={contatoId} onValueChange={setContatoId}>
                  <SelectTrigger className="text-xs h-8 bg-white border-[#E5E1D8]">
                    <SelectValue placeholder="Automático (IA)" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Automático (Deixar para IA)</SelectItem>
                    {contatos.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.nome} {c.empresa ? `(${c.empresa})` : ''}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        </div>

        {/* Transcrição e Notas ao Vivo */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-[11px] font-semibold text-[#5B6470] flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5 text-[#0F766E]" />
              Transcrição / Anotações da Reunião
            </label>
            <span className="text-[10px] text-[#5B6470]">
              {suportaSpeech
                ? 'Transcrição em tempo real ativa pelo navegador'
                : 'Transcrição direta ou anotações manuais'}
            </span>
          </div>

          <Textarea
            rows={3}
            placeholder={
              suportaSpeech
                ? 'A transcrição automática da reunião pelo navegador aparecerá aqui conforme você fala, ou você pode complementar/editar...'
                : 'Insira os pontos conversados ou cole a transcrição aqui para a IA organizar a reunião...'
            }
            value={transcricaoParcial}
            onChange={(e) => setTranscricaoParcial(e.target.value)}
            className="text-xs bg-white border-[#E5E1D8] resize-none focus-visible:ring-1 focus-visible:ring-[#0F766E]"
          />
        </div>

        {/* Botão de Finalização & Organização */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-2 pt-2 border-t border-[#E5E1D8]">
          <span className="text-[11px] text-[#5B6470] flex items-center gap-1">
            <Info className="w-3 h-3 text-[#0F766E]" />
            A reunião é salva como assunto numerado na Folha e a IA estrutura ata e demandas.
          </span>

          <Button
            type="button"
            disabled={(!audioBlob && !gravacaoFinalizada) || salvandoEOrganizando}
            onClick={handleSalvarEOrganizar}
            className="bg-[#0F766E] hover:bg-[#0D5C56] text-white text-xs h-9 px-5 font-semibold shadow-xs gap-2 w-full sm:w-auto"
          >
            {salvandoEOrganizando ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                Salvando & Organizando com IA...
              </>
            ) : (
              <>
                <Sparkles className="w-3.5 h-3.5" />
                Salvar & Organizar Reunião com IA
              </>
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
