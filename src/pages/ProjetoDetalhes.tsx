import React, { useState, useEffect } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { diamondApi } from '@/services/diamondApi'
import type { Projeto, Card as CardType, Contato, Arquivo, Demanda } from '@/types'
import {
  FolderKanban,
  ArrowLeft,
  Sparkles,
  Plus,
  FileText,
  Users,
  CheckCircle2,
  Clock,
  Layers,
  Building,
  UploadCloud,
  File,
  Send,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card'
import { Textarea } from '@/components/ui/textarea'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useToast } from '@/hooks/use-toast'

export default function ProjetoDetalhes() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { toast } = useToast()

  const [projeto, setProjeto] = useState<Projeto | null>(null)
  const [cards, setCards] = useState<CardType[]>([])
  const [contatos, setContatos] = useState<Contato[]>([])
  const [arquivos, setArquivos] = useState<Arquivo[]>([])
  const [novoContexto, setNovoContexto] = useState('')
  const [salvandoContexto, setSalvandoContexto] = useState(false)
  const [loading, setLoading] = useState(true)

  const carregar = async () => {
    if (!id) return
    try {
      const p = await diamondApi.getProjeto(id)
      setProjeto(p)
      setNovoContexto(p.contexto_resumido || '')

      const [c, ct, a] = await Promise.all([
        diamondApi.listCards(`projeto = "${id}"`),
        diamondApi.listContatos(),
        diamondApi.listArquivos(undefined, id),
      ])
      setCards(c)
      setContatos(ct.filter((item) => item.projetos?.includes(id)))
      setArquivos(a)
    } catch (err) {
      console.error(err)
      toast({ title: 'Erro ao carregar projeto', variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    carregar()
  }, [id])

  const handleSalvarContexto = async () => {
    if (!id) return
    setSalvandoContexto(true)
    try {
      await diamondApi.updateProjeto(id, { contexto_resumido: novoContexto })
      toast({ title: 'Memória e contexto histórico atualizados com sucesso!' })
      await carregar()
    } catch (err) {
      toast({ title: 'Erro ao atualizar memória', variant: 'destructive' })
    } finally {
      setSalvandoContexto(false)
    }
  }

  if (loading) {
    return <div className="p-8 text-center text-xs text-[#5B6470]">Carregando projeto...</div>
  }

  if (!projeto) {
    return (
      <div className="p-8 text-center space-y-3">
        <p className="text-sm text-red-600 font-semibold">Projeto não encontrado.</p>
        <Link to="/projetos">
          <Button variant="outline" size="sm" className="text-xs">
            Voltar aos Projetos
          </Button>
        </Link>
      </div>
    )
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-xl border border-[#E5E1D8] shadow-xs">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate('/projetos')}
            className="text-xs p-2 h-8 text-[#5B6470]"
          >
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold tracking-tight text-[#1A1D21]">{projeto.nome}</h1>
              <Badge variant="outline" className="text-[10px] capitalize">
                {projeto.tipo}
              </Badge>
              <Badge className="bg-emerald-50 text-emerald-700 text-[10px]">{projeto.status}</Badge>
            </div>
            {projeto.descricao && (
              <p className="text-xs text-[#5B6470] mt-1">{projeto.descricao}</p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            size="sm"
            onClick={() => navigate(`/fluxo`)}
            className="bg-[#0F766E] hover:bg-[#0D5C56] text-white text-xs h-8 px-3"
          >
            Ver no Kanban
          </Button>
        </div>
      </div>

      {/* Caixa de Memória Contínua (Contexto Resumido do Projeto) */}
      <Card className="border-[#0F766E]/30 bg-teal-50/20 shadow-xs">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold text-[#0F766E] flex items-center gap-2">
            <Sparkles className="w-4 h-4" />
            Memória do Projeto & Contexto Histórico
          </CardTitle>
          <CardDescription className="text-xs text-[#5B6470]">
            A IA alimenta este resumo a cada sessão organizada. Você também pode editar e adicionar
            diretrizes perenes.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <Textarea
            rows={4}
            value={novoContexto}
            onChange={(e) => setNovoContexto(e.target.value)}
            placeholder="Decisões tomadas, combinados de escopo, posicionamento, feedbacks e diretrizes que nunca devem ser esquecidos..."
            className="text-xs bg-white border-[#E5E1D8]"
          />
          <div className="flex justify-end">
            <Button
              size="sm"
              disabled={salvandoContexto}
              onClick={handleSalvarContexto}
              className="bg-[#0F766E] hover:bg-[#0D5C56] text-white text-xs h-8"
            >
              {salvandoContexto ? 'Salvando Memória...' : 'Atualizar Memória'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Tabs com Cards, Contatos e Arquivos */}
      <Tabs defaultValue="cards" className="w-full">
        <TabsList className="bg-white border border-[#E5E1D8] p-1">
          <TabsTrigger
            value="cards"
            className="text-xs data-[state=active]:bg-[#0F766E] data-[state=active]:text-white"
          >
            Cards & Demandas ({cards.length})
          </TabsTrigger>
          <TabsTrigger
            value="contatos"
            className="text-xs data-[state=active]:bg-[#0F766E] data-[state=active]:text-white"
          >
            Pessoas & Contatos ({contatos.length})
          </TabsTrigger>
          <TabsTrigger
            value="arquivos"
            className="text-xs data-[state=active]:bg-[#0F766E] data-[state=active]:text-white"
          >
            Arquivos & Documentos ({arquivos.length})
          </TabsTrigger>
        </TabsList>

        {/* Tab Cards */}
        <TabsContent value="cards" className="mt-4 space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {cards.map((c) => (
              <div
                key={c.id}
                onClick={() => navigate('/fluxo')}
                className="p-3.5 rounded-lg bg-white border border-[#E5E1D8] shadow-2xs hover:border-[#0F766E] transition-colors cursor-pointer"
              >
                <div className="flex items-center justify-between gap-2 mb-1">
                  <h4 className="text-xs font-semibold text-[#1A1D21] truncate">{c.titulo}</h4>
                  <Badge variant="outline" className="text-[10px] capitalize">
                    {c.status.replace('_', ' ')}
                  </Badge>
                </div>
                {c.descricao && (
                  <p className="text-[11px] text-[#5B6470] line-clamp-2 mb-2">{c.descricao}</p>
                )}
                {c.proximo_passo && (
                  <p className="text-[11px] text-[#0F766E] font-medium">🚀 {c.proximo_passo}</p>
                )}
              </div>
            ))}
            {cards.length === 0 && (
              <div className="col-span-full py-8 text-center text-xs text-[#5B6470] bg-white rounded-lg border border-[#E5E1D8]">
                Nenhum card vinculado a este projeto. Lance registros na Folha do Dia.
              </div>
            )}
          </div>
        </TabsContent>

        {/* Tab Contatos */}
        <TabsContent value="contatos" className="mt-4 space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {contatos.map((ct) => (
              <div
                key={ct.id}
                onClick={() => navigate(`/contatos/${ct.id}`)}
                className="p-3.5 rounded-lg bg-white border border-[#E5E1D8] shadow-2xs hover:border-[#0F766E] transition-colors cursor-pointer"
              >
                <h4 className="text-xs font-bold text-[#1A1D21]">{ct.nome}</h4>
                <p className="text-[11px] text-[#5B6470]">
                  {ct.cargo || 'Contato'} {ct.empresa && `• ${ct.empresa}`}
                </p>
                <p className="text-[11px] text-[#0F766E] mt-1">{ct.email || ct.telefone}</p>
              </div>
            ))}
            {contatos.length === 0 && (
              <div className="col-span-full py-8 text-center text-xs text-[#5B6470] bg-white rounded-lg border border-[#E5E1D8]">
                Nenhum contato vinculado diretamente a este projeto.
              </div>
            )}
          </div>
        </TabsContent>

        {/* Tab Arquivos */}
        <TabsContent value="arquivos" className="mt-4 space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {arquivos.map((arq) => (
              <div
                key={arq.id}
                className="p-3 rounded-lg bg-white border border-[#E5E1D8] shadow-2xs flex items-center justify-between"
              >
                <div className="flex items-center gap-2 truncate">
                  <File className="w-4 h-4 text-[#0F766E] shrink-0" />
                  <span className="text-xs text-[#1A1D21] font-medium truncate">{arq.nome}</span>
                </div>
                <a
                  href={`${import.meta.env.VITE_POCKETBASE_URL}/api/files/arquivos/${arq.id}/${arq.arquivo}`}
                  target="_blank"
                  rel="noreferrer"
                  className="text-xs text-[#0F766E] hover:underline shrink-0 ml-2"
                >
                  Baixar
                </a>
              </div>
            ))}
            {arquivos.length === 0 && (
              <div className="col-span-full py-8 text-center text-xs text-[#5B6470] bg-white rounded-lg border border-[#E5E1D8]">
                Nenhum arquivo armazenado na pasta deste projeto. Acesse a aba 'Arquivos & Pastas'
                para fazer upload.
              </div>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
