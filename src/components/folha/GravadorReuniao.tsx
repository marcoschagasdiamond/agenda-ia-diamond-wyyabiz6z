import { Mic, Clock, Sparkles, ArrowRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

interface GravadorReuniaoProps {
  onAbrirNovaReuniao: () => void
}

/**
 * Atalho visual para o modal "Nova Reunião" do cabeçalho da Folha.
 * Não grava nada por conta própria: todo o fluxo (gravação, transcrição
 * OpenAI/Gemini, extração de data, evento Jitsi e próximos passos no
 * BACKLOG do Kanban) acontece no modal, que pede a permissão de microfone
 * de forma proativa ao abrir.
 */
export function GravadorReuniao({ onAbrirNovaReuniao }: GravadorReuniaoProps) {
  return (
    <Card
      role="button"
      tabIndex={0}
      onClick={onAbrirNovaReuniao}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          onAbrirNovaReuniao()
        }
      }}
      title="Abrir o modal Nova Reunião"
      className="border-[#0F766E]/40 bg-gradient-to-b from-[#0F766E]/5 to-white shadow-xs overflow-hidden cursor-pointer hover:border-[#0F766E]/70 hover:shadow-sm transition-all"
    >
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
              <Badge className="bg-red-100 text-red-700 hover:bg-red-100 border-none text-[10px] font-semibold">
                IA
              </Badge>
            </div>
            <CardDescription className="text-xs text-[#5B6470]">
              Clique para abrir a Nova Reunião: grave o áudio, a IA transcreve (OpenAI ou Gemini),
              extrai data e hora, cria o evento com link de reunião Jitsi e lança os próximos passos
              no BACKLOG do Kanban.
            </CardDescription>
          </div>

          {/* Timer Display (visual mantido do gravador antigo) */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white border border-[#E5E1D8] shadow-2xs">
              <Clock className="w-4 h-4 text-[#5B6470]" />
              <span className="font-mono text-base font-bold text-[#1A1D21]">00:00</span>
            </div>
          </div>
        </div>
      </CardHeader>

      <CardContent className="pt-4 space-y-3">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-3 bg-white rounded-xl border border-[#E5E1D8]">
          <Button
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              onAbrirNovaReuniao()
            }}
            className="bg-red-600 hover:bg-red-700 text-white text-xs h-9 px-4 font-semibold shadow-xs gap-2"
          >
            <Mic className="w-4 h-4" />
            Iniciar Gravação de Reunião
          </Button>

          <span className="text-[11px] text-[#5B6470] flex items-center gap-1.5">
            <Sparkles className="w-3 h-3 text-[#0F766E]" />
            A gravação e a transcrição acontecem no modal Nova Reunião, com permissão de microfone
            pedida na hora certa.
          </span>
        </div>

        <div className="flex items-center justify-end gap-1 text-[11px] font-medium text-[#0F766E]">
          Abrir Nova Reunião
          <ArrowRight className="w-3.5 h-3.5" />
        </div>
      </CardContent>
    </Card>
  )
}
