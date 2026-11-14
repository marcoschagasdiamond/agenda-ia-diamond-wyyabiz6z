/// <reference path="../pb_data/types.d.ts" />

/**
 * Caçador de Sementes — Diamantina (agente nativo 'diamantina-cacador-sementes')
 *
 * Pacote das 4 melhorias:
 * - Score determinístico por semente: dias no cofre, revisão vencida, parceiro/
 *   negócio citado em registros recentes, tese aquecida e feedback do usuário
 *   (pesos por tipo de motivo em preferencias_cacador). Cada sugestão sai com
 *   {motivo, contra_argumento, score, tipo_motivo}.
 * - Feedback: POST .../germinar e POST .../ignorar registram germinou/ignorou
 *   por tipo de motivo; a próxima caçada pondera os scores com esses pesos.
 * - Rastro por sugestão em status_registros (madura/germinada/ignorada) e
 *   resumo com taxa de acerto em resumo.
 * - Selo "insistente": cacador_aparicoes em folha_dia incrementado a cada
 *   caçada em que a semente reaparece.
 * - Resumo do Dia (22h): .../oportunidades lê a caçada do dia e devolve a
 *   seção "Oportunidades do Caçador" para o hook resumo_diario anexar ao
 *   resumo (mesma fonte de sinal: caçada + citações em registros recentes).
 *
 * IMPORTANTE (JSVM do PocketBase): os callbacks de cronAdd/routerAdd NÃO veem
 * declarações de topo — TODA a lógica (helpers, scores, chamadas ao agente)
 * vive DENTRO de cada callback, duplicada inline de propósito.
 */

// IMPORTANTE: a coleção sugestoes_sementes tem `semente` (relation → folha_dia)
// REQUIRED. Todo registro gravado aqui PRECISA apontar para uma semente válida
// da folha_dia — um "placeholder vazio" sem semente morre com
// "semente: cannot be blank" e derruba o cron das 21h.
// A JSVM do PocketBase não tem require/module.exports — cada callback é
// autocontido (helpers duplicados inline de propósito).

cronAdd('cacador_sementes_diario', '0 21 * * *', () => {
  const AGENTE_SLUG = 'diamantina-cacador-sementes'
  const dataDeHoje = () => {
    const agora = new Date()
    const offsetMs = agora.getTimezoneOffset() * 60000
    return new Date(agora.getTime() - offsetMs).toISOString().slice(0, 10)
  }
  const ehUsuarioAtivo = (u) => {
    try {
      const bruto = u.getString('funcao')
      return bruto === 'undefined' || !bruto || bruto !== 'convidado'
    } catch (_) {
      return true
    }
  }

  try {
    const dataDia = dataDeHoje()
    const usuarios = $app.findRecordsByFilter('users', '', '-created', 100, 0)
    const ativos = usuarios.filter(ehUsuarioAtivo)
    ativos.forEach((u) => {
      try {
        const existentes = $app.findRecordsByFilter(
          'sugestoes_sementes',
          `usuario = "${u.id}" && data_geracao = "${dataDia}"`,
          '-created',
          1,
          0,
        )
        if (existentes.length > 0) {
          console.log(
            `[cacador-sementes] Caçada de ${dataDia} de ${u.id} já existente — cron nada a fazer.`,
          )
          return
        }
        // —— Cofre por Tese (mesmos critérios do endpoint gerar) ——
        const agora = new Date()
        const desde7 = new Date(agora.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString()
        const cofre = $app.findRecordsByFilter(
          'folha_dia',
          'estado_semente = true && semente_germinada != true',
          '-created',
          300,
          0,
        )
        // movimento recente por parceiro/negócio
        const nomesMovimento = {}
        try {
          const recentes = $app.findRecordsByFilter(
            'folha_dia',
            `estado_semente != true && created > "${desde7}"`,
            '-created',
            200,
            0,
          )
          recentes.forEach((r) => {
            const p = String(r.getString('semente_parceiro') || '')
              .toLowerCase()
              .trim()
            const n = String(r.getString('semente_negocio') || '')
              .toLowerCase()
              .trim()
            if (p) nomesMovimento[p] = true
            if (n) nomesMovimento[n] = true
          })
        } catch (_) {}
        // teses aquecidas (germinação nos últimos 30 dias)
        const tesesAquecidas = {}
        try {
          const desde30 = new Date(agora.getTime() - 30 * 24 * 60 * 60 * 1000)
            .toISOString()
            .slice(0, 10)
          const germinadas = $app.findRecordsByFilter(
            'folha_dia',
            `estado_semente = true && semente_germinada = true && updated >= "${desde30}" && tese_semente != ""`,
            '-updated',
            200,
            0,
          )
          germinadas.forEach((g) => {
            const teseId = String(g.getString('tese_semente') || '')
            if (teseId) tesesAquecidas[teseId] = true
          })
        } catch (_) {}
        const maduras = []
        cofre.forEach((s) => {
          let criadoEm = ''
          try {
            criadoEm = String(s.created || '')
          } catch (_) {}
          const revisao = String(s.getString('data_revisao_semente') || '').slice(0, 10)
          const antiga = criadoEm ? new Date(criadoEm.replace(' ', 'T')).getTime() : 0
          const diasNoCofre = antiga
            ? Math.floor((agora.getTime() - antiga) / (24 * 60 * 60 * 1000))
            : 0
          const diasVencida = revisao
            ? Math.floor(
                (agora.getTime() - new Date(revisao + 'T23:59:59Z').getTime()) /
                  (24 * 60 * 60 * 1000),
              )
            : 0
          const parceiro = String(s.getString('semente_parceiro') || '')
            .toLowerCase()
            .trim()
          const negocio = String(s.getString('semente_negocio') || '')
            .toLowerCase()
            .trim()
          const movimento = Boolean(
            (parceiro && nomesMovimento[parceiro]) || (negocio && nomesMovimento[negocio]),
          )
          const teseId = String(s.getString('tese_semente') || '')
          const teseAquecida = Boolean(teseId && tesesAquecidas[teseId])
          const madura = diasNoCofre >= 30 || diasVencida > 0 || movimento || teseAquecida
          if (madura) maduras.push(s)
        })
        if (maduras.length === 0) {
          console.log(
            `[cacador-sementes] ${dataDia}: ${cofre.length} semente(s) no cofre, nenhuma madura — nada a gravar.`,
          )
          return
        }
        // —— Uma única caçada com o agente (cron roda no server; usa o id do dono
        // como user_id — só o primeiro usuário ativo da conta é elegível) ——
        const userId = ativos[0].id
        const lista = maduras
          .slice(0, 60)
          .map((s) => {
            let teseNome = ''
            try {
              const teseId = String(s.getString('tese_semente') || '')
              if (teseId) teseNome = $app.findRecordById('teses_sementes', teseId).getString('nome')
            } catch (_) {}
            return `- id=${s.id} | tese="${teseNome}" | guardada há ${Math.floor(
              (agora.getTime() - new Date(String(s.created || '').replace(' ', 'T')).getTime()) /
                (24 * 60 * 60 * 1000),
            )} dia(s) | parceiro="${s.getString('semente_parceiro')}" | negócio="${s.getString(
              'semente_negocio',
            )}" | texto="${String(s.getString('registro') || '').slice(0, 180)}"`
          })
          .join('\n')
        const prompt = `Você é a Diamantina, o Caçador de Sementes do Agenda IA Diamond. Data da caçada: ${dataDia}. Abaixo as sementes maduras do Cofre por Tese (pré-filtro determinístico). Avalie quais realmente merecem germinar HOJE e devolva SOMENTE um bloco JSON puro (sem markdown) no formato:
{
  "tem_sugestoes": true,
  "mensagem": "",
  "sugestoes": [
    {
      "folha_id": "id exato da semente referenciada",
      "tese": "nome da tese de mercado (a mesma da lista)",
      "motivo": "por que esta semente amadureceu HOJE (pt-BR, 1 a 3 frases)",
      "contra_argumento": "por que esperar mais um pouco (pt-BR, 1 a 2 frases)",
      "titulo_card_sugerido": "título do card de demanda a criar ao germinar",
      "prioridade": "alta | media | baixa",
      "urgente": true ou false
    }
  ]
}
Regras: seja conservador(a) — prefira poucas sementes realmente prontas a uma lista inflada; use os ids exatos (folha_id); nunca invente nomes, datas ou movimentos; se nenhuma merecer germinar, devolva "tem_sugestoes": false com uma "mensagem" educada explicando.

${lista}`
        const res = $ai.agent(AGENTE_SLUG).chat({ message: prompt, user_id: userId })
        const conteudo = res && res.content ? res.content : ''
        const m = String(conteudo).match(/\{[\s\S]*\}/)
        let parsed = null
        if (m) {
          try {
            parsed = JSON.parse(m[0])
          } catch (_) {}
        }
        const sugestoes = (parsed && Array.isArray(parsed.sugestoes) ? parsed.sugestoes : [])
          .filter((s) => s && s.folha_id)
          .slice(0, 20)
          .map((s) => {
            const fid = String(s.folha_id || '')
              .trim()
              .slice(0, 60)
            const rec = maduras.find((x) => x.id === fid)
            return {
              folha_id: fid,
              tese: String(s.tese || '')
                .trim()
                .slice(0, 160),
              motivo: String(s.motivo || '')
                .trim()
                .slice(0, 300),
              contra_argumento: String(s.contra_argumento || '')
                .trim()
                .slice(0, 300),
              titulo_card_sugerido: String(s.titulo_card_sugerido || '')
                .trim()
                .slice(0, 160),
              prioridade:
                String(s.prioridade || '')
                  .trim()
                  .slice(0, 30) || 'media',
              urgente: Boolean(s.urgente),
              score: 0,
              tipo_motivo: 'agente',
              aparicoes: 0,
            }
          })
          .filter((s) => s.folha_id)
        if (sugestoes.length === 0) {
          console.log(
            `[cacador-sementes] ${dataDia}: agente não sugeriu nenhuma semente válida — nada a gravar.`,
          )
          return
        }
        // —— Grava o registro do dia SOMENTE com sugestões cuja semente existe ——
        const col = $app.findCollectionByNameOrId('sugestoes_sementes')
        const validas = []
        sugestoes.forEach((s) => {
          try {
            $app.findRecordById('folha_dia', s.folha_id)
            validas.push(s)
          } catch (_) {
            console.error(`[cacador-sementes] Semente ${s.folha_id} não existe — descartada.`)
          }
        })
        if (validas.length === 0) {
          console.error(
            `[cacador-sementes] ${dataDia}: nenhuma sugestão com semente válida — nada gravado.`,
          )
          return
        }
        const nov = new Record(col)
        nov.set('usuario', userId)
        nov.set('semente', validas[0].folha_id)
        nov.set('data_geracao', dataDia)
        nov.set('sugestoes', JSON.stringify(validas))
        nov.set('mensagem_vazia', '')
        nov.set('total_sementes', cofre.length)
        nov.set('total_maduras', maduras.length)
        nov.set('gerado_por', AGENTE_SLUG)
        nov.set('status', 'nova')
        nov.set('status_registros', JSON.stringify({}))
        nov.set('preferencias_cacador', JSON.stringify({ germinou: {}, ignorou: {} }))
        nov.set(
          'resumo',
          JSON.stringify({
            texto: `Foram sugeridas ${validas.length} semente(s) para germinar hoje.`,
            total_urgentes: validas.filter((s) => s.urgente).length,
          }),
        )
        nov.set('total_geradas', validas.length)
        nov.set('total_germinadas', 0)
        nov.set('total_ignoradas', 0)
        $app.save(nov)
        console.log(
          `[cacador-sementes] Cron 21h concluído (usuario=${userId}, sementes=${cofre.length}, maduras=${maduras.length}, sugestoes=${validas.length}).`,
        )
      } catch (err) {
        console.error(`[cacador-sementes] Falha na caçada do usuário ${u.id}: ${err.message}`)
      }
    })
  } catch (err) {
    console.error('[cacador-sementes] Falha no cron das 21h:', err.message)
  }
})

routerAdd(
  'POST',
  '/backend/v1/cacador-sementes/gerar',
  (e) => {
    const AGENTE_SLUG = 'diamantina-cacador-sementes'
    const userId = e.auth && e.auth.id ? e.auth.id : ''
    if (!userId) return e.unauthorizedError('auth required')

    // —— helpers inline ——
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
    const dataDeHoje = () => {
      const agora = new Date()
      const offsetMs = agora.getTimezoneOffset() * 60000
      return new Date(agora.getTime() - offsetMs).toISOString().slice(0, 10)
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
      const body = e.requestInfo().body || {}
      const dataDia = (body.data && String(body.data).slice(0, 10)) || dataDeHoje()
      const agora = new Date()

      // —— 1. Cofre por Tese: sementes ainda não germinadas ——
      const sementes = $app.findRecordsByFilter(
        'folha_dia',
        'estado_semente = true && semente_germinada != true',
        '-created',
        300,
        0,
      )

      // —— 2. Movimento recente (7 dias): registros da Folha que citam parceiro/negócio ——
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

      // —— 3. Tese aquecida: semente da MESMA tese germinou nos últimos 30 dias ——
      const tesesAquecidas = {}
      try {
        const desde30 = new Date(agora.getTime() - 30 * 24 * 60 * 60 * 1000)
          .toISOString()
          .slice(0, 10)
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

      // —— 4. Preferências de aprendizado (pesos por tipo de motivo) ——
      let prefs = { germinou: {}, ignorou: {} }
      try {
        const ultimas = $app.findRecordsByFilter(
          'sugestoes_sementes',
          `usuario = "${userId}"`,
          '-created',
          1,
          0,
        )
        if (ultimas.length > 0) {
          const bruto = ultimas[0].getString('preferencias_cacador')
          if (bruto && bruto !== 'undefined' && bruto !== 'null') {
            const parsed = JSON.parse(bruto)
            if (parsed && typeof parsed === 'object') {
              prefs = { germinou: parsed.germinou || {}, ignorou: parsed.ignorou || {} }
            }
          }
        }
      } catch (_) {}

      // —— 5. Pré-filtro de maturidade + SCORE determinístico ——
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
        const diasNoCofre = antiga
          ? Math.floor((agora.getTime() - antiga) / (24 * 60 * 60 * 1000))
          : 0
        const diasVencida = revisao
          ? Math.floor(
              (agora.getTime() - new Date(revisao + 'T23:59:59Z').getTime()) /
                (24 * 60 * 60 * 1000),
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
        let score = 10
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
          `usuario = "${userId}" && data_geracao != "${dataDia}"`,
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
      const res = $ai.agent(AGENTE_SLUG).chat({ message: prompt, user_id: userId })
      const conteudo = res && res.content ? res.content : ''
      const parsed = extrairJson(conteudo) || {}

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
          // Selo "insistente": total de aparições = aparições já persistidas na
          // folha_dia (incrementadas abaixo) + aparições em caçadas anteriores.
          const aparicoesTotal = c
            ? c.aparicoes + (aparicoesAnteriores[c.rec.id] || 0)
            : aparicoesAnteriores[fid] || 0
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
            aparicoes: aparicoesTotal,
          }
        })
        .sort((a, b) => (b.score || 0) - (a.score || 0))

      // NUNCA gravar registro sem semente válida: descarta sugestões cuja
      // folha_id não existe na folha_dia (a coleção exige `semente`).
      const validadas = []
      sugestoes.forEach((s) => {
        try {
          $app.findRecordById('folha_dia', s.folha_id)
          validadas.push(s)
        } catch (_) {
          console.error(`[cacador-sementes] Semente ${s.folha_id} não existe — descartada.`)
        }
      })
      const sugestoesFinais = validadas

      const temSugestoes = sugestoesFinais.length > 0
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
        ? `Foram sugeridas ${sugestoes.length} semente(s) para germinar hoje, ordenadas por prioridade (score determinístico).${
            totalUrgentes > 0
              ? ` Destaque: ${totalUrgentes} urgente(s)${nomesTeseUrgentes.length ? ` — ${nomesTeseUrgentes.join(', ')}` : ''}.`
              : ''
          }`
        : mensagemVazia

      // —— 10. Rastro (status por sugestão): germinada / ignorada / ainda madura ——
      const statusMap = {}
      sugestoesFinais.forEach((s) => {
        statusMap[s.folha_id] = { status: 'madura', tipo_motivo: s.tipo_motivo }
      })

      // —— 11. Grava UM registro por usuário/data (idempotente) ——
      const col = $app.findCollectionByNameOrId('sugestoes_sementes')
      const existentes = $app.findRecordsByFilter(
        'sugestoes_sementes',
        `usuario = "${userId}" && data_geracao = "${dataDia}"`,
        '-created',
        1,
        0,
      )
      let alvo
      if (existentes.length > 0) {
        alvo = existentes[0]
        // Um registro legado sem semente (placeholder do cron antigo) não pode
        // ser atualizado — a coleção exige `semente`. Substitui por um novo.
        let semSemente = false
        try {
          const sid = alvo.getString('semente')
          if (!sid || sid === 'undefined' || sid === '') semSemente = true
        } catch (_) {
          semSemente = true
        }
        if (semSemente) {
          try {
            $app.delete(alvo)
          } catch (_) {}
          alvo = new Record(col)
          alvo.set('usuario', userId)
        }
      } else {
        alvo = new Record(col)
        alvo.set('usuario', userId)
      }

      // preferências: preserva as já gravadas (endpoints ignorar/germinar podem ter atualizado)
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
        if (bruto && bruto !== 'undefined' && bruto !== 'null') {
          const parsedStatus = JSON.parse(bruto)
          if (parsedStatus && typeof parsedStatus === 'object') statusAtuais = parsedStatus
        }
      } catch (_) {}
      const statusFinal = {}
      for (const k in statusMap) {
        statusFinal[k] = statusMap[k]
      }
      for (const k in statusAtuais) {
        if (
          statusAtuais[k] &&
          (statusAtuais[k].status === 'ignorada' || statusAtuais[k].status === 'germinada')
        ) {
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
      alvo.set('sugestoes', JSON.stringify(sugestoesFinais))
      alvo.set('mensagem_vazia', mensagemVazia)
      // A coleção exige `semente` (relation required). Só persiste com uma
      // semente real: primeira sugestão válida; sem sugestão, NADA é gravado.
      if (sugestoesFinais.length > 0) {
        alvo.set('semente', sugestoesFinais[0].folha_id)
      }
      alvo.set('total_sementes', sementes.length)
      alvo.set('total_maduras', totalMaduras)
      alvo.set('gerado_por', AGENTE_SLUG)
      alvo.set('status', temSugestoes ? 'nova' : 'sem_sugestoes')
      alvo.set('status_registros', JSON.stringify(statusFinal))
      alvo.set('preferencias_cacador', JSON.stringify(prefsAtuais))
      alvo.set('resumo', JSON.stringify({ texto: resumoTexto, total_urgentes: totalUrgentes }))
      alvo.set('total_geradas', sugestoesFinais.length)
      alvo.set('total_germinadas', totalGerminadas)
      alvo.set('total_ignoradas', totalIgnoradas)
      if (sugestoesFinais.length === 0) {
        console.log(
          `[cacador-sementes] Caçada de ${dataDia}: nenhuma sugestão com semente válida — registro não gravado (gatilho=manual).`,
        )
        return e.json(200, {
          sucesso: true,
          atualizado: false,
          gravado: false,
          mensagem: mensagemVazia,
          total_sementes: sementes.length,
          total_maduras: totalMaduras,
          total_sugestoes: 0,
        })
      }
      $app.save(alvo)

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
        `[cacador-sementes] Caçada de ${dataDia} concluída (gatilho=manual, usuario=${userId}, sementes=${sementes.length}, maduras=${totalMaduras}, sugestoes=${sugestoes.length}, urgentes=${totalUrgentes}).`,
      )

      return e.json(200, {
        sucesso: true,
        atualizado: true,
        gravado: true,
        total_sementes: sementes.length,
        total_maduras: totalMaduras,
        total_sugestoes: sugestoesFinais.length,
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

routerAdd(
  'POST',
  '/backend/v1/cacador-sementes/germinar',
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

      let statusMap = {}
      try {
        const bruto = rec.getString('status_registros')
        if (bruto && bruto !== 'undefined' && bruto !== 'null') statusMap = JSON.parse(bruto)
      } catch (_) {}
      const anterior = statusMap[folhaId] || {}
      const tipoMotivo = anterior.tipo_motivo || 'outros'
      const jaGerminada = anterior.status === 'germinada'
      statusMap[folhaId] = {
        status: 'germinada',
        tipo_motivo: tipoMotivo,
        germinada_em: new Date().toISOString(),
      }

      let prefs = { germinou: {}, ignorou: {} }
      try {
        const bruto = rec.getString('preferencias_cacador')
        if (bruto && bruto !== 'undefined' && bruto !== 'null') prefs = JSON.parse(bruto)
      } catch (_) {}
      if (!prefs.germinou) prefs.germinou = {}
      if (!prefs.ignorou) prefs.ignorou = {}
      if (!jaGerminada) {
        prefs.germinou[tipoMotivo] = (prefs.germinou[tipoMotivo] || 0) + 1
        // germinar compensa um "ignorou" anterior do mesmo tipo (aprendizado)
        if ((prefs.ignorou[tipoMotivo] || 0) > 0) prefs.ignorou[tipoMotivo] -= 1
      }

      const totalGerminadas = Object.values(statusMap).filter(
        (s) => s && s.status === 'germinada',
      ).length
      const totalIgnoradas = Object.values(statusMap).filter(
        (s) => s && s.status === 'ignorada',
      ).length

      rec.set('status_registros', JSON.stringify(statusMap))
      rec.set('preferencias_cacador', JSON.stringify(prefs))
      rec.set('total_germinadas', totalGerminadas)
      rec.set('total_ignoradas', totalIgnoradas)
      $app.save(rec)

      // —— preferências valem para todas as caçadas futuras (propaga) ——
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
        `[cacador-sementes] Sugestão ${folhaId} da caçada ${dataDia} marcada como GERMINADA (tipo=${tipoMotivo}, usuario=${userId}).`,
      )
      return e.json(200, { sucesso: true, total_germinadas: totalGerminadas })
    } catch (err) {
      return e.json(500, {
        sucesso: false,
        error: err.message || 'Falha ao registrar germinação',
      })
    }
  },
  $apis.requireAuth(),
)

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

      let prefs = { germinou: {}, ignorou: {} }
      try {
        const bruto = rec.getString('preferencias_cacador')
        if (bruto && bruto !== 'undefined' && bruto !== 'null') prefs = JSON.parse(bruto)
      } catch (_) {}
      if (!prefs.germinou) prefs.germinou = {}
      if (!prefs.ignorou) prefs.ignorou = {}
      if (!jaIgnorada) {
        prefs.ignorou[tipoMotivo] = (prefs.ignorou[tipoMotivo] || 0) + 1
        // ignorar compensa um "germinou" anterior do mesmo tipo (aprendizado)
        if ((prefs.germinou[tipoMotivo] || 0) > 0) prefs.germinou[tipoMotivo] -= 1
      }

      const totalIgnoradas = Object.values(statusMap).filter(
        (s) => s && s.status === 'ignorada',
      ).length

      rec.set('status_registros', JSON.stringify(statusMap))
      rec.set('preferencias_cacador', JSON.stringify(prefs))
      rec.set('total_ignoradas', totalIgnoradas)
      $app.save(rec)

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

// ————— Oportunidades do Caçador para o Resumo do Dia (Diamantina, 22h) —————
routerAdd(
  'GET',
  '/backend/v1/cacador-sementes/oportunidades',
  (e) => {
    // helpers inline (JSVM: callbacks não veem declarações de topo)
    const valorTexto = (v, maxLen) => {
      if (v === null || v === undefined) return ''
      let texto = Array.isArray(v) ? v.join('\n') : String(v)
      texto = texto.trim()
      if (maxLen && texto.length > maxLen) texto = texto.slice(0, maxLen)
      return texto
    }
    const parseJsonCampo = (rec, campo, padrao) => {
      try {
        const bruto = rec.getString(campo)
        if (!bruto || bruto === 'undefined' || bruto === 'null') return padrao
        const parsed = JSON.parse(bruto)
        return parsed === null || parsed === undefined ? padrao : parsed
      } catch (_) {
        return padrao
      }
    }
    const userId = e.auth && e.auth.id ? e.auth.id : ''
    if (!userId) return e.unauthorizedError('auth required')
    try {
      const q = e.requestInfo().query || {}
      const dataDia = (q.data && String(q.data).slice(0, 10)) || ''
      let filtro = `usuario = "${userId}"`
      if (dataDia) filtro += ` && data_geracao = "${dataDia}"`
      const registros = $app.findRecordsByFilter(
        'sugestoes_sementes',
        filtro,
        '-data_geracao',
        1,
        0,
      )
      if (registros.length === 0) {
        return e.json(200, { sucesso: true, disponivel: false, total: 0, itens: [], texto: '' })
      }
      const rec = registros[0]
      const sugestoes = parseJsonCampo(rec, 'sugestoes', [])
      const statusMap = parseJsonCampo(rec, 'status_registros', {})
      const resumo = parseJsonCampo(rec, 'resumo', {})
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
          status: (statusMap[s.folha_id] && statusMap[s.folha_id].status) || 'madura',
        }))
        .slice(0, 10)
      const total = itens.length
      const urgentes = itens.filter((s) => s.urgente).length
      let texto = ''
      if (total > 0) {
        const nomes = itens.slice(0, 3).map((s) => s.titulo || s.tese || 'semente no cofre')
        texto = `O Caçador de Sementes apontou ${total} oportunidade(s) para germinar hoje${
          urgentes > 0 ? `, sendo ${urgentes} urgente(s)` : ''
        }: ${nomes.join('; ')}.`
      } else {
        texto = valorTexto(resumo && resumo.texto, 400)
      }
      return e.json(200, {
        sucesso: true,
        disponivel: total > 0,
        data_geracao: rec.getString('data_geracao'),
        total,
        urgentes,
        itens,
        texto,
      })
    } catch (err) {
      return e.json(500, {
        sucesso: false,
        error: err.message || 'Falha ao ler oportunidades do Caçador',
      })
    }
  },
  $apis.requireAuth(),
)
