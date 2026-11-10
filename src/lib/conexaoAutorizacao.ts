// Fluxo de autorização de conectores de IA (OpenAI/Gemini) SEMPRE em nova aba/janela.
// Correção da regressão do Safari: navegar na mesma aba via window.location.assign
// dispara SecurityError no Safari e derruba a renderização da página (/config em branco).
// Aqui a janela é aberta SINCRONAMENTE no gesto do clique (o Safari permite) e recebe a
// URL do provedor logo depois; se o navegador bloquear a janela, devolvemos a URL para
// a seção oferecer um link clicável — a página nunca navega nem quebra.
//
// IMPORTANTE para o gesto do Safari: o window.open DEVE ser o primeiro código do clique,
// sem NENHUM await antes dele (transient activation do Safari expira em ~1s e não sobrevive
// a microsserviços de rede). Esta função é construída para ser chamada direto do onClick:
// o corpo roda sincronamente até o primeiro await, e o window.open vem antes dele.
import pb from './pocketbase/client'

export type MotivoBloqueio =
  | 'janela_nula' // window.open retornou null: popup blocker ativo
  | 'janela_fechada' // a janela foi fechada antes da URL chegar
  | 'navegacao_bloqueada' // janela abriu, mas o navegador impediu de navegar à URL
  | 'erro_servidor' // falha ao obter a URL de autorização do conector
  | 'aberto' // fluxo normal: janela aberta e navegada

export interface DiagnosticoConexao {
  motivo: MotivoBloqueio
  /** ms entre o clique e o resultado (abertura + obtenção da URL). */
  tempoMs: number
  /** true quando o app está rodando dentro de um iframe (Safari bloqueia popups de iframe). */
  emIframe: boolean
  /** Descrição curta do navegador, a partir do userAgent. */
  navegador: string
  /** Detalhe técnico adicional (mensagem de erro, por exemplo). */
  detalhe?: string
}

export interface ResultadoConexaoNovaJanela {
  /** true quando o navegador bloqueou a janela: a URL deve ser oferecida como link clicável. */
  janelaBloqueada: boolean
  /** URL de autorização do provedor (sempre http/https quando válida). */
  url: string | null
  /** Motivo estruturado, para o fallback exibir diagnóstico visível. */
  motivo: MotivoBloqueio
  diagnostico: DiagnosticoConexao
}

const descreverNavegador = (): string => {
  const ua = typeof navigator !== 'undefined' ? navigator.userAgent : ''
  if (/iPhone|iPad|iPod/i.test(ua)) return 'iOS Safari/WebKit'
  if (/Safari/i.test(ua) && !/Chrom|Edg|OPR/i.test(ua)) return 'Safari'
  if (/Edg/i.test(ua)) return 'Edge'
  if (/OPR/i.test(ua)) return 'Opera'
  if (/Chrome|Chromium/i.test(ua)) return 'Chrome'
  if (/Firefox/i.test(ua)) return 'Firefox'
  return ua ? ua.slice(0, 60) : 'desconhecido'
}

const estaEmIframe = (): boolean => {
  try {
    return typeof window !== 'undefined' && window.self !== window.top
  } catch {
    // Acesso cross-origin ao top negado: necessariamente está em iframe.
    return true
  }
}

const logDiagnostico = (etapa: string, dados: Record<string, unknown>) => {
  // Log de diagnóstico para depuração em dispositivos reais (Safari/iOS).
  console.info(`[conexao-ia] ${etapa}`, dados)
}

// Abre a janela em branco no próprio clique (antes de qualquer await), gesto que o
// Safari respeita. Sem opener, para a tela de autorização não manipular esta aba.
const abrirJanelaAutorizacao = (): { janela: Window | null; motivo: MotivoBloqueio } => {
  try {
    const janela = window.open('', '_blank')
    if (!janela) {
      // Popup blocker do navegador devolveu null mesmo com gesto sincrono.
      return { janela: null, motivo: 'janela_nula' }
    }
    try {
      janela.opener = null
    } catch {
      // Alguns navegadores restringem opener; a navegação continua válida.
    }
    return { janela, motivo: 'aberto' }
  } catch (err) {
    logDiagnostico('window.open lançou exceção', {
      erro: err instanceof Error ? err.message : String(err),
    })
    return { janela: null, motivo: 'janela_nula' }
  }
}

/**
 * Pede a URL de consentimento do conector e abre o provedor em NOVA janela/aba.
 * Chame DIRETO no onClick (a abertura da janela é síncrona, antes de qualquer await).
 * Nunca navega na aba atual — em caso de bloqueio devolve a URL para fallback clicável.
 */
export const conectarViaNovaJanela = async (
  toolkit: string,
  returnUrl: string,
): Promise<ResultadoConexaoNovaJanela> => {
  const inicioMs = typeof performance !== 'undefined' ? performance.now() : Date.now()
  const base: Omit<DiagnosticoConexao, 'motivo' | 'detalhe'> = {
    tempoMs: 0,
    emIframe: estaEmIframe(),
    navegador: descreverNavegador(),
  }
  const medir = () =>
    Math.round((typeof performance !== 'undefined' ? performance.now() : Date.now()) - inicioMs)

  logDiagnostico('clique: abrindo janela de autorizacao (sincrono)', {
    toolkit,
    emIframe: base.emIframe,
    navegador: base.navegador,
  })

  // PRIMEIRO código do gesto: nenhuma chamada de rede/await antes deste ponto.
  const { janela, motivo: motivoAbertura } = abrirJanelaAutorizacao()
  const url = await obterUrlAutorizacao(toolkit, returnUrl).catch((err: unknown) => {
    // Fecha a janela em branco se a URL não chegou, para não deixar aba vazia aberta.
    try {
      janela?.close()
    } catch {
      // ignora
    }
    logDiagnostico('falha ao obter URL de autorizacao', {
      toolkit,
      erro: err instanceof Error ? err.message : String(err),
      tempoMs: medir(),
    })
    const detalhe = err instanceof Error ? err.message : 'Erro desconhecido'
    return {
      erro: true as const,
      resultado: {
        janelaBloqueada: true,
        url: null,
        motivo: 'erro_servidor' as MotivoBloqueio,
        diagnostico: {
          ...base,
          motivo: 'erro_servidor' as MotivoBloqueio,
          tempoMs: medir(),
          detalhe,
        },
      },
    }
  })

  if ('erro' in url) return url.resultado

  logDiagnostico('URL de autorizacao recebida', { toolkit, tempoMs: medir() })

  if (!janela || janela.closed) {
    const motivo: MotivoBloqueio = janela ? 'janela_fechada' : 'janela_nula'
    logDiagnostico('janela bloqueada pelo navegador', {
      toolkit,
      motivo,
      tempoMs: medir(),
      emIframe: base.emIframe,
      navegador: base.navegador,
    })
    return {
      janelaBloqueada: true,
      url: url.valor,
      motivo,
      diagnostico: { ...base, motivo, tempoMs: medir() },
    }
  }

  try {
    janela.location.href = url.valor
  } catch (err) {
    // Segurança bloqueou a navegação da janela já aberta: cai no fallback clicável.
    try {
      janela.close()
    } catch {
      // ignora
    }
    logDiagnostico('navegacao da janela bloqueada', {
      toolkit,
      erro: err instanceof Error ? err.message : String(err),
      tempoMs: medir(),
    })
    return {
      janelaBloqueada: true,
      url: url.valor,
      motivo: 'navegacao_bloqueada',
      diagnostico: {
        ...base,
        motivo: 'navegacao_bloqueada',
        tempoMs: medir(),
        detalhe: err instanceof Error ? err.message : String(err),
      },
    }
  }

  logDiagnostico('autorizacao aberta com sucesso', { toolkit, tempoMs: medir() })
  return {
    janelaBloqueada: false,
    url: url.valor,
    motivo: 'aberto',
    diagnostico: { ...base, motivo: 'aberto', tempoMs: medir() },
  }
}

/** Pede ao backend a URL de consentimento do conector. Sem efeitos colaterais de janela. */
const obterUrlAutorizacao = async (
  toolkit: string,
  returnUrl: string,
): Promise<{ valor: string }> => {
  const res: unknown = await pb.send(
    `/api/skip/connectors/${encodeURIComponent(toolkit)}/connect`,
    { method: 'POST', body: { returnUrl } },
  )
  const valor =
    res &&
    typeof res === 'object' &&
    'url' in res &&
    typeof (res as { url: unknown }).url === 'string'
      ? (res as { url: string }).url
      : null
  if (!valor || !/^https?:/i.test(valor)) {
    throw new Error('Não foi possível obter a URL de autorização do conector.')
  }
  return { valor }
}
