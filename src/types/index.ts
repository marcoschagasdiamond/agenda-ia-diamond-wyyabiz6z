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

export type EventoCalendarioCategoria =
  | 'reuniao'
  | 'prazo'
  | 'etapa'
  | 'atividade'
  | 'alinhamento'
  | 'outro'

export type EventoCalendarioStatus = 'pendente' | 'em_andamento' | 'concluido' | 'cancelado'

export type CalendarioItemTipo =
  | 'evento'
  | 'demanda'
  | 'card'
  | 'folha'
  | 'marco'
  | 'projeto_fase'
  | 'projeto_inicio'
  | 'projeto_fim'

export interface ItemCalendarioUnificado {
  id: string
  titulo: string
  descricao?: string
  dataHora: string // ISO ou YYYY-MM-DD ou YYYY-MM-DDTHH:mm
  dataHoraFim?: string
  diaInteiro: boolean
  tipo: CalendarioItemTipo
  status?: string
  prioridade?: CardPrioridade
  cor?: string
  projetoNome?: string
  projetoId?: string
  contatoNome?: string
  contatoId?: string
  responsavelNome?: string
  faseColunaNome?: string
  rawItem: unknown
}

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
  cliente?: string
  data_inicio?: string
  data_fim?: string
  orcamento_total?: number
  cor?: string
  responsavel?: string
  created: string
  updated: string
  expand?: {
    pasta_raiz?: Pasta
    cliente?: Cliente
    responsavel?: User
  }
}

export type ProjetoFaseStatus = 'nao_iniciada' | 'em_andamento' | 'bloqueada' | 'concluida'

export interface ProjetoFase {
  id: string
  projeto: string
  nome: string
  descricao?: string
  ordem?: number
  cor?: string
  data_inicio?: string
  data_fim?: string
  progresso?: number // 0 a 100
  status?: ProjetoFaseStatus
  is_conclusao?: boolean
  created: string
  updated: string
  expand?: {
    projeto?: Projeto
  }
}

export interface ProjetoEquipeMembro {
  id: string
  projeto: string
  usuario?: string
  nome?: string
  email?: string
  funcao?: string // coordenador, técnico, financeiro, etc.
  nivel_acesso?: NivelAcesso
  status?: MembroStatus
  created: string
  updated: string
  expand?: {
    projeto?: Projeto
    usuario?: User
  }
}

export interface ProjetoInvestidor {
  id: string
  projeto: string
  nome: string
  email?: string
  telefone?: string
  valor_investido?: number
  participacao_percentual?: number
  data_aporte?: string
  observacoes?: string
  created: string
  updated: string
  expand?: {
    projeto?: Projeto
  }
}

export type ProjetoFinanceiroTipo = 'entrada' | 'desembolso'
export type ProjetoFinanceiroStatus = 'previsto' | 'realizado' | 'cancelado'

export interface ProjetoFinanceiroLancamento {
  id: string
  projeto: string
  tipo: ProjetoFinanceiroTipo
  valor: number
  data: string
  descricao: string
  fase?: string
  categoria_custo?: string
  status?: ProjetoFinanceiroStatus
  comprovante_ref?: string
  observacoes?: string
  created: string
  updated: string
  expand?: {
    projeto?: Projeto
    fase?: ProjetoFase
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
  titulo_fases?: string
  created?: string
  updated?: string
}

export interface FluxoKanban {
  id: string
  nome: string
  titulo?: string
  cor?: string
  ordem?: number
  categoria?: string
  titulo_fases?: string
  template_origem?: string
  created?: string
  updated?: string
}

export interface ColunaFluxo {
  id: string
  chave: string
  titulo: string
  cor?: string
  ordem?: number
  categoria?: string
  fluxo_id?: string
  titulo_fases?: string
  is_conclusao?: boolean
  template_origem?: string
  created?: string
  updated?: string
}

export interface Card {
  id: string
  titulo: string
  fluxo_id?: string
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
  data_prazo?: string
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
  titulo_fases?: string
  is_conclusao?: boolean
  template_origem?: string
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
  data_alvo?: string
  created?: string
  updated?: string
  expand?: {
    projeto?: Projeto
  }
}

export interface EventoCalendario {
  id: string
  titulo: string
  descricao?: string
  data_inicio: string
  data_fim?: string
  dia_inteiro?: boolean
  categoria?: EventoCalendarioCategoria
  status?: EventoCalendarioStatus
  prioridade?: CardPrioridade
  cor?: string
  projeto?: string
  contato?: string
  criado_por?: string
  created: string
  updated: string
  expand?: {
    projeto?: Projeto
    contato?: Contato
    criado_por?: User
  }
}

export type EscopoTipo = 'geral' | 'projeto' | 'fluxo' | 'categoria' | 'cliente' | 'demanda'
export type NivelAcesso = 'leitura' | 'edicao' | 'admin'
export type MembroStatus = 'ativo' | 'pendente' | 'suspenso'
export type ConviteStatus = 'pendente' | 'aceito' | 'revogado' | 'expirado'

export interface EscopoItem {
  tipo: EscopoTipo
  id?: string
  nome?: string
  nivel: NivelAcesso
}

export interface MembroEquipe {
  id: string
  usuario?: string
  email: string
  nome?: string
  funcao?: 'admin' | 'membro' | 'visualizador'
  nivel_acesso?: NivelAcesso
  status: MembroStatus
  escopos?: EscopoItem[] | string
  adicionado_por?: string
  ultimo_acesso?: string
  observacoes?: string
  created: string
  updated: string
  expand?: {
    usuario?: User
    adicionado_por?: User
  }
}

export interface ConviteEquipe {
  id: string
  email: string
  token: string
  escopo_tipo: EscopoTipo
  escopo_id?: string
  escopo_nome?: string
  nivel_acesso: NivelAcesso
  status: ConviteStatus
  mensagem?: string
  expira_em?: string
  enviado_em?: string
  aceito_em?: string
  convidado_por?: string
  usuario_aceitou?: string
  projeto_ref?: string
  cliente_ref?: string
  fluxo_ref?: string
  categoria_ref?: string
  demanda_ref?: string
  created: string
  updated: string
  expand?: {
    convidado_por?: User
    usuario_aceitou?: User
    projeto_ref?: Projeto
    cliente_ref?: Cliente
    fluxo_ref?: FluxoKanban
    categoria_ref?: CategoriaFluxo
    demanda_ref?: Demanda
  }
}

export interface TagSistema {
  id: string
  nome: string
  cor?: string
  descricao?: string
  categoria?: string
  created?: string
  updated?: string
}

export interface PastaFormulario {
  id: string
  nome: string
  cor?: string
  descricao?: string
  created?: string
  updated?: string
}

export type FormCampoTipo =
  | 'texto'
  | 'texto_longo'
  | 'email'
  | 'telefone'
  | 'data'
  | 'escolha_unica'
  | 'escolha_multipla'

export interface FormCampoConfig {
  id: string
  label: string
  tipo: FormCampoTipo
  obrigatorio?: boolean
  placeholder?: string
  opcoes?: string[]
}

export interface Formulario {
  id: string
  titulo: string
  descricao?: string
  slug: string
  publicado: boolean
  pasta_grupo?: string
  campos: FormCampoConfig[] | string
  criado_por?: string
  mensagem_sucesso?: string
  cor_tema?: string
  created: string
  updated: string
  expand?: {
    criado_por?: User
  }
}

export interface FormularioResposta {
  id: string
  formulario: string
  dados: Record<string, unknown> | string
  respondente_identificacao?: string
  respondente_email?: string
  ip_origem?: string
  created: string
  updated: string
  expand?: {
    formulario?: Formulario
  }
}
