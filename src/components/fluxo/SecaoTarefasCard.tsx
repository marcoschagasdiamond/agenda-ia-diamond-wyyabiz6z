// Seção "Tarefas do card" (modelo Ummense) — cabeçalho com contador,
// botão azul "Adicionar tarefa" com dropdown e linha de adição rápida
// com ícones (data, descrição, responsável, ...). Não alimenta o Kanban.
import { useState } from 'react'
import {
  CheckCircle2,
  Loader2,
  CalendarDays,
  AlignLeft,
  User,
  MoreHorizontal,
  ChevronDown,
  ChevronRight,
  Circle,
  MoreVertical,
  Pencil,
  Trash2,
} from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { toast } from '@/hooks/use-toast'
import {
  criarTarefaCard,
  atualizarTarefaCard,
  excluirTarefaCard,
  iniciais,
  tempoRelativoPtBr,
  type TarefaCard,
} from '@/services/eventosCard'
import type { MembroEquipe } from '@/types'

interface Props {
  cardId: string
  tarefas: TarefaCard[]
  membros: MembroEquipe[]
  onRecarregar: () => Promise<void> | void
  onTarefaCriada: (titulo: string) => void
}

export default function SecaoTarefasCard({
  cardId,
  tarefas,
  membros,
  onRecarregar,
  onTarefaCriada,
}: Props) {
  const [novaTarefa, setNovaTarefa] = useState('')
  const [expandida, setExpandida] = useState(false)
  const [criando, setCriando] = useState(false)
  const [tarefaExpandidaId, setTarefaExpandidaId] = useState<string | null>(null)
  // Menu 3 pontinhos por tarefa: edição inline de texto
  const [editandoId, setEditandoId] = useState<string | null>(null)
  const [textoEdicao, setTextoEdicao] = useState('')
  // Campos extras da linha de adição rápida (ícones data/descrição/responsável)
  const [comPrazo, setComPrazo] = useState('')
  const [comDescricao, setComDescricao] = useState('')
  const [comResponsavel, setComResponsavel] = useState('')

  const pendentes = tarefas.filter((t) => !t.concluida).length
  const concluidas = tarefas.length - pendentes

  const adicionar = async () => {
    const titulo = novaTarefa.trim()
    if (!titulo || !cardId || criando) return
    setCriando(true)
    try {
      const criada = await criarTarefaCard(cardId, titulo, {
        descricao: comDescricao.trim() || undefined,
        data_limite: comPrazo || undefined,
        responsavel: comResponsavel || undefined,
      })
      if (criada) {
        setNovaTarefa('')
        setComPrazo('')
        setComDescricao('')
        setComResponsavel('')
        await onRecarregar()
        onTarefaCriada(titulo)
        toast({ title: 'Tarefa adicionada ao card!' })
      } else {
        toast({ title: 'Erro ao criar tarefa', variant: 'destructive' })
      }
    } finally {
      setCriando(false)
    }
  }

  const alternarConcluida = async (t: TarefaCard) => {
    await atualizarTarefaCard(t.id, { concluida: !t.concluida })
    await onRecarregar()
  }

  const remover = async (t: TarefaCard) => {
    if (!confirm(`Deseja realmente excluir a tarefa "${t.titulo}"?`)) return
    const ok = await excluirTarefaCard(t.id)
    if (ok) {
      await onRecarregar()
      toast({ title: 'Tarefa removida.' })
    } else {
      toast({ title: 'Erro ao remover tarefa', variant: 'destructive' })
    }
  }

  const salvarEdicao = async (t: TarefaCard) => {
    const titulo = textoEdicao.trim()
    if (!titulo) return
    const ok = await atualizarTarefaCard(t.id, { titulo })
    if (ok) {
      await onRecarregar()
      toast({ title: 'Tarefa atualizada.' })
    } else {
      toast({ title: 'Erro ao atualizar tarefa', variant: 'destructive' })
    }
    setEditandoId(null)
    setTextoEdicao('')
  }

  return (
    <section className="rounded-2xl bg-white border border-[#E5E1D8] p-5 shadow-xs">
      {/* Cabeçalho: título com contador + botão azul "Adicionar tarefa" com dropdown */}
      <div className="flex items-center justify-between gap-3 mb-4">
        <h3 className="text-base font-bold text-[#1A1D21]">
          Tarefas do card{' '}
          <span className="text-sm font-semibold text-[#8A93A0]">({tarefas.length})</span>
        </h3>
        <div className="flex items-center gap-2">
          <Button
            type="button"
            size="sm"
            onClick={() => setExpandida(true)}
            className="bg-[#2563EB] hover:bg-[#1D4ED8] text-white text-xs font-semibold rounded-lg px-3 h-8"
          >
            Adicionar tarefa
          </Button>
          <button
            type="button"
            title="Opções de adição rápida"
            onClick={() => setExpandida((v) => !v)}
            className="w-8 h-8 rounded-lg bg-[#2563EB] hover:bg-[#1D4ED8] text-white flex items-center justify-center"
          >
            <ChevronDown className="w-3.5 h-3.5" />
          </button>
          <MoreHorizontal className="w-4 h-4 text-[#8A93A0]" />
        </div>
      </div>

      {/* Linhas de tarefas */}
      {tarefas.length > 0 && (
        <ul className="space-y-1.5 mb-3">
          {tarefas.map((t) => (
            <li
              key={t.id}
              className="group flex items-start gap-2.5 px-2 py-1.5 rounded-lg hover:bg-[#F4F2EE]"
            >
              <button
                type="button"
                onClick={() => alternarConcluida(t)}
                className="mt-0.5 shrink-0 text-[#0F766E] hover:text-[#0D5C56]"
                title={t.concluida ? 'Reabrir tarefa' : 'Marcar como concluída'}
              >
                {t.concluida ? (
                  <CheckCircle2 className="w-4 h-4" />
                ) : (
                  <Circle className="w-4 h-4" />
                )}
              </button>
              <div className="flex-1 min-w-0">
                {editandoId === t.id ? (
                  <form
                    onSubmit={(e) => {
                      e.preventDefault()
                      salvarEdicao(t)
                    }}
                    className="flex items-center gap-1.5"
                  >
                    <input
                      autoFocus
                      value={textoEdicao}
                      onChange={(e) => setTextoEdicao(e.target.value)}
                      onBlur={() => salvarEdicao(t)}
                      onKeyDown={(e) => {
                        if (e.key === 'Escape') {
                          setEditandoId(null)
                          setTextoEdicao('')
                        }
                      }}
                      className="flex-1 min-w-0 text-xs text-[#1A1D21] bg-white border border-[#0F766E] rounded-md px-2 py-1 outline-none"
                    />
                    <Button
                      type="submit"
                      size="sm"
                      className="h-6 px-2 text-[10px] bg-[#0F766E] hover:bg-[#0D5C56] text-white"
                    >
                      Salvar
                    </Button>
                  </form>
                ) : (
                  <p
                    className={`text-xs ${t.concluida ? 'line-through text-[#8A93A0]' : 'text-[#1A1D21]'}`}
                  >
                    {t.titulo}
                  </p>
                )}
                {(t.data_limite || t.responsavel) && (
                  <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                    {t.data_limite && (
                      <span className="inline-flex items-center gap-1 text-[10px] text-[#5B6470]">
                        <CalendarDays className="w-3 h-3" />
                        {new Date(t.data_limite).toLocaleDateString('pt-BR')}
                      </span>
                    )}
                    {t.expand?.responsavel && (
                      <span className="inline-flex items-center gap-1 text-[10px] text-[#5B6470]">
                        <User className="w-3 h-3" />
                        {t.expand.responsavel.name || t.expand.responsavel.email}
                      </span>
                    )}
                  </div>
                )}
              </div>
              {/* Menu 3 pontinhos: editar texto / excluir tarefa */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button
                    type="button"
                    title="Opções da tarefa"
                    className="opacity-0 group-hover:opacity-100 text-[#CBD5E1] hover:text-[#5B6470] transition-opacity shrink-0"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <MoreVertical className="w-3.5 h-3.5" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-40">
                  <DropdownMenuItem
                    onClick={() => {
                      setEditandoId(t.id)
                      setTextoEdicao(t.titulo)
                    }}
                  >
                    <Pencil className="w-3.5 h-3.5 mr-2" /> Editar texto
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => remover(t)}
                    className="text-red-600 focus:text-red-600"
                  >
                    <Trash2 className="w-3.5 h-3.5 mr-2" /> Excluir tarefa
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </li>
          ))}
        </ul>
      )}

      {/* Linha de adição rápida */}
      <div className="rounded-xl border border-[#E5E1D8] bg-[#FAFAF8] px-3 py-2.5">
        <div className="flex items-center gap-2.5">
          <span className="w-6 h-6 rounded-full border border-[#CBD5E1] flex items-center justify-center text-[#8A93A0] shrink-0">
            <CheckCircle2 className="w-3.5 h-3.5" />
          </span>
          <input
            type="text"
            value={novaTarefa}
            onChange={(e) => setNovaTarefa(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault()
                adicionar()
              }
            }}
            placeholder="Adicionar tarefa"
            className="flex-1 bg-transparent text-xs text-[#1A1D21] placeholder:text-[#B3BAC4] outline-none min-w-0"
          />
          {/* Ícones da linha rápida: data, descrição, responsável, ... */}
          <Popover>
            <PopoverTrigger asChild>
              <button
                type="button"
                title="Definir prazo"
                className="text-[#8A93A0] hover:text-[#0F766E]"
              >
                <CalendarDays className="w-4 h-4" />
              </button>
            </PopoverTrigger>
            <PopoverContent className="w-56 p-3" align="end">
              <p className="text-[10px] font-semibold text-[#8A93A0] uppercase tracking-wider mb-2">
                Prazo da tarefa
              </p>
              <Input
                type="date"
                value={comPrazo}
                onChange={(e) => setComPrazo(e.target.value)}
                className="h-8 text-xs"
              />
            </PopoverContent>
          </Popover>

          <Popover>
            <PopoverTrigger asChild>
              <button
                type="button"
                title="Adicionar descrição"
                className="text-[#8A93A0] hover:text-[#0F766E]"
              >
                <AlignLeft className="w-4 h-4" />
              </button>
            </PopoverTrigger>
            <PopoverContent className="w-72 p-3" align="end">
              <p className="text-[10px] font-semibold text-[#8A93A0] uppercase tracking-wider mb-2">
                Descrição da tarefa
              </p>
              <TextareaAuto onChange={setComDescricao} />
            </PopoverContent>
          </Popover>

          <Popover>
            <PopoverTrigger asChild>
              <button
                type="button"
                title="Definir responsável"
                className="text-[#8A93A0] hover:text-[#0F766E]"
              >
                <User className="w-4 h-4" />
              </button>
            </PopoverTrigger>
            <PopoverContent className="w-60 p-2" align="end">
              <p className="text-[10px] font-semibold text-[#8A93A0] uppercase tracking-wider px-2 pb-1.5">
                Responsável
              </p>
              {membros.length === 0 && (
                <p className="text-xs text-[#8A93A0] px-2 py-1">Nenhum membro na equipe do card.</p>
              )}
              {membros.map((m) => {
                const nome = m.nome || m.email
                const ativo = comResponsavel === m.usuario
                return (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => setComResponsavel(ativo ? '' : m.usuario || '')}
                    className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-left hover:bg-[#F4F2EE] ${ativo ? 'bg-[#0F766E]/10' : ''}`}
                  >
                    <Avatar className="w-5 h-5">
                      <AvatarImage
                        src={`https://img.usecurling.com/ppl/128?seed=${encodeURIComponent(nome)}`}
                        alt={nome}
                      />
                      <AvatarFallback className="bg-gradient-to-br from-[#1E40AF] to-[#0F766E] text-white text-[7px] font-bold">
                        {iniciais(nome)}
                      </AvatarFallback>
                    </Avatar>
                    <span className="text-xs text-[#1A1D21] truncate">{nome}</span>
                  </button>
                )
              })}
            </PopoverContent>
          </Popover>

          <MoreHorizontal className="w-4 h-4 text-[#B3BAC4]" />

          <button
            type="button"
            title="Adicionar tarefa"
            disabled={!novaTarefa.trim() || criando}
            onClick={adicionar}
            className="text-[#8A93A0] hover:text-[#0F766E] disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {criando ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <ChevronRight className="w-4 h-4" />
            )}
          </button>
        </div>
      </div>

      {concluidas > 0 && (
        <p className="text-[10px] text-[#8A93A0] mt-2 px-1">
          {concluidas} de {tarefas.length} concluída{concluidas > 1 ? 's' : ''}
        </p>
      )}
    </section>
  )
}

// Textarea pequeno usado no popover de descrição (evita import circular)
function TextareaAuto({ onChange }: { onChange: (v: string) => void }) {
  const [valor, setValor] = useState('')
  return (
    <textarea
      rows={3}
      value={valor}
      onChange={(e) => {
        setValor(e.target.value)
        onChange(e.target.value)
      }}
      placeholder="Descreva a tarefa..."
      className="w-full text-xs rounded-lg border border-[#E5E1D8] p-2 outline-none focus:ring-1 focus:ring-[#0F766E] resize-none"
    />
  )
}
