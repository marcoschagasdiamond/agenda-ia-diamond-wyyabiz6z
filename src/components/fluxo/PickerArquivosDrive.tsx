// Seletor de arquivos do Google Drive do usuário logado (conectores de app).
// Sem conexão: mostra o ConnectorButton + texto curto. Conectado: busca/lista
// e devolve o arquivo escolhido via onSelecionar.
import { useCallback, useEffect, useState } from 'react'
import { Search, Loader2, File as FileIcon, RefreshCw } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { ConnectorButton } from '@/components/skip/ConnectorButton'
import {
  buscarArquivosDrive,
  driveEstaConectado,
  listarArquivosDrive,
  type ArquivoDrive,
} from '@/services/driveService'

interface Props {
  onSelecionar: (arquivo: ArquivoDrive) => void
  // Recarrega o estado de conexão quando o parent sabe que ela mudou.
  chaveConexao?: string | number
}

function formatarTamanhoDrive(bytes?: number): string {
  if (!bytes || bytes <= 0) return ''
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.min(Math.floor(Math.log(bytes) / Math.log(k)), sizes.length - 1)
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`
}

export function PickerArquivosDrive({ onSelecionar, chaveConexao }: Props) {
  const [conectado, setConectado] = useState<boolean | null>(null)
  const [busca, setBusca] = useState('')
  const [arquivos, setArquivos] = useState<ArquivoDrive[]>([])
  const [carregando, setCarregando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)

  const verificarConexao = useCallback(() => {
    driveEstaConectado()
      .then(setConectado)
      .catch(() => setConectado(false))
  }, [])

  useEffect(() => {
    verificarConexao()
  }, [chaveConexao, verificarConexao])

  const carregarArquivos = useCallback((termo: string) => {
    setCarregando(true)
    setErro(null)
    const req = termo.trim() ? buscarArquivosDrive(termo) : listarArquivosDrive()
    req
      .then(setArquivos)
      .catch((e: unknown) => setErro((e as Error)?.message || 'Erro ao acessar o Google Drive'))
      .finally(() => setCarregando(false))
  }, [])

  useEffect(() => {
    if (conectado) carregarArquivos('')
  }, [conectado, carregarArquivos])

  // ---------- Sem conexão: botão de conectar ----------
  if (conectado === false) {
    return (
      <div className="rounded-xl border border-[#E5E1D8] bg-[#F4F2EE]/50 p-4 space-y-2.5">
        <p className="text-xs font-semibold text-[#1A1D21]">Google Drive</p>
        <p className="text-[11px] text-[#5B6470]">
          Conecte seu Google Drive para vincular arquivos.
        </p>
        <ConnectorButton toolkit="googledrive" name="Google Drive" />
        <p className="text-[10px] text-[#8A93A0]">
          Após conectar, a busca de arquivos aparece aqui automaticamente.
        </p>
      </div>
    )
  }

  // ---------- Conectado: busca + lista ----------
  return (
    <div className="rounded-xl border border-[#E5E1D8] bg-white p-3 space-y-2.5">
      <div className="flex items-center justify-between">
        <p className="text-[10px] font-semibold text-[#8A93A0] uppercase tracking-wider">
          Arquivos do Google Drive
        </p>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-6 w-6 p-0 text-[#8A93A0] hover:text-[#0F766E]"
          title="Recarregar"
          onClick={() => carregarArquivos(busca)}
        >
          <RefreshCw className="w-3.5 h-3.5" />
        </Button>
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault()
          carregarArquivos(busca)
        }}
        className="relative"
      >
        <Input
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          placeholder="Buscar no Drive por nome..."
          className="text-xs border-[#E5E1D8] pr-8"
        />
        <button
          type="submit"
          title="Buscar"
          className="absolute right-2 top-1/2 -translate-y-1/2 text-[#8A93A0] hover:text-[#0F766E]"
        >
          <Search className="w-3.5 h-3.5" />
        </button>
      </form>

      {carregando ? (
        <div className="flex items-center justify-center gap-2 py-6 text-[11px] text-[#5B6470]">
          <Loader2 className="w-4 h-4 animate-spin text-[#0F766E]" />
          Carregando arquivos do Drive...
        </div>
      ) : erro ? (
        <div className="py-4 text-center">
          <p className="text-[11px] text-red-600">{erro}</p>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="mt-2 text-[11px] h-7"
            onClick={() => carregarArquivos(busca)}
          >
            Tentar novamente
          </Button>
        </div>
      ) : arquivos.length === 0 ? (
        <p className="text-[11px] text-[#8A93A0] py-4 text-center">
          {busca.trim()
            ? 'Nenhum arquivo encontrado no Drive para essa busca.'
            : 'Nenhum arquivo encontrado no seu Drive.'}
        </p>
      ) : (
        <div className="max-h-52 overflow-y-auto space-y-0.5">
          {arquivos.map((f) => (
            <button
              key={f.id}
              type="button"
              onClick={() => onSelecionar(f)}
              className="w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-left text-xs text-[#1A1D21] hover:bg-[#F4F2EE]"
            >
              <FileIcon className="w-3.5 h-3.5 text-[#0F766E] shrink-0" />
              <span className="truncate flex-1">{f.nome}</span>
              {formatarTamanhoDrive(f.tamanho) && (
                <span className="text-[10px] text-[#8A93A0] shrink-0">
                  {formatarTamanhoDrive(f.tamanho)}
                </span>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

export default PickerArquivosDrive
