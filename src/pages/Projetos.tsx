import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { diamondApi } from '@/services/diamondApi'
import type { Projeto, ProjetoTipo, ProjetoStatus } from '@/types'
import {
  FolderKanban,
  Plus,
  ArrowRight,
  Sparkles,
  Building,
  CheckCircle2,
  Clock,
  Layers,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  CardDescription,
  CardFooter,
} from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { useToast } from '@/hooks/use-toast'

export default function Projetos() {
  const navigate = useNavigate()
  const { toast } = useToast()

  const [projetos, setProjetos] = useState<Projeto[]>([])
  const [modalOpen, setModalOpen] = useState(false)
  const [nome, setNome] = useState('')
  const [descricao, setDescricao] = useState('')
  const [tipo, setTipo] = useState<ProjetoTipo>('cliente')
  const [contextoResumido, setContextoResumido] = useState('')
  const [salvando, setSalvando] = useState(false)

  const carregar = async () => {
    try {
      const p = await diamondApi.listProjetos()
      setProjetos(p)
    } catch (err) {
      console.error(err)
    }
  }

  useEffect(() => {
    carregar()
  }, [])

  const handleCriarProjeto = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!nome.trim()) return
    setSalvando(true)

    try {
      // Cria pasta raiz automaticamente para o projeto
      const pasta = await diamondApi.createPasta({ nome: `${nome.trim()} - Arquivos` })

      await diamondApi.createProjeto({
        nome: nome.trim(),
        descricao: descricao.trim() || undefined,
        tipo,
        status: 'ativo',
        pasta_raiz: pasta.id,
        contexto_resumido: contextoResumido.trim() || undefined,
      })

      toast({ title: 'Projeto criado com sucesso!' })
      setModalOpen(false)
      setNome('')
      setDescricao('')
      setContextoResumido('')
      await carregar()
    } catch (err) {
      toast({
        title: 'Erro ao criar projeto',
        description: (err as Error)?.message,
        variant: 'destructive',
      })
    } finally {
      setSalvando(false)
    }
  }

  const getTipoBadge = (t?: ProjetoTipo) => {
    return (
      <Badge variant="outline" className="text-[10px] capitalize border-[#E5E1D8] text-[#5B6470]">
        {t}
      </Badge>
    )
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-xl border border-[#E5E1D8] shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl md:text-2xl font-bold tracking-tight text-[#1A1D21]">
              Projetos & Negócios
            </h1>
            <Badge className="bg-[#0F766E]/10 text-[#0F766E] border-none text-[11px] font-semibold">
              {projetos.length} Cadastrados
            </Badge>
          </div>
          <p className="text-xs text-[#5B6470] mt-1">
            Cada projeto acumula memória contínua, histórico de decisões, cards, contatos e
            arquivos.
          </p>
        </div>

        <Button
          onClick={() => setModalOpen(true)}
          className="bg-[#0F766E] hover:bg-[#0D5C56] text-white text-xs h-9 px-4 font-medium shadow-sm gap-1.5"
        >
          <Plus className="w-4 h-4" />
          Novo Projeto
        </Button>
      </div>

      {/* Grid de Projetos */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {projetos.map((proj) => (
          <Card
            key={proj.id}
            onClick={() => navigate(`/projetos/${proj.id}`)}
            className="border-[#E5E1D8] bg-white shadow-xs diamond-card-hover cursor-pointer flex flex-col justify-between"
          >
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between gap-2 mb-1">
                {getTipoBadge(proj.tipo)}
                <Badge
                  className={`text-[10px] ${
                    proj.status === 'ativo'
                      ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                      : 'bg-zinc-100 text-zinc-700 border-zinc-200'
                  }`}
                  variant="outline"
                >
                  {proj.status}
                </Badge>
              </div>
              <CardTitle className="text-base font-bold text-[#1A1D21] line-clamp-1">
                {proj.nome}
              </CardTitle>
              {proj.descricao && (
                <CardDescription className="text-xs text-[#5B6470] line-clamp-2 mt-1">
                  {proj.descricao}
                </CardDescription>
              )}
            </CardHeader>

            <CardContent className="space-y-3 pb-3">
              {proj.contexto_resumido ? (
                <div className="bg-[#F4F2EE]/60 p-2.5 rounded-lg border border-[#E5E1D8]/60 text-[11px]">
                  <span className="font-semibold text-[#0F766E] block text-[10px] uppercase tracking-wider mb-1 flex items-center gap-1">
                    <Sparkles className="w-3 h-3" /> Memória Recente
                  </span>
                  <p className="text-[#5B6470] line-clamp-3 leading-relaxed">
                    {proj.contexto_resumido}
                  </p>
                </div>
              ) : (
                <div className="text-[11px] text-[#5B6470]/70 italic">
                  Contexto histórico será gerado após as primeiras sessões.
                </div>
              )}
            </CardContent>

            <CardFooter className="pt-2 pb-3 border-t border-[#E5E1D8]/60 flex items-center justify-between text-xs text-[#0F766E] font-medium">
              <span>Abrir Segundo Cérebro</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </CardFooter>
          </Card>
        ))}
      </div>

      {/* Modal Criar Projeto */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="max-w-md bg-white border border-[#E5E1D8]">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-[#1A1D21]">
              Criar Novo Projeto
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleCriarProjeto} className="space-y-4 pt-2">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-[#1A1D21]">Nome do Projeto *</label>
              <Input
                required
                placeholder="Ex: Expansão E-commerce Loja Y"
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                className="text-sm border-[#E5E1D8]"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-[#5B6470]">Tipo de Projeto</label>
              <Select value={tipo} onValueChange={(v) => setTipo(v as ProjetoTipo)}>
                <SelectTrigger className="text-xs border-[#E5E1D8]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="cliente">Cliente</SelectItem>
                  <SelectItem value="negocio">Negócio Próprio</SelectItem>
                  <SelectItem value="posicionamento">Posicionamento</SelectItem>
                  <SelectItem value="precos">Preços & Tabelas</SelectItem>
                  <SelectItem value="devices">Projetos de Devices</SelectItem>
                  <SelectItem value="estudo">Estudos & Pesquisas</SelectItem>
                  <SelectItem value="freelance">Freelance</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-[#5B6470]">Descrição Geral</label>
              <Textarea
                rows={2}
                placeholder="Escopo, metas e premissas gerais..."
                value={descricao}
                onChange={(e) => setDescricao(e.target.value)}
                className="text-xs border-[#E5E1D8]"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-[#0F766E]">
                Contexto Inicial (Memória)
              </label>
              <Textarea
                rows={2}
                placeholder="Decisões anteriores, combinados com o cliente, dados chave..."
                value={contextoResumido}
                onChange={(e) => setContextoResumido(e.target.value)}
                className="text-xs border-[#E5E1D8]"
              />
            </div>

            <DialogFooter className="flex justify-end gap-2 pt-3 border-t border-[#E5E1D8]">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setModalOpen(false)}
                className="text-xs"
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={salvando}
                className="bg-[#0F766E] hover:bg-[#0D5C56] text-white text-xs"
              >
                {salvando ? 'Criando...' : 'Salvar Projeto'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
