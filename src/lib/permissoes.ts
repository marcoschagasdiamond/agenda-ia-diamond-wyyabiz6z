// Modelo central de permissões por função do Agenda IA Diamond.
// Funções: Dono/Master (dono da licença), Admin (eleito pelo Master), Membro, Portal do Cliente.
import type { MembroEquipe } from '@/types'

export type FuncaoAcesso = 'master' | 'admin' | 'membro' | 'portal_cliente'

export type RecursoApp =
  | 'dashboard'
  | 'folha'
  | 'calendario'
  | 'fluxo'
  | 'projetos'
  | 'contatos'
  | 'arquivos'
  | 'listas'
  | 'clientes'
  | 'equipe'
  | 'agente'
  | 'memoria'
  | 'resumos'
  | 'config'
  | 'chat'
  | 'master'
  | 'portal'

export const EMAIL_FUNDADOR_MASTER = 'marcoschagasdiamond@icloud.com'

export const ROTULOS_FUNCAO: Record<FuncaoAcesso, string> = {
  master: 'Dono (Master)',
  admin: 'Administrador',
  membro: 'Membro',
  portal_cliente: 'Portal do Cliente',
}

// O que cada função pode acessar. Membro vê a equipe em modo somente leitura (a
// página trata isso); Configurações e Equipe são restritas a admin/Master;
// /master só Master; o portal do cliente só acessa o próprio portal.
const ACESSO_POR_RECURSO: Record<RecursoApp, FuncaoAcesso[]> = {
  dashboard: ['master', 'admin', 'membro'],
  folha: ['master', 'admin', 'membro'],
  calendario: ['master', 'admin', 'membro'],
  fluxo: ['master', 'admin', 'membro'],
  projetos: ['master', 'admin', 'membro'],
  contatos: ['master', 'admin', 'membro'],
  arquivos: ['master', 'admin', 'membro'],
  listas: ['master', 'admin', 'membro'],
  clientes: ['master', 'admin', 'membro'],
  equipe: ['master', 'admin'],
  agente: ['master', 'admin', 'membro'],
  memoria: ['master', 'admin', 'membro'],
  resumos: ['master', 'admin', 'membro'],
  chat: ['master', 'admin', 'membro'],
  config: ['master', 'admin'],
  master: ['master'],
  portal: ['portal_cliente'],
}

export function podeAcessarRecurso(funcao: FuncaoAcesso, recurso: RecursoApp): boolean {
  const permitidos = ACESSO_POR_RECURSO[recurso]
  if (!permitidos) return true
  return permitidos.includes(funcao)
}

// Resolve a função efetiva do usuário logado a partir do Master + registro em membros_equipe.
export function funcaoAtivaDoUsuario(
  isMaster: boolean,
  email?: string,
  membros: MembroEquipe[] = [],
): FuncaoAcesso {
  if (isMaster || email === EMAIL_FUNDADOR_MASTER) return 'master'
  const registro = membros.find((m) => m.email === email)
  if (registro && (registro.funcao === 'admin' || registro.nivel_acesso === 'admin')) return 'admin'
  return 'membro'
}

// Função de acesso de um registro da equipe: dono → master, admin eleito → admin,
// demais (inclusive visualizador/somente leitura) → membro.
export function funcaoDoRegistro(m: MembroEquipe | null): FuncaoAcesso {
  if (!m) return 'membro'
  if (isMembroProprietario(m)) return 'master'
  if (m.funcao === 'admin' || m.nivel_acesso === 'admin') return 'admin'
  return 'membro'
}

// Admin e Master podem gerenciar a equipe; membro vê somente leitura.
export function podeGerenciarEquipe(funcao: FuncaoAcesso): boolean {
  return funcao === 'master' || funcao === 'admin'
}

export function isMembroProprietario(m: MembroEquipe): boolean {
  return Boolean(m.is_master) || m.email === EMAIL_FUNDADOR_MASTER
}

export function rotuloFuncaoMembro(m: MembroEquipe): string {
  if (isMembroProprietario(m)) return ROTULOS_FUNCAO.master
  if (m.funcao === 'admin' || m.nivel_acesso === 'admin') return ROTULOS_FUNCAO.admin
  if (m.funcao === 'visualizador' || m.nivel_acesso === 'leitura') return 'Somente Leitura'
  return ROTULOS_FUNCAO.membro
}

export const STATUS_MEMBRO_ROTULO: Record<string, string> = {
  ativo: 'Ativo',
  pendente: 'Convite Pendente',
  suspenso: 'Desativado',
}

// Membros suspensos (desativados) não podem entrar nem continuar logados.
export function isMembroAtivo(m: MembroEquipe | null | undefined): boolean {
  if (!m) return true
  return m.status !== 'suspenso'
}

// Mapa rota base do menu lateral -> recurso protegido
const RECURSO_POR_ROTA: Record<string, RecursoApp> = {
  '/': 'dashboard',
  '/folha': 'folha',
  '/calendario': 'calendario',
  '/fluxo': 'fluxo',
  '/projetos': 'projetos',
  '/contatos': 'contatos',
  '/arquivos': 'arquivos',
  '/listas': 'listas',
  '/clientes': 'clientes',
  '/equipe': 'equipe',
  '/agente': 'agente',
  '/memoria': 'memoria',
  '/resumos': 'resumos',
  '/chat': 'chat',
  '/config': 'config',
  '/master': 'master',
  '/portal': 'portal',
}

export function recursoDaRota(path: string): RecursoApp | null {
  if (RECURSO_POR_ROTA[path]) return RECURSO_POR_ROTA[path]
  const base = '/' + (path.split('/')[1] || '')
  return RECURSO_POR_ROTA[base] ?? null
}

export function podeAcessarRota(funcao: FuncaoAcesso, path: string): boolean {
  const recurso = recursoDaRota(path)
  if (!recurso) return true
  return podeAcessarRecurso(funcao, recurso)
}

// Filtra os itens do menu lateral conforme a função do usuário logado.
export function itensMenuPermitidos<T extends { path: string }>(
  funcao: FuncaoAcesso,
  itens: T[],
): T[] {
  return itens.filter((item) => podeAcessarRota(funcao, item.path))
}

// Rotas acessíveis a qualquer usuário autenticado (sem recursoTipo no ProtectedRoute).
export function rotaSemRestricao(path: string): boolean {
  const semRestricao = ['/perfil', '/conta', '/portal', '/portal/demandas', '/onboarding']
  if (semRestricao.includes(path)) return true
  const base = '/' + (path.split('/')[1] || '')
  return semRestricao.includes(base)
}
