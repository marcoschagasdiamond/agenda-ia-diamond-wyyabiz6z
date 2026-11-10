import { useState, useEffect } from 'react'
import { useParams, useNavigate, useLocation } from 'react-router-dom'
import { diamondApi } from '@/services/diamondApi'
import { useToast } from '@/hooks/use-toast'
import type {
  Card,
  CategoriaFluxo,
  FluxoKanban,
  ColunaFluxo,
  GrupoFamilia,
  Projeto,
  Negocio,
  Contato,
  CardPrioridade,
} from '@/types'
import {
  ArrowLeft,
  Copy,
  ExternalLink,
  GitBranch,
  Paperclip,
  Users,
  Calendar,
  Building,
  User,
  Tag,
  CheckCircle2,
  Trash2,
  Save,
  Loader2,
  Sparkles,
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
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { ModalCardFluxo } from './fluxo/ModalCardFluxo'
import { ModalCardArquivos } from './fluxo/ModalCardArquivos'
import { ModalCardFamilia } from './fluxo/ModalCardFamilia'
import PainelCamposPersonalizados from '@/components/campos/PainelCamposPersonalizados'

export default function CardDetalhes() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const location = useLocation()
  const { toast } = useToast()

  const [card, setCard] = useState<Card | null>(null)
  const [carregando, setCarregando] = useState(true)
  const [salvando, setSalvando] = useState(false)

  // Dados auxiliares
  const [categorias, setCategorias] = useState<CategoriaFluxo[]>([])
  const [fluxos, setFluxos] = useState<FluxoKanban[]>([])
  const [colunas, setColunas] = useState<ColunaFluxo[]>([])
  const [familias, setFamilias] = useState<GrupoFamilia[]>([])
  const [projetos, setProjetos] = useState<Projeto[]>([])
  const [negocios, setNegocios] = useState<Negocio[]>([])
  const [contatos, setContatos] = useState<Contato[]>([])
  const [todosCards, setTodosCards] = useState<Card[]>([])

  // Formulário editável do card
  const [formTitulo, setFormTitulo] = useState('')
  const [formDescricao, setFormDescricao] = useState('')
  const [formProximoPasso, setFormProximoPasso] = useState('')
  const [formPrioridade, setFormPrioridade] = useState<CardPrioridade>('media')
  const [formStatus, setFormStatus] = useState('')
  const [formProjeto, setFormProjeto] = useState('none')
  const [formNegocio, setFormNegocio] = useState('none')
  const [formContato, setFormContato] = useState('none')
  const [formFamilia, setFormFamilia] = useState('none')
  const [formDataPrazo, setFormDataPrazo] = useState('')
  const [formTags, setFormTags] = useState('')

  // Modais dos 3 ícones
  const [modalFluxoOpen, setModalFluxoOpen] = useState(false)
  const [modalArquivosOpen, setModalArquivosOpen] = useState(false)
  const [modalFamiliaOpen, setModalFamiliaOpen] = useState(false)

  const carregarDadosCompletos = async () => {
    if (!id) return
    setCarregando(true)
    try {
      const [
        cardData,
        catsData,
        flxsData,
        colsData,
        famsData,
        projsData,
        negsData,
        contsData,
        allCardsData,
      ] = await Promise.all([
        diamondApi.getCard(id),
        diamondApi.listCategoriasFluxo(),
        diamondApi.listFluxosKanban(),
        diamondApi.listColunasFluxo(),
        diamondApi.listGruposFamilia(),
        diamondApi.listProjetos(),
        diamondApi.listNegocios(),
        diamondApi.listContatos(),
        diamondApi.listCards(),
      ])

      setCard(cardData)
      setCategorias(catsData)
      setFluxos(flxsData)
      setColunas(colsData)
      setFamilias(famsData)
      setProjetos(projsData)
      setNegocios(negsData)
      setContatos(contsData)
      setTodosCards(allCardsData)

      // Inicializa form
      setFormTitulo(cardData.titulo || '')
      setFormDescricao(cardData.descricao || '')
      setFormProximoPasso(cardData.proximo_passo || '')
      setFormPrioridade(cardData.prioridade || 'media')
      setFormStatus(cardData.status || '')
      setFormProjeto(cardData.projeto || 'none')
      setFormNegocio(cardData.negocio || 'none')
      setFormContato(cardData.contato || 'none')
      setFormFamilia(cardData.grupo_familia || 'none')
      setFormDataPrazo(cardData.data_prazo ? cardData.data_prazo.slice(0, 10) : '')
      setFormTags(Array.isArray(cardData.tags) ? cardData.tags.join(', ') : '')
    } catch (err) {
      console.error('Erro ao carregar card:', err)
      toast({
        title: 'Erro ao carregar card',
        description: (err as Error)?.message,
        variant: 'destructive',
      })
    } finally {
      setCarregando(false)
    }
  }

  useEffect(() => {
    carregarDadosCompletos()
  }, [id])

  // Botão Voltar: usa history ou volta para /fluxo com fallback inteligente
  const handleVoltar = () => {
    if (window.history.length > 1) {
      navigate(-1)
    } else {
      navigate('/fluxo')
    }
  }

  // Copiar URL do card
  const handleCopiarUrl = () => {
    const url = window.location.href
    navigator.clipboard.writeText(url)
    toast({
      title: 'URL copiada!',
      description: 'Link direto deste card copiado para a área de transferência.',
    })
  }

  // Abrir em nova aba
  const handleAbrirNovaAba = () => {
    window.open(window.location.href, '_blank')
  }

  // Salvar alterações
  const handleSalvarCard = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!id || !formTitulo.trim()) return

    setSalvando(true)
    try {
      const tagsArray = formTags
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean)

      const payload: Partial<Card> = {
        titulo: formTitulo.trim(),
        descricao: formDescricao.trim() || undefined,
        proximo_passo: formProximoPasso.trim() || undefined,
        prioridade: formPrioridade,
        status: formStatus,
        projeto: formProjeto !== 'none' ? formProjeto : undefined,
        negocio: formNegocio !== 'none' ? formNegocio : undefined,
        contato: formContato !== 'none' ? formContato : undefined,
        grupo_familia: formFamilia !== 'none' ? formFamilia : undefined,
        data_prazo: formDataPrazo ? new Date(formDataPrazo).toISOString() : undefined,
        tags: tagsArray,
      }

      const atualizado = await diamondApi.updateCard(id, payload)
      setCard(atualizado)
      toast({
        title: 'Card salvo com sucesso!',
      })
    } catch (err) {
      toast({
        title: 'Erro ao salvar alterações',
        description: (err as Error)?.message,
        variant: 'destructive',
      })
    } finally {
      setSalvando(false)
    }
  }

  // Excluir card
  const handleExcluirCard = async () => {
    if (!id || !card) return
    if (
      !confirm(`Deseja realmente excluir o card "${card.titulo}"? Esta ação não pode ser desfeita.`)
    ) {
      return
    }

    try {
      await diamondApi.deleteCard(id)
      toast({
        title: 'Card excluído com sucesso.',
      })
      navigate('/fluxo')
    } catch (err) {
      toast({
        title: 'Erro ao excluir card',
        description: (err as Error)?.message,
        variant: 'destructive',
      })
    }
  }

  if (carregando) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] text-xs text-[#5B6470] gap-3">
        <Loader2 className="w-6 h-6 animate-spin text-[#0F766E]" />
        <span>Carregando detalhes do card...</span>
      </div>
    )
  }

  if (!card) {
    return (
      <div className="bg-white rounded-xl border border-[#E5E1D8] p-8 text-center space-y-4">
        <h3 className="text-base font-bold text-[#1A1D21]">Card não encontrado</h3>
        <p className="text-xs text-[#5B6470]">
          O card solicitado pode ter sido excluído ou você não tem acesso.
        </p>
        <Button
          type="button"
          onClick={() => navigate('/fluxo')}
          className="bg-[#0F766E] hover:bg-[#0D5C56] text-white text-xs h-8"
        >
          Voltar para Fluxos
        </Button>
      </div>
    )
  }

  // Relações do card atual
  const fluxoAtual = fluxos.find((f) => f.id === card.fluxo_id)
  const categoriaAtual = categorias.find((c) => c.id === fluxoAtual?.categoria)
  const colunaAtual = colunas.find((c) => c.chave === formStatus || c.chave === card.status)
  const familiaAtual = familias.find((f) => f.id === formFamilia)
  const cardPai = todosCards.find((c) => c.id === card.card_pai)

  return (
    <div className="space-y-4 max-w-5xl mx-auto pb-12">
      {/* 1. BARRA SUPERIOR: BOTÃO VOLTAR + AÇÕES DO CARD (FLUXOS, ARQUIVOS, FAMÍLIA, URL) */}
      <div className="bg-white px-4 py-3 rounded-xl border border-[#E5E1D8] shadow-xs flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2.5 min-w-0">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleVoltar}
            className="h-8 px-3 text-xs font-semibold gap-1.5 border-[#E5E1D8] text-[#1A1D21] hover:bg-[#F4F2EE]"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Voltar
          </Button>

          <span className="text-[#CBD5E1]">/</span>

          <div className="flex items-center gap-1.5 min-w-0">
            <span
              className="w-2.5 h-2.5 rounded-full shrink-0"
              style={{ backgroundColor: fluxoAtual?.cor || '#0F766E' }}
            />
            <span className="text-xs font-semibold text-[#5B6470] truncate">
              {categoriaAtual ? `${categoriaAtual.nome} › ` : ''}
              {fluxoAtual?.nome || fluxoAtual?.titulo || 'Sem Fluxo'}
            </span>
          </div>
        </div>

        {/* 3 ÍCONES PRINCIPAIS + AÇÕES DE URL E ABA */}
        <div className="flex items-center gap-1.5 flex-wrap">
          {/* Ícone Fluxos */}
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setModalFluxoOpen(true)}
            className="h-8 px-2.5 text-xs font-semibold gap-1.5 border-[#E5E1D8] text-[#0F766E] hover:bg-[#0F766E]/10"
            title="Fluxos: Ver fluxo vinculado e revincular"
          >
            <GitBranch className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Fluxos</span>
          </Button>

          {/* Ícone Arquivos */}
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setModalArquivosOpen(true)}
            className="h-8 px-2.5 text-xs font-semibold gap-1.5 border-[#E5E1D8] text-[#2563EB] hover:bg-[#2563EB]/10"
            title="Arquivos: Ver e anexar documentos"
          >
            <Paperclip className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Arquivos</span>
          </Button>

          {/* Ícone Família */}
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setModalFamiliaOpen(true)}
            className="h-8 px-2.5 text-xs font-semibold gap-1.5 border-[#E5E1D8] text-purple-600 hover:bg-purple-50"
            title="Família: Relações, duplicação e hierarquia"
          >
            <Users className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Família</span>
          </Button>

          <span className="text-[#CBD5E1] mx-0.5">|</span>

          {/* Copiar URL */}
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={handleCopiarUrl}
            className="h-8 px-2.5 text-xs text-[#5B6470] hover:text-[#1A1D21]"
            title="Copiar URL deste card"
          >
            <Copy className="w-3.5 h-3.5 mr-1" />
            <span className="hidden md:inline">Copiar URL</span>
          </Button>

          {/* Abrir em nova aba */}
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={handleAbrirNovaAba}
            className="h-8 w-8 p-0 text-[#5B6470] hover:text-[#1A1D21]"
            title="Abrir em nova aba"
          >
            <ExternalLink className="w-3.5 h-3.5" />
          </Button>

          {/* Excluir Card */}
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={handleExcluirCard}
            className="h-8 w-8 p-0 text-red-500 hover:text-red-700 hover:bg-red-50"
            title="Excluir card"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </Button>
        </div>
      </div>

      {/* 2. FORMULÁRIO PRINCIPAL E PAINEL LATERAL DO CARD */}
      <form onSubmit={handleSalvarCard} className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* COLUNA ESQUERDA (2/3): TÍTULO, DESCRIÇÃO, PRÓXIMO PASSO */}
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-white p-5 rounded-xl border border-[#E5E1D8] shadow-xs space-y-4">
            {/* Título do Card */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-[#1A1D21] uppercase tracking-wider block">
                Título do Card
              </label>
              <Input
                required
                value={formTitulo}
                onChange={(e) => setFormTitulo(e.target.value)}
                placeholder="Título da demanda..."
                className="text-base font-bold text-[#1A1D21] h-10 border-[#E5E1D8]"
              />
            </div>

            {/* Descrição / Conteúdo */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-[#5B6470]">Descrição / Contexto</label>
              <Textarea
                rows={5}
                value={formDescricao}
                onChange={(e) => setFormDescricao(e.target.value)}
                placeholder="Detalhes, especificações e anotações deste card..."
                className="text-xs border-[#E5E1D8] leading-relaxed resize-y"
              />
            </div>

            {/* Próximo Passo */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-[#0F766E] flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5" />
                Próximo Passo Imediato
              </label>
              <Input
                value={formProximoPasso}
                onChange={(e) => setFormProximoPasso(e.target.value)}
                placeholder="Ex: Entrar em contato com o cliente até às 15h..."
                className="text-xs border-[#E5E1D8] bg-[#0F766E]/5 text-[#1A1D21]"
              />
            </div>

            {/* Hierarquia Pai (se houver) */}
            {cardPai && (
              <div className="p-3 rounded-lg border border-[#0F766E]/20 bg-[#0F766E]/5 flex items-center justify-between">
                <div className="space-y-0.5">
                  <span className="text-[10px] font-bold text-[#5B6470] uppercase tracking-wider">
                    Subtarefa de (Card Pai)
                  </span>
                  <p className="text-xs font-bold text-[#1A1D21] uppercase">{cardPai.titulo}</p>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => navigate(`/card/${cardPai.id}`)}
                  className="h-7 text-xs text-[#0F766E] border-[#0F766E]/30 gap-1"
                >
                  <ExternalLink className="w-3 h-3" />
                  Ver Pai
                </Button>
              </div>
            )}

            {/* Botão de Salvar Alterações */}
            <div className="flex justify-end pt-2 border-t border-[#E5E1D8]">
              <Button
                type="submit"
                disabled={salvando || !formTitulo.trim()}
                className="bg-[#0F766E] hover:bg-[#0D5C56] text-white text-xs h-9 px-5 font-semibold gap-1.5 shadow-2xs"
              >
                {salvando ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    Salvando...
                  </>
                ) : (
                  <>
                    <Save className="w-3.5 h-3.5" />
                    Salvar Alterações
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>

        {/* Campos Personalizados (categoria Card) */}
        <PainelCamposPersonalizados categoria="card" alvo={{ card: card.id }} />

        {/* COLUNA DIREITA (1/3): METADADOS & CLASSIFICAÇÃO */}
        <div className="space-y-4">
          <div className="bg-white p-4 rounded-xl border border-[#E5E1D8] shadow-xs space-y-3.5">
            <h4 className="text-xs font-bold text-[#1A1D21] uppercase tracking-wider pb-2 border-b border-[#E5E1D8]">
              Informações do Card
            </h4>

            {/* Fase / Coluna */}
            <div className="space-y-1">
              <label className="text-[11px] font-semibold text-[#5B6470]">Fase / Status</label>
              <Select value={formStatus} onValueChange={setFormStatus}>
                <SelectTrigger className="text-xs h-8 bg-white border-[#E5E1D8]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {colunas
                    .filter((c) => !card.fluxo_id || c.fluxo_id === card.fluxo_id)
                    .map((col) => (
                      <SelectItem key={col.chave} value={col.chave}>
                        <span className="flex items-center gap-1.5">
                          <span
                            className="w-2 h-2 rounded-full shrink-0"
                            style={{ backgroundColor: col.cor || '#0F766E' }}
                          />
                          {col.titulo}
                        </span>
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>

            {/* Prioridade */}
            <div className="space-y-1">
              <label className="text-[11px] font-semibold text-[#5B6470]">Prioridade</label>
              <Select
                value={formPrioridade}
                onValueChange={(v) => setFormPrioridade(v as CardPrioridade)}
              >
                <SelectTrigger className="text-xs h-8 bg-white border-[#E5E1D8]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="baixa">Baixa</SelectItem>
                  <SelectItem value="media">Média</SelectItem>
                  <SelectItem value="alta">Alta</SelectItem>
                  <SelectItem value="urgente">Urgente</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Grupo de Família */}
            <div className="space-y-1">
              <label className="text-[11px] font-semibold text-[#5B6470]">Grupo de Família</label>
              <Select value={formFamilia} onValueChange={setFormFamilia}>
                <SelectTrigger className="text-xs h-8 bg-white border-[#E5E1D8]">
                  <SelectValue placeholder="Nenhuma" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Nenhum (Sem Família)</SelectItem>
                  {familias.map((f) => (
                    <SelectItem key={f.id} value={f.id}>
                      {f.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Projeto Vinculado */}
            <div className="space-y-1">
              <label className="text-[11px] font-semibold text-[#5B6470]">Projeto</label>
              <Select value={formProjeto} onValueChange={setFormProjeto}>
                <SelectTrigger className="text-xs h-8 bg-white border-[#E5E1D8]">
                  <SelectValue placeholder="Nenhum" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Nenhum</SelectItem>
                  {projetos.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Contato Vinculado */}
            <div className="space-y-1">
              <label className="text-[11px] font-semibold text-[#5B6470]">Contato</label>
              <Select value={formContato} onValueChange={setFormContato}>
                <SelectTrigger className="text-xs h-8 bg-white border-[#E5E1D8]">
                  <SelectValue placeholder="Nenhum" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Nenhum</SelectItem>
                  {contatos.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Prazo Limite */}
            <div className="space-y-1">
              <label className="text-[11px] font-semibold text-[#5B6470]">Data Prazo</label>
              <Input
                type="date"
                value={formDataPrazo}
                onChange={(e) => setFormDataPrazo(e.target.value)}
                className="text-xs h-8 border-[#E5E1D8]"
              />
            </div>

            {/* Tags */}
            <div className="space-y-1">
              <label className="text-[11px] font-semibold text-[#5B6470]">
                Tags (separadas por vírgula)
              </label>
              <Input
                placeholder="comercial, prioridade, homologar"
                value={formTags}
                onChange={(e) => setFormTags(e.target.value)}
                className="text-xs h-8 border-[#E5E1D8]"
              />
            </div>

            {/* Metadados automáticos */}
            <div className="pt-2 border-t border-[#E5E1D8] text-[10px] text-[#5B6470] space-y-1">
              <div>Criado em: {new Date(card.created).toLocaleDateString('pt-BR')}</div>
              <div>Atualizado em: {new Date(card.updated).toLocaleDateString('pt-BR')}</div>
            </div>
          </div>
        </div>
      </form>

      {/* MODAL 1: FLUXOS (REVINCULAR & STATUS) */}
      <ModalCardFluxo
        open={modalFluxoOpen}
        onOpenChange={setModalFluxoOpen}
        card={card}
        categorias={categorias}
        fluxos={fluxos}
        colunas={colunas}
        onAtualizado={carregarDadosCompletos}
      />

      {/* MODAL 2: ARQUIVOS VINCULADOS */}
      <ModalCardArquivos
        open={modalArquivosOpen}
        onOpenChange={setModalArquivosOpen}
        card={card}
        onAtualizado={carregarDadosCompletos}
      />

      {/* MODAL 3: FAMÍLIA, RELAÇÕES E AÇÕES */}
      <ModalCardFamilia
        open={modalFamiliaOpen}
        onOpenChange={setModalFamiliaOpen}
        card={card}
        todosCards={todosCards}
        categorias={categorias}
        fluxos={fluxos}
        colunas={colunas}
        onAtualizado={carregarDadosCompletos}
        onExcluirCard={handleExcluirCard}
      />
    </div>
  )
}
