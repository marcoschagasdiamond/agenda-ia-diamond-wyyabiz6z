/// <reference path="../pb_data/types.d.ts" />

/**
 * PAINEL "ESTADO DA MEMÓRIA" — contadores reais das 4 camadas.
 *
 * GET  /backend/v1/memoria/estado    — contadores + últimas consolidações
 * POST /backend/v1/memoria/consolidar — dispara a rotina de dossiês sob demanda
 *                                       (consolidarDossiesUsuario é idempotente:
 *                                       1 dossiê por usuario+tipo+entidade)
 *
 * IMPORTANTE (JSVM): NADA de lógica fora dos callbacks — helpers inline.
 * Todas as consultas têm try/catch: o painel nunca quebra por uma camada falhar.
 */

routerAdd(
  'GET',
  '/backend/v1/memoria/estado',
  (e) => {
    try {
      const userId = e.auth && e.auth.id ? e.auth.id : ''
      if (!userId) return e.unauthorizedError('autenticação obrigatória')

      // —— helper inline: contar registros de uma coleção (com filtro opcional) ——
      const contar = (colecao, filtro) => {
        try {
          const opts = filtro && filtro !== '' ? { filter: filtro } : {}
          return $app.countRecords(colecao, opts)
        } catch (_) {
          return 0
        }
      }

      // —— helper inline: pegar 1 registro (mais recente por sort) de forma segura ——
      const primeiro = (colecao, filtro, sort, campos) => {
        try {
          const rs = $app.findRecordsByFilter(colecao, filtro || '', sort || '-created', 1, 0)
          if (!rs || rs.length === 0) return null
          const r = rs[0]
          const out = { id: r.id, created: '', updated: '' }
          try {
            out.created = r.getString('created')
          } catch (_) {}
          try {
            out.updated = r.getString('updated')
          } catch (_) {}
          for (const c of campos || []) {
            try {
              out[c] = r.getString(c)
            } catch (_) {}
          }
          return out
        } catch (_) {
          return null
        }
      }

      const filtroUser = 'usuario = "' + String(userId).replace(/"/g, '\\"') + '"'

      // —— CAMADA 1: dossiês consolidados + pendentes na fila ——
      const totalDossies = contar('dossies_memoria', filtroUser)
      const ultimoDossie = primeiro('dossies_memoria', filtroUser, '-atualizado_em', [
        'entidade_nome',
        'atualizado_em',
      ])
      const pendentesFila = contar('fila_dossies', filtroUser)

      // —— CAMADA 2: episódios ——
      const totalEpisodios = contar('episodios_memoria', filtroUser)
      const ultimoEpisodio = primeiro('episodios_memoria', filtroUser, '-created', ['data'])

      // —— CAMADA 3: memória compartilhada, por agente autoral ——
      const fatosPorAgente = []
      let totalCompartilhada = 0
      try {
        const rs = $app.findRecordsByFilter(
          'memoria_compartilhada',
          filtroUser + ' && ativo = true',
          '-updated',
          500,
          0,
        )
        const porAgente = {}
        for (const f of rs) {
          let ag = 'outro'
          try {
            ag = f.getString('agente_origem') || 'outro'
          } catch (_) {}
          porAgente[ag] = (porAgente[ag] || 0) + 1
        }
        const rotulos = {
          diamantina: 'Diamantina (Organizadora/Analista)',
          cacador_sementes: 'Caçador de Sementes',
          analista: 'Analista de Memória',
        }
        for (const ag in porAgente) {
          fatosPorAgente.push({
            agente: ag,
            rotulo: rotulos[ag] || ag,
            total: porAgente[ag],
          })
        }
        fatosPorAgente.sort(function (a, b) {
          return b.total - a.total
        })
        totalCompartilhada = rs.length
      } catch (_) {}

      // —— CAMADA 4: status da busca semântica ——
      const estadoBusca = {
        modo: '2 etapas',
        descricao:
          'Candidatos pré-filtrados + escolha por significado feita pela Diamantina. Embeddings ficam prontos quando a conta OpenAI for conectada nos Conectores.',
      }

      return e.json(200, {
        dossies: {
          total: totalDossies,
          pendentes_fila: pendentesFila,
          ultima_consolidacao: ultimoDossie
            ? ultimoDossie.atualizado_em || ultimoDossie.updated
            : '',
        },
        episodios: {
          total: totalEpisodios,
          ultimo_created: ultimoEpisodio ? ultimoEpisodio.created : '',
          ultimo_data: ultimoEpisodio ? ultimoEpisodio.data || '' : '',
        },
        memoria_compartilhada: { total: totalCompartilhada, por_agente: fatosPorAgente },
        busca_semantica: estadoBusca,
      })
    } catch (err) {
      return e.json(500, { error: err.message || 'Falha ao obter o estado da memória' })
    }
  },
  $apis.requireAuth(),
)

routerAdd(
  'POST',
  '/backend/v1/memoria/consolidar',
  (e) => {
    try {
      const userId = e.auth && e.auth.id ? e.auth.id : ''
      if (!userId) return e.unauthorizedError('autenticação obrigatória')

      // consolidarDossiesUsuario é idempotente (1 dossiê por usuario+tipo+entidade)
      const r = consolidarDossiesUsuario(userId)
      return e.json(200, {
        sucesso: true,
        dossies_novos: r && r.criados ? r.criados : 0,
        dossies_atualizados: r && r.atualizados ? r.atualizados : 0,
        mensagem: 'Consolidação concluída — dossiês atualizados sem duplicar registros.',
      })
    } catch (err) {
      return e.json(500, {
        sucesso: false,
        error: err.message || 'Falha ao consolidar dossiês agora',
      })
    }
  },
  $apis.requireAuth(),
)
