import React, { useState, useEffect } from 'react'
import { diamondApi } from '@/services/diamondApi'
import type {
  Formulario,
  FormCampoConfig,
  FormCampoTipo,
  PastaFormulario,
  FormularioResposta,
} from '@/types'
import {
  FileText,
  Plus,
  Pencil,
  Trash2,
  Copy,
  Code,
  Download,
  FolderInput,
  Eye,
  Check,
  Search,
  ExternalLink,
  Sparkles,
  ToggleLeft,
  ToggleRight,
  GripVertical,
  HelpCircle,
  FolderOpen,
  ArrowRight,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
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

interface ConstrutorFormulariosProps {
  onRecarregarGlobal?: () => void
}

export default function ConstrutorFormularios({ onRecarregarGlobal }: ConstrutorFormulariosProps) {
  const { toast } = useToast()
  const [formularios, setFormularios] = useState<Formulario[]>([])
  const [pastas, setPastas] = useState<PastaFormulario[]>([])
  const [respostas, setRespostas] = useState<FormularioResposta[]>([])
  const [carregando, setCarregando] = useState(false)
  const [busca, setBusca] = useState('')
  const [pastaFiltro, setPastaFiltro] = useState<string>('todas')

  // Modal Construtor / Editor de Formulário
  const [modalBuilderOpen, setModalBuilderOpen] = useState(false)
  const [formIdEditando, setFormIdEditando] = useState<string | null>(null)
  const [titulo, setTitulo] = useState('')
  const [descricao, setDescricao] = useState('')
  const [slug, setSlug] = useState('')
  const [publicado, setPublicado] = useState(true)
  const [pastaGrupo, setPastaGrupo] = useState('Geral')
  const [mensagemSucesso, setMensagemSucesso] = useState(
    'Obrigado pelas respostas! Entraremos em contato em breve.',
  )
  const [corTema, setCorTema] = useState('#0F766E')
  const [campos, setCampos] = useState<FormCampoConfig[]>([])
  const [salvando, setSalvando] = useState(false)

  // Modal "Mover para..."
  const [modalMoverOpen, setModalMoverOpen] = useState(false)
  const [formParaMover, setFormParaMover] = useState<Formulario | null>(null)
  const [novaPastaDestino, setNovaPastaDestino] = useState('')

  // Modal "Exportar / Visualizar Respostas"
  const [modalRespostasOpen, setModalRespostasOpen] = useState(false)
  const [formRespostasAtual, setFormRespostasAtual] = useState<Formulario | null>(null)
  const [respostasDesteForm, setRespostasDesteForm] = useState<FormularioResposta[]>([])
  const [carregandoRespostas, setCarregandoRespostas] = useState(false)

  // Modal de Criação de Nova Pasta de Formulários
  const [modalNovaPastaOpen, setModalNovaPastaOpen] = useState(false)
  const [nomeNovaPasta, setNomeNovaPasta] = useState('')
  const [corNovaPasta, setCorNovaPasta] = useState('#64748B')

  const carregarDados = async () => {
    setCarregando(true)
    try {
      const [fList, pList, rList] = await Promise.all([
        diamondApi.listFormularios(),
        diamondApi.listPastasFormularios(),
        diamondApi.listRespostasFormulario(),
      ])
      setFormularios(fList)
      setPastas(pList)
      setRespostas(rList)
    } catch {
      toast({ title: 'Erro ao carregar formulários', variant: 'destructive' })
    } finally {
      setCarregando(false)
    }
  }

  useEffect(() => {
    carregarDados()
  }, [])

  // Iniciar criação de novo formulário
  const abrirNovoFormulario = () => {
    setFormIdEditando(null)
    setTitulo('')
    setDescricao('')
    setSlug(`formulario-${Date.now().toString(36).slice(-5)}`)
    setPublicado(true)
    setPastaGrupo(pastas[0]?.nome || 'Geral')
    setMensagemSucesso('Obrigado pelas respostas! Entraremos em contato em breve.')
    setCorTema('#0F766E')
    setCampos([
      {
        id: `c_${Date.now()}_1`,
        label: 'Nome Completo',
        tipo: 'texto',
        obrigatorio: true,
        placeholder: 'Seu nome completo',
      },
      {
        id: `c_${Date.now()}_2`,
        label: 'E-mail para Contato',
        tipo: 'email',
        obrigatorio: true,
        placeholder: 'seuemail@exemplo.com',
      },
    ])
    setModalBuilderOpen(true)
  }

  // Abrir formulário existente no construtor
  const abrirEditarFormulario = (f: Formulario) => {
    setFormIdEditando(f.id)
    setTitulo(f.titulo)
    setDescricao(f.descricao || '')
    setSlug(f.slug)
    setPublicado(f.publicado)
    setPastaGrupo(f.pasta_grupo || 'Geral')
    setMensagemSucesso(f.mensagem_sucesso || 'Obrigado pelas respostas!')
    setCorTema(f.cor_tema || '#0F766E')
    setCampos(Array.isArray(f.campos) ? [...f.campos] : [])
    setModalBuilderOpen(true)
  }

  // Gerenciador de campos do formulário
  const adicionarCampo = (tipo: FormCampoTipo = 'texto') => {
    const labelsPorTipo: Record<FormCampoTipo, string> = {
      texto: 'Novo Campo de Texto',
      texto_longo: 'Nova Pergunta Aberta',
      email: 'E-mail de Contato',
      telefone: 'Telefone / WhatsApp',
      data: 'Selecione a Data',
      escolha_unica: 'Selecione uma opção',
      escolha_multipla: 'Marque uma ou mais opções',
    }

    const novoCampo: FormCampoConfig = {
      id: `c_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      label: labelsPorTipo[tipo],
      tipo,
      obrigatorio: false,
      placeholder: '',
      opcoes:
        tipo === 'escolha_unica' || tipo === 'escolha_multipla'
          ? ['Opção 1', 'Opção 2', 'Opção 3']
          : undefined,
    }
    setCampos([...campos, novoCampo])
  }

  const atualizarCampo = (id: string, updates: Partial<FormCampoConfig>) => {
    setCampos(campos.map((c) => (c.id === id ? { ...c, ...updates } : c)))
  }

  const removerCampo = (id: string) => {
    setCampos(campos.filter((c) => c.id !== id))
  }

  // Salvar formulário
  const handleSalvarFormulario = async () => {
    if (!titulo.trim()) {
      toast({ title: 'Informe o título do formulário', variant: 'destructive' })
      return
    }
    if (!slug.trim()) {
      toast({ title: 'Informe o slug da URL pública', variant: 'destructive' })
      return
    }

    setSalvando(true)
    try {
      const payload: Partial<Formulario> = {
        titulo: titulo.trim(),
        descricao: descricao.trim(),
        slug: slug.trim().toLowerCase().replace(/\s+/g, '-'),
        publicado,
        pasta_grupo: pastaGrupo,
        mensagem_sucesso: mensagemSucesso.trim(),
        cor_tema: corTema,
        campos,
      }

      if (formIdEditando) {
        await diamondApi.updateFormulario(formIdEditando, payload)
        toast({ title: 'Formulário atualizado com sucesso!' })
      } else {
        await diamondApi.createFormulario(payload)
        toast({ title: 'Formulário criado e pronto para publicação!' })
      }
      setModalBuilderOpen(false)
      await carregarDados()
      onRecarregarGlobal?.()
    } catch {
      toast({ title: 'Erro ao salvar formulário', variant: 'destructive' })
    } finally {
      setSalvando(false)
    }
  }

  // Duplicar formulário
  const handleDuplicar = async (f: Formulario) => {
    try {
      await diamondApi.duplicarFormulario(f.id)
      toast({ title: `Formulário "${f.titulo}" duplicado com sucesso!` })
      await carregarDados()
    } catch {
      toast({ title: 'Erro ao duplicar formulário', variant: 'destructive' })
    }
  }

  // Remover formulário
  const handleRemover = async (f: Formulario) => {
    if (!confirm(`Deseja realmente remover o formulário "${f.titulo}" e suas respostas?`)) return
    try {
      await diamondApi.deleteFormulario(f.id)
      toast({ title: 'Formulário removido' })
      await carregarDados()
    } catch {
      toast({ title: 'Erro ao remover formulário', variant: 'destructive' })
    }
  }

  // Copiar URL Externa
  const handleCopiarUrlExterna = (f: Formulario) => {
    const urlPublica = `${window.location.origin}/f/${f.slug}`
    navigator.clipboard.writeText(urlPublica)
    toast({
      title: 'URL externa copiada!',
      description: urlPublica,
    })
  }

  // Copiar Iframe
  const handleCopiarIframe = (f: Formulario) => {
    const urlPublica = `${window.location.origin}/f/${f.slug}`
    const snippetIframe = `<iframe src="${urlPublica}" width="100%" height="700" frameborder="0" style="border:0;border-radius:12px;box-shadow:0 10px 25px rgba(0,0,0,0.05);" allowfullscreen></iframe>`
    navigator.clipboard.writeText(snippetIframe)
    toast({
      title: 'Código do iframe copiado!',
      description: 'Pronto para colar em qualquer site, portal ou landing page.',
    })
  }

  // Mover Para...
  const abrirMoverPara = (f: Formulario) => {
    setFormParaMover(f)
    setNovaPastaDestino(f.pasta_grupo || 'Geral')
    setModalMoverOpen(true)
  }

  const handleConfirmarMover = async () => {
    if (!formParaMover) return
    try {
      await diamondApi.updateFormulario(formParaMover.id, {
        pasta_grupo: novaPastaDestino,
      })
      toast({ title: `Formulário movido para "${novaPastaDestino}"` })
      setModalMoverOpen(false)
      await carregarDados()
    } catch {
      toast({ title: 'Erro ao mover formulário', variant: 'destructive' })
    }
  }

  // Visualizar / Exportar Respostas
  const abrirRespostas = async (f: Formulario) => {
    setFormRespostasAtual(f)
    setModalRespostasOpen(true)
    setCarregandoRespostas(true)
    try {
      const resp = await diamondApi.listRespostasFormulario(f.id)
      setRespostasDesteForm(resp)
    } catch {
      toast({ title: 'Erro ao buscar respostas', variant: 'destructive' })
    } finally {
      setCarregandoRespostas(false)
    }
  }

  const handleExcluirResposta = async (respId: string) => {
    if (!confirm('Deseja excluir esta resposta?')) return
    try {
      await diamondApi.deleteRespostaFormulario(respId)
      toast({ title: 'Resposta excluída' })
      setRespostasDesteForm(respostasDesteForm.filter((r) => r.id !== respId))
      await carregarDados()
    } catch {
      toast({ title: 'Erro ao excluir resposta', variant: 'destructive' })
    }
  }

  // Exportar Resposta (CSV)
  const handleExportarRespostasCSV = (f: Formulario, listaRespostas: FormularioResposta[]) => {
    if (listaRespostas.length === 0) {
      toast({ title: 'Nenhuma resposta para exportar', variant: 'destructive' })
      return
    }

    const camposList: FormCampoConfig[] = Array.isArray(f.campos) ? f.campos : []
    const headers = [
      'Data Envio',
      'Identificação',
      'E-mail',
      ...camposList.map((c) => c.label.replace(/"/g, '""')),
    ]

    const linhas = listaRespostas.map((r) => {
      const dadosObj =
        typeof r.dados === 'object' && r.dados !== null ? (r.dados as Record<string, unknown>) : {}
      const colunasDinamicas = camposList.map((c) => {
        const val = dadosObj[c.id]
        if (Array.isArray(val)) {
          return `"${val.join('; ').replace(/"/g, '""')}"`
        }
        return `"${String(val ?? '').replace(/"/g, '""')}"`
      })
      return [
        `"${new Date(r.created).toLocaleString('pt-BR')}"`,
        `"${(r.respondente_identificacao || '').replace(/"/g, '""')}"`,
        `"${(r.respondente_email || '').replace(/"/g, '""')}"`,
        ...colunasDinamicas,
      ].join(',')
    })

    const csvContent = '\uFEFF' + [headers.map((h) => `"${h}"`).join(','), ...linhas].join('\n')
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = `respostas-${f.slug}-${new Date().toISOString().slice(0, 10)}.csv`
    link.click()
    toast({ title: 'Exportação CSV gerada com sucesso!' })
  }

  // Criar nova pasta
  const handleCriarNovaPasta = async () => {
    if (!nomeNovaPasta.trim()) return
    try {
      await diamondApi.createPastaFormulario({
        nome: nomeNovaPasta.trim(),
        cor: corNovaPasta,
      })
      toast({ title: 'Pasta criada com sucesso!' })
      setNomeNovaPasta('')
      setModalNovaPastaOpen(false)
      await carregarDados()
    } catch {
      toast({ title: 'Erro ao criar pasta', variant: 'destructive' })
    }
  }

  const formulariosFiltrados = formularios.filter((f) => {
    const atendeBusca =
      f.titulo.toLowerCase().includes(busca.toLowerCase()) ||
      (f.descricao || '').toLowerCase().includes(busca.toLowerCase()) ||
      f.slug.toLowerCase().includes(busca.toLowerCase())
    const atendePasta = pastaFiltro === 'todas' || f.pasta_grupo === pastaFiltro
    return atendeBusca && atendePasta
  })

  return (
    <div className="space-y-6">
      {/* Topo / Filtros & Ações */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white p-4 rounded-xl border border-[#E5E1D8]">
        <div className="flex items-center gap-2 flex-1 max-w-md">
          <div className="relative w-full">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#5B6470]" />
            <Input
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              placeholder="Buscar formulários..."
              className="pl-9 text-xs border-[#E5E1D8]"
            />
          </div>
          <Select value={pastaFiltro} onValueChange={setPastaFiltro}>
            <SelectTrigger className="w-40 text-xs border-[#E5E1D8]">
              <SelectValue placeholder="Pasta" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todas">Todas as Pastas</SelectItem>
              {pastas.map((p) => (
                <SelectItem key={p.id} value={p.nome}>
                  {p.nome}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={() => setModalNovaPastaOpen(true)}
            className="text-xs border-[#E5E1D8] text-[#1A1D21] gap-1"
          >
            <FolderOpen className="w-3.5 h-3.5 text-[#0F766E]" />
            <span>Nova Pasta</span>
          </Button>
          <Button
            size="sm"
            onClick={abrirNovoFormulario}
            className="bg-[#0F766E] hover:bg-[#0D5C56] text-white text-xs gap-1.5"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Criar Formulário</span>
          </Button>
        </div>
      </div>

      {/* Lista de Formulários */}
      <div className="space-y-3">
        {formulariosFiltrados.map((f) => {
          const totalRespostas = respostas.filter((r) => r.formulario === f.id).length
          const urlExterna = `${window.location.origin}/f/${f.slug}`
          const camposCount = Array.isArray(f.campos) ? f.campos.length : 0

          return (
            <div
              key={f.id}
              className="bg-white border border-[#E5E1D8] rounded-xl p-4 hover:border-[#0F766E]/40 transition-all shadow-2xs space-y-3"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-start gap-3">
                  <div
                    className="w-9 h-9 rounded-lg flex items-center justify-center text-white shrink-0 shadow-2xs"
                    style={{ backgroundColor: f.cor_tema || '#0F766E' }}
                  >
                    <FileText className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-[#1A1D21]">{f.titulo}</span>
                      <Badge
                        variant="outline"
                        className={`text-[10px] ${
                          f.publicado
                            ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                            : 'bg-gray-100 text-[#5B6470]'
                        }`}
                      >
                        {f.publicado ? 'Publicado' : 'Rascunho'}
                      </Badge>
                      {f.pasta_grupo && (
                        <Badge
                          variant="outline"
                          className="text-[10px] bg-[#FAFAF9] text-[#5B6470] border-[#E5E1D8]"
                        >
                          {f.pasta_grupo}
                        </Badge>
                      )}
                    </div>
                    {f.descricao && (
                      <p className="text-[11px] text-[#5B6470] mt-0.5 line-clamp-1">
                        {f.descricao}
                      </p>
                    )}
                    <div className="flex flex-wrap items-center gap-3 text-[11px] text-[#5B6470] mt-1.5">
                      <span className="font-mono text-[#0F766E] text-[10px] bg-[#0F766E]/10 px-1.5 py-0.5 rounded">
                        /f/{f.slug}
                      </span>
                      <span>·</span>
                      <span>{camposCount} campos configurados</span>
                      <span>·</span>
                      <span className="font-semibold text-[#1A1D21]">
                        {totalRespostas}{' '}
                        {totalRespostas === 1 ? 'resposta recebida' : 'respostas recebidas'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Ações principais do formulário: Editar com ícone visível, Duplicar, Mover, Exportar, Excluir */}
                <div className="flex flex-wrap items-center gap-1.5 self-end sm:self-center">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => abrirEditarFormulario(f)}
                    className="text-xs h-7 px-2.5 text-[#0F766E] border-[#0F766E]/40 hover:bg-[#0F766E]/10 gap-1 font-semibold"
                    title="Editar formulário (ícone de editar visível)"
                  >
                    <Pencil className="w-3.5 h-3.5" />
                    <span>Editar</span>
                  </Button>

                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleCopiarUrlExterna(f)}
                    className="text-xs h-7 px-2 text-[#5B6470] border-[#E5E1D8] hover:text-[#1A1D21] gap-1"
                    title="Copiar URL externa do formulário público"
                  >
                    <Copy className="w-3.5 h-3.5 text-[#0F766E]" />
                    <span>Copiar URL</span>
                  </Button>

                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleCopiarIframe(f)}
                    className="text-xs h-7 px-2 text-[#5B6470] border-[#E5E1D8] hover:text-[#1A1D21] gap-1"
                    title="Copiar snippet de incorporação <iframe>"
                  >
                    <Code className="w-3.5 h-3.5" />
                    <span>Iframe</span>
                  </Button>

                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => abrirRespostas(f)}
                    className="text-xs h-7 px-2 text-[#5B6470] border-[#E5E1D8] hover:text-[#1A1D21] gap-1"
                    title="Visualizar e exportar respostas"
                  >
                    <Download className="w-3.5 h-3.5 text-[#0F766E]" />
                    <span>Respostas ({totalRespostas})</span>
                  </Button>

                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleDuplicar(f)}
                    className="text-xs h-7 px-2 text-[#5B6470] border-[#E5E1D8] hover:text-[#1A1D21] gap-1"
                    title="Duplicar formulário"
                  >
                    <Copy className="w-3.5 h-3.5" />
                    <span>Duplicar</span>
                  </Button>

                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => abrirMoverPara(f)}
                    className="text-xs h-7 px-2 text-[#5B6470] border-[#E5E1D8] hover:text-[#1A1D21] gap-1"
                    title="Mover formulário para outra pasta ou categoria"
                  >
                    <FolderInput className="w-3.5 h-3.5" />
                    <span>Mover</span>
                  </Button>

                  <a
                    href={urlExterna}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center justify-center h-7 px-2 text-xs border border-[#E5E1D8] rounded-md text-[#5B6470] hover:text-[#1A1D21] hover:bg-[#FAFAF9]"
                    title="Abrir página pública em nova aba"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>

                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => handleRemover(f)}
                    className="w-7 h-7 text-red-600 hover:bg-red-50"
                    title="Remover formulário"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </div>
            </div>
          )
        })}
        {formulariosFiltrados.length === 0 && !carregando && (
          <div className="p-8 text-center text-xs text-[#5B6470] bg-white border border-[#E5E1D8] rounded-xl">
            Nenhum formulário cadastrado. Clique em "Criar Formulário" para começar.
          </div>
        )}
      </div>

      {/* Modal Construtor de Formulários */}
      <Dialog open={modalBuilderOpen} onOpenChange={setModalBuilderOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto bg-white border-[#E5E1D8]">
          <DialogHeader>
            <DialogTitle className="text-sm font-bold text-[#1A1D21] flex items-center justify-between pr-6">
              <span className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-[#0F766E]" />
                {formIdEditando ? 'Editar Formulário & Campos' : 'Construtor de Formulário'}
              </span>
              <div className="flex items-center gap-2">
                <span className="text-xs font-normal text-[#5B6470]">Publicar online</span>
                <Switch checked={publicado} onCheckedChange={setPublicado} />
              </div>
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {/* Bloco 1: Informações Gerais */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 p-3 bg-[#FAFAF9] rounded-xl border border-[#E5E1D8]">
              <div className="md:col-span-2">
                <label className="text-xs font-semibold text-[#1A1D21] block mb-1">
                  Título do Formulário
                </label>
                <Input
                  value={titulo}
                  onChange={(e) => {
                    setTitulo(e.target.value)
                    if (!formIdEditando) {
                      setSlug(
                        e.target.value
                          .toLowerCase()
                          .normalize('NFD')
                          .replace(/[\u0300-\u036f]/g, '')
                          .replace(/[^a-z0-9]+/g, '-')
                          .replace(/(^-|-$)+/g, ''),
                      )
                    }
                  }}
                  placeholder="Ex: Diagnóstico Estratégico & Briefing Diamond"
                  className="text-xs border-[#E5E1D8]"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-[#1A1D21] block mb-1">
                  Slug da URL Pública (/f/...)
                </label>
                <Input
                  value={slug}
                  onChange={(e) => setSlug(e.target.value)}
                  placeholder="ex: briefing-vip"
                  className="text-xs border-[#E5E1D8] font-mono"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-[#1A1D21] block mb-1">
                  Pasta / Categoria
                </label>
                <Select value={pastaGrupo} onValueChange={setPastaGrupo}>
                  <SelectTrigger className="text-xs border-[#E5E1D8]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {pastas.map((p) => (
                      <SelectItem key={p.id} value={p.nome}>
                        {p.nome}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="md:col-span-2">
                <label className="text-xs font-semibold text-[#1A1D21] block mb-1">
                  Descrição / Instruções aos Respondentes
                </label>
                <Textarea
                  rows={2}
                  value={descricao}
                  onChange={(e) => setDescricao(e.target.value)}
                  placeholder="Ex: Preencha este formulário para que nossa equipe faça a triagem..."
                  className="text-xs border-[#E5E1D8]"
                />
              </div>

              <div className="md:col-span-2 flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                <div className="flex-1">
                  <label className="text-xs font-semibold text-[#1A1D21] block mb-1">
                    Mensagem de Confirmação e Sucesso
                  </label>
                  <Input
                    value={mensagemSucesso}
                    onChange={(e) => setMensagemSucesso(e.target.value)}
                    className="text-xs border-[#E5E1D8]"
                  />
                </div>
                <div className="w-32">
                  <label className="text-xs font-semibold text-[#1A1D21] block mb-1">
                    Cor Tema
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={corTema}
                      onChange={(e) => setCorTema(e.target.value)}
                      className="w-8 h-8 rounded border border-[#E5E1D8] cursor-pointer"
                    />
                    <Input
                      value={corTema}
                      onChange={(e) => setCorTema(e.target.value)}
                      className="text-xs border-[#E5E1D8]"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Bloco 2: Lista de Campos Configuráveis */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-[#1A1D21] uppercase tracking-wider">
                  Campos do Formulário ({campos.length})
                </span>

                {/* Adicionar campo rápido por tipo */}
                <div className="flex flex-wrap items-center gap-1.5">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => adicionarCampo('texto')}
                    className="text-[11px] h-7 px-2 border-[#E5E1D8]"
                  >
                    + Texto
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => adicionarCampo('texto_longo')}
                    className="text-[11px] h-7 px-2 border-[#E5E1D8]"
                  >
                    + Texto Longo
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => adicionarCampo('email')}
                    className="text-[11px] h-7 px-2 border-[#E5E1D8]"
                  >
                    + E-mail
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => adicionarCampo('telefone')}
                    className="text-[11px] h-7 px-2 border-[#E5E1D8]"
                  >
                    + Telefone
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => adicionarCampo('data')}
                    className="text-[11px] h-7 px-2 border-[#E5E1D8]"
                  >
                    + Data
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => adicionarCampo('escolha_unica')}
                    className="text-[11px] h-7 px-2 border-[#E5E1D8]"
                  >
                    + Escolha Única
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => adicionarCampo('escolha_multipla')}
                    className="text-[11px] h-7 px-2 border-[#E5E1D8]"
                  >
                    + Múltipla Escolha
                  </Button>
                </div>
              </div>

              {/* Lista de campos reordenáveis / configuráveis */}
              <div className="space-y-2.5">
                {campos.map((campo, index) => (
                  <div
                    key={campo.id}
                    className="p-3 bg-white border border-[#E5E1D8] rounded-xl space-y-2 relative shadow-2xs hover:border-[#0F766E]/40"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[10px] font-bold text-[#5B6470] uppercase">
                        #{index + 1} · {campo.tipo.replace('_', ' ')}
                      </span>

                      <div className="flex items-center gap-3">
                        <label className="flex items-center gap-1.5 text-xs text-[#1A1D21] cursor-pointer">
                          <input
                            type="checkbox"
                            checked={campo.obrigatorio || false}
                            onChange={(e) =>
                              atualizarCampo(campo.id, { obrigatorio: e.target.checked })
                            }
                            className="rounded border-[#E5E1D8] text-[#0F766E] focus:ring-[#0F766E]"
                          />
                          <span className="text-[11px] font-medium">Obrigatório</span>
                        </label>

                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => removerCampo(campo.id)}
                          className="w-6 h-6 text-red-600 hover:bg-red-50"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <div>
                        <label className="text-[10px] text-[#5B6470] block">
                          Pergunta / Rótulo
                        </label>
                        <Input
                          value={campo.label}
                          onChange={(e) => atualizarCampo(campo.id, { label: e.target.value })}
                          className="text-xs border-[#E5E1D8] h-8"
                          placeholder="Digite o título do campo..."
                        />
                      </div>

                      <div>
                        <label className="text-[10px] text-[#5B6470] block">
                          Placeholder / Dica
                        </label>
                        <Input
                          value={campo.placeholder || ''}
                          onChange={(e) =>
                            atualizarCampo(campo.id, { placeholder: e.target.value })
                          }
                          className="text-xs border-[#E5E1D8] h-8"
                          placeholder="Texto de exemplo no campo..."
                        />
                      </div>
                    </div>

                    {/* Configuração de opções caso escolha única ou múltipla */}
                    {(campo.tipo === 'escolha_unica' || campo.tipo === 'escolha_multipla') && (
                      <div className="pt-1 border-t border-[#E5E1D8]/60">
                        <label className="text-[10px] font-medium text-[#5B6470] block mb-1">
                          Opções de resposta (separadas por ponto e vírgula):
                        </label>
                        <Input
                          value={(campo.opcoes || []).join('; ')}
                          onChange={(e) =>
                            atualizarCampo(campo.id, {
                              opcoes: e.target.value
                                .split(';')
                                .map((s) => s.trim())
                                .filter(Boolean),
                            })
                          }
                          className="text-xs border-[#E5E1D8] h-8"
                          placeholder="Opção 1; Opção 2; Opção 3"
                        />
                      </div>
                    )}
                  </div>
                ))}
                {campos.length === 0 && (
                  <div className="p-6 text-center text-xs text-[#5B6470] bg-[#FAFAF9] border border-dashed border-[#E5E1D8] rounded-xl">
                    Nenhum campo adicionado. Use os botões acima para incluir perguntas ao
                    formulário.
                  </div>
                )}
              </div>
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setModalBuilderOpen(false)}
              className="text-xs border-[#E5E1D8]"
            >
              Cancelar
            </Button>
            <Button
              size="sm"
              disabled={salvando}
              onClick={handleSalvarFormulario}
              className="bg-[#0F766E] hover:bg-[#0D5C56] text-white text-xs gap-1.5"
            >
              <Check className="w-3.5 h-3.5" />
              <span>{salvando ? 'Salvando...' : 'Salvar e Publicar'}</span>
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal Mover Para... */}
      <Dialog open={modalMoverOpen} onOpenChange={setModalMoverOpen}>
        <DialogContent className="max-w-md bg-white border-[#E5E1D8]">
          <DialogHeader>
            <DialogTitle className="text-sm font-bold text-[#1A1D21] flex items-center gap-2">
              <FolderInput className="w-4 h-4 text-[#0F766E]" />
              Mover Formulário: {formParaMover?.titulo}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-3 py-2">
            <label className="text-xs font-semibold text-[#1A1D21] block">
              Selecione a Pasta / Categoria de Destino
            </label>
            <Select value={novaPastaDestino} onValueChange={setNovaPastaDestino}>
              <SelectTrigger className="text-xs border-[#E5E1D8]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {pastas.map((p) => (
                  <SelectItem key={p.id} value={p.nome}>
                    {p.nome}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setModalMoverOpen(false)}
              className="text-xs border-[#E5E1D8]"
            >
              Cancelar
            </Button>
            <Button
              size="sm"
              onClick={handleConfirmarMover}
              className="bg-[#0F766E] hover:bg-[#0D5C56] text-white text-xs gap-1"
            >
              <Check className="w-3.5 h-3.5" />
              <span>Confirmar Transferência</span>
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal Respostas Recebidas */}
      <Dialog open={modalRespostasOpen} onOpenChange={setModalRespostasOpen}>
        <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto bg-white border-[#E5E1D8]">
          <DialogHeader>
            <DialogTitle className="text-sm font-bold text-[#1A1D21] flex items-center justify-between pr-4">
              <span className="flex items-center gap-2">
                <Download className="w-4 h-4 text-[#0F766E]" />
                Respostas: {formRespostasAtual?.titulo}
              </span>

              {formRespostasAtual && (
                <Button
                  size="sm"
                  onClick={() => handleExportarRespostasCSV(formRespostasAtual, respostasDesteForm)}
                  className="bg-[#0F766E] hover:bg-[#0D5C56] text-white text-xs h-7 px-2.5 gap-1.5 font-medium"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Exportar Respostas (CSV)</span>
                </Button>
              )}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-3 py-2">
            {carregandoRespostas ? (
              <div className="p-8 text-center text-xs text-[#5B6470]">Carregando respostas...</div>
            ) : respostasDesteForm.length === 0 ? (
              <div className="p-8 text-center text-xs text-[#5B6470] bg-[#FAFAF9] border border-dashed border-[#E5E1D8] rounded-xl">
                Nenhuma resposta recebida para este formulário ainda.
              </div>
            ) : (
              <div className="space-y-3">
                {respostasDesteForm.map((r) => {
                  const dadosObj =
                    typeof r.dados === 'object' && r.dados !== null
                      ? (r.dados as Record<string, unknown>)
                      : {}
                  const camposList: FormCampoConfig[] = Array.isArray(formRespostasAtual?.campos)
                    ? (formRespostasAtual?.campos as FormCampoConfig[])
                    : []

                  return (
                    <div
                      key={r.id}
                      className="p-3.5 rounded-xl border border-[#E5E1D8] bg-[#FAFAF9] space-y-2 relative"
                    >
                      <div className="flex items-center justify-between border-b border-[#E5E1D8]/60 pb-2">
                        <div className="flex items-center gap-2 text-xs">
                          <span className="font-bold text-[#1A1D21]">
                            {r.respondente_identificacao || 'Respondente Anônimo'}
                          </span>
                          {r.respondente_email && (
                            <span className="text-[#5B6470]">({r.respondente_email})</span>
                          )}
                        </div>

                        <div className="flex items-center gap-2">
                          <span className="text-[10px] text-[#5B6470]">
                            {new Date(r.created).toLocaleString('pt-BR')}
                          </span>
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => handleExcluirResposta(r.id)}
                            className="w-6 h-6 text-red-600 hover:bg-red-50"
                            title="Excluir resposta"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs pt-1">
                        {camposList.map((c) => {
                          const valor = dadosObj[c.id]
                          return (
                            <div
                              key={c.id}
                              className="p-2 rounded bg-white border border-[#E5E1D8]"
                            >
                              <span className="text-[10px] text-[#5B6470] font-semibold block">
                                {c.label}:
                              </span>
                              <span className="text-xs text-[#1A1D21] font-medium block mt-0.5">
                                {Array.isArray(valor)
                                  ? valor.join(', ')
                                  : valor !== undefined && valor !== null && valor !== ''
                                    ? String(valor)
                                    : '—'}
                              </span>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setModalRespostasOpen(false)}
              className="text-xs border-[#E5E1D8]"
            >
              Fechar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal Nova Pasta */}
      <Dialog open={modalNovaPastaOpen} onOpenChange={setModalNovaPastaOpen}>
        <DialogContent className="max-w-md bg-white border-[#E5E1D8]">
          <DialogHeader>
            <DialogTitle className="text-sm font-bold text-[#1A1D21] flex items-center gap-2">
              <FolderOpen className="w-4 h-4 text-[#0F766E]" />
              Nova Pasta de Formulários
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-3 py-2">
            <div>
              <label className="text-xs font-semibold text-[#1A1D21] block mb-1">
                Nome da Pasta
              </label>
              <Input
                value={nomeNovaPasta}
                onChange={(e) => setNomeNovaPasta(e.target.value)}
                placeholder="Ex: Qualificação de Leads, Pesquisa de Satisfação..."
                className="text-xs border-[#E5E1D8]"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-[#1A1D21] block mb-1">Cor</label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={corNovaPasta}
                  onChange={(e) => setCorNovaPasta(e.target.value)}
                  className="w-8 h-8 rounded border border-[#E5E1D8] cursor-pointer"
                />
                <Input
                  value={corNovaPasta}
                  onChange={(e) => setCorNovaPasta(e.target.value)}
                  className="text-xs border-[#E5E1D8] max-w-[120px]"
                />
              </div>
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setModalNovaPastaOpen(false)}
              className="text-xs border-[#E5E1D8]"
            >
              Cancelar
            </Button>
            <Button
              size="sm"
              onClick={handleCriarNovaPasta}
              className="bg-[#0F766E] hover:bg-[#0D5C56] text-white text-xs gap-1"
            >
              <Check className="w-3.5 h-3.5" />
              <span>Criar Pasta</span>
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
