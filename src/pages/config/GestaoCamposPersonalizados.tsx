// Gestão de Campos Personalizados dentro de /config (modelo Ummense adaptado).
// Modal alinhado ao fluxo do card (0.0.106): categoria MULTI-SELEÇÃO (Card/Pessoa/
// Empresa + atalho "Todas"), criando um registro por categoria marcada, e
// PRÉ-VISUALIZAÇÃO ao vivo da caixa real pelo CampoValorBox compartilhado.
import { useEffect, useMemo, useState } from 'react'
import { useAuth } from '@/hooks/use-auth'
import { useToast } from '@/hooks/use-toast'
import pb from '@/lib/pocketbase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
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
  Eye,
} from 'lucide-react'
import CampoValorBox from '@/components/campos/CampoValorBox'
import {
  ROTULOS_CATEGORIA,
  ROTULOS_TIPO,
  criarCampoPersonalizado,
  tipoUsaListaSelecao,
  tipoUsaOpcoes,
  type CampoPersonalizado,
  type CampoCategoria,
  type CampoTipo,
  type ListaSelecao,
} from '@/services/camposPersonalizados'
import { cn } from '@/lib/utils'
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

const TODAS_CATEGORIAS: CampoCategoria[] = ['card', 'pessoa', 'empresa']

interface FormCampoState {
  id: string | null
  categorias: CampoCategoria[]
  /** categorias como estão hoje no banco (edição) — para detectar mudança do usuário */
  categoriasPersistidas: CampoCategoria[]
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
  categorias: [],
  categoriasPersistidas: [],
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

// Campo fictício só para alimentar a pré-visualização da caixa real
function campoPreview(form: FormCampoState): Parameters<typeof CampoValorBox>[0]['campo'] {
  return {
    id: 'preview',
    tipo: form.tipo,
    rotulo: form.rotulo.trim() || 'Pré-visualização',
    obrigatorio: false,
    opcoes: form.opcoesTexto
      .split('\n')
      .map((s) => s.trim())
      .filter(Boolean),
    lista_selecao: form.lista_selecao,
  }
}

export default function GestaoCamposPersonalizados({
  onRecarregarGlobal,
  campoIdSelecionado,
  onFecharItemSelecionado,
}: {
  onRecarregarGlobal?: () => void
  /** id do campo vindo da URL (?campo_id=) — clique na 2ª coluna de Configurações */
  campoIdSelecionado?: string
  /** remove campo_id da URL quando o item não existe ou o modal é fechado */
  onFecharItemSelecionado?: () => void
}) {
  const { user } = useAuth()
  const { toast } = useToast()

  const [campos, setCampos] = useState<CampoPersonalizado[]>([])
  const [listas, setListas] = useState<ListaSelecao[]>([])
  const [carregando, setCarregando] = useState(true)
  const [modalCampoOpen, setModalCampoOpen] = useState(false)
  const [form, setForm] = useState<FormCampoState>(FORM_PADRAO)
  const [salvandoCampo, setSalvandoCampo] = useState(false)
  const [abaLista, setAbaLista] = useState<'ativos' | 'inativos'>('ativos')

  // estado só do preview (a caixa real precisa de um valor para interagir)
  const [valorPreview, setValorPreview] = useState<unknown>(null)

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

  // Item vindo da URL: abre direto o modal de edição daquele campo (padrão WhatsApp:
  // o clique na coluna abre o MESMO conteúdo da página grande). Se o campo não existir
  // mais, limpa o parâmetro da URL.
  useEffect(() => {
    if (!campoIdSelecionado || carregando) return
    const campo = campos.find((c) => c.id === campoIdSelecionado)
    if (campo) {
      setAbaLista(campo.ativo ? 'ativos' : 'inativos')
      abrirEditarCampo(campo)
    } else {
      onFecharItemSelecionado?.()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [campoIdSelecionado, campos, carregando])

  const abrirNovoCampo = () => {
    setForm({ ...FORM_PADRAO })
    setValorPreview(null)
    setModalCampoOpen(true)
  }

  // Categoria legada (registro único) é lida como "todas" até o usuário editar.
  const categoriasDoCampo = (campo: CampoPersonalizado): CampoCategoria[] =>
    campo.categoria ? TODAS_CATEGORIAS : []

  const abrirEditarCampo = (campo: CampoPersonalizado) => {
    setForm({
      id: campo.id,
      categorias: categoriasDoCampo(campo),
      categoriasPersistidas: categoriasDoCampo(campo),
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
    setValorPreview(null)
    setModalCampoOpen(true)
  }

  const alternarCategoria = (cat: CampoCategoria) => {
    setForm((f) => ({
      ...f,
      categorias: f.categorias.includes(cat)
        ? f.categorias.filter((c) => c !== cat)
        : [...f.categorias, cat],
    }))
  }

  const marcarTodasCategorias = () => {
    setForm((f) => ({
      ...f,
      categorias: TODAS_CATEGORIAS.every((c) => f.categorias.includes(c))
        ? []
        : [...TODAS_CATEGORIAS],
    }))
  }

  const validarForm = (): boolean => {
    if (form.categorias.length === 0) {
      toast({
        title: 'Marque ao menos uma categoria (Card, Pessoa ou Empresa).',
        variant: 'destructive',
      })
      return false
    }
    if (!form.nome_interno.trim() || !form.rotulo.trim()) {
      toast({ title: 'Preencha o nome interno e o rótulo do campo', variant: 'destructive' })
      return false
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
        return false
      }
    }
    if (form.tipo === 'lista_selecao' && !form.lista_selecao) {
      toast({ title: 'Selecione a lista de seleção deste campo', variant: 'destructive' })
      return false
    }
    return true
  }

  const salvarCampo = async () => {
    if (!validarForm()) return

    setSalvandoCampo(true)
    try {
      const payload: Record<string, unknown> = {
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

      const mudouCategorias = (() => {
        const normaliza = (arr: CampoCategoria[]) =>
          arr.length === TODAS_CATEGORIAS.length
            ? [...TODAS_CATEGORIAS].sort().join(',')
            : [...arr].sort().join(',')
        return normaliza(form.categorias) !== normaliza(form.categoriasPersistidas)
      })()

      if (form.id) {
        // Edição: atualiza o registro existente. A categoria só é reescrita se o
        // usuário mexeu nas categorias (categoria legada preservada intacta).
        await pb.collection('campos_personalizados').update(form.id, {
          ...payload,
          ...(mudouCategorias ? { categoria: form.categorias[0] } : {}),
        })
        toast({ title: 'Campo personalizado atualizado!' })
      } else {
        // Criação multi-categoria: um registro por categoria marcada (mesmo
        // mecanismo do modal do card, build 0.0.106).
        for (const cat of form.categorias) {
          await criarCampoPersonalizado({
            ...(payload as unknown as Omit<CampoPersonalizado, 'id' | 'created' | 'updated'>),
            categoria: cat,
            criado_por: user?.id || '',
          } as Parameters<typeof criarCampoPersonalizado>[0])
        }
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

  // Campos gêmeos: mesmo nome interno = mesma definição criada para várias categorias
  const gruposCampos = useMemo(() => {
    const grupos = new Map<string, CampoPersonalizado[]>()
    for (const c of campos) {
      const chave = c.nome_interno || c.id
      const arr = grupos.get(chave) || []
      arr.push(c)
      grupos.set(chave, arr)
    }
    return Array.from(grupos.values())
  }, [campos])

  const ativos = gruposCampos.filter((g) => g[0].ativo)
  const inativos = gruposCampos.filter((g) => !g[0].ativo)
  const gruposVisiveis = abaLista === 'ativos' ? ativos : inativos

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
            grupos={gruposVisiveis}
            carregando={carregando}
            onEditar={abrirEditarCampo}
            onAlternarAtivo={alternarAtivo}
            onExcluir={excluirCampo}
            modoInativos={false}
          />
        </TabsContent>
        <TabsContent value="inativos" className="m-0 mt-3">
          <ListaCampos
            grupos={gruposVisiveis}
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
      <Dialog
        open={modalCampoOpen}
        onOpenChange={(o) => {
          setModalCampoOpen(o)
          if (!o) onFecharItemSelecionado?.()
        }}
      >
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-sm font-bold">
              {form.id ? 'Editar campo personalizado' : 'Adicionar novo campo personalizado'}
            </DialogTitle>
            <DialogDescription className="text-xs text-[#5B6470]">
              Fluxo: categorias → tipo → nome interno e rótulo → opções → obrigatório → legenda e
              mensagem de ajuda — com pré-visualização da caixa real.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3.5">
            {/* 1. Categoria — multi-seleção com atalho "Todas" */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-[#1A1D21] uppercase">
                1. Categorias
              </label>
              <div className="flex flex-wrap items-center gap-3">
                {TODAS_CATEGORIAS.map((cat) => (
                  <label
                    key={cat}
                    className="flex items-center gap-1.5 text-xs text-[#1A1D21] cursor-pointer"
                  >
                    <Checkbox
                      checked={form.categorias.includes(cat)}
                      onCheckedChange={() => alternarCategoria(cat)}
                    />
                    {ROTULOS_CATEGORIA[cat]}
                  </label>
                ))}
                <button
                  type="button"
                  onClick={marcarTodasCategorias}
                  className={cn(
                    'text-xs font-medium underline-offset-2 hover:underline',
                    TODAS_CATEGORIAS.every((c) => form.categorias.includes(c))
                      ? 'text-[#0F766E]'
                      : 'text-[#5B6470]',
                  )}
                >
                  Todas
                </button>
              </div>
            </div>

            {/* 2. Tipo */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-[#1A1D21] uppercase">2. Tipo</label>
              <select
                value={form.tipo}
                onChange={(e) => {
                  setValorPreview(null)
                  setForm((f) => ({ ...f, tipo: e.target.value as CampoTipo }))
                }}
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

            {/* 4. Opções ou Lista de Seleção */}
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

            {/* Pré-visualização da caixa real (mesmo componente do painel da entidade) */}
            <div className="space-y-1.5 rounded-lg border border-[#E5E1D8] bg-[#FAFAF9] p-3">
              <div className="flex items-center gap-1.5">
                <Eye className="w-3.5 h-3.5 text-[#0F766E]" />
                <span className="text-[11px] font-bold text-[#1A1D21] uppercase tracking-wide">
                  Pré-visualização
                </span>
              </div>
              <CampoValorBox
                campo={campoPreview(form)}
                valor={valorPreview}
                onChange={(v) => setValorPreview(v)}
                listas={listas}
                preview
                idRadio="preview_campo"
                placeholderOverride={
                  form.legenda.trim() || form.rotulo.trim() || 'Pré-visualização'
                }
              />
              <p className="text-[10px] text-[#5B6470]">
                Assim a caixa aparece no card, no contato e nas demais entidades.
              </p>
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
  grupos,
  carregando,
  onEditar,
  onAlternarAtivo,
  onExcluir,
  modoInativos,
}: {
  grupos: CampoPersonalizado[][]
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
  if (grupos.length === 0) {
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
      {grupos.map((grupo) => {
        const campo = grupo[0]
        const cats = grupo.map((c) => c.categoria)
        return (
          <div key={campo.id} className="flex items-center justify-between gap-3 px-3.5 py-2.5">
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs font-bold text-[#1A1D21]">{campo.rotulo}</span>
                {TODAS_CATEGORIAS.filter((c) => cats.includes(c)).map((c) => (
                  <Badge key={c} variant="outline" className="text-[9px] text-[#5B6470]">
                    {ROTULOS_CATEGORIA[c]}
                  </Badge>
                ))}
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
        )
      })}
    </div>
  )
}
