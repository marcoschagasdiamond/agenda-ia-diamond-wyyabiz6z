export type ProjetoTipo =
  | 'negocio'
  | 'cliente'
  | 'posicionamento'
  | 'precos'
  | 'devices'
  | 'estudo'
  | 'freelance'

export type ProjetoStatus = 'ativo' | 'pausado' | 'concluido'

export type CardPrioridade = 'baixa' | 'media' | 'alta' | 'urgente'
export type CardStatus = 'novo' | 'em_andamento' | 'bloqueado' | 'concluido'
export type OrigemTipo = 'manual' | 'email' | 'whatsapp' | 'importado'
export type FolhaStatus = 'pendente' | 'processado' | 'ignorado'
export type DemandaStatus = 'pendente' | 'concluido'
export type ListaTipo = 'contatos' | 'demandas' | 'cadastros'
export type ListaCompartilhada = 'interno' | 'clientes' | 'publica'

export interface User {
  id: string
  email: string
  name: string
  avatar?: string
  created: string
  updated: string
}

export interface Profile {
  id: string
  user: string
  respostas_onboarding?: {
    quem_e_voce?: string
    o_que_faz?: string
    quais_projetos?: string
    quais_objetivos?: string
  }
  objetivos?: string
  posicionamento?: string
  precos?: string
  preferencias?: string
  created: string
  updated: string
}

export interface Pasta {
  id: string
  nome: string
  pasta_pai?: string
  projeto?: string
  created: string
  updated: string
}

export interface Negocio {
  id: string
  nome: string
  descricao?: string
  tipo?: string
  status?: string
  created: string
  updated: string
}

export interface Projeto {
  id: string
  nome: string
  descricao?: string
  tipo?: ProjetoTipo
  status?: ProjetoStatus
  pasta_raiz?: string
  contexto_resumido?: string
  created: string
  updated: string
  expand?: {
    pasta_raiz?: Pasta
  }
}

export interface Contato {
  id: string
  nome: string
  empresa?: string
  email?: string
  telefone?: string
  cargo?: string
  tags?: string[]
  projetos?: string[]
  negocios?: string[]
  origem?: OrigemTipo
  contexto_resumido?: string
  created: string
  updated: string
  expand?: {
    projetos?: Projeto[]
    negocios?: Negocio[]
  }
}

export interface FolhaDia {
  id: string
  data?: string
  data_hora?: string
  ordem?: number
  registro: string
  tipo_origem?: OrigemTipo
  origem_ref?: string
  status?: FolhaStatus
  projeto?: string
  negocio?: string
  contato?: string
  fluxo?: CardStatus | string
  timeline?: string
  created: string
  updated: string
  expand?: {
    projeto?: Projeto
    negocio?: Negocio
    contato?: Contato
  }
}

export interface GrupoFamilia {
  id: string
  nome: string
  ordem?: number
  cor?: string
  coluna?: string
  categoria?: string
  created?: string
  updated?: string
  expand?: {
    coluna?: ColunaFluxo
    categoria?: CategoriaFluxo
  }
}

export interface CategoriaFluxo {
  id: string
  nome: string
  ordem?: number
  cor?: string
  descricao?: string
  created?: string
  updated?: string
}

export interface Card {
  id: string
  titulo: string
  descricao?: string
  projeto?: string
  negocio?: string
  contato?: string
  grupo_familia?: string
  tags?: string[]
  prioridade?: CardPrioridade
  status?: CardStatus | string
  proximo_passo?: string
  responsavel?: string
  criado_por_ia?: boolean
  created: string
  updated: string
  expand?: {
    projeto?: Projeto
    negocio?: Negocio
    contato?: Contato
    responsavel?: User
    grupo_familia?: GrupoFamilia
  }
}

export interface Demanda {
  id: string
  titulo: string
  descricao?: string
  card_origem?: string
  atribuido_a?: string
  status?: DemandaStatus
  prazo?: string
  projeto?: string
  contato?: string
  prioridade?: CardPrioridade
  timeline?: string
  created: string
  updated: string
  expand?: {
    card_origem?: Card
    atribuido_a?: User
    projeto?: Projeto
    contato?: Contato
  }
}

export interface Lista {
  id: string
  nome: string
  tipo?: ListaTipo
  itens_contatos?: string[]
  itens_demandas?: string[]
  compartilhada_com?: ListaCompartilhada
  created: string
  updated: string
  expand?: {
    itens_contatos?: Contato[]
    itens_demandas?: Demanda[]
  }
}

export interface Arquivo {
  id: string
  nome: string
  arquivo: string
  pasta?: string
  projeto?: string
  created: string
  updated: string
  expand?: {
    pasta?: Pasta
    projeto?: Projeto
  }
}

export interface ResumoDia {
  id: string
  data: string
  feito?: string
  a_fazer?: string
  prioridades?: string
  decisoes?: string
  proximos_passos?: string
  contagem_cards_criados?: number
  created: string
  updated: string
}

export interface Cliente {
  id: string
  nome: string
  email: string
  telefone?: string
  empresa?: string
  cadastrado_por: string
  tags?: string[]
  created: string
  updated: string
  expand?: {
    cadastrado_por?: User
  }
}

export interface ClienteProjeto {
  id: string
  cliente: string
  projeto: string
  acesso_ativado: boolean
  created: string
  updated: string
  expand?: {
    cliente?: Cliente
    projeto?: Projeto
  }
}

export interface RespostaTemplate {
  id: string
  template_slug: string
  respostas: Record<string, unknown>
  projeto?: string
  contato?: string
  created: string
  updated: string
}

export interface ColunaFluxo {
  id: string
  chave: string
  titulo: string
  cor?: string
  ordem?: number
  categoria?: string
  created?: string
  updated?: string
  expand?: {
    categoria?: CategoriaFluxo
  }
}

export interface MarcoTimeline {
  id: string
  nome: string
  descricao?: string
  projeto?: string
  created?: string
  updated?: string
}
