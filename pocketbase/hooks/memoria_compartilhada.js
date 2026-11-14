/// <reference path="../pb_data/types.d.ts" />

/**
 * Memória compartilhada entre agentes (memoria_compartilhada).
 *
 * POST /backend/v1/memoria/compartilhada  { tipo, chave, resumo, detalhe?, entidade_ref? }
 *   Grava/atualiza um fato duradouro — deduplicado por
 *   (usuario, agente_origem, tipo, chave): se a chave já existe, atualiza o
 *   resumo em vez de criar um novo registro (não cresce sem limite).
 *
 * GET /backend/v1/memoria/compartilhada?page=1&perPage=30&tipo=fato
 *   Lista paginada dos fatos ativos do usuário.
 *
 * Usada pelos três agentes nativos (tools de leitura já ligadas na migration
 * 1762800032) e pela rotina diária: a Diamantina Organizadora lê os fatos no
 * prompt do resumo; a Caçadora e o Analista têm acesso por tool.
 *
 * IMPORTANTE (JSVM): toda a lógica vive INLINE dentro de cada callback.
 */

routerAdd(
  'POST',
  '/backend/v1/memoria/compartilhada',
  (e) => {
    try {
      const userId = e.auth?.id
      if (!userId) return e.unauthorizedError('autenticação obrigatória')

      const body = e.requestInfo().body || {}
      const tipo = ['fato', 'preferencia', 'decisao', 'aprendizado'].includes(String(body.tipo))
        ? String(body.tipo)
        : 'fato'
      const chave = String(body.chave || '')
        .trim()
        .toLowerCase()
        .slice(0, 120)
      const resumo = String(body.resumo || '')
        .trim()
        .slice(0, 1200)
      const detalhe = String(body.detalhe || '')
        .trim()
        .slice(0, 4000)
      const entidadeRef = String(body.entidade_ref || '')
        .trim()
        .slice(0, 160)
      const agenteOrigem = String(body.agente_origem || 'diamantina-analista-memoria').slice(0, 60)

      if (!chave || !resumo) return e.badRequestError('chave e resumo são obrigatórios.')

      const col = $app.findCollectionByNameOrId('memoria_compartilhada')
      const existentes = $app.findRecordsByFilter(
        'memoria_compartilhada',
        `usuario = "${userId}" && agente_origem = "${agenteOrigem}" && tipo = "${tipo}" && chave = "${chave}"`,
        '-created',
        1,
        0,
      )
      let rec
      if (existentes.length > 0) {
        rec = existentes[0]
        const citadas = rec.getInt('vezes_citada') || 0
        rec.set('vezes_citada', citadas)
      } else {
        rec = new Record(col)
        rec.set('usuario', userId)
        rec.set('vezes_citada', 0)
      }
      rec.set('tipo', tipo)
      rec.set('chave', chave)
      rec.set('resumo', resumo)
      rec.set('detalhe', detalhe)
      rec.set('entidade_ref', entidadeRef)
      rec.set('agente_origem', agenteOrigem)
      rec.set('ativo', true)
      $app.save(rec)

      return e.json(200, { sucesso: true, id: rec.id })
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
      const userId = e.auth?.id
      if (!userId) return e.unauthorizedError('autenticação obrigatória')

      const q = e.requestInfo().query || {}
      const page = Math.max(1, Number(q.page) || 1)
      const perPage = Math.min(60, Math.max(1, Number(q.perPage) || 30))
      const tipo = String(q.tipo || '').slice(0, 20)

      let filtro = `usuario = "${userId}" && ativo = true`
      if (tipo) filtro += ` && tipo = "${tipo}"`

      const itens = $app.findRecordsByFilter(
        'memoria_compartilhada',
        filtro,
        '-updated',
        perPage,
        (page - 1) * perPage,
      )
      const total = $app.countRecords('memoria_compartilhada', filtro)

      return e.json(200, {
        page,
        perPage,
        total,
        itens: itens.map((r) => ({
          id: r.id,
          tipo: r.getString('tipo'),
          chave: r.getString('chave'),
          resumo: r.getString('resumo'),
          detalhe: r.getString('detalhe'),
          entidade_ref: r.getString('entidade_ref'),
          agente_origem: r.getString('agente_origem'),
          vezes_citada: r.getInt('vezes_citada'),
          updated: r.getString('updated'),
        })),
      })
    } catch (err) {
      return e.json(500, { error: err.message || 'Falha ao listar memória compartilhada' })
    }
  },
  $apis.requireAuth(),
)
