/// <reference path="../pb_data/types.d.ts" />

/**
 * Caçador de Sementes — Diamantina (agente nativo 'diamantina-cacador-sementes')
 *
 * Pacote das 4 melhorias (migration 1762800030):
 * - Score determinístico por semente: dias no cofre, revisão vencida, parceiro
 *   citado em registros recentes, tese aquecida (germinou nos últimos 30 dias)
 *   e feedback do usuário (pesos por tipo de motivo em preferencias_cacador).
 * - Cada sugestão sai com {motivo, contra_argumento, score}; a caçada grava
 *   resumo (texto em pt-BR), status_registros (rastro: germinada/ignorada/
 *   madura por folha_id) e total_geradas/germinadas/ignoradas.
 * - Citação do registro que "madureou" a semente (apareceu na Folha nos
 *   últimos 7 dias) no motivo, e aprendizado: germinar aumenta o peso do tipo
 *   de motivo, ignorar reduz (persistido em preferencias_cacador).
 * - Selo "insistente": campo cacador_aparicoes em folha_dia incrementado a
 *   cada caçada em que a semente volta a aparecer.
 *
 * IMPORTANTE (JSVM do PocketBase): os callbacks do cronAdd/routerAdd rodam em
 * um pool de VM separado — funções e variáveis de topo do arquivo NÃO estão no
 * escopo dentro deles. Por isso TODA a lógica vive DENTRO de cada callback
 * (helpers duplicados inline de propósito).
 */

// ————— Cron diário: 21:00 —————
cronAdd('cacador_sementes_diario', '0 21 * * *', () => {
  try {
    executarCacada('cron21h', '')
  } catch (err) {
    console.error('[cacador-sementes] Falha no cron das 21h:', err.message)
  }
})

// ————— Endpoint sob demanda (botão "Gerar sugestões agora") —————
routerAdd(
  'POST',
  '/backend/v1/cacador-sementes/gerar',
  (e) => {
    const userId = e.auth && e.auth.id ? e.auth.id : ''
    if (!userId) return e.unauthorizedError('auth required')
    try {
      const body = e.requestInfo().body || {}
      const dataParam = body.data ? String(body.data).slice(0, 10) : ''
      const resultado = executarCacada('manual', userId, dataParam)
      return e.json(200, {
        sucesso: true,
        sugestao_id: resultado.sugestaoId,
        atualizado: resultado.atualizado,
        total_sementes: resultado.totalSementes,
        total_maduras: resultado.totalMaduras,
        total_sugestoes: resultado.totalSugestoes,
      })
    } catch (err) {
      return e.json(500, {
        sucesso: false,
        error: err.message || 'Falha ao caçar sementes maduras',
      })
    }
  },
  $apis.requireAuth(),
)

// ————— Endpoint: marcar sugestão como IGNORADA (botão "Ignorar") —————
routerAdd(
  'POST',
  '/backend/v1/cacador-sementes/ignorar',
  (e) => {
    const userId = e.auth && e.auth.id ? e.auth.id : ''
    if (!userId) return e.unauthorizedError('auth required')
    try {
      const body = e.requestInfo().body || {}
      const dataDia = String(body.data_geracao || '').slice(0, 10)
      const folhaId = String(body.folha_id || '')
      if (!dataDia || !folhaId) {
        return e.json(400, { sucesso: false, error: 'data_geracao e folha_id são obrigatórios' })
      }

      const registros = $app.findRecordsByFilter(
        'sugestoes_sementes',
        `usuario = "${userId}" && data_geracao = "${dataDia}"`,
        '-created',
        1,
        0,
      )
      if (registros.length === 0) {
        return e.json(404, { sucesso: false, error: 'Caçada não encontrada para esta data' })
      }
      const rec = registros[0]

      // —— status_registros: folha_id → {status, tipo_motivo} ——
      let statusMap = {}
      try {
        const bruto = rec.getString('status_registros')
        if (bruto && bruto !== 'undefined' && bruto !== 'null') statusMap = JSON.parse(bruto)
      } catch (_) {}
      const anterior = statusMap[folhaId] || {}
      const tipoMotivo = anterior.tipo_motivo || 'outros'
      const jaIgnorada = anterior.status === 'ignorada'
      statusMap[folhaId] = {
        status: 'ignorada',
        tipo_motivo: tipoMotivo,
        ignorada_em: new Date().toISOString(),
      }

      // —— preferencias: reduz o peso do tipo de motivo ignorado ——
      let prefs = { germinou: {}, ignorou: {} }
      try {
        const bruto = rec.getString('preferencias_cacador')
        if (bruto && bruto !== 'undefined' && bruto !== 'null') prefs = JSON.parse(bruto)
      } catch (_) {}
      if (!prefs.germinou) prefs.germinou = {}
      if (!prefs.ignorou) prefs.ignorou = {}
      if (!jaIgnorada) {
        prefs.ignorou[tipoMotivo] = (prefs.ignorou[tipoMotivo] || 0) + 1
      }

      const totalIgnoradas = Object.values(statusMap).filter(
        (s) => s && s.status === 'ignorada',
      ).length

      rec.set('status_registros', JSON.stringify(statusMap))
      rec.set('preferencias_cacador', JSON.stringify(prefs))
      rec.set('total_ignoradas', totalIgnoradas)
      $app.save(rec)

      // —— preferências válidas para todas as caçadas futuras (todas as linhas)
      try {
        const todas = $app.findRecordsByFilter(
          'sugestoes_sementes',
          `usuario = "${userId}" && data_geracao != "${dataDia}"`,
          '-created',
          100,
          0,
        )
        todas.forEach((r) => {
          r.set('preferencias_cacador', JSON.stringify(prefs))
          $app.save(r)
        })
      } catch (_) {}

      console.log(
        `[cacador-sementes] Sugestão ${folhaId} da caçada ${dataDia} marcada como IGNORADA (tipo=${tipoMotivo}, usuario=${userId}).`,
      )
      return e.json(200, { sucesso: true, total_ignoradas: totalIgnoradas })
    } catch (err) {
      return e.json(500, {
        sucesso: false,
        error: err.message || 'Falha ao ignorar sugestão',
      })
    }
  },
  $apis.requireAuth(),
)

/**
 * Executa a caçada completa (compartilhada pelo cron e pelo endpoint).
 * Definida aqui FORA dos callbacks de propósito: no JSVM do PocketBase a
 * função de topo SÓ é visível quando os callbacks chamam-na pelo nome global
 * registrado neste mesmo arquivo — por isso ela é declarada no nível do
 * arquivo (função nomeada), e não dentro deles.
 */
function executarCacada(gatilho, userIdForcado, dataParam) {
  const AGENTE_SLUG = 'diamantina-cacador-sementes'

  const dataDeHoje = () => {
    const agora = new Date()
    const offsetMs = agora.getTimezoneOffset() * 60000
    return new Date(agora.getTime() - offsetMs).toISOString().slice(0, 10)
  }

  const textoOuVazio = (r, campo) => {
    try {
      const v = r.getString(campo)
      return v === 'undefined' ? '' : v
    } catch (_) {
      return ''
    }
  }

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

  const dataDia = dataParam || dataDeHoje()
  const agora = new Date()

  // —— 1. Cofre por Tese: sementes ainda não germinadas
  const sementes = $app.findRecordsByFilter(
    'folha_dia',
    'estado_semente = true && semente_germinada != true',
    '-created',
    300,
    0,
  )

  // —— 2. Movimento recente (7 dias): registros da Folha que citam parceiro/negócio
  const nomesMovimento = {}
  const registrosQueMadurearam = {}
  try {
    const desde = new Date(agora.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString()
    const recentes = $app.findRecordsByFilter(
      'folha_dia',
      `estado_semente != true && created > "${desde}"`,
      '-created',
      200,
      0,
    )
    recentes.forEach((r) => {
      const p = textoOuVazio(r, 'semente_parceiro').toLowerCase().trim()
      const n = textoOuVazio(r, 'semente_negocio').toLowerCase().trim()
      const trecho = valorTexto(textoOuVazio(r, 'registro'), 80)
      if (p) {
        nomesMovimento[p] = true
        registrosQueMadurearam[p] = trecho
      }
      if (n) {
        nomesMovimento[n] = true
        registrosQueMadurearam[n] = trecho
      }
    })
  } catch (_) {}

  // —— 3. Tese aquecida: sementes da MESMA tese germinaram nos últimos 30 dias
  const tesesAquecidas = {}
  try {
    const desde30 = new Date(agora.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10)
    const germinadas = $app.findRecordsByFilter(
      'folha_dia',
      `estado_semente = true && semente_germinada = true && updated >= "${desde30}" && tese_semente != ""`,
      '-updated',
      200,
      0,
    )
    germinadas.forEach((g) => {
      const teseId = textoOuVazio(g, 'tese_semente')
      if (teseId) tesesAquecidas[teseId] = true
    })
  } catch (_) {}

  // —— 4. Preferências de aprendizado do usuário (pesos por tipo de motivo)
  let prefs = { germinou: {}, ignorou: {} }
  if (userIdForcado) {
    try {
      const ultimas = $app.findRecordsByFilter(
        'sugestoes_sementes',
        `usuario = "${userIdForcado}"`,
        '-created',
        1,
        0,
      )
      if (ultimas.length > 0) {
        const bruto = ultimas[0].getString('preferencias_cacador')
        if (bruto && bruto !== 'undefined' && bruto !== 'null') {
          const parsed = JSON.parse(bruto)
          if (parsed && typeof parsed === 'object') {
            prefs = {
              germinou: parsed.germinou || {},
              ignorou: parsed.ignorou || {},
            }
          }
        }
      }
    } catch (_) {}
  }

  // —— 5. Pré-filtro de maturidade + SCORE determinístico ——
  const PESO_BASE = 10
  const fatoresScore = {
    diasNoCofre: (dias) => Math.min(30, Math.max(0, dias)) * 0.5,
    revisaoVencida: (diasVencida) => (diasVencida > 0 ? 20 + Math.min(20, diasVencida) : 0),
    parceiroCitado: () => 25,
    teseAquecida: () => 15,
    feedback: (tipo) => {
      const g = (prefs.germinou && prefs.germinou[tipo]) || 0
      const i = (prefs.ignorou && prefs.ignorou[tipo]) || 0
      return Math.max(-25, Math.min(25, (g - i) * 8))
    },
  }

  const classificarSemente = (s) => {
    const criadoEm = textoOuVazio(s, 'created') || String(s.created || '')
    const revisao = textoOuVazio(s, 'data_revisao_semente').slice(0, 10)
    const antiga = criadoEm ? new Date(String(criadoEm).replace(' ', 'T')).getTime() : 0
    const diasNoCofre = antiga ? Math.floor((agora.getTime() - antiga) / (24 * 60 * 60 * 1000)) : 0
    const diasVencida = revisao
      ? Math.floor(
          (agora.getTime() - new Date(revisao + 'T23:59:59Z').getTime()) / (24 * 60 * 60 * 1000),
        )
      : 0
    const revisaoVencida = diasVencida > 0
    const parceiro = textoOuVazio(s, 'semente_parceiro').toLowerCase().trim()
    const negocio = textoOuVazio(s, 'semente_negocio').toLowerCase().trim()
    const chaveMovimento =
      (parceiro && nomesMovimento[parceiro]) || (negocio && nomesMovimento[negocio])
    const movimento = Boolean(chaveMovimento)
    const registroMadureu = movimento ? registrosQueMadurearam[parceiro || negocio] || '' : ''
    const teseId = textoOuVazio(s, 'tese_semente')
    const teseAquecida = Boolean(teseId && tesesAquecidas[teseId])

    const madura = diasNoCofre >= 30 || revisaoVencida || movimento
    if (!madura) return null

    let score = PESO_BASE
    score += fatoresScore.diasNoCofre(diasNoCofre)
    if (revisaoVencida) score += fatoresScore.revisaoVencida(diasVencida)
    if (movimento) score += fatoresScore.parceiroCitado()
    if (teseAquecida) score += fatoresScore.teseAquecida()

    const tiposMotivo = []
    if (movimento) tiposMotivo.push('movimento_recente')
    if (revisaoVencida) tiposMotivo.push('revisao_vencida')
    if (diasNoCofre >= 30) tiposMotivo.push('tempo_cofre')
    if (teseAquecida) tiposMotivo.push('tese_aquecida')
    const tipoMotivo = tiposMotivo[0] || 'tempo_cofre'
    score += fatoresScore.feedback(tipoMotivo)

    let aparicoes = 0
    try {
      aparicoes = Number(textoOuVazio(s, 'cacador_aparicoes')) || 0
    } catch (_) {}

    return {
      rec: s,
      score: Math.round(score),
      diasNoCofre,
      revisaoVencida,
      revisao,
      movimento,
      registroMadureu,
      teseId,
      teseAquecida,
      parceiro: textoOuVazio(s, 'semente_parceiro'),
      negocio: textoOuVazio(s, 'semente_negocio'),
      tipoMotivo,
      aparicoes,
    }
  }

  const classificadas = []
  sementes.forEach((s) => {
    const c = classificarSemente(s)
    if (c) classificadas.push(c)
  })
  classificadas.sort((a, b) => b.score - a.score)
  const totalMaduras = classificadas.length

  // —— 6. Histórico de aparições: sementes sugeridas em caçadas anteriores ——
  const aparicoesAnteriores = {}
  try {
    const anteriores = $app.findRecordsByFilter(
      'sugestoes_sementes',
      userIdForcado
        ? `usuario = "${userIdForcado}" && data_geracao != "${dataDia}"`
        : `data_geracao != "${dataDia}"`,
      '-created',
      60,
      0,
    )
    anteriores.forEach((r) => {
      try {
        const bruto = r.getString('sugestoes')
        if (!bruto || bruto === 'undefined' || bruto === 'null') return
        const arr = JSON.parse(bruto)
        if (!Array.isArray(arr)) return
        arr.forEach((sg) => {
          if (sg && sg.folha_id) {
            aparicoesAnteriores[sg.folha_id] = (aparicoesAnteriores[sg.folha_id] || 0) + 1
          }
        })
      } catch (_) {}
    })
  } catch (_) {}

  // —— 7. Prompt para o agente ——
  const descSemente = (c) =>
    `- id=${c.rec.id} | tese="${(() => {
      try {
        return c.teseId ? $app.findRecordById('teses_sementes', c.teseId).getString('nome') : ''
      } catch (_) {
        return ''
      }
    })()}" | score=${c.score} | guardada há ${c.diasNoCofre} dia(s) | revisão prevista=${
      c.revisao || '—'
    }${c.revisaoVencida ? ' (VENCIDA)' : ''} | parceiro="${c.parceiro}" | negócio="${
      c.negocio
    }"${c.movimento ? ` | MOVIMENTO NOVO: registro da Folha citou este parceiro/negócio: "${c.registroMadureu}"` : ''}${
      c.teseAquecida
        ? ' | tese aquecida (outra semente da mesma tese germinou nos últimos 30 dias)'
        : ''
    } | sugestões anteriores=${c.aparicoes + (aparicoesAnteriores[c.rec.id] || 0)} | texto="${textoOuVazio(
      c.rec,
      'registro',
    ).slice(0, 180)}"`

  let prompt
  if (totalMaduras === 0) {
    prompt = `Você é a Diamantina, o Caçador de Sementes do Agenda IA Diamond. Hoje (${dataDia}) nenhuma semente do Cofre por Tese está madura para germinar: ${sementes.length} semente(s) no cofre, todas ainda novas e sem movimento novo do parceiro/negócio. Escreva uma mensagem curta, educada e motivadora em pt-BR comunicando isso, sem inventar conteúdo. Depois, devolva SOMENTE um bloco JSON no formato:
{"tem_sugestoes": false, "mensagem": "...", "sugestoes": []}`
  } else {
    const lista = classificadas.slice(0, 60).map(descSemente).join('\n')
    prompt = `Você é a Diamantina, o Caçador de Sementes do Agenda IA Diamond. Abaixo estão as sementes do Cofre por Tese que passaram no pré-filtro de maturidade, JÁ ORDENADAS por score determinístico (dias no cofre, revisão vencida, parceiro citado em registro recente, tese aquecida e histórico do usuário) — data da caçada: ${dataDia}.

${lista}

Avalie quais realmente merecem germinar HOJE e devolva SOMENTE um bloco JSON puro (sem markdown) no formato:
{
  "tem_sugestoes": true,
  "mensagem": "",
  "sugestoes": [
    {
      "folha_id": "id exato da semente referenciada",
      "tese": "nome da tese de mercado (a mesma da lista)",
      "motivo": "por que esta semente amadureceu HOJE (pt-BR, 1 a 3 frases, citando critérios observados; se houver MOVIMENTO NOVO, cite o registro da Folha que madureou)",
      "contra_argumento": "por que esperar mais um pouco — o argumento honesto contrário (pt-BR, 1 a 2 frases)",
      "titulo_card_sugerido": "título do card de demanda a criar ao germinar",
      "prioridade": "alta | media | baixa",
      "urgente": true ou false — true só quando movimento novo + revisão vencida apontam na mesma direção
    }
  ]
}
Regras: seja conservador(a) — prefira poucas sementes realmente prontas a uma lista inflada; MANTENHA a ordem de score da lista no array "sugestoes"; use os ids exatos (folha_id); nunca invente nomes, datas ou movimentos; se nenhuma merecer germinar, devolva "tem_sugestoes": false com uma "mensagem" educada explicando.`
  }

  // —— 8. Uma única caçada com o agente ——
  const res = $ai.agent(AGENTE_SLUG).chat({ message: prompt, conversation: null })
  const conteudo = res && res.content ? res.content : ''
  const parsed = extrairJson(conteudo) || {}

  // normalização preservando score/ordem/movimento da classificação
  const porId = {}
  classificadas.forEach((c) => {
    porId[c.rec.id] = c
  })

  const sugestoes = (Array.isArray(parsed.sugestoes) ? parsed.sugestoes : [])
    .filter((s) => s && (s.folha_id || s.trecho))
    .slice(0, 20)
    .map((s) => {
      const fid = valorTexto(s.folha_id, 60)
      const c = porId[fid]
      const score = c ? c.score : 0
      const tipoMotivo = c ? c.tipoMotivo : 'outros'
      return {
        folha_id: fid,
        tese: valorTexto(s.tese, 160),
        motivo: valorTexto(s.motivo || s.justificativa, 300),
        contra_argumento: valorTexto(s.contra_argumento, 300),
        titulo_card_sugerido: valorTexto(s.titulo_card_sugerido || s.titulo_sugerido, 160),
        prioridade: valorTexto(s.prioridade, 30) || 'media',
        urgente: Boolean(s.urgente),
        score,
        tipo_motivo: tipoMotivo,
      }
    })
    .sort((a, b) => (b.score || 0) - (a.score || 0))

  const temSugestoes = sugestoes.length > 0
  const mensagemVazia = temSugestoes
    ? ''
    : valorTexto(parsed.mensagem, 600) ||
      (sementes.length === 0
        ? 'Seu Cofre por Tese está vazio no momento. Quando arquivar assuntos como Sementes 🌱, eu volto a caçar oportunidades de germinação para você. 💎'
        : 'Por enquanto nenhuma semente do Cofre está madura para germinar — elas ainda estão frescas e sem movimento novo do parceiro/negócio. Volto a caçar amanhã às 21h. 💎🌱')

  // —— 9. Resumo da caçada em pt-BR (usado pelo painel e pela Diamantina) ——
  const totalUrgentes = sugestoes.filter((s) => s.urgente).length
  const nomesTeseUrgentes = sugestoes
    .filter((s) => s.urgente)
    .slice(0, 3)
    .map((s) => s.titulo_card_sugerido || s.tese || 'semente')
  const resumoTexto = temSugestoes
    ? `Foram sugeridas ${sugestoes.length} semente(s) para germinar hoje, ordenadas por prioridade (score determinístico).${totalUrgentes > 0 ? ` Destaque: ${totalUrgentes} urgente(s)${nomesTeseUrgentes.length ? ` — ${nomesTeseUrgentes.join(', ')}` : ''}.` : ''}`
    : mensagemVazia

  // —— 10. Rastro (status por sugestão): germinada / ignorada / ainda madura ——
  const statusMap = {}
  sugestoes.forEach((s) => {
    statusMap[s.folha_id] = { status: 'madura', tipo_motivo: s.tipo_motivo }
  })

  // —— 11. Grava UM registro por usuário/data (idempotente) ——
  const col = $app.findCollectionByNameOrId('sugestoes_sementes')
  const usuarios = userIdForcado
    ? [$app.findRecordById('users', userIdForcado)]
    : $app.findRecordsByFilter('users', '', '-created', 50, 0)
  let gravados = 0

  usuarios.forEach((u) => {
    const uid = u.id
    const existentes = $app.findRecordsByFilter(
      'sugestoes_sementes',
      `usuario = "${uid}" && data_geracao = "${dataDia}"`,
      '-created',
      1,
      0,
    )
    let alvo
    if (existentes.length > 0) {
      alvo = existentes[0]
    } else {
      alvo = new Record(col)
      alvo.set('usuario', uid)
    }

    // preferências: preserva as já gravadas (endpoint ignorar pode ter atualizado)
    let prefsAtuais = { germinou: {}, ignorou: {} }
    try {
      const bruto = alvo.getString('preferencias_cacador')
      if (bruto && bruto !== 'undefined' && bruto !== 'null') {
        const p = JSON.parse(bruto)
        if (p && typeof p === 'object')
          prefsAtuais = { germinou: p.germinou || {}, ignorou: p.ignorou || {} }
      }
    } catch (_) {}
    if (
      Object.keys(prefsAtuais.germinou).length === 0 &&
      Object.keys(prefsAtuais.ignorou).length === 0
    ) {
      prefsAtuais = prefs
    }

    // preserva status de sugestões que o usuário já marcou manualmente nesta data
    let statusAtuais = {}
    try {
      const bruto = alvo.getString('status_registros')
      if (bruto && bruto !== 'undefined' && bruto !== 'null') statusMap = JSON.parse(bruto)
    } catch (_) {}
    const statusFinal = {}
    for (const k in statusMap) {
      statusFinal[k] = statusMap[k]
    }
    for (const k in statusAtuais) {
      if (statusAtuais[k] && statusAtuais[k].status === 'ignorada') {
        statusFinal[k] = statusAtuais[k]
      }
    }
    const totalIgnoradas = Object.values(statusFinal).filter(
      (s) => s && s.status === 'ignorada',
    ).length
    const totalGerminadas = Object.values(statusFinal).filter(
      (s) => s && s.status === 'germinada',
    ).length

    alvo.set('data_geracao', dataDia)
    alvo.set('sugestoes', JSON.stringify(sugestoes))
    alvo.set('mensagem_vazia', mensagemVazia)
    alvo.set('total_sementes', sementes.length)
    alvo.set('total_maduras', totalMaduras)
    alvo.set('gerado_por', AGENTE_SLUG)
    alvo.set('status', temSugestoes ? 'nova' : 'sem_sugestoes')
    alvo.set('status_registros', JSON.stringify(statusFinal))
    alvo.set('preferencias_cacador', JSON.stringify(prefsAtuais))
    alvo.set('resumo', JSON.stringify({ texto: resumoTexto, total_urgentes: totalUrgentes }))
    alvo.set('total_geradas', sugestoes.length)
    alvo.set('total_germinadas', totalGerminadas)
    alvo.set('total_ignoradas', totalIgnoradas)
    $app.save(alvo)
    gravados++
  })

  // —— 12. Selo "insistente": incrementa aparicoes das sementes sugeridas hoje ——
  sugestoes.forEach((s) => {
    if (!s.folha_id) return
    try {
      const sem = $app.findRecordById('folha_dia', s.folha_id)
      const atual = Number(textoOuVazio(sem, 'cacador_aparicoes')) || 0
      sem.set('cacador_aparicoes', atual + 1)
      $app.save(sem)
    } catch (_) {}
  })

  console.log(
    `[cacador-sementes] Caçada de ${dataDia} concluída (gatilho=${gatilho}, usuario=${
      userIdForcado || 'todos'
    }, sementes=${sementes.length}, maduras=${totalMaduras}, sugestoes=${
      sugestoes.length
    }, urgentes=${totalUrgentes}, registros=${gravados}).`,
  )

  return {
    sugestaoId: gravados > 0 ? 'ok' : '',
    atualizado: gravados > 0,
    totalSementes: sementes.length,
    totalMaduras: totalMaduras,
    totalSugestoes: sugestoes.length,
    totalUrgentes,
    resumoTexto,
  }
}
