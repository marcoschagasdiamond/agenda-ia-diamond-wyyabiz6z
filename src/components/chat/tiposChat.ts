// Tipos compartilhados do chat interno.
export type AbaConversas = 'todas' | 'nao_lidas'

export type AlvoConversa =
  | { tipo: 'individual'; id: string; nome: string }
  | { tipo: 'grupo'; id: string; nome: string }
