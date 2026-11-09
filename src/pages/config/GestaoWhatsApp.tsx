import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react'
import {
  MessageSquare,
  CheckCircle2,
  RefreshCw,
  SlidersHorizontal,
  Users,
  FolderTree,
  AlertCircle,
  HelpCircle,
  Search,
  Check,
  CheckSquare,
  Square,
  Ban,
  ChevronDown,
  ArrowDownCircle,
  Sparkles,
  Lock,
} from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Checkbox } from '@/components/ui/checkbox'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { toast } from '@/hooks/use-toast'
import { ConnectorButton } from '@/components/skip/ConnectorButton'
import { ModalDesbloqueioPlano } from '@/components/comercial/ModalDesbloqueioPlano'
import { diamondApi } from '@/services/diamondApi'
import type {
  WhatsAppConfig,
  WhatsAppContatoItem,
  WhatsAppGrupoItem,
  WhatsAppModoSelecao,
  WhatsAppStatusResponse,
  LimitesConsumoConta,
} from '@/types'

const PAGE_SIZE = 100

interface GestaoWhatsAppProps {
  onRecarregarGlobal?: () => void
}

export function GestaoWhatsApp({ onRecarregarGlobal }: GestaoWhatsAppProps) {
  const [carregando, setCarregando] = useState(true)
  const [salvandoConfig, setSalvandoConfig] = useState(false)
  const [sincronizando, setSincronizando] = useState(false)

  // Licença e checagem do Módulo WhatsApp
  const [limites, setLimites] = useState<LimitesConsumoConta | null>(null)
  const [modalUpgradeOpen, setModalUpgradeOpen] = useState(false)

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

  // Abas principais: contatos, grupos ou ignorados
  const [abaLista, setAbaLista] = useState<'contatos' | 'grupos' | 'ignorados'>('contatos')

  // Filtros de busca na tabela
  const [buscaContato, setBuscaContato] = useState('')
  const [buscaGrupo, setBuscaGrupo] = useState('')
  const [buscaIgnorado, setBuscaIgnorado] = useState('')

  // Paginação progressiva na tela (quantidade renderizada)
  const [limiteContatos, setLimiteContatos] = useState(PAGE_SIZE)
  const [limiteIgnorados, setLimiteIgnorados] = useState(PAGE_SIZE)

  // Observer para infinite scroll
  const sentinelContatosRef = useRef<HTMLDivElement | null>(null)
  const sentinelIgnoradosRef = useRef<HTMLDivElement | null>(null)

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

  // Sets para busca O(1)
  const conjuntoEscolhidos = useMemo(() => {
    return new Set(contatosEscolhidos.map((c) => normalizarNumero(c) || c))
  }, [contatosEscolhidos])

  const conjuntoIgnorados = useMemo(() => {
    return new Set(contatosIgnorados.map((c) => normalizarNumero(c) || c))
  }, [contatosIgnorados])

  const conjuntoGruposEscolhidos = useMemo(() => {
    return new Set(gruposEscolhidos.map((g) => String(g).trim()))
  }, [gruposEscolhidos])

  const carregarDados = async () => {
    try {
      setCarregando(true)
      const [resStatus, resLimites] = await Promise.all([
        diamondApi.getWhatsAppStatus(),
        diamondApi.getLimitesConsumoConta(),
      ])
      setStatus(resStatus)
      setLimites(resLimites)

      if (resStatus.config) {
        setModoSelecao(resStatus.config.modo_selecao || 'todos_exceto')
        setContatosEscolhidos(resStatus.config.contatos_escolhidos || [])
        setContatosIgnorados(resStatus.config.contatos_ignorados || [])
        setGruposEscolhidos(resStatus.config.grupos_escolhidos || [])
      }

      // Buscar lista completa de contatos e grupos
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

  // Resetar limites de exibição ao mudar a busca para permitir rolagem fluida
  useEffect(() => {
    setLimiteContatos(PAGE_SIZE)
  }, [buscaContato])

  useEffect(() => {
    setLimiteIgnorados(PAGE_SIZE)
  }, [buscaIgnorado])

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
    if (limites && !limites.moduloWhatsappAtivo) {
      setModalUpgradeOpen(true)
      return
    }
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

  // Toggle individual para contatos escolhidos
  const toggleContatoEscolhido = (identificador: string) => {
    const num = normalizarNumero(identificador) || identificador
    let novaLista: string[] = []
    if (conjuntoEscolhidos.has(num)) {
      novaLista = contatosEscolhidos.filter((c) => (normalizarNumero(c) || c) !== num)
    } else {
      novaLista = [...contatosEscolhidos, num]
    }
    setContatosEscolhidos(novaLista)
    salvarConfiguracoes({ contatos_escolhidos: novaLista })
  }

  // Toggle individual para contatos ignorados
  const toggleContatoIgnorado = (identificador: string) => {
    const num = normalizarNumero(identificador) || identificador
    let novaLista: string[] = []
    if (conjuntoIgnorados.has(num)) {
      novaLista = contatosIgnorados.filter((c) => (normalizarNumero(c) || c) !== num)
    } else {
      novaLista = [...contatosIgnorados, num]
    }
    setContatosIgnorados(novaLista)
    salvarConfiguracoes({ contatos_ignorados: novaLista })
  }

  // Toggle para grupos escolhidos
  const toggleGrupoEscolhido = (grupoIdOuNome: string) => {
    const chave = String(grupoIdOuNome).trim()
    let novaLista: string[] = []
    if (conjuntoGruposEscolhidos.has(chave)) {
      novaLista = gruposEscolhidos.filter((g) => String(g).trim() !== chave)
    } else {
      novaLista = [...gruposEscolhidos, chave]
    }
    setGruposEscolhidos(novaLista)
    salvarConfiguracoes({ grupos_escolhidos: novaLista })
  }

  // 1. Filtragem de TODOS os contatos em memória (sem perder nenhum dos 3900)
  const contatosFiltrados = useMemo(() => {
    const termo = buscaContato.trim().toLowerCase()
    if (!termo) return contatosLista
    return contatosLista.filter((c) => {
      const n = (c.nome || '').toLowerCase()
      const t = (c.telefone || c.identificador || '').toLowerCase()
      const e = (c.empresa || '').toLowerCase()
      return n.includes(termo) || t.includes(termo) || e.includes(termo)
    })
  }, [contatosLista, buscaContato])

  // Contatos paginados na tela
  const contatosVisiveis = useMemo(() => {
    return contatosFiltrados.slice(0, limiteContatos)
  }, [contatosFiltrados, limiteContatos])

  const temMaisContatos = contatosVisiveis.length < contatosFiltrados.length

  // Carregar mais contatos
  const carregarMaisContatos = useCallback(() => {
    setLimiteContatos((prev) => Math.min(prev + PAGE_SIZE, contatosFiltrados.length))
  }, [contatosFiltrados.length])

  // 2. Lista de Ignorados (unifica os contatos conhecidos com o array de ignorados)
  // Cria um mapa rápido por identificador normalizado
  const mapaContatosPorId = useMemo(() => {
    const map = new Map<string, WhatsAppContatoItem>()
    for (const c of contatosLista) {
      const num = normalizarNumero(c.identificador) || c.identificador
      if (num) map.set(num, c)
    }
    return map
  }, [contatosLista])

  // Converte a lista de contatosIgnorados em objetos com nome/telefone/empresa
  const contatosIgnoradosListaCompleta = useMemo(() => {
    return contatosIgnorados.map((idNum) => {
      const numLimpo = normalizarNumero(idNum) || idNum
      const dados = mapaContatosPorId.get(numLimpo)
      return {
        identificador: idNum,
        numLimpo,
        nome: dados?.nome || `Número: ${idNum}`,
        telefone: dados?.telefone || idNum,
        empresa: dados?.empresa || '',
        contato_id: dados?.contato_id || null,
        mensagens_count: dados?.mensagens_count || 0,
      }
    })
  }, [contatosIgnorados, mapaContatosPorId])

  // Filtragem na lista de ignorados
  const ignoradosFiltrados = useMemo(() => {
    const termo = buscaIgnorado.trim().toLowerCase()
    if (!termo) return contatosIgnoradosListaCompleta
    return contatosIgnoradosListaCompleta.filter((c) => {
      const n = c.nome.toLowerCase()
      const t = c.telefone.toLowerCase()
      const e = c.empresa.toLowerCase()
      return n.includes(termo) || t.includes(termo) || e.includes(termo)
    })
  }, [contatosIgnoradosListaCompleta, buscaIgnorado])

  const ignoradosVisiveis = useMemo(() => {
    return ignoradosFiltrados.slice(0, limiteIgnorados)
  }, [ignoradosFiltrados, limiteIgnorados])

  const temMaisIgnorados = ignoradosVisiveis.length < ignoradosFiltrados.length

  const carregarMaisIgnorados = useCallback(() => {
    setLimiteIgnorados((prev) => Math.min(prev + PAGE_SIZE, ignoradosFiltrados.length))
  }, [ignoradosFiltrados.length])

  // 3. Filtragem de Grupos
  const gruposFiltrados = useMemo(() => {
    const termo = buscaGrupo.trim().toLowerCase()
    if (!termo) return gruposLista
    return gruposLista.filter((g) => {
      const n = (g.nome || '').toLowerCase()
      const id = (g.id || '').toLowerCase()
      return n.includes(termo) || id.includes(termo)
    })
  }, [gruposLista, buscaGrupo])

  // Infinite Scroll com IntersectionObserver para contatos
  useEffect(() => {
    const el = sentinelContatosRef.current
    if (!el || !temMaisContatos) return

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          carregarMaisContatos()
        }
      },
      { rootMargin: '300px' },
    )

    observer.observe(el)
    return () => observer.disconnect()
  }, [temMaisContatos, carregarMaisContatos])

  // Infinite Scroll para ignorados
  useEffect(() => {
    const el = sentinelIgnoradosRef.current
    if (!el || !temMaisIgnorados) return

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          carregarMaisIgnorados()
        }
      },
      { rootMargin: '300px' },
    )

    observer.observe(el)
    return () => observer.disconnect()
  }, [temMaisIgnorados, carregarMaisIgnorados])

  // Ações de seleção em massa sobre os resultados filtrados
  // No modo "apenas_escolhidos":
  const totalFiltradosMarcadosEscolhidos = useMemo(() => {
    let count = 0
    for (const c of contatosFiltrados) {
      const num = normalizarNumero(c.identificador) || c.identificador
      if (conjuntoEscolhidos.has(num)) count++
    }
    return count
  }, [contatosFiltrados, conjuntoEscolhidos])

  // No modo "todos_exceto":
  const totalFiltradosMarcadosIgnorados = useMemo(() => {
    let count = 0
    for (const c of contatosFiltrados) {
      const num = normalizarNumero(c.identificador) || c.identificador
      if (conjuntoIgnorados.has(num)) count++
    }
    return count
  }, [contatosFiltrados, conjuntoIgnorados])

  // Selecionar todos os resultados da busca (para contatos escolhidos)
  const selecionarTodosResultadosEscolhidos = () => {
    const novoSet = new Set(contatosEscolhidos.map((c) => normalizarNumero(c) || c))
    for (const c of contatosFiltrados) {
      const num = normalizarNumero(c.identificador) || c.identificador
      if (num) novoSet.add(num)
    }
    const arrayFinal = Array.from(novoSet)
    setContatosEscolhidos(arrayFinal)
    salvarConfiguracoes({ contatos_escolhidos: arrayFinal })
    toast({
      title: 'Contatos selecionados em massa',
      description: `${contatosFiltrados.length} contato(s) adicionado(s) à lista de sincronização.`,
    })
  }

  // Desselecionar todos os resultados da busca (para contatos escolhidos)
  const desselecionarTodosResultadosEscolhidos = () => {
    const setFiltrados = new Set(
      contatosFiltrados.map((c) => normalizarNumero(c.identificador) || c.identificador),
    )
    const arrayFinal = contatosEscolhidos.filter((c) => {
      const num = normalizarNumero(c) || c
      return !setFiltrados.has(num)
    })
    setContatosEscolhidos(arrayFinal)
    salvarConfiguracoes({ contatos_escolhidos: arrayFinal })
    toast({
      title: 'Seleção removida',
      description: `Contatos da busca foram removidos da lista de sincronização.`,
    })
  }

  // Marcar todos os resultados da busca como ignorados
  const ignorarTodosResultadosBusca = () => {
    const novoSet = new Set(contatosIgnorados.map((c) => normalizarNumero(c) || c))
    for (const c of contatosFiltrados) {
      const num = normalizarNumero(c.identificador) || c.identificador
      if (num) novoSet.add(num)
    }
    const arrayFinal = Array.from(novoSet)
    setContatosIgnorados(arrayFinal)
    salvarConfiguracoes({ contatos_ignorados: arrayFinal })
    toast({
      title: 'Contatos ignorados em massa',
      description: `${contatosFiltrados.length} contato(s) adicionado(s) aos ignorados.`,
    })
  }

  // Desmarcar todos os resultados da busca dos ignorados
  const desmarcarIgnoradosResultadosBusca = () => {
    const setFiltrados = new Set(
      contatosFiltrados.map((c) => normalizarNumero(c.identificador) || c.identificador),
    )
    const arrayFinal = contatosIgnorados.filter((c) => {
      const num = normalizarNumero(c) || c
      return !setFiltrados.has(num)
    })
    setContatosIgnorados(arrayFinal)
    salvarConfiguracoes({ contatos_ignorados: arrayFinal })
    toast({
      title: 'Ignorados desmarcados',
      description: `Contatos da busca voltarão a sincronizar normalmente.`,
    })
  }

  // Remover da lista de ignorados todos os itens filtrados na aba Ignorados
  const removerFiltradosDeIgnorados = () => {
    const setRemover = new Set(ignoradosFiltrados.map((item) => item.numLimpo))
    const arrayFinal = contatosIgnorados.filter((c) => {
      const num = normalizarNumero(c) || c
      return !setRemover.has(num)
    })
    setContatosIgnorados(arrayFinal)
    salvarConfiguracoes({ contatos_ignorados: arrayFinal })
    toast({
      title: 'Lista de ignorados atualizada',
      description: `${ignoradosFiltrados.length} contato(s) removido(s) da lista de ignorados.`,
    })
  }

  const moduloInativo = limites ? !limites.moduloWhatsappAtivo : false

  return (
    <div className="space-y-6">
      {/* Modal de Desbloqueio de Módulo */}
      <ModalDesbloqueioPlano
        open={modalUpgradeOpen}
        onOpenChange={setModalUpgradeOpen}
        recursoNome="Módulo WhatsApp & Radar"
        motivo="O Módulo WhatsApp faz parte do plano Pro comercial (R$ 197/mês) ou de licenças modulares liberadas. Assine para sincronizar conversas para a Folha do Dia."
        stripePaymentLink={limites?.stripePaymentLink}
        precoMensalTexto={limites?.precoMensalTexto}
      />

      {/* Alerta de Módulo Inativo */}
      {moduloInativo && (
        <div className="p-4 rounded-xl border border-amber-300 bg-gradient-to-r from-amber-50 to-orange-50 text-amber-900 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-xs">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-lg bg-amber-500 text-white flex items-center justify-center shrink-0 mt-0.5">
              <Lock className="w-4 h-4" />
            </div>
            <div>
              <p className="font-bold text-xs uppercase tracking-wide text-amber-800">
                Módulo WhatsApp Inativo no Plano Gratuito
              </p>
              <p className="text-xs text-amber-900 mt-0.5">
                A sincronização de mensagens e triagem de conversas exige a ativação do Módulo
                WhatsApp ou upgrade para o plano Pro ({limites?.precoMensalTexto || 'R$ 197/mês'}).
              </p>
            </div>
          </div>
          <Button
            size="sm"
            onClick={() => setModalUpgradeOpen(true)}
            className="bg-[#0F766E] hover:bg-[#0D5C56] text-white text-xs font-semibold shrink-0 gap-1.5 shadow-xs"
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-300" />
            <span>Desbloquear Módulo</span>
          </Button>
        </div>
      )}

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
                  ) : status?.tem_conexao_salva ? (
                    <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 text-[10px] font-semibold gap-1">
                      <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                      Conexão Ativa
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
              <span
                className={`w-2 h-2 rounded-full inline-block ${status?.conectado ? 'bg-emerald-500' : 'bg-amber-500'}`}
              />
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
            {status?.aviso_transitorio && (
              <p className="text-[11px] text-amber-700 flex items-center gap-1 pt-0.5">
                <AlertCircle className="w-3 h-3 shrink-0" />
                <span>
                  Instabilidade temporária na consulta da conta: a sincronização agendada e manual
                  continua ativa.
                </span>
              </p>
            )}
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <Button
              size="sm"
              onClick={handleSincronizarAgora}
              disabled={sincronizando || (!status?.conectado && !status?.tem_conexao_salva)}
              className="bg-[#0F766E] hover:bg-[#0D5C56] text-white text-xs h-8 px-3 gap-1.5 font-medium shadow-2xs disabled:opacity-50"
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

      {/* 2. Seleção do Modo de Sincronização */}
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

      {/* 3. Lista de Sincronização: Contatos, Grupos e Ignorados */}
      <Card className="border-[#E5E1D8] bg-white shadow-xs">
        <CardHeader className="pb-3 border-b border-[#E5E1D8]/70">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <CardTitle className="text-sm font-bold text-[#1A1D21] flex items-center gap-2">
                <Users className="w-4 h-4 text-[#0F766E]" />
                Contatos & Grupos de WhatsApp
              </CardTitle>
              <CardDescription className="text-xs text-[#5B6470]">
                {abaLista === 'contatos' &&
                  (modoSelecao === 'apenas_escolhidos'
                    ? 'Selecione quais contatos DEVEM sincronizar mensagens na Folha (Whitelist).'
                    : modoSelecao === 'todos_exceto'
                      ? 'Marque contatos que você NÃO deseja que entrem na Folha (Ignorados).'
                      : 'Modo desligado. Nenhuma mensagem gerará assunto.')}
                {abaLista === 'ignorados' &&
                  'Lista de todos os contatos e remetentes ignorados. Você pode pesquisar, remover ou limpar.'}
                {abaLista === 'grupos' &&
                  'Grupos entram estritamente se marcados explicitamente. Cada mensagem registrará quem falou.'}
              </CardDescription>
            </div>

            <Tabs
              value={abaLista}
              onValueChange={(val) => setAbaLista(val as 'contatos' | 'grupos' | 'ignorados')}
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
                  value="ignorados"
                  className="data-[state=active]:bg-rose-700 data-[state=active]:text-white text-xs px-3 h-7 rounded-md gap-1.5"
                >
                  <Ban className="w-3.5 h-3.5" />
                  <span>Ignorados ({contatosIgnorados.length})</span>
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
              {/* Barra de Busca + Controles de Ação em Massa */}
              <div className="space-y-2">
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                  <div className="relative flex-1">
                    <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-[#5B6470]" />
                    <Input
                      placeholder="Filtrar por nome, telefone ou empresa em todos os contatos..."
                      value={buscaContato}
                      onChange={(e) => setBuscaContato(e.target.value)}
                      className="pl-8.5 text-xs h-8 bg-white border-[#E5E1D8]"
                    />
                    {buscaContato && (
                      <button
                        onClick={() => setBuscaContato('')}
                        className="absolute right-2.5 top-2 text-[10px] text-gray-400 hover:text-gray-600"
                      >
                        Limpar
                      </button>
                    )}
                  </div>

                  {/* Botões de Ação em Massa conforme o modo ativo */}
                  <div className="flex items-center gap-1.5 shrink-0 flex-wrap">
                    {modoSelecao === 'apenas_escolhidos' && (
                      <>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={selecionarTodosResultadosEscolhidos}
                          disabled={contatosFiltrados.length === 0}
                          className="text-xs h-8 px-2.5 border-[#0F766E]/40 text-[#0F766E] hover:bg-[#0F766E]/10 gap-1.5"
                          title="Marcar todos os contatos encontrados nesta busca para sincronizar"
                        >
                          <CheckSquare className="w-3.5 h-3.5" />
                          <span>
                            {buscaContato.trim()
                              ? `Marcar busca (${contatosFiltrados.length})`
                              : `Marcar todos (${contatosLista.length})`}
                          </span>
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={desselecionarTodosResultadosEscolhidos}
                          disabled={
                            contatosFiltrados.length === 0 || totalFiltradosMarcadosEscolhidos === 0
                          }
                          className="text-xs h-8 px-2.5 border-[#E5E1D8] text-[#5B6470] hover:bg-gray-50 gap-1.5"
                          title="Desmarcar todos os contatos desta busca"
                        >
                          <Square className="w-3.5 h-3.5" />
                          <span>Desmarcar busca</span>
                        </Button>
                      </>
                    )}

                    {modoSelecao === 'todos_exceto' && (
                      <>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={ignorarTodosResultadosBusca}
                          disabled={contatosFiltrados.length === 0}
                          className="text-xs h-8 px-2.5 border-rose-200 text-rose-700 hover:bg-rose-50 gap-1.5"
                          title="Adicionar todos os contatos desta busca aos ignorados"
                        >
                          <Ban className="w-3.5 h-3.5" />
                          <span>
                            {buscaContato.trim()
                              ? `Ignorar busca (${contatosFiltrados.length})`
                              : 'Ignorar todos da lista'}
                          </span>
                        </Button>
                        {totalFiltradosMarcadosIgnorados > 0 && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={desmarcarIgnoradosResultadosBusca}
                            className="text-xs h-8 px-2.5 border-emerald-200 text-emerald-700 hover:bg-emerald-50 gap-1.5"
                            title="Remover contatos desta busca da lista de ignorados"
                          >
                            <Check className="w-3.5 h-3.5" />
                            <span>Desmarcar ignorados ({totalFiltradosMarcadosIgnorados})</span>
                          </Button>
                        )}
                        {contatosIgnorados.length > 0 && !buscaContato.trim() && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setContatosIgnorados([])
                              salvarConfiguracoes({ contatos_ignorados: [] })
                            }}
                            className="text-xs h-8 px-2.5 border-gray-200 text-gray-600 hover:bg-gray-50"
                          >
                            Limpar todos ({contatosIgnorados.length})
                          </Button>
                        )}
                      </>
                    )}
                  </div>
                </div>

                {/* Linha do Contador Visível: "mostrando X de Y" com total real da base */}
                <div className="flex items-center justify-between text-xs px-1 text-[#5B6470] bg-[#FAFAF9] p-2 rounded-lg border border-[#E5E1D8]/60">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-[#1A1D21]">
                      Mostrando {Math.min(limiteContatos, contatosFiltrados.length)} de{' '}
                      {contatosFiltrados.length} contato(s)
                      {buscaContato.trim() && (
                        <span className="text-[#5B6470] font-normal">
                          {' '}
                          (filtrados de {contatosLista.length} no total da base)
                        </span>
                      )}
                    </span>
                    {modoSelecao === 'apenas_escolhidos' && (
                      <Badge variant="outline" className="text-[10px] text-[#0F766E] bg-emerald-50">
                        {contatosEscolhidos.length} selecionado(s) para sincronizar
                      </Badge>
                    )}
                    {modoSelecao === 'todos_exceto' && (
                      <Badge variant="outline" className="text-[10px] text-rose-700 bg-rose-50">
                        {contatosIgnorados.length} ignorado(s)
                      </Badge>
                    )}
                  </div>

                  {temMaisContatos && (
                    <span className="text-[11px] text-[#0F766E] font-medium flex items-center gap-1">
                      <Sparkles className="w-3 h-3" />
                      Role a tela para carregar mais
                    </span>
                  )}
                </div>
              </div>

              {/* Tabela de Contatos Paginada */}
              <div className="border border-[#E5E1D8] rounded-xl overflow-hidden divide-y divide-[#E5E1D8]">
                {contatosFiltrados.length === 0 ? (
                  <div className="p-8 text-center text-xs text-[#5B6470] bg-[#FAFAF9]">
                    {buscaContato.trim()
                      ? `Nenhum contato encontrado para "${buscaContato}".`
                      : 'Nenhum contato encontrado. Contatos cadastrados no sistema ou que enviarem mensagens aparecerão aqui automaticamente.'}
                  </div>
                ) : (
                  contatosVisiveis.map((contato) => {
                    const numLimpo =
                      normalizarNumero(contato.identificador) || contato.identificador
                    const isEscolhido = conjuntoEscolhidos.has(numLimpo)
                    const isIgnorado = conjuntoIgnorados.has(numLimpo)

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
                            <div className="flex items-center gap-2 flex-wrap">
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

              {/* Botão de carregar mais manual e sentinela de rolagem */}
              {temMaisContatos && (
                <div className="pt-2 flex flex-col items-center gap-2">
                  <div ref={sentinelContatosRef} className="h-2 w-full" />
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={carregarMaisContatos}
                    className="text-xs h-8 border-[#E5E1D8] text-[#0F766E] hover:bg-[#0F766E]/5 gap-1.5"
                  >
                    <ArrowDownCircle className="w-3.5 h-3.5" />
                    <span>
                      Carregar mais contatos (mostrando {contatosVisiveis.length} de{' '}
                      {contatosFiltrados.length})
                    </span>
                  </Button>
                </div>
              )}
            </div>
          )}

          {/* Aba de Ignorados Dedicada com Paginação e Busca */}
          {abaLista === 'ignorados' && (
            <div className="space-y-3">
              <div className="p-3 rounded-lg border border-rose-200 bg-rose-50/70 text-rose-900 text-xs flex items-start justify-between gap-3">
                <div className="flex items-start gap-2.5">
                  <Ban className="w-4 h-4 text-rose-700 shrink-0 mt-0.5" />
                  <div className="space-y-0.5">
                    <span className="font-bold">Gerenciamento de Contatos Ignorados:</span>
                    <p className="text-[11px] leading-relaxed">
                      Mensagens destes números não geram assuntos na Folha do Dia. Você pode
                      desmarcar contatos individualmente ou limpar a lista.
                    </p>
                  </div>
                </div>
                {contatosIgnorados.length > 0 && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setContatosIgnorados([])
                      salvarConfiguracoes({ contatos_ignorados: [] })
                    }}
                    className="text-xs h-7 px-2 border-rose-300 text-rose-800 hover:bg-rose-100 shrink-0"
                  >
                    Limpar Todos
                  </Button>
                )}
              </div>

              {/* Busca + Ações em Massa na lista de Ignorados */}
              <div className="space-y-2">
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                  <div className="relative flex-1">
                    <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-[#5B6470]" />
                    <Input
                      placeholder="Filtrar entre os contatos ignorados..."
                      value={buscaIgnorado}
                      onChange={(e) => setBuscaIgnorado(e.target.value)}
                      className="pl-8.5 text-xs h-8 bg-white border-[#E5E1D8]"
                    />
                    {buscaIgnorado && (
                      <button
                        onClick={() => setBuscaIgnorado('')}
                        className="absolute right-2.5 top-2 text-[10px] text-gray-400 hover:text-gray-600"
                      >
                        Limpar
                      </button>
                    )}
                  </div>

                  {ignoradosFiltrados.length > 0 && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={removerFiltradosDeIgnorados}
                      className="text-xs h-8 px-2.5 border-emerald-200 text-emerald-700 hover:bg-emerald-50 gap-1.5 shrink-0"
                    >
                      <Check className="w-3.5 h-3.5" />
                      <span>
                        {buscaIgnorado.trim()
                          ? `Remover da busca (${ignoradosFiltrados.length})`
                          : 'Remover todos'}
                      </span>
                    </Button>
                  )}
                </div>

                {/* Contador de Ignorados: "mostrando X de Y" */}
                <div className="flex items-center justify-between text-xs px-1 text-[#5B6470] bg-[#FAFAF9] p-2 rounded-lg border border-[#E5E1D8]/60">
                  <span className="font-medium text-[#1A1D21]">
                    Mostrando {Math.min(limiteIgnorados, ignoradosFiltrados.length)} de{' '}
                    {ignoradosFiltrados.length} contato(s) ignorado(s)
                    {buscaIgnorado.trim() && (
                      <span className="text-[#5B6470] font-normal">
                        {' '}
                        (filtrados de {contatosIgnorados.length} no total)
                      </span>
                    )}
                  </span>
                  {temMaisIgnorados && (
                    <span className="text-[11px] text-[#0F766E] font-medium flex items-center gap-1">
                      <ChevronDown className="w-3 h-3" />
                      Role a tela para carregar mais
                    </span>
                  )}
                </div>
              </div>

              {/* Tabela de Ignorados */}
              <div className="border border-[#E5E1D8] rounded-xl overflow-hidden divide-y divide-[#E5E1D8]">
                {ignoradosFiltrados.length === 0 ? (
                  <div className="p-8 text-center text-xs text-[#5B6470] bg-[#FAFAF9]">
                    {buscaIgnorado.trim()
                      ? `Nenhum ignorado encontrado para "${buscaIgnorado}".`
                      : 'Nenhum contato na lista de ignorados no momento.'}
                  </div>
                ) : (
                  ignoradosVisiveis.map((item) => (
                    <div
                      key={item.identificador}
                      className="p-3 bg-white hover:bg-[#FAFAF9] flex items-center justify-between gap-3 transition-colors text-xs"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <Checkbox
                          checked={true}
                          onCheckedChange={() => toggleContatoIgnorado(item.numLimpo)}
                          className="border-rose-500 data-[state=checked]:bg-rose-600"
                          title="Desmarque para voltar a sincronizar este contato"
                        />
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-[#1A1D21] truncate">
                              {item.nome}
                            </span>
                            {item.contato_id && (
                              <Badge
                                variant="outline"
                                className="text-[9px] bg-emerald-50 text-emerald-700 border-emerald-200"
                              >
                                Cadastrado
                              </Badge>
                            )}
                          </div>
                          <div className="text-[11px] text-[#5B6470] mt-0.5 flex items-center gap-2">
                            <span>Tel: {item.telefone}</span>
                            {item.empresa && <span>• {item.empresa}</span>}
                          </div>
                        </div>
                      </div>

                      <div className="shrink-0 flex items-center gap-2">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => toggleContatoIgnorado(item.numLimpo)}
                          className="text-xs h-7 px-2 text-rose-700 hover:text-rose-900 hover:bg-rose-50"
                        >
                          Voltar a Sincronizar
                        </Button>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {temMaisIgnorados && (
                <div className="pt-2 flex flex-col items-center gap-2">
                  <div ref={sentinelIgnoradosRef} className="h-2 w-full" />
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={carregarMaisIgnorados}
                    className="text-xs h-8 border-[#E5E1D8] text-[#0F766E] hover:bg-[#0F766E]/5 gap-1.5"
                  >
                    <ArrowDownCircle className="w-3.5 h-3.5" />
                    <span>
                      Carregar mais ignorados (mostrando {ignoradosVisiveis.length} de{' '}
                      {ignoradosFiltrados.length})
                    </span>
                  </Button>
                </div>
              )}
            </div>
          )}

          {/* Aba de Grupos à Parte */}
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
                      conjuntoGruposEscolhidos.has(grupo.id) ||
                      conjuntoGruposEscolhidos.has(grupo.nome)
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
