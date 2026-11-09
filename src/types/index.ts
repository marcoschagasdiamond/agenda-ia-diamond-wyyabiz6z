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

export interface AtaOrganizadaReuniao {
  titulo?: string
  resumo_executivo?: string
  topicos_discutidos?: string[]
  decisoes?: string[]
  proximos_passos?: string[]
  demandas_sugeridas?: Array<{
    titulo: string
    descricao?: string
    prioridade?: CardPrioridade
    responsavel_sugerido?: string
    prazo_dias?: number
  }>
  cards_kanban?: Array<{
    titulo: string
    descricao?: string
    prioridade?: CardPrioridade
    status?: CardStatus | string
    proximo_passo?: string
  }>
}

export type StatusTranscricao = 'aguardando' | 'processado' | 'sem_transcricao'

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
  is_reuniao?: boolean
  audio_gravacao?: string
  duracao_gravacao?: number
  status_transcricao?: StatusTranscricao
  ata_organizada?: AtaOrganizadaReuniao | string
  arquivado?: boolean
  fixado?: boolean
  estado_semente?: boolean
  condicao_reativacao?: string
  data_revisao_semente?: string
  reativada_em?: string
  semente_origem_id?: string
  tese_semente?: string
  created: string
  updated: string
  expand?: {
    projeto?: Projeto
    negocio?: Negocio
    contato?: Contato
    tese_semente?: TeseSemente
  }
}

export interface TeseSemente {
  id: string
  nome: string
  descricao?: string
  cor?: string
  ordem?: number
  created?: string
  updated?: string
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
  ativo?: boolean
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
  lembrete_modo?: LembreteModo
  lembrete_antecedencias?: LembreteAntecedenciaCodigo[] | string
  card_pai?: string
  created: string
  updated: string
  expand?: {
    projeto?: Projeto
    negocio?: Negocio
    contato?: Contato
    responsavel?: User
    grupo_familia?: GrupoFamilia
    fluxo_id?: FluxoKanban
    card_pai?: Card
  }
}

export interface CardArquivo {
  id: string
  card: string
  nome: string
  arquivo: string
  tamanho?: number
  tipo?: string
  criado_por?: string
  created: string
  updated: string
  expand?: {
    card?: Card
    criado_por?: User
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
  lembrete_modo?: LembreteModo
  lembrete_antecedencias?: LembreteAntecedenciaCodigo[] | string
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

export type LembreteModo = 'padrao' | 'personalizado' | 'desativado'
export type LembreteAntecedenciaCodigo = '15m' | '30m' | '1h' | '2h' | '1d' | '2d' | '1w'

export interface ConfiguracaoLembretes {
  id: string
  usuario?: string
  antecedencias_reunioes: LembreteAntecedenciaCodigo[] | string
  antecedencias_tarefas: LembreteAntecedenciaCodigo[] | string
  email_reunioes_ativo: boolean
  sino_reunioes_ativo: boolean
  email_tarefas_ativo: boolean
  sino_tarefas_ativo: boolean
  avisar_atrasos_tarefas: boolean
  created?: string
  updated?: string
}

export type NotificacaoTipo = 'reuniao' | 'tarefa' | 'atraso' | 'sistema'

export interface NotificacaoSistema {
  id: string
  usuario?: string
  tipo: NotificacaoTipo
  titulo: string
  mensagem: string
  link?: string
  item_tipo?: 'evento' | 'demanda' | 'card' | string
  item_id?: string
  lida: boolean
  lida_em?: string
  created: string
  updated: string
  expand?: {
    usuario?: User
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
  lembrete_modo?: LembreteModo
  lembrete_antecedencias?: LembreteAntecedenciaCodigo[] | string
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
  is_master?: boolean
  created: string
  updated: string
  expand?: {
    usuario?: User
    adicionado_por?: User
  }
}

export type PlanoLicencaTipo = 'gratuito' | 'pro' | 'diamond_executive'
export type StatusLicencaTipo = 'ativo' | 'trial' | 'suspenso' | 'cancelado'

export interface LicencaConta {
  id: string
  nome_conta: string
  plano: PlanoLicencaTipo
  status: StatusLicencaTipo
  max_dias_folha: number
  max_projetos: number
  permite_convites: boolean
  permite_whatsapp: boolean
  permite_relatorios_avancados: boolean
  titular_email?: string
  titular_nome?: string
  observacoes?: string
  data_inicio?: string
  data_expiracao?: string
  data_renovacao?: string
  stripe_payment_link?: string
  preco_recorrencia?: number
  ciclo_cobranca?: 'mensal' | 'anual' | 'vitalicio'
  stripe_customer_id?: string
  stripe_subscription_id?: string
  stripe_webhook_secret?: string
  conta_teste?: boolean
  created: string
  updated: string
}

export interface ModuloLicenca {
  id: string
  licenca: string
  codigo: string
  slug?: string
  nome: string
  descricao?: string
  ativo: boolean
  created: string
  updated: string
}

export interface ConfigPlanoGratuito {
  id: string
  max_dias_folha: number
  max_projetos: number
  permite_convites: boolean
  permite_whatsapp: boolean
  permite_ia: boolean
  permite_financas: boolean
  modulos_inclusos: string[]
  nome_exibicao?: string
  descricao?: string
  created?: string
  updated?: string
}

export interface LimitesConsumoConta {
  plano: PlanoLicencaTipo
  status: StatusLicencaTipo
  nome_conta: string
  // Folha
  diasFolhaUsados: number
  diasFolhaMax: number
  bloqueadoFolha: boolean
  // Projetos
  projetosUsados: number
  projetosMax: number
  bloqueadoProjetos: boolean
  // Convites
  permiteConvites: boolean
  bloqueadoConvites: boolean
  convitesAtivos?: number
  // Módulos
  modulosAtivos: string[]
  moduloWhatsappAtivo: boolean
  moduloIaAtivo: boolean
  moduloFinancasAtivo: boolean
  // Checkout / Pagamento Real
  stripePaymentLink?: string
  precoMensal?: number
  precoMensalTexto: string
  // Modo Conta de Teste
  isContaTeste: boolean
  // Papéis
  isMaster: boolean
  isAdmin: boolean
}

export interface ResumoContaMaster {
  id: string
  nome_conta: string
  plano: PlanoLicencaTipo
  status: StatusLicencaTipo
  max_dias_folha: number
  max_projetos: number
  permite_convites: boolean
  titular_nome?: string
  titular_email?: string
  observacoes?: string
  stripe_payment_link?: string
  preco_recorrencia?: number
  ciclo_cobranca?: string
  data_inicio?: string
  data_renovacao?: string
  data_expiracao?: string
  conta_teste?: boolean
  diasFolhaUsados: number
  projetosUsados: number
  convitesTotal: number
  admins: MembroEquipe[]
  membros: MembroEquipe[]
  modulos: ModuloLicenca[]
  created: string
  updated: string
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
  email_enviado?: boolean
  erro_envio?: string
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
  | 'dropdown'
  | 'sim_nao'
  | 'numero'
  | 'avaliacao'
  | 'titulo_secao'

export interface FormCampoConfig {
  id: string
  label: string
  tipo: FormCampoTipo
  obrigatorio?: boolean
  placeholder?: string
  opcoes?: string[]
  ajuda?: string
  moeda?: boolean
  prefixoMoeda?: string
  valorMin?: number
  valorMax?: number
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

export type WhatsAppModoSelecao = 'apenas_escolhidos' | 'todos_exceto' | 'desligado'

export interface WhatsAppConfig {
  modo_selecao: WhatsAppModoSelecao
  contatos_escolhidos: string[]
  contatos_ignorados: string[]
  grupos_escolhidos: string[]
  ultima_sincronizacao?: string
  phone_number_id?: string
}

export interface WhatsAppPhoneNumber {
  id?: string
  display_phone_number?: string
  verified_name?: string
  quality_rating?: string
  code_verification_status?: string
}

export interface WhatsAppStatusResponse {
  conectado: boolean
  tem_conexao_salva?: boolean
  aviso_transitorio?: string | null
  phone_fetch_error?: string | null
  phone_numbers?: WhatsAppPhoneNumber[]
  config: WhatsAppConfig
}

export interface WhatsAppContatoItem {
  identificador: string
  nome: string
  empresa?: string
  telefone?: string
  contato_id?: string | null
  is_grupo?: boolean
  mensagens_count?: number
  origem?: 'sistema' | 'historico_whatsapp'
}

export interface WhatsAppGrupoItem {
  id: string
  nome: string
}

export interface WhatsAppContatosGruposResponse {
  sucesso: boolean
  phone_number_id?: string
  contatos: WhatsAppContatoItem[]
  grupos: WhatsAppGrupoItem[]
  grupos_aviso?: string | null
}

export interface WhatsAppSyncDetalhe {
  message_id: string
  folha_id?: string
  remetente?: string
  numero?: string
  is_grupo?: boolean
  grupo?: string
  contato_vinculado?: string | null
}

export interface WhatsAppSyncResponse {
  sucesso: boolean
  mensagens_processadas?: number
  mensagens_novas: number
  detalhes?: WhatsAppSyncDetalhe[]
  ultima_sincronizacao?: string
  mensagem?: string
  error?: string
}

export type TipoFeedbackTeste = 'bug' | 'sugestao' | 'ideia' | 'outro'
export type StatusFeedbackTeste = 'novo' | 'em_analise' | 'resolvido'

export interface FeedbackTesteItem {
  id: string
  texto: string
  tipo: TipoFeedbackTeste
  status: StatusFeedbackTeste
  usuario?: string
  conta?: string
  tela_origem?: string
  usuario_nome?: string
  usuario_email?: string
  resolvido_em?: string
  resolvido_por?: string
  resposta_master?: string
  created: string
  updated: string
  // Relações expandidas opcionais
  expand?: {
    usuario?: {
      id: string
      name?: string
      email?: string
      avatar?: string
    }
    conta?: {
      id: string
      nome_conta?: string
      plano?: string
      conta_teste?: boolean
    }
  }
}

export interface CriarFeedbackTesteInput {
  texto: string
  tipo: TipoFeedbackTeste
  tela_origem: string
  usuario?: string
  conta?: string
  usuario_nome?: string
  usuario_email?: string
}
