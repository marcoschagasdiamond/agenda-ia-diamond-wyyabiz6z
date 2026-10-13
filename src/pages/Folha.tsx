import React, { useState, useEffect } from 'react'
import { diamondApi } from '@/services/diamondApi'
import type {
  FolhaDia,
  Projeto,
  Contato,
  Negocio,
  OrigemTipo,
  CardStatus,
  CardPrioridade,
  ColunaFluxo,
  MarcoTimeline,
  ProjetoTipo,
} from '@/types'
import {
  FileEdit,
  Sparkles,
  Send,
  Trash2,
  CheckCircle2,
  PhoneCall,
  MessageSquare,
  Mail,
  FileText,
  Clock,
  ArrowRight,
  Loader2,
  Check,
  Plus,
  ArrowUp,
  ArrowDown,
  Layers,
  FolderGit2,
  CalendarDays,
  UserCheck,
  CheckSquare,
  ListPlus,
  AlertCircle,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { useToast } from '@/hooks/use-toast'

export interface ItemRascunhoAssunto {
  idTemp: string
  registro: string
  dataHora: string
  tipoOrigem: OrigemTipo
  origemRef: string
  fluxo: string
  projetoId: string
  timeline: string
  contatoId: string
  negocioId: string
}

const STORAGE_KEY_RASCUNHO = 'agenda_ia_diamond_folha_rascunho_assuntos'

const getAgoraLocalISO = () => {
  const agora = new Date()
  const tzOffset = agora.getTimezoneOffset() * 60000
  return new Date(agora.getTime() - tzOffset).toISOString().slice(0, 16)
}

const criarItemAssuntoVazio = (): ItemRascunhoAssunto => ({
  idTemp: `temp_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
  registro: '',
  dataHora: getAgoraLocalISO(),
  tipoOrigem: 'manual',
  origemRef: '',
  fluxo: 'novo',
  projetoId: 'none',
  timeline: '',
  contatoId: 'none',
  negocioId: 'none',
})

const carregarRascunhoSalvo = (): ItemRascunhoAssunto[] => {
  if (typeof window === 'undefined') return [criarItemAssuntoVazio()]
  try {
    const salvo = localStorage.getItem(STORAGE_KEY_RASCUNHO)
    if (!salvo) return [criarItemAssuntoVazio()]
    const parsed = JSON.parse(salvo)
    if (Array.isArray(parsed) && parsed.length > 0) {
      return parsed.map((item: any, i: number) => ({
        idTemp:
          typeof item?.idTemp === 'string' && item.idTemp ? item.idTemp : `temp_${Date.now()}_${i}`,
        registro: typeof item?.registro === 'string' ? item.registro : '',
        dataHora:
          typeof item?.dataHora === 'string' && item.dataHora ? item.dataHora : getAgoraLocalISO(),
        tipoOrigem: (['manual', 'whatsapp', 'email', 'importado'] as OrigemTipo[]).includes(
          item?.tipoOrigem,
        )
          ? item.tipoOrigem
          : 'manual',
        origemRef: typeof item?.origemRef === 'string' ? item.origemRef : '',
        fluxo: typeof item?.fluxo === 'string' ? item.fluxo : 'novo',
        projetoId: typeof item?.projetoId === 'string' ? item.projetoId : 'none',
        timeline: typeof item?.timeline === 'string' ? item.timeline : '',
        contatoId: typeof item?.contatoId === 'string' ? item.contatoId : 'none',
        negocioId: typeof item?.negocioId === 'string' ? item.negocioId : 'none',
      }))
    }
  } catch (err) {
    console.error('Falha ao ler rascunho da folha do localStorage:', err)
  }
  return [criarItemAssuntoVazio()]
}

export default function Folha() {
  const { toast } = useToast()
  const [folhaItems, setFolhaItems] = useState<FolhaDia[]>([])
  const [projetos, setProjetos] = useState<Projeto[]>([])
  const [contatos, setContatos] = useState<Contato[]>([])
  const [negocios, setNegocios] = useState<Negocio[]>([])
  const [colunasFluxo, setColunasFluxo] = useState<ColunaFluxo[]>([])
  const [marcosTimeline, setMarcosTimeline] = useState<MarcoTimeline[]>([])

  // Estado para saber qual assunto acionou o modal de criação rápida (por idTemp para manter estabilidade)
  const [assuntoAlvoIdTemp, setAssuntoAlvoIdTemp] = useState<string | null>(null)

  // 1. Modal Criar Projeto
  const [modalCriarProjetoOpen, setModalCriarProjetoOpen] = useState(false)
  const [novoProjetoNome, setNovoProjetoNome] = useState('')
  const [novoProjetoTipo, setNovoProjetoTipo] = useState<ProjetoTipo>('cliente')
  const [novoProjetoDescricao, setNovoProjetoDescricao] = useState('')
  const [criandoProjeto, setCriandoProjeto] = useState(false)

  // 2. Modal Criar Contato
  const [modalCriarContatoOpen, setModalCriarContatoOpen] = useState(false)
  const [novoContatoNome, setNovoContatoNome] = useState('')
  const [novoContatoEmpresa, setNovoContatoEmpresa] = useState('')
  const [novoContatoEmail, setNovoContatoEmail] = useState('')
  const [novoContatoTelefone, setNovoContatoTelefone] = useState('')
  const [novoContatoCargo, setNovoContatoCargo] = useState('')
  const [criandoContato, setCriandoContato] = useState(false)

  // 3. Modal Criar Coluna/Etapa de Fluxo
  const [modalCriarFluxoOpen, setModalCriarFluxoOpen] = useState(false)
  const [novoFluxoTitulo, setNovoFluxoTitulo] = useState('')
  const [novoFluxoCor, setNovoFluxoCor] = useState('#0F766E')
  const [criandoFluxo, setCriandoFluxo] = useState(false)

  // 4. Modal Criar Marco de Timeline
  const [modalCriarTimelineOpen, setModalCriarTimelineOpen] = useState(false)
  const [novoTimelineNome, setNovoTimelineNome] = useState('')
  const [novoTimelineDescricao, setNovoTimelineDescricao] = useState('')
  const [criandoTimeline, setCriandoTimeline] = useState(false)

  // Lista de assuntos múltiplos em elaboração na sessão, persistida no localStorage
  const [assuntos, setAssuntos] = useState<ItemRascunhoAssunto[]>(() => carregarRascunhoSalvo())

  const [loadingAdd, setLoadingAdd] = useState(false)

  const [loadingLancarId, setLoadingLancarId] = useState<string | null>(null)

  // Modal para Criar Demanda direta a partir de um assunto
  const [modalDemandaOpen, setModalDemandaOpen] = useState(false)
  const [demandaAssuntoOrigem, setDemandaAssuntoOrigem] = useState<{
    id?: string
    idTemp?: string
    numero: number
    texto: string
    projetoId?: string
    contatoId?: string
    timeline?: string
  } | null>(null)
  const [demandaTitulo, setDemandaTitulo] = useState('')
  const [demandaDescricao, setDemandaDescricao] = useState('')
  const [demandaPrioridade, setDemandaPrioridade] = useState<CardPrioridade>('media')
  const [demandaPrazo, setDemandaPrazo] = useState('')
  const [demandaProjeto, setDemandaProjeto] = useState('none')
  const [demandaContato, setDemandaContato] = useState('none')
  const [demandaTimeline, setDemandaTimeline] = useState('')
  const [criandoDemanda, setCriandoDemanda] = useState(false)

  // Modal de Organizar com IA
  const [organizando, setOrganizando] = useState(false)
  const [modalRevisaoOpen, setModalRevisaoOpen] = useState(false)
  const [sugestoesIA, setSugestoesIA] = useState<{
    cards: Array<{
      folha_id?: string
      titulo: string
      descricao: string
      projeto_id?: string
      negocio_id?: string
      contato_id?: string
      tags: string[]
      prioridade: 'baixa' | 'media' | 'alta' | 'urgente'
      status: 'novo' | 'em_andamento' | 'bloqueado' | 'concluido'
      proximo_passo: string
    }>
    resumo?: {
      feito?: string
      a_fazer?: string
      prioridades?: string
      decisoes?: string
      proximos_passos?: string
    }
    atualizacoes_contexto?: Array<{
      tipo: 'projeto' | 'contato'
      id: string
      novo_contexto: string
    }>
  } | null>(null)
  const [salvandoRevisao, setSalvandoRevisao] = useState(false)

  const carregarDados = async () => {
    try {
      const [f, p, c, n, colunas, marcos] = await Promise.all([
        diamondApi.listFolhaDia(),
        diamondApi.listProjetos(),
        diamondApi.listContatos(),
        diamondApi.listNegocios(),
        diamondApi.listColunasFluxo(),
        diamondApi.listMarcosTimeline(),
      ])
      // Ordenação: pendentes por ordem ou created
      setFolhaItems(f)
      setProjetos(p)
      setContatos(c)
      setNegocios(n)
      setColunasFluxo(colunas)
      setMarcosTimeline(marcos)
    } catch (err) {
      console.error('Erro ao carregar folha:', err)
    }
  }

  useEffect(() => {
    carregarDados()
  }, [])

  // Sincroniza rascunho com o localStorage sempre que os assuntos mudarem
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_RASCUNHO, JSON.stringify(assuntos))
    } catch (err) {
      console.error('Falha ao sincronizar rascunho da folha no localStorage:', err)
    }
  }, [assuntos])

  // Gerenciamento dos múltiplos assuntos da folha
  const handleAdicionarAssunto = () => {
    setAssuntos((prev) => [
      ...prev,
      {
        idTemp: `temp_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        registro: '',
        dataHora: getAgoraLocalISO(),
        tipoOrigem: 'manual',
        origemRef: '',
        fluxo: 'novo',
        projetoId: 'none',
        timeline: '',
        contatoId: 'none',
        negocioId: 'none',
      },
    ])
  }

  const handleRemoverAssuntoPorId = (idTemp: string) => {
    if (assuntos.length <= 1) {
      // Limpa o único assunto existente em vez de deixar vazio
      setAssuntos([criarItemAssuntoVazio()])
      return
    }
    setAssuntos((prev) => prev.filter((a) => a.idTemp !== idTemp))
  }

  const handleRemoverAssunto = (idx: number) => {
    const item = assuntos[idx]
    if (item?.idTemp) {
      handleRemoverAssuntoPorId(item.idTemp)
    } else {
      if (assuntos.length <= 1) {
        setAssuntos([criarItemAssuntoVazio()])
        return
      }
      setAssuntos((prev) => prev.filter((_, i) => i !== idx))
    }
  }

  const handleLimparTodosAssuntos = () => {
    const temConteudo = assuntos.some((a) => a.registro.trim().length > 0)
    if (temConteudo) {
      const confirma = window.confirm(
        'Tem certeza que deseja apagar todos os assuntos digitados nesta folha?',
      )
      if (!confirma) return
    }
    setAssuntos([criarItemAssuntoVazio()])
    toast({ title: 'Rascunho da folha limpo com sucesso' })
  }

  const handleMoverAssunto = (idx: number, direcao: 'cima' | 'baixo') => {
    const destino = direcao === 'cima' ? idx - 1 : idx + 1
    if (destino < 0 || destino >= assuntos.length) return

    setAssuntos((prev) => {
      const copia = [...prev]
      const temp = copia[idx]
      copia[idx] = copia[destino]
      copia[destino] = temp
      return copia
    })
  }

  const handleMoverAssuntoPorId = (idTemp: string, direcao: 'cima' | 'baixo') => {
    const idx = assuntos.findIndex((a) => a.idTemp === idTemp)
    if (idx === -1) return
    handleMoverAssunto(idx, direcao)
  }

  const handleAtualizarAssunto = (idx: number, campo: keyof ItemRascunhoAssunto, valor: any) => {
    setAssuntos((prev) => {
      const copia = [...prev]
      copia[idx] = { ...copia[idx], [campo]: valor }
      return copia
    })
  }

  const handleAtualizarAssuntoPorId = (
    idTemp: string,
    campo: keyof ItemRascunhoAssunto,
    valor: any,
  ) => {
    setAssuntos((prev) =>
      prev.map((item) => (item.idTemp === idTemp ? { ...item, [campo]: valor } : item)),
    )
  }

  // Handlers para criação rápida a partir dos seletores
  const handleAbrirCriarProjeto = (idTemp: string) => {
    setAssuntoAlvoIdTemp(idTemp)
    setNovoProjetoNome('')
    setNovoProjetoTipo('cliente')
    setNovoProjetoDescricao('')
    setModalCriarProjetoOpen(true)
  }

  const handleSubmeterCriarProjeto = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!novoProjetoNome.trim()) return
    setCriandoProjeto(true)
    try {
      const pasta = await diamondApi
        .createPasta({ nome: `${novoProjetoNome.trim()} - Arquivos` })
        .catch(() => null)

      const criado = await diamondApi.createProjeto({
        nome: novoProjetoNome.trim(),
        tipo: novoProjetoTipo,
        status: 'ativo',
        descricao: novoProjetoDescricao.trim() || undefined,
        pasta_raiz: pasta?.id,
      })

      toast({
        title: 'Projeto criado com sucesso!',
        description: `Projeto "${criado.nome}" agora está disponível e vinculado.`,
      })

      // Atualiza lista de projetos
      setProjetos((prev) => [criado, ...prev])

      // Auto-seleciona no assunto que disparou ou no modal de demanda
      if (assuntoAlvoIdTemp !== null) {
        handleAtualizarAssuntoPorId(assuntoAlvoIdTemp, 'projetoId', criado.id)
      } else {
        setDemandaProjeto(criado.id)
      }

      setModalCriarProjetoOpen(false)
    } catch (err) {
      toast({
        title: 'Erro ao criar projeto',
        description: (err as Error)?.message,
        variant: 'destructive',
      })
    } finally {
      setCriandoProjeto(false)
    }
  }

  const handleAbrirCriarContato = (idTemp: string) => {
    setAssuntoAlvoIdTemp(idTemp)
    setNovoContatoNome('')
    setNovoContatoEmpresa('')
    setNovoContatoEmail('')
    setNovoContatoTelefone('')
    setNovoContatoCargo('')
    setModalCriarContatoOpen(true)
  }

  const handleSubmeterCriarContato = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!novoContatoNome.trim()) return
    setCriandoContato(true)
    try {
      const currentAssunto =
        assuntoAlvoIdTemp !== null ? assuntos.find((a) => a.idTemp === assuntoAlvoIdTemp) : null
      const projId =
        currentAssunto && currentAssunto.projetoId !== 'none' ? currentAssunto.projetoId : undefined

      const criado = await diamondApi.createContato({
        nome: novoContatoNome.trim(),
        empresa: novoContatoEmpresa.trim() || undefined,
        email: novoContatoEmail.trim() || undefined,
        telefone: novoContatoTelefone.trim() || undefined,
        cargo: novoContatoCargo.trim() || undefined,
        origem: currentAssunto?.tipoOrigem || 'manual',
        projetos: projId ? [projId] : [],
      })

      toast({
        title: 'Contato criado com sucesso!',
        description: `Contato "${criado.nome}" agora está disponível e vinculado.`,
      })

      setContatos((prev) => [criado, ...prev])

      if (assuntoAlvoIdTemp !== null) {
        handleAtualizarAssuntoPorId(assuntoAlvoIdTemp, 'contatoId', criado.id)
      } else {
        setDemandaContato(criado.id)
      }

      setModalCriarContatoOpen(false)
    } catch (err) {
      toast({
        title: 'Erro ao criar contato',
        description: (err as Error)?.message,
        variant: 'destructive',
      })
    } finally {
      setCriandoContato(false)
    }
  }

  const handleAbrirCriarFluxo = (idTemp: string) => {
    setAssuntoAlvoIdTemp(idTemp)
    setNovoFluxoTitulo('')
    setNovoFluxoCor('#0F766E')
    setModalCriarFluxoOpen(true)
  }

  const handleSubmeterCriarFluxo = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!novoFluxoTitulo.trim()) return
    setCriandoFluxo(true)
    try {
      const chaveSlug =
        novoFluxoTitulo
          .trim()
          .toLowerCase()
          .normalize('NFD')
          .replace(/[\u0300-\u036f]/g, '')
          .replace(/[^a-z0-9]+/g, '_')
          .replace(/^_+|_+$/g, '') || `fluxo_${Date.now()}`

      const novaColuna = await diamondApi.createColunaFluxo({
        chave: chaveSlug,
        titulo: novoFluxoTitulo.trim(),
        cor: novoFluxoCor,
        ordem: colunasFluxo.length + 1,
      })

      toast({
        title: 'Coluna de fluxo criada com sucesso!',
        description: `Etapa "${novaColuna.titulo}" adicionada ao fluxo Kanban e selecionada.`,
      })

      setColunasFluxo((prev) => [...prev, novaColuna])

      if (assuntoAlvoIdTemp !== null) {
        handleAtualizarAssuntoPorId(assuntoAlvoIdTemp, 'fluxo', novaColuna.chave)
      }

      setModalCriarFluxoOpen(false)
    } catch (err) {
      toast({
        title: 'Erro ao criar fluxo',
        description: (err as Error)?.message,
        variant: 'destructive',
      })
    } finally {
      setCriandoFluxo(false)
    }
  }

  const handleAbrirCriarTimeline = (idTemp: string) => {
    setAssuntoAlvoIdTemp(idTemp)
    setNovoTimelineNome('')
    setNovoTimelineDescricao('')
    setModalCriarTimelineOpen(true)
  }

  const handleSubmeterCriarTimeline = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!novoTimelineNome.trim()) return
    setCriandoTimeline(true)
    try {
      const currentAssunto =
        assuntoAlvoIdTemp !== null ? assuntos.find((a) => a.idTemp === assuntoAlvoIdTemp) : null
      const projId =
        currentAssunto && currentAssunto.projetoId !== 'none' ? currentAssunto.projetoId : undefined

      const novoMarco = await diamondApi.createMarcoTimeline({
        nome: novoTimelineNome.trim(),
        descricao: novoTimelineDescricao.trim() || undefined,
        projeto: projId,
      })

      toast({
        title: 'Marco de timeline criado com sucesso!',
        description: `Marco "${novoMarco.nome}" adicionado e selecionado no assunto.`,
      })

      setMarcosTimeline((prev) => [novoMarco, ...prev])

      if (assuntoAlvoIdTemp !== null) {
        handleAtualizarAssuntoPorId(assuntoAlvoIdTemp, 'timeline', novoMarco.nome)
      } else {
        setDemandaTimeline(novoMarco.nome)
      }

      setModalCriarTimelineOpen(false)
    } catch (err) {
      toast({
        title: 'Erro ao criar marco',
        description: (err as Error)?.message,
        variant: 'destructive',
      })
    } finally {
      setCriandoTimeline(false)
    }
  }

  // Lançamento individual de um assunto do rascunho
  const handleLancarAssuntoIndividual = async (idTemp: string) => {
    const item = assuntos.find((a) => a.idTemp === idTemp)
    if (!item || !item.registro.trim()) {
      toast({
        title: 'Assunto sem texto',
        description: 'Digite o conteúdo do assunto antes de lançá-lo.',
        variant: 'destructive',
      })
      return
    }

    setLoadingLancarId(idTemp)
    try {
      const pendentesAtuais = folhaItems.filter((i) => i.status === 'pendente')
      const proximaOrdem = pendentesAtuais.length > 0 ? pendentesAtuais.length + 1 : 1

      const dataPart = item.dataHora
        ? item.dataHora.split('T')[0]
        : new Date().toISOString().split('T')[0]

      await diamondApi.createFolhaDia({
        data: dataPart,
        data_hora: item.dataHora || undefined,
        ordem: proximaOrdem,
        registro: item.registro.trim(),
        tipo_origem: item.tipoOrigem,
        origem_ref: item.origemRef.trim() || undefined,
        status: 'pendente',
        fluxo: item.fluxo !== 'none' ? item.fluxo : undefined,
        projeto: item.projetoId !== 'none' ? item.projetoId : undefined,
        timeline: item.timeline.trim() || undefined,
        contato: item.contatoId !== 'none' ? item.contatoId : undefined,
        negocio: item.negocioId !== 'none' ? item.negocioId : undefined,
      })

      // Remove este assunto lançado do rascunho mantendo os demais
      setAssuntos((prev) => {
        const restantes = prev.filter((a) => a.idTemp !== idTemp)
        return restantes.length > 0 ? restantes : [criarItemAssuntoVazio()]
      })

      toast({
        title: 'Assunto lançado com sucesso!',
        description: 'O assunto foi registrado na Folha do Dia e removido do rascunho.',
      })

      await carregarDados()
    } catch (err) {
      toast({
        title: 'Erro ao lançar assunto',
        description: (err as Error)?.message || 'Tente novamente.',
        variant: 'destructive',
      })
    } finally {
      setLoadingLancarId(null)
    }
  }

  // Lançamento dos múltiplos assuntos salvando na coleção folha_dia
  const handleLancarTodosAssuntos = async (e: React.FormEvent) => {
    e.preventDefault()

    const validos = assuntos.filter((a) => a.registro.trim().length > 0)
    if (validos.length === 0) {
      toast({
        title: 'Folha vazia',
        description: 'Digite o conteúdo de pelo menos um assunto para lançar na folha.',
        variant: 'destructive',
      })
      return
    }

    setLoadingAdd(true)
    try {
      const pendentesAtuais = folhaItems.filter((i) => i.status === 'pendente')
      let proximaOrdem = pendentesAtuais.length > 0 ? pendentesAtuais.length + 1 : 1

      for (const item of validos) {
        const dataPart = item.dataHora
          ? item.dataHora.split('T')[0]
          : new Date().toISOString().split('T')[0]

        await diamondApi.createFolhaDia({
          data: dataPart,
          data_hora: item.dataHora || undefined,
          ordem: proximaOrdem++,
          registro: item.registro.trim(),
          tipo_origem: item.tipoOrigem,
          origem_ref: item.origemRef.trim() || undefined,
          status: 'pendente',
          fluxo: item.fluxo !== 'none' ? item.fluxo : undefined,
          projeto: item.projetoId !== 'none' ? item.projetoId : undefined,
          timeline: item.timeline.trim() || undefined,
          contato: item.contatoId !== 'none' ? item.contatoId : undefined,
          negocio: item.negocioId !== 'none' ? item.negocioId : undefined,
        })
      }

      // Reinicia formulário com 1 assunto limpo (o useEffect sincronizará com o localStorage)
      setAssuntos([criarItemAssuntoVazio()])

      toast({
        title: `${validos.length} ${validos.length === 1 ? 'assunto capturado' : 'assuntos capturados'}!`,
        description: 'Os assuntos foram numerados e registrados na Folha do Dia.',
      })

      await carregarDados()
    } catch (err) {
      toast({
        title: 'Erro ao lançar assuntos',
        description: (err as Error)?.message || 'Tente novamente.',
        variant: 'destructive',
      })
    } finally {
      setLoadingAdd(false)
    }
  }

  // Exclusão de registro da folha já salvo
  const handleExcluirRegistro = async (id: string) => {
    try {
      await diamondApi.deleteFolhaDia(id)
      toast({ title: 'Assunto removido da folha' })
      setFolhaItems((prev) => prev.filter((item) => item.id !== id))
    } catch (err) {
      toast({ title: 'Erro ao remover', variant: 'destructive' })
    }
  }

  // Reordenação de assuntos já persistidos
  const handleReordenarPersistido = async (idx: number, direcao: 'cima' | 'baixo') => {
    const pendentes = folhaItems.filter((i) => i.status === 'pendente')
    const destino = direcao === 'cima' ? idx - 1 : idx + 1
    if (destino < 0 || destino >= pendentes.length) return

    const itemA = pendentes[idx]
    const itemB = pendentes[destino]

    const ordemA = itemA.ordem || idx + 1
    const ordemB = itemB.ordem || destino + 1

    try {
      // Troca ordem
      await Promise.all([
        diamondApi.updateFolhaDia(itemA.id, { ordem: ordemB }),
        diamondApi.updateFolhaDia(itemB.id, { ordem: ordemA }),
      ])
      await carregarDados()
    } catch (err) {
      toast({ title: 'Erro ao reordenar', variant: 'destructive' })
    }
  }

  // Modal para Criar Demanda a partir de um assunto (rascunho ou já persistido)
  const handleAbrirCriarDemanda = (dados: {
    id?: string
    idTemp?: string
    numero: number
    texto: string
    projetoId?: string
    contatoId?: string
    timeline?: string
  }) => {
    setDemandaAssuntoOrigem(dados)
    // Título inteligente: primeira linha ou primeiras palavras
    const primeiraLinha = dados.texto.split('\n')[0].trim()
    const tituloSugerido =
      primeiraLinha.length > 60
        ? primeiraLinha.slice(0, 57) + '...'
        : primeiraLinha || `Demanda do Assunto ${dados.numero}`

    setDemandaTitulo(tituloSugerido)
    setDemandaDescricao(dados.texto)
    setDemandaPrioridade('media')
    setDemandaPrazo('')
    setDemandaProjeto(dados.projetoId && dados.projetoId !== 'none' ? dados.projetoId : 'none')
    setDemandaContato(dados.contatoId && dados.contatoId !== 'none' ? dados.contatoId : 'none')
    setDemandaTimeline(dados.timeline || '')
    setModalDemandaOpen(true)
  }

  // Abertura de modais de criação a partir do modal de Demanda
  const handleAbrirCriarProjetoEmDemanda = () => {
    setAssuntoAlvoIdTemp(null)
    setNovoProjetoNome('')
    setNovoProjetoTipo('cliente')
    setNovoProjetoDescricao('')
    setModalCriarProjetoOpen(true)
  }

  const handleAbrirCriarContatoEmDemanda = () => {
    setAssuntoAlvoIdTemp(null)
    setNovoContatoNome('')
    setNovoContatoEmpresa('')
    setNovoContatoEmail('')
    setNovoContatoTelefone('')
    setNovoContatoCargo('')
    setModalCriarContatoOpen(true)
  }

  const handleAbrirCriarTimelineEmDemanda = () => {
    setAssuntoAlvoIdTemp(null)
    setNovoTimelineNome('')
    setNovoTimelineDescricao('')
    setModalCriarTimelineOpen(true)
  }

  const handleConfirmarCriarDemanda = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!demandaTitulo.trim()) return

    setCriandoDemanda(true)
    try {
      await diamondApi.createDemanda({
        titulo: demandaTitulo.trim(),
        descricao: demandaDescricao.trim() || undefined,
        status: 'pendente',
        prazo: demandaPrazo || undefined,
        projeto: demandaProjeto !== 'none' ? demandaProjeto : undefined,
        contato: demandaContato !== 'none' ? demandaContato : undefined,
        prioridade: demandaPrioridade,
        timeline: demandaTimeline.trim() || undefined,
      })

      // Se a demanda veio de um assunto do rascunho (em elaboração), remove o assunto do rascunho
      if (demandaAssuntoOrigem?.idTemp) {
        setAssuntos((prev) => {
          const restantes = prev.filter((a) => a.idTemp !== demandaAssuntoOrigem.idTemp)
          return restantes.length > 0 ? restantes : [criarItemAssuntoVazio()]
        })
      }

      toast({
        title: 'Demanda criada com sucesso!',
        description: `Demanda vinculada ao assunto ${demandaAssuntoOrigem?.numero || ''} salva na lista de demandas.`,
      })

      setModalDemandaOpen(false)
    } catch (err) {
      toast({
        title: 'Erro ao criar demanda',
        description: (err as Error)?.message || 'Não foi possível gerar a demanda.',
        variant: 'destructive',
      })
    } finally {
      setCriandoDemanda(false)
    }
  }

  // Organização com IA
  const handleOrganizarComIA = async () => {
    const pendentes = folhaItems.filter((f) => f.status === 'pendente')
    if (pendentes.length === 0) {
      toast({
        title: 'Nenhum assunto pendente',
        description: 'Lance os assuntos na folha antes de organizar com a IA.',
      })
      return
    }

    setOrganizando(true)
    try {
      const resultado = await diamondApi.organizarFolha()
      setSugestoesIA(resultado)
      setModalRevisaoOpen(true)
    } catch (err) {
      toast({
        title: 'Falha na IA',
        description: (err as Error)?.message || 'Não foi possível organizar agora.',
        variant: 'destructive',
      })
    } finally {
      setOrganizando(false)
    }
  }

  const handleAprovarESalvar = async () => {
    if (!sugestoesIA) return
    setSalvandoRevisao(true)
    try {
      const hoje = new Date().toISOString().split('T')[0]

      // 1. Criar os cards aprovados
      if (sugestoesIA.cards && sugestoesIA.cards.length > 0) {
        for (const card of sugestoesIA.cards) {
          await diamondApi.createCard({
            titulo: card.titulo,
            descricao: card.descricao,
            projeto: card.projeto_id || undefined,
            negocio: card.negocio_id || undefined,
            contato: card.contato_id || undefined,
            tags: card.tags,
            prioridade: card.prioridade,
            status: card.status,
            proximo_passo: card.proximo_passo,
            criado_por_ia: true,
          })
        }
      }

      // 2. Salvar resumo do dia
      if (sugestoesIA.resumo) {
        await diamondApi.createResumo({
          data: hoje,
          feito: sugestoesIA.resumo.feito || '',
          a_fazer: sugestoesIA.resumo.a_fazer || '',
          prioridades: sugestoesIA.resumo.prioridades || '',
          decisoes: sugestoesIA.resumo.decisoes || '',
          proximos_passos: sugestoesIA.resumo.proximos_passos || '',
          contagem_cards_criados: sugestoesIA.cards?.length || 0,
        })
      }

      // 3. Atualizar contexto histórico de projetos e contatos
      if (sugestoesIA.atualizacoes_contexto) {
        for (const act of sugestoesIA.atualizacoes_contexto) {
          if (act.tipo === 'projeto' && act.id) {
            await diamondApi
              .updateProjeto(act.id, { contexto_resumido: act.novo_contexto })
              .catch(() => {})
          } else if (act.tipo === 'contato' && act.id) {
            await diamondApi
              .updateContato(act.id, { contexto_resumido: act.novo_contexto })
              .catch(() => {})
          }
        }
      }

      // 4. Marcar os registros da folha como processados
      const pendentes = folhaItems.filter((f) => f.status === 'pendente')
      for (const f of pendentes) {
        await diamondApi.updateFolhaDia(f.id, { status: 'processado' })
      }

      toast({
        title: 'Sessão finalizada e organizada com sucesso!',
        description: 'Cards inseridos no Kanban e Resumo do Dia gravado na memória.',
      })

      // Limpa o rascunho em elaboração caso o usuário tenha lançado tudo
      setAssuntos([criarItemAssuntoVazio()])

      setModalRevisaoOpen(false)
      await carregarDados()
    } catch (err) {
      toast({
        title: 'Erro ao consolidar',
        description: (err as Error)?.message || 'Erro ao salvar alterações.',
        variant: 'destructive',
      })
    } finally {
      setSalvandoRevisao(false)
    }
  }

  const pendentes = folhaItems.filter((item) => item.status === 'pendente')
  const processados = folhaItems.filter((item) => item.status === 'processado')

  const getOrigemIcon = (tipo?: OrigemTipo) => {
    switch (tipo) {
      case 'whatsapp':
        return <MessageSquare className="w-3.5 h-3.5 text-emerald-600" />
      case 'email':
        return <Mail className="w-3.5 h-3.5 text-blue-600" />
      case 'importado':
        return <FileText className="w-3.5 h-3.5 text-purple-600" />
      default:
        return <PhoneCall className="w-3.5 h-3.5 text-amber-600" />
    }
  }

  const getFluxoBadge = (fluxoChave?: string) => {
    if (!fluxoChave) return null
    const colFound = colunasFluxo.find((c) => c.chave === fluxoChave)
    if (colFound) {
      return (
        <Badge
          className="border-none text-[10px] font-medium text-white"
          style={{ backgroundColor: colFound.cor || '#0F766E' }}
        >
          {colFound.titulo}
        </Badge>
      )
    }
    switch (fluxoChave) {
      case 'em_andamento':
        return (
          <Badge className="bg-[#0F766E]/15 text-[#0F766E] border-none text-[10px] font-medium">
            Em Andamento
          </Badge>
        )
      case 'bloqueado':
        return (
          <Badge className="bg-red-100 text-red-700 border-none text-[10px] font-medium">
            Bloqueado
          </Badge>
        )
      case 'concluido':
        return (
          <Badge className="bg-emerald-100 text-emerald-700 border-none text-[10px] font-medium">
            Concluído
          </Badge>
        )
      case 'novo':
      default:
        return (
          <Badge className="bg-gray-100 text-gray-700 border-none text-[10px] font-medium">
            {fluxoChave.replace('_', ' ')}
          </Badge>
        )
    }
  }

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-12">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-xl border border-[#E5E1D8] shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl md:text-2xl font-bold tracking-tight text-[#1A1D21]">
              Folha em Branco do Dia
            </h1>
            <Badge className="bg-[#0F766E]/10 text-[#0F766E] border-none text-[11px] font-semibold">
              Captura Multi-Assuntos
            </Badge>
          </div>
          <p className="text-xs text-[#5B6470] mt-1">
            Lance assuntos de diversas áreas com data, hora e vínculos personalizados (fluxo,
            projeto, timeline e contatos) ou crie demandas imediatas.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            onClick={handleOrganizarComIA}
            disabled={organizando || pendentes.length === 0}
            className="bg-[#0F766E] hover:bg-[#0D5C56] text-white text-xs h-9 px-4 font-medium shadow-sm gap-2"
          >
            {organizando ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Organizando com IA...
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                Organizar com IA & Finalizar Sessão
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Formulário de Múltiplos Assuntos da Folha */}
      <Card className="border-[#E5E1D8] bg-white shadow-xs">
        <CardHeader className="pb-3 border-b border-[#E5E1D8]/60">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-semibold text-[#1A1D21] flex items-center gap-2">
              <FileEdit className="w-4 h-4 text-[#0F766E]" />
              Folha do Dia: Lançamento de Assuntos por Área
            </CardTitle>
            <span className="text-xs font-medium text-[#0F766E] bg-[#0F766E]/10 px-2.5 py-1 rounded-full">
              {assuntos.length} {assuntos.length === 1 ? 'assunto' : 'assuntos'} na folha
            </span>
          </div>
          <CardDescription className="text-xs text-[#5B6470]">
            Escreva como vier: ligações, conversas, prazos. A agenda separa por negócio, pessoa e
            tarefa, e você confirma.
          </CardDescription>
        </CardHeader>

        <form onSubmit={handleLancarTodosAssuntos}>
          <CardContent className="space-y-5 pt-4">
            {/* Texto de orientação preservado visível */}
            <div className="rounded-lg bg-[#0F766E]/5 border border-[#0F766E]/20 p-3 text-xs text-[#0D5C56] leading-relaxed flex items-start gap-2.5">
              <Sparkles className="w-4 h-4 text-[#0F766E] shrink-0 mt-0.5" />
              <span>
                Escreva como vier: ligações, conversas, prazos. A agenda separa por negócio, pessoa
                e tarefa, e você confirma.
              </span>
            </div>

            {/* Lista dos Assuntos Numerados */}
            <div className="space-y-4">
              {assuntos.map((item, idx) => {
                const numeroAssunto = idx + 1
                return (
                  <div
                    key={item.idTemp}
                    className="p-4 rounded-xl border border-[#E5E1D8] bg-[#FAFAF9] space-y-3 relative hover:border-[#0F766E]/40 transition-colors"
                  >
                    {/* Cabeçalho do Assunto com Numeração e Controles */}
                    <div className="flex items-center justify-between gap-2 border-b border-[#E5E1D8]/70 pb-2.5">
                      <div className="flex items-center gap-2">
                        <span className="flex items-center justify-center w-6 h-6 rounded-full bg-[#0F766E] text-white text-xs font-bold shadow-2xs">
                          {numeroAssunto}
                        </span>
                        <span className="text-xs font-bold text-[#1A1D21]">
                          Assunto {numeroAssunto}
                        </span>
                      </div>

                      <div className="flex items-center gap-1">
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          disabled={idx === 0}
                          onClick={() => handleMoverAssuntoPorId(item.idTemp, 'cima')}
                          className="h-7 w-7 p-0 text-[#5B6470] hover:text-[#1A1D21]"
                          title="Subir assunto"
                        >
                          <ArrowUp className="w-3.5 h-3.5" />
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          disabled={idx === assuntos.length - 1}
                          onClick={() => handleMoverAssuntoPorId(item.idTemp, 'baixo')}
                          className="h-7 w-7 p-0 text-[#5B6470] hover:text-[#1A1D21]"
                          title="Descer assunto"
                        >
                          <ArrowDown className="w-3.5 h-3.5" />
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() =>
                            handleAbrirCriarDemanda({
                              idTemp: item.idTemp,
                              numero: numeroAssunto,
                              texto: item.registro,
                              projetoId: item.projetoId,
                              contatoId: item.contatoId,
                              timeline: item.timeline,
                            })
                          }
                          disabled={!item.registro.trim()}
                          className="h-7 px-2 text-[11px] font-medium text-[#0F766E] hover:bg-[#0F766E]/10 gap-1"
                          title="Criar demanda imediata a partir deste assunto"
                        >
                          <CheckSquare className="w-3.5 h-3.5" />
                          <span className="hidden sm:inline">Criar demanda</span>
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          disabled={!item.registro.trim() || loadingLancarId === item.idTemp}
                          onClick={() => handleLancarAssuntoIndividual(item.idTemp)}
                          className="h-7 px-2 text-[11px] font-medium text-[#0F766E] hover:bg-[#0F766E]/10 gap-1"
                          title="Lançar somente este assunto na folha"
                        >
                          {loadingLancarId === item.idTemp ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <Send className="w-3 h-3" />
                          )}
                          <span className="hidden sm:inline">Lançar</span>
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => handleRemoverAssuntoPorId(item.idTemp)}
                          className="h-7 w-7 p-0 text-[#5B6470] hover:text-red-600"
                          title="Remover este assunto"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </div>

                    {/* Campo de Texto do Assunto */}
                    <div>
                      <Textarea
                        rows={2}
                        placeholder="Escreva como vier: ligações, conversas, prazos. A agenda separa por negócio, pessoa e tarefa, e você confirma."
                        value={item.registro}
                        onChange={(e) =>
                          handleAtualizarAssuntoPorId(item.idTemp, 'registro', e.target.value)
                        }
                        className="text-sm bg-white border-[#E5E1D8] resize-none focus-visible:ring-1 focus-visible:ring-[#0F766E]"
                      />
                    </div>

                    {/* Linha 1: Data e hora + Origem + Referência */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div>
                        <label className="text-[11px] font-semibold text-[#5B6470] block mb-1">
                          Data e hora
                        </label>
                        <Input
                          type="datetime-local"
                          value={item.dataHora}
                          onChange={(e) =>
                            handleAtualizarAssuntoPorId(item.idTemp, 'dataHora', e.target.value)
                          }
                          className="text-xs h-8 bg-white border-[#E5E1D8]"
                        />
                      </div>

                      <div>
                        <label className="text-[11px] font-semibold text-[#5B6470] block mb-1">
                          Origem do Registro
                        </label>
                        <Select
                          value={item.tipoOrigem}
                          onValueChange={(v) =>
                            handleAtualizarAssuntoPorId(item.idTemp, 'tipoOrigem', v as OrigemTipo)
                          }
                        >
                          <SelectTrigger className="text-xs h-8 bg-white border-[#E5E1D8]">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="manual">Manual / Anotação</SelectItem>
                            <SelectItem value="whatsapp">WhatsApp</SelectItem>
                            <SelectItem value="email">E-mail</SelectItem>
                            <SelectItem value="importado">Importado / Outro</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div>
                        <label className="text-[11px] font-semibold text-[#5B6470] block mb-1">
                          Referência (Opcional)
                        </label>
                        <Input
                          placeholder="Ex: Grupo Diretoria / Ligação 14h"
                          value={item.origemRef}
                          onChange={(e) =>
                            handleAtualizarAssuntoPorId(item.idTemp, 'origemRef', e.target.value)
                          }
                          className="text-xs h-8 bg-white border-[#E5E1D8]"
                        />
                      </div>
                    </div>

                    {/* Linha 2: Vínculos Opcionais (Fluxo, Projeto, Timeline, Contato) */}
                    <div className="pt-2 border-t border-[#E5E1D8]/50">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-[#0F766E] block mb-2">
                        Vínculos do Assunto (Opcionais)
                      </span>
                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
                        {/* 1. Vincular a Fluxo */}
                        <div>
                          <div className="flex items-center justify-between mb-1">
                            <label className="text-[11px] font-semibold text-[#5B6470] flex items-center gap-1">
                              <Layers className="w-3 h-3 text-[#0F766E]" />
                              Vincular a Fluxo
                            </label>
                            <button
                              type="button"
                              onClick={() => handleAbrirCriarFluxo(item.idTemp)}
                              className="text-[10px] font-medium text-[#0F766E] hover:underline flex items-center gap-0.5"
                              title="Adicionar nova etapa/coluna de fluxo"
                            >
                              <Plus className="w-3 h-3" />
                              Criar
                            </button>
                          </div>
                          <Select
                            value={item.fluxo}
                            onValueChange={(v) => {
                              if (v === '__create_new__') {
                                handleAbrirCriarFluxo(item.idTemp)
                              } else {
                                handleAtualizarAssuntoPorId(item.idTemp, 'fluxo', v)
                              }
                            }}
                          >
                            <SelectTrigger className="text-xs h-8 bg-white border-[#E5E1D8]">
                              <SelectValue placeholder="Automático (IA)" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem
                                value="__create_new__"
                                className="text-[#0F766E] font-semibold bg-[#0F766E]/5 hover:bg-[#0F766E]/15 focus:bg-[#0F766E]/15 cursor-pointer border-b border-[#E5E1D8] mb-1"
                              >
                                + Criar nova coluna / fluxo...
                              </SelectItem>
                              <SelectItem value="none">Automático (Deixar para IA)</SelectItem>
                              {colunasFluxo.map((col) => (
                                <SelectItem key={col.id || col.chave} value={col.chave}>
                                  <span className="flex items-center gap-1.5">
                                    <span
                                      className="w-2 h-2 rounded-full shrink-0"
                                      style={{ backgroundColor: col.cor || '#0F766E' }}
                                    />
                                    {col.titulo}
                                  </span>
                                </SelectItem>
                              ))}
                              {/* Fallbacks padrão se não estiverem na lista */}
                              {!colunasFluxo.some((c) => c.chave === 'novo') && (
                                <SelectItem value="novo">Novo / Triagem</SelectItem>
                              )}
                              {!colunasFluxo.some((c) => c.chave === 'em_andamento') && (
                                <SelectItem value="em_andamento">Em Andamento</SelectItem>
                              )}
                              {!colunasFluxo.some((c) => c.chave === 'bloqueado') && (
                                <SelectItem value="bloqueado">Bloqueado</SelectItem>
                              )}
                              {!colunasFluxo.some((c) => c.chave === 'concluido') && (
                                <SelectItem value="concluido">Concluído</SelectItem>
                              )}
                            </SelectContent>
                          </Select>
                        </div>

                        {/* 2. Vincular a Projeto */}
                        <div>
                          <div className="flex items-center justify-between mb-1">
                            <label className="text-[11px] font-semibold text-[#5B6470] flex items-center gap-1">
                              <FolderGit2 className="w-3 h-3 text-[#0F766E]" />
                              Vincular a Projeto
                            </label>
                            <button
                              type="button"
                              onClick={() => handleAbrirCriarProjeto(item.idTemp)}
                              className="text-[10px] font-medium text-[#0F766E] hover:underline flex items-center gap-0.5"
                              title="Cadastrar novo projeto imediatamente"
                            >
                              <Plus className="w-3 h-3" />
                              Criar
                            </button>
                          </div>
                          <Select
                            value={item.projetoId}
                            onValueChange={(v) => {
                              if (v === '__create_new__') {
                                handleAbrirCriarProjeto(item.idTemp)
                              } else {
                                handleAtualizarAssuntoPorId(item.idTemp, 'projetoId', v)
                              }
                            }}
                          >
                            <SelectTrigger className="text-xs h-8 bg-white border-[#E5E1D8]">
                              <SelectValue placeholder="Automático (IA)" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem
                                value="__create_new__"
                                className="text-[#0F766E] font-semibold bg-[#0F766E]/5 hover:bg-[#0F766E]/15 focus:bg-[#0F766E]/15 cursor-pointer border-b border-[#E5E1D8] mb-1"
                              >
                                + Criar novo projeto...
                              </SelectItem>
                              <SelectItem value="none">Automático (Deixar para IA)</SelectItem>
                              {projetos.map((p) => (
                                <SelectItem key={p.id} value={p.id}>
                                  {p.nome}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>

                        {/* 3. Vincular a Timeline */}
                        <div>
                          <div className="flex items-center justify-between mb-1">
                            <label className="text-[11px] font-semibold text-[#5B6470] flex items-center gap-1">
                              <CalendarDays className="w-3 h-3 text-[#0F766E]" />
                              Vincular a Timeline
                            </label>
                            <button
                              type="button"
                              onClick={() => handleAbrirCriarTimeline(item.idTemp)}
                              className="text-[10px] font-medium text-[#0F766E] hover:underline flex items-center gap-0.5"
                              title="Criar novo marco de timeline"
                            >
                              <Plus className="w-3 h-3" />
                              Criar
                            </button>
                          </div>
                          <Select
                            value={item.timeline || '__empty__'}
                            onValueChange={(v) => {
                              if (v === '__create_new__') {
                                handleAbrirCriarTimeline(item.idTemp)
                              } else if (v === '__empty__') {
                                handleAtualizarAssuntoPorId(item.idTemp, 'timeline', '')
                              } else {
                                handleAtualizarAssuntoPorId(item.idTemp, 'timeline', v)
                              }
                            }}
                          >
                            <SelectTrigger className="text-xs h-8 bg-white border-[#E5E1D8]">
                              <SelectValue placeholder="Selecione ou crie um marco" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem
                                value="__create_new__"
                                className="text-[#0F766E] font-semibold bg-[#0F766E]/5 hover:bg-[#0F766E]/15 focus:bg-[#0F766E]/15 cursor-pointer border-b border-[#E5E1D8] mb-1"
                              >
                                + Criar novo marco de timeline...
                              </SelectItem>
                              <SelectItem value="__empty__">Nenhum (Livre)</SelectItem>
                              {marcosTimeline.map((m) => (
                                <SelectItem key={m.id} value={m.nome}>
                                  ⏳ {m.nome}
                                </SelectItem>
                              ))}
                              {/* Se o usuário digitou ou tem um valor customizado que não está na lista de marcos */}
                              {item.timeline &&
                                !marcosTimeline.some((m) => m.nome === item.timeline) && (
                                  <SelectItem value={item.timeline}>
                                    ⏳ {item.timeline} (Personalizado)
                                  </SelectItem>
                                )}
                            </SelectContent>
                          </Select>
                        </div>

                        {/* 4. Vincular a Contato */}
                        <div>
                          <div className="flex items-center justify-between mb-1">
                            <label className="text-[11px] font-semibold text-[#5B6470] flex items-center gap-1">
                              <UserCheck className="w-3 h-3 text-[#0F766E]" />
                              Vincular a Contato
                            </label>
                            <button
                              type="button"
                              onClick={() => handleAbrirCriarContato(item.idTemp)}
                              className="text-[10px] font-medium text-[#0F766E] hover:underline flex items-center gap-0.5"
                              title="Cadastrar novo contato imediatamente"
                            >
                              <Plus className="w-3 h-3" />
                              Criar
                            </button>
                          </div>
                          <Select
                            value={item.contatoId}
                            onValueChange={(v) => {
                              if (v === '__create_new__') {
                                handleAbrirCriarContato(item.idTemp)
                              } else {
                                handleAtualizarAssuntoPorId(item.idTemp, 'contatoId', v)
                              }
                            }}
                          >
                            <SelectTrigger className="text-xs h-8 bg-white border-[#E5E1D8]">
                              <SelectValue placeholder="Automático (IA)" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem
                                value="__create_new__"
                                className="text-[#0F766E] font-semibold bg-[#0F766E]/5 hover:bg-[#0F766E]/15 focus:bg-[#0F766E]/15 cursor-pointer border-b border-[#E5E1D8] mb-1"
                              >
                                + Criar novo contato...
                              </SelectItem>
                              <SelectItem value="none">Automático (Deixar para IA)</SelectItem>
                              {contatos.map((c) => (
                                <SelectItem key={c.id} value={c.id}>
                                  {c.nome} {c.empresa ? `(${c.empresa})` : ''}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>

            {/* Barra de Ações: Adicionar mais assuntos e Lançar tudo */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-3 border-t border-[#E5E1D8]">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleAdicionarAssunto}
                className="text-xs h-9 text-[#0F766E] border-[#0F766E]/30 hover:bg-[#0F766E]/10 gap-1.5 w-full sm:w-auto"
              >
                <Plus className="w-4 h-4" />
                Adicionar Outro Assunto à Folha
              </Button>

              <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={handleLimparTodosAssuntos}
                  className="text-xs h-9 text-[#5B6470] hover:text-red-600 gap-1.5"
                  title="Apagar todos os assuntos digitados"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  Limpar Rascunho
                </Button>
                <Button
                  type="submit"
                  disabled={loadingAdd}
                  className="bg-[#0F766E] hover:bg-[#0D5C56] text-white text-xs h-9 px-5 font-medium shadow-sm gap-2 w-full sm:w-auto"
                >
                  <Send className="w-3.5 h-3.5" />
                  {loadingAdd
                    ? 'Lançando na Folha...'
                    : `Lançar ${assuntos.length} ${assuntos.length === 1 ? 'Assunto' : 'Assuntos'} na Folha`}
                </Button>
              </div>
            </div>
          </CardContent>
        </form>
      </Card>

      {/* Listagem de Assuntos Pendentes na Folha */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-semibold text-[#1A1D21] flex items-center gap-2">
              <Clock className="w-4 h-4 text-[#D97706]" />
              Assuntos Pendentes de Organização ({pendentes.length})
            </h2>
          </div>
          <span className="text-xs text-[#5B6470]">
            Numerados por ordem de captura • Prontos para IA ou criação de demandas
          </span>
        </div>

        {pendentes.length === 0 ? (
          <div className="bg-white border border-[#E5E1D8] rounded-xl p-8 text-center text-xs text-[#5B6470] space-y-2">
            <p className="font-medium text-[#1A1D21]">Folha em branco limpa.</p>
            <p className="text-[#0D5C56] max-w-md mx-auto">
              Escreva como vier: ligações, conversas, prazos. A agenda separa por negócio, pessoa e
              tarefa, e você confirma.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
            {pendentes.map((item, idx) => {
              const numeroDisplay = item.ordem || idx + 1
              return (
                <div
                  key={item.id}
                  className="p-4 rounded-xl border border-[#E5E1D8] bg-white hover:border-[#0F766E]/40 transition-all shadow-2xs flex flex-col justify-between space-y-3"
                >
                  <div>
                    {/* Header do card com numeração, data e controles */}
                    <div className="flex items-center justify-between gap-2 mb-2 pb-2 border-b border-[#E5E1D8]/60">
                      <div className="flex items-center gap-2">
                        <span className="flex items-center justify-center w-5 h-5 rounded-full bg-[#0F766E]/15 text-[#0F766E] text-[11px] font-bold">
                          {numeroDisplay}
                        </span>
                        <div className="flex items-center gap-1.5 text-[11px] text-[#5B6470]">
                          {getOrigemIcon(item.tipo_origem)}
                          <span className="capitalize font-medium">{item.tipo_origem}</span>
                          {item.origem_ref && <span>• {item.origem_ref}</span>}
                        </div>
                      </div>

                      <div className="flex items-center gap-1">
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          disabled={idx === 0}
                          onClick={() => handleReordenarPersistido(idx, 'cima')}
                          className="h-6 w-6 p-0 text-[#5B6470] hover:text-[#1A1D21]"
                          title="Subir ordem"
                        >
                          <ArrowUp className="w-3 h-3" />
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          disabled={idx === pendentes.length - 1}
                          onClick={() => handleReordenarPersistido(idx, 'baixo')}
                          className="h-6 w-6 p-0 text-[#5B6470] hover:text-[#1A1D21]"
                          title="Descer ordem"
                        >
                          <ArrowDown className="w-3 h-3" />
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => handleExcluirRegistro(item.id)}
                          className="h-6 w-6 p-0 text-[#5B6470] hover:text-red-600"
                          title="Excluir assunto"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </div>

                    {/* Data e Hora do Assunto */}
                    <div className="flex items-center gap-1.5 text-[11px] text-[#0F766E] font-medium mb-1.5">
                      <Clock className="w-3 h-3" />
                      <span>
                        Data e hora:{' '}
                        {item.data_hora
                          ? item.data_hora.replace('T', ' ')
                          : item.data || item.created?.slice(0, 16).replace('T', ' ')}
                      </span>
                    </div>

                    {/* Conteúdo do Assunto */}
                    <p className="text-xs text-[#1A1D21] whitespace-pre-wrap leading-relaxed">
                      {item.registro}
                    </p>
                  </div>

                  {/* Vínculos e Ação Criar Demanda */}
                  <div className="pt-2 border-t border-[#E5E1D8]/60 space-y-2">
                    <div className="flex flex-wrap items-center gap-1.5 text-[10px] text-[#5B6470]">
                      {item.fluxo && getFluxoBadge(item.fluxo)}
                      {(item.expand?.projeto ||
                        (item.projeto && projetos.find((p) => p.id === item.projeto))) && (
                        <span className="bg-[#F4F2EE] px-2 py-0.5 rounded font-medium truncate max-w-[140px]">
                          📁{' '}
                          {item.expand?.projeto?.nome ||
                            projetos.find((p) => p.id === item.projeto)?.nome}
                        </span>
                      )}
                      {(item.expand?.contato ||
                        (item.contato && contatos.find((c) => c.id === item.contato))) && (
                        <span className="bg-[#F4F2EE] px-2 py-0.5 rounded font-medium truncate max-w-[140px]">
                          👤{' '}
                          {item.expand?.contato?.nome ||
                            contatos.find((c) => c.id === item.contato)?.nome}
                        </span>
                      )}
                      {item.timeline && (
                        <span className="bg-amber-50 text-amber-800 border border-amber-200 px-1.5 py-0.5 rounded truncate max-w-[120px]">
                          ⏳ {item.timeline}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center justify-between pt-1">
                      <span className="text-[10px] text-[#5B6470]">
                        Salvo em {item.created?.slice(11, 16)}
                      </span>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() =>
                          handleAbrirCriarDemanda({
                            id: item.id,
                            numero: numeroDisplay,
                            texto: item.registro,
                            projetoId: item.projeto,
                            contatoId: item.contato,
                            timeline: item.timeline,
                          })
                        }
                        className="h-6 px-2 text-[11px] text-[#0F766E] border-[#0F766E]/30 hover:bg-[#0F766E]/10 gap-1"
                      >
                        <CheckSquare className="w-3 h-3" />
                        Criar demanda
                      </Button>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* Histórico Recente de Processados */}
        {processados.length > 0 && (
          <div className="pt-6">
            <h3 className="text-xs font-semibold text-[#5B6470] uppercase tracking-wider mb-2">
              Assuntos Processados Recentemente ({processados.length})
            </h3>
            <div className="space-y-1.5">
              {processados.slice(0, 5).map((item) => (
                <div
                  key={item.id}
                  className="p-2.5 rounded-lg bg-white/60 border border-[#E5E1D8] text-xs text-[#5B6470] flex items-center justify-between opacity-80"
                >
                  <div className="truncate pr-4 flex items-center gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                    <span className="font-semibold text-[#1A1D21] text-[11px]">
                      {item.ordem ? `#${item.ordem}` : ''}
                    </span>
                    <span className="truncate">{item.registro}</span>
                  </div>
                  <span className="text-[10px] shrink-0 text-[#5B6470]">
                    {item.data_hora
                      ? item.data_hora.replace('T', ' ')
                      : item.data || item.created?.slice(0, 10)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Modal Criar Demanda a Partir do Assunto */}
      <Dialog open={modalDemandaOpen} onOpenChange={setModalDemandaOpen}>
        <DialogContent className="max-w-xl bg-white border border-[#E5E1D8]">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-[#1A1D21] flex items-center gap-2">
              <CheckSquare className="w-4 h-4 text-[#0F766E]" />
              Criar Demanda a partir do Assunto {demandaAssuntoOrigem?.numero || ''}
            </DialogTitle>
            <DialogDescription className="text-xs text-[#5B6470]">
              Gere imediatamente uma demanda com vínculos herdados deste assunto, sem precisar rodar
              a organização da IA.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleConfirmarCriarDemanda} className="space-y-3.5 pt-2">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-[#1A1D21]">Título da Demanda *</label>
              <Input
                required
                placeholder="Ex: Entregar proposta comercial revisada"
                value={demandaTitulo}
                onChange={(e) => setDemandaTitulo(e.target.value)}
                className="text-xs border-[#E5E1D8]"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-[#1A1D21]">Descrição / Contexto</label>
              <Textarea
                rows={3}
                placeholder="Detalhes da demanda..."
                value={demandaDescricao}
                onChange={(e) => setDemandaDescricao(e.target.value)}
                className="text-xs border-[#E5E1D8]"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-[#5B6470]">Prioridade</label>
                <Select
                  value={demandaPrioridade}
                  onValueChange={(v) => setDemandaPrioridade(v as CardPrioridade)}
                >
                  <SelectTrigger className="text-xs border-[#E5E1D8]">
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

              <div className="space-y-1">
                <label className="text-xs font-semibold text-[#5B6470]">Prazo Limite</label>
                <Input
                  type="date"
                  value={demandaPrazo}
                  onChange={(e) => setDemandaPrazo(e.target.value)}
                  className="text-xs border-[#E5E1D8]"
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-[#5B6470]">Vínculo: Projeto</label>
                  <button
                    type="button"
                    onClick={handleAbrirCriarProjetoEmDemanda}
                    className="text-[10px] text-[#0F766E] hover:underline flex items-center gap-0.5"
                  >
                    <Plus className="w-3 h-3" />
                    Criar
                  </button>
                </div>
                <Select
                  value={demandaProjeto}
                  onValueChange={(v) => {
                    if (v === '__create_new__') {
                      handleAbrirCriarProjetoEmDemanda()
                    } else {
                      setDemandaProjeto(v)
                    }
                  }}
                >
                  <SelectTrigger className="text-xs border-[#E5E1D8]">
                    <SelectValue placeholder="Nenhum" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem
                      value="__create_new__"
                      className="text-[#0F766E] font-semibold bg-[#0F766E]/5 hover:bg-[#0F766E]/15 cursor-pointer border-b border-[#E5E1D8] mb-1"
                    >
                      + Criar novo projeto...
                    </SelectItem>
                    <SelectItem value="none">Nenhum</SelectItem>
                    {projetos.map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.nome}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-[#5B6470]">Vínculo: Contato</label>
                  <button
                    type="button"
                    onClick={handleAbrirCriarContatoEmDemanda}
                    className="text-[10px] text-[#0F766E] hover:underline flex items-center gap-0.5"
                  >
                    <Plus className="w-3 h-3" />
                    Criar
                  </button>
                </div>
                <Select
                  value={demandaContato}
                  onValueChange={(v) => {
                    if (v === '__create_new__') {
                      handleAbrirCriarContatoEmDemanda()
                    } else {
                      setDemandaContato(v)
                    }
                  }}
                >
                  <SelectTrigger className="text-xs border-[#E5E1D8]">
                    <SelectValue placeholder="Nenhum" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem
                      value="__create_new__"
                      className="text-[#0F766E] font-semibold bg-[#0F766E]/5 hover:bg-[#0F766E]/15 cursor-pointer border-b border-[#E5E1D8] mb-1"
                    >
                      + Criar novo contato...
                    </SelectItem>
                    <SelectItem value="none">Nenhum</SelectItem>
                    {contatos.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.nome}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-[#5B6470]">Timeline</label>
                  <button
                    type="button"
                    onClick={handleAbrirCriarTimelineEmDemanda}
                    className="text-[10px] text-[#0F766E] hover:underline flex items-center gap-0.5"
                  >
                    <Plus className="w-3 h-3" />
                    Criar
                  </button>
                </div>
                <Select
                  value={demandaTimeline || '__empty__'}
                  onValueChange={(v) => {
                    if (v === '__create_new__') {
                      handleAbrirCriarTimelineEmDemanda()
                    } else if (v === '__empty__') {
                      setDemandaTimeline('')
                    } else {
                      setDemandaTimeline(v)
                    }
                  }}
                >
                  <SelectTrigger className="text-xs border-[#E5E1D8]">
                    <SelectValue placeholder="Selecione marco" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem
                      value="__create_new__"
                      className="text-[#0F766E] font-semibold bg-[#0F766E]/5 hover:bg-[#0F766E]/15 cursor-pointer border-b border-[#E5E1D8] mb-1"
                    >
                      + Criar novo marco...
                    </SelectItem>
                    <SelectItem value="__empty__">Nenhum</SelectItem>
                    {marcosTimeline.map((m) => (
                      <SelectItem key={m.id} value={m.nome}>
                        ⏳ {m.nome}
                      </SelectItem>
                    ))}
                    {demandaTimeline && !marcosTimeline.some((m) => m.nome === demandaTimeline) && (
                      <SelectItem value={demandaTimeline}>
                        ⏳ {demandaTimeline} (Personalizado)
                      </SelectItem>
                    )}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <DialogFooter className="flex justify-end gap-2 pt-3 border-t border-[#E5E1D8]">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setModalDemandaOpen(false)}
                className="text-xs"
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={criandoDemanda}
                className="bg-[#0F766E] hover:bg-[#0D5C56] text-white text-xs px-4"
              >
                {criandoDemanda ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" />
                    Criando...
                  </>
                ) : (
                  <>
                    <Check className="w-3.5 h-3.5 mr-1.5" />
                    Confirmar Demanda
                  </>
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Modal 1: Criar Novo Projeto Rapidamente */}
      <Dialog open={modalCriarProjetoOpen} onOpenChange={setModalCriarProjetoOpen}>
        <DialogContent className="max-w-md bg-white border border-[#E5E1D8]">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-[#1A1D21] flex items-center gap-2">
              <FolderGit2 className="w-4 h-4 text-[#0F766E]" />
              Criar Novo Projeto
            </DialogTitle>
            <DialogDescription className="text-xs text-[#5B6470]">
              Cadastre o projeto sem sair da Folha. Ele será automaticamente vinculado ao assunto
              atual.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmeterCriarProjeto} className="space-y-3.5 pt-2">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-[#1A1D21]">Nome do Projeto *</label>
              <Input
                required
                autoFocus
                placeholder="Ex: Campanha Q3, Reformulação Web..."
                value={novoProjetoNome}
                onChange={(e) => setNovoProjetoNome(e.target.value)}
                className="text-xs border-[#E5E1D8]"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-[#5B6470]">Tipo de Projeto</label>
              <Select
                value={novoProjetoTipo}
                onValueChange={(v) => setNovoProjetoTipo(v as ProjetoTipo)}
              >
                <SelectTrigger className="text-xs border-[#E5E1D8]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="cliente">Cliente</SelectItem>
                  <SelectItem value="interno">Interno</SelectItem>
                  <SelectItem value="parceria">Parceria</SelectItem>
                  <SelectItem value="outro">Outro</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-[#5B6470]">Descrição / Objetivo</label>
              <Textarea
                rows={2}
                placeholder="Breve descrição do projeto..."
                value={novoProjetoDescricao}
                onChange={(e) => setNovoProjetoDescricao(e.target.value)}
                className="text-xs border-[#E5E1D8]"
              />
            </div>

            <DialogFooter className="flex justify-end gap-2 pt-3 border-t border-[#E5E1D8]">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setModalCriarProjetoOpen(false)}
                className="text-xs"
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={criandoProjeto || !novoProjetoNome.trim()}
                className="bg-[#0F766E] hover:bg-[#0D5C56] text-white text-xs px-4"
              >
                {criandoProjeto ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" />
                    Salvando...
                  </>
                ) : (
                  <>
                    <Plus className="w-3.5 h-3.5 mr-1.5" />
                    Criar & Selecionar
                  </>
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Modal 2: Criar Novo Contato Rapidamente */}
      <Dialog open={modalCriarContatoOpen} onOpenChange={setModalCriarContatoOpen}>
        <DialogContent className="max-w-md bg-white border border-[#E5E1D8]">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-[#1A1D21] flex items-center gap-2">
              <UserCheck className="w-4 h-4 text-[#0F766E]" />
              Criar Novo Contato
            </DialogTitle>
            <DialogDescription className="text-xs text-[#5B6470]">
              Cadastre o contato e vincule-o imediatamente a este assunto da folha.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmeterCriarContato} className="space-y-3 pt-2">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-[#1A1D21]">Nome Completo *</label>
              <Input
                required
                autoFocus
                placeholder="Ex: Dra. Mariana Silva"
                value={novoContatoNome}
                onChange={(e) => setNovoContatoNome(e.target.value)}
                className="text-xs border-[#E5E1D8]"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-[#5B6470]">
                  Empresa / Organização
                </label>
                <Input
                  placeholder="Ex: Grupo Diamond"
                  value={novoContatoEmpresa}
                  onChange={(e) => setNovoContatoEmpresa(e.target.value)}
                  className="text-xs border-[#E5E1D8]"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-[#5B6470]">Cargo / Função</label>
                <Input
                  placeholder="Ex: Diretora de Operações"
                  value={novoContatoCargo}
                  onChange={(e) => setNovoContatoCargo(e.target.value)}
                  className="text-xs border-[#E5E1D8]"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-[#5B6470]">E-mail</label>
                <Input
                  type="email"
                  placeholder="contato@empresa.com"
                  value={novoContatoEmail}
                  onChange={(e) => setNovoContatoEmail(e.target.value)}
                  className="text-xs border-[#E5E1D8]"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-[#5B6470]">Telefone / WhatsApp</label>
                <Input
                  placeholder="(11) 99999-9999"
                  value={novoContatoTelefone}
                  onChange={(e) => setNovoContatoTelefone(e.target.value)}
                  className="text-xs border-[#E5E1D8]"
                />
              </div>
            </div>

            <DialogFooter className="flex justify-end gap-2 pt-3 border-t border-[#E5E1D8]">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setModalCriarContatoOpen(false)}
                className="text-xs"
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={criandoContato || !novoContatoNome.trim()}
                className="bg-[#0F766E] hover:bg-[#0D5C56] text-white text-xs px-4"
              >
                {criandoContato ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" />
                    Salvando...
                  </>
                ) : (
                  <>
                    <Plus className="w-3.5 h-3.5 mr-1.5" />
                    Criar & Selecionar
                  </>
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Modal 3: Criar Nova Etapa/Coluna de Fluxo */}
      <Dialog open={modalCriarFluxoOpen} onOpenChange={setModalCriarFluxoOpen}>
        <DialogContent className="max-w-sm bg-white border border-[#E5E1D8]">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-[#1A1D21] flex items-center gap-2">
              <Layers className="w-4 h-4 text-[#0F766E]" />
              Nova Etapa / Coluna de Fluxo
            </DialogTitle>
            <DialogDescription className="text-xs text-[#5B6470]">
              Adicione uma nova coluna ao fluxo Kanban e vincule a este assunto.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmeterCriarFluxo} className="space-y-3.5 pt-2">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-[#1A1D21]">Nome da Etapa *</label>
              <Input
                required
                autoFocus
                placeholder="Ex: Em Revisão, Validação Cliente, Aguardando Financeiro..."
                value={novoFluxoTitulo}
                onChange={(e) => setNovoFluxoTitulo(e.target.value)}
                className="text-xs border-[#E5E1D8]"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-[#5B6470]">Cor do Identificador</label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={novoFluxoCor}
                  onChange={(e) => setNovoFluxoCor(e.target.value)}
                  className="w-8 h-8 rounded border border-[#E5E1D8] cursor-pointer p-0.5 bg-white"
                />
                <div className="flex gap-1.5">
                  {[
                    '#0F766E',
                    '#0284C7',
                    '#8B5CF6',
                    '#F59E0B',
                    '#DC2626',
                    '#16A34A',
                    '#5B6470',
                  ].map((cor) => (
                    <button
                      key={cor}
                      type="button"
                      onClick={() => setNovoFluxoCor(cor)}
                      className={`w-6 h-6 rounded-full border ${
                        novoFluxoCor === cor
                          ? 'border-2 border-black scale-110'
                          : 'border-transparent'
                      }`}
                      style={{ backgroundColor: cor }}
                    />
                  ))}
                </div>
              </div>
            </div>

            <DialogFooter className="flex justify-end gap-2 pt-3 border-t border-[#E5E1D8]">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setModalCriarFluxoOpen(false)}
                className="text-xs"
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={criandoFluxo || !novoFluxoTitulo.trim()}
                className="bg-[#0F766E] hover:bg-[#0D5C56] text-white text-xs px-4"
              >
                {criandoFluxo ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" />
                    Salvando...
                  </>
                ) : (
                  <>
                    <Plus className="w-3.5 h-3.5 mr-1.5" />
                    Criar & Selecionar
                  </>
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Modal 4: Criar Novo Marco de Timeline */}
      <Dialog open={modalCriarTimelineOpen} onOpenChange={setModalCriarTimelineOpen}>
        <DialogContent className="max-w-sm bg-white border border-[#E5E1D8]">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-[#1A1D21] flex items-center gap-2">
              <CalendarDays className="w-4 h-4 text-[#0F766E]" />
              Novo Marco de Timeline
            </DialogTitle>
            <DialogDescription className="text-xs text-[#5B6470]">
              Crie um marco, sprint ou etapa de entrega para associar ao assunto.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmeterCriarTimeline} className="space-y-3.5 pt-2">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-[#1A1D21]">Nome do Marco *</label>
              <Input
                required
                autoFocus
                placeholder="Ex: Sprint 2 / Entrega de Protótipo"
                value={novoTimelineNome}
                onChange={(e) => setNovoTimelineNome(e.target.value)}
                className="text-xs border-[#E5E1D8]"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-[#5B6470]">Descrição / Observação</label>
              <Textarea
                rows={2}
                placeholder="Opcional: objetivo desta etapa ou marco..."
                value={novoTimelineDescricao}
                onChange={(e) => setNovoTimelineDescricao(e.target.value)}
                className="text-xs border-[#E5E1D8]"
              />
            </div>

            <DialogFooter className="flex justify-end gap-2 pt-3 border-t border-[#E5E1D8]">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setModalCriarTimelineOpen(false)}
                className="text-xs"
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={criandoTimeline || !novoTimelineNome.trim()}
                className="bg-[#0F766E] hover:bg-[#0D5C56] text-white text-xs px-4"
              >
                {criandoTimeline ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" />
                    Salvando...
                  </>
                ) : (
                  <>
                    <Plus className="w-3.5 h-3.5 mr-1.5" />
                    Criar & Selecionar
                  </>
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Modal de Revisão e Aprovação da IA */}
      <Dialog open={modalRevisaoOpen} onOpenChange={setModalRevisaoOpen}>
        <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto bg-white border border-[#E5E1D8]">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-[#1A1D21] flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-[#0F766E]" />
              Revisão de Sugestões da IA Diamond
            </DialogTitle>
            <DialogDescription className="text-xs text-[#5B6470]">
              Revise os cards gerados e a síntese executiva antes de gravar no sistema e consolidar
              a memória.
            </DialogDescription>
          </DialogHeader>

          {sugestoesIA && (
            <div className="space-y-5 pt-2">
              {/* Cards Sugeridos */}
              <div>
                <h4 className="text-xs font-bold text-[#1A1D21] uppercase tracking-wider mb-2 flex items-center justify-between">
                  <span>Cards Sugeridos para o Kanban ({sugestoesIA.cards?.length || 0})</span>
                  <span className="text-[11px] text-[#0F766E] normal-case font-medium">
                    Você poderá editar no Kanban
                  </span>
                </h4>
                <div className="space-y-2.5 max-h-[260px] overflow-y-auto pr-1">
                  {sugestoesIA.cards?.map((card, idx) => (
                    <div
                      key={idx}
                      className="p-3 rounded-lg border border-[#E5E1D8] bg-[#F4F2EE]/40 text-xs space-y-1.5"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-bold text-[#1A1D21]">{card.titulo}</span>
                        <div className="flex items-center gap-1.5">
                          <Badge variant="outline" className="text-[10px] capitalize">
                            {card.status.replace('_', ' ')}
                          </Badge>
                          <Badge className="text-[10px] bg-[#0F766E] text-white">
                            {card.prioridade}
                          </Badge>
                        </div>
                      </div>
                      <p className="text-[#5B6470]">{card.descricao}</p>
                      {card.proximo_passo && (
                        <p className="text-[#0F766E] font-medium flex items-center gap-1">
                          <ArrowRight className="w-3 h-3" />
                          Próximo passo: {card.proximo_passo}
                        </p>
                      )}
                      {card.tags && card.tags.length > 0 && (
                        <div className="flex flex-wrap gap-1 pt-1">
                          {card.tags.map((t, i) => (
                            <span
                              key={i}
                              className="text-[9px] bg-white border border-[#E5E1D8] px-1.5 py-0.5 rounded text-[#5B6470]"
                            >
                              #{t}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Resumo do Dia Sugerido */}
              {sugestoesIA.resumo && (
                <div className="border-t border-[#E5E1D8] pt-3 space-y-2 text-xs">
                  <h4 className="font-bold text-[#1A1D21] uppercase tracking-wider text-[11px]">
                    Síntese Executiva Gerada
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                    <div className="bg-[#F4F2EE]/50 p-2.5 rounded border border-[#E5E1D8]">
                      <span className="font-semibold block text-[11px] mb-1">🎯 Prioridades:</span>
                      <p className="text-[#5B6470] whitespace-pre-line">
                        {sugestoesIA.resumo.prioridades}
                      </p>
                    </div>
                    <div className="bg-[#F4F2EE]/50 p-2.5 rounded border border-[#E5E1D8]">
                      <span className="font-semibold block text-[11px] mb-1">💡 Decisões:</span>
                      <p className="text-[#5B6470] whitespace-pre-line">
                        {sugestoesIA.resumo.decisoes}
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          <DialogFooter className="flex justify-between items-center pt-4 border-t border-[#E5E1D8]">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setModalRevisaoOpen(false)}
              className="text-xs"
            >
              Cancelar
            </Button>
            <Button
              type="button"
              size="sm"
              disabled={salvandoRevisao}
              onClick={handleAprovarESalvar}
              className="bg-[#0F766E] hover:bg-[#0D5C56] text-white text-xs px-4"
            >
              {salvandoRevisao ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" />
                  Salvando Fluxo...
                </>
              ) : (
                <>
                  <Check className="w-3.5 h-3.5 mr-1.5" />
                  Aprovar & Salvar no Sistema
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
