import React, { useState, useEffect } from 'react'
import { diamondApi } from '@/services/diamondApi'
import { ConfiguracaoLembretes, LembreteAntecedenciaCodigo } from '@/types'
import { useAuth } from '@/hooks/use-auth'
import { useToast } from '@/hooks/use-toast'
import {
  Bell,
  Mail,
  Calendar,
  CheckSquare,
  Clock,
  AlertTriangle,
  Save,
  RotateCw,
  Sparkles,
  ShieldCheck,
  CheckCircle2,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

interface GestaoLembretesProps {
  onRecarregarGlobal?: () => void
}

const OPCOES_ANTECEDENCIA: Array<{
  codigo: LembreteAntecedenciaCodigo
  label: string
  descricao: string
}> = [
  { codigo: '15m', label: '15 minutos antes', descricao: 'Alerta imediato pré-reunião' },
  { codigo: '30m', label: '30 minutos antes', descricao: 'Tempo hábil para preparação' },
  { codigo: '1h', label: '1 hora antes', descricao: 'Alerta executivo padrão' },
  { codigo: '2h', label: '2 horas antes', descricao: 'Revisão de pauta e materiais' },
  { codigo: '1d', label: '1 dia antes', descricao: 'Aviso na véspera' },
  { codigo: '2d', label: '2 dias antes', descricao: 'Antecedência para alinhamento prévio' },
  { codigo: '1w', label: '1 semana antes', descricao: 'Planejamento semanal antecipado' },
]

export default function GestaoLembretes({ onRecarregarGlobal }: GestaoLembretesProps) {
  const { user } = useAuth()
  const { toast } = useToast()

  const [loading, setLoading] = useState(true)
  const [salvando, setSalvando] = useState(false)
  const [testando, setTestando] = useState(false)

  const [configId, setConfigId] = useState<string>('')
  const [antecedenciasReunioes, setAntecedenciasReunioes] = useState<LembreteAntecedenciaCodigo[]>([
    '15m',
    '1h',
    '1d',
  ])
  const [antecedenciasTarefas, setAntecedenciasTarefas] = useState<LembreteAntecedenciaCodigo[]>([
    '1h',
    '1d',
  ])

  const [emailReunioesAtivo, setEmailReunioesAtivo] = useState(true)
  const [sinoReunioesAtivo, setSinoReunioesAtivo] = useState(true)

  const [emailTarefasAtivo, setEmailTarefasAtivo] = useState(true)
  const [sinoTarefasAtivo, setSinoTarefasAtivo] = useState(true)
  const [avisarAtrasosTarefas, setAvisarAtrasosTarefas] = useState(true)

  useEffect(() => {
    carregarConfig()
  }, [user])

  const carregarConfig = async () => {
    setLoading(true)
    try {
      const cfg = await diamondApi.getConfiguracaoLembretes(user?.id)
      if (cfg) {
        setConfigId(cfg.id)
        if (Array.isArray(cfg.antecedencias_reunioes)) {
          setAntecedenciasReunioes(cfg.antecedencias_reunioes)
        }
        if (Array.isArray(cfg.antecedencias_tarefas)) {
          setAntecedenciasTarefas(cfg.antecedencias_tarefas)
        }
        setEmailReunioesAtivo(cfg.email_reunioes_ativo)
        setSinoReunioesAtivo(cfg.sino_reunioes_ativo)
        setEmailTarefasAtivo(cfg.email_tarefas_ativo)
        setSinoTarefasAtivo(cfg.sino_tarefas_ativo)
        setAvisarAtrasosTarefas(cfg.avisar_atrasos_tarefas !== false)
      }
    } catch (err) {
      console.error('Erro ao carregar configurações de lembretes:', err)
    } finally {
      setLoading(false)
    }
  }

  const toggleAntecedenciaReuniao = (codigo: LembreteAntecedenciaCodigo) => {
    setAntecedenciasReunioes((prev) =>
      prev.includes(codigo) ? prev.filter((c) => c !== codigo) : [...prev, codigo],
    )
  }

  const toggleAntecedenciaTarefa = (codigo: LembreteAntecedenciaCodigo) => {
    setAntecedenciasTarefas((prev) =>
      prev.includes(codigo) ? prev.filter((c) => c !== codigo) : [...prev, codigo],
    )
  }

  const handleSalvar = async (e: React.FormEvent) => {
    e.preventDefault()
    setSalvando(true)
    try {
      const payload: Partial<ConfiguracaoLembretes> = {
        id: configId || undefined,
        usuario: user?.id,
        antecedencias_reunioes: antecedenciasReunioes,
        antecedencias_tarefas: antecedenciasTarefas,
        email_reunioes_ativo: emailReunioesAtivo,
        sino_reunioes_ativo: sinoReunioesAtivo,
        email_tarefas_ativo: emailTarefasAtivo,
        sino_tarefas_ativo: sinoTarefasAtivo,
        avisar_atrasos_tarefas: avisarAtrasosTarefas,
      }

      const salva = await diamondApi.salvarConfiguracaoLembretes(payload)
      if (salva?.id) setConfigId(salva.id)

      toast({
        title: 'Preferências de Lembretes Salvas',
        description: 'Os avisos automáticos por e-mail e no sino seguirão este cronograma.',
      })
      onRecarregarGlobal?.()
    } catch (err) {
      console.error('Erro ao salvar lembretes:', err)
      toast({
        title: 'Erro ao salvar',
        description: 'Não foi possível gravar as preferências.',
        variant: 'destructive',
      })
    } finally {
      setSalvando(false)
    }
  }

  const handleVerificarAgora = async () => {
    setTestando(true)
    try {
      const res = await diamondApi.verificarLembretesAgora()
      toast({
        title: 'Rotina de Verificação Concluída',
        description: res.mensagem || 'Os lembretes pendentes foram verificados com sucesso.',
      })
      onRecarregarGlobal?.()
    } catch (err) {
      toast({
        title: 'Erro ao verificar',
        description: 'Falha ao rodar a rotina de lembretes sob demanda.',
        variant: 'destructive',
      })
    } finally {
      setTestando(false)
    }
  }

  if (loading) {
    return (
      <div className="bg-white p-8 rounded-xl border border-[#E5E1D8] text-center text-xs text-[#5B6470]">
        Carregando preferências de lembretes e avisos automáticos...
      </div>
    )
  }

  return (
    <form onSubmit={handleSalvar} className="space-y-6">
      {/* Top Banner de Resumo da Funcionalidade */}
      <div className="bg-gradient-to-r from-[#0F766E]/10 via-[#0F766E]/5 to-transparent p-4 rounded-xl border border-[#0F766E]/20 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-start gap-3">
          <div className="w-9 h-9 rounded-lg bg-[#0F766E] text-white flex items-center justify-center shrink-0 shadow-xs">
            <Bell className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-[#1A1D21] flex items-center gap-2">
              Lembretes & Avisos Automáticos
              <Badge className="bg-[#0F766E] text-white text-[10px] py-0 px-2">Ativo</Badge>
            </h2>
            <p className="text-xs text-[#5B6470] mt-0.5">
              Receba notificações antecipadas no sino do app e por e-mail sobre reuniões agendadas e
              tarefas/demandas prestes a vencer ou com prazo expirado.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-end sm:self-center">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleVerificarAgora}
            disabled={testando}
            className="text-xs h-8 border-[#E5E1D8] text-[#1A1D21] hover:bg-white gap-1.5"
            title="Executa a checagem no servidor imediatamente"
          >
            <RotateCw className={`w-3.5 h-3.5 ${testando ? 'animate-spin' : ''}`} />
            <span>{testando ? 'Verificando...' : 'Verificar Agora'}</span>
          </Button>

          <Button
            type="submit"
            size="sm"
            disabled={salvando}
            className="bg-[#0F766E] hover:bg-[#0D5C56] text-white text-xs h-8 gap-1.5 shadow-sm"
          >
            <Save className="w-3.5 h-3.5" />
            <span>{salvando ? 'Salvando...' : 'Salvar Alterações'}</span>
          </Button>
        </div>
      </div>

      {/* Grid de 2 Colunas: Reuniões vs Tarefas/Demandas */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* ============================================================== */}
        {/* CARD 1: REUNIÕES MARCADAS (CALENDÁRIO & ALINHAMENTOS)          */}
        {/* ============================================================== */}
        <Card className="border-[#E5E1D8] bg-white shadow-xs flex flex-col justify-between">
          <CardHeader className="pb-3 border-b border-[#E5E1D8]/60">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-md bg-[#0F766E]/10 text-[#0F766E] flex items-center justify-center">
                  <Calendar className="w-4 h-4" />
                </div>
                <div>
                  <CardTitle className="text-sm font-bold text-[#1A1D21]">
                    1. Reuniões & Compromissos
                  </CardTitle>
                  <CardDescription className="text-xs text-[#5B6470]">
                    Eventos do calendário marcados como Reunião ou Alinhamento.
                  </CardDescription>
                </div>
              </div>
            </div>
          </CardHeader>

          <CardContent className="p-4 space-y-4 flex-1">
            {/* Canais de Envio para Reuniões */}
            <div className="space-y-2">
              <span className="text-xs font-semibold text-[#1A1D21] block">Canais de Entrega:</span>
              <div className="grid grid-cols-2 gap-2">
                <label
                  className={`flex items-center gap-2.5 p-2.5 rounded-lg border cursor-pointer transition-colors ${
                    sinoReunioesAtivo
                      ? 'bg-[#0F766E]/5 border-[#0F766E]/30 text-[#0F766E] font-medium'
                      : 'bg-[#FAFAF9] border-[#E5E1D8] text-[#5B6470]'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={sinoReunioesAtivo}
                    onChange={(e) => setSinoReunioesAtivo(e.target.checked)}
                    className="rounded text-[#0F766E] focus:ring-[#0F766E]"
                  />
                  <div className="flex items-center gap-1.5 text-xs">
                    <Bell className="w-3.5 h-3.5" />
                    <span>Sino no App</span>
                  </div>
                </label>

                <label
                  className={`flex items-center gap-2.5 p-2.5 rounded-lg border cursor-pointer transition-colors ${
                    emailReunioesAtivo
                      ? 'bg-[#0F766E]/5 border-[#0F766E]/30 text-[#0F766E] font-medium'
                      : 'bg-[#FAFAF9] border-[#E5E1D8] text-[#5B6470]'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={emailReunioesAtivo}
                    onChange={(e) => setEmailReunioesAtivo(e.target.checked)}
                    className="rounded text-[#0F766E] focus:ring-[#0F766E]"
                  />
                  <div className="flex items-center gap-1.5 text-xs">
                    <Mail className="w-3.5 h-3.5" />
                    <span>E-mail</span>
                  </div>
                </label>
              </div>
            </div>

            {/* Checkboxes de Antecedência */}
            <div className="space-y-2 pt-2 border-t border-[#E5E1D8]/60">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-[#1A1D21]">
                  Quanto tempo antes avisar:
                </span>
                <span className="text-[11px] text-[#5B6470]">
                  {antecedenciasReunioes.length} selecionada(s)
                </span>
              </div>

              <div className="space-y-1.5">
                {OPCOES_ANTECEDENCIA.map((opcao) => {
                  const selecionada = antecedenciasReunioes.includes(opcao.codigo)
                  return (
                    <label
                      key={opcao.codigo}
                      onClick={() => toggleAntecedenciaReuniao(opcao.codigo)}
                      className={`flex items-center justify-between p-2 rounded-lg border text-xs cursor-pointer transition-all ${
                        selecionada
                          ? 'bg-[#0F766E]/10 border-[#0F766E]/40 text-[#1A1D21]'
                          : 'bg-white border-[#E5E1D8] text-[#5B6470] hover:bg-[#F4F2EE]'
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <input
                          type="checkbox"
                          checked={selecionada}
                          onChange={() => {}} // controlado pelo label
                          className="rounded text-[#0F766E] focus:ring-[#0F766E]"
                        />
                        <span className="font-semibold">{opcao.label}</span>
                      </div>
                      <span className="text-[10px] text-[#5B6470] hidden sm:inline">
                        {opcao.descricao}
                      </span>
                    </label>
                  )
                })}
              </div>
            </div>
          </CardContent>

          <CardFooter className="pt-2 pb-3 px-4 border-t border-[#E5E1D8] bg-[#FAFAF9] rounded-b-xl text-[11px] text-[#5B6470]">
            <Sparkles className="w-3.5 h-3.5 text-[#0F766E] mr-1.5 shrink-0" />
            <span>
              Ao criar um evento específico, você também pode personalizar essa antecedência.
            </span>
          </CardFooter>
        </Card>

        {/* ============================================================== */}
        {/* CARD 2: TAREFAS, DEMANDAS & CARDS VENCENDO                     */}
        {/* ============================================================== */}
        <Card className="border-[#E5E1D8] bg-white shadow-xs flex flex-col justify-between">
          <CardHeader className="pb-3 border-b border-[#E5E1D8]/60">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-md bg-blue-50 text-blue-700 flex items-center justify-center">
                  <CheckSquare className="w-4 h-4" />
                </div>
                <div>
                  <CardTitle className="text-sm font-bold text-[#1A1D21]">
                    2. Tarefas, Demandas & Cards
                  </CardTitle>
                  <CardDescription className="text-xs text-[#5B6470]">
                    Prazos definidos em Demandas do sistema e Cards do Kanban.
                  </CardDescription>
                </div>
              </div>
            </div>
          </CardHeader>

          <CardContent className="p-4 space-y-4 flex-1">
            {/* Canais de Envio para Tarefas */}
            <div className="space-y-2">
              <span className="text-xs font-semibold text-[#1A1D21] block">Canais de Entrega:</span>
              <div className="grid grid-cols-2 gap-2">
                <label
                  className={`flex items-center gap-2.5 p-2.5 rounded-lg border cursor-pointer transition-colors ${
                    sinoTarefasAtivo
                      ? 'bg-blue-50 border-blue-200 text-blue-900 font-medium'
                      : 'bg-[#FAFAF9] border-[#E5E1D8] text-[#5B6470]'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={sinoTarefasAtivo}
                    onChange={(e) => setSinoTarefasAtivo(e.target.checked)}
                    className="rounded text-blue-600 focus:ring-blue-600"
                  />
                  <div className="flex items-center gap-1.5 text-xs">
                    <Bell className="w-3.5 h-3.5" />
                    <span>Sino no App</span>
                  </div>
                </label>

                <label
                  className={`flex items-center gap-2.5 p-2.5 rounded-lg border cursor-pointer transition-colors ${
                    emailTarefasAtivo
                      ? 'bg-blue-50 border-blue-200 text-blue-900 font-medium'
                      : 'bg-[#FAFAF9] border-[#E5E1D8] text-[#5B6470]'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={emailTarefasAtivo}
                    onChange={(e) => setEmailTarefasAtivo(e.target.checked)}
                    className="rounded text-blue-600 focus:ring-blue-600"
                  />
                  <div className="flex items-center gap-1.5 text-xs">
                    <Mail className="w-3.5 h-3.5" />
                    <span>E-mail</span>
                  </div>
                </label>
              </div>
            </div>

            {/* Checkboxes de Antecedência */}
            <div className="space-y-2 pt-2 border-t border-[#E5E1D8]/60">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-[#1A1D21]">
                  Quanto tempo antes avisar:
                </span>
                <span className="text-[11px] text-[#5B6470]">
                  {antecedenciasTarefas.length} selecionada(s)
                </span>
              </div>

              <div className="space-y-1.5">
                {OPCOES_ANTECEDENCIA.map((opcao) => {
                  const selecionada = antecedenciasTarefas.includes(opcao.codigo)
                  return (
                    <label
                      key={opcao.codigo}
                      onClick={() => toggleAntecedenciaTarefa(opcao.codigo)}
                      className={`flex items-center justify-between p-2 rounded-lg border text-xs cursor-pointer transition-all ${
                        selecionada
                          ? 'bg-blue-50/70 border-blue-200 text-[#1A1D21]'
                          : 'bg-white border-[#E5E1D8] text-[#5B6470] hover:bg-[#F4F2EE]'
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <input
                          type="checkbox"
                          checked={selecionada}
                          onChange={() => {}}
                          className="rounded text-blue-600 focus:ring-blue-600"
                        />
                        <span className="font-semibold">{opcao.label}</span>
                      </div>
                      <span className="text-[10px] text-[#5B6470] hidden sm:inline">
                        {opcao.descricao}
                      </span>
                    </label>
                  )
                })}
              </div>
            </div>

            {/* Aviso de Tarefa Atrasada */}
            <div className="pt-2 border-t border-[#E5E1D8]/60">
              <label
                className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                  avisarAtrasosTarefas
                    ? 'bg-amber-50/70 border-amber-200 text-amber-950'
                    : 'bg-[#FAFAF9] border-[#E5E1D8] text-[#5B6470]'
                }`}
              >
                <input
                  type="checkbox"
                  checked={avisarAtrasosTarefas}
                  onChange={(e) => setAvisarAtrasosTarefas(e.target.checked)}
                  className="rounded text-amber-600 focus:ring-amber-600 mt-0.5"
                />
                <div>
                  <div className="text-xs font-bold flex items-center gap-1.5">
                    <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                    <span>Avisar quando a tarefa ATRASAR</span>
                  </div>
                  <p className="text-[11px] text-[#5B6470] mt-0.5 leading-snug">
                    Dispara um único aviso prioritário caso o prazo passe e a demanda/card ainda não
                    tenha sido concluída. Nunca se repete de forma duplicada.
                  </p>
                </div>
              </label>
            </div>
          </CardContent>

          <CardFooter className="pt-2 pb-3 px-4 border-t border-[#E5E1D8] bg-[#FAFAF9] rounded-b-xl text-[11px] text-[#5B6470]">
            <ShieldCheck className="w-3.5 h-3.5 text-blue-600 mr-1.5 shrink-0" />
            <span>Tarefas concluídas ou canceladas são filtradas e nunca disparam alertas.</span>
          </CardFooter>
        </Card>
      </div>

      {/* Regras Operacionais e Informações */}
      <Card className="border-[#E5E1D8] bg-white shadow-xs">
        <CardHeader className="pb-3 border-b border-[#E5E1D8]/60">
          <CardTitle className="text-xs font-bold text-[#1A1D21] flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            Como Funciona o Mecanismo de Disparo
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4 grid grid-cols-1 md:grid-cols-3 gap-3 text-xs text-[#5B6470]">
          <div className="p-3 rounded-lg bg-[#FAFAF9] border border-[#E5E1D8]">
            <div className="font-semibold text-[#1A1D21] mb-1 flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-[#0F766E]" />
              Cron Periódica Automática
            </div>
            O servidor PocketBase verifica a cada 2 minutos os eventos e tarefas que entraram na
            janela de antecedência escolhida.
          </div>

          <div className="p-3 rounded-lg bg-[#FAFAF9] border border-[#E5E1D8]">
            <div className="font-semibold text-[#1A1D21] mb-1 flex items-center gap-1.5">
              <Mail className="w-3.5 h-3.5 text-[#0F766E]" />
              E-mail Transacional Nativo
            </div>
            Enviado para seu e-mail cadastrado com design executivo da Agenda IA Diamond e link
            direto para o item.
          </div>

          <div className="p-3 rounded-lg bg-[#FAFAF9] border border-[#E5E1D8]">
            <div className="font-semibold text-[#1A1D21] mb-1 flex items-center gap-1.5">
              <Bell className="w-3.5 h-3.5 text-[#0F766E]" />
              Sino & Alertas no App
            </div>
            O sino na barra superior ganha badge vermelho e lista os avisos com ícone, tempo
            relativo e marcação como lido.
          </div>
        </CardContent>
      </Card>
    </form>
  )
}
