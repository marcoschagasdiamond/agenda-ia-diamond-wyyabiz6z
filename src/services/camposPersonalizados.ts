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
  | 'lista_selecao'
  | 'moeda'

export type CampoMascara = 'cpf' | 'cnpj' | 'telefone' | 'moeda' | ''

export interface CampoPersonalizado {
  id: string
  categoria: CampoCategoria
  tipo: CampoTipo
  nome_interno: string
  rotulo: string
  mensagem_ajuda: string
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

export type AlvoValor = { card?: string; contato?: string; projeto?: string; fluxo?: string }

export interface ValorCampoPersonalizado {
  id: string
  campo: string
  card: string
  contato: string
  projeto: string
  fluxo: string
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
  numero: 'Números',
  select: 'Select',
  radio: 'Radio Button',
  checkbox: 'Checkbox',
  lista_checkbox: 'Lista de Checkbox',
  seletor_horario: 'Seletor de horário',
  seletor_data: 'Seletor de data',
  lista_selecao: 'Lista de Seleção',
  moeda: 'Moeda',
}

// Números é o único tipo com máscara própria (intrínseca ao tipo, sem célula no modal)
export function tipoUsaMascara(tipo: CampoTipo): boolean {
  return tipo === 'numero'
}

export function tipoUsaOpcoes(tipo: CampoTipo): boolean {
  return tipo === 'select' || tipo === 'radio' || tipo === 'lista_checkbox'
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

function primeiro(v: unknown): string {
  if (Array.isArray(v)) return (v[0] as string) || ''
  return typeof v === 'string' ? v : ''
}

function parseValor(rec: Record<string, unknown>): ValorCampoPersonalizado {
  const raw = rec as Record<string, unknown>
  return {
    id: raw.id as string,
    campo: primeiro(raw.campo),
    card: primeiro(raw.card),
    contato: primeiro(raw.contato),
    projeto: primeiro(raw.projeto),
    fluxo: primeiro(raw.fluxo),
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
  categorias?: CampoCategoria[],
): Promise<CampoPersonalizado[]> {
  let filtro = apenasAtivos ? 'ativo = true' : ''
  if (categorias && categorias.length > 0) {
    filtro = [filtro, `(${categorias.map((c) => `categoria = "${c}"`).join(' || ')})`]
      .filter(Boolean)
      .join(' && ')
  }
  const recs = await pb.collection('campos_personalizados').getList(1, 200, {
    filter: filtro,
    sort: '-created',
  })
  return recs.items.map(parseCampo)
}

export async function criarCampoPersonalizado(
  dados: Omit<CampoPersonalizado, 'id' | 'created' | 'updated'> & { opcoes?: string[] },
): Promise<CampoPersonalizado> {
  const rec = await pb.collection('campos_personalizados').create({
    categoria: dados.categoria,
    tipo: dados.tipo,
    nome_interno: dados.nome_interno,
    rotulo: dados.rotulo,
    mensagem_ajuda: dados.mensagem_ajuda || '',
    opcoes: Array.isArray(dados.opcoes) ? dados.opcoes : [],
    lista_selecao: dados.lista_selecao || '',
    obrigatorio: !!dados.obrigatorio,
    ativo: dados.ativo !== false,
    criado_por: pb.authStore.record?.id || '',
  })
  return parseCampo(rec as unknown as Record<string, unknown>)
}

export async function listarValoresPorAlvo(alvo: AlvoValor): Promise<ValorCampoPersonalizado[]> {
  const partes: string[] = []
  if (alvo.card) partes.push(`card = "${alvo.card}"`)
  if (alvo.contato) partes.push(`contato = "${alvo.contato}"`)
  if (alvo.projeto) partes.push(`projeto = "${alvo.projeto}"`)
  if (alvo.fluxo) partes.push(`fluxo = "${alvo.fluxo}"`)
  if (partes.length === 0) return []
  const recs = await pb.collection('valores_campos_personalizados').getFullList({
    filter: partes.join(' && '),
  })
  return recs.map(parseValor)
}

export async function salvarValorCampo(
  campoId: string,
  alvo: AlvoValor,
  valor: unknown,
  usuarioId?: string,
): Promise<void> {
  const partes: string[] = [`campo = "${campoId}"`]
  if (alvo.card) partes.push(`card = "${alvo.card}"`)
  if (alvo.contato) partes.push(`contato = "${alvo.contato}"`)
  if (alvo.projeto) partes.push(`projeto = "${alvo.projeto}"`)
  if (alvo.fluxo) partes.push(`fluxo = "${alvo.fluxo}"`)
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
    projeto: alvo.projeto || '',
    fluxo: alvo.fluxo || '',
    valor,
    criado_por: usuarioId || '',
  })
}

// ---------------- Máscaras ----------------
// Máscara é intrínseca ao tipo Números: detecta CPF (11 dígitos) / CNPJ (14) /
// telefone ao digitar e formata sozinha.

export function aplicarMascaraNumero(valorDigitado: string): string {
  const digitos = (valorDigitado || '').replace(/\D/g, '')
  if (digitos.length === 11) {
    return digitos
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})\.(\d{3})(\d)/, '$1.$2.$3')
      .replace(/(\d{3})\.(\d{3})\.(\d{3})(\d{1,2})$/, '$1.$2.$3-$4')
  }
  if (digitos.length === 14) {
    return digitos
      .replace(/^(\d{2})(\d)/, '$1.$2')
      .replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3')
      .replace(/\.(\d{3})(\d)/, '.$1/$2')
      .replace(/(\d{4})(\d{1,2})$/, '$1-$2')
  }
  if (digitos.length >= 10 && digitos.length <= 13) {
    // Telefone BR (até 11 dígitos) e afins
    if (digitos.length <= 11) {
      const d = digitos.slice(0, 11)
      if (d.length >= 10) {
        return d.replace(/^(\d{2})(\d)/, '($1) $2').replace(/(\d{4,5})(\d{4})$/, '$1-$2')
      }
    }
    return digitos
  }
  return valorDigitado
}

// Utilidades de moeda (campo tipo Moeda, digitação formatada em R$)
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

// Digitação progressiva em reais: "1234" → "R$ 12,34" (modelo caixinha de apps BR)
export function aplicarMascaraMoeda(valorDigitado: string): string {
  const digitos = (valorDigitado || '').replace(/\D/g, '')
  if (!digitos) return ''
  const centavos = parseInt(digitos, 10)
  return (centavos / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}
