/// <reference path="../pb_data/types.d.ts" />

/**
 * Hook para organizar registros da folha_dia com IA, gerar cards, resumos do dia
 * e atualizar contexto histórico persistente de projetos e contatos.
 */
routerAdd(
  'POST',
  '/backend/v1/organizar-folha',
  (e) => {
    try {
      const userId = e.auth?.id
      if (!userId) return e.unauthorizedError('Autenticação necessária')

      const body = e.requestInfo().body || {}
      const dataAlvo = body.data || new Date().toISOString().split('T')[0]

      // 1. Buscar registros da folha pendentes
      const folhaPendentes = $app.findRecordsByFilter(
        'folha_dia',
        `status = 'pendente'`,
        '-created',
        100,
        0,
      )

      // Buscar projetos e negócios para contextualizar
      const projetos = $app.findRecordsByFilter(
        'projetos',
        "status != 'concluido'",
        '-created',
        30,
        0,
      )
      const contatos = $app.findRecordsByFilter('contatos', '', '-created', 30, 0)
      const negocios = $app.findRecordsByFilter('negocios', '', '-created', 30, 0)

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
      const negociosMini = negocios.map((n) => ({ id: n.id, nome: n.getString('nome') }))

      if (folhaPendentes.length === 0) {
        return e.json(200, {
          mensagem: 'Nenhum registro pendente na folha do dia para organizar.',
          cards_sugeridos: [],
          resumo_sugerido: null,
        })
      }

      const registrosTexto = folhaPendentes
        .map((f, i) => {
          return `[ID: ${f.id}] [Origem: ${f.getString('tipo_origem')}] ${f.getString('registro')}`
        })
        .join('\n')

      const prompt = `Você é o organizador de tarefas e Segundo Cérebro do sistema 'Agenda IA Diamond'.
Analise os registros livres da folha de trabalho do usuário e converta-os em cards acionáveis para o Kanban, além de estruturar o Resumo Executivo do Dia.

Projetos existentes:
${JSON.stringify(projetosMini)}

Contatos existentes:
${JSON.stringify(contatosMini)}

Negócios existentes:
${JSON.stringify(negociosMini)}

Registros da folha a processar:
${registrosTexto}

Responda ESTRITAMENTE em formato JSON puro, sem crases de markdown e sem texto antes ou depois:
{
  "cards": [
    {
      "folha_id": "id do registro original ou null",
      "titulo": "Título direto e acionável do card",
      "descricao": "Detalhamento e contexto da anotação/conversa",
      "projeto_id": "id do projeto correspondente ou null",
      "negocio_id": "id do negocio correspondente ou null",
      "contato_id": "id do contato correspondente ou null",
      "tags": ["tag1", "tag2"],
      "prioridade": "baixa" | "media" | "alta" | "urgente",
      "status": "novo" | "em_andamento" | "bloqueado" | "concluido",
      "proximo_passo": "Ação clara e imediata a ser tomada"
    }
  ],
  "resumo": {
    "feito": "Tópicos com o que já foi concluído ou conversado",
    "a_fazer": "Tópicos de demandas e tarefas pendentes",
    "prioridades": "As 2 ou 3 maiores prioridades imediatas",
    "decisoes": "Decisões firmadas nas conversas e registros",
    "proximos_passos": "Próximos passos globais"
  },
  "atualizacoes_contexto": [
    {
      "tipo": "projeto" | "contato",
      "id": "id_da_entidade",
      "novo_contexto": "Atualização concisa para o campo contexto_resumido"
    }
  ]
}`

      const aiRes = $ai.chat({
        model: 'fast',
        messages: [
          {
            role: 'system',
            content: 'Você é um assistente de produtividade executiva que extrai JSON válido.',
          },
          { role: 'user', content: prompt },
        ],
      })

      let rawOutput = aiRes.choices[0].message.content.trim()
      if (rawOutput.startsWith('```json')) {
        rawOutput = rawOutput.slice(7)
      }
      if (rawOutput.startsWith('```')) {
        rawOutput = rawOutput.slice(3)
      }
      if (rawOutput.endsWith('```')) {
        rawOutput = rawOutput.slice(0, -3)
      }
      rawOutput = rawOutput.trim()

      const parsed = JSON.parse(rawOutput)

      return e.json(200, {
        sucesso: true,
        data: dataAlvo,
        total_processados: folhaPendentes.length,
        cards: parsed.cards || [],
        resumo: parsed.resumo || null,
        atualizacoes_contexto: parsed.atualizacoes_contexto || [],
      })
    } catch (err) {
      return e.json(500, { error: err.message || 'Erro ao organizar folha com IA' })
    }
  },
  $apis.requireAuth(),
)
