import React, { useState } from 'react'
import { NavLink, useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '@/hooks/use-auth'
import {
  LayoutDashboard,
  FileEdit,
  KanbanSquare,
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
  ShieldCheck,
  Building2,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'

interface LayoutProps {
  children?: React.ReactNode
}

export default function Layout({ children }: LayoutProps) {
  const { user, profile, clienteProfile, isClientPortal, signOut } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [searchModalOpen, setSearchModalOpen] = useState(false)

  interface NavItem {
    name: string
    path: string
    icon: React.ElementType
    badge?: string
    highlight?: boolean
  }

  // Navegação para Usuário Interno (Dono / Equipe)
  const navItemsInternal: NavItem[] = [
    { name: 'Dashboard', path: '/', icon: LayoutDashboard },
    { name: 'Folha do Dia', path: '/folha', icon: FileEdit, badge: 'Captura' },
    { name: 'Fluxo Kanban', path: '/fluxo', icon: KanbanSquare },
    { name: 'Projetos', path: '/projetos', icon: FolderKanban },
    { name: 'Contatos', path: '/contatos', icon: Users },
    { name: 'Arquivos & Pastas', path: '/arquivos', icon: FolderOpen },
    { name: 'Listas & Demandas', path: '/listas', icon: ListTodo },
    { name: 'Clientes & Portal', path: '/clientes', icon: UserCheck },
    { name: 'Agente IA Diamond', path: '/agente', icon: Bot, highlight: true },
    { name: 'Resumos do Dia', path: '/resumos', icon: History },
    { name: 'Configurações', path: '/config', icon: Settings },
  ]

  // Navegação para o Portal do Cliente
  const navItemsClient: NavItem[] = [
    { name: 'Meus Projetos', path: '/portal', icon: FolderKanban },
    { name: 'Demandas & Entregas', path: '/portal/demandas', icon: ListTodo },
    { name: 'Resumos & Estado', path: '/resumos', icon: History },
  ]

  const currentNavItems = isClientPortal ? navItemsClient : navItemsInternal

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!searchQuery.trim()) return
    setSearchModalOpen(false)
    navigate(`/fluxo?busca=${encodeURIComponent(searchQuery)}`)
  }

  const isAuthRoute = [
    '/login',
    '/signup',
    '/verify-email',
    '/forgot-password',
    '/reset-password',
    '/onboarding',
  ].includes(location.pathname)

  // Se for tela de autenticação ou onboarding sem login ainda, renderiza limpo sem sidebar
  if (isAuthRoute) {
    return <main className="min-h-screen bg-[#F4F2EE]">{children}</main>
  }

  return (
    <div className="flex min-h-screen bg-[#F4F2EE] text-[#1A1D21]">
      {/* Sidebar Desktop (220px) */}
      <aside className="hidden md:flex flex-col w-[230px] border-r border-[#E5E1D8] bg-white shadow-sm shrink-0">
        <div className="p-4 border-b border-[#E5E1D8] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-[#0F766E] flex items-center justify-center text-white shadow-sm font-bold">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <span className="font-bold tracking-tight text-sm text-[#0F766E] block leading-none">
                DIAMOND
              </span>
              <span className="text-[10px] text-[#5B6470] tracking-wider uppercase font-semibold">
                Segundo Cérebro
              </span>
            </div>
          </div>
          {isClientPortal && (
            <Badge
              variant="outline"
              className="text-[10px] bg-amber-50 text-amber-700 border-amber-200"
            >
              Portal
            </Badge>
          )}
        </div>

        {/* Links de Navegação */}
        <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
          {currentNavItems.map((item) => {
            const Icon = item.icon
            const isActive =
              location.pathname === item.path ||
              (item.path !== '/' && location.pathname.startsWith(item.path))
            return (
              <NavLink
                key={item.path}
                to={item.path}
                className={`flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
                  isActive
                    ? 'bg-[#0F766E] text-white shadow-sm'
                    : 'text-[#5B6470] hover:bg-[#F4F2EE] hover:text-[#1A1D21]'
                }`}
              >
                <div className="flex items-center gap-2.5 truncate">
                  <Icon
                    className={`w-4 h-4 shrink-0 ${isActive ? 'text-white' : 'text-[#5B6470]'}`}
                  />
                  <span className="truncate">{item.name}</span>
                </div>
                {item.badge && (
                  <span
                    className={`text-[10px] px-1.5 py-0.5 rounded font-semibold ${
                      isActive ? 'bg-white/20 text-white' : 'bg-[#E5E1D8] text-[#5B6470]'
                    }`}
                  >
                    {item.badge}
                  </span>
                )}
                {item.highlight && !isActive && (
                  <span className="w-2 h-2 rounded-full bg-[#0F766E] animate-pulse" />
                )}
              </NavLink>
            )
          })}
        </nav>

        {/* Rodapé do Usuário / Sair */}
        <div className="p-3 border-t border-[#E5E1D8] bg-[#FAFAF9]">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2 truncate">
              <div className="w-7 h-7 rounded-full bg-[#E5E1D8] flex items-center justify-center font-bold text-xs text-[#0F766E] shrink-0">
                {user?.name?.[0] || user?.email?.[0]?.toUpperCase() || 'U'}
              </div>
              <div className="truncate text-left">
                <p className="text-xs font-semibold text-[#1A1D21] truncate">
                  {user?.name || user?.email?.split('@')[0]}
                </p>
                <p className="text-[10px] text-[#5B6470] truncate">
                  {isClientPortal ? clienteProfile?.empresa || 'Cliente' : 'Estrategista'}
                </p>
              </div>
            </div>
            <button
              onClick={() => signOut()}
              title="Sair"
              className="p-1.5 text-[#5B6470] hover:text-red-600 rounded-md hover:bg-white transition-colors"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Topbar */}
        <header className="h-14 border-b border-[#E5E1D8] bg-white flex items-center justify-between px-4 sticky top-0 z-20">
          <div className="flex items-center gap-3">
            <button
              className="md:hidden p-1.5 rounded-lg border border-[#E5E1D8] text-[#5B6470]"
              onClick={() => setMobileMenuOpen(true)}
            >
              <Menu className="w-5 h-5" />
            </button>
            <div className="hidden sm:flex items-center text-xs text-[#5B6470] gap-1.5">
              <span className="font-medium text-[#1A1D21]">Agenda IA Diamond</span>
              <span>/</span>
              <span className="capitalize">
                {location.pathname.replace('/', '') || 'Dashboard'}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Botão de Busca Global */}
            <div className="relative">
              <button
                onClick={() => setSearchModalOpen(true)}
                className="flex items-center gap-2 px-3 py-1.5 text-xs text-[#5B6470] bg-[#F4F2EE] hover:bg-[#E5E1D8]/60 rounded-lg border border-[#E5E1D8] transition-colors"
              >
                <Search className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Buscar cards, contatos, projetos...</span>
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

      {/* Drawer Mobile */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 flex md:hidden">
          <div
            className="fixed inset-0 bg-black/40 backdrop-blur-xs transition-opacity"
            onClick={() => setMobileMenuOpen(false)}
          />
          <div className="relative flex flex-col w-64 max-w-xs bg-white h-full shadow-2xl z-10 border-r border-[#E5E1D8]">
            <div className="p-4 border-b border-[#E5E1D8] flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-[#0F766E] flex items-center justify-center text-white font-bold">
                  <Sparkles className="w-4 h-4" />
                </div>
                <span className="font-bold text-sm text-[#0F766E]">AGENDA DIAMOND</span>
              </div>
              <button
                onClick={() => setMobileMenuOpen(false)}
                className="p-1 rounded-md text-[#5B6470] hover:bg-[#F4F2EE]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
              {currentNavItems.map((item) => {
                const Icon = item.icon
                const isActive = location.pathname === item.path
                return (
                  <NavLink
                    key={item.path}
                    to={item.path}
                    onClick={() => setMobileMenuOpen(false)}
                    className={`flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium ${
                      isActive
                        ? 'bg-[#0F766E] text-white'
                        : 'text-[#5B6470] hover:bg-[#F4F2EE] hover:text-[#1A1D21]'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <Icon className="w-4 h-4" />
                      <span>{item.name}</span>
                    </div>
                    {item.badge && (
                      <span className="text-xs px-1.5 py-0.5 rounded bg-black/10">
                        {item.badge}
                      </span>
                    )}
                  </NavLink>
                )
              })}
            </nav>

            <div className="p-4 border-t border-[#E5E1D8] bg-[#FAFAF9]">
              <Button
                variant="outline"
                className="w-full text-xs text-red-600 border-red-200 hover:bg-red-50 justify-center"
                onClick={() => {
                  setMobileMenuOpen(false)
                  signOut()
                }}
              >
                <LogOut className="w-4 h-4 mr-2" />
                Sair da Conta
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Busca Rápida */}
      <Dialog open={searchModalOpen} onOpenChange={setSearchModalOpen}>
        <DialogContent className="sm:max-w-md p-4 bg-white border border-[#E5E1D8]">
          <DialogHeader>
            <DialogTitle className="text-sm font-semibold text-[#1A1D21]">
              Buscar na Base de Conhecimento
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSearchSubmit} className="space-y-4 pt-2">
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-3 text-[#5B6470]" />
              <Input
                placeholder="Ex: checkout, Loja Y, Helena, contrato..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 text-sm border-[#E5E1D8]"
                autoFocus
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setSearchModalOpen(false)}
                className="text-xs"
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                size="sm"
                className="bg-[#0F766E] hover:bg-[#0D5C56] text-white text-xs"
              >
                Buscar
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
