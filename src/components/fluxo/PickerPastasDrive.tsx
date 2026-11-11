// Seletor de PASTAS do Google Drive do usuário logado (conectores de app).
// Mesmo padrão do PickerArquivosDrive, filtrando apenas pastas
// (mimeType application/vnd.google-apps.folder). Sem conexão: mostra o
// ConnectorButton. Conectado: busca/lista e devolve a pasta via onSelecionar.
import { useCallback, useEffect, useState } from 'react'
import { Search, Loader2, Folder, RefreshCw } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { ConnectorButton } from '@/components/skip/ConnectorButton'
import {
  buscarPastasDrive,
  driveEstaConectado,
  listarPastasDrive,
  type ArquivoDrive,
} from '@/services/driveService'

interface Props {
  onSelecionar: (pasta: ArquivoDrive) => void
  // Recarrega o estado de conexão quando o parent sabe que ela mudou.
  chaveConexao?: string | number
}

export function PickerPastasDrive({ onSelecionar, chaveConexao }: Props) {
  const [conectado, setConectado] = useState<boolean | null>(null)
  const [busca, setBusca] = useState('')
  const [pastas, setPastas] = useState<ArquivoDrive[]>([])
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

  const carregarPastas = useCallback((termo: string) => {
    setCarregando(true)
    setErro(null)
    const req = termo.trim() ? buscarPastasDrive(termo) : listarPastasDrive()
    req
      .then(setPastas)
      .catch((e: unknown) => setErro((e as Error)?.message || 'Erro ao acessar o Google Drive'))
      .finally(() => setCarregando(false))
  }, [])

  useEffect(() => {
    if (conectado) carregarPastas('')
  }, [conectado, carregarPastas])

  // ---------- Sem conexão: botão de conectar ----------
  if (conectado === false) {
    return (
      <div className="rounded-xl border border-[#E5E1D8] bg-[#F4F2EE]/50 p-4 space-y-2.5">
        <p className="text-xs font-semibold text-[#1A1D21]">Google Drive</p>
        <p className="text-[11px] text-[#5B6470]">
          Conecte seu Google Drive para vincular pastas ao card.
        </p>
        <ConnectorButton toolkit="googledrive" name="Google Drive" />
        <p className="text-[10px] text-[#8A93A0]">
          Após conectar, a lista de pastas aparece aqui automaticamente.
        </p>
      </div>
    )
  }

  // ---------- Conectado: busca + lista de pastas ----------
  return (
    <div className="rounded-xl border border-[#E5E1D8] bg-white p-3 space-y-2.5">
      <div className="flex items-center justify-between">
        <p className="text-[10px] font-semibold text-[#8A93A0] uppercase tracking-wider">
          Pastas do Google Drive
        </p>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-6 w-6 p-0 text-[#8A93A0] hover:text-[#F59E0B]"
          title="Recarregar"
          onClick={() => carregarPastas(busca)}
        >
          <RefreshCw className="w-3.5 h-3.5" />
        </Button>
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault()
          carregarPastas(busca)
        }}
        className="relative"
      >
        <Input
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          placeholder="Buscar pasta no Drive por nome..."
          className="text-xs border-[#E5E1D8] pr-8"
        />
        <button
          type="submit"
          title="Buscar"
          className="absolute right-2 top-1/2 -translate-y-1/2 text-[#8A93A0] hover:text-[#F59E0B]"
        >
          <Search className="w-3.5 h-3.5" />
        </button>
      </form>

      {carregando ? (
        <div className="flex items-center justify-center gap-2 py-6 text-[11px] text-[#5B6470]">
          <Loader2 className="w-4 h-4 animate-spin text-[#F59E0B]" />
          Carregando pastas do Drive...
        </div>
      ) : erro ? (
        <div className="py-4 text-center">
          <p className="text-[11px] text-red-600">{erro}</p>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="mt-2 text-[11px] h-7"
            onClick={() => carregarPastas(busca)}
          >
            Tentar novamente
          </Button>
        </div>
      ) : pastas.length === 0 ? (
        <p className="text-[11px] text-[#8A93A0] py-4 text-center">
          {busca.trim()
            ? 'Nenhuma pasta encontrada no Drive para essa busca.'
            : 'Nenhuma pasta encontrada no seu Drive.'}
        </p>
      ) : (
        <div className="max-h-52 overflow-y-auto space-y-0.5">
          {pastas.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => onSelecionar(p)}
              className="w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-left text-xs text-[#1A1D21] hover:bg-[#F4F2EE]"
            >
              <Folder className="w-3.5 h-3.5 text-[#F59E0B] shrink-0" />
              <span className="truncate flex-1">{p.nome}</span>
              <span className="text-[10px] text-[#8A93A0] shrink-0">pasta</span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

export default PickerPastasDrive
