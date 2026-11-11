// Lista das pastas do Google Drive vinculadas a um card (coleção card_pastas_drive).
// - Acumula N vínculos (linhas independentes — nenhum substitui outro);
// - Renomear o apelido do vínculo (campo nome);
// - Reordenar com botões de seta (campo ordem); a ordem persiste ao reabrir.
// Abre a pasta no Drive externamente (drive_url) — nunca download local.
import { useEffect, useState } from 'react'
import {
  Folder,
  HardDrive,
  ExternalLink,
  ChevronUp,
  ChevronDown,
  Pencil,
  Check,
  X,
  Loader2,
} from 'lucide-react'
import { Input } from '@/components/ui/input'
import { toast } from '@/hooks/use-toast'
import { diamondApi } from '@/services/diamondApi'
import type { CardPastaDrive } from '@/types'

interface Props {
  pastas: CardPastaDrive[]
  /** Atualiza a lista de pastas no componente pai (Timeline, Modal...). */
  onChange: (pastas: CardPastaDrive[]) => void
}

export function ListaPastasDriveCard({ pastas, onChange }: Props) {
  const [editandoId, setEditandoId] = useState<string | null>(null)
  const [apelido, setApelido] = useState('')
  const [salvando, setSalvando] = useState(false)
  const [movendo, setMovendo] = useState(false)

  // Ordena por ordem (backfill garante número); created desempata vínculos antigos.
  const ordenadas = [...pastas].sort((a, b) => {
    const oa = a.ordem ?? Number.MAX_SAFE_INTEGER
    const ob = b.ordem ?? Number.MAX_SAFE_INTEGER
    if (oa !== ob) return oa - ob
    return (a.created || '').localeCompare(b.created || '')
  })

  // Mantém o campo ordem sempre preenchido (0..n-1) para novas vinculações.
  useEffect(() => {
    const faltando = ordenadas.some((p, i) => p.ordem !== i)
    if (!faltando || salvando) return
    ordenadas.forEach((p, i) => {
      if (p.ordem !== i) diamondApi.moverCardPastaDrive(p.id, i).catch(() => {})
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pastas])

  const handleRenomear = async (pasta: CardPastaDrive) => {
    const nome = apelido.trim()
    if (!nome) return
    setSalvando(true)
    try {
      const atual = await diamondApi.renomearCardPastaDrive(pasta.id, nome)
      onChange(pastas.map((p) => (p.id === atual.id ? atual : p)))
      setEditandoId(null)
      toast({ title: 'Apelido da pasta atualizado.' })
    } catch (err) {
      console.error('Falha ao renomear pasta do Drive:', err)
      toast({ title: 'Falha ao renomear a pasta', variant: 'destructive' })
    } finally {
      setSalvando(false)
    }
  }

  /** Troca a ordem do vínculo com o vizinho (setas ↑/↓) e persiste os dois. */
  const mover = async (indice: number, direcao: -1 | 1) => {
    if (movendo) return
    const alvo = indice + direcao
    if (alvo < 0 || alvo >= ordenadas.length) return
    const atual = ordenadas[indice]
    const vizinho = ordenadas[alvo]
    if (!atual || !vizinho) return
    setMovendo(true)
    // Otimista na UI, persistência em seguida.
    const novas = [...ordenadas]
    novas[indice] = { ...vizinho, ordem: atual.ordem ?? indice }
    novas[alvo] = { ...atual, ordem: vizinho.ordem ?? alvo }
    onChange(novas)
    try {
      await diamondApi.moverCardPastaDrive(atual.id, vizinho.ordem ?? alvo)
      await diamondApi.moverCardPastaDrive(vizinho.id, atual.ordem ?? indice)
    } catch (err) {
      console.error('Falha ao reordenar pastas do Drive:', err)
      onChange(pastas) // volta ao estado salvo
      toast({ title: 'Falha ao reordenar as pastas', variant: 'destructive' })
    } finally {
      setMovendo(false)
    }
  }

  if (ordenadas.length === 0) return null

  return (
    <div className="px-1 pb-2 space-y-1.5">
      <p className="text-[10px] font-semibold text-[#8A93A0] uppercase tracking-wider">
        Pastas do Google Drive ({ordenadas.length})
      </p>
      {ordenadas.map((pasta, i) => (
        <div
          key={pasta.id}
          className="flex items-center gap-2 rounded-lg border border-[#E5E1D8] bg-white px-2.5 py-2 group/pasta"
        >
          <Folder className="w-4 h-4 text-[#F59E0B] shrink-0" />
          {editandoId === pasta.id ? (
            <form
              className="flex-1 min-w-0 flex items-center gap-1"
              onSubmit={(e) => {
                e.preventDefault()
                handleRenomear(pasta)
              }}
            >
              <Input
                autoFocus
                value={apelido}
                onChange={(e) => setApelido(e.target.value)}
                className="h-6 text-xs border-[#E5E1D8]"
                maxLength={200}
              />
              <button
                type="submit"
                title="Salvar apelido"
                disabled={salvando}
                className="w-6 h-6 rounded-md hover:bg-[#F4F2EE] flex items-center justify-center text-[#0F766E] disabled:opacity-40"
              >
                {salvando ? (
                  <Loader2 className="w-3 h-3 animate-spin" />
                ) : (
                  <Check className="w-3 h-3" />
                )}
              </button>
              <button
                type="button"
                title="Cancelar"
                onClick={() => setEditandoId(null)}
                className="w-6 h-6 rounded-md hover:bg-[#F4F2EE] flex items-center justify-center text-[#8A93A0]"
              >
                <X className="w-3 h-3" />
              </button>
            </form>
          ) : (
            <>
              <a
                href={pasta.drive_url}
                target="_blank"
                rel="noopener noreferrer"
                title={pasta.nome}
                className="flex-1 min-w-0 truncate text-xs font-medium text-[#1A1D21] hover:underline"
              >
                {pasta.nome}
              </a>
              <span className="inline-flex items-center gap-1 rounded-full bg-[#2563EB]/10 px-2 py-0.5 text-[9px] font-bold text-[#2563EB] shrink-0">
                <HardDrive className="w-2.5 h-2.5" />
                DRIVE
              </span>
              <a
                href={pasta.drive_url}
                target="_blank"
                rel="noopener noreferrer"
                title="Abrir no Drive"
                className="w-6 h-6 rounded-md hover:bg-[#F4F2EE] flex items-center justify-center text-[#8A93A0] shrink-0 opacity-0 group-hover/pasta:opacity-100"
              >
                <ExternalLink className="w-3 h-3" />
              </a>
              <button
                type="button"
                title="Renomear apelido"
                onClick={() => {
                  setEditandoId(pasta.id)
                  setApelido(pasta.nome)
                }}
                className="w-6 h-6 rounded-md hover:bg-[#F4F2EE] flex items-center justify-center text-[#8A93A0] shrink-0 opacity-0 group-hover/pasta:opacity-100"
              >
                <Pencil className="w-3 h-3" />
              </button>
              <div className="flex flex-col shrink-0 opacity-0 group-hover/pasta:opacity-100">
                <button
                  type="button"
                  title="Mover para cima"
                  disabled={i === 0 || movendo}
                  onClick={() => mover(i, -1)}
                  className="w-5 h-3.5 flex items-center justify-center text-[#8A93A0] hover:text-[#1A1D21] disabled:opacity-25"
                >
                  <ChevronUp className="w-3 h-3" />
                </button>
                <button
                  type="button"
                  title="Mover para baixo"
                  disabled={i === ordenadas.length - 1 || movendo}
                  onClick={() => mover(i, 1)}
                  className="w-5 h-3.5 flex items-center justify-center text-[#8A93A0] hover:text-[#1A1D21] disabled:opacity-25"
                >
                  <ChevronDown className="w-3 h-3" />
                </button>
              </div>
            </>
          )}
        </div>
      ))}
    </div>
  )
}

export default ListaPastasDriveCard
