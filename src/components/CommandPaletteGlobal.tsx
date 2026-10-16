import React, { useState, useEffect, useMemo, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { diamondApi } from '@/services/diamondApi'
import type { FolhaDia, Card as CardKanban, Projeto, Contato, Cliente, Demanda } from '@/types'
import {
  FileEdit,
  Mic,
  CreditCard,
  FolderKanban,
  Users,
  UserCheck,
  CheckSquare,
  Search,
  Sparkles,
  ArrowRight,
  Pin,
  Clock,
  Loader2,
} from 'lucide-react'
import {
  CommandDialog,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandSeparator,
} from '@/components/ui/command'
import { Badge } from '@/components/ui/badge'

interface GlobalSearchItem {
  id: string
  tipo: 'folha' | 'reuniao' | 'card' | 'projeto' | 'contato' | 'cliente' | 'demanda'
  titulo: string
  subtitulo?: string
  icone: React.ElementType
  badge: string
  badgeColor: string
  rota: string
  fixado?: boolean
  criadoEm?: string
}

interface CommandPaletteGlobalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export const CommandPaletteGlobal: React.FC<CommandPaletteGlobalProps> = ({
  open,
  onOpenChange,
}) => {
  const navigate = useNavigate()
  const [busca, setBusca] = useState('')
  const [loading, setLoading] = useState(false)

  // Dados em cache para busca instantânea
  const [folha, setFolha] = useState<FolhaDia[]>([])
  const [cards, setCards] = useState<CardKanban[]>([])
  const [projetos, setProjetos] = useState<Projeto[]>([])
  const [contatos, setContatos] = useState<Contato[]>([])
  const [clientes, setClientes] = useState<Cliente[]>([])
  const [demandas, setDemandas] = useState<Demanda[]>([])

  const carregarDadosBusca = useCallback(async () => {
    setLoading(true)
    try {
      const [f, c, p, ct, cl, d] = await Promise.all([
        diamondApi.listFolhaDia().catch(() => []),
        diamondApi.listCards().catch(() => []),
        diamondApi.listProjetos().catch(() => []),
        diamondApi.listContatos().catch(() => []),
        diamondApi.listClientes().catch(() => []),
        diamondApi.listDemandas().catch(() => []),
      ])
      setFolha(f)
      setCards(c)
      setProjetos(p)
      setContatos(ct)
      setClientes(cl)
      setDemandas(d)
    } finally {
      setLoading(false)
    }
  }, [])

  // Carregar ou recarregar dados quando o modal abre
  useEffect(() => {
    if (open) {
      carregarDadosBusca()
      setBusca('')
    }
  }, [open, carregarDadosBusca])

  // Processar itens de busca
  const itensIndexados = useMemo<GlobalSearchItem[]>(() => {
    const lista: GlobalSearchItem[] = []

    // 1. Assuntos da Folha & Reuniões Gravadas
    folha.forEach((f) => {
      const isReuniao = Boolean(f.is_reuniao)
      const dataStr = f.data_hora?.slice(0, 10) || f.data || f.created?.slice(0, 10) || ''
      const texto = f.registro || 'Assunto sem texto'

      lista.push({
        id: `folha_${f.id}`,
        tipo: isReuniao ? 'reuniao' : 'folha',
        titulo: texto.length > 90 ? `${texto.slice(0, 90)}...` : texto,
        subtitulo: `${isReuniao ? 'Reunião gravada' : 'Assunto da folha'} • ${dataStr}`,
        icone: isReuniao ? Mic : FileEdit,
        badge: isReuniao ? 'Reunião' : 'Folha',
        badgeColor: isReuniao
          ? 'bg-red-100 text-red-800 border-red-200'
          : 'bg-[#0F766E]/15 text-[#0F766E] border-[#0F766E]/30',
        rota: '/folha',
        fixado: Boolean(f.fixado),
        criadoEm: f.created,
      })
    })

    // 2. Cards do Kanban
    cards.forEach((c) => {
      lista.push({
        id: `card_${c.id}`,
        tipo: 'card',
        titulo: c.titulo,
        subtitulo: c.descricao
          ? c.descricao.slice(0, 70)
          : `Card no fluxo Kanban • Status: ${c.status || 'Ativo'}`,
        icone: CreditCard,
        badge: 'Card',
        badgeColor: 'bg-blue-100 text-blue-800 border-blue-200',
        rota: `/card/${c.id}`,
        criadoEm: c.created,
      })
    })

    // 3. Demandas
    demandas.forEach((d) => {
      lista.push({
        id: `demanda_${d.id}`,
        tipo: 'demanda',
        titulo: d.titulo,
        subtitulo: d.descricao
          ? d.descricao.slice(0, 70)
          : `Demanda acionável • Prioridade: ${d.prioridade || 'Média'}`,
        icone: CheckSquare,
        badge: 'Demanda',
        badgeColor: 'bg-purple-100 text-purple-800 border-purple-200',
        rota: '/listas',
        criadoEm: d.created,
      })
    })

    // 4. Projetos
    projetos.forEach((p) => {
      lista.push({
        id: `projeto_${p.id}`,
        tipo: 'projeto',
        titulo: p.nome,
        subtitulo: p.descricao
          ? p.descricao.slice(0, 70)
          : `Projeto Diamond • Status: ${p.status || 'Em andamento'}`,
        icone: FolderKanban,
        badge: 'Projeto',
        badgeColor: 'bg-emerald-100 text-emerald-800 border-emerald-200',
        rota: `/projetos/${p.id}`,
        criadoEm: p.created,
      })
    })

    // 5. Clientes
    clientes.forEach((cl) => {
      lista.push({
        id: `cliente_${cl.id}`,
        tipo: 'cliente',
        titulo: cl.nome,
        subtitulo: cl.empresa || cl.email || 'Cliente Diamond',
        icone: UserCheck,
        badge: 'Cliente',
        badgeColor: 'bg-teal-100 text-teal-800 border-teal-200',
        rota: '/clientes',
        criadoEm: cl.created,
      })
    })

    // 6. Contatos
    contatos.forEach((ct) => {
      lista.push({
        id: `contato_${ct.id}`,
        tipo: 'contato',
        titulo: ct.nome,
        subtitulo: ct.cargo
          ? `${ct.cargo} • ${ct.empresa || ''}`
          : ct.email || ct.telefone || 'Contato',
        icone: Users,
        badge: 'Contato',
        badgeColor: 'bg-amber-100 text-amber-800 border-amber-200',
        rota: `/contatos/${ct.id}`,
        criadoEm: ct.created,
      })
    })

    return lista
  }, [folha, cards, demandas, projetos, clientes, contatos])

  // Filtragem dos itens pelo termo digitado
  const itensFiltrados = useMemo(() => {
    const termo = busca.toLowerCase().trim()
    if (!termo) {
      // Quando vazio, exibe os itens mais recentes e fixados
      return itensIndexados
        .slice()
        .sort((a, b) => {
          if (a.fixado && !b.fixado) return -1
          if (!a.fixado && b.fixado) return 1
          return (b.criadoEm || '').localeCompare(a.criadoEm || '')
        })
        .slice(0, 20)
    }

    return itensIndexados.filter((item) => {
      const noTitulo = item.titulo.toLowerCase().includes(termo)
      const noSub = (item.subtitulo || '').toLowerCase().includes(termo)
      const naOrigem = item.badge.toLowerCase().includes(termo)
      return noTitulo || noSub || naOrigem
    })
  }, [itensIndexados, busca])

  // Agrupamento por tipo de origem
  const grupos = useMemo(() => {
    const g: Record<string, GlobalSearchItem[]> = {
      Folha: [],
      Reunião: [],
      Card: [],
      Demanda: [],
      Projeto: [],
      Contato: [],
      Cliente: [],
    }

    itensFiltrados.forEach((item) => {
      if (item.tipo === 'folha') g['Folha'].push(item)
      else if (item.tipo === 'reuniao') g['Reunião'].push(item)
      else if (item.tipo === 'card') g['Card'].push(item)
      else if (item.tipo === 'demanda') g['Demanda'].push(item)
      else if (item.tipo === 'projeto') g['Projeto'].push(item)
      else if (item.tipo === 'contato') g['Contato'].push(item)
      else if (item.tipo === 'cliente') g['Cliente'].push(item)
    })

    return g
  }, [itensFiltrados])

  const handleSelecionar = (item: GlobalSearchItem) => {
    onOpenChange(false)
    navigate(item.rota)
  }

  return (
    <CommandDialog open={open} onOpenChange={onOpenChange}>
      <div className="border-b border-[#E5E1D8] px-3 flex items-center gap-2">
        <Search className="w-4 h-4 text-[#5B6470] shrink-0" />
        <CommandInput
          placeholder="Busca global em tempo real (Folha, reuniões, cards, demandas, projetos, contatos)..."
          value={busca}
          onValueChange={setBusca}
          className="border-none focus:ring-0 text-xs sm:text-sm h-11"
        />
        {loading && <Loader2 className="w-4 h-4 text-[#0F766E] animate-spin shrink-0" />}
      </div>

      <CommandList className="max-h-[380px] overflow-y-auto p-2">
        <CommandEmpty className="py-8 text-center text-xs text-[#5B6470] space-y-1">
          <p className="font-semibold text-[#1A1D21]">Nenhum resultado encontrado.</p>
          <p className="text-[#5B6470]">
            Tente outro termo como o nome de um projeto, cliente, card ou trecho de reunião.
          </p>
        </CommandEmpty>

        {Object.entries(grupos).map(([grupoNome, itens]) => {
          if (itens.length === 0) return null
          return (
            <CommandGroup
              key={grupoNome}
              heading={
                <span className="text-[10px] font-bold text-[#5B6470] uppercase tracking-wider px-2 py-1 block">
                  {grupoNome} ({itens.length})
                </span>
              }
            >
              {itens.slice(0, 8).map((item) => {
                const Icon = item.icone
                return (
                  <CommandItem
                    key={item.id}
                    value={`${item.titulo} ${item.subtitulo || ''} ${item.badge}`}
                    onSelect={() => handleSelecionar(item)}
                    className="flex items-center justify-between p-2.5 rounded-lg cursor-pointer hover:bg-[#FAFAF9] transition-colors gap-3"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-7 h-7 rounded-lg bg-[#F4F2EE] border border-[#E5E1D8] flex items-center justify-center shrink-0 text-[#1A1D21]">
                        <Icon className="w-3.5 h-3.5" />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          {item.fixado && (
                            <Pin className="w-2.5 h-2.5 fill-amber-600 text-amber-600 shrink-0" />
                          )}
                          <span className="text-xs font-semibold text-[#1A1D21] truncate">
                            {item.titulo}
                          </span>
                        </div>
                        {item.subtitulo && (
                          <p className="text-[11px] text-[#5B6470] truncate mt-0.5">
                            {item.subtitulo}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <Badge
                        variant="outline"
                        className={`text-[10px] font-semibold px-2 py-0 border ${item.badgeColor}`}
                      >
                        {item.badge}
                      </Badge>
                      <ArrowRight className="w-3.5 h-3.5 text-[#5B6470]/60" />
                    </div>
                  </CommandItem>
                )
              })}
            </CommandGroup>
          )
        })}
      </CommandList>

      <div className="p-2.5 bg-[#FAFAF9] border-t border-[#E5E1D8] flex items-center justify-between text-[11px] text-[#5B6470]">
        <span className="flex items-center gap-2">
          <span>
            Navegar:{' '}
            <kbd className="bg-white border border-[#E5E1D8] px-1 rounded text-[10px] font-mono">
              ↑
            </kbd>{' '}
            <kbd className="bg-white border border-[#E5E1D8] px-1 rounded text-[10px] font-mono">
              ↓
            </kbd>
          </span>
          <span>
            Abrir:{' '}
            <kbd className="bg-white border border-[#E5E1D8] px-1.5 rounded text-[10px] font-mono">
              Enter
            </kbd>
          </span>
        </span>
        <span className="flex items-center gap-1 text-[#0F766E] font-medium">
          <Sparkles className="w-3 h-3" />
          Busca Unificada Diamond
        </span>
      </div>
    </CommandDialog>
  )
}

export default CommandPaletteGlobal
