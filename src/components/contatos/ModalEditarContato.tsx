import React, { useState, useEffect } from 'react'
import { diamondApi } from '@/services/diamondApi'
import type { Contato, OrigemTipo, Projeto } from '@/types'
import { Users, Check } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
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

export interface ModalEditarContatoProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  contato?: Contato | null
  modo?: 'criar' | 'editar' | 'ver'
  projetosDisponiveis?: Projeto[]
  onSalvo?: (contatoAtualizado: Contato) => void
}

export function ModalEditarContato({
  open,
  onOpenChange,
  contato,
  modo = 'editar',
  projetosDisponiveis,
  onSalvo,
}: ModalEditarContatoProps) {
  const { toast } = useToast()

  const [nome, setNome] = useState('')
  const [empresa, setEmpresa] = useState('')
  const [email, setEmail] = useState('')
  const [telefone, setTelefone] = useState('')
  const [cargo, setCargo] = useState('')
  const [origem, setOrigem] = useState<OrigemTipo>('manual')
  const [tagsStr, setTagsStr] = useState('')
  const [contexto, setContexto] = useState('')
  const [projetoId, setProjetoId] = useState<string>('none')
  const [projetos, setProjetos] = useState<Projeto[]>(projetosDisponiveis || [])
  const [salvando, setSalvando] = useState(false)

  // Sincronizar dados quando o modal abre ou o contato muda
  useEffect(() => {
    if (open) {
      if (contato) {
        setNome(contato.nome || '')
        setEmpresa(contato.empresa || '')
        setEmail(contato.email || '')
        setTelefone(contato.telefone || '')
        setCargo(contato.cargo || '')
        setOrigem(contato.origem || 'manual')
        setTagsStr(Array.isArray(contato.tags) ? contato.tags.join(', ') : '')
        setContexto(contato.contexto_resumido || '')
        const primeiroProjeto =
          Array.isArray(contato.projetos) && contato.projetos.length > 0
            ? contato.projetos[0]
            : 'none'
        setProjetoId(primeiroProjeto || 'none')
      } else {
        setNome('')
        setEmpresa('')
        setEmail('')
        setTelefone('')
        setCargo('')
        setOrigem('manual')
        setTagsStr('')
        setContexto('')
        setProjetoId('none')
      }

      // Se não foram passados projetos e houver necessidade de selecionar
      if (!projetosDisponiveis || projetosDisponiveis.length === 0) {
        diamondApi
          .listProjetos()
          .then((p) => setProjetos(p))
          .catch(() => {})
      } else {
        setProjetos(projetosDisponiveis)
      }
    }
  }, [open, contato, projetosDisponiveis])

  const handleSalvar = async (e?: React.FormEvent) => {
    if (e) e.preventDefault()
    if (!nome.trim()) {
      toast({ title: 'Informe o nome do contato', variant: 'destructive' })
      return
    }

    setSalvando(true)
    try {
      const tagsArray = tagsStr
        .split(',')
        .map((t) => t.trim().toLowerCase())
        .filter(Boolean)

      const payload: Partial<Contato> = {
        nome: nome.trim(),
        empresa: empresa.trim() || undefined,
        email: email.trim() || undefined,
        telefone: telefone.trim() || undefined,
        cargo: cargo.trim() || undefined,
        origem: origem,
        tags: tagsArray,
        contexto_resumido: contexto.trim() || undefined,
        projetos: projetoId && projetoId !== 'none' ? [projetoId] : [],
      }

      let res: Contato
      if (modo === 'criar' || !contato?.id) {
        res = await diamondApi.createContato(payload)
        toast({ title: 'Contato criado com sucesso!' })
      } else {
        res = await diamondApi.updateContato(contato.id, payload)
        toast({ title: 'Contato atualizado com sucesso!' })
      }

      onOpenChange(false)
      onSalvo?.(res)
    } catch (err) {
      toast({
        title: modo === 'criar' ? 'Erro ao criar contato' : 'Erro ao atualizar contato',
        description: (err as Error)?.message,
        variant: 'destructive',
      })
    } finally {
      setSalvando(false)
    }
  }

  const tituloModal =
    modo === 'criar'
      ? 'Cadastrar Novo Contato'
      : modo === 'editar'
        ? 'Editar Contato'
        : 'Visualizar Contato'

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg bg-white border-[#E5E1D8]">
        <DialogHeader>
          <DialogTitle className="text-base font-bold text-[#1A1D21] flex items-center gap-2">
            <Users className="w-4 h-4 text-[#0F766E]" />
            {tituloModal}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSalvar} className="space-y-3.5 pt-2">
          <div className="space-y-1">
            <label className="text-xs font-semibold text-[#1A1D21] block">Nome Completo *</label>
            <Input
              required
              disabled={modo === 'ver'}
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              placeholder="Ex: Helena Martins"
              className="text-xs border-[#E5E1D8]"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-[#5B6470] block">Empresa</label>
              <Input
                disabled={modo === 'ver'}
                value={empresa}
                onChange={(e) => setEmpresa(e.target.value)}
                placeholder="Ex: Loja Y"
                className="text-xs border-[#E5E1D8]"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-semibold text-[#5B6470] block">Cargo</label>
              <Input
                disabled={modo === 'ver'}
                value={cargo}
                onChange={(e) => setCargo(e.target.value)}
                placeholder="Ex: Diretora de Operações"
                className="text-xs border-[#E5E1D8]"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-[#5B6470] block">E-mail</label>
              <Input
                disabled={modo === 'ver'}
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="helena@empresa.com.br"
                className="text-xs border-[#E5E1D8]"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-semibold text-[#5B6470] block">
                Telefone / WhatsApp
              </label>
              <Input
                disabled={modo === 'ver'}
                value={telefone}
                onChange={(e) => setTelefone(e.target.value)}
                placeholder="+55 (11) 98765-4321"
                className="text-xs border-[#E5E1D8]"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-[#5B6470] block">
                Vincular a Projeto
              </label>
              <Select disabled={modo === 'ver'} value={projetoId} onValueChange={setProjetoId}>
                <SelectTrigger className="text-xs border-[#E5E1D8]">
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

            <div className="space-y-1">
              <label className="text-xs font-semibold text-[#5B6470] block">Origem</label>
              <Select
                disabled={modo === 'ver'}
                value={origem}
                onValueChange={(v) => setOrigem(v as OrigemTipo)}
              >
                <SelectTrigger className="text-xs border-[#E5E1D8]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="manual">Manual</SelectItem>
                  <SelectItem value="whatsapp">WhatsApp</SelectItem>
                  <SelectItem value="email">E-mail</SelectItem>
                  <SelectItem value="importado">Importado</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-[#5B6470] block">
              Tags (separadas por vírgula)
            </label>
            <Input
              disabled={modo === 'ver'}
              value={tagsStr}
              onChange={(e) => setTagsStr(e.target.value)}
              placeholder="Ex: vip, decisor, cliente, revisao"
              className="text-xs border-[#E5E1D8]"
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-[#5B6470] block">
              Contexto / Observações
            </label>
            <Textarea
              disabled={modo === 'ver'}
              rows={3}
              value={contexto}
              onChange={(e) => setContexto(e.target.value)}
              placeholder="Histórico resumido do relacionamento, canais favoritos, acordos verbais..."
              className="text-xs border-[#E5E1D8]"
            />
          </div>

          <DialogFooter className="pt-3 border-t border-[#E5E1D8] gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => onOpenChange(false)}
              className="text-xs border-[#E5E1D8]"
            >
              {modo === 'ver' ? 'Fechar' : 'Cancelar'}
            </Button>
            {modo !== 'ver' && (
              <Button
                type="submit"
                size="sm"
                disabled={salvando}
                className="bg-[#0F766E] hover:bg-[#0D5C56] text-white text-xs gap-1"
              >
                <Check className="w-3.5 h-3.5" />
                <span>
                  {salvando
                    ? 'Salvando...'
                    : modo === 'criar'
                      ? 'Salvar Contato'
                      : 'Atualizar Contato'}
                </span>
              </Button>
            )}
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
