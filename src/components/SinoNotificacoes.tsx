import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { diamondApi } from '@/services/diamondApi'
import { NotificacaoSistema } from '@/types'
import {
  Bell,
  Check,
  CheckCheck,
  Calendar,
  CheckSquare,
  AlertTriangle,
  Clock,
  Trash2,
  ExternalLink,
  Settings,
  Sparkles,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { useToast } from '@/hooks/use-toast'

interface SinoNotificacoesProps {
  className?: string
}

export default function SinoNotificacoes({ className = '' }: SinoNotificacoesProps) {
  const navigate = useNavigate()
  const { toast } = useToast()
  const [open, setOpen] = useState(false)
  const [notificacoes, setNotificacoes] = useState<NotificacaoSistema[]>([])
  const [carregando, setCarregando] = useState(false)

  const carregarNotificacoes = async () => {
    try {
      const lista = await diamondApi.listNotificacoesSistema(false)
      setNotificacoes(lista)
    } catch (err) {
      console.error('Erro ao listar notificações:', err)
    }
  }

  useEffect(() => {
    carregarNotificacoes()
    // Atualização periódica leve a cada 30 segundos
    const intervalo = setInterval(() => {
      carregarNotificacoes()
    }, 30000)
    return () => clearInterval(intervalo)
  }, [])

  const naoLidas = notificacoes.filter((n) => !n.lida)
  const totalNaoLidas = naoLidas.length

  const handleMarcarLida = async (n: NotificacaoSistema, e?: React.MouseEvent) => {
    e?.stopPropagation()
    try {
      await diamondApi.marcarNotificacaoLida(n.id)
      setNotificacoes((prev) =>
        prev.map((item) => (item.id === n.id ? { ...item, lida: true } : item)),
      )
    } catch (err) {
      console.error('Erro ao marcar notificação como lida:', err)
    }
  }

  const handleMarcarTodasLidas = async () => {
    setCarregando(true)
    try {
      await diamondApi.marcarTodasNotificacoesLidas()
      setNotificacoes((prev) => prev.map((item) => ({ ...item, lida: true })))
      toast({
        title: 'Notificações lidas',
        description: 'Todas as notificações foram marcadas como lidas.',
      })
    } catch (err) {
      console.error('Erro ao marcar todas:', err)
    } finally {
      setCarregando(false)
    }
  }

  const handleExcluir = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation()
    try {
      await diamondApi.excluirNotificacao(id)
      setNotificacoes((prev) => prev.filter((item) => item.id !== id))
    } catch (err) {
      console.error('Erro ao excluir notificação:', err)
    }
  }

  const handleClickItem = async (n: NotificacaoSistema) => {
    if (!n.lida) {
      await handleMarcarLida(n)
    }
    setOpen(false)
    if (n.link) {
      navigate(n.link)
    } else if (n.item_tipo === 'evento') {
      navigate('/calendario')
    } else if (n.item_tipo === 'demanda') {
      navigate('/listas')
    } else if (n.item_tipo === 'card') {
      navigate('/fluxo')
    }
  }

  const renderIconeTipo = (tipo: string) => {
    switch (tipo) {
      case 'reuniao':
        return (
          <div className="w-7 h-7 rounded-lg bg-[#0F766E]/10 text-[#0F766E] flex items-center justify-center shrink-0">
            <Calendar className="w-3.5 h-3.5" />
          </div>
        )
      case 'atraso':
        return (
          <div className="w-7 h-7 rounded-lg bg-red-100 text-red-600 flex items-center justify-center shrink-0">
            <AlertTriangle className="w-3.5 h-3.5" />
          </div>
        )
      case 'tarefa':
      default:
        return (
          <div className="w-7 h-7 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center shrink-0">
            <CheckSquare className="w-3.5 h-3.5" />
          </div>
        )
    }
  }

  const formatarTempoRelativo = (dataIso?: string) => {
    if (!dataIso) return ''
    const agora = new Date().getTime()
    const passado = new Date(dataIso).getTime()
    const diffSec = Math.floor((agora - passado) / 1000)

    if (diffSec < 60) return 'Agora mesmo'
    const diffMin = Math.floor(diffSec / 60)
    if (diffMin < 60) return `Há ${diffMin} min`
    const diffHoras = Math.floor(diffMin / 60)
    if (diffHoras < 24) return `Há ${diffHoras}h`
    const diffDias = Math.floor(diffHoras / 24)
    if (diffDias === 1) return 'Ontem'
    return `Há ${diffDias} dias`
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label="Abrir notificações do sistema"
          title={
            totalNaoLidas > 0
              ? `${totalNaoLidas} notificação(ões) pendente(s)`
              : 'Nenhuma notificação nova'
          }
          className={`relative p-2 rounded-lg text-[#5B6470] hover:text-[#1A1D21] hover:bg-[#F4F2EE] transition-colors ${className}`}
        >
          <Bell className="w-4 h-4" />
          {totalNaoLidas > 0 && (
            <span className="absolute top-1 right-1 min-w-[16px] h-4 px-1 rounded-full bg-red-600 text-white text-[9px] font-bold flex items-center justify-center ring-2 ring-white shadow-xs animate-pulse">
              {totalNaoLidas > 9 ? '9+' : totalNaoLidas}
            </span>
          )}
        </button>
      </PopoverTrigger>

      <PopoverContent
        align="end"
        sideOffset={8}
        className="w-[360px] sm:w-[400px] p-0 bg-white border border-[#E5E1D8] shadow-xl rounded-xl overflow-hidden z-50"
      >
        {/* Cabeçalho do Popover */}
        <div className="p-3.5 border-b border-[#E5E1D8] bg-[#FAFAF9] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Bell className="w-4 h-4 text-[#0F766E]" />
            <span className="text-xs font-bold text-[#1A1D21]">Notificações & Lembretes</span>
            {totalNaoLidas > 0 && (
              <Badge className="bg-red-600 text-white text-[10px] px-1.5 py-0">
                {totalNaoLidas} nova(s)
              </Badge>
            )}
          </div>

          <div className="flex items-center gap-1">
            {totalNaoLidas > 0 && (
              <button
                type="button"
                onClick={handleMarcarTodasLidas}
                disabled={carregando}
                title="Marcar todas como lidas"
                className="text-[11px] text-[#0F766E] hover:underline font-medium flex items-center gap-1 px-1.5 py-0.5 rounded"
              >
                <CheckCheck className="w-3.5 h-3.5" />
                <span>Marcar lidas</span>
              </button>
            )}
            <button
              type="button"
              onClick={() => {
                setOpen(false)
                navigate('/config?aba=lembretes')
              }}
              title="Ajustar tempos de antecedência e e-mails"
              className="p-1 text-[#5B6470] hover:text-[#1A1D21] rounded hover:bg-[#E5E1D8]"
            >
              <Settings className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Lista de Notificações */}
        <div className="max-h-[380px] overflow-y-auto divide-y divide-[#E5E1D8]/60">
          {notificacoes.length === 0 ? (
            <div className="py-12 px-4 text-center">
              <div className="w-10 h-10 rounded-full bg-[#F4F2EE] text-[#5B6470] flex items-center justify-center mx-auto mb-2">
                <Bell className="w-5 h-5 opacity-60" />
              </div>
              <p className="text-xs font-semibold text-[#1A1D21]">Tudo em dia!</p>
              <p className="text-[11px] text-[#5B6470] mt-1 max-w-[240px] mx-auto">
                Nenhum lembrete pendente. Novos avisos de reuniões e tarefas aparecerão aqui.
              </p>
            </div>
          ) : (
            notificacoes.map((item) => (
              <div
                key={item.id}
                onClick={() => handleClickItem(item)}
                className={`p-3 flex items-start gap-3 transition-colors cursor-pointer group ${
                  item.lida ? 'bg-white hover:bg-[#FAFAF9]' : 'bg-[#0F766E]/5 hover:bg-[#0F766E]/10'
                }`}
              >
                {renderIconeTipo(item.tipo)}

                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-1">
                    <span
                      className={`text-xs truncate block ${
                        item.lida ? 'text-[#1A1D21] font-medium' : 'text-[#1A1D21] font-bold'
                      }`}
                    >
                      {item.titulo}
                    </span>
                    {!item.lida && <span className="w-2 h-2 rounded-full bg-[#0F766E] shrink-0" />}
                  </div>

                  <p className="text-[11px] text-[#5B6470] line-clamp-2 mt-0.5 leading-snug">
                    {item.mensagem}
                  </p>

                  <div className="flex items-center justify-between mt-1.5 pt-0.5 text-[10px] text-[#9CA3AF]">
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3 text-[#5B6470]" />
                      {formatarTempoRelativo(item.created)}
                    </span>

                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      {!item.lida && (
                        <button
                          type="button"
                          onClick={(e) => handleMarcarLida(item, e)}
                          title="Marcar como lida"
                          className="p-1 rounded hover:bg-[#E5E1D8] text-[#0F766E]"
                        >
                          <Check className="w-3 h-3" />
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={(e) => handleExcluir(item.id, e)}
                        title="Excluir notificação"
                        className="p-1 rounded hover:bg-[#E5E1D8] text-red-500"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Rodapé com link para configurações de lembretes */}
        <div className="p-2.5 border-t border-[#E5E1D8] bg-[#FAFAF9] flex items-center justify-between text-xs">
          <button
            type="button"
            onClick={() => {
              setOpen(false)
              navigate('/config?aba=lembretes')
            }}
            className="text-[11px] text-[#0F766E] hover:underline font-medium flex items-center gap-1"
          >
            <Sparkles className="w-3 h-3" />
            <span>Configurar antecedências e e-mails</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setOpen(false)
              navigate('/calendario')
            }}
            className="text-[11px] text-[#5B6470] hover:text-[#1A1D21] font-medium flex items-center gap-1"
          >
            <span>Calendário</span>
            <ExternalLink className="w-3 h-3" />
          </button>
        </div>
      </PopoverContent>
    </Popover>
  )
}
