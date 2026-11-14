/// <reference path="../pb_data/types.d.ts" />

/**
 * ARQUIVO NO-OP (intencionalmente vazio de lógica).
 *
 * Motivo: NÃO há provedor de embeddings no ambiente — o gateway de IA do Skip
 * expõe $ai.chat/agentes, mas não vetores consultáveis, e nenhuma secret de
 * embeddings existe. A busca "semântica" segue a arquitetura de DUAS ETAPAS
 * já em produção (hook busca_semantica_memoria.js):
 *
 *   1) seleção barata de CANDIDATOS (busca textual + recência, sempre paginada)
 *   2) correspondência POR SIGNIFICADO feita pelo agente nativo
 *      (diamantina-analista-memoria) sobre os candidatos
 *
 * O cron/fila de embeddings planejado foi REMOVIDO: sem provedor, geraria
 * vetores que nada consultaria. Se um provedor de embeddings for ligado no
 * ambiente (nova secret + suporte no gateway), este arquivo é o ponto de
 * reimplantação: gerar vetores por dossiê/episódio/fato e trocar a etapa 1
 * por similaridade vetorial — o contrato da rota de busca não muda.
 *
 * Nenhuma rota nem cron deve ser registrada AQUI: rotas de episódios ficam em
 * episodios_memoria.js; de memória compartilhada, em memoria_compartilhada.js.
 */
