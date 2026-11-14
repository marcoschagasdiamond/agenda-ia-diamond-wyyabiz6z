/// <reference path="../pb_data/types.d.ts" />

/**
 * CAMADA 3 — Memória episódica (linha do tempo diária).
 *
 * - Cron 22:30: transforma o resumos_dia do dia em UM episódio por
 *   usuario+data na coleção episodios_memoria (idempotente — reusa o registro
 *   do dia se já existir). Encadeia via episodio_anterior e herda
 *   pendencias_carregadas do a_fazer do episódio anterior.
 * - GET  /backend/v1/episodios        — lista paginada (desc por data)
 * - POST /backend/v1/episodios/gerar  — gera/regenera o episódio de 1 dia
 *
 * As rotas de memória compartilhada vivem SOMENTE em memoria_compartilhada.js
 * (nada duplicado aqui). Datas gravadas como AAAA-MM-DD (texto `data`).
 *
 * IMPORTANTE (JSVM do PocketBase): callbacks cronAdd/routerAdd NÃO veem
 * declarações de topo do arquivo — TODA a lógica (helpers incluídos) vive
 * inline dentro de cada callback. Nada fora de cronAdd/routerAdd aqui.
 */

// ————— Cron diário: 22:30 —————
cronAdd('episodios_memoria_diaria', '30 22 * * *', () => {
  // —— helpers inline (JSVM: nada de topo visível aqui) ——
  const dataDeHoje = () => {
    const agora = new Date()
    return new Date(agora.getTime() - agora.getTimezoneOffset() * 60000).toISOString().slice(0, 10)
  }

  const textoOuVazio = (r, campo) => {
    try {
      const v = r.getString(campo)
      return v === 'undefined' ? '' : v
    } catch (_) {
      return ''
    }
  }

  const dataAnteriorDe = (data) => {
    const d = new Date(data + 'T12:00:00.000Z')
    d.setUTCDate(d.getUTCDate() - 1)
    return d.toISOString().slice(0, 10)
  }

  const linhasDe = (texto) =>
    String(texto || '')
      .split('\n')
      .map((l) => l.replace(/^[-•*\s]+/, '').trim())
      .filter(Boolean)
      .slice(0, 20)

  const gerarPara = (usuarioId, data) => {
    // Resumo do dia (fonte do episódio)
    let feito = ''
    let aFazer = ''
    let decisoes = ''
    let resumoTexto = ''
    let totalRegistros = 0
    try {
      const rs = $app.findRecordsByFilter('resumos_dia', `data = "${data}"`, '-created', 1, 0)
      if (rs.length > 0) {
        feito = textoOuVazio(rs[0], 'feito')
        aFazer = textoOuVazio(rs[0], 'a_fazer')
        decisoes = textoOuVazio(rs[0], 'decisoes')
        totalRegistros = rs[0].getInt('total_registros') || 0
        resumoTexto =
          (feito ? `Feito: ${feito}\n` : '') +
          (decisoes ? `Decisões: ${decisoes}\n` : '') +
          (aFazer ? `A fazer: ${aFazer}` : '')
      }
    } catch (_) {}

    // Episódio anterior (encadeamento + pendências herdadas)
    const dataAnt = dataAnteriorDe(data)
    let episodioAnteriorId = ''
    let pendenciasCarregadas = []
    try {
      const ant = $app.findRecordsByFilter(
        'episodios_memoria',
        `usuario = "${usuarioId}" && data = "${dataAnt}"`,
        '-created',
        1,
        0,
      )
      if (ant.length > 0) {
        episodioAnteriorId = ant[0].id
        try {
          const pc = ant[0].get('a_fazer')
          const bruto = typeof pc === 'string' ? pc : JSON.stringify(pc || [])
          pendenciasCarregadas = linhasDe(bruto === 'undefined' ? '' : bruto)
        } catch (_) {
          pendenciasCarregadas = []
        }
      }
    } catch (_) {}

    // Idempotência: reusa o episódio do dia
    const col = $app.findCollectionByNameOrId('episodios_memoria')
    const existentes = $app.findRecordsByFilter(
      'episodios_memoria',
      `usuario = "${usuarioId}" && data = "${data}"`,
      '-created',
      1,
      0,
    )
    const reg = existentes.length > 0 ? existentes[0] : new Record(col)
    const criado = existentes.length === 0
    reg.set('usuario', usuarioId)
    reg.set('data', data)
    reg.set('titulo', 'Dia ' + data)
    reg.set('resumo', (resumoTexto || 'Sem resumo da Organizadora para este dia.').slice(0, 12000))
    reg.set('feito', feito.slice(0, 6000))
    reg.set('a_fazer', aFazer.slice(0, 6000))
    reg.set('decisoes', decisoes.slice(0, 3000))
    reg.set('pendencias_carregadas', JSON.stringify(pendenciasCarregadas))
    reg.set('total_registros', totalRegistros)
    reg.set('gerado_por', 'diamantina-organizadora-diaria')
    reg.set('origem', 'cron')
    reg.set('episodio_anterior', episodioAnteriorId)
    $app.save(reg)
    return { id: reg.id, data, criado }
  }

  try {
    const dataDia = dataDeHoje()
    const usuarios = $app.findRecordsByFilter('users', 'verified = true', '-created', 200, 0)
    let ok = 0
    for (const u of usuarios) {
      try {
        gerarPara(u.id, dataDia)
        ok++
      } catch (e) {
        console.error('[episodios_memoria] falha para usuário ' + u.id + ': ' + e)
      }
    }
    console.log(
      '[episodios_memoria] episódios de ' +
        dataDia +
        ': ' +
        ok +
        ' usuários processados (cron 22h30).',
    )
  } catch (err) {
    console.error('[episodios_memoria] erro no cron:', err.message)
  }
})

// ————— Lista paginada —————
routerAdd(
  'GET',
  '/backend/v1/episodios',
  (e) => {
    try {
      const usuarioId = e.auth && e.auth.id ? e.auth.id : ''
      if (!usuarioId) return e.unauthorizedError('autenticação obrigatória')

      // helpers inline (JSVM)
      const textoOuVazio = (r, campo) => {
        try {
          const v = r.getString(campo)
          return v === 'undefined' ? '' : v
        } catch (_) {
          return ''
        }
      }

      const q = e.requestInfo().query || {}
      const page = Math.max(1, Number(q.page) || 1)
      const perPage = Math.min(50, Math.max(1, Number(q.perPage) || 20))
      const filtro = `usuario = "${usuarioId}"`
      const total = $app.countRecords('episodios_memoria', filtro)
      const registros = $app.findRecordsByFilter(
        'episodios_memoria',
        filtro,
        '-data',
        perPage,
        (page - 1) * perPage,
      )

      const itens = []
      for (const r of registros) {
        const lerJson = (campo) => {
          try {
            const v = r.get(campo)
            const bruto = typeof v === 'string' ? v : JSON.stringify(v || [])
            const parsed = JSON.parse(bruto && bruto !== 'undefined' ? bruto : '[]')
            return Array.isArray(parsed) ? parsed : []
          } catch (_) {
            return []
          }
        }
        itens.push({
          id: r.id,
          data: textoOuVazio(r, 'data').slice(0, 10),
          titulo: textoOuVazio(r, 'titulo'),
          resumo: textoOuVazio(r, 'resumo'),
          feito: textoOuVazio(r, 'feito'),
          a_fazer: textoOuVazio(r, 'a_fazer'),
          decisoes: textoOuVazio(r, 'decisoes'),
          pendencias_carregadas: lerJson('pendencias_carregadas'),
          total_registros: r.getInt('total_registros') || 0,
          gerado_por: textoOuVazio(r, 'gerado_por'),
          origem: textoOuVazio(r, 'origem'),
          episodio_anterior: r.getString('episodio_anterior'),
          updated: r.getString('updated'),
        })
      }
      return e.json(200, { itens, page, perPage, totalItens: total })
    } catch (err) {
      return e.json(500, { error: err.message || 'Falha ao listar episódios' })
    }
  },
  $apis.requireAuth(),
)

// ————— Gera/regenera o episódio de um dia (sob demanda) —————
routerAdd(
  'POST',
  '/backend/v1/episodios/gerar',
  (e) => {
    try {
      const usuarioId = e.auth && e.auth.id ? e.auth.id : ''
      if (!usuarioId) return e.unauthorizedError('autenticação obrigatória')

      // helpers inline (JSVM)
      const textoOuVazio = (r, campo) => {
        try {
          const v = r.getString(campo)
          return v === 'undefined' ? '' : v
        } catch (_) {
          return ''
        }
      }

      const dataAnteriorDe = (d) => {
        const x = new Date(d + 'T12:00:00.000Z')
        x.setUTCDate(x.getUTCDate() - 1)
        return x.toISOString().slice(0, 10)
      }

      const linhasDe = (texto) =>
        String(texto || '')
          .split('\n')
          .map((l) => l.replace(/^[-•*\s]+/, '').trim())
          .filter(Boolean)
          .slice(0, 20)

      const body = e.requestInfo().body || {}
      const agora = new Date()
      const hoje = new Date(agora.getTime() - agora.getTimezoneOffset() * 60000)
        .toISOString()
        .slice(0, 10)
      const data = String(body.data || hoje).slice(0, 10)

      let feito = ''
      let aFazer = ''
      let decisoes = ''
      let resumoTexto = ''
      let totalRegistros = 0
      try {
        const rs = $app.findRecordsByFilter('resumos_dia', `data = "${data}"`, '-created', 1, 0)
        if (rs.length > 0) {
          feito = textoOuVazio(rs[0], 'feito')
          aFazer = textoOuVazio(rs[0], 'a_fazer')
          decisoes = textoOuVazio(rs[0], 'decisoes')
          totalRegistros = rs[0].getInt('total_registros') || 0
          resumoTexto =
            (feito ? `Feito: ${feito}\n` : '') +
            (decisoes ? `Decisões: ${decisoes}\n` : '') +
            (aFazer ? `A fazer: ${aFazer}` : '')
        }
      } catch (_) {}

      const dataAnt = dataAnteriorDe(data)
      let episodioAnteriorId = ''
      let pendenciasCarregadas = []
      try {
        const ant = $app.findRecordsByFilter(
          'episodios_memoria',
          `usuario = "${usuarioId}" && data = "${dataAnt}"`,
          '-created',
          1,
          0,
        )
        if (ant.length > 0) {
          episodioAnteriorId = ant[0].id
          try {
            const pc = ant[0].get('a_fazer')
            const bruto = typeof pc === 'string' ? pc : JSON.stringify(pc || [])
            pendenciasCarregadas = linhasDe(bruto === 'undefined' ? '' : bruto)
          } catch (_) {
            pendenciasCarregadas = []
          }
        }
      } catch (_) {}

      const col = $app.findCollectionByNameOrId('episodios_memoria')
      const existentes = $app.findRecordsByFilter(
        'episodios_memoria',
        `usuario = "${usuarioId}" && data = "${data}"`,
        '-created',
        1,
        0,
      )
      const reg = existentes.length > 0 ? existentes[0] : new Record(col)
      reg.set('usuario', usuarioId)
      reg.set('data', data)
      reg.set('titulo', 'Dia ' + data)
      reg.set(
        'resumo',
        (resumoTexto || 'Sem resumo da Organizadora para este dia.').slice(0, 12000),
      )
      reg.set('feito', feito.slice(0, 6000))
      reg.set('a_fazer', aFazer.slice(0, 6000))
      reg.set('decisoes', decisoes.slice(0, 3000))
      reg.set('pendencias_carregadas', JSON.stringify(pendenciasCarregadas))
      reg.set('total_registros', totalRegistros)
      reg.set('gerado_por', 'diamantina-organizadora-diaria')
      reg.set('origem', 'manual')
      reg.set('episodio_anterior', episodioAnteriorId)
      $app.save(reg)

      return e.json(200, { sucesso: true, id: reg.id, data, criado: existentes.length === 0 })
    } catch (err) {
      return e.json(500, { error: err.message || 'Falha ao gerar episódio' })
    }
  },
  $apis.requireAuth(),
)
