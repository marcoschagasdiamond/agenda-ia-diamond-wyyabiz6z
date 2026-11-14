/// <reference path="../pb_data/types.d.ts" />

/**
 * Caçador de Sementes — Diamantina (agente nativo 'diamantina-cacador-sementes')
 *
 * - Cron diário às 21:00: revisa o Cofre por Tese (folha_dia com
 *   estado_semente=true e semente_germinada!=true), pede sugestões de
 *   germinação ao agente e grava em sugestoes_sementes — UM registro por
 *   usuário/data_geracao (índice único da migration 1762800022; regenerar
 *   atualiza o registro existente, como o resumo_dia da Organizadora).
 * - Endpoint POST /backend/v1/cacador-sementes/gerar: gera as sugestões sob
 *   demanda (botão "Gerar sugestões agora" do painel na aba Sementes da /folha).
 *
 * Critérios de maturidade (pré-filtro determinístico antes do agente):
 * - semente no cofre há 30+ dias (created antigo) OU data_revisao_semente vencida;
 * - OU parceiro/negócio citado em registros recentes da folha (movimento novo).
 * Quando nada é maduro, grava mensagem_vazia educada em pt-BR (sem erro).
 *
 * IMPORTANTE (JSVM do PocketBase): os callbacks do cronAdd/routerAdd rodam em
 * um pool de VM separado — funções e variáveis de topo do arquivo NÃO estão no
 * escopo dentro deles. Por isso TODA a lógica vive DENTRO de cada callback
 * (helpers duplicados inline de propósito).
 */

// ————— Cron diário: 21:00 —————
cronAdd('cacador_sementes_diario', '0 21 * * *', () => {
  try {
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

    const normalizarSugestoes = (v) => {
      if (!Array.isArray(v)) return []
      return v
        .filter((s) => s && (s.folha_id || s.trecho))
        .slice(0, 20)
        .map((s) => ({
          folha_id: valorTexto(s.folha_id, 60),
          tese: valorTexto(s.tese, 160),
          motivo: valorTexto(s.motivo || s.justificativa, 300),
          titulo_card_sugerido: valorTexto(s.titulo_card_sugerido || s.titulo_sugerido, 160),
          prioridade: valorTexto(s.prioridade, 30) || 'media',
        }))
    }

    // —— 1. Cofre por Tese: sementes ainda não germinadas
    const sementes = $app.findRecordsByFilter(
      'folha_dia',
      'estado_semente = true && semente_germinada != true',
      '-created',
      300,
      0,
    )

    // —— 2. Movimento recente (7 dias): parceiros/negócios citados na operação
    const nomesMovimento = {}
    try {
      const desde = new Date(new Date().getTime() - 7 * 24 * 60 * 60 * 1000).toISOString()
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
        if (p) nomesMovimento[p] = true
        if (n) nomesMovimento[n] = true
      })
    } catch (_) {}

    // —— 3. Pré-filtro de maturidade
    const agora = new Date()
    const limiteAntiguidadeMs = agora.getTime() - 30 * 24 * 60 * 60 * 1000
    const maduras = []
    sementes.forEach((s) => {
      const criadoEm = textoOuVazio(s, 'created') || String(s.created || '')
      const revisao = textoOuVazio(s, 'data_revisao_semente').slice(0, 10)
      // PB devolve created como "2006-01-02 15:04:05.000Z" (espaço) — normaliza p/ ISO
      const antiga = criadoEm
        ? new Date(String(criadoEm).replace(' ', 'T')).getTime() < limiteAntiguidadeMs
        : false
      const revisaoVencida = revisao
        ? new Date(revisao + 'T23:59:59Z').getTime() < agora.getTime()
        : false
      const parceiro = textoOuVazio(s, 'semente_parceiro').toLowerCase().trim()
      const negocio = textoOuVazio(s, 'semente_negocio').toLowerCase().trim()
      const movimento =
        (parceiro && nomesMovimento[parceiro]) || (negocio && nomesMovimento[negocio])
      if (antiga || revisaoVencida || movimento) maduras.push(s)
    })

    // —— 4. Contexto das sementes maduras para o agente
    let prompt
    if (maduras.length === 0) {
      prompt = `Você é a Diamantina, o Caçador de Sementes do Agenda IA Diamond. Hoje (${dataDeHoje()}) nenhuma semente do Cofre por Tese está madura para germinar: ${sementes.length} semente(s) no cofre, todas ainda novas e sem movimento novo do parceiro/negócio. Escreva uma mensagem curta, educada e motivadora em pt-BR comunicando isso, sem inventar conteúdo. Devolva SOMENTE um bloco JSON no formato:
{"tem_sugestoes": false, "mensagem": "...", "sugestoes": []}`
    } else {
      const lista = maduras
        .slice(0, 60)
        .map((s) => {
          const teseId = textoOuVazio(s, 'tese_semente')
          let teseNome = ''
          if (teseId) {
            try {
              teseNome = $app.findRecordById('teses_sementes', teseId).getString('nome')
            } catch (_) {}
          }
          const criadoEm = textoOuVazio(s, 'created').slice(0, 10)
          const revisao = textoOuVazio(s, 'data_revisao_semente').slice(0, 10)
          const parceiro = textoOuVazio(s, 'semente_parceiro')
          const negocio = textoOuVazio(s, 'semente_negocio')
          return `- id=${s.id} | tese="${teseNome}" | guardada desde=${criadoEm || '?'} | revisão prevista=${revisao || '—'} | parceiro="${parceiro}" | negócio="${negocio}" | texto="${textoOuVazio(s, 'registro').slice(0, 180)}"`
        })
        .join('\n')

      prompt = `Você é a Diamantina, o Caçador de Sementes do Agenda IA Diamond. Abaixo estão as sementes do Cofre por Tese que passaram no pré-filtro de maturidade (guardadas há 30+ dias, revisão vencida ou parceiro/negócio com movimento recente) — data da caçada: ${dataDeHoje()}.

${lista}

Avalie quais realmente merecem germinar HOJE e devolva SOMENTE um bloco JSON puro (sem markdown) no formato:
{
  "tem_sugestoes": true,
  "mensagem": "",
  "sugestoes": [
    {
      "folha_id": "id exato da semente referenciada",
      "tese": "nome da tese de mercado (a mesma da lista)",
      "motivo": "por que esta semente amadureceu (pt-BR, 1 a 3 frases, citando critérios observados)",
      "titulo_card_sugerido": "título do card de demanda a criar ao germinar",
      "prioridade": "alta | media | baixa"
    }
  ]
}
Regras: seja conservador(a) — prefira poucas sementes realmente prontas a uma lista inflada; use os ids exatos (folha_id); nunca invente nomes, datas ou movimentos; se nenhuma merecer germinar, devolva "tem_sugestoes": false com uma "mensagem" educada explicando.`
    }

    // —— 5. Uma única caçada com o agente
    const res = $ai.agent(AGENTE_SLUG).chat({ message: prompt, conversation: null })
    const conteudo = res && res.content ? res.content : ''
    const parsed = extrairJson(conteudo) || {}
    const sugestoes = normalizarSugestoes(parsed.sugestoes)
    const temSugestoes = sugestoes.length > 0
    const mensagemVazia = temSugestoes
      ? ''
      : valorTexto(parsed.mensagem, 600) ||
        (sementes.length === 0
          ? 'Seu Cofre por Tese está vazio no momento. Quando arquivar assuntos como Sementes 🌱, eu volto a caçar oportunidades de germinação para você. 💎'
          : 'Por enquanto nenhuma semente do Cofre está madura para germinar — elas ainda estão frescas e sem movimento novo do parceiro/negócio. Volto a caçar amanhã às 21h. 💎🌱')

    // —— 6. Grava UM registro por usuário/data (idempotente)
    const usuarios = $app.findRecordsByFilter('users', '', '-created', 50, 0)
    const col = $app.findCollectionByNameOrId('sugestoes_sementes')
    let gravados = 0

    const payloadBase = {
      data_geracao: dataDeHoje(),
      sugestoes: JSON.stringify(sugestoes),
      mensagem_vazia: mensagemVazia,
      total_sementes: sementes.length,
      total_maduras: maduras.length,
      gerado_por: AGENTE_SLUG,
      status: temSugestoes ? 'nova' : 'sem_sugestoes',
    }

    usuarios.forEach((u) => {
      const uid = u.id
      const existentes = $app.findRecordsByFilter(
        'sugestoes_sementes',
        `usuario = "${uid}" && data_geracao = "${payloadBase.data_geracao}"`,
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
      for (const k in payloadBase) alvo.set(k, payloadBase[k])
      $app.save(alvo)
      gravados++
    })

    console.log(
      `[cacador-sementes] Caçada de ${payloadBase.data_geracao} concluída (gatilho=cron21h, sementes=${sementes.length}, maduras=${maduras.length}, sugestoes=${sugestoes.length}, registros=${gravados}).`,
    )
  } catch (err) {
    console.error('[cacador-sementes] Falha no cron das 21h:', err.message)
  }
})

// ————— Endpoint sob demanda (botão "Gerar sugestões agora") —————
routerAdd(
  'POST',
  '/backend/v1/cacador-sementes/gerar',
  (e) => {
    // helpers inline (duplicados do cron de propósito: JSVM não compartilha escopo de topo)
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

    const normalizarSugestoes = (v) => {
      if (!Array.isArray(v)) return []
      return v
        .filter((s) => s && (s.folha_id || s.trecho))
        .slice(0, 20)
        .map((s) => ({
          folha_id: valorTexto(s.folha_id, 60),
          tese: valorTexto(s.tese, 160),
          motivo: valorTexto(s.motivo || s.justificativa, 300),
          titulo_card_sugerido: valorTexto(s.titulo_card_sugerido || s.titulo_sugerido, 160),
          prioridade: valorTexto(s.prioridade, 30) || 'media',
        }))
    }

    const userId = e.auth && e.auth.id ? e.auth.id : ''
    if (!userId) return e.unauthorizedError('auth required')

    try {
      const sementes = $app.findRecordsByFilter(
        'folha_dia',
        'estado_semente = true && semente_germinada != true',
        '-created',
        300,
        0,
      )

      const nomesMovimento = {}
      try {
        const desde = new Date(new Date().getTime() - 7 * 24 * 60 * 60 * 1000).toISOString()
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
          if (p) nomesMovimento[p] = true
          if (n) nomesMovimento[n] = true
        })
      } catch (_) {}

      const agora = new Date()
      const limiteAntiguidadeMs = agora.getTime() - 30 * 24 * 60 * 60 * 1000
      const maduras = []
      sementes.forEach((s) => {
        const criadoEm = textoOuVazio(s, 'created') || String(s.created || '')
        const revisao = textoOuVazio(s, 'data_revisao_semente').slice(0, 10)
        // PB devolve created como "2006-01-02 15:04:05.000Z" (espaço) — normaliza p/ ISO
        const antiga = criadoEm
          ? new Date(String(criadoEm).replace(' ', 'T')).getTime() < limiteAntiguidadeMs
          : false
        const revisaoVencida = revisao
          ? new Date(revisao + 'T23:59:59Z').getTime() < agora.getTime()
          : false
        const parceiro = textoOuVazio(s, 'semente_parceiro').toLowerCase().trim()
        const negocio = textoOuVazio(s, 'semente_negocio').toLowerCase().trim()
        const movimento =
          (parceiro && nomesMovimento[parceiro]) || (negocio && nomesMovimento[negocio])
        if (antiga || revisaoVencida || movimento) maduras.push(s)
      })

      let prompt
      if (maduras.length === 0) {
        prompt = `Você é a Diamantina, o Caçador de Sementes do Agenda IA Diamond. Hoje (${dataDeHoje()}) nenhuma semente do Cofre por Tese está madura para germinar: ${sementes.length} semente(s) no cofre, todas ainda novas e sem movimento novo do parceiro/negócio. Escreva uma mensagem curta, educada e motivadora em pt-BR comunicando isso, sem inventar conteúdo. Devolva SOMENTE um bloco JSON no formato:
{"tem_sugestoes": false, "mensagem": "...", "sugestoes": []}`
      } else {
        const lista = maduras
          .slice(0, 60)
          .map((s) => {
            const teseId = textoOuVazio(s, 'tese_semente')
            let teseNome = ''
            if (teseId) {
              try {
                teseNome = $app.findRecordById('teses_sementes', teseId).getString('nome')
              } catch (_) {}
            }
            const criadoEm = textoOuVazio(s, 'created').slice(0, 10)
            const revisao = textoOuVazio(s, 'data_revisao_semente').slice(0, 10)
            const parceiro = textoOuVazio(s, 'semente_parceiro')
            const negocio = textoOuVazio(s, 'semente_negocio')
            return `- id=${s.id} | tese="${teseNome}" | guardada desde=${criadoEm || '?'} | revisão prevista=${revisao || '—'} | parceiro="${parceiro}" | negócio="${negocio}" | texto="${textoOuVazio(s, 'registro').slice(0, 180)}"`
          })
          .join('\n')

        prompt = `Você é a Diamantina, o Caçador de Sementes do Agenda IA Diamond. Abaixo estão as sementes do Cofre por Tese que passaram no pré-filtro de maturidade (guardadas há 30+ dias, revisão vencida ou parceiro/negócio com movimento recente) — data da caçada: ${dataDeHoje()}.

${lista}

Avalie quais realmente merecem germinar HOJE e devolva SOMENTE um bloco JSON puro (sem markdown) no formato:
{
  "tem_sugestoes": true,
  "mensagem": "",
  "sugestoes": [
    {
      "folha_id": "id exato da semente referenciada",
      "tese": "nome da tese de mercado (a mesma da lista)",
      "motivo": "por que esta semente amadureceu (pt-BR, 1 a 3 frases, citando critérios observados)",
      "titulo_card_sugerido": "título do card de demanda a criar ao germinar",
      "prioridade": "alta | media | baixa"
    }
  ]
}
Regras: seja conservador(a) — prefira poucas sementes realmente prontas a uma lista inflada; use os ids exatos (folha_id); nunca invente nomes, datas ou movimentos; se nenhuma merecer germinar, devolva "tem_sugestoes": false com uma "mensagem" educada explicando.`
      }

      const res = $ai.agent(AGENTE_SLUG).chat({ message: prompt, conversation: null })
      const conteudo = res && res.content ? res.content : ''
      const parsed = extrairJson(conteudo) || {}
      const sugestoes = normalizarSugestoes(parsed.sugestoes)
      const temSugestoes = sugestoes.length > 0
      const mensagemVazia = temSugestoes
        ? ''
        : valorTexto(parsed.mensagem, 600) ||
          (sementes.length === 0
            ? 'Seu Cofre por Tese está vazio no momento. Quando arquivar assuntos como Sementes 🌱, eu volto a caçar oportunidades de germinação para você. 💎'
            : 'Por enquanto nenhuma semente do Cofre está madura para germinar — elas ainda estão frescas e sem movimento novo do parceiro/negócio. Volto a caçar amanhã às 21h. 💎🌱')

      const dataDia = dataDeHoje()
      const col = $app.findCollectionByNameOrId('sugestoes_sementes')
      const existentes = $app.findRecordsByFilter(
        'sugestoes_sementes',
        `usuario = "${userId}" && data_geracao = "${dataDia}"`,
        '-created',
        1,
        0,
      )

      let alvo
      let atualizado = false
      if (existentes.length > 0) {
        alvo = existentes[0]
        atualizado = true
      } else {
        alvo = new Record(col)
        alvo.set('usuario', userId)
      }
      alvo.set('data_geracao', dataDia)
      alvo.set('sugestoes', JSON.stringify(sugestoes))
      alvo.set('mensagem_vazia', mensagemVazia)
      alvo.set('total_sementes', sementes.length)
      alvo.set('total_maduras', maduras.length)
      alvo.set('gerado_por', AGENTE_SLUG)
      alvo.set('status', temSugestoes ? 'nova' : 'sem_sugestoes')
      $app.save(alvo)

      console.log(
        `[cacador-sementes] Caçada de ${dataDia} concluída (gatilho=manual, usuario=${userId}, sementes=${sementes.length}, maduras=${maduras.length}, sugestoes=${sugestoes.length}).`,
      )

      return e.json(200, {
        sucesso: true,
        sugestao_id: alvo.id,
        atualizado,
        total_sementes: sementes.length,
        total_maduras: maduras.length,
        total_sugestoes: sugestoes.length,
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
