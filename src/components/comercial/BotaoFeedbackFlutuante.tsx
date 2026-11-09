import React, { useState, useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import {
  MessageSquarePlus,
  Send,
  Sparkles,
  Bug,
  Lightbulb,
  HelpCircle,
  CheckCircle2,
  AlertTriangle,
  FlaskConical,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { useToast } from '@/hooks/use-toast'
import { useAuth } from '@/hooks/use-auth'
import { diamondApi } from '@/services/diamondApi'
import { TipoFeedbackTeste } from '@/types'

const NOMES_ROTAS: Record<string, string> = {
  '/': 'Dashboard Principal',
  '/folha': 'Folha do Dia',
  '/calendario': 'Calendário Executivo',
  '/fluxo': 'Fluxo Kanban',
  '/projetos': 'Gestão de Projetos',
  '/contatos': 'Contatos & Base',
  '/arquivos': 'Arquivos & Pastas',
  '/listas': 'Listas & Demandas',
  '/clientes': 'Clientes & Portal',
  '/equipe': 'Equipe & Convites',
  '/agente': 'Agente IA Diamond',
  '/resumos': 'Resumos do Dia',
  '/config': 'Configurações do Sistema',
  '/master': 'Painel Master da Plataforma',
}

export function BotaoFeedbackFlutuante() {
  const { user } = useAuth()
  const location = useLocation()
  const { toast } = useToast()

  const [aberto, setAberto] = useState(false)
  const [texto, setTexto] = useState('')
  const [tipo, setTipo] = useState<TipoFeedbackTeste>('sugestao')
  const [enviando, setEnviando] = useState(false)
  const [contaEmTeste, setContaEmTeste] = useState(false)

  // Verifica se a conta está em modo de teste
  useEffect(() => {
    let ativo = true
    diamondApi
      .getLicencaConta()
      .then((lic) => {
        if (ativo && lic) {
          setContaEmTeste(Boolean(lic.conta_teste))
        }
      })
      .catch(() => {})

    return () => {
      ativo = false
    }
  }, [aberto])

  // Identifica o nome amigável da rota atual
  const rotaAtual = location.pathname
  const nomeTelaAtual =
    NOMES_ROTAS[rotaAtual] ||
    (rotaAtual.startsWith('/projetos/') ? 'Detalhes do Projeto' : rotaAtual)

  const handleEnviar = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!texto.trim()) {
      toast({
        title: 'Campo obrigatório',
        description: 'Por favor, escreva o seu feedback ou descreva o problema antes de enviar.',
        variant: 'destructive',
      })
      return
    }

    try {
      setEnviando(true)
      await diamondApi.enviarFeedbackTeste({
        texto: texto.trim(),
        tipo,
        tela_origem: `${nomeTelaAtual} (${rotaAtual})`,
        usuario: user?.id,
        usuario_nome: user?.name || user?.email,
        usuario_email: user?.email,
      })

      toast({
        title: 'Feedback enviado, obrigado!',
        description:
          'Seu relato foi gravado no sistema e já está disponível para análise no Painel Master.',
      })

      setTexto('')
      setTipo('sugestao')
      setAberto(false)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Falha ao enviar feedback'
      toast({
        title: 'Erro ao enviar feedback',
        description: msg,
        variant: 'destructive',
      })
    } finally {
      setEnviando(false)
    }
  }

  const opcoesTipo: Array<{
    tipo: TipoFeedbackTeste
    rotulo: string
    descricao: string
    icone: React.ElementType
    corAtiva: string
    corBorda: string
  }> = [
    {
      tipo: 'sugestao',
      rotulo: 'Sugestão',
      descricao: 'Ideia de melhoria na tela ou fluxo',
      icone: Lightbulb,
      corAtiva: 'bg-emerald-50 text-emerald-800 border-emerald-400',
      corBorda: 'border-emerald-300',
    },
    {
      tipo: 'bug',
      rotulo: 'Problema / Bug',
      descricao: 'Algo travou ou não funcionou',
      icone: Bug,
      corAtiva: 'bg-rose-50 text-rose-800 border-rose-400',
      corBorda: 'border-rose-300',
    },
    {
      tipo: 'ideia',
      rotulo: 'Ideia / Recurso',
      descricao: 'Novo recurso para o sistema',
      icone: Sparkles,
      corAtiva: 'bg-amber-50 text-amber-900 border-amber-400',
      corBorda: 'border-amber-300',
    },
    {
      tipo: 'outro',
      rotulo: 'Outro',
      descricao: 'Dúvida ou comentário geral',
      icone: HelpCircle,
      corAtiva: 'bg-zinc-100 text-zinc-900 border-zinc-400',
      corBorda: 'border-zinc-300',
    },
  ]

  return (
    <>
      {/* Botão Flutuante Global */}
      <div className="fixed bottom-5 right-5 z-40 flex items-center group">
        <button
          type="button"
          onClick={() => setAberto(true)}
          title="Enviar feedback ou reportar teste"
          aria-label="Enviar feedback de teste"
          className={`flex items-center gap-2 px-3.5 py-2.5 rounded-full shadow-lg transition-all transform hover:scale-105 active:scale-95 border ${
            contaEmTeste
              ? 'bg-gradient-to-r from-amber-500 via-amber-600 to-amber-700 hover:from-amber-600 hover:to-amber-800 text-white border-amber-300 shadow-amber-500/20 ring-2 ring-amber-400/50 animate-pulse'
              : 'bg-[#0F766E] hover:bg-[#0D5C56] text-white border-teal-600/40 shadow-teal-900/20'
          }`}
        >
          {contaEmTeste ? (
            <FlaskConical className="w-4 h-4 shrink-0 text-amber-100" />
          ) : (
            <MessageSquarePlus className="w-4 h-4 shrink-0" />
          )}

          <span className="text-xs font-semibold tracking-wide">Feedback</span>

          {contaEmTeste && (
            <Badge className="bg-amber-100 text-amber-950 hover:bg-amber-100 text-[10px] font-black uppercase px-1.5 py-0 border border-amber-300 shadow-2xs">
              Teste
            </Badge>
          )}
        </button>
      </div>

      {/* Modal de Envio de Feedback */}
      <Dialog open={aberto} onOpenChange={setAberto}>
        <DialogContent className="max-w-md sm:max-w-lg p-0 overflow-hidden border-[#E5E1D8]">
          {/* Topo do Modal */}
          <div
            className={`p-5 text-white ${
              contaEmTeste
                ? 'bg-gradient-to-r from-amber-600 via-amber-700 to-amber-800'
                : 'bg-gradient-to-r from-[#0F766E] to-[#115E59]'
            }`}
          >
            <div className="flex items-center justify-between mb-1.5 flex-wrap gap-2">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-white/20 text-white text-[11px] font-bold uppercase tracking-wider backdrop-blur-xs">
                {contaEmTeste ? (
                  <>
                    <FlaskConical className="w-3.5 h-3.5 text-amber-200" />
                    Conta de Teste Ativa
                  </>
                ) : (
                  <>
                    <MessageSquarePlus className="w-3.5 h-3.5" />
                    Feedback do Usuário
                  </>
                )}
              </span>
              <span className="text-[11px] text-white/80 bg-black/20 px-2 py-0.5 rounded">
                Origem: <strong>{nomeTelaAtual}</strong>
              </span>
            </div>
            <DialogTitle className="text-xl font-bold text-white tracking-tight">
              {contaEmTeste
                ? 'Relatório de Teste & Sugestões'
                : 'Enviar Feedback ou Reportar Problema'}
            </DialogTitle>
            <DialogDescription className="text-white/80 text-xs mt-1">
              Sua opinião ajuda a aprimorar o Agenda IA Diamond. O relato vai direto para a central
              do Administrador Master.
            </DialogDescription>
          </div>

          <form onSubmit={handleEnviar} className="p-5 space-y-4 bg-white text-zinc-900">
            {/* Aviso especial quando conta de teste */}
            {contaEmTeste && (
              <div className="p-2.5 rounded-lg bg-amber-50 border border-amber-200 flex items-start gap-2 text-xs text-amber-900">
                <Sparkles className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
                <p className="leading-relaxed">
                  Você está testando recursos liberados! Relate livremente bugs, sugestões ou
                  comportamentos inesperados encontrados nesta tela.
                </p>
              </div>
            )}

            {/* Seleção do Tipo de Feedback */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-zinc-700 uppercase tracking-wider">
                Tipo de Relato
              </label>
              <div className="grid grid-cols-2 gap-2">
                {opcoesTipo.map((opt) => {
                  const Icon = opt.icone
                  const selecionado = tipo === opt.tipo
                  return (
                    <button
                      key={opt.tipo}
                      type="button"
                      onClick={() => setTipo(opt.tipo)}
                      className={`p-2.5 rounded-lg border text-left transition-all flex items-start gap-2.5 ${
                        selecionado
                          ? `${opt.corAtiva} shadow-xs font-medium`
                          : 'border-zinc-200 bg-zinc-50/50 hover:bg-zinc-100/70 text-zinc-700'
                      }`}
                    >
                      <Icon
                        className={`w-4 h-4 shrink-0 mt-0.5 ${selecionado ? 'text-current' : 'text-zinc-500'}`}
                      />
                      <div className="min-w-0">
                        <p className="text-xs font-bold leading-tight">{opt.rotulo}</p>
                        <p className="text-[10px] text-zinc-500 leading-tight mt-0.5 truncate">
                          {opt.descricao}
                        </p>
                      </div>
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Texto do Feedback */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label
                  htmlFor="feedback-texto"
                  className="text-xs font-bold text-zinc-700 uppercase tracking-wider"
                >
                  Descrição detalhada <span className="text-rose-500">*</span>
                </label>
                <span className="text-[10px] text-zinc-400">{texto.length} caracteres</span>
              </div>
              <Textarea
                id="feedback-texto"
                value={texto}
                onChange={(e) => setTexto(e.target.value)}
                placeholder={
                  tipo === 'bug'
                    ? 'Explique o que aconteceu, passos para reproduzir ou o que esperava ver...'
                    : tipo === 'sugestao'
                      ? 'O que você sugere melhorar nesta tela ou no funcionamento geral?'
                      : tipo === 'ideia'
                        ? 'Descreva a sua ideia de recurso ou automação para o Diamond...'
                        : 'Escreva sua mensagem ou comentário...'
                }
                rows={4}
                className="text-xs resize-none focus-visible:ring-[#0F766E]"
                required
                autoFocus
              />
            </div>

            {/* Metadados capturados automaticamente */}
            <div className="p-2.5 rounded-lg bg-zinc-50 border border-zinc-200 text-[11px] text-zinc-500 space-y-1">
              <div className="flex items-center justify-between">
                <span>Tela identificada:</span>
                <strong className="text-zinc-700 font-medium">{nomeTelaAtual}</strong>
              </div>
              <div className="flex items-center justify-between">
                <span>Autor:</span>
                <span className="text-zinc-700">
                  {user?.name || user?.email || 'Usuário conectado'}
                </span>
              </div>
            </div>

            <DialogFooter className="gap-2 pt-2 border-t border-zinc-100">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setAberto(false)}
                disabled={enviando}
                className="text-xs"
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={enviando || !texto.trim()}
                className={`text-xs font-semibold gap-1.5 text-white ${
                  contaEmTeste
                    ? 'bg-amber-600 hover:bg-amber-700'
                    : 'bg-[#0F766E] hover:bg-[#0D5C56]'
                }`}
              >
                {enviando ? (
                  'Gravando feedback...'
                ) : (
                  <>
                    <Send className="w-3.5 h-3.5" />
                    Enviar Feedback
                  </>
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  )
}

export default BotaoFeedbackFlutuante
