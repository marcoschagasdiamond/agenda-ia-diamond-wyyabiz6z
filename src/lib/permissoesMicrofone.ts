// Detecção de navegador e estado da permissão de microfone para o gravador da
// Nova Reunião (Folha do Dia). Também detecta execução dentro de iframe — no
// Safari, o prompt de permissão do microfone nem chega a ser oferecido dentro
// de iframe, então orientamos o usuário a abrir o app direto na URL.

export type NavegadorDetectado = 'safari' | 'safari-ios' | 'chrome' | 'edge' | 'firefox' | 'outro'

export type EstadoPermissaoMicrofone = 'concedida' | 'negada' | 'nao_pedida' | 'indeterminado'

export interface InstrucaoPermissao {
  titulo: string
  passos: string[]
}

/** Detecta o navegador a partir do userAgent (mesma heurística de conexaoAutorizacao.ts). */
export const detectarNavegador = (): NavegadorDetectado => {
  if (typeof navigator === 'undefined') return 'outro'
  const ua = navigator.userAgent
  const ehIOS = /iPhone|iPad|iPod/i.test(ua) || (/Macintosh/i.test(ua) && 'ontouchend' in document)
  if (/Safari/i.test(ua) && !/Chrom|Edg|OPR|Fxi/i.test(ua)) {
    return ehIOS ? 'safari-ios' : 'safari'
  }
  if (/Fxi/i.test(ua)) return 'firefox'
  if (/Edg/i.test(ua)) return 'edge'
  if (/Chrom/i.test(ua)) return 'chrome'
  return 'outro'
}

/** true quando a página roda dentro de um iframe (window.self !== window.top). */
export const estaEmIframe = (): boolean => {
  try {
    return typeof window !== 'undefined' && window.self !== window.top
  } catch {
    // Acesso cross-origin ao top negado: necessariamente está em iframe.
    return true
  }
}

/** Instrução específica em português por navegador para desbloquear o microfone. */
export const instrucaoPorNavegador = (navegador: NavegadorDetectado): InstrucaoPermissao => {
  switch (navegador) {
    case 'safari':
      return {
        titulo: 'Permitir o microfone no Safari (Mac)',
        passos: [
          'Na barra de endereço do Safari, clique no menu “Safari” (ou “aA” ao lado do endereço).',
          'Abra “Ajustes para Este Site...” (Preferences for This Website).',
          'Em “Microfone”, escolha “Permitir” (Allow).',
          'Depois recarregue a página (Cmd+R) para que a permissão seja aplicada.',
        ],
      }
    case 'safari-ios':
      return {
        titulo: 'Permitir o microfone no Safari (iPhone/iPad)',
        passos: [
          'Abra o app “Ajustes” do iPhone/iPad.',
          'Role até “Safari” e toque nele.',
          'Toque em “Microfone” e escolha “Permitir” ou “Perguntar”.',
          'Volte ao Safari e recarregue a página.',
        ],
      }
    case 'chrome':
      return {
        titulo: 'Permitir o microfone no Chrome',
        passos: [
          'Clique no ícone de cadeado (ou ajustes) à esquerda da barra de endereço.',
          'Abra “Permissões deste site” / “Configurações do site”.',
          'Em “Microfone”, mude de “Bloqueado” para “Permitir”.',
          'Clique fora do painel e recarregue a página para aplicar.',
        ],
      }
    case 'edge':
      return {
        titulo: 'Permitir o microfone no Microsoft Edge',
        passos: [
          'Clique no ícone de cadeado à esquerda da barra de endereço.',
          'Abra “Permissões deste site”.',
          'Em “Microfone”, mude para “Permitir”.',
          'Recarregue a página para aplicar a permissão.',
        ],
      }
    case 'firefox':
      return {
        titulo: 'Permitir o microfone no Firefox',
        passos: [
          'Clique no ícone de permissões à esquerda da barra de endereço.',
          'Em “Usar o microfone”, remova o status “Bloqueado temporariamente”.',
          'Recarregue a página — o Firefox pedirá a permissão novamente.',
        ],
      }
    default:
      return {
        titulo: 'Permitir o microfone no navegador',
        passos: [
          'Abra as permissões deste site pelo ícone na barra de endereço.',
          'Localize a permissão de “Microfone” e escolha “Permitir”.',
          'Recarregue a página para aplicar.',
        ],
      }
  }
}

/**
 * Consulta o estado atual da permissão de microfone via Permissions API
 * (quando disponível — Firefox e Safari antigos não suportam 'microphone').
 */
export const consultarPermissaoMicrofone = async (): Promise<EstadoPermissaoMicrofone> => {
  if (typeof navigator === 'undefined' || !navigator.permissions?.query) {
    return 'indeterminado'
  }
  try {
    const status = await navigator.permissions.query({
      name: 'microphone' as PermissionName,
    })
    if (status.state === 'granted') return 'concedida'
    if (status.state === 'denied') return 'negada'
    return 'nao_pedida'
  } catch {
    // Safari/Firefox podem lançar TypeError para o nome 'microphone'.
    return 'indeterminado'
  }
}

/**
 * Tenta obter o stream de microfone proativamente (chamado ao ABRIR o modal,
 * sem esperar o clique em gravar). Em caso de sucesso guarda o stream para
 * reuso pelo gravador; em caso de erro devolve o estado de permissão.
 */
export const pedirPermissaoMicrofone = async (): Promise<{
  estado: EstadoPermissaoMicrofone
  stream: MediaStream | null
  erroNome?: string
}> => {
  if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
    return { estado: 'indeterminado', stream: null }
  }
  try {
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
      },
    })
    return { estado: 'concedida', stream }
  } catch (err: any) {
    const nome = err?.name || ''
    if (
      nome === 'NotAllowedError' ||
      nome === 'PermissionDeniedError' ||
      nome === 'SecurityError'
    ) {
      return { estado: 'negada', stream: null, erroNome: nome }
    }
    if (nome === 'NotFoundError' || nome === 'DevicesNotFoundError') {
      return { estado: 'indeterminado', stream: null, erroNome: nome }
    }
    return { estado: 'indeterminado', stream: null, erroNome: nome || 'ErroDesconhecido' }
  }
}
