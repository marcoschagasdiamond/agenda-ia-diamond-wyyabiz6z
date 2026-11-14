/// <reference path="../pb_data/types.d.ts" />

/**
 * EMBEDDINGS DE MEMÓRIA — OpenAI text-embedding-3-small via ponte de conectores.
 *
 * ESTADO ATUAL: MODO DIAGNÓSTICO. O toolkit "openai" em modo DONO
 * (owner_toolkits) ainda não pôde ser habilitado porque a conta OpenAI do dono
 * NÃO está conectada em Conectores (enable_app_connectors recusou). Enquanto a
 * conexão não existir, este arquivo registra APENAS a rota de diagnóstico
 * abaixo — sem fila, sem cron, sem migração de vetor. A busca semântica segue
 * na arquitetura de DUAS ETAPAS (busca_semantica_memoria.js), sem alteração.
 *
 * Rota de diagnóstico (somente SUPERUSUÁRIO):
 *   POST /backend/v1/diag/embeddings-openai
 * Chama $connectors.executeAsOwner("OPENAI_CREATE_EMBEDDINGS", …) com um texto
 * de exemplo e devolve: successful, dimensões do vetor, modelo, primeiros
 * valores e — em caso de falha — o erro do provedor (rota só de superusuário,
 * que é o dono da conta; nunca exposta a usuários do app).
 *
 * Quando o dono conectar o OpenAI em Conectores, chamar esta rota PROVA a
 * ponte; só depois disso a fila/backfill/cache (passos 2–4 do plano) são
 * implementados neste mesmo arquivo e a migração de vetores é aplicada.
 *
 * IMPORTANTE (JSVM do PocketBase): callbacks de routerAdd NÃO veem declarações
 * de topo de arquivo — toda a lógica vive INLINE dentro do callback.
 */

routerAdd(
  'POST',
  '/backend/v1/diag/embeddings-openai',
  (e) => {
    try {
      // —— helpers inline (JSVM) ——
      const textoExemplo =
        'Reunião com o cliente Verdemar: decidiu-se manter o ticket premium e adiar o desconto para o próximo trimestre.'

      // Chamada pela ponte de conectores em MODO DONO — nunca $http, nunca
      // chave de API em secret, nunca OAuth escrito à mão.
      const r = $connectors.executeAsOwner('OPENAI_CREATE_EMBEDDINGS', {
        model: 'text-embedding-3-small',
        input: textoExemplo,
        encoding_format: 'float',
      })

      if (!r || !r.successful) {
        // Somente superusuário chega aqui — o erro do provedor é do próprio dono.
        return e.json(502, {
          ok: false,
          etapa: 'executeAsOwner',
          toolkit: 'openai',
          tool: 'OPENAI_CREATE_EMBEDDINGS',
          erro: r && r.error ? String(r.error).slice(0, 500) : 'resposta malformada da ponte',
          dica: 'Verifique se o OpenAI está conectado em Conectores (conta do dono) e se o toolkit openai está habilitado para o app.',
        })
      }

      // Composio documenta { data: [{ object, embedding, index }], model, usage }
      // — o formato real pode divergir: se o esperado faltar, devolvemos as
      // chaves recebidas para diagnóstico (nunca vazio silencioso).
      const dados = r.data
      const lista = dados && Array.isArray(dados.data) ? dados.data : null
      const vetor =
        lista && lista[0] && Array.isArray(lista[0].embedding) ? lista[0].embedding : null

      if (!vetor) {
        return e.json(200, {
          ok: false,
          etapa: 'parse',
          toolkit: 'openai',
          tool: 'OPENAI_CREATE_EMBEDDINGS',
          chaves_recebidas: dados && typeof dados === 'object' ? Object.keys(dados) : [],
          detalhe: typeof dados === 'string' ? dados.slice(0, 300) : '',
        })
      }

      return e.json(200, {
        ok: true,
        toolkit: 'openai',
        tool: 'OPENAI_CREATE_EMBEDDINGS',
        modelo: dados && dados.model ? String(dados.model) : 'text-embedding-3-small',
        dimensoes: vetor.length,
        primeiros_valores: vetor.slice(0, 5),
        usage: dados && dados.usage ? dados.usage : null,
        texto_exemplo: textoExemplo,
      })
    } catch (err) {
      return e.json(500, {
        ok: false,
        etapa: 'excecao',
        erro: String((err && err.message) || err).slice(0, 500),
      })
    }
  },
  $apis.requireSuperuserAuth(),
)
