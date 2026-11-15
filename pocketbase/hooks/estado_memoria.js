/// <reference path="../pb_data/types.d.ts" />

/**
 * PAINEL "ESTADO DA MEMÓRIA" — contadores reais das 4 camadas.
 *
 * GET  /backend/v1/memoria/estado    — contadores + últimas consolidações
 * POST /backend/v1/memoria/consolidar — consolida AGORA a fila pendente do
 *                                       usuário (campo json `fila_dossies` em
 *                                       users), usando a MESMA rotina inline do
 *                                       cron de dossies_memoria.js (idempotente:
 *                                       1 dossiê por usuario+tipo+entidade).
 *
 * IMPORTANTE (JSVM): NADA de lógica fora dos callbacks — helpers inline.
 * Todas as consultas têm try/catch: o painel nunca quebra por uma camada falhar.
 */

routerAdd(
  'GET',
  '/backend/v1/memoria/estado',
  (e) => {
    try {
      const userId = e.auth && e.auth.id ? e.auth.id : ''
      if (!userId) return e.unauthorizedError('autenticação obrigatória')

      // —— helper inline: contar registros de uma coleção (com filtro opcional) ——
      const contar = (colecao, filtro) => {
        try {
          const opts = filtro && filtro !== '' ? { filter: filtro } : {}
          return $app.countRecords(colecao, opts)
        } catch (_) {
          return 0
        }
      }

      // —— helper inline: pegar 1 registro (mais recente por sort) de forma segura ——
      const primeiro = (colecao, filtro, sort, campos) => {
        try {
          const rs = $app.findRecordsByFilter(colecao, filtro || '', sort || '-created', 1, 0)
          if (!rs || rs.length === 0) return null
          const r = rs[0]
          const out = { id: r.id, created: '', updated: '' }
          try {
            out.created = r.getString('created')
          } catch (_) {}
          try {
            out.updated = r.getString('updated')
          } catch (_) {}
          for (const c of campos || []) {
            try {
              out[c] = r.getString(c)
            } catch (_) {}
          }
          return out
        } catch (_) {
          return null
        }
      }

      // —— helper inline: ler a fila de consolidação (JSON texto em users.fila_dossies) ——
      const lerFilaDoUsuario = (id) => {
        try {
          const u = $app.findRecordById('users', id)
          const bruto = u.getString('fila_dossies')
          if (!bruto) return []
          const parsed = JSON.parse(bruto)
          return Array.isArray(parsed) ? parsed : []
        } catch (_) {
          return []
        }
      }

      const filtroUser = 'usuario = "' + String(userId).replace(/"/g, '\\"') + '"'

      // —— CAMADA 1: dossiês consolidados + pendentes na fila (campo JSON do user) ——
      const totalDossies = contar('dossies_memoria', filtroUser)
      const ultimoDossie = primeiro('dossies_memoria', filtroUser, '-atualizado_em', [
        'entidade_nome',
        'atualizado_em',
      ])
      const pendentesFila = lerFilaDoUsuario(userId).length

      // —— CAMADA 2: episódios ——
      const totalEpisodios = contar('episodios_memoria', filtroUser)
      const ultimoEpisodio = primeiro('episodios_memoria', filtroUser, '-created', ['data'])

      // —— CAMADA 3: memória compartilhada, por agente autoral ——
      const fatosPorAgente = []
      let totalCompartilhada = 0
      let ultimaCompartilhada = ''
      try {
        const rs = $app.findRecordsByFilter(
          'memoria_compartilhada',
          filtroUser + ' && ativo = true',
          '-updated',
          500,
          0,
        )
        const porAgente = {}
        for (const f of rs) {
          let ag = 'outro'
          try {
            ag = f.getString('agente_origem') || 'outro'
          } catch (_) {}
          porAgente[ag] = (porAgente[ag] || 0) + 1
          try {
            const upd = f.getDateTime('updated').string()
            if (upd > ultimaCompartilhada) ultimaCompartilhada = upd
          } catch (_) {}
        }
        const rotulos = {
          'diamantina-organizadora-diaria': 'Organizadora Diária',
          'diamantina-analista-memoria': 'Analista de Memória',
          'cacador-sementes': 'Caçador de Sementes',
        }
        for (const ag in porAgente) {
          fatosPorAgente.push({
            agente: ag,
            rotulo: rotulos[ag] || ag,
            total: porAgente[ag],
          })
        }
        fatosPorAgente.sort(function (a, b) {
          return b.total - a.total
        })
        totalCompartilhada = rs.length
      } catch (_) {}

      // —— CAMADA 4: busca semântica — contagem REAL de embeddings ——
      let totalEmbeddings = 0
      try {
        totalEmbeddings = $app.countRecords(
          'embeddings_memoria',
          '(' + filtroUser + ') && dims > 0',
        )
      } catch (_) {
        try {
          totalEmbeddings = $app.countRecords('embeddings_memoria', filtroUser)
        } catch (__) {
          totalEmbeddings = 0
        }
      }
      const estadoBusca =
        totalEmbeddings > 0
          ? {
              modo: 'vetorial',
              total_embeddings: totalEmbeddings,
              descricao:
                'Busca em 2 etapas com etapa vetorial ativa: a pergunta é embutida (OpenAI text-embedding-3-small, conta do dono) e os registros da memória são pontuados por similaridade de cosseno.',
            }
          : {
              modo: '2 etapas',
              total_embeddings: 0,
              descricao:
                'Candidatos pré-filtrados + escolha por significado feita pela Diamantina. A etapa vetorial (OpenAI, conta do dono) entra automaticamente quando os primeiros vetores forem gravados.',
            }

      return e.json(200, {
        dossies: {
          total: totalDossies,
          pendentes_fila: pendentesFila,
          ultima_consolidacao: ultimoDossie
            ? ultimoDossie.atualizado_em || ultimoDossie.updated
            : '',
          ultimo_dossie_nome: ultimoDossie ? ultimoDossie.entidade_nome || '' : '',
        },
        episodios: {
          total: totalEpisodios,
          ultimo_created: ultimoEpisodio ? ultimoEpisodio.created : '',
          ultimo_data: ultimoEpisodio ? ultimoEpisodio.data || '' : '',
        },
        memoria_compartilhada: {
          total: totalCompartilhada,
          ultima_atualizacao: ultimaCompartilhada,
          por_agente: fatosPorAgente,
        },
        busca_semantica: estadoBusca,
      })
    } catch (err) {
      return e.json(500, { error: err.message || 'Falha ao obter o estado da memória' })
    }
  },
  $apis.requireAuth(),
)

routerAdd(
  'POST',
  '/backend/v1/memoria/consolidar',
  (e) => {
    try {
      const userId = e.auth && e.auth.id ? e.auth.id : ''
      if (!userId) return e.unauthorizedError('autenticação obrigatória')

      // ================= HELPERS INLINE (JSVM: callbacks não veem topo) ======
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

      // —— consolidação de UM dossiê (mesma rotina do cron de dossies_memoria.js) ——
      const consolidarDossie = (usuarioId, tipoEntidade, entidadeId, gatilho) => {
        let entidade = null
        try {
          entidade = $app.findRecordById(tipoEntidade, entidadeId)
        } catch (_) {
          return { pulado: 'entidade não encontrada' }
        }
        const nomeEntidade = valorTexto(entidade.getString('nome'), 160)

        const pedacos = []
        const nomeFiltro = String(nomeEntidade).replace(/"/g, '\\"')

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
            pedacos.push(
              `[anotação/em evento do card] ${valorTexto(ev.getString('conteudo'), 250)}`,
            )
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

        if (pedacos.length === 0) return { pulado: 'sem registros' }

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

        // $ai.agent().chat exige user_id (assinatura atual; NÃO usar conversation:null)
        const res = $ai.agent(AGENTE_SLUG).chat({ message: prompt, user_id: usuarioId })
        const parsed = extrairJson(res && res.content ? res.content : '')
        if (!parsed || !parsed.resumo) return { pulado: 'agente não devolveu dossiê válido' }

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
          console.log(`[memoria] dossiê de "${nomeEntidade}" atualizado (gatilho=${gatilho}).`)
          return { id: existente.id, atualizado: true }
        }
        const novo = new Record(col)
        for (const k in payload) novo.set(k, payload[k])
        $app.save(novo)
        console.log(`[memoria] dossiê de "${nomeEntidade}" criado (gatilho=${gatilho}).`)
        return { id: novo.id, criado: true }
      }

      // ================= EXECUÇÃO: fila do usuário (campo JSON em users) =====
      const user = $app.findRecordById('users', userId)
      let fila = []
      try {
        const bruto = user.getString('fila_dossies')
        if (bruto) {
          const parsedFila = JSON.parse(bruto)
          if (Array.isArray(parsedFila)) fila = parsedFila
        }
      } catch (_) {
        fila = []
      }

      // Sem fila? enfileira as entidades mais relevantes com registros recentes.
      if (fila.length === 0) {
        const enfileiradas = {}
        const adiciona = (tipo, id) => {
          if (!id || enfileiradas[`${tipo}:${id}`]) return
          enfileiradas[`${tipo}:${id}`] = true
          fila.push({ tipo: tipo, id: id })
        }
        try {
          const recentes = $app.findRecordsByFilter(
            'folha_dia',
            `usuario = "${String(userId).replace(/"/g, '\\"')}"`,
            '-created',
            60,
            0,
          )
          for (const f of recentes) {
            for (const campo of ['contato', 'negocio', 'projeto']) {
              try {
                const v = f.get(campo)
                if (!v) continue
                const rec = Array.isArray(v) ? v[0] : v
                if (rec && rec.id) adiciona(campo, String(rec.id))
              } catch (_) {}
            }
          }
        } catch (_) {}
        try {
          const cartoes = $app.findRecordsByFilter(
            'cards',
            `updated > "${new Date(Date.now() - 30 * 24 * 3600 * 1000).toISOString()}"`,
            '-updated',
            60,
            0,
          )
          for (const c of cartoes) {
            for (const campo of ['contato', 'negocio', 'projeto']) {
              try {
                const v = c.get(campo)
                if (!v) continue
                const rec = Array.isArray(v) ? v[0] : v
                if (rec && rec.id) adiciona(campo, String(rec.id))
              } catch (_) {}
            }
          }
        } catch (_) {}
      }

      // Processa um lote (síncrono, para o botão devolver resultado real)
      const lote = fila.slice(0, 12)
      const resto = fila.slice(12)
      let criados = 0
      let atualizados = 0
      for (const item of lote) {
        if (!item || !item.tipo || !item.id) continue
        const r = consolidarDossie(userId, String(item.tipo), String(item.id), 'botao')
        if (r && r.criado) criados++
        if (r && r.atualizado) atualizados++
      }

      try {
        user.set('fila_dossies', JSON.stringify(resto))
        $app.save(user)
      } catch (errFila) {
        console.error('[memoria] falha ao salvar fila do usuário:', errFila.message)
      }

      return e.json(200, {
        sucesso: true,
        processados: lote.length,
        restantes_na_fila: resto.length,
        dossies_novos: criados,
        dossies_atualizados: atualizados,
        mensagem:
          criados + atualizados > 0
            ? `Consolidação concluída: ${criados} novo(s) e ${atualizados} atualizado(s).`
            : 'Nada a consolidar agora — os dossiês já estavam em dia.',
      })
    } catch (err) {
      return e.json(500, {
        sucesso: false,
        error: err.message || 'Falha ao consolidar dossiês agora',
      })
    }
  },
  $apis.requireAuth(),
)
