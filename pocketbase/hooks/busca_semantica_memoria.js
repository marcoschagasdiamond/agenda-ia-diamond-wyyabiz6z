/// <reference path="../pb_data/types.d.ts" />

/**
 * CAMADA 2 — Busca semântica de memória.
 *
 * POST /backend/v1/analista-memoria/busca-semantica
 * Body: { pergunta, tipo_entidade? , limite? }
 *
 * Caminho escolhido: NÃO há provedor de embeddings no ambiente (sem secret de
 * embeddings vetoriais; o gateway de IA do Skip expõe $ai.chat/agentes, não
 * vetores consultáveis). Então a correspondência por significado é feita pelo
 * PRÓPRIO agente nativo (diamantina-analista-memoria), em DUAS ETAPAS:
 *
 *   1) Seleção ampla de CANDIDATOS (barata, sem LLM): busca textual nos
 *      dossiês, resumos do dia, folha, cards e chat — pegando os N registros
 *      mais recentes de cada fonte mesmo sem termo de busca (paginação, nunca
 *      varredura sem limite).
 *   2) CORRESPONDÊNCIA POR SIGNIFICADO (LLM): o agente recebe a pergunta e os
 *      candidatos (id, tipo, data, texto) e devolve os que respondem por
 *      significado, com id + justificativa + confiança.
 *
 * Limitação declarada: sem embeddings, a etapa 2 escolhe entre candidatos já
 * selecionados — se o registro certo não vier nem por termo, nem por
 * recência, não será encontrado. O agente do chat continua consultando os
 * dossiês por tools, o que cobre a maior parte dos casos.
 */

routerAdd(
  'POST',
  '/backend/v1/analista-memoria/busca-semantica',
  (e) => {
    try {
      const userId = e.auth?.id
      if (!userId) return e.unauthorizedError('autenticação obrigatória')

      const body = e.requestInfo().body || {}
      const pergunta = String(body.pergunta || body.message || '').trim()
      if (!pergunta) return e.badRequestError('A pergunta não pode ser vazia.')

      // —— extração de termos da pergunta (barata, sem LLM) ——
      const STOPWORDS = new Set([
        'a',
        'o',
        'e',
        'é',
        'de',
        'da',
        'do',
        'das',
        'dos',
        'em',
        'no',
        'na',
        'nos',
        'nas',
        'um',
        'uma',
        'que',
        'qual',
        'quais',
        'quando',
        'onde',
        'como',
        'por',
        'para',
        'com',
        'sem',
        'ao',
        'aos',
        'às',
        'à',
        'ele',
        'ela',
        'meu',
        'minha',
        'sobre',
        'aquela',
        'aquele',
        'aqueles',
        'aquelas',
        'esse',
        'essa',
        'isso',
        'este',
        'esta',
        'foi',
        'era',
        'tinha',
        'teve',
        'havia',
        'dizemos',
        'desistimos',
        'falei',
        'falamos',
        'conversamos',
        'decidimos',
        'mais',
        'menos',
        'muito',
        'pouco',
        'já',
        'ainda',
        'não',
        'sim',
        'the',
        'of',
        'and',
      ])
      const termos = pergunta
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9\s]/g, ' ')
        .split(/\s+/)
        .filter((t) => t.length >= 3 && !STOPWORDS.has(t))
        .slice(0, 8)
      const termoUnico = termos[0] || ''

      const normalizar = (s) =>
        String(s || '')
          .toLowerCase()
          .normalize('NFD')
          .replace(/[\u0300-\u036f]/g, '')

      // —— 1) candidatos: dossiês + registros recentes (paginado, com limite) ——
      const candidatos = []
      const empurrar = (id, tipo, fonte, data, texto) => {
        if (!id || !texto) return
        if (candidatos.length >= 60) return
        candidatos.push({
          id,
          tipo,
          fonte,
          data: String(data || ''),
          texto: String(texto).slice(0, 400),
        })
      }

      try {
        const dossies = $app.findRecordsByFilter(
          'dossies_memoria',
          `usuario = "${userId}"`,
          '-atualizado_em',
          25,
          0,
        )
        for (const d of dossies) {
          empurrar(
            d.id,
            'dossie',
            `Dossiê de ${d.getString('entidade_nome')}`,
            d.getString('atualizado_em'),
            `${d.getString('nome')} — ${d.getString('resumo')} — ${d.getString('conteudo')}`,
          )
        }
      } catch (_) {}

      try {
        const resumos = $app.findRecordsByFilter('resumos_dia', '', '-created', 15, 0)
        for (const r of resumos) {
          empurrar(
            r.id,
            'resumo_dia',
            `Resumo do dia ${r.getString('data')}`,
            r.getString('created'),
            `${r.getString('data')} | feito: ${r.getString('feito')} | a fazer: ${r.getString('a_fazer')} | decisões: ${r.getString('decisoes')}`,
          )
        }
      } catch (_) {}

      try {
        const folhas = $app.findRecordsByFilter('folha_dia', '', '-created', 20, 0)
        for (const f of folhas) {
          empurrar(
            f.id,
            'folha',
            `Registro da folha (${f.getString('data')})`,
            f.getString('created'),
            `${f.getString('data')} — ${f.getString('registro')}`,
          )
        }
      } catch (_) {}

      try {
        const cartoes = $app.findRecordsByFilter('cards', '', '-updated', 20, 0)
        for (const c of cartoes) {
          empurrar(
            c.id,
            'card',
            `Card "${c.getString('titulo')}"`,
            c.getString('updated'),
            `${c.getString('titulo')} — ${c.getString('descricao')}`,
          )
        }
      } catch (_) {}

      try {
        const mensagens = $app.findRecordsByFilter('chat_mensagens', '', '-created', 20, 0)
        for (const m of mensagens) {
          empurrar(
            m.id,
            'chat',
            `Chat (${m.getDateTime('created').string().slice(0, 10)})`,
            m.getString('created'),
            m.getString('texto'),
          )
        }
      } catch (_) {}

      // termo único relevante da pergunta → refina candidatos por fonte
      if (termoUnico) {
        try {
          const dossiesTermo = $app.findRecordsByFilter(
            'dossies_memoria',
            `(nome ~ "${termoUnico}" || resumo ~ "${termoUnico}" || conteudo ~ "${termoUnico}")`,
            '-atualizado_em',
            15,
            0,
          )
          for (const d of dossiesTermo) {
            empurrar(
              d.id,
              'dossie',
              `Dossiê de ${d.getString('entidade_nome')}`,
              d.getString('atualizado_em'),
              `${d.getString('nome')} — ${d.getString('resumo')} — ${d.getString('conteudo')}`,
            )
          }
        } catch (_) {}
        try {
          const resumosTermo = $app.findRecordsByFilter(
            'resumos_dia',
            `(feito ~ "${termoUnico}" || a_fazer ~ "${termoUnico}" || decisoes ~ "${termoUnico}")`,
            '-created',
            10,
            0,
          )
          for (const r of resumosTermo) {
            empurrar(
              r.id,
              'resumo_dia',
              `Resumo do dia ${r.getString('data')}`,
              r.getString('created'),
              `${r.getString('data')} | feito: ${r.getString('feito')} | a fazer: ${r.getString('a_fazer')} | decisões: ${r.getString('decisoes')}`,
            )
          }
        } catch (_) {}
        try {
          const cartoesTermo = $app.findRecordsByFilter(
            'cards',
            `(titulo ~ "${termoUnico}" || descricao ~ "${termoUnico}")`,
            '-updated',
            10,
            0,
          )
          for (const c of cartoesTermo) {
            empurrar(
              c.id,
              'card',
              `Card "${c.getString('titulo')}"`,
              c.getString('updated'),
              `${c.getString('titulo')} — ${c.getString('descricao')}`,
            )
          }
        } catch (_) {}
      }

      // —— 2) correspondência por significado (o próprio agente) ——
      const lista = candidatos
        .map(
          (c, i) =>
            `[${i}] id=${c.id} | tipo=${c.tipo} | fonte=${c.fonte} | data=${c.data}\n${c.texto}`,
        )
        .join('\n---\n')

      const promptCorrespondencia = `Você é a Diamantina, Analista de Memória do Agenda IA Diamond. A pergunta do usuário é:

"${pergunta}"

Abaixo estão CANDIDATOS a registros do sistema (id, tipo, fonte, data, texto). Escolha os que respondem à pergunta PELO SIGNIFICADO — não apenas pelas mesmas palavras. Ex.: "desistimos do preço alto" pode estar em um registro que diz "mantivemos o ticket premium" ou "não demos desconto".

CANDIDATOS:
${lista || '(nenhum candidato encontrado)'}

Devolva SOMENTE um bloco JSON puro (sem markdown):
{
  "resultados": [
    {"id":"id do candidato","tipo":"dossie|resumo_dia|folha|card|chat","justificativa":"1 frase em pt-BR dizendo por que responde à pergunta","confianca":"alta|media|baixa"}
  ],
  "observacao": "se nada responde por significado, uma frase em pt-BR explicando (ex.: 'não encontrei registros com esse significado ainda')"
}
Regras: use APENAS ids da lista acima; no máximo 6 resultados; ordene do mais relevante ao menos; se a lista vier vazia, devolve resultados: [] e a observação.`

      const res = $ai
        .agent('diamantina-analista-memoria')
        .chat({ message: promptCorrespondencia, conversation: null })
      const bruto = res && res.content ? String(res.content).trim() : ''
      const m = bruto.match(/\{[\s\S]*\}/)
      let parsed = null
      if (m) {
        try {
          parsed = JSON.parse(
            m[0]
              .replace(/^```json\s*/i, '')
              .replace(/^```\s*/, '')
              .replace(/```\s*$/, ''),
          )
        } catch (_) {
          parsed = null
        }
      }

      const validos = new Set(candidatos.map((c) => c.id))
      const resultados = []
      if (parsed && Array.isArray(parsed.resultados)) {
        for (const r of parsed.resultados.slice(0, 6)) {
          if (!r || !r.id || !validos.has(r.id)) continue
          const c = candidatos.find((x) => x.id === r.id)
          if (!c) continue
          resultados.push({
            id: c.id,
            tipo: c.tipo,
            fonte: c.fonte,
            data: c.data,
            trecho: c.texto.slice(0, 300),
            justificativa: String(r.justificativa || '').slice(0, 300),
            confianca: ['alta', 'media', 'baixa'].includes(r.confianca) ? r.confianca : 'media',
          })
        }
      }

      return e.json(200, {
        resultados,
        observacao:
          (parsed && parsed.observacao) ||
          (resultados.length === 0
            ? 'Nada encontrado ainda com esse significado — tente reformular a pergunta.'
            : ''),
        total_candidatos: candidatos.length,
      })
    } catch (err) {
      return e.json(500, { error: err.message || 'Falha na busca semântica' })
    }
  },
  $apis.requireAuth(),
)
