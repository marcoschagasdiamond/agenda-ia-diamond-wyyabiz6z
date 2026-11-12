// Coluna contextual do Chat interno (segunda coluna no /chat, desktop).
// Busca, abas Todas/Não lidas, lista de conversas individuais e grupos com
// badge de não lidas, colaboradores para iniciar conversa e modal de novo
// grupo. A conversa aberta (alvo) vem do NavegacaoContext, compartilhada com
// a página /chat.
import { useCallback, useEffect, useMemo, useState } from 'react'
import { Plus, Search, Users } from 'lucide-react'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useAuth } from '@/hooks/use-auth'
import { useNavegacao } from '@/contexts/NavegacaoContext'
import ModalNovoGrupoChat from '@/components/chat/ModalNovoGrupoChat'
import type { AbaConversas } from '@/components/chat/tiposChat'
import {
  listarColaboradores,
  listarConversas,
  listarGruposDoUsuario,
} from '@/services/chatMensagens'
import type { ChatConversaResumo, ChatGrupo, ColaboradorChat } from '@/types'

function iniciais(nome: string): string {
  const partes = nome.trim().split(/\s+/)
  return partes.length >= 2
    ? (partes[0][0] + partes[partes.length - 1][0]).toUpperCase()
    : nome.slice(0, 2).toUpperCase()
}

function horaCurta(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  const hoje = new Date()
  const mesmoDia = d.toDateString() === hoje.toDateString()
  const hora = d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
  if (mesmoDia) return hora
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }) + ' ' + hora
}

export default function ColunaChat() {
  const { user } = useAuth()
  const meuId = user?.id ?? ''
  const { chatAlvo, setChatAlvo } = useNavegacao()

  const [conversas, setConversas] = useState<ChatConversaResumo[]>([])
  const [grupos, setGrupos] = useState<ChatGrupo[]>([])
  const [colaboradores, setColaboradores] = useState<ColaboradorChat[]>([])
  const [busca, setBusca] = useState('')
  const [aba, setAba] = useState<AbaConversas>('todas')
  const [modalGrupoAberto, setModalGrupoAberto] = useState(false)

  const nomeDe = useCallback(
    (id: string) => colaboradores.find((c) => c.id === id)?.nome || 'Colaborador',
    [colaboradores],
  )

  const atualizar = useCallback(async () => {
    if (!meuId) return
    try {
      const [lista, gs] = await Promise.all([listarConversas(meuId), listarGruposDoUsuario()])
      setConversas(lista)
      setGrupos(gs)
    } catch {
      // silencioso
    }
  }, [meuId])

  useEffect(() => {
    if (!meuId) return
    let vivo = true
    listarColaboradores()
      .then((lista) => {
        if (vivo) setColaboradores(lista.filter((c) => c.id !== meuId))
      })
      .catch(() => undefined)
    atualizar()
    const interval = window.setInterval(atualizar, 5000)
    return () => {
      vivo = false
      window.clearInterval(interval)
    }
  }, [meuId, atualizar])

  const conversasFiltradas = useMemo(() => {
    const termo = busca.trim().toLowerCase()
    let lista = conversas.map((c) => (c.eh_grupo ? c : { ...c, nome: nomeDe(c.usuario_id || '') }))
    if (aba === 'nao_lidas') lista = lista.filter((c) => c.nao_lidas > 0)
    if (termo) {
      lista = lista.filter(
        (c) =>
          c.nome.toLowerCase().includes(termo) ||
          (c.ultima || '').toLowerCase().includes(termo) ||
          (c.nomes_anexos || []).some((a) => a.toLowerCase().includes(termo)),
      )
    }
    return lista
  }, [conversas, busca, aba, nomeDe])

  const naoLidasTotal = useMemo(() => conversas.reduce((s, c) => s + c.nao_lidas, 0), [conversas])

  const colaboradoresSemConversa = colaboradores.filter(
    (c) =>
      !conversas.some((conv) => !conv.eh_grupo && conv.usuario_id === c.id) &&
      (!busca.trim() || c.nome.toLowerCase().includes(busca.trim().toLowerCase())),
  )

  function abrirConversa(c: ChatConversaResumo) {
    if (c.eh_grupo) {
      setChatAlvo({ tipo: 'grupo', id: c.grupo_id!, nome: c.nome })
    } else {
      setChatAlvo({
        tipo: 'individual',
        id: c.usuario_id!,
        nome: colaboradores.find((x) => x.id === c.usuario_id)?.nome || c.nome,
      })
    }
  }

  return (
    <div className="flex flex-col h-full bg-white text-[#1A1D21] select-none">
      {/* Topo */}
      <div className="p-3.5 border-b border-[#E5E1D8] flex items-center justify-between bg-white shrink-0">
        <div>
          <h2 className="text-sm font-bold text-[#1A1D21] tracking-tight">Chat Interno</h2>
          <p className="text-[10px] text-[#5B6470]">
            {conversas.length} conversa{conversas.length === 1 ? '' : 's'} • {grupos.length} grupo
            {grupos.length === 1 ? '' : 's'}
          </p>
        </div>
        <Button
          size="sm"
          onClick={() => setModalGrupoAberto(true)}
          className="bg-[#0F766E] hover:bg-[#0D5C56] text-white text-xs h-7 px-2.5 gap-1 font-medium shadow-2xs"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Grupo</span>
        </Button>
      </div>

      {/* Busca e abas */}
      <div className="p-2 border-b border-[#E5E1D8] bg-[#FAFAF9] shrink-0 space-y-2">
        <div className="relative">
          <Search className="w-3.5 h-3.5 absolute left-2.5 top-2 text-[#5B6470]" />
          <Input
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Buscar conversa, grupo ou anexo..."
            className="pl-8 text-xs h-7.5 bg-white border-[#E5E1D8]"
          />
        </div>
        <div className="flex gap-1">
          <button
            type="button"
            onClick={() => setAba('todas')}
            className={`flex-1 rounded-full py-1 text-xs font-medium transition-colors ${
              aba === 'todas'
                ? 'bg-[#0F766E] text-white'
                : 'bg-[#E5E1D8]/60 text-[#5B6470] hover:bg-[#E5E1D8]'
            }`}
          >
            Todas
          </button>
          <button
            type="button"
            onClick={() => setAba('nao_lidas')}
            className={`flex-1 rounded-full py-1 text-xs font-medium transition-colors ${
              aba === 'nao_lidas'
                ? 'bg-[#0F766E] text-white'
                : 'bg-[#E5E1D8]/60 text-[#5B6470] hover:bg-[#E5E1D8]'
            }`}
          >
            Não lidas{naoLidasTotal > 0 ? ` (${naoLidasTotal})` : ''}
          </button>
        </div>
      </div>

      {/* Lista de conversas e grupos */}
      <div className="flex-1 p-2 space-y-1 overflow-y-auto">
        {conversasFiltradas.map((c) => {
          const alvoId = c.eh_grupo ? c.grupo_id : c.usuario_id
          const ativa = chatAlvo?.id === alvoId
          return (
            <button
              key={c.eh_grupo ? `g:${c.grupo_id}` : `u:${c.usuario_id}`}
              type="button"
              onClick={() => abrirConversa(c)}
              className={`w-full text-left p-2 rounded-lg border transition-all block ${
                ativa
                  ? 'bg-[#0F766E]/10 border-[#0F766E] shadow-2xs'
                  : 'bg-white border-[#E5E1D8]/80 hover:bg-[#FAFAF9]'
              }`}
            >
              <div className="flex items-center gap-2">
                {c.eh_grupo ? (
                  <div className="h-8 w-8 rounded-full bg-[#0F766E]/10 flex items-center justify-center shrink-0">
                    <Users className="h-4 w-4 text-[#0F766E]" />
                  </div>
                ) : (
                  <Avatar className="h-8 w-8">
                    <AvatarFallback className="bg-[#0F766E]/10 text-[#0F766E] text-[10px] font-semibold">
                      {iniciais(c.nome)}
                    </AvatarFallback>
                  </Avatar>
                )}
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-1.5">
                    <span className="text-xs font-bold text-[#1A1D21] truncate">{c.nome}</span>
                    <span className="text-[9px] text-[#5B6470] shrink-0">
                      {horaCurta(c.ultima_criada_em)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between gap-1.5 mt-0.5">
                    <span className="text-[11px] text-[#5B6470] truncate">
                      {c.ultima_propria && 'Você: '}
                      {c.ultima || 'Novo grupo de conversa'}
                    </span>
                    {c.nao_lidas > 0 && (
                      <span className="shrink-0 bg-[#25d366] text-white text-[10px] font-semibold rounded-full min-w-[18px] h-4.5 px-1.5 flex items-center justify-center">
                        {c.nao_lidas > 9 ? '9+' : c.nao_lidas}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </button>
          )
        })}

        {conversasFiltradas.length === 0 && (
          <p className="text-[11px] text-[#5B6470] text-center py-4 px-2">
            {aba === 'nao_lidas' ? 'Nenhuma conversa não lida.' : 'Nenhuma conversa encontrada.'}
          </p>
        )}

        {/* Iniciar conversa individual */}
        {colaboradoresSemConversa.length > 0 && (
          <div className="pt-2 border-t border-[#E5E1D8] mt-2">
            <p className="text-[10px] font-bold text-[#5B6470] uppercase tracking-wider px-2 mb-1.5">
              Colaboradores
            </p>
            <div className="space-y-0.5">
              {colaboradoresSemConversa.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => setChatAlvo({ tipo: 'individual', id: c.id, nome: c.nome })}
                  className="w-full flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-[#F4F2EE] text-left"
                >
                  <Avatar className="h-7 w-7">
                    <AvatarFallback className="bg-[#E5E1D8]/60 text-[#5B6470] text-[10px] font-semibold">
                      {iniciais(c.nome)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0">
                    <p className="text-xs text-[#1A1D21] truncate">{c.nome}</p>
                    <p className="text-[10px] text-[#5B6470] truncate">{c.email}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      <ModalNovoGrupoChat
        aberto={modalGrupoAberto}
        onFechar={() => setModalGrupoAberto(false)}
        colaboradores={colaboradores}
        meuId={meuId}
        onCriada={(g) => {
          setGrupos((prev) => [g, ...prev])
          setChatAlvo({ tipo: 'grupo', id: g.id, nome: g.nome })
          void atualizar()
        }}
      />
    </div>
  )
}
