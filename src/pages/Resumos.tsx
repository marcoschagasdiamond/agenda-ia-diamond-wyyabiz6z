import React, { useState, useEffect } from 'react'
import { diamondApi } from '@/services/diamondApi'
import type { ResumoDia } from '@/types'
import {
  History,
  Calendar,
  Sparkles,
  ArrowRight,
  RefreshCw,
  Loader2,
  CheckCircle2,
  Clock,
  Layers,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { useToast } from '@/hooks/use-toast'

export default function Resumos() {
  const { toast } = useToast()
  const [resumos, setResumos] = useState<ResumoDia[]>([])
  const [loading, setLoading] = useState(true)
  const [consolidando, setConsolidando] = useState(false)

  const carregar = async () => {
    try {
      const r = await diamondApi.listResumos()
      setResumos(r)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    carregar()
  }, [])

  const handleConsolidarSemana = async () => {
    setConsolidando(true)
    try {
      await diamondApi.consolidarSemana()
      toast({
        title: 'Consolidação Concluída!',
        description: 'Os resumos dos últimos dias foram acumulados na memória contínua.',
      })
      await carregar()
    } catch (err) {
      toast({
        title: 'Erro ao consolidar',
        description: (err as Error)?.message,
        variant: 'destructive',
      })
    } finally {
      setConsolidando(false)
    }
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-xl border border-[#E5E1D8] shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl md:text-2xl font-bold tracking-tight text-[#1A1D21]">
              Histórico de Resumos & Memória
            </h1>
            <Badge className="bg-[#0F766E]/10 text-[#0F766E] border-none text-[11px] font-semibold">
              Segundo Cérebro
            </Badge>
          </div>
          <p className="text-xs text-[#5B6470] mt-1">
            Resumos diários gerados ao fim de cada sessão e consolidação semanal persistente por
            semanas e meses.
          </p>
        </div>

        <Button
          onClick={handleConsolidarSemana}
          disabled={consolidando}
          className="bg-[#0F766E] hover:bg-[#0D5C56] text-white text-xs h-9 px-4 font-medium shadow-sm gap-2"
        >
          {consolidando ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Consolidando Memória...
            </>
          ) : (
            <>
              <Sparkles className="w-4 h-4" />
              Consolidar Semana Agora
            </>
          )}
        </Button>
      </div>

      {/* Lista de Resumos */}
      <div className="space-y-4">
        {resumos.map((resumo) => {
          const isSemanal = resumo.feito?.includes('[CONSOLIDAÇÃO SEMANAL]')

          return (
            <Card
              key={resumo.id}
              className={`border bg-white shadow-xs ${
                isSemanal ? 'border-[#0F766E] ring-1 ring-[#0F766E]/20' : 'border-[#E5E1D8]'
              }`}
            >
              <CardHeader className="pb-3 border-b border-[#E5E1D8]/60 flex flex-row items-center justify-between">
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-[#0F766E]" />
                  <CardTitle className="text-sm font-bold text-[#1A1D21]">{resumo.data}</CardTitle>
                  {isSemanal && (
                    <Badge className="bg-[#0F766E] text-white text-[10px]">
                      Consolidação Semanal
                    </Badge>
                  )}
                </div>
                {resumo.contagem_cards_criados ? (
                  <span className="text-[11px] text-[#5B6470]">
                    {resumo.contagem_cards_criados} card(s) estruturado(s)
                  </span>
                ) : null}
              </CardHeader>

              <CardContent className="p-4 space-y-4 text-xs">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {resumo.feito && (
                    <div className="space-y-1">
                      <span className="font-bold text-[#1A1D21] uppercase tracking-wider text-[10px] block">
                        ✅ O que foi feito:
                      </span>
                      <p className="text-[#5B6470] whitespace-pre-line leading-relaxed bg-[#F4F2EE]/40 p-2.5 rounded border border-[#E5E1D8]/60">
                        {resumo.feito}
                      </p>
                    </div>
                  )}

                  {resumo.a_fazer && (
                    <div className="space-y-1">
                      <span className="font-bold text-[#1A1D21] uppercase tracking-wider text-[10px] block">
                        📋 O que precisa ser feito:
                      </span>
                      <p className="text-[#5B6470] whitespace-pre-line leading-relaxed bg-[#F4F2EE]/40 p-2.5 rounded border border-[#E5E1D8]/60">
                        {resumo.a_fazer}
                      </p>
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-1">
                  {resumo.prioridades && (
                    <div className="space-y-1">
                      <span className="font-bold text-[#DC2626] uppercase tracking-wider text-[10px] block">
                        🎯 Prioridades:
                      </span>
                      <p className="text-[#5B6470] whitespace-pre-line bg-[#F4F2EE]/40 p-2 rounded border border-[#E5E1D8]/60">
                        {resumo.prioridades}
                      </p>
                    </div>
                  )}

                  {resumo.decisoes && (
                    <div className="space-y-1">
                      <span className="font-bold text-[#0F766E] uppercase tracking-wider text-[10px] block">
                        💡 Decisões Tomadas:
                      </span>
                      <p className="text-[#5B6470] whitespace-pre-line bg-[#F4F2EE]/40 p-2 rounded border border-[#E5E1D8]/60">
                        {resumo.decisoes}
                      </p>
                    </div>
                  )}

                  {resumo.proximos_passos && (
                    <div className="space-y-1">
                      <span className="font-bold text-[#D97706] uppercase tracking-wider text-[10px] block">
                        🚀 Próximos Passos:
                      </span>
                      <p className="text-[#5B6470] whitespace-pre-line bg-[#F4F2EE]/40 p-2 rounded border border-[#E5E1D8]/60">
                        {resumo.proximos_passos}
                      </p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )
        })}

        {resumos.length === 0 && !loading && (
          <div className="py-12 text-center text-xs text-[#5B6470] bg-white rounded-xl border border-[#E5E1D8]">
            Nenhum resumo gerado. Finalize uma sessão na Folha do Dia para gerar o primeiro resumo.
          </div>
        )}
      </div>
    </div>
  )
}
