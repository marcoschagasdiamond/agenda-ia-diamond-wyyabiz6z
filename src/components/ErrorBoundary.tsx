import React from 'react'
import { AlertTriangle, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface Props {
  children: React.ReactNode
}

interface State {
  temErro: boolean
  mensagem: string | null
}

/**
 * Error Boundary reutilizável: captura qualquer erro de renderização dos filhos
 * e mostra uma mensagem amigável em português com botão "Tentar novamente"
 * (que remonta o conteúdo) — nunca deixa a tela em branco.
 */
export class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { temErro: false, mensagem: null }
  }

  static getDerivedStateFromError(error: unknown): State {
    const mensagem =
      error instanceof Error && error.message
        ? error.message
        : 'Ocorreu um erro inesperado nesta seção.'
    return { temErro: true, mensagem }
  }

  componentDidCatch(error: unknown) {
    console.error('Erro capturado pelo ErrorBoundary:', error)
  }

  private tentarNovamente = () => {
    this.setState({ temErro: false, mensagem: null })
  }

  render() {
    if (this.state.temErro) {
      return (
        <div
          role="alert"
          className="p-6 rounded-xl border border-amber-300 bg-amber-50 text-center space-y-3"
        >
          <div className="flex justify-center">
            <div className="w-12 h-12 rounded-full bg-amber-100 flex items-center justify-center">
              <AlertTriangle className="w-6 h-6 text-amber-600" />
            </div>
          </div>
          <div className="space-y-1">
            <h2 className="text-base font-bold text-[#1A1D21]">
              Algo deu errado nesta seção
            </h2>
            <p className="text-xs text-[#5B6470] max-w-md mx-auto">
              Encontramos um problema ao exibir este conteúdo, mas o restante do aplicativo continua
              funcionando. Tente novamente — se persistir, recarregue a página.
            </p>
            {this.state.mensagem && (
              <p className="text-[11px] text-amber-800 max-w-md mx-auto break-words">
                Detalhe técnico: {this.state.mensagem}
              </p>
            )}
          </div>
          <Button
            size="sm"
            onClick={this.tentarNovamente}
            className="bg-[#0F766E] hover:bg-[#0D5C56] text-white text-xs gap-1.5"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Tentar novamente</span>
          </Button>
        </div>
      )
    }

    return this.props.children
  }
}

export default ErrorBoundary
