// Painel dos Campos Personalizados da entidade — modelo Ummense:
// caixa de busca (placeholder "campo personalizado") → insere do catálogo ou cria
// novo; campo inserido vem VAZIO com o rótulo como placeholder; caixa própria por tipo.
import { forwardRef, useEffect, useImperativeHandle, useState } from 'react'
import { X } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import CaixaSelecaoCampo from '@/components/campos/CaixaSelecaoCampo'
import ModalCriarCampoPersonalizado from '@/components/campos/ModalCriarCampoPersonalizado'
import {
  useCamposPersonalizados,
  type AlvoCampos,
} from '@/components/campos/useCamposPersonalizados'
import {
  aplicarMascaraMoeda,
  tipoUsaMascara,
  type CampoCategoria,
  type CampoPersonalizado,
} from '@/services/camposPersonalizados'

export interface PainelCamposPersonalizadosHandle {
  salvar: () => Promise<boolean>
  validarObrigatorios: () => boolean
}

interface Props {
  categoria: CampoCategoria
  alvo: AlvoCampos
  titulo?: string
}

function formatarHora(value: string): string {
  const d = (value || '').replace(/\D/g, '').slice(0, 4)
  if (d.length <= 2) return d
  return `${d.slice(0, 2)}:${d.slice(2)}`
}

const PainelCamposPersonalizados = forwardRef<PainelCamposPersonalizadosHandle, Props>(
  function PainelCamposPersonalizados({ categoria, alvo, titulo }, ref) {
    const cp = useCamposPersonalizados(categoria, alvo)
    const [modalCriarOpen, setModalCriarOpen] = useState(false)
    const alvoAtivo = !!(alvo.card || alvo.contato || alvo.projeto || alvo.fluxo)

    useImperativeHandle(ref, () => ({
      salvar: cp.salvar,
      validarObrigatorios: cp.validarObrigatorios,
    }))

    // Fallback: sem alvo (ex.: card novo no modal) mostra só a caixa; ao salvar o
    // card os valores são gravados junto pelo mesmo hook no pai.
    useEffect(() => {
      if (!alvoAtivo) {
        cp.recarregar()
      }
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [alvoAtivo])

    const handleSalvoCriacao = async (criados: CampoPersonalizado[]) => {
      for (const c of criados) {
        await cp.inserirCampo(c)
      }
    }

    if (!alvoAtivo) return null

    return (
      <Card className="border-[#E5E1D8] bg-white shadow-xs">
        <CardHeader className="pb-2">
          <CardTitle className="text-xs font-bold text-[#1A1D21] uppercase tracking-wider">
            {titulo || 'Campos Personalizados'}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4 pt-2 space-y-3">
          {/* Caixa de busca — mesmo formato da busca de contatos */}
          <CaixaSelecaoCampo
            catalogo={cp.camposCatalogo}
            jaInseridos={cp.campos.map((c) => c.id)}
            onInserir={(c) => {
              void cp.inserirCampo(c)
            }}
            onCriarNovo={() => setModalCriarOpen(true)}
            abrirCatalogo={true}
          />

          {cp.carregando ? (
            <p className="text-[11px] text-[#5B6470]">Carregando campos...</p>
          ) : (
            cp.campos.length > 0 && (
              <div className="space-y-3 pt-1">
                {cp.campos.map((campo) => {
                  const valor = cp.valores[campo.id]
                  const erro = cp.erroObrigatorio[campo.id]
                  const classeErro = erro ? 'border-red-400' : 'border-[#E5E1D8]'
                  return (
                    <div key={campo.id} className="space-y-1.5">
                      <div className="flex items-center justify-between gap-2">
                        <Label className="text-[10px] font-semibold text-[#1A1D21] uppercase tracking-wide">
                          {campo.rotulo}
                          {campo.obrigatorio && <span className="text-red-500"> *</span>}
                        </Label>
                        <button
                          type="button"
                          onClick={() => void cp.removerCampo(campo.id)}
                          title="Remover campo desta entidade"
                          className="text-[#5B6470] hover:text-red-600"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      {campo.mensagem_ajuda && (
                        <p className="text-[10px] text-[#5B6470]">{campo.mensagem_ajuda}</p>
                      )}

                      {campo.tipo === 'texto_curto' && (
                        <Input
                          value={typeof valor === 'string' ? valor : ''}
                          onChange={(e) => cp.setValor(campo.id, e.target.value)}
                          placeholder={campo.rotulo}
                          className={classeErro}
                        />
                      )}

                      {campo.tipo === 'texto_longo' && (
                        <Textarea
                          rows={3}
                          value={typeof valor === 'string' ? valor : ''}
                          onChange={(e) => cp.setValor(campo.id, e.target.value)}
                          placeholder={campo.rotulo}
                          className={classeErro}
                        />
                      )}

                      {campo.tipo === 'numero' && (
                        <Input
                          value={typeof valor === 'string' ? valor : ''}
                          onChange={(e) => cp.setValorComMascara(campo, e.target.value)}
                          placeholder={tipoUsaMascara(campo.tipo) ? '000.000.000-00' : campo.rotulo}
                          className={classeErro}
                        />
                      )}

                      {campo.tipo === 'moeda' && (
                        <Input
                          value={typeof valor === 'string' ? valor : ''}
                          onChange={(e) =>
                            cp.setValor(campo.id, aplicarMascaraMoeda(e.target.value))
                          }
                          placeholder="R$ 0,00"
                          className={classeErro}
                        />
                      )}

                      {campo.tipo === 'select' && (
                        <select
                          value={typeof valor === 'string' ? valor : ''}
                          onChange={(e) => cp.setValor(campo.id, e.target.value)}
                          className={`w-full h-9 rounded-md border bg-white px-2 text-xs outline-none focus:border-[#0F766E] ${classeErro}`}
                        >
                          <option value="">{campo.rotulo}</option>
                          {(campo.opcoes || []).map((op) => (
                            <option key={op} value={op}>
                              {op}
                            </option>
                          ))}
                        </select>
                      )}

                      {campo.tipo === 'radio' && (
                        <div className="space-y-1.5">
                          {(campo.opcoes || []).map((op) => (
                            <label
                              key={op}
                              className="flex items-center gap-2 text-xs text-[#1A1D21] cursor-pointer"
                            >
                              <input
                                type="radio"
                                name={`campo_${campo.id}`}
                                checked={valor === op}
                                onChange={() => cp.setValor(campo.id, op)}
                                className="accent-[#0F766E]"
                              />
                              {op}
                            </label>
                          ))}
                        </div>
                      )}

                      {campo.tipo === 'checkbox' && (
                        <label className="flex items-center gap-2 text-xs text-[#1A1D21] cursor-pointer">
                          <Checkbox
                            checked={valor === true}
                            onCheckedChange={(v) => cp.setValor(campo.id, v === true)}
                          />
                          {campo.rotulo}
                        </label>
                      )}

                      {campo.tipo === 'lista_checkbox' && (
                        <div className="space-y-1.5">
                          {(campo.opcoes || []).map((op) => {
                            const arr = Array.isArray(valor) ? (valor as string[]) : []
                            const marcado = arr.includes(op)
                            return (
                              <label
                                key={op}
                                className="flex items-center gap-2 text-xs text-[#1A1D21] cursor-pointer"
                              >
                                <Checkbox
                                  checked={marcado}
                                  onCheckedChange={(v) => {
                                    const prox =
                                      v === true ? [...arr, op] : arr.filter((x) => x !== op)
                                    cp.setValor(campo.id, prox)
                                  }}
                                />
                                {op}
                              </label>
                            )
                          })}
                        </div>
                      )}

                      {campo.tipo === 'seletor_horario' && (
                        <Input
                          type="time"
                          value={typeof valor === 'string' ? valor : formatarHora('')}
                          onChange={(e) => cp.setValor(campo.id, e.target.value)}
                          placeholder="HH:MM"
                          className={classeErro}
                        />
                      )}

                      {campo.tipo === 'seletor_data' && (
                        <Input
                          type="date"
                          value={typeof valor === 'string' ? valor : ''}
                          onChange={(e) => cp.setValor(campo.id, e.target.value)}
                          className={classeErro}
                        />
                      )}

                      {campo.tipo === 'lista_selecao' && (
                        <select
                          value={typeof valor === 'string' ? valor : ''}
                          onChange={(e) => cp.setValor(campo.id, e.target.value)}
                          className={`w-full h-9 rounded-md border bg-white px-2 text-xs outline-none focus:border-[#0F766E] ${classeErro}`}
                        >
                          <option value="">{campo.rotulo}</option>
                          {(cp.listas.find((l) => l.id === campo.lista_selecao)?.itens || []).map(
                            (item) => (
                              <option key={item} value={item}>
                                {item}
                              </option>
                            ),
                          )}
                        </select>
                      )}

                      {erro && <p className="text-[10px] text-red-500">Campo obrigatório.</p>}
                    </div>
                  )
                })}
              </div>
            )
          )}
        </CardContent>

        <ModalCriarCampoPersonalizado
          open={modalCriarOpen}
          onOpenChange={setModalCriarOpen}
          categoriasSugeridas={[categoria]}
          listas={cp.listas}
          onSalvo={handleSalvoCriacao}
        />
      </Card>
    )
  },
)

export default PainelCamposPersonalizados
