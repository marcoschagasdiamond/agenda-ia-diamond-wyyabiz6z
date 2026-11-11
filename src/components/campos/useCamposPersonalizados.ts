// Hook compartilhado dos Campos Personalizados por entidade (card, pessoa, empresa).
// A entidade começa EM BRANCO: os campos só entram quando o usuário os insere pela
// caixa de busca (CaixaSelecaoCampo), e o campo inserido vem vazio (rótulo como
// placeholder). Os valores persistem em valores_campos_personalizados.
import { useCallback, useEffect, useState } from 'react'
import { useAuth } from '@/hooks/use-auth'
import {
  aplicarMascaraMoeda,
  aplicarMascaraNumero,
  listarCamposPersonalizados,
  listarListasSelecao,
  listarValoresPorAlvo,
  salvarValorCampo,
  tipoUsaMascara,
  type CampoPersonalizado,
  type CampoCategoria,
  type ListaSelecao,
  type ValorCampoPersonalizado,
} from '@/services/camposPersonalizados'

export type AlvoCampos = { card?: string; contato?: string; projeto?: string; fluxo?: string }

export function valorInicialTexto(valor: unknown): string {
  if (valor == null) return ''
  if (typeof valor === 'string') return valor
  return String(valor)
}

export function campoEstaVazio(valor: unknown): boolean {
  if (valor == null) return true
  if (typeof valor === 'string') return valor.trim() === ''
  if (Array.isArray(valor)) return valor.length === 0
  return false
}

export function useCamposPersonalizados(categoria: CampoCategoria, alvo: AlvoCampos) {
  const { user } = useAuth()
  const [campos, setCampos] = useState<CampoPersonalizado[]>([])
  const [valores, setValores] = useState<Record<string, unknown>>({})
  const [originais, setOriginais] = useState<Record<string, ValorCampoPersonalizado>>({})
  const [listas, setListas] = useState<ListaSelecao[]>([])
  const [camposCatalogo, setCamposCatalogo] = useState<CampoPersonalizado[]>([])
  const [carregando, setCarregando] = useState(true)
  const [salvando, setSalvando] = useState(false)
  const [erroObrigatorio, setErroObrigatorio] = useState<Record<string, boolean>>({})

  const alvoAtivo = !!(alvo.card || alvo.contato || alvo.projeto || alvo.fluxo)

  const carregar = useCallback(async () => {
    setCarregando(true)
    try {
      // O catálogo é carregado SEMPRE (todas as categorias ativas), independente de
      // alvo: no card NOVO (ainda sem id) a caixa de busca já lista os campos
      // criados. A categoria NÃO filtra mais o catálogo — campos de qualquer
      // categoria podem ser incluídos em card, contato, projeto ou fluxo.
      const [catalogo, listasSel] = await Promise.all([
        listarCamposPersonalizados(true),
        listarListasSelecao(true),
      ])
      // Valores só são lidos quando a entidade já tem id (alvo)
      const vals = alvoAtivo ? await listarValoresPorAlvo(alvo) : []
      // Campos JÁ INSERIDOS nesta entidade (vínculo por instância: existe um
      // registro de valor — mesmo vazio — para ela). Sem registro, não aparece.
      const vinculados = catalogo.filter((c) => vals.some((v) => v.campo === c.id))
      const mapa: Record<string, unknown> = {}
      const mapOrig: Record<string, ValorCampoPersonalizado> = {}
      vals.forEach((v) => {
        mapa[v.campo] = v.valor
        mapOrig[v.campo] = v
      })
      setCampos(vinculados)
      setValores(mapa)
      setOriginais(mapOrig)
      setListas(listasSel)
      setCamposCatalogo(catalogo)
    } catch (err) {
      console.error('Erro ao carregar campos personalizados', err)
    } finally {
      setCarregando(false)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [categoria, alvo.card, alvo.contato, alvo.projeto, alvo.fluxo, alvoAtivo])

  useEffect(() => {
    carregar()
  }, [carregar])

  const setValor = useCallback((campoId: string, valor: unknown) => {
    setValores((prev) => ({ ...prev, [campoId]: valor }))
    setErroObrigatorio((prev) => ({ ...prev, [campoId]: false }))
  }, [])

  const setValorComMascara = useCallback(
    (campo: CampoPersonalizado, bruto: string) => {
      if (!tipoUsaMascara(campo.tipo)) {
        setValor(campo.id, bruto)
        return
      }
      setValor(campo.id, aplicarMascaraNumero(bruto))
    },
    [setValor],
  )

  // Insere um campo do catálogo nesta entidade: cria o registro de valor vazio
  // (o campo aparece VAZIO, com o rótulo como placeholder) e o inclui na lista.
  const inserirCampo = useCallback(
    async (campo: CampoPersonalizado): Promise<boolean> => {
      if (campos.some((c) => c.id === campo.id)) return false
      // Entidade ainda sem id (card novo): inclui localmente e vazio — os valores
      // só são gravados quando a entidade for criada/salva.
      if (!alvoAtivo) {
        setCampos((prev) => [...prev, campo])
        setValores((prev) => ({
          ...prev,
          [campo.id]: campo.tipo === 'checkbox' ? false : null,
        }))
        setCamposCatalogo((prev) => (prev.some((c) => c.id === campo.id) ? prev : [...prev, campo]))
        return true
      }
      try {
        await salvarValorCampo(campo.id, alvo, campo.tipo === 'checkbox' ? false : null, user?.id)
        setCampos((prev) => [...prev, campo])
        setValores((prev) => ({
          ...prev,
          [campo.id]: campo.tipo === 'checkbox' ? false : null,
        }))
        setCamposCatalogo((prev) => (prev.some((c) => c.id === campo.id) ? prev : [...prev, campo]))
        return true
      } catch (err) {
        console.error('Erro ao inserir campo personalizado', err)
        return false
      }
    },
    [alvo, alvoAtivo, campos, user?.id],
  )

  const removerCampo = useCallback(
    async (campoId: string): Promise<boolean> => {
      if (!alvoAtivo) return false
      try {
        const orig = originais[campoId]
        if (orig) {
          await pbRemoverValor(orig.id)
          setOriginais((prev) => {
            const prox = { ...prev }
            delete prox[campoId]
            return prox
          })
        }
        setCampos((prev) => prev.filter((c) => c.id !== campoId))
        setValores((prev) => {
          const prox = { ...prev }
          delete prox[campoId]
          return prox
        })
        return true
      } catch (err) {
        console.error('Erro ao remover campo personalizado', err)
        return false
      }
    },
    [alvoAtivo, originais],
  )

  // Valida obrigatórios: true se tudo ok; false (marcando erros) se faltou preencher
  const validarObrigatorios = useCallback((): boolean => {
    const erros: Record<string, boolean> = {}
    campos.forEach((c) => {
      if (c.obrigatorio && campoEstaVazio(valores[c.id])) erros[c.id] = true
    })
    setErroObrigatorio(erros)
    return Object.keys(erros).length === 0
  }, [campos, valores])

  // Grava os campos atuais em um alvo RECÉM-CRIADO (ex.: card novo acabou de
  // ganhar id) — usado pelo modal de criação para persistir o que foi preenchido.
  const salvarEm = useCallback(
    async (novoAlvo: AlvoCampos): Promise<boolean> => {
      const temAlvo = !!(novoAlvo.card || novoAlvo.contato || novoAlvo.projeto || novoAlvo.fluxo)
      if (!temAlvo) return true
      setSalvando(true)
      try {
        for (const campo of campos) {
          await salvarValorCampo(campo.id, novoAlvo, valores[campo.id] ?? null, user?.id)
        }
        return true
      } catch (err) {
        console.error('Erro ao salvar campos personalizados', err)
        return false
      } finally {
        setSalvando(false)
      }
    },
    [campos, user?.id, valores],
  )

  // Grava só o que mudou (upsert campo+alvo em valores_campos_personalizados)
  const salvar = useCallback(async (): Promise<boolean> => {
    // Sem alvo (entidade ainda não criada) não há onde gravar os valores ainda.
    if (!alvoAtivo) return true
    setSalvando(true)
    try {
      for (const campo of campos) {
        const valorAtual = valores[campo.id]
        const original = originais[campo.id]
        const originalJson = JSON.stringify(original?.valor ?? null)
        const atualJson = JSON.stringify(valorAtual ?? null)
        if (originalJson === atualJson) continue
        await salvarValorCampo(campo.id, alvo, valorAtual ?? null, user?.id)
      }
      if (alvoAtivo) {
        const vals = await listarValoresPorAlvo(alvo)
        const mapOrig: Record<string, ValorCampoPersonalizado> = {}
        vals.forEach((v) => {
          mapOrig[v.campo] = v
        })
        setOriginais((prev) => ({ ...prev, ...mapOrig }))
      }
      return true
    } catch (err) {
      console.error('Erro ao salvar campos personalizados', err)
      return false
    } finally {
      setSalvando(false)
    }
  }, [alvo, alvoAtivo, campos, originais, user?.id, valores])

  return {
    campos,
    valores,
    listas,
    camposCatalogo,
    carregando,
    salvando,
    erroObrigatorio,
    setValor,
    setValorComMascara,
    inserirCampo,
    removerCampo,
    validarObrigatorios,
    salvar,
    salvarEm,
    recarregar: carregar,
  }
}

import pb from '@/lib/pocketbase/client'

async function pbRemoverValor(registroId: string): Promise<void> {
  await pb.collection('valores_campos_personalizados').delete(registroId)
}
