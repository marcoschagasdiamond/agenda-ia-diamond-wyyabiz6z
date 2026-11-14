/// <reference path="../pb_data/types.d.ts" />

/**
 * CAMADA 4 — Memória compartilhada entre agentes (coleção memoria_compartilhada).
 *
 * POST /backend/v1/memoria/compartilhada  { tipo, chave, conteudo, entidade?, data_origem?, fonte?, agente_origem? }
 *   Grava/atualiza um fato duradouro — deduplicado por
 *   (usuario, agente_origem, tipo, chave): se a chave já existe, ATUALIZA o
 *   conteudo em vez de criar um novo registro (não cresce sem limite).
 *
 * GET /backend/v1/memoria/compartilhada?page=1&perPage=30&tipo=fato
 *   Lista paginada dos fatos ativos do usuário.
 *
 * Usada pelos agentes nativos (tools já ligadas na migration 1762800032) e
 * pela rotina diária: a Diamantina Organizadora lê os fatos no prompt do
 * resumo (resumo_diario.js) e grava aprendizados de volta aqui.
 *
 * IMPORTANTE (JSVM do PocketBase): callbacks cronAdd/routerAdd NÃO veem
 * declarações de topo — TODA a lógica vive inline dentro de cada callback.
 */

routerAdd(
  'POST',
  '/backend/v1/memoria/compartilhada',
  (e) => {
    try {
      const userId = e.auth && e.auth.id ? e.auth.id : ''
      if (!userId) return e.unauthorizedError('autenticação obrigatória')

      // —— helpers inline (JSVM) ——
      const esc = (s) => String(s || '').replace(/"/g, '\\"')
      const campo = (r, n) => {
        try {
          const v = r.getString(n)
          return v === 'undefined' ? '' : v
        } catch (_) {
          return ''
        }
      }

      const body = e.requestInfo().body || {}
      const tipo = ['fato', 'preferencia', 'decisao', 'aprendizado'].includes(String(body.tipo))
        ? String(body.tipo)
        : 'fato'
      const chave = String(body.chave || '')
        .trim()
        .toLowerCase()
        .slice(0, 120)
      const conteudo = String(body.conteudo || body.resumo || '')
        .trim()
        .slice(0, 4000)
      const entidade = String(body.entidade || body.entidade_ref || '')
        .trim()
        .slice(0, 160)
      const dataOrigem = String(body.data_origem || '')
        .trim()
        .slice(0, 10)
      const fonte = String(body.fonte || '')
        .trim()
        .slice(0, 160)
      const agenteOrigem = String(body.agente_origem || 'diamantina-analista-memoria').slice(0, 60)

      if (!chave || !conteudo) return e.badRequestError('chave e conteudo são obrigatórios.')

      const col = $app.findCollectionByNameOrId('memoria_compartilhada')
      const existentes = $app.findRecordsByFilter(
        'memoria_compartilhada',
        `usuario = "${esc(userId)}" && agente_origem = "${esc(agenteOrigem)}" && tipo = "${esc(tipo)}" && chave = "${esc(chave)}"`,
        '-created',
        1,
        0,
      )
      let rec
      let atualizado = false
      if (existentes.length > 0) {
        rec = existentes[0]
        atualizado = true
      } else {
        rec = new Record(col)
        rec.set('usuario', userId)
        rec.set('vezes_citada', 0)
      }
      rec.set('tipo', tipo)
      rec.set('chave', chave)
      rec.set('conteudo', conteudo)
      rec.set('entidade', entidade)
      rec.set('data_origem', dataOrigem)
      rec.set('fonte', fonte)
      rec.set('agente_origem', agenteOrigem)
      rec.set('ativo', true)
      $app.save(rec)

      return e.json(200, { sucesso: true, id: rec.id, atualizado })
    } catch (err) {
      return e.json(500, { error: err.message || 'Falha ao gravar memória compartilhada' })
    }
  },
  $apis.requireAuth(),
)

routerAdd(
  'GET',
  '/backend/v1/memoria/compartilhada',
  (e) => {
    try {
      const userId = e.auth && e.auth.id ? e.auth.id : ''
      if (!userId) return e.unauthorizedError('autenticação obrigatória')

      // —— helpers inline (JSVM) ——
      const campo = (r, n) => {
        try {
          const v = r.getString(n)
          return v === 'undefined' ? '' : v
        } catch (_) {
          return ''
        }
      }

      const q = e.requestInfo().query || {}
      const page = Math.max(1, Number(q.page) || 1)
      const perPage = Math.min(60, Math.max(1, Number(q.perPage) || 30))
      const tipo = String(q.tipo || '')
        .trim()
        .slice(0, 20)

      let filtro = `usuario = "${userId}" && ativo = true`
      if (tipo) filtro += ` && tipo = "${tipo}"`

      const registros = $app.findRecordsByFilter(
        'memoria_compartilhada',
        filtro,
        '-updated',
        perPage,
        (page - 1) * perPage,
      )
      const total = $app.countRecords('memoria_compartilhada', filtro)

      const itens = []
      for (const r of registros) {
        itens.push({
          id: r.id,
          tipo: campo(r, 'tipo'),
          chave: campo(r, 'chave'),
          conteudo: campo(r, 'conteudo'),
          entidade: campo(r, 'entidade'),
          data_origem: campo(r, 'data_origem'),
          fonte: campo(r, 'fonte'),
          agente_origem: campo(r, 'agente_origem'),
          vezes_citada: r.getInt('vezes_citada') || 0,
          updated: r.getString('updated'),
        })
      }
      return e.json(200, { itens, page, perPage, totalItens: total })
    } catch (err) {
      return e.json(500, { error: err.message || 'Falha ao listar memória compartilhada' })
    }
  },
  $apis.requireAuth(),
)
