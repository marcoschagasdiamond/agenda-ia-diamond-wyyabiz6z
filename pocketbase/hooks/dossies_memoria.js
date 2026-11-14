/// <reference path="../pb_data/types.d.ts" />

/**
 * CAMADA 1 — Dossiês consolidados de memória (coleção dossies_memoria).
 *
 * - Cron incremental (a cada 15 min): pega registros novos/desde a última
 *   varredura (folha_dia, cards, eventos_card, chat_mensagens) e regenera
 *   APENAS os dossiês das entidades tocadas — nunca varre os ~3900 contatos.
 * - POST /backend/v1/dossies/regenerar : regenera um dossiê sob demanda
 *   (usuário logado, {tipo_entidade, entidade_id}) — usado pela UI.
 * - POST /backend/v1/dossies/gerar-todos : enfileira TODAS as entidades do
 *   usuário no campo json `fila_dossies` do usuário (batch incremental, ~20
 *   entidades por rodada do cron) — usado pelo botão "Atualizar dossiês".
 * - GET  /backend/v1/dossies           : lista paginada (page, perPage),
 *   somente dossiês do usuário logado, mais recentes primeiro.
 *
 * IMPORTANTE (JSVM): callbacks de cronAdd/routerAdd NÃO veem declarações de
 * topo de arquivo — TODA a lógica (helpers, slugs, prompts) vive INLINE dentro
 * de cada callback, duplicada de propósito.
 */

// ————— Cron incremental: a cada 15 minutos —————
cronAdd('dossies_memoria_consolidar', '*/15 * * * *', () => {
  // —— helpers inline (não referenciam nada de topo) ——
  const AGENTE_SLUG = 'diamantina-analista-memoria'

  const valorTexto = (v, maxLen) => {
    if (v === null || v === undefined) return ''
    let texto = Array.isArray(v) ? v.join('\n') : String(v)
    texto = texto.trim()
    if (maxLen && texto.length > maxLen) texto = texto.slice(0, maxLen)
    return texto
  }

  const extrairJson = (texto) => {
    if (!texto) return null
    let raw = String(texto).trim()
    const m = raw.match(/\{[\s\S]*\}/)
    if (m) raw = m[0]
    raw = raw
      .replace(/^```json\s*/i, '')
      .replace(/^```\s*/, '')
      .replace(/```\s*$/, '')
    try {
      return JSON.parse(raw.trim())
    } catch (_) {
      return null
    }
  }

  const idDeRelacao = (r, campo) => {
    try {
      const v = r.get(campo)
      if (!v) return ''
      if (Array.isArray(v)) return v.length ? String(v[0].id || v[0]) : ''
      return String(v.id || v)
    } catch (_) {
      return ''
    }
  }

  const nomeDeRelacao = (r, campo) => {
    try {
      const v = r.get(campo)
      if (!v) return ''
      const rec = Array.isArray(v) ? v[0] : v
      if (rec && rec.id) return valorTexto(rec.getString('nome'), 160)
      return ''
    } catch (_) {
      return ''
    }
  }

  // timestamp da última rodada (uma varredura atrás, tolerante a primeira execução)
  const desdeTimestamp = () => {
    try {
      const logs = $app.findRecordsByFilter('dossies_memoria', '', '-updated', 1, 0)
      if (logs.length > 0) {
        const t = logs[0].getDateTime('updated').string()
        const d = new Date(t)
        d.setMinutes(d.getMinutes() - 2) // margem: registros salvos durante a rodada
        return d.toISOString()
      }
    } catch (_) {}
    return new Date(Date.now() - 24 * 3600 * 1000).toISOString()
  }

  const salvarFilaNoUsuario = (userId, ids) => {
    try {
      const user = $app.findRecordById('users', userId)
      user.set('fila_dossies', JSON.stringify(ids.slice(0, 400)))
      $app.save(user)
      return true
    } catch (err) {
      console.error('[dossies] falha ao salvar fila no usuário:', err.message)
      return false
    }
  }

  // —— consolidação de um dossiê (usada pelo cron e pelo endpoint manual) ——
  const consolidarDossie = (usuarioId, tipoEntidade, entidadeId, gatilho) => {
    // 1. entidade existe? (contato / negocio / projeto)
    let entidade = null
    try {
      entidade = $app.findRecordById(tipoEntidade, entidadeId)
    } catch (_) {
      return { pulado: 'entidade não encontrada' }
    }
    const nomeEntidade = valorTexto(entidade.getString('nome'), 160)

    // 2. registros ligados à entidade (folha_dia por relação; cards; eventos;
    //    chat por nome — chat_mensagens não tem relation de contato).
    const pedacos = []
    const nomeFiltro = nomeEntidade.replace(/"/g, '\\"')

    try {
      const folha = $app.findRecordsByFilter(
        'folha_dia',
        `${tipoEntidade} = "${entidadeId}"`,
        '-created',
        12,
        0,
      )
      for (const f of folha) {
        const texto = valorTexto(f.getString('registro'), 300)
        if (texto) pedacos.push(`[folha ${f.getString('data')}] ${texto}`)
      }
    } catch (_) {}

    try {
      const cartoes = $app.findRecordsByFilter(
        'cards',
        `${tipoEntidade} = "${entidadeId}"`,
        '-created',
        12,
        0,
      )
      for (const c of cartoes) {
        const titulo = valorTexto(c.getString('titulo'), 160)
        const desc = valorTexto(c.getString('descricao'), 300)
        const prazo = valorTexto(c.getString('data_prazo'), 40)
        const status = valorTexto(c.getString('status'), 40)
        pedacos.push(
          `[card "${titulo}"${status ? ` status=${status}` : ''}${prazo ? ` prazo=${prazo}` : ''}] ${desc || '(sem descrição)'}`,
        )
      }
    } catch (_) {}

    try {
      const demandas = $app.findRecordsByFilter(
        'demandas',
        `${tipoEntidade} = "${entidadeId}"`,
        '-created',
        12,
        0,
      )
      for (const d of demandas) {
        const titulo = valorTexto(d.getString('titulo'), 160)
        const status = valorTexto(d.getString('status'), 40)
        const prazo = valorTexto(d.getString('prazo'), 40)
        pedacos.push(
          `[demanda "${titulo}"${status ? ` status=${status}` : ''}${prazo ? ` prazo=${prazo}` : ''}] ${valorTexto(d.getString('descricao'), 250)}`,
        )
      }
    } catch (_) {}

    try {
      const eventos = $app.findRecordsByFilter(
        'eventos_card',
        `${tipoEntidade} = "${entidadeId}"`,
        '-created',
        12,
        0,
      )
      for (const ev of eventos) {
        pedacos.push(`[anotação/em evento do card] ${valorTexto(ev.getString('conteudo'), 250)}`)
      }
    } catch (_) {}

    try {
      const conversas = $app.findRecordsByFilter(
        'chat_mensagens',
        `texto ~ "${nomeFiltro}"`,
        '-created',
        10,
        0,
      )
      for (const m of conversas) {
        pedacos.push(
          `[chat ${m.getString('created').slice(0, 10)}] ${valorTexto(m.getString('texto'), 250)}`,
        )
      }
    } catch (_) {}

    try {
      const resumos = $app.findRecordsByFilter(
        'resumos_dia',
        `feito ~ "${nomeFiltro}" || a_fazer ~ "${nomeFiltro}" || decisoes ~ "${nomeFiltro}"`,
        '-created',
        6,
        0,
      )
      for (const rz of resumos) {
        const dataR = valorTexto(rz.getString('data'), 40)
        pedacos.push(
          `[resumo ${dataR}] feito: ${valorTexto(rz.getString('feito'), 200)} | a fazer: ${valorTexto(rz.getString('a_fazer'), 200)} | decisões: ${valorTexto(rz.getString('decisoes'), 200)}`,
        )
      }
    } catch (_) {}

    // 3. sem registros novos → não regenera (idempotência)
    if (pedacos.length === 0) return { pulado: 'sem registros' }

    // 4. prompt → agente nativo devolve JSON do dossiê
    const prompt = `Você é a Diamantina, Analista de Memória do Agenda IA Diamond. Consolide os registros abaixo numa entrada de DOSSIÊ de memória sobre "${nomeEntidade}" (tipo: ${tipoEntidade}).

REGISTROS REAIS DO SISTEMA (fonte única — não invente nada fora deles):
${pedacos.join('\n')}

Devolva SOMENTE um bloco JSON puro (sem markdown) no formato:
{
  "resumo": "2 a 4 frases em pt-BR dizendo quem é / o que representa essa entidade para o usuário e o estado atual da relação",
  "decisoes": "decisões firmadas com/nessa entidade, cada uma em uma linha (— se nenhuma)",
  "preferencias": "preferências, objeções e particularidades observadas (— se nenhuma)",
  "ultimas_conversas": "últimas conversas/registros relevantes, cada uma datada, uma por linha (— se nenhuma)",
  "demandas_abertas": [{"titulo":"título","prazo":"dd/mm/aaaa ou ''","prioridade":"baixa|media|alta|urgente"}],
  "proximo_passo": "sugestão de próximo passo (— se não houver)"
}
Regras: use APENAS o que está nos registros; datas no formato dd/mm/aaaa; demandas_abertas só com demandas/cards não concluídos.`

    const res = $ai.agent(AGENTE_SLUG).chat({ message: prompt, conversation: null })
    const parsed = extrairJson(res && res.content ? res.content : '')
    if (!parsed || !parsed.resumo) return { pulado: 'agente não devolveu dossiê válido' }

    // 5. grava idempotente (um dossiê por usuario+tipo+entidade)
    const col = $app.findCollectionByNameOrId('dossies_memoria')
    let existente = null
    try {
      const achados = $app.findRecordsByFilter(
        'dossies_memoria',
        `usuario = "${usuarioId}" && tipo_entidade = "${tipoEntidade}" && entidade_id = "${entidadeId}"`,
        '-created',
        1,
        0,
      )
      if (achados.length > 0) existente = achados[0]
    } catch (_) {}

    const payload = {
      usuario: usuarioId,
      tipo_entidade: tipoEntidade,
      entidade_id: entidadeId,
      entidade_nome: nomeEntidade,
      nome: `${nomeEntidade} (${tipoEntidade})`,
      resumo: valorTexto(parsed.resumo, 2000),
      conteudo: valorTexto(
        `DECISÕES:\n${valorTexto(parsed.decisoes, 3000)}\n\nPREFERÊNCIAS:\n${valorTexto(parsed.preferencias, 2000)}\n\nÚLTIMAS CONVERSAS:\n${valorTexto(parsed.ultimas_conversas, 4000)}\n\nPRÓXIMO PASSO:\n${valorTexto(parsed.proximo_passo, 800)}`,
        12000,
      ),
      demandas_abertas: JSON.stringify(
        Array.isArray(parsed.demandas_abertas) ? parsed.demandas_abertas.slice(0, 20) : [],
      ),
      atualizado_em: new Date().toISOString(),
      gerado_por: AGENTE_SLUG,
    }

    if (existente) {
      for (const k in payload) existente.set(k, payload[k])
      $app.save(existente)
      console.log(`[dossies] dossiê de "${nomeEntidade}" atualizado (gatilho=${gatilho}).`)
      return { id: existente.id, atualizado: true }
    }
    const novo = new Record(col)
    for (const k in payload) novo.set(k, payload[k])
    $app.save(novo)
    console.log(`[dossies] dossiê de "${nomeEntidade}" criado (gatilho=${gatilho}).`)
    return { id: novo.id, criado: true }
  }

  // —— varredura incremental: registros desde a última rodada, com LIMITE ——
  try {
    const desde = desdeTimestamp()
    const fila = {} // "tipo:id" -> true

    const coletar = (colecao, campos, limite) => {
      try {
        const registros = $app.findRecordsByFilter(
          colecao,
          `updated > "${desde}"`,
          '-updated',
          limite,
          0,
        )
        for (const r of registros) {
          for (const campo of campos) {
            const id = idDeRelacao(r, campo)
            if (id) fila[`${campo}:${id}`] = true
          }
        }
      } catch (_) {}
    }

    coletar('folha_dia', ['contato', 'negocio', 'projeto'], 150)
    coletar('cards', ['contato', 'negocio', 'projeto'], 150)
    coletar('demandas', ['contato', 'projeto'], 100)
    coletar('eventos_card', ['card'], 100) // via card → projeto/contato resolvido abaixo

    // eventos_card chega só com card: resolve as entidades do card tocado
    try {
      for (const chave of Object.keys(fila)) {
        if (!chave.startsWith('card:')) continue
        try {
          const card = $app.findRecordById('cards', chave.slice(5))
          for (const campo of ['contato', 'negocio', 'projeto']) {
            const id = idDeRelacao(card, campo)
            if (id) fila[`${campo}:${id}`] = true
          }
        } catch (_) {}
        delete fila[chave]
      }
    } catch (_) {}

    // chat: mensagens novas citam nomes de contato — regenera o dossiê desses
    // contatos (nome no texto é o único vínculo chat↔contato no esquema atual)
    try {
      const mensagens = $app.findRecordsByFilter(
        'chat_mensagens',
        `updated > "${desde}"`,
        '-updated',
        100,
        0,
      )
      for (const m of mensagens) {
        const textoMsg = valorTexto(m.getString('texto'), 400)
        if (!textoMsg) continue
        try {
          const candidatos = $app.findRecordsByFilter(
            'contatos',
            `nome ~ "${textoMsg.slice(0, 60).replace(/"/g, '')}"`,
            '-updated',
            3,
            0,
          )
          for (const c of candidatos) fila[`contato:${c.id}`] = true
        } catch (_) {}
      }
    } catch (_) {}

    // resumos do dia tocados → regenera dossiês das entidades neles citadas
    try {
      const resumos = $app.findRecordsByFilter(
        'resumos_dia',
        `updated > "${desde}"`,
        '-updated',
        5,
        0,
      )
      for (const rz of resumos) {
        const texto = `${valorTexto(rz.getString('feito'), 500)} ${valorTexto(rz.getString('a_fazer'), 500)}`
        try {
          const nomeBusca = texto.trim().slice(0, 60).replace(/"/g, '')
          if (nomeBusca) {
            const contatos = $app.findRecordsByFilter(
              'contatos',
              `nome ~ "${nomeBusca}"`,
              '-updated',
              3,
              0,
            )
            for (const c of contatos) fila[`contato:${c.id}`] = true
          }
        } catch (_) {}
      }
    } catch (_) {}

    // —— fila do(s) usuário(s) (batch incremental ~20 entidades/rodada) ——
    // A varredura não tem "usuário" — os registros são do dono; usamos o
    // criador do registro mais recente como proxy, e mais: a fila dos
    // usuários que têm fila pendente anda SEMPRE (batch de 20/rodada).
    const usuariosComFila = $app.findRecordsByFilter(
      'users',
      'fila_dossies != ""',
      '-updated',
      50,
      0,
    )
    for (const u of usuariosComFila) {
      let itens = []
      try {
        itens = JSON.parse(u.getString('fila_dossies') || '[]')
      } catch (_) {
        itens = []
      }
      if (!Array.isArray(itens) || itens.length === 0) {
        u.set('fila_dossies', '')
        $app.save(u)
        continue
      }
      const lote = itens.slice(0, 20)
      const resto = itens.slice(20)
      for (const item of lote) {
        if (!item || !item.tipo || !item.id) continue
        consolidarDossie(u.id, item.tipo, item.id, 'fila')
      }
      u.set('fila_dossies', JSON.stringify(resto))
      $app.save(u)
      console.log(
        `[dossies] fila de ${u.id}: ${lote.length} processados, ${resto.length} restantes.`,
      )
    }

    // —— entidades tocadas nesta varredura → dossiês diretos (sem fila) ——
    const chaves = Object.keys(fila).slice(0, 25)
    for (const chave of chaves) {
      const [tipo, id] = [chave.slice(0, chave.indexOf(':')), chave.slice(chave.indexOf(':') + 1)]
      // entidade → usuário dono: o registro mais recente que a referencia
      let usuarioDono = ''
      try {
        const exemplos = $app.findRecordsByFilter(
          'folha_dia',
          `${tipo} = "${id}"`,
          '-created',
          1,
          0,
        )
        if (exemplos.length > 0) usuarioDono = idDeRelacao(exemplos[0], 'usuario')
      } catch (_) {}
      if (!usuarioDono) {
        try {
          const exemplos = $app.findRecordsByFilter('cards', `${tipo} = "${id}"`, '-created', 1, 0)
          if (exemplos.length > 0) usuarioDono = idDeRelacao(exemplos[0], 'responsavel')
        } catch (_) {}
      }
      if (!usuarioDono) continue
      consolidarDossie(usuarioDono, tipo, id, 'varredura')
    }
  } catch (err) {
    console.error('[dossies] falha no cron de consolidação:', err.message)
  }
})

// ————— Endpoint: regenerar um dossiê sob demanda (UI do /memoria) —————
routerAdd(
  'POST',
  '/backend/v1/dossies/regenerar',
  (e) => {
    // —— helpers inline (duplicados do cron de propósito: JSVM) ——
    const AGENTE_SLUG = 'diamantina-analista-memoria'
    const valorTexto = (v, maxLen) => {
      if (v === null || v === undefined) return ''
      let texto = Array.isArray(v) ? v.join('\n') : String(v)
      texto = texto.trim()
      if (maxLen && texto.length > maxLen) texto = texto.slice(0, maxLen)
      return texto
    }
    const extrairJson = (texto) => {
      if (!texto) return null
      let raw = String(texto).trim()
      const m = raw.match(/\{[\s\S]*\}/)
      if (m) raw = m[0]
      raw = raw
        .replace(/^```json\s*/i, '')
        .replace(/^```\s*/, '')
        .replace(/```\s*$/, '')
      try {
        return JSON.parse(raw.trim())
      } catch (_) {
        return null
      }
    }

    try {
      const userId = e.auth?.id
      if (!userId) return e.unauthorizedError('autenticação obrigatória')

      const body = e.requestInfo().body || {}
      const tipoEntidade = valorTexto(body.tipo_entidade, 20)
      const entidadeId = valorTexto(body.entidade_id, 60)
      if (!['contato', 'negocio', 'projeto'].includes(tipoEntidade) || !entidadeId) {
        return e.badRequestError('Informe tipo_entidade (contato|negocio|projeto) e entidade_id.')
      }

      const entidade = $app.findRecordById(tipoEntidade, entidadeId)
      const nomeEntidade = valorTexto(entidade.getString('nome'), 160)

      // —— coleta de registros ligados à entidade (mesma do cron) ——
      const pedacos = []
      try {
        const folha = $app.findRecordsByFilter(
          'folha_dia',
          `${tipoEntidade} = "${entidadeId}"`,
          '-created',
          12,
          0,
        )
        for (const f of folha) {
          const texto = valorTexto(f.getString('registro'), 300)
          if (texto) pedacos.push(`[folha ${f.getString('data')}] ${texto}`)
        }
      } catch (_) {}
      try {
        const cartoes = $app.findRecordsByFilter(
          'cards',
          `${tipoEntidade} = "${entidadeId}"`,
          '-created',
          12,
          0,
        )
        for (const c of cartoes) {
          const titulo = valorTexto(c.getString('titulo'), 160)
          const desc = valorTexto(c.getString('descricao'), 300)
          const prazo = valorTexto(c.getString('data_prazo'), 40)
          const status = valorTexto(c.getString('status'), 40)
          pedacos.push(
            `[card "${titulo}"${status ? ` status=${status}` : ''}${prazo ? ` prazo=${prazo}` : ''}] ${desc || '(sem descrição)'}`,
          )
        }
      } catch (_) {}
      try {
        const demandas = $app.findRecordsByFilter(
          'demandas',
          `${tipoEntidade} = "${entidadeId}"`,
          '-created',
          12,
          0,
        )
        for (const d of demandas) {
          const titulo = valorTexto(d.getString('titulo'), 160)
          const status = valorTexto(d.getString('status'), 40)
          const prazo = valorTexto(d.getString('prazo'), 40)
          pedacos.push(
            `[demanda "${titulo}"${status ? ` status=${status}` : ''}${prazo ? ` prazo=${prazo}` : ''}] ${valorTexto(d.getString('descricao'), 250)}`,
          )
        }
      } catch (_) {}
      try {
        const eventos = $app.findRecordsByFilter(
          'eventos_card',
          `${tipoEntidade} = "${entidadeId}"`,
          '-created',
          12,
          0,
        )
        for (const ev of eventos)
          pedacos.push(`[anotação do card] ${valorTexto(ev.getString('conteudo'), 250)}`)
      } catch (_) {}
      try {
        const nomeFiltro = nomeEntidade.replace(/"/g, '\\"')
        const conversas = $app.findRecordsByFilter(
          'chat_mensagens',
          `texto ~ "${nomeFiltro}"`,
          '-created',
          10,
          0,
        )
        for (const m of conversas) {
          pedacos.push(
            `[chat ${m.getString('created').slice(0, 10)}] ${valorTexto(m.getString('texto'), 250)}`,
          )
        }
      } catch (_) {}
      try {
        const nomeFiltro = nomeEntidade.replace(/"/g, '\\"')
        const resumos = $app.findRecordsByFilter(
          'resumos_dia',
          `feito ~ "${nomeFiltro}" || a_fazer ~ "${nomeFiltro}" || decisoes ~ "${nomeFiltro}"`,
          '-created',
          6,
          0,
        )
        for (const rz of resumos) {
          const dataR = valorTexto(rz.getString('data'), 40)
          pedacos.push(
            `[resumo ${dataR}] feito: ${valorTexto(rz.getString('feito'), 200)} | a fazer: ${valorTexto(rz.getString('a_fazer'), 200)} | decisões: ${valorTexto(rz.getString('decisoes'), 200)}`,
          )
        }
      } catch (_) {}

      if (pedacos.length === 0) {
        return e.json(200, {
          sucesso: false,
          motivo: 'sem_registros',
          mensagem: 'Nenhum registro encontrado para essa entidade ainda.',
        })
      }

      const prompt = `Você é a Diamantina, Analista de Memória do Agenda IA Diamond. Consolide os registros abaixo numa entrada de DOSSIÊ de memória sobre "${nomeEntidade}" (tipo: ${tipoEntidade}).

REGISTROS REAIS DO SISTEMA (fonte única — não invente nada fora deles):
${pedacos.join('\n')}

Devolva SOMENTE um bloco JSON puro (sem markdown) no formato:
{
  "resumo": "2 a 4 frases em pt-BR dizendo quem é / o que representa essa entidade para o usuário e o estado atual da relação",
  "decisoes": "decisões firmadas com/nessa entidade, cada uma em uma linha (— se nenhuma)",
  "preferencias": "preferências, objeções e particularidades observadas (— se nenhuma)",
  "ultimas_conversas": "últimas conversas/registros relevantes, cada uma datada, uma por linha (— se nenhuma)",
  "demandas_abertas": [{"titulo":"título","prazo":"dd/mm/aaaa ou ''","prioridade":"baixa|media|alta|urgente"}],
  "proximo_passo": "sugestão de próximo passo (— se não houver)"
}
Regras: use APENAS o que está nos registros; datas no formato dd/mm/aaaa; demandas_abertas só com demandas/cards não concluídos.`

      const res = $ai.agent(AGENTE_SLUG).chat({ message: prompt, conversation: null })
      const parsed = extrairJson(res && res.content ? res.content : '')
      if (!parsed || !parsed.resumo) {
        return e.json(500, {
          sucesso: false,
          error: 'A Diamantina não conseguiu consolidar o dossiê agora. Tente de novo.',
        })
      }

      const col = $app.findCollectionByNameOrId('dossies_memoria')
      let existente = null
      try {
        const achados = $app.findRecordsByFilter(
          'dossies_memoria',
          `usuario = "${userId}" && tipo_entidade = "${tipoEntidade}" && entidade_id = "${entidadeId}"`,
          '-created',
          1,
          0,
        )
        if (achados.length > 0) existente = achados[0]
      } catch (_) {}

      const payload = {
        usuario: userId,
        tipo_entidade: tipoEntidade,
        entidade_id: entidadeId,
        entidade_nome: nomeEntidade,
        nome: `${nomeEntidade} (${tipoEntidade})`,
        resumo: valorTexto(parsed.resumo, 2000),
        conteudo: valorTexto(
          `DECISÕES:\n${valorTexto(parsed.decisoes, 3000)}\n\nPREFERÊNCIAS:\n${valorTexto(parsed.preferencias, 2000)}\n\nÚLTIMAS CONVERSAS:\n${valorTexto(parsed.ultimas_conversas, 4000)}\n\nPRÓXIMO PASSO:\n${valorTexto(parsed.proximo_passo, 800)}`,
          12000,
        ),
        demandas_abertas: JSON.stringify(
          Array.isArray(parsed.demandas_abertas) ? parsed.demandas_abertas.slice(0, 20) : [],
        ),
        atualizado_em: new Date().toISOString(),
        gerado_por: AGENTE_SLUG,
      }

      if (existente) {
        for (const k in payload) existente.set(k, payload[k])
        $app.save(existente)
        return e.json(200, { sucesso: true, id: existente.id, atualizado: true })
      }
      const novo = new Record(col)
      for (const k in payload) novo.set(k, payload[k])
      $app.save(novo)
      return e.json(200, { sucesso: true, id: novo.id, atualizado: false })
    } catch (err) {
      return e.json(500, { sucesso: false, error: err.message || 'Falha ao regenerar dossiê' })
    }
  },
  $apis.requireAuth(),
)

// ————— Endpoint: listar dossiês do usuário (paginado) —————
routerAdd(
  'GET',
  '/backend/v1/dossies',
  (e) => {
    try {
      const userId = e.auth?.id
      if (!userId) return e.unauthorizedError('autenticação obrigatória')

      const query = e.requestInfo().query || {}
      const page = Math.max(1, parseInt(query.page || '1', 10) || 1)
      const perPage = Math.min(50, Math.max(1, parseInt(query.perPage || '20', 10) || 20))
      const busca = valorTexto(query.busca, 120).replace(/"/g, '')
      const tipo = valorTexto(query.tipo_entidade, 20)

      let filtro = `usuario = "${userId}"`
      if (busca) filtro += ` && (nome ~ "${busca}" || resumo ~ "${busca}")`
      if (['contato', 'negocio', 'projeto'].includes(tipo))
        filtro += ` && tipo_entidade = "${tipo}"`

      const registros = $app.findRecordsByFilter(
        'dossies_memoria',
        filtro,
        '-atualizado_em',
        perPage,
        (page - 1) * perPage,
      )
      const itens = registros.map((r) => ({
        id: r.id,
        tipo_entidade: r.getString('tipo_entidade'),
        entidade_id: r.getString('entidade_id'),
        entidade_nome: r.getString('entidade_nome'),
        nome: r.getString('nome'),
        resumo: r.getString('resumo'),
        conteudo: r.getString('conteudo'),
        demandas_abertas: (() => {
          try {
            const bruto = r.getString('demandas_abertas')
            if (!bruto || bruto === 'undefined' || bruto === 'null') return []
            const parsed = JSON.parse(bruto)
            return Array.isArray(parsed) ? parsed : []
          } catch (_) {
            return []
          }
        })(),
        atualizado_em: r.getDateTime('atualizado_em')
          ? r.getDateTime('atualizado_em').string()
          : '',
        updated: r.getDateTime('updated').string(),
      }))

      return e.json(200, { page, perPage, totalItens: itens.length, itens })
    } catch (err) {
      return e.json(500, { error: err.message || 'Falha ao listar dossiês' })
    }
  },
  $apis.requireAuth(),
)
