import React, { useState, useEffect } from 'react'
import { NavLink, useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '@/hooks/use-auth'
import { useNavegacao } from '@/contexts/NavegacaoContext'
import NavContextColumn from '@/components/NavContextColumn'
import {
  LayoutDashboard,
  FileEdit,
  KanbanSquare,
  CalendarDays,
  FolderKanban,
  Users,
  FolderOpen,
  ListTodo,
  UserCheck,
  Bot,
  History,
  Settings,
  LogOut,
  Menu,
  X,
  Search,
  Sparkles,
  PanelLeftClose,
  PanelLeftOpen,
  ChevronRight,
  Crown,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import ModalConvidarEquipe from '@/components/ModalConvidarEquipe'
import SinoNotificacoes from '@/components/SinoNotificacoes'
import CommandPaletteGlobal from '@/components/CommandPaletteGlobal'
import BotaoFeedbackFlutuante from '@/components/comercial/BotaoFeedbackFlutuante'

interface LayoutProps {
  children?: React.ReactNode
}

export default function Layout({ children }: LayoutProps) {
  const {
    user,
    clienteProfile,
    isClientPortal,
    isMaster,
    isConvidadoExterno,
    meusEscopos,
    signOut,
  } = useAuth()
  const {
    colunaSecundariaAberta,
    setColunaSecundariaAberta,
    toggleColunaSecundaria,
    folhaItems,
    modalConvidarEquipeOpen,
    setModalConvidarEquipeOpen,
    modalConvidarEscopoPadrao,
  } = useNavegacao()
  const navigate = useNavigate()
  const location = useLocation()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [searchModalOpen, setSearchModalOpen] = useState(false)

  // Suporte global a atalho de teclado Ctrl+K ou ⌘K
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        setSearchModalOpen((prev) => !prev)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  interface NavRailItem {
    name: string
    path: string
    icon: React.ElementType
    badgeCount?: number
    highlight?: boolean
  }

  // Itens do Rail Lateral Esquerdo Fixo: Dashboard até Configurações
  const navItemsInternal: NavRailItem[] = [
    { name: 'Dashboard', path: '/', icon: LayoutDashboard },
    {
      name: 'Folha do Dia',
      path: '/folha',
      icon: FileEdit,
      badgeCount: folhaItems.filter((f) => f.status === 'pendente').length,
    },
    {
      name: 'Calendário',
      path: '/calendario',
      icon: CalendarDays,
    },
    { name: 'Fluxo Kanban', path: '/fluxo', icon: KanbanSquare },
    { name: 'Projetos', path: '/projetos', icon: FolderKanban },
    { name: 'Contatos', path: '/contatos', icon: Users },
    { name: 'Arquivos & Pastas', path: '/arquivos', icon: FolderOpen },
    { name: 'Listas & Demandas', path: '/listas', icon: ListTodo },
    { name: 'Clientes & Portal', path: '/clientes', icon: UserCheck },
    { name: 'Equipe & Convites', path: '/equipe', icon: Users },
    { name: 'Agente IA Diamond', path: '/agente', icon: Bot, highlight: true },
    { name: 'Resumos do Dia', path: '/resumos', icon: History },
    { name: 'Configurações', path: '/config', icon: Settings },
  ]

  // Se for Administrador Master, injeta no menu o atalho exclusivo do Painel Master
  if (isMaster) {
    navItemsInternal.push({
      name: 'Master',
      path: '/master',
      icon: Crown,
      highlight: true,
    })
  }

  // Se for Convidado Externo, o menu lateral do rail filtra APENAS o recurso do escopo dele
  const escopoPrincipal = isConvidadoExterno ? meusEscopos[0] : null
  const navItemsConvidado: NavRailItem[] = []

  if (isConvidadoExterno && escopoPrincipal) {
    if (escopoPrincipal.tipo === 'projeto') {
      navItemsConvidado.push({
        name: 'Meu Projeto',
        path: escopoPrincipal.id ? `/projetos/${escopoPrincipal.id}` : '/projetos',
        icon: FolderKanban,
      })
    } else if (escopoPrincipal.tipo === 'fluxo' || escopoPrincipal.tipo === 'categoria') {
      navItemsConvidado.push({
        name: 'Meu Fluxo',
        path: escopoPrincipal.id ? `/fluxo?id=${escopoPrincipal.id}` : '/fluxo',
        icon: KanbanSquare,
      })
    } else if (escopoPrincipal.tipo === 'demanda') {
      navItemsConvidado.push({
        name: 'Minha Demanda',
        path: escopoPrincipal.id ? `/folha?demanda=${escopoPrincipal.id}` : '/folha',
        icon: FileEdit,
      })
    } else if (escopoPrincipal.tipo === 'cliente') {
      navItemsConvidado.push({
        name: 'Meu Cliente',
        path: escopoPrincipal.id ? `/clientes/${escopoPrincipal.id}` : '/clientes',
        icon: UserCheck,
      })
    }
  }

  // Navegação Portal do Cliente
  const navItemsClient: NavRailItem[] = [
    { name: 'Meus Projetos', path: '/portal', icon: FolderKanban },
    { name: 'Demandas & Entregas', path: '/portal/demandas', icon: ListTodo },
    { name: 'Resumos & Estado', path: '/resumos', icon: History },
  ]

  const currentNavItems = isClientPortal
    ? navItemsClient
    : isConvidadoExterno
      ? navItemsConvidado
      : navItemsInternal

  const isAuthRoute =
    [
      '/login',
      '/signup',
      '/verify-email',
      '/forgot-password',
      '/reset-password',
      '/onboarding',
    ].includes(location.pathname) ||
    location.pathname.startsWith('/convite/') ||
    location.pathname.startsWith('/f/')

  if (isAuthRoute) {
    return <main className="min-h-screen bg-[#F4F2EE]">{children}</main>
  }

  // Verifica se o item do rail está ativo
  const isItemActive = (path: string) => {
    if (path === '/') return location.pathname === '/'
    return location.pathname.startsWith(path)
  }

  return (
    <div className="flex min-h-screen bg-[#F4F2EE] text-[#1A1D21]">
      {/* ======================================================== */}
      {/* 1. RAIL FIXO DA ESQUERDA (ÍCONES DO DASHBOARD A CONFIG)  */}
      {/* ======================================================== */}
      <aside className="hidden md:flex flex-col w-[68px] border-r border-[#E5E1D8] bg-[#1A1D21] text-white shrink-0 z-30 select-none">
        {/* Logo Diamond no topo do rail */}
        <div className="h-14 flex items-center justify-center border-b border-white/10 shrink-0">
          <button
            onClick={() => {
              navigate('/')
              setColunaSecundariaAberta(true)
            }}
            title="Agenda IA Diamond"
            className="w-10 h-10 rounded-xl bg-[#0F766E] flex items-center justify-center text-white shadow-sm hover:scale-105 transition-transform"
          >
            <Sparkles className="w-5 h-5 text-white" />
          </button>
        </div>

        {/* Lista de Ícones do Rail */}
        <nav className="flex-1 py-3 px-1.5 space-y-1 overflow-y-auto flex flex-col items-center">
          {currentNavItems.map((item) => {
            const Icon = item.icon
            const active = isItemActive(item.path)

            return (
              <NavLink
                key={item.path}
                to={item.path}
                onClick={() => {
                  // Ao clicar em qualquer ícone do rail, garante que a segunda coluna abre
                  setColunaSecundariaAberta(true)
                }}
                title={item.name}
                className={`relative group flex flex-col items-center justify-center w-12 h-12 rounded-xl transition-all ${
                  active
                    ? 'bg-[#0F766E] text-white shadow-md'
                    : 'text-zinc-400 hover:text-white hover:bg-white/10'
                }`}
              >
                <Icon
                  className={`w-5 h-5 ${active ? 'text-white' : 'text-zinc-400 group-hover:text-white'}`}
                />
                <span className="text-[9px] mt-0.5 tracking-tight font-medium truncate max-w-[44px] leading-none opacity-85">
                  {item.name.split(' ')[0]}
                </span>

                {/* Badge numérica (ex: pendentes da folha) */}
                {typeof item.badgeCount === 'number' && item.badgeCount > 0 && (
                  <span className="absolute -top-1 -right-1 w-4 h-4 bg-amber-500 text-white font-bold text-[9px] rounded-full flex items-center justify-center shadow-xs">
                    {item.badgeCount > 9 ? '9+' : item.badgeCount}
                  </span>
                )}

                {/* Pulso do Agente IA */}
                {item.highlight && !active && (
                  <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-[#0F766E] animate-pulse" />
                )}
              </NavLink>
            )
          })}
        </nav>

        {/* Rodapé do Rail: Usuário & Sair */}
        <div className="p-2 border-t border-white/10 flex flex-col items-center gap-2 shrink-0">
          <div
            title={`${user?.name || user?.email} (${isClientPortal ? clienteProfile?.empresa || 'Cliente' : 'Estrategista'})`}
            className="w-9 h-9 rounded-full bg-white/15 border border-white/20 flex items-center justify-center text-xs font-bold text-white cursor-default"
          >
            {user?.name?.[0] || user?.email?.[0]?.toUpperCase() || 'U'}
          </div>
          <button
            onClick={() => signOut()}
            title="Sair da Conta"
            className="w-9 h-9 rounded-lg flex items-center justify-center text-zinc-400 hover:text-red-400 hover:bg-white/10 transition-colors"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </aside>

      {/* ======================================================== */}
      {/* 2. SEGUNDA COLUNA CONTEXTUAL (DIAMONDGROUP MODEL)        */}
      {/* ======================================================== */}
      {colunaSecundariaAberta && (
        <aside className="hidden md:flex flex-col w-[260px] lg:w-[280px] border-r border-[#E5E1D8] bg-white shadow-xs shrink-0 z-20">
          <NavContextColumn />
        </aside>
      )}

      {/* ======================================================== */}
      {/* 3. ÁREA DE CONTEÚDO PRINCIPAL (DIREITA DAS DUAS COLUNAS) */}
      {/* ======================================================== */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Topbar Superior */}
        <header className="h-14 border-b border-[#E5E1D8] bg-white flex items-center justify-between px-4 sticky top-0 z-10">
          <div className="flex items-center gap-2.5">
            {/* Botão Mobile para abrir navegação completa */}
            <button
              className="md:hidden p-1.5 rounded-lg border border-[#E5E1D8] text-[#5B6470]"
              onClick={() => setMobileMenuOpen(true)}
              aria-label="Abrir menu"
            >
              <Menu className="w-5 h-5" />
            </button>

            {/* Toggle Desktop para recolher/expandir a segunda coluna contextual */}
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={toggleColunaSecundaria}
              className="hidden md:inline-flex text-xs h-8 px-2 text-[#5B6470] hover:text-[#1A1D21] hover:bg-[#F4F2EE] gap-1.5 border border-[#E5E1D8]"
              title={
                colunaSecundariaAberta ? 'Recolher coluna contextual' : 'Expandir coluna contextual'
              }
            >
              {colunaSecundariaAberta ? (
                <>
                  <PanelLeftClose className="w-4 h-4 text-[#0F766E]" />
                  <span className="text-[11px] font-medium hidden lg:inline">Recolher Coluna</span>
                </>
              ) : (
                <>
                  <PanelLeftOpen className="w-4 h-4 text-[#0F766E]" />
                  <span className="text-[11px] font-medium hidden lg:inline">Abrir Coluna</span>
                </>
              )}
            </Button>

            {/* Breadcrumb da rota ativa */}
            <div className="hidden sm:flex items-center text-xs text-[#5B6470] gap-1.5">
              <span className="font-semibold text-[#1A1D21]">Agenda IA Diamond</span>
              <span>/</span>
              <span className="capitalize font-medium text-[#0F766E]">
                {location.pathname.replace('/', '') || 'Dashboard'}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Sino de Notificações & Lembretes Automáticos */}
            <SinoNotificacoes />

            {/* Botão de Busca Global */}
            <div className="relative">
              <button
                onClick={() => setSearchModalOpen(true)}
                className="flex items-center gap-2 px-3 py-1.5 text-xs text-[#5B6470] bg-[#F4F2EE] hover:bg-[#E5E1D8]/60 rounded-lg border border-[#E5E1D8] transition-colors"
              >
                <Search className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Buscar cards, contatos...</span>
                <kbd className="hidden sm:inline text-[10px] bg-white border border-[#E5E1D8] px-1 rounded text-[#5B6470]">
                  Ctrl+K
                </kbd>
              </button>
            </div>

            {/* Atalho Rápido Folha do Dia */}
            {!isClientPortal && (
              <Button
                size="sm"
                onClick={() => navigate('/folha')}
                className="bg-[#0F766E] hover:bg-[#0D5C56] text-white text-xs h-8 px-3 gap-1.5 font-medium shadow-sm"
              >
                <FileEdit className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Capturar na Folha</span>
              </Button>
            )}
          </div>
        </header>

        {/* Content Body */}
        <main className="flex-1 p-4 md:p-6 overflow-y-auto">{children}</main>
      </div>

      {/* ======================================================== */}
      {/* 4. DRAWER MOBILE COMPLETO COM RAIL E SEGUNDA COLUNA      */}
      {/* ======================================================== */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 flex md:hidden">
          <div
            className="fixed inset-0 bg-black/50 backdrop-blur-xs transition-opacity"
            onClick={() => setMobileMenuOpen(false)}
          />
          <div className="relative flex flex-row w-full max-w-sm bg-white h-full shadow-2xl z-10 border-r border-[#E5E1D8] overflow-hidden">
            {/* Rail Mobile Esquerdo */}
            <div className="w-[60px] bg-[#1A1D21] flex flex-col items-center py-3 border-r border-white/10 shrink-0">
              <div className="w-8 h-8 rounded-lg bg-[#0F766E] flex items-center justify-center text-white mb-3">
                <Sparkles className="w-4 h-4" />
              </div>
              <div className="flex-1 space-y-1 overflow-y-auto">
                {currentNavItems.map((item) => {
                  const Icon = item.icon
                  const active = isItemActive(item.path)
                  return (
                    <button
                      key={item.path}
                      onClick={() => {
                        navigate(item.path)
                      }}
                      className={`w-11 h-11 rounded-lg flex items-center justify-center transition-colors ${
                        active ? 'bg-[#0F766E] text-white' : 'text-zinc-400 hover:text-white'
                      }`}
                      title={item.name}
                    >
                      <Icon className="w-4 h-4" />
                    </button>
                  )
                })}
              </div>
              <button
                onClick={() => {
                  setMobileMenuOpen(false)
                  signOut()
                }}
                className="w-10 h-10 rounded-lg flex items-center justify-center text-zinc-400 hover:text-red-400"
                title="Sair"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>

            {/* Segunda Coluna Mobile */}
            <div className="flex-1 flex flex-col bg-white overflow-hidden">
              <div className="p-3 border-b border-[#E5E1D8] flex items-center justify-between bg-[#FAFAF9]">
                <span className="font-bold text-xs text-[#0F766E] uppercase tracking-wider">
                  Menu Contextual
                </span>
                <button
                  onClick={() => setMobileMenuOpen(false)}
                  className="p-1 rounded text-[#5B6470] hover:bg-[#E5E1D8]"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="flex-1 overflow-y-auto">
                <NavContextColumn onCloseMobile={() => setMobileMenuOpen(false)} />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Fase 3: Command Palette Global (Ctrl+K / ⌘K) */}
      <CommandPaletteGlobal open={searchModalOpen} onOpenChange={setSearchModalOpen} />

      {/* Modal Reutilizável de Convite de Equipe */}
      <ModalConvidarEquipe
        open={modalConvidarEquipeOpen}
        onOpenChange={setModalConvidarEquipeOpen}
        escopoInicial={modalConvidarEscopoPadrao}
      />

      {/* Botão Flutuante Global de Feedback e Relato de Testes */}
      <BotaoFeedbackFlutuante />
    </div>
  )
}
