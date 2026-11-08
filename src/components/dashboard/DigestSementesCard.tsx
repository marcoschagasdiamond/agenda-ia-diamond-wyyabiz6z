import React from 'react'
import { useNavigate } from 'react-router-dom'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Sprout, ArrowRight, Calendar, AlertCircle } from 'lucide-react'
import type { FolhaDia, TeseSemente } from '@/types'

interface DigestSementesCardProps {
  sementesMes: FolhaDia[]
  totalSementesGeral: number
  teses: TeseSemente[]
  loading?: boolean
}

export const DigestSementesCard: React.FC<DigestSementesCardProps> = ({
  sementesMes,
  totalSementesGeral,
  teses,
  loading = false,
}) => {
  const navigate = useNavigate()

  const nomeMesAtual = React.useMemo(() => {
    return new Intl.DateTimeFormat('pt-BR', { month: 'long', year: 'numeric' }).format(new Date())
  }, [])

  const mapTeses = React.useMemo(() => {
    const map = new Map<string, string>()
    teses.forEach((t) => map.set(t.id, t.nome))
    return map
  }, [teses])

  const formatarData = (iso?: string) => {
    if (!iso) return ''
    try {
      const parte = iso.slice(0, 10).split('-')
      if (parte.length === 3) {
        return `${parte[2]}/${parte[1]}/${parte[0]}`
      }
      return iso
    } catch {
      return iso
    }
  }

  return (
    <Card className="border-[#E5E1D8] bg-white shadow-xs flex flex-col">
      <CardHeader className="pb-3 border-b border-[#E5E1D8]/60 flex flex-row items-center justify-between">
        <div>
          <CardTitle className="text-sm font-semibold text-[#1A1D21] flex items-center gap-1.5">
            <span className="p-1 rounded-md bg-emerald-100 text-emerald-800">
              <Sprout className="w-4 h-4 text-emerald-700" />
            </span>
            <span>Digest de Sementes 🌱</span>
            <span className="text-[11px] font-normal text-stone-500 capitalize">
              • {nomeMesAtual}
            </span>
          </CardTitle>
          <CardDescription className="text-[11px] text-[#5B6470] mt-0.5">
            {sementesMes.length > 0
              ? `${sementesMes.length} ${
                  sementesMes.length === 1 ? 'semente completa' : 'sementes completam'
                } a revisão este mês — vale revisar?`
              : 'Oportunidades e negócios arquivados para germinar'}
          </CardDescription>
        </div>
        <div className="flex items-center gap-2">
          {sementesMes.length > 0 && (
            <Badge className="bg-emerald-700 hover:bg-emerald-800 text-white text-[10px] font-semibold px-2 py-0.5">
              {sementesMes.length} para revisar
            </Badge>
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate('/folha')}
            className="text-xs text-emerald-800 hover:text-emerald-900 hover:bg-emerald-50 h-7 px-2 font-medium"
          >
            Ver Cofre
            <ArrowRight className="w-3 h-3 ml-1" />
          </Button>
        </div>
      </CardHeader>

      <CardContent className="p-4 space-y-3 flex-1 overflow-y-auto max-h-[380px]">
        {loading ? (
          <div className="py-8 text-center text-xs text-stone-500">
            Carregando digest de sementes...
          </div>
        ) : sementesMes.length > 0 ? (
          <div className="space-y-2.5">
            {sementesMes.map((semente) => {
              const nomeTese = semente.tese_semente
                ? mapTeses.get(semente.tese_semente) || 'Tese vinculada'
                : null

              return (
                <div
                  key={semente.id}
                  onClick={() => navigate(`/folha?destaque=${semente.id}`)}
                  className="p-3 rounded-lg border border-emerald-200/80 bg-emerald-50/40 hover:bg-emerald-100/50 hover:border-emerald-400 transition-all cursor-pointer group shadow-2xs"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap mb-1">
                        {nomeTese ? (
                          <Badge
                            variant="outline"
                            className="text-[10px] bg-white border-emerald-300 text-emerald-900 font-medium px-1.5 py-0"
                          >
                            Tese: {nomeTese}
                          </Badge>
                        ) : (
                          <Badge
                            variant="outline"
                            className="text-[10px] bg-white border-stone-200 text-stone-600 font-medium px-1.5 py-0"
                          >
                            Sem tese
                          </Badge>
                        )}

                        {semente.data_revisao_semente && (
                          <span className="text-[10px] text-emerald-800 font-semibold flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            Revisão: {formatarData(semente.data_revisao_semente)}
                          </span>
                        )}
                      </div>

                      <h4 className="text-xs font-semibold text-[#1A1D21] group-hover:text-emerald-900 line-clamp-2 leading-snug">
                        {semente.registro}
                      </h4>
                    </div>

                    <ArrowRight className="w-4 h-4 text-emerald-700 opacity-60 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all shrink-0 mt-0.5" />
                  </div>

                  {semente.condicao_reativacao && (
                    <div className="mt-2 pt-2 border-t border-emerald-200/60 flex items-start gap-1.5 text-[11px] text-emerald-900/90 bg-white/70 p-2 rounded">
                      <AlertCircle className="w-3.5 h-3.5 text-emerald-700 shrink-0 mt-0.5" />
                      <div className="min-w-0">
                        <span className="font-semibold text-[10px] uppercase tracking-wider text-emerald-800 block">
                          Condição de reativação:
                        </span>
                        <p className="line-clamp-2 text-stone-700 italic">
                          "{semente.condicao_reativacao}"
                        </p>
                      </div>
                    </div>
                  )}

                  {semente.expand?.contato && (
                    <div className="mt-1.5 text-[10px] text-stone-500 flex items-center gap-1">
                      <span>Contato vinculado:</span>
                      <strong className="text-stone-700">{semente.expand.contato.nome}</strong>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        ) : (
          <div className="text-center py-8 px-4 text-xs text-[#5B6470] space-y-2.5">
            <div className="w-10 h-10 rounded-full bg-emerald-100 text-emerald-800 flex items-center justify-center mx-auto">
              <Sprout className="w-5 h-5 text-emerald-700" />
            </div>
            <p className="font-semibold text-xs text-[#1A1D21]">
              Nenhuma semente completando revisão neste mês ({nomeMesAtual}).
            </p>
            <p className="text-[11px] text-stone-500 max-w-sm mx-auto">
              {totalSementesGeral > 0
                ? `Você tem ${totalSementesGeral} ${
                    totalSementesGeral === 1 ? 'semente' : 'sementes'
                  } arquivadas no cofre germinando para os próximos meses.`
                : 'Quando arquivar um assunto ou oportunidade que hoje não faz sentido, ele aparecerá aqui quando a data de revisão chegar.'}
            </p>
            <Button
              size="sm"
              variant="outline"
              onClick={() => navigate('/folha')}
              className="text-xs text-emerald-800 border-emerald-200 hover:bg-emerald-50 h-7"
            >
              Abrir Folha e Consultar Sementes
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
