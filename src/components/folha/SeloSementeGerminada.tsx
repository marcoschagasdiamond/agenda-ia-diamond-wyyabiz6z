import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowRight, CheckCircle2 } from 'lucide-react'
import { diamondApi } from '@/services/diamondApi'
import type { Card } from '@/types'

/**
 * Cache de sessão dos títulos de cards germinados — evita buscar o mesmo card
 * repetidamente a cada render do cofre da Folha.
 */
const titulosCache = new Map<string, string | null>()

/**
 * Selo exibido no card de Semente germinada no Cofre por Tese (/folha).
 * Mostra o TÍTULO do card germinado; enquanto carrega (ou se o card foi
 * excluído) mostra o ID curto como fallback. Clique navega para /card/:id.
 */
export function SeloSementeGerminada({ cardId }: { cardId: string }) {
  const navigate = useNavigate()
  const [titulo, setTitulo] = useState<string | null>(() => titulosCache.get(cardId) ?? null)

  useEffect(() => {
    // Já resolvido (título presente ou card confirmado inexistente) — nada a fazer.
    if (titulosCache.has(cardId)) return
    let vivo = true
    diamondApi
      .getCard(cardId)
      .then((card: Card) => {
        if (!vivo) return
        titulosCache.set(cardId, card.titulo || null)
        setTitulo(card.titulo || null)
      })
      .catch(() => {
        // Card não encontrado (excluído) — cachear como inexistente para não rebuscar.
        if (!vivo) return
        titulosCache.set(cardId, null)
        setTitulo(null)
      })
    return () => {
      vivo = false
    }
  }, [cardId])

  return (
    <button
      type="button"
      onClick={() => navigate(`/card/${cardId}`)}
      className="mt-2.5 inline-flex items-center gap-1.5 text-[11px] font-semibold text-[#0F766E] bg-emerald-50 border border-emerald-300 px-2.5 py-1 rounded-full hover:bg-emerald-100 transition-colors"
      title={`Abrir card germinado (${cardId})`}
    >
      <CheckCircle2 className="w-3.5 h-3.5" />
      <span>{titulo ? 'germinou como' : 'germinou como card'}</span>
      {titulo ? (
        <span className="truncate max-w-[180px] font-semibold">{titulo}</span>
      ) : (
        <span className="font-mono text-[10px] truncate max-w-[140px]">{cardId.slice(0, 8)}</span>
      )}
      <ArrowRight className="w-3 h-3" />
    </button>
  )
}
