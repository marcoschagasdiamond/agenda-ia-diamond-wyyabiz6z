import React, { useState, useEffect } from 'react'
import { diamondApi } from '@/services/diamondApi'
import type { Lista, Demanda, Contato, ListaTipo, ListaCompartilhada } from '@/types'
import {
  ListTodo,
  Plus,
  Share2,
  CheckCircle2,
  Clock,
  Users,
  CheckSquare,
  Trash2,
  UserPlus,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useNavegacao } from '@/contexts/NavegacaoContext'
import { Input } from '@/components/ui/input'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useToast } from '@/hooks/use-toast'

export default function Listas() {
  const { toast } = useToast()
  const { setModalConvidarEquipeOpen, setModalConvidarEscopoPadrao } = useNavegacao()
  const [listas, setListas] = useState<Lista[]>([])
  const [demandas, setDemandas] = useState<Demanda[]>([])
  const [contatos, setContatos] = useState<Contato[]>([])

  // Modal Criar Lista
  const [modalListaOpen, setModalListaOpen] = useState(false)
  const [nomeLista, setNomeLista] = useState('')
  const [tipoLista, setTipoLista] = useState<ListaTipo>('demandas')
  const [compartilhadaCom, setCompartilhadaCom] = useState<ListaCompartilhada>('interno')

  // Modal Criar Demanda Rápida
  const [modalDemandaOpen, setModalDemandaOpen] = useState(false)
  const [tituloDemanda, setTituloDemanda] = useState('')
  const [descDemanda, setDescDemanda] = useState('')
  const [prazoDemanda, setPrazoDemanda] = useState('')
  const [lembreteModo, setLembreteModo] = useState<'padrao' | 'personalizado' | 'desativado'>(
    'padrao',
  )
  const [lembreteAntecedencias, setLembreteAntecedencias] = useState<
    import('@/types').LembreteAntecedenciaCodigo[]
  >(['1h', '1d'])

  const carregar = async () => {
    try {
      const [l, d, c] = await Promise.all([
        diamondApi.listListas(),
        diamondApi.listDemandas(),
        diamondApi.listContatos(),
      ])
      setListas(l)
      setDemandas(d)
      setContatos(c)
    } catch (err) {
      console.error(err)
    }
  }

  useEffect(() => {
    carregar()
  }, [])

  const handleCriarLista = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!nomeLista.trim()) return

    try {
      await diamondApi.createLista({
        nome: nomeLista.trim(),
        tipo: tipoLista,
        compartilhada_com: compartilhadaCom,
      })
      toast({ title: 'Lista criada com sucesso!' })
      setModalListaOpen(false)
      setNomeLista('')
      await carregar()
    } catch (err) {
      toast({ title: 'Erro ao criar lista', variant: 'destructive' })
    }
  }

  const handleCriarDemanda = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!tituloDemanda.trim()) return

    try {
      await diamondApi.createDemanda({
        titulo: tituloDemanda.trim(),
        descricao: descDemanda.trim() || undefined,
        status: 'pendente',
        prazo: prazoDemanda || undefined,
        lembrete_modo: lembreteModo,
        lembrete_antecedencias:
          lembreteModo === 'personalizado' ? lembreteAntecedencias : undefined,
      })
      toast({ title: 'Demanda criada e disponível para delegação!' })
      setModalDemandaOpen(false)
      setTituloDemanda('')
      setDescDemanda('')
      setPrazoDemanda('')
      setLembreteModo('padrao')
      setLembreteAntecedencias(['1h', '1d'])
      await carregar()
    } catch (err) {
      toast({ title: 'Erro ao criar demanda', variant: 'destructive' })
    }
  }

  const handleToggleDemanda = async (demanda: Demanda) => {
    const novoStatus = demanda.status === 'pendente' ? 'concluido' : 'pendente'
    try {
      await diamondApi.updateDemanda(demanda.id, { status: novoStatus })
      setDemandas((prev) =>
        prev.map((d) => (d.id === demanda.id ? { ...d, status: novoStatus } : d)),
      )
      toast({ title: `Demanda marcada como ${novoStatus}` })
    } catch {
      toast({ title: 'Erro ao atualizar status', variant: 'destructive' })
    }
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-xl border border-[#E5E1D8] shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl md:text-2xl font-bold tracking-tight text-[#1A1D21]">
              Listas & Demandas Delegáveis
            </h1>
            <Badge className="bg-[#0F766E]/10 text-[#0F766E] border-none text-[11px] font-semibold">
              Produtividade & Alinhamento
            </Badge>
          </div>
          <p className="text-xs text-[#5B6470] mt-1">
            Crie listas de tarefas delegáveis para assistentes, clientes ou fornecedores com
            controle de status.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setModalListaOpen(true)}
            className="text-xs h-9 border-[#E5E1D8] gap-1.5"
          >
            <Plus className="w-4 h-4 text-[#5B6470]" />
            Nova Lista
          </Button>
          <Button
            size="sm"
            onClick={() => setModalDemandaOpen(true)}
            className="bg-[#0F766E] hover:bg-[#0D5C56] text-white text-xs h-9 px-4 font-medium shadow-sm gap-1.5"
          >
            <CheckSquare className="w-4 h-4" />
            Nova Demanda
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Coluna 1: Demandas Delegadas */}
        <Card className="lg:col-span-2 border-[#E5E1D8] bg-white shadow-xs">
          <CardHeader className="pb-3 border-b border-[#E5E1D8]/60 flex flex-row items-center justify-between">
            <CardTitle className="text-sm font-bold text-[#1A1D21] flex items-center gap-2">
              <CheckSquare className="w-4 h-4 text-[#0F766E]" />
              Demandas em Andamento ({demandas.filter((d) => d.status === 'pendente').length})
            </CardTitle>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setModalDemandaOpen(true)}
              className="text-xs text-[#0F766E]"
            >
              + Adicionar
            </Button>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y divide-[#E5E1D8]">
              {demandas.map((demanda) => {
                const isConcluido = demanda.status === 'concluido'
                return (
                  <div
                    key={demanda.id}
                    className={`p-3.5 flex items-center justify-between hover:bg-[#FAFAF9] transition-colors ${
                      isConcluido ? 'opacity-60 line-through' : ''
                    }`}
                  >
                    <div className="flex items-center gap-3 truncate">
                      <input
                        type="checkbox"
                        checked={isConcluido}
                        onChange={() => handleToggleDemanda(demanda)}
                        className="w-4 h-4 rounded text-[#0F766E] border-[#E5E1D8] cursor-pointer"
                      />
                      <div className="truncate">
                        <span className="text-xs font-semibold text-[#1A1D21] block truncate">
                          {demanda.titulo}
                        </span>
                        {demanda.descricao && (
                          <span className="text-[11px] text-[#5B6470] block truncate">
                            {demanda.descricao}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      {demanda.expand?.projeto && (
                        <span className="text-[10px] bg-[#F4F2EE] px-1.5 py-0.5 rounded text-[#5B6470] hidden sm:inline truncate max-w-[100px]">
                          📁 {demanda.expand.projeto.nome}
                        </span>
                      )}
                      {demanda.expand?.contato && (
                        <span className="text-[10px] bg-[#F4F2EE] px-1.5 py-0.5 rounded text-[#5B6470] hidden sm:inline truncate max-w-[100px]">
                          👤 {demanda.expand.contato.nome}
                        </span>
                      )}
                      {demanda.prazo && (
                        <span className="text-[10px] text-[#5B6470] flex items-center gap-1 bg-[#F4F2EE] px-2 py-0.5 rounded">
                          <Clock className="w-3 h-3" />
                          {demanda.prazo}
                        </span>
                      )}
                      {!isConcluido && (
                        <button
                          type="button"
                          onClick={() => {
                            setModalConvidarEscopoPadrao({
                              tipo: 'demanda',
                              id: demanda.id,
                              nome: demanda.titulo,
                            })
                            setModalConvidarEquipeOpen(true)
                          }}
                          className="text-[10px] text-[#5B6470] hover:text-[#0F766E] flex items-center gap-1 p-1 rounded hover:bg-[#F4F2EE]"
                          title="Convidar colaborador para esta demanda"
                        >
                          <UserPlus className="w-3 h-3" />
                          <span className="hidden md:inline">Convidar</span>
                        </button>
                      )}
                    </div>
                  </div>
                )
              })}

              {demandas.length === 0 && (
                <div className="py-12 text-center text-xs text-[#5B6470]">
                  Nenhuma demanda delegável cadastrada.
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Coluna 2: Grupos e Listas Estruturadas */}
        <Card className="border-[#E5E1D8] bg-white shadow-xs">
          <CardHeader className="pb-3 border-b border-[#E5E1D8]/60">
            <CardTitle className="text-sm font-bold text-[#1A1D21] flex items-center gap-2">
              <ListTodo className="w-4 h-4 text-[#0F766E]" />
              Listas Criadas ({listas.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 space-y-3">
            {listas.map((lista) => (
              <div
                key={lista.id}
                className="p-3 rounded-lg border border-[#E5E1D8] bg-[#FAFAF9] text-xs space-y-1.5"
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-[#1A1D21]">{lista.nome}</span>
                  <Badge variant="outline" className="text-[10px] capitalize">
                    {lista.compartilhada_com}
                  </Badge>
                </div>
                <div className="flex items-center justify-between text-[11px] text-[#5B6470]">
                  <span>Tipo: {lista.tipo}</span>
                  <span>Criada recentemente</span>
                </div>
              </div>
            ))}

            {listas.length === 0 && (
              <div className="py-8 text-center text-xs text-[#5B6470]">
                Crie listas reutilizáveis para compartilhar com clientes ou parceiros.
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Modal Criar Lista */}
      <Dialog open={modalListaOpen} onOpenChange={setModalListaOpen}>
        <DialogContent className="max-w-sm bg-white border border-[#E5E1D8]">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-[#1A1D21]">Nova Lista</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCriarLista} className="space-y-3 pt-2">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-[#1A1D21]">Nome da Lista *</label>
              <Input
                required
                placeholder="Ex: Clientes VIP Q3 ou Demandas Loja Y"
                value={nomeLista}
                onChange={(e) => setNomeLista(e.target.value)}
                className="text-xs border-[#E5E1D8]"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-semibold text-[#5B6470]">Tipo</label>
              <Select value={tipoLista} onValueChange={(v) => setTipoLista(v as ListaTipo)}>
                <SelectTrigger className="text-xs border-[#E5E1D8]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="demandas">Demandas / Tarefas</SelectItem>
                  <SelectItem value="contatos">Contatos / Pessoas</SelectItem>
                  <SelectItem value="cadastros">Cadastros</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-semibold text-[#5B6470]">Compartilhada com</label>
              <Select
                value={compartilhadaCom}
                onValueChange={(v) => setCompartilhadaCom(v as ListaCompartilhada)}
              >
                <SelectTrigger className="text-xs border-[#E5E1D8]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="interno">Apenas Interno</SelectItem>
                  <SelectItem value="clientes">Clientes no Portal</SelectItem>
                  <SelectItem value="publica">Pública</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <DialogFooter className="pt-2">
              <Button
                type="submit"
                size="sm"
                className="bg-[#0F766E] hover:bg-[#0D5C56] text-white text-xs"
              >
                Criar Lista
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Modal Criar Demanda */}
      <Dialog open={modalDemandaOpen} onOpenChange={setModalDemandaOpen}>
        <DialogContent className="max-w-md bg-white border border-[#E5E1D8]">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-[#1A1D21]">
              Nova Demanda Delegável
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCriarDemanda} className="space-y-3.5 pt-2">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-[#1A1D21]">Título da Demanda *</label>
              <Input
                required
                placeholder="Ex: Levantar 5 referências de checkout para a Loja Y"
                value={tituloDemanda}
                onChange={(e) => setTituloDemanda(e.target.value)}
                className="text-xs border-[#E5E1D8]"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-semibold text-[#5B6470]">Descrição / Instruções</label>
              <Input
                placeholder="Ex: Focar em modelos com checkout transparente no mobile"
                value={descDemanda}
                onChange={(e) => setDescDemanda(e.target.value)}
                className="text-xs border-[#E5E1D8]"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-semibold text-[#5B6470]">
                Prazo Limite (Opcional)
              </label>
              <Input
                type="date"
                value={prazoDemanda}
                onChange={(e) => setPrazoDemanda(e.target.value)}
                className="text-xs border-[#E5E1D8]"
              />
            </div>

            {/* Configuração de Lembrete da Demanda */}
            <div className="p-2.5 rounded-lg border border-[#0F766E]/30 bg-[#0F766E]/5 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-[#0F766E]">Lembrete de Vencimento</span>
                <div className="flex items-center gap-1">
                  {(['padrao', 'personalizado', 'desativado'] as const).map((m) => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => setLembreteModo(m)}
                      className={`text-[10px] px-2 py-0.5 rounded font-semibold transition-colors ${
                        lembreteModo === m
                          ? 'bg-[#0F766E] text-white shadow-2xs'
                          : 'bg-white text-[#5B6470] border border-[#E5E1D8]'
                      }`}
                    >
                      {m === 'padrao'
                        ? 'Padrão'
                        : m === 'personalizado'
                          ? 'Personalizar'
                          : 'Desativar'}
                    </button>
                  ))}
                </div>
              </div>

              {lembreteModo === 'personalizado' && (
                <div className="pt-1.5 border-t border-[#0F766E]/20 space-y-1">
                  <span className="text-[10px] text-[#5B6470] block">
                    Antecedências para avisar no sino e por e-mail:
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {[
                      { c: '1h', l: '1 hora' },
                      { c: '2h', l: '2 horas' },
                      { c: '1d', l: '1 dia' },
                      { c: '2d', l: '2 dias' },
                      { c: '1w', l: '1 sem' },
                    ].map((opt) => {
                      const optCode = opt.c as import('@/types').LembreteAntecedenciaCodigo
                      const ativo = lembreteAntecedencias.includes(optCode)
                      return (
                        <button
                          key={opt.c}
                          type="button"
                          onClick={() => {
                            setLembreteAntecedencias((prev) =>
                              ativo ? prev.filter((x) => x !== optCode) : [...prev, optCode],
                            )
                          }}
                          className={`text-[10px] px-2 py-0.5 rounded border transition-colors ${
                            ativo
                              ? 'bg-[#0F766E] border-[#0F766E] text-white font-bold'
                              : 'bg-white border-[#E5E1D8] text-[#5B6470]'
                          }`}
                        >
                          {opt.l}
                        </button>
                      )
                    })}
                  </div>
                </div>
              )}
            </div>

            <DialogFooter className="pt-2">
              <Button
                type="submit"
                size="sm"
                className="bg-[#0F766E] hover:bg-[#0D5C56] text-white text-xs"
              >
                Salvar Demanda
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
