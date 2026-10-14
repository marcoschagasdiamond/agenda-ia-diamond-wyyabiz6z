import React, { useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useNavegacao } from '@/contexts/NavegacaoContext'
import {
  ChevronRight,
  ChevronDown,
  Plus,
  FolderTree,
  GitBranch,
  Layers,
  Search,
  FileEdit,
  Users,
  FolderOpen,
  UserCheck,
  ListTodo,
  Bot,
  Settings,
  FolderKanban,
  History,
  LayoutDashboard,
  Clock,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  Calendar,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

interface NavContextColumnProps {
  onCloseMobile?: () => void
}

export default function NavContextColumn({ onCloseMobile }: NavContextColumnProps) {
  const navigate = useNavigate()
  const location = useLocation()
  const pathname = location.pathname

  const {
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
    setModalNovaCategoriaOpen,
    setModalNovoFluxoOpen,
    setModalNovoFluxoCatId,
    setModalNovaFamiliaOpen,
    setModalNovoCardOpen,
    setModalNovoCardChave,
    projetos,
    contatos,
    pastas,
    arquivos,
    clientes,
    listas,
    demandas,
    folhaItems,
  } = useNavegacao()

  // Filtro de busca local dentro da segunda coluna
  const [buscaSecundaria, setBuscaSecundaria] = useState('')

  // Helper para navegar e fechar no mobile
  const irPara = (path: string) => {
    navigate(path)
    if (onCloseMobile) onCloseMobile()
  }

  // Identifica a seção ativa
  const secaoAtiva = (() => {
    if (pathname === '/') return 'dashboard'
    if (pathname.startsWith('/folha')) return 'folha'
    if (pathname.startsWith('/fluxo')) return 'fluxo'
    if (pathname.startsWith('/projetos')) return 'projetos'
    if (pathname.startsWith('/contatos')) return 'contatos'
    if (pathname.startsWith('/arquivos')) return 'arquivos'
    if (pathname.startsWith('/listas')) return 'listas'
    if (pathname.startsWith('/clientes')) return 'clientes'
    if (pathname.startsWith('/agente')) return 'agente'
    if (pathname.startsWith('/resumos')) return 'resumos'
    if (pathname.startsWith('/config')) return 'config'
    if (pathname.startsWith('/portal')) return 'portal'
    return 'dashboard'
  })()

  // =========================================================================
  // 1. SEGUNDA COLUNA: FLUXOS (KANBAN) — CONFORME MODELO DA IMAGEM
  // =========================================================================
  const renderColunaFluxos = () => {
    const catsFiltradas = categoriasComFluxos.filter((cat) => {
      if (!buscaSecundaria.trim()) return true
      const b = buscaSecundaria.toLowerCase()
      const matchCat = cat.nome.toLowerCase().includes(b)
      const matchFluxo = cat.fluxos.some((f) => f.nome.toLowerCase().includes(b))
      return matchCat || matchFluxo
    })

    return (
      <div className="flex flex-col h-full">
        {/* Topo: Título da coluna + botão Adicionar */}
        <div className="p-3.5 border-b border-[#E5E1D8] flex items-center justify-between bg-white shrink-0">
          <div>
            <h2 className="text-sm font-bold text-[#1A1D21] tracking-tight">Fluxos</h2>
            <p className="text-[10px] text-[#5B6470]">
              {categorias.length} categorias • {fluxos.length} fluxos
            </p>
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                size="sm"
                className="bg-[#0F766E] hover:bg-[#0D5C56] text-white text-xs h-7 px-2.5 gap-1 font-medium shadow-2xs"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Adicionar</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="text-xs">
              <DropdownMenuItem
                onClick={() => {
                  if (pathname !== '/fluxo') navigate('/fluxo')
                  setModalNovaCategoriaOpen(true)
                }}
              >
                <FolderTree className="w-3.5 h-3.5 mr-2 text-[#0F766E]" />
                Nova Categoria
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => {
                  if (pathname !== '/fluxo') navigate('/fluxo')
                  setModalNovoFluxoCatId(undefined)
                  setModalNovoFluxoOpen(true)
                }}
              >
                <GitBranch className="w-3.5 h-3.5 mr-2 text-[#0F766E]" />
                Novo Fluxo
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => {
                  if (pathname !== '/fluxo') navigate('/fluxo')
                  setModalNovoCardChave(undefined)
                  setModalNovoCardOpen(true)
                }}
              >
                <Plus className="w-3.5 h-3.5 mr-2 text-[#0F766E]" />
                Novo Card no Fluxo
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => {
                  if (pathname !== '/fluxo') navigate('/fluxo')
                  setModalNovaFamiliaOpen(true)
                }}
              >
                <Layers className="w-3.5 h-3.5 mr-2 text-blue-600" />
                Novo Grupo de Família
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Campo de Busca Rápida na árvore */}
        <div className="p-2 border-b border-[#E5E1D8] bg-[#FAFAF9] shrink-0">
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-2 text-[#5B6470]" />
            <Input
              value={buscaSecundaria}
              onChange={(e) => setBuscaSecundaria(e.target.value)}
              placeholder="Filtrar categorias ou fluxos..."
              className="pl-8 text-xs h-7.5 bg-white border-[#E5E1D8]"
            />
          </div>
        </div>

        {/* Opção Geral: Todas as Categorias */}
        <div className="p-2 border-b border-[#E5E1D8]/60 bg-white shrink-0">
          <button
            type="button"
            onClick={() => {
              if (pathname !== '/fluxo') irPara('/fluxo')
              setCategoriaAtivaId('all')
              setFluxoAtivoId('all')
              setFluxoAtivoChave('all')
            }}
            className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              categoriaAtivaId === 'all' && fluxoAtivoId === 'all'
                ? 'bg-[#1A1D21] text-white shadow-2xs'
                : 'text-[#1A1D21] hover:bg-[#F4F2EE]'
            }`}
          >
            <div className="flex items-center gap-2">
              <FolderTree className="w-3.5 h-3.5" />
              <span>Todas as Categorias</span>
            </div>
            <Badge
              variant="outline"
              className={`text-[10px] px-1.5 py-0 h-4 border-none ${
                categoriaAtivaId === 'all' && fluxoAtivoId === 'all'
                  ? 'bg-white/20 text-white'
                  : 'bg-[#E5E1D8] text-[#5B6470]'
              }`}
            >
              {cards.length}
            </Badge>
          </button>
        </div>

        {/* Lista de Categorias Expansíveis com seus Fluxos (apenas nomes de fluxos, NUNCA fases) */}
        <div className="flex-1 p-2 space-y-1.5 overflow-y-auto">
          {catsFiltradas.map((cat) => {
            const isCatAtiva = categoriaAtivaId === cat.id
            const isExpanded = categoriasExpandidas[cat.id] ?? true

            return (
              <div
                key={cat.id}
                className="rounded-lg border border-[#E5E1D8]/70 bg-white overflow-hidden shadow-2xs"
              >
                {/* Linha da Categoria */}
                <div
                  className={`flex items-center justify-between p-1.5 transition-colors ${
                    isCatAtiva && fluxoAtivoId === 'all'
                      ? 'bg-[#0F766E] text-white'
                      : 'hover:bg-[#F4F2EE] text-[#1A1D21]'
                  }`}
                >
                  {/* Seta de expansão */}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation()
                      toggleCategoriaExpandida(cat.id)
                    }}
                    className={`p-1 rounded transition-colors ${
                      isCatAtiva && fluxoAtivoId === 'all'
                        ? 'text-white/80 hover:text-white hover:bg-white/10'
                        : 'text-[#5B6470] hover:text-[#1A1D21]'
                    }`}
                    aria-label="Expandir ou recolher fluxos"
                  >
                    {isExpanded ? (
                      <ChevronDown className="w-3.5 h-3.5" />
                    ) : (
                      <ChevronRight className="w-3.5 h-3.5" />
                    )}
                  </button>

                  {/* Nome da categoria */}
                  <button
                    type="button"
                    onClick={() => {
                      if (pathname !== '/fluxo') irPara('/fluxo')
                      setCategoriaAtivaId(cat.id)
                      setFluxoAtivoId('all')
                      setFluxoAtivoChave('all')
                    }}
                    className="flex-1 flex items-center gap-1.5 text-left text-xs font-semibold truncate ml-1"
                  >
                    <span
                      className="w-2 h-2 rounded-full shrink-0"
                      style={{ backgroundColor: cat.cor || '#0F766E' }}
                    />
                    <span className="truncate">{cat.nome}</span>
                  </button>

                  {/* Contagem de cards da categoria */}
                  <span
                    className={`text-[10px] px-1.5 py-0.2 rounded-full font-medium shrink-0 ${
                      isCatAtiva && fluxoAtivoId === 'all'
                        ? 'bg-white/20 text-white'
                        : 'bg-[#E5E1D8] text-[#5B6470]'
                    }`}
                  >
                    {cat.cardCount}
                  </span>
                </div>

                {/* Subitens: Fluxos da categoria (nomes reais dos fluxos, NÃO as fases) */}
                {isExpanded && (
                  <div className="p-1 pl-3 space-y-0.5 border-t border-[#E5E1D8]/60 bg-[#FAFAF9]">
                    {cat.fluxos.map((fluxo) => {
                      const isFluxoAtivo = isCatAtiva && fluxoAtivoId === fluxo.id

                      return (
                        <div
                          key={fluxo.id}
                          className={`group flex items-center justify-between px-2 py-1 rounded text-xs transition-colors ${
                            isFluxoAtivo
                              ? 'bg-[#0F766E]/15 text-[#0F766E] font-semibold'
                              : 'text-[#5B6470] hover:bg-[#F4F2EE] hover:text-[#1A1D21]'
                          }`}
                        >
                          <button
                            type="button"
                            onClick={() => {
                              if (pathname !== '/fluxo') irPara('/fluxo')
                              setCategoriaAtivaId(cat.id)
                              setFluxoAtivoId(fluxo.id)
                              setFluxoAtivoChave('all')
                            }}
                            className="flex-1 flex items-center gap-1.5 text-left truncate"
                          >
                            <span
                              className="w-1.5 h-1.5 rounded-full shrink-0"
                              style={{ backgroundColor: fluxo.cor || '#0F766E' }}
                            />
                            <span className="truncate">{fluxo.nome}</span>
                          </button>

                          <span className="text-[10px] text-[#5B6470] bg-[#E5E1D8]/60 px-1.5 py-0.2 rounded shrink-0">
                            {fluxo.cardCount}
                          </span>
                        </div>
                      )
                    })}

                    {cat.fluxos.length === 0 ? (
                      <div className="py-1 px-2 text-[11px] text-[#5B6470]/70 italic flex items-center justify-between">
                        <span>Sem fluxos</span>
                        <button
                          type="button"
                          onClick={() => {
                            if (pathname !== '/fluxo') irPara('/fluxo')
                            setModalNovoFluxoCatId(cat.id)
                            setModalNovoFluxoOpen(true)
                          }}
                          className="text-[#0F766E] hover:underline text-[10px] font-semibold"
                        >
                          + Criar Fluxo
                        </button>
                      </div>
                    ) : (
                      <div className="pt-1 pb-0.5 px-2 flex justify-end border-t border-[#E5E1D8]/40">
                        <button
                          type="button"
                          onClick={() => {
                            if (pathname !== '/fluxo') irPara('/fluxo')
                            setModalNovoFluxoCatId(cat.id)
                            setModalNovoFluxoOpen(true)
                          }}
                          className="text-[11px] text-[#0F766E] hover:text-[#0D5C56] font-semibold hover:underline flex items-center gap-1 py-0.5"
                        >
                          <Plus className="w-3 h-3" />
                          <span>Criar Fluxo</span>
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )
          })}

          {catsFiltradas.length === 0 && (
            <div className="text-center py-6 text-xs text-[#5B6470]">
              <p>Nenhuma categoria encontrada.</p>
            </div>
          )}
        </div>
      </div>
    )
  }

  // =========================================================================
  // 2. SEGUNDA COLUNA: FOLHA DO DIA (Sessão atual, assuntos, histórico)
  // =========================================================================
  const renderColunaFolha = () => {
    const pendentes = folhaItems.filter((f) => f.status === 'pendente')
    const processados = folhaItems.filter((f) => f.status === 'processado')

    return (
      <div className="flex flex-col h-full">
        <div className="p-3.5 border-b border-[#E5E1D8] flex items-center justify-between bg-white shrink-0">
          <div>
            <h2 className="text-sm font-bold text-[#1A1D21] tracking-tight">Folha do Dia</h2>
            <p className="text-[10px] text-[#5B6470]">Captura e Segundo Cérebro</p>
          </div>
          <Button
            size="sm"
            onClick={() => irPara('/folha')}
            className="bg-[#0F766E] hover:bg-[#0D5C56] text-white text-xs h-7 px-2.5 font-medium shadow-2xs"
          >
            <Plus className="w-3.5 h-3.5 mr-1" />
            Nova Nota
          </Button>
        </div>

        <div className="flex-1 p-2 space-y-3 overflow-y-auto">
          {/* Seção Pendentes */}
          <div className="space-y-1">
            <div className="flex items-center justify-between px-2 py-1">
              <span className="text-[11px] font-bold text-[#5B6470] uppercase tracking-wider">
                Assuntos Pendentes
              </span>
              <Badge className="bg-amber-100 text-amber-800 border-none text-[10px]">
                {pendentes.length}
              </Badge>
            </div>

            {pendentes.map((item, idx) => (
              <button
                key={item.id}
                onClick={() => irPara('/folha')}
                className="w-full text-left p-2 rounded-lg bg-white border border-[#E5E1D8] hover:border-[#0F766E] hover:shadow-2xs transition-all space-y-1 block"
              >
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold text-[#0F766E]">
                    #{idx + 1} • {item.tipo_origem || 'manual'}
                  </span>
                  <span className="text-[9px] text-[#5B6470]">
                    {item.data_hora ? item.data_hora.slice(11, 16) : item.created?.slice(11, 16)}
                  </span>
                </div>
                <p className="text-xs text-[#1A1D21] line-clamp-2 leading-tight">
                  {item.registro || 'Sem anotação'}
                </p>
              </button>
            ))}

            {pendentes.length === 0 && (
              <div className="p-3 bg-white rounded-lg border border-[#E5E1D8] text-center text-xs text-[#5B6470]">
                Folha limpa. Nenhum assunto pendente de processamento.
              </div>
            )}
          </div>

          {/* Links e Histórico */}
          <div className="pt-2 border-t border-[#E5E1D8] space-y-1">
            <span className="text-[11px] font-bold text-[#5B6470] uppercase tracking-wider px-2 block">
              Atalhos & Histórico
            </span>
            <button
              onClick={() => irPara('/resumos')}
              className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs font-medium text-[#1A1D21] hover:bg-[#F4F2EE] transition-colors"
            >
              <div className="flex items-center gap-2">
                <History className="w-3.5 h-3.5 text-[#0F766E]" />
                <span>Resumos das Sessões</span>
              </div>
              <ArrowRight className="w-3 h-3 text-[#5B6470]" />
            </button>
            <div className="px-2.5 py-1 text-[11px] text-[#5B6470]">
              {processados.length} anotações já consolidadas na memória.
            </div>
          </div>
        </div>
      </div>
    )
  }

  // =========================================================================
  // 3. SEGUNDA COLUNA: CONTATOS
  // =========================================================================
  const renderColunaContatos = () => {
    const contatosFiltrados = contatos.filter((c) => {
      if (!buscaSecundaria.trim()) return true
      const b = buscaSecundaria.toLowerCase()
      return (
        c.nome?.toLowerCase().includes(b) ||
        c.empresa?.toLowerCase().includes(b) ||
        c.email?.toLowerCase().includes(b)
      )
    })

    return (
      <div className="flex flex-col h-full">
        <div className="p-3.5 border-b border-[#E5E1D8] flex items-center justify-between bg-white shrink-0">
          <div>
            <h2 className="text-sm font-bold text-[#1A1D21] tracking-tight">Contatos</h2>
            <p className="text-[10px] text-[#5B6470]">{contatos.length} pessoas e parceiros</p>
          </div>
          <Button
            size="sm"
            onClick={() => irPara('/contatos')}
            className="bg-[#0F766E] hover:bg-[#0D5C56] text-white text-xs h-7 px-2.5 font-medium shadow-2xs"
          >
            <Plus className="w-3.5 h-3.5 mr-1" />
            Novo
          </Button>
        </div>

        <div className="p-2 border-b border-[#E5E1D8] bg-[#FAFAF9] shrink-0">
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-2 text-[#5B6470]" />
            <Input
              value={buscaSecundaria}
              onChange={(e) => setBuscaSecundaria(e.target.value)}
              placeholder="Buscar por nome ou empresa..."
              className="pl-8 text-xs h-7.5 bg-white border-[#E5E1D8]"
            />
          </div>
        </div>

        <div className="flex-1 p-2 space-y-1 overflow-y-auto">
          <button
            onClick={() => irPara('/contatos')}
            className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs font-semibold mb-1 transition-colors ${
              pathname === '/contatos'
                ? 'bg-[#1A1D21] text-white'
                : 'hover:bg-[#F4F2EE] text-[#1A1D21]'
            }`}
          >
            <span>Todos os Contatos</span>
            <Badge
              variant="outline"
              className="text-[10px] h-4 border-none bg-[#E5E1D8] text-[#5B6470]"
            >
              {contatos.length}
            </Badge>
          </button>

          {contatosFiltrados.map((c) => (
            <button
              key={c.id}
              onClick={() => irPara(`/contatos/${c.id}`)}
              className="w-full text-left p-2 rounded-lg bg-white border border-[#E5E1D8]/80 hover:border-[#0F766E] hover:bg-[#FAFAF9] transition-all block group"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-[#1A1D21] truncate">{c.nome}</span>
                <span className="text-[9px] uppercase font-semibold text-[#0F766E] bg-[#0F766E]/10 px-1 py-0.2 rounded">
                  {c.origem || 'manual'}
                </span>
              </div>
              <p className="text-[11px] text-[#5B6470] truncate mt-0.5">
                {c.cargo || 'Contato'} {c.empresa ? `• ${c.empresa}` : ''}
              </p>
            </button>
          ))}

          {contatosFiltrados.length === 0 && (
            <div className="text-center py-6 text-xs text-[#5B6470]">
              Nenhum contato encontrado.
            </div>
          )}
        </div>
      </div>
    )
  }

  // =========================================================================
  // 4. SEGUNDA COLUNA: PROJETOS
  // =========================================================================
  const renderColunaProjetos = () => {
    return (
      <div className="flex flex-col h-full">
        <div className="p-3.5 border-b border-[#E5E1D8] flex items-center justify-between bg-white shrink-0">
          <div>
            <h2 className="text-sm font-bold text-[#1A1D21] tracking-tight">Projetos</h2>
            <p className="text-[10px] text-[#5B6470]">{projetos.length} frentes ativas</p>
          </div>
          <Button
            size="sm"
            onClick={() => irPara('/projetos')}
            className="bg-[#0F766E] hover:bg-[#0D5C56] text-white text-xs h-7 px-2.5 font-medium shadow-2xs"
          >
            <Plus className="w-3.5 h-3.5 mr-1" />
            Novo
          </Button>
        </div>

        <div className="flex-1 p-2 space-y-1 overflow-y-auto">
          <button
            onClick={() => irPara('/projetos')}
            className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs font-semibold mb-1 transition-colors ${
              pathname === '/projetos'
                ? 'bg-[#1A1D21] text-white'
                : 'hover:bg-[#F4F2EE] text-[#1A1D21]'
            }`}
          >
            <span>Todos os Projetos</span>
            <Badge
              variant="outline"
              className="text-[10px] h-4 border-none bg-[#E5E1D8] text-[#5B6470]"
            >
              {projetos.length}
            </Badge>
          </button>

          {projetos.map((p) => {
            const isAtivo = pathname === `/projetos/${p.id}`
            return (
              <button
                key={p.id}
                onClick={() => irPara(`/projetos/${p.id}`)}
                className={`w-full text-left p-2 rounded-lg border transition-all block ${
                  isAtivo
                    ? 'bg-[#0F766E]/10 border-[#0F766E] text-[#0F766E]'
                    : 'bg-white border-[#E5E1D8]/80 hover:bg-[#FAFAF9] text-[#1A1D21]'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold truncate">{p.nome}</span>
                  <Badge variant="outline" className="text-[9px] capitalize">
                    {p.status}
                  </Badge>
                </div>
                <p className="text-[11px] text-[#5B6470] truncate mt-0.5">
                  Tipo: <span className="capitalize">{p.tipo}</span>
                </p>
              </button>
            )
          })}

          {projetos.length === 0 && (
            <div className="text-center py-6 text-xs text-[#5B6470]">
              Nenhum projeto cadastrado.
            </div>
          )}
        </div>
      </div>
    )
  }

  // =========================================================================
  // 5. SEGUNDA COLUNA: ARQUIVOS & PASTAS
  // =========================================================================
  const renderColunaArquivos = () => {
    return (
      <div className="flex flex-col h-full">
        <div className="p-3.5 border-b border-[#E5E1D8] flex items-center justify-between bg-white shrink-0">
          <div>
            <h2 className="text-sm font-bold text-[#1A1D21] tracking-tight">Arquivos</h2>
            <p className="text-[10px] text-[#5B6470]">
              {pastas.length} pastas • {arquivos.length} docs
            </p>
          </div>
          <Button
            size="sm"
            onClick={() => irPara('/arquivos')}
            className="bg-[#0F766E] hover:bg-[#0D5C56] text-white text-xs h-7 px-2.5 font-medium shadow-2xs"
          >
            <Plus className="w-3.5 h-3.5 mr-1" />
            Upload
          </Button>
        </div>

        <div className="flex-1 p-2 space-y-1 overflow-y-auto">
          <button
            onClick={() => irPara('/arquivos')}
            className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs font-semibold mb-1 bg-[#1A1D21] text-white"
          >
            <div className="flex items-center gap-2">
              <FolderOpen className="w-3.5 h-3.5" />
              <span>Todos os Arquivos</span>
            </div>
            <span className="text-[10px]">{arquivos.length}</span>
          </button>

          <div className="pt-1 space-y-1">
            <span className="text-[11px] font-bold text-[#5B6470] uppercase tracking-wider px-2 block">
              Pastas
            </span>
            {pastas.map((pasta) => {
              const count = arquivos.filter((a) => a.pasta === pasta.id).length
              return (
                <button
                  key={pasta.id}
                  onClick={() => irPara('/arquivos')}
                  className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs text-[#1A1D21] hover:bg-[#F4F2EE] transition-colors"
                >
                  <div className="flex items-center gap-2 truncate">
                    <FolderTree className="w-3.5 h-3.5 text-[#0F766E] shrink-0" />
                    <span className="truncate">{pasta.nome}</span>
                  </div>
                  <span className="text-[10px] text-[#5B6470] shrink-0 bg-[#E5E1D8] px-1.5 rounded">
                    {count}
                  </span>
                </button>
              )
            })}

            {pastas.length === 0 && (
              <div className="text-center py-4 text-xs text-[#5B6470]">Nenhuma pasta criada.</div>
            )}
          </div>
        </div>
      </div>
    )
  }

  // =========================================================================
  // 6. SEGUNDA COLUNA: LISTAS & DEMANDAS
  // =========================================================================
  const renderColunaListas = () => {
    return (
      <div className="flex flex-col h-full">
        <div className="p-3.5 border-b border-[#E5E1D8] flex items-center justify-between bg-white shrink-0">
          <div>
            <h2 className="text-sm font-bold text-[#1A1D21] tracking-tight">Listas & Demandas</h2>
            <p className="text-[10px] text-[#5B6470]">{demandas.length} tarefas delegáveis</p>
          </div>
          <Button
            size="sm"
            onClick={() => irPara('/listas')}
            className="bg-[#0F766E] hover:bg-[#0D5C56] text-white text-xs h-7 px-2.5 font-medium shadow-2xs"
          >
            <Plus className="w-3.5 h-3.5 mr-1" />
            Nova
          </Button>
        </div>

        <div className="flex-1 p-2 space-y-2 overflow-y-auto">
          <button
            onClick={() => irPara('/listas')}
            className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-[#1A1D21] text-white"
          >
            <span>Demandas Pendentes</span>
            <Badge variant="outline" className="text-[10px] border-none bg-white/20 text-white">
              {demandas.filter((d) => d.status === 'pendente').length}
            </Badge>
          </button>

          <div className="space-y-1">
            <span className="text-[11px] font-bold text-[#5B6470] uppercase tracking-wider px-2 block">
              Listas Criadas ({listas.length})
            </span>
            {listas.map((l) => (
              <button
                key={l.id}
                onClick={() => irPara('/listas')}
                className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs text-[#1A1D21] hover:bg-[#F4F2EE] transition-colors"
              >
                <span className="truncate">{l.nome}</span>
                <Badge variant="outline" className="text-[9px] capitalize shrink-0">
                  {l.compartilhada_com}
                </Badge>
              </button>
            ))}
          </div>
        </div>
      </div>
    )
  }

  // =========================================================================
  // 7. SEGUNDA COLUNA: CLIENTES & PORTAL
  // =========================================================================
  const renderColunaClientes = () => {
    return (
      <div className="flex flex-col h-full">
        <div className="p-3.5 border-b border-[#E5E1D8] flex items-center justify-between bg-white shrink-0">
          <div>
            <h2 className="text-sm font-bold text-[#1A1D21] tracking-tight">Clientes</h2>
            <p className="text-[10px] text-[#5B6470]">{clientes.length} cadastrados</p>
          </div>
          <Button
            size="sm"
            onClick={() => irPara('/clientes')}
            className="bg-[#0F766E] hover:bg-[#0D5C56] text-white text-xs h-7 px-2.5 font-medium shadow-2xs"
          >
            <Plus className="w-3.5 h-3.5 mr-1" />
            Cadastrar
          </Button>
        </div>

        <div className="flex-1 p-2 space-y-1 overflow-y-auto">
          <button
            onClick={() => irPara('/clientes')}
            className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-[#1A1D21] text-white mb-1"
          >
            <span>Painel de Clientes</span>
            <span className="text-[10px]">{clientes.length}</span>
          </button>

          {clientes.map((c) => (
            <button
              key={c.id}
              onClick={() => irPara('/clientes')}
              className="w-full text-left p-2 rounded-lg bg-white border border-[#E5E1D8]/80 hover:bg-[#FAFAF9] transition-all block"
            >
              <div className="font-bold text-xs text-[#1A1D21] truncate">{c.nome}</div>
              <div className="text-[10px] text-[#5B6470] truncate">{c.empresa || c.email}</div>
            </button>
          ))}

          {clientes.length === 0 && (
            <div className="text-center py-6 text-xs text-[#5B6470]">
              Nenhum cliente cadastrado.
            </div>
          )}
        </div>
      </div>
    )
  }

  // =========================================================================
  // 8. SEGUNDA COLUNA: AGENTE IA DIAMOND
  // =========================================================================
  const renderColunaAgente = () => {
    return (
      <div className="flex flex-col h-full">
        <div className="p-3.5 border-b border-[#E5E1D8] flex items-center justify-between bg-white shrink-0">
          <div>
            <h2 className="text-sm font-bold text-[#1A1D21] tracking-tight">Agente IA</h2>
            <p className="text-[10px] text-[#5B6470]">Segundo Cérebro Diamond</p>
          </div>
          <Badge
            className="bg-emerald-50 text-emerald-700 text-[10px] border-emerald-200"
            variant="outline"
          >
            Ativo
          </Badge>
        </div>

        <div className="flex-1 p-3 space-y-3 overflow-y-auto">
          <div className="p-3 rounded-lg bg-[#0F766E]/5 border border-[#0F766E]/20 text-xs text-[#0D5C56] space-y-2">
            <div className="flex items-center gap-1.5 font-bold">
              <Sparkles className="w-3.5 h-3.5 text-[#0F766E]" />
              <span>Memória Conectada</span>
            </div>
            <p className="text-[11px] leading-relaxed">
              O copiloto tem acesso instantâneo a todas as demandas, histórico de clientes, projetos
              e resumos do dia.
            </p>
          </div>

          <div className="space-y-1">
            <span className="text-[11px] font-bold text-[#5B6470] uppercase tracking-wider px-1 block">
              Perguntas Frequentes
            </span>
            <button
              onClick={() => irPara('/agente')}
              className="w-full text-left p-2 rounded-lg bg-white border border-[#E5E1D8] hover:border-[#0F766E] text-xs text-[#1A1D21] transition-all block"
            >
              "Quais são minhas prioridades críticas de hoje?"
            </button>
            <button
              onClick={() => irPara('/agente')}
              className="w-full text-left p-2 rounded-lg bg-white border border-[#E5E1D8] hover:border-[#0F766E] text-xs text-[#1A1D21] transition-all block"
            >
              "Resuma o histórico do cliente Helena / Loja Y"
            </button>
            <button
              onClick={() => irPara('/agente')}
              className="w-full text-left p-2 rounded-lg bg-white border border-[#E5E1D8] hover:border-[#0F766E] text-xs text-[#1A1D21] transition-all block"
            >
              "Estruture uma proposta para os projetos de devices"
            </button>
          </div>
        </div>
      </div>
    )
  }

  // =========================================================================
  // 9. SEGUNDA COLUNA: CONFIGURAÇÕES
  // =========================================================================
  const renderColunaConfig = () => {
    return (
      <div className="flex flex-col h-full">
        <div className="p-3.5 border-b border-[#E5E1D8] flex items-center justify-between bg-white shrink-0">
          <div>
            <h2 className="text-sm font-bold text-[#1A1D21] tracking-tight">Configurações</h2>
            <p className="text-[10px] text-[#5B6470]">Diretrizes e Sistema</p>
          </div>
        </div>

        <div className="flex-1 p-2 space-y-1 overflow-y-auto">
          <button
            onClick={() => irPara('/config')}
            className="w-full flex items-center gap-2 px-2.5 py-2 rounded-lg text-xs font-semibold bg-[#1A1D21] text-white"
          >
            <Settings className="w-3.5 h-3.5" />
            <span>Preferências & Preços</span>
          </button>
          <button
            onClick={() => irPara('/config')}
            className="w-full flex items-center gap-2 px-2.5 py-2 rounded-lg text-xs font-medium text-[#1A1D21] hover:bg-[#F4F2EE] transition-colors"
          >
            <ShieldCheck className="w-3.5 h-3.5 text-[#0F766E]" />
            <span>Status das Integrações</span>
          </button>
          <button
            onClick={() => irPara('/resumos')}
            className="w-full flex items-center gap-2 px-2.5 py-2 rounded-lg text-xs font-medium text-[#1A1D21] hover:bg-[#F4F2EE] transition-colors"
          >
            <History className="w-3.5 h-3.5 text-[#0F766E]" />
            <span>Consolidações Semanais</span>
          </button>
        </div>
      </div>
    )
  }

  // =========================================================================
  // 10. SEGUNDA COLUNA: DASHBOARD / GERAL
  // =========================================================================
  const renderColunaDashboard = () => {
    return (
      <div className="flex flex-col h-full">
        <div className="p-3.5 border-b border-[#E5E1D8] flex items-center justify-between bg-white shrink-0">
          <div>
            <h2 className="text-sm font-bold text-[#1A1D21] tracking-tight">Visão Geral</h2>
            <p className="text-[10px] text-[#5B6470]">Agenda IA Diamond</p>
          </div>
        </div>

        <div className="flex-1 p-2 space-y-1 overflow-y-auto">
          <button
            onClick={() => irPara('/')}
            className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
              pathname === '/' ? 'bg-[#1A1D21] text-white' : 'hover:bg-[#F4F2EE] text-[#1A1D21]'
            }`}
          >
            <div className="flex items-center gap-2">
              <LayoutDashboard className="w-3.5 h-3.5" />
              <span>Painel Executivo</span>
            </div>
          </button>

          <button
            onClick={() => irPara('/folha')}
            className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs font-medium text-[#1A1D21] hover:bg-[#F4F2EE] transition-colors"
          >
            <div className="flex items-center gap-2">
              <FileEdit className="w-3.5 h-3.5 text-[#0F766E]" />
              <span>Folha do Dia</span>
            </div>
            <Badge
              variant="outline"
              className="text-[10px] bg-amber-50 text-amber-800 border-amber-200"
            >
              {folhaItems.filter((f) => f.status === 'pendente').length}
            </Badge>
          </button>

          <button
            onClick={() => irPara('/fluxo')}
            className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs font-medium text-[#1A1D21] hover:bg-[#F4F2EE] transition-colors"
          >
            <div className="flex items-center gap-2">
              <GitBranch className="w-3.5 h-3.5 text-[#0F766E]" />
              <span>Kanban Diamond</span>
            </div>
            <span className="text-[10px] text-[#5B6470]">{cards.length} cards</span>
          </button>

          <button
            onClick={() => irPara('/agente')}
            className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs font-medium text-[#1A1D21] hover:bg-[#F4F2EE] transition-colors"
          >
            <div className="flex items-center gap-2">
              <Bot className="w-3.5 h-3.5 text-[#0F766E]" />
              <span>Agente IA Diamond</span>
            </div>
            <Sparkles className="w-3 h-3 text-[#0F766E]" />
          </button>

          <button
            onClick={() => irPara('/resumos')}
            className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs font-medium text-[#1A1D21] hover:bg-[#F4F2EE] transition-colors"
          >
            <div className="flex items-center gap-2">
              <History className="w-3.5 h-3.5 text-[#0F766E]" />
              <span>Resumos e Histórico</span>
            </div>
          </button>
        </div>
      </div>
    )
  }

  // Renderiza a coluna com base na seção ativa
  switch (secaoAtiva) {
    case 'fluxo':
      return renderColunaFluxos()
    case 'folha':
      return renderColunaFolha()
    case 'contatos':
      return renderColunaContatos()
    case 'projetos':
      return renderColunaProjetos()
    case 'arquivos':
      return renderColunaArquivos()
    case 'listas':
      return renderColunaListas()
    case 'clientes':
      return renderColunaClientes()
    case 'agente':
      return renderColunaAgente()
    case 'config':
      return renderColunaConfig()
    case 'dashboard':
    default:
      return renderColunaDashboard()
  }
}
