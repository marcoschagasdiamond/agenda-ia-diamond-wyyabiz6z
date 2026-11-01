import React, { useState, useEffect, useTransition } from 'react'
import {
  MessageSquare,
  CheckCircle2,
  RefreshCw,
  SlidersHorizontal,
  Users,
  FolderTree,
  AlertCircle,
  HelpCircle,
  UserCheck,
  Search,
  Check,
  Eye,
  Trash2,
} from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Checkbox } from '@/components/ui/checkbox'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { toast } from '@/hooks/use-toast'
import { ConnectorButton } from '@/components/skip/ConnectorButton'
import { diamondApi } from '@/services/diamondApi'
import type {
  WhatsAppConfig,
  WhatsAppContatoItem,
  WhatsAppGrupoItem,
  WhatsAppModoSelecao,
  WhatsAppStatusResponse,
} from '@/types'

interface GestaoWhatsAppProps {
  onRecarregarGlobal?: () => void
}

export function GestaoWhatsApp({ onRecarregarGlobal }: GestaoWhatsAppProps) {
  const [, startTransition] = useTransition()
  const [carregando, setCarregando] = useState(true)
  const [salvandoConfig, setSalvandoConfig] = useState(false)
  const [sincronizando, setSincronizando] = useState(false)

  // Status retornado pelo backend
  const [status, setStatus] = useState<WhatsAppStatusResponse | null>(null)

  // Configuração local editável
  const [modoSelecao, setModoSelecao] = useState<WhatsAppModoSelecao>('todos_exceto')
  const [contatosEscolhidos, setContatosEscolhidos] = useState<string[]>([])
  const [contatosIgnorados, setContatosIgnorados] = useState<string[]>([])
  const [gruposEscolhidos, setGruposEscolhidos] = useState<string[]>([])

  // Lista de contatos e grupos carregados
  const [contatosLista, setContatosLista] = useState<WhatsAppContatoItem[]>([])
  const [gruposLista, setGruposLista] = useState<WhatsAppGrupoItem[]>([])
  const [gruposAviso, setGruposAviso] = useState<string | null>(null)

  // Filtros de busca na tabela
  const [buscaContato, setBuscaContato] = useState('')
  const [buscaGrupo, setBuscaGrupo] = useState('')
  const [abaLista, setAbaLista] = useState<'contatos' | 'grupos'>('contatos')

  // Último resultado de sincronização
  const [ultimoResultadoSync, setUltimoResultadoSync] = useState<{
    mensagens_novas: number
    mensagens_processadas?: number
    mensagem?: string
    detalhes?: {
      message_id: string
      folha_id?: string
      remetente?: string
      numero?: string
      is_grupo?: boolean
      grupo?: string
      contato_vinculado?: string | null
    }[]
  } | null>(null)

  const normalizarNumero = (val?: string) => (val || '').replace(/\D/g, '')

  const carregarDados = async () => {
    try {
      setCarregando(true)
      const resStatus = await diamondApi.getWhatsAppStatus()
      setStatus(resStatus)

      if (resStatus.config) {
        setModoSelecao(resStatus.config.modo_selecao || 'todos_exceto')
        setContatosEscolhidos(resStatus.config.contatos_escolhidos || [])
        setContatosIgnorados(resStatus.config.contatos_ignorados || [])
        setGruposEscolhidos(resStatus.config.grupos_escolhidos || [])
      }

      // Buscar lista de contatos e grupos
      const resListas = await diamondApi.getWhatsAppContatosGrupos()
      setContatosLista(resListas.contatos || [])
      setGruposLista(resListas.grupos || [])
      setGruposAviso(resListas.grupos_aviso || null)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erro ao carregar dados do WhatsApp'
      toast({ title: 'Aviso de Conexão WhatsApp', description: msg, variant: 'default' })
    } finally {
      setCarregando(false)
    }
  }

  useEffect(() => {
    carregarDados()
  }, [])

  const salvarConfiguracoes = async (novasConfiguracoes?: Partial<WhatsAppConfig>) => {
    setSalvandoConfig(true)
    try {
      const payload: Partial<WhatsAppConfig> = {
        modo_selecao: novasConfiguracoes?.modo_selecao ?? modoSelecao,
        contatos_escolhidos: novasConfiguracoes?.contatos_escolhidos ?? contatosEscolhidos,
        contatos_ignorados: novasConfiguracoes?.contatos_ignorados ?? contatosIgnorados,
        grupos_escolhidos: novasConfiguracoes?.grupos_escolhidos ?? gruposEscolhidos,
      }

      await diamondApi.salvarWhatsAppConfig(payload)
      toast({
        title: 'Preferências de WhatsApp salvas',
        description: 'Regras de sincronização atualizadas com sucesso.',
      })
      if (novasConfiguracoes?.modo_selecao) setModoSelecao(novasConfiguracoes.modo_selecao)
      if (novasConfiguracoes?.contatos_escolhidos)
        setContatosEscolhidos(novasConfiguracoes.contatos_escolhidos)
      if (novasConfiguracoes?.contatos_ignorados)
        setContatosIgnorados(novasConfiguracoes.contatos_ignorados)
      if (novasConfiguracoes?.grupos_escolhidos)
        setGruposEscolhidos(novasConfiguracoes.grupos_escolhidos)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Falha ao salvar preferências'
      toast({ title: 'Erro ao salvar regras', description: msg, variant: 'destructive' })
    } finally {
      setSalvandoConfig(false)
    }
  }

  const handleSincronizarAgora = async () => {
    setSincronizando(true)
    try {
      const res = await diamondApi.sincronizarWhatsAppAgora()
      setUltimoResultadoSync({
        mensagens_novas: res.mensagens_novas,
        mensagens_processadas: res.mensagens_processadas,
        mensagem: res.mensagem,
        detalhes: res.detalhes,
      })

      if (res.mensagens_novas > 0) {
        toast({
          title: 'Sincronização Concluída',
          description: `${res.mensagens_novas} nova(s) mensagem(ns) transformada(s) em assunto(s) na Folha do Dia!`,
        })
        onRecarregarGlobal?.()
      } else {
        toast({
          title: 'Sincronização Realizada',
          description:
            res.mensagem || 'Nenhuma nova mensagem recebida atendeu aos filtros selecionados.',
        })
      }

      // Atualizar lista de remetentes recém-descobertos
      const resListas = await diamondApi.getWhatsAppContatosGrupos()
      setContatosLista(resListas.contatos || [])
      setGruposLista(resListas.grupos || [])
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Falha ao sincronizar'
      toast({ title: 'Erro na Sincronização', description: msg, variant: 'destructive' })
    } finally {
      setSincronizando(false)
    }
  }

  // Toggle para contatos escolhidos (modo apenas_escolhidos)
  const toggleContatoEscolhido = (identificador: string) => {
    const num = normalizarNumero(identificador) || identificador
    let novaLista: string[] = []
    if (contatosEscolhidos.includes(num)) {
      novaLista = contatosEscolhidos.filter((c) => c !== num)
    } else {
      novaLista = [...contatosEscolhidos, num]
    }
    setContatosEscolhidos(novaLista)
    salvarConfiguracoes({ contatos_escolhidos: novaLista })
  }

  // Toggle para contatos ignorados (modo todos_exceto)
  const toggleContatoIgnorado = (identificador: string) => {
    const num = normalizarNumero(identificador) || identificador
    let novaLista: string[] = []
    if (contatosIgnorados.includes(num)) {
      novaLista = contatosIgnorados.filter((c) => c !== num)
    } else {
      novaLista = [...contatosIgnorados, num]
    }
    setContatosIgnorados(novaLista)
    salvarConfiguracoes({ contatos_ignorados: novaLista })
  }

  // Toggle para grupos escolhidos (Requisito 3: grupos só entram se marcados explicitamente)
  const toggleGrupoEscolhido = (grupoIdOuNome: string) => {
    const chave = String(grupoIdOuNome).trim()
    let novaLista: string[] = []
    if (gruposEscolhidos.includes(chave)) {
      novaLista = gruposEscolhidos.filter((g) => g !== chave)
    } else {
      novaLista = [...gruposEscolhidos, chave]
    }
    setGruposEscolhidos(novaLista)
    salvarConfiguracoes({ grupos_escolhidos: novaLista })
  }

  // Filtragem na interface
  const contatosFiltrados = contatosLista.filter((c) => {
    if (!buscaContato.trim()) return true
    const b = buscaContato.toLowerCase()
    return (
      (c.nome || '').toLowerCase().includes(b) ||
      (c.telefone || '').toLowerCase().includes(b) ||
      (c.empresa || '').toLowerCase().includes(b)
    )
  })

  const gruposFiltrados = gruposLista.filter((g) => {
    if (!buscaGrupo.trim()) return true
    const b = buscaGrupo.toLowerCase()
    return (g.nome || '').toLowerCase().includes(b) || (g.id || '').toLowerCase().includes(b)
  })

  return (
    <div className="space-y-6">
      {/* 1. Header do Módulo com Conexão de Conta do Próprio Usuário */}
      <Card className="border-[#E5E1D8] bg-white shadow-xs">
        <CardHeader className="pb-4 border-b border-[#E5E1D8]/70">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-700 flex items-center justify-center shrink-0 border border-emerald-500/20">
                <MessageSquare className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <CardTitle className="text-base font-bold text-[#1A1D21]">
                    WhatsApp Diamond • Sincronização Inteligente
                  </CardTitle>
                  {status?.conectado ? (
                    <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 text-[10px] font-semibold gap-1">
                      <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                      Conta Conectada
                    </Badge>
                  ) : (
                    <Badge
                      variant="outline"
                      className="text-[10px] text-amber-700 border-amber-300 bg-amber-50"
                    >
                      Desconectado
                    </Badge>
                  )}
                </div>
                <CardDescription className="text-xs text-[#5B6470] mt-1">
                  Modo individual: cada usuário do sistema conecta sua própria conta do WhatsApp
                  para sincronizar assuntos na sua Folha do Dia com triagem inteligente de contatos
                  e grupos.
                </CardDescription>
              </div>
            </div>

            {/* Injected ConnectorButton do usuário para o toolkit WhatsApp */}
            <div className="flex items-center gap-2 shrink-0">
              <ConnectorButton toolkit="whatsapp" name="WhatsApp" />

              <Button
                size="sm"
                variant="outline"
                onClick={carregarDados}
                disabled={carregando}
                className="text-xs h-9 border-[#E5E1D8] gap-1.5"
                title="Recarregar status e contatos"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${carregando ? 'animate-spin' : ''}`} />
                <span>Atualizar</span>
              </Button>
            </div>
          </div>
        </CardHeader>

        {/* Linha de status do número ativo e disparo manual */}
        <CardContent className="p-4 bg-[#FAFAF9] flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs">
          <div className="space-y-0.5">
            <span className="font-semibold text-[#1A1D21] flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" />
              {status?.phone_numbers && status.phone_numbers.length > 0
                ? `Número WhatsApp: ${status.phone_numbers[0].display_phone_number || status.phone_numbers[0].id} (${status.phone_numbers[0].verified_name || 'Business'})`
                : status?.conectado
                  ? 'Conta vinculada no conector Diamond'
                  : 'Nenhuma conta de WhatsApp conectada no momento.'}
            </span>
            <p className="text-[11px] text-[#5B6470]">
              {status?.config?.ultima_sincronizacao
                ? `Última sincronização executada em: ${new Date(status.config.ultima_sincronizacao).toLocaleString('pt-BR')}`
                : 'Nenhuma sincronização de mensagens executada ainda.'}
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <Button
              size="sm"
              onClick={handleSincronizarAgora}
              disabled={sincronizando || !status?.conectado}
              className="bg-[#0F766E] hover:bg-[#0D5C56] text-white text-xs h-8 px-3 gap-1.5 font-medium shadow-2xs"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${sincronizando ? 'animate-spin' : ''}`} />
              <span>{sincronizando ? 'Sincronizando...' : 'Sincronizar Mensagens Agora'}</span>
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Alerta de último resultado de sincronização */}
      {ultimoResultadoSync && (
        <div className="p-3 rounded-xl border border-emerald-200 bg-emerald-50/70 text-emerald-900 text-xs flex items-start justify-between gap-3">
          <div className="space-y-1">
            <div className="font-bold flex items-center gap-1.5">
              <Check className="w-4 h-4 text-emerald-700" />
              <span>
                {ultimoResultadoSync.mensagens_novas > 0
                  ? `${ultimoResultadoSync.mensagens_novas} assunto(s) criado(s) na Folha do Dia com badge WhatsApp!`
                  : ultimoResultadoSync.mensagem ||
                    'Sincronização concluída sem novas mensagens elegíveis.'}
              </span>
            </div>
            {ultimoResultadoSync.detalhes && ultimoResultadoSync.detalhes.length > 0 && (
              <div className="text-[11px] text-emerald-800 space-y-0.5 pt-1">
                {ultimoResultadoSync.detalhes.map((d, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-600" />
                    <span>
                      {d.is_grupo
                        ? `[Grupo: ${d.grupo}] Autor: ${d.remetente}`
                        : `Remetente: ${d.remetente}`}
                      {d.contato_vinculado ? ` • Vínculo: ${d.contato_vinculado}` : ''}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => setUltimoResultadoSync(null)}
            className="text-xs h-6 px-2 text-emerald-700 hover:text-emerald-900 hover:bg-emerald-100"
          >
            Fechar
          </Button>
        </div>
      )}

      {/* 2. Seleção do Modo de Sincronização (Requisito 2) */}
      <Card className="border-[#E5E1D8] bg-white shadow-xs">
        <CardHeader className="pb-3 border-b border-[#E5E1D8]/70">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <CardTitle className="text-sm font-bold text-[#1A1D21] flex items-center gap-2">
                <SlidersHorizontal className="w-4 h-4 text-[#0F766E]" />
                Modo de Seleção de Mensagens
              </CardTitle>
              <CardDescription className="text-xs text-[#5B6470]">
                Defina como as mensagens que chegam no WhatsApp devem ser triadas para a sua Folha
                do Dia.
              </CardDescription>
            </div>
            {salvandoConfig && (
              <span className="text-[11px] text-[#0F766E] font-medium animate-pulse">
                Salvando regras...
              </span>
            )}
          </div>
        </CardHeader>
        <CardContent className="p-4 space-y-4">
          <RadioGroup
            value={modoSelecao}
            onValueChange={(val: string) => {
              const modo = val as WhatsAppModoSelecao
              setModoSelecao(modo)
              salvarConfiguracoes({ modo_selecao: modo })
            }}
            className="grid grid-cols-1 md:grid-cols-3 gap-3"
          >
            {/* Modo A: Só contatos escolhidos */}
            <Label
              htmlFor="modo-escolhidos"
              className={`p-3.5 rounded-xl border flex flex-col justify-between cursor-pointer transition-all ${
                modoSelecao === 'apenas_escolhidos'
                  ? 'border-[#0F766E] bg-[#0F766E]/5 text-[#1A1D21] shadow-2xs'
                  : 'border-[#E5E1D8] bg-[#FAFAF9] hover:bg-white text-[#5B6470]'
              }`}
            >
              <div className="flex items-start gap-2.5">
                <RadioGroupItem
                  value="apenas_escolhidos"
                  id="modo-escolhidos"
                  className="mt-0.5 text-[#0F766E]"
                />
                <div>
                  <span className="text-xs font-bold block text-[#1A1D21]">
                    (a) Só contatos escolhidos
                  </span>
                  <span className="text-[11px] leading-relaxed block text-[#5B6470] mt-1">
                    Apenas mensagens dos contatos que você marcou com checkbox entram na Folha do
                    Dia.
                  </span>
                </div>
              </div>
              <div className="mt-3 pt-2 border-t border-[#E5E1D8]/60 flex items-center justify-between text-[11px]">
                <span className="font-semibold text-[#0F766E]">
                  {contatosEscolhidos.length} selecionado(s)
                </span>
                <Badge variant="outline" className="text-[9px] uppercase font-mono">
                  Whitelist
                </Badge>
              </div>
            </Label>

            {/* Modo B: Todos exceto ignorados */}
            <Label
              htmlFor="modo-todos-exceto"
              className={`p-3.5 rounded-xl border flex flex-col justify-between cursor-pointer transition-all ${
                modoSelecao === 'todos_exceto'
                  ? 'border-[#0F766E] bg-[#0F766E]/5 text-[#1A1D21] shadow-2xs'
                  : 'border-[#E5E1D8] bg-[#FAFAF9] hover:bg-white text-[#5B6470]'
              }`}
            >
              <div className="flex items-start gap-2.5">
                <RadioGroupItem
                  value="todos_exceto"
                  id="modo-todos-exceto"
                  className="mt-0.5 text-[#0F766E]"
                />
                <div>
                  <span className="text-xs font-bold block text-[#1A1D21]">
                    (b) Todos exceto ignorados
                  </span>
                  <span className="text-[11px] leading-relaxed block text-[#5B6470] mt-1">
                    Entra tudo como assunto na Folha, menos os números marcados na lista de
                    ignorados.
                  </span>
                </div>
              </div>
              <div className="mt-3 pt-2 border-t border-[#E5E1D8]/60 flex items-center justify-between text-[11px]">
                <span className="font-semibold text-rose-700">
                  {contatosIgnorados.length} ignorado(s)
                </span>
                <Badge variant="outline" className="text-[9px] uppercase font-mono">
                  Blacklist
                </Badge>
              </div>
            </Label>

            {/* Modo C: Desligado */}
            <Label
              htmlFor="modo-desligado"
              className={`p-3.5 rounded-xl border flex flex-col justify-between cursor-pointer transition-all ${
                modoSelecao === 'desligado'
                  ? 'border-gray-800 bg-gray-100 text-[#1A1D21] shadow-2xs'
                  : 'border-[#E5E1D8] bg-[#FAFAF9] hover:bg-white text-[#5B6470]'
              }`}
            >
              <div className="flex items-start gap-2.5">
                <RadioGroupItem value="desligado" id="modo-desligado" className="mt-0.5" />
                <div>
                  <span className="text-xs font-bold block text-[#1A1D21]">(c) Desligado</span>
                  <span className="text-[11px] leading-relaxed block text-[#5B6470] mt-1">
                    Nenhuma mensagem recebida entra na Folha. O conector permanece ativo para envio
                    de lembretes.
                  </span>
                </div>
              </div>
              <div className="mt-3 pt-2 border-t border-[#E5E1D8]/60 flex items-center justify-between text-[11px]">
                <span className="font-semibold text-gray-600">Pausado</span>
                <Badge variant="outline" className="text-[9px] uppercase font-mono">
                  Inativo
                </Badge>
              </div>
            </Label>
          </RadioGroup>

          {/* Dica importante do pós-filtro */}
          <div className="p-3 rounded-lg border border-[#E5E1D8] bg-[#FAFAF9] flex items-center gap-2.5 text-xs text-[#5B6470]">
            <HelpCircle className="w-4 h-4 text-[#0F766E] shrink-0" />
            <span>
              <strong>Pós-filtro automático:</strong> Ao arquivar ou descartar na Folha um assunto
              vindo do WhatsApp, o remetente é adicionado imediatamente à lista de ignorados para
              não poluir sua rotina.
            </span>
          </div>
        </CardContent>
      </Card>

      {/* 3. Lista de Sincronização: Contatos e Grupos à Parte (Requisitos 2 e 3) */}
      <Card className="border-[#E5E1D8] bg-white shadow-xs">
        <CardHeader className="pb-3 border-b border-[#E5E1D8]/70">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <CardTitle className="text-sm font-bold text-[#1A1D21] flex items-center gap-2">
                <Users className="w-4 h-4 text-[#0F766E]" />
                Contatos & Grupos de WhatsApp
              </CardTitle>
              <CardDescription className="text-xs text-[#5B6470]">
                {abaLista === 'contatos'
                  ? modoSelecao === 'apenas_escolhidos'
                    ? 'Selecione quais contatos DEVEM sincronizar mensagens na Folha (Whitelist).'
                    : 'Marque contatos que você NÃO deseja que entrem na Folha (Ignorados).'
                  : 'Grupos entram estritamente se marcados explicitamente. Cada mensagem registrará quem falou.'}
              </CardDescription>
            </div>

            <Tabs
              value={abaLista}
              onValueChange={(val) => setAbaLista(val as 'contatos' | 'grupos')}
              className="w-auto shrink-0"
            >
              <TabsList className="bg-[#FAFAF9] border border-[#E5E1D8] h-8 p-0.5">
                <TabsTrigger
                  value="contatos"
                  className="data-[state=active]:bg-[#0F766E] data-[state=active]:text-white text-xs px-3 h-7 rounded-md gap-1.5"
                >
                  <Users className="w-3.5 h-3.5" />
                  <span>Contatos ({contatosLista.length})</span>
                </TabsTrigger>
                <TabsTrigger
                  value="grupos"
                  className="data-[state=active]:bg-[#0F766E] data-[state=active]:text-white text-xs px-3 h-7 rounded-md gap-1.5"
                >
                  <FolderTree className="w-3.5 h-3.5" />
                  <span>Grupos ({gruposLista.length})</span>
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
        </CardHeader>

        <CardContent className="p-4 space-y-3">
          {/* Aba de Contatos */}
          {abaLista === 'contatos' && (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <div className="relative flex-1">
                  <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-[#5B6470]" />
                  <Input
                    placeholder="Filtrar por nome, telefone ou empresa..."
                    value={buscaContato}
                    onChange={(e) => setBuscaContato(e.target.value)}
                    className="pl-8.5 text-xs h-8 bg-white border-[#E5E1D8]"
                  />
                </div>
                {modoSelecao === 'apenas_escolhidos' && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      const todos = contatosLista.map(
                        (c) => normalizarNumero(c.identificador) || c.identificador,
                      )
                      setContatosEscolhidos(todos)
                      salvarConfiguracoes({ contatos_escolhidos: todos })
                    }}
                    className="text-xs h-8 px-2.5 border-[#E5E1D8]"
                  >
                    Marcar Todos
                  </Button>
                )}
                {modoSelecao === 'todos_exceto' && contatosIgnorados.length > 0 && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setContatosIgnorados([])
                      salvarConfiguracoes({ contatos_ignorados: [] })
                    }}
                    className="text-xs h-8 px-2.5 border-rose-200 text-rose-700 hover:bg-rose-50"
                  >
                    Limpar Ignorados
                  </Button>
                )}
              </div>

              {/* Tabela de Contatos */}
              <div className="border border-[#E5E1D8] rounded-xl overflow-hidden divide-y divide-[#E5E1D8]">
                {contatosFiltrados.length === 0 ? (
                  <div className="p-8 text-center text-xs text-[#5B6470] bg-[#FAFAF9]">
                    Nenhum contato encontrado. Contatos cadastrados no sistema ou que enviarem
                    mensagens aparecerão aqui automaticamente.
                  </div>
                ) : (
                  contatosFiltrados.map((contato) => {
                    const numLimpo =
                      normalizarNumero(contato.identificador) || contato.identificador
                    const isEscolhido = contatosEscolhidos.includes(numLimpo)
                    const isIgnorado = contatosIgnorados.includes(numLimpo)

                    return (
                      <div
                        key={contato.identificador}
                        className="p-3 bg-white hover:bg-[#FAFAF9] flex items-center justify-between gap-3 transition-colors text-xs"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          {/* Checkbox condicional pelo modo */}
                          {modoSelecao === 'apenas_escolhidos' && (
                            <Checkbox
                              checked={isEscolhido}
                              onCheckedChange={() => toggleContatoEscolhido(numLimpo)}
                              className="border-[#0F766E] data-[state=checked]:bg-[#0F766E]"
                            />
                          )}

                          {modoSelecao === 'todos_exceto' && (
                            <Checkbox
                              checked={isIgnorado}
                              onCheckedChange={() => toggleContatoIgnorado(numLimpo)}
                              className="border-rose-500 data-[state=checked]:bg-rose-600"
                              title="Marque para ignorar mensagens deste contato"
                            />
                          )}

                          {modoSelecao === 'desligado' && (
                            <span className="w-4 h-4 rounded-full border border-gray-300 bg-gray-100 flex items-center justify-center shrink-0">
                              <span className="w-1.5 h-1.5 rounded-full bg-gray-400" />
                            </span>
                          )}

                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="font-semibold text-[#1A1D21] truncate">
                                {contato.nome}
                              </span>
                              {contato.contato_id ? (
                                <Badge
                                  variant="outline"
                                  className="text-[9px] bg-emerald-50 text-emerald-700 border-emerald-200"
                                >
                                  Contato Cadastrado
                                </Badge>
                              ) : (
                                <Badge
                                  variant="outline"
                                  className="text-[9px] bg-gray-50 text-gray-600 border-gray-200"
                                >
                                  Detectado
                                </Badge>
                              )}
                              {contato.mensagens_count ? (
                                <Badge
                                  variant="secondary"
                                  className="text-[9px] bg-[#FAFAF9] text-[#5B6470]"
                                >
                                  {contato.mensagens_count} msg(s)
                                </Badge>
                              ) : null}
                            </div>
                            <div className="text-[11px] text-[#5B6470] mt-0.5 flex items-center gap-2">
                              <span>Tel: {contato.telefone || contato.identificador}</span>
                              {contato.empresa && <span>• {contato.empresa}</span>}
                            </div>
                          </div>
                        </div>

                        {/* Status visual na linha */}
                        <div className="shrink-0 flex items-center gap-2">
                          {modoSelecao === 'apenas_escolhidos' && (
                            <span
                              className={`text-[10px] px-2 py-0.5 rounded font-medium ${
                                isEscolhido
                                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                  : 'text-[#5B6470]'
                              }`}
                            >
                              {isEscolhido ? 'Sincroniza' : 'Ignorado'}
                            </span>
                          )}

                          {modoSelecao === 'todos_exceto' && (
                            <span
                              className={`text-[10px] px-2 py-0.5 rounded font-medium ${
                                isIgnorado
                                  ? 'bg-rose-50 text-rose-700 border border-rose-200'
                                  : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              }`}
                            >
                              {isIgnorado ? 'Ignorado' : 'Sincroniza'}
                            </span>
                          )}

                          {modoSelecao === 'desligado' && (
                            <span className="text-[10px] text-gray-500 italic">Desligado</span>
                          )}
                        </div>
                      </div>
                    )
                  })
                )}
              </div>
            </div>
          )}

          {/* Aba de Grupos à Parte (Requisito 3) */}
          {abaLista === 'grupos' && (
            <div className="space-y-3">
              <div className="p-3 rounded-lg border border-amber-200 bg-amber-50/70 text-amber-900 text-xs flex items-start gap-2.5">
                <AlertCircle className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
                <div className="space-y-0.5">
                  <span className="font-bold">Regra de Grupos:</span>
                  <p className="text-[11px] leading-relaxed">
                    Por padrão nenhum grupo vira assunto para evitar sobrecarga. Marque somente os
                    grupos que você realmente deseja acompanhar. Cada assunto criado na Folha trará
                    o autor explícito da mensagem.
                  </p>
                </div>
              </div>

              <div className="relative">
                <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-[#5B6470]" />
                <Input
                  placeholder="Filtrar grupos pelo nome..."
                  value={buscaGrupo}
                  onChange={(e) => setBuscaGrupo(e.target.value)}
                  className="pl-8.5 text-xs h-8 bg-white border-[#E5E1D8]"
                />
              </div>

              {/* Tabela de Grupos */}
              <div className="border border-[#E5E1D8] rounded-xl overflow-hidden divide-y divide-[#E5E1D8]">
                {gruposFiltrados.length === 0 ? (
                  <div className="p-8 text-center text-xs text-[#5B6470] bg-[#FAFAF9] space-y-1">
                    <p className="font-medium text-[#1A1D21]">Nenhum grupo detectado ainda.</p>
                    <p className="text-[11px]">
                      {gruposAviso ||
                        'Assim que você receber mensagens em grupos ou conectar a conta com permissão de grupos, eles serão listados aqui.'}
                    </p>
                  </div>
                ) : (
                  gruposFiltrados.map((grupo) => {
                    const isMarcado =
                      gruposEscolhidos.includes(grupo.id) || gruposEscolhidos.includes(grupo.nome)
                    return (
                      <div
                        key={grupo.id}
                        className="p-3 bg-white hover:bg-[#FAFAF9] flex items-center justify-between gap-3 transition-colors text-xs"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <Checkbox
                            checked={isMarcado}
                            onCheckedChange={() => toggleGrupoEscolhido(grupo.id || grupo.nome)}
                            className="border-[#0F766E] data-[state=checked]:bg-[#0F766E]"
                          />
                          <div className="min-w-0">
                            <span className="font-semibold text-[#1A1D21] block truncate">
                              {grupo.nome}
                            </span>
                            <span className="text-[10px] text-[#5B6470]">ID: {grupo.id}</span>
                          </div>
                        </div>

                        <div className="shrink-0">
                          <Badge
                            variant="outline"
                            className={`text-[9px] ${
                              isMarcado
                                ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                : 'bg-gray-50 text-gray-500 border-gray-200'
                            }`}
                          >
                            {isMarcado ? 'Sincronizar Mensagens' : 'Ignorado'}
                          </Badge>
                        </div>
                      </div>
                    )
                  })
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
export default GestaoWhatsApp
