// Gestão de Campos Personalizados dentro de /config (modelo Ummense adaptado).
import { useEffect, useState } from 'react'
import { useAuth } from '@/hooks/use-auth'
import { useToast } from '@/hooks/use-toast'
import pb from '@/lib/pocketbase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import {
  Plus,
  Pencil,
  Ban,
  RotateCcw,
  Trash2,
  SlidersHorizontal,
  Loader2,
  ListChecks,
} from 'lucide-react'
import {
  ROTULOS_CATEGORIA,
  ROTULOS_TIPO,
  tipoUsaOpcoes,
  type CampoPersonalizado,
  type CampoCategoria,
  type CampoTipo,
} from '@/services/camposPersonalizados'
import { GestaoListasSelecao } from './GestaoListasSelecao'

export const TIPOS_CAMPO: CampoTipo[] = [
  'texto_curto',
  'texto_longo',
  'numero',
  'select',
  'radio',
  'checkbox',
  'lista_checkbox',
  'seletor_horario',
  'seletor_data',
  'lista_selecao',
  'moeda',
]

interface FormCampoState {
  id: string | null
  categoria: CampoCategoria
  tipo: CampoTipo
  nome_interno: string
  rotulo: string
  mensagem_ajuda: string
  legenda: string
  opcoesTexto: string
  lista_selecao: string
  obrigatorio: boolean
  ativo: boolean
}

const FORM_PADRAO: FormCampoState = {
  id: null,
  categoria: 'card',
  tipo: 'texto_curto',
  nome_interno: '',
  rotulo: '',
  mensagem_ajuda: '',
  legenda: '',
  opcoesTexto: '',
  lista_selecao: '',
  obrigatorio: false,
  ativo: true,
}

export default function GestaoCamposPersonalizados({
  onRecarregarGlobal,
}: {
  onRecarregarGlobal?: () => void
}) {
  const { user } = useAuth()
  const { toast } = useToast()

  const [campos, setCampos] = useState<CampoPersonalizado[]>([])
  const [listas, setListas] = useState<import('@/services/camposPersonalizados').ListaSelecao[]>([])
  const [carregando, setCarregando] = useState(true)
  const [modalCampoOpen, setModalCampoOpen] = useState(false)
  const [form, setForm] = useState<FormCampoState>(FORM_PADRAO)
  const [salvandoCampo, setSalvandoCampo] = useState(false)
  const [abaLista, setAbaLista] = useState<'ativos' | 'inativos'>('ativos')

  const carregar = async () => {
    setCarregando(true)
    try {
      const { listarCamposPersonalizados, listarListasSelecao } =
        await import('@/services/camposPersonalizados')
      const [c, l] = await Promise.all([
        listarCamposPersonalizados(false),
        listarListasSelecao(false),
      ])
      setCampos(c)
      setListas(l)
    } catch (err) {
      console.error('Erro ao carregar campos personalizados', err)
      toast({ title: 'Erro ao carregar campos personalizados', variant: 'destructive' })
    } finally {
      setCarregando(false)
    }
  }

  useEffect(() => {
    carregar()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const abrirNovoCampo = () => {
    setForm({ ...FORM_PADRAO })
    setModalCampoOpen(true)
  }

  const abrirEditarCampo = (campo: CampoPersonalizado) => {
    setForm({
      id: campo.id,
      categoria: campo.categoria,
      tipo: campo.tipo,
      nome_interno: campo.nome_interno || '',
      rotulo: campo.rotulo || '',
      mensagem_ajuda: campo.mensagem_ajuda || '',
      legenda: (campo as unknown as { legenda?: string }).legenda || '',
      opcoesTexto: Array.isArray(campo.opcoes) ? campo.opcoes.join('\n') : '',
      lista_selecao: campo.lista_selecao || '',
      obrigatorio: campo.obrigatorio,
      ativo: campo.ativo,
    })
    setModalCampoOpen(true)
  }

  const salvarCampo = async () => {
    if (!form.nome_interno.trim() || !form.rotulo.trim()) {
      toast({ title: 'Preencha o nome interno e o rótulo do campo', variant: 'destructive' })
      return
    }
    if (tipoUsaOpcoes(form.tipo)) {
      const ops = form.opcoesTexto
        .split('\n')
        .map((s) => s.trim())
        .filter(Boolean)
      if (ops.length === 0) {
        toast({
          title: 'Informe pelo menos uma opção para este tipo de campo',
          variant: 'destructive',
        })
        return
      }
    }
    if (form.tipo === 'lista_selecao' && !form.lista_selecao) {
      toast({ title: 'Selecione a lista de seleção deste campo', variant: 'destructive' })
      return
    }

    setSalvandoCampo(true)
    try {
      const payload: Record<string, unknown> = {
        categoria: form.categoria,
        tipo: form.tipo,
        nome_interno: form.nome_interno.trim(),
        rotulo: form.rotulo.trim(),
        mensagem_ajuda: form.mensagem_ajuda.trim(),
        legenda: form.legenda.trim(),
        obrigatorio: form.obrigatorio,
        ativo: form.ativo,
        opcoes: tipoUsaOpcoes(form.tipo)
          ? form.opcoesTexto
              .split('\n')
              .map((s) => s.trim())
              .filter(Boolean)
          : [],
        lista_selecao: form.tipo === 'lista_selecao' ? form.lista_selecao : '',
      }

      if (form.id) {
        await pb.collection('campos_personalizados').update(form.id, payload)
        toast({ title: 'Campo personalizado atualizado!' })
      } else {
        await pb.collection('campos_personalizados').create({
          ...payload,
          criado_por: user?.id || '',
        })
        toast({ title: 'Campo personalizado criado!' })
      }
      setModalCampoOpen(false)
      await carregar()
      onRecarregarGlobal?.()
    } catch (err) {
      console.error(err)
      toast({ title: 'Erro ao salvar campo', variant: 'destructive' })
    } finally {
      setSalvandoCampo(false)
    }
  }

  const alternarAtivo = async (campo: CampoPersonalizado) => {
    try {
      await pb.collection('campos_personalizados').update(campo.id, { ativo: !campo.ativo })
      toast({ title: campo.ativo ? 'Campo inativado.' : 'Campo reativado!' })
      await carregar()
      onRecarregarGlobal?.()
    } catch {
      toast({ title: 'Erro ao alterar o campo', variant: 'destructive' })
    }
  }

  const excluirCampo = async (campo: CampoPersonalizado) => {
    if (
      !confirm(
        `Excluir definitivamente o campo "${campo.rotulo}"? Esta ação não pode ser desfeita.`,
      )
    )
      return
    try {
      await pb.collection('campos_personalizados').delete(campo.id)
      toast({ title: 'Campo excluído.' })
      await carregar()
    } catch {
      toast({ title: 'Erro ao excluir campo', variant: 'destructive' })
    }
  }

  const ativos = campos.filter((c) => c.ativo)
  const inativos = campos.filter((c) => !c.ativo)
  const camposVisiveis = abaLista === 'ativos' ? ativos : inativos

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h3 className="text-sm font-bold text-[#1A1D21] flex items-center gap-2">
            <SlidersHorizontal className="w-4 h-4 text-[#0F766E]" />
            Campos Personalizados
          </h3>
          <p className="text-xs text-[#5B6470] mt-0.5">
            Crie campos extras para Cards, Pessoas e Empresas. Os campos aparecem nos cards e nos
            contatos, com validação de obrigatório.
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Button
            size="sm"
            onClick={abrirNovoCampo}
            className="bg-[#0F766E] hover:bg-[#0D5C56] text-white text-xs h-8 gap-1.5"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Adicionar novo campo personalizado</span>
          </Button>
        </div>
      </div>

      <Tabs value={abaLista} onValueChange={(v) => setAbaLista(v as 'ativos' | 'inativos')}>
        <TabsList className="bg-white border border-[#E5E1D8] p-1 h-auto">
          <TabsTrigger value="ativos" className="text-xs px-3 py-1.5">
            Ativos {ativos.length > 0 && `(${ativos.length})`}
          </TabsTrigger>
          <TabsTrigger value="inativos" className="text-xs px-3 py-1.5">
            Inativados {inativos.length > 0 && `(${inativos.length})`}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="ativos" className="m-0 mt-3">
          <ListaCampos
            campos={camposVisiveis}
            carregando={carregando}
            onEditar={abrirEditarCampo}
            onAlternarAtivo={alternarAtivo}
            onExcluir={excluirCampo}
            modoInativos={false}
          />
        </TabsContent>
        <TabsContent value="inativos" className="m-0 mt-3">
          <ListaCampos
            campos={camposVisiveis}
            carregando={carregando}
            onEditar={abrirEditarCampo}
            onAlternarAtivo={alternarAtivo}
            onExcluir={excluirCampo}
            modoInativos={true}
          />
        </TabsContent>
      </Tabs>

      {/* ===================== GESTÃO DE LISTAS DE SELEÇÃO ===================== */}
      <GestaoListasSelecao listas={listas} onRecarregar={carregar} />

      {/* ===================== MODAL NOVO/EDITAR CAMPO ===================== */}
      <Dialog open={modalCampoOpen} onOpenChange={setModalCampoOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-sm font-bold">
              {form.id ? 'Editar campo personalizado' : 'Adicionar novo campo personalizado'}
            </DialogTitle>
            <DialogDescription className="text-xs text-[#5B6470]">
              Fluxo: categoria → tipo → nome interno e rótulo → opções → obrigatório → legenda e
              mensagem de ajuda.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3.5">
            {/* 1. Categoria */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-[#1A1D21] uppercase">1. Categoria</label>
              <div className="flex gap-2">
                {(['card', 'pessoa', 'empresa'] as CampoCategoria[]).map((cat) => (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setForm((f) => ({ ...f, categoria: cat }))}
                    className={`flex-1 h-9 rounded-lg border text-xs font-semibold transition-colors ${
                      form.categoria === cat
                        ? 'bg-[#0F766E] text-white border-[#0F766E]'
                        : 'bg-white text-[#5B6470] border-[#E5E1D8] hover:bg-[#FAFAF9]'
                    }`}
                  >
                    {ROTULOS_CATEGORIA[cat]}
                  </button>
                ))}
              </div>
            </div>

            {/* 2. Tipo */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-[#1A1D21] uppercase">2. Tipo</label>
              <select
                value={form.tipo}
                onChange={(e) => setForm((f) => ({ ...f, tipo: e.target.value as CampoTipo }))}
                className="w-full h-9 rounded-md border border-[#E5E1D8] bg-white px-2 text-xs"
              >
                {TIPOS_CAMPO.map((t) => (
                  <option key={t} value={t}>
                    {ROTULOS_TIPO[t]}
                  </option>
                ))}
              </select>
            </div>

            {/* 3. Nome interno + Rótulo */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-[11px] font-semibold text-[#1A1D21]">
                  Nome interno (uso da organização)
                </label>
                <Input
                  value={form.nome_interno}
                  onChange={(e) => setForm((f) => ({ ...f, nome_interno: e.target.value }))}
                  placeholder="ex.: cpf_cliente"
                  className="text-xs h-8 border-[#E5E1D8]"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[11px] font-semibold text-[#1A1D21]">
                  Rótulo (título exibido)
                </label>
                <Input
                  value={form.rotulo}
                  onChange={(e) => setForm((f) => ({ ...f, rotulo: e.target.value }))}
                  placeholder="ex.: CPF"
                  className="text-xs h-8 border-[#E5E1D8]"
                />
              </div>
            </div>

            {/* 4. Opções ou Máscara ou Lista */}
            {tipoUsaOpcoes(form.tipo) && (
              <div className="space-y-1">
                <label className="text-[11px] font-semibold text-[#1A1D21]">
                  Opções (uma por linha)
                </label>
                <Textarea
                  rows={3}
                  value={form.opcoesTexto}
                  onChange={(e) => setForm((f) => ({ ...f, opcoesTexto: e.target.value }))}
                  placeholder={'ex.:\nLinkedIn\nInstagram\nFacebook'}
                  className="text-xs border-[#E5E1D8]"
                />
              </div>
            )}

            {form.tipo === 'lista_selecao' && (
              <div className="space-y-1">
                <label className="text-[11px] font-semibold text-[#1A1D21]">Lista de seleção</label>
                <select
                  value={form.lista_selecao}
                  onChange={(e) => setForm((f) => ({ ...f, lista_selecao: e.target.value }))}
                  className="w-full h-8 rounded-md border border-[#E5E1D8] bg-white px-2 text-xs"
                >
                  <option value="">Selecione uma lista...</option>
                  {listas
                    .filter((l) => l.ativo || l.id === form.lista_selecao)
                    .map((l) => (
                      <option key={l.id} value={l.id}>
                        {l.nome}
                      </option>
                    ))}
                </select>
                <p className="text-[10px] text-[#5B6470]">
                  Gerencie as listas pelo botão "Listas de Seleção".
                </p>
              </div>
            )}

            {/* 5. Obrigatório */}
            <div className="flex items-center gap-2">
              <Checkbox
                id="cp-obrigatorio"
                checked={form.obrigatorio}
                onCheckedChange={(chk) => setForm((f) => ({ ...f, obrigatorio: chk === true }))}
              />
              <label htmlFor="cp-obrigatorio" className="text-xs text-[#1A1D21] font-medium">
                Preenchimento obrigatório
              </label>
            </div>

            {/* 6. Legenda + mensagem de ajuda */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-[11px] font-semibold text-[#1A1D21]">
                  Legenda (placeholder)
                </label>
                <Input
                  value={form.legenda}
                  onChange={(e) => setForm((f) => ({ ...f, legenda: e.target.value }))}
                  placeholder="ex.: 000.000.000-00"
                  className="text-xs h-8 border-[#E5E1D8]"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[11px] font-semibold text-[#1A1D21]">
                  Mensagem de ajuda (opcional)
                </label>
                <Input
                  value={form.mensagem_ajuda}
                  onChange={(e) => setForm((f) => ({ ...f, mensagem_ajuda: e.target.value }))}
                  placeholder="Aparece abaixo do campo"
                  className="text-xs h-8 border-[#E5E1D8]"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-[#E5E1D8]">
              <Button
                size="sm"
                variant="outline"
                onClick={() => setModalCampoOpen(false)}
                className="text-xs h-8"
              >
                Cancelar
              </Button>
              <Button
                size="sm"
                onClick={salvarCampo}
                disabled={salvandoCampo}
                className="bg-[#0F766E] hover:bg-[#0D5C56] text-white text-xs h-8 gap-1.5"
              >
                {salvandoCampo && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                <span>Salvar</span>
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

function ListaCampos({
  campos,
  carregando,
  onEditar,
  onAlternarAtivo,
  onExcluir,
  modoInativos,
}: {
  campos: CampoPersonalizado[]
  carregando: boolean
  onEditar: (c: CampoPersonalizado) => void
  onAlternarAtivo: (c: CampoPersonalizado) => void
  onExcluir: (c: CampoPersonalizado) => void
  modoInativos: boolean
}) {
  if (carregando) {
    return (
      <div className="flex items-center gap-2 text-xs text-[#5B6470] py-6 justify-center">
        <Loader2 className="w-4 h-4 animate-spin" />
        Carregando campos...
      </div>
    )
  }
  if (campos.length === 0) {
    return (
      <div className="text-center py-8 border border-dashed border-[#E5E1D8] rounded-xl bg-[#FAFAF9]">
        <ListChecks className="w-6 h-6 text-[#5B6470] mx-auto mb-2" />
        <p className="text-xs text-[#5B6470]">
          {modoInativos
            ? 'Nenhum campo inativado. Campos inativados aparecem aqui para reativação ou exclusão.'
            : 'Nenhum campo personalizado ainda. Clique em "Adicionar novo campo personalizado".'}
        </p>
      </div>
    )
  }
  return (
    <div className="rounded-xl border border-[#E5E1D8] bg-white divide-y divide-[#E5E1D8]/70 overflow-hidden">
      {campos.map((campo) => (
        <div key={campo.id} className="flex items-center justify-between gap-3 px-3.5 py-2.5">
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-bold text-[#1A1D21]">{campo.rotulo}</span>
              <Badge variant="outline" className="text-[9px] text-[#5B6470]">
                {ROTULOS_CATEGORIA[campo.categoria]}
              </Badge>
              <Badge variant="outline" className="text-[9px] text-[#5B6470]">
                {ROTULOS_TIPO[campo.tipo]}
              </Badge>
              {campo.obrigatorio && (
                <Badge variant="outline" className="text-[9px] text-red-600 border-red-200">
                  Obrigatório
                </Badge>
              )}
            </div>
            <p className="text-[10px] text-[#5B6470] mt-0.5 truncate">
              {campo.nome_interno}
              {Array.isArray(campo.opcoes) &&
                campo.opcoes.length > 0 &&
                ` • opções: ${campo.opcoes.join(', ')}`}
            </p>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            <Button
              size="sm"
              variant="ghost"
              className="h-7 w-7 p-0"
              title="Editar campo"
              onClick={() => onEditar(campo)}
            >
              <Pencil className="w-3.5 h-3.5 text-[#5B6470]" />
            </Button>
            <Button
              size="sm"
              variant="ghost"
              className="h-7 w-7 p-0"
              title={modoInativos ? 'Reativar campo' : 'Inativar campo'}
              onClick={() => onAlternarAtivo(campo)}
            >
              {modoInativos ? (
                <RotateCcw className="w-3.5 h-3.5 text-emerald-600" />
              ) : (
                <Ban className="w-3.5 h-3.5 text-amber-600" />
              )}
            </Button>
            {modoInativos && (
              <Button
                size="sm"
                variant="ghost"
                className="h-7 w-7 p-0"
                title="Excluir campo"
                onClick={() => onExcluir(campo)}
              >
                <Trash2 className="w-3.5 h-3.5 text-red-500" />
              </Button>
            )}
          </div>
        </div>
      ))}
    </div>
  )
}
