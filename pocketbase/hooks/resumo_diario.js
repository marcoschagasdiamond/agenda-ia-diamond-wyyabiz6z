/// <reference path="../pb_data/types.d.ts" />

/**
 * Resumo Automático do Dia — Diamantina (agente nativo 'diamantina-organizadora-diaria')
 *
 * - Cron diário às 22:00: lê os registros da folha_dia do dia, pede o resumo
 *   ao agente e grava/atualiza em resumos_dia (idempotente por data).
 * - Endpoint POST /backend/v1/resumo-dia/gerar: regenera o resumo sob demanda
 *   (usado pelo botão "Gerar resumo agora" da /folha).
 *
 * IMPORTANTE (JSVM do PocketBase): os callbacks do cronAdd/routerAdd rodam em
 * um pool de VM separado — funções e variáveis de topo do arquivo NÃO estão no
 * escopo dentro deles. Por isso TODA a lógica vive DENTRO do corpo de cada
 * callback (helpers duplicados inline de propósito).
 */

// ————— Cron diário: 22:00 —————
// (constante do slug inline em cada callback: JSVM não compartilha escopo de topo)
cronAdd('resumo_diario_diamantina', '0 22 * * *', () => {
  // —— helpers inline (não referenciam nada de topo) ——
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

  const descreverRegistro = (r) => {
    const registro = textoOuVazio(r, 'registro')
    const projeto = textoOuVazio(r, 'projeto')
    const contato = textoOuVazio(r, 'contato')
    const fluxo = textoOuVazio(r, 'fluxo')
    const negocio = textoOuVazio(r, 'negocio')
    const ehReuniao = textoOuVazio(r, 'is_reuniao') === 'true'
    const horario = textoOuVazio(r, 'data_hora').slice(11, 16)

    const vinculos = []
    if (projeto) vinculos.push(`projeto=${projeto}`)
    if (contato) vinculos.push(`contato=${contato}`)
    if (fluxo) vinculos.push(`fluxo=${fluxo}`)
    if (negocio) vinculos.push(`negocio=${negocio}`)

    const solto = vinculos.length === 0 ? ' | REGISTRO SOLTO (sem projeto/contato/fluxo)' : ''
    const rotuloReuniao = ehReuniao ? ' [REUNIÃO GRAVADA]' : ''

    return `- id=${r.id} | hora=${horario || '?'}${rotuloReuniao} | texto="${registro}" | vínculos: ${
      vinculos.length ? vinculos.join(', ') : 'nenhum'
    }${solto}`
  }

  const montarPromptResumo = (dataDia, registros) => {
    if (registros.length === 0) {
      return `Você é a Diamantina, organizadora diária do Agenda IA Diamond. O dia ${dataDia} da Folha está em branco: nenhum assunto foi registrado hoje. Escreva uma mensagem curta, educada e motivadora em pt-BR comunicando isso, sem inventar conteúdo. Depois da mensagem, devolva SOMENTE um bloco JSON no formato:
{"fez_registros": false, "feito": "", "a_fazer": "", "prioridades": "", "decisoes": "", "sugestoes": []}`
    }

    const lista = registros.map(descreverRegistro).join('\n')
    return `Você é a Diamantina, organizadora diária do Agenda IA Diamond. Abaixo estão os assuntos registrados na Folha do dia ${dataDia}.

${lista}

Produza o Resumo Automático do Dia em pt-BR e devolva SOMENTE um bloco JSON puro (sem markdown) no formato:
{
  "fez_registros": true,
  "feito": "o que foi concluído/resolvido no dia (pode usar itens separados por nova linha, citando os registros)",
  "a_fazer": "pendências que continuam abertas, com responsável/prazo quando houver",
  "prioridades": "no máximo 3 prioridades para o dia seguinte, em ordem",
  "decisoes": "decisões firmadas no dia; '—' se nenhuma",
  "sugestoes": [
    {
      "folha_id": "id exato do registro da folha referenciado",
      "trecho": "trecho curto do registro original",
      "titulo_sugerido": "título do card/fluxo sugerido",
      "destino_sugerido": "categoria ou fluxo sugerido (texto)",
      "justificativa": "por que vale virar card/fluxo"
    }
  ]
}
Regras: "sugestoes" deve conter APENAS registros soltos (vínculos: nenhum) que mereçam virar card/fluxo. Se nenhum registro estiver solto, devolva "sugestoes": []. Use os ids exatos informados (folha_id).`
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

  const valorTexto = (v, maxLen) => {
    if (v === null || v === undefined) return ''
    let texto = Array.isArray(v) ? v.join('\n') : String(v)
    texto = texto.trim()
    if (maxLen && texto.length > maxLen) texto = texto.slice(0, maxLen)
    return texto
  }

  const normalizarSugestoes = (v) => {
    if (!Array.isArray(v)) return []
    return v
      .filter((s) => s && (s.folha_id || s.trecho))
      .slice(0, 20)
      .map((s) => ({
        folha_id: valorTexto(s.folha_id, 60),
        trecho: valorTexto(s.trecho, 220),
        titulo_sugerido: valorTexto(s.titulo_sugerido, 160),
        destino_sugerido: valorTexto(s.destino_sugerido, 160),
        justificativa: valorTexto(s.justificativa, 300),
      }))
  }

  try {
    const dataDia = dataDeHoje()
    const registros = $app.findRecordsByFilter(
      'folha_dia',
      `(data = "${dataDia}" || data_hora ~ "${dataDia}" || created ~ "${dataDia}") && estado_semente != true`,
      '-created',
      80,
      0,
    )
    const prompt = montarPromptResumo(dataDia, registros)

    const AGENTE_SLUG = 'diamantina-organizadora-diaria'
    const res = $ai.agent(AGENTE_SLUG).chat({
      message: prompt,
      conversation: null,
    })

    const conteudo = res && res.content ? res.content : ''
    const parsed = extrairJson(conteudo) || {}
    const fezRegistros = registros.length > 0

    const payload = {
      data: dataDia,
      feito: valorTexto(parsed.feito, 6000),
      a_fazer: valorTexto(parsed.a_fazer, 6000),
      prioridades: valorTexto(parsed.prioridades, 3000),
      decisoes: valorTexto(parsed.decisoes, 3000),
      proximos_passos: '',
      contagem_cards_criados: 0,
      gerado_por: AGENTE_SLUG,
      total_registros: registros.length,
      sugestoes_cards: JSON.stringify(normalizarSugestoes(parsed.sugestoes)),
      mensagem_sem_registros: fezRegistros
        ? ''
        : valorTexto(parsed.feito, 500) ||
          'Sua Folha está em branco hoje. Quando registrar assuntos, eu organizo tudo por aqui. 💎',
    }

    const col = $app.findCollectionByNameOrId('resumos_dia')
    const existentes = $app.findRecordsByFilter(
      'resumos_dia',
      `data = "${dataDia}"`,
      '-created',
      1,
      0,
    )
    if (existentes.length > 0) {
      const existente = existentes[0]
      for (const k in payload) existente.set(k, payload[k])
      existente.set('updated_manual', new Date().toISOString())
      $app.save(existente)
      console.log(
        `[resumo-diario] Resumo de ${dataDia} atualizado (gatilho=cron22h, registros=${registros.length}).`,
      )
    } else {
      const novo = new Record(col)
      for (const k in payload) novo.set(k, payload[k])
      $app.save(novo)
      console.log(
        `[resumo-diario] Resumo de ${dataDia} criado (gatilho=cron22h, registros=${registros.length}).`,
      )
    }
  } catch (err) {
    console.error('[resumo-diario] Falha no cron do Resumo do Dia:', err.message)
  }
})

// ————— Endpoint sob demanda (botão "Gerar resumo agora") —————
routerAdd(
  'POST',
  '/backend/v1/resumo-dia/gerar',
  (e) => {
    // —— helpers inline (duplicados do cron de propósito: JSVM não compartilha escopo de topo) ——
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

    const descreverRegistro = (r) => {
      const registro = textoOuVazio(r, 'registro')
      const projeto = textoOuVazio(r, 'projeto')
      const contato = textoOuVazio(r, 'contato')
      const fluxo = textoOuVazio(r, 'fluxo')
      const negocio = textoOuVazio(r, 'negocio')
      const ehReuniao = textoOuVazio(r, 'is_reuniao') === 'true'
      const horario = textoOuVazio(r, 'data_hora').slice(11, 16)

      const vinculos = []
      if (projeto) vinculos.push(`projeto=${projeto}`)
      if (contato) vinculos.push(`contato=${contato}`)
      if (fluxo) vinculos.push(`fluxo=${fluxo}`)
      if (negocio) vinculos.push(`negocio=${negocio}`)

      const solto = vinculos.length === 0 ? ' | REGISTRO SOLTO (sem projeto/contato/fluxo)' : ''
      const rotuloReuniao = ehReuniao ? ' [REUNIÃO GRAVADA]' : ''

      return `- id=${r.id} | hora=${horario || '?'}${rotuloReuniao} | texto="${registro}" | vínculos: ${
        vinculos.length ? vinculos.join(', ') : 'nenhum'
      }${solto}`
    }

    const montarPromptResumo = (dataDia, registros) => {
      if (registros.length === 0) {
        return `Você é a Diamantina, organizadora diária do Agenda IA Diamond. O dia ${dataDia} da Folha está em branco: nenhum assunto foi registrado hoje. Escreva uma mensagem curta, educada e motivadora em pt-BR comunicando isso, sem inventar conteúdo. Depois da mensagem, devolva SOMENTE um bloco JSON no formato:
{"fez_registros": false, "feito": "", "a_fazer": "", "prioridades": "", "decisoes": "", "sugestoes": []}`
      }

      const lista = registros.map(descreverRegistro).join('\n')
      return `Você é a Diamantina, organizadora diária do Agenda IA Diamond. Abaixo estão os assuntos registrados na Folha do dia ${dataDia}.

${lista}

Produza o Resumo Automático do Dia em pt-BR e devolva SOMENTE um bloco JSON puro (sem markdown) no formato:
{
  "fez_registros": true,
  "feito": "o que foi concluído/resolvido no dia (pode usar itens separados por nova linha, citando os registros)",
  "a_fazer": "pendências que continuam abertas, com responsável/prazo quando houver",
  "prioridades": "no máximo 3 prioridades para o dia seguinte, em ordem",
  "decisoes": "decisões firmadas no dia; '—' se nenhuma",
  "sugestoes": [
    {
      "folha_id": "id exato do registro da folha referenciado",
      "trecho": "trecho curto do registro original",
      "titulo_sugerido": "título do card/fluxo sugerido",
      "destino_sugerido": "categoria ou fluxo sugerido (texto)",
      "justificativa": "por que vale virar card/fluxo"
    }
  ]
}
Regras: "sugestoes" deve conter APENAS registros soltos (vínculos: nenhum) que mereçam virar card/fluxo. Se nenhum registro estiver solto, devolva "sugestoes": []. Use os ids exatos informados (folha_id).`
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

    const valorTexto = (v, maxLen) => {
      if (v === null || v === undefined) return ''
      let texto = Array.isArray(v) ? v.join('\n') : String(v)
      texto = texto.trim()
      if (maxLen && texto.length > maxLen) texto = texto.slice(0, maxLen)
      return texto
    }

    const normalizarSugestoes = (v) => {
      if (!Array.isArray(v)) return []
      return v
        .filter((s) => s && (s.folha_id || s.trecho))
        .slice(0, 20)
        .map((s) => ({
          folha_id: valorTexto(s.folha_id, 60),
          trecho: valorTexto(s.trecho, 220),
          titulo_sugerido: valorTexto(s.titulo_sugerido, 160),
          destino_sugerido: valorTexto(s.destino_sugerido, 160),
          justificativa: valorTexto(s.justificativa, 300),
        }))
    }

    const AGENTE_SLUG = 'diamantina-organizadora-diaria'
    const gerarResumoDoDia = (dataDia, gatilho) => {
      const registros = $app.findRecordsByFilter(
        'folha_dia',
        `(data = "${dataDia}" || data_hora ~ "${dataDia}" || created ~ "${dataDia}") && estado_semente != true`,
        '-created',
        80,
        0,
      )
      const prompt = montarPromptResumo(dataDia, registros)

      const res = $ai.agent(AGENTE_SLUG).chat({
        message: prompt,
        conversation: null,
      })

      const conteudo = res && res.content ? res.content : ''
      const parsed = extrairJson(conteudo) || {}
      const fezRegistros = registros.length > 0

      const payload = {
        data: dataDia,
        feito: valorTexto(parsed.feito, 6000),
        a_fazer: valorTexto(parsed.a_fazer, 6000),
        prioridades: valorTexto(parsed.prioridades, 3000),
        decisoes: valorTexto(parsed.decisoes, 3000),
        proximos_passos: '',
        contagem_cards_criados: 0,
        gerado_por: AGENTE_SLUG,
        total_registros: registros.length,
        sugestoes_cards: JSON.stringify(normalizarSugestoes(parsed.sugestoes)),
        mensagem_sem_registros: fezRegistros
          ? ''
          : valorTexto(parsed.feito, 500) ||
            'Sua Folha está em branco hoje. Quando registrar assuntos, eu organizo tudo por aqui. 💎',
      }

      const col = $app.findCollectionByNameOrId('resumos_dia')
      const existentes = $app.findRecordsByFilter(
        'resumos_dia',
        `data = "${dataDia}"`,
        '-created',
        1,
        0,
      )
      if (existentes.length > 0) {
        const existente = existentes[0]
        for (const k in payload) existente.set(k, payload[k])
        existente.set('updated_manual', new Date().toISOString())
        $app.save(existente)
        console.log(
          `[resumo-diario] Resumo de ${dataDia} atualizado (gatilho=${gatilho}, registros=${registros.length}).`,
        )
        return { id: existente.id, atualizado: true }
      }

      const novo = new Record(col)
      for (const k in payload) novo.set(k, payload[k])
      $app.save(novo)
      console.log(
        `[resumo-diario] Resumo de ${dataDia} criado (gatilho=${gatilho}, registros=${registros.length}).`,
      )
      return { id: novo.id, atualizado: false }
    }

    const userId = e.auth?.id
    if (!userId) return e.unauthorizedError('auth required')

    const body = e.requestInfo().body || {}
    const dataDia = (body.data && String(body.data).slice(0, 10)) || dataDeHoje()

    try {
      const resultado = gerarResumoDoDia(dataDia, 'manual')
      return e.json(200, {
        sucesso: true,
        resumo_id: resultado.id,
        atualizado: resultado.atualizado,
      })
    } catch (err) {
      return e.json(500, { sucesso: false, error: err.message || 'Falha ao gerar resumo' })
    }
  },
  $apis.requireAuth(),
)
