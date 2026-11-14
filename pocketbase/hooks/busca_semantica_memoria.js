/// <reference path="../pb_data/types.d.ts" />

/**
 * CAMADA 2 — Busca semântica de memória, com FILTROS estruturados.
 *
 * POST /backend/v1/analista-memoria/busca-semantica
 * Body: {
 *   pergunta: string,
 *   tipo_entidade?: 'dossie'|'resumo_dia'|'folha'|'card'|'chat'|'episodio'|'memoria_compartilhada'|'',
 *   data_inicio?: 'AAAA-MM-DD', data_fim?: 'AAAA-MM-DD',
 *   pessoa?: string (nome de contato), negocio?: string, projeto?: string,
 *   limite?: number
 * }
 *
 * Continua SEM embeddings (não há provedor no ambiente): a correspondência por
 * significado é feita pelo agente nativo em DUAS ETAPAS —
 *   1) seleção barata de CANDIDATOS (texto + recência, SEMPRE paginada),
 *      já pré-filtrada pelos filtros estruturados acima;
 *   2) o agente (diamantina-analista-memoria) escolhe os que respondem pelo
 *      significado.
 *
 * IMPORTANTE (JSVM do PocketBase): callbacks de routerAdd NÃO veem declarações
 * de topo — toda a lógica (helpers inclusos) vive inline no callback.
 */

routerAdd(
  'POST',
  '/backend/v1/analista-memoria/busca-semantica',
  (e) => {
    try {
      const userId = e.auth && e.auth.id ? e.auth.id : ''
      if (!userId) return e.unauthorizedError('autenticação obrigatória')

      const body = e.requestInfo().body || {}
      const pergunta = String(body.pergunta || body.message || '').trim()
      if (!pergunta) return e.badRequestError('A pergunta não pode ser vazia.')

      // —— helpers inline (JSVM) ——
      const esc = (s) => String(s || '').replace(/"/g, '\\"')

      const campoTexto = (r, n) => {
        try {
          const v = r.getString(n)
          return v === 'undefined' ? '' : v
        } catch (_) {
          return ''
        }
      }

      const normalizar = (s) =>
        String(s || '')
          .toLowerCase()
          .normalize('NFD')
          .replace(/[\u0300-\u036f]/g, '')
          .replace(/[^a-z0-9\s]/g, ' ')
          .trim()

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

      // —— filtros estruturados ——
      const tipoFiltro = String(body.tipo_entidade || body.tipo || '')
        .trim()
        .slice(0, 40)
      const dataInicio = String(body.data_inicio || '')
        .trim()
        .slice(0, 10)
      const dataFim = String(body.data_fim || '')
        .trim()
        .slice(0, 10)
      const pessoaFiltro = normalizar(String(body.pessoa || '')).slice(0, 120)
      const negocioFiltro = normalizar(String(body.negocio || '')).slice(0, 120)
      const projetoFiltro = normalizar(String(body.projeto || '')).slice(0, 120)

      const tiposValidos = new Set([
        'dossie',
        'resumo_dia',
        'folha',
        'card',
        'chat',
        'episodio',
        'memoria_compartilhada',
      ])
      const querTipo = (t) => !tipoFiltro || (tiposValidos.has(tipoFiltro) && tipoFiltro === t)

      // dentro do período? (data em AAAA-MM-DD; vazio = sem data conhecida)
      const noPeriodo = (data) => {
        const d = String(data || '').slice(0, 10)
        if (!d) return true // registros sem data não são excluídos
        if (dataInicio && d < dataInicio) return false
        if (dataFim && d > dataFim) return false
        return true
      }

      // o texto menciona pessoa/negócio/projeto? (nomes normalizados, 3+ letras)
      const menciona = (texto, alvo) => {
        const a = normalizar(alvo)
        if (a.length < 3) return true
        return normalizar(texto).indexOf(a) !== -1
      }
      const passaEntidades = (texto) =>
        menciona(texto, pessoaFiltro) &&
        menciona(texto, negocioFiltro) &&
        menciona(texto, projetoFiltro)

      const limite = Math.min(30, Math.max(3, Number(body.limite) || 12))
      const candidatos = []
      const empurrar = (id, tipo, fonte, data, texto) => {
        if (!id || !texto) return
        if (candidatos.length >= 60) return
        if (!querTipo(tipo)) return
        if (!noPeriodo(data)) return
        if (!passaEntidades(texto)) return
        candidatos.push({
          id,
          tipo,
          fonte,
          data: String(data || '').slice(0, 10),
          texto: String(texto).slice(0, 400),
        })
      }

      // —— candidatos: fontes do sistema (cada consulta paginada) ——
      if (querTipo('dossie')) {
        try {
          const dossies = $app.findRecordsByFilter(
            'dossies_memoria',
            `usuario = "${esc(userId)}"`,
            '-atualizado_em',
            25,
            0,
          )
          for (const d of dossies) {
            empurrar(
              d.id,
              'dossie',
              `Dossiê de ${campoTexto(d, 'entidade_nome')}`,
              campoTexto(d, 'atualizado_em'),
              `${campoTexto(d, 'nome')} — ${campoTexto(d, 'resumo')} — ${campoTexto(d, 'conteudo')}`,
            )
          }
        } catch (_) {}
        if (termoUnico) {
          try {
            const ds = $app.findRecordsByFilter(
              'dossies_memoria',
              `(nome ~ "${esc(termoUnico)}" || resumo ~ "${esc(termoUnico)}" || conteudo ~ "${esc(termoUnico)}")`,
              '-atualizado_em',
              15,
              0,
            )
            for (const d of ds) {
              empurrar(
                d.id,
                'dossie',
                `Dossiê de ${campoTexto(d, 'entidade_nome')}`,
                campoTexto(d, 'atualizado_em'),
                `${campoTexto(d, 'nome')} — ${campoTexto(d, 'resumo')} — ${campoTexto(d, 'conteudo')}`,
              )
            }
          } catch (_) {}
        }
      }

      if (querTipo('resumo_dia')) {
        try {
          const resumos = $app.findRecordsByFilter('resumos_dia', '', '-created', 15, 0)
          for (const r of resumos) {
            empurrar(
              r.id,
              'resumo_dia',
              `Resumo do dia ${campoTexto(r, 'data').slice(0, 10)}`,
              campoTexto(r, 'data'),
              `${campoTexto(r, 'data').slice(0, 10)} | feito: ${campoTexto(r, 'feito')} | a fazer: ${campoTexto(r, 'a_fazer')} | decisões: ${campoTexto(r, 'decisoes')}`,
            )
          }
        } catch (_) {}
      }

      if (querTipo('folha')) {
        try {
          const folhas = $app.findRecordsByFilter('folha_dia', '', '-created', 20, 0)
          for (const f of folhas) {
            empurrar(
              f.id,
              'folha',
              `Registro da folha (${campoTexto(f, 'data').slice(0, 10)})`,
              campoTexto(f, 'data'),
              `${campoTexto(f, 'data').slice(0, 10)} — ${campoTexto(f, 'registro')}`,
            )
          }
        } catch (_) {}
      }

      if (querTipo('card')) {
        try {
          const cartoes = $app.findRecordsByFilter('cards', '', '-updated', 20, 0)
          for (const c of cartoes) {
            empurrar(
              c.id,
              'card',
              `Card "${campoTexto(c, 'titulo')}"`,
              campoTexto(c, 'updated'),
              `${campoTexto(c, 'titulo')} — ${campoTexto(c, 'descricao')}`,
            )
          }
        } catch (_) {}
        if (termoUnico) {
          try {
            const cs = $app.findRecordsByFilter(
              'cards',
              `(titulo ~ "${esc(termoUnico)}" || descricao ~ "${esc(termoUnico)}")`,
              '-updated',
              10,
              0,
            )
            for (const c of cs) {
              empurrar(
                c.id,
                'card',
                `Card "${campoTexto(c, 'titulo')}"`,
                campoTexto(c, 'updated'),
                `${campoTexto(c, 'titulo')} — ${campoTexto(c, 'descricao')}`,
              )
            }
          } catch (_) {}
        }
      }

      if (querTipo('chat')) {
        try {
          const mensagens = $app.findRecordsByFilter('chat_mensagens', '', '-created', 20, 0)
          for (const m of mensagens) {
            empurrar(
              m.id,
              'chat',
              `Chat (${campoTexto(m, 'created').slice(0, 10)})`,
              campoTexto(m, 'created'),
              campoTexto(m, 'texto'),
            )
          }
        } catch (_) {}
      }

      if (querTipo('episodio')) {
        try {
          const eps = $app.findRecordsByFilter(
            'episodios_memoria',
            `usuario = "${esc(userId)}"`,
            '-data',
            20,
            0,
          )
          for (const p of eps) {
            empurrar(
              p.id,
              'episodio',
              `Episódio de ${campoTexto(p, 'data').slice(0, 10)}`,
              campoTexto(p, 'data'),
              `${campoTexto(p, 'titulo')} — ${campoTexto(p, 'resumo')}`,
            )
          }
        } catch (_) {}
      }

      if (querTipo('memoria_compartilhada')) {
        try {
          const fatos = $app.findRecordsByFilter(
            'memoria_compartilhada',
            `usuario = "${esc(userId)}" && ativo = true`,
            '-updated',
            30,
            0,
          )
          for (const f of fatos) {
            empurrar(
              f.id,
              'memoria_compartilhada',
              `Fato compartilhado (${campoTexto(f, 'tipo')})`,
              campoTexto(f, 'data_origem'),
              `${campoTexto(f, 'chave')} — ${campoTexto(f, 'conteudo')}`,
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

      const filtroDesc = []
      if (tipoFiltro) filtroDesc.push('tipo=' + tipoFiltro)
      if (dataInicio) filtroDesc.push('a partir de ' + dataInicio)
      if (dataFim) filtroDesc.push('até ' + dataFim)
      if (pessoaFiltro) filtroDesc.push('pessoa=' + pessoaFiltro)
      if (negocioFiltro) filtroDesc.push('negócio=' + negocioFiltro)
      if (projetoFiltro) filtroDesc.push('projeto=' + projetoFiltro)

      const promptCorrespondencia = `Você é a Diamantina, Analista de Memória do Agenda IA Diamond. A pergunta do usuário é:

"${pergunta}"
${filtroDesc.length > 0 ? `\nFiltros aplicados pelo usuário: ${filtroDesc.join('; ')}.` : ''}
Abaixo estão CANDIDATOS a registros do sistema (id, tipo, fonte, data, texto). Escolha os que respondem à pergunta PELO SIGNIFICADO — não apenas pelas mesmas palavras. Ex.: "desistimos do preço alto" pode estar em um registro que diz "mantivemos o ticket premium" ou "não demos desconto".

CANDIDATOS:
${lista || '(nenhum candidato encontrado)'}

Devolva SOMENTE um bloco JSON puro (sem markdown):
{
  "resultados": [
    {"id":"id do candidato","justificativa":"1 frase em pt-BR dizendo por que responde à pergunta","confianca":"alta|media|baixa"}
  ],
  "observacao": "se nada responde por significado, uma frase em pt-BR explicando (ex.: 'não encontrei registros com esse significado ainda')"
}
Regras: use APENAS ids da lista acima; no máximo ${limite} resultados; ordene do mais relevante ao menos; se a lista vier vazia, devolve resultados: [] e a observação.`

      const res = $ai.agent('diamantina-analista-memoria').chat({
        message: promptCorrespondencia,
        user_id: userId,
      })
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
        for (const r of parsed.resultados.slice(0, limite)) {
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
            ? candidatos.length === 0
              ? 'Nenhum registro passou pelos filtros aplicados — revise tipo, período, pessoa, negócio ou projeto.'
              : 'Nada encontrado ainda com esse significado — tente reformular a pergunta.'
            : ''),
        total_candidatos: candidatos.length,
        filtros_aplicados: filtroDesc,
      })
    } catch (err) {
      return e.json(500, { error: err.message || 'Falha na busca semântica' })
    }
  },
  $apis.requireAuth(),
)
