// Google Drive (conectores de app — toolkit googledrive, conta de CADA usuário).
// Busca/listagem de arquivos e PASTAS do Drive do usuário logado para vincular
// aos cards e à área de Arquivos. Nada é baixado para o app: guardamos id + link.
import { execute, listConnectors, type ConnectorResult } from '@/lib/skipConnectors'

export const DRIVE_TOOLKIT = 'googledrive'

export const MIME_PASTA_DRIVE = 'application/vnd.google-apps.folder'

export interface ArquivoDrive {
  id: string
  nome: string
  mimeType: string
  webViewLink?: string
  iconLink?: string
  tamanho?: number
  modificadoEm?: string
  pasta?: boolean
}

interface DriveFileBruto {
  id?: unknown
  name?: unknown
  mimeType?: unknown
  webViewLink?: unknown
  iconLink?: unknown
  size?: unknown
  modifiedTime?: unknown
}

/** O toolkit googledrive está conectado para o usuário logado? */
export async function driveEstaConectado(): Promise<boolean> {
  try {
    const lista = await listConnectors()
    return lista.find((c) => c.toolkit === DRIVE_TOOLKIT)?.status === 'connected'
  } catch {
    return false
  }
}

/** Normaliza a resposta do conector; formato inesperado é erro, nunca dado vazio. */
function normalizar(data: unknown): ArquivoDrive[] {
  const no = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null
  let files: unknown = data
  if (no(files) && Array.isArray((files as Record<string, unknown>).files)) {
    files = (files as Record<string, unknown>).files
  }
  if (!Array.isArray(files)) {
    throw new Error('Resposta inesperada do Google Drive')
  }
  return (files as unknown[])
    .filter(no)
    .map((f): ArquivoDrive | null => {
      const id = typeof f.id === 'string' ? f.id : null
      if (!id) return null
      const mimeType = typeof f.mimeType === 'string' ? f.mimeType : ''
      const webViewLink = typeof f.webViewLink === 'string' ? f.webViewLink : undefined
      return {
        id,
        nome: typeof f.name === 'string' ? f.name : 'Sem nome',
        mimeType,
        webViewLink,
        iconLink: typeof f.iconLink === 'string' ? f.iconLink : undefined,
        tamanho: typeof f.size === 'string' ? Number(f.size) : undefined,
        modificadoEm: typeof f.modifiedTime === 'string' ? f.modifiedTime : undefined,
        pasta: mimeType === MIME_PASTA_DRIVE,
      }
    })
    .filter((f): f is ArquivoDrive => f !== null)
}

function apenasPastas(data: unknown): ArquivoDrive[] {
  return normalizar(data).filter((f) => f.pasta)
}

/** Lista as pastas do Drive do usuário (raiz / Meu Drive). */
export async function listarPastasDrive(pageSize = 25): Promise<ArquivoDrive[]> {
  const res: ConnectorResult = await execute('GOOGLEDRIVE_LIST_FILES', {
    q: `mimeType = '${MIME_PASTA_DRIVE}' and trashed = false`,
    fields: 'files(id,name,mimeType,webViewLink,modifiedTime)',
    pageSize,
    orderBy: 'name',
  })
  if (!res.successful) throw new Error(res.error || 'Falha ao listar pastas do Google Drive')
  return apenasPastas(res.data)
}

/** Busca pastas do Drive por nome. */
export async function buscarPastasDrive(busca: string, pageSize = 25): Promise<ArquivoDrive[]> {
  const termo = busca.trim().replace(/'/g, "\\'")
  if (!termo) return listarPastasDrive(pageSize)
  const res: ConnectorResult = await execute('GOOGLEDRIVE_FIND_FILE', {
    q: `name contains '${termo}' and mimeType = '${MIME_PASTA_DRIVE}' and trashed = false`,
    fields: 'files(id,name,mimeType,webViewLink,modifiedTime)',
    pageSize,
  })
  if (!res.successful) throw new Error(res.error || 'Falha ao buscar pastas no Google Drive')
  return apenasPastas(res.data)
}

/** Lista os arquivos mais recentes do Drive do usuário (raiz / Meu Drive). */
export async function listarArquivosDrive(pageSize = 25): Promise<ArquivoDrive[]> {
  const res: ConnectorResult = await execute('GOOGLEDRIVE_LIST_FILES', {
    pageSize,
    fields: 'files(id,name,mimeType,webViewLink,size,modifiedTime)',
    orderBy: 'modifiedTime desc',
  })
  if (!res.successful) throw new Error(res.error || 'Falha ao listar arquivos do Google Drive')
  return normalizar(res.data)
}

/** Busca arquivos do Drive por nome. */
export async function buscarArquivosDrive(busca: string, pageSize = 25): Promise<ArquivoDrive[]> {
  const termo = busca.trim().replace(/'/g, "\\'")
  if (!termo) return listarArquivosDrive(pageSize)
  const res: ConnectorResult = await execute('GOOGLEDRIVE_FIND_FILE', {
    q: `name contains '${termo}' and trashed = false`,
    fields: 'files(id,name,mimeType,webViewLink,size,modifiedTime)',
    pageSize,
  })
  if (!res.successful) throw new Error(res.error || 'Falha ao buscar no Google Drive')
  return normalizar(res.data)
}

/** Link de abertura de um arquivo do Drive (webViewLink, com fallback de URL canônica). */
export function linkAbrirDrive(f: Pick<ArquivoDrive, 'id' | 'webViewLink'>): string {
  return f.webViewLink || `https://drive.google.com/file/d/${f.id}/view`
}

/** Link de abertura de uma PASTA do Drive (webViewLink, com fallback canônico). */
export function linkAbrirPastaDrive(f: Pick<ArquivoDrive, 'id' | 'webViewLink'>): string {
  return f.webViewLink || `https://drive.google.com/drive/folders/${f.id}`
}
