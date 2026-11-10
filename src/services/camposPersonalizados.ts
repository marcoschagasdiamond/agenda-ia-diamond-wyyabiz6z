// Serviço de Campos Personalizados (modelo Ummense adaptado ao Agenda IA Diamond).
// Toda leitura/escuta passa pela API do PocketBase.
import pb from '@/lib/pocketbase/client'

export type CampoCategoria = 'card' | 'pessoa' | 'empresa'

export type CampoTipo =
  | 'texto_curto'
  | 'texto_longo'
  | 'numero'
  | 'select'
  | 'radio'
  | 'checkbox'
  | 'lista_checkbox'
  | 'seletor_horario'
  | 'seletor_data'
  | 'upload'
  | 'lista_selecao'
  | 'moeda'

export type CampoMascara = 'cpf' | 'cnpj' | 'rg' | 'passaporte' | 'outros' | ''

export interface CampoPersonalizado {
  id: string
  categoria: CampoCategoria
  tipo: CampoTipo
  mascara: CampoMascara
  mascara_outros: string
  nome_interno: string
  rotulo: string
  mensagem_ajuda: string
  legenda: string
  opcoes: string[] | null
  lista_selecao: string
  obrigatorio: boolean
  ativo: boolean
  created: string
  updated: string
}

export interface ListaSelecao {
  id: string
  nome: string
  itens: string[] | null
  ativo: boolean
  created: string
  updated: string
}

export interface ValorCampoPersonalizado {
  id: string
  campo: string
  card: string
  contato: string
  valor: unknown
  created: string
  updated: string
}

export const ROTULOS_CATEGORIA: Record<CampoCategoria, string> = {
  card: 'Card',
  pessoa: 'Pessoa',
  empresa: 'Empresa',
}

export const ROTULOS_TIPO: Record<CampoTipo, string> = {
  texto_curto: 'Texto Curto',
  texto_longo: 'Texto Longo',
  numero: 'Número',
  select: 'Lista Suspensa (Select)',
  radio: 'Radio',
  checkbox: 'Checkbox',
  lista_checkbox: 'Múltipla Escolha (Checkboxes)',
  seletor_horario: 'Seletor de Horário',
  seletor_data: 'Seletor de Data',
  upload: 'Upload',
  lista_selecao: 'Lista de Seleção',
  moeda: 'Moeda',
}

export const ROTULOS_MASCARA: Record<string, string> = {
  cpf: 'CPF',
  cnpj: 'CNPJ',
  rg: 'RG',
  passaporte: 'Passaporte',
  outros: 'Outros',
}

// Tipos cujo rótulo fica visível ao cadastrar/validar por tipo
export function tipoUsaOpcoes(tipo: CampoTipo): boolean {
  return tipo === 'select' || tipo === 'radio' || tipo === 'checkbox' || tipo === 'lista_checkbox'
}

export function tipoUsaMascara(tipo: CampoTipo): boolean {
  return tipo === 'texto_curto' || tipo === 'numero'
}

export function tipoUsaListaSelecao(tipo: CampoTipo): boolean {
  return tipo === 'lista_selecao'
}

function parseJsonArray(value: unknown): string[] | null {
  if (value == null) return null
  if (Array.isArray(value)) return value.map(String)
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value)
      return Array.isArray(parsed) ? parsed.map(String) : null
    } catch {
      return null
    }
  }
  return null
}

function parseCampo(rec: Record<string, unknown>): CampoPersonalizado {
  const raw = rec as Record<string, unknown> & { lista_selecao?: unknown }
  let lista = raw.lista_selecao
  if (Array.isArray(lista)) lista = (lista[0] as string) || ''
  return {
    ...(raw as unknown as CampoPersonalizado),
    opcoes: parseJsonArray(raw.opcoes),
    lista_selecao: typeof lista === 'string' ? lista : '',
  }
}

function parseLista(rec: Record<string, unknown>): ListaSelecao {
  const raw = rec as Record<string, unknown>
  return {
    id: raw.id as string,
    nome: (raw.nome as string) || '',
    itens: parseJsonArray(raw.itens),
    ativo: raw.ativo !== false,
    created: raw.created as string,
    updated: raw.updated as string,
  }
}

function parseValor(rec: Record<string, unknown>): ValorCampoPersonalizado {
  const raw = rec as Record<string, unknown>
  const primeiro = (v: unknown): string => {
    if (Array.isArray(v)) return (v[0] as string) || ''
    return typeof v === 'string' ? v : ''
  }
  return {
    id: raw.id as string,
    campo: primeiro(raw.campo),
    card: primeiro(raw.card),
    contato: primeiro(raw.contato),
    valor: raw.valor ?? null,
    created: raw.created as string,
    updated: raw.updated as string,
  }
}

// ---------------- Consultas ----------------

export async function listarListasSelecao(somenteAtivas = false): Promise<ListaSelecao[]> {
  const filtro = somenteAtivas ? 'ativo = true' : ''
  const recs = await pb.collection('listas_selecao').getList(1, 200, {
    filter: filtro,
    sort: '-created',
  })
  return recs.items.map(parseLista)
}

export async function listarCamposPersonalizados(
  apenasAtivos = false,
): Promise<CampoPersonalizado[]> {
  const filtro = apenasAtivos ? 'ativo = true' : ''
  const recs = await pb.collection('campos_personalizados').getList(1, 200, {
    filter: filtro,
    sort: '-created',
  })
  return recs.items.map(parseCampo)
}

export async function listarValoresPorAlvo(alvo: {
  card?: string
  contato?: string
}): Promise<ValorCampoPersonalizado[]> {
  const partes: string[] = []
  if (alvo.card) partes.push(`card = "${alvo.card}"`)
  if (alvo.contato) partes.push(`contato = "${alvo.contato}"`)
  if (partes.length === 0) return []
  const recs = await pb.collection('valores_campos_personalizados').getFullList({
    filter: partes.join(' && '),
  })
  return recs.map(parseValor)
}

export async function salvarValorCampo(
  campoId: string,
  alvo: { card?: string; contato?: string },
  valor: unknown,
  usuarioId?: string,
): Promise<void> {
  const partes: string[] = [`campo = "${campoId}"`]
  if (alvo.card) partes.push(`card = "${alvo.card}"`)
  if (alvo.contato) partes.push(`contato = "${alvo.contato}"`)
  const existentes = await pb
    .collection('valores_campos_personalizados')
    .getFullList({ filter: partes.join(' && ') })

  if (existentes.length > 0) {
    await pb.collection('valores_campos_personalizados').update(existentes[0].id, { valor })
    return
  }
  await pb.collection('valores_campos_personalizados').create({
    campo: campoId,
    card: alvo.card || '',
    contato: alvo.contato || '',
    valor,
    criado_por: usuarioId || '',
  })
}

// ---------------- Máscaras de formatação ----------------

export function aplicarMascara(
  valorDigitado: string,
  mascara: CampoMascara,
  outros: string,
): string {
  const digitos = (valorDigitado || '').replace(/\D/g, '')

  switch (mascara) {
    case 'cpf': {
      const d = digitos.slice(0, 11)
      return d
        .replace(/(\d{3})(\d)/, '$1.$2')
        .replace(/(\d{3})\.(\d{3})(\d)/, '$1.$2.$3')
        .replace(/(\d{3})\.(\d{3})\.(\d{3})(\d{1,2})$/, '$1.$2.$3-$4')
    }
    case 'cnpj': {
      const d = digitos.slice(0, 14)
      return d
        .replace(/^(\d{2})(\d)/, '$1.$2')
        .replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3')
        .replace(/\.(\d{3})(\d)/, '.$1/$2')
        .replace(/(\d{4})(\d{1,2})$/, '$1-$2')
    }
    case 'rg': {
      const d = digitos.slice(0, 9)
      return d
        .replace(/^(\d{2})(\d)/, '$1.$2')
        .replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3')
        .replace(/(\d{3})(\d{1})$/, '$1-$2')
    }
    case 'passaporte': {
      return valorDigitado
        .toUpperCase()
        .replace(/[^A-Z0-9]/g, '')
        .slice(0, 8)
    }
    case 'outros': {
      return valorDigitado.slice(0, 50)
    }
    default:
      return valorDigitado
  }
}

// Utilidades de moeda (usadas no campo tipo moeda)
export function formatarMoedaBR(valor: number): string {
  return valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

export function parseMoedaBR(texto: string): number {
  const limpo = (texto || '')
    .replace(/[^\d,.-]/g, '')
    .replace(/\./g, '')
    .replace(',', '.')
  const n = parseFloat(limpo)
  return isNaN(n) ? 0 : n
}
