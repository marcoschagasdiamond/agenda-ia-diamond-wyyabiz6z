export interface FaseTemplateItem {
  titulo: string
  cor: string
  is_conclusao?: boolean
}

export interface FluxoTemplate {
  id: string
  nome: string
  descricao: string
  fases: FaseTemplateItem[]
}

/**
 * Modelos prontos de fases para fluxos:
 * 1. Modelo DiamondGroup padrão (da imagem de referência):
 *    Backlog, A Fazer, Fazendo, Conferir, Finalizado
 * 2. Modelo 5 Colunas Técnico (legado):
 *    BACKLOG, ENCAMINHAR AO TECNICO, EM ANALISE, EM DESENVOLVIMENTO, TERMINO
 * 3. Modelo Simples (3 colunas):
 *    A Fazer, Fazendo, Concluído
 */
export const MODELOS_FLUXO_TEMPLATES: FluxoTemplate[] = [
  {
    id: 'diamond_padrao',
    nome: 'DiamondGroup Padrão (5 Fases)',
    descricao:
      'Backlog → A Fazer → Fazendo → Conferir → Finalizado (com fase de conclusão e bloco de visualização)',
    fases: [
      { titulo: 'Backlog', cor: '#64748B', is_conclusao: false },
      { titulo: 'A Fazer', cor: '#0EA5E9', is_conclusao: false },
      { titulo: 'Fazendo', cor: '#F59E0B', is_conclusao: false },
      { titulo: 'Conferir', cor: '#8B5CF6', is_conclusao: false },
      { titulo: 'Finalizado', cor: '#10B981', is_conclusao: true },
    ],
  },
  {
    id: 'tecnico_legado',
    nome: 'Operação Técnica Diamond (5 Colunas)',
    descricao: 'BACKLOG → ENCAMINHAR AO TECNICO → EM ANALISE → EM DESENVOLVIMENTO → TERMINO',
    fases: [
      { titulo: 'BACKLOG', cor: '#64748B', is_conclusao: false },
      { titulo: 'ENCAMINHAR AO TECNICO', cor: '#0EA5E9', is_conclusao: false },
      { titulo: 'EM ANALISE', cor: '#F59E0B', is_conclusao: false },
      { titulo: 'EM DESENVOLVIMENTO', cor: '#8B5CF6', is_conclusao: false },
      { titulo: 'TERMINO', cor: '#10B981', is_conclusao: true },
    ],
  },
  {
    id: 'simples_3_colunas',
    nome: 'Fluxo Ágil Simples (3 Fases)',
    descricao: 'A Fazer → Em Andamento → Finalizado',
    fases: [
      { titulo: 'A Fazer', cor: '#0EA5E9', is_conclusao: false },
      { titulo: 'Em Andamento', cor: '#F59E0B', is_conclusao: false },
      { titulo: 'Finalizado', cor: '#10B981', is_conclusao: true },
    ],
  },
  {
    id: 'personalizado_1_coluna',
    nome: 'Coluna Única (Personalizado)',
    descricao: 'Cria apenas uma etapa específica com o nome e cor definidos por você',
    fases: [],
  },
]

export const TEMPLATE_PADRAO_ID = 'diamond_padrao'

export function gerarSlugChave(texto: string, sufixo?: string): string {
  const limpo = texto
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')

  const rand = sufixo || Math.random().toString(36).substring(2, 7)
  return `${limpo || 'fase'}_${rand}`
}
