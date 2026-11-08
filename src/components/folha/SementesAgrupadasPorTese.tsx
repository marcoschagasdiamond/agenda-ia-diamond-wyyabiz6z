import React, { useState } from 'react'
import {
  Sprout,
  Tag,
  ChevronDown,
  ChevronRight,
  FolderOpen,
  FolderLock,
  Layers,
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import type { FolhaDia, TeseSemente } from '@/types'

export interface GrupoSementesTese {
  teseId: string // id da tese ou 'sem_tese'
  nome: string
  descricao?: string
  itens: FolhaDia[]
}

interface SementesAgrupadasPorTeseProps {
  sementes: FolhaDia[]
  teses: TeseSemente[]
  teseFiltroId: string
  renderItem: (item: FolhaDia, idx: number) => React.ReactNode
}

export const SementesAgrupadasPorTese: React.FC<SementesAgrupadasPorTeseProps> = ({
  sementes,
  teses,
  teseFiltroId,
  renderItem,
}) => {
  // Mapa de estado aberto/fechado por grupo
  const [gruposAbertos, setGruposAbertos] = useState<Record<string, boolean>>({})

  const toggleGrupo = (grupoId: string) => {
    setGruposAbertos((prev) => ({
      ...prev,
      [grupoId]: prev[grupoId] !== undefined ? !prev[grupoId] : false, // padrão true, inverte
    }))
  }

  // Agrupa os itens pelas teses
  const mapaTeses = new Map<string, TeseSemente>()
  teses.forEach((t) => mapaTeses.set(t.id, t))

  const gruposMap: Record<string, GrupoSementesTese> = {}

  // Inicializa grupos para teses cadastradas (mesmo as vazias, se teseFiltroId corresponder ou for 'todas')
  teses.forEach((t) => {
    gruposMap[t.id] = {
      teseId: t.id,
      nome: t.nome,
      descricao: t.descricao,
      itens: [],
    }
  })

  // Grupo sem tese
  gruposMap['sem_tese'] = {
    teseId: 'sem_tese',
    nome: 'Sem Tese Definida',
    descricao: 'Sementes arquivadas sem classificação de mercado específica.',
    itens: [],
  }

  // Distribui as sementes
  sementes.forEach((item) => {
    const teseId = item.tese_semente
    if (teseId && gruposMap[teseId]) {
      gruposMap[teseId].itens.push(item)
    } else {
      gruposMap['sem_tese'].itens.push(item)
    }
  })

  // Filtra conforme teseFiltroId selecionada na pílula
  let gruposLista: GrupoSementesTese[] = []
  if (teseFiltroId === 'todas') {
    // Ordena: teses com itens primeiro, depois teses vazias, sem_tese por último (ou se tiver itens)
    const comTese = teses.map((t) => gruposMap[t.id]).filter(Boolean)
    gruposLista = [...comTese]
    if (gruposMap['sem_tese'].itens.length > 0 || comTese.length === 0) {
      gruposLista.push(gruposMap['sem_tese'])
    }
  } else if (teseFiltroId === 'sem_tese') {
    gruposLista = [gruposMap['sem_tese']]
  } else {
    const g = gruposMap[teseFiltroId]
    if (g) gruposLista = [g]
  }

  if (sementes.length === 0) {
    return null
  }

  return (
    <div className="space-y-4">
      {gruposLista.map((grupo) => {
        const isAberto = gruposAbertos[grupo.teseId] !== false // padrão aberto (true)
        const isSemTese = grupo.teseId === 'sem_tese'

        return (
          <div
            key={grupo.teseId}
            className={`rounded-xl border transition-all ${
              isSemTese
                ? 'bg-amber-50/20 border-amber-200/70'
                : 'bg-emerald-50/20 border-emerald-200/80 shadow-2xs'
            }`}
          >
            {/* Cabeçalho do Grupo de Tese */}
            <div
              onClick={() => toggleGrupo(grupo.teseId)}
              className="p-3 sm:p-3.5 flex items-center justify-between cursor-pointer select-none hover:bg-black/[0.02] rounded-t-xl transition-colors"
            >
              <div className="flex items-center gap-2.5">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-6 w-6 p-0 text-[#5B6470]"
                >
                  {isAberto ? (
                    <ChevronDown className="w-4 h-4" />
                  ) : (
                    <ChevronRight className="w-4 h-4" />
                  )}
                </Button>

                <div
                  className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${
                    isSemTese ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-800'
                  }`}
                >
                  {isSemTese ? (
                    <Sprout className="w-3.5 h-3.5" />
                  ) : (
                    <FolderLock className="w-3.5 h-3.5" />
                  )}
                </div>

                <div>
                  <div className="flex items-center gap-2">
                    <h4 className="text-xs sm:text-sm font-bold text-[#1A1D21]">{grupo.nome}</h4>
                    <Badge
                      className={`text-[10px] font-bold px-1.5 py-0 ${
                        isSemTese
                          ? 'bg-amber-100 text-amber-900 border border-amber-300'
                          : 'bg-emerald-100 text-emerald-900 border border-emerald-300'
                      }`}
                    >
                      {grupo.itens.length} {grupo.itens.length === 1 ? 'semente' : 'sementes'}
                    </Badge>
                  </div>
                  {grupo.descricao && (
                    <p className="text-[11px] text-[#5B6470] line-clamp-1 mt-0.5">
                      {grupo.descricao}
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Conteúdo do Grupo (Itens) */}
            {isAberto && (
              <div className="p-2 sm:p-3 pt-0 space-y-2 border-t border-black/[0.04]">
                {grupo.itens.length === 0 ? (
                  <div className="p-4 text-center text-xs text-[#5B6470] italic bg-white/60 rounded-lg">
                    Nenhuma semente vinculada a esta tese ainda.
                  </div>
                ) : (
                  grupo.itens.map((item, idx) => (
                    <React.Fragment key={item.id}>{renderItem(item, idx)}</React.Fragment>
                  ))
                )}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
