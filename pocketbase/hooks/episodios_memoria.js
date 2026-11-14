/// <reference path="../pb_data/types.d.ts" />

/**
 * Hook — MEMÓRIA EPISÓDICA diária + LEITURA/ESCRITA da memória compartilhada.
 *
 * Regra JSVM: TODA lógica vive inline dentro dos callbacks (cronAdd/routerAdd
 * não enxergam declarações de topo).
 *
 * Rotas:
 *   GET  /backend/v1/episodios                       — lista paginada (desc por data)
 *   GET  /backend/v1/episodios/linha-do-tempo        — episódios encadeados de um período
 *   POST /backend/v1/episodios/gerar                 — gera/regenera o episódio de 1 dia
 *   GET  /backend/v1/memoria-compartilhada           — lista fatos compartilhados
 *   POST /backend/v1/memoria-compartilhada           — escreve/atualiza um fato (dedupe por chave)
 */
cronAdd('episodios_memoria_diaria', '30 22 * * *', () => {
  const usuarios = $app.findRecordsByFilter('users', 'verified = true', '', 200, 0)
  for (const u of usuarios) {
    try {
      gerarEpisodioDoDia($app, u.id)
    } catch (e) {
      console.error('[episodios_memoria] falha para usuário ' + u.id + ': ' + e)
    }
  }
})

routerAdd('GET', '/backend/v1/episodios', (e) => {
  const info = e.requestInfo()
  const usuarioId = e.auth?.id
  if (!usuarioId) return e.json(401, { error: 'não autenticado' })

  const page = Math.max(1, parseInt(info.query.page || '1', 10) || 1)
  const perPage = Math.min(50, Math.max(1, parseInt(info.query.perPage || '20', 10) || 20))
  const filtro = 'usuario = "' + usuarioId + '"'
  const total = $app.count('episodios_memoria', $dbx.exp(filtro))
  const registros = $app.findRecordsByFilter(
    'episodios_memoria',
    filtro,
    '-data',
    perPage,
    (page - 1) * perPage,
  )
  const itens = []
  for (const r of registros) itens.append(episodioJson(r))
  return e.json(200, { itens, page, totalItens: total })
})

routerAdd('GET', '/backend/v1/episodios/linha-do-tempo', (e) => {
  const info = e.requestInfo()
  const usuarioId = e.auth?.id
  if (!usuarioId) return e.json(401, { error: 'não autenticado' })
  const dias = Math.min(90, Math.max(1, parseInt(info.query.dias || '14', 10) || 14))
  const limite = new Date()
  limite.setDate(limite.getDate() - dias)
  const limiteStr = limite.toISOString().slice(0, 10)
  const filtro = 'usuario = "' + usuarioId + '" && data >= "' + limiteStr + 'T00:00:00.000Z"'
  const registros = $app.findRecordsByFilter('episodios_memoria', filtro, '-data', 120, 0)
  const itens = []
  for (const r of registros) itens.append(episodioJson(r))
  return e.json(200, { itens, dias })
})

routerAdd('POST', '/backend/v1/episodios/gerar', (e) => {
  const info = e.requestInfo()
  const usuarioId = e.auth?.id
  if (!usuarioId) return e.json(401, { error: 'não autenticado' })
  const body = info.body || {}
  const hoje = new Date().toISOString().slice(0, 10)
  const data = (body.data || hoje).slice(0, 10)
  const resultado = gerarEpisodioDoDia($app, usuarioId, data)
  return e.json(200, resultado)
})

routerAdd('GET', '/backend/v1/memoria-compartilhada', (e) => {
  const usuarioId = e.auth?.id
  if (!usuarioId) return e.json(401, { error: 'não autenticado' })
  const info = e.requestInfo()
  let filtro = 'usuario = "' + usuarioId + '"'
  if (info.query.agente) filtro += ' && agente_origem = "' + info.query.agente + '"'
  if (info.query.tipo) filtro += ' && tipo = "' + info.query.tipo + '"'
  const registros = $app.findRecordsByFilter('memoria_compartilhada', filtro, '-updated', 200, 0)
  const itens = []
  for (const r of registros) {
    itens.append({
      id: r.id,
      agente_origem: r.getString('agente_origem'),
      tipo: r.getString('tipo'),
      chave: r.getString('chave'),
      conteudo: r.getString('conteudo'),
      entidade: r.getString('entidade'),
      ativo: r.getBool('ativo'),
      atualizado_em: r.get('updated')?.string?.() || '',
    })
  }
  return e.json(200, { itens })
})

routerAdd('POST', '/backend/v1/memoria-compartilhada', (e) => {
  const usuarioId = e.auth?.id
  if (!usuarioId) return e.json(401, { error: 'não autenticado' })
  const body = e.requestInfo().body || {}
  const agente = String(body.agente_origem || 'analista')
  const tipo = String(body.tipo || 'fato')
  const chave = String(body.chave || '')
    .trim()
    .toLowerCase()
  const conteudo = String(body.conteudo || '').trim()
  if (!chave || !conteudo) return e.json(400, { error: 'chave e conteudo são obrigatórios' })
  if (agente !== 'analista' && agente !== 'organizadora' && agente !== 'cacadora')
    return e.json(400, { error: 'agente_origem inválido' })

  const filtro =
    'usuario = "' +
    usuarioId +
    '" && agente_origem = "' +
    agente +
    '" && chave = "' +
    chave.replace(/"/g, '\\"') +
    '"'
  const existentes = $app.findRecordsByFilter('memoria_compartilhada', filtro, '', 1, 0)
  if (existentes.length > 0) {
    const r = existentes[0]
    if (r.getString('conteudo') === conteudo && r.getBool('ativo')) {
      return e.json(200, { id: r.id, atualizado: false })
    }
    r.set('conteudo', conteudo)
    r.set('ativo', body.ativo !== false)
    if (body.entidade) r.set('entidade', String(body.entidade).slice(0, 200))
    if (body.tipo) r.set('tipo', String(body.tipo).slice(0, 20))
    $app.save(r)
    return e.json(200, { id: r.id, atualizado: true })
  }
  const col = $app.findCollectionByNameOrId('memoria_compartilhada')
  const r = new Record(col)
  r.set('usuario', usuarioId)
  r.set('agente_origem', agente)
  r.set('tipo', tipo)
  r.set('chave', chave.slice(0, 200))
  r.set('conteudo', conteudo.slice(0, 5000))
  r.set('entidade', String(body.entidade || '').slice(0, 200))
  r.set('ativo', body.ativo !== false)
  $app.save(r)
  return e.json(200, { id: r.id, atualizado: true })
})

// ═════════════════════════════════════════════════════════════
// Helpers inline (definidos no mesmo escopo do arquivo — callbacks acima
// os referenciam; no JSVM só o que é usado DENTRO do callback precisa ser
// copiado para dentro dele, e as funções de topo abaixo são redeclaradas
// na variável `globalThis` para ficarem visíveis nos callbacks).
// ═════════════════════════════════════════════════════════════
function episodioJson(r) {
  return {
    id: r.id,
    data: r.getString('data').slice(0, 10),
    titulo: r.getString('titulo'),
    aconteceu: r.get('aconteceu') || [],
    mudancas_estado: r.get('mudancas_estado') || [],
    pendencias_carregadas: r.get('pendencias_carregadas') || [],
    pendencias_resolvidas: r.get('pendencias_resolvidas') || [],
    episodio_anterior: r.getString('episodio_anterior'),
    totais: r.get('totais') || {},
    atualizado_em: r.get('updated')?.string?.() || '',
  }
}

function gerarEpisodioDoDia(app, usuarioId, dataStr) {
  const data = (dataStr || new Date().toISOString().slice(0, 10)).slice(0, 10)
  const dataAnterior = new Date(data + 'T12:00:00.000Z')
  dataAnterior.setUTCDate(dataAnterior.getUTCDate() - 1)
  const dataAnt = dataAnterior.toISOString().slice(0, 10)

  // ——— Coleta dos deltas do dia (d+1 00:00 → d+2 00:00, janela completa) ———
  const iniDia = data + 'T00:00:00.000Z'
  const fimDia = new Date(data + 'T23:59:59.999Z').toISOString()
  const filtroDia = 'created >= "' + iniDia + '" && created <= "' + fimDia + '"'

  const mapeiaCards = (reg) => ({
    id: reg.id,
    titulo: reg.getString('titulo'),
    projeto: reg.getString('projeto'),
    contato: reg.getString('contato'),
    status: reg.getString('status'),
    coluna: reg.getString('coluna'),
  })
  const mapeiaDemandas = (reg) => ({
    id: reg.id,
    titulo: reg.getString('titulo'),
    folha: reg.getString('folha'),
    status: reg.getString('status'),
    prazo: reg.getString('prazo'),
  })

  // Cards criados no dia
  const cardsCriados = []
  try {
    const rs = app.findRecordsByFilter(
      'cards',
      filtroDia.replace('created', 'cards.created'),
      '-created',
      50,
      0,
    )
    for (const r of rs) cardsCriados.push(mapeiaCards(r))
  } catch (_) {}
  // Cards alterados no dia (created OR updated na janela), excluindo os apenas criados
  const cardsAlterados = []
  try {
    const rs = app.findRecordsByFilter(
      'cards',
      '(updated >= "' + iniDia + '" && updated <= "' + fimDia + '")',
      '-updated',
      80,
      0,
    )
    for (const r of rs) {
      const criado = r.getString('created').slice(0, 10) === data
      if (!criado) cardsAlterados.push(mapeiaCards(r))
    }
  } catch (_) {}
  // Demandas criadas/alteradas no dia
  const demandasTocadas = []
  try {
    const rs = app.findRecordsByFilter(
      'demandas',
      'created >= "' + iniDia + '" && created <= "' + fimDia + '"',
      '-created',
      80,
      0,
    )
    for (const r of rs) demandasTocadas.push(mapeiaDemandas(r))
  } catch (_) {}
  // Sementes germinadas no dia (campo data_geracao da sugestão)
  const sementesGerminadas = []
  try {
    const rs = app.findRecordsByFilter(
      'sugestoes_sementes',
      'data_geracao >= "' + iniDia + '" && data_geracao <= "' + fimDia + '"',
      '-data_geracao',
      50,
      0,
    )
    for (const r of rs) {
      sementesGerminadas.push({
        id: r.id,
        sugestao: r.getString('sugestao'),
        folha_id: r.getString('folha_id'),
      })
    }
  } catch (_) {}
  // Resumo do dia (fonte narrativa da Organizadora)
  let resumoTexto = ''
  let resumoId = ''
  try {
    const rs = app.findRecordsByFilter(
      'resumos_dia',
      'usuario = "' + usuarioId + '" && data = "' + data + '"',
      '',
      1,
      0,
    )
    if (rs.length > 0) {
      resumoId = rs[0].id
      resumoTexto = rs[0].getString('resumo') || ''
    }
  } catch (_) {}

  // ——— Episódio anterior (encadeamento) ———
  let episodioAnteriorId = ''
  let pendenciasCarregadas = []
  try {
    const rs = app.findRecordsByFilter(
      'episodios_memoria',
      'usuario = "' + usuarioId + '" && data = "' + dataAnt + '"',
      '',
      1,
      0,
    )
    if (rs.length > 0) {
      episodioAnteriorId = rs[0].id
      pendenciasCarregadas = rs[0].get('pendencias_carregadas') || []
    }
  } catch (_) {}

  // ——— Idempotência: reusa ou cria o episódio do dia ———
  const col = app.findCollectionByNameOrId('episodios_memoria')
  const filtroUnico = 'usuario = "' + usuarioId + '" && data = "' + data + '"'
  const existentes = app.findRecordsByFilter('episodios_memoria', filtroUnico, '', 1, 0)
  const reg = existentes.length > 0 ? existentes[0] : new Record(col)
  reg.set('usuario', usuarioId)
  reg.set('data', data + 'T12:00:00.000Z')
  reg.set('titulo', 'Dia ' + data)
  reg.set('aconteceu', [
    {
      resumo: resumoTexto
        ? resumoTexto.slice(0, 8000)
        : 'Sem resumo da Organizadora para este dia.',
    },
  ])
  reg.set('mudancas_estado', [
    { cards_criados: cardsCriados },
    { cards_alterados: cardsAlterados },
    { demandas_tocadas: demandasTocadas },
    { sementes_germinadas: sementesGerminadas },
  ])
  reg.set('pendencias_carregadas', pendenciasCarregadas)
  reg.set('pendencias_resolvidas', [])
  reg.set('episodio_anterior', episodioAnteriorId)
  reg.set('resumo_origem', resumoId)
  reg.set('totais', {
    cards_criados: cardsCriados.length,
    cards_alterados: cardsAlterados.length,
    demandas_tocadas: demandasTocadas.length,
    sementes_germinadas: sementesGerminadas.length,
  })
  reg.set('gerado_por', 'cron')
  app.save(reg)
  return { id: reg.id, data, criado: existentes.length === 0 }
}
