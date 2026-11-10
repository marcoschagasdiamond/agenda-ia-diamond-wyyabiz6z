import { AlertTriangle, ExternalLink, Loader2, Mic, ShieldCheck, RotateCcw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  estaEmIframe,
  instrucaoPorNavegador,
  type NavegadorDetectado,
} from '@/lib/permissoesMicrofone'

interface AvisoPermissaoMicrofoneProps {
  navegador: NavegadorDetectado
  /** Sobrescreve a detecção automática (testes). Em produção usar undefined. */
  emIframe?: boolean
  solicitando?: boolean
  onTentarNovamente?: () => void
  onVerificarNovamente?: () => void
}

/**
 * Aviso exibido quando a permissão de microfone está NEGADA, com instruções
 * específicas em português por navegador (Safari: “Ajustes para Este Site →
 * Microfone → Permitir”, etc.) e, quando o app está dentro de iframe no Safari
 * (onde a permissão nem é oferecida), um botão para abrir o app direto na URL.
 * Segue o padrão visual dos avisos azuis de fallback de conexão de /config.
 */
export function AvisoPermissaoMicrofone({
  navegador,
  emIframe: emIframeProp,
  solicitando = false,
  onTentarNovamente,
  onVerificarNovamente,
}: AvisoPermissaoMicrofoneProps) {
  const emIframe = emIframeProp ?? estaEmIframe()
  const instr = instrucaoPorNavegador(navegador)
  const safariEmIframe = emIframe && (navegador === 'safari' || navegador === 'safari-ios')

  const abrirDireto = () => {
    try {
      // URL do próprio app fora do iframe.
      window.open(window.location.href, '_blank')
    } catch {
      /* intentionally ignored */
    }
  }

  return (
    <div className="p-3.5 rounded-xl border border-blue-300 bg-blue-50/90 text-xs text-blue-950 space-y-2 animate-in fade-in">
      <div className="flex items-start gap-2">
        <AlertTriangle className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
        <div className="space-y-1.5 flex-1">
          <p className="font-semibold text-blue-900">
            Acesso ao microfone bloqueado para este site
          </p>

          {/* Safari dentro de iframe: permissão nem é oferecida → abrir direto */}
          {safariEmIframe ? (
            <>
              <p className="text-blue-800 leading-relaxed text-[11px]">
                O Safari não permite autorizar o microfone quando o aplicativo está aberto dentro de
                um quadro incorporado (iframe). Para gravar a reunião, abra o Agenda IA Diamond
                diretamente na URL do app:
              </p>
              <div className="flex flex-wrap items-center gap-2 pt-1">
                <button
                  type="button"
                  onClick={abrirDireto}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-medium text-xs shadow-xs transition-colors"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>Abrir o app direto na URL</span>
                </button>
              </div>
            </>
          ) : (
            <>
              <p className="text-blue-800 leading-relaxed text-[11px]">
                O navegador bloqueou o acesso ao microfone. Siga os passos abaixo para permitir,
                depois recarregue a página:
              </p>
              <ol className="list-decimal list-inside space-y-0.5 text-blue-800 leading-relaxed text-[11px] pl-1">
                {instr.passos.map((passo, i) => (
                  <li key={i}>{passo}</li>
                ))}
              </ol>
              <p className="text-blue-700 text-[10px] leading-relaxed">
                <span className="font-semibold">{instr.titulo}</span>
              </p>
              <div className="flex flex-wrap items-center gap-2 pt-1">
                {onTentarNovamente && (
                  <Button
                    type="button"
                    size="sm"
                    disabled={solicitando}
                    onClick={onTentarNovamente}
                    className="bg-blue-600 hover:bg-blue-700 text-white text-xs h-8 gap-1.5"
                  >
                    {solicitando ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Mic className="w-3.5 h-3.5" />
                    )}
                    <span>Tentar de novo</span>
                  </Button>
                )}
                {onVerificarNovamente && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    disabled={solicitando}
                    onClick={onVerificarNovamente}
                    className="text-xs text-blue-700 hover:text-blue-900 h-8 gap-1.5"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Verificar permissão</span>
                  </Button>
                )}
              </div>
              <p className="text-blue-700/70 text-[10px] leading-relaxed flex items-center gap-1.5">
                <ShieldCheck className="w-3 h-3 shrink-0" />
                <span>
                  O áudio é gravado apenas durante a reunião e enviado para transcrição com a sua
                  conta de IA conectada.
                </span>
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
