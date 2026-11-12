// Modal de criação de grupo de trabalho/conversa do chat interno.
import { useMemo, useState } from 'react'
import { Users, Search } from 'lucide-react'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { criarGrupo } from '@/services/chatMensagens'
import type { ChatGrupo, ColaboradorChat } from '@/types'

function iniciais(nome: string): string {
  const partes = nome.trim().split(/\s+/)
  return partes.length >= 2
    ? (partes[0][0] + partes[partes.length - 1][0]).toUpperCase()
    : nome.slice(0, 2).toUpperCase()
}

interface Props {
  aberto: boolean
  meuId: string
  colaboradores: ColaboradorChat[]
  onFechar: () => void
  /** Chamado após criar: devolve o grupo novo e o criador passa a ser membro. */
  onCriada: (g: ChatGrupo) => void
}

export default function ModalNovoGrupoChat({
  aberto,
  meuId,
  colaboradores,
  onFechar,
  onCriada,
}: Props) {
  const [nome, setNome] = useState('')
  const [descricao, setDescricao] = useState('')
  const [membros, setMembros] = useState<string[]>([])
  const [busca, setBusca] = useState('')
  const [criando, setCriando] = useState(false)

  const filtrados = useMemo(() => {
    const t = busca.trim().toLowerCase()
    if (!t) return colaboradores
    return colaboradores.filter(
      (c) => c.nome.toLowerCase().includes(t) || c.email.toLowerCase().includes(t),
    )
  }, [colaboradores, busca])

  if (!aberto) return null

  function alternarMembro(id: string) {
    setMembros((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]))
  }

  async function criar() {
    const nomeTrim = nome.trim()
    if (!meuId || !nomeTrim || membros.length === 0 || criando) return
    setCriando(true)
    try {
      const g = await criarGrupo({
        nome: nomeTrim,
        descricao: descricao.trim(),
        criadoPorId: meuId,
        membrosIds: membros,
      })
      setNome('')
      setDescricao('')
      setMembros([])
      setBusca('')
      onCriada(g)
    } finally {
      setCriando(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md max-h-[85vh] flex flex-col">
        <div className="px-5 py-4 border-b border-gray-100 flex items-center gap-2">
          <Users className="h-5 w-5 text-[#008069]" />
          <h2 className="text-base font-semibold text-gray-900">Novo grupo de trabalho</h2>
        </div>
        <div className="px-5 py-4 space-y-3 overflow-y-auto">
          <div>
            <label className="text-xs font-medium text-gray-600" htmlFor="chat-grupo-nome">
              Nome do grupo
            </label>
            <Input
              id="chat-grupo-nome"
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              placeholder="Ex.: Equipe Comercial"
              className="mt-1"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-gray-600" htmlFor="chat-grupo-desc">
              Descrição (opcional)
            </label>
            <Input
              id="chat-grupo-desc"
              value={descricao}
              onChange={(e) => setDescricao(e.target.value)}
              placeholder="Sobre o que é o grupo"
              className="mt-1"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-gray-600">Participantes</label>
            <div className="relative mt-1">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-400" />
              <Input
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
                placeholder="Buscar colaborador..."
                className="pl-8"
              />
            </div>
            <div className="mt-2 max-h-48 overflow-y-auto space-y-1 rounded-lg border border-gray-100 p-1">
              {filtrados.map((c) => (
                <label
                  key={c.id}
                  className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-gray-50 cursor-pointer"
                >
                  <input
                    type="checkbox"
                    checked={membros.includes(c.id)}
                    onChange={() => alternarMembro(c.id)}
                    className="accent-[#008069]"
                  />
                  <Avatar className="h-7 w-7">
                    <AvatarFallback className="bg-gray-100 text-gray-600 text-[11px] font-semibold">
                      {iniciais(c.nome)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0">
                    <p className="text-sm text-gray-800 truncate">{c.nome}</p>
                    <p className="text-[11px] text-gray-400 truncate">{c.email}</p>
                  </div>
                </label>
              ))}
              {colaboradores.length === 0 && (
                <p className="text-[11px] text-gray-400 px-2 py-2">
                  Nenhum outro colaborador ativo na equipe.
                </p>
              )}
            </div>
            {membros.length > 0 && (
              <p className="text-[11px] text-gray-500 mt-1">
                {membros.length} participante{membros.length > 1 ? 's' : ''} selecionado
                {membros.length > 1 ? 's' : ''}
              </p>
            )}
          </div>
        </div>
        <div className="px-5 py-3 border-t border-gray-100 flex justify-end gap-2">
          <Button variant="ghost" size="sm" onClick={onFechar} disabled={criando}>
            Cancelar
          </Button>
          <Button
            size="sm"
            onClick={criar}
            disabled={!nome.trim() || membros.length === 0 || criando}
            className="bg-[#008069] hover:bg-[#00695c] text-white"
          >
            {criando ? 'Criando…' : 'Criar grupo'}
          </Button>
        </div>
      </div>
    </div>
  )
}
