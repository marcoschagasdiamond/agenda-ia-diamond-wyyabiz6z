// Painel do "Caçador de Sementes" — Diamantina, funcionária de IA (agente nativo
// 'diamantina-cacador-sementes'). Mostra na aba Sementes da /folha as sugestões
// do dia de sementes maduras para germinar, com contadores, botão "Gerar
// sugestões agora" e mensagem educada quando nada amadureceu (estilo do
// PainelResumoDia). Clique numa sugestão abre o ModalGerminarSemente com o
// título pré-preenchido.
import { useEffect, useState } from 'react'
import { Loader2, RefreshCw, Sprout, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  listarSugestoesDoDia,
  gerarSugestoesAgora,
  parseSugestoesGerminacao,
  type SugestoesSementeDia,
  type SugestaoGerminacao,
} from '@/services/cacadorSementes'
import { useToast } from '@/hooks/use-toast'

interface Props {
  /** Recebe o folha_id da sugestão clicada — a Folha localiza o item e germina. */
  onSugerirGerminacao: (folhaId: string, sugestao: SugestaoGerminacao) => void
}

export default function PainelCacadorSementes({ onSugerirGerminacao }: Props) {
  const { toast } = useToast()
  const [registro, setRegistro] = useState<SugestoesSementeDia | null>(null)
  const [carregando, setCarregando] = useState(true)
  const [gerando, setGerando] = useState(false)

  const carregar = async () => {
    setCarregando(true)
    const reg = await listarSugestoesDoDia()
    setRegistro(reg)
    setCarregando(false)
  }

  useEffect(() => {
    void carregar()
  }, [])

  const handleGerar = async () => {
    setGerando(true)
    try {
      await gerarSugestoesAgora()
      await carregar()
      toast({
        title: 'Caçada concluída 🌱',
        description: 'Sugestões do Caçador de Sementes atualizadas.',
      })
    } catch (err) {
      toast({
        title: 'Erro ao caçar sementes',
        description: (err as Error)?.message,
        variant: 'destructive',
      })
    } finally {
      setGerando(false)
    }
  }

  const sugestoes = parseSugestoesGerminacao(registro)
  const totalGeral = registro?.total_sementes ?? 0
  const totalMaduras = registro?.total_maduras ?? sugestoes.length

  return (
    <div className="bg-white border border-[#E5E1D8] rounded-xl shadow-xs">
      {/* Cabeçalho */}
      <div className="flex items-center justify-between gap-2 px-4 py-3 border-b border-[#E5E1D8]/70">
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center shrink-0">
            <Sprout className="w-4 h-4 text-emerald-700" />
          </div>
          <div className="min-w-0">
            <h2 className="text-sm font-semibold text-[#1A1D21] truncate">
              Sugestões do Caçador de Sementes
            </h2>
            <p className="text-[11px] text-[#5B6470] truncate">
              A Diamantina olha para o seu cofre e aponta sementes maduras para germinar hoje.
            </p>
          </div>
        </div>
        <Button
          type="button"
          size="sm"
          onClick={handleGerar}
          disabled={gerando || carregando}
          className="h-8 text-xs bg-[#0F766E] hover:bg-[#0D5C56] gap-1.5 shrink-0"
        >
          {gerando ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <RefreshCw className="w-3.5 h-3.5" />
          )}
          {gerando ? 'Caçando…' : 'Gerar sugestões agora'}
        </Button>
      </div>

      {/* Corpo */}
      {carregando ? (
        <div className="flex items-center justify-center gap-2 px-4 py-8 text-xs text-[#5B6470]">
          <Loader2 className="w-4 h-4 animate-spin text-[#0F766E]" />
          Buscando sugestões do dia…
        </div>
      ) : sugestoes.length === 0 ? (
        <div className="px-4 py-6 text-center space-y-2">
          <p className="text-xs font-medium text-[#1A1D21]">
            {registro?.mensagem_vazia ||
              'Nada maduro para hoje. O Caçador vai voltar a olhar o cofre às 21h — ou clique em "Gerar sugestões agora".'}
          </p>
          <p className="text-[11px] text-[#5B6470]">Sementes guardadas no cofre: {totalGeral}</p>
        </div>
      ) : (
        <div className="px-4 py-3 space-y-3">
          {/* Contadores */}
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[11px] font-medium text-[#5B6470] bg-[#F4F2EE] px-2.5 py-1 rounded-full flex items-center gap-1.5">
              <Sprout className="w-3 h-3 text-emerald-700" />
              Sementes no cofre: <strong className="text-[#1A1D21] font-bold">{totalGeral}</strong>
            </span>
            <span className="text-[11px] font-medium text-[#5B6470] bg-amber-50 border border-amber-200 px-2.5 py-1 rounded-full flex items-center gap-1.5">
              🍒 Maduras para germinar:{' '}
              <strong className="text-amber-800 font-bold">{totalMaduras}</strong>
            </span>
          </div>

          {/* Lista clicável de sugestões */}
          <div className="space-y-2">
            {sugestoes.map((s, idx) => (
              <button
                key={s.folha_id || idx}
                type="button"
                onClick={() => onSugerirGerminacao(s.folha_id || '', s)}
                className="w-full text-left p-3 rounded-lg border border-[#E5E1D8] bg-[#FAFAF9] hover:border-emerald-500/50 hover:bg-emerald-50/40 transition-all flex items-start justify-between gap-3 group"
              >
                <div className="min-w-0 space-y-1">
                  <p className="text-xs font-semibold text-[#1A1D21] truncate">
                    {s.titulo_card_sugerido || s.tese || 'Semente madura'}
                  </p>
                  {s.tese && (
                    <p className="text-[11px] text-[#5B6470] truncate">
                      🎯 {s.tese}
                      {s.prioridade ? ` • prioridade ${s.prioridade}` : ''}
                    </p>
                  )}
                  {s.motivo && (
                    <p className="text-[11px] text-[#5B6470] leading-relaxed">
                      <span className="font-medium text-[#1A1D21]">Por quê:</span> {s.motivo}
                    </p>
                  )}
                </div>
                <ChevronRight className="w-4 h-4 text-[#5B6470] group-hover:text-emerald-700 shrink-0 mt-1" />
              </button>
            ))}
          </div>
          <p className="text-[10px] text-[#5B6470]">
            Clique numa sugestão para germiná-la como card de demanda.
          </p>
        </div>
      )}
    </div>
  )
}
