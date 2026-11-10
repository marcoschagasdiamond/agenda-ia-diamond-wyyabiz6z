// Fluxo de autorização de conectores de IA (OpenAI/Gemini) SEMPRE em nova aba/janela.
// Correção da regressão do Safari: navegar na mesma aba via window.location.assign
// dispara SecurityError no Safari e derruba a renderização da página (/config em branco).
// Aqui a janela é aberta SINCRONAMENTE no gesto do clique (o Safari permite) e recebe a
// URL do provedor logo depois; se o navegador bloquear a janela, devolvemos a URL para
// a seção oferecer um link clicável — a página nunca navega nem quebra.
import pb from './pocketbase/client'

export interface ResultadoConexaoNovaJanela {
  /** true quando o navegador bloqueou a janela: a URL deve ser oferecida como link clicável. */
  janelaBloqueada: boolean
  /** URL de autorização do provedor (sempre http/https quando válida). */
  url: string | null
}

// Abre a janela em branco no próprio clique (antes de qualquer await), gesto que o
// Safari respeita. Sem opener, para a tela de autorização não manipular esta aba.
const abrirJanelaAutorizacao = (): Window | null => {
  try {
    const janela = window.open('', '_blank')
    if (janela) {
      try {
        janela.opener = null
      } catch {
        // Alguns navegadores restringem opener; a navegação continua válida.
      }
    }
    return janela
  } catch {
    return null
  }
}

/**
 * Pede a URL de consentimento do conector e abre o provedor em NOVA janela/aba.
 * Nunca navega na aba atual — em caso de bloqueio devolve a URL para fallback clicável.
 */
export const conectarViaNovaJanela = async (
  toolkit: string,
  returnUrl: string,
): Promise<ResultadoConexaoNovaJanela> => {
  const janela = abrirJanelaAutorizacao()
  try {
    const res: unknown = await pb.send(
      `/api/skip/connectors/${encodeURIComponent(toolkit)}/connect`,
      { method: 'POST', body: { returnUrl } },
    )
    const url =
      res &&
      typeof res === 'object' &&
      'url' in res &&
      typeof (res as { url: unknown }).url === 'string'
        ? (res as { url: string }).url
        : null
    if (!url || !/^https?:/i.test(url)) {
      throw new Error('Não foi possível obter a URL de autorização do conector.')
    }
    if (!janela || janela.closed) {
      return { janelaBloqueada: true, url }
    }
    try {
      janela.location.href = url
    } catch {
      // Segurança bloqueou a navegação da janela já aberta: cai no fallback clicável.
      try {
        janela.close()
      } catch {
        // ignora
      }
      return { janelaBloqueada: true, url }
    }
    return { janelaBloqueada: false, url }
  } catch (err) {
    // Fecha a janela em branco se a URL não chegou, para não deixar aba vazia aberta.
    try {
      janela?.close()
    } catch {
      // ignora
    }
    throw err
  }
}
