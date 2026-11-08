import React, { useState } from 'react'
import {
  Sprout,
  Plus,
  Tag,
  Sparkles,
  ChevronDown,
  ChevronRight,
  FolderLock,
  Layers,
  Search,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import type { TeseSemente } from '@/types'

interface AbaCofreTesesProps {
  teses: TeseSemente[]
  teseSelecionadaId: string // 'todas' | 'sem_tese' | teseId
  onSelecionarTese: (id: string) => void
  onCriarTeseRapida: (nome: string, descricao?: string) => Promise<void>
  contagemPorTese: Record<string, number>
  totalSementes: number
}

export const AbaCofreTeses: React.FC<AbaCofreTesesProps> = ({
  teses,
  teseSelecionadaId,
  onSelecionarTese,
  onCriarTeseRapida,
  contagemPorTese,
  totalSementes,
}) => {
  const [criandoTese, setCriandoTese] = useState(false)
  const [novoNome, setNovoNome] = useState('')
  const [novaDescricao, setNovaDescricao] = useState('')
  const [salvando, setSalvando] = useState(false)
  const [expandido, setExpandido] = useState(true)

  const handleSalvar = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!novoNome.trim()) return
    setSalvando(true)
    try {
      await onCriarTeseRapida(novoNome.trim(), novaDescricao.trim() || undefined)
      setNovoNome('')
      setNovaDescricao('')
      setCriandoTese(false)
    } finally {
      setSalvando(false)
    }
  }

  const semTeseCount = contagemPorTese['sem_tese'] || 0

  return (
    <div className="bg-gradient-to-r from-emerald-50/80 via-teal-50/50 to-amber-50/40 border border-emerald-200/80 rounded-xl p-3.5 space-y-3">
      {/* Cabeçalho do Cofre */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-emerald-600 text-white flex items-center justify-center shadow-xs">
            <FolderLock className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-xs font-bold text-emerald-950 uppercase tracking-wide">
                Cofre por Tese 🌱
              </h3>
              <Badge className="bg-emerald-100 text-emerald-800 border border-emerald-300 text-[10px] font-bold px-1.5 py-0">
                {totalSementes} {totalSementes === 1 ? 'semente' : 'sementes'}
              </Badge>
            </div>
            <p className="text-[11px] text-emerald-800/80">
              Agrupe oportunidades e negócios futuros por tese de mercado em vez de pastas comuns.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            type="button"
            size="sm"
            onClick={() => setCriandoTese((v) => !v)}
            className="text-xs h-7 px-2.5 bg-emerald-700 hover:bg-emerald-800 text-white gap-1 font-medium shadow-2xs"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Nova Tese</span>
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setExpandido((v) => !v)}
            className="text-xs h-7 px-2 text-emerald-900 hover:bg-emerald-100/60"
            title={expandido ? 'Recolher cofre' : 'Expandir cofre'}
          >
            {expandido ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
          </Button>
        </div>
      </div>

      {/* Formulário de Criação Rápida de Tese */}
      {criandoTese && (
        <form
          onSubmit={handleSalvar}
          className="p-3 bg-white border border-emerald-300 rounded-lg shadow-2xs space-y-2.5 animate-in fade-in duration-150"
        >
          <div className="flex items-center gap-1.5 text-xs font-semibold text-emerald-900">
            <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
            <span>Criar Tese de Mercado para Sementes</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
            <div>
              <Input
                placeholder='Ex.: "Automação residencial" ou "Parcerias de devices 2026"'
                value={novoNome}
                onChange={(e) => setNovoNome(e.target.value)}
                autoFocus
                className="text-xs h-8 bg-white border-[#E5E1D8]"
              />
            </div>
            <div>
              <Input
                placeholder="Descrição ou contexto da tese (opcional)"
                value={novaDescricao}
                onChange={(e) => setNovaDescricao(e.target.value)}
                className="text-xs h-8 bg-white border-[#E5E1D8]"
              />
            </div>
          </div>
          <div className="flex items-center justify-end gap-2 pt-1">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                setCriandoTese(false)
                setNovoNome('')
                setNovaDescricao('')
              }}
              className="text-xs h-7 px-2.5"
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={salvando || !novoNome.trim()}
              className="text-xs h-7 px-3 bg-emerald-700 hover:bg-emerald-800 text-white font-medium"
            >
              {salvando ? 'Salvando...' : 'Salvar Tese'}
            </Button>
          </div>
        </form>
      )}

      {/* Pílulas de filtro de tese */}
      {expandido && (
        <div className="flex flex-wrap items-center gap-1.5 pt-1">
          <button
            type="button"
            onClick={() => onSelecionarTese('todas')}
            className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all flex items-center gap-1.5 ${
              teseSelecionadaId === 'todas'
                ? 'bg-emerald-800 text-white shadow-xs font-semibold'
                : 'bg-white/80 hover:bg-white text-emerald-900 border border-emerald-200'
            }`}
          >
            <Layers className="w-3 h-3" />
            <span>Todas as Teses</span>
            <span
              className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                teseSelecionadaId === 'todas'
                  ? 'bg-emerald-950 text-white'
                  : 'bg-emerald-100 text-emerald-800'
              }`}
            >
              {totalSementes}
            </span>
          </button>

          {teses.map((t) => {
            const count = contagemPorTese[t.id] || 0
            const isAtiva = teseSelecionadaId === t.id
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => onSelecionarTese(t.id)}
                className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all flex items-center gap-1.5 ${
                  isAtiva
                    ? 'bg-emerald-800 text-white shadow-xs font-semibold'
                    : 'bg-white/80 hover:bg-white text-emerald-900 border border-emerald-200'
                }`}
                title={t.descricao || t.nome}
              >
                <Tag className="w-3 h-3 text-emerald-600" />
                <span className="truncate max-w-[180px]">{t.nome}</span>
                <span
                  className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                    isAtiva ? 'bg-emerald-950 text-white' : 'bg-emerald-100 text-emerald-800'
                  }`}
                >
                  {count}
                </span>
              </button>
            )
          })}

          <button
            type="button"
            onClick={() => onSelecionarTese('sem_tese')}
            className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all flex items-center gap-1.5 ${
              teseSelecionadaId === 'sem_tese'
                ? 'bg-amber-800 text-white shadow-xs font-semibold'
                : 'bg-white/80 hover:bg-white text-amber-900 border border-amber-200'
            }`}
          >
            <Sprout className="w-3 h-3 text-amber-600" />
            <span>Sem tese</span>
            <span
              className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                teseSelecionadaId === 'sem_tese'
                  ? 'bg-amber-950 text-white'
                  : 'bg-amber-100 text-amber-800'
              }`}
            >
              {semTeseCount}
            </span>
          </button>
        </div>
      )}
    </div>
  )
}
