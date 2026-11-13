import React, { useState, useEffect, useMemo, useRef } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { diamondApi } from '@/services/diamondApi'
import { useRealtime } from '@/hooks/use-realtime'
import { useNavegacao } from '@/contexts/NavegacaoContext'
import type {
  FolhaDia,
  Projeto,
  Contato,
  Negocio,
  OrigemTipo,
  CardStatus,
  CardPrioridade,
  FluxoKanban,
  CategoriaFluxo,
  ColunaFluxo,
  MarcoTimeline,
  ProjetoTipo,
  Demanda,
} from '@/types'
import {
  FileEdit,
  Sparkles,
  Send,
  Trash2,
  CheckCircle2,
  PhoneCall,
  MessageSquare,
  Mail,
  FileText,
  Clock,
  ArrowRight,
  Loader2,
  Check,
  Plus,
  ArrowUp,
  ArrowDown,
  Layers,
  FolderGit2,
  CalendarDays,
  UserCheck,
  CheckSquare,
  ListPlus,
  AlertCircle,
  Mic,
  Volume2,
  CalendarCheck,
  CheckCircle,
  Pin,
  PinOff,
  Archive,
  ArchiveRestore,
  Search,
  Sprout,
  MoreVertical,
  Calendar,
  FolderLock,
  Video,
} from 'lucide-react'
import type { EventoCalendarioCategoria } from '@/types'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { GravadorReuniao } from '@/components/folha/GravadorReuniao'
import { ModalNovaReuniaoFolha } from '@/components/folha/ModalNovaReuniaoFolha'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { useToast } from '@/hooks/use-toast'
import {
  PainelBuscaFolha,
  FILTROS_PADRAO,
  type FolhaFiltrosState,
} from '@/components/folha/PainelBuscaFolha'
import { SementesAgrupadasPorTese } from '@/components/folha/SementesAgrupadasPorTese'
import ModalGerminarSemente from '@/components/folha/ModalGerminarSemente'
import type { DestinoMoverCategoria } from '@/components/fluxo/CardKanbanDiamond'
import type { DestinoCardFluxo } from '@/components/chat/ModalCriarCardMensagem'
import { listarContatosPaginado, type SugestaoContato } from '@/services/contatosSugestao'
import type { TeseSemente, LimitesConsumoConta, Card as CardTipo } from '@/types'
import { BannerConsumoPlano } from '@/components/comercial/BannerConsumoPlano'
import { ModalDesbloqueioPlano } from '@/components/comercial/ModalDesbloqueioPlano'
import { useAuth } from '@/hooks/use-auth'

export interface ItemRascunhoAssunto {
  idTemp: string
  registro: string
  dataHora: string
  tipoOrigem: OrigemTipo
  origemRef: string
  fluxo: string
  projetoId: string
  timeline: string
  contatoId: string
  negocioId: string
}

const STORAGE_KEY_RASCUNHO = 'agenda_ia_diamond_folha_rascunho_assuntos'

const getAgoraLocalISO = () => {
  const agora = new Date()
  const tzOffset = agora.getTimezoneOffset() * 60000
  return new Date(agora.getTime() - tzOffset).toISOString().slice(0, 16)
}

const criarItemAssuntoVazio = (): ItemRascunhoAssunto => ({
  idTemp: `temp_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
  registro: '',
  dataHora: getAgoraLocalISO(),
  tipoOrigem: 'manual',
  origemRef: '',
  fluxo: 'none',
  projetoId: 'none',
  timeline: '',
  contatoId: 'none',
  negocioId: 'none',
})

const normalizarFluxoRascunho = (valor: any): string => {
  if (typeof valor !== 'string' || !valor.trim()) return 'none'
  const v = valor.trim()
  // Trata registros legados onde os status padrão eram salvos como fase
  if (['novo', 'em_andamento', 'bloqueado', 'concluido'].includes(v)) {
    return 'none'
  }
  return v
}

const carregarRascunhoSalvo = (): ItemRascunhoAssunto[] => {
  if (typeof window === 'undefined') return [criarItemAssuntoVazio()]
  try {
    const salvo = localStorage.getItem(STORAGE_KEY_RASCUNHO)
    if (!salvo) return [criarItemAssuntoVazio()]
    const parsed = JSON.parse(salvo)
    if (Array.isArray(parsed) && parsed.length > 0) {
      return parsed.map((item: any, i: number) => ({
        idTemp:
          typeof item?.idTemp === 'string' && item.idTemp ? item.idTemp : `temp_${Date.now()}_${i}`,
        registro: typeof item?.registro === 'string' ? item.registro : '',
        dataHora:
          typeof item?.dataHora === 'string' && item.dataHora ? item.dataHora : getAgoraLocalISO(),
        tipoOrigem: (['manual', 'whatsapp', 'email', 'importado'] as OrigemTipo[]).includes(
          item?.tipoOrigem,
        )
          ? item.tipoOrigem
          : 'manual',
        origemRef: typeof item?.origemRef === 'string' ? item.origemRef : '',
        fluxo: normalizarFluxoRascunho(item?.fluxo),
        projetoId: typeof item?.projetoId === 'string' ? item.projetoId : 'none',
        timeline: typeof item?.timeline === 'string' ? item.timeline : '',
        contatoId: typeof item?.contatoId === 'string' ? item.contatoId : 'none',
        negocioId: typeof item?.negocioId === 'string' ? item.negocioId : 'none',
      }))
    }
  } catch (err) {
    console.error('Falha ao ler rascunho da folha do localStorage:', err)
  }
  return [criarItemAssuntoVazio()]
}

const chaveDataAssunto = (item: FolhaDia): string =>
  item.data_hora ? item.data_hora.slice(0, 10) : item.data || item.created?.slice(0, 10) || ''

const rotuloDataAssunto = (chave: string): string => {
  if (!chave) return 'Sem data'
  const hojeStr = new Date().toISOString().slice(0, 10)
  if (chave === hojeStr) return 'Hoje'
  const ontem = new Date()
  ontem.setDate(ontem.getDate() - 1)
  if (chave === ontem.toISOString().slice(0, 10)) return 'Ontem'
  const partes = chave.split('-').map(Number)
  if (partes.length !== 3 || partes.some(isNaN)) return chave
  const data = new Date(partes[0], partes[1] - 1, partes[2])
  const mesmoAno = data.getFullYear() === new Date().getFullYear()
  return new Intl.DateTimeFormat(
    'pt-BR',
    mesmoAno
      ? { day: '2-digit', month: 'long' }
      : { day: '2-digit', month: 'long', year: 'numeric' },
  ).format(data)
}

export default function Folha() {
  const { toast } = useToast()
  const navigate = useNavigate()
  const {
    fluxos: fluxosGlobal,
    categorias: categoriasGlobal,
    recarregarFluxo: recarregarFluxoGlobal,
    recarregarDadosGlobais,
  } = useNavegacao()
  const [folhaItems, setFolhaItems] = useState<FolhaDia[]>([])
  const [demandasCadastradas, setDemandasCadastradas] = useState<Demanda[]>([])
  const [projetos, setProjetos] = useState<Projeto[]>([])
  const [contatos, setContatos] = useState<Contato[]>([])
  const [negocios, setNegocios] = useState<Negocio[]>([])
  const [fluxos, setFluxos] = useState<FluxoKanban[]>([])
  const [categorias, setCategorias] = useState<CategoriaFluxo[]>([])
  const [marcosTimeline, setMarcosTimeline] = useState<MarcoTimeline[]>([])

  // Estado para saber qual assunto acionou o modal de criação rápida (por idTemp para manter estabilidade)
  const [assuntoAlvoIdTemp, setAssuntoAlvoIdTemp] = useState<string | null>(null)

  // 1. Modal Criar Projeto
  const [modalCriarProjetoOpen, setModalCriarProjetoOpen] = useState(false)
  const [novoProjetoNome, setNovoProjetoNome] = useState('')
  const [novoProjetoTipo, setNovoProjetoTipo] = useState<ProjetoTipo>('cliente')
  const [novoProjetoDescricao, setNovoProjetoDescricao] = useState('')
  const [criandoProjeto, setCriandoProjeto] = useState(false)

  // 2. Modal Criar Contato
  const [modalCriarContatoOpen, setModalCriarContatoOpen] = useState(false)
  const [novoContatoNome, setNovoContatoNome] = useState('')
  const [novoContatoEmpresa, setNovoContatoEmpresa] = useState('')
  const [novoContatoEmail, setNovoContatoEmail] = useState('')
  const [novoContatoTelefone, setNovoContatoTelefone] = useState('')
  const [novoContatoCargo, setNovoContatoCargo] = useState('')
  const [criandoContato, setCriandoContato] = useState(false)

  // 3. Modal Criar Fluxo Kanban
  const [modalCriarFluxoOpen, setModalCriarFluxoOpen] = useState(false)
  const [novoFluxoNome, setNovoFluxoNome] = useState('')
  const [novoFluxoCategoriaId, setNovoFluxoCategoriaId] = useState('')
  const [novoFluxoCor, setNovoFluxoCor] = useState('#0F766E')
  const [criandoFluxo, setCriandoFluxo] = useState(false)

  // 4. Modal Criar Marco de Timeline
  const [modalCriarTimelineOpen, setModalCriarTimelineOpen] = useState(false)
  const [novoTimelineNome, setNovoTimelineNome] = useState('')
  const [novoTimelineDescricao, setNovoTimelineDescricao] = useState('')
  const [criandoTimeline, setCriandoTimeline] = useState(false)

  // Aba ativa de captura: 'assuntos' (texto livre multi-assunto) ou 'gravador' (gravador de reuniões)
  const [modoCaptura, setModoCaptura] = useState<'assuntos' | 'gravador'>('assuntos')

  // Lista de assuntos múltiplos em elaboração na sessão, persistida no localStorage
  const [assuntos, setAssuntos] = useState<ItemRascunhoAssunto[]>(() => carregarRascunhoSalvo())

  const [loadingAdd, setLoadingAdd] = useState(false)

  const [loadingLancarId, setLoadingLancarId] = useState<string | null>(null)

  // Modal para Criar Demanda direta a partir de um assunto
  const [modalDemandaOpen, setModalDemandaOpen] = useState(false)
  const [demandaAssuntoOrigem, setDemandaAssuntoOrigem] = useState<{
    id?: string
    idTemp?: string
    numero: number
    texto: string
    projetoId?: string
    contatoId?: string
    timeline?: string
  } | null>(null)
  const [demandaTitulo, setDemandaTitulo] = useState('')
  const [demandaDescricao, setDemandaDescricao] = useState('')
  const [demandaPrioridade, setDemandaPrioridade] = useState<CardPrioridade>('media')
  const [demandaPrazo, setDemandaPrazo] = useState('')
  const [demandaProjeto, setDemandaProjeto] = useState('none')
  const [demandaContato, setDemandaContato] = useState('none')
  const [demandaTimeline, setDemandaTimeline] = useState('')
  const [criandoDemanda, setCriandoDemanda] = useState(false)

  // Modal Nova Reunião com IA (Gravação + Whisper + GPT + Kanban + Calendário)
  const [modalNovaReuniaoOpen, setModalNovaReuniaoOpen] = useState(false)

  // Modal de Detalhes da Reunião Gravada
  const [modalReuniaoDetalhesOpen, setModalReuniaoDetalhesOpen] = useState(false)
  const [reuniaoSelecionada, setReuniaoSelecionada] = useState<FolhaDia | null>(null)

  // Estado dos Filtros Avançados e Busca em Tempo Real (Fase 1)
  const [filtrosFolha, setFiltrosFolha] = useState<FolhaFiltrosState>(FILTROS_PADRAO)

  // Cofre por Tese de Sementes
  const [tesesSementes, setTesesSementes] = useState<TeseSemente[]>([])
  const [teseFiltroId, setTeseFiltroId] = useState<string>('todas')

  const { user, isMaster } = useAuth()
  const [limites, setLimites] = useState<LimitesConsumoConta | null>(null)
  const [modalUpgradeOpen, setModalUpgradeOpen] = useState(false)
  const [upgradeMotivo, setUpgradeMotivo] = useState('')

  // Modal de Arquivar como Semente
  const [modalSementeOpen, setModalSementeOpen] = useState(false)
  const [itemParaSemente, setItemParaSemente] = useState<FolhaDia | null>(null)
  const [sementeCondicao, setSementeCondicao] = useState('')
  const [sementeDataRevisao, setSementeDataRevisao] = useState(() => {
    const d = new Date()
    d.setMonth(d.getMonth() + 6)
    return d.toISOString().slice(0, 10)
  })
  const [sementeObservacao, setSementeObservacao] = useState('')
  const [sementeTeseEscolhida, setSementeTeseEscolhida] = useState<string>('none')
  const [sementeParceiro, setSementeParceiro] = useState('')
  const [sementeNegocio, setSementeNegocio] = useState('')
  /** Controle do Select de Negócio: id do negócio, '__livre__' (texto) ou 'none'. */
  const [sementeNegocioSelecionada, setSementeNegocioSelecionada] = useState<string>('none')
  const [salvandoSemente, setSalvandoSemente] = useState(false)

  // Germinar semente → card de demanda (cascata categoria → fluxo → coluna)
  const [sementeParaGerminar, setSementeParaGerminar] = useState<FolhaDia | null>(null)
  const [modalGerminarOpen, setModalGerminarOpen] = useState(false)
  const [germinando, setGerminando] = useState(false)

  // Filtros extras do Cofre (por parceiro e por negócio)
  const [parceiroFiltro, setParceiroFiltro] = useState<string>('todos')
  const [negocioFiltro, setNegocioFiltro] = useState<string>('todos')

  // Sugestões de contatos (campo Parceiro) — busca paginada no servidor
  const [sugestoesContato, setSugestoesContato] = useState<SugestaoContato[]>([])
  const [buscandoContatos, setBuscandoContatos] = useState(false)
  useEffect(() => {
    if (!modalSementeOpen) return
    let vivo = true
    const t = setTimeout(async () => {
      setBuscandoContatos(true)
      const res = await listarContatosPaginado(sementeParceiro, 1, 20)
      if (vivo) {
        setSugestoesContato(res.itens)
        setBuscandoContatos(false)
      }
    }, 300)
    return () => {
      vivo = false
      clearTimeout(t)
    }
  }, [sementeParceiro, modalSementeOpen])
  const [mostrarCriarTeseModal, setMostrarCriarTeseModal] = useState(false)
  const [novaTeseNomeModal, setNovaTeseNomeModal] = useState('')
  const [novaTeseDescModal, setNovaTeseDescModal] = useState('')
  const [criandoTeseModal, setCriandoTeseModal] = useState(false)

  const handleAbrirModalSemente = (item: FolhaDia) => {
    setItemParaSemente(item)
    setSementeCondicao(item.condicao_reativacao || '')
    setSementeTeseEscolhida(item.tese_semente || 'none')
    setSementeParceiro(item.semente_parceiro || '')
    setSementeNegocio(item.semente_negocio || '')
    // Preload do Select de Negócio: se o valor salvo é id de negócio existente, seleciona;
    // caso contrário (texto livre), marca '__livre__' com o texto carregado.
    const negocioExistente = negocios.find((ng) => ng.id === item.semente_negocio)
    setSementeNegocioSelecionada(
      item.semente_negocio ? (negocioExistente ? negocioExistente.id : '__livre__') : 'none',
    )
    setSugestoesContato([])
    if (item.data_revisao_semente) {
      setSementeDataRevisao(item.data_revisao_semente.slice(0, 10))
    } else {
      const d = new Date()
      d.setMonth(d.getMonth() + 6)
      setSementeDataRevisao(d.toISOString().slice(0, 10))
    }
    setSementeObservacao('')
    setModalSementeOpen(true)
  }

  const handleConfirmarArquivarSemente = async () => {
    if (!itemParaSemente) return
    setSalvandoSemente(true)
    try {
      const teseIdFinal = sementeTeseEscolhida !== 'none' ? sementeTeseEscolhida : ''
      const atualizado = await diamondApi.arquivarComoSemente(itemParaSemente.id, {
        condicao_reativacao: sementeCondicao,
        data_revisao_semente: sementeDataRevisao,
        observacao: sementeObservacao,
        tese_semente: teseIdFinal,
        semente_parceiro: sementeParceiro,
        semente_negocio: sementeNegocio,
      })

      setFolhaItems((prev) =>
        prev.map((i) =>
          i.id === itemParaSemente.id
            ? {
                ...i,
                ...atualizado,
                estado_semente: true,
                arquivado: true,
                tese_semente: teseIdFinal,
                semente_parceiro: sementeParceiro.trim(),
                semente_negocio: sementeNegocio.trim(),
              }
            : i,
        ),
      )

      toast({
        title: 'Assunto arquivado como Semente 🌱',
        description:
          'Guardado para germinar no cofre. Você pode consultá-lo por tese de mercado na aba Sementes.',
      })
      setModalSementeOpen(false)
      setItemParaSemente(null)
    } catch (err) {
      toast({
        title: 'Erro ao arquivar como semente',
        description: (err as Error)?.message,
        variant: 'destructive',
      })
    } finally {
      setSalvandoSemente(false)
    }
  }

  const handleReativarSemente = async (item: FolhaDia) => {
    try {
      const atualizado = await diamondApi.reativarSemente(item.id)
      setFolhaItems((prev) =>
        prev.map((i) =>
          i.id === item.id ? { ...i, ...atualizado, estado_semente: false, arquivado: false } : i,
        ),
      )
      toast({
        title: 'Semente reativada com sucesso! 🌱 ➔ 📋',
        description:
          'O assunto voltou para a lista ativa da Folha com seu histórico e vínculos preservados.',
      })
    } catch (err) {
      toast({
        title: 'Erro ao reativar semente',
        description: (err as Error)?.message,
        variant: 'destructive',
      })
    }
  }

  /**
   * Germinar: cria o card de demanda na cascata escolhida (fluxo_id + status
   * gravados JUNTOS — nunca card órfão) e marca a semente como germinada,
   * guardando o id do card criado para o link /card/:id.
   */
  const handleConfirmarGerminar = async (
    titulo: string,
    descricao: string,
    destino: DestinoCardFluxo,
  ) => {
    if (!sementeParaGerminar) return
    setGerminando(true)
    try {
      const payload: Record<string, unknown> = {
        titulo,
        descricao,
        fluxo_id: destino.fluxoId,
        status: destino.colunaChave, // coluna válida gravada JUNTO com fluxo_id
      }
      if (sementeParaGerminar.semente_parceiro) {
        payload.parceiro = sementeParaGerminar.semente_parceiro
      }
      if (sementeParaGerminar.semente_negocio) {
        payload.negocio_nome = sementeParaGerminar.semente_negocio
      }
      const card = await diamondApi.createCard(payload as Partial<CardTipo>)
      const cardId = (card as { id?: string })?.id || ''
      if (!cardId) throw new Error('Card criado sem id retornado.')
      await diamondApi.updateFolhaDia(sementeParaGerminar.id, {
        semente_germinada: true,
        card_germinado_id: cardId,
      })
      setFolhaItems((prev) =>
        prev.map((i) =>
          i.id === sementeParaGerminar.id
            ? { ...i, semente_germinada: true, card_germinado_id: cardId }
            : i,
        ),
      )
      toast({
        title: 'Semente germinou! 🌱',
        description: `Card "${titulo}" criado em "${destino.colunaTitulo}".`,
        action: (
          <Button size="sm" variant="outline" onClick={() => navigate(`/card/${cardId}`)}>
            Abrir card
          </Button>
        ),
      })
      setModalGerminarOpen(false)
      setSementeParaGerminar(null)
    } catch (err) {
      toast({
        title: 'Erro ao germinar semente',
        description: (err as Error)?.message,
        variant: 'destructive',
      })
    } finally {
      setGerminando(false)
    }
  }

  const handleAtribuirTeseRapida = async (item: FolhaDia, novaTeseId: string) => {
    try {
      const teseValor = novaTeseId === 'none' ? '' : novaTeseId
      await diamondApi.atribuirTeseSemente(item.id, teseValor)
      setFolhaItems((prev) =>
        prev.map((i) => (i.id === item.id ? { ...i, tese_semente: teseValor } : i)),
      )
      const nomeTese =
        teseValor === ''
          ? 'Sem tese'
          : tesesSementes.find((t) => t.id === teseValor)?.nome || 'Tese'
      toast({
        title: 'Tese atualizada',
        description: `Semente vinculada a: ${nomeTese}`,
      })
    } catch (err) {
      toast({
        title: 'Erro ao atualizar tese',
        description: (err as Error)?.message,
        variant: 'destructive',
      })
    }
  }

  const handleCriarTeseRapida = async (nome: string, descricao?: string) => {
    try {
      const novaTese = await diamondApi.createTeseSemente({ nome, descricao })
      setTesesSementes((prev) => [...prev, novaTese])
      toast({
        title: 'Tese de mercado criada!',
        description: `Tese "${novaTese.nome}" disponível no cofre.`,
      })
    } catch (err) {
      toast({
        title: 'Erro ao criar tese',
        description: (err as Error)?.message,
        variant: 'destructive',
      })
      throw err
    }
  }

  // Ações de Fixar e Arquivar
  const handleToggleFixar = async (item: FolhaDia) => {
    const novoStatus = !item.fixado
    try {
      await diamondApi.fixarFolhaDia(item.id, novoStatus)
      setFolhaItems((prev) =>
        prev.map((i) => (i.id === item.id ? { ...i, fixado: novoStatus } : i)),
      )
      toast({
        title: novoStatus ? 'Assunto fixado no topo' : 'Fixação removida',
      })
    } catch (err) {
      toast({
        title: 'Erro ao alterar fixação',
        description: (err as Error)?.message,
        variant: 'destructive',
      })
    }
  }

  const handleToggleArquivar = async (item: FolhaDia) => {
    const novoStatus = !item.arquivado
    try {
      await diamondApi.arquivarFolhaDia(item.id, novoStatus)
      setFolhaItems((prev) =>
        prev.map((i) => (i.id === item.id ? { ...i, arquivado: novoStatus } : i)),
      )

      // Requisito 5: Arquivar/descartar um assunto vindo do WhatsApp adiciona o remetente à lista de ignorados
      if (novoStatus && item.tipo_origem === 'whatsapp') {
        try {
          await diamondApi.ignorarRemetenteWhatsApp({ folha_id: item.id })
          toast({
            title: 'Assunto arquivado e remetente ignorado',
            description:
              'Mensagens futuras deste remetente do WhatsApp não gerarão novos assuntos na Folha.',
          })
          return
        } catch {
          /* intentionally ignored */
        }
      }

      toast({
        title: novoStatus ? 'Assunto arquivado' : 'Assunto desarquivado',
        description: novoStatus
          ? 'O assunto foi movido para os arquivados e continua pesquisável.'
          : 'O assunto voltou à lista ativa principal.',
      })
    } catch (err) {
      toast({
        title: 'Erro ao alterar status de arquivo',
        description: (err as Error)?.message,
        variant: 'destructive',
      })
    }
  }

  // Modal de Organizar com IA
  interface SugestaoEventoIA {
    folha_id?: string | null
    titulo: string
    descricao: string
    data_inicio: string
    data_fim: string | null
    categoria: EventoCalendarioCategoria
    e_reuniao: boolean
    projeto_id?: string | null
    contato_id?: string | null
    prioridade: 'baixa' | 'media' | 'alta' | 'urgente'
    _selecionado?: boolean
    _link_reuniao?: string
  }
  const [organizando, setOrganizando] = useState(false)
  const [modalRevisaoOpen, setModalRevisaoOpen] = useState(false)
  const [sugestoesIA, setSugestoesIA] = useState<{
    cards: Array<{
      folha_id?: string
      titulo: string
      descricao: string
      projeto_id?: string
      negocio_id?: string
      contato_id?: string
      tags: string[]
      prioridade: 'baixa' | 'media' | 'alta' | 'urgente'
      status: 'novo' | 'em_andamento' | 'bloqueado' | 'concluido'
      proximo_passo: string
    }>
    resumo?: {
      feito?: string
      a_fazer?: string
      prioridades?: string
      decisoes?: string
      proximos_passos?: string
    }
    atualizacoes_contexto?: Array<{
      tipo: 'projeto' | 'contato'
      id: string
      novo_contexto: string
    }>
    eventos?: SugestaoEventoIA[]
  } | null>(null)
  const [eventosSelecionados, setEventosSelecionados] = useState<Record<number, boolean>>({})
  const [salvandoRevisao, setSalvandoRevisao] = useState(false)

  const [searchParams] = useSearchParams()
  const destaqueParam = searchParams.get('destaque')

  // Rolagem suave até o item em destaque se fornecido na URL
  useEffect(() => {
    if (destaqueParam && folhaItems.length > 0) {
      const el = document.getElementById(`assunto-${destaqueParam}`)
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' })
      }
    }
  }, [destaqueParam, folhaItems])

  // Cabeçalho fixo ao rolar: um sentinel acima do header sai da vista => header está fixo/compacto
  const [cabecalhoFixo, setCabecalhoFixo] = useState(false)
  const sentinelHeaderRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    const sentinel = sentinelHeaderRef.current
    if (!sentinel) return
    const observer = new IntersectionObserver(
      (entradas) => {
        setCabecalhoFixo(!entradas[0]?.isIntersecting)
      },
      { rootMargin: '-1px 0px 0px 0px', threshold: 0 },
    )
    observer.observe(sentinel)
    return () => observer.disconnect()
  }, [])

  // Captura rápida: campo único no topo, Enter lança o assunto direto na Folha
  const [textoCapturaRapida, setTextoCapturaRapida] = useState('')
  const [salvandoCapturaRapida, setSalvandoCapturaRapida] = useState(false)

  // Recarga silenciosa somente da listagem de folha_dia e demandas (sem piscar nem alterar formulários)
  const recarregarFolhaSilencioso = async () => {
    try {
      const [f, dem] = await Promise.all([
        diamondApi.listFolhaDia(),
        diamondApi.listDemandas().catch(() => []),
      ])
      setFolhaItems(f)
      setDemandasCadastradas(dem)
    } catch (err) {
      console.error('Erro ao recarregar folha silencioso:', err)
    }
  }

  const carregarDados = async () => {
    try {
      const [f, p, c, n, flxs, cats, marcos, dem, teses] = await Promise.all([
        diamondApi.listFolhaDia(),
        diamondApi.listProjetos(),
        diamondApi.listContatos(),
        diamondApi.listNegocios(),
        diamondApi.listFluxosKanban(),
        diamondApi.listCategoriasFluxo(),
        diamondApi.listMarcosTimeline(),
        diamondApi.listDemandas().catch(() => []),
        diamondApi.listTesesSementes().catch(() => []),
      ])
      setFolhaItems(f)
      setDemandasCadastradas(dem)
      setProjetos(p)
      setContatos(c)
      setNegocios(n)
      setFluxos(flxs)
      setCategorias(cats)
      setMarcosTimeline(marcos)
      setTesesSementes(teses)
      recarregarDadosGlobais().catch(() => {})
    } catch (err) {
      console.error('Erro ao carregar folha:', err)
    }
  }

  useEffect(() => {
    carregarDados()
    diamondApi
      .getLimitesConsumoConta(user?.id, user?.email)
      .then(setLimites)
      .catch(() => {})

    // Polling leve a cada 30 segundos enquanto a página estiver aberta
    const intervalo = setInterval(() => {
      recarregarFolhaSilencioso()
    }, 30000)

    return () => clearInterval(intervalo)
  }, [user])

  // Inscrição em tempo real na coleção folha_dia para atualizar instantaneamente quando chegar nova mensagem
  useRealtime<any>('folha_dia', (e) => {
    if (e.action === 'create' && e.record) {
      const novo = e.record as FolhaDia
      setFolhaItems((prev) => {
        if (prev.some((item) => item.id === novo.id)) return prev
        return [novo, ...prev]
      })
    } else if (e.action === 'update' && e.record) {
      const atualizado = e.record as FolhaDia
      setFolhaItems((prev) =>
        prev.map((item) => (item.id === atualizado.id ? { ...item, ...atualizado } : item)),
      )
    } else if (e.action === 'delete' && e.record) {
      const deletadoId = e.record.id
      setFolhaItems((prev) => prev.filter((item) => item.id !== deletadoId))
    }
  })

  // Colunas/fases dos fluxos (para a cascata do Germinar: categoria → fluxo → coluna)
  const [colunas, setColunas] = useState<ColunaFluxo[]>([])
  useEffect(() => {
    diamondApi
      .listColunasFluxo()
      .then(setColunas)
      .catch(() => setColunas([]))
  }, [])

  // Destinos em cascata para o modal Germinar (mesmo padrão de montarDestinosMover do /fluxo)
  const destinosGerminar = useMemo<DestinoMoverCategoria[]>(() => {
    return categorias
      .map((cat) => ({
        id: cat.id,
        nome: cat.nome,
        fluxos: fluxos
          .filter((fl) => fl.categoria === cat.id)
          .sort((a, b) => (a.ordem || 0) - (b.ordem || 0))
          .map((fl) => ({
            id: fl.id,
            nome: fl.nome,
            colunas: colunas
              .filter((c) => c.fluxo_id === fl.id)
              .sort((a, b) => (a.ordem ?? 0) - (b.ordem ?? 0)),
          }))
          .filter((fl) => fl.colunas.length > 0),
      }))
      .filter((cat) => cat.fluxos.length > 0)
  }, [categorias, fluxos, colunas])

  // Sincroniza fluxos e categorias locais com o NavegacaoContext
  useEffect(() => {
    if (fluxosGlobal && fluxosGlobal.length > 0) {
      setFluxos(fluxosGlobal)
    }
  }, [fluxosGlobal])

  useEffect(() => {
    if (categoriasGlobal && categoriasGlobal.length > 0) {
      setCategorias(categoriasGlobal)
    }
  }, [categoriasGlobal])

  // Sincroniza rascunho com o localStorage sempre que os assuntos mudarem
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_RASCUNHO, JSON.stringify(assuntos))
    } catch (err) {
      console.error('Falha ao sincronizar rascunho da folha no localStorage:', err)
    }
  }, [assuntos])

  // Gerenciamento dos múltiplos assuntos da folha
  const handleAdicionarAssunto = () => {
    setAssuntos((prev) => [
      ...prev,
      {
        idTemp: `temp_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        registro: '',
        dataHora: getAgoraLocalISO(),
        tipoOrigem: 'manual',
        origemRef: '',
        fluxo: 'none',
        projetoId: 'none',
        timeline: '',
        contatoId: 'none',
        negocioId: 'none',
      },
    ])
  }

  const handleRemoverAssuntoPorId = (idTemp: string) => {
    if (assuntos.length <= 1) {
      // Limpa o único assunto existente em vez de deixar vazio
      setAssuntos([criarItemAssuntoVazio()])
      return
    }
    setAssuntos((prev) => prev.filter((a) => a.idTemp !== idTemp))
  }

  const handleRemoverAssunto = (idx: number) => {
    const item = assuntos[idx]
    if (item?.idTemp) {
      handleRemoverAssuntoPorId(item.idTemp)
    } else {
      if (assuntos.length <= 1) {
        setAssuntos([criarItemAssuntoVazio()])
        return
      }
      setAssuntos((prev) => prev.filter((_, i) => i !== idx))
    }
  }

  const handleLimparTodosAssuntos = () => {
    const temConteudo = assuntos.some((a) => a.registro.trim().length > 0)
    if (temConteudo) {
      const confirma = window.confirm(
        'Tem certeza que deseja apagar todos os assuntos digitados nesta folha?',
      )
      if (!confirma) return
    }
    setAssuntos([criarItemAssuntoVazio()])
    toast({ title: 'Rascunho da folha limpo com sucesso' })
  }

  const handleMoverAssunto = (idx: number, direcao: 'cima' | 'baixo') => {
    const destino = direcao === 'cima' ? idx - 1 : idx + 1
    if (destino < 0 || destino >= assuntos.length) return

    setAssuntos((prev) => {
      const copia = [...prev]
      const temp = copia[idx]
      copia[idx] = copia[destino]
      copia[destino] = temp
      return copia
    })
  }

  const handleMoverAssuntoPorId = (idTemp: string, direcao: 'cima' | 'baixo') => {
    const idx = assuntos.findIndex((a) => a.idTemp === idTemp)
    if (idx === -1) return
    handleMoverAssunto(idx, direcao)
  }

  const handleAtualizarAssunto = (idx: number, campo: keyof ItemRascunhoAssunto, valor: any) => {
    setAssuntos((prev) => {
      const copia = [...prev]
      copia[idx] = { ...copia[idx], [campo]: valor }
      return copia
    })
  }

  const handleAtualizarAssuntoPorId = (
    idTemp: string,
    campo: keyof ItemRascunhoAssunto,
    valor: any,
  ) => {
    setAssuntos((prev) =>
      prev.map((item) => (item.idTemp === idTemp ? { ...item, [campo]: valor } : item)),
    )
  }

  // Handlers para criação rápida a partir dos seletores
  const handleAbrirCriarProjeto = (idTemp: string) => {
    setAssuntoAlvoIdTemp(idTemp)
    setNovoProjetoNome('')
    setNovoProjetoTipo('cliente')
    setNovoProjetoDescricao('')
    setModalCriarProjetoOpen(true)
  }

  const handleSubmeterCriarProjeto = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!novoProjetoNome.trim()) return
    setCriandoProjeto(true)
    try {
      const pasta = await diamondApi
        .createPasta({ nome: `${novoProjetoNome.trim()} - Arquivos` })
        .catch(() => null)

      const criado = await diamondApi.createProjeto({
        nome: novoProjetoNome.trim(),
        tipo: novoProjetoTipo,
        status: 'ativo',
        descricao: novoProjetoDescricao.trim() || undefined,
        pasta_raiz: pasta?.id,
      })

      toast({
        title: 'Projeto criado com sucesso!',
        description: `Projeto "${criado.nome}" agora está disponível e vinculado.`,
      })

      // Atualiza lista de projetos
      setProjetos((prev) => [criado, ...prev])

      // Auto-seleciona no assunto que disparou ou no modal de demanda
      if (assuntoAlvoIdTemp && assuntoAlvoIdTemp !== 'reuniao_temp') {
        handleAtualizarAssuntoPorId(assuntoAlvoIdTemp, 'projetoId', criado.id)
      } else if (assuntoAlvoIdTemp === null) {
        setDemandaProjeto(criado.id)
      }

      setModalCriarProjetoOpen(false)
    } catch (err) {
      toast({
        title: 'Erro ao criar projeto',
        description: (err as Error)?.message,
        variant: 'destructive',
      })
    } finally {
      setCriandoProjeto(false)
    }
  }

  const handleAbrirCriarContato = (idTemp: string) => {
    setAssuntoAlvoIdTemp(idTemp)
    setNovoContatoNome('')
    setNovoContatoEmpresa('')
    setNovoContatoEmail('')
    setNovoContatoTelefone('')
    setNovoContatoCargo('')
    setModalCriarContatoOpen(true)
  }

  const handleSubmeterCriarContato = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!novoContatoNome.trim()) return
    setCriandoContato(true)
    try {
      const currentAssunto =
        assuntoAlvoIdTemp && assuntoAlvoIdTemp !== 'reuniao_temp'
          ? assuntos.find((a) => a.idTemp === assuntoAlvoIdTemp)
          : null
      const projId =
        currentAssunto && currentAssunto.projetoId !== 'none' ? currentAssunto.projetoId : undefined

      const criado = await diamondApi.createContato({
        nome: novoContatoNome.trim(),
        empresa: novoContatoEmpresa.trim() || undefined,
        email: novoContatoEmail.trim() || undefined,
        telefone: novoContatoTelefone.trim() || undefined,
        cargo: novoContatoCargo.trim() || undefined,
        origem: currentAssunto?.tipoOrigem || 'manual',
        projetos: projId ? [projId] : [],
      })

      toast({
        title: 'Contato criado com sucesso!',
        description: `Contato "${criado.nome}" agora está disponível e vinculado.`,
      })

      setContatos((prev) => [criado, ...prev])

      if (assuntoAlvoIdTemp && assuntoAlvoIdTemp !== 'reuniao_temp') {
        handleAtualizarAssuntoPorId(assuntoAlvoIdTemp, 'contatoId', criado.id)
      } else if (assuntoAlvoIdTemp === null) {
        setDemandaContato(criado.id)
      }

      setModalCriarContatoOpen(false)
    } catch (err) {
      toast({
        title: 'Erro ao criar contato',
        description: (err as Error)?.message,
        variant: 'destructive',
      })
    } finally {
      setCriandoContato(false)
    }
  }

  const handleAbrirCriarFluxo = (idTemp: string) => {
    setAssuntoAlvoIdTemp(idTemp)
    setNovoFluxoNome('')
    setNovoFluxoCor('#0F766E')
    setNovoFluxoCategoriaId(categorias[0]?.id || '')
    setModalCriarFluxoOpen(true)
  }

  const handleSubmeterCriarFluxo = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!novoFluxoNome.trim()) return
    setCriandoFluxo(true)
    try {
      let categoriaIdFinal = novoFluxoCategoriaId
      if (!categoriaIdFinal && categorias.length > 0) {
        categoriaIdFinal = categorias[0].id
      }
      if (!categoriaIdFinal) {
        const novaCat = await diamondApi.createCategoriaFluxo({
          nome: 'Geral',
          cor: '#0F766E',
          ordem: 1,
        })
        setCategorias((prev) => [...prev, novaCat])
        categoriaIdFinal = novaCat.id
      }

      const novoFluxo = await diamondApi.createFluxoKanban({
        nome: novoFluxoNome.trim(),
        titulo: novoFluxoNome.trim(),
        categoria: categoriaIdFinal,
        cor: novoFluxoCor,
        ordem: fluxos.length + 1,
        template_origem: 'diamond_padrao',
      })

      // Fases padrão do modelo DiamondGroup vinculadas ao novo fluxo
      const fasesPadrao = [
        { titulo: 'Backlog', cor: '#64748B', is_conclusao: false },
        { titulo: 'A Fazer', cor: '#0EA5E9', is_conclusao: false },
        { titulo: 'Fazendo', cor: '#F59E0B', is_conclusao: false },
        { titulo: 'Conferir', cor: '#8B5CF6', is_conclusao: false },
        { titulo: 'Finalizado', cor: '#10B981', is_conclusao: true },
      ]

      for (let i = 0; i < fasesPadrao.length; i++) {
        const f = fasesPadrao[i]
        const slug = f.titulo
          .toLowerCase()
          .normalize('NFD')
          .replace(/[\u0300-\u036f]/g, '')
          .replace(/[^a-z0-9]+/g, '_')
        const chaveFase = `${slug}_${novoFluxo.id}_${Date.now()}_${i + 1}`
        await diamondApi
          .createColunaFluxo({
            chave: chaveFase,
            titulo: f.titulo,
            cor: f.cor,
            ordem: i + 1,
            categoria: categoriaIdFinal,
            fluxo_id: novoFluxo.id,
            is_conclusao: f.is_conclusao,
            template_origem: 'diamond_padrao',
          })
          .catch(() => {})
      }

      toast({
        title: 'Fluxo criado com sucesso!',
        description: `Fluxo "${novoFluxo.nome}" adicionado com suas fases Kanban e selecionado.`,
      })

      setFluxos((prev) => [...prev, novoFluxo])

      if (assuntoAlvoIdTemp && assuntoAlvoIdTemp !== 'reuniao_temp') {
        handleAtualizarAssuntoPorId(assuntoAlvoIdTemp, 'fluxo', novoFluxo.id)
      }

      setModalCriarFluxoOpen(false)
      recarregarFluxoGlobal().catch(() => {})
    } catch (err) {
      toast({
        title: 'Erro ao criar fluxo',
        description: (err as Error)?.message,
        variant: 'destructive',
      })
    } finally {
      setCriandoFluxo(false)
    }
  }

  const handleAbrirCriarTimeline = (idTemp: string) => {
    setAssuntoAlvoIdTemp(idTemp)
    setNovoTimelineNome('')
    setNovoTimelineDescricao('')
    setModalCriarTimelineOpen(true)
  }

  const handleSubmeterCriarTimeline = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!novoTimelineNome.trim()) return
    setCriandoTimeline(true)
    try {
      const currentAssunto =
        assuntoAlvoIdTemp && assuntoAlvoIdTemp !== 'reuniao_temp'
          ? assuntos.find((a) => a.idTemp === assuntoAlvoIdTemp)
          : null
      const projId =
        currentAssunto && currentAssunto.projetoId !== 'none' ? currentAssunto.projetoId : undefined

      const novoMarco = await diamondApi.createMarcoTimeline({
        nome: novoTimelineNome.trim(),
        descricao: novoTimelineDescricao.trim() || undefined,
        projeto: projId,
      })

      toast({
        title: 'Marco de timeline criado com sucesso!',
        description: `Marco "${novoMarco.nome}" adicionado e selecionado no assunto.`,
      })

      setMarcosTimeline((prev) => [novoMarco, ...prev])

      if (assuntoAlvoIdTemp && assuntoAlvoIdTemp !== 'reuniao_temp') {
        handleAtualizarAssuntoPorId(assuntoAlvoIdTemp, 'timeline', novoMarco.nome)
      } else if (assuntoAlvoIdTemp === null) {
        setDemandaTimeline(novoMarco.nome)
      }

      setModalCriarTimelineOpen(false)
    } catch (err) {
      toast({
        title: 'Erro ao criar marco',
        description: (err as Error)?.message,
        variant: 'destructive',
      })
    } finally {
      setCriandoTimeline(false)
    }
  }

  // Verificação de limite de dias de Folha antes de lançar
  const verificarBloqueioDiaFolha = (datasParaVerificar: string[]): boolean => {
    if (!limites) return false
    // Se a conta não tem limite de dias de folha (pro / enterprise), não bloqueia
    if (!limites.bloqueadoFolha && limites.diasFolhaUsados < limites.diasFolhaMax) {
      // Mas se o usuário estiver tentando adicionar um dia NOVO e já estiver no limite:
      const diasCadastrados = new Set<string>()
      folhaItems.forEach((f) => {
        const d = (
          f.data_hora ? f.data_hora.slice(0, 10) : f.data ? f.data.slice(0, 10) : ''
        ).trim()
        if (d) diasCadastrados.add(d)
      })

      const tentandoAdicionarDiaInedito = datasParaVerificar.some(
        (d) => d && !diasCadastrados.has(d),
      )
      if (tentandoAdicionarDiaInedito && diasCadastrados.size >= limites.diasFolhaMax) {
        setUpgradeMotivo(
          `Você atingiu o limite de ${limites.diasFolhaMax} dias de folha do plano gratuito (Prova Viva). Ative o plano pago para criar folhas em dias ilimitados.`,
        )
        setModalUpgradeOpen(true)
        return true
      }
      return false
    }

    if (limites.bloqueadoFolha) {
      const diasCadastrados = new Set<string>()
      folhaItems.forEach((f) => {
        const d = (
          f.data_hora ? f.data_hora.slice(0, 10) : f.data ? f.data.slice(0, 10) : ''
        ).trim()
        if (d) diasCadastrados.add(d)
      })
      const tentandoAdicionarDiaInedito = datasParaVerificar.some(
        (d) => d && !diasCadastrados.has(d),
      )
      if (tentandoAdicionarDiaInedito) {
        setUpgradeMotivo(
          `Você atingiu o limite de ${limites.diasFolhaMax} dias de folha do plano gratuito (Prova Viva). Ative o plano pago para criar folhas em dias ilimitados.`,
        )
        setModalUpgradeOpen(true)
        return true
      }
    }

    return false
  }

  // Captura rápida (Enter): mesmo modelo/campos mínimos do formulário completo
  // (folha_dia, data/hora agora, status pendente, sem vínculos — a IA classifica no fechamento)
  const handleCapturaRapidaEnter = async () => {
    const texto = textoCapturaRapida.trim()
    if (!texto || salvandoCapturaRapida) return

    const agoraLocal = getAgoraLocalISO()
    const dataPart = agoraLocal.split('T')[0]

    if (verificarBloqueioDiaFolha([dataPart])) return

    setSalvandoCapturaRapida(true)
    try {
      const pendentesAtuais = folhaItems.filter((i) => i.status === 'pendente')
      const proximaOrdem = pendentesAtuais.length > 0 ? pendentesAtuais.length + 1 : 1

      await diamondApi.createFolhaDia({
        data: dataPart,
        data_hora: agoraLocal,
        ordem: proximaOrdem,
        registro: texto,
        tipo_origem: 'manual',
        status: 'pendente',
      })

      setTextoCapturaRapida('')
      toast({
        title: 'Assunto lançado com sucesso!',
        description:
          'Registrado na Folha do Dia. Os vínculos são classificados pela IA no fechamento da sessão.',
      })
      await carregarDados()
    } catch (err) {
      toast({
        title: 'Erro ao lançar assunto',
        description: (err as Error)?.message || 'Tente novamente.',
        variant: 'destructive',
      })
    } finally {
      setSalvandoCapturaRapida(false)
    }
  }

  // Lançamento individual de um assunto do rascunho
  const handleLancarAssuntoIndividual = async (idTemp: string) => {
    const item = assuntos.find((a) => a.idTemp === idTemp)
    if (!item || !item.registro.trim()) {
      toast({
        title: 'Assunto sem texto',
        description: 'Digite o conteúdo do assunto antes de lançá-lo.',
        variant: 'destructive',
      })
      return
    }

    const dataPartAlvo = item.dataHora
      ? item.dataHora.split('T')[0]
      : new Date().toISOString().split('T')[0]

    if (verificarBloqueioDiaFolha([dataPartAlvo])) {
      return
    }

    setLoadingLancarId(idTemp)
    try {
      const pendentesAtuais = folhaItems.filter((i) => i.status === 'pendente')
      const proximaOrdem = pendentesAtuais.length > 0 ? pendentesAtuais.length + 1 : 1

      const dataPart = item.dataHora
        ? item.dataHora.split('T')[0]
        : new Date().toISOString().split('T')[0]

      await diamondApi.createFolhaDia({
        data: dataPart,
        data_hora: item.dataHora || undefined,
        ordem: proximaOrdem,
        registro: item.registro.trim(),
        tipo_origem: item.tipoOrigem,
        origem_ref: item.origemRef.trim() || undefined,
        status: 'pendente',
        fluxo: item.fluxo !== 'none' ? item.fluxo : undefined,
        projeto: item.projetoId !== 'none' ? item.projetoId : undefined,
        timeline: item.timeline.trim() || undefined,
        contato: item.contatoId !== 'none' ? item.contatoId : undefined,
        negocio: item.negocioId !== 'none' ? item.negocioId : undefined,
      })

      // Remove este assunto lançado do rascunho mantendo os demais
      setAssuntos((prev) => {
        const restantes = prev.filter((a) => a.idTemp !== idTemp)
        return restantes.length > 0 ? restantes : [criarItemAssuntoVazio()]
      })

      toast({
        title: 'Assunto lançado com sucesso!',
        description: 'O assunto foi registrado na Folha do Dia e removido do rascunho.',
      })

      await carregarDados()
    } catch (err) {
      toast({
        title: 'Erro ao lançar assunto',
        description: (err as Error)?.message || 'Tente novamente.',
        variant: 'destructive',
      })
    } finally {
      setLoadingLancarId(null)
    }
  }

  // Lançamento dos múltiplos assuntos salvando na coleção folha_dia
  const handleLancarTodosAssuntos = async (e: React.FormEvent) => {
    e.preventDefault()

    const validos = assuntos.filter((a) => a.registro.trim().length > 0)
    if (validos.length === 0) {
      toast({
        title: 'Folha vazia',
        description: 'Digite o conteúdo de pelo menos um assunto para lançar na folha.',
        variant: 'destructive',
      })
      return
    }

    const datasAlvo = validos.map((item) =>
      item.dataHora ? item.dataHora.split('T')[0] : new Date().toISOString().split('T')[0],
    )

    if (verificarBloqueioDiaFolha(datasAlvo)) {
      return
    }

    setLoadingAdd(true)
    try {
      const pendentesAtuais = folhaItems.filter((i) => i.status === 'pendente')
      let proximaOrdem = pendentesAtuais.length > 0 ? pendentesAtuais.length + 1 : 1

      for (const item of validos) {
        const dataPart = item.dataHora
          ? item.dataHora.split('T')[0]
          : new Date().toISOString().split('T')[0]

        await diamondApi.createFolhaDia({
          data: dataPart,
          data_hora: item.dataHora || undefined,
          ordem: proximaOrdem++,
          registro: item.registro.trim(),
          tipo_origem: item.tipoOrigem,
          origem_ref: item.origemRef.trim() || undefined,
          status: 'pendente',
          fluxo: item.fluxo !== 'none' ? item.fluxo : undefined,
          projeto: item.projetoId !== 'none' ? item.projetoId : undefined,
          timeline: item.timeline.trim() || undefined,
          contato: item.contatoId !== 'none' ? item.contatoId : undefined,
          negocio: item.negocioId !== 'none' ? item.negocioId : undefined,
        })
      }

      // Reinicia formulário com 1 assunto limpo (o useEffect sincronizará com o localStorage)
      setAssuntos([criarItemAssuntoVazio()])

      toast({
        title: `${validos.length} ${validos.length === 1 ? 'assunto capturado' : 'assuntos capturados'}!`,
        description: 'Os assuntos foram numerados e registrados na Folha do Dia.',
      })

      await carregarDados()
    } catch (err) {
      toast({
        title: 'Erro ao lançar assuntos',
        description: (err as Error)?.message || 'Tente novamente.',
        variant: 'destructive',
      })
    } finally {
      setLoadingAdd(false)
    }
  }

  // Exclusão de registro da folha já salvo
  const handleExcluirRegistro = async (id: string) => {
    try {
      const itemExcluido = folhaItems.find((i) => i.id === id)
      // Requisito 5: Descartar um assunto vindo do WhatsApp adiciona o remetente à lista de ignorados
      if (itemExcluido?.tipo_origem === 'whatsapp') {
        try {
          await diamondApi.ignorarRemetenteWhatsApp({ folha_id: id })
        } catch {
          /* intentionally ignored */
        }
      }

      await diamondApi.deleteFolhaDia(id)
      toast({
        title: 'Assunto descartado da folha',
        description:
          itemExcluido?.tipo_origem === 'whatsapp'
            ? 'Remetente adicionado à lista de ignorados do WhatsApp.'
            : undefined,
      })
      setFolhaItems((prev) => prev.filter((item) => item.id !== id))
    } catch (err) {
      toast({ title: 'Erro ao remover', variant: 'destructive' })
    }
  }

  // Reordenação de assuntos já persistidos
  const handleReordenarPersistido = async (idx: number, direcao: 'cima' | 'baixo') => {
    const pendentes = folhaItems.filter((i) => i.status === 'pendente')
    const destino = direcao === 'cima' ? idx - 1 : idx + 1
    if (destino < 0 || destino >= pendentes.length) return

    const itemA = pendentes[idx]
    const itemB = pendentes[destino]

    const ordemA = itemA.ordem || idx + 1
    const ordemB = itemB.ordem || destino + 1

    try {
      // Troca ordem
      await Promise.all([
        diamondApi.updateFolhaDia(itemA.id, { ordem: ordemB }),
        diamondApi.updateFolhaDia(itemB.id, { ordem: ordemA }),
      ])
      await carregarDados()
    } catch (err) {
      toast({ title: 'Erro ao reordenar', variant: 'destructive' })
    }
  }

  // Modal para Criar Demanda a partir de um assunto (rascunho ou já persistido)
  const handleAbrirCriarDemanda = (dados: {
    id?: string
    idTemp?: string
    numero: number
    texto: string
    projetoId?: string
    contatoId?: string
    timeline?: string
  }) => {
    setDemandaAssuntoOrigem(dados)
    // Título e Descrição/Contexto em branco conforme decisão do usuário
    // para preenchimento livre a partir do zero mantendo os vínculos herdados
    setDemandaTitulo('')
    setDemandaDescricao('')
    setDemandaPrioridade('media')
    setDemandaPrazo('')
    setDemandaProjeto(dados.projetoId && dados.projetoId !== 'none' ? dados.projetoId : 'none')
    setDemandaContato(dados.contatoId && dados.contatoId !== 'none' ? dados.contatoId : 'none')
    setDemandaTimeline(dados.timeline || '')
    setModalDemandaOpen(true)
  }

  // Abertura de modais de criação a partir do modal de Demanda
  const handleAbrirCriarProjetoEmDemanda = () => {
    setAssuntoAlvoIdTemp(null)
    setNovoProjetoNome('')
    setNovoProjetoTipo('cliente')
    setNovoProjetoDescricao('')
    setModalCriarProjetoOpen(true)
  }

  const handleAbrirCriarContatoEmDemanda = () => {
    setAssuntoAlvoIdTemp(null)
    setNovoContatoNome('')
    setNovoContatoEmpresa('')
    setNovoContatoEmail('')
    setNovoContatoTelefone('')
    setNovoContatoCargo('')
    setModalCriarContatoOpen(true)
  }

  const handleAbrirCriarTimelineEmDemanda = () => {
    setAssuntoAlvoIdTemp(null)
    setNovoTimelineNome('')
    setNovoTimelineDescricao('')
    setModalCriarTimelineOpen(true)
  }

  const handleConfirmarCriarDemanda = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!demandaTitulo.trim()) return

    setCriandoDemanda(true)
    try {
      await diamondApi.createDemanda({
        titulo: demandaTitulo.trim(),
        descricao: demandaDescricao.trim() || undefined,
        status: 'pendente',
        prazo: demandaPrazo || undefined,
        projeto: demandaProjeto !== 'none' ? demandaProjeto : undefined,
        contato: demandaContato !== 'none' ? demandaContato : undefined,
        prioridade: demandaPrioridade,
        timeline: demandaTimeline.trim() || undefined,
      })

      // Se a demanda veio de um assunto do rascunho (em elaboração), remove o assunto do rascunho
      if (demandaAssuntoOrigem?.idTemp) {
        setAssuntos((prev) => {
          const restantes = prev.filter((a) => a.idTemp !== demandaAssuntoOrigem.idTemp)
          return restantes.length > 0 ? restantes : [criarItemAssuntoVazio()]
        })
      }

      toast({
        title: 'Demanda criada com sucesso!',
        description: `Demanda vinculada ao assunto ${demandaAssuntoOrigem?.numero || ''} salva na lista de demandas.`,
      })

      setModalDemandaOpen(false)
    } catch (err) {
      toast({
        title: 'Erro ao criar demanda',
        description: (err as Error)?.message || 'Não foi possível gerar a demanda.',
        variant: 'destructive',
      })
    } finally {
      setCriandoDemanda(false)
    }
  }

  // Organização com IA
  const handleOrganizarComIA = async () => {
    const pendentes = folhaItems.filter((f) => f.status === 'pendente')
    if (pendentes.length === 0) {
      toast({
        title: 'Nenhum assunto pendente',
        description: 'Lance os assuntos na folha antes de organizar com a IA.',
      })
      return
    }

    setOrganizando(true)
    try {
      const resultado = await diamondApi.organizarFolha()
      setSugestoesIA(resultado)
      // Todos os eventos propostos vêm pré-selecionados para aprovação
      const mapaEventos: Record<number, boolean> = {}
      ;(resultado?.eventos || []).forEach((_: SugestaoEventoIA, idx: number) => {
        mapaEventos[idx] = true
      })
      setEventosSelecionados(mapaEventos)
      setModalRevisaoOpen(true)
    } catch (err) {
      toast({
        title: 'Falha na IA',
        description: (err as Error)?.message || 'Não foi possível organizar agora.',
        variant: 'destructive',
      })
    } finally {
      setOrganizando(false)
    }
  }

  const handleAprovarESalvar = async () => {
    if (!sugestoesIA) return
    setSalvandoRevisao(true)
    try {
      const hoje = new Date().toISOString().split('T')[0]

      // 1. Criar os cards aprovados
      if (sugestoesIA.cards && sugestoesIA.cards.length > 0) {
        for (const card of sugestoesIA.cards) {
          await diamondApi.createCard({
            titulo: card.titulo,
            descricao: card.descricao,
            projeto: card.projeto_id || undefined,
            negocio: card.negocio_id || undefined,
            contato: card.contato_id || undefined,
            tags: card.tags,
            prioridade: card.prioridade,
            status: card.status,
            proximo_passo: card.proximo_passo,
            criado_por_ia: true,
          })
        }
      }

      // 2. Criar os eventos aprovados na agenda (datas e horários citados nos assuntos)
      const eventosAprovados = (sugestoesIA.eventos || []).filter(
        (_, idx) => eventosSelecionados[idx],
      )
      for (const ev of eventosAprovados) {
        try {
          // Sala de reunião (Jitsi) quando o compromisso parecer reunião/encontro,
          // mesmo padrão da "Nova Reunião" da Folha
          const linkReuniao = ev.e_reuniao ? `https://meet.jit.si/diamond-${Date.now()}` : undefined

          await diamondApi.createEventoCalendario({
            titulo: ev.titulo,
            descricao: ev.descricao || undefined,
            data_inicio: new Date(ev.data_inicio).toISOString(),
            data_fim: ev.data_fim ? new Date(ev.data_fim).toISOString() : undefined,
            categoria: ev.categoria,
            status: 'pendente',
            prioridade: ev.prioridade,
            projeto: ev.projeto_id || undefined,
            contato: ev.contato_id || undefined,
            folha_origem: ev.folha_id || undefined,
            link_reuniao: linkReuniao,
          })
        } catch (errEv) {
          console.error('Erro ao criar evento a partir da Folha:', errEv)
        }
      }

      // 3. Salvar resumo do dia (com a lista dos eventos criados na agenda)
      if (sugestoesIA.resumo) {
        const listaEventosTxt =
          eventosAprovados.length > 0
            ? '\n\n📅 Compromissos agendados na agenda:\n' +
              eventosAprovados
                .map((ev) => {
                  const dt = new Date(ev.data_inicio)
                  const dataTxt = dt.toLocaleDateString('pt-BR')
                  const horaTxt = dt.toLocaleTimeString('pt-BR', {
                    hour: '2-digit',
                    minute: '2-digit',
                  })
                  const sala = ev.e_reuniao ? ' (com sala de reunião online)' : ''
                  return `- ${ev.titulo}: ${dataTxt} às ${horaTxt}${sala}`
                })
                .join('\n')
            : ''

        await diamondApi.createResumo({
          data: hoje,
          feito: sugestoesIA.resumo.feito || '',
          a_fazer: sugestoesIA.resumo.a_fazer || '',
          prioridades: sugestoesIA.resumo.prioridades || '',
          decisoes: sugestoesIA.resumo.decisoes || '',
          proximos_passos: (sugestoesIA.resumo.proximos_passos || '') + listaEventosTxt,
          contagem_cards_criados: sugestoesIA.cards?.length || 0,
        })
      }

      // 4. Atualizar contexto histórico de projetos e contatos
      if (sugestoesIA.atualizacoes_contexto) {
        for (const act of sugestoesIA.atualizacoes_contexto) {
          if (act.tipo === 'projeto' && act.id) {
            await diamondApi
              .updateProjeto(act.id, { contexto_resumido: act.novo_contexto })
              .catch(() => {})
          } else if (act.tipo === 'contato' && act.id) {
            await diamondApi
              .updateContato(act.id, { contexto_resumido: act.novo_contexto })
              .catch(() => {})
          }
        }
      }

      // 4. Marcar os registros da folha como processados
      const pendentes = folhaItems.filter((f) => f.status === 'pendente')
      for (const f of pendentes) {
        await diamondApi.updateFolhaDia(f.id, { status: 'processado' })
      }

      toast({
        title: 'Sessão finalizada e organizada com sucesso!',
        description:
          eventosAprovados.length > 0
            ? `${eventosAprovados.length} ${eventosAprovados.length === 1 ? 'compromisso agendado' : 'compromissos agendados'} na agenda, cards no Kanban e Resumo do Dia gravado.`
            : 'Cards inseridos no Kanban e Resumo do Dia gravado na memória.',
      })

      // Limpa o rascunho em elaboração caso o usuário tenha lançado tudo
      setAssuntos([criarItemAssuntoVazio()])

      setModalRevisaoOpen(false)
      await carregarDados()
    } catch (err) {
      toast({
        title: 'Erro ao consolidar',
        description: (err as Error)?.message || 'Erro ao salvar alterações.',
        variant: 'destructive',
      })
    } finally {
      setSalvandoRevisao(false)
    }
  }

  // Sementes são um terceiro estado especial — não entram nos pendentes/ativos comuns nem nas estatísticas de demandas
  const sementes = folhaItems.filter((item) => Boolean(item.estado_semente))
  const pendentes = folhaItems.filter(
    (item) => item.status === 'pendente' && !item.estado_semente && !item.arquivado,
  )
  const processados = folhaItems.filter(
    (item) => item.status === 'processado' && !item.estado_semente && !item.arquivado,
  )

  // Conjunto de IDs ou textos de assuntos que possuem demandas cadastradas
  const assuntosComDemandaSet = useMemo(() => {
    const set = new Set<string>()
    demandasCadastradas.forEach((d) => {
      if (d.titulo) set.add(d.titulo.toLowerCase().trim())
      if (d.descricao) set.add(d.descricao.toLowerCase().trim())
    })
    return set
  }, [demandasCadastradas])

  const verificarTemDemanda = (item: FolhaDia) => {
    const txt = (item.registro || '').toLowerCase().trim()
    if (!txt) return false
    for (const d of demandasCadastradas) {
      if (
        d.titulo &&
        (txt.includes(d.titulo.toLowerCase()) || d.titulo.toLowerCase().includes(txt.slice(0, 30)))
      ) {
        return true
      }
      if (d.descricao && d.descricao.toLowerCase().includes(txt.slice(0, 30))) {
        return true
      }
      if (
        d.projeto &&
        item.projeto &&
        d.projeto === item.projeto &&
        d.created?.slice(0, 10) === item.created?.slice(0, 10)
      ) {
        return true
      }
    }
    return false
  }

  // Filtragem combinada da lista de assuntos (Fase 1)
  const itensFiltrados = useMemo(() => {
    return folhaItems
      .filter((item) => {
        // 1. Filtro de Arquivamento e Estado Semente
        const isSemente = Boolean(item.estado_semente)
        const isArquivado = Boolean(item.arquivado) && !isSemente

        if (filtrosFolha.estadoArquivo === 'ativos') {
          if (isSemente || Boolean(item.arquivado)) return false
        } else if (filtrosFolha.estadoArquivo === 'sementes') {
          // Semente germinada sai do cofre ativo (continua visível com selo quando germinada)
          if (!isSemente) return false
          if (item.semente_germinada) return false
        } else if (filtrosFolha.estadoArquivo === 'arquivados') {
          if (!isArquivado || isSemente) return false
        }

        // 2. Busca por texto em tempo real (título, notas, transcrição da reunião, ata)
        if (filtrosFolha.busca.trim()) {
          const termo = filtrosFolha.busca.toLowerCase().trim()
          const noRegistro = (item.registro || '').toLowerCase().includes(termo)
          const naOrigemRef = (item.origem_ref || '').toLowerCase().includes(termo)
          const naTimeline = (item.timeline || '').toLowerCase().includes(termo)
          let naAta = false
          if (item.ata_organizada) {
            if (typeof item.ata_organizada === 'string') {
              naAta = item.ata_organizada.toLowerCase().includes(termo)
            } else {
              naAta = JSON.stringify(item.ata_organizada).toLowerCase().includes(termo)
            }
          }
          if (!noRegistro && !naOrigemRef && !naTimeline && !naAta) {
            return false
          }
        }

        // 3. Período
        const dataItem =
          (item.data_hora
            ? item.data_hora.slice(0, 10)
            : item.data || item.created?.slice(0, 10)) || ''
        if (filtrosFolha.periodo !== 'todos' && dataItem) {
          const hojeStr = new Date().toISOString().slice(0, 10)
          if (filtrosFolha.periodo === 'hoje') {
            if (dataItem !== hojeStr) return false
          } else if (filtrosFolha.periodo === 'esta_semana') {
            const agora = new Date()
            const primeiroDiaSemana = new Date(agora)
            primeiroDiaSemana.setDate(agora.getDate() - agora.getDay())
            const primeiroDiaStr = primeiroDiaSemana.toISOString().slice(0, 10)
            if (dataItem < primeiroDiaStr || dataItem > hojeStr) return false
          } else if (filtrosFolha.periodo === 'este_mes') {
            const mesAtual = hojeStr.slice(0, 7)
            if (!dataItem.startsWith(mesAtual)) return false
          } else if (filtrosFolha.periodo === 'personalizado') {
            if (filtrosFolha.dataInicio && dataItem < filtrosFolha.dataInicio) return false
            if (filtrosFolha.dataFim && dataItem > filtrosFolha.dataFim) return false
          }
        }

        // 4. Tipo (comum / reunião / whatsapp)
        if (filtrosFolha.tipo === 'reuniao' && !item.is_reuniao) return false
        if (filtrosFolha.tipo === 'comum' && (item.is_reuniao || item.tipo_origem === 'whatsapp'))
          return false
        if (filtrosFolha.tipo === 'whatsapp' && item.tipo_origem !== 'whatsapp') return false

        // 5. Vínculo: Categoria › Fluxo
        if (filtrosFolha.fluxoId !== 'todos') {
          if (item.fluxo !== filtrosFolha.fluxoId) return false
        }

        // 6. Vínculo: Projeto
        if (filtrosFolha.projetoId !== 'todos') {
          if (item.projeto !== filtrosFolha.projetoId) return false
        }

        // 7. Vínculo: Contato
        if (filtrosFolha.contatoId !== 'todos') {
          if (item.contato !== filtrosFolha.contatoId) return false
        }

        // 8. Vínculo: Timeline
        if (filtrosFolha.timeline !== 'todos') {
          if (item.timeline !== filtrosFolha.timeline) return false
        }

        // 9. Estado: Demanda criada
        if (filtrosFolha.estadoDemanda !== 'todos') {
          const temDemanda = verificarTemDemanda(item)
          if (filtrosFolha.estadoDemanda === 'com_demanda' && !temDemanda) return false
          if (filtrosFolha.estadoDemanda === 'sem_demanda' && temDemanda) return false
        }

        // 10. Estado: Vínculo de Fluxo
        if (filtrosFolha.estadoFluxo !== 'todos') {
          const temFluxo = Boolean(item.fluxo && item.fluxo !== 'none')
          if (filtrosFolha.estadoFluxo === 'com_fluxo' && !temFluxo) return false
          if (filtrosFolha.estadoFluxo === 'sem_fluxo' && temFluxo) return false
        }

        // 11. Cofre: filtro por parceiro e por negócio (só na aba Sementes)
        if (filtrosFolha.estadoArquivo === 'sementes') {
          if (parceiroFiltro !== 'todos' && (item.semente_parceiro || '') !== parceiroFiltro)
            return false
          if (negocioFiltro !== 'todos' && (item.semente_negocio || '') !== negocioFiltro)
            return false
        }

        return true
      })
      .sort((a, b) => {
        // Fixados sempre no topo da lista
        const aFix = a.fixado ? 1 : 0
        const bFix = b.fixado ? 1 : 0
        if (aFix !== bFix) return bFix - aFix

        // Ordenação secundária
        if (filtrosFolha.ordenacao === 'antigos') {
          const dA = a.data_hora || a.data || a.created || ''
          const dB = b.data_hora || b.data || b.created || ''
          return dA.localeCompare(dB)
        } else {
          const dA = a.data_hora || a.data || a.created || ''
          const dB = b.data_hora || b.data || b.created || ''
          return dB.localeCompare(dA)
        }
      })
  }, [folhaItems, filtrosFolha, demandasCadastradas, parceiroFiltro, negocioFiltro])

  // Cofre: opções distintas de parceiro e negócio presentes nas sementes (alimenta os selects)
  const parceirosDisponiveis = useMemo(() => {
    const nomes = new Set<string>()
    folhaItems.forEach((i) => {
      if (Boolean(i.estado_semente) && (i.semente_parceiro || '').trim()) {
        nomes.add(i.semente_parceiro!.trim())
      }
    })
    return Array.from(nomes).sort((a, b) => a.localeCompare(b))
  }, [folhaItems])

  const negociosDisponiveis = useMemo(() => {
    const nomes = new Set<string>()
    folhaItems.forEach((i) => {
      if (Boolean(i.estado_semente) && (i.semente_negocio || '').trim()) {
        nomes.add(i.semente_negocio!.trim())
      }
    })
    return Array.from(nomes).sort((a, b) => a.localeCompare(b))
  }, [folhaItems])

  // Agrupamento por data (Hoje, Ontem, datas anteriores) — apenas apresentação da lista já filtrada
  const itensAgrupadosPorData = useMemo(() => {
    const contagemPorChave = new Map<string, number>()
    itensFiltrados.forEach((item) => {
      const chave = chaveDataAssunto(item) || 'sem_data'
      contagemPorChave.set(chave, (contagemPorChave.get(chave) || 0) + 1)
    })

    const chavesVistas = new Set<string>()
    return itensFiltrados.map((item, idx) => {
      const chave = chaveDataAssunto(item) || 'sem_data'
      let cabecalho: { label: string; count: number } | undefined
      if (!chavesVistas.has(chave)) {
        chavesVistas.add(chave)
        cabecalho = {
          label: chave === 'sem_data' ? 'Sem data' : rotuloDataAssunto(chave),
          count: contagemPorChave.get(chave) || 0,
        }
      }
      return { item, idx, cabecalho }
    })
  }, [itensFiltrados])

  const totalSementes = useMemo(
    () => folhaItems.filter((i) => Boolean(i.estado_semente)).length,
    [folhaItems],
  )

  const contagemSementesPorTese = useMemo(() => {
    const counts: Record<string, number> = { sem_tese: 0 }
    tesesSementes.forEach((t) => {
      counts[t.id] = 0
    })
    folhaItems.forEach((item) => {
      if (!item.estado_semente) return
      if (item.tese_semente && counts[item.tese_semente] !== undefined) {
        counts[item.tese_semente]++
      } else {
        counts['sem_tese']++
      }
    })
    return counts
  }, [folhaItems, tesesSementes])
  const totalArquivados = useMemo(
    () => folhaItems.filter((i) => Boolean(i.arquivado) && !i.estado_semente).length,
    [folhaItems],
  )
  const totalFixados = useMemo(
    () => folhaItems.filter((i) => Boolean(i.fixado) && !i.arquivado && !i.estado_semente).length,
    [folhaItems],
  )

  const formatarTempoDecorrido = (dataOrigemStr?: string) => {
    if (!dataOrigemStr) return ''
    try {
      const d = new Date(dataOrigemStr)
      if (isNaN(d.getTime())) return ''
      const agora = new Date()
      const diffMs = Math.max(0, agora.getTime() - d.getTime())
      const diffDias = Math.floor(diffMs / (1000 * 60 * 60 * 24))
      if (diffDias < 1) return 'hoje'
      if (diffDias === 1) return 'há 1 dia'
      if (diffDias < 30) return `há ${diffDias} dias`
      const diffMeses = Math.floor(diffDias / 30)
      if (diffMeses <= 1) return 'há 1 mês'
      if (diffMeses < 12) return `há ${diffMeses} meses`
      const diffAnos = Math.floor(diffDias / 365)
      return diffAnos <= 1 ? 'há 1 ano' : `há ${diffAnos} anos`
    } catch {
      return ''
    }
  }

  const getOrigemIcon = (tipo?: OrigemTipo, isReuniao?: boolean) => {
    if (isReuniao) {
      return <Mic className="w-3.5 h-3.5 text-red-600" />
    }
    switch (tipo) {
      case 'whatsapp':
        return <MessageSquare className="w-3.5 h-3.5 text-emerald-600" />
      case 'email':
        return <Mail className="w-3.5 h-3.5 text-blue-600" />
      case 'importado':
        return <FileText className="w-3.5 h-3.5 text-purple-600" />
      default:
        return <PhoneCall className="w-3.5 h-3.5 text-amber-600" />
    }
  }

  const formatarSegundos = (seg?: number) => {
    if (!seg || seg <= 0) return '00:00'
    const mins = Math.floor(seg / 60)
    const secs = seg % 60
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }

  const handleAbrirDetalhesReuniao = (item: FolhaDia) => {
    setReuniaoSelecionada(item)
    setModalReuniaoDetalhesOpen(true)
  }

  const getFluxoBadge = (fluxoValor?: string) => {
    if (!fluxoValor || fluxoValor === 'none') return null

    // 1. Busca por id ou nome em fluxos_kanban
    const fluxoFound = fluxos.find(
      (f) => f.id === fluxoValor || f.nome === fluxoValor || f.titulo === fluxoValor,
    )
    if (fluxoFound) {
      const cat = categorias.find((c) => c.id === fluxoFound.categoria)
      const nomeFluxo = fluxoFound.nome || fluxoFound.titulo || 'Fluxo'
      const label = cat ? `${cat.nome} › ${nomeFluxo}` : nomeFluxo
      return (
        <Badge
          className="border-none text-[10px] font-medium text-white shadow-2xs"
          style={{ backgroundColor: fluxoFound.cor || '#0F766E' }}
        >
          {label}
        </Badge>
      )
    }

    // 2. Fallback gracioso para registros legados que guardavam fases/status antigos
    switch (fluxoValor) {
      case 'em_andamento':
        return (
          <Badge className="bg-[#0F766E]/15 text-[#0F766E] border-none text-[10px] font-medium">
            Em Andamento
          </Badge>
        )
      case 'bloqueado':
        return (
          <Badge className="bg-red-100 text-red-700 border-none text-[10px] font-medium">
            Bloqueado
          </Badge>
        )
      case 'concluido':
        return (
          <Badge className="bg-emerald-100 text-emerald-700 border-none text-[10px] font-medium">
            Concluído
          </Badge>
        )
      case 'novo':
        return null
      default:
        return (
          <Badge className="bg-gray-100 text-gray-700 border-none text-[10px] font-medium">
            {fluxoValor.replace('_', ' ')}
          </Badge>
        )
    }
  }

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-12">
      {/* Sentinel: quando sai da vista, o cabeçalho abaixo está fixo no topo */}
      <div ref={sentinelHeaderRef} aria-hidden="true" className="h-px w-full" />

      {/* Top Header fixo: compacta ao rolar, mantendo título, contagens e botões acessíveis */}
      <div
        className={`sticky top-0 z-30 -mx-4 md:-mx-6 px-4 md:px-6 pt-2 pb-3 transition-all duration-200 ${
          cabecalhoFixo
            ? 'bg-[#F4F2EE]/95 backdrop-blur-md shadow-md border-b border-[#E5E1D8]'
            : 'bg-transparent border-b border-transparent'
        }`}
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-xl border border-[#E5E1D8] shadow-xs">
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-lg md:text-xl font-bold tracking-tight text-[#1A1D21]">
                Folha em Branco do Dia
              </h1>
              {!cabecalhoFixo && (
                <Badge className="bg-[#0F766E]/10 text-[#0F766E] border-none text-[11px] font-semibold">
                  Captura Multi-Assuntos
                </Badge>
              )}
            </div>
            {!cabecalhoFixo && (
              <p className="text-xs text-[#5B6470] mt-1">
                Lance assuntos de diversas áreas com data, hora e vínculos personalizados (fluxo,
                projeto, timeline e contatos) ou crie demandas imediatas.
              </p>
            )}
          </div>

          <div className="flex items-center gap-2 flex-wrap shrink-0">
            <Button
              onClick={handleOrganizarComIA}
              disabled={organizando || pendentes.length === 0}
              className="bg-[#0F766E] hover:bg-[#0D5C56] text-white text-xs h-9 px-4 font-medium shadow-sm gap-2"
            >
              {organizando ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Organizando com IA...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  {cabecalhoFixo ? 'Organizar com IA' : 'Organizar com IA & Finalizar Sessão'}
                </>
              )}
            </Button>
          </div>
        </div>

        {/* Barra de contagens da sessão (pendentes / processados / sementes / fixados) */}
        <div className="flex flex-wrap items-center gap-2 mt-2">
          <span className="text-[11px] font-medium text-[#5B6470] bg-white border border-[#E5E1D8] px-2.5 py-1 rounded-full flex items-center gap-1.5 shadow-2xs">
            <CheckSquare className="w-3 h-3 text-[#0F766E]" />
            Pendentes: <strong className="text-[#0F766E] font-bold">{pendentes.length}</strong>
          </span>
          <span className="text-[11px] font-medium text-[#5B6470] bg-white border border-[#E5E1D8] px-2.5 py-1 rounded-full flex items-center gap-1.5 shadow-2xs">
            <CheckCircle2 className="w-3 h-3 text-blue-600" />
            Processados: <strong className="text-blue-700 font-bold">{processados.length}</strong>
          </span>
          <span className="text-[11px] font-medium text-[#5B6470] bg-white border border-[#E5E1D8] px-2.5 py-1 rounded-full flex items-center gap-1.5 shadow-2xs">
            <Sprout className="w-3 h-3 text-emerald-600" />
            Sementes: <strong className="text-emerald-700 font-bold">{totalSementes}</strong>
          </span>
          {totalFixados > 0 && (
            <span className="text-[11px] font-medium text-[#5B6470] bg-white border border-[#E5E1D8] px-2.5 py-1 rounded-full flex items-center gap-1.5 shadow-2xs">
              <Pin className="w-3 h-3 text-amber-600" />
              Fixados: <strong className="text-amber-700 font-bold">{totalFixados}</strong>
            </span>
          )}
        </div>
      </div>

      {/* Captura Rápida: Enter lança o assunto direto na Folha, sem abrir o formulário completo */}
      <form
        onSubmit={(e) => {
          e.preventDefault()
          handleCapturaRapidaEnter()
        }}
        className="flex items-center gap-2 bg-white border border-[#E5E1D8] rounded-xl shadow-xs px-3 py-2.5"
      >
        <Sparkles className="w-4 h-4 text-[#0F766E] shrink-0" />
        <Input
          value={textoCapturaRapida}
          onChange={(e) => setTextoCapturaRapida(e.target.value)}
          placeholder="Lançar assunto rápido… Enter para salvar"
          disabled={salvandoCapturaRapida}
          className="border-none shadow-none focus-visible:ring-0 text-sm"
        />
        {salvandoCapturaRapida ? (
          <Loader2 className="w-4 h-4 animate-spin text-[#0F766E] shrink-0" />
        ) : (
          <Button
            type="submit"
            size="sm"
            disabled={!textoCapturaRapida.trim()}
            className="h-8 text-xs bg-[#0F766E] hover:bg-[#0D5C56] gap-1.5 shrink-0"
          >
            <Send className="w-3.5 h-3.5" />
            Lançar
          </Button>
        )}
      </form>

      {/* Banner de Consumo e Limite do Plano */}
      {limites && (
        <BannerConsumoPlano
          titulo="Folha em Branco do Dia"
          usado={limites.diasFolhaUsados}
          max={limites.diasFolhaMax}
          unidade="dias"
          bloqueado={limites.bloqueadoFolha}
          planoAtivo={limites.plano === 'pro' || limites.plano === 'diamond_executive'}
          isContaTeste={limites.isContaTeste}
          recursoNome="dias de folha"
          onDesbloquear={() => {
            setUpgradeMotivo(
              `Você utilizou ${limites.diasFolhaUsados} de ${limites.diasFolhaMax} dias de folha no plano gratuito (Prova Viva). Ative o plano pago para criar e gerenciar folhas em dias ilimitados.`,
            )
            setModalUpgradeOpen(true)
          }}
        />
      )}

      {/* Seletor de Modo de Captura: Texto Multi-Assuntos vs Gravador de Reuniões */}
      <div className="flex items-center gap-2 border-b border-[#E5E1D8] pb-1">
        <button
          type="button"
          onClick={() => setModoCaptura('assuntos')}
          className={`flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-t-lg transition-all ${
            modoCaptura === 'assuntos'
              ? 'bg-white text-[#0F766E] border-t-2 border-t-[#0F766E] border-x border-[#E5E1D8] shadow-2xs'
              : 'text-[#5B6470] hover:text-[#1A1D21] hover:bg-white/50'
          }`}
        >
          <FileEdit className="w-4 h-4" />
          <span>Assuntos da Folha ({assuntos.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setModoCaptura('gravador')}
          className={`flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-t-lg transition-all ${
            modoCaptura === 'gravador'
              ? 'bg-white text-[#0F766E] border-t-2 border-t-[#0F766E] border-x border-[#E5E1D8] shadow-2xs'
              : 'text-[#5B6470] hover:text-[#1A1D21] hover:bg-white/50'
          }`}
        >
          <Mic className="w-4 h-4 text-red-600" />
          <span className="flex items-center gap-1.5">
            Gravador de Reuniões
            <Badge className="bg-red-100 text-red-700 hover:bg-red-100 border-none text-[9px] px-1.5 py-0 font-bold">
              NOVO
            </Badge>
          </span>
        </button>
      </div>

      {/* Modo Gravador de Reuniões */}
      {modoCaptura === 'gravador' && (
        <GravadorReuniao onAbrirNovaReuniao={() => setModalNovaReuniaoOpen(true)} />
      )}

      {/* Formulário de Múltiplos Assuntos da Folha */}
      {modoCaptura === 'assuntos' && (
        <Card className="border-[#E5E1D8] bg-white shadow-xs">
          <CardHeader className="pb-3 border-b border-[#E5E1D8]/60">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-semibold text-[#1A1D21] flex items-center gap-2">
                <FileEdit className="w-4 h-4 text-[#0F766E]" />
                Folha do Dia: Lançamento de Assuntos por Área
              </CardTitle>
              <span className="text-xs font-medium text-[#0F766E] bg-[#0F766E]/10 px-2.5 py-1 rounded-full">
                {assuntos.length} {assuntos.length === 1 ? 'assunto' : 'assuntos'} na folha
              </span>
            </div>
            <CardDescription className="text-xs text-[#5B6470]">
              Escreva como vier: ligações, conversas, prazos. A agenda separa por negócio, pessoa e
              tarefa, e você confirma.
            </CardDescription>
          </CardHeader>

          <form onSubmit={handleLancarTodosAssuntos}>
            <CardContent className="space-y-5 pt-4">
              {/* Texto de orientação preservado visível */}
              <div className="rounded-lg bg-[#0F766E]/5 border border-[#0F766E]/20 p-3 text-xs text-[#0D5C56] leading-relaxed flex items-start gap-2.5">
                <Sparkles className="w-4 h-4 text-[#0F766E] shrink-0 mt-0.5" />
                <span>
                  Escreva como vier: ligações, conversas, prazos. A agenda separa por negócio,
                  pessoa e tarefa, e você confirma.
                </span>
              </div>

              {/* Lista dos Assuntos Numerados */}
              <div className="space-y-4">
                {assuntos.map((item, idx) => {
                  const numeroAssunto = idx + 1
                  return (
                    <div
                      key={item.idTemp}
                      className="p-4 rounded-xl border border-[#E5E1D8] bg-[#FAFAF9] space-y-3 relative hover:border-[#0F766E]/40 transition-colors"
                    >
                      {/* Cabeçalho do Assunto com Numeração e Controles */}
                      <div className="flex items-center justify-between gap-2 border-b border-[#E5E1D8]/70 pb-2.5">
                        <div className="flex items-center gap-2">
                          <span className="flex items-center justify-center w-6 h-6 rounded-full bg-[#0F766E] text-white text-xs font-bold shadow-2xs">
                            {numeroAssunto}
                          </span>
                          <span className="text-xs font-bold text-[#1A1D21]">
                            Assunto {numeroAssunto}
                          </span>
                        </div>

                        <div className="flex items-center gap-1">
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            disabled={idx === 0}
                            onClick={() => handleMoverAssuntoPorId(item.idTemp, 'cima')}
                            className="h-7 w-7 p-0 text-[#5B6470] hover:text-[#1A1D21]"
                            title="Subir assunto"
                          >
                            <ArrowUp className="w-3.5 h-3.5" />
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            disabled={idx === assuntos.length - 1}
                            onClick={() => handleMoverAssuntoPorId(item.idTemp, 'baixo')}
                            className="h-7 w-7 p-0 text-[#5B6470] hover:text-[#1A1D21]"
                            title="Descer assunto"
                          >
                            <ArrowDown className="w-3.5 h-3.5" />
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() =>
                              handleAbrirCriarDemanda({
                                idTemp: item.idTemp,
                                numero: numeroAssunto,
                                texto: item.registro,
                                projetoId: item.projetoId,
                                contatoId: item.contatoId,
                                timeline: item.timeline,
                              })
                            }
                            disabled={!item.registro.trim()}
                            className="h-7 px-2 text-[11px] font-medium text-[#0F766E] hover:bg-[#0F766E]/10 gap-1"
                            title="Criar demanda imediata a partir deste assunto"
                          >
                            <CheckSquare className="w-3.5 h-3.5" />
                            <span className="hidden sm:inline">Criar demanda</span>
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            disabled={!item.registro.trim() || loadingLancarId === item.idTemp}
                            onClick={() => handleLancarAssuntoIndividual(item.idTemp)}
                            className="h-7 px-2 text-[11px] font-medium text-[#0F766E] hover:bg-[#0F766E]/10 gap-1"
                            title="Lançar somente este assunto na folha"
                          >
                            {loadingLancarId === item.idTemp ? (
                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            ) : (
                              <Send className="w-3 h-3" />
                            )}
                            <span className="hidden sm:inline">Lançar</span>
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => handleRemoverAssuntoPorId(item.idTemp)}
                            className="h-7 w-7 p-0 text-[#5B6470] hover:text-red-600"
                            title="Remover este assunto"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      </div>

                      {/* Campo de Texto do Assunto */}
                      <div>
                        <Textarea
                          rows={2}
                          placeholder="Escreva como vier: ligações, conversas, prazos. A agenda separa por negócio, pessoa e tarefa, e você confirma."
                          value={item.registro}
                          onChange={(e) =>
                            handleAtualizarAssuntoPorId(item.idTemp, 'registro', e.target.value)
                          }
                          className="text-sm bg-white border-[#E5E1D8] resize-none focus-visible:ring-1 focus-visible:ring-[#0F766E]"
                        />
                      </div>

                      {/* Linha 1: Data e hora + Origem + Referência */}
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <div>
                          <label className="text-[11px] font-semibold text-[#5B6470] block mb-1">
                            Data e hora
                          </label>
                          <Input
                            type="datetime-local"
                            value={item.dataHora}
                            onChange={(e) =>
                              handleAtualizarAssuntoPorId(item.idTemp, 'dataHora', e.target.value)
                            }
                            className="text-xs h-8 bg-white border-[#E5E1D8]"
                          />
                        </div>

                        <div>
                          <label className="text-[11px] font-semibold text-[#5B6470] block mb-1">
                            Origem do Registro
                          </label>
                          <Select
                            value={item.tipoOrigem}
                            onValueChange={(v) =>
                              handleAtualizarAssuntoPorId(
                                item.idTemp,
                                'tipoOrigem',
                                v as OrigemTipo,
                              )
                            }
                          >
                            <SelectTrigger className="text-xs h-8 bg-white border-[#E5E1D8]">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="manual">Manual / Anotação</SelectItem>
                              <SelectItem value="whatsapp">WhatsApp</SelectItem>
                              <SelectItem value="email">E-mail</SelectItem>
                              <SelectItem value="importado">Importado / Outro</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        <div>
                          <label className="text-[11px] font-semibold text-[#5B6470] block mb-1">
                            Referência (Opcional)
                          </label>
                          <Input
                            placeholder="Ex: Grupo Diretoria / Ligação 14h"
                            value={item.origemRef}
                            onChange={(e) =>
                              handleAtualizarAssuntoPorId(item.idTemp, 'origemRef', e.target.value)
                            }
                            className="text-xs h-8 bg-white border-[#E5E1D8]"
                          />
                        </div>
                      </div>

                      {/* Linha 2: Vínculos Opcionais (Fluxo, Projeto, Timeline, Contato) */}
                      <div className="pt-2 border-t border-[#E5E1D8]/50">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-[#0F766E] block mb-2">
                          Vínculos do Assunto (Opcionais)
                        </span>
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
                          {/* 1. Vincular a Fluxo */}
                          <div>
                            <div className="flex items-center justify-between mb-1">
                              <label className="text-[11px] font-semibold text-[#5B6470] flex items-center gap-1">
                                <Layers className="w-3 h-3 text-[#0F766E]" />
                                Vincular a Fluxo
                              </label>
                              <button
                                type="button"
                                onClick={() => handleAbrirCriarFluxo(item.idTemp)}
                                className="text-[10px] font-medium text-[#0F766E] hover:underline flex items-center gap-0.5"
                                title="Cadastrar novo fluxo Kanban"
                              >
                                <Plus className="w-3 h-3" />
                                Criar
                              </button>
                            </div>
                            <Select
                              value={item.fluxo}
                              onValueChange={(v) => {
                                if (v === '__create_new__') {
                                  handleAbrirCriarFluxo(item.idTemp)
                                } else {
                                  handleAtualizarAssuntoPorId(item.idTemp, 'fluxo', v)
                                }
                              }}
                            >
                              <SelectTrigger className="text-xs h-8 bg-white border-[#E5E1D8]">
                                <SelectValue placeholder="Automático (IA)" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem
                                  value="__create_new__"
                                  className="text-[#0F766E] font-semibold bg-[#0F766E]/5 hover:bg-[#0F766E]/15 focus:bg-[#0F766E]/15 cursor-pointer border-b border-[#E5E1D8] mb-1"
                                >
                                  + Criar novo fluxo...
                                </SelectItem>
                                <SelectItem value="none">Automático (Deixar para IA)</SelectItem>
                                {fluxos
                                  .filter((flx) => flx.ativo !== false || flx.id === item.fluxo)
                                  .map((flx) => {
                                    const cat = categorias.find((c) => c.id === flx.categoria)
                                    const nomeFluxo = flx.nome || flx.titulo || 'Fluxo'
                                    const label = cat ? `${cat.nome} › ${nomeFluxo}` : nomeFluxo
                                    return (
                                      <SelectItem key={flx.id} value={flx.id}>
                                        <span className="flex items-center gap-1.5">
                                          <span
                                            className="w-2 h-2 rounded-full shrink-0"
                                            style={{ backgroundColor: flx.cor || '#0F766E' }}
                                          />
                                          {label}
                                          {flx.ativo === false && (
                                            <span className="text-[9px] text-[#DC2626] italic ml-1">
                                              (Inativo)
                                            </span>
                                          )}
                                        </span>
                                      </SelectItem>
                                    )
                                  })}
                              </SelectContent>
                            </Select>
                          </div>

                          {/* 2. Vincular a Projeto */}
                          <div>
                            <div className="flex items-center justify-between mb-1">
                              <label className="text-[11px] font-semibold text-[#5B6470] flex items-center gap-1">
                                <FolderGit2 className="w-3 h-3 text-[#0F766E]" />
                                Vincular a Projeto
                              </label>
                              <button
                                type="button"
                                onClick={() => handleAbrirCriarProjeto(item.idTemp)}
                                className="text-[10px] font-medium text-[#0F766E] hover:underline flex items-center gap-0.5"
                                title="Cadastrar novo projeto imediatamente"
                              >
                                <Plus className="w-3 h-3" />
                                Criar
                              </button>
                            </div>
                            <Select
                              value={item.projetoId}
                              onValueChange={(v) => {
                                if (v === '__create_new__') {
                                  handleAbrirCriarProjeto(item.idTemp)
                                } else {
                                  handleAtualizarAssuntoPorId(item.idTemp, 'projetoId', v)
                                }
                              }}
                            >
                              <SelectTrigger className="text-xs h-8 bg-white border-[#E5E1D8]">
                                <SelectValue placeholder="Automático (IA)" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem
                                  value="__create_new__"
                                  className="text-[#0F766E] font-semibold bg-[#0F766E]/5 hover:bg-[#0F766E]/15 focus:bg-[#0F766E]/15 cursor-pointer border-b border-[#E5E1D8] mb-1"
                                >
                                  + Criar novo projeto...
                                </SelectItem>
                                <SelectItem value="none">Automático (Deixar para IA)</SelectItem>
                                {projetos.map((p) => (
                                  <SelectItem key={p.id} value={p.id}>
                                    {p.nome}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>

                          {/* 3. Vincular a Timeline */}
                          <div>
                            <div className="flex items-center justify-between mb-1">
                              <label className="text-[11px] font-semibold text-[#5B6470] flex items-center gap-1">
                                <CalendarDays className="w-3 h-3 text-[#0F766E]" />
                                Vincular a Timeline
                              </label>
                              <button
                                type="button"
                                onClick={() => handleAbrirCriarTimeline(item.idTemp)}
                                className="text-[10px] font-medium text-[#0F766E] hover:underline flex items-center gap-0.5"
                                title="Criar novo marco de timeline"
                              >
                                <Plus className="w-3 h-3" />
                                Criar
                              </button>
                            </div>
                            <Select
                              value={item.timeline || '__empty__'}
                              onValueChange={(v) => {
                                if (v === '__create_new__') {
                                  handleAbrirCriarTimeline(item.idTemp)
                                } else if (v === '__empty__') {
                                  handleAtualizarAssuntoPorId(item.idTemp, 'timeline', '')
                                } else {
                                  handleAtualizarAssuntoPorId(item.idTemp, 'timeline', v)
                                }
                              }}
                            >
                              <SelectTrigger className="text-xs h-8 bg-white border-[#E5E1D8]">
                                <SelectValue placeholder="Selecione ou crie um marco" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem
                                  value="__create_new__"
                                  className="text-[#0F766E] font-semibold bg-[#0F766E]/5 hover:bg-[#0F766E]/15 focus:bg-[#0F766E]/15 cursor-pointer border-b border-[#E5E1D8] mb-1"
                                >
                                  + Criar novo marco de timeline...
                                </SelectItem>
                                <SelectItem value="__empty__">Nenhum (Livre)</SelectItem>
                                {marcosTimeline.map((m) => (
                                  <SelectItem key={m.id} value={m.nome}>
                                    ⏳ {m.nome}
                                  </SelectItem>
                                ))}
                                {/* Se o usuário digitou ou tem um valor customizado que não está na lista de marcos */}
                                {item.timeline &&
                                  !marcosTimeline.some((m) => m.nome === item.timeline) && (
                                    <SelectItem value={item.timeline}>
                                      ⏳ {item.timeline} (Personalizado)
                                    </SelectItem>
                                  )}
                              </SelectContent>
                            </Select>
                          </div>

                          {/* 4. Vincular a Contato */}
                          <div>
                            <div className="flex items-center justify-between mb-1">
                              <label className="text-[11px] font-semibold text-[#5B6470] flex items-center gap-1">
                                <UserCheck className="w-3 h-3 text-[#0F766E]" />
                                Vincular a Contato
                              </label>
                              <button
                                type="button"
                                onClick={() => handleAbrirCriarContato(item.idTemp)}
                                className="text-[10px] font-medium text-[#0F766E] hover:underline flex items-center gap-0.5"
                                title="Cadastrar novo contato imediatamente"
                              >
                                <Plus className="w-3 h-3" />
                                Criar
                              </button>
                            </div>
                            <Select
                              value={item.contatoId}
                              onValueChange={(v) => {
                                if (v === '__create_new__') {
                                  handleAbrirCriarContato(item.idTemp)
                                } else {
                                  handleAtualizarAssuntoPorId(item.idTemp, 'contatoId', v)
                                }
                              }}
                            >
                              <SelectTrigger className="text-xs h-8 bg-white border-[#E5E1D8]">
                                <SelectValue placeholder="Automático (IA)" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem
                                  value="__create_new__"
                                  className="text-[#0F766E] font-semibold bg-[#0F766E]/5 hover:bg-[#0F766E]/15 focus:bg-[#0F766E]/15 cursor-pointer border-b border-[#E5E1D8] mb-1"
                                >
                                  + Criar novo contato...
                                </SelectItem>
                                <SelectItem value="none">Automático (Deixar para IA)</SelectItem>
                                {contatos.map((c) => (
                                  <SelectItem key={c.id} value={c.id}>
                                    {c.nome} {c.empresa ? `(${c.empresa})` : ''}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>

              {/* Barra de Ações: Adicionar mais assuntos e Lançar tudo */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-3 border-t border-[#E5E1D8]">
                <div className="flex items-center gap-2 w-full sm:w-auto">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleAdicionarAssunto}
                    className="text-xs h-9 text-[#0F766E] border-[#0F766E]/30 hover:bg-[#0F766E]/10 gap-1.5 w-full sm:w-auto"
                  >
                    <Plus className="w-4 h-4" />
                    Adicionar Outro Assunto
                  </Button>
                </div>

                <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={handleLimparTodosAssuntos}
                    className="text-xs h-9 text-[#5B6470] hover:text-red-600 gap-1.5"
                    title="Apagar todos os assuntos digitados"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    Limpar Rascunho
                  </Button>
                  <Button
                    type="submit"
                    disabled={loadingAdd}
                    className="bg-[#0F766E] hover:bg-[#0D5C56] text-white text-xs h-9 px-5 font-medium shadow-sm gap-2 w-full sm:w-auto"
                  >
                    <Send className="w-3.5 h-3.5" />
                    {loadingAdd
                      ? 'Lançando na Folha...'
                      : `Lançar ${assuntos.length} ${assuntos.length === 1 ? 'Assunto' : 'Assuntos'} na Folha`}
                  </Button>
                </div>
              </div>
            </CardContent>
          </form>
        </Card>
      )}

      {/* Fase 1: Painel de Busca Avançada + Filtros Combináveis */}
      <PainelBuscaFolha
        filtros={filtrosFolha}
        onFiltrosChange={setFiltrosFolha}
        totalFiltrados={itensFiltrados.length}
        totalGeral={folhaItems.length}
        totalFixados={totalFixados}
        totalArquivados={totalArquivados}
        totalSementes={totalSementes}
        tesesSementes={tesesSementes}
        teseFiltroId={teseFiltroId}
        contagemPorTese={contagemSementesPorTese}
        onTeseFiltroChange={setTeseFiltroId}
        onCriarTeseRapida={handleCriarTeseRapida}
        projetos={projetos}
        contatos={contatos}
        fluxos={fluxos}
        categorias={categorias}
        marcosTimeline={marcosTimeline}
        parceiroFiltro={parceiroFiltro}
        onParceiroFiltroChange={setParceiroFiltro}
        negocioFiltro={negocioFiltro}
        onNegocioFiltroChange={setNegocioFiltro}
        parceirosDisponiveis={parceirosDisponiveis}
        negociosDisponiveis={negociosDisponiveis}
      />

      {/* Listagem de Assuntos na Folha */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-semibold text-[#1A1D21] flex items-center gap-2">
              <Clock className="w-4 h-4 text-[#D97706]" />
              {filtrosFolha.estadoArquivo === 'sementes'
                ? `Sementes em Germinação 🌱 (${itensFiltrados.length})`
                : filtrosFolha.estadoArquivo === 'arquivados'
                  ? `Assuntos Arquivados (${itensFiltrados.length})`
                  : filtrosFolha.estadoArquivo === 'todos'
                    ? `Todos os Assuntos (${itensFiltrados.length})`
                    : `Assuntos da Folha (${itensFiltrados.length})`}
            </h2>
          </div>
          <span className="text-xs text-[#5B6470]">
            {totalFixados > 0 && `${totalFixados} fixado(s) no topo • `}
            Pesquisa em tempo real • Fixar, arquivar e criar demandas
          </span>
        </div>

        {filtrosFolha.estadoArquivo === 'sementes' ? (
          itensFiltrados.length === 0 ? (
            <div className="bg-white border border-[#E5E1D8] rounded-xl p-10 text-center text-xs text-[#5B6470] space-y-3">
              <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-800 flex items-center justify-center mx-auto">
                <Sprout className="w-6 h-6 text-emerald-700" />
              </div>
              <p className="font-semibold text-sm text-[#1A1D21]">
                Nenhuma semente encontrada para os filtros atuais.
              </p>
              <p className="text-[#5B6470] max-w-md mx-auto">
                Você pode arquivar qualquer assunto da Folha como Semente 🌱 para guardá-lo no cofre
                e acompanhar por tese de mercado.
              </p>
            </div>
          ) : (
            <SementesAgrupadasPorTese
              sementes={itensFiltrados}
              teses={tesesSementes}
              teseFiltroId={teseFiltroId}
              onReativar={handleReativarSemente}
              onAtribuirTese={handleAtribuirTeseRapida}
              onCriarTeseRapida={handleCriarTeseRapida}
              destaqueId={destaqueParam}
              renderItem={(item, idx) => {
                const numeroDisplay = item.ordem || idx + 1
                const temDemanda = verificarTemDemanda(item)
                const isFixado = Boolean(item.fixado)
                const isDestaque = Boolean(destaqueParam && item.id === destaqueParam)

                return (
                  <div
                    key={item.id}
                    id={`assunto-${item.id}`}
                    className={`p-4 rounded-xl border transition-all shadow-2xs flex flex-col justify-between space-y-3 ${
                      isDestaque
                        ? 'bg-emerald-50/70 border-emerald-500 ring-2 ring-emerald-500/50 shadow-md'
                        : 'bg-white border-[#E5E1D8] hover:border-emerald-500/40'
                    }`}
                  >
                    <div>
                      {/* Header do card com numeração, tese seletora e reativar */}
                      <div className="flex items-center justify-between gap-2 mb-2 pb-2 border-b border-[#E5E1D8]/60">
                        <div className="flex items-center gap-2">
                          <span className="flex items-center justify-center w-5 h-5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800">
                            {numeroDisplay}
                          </span>
                          <div className="flex items-center gap-1.5 text-[11px] text-[#5B6470]">
                            {getOrigemIcon(item.tipo_origem, item.is_reuniao)}
                            <Badge className="bg-amber-100 text-amber-900 border border-amber-300 text-[10px] font-bold gap-1 shadow-2xs">
                              <Sprout className="w-3 h-3 text-emerald-700" />
                              <span>Semente 🌱</span>
                            </Badge>
                            {item.origem_ref && <span>• {item.origem_ref}</span>}
                          </div>
                        </div>

                        <div className="flex items-center gap-1.5">
                          {/* Seletor rápido de Tese no card */}
                          <Select
                            value={item.tese_semente || 'none'}
                            onValueChange={(val) => handleAtribuirTeseRapida(item, val)}
                          >
                            <SelectTrigger className="h-7 text-[11px] bg-white border-stone-200 w-[150px] sm:w-[170px]">
                              <SelectValue placeholder="Sem tese" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="none">Sem tese</SelectItem>
                              {tesesSementes.map((t) => (
                                <SelectItem key={t.id} value={t.id}>
                                  {t.nome}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>

                          {/* Botão Germinar: sai do cofre e vira card de demanda no Fluxo */}
                          {!item.semente_germinada && (
                            <Button
                              type="button"
                              size="sm"
                              onClick={() => {
                                setSementeParaGerminar(item)
                                setModalGerminarOpen(true)
                              }}
                              className="h-7 px-2.5 text-[11px] gap-1 bg-[#0F766E] hover:bg-[#0D5C56] text-white font-semibold shadow-2xs"
                              title="Germinar: criar card de demanda no Fluxo"
                            >
                              <Sprout className="w-3.5 h-3.5" />
                              <span>Germinar 🌱</span>
                            </Button>
                          )}

                          {/* Botão Reativar direto */}
                          <Button
                            type="button"
                            size="sm"
                            onClick={() => handleReativarSemente(item)}
                            className="h-7 px-2.5 text-[11px] gap-1 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold shadow-2xs"
                            title="Reativar semente e devolver à Folha ativa"
                          >
                            <Sprout className="w-3.5 h-3.5" />
                            <span>Reativar</span>
                          </Button>

                          {/* Menu 3 pontinhos */}
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                className="h-7 w-7 p-0 text-[#5B6470]"
                              >
                                <MoreVertical className="w-3.5 h-3.5" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-48 text-xs">
                              <DropdownMenuItem
                                onClick={() => handleReativarSemente(item)}
                                className="cursor-pointer gap-2 text-emerald-800 font-medium"
                              >
                                <Sprout className="w-3.5 h-3.5 text-emerald-600" />
                                <span>Reativar Semente</span>
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => handleAbrirModalSemente(item)}
                                className="cursor-pointer gap-2"
                              >
                                <FolderLock className="w-3.5 h-3.5 text-amber-600" />
                                <span>Editar Semente / Tese</span>
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                onClick={() => handleExcluirRegistro(item.id)}
                                className="cursor-pointer gap-2 text-red-600 focus:text-red-700"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                                <span>Excluir semente</span>
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </div>

                      {/* Data e Prazo de Revisão */}
                      <div className="flex flex-wrap items-center justify-between gap-1 mb-2">
                        <div className="flex items-center gap-1.5 text-[11px] text-[#0F766E] font-medium">
                          <Clock className="w-3 h-3" />
                          <span>
                            Arquivado em:{' '}
                            {item.data_hora
                              ? item.data_hora.replace('T', ' ')
                              : item.data || item.created?.slice(0, 16).replace('T', ' ')}
                          </span>
                        </div>

                        {item.data_revisao_semente && (
                          <span className="text-[10px] bg-amber-100 text-amber-900 border border-amber-300 px-2 py-0.5 rounded font-semibold flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            Revisão prevista: {item.data_revisao_semente.slice(0, 10)}
                          </span>
                        )}
                      </div>

                      {/* Contexto e Condição de Reativação da Semente */}
                      <div className="mb-2.5 p-2.5 rounded-lg bg-amber-50/80 border border-amber-200/90 text-xs text-amber-900 space-y-1">
                        <div className="flex items-center justify-between font-semibold text-[11px] text-amber-800">
                          <span className="flex items-center gap-1.5">
                            <Sprout className="w-3.5 h-3.5 text-emerald-600" />
                            <span>Semente em germinação</span>
                            {item.data_hora || item.created ? (
                              <span className="font-normal text-amber-700">
                                ({formatarTempoDecorrido(item.data_hora || item.created)})
                              </span>
                            ) : null}
                          </span>
                        </div>
                        {item.condicao_reativacao ? (
                          <p className="text-[11px] text-amber-950/90">
                            <strong>Condição de reativação:</strong> {item.condicao_reativacao}
                          </p>
                        ) : (
                          <p className="text-[11px] text-amber-800 italic">
                            Sem condição específica — reativa por contato no WhatsApp ou revisão.
                          </p>
                        )}
                      </div>

                      {/* Texto Principal do Registro */}
                      <p className="text-xs text-[#1A1D21] font-medium leading-relaxed whitespace-pre-wrap break-words">
                        {item.registro}
                      </p>

                      {/* Selo de semente germinada: link para o card criado no Fluxo */}
                      {item.semente_germinada && item.card_germinado_id && (
                        <button
                          type="button"
                          onClick={() => navigate(`/card/${item.card_germinado_id}`)}
                          className="mt-2.5 inline-flex items-center gap-1.5 text-[11px] font-semibold text-[#0F766E] bg-emerald-50 border border-emerald-300 px-2.5 py-1 rounded-full hover:bg-emerald-100 transition-colors"
                          title={`Abrir card germinado (${item.card_germinado_id})`}
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>germinou como card</span>
                          <span className="font-mono text-[10px] truncate max-w-[140px]">
                            {item.card_germinado_id.slice(0, 8)}
                          </span>
                          <ArrowRight className="w-3 h-3" />
                        </button>
                      )}
                    </div>

                    {/* Rodapé do card */}
                    <div className="pt-2 border-t border-[#E5E1D8]/60 flex items-center justify-between text-[11px] text-[#5B6470]">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {item.expand?.projeto && (
                          <span className="bg-[#F4F2EE] px-2 py-0.5 rounded font-medium truncate max-w-[140px]">
                            📁 {item.expand.projeto.nome}
                          </span>
                        )}
                        {item.expand?.contato && (
                          <span className="bg-[#F4F2EE] px-2 py-0.5 rounded font-medium truncate max-w-[140px]">
                            👤 {item.expand.contato.nome}
                          </span>
                        )}
                      </div>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() =>
                          handleAbrirCriarDemanda({
                            id: item.id,
                            numero: numeroDisplay,
                            texto: item.registro,
                            projetoId: item.projeto,
                            contatoId: item.contato,
                            timeline: item.timeline,
                          })
                        }
                        className="h-6 px-2 text-[11px] text-[#0F766E] border-[#0F766E]/30 hover:bg-[#0F766E]/10 gap-1"
                      >
                        <CheckSquare className="w-3 h-3" />
                        Criar demanda
                      </Button>
                    </div>
                  </div>
                )
              }}
            />
          )
        ) : itensFiltrados.length === 0 ? (
          <div className="bg-white border border-[#E5E1D8] rounded-xl p-10 text-center text-xs text-[#5B6470] space-y-3">
            <div className="w-12 h-12 rounded-full bg-[#0F766E]/10 text-[#0F766E] flex items-center justify-center mx-auto">
              <Search className="w-6 h-6" />
            </div>
            <p className="font-semibold text-sm text-[#1A1D21]">
              Nenhum assunto encontrado para os filtros atuais.
            </p>
            <p className="text-[#5B6470] max-w-md mx-auto">
              {filtrosFolha.busca ||
              filtrosFolha.periodo !== 'todos' ||
              filtrosFolha.tipo !== 'todos' ||
              filtrosFolha.estadoArquivo !== 'ativos'
                ? 'Tente ajustar os filtros ou limpar a pesquisa para exibir outros assuntos.'
                : 'Escreva como vier: ligações, conversas, prazos. A agenda separa por negócio, pessoa e tarefa, e você confirma.'}
            </p>
            {(filtrosFolha.busca ||
              filtrosFolha.periodo !== 'todos' ||
              filtrosFolha.tipo !== 'todos' ||
              filtrosFolha.estadoDemanda !== 'todos' ||
              filtrosFolha.estadoFluxo !== 'todos' ||
              filtrosFolha.projetoId !== 'todos' ||
              filtrosFolha.fluxoId !== 'todos') && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setFiltrosFolha(FILTROS_PADRAO)}
                className="text-xs text-[#0F766E] border-[#0F766E]/30"
              >
                Limpar todos os filtros
              </Button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
            {itensAgrupadosPorData.map(({ item, idx, cabecalho }) => {
              const numeroDisplay = item.ordem || idx + 1
              const temDemanda = verificarTemDemanda(item)
              const isFixado = Boolean(item.fixado)
              const isArquivado = Boolean(item.arquivado)
              const isDestaque = Boolean(destaqueParam && item.id === destaqueParam)

              return (
                <React.Fragment key={item.id}>
                  {cabecalho && (
                    <div className="md:col-span-2 flex items-center gap-2 pt-3 first:pt-0">
                      <span className="text-xs font-bold text-[#1A1D21] uppercase tracking-wide">
                        {cabecalho.label}
                      </span>
                      <span className="text-[10px] font-semibold text-[#5B6470] bg-white border border-[#E5E1D8] px-2 py-0.5 rounded-full">
                        {cabecalho.count} {cabecalho.count === 1 ? 'assunto' : 'assuntos'}
                      </span>
                      <span className="flex-1 h-px bg-[#E5E1D8]" />
                    </div>
                  )}
                  <div
                    id={`assunto-${item.id}`}
                    className={`p-4 rounded-xl border transition-all shadow-2xs flex flex-col justify-between space-y-3 ${
                      isDestaque
                        ? 'bg-emerald-50/60 border-emerald-500 ring-2 ring-emerald-500/50 shadow-md'
                        : isFixado
                          ? 'bg-amber-50/40 border-amber-300 ring-1 ring-amber-300/60'
                          : isArquivado
                            ? 'bg-[#FAFAF9] border-[#E5E1D8] opacity-75'
                            : 'bg-white border-[#E5E1D8] hover:border-[#0F766E]/40'
                    }`}
                  >
                    <div>
                      {/* Header do card com numeração, fixação, arquivamento e controles */}
                      <div className="flex items-center justify-between gap-2 mb-2 pb-2 border-b border-[#E5E1D8]/60">
                        <div className="flex items-center gap-2">
                          <span
                            className={`flex items-center justify-center w-5 h-5 rounded-full text-[11px] font-bold ${
                              isFixado
                                ? 'bg-amber-500 text-white'
                                : item.is_reuniao
                                  ? 'bg-red-100 text-red-700'
                                  : 'bg-[#0F766E]/15 text-[#0F766E]'
                            }`}
                          >
                            {numeroDisplay}
                          </span>
                          <div className="flex items-center gap-1.5 text-[11px] text-[#5B6470]">
                            {getOrigemIcon(item.tipo_origem, item.is_reuniao)}
                            {item.is_reuniao ? (
                              <Badge className="bg-red-50 text-red-700 hover:bg-red-50 border border-red-200 text-[10px] font-bold px-1.5 py-0">
                                REUNIÃO GRAVADA
                              </Badge>
                            ) : item.tipo_origem === 'whatsapp' ? (
                              <Badge className="bg-emerald-50 text-emerald-800 hover:bg-emerald-100 border border-emerald-300 text-[10px] font-bold px-1.5 py-0 gap-1">
                                <MessageSquare className="w-2.5 h-2.5 text-emerald-600" />
                                WHATSAPP
                              </Badge>
                            ) : (
                              <span className="capitalize font-medium">{item.tipo_origem}</span>
                            )}
                            {item.origem_ref && <span>• {item.origem_ref}</span>}
                          </div>
                        </div>

                        <div className="flex items-center gap-1">
                          {/* Botão Fixar / Desafixar */}
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => handleToggleFixar(item)}
                            className={`h-7 px-1.5 text-[11px] gap-1 ${
                              isFixado
                                ? 'text-amber-700 bg-amber-100/70 hover:bg-amber-200/70 font-semibold'
                                : 'text-[#5B6470] hover:text-amber-700'
                            }`}
                            title={isFixado ? 'Desafixar do topo' : 'Fixar no topo'}
                          >
                            {isFixado ? (
                              <>
                                <PinOff className="w-3.5 h-3.5 fill-amber-600" />
                                <span className="hidden sm:inline">Fixado</span>
                              </>
                            ) : (
                              <>
                                <Pin className="w-3.5 h-3.5" />
                                <span className="hidden sm:inline">Fixar</span>
                              </>
                            )}
                          </Button>

                          {/* Botão Arquivar / Desarquivar */}
                          {/* Se for Semente: Botão Reativar direto */}
                          {item.estado_semente ? (
                            <Button
                              type="button"
                              size="sm"
                              onClick={() => handleReativarSemente(item)}
                              className="h-7 px-2 text-[11px] gap-1 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold shadow-2xs"
                              title="Reativar semente e devolver à Folha ativa"
                            >
                              <Sprout className="w-3.5 h-3.5" />
                              <span>Reativar</span>
                            </Button>
                          ) : (
                            /* Botão Arquivar / Desarquivar */
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => handleToggleArquivar(item)}
                              className={`h-7 px-1.5 text-[11px] gap-1 ${
                                isArquivado
                                  ? 'text-blue-700 bg-blue-50 hover:bg-blue-100 font-semibold'
                                  : 'text-[#5B6470] hover:text-[#1A1D21]'
                              }`}
                              title={
                                isArquivado
                                  ? 'Desarquivar (voltar para a lista principal)'
                                  : 'Arquivar assunto'
                              }
                            >
                              {isArquivado ? (
                                <>
                                  <ArchiveRestore className="w-3.5 h-3.5" />
                                  <span className="hidden sm:inline">Desarquivar</span>
                                </>
                              ) : (
                                <>
                                  <Archive className="w-3.5 h-3.5" />
                                  <span className="hidden sm:inline">Arquivar</span>
                                </>
                              )}
                            </Button>
                          )}

                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            disabled={idx === 0}
                            onClick={() => handleReordenarPersistido(idx, 'cima')}
                            className="h-6 w-6 p-0 text-[#5B6470] hover:text-[#1A1D21]"
                            title="Subir ordem"
                          >
                            <ArrowUp className="w-3 h-3" />
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            disabled={idx === itensFiltrados.length - 1}
                            onClick={() => handleReordenarPersistido(idx, 'baixo')}
                            className="h-6 w-6 p-0 text-[#5B6470] hover:text-[#1A1D21]"
                            title="Descer ordem"
                          >
                            <ArrowDown className="w-3 h-3" />
                          </Button>

                          {/* Menu de 3 pontinhos com ação 'Arquivar como Semente' */}
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                className="h-6 w-6 p-0 text-[#5B6470] hover:text-[#1A1D21]"
                                title="Mais opções do assunto"
                              >
                                <MoreVertical className="w-3.5 h-3.5" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="text-xs w-48">
                              {!item.estado_semente ? (
                                <DropdownMenuItem
                                  onClick={() => handleAbrirModalSemente(item)}
                                  className="cursor-pointer gap-2 text-emerald-800 font-medium"
                                >
                                  <Sprout className="w-3.5 h-3.5 text-emerald-600" />
                                  <span>Arquivar como Semente</span>
                                </DropdownMenuItem>
                              ) : (
                                <DropdownMenuItem
                                  onClick={() => handleReativarSemente(item)}
                                  className="cursor-pointer gap-2 text-emerald-800 font-medium"
                                >
                                  <Sprout className="w-3.5 h-3.5 text-emerald-600" />
                                  <span>Reativar Semente</span>
                                </DropdownMenuItem>
                              )}
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                onClick={() => handleToggleFixar(item)}
                                className="cursor-pointer gap-2"
                              >
                                <Pin className="w-3.5 h-3.5 text-amber-600" />
                                <span>{isFixado ? 'Desafixar do topo' : 'Fixar no topo'}</span>
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => handleToggleArquivar(item)}
                                className="cursor-pointer gap-2"
                              >
                                <Archive className="w-3.5 h-3.5 text-[#5B6470]" />
                                <span>{isArquivado ? 'Desarquivar' : 'Arquivar comum'}</span>
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                onClick={() => handleExcluirRegistro(item.id)}
                                className="cursor-pointer gap-2 text-red-600 focus:text-red-700"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                                <span>Excluir assunto</span>
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </div>

                      {/* Data e Hora do Assunto + Badges de Status */}
                      <div className="flex flex-wrap items-center justify-between gap-1 mb-1.5">
                        <div className="flex items-center gap-1.5 text-[11px] text-[#0F766E] font-medium">
                          <Clock className="w-3 h-3" />
                          <span>
                            Data e hora:{' '}
                            {item.data_hora
                              ? item.data_hora.replace('T', ' ')
                              : item.data || item.created?.slice(0, 16).replace('T', ' ')}
                          </span>
                        </div>

                        <div className="flex items-center gap-1">
                          {item.estado_semente && (
                            <Badge className="bg-amber-100 text-amber-900 border border-amber-300 text-[10px] font-bold gap-1 shadow-2xs">
                              <Sprout className="w-3 h-3 text-emerald-700" />
                              <span>Semente 🌱</span>
                            </Badge>
                          )}
                          {item.reativada_em && !item.estado_semente && (
                            <Badge className="bg-emerald-100 text-emerald-800 border border-emerald-300 text-[9px] font-semibold gap-1">
                              🌱 Reativada ({item.reativada_em.slice(0, 10)})
                            </Badge>
                          )}
                          {temDemanda ? (
                            <Badge className="bg-emerald-100 text-emerald-800 border-none text-[9px] font-semibold gap-1">
                              <CheckCircle2 className="w-2.5 h-2.5" />
                              Demanda criada
                            </Badge>
                          ) : (
                            <Badge className="bg-gray-100 text-gray-600 border-none text-[9px]">
                              Sem demanda
                            </Badge>
                          )}
                          {item.status === 'processado' && (
                            <Badge className="bg-blue-100 text-blue-800 border-none text-[9px] font-semibold">
                              Processado
                            </Badge>
                          )}
                        </div>
                      </div>

                      {/* Caixa de Contexto da Semente */}
                      {item.estado_semente && (
                        <div className="mb-2.5 p-2.5 rounded-lg bg-amber-50/80 border border-amber-200/90 text-xs text-amber-900 space-y-1">
                          <div className="flex items-center justify-between font-semibold text-[11px] text-amber-800">
                            <span className="flex items-center gap-1.5">
                              <Sprout className="w-3.5 h-3.5 text-emerald-600" />
                              <span>Semente em germinação</span>
                              {item.data_hora || item.created ? (
                                <span className="font-normal text-amber-700">
                                  ({formatarTempoDecorrido(item.data_hora || item.created)})
                                </span>
                              ) : null}
                            </span>
                            {item.data_revisao_semente && (
                              <span className="text-[10px] bg-amber-200/70 text-amber-900 px-1.5 py-0.2 rounded font-medium">
                                Revisão: {item.data_revisao_semente.slice(0, 10)}
                              </span>
                            )}
                          </div>
                          {item.condicao_reativacao ? (
                            <p className="text-[11px] text-amber-950/90">
                              <strong>Condição de reativação:</strong> {item.condicao_reativacao}
                            </p>
                          ) : (
                            <p className="text-[11px] text-amber-800 italic">
                              Sem condição específica — reativa por contato no WhatsApp ou revisão.
                            </p>
                          )}
                        </div>
                      )}

                      {/* Player de áudio e indicadores de reunião gravada */}
                      {item.is_reuniao && (
                        <div className="mb-2 p-2.5 rounded-lg bg-red-50/60 border border-red-200/80 space-y-2">
                          <div className="flex items-center justify-between text-[11px]">
                            <span className="font-semibold text-red-800 flex items-center gap-1.5">
                              <Mic className="w-3.5 h-3.5 text-red-600" />
                              Áudio da Reunião ({formatarSegundos(item.duracao_gravacao)})
                            </span>
                            <span className="text-[10px] text-red-700 font-medium">
                              {item.status_transcricao === 'processado'
                                ? '✓ Síntese organizada'
                                : 'Aguardando transcrição'}
                            </span>
                          </div>

                          {item.audio_gravacao && (
                            <div className="pt-1">
                              <audio
                                controls
                                className="w-full h-8"
                                src={
                                  diamondApi.getAudioUrl({
                                    id: item.id,
                                    audio_gravacao: item.audio_gravacao,
                                  }) || undefined
                                }
                              />
                            </div>
                          )}

                          <div className="flex items-center justify-between pt-1">
                            <button
                              type="button"
                              onClick={() => handleAbrirDetalhesReuniao(item)}
                              className="text-[11px] font-semibold text-[#0F766E] hover:underline flex items-center gap-1"
                            >
                              <CalendarCheck className="w-3 h-3" />
                              Ver Ata & Detalhes da Reunião
                            </button>
                          </div>
                        </div>
                      )}

                      {/* Conteúdo do Assunto */}
                      <p className="text-xs text-[#1A1D21] whitespace-pre-wrap leading-relaxed">
                        {item.registro}
                      </p>
                    </div>

                    {/* Vínculos e Ação Criar Demanda */}
                    <div className="pt-2 border-t border-[#E5E1D8]/60 space-y-2">
                      <div className="flex flex-wrap items-center gap-1.5 text-[10px] text-[#5B6470]">
                        {item.fluxo && getFluxoBadge(item.fluxo)}
                        {(item.expand?.projeto ||
                          (item.projeto && projetos.find((p) => p.id === item.projeto))) && (
                          <span className="bg-[#F4F2EE] px-2 py-0.5 rounded font-medium truncate max-w-[140px]">
                            📁{' '}
                            {item.expand?.projeto?.nome ||
                              projetos.find((p) => p.id === item.projeto)?.nome}
                          </span>
                        )}
                        {(item.expand?.contato ||
                          (item.contato && contatos.find((c) => c.id === item.contato))) && (
                          <span className="bg-[#F4F2EE] px-2 py-0.5 rounded font-medium truncate max-w-[140px]">
                            👤{' '}
                            {item.expand?.contato?.nome ||
                              contatos.find((c) => c.id === item.contato)?.nome}
                          </span>
                        )}
                        {item.timeline && (
                          <span className="bg-amber-50 text-amber-800 border border-amber-200 px-1.5 py-0.5 rounded truncate max-w-[120px]">
                            ⏳ {item.timeline}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center justify-between pt-1">
                        <span className="text-[10px] text-[#5B6470]">
                          Salvo em {item.created?.slice(11, 16)}
                        </span>
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          onClick={() =>
                            handleAbrirCriarDemanda({
                              id: item.id,
                              numero: numeroDisplay,
                              texto: item.registro,
                              projetoId: item.projeto,
                              contatoId: item.contato,
                              timeline: item.timeline,
                            })
                          }
                          className="h-6 px-2 text-[11px] text-[#0F766E] border-[#0F766E]/30 hover:bg-[#0F766E]/10 gap-1"
                        >
                          <CheckSquare className="w-3 h-3" />
                          Criar demanda
                        </Button>
                      </div>
                    </div>
                  </div>
                </React.Fragment>
              )
            })}
          </div>
        )}

        {/* Histórico Recente de Processados */}
        {processados.length > 0 && filtrosFolha.estadoArquivo !== 'arquivados' && (
          <div className="pt-6">
            <h3 className="text-xs font-semibold text-[#5B6470] uppercase tracking-wider mb-2">
              Assuntos Processados Recentemente ({processados.length})
            </h3>
            <div className="space-y-1.5">
              {processados.slice(0, 5).map((item) => (
                <div
                  key={item.id}
                  className="p-2.5 rounded-lg bg-white/60 border border-[#E5E1D8] text-xs text-[#5B6470] flex items-center justify-between opacity-80"
                >
                  <div className="truncate pr-4 flex items-center gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                    <span className="font-semibold text-[#1A1D21] text-[11px]">
                      {item.ordem ? `#${item.ordem}` : ''}
                    </span>
                    <span className="truncate">{item.registro}</span>
                  </div>
                  <span className="text-[10px] shrink-0 text-[#5B6470]">
                    {item.data_hora
                      ? item.data_hora.replace('T', ' ')
                      : item.data || item.created?.slice(0, 10)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Modal Criar Demanda a Partir do Assunto */}
      <Dialog open={modalDemandaOpen} onOpenChange={setModalDemandaOpen}>
        <DialogContent className="max-w-xl bg-white border border-[#E5E1D8]">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-[#1A1D21] flex items-center gap-2">
              <CheckSquare className="w-4 h-4 text-[#0F766E]" />
              Criar Demanda a partir do Assunto {demandaAssuntoOrigem?.numero || ''}
            </DialogTitle>
            <DialogDescription className="text-xs text-[#5B6470]">
              Gere imediatamente uma demanda com vínculos herdados deste assunto, sem precisar rodar
              a organização da IA.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleConfirmarCriarDemanda} className="space-y-3.5 pt-2">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-[#1A1D21]">Título da Demanda *</label>
              <Input
                required
                placeholder="Ex: Entregar proposta comercial revisada"
                value={demandaTitulo}
                onChange={(e) => setDemandaTitulo(e.target.value)}
                className="text-xs border-[#E5E1D8]"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-[#1A1D21]">Descrição / Contexto</label>
              <Textarea
                rows={3}
                placeholder="Detalhes da demanda..."
                value={demandaDescricao}
                onChange={(e) => setDemandaDescricao(e.target.value)}
                className="text-xs border-[#E5E1D8]"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-[#5B6470]">Prioridade</label>
                <Select
                  value={demandaPrioridade}
                  onValueChange={(v) => setDemandaPrioridade(v as CardPrioridade)}
                >
                  <SelectTrigger className="text-xs border-[#E5E1D8]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="baixa">Baixa</SelectItem>
                    <SelectItem value="media">Média</SelectItem>
                    <SelectItem value="alta">Alta</SelectItem>
                    <SelectItem value="urgente">Urgente</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-[#5B6470]">Prazo Limite</label>
                <Input
                  type="date"
                  value={demandaPrazo}
                  onChange={(e) => setDemandaPrazo(e.target.value)}
                  className="text-xs border-[#E5E1D8]"
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-[#5B6470]">Vínculo: Projeto</label>
                  <button
                    type="button"
                    onClick={handleAbrirCriarProjetoEmDemanda}
                    className="text-[10px] text-[#0F766E] hover:underline flex items-center gap-0.5"
                  >
                    <Plus className="w-3 h-3" />
                    Criar
                  </button>
                </div>
                <Select
                  value={demandaProjeto}
                  onValueChange={(v) => {
                    if (v === '__create_new__') {
                      handleAbrirCriarProjetoEmDemanda()
                    } else {
                      setDemandaProjeto(v)
                    }
                  }}
                >
                  <SelectTrigger className="text-xs border-[#E5E1D8]">
                    <SelectValue placeholder="Nenhum" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem
                      value="__create_new__"
                      className="text-[#0F766E] font-semibold bg-[#0F766E]/5 hover:bg-[#0F766E]/15 cursor-pointer border-b border-[#E5E1D8] mb-1"
                    >
                      + Criar novo projeto...
                    </SelectItem>
                    <SelectItem value="none">Nenhum</SelectItem>
                    {projetos.map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.nome}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-[#5B6470]">Vínculo: Contato</label>
                  <button
                    type="button"
                    onClick={handleAbrirCriarContatoEmDemanda}
                    className="text-[10px] text-[#0F766E] hover:underline flex items-center gap-0.5"
                  >
                    <Plus className="w-3 h-3" />
                    Criar
                  </button>
                </div>
                <Select
                  value={demandaContato}
                  onValueChange={(v) => {
                    if (v === '__create_new__') {
                      handleAbrirCriarContatoEmDemanda()
                    } else {
                      setDemandaContato(v)
                    }
                  }}
                >
                  <SelectTrigger className="text-xs border-[#E5E1D8]">
                    <SelectValue placeholder="Nenhum" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem
                      value="__create_new__"
                      className="text-[#0F766E] font-semibold bg-[#0F766E]/5 hover:bg-[#0F766E]/15 cursor-pointer border-b border-[#E5E1D8] mb-1"
                    >
                      + Criar novo contato...
                    </SelectItem>
                    <SelectItem value="none">Nenhum</SelectItem>
                    {contatos.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.nome}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-[#5B6470]">Timeline</label>
                  <button
                    type="button"
                    onClick={handleAbrirCriarTimelineEmDemanda}
                    className="text-[10px] text-[#0F766E] hover:underline flex items-center gap-0.5"
                  >
                    <Plus className="w-3 h-3" />
                    Criar
                  </button>
                </div>
                <Select
                  value={demandaTimeline || '__empty__'}
                  onValueChange={(v) => {
                    if (v === '__create_new__') {
                      handleAbrirCriarTimelineEmDemanda()
                    } else if (v === '__empty__') {
                      setDemandaTimeline('')
                    } else {
                      setDemandaTimeline(v)
                    }
                  }}
                >
                  <SelectTrigger className="text-xs border-[#E5E1D8]">
                    <SelectValue placeholder="Selecione marco" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem
                      value="__create_new__"
                      className="text-[#0F766E] font-semibold bg-[#0F766E]/5 hover:bg-[#0F766E]/15 cursor-pointer border-b border-[#E5E1D8] mb-1"
                    >
                      + Criar novo marco...
                    </SelectItem>
                    <SelectItem value="__empty__">Nenhum</SelectItem>
                    {marcosTimeline.map((m) => (
                      <SelectItem key={m.id} value={m.nome}>
                        ⏳ {m.nome}
                      </SelectItem>
                    ))}
                    {demandaTimeline && !marcosTimeline.some((m) => m.nome === demandaTimeline) && (
                      <SelectItem value={demandaTimeline}>
                        ⏳ {demandaTimeline} (Personalizado)
                      </SelectItem>
                    )}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <DialogFooter className="flex justify-end gap-2 pt-3 border-t border-[#E5E1D8]">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setModalDemandaOpen(false)}
                className="text-xs"
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={criandoDemanda}
                className="bg-[#0F766E] hover:bg-[#0D5C56] text-white text-xs px-4"
              >
                {criandoDemanda ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" />
                    Criando...
                  </>
                ) : (
                  <>
                    <Check className="w-3.5 h-3.5 mr-1.5" />
                    Confirmar Demanda
                  </>
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Modal Germinar Semente: cascata categoria → fluxo → coluna; card nunca órfão */}
      <ModalGerminarSemente
        aberto={modalGerminarOpen}
        onFechar={() => {
          setModalGerminarOpen(false)
          setSementeParaGerminar(null)
        }}
        tituloSemente={sementeParaGerminar?.registro || ''}
        descricaoSemente={[
          sementeParaGerminar?.condicao_reativacao
            ? `Condição de reativação: ${sementeParaGerminar.condicao_reativacao}`
            : '',
          sementeParaGerminar?.expand?.projeto?.nome
            ? `Projeto: ${sementeParaGerminar.expand.projeto.nome}`
            : '',
          sementeParaGerminar?.expand?.contato?.nome
            ? `Contato: ${sementeParaGerminar.expand.contato.nome}`
            : '',
        ]
          .filter(Boolean)
          .join('\n')}
        destinos={destinosGerminar}
        criando={germinando}
        onConfirmar={handleConfirmarGerminar}
      />

      {/* Modal 1: Criar Novo Projeto Rapidamente */}
      <Dialog open={modalCriarProjetoOpen} onOpenChange={setModalCriarProjetoOpen}>
        <DialogContent className="max-w-md bg-white border border-[#E5E1D8]">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-[#1A1D21] flex items-center gap-2">
              <FolderGit2 className="w-4 h-4 text-[#0F766E]" />
              Criar Novo Projeto
            </DialogTitle>
            <DialogDescription className="text-xs text-[#5B6470]">
              Cadastre o projeto sem sair da Folha. Ele será automaticamente vinculado ao assunto
              atual.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmeterCriarProjeto} className="space-y-3.5 pt-2">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-[#1A1D21]">Nome do Projeto *</label>
              <Input
                required
                autoFocus
                placeholder="Ex: Campanha Q3, Reformulação Web..."
                value={novoProjetoNome}
                onChange={(e) => setNovoProjetoNome(e.target.value)}
                className="text-xs border-[#E5E1D8]"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-[#5B6470]">Tipo de Projeto</label>
              <Select
                value={novoProjetoTipo}
                onValueChange={(v) => setNovoProjetoTipo(v as ProjetoTipo)}
              >
                <SelectTrigger className="text-xs border-[#E5E1D8]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="cliente">Cliente</SelectItem>
                  <SelectItem value="interno">Interno</SelectItem>
                  <SelectItem value="parceria">Parceria</SelectItem>
                  <SelectItem value="outro">Outro</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-[#5B6470]">Descrição / Objetivo</label>
              <Textarea
                rows={2}
                placeholder="Breve descrição do projeto..."
                value={novoProjetoDescricao}
                onChange={(e) => setNovoProjetoDescricao(e.target.value)}
                className="text-xs border-[#E5E1D8]"
              />
            </div>

            <DialogFooter className="flex justify-end gap-2 pt-3 border-t border-[#E5E1D8]">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setModalCriarProjetoOpen(false)}
                className="text-xs"
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={criandoProjeto || !novoProjetoNome.trim()}
                className="bg-[#0F766E] hover:bg-[#0D5C56] text-white text-xs px-4"
              >
                {criandoProjeto ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" />
                    Salvando...
                  </>
                ) : (
                  <>
                    <Plus className="w-3.5 h-3.5 mr-1.5" />
                    Criar & Selecionar
                  </>
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Modal 2: Criar Novo Contato Rapidamente */}
      <Dialog open={modalCriarContatoOpen} onOpenChange={setModalCriarContatoOpen}>
        <DialogContent className="max-w-md bg-white border border-[#E5E1D8]">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-[#1A1D21] flex items-center gap-2">
              <UserCheck className="w-4 h-4 text-[#0F766E]" />
              Criar Novo Contato
            </DialogTitle>
            <DialogDescription className="text-xs text-[#5B6470]">
              Cadastre o contato e vincule-o imediatamente a este assunto da folha.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmeterCriarContato} className="space-y-3 pt-2">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-[#1A1D21]">Nome Completo *</label>
              <Input
                required
                autoFocus
                placeholder="Ex: Dra. Mariana Silva"
                value={novoContatoNome}
                onChange={(e) => setNovoContatoNome(e.target.value)}
                className="text-xs border-[#E5E1D8]"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-[#5B6470]">
                  Empresa / Organização
                </label>
                <Input
                  placeholder="Ex: Grupo Diamond"
                  value={novoContatoEmpresa}
                  onChange={(e) => setNovoContatoEmpresa(e.target.value)}
                  className="text-xs border-[#E5E1D8]"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-[#5B6470]">Cargo / Função</label>
                <Input
                  placeholder="Ex: Diretora de Operações"
                  value={novoContatoCargo}
                  onChange={(e) => setNovoContatoCargo(e.target.value)}
                  className="text-xs border-[#E5E1D8]"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-[#5B6470]">E-mail</label>
                <Input
                  type="email"
                  placeholder="contato@empresa.com"
                  value={novoContatoEmail}
                  onChange={(e) => setNovoContatoEmail(e.target.value)}
                  className="text-xs border-[#E5E1D8]"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-[#5B6470]">Telefone / WhatsApp</label>
                <Input
                  placeholder="(11) 99999-9999"
                  value={novoContatoTelefone}
                  onChange={(e) => setNovoContatoTelefone(e.target.value)}
                  className="text-xs border-[#E5E1D8]"
                />
              </div>
            </div>

            <DialogFooter className="flex justify-end gap-2 pt-3 border-t border-[#E5E1D8]">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setModalCriarContatoOpen(false)}
                className="text-xs"
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={criandoContato || !novoContatoNome.trim()}
                className="bg-[#0F766E] hover:bg-[#0D5C56] text-white text-xs px-4"
              >
                {criandoContato ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" />
                    Salvando...
                  </>
                ) : (
                  <>
                    <Plus className="w-3.5 h-3.5 mr-1.5" />
                    Criar & Selecionar
                  </>
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Modal 3: Criar Novo Fluxo Kanban */}
      <Dialog open={modalCriarFluxoOpen} onOpenChange={setModalCriarFluxoOpen}>
        <DialogContent className="max-w-sm bg-white border border-[#E5E1D8]">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-[#1A1D21] flex items-center gap-2">
              <Layers className="w-4 h-4 text-[#0F766E]" />
              Novo Fluxo Kanban
            </DialogTitle>
            <DialogDescription className="text-xs text-[#5B6470]">
              Cadastre um fluxo Kanban dentro de uma categoria e vincule a este assunto.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmeterCriarFluxo} className="space-y-3.5 pt-2">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-[#1A1D21]">Nome do Fluxo *</label>
              <Input
                required
                autoFocus
                placeholder="Ex: Comercial, Operações, Jurídico..."
                value={novoFluxoNome}
                onChange={(e) => setNovoFluxoNome(e.target.value)}
                className="text-xs border-[#E5E1D8]"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-[#5B6470]">Categoria do Fluxo</label>
              <Select
                value={novoFluxoCategoriaId || categorias[0]?.id || ''}
                onValueChange={setNovoFluxoCategoriaId}
              >
                <SelectTrigger className="text-xs border-[#E5E1D8]">
                  <SelectValue placeholder="Selecione a categoria" />
                </SelectTrigger>
                <SelectContent>
                  {categorias.map((cat) => (
                    <SelectItem key={cat.id} value={cat.id}>
                      {cat.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-[#5B6470]">Cor do Fluxo</label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={novoFluxoCor}
                  onChange={(e) => setNovoFluxoCor(e.target.value)}
                  className="w-8 h-8 rounded border border-[#E5E1D8] cursor-pointer p-0.5 bg-white"
                />
                <div className="flex gap-1.5">
                  {[
                    '#0F766E',
                    '#0284C7',
                    '#8B5CF6',
                    '#F59E0B',
                    '#DC2626',
                    '#16A34A',
                    '#5B6470',
                  ].map((cor) => (
                    <button
                      key={cor}
                      type="button"
                      onClick={() => setNovoFluxoCor(cor)}
                      className={`w-6 h-6 rounded-full border ${
                        novoFluxoCor === cor
                          ? 'border-2 border-black scale-110'
                          : 'border-transparent'
                      }`}
                      style={{ backgroundColor: cor }}
                    />
                  ))}
                </div>
              </div>
            </div>

            <DialogFooter className="flex justify-end gap-2 pt-3 border-t border-[#E5E1D8]">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setModalCriarFluxoOpen(false)}
                className="text-xs"
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={criandoFluxo || !novoFluxoNome.trim()}
                className="bg-[#0F766E] hover:bg-[#0D5C56] text-white text-xs px-4"
              >
                {criandoFluxo ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" />
                    Criando...
                  </>
                ) : (
                  <>
                    <Plus className="w-3.5 h-3.5 mr-1.5" />
                    Criar & Selecionar
                  </>
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Modal 4: Criar Novo Marco de Timeline */}
      <Dialog open={modalCriarTimelineOpen} onOpenChange={setModalCriarTimelineOpen}>
        <DialogContent className="max-w-sm bg-white border border-[#E5E1D8]">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-[#1A1D21] flex items-center gap-2">
              <CalendarDays className="w-4 h-4 text-[#0F766E]" />
              Novo Marco de Timeline
            </DialogTitle>
            <DialogDescription className="text-xs text-[#5B6470]">
              Crie um marco, sprint ou etapa de entrega para associar ao assunto.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmeterCriarTimeline} className="space-y-3.5 pt-2">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-[#1A1D21]">Nome do Marco *</label>
              <Input
                required
                autoFocus
                placeholder="Ex: Sprint 2 / Entrega de Protótipo"
                value={novoTimelineNome}
                onChange={(e) => setNovoTimelineNome(e.target.value)}
                className="text-xs border-[#E5E1D8]"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-[#5B6470]">Descrição / Observação</label>
              <Textarea
                rows={2}
                placeholder="Opcional: objetivo desta etapa ou marco..."
                value={novoTimelineDescricao}
                onChange={(e) => setNovoTimelineDescricao(e.target.value)}
                className="text-xs border-[#E5E1D8]"
              />
            </div>

            <DialogFooter className="flex justify-end gap-2 pt-3 border-t border-[#E5E1D8]">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setModalCriarTimelineOpen(false)}
                className="text-xs"
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={criandoTimeline || !novoTimelineNome.trim()}
                className="bg-[#0F766E] hover:bg-[#0D5C56] text-white text-xs px-4"
              >
                {criandoTimeline ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" />
                    Salvando...
                  </>
                ) : (
                  <>
                    <Plus className="w-3.5 h-3.5 mr-1.5" />
                    Criar & Selecionar
                  </>
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Modal de Revisão e Aprovação da IA */}
      <Dialog open={modalRevisaoOpen} onOpenChange={setModalRevisaoOpen}>
        <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto bg-white border border-[#E5E1D8]">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-[#1A1D21] flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-[#0F766E]" />
              Revisão de Sugestões da IA Diamond
            </DialogTitle>
            <DialogDescription className="text-xs text-[#5B6470]">
              Revise os cards, os compromissos para a agenda e a síntese executiva antes de gravar
              no sistema e consolidar a memória.
            </DialogDescription>
          </DialogHeader>

          {sugestoesIA && (
            <div className="space-y-5 pt-2">
              {/* Cards Sugeridos */}
              <div>
                <h4 className="text-xs font-bold text-[#1A1D21] uppercase tracking-wider mb-2 flex items-center justify-between">
                  <span>Cards Sugeridos para o Kanban ({sugestoesIA.cards?.length || 0})</span>
                  <span className="text-[11px] text-[#0F766E] normal-case font-medium">
                    Você poderá editar no Kanban
                  </span>
                </h4>
                <div className="space-y-2.5 max-h-[260px] overflow-y-auto pr-1">
                  {sugestoesIA.cards?.map((card, idx) => (
                    <div
                      key={idx}
                      className="p-3 rounded-lg border border-[#E5E1D8] bg-[#F4F2EE]/40 text-xs space-y-1.5"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-bold text-[#1A1D21]">{card.titulo}</span>
                        <div className="flex items-center gap-1.5">
                          <Badge variant="outline" className="text-[10px] capitalize">
                            {card.status.replace('_', ' ')}
                          </Badge>
                          <Badge className="text-[10px] bg-[#0F766E] text-white">
                            {card.prioridade}
                          </Badge>
                        </div>
                      </div>
                      <p className="text-[#5B6470]">{card.descricao}</p>
                      {card.proximo_passo && (
                        <p className="text-[#0F766E] font-medium flex items-center gap-1">
                          <ArrowRight className="w-3 h-3" />
                          Próximo passo: {card.proximo_passo}
                        </p>
                      )}
                      {card.tags && card.tags.length > 0 && (
                        <div className="flex flex-wrap gap-1 pt-1">
                          {card.tags.map((t, i) => (
                            <span
                              key={i}
                              className="text-[9px] bg-white border border-[#E5E1D8] px-1.5 py-0.5 rounded text-[#5B6470]"
                            >
                              #{t}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Eventos Sugeridos (datas e horários citados nos assuntos) */}
              {sugestoesIA.eventos && sugestoesIA.eventos.length > 0 && (
                <div>
                  <h4 className="text-xs font-bold text-[#1A1D21] uppercase tracking-wider mb-2 flex items-center justify-between">
                    <span className="flex items-center gap-1.5">
                      <CalendarCheck className="w-3.5 h-3.5 text-[#0F766E]" />
                      Compromissos Detectados para a Agenda ({sugestoesIA.eventos.length})
                    </span>
                    <span className="text-[11px] text-[#0F766E] normal-case font-medium">
                      Desmarque o que não deseja criar
                    </span>
                  </h4>
                  <div className="space-y-2.5 max-h-[260px] overflow-y-auto pr-1">
                    {sugestoesIA.eventos.map((ev, idx) => (
                      <label
                        key={idx}
                        className={`flex items-start gap-2.5 p-3 rounded-lg border text-xs cursor-pointer transition-colors ${
                          eventosSelecionados[idx]
                            ? 'border-[#0F766E]/50 bg-[#0F766E]/5'
                            : 'border-[#E5E1D8] bg-[#F4F2EE]/40 opacity-70'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={!!eventosSelecionados[idx]}
                          onChange={(e) =>
                            setEventosSelecionados((prev) => ({
                              ...prev,
                              [idx]: e.target.checked,
                            }))
                          }
                          className="mt-0.5 accent-[#0F766E]"
                        />
                        <span className="flex-1 space-y-1">
                          <span className="flex items-center justify-between gap-2">
                            <span className="font-bold text-[#1A1D21] flex items-center gap-1.5">
                              {ev.e_reuniao && <Video className="w-3 h-3 text-[#0F766E]" />}
                              {ev.titulo}
                            </span>
                            {ev.e_reuniao && (
                              <Badge className="text-[9px] bg-[#0F766E] text-white shrink-0">
                                Com sala de reunião
                              </Badge>
                            )}
                          </span>
                          <span className="block text-[#0F766E] font-medium">
                            {new Date(ev.data_inicio).toLocaleString('pt-BR', {
                              weekday: 'short',
                              day: '2-digit',
                              month: 'short',
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                            {ev.data_fim &&
                              ` → ${new Date(ev.data_fim).toLocaleTimeString('pt-BR', {
                                hour: '2-digit',
                                minute: '2-digit',
                              })}`}
                          </span>
                          {ev.descricao && (
                            <span className="block text-[#5B6470]">{ev.descricao}</span>
                          )}
                        </span>
                      </label>
                    ))}
                  </div>
                </div>
              )}

              {/* Resumo do Dia Sugerido */}
              {sugestoesIA.resumo && (
                <div className="border-t border-[#E5E1D8] pt-3 space-y-2 text-xs">
                  <h4 className="font-bold text-[#1A1D21] uppercase tracking-wider text-[11px]">
                    Síntese Executiva Gerada
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                    <div className="bg-[#F4F2EE]/50 p-2.5 rounded border border-[#E5E1D8]">
                      <span className="font-semibold block text-[11px] mb-1">🎯 Prioridades:</span>
                      <p className="text-[#5B6470] whitespace-pre-line">
                        {sugestoesIA.resumo.prioridades}
                      </p>
                    </div>
                    <div className="bg-[#F4F2EE]/50 p-2.5 rounded border border-[#E5E1D8]">
                      <span className="font-semibold block text-[11px] mb-1">💡 Decisões:</span>
                      <p className="text-[#5B6470] whitespace-pre-line">
                        {sugestoesIA.resumo.decisoes}
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          <DialogFooter className="flex justify-between items-center pt-4 border-t border-[#E5E1D8]">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setModalRevisaoOpen(false)}
              className="text-xs"
            >
              Cancelar
            </Button>
            <Button
              type="button"
              size="sm"
              disabled={salvandoRevisao}
              onClick={handleAprovarESalvar}
              className="bg-[#0F766E] hover:bg-[#0D5C56] text-white text-xs px-4"
            >
              {salvandoRevisao ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" />
                  Salvando Fluxo...
                </>
              ) : (
                <>
                  <Check className="w-3.5 h-3.5 mr-1.5" />
                  Aprovar & Salvar no Sistema
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal de Arquivar como Semente */}
      <Dialog open={modalSementeOpen} onOpenChange={setModalSementeOpen}>
        <DialogContent className="max-w-md bg-white border border-[#E5E1D8]">
          <DialogHeader>
            <div className="flex items-center gap-2">
              <span className="p-1.5 bg-amber-100 text-amber-800 rounded-lg">
                <Sprout className="w-5 h-5 text-emerald-700" />
              </span>
              <div>
                <DialogTitle className="text-base font-bold text-[#1A1D21]">
                  Arquivar como Semente 🌱
                </DialogTitle>
                <DialogDescription className="text-xs text-[#5B6470]">
                  Guarde esta oportunidade ou negócio que hoje não tem interesse, mas pode render no
                  futuro.
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <div className="space-y-3.5 pt-2 text-xs">
            {itemParaSemente && (
              <div className="p-2.5 rounded-lg bg-[#FAFAF9] border border-[#E5E1D8] text-[#1A1D21] max-h-24 overflow-y-auto">
                <span className="text-[10px] uppercase font-bold text-[#5B6470] block mb-0.5">
                  Assunto original:
                </span>
                <p className="line-clamp-3 text-[11px] leading-relaxed">
                  {itemParaSemente.registro}
                </p>
              </div>
            )}

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-[11px] font-semibold text-[#1A1D21]">
                  Tese de Mercado (Cofre por Tese)
                </label>
                <button
                  type="button"
                  onClick={() => setMostrarCriarTeseModal(!mostrarCriarTeseModal)}
                  className="text-[11px] font-semibold text-emerald-800 hover:text-emerald-900 flex items-center gap-1 hover:underline"
                >
                  <Plus className="w-3 h-3" />
                  <span>{mostrarCriarTeseModal ? 'Fechar nova tese' : '+ Nova Tese'}</span>
                </button>
              </div>

              {mostrarCriarTeseModal ? (
                <div className="p-2.5 rounded-lg border border-emerald-300 bg-emerald-50/50 space-y-2 mb-2">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-900 block">
                    Criar Nova Tese de Mercado
                  </span>
                  <Input
                    placeholder="Nome da tese (ex: Crédito Rural, Aquisição de Startups)"
                    value={novaTeseNomeModal}
                    onChange={(e) => setNovaTeseNomeModal(e.target.value)}
                    className="text-xs h-8 bg-white border-emerald-200"
                  />
                  <Input
                    placeholder="Descrição / Critério (opcional)"
                    value={novaTeseDescModal}
                    onChange={(e) => setNovaTeseDescModal(e.target.value)}
                    className="text-xs h-8 bg-white border-emerald-200"
                  />
                  <div className="flex justify-end gap-1.5 pt-1">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setMostrarCriarTeseModal(false)
                        setNovaTeseNomeModal('')
                        setNovaTeseDescModal('')
                      }}
                      className="h-7 text-xs px-2"
                    >
                      Cancelar
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      disabled={!novaTeseNomeModal.trim() || criandoTeseModal}
                      onClick={async () => {
                        if (!novaTeseNomeModal.trim()) return
                        setCriandoTeseModal(true)
                        try {
                          const criada = await diamondApi.createTeseSemente({
                            nome: novaTeseNomeModal.trim(),
                            descricao: novaTeseDescModal.trim() || undefined,
                          })
                          setTesesSementes((prev) => [...prev, criada])
                          setSementeTeseEscolhida(criada.id)
                          setNovaTeseNomeModal('')
                          setNovaTeseDescModal('')
                          setMostrarCriarTeseModal(false)
                          toast({
                            title: 'Tese criada!',
                            description: `Tese "${criada.nome}" criada e vinculada a esta semente.`,
                          })
                        } catch (err) {
                          toast({
                            title: 'Erro ao criar tese',
                            description: (err as Error)?.message,
                            variant: 'destructive',
                          })
                        } finally {
                          setCriandoTeseModal(false)
                        }
                      }}
                      className="h-7 text-xs bg-emerald-700 hover:bg-emerald-800 text-white font-semibold px-2.5 gap-1"
                    >
                      {criandoTeseModal ? (
                        <Loader2 className="w-3 h-3 animate-spin" />
                      ) : (
                        <Plus className="w-3 h-3" />
                      )}
                      <span>Criar e Selecionar</span>
                    </Button>
                  </div>
                </div>
              ) : (
                <Select
                  value={sementeTeseEscolhida}
                  onValueChange={(val) => setSementeTeseEscolhida(val)}
                >
                  <SelectTrigger className="text-xs h-9 bg-white border-[#E5E1D8]">
                    <SelectValue placeholder="Selecione uma tese..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">
                      <span className="text-stone-500">Sem tese definida</span>
                    </SelectItem>
                    {tesesSementes.map((t) => (
                      <SelectItem key={t.id} value={t.id}>
                        {t.nome}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
              <p className="text-[10px] text-[#5B6470] mt-1">
                Agrupa esta semente dentro da tese de mercado no Cofre.
              </p>
            </div>

            <div>
              <label className="text-[11px] font-semibold text-[#1A1D21] block mb-1">
                Parceiro
              </label>
              <Input
                placeholder="Nome do parceiro (busca contatos existentes)..."
                value={sementeParceiro}
                onChange={(e) => setSementeParceiro(e.target.value)}
                className="text-xs h-9 bg-white border-[#E5E1D8]"
              />
              {sementeParceiro.trim().length > 0 && (
                <div className="mt-1 max-h-32 overflow-y-auto rounded-lg border border-[#E5E1D8] bg-white">
                  {buscandoContatos && sugestoesContato.length === 0 ? (
                    <div className="flex items-center gap-1.5 p-2 text-[10px] text-[#5B6470]">
                      <Loader2 className="w-3 h-3 animate-spin" />
                      Buscando contatos...
                    </div>
                  ) : sugestoesContato.length === 0 ? (
                    <div className="p-2 text-[10px] text-[#5B6470]">
                      Nenhum contato encontrado — o texto digitado será salvo como parceiro livre.
                    </div>
                  ) : (
                    sugestoesContato.map((sc) => (
                      <button
                        key={sc.id}
                        type="button"
                        onClick={() => {
                          setSementeParceiro(sc.nome)
                          setSugestoesContato([])
                        }}
                        className="w-full text-left px-2.5 py-1.5 text-[11px] text-[#1A1D21] hover:bg-emerald-50 flex items-center gap-1.5"
                      >
                        <span className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-800 flex items-center justify-center text-[9px] font-bold shrink-0">
                          {sc.nome
                            .split(' ')
                            .filter(Boolean)
                            .slice(0, 2)
                            .map((p) => p[0]?.toUpperCase())
                            .join('')}
                        </span>
                        <span className="truncate">{sc.nome}</span>
                      </button>
                    ))
                  )}
                </div>
              )}
              <p className="text-[10px] text-[#5B6470] mt-1">
                Texto livre — sugere contatos existentes para agilizar.
              </p>
            </div>

            <div>
              <label className="text-[11px] font-semibold text-[#1A1D21] block mb-1">Negócio</label>
              <Select
                value={sementeNegocioSelecionada}
                onValueChange={(val) => {
                  setSementeNegocioSelecionada(val)
                  if (val === 'none') {
                    setSementeNegocio('')
                  } else if (val === '__livre__') {
                    setSementeNegocio('')
                  } else {
                    const ng = negocios.find((n) => n.id === val)
                    setSementeNegocio(ng?.nome || val)
                  }
                }}
              >
                <SelectTrigger className="text-xs h-9 bg-white border-[#E5E1D8]">
                  <SelectValue placeholder="Selecione um negócio..." />
                </SelectTrigger>
                <SelectContent className="max-h-56">
                  <SelectItem value="none">
                    <span className="text-stone-500">Sem negócio</span>
                  </SelectItem>
                  {negocios.map((ng) => (
                    <SelectItem key={ng.id} value={ng.id}>
                      {ng.nome}
                    </SelectItem>
                  ))}
                  <SelectItem value="__livre__">Outro (digitar)</SelectItem>
                </SelectContent>
              </Select>
              {sementeNegocioSelecionada === '__livre__' && (
                <Input
                  placeholder="Nome do negócio (texto livre)..."
                  value={sementeNegocio}
                  onChange={(e) => setSementeNegocio(e.target.value)}
                  className="text-xs h-9 bg-white border-[#E5E1D8] mt-1.5"
                />
              )}
              <p className="text-[10px] text-[#5B6470] mt-1">
                Escolha um negócio existente ou digite um novo — será salvo no cofre.
              </p>
            </div>

            <div>
              <label className="text-[11px] font-semibold text-[#1A1D21] block mb-1">
                Condição de Reativação
              </label>
              <Input
                placeholder='Ex.: "quando alguém procurar esse tipo de serviço" ou "quando cliente retomar contato"'
                value={sementeCondicao}
                onChange={(e) => setSementeCondicao(e.target.value)}
                className="text-xs h-9 bg-white border-[#E5E1D8]"
              />
              <p className="text-[10px] text-[#5B6470] mt-1">
                Explica o gatilho para reabrir este assunto no futuro.
              </p>
            </div>

            <div>
              <label className="text-[11px] font-semibold text-[#1A1D21] block mb-1">
                Data Prevista de Revisão
              </label>
              <Input
                type="date"
                value={sementeDataRevisao}
                onChange={(e) => setSementeDataRevisao(e.target.value)}
                className="text-xs h-9 bg-white border-[#E5E1D8]"
              />
              <p className="text-[10px] text-[#5B6470] mt-1">
                Sugerido: daqui a 6 meses. O radar também reativa caso o contato fale no WhatsApp.
              </p>
            </div>

            <div>
              <label className="text-[11px] font-semibold text-[#1A1D21] block mb-1">
                Observação adicional (opcional)
              </label>
              <Textarea
                placeholder="Detalhes do contexto, limites ou motivos para arquivar temporariamente..."
                rows={2}
                value={sementeObservacao}
                onChange={(e) => setSementeObservacao(e.target.value)}
                className="text-xs bg-white border-[#E5E1D8]"
              />
            </div>
          </div>

          <DialogFooter className="pt-2 gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setModalSementeOpen(false)}
              className="text-xs"
              disabled={salvandoSemente}
            >
              Cancelar
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={handleConfirmarArquivarSemente}
              disabled={salvandoSemente}
              className="bg-emerald-700 hover:bg-emerald-800 text-white text-xs px-4 gap-1.5 font-semibold"
            >
              {salvandoSemente ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Arquivando...</span>
                </>
              ) : (
                <>
                  <Sprout className="w-3.5 h-3.5" />
                  <span>Salvar como Semente</span>
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal de Detalhes da Reunião Gravada */}
      <Dialog open={modalReuniaoDetalhesOpen} onOpenChange={setModalReuniaoDetalhesOpen}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto bg-white border border-[#E5E1D8]">
          <DialogHeader>
            <div className="flex items-center gap-2">
              <span className="p-1.5 bg-red-100 text-red-700 rounded-lg">
                <Mic className="w-4 h-4" />
              </span>
              <div>
                <DialogTitle className="text-base font-bold text-[#1A1D21]">
                  Ata da Reunião Gravada
                </DialogTitle>
                <DialogDescription className="text-xs text-[#5B6470]">
                  {reuniaoSelecionada?.data_hora?.replace('T', ' ') || reuniaoSelecionada?.data} •
                  Duração: {formatarSegundos(reuniaoSelecionada?.duracao_gravacao)}
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          {reuniaoSelecionada && (
            <div className="space-y-4 pt-2 text-xs">
              {/* Player do Áudio */}
              {reuniaoSelecionada.audio_gravacao && (
                <div className="p-3 bg-red-50/50 rounded-xl border border-red-200/70 space-y-2">
                  <div className="flex items-center justify-between text-xs font-semibold text-red-900">
                    <span className="flex items-center gap-1.5">
                      <Volume2 className="w-4 h-4 text-red-600" />
                      Reproduzir Áudio Completo da Reunião
                    </span>
                    <span className="font-mono text-[11px] text-red-700">
                      {formatarSegundos(reuniaoSelecionada.duracao_gravacao)}
                    </span>
                  </div>
                  <audio
                    controls
                    className="w-full h-8"
                    src={
                      diamondApi.getAudioUrl({
                        id: reuniaoSelecionada.id,
                        audio_gravacao: reuniaoSelecionada.audio_gravacao,
                      }) || undefined
                    }
                  />
                </div>
              )}

              {/* Ata Organizada pela IA se houver */}
              {(() => {
                let ataObj: any = null
                if (reuniaoSelecionada.ata_organizada) {
                  if (typeof reuniaoSelecionada.ata_organizada === 'string') {
                    try {
                      ataObj = JSON.parse(reuniaoSelecionada.ata_organizada)
                    } catch {
                      /* intentionally ignored */
                    }
                  } else {
                    ataObj = reuniaoSelecionada.ata_organizada
                  }
                }

                if (ataObj) {
                  return (
                    <div className="space-y-3.5">
                      {ataObj.resumo_executivo && (
                        <div className="p-3 rounded-lg bg-[#0F766E]/5 border border-[#0F766E]/20 space-y-1">
                          <span className="text-[11px] font-bold text-[#0D5C56] uppercase tracking-wide">
                            Resumo Executivo da Reunião
                          </span>
                          <p className="text-[#1A1D21] leading-relaxed">
                            {ataObj.resumo_executivo}
                          </p>
                        </div>
                      )}

                      {ataObj.topicos_discutidos && ataObj.topicos_discutidos.length > 0 && (
                        <div className="space-y-1">
                          <span className="text-[11px] font-bold text-[#1A1D21] uppercase tracking-wide">
                            Tópicos Tratados
                          </span>
                          <ul className="list-disc list-inside space-y-0.5 text-[#5B6470]">
                            {ataObj.topicos_discutidos.map((topico: string, i: number) => (
                              <li key={i}>{topico}</li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {ataObj.decisoes && ataObj.decisoes.length > 0 && (
                        <div className="space-y-1">
                          <span className="text-[11px] font-bold text-emerald-800 uppercase tracking-wide">
                            Decisões Firmadas
                          </span>
                          <ul className="list-disc list-inside space-y-0.5 text-[#5B6470]">
                            {ataObj.decisoes.map((dec: string, i: number) => (
                              <li key={i}>{dec}</li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {ataObj.proximos_passos && ataObj.proximos_passos.length > 0 && (
                        <div className="space-y-1">
                          <span className="text-[11px] font-bold text-[#0F766E] uppercase tracking-wide">
                            Próximos Passos
                          </span>
                          <ul className="list-disc list-inside space-y-0.5 text-[#5B6470]">
                            {ataObj.proximos_passos.map((passo: string, i: number) => (
                              <li key={i}>{passo}</li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {ataObj.demandas_sugeridas && ataObj.demandas_sugeridas.length > 0 && (
                        <div className="space-y-2 pt-2 border-t border-[#E5E1D8]">
                          <span className="text-[11px] font-bold text-[#1A1D21] uppercase tracking-wide block">
                            Demandas Acionáveis Sugeridas
                          </span>
                          <div className="space-y-2">
                            {ataObj.demandas_sugeridas.map((dem: any, idx: number) => (
                              <div
                                key={idx}
                                className="p-2.5 rounded-lg border border-[#E5E1D8] bg-[#FAFAF9] flex items-center justify-between gap-2"
                              >
                                <div className="space-y-0.5">
                                  <p className="font-semibold text-[#1A1D21]">{dem.titulo}</p>
                                  {dem.descricao && (
                                    <p className="text-[11px] text-[#5B6470]">{dem.descricao}</p>
                                  )}
                                </div>
                                <Button
                                  type="button"
                                  size="sm"
                                  variant="outline"
                                  onClick={() => {
                                    setModalReuniaoDetalhesOpen(false)
                                    handleAbrirCriarDemanda({
                                      id: reuniaoSelecionada.id,
                                      numero: reuniaoSelecionada.ordem || 1,
                                      texto: `${dem.titulo}\n${dem.descricao || ''}`,
                                      projetoId: reuniaoSelecionada.projeto,
                                      contatoId: reuniaoSelecionada.contato,
                                      timeline: reuniaoSelecionada.timeline,
                                    })
                                  }}
                                  className="h-7 text-[11px] text-[#0F766E] border-[#0F766E]/30 shrink-0 gap-1"
                                >
                                  <CheckSquare className="w-3 h-3" />
                                  Criar Demanda
                                </Button>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )
                }

                return (
                  <div className="space-y-3">
                    <div className="p-3 bg-amber-50 rounded-lg border border-amber-200 text-amber-800 space-y-1">
                      <p className="font-semibold">
                        Reunião gravada — status:{' '}
                        {reuniaoSelecionada.status_transcricao === 'processado'
                          ? 'Processado'
                          : 'Aguardando transcrição'}
                      </p>
                      <p className="text-[11px]">
                        Você pode criar demandas imediatas ou rodar "Organizar com IA" na Folha para
                        sintetizar todos os assuntos pendentes.
                      </p>
                    </div>

                    <div className="space-y-1">
                      <span className="text-[11px] font-bold text-[#5B6470] uppercase">
                        Conteúdo Registrado
                      </span>
                      <p className="p-3 bg-[#FAFAF9] rounded-lg border border-[#E5E1D8] whitespace-pre-wrap text-[#1A1D21]">
                        {reuniaoSelecionada.registro}
                      </p>
                    </div>
                  </div>
                )
              })()}

              {/* Botão de Ação Direta no Modal de Detalhes */}
              <div className="pt-3 border-t border-[#E5E1D8] flex justify-between items-center">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setModalReuniaoDetalhesOpen(false)}
                  className="text-xs"
                >
                  Fechar
                </Button>

                <Button
                  type="button"
                  size="sm"
                  onClick={() => {
                    setModalReuniaoDetalhesOpen(false)
                    handleAbrirCriarDemanda({
                      id: reuniaoSelecionada.id,
                      numero: reuniaoSelecionada.ordem || 1,
                      texto: reuniaoSelecionada.registro,
                      projetoId: reuniaoSelecionada.projeto,
                      contatoId: reuniaoSelecionada.contato,
                      timeline: reuniaoSelecionada.timeline,
                    })
                  }}
                  className="bg-[#0F766E] hover:bg-[#0D5C56] text-white text-xs px-4 gap-1.5"
                >
                  <CheckSquare className="w-3.5 h-3.5" />
                  Criar Demanda desta Reunião
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Modal Nova Reunião Folha com Transcrição IA */}
      <ModalNovaReuniaoFolha
        open={modalNovaReuniaoOpen}
        onOpenChange={setModalNovaReuniaoOpen}
        projetos={projetos}
        contatos={contatos}
        fluxos={fluxos}
        onReuniaoConcluida={() => {
          carregarDados()
        }}
      />

      {/* Modal de Desbloqueio Comercial do Plano */}
      <ModalDesbloqueioPlano
        open={modalUpgradeOpen}
        onOpenChange={setModalUpgradeOpen}
        recursoNome="Dias de Folha Ilimitados"
        motivo={
          upgradeMotivo ||
          `Você atingiu o limite de ${limites?.diasFolhaMax ?? 2} dias de folha do plano gratuito (Prova Viva). Ative o plano pago para criar folhas em dias ilimitados.`
        }
        isMaster={isMaster}
        isContaTeste={limites?.isContaTeste}
      />
    </div>
  )
}
