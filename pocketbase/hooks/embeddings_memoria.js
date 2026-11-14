/// <reference path="../pb_data/types.d.ts" />

/**
 * CAMADA 3b — Embeddings de memória + enriquecimento da busca semântica.
 *
 * Tenta usar o gateway de IA (SKIP_AI_GATEWAY_URL / SKIP_AI_GATEWAY_API_KEY e
 * SKIP_AI_CHAT_URL / SKIP_AI_CHAT_API_KEY) para gerar embeddings via
 * POST {base}/v1/embeddings (modelo text-embedding-3-small). A sonda roda UMA
 * vez, no primeiro uso, e o resultado (funciona / não funciona) fica em cache
 * na coleção sistema_config (chave embeddings_disponivel) — se o gateway não
 * aceitar embeddings, TODO o fluxo é desligado silenciosamente e a busca
 * continua funcionando exatamente como antes (candidatos + decisão do agente).
 *
 * - Cron a cada 30 min: fila incremental (usuarios.fila_embeddings, ~20
 *   registros por rodada, nunca varre tudo de uma vez) — gera o vetor de cada
 *   registro de memória (dossiês, resumos, folha, cards, chat) e grava em
 *   vetores_memoria (json embedding + ref da origem), idempotente por
 *   (usuario, tipo_origem, origem_id, hash do texto).
 * - A busca semântica (busca_semantica_memoria.js) usa estes vetores para
 *   RERANQUEAR os candidatos por similaridade de cosseno ANTES da decisão do
 *   agente, quando os embeddings estão disponíveis.
 *
 * IMPORTANTE (JSVM): toda a lógica vive INLINE dentro de cada callback.
 */

cronAdd('memoria_embeddings_fila', '*/30 * * * *', () => {
  // —— helpers inline ——
  const gatewayUrl = () => {
    try {
      const u = $os.getenv('SKIP_AI_GATEWAY_URL') || ''
      return u.replace(/\/+$/, '')
    } catch (_) {
      return ''
    }
  }
  const gatewayKey = () => {
    try {
      return $os.getenv('SKIP_AI_GATEWAY_API_KEY') || $os.getenv('SKIP_AI_CHAT_API_KEY') || ''
    } catch (_) {
      return ''
    }
  }
  const modeloEmbed = () => {
    try {
      return $os.getenv('SKIP_AI_EMBEDDINGS_MODEL') || 'text-embedding-3-small'
    } catch (_) {
      return 'text-embedding-3-small'
    }
  }

  // sonda: 1 chamada, resultado em cache em sistema_config (bool embeddings_disponivel)
  const sondarEmbeddings = () => {
    try {
      const cfg = $app.findFirstRecordByFilter('sistema_config', 'chave = "embeddings_disponivel"')
      if (cfg) return cfg.getBool('valor_bool')
    } catch (_) {}
    let ok = false
    try {
      const url = gatewayUrl()
      const key = gatewayKey()
      if (url && key) {
        const res = $http.send({
          url: `${url}/v1/embeddings`,
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${key}`,
          },
          body: JSON.stringify({
            model: modeloEmbed(),
            input: 'sonda de embeddings do Agenda IA Diamond',
          }),
          timeout: 15,
        })
        const data = res.json
        ok = res.statusCode === 200 && data && Array.isArray(data.data) && data.data.length > 0
      }
    } catch (_) {
      ok = false
    }
    try {
      const col = $app.findCollectionByNameOrId('sistema_config')
      let rec
      try {
        rec = $app.findFirstRecordByFilter('sistema_config', 'chave = "embeddings_disponivel"')
      } catch (_) {
        rec = null
      }
      if (!rec) {
        rec = new Record(col)
        rec.set('chave', 'embeddings_disponivel')
      }
      rec.set('valor_bool', ok)
      $app.save(rec)
    } catch (_) {}
    return ok
  }

  const chamarEmbeddings = (textos) => {
    const url = gatewayUrl()
    const key = gatewayKey()
    if (!url || !key) throw new Error('gateway de IA não configurado')
    const res = $http.send({
      url: `${url}/v1/embeddings`,
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
      body: JSON.stringify({ model: modeloEmbed(), input: textos }),
      timeout: 30,
    })
    if (res.statusCode !== 200) throw new Error(`embeddings HTTP ${res.statusCode}`)
    const data = res.json
    if (!data || !Array.isArray(data.data)) throw new Error('resposta de embeddings inválida')
    return data.data
      .slice()
      .sort((a, b) => (a.index || 0) - (b.index || 0))
      .map((d) => d.embedding || [])
  }

  const hashTexto = (texto) => {
    let h = 0
    const s = String(texto || '')
    for (let i = 0; i < s.length; i++) {
      h = (h * 31 + s.charCodeAt(i)) | 0
    }
    return String(h)
  }

  // —— execução ——
  try {
    if (!sondarEmbeddings()) return
    const usuarios = $app.findRecordsByFilter('users', '', '-created', 50, 0)
    const COLECOES_FONTE = [
      {
        nome: 'dossies_memoria',
        tipo: 'dossie',
        texto: (r) =>
          `${r.getString('nome')} — ${r.getString('resumo')} — ${r.getString('conteudo')}`,
        filtro: '',
      },
      {
        nome: 'resumos_dia',
        tipo: 'resumo_dia',
        texto: (r) =>
          `${r.getString('data')} | feito: ${r.getString('feito')} | a fazer: ${r.getString('a_fazer')} | decisões: ${r.getString('decisoes')}`,
        filtro: '',
      },
      {
        nome: 'folha_dia',
        tipo: 'folha',
        texto: (r) => `${r.getString('data')} — ${r.getString('registro')}`,
        filtro: '',
      },
      {
        nome: 'cards',
        tipo: 'card',
        texto: (r) => `${r.getString('titulo')} — ${r.getString('descricao')}`,
        filtro: '',
      },
      { nome: 'chat_mensagens', tipo: 'chat', texto: (r) => r.getString('texto'), filtro: '' },
      {
        nome: 'episodios_memoria',
        tipo: 'episodio',
        texto: (r) => `${r.getString('data')} | ${r.getString('resumo')}`,
        filtro: '',
      },
    ]
    for (const usuario of usuarios) {
      const idsFila = []
      for (const fonte of COLECOES_FONTE) {
        try {
          const filtro = fonte.filtro ? `(${fonte.filtro})` : ''
          const recs = $app.findRecordsByFilter(fonte.nome, filtro, '-updated', 5, 0)
          for (const r of recs) idsFila.push({ tipo: fonte.tipo, id: r.id, colecao: fonte.nome })
        } catch (_) {}
      }
      if (idsFila.length === 0) continue
      // processa até 20 registros do usuário nesta rodada
      const lote = idsFila.slice(0, 20)
      const textos = []
      const metas = []
      for (const item of lote) {
        try {
          const r = $app.findRecordById(item.colecao, item.id)
          const fonteDoItem = COLECOES_FONTE.find((f) => f.tipo === item.tipo) || COLECOES_FONTE[0]
          const texto = fonteDoItem.texto(r)
          if (!texto) continue
          const hash = hashTexto(texto)
          try {
            const existentes = $app.findRecordsByFilter(
              'vetores_memoria',
              `usuario = "${usuario.id}" && tipo_origem = "${item.tipo}" && origem_id = "${item.id}" && hash_texto = "${hash}"`,
              '-created',
              1,
              0,
            )
            if (existentes.length > 0) continue // já embutido com este texto
          } catch (_) {}
          textos.push(texto.slice(0, 4000))
          metas.push({ ...item, hash })
        } catch (_) {}
      }
      if (metas.length === 0) continue
      try {
        const vetores = chamarEmbeddings(textos)
        const col = $app.findCollectionByNameOrId('vetores_memoria')
        for (let i = 0; i < metas.length; i++) {
          const vec = vetores[i]
          if (!Array.isArray(vec) || vec.length === 0) continue
          let rec
          try {
            const antigos = $app.findRecordsByFilter(
              'vetores_memoria',
              `usuario = "${usuario.id}" && tipo_origem = "${metas[i].tipo}" && origem_id = "${metas[i].id}"`,
              '-updated',
              1,
              0,
            )
            rec = antigos.length > 0 ? antigos[0] : new Record(col)
            if (antigos.length === 0) rec.set('usuario', usuario.id)
          } catch (_) {
            rec = new Record(col)
            rec.set('usuario', usuario.id)
          }
          rec.set('tipo_origem', metas[i].tipo)
          rec.set('origem_id', metas[i].id)
          rec.set('hash_texto', metas[i].hash)
          rec.set('embedding', JSON.stringify(vec))
          rec.set('modelo', modeloEmbed())
          $app.save(rec)
        }
      } catch (err) {
        console.error('[memoria-embeddings] falha no lote:', err.message)
      }
    }
  } catch (err) {
    console.error('[memoria-embeddings] erro no cron:', err.message)
  }
})
