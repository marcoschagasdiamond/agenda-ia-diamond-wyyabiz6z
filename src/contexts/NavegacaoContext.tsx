import React, { createContext, useContext, useState, useEffect } from 'react'
import { diamondApi } from '@/services/diamondApi'
import type {
  CategoriaFluxo,
  FluxoKanban,
  ColunaFluxo,
  Card as CardType,
  Projeto,
  Contato,
  Pasta,
  Arquivo,
  Cliente,
  Lista,
  Demanda,
  FolhaDia,
  MarcoTimeline,
  EventoCalendario,
  MembroEquipe,
  ConviteEquipe,
  EscopoTipo,
} from '@/types'
import type { AlvoConversa } from '@/components/chat/tiposChat'

export interface FluxoComContagem extends FluxoKanban {
  cardCount: number
  fasesCount: number
}

export interface CategoriaComFluxos extends CategoriaFluxo {
  fluxos: FluxoComContagem[]
  cardCount: number
}

interface NavegacaoContextData {
  // Estado de Fluxo Kanban
  categoriaAtivaId: string
  setCategoriaAtivaId: (id: string) => void
  fluxoAtivoId: string
  setFluxoAtivoId: (id: string) => void
  fluxoAtivoChave: string
  setFluxoAtivoChave: (chave: string) => void
  categorias: CategoriaFluxo[]
  fluxos: FluxoKanban[]
  colunas: ColunaFluxo[]
  cards: CardType[]
  categoriasComFluxos: CategoriaComFluxos[]
  categoriasExpandidas: Record<string, boolean>
  toggleCategoriaExpandida: (catId: string) => void
  recarregarFluxo: () => Promise<void>

  // Modais de Fluxo disparáveis a partir do menu / botão Adicionar
  modalNovaCategoriaOpen: boolean
  setModalNovaCategoriaOpen: (open: boolean) => void
  modalNovoFluxoOpen: boolean
  setModalNovoFluxoOpen: (open: boolean) => void
  modalNovoFluxoCatId: string | undefined
  setModalNovoFluxoCatId: (catId: string | undefined) => void
  modalNovoCardOpen: boolean
  setModalNovoCardOpen: (open: boolean) => void
  modalNovoCardChave: string | undefined
  setModalNovoCardChave: (chave: string | undefined) => void
  modalNovaFamiliaOpen: boolean
  setModalNovaFamiliaOpen: (open: boolean) => void
  modalNovaFamiliaColunaId: string | undefined
  setModalNovaFamiliaColunaId: (colunaId: string | undefined) => void

  // Dados globais para as outras colunas contextuais
  projetos: Projeto[]
  contatos: Contato[]
  pastas: Pasta[]
  arquivos: Arquivo[]
  clientes: Cliente[]
  listas: Lista[]
  demandas: Demanda[]
  folhaItems: FolhaDia[]
  marcosTimeline: MarcoTimeline[]
  eventosCalendario: EventoCalendario[]
  dataSelecionadaCalendario: string
  setDataSelecionadaCalendario: (data: string) => void
  filtroTipoCalendario: string
  setFiltroTipoCalendario: (tipo: string) => void
  membrosEquipe: MembroEquipe[]
  convitesEquipe: ConviteEquipe[]
  modalConvidarEquipeOpen: boolean
  setModalConvidarEquipeOpen: (open: boolean) => void
  modalConvidarEscopoPadrao?: {
    tipo: EscopoTipo
    id?: string
    nome?: string
  }
  setModalConvidarEscopoPadrao: (escopo?: { tipo: EscopoTipo; id?: string; nome?: string }) => void
  recarregarDadosGlobais: () => Promise<void>

  // Controle de visibilidade da 2ª coluna
  colunaSecundariaAberta: boolean
  setColunaSecundariaAberta: (aberta: boolean) => void
  toggleColunaSecundaria: () => void

  // Conversa aberta do Chat interno (compartilhada entre a coluna contextual e o /chat)
  chatAlvo: AlvoConversa | null
  setChatAlvo: (alvo: AlvoConversa | null) => void
}

const NavegacaoContext = createContext<NavegacaoContextData | undefined>(undefined)

export const NavegacaoProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Fluxos
  const [categoriaAtivaId, setCategoriaAtivaId] = useState<string>('all')
  const [fluxoAtivoId, setFluxoAtivoId] = useState<string>('all')
  const [fluxoAtivoChave, setFluxoAtivoChave] = useState<string>('all')
  const [categorias, setCategorias] = useState<CategoriaFluxo[]>([])
  const [fluxos, setFluxos] = useState<FluxoKanban[]>([])
  const [colunas, setColunas] = useState<ColunaFluxo[]>([])
  const [cards, setCards] = useState<CardType[]>([])
  const [categoriasExpandidas, setCategoriasExpandidas] = useState<Record<string, boolean>>({})

  // Modais de ação rápida do Kanban
  const [modalNovaCategoriaOpen, setModalNovaCategoriaOpen] = useState(false)
  const [modalNovoFluxoOpen, setModalNovoFluxoOpen] = useState(false)
  const [modalNovoFluxoCatId, setModalNovoFluxoCatId] = useState<string | undefined>(undefined)
  const [modalNovoCardOpen, setModalNovoCardOpen] = useState(false)
  const [modalNovoCardChave, setModalNovoCardChave] = useState<string | undefined>(undefined)
  const [modalNovaFamiliaOpen, setModalNovaFamiliaOpen] = useState(false)
  const [modalNovaFamiliaColunaId, setModalNovaFamiliaColunaId] = useState<string | undefined>(
    undefined,
  )

  // Dados para outras segundas colunas
  const [projetos, setProjetos] = useState<Projeto[]>([])
  const [contatos, setContatos] = useState<Contato[]>([])
  const [pastas, setPastas] = useState<Pasta[]>([])
  const [arquivos, setArquivos] = useState<Arquivo[]>([])
  const [clientes, setClientes] = useState<Cliente[]>([])
  const [listas, setListas] = useState<Lista[]>([])
  const [demandas, setDemandas] = useState<Demanda[]>([])
  const [folhaItems, setFolhaItems] = useState<FolhaDia[]>([])
  const [marcosTimeline, setMarcosTimeline] = useState<MarcoTimeline[]>([])
  const [eventosCalendario, setEventosCalendario] = useState<EventoCalendario[]>([])
  const [membrosEquipe, setMembrosEquipe] = useState<MembroEquipe[]>([])
  const [convitesEquipe, setConvitesEquipe] = useState<ConviteEquipe[]>([])

  // Modal global reutilizável de convite de equipe
  const [modalConvidarEquipeOpen, setModalConvidarEquipeOpen] = useState(false)
  const [modalConvidarEscopoPadrao, setModalConvidarEscopoPadrao] = useState<
    { tipo: EscopoTipo; id?: string; nome?: string } | undefined
  >(undefined)

  // Estado compartilhado de navegação do calendário
  const [dataSelecionadaCalendario, setDataSelecionadaCalendario] = useState<string>(() => {
    const hoje = new Date()
    return hoje.toISOString().split('T')[0]
  })
  const [filtroTipoCalendario, setFiltroTipoCalendario] = useState<string>('todos')

  // Visibilidade da coluna secundária
  const [colunaSecundariaAberta, setColunaSecundariaAberta] = useState<boolean>(true)
  const toggleColunaSecundaria = () => setColunaSecundariaAberta((prev) => !prev)

  // Conversa aberta do chat (coluna contextual e página /chat compartilham)
  const [chatAlvo, setChatAlvo] = useState<AlvoConversa | null>(null)

  const recarregarFluxo = async () => {
    try {
      const [c, cats, flxs, cols] = await Promise.all([
        diamondApi.listCards().catch(() => []),
        diamondApi.listCategoriasFluxo().catch(() => []),
        diamondApi.listFluxosKanban().catch(() => []),
        diamondApi.listColunasFluxo().catch(() => []),
      ])
      setCards(c)
      setCategorias(cats)
      setFluxos(flxs)
      setColunas(cols)

      setCategoriasExpandidas((prev) => {
        const nextState = { ...prev }
        for (const cat of cats) {
          if (nextState[cat.id] === undefined) {
            nextState[cat.id] = true
          }
        }
        return nextState
      })
    } catch (err) {
      console.error('Erro ao recarregar fluxo no NavegacaoContext:', err)
    }
  }

  const recarregarDadosGlobais = async () => {
    try {
      const [p, ct, past, arq, cli, lis, dem, folha, marcos, evs, membs, convs] = await Promise.all(
        [
          diamondApi.listProjetos().catch(() => []),
          diamondApi.listContatos().catch(() => []),
          diamondApi.listPastas().catch(() => []),
          diamondApi.listArquivos().catch(() => []),
          diamondApi.listClientes().catch(() => []),
          diamondApi.listListas().catch(() => []),
          diamondApi.listDemandas().catch(() => []),
          diamondApi.listFolhaDia().catch(() => []),
          diamondApi.listMarcosTimeline().catch(() => []),
          diamondApi.listEventosCalendario().catch(() => []),
          diamondApi.listMembrosEquipe().catch(() => []),
          diamondApi.listConvitesEquipe().catch(() => []),
        ],
      )
      setProjetos(p)
      setContatos(ct)
      setPastas(past)
      setArquivos(arq)
      setClientes(cli)
      setListas(lis)
      setDemandas(dem)
      setFolhaItems(folha)
      setMarcosTimeline(marcos)
      setEventosCalendario(evs)
      setMembrosEquipe(membs)
      setConvitesEquipe(convs)
    } catch (err) {
      console.error('Erro ao carregar dados globais da navegação:', err)
    }
  }

  useEffect(() => {
    recarregarFluxo()
    recarregarDadosGlobais()
  }, [])

  const toggleCategoriaExpandida = (catId: string) => {
    setCategoriasExpandidas((prev) => ({
      ...prev,
      [catId]: !prev[catId],
    }))
  }

  // Agrupa categorias com seus fluxos REAIS (nunca as fases/colunas) e contagens
  const fluxosOrdenados = [...fluxos].sort((a, b) => (a.ordem || 0) - (b.ordem || 0))
  const categoriasComFluxos: CategoriaComFluxos[] = categorias.map((cat) => {
    const fluxosDaCat = fluxosOrdenados.filter((f) => f.categoria === cat.id)

    const fluxosComContagem: FluxoComContagem[] = fluxosDaCat.map((fluxo) => {
      // Fases pertencentes a este fluxo
      const fasesDoFluxo = colunas.filter((col) => col.fluxo_id === fluxo.id)
      const chavesDoFluxo = fasesDoFluxo.map((col) => col.chave)

      // Cards vinculados diretamente pelo fluxo_id ou por status correspondente a uma de suas fases
      const cardCount = cards.filter(
        (card) =>
          card.fluxo_id === fluxo.id ||
          (chavesDoFluxo.length > 0 && chavesDoFluxo.includes(card.status as string)),
      ).length

      return {
        ...fluxo,
        cardCount,
        fasesCount: fasesDoFluxo.length,
      }
    })

    // Contagem total da categoria somando os cards dos fluxos da categoria ou vinculados a ela
    const fasesDaCat = colunas.filter((col) => col.categoria === cat.id)
    const chavesDaCat = new Set([
      ...fasesDaCat.map((c) => c.chave),
      ...fluxosComContagem.flatMap((f) =>
        colunas.filter((col) => col.fluxo_id === f.id).map((c) => c.chave),
      ),
    ])

    const catCardCount = cards.filter(
      (card) =>
        fluxosDaCat.some((f) => f.id === card.fluxo_id) || chavesDaCat.has(card.status as string),
    ).length

    return {
      ...cat,
      fluxos: fluxosComContagem,
      cardCount: catCardCount,
    }
  })

  return (
    <NavegacaoContext.Provider
      value={{
        categoriaAtivaId,
        setCategoriaAtivaId,
        fluxoAtivoId,
        setFluxoAtivoId,
        fluxoAtivoChave,
        setFluxoAtivoChave,
        categorias,
        fluxos,
        colunas,
        cards,
        categoriasComFluxos,
        categoriasExpandidas,
        toggleCategoriaExpandida,
        recarregarFluxo,

        modalNovaCategoriaOpen,
        setModalNovaCategoriaOpen,
        modalNovoFluxoOpen,
        setModalNovoFluxoOpen,
        modalNovoFluxoCatId,
        setModalNovoFluxoCatId,
        modalNovoCardOpen,
        setModalNovoCardOpen,
        modalNovoCardChave,
        setModalNovoCardChave,
        modalNovaFamiliaOpen,
        setModalNovaFamiliaOpen,
        modalNovaFamiliaColunaId,
        setModalNovaFamiliaColunaId,

        projetos,
        contatos,
        pastas,
        arquivos,
        clientes,
        listas,
        demandas,
        folhaItems,
        marcosTimeline,
        eventosCalendario,
        dataSelecionadaCalendario,
        setDataSelecionadaCalendario,
        filtroTipoCalendario,
        setFiltroTipoCalendario,
        membrosEquipe,
        convitesEquipe,
        modalConvidarEquipeOpen,
        setModalConvidarEquipeOpen,
        modalConvidarEscopoPadrao,
        setModalConvidarEscopoPadrao,
        recarregarDadosGlobais,
        colunaSecundariaAberta,
        setColunaSecundariaAberta,
        toggleColunaSecundaria,
        chatAlvo,
        setChatAlvo,
      }}
    >
      {children}
    </NavegacaoContext.Provider>
  )
}

export const useNavegacao = () => {
  const context = useContext(NavegacaoContext)
  if (!context) {
    throw new Error('useNavegacao deve ser utilizado dentro de um NavegacaoProvider')
  }
  return context
}
