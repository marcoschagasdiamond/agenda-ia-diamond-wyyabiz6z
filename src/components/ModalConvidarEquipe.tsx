import React, { useState, useEffect } from 'react'
import { diamondApi } from '@/services/diamondApi'
import { useAuth } from '@/hooks/use-auth'
import { useNavegacao } from '@/contexts/NavegacaoContext'
import type { EscopoTipo, NivelAcesso } from '@/types'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useToast } from '@/hooks/use-toast'
import {
  Users,
  Mail,
  Send,
  Shield,
  FolderKanban,
  KanbanSquare,
  Layers,
  UserCheck,
  ListTodo,
  Globe,
  Plus,
  Trash2,
  CheckCircle2,
  Info,
} from 'lucide-react'
import { ModalDesbloqueioPlano } from '@/components/comercial/ModalDesbloqueioPlano'

interface ModalConvidarEquipeProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  escopoInicial?: {
    tipo: EscopoTipo
    id?: string
    nome?: string
  }
}

export default function ModalConvidarEquipe({
  open,
  onOpenChange,
  escopoInicial,
}: ModalConvidarEquipeProps) {
  const { user, isMaster } = useAuth()
  const { toast } = useToast()
  const { projetos, fluxos, categorias, clientes, demandas, recarregarDadosGlobais } =
    useNavegacao()

  const [limites, setLimites] = useState<import('@/types').LimitesConsumoConta | null>(null)
  const [modalUpgradeOpen, setModalUpgradeOpen] = useState(false)

  useEffect(() => {
    diamondApi
      .getLimitesConsumoConta(user?.id, user?.email)
      .then(setLimites)
      .catch(() => {})
  }, [user, open])

  const convitesBloqueados = Boolean(limites?.bloqueadoConvites)

  // Lista de e-mails para envio (suporta múltiplos)
  const [emailsInput, setEmailsInput] = useState('')
  const [emailsLista, setEmailsLista] = useState<string[]>([])

  // Escopo do convite
  const [escopoTipo, setEscopoTipo] = useState<EscopoTipo>('geral')
  const [escopoItemId, setEscopoItemId] = useState<string>('')
  const [escopoItemNome, setEscopoItemNome] = useState<string>('')

  // Nível de acesso e mensagem opcional
  const [nivelAcesso, setNivelAcesso] = useState<NivelAcesso>('edicao')
  const [mensagem, setMensagem] = useState('')
  const [enviando, setEnviando] = useState(false)

  // Ao abrir o modal, preencher escopo inicial se passado
  useEffect(() => {
    if (open) {
      if (escopoInicial) {
        setEscopoTipo(escopoInicial.tipo)
        setEscopoItemId(escopoInicial.id || '')
        setEscopoItemNome(escopoInicial.nome || '')
      } else {
        setEscopoTipo('geral')
        setEscopoItemId('')
        setEscopoItemNome('Workspace Completo')
      }
      setEmailsInput('')
      setEmailsLista([])
      setMensagem('')
      setNivelAcesso('edicao')
    }
  }, [open, escopoInicial])

  // Atualiza o nome do escopo sempre que o item selecionado mudar
  const handleItemSelect = (id: string) => {
    setEscopoItemId(id)
    if (escopoTipo === 'projeto') {
      const p = projetos.find((x) => x.id === id)
      setEscopoItemNome(p ? p.nome : '')
    } else if (escopoTipo === 'fluxo') {
      const f = fluxos.find((x) => x.id === id)
      setEscopoItemNome(f ? f.nome : '')
    } else if (escopoTipo === 'categoria') {
      const c = categorias.find((x) => x.id === id)
      setEscopoItemNome(c ? c.nome : '')
    } else if (escopoTipo === 'cliente') {
      const cli = clientes.find((x) => x.id === id)
      setEscopoItemNome(cli ? `${cli.nome} (${cli.empresa || 'Cliente'})` : '')
    } else if (escopoTipo === 'demanda') {
      const d = demandas.find((x) => x.id === id)
      setEscopoItemNome(d ? d.titulo : '')
    }
  }

  // Quando muda o tipo de escopo, reseta o item selecionado
  const handleTipoChange = (tipo: EscopoTipo) => {
    setEscopoTipo(tipo)
    setEscopoItemId('')
    if (tipo === 'geral') {
      setEscopoItemNome('Workspace Completo')
    } else {
      setEscopoItemNome('')
    }
  }

  // Adicionar e-mails digitados (separados por vírgula, ponto e vírgula ou espaço)
  const adicionarEmailsDoInput = () => {
    if (!emailsInput.trim()) return
    const partes = emailsInput
      .split(/[,;\s]+/)
      .map((e) => e.trim().toLowerCase())
      .filter((e) => e.length > 3 && e.includes('@') && !emailsLista.includes(e))

    if (partes.length > 0) {
      setEmailsLista((prev) => [...prev, ...partes])
      setEmailsInput('')
    }
  }

  const removerEmail = (emailRemover: string) => {
    setEmailsLista((prev) => prev.filter((e) => e !== emailRemover))
  }

  const handleKeyDownEmail = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault()
      adicionarEmailsDoInput()
    }
  }

  // Submeter convites
  const handleEnviarConvites = async (e: React.FormEvent) => {
    e.preventDefault()

    // Processa o que sobrou no input se houver
    let listaFinal = [...emailsLista]
    if (emailsInput.trim()) {
      const partes = emailsInput
        .split(/[,;\s]+/)
        .map((x) => x.trim().toLowerCase())
        .filter((x) => x.length > 3 && x.includes('@') && !listaFinal.includes(x))
      listaFinal = [...listaFinal, ...partes]
    }

    if (convitesBloqueados) {
      setModalUpgradeOpen(true)
      toast({
        title: 'Recurso bloqueado pelo plano',
        description: 'O envio de convites de equipe faz parte do plano pago.',
        variant: 'destructive',
      })
      return
    }

    if (listaFinal.length === 0) {
      toast({
        title: 'Informe ao menos um e-mail',
        description: 'Digite o endereço de e-mail de quem você quer convidar.',
        variant: 'destructive',
      })
      return
    }

    if (escopoTipo !== 'geral' && !escopoItemId) {
      toast({
        title: 'Selecione o item do escopo',
        description: `Escolha qual ${escopoTipo} será compartilhado.`,
        variant: 'destructive',
      })
      return
    }

    setEnviando(true)
    let sucessos = 0
    let falhas = 0

    try {
      for (const email of listaFinal) {
        try {
          await diamondApi.criarConvite({
            email,
            escopo_tipo: escopoTipo,
            escopo_id: escopoItemId,
            escopo_nome: escopoItemNome || 'Workspace',
            nivel_acesso: nivelAcesso,
            mensagem: mensagem.trim(),
            convidado_por: user?.id,
          })
          sucessos++
        } catch (err) {
          console.error(`Falha ao convidar ${email}:`, err)
          falhas++
        }
      }

      await recarregarDadosGlobais()

      if (sucessos > 0) {
        toast({
          title: `${sucessos} convite(s) enviado(s) com sucesso!`,
          description: `Os destinatários receberão um e-mail com instruções e link de aceite direto.`,
        })
        onOpenChange(false)
      } else {
        toast({
          title: 'Erro ao enviar convites',
          description: 'Não foi possível disparar os e-mails de convite.',
          variant: 'destructive',
        })
      }
    } finally {
      setEnviando(false)
    }
  }

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-xl p-0 bg-white border border-[#E5E1D8] overflow-hidden">
          {/* Cabeçalho */}
          <div className="bg-[#1A1D21] text-white p-5 border-b border-white/10">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-[#0F766E] flex items-center justify-center text-white">
                <Users className="w-5 h-5" />
              </div>
              <div>
                <DialogTitle className="text-base font-bold text-white tracking-tight">
                  Convidar para a Equipe
                </DialogTitle>
                <DialogDescription className="text-xs text-zinc-400 mt-0.5">
                  Envie convite por e-mail com acesso granular a projetos, fluxos, demandas ou
                  workspace.
                </DialogDescription>
              </div>
            </div>
          </div>

          {/* Formulário */}
          <form onSubmit={handleEnviarConvites} className="p-5 space-y-4">
            {/* 1. Destinatários de E-mail */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-[#1A1D21] flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <Mail className="w-3.5 h-3.5 text-[#0F766E]" />
                  E-mail do(s) Convidado(s) *
                </span>
                <span className="text-[10px] text-[#5B6470] font-normal">
                  Pressione Enter ou vírgula para múltiplos
                </span>
              </label>

              <div className="flex gap-2">
                <Input
                  type="email"
                  placeholder="ex: colaborador@empresa.com"
                  value={emailsInput}
                  onChange={(e) => setEmailsInput(e.target.value)}
                  onKeyDown={handleKeyDownEmail}
                  onBlur={adicionarEmailsDoInput}
                  className="text-xs border-[#E5E1D8] focus-visible:ring-[#0F766E]"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={adicionarEmailsDoInput}
                  className="text-xs border-[#E5E1D8] shrink-0"
                >
                  <Plus className="w-3.5 h-3.5 mr-1" />
                  Adicionar
                </Button>
              </div>

              {/* Chips de e-mails adicionados */}
              {emailsLista.length > 0 && (
                <div className="flex flex-wrap gap-1.5 pt-1.5">
                  {emailsLista.map((em) => (
                    <Badge
                      key={em}
                      variant="secondary"
                      className="bg-[#F4F2EE] text-[#1A1D21] border border-[#E5E1D8] text-[11px] py-1 px-2.5 gap-1.5"
                    >
                      <span>{em}</span>
                      <button
                        type="button"
                        onClick={() => removerEmail(em)}
                        className="text-[#5B6470] hover:text-red-600 ml-1"
                      >
                        &times;
                      </button>
                    </Badge>
                  ))}
                </div>
              )}
            </div>

            {/* 2. Seleção de Escopo */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3.5 rounded-lg border border-[#E5E1D8] bg-[#FAFAF9]">
              <div className="space-y-1">
                <label className="text-xs font-bold text-[#1A1D21] flex items-center gap-1.5">
                  <Shield className="w-3.5 h-3.5 text-[#0F766E]" />
                  Compartilhar por Escopo
                </label>
                <Select
                  value={escopoTipo}
                  onValueChange={(val) => handleTipoChange(val as EscopoTipo)}
                >
                  <SelectTrigger className="text-xs bg-white border-[#E5E1D8]">
                    <SelectValue placeholder="Selecione o escopo" />
                  </SelectTrigger>
                  <SelectContent className="bg-white border-[#E5E1D8]">
                    <SelectItem value="geral">Geral (Workspace Completo)</SelectItem>
                    <SelectItem value="projeto">Projeto Específico</SelectItem>
                    <SelectItem value="fluxo">Fluxo Kanban Específico</SelectItem>
                    <SelectItem value="categoria">Categoria de Fluxos</SelectItem>
                    <SelectItem value="cliente">Cliente & Entregas</SelectItem>
                    <SelectItem value="demanda">Demanda Específica</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Item Específico dependendo do escopo */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-[#1A1D21]">
                  {escopoTipo === 'geral' && 'Acesso Global'}
                  {escopoTipo === 'projeto' && 'Qual Projeto? *'}
                  {escopoTipo === 'fluxo' && 'Qual Fluxo Kanban? *'}
                  {escopoTipo === 'categoria' && 'Qual Categoria? *'}
                  {escopoTipo === 'cliente' && 'Qual Cliente? *'}
                  {escopoTipo === 'demanda' && 'Qual Demanda? *'}
                </label>

                {escopoTipo === 'geral' ? (
                  <div className="text-xs text-[#5B6470] bg-white border border-[#E5E1D8] rounded-md h-9 px-3 flex items-center gap-1.5">
                    <Globe className="w-3.5 h-3.5 text-[#0F766E]" />
                    <span>Acesso a todos os módulos liberados</span>
                  </div>
                ) : escopoTipo === 'projeto' ? (
                  <Select value={escopoItemId} onValueChange={handleItemSelect}>
                    <SelectTrigger className="text-xs bg-white border-[#E5E1D8]">
                      <SelectValue placeholder="Selecione um projeto..." />
                    </SelectTrigger>
                    <SelectContent className="bg-white border-[#E5E1D8]">
                      {projetos.map((p) => (
                        <SelectItem key={p.id} value={p.id}>
                          {p.nome}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : escopoTipo === 'fluxo' ? (
                  <Select value={escopoItemId} onValueChange={handleItemSelect}>
                    <SelectTrigger className="text-xs bg-white border-[#E5E1D8]">
                      <SelectValue placeholder="Selecione um fluxo..." />
                    </SelectTrigger>
                    <SelectContent className="bg-white border-[#E5E1D8]">
                      {fluxos.map((f) => (
                        <SelectItem key={f.id} value={f.id}>
                          {f.nome}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : escopoTipo === 'categoria' ? (
                  <Select value={escopoItemId} onValueChange={handleItemSelect}>
                    <SelectTrigger className="text-xs bg-white border-[#E5E1D8]">
                      <SelectValue placeholder="Selecione uma categoria..." />
                    </SelectTrigger>
                    <SelectContent className="bg-white border-[#E5E1D8]">
                      {categorias.map((c) => (
                        <SelectItem key={c.id} value={c.id}>
                          {c.nome}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : escopoTipo === 'cliente' ? (
                  <Select value={escopoItemId} onValueChange={handleItemSelect}>
                    <SelectTrigger className="text-xs bg-white border-[#E5E1D8]">
                      <SelectValue placeholder="Selecione um cliente..." />
                    </SelectTrigger>
                    <SelectContent className="bg-white border-[#E5E1D8]">
                      {clientes.map((cli) => (
                        <SelectItem key={cli.id} value={cli.id}>
                          {cli.nome} {cli.empresa ? `(${cli.empresa})` : ''}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <Select value={escopoItemId} onValueChange={handleItemSelect}>
                    <SelectTrigger className="text-xs bg-white border-[#E5E1D8]">
                      <SelectValue placeholder="Selecione uma demanda..." />
                    </SelectTrigger>
                    <SelectContent className="bg-white border-[#E5E1D8]">
                      {demandas.map((d) => (
                        <SelectItem key={d.id} value={d.id}>
                          {d.titulo}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>
            </div>

            {/* 3. Nível de Acesso */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-[#1A1D21]">Nível de Permissão</label>
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => setNivelAcesso('leitura')}
                  className={`p-2.5 rounded-lg border text-left transition-all ${
                    nivelAcesso === 'leitura'
                      ? 'border-[#0F766E] bg-[#0F766E]/5 ring-1 ring-[#0F766E]'
                      : 'border-[#E5E1D8] bg-white hover:bg-[#FAFAF9]'
                  }`}
                >
                  <div className="text-xs font-bold text-[#1A1D21]">Leitura</div>
                  <div className="text-[10px] text-[#5B6470] mt-0.5 leading-snug">
                    Apenas visualiza dados e status
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setNivelAcesso('edicao')}
                  className={`p-2.5 rounded-lg border text-left transition-all ${
                    nivelAcesso === 'edicao'
                      ? 'border-[#0F766E] bg-[#0F766E]/5 ring-1 ring-[#0F766E]'
                      : 'border-[#E5E1D8] bg-white hover:bg-[#FAFAF9]'
                  }`}
                >
                  <div className="text-xs font-bold text-[#0F766E]">Edição</div>
                  <div className="text-[10px] text-[#5B6470] mt-0.5 leading-snug">
                    Cria cards, move fases e altera dados
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setNivelAcesso('admin')}
                  className={`p-2.5 rounded-lg border text-left transition-all ${
                    nivelAcesso === 'admin'
                      ? 'border-[#0F766E] bg-[#0F766E]/5 ring-1 ring-[#0F766E]'
                      : 'border-[#E5E1D8] bg-white hover:bg-[#FAFAF9]'
                  }`}
                >
                  <div className="text-xs font-bold text-[#1A1D21]">Administrador</div>
                  <div className="text-[10px] text-[#5B6470] mt-0.5 leading-snug">
                    Controle total do escopo concedido
                  </div>
                </button>
              </div>
            </div>

            {/* 4. Mensagem Personalizada (Opcional) */}
            <div className="space-y-1">
              <label className="text-xs font-bold text-[#1A1D21] flex items-center justify-between">
                <span>Mensagem Opcional no E-mail</span>
                <span className="text-[10px] text-[#5B6470] font-normal">Aparecerá destacada</span>
              </label>
              <Textarea
                rows={2}
                placeholder="Ex: Olá! Estou compartilhando o fluxo do projeto para você acompanhar o avanço e atualizar os cards."
                value={mensagem}
                onChange={(e) => setMensagem(e.target.value)}
                className="text-xs border-[#E5E1D8] focus-visible:ring-[#0F766E]"
              />
            </div>

            {/* Rodapé com info de expiração e botões */}
            <div className="pt-3 border-t border-[#E5E1D8] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-1.5 text-[11px] text-[#5B6470]">
                <Info className="w-3.5 h-3.5 text-[#0F766E] shrink-0" />
                <span>O convite expira em 7 dias e pode ser reenviado a qualquer momento.</span>
              </div>

              <div className="flex items-center justify-end gap-2 shrink-0">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => onOpenChange(false)}
                  className="text-xs text-[#5B6470]"
                >
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  disabled={enviando}
                  size="sm"
                  className="bg-[#0F766E] hover:bg-[#0D5C56] text-white text-xs gap-1.5 font-semibold px-4 shadow-xs"
                >
                  <Send className="w-3.5 h-3.5" />
                  {enviando ? 'Enviando Convite...' : 'Enviar Convite por E-mail'}
                </Button>
              </div>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <ModalDesbloqueioPlano
        open={modalUpgradeOpen}
        onOpenChange={setModalUpgradeOpen}
        recursoNome="Envio de Convites de Equipe"
        motivo="O envio de convites de equipe para novos membros e convidados é um recurso exclusivo do plano pago da conta."
        isMaster={isMaster}
      />
    </>
  )
}
