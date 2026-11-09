import React, { useEffect, useState } from 'react'
import { useAuth } from '@/hooks/use-auth'
import { useToast } from '@/hooks/use-toast'
import { diamondApi } from '@/services/diamondApi'
import { ConfigEmailUsuario, ConfigEmailSistema } from '@/types'
import { listConnectors, connect, disconnect } from '@/lib/skipConnectors'
import { ConnectorButton } from '@/components/skip/ConnectorButton'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Mail,
  Send,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Sparkles,
  Link2,
  Unlink,
  Eye,
  Info,
  Server,
  Key,
} from 'lucide-react'

interface GestaoEmailUsuarioProps {
  onRecarregarGlobal?: () => void
}

export default function GestaoEmailUsuario({ onRecarregarGlobal }: GestaoEmailUsuarioProps) {
  const { user } = useAuth()
  const { toast } = useToast()

  const [loading, setLoading] = useState(true)
  const [salvando, setSalvando] = useState(false)
  const [testando, setTestando] = useState(false)

  // Status do conector Resend pessoal do usuário
  const [conectorConectado, setConectorConectado] = useState(false)
  const [carregandoConector, setCarregandoConector] = useState(true)
  const [conectandoPopup, setConectandoPopup] = useState(false)

  // Configuração do usuário
  const [config, setConfig] = useState<ConfigEmailUsuario>({
    usuario: user?.id || '',
    remetente_nome: '',
    remetente_email: '',
    usar_resend_proprio: false,
    mensagem_personalizada: '',
    rodape_personalizado: '',
  })

  // Template do sistema para preview
  const [templateSistema, setTemplateSistema] = useState<ConfigEmailSistema | null>(null)

  // E-mail de destino do teste
  const [emailTeste, setEmailTeste] = useState(user?.email || '')

  // Carregar status do conector e configuração do usuário
  const carregarDados = async () => {
    if (!user) return
    try {
      setLoading(true)
      // 1. Carregar configuração salva do usuário
      const cfg = await diamondApi.getConfigEmailUsuario(user.id)
      if (cfg) {
        setConfig({
          ...cfg,
          remetente_nome: cfg.remetente_nome || cfg.remetente_nome_preferido || user.name || '',
          remetente_email: cfg.remetente_email || user.email || '',
          mensagem_personalizada:
            cfg.mensagem_personalizada || cfg.mensagem_personalizada_convite || '',
        })
      } else {
        setConfig((prev) => ({
          ...prev,
          usuario: user.id,
          remetente_nome: user.name || '',
          remetente_email: user.email || '',
        }))
      }

      // 2. Carregar template padrão do sistema
      const sys = await diamondApi.getConfigEmailSistema()
      if (sys) {
        setTemplateSistema(sys)
      }

      // 3. Verificar se o conector pessoal do usuário está ativo
      await verificarConector()
    } catch (err) {
      console.error('Erro ao carregar dados de e-mail do usuário:', err)
    } finally {
      setLoading(false)
    }
  }

  const verificarConector = async () => {
    try {
      setCarregandoConector(true)
      const list = await listConnectors()
      const resendState = list.find((c) => c.toolkit === 'resend')
      const estaConectado = resendState?.status === 'connected'
      setConectorConectado(estaConectado)
    } catch (err) {
      console.warn('Não foi possível listar conectores do usuário:', err)
      setConectorConectado(false)
    } finally {
      setCarregandoConector(false)
    }
  }

  useEffect(() => {
    carregarDados()
  }, [user?.id])

  const handleConectarResend = async () => {
    try {
      setConectandoPopup(true)
      await connect('resend')
      await verificarConector()
      toast({
        title: 'Conta Resend conectada!',
        description: 'Sua conta pessoal foi vinculada com sucesso para disparo de convites.',
      })
      setConfig((prev) => ({ ...prev, usar_resend_proprio: true }))
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Tente novamente.'
      toast({
        title: 'Não foi possível conectar ao Resend',
        description:
          msg ||
          'Verifique se as janelas popup estão permitidas no seu navegador para autenticar o conector.',
        variant: 'destructive',
      })
    } finally {
      setConectandoPopup(false)
    }
  }

  const handleDesconectarResend = async () => {
    try {
      setConectandoPopup(true)
      await disconnect('resend')
      await verificarConector()
      setConfig((prev) => ({ ...prev, usar_resend_proprio: false }))
      toast({
        title: 'Conta Resend desconectada',
        description: 'Seus convites voltarão a ser enviados pelo remetente padrão do sistema.',
      })
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Tente novamente.'
      toast({
        title: 'Erro ao desconectar',
        description: msg,
        variant: 'destructive',
      })
    } finally {
      setConectandoPopup(false)
    }
  }

  const handleSalvar = async (e?: React.FormEvent) => {
    if (e) e.preventDefault()
    if (!user) return
    try {
      setSalvando(true)
      const salva = await diamondApi.salvarConfigEmailUsuario(user.id, {
        remetente_nome: config.remetente_nome,
        remetente_email: config.remetente_email,
        usar_resend_proprio: config.usar_resend_proprio,
        mensagem_personalizada: config.mensagem_personalizada,
        rodape_personalizado: config.rodape_personalizado,
      })
      setConfig(salva)
      toast({
        title: 'Preferências de e-mail salvas!',
        description: 'Sua mensagem personalizada e configurações de remetente estão ativas.',
      })
      onRecarregarGlobal?.()
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Tente novamente.'
      toast({
        title: 'Erro ao salvar preferências',
        description: msg,
        variant: 'destructive',
      })
    } finally {
      setSalvando(false)
    }
  }

  const handleDispararTeste = async () => {
    if (!emailTeste || !emailTeste.includes('@')) {
      toast({
        title: 'Informe um e-mail válido',
        description: 'Preencha o e-mail de destino para receber a mensagem de teste.',
        variant: 'destructive',
      })
      return
    }

    if (!user) return

    try {
      setTestando(true)
      // Salva antes do teste para garantir dados atualizados
      await diamondApi.salvarConfigEmailUsuario(user.id, {
        remetente_nome: config.remetente_nome,
        remetente_email: config.remetente_email,
        usar_resend_proprio: config.usar_resend_proprio,
        mensagem_personalizada: config.mensagem_personalizada,
        rodape_personalizado: config.rodape_personalizado,
      })

      const resp = await diamondApi.testarEnvioEmailUsuario()
      if (resp.sucesso) {
        toast({
          title: 'E-mail de teste enviado com sucesso!',
          description: `${resp.mensagem || 'E-mail disparado'} (Destino: ${resp.destinatario || emailTeste}, Modo: ${resp.modo_envio || 'resend'})`,
        })
      } else {
        toast({
          title: 'Falha no envio do e-mail de teste',
          description: resp.erro || 'O conector não pôde concluir o envio. Verifique a conexão.',
          variant: 'destructive',
        })
      }
    } catch (err: unknown) {
      const msg =
        err instanceof Error
          ? err.message
          : 'Verifique se o conector Resend está ativo e tente novamente.'
      toast({
        title: 'Erro ao testar envio',
        description: msg,
        variant: 'destructive',
      })
    } finally {
      setTestando(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Top Banner Explicativo */}
      <div className="bg-gradient-to-br from-teal-50/80 via-white to-amber-50/50 p-5 rounded-xl border border-[#0F766E]/20 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#0F766E]/10 text-[#0F766E] flex items-center justify-center shrink-0">
              <Mail className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-zinc-900">
                  Meu E-mail & Disparos Pessoais
                </h2>
                <Badge className="bg-[#0F766E] text-white text-[10px] font-semibold">
                  Personalização
                </Badge>
              </div>
              <p className="text-xs text-zinc-600 mt-1 max-w-2xl leading-relaxed">
                Personalize os convites que <strong>você</strong> envia para membros e parceiros.
                Você pode conectar sua própria conta do <strong>Resend</strong> ou utilizar a conta
                padrão do sistema como fallback automático.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <Button
              variant="outline"
              size="sm"
              onClick={carregarDados}
              disabled={loading || carregandoConector}
              className="text-xs border-zinc-300 gap-1.5"
            >
              <RefreshCw
                className={`w-3.5 h-3.5 ${loading || carregandoConector ? 'animate-spin' : ''}`}
              />
              <span>Atualizar</span>
            </Button>
            <Button
              size="sm"
              onClick={() => handleSalvar()}
              disabled={salvando}
              className="bg-[#0F766E] hover:bg-[#0D655E] text-white text-xs gap-1.5 shadow-xs"
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>{salvando ? 'Salvando...' : 'Salvar Alterações'}</span>
            </Button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Painel Esquerdo: Conector Resend + Preferências */}
        <div className="lg:col-span-7 space-y-6">
          {/* Card 1: Conexão do Resend Pessoal */}
          <Card className="border-[#E5E1D8] shadow-xs">
            <CardHeader className="pb-3 border-b border-zinc-100">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-zinc-900 text-white flex items-center justify-center">
                    <Key className="w-4 h-4" />
                  </div>
                  <div>
                    <CardTitle className="text-sm font-bold text-zinc-900">
                      Conexão Resend Própria
                    </CardTitle>
                    <CardDescription className="text-xs text-zinc-500">
                      Cada usuário pode conectar sua própria conta de disparo
                    </CardDescription>
                  </div>
                </div>

                {conectorConectado ? (
                  <Badge className="bg-emerald-100 text-emerald-800 border-emerald-300 text-[10px] font-semibold flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    Conectado
                  </Badge>
                ) : (
                  <Badge variant="outline" className="text-zinc-600 border-zinc-300 text-[10px]">
                    Não conectado (Usa Master)
                  </Badge>
                )}
              </div>
            </CardHeader>

            <CardContent className="pt-4 space-y-4">
              <div className="p-3.5 rounded-xl bg-zinc-50 border border-zinc-200/80 text-xs text-zinc-700 space-y-2">
                <div className="flex items-start gap-2">
                  <Info className="w-4 h-4 text-[#0F766E] shrink-0 mt-0.5" />
                  <div className="space-y-1">
                    <p className="font-semibold text-zinc-900">
                      Como funciona o disparo de convites?
                    </p>
                    <p className="text-zinc-600 leading-relaxed">
                      Quando você conecta o Resend pessoalmente, todos os convites criados por{' '}
                      <strong>você</strong> saem pela sua própria conta. Caso desconecte ou ocorra
                      indisponibilidade temporária, o sistema utiliza o remetente oficial
                      configurado pelo Master.
                    </p>
                  </div>
                </div>
              </div>

              {/* Botões de Ação do Conector */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-1">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-zinc-800">
                    Status da sua integração:
                  </span>
                  {carregandoConector ? (
                    <span className="text-xs text-zinc-500 flex items-center gap-1">
                      <RefreshCw className="w-3 h-3 animate-spin" /> Verificando...
                    </span>
                  ) : conectorConectado ? (
                    <span className="text-xs text-emerald-700 font-medium flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                      Pronto para envio pessoal
                    </span>
                  ) : (
                    <span className="text-xs text-amber-700 font-medium flex items-center gap-1">
                      <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                      Fallback no remetente Master
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  {conectorConectado ? (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleDesconectarResend}
                      disabled={conectandoPopup}
                      className="text-xs border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700 gap-1.5"
                    >
                      <Unlink className="w-3.5 h-3.5" />
                      <span>Desconectar Minha Conta</span>
                    </Button>
                  ) : (
                    <Button
                      size="sm"
                      onClick={handleConectarResend}
                      disabled={conectandoPopup}
                      className="bg-zinc-900 hover:bg-zinc-800 text-white text-xs gap-1.5 shadow-xs"
                    >
                      <Link2 className="w-3.5 h-3.5" />
                      <span>{conectandoPopup ? 'Abrindo...' : 'Conectar Minha Conta Resend'}</span>
                    </Button>
                  )}
                </div>
              </div>

              {/* Alternativa com ConnectorButton nativo */}
              <div className="pt-2 border-t border-zinc-100 flex items-center justify-between">
                <span className="text-[11px] text-zinc-500">
                  Ou utilize o botão oficial do conector do app:
                </span>
                <ConnectorButton toolkit="resend" name="Resend" />
              </div>

              {/* Toggle de Ativação do Resend Próprio */}
              <div className="pt-3 border-t border-zinc-100 flex items-center justify-between">
                <div className="space-y-0.5">
                  <label className="text-xs font-bold text-zinc-900 flex items-center gap-1.5">
                    Priorizar envio pela minha conta Resend
                  </label>
                  <p className="text-[11px] text-zinc-500">
                    Se desativado, usará sempre o remetente oficial da Agenda IA Diamond
                  </p>
                </div>
                <Switch
                  checked={config.usar_resend_proprio}
                  onCheckedChange={(checked) =>
                    setConfig((prev) => ({ ...prev, usar_resend_proprio: checked }))
                  }
                  disabled={!conectorConectado}
                />
              </div>
            </CardContent>
          </Card>

          {/* Card 2: Personalização da Mensagem do Convite */}
          <Card className="border-[#E5E1D8] shadow-xs">
            <CardHeader className="pb-3 border-b border-zinc-100">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-[#0F766E]/10 text-[#0F766E] flex items-center justify-center">
                  <Sparkles className="w-4 h-4" />
                </div>
                <div>
                  <CardTitle className="text-sm font-bold text-zinc-900">
                    Sua Assinatura & Mensagem dos Convites
                  </CardTitle>
                  <CardDescription className="text-xs text-zinc-500">
                    Texto personalizado inserido nos convites que você disparar
                  </CardDescription>
                </div>
              </div>
            </CardHeader>

            <CardContent className="pt-4 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-zinc-800">
                    Seu Nome de Exibição nos Convites
                  </label>
                  <Input
                    placeholder="ex: Dr. Carlos Silva (Seu Nome)"
                    value={config.remetente_nome || ''}
                    onChange={(e) =>
                      setConfig((prev) => ({ ...prev, remetente_nome: e.target.value }))
                    }
                    className="text-xs"
                  />
                  <p className="text-[11px] text-zinc-500">
                    Aparece no cabeçalho: &quot;[Nome] convidou você para colaborar&quot;
                  </p>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-zinc-800">
                    E-mail do Seu Resend (Remetente FROM)
                  </label>
                  <Input
                    placeholder="ex: convites@suaempresa.com.br"
                    value={config.remetente_email || ''}
                    onChange={(e) =>
                      setConfig((prev) => ({ ...prev, remetente_email: e.target.value }))
                    }
                    className="text-xs font-mono"
                  />
                  <p className="text-[11px] text-zinc-500">
                    Deve pertencer a um domínio verificado na sua conta Resend
                  </p>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-zinc-800 flex items-center justify-between">
                  <span>Mensagem Personalizada Padrão</span>
                  <span className="text-[11px] text-zinc-400 font-normal">
                    Adicionada aos seus convites
                  </span>
                </label>
                <Textarea
                  rows={4}
                  placeholder="ex: Olá! Estou convidando você para acompanhar nossas pautas e reuniões no Agenda IA Diamond. Basta clicar no botão abaixo para ativar seu acesso."
                  value={config.mensagem_personalizada || ''}
                  onChange={(e) =>
                    setConfig((prev) => ({ ...prev, mensagem_personalizada: e.target.value }))
                  }
                  className="text-xs leading-relaxed"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-zinc-800">
                  Rodapé Personalizado (Opcional)
                </label>
                <Input
                  placeholder="ex: Dúvidas? Fale diretamente com nossa assessoria via WhatsApp."
                  value={config.rodape_personalizado || ''}
                  onChange={(e) =>
                    setConfig((prev) => ({ ...prev, rodape_personalizado: e.target.value }))
                  }
                  className="text-xs"
                />
              </div>

              <div className="pt-2 flex justify-end">
                <Button
                  onClick={() => handleSalvar()}
                  disabled={salvando}
                  size="sm"
                  className="bg-[#0F766E] hover:bg-[#0D655E] text-white text-xs gap-1.5"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>{salvando ? 'Salvando...' : 'Salvar Preferências'}</span>
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Card 3: Teste de Disparo Real */}
          <Card className="border-[#E5E1D8] shadow-xs">
            <CardHeader className="pb-3 border-b border-zinc-100">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-amber-500/10 text-amber-600 flex items-center justify-center">
                  <Send className="w-4 h-4" />
                </div>
                <div>
                  <CardTitle className="text-sm font-bold text-zinc-900">
                    Disparo de E-mail de Teste
                  </CardTitle>
                  <CardDescription className="text-xs text-zinc-500">
                    Envie um e-mail de prova para validar seu remetente e visual
                  </CardDescription>
                </div>
              </div>
            </CardHeader>

            <CardContent className="pt-4 space-y-3">
              <p className="text-xs text-zinc-600">
                O teste disparará um e-mail completo com o layout oficial e suas personalizações. Se
                sua conta Resend estiver conectada e ativa, sairá diretamente por ela.
              </p>

              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 pt-1">
                <Input
                  type="email"
                  placeholder="Seu e-mail de teste (ex: meuemail@dominio.com)"
                  value={emailTeste}
                  onChange={(e) => setEmailTeste(e.target.value)}
                  className="text-xs font-mono flex-1"
                />
                <Button
                  onClick={handleDispararTeste}
                  disabled={testando || !emailTeste}
                  className="bg-[#1A1D21] hover:bg-[#2A2E33] text-white text-xs gap-1.5 shrink-0"
                >
                  <Send className={`w-3.5 h-3.5 ${testando ? 'animate-pulse' : ''}`} />
                  <span>{testando ? 'Disparando Teste...' : 'Enviar E-mail de Teste'}</span>
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Painel Direito: Preview do E-mail em Tempo Real */}
        <div className="lg:col-span-5 space-y-4">
          <Card className="border-[#E5E1D8] shadow-xs sticky top-20">
            <CardHeader className="pb-3 border-b border-zinc-100 bg-zinc-50/50">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Eye className="w-4 h-4 text-[#0F766E]" />
                  <CardTitle className="text-xs font-bold uppercase tracking-wider text-zinc-800">
                    Preview do Convite (Visão do Convidado)
                  </CardTitle>
                </div>
                <Badge variant="outline" className="text-[10px] text-zinc-500 border-zinc-200">
                  Visual Diamond
                </Badge>
              </div>
            </CardHeader>

            <CardContent className="p-4 space-y-4">
              {/* Moldura do E-mail */}
              <div className="rounded-xl border border-zinc-200 bg-white overflow-hidden shadow-xs text-xs">
                {/* Topo do E-mail */}
                <div
                  className="p-5 text-white text-center"
                  style={{ backgroundColor: templateSistema?.cor_cabecalho || '#1A1D21' }}
                >
                  <span
                    className="inline-block text-[10px] tracking-widest font-bold px-2 py-0.5 rounded-full mb-1 text-white"
                    style={{ backgroundColor: templateSistema?.cor_primaria || '#0F766E' }}
                  >
                    CONVITE DE EQUIPE
                  </span>
                  <h3 className="text-sm font-bold tracking-tight text-white mt-1">
                    {templateSistema?.titulo_cabecalho || 'AGENDA IA DIAMOND'}
                  </h3>
                  <p className="text-[10px] text-zinc-300 mt-0.5">
                    {templateSistema?.subtitulo_cabecalho ||
                      'Gestão Estratégica & Segundo Cérebro Executivo'}
                  </p>
                </div>

                {/* Corpo do E-mail */}
                <div className="p-5 space-y-3.5 bg-white text-zinc-800">
                  <div className="p-3 bg-teal-50/70 border border-teal-100 rounded-lg">
                    <p className="text-[11px] text-teal-900 leading-relaxed">
                      <strong>{config.remetente_nome || user?.name || 'Seu Nome'}</strong> convidou
                      você para colaborar na plataforma Agenda IA Diamond com acesso dedicado.
                    </p>
                  </div>

                  {config.mensagem_personalizada ? (
                    <div className="p-3 bg-amber-50/60 border border-amber-200/80 rounded-lg text-[11px] text-amber-950 italic">
                      &quot;{config.mensagem_personalizada}&quot;
                    </div>
                  ) : null}

                  {/* Informações do Acesso */}
                  <div className="border border-zinc-200 rounded-lg p-3 bg-zinc-50 space-y-1.5 text-[11px]">
                    <div className="flex justify-between">
                      <span className="text-zinc-500">Escopo atribuído:</span>
                      <strong className="text-zinc-900">Projeto / Fluxo / Workspace</strong>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-zinc-500">Nível de acesso:</span>
                      <strong className="text-zinc-900">Membro com Acesso Específico</strong>
                    </div>
                  </div>

                  {/* Botão de Ação */}
                  <div className="pt-2 text-center">
                    <div
                      className="inline-block px-4 py-2 text-xs font-bold text-white rounded-lg shadow-xs cursor-pointer"
                      style={{ backgroundColor: templateSistema?.cor_primaria || '#0F766E' }}
                    >
                      {templateSistema?.texto_botao_aceite || 'Aceitar Convite e Acessar'}
                    </div>
                  </div>

                  {/* Rodapé do E-mail */}
                  <div className="pt-3 border-t border-zinc-100 text-[10px] text-zinc-400 text-center space-y-1">
                    {config.rodape_personalizado ? (
                      <p className="text-zinc-600 font-medium">{config.rodape_personalizado}</p>
                    ) : null}
                    <p>
                      {templateSistema?.texto_rodape ||
                        'Enviado automaticamente por Agenda IA Diamond • Não responda a este e-mail.'}
                    </p>
                  </div>
                </div>
              </div>

              {/* Informações Técnicas */}
              <div className="p-3 bg-zinc-50 rounded-lg border border-zinc-200/70 text-[11px] text-zinc-600 space-y-1">
                <div className="flex items-center gap-1.5 font-semibold text-zinc-800">
                  <Server className="w-3.5 h-3.5 text-[#0F766E]" />
                  <span>Roteamento do E-mail:</span>
                </div>
                <p>
                  • Remetente efetivo:{' '}
                  <strong>
                    {config.usar_resend_proprio && conectorConectado && config.remetente_email
                      ? `${config.remetente_nome || user?.name} <${config.remetente_email}> (Seu Resend)`
                      : `${templateSistema?.remetente_nome || 'Agenda IA Diamond'} <${templateSistema?.remetente_email || 'onboarding@resend.dev'}> (Sistema Master)`}
                  </strong>
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
