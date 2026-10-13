import type { Card as CardType, ColunaFluxo, Projeto, Contato, GrupoFamilia } from '@/types'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Edit2, Sparkles, User as UserIcon, Calendar, ArrowUpRight } from 'lucide-react'

interface FluxoTabelaViewProps {
  cards: CardType[]
  colunasPorChave: Map<string, ColunaFluxo>
  familias: GrupoFamilia[]
  projetos: Projeto[]
  contatos: Contato[]
  onEditarCard: (card: CardType) => void
  onCriarCard: () => void
}

export function FluxoTabelaView({
  cards,
  colunasPorChave,
  familias,
  projetos,
  contatos,
  onEditarCard,
  onCriarCard,
}: FluxoTabelaViewProps) {
  const getContatoNome = (card: CardType) => {
    if (card.expand?.contato?.nome) return card.expand.contato.nome
    if (card.contato) {
      const c = contatos.find((ct) => ct.id === card.contato)
      if (c) return c.nome
    }
    return '-'
  }

  const getProjetoNome = (card: CardType) => {
    if (card.expand?.projeto?.nome) return card.expand.projeto.nome
    if (card.projeto) {
      const p = projetos.find((pj) => pj.id === card.projeto)
      if (p) return p.nome
    }
    return '-'
  }

  const getFamilia = (card: CardType) => {
    if (card.expand?.grupo_familia) return card.expand.grupo_familia
    if (card.grupo_familia) {
      return familias.find((f) => f.id === card.grupo_familia)
    }
    return null
  }

  const getPrioridadeBadge = (p?: string) => {
    switch (p) {
      case 'urgente':
        return <Badge className="bg-red-100 text-red-800 border-red-200 text-[10px]">Urgente</Badge>
      case 'alta':
        return (
          <Badge className="bg-amber-100 text-amber-800 border-amber-200 text-[10px]">Alta</Badge>
        )
      case 'media':
        return (
          <Badge className="bg-blue-100 text-blue-800 border-blue-200 text-[10px]">Média</Badge>
        )
      default:
        return (
          <Badge className="bg-slate-100 text-slate-700 border-slate-200 text-[10px]">Baixa</Badge>
        )
    }
  }

  const formatarData = (d?: string) => {
    if (!d) return '-'
    try {
      const date = new Date(d)
      return date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })
    } catch {
      return d
    }
  }

  if (cards.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-[#E5E1D8] p-12 text-center shadow-xs">
        <p className="text-sm font-semibold text-[#1A1D21] mb-1">
          Nenhum card encontrado nesta visão
        </p>
        <p className="text-xs text-[#5B6470] mb-4">
          Ajuste os filtros ou adicione novos cards ao fluxo.
        </p>
        <Button
          onClick={onCriarCard}
          size="sm"
          className="bg-[#0F766E] hover:bg-[#0D5C56] text-white text-xs"
        >
          + Novo Card
        </Button>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-xl border border-[#E5E1D8] shadow-xs overflow-hidden">
      <div className="overflow-x-auto">
        <Table>
          <TableHeader className="bg-[#FAFAF9]">
            <TableRow className="border-[#E5E1D8]">
              <TableHead className="text-[11px] font-bold text-[#1A1D21] uppercase tracking-wider py-3">
                Título / Card
              </TableHead>
              <TableHead className="text-[11px] font-bold text-[#1A1D21] uppercase tracking-wider py-3">
                Coluna / Etapa
              </TableHead>
              <TableHead className="text-[11px] font-bold text-[#1A1D21] uppercase tracking-wider py-3">
                Família
              </TableHead>
              <TableHead className="text-[11px] font-bold text-[#1A1D21] uppercase tracking-wider py-3">
                Contato
              </TableHead>
              <TableHead className="text-[11px] font-bold text-[#1A1D21] uppercase tracking-wider py-3">
                Projeto
              </TableHead>
              <TableHead className="text-[11px] font-bold text-[#1A1D21] uppercase tracking-wider py-3">
                Prioridade
              </TableHead>
              <TableHead className="text-[11px] font-bold text-[#1A1D21] uppercase tracking-wider py-3">
                Criado em
              </TableHead>
              <TableHead className="text-[11px] font-bold text-[#1A1D21] uppercase tracking-wider py-3 text-right">
                Ações
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody className="divide-y divide-[#E5E1D8]/70">
            {cards.map((card) => {
              const col = colunasPorChave.get(card.status as string)
              const fam = getFamilia(card)
              const contatoNome = getContatoNome(card)
              const projNome = getProjetoNome(card)

              return (
                <TableRow
                  key={card.id}
                  onClick={() => onEditarCard(card)}
                  className="cursor-pointer hover:bg-[#F4F2EE]/50 transition-colors"
                >
                  <TableCell className="py-3 font-semibold text-xs text-[#1A1D21]">
                    <div className="flex items-center gap-2">
                      <span className="uppercase tracking-tight">{card.titulo}</span>
                      {card.criado_por_ia && (
                        <span title="Criado por IA" className="text-[#0F766E]">
                          <Sparkles className="w-3 h-3" />
                        </span>
                      )}
                    </div>
                    {card.proximo_passo && (
                      <p className="text-[10px] text-[#0F766E] font-normal truncate max-w-md mt-0.5">
                        ↳ Próximo: {card.proximo_passo}
                      </p>
                    )}
                  </TableCell>

                  <TableCell className="py-3">
                    <span
                      className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-medium"
                      style={{
                        backgroundColor: `${col?.cor || '#0F766E'}18`,
                        color: col?.cor || '#0F766E',
                      }}
                    >
                      <span
                        className="w-1.5 h-1.5 rounded-full"
                        style={{ backgroundColor: col?.cor || '#0F766E' }}
                      />
                      {col?.titulo || (card.status as string) || 'Sem coluna'}
                    </span>
                  </TableCell>

                  <TableCell className="py-3 text-xs text-[#5B6470]">
                    {fam ? (
                      <span
                        className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium"
                        style={{
                          backgroundColor: `${fam.cor || '#3B82F6'}15`,
                          color: fam.cor || '#3B82F6',
                        }}
                      >
                        {fam.nome}
                      </span>
                    ) : (
                      <span className="text-[11px] text-[#5B6470]/60">-</span>
                    )}
                  </TableCell>

                  <TableCell className="py-3 text-xs text-[#1A1D21]">
                    {contatoNome !== '-' ? (
                      <span className="inline-flex items-center gap-1">
                        <UserIcon className="w-3 h-3 text-[#5B6470]" />
                        <span>{contatoNome}</span>
                      </span>
                    ) : (
                      <span className="text-[#5B6470]/60">-</span>
                    )}
                  </TableCell>

                  <TableCell className="py-3 text-xs text-[#5B6470]">
                    {projNome !== '-' ? projNome : '-'}
                  </TableCell>

                  <TableCell className="py-3">{getPrioridadeBadge(card.prioridade)}</TableCell>

                  <TableCell className="py-3 text-[11px] text-[#5B6470] whitespace-nowrap">
                    <span className="inline-flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      {formatarData(card.created)}
                    </span>
                  </TableCell>

                  <TableCell className="py-3 text-right" onClick={(e) => e.stopPropagation()}>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onEditarCard(card)}
                      className="h-7 w-7 p-0 text-[#5B6470] hover:text-[#0F766E]"
                      title="Editar card"
                    >
                      <ArrowUpRight className="w-3.5 h-3.5" />
                    </Button>
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
