import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Settings, LogOut, ChevronUp, UserRound, Building2 } from 'lucide-react'
import { useAuth } from '@/hooks/use-auth'
import { cn } from '@/lib/utils'

interface BlocoUsuarioProps {
  /** Variante compacta para o rail estreito (desktop e mobile) */
  compacto?: boolean
  /** Fecha o drawer mobile, se fornecido (após navegar ou sair) */
  onAcao?: () => void
}

/**
 * Bloco clicável de usuário no rodapé do menu lateral.
 * Mostra avatar com inicial + nome + e-mail (e empresa, no portal do cliente).
 * Ao clicar, abre menu suspenso com "Meu Perfil", "Configurações" e "Sair da Conta".
 */
export default function BlocoUsuario({ compacto = false, onAcao }: BlocoUsuarioProps) {
  const { user, clienteProfile, isClientPortal, signOut } = useAuth()
  const navigate = useNavigate()
  const [menuAberto, setMenuAberto] = useState(false)
  const containerRef = useRef<HTMLDivElement | null>(null)

  const nome = user?.name?.trim() || user?.email?.split('@')[0] || 'Usuário'
  const email = user?.email || ''
  const inicial = nome?.[0]?.toUpperCase() || 'U'
  const empresa = isClientPortal ? clienteProfile?.empresa || clienteProfile?.nome || '' : ''

  // Fecha o menu ao clicar fora ou ao pressionar Escape
  useEffect(() => {
    if (!menuAberto) return
    const onClickFora = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setMenuAberto(false)
      }
    }
    const onEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMenuAberto(false)
    }
    document.addEventListener('mousedown', onClickFora)
    document.addEventListener('keydown', onEscape)
    return () => {
      document.removeEventListener('mousedown', onClickFora)
      document.removeEventListener('keydown', onEscape)
    }
  }, [menuAberto])

  const irPara = (rota: string) => {
    setMenuAberto(false)
    onAcao?.()
    navigate(rota)
  }

  const sair = () => {
    setMenuAberto(false)
    onAcao?.()
    signOut()
    navigate('/login', { replace: true })
  }

  if (!user) return null

  return (
    <div ref={containerRef} className="relative w-full">
      {/* Bloco clicável: avatar + nome + e-mail (ou versão compacta só com avatar) */}
      <button
        type="button"
        onClick={() => setMenuAberto((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={menuAberto}
        title={compacto ? `${nome} — abrir menu do usuário` : undefined}
        className={cn(
          'w-full flex items-center gap-2 rounded-xl transition-colors text-left',
          'hover:bg-white/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#0F766E]',
          menuAberto && 'bg-white/10',
          compacto
            ? 'p-1.5 justify-center'
            : 'px-2.5 py-2 bg-white/10 border border-white/10 hover:border-white/20',
        )}
      >
        {/* Avatar circular com a inicial */}
        <span className="w-8 h-8 shrink-0 rounded-full bg-[#0F766E] border border-white/20 flex items-center justify-center text-xs font-bold text-white">
          {inicial}
        </span>

        {!compacto && (
          <span className="flex-1 min-w-0 flex flex-col">
            <span className="text-xs font-semibold text-white truncate leading-tight">{nome}</span>
            <span className="text-[10px] text-zinc-400 truncate leading-tight">{email}</span>
            {empresa && (
              <span className="flex items-center gap-1 mt-0.5">
                <Building2 className="w-3 h-3 text-[#0F766E]" />
                <span className="text-[10px] text-[#5BD6C4] truncate leading-tight">{empresa}</span>
              </span>
            )}
          </span>
        )}

        {!compacto && (
          <ChevronUp
            className={cn(
              'w-3.5 h-3.5 shrink-0 text-zinc-400 transition-transform',
              menuAberto && 'rotate-180',
            )}
          />
        )}
      </button>

      {/* Menu suspenso */}
      {menuAberto && (
        <div
          role="menu"
          className={cn(
            'absolute bottom-full mb-2 w-52 rounded-xl bg-white shadow-lg border border-[#E5E1D8] overflow-hidden z-50',
            compacto ? 'left-2' : 'left-0 right-0',
          )}
        >
          {/* Cabeçalho do menu (repete nome + e-mail para contexto) */}
          <div className="px-3 py-2 border-b border-[#E5E1D8] bg-[#F4F2EE]">
            <p className="text-xs font-semibold text-[#1A1D21] truncate">{nome}</p>
            <p className="text-[10px] text-[#5B6470] truncate">{email}</p>
            {empresa && (
              <p className="text-[10px] text-[#0F766E] truncate flex items-center gap-1">
                <Building2 className="w-3 h-3" />
                {empresa}
              </p>
            )}
          </div>

          <button
            type="button"
            role="menuitem"
            onClick={() => irPara('/perfil')}
            className="w-full flex items-center gap-2.5 px-3 py-2.5 text-xs font-medium text-[#1A1D21] hover:bg-[#F4F2EE] transition-colors"
          >
            <UserRound className="w-4 h-4 text-[#0F766E]" />
            Meu Perfil
          </button>

          <button
            type="button"
            role="menuitem"
            onClick={() => irPara('/config')}
            className="w-full flex items-center gap-2.5 px-3 py-2.5 text-xs font-medium text-[#1A1D21] hover:bg-[#F4F2EE] transition-colors"
          >
            <Settings className="w-4 h-4 text-[#0F766E]" />
            Configurações
          </button>

          <div className="border-t border-[#E5E1D8]">
            <button
              type="button"
              role="menuitem"
              onClick={sair}
              className="w-full flex items-center gap-2.5 px-3 py-2.5 text-xs font-medium text-red-600 hover:bg-red-50 transition-colors"
            >
              <LogOut className="w-4 h-4" />
              Sair da Conta
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
