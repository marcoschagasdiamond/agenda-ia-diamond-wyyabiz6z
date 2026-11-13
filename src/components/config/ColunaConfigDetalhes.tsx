import React, { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, ChevronRight, Loader2, Mail, Sprout, Users } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { useNavegacao } from '@/contexts/NavegacaoContext'
import { useAuth } from '@/hooks/use-auth'
import { diamondApi } from '@/services/diamondApi'
import {
  listarCamposPersonalizados,
  listarListasSelecao,
  ROTULOS_TIPO,
  ROTULOS_CATEGORIA,
} from '@/services/camposPersonalizados'
import type { CampoPersonalizado, ListaSelecao } from '@/services/camposPersonalizados'
import type { TeseSemente, FolhaDia, ConfigEmailUsuario } from '@/types'

export type DetalheConfigTipo = 'campos' | 'listas' | 'cofre' | 'sementes' | 'email'

const TITULOS: Record<DetalheConfigTipo, { titulo: string; subtitulo: string }> = {
  campos: { titulo: 'Campos Personalizados', subtitulo: 'Campos criados' },
  listas: { titulo: 'Lista de Seleção', subtitulo: 'Listas e opções criadas' },
  cofre: { titulo: 'Cofre por Tese', subtitulo: 'Teses e sementes por tese' },
  sementes: { titulo: 'Sementes', subtitulo: 'Sementes ativas por tese' },
  email: { titulo: 'E-mail e Convites', subtitulo: 'Seu e-mail e convites da equipe' },
}

interface PainelDetalheConfigProps {
  tipo: DetalheConfigTipo
  onVoltar: () => void
  onCloseMobile?: () => void
}

export default function PainelDetalheConfig({
  tipo,
  onVoltar,
  onCloseMobile,
}: PainelDetalheConfigProps) {
  const navigate = useNavigate()
  const { user } = useAuth()
  const { folhaItems, convitesEquipe, membrosEquipe } = useNavegacao()

  const [carregando, setCarregando] = useState(false)
  const [campos, setCampos] = useState<CampoPersonalizado[]>([])
  const [listas, setListas] = useState<ListaSelecao[]>([])
  const [teses, setTeses] = useState<TeseSemente[]>([])
  const [configEmail, setConfigEmail] = useState<ConfigEmailUsuario | null>(null)

  useEffect(() => {
    let cancelado = false
    const carregar = async () => {
      setCarregando(true)
      try {
        if (tipo === 'campos') {
          const r = await listarCamposPersonalizados()
          if (!cancelado) setCampos(r)
        } else if (tipo === 'listas') {
          const r = await listarListasSelecao()
          if (!cancelado) setListas(r)
        } else if (tipo === 'cofre' || tipo === 'sementes') {
          const r = await diamondApi.listTesesSementes().catch(() => [])
          if (!cancelado) setTeses(r)
        } else if (tipo === 'email' && user?.id) {
          const cfg = await diamondApi.getConfigEmailUsuario(user.id).catch(() => null)
          if (!cancelado) setConfigEmail(cfg)
        }
      } finally {
        if (!cancelado) setCarregando(false)
      }
    }
    carregar()
    return () => {
      cancelado = true
    }
  }, [tipo, user?.id])

  const irPara = (path: string) => {
    navigate(path)
    if (onCloseMobile) onCloseMobile()
  }

  const sementesAtivas = useMemo(
    () =>
      folhaItems.filter((i) => Boolean(i.estado_semente) && !i.arquivado && !i.semente_germinada),
    [folhaItems],
  )

  const contagemPorTese = useMemo(() => {
    const counts: Record<string, number> = {}
    sementesAtivas.forEach((s) => {
      const chave = s.tese_semente || 'sem_tese'
      counts[chave] = (counts[chave] || 0) + 1
    })
    return counts
  }, [sementesAtivas])

  const info = TITULOS[tipo]

  const abrirCofre = (teseId?: string) => {
    const p = new URLSearchParams({ estado: 'sementes' })
    if (teseId) p.set('tese', teseId)
    irPara(`/folha?${p.toString()}`)
  }

  const abrirSemente = (item: FolhaDia) => {
    irPara(`/folha?destaque=${item.id}&estado=sementes`)
  }

  const cabecalho = (
    <div className="p-3.5 border-b border-[#E5E1D8] bg-white shrink-0">
      <button
        type="button"
        onClick={onVoltar}
        className="flex items-center gap-1 text-[11px] font-medium text-[#5B6470] hover:text-[#1A1D21] transition-colors mb-1.5"
      >
        <ArrowLeft className="w-3.5 h-3.5" />
        <span>Configurações</span>
      </button>
      <h2 className="text-sm font-bold text-[#1A1D21] tracking-tight">{info.titulo}</h2>
      <p className="text-[10px] text-[#5B6470]">{info.subtitulo}</p>
    </div>
  )

  if (carregando) {
    return (
      <div className="flex flex-col h-full bg-white border-r border-[#E5E1D8]">
        {cabecalho}
        <div className="flex-1 flex items-center justify-center">
          <Loader2 className="w-5 h-5 animate-spin text-[#0F766E]" />
        </div>
      </div>
    )
  }

  // ---------------------------------------------------------------
  // Campos Personalizados
  // ---------------------------------------------------------------
  if (tipo === 'campos') {
    return (
      <div className="flex flex-col h-full bg-white border-r border-[#E5E1D8]">
        {cabecalho}
        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {campos.length === 0 && (
            <p className="text-[11px] text-[#5B6470] italic px-2 py-2">
              Nenhum campo personalizado criado ainda.
            </p>
          )}
          {campos.map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() =>
                irPara(`/config?aba=central&gestao=campos_personalizados&campo_id=${c.id}`)
              }
              className="w-full flex items-center justify-between px-2.5 py-2 rounded-lg border border-[#E5E1D8] bg-white hover:bg-[#F4F2EE] transition-colors text-left"
            >
              <div className="min-w-0">
                <span className="text-xs font-semibold text-[#1A1D21] block truncate">
                  {c.rotulo || c.nome_interno}
                </span>
                <span className="text-[10px] text-[#5B6470] block truncate">
                  {(ROTULOS_CATEGORIA as Record<string, string>)[c.categoria] || c.categoria} •{' '}
                  {(ROTULOS_TIPO as Record<string, string>)[c.tipo] || c.tipo}
                </span>
              </div>
              <div className="flex items-center gap-1.5 shrink-0 ml-2">
                {!c.ativo && (
                  <Badge variant="outline" className="text-[9px] bg-stone-50 text-[#5B6470]">
                    Inativo
                  </Badge>
                )}
                <ChevronRight className="w-3.5 h-3.5 text-[#5B6470]" />
              </div>
            </button>
          ))}
        </div>
      </div>
    )
  }

  // ---------------------------------------------------------------
  // Lista de Seleção
  // ---------------------------------------------------------------
  if (tipo === 'listas') {
    return (
      <div className="flex flex-col h-full bg-white border-r border-[#E5E1D8]">
        {cabecalho}
        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {listas.length === 0 && (
            <p className="text-[11px] text-[#5B6470] italic px-2 py-2">
              Nenhuma lista de seleção criada ainda.
            </p>
          )}
          {listas.map((l) => (
            <button
              key={l.id}
              type="button"
              onClick={() => irPara(`/config?aba=central&gestao=listas_selecao&lista_id=${l.id}`)}
              className="w-full flex items-center justify-between px-2.5 py-2 rounded-lg border border-[#E5E1D8] bg-white hover:bg-[#F4F2EE] transition-colors text-left"
            >
              <div className="min-w-0">
                <span className="text-xs font-semibold text-[#1A1D21] block truncate">
                  {l.nome}
                </span>
                <span className="text-[10px] text-[#5B6470] block truncate">
                  {l.itens?.length || 0} opção(ões)
                </span>
              </div>
              <div className="flex items-center gap-1.5 shrink-0 ml-2">
                {!l.ativo && (
                  <Badge variant="outline" className="text-[9px] bg-stone-50 text-[#5B6470]">
                    Inativa
                  </Badge>
                )}
                <ChevronRight className="w-3.5 h-3.5 text-[#5B6470]" />
              </div>
            </button>
          ))}
        </div>
      </div>
    )
  }

  // ---------------------------------------------------------------
  // Cofre por Tese / Sementes
  // ---------------------------------------------------------------
  if (tipo === 'cofre' || tipo === 'sementes') {
    const semTeseCount = contagemPorTese['sem_tese'] || 0
    return (
      <div className="flex flex-col h-full bg-white border-r border-[#E5E1D8]">
        {cabecalho}
        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {tipo === 'cofre' && (
            <>
              <button
                type="button"
                onClick={() => abrirCofre()}
                className="w-full flex items-center justify-between px-2.5 py-2 rounded-lg border border-emerald-200 bg-emerald-50/60 hover:bg-emerald-50 transition-colors text-left"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <Sprout className="w-3.5 h-3.5 text-emerald-700 shrink-0" />
                  <span className="text-xs font-semibold text-[#1A1D21] truncate">
                    Abrir Cofre na Folha
                  </span>
                </div>
                <ChevronRight className="w-3.5 h-3.5 text-[#5B6470]" />
              </button>

              {teses.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => abrirCofre(t.id)}
                  className="w-full flex items-center justify-between px-2.5 py-2 rounded-lg border border-[#E5E1D8] bg-white hover:bg-[#F4F2EE] transition-colors text-left"
                >
                  <span className="text-xs font-semibold text-[#1A1D21] truncate">{t.nome}</span>
                  <Badge
                    variant="outline"
                    className="text-[10px] bg-emerald-50 text-emerald-800 border-emerald-200 shrink-0 ml-2"
                  >
                    {contagemPorTese[t.id] || 0} 🌱
                  </Badge>
                </button>
              ))}

              <button
                type="button"
                onClick={abrirCofre}
                className="w-full flex items-center justify-between px-2.5 py-2 rounded-lg border border-[#E5E1D8] bg-white hover:bg-[#F4F2EE] transition-colors text-left"
              >
                <span className="text-xs font-medium text-[#5B6470] truncate">Sem tese</span>
                <Badge variant="outline" className="text-[10px] shrink-0 ml-2">
                  {semTeseCount} 🌱
                </Badge>
              </button>
            </>
          )}

          {tipo === 'sementes' && (
            <>
              {sementesAtivas.length === 0 && (
                <p className="text-[11px] text-[#5B6470] italic px-2 py-2">
                  Nenhuma semente ativa no cofre.
                </p>
              )}
              {teses
                .filter((t) => (contagemPorTese[t.id] || 0) > 0)
                .map((t) => (
                  <div key={t.id} className="space-y-1">
                    <div className="text-[10px] font-bold uppercase tracking-wider text-[#5B6470] px-2 pt-1">
                      {t.nome} ({contagemPorTese[t.id]})
                    </div>
                    {sementesAtivas
                      .filter((s) => s.tese_semente === t.id)
                      .map((s) => (
                        <button
                          key={s.id}
                          type="button"
                          onClick={() => abrirSemente(s)}
                          className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg border border-[#E5E1D8] bg-white hover:bg-[#F4F2EE] transition-colors text-left"
                        >
                          <span className="text-xs text-[#1A1D21] truncate">
                            {s.registro || 'Sem registro'}
                          </span>
                          <ChevronRight className="w-3.5 h-3.5 text-[#5B6470] shrink-0" />
                        </button>
                      ))}
                  </div>
                ))}

              {(contagemPorTese['sem_tese'] || 0) > 0 && (
                <div className="space-y-1">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-[#5B6470] px-2 pt-1">
                    Sem tese ({semTeseCount})
                  </div>
                  {sementesAtivas
                    .filter((s) => !s.tese_semente)
                    .map((s) => (
                      <button
                        key={s.id}
                        type="button"
                        onClick={() => abrirSemente(s)}
                        className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg border border-[#E5E1D8] bg-white hover:bg-[#F4F2EE] transition-colors text-left"
                      >
                        <span className="text-xs text-[#1A1D21] truncate">
                          {s.registro || 'Sem registro'}
                        </span>
                        <ChevronRight className="w-3.5 h-3.5 text-[#5B6470] shrink-0" />
                      </button>
                    ))}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    )
  }

  // ---------------------------------------------------------------
  // E-mail e Convites
  // ---------------------------------------------------------------
  const pendentes = convitesEquipe.filter((c) => c.status === 'pendente')
  return (
    <div className="flex flex-col h-full bg-white border-r border-[#E5E1D8]">
      {cabecalho}
      <div className="flex-1 overflow-y-auto p-2 space-y-3">
        <button
          type="button"
          onClick={() => irPara('/config?aba=email')}
          className="w-full flex items-center justify-between px-2.5 py-2 rounded-lg border border-[#E5E1D8] bg-white hover:bg-[#F4F2EE] transition-colors text-left"
        >
          <div className="flex items-center gap-2 min-w-0">
            <Mail className="w-3.5 h-3.5 text-[#0F766E] shrink-0" />
            <div className="min-w-0">
              <span className="text-xs font-semibold text-[#1A1D21] block truncate">
                Configuração de E-mail
              </span>
              <span className="text-[10px] text-[#5B6470] block truncate">
                {configEmail?.remetente_email || user?.email || 'Configure seu remetente'}
              </span>
            </div>
          </div>
          <ChevronRight className="w-3.5 h-3.5 text-[#5B6470] shrink-0" />
        </button>

        <button
          type="button"
          onClick={() => irPara('/config?aba=central&gestao=equipes')}
          className="w-full flex items-center justify-between px-2.5 py-2 rounded-lg border border-[#E5E1D8] bg-white hover:bg-[#F4F2EE] transition-colors text-left"
        >
          <div className="flex items-center gap-2 min-w-0">
            <Users className="w-3.5 h-3.5 text-[#0F766E] shrink-0" />
            <span className="text-xs font-semibold text-[#1A1D21] truncate">
              Convites da Equipe ({pendentes.length} pendente(s))
            </span>
          </div>
          <ChevronRight className="w-3.5 h-3.5 text-[#5B6470] shrink-0" />
        </button>

        <div>
          <div className="text-[10px] font-bold uppercase tracking-wider text-[#5B6470] px-2 mb-1.5">
            Membros Ativos ({membrosEquipe.filter((m) => m.status === 'ativo').length})
          </div>
          {membrosEquipe
            .filter((m) => m.status === 'ativo')
            .map((m) => (
              <button
                key={m.id}
                type="button"
                onClick={() => irPara('/config?aba=central&gestao=equipes')}
                className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg hover:bg-[#F4F2EE] transition-colors text-left"
              >
                <span className="text-xs text-[#1A1D21] truncate">{m.nome || m.email}</span>
                <span className="text-[10px] text-[#5B6470] truncate max-w-[110px]">{m.email}</span>
              </button>
            ))}
        </div>
      </div>
    </div>
  )
}
