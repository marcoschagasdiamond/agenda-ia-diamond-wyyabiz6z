import React, { useState, useEffect } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { diamondApi } from '@/services/diamondApi'
import type { Contato, Card as CardType, Projeto, Demanda } from '@/types'
import {
  Users,
  ArrowLeft,
  Mail,
  Phone,
  Building,
  Sparkles,
  Calendar,
  Layers,
  CheckCircle2,
  Trash2,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card'
import { Textarea } from '@/components/ui/textarea'
import { useToast } from '@/hooks/use-toast'

export default function ContatoDetalhes() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { toast } = useToast()

  const [contato, setContato] = useState<Contato | null>(null)
  const [cards, setCards] = useState<CardType[]>([])
  const [novoContexto, setNovoContexto] = useState('')
  const [salvando, setSalvando] = useState(false)
  const [loading, setLoading] = useState(true)

  const carregar = async () => {
    if (!id) return
    try {
      const ct = await diamondApi.getContato(id)
      setContato(ct)
      setNovoContexto(ct.contexto_resumido || '')

      const c = await diamondApi.listCards(`contato = "${id}"`)
      setCards(c)
    } catch (err) {
      console.error(err)
      toast({ title: 'Erro ao carregar contato', variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    carregar()
  }, [id])

  const handleSalvarContexto = async () => {
    if (!id) return
    setSalvando(true)
    try {
      await diamondApi.updateContato(id, { contexto_resumido: novoContexto })
      toast({ title: 'Contexto e histórico da pessoa atualizados!' })
      await carregar()
    } catch (err) {
      toast({ title: 'Erro ao atualizar', variant: 'destructive' })
    } finally {
      setSalvando(false)
    }
  }

  const handleExcluirContato = async () => {
    if (!id) return
    if (!confirm('Deseja realmente remover este contato?')) return
    try {
      await diamondApi.deleteContato(id)
      toast({ title: 'Contato excluído com sucesso.' })
      navigate('/contatos')
    } catch {
      toast({ title: 'Erro ao excluir contato', variant: 'destructive' })
    }
  }

  if (loading)
    return <div className="p-8 text-center text-xs text-[#5B6470]">Carregando contato...</div>
  if (!contato)
    return <div className="p-8 text-center text-xs text-red-600">Contato não encontrado.</div>

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-xl border border-[#E5E1D8] shadow-xs">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate('/contatos')}
            className="text-xs p-2 h-8 text-[#5B6470]"
          >
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold tracking-tight text-[#1A1D21]">{contato.nome}</h1>
              <Badge variant="outline" className="text-[10px] capitalize">
                Origem: {contato.origem}
              </Badge>
            </div>
            <p className="text-xs text-[#5B6470] mt-1">
              {contato.cargo || 'Pessoa Chave'} {contato.empresa && `• ${contato.empresa}`}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleExcluirContato}
            className="text-xs h-8 text-red-600 border-red-200 hover:bg-red-50"
          >
            <Trash2 className="w-3.5 h-3.5 mr-1" />
            Excluir Contato
          </Button>
        </div>
      </div>

      {/* Detalhes de Contato & Memória */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Painel Esquerdo: Dados de Contato */}
        <Card className="border-[#E5E1D8] bg-white shadow-xs">
          <CardHeader className="pb-3 border-b border-[#E5E1D8]/60">
            <CardTitle className="text-xs font-bold text-[#1A1D21] uppercase tracking-wider">
              Informações de Contato
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 space-y-3 text-xs">
            <div>
              <span className="text-[10px] text-[#5B6470] uppercase block">E-mail:</span>
              <span className="text-[#1A1D21] font-medium">{contato.email || 'Não informado'}</span>
            </div>
            <div>
              <span className="text-[10px] text-[#5B6470] uppercase block">
                Telefone / WhatsApp:
              </span>
              <span className="text-[#1A1D21] font-medium">
                {contato.telefone || 'Não informado'}
              </span>
            </div>
            <div>
              <span className="text-[10px] text-[#5B6470] uppercase block">Empresa:</span>
              <span className="text-[#1A1D21] font-medium">
                {contato.empresa || 'Não informada'}
              </span>
            </div>
            <div>
              <span className="text-[10px] text-[#5B6470] uppercase block">Tags:</span>
              <div className="flex flex-wrap gap-1 mt-1">
                {Array.isArray(contato.tags) &&
                  contato.tags.map((t, idx) => (
                    <Badge key={idx} variant="secondary" className="text-[10px]">
                      #{t}
                    </Badge>
                  ))}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Painel Direito: Memória e Histórico com a Pessoa */}
        <Card className="md:col-span-2 border-[#0F766E]/30 bg-teal-50/20 shadow-xs">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold text-[#0F766E] flex items-center gap-2">
              <Sparkles className="w-4 h-4" />
              Histórico de Conversas & Preferências da Pessoa
            </CardTitle>
            <CardDescription className="text-xs text-[#5B6470]">
              O que ela prefere, canais favoritos, acordos verbais e estilo de comunicação.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Textarea
              rows={4}
              value={novoContexto}
              onChange={(e) => setNovoContexto(e.target.value)}
              placeholder="Ex: Helena prefere WhatsApp pela manhã. Muito objetiva, não gosta de reuniões longas. Validar sempre custos antes de propor escopo..."
              className="text-xs bg-white border-[#E5E1D8]"
            />
            <div className="flex justify-end">
              <Button
                size="sm"
                disabled={salvando}
                onClick={handleSalvarContexto}
                className="bg-[#0F766E] hover:bg-[#0D5C56] text-white text-xs h-8"
              >
                {salvando ? 'Salvando...' : 'Atualizar Contexto'}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Cards Vinculados */}
      <Card className="border-[#E5E1D8] bg-white shadow-xs">
        <CardHeader className="pb-3 border-b border-[#E5E1D8]/60">
          <CardTitle className="text-sm font-bold text-[#1A1D21]">
            Cards & Demandas Vinculadas a este Contato ({cards.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {cards.map((card) => (
              <div
                key={card.id}
                onClick={() => navigate('/fluxo')}
                className="p-3 rounded-lg border border-[#E5E1D8] bg-[#FAFAF9] hover:bg-white transition-colors cursor-pointer text-xs"
              >
                <div className="flex items-center justify-between gap-2 mb-1">
                  <span className="font-semibold text-[#1A1D21] truncate">{card.titulo}</span>
                  <Badge variant="outline" className="text-[10px] capitalize">
                    {card.status.replace('_', ' ')}
                  </Badge>
                </div>
                {card.proximo_passo && (
                  <p className="text-[11px] text-[#0F766E] font-medium mt-1">
                    Próximo passo: {card.proximo_passo}
                  </p>
                )}
              </div>
            ))}
            {cards.length === 0 && (
              <p className="text-xs text-[#5B6470] col-span-full py-4 text-center">
                Nenhum card vinculado a este contato no momento.
              </p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
