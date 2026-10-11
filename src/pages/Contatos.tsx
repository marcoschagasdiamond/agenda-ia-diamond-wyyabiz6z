import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { diamondApi } from '@/services/diamondApi'
import type { Contato, OrigemTipo, Projeto, Negocio } from '@/types'
import {
  Users,
  Plus,
  Upload,
  Search,
  Mail,
  Phone,
  Building,
  ArrowRight,
  Sparkles,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
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

export default function Contatos() {
  const navigate = useNavigate()
  const { toast } = useToast()

  const [contatos, setContatos] = useState<Contato[]>([])
  const [projetos, setProjetos] = useState<Projeto[]>([])
  const [negocios, setNegocios] = useState<Negocio[]>([])
  const [busca, setBusca] = useState('')

  // Modal Novo Contato
  const [modalOpen, setModalOpen] = useState(false)
  const [nome, setNome] = useState('')
  const [empresa, setEmpresa] = useState('')
  const [email, setEmail] = useState('')
  const [telefone, setTelefone] = useState('')
  const [cargo, setCargo] = useState('')
  const [origem, setOrigem] = useState<OrigemTipo>('manual')
  const [tags, setTags] = useState('')
  const [projetoId, setProjetoId] = useState('none')
  const [salvando, setSalvando] = useState(false)

  // Modal Importar CSV
  const [modalCsvOpen, setModalCsvOpen] = useState(false)
  const [csvContent, setCsvContent] = useState('')

  const carregar = async () => {
    try {
      const [c, p, n] = await Promise.all([
        diamondApi.listContatos(),
        diamondApi.listProjetos(),
        diamondApi.listNegocios(),
      ])
      setContatos(c)
      setProjetos(p)
      setNegocios(n)
    } catch (err) {
      console.error(err)
    }
  }

  useEffect(() => {
    carregar()
  }, [])

  const handleSalvarContato = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!nome.trim()) return
    setSalvando(true)

    const tagsArr = tags
      .split(',')
      .map((t) => t.trim().toLowerCase())
      .filter(Boolean)

    try {
      await diamondApi.createContato({
        nome: nome.trim(),
        empresa: empresa.trim() || undefined,
        email: email.trim() || undefined,
        telefone: telefone.trim() || undefined,
        cargo: cargo.trim() || undefined,
        origem,
        tags: tagsArr,
        projetos: projetoId !== 'none' ? [projetoId] : [],
      })

      toast({ title: 'Contato criado com sucesso!' })
      setModalOpen(false)
      setNome('')
      setEmpresa('')
      setEmail('')
      setTelefone('')
      setCargo('')
      setTags('')
      setProjetoId('none')
      await carregar()
    } catch (err) {
      toast({
        title: 'Erro ao criar contato',
        description: (err as Error)?.message,
        variant: 'destructive',
      })
    } finally {
      setSalvando(false)
    }
  }

  // Importação simplificada de CSV
  const handleImportarCsv = async () => {
    if (!csvContent.trim()) return
    const lines = csvContent.split('\n')
    let imported = 0

    for (const line of lines) {
      const parts = line.split(',').map((p) => p.trim())
      if (parts.length >= 1 && parts[0] && !parts[0].toLowerCase().includes('nome')) {
        const [cNome, cEmpresa, cEmail, cTelefone, cCargo] = parts
        await diamondApi
          .createContato({
            nome: cNome,
            empresa: cEmpresa || undefined,
            email: cEmail || undefined,
            telefone: cTelefone || undefined,
            cargo: cCargo || undefined,
            origem: 'importado',
            tags: ['importado'],
          })
          .catch(() => {})
        imported++
      }
    }

    toast({
      title: 'Importação concluída',
      description: `${imported} contatos importados para a base.`,
    })
    setModalCsvOpen(false)
    setCsvContent('')
    await carregar()
  }

  const contatosFiltrados = contatos.filter((c) => {
    if (!busca) return true
    const t = busca.toLowerCase()
    return (
      c.nome?.toLowerCase().includes(t) ||
      c.empresa?.toLowerCase().includes(t) ||
      c.email?.toLowerCase().includes(t)
    )
  })

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-xl border border-[#E5E1D8] shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl md:text-2xl font-bold tracking-tight text-[#1A1D21]">
              Contatos & Pessoas Chave
            </h1>
            <Badge className="bg-[#0F766E]/10 text-[#0F766E] border-none text-[11px] font-semibold">
              {contatos.length} Cadastrados
            </Badge>
          </div>
          <p className="text-xs text-[#5B6470] mt-1">
            Mantenha o histórico e contexto de conversas de cada contato conectado a projetos e
            demandas.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setModalCsvOpen(true)}
            className="text-xs h-9 border-[#E5E1D8] gap-1.5"
          >
            <Upload className="w-3.5 h-3.5 text-[#5B6470]" />
            Importar CSV
          </Button>
          <Button
            size="sm"
            onClick={() => setModalOpen(true)}
            className="bg-[#0F766E] hover:bg-[#0D5C56] text-white text-xs h-9 px-4 font-medium shadow-sm gap-1.5"
          >
            <Plus className="w-4 h-4" />
            Novo Contato
          </Button>
        </div>
      </div>

      {/* Busca */}
      <div className="relative max-w-md">
        <Search className="w-3.5 h-3.5 absolute left-3 top-3 text-[#5B6470]" />
        <Input
          placeholder="Buscar por nome, empresa ou e-mail..."
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          className="pl-9 text-xs h-8 bg-white border-[#E5E1D8]"
        />
      </div>

      {/* Grid de Contatos */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {contatosFiltrados.map((ct) => (
          <div
            key={ct.id}
            onClick={() => navigate(`/contatos/${ct.id}`)}
            className="p-4 rounded-xl bg-white border border-[#E5E1D8] shadow-xs diamond-card-hover cursor-pointer flex flex-col justify-between"
          >
            <div>
              <div className="flex items-start justify-between gap-2 mb-2">
                <div>
                  <h3 className="text-sm font-bold text-[#1A1D21] line-clamp-1">{ct.nome}</h3>
                  <p className="text-xs text-[#5B6470]">
                    {ct.cargo || 'Contato'} {ct.empresa && `• ${ct.empresa}`}
                  </p>
                </div>
                <Badge variant="outline" className="text-[10px] capitalize">
                  {ct.origem}
                </Badge>
              </div>

              <div className="space-y-1 my-3 text-xs text-[#5B6470]">
                {ct.email && (
                  <div className="flex items-center gap-1.5 truncate">
                    <Mail className="w-3.5 h-3.5 text-[#0F766E] shrink-0" />
                    <span className="truncate">{ct.email}</span>
                  </div>
                )}
                {ct.telefone && (
                  <div className="flex items-center gap-1.5">
                    <Phone className="w-3.5 h-3.5 text-[#0F766E] shrink-0" />
                    <span>{ct.telefone}</span>
                  </div>
                )}
              </div>

              {ct.contexto_resumido && (
                <div className="bg-[#F4F2EE]/50 p-2 rounded text-[11px] text-[#5B6470] line-clamp-2 border border-[#E5E1D8]/50">
                  {ct.contexto_resumido}
                </div>
              )}
            </div>

            <div className="pt-3 mt-3 border-t border-[#E5E1D8]/60 flex items-center justify-between text-xs text-[#0F766E] font-medium">
              <span>Abrir histórico e demandas</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </div>
          </div>
        ))}
      </div>

      {/* Modal Criar Contato */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="max-w-md bg-white border border-[#E5E1D8]">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-[#1A1D21]">
              Cadastrar Novo Contato
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSalvarContato} className="space-y-3.5 pt-2">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-[#1A1D21]">Nome Completo *</label>
              <Input
                required
                placeholder="Ex: Helena Martins"
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                className="text-xs border-[#E5E1D8]"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-[#5B6470]">Empresa</label>
                <Input
                  placeholder="Ex: Loja Y"
                  value={empresa}
                  onChange={(e) => setEmpresa(e.target.value)}
                  className="text-xs border-[#E5E1D8]"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-semibold text-[#5B6470]">Cargo</label>
                <Input
                  placeholder="Ex: Diretora de Operações"
                  value={cargo}
                  onChange={(e) => setCargo(e.target.value)}
                  className="text-xs border-[#E5E1D8]"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-[#5B6470]">E-mail</label>
                <Input
                  type="email"
                  placeholder="helena@lojayecommerce.com.br"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="text-xs border-[#E5E1D8]"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-semibold text-[#5B6470]">Telefone / WhatsApp</label>
                <Input
                  placeholder="+55 (11) 98765-4321"
                  value={telefone}
                  onChange={(e) => setTelefone(e.target.value)}
                  className="text-xs border-[#E5E1D8]"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-[#5B6470]">Vincular a Projeto</label>
                <Select value={projetoId} onValueChange={setProjetoId}>
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
                <label className="text-xs font-semibold text-[#5B6470]">Origem</label>
                <Select value={origem} onValueChange={(v) => setOrigem(v as OrigemTipo)}>
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
              <label className="text-xs font-semibold text-[#5B6470]">
                Tags (separadas por vírgula)
              </label>
              <Input
                placeholder="Ex: vip, decisor, cliente, revisao"
                value={tags}
                onChange={(e) => setTags(e.target.value)}
                className="text-xs border-[#E5E1D8]"
              />
            </div>

            <DialogFooter className="pt-3 border-t border-[#E5E1D8]">
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
                {salvando ? 'Salvando...' : 'Salvar Contato'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Modal Importar CSV */}
      <Dialog open={modalCsvOpen} onOpenChange={setModalCsvOpen}>
        <DialogContent className="max-w-md bg-white border border-[#E5E1D8]">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-[#1A1D21]">
              Importar Contatos via CSV
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 pt-2">
            <p className="text-xs text-[#5B6470]">
              Cole o conteúdo CSV com as colunas:{' '}
              <strong>Nome, Empresa, Email, Telefone, Cargo</strong>
            </p>
            <textarea
              rows={6}
              value={csvContent}
              onChange={(e) => setCsvContent(e.target.value)}
              placeholder="Nome, Empresa, Email, Telefone, Cargo&#10;Carlos Silva, Startup X, carlos@x.com, 11999998888, CEO&#10;Mariana Costa, Loja Y, mariana@lojay.com, 11988887777, Marketing"
              className="w-full text-xs p-2.5 font-mono border border-[#E5E1D8] rounded-md"
            />
            <DialogFooter className="pt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setModalCsvOpen(false)}
                className="text-xs"
              >
                Cancelar
              </Button>
              <Button
                size="sm"
                onClick={handleImportarCsv}
                className="bg-[#0F766E] hover:bg-[#0D5C56] text-white text-xs"
              >
                Processar Importação
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
