import React, { useState, useEffect } from 'react'
import { diamondApi } from '@/services/diamondApi'
import { useAuth } from '@/hooks/use-auth'
import type { Cliente, ClienteProjeto, Projeto } from '@/types'
import {
  UserCheck,
  Plus,
  Mail,
  Building,
  ShieldCheck,
  CheckCircle2,
  Trash2,
  Share2,
  Lock,
  Unlock,
  Users,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
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
import { useToast } from '@/hooks/use-toast'
import { useNavegacao } from '@/contexts/NavegacaoContext'

export default function Clientes() {
  const { user } = useAuth()
  const { toast } = useToast()
  const { setModalConvidarEquipeOpen, setModalConvidarEscopoPadrao } = useNavegacao()
  const [clientes, setClientes] = useState<Cliente[]>([])
  const [projetos, setProjetos] = useState<Projeto[]>([])
  const [clienteProjetos, setClienteProjetos] = useState<ClienteProjeto[]>([])

  // Modal Novo Cliente
  const [modalOpen, setModalOpen] = useState(false)
  const [nome, setNome] = useState('')
  const [email, setEmail] = useState('')
  const [telefone, setTelefone] = useState('')
  const [empresa, setEmpresa] = useState('')
  const [tags, setTags] = useState('')
  const [salvando, setSalvando] = useState(false)

  // Modal Vincular Projeto ao Portal
  const [modalVincularOpen, setModalVincularOpen] = useState(false)
  const [clienteSelecionado, setClienteSelecionado] = useState<Cliente | null>(null)

  const carregar = async () => {
    try {
      const [c, p, cp] = await Promise.all([
        diamondApi.listClientes(),
        diamondApi.listProjetos(),
        diamondApi.listClienteProjetos(),
      ])
      setClientes(c)
      setProjetos(p)
      setClienteProjetos(cp)
    } catch (err) {
      console.error(err)
    }
  }

  useEffect(() => {
    carregar()
  }, [])

  const handleCriarCliente = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!nome.trim() || !email.trim() || !user) return
    setSalvando(true)

    const tagsArr = tags
      .split(',')
      .map((t) => t.trim().toLowerCase())
      .filter(Boolean)

    try {
      await diamondApi.createCliente({
        nome: nome.trim(),
        email: email.trim().toLowerCase(),
        telefone: telefone.trim() || undefined,
        empresa: empresa.trim() || undefined,
        cadastrado_por: user.id,
        tags: tagsArr,
      })

      toast({ title: 'Cliente cadastrado com sucesso!' })
      setModalOpen(false)
      setNome('')
      setEmail('')
      setTelefone('')
      setEmpresa('')
      setTags('')
      await carregar()
    } catch (err) {
      toast({
        title: 'Erro ao cadastrar cliente',
        description: (err as Error)?.message,
        variant: 'destructive',
      })
    } finally {
      setSalvando(false)
    }
  }

  const handleExcluirCliente = async (cliente: Cliente) => {
    if (!confirm(`Deseja realmente remover o cliente ${cliente.nome}?`)) return
    try {
      await diamondApi.deleteCliente(cliente.id)
      toast({ title: 'Cliente excluído com sucesso.' })
      setClientes((prev) => prev.filter((c) => c.id !== cliente.id))
    } catch {
      toast({
        title: 'Erro na exclusão',
        description: 'Apenas quem cadastrou o cliente pode excluí-lo.',
        variant: 'destructive',
      })
    }
  }

  const handleToggleAcessoProjeto = async (
    clienteId: string,
    projetoId: string,
    ativoAtual: boolean,
  ) => {
    try {
      await diamondApi.setClienteProjetoAcesso(clienteId, projetoId, !ativoAtual)
      toast({
        title: !ativoAtual ? 'Acesso ao portal ativado!' : 'Acesso ao portal desativado.',
      })
      await carregar()
    } catch {
      toast({ title: 'Erro ao alterar acesso', variant: 'destructive' })
    }
  }

  const handleConvidarPortal = (cliente: Cliente) => {
    toast({
      title: `Convite enviado para ${cliente.email}`,
      description: 'O cliente recebeu instruções para criar a senha e acessar o Portal do Cliente.',
    })
  }

  const totalAtivosPortal = clienteProjetos.filter((cp) => cp.acesso_ativado).length

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-xl border border-[#E5E1D8] shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl md:text-2xl font-bold tracking-tight text-[#1A1D21]">
              Controle de Clientes & Portal
            </h1>
            <Badge className="bg-[#0F766E]/10 text-[#0F766E] border-none text-[11px] font-semibold">
              Painel Interno
            </Badge>
          </div>
          <p className="text-xs text-[#5B6470] mt-1">
            Gestão com rastreabilidade de quem cadastrou cada um, liberação de projetos e envio de
            convites para o portal.
          </p>
        </div>

        <Button
          onClick={() => setModalOpen(true)}
          className="bg-[#0F766E] hover:bg-[#0D5C56] text-white text-xs h-9 px-4 font-medium shadow-sm gap-1.5"
        >
          <Plus className="w-4 h-4" />
          Cadastrar Cliente
        </Button>
      </div>

      {/* Métricas no Topo */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="border-[#E5E1D8] bg-white shadow-xs p-4 flex items-center justify-between">
          <div>
            <p className="text-xs text-[#5B6470] font-medium">Total de Clientes</p>
            <h3 className="text-2xl font-bold text-[#1A1D21] mt-0.5">{clientes.length}</h3>
          </div>
          <div className="w-10 h-10 rounded-lg bg-teal-50 text-[#0F766E] flex items-center justify-center">
            <Users className="w-5 h-5" />
          </div>
        </Card>

        <Card className="border-[#E5E1D8] bg-white shadow-xs p-4 flex items-center justify-between">
          <div>
            <p className="text-xs text-[#5B6470] font-medium">Acessos Ativos ao Portal</p>
            <h3 className="text-2xl font-bold text-emerald-700 mt-0.5">{totalAtivosPortal}</h3>
          </div>
          <div className="w-10 h-10 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center">
            <ShieldCheck className="w-5 h-5" />
          </div>
        </Card>

        <Card className="border-[#E5E1D8] bg-white shadow-xs p-4 flex items-center justify-between">
          <div>
            <p className="text-xs text-[#5B6470] font-medium">Projetos Compartilháveis</p>
            <h3 className="text-2xl font-bold text-[#D97706] mt-0.5">{projetos.length}</h3>
          </div>
          <div className="w-10 h-10 rounded-lg bg-amber-50 text-[#D97706] flex items-center justify-center">
            <Building className="w-5 h-5" />
          </div>
        </Card>
      </div>

      {/* Tabela de Clientes */}
      <Card className="border-[#E5E1D8] bg-white shadow-xs">
        <CardHeader className="pb-3 border-b border-[#E5E1D8]/60">
          <CardTitle className="text-sm font-bold text-[#1A1D21]">
            Clientes Cadastrados com Rastreabilidade
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#FAFAF9] border-b border-[#E5E1D8] text-[#5B6470] uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="p-3 font-semibold">Cliente & Empresa</th>
                  <th className="p-3 font-semibold">Contato</th>
                  <th className="p-3 font-semibold">Quem Cadastrou</th>
                  <th className="p-3 font-semibold">Projetos no Portal</th>
                  <th className="p-3 font-semibold text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E5E1D8]">
                {clientes.map((c) => {
                  const projsCliente = clienteProjetos.filter((cp) => cp.cliente === c.id)
                  const ativos = projsCliente.filter((cp) => cp.acesso_ativado).length

                  return (
                    <tr key={c.id} className="hover:bg-[#FAFAF9]/60 transition-colors">
                      <td className="p-3">
                        <div className="font-bold text-[#1A1D21]">{c.nome}</div>
                        <div className="text-[11px] text-[#5B6470]">
                          {c.empresa || 'Individual'}
                        </div>
                        <div className="flex gap-1 mt-1">
                          {Array.isArray(c.tags) &&
                            c.tags.map((t, idx) => (
                              <span
                                key={idx}
                                className="text-[9px] bg-[#F4F2EE] px-1 py-0.5 rounded text-[#5B6470]"
                              >
                                #{t}
                              </span>
                            ))}
                        </div>
                      </td>

                      <td className="p-3">
                        <div className="text-[#1A1D21]">{c.email}</div>
                        <div className="text-[11px] text-[#5B6470]">
                          {c.telefone || 'Sem telefone'}
                        </div>
                      </td>

                      <td className="p-3">
                        <span className="font-medium text-[#1A1D21]">
                          {c.expand?.cadastrado_por?.name || 'Administrador'}
                        </span>
                        <div className="text-[10px] text-[#5B6470]">
                          em {c.created?.slice(0, 10)}
                        </div>
                      </td>

                      <td className="p-3">
                        <Badge
                          variant="outline"
                          className={`text-[10px] ${
                            ativos > 0
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                              : 'bg-zinc-100 text-zinc-600 border-zinc-200'
                          }`}
                        >
                          {ativos} de {projetos.length} projeto(s) liberado(s)
                        </Badge>
                      </td>

                      <td className="p-3 text-right space-x-1">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setClienteSelecionado(c)
                            setModalVincularOpen(true)
                          }}
                          className="text-[11px] h-7 border-[#E5E1D8]"
                        >
                          Gerenciar Acessos
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setModalConvidarEscopoPadrao({
                              tipo: 'cliente',
                              id: c.id,
                              nome: `${c.nome} (${c.empresa || 'Cliente'})`,
                            })
                            setModalConvidarEquipeOpen(true)
                          }}
                          className="text-[11px] h-7 text-[#0F766E] border-[#0F766E]/30 hover:bg-[#0F766E]/5"
                        >
                          Convidar
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleExcluirCliente(c)}
                          className="text-[11px] h-7 text-red-600 hover:bg-red-50 p-1.5"
                          title="Excluir cliente"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </td>
                    </tr>
                  )
                })}

                {clientes.length === 0 && (
                  <tr>
                    <td colSpan={5} className="p-8 text-center text-xs text-[#5B6470]">
                      Nenhum cliente cadastrado no sistema ainda.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Modal Cadastrar Cliente */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="max-w-md bg-white border border-[#E5E1D8]">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-[#1A1D21]">
              Cadastrar Novo Cliente
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCriarCliente} className="space-y-3.5 pt-2">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-[#1A1D21]">Nome do Cliente *</label>
              <Input
                required
                placeholder="Ex: Helena Martins"
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                className="text-xs border-[#E5E1D8]"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-[#1A1D21]">
                E-mail de Acesso ao Portal *
              </label>
              <Input
                type="email"
                required
                placeholder="helena@lojayecommerce.com.br"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="text-xs border-[#E5E1D8]"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-[#5B6470]">Empresa</label>
                <Input
                  placeholder="Loja Y"
                  value={empresa}
                  onChange={(e) => setEmpresa(e.target.value)}
                  className="text-xs border-[#E5E1D8]"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-semibold text-[#5B6470]">Telefone</label>
                <Input
                  placeholder="+55 11 98765-4321"
                  value={telefone}
                  onChange={(e) => setTelefone(e.target.value)}
                  className="text-xs border-[#E5E1D8]"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-[#5B6470]">
                Tags (separadas por vírgula)
              </label>
              <Input
                placeholder="vip, varejo, contrato-ativo"
                value={tags}
                onChange={(e) => setTags(e.target.value)}
                className="text-xs border-[#E5E1D8]"
              />
            </div>

            <DialogFooter className="pt-2">
              <Button
                type="submit"
                disabled={salvando}
                size="sm"
                className="bg-[#0F766E] hover:bg-[#0D5C56] text-white text-xs"
              >
                {salvando ? 'Cadastrando...' : 'Salvar Cliente'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Modal Gerenciar Acessos ao Portal */}
      <Dialog open={modalVincularOpen} onOpenChange={setModalVincularOpen}>
        <DialogContent className="max-w-md bg-white border border-[#E5E1D8]">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-[#1A1D21]">
              Acesso ao Portal: {clienteSelecionado?.nome}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 pt-2">
            <p className="text-xs text-[#5B6470]">
              Ative os projetos que este cliente pode visualizar no Portal do Cliente.
            </p>

            <div className="divide-y divide-[#E5E1D8] max-h-[300px] overflow-y-auto">
              {projetos.map((proj) => {
                const vinculo = clienteProjetos.find(
                  (cp) => cp.cliente === clienteSelecionado?.id && cp.projeto === proj.id,
                )
                const isAtivo = Boolean(vinculo?.acesso_ativado)

                return (
                  <div key={proj.id} className="py-2.5 flex items-center justify-between text-xs">
                    <div>
                      <span className="font-semibold text-[#1A1D21] block">{proj.nome}</span>
                      <span className="text-[10px] text-[#5B6470] capitalize">{proj.tipo}</span>
                    </div>

                    <Button
                      size="sm"
                      variant={isAtivo ? 'default' : 'outline'}
                      onClick={() =>
                        clienteSelecionado &&
                        handleToggleAcessoProjeto(clienteSelecionado.id, proj.id, isAtivo)
                      }
                      className={`text-[11px] h-7 gap-1 ${
                        isAtivo ? 'bg-[#0F766E] text-white' : 'border-[#E5E1D8] text-[#5B6470]'
                      }`}
                    >
                      {isAtivo ? (
                        <>
                          <Unlock className="w-3 h-3" />
                          Acesso Liberado
                        </>
                      ) : (
                        <>
                          <Lock className="w-3 h-3" />
                          Liberar Acesso
                        </>
                      )}
                    </Button>
                  </div>
                )
              })}
            </div>
            <DialogFooter className="pt-2">
              <Button size="sm" onClick={() => setModalVincularOpen(false)} className="text-xs">
                Concluído
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
