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
 * - Integração com a Memória Compartilhada entre agentes: fatos ativos de
 *   memoria_compartilhada entram no prompt (linha "MEMÓRIA COMPARTILHADA
 *   ENTRE AGENTES") e, ao final, a resposta do agente é analisada para
 *   gravar APRENDIZADOS de volta na mesma coleção (dedupe por
 *   usuario+agente_origem+tipo+chave), completando o ciclo de aprendizado.
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

  // —— Memória Compartilhada entre agentes: fatos ativos entram no prompt ——

  // dedupe por (usuario, agente_origem, tipo, chave) — mesmo critério do índice único
  const chaveUnica = (usuarioId, agente, tipo, chave) =>
    [usuarioId, agente, tipo, chave].map((p) => String(p || '')).join('||')

  const gravarFatoCompartilhado = (
    usuarioId,
    tipo,
    chave,
    conteudo,
    entidade,
    dataOrigem,
    fonte,
  ) => {
    if (!usuarioId || !conteudo || !chave) return null
    try {
      const chaveNormalizada = String(chave).toLowerCase().trim().slice(0, 200)
      const existentes = $app.findRecordsByFilter(
        'memoria_compartilhada',
        `usuario = "${usuarioId}" && agente_origem = "diamantina-organizadora-diaria" && tipo = "${String(tipo)}" && chave = "${String(chaveNormalizada).replace(/"/g, '\\"')}"`,
        '-created',
        1,
        0,
      )
      if (existentes.length > 0) {
        const existente = existentes[0]
        try {
          existente.set('conteudo', String(conteudo).slice(0, 4000))
          existente.set('entidade', String(entidade || '').slice(0, 200))
          existente.set('data_origem', String(dataOrigem || '').slice(0, 30))
          existente.set('fonte', String(fonte || '').slice(0, 120))
          existente.set('ativo', true)
          $app.save(existente)
          return existente
        } catch (_) {
          return null
        }
      }
      const colMc = $app.findCollectionByNameOrId('memoria_compartilhada')
      const novo = new Record(colMc)
      novo.set('usuario', usuarioId)
      novo.set('agente_origem', 'diamantina-organizadora-diaria')
      novo.set('tipo', String(tipo || 'aprendizado').slice(0, 60))
      novo.set('chave', chaveNormalizada)
      novo.set('conteudo', String(conteudo).slice(0, 4000))
      novo.set('entidade', String(entidade || '').slice(0, 200))
      novo.set('data_origem', String(dataOrigem || '').slice(0, 30))
      novo.set('fonte', String(fonte || '').slice(0, 120))
      novo.set('ativo', true)
      $app.save(novo)
      return novo
    } catch (err) {
      console.error(`[resumo-diario] Falha ao gravar fato compartilhado: ${err.message}`)
      return null
    }
  }

  const carregarFatosCompartilhados = (usuarioId) => {
    const linhas = []
    if (!usuarioId) return linhas
    try {
      const fatos = $app.findRecordsByFilter(
        'memoria_compartilhada',
        `usuario = "${usuarioId}" && ativo = true`,
        '-updated',
        30,
        0,
      )
      fatos.forEach((f) => {
        const conteudo = textoOuVazio(f, 'conteudo')
        const tipo = textoOuVazio(f, 'tipo') || 'fato'
        const agente = textoOuVazio(f, 'agente_origem') || 'agente'
        const entidade = textoOuVazio(f, 'entidade')
        if (conteudo) {
          linhas.push(
            `- [${tipo}] ${conteudo}${entidade ? ` (sobre: ${entidade})` : ''} — registrado por: ${agente}`,
          )
        }
      })
    } catch (_) {}
    return linhas
  }

  const extrairAprendizados = (conteudo, parsed) => {
    // aprendizados = decisões firmadas + 1ª prioridade + sugestões com nome próprio
    const fatos = []
    const decisoes = valorTexto(parsed.decisoes, 3000)
    if (decisoes && decisoes !== '—') fatos.push(decisoes.slice(0, 1200))
    const prioridades = valorTexto(parsed.prioridades, 3000)
    if (prioridades) fatos.push(`Prioridade do dia seguinte: ${prioridades.slice(0, 500)}`)
    const aFazer = valorTexto(parsed.a_fazer, 6000)
    if (aFazer) fatos.push(`Pendências em aberto: ${aFazer.slice(0, 800)}`)
    try {
      const sugestoes = Array.isArray(parsed.sugestoes) ? parsed.sugestoes : []
      sugestoes.slice(0, 3).forEach((sg) => {
        const titulo = valorTexto(sg && sg.titulo_sugerido, 160)
        const destino = valorTexto(sg && sg.destino_sugerido, 160)
        const just = valorTexto(sg && sg.justificativa, 300)
        if (titulo)
          fatos.push(
            `Sugestão de card: "${titulo}"${destino ? ` → destino: ${destino}` : ''}${just ? ` — ${just}` : ''}`,
          )
      })
    } catch (_) {}
    return fatos.filter(Boolean).slice(0, 6)
  }

  const montarPromptResumo = (dataDia, registros, linhaCacador, linhaMemoria) => {
    if (registros.length === 0) {
      const soCacador = linhaCacador ? ` Ainda assim, hoje há: ${linhaCacador}` : ''
      const soMemoria = linhaMemoria ? ` Contexto da memória compartilhada: ${linhaMemoria}` : ''
      return `Você é a Diamantina, organizadora diária do Agenda IA Diamond. O dia ${dataDia} da Folha está em branco: nenhum assunto foi registrado hoje.${soCacador}${soMemoria} Escreva uma mensagem curta, educada e motivadora em pt-BR comunicando isso, sem inventar conteúdo. Depois da mensagem, devolva SOMENTE um bloco JSON no formato:
{"fez_registros": false, "feito": "", "a_fazer": "", "prioridades": "", "decisoes": "", "sugestoes": []}`
    }

    const lista = registros.map(descreverRegistro).join('\n')
    return `Você é a Diamantina, organizadora diária do Agenda IA Diamond. Abaixo estão os assuntos registrados na Folha do dia ${dataDia}.

${lista}
${linhaCacador ? `\n${linhaCacador}\n` : ''}
${linhaMemoria ? `\n${linhaMemoria}\n` : ''}
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

  const usuarios = $app.findRecordsByFilter('users', '', '-created', 100, 0)
  // dedupe por email (evita reprocessar o mesmo usuário em contas duplicadas/ghost)
  const vistos = {}
  const usuariosAtivos = usuarios.filter((u) => {
    let chave = u.id
    try {
      const email = String(u.getString('email') || '')
        .toLowerCase()
        .trim()
      if (email) chave = email
    } catch (_) {}
    if (vistos[chave]) return false
    vistos[chave] = true
    return true
  })
  console.log(`[resumo-diario] Cron iniciado — ${usuariosAtivos.length} usuário(s) elegível(is).`)

  for (const usuarioAlvo of usuariosAtivos) {
    try {
      const dataDia = dataDeHoje()
      const oppDia = carregarOportunidadesDoDia(dataDia, usuarioAlvo.id)
      const linhaCacador = oppDia.disponivel ? linhaOportunidades(oppDia) : ''
      // —— fatos da memória compartilhada entre agentes entram no prompt ——
      const fatosMemoria = carregarFatosCompartilhados(usuarioAlvo.id)
      console.log(
        `[resumo-diario] Memória compartilhada: ${fatosMemoria.length} fato(s) carregado(s) (usuario=${usuarioAlvo.id}).`,
      )
      const linhaMemoria =
        fatosMemoria.length > 0
          ? `MEMÓRIA COMPARTILHADA ENTRE AGENTES (${fatosMemoria.length} fato(s) ativo(s) — use como contexto, não repita o que já está nos registros de hoje):\n${fatosMemoria.join('\n')}`
          : ''
      const registros = $app.findRecordsByFilter(
        'folha_dia',
        `((data = "${dataDia}" || data_hora ~ "${dataDia}" || created ~ "${dataDia}") && estado_semente != true) || usuario = "${usuarioAlvo.id}"`,
        '-created',
        80,
        0,
      )
      const prompt = montarPromptResumo(dataDia, registros, linhaCacador, linhaMemoria)

      if (registros.length === 0 && !linhaCacador && !linhaMemoria) {
        continue // nada a resumir para este usuário hoje
      }

      const AGENTE_SLUG = 'diamantina-organizadora-diaria'
      const res = $ai.agent(AGENTE_SLUG).chat({
        message: prompt,
        user_id: usuarioAlvo.id,
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
        `data = "${dataDia}" && usuario = "${usuarioAlvo.id}"`,
        '-created',
        1,
        0,
      )
      const payloadMemoria = {
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

      let resumoId = ''
      if (existentes.length > 0) {
        const existente = existentes[0]
        for (const k in payloadMemoria) existente.set(k, payloadMemoria[k])
        existente.set('updated_manual', new Date().toISOString())
        $app.save(existente)
        resumoId = existente.id
        console.log(
          `[resumo-diario] Resumo de ${dataDia} atualizado (gatilho=cron22h, usuario=${usuarioAlvo.id}, registros=${registros.length}, cacador=${oppDia.total}).`,
        )
      } else {
        const novo = new Record(col)
        for (const k in payloadMemoria) novo.set(k, payloadMemoria[k])
        $app.save(novo)
        resumoId = novo.id
        console.log(
          `[resumo-diario] Resumo de ${dataDia} criado (gatilho=cron22h, usuario=${usuarioAlvo.id}, registros=${registros.length}, cacador=${oppDia.total}).`,
        )
      }

      // —— aprendizados de volta para a memória compartilhada (ciclo completo) ——
      try {
        const fatos = extrairAprendizados(conteudo, parsed)
        const dataOrigem = dataDia
        fatos.forEach((f, idx) => {
          gravarFatoCompartilhado(
            usuarioAlvo.id,
            'aprendizado',
            `aprendizado ${dataOrigem} #${idx + 1}`,
            f,
            'Resumo do Dia',
            dataOrigem,
            'resumo_diario',
          )
        })
        if (fatos.length > 0) {
          console.log(
            `[resumo-diario] ${fatos.length} aprendizado(s) gravado(s) na memória compartilhada (usuario=${usuarioAlvo.id}, data=${dataDia}, resumo=${resumoId}).`,
          )
        }
      } catch (errMc) {
        console.error(
          `[resumo-diario] Falha ao gravar aprendizados na memória compartilhada: ${errMc.message}`,
        )
      }
    } catch (err) {
      console.error(
        `[resumo-diario] Falha no Resumo do Dia do usuário ${usuarioAlvo.id}: ${err.message}`,
      )
    }
  } // for usuariosAtivos
})

// ————— Endpoint sob demanda (botão "Gerar resumo agora") —————
routerAdd(
  'POST',
  '/backend/v1/resumo-dia/gerar',
  (e) => {
    const userId = e.auth?.id
    if (!userId) return e.unauthorizedError('auth required')
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

    // —— Memória Compartilhada entre agentes (mesmos helpers do cron, inline) ——
    const gravarFatoCompartilhado = (
      usuarioId,
      tipo,
      chave,
      conteudo,
      entidade,
      dataOrigem,
      fonte,
    ) => {
      if (!usuarioId || !conteudo || !chave) return null
      try {
        const chaveNormalizada = String(chave).toLowerCase().trim().slice(0, 200)
        const existentes = $app.findRecordsByFilter(
          'memoria_compartilhada',
          `usuario = "${usuarioId}" && agente_origem = "diamantina-organizadora-diaria" && tipo = "${String(tipo)}" && chave = "${String(chaveNormalizada).replace(/"/g, '\\"')}"`,
          '-created',
          1,
          0,
        )
        if (existentes.length > 0) {
          const existente = existentes[0]
          try {
            existente.set('conteudo', String(conteudo).slice(0, 4000))
            existente.set('entidade', String(entidade || '').slice(0, 200))
            existente.set('data_origem', String(dataOrigem || '').slice(0, 30))
            existente.set('fonte', String(fonte || '').slice(0, 120))
            existente.set('ativo', true)
            $app.save(existente)
            return existente
          } catch (_) {
            return null
          }
        }
        const colMc = $app.findCollectionByNameOrId('memoria_compartilhada')
        const novo = new Record(colMc)
        novo.set('usuario', usuarioId)
        novo.set('agente_origem', 'diamantina-organizadora-diaria')
        novo.set('tipo', String(tipo || 'aprendizado').slice(0, 60))
        novo.set('chave', chaveNormalizada)
        novo.set('conteudo', String(conteudo).slice(0, 4000))
        novo.set('entidade', String(entidade || '').slice(0, 200))
        novo.set('data_origem', String(dataOrigem || '').slice(0, 30))
        novo.set('fonte', String(fonte || '').slice(0, 120))
        novo.set('ativo', true)
        $app.save(novo)
        return novo
      } catch (err) {
        console.error(`[resumo-diario] Falha ao gravar fato compartilhado: ${err.message}`)
        return null
      }
    }

    const carregarFatosCompartilhados = (usuarioId) => {
      const linhas = []
      if (!usuarioId) return linhas
      try {
        const fatos = $app.findRecordsByFilter(
          'memoria_compartilhada',
          `usuario = "${usuarioId}" && ativo = true`,
          '-updated',
          30,
          0,
        )
        fatos.forEach((f) => {
          const conteudo = textoOuVazio(f, 'conteudo')
          const tipo = textoOuVazio(f, 'tipo') || 'fato'
          const agente = textoOuVazio(f, 'agente_origem') || 'agente'
          const entidade = textoOuVazio(f, 'entidade')
          if (conteudo) {
            linhas.push(
              `- [${tipo}] ${conteudo}${entidade ? ` (sobre: ${entidade})` : ''} — registrado por: ${agente}`,
            )
          }
        })
      } catch (_) {}
      return linhas
    }

    const extrairAprendizados = (conteudo, parsed) => {
      const fatos = []
      const decisoes = valorTexto(parsed.decisoes, 3000)
      if (decisoes && decisoes !== '—') fatos.push(decisoes.slice(0, 1200))
      const prioridades = valorTexto(parsed.prioridades, 3000)
      if (prioridades) fatos.push(`Prioridade do dia seguinte: ${prioridades.slice(0, 500)}`)
      const aFazer = valorTexto(parsed.a_fazer, 6000)
      if (aFazer) fatos.push(`Pendências em aberto: ${aFazer.slice(0, 800)}`)
      try {
        const sugestoes = Array.isArray(parsed.sugestoes) ? parsed.sugestoes : []
        sugestoes.slice(0, 3).forEach((sg) => {
          const titulo = valorTexto(sg && sg.titulo_sugerido, 160)
          const destino = valorTexto(sg && sg.destino_sugerido, 160)
          const just = valorTexto(sg && sg.justificativa, 300)
          if (titulo)
            fatos.push(
              `Sugestão de card: "${titulo}"${destino ? ` → destino: ${destino}` : ''}${just ? ` — ${just}` : ''}`,
            )
        })
      } catch (_) {}
      return fatos.filter(Boolean).slice(0, 6)
    }

    const montarPromptResumo = (dataDia, registros, linhaCacador, linhaMemoria) => {
      if (registros.length === 0) {
        const soCacador = linhaCacador ? ` Ainda assim, hoje há: ${linhaCacador}` : ''
        const soMemoria = linhaMemoria ? ` Contexto da memória compartilhada: ${linhaMemoria}` : ''
        return `Você é a Diamantina, organizadora diária do Agenda IA Diamond. O dia ${dataDia} da Folha está em branco: nenhum assunto foi registrado hoje.${soCacador}${soMemoria} Escreva uma mensagem curta, educada e motivadora em pt-BR comunicando isso, sem inventar conteúdo. Depois da mensagem, devolva SOMENTE um bloco JSON no formato:
{"fez_registros": false, "feito": "", "a_fazer": "", "prioridades": "", "decisoes": "", "sugestoes": []}`
      }

      const lista = registros.map(descreverRegistro).join('\n')
      return `Você é a Diamantina, organizadora diária do Agenda IA Diamond. Abaixo estão os assuntos registrados na Folha do dia ${dataDia}.

${lista}
${linhaCacador ? `\n${linhaCacador}\n` : ''}
${linhaMemoria ? `\n${linhaMemoria}\n` : ''}
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

    const body = e.requestInfo().body || {}
    const dataDia = (body.data && String(body.data).slice(0, 10)) || dataDeHoje()

    const gerarResumoDoDia = (dataAlvo, gatilho, usuarioId) => {
      const oppDia = carregarOportunidadesDoDia(dataAlvo, usuarioId)
      const linhaCacador = oppDia.disponivel ? linhaOportunidades(oppDia) : ''
      const fatosMemoria = carregarFatosCompartilhados(usuarioId)
      console.log(
        `[resumo-diario] Memória compartilhada: ${fatosMemoria.length} fato(s) carregado(s) (usuario=${usuarioId}).`,
      )
      const linhaMemoria =
        fatosMemoria.length > 0
          ? `MEMÓRIA COMPARTILHADA ENTRE AGENTES (${fatosMemoria.length} fato(s) ativo(s) — use como contexto, não repita o que já está nos registros de hoje):\n${fatosMemoria.join('\n')}`
          : ''
      const registros = $app.findRecordsByFilter(
        'folha_dia',
        `((data = "${dataAlvo}" || data_hora ~ "${dataAlvo}" || created ~ "${dataAlvo}") && estado_semente != true) || usuario = "${usuarioId}"`,
        '-created',
        80,
        0,
      )
      const prompt = montarPromptResumo(dataAlvo, registros, linhaCacador, linhaMemoria)

      const AGENTE_SLUG = 'diamantina-organizadora-diaria'
      const res = $ai.agent(AGENTE_SLUG).chat({
        message: prompt,
        user_id: usuarioId,
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
        `data = "${dataAlvo}" && usuario = "${usuarioId}"`,
        '-created',
        1,
        0,
      )
      let resumoId = ''
      if (existentes.length > 0) {
        const existente = existentes[0]
        for (const k in payload) existente.set(k, payload[k])
        existente.set('updated_manual', new Date().toISOString())
        $app.save(existente)
        resumoId = existente.id
        console.log(
          `[resumo-diario] Resumo de ${dataAlvo} atualizado (gatilho=${gatilho}, usuario=${usuarioId}, registros=${registros.length}, cacador=${oppDia.total}).`,
        )
      } else {
        const novo = new Record(col)
        for (const k in payload) novo.set(k, payload[k])
        $app.save(novo)
        resumoId = novo.id
        console.log(
          `[resumo-diario] Resumo de ${dataAlvo} criado (gatilho=${gatilho}, usuario=${usuarioId}, registros=${registros.length}, cacador=${oppDia.total}).`,
        )
      }

      // —— aprendizados de volta para a memória compartilhada (ciclo completo) ——
      try {
        const fatos = extrairAprendizados(conteudo, parsed)
        fatos.forEach((f, idx) => {
          gravarFatoCompartilhado(
            usuarioId,
            'aprendizado',
            `aprendizado ${dataAlvo} #${idx + 1}`,
            f,
            'Resumo do Dia',
            dataAlvo,
            'resumo_diario',
          )
        })
        if (fatos.length > 0) {
          console.log(
            `[resumo-diario] ${fatos.length} aprendizado(s) gravado(s) na memória compartilhada (usuario=${usuarioId}, data=${dataAlvo}, resumo=${resumoId}).`,
          )
        }
      } catch (errMc) {
        console.error(
          `[resumo-diario] Falha ao gravar aprendizados na memória compartilhada: ${errMc.message}`,
        )
      }

      return { id: resumoId, atualizado: existentes.length > 0 }
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
