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
      const agoraReferencia = new Date().toISOString()

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
          const num = f.getInt('ordem') || i + 1
          const dataHora = f.getString('data_hora') || f.getString('data') || ''
          const proj = f.getString('projeto') ? `[ProjetoID: ${f.getString('projeto')}]` : ''
          const cont = f.getString('contato') ? `[ContatoID: ${f.getString('contato')}]` : ''
          const flx = f.getString('fluxo') ? `[Fluxo: ${f.getString('fluxo')}]` : ''
          const time = f.getString('timeline') ? `[Timeline: ${f.getString('timeline')}]` : ''
          const isReuniao = f.getBool('is_reuniao') ? '[REUNIÃO GRAVADA]' : ''
          const orig = f.getString('tipo_origem') ? `[Origem: ${f.getString('tipo_origem')}]` : ''
          const dh = dataHora ? `[Data e Hora: ${dataHora}]` : ''
          return `Assunto ${num}. [ID: ${f.id}] ${isReuniao} ${dh} ${orig} ${proj} ${cont} ${flx} ${time}\nConteúdo: ${f.getString('registro')}`
        })
        .join('\n\n')

      const prompt = `Você é o organizador de tarefas e Segundo Cérebro do sistema 'Agenda IA Diamond'.
Analise os registros livres da folha de trabalho do usuário e converta-os em cards acionáveis para o Kanban, além de estruturar o Resumo Executivo do Dia.

Hoje é: ${agoraReferencia} (data da sessão: ${dataAlvo}).

RESOLUÇÃO DE DATAS E HORÁRIOS (pt-BR):
- Nos registros DIGITADOS (origem manual/whatsapp, sem [REUNIÃO GRAVADA]), procure menções a compromissos futuros com data e/ou horário citados no próprio texto.
  Exemplos: "reunião com o Fulano quinta às 10h", "ligar para o Beltrano amanhã 15h", "almoço com cliente sexta 12h30", "visita dia 20/11 às 9h".
- Resolva datas relativas contra a data da sessão (${dataAlvo}): "hoje", "amanhã", "depois de amanhã", "quinta", "sexta-feira que vem", "próxima segunda", "dia 20/11".
- Resolva horários em pt-BR: "10h", "10h30", "15:00", "às 9 horas da manhã".
- Se o texto citar somente hora sem dia (ex.: "reunião às 10h"), use a data da sessão; se a hora já tiver passado hoje, considere o dia seguinte.
- Retorne cada compromisso em "eventos" com data_inicio e data_fim no formato "YYYY-MM-DDTHH:mm:00" (sem fuso, horário local). Assuma duração de 1 hora quando não falado o fim.
- Campo "e_reuniao": true quando o compromisso parecer reunião, encontro, call, almoço de negócio ou visita — nesses casos o sistema cria sala de reunião (Jitsi) automaticamente.
- NÃO invente compromissos: só inclua o que realmente cita data e/ou horário de realização. Tarefa com prazo ("entregar até sexta") também conta, como categoria "prazo".

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
  ],
  "eventos": [
    {
      "folha_id": "id do registro de origem ou null",
      "titulo": "Título curto do compromisso (ex.: Reunião com Fulano)",
      "descricao": "Contexto citado no assunto ou string vazia",
      "data_inicio": "YYYY-MM-DDTHH:mm:00",
      "data_fim": "YYYY-MM-DDTHH:mm:00",
      "categoria": "reuniao" | "prazo" | "etapa" | "atividade" | "alinhamento" | "outro",
      "e_reuniao": true | false,
      "projeto_id": "id do projeto correspondente ou null",
      "contato_id": "id do contato correspondente ou null",
      "prioridade": "baixa" | "media" | "alta" | "urgente"
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

      // Sanitiza eventos propostos: exige título e data_inicio válidos
      const eventosBrutos = Array.isArray(parsed.eventos) ? parsed.eventos : []
      const eventosSanitizados = eventosBrutos
        .map((ev) => {
          const titulo = String(ev.titulo || '').trim()
          const inicio = String(ev.data_inicio || '').trim()
          if (!titulo || !inicio) return null
          const inicioData = new Date(inicio)
          if (isNaN(inicioData.getTime())) return null
          let fim = String(ev.data_fim || '').trim()
          if (fim) {
            const fimData = new Date(fim)
            if (isNaN(fimData.getTime()) || fimData <= inicioData) fim = ''
          }
          const categoriasValidas = [
            'reuniao',
            'prazo',
            'etapa',
            'atividade',
            'alinhamento',
            'outro',
          ]
          const categoria = categoriasValidas.includes(ev.categoria)
            ? ev.categoria
            : ev.e_reuniao
              ? 'reuniao'
              : 'outro'
          const prioridadesValidas = ['baixa', 'media', 'alta', 'urgente']
          const prioridade = prioridadesValidas.includes(ev.prioridade) ? ev.prioridade : 'media'
          return {
            folha_id: ev.folha_id || null,
            titulo: titulo,
            descricao: String(ev.descricao || '').trim(),
            data_inicio: inicio,
            data_fim: fim || null,
            categoria: categoria,
            e_reuniao: Boolean(ev.e_reuniao),
            projeto_id: ev.projeto_id || null,
            contato_id: ev.contato_id || null,
            prioridade: prioridade,
          }
        })
        .filter(Boolean)

      return e.json(200, {
        sucesso: true,
        data: dataAlvo,
        total_processados: folhaPendentes.length,
        cards: parsed.cards || [],
        resumo: parsed.resumo || null,
        atualizacoes_contexto: parsed.atualizacoes_contexto || [],
        eventos: eventosSanitizados,
      })
    } catch (err) {
      return e.json(500, { error: err.message || 'Erro ao organizar folha com IA' })
    }
  },
  $apis.requireAuth(),
)
