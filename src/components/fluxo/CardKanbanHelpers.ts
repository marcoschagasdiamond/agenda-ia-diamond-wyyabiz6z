// Helpers de exibição do card no Kanban (usados pelo CardKanbanDiamond).

import type { Contato, ValorCampoPersonalizado } from '@/types'

/** Iniciais (máx. 2) para o avatar circular de fallback. */
export function iniciaisDeNome(nome?: string): string {
  return (
    (nome || 'Card')
      .split(' ')
      .filter(Boolean)
      .slice(0, 2)
      .map((n) => n[0]?.toUpperCase())
      .join('') || 'D'
  )
}

/** Encontra o contato vinculado a um card (expand direto ou lista carregada). */
export function encontrarContatoDoCard(
  card: { contato?: string; expand?: { contato?: Contato } },
  contatos: Contato[],
): Contato | null {
  if (card.expand?.contato) return card.expand.contato
  if (card.contato) return contatos.find((ct) => ct.id === card.contato) || null
  return null
}

/** Conta quantos valores de campos personalizados do card estão realmente preenchidos. */
export function contarValoresPreenchidos(valores: ValorCampoPersonalizado[]): number {
  return valores.filter((v) => {
    const val = v.valor as unknown
    if (val === null || val === undefined) return false
    if (typeof val === 'string') return val.trim() !== ''
    if (typeof val === 'boolean') return val !== false
    if (Array.isArray(val)) return val.length > 0
    return true
  }).length
}

/** Data de vencimento do card no formato dd/mm/aa (pt-BR) ou '' se não houver. */
export function formatarPrazoCurto(dataPrazo?: string): string {
  if (!dataPrazo) return ''
  const d = new Date(dataPrazo)
  if (isNaN(d.getTime())) return ''
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit' })
}

/** Data de vencimento comparada a hoje (hora zerada): 'vencido' | 'hoje' | 'futuro' | 'nenhum'. */
export function estadoPrazo(dataPrazo?: string): 'vencido' | 'hoje' | 'futuro' | 'nenhum' {
  if (!dataPrazo) return 'nenhum'
  const d = new Date(dataPrazo)
  if (isNaN(d.getTime())) return 'nenhum'
  const hoje = new Date()
  const hojeZero = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate())
  const alvo = new Date(d.getFullYear(), d.getMonth(), d.getDate())
  if (alvo < hojeZero) return 'vencido'
  if (alvo.getTime() === hojeZero.getTime()) return 'hoje'
  return 'futuro'
}

/** Valor monetário do card (soma dos campos personalizados tipo moeda preenchidos). */
export function valorMonetarioDoCard(
  valores: ValorCampoPersonalizado[],
  camposMoeda: Set<string>,
): number {
  let total = 0
  for (const v of valores) {
    if (!camposMoeda.has(v.campo)) continue
    const val = v.valor as unknown
    if (val === null || val === undefined) continue
    const n = typeof val === 'number' ? val : parseFloat(String(val).replace(',', '.'))
    if (!isNaN(n) && n !== 0) total += n
  }
  return total
}
