import { useEffect, useState } from 'react'
import { Loader2, RefreshCw, Database, CalendarDays, Share2, Search } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useToast } from '@/hooks/use-toast'
import { cn } from '@/lib/utils'
import {
  obterEstadoMemoria,
  consolidarMemoriaAgora,
  type EstadoMemoria,
} from '@/services/dossiesMemoria'

export function formatarDataHora(valor?: string): string {
  if (!valor) return '—'
  const d = new Date(valor)
  if (isNaN(d.getTime())) return '—'
  return d.toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

interface PainelEstadoMemoriaProps {
  /** Chamado após uma consolidação bem-sucedida (ex.: recarregar a lista de dossiês) */
  onConsolidado?: () => void
}

export default function PainelEstadoMemoria({ onConsolidado }: PainelEstadoMemoriaProps) {
  const { toast } = useToast()
  const [estado, setEstado] = useState<EstadoMemoria | null>(null)
  const [carregando, setCarregando] = useState(true)
  const [consolidando, setConsolidando] = useState(false)

  const carregar = async () => {
    try {
      const e = await obterEstadoMemoria()
      setEstado(e)
    } catch {
      setEstado(null)
    } finally {
      setCarregando(false)
    }
  }

  useEffect(() => {
    carregar()
  }, [])

  const consolidar = async () => {
    setConsolidando(true)
    try {
      const r = await consolidarMemoriaAgora()
      if (r && r.sucesso) {
        toast({
          title: 'Consolidação concluída',
          description:
            r.mensagem ||
            `Dossiês: ${r.dossies_novos || 0} novo(s), ${r.dossies_atualizados || 0} atualizado(s).`,
        })
        await carregar()
        onConsolidado?.()
      } else {
        toast({
          title: 'Falha na consolidação',
          description: r?.error || 'Não foi possível consolidar agora.',
          variant: 'destructive',
        })
      }
    } catch (err: unknown) {
      const mensagem =
        err && typeof err === 'object' && 'message' in err
          ? String((err as { message?: unknown }).message)
          : ''
      toast({
        title: 'Falha na consolidação',
        description: mensagem || 'Não foi possível consolidar agora.',
        variant: 'destructive',
      })
    } finally {
      setConsolidando(false)
    }
  }

  const camadas = [
    {
      chave: 'dossies',
      titulo: 'Dossiês consolidados',
      icone: Database,
      total: estado?.dossies?.total ?? 0,
      detalhe: 'Última atualização',
      quando: estado?.dossies?.ultima_consolidacao || '',
      extra:
        estado && estado.dossies.pendentes_fila > 0
          ? `${estado.dossies.pendentes_fila} na fila de consolidação`
          : 'Fila em dia',
    },
    {
      chave: 'episodios',
      titulo: 'Episódios (linha do tempo)',
      icone: CalendarDays,
      total: estado?.episodios?.total ?? 0,
      detalhe: 'Último episódio',
      quando: estado?.episodios?.ultimo_created || '',
      extra:
        estado?.episodios?.ultimo_data && estado.episodios.ultimo_data
          ? `Dia ${String(estado.episodios.ultimo_data).slice(0, 10)}`
          : '',
    },
    {
      chave: 'compartilhada',
      titulo: 'Memória compartilhada',
      icone: Share2,
      total: estado?.memoria_compartilhada?.total ?? 0,
      detalhe: 'Última atualização',
      quando: estado?.memoria_compartilhada?.ultima_atualizacao || '',
      extra: (estado?.memoria_compartilhada?.por_agente || [])
        .slice(0, 2)
        .map((a) => `${a.rotulo}: ${a.total}`)
        .join(' · '),
    },
    {
      chave: 'busca',
      titulo: 'Busca semântica',
      icone: Search,
      total: null,
      detalhe: 'Modo',
      quando: estado?.busca_semantica?.modo || '2 etapas',
      extra: estado?.busca_semantica?.descricao || '',
    },
  ]

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
        <div>
          <CardTitle className="text-base">Estado da Memória</CardTitle>
          <p className="text-sm text-muted-foreground">
            As 4 camadas de memória do Agenda IA Diamond e seus totais reais.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={carregar}
            disabled={carregando || consolidando}
          >
            <RefreshCw className={cn('h-4 w-4 mr-1', carregando && 'animate-spin')} />
            Atualizar
          </Button>
          <Button size="sm" onClick={consolidar} disabled={consolidando || carregando}>
            {consolidando ? (
              <Loader2 className="h-4 w-4 mr-1 animate-spin" />
            ) : (
              <Database className="h-4 w-4 mr-1" />
            )}
            Consolidar agora
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {carregando ? (
          <div className="flex items-center justify-center py-8 text-muted-foreground">
            <Loader2 className="h-5 w-5 mr-2 animate-spin" />
            Carregando estado da memória…
          </div>
        ) : !estado ? (
          <div className="py-8 text-center text-sm text-muted-foreground">
            Não foi possível carregar o estado da memória agora. Tente atualizar.
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {camadas.map((c) => {
              const Icone = c.icone
              return (
                <div key={c.chave} className="rounded-lg border bg-card p-4 flex flex-col gap-2">
                  <div className="flex items-center gap-2">
                    <span className="flex h-8 w-8 items-center justify-center rounded-md bg-muted">
                      <Icone className="h-4 w-4 text-muted-foreground" />
                    </span>
                    <span className="text-sm font-medium leading-tight">{c.titulo}</span>
                  </div>
                  <div className="text-2xl font-semibold tabular-nums">
                    {c.total === null ? c.quando : c.total}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {c.total === null ? c.extra : `${c.detalhe}: ${formatarDataHora(c.quando)}`}
                  </div>
                  {c.total !== null && c.extra ? (
                    <Badge variant="secondary" className="w-fit text-[11px] font-normal">
                      {c.extra}
                    </Badge>
                  ) : null}
                </div>
              )
            })}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
