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
  Pencil,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { useToast } from '@/hooks/use-toast'
import { ModalImportarContatos } from '@/components/contatos/ModalImportarContatos'
import { ModalEditarContato } from '@/components/contatos/ModalEditarContato'

export default function Contatos() {
  const navigate = useNavigate()
  const { toast } = useToast()

  const [contatos, setContatos] = useState<Contato[]>([])
  const [projetos, setProjetos] = useState<Projeto[]>([])
  const [negocios, setNegocios] = useState<Negocio[]>([])
  const [busca, setBusca] = useState('')

  // Modal Criar / Editar Contato
  const [modalOpen, setModalOpen] = useState(false)
  const [modalModo, setModalModo] = useState<'criar' | 'editar'>('criar')
  const [contatoEditando, setContatoEditando] = useState<Contato | null>(null)

  // Modal Importar Contatos (.vcf e .csv)
  const [modalImportarOpen, setModalImportarOpen] = useState(false)

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

  const abrirCriarContato = () => {
    setContatoEditando(null)
    setModalModo('criar')
    setModalOpen(true)
  }

  const abrirEditarContato = (c: Contato, e?: React.MouseEvent) => {
    if (e) e.stopPropagation()
    setContatoEditando(c)
    setModalModo('editar')
    setModalOpen(true)
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
            onClick={() => setModalImportarOpen(true)}
            className="text-xs h-9 border-[#E5E1D8] gap-1.5"
          >
            <Upload className="w-3.5 h-3.5 text-[#5B6470]" />
            Importar Contatos (.vcf / .csv)
          </Button>
          <Button
            size="sm"
            onClick={abrirCriarContato}
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
              <span className="flex items-center gap-1">
                Abrir histórico e demandas
                <ArrowRight className="w-3.5 h-3.5" />
              </span>
              <Button
                size="sm"
                variant="ghost"
                onClick={(e) => abrirEditarContato(ct, e)}
                className="h-6 px-2 text-[11px] text-[#5B6470] hover:text-[#0F766E] hover:bg-[#0F766E]/10 gap-1 rounded"
              >
                <Pencil className="w-3 h-3" />
                <span>Editar</span>
              </Button>
            </div>
          </div>
        ))}
      </div>

      {/* Modal Criar / Editar Contato */}
      <ModalEditarContato
        open={modalOpen}
        onOpenChange={setModalOpen}
        contato={contatoEditando}
        modo={modalModo}
        projetosDisponiveis={projetos}
        onSalvo={async () => {
          await carregar()
        }}
      />

      {/* Modal Importar Contatos (.vcf / .csv) */}
      <ModalImportarContatos
        open={modalImportarOpen}
        onOpenChange={setModalImportarOpen}
        contatosExistentes={contatos}
        onSucesso={carregar}
      />
    </div>
  )
}
