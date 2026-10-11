import React, { useState, useEffect } from 'react'
import { useAuth } from '@/hooks/use-auth'
import { diamondApi } from '@/services/diamondApi'
import type { Projeto, Card as CardType, Demanda } from '@/types'
import {
  FolderKanban,
  CheckSquare,
  Clock,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { useToast } from '@/hooks/use-toast'

export default function PortalCliente() {
  const { user, clienteProfile } = useAuth()
  const { toast } = useToast()

  const [projetos, setProjetos] = useState<Projeto[]>([])
  const [cards, setCards] = useState<CardType[]>([])
  const [demandas, setDemandas] = useState<Demanda[]>([])
  const [loading, setLoading] = useState(true)

  const carregar = async () => {
    try {
      const [p, c, d] = await Promise.all([
        diamondApi.listProjetos(),
        diamondApi.listCards(),
        diamondApi.listDemandas(),
      ])
      setProjetos(p)
      setCards(c)
      setDemandas(d)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    carregar()
  }, [])

  const handleConcluirDemanda = async (demanda: Demanda) => {
    const novoStatus = demanda.status === 'pendente' ? 'concluido' : 'pendente'
    try {
      await diamondApi.updateDemanda(demanda.id, { status: novoStatus })
      setDemandas((prev) =>
        prev.map((d) => (d.id === demanda.id ? { ...d, status: novoStatus } : d)),
      )
      toast({ title: `Entrega marcada como ${novoStatus}` })
    } catch {
      toast({ title: 'Erro ao atualizar entrega', variant: 'destructive' })
    }
  }

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-xl border border-[#E5E1D8] shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl md:text-2xl font-bold tracking-tight text-[#1A1D21]">
              Portal do Cliente: {clienteProfile?.empresa || user?.name}
            </h1>
            <Badge className="bg-amber-50 text-amber-800 border-amber-200 text-[10px] font-semibold">
              Área Exclusiva
            </Badge>
          </div>
          <p className="text-xs text-[#5B6470] mt-1">
            Acompanhe o andamento das entregas, cards e status dos projetos compartilhados com você.
          </p>
        </div>
      </div>

      {/* Projetos Compartilhados */}
      <div className="space-y-3">
        <h2 className="text-xs font-bold text-[#5B6470] uppercase tracking-wider flex items-center gap-2">
          <FolderKanban className="w-4 h-4 text-[#0F766E]" />
          Seus Projetos em Andamento ({projetos.length})
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {projetos.map((proj) => (
            <Card key={proj.id} className="border-[#E5E1D8] bg-white shadow-xs">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between mb-1">
                  <Badge variant="outline" className="text-[10px] capitalize">
                    {proj.tipo}
                  </Badge>
                  <Badge className="bg-emerald-50 text-emerald-700 text-[10px]">
                    {proj.status}
                  </Badge>
                </div>
                <CardTitle className="text-base font-bold text-[#1A1D21]">{proj.nome}</CardTitle>
                {proj.descricao && (
                  <CardDescription className="text-xs text-[#5B6470]">
                    {proj.descricao}
                  </CardDescription>
                )}
              </CardHeader>
              <CardContent className="space-y-2 text-xs">
                {proj.contexto_resumido && (
                  <div className="bg-[#F4F2EE]/50 p-2.5 rounded border border-[#E5E1D8] text-[11px] text-[#5B6470]">
                    <span className="font-semibold text-[#0F766E] block mb-1">
                      Última Atualização de Estado:
                    </span>
                    {proj.contexto_resumido}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Demandas e Entregas para o Cliente */}
      <Card className="border-[#E5E1D8] bg-white shadow-xs">
        <CardHeader className="pb-3 border-b border-[#E5E1D8]/60">
          <CardTitle className="text-sm font-bold text-[#1A1D21] flex items-center gap-2">
            <CheckSquare className="w-4 h-4 text-[#0F766E]" />
            Entregas e Aprovações ({demandas.length})
          </CardTitle>
          <CardDescription className="text-xs text-[#5B6470]">
            Você pode marcar itens aprovados ou entregues clicando na caixa de seleção.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <div className="divide-y divide-[#E5E1D8]">
            {demandas.map((d) => {
              const isConcluido = d.status === 'concluido'
              return (
                <div
                  key={d.id}
                  className={`p-3.5 flex items-center justify-between hover:bg-[#FAFAF9] transition-colors ${
                    isConcluido ? 'opacity-60 line-through' : ''
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      checked={isConcluido}
                      onChange={() => handleConcluirDemanda(d)}
                      className="w-4 h-4 rounded text-[#0F766E] border-[#E5E1D8] cursor-pointer"
                    />
                    <div>
                      <span className="text-xs font-semibold text-[#1A1D21] block">{d.titulo}</span>
                      {d.descricao && (
                        <span className="text-[11px] text-[#5B6470] block">{d.descricao}</span>
                      )}
                    </div>
                  </div>

                  {d.prazo && (
                    <span className="text-[10px] text-[#5B6470] flex items-center gap-1 bg-[#F4F2EE] px-2 py-0.5 rounded">
                      <Clock className="w-3 h-3" />
                      Prazo: {d.prazo}
                    </span>
                  )}
                </div>
              )
            })}

            {demandas.length === 0 && (
              <div className="py-8 text-center text-xs text-[#5B6470]">
                Nenhuma entrega pendente no momento.
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
