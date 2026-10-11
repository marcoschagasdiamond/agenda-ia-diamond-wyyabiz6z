import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/hooks/use-auth'
import { diamondApi } from '@/services/diamondApi'
import { Sparkles, Brain, CheckCircle2, ArrowRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  CardFooter,
} from '@/components/ui/card'
import { useToast } from '@/hooks/use-toast'

export default function Onboarding() {
  const { user, profile, refreshProfile } = useAuth()
  const navigate = useNavigate()
  const { toast } = useToast()

  const [quemEVoce, setQuemEVoce] = useState('')
  const [oQueFaz, setOQueFaz] = useState('')
  const [quaisProjetos, setQuaisProjetos] = useState('')
  const [quaisObjetivos, setQuaisObjetivos] = useState('')
  const [posicionamento, setPosicionamento] = useState('')
  const [precos, setPrecos] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    // Se o usuário já tiver respondido tudo, redireciona para o dashboard
    if (profile?.respostas_onboarding?.quem_e_voce) {
      setQuemEVoce(profile.respostas_onboarding.quem_e_voce || '')
      setOQueFaz(profile.respostas_onboarding.o_que_faz || '')
      setQuaisProjetos(profile.respostas_onboarding.quais_projetos || '')
      setQuaisObjetivos(profile.respostas_onboarding.quais_objetivos || '')
      setPosicionamento(profile.posicionamento || '')
      setPrecos(profile.precos || '')
    }
  }, [profile])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user) {
      navigate('/login')
      return
    }

    if (!quemEVoce.trim() || !oQueFaz.trim() || !quaisProjetos.trim() || !quaisObjetivos.trim()) {
      toast({
        title: 'Perguntas obrigatórias',
        description: 'Por favor, responda as quatro perguntas fundamentais do Segundo Cérebro.',
        variant: 'destructive',
      })
      return
    }

    setLoading(true)
    try {
      await diamondApi.saveOnboarding(user.id, {
        quem_e_voce: quemEVoce,
        o_que_faz: oQueFaz,
        quais_projetos: quaisProjetos,
        quais_objetivos: quaisObjetivos,
        posicionamento,
        precos,
      })

      await refreshProfile()

      toast({
        title: 'Segundo Cérebro Ativado!',
        description: 'Suas informações foram salvas permanentemente e alimentarão o Agente IA.',
      })

      navigate('/')
    } catch (err) {
      toast({
        title: 'Erro ao salvar',
        description: (err as Error)?.message || 'Tente novamente.',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen py-10 px-4 flex items-center justify-center bg-[#F4F2EE]">
      <div className="w-full max-w-2xl animate-fade-in-up">
        <div className="text-center mb-6">
          <div className="w-14 h-14 rounded-2xl bg-[#0F766E] mx-auto flex items-center justify-center text-white shadow-lg mb-3">
            <Brain className="w-8 h-8" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-[#1A1D21]">
            Ativação do Segundo Cérebro
          </h1>
          <p className="text-sm text-[#5B6470] mt-1 max-w-lg mx-auto">
            Guarde essas informações uma única vez. O sistema lembrará de tudo permanentemente ao
            longo de semanas ou meses.
          </p>
        </div>

        <Card className="border-[#E5E1D8] shadow-sm bg-white">
          <CardHeader className="border-b border-[#E5E1D8]/60 pb-4">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-[#0F766E]" />
              <CardTitle className="text-base font-semibold text-[#1A1D21]">
                Template de Cadastro Inicial (Obrigatório)
              </CardTitle>
            </div>
            <CardDescription className="text-xs text-[#5B6470]">
              Estas 4 respostas estruturam o contexto do seu negócio, posicionamento e decisões.
            </CardDescription>
          </CardHeader>
          <form onSubmit={handleSubmit}>
            <CardContent className="space-y-5 pt-5">
              {/* Pergunta 1 */}
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-[#1A1D21] flex items-center justify-between">
                  <span>1. Quem é você? *</span>
                  <span className="text-[10px] text-[#5B6470]">
                    Nome, formação, perfil profissional
                  </span>
                </Label>
                <Input
                  required
                  placeholder="Ex: Marcos Chagas, consultor estratégico e fundador..."
                  value={quemEVoce}
                  onChange={(e) => setQuemEVoce(e.target.value)}
                  className="text-sm border-[#E5E1D8]"
                />
              </div>

              {/* Pergunta 2 */}
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-[#1A1D21] flex items-center justify-between">
                  <span>2. O que você faz? *</span>
                  <span className="text-[10px] text-[#5B6470]">
                    Sua proposta de valor e serviços
                  </span>
                </Label>
                <Textarea
                  required
                  rows={2}
                  placeholder="Ex: Ajudo marcas e executivos a estruturarem precificação, expansão digital e lançamentos de alto valor..."
                  value={oQueFaz}
                  onChange={(e) => setOQueFaz(e.target.value)}
                  className="text-sm border-[#E5E1D8]"
                />
              </div>

              {/* Pergunta 3 */}
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-[#1A1D21] flex items-center justify-between">
                  <span>3. Quais são seus projetos? *</span>
                  <span className="text-[10px] text-[#5B6470]">
                    Projetos ativos, clientes e iniciativas
                  </span>
                </Label>
                <Textarea
                  required
                  rows={2}
                  placeholder="Ex: Consultoria de e-commerce Loja Y, mentoria de precificação para agências, desenvolvimento de devices..."
                  value={quaisProjetos}
                  onChange={(e) => setQuaisProjetos(e.target.value)}
                  className="text-sm border-[#E5E1D8]"
                />
              </div>

              {/* Pergunta 4 */}
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-[#1A1D21] flex items-center justify-between">
                  <span>4. Quais são seus objetivos? *</span>
                  <span className="text-[10px] text-[#5B6470]">Metas de curto e médio prazo</span>
                </Label>
                <Textarea
                  required
                  rows={2}
                  placeholder="Ex: Consolidar rotina operacional sem gargalos, manter histórico impecável com clientes e acelerar entregas..."
                  value={quaisObjetivos}
                  onChange={(e) => setQuaisObjetivos(e.target.value)}
                  className="text-sm border-[#E5E1D8]"
                />
              </div>

              {/* Campos Complementares */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2 border-t border-[#E5E1D8]/60">
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium text-[#1A1D21]">
                    Posicionamento de Mercado (Opcional)
                  </Label>
                  <Input
                    placeholder="Ex: Consultoria Premium e Estratégica"
                    value={posicionamento}
                    onChange={(e) => setPosicionamento(e.target.value)}
                    className="text-sm border-[#E5E1D8]"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium text-[#1A1D21]">
                    Política de Preços / Honorários (Opcional)
                  </Label>
                  <Input
                    placeholder="Ex: R$ 15.000/mês retainer ou R$ 30k projeto"
                    value={precos}
                    onChange={(e) => setPrecos(e.target.value)}
                    className="text-sm border-[#E5E1D8]"
                  />
                </div>
              </div>
            </CardContent>
            <CardFooter className="flex justify-between items-center border-t border-[#E5E1D8]/60 py-4">
              <span className="text-xs text-[#5B6470] flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                Armazenado no banco com criptografia
              </span>
              <Button
                type="submit"
                disabled={loading}
                className="bg-[#0F766E] hover:bg-[#0D5C56] text-white text-xs px-5 shadow-sm font-medium"
              >
                {loading ? 'Gravando Memória...' : 'Salvar e Abrir Dashboard'}
                <ArrowRight className="w-4 h-4 ml-1.5" />
              </Button>
            </CardFooter>
          </form>
        </Card>
      </div>
    </div>
  )
}
