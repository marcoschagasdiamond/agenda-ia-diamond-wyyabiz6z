// Card do Kanban no modelo DiamondGroup — visual dedicado (src/pages/Fluxo.tsx usa este módulo).
// Mantém todos os comportamentos: drag & drop, navegação para /card/:id,
// botões de ação rápida (Fluxos / Arquivos / Família / Abrir) e menu de 3 pontinhos.

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import type { ColunaFluxo, Contato, GrupoFamilia, Projeto } from '@/types'
import type { LucideIcon } from 'lucide-react'
import {
  ArrowRight,
  Calendar,
  Download,
  Edit2,
  ExternalLink,
  GitBranch,
  Layers,
  MessageSquare,
  MoreVertical,
  Sparkles,
  Trash2,
  User,
  Users,
  Wand2,
} from 'lucide-react'
import { iniciaisDeNome } from './CardKanbanHelpers'

export interface CardKanbanDiamondProps {
  cardId: string
  titulo: string
  descricao?: string
  proximoPasso?: string
  prioridade?: 'baixa' | 'media' | 'alta' | 'urgente'
  dataPrazo?: string
  statusOrfao?: boolean
  criadoPorIa?: boolean
  cardPai?: string
  projeto?: Projeto | null
  contato: Contato | null
  familia?: GrupoFamilia | null
  colunaAtual?: ColunaFluxo | null
  colunasParaMover: ColunaFluxo[]
  totalCamposPreenchidos: number
  totalCardsFamilia: number
  temAnexos: boolean
  temAnotacoes: boolean
  urlAvatar?: string
  /** Drag & drop (mesmos handlers de antes da refatoração visual) */
  onDragStart: (e: React.DragEvent) => void
  /** Ações */
  onAbrirCard: () => void
  onEditarCard: () => void
  onAbrirCardFluxo: () => void
  onAbrirCardArquivos: () => void
  onAbrirCardFamilia: () => void
  onConvidarColaborador: () => void
  onMudarStatus: (novaColuna: ColunaFluxo) => void
  onExcluirCard: () => void
}

const ROTULO_PRIORIDADE: Record<NonNullable<CardKanbanDiamondProps['prioridade']>, string> = {
  baixa: 'Baixa',
  media: 'Média',
  alta: 'Alta',
  urgente: 'Urgente',
}

const CORES_PRIORIDADE: Record<
  NonNullable<CardKanbanDiamondProps['prioridade']>,
  { badge: string; barra: string }
> = {
  urgente: {
    badge: 'bg-red-100 text-red-700 border border-red-200',
    barra: '#DC2626',
  },
  alta: {
    badge: 'bg-amber-100 text-amber-700 border border-amber-200',
    barra: '#F59E0B',
  },
  media: {
    badge: 'bg-blue-100 text-blue-700 border border-blue-200',
    barra: '#0EA5E9',
  },
  baixa: {
    badge: 'bg-slate-100 text-slate-600 border border-slate-200',
    barra: '#64748B',
  },
}

/** Badge colorido de prioridade (urgente=vermelho, alta=âmbar, média=azul, baixa=cinza). */
function BadgePrioridade({ prioridade }: { prioridade: CardKanbanDiamondProps['prioridade'] }) {
  if (!prioridade) return null
  const cores = CORES_PRIORIDADE[prioridade]
  return (
    <span
      className={`inline-flex items-center rounded-full px-1.5 py-0.5 text-[10px] font-semibold leading-none ${cores.badge}`}
    >
      {ROTULO_PRIORIDADE[prioridade]}
    </span>
  )
}

/** Botão de ação rápida (ícone com tooltip) usado na barra superior do card. */
function BotaoAcaoRapida({
  icone: Icone,
  titulo,
  corTexto,
  corHoverBg,
  onClick,
}: {
  icone: LucideIcon
  titulo: string
  corTexto: string
  corHoverBg: string
  onClick: () => void
}) {
  return (
    <button
      type="button"
      title={titulo}
      onClick={(e) => {
        e.stopPropagation()
        onClick()
      }}
      className={`w-7 h-7 rounded-lg bg-[#F4F2EE] hover:bg-opacity-100 border border-[#E5E1D8] flex items-center justify-center transition-colors shadow-2xs ${corTexto} ${corHoverBg}`}
    >
      <Icone className="w-3.5 h-3.5" />
    </button>
  )
}

export default function CardKanbanDiamond(props: CardKanbanDiamondProps) {
  const {
    cardId,
    titulo,
    descricao,
    proximoPasso,
    prioridade,
    dataPrazo,
    statusOrfao,
    criadoPorIa,
    cardPai,
    projeto,
    contato,
    familia,
    colunaAtual,
    colunasParaMover,
    totalCamposPreenchidos,
    totalCardsFamilia,
    temAnexos,
    temAnotacoes,
    urlAvatar,
    onDragStart,
    onAbrirCard,
    onEditarCard,
    onAbrirCardFluxo,
    onAbrirCardArquivos,
    onAbrirCardFamilia,
    onConvidarColaborador,
    onMudarStatus,
    onExcluirCard,
  } = props

  const corFamilia = familia?.cor || '#3B82F6'
  const coresPrioridade = prioridade ? CORES_PRIORIDADE[prioridade] : null
  const nomeContato = contato?.nome || ''
  const iniciais = iniciaisDeNome(nomeContato || titulo)

  return (
    <div
      key={cardId}
      draggable
      onDragStart={onDragStart}
      onClick={onAbrirCard}
      className="group relative bg-white rounded-xl border border-[#E5E1D8] shadow-2xs transition-all duration-150 cursor-pointer diamond-card-hover hover:shadow-md hover:border-[#0F766E]/30 overflow-hidden"
      style={{ borderLeft: coresPrioridade ? `4px solid ${coresPrioridade.barra}` : undefined }}
    >
      {/* Faixa do grupo de família (topo do card, cor do grupo) */}
      {familia && (
        <div
          className="flex items-center gap-1.5 px-3 py-1 text-[10px] font-semibold uppercase tracking-wide"
          style={{ backgroundColor: `${corFamilia}1A`, color: corFamilia }}
        >
          <Layers className="w-3 h-3 shrink-0" />
          <span className="truncate">{familia.nome}</span>
          {totalCardsFamilia > 0 && (
            <span className="ml-auto shrink-0 tabular-nums opacity-80">
              {totalCardsFamilia} {totalCardsFamilia === 1 ? 'card' : 'cards'}
            </span>
          )}
        </div>
      )}

      <div className="p-3 space-y-2">
        {/* Título: destaque tipográfico — sem maiúsculas, maior e mais pesado, truncado em 2 linhas */}
        <div className="flex items-start gap-2">
          <h4 className="flex-1 text-[13px] font-semibold text-[#1A1D21] leading-snug line-clamp-2">
            {statusOrfao && (
              <span
                title="Card órfão: a coluna original (fase) deste card não existe mais — exibido na primeira coluna do quadro até ser movido ou a fase ser reativada."
                className="inline-flex items-center rounded-full bg-amber-100 text-amber-700 px-1.5 py-0.5 text-[9px] font-semibold mr-1 align-middle"
              >
                órfão
              </span>
            )}
            {titulo}
          </h4>
          {criadoPorIa && (
            <span
              title="Criado via IA"
              className="inline-flex items-center rounded-full bg-[#0F766E]/10 text-[#0F766E] px-1.5 py-0.5 text-[9px] font-semibold shrink-0 gap-0.5 mt-0.5"
            >
              <Sparkles className="w-2.5 h-2.5" />
              IA
            </span>
          )}
        </div>

        {/* Descrição curta, quando houver */}
        {descricao && (
          <p className="text-[11px] text-[#5B6470] leading-relaxed line-clamp-2">{descricao}</p>
        )}

        {/* Próximo passo */}
        {proximoPasso && (
          <div className="flex items-center gap-1.5 rounded-md bg-[#0F766E]/5 border border-[#0F766E]/15 px-2 py-1 text-[10px] font-medium text-[#0F766E]">
            <ArrowRight className="w-3 h-3 shrink-0" />
            <span className="line-clamp-1">{proximoPasso}</span>
          </div>
        )}

        {/* Badges: prioridade + prazo + projeto */}
        <div className="flex flex-wrap items-center gap-1.5">
          <BadgePrioridade prioridade={prioridade} />
          {projeto?.nome && (
            <span
              title={`Projeto: ${projeto.nome}`}
              className="inline-flex items-center gap-1 rounded-full bg-[#F4F2EE] text-[#5B6470] px-1.5 py-0.5 text-[10px] font-medium max-w-[140px]"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-[#0F766E] shrink-0" />
              <span className="truncate">{projeto.nome}</span>
            </span>
          )}
          {colunaAtual?.is_conclusao && (
            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 text-emerald-700 px-1.5 py-0.5 text-[10px] font-semibold">
              Concluído
            </span>
          )}
        </div>

        {/* Linha inferior: contato à esquerda, contadores à direita */}
        <div className="flex items-center justify-between gap-2 pt-1">
          <div className="flex items-center gap-1.5 min-w-0">
            <Avatar className="w-5 h-5 rounded-full border border-[#E5E1D8] shrink-0">
              {urlAvatar && <AvatarImage src={urlAvatar} alt={nomeContato || 'Card'} />}
              <AvatarFallback className="bg-[#F4F2EE] text-[#5B6470] text-[8px] font-bold">
                {iniciais}
              </AvatarFallback>
            </Avatar>
            <span className="text-[10px] text-[#5B6470] truncate">
              {nomeContato || 'Sem contato'}
            </span>
          </div>
          <div className="flex items-center gap-2 shrink-0 text-[#5B6470]">
            {totalCamposPreenchidos > 0 && (
              <span
                title={`${totalCamposPreenchidos} ${totalCamposPreenchidos === 1 ? 'campo personalizado preenchido' : 'campos personalizados preenchidos'}`}
                className="inline-flex items-center gap-0.5 text-[10px]"
              >
                <Wand2 className="w-3 h-3" />
                <span className="tabular-nums">{totalCamposPreenchidos}</span>
              </span>
            )}
            {temAnotacoes && (
              <span title="Possui anotações/timeline" className="inline-flex">
                <MessageSquare className="w-3 h-3" />
              </span>
            )}
            {temAnexos && (
              <span title="Possui arquivos anexados" className="inline-flex">
                <Download className="w-3 h-3" />
              </span>
            )}
            {cardPai && (
              <span title="Possui card pai vinculado" className="inline-flex">
                <Layers className="w-3 h-3" />
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Rodapé com data de prazo (barra fina cinza no fundo do card) */}
      {dataPrazo && (
        <div className="flex items-center gap-1.5 bg-[#F4F2EE]/60 border-t border-[#E5E1D8]/60 px-3 py-1.5 text-[10px]">
          <Calendar className="w-3 h-3 shrink-0" />
          <span className="text-[#5B6470]">Prazo:</span>
          <span
            className={
              estadoPrazo(dataPrazo) === 'vencido'
                ? 'text-red-600 font-semibold'
                : estadoPrazo(dataPrazo) === 'hoje'
                  ? 'text-amber-600 font-semibold'
                  : 'text-[#1A1D21] font-medium'
            }
          >
            {formatarPrazoCurto(dataPrazo)}
            {estadoPrazo(dataPrazo) === 'vencido' ? ' · vencido' : ''}
          </span>
        </div>
      )}

      {/* Barra de ações — aparece no hover, canto superior direito (não interfere no drag do card) */}
      <div
        className="absolute top-2 right-2 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity"
        onClick={(e) => e.stopPropagation()}
      >
        <BotaoAcaoRapida
          icone={Wand2}
          titulo="Editar card"
          corTexto="text-[#5B6470] hover:text-[#0F766E]"
          corHoverBg="hover:bg-[#0F766E]/10"
          onClick={onEditarCard}
        />
        <BotaoAcaoRapida
          icone={GitBranch}
          titulo="Fluxos: ver/revincular fluxo"
          corTexto="text-[#5B6470] hover:text-[#2563EB]"
          corHoverBg="hover:bg-[#2563EB]/10"
          onClick={onAbrirCardFluxo}
        />
        <BotaoAcaoRapida
          icone={Download}
          titulo="Arquivos vinculados"
          corTexto="text-[#5B6470] hover:text-[#2563EB]"
          corHoverBg="hover:bg-[#2563EB]/10"
          onClick={onAbrirCardArquivos}
        />
        <BotaoAcaoRapida
          icone={Users}
          titulo="Família e relações"
          corTexto="text-[#5B6470] hover:text-[#7C3AED]"
          corHoverBg="hover:bg-[#7C3AED]/10"
          onClick={onAbrirCardFamilia}
        />
        <button
          type="button"
          title="Abrir card"
          onClick={(e) => {
            e.stopPropagation()
            onAbrirCard()
          }}
          className="w-7 h-7 rounded-lg bg-[#2563EB] hover:bg-[#1D4ED8] text-white flex items-center justify-center shadow-xs transition-colors"
        >
          <ExternalLink className="w-3.5 h-3.5" />
        </button>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              aria-label="Opções do card"
              onClick={(e) => e.stopPropagation()}
              className="w-6 h-6 rounded-lg bg-[#F4F2EE] border border-[#E5E1D8] flex items-center justify-center text-[#5B6470] hover:text-[#1A1D21] hover:bg-[#E5E1D8] transition-colors shadow-2xs"
            >
              <MoreVertical className="w-3.5 h-3.5" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="text-xs w-56">
            <DropdownMenuItem onClick={onAbrirCard}>
              <ExternalLink className="w-3.5 h-3.5 mr-2 text-[#2563EB]" />
              Abrir card
            </DropdownMenuItem>
            <DropdownMenuItem onClick={onEditarCard}>
              <Edit2 className="w-3.5 h-3.5 mr-2 text-[#0F766E]" />
              Editar Modal Rápido
            </DropdownMenuItem>
            <DropdownMenuItem onClick={onAbrirCardFluxo}>
              <GitBranch className="w-3.5 h-3.5 mr-2 text-[#0F766E]" />
              Fluxos (Revincular / Status)
            </DropdownMenuItem>
            <DropdownMenuItem onClick={onAbrirCardArquivos}>
              <Download className="w-3.5 h-3.5 mr-2 rotate-180 text-blue-600" />
              Arquivos Anexados
            </DropdownMenuItem>
            <DropdownMenuItem onClick={onAbrirCardFamilia}>
              <Users className="w-3.5 h-3.5 mr-2 text-purple-600" />
              Família & Relações...
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            {colunasParaMover.map((col) => (
              <DropdownMenuItem key={col.id} onClick={() => onMudarStatus(col)}>
                <ArrowRight className="w-3.5 h-3.5 mr-2 text-[#5B6470]" />
                Mover para {col.titulo}
              </DropdownMenuItem>
            ))}
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={onConvidarColaborador} className="text-[#0F766E]">
              <User className="w-3.5 h-3.5 mr-2" />
              Convidar Colaborador
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={onExcluirCard} className="text-red-600 focus:text-red-600">
              <Trash2 className="w-3.5 h-3.5 mr-2" />
              Excluir Card
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  )
}
