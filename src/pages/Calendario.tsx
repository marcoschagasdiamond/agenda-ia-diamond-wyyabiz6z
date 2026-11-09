import React, { useState, useMemo, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/hooks/use-auth'
import { useToast } from '@/hooks/use-toast'
import { useNavegacao } from '@/contexts/NavegacaoContext'
import { diamondApi } from '@/services/diamondApi'
import type {
  ItemCalendarioUnificado,
  EventoCalendario,
  EventoCalendarioCategoria,
  EventoCalendarioStatus,
  CardPrioridade,
  Demanda,
  Card,
  FolhaDia,
  MarcoTimeline,
  Projeto,
  Contato,
  LembreteAntecedenciaCodigo,
} from '@/types'
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Plus,
  Filter,
  CheckCircle2,
  Bell,
  Clock,
  AlertCircle,
  FileEdit,
  KanbanSquare,
  Flag,
  CalendarDays,
  CalendarRange,
  ListOrdered,
  Search,
  ExternalLink,
  Edit2,
  Trash2,
  User,
  Building2,
  Tag,
  ArrowUpRight,
  Info,
  CalendarCheck,
  CalendarX2,
  ListChecks,
  Users,
  FileText,
  Rocket,
  CheckCircle,
  Video,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'

type VisaoTipo = 'mes' | 'semana' | 'lista'

export default function Calendario() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const { toast } = useToast()

  const {
    projetos,
    contatos,
    demandas,
    cards,
    colunas,
    folhaItems,
    marcosTimeline,
    eventosCalendario,
    dataSelecionadaCalendario,
    setDataSelecionadaCalendario,
    filtroTipoCalendario,
    setFiltroTipoCalendario,
    recarregarDadosGlobais,
    recarregarFluxo,
  } = useNavegacao()

  // Fases físicas de projetos para exibir no calendário
  const [fasesProjetos, setFasesProjetos] = useState<import('@/types').ProjetoFase[]>([])

  useEffect(() => {
    let ativo = true
    diamondApi
      .listProjetoFases()
      .then((res) => {
        if (ativo) setFasesProjetos(res)
      })
      .catch(() => {})
    return () => {
      ativo = false
    }
  }, [projetos])

  // Visão atual (Mês, Semana, Lista)
  const [visao, setVisao] = useState<VisaoTipo>('mes')

  // Data âncora para navegação (por padrão, data atual ou data selecionada no contexto)
  const [dataAtual, setDataAtual] = useState<Date>(() => {
    if (dataSelecionadaCalendario) {
      const parts = dataSelecionadaCalendario.split('-')
      if (parts.length === 3) {
        return new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]))
      }
    }
    return new Date()
  })

  // Sincroniza se o usuário clicou no mini-calendário da coluna contextual
  useEffect(() => {
    if (dataSelecionadaCalendario) {
      const parts = dataSelecionadaCalendario.split('-')
      if (parts.length === 3) {
        setDataAtual(new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2])))
      }
    }
  }, [dataSelecionadaCalendario])

  // Filtros locais adicionais
  const [buscaTexto, setBuscaTexto] = useState('')
  const [filtroProjeto, setFiltroProjeto] = useState<string>('todos')
  const [filtroStatus, setFiltroStatus] = useState<string>('todos')

  // Modais
  const [modalNovoEventoOpen, setModalNovoEventoOpen] = useState(false)
  const [modalDetalheOpen, setModalDetalheOpen] = useState(false)
  const [itemSelecionado, setItemSelecionado] = useState<ItemCalendarioUnificado | null>(null)

  // 4.1 Modal da Sala de Reunião Jitsi Integrada
  const [modalJitsiOpen, setModalJitsiOpen] = useState(false)
  const [jitsiUrlAtiva, setJitsiUrlAtiva] = useState<string | null>(null)
  const [jitsiTituloAtivo, setJitsiTituloAtivo] = useState<string>('')

  const [modalDiaOpen, setModalDiaOpen] = useState(false)
  const [diaVisualizado, setDiaVisualizado] = useState<string>('')
  const [filtroTipoModalDia, setFiltroTipoModalDia] = useState<TipoAtividadeGrade | 'todos'>(
    'todos',
  )

  // Formulário de Criação/Edição de Evento Próprio
  const [formEvento, setFormEvento] = useState<{
    id?: string
    titulo: string
    descricao: string
    dataInicio: string // YYYY-MM-DD
    horaInicio: string // HH:mm
    dataFim: string // YYYY-MM-DD
    horaFim: string // HH:mm
    diaInteiro: boolean
    categoria: EventoCalendarioCategoria
    status: EventoCalendarioStatus
    prioridade: CardPrioridade
    cor: string
    projetoId: string
    contatoId: string
    linkReuniao?: string
    lembreteModo?: 'padrao' | 'personalizado' | 'desativado'
    lembreteAntecedencias?: LembreteAntecedenciaCodigo[]
  }>({
    titulo: '',
    descricao: '',
    dataInicio: '',
    horaInicio: '09:00',
    dataFim: '',
    horaFim: '10:00',
    diaInteiro: false,
    categoria: 'reuniao',
    status: 'pendente',
    prioridade: 'media',
    cor: '#0F766E',
    projetoId: '',
    contatoId: '',
    linkReuniao: '',
    lembreteModo: 'padrao',
    lembreteAntecedencias: ['15m', '1h', '1d'],
  })
  const [salvandoEvento, setSalvandoEvento] = useState(false)

  // Definição dos tipos de atividade para a grade mensal (DiamondGroup)
  type TipoAtividadeGrade =
    | 'evento'
    | 'reuniao'
    | 'demanda'
    | 'folha'
    | 'card'
    | 'marco'
    | 'projeto_fase'
    | 'projeto_inicio'
    | 'projeto_fim'

  const TIPOS_ATIVIDADE_CONFIG: Record<
    TipoAtividadeGrade,
    {
      labelSingular: string
      labelPlural: string
      icone: React.ComponentType<{ className?: string }>
      corBase: string
      bgBase: string
      borderBase: string
    }
  > = {
    evento: {
      labelSingular: 'evento',
      labelPlural: 'eventos',
      icone: CalendarDays,
      corBase: '#0F766E', // Teal Diamond
      bgBase: 'bg-teal-50 hover:bg-teal-100/80',
      borderBase: 'border-teal-200/80',
    },
    reuniao: {
      labelSingular: 'reunião',
      labelPlural: 'reuniões',
      icone: Users,
      corBase: '#0284C7', // Azul Diamond
      bgBase: 'bg-sky-50 hover:bg-sky-100/80',
      borderBase: 'border-sky-200/80',
    },
    demanda: {
      labelSingular: 'demanda',
      labelPlural: 'demandas',
      icone: ListChecks,
      corBase: '#D97706', // Âmbar
      bgBase: 'bg-amber-50 hover:bg-amber-100/80',
      borderBase: 'border-amber-200/80',
    },
    folha: {
      labelSingular: 'assunto da folha',
      labelPlural: 'assuntos da Folha',
      icone: FileText,
      corBase: '#2563EB', // Azul Royal
      bgBase: 'bg-blue-50 hover:bg-blue-100/80',
      borderBase: 'border-blue-200/80',
    },
    card: {
      labelSingular: 'card do fluxo',
      labelPlural: 'cards do Kanban',
      icone: KanbanSquare,
      corBase: '#7C3AED', // Roxo
      bgBase: 'bg-purple-50 hover:bg-purple-100/80',
      borderBase: 'border-purple-200/80',
    },
    marco: {
      labelSingular: 'marco de timeline',
      labelPlural: 'marcos de timeline',
      icone: Flag,
      corBase: '#059669', // Esmeralda
      bgBase: 'bg-emerald-50 hover:bg-emerald-100/80',
      borderBase: 'border-emerald-200/80',
    },
    projeto_fase: {
      labelSingular: 'etapa de projeto',
      labelPlural: 'etapas de projetos',
      icone: CalendarRange,
      corBase: '#0D9488', // Teal vibrante Diamond
      bgBase: 'bg-teal-50 hover:bg-teal-100/80',
      borderBase: 'border-teal-300/80',
    },
    projeto_inicio: {
      labelSingular: 'início de projeto',
      labelPlural: 'inícios de projetos',
      icone: Rocket,
      corBase: '#2563EB', // Azul Diamond
      bgBase: 'bg-blue-50 hover:bg-blue-100/80',
      borderBase: 'border-blue-300/80',
    },
    projeto_fim: {
      labelSingular: 'conclusão de projeto',
      labelPlural: 'conclusões de projetos',
      icone: CheckCircle,
      corBase: '#4338CA', // Índigo elegante Diamond
      bgBase: 'bg-indigo-50 hover:bg-indigo-100/80',
      borderBase: 'border-indigo-300/80',
    },
  }

  // Identifica a qual categoria de atividade da grade o item pertence
  const getTipoAtividadeGrade = (item: ItemCalendarioUnificado): TipoAtividadeGrade => {
    if (item.tipo === 'evento') {
      const ev = item.rawItem as EventoCalendario | undefined
      if (ev?.categoria === 'reuniao') {
        return 'reuniao'
      }
      return 'evento'
    }
    if (item.tipo === 'demanda') return 'demanda'
    if (item.tipo === 'folha') return 'folha'
    if (item.tipo === 'card') return 'card'
    if (item.tipo === 'marco') return 'marco'
    if (item.tipo === 'projeto_fase') return 'projeto_fase'
    if (item.tipo === 'projeto_inicio') return 'projeto_inicio'
    if (item.tipo === 'projeto_fim') return 'projeto_fim'
    return 'evento'
  }

  // Determina o estado predominante dos itens de um grupo (atrasado > pendente > concluido)
  const getEstadoGrupoItens = (itens: ItemCalendarioUnificado[], dataStr: string) => {
    const temAtrasado = itens.some((i) => {
      const concluido = i.status === 'concluido' || i.status === 'processado'
      if (concluido) return false
      return dataStr < hojeStr
    })
    if (temAtrasado) return 'atrasado'

    const todosConcluidos = itens.every(
      (i) => i.status === 'concluido' || i.status === 'processado',
    )
    if (todosConcluidos && itens.length > 0) return 'concluido'

    return 'pendente'
  }

  // Cores por categoria/tipo
  const getCorPorTipo = (
    tipo: ItemCalendarioUnificado['tipo'],
    status?: string,
    corCustom?: string,
  ) => {
    if (corCustom) return corCustom
    if (status === 'concluido' || status === 'processado') return '#16A34A'
    if (status === 'bloqueado' || status === 'cancelado') return '#DC2626'

    switch (tipo) {
      case 'evento':
        return '#0F766E'
      case 'demanda':
        return '#D97706' // Âmbar
      case 'card':
        return '#7C3AED' // Roxo
      case 'folha':
        return '#2563EB' // Azul
      case 'marco':
        return '#059669' // Esmeralda
      case 'projeto_fase':
        return '#0D9488' // Teal Fases Projeto
      case 'projeto_inicio':
        return '#2563EB' // Azul Diamond
      case 'projeto_fim':
        return '#4338CA' // Índigo Diamond
      default:
        return '#5B6470'
    }
  }

  // Mapa de projetos e contatos para busca rápida
  const projetoMap = useMemo(() => {
    const map = new Map<string, Projeto>()
    projetos.forEach((p) => map.set(p.id, p))
    return map
  }, [projetos])

  const contatoMap = useMemo(() => {
    const map = new Map<string, Contato>()
    contatos.forEach((c) => map.set(c.id, c))
    return map
  }, [contatos])

  // Normalização de todos os itens do sistema em uma coleção unificada
  const itensUnificados = useMemo<ItemCalendarioUnificado[]>(() => {
    const lista: ItemCalendarioUnificado[] = []

    // 1. Eventos próprios do calendário
    eventosCalendario.forEach((ev) => {
      if (!ev.data_inicio) return
      const proj = ev.projeto ? projetoMap.get(ev.projeto) : undefined
      const cont = ev.contato ? contatoMap.get(ev.contato) : undefined

      lista.push({
        id: `ev_${ev.id}`,
        titulo: ev.titulo,
        descricao: ev.descricao,
        dataHora: ev.data_inicio,
        dataHoraFim: ev.data_fim,
        diaInteiro: ev.dia_inteiro ?? false,
        tipo: 'evento',
        status: ev.status || 'pendente',
        prioridade: ev.prioridade || 'media',
        cor: ev.cor || '#0F766E',
        projetoNome: proj?.nome,
        projetoId: proj?.id,
        contatoNome: cont?.nome,
        contatoId: cont?.id,
        responsavelNome: ev.expand?.criado_por?.name,
        linkReuniao: ev.link_reuniao,
        rawItem: ev,
      })
    })

    // 2. Demandas com prazo
    demandas.forEach((dem) => {
      if (!dem.prazo) return
      const proj = dem.projeto ? projetoMap.get(dem.projeto) : undefined
      const cont = dem.contato ? contatoMap.get(dem.contato) : undefined

      lista.push({
        id: `dem_${dem.id}`,
        titulo: `Prazo Demanda: ${dem.titulo}`,
        descricao: dem.descricao,
        dataHora: dem.prazo.split('T')[0],
        diaInteiro: true,
        tipo: 'demanda',
        status: dem.status || 'pendente',
        prioridade: dem.prioridade || 'media',
        cor: dem.status === 'concluido' ? '#16A34A' : '#D97706',
        projetoNome: proj?.nome,
        projetoId: proj?.id,
        contatoNome: cont?.nome,
        contatoId: cont?.id,
        responsavelNome: dem.expand?.atribuido_a?.name,
        linkReuniao: dem.link_reuniao,
        rawItem: dem,
      })
    })

    // 3. Cards do Kanban com prazo ou data estipulada
    cards.forEach((card) => {
      const dataPrazo = card.data_prazo || ''
      if (!dataPrazo) return
      const proj = card.projeto ? projetoMap.get(card.projeto) : undefined
      const cont = card.contato ? contatoMap.get(card.contato) : undefined
      const fase = colunas.find((c) => c.chave === card.status)

      lista.push({
        id: `card_${card.id}`,
        titulo: `Card Fluxo: ${card.titulo}`,
        descricao: card.descricao || card.proximo_passo,
        dataHora: dataPrazo.split('T')[0],
        diaInteiro: true,
        tipo: 'card',
        status: (card.status as string) || 'novo',
        prioridade: card.prioridade || 'media',
        cor: fase?.cor || '#7C3AED',
        projetoNome: proj?.nome,
        projetoId: proj?.id,
        contatoNome: cont?.nome,
        contatoId: cont?.id,
        faseColunaNome: fase?.titulo || card.status,
        responsavelNome: card.expand?.responsavel?.name,
        rawItem: card,
      })
    })

    // 4. Folha do Dia com data ou data_hora
    folhaItems.forEach((folha) => {
      const dataHoraRef = folha.data_hora || folha.data
      if (!dataHoraRef) return
      const proj = folha.projeto ? projetoMap.get(folha.projeto) : undefined
      const cont = folha.contato ? contatoMap.get(folha.contato) : undefined

      lista.push({
        id: `folha_${folha.id}`,
        titulo: `Folha: ${folha.registro}`,
        descricao: folha.timeline ? `Timeline: ${folha.timeline}` : undefined,
        dataHora: dataHoraRef,
        diaInteiro: !folha.data_hora,
        tipo: 'folha',
        status: folha.status || 'pendente',
        cor: folha.status === 'processado' ? '#16A34A' : '#2563EB',
        projetoNome: proj?.nome,
        projetoId: proj?.id,
        contatoNome: cont?.nome,
        contatoId: cont?.id,
        rawItem: folha,
      })
    })

    // 5. Marcos de Timeline com data_alvo
    marcosTimeline.forEach((marco) => {
      if (!marco.data_alvo) return
      const proj = marco.projeto ? projetoMap.get(marco.projeto) : undefined

      lista.push({
        id: `marco_${marco.id}`,
        titulo: `Etapa: ${marco.nome}`,
        descricao: marco.descricao,
        dataHora: marco.data_alvo.split('T')[0],
        diaInteiro: true,
        tipo: 'marco',
        cor: '#059669',
        projetoNome: proj?.nome,
        projetoId: proj?.id,
        rawItem: marco,
      })
    })

    // 6. Fases e Cronograma Físico de Projetos (Requisito 3 do usuário)
    fasesProjetos.forEach((fase) => {
      const dataRef = fase.data_fim || fase.data_inicio
      if (!dataRef) return
      const proj = fase.projeto ? projetoMap.get(fase.projeto) : undefined

      lista.push({
        id: `projfase_${fase.id}`,
        titulo: `Fase do Projeto: ${fase.nome}`,
        descricao: `Projeto: ${proj?.nome || 'Projeto'} • Progresso: ${fase.progresso || 0}% (${fase.status || 'em_andamento'})`,
        dataHora: dataRef.split('T')[0],
        dataHoraFim: fase.data_fim ? fase.data_fim.split('T')[0] : undefined,
        diaInteiro: true,
        tipo: 'projeto_fase',
        status: fase.status === 'concluida' ? 'concluido' : 'pendente',
        cor: fase.cor || '#0D9488',
        projetoNome: proj?.nome,
        projetoId: proj?.id,
        rawItem: fase,
      })
    })

    // 7. Início e Fim de Projetos (cadastro do projeto / wizard ModalNovoProjeto)
    projetos.forEach((proj) => {
      // 7.1 Início do Projeto
      if (proj.data_inicio) {
        const diaInicio = proj.data_inicio.split('T')[0].split(' ')[0]
        if (diaInicio) {
          lista.push({
            id: `proj_ini_${proj.id}`,
            titulo: `Início do Projeto: ${proj.nome}`,
            descricao: proj.descricao || `Início oficial do projeto ${proj.nome}`,
            dataHora: diaInicio,
            dataHoraFim: proj.data_fim ? proj.data_fim.split('T')[0].split(' ')[0] : undefined,
            diaInteiro: true,
            tipo: 'projeto_inicio',
            status: proj.status === 'concluido' ? 'concluido' : 'pendente',
            cor: '#2563EB',
            projetoNome: proj.nome,
            projetoId: proj.id,
            rawItem: proj,
          })
        }
      }

      // 7.2 Fim do Projeto
      if (proj.data_fim) {
        const diaFim = proj.data_fim.split('T')[0].split(' ')[0]
        if (diaFim) {
          lista.push({
            id: `proj_fim_${proj.id}`,
            titulo: `Fim do Projeto: ${proj.nome}`,
            descricao: proj.descricao || `Conclusão / entrega prevista do projeto ${proj.nome}`,
            dataHora: diaFim,
            diaInteiro: true,
            tipo: 'projeto_fim',
            status: proj.status === 'concluido' ? 'concluido' : 'pendente',
            cor: '#4338CA',
            projetoNome: proj.nome,
            projetoId: proj.id,
            rawItem: proj,
          })
        }
      }
    })

    return lista
  }, [
    eventosCalendario,
    demandas,
    cards,
    colunas,
    folhaItems,
    marcosTimeline,
    fasesProjetos,
    projetos,
    projetoMap,
    contatoMap,
  ])

  // Filtragem dos itens unificados
  const itensFiltrados = useMemo(() => {
    return itensUnificados.filter((item) => {
      // Filtro tipo (da coluna secundária ou seletor)
      if (filtroTipoCalendario !== 'todos' && item.tipo !== filtroTipoCalendario) {
        return false
      }

      // Filtro de projeto
      if (filtroProjeto !== 'todos' && item.projetoId !== filtroProjeto) {
        return false
      }

      // Filtro de status
      if (filtroStatus !== 'todos') {
        if (
          filtroStatus === 'concluido' &&
          item.status !== 'concluido' &&
          item.status !== 'processado'
        ) {
          return false
        }
        if (
          filtroStatus === 'pendente' &&
          (item.status === 'concluido' || item.status === 'processado')
        ) {
          return false
        }
      }

      // Filtro por texto de busca
      if (buscaTexto.trim()) {
        const termo = buscaTexto.toLowerCase()
        const matchTitulo = item.titulo.toLowerCase().includes(termo)
        const matchDesc = item.descricao ? item.descricao.toLowerCase().includes(termo) : false
        const matchProj = item.projetoNome ? item.projetoNome.toLowerCase().includes(termo) : false
        const matchCont = item.contatoNome ? item.contatoNome.toLowerCase().includes(termo) : false
        if (!matchTitulo && !matchDesc && !matchProj && !matchCont) return false
      }

      return true
    })
  }, [itensUnificados, filtroTipoCalendario, filtroProjeto, filtroStatus, buscaTexto])

  // Indexação rápida por dia (formato YYYY-MM-DD)
  const itensPorDia = useMemo(() => {
    const mapa = new Map<string, ItemCalendarioUnificado[]>()
    itensFiltrados.forEach((item) => {
      const dia = item.dataHora.split('T')[0]
      if (!mapa.has(dia)) {
        mapa.set(dia, [])
      }
      mapa.get(dia)!.push(item)
    })
    return mapa
  }, [itensFiltrados])

  // Hoje no formato YYYY-MM-DD
  const hojeObj = new Date()
  const hojeStr = `${hojeObj.getFullYear()}-${String(hojeObj.getMonth() + 1).padStart(2, '0')}-${String(hojeObj.getDate()).padStart(2, '0')}`

  // Estatísticas do período
  const statsGerais = useMemo(() => {
    const total = itensFiltrados.length
    const concluidos = itensFiltrados.filter(
      (i) => i.status === 'concluido' || i.status === 'processado',
    ).length
    const atrasados = itensFiltrados.filter((i) => {
      if (i.status === 'concluido' || i.status === 'processado') return false
      const dia = i.dataHora.split('T')[0]
      return dia < hojeStr
    }).length
    const hojeTotal = itensFiltrados.filter((i) => i.dataHora.split('T')[0] === hojeStr).length

    return { total, concluidos, atrasados, hojeTotal }
  }, [itensFiltrados, hojeStr])

  // Navegação de Períodos
  const handlePeriodoAnterior = () => {
    setDataAtual((prev) => {
      const nova = new Date(prev)
      if (visao === 'mes') {
        nova.setMonth(nova.getMonth() - 1)
      } else if (visao === 'semana') {
        nova.setDate(nova.getDate() - 7)
      } else {
        nova.setMonth(nova.getMonth() - 1)
      }
      return nova
    })
  }

  const handlePeriodoSeguinte = () => {
    setDataAtual((prev) => {
      const nova = new Date(prev)
      if (visao === 'mes') {
        nova.setMonth(nova.getMonth() + 1)
      } else if (visao === 'semana') {
        nova.setDate(nova.getDate() + 7)
      } else {
        nova.setMonth(nova.getMonth() + 1)
      }
      return nova
    })
  }

  const handleIrHoje = () => {
    const h = new Date()
    setDataAtual(h)
    setDataSelecionadaCalendario(hojeStr)
  }

  // Título do Período Atual
  const tituloPeriodo = useMemo(() => {
    if (visao === 'mes' || visao === 'lista') {
      return dataAtual.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })
    }
    // Visão semana
    const diaSem = dataAtual.getDay()
    const inicio = new Date(dataAtual)
    inicio.setDate(dataAtual.getDate() - diaSem)
    const fim = new Date(inicio)
    fim.setDate(inicio.getDate() + 6)

    const dInicio = inicio.getDate()
    const mInicio = inicio.toLocaleDateString('pt-BR', { month: 'short' })
    const dFim = fim.getDate()
    const mFim = fim.toLocaleDateString('pt-BR', { month: 'short' })
    const ano = fim.getFullYear()

    return `${dInicio} de ${mInicio} - ${dFim} de ${mFim}, ${ano}`
  }, [dataAtual, visao])

  // Abre modal de criação de evento para uma data específica
  const handleAbrirCriarEvento = (dataPadrao?: string) => {
    const d = dataPadrao || dataSelecionadaCalendario || hojeStr
    setFormEvento({
      titulo: '',
      descricao: '',
      dataInicio: d,
      horaInicio: '09:00',
      dataFim: d,
      horaFim: '10:00',
      diaInteiro: false,
      categoria: 'reuniao',
      status: 'pendente',
      prioridade: 'media',
      cor: '#0F766E',
      projetoId: '',
      contatoId: '',
      lembreteModo: 'padrao',
      lembreteAntecedencias: ['15m', '1h', '1d'],
    })
    setModalNovoEventoOpen(true)
  }

  // Salvar Evento Próprio
  const handleSalvarEvento = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formEvento.titulo.trim() || !formEvento.dataInicio) {
      toast({
        title: 'Campos obrigatórios',
        description: 'Informe pelo menos o título e a data de início.',
        variant: 'destructive',
      })
      return
    }

    setSalvandoEvento(true)
    try {
      const dataInicioFormatada = formEvento.diaInteiro
        ? formEvento.dataInicio
        : `${formEvento.dataInicio}T${formEvento.horaInicio || '09:00'}`

      const dataFimFormatada = formEvento.diaInteiro
        ? formEvento.dataFim || formEvento.dataInicio
        : formEvento.dataFim
          ? `${formEvento.dataFim}T${formEvento.horaFim || '10:00'}`
          : undefined

      const payload: Partial<EventoCalendario> = {
        titulo: formEvento.titulo.trim(),
        descricao: formEvento.descricao.trim(),
        data_inicio: dataInicioFormatada,
        data_fim: dataFimFormatada,
        dia_inteiro: formEvento.diaInteiro,
        categoria: formEvento.categoria,
        status: formEvento.status,
        prioridade: formEvento.prioridade,
        cor: formEvento.cor,
        projeto: formEvento.projetoId || undefined,
        contato: formEvento.contatoId || undefined,
        link_reuniao: formEvento.linkReuniao?.trim() || undefined,
        lembrete_modo: formEvento.lembreteModo || 'padrao',
        lembrete_antecedencias:
          formEvento.lembreteModo === 'personalizado'
            ? formEvento.lembreteAntecedencias
            : undefined,
        criado_por: user?.id,
      }

      if (formEvento.id) {
        await diamondApi.updateEventoCalendario(formEvento.id, payload)
        toast({
          title: 'Evento atualizado',
          description: 'As alterações foram salvas com sucesso.',
        })
      } else {
        await diamondApi.createEventoCalendario(payload)
        toast({
          title: 'Evento criado',
          description: 'O agendamento foi adicionado ao calendário.',
        })
      }

      setModalNovoEventoOpen(false)
      await recarregarDadosGlobais()
    } catch (err) {
      console.error('Erro ao salvar evento:', err)
      toast({
        title: 'Erro ao salvar evento',
        description: 'Não foi possível gravar os dados no sistema.',
        variant: 'destructive',
      })
    } finally {
      setSalvandoEvento(false)
    }
  }

  // Excluir Evento
  const handleExcluirEvento = async (id: string) => {
    if (!confirm('Deseja realmente remover este evento do calendário?')) return
    try {
      await diamondApi.deleteEventoCalendario(id)
      toast({ title: 'Evento removido', description: 'Item excluído com sucesso.' })
      setModalDetalheOpen(false)
      await recarregarDadosGlobais()
    } catch (err) {
      console.error('Erro ao excluir:', err)
      toast({
        title: 'Erro ao excluir',
        description: 'Não foi possível remover o item.',
        variant: 'destructive',
      })
    }
  }

  // Visualizar Itens de um Dia em Modal (opcionalmente filtrado por tipo de atividade)
  const handleVerDia = (diaStr: string, tipoFiltro: TipoAtividadeGrade | 'todos' = 'todos') => {
    setDiaVisualizado(diaStr)
    setDataSelecionadaCalendario(diaStr)
    setFiltroTipoModalDia(tipoFiltro)
    setModalDiaOpen(true)
  }

  // =========================================================================
  // RENDER: VISÃO MÊS
  // =========================================================================
  const renderVisaoMes = () => {
    const ano = dataAtual.getFullYear()
    const mes = dataAtual.getMonth()

    const primeiroDia = new Date(ano, mes, 1).getDay() // 0 dom ... 6 sab
    const totalDias = new Date(ano, mes + 1, 0).getDate()
    const totalDiasMesAnterior = new Date(ano, mes, 0).getDate()

    // Células do calendário: dias anteriores + dias do mês + dias posteriores
    const celulas: {
      dia: number
      mesRelativo: 'anterior' | 'atual' | 'proximo'
      dataStr: string
    }[] = []

    // Dias do mês anterior
    for (let i = primeiroDia - 1; i >= 0; i--) {
      const d = totalDiasMesAnterior - i
      const m = mes === 0 ? 12 : mes
      const a = mes === 0 ? ano - 1 : ano
      const str = `${a}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`
      celulas.push({ dia: d, mesRelativo: 'anterior', dataStr: str })
    }

    // Dias do mês atual
    for (let d = 1; d <= totalDias; d++) {
      const str = `${ano}-${String(mes + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`
      celulas.push({ dia: d, mesRelativo: 'atual', dataStr: str })
    }

    // Dias do próximo mês para fechar linhas completas (múltiplos de 7)
    const restante = 7 - (celulas.length % 7)
    if (restante < 7) {
      for (let d = 1; d <= restante; d++) {
        const m = mes === 11 ? 1 : mes + 2
        const a = mes === 11 ? ano + 1 : ano
        const str = `${a}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`
        celulas.push({ dia: d, mesRelativo: 'proximo', dataStr: str })
      }
    }

    const diasSemanaNomes = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado']

    return (
      <div className="flex flex-col bg-white rounded-xl border border-[#E5E1D8] shadow-xs overflow-hidden">
        {/* Cabeçalho dias da semana */}
        <div className="grid grid-cols-7 border-b border-[#E5E1D8] bg-[#FAFAF9]">
          {diasSemanaNomes.map((nome, i) => (
            <div
              key={nome}
              className={`py-2 text-center text-xs font-semibold ${
                i === 0 || i === 6 ? 'text-[#5B6470]' : 'text-[#1A1D21]'
              }`}
            >
              <span className="hidden sm:inline">{nome}</span>
              <span className="sm:hidden">{nome.slice(0, 3)}</span>
            </div>
          ))}
        </div>

        {/* Grade do Mês */}
        <div className="grid grid-cols-7 divide-x divide-y divide-[#E5E1D8]">
          {celulas.map((cel, idx) => {
            const itensDoDia = itensPorDia.get(cel.dataStr) || []
            const isHoje = cel.dataStr === hojeStr
            const isSelecionado = cel.dataStr === dataSelecionadaCalendario
            const isOutroMes = cel.mesRelativo !== 'atual'

            return (
              <div
                key={idx}
                onClick={() => {
                  setDataSelecionadaCalendario(cel.dataStr)
                }}
                className={`min-h-[105px] md:min-h-[125px] p-1.5 flex flex-col justify-between transition-colors relative group ${
                  isOutroMes
                    ? 'bg-[#FAFAF9]/60 text-zinc-400'
                    : isHoje
                      ? 'bg-[#0F766E]/5'
                      : isSelecionado
                        ? 'bg-[#0F766E]/10'
                        : 'bg-white hover:bg-[#F4F2EE]/40'
                }`}
              >
                {/* Cabeçalho do Dia */}
                <div className="flex items-center justify-between mb-1">
                  <span
                    className={`text-xs font-bold w-6 h-6 rounded-full flex items-center justify-center ${
                      isHoje
                        ? 'bg-[#0F766E] text-white shadow-2xs'
                        : isSelecionado
                          ? 'border border-[#0F766E] text-[#0F766E]'
                          : isOutroMes
                            ? 'text-zinc-400'
                            : 'text-[#1A1D21]'
                    }`}
                  >
                    {cel.dia}
                  </span>

                  {/* Ação rápida para adicionar evento no dia */}
                  <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-0.5">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation()
                        handleAbrirCriarEvento(cel.dataStr)
                      }}
                      className="p-1 rounded bg-white hover:bg-[#E5E1D8] text-[#0F766E] shadow-2xs"
                      title="Adicionar evento neste dia"
                    >
                      <Plus className="w-3 h-3" />
                    </button>
                    {itensDoDia.length > 0 && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation()
                          handleVerDia(cel.dataStr)
                        }}
                        className="p-1 rounded bg-white hover:bg-[#E5E1D8] text-[#5B6470] shadow-2xs"
                        title="Ver todos do dia"
                      >
                        <ArrowUpRight className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                </div>

                {/* Ícones compactos por tipo de atividade no estilo DiamondGroup */}
                {(() => {
                  // Agrupa itens do dia por TipoAtividadeGrade
                  const gruposPorTipo: Record<TipoAtividadeGrade, ItemCalendarioUnificado[]> = {
                    evento: [],
                    reuniao: [],
                    demanda: [],
                    folha: [],
                    card: [],
                    marco: [],
                    projeto_fase: [],
                    projeto_inicio: [],
                    projeto_fim: [],
                  }

                  itensDoDia.forEach((item) => {
                    const tipoAtiv = getTipoAtividadeGrade(item)
                    gruposPorTipo[tipoAtiv].push(item)
                  })

                  // Tipos com atividade no dia (ordem consistente de apresentação)
                  const ordemTipos: TipoAtividadeGrade[] = [
                    'evento',
                    'reuniao',
                    'demanda',
                    'folha',
                    'card',
                    'marco',
                    'projeto_fase',
                    'projeto_inicio',
                    'projeto_fim',
                  ]
                  const tiposAtivos = ordemTipos.filter((t) => gruposPorTipo[t].length > 0)

                  if (tiposAtivos.length === 0) {
                    return <div className="flex-1" />
                  }

                  return (
                    <div className="flex-1 flex flex-wrap content-start items-start gap-1 py-1">
                      {tiposAtivos.map((tipo) => {
                        const itensDoTipo = gruposPorTipo[tipo]
                        const qtd = itensDoTipo.length
                        const config = TIPOS_ATIVIDADE_CONFIG[tipo]
                        const IconeComponent = config.icone
                        const estado = getEstadoGrupoItens(itensDoTipo, cel.dataStr)

                        // Tooltip descritivo em português: ex. "1 reunião", "3 demandas"
                        const tooltip = `${qtd} ${qtd === 1 ? config.labelSingular : config.labelPlural}${
                          estado === 'atrasado'
                            ? ' (atrasado)'
                            : estado === 'concluido'
                              ? ' (concluído)'
                              : ''
                        }`

                        // Estilo do badge/ponto de estado (vermelho para atrasado, verde concluído, âmbar pendente)
                        const dotColor =
                          estado === 'atrasado'
                            ? 'bg-red-500 ring-1 ring-white'
                            : estado === 'concluido'
                              ? 'bg-emerald-500 ring-1 ring-white'
                              : 'bg-amber-400 ring-1 ring-white'

                        const badgeColor =
                          estado === 'atrasado'
                            ? 'bg-red-500 text-white'
                            : estado === 'concluido'
                              ? 'bg-emerald-600 text-white'
                              : 'bg-zinc-700 text-white'

                        return (
                          <button
                            key={tipo}
                            type="button"
                            title={tooltip}
                            aria-label={tooltip}
                            onClick={(e) => {
                              e.stopPropagation()
                              if (itensDoTipo.length === 1) {
                                setItemSelecionado(itensDoTipo[0])
                                setModalDetalheOpen(true)
                              } else {
                                handleVerDia(cel.dataStr, tipo)
                              }
                            }}
                            className={`relative inline-flex items-center gap-1 px-1.5 py-1 rounded-md border text-xs font-semibold shadow-2xs transition-all hover:scale-105 active:scale-95 focus:outline-hidden ${config.bgBase} ${config.borderBase}`}
                            style={{
                              color:
                                estado === 'atrasado'
                                  ? '#DC2626'
                                  : estado === 'concluido'
                                    ? '#16A34A'
                                    : config.corBase,
                            }}
                          >
                            <IconeComponent className="w-3.5 h-3.5 shrink-0" />

                            {/* Contador numérico (badge de quantidade) quando >= 1 */}
                            <span
                              className={`text-[9px] font-bold px-1 py-0.2 rounded-full min-w-[14px] text-center leading-none ${badgeColor}`}
                            >
                              {qtd}
                            </span>

                            {/* Ponto indicador de estado */}
                            <span
                              className={`w-1.5 h-1.5 rounded-full shrink-0 ${dotColor}`}
                              aria-hidden="true"
                            />
                          </button>
                        )
                      })}
                    </div>
                  )
                })()}
              </div>
            )
          })}
        </div>
      </div>
    )
  }

  // =========================================================================
  // RENDER: VISÃO SEMANA
  // =========================================================================
  const renderVisaoSemana = () => {
    const diaSem = dataAtual.getDay()
    const inicio = new Date(dataAtual)
    inicio.setDate(dataAtual.getDate() - diaSem)

    const diasDaSemana: { data: Date; dataStr: string; nomeSem: string }[] = []
    const nomes = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']

    for (let i = 0; i < 7; i++) {
      const d = new Date(inicio)
      d.setDate(inicio.getDate() + i)
      const str = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
      diasDaSemana.push({ data: d, dataStr: str, nomeSem: nomes[i] })
    }

    return (
      <div className="bg-white rounded-xl border border-[#E5E1D8] shadow-xs overflow-hidden">
        {/* Cabeçalho da Semana */}
        <div className="grid grid-cols-7 border-b border-[#E5E1D8] bg-[#FAFAF9] divide-x divide-[#E5E1D8]">
          {diasDaSemana.map((d) => {
            const isHoje = d.dataStr === hojeStr
            return (
              <div
                key={d.dataStr}
                className={`py-3 px-2 text-center ${isHoje ? 'bg-[#0F766E]/10' : ''}`}
              >
                <div className="text-xs font-semibold text-[#5B6470]">{d.nomeSem}</div>
                <div
                  className={`text-sm font-bold mt-0.5 inline-block px-2 py-0.5 rounded-full ${
                    isHoje ? 'bg-[#0F766E] text-white' : 'text-[#1A1D21]'
                  }`}
                >
                  {d.data.getDate()}
                </div>
              </div>
            )
          })}
        </div>

        {/* Colunas dos 7 Dias da Semana */}
        <div className="grid grid-cols-7 divide-x divide-[#E5E1D8] min-h-[460px]">
          {diasDaSemana.map((d) => {
            const itensDoDia = itensPorDia.get(d.dataStr) || []
            const isHoje = d.dataStr === hojeStr

            return (
              <div
                key={d.dataStr}
                className={`p-2 space-y-2 flex flex-col justify-between ${
                  isHoje ? 'bg-[#0F766E]/5' : 'bg-white'
                }`}
              >
                <div className="space-y-1.5 overflow-y-auto max-h-[500px]">
                  {itensDoDia.map((item) => {
                    const cor = getCorPorTipo(item.tipo, item.status, item.cor)
                    const horaFormatada =
                      !item.diaInteiro && item.dataHora.includes('T')
                        ? item.dataHora.split('T')[1].slice(0, 5)
                        : null

                    return (
                      <div
                        key={item.id}
                        onClick={() => {
                          setItemSelecionado(item)
                          setModalDetalheOpen(true)
                        }}
                        style={{ borderLeftColor: cor }}
                        className="p-2 rounded-lg bg-white border border-[#E5E1D8] border-l-3 text-[#1A1D21] cursor-pointer hover:shadow-xs transition-shadow"
                      >
                        <div className="flex items-center justify-between gap-1 text-[10px] text-[#5B6470] mb-0.5">
                          <span className="font-semibold uppercase text-[9px] text-[#0F766E]">
                            {item.tipo === 'projeto_inicio'
                              ? 'Início do Projeto'
                              : item.tipo === 'projeto_fim'
                                ? 'Fim do Projeto'
                                : item.tipo === 'projeto_fase'
                                  ? 'Fase do Projeto'
                                  : item.tipo}
                          </span>
                          {horaFormatada && <span>{horaFormatada}</span>}
                        </div>
                        <div className="text-xs font-semibold line-clamp-2 leading-tight">
                          {item.titulo}
                        </div>
                        {item.projetoNome && (
                          <div className="text-[10px] text-[#5B6470] truncate mt-1 flex items-center gap-1">
                            <Building2 className="w-2.5 h-2.5" />
                            <span>{item.projetoNome}</span>
                          </div>
                        )}
                      </div>
                    )
                  })}

                  {itensDoDia.length === 0 && (
                    <div className="text-center py-8 text-[11px] text-zinc-400">
                      Nenhum agendamento
                    </div>
                  )}
                </div>

                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleAbrirCriarEvento(d.dataStr)}
                  className="w-full text-xs h-7 text-[#0F766E] hover:bg-[#E5E1D8]/40 border border-dashed border-[#E5E1D8] mt-2"
                >
                  <Plus className="w-3 h-3 mr-1" />
                  <span>Novo</span>
                </Button>
              </div>
            )
          })}
        </div>
      </div>
    )
  }

  // =========================================================================
  // RENDER: VISÃO LISTA (AGENDA)
  // =========================================================================
  const renderVisaoLista = () => {
    // Agrupa todos os itens filtrados por data em ordem cronológica
    const diasOrdenados = Array.from(itensPorDia.keys()).sort()

    return (
      <div className="bg-white rounded-xl border border-[#E5E1D8] shadow-xs p-4 space-y-6">
        {diasOrdenados.length === 0 ? (
          <div className="text-center py-12 text-sm text-[#5B6470]">
            <CalendarX2 className="w-10 h-10 mx-auto text-zinc-300 mb-2" />
            <p className="font-medium text-[#1A1D21]">
              Nenhum item agendado neste filtro ou período.
            </p>
            <p className="text-xs text-[#5B6470] mt-1">
              Crie um novo evento ou ajuste os filtros no topo.
            </p>
            <Button
              onClick={() => handleAbrirCriarEvento()}
              className="mt-4 bg-[#0F766E] hover:bg-[#0D5C56] text-white text-xs"
            >
              <Plus className="w-3.5 h-3.5 mr-1.5" />
              Criar Novo Evento
            </Button>
          </div>
        ) : (
          diasOrdenados.map((diaStr) => {
            const itens = itensPorDia.get(diaStr) || []
            const parts = diaStr.split('-')
            const dataObj = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]))
            const isHoje = diaStr === hojeStr
            const isPassado = diaStr < hojeStr

            return (
              <div key={diaStr} className="space-y-2">
                {/* Linha separadora do dia */}
                <div className="flex items-center gap-2 border-b border-[#E5E1D8] pb-1.5">
                  <span
                    className={`text-xs font-bold uppercase tracking-wide px-2 py-0.5 rounded ${
                      isHoje
                        ? 'bg-[#0F766E] text-white'
                        : isPassado
                          ? 'bg-[#E5E1D8] text-[#5B6470]'
                          : 'bg-[#1A1D21] text-white'
                    }`}
                  >
                    {isHoje ? 'Hoje' : dataObj.toLocaleDateString('pt-BR', { weekday: 'short' })}
                  </span>
                  <span className="text-xs font-bold text-[#1A1D21]">
                    {dataObj.toLocaleDateString('pt-BR', {
                      day: '2-digit',
                      month: 'long',
                      year: 'numeric',
                    })}
                  </span>
                  <span className="text-[11px] text-[#5B6470]">({itens.length} itens)</span>
                </div>

                {/* Lista de cards do dia */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  {itens.map((item) => {
                    const cor = getCorPorTipo(item.tipo, item.status, item.cor)
                    const horaFormatada =
                      !item.diaInteiro && item.dataHora.includes('T')
                        ? item.dataHora.split('T')[1].slice(0, 5)
                        : null

                    return (
                      <div
                        key={item.id}
                        onClick={() => {
                          setItemSelecionado(item)
                          setModalDetalheOpen(true)
                        }}
                        style={{ borderLeftColor: cor }}
                        className="p-3 rounded-lg border border-[#E5E1D8] border-l-4 bg-white hover:bg-[#FAFAF9] transition-all cursor-pointer flex flex-col justify-between gap-2 shadow-2xs"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <div className="flex items-center gap-1.5 mb-1">
                              <Badge
                                variant="outline"
                                className="text-[10px] uppercase font-bold px-1.5 py-0 border-none bg-[#E5E1D8]/60 text-[#1A1D21]"
                              >
                                {item.tipo === 'projeto_inicio'
                                  ? 'Início do Projeto'
                                  : item.tipo === 'projeto_fim'
                                    ? 'Fim do Projeto'
                                    : item.tipo === 'projeto_fase'
                                      ? 'Fase do Projeto'
                                      : item.tipo}
                              </Badge>
                              {item.status && (
                                <Badge
                                  variant="secondary"
                                  className={`text-[9px] uppercase px-1.5 py-0 ${
                                    item.status === 'concluido' || item.status === 'processado'
                                      ? 'bg-emerald-100 text-emerald-800'
                                      : 'bg-zinc-100 text-zinc-700'
                                  }`}
                                >
                                  {item.status}
                                </Badge>
                              )}
                              {horaFormatada && (
                                <span className="text-[10px] text-[#5B6470] flex items-center gap-1 font-medium">
                                  <Clock className="w-3 h-3" />
                                  {horaFormatada}
                                </span>
                              )}
                            </div>
                            <h4 className="text-xs font-bold text-[#1A1D21] leading-snug">
                              {item.titulo}
                            </h4>
                          </div>
                        </div>

                        {item.descricao && (
                          <p className="text-[11px] text-[#5B6470] line-clamp-2">
                            {item.descricao}
                          </p>
                        )}

                        <div className="flex items-center justify-between text-[10px] text-[#5B6470] pt-1 border-t border-[#E5E1D8]/50">
                          {item.projetoNome ? (
                            <span className="truncate flex items-center gap-1">
                              <Building2 className="w-3 h-3" />
                              {item.projetoNome}
                            </span>
                          ) : (
                            <span />
                          )}
                          {item.responsavelNome && (
                            <span className="flex items-center gap-1 shrink-0">
                              <User className="w-3 h-3" />
                              {item.responsavelNome}
                            </span>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )
          })
        )}
      </div>
    )
  }

  return (
    <div className="space-y-4 max-w-7xl mx-auto">
      {/* ======================================================== */}
      {/* 1. CABEÇALHO DO CALENDÁRIO COM CONTADORES E CONTROLES    */}
      {/* ======================================================== */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-xl border border-[#E5E1D8] shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-lg font-bold text-[#1A1D21] tracking-tight">
              Calendário Integrado
            </h1>
            <Badge
              variant="outline"
              className="text-[10px] bg-[#0F766E]/10 text-[#0F766E] border-[#0F766E]/20 font-semibold"
            >
              Agenda IA Diamond
            </Badge>
          </div>
          <p className="text-xs text-[#5B6470] mt-0.5">
            Acompanhe datas, prazos, marcos de projetos e atividades em um só lugar.
          </p>
        </div>

        {/* Botão de Criação de Evento */}
        <div className="flex items-center gap-2">
          <Button
            onClick={() => handleAbrirCriarEvento()}
            className="bg-[#0F766E] hover:bg-[#0D5C56] text-white text-xs h-9 px-3.5 gap-1.5 font-medium shadow-sm"
          >
            <Plus className="w-4 h-4" />
            <span>Novo Evento</span>
          </Button>
        </div>
      </div>

      {/* Contadores Rápidos do Período */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-white p-3 rounded-xl border border-[#E5E1D8] shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[10px] uppercase font-bold text-[#5B6470] tracking-wider">
              Total no Filtro
            </span>
            <div className="text-lg font-extrabold text-[#1A1D21]">{statsGerais.total}</div>
          </div>
          <div className="w-8 h-8 rounded-lg bg-zinc-100 flex items-center justify-center text-zinc-600">
            <CalendarIcon className="w-4 h-4" />
          </div>
        </div>

        <div className="bg-white p-3 rounded-xl border border-[#E5E1D8] shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[10px] uppercase font-bold text-[#0F766E] tracking-wider">
              Para Hoje
            </span>
            <div className="text-lg font-extrabold text-[#0F766E]">{statsGerais.hojeTotal}</div>
          </div>
          <div className="w-8 h-8 rounded-lg bg-[#0F766E]/10 flex items-center justify-center text-[#0F766E]">
            <Clock className="w-4 h-4" />
          </div>
        </div>

        <div className="bg-white p-3 rounded-xl border border-[#E5E1D8] shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[10px] uppercase font-bold text-red-600 tracking-wider">
              Prazos Atrasados
            </span>
            <div className="text-lg font-extrabold text-red-600">{statsGerais.atrasados}</div>
          </div>
          <div className="w-8 h-8 rounded-lg bg-red-50 flex items-center justify-center text-red-600">
            <AlertCircle className="w-4 h-4" />
          </div>
        </div>

        <div className="bg-white p-3 rounded-xl border border-[#E5E1D8] shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[10px] uppercase font-bold text-emerald-600 tracking-wider">
              Concluídos
            </span>
            <div className="text-lg font-extrabold text-emerald-600">{statsGerais.concluidos}</div>
          </div>
          <div className="w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center text-emerald-600">
            <CheckCircle2 className="w-4 h-4" />
          </div>
        </div>
      </div>

      {/* ======================================================== */}
      {/* 2. BARRA DE CONTROLE: NAVEGAÇÃO DE DATA + ABAS DE VISÃO */}
      {/* ======================================================== */}
      <div className="bg-white p-3 rounded-xl border border-[#E5E1D8] shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-3">
        {/* Navegação de Mês/Semana */}
        <div className="flex items-center gap-2">
          <div className="flex items-center bg-[#FAFAF9] border border-[#E5E1D8] rounded-lg p-0.5">
            <Button
              variant="ghost"
              size="sm"
              onClick={handlePeriodoAnterior}
              className="h-7 w-7 p-0 text-[#5B6470] hover:text-[#1A1D21]"
              title="Período anterior"
            >
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleIrHoje}
              className="h-7 px-2.5 text-xs font-semibold text-[#0F766E] hover:bg-white"
            >
              Hoje
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={handlePeriodoSeguinte}
              className="h-7 w-7 p-0 text-[#5B6470] hover:text-[#1A1D21]"
              title="Próximo período"
            >
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>

          <h2 className="text-sm md:text-base font-bold text-[#1A1D21] capitalize px-1">
            {tituloPeriodo}
          </h2>
        </div>

        {/* Filtros e Alternância de Visão */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Busca textual */}
          <div className="relative w-full sm:w-48">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-[#5B6470]" />
            <Input
              value={buscaTexto}
              onChange={(e) => setBuscaTexto(e.target.value)}
              placeholder="Buscar no calendário..."
              className="pl-8 text-xs h-8 bg-white border-[#E5E1D8]"
            />
          </div>

          {/* Filtro por Projeto */}
          <Select value={filtroProjeto} onValueChange={setFiltroProjeto}>
            <SelectTrigger className="w-[140px] text-xs h-8 border-[#E5E1D8] bg-white">
              <SelectValue placeholder="Projeto" />
            </SelectTrigger>
            <SelectContent className="text-xs">
              <SelectItem value="todos">Todos Projetos</SelectItem>
              {projetos.map((p) => (
                <SelectItem key={p.id} value={p.id}>
                  {p.nome}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Alternância de Visão (Mês / Semana / Lista) */}
          <div className="flex items-center bg-[#FAFAF9] border border-[#E5E1D8] rounded-lg p-0.5">
            <button
              type="button"
              onClick={() => setVisao('mes')}
              className={`flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded-md transition-all ${
                visao === 'mes'
                  ? 'bg-[#1A1D21] text-white shadow-2xs'
                  : 'text-[#5B6470] hover:text-[#1A1D21]'
              }`}
            >
              <CalendarDays className="w-3.5 h-3.5" />
              <span>Mês</span>
            </button>
            <button
              type="button"
              onClick={() => setVisao('semana')}
              className={`flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded-md transition-all ${
                visao === 'semana'
                  ? 'bg-[#1A1D21] text-white shadow-2xs'
                  : 'text-[#5B6470] hover:text-[#1A1D21]'
              }`}
            >
              <CalendarRange className="w-3.5 h-3.5" />
              <span>Semana</span>
            </button>
            <button
              type="button"
              onClick={() => setVisao('lista')}
              className={`flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded-md transition-all ${
                visao === 'lista'
                  ? 'bg-[#1A1D21] text-white shadow-2xs'
                  : 'text-[#5B6470] hover:text-[#1A1D21]'
              }`}
            >
              <ListOrdered className="w-3.5 h-3.5" />
              <span>Lista</span>
            </button>
          </div>
        </div>
      </div>

      {/* ======================================================== */}
      {/* 3. VISÃO RENDERIZADA CONFORME SELEÇÃO (MÊS / SEM / LISTA)*/}
      {/* ======================================================== */}
      {visao === 'mes' && renderVisaoMes()}
      {visao === 'semana' && renderVisaoSemana()}
      {visao === 'lista' && renderVisaoLista()}

      {/* ======================================================== */}
      {/* 4. MODAL: DETALHES DE UM ITEM ESPECÍFICO                 */}
      {/* ======================================================== */}
      <Dialog open={modalDetalheOpen} onOpenChange={setModalDetalheOpen}>
        <DialogContent className="sm:max-w-md bg-white border border-[#E5E1D8]">
          {itemSelecionado && (
            <>
              <DialogHeader>
                <div className="flex items-center gap-2 mb-1">
                  <Badge
                    variant="outline"
                    className="text-[10px] uppercase font-bold px-2 py-0.5 border-none"
                    style={{
                      backgroundColor: `${getCorPorTipo(itemSelecionado.tipo, itemSelecionado.status, itemSelecionado.cor)}15`,
                      color: getCorPorTipo(
                        itemSelecionado.tipo,
                        itemSelecionado.status,
                        itemSelecionado.cor,
                      ),
                    }}
                  >
                    {itemSelecionado.tipo === 'projeto_inicio'
                      ? 'Início do Projeto'
                      : itemSelecionado.tipo === 'projeto_fim'
                        ? 'Fim do Projeto'
                        : itemSelecionado.tipo === 'projeto_fase'
                          ? 'Fase do Projeto'
                          : itemSelecionado.tipo}
                  </Badge>
                  {itemSelecionado.status && (
                    <Badge variant="secondary" className="text-[10px] uppercase">
                      {itemSelecionado.status}
                    </Badge>
                  )}
                </div>
                <DialogTitle className="text-sm font-bold text-[#1A1D21] leading-tight">
                  {itemSelecionado.titulo}
                </DialogTitle>
              </DialogHeader>

              <div className="space-y-3 py-2 text-xs text-[#5B6470]">
                {itemSelecionado.descricao && (
                  <div className="p-2.5 bg-[#FAFAF9] rounded-lg border border-[#E5E1D8] text-[#1A1D21] leading-relaxed">
                    {itemSelecionado.descricao}
                  </div>
                )}

                <div className="grid grid-cols-2 gap-2">
                  <div className="p-2 rounded border border-[#E5E1D8] bg-white">
                    <span className="text-[10px] uppercase font-bold text-[#5B6470] block">
                      Data Agendada
                    </span>
                    <span className="font-semibold text-[#1A1D21]">
                      {itemSelecionado.dataHora.replace('T', ' às ')}
                    </span>
                  </div>

                  {itemSelecionado.faseColunaNome && (
                    <div className="p-2 rounded border border-[#E5E1D8] bg-white">
                      <span className="text-[10px] uppercase font-bold text-[#5B6470] block">
                        Fase no Kanban
                      </span>
                      <span className="font-semibold text-[#0F766E]">
                        {itemSelecionado.faseColunaNome}
                      </span>
                    </div>
                  )}

                  {itemSelecionado.projetoNome && (
                    <div className="p-2 rounded border border-[#E5E1D8] bg-white">
                      <span className="text-[10px] uppercase font-bold text-[#5B6470] block">
                        Projeto
                      </span>
                      <span className="font-semibold text-[#1A1D21]">
                        {itemSelecionado.projetoNome}
                      </span>
                    </div>
                  )}

                  {itemSelecionado.contatoNome && (
                    <div className="p-2 rounded border border-[#E5E1D8] bg-white">
                      <span className="text-[10px] uppercase font-bold text-[#5B6470] block">
                        Contato
                      </span>
                      <span className="font-semibold text-[#1A1D21]">
                        {itemSelecionado.contatoNome}
                      </span>
                    </div>
                  )}
                </div>

                {/* Bloco de Sala de Reunião Online */}
                {(itemSelecionado.linkReuniao ||
                  (itemSelecionado.rawItem as EventoCalendario | undefined)?.link_reuniao) && (
                  <div className="p-3 rounded-lg border border-teal-200 bg-teal-50/60 flex flex-col gap-2 mt-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Video className="w-4 h-4 text-[#0F766E]" />
                        <span className="text-xs font-semibold text-[#0F766E]">
                          Sala de Reunião Online
                        </span>
                      </div>
                      <Badge className="bg-teal-600 text-white hover:bg-teal-600 border-none text-[9px] px-1.5 py-0.5">
                        Jitsi / Vídeo
                      </Badge>
                    </div>

                    <p className="text-[11px] text-[#5B6470] break-all">
                      {itemSelecionado.linkReuniao ||
                        (itemSelecionado.rawItem as EventoCalendario).link_reuniao}
                    </p>

                    <div className="flex items-center gap-2 pt-1 flex-wrap">
                      <Button
                        type="button"
                        size="sm"
                        onClick={() => {
                          const link =
                            itemSelecionado.linkReuniao ||
                            (itemSelecionado.rawItem as EventoCalendario).link_reuniao ||
                            ''
                          setJitsiUrlAtiva(link)
                          setJitsiTituloAtivo(itemSelecionado.titulo)
                          setModalJitsiOpen(true)
                        }}
                        className="bg-[#0F766E] hover:bg-[#0D5C56] text-white text-xs h-8 px-3 font-medium gap-1.5"
                      >
                        <Video className="w-3.5 h-3.5" />
                        Entrar na Reunião
                      </Button>

                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          const link =
                            itemSelecionado.linkReuniao ||
                            (itemSelecionado.rawItem as EventoCalendario).link_reuniao ||
                            ''
                          if (link) window.open(link, '_blank', 'noopener,noreferrer')
                        }}
                        className="text-xs h-8 px-3 border-[#0F766E]/40 text-[#0F766E] hover:bg-teal-50 gap-1.5"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                        Abrir em Nova Aba
                      </Button>
                    </div>
                  </div>
                )}

                {/* Exibição de Transcrição e Resumo se houver */}
                {Boolean(
                  (itemSelecionado.rawItem as EventoCalendario | undefined)?.resumo ||
                  (itemSelecionado.rawItem as EventoCalendario | undefined)?.transcricao,
                ) && (
                  <div className="p-3 rounded-lg border border-[#E5E1D8] bg-[#FAFAF9] space-y-2 text-xs">
                    {(itemSelecionado.rawItem as EventoCalendario).resumo && (
                      <div>
                        <span className="text-[10px] font-bold uppercase text-[#5B6470] block mb-0.5">
                          Resumo da Reunião (IA)
                        </span>
                        <p className="text-[#1A1D21] leading-relaxed">
                          {(itemSelecionado.rawItem as EventoCalendario).resumo}
                        </p>
                      </div>
                    )}
                    {(itemSelecionado.rawItem as EventoCalendario).decisoes && (
                      <div>
                        <span className="text-[10px] font-bold uppercase text-[#5B6470] block mb-0.5">
                          Decisões
                        </span>
                        <p className="text-[#1A1D21] leading-relaxed">
                          {(itemSelecionado.rawItem as EventoCalendario).decisoes}
                        </p>
                      </div>
                    )}
                    {(itemSelecionado.rawItem as EventoCalendario).transcricao && (
                      <details className="cursor-pointer text-[#5B6470]">
                        <summary className="text-[10px] font-bold uppercase text-[#5B6470] hover:text-[#1A1D21]">
                          Ver transcrição completa
                        </summary>
                        <p className="mt-1 text-[11px] text-[#5B6470] whitespace-pre-wrap bg-white p-2 rounded border border-[#E5E1D8]">
                          {(itemSelecionado.rawItem as EventoCalendario).transcricao}
                        </p>
                      </details>
                    )}
                  </div>
                )}
              </div>

              <DialogFooter className="flex items-center justify-between sm:justify-between pt-2 border-t border-[#E5E1D8]">
                {/* Se for evento próprio, permite editar ou excluir */}
                {itemSelecionado.tipo === 'evento' ? (
                  <div className="flex items-center gap-1">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        const ev = itemSelecionado.rawItem as EventoCalendario
                        setFormEvento({
                          id: ev.id,
                          titulo: ev.titulo,
                          descricao: ev.descricao || '',
                          dataInicio: ev.data_inicio ? ev.data_inicio.split('T')[0] : '',
                          horaInicio:
                            ev.data_inicio && ev.data_inicio.includes('T')
                              ? ev.data_inicio.split('T')[1].slice(0, 5)
                              : '09:00',
                          dataFim: ev.data_fim ? ev.data_fim.split('T')[0] : '',
                          horaFim:
                            ev.data_fim && ev.data_fim.includes('T')
                              ? ev.data_fim.split('T')[1].slice(0, 5)
                              : '10:00',
                          diaInteiro: ev.dia_inteiro ?? false,
                          categoria: ev.categoria || 'reuniao',
                          status: ev.status || 'pendente',
                          prioridade: ev.prioridade || 'media',
                          cor: ev.cor || '#0F766E',
                          projetoId: ev.projeto || '',
                          contatoId: ev.contato || '',
                          linkReuniao: ev.link_reuniao || '',
                          lembreteModo: ev.lembrete_modo || 'padrao',
                          lembreteAntecedencias: Array.isArray(ev.lembrete_antecedencias)
                            ? (ev.lembrete_antecedencias as any)
                            : typeof ev.lembrete_antecedencias === 'string'
                              ? JSON.parse(ev.lembrete_antecedencias || '[]')
                              : ['15m', '1h', '1d'],
                        })
                        setModalDetalheOpen(false)
                        setModalNovoEventoOpen(true)
                      }}
                      className="text-xs h-8 text-[#0F766E]"
                    >
                      <Edit2 className="w-3.5 h-3.5 mr-1" />
                      Editar
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        const ev = itemSelecionado.rawItem as EventoCalendario
                        handleExcluirEvento(ev.id)
                      }}
                      className="text-xs h-8 text-red-600 hover:text-red-700 hover:bg-red-50"
                    >
                      <Trash2 className="w-3.5 h-3.5 mr-1" />
                      Excluir
                    </Button>
                  </div>
                ) : (
                  /* Redirecionamento para a página nativa do item */
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      if (itemSelecionado.tipo === 'card') {
                        navigate('/fluxo')
                      } else if (itemSelecionado.tipo === 'folha') {
                        navigate('/folha')
                      } else if (itemSelecionado.tipo === 'demanda') {
                        navigate('/listas')
                      } else if (
                        (itemSelecionado.tipo === 'marco' ||
                          itemSelecionado.tipo === 'projeto_inicio' ||
                          itemSelecionado.tipo === 'projeto_fim' ||
                          itemSelecionado.tipo === 'projeto_fase') &&
                        itemSelecionado.projetoId
                      ) {
                        navigate(`/projetos/${itemSelecionado.projetoId}`)
                      } else {
                        navigate('/projetos')
                      }
                      setModalDetalheOpen(false)
                    }}
                    className="text-xs h-8 text-[#0F766E] border-[#0F766E]/40"
                  >
                    <ExternalLink className="w-3.5 h-3.5 mr-1" />
                    Abrir no Módulo Original
                  </Button>
                )}

                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setModalDetalheOpen(false)}
                  className="text-xs h-8"
                >
                  Fechar
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* ======================================================== */}
      {/* 4.1 MODAL: SALA DE REUNIÃO JITSI EMBUTIDA                */}
      {/* ======================================================== */}
      <Dialog open={modalJitsiOpen} onOpenChange={setModalJitsiOpen}>
        <DialogContent className="max-w-4xl w-[95vw] h-[85vh] bg-zinc-900 border-zinc-800 text-white flex flex-col p-0 overflow-hidden">
          <DialogHeader className="p-3 bg-zinc-950 border-b border-zinc-800 flex flex-row items-center justify-between space-y-0">
            <div className="flex items-center gap-2">
              <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
              <DialogTitle className="text-sm font-semibold text-white">
                {jitsiTituloAtivo || 'Sala de Reunião Online'}
              </DialogTitle>
              <Badge className="bg-teal-700 text-white text-[10px] px-1.5 py-0">Jitsi Meet</Badge>
            </div>

            <div className="flex items-center gap-2 mr-6">
              {jitsiUrlAtiva && (
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  onClick={() => window.open(jitsiUrlAtiva, '_blank', 'noopener,noreferrer')}
                  className="text-xs h-7 text-zinc-300 hover:text-white hover:bg-zinc-800 gap-1"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  Abrir no Navegador
                </Button>
              )}
            </div>
          </DialogHeader>

          <div className="flex-1 w-full h-full bg-zinc-950 relative">
            {jitsiUrlAtiva ? (
              <iframe
                src={jitsiUrlAtiva}
                title="Sala de Reunião Jitsi"
                allow="camera; microphone; fullscreen; display-capture; autoplay"
                className="w-full h-full border-0"
              />
            ) : (
              <div className="flex items-center justify-center h-full text-zinc-400 text-xs">
                Link da reunião não informado.
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* ======================================================== */}
      {/* 5. MODAL: LISTAGEM DE ITENS DE UM DIA ESPECÍFICO         */}
      {/* ======================================================== */}
      <Dialog
        open={modalDiaOpen}
        onOpenChange={(open) => {
          setModalDiaOpen(open)
          if (!open) setFiltroTipoModalDia('todos')
        }}
      >
        <DialogContent className="sm:max-w-md bg-white border border-[#E5E1D8]">
          <DialogHeader>
            <DialogTitle className="text-sm font-bold text-[#1A1D21]">
              Atividades de {diaVisualizado}
            </DialogTitle>
          </DialogHeader>

          {/* Abas de filtro rápido por tipo de atividade dentro do dia */}
          {(() => {
            const todosItensDia = itensPorDia.get(diaVisualizado) || []
            const tiposPresentes: TipoAtividadeGrade[] = (
              [
                'evento',
                'reuniao',
                'demanda',
                'folha',
                'card',
                'marco',
                'projeto_fase',
                'projeto_inicio',
                'projeto_fim',
              ] as TipoAtividadeGrade[]
            ).filter((t) => todosItensDia.some((item) => getTipoAtividadeGrade(item) === t))

            if (tiposPresentes.length <= 1) return null

            return (
              <div className="flex flex-wrap items-center gap-1 pb-2 border-b border-[#E5E1D8]">
                <button
                  type="button"
                  onClick={() => setFiltroTipoModalDia('todos')}
                  className={`px-2 py-0.5 rounded text-[11px] font-semibold transition-colors ${
                    filtroTipoModalDia === 'todos'
                      ? 'bg-[#1A1D21] text-white'
                      : 'bg-[#F4F2EE] text-[#5B6470] hover:text-[#1A1D21]'
                  }`}
                >
                  Todos ({todosItensDia.length})
                </button>
                {tiposPresentes.map((tipo) => {
                  const cfg = TIPOS_ATIVIDADE_CONFIG[tipo]
                  const Icone = cfg.icone
                  const count = todosItensDia.filter(
                    (i) => getTipoAtividadeGrade(i) === tipo,
                  ).length
                  const ativo = filtroTipoModalDia === tipo

                  return (
                    <button
                      key={tipo}
                      type="button"
                      onClick={() => setFiltroTipoModalDia(tipo)}
                      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold transition-colors ${
                        ativo
                          ? 'bg-[#0F766E] text-white shadow-2xs'
                          : 'bg-[#F4F2EE] text-[#5B6470] hover:text-[#1A1D21]'
                      }`}
                    >
                      <Icone className="w-3 h-3" />
                      <span className="capitalize">{tipo}</span>
                      <span className="text-[10px] opacity-80">({count})</span>
                    </button>
                  )
                })}
              </div>
            )
          })()}

          <div className="space-y-2 max-h-[350px] overflow-y-auto py-2">
            {(() => {
              const itensDoDia = itensPorDia.get(diaVisualizado) || []
              const itensExibidos =
                filtroTipoModalDia === 'todos'
                  ? itensDoDia
                  : itensDoDia.filter((i) => getTipoAtividadeGrade(i) === filtroTipoModalDia)

              if (itensExibidos.length === 0) {
                return (
                  <div className="text-center py-6 text-xs text-[#5B6470]">
                    {filtroTipoModalDia !== 'todos'
                      ? 'Nenhuma atividade deste tipo encontrada para este dia.'
                      : 'Nenhuma atividade cadastrada para este dia.'}
                  </div>
                )
              }

              return itensExibidos.map((item) => {
                const cor = getCorPorTipo(item.tipo, item.status, item.cor)
                const horaFormatada =
                  !item.diaInteiro && item.dataHora.includes('T')
                    ? item.dataHora.split('T')[1].slice(0, 5)
                    : null
                const tipoGrade = getTipoAtividadeGrade(item)
                const configGrade = TIPOS_ATIVIDADE_CONFIG[tipoGrade]
                const IconeItem = configGrade.icone

                return (
                  <div
                    key={item.id}
                    onClick={() => {
                      setItemSelecionado(item)
                      setModalDiaOpen(false)
                      setModalDetalheOpen(true)
                    }}
                    style={{ borderLeftColor: cor }}
                    className="p-2 rounded bg-white border border-[#E5E1D8] border-l-3 hover:bg-[#FAFAF9] cursor-pointer"
                  >
                    <div className="flex items-center justify-between text-[10px] text-[#5B6470]">
                      <span className="uppercase font-bold text-[#0F766E] flex items-center gap-1">
                        <IconeItem className="w-3 h-3" />
                        {tipoGrade === 'reuniao'
                          ? 'Reunião'
                          : tipoGrade === 'projeto_inicio'
                            ? 'Início do Projeto'
                            : tipoGrade === 'projeto_fim'
                              ? 'Fim do Projeto'
                              : tipoGrade === 'projeto_fase'
                                ? 'Fase do Projeto'
                                : item.tipo}
                      </span>
                      {horaFormatada && <span>{horaFormatada}</span>}
                    </div>
                    <div className="text-xs font-semibold text-[#1A1D21] mt-0.5">{item.titulo}</div>
                    {item.projetoNome && (
                      <div className="text-[10px] text-[#5B6470] mt-1">{item.projetoNome}</div>
                    )}
                  </div>
                )
              })
            })()}
          </div>

          <DialogFooter className="flex justify-between sm:justify-between pt-2 border-t border-[#E5E1D8]">
            <Button
              type="button"
              size="sm"
              onClick={() => {
                setModalDiaOpen(false)
                handleAbrirCriarEvento(diaVisualizado)
              }}
              className="bg-[#0F766E] hover:bg-[#0D5C56] text-white text-xs h-8"
            >
              <Plus className="w-3.5 h-3.5 mr-1" />
              Adicionar neste dia
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => {
                setModalDiaOpen(false)
                setFiltroTipoModalDia('todos')
              }}
              className="text-xs h-8"
            >
              Fechar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ======================================================== */}
      {/* 6. MODAL: NOVO / EDITAR EVENTO PRÓPRIO DO CALENDÁRIO     */}
      {/* ======================================================== */}
      <Dialog open={modalNovoEventoOpen} onOpenChange={setModalNovoEventoOpen}>
        <DialogContent className="sm:max-w-lg bg-white border border-[#E5E1D8]">
          <DialogHeader>
            <DialogTitle className="text-sm font-bold text-[#1A1D21]">
              {formEvento.id ? 'Editar Evento do Calendário' : 'Novo Evento no Calendário'}
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSalvarEvento} className="space-y-3 pt-1">
            {/* Título */}
            <div className="space-y-1">
              <label className="text-xs font-semibold text-[#1A1D21]">Título do Evento *</label>
              <Input
                required
                value={formEvento.titulo}
                onChange={(e) => setFormEvento({ ...formEvento, titulo: e.target.value })}
                placeholder="Ex: Reunião de Alinhamento com Cliente, Fechamento de Sprint..."
                className="text-xs border-[#E5E1D8]"
              />
            </div>

            {/* Descrição */}
            <div className="space-y-1">
              <label className="text-xs font-semibold text-[#1A1D21]">Descrição / Pauta</label>
              <Textarea
                rows={2}
                value={formEvento.descricao}
                onChange={(e) => setFormEvento({ ...formEvento, descricao: e.target.value })}
                placeholder="Detalhes, pauta ou anotações..."
                className="text-xs border-[#E5E1D8]"
              />
            </div>

            {/* Link da Reunião (Jitsi ou custom) */}
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-[#1A1D21] flex items-center gap-1.5">
                  <Video className="w-3.5 h-3.5 text-[#0F766E]" />
                  Link da Reunião Online (Jitsi / Meet / Zoom)
                </label>
                <button
                  type="button"
                  onClick={() =>
                    setFormEvento({
                      ...formEvento,
                      linkReuniao: `https://meet.jit.si/diamond-${Date.now()}`,
                    })
                  }
                  className="text-[10px] text-[#0F766E] hover:underline font-medium"
                >
                  Gerar sala Jitsi gratuita
                </button>
              </div>
              <Input
                value={formEvento.linkReuniao || ''}
                onChange={(e) => setFormEvento({ ...formEvento, linkReuniao: e.target.value })}
                placeholder="https://meet.jit.si/... ou https://meet.google.com/..."
                className="text-xs border-[#E5E1D8]"
              />
            </div>

            {/* Dia Inteiro Toggle */}
            <div className="flex items-center gap-2 pt-1">
              <input
                type="checkbox"
                id="diaInteiroCheckbox"
                checked={formEvento.diaInteiro}
                onChange={(e) => setFormEvento({ ...formEvento, diaInteiro: e.target.checked })}
                className="rounded border-[#E5E1D8] text-[#0F766E] focus:ring-[#0F766E]"
              />
              <label htmlFor="diaInteiroCheckbox" className="text-xs text-[#1A1D21] cursor-pointer">
                Evento de dia inteiro (sem horário fixo)
              </label>
            </div>

            {/* Data e Hora de Início e Fim */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-[#1A1D21]">Data de Início *</label>
                <div className="flex items-center gap-1">
                  <Input
                    type="date"
                    required
                    value={formEvento.dataInicio}
                    onChange={(e) => setFormEvento({ ...formEvento, dataInicio: e.target.value })}
                    className="text-xs border-[#E5E1D8]"
                  />
                  {!formEvento.diaInteiro && (
                    <Input
                      type="time"
                      value={formEvento.horaInicio}
                      onChange={(e) => setFormEvento({ ...formEvento, horaInicio: e.target.value })}
                      className="text-xs border-[#E5E1D8] w-24"
                    />
                  )}
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-[#1A1D21]">Data de Término</label>
                <div className="flex items-center gap-1">
                  <Input
                    type="date"
                    value={formEvento.dataFim}
                    onChange={(e) => setFormEvento({ ...formEvento, dataFim: e.target.value })}
                    className="text-xs border-[#E5E1D8]"
                  />
                  {!formEvento.diaInteiro && (
                    <Input
                      type="time"
                      value={formEvento.horaFim}
                      onChange={(e) => setFormEvento({ ...formEvento, horaFim: e.target.value })}
                      className="text-xs border-[#E5E1D8] w-24"
                    />
                  )}
                </div>
              </div>
            </div>

            {/* Categoria, Status, Prioridade e Cor */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-[#1A1D21]">Categoria</label>
                <Select
                  value={formEvento.categoria}
                  onValueChange={(val: EventoCalendarioCategoria) =>
                    setFormEvento({ ...formEvento, categoria: val })
                  }
                >
                  <SelectTrigger className="text-xs border-[#E5E1D8] h-8 bg-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="text-xs">
                    <SelectItem value="reuniao">Reunião</SelectItem>
                    <SelectItem value="prazo">Prazo</SelectItem>
                    <SelectItem value="etapa">Etapa</SelectItem>
                    <SelectItem value="atividade">Atividade</SelectItem>
                    <SelectItem value="alinhamento">Alinhamento</SelectItem>
                    <SelectItem value="outro">Outro</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-[#1A1D21]">Status</label>
                <Select
                  value={formEvento.status}
                  onValueChange={(val: EventoCalendarioStatus) =>
                    setFormEvento({ ...formEvento, status: val })
                  }
                >
                  <SelectTrigger className="text-xs border-[#E5E1D8] h-8 bg-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="text-xs">
                    <SelectItem value="pendente">Pendente</SelectItem>
                    <SelectItem value="em_andamento">Em Andamento</SelectItem>
                    <SelectItem value="concluido">Concluído</SelectItem>
                    <SelectItem value="cancelado">Cancelado</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-[#1A1D21]">Prioridade</label>
                <Select
                  value={formEvento.prioridade}
                  onValueChange={(val: CardPrioridade) =>
                    setFormEvento({ ...formEvento, prioridade: val })
                  }
                >
                  <SelectTrigger className="text-xs border-[#E5E1D8] h-8 bg-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="text-xs">
                    <SelectItem value="baixa">Baixa</SelectItem>
                    <SelectItem value="media">Média</SelectItem>
                    <SelectItem value="alta">Alta</SelectItem>
                    <SelectItem value="urgente">Urgente</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-[#1A1D21]">Cor de Destaque</label>
                <div className="flex items-center gap-1.5 h-8">
                  {['#0F766E', '#2563EB', '#7C3AED', '#D97706', '#E11D48', '#16A34A'].map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setFormEvento({ ...formEvento, cor: c })}
                      style={{ backgroundColor: c }}
                      className={`w-5 h-5 rounded-full transition-transform ${
                        formEvento.cor === c ? 'scale-125 ring-2 ring-offset-1 ring-zinc-800' : ''
                      }`}
                    />
                  ))}
                </div>
              </div>
            </div>

            {/* Bloco de Lembretes & Avisos Automáticos */}
            <div className="p-2.5 rounded-lg border border-[#0F766E]/30 bg-[#0F766E]/5 space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-[#0F766E] flex items-center gap-1.5">
                  <Bell className="w-3.5 h-3.5" />
                  Lembrete Automático deste Evento
                </label>
                <div className="flex items-center gap-1">
                  {(['padrao', 'personalizado', 'desativado'] as const).map((modo) => (
                    <button
                      key={modo}
                      type="button"
                      onClick={() => setFormEvento({ ...formEvento, lembreteModo: modo })}
                      className={`text-[10px] px-2 py-0.5 rounded font-semibold transition-colors ${
                        (formEvento.lembreteModo || 'padrao') === modo
                          ? 'bg-[#0F766E] text-white shadow-2xs'
                          : 'bg-white text-[#5B6470] border border-[#E5E1D8]'
                      }`}
                    >
                      {modo === 'padrao'
                        ? 'Padrão Geral'
                        : modo === 'personalizado'
                          ? 'Personalizar'
                          : 'Desativar'}
                    </button>
                  ))}
                </div>
              </div>

              {formEvento.lembreteModo === 'personalizado' && (
                <div className="pt-1.5 border-t border-[#0F766E]/20 space-y-1">
                  <span className="text-[11px] text-[#5B6470] block">
                    Escolha quando disparar aviso no sino e por e-mail:
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {[
                      { c: '15m', l: '15 min' },
                      { c: '30m', l: '30 min' },
                      { c: '1h', l: '1 hora' },
                      { c: '2h', l: '2 horas' },
                      { c: '1d', l: '1 dia' },
                      { c: '1w', l: '1 sem' },
                    ].map((opt) => {
                      const optCode = opt.c as import('@/types').LembreteAntecedenciaCodigo
                      const ativo = (formEvento.lembreteAntecedencias || []).includes(optCode)
                      return (
                        <button
                          key={opt.c}
                          type="button"
                          onClick={() => {
                            const cur = formEvento.lembreteAntecedencias || []
                            const novo = ativo
                              ? cur.filter((x) => x !== optCode)
                              : [...cur, optCode]
                            setFormEvento({ ...formEvento, lembreteAntecedencias: novo })
                          }}
                          className={`text-[10px] px-2 py-1 rounded-md border font-medium transition-colors ${
                            ativo
                              ? 'bg-[#0F766E] border-[#0F766E] text-white font-bold'
                              : 'bg-white border-[#E5E1D8] text-[#5B6470] hover:bg-[#FAFAF9]'
                          }`}
                        >
                          {opt.l}
                        </button>
                      )
                    })}
                  </div>
                </div>
              )}

              {formEvento.lembreteModo !== 'personalizado' && (
                <p className="text-[10px] text-[#5B6470]">
                  {formEvento.lembreteModo === 'desativado'
                    ? 'Nenhum lembrete será disparado para este evento.'
                    : 'Usa a antecedência configurada em Configurações > Lembretes (ex: 15m, 1h, 1d).'}
                </p>
              )}
            </div>

            {/* Vínculos Opcionais: Projeto e Contato */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1 border-t border-[#E5E1D8]/60">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-[#1A1D21]">Vincular a Projeto</label>
                <Select
                  value={formEvento.projetoId || 'none'}
                  onValueChange={(val) =>
                    setFormEvento({ ...formEvento, projetoId: val === 'none' ? '' : val })
                  }
                >
                  <SelectTrigger className="text-xs border-[#E5E1D8] h-8 bg-white">
                    <SelectValue placeholder="Nenhum vínculo" />
                  </SelectTrigger>
                  <SelectContent className="text-xs">
                    <SelectItem value="none">Nenhum vínculo</SelectItem>
                    {projetos.map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.nome}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-[#1A1D21]">Vincular a Contato</label>
                <Select
                  value={formEvento.contatoId || 'none'}
                  onValueChange={(val) =>
                    setFormEvento({ ...formEvento, contatoId: val === 'none' ? '' : val })
                  }
                >
                  <SelectTrigger className="text-xs border-[#E5E1D8] h-8 bg-white">
                    <SelectValue placeholder="Nenhum vínculo" />
                  </SelectTrigger>
                  <SelectContent className="text-xs">
                    <SelectItem value="none">Nenhum vínculo</SelectItem>
                    {contatos.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.nome}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <DialogFooter className="pt-3 border-t border-[#E5E1D8]">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setModalNovoEventoOpen(false)}
                className="text-xs"
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={salvandoEvento}
                size="sm"
                className="bg-[#0F766E] hover:bg-[#0D5C56] text-white text-xs font-medium"
              >
                {salvandoEvento
                  ? 'Salvando...'
                  : formEvento.id
                    ? 'Salvar Alterações'
                    : 'Criar Evento'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
