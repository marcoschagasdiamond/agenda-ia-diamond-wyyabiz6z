// Hook compartilhado do painel de Campos Personalizados (modelo Ummense adaptado).
// Centraliza carregamento de campos/listas, valores do alvo (card ou contato),
// aplicação de máscara e validação de obrigatórios — consumido pelo PainelCamposPersonalizados,
// que renderiza em ContatoDetalhes, CardDetalhes (/card/:id) e no modal de card do Kanban (/fluxo).
import { useCallback, useEffect, useState } from 'react'
import { useAuth } from '@/hooks/use-auth'
import {
  aplicarMascara,
  listarCamposPersonalizados,
  listarListasSelecao,
  listarValoresPorAlvo,
  salvarValorCampo,
  type CampoPersonalizado,
  type ListaSelecao,
  type ValorCampoPersonalizado,
} from '@/services/camposPersonalizados'

export type AlvoCampos = { card?: string; contato?: string }

export function valorInicialTexto(campo: CampoPersonalizado, valor: unknown): string {
  if (valor == null) return ''
  if (typeof valor === 'string') return valor
  return String(valor)
}

export function campoEstaVazio(campo: CampoPersonalizado, valor: unknown): boolean {
  if (valor == null) return true
  if (typeof valor === 'string') return valor.trim() === ''
  if (Array.isArray(valor)) return valor.length === 0
  return false
}

export function useCamposPersonalizados(
  categoria: 'card' | 'pessoa' | 'empresa',
  alvo: AlvoCampos,
) {
  const { user } = useAuth()
  const [campos, setCampos] = useState<CampoPersonalizado[]>([])
  const [valores, setValores] = useState<Record<string, unknown>>({})
  const [originais, setOriginais] = useState<Record<string, ValorCampoPersonalizado>>({})
  const [listas, setListas] = useState<ListaSelecao[]>([])
  const [carregando, setCarregando] = useState(true)
  const [salvando, setSalvando] = useState(false)
  const [erroObrigatorio, setErroObrigatorio] = useState<Record<string, boolean>>({})

  useEffect(() => {
    let cancelado = false
    const carregar = async () => {
      setCarregando(true)
      try {
        const [listaCampos, listasSel] = await Promise.all([
          listarCamposPersonalizados(true), // somente ativos: campos inativados no /config não aparecem
          listarListasSelecao(true),
        ])
        const doAlvo = listaCampos.filter((c) => c.categoria === categoria)
        if (cancelado) return
        setListas(listasSel)
        if (cancelado) return
        setCampos(doAlvo)
        if (alvo.card || alvo.contato) {
          const vals = await listarValoresPorAlvo(alvo)
          if (cancelado) return
          const mapa: Record<string, unknown> = {}
          const mapOrig: Record<string, ValorCampoPersonalizado> = {}
          vals.forEach((v) => {
            mapa[v.campo] = v.valor
            mapOrig[v.campo] = v
          })
          setValores(mapa)
          setOriginais(mapOrig)
        } else {
          setValores({})
          setOriginais({})
        }
      } catch (err) {
        console.error('Erro ao carregar campos personalizados', err)
      } finally {
        if (!cancelado) setCarregando(false)
      }
    }
    carregar()
    return () => {
      cancelado = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [categoria, alvo.card, alvo.contato])

  const setValor = useCallback((campoId: string, valor: unknown) => {
    setValores((prev) => ({ ...prev, [campoId]: valor }))
    setErroObrigatorio((prev) => ({ ...prev, [campoId]: false }))
  }, [])

  const setValorComMascara = useCallback(
    (campo: CampoPersonalizado, bruto: string) => {
      const formatado =
        campo.mascara && campo.mascara !== 'outros'
          ? aplicarMascara(bruto, campo.mascara, campo.mascara_outros || '')
          : bruto
      setValor(campo.id, formatado)
    },
    [setValor],
  )

  // Valida obrigatórios: true se tudo ok; false (marcando erros) se faltou preencher
  const validarObrigatorios = useCallback((): boolean => {
    const erros: Record<string, boolean> = {}
    campos.forEach((c) => {
      if (c.obrigatorio && campoEstaVazio(c, valores[c.id])) erros[c.id] = true
    })
    setErroObrigatorio(erros)
    return Object.keys(erros).length === 0
  }, [campos, valores])

  // Grava só o que mudou (upsert campo+alvo em valores_campos_personalizados)
  const salvar = useCallback(async (): Promise<boolean> => {
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
      // Recarrega os originais para refletir o estado salvo
      if (alvo.card || alvo.contato) {
        const vals = await listarValoresPorAlvo(alvo)
        const mapa: Record<string, unknown> = {}
        const mapOrig: Record<string, ValorCampoPersonalizado> = {}
        vals.forEach((v) => {
          mapa[v.campo] = v.valor
          mapOrig[v.campo] = v
        })
        setOriginais(mapOrig)
      }
      return true
    } catch (err) {
      console.error('Erro ao salvar campos personalizados', err)
      return false
    } finally {
      setSalvando(false)
    }
  }, [alvo, campos, originais, user?.id, valores])

  return {
    campos,
    valores,
    listas,
    carregando,
    salvando,
    erroObrigatorio,
    setValor,
    setValorComMascara,
    validarObrigatorios,
    salvar,
  }
}
