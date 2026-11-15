/**
 * embeddings_memoria.js — Camada vetorial da memória (OpenAI text-embedding-3-small).
 * ─────────────────────────────────────────────────────────────
 * Fila incremental (onRecordAfterCreateSuccess/UpdateSuccess nas coleções de
 * memória) + backfill em lotes de ~20 por rodada de cron (10 min) + cache por
 * hash de conteúdo (coleção embeddings_memoria, migração 1762800034).
 *
 * Chamada ao OpenAI via conta do dono conectada nos Conectores (executeAsOwner,
 * toolkit "openai", ferramenta OPENAI_CREATE_EMBEDDINGS). Toda a lógica vive
 * INLINE nos callbacks (regra JSVM deste projeto).
 *
 * Endpoints:
 *   POST /backend/v1/diag/embeddings-openai    — prova real (superusuário)
 *   POST /backend/v1/memoria/embed-consulta    — vetor da pergunta (auth)
 *   POST /backend/v1/memoria/embed-backfill    — forçar 1 rodada (superusuário)
 */

cronAdd('embMemoriaBackfill', '*/10 * * * *', function () {
  var LOTE = 20
  var MODELO = 'text-embedding-3-small'
  var MAX_CHARS = 6000

  // —— passo 1: reenfileirar dossiês/episódios/compartilhada/resumos/folha sem vetor
  var colecoes = [
    'dossies_memoria',
    'episodios_memoria',
    'memoria_compartilhada',
    'resumos_dia',
    'folha_dia',
  ]
  var hashCalc = function (colecao, usuario, conteudo) {
    return $security.md5(colecao + '|' + usuario + '|' + String(conteudo).slice(0, MAX_CHARS))
  }
  for (var ci = 0; ci < colecoes.length; ci++) {
    var nome = colecoes[ci]
    var col
    try {
      col = $app.findCollectionByNameOrId(nome)
    } catch (err) {
      continue
    }
    var registros
    try {
      registros = $app.findRecordsByFilter(nome, 'created > {:corte}', '-created', 40, 0, {
        corte: new Date(Date.now() - 36 * 3600 * 1000).toISOString().replace('T', ' '),
      })
    } catch (err2) {
      continue
    }
    for (var ri = 0; ri < registros.length; ri++) {
      var r = registros[ri]
      var usuario = r.getString('usuario')
      if (!usuario) continue
      var pedacos = []
      var campos = ['conteudo', 'resumo', 'titulo', 'texto', 'mensagem', 'descricao', 'observacao']
      for (var f = 0; f < campos.length; f++) {
        var v = r.getString(campos[f])
        if (v && v.trim().length > 0) pedacos.push(v)
      }
      if (pedacos.length === 0) continue
      var hash = hashCalc(nome, usuario, pedacos.join('\n'))
      var jaExiste = false
      try {
        var existente = $app.findFirstRecordByFilter('embeddings_memoria', 'hash = {:h}', {
          h: hash,
        })
        jaExiste = !!existente
      } catch (err3) {
        jaExiste = false
      }
      if (jaExiste) continue
      var slotCol = $app.findCollectionByNameOrId('embeddings_memoria')
      var slot = new Record(slotCol)
      slot.set('usuario', usuario)
      slot.set('hash', hash)
      slot.set('colecao', nome)
      slot.set('registro', r.getString('id'))
      slot.set('dims', 0)
      slot.set('vetor', '')
      try {
        $app.save(slot)
      } catch (err4) {
        // duplicado em corrida — ok
      }
    }
  }

  // —— passo 2: embutir pendentes (dims = 0), em lote, via executeAsOwner
  var pendentes = []
  try {
    pendentes = $app.findRecordsByFilter('embeddings_memoria', 'dims = 0', 'created', LOTE, 0)
  } catch (err5) {
    console.error('embMemoriaBackfill: falha ao listar pendentes: ' + err5)
    return
  }
  if (pendentes.length === 0) return

  var entradas = []
  for (var i = 0; i < pendentes.length; i++) {
    var p = pendentes[i]
    var regOrigem = null
    try {
      regOrigem = $app.findRecordById(p.getString('colecao'), p.getString('registro'))
    } catch (err6) {
      // registro de origem sumiu — marca como órfã (dims = -1)
      p.set('dims', -1)
      try {
        $app.save(p)
      } catch (err7) {}
      continue
    }
    var pedacos2 = []
    var campos2 = ['conteudo', 'resumo', 'titulo', 'texto', 'mensagem', 'descricao', 'observacao']
    for (var f2 = 0; f2 < campos2.length; f2++) {
      var v2 = regOrigem.getString(campos2[f2])
      if (v2 && v2.trim().length > 0) pedacos2.push(v2)
    }
    var texto = pedacos2.join('\n').slice(0, MAX_CHARS)
    if (!texto.trim()) {
      p.set('dims', -1)
      try {
        $app.save(p)
      } catch (err8) {}
      continue
    }
    entradas.push({ slot: p, texto: texto })
  }
  if (entradas.length === 0) return

  var resultado = null
  try {
    resultado = $connectors.executeAsOwner('openai', 'OPENAI_CREATE_EMBEDDINGS', {
      input: entradas.map(function (it) {
        return it.texto
      }),
      model: MODELO,
    })
  } catch (err9) {
    console.error('embMemoriaBackfill: executeAsOwner falhou: ' + err9)
    return
  }
  var vetores = null
  try {
    var dados = resultado && resultado.data ? resultado.data : resultado
    var arr = dados && dados.data ? dados.data : null
    if (arr && arr.length > 0 && arr[0] && arr[0].embedding) vetores = arr
  } catch (err10) {
    vetores = null
  }
  if (!vetores || vetores.length !== entradas.length) {
    console.error(
      'embMemoriaBackfill: resposta do OpenAI sem embeddings esperados (recebido ' +
        (vetores ? vetores.length : 'nada') +
        ' de ' +
        entradas.length +
        ')',
    )
    return
  }
  var okCount = 0
  for (var k = 0; k < entradas.length; k++) {
    var vetor = vetores[k].embedding
    if (!vetor || vetor.length === 0) continue
    entradas[k].slot.set('dims', vetor.length)
    entradas[k].slot.set('vetor', JSON.stringify(vetor))
    try {
      $app.save(entradas[k].slot)
      okCount++
    } catch (err11) {
      console.error('embMemoriaBackfill: falha ao salvar vetor: ' + err11)
    }
  }
  console.log('embMemoriaBackfill: ' + okCount + ' de ' + entradas.length + ' embutidos')
})

// ─────────────────────────────────────────────────────────────
// Rota de diagnóstico — prova real (superusuário)
// ─────────────────────────────────────────────────────────────
routerAdd('POST', '/backend/v1/diag/embeddings-openai', function (e) {
  var info = e.auth
  if (!info || info.collection().name !== '_superusers') {
    return e.json(403, { ok: false, error: 'somente superusuário' })
  }
  var MODELO = 'text-embedding-3-small'
  var corpo = {}
  try {
    corpo = e.requestInfo().body || {}
  } catch (err) {
    corpo = {}
  }
  var textoTeste = corpo.texto || 'diagnóstico de embeddings da memória do Agenda IA Diamond'
  var vetor = null
  var erro = ''
  var bruto = null
  try {
    bruto = $connectors.executeAsOwner('openai', 'OPENAI_CREATE_EMBEDDINGS', {
      input: [String(textoTeste)],
      model: MODELO,
    })
    var dados = bruto && bruto.data ? bruto.data : bruto
    var arr = dados && dados.data ? dados.data : null
    if (arr && arr.length > 0 && arr[0] && arr[0].embedding) vetor = arr[0].embedding
  } catch (err2) {
    erro = String(err2)
  }
  if (vetor) {
    return e.json(200, {
      ok: true,
      modelo: MODELO,
      dims: vetor.length,
      primeiros_3: vetor.slice(0, 3),
      texto_teste: String(textoTeste).slice(0, 80),
    })
  }
  return e.json(200, {
    ok: false,
    modelo: MODELO,
    error: erro || 'resposta sem embedding (bruto: ' + JSON.stringify(bruto).slice(0, 300) + ')',
  })
})

// ─────────────────────────────────────────────────────────────
// Vetor da pergunta — usado pela busca semântica (auth normal)
// ─────────────────────────────────────────────────────────────
routerAdd('POST', '/backend/v1/memoria/embed-consulta', function (e) {
  if (!e.auth) return e.json(401, { ok: false, error: 'autenticação necessária' })
  var corpo = {}
  try {
    corpo = e.requestInfo().body || {}
  } catch (err) {
    corpo = {}
  }
  var texto = String(corpo.texto || '').trim()
  if (!texto) return e.json(400, { ok: false, error: 'texto obrigatório' })
  var bruto = null
  try {
    bruto = $connectors.executeAsOwner('openai', 'OPENAI_CREATE_EMBEDDINGS', {
      input: [texto.slice(0, 6000)],
      model: 'text-embedding-3-small',
    })
    var dados = bruto && bruto.data ? bruto.data : bruto
    var arr = dados && dados.data ? dados.data : null
    if (arr && arr.length > 0 && arr[0] && arr[0].embedding) {
      return e.json(200, { ok: true, dims: arr[0].embedding.length, vetor: arr[0].embedding })
    }
  } catch (err2) {
    return e.json(200, { ok: false, error: String(err2) })
  }
  return e.json(200, { ok: false, error: 'resposta sem embedding' })
})

// ─────────────────────────────────────────────────────────────
// Backfill manual (superusuário) — roda a mesma lógica do cron
// ─────────────────────────────────────────────────────────────
routerAdd('POST', '/backend/v1/memoria/embed-backfill', function (e) {
  if (!e.auth || e.auth.collection().name !== '_superusers') {
    return e.json(403, { ok: false, error: 'somente superusuário' })
  }
  var LOTE = 20
  var MAX_CHARS = 6000
  var pendentes = []
  try {
    pendentes = $app.findRecordsByFilter('embeddings_memoria', 'dims = 0', 'created', LOTE, 0)
  } catch (err) {
    return e.json(200, { ok: false, error: String(err) })
  }
  if (pendentes.length === 0) return e.json(200, { ok: true, processados: 0, fila: 0 })
  var entradas = []
  for (var i = 0; i < pendentes.length; i++) {
    var p = pendentes[i]
    var regOrigem = null
    try {
      regOrigem = $app.findRecordById(p.getString('colecao'), p.getString('registro'))
    } catch (err2) {
      p.set('dims', -1)
      try {
        $app.save(p)
      } catch (err3) {}
      continue
    }
    var pedacos = []
    var campos = ['conteudo', 'resumo', 'titulo', 'texto', 'mensagem', 'descricao', 'observacao']
    for (var f = 0; f < campos.length; f++) {
      var v = regOrigem.getString(campos[f])
      if (v && v.trim().length > 0) pedacos.push(v)
    }
    var texto = pedacos.join('\n').slice(0, MAX_CHARS)
    if (!texto.trim()) {
      p.set('dims', -1)
      try {
        $app.save(p)
      } catch (err4) {}
      continue
    }
    entradas.push({ slot: p, texto: texto })
  }
  if (entradas.length === 0)
    return e.json(200, { ok: true, processados: 0, fila: pendentes.length })
  try {
    var bruto = $connectors.executeAsOwner('openai', 'OPENAI_CREATE_EMBEDDINGS', {
      input: entradas.map(function (it) {
        return it.texto
      }),
      model: 'text-embedding-3-small',
    })
    var dados = bruto && bruto.data ? bruto.data : bruto
    var arr = dados && dados.data ? dados.data : null
    if (arr && arr.length > 0 && arr[0] && arr[0].embedding) {
      var okCount = 0
      for (var k = 0; k < arr.length && k < entradas.length; k++) {
        var vetor = arr[k].embedding
        if (!vetor || vetor.length === 0) continue
        entradas[k].slot.set('dims', vetor.length)
        entradas[k].slot.set('vetor', JSON.stringify(vetor))
        try {
          $app.save(entradas[k].slot)
          okCount++
        } catch (err5) {}
      }
      var restantes = 0
      try {
        restantes = $app.countRecords('embeddings_memoria', 'dims = 0')
      } catch (err6) {}
      return e.json(200, { ok: true, processados: okCount, fila: restantes })
    }
    return e.json(200, { ok: false, error: 'resposta sem embeddings' })
  } catch (err7) {
    return e.json(200, { ok: false, error: String(err7) })
  }
})
