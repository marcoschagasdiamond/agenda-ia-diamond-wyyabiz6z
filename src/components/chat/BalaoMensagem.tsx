// Balão de mensagem do chat interno, com render de anexos
// (miniatura para imagem, nome + download para arquivo/documento),
// menu de organização (criar card, enviar para fluxo, enviar a projeto)
// e status de leitura (check simples = enviada; duplo azul = lida).
import { useState } from 'react'
import {
  FileText,
  Download,
  MoreVertical,
  KanbanSquare,
  FolderKanban,
  Briefcase,
} from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuSubContent,
} from '@/components/ui/dropdown-menu'
import { cn } from '@/lib/utils'
import type { ChatMensagem } from '@/types'
import type { AlvoConversa } from './tiposChat'
import type { DestinoMoverCategoria } from '@/components/fluxo/CardKanbanDiamond'

function ehImagem(nomeArquivo: string): boolean {
  return /\.(png|jpe?g|gif|webp|bmp|svg)$/i.test(nomeArquivo)
}

function horaCurta(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  return d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
}

/** Submenu em cascata categoria → fluxo → coluna (mesmo padrão do "Mover para" do /fluxo). */
function SubmenuEnviarFluxo({
  destinos,
  onEscolher,
}: {
  destinos: DestinoMoverCategoria[]
  onEscolher: (colunaChave: string, colunaTitulo: string, fluxoId: string) => void
}) {
  return (
    <div className="text-xs">
      {destinos.map((cat) => (
        <DropdownMenuSub key={cat.id}>
          <DropdownMenuSubTrigger>{cat.nome}</DropdownMenuSubTrigger>
          <DropdownMenuSubContent className="text-xs max-h-72 overflow-y-auto">
            {cat.fluxos.map((fl) => (
              <DropdownMenuSub key={fl.id}>
                <DropdownMenuSubTrigger>{fl.nome}</DropdownMenuSubTrigger>
                <DropdownMenuSubContent className="text-xs">
                  {fl.colunas.map((col) => (
                    <DropdownMenuItem
                      key={col.id}
                      onClick={() => onEscolher(col.chave, col.titulo, fl.id)}
                    >
                      {col.titulo}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuSubContent>
              </DropdownMenuSub>
            ))}
          </DropdownMenuSubContent>
        </DropdownMenuSub>
      ))}
    </div>
  )
}

interface BalaoMensagemProps {
  m: ChatMensagem
  minha: boolean
  mostrarAutor: boolean
  nomeAutor: string
  urlAnexo: string | null
  /** Ações de organização (menu 3 pontinhos no hover) — só mensagens com texto. */
  aoCriarCard?: (m: ChatMensagem) => void
  aoEnviarFluxo?: (
    m: ChatMensagem,
    colunaChave: string,
    colunaTitulo: string,
    fluxoId: string,
  ) => void
  aoEnviarProjeto?: (m: ChatMensagem, projetoId: string) => void
  /** Cascata categoria → fluxo → coluna para "Enviar para fluxo". */
  destinosFluxo?: DestinoMoverCategoria[]
  /** Projetos disponíveis para "Enviar a projeto". */
  projetos?: { id: string; nome: string }[]
  criandoCard?: boolean
}

export function BalaoMensagem({
  m,
  minha,
  mostrarAutor,
  nomeAutor,
  urlAnexo,
  aoCriarCard,
  aoEnviarFluxo,
  aoEnviarProjeto,
  destinosFluxo = [],
  projetos = [],
  criandoCard,
}: BalaoMensagemProps) {
  const [menuAberto, setMenuAberto] = useState(false)
  const nomeAnexo = m.anexo || ''
  const anexoImagem = !!urlAnexo && ehImagem(nomeAnexo)
  const temAcoes = !!aoCriarCard && !!aoEnviarFluxo && !!aoEnviarProjeto
  const podeOrganizar = temAcoes && !!(m.texto && m.texto.trim())

  return (
    <div
      className={cn('group/balao flex items-center gap-1', minha ? 'justify-end' : 'justify-start')}
    >
      <div
        className={cn(
          'relative max-w-[75%] md:max-w-[60%] rounded-lg px-3 py-2 text-sm shadow-sm',
          minha
            ? 'bg-[#d9fdd3] text-gray-900 rounded-br-none'
            : 'bg-white text-gray-900 rounded-bl-none',
        )}
      >
        {mostrarAutor && !minha && (
          <p className="text-[11px] font-semibold text-[#008069] mb-0.5">{nomeAutor}</p>
        )}
        {anexoImagem && (
          <a href={urlAnexo!} target="_blank" rel="noreferrer" className="block mb-1">
            <img
              src={urlAnexo!}
              alt={nomeAnexo}
              className="max-h-56 rounded-md border border-gray-200 object-cover"
            />
          </a>
        )}
        {urlAnexo && !anexoImagem && (
          <a
            href={urlAnexo}
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-2 bg-gray-100 rounded-md px-2.5 py-2 mb-1 hover:bg-gray-200"
          >
            <FileText className="h-5 w-5 text-gray-500 shrink-0" />
            <span className="text-xs text-gray-700 truncate max-w-[180px]">{nomeAnexo}</span>
            <Download className="h-4 w-4 text-[#008069] shrink-0 ml-auto" />
          </a>
        )}
        {m.texto && <p className="whitespace-pre-wrap break-words">{m.texto}</p>}
        <p className="text-[10px] text-gray-400 text-right mt-0.5 flex items-center justify-end gap-1">
          {horaCurta(m.created)}
          {minha && (
            <span
              className={cn('inline-flex', m.lida_em ? 'text-[#53bdeb]' : 'text-gray-400')}
              title={m.lida_em ? 'Lida' : 'Enviada'}
            >
              <svg
                viewBox="0 0 16 11"
                className={cn('h-3 w-3', !m.lida_em && 'opacity-80')}
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                {m.lida_em ? (
                  <>
                    <path d="M1 5.5 4.5 9 11 2" />
                    <path d="M5.5 8 7 9.5 13.5 2" />
                  </>
                ) : (
                  <path d="M2.5 5.5 6 9 13 2" />
                )}
              </svg>
            </span>
          )}
        </p>
      </div>

      {/* Menu de organização: 3 pontinhos no hover (ou quando o menu está aberto) */}
      {podeOrganizar && (
        <DropdownMenu open={menuAberto} onOpenChange={setMenuAberto}>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              className={cn(
                'p-1 rounded-full text-gray-400 hover:text-gray-600 hover:bg-gray-200/70 shrink-0 transition-opacity',
                menuAberto ? 'opacity-100' : 'opacity-0 group-hover/balao:opacity-100',
              )}
              title="Organizar mensagem"
              aria-label="Organizar mensagem"
            >
              <MoreVertical className="h-3.5 w-3.5" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align={minha ? 'end' : 'start'} className="text-xs w-60">
            <DropdownMenuItem
              onClick={() => {
                setMenuAberto(false)
                aoCriarCard!(m)
              }}
              disabled={criandoCard}
            >
              <KanbanSquare className="h-3.5 w-3.5 mr-2 text-[#2563EB]" />
              Criar demanda/card
            </DropdownMenuItem>
            {destinosFluxo.length > 0 && (
              <DropdownMenuSub>
                <DropdownMenuSubTrigger>
                  <FolderKanban className="h-3.5 w-3.5 mr-2 text-[#0F766E]" />
                  Enviar para fluxo
                </DropdownMenuSubTrigger>
                <DropdownMenuSubContent className="text-xs max-h-72 overflow-y-auto">
                  <SubmenuEnviarFluxo
                    destinos={destinosFluxo}
                    onEscolher={(chave, titulo, fluxoId) => {
                      setMenuAberto(false)
                      aoEnviarFluxo!(m, chave, titulo, fluxoId)
                    }}
                  />
                </DropdownMenuSubContent>
              </DropdownMenuSub>
            )}
            {projetos.length > 0 && (
              <DropdownMenuSub>
                <DropdownMenuSubTrigger>
                  <Briefcase className="h-3.5 w-3.5 mr-2 text-purple-600" />
                  Enviar a projeto
                </DropdownMenuSubTrigger>
                <DropdownMenuSubContent className="text-xs max-h-72 overflow-y-auto">
                  {projetos.map((p) => (
                    <DropdownMenuItem
                      key={p.id}
                      onClick={() => {
                        setMenuAberto(false)
                        aoEnviarProjeto!(m, p.id)
                      }}
                    >
                      {p.nome}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuSubContent>
              </DropdownMenuSub>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      )}
    </div>
  )
}

export type { AlvoConversa }
export { ehImagem }
export { horaCurta }
