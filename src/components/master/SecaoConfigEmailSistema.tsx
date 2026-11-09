import React, { useState, useEffect } from 'react'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import {
  Mail,
  RefreshCw,
  Save,
  CheckCircle2,
  AlertTriangle,
  Eye,
  Sliders,
  Sparkles,
  ExternalLink,
  RotateCcw,
} from 'lucide-react'
import { toast } from '@/hooks/use-toast'
import { diamondApi } from '@/services/diamondApi'
import type { ConfigEmailSistema } from '@/types'

interface SecaoConfigEmailSistemaProps {
  statusResend: {
    conectado: boolean
    detalhe: string
    remetente_padrao?: string
    testado_em?: string
  } | null
  testandoResend: boolean
  onChecarStatusResend: () => void
}

const CONFIG_PADRAO: Omit<ConfigEmailSistema, 'id' | 'created' | 'updated'> = {
  remetente_nome: 'Agenda IA Diamond',
  remetente_email: 'onboarding@resend.dev',
  assunto_convite: 'Convite de Equipe: {convidador} convidou você para o Agenda IA Diamond',
  titulo_cabecalho: 'AGENDA IA DIAMOND',
  subtitulo_cabecalho: 'Gestão Estratégica & Segundo Cérebro Executivo',
  texto_apresentacao:
    'convidou você para colaborar na plataforma Agenda IA Diamond com acesso dedicado.',
  texto_botao_aceite: 'Aceitar Convite e Acessar',
  cor_primaria: '#0F766E',
  cor_cabecalho: '#1A1D21',
  texto_rodape: 'Enviado automaticamente por Agenda IA Diamond • Não responda a este e-mail.',
  ativo: true,
}

export const SecaoConfigEmailSistema: React.FC<SecaoConfigEmailSistemaProps> = ({
  statusResend,
  testandoResend,
  onChecarStatusResend,
}) => {
  const [config, setConfig] =
    useState<Omit<ConfigEmailSistema, 'id' | 'created' | 'updated'>>(CONFIG_PADRAO)
  const [carregando, setCarregando] = useState(true)
  const [salvando, setSalvando] = useState(false)
  const [abaTemplate, setAbaTemplate] = useState<'convite' | 'notificacao'>('convite')
  const [previewAba, setPreviewAba] = useState<'desktop' | 'mobile'>('desktop')

  useEffect(() => {
    async function carregar() {
      try {
        setCarregando(true)
        const salvo = await diamondApi.getConfigEmailSistema()
        if (salvo) {
          setConfig({
            remetente_nome: salvo.remetente_nome || CONFIG_PADRAO.remetente_nome,
            remetente_email: salvo.remetente_email || CONFIG_PADRAO.remetente_email,
            assunto_convite: salvo.assunto_convite || CONFIG_PADRAO.assunto_convite,
            titulo_cabecalho: salvo.titulo_cabecalho || CONFIG_PADRAO.titulo_cabecalho,
            subtitulo_cabecalho: salvo.subtitulo_cabecalho || CONFIG_PADRAO.subtitulo_cabecalho,
            texto_apresentacao: salvo.texto_apresentacao || CONFIG_PADRAO.texto_apresentacao,
            texto_botao_aceite: salvo.texto_botao_aceite || CONFIG_PADRAO.texto_botao_aceite,
            cor_primaria: salvo.cor_primaria || CONFIG_PADRAO.cor_primaria,
            cor_cabecalho: salvo.cor_cabecalho || CONFIG_PADRAO.cor_cabecalho,
            texto_rodape: salvo.texto_rodape || CONFIG_PADRAO.texto_rodape,
            ativo: salvo.ativo !== undefined ? salvo.ativo : true,
          })
        }
      } catch (err) {
        console.error('Erro ao carregar configurações de e-mail do sistema:', err)
      } finally {
        setCarregando(false)
      }
    }
    carregar()
  }, [])

  const handleSalvar = async () => {
    try {
      setSalvando(true)
      await diamondApi.salvarConfigEmailSistema(config)
      toast({
        title: 'Configurações de e-mail salvas',
        description: 'Os templates e remetente padrão do sistema foram atualizados com sucesso.',
      })
      onChecarStatusResend()
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erro ao salvar'
      toast({
        title: 'Erro ao salvar',
        description: msg,
        variant: 'destructive',
      })
    } finally {
      setSalvando(false)
    }
  }

  const handleRestaurarPadrao = () => {
    setConfig(CONFIG_PADRAO)
    toast({
      title: 'Padrões restaurados no formulário',
      description: 'Clique em "Salvar Configuração de E-mail" para aplicar os valores originais.',
    })
  }

  return (
    <Card className="border-[#0F766E]/40 bg-white shadow-xs">
      <CardHeader className="pb-3 border-b border-[#E5E1D8]">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="space-y-0.5">
            <CardTitle className="text-base font-bold text-zinc-900 flex items-center gap-2">
              <Mail className="w-5 h-5 text-[#0F766E]" />
              <span>E-mail & Notificações do Sistema (Resend Central do Master)</span>
            </CardTitle>
            <CardDescription className="text-xs text-zinc-600">
              Personalize o remetente oficial, os templates visuais de convite e notificações da
              plataforma, com preview em tempo real.
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            {testandoResend ? (
              <Badge
                variant="outline"
                className="bg-zinc-50 text-zinc-600 border-zinc-300 text-[11px] gap-1.5 py-1"
              >
                <RefreshCw className="w-3 h-3 animate-spin text-[#0F766E]" />
                <span>Verificando Resend...</span>
              </Badge>
            ) : statusResend?.conectado ? (
              <Badge className="bg-emerald-600 text-white text-[11px] font-semibold gap-1.5 py-1">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Resend Conectado (Ativo)</span>
              </Badge>
            ) : (
              <Badge
                variant="outline"
                className="bg-amber-50 text-amber-800 border-amber-300 text-[11px] font-semibold gap-1.5 py-1"
              >
                <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                <span>Pendente / Inativo</span>
              </Badge>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={onChecarStatusResend}
              disabled={testandoResend}
              className="text-xs h-7 px-2.5 border-zinc-300 gap-1 text-zinc-700"
              title="Testar conexão Resend"
            >
              <RefreshCw className={`w-3 h-3 ${testandoResend ? 'animate-spin' : ''}`} />
              <span>Testar Conexão</span>
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-4 sm:p-6 space-y-6">
        {/* Resumo do Status do Conector do Master */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="bg-[#FAF8F5] p-3 rounded-lg border border-[#E5E1D8]">
            <span className="text-[11px] text-zinc-500 font-medium block">Modo de Operação</span>
            <span className="text-xs font-bold text-zinc-800 flex items-center gap-1 mt-0.5">
              <Sparkles className="w-3.5 h-3.5 text-[#0F766E]" />
              Conta Pessoal por Usuário (Resend)
            </span>
            <span className="text-[10px] text-zinc-500 mt-1 block">
              Cada usuário conecta a sua própria conta Resend em Configurações &gt; E-mail &amp;
              Convites para disparos dedicados.
            </span>
          </div>

          <div className="bg-[#FAF8F5] p-3 rounded-lg border border-[#E5E1D8]">
            <span className="text-[11px] text-zinc-500 font-medium block">
              Remetente Atual no Hook
            </span>
            <span
              className="text-xs font-bold text-zinc-800 truncate block mt-0.5"
              title={`${config.remetente_nome} <${config.remetente_email}>`}
            >
              {config.remetente_nome} &lt;{config.remetente_email}&gt;
            </span>
            <span className="text-[10px] text-zinc-500 mt-1 block">
              Nome e endereço que os destinatários veem na caixa de entrada.
            </span>
          </div>

          <div className="bg-[#FAF8F5] p-3 rounded-lg border border-[#E5E1D8]">
            <span className="text-[11px] text-zinc-500 font-medium block">Diagnóstico</span>
            <span
              className={`text-xs font-semibold block mt-0.5 truncate ${statusResend?.conectado ? 'text-emerald-700' : 'text-amber-800'}`}
            >
              {statusResend?.detalhe || 'Aguardando teste'}
            </span>
            <span className="text-[10px] text-zinc-500 mt-1 block">
              {statusResend?.testado_em
                ? `Testado: ${new Date(statusResend.testado_em).toLocaleTimeString('pt-BR')}`
                : 'Erros de envio são gravados detalhadamente em cada convite.'}
            </span>
          </div>
        </div>

        {/* Formulário + Preview Lado a Lado */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Coluna de Configuração (7 colunas) */}
          <div className="lg:col-span-7 space-y-4">
            <div className="bg-[#FAF8F5] p-4 rounded-xl border border-[#E5E1D8] space-y-4">
              <div className="flex items-center justify-between border-b border-[#E5E1D8] pb-2">
                <span className="text-xs font-bold text-zinc-800 flex items-center gap-1.5 uppercase tracking-wider">
                  <Sliders className="w-3.5 h-3.5 text-[#0F766E]" />
                  Remetente Padrão do Sistema
                </span>
                <span className="text-[11px] text-zinc-500">
                  Aplica para todos os convites gerais
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs font-medium text-zinc-700">
                    Nome de Exibição (From Name)
                  </Label>
                  <Input
                    value={config.remetente_nome}
                    onChange={(e) =>
                      setConfig((prev) => ({ ...prev, remetente_nome: e.target.value }))
                    }
                    placeholder="Ex: Agenda IA Diamond"
                    className="mt-1 h-9 text-xs bg-white"
                  />
                  <span className="text-[10px] text-zinc-400 mt-0.5 block">
                    Nome visível no cabeçalho do e-mail
                  </span>
                </div>

                <div>
                  <Label className="text-xs font-medium text-zinc-700">
                    E-mail Remetente (From Email)
                  </Label>
                  <Input
                    value={config.remetente_email}
                    onChange={(e) =>
                      setConfig((prev) => ({ ...prev, remetente_email: e.target.value }))
                    }
                    placeholder="onboarding@resend.dev"
                    className="mt-1 h-9 text-xs bg-white font-mono"
                  />
                  <span className="text-[10px] text-zinc-400 mt-0.5 block">
                    Use domínio verificado no Resend ou{' '}
                    <code className="bg-zinc-100 px-1 rounded">onboarding@resend.dev</code>
                  </span>
                </div>
              </div>
            </div>

            {/* Customização de Templates */}
            <div className="bg-white p-4 rounded-xl border border-[#E5E1D8] space-y-4">
              <div className="flex items-center justify-between border-b border-zinc-100 pb-2">
                <span className="text-xs font-bold text-zinc-800 flex items-center gap-1.5 uppercase tracking-wider">
                  <Mail className="w-3.5 h-3.5 text-[#0F766E]" />
                  Personalização de Template
                </span>
                <Tabs
                  value={abaTemplate}
                  onValueChange={(v) => setAbaTemplate(v as 'convite' | 'notificacao')}
                >
                  <TabsList className="h-7 bg-zinc-100 p-0.5">
                    <TabsTrigger value="convite" className="text-[11px] px-2.5 h-6">
                      Convite de Equipe
                    </TabsTrigger>
                    <TabsTrigger value="notificacao" className="text-[11px] px-2.5 h-6">
                      Notificações Gerais
                    </TabsTrigger>
                  </TabsList>
                </Tabs>
              </div>

              {abaTemplate === 'convite' && (
                <div className="space-y-3">
                  <div>
                    <Label className="text-xs font-medium text-zinc-700">Assunto do E-mail</Label>
                    <Input
                      value={config.assunto_convite}
                      onChange={(e) =>
                        setConfig((prev) => ({ ...prev, assunto_convite: e.target.value }))
                      }
                      placeholder="Convite de Equipe: {convidador} convidou você..."
                      className="mt-1 h-9 text-xs"
                    />
                    <span className="text-[10px] text-zinc-400 mt-0.5 block">
                      Variáveis disponíveis:{' '}
                      <code className="bg-zinc-100 px-1 rounded font-mono text-[10px]">
                        {'{convidador}'}
                      </code>
                      ,{' '}
                      <code className="bg-zinc-100 px-1 rounded font-mono text-[10px]">
                        {'{escopo}'}
                      </code>
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <Label className="text-xs font-medium text-zinc-700">
                        Título no Cabeçalho
                      </Label>
                      <Input
                        value={config.titulo_cabecalho}
                        onChange={(e) =>
                          setConfig((prev) => ({ ...prev, titulo_cabecalho: e.target.value }))
                        }
                        placeholder="AGENDA IA DIAMOND"
                        className="mt-1 h-9 text-xs"
                      />
                    </div>
                    <div>
                      <Label className="text-xs font-medium text-zinc-700">
                        Subtítulo no Cabeçalho
                      </Label>
                      <Input
                        value={config.subtitulo_cabecalho}
                        onChange={(e) =>
                          setConfig((prev) => ({ ...prev, subtitulo_cabecalho: e.target.value }))
                        }
                        placeholder="Gestão Estratégica & Segundo Cérebro Executivo"
                        className="mt-1 h-9 text-xs"
                      />
                    </div>
                  </div>

                  <div>
                    <Label className="text-xs font-medium text-zinc-700">
                      Texto de Apresentação (após o nome do convidador)
                    </Label>
                    <Textarea
                      rows={2}
                      value={config.texto_apresentacao}
                      onChange={(e) =>
                        setConfig((prev) => ({ ...prev, texto_apresentacao: e.target.value }))
                      }
                      placeholder="convidou você para colaborar na plataforma Agenda IA Diamond com acesso dedicado."
                      className="mt-1 text-xs resize-none"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="sm:col-span-1">
                      <Label className="text-xs font-medium text-zinc-700">
                        Texto do Botão de Aceite
                      </Label>
                      <Input
                        value={config.texto_botao_aceite}
                        onChange={(e) =>
                          setConfig((prev) => ({ ...prev, texto_botao_aceite: e.target.value }))
                        }
                        placeholder="Aceitar Convite e Acessar"
                        className="mt-1 h-9 text-xs"
                      />
                    </div>

                    <div>
                      <Label className="text-xs font-medium text-zinc-700">
                        Cor do Botão (Primária)
                      </Label>
                      <div className="flex items-center gap-2 mt-1">
                        <input
                          type="color"
                          value={config.cor_primaria}
                          onChange={(e) =>
                            setConfig((prev) => ({ ...prev, cor_primaria: e.target.value }))
                          }
                          className="w-8 h-8 rounded border border-zinc-200 cursor-pointer"
                        />
                        <Input
                          value={config.cor_primaria}
                          onChange={(e) =>
                            setConfig((prev) => ({ ...prev, cor_primaria: e.target.value }))
                          }
                          className="h-8 text-xs font-mono uppercase"
                        />
                      </div>
                    </div>

                    <div>
                      <Label className="text-xs font-medium text-zinc-700">Cor do Cabeçalho</Label>
                      <div className="flex items-center gap-2 mt-1">
                        <input
                          type="color"
                          value={config.cor_cabecalho}
                          onChange={(e) =>
                            setConfig((prev) => ({ ...prev, cor_cabecalho: e.target.value }))
                          }
                          className="w-8 h-8 rounded border border-zinc-200 cursor-pointer"
                        />
                        <Input
                          value={config.cor_cabecalho}
                          onChange={(e) =>
                            setConfig((prev) => ({ ...prev, cor_cabecalho: e.target.value }))
                          }
                          className="h-8 text-xs font-mono uppercase"
                        />
                      </div>
                    </div>
                  </div>

                  <div>
                    <Label className="text-xs font-medium text-zinc-700">Texto do Rodapé</Label>
                    <Input
                      value={config.texto_rodape}
                      onChange={(e) =>
                        setConfig((prev) => ({ ...prev, texto_rodape: e.target.value }))
                      }
                      placeholder="Enviado automaticamente por Agenda IA Diamond • Não responda a este e-mail."
                      className="mt-1 h-9 text-xs"
                    />
                  </div>
                </div>
              )}

              {abaTemplate === 'notificacao' && (
                <div className="space-y-3">
                  <div className="p-3 bg-teal-50/70 border border-teal-200 rounded-lg text-xs text-teal-900 leading-relaxed">
                    <p className="font-semibold mb-1 flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-[#0F766E]" />
                      Identidade Visual das Notificações
                    </p>
                    As notificações transacionais (atribuição de card, menções e lembretes) herdam
                    as cores corporativas, cabeçalho e rodapé configurados acima.
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <Label className="text-xs font-medium text-zinc-700">
                        Cor dos Alertas Importantes
                      </Label>
                      <div className="flex items-center gap-2 mt-1">
                        <input
                          type="color"
                          value={config.cor_primaria}
                          onChange={(e) =>
                            setConfig((prev) => ({ ...prev, cor_primaria: e.target.value }))
                          }
                          className="w-8 h-8 rounded border border-zinc-200 cursor-pointer"
                        />
                        <Input
                          value={config.cor_primaria}
                          onChange={(e) =>
                            setConfig((prev) => ({ ...prev, cor_primaria: e.target.value }))
                          }
                          className="h-8 text-xs font-mono uppercase"
                        />
                      </div>
                    </div>

                    <div>
                      <Label className="text-xs font-medium text-zinc-700">
                        Rodapé de Notificações
                      </Label>
                      <Input
                        value={config.texto_rodape}
                        onChange={(e) =>
                          setConfig((prev) => ({ ...prev, texto_rodape: e.target.value }))
                        }
                        className="mt-1 h-9 text-xs"
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Ações de Salvar / Restaurar */}
            <div className="flex items-center justify-between pt-1">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleRestaurarPadrao}
                className="text-xs text-zinc-500 hover:text-zinc-800 gap-1.5"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Restaurar Padrão Diamond</span>
              </Button>

              <Button
                onClick={handleSalvar}
                disabled={salvando || carregando}
                className="bg-[#0F766E] hover:bg-[#0D655E] text-white text-xs font-semibold gap-1.5 shadow-sm"
              >
                {salvando ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Salvando...</span>
                  </>
                ) : (
                  <>
                    <Save className="w-3.5 h-3.5" />
                    <span>Salvar Configuração de E-mail</span>
                  </>
                )}
              </Button>
            </div>
          </div>

          {/* Coluna de Preview ao Vivo (5 colunas) */}
          <div className="lg:col-span-5 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-xs font-bold text-zinc-800 uppercase tracking-wider">
                <Eye className="w-3.5 h-3.5 text-[#0F766E]" />
                <span>Preview ao Vivo do E-mail</span>
              </div>
              <div className="flex items-center gap-1 bg-zinc-100 p-0.5 rounded-md">
                <button
                  type="button"
                  onClick={() => setPreviewAba('desktop')}
                  className={`text-[10px] px-2 py-0.5 rounded ${previewAba === 'desktop' ? 'bg-white font-bold text-zinc-900 shadow-2xs' : 'text-zinc-500'}`}
                >
                  Desktop
                </button>
                <button
                  type="button"
                  onClick={() => setPreviewAba('mobile')}
                  className={`text-[10px] px-2 py-0.5 rounded ${previewAba === 'mobile' ? 'bg-white font-bold text-zinc-900 shadow-2xs' : 'text-zinc-500'}`}
                >
                  Mobile
                </button>
              </div>
            </div>

            {/* Container simulando cliente de e-mail */}
            <div
              className={`border border-[#E5E1D8] rounded-xl overflow-hidden bg-[#FAFAF9] shadow-xs transition-all mx-auto ${
                previewAba === 'mobile' ? 'max-w-[340px]' : 'w-full'
              }`}
            >
              {/* Barra superior do cliente de e-mail */}
              <div className="bg-zinc-200/80 px-3 py-2 border-b border-zinc-300/80 flex items-center justify-between text-[11px] text-zinc-600">
                <div className="truncate">
                  <strong className="text-zinc-800">De:</strong> {config.remetente_nome} &lt;
                  {config.remetente_email}&gt;
                </div>
                <Badge
                  variant="outline"
                  className="text-[9px] bg-white border-zinc-300 py-0 px-1.5"
                >
                  HTML
                </Badge>
              </div>

              <div className="p-2 sm:p-3 text-[11px] text-zinc-700 border-b border-zinc-200 bg-white">
                <span className="font-semibold text-zinc-900">Assunto: </span>
                {config.assunto_convite
                  .replace('{convidador}', 'Carlos Silva (Master)')
                  .replace('{escopo}', 'Workspace Geral')}
              </div>

              {/* Corpo do e-mail renderizado */}
              <div className="p-4 sm:p-5 space-y-4">
                {/* Header */}
                <div
                  style={{ backgroundColor: config.cor_cabecalho }}
                  className="p-4 rounded-xl text-center shadow-xs"
                >
                  <h1 className="text-white text-sm font-bold tracking-wide m-0">
                    {config.titulo_cabecalho}
                  </h1>
                  <p className="text-zinc-300 text-[10px] mt-1 m-0">{config.subtitulo_cabecalho}</p>
                </div>

                {/* Card principal */}
                <div className="bg-white p-4 rounded-xl border border-[#E5E1D8] space-y-3 shadow-2xs">
                  <h2 className="text-xs font-bold text-zinc-900 m-0">
                    Você recebeu um convite de equipe
                  </h2>
                  <p className="text-[11px] text-zinc-600 leading-relaxed m-0">
                    Olá, <strong>novo.membro@empresa.com</strong>.<br />
                    <strong>Carlos Silva (Master)</strong> {config.texto_apresentacao}
                  </p>

                  <div
                    style={{ borderLeftColor: config.cor_primaria }}
                    className="bg-zinc-50 border-l-4 p-2.5 rounded-sm space-y-1 text-[11px] text-zinc-700"
                  >
                    <div>
                      <strong>Acesso atribuído:</strong> Workspace Geral
                    </div>
                    <div>
                      <strong>Nível de permissão:</strong> Editor / Membro Ativo
                    </div>
                  </div>

                  <div className="text-center pt-2 pb-1">
                    <div
                      style={{ backgroundColor: config.cor_primaria }}
                      className="inline-block text-white text-xs font-semibold px-5 py-2.5 rounded-lg shadow-xs cursor-default"
                    >
                      {config.texto_botao_aceite}
                    </div>
                  </div>

                  <p className="text-[10px] text-zinc-400 text-center m-0">
                    Link direto:{' '}
                    <span style={{ color: config.cor_primaria }} className="underline">
                      https://agenda-ia-diamond.goskip.app/convite/...
                    </span>
                  </p>
                </div>

                {/* Rodapé */}
                <div className="text-center text-[10px] text-zinc-400 space-y-0.5">
                  <p className="m-0">{config.texto_rodape}</p>
                  <p className="m-0 text-[9px]">Este convite expira em 7 dias a partir do envio.</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

export default SecaoConfigEmailSistema
