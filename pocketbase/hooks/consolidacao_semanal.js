/// <reference path="../pb_data/types.d.ts" />

/**
 * Consolidação Semanal e rotinas de memória
 * Cron executado diariamente à meia-noite (0 0 * * *)
 */
cronAdd('consolidacao_semanal', '0 0 * * *', () => {
  try {
    const hoje = new Date()
    // Executa a consolidação acumulada aos domingos (dia 0)
    if (hoje.getDay() !== 0) return

    const resumosRecentes = $app.findRecordsByFilter('resumos_dia', '', '-created', 7, 0)

    if (resumosRecentes.length === 0) return

    let textoConsolidado = resumosRecentes
      .map((r) => {
        return `Data: ${r.getString('data')}\nFeito: ${r.getString('feito')}\nPendências: ${r.getString('a_fazer')}\nDecisões: ${r.getString('decisoes')}\nPróximos passos: ${r.getString('proximos_passos')}`
      })
      .join('\n---\n')

    const prompt = `Você é o sistema de Consolidação Semanal de Memória da 'Agenda IA Diamond'.
Consolide os resumos diários dos últimos 7 dias em uma síntese executiva semanal:
${textoConsolidado}

Responda em formato JSON puro:
{
  "feito": "Principais entregas da semana",
  "a_fazer": "Pendências persistentes e acumuladas para a próxima semana",
  "prioridades": "As 3 metas principais da próxima semana",
  "decisoes": "Decisões estratégicas firmadas ao longo da semana",
  "proximos_passos": "Plano de ação imediato de segunda-feira"
}`

    const aiRes = $ai.chat({
      model: 'fast',
      messages: [{ role: 'user', content: prompt }],
    })

    let raw = aiRes.choices[0].message.content.trim()
    if (raw.startsWith('```json')) raw = raw.slice(7)
    if (raw.startsWith('```')) raw = raw.slice(3)
    if (raw.endsWith('```')) raw = raw.slice(0, -3)

    const parsed = JSON.parse(raw.trim())

    const resumosCol = $app.findCollectionByNameOrId('resumos_dia')
    const novoResumo = new Record(resumosCol)
    novoResumo.set('data', hoje.toISOString().split('T')[0])
    novoResumo.set('feito', `[CONSOLIDAÇÃO SEMANAL]\n${parsed.feito || ''}`)
    novoResumo.set('a_fazer', parsed.a_fazer || '')
    novoResumo.set('prioridades', parsed.prioridades || '')
    novoResumo.set('decisoes', parsed.decisoes || '')
    novoResumo.set('proximos_passos', parsed.proximos_passos || '')
    novoResumo.set('contagem_cards_criados', 0)
    $app.save(novoResumo)

    console.log('Consolidação semanal da Agenda Diamond concluída com sucesso.')
  } catch (err) {
    console.error('Erro na consolidação semanal:', err.message)
  }
})

// Endpoint para disparar consolidação sob demanda
routerAdd(
  'POST',
  '/backend/v1/consolidar-semana',
  (e) => {
    try {
      const userId = e.auth?.id
      if (!userId) return e.unauthorizedError('auth required')

      const hoje = new Date()
      const resumosRecentes = $app.findRecordsByFilter('resumos_dia', '', '-created', 7, 0)

      if (resumosRecentes.length === 0) {
        return e.json(200, { mensagem: 'Sem resumos recentes para consolidar.' })
      }

      let textoConsolidado = resumosRecentes
        .map((r) => {
          return `Data: ${r.getString('data')}\nFeito: ${r.getString('feito')}\nPendências: ${r.getString('a_fazer')}\nDecisões: ${r.getString('decisoes')}\nPróximos passos: ${r.getString('proximos_passos')}`
        })
        .join('\n---\n')

      const prompt = `Você é o sistema de Consolidação Semanal de Memória da 'Agenda IA Diamond'.
Consolide os resumos diários dos últimos dias em uma síntese executiva acumulada:
${textoConsolidado}

Responda em formato JSON puro:
{
  "feito": "Principais entregas do período",
  "a_fazer": "Pendências persistentes e acumuladas",
  "prioridades": "As maiores prioridades de continuidade",
  "decisoes": "Decisões estratégicas firmadas",
  "proximos_passos": "Plano de ação imediato"
}`

      const aiRes = $ai.chat({
        model: 'fast',
        messages: [{ role: 'user', content: prompt }],
      })

      let raw = aiRes.choices[0].message.content.trim()
      if (raw.startsWith('```json')) raw = raw.slice(7)
      if (raw.startsWith('```')) raw = raw.slice(3)
      if (raw.endsWith('```')) raw = raw.slice(0, -3)

      const parsed = JSON.parse(raw.trim())

      const resumosCol = $app.findCollectionByNameOrId('resumos_dia')
      const novoResumo = new Record(resumosCol)
      novoResumo.set('data', hoje.toISOString().split('T')[0])
      novoResumo.set('feito', `[CONSOLIDAÇÃO SEMANAL]\n${parsed.feito || ''}`)
      novoResumo.set('a_fazer', parsed.a_fazer || '')
      novoResumo.set('prioridades', parsed.prioridades || '')
      novoResumo.set('decisoes', parsed.decisoes || '')
      novoResumo.set('proximos_passos', parsed.proximos_passos || '')
      novoResumo.set('contagem_cards_criados', 0)
      $app.save(novoResumo)

      return e.json(200, {
        sucesso: true,
        resumo_id: novoResumo.id,
        resumo: parsed,
      })
    } catch (err) {
      return e.json(500, { error: err.message || 'Erro na consolidação sob demanda' })
    }
  },
  $apis.requireAuth(),
)
