/// <reference path="../pb_data/types.d.ts" />

/**
 * Hook para organizar uma reunião gravada na folha do dia via IA nativa ($ai.chat / agente Skip Cloud)
 * Rota: POST /backend/v1/organizar-reuniao
 *
 * Recebe:
 * - folha_id: ID do registro da folha correspondente à reunião (opcional se enviar texto direto)
 * - titulo: título da reunião
 * - texto_transcricao: texto da transcrição capturada via Web Speech / notas do usuário
 * - projeto_id, contato_id, negocio_id: vínculos opcionais
 *
 * Retorna:
 * - ata organizada (assuntos discutidos, decisões, próximos passos, participantes, demandas sugeridas)
 * - cards sugeridos para o Kanban
 */
routerAdd(
  'POST',
  '/backend/v1/organizar-reuniao',
  (e) => {
    try {
      const userId = e.auth?.id
      if (!userId) return e.unauthorizedError('Autenticação necessária')

      const body = e.requestInfo().body || {}
      const folhaId = body.folha_id || ''
      const tituloReuniao = (body.titulo || 'Reunião Gravada').trim()
      let textoConteudo = (body.texto_transcricao || body.registro || '').trim()

      let registroFolha = null
      if (folhaId) {
        try {
          registroFolha = $app.findRecordById('folha_dia', folhaId)
          if (!textoConteudo) {
            textoConteudo = registroFolha.getString('registro') || ''
          }
        } catch (_) {}
      }

      // Contexto de projetos e contatos para enriquecer a inteligência
      const projetos = $app.findRecordsByFilter(
        'projetos',
        "status != 'concluido'",
        '-created',
        30,
        0,
      )
      const contatos = $app.findRecordsByFilter('contatos', '', '-created', 30, 0)
      const projetosMini = projetos.map((p) => ({
        id: p.id,
        nome: p.getString('nome'),
        tipo: p.getString('tipo'),
      }))
      const contatosMini = contatos.map((c) => ({
        id: c.id,
        nome: c.getString('nome'),
        empresa: c.getString('empresa'),
      }))

      const prompt = `Você é o organizador executivo e Segundo Cérebro do sistema 'Agenda IA Diamond'.
Foi gravada uma reunião de trabalho e você deve estruturar a Ata Executiva Completa e identificar tarefas acionáveis (demandas/cards).

Título da Reunião: "${tituloReuniao}"
Conteúdo / Transcrição / Notas da Reunião:
"""
${textoConteudo || 'Reunião de alinhamento sem transcrição de texto completa. Organize tópicos essenciais a partir do título e contexto.'}
"""

Projetos existentes no sistema:
${JSON.stringify(projetosMini)}

Contatos existentes no sistema:
${JSON.stringify(contatosMini)}

Vínculos passados na gravação:
Projeto ID: ${body.projeto_id || (registroFolha ? registroFolha.getString('projeto') : '') || 'Nenhum'}
Contato ID: ${body.contato_id || (registroFolha ? registroFolha.getString('contato') : '') || 'Nenhum'}

Estruture a reunião estritamente em formato JSON puro, sem crases de markdown e sem texto antes ou depois:
{
  "titulo": "Título refinado da Reunião",
  "resumo_executivo": "Visão geral executiva em 2 ou 3 frases sobre o que tratou o encontro",
  "topicos_discutidos": [
    "Tópico 1 discutido",
    "Tópico 2 discutido"
  ],
  "decisoes": [
    "Decisão ou consenso 1",
    "Decisão ou consenso 2"
  ],
  "proximos_passos": [
    "Próximo passo 1",
    "Próximo passo 2"
  ],
  "demandas_sugeridas": [
    {
      "titulo": "Título direto da demanda acionável",
      "descricao": "Detalhamento da demanda decorrente da reunião",
      "prioridade": "baixa" | "media" | "alta" | "urgente",
      "responsavel_sugerido": "Nome ou perfil",
      "prazo_dias": 3
    }
  ],
  "cards_kanban": [
    {
      "titulo": "Título acionável do card",
      "descricao": "Contexto do card",
      "prioridade": "baixa" | "media" | "alta" | "urgente",
      "status": "novo" | "em_andamento",
      "proximo_passo": "Ação imediata"
    }
  ]
}`

      const aiRes = $ai.chat({
        model: 'fast',
        messages: [
          {
            role: 'system',
            content:
              'Você é um assistente executivo sênior de inteligência operacional que responde apenas em JSON puro.',
          },
          { role: 'user', content: prompt },
        ],
      })

      let rawOutput = aiRes.choices[0].message.content.trim()
      if (rawOutput.startsWith('```json')) rawOutput = rawOutput.slice(7)
      if (rawOutput.startsWith('```')) rawOutput = rawOutput.slice(3)
      if (rawOutput.endsWith('```')) rawOutput = rawOutput.slice(0, -3)
      rawOutput = rawOutput.trim()

      let ata = null
      try {
        ata = JSON.parse(rawOutput)
      } catch (jsonErr) {
        ata = {
          titulo: tituloReuniao,
          resumo_executivo: rawOutput.slice(0, 300),
          topicos_discutidos: [textoConteudo ? textoConteudo.slice(0, 200) : 'Pauta alinhada'],
          decisoes: ['Alinhamento registrado na gravação'],
          proximos_passos: ['Revisar pontos tratados'],
          demandas_sugeridas: [],
          cards_kanban: [],
        }
      }

      // Se existir registro da folha vinculado, atualiza ata_organizada e status_transcricao
      if (registroFolha) {
        try {
          registroFolha.set('ata_organizada', JSON.stringify(ata))
          registroFolha.set('status_transcricao', 'processado')
          $app.save(registroFolha)
        } catch (saveErr) {
          console.log('Aviso ao salvar ata no registroFolha:', saveErr.message)
        }
      }

      return e.json(200, {
        sucesso: true,
        folha_id: folhaId || (registroFolha ? registroFolha.id : null),
        ata,
      })
    } catch (err) {
      return e.json(500, { error: err.message || 'Erro ao organizar reunião com IA' })
    }
  },
  $apis.requireAuth(),
)
