import React, { useState } from 'react'
import { useAuth } from '@/hooks/use-auth'
import { diamondApi } from '@/services/diamondApi'
import {
  Settings,
  Brain,
  Mail,
  MessageSquare,
  ShieldCheck,
  CheckCircle2,
  Sparkles,
  Save,
  Lock,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  CardDescription,
  CardFooter,
} from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { useToast } from '@/hooks/use-toast'

export default function Config() {
  const { user, profile, refreshProfile } = useAuth()
  const { toast } = useToast()

  const [posicionamento, setPosicionamento] = useState(profile?.posicionamento || '')
  const [precos, setPrecos] = useState(profile?.precos || '')
  const [objetivos, setObjetivos] = useState(profile?.objetivos || '')
  const [preferencias, setPreferencias] = useState(profile?.preferencias || '')
  const [salvando, setSalvando] = useState(false)

  const handleSalvarPreferencias = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user) return
    setSalvando(true)

    try {
      await diamondApi.saveOnboarding(user.id, {
        quem_e_voce: profile?.respostas_onboarding?.quem_e_voce || '',
        o_que_faz: profile?.respostas_onboarding?.o_que_faz || '',
        quais_projetos: profile?.respostas_onboarding?.quais_projetos || '',
        quais_objetivos: objetivos || profile?.respostas_onboarding?.quais_objetivos || '',
        posicionamento,
        precos,
      })

      await refreshProfile()
      toast({ title: 'Configurações e preferências atualizadas com sucesso!' })
    } catch (err) {
      toast({ title: 'Erro ao salvar', variant: 'destructive' })
    } finally {
      setSalvando(false)
    }
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-xl border border-[#E5E1D8] shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl md:text-2xl font-bold tracking-tight text-[#1A1D21]">
              Configurações & Integrações
            </h1>
            <Badge className="bg-[#0F766E]/10 text-[#0F766E] border-none text-[11px] font-semibold">
              Segundo Cérebro
            </Badge>
            <Badge variant="outline" className="text-[10px] text-[#5B6470] border-[#E5E1D8]">
              v0.0.27
            </Badge>
          </div>
          <p className="text-xs text-[#5B6470] mt-1">
            Ajuste posicionamento, honorários e consulte o status dos conectores de e-mail e
            WhatsApp.
          </p>
        </div>
      </div>

      {/* Seção 1: Status das Integrações */}
      <Card className="border-[#E5E1D8] bg-white shadow-xs">
        <CardHeader className="pb-3 border-b border-[#E5E1D8]/60">
          <CardTitle className="text-sm font-bold text-[#1A1D21] flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-[#0F766E]" />
            Status das Integrações de Mensagens
          </CardTitle>
          <CardDescription className="text-xs text-[#5B6470]">
            Arquitetura de conectores preparada. Fase 1 opera via colagem/captura inteligente na
            Folha do Dia.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-4 space-y-3">
          <div className="flex items-center justify-between p-3 rounded-lg border border-[#E5E1D8] bg-[#FAFAF9]">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center">
                <MessageSquare className="w-4 h-4" />
              </div>
              <div>
                <span className="text-xs font-bold text-[#1A1D21] block">Conector WhatsApp</span>
                <span className="text-[11px] text-[#5B6470]">
                  Fase 1: Entrada manual via Folha do Dia com classificação e vínculo automático por
                  IA.
                </span>
              </div>
            </div>
            <Badge
              variant="outline"
              className="text-[10px] text-emerald-700 border-emerald-200 bg-emerald-50"
            >
              Pronto (Manual)
            </Badge>
          </div>

          <div className="flex items-center justify-between p-3 rounded-lg border border-[#E5E1D8] bg-[#FAFAF9]">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-700 flex items-center justify-center">
                <Mail className="w-4 h-4" />
              </div>
              <div>
                <span className="text-xs font-bold text-[#1A1D21] block">Conector E-mail</span>
                <span className="text-[11px] text-[#5B6470]">
                  Fase 1: E-mails colados na Folha são indexados e associados ao negócio e projeto
                  correto.
                </span>
              </div>
            </div>
            <Badge
              variant="outline"
              className="text-[10px] text-blue-700 border-blue-200 bg-blue-50"
            >
              Pronto (Manual)
            </Badge>
          </div>
        </CardContent>
      </Card>

      {/* Seção 2: Memória Estratégica (Posicionamento e Preços) */}
      <Card className="border-[#E5E1D8] bg-white shadow-xs">
        <CardHeader className="pb-3 border-b border-[#E5E1D8]/60">
          <CardTitle className="text-sm font-bold text-[#1A1D21] flex items-center gap-2">
            <Brain className="w-4 h-4 text-[#0F766E]" />
            Memória Estratégica & Diretrizes
          </CardTitle>
          <CardDescription className="text-xs text-[#5B6470]">
            Estas informações são lidas pelo Agente IA para responder coerentemente a preços e
            negociações.
          </CardDescription>
        </CardHeader>
        <form onSubmit={handleSalvarPreferencias}>
          <CardContent className="p-4 space-y-4">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-[#1A1D21]">
                Posicionamento de Mercado
              </label>
              <Input
                value={posicionamento}
                onChange={(e) => setPosicionamento(e.target.value)}
                placeholder="Ex: Consultor Premium de Estratégia e Implementação Tecnológica"
                className="text-xs border-[#E5E1D8]"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-[#1A1D21]">
                Política de Preços & Honorários
              </label>
              <Textarea
                rows={2}
                value={precos}
                onChange={(e) => setPrecos(e.target.value)}
                placeholder="Ex: Consultoria estratégica: R$ 15.000/mês; Projetos pontuais: R$ 25k - R$ 60k..."
                className="text-xs border-[#E5E1D8]"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-[#1A1D21]">
                Objetivos de Médio Prazo
              </label>
              <Textarea
                rows={2}
                value={objetivos}
                onChange={(e) => setObjetivos(e.target.value)}
                placeholder="Ex: Atender até 10 clientes VIP com retenção anual..."
                className="text-xs border-[#E5E1D8]"
              />
            </div>
          </CardContent>

          <CardFooter className="pt-2 border-t border-[#E5E1D8] flex justify-end">
            <Button
              type="submit"
              disabled={salvando}
              className="bg-[#0F766E] hover:bg-[#0D5C56] text-white text-xs gap-1.5"
            >
              <Save className="w-3.5 h-3.5" />
              {salvando ? 'Salvando...' : 'Salvar Preferências'}
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  )
}
