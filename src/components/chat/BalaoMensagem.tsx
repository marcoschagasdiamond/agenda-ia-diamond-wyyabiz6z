// Balão de mensagem do chat interno, com render de anexos
// (miniatura para imagem, nome + download para arquivo/documento).
import { FileText, Download } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { ChatMensagem } from '@/types'
import type { AlvoConversa } from './tiposChat'

function ehImagem(nomeArquivo: string): boolean {
  return /\.(png|jpe?g|gif|webp|bmp|svg)$/i.test(nomeArquivo)
}

function horaCurta(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  return d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
}

interface BalaoMensagemProps {
  m: ChatMensagem
  minha: boolean
  mostrarAutor: boolean
  nomeAutor: string
  urlAnexo: string | null
}

export function BalaoMensagem({ m, minha, mostrarAutor, nomeAutor, urlAnexo }: BalaoMensagemProps) {
  const nomeAnexo = m.anexo || ''
  const anexoImagem = !!urlAnexo && ehImagem(nomeAnexo)

  return (
    <div className={cn('flex', minha ? 'justify-end' : 'justify-start')}>
      <div
        className={cn(
          'max-w-[75%] md:max-w-[60%] rounded-lg px-3 py-2 text-sm shadow-sm',
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
        <p className="text-[10px] text-gray-400 text-right mt-0.5">
          {horaCurta(m.created)}
          {minha && (m.lida_em ? ' ✓✓' : ' ✓')}
        </p>
      </div>
    </div>
  )
}

export type { AlvoConversa }
export { ehImagem }
export { horaCurta }
