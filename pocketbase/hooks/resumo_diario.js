/// <reference path="../pb_data/types.d.ts" />

/**
 * Resumo Automático do Dia — Diamantina (agente nativo 'diamantina-organizadora-diaria')
 *
 * - Cron diário às 22:00: lê os registros da folha_dia do dia, pede o resumo
 *   ao agente e grava/atualiza em resumos_dia (idempotente por data).
 * - Endpoint POST /backend/v1/resumo-dia/gerar: regenera o resumo sob demanda
 *   (usado pelo botão "Gerar resumo agora" da /folha).
 * - Integração com o Caçador de Sementes (mão dupla): a caçada do dia
 *   (sugestoes_sementes, gerada às 21h) entra como seção "Oportunidades do
 *   Caçador" no campo json `cacador` do resumo e como linha no prompt —
 *   as oportunidades citadas pelo Caçador alimentam as prioridades da
 *   Diamantina.
 *
 * IMPORTANTE (JSVM do PocketBase): os callbacks do cronAdd/routerAdd rodam em
 * um pool de VM separado — funções e variáveis de topo do arquivo NÃO estão no
 * escopo dentro deles. Por isso TODA a lógica vive DENTRO do corpo de cada
 * callback (helpers duplicados inline de propósito).
 */

// ————— Cron diário: 22:00 —————
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

  const valorTexto = (v, maxLen) => {
    if (v === null || v === undefined) return ''
    let texto = Array.isArray(v) ? v.join('\n') : String(v)
    texto = texto.trim()
    if (maxLen && texto.length > maxLen) texto = texto.slice(0, maxLen)
    return texto
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

  // —— Oportunidades do Caçador (mão dupla com o Caçador de Sementes) ——
  // Sem userId: usa a caçada mais recente do dia (cron roda sem usuário logado).
  // Com userId: prefere a caçada daquele usuário.
  const carregarOportunidadesDoDia = (dataDia, userId) => {
    const vazio = { total: 0, urgentes: 0, itens: [], texto: '', disponivel: false }
    try {
      const filtro = userId
        ? `usuario = "${userId}" && data_geracao = "${dataDia}"`
        : `data_geracao = "${dataDia}"`
      const cacadas = $app.findRecordsByFilter('sugestoes_sementes', filtro, '-created', 10, 0)
      for (const cacada of cacadas) {
        const lerJson = (campo, padrao) => {
          try {
            const bruto = cacada.getString(campo)
            if (!bruto || bruto === 'undefined' || bruto === 'null') return padrao
            const parsed = JSON.parse(bruto)
            return parsed === null || parsed === undefined ? padrao : parsed
          } catch (_) {
            return padrao
          }
        }
        const sugestoes = lerJson('sugestoes', [])
        const statusMap = lerJson('status_registros', {})
        const itens = (Array.isArray(sugestoes) ? sugestoes : [])
          .map((s) => ({
            folha_id: valorTexto(s.folha_id, 60),
            tese: valorTexto(s.tese, 160),
            titulo: valorTexto(s.titulo_card_sugerido, 160),
            motivo: valorTexto(s.motivo, 220),
            contra_argumento: valorTexto(s.contra_argumento, 220),
            prioridade: valorTexto(s.prioridade, 30) || 'media',
            urgente: Boolean(s.urgente),
            score: Number(s.score) || 0,
            status:
              statusMap[s.folha_id] && statusMap[s.folha_id].status
                ? statusMap[s.folha_id].status
                : 'madura',
          }))
          .slice(0, 10)
        if (itens.length === 0) continue
        const urgentes = itens.filter((s) => s.urgente).length
        const nomes = itens.slice(0, 3).map((s) => s.titulo || s.tese || 'semente no cofre')
        return {
          total: itens.length,
          urgentes,
          itens,
          disponivel: true,
          texto: `O Caçador de Sementes apontou ${itens.length} oportunidade(s) para germinar hoje${
            urgentes > 0 ? `, sendo ${urgentes} urgente(s)` : ''
          }: ${nomes.join('; ')}.`,
        }
      }
      return vazio
    } catch (_) {
      return vazio
    }
  }

  const linhaOportunidades = (opp) =>
    `OPORTUNIDADES DO CAÇADOR DE SEMENTES (${opp.total} sugestão(ões), ${opp.urgentes} urgente(s) — considere nas prioridades do dia seguinte): ${opp.texto}`

  const montarPromptResumo = (dataDia, registros, linhaCacador) => {
    if (registros.length === 0) {
      const soCacador = linhaCacador ? ` Ainda assim, hoje há: ${linhaCacador}` : ''
      return `Você é a Diamantina, organizadora diária do Agenda IA Diamond. O dia ${dataDia} da Folha está em branco: nenhum assunto foi registrado hoje.${soCacador} Escreva uma mensagem curta, educada e motivadora em pt-BR comunicando isso, sem inventar conteúdo. Depois da mensagem, devolva SOMENTE um bloco JSON no formato:
{"fez_registros": false, "feito": "", "a_fazer": "", "prioridades": "", "decisoes": "", "sugestoes": []}`
    }

    const lista = registros.map(descreverRegistro).join('\n')
    return `Você é a Diamantina, organizadora diária do Agenda IA Diamond. Abaixo estão os assuntos registrados na Folha do dia ${dataDia}.

${lista}
${linhaCacador ? `\n${linhaCacador}\n` : ''}
Produza o Resumo Automático do Dia em pt-BR e devolva SOMENTE um bloco JSON puro (sem markdown) no formato:
{
  "fez_registros": true,
  "feito": "o que foi concluído/resolvido no dia (pode usar itens separados por nova linha, citando os registros)",
  "a_fazer": "pendências que continuam abertas, com responsável/prazo quando houver",
  "prioridades": "no máximo 3 prioridades para o dia seguinte, em ordem (se houver OPORTUNIDADES DO CAÇADOR, as urgentes entram aqui)",
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

  try {
    const dataDia = dataDeHoje()
    const oppDia = carregarOportunidadesDoDia(dataDia, '')
    const linhaCacador = oppDia.disponivel ? linhaOportunidades(oppDia) : ''
    const registros = $app.findRecordsByFilter(
      'folha_dia',
      `(data = "${dataDia}" || data_hora ~ "${dataDia}" || created ~ "${dataDia}") && estado_semente != true`,
      '-created',
      80,
      0,
    )
    const prompt = montarPromptResumo(dataDia, registros, linhaCacador)

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
      cacador: JSON.stringify(oppDia),
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
        `[resumo-diario] Resumo de ${dataDia} atualizado (gatilho=cron22h, registros=${registros.length}, cacador=${oppDia.total}).`,
      )
    } else {
      const novo = new Record(col)
      for (const k in payload) novo.set(k, payload[k])
      $app.save(novo)
      console.log(
        `[resumo-diario] Resumo de ${dataDia} criado (gatilho=cron22h, registros=${registros.length}, cacador=${oppDia.total}).`,
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

    const valorTexto = (v, maxLen) => {
      if (v === null || v === undefined) return ''
      let texto = Array.isArray(v) ? v.join('\n') : String(v)
      texto = texto.trim()
      if (maxLen && texto.length > maxLen) texto = texto.slice(0, maxLen)
      return texto
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

    // —— Oportunidades do Caçador (mão dupla): prefere a caçada do próprio usuário ——
    const carregarOportunidadesDoDia = (dataDia, userId) => {
      const vazio = { total: 0, urgentes: 0, itens: [], texto: '', disponivel: false }
      try {
        const tentativas = userId
          ? [`usuario = "${userId}" && data_geracao = "${dataDia}"`, `data_geracao = "${dataDia}"`]
          : [`data_geracao = "${dataDia}"`]
        for (const filtro of tentativas) {
          const cacadas = $app.findRecordsByFilter('sugestoes_sementes', filtro, '-created', 10, 0)
          for (const cacada of cacadas) {
            const lerJson = (campo, padrao) => {
              try {
                const bruto = cacada.getString(campo)
                if (!bruto || bruto === 'undefined' || bruto === 'null') return padrao
                const parsed = JSON.parse(bruto)
                return parsed === null || parsed === undefined ? padrao : parsed
              } catch (_) {
                return padrao
              }
            }
            const sugestoes = lerJson('sugestoes', [])
            const statusMap = lerJson('status_registros', {})
            const itens = (Array.isArray(sugestoes) ? sugestoes : [])
              .map((s) => ({
                folha_id: valorTexto(s.folha_id, 60),
                tese: valorTexto(s.tese, 160),
                titulo: valorTexto(s.titulo_card_sugerido, 160),
                motivo: valorTexto(s.motivo, 220),
                contra_argumento: valorTexto(s.contra_argumento, 220),
                prioridade: valorTexto(s.prioridade, 30) || 'media',
                urgente: Boolean(s.urgente),
                score: Number(s.score) || 0,
                status:
                  statusMap[s.folha_id] && statusMap[s.folha_id].status
                    ? statusMap[s.folha_id].status
                    : 'madura',
              }))
              .slice(0, 10)
            if (itens.length === 0) continue
            const urgentes = itens.filter((s) => s.urgente).length
            const nomes = itens.slice(0, 3).map((s) => s.titulo || s.tese || 'semente no cofre')
            return {
              total: itens.length,
              urgentes,
              itens,
              disponivel: true,
              texto: `O Caçador de Sementes apontou ${itens.length} oportunidade(s) para germinar hoje${
                urgentes > 0 ? `, sendo ${urgentes} urgente(s)` : ''
              }: ${nomes.join('; ')}.`,
            }
          }
        }
        return vazio
      } catch (_) {
        return vazio
      }
    }

    const linhaOportunidades = (opp) =>
      `OPORTUNIDADES DO CAÇADOR DE SEMENTES (${opp.total} sugestão(ões), ${opp.urgentes} urgente(s) — considere nas prioridades do dia seguinte): ${opp.texto}`

    const montarPromptResumo = (dataDia, registros, linhaCacador) => {
      if (registros.length === 0) {
        const soCacador = linhaCacador ? ` Ainda assim, hoje há: ${linhaCacador}` : ''
        return `Você é a Diamantina, organizadora diária do Agenda IA Diamond. O dia ${dataDia} da Folha está em branco: nenhum assunto foi registrado hoje.${soCacador} Escreva uma mensagem curta, educada e motivadora em pt-BR comunicando isso, sem inventar conteúdo. Depois da mensagem, devolva SOMENTE um bloco JSON no formato:
{"fez_registros": false, "feito": "", "a_fazer": "", "prioridades": "", "decisoes": "", "sugestoes": []}`
      }

      const lista = registros.map(descreverRegistro).join('\n')
      return `Você é a Diamantina, organizadora diária do Agenda IA Diamond. Abaixo estão os assuntos registrados na Folha do dia ${dataDia}.

${lista}
${linhaCacador ? `\n${linhaCacador}\n` : ''}
Produza o Resumo Automático do Dia em pt-BR e devolva SOMENTE um bloco JSON puro (sem markdown) no formato:
{
  "fez_registros": true,
  "feito": "o que foi concluído/resolvido no dia (pode usar itens separados por nova linha, citando os registros)",
  "a_fazer": "pendências que continuam abertas, com responsável/prazo quando houver",
  "prioridades": "no máximo 3 prioridades para o dia seguinte, em ordem (se houver OPORTUNIDADES DO CAÇADOR, as urgentes entram aqui)",
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

    const userId = e.auth?.id
    if (!userId) return e.unauthorizedError('auth required')

    const body = e.requestInfo().body || {}
    const dataDia = (body.data && String(body.data).slice(0, 10)) || dataDeHoje()

    const gerarResumoDoDia = (dataAlvo, gatilho, usuarioId) => {
      const oppDia = carregarOportunidadesDoDia(dataAlvo, usuarioId)
      const linhaCacador = oppDia.disponivel ? linhaOportunidades(oppDia) : ''
      const registros = $app.findRecordsByFilter(
        'folha_dia',
        `(data = "${dataAlvo}" || data_hora ~ "${dataAlvo}" || created ~ "${dataAlvo}") && estado_semente != true`,
        '-created',
        80,
        0,
      )
      const prompt = montarPromptResumo(dataAlvo, registros, linhaCacador)

      const AGENTE_SLUG = 'diamantina-organizadora-diaria'
      const res = $ai.agent(AGENTE_SLUG).chat({
        message: prompt,
        conversation: null,
      })

      const conteudo = res && res.content ? res.content : ''
      const parsed = extrairJson(conteudo) || {}
      const fezRegistros = registros.length > 0

      const payload = {
        data: dataAlvo,
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
        cacador: JSON.stringify(oppDia),
      }

      const col = $app.findCollectionByNameOrId('resumos_dia')
      const existentes = $app.findRecordsByFilter(
        'resumos_dia',
        `data = "${dataAlvo}"`,
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
          `[resumo-diario] Resumo de ${dataAlvo} atualizado (gatilho=${gatilho}, registros=${registros.length}, cacador=${oppDia.total}).`,
        )
        return { id: existente.id, atualizado: true }
      }

      const novo = new Record(col)
      for (const k in payload) novo.set(k, payload[k])
      $app.save(novo)
      console.log(
        `[resumo-diario] Resumo de ${dataAlvo} criado (gatilho=${gatilho}, registros=${registros.length}, cacador=${oppDia.total}).`,
      )
      return { id: novo.id, atualizado: false }
    }

    try {
      const resultado = gerarResumoDoDia(dataDia, 'manual', userId)
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
