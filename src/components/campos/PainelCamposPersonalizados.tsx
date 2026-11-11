// Painel dos Campos Personalizados da entidade — modelo Ummense:
// caixa de busca (placeholder "campo personalizado") → insere do catálogo ou cria
// novo; campo inserido vem VAZIO com o rótulo como placeholder; caixa própria por tipo
// (renderizada pelo componente compartilhado CampoValorBox).
import { forwardRef, useImperativeHandle, useState } from 'react'
import { X } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import CaixaSelecaoCampo from '@/components/campos/CaixaSelecaoCampo'
import CampoValorBox from '@/components/campos/CampoValorBox'
import ModalCriarCampoPersonalizado from '@/components/campos/ModalCriarCampoPersonalizado'
import {
  useCamposPersonalizados,
  type AlvoCampos,
} from '@/components/campos/useCamposPersonalizados'
import type { CampoPersonalizado } from '@/services/camposPersonalizados'

export interface PainelCamposPersonalizadosHandle {
  salvar: () => Promise<boolean>
  salvarEm: (novoAlvo: AlvoCampos) => Promise<boolean>
  validarObrigatorios: () => boolean
}

interface Props {
  categoria: CampoPersonalizado['categoria']
  alvo: AlvoCampos
  titulo?: string
}

const PainelCamposPersonalizados = forwardRef<PainelCamposPersonalizadosHandle, Props>(
  function PainelCamposPersonalizados({ categoria, alvo, titulo }, ref) {
    const cp = useCamposPersonalizados(categoria, alvo)
    const [modalCriarOpen, setModalCriarOpen] = useState(false)
    const alvoAtivo = !!(alvo.card || alvo.contato || alvo.projeto || alvo.fluxo)

    useImperativeHandle(ref, () => ({
      salvar: cp.salvar,
      salvarEm: cp.salvarEm,
      validarObrigatorios: cp.validarObrigatorios,
    }))

    const handleSalvoCriacao = async (criados: CampoPersonalizado[]) => {
      for (const c of criados) {
        await cp.inserirCampo(c)
      }
    }

    // Sem alvo (ex.: card novo ainda sem id) o painel TAMBÉM aparece: a caixa lista
    // o catálogo inteiro, o campo incluído fica vazio localmente e os valores só são
    // gravados quando a entidade for criada/salva.

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

                      <CampoValorBox
                        campo={campo}
                        valor={valor}
                        onChange={(v) => cp.setValor(campo.id, v)}
                        listas={cp.listas}
                        bordaErro={erro}
                      />

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
