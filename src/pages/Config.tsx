import React, { useState, useEffect } from 'react'
import { useAuth } from '@/hooks/use-auth'
import { useNavegacao } from '@/contexts/NavegacaoContext'
import { diamondApi } from '@/services/diamondApi'
import { useSearchParams } from 'react-router-dom'
import {
  Settings,
  FolderTree,
  FolderKanban,
  Users,
  UserCheck,
  Tag,
  Layers,
  CreditCard,
  FileText,
  Brain,
  MessageSquare,
  Mail,
  Sparkles,
  Save,
  CheckCircle2,
  ExternalLink,
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
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { useToast } from '@/hooks/use-toast'

// Subcomponentes da Central de Gestão
import GestaoCategoriasFluxos from '@/pages/config/GestaoCategoriasFluxos'
import GestaoProjetos from '@/pages/config/GestaoProjetos'
import GestaoContatos from '@/pages/config/GestaoContatos'
import GestaoClientes from '@/pages/config/GestaoClientes'
import GestaoEquipes from '@/pages/config/GestaoEquipes'
import GestaoTags from '@/pages/config/GestaoTags'
import GestaoGruposTarefas from '@/pages/config/GestaoGruposTarefas'
import GestaoCards from '@/pages/config/GestaoCards'
import ConstrutorFormularios from '@/pages/config/ConstrutorFormularios'

export default function Config() {
  const { user, profile, refreshProfile } = useAuth()
  const { recarregarFluxo, recarregarDadosGlobais } = useNavegacao()
  const { toast } = useToast()
  const [searchParams, setSearchParams] = useSearchParams()

  const abaUrl = searchParams.get('aba') || 'central'
  const subAbaUrl = searchParams.get('gestao') || 'categorias_fluxos'

  const [abaPrincipal, setAbaPrincipal] = useState<string>(
    abaUrl === 'formularios'
      ? 'formularios'
      : abaUrl === 'preferencias'
        ? 'preferencias'
        : 'central',
  )
  const [abaGestao, setAbaGestao] = useState<string>(subAbaUrl)

  // Memória Estratégica
  const [posicionamento, setPosicionamento] = useState(profile?.posicionamento || '')
  const [precos, setPrecos] = useState(profile?.precos || '')
  const [objetivos, setObjetivos] = useState(profile?.objetivos || '')
  const [salvando, setSalvando] = useState(false)

  // Sincronizar com parâmetros da URL
  useEffect(() => {
    const pAba = searchParams.get('aba')
    const pGestao = searchParams.get('gestao')
    if (pAba) {
      setAbaPrincipal(pAba)
    }
    if (pGestao) {
      setAbaGestao(pGestao)
    }
  }, [searchParams])

  const mudarAbaPrincipal = (novaAba: string) => {
    setAbaPrincipal(novaAba)
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev)
      next.set('aba', novaAba)
      return next
    })
  }

  const mudarAbaGestao = (novaGestao: string) => {
    setAbaGestao(novaGestao)
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev)
      next.set('aba', 'central')
      next.set('gestao', novaGestao)
      return next
    })
  }

  const recarregarGlobal = () => {
    recarregarFluxo?.()
    recarregarDadosGlobais?.()
  }

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
    } catch {
      toast({ title: 'Erro ao salvar', variant: 'destructive' })
    } finally {
      setSalvando(false)
    }
  }

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-12">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-xl border border-[#E5E1D8] shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl md:text-2xl font-bold tracking-tight text-[#1A1D21]">
              Central de Gestão & Configurações
            </h1>
            <Badge className="bg-[#0F766E]/10 text-[#0F766E] border-none text-[11px] font-semibold">
              Diamond Executive
            </Badge>
            <Badge variant="outline" className="text-[10px] text-[#5B6470] border-[#E5E1D8]">
              v0.0.36
            </Badge>
          </div>
          <p className="text-xs text-[#5B6470] mt-1">
            Gestão unificada de categorias, fluxos, projetos, contatos, clientes, equipe, tags,
            grupos de tarefas, cards e construtor de formulários.
          </p>
        </div>
      </div>

      {/* Abas Globais de Navegação no topo */}
      <Tabs value={abaPrincipal} onValueChange={mudarAbaPrincipal} className="space-y-4">
        <TabsList className="bg-white border border-[#E5E1D8] p-1 h-auto flex flex-wrap gap-1 rounded-xl">
          <TabsTrigger
            value="central"
            className="data-[state=active]:bg-[#0F766E] data-[state=active]:text-white text-xs px-3.5 py-1.5 rounded-lg flex items-center gap-1.5 font-medium"
          >
            <Settings className="w-3.5 h-3.5" />
            <span>Central de Gestão</span>
          </TabsTrigger>

          <TabsTrigger
            value="formularios"
            className="data-[state=active]:bg-[#0F766E] data-[state=active]:text-white text-xs px-3.5 py-1.5 rounded-lg flex items-center gap-1.5 font-medium"
          >
            <FileText className="w-3.5 h-3.5" />
            <span>Construtor de Formulários</span>
          </TabsTrigger>

          <TabsTrigger
            value="preferencias"
            className="data-[state=active]:bg-[#0F766E] data-[state=active]:text-white text-xs px-3.5 py-1.5 rounded-lg flex items-center gap-1.5 font-medium"
          >
            <Brain className="w-3.5 h-3.5" />
            <span>Memória Estratégica & Conectores</span>
          </TabsTrigger>
        </TabsList>

        {/* ============================================================== */}
        {/* 1. ABA: CENTRAL DE GESTÃO (8 Sub-Abas Exatas Pedidas) */}
        {/* ============================================================== */}
        <TabsContent value="central" className="space-y-4 m-0">
          <div className="bg-[#FAFAF9] p-2 rounded-xl border border-[#E5E1D8]">
            <div className="flex flex-wrap items-center gap-1.5">
              <Button
                size="sm"
                variant={abaGestao === 'categorias_fluxos' ? 'default' : 'ghost'}
                onClick={() => mudarAbaGestao('categorias_fluxos')}
                className={`text-xs h-8 px-2.5 rounded-lg gap-1.5 ${
                  abaGestao === 'categorias_fluxos'
                    ? 'bg-[#1A1D21] text-white hover:bg-[#2A2E33]'
                    : 'text-[#5B6470] hover:text-[#1A1D21] hover:bg-white'
                }`}
              >
                <FolderTree className="w-3.5 h-3.5" />
                <span>1. Categorias & Fluxos</span>
              </Button>

              <Button
                size="sm"
                variant={abaGestao === 'projetos' ? 'default' : 'ghost'}
                onClick={() => mudarAbaGestao('projetos')}
                className={`text-xs h-8 px-2.5 rounded-lg gap-1.5 ${
                  abaGestao === 'projetos'
                    ? 'bg-[#1A1D21] text-white hover:bg-[#2A2E33]'
                    : 'text-[#5B6470] hover:text-[#1A1D21] hover:bg-white'
                }`}
              >
                <FolderKanban className="w-3.5 h-3.5" />
                <span>2. Projetos</span>
              </Button>

              <Button
                size="sm"
                variant={abaGestao === 'contatos' ? 'default' : 'ghost'}
                onClick={() => mudarAbaGestao('contatos')}
                className={`text-xs h-8 px-2.5 rounded-lg gap-1.5 ${
                  abaGestao === 'contatos'
                    ? 'bg-[#1A1D21] text-white hover:bg-[#2A2E33]'
                    : 'text-[#5B6470] hover:text-[#1A1D21] hover:bg-white'
                }`}
              >
                <Users className="w-3.5 h-3.5" />
                <span>3. Contatos</span>
              </Button>

              <Button
                size="sm"
                variant={abaGestao === 'clientes' ? 'default' : 'ghost'}
                onClick={() => mudarAbaGestao('clientes')}
                className={`text-xs h-8 px-2.5 rounded-lg gap-1.5 ${
                  abaGestao === 'clientes'
                    ? 'bg-[#1A1D21] text-white hover:bg-[#2A2E33]'
                    : 'text-[#5B6470] hover:text-[#1A1D21] hover:bg-white'
                }`}
              >
                <UserCheck className="w-3.5 h-3.5" />
                <span>4. Clientes</span>
              </Button>

              <Button
                size="sm"
                variant={abaGestao === 'equipes' ? 'default' : 'ghost'}
                onClick={() => mudarAbaGestao('equipes')}
                className={`text-xs h-8 px-2.5 rounded-lg gap-1.5 ${
                  abaGestao === 'equipes'
                    ? 'bg-[#1A1D21] text-white hover:bg-[#2A2E33]'
                    : 'text-[#5B6470] hover:text-[#1A1D21] hover:bg-white'
                }`}
              >
                <Users className="w-3.5 h-3.5" />
                <span>5. Equipes</span>
              </Button>

              <Button
                size="sm"
                variant={abaGestao === 'tags' ? 'default' : 'ghost'}
                onClick={() => mudarAbaGestao('tags')}
                className={`text-xs h-8 px-2.5 rounded-lg gap-1.5 ${
                  abaGestao === 'tags'
                    ? 'bg-[#1A1D21] text-white hover:bg-[#2A2E33]'
                    : 'text-[#5B6470] hover:text-[#1A1D21] hover:bg-white'
                }`}
              >
                <Tag className="w-3.5 h-3.5" />
                <span>6. Tags</span>
              </Button>

              <Button
                size="sm"
                variant={abaGestao === 'grupos_tarefas' ? 'default' : 'ghost'}
                onClick={() => mudarAbaGestao('grupos_tarefas')}
                className={`text-xs h-8 px-2.5 rounded-lg gap-1.5 ${
                  abaGestao === 'grupos_tarefas'
                    ? 'bg-[#1A1D21] text-white hover:bg-[#2A2E33]'
                    : 'text-[#5B6470] hover:text-[#1A1D21] hover:bg-white'
                }`}
              >
                <Layers className="w-3.5 h-3.5" />
                <span>7. Grupos de Tarefas</span>
              </Button>

              <Button
                size="sm"
                variant={abaGestao === 'cards' ? 'default' : 'ghost'}
                onClick={() => mudarAbaGestao('cards')}
                className={`text-xs h-8 px-2.5 rounded-lg gap-1.5 ${
                  abaGestao === 'cards'
                    ? 'bg-[#1A1D21] text-white hover:bg-[#2A2E33]'
                    : 'text-[#5B6470] hover:text-[#1A1D21] hover:bg-white'
                }`}
              >
                <CreditCard className="w-3.5 h-3.5" />
                <span>8. Cards Globais</span>
              </Button>
            </div>
          </div>

          {/* Renderização condicional do módulo selecionado */}
          <div>
            {abaGestao === 'categorias_fluxos' && (
              <GestaoCategoriasFluxos onRecarregarGlobal={recarregarGlobal} />
            )}
            {abaGestao === 'projetos' && <GestaoProjetos onRecarregarGlobal={recarregarGlobal} />}
            {abaGestao === 'contatos' && <GestaoContatos onRecarregarGlobal={recarregarGlobal} />}
            {abaGestao === 'clientes' && <GestaoClientes onRecarregarGlobal={recarregarGlobal} />}
            {abaGestao === 'equipes' && <GestaoEquipes onRecarregarGlobal={recarregarGlobal} />}
            {abaGestao === 'tags' && <GestaoTags onRecarregarGlobal={recarregarGlobal} />}
            {abaGestao === 'grupos_tarefas' && (
              <GestaoGruposTarefas onRecarregarGlobal={recarregarGlobal} />
            )}
            {abaGestao === 'cards' && <GestaoCards onRecarregarGlobal={recarregarGlobal} />}
          </div>
        </TabsContent>

        {/* ============================================================== */}
        {/* 2. ABA: CONSTRUTOR DE FORMULÁRIOS */}
        {/* ============================================================== */}
        <TabsContent value="formularios" className="space-y-4 m-0">
          <ConstrutorFormularios onRecarregarGlobal={recarregarGlobal} />
        </TabsContent>

        {/* ============================================================== */}
        {/* 3. ABA: MEMÓRIA ESTRATÉGICA & CONECTORES */}
        {/* ============================================================== */}
        <TabsContent value="preferencias" className="space-y-6 m-0">
          {/* Seção 1: Status das Integrações */}
          <Card className="border-[#E5E1D8] bg-white shadow-xs">
            <CardHeader className="pb-3 border-b border-[#E5E1D8]/60">
              <CardTitle className="text-sm font-bold text-[#1A1D21] flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-[#0F766E]" />
                Status das Integrações de Mensagens
              </CardTitle>
              <CardDescription className="text-xs text-[#5B6470]">
                Arquitetura de conectores preparada. Opera via colagem/captura inteligente na Folha
                do Dia e sincronização pelo Segundo Cérebro.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-4 space-y-3">
              <div className="flex items-center justify-between p-3 rounded-lg border border-[#E5E1D8] bg-[#FAFAF9]">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center">
                    <MessageSquare className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="text-xs font-bold text-[#1A1D21] block">
                      Conector WhatsApp
                    </span>
                    <span className="text-[11px] text-[#5B6470]">
                      Entrada manual via Folha do Dia com classificação e vínculo automático por IA.
                    </span>
                  </div>
                </div>
                <Badge
                  variant="outline"
                  className="text-[10px] text-emerald-700 border-emerald-200 bg-emerald-50"
                >
                  Ativo (Folha)
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
                      E-mails indexados e associados ao negócio e projeto correto na base Diamond.
                    </span>
                  </div>
                </div>
                <Badge
                  variant="outline"
                  className="text-[10px] text-blue-700 border-blue-200 bg-blue-50"
                >
                  Ativo (Folha)
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
                negociações executivas.
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
                  <span>{salvando ? 'Salvando...' : 'Salvar Preferências'}</span>
                </Button>
              </CardFooter>
            </form>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
