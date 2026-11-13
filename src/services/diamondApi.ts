import pb from '@/lib/pocketbase/client'
import type {
  Projeto,
  Negocio,
  Contato,
  FolhaDia,
  AtaOrganizadaReuniao,
  StatusTranscricao,
  Card,
  CardArquivo,
  CardPastaDrive,
  PastaDriveArquivos,
  Demanda,
  Lista,
  Pasta,
  Arquivo,
  ResumoDia,
  Cliente,
  ClienteProjeto,
  Profile,
  ColunaFluxo,
  CategoriaFluxo,
  FluxoKanban,
  GrupoFamilia,
  MarcoTimeline,
  EventoCalendario,
  MembroEquipe,
  ConviteEquipe,
  EscopoItem,
  ProjetoFase,
  ProjetoEquipeMembro,
  ProjetoInvestidor,
  ProjetoFinanceiroLancamento,
  TagSistema,
  PastaFormulario,
  FormCampoConfig,
  Formulario,
  FormularioResposta,
  ConfiguracaoLembretes,
  NotificacaoSistema,
} from '@/types'

export const diamondApi = {
  // Profiles
  async getProfile(userId: string): Promise<Profile | null> {
    try {
      return await pb.collection('profiles').getFirstListItem<Profile>(`user = "${userId}"`)
    } catch {
      return null
    }
  },

  async saveOnboarding(
    userId: string,
    data: {
      quem_e_voce: string
      o_que_faz: string
      quais_projetos: string
      quais_objetivos: string
      posicionamento?: string
      precos?: string
    },
  ): Promise<Profile> {
    const existing = await this.getProfile(userId)
    const payload = {
      user: userId,
      respostas_onboarding: {
        quem_e_voce: data.quem_e_voce,
        o_que_faz: data.o_que_faz,
        quais_projetos: data.quais_projetos,
        quais_objetivos: data.quais_objetivos,
      },
      posicionamento: data.posicionamento || '',
      precos: data.precos || '',
      objetivos: data.quais_objetivos || '',
    }
    if (existing) {
      return await pb.collection('profiles').update<Profile>(existing.id, payload)
    }
    return await pb.collection('profiles').create<Profile>(payload)
  },

  // Projetos
  async listProjetos(): Promise<Projeto[]> {
    return await pb.collection('projetos').getFullList<Projeto>({
      sort: '-created',
      expand: 'pasta_raiz,cliente,responsavel',
    })
  },

  async getProjeto(id: string): Promise<Projeto> {
    return await pb.collection('projetos').getOne<Projeto>(id, {
      expand: 'pasta_raiz,cliente,responsavel',
    })
  },

  async createProjeto(data: Partial<Projeto>): Promise<Projeto> {
    return await pb.collection('projetos').create<Projeto>(data)
  },

  async updateProjeto(id: string, data: Partial<Projeto>): Promise<Projeto> {
    return await pb.collection('projetos').update<Projeto>(id, data)
  },

  async deleteProjeto(id: string): Promise<boolean> {
    return await pb.collection('projetos').delete(id)
  },

  // Projeto Fases
  async listProjetoFases(projetoId?: string): Promise<ProjetoFase[]> {
    try {
      const filter = projetoId ? `projeto = "${projetoId}"` : ''
      return await pb.collection('projeto_fases').getFullList<ProjetoFase>({
        filter,
        sort: 'ordem,created',
        expand: 'projeto',
      })
    } catch {
      return []
    }
  },

  async createProjetoFase(data: Partial<ProjetoFase>): Promise<ProjetoFase> {
    return await pb.collection('projeto_fases').create<ProjetoFase>(data)
  },

  async updateProjetoFase(id: string, data: Partial<ProjetoFase>): Promise<ProjetoFase> {
    return await pb.collection('projeto_fases').update<ProjetoFase>(id, data)
  },

  async deleteProjetoFase(id: string): Promise<boolean> {
    return await pb.collection('projeto_fases').delete(id)
  },

  // Projeto Equipe
  async listProjetoEquipe(projetoId?: string): Promise<ProjetoEquipeMembro[]> {
    try {
      const filter = projetoId ? `projeto = "${projetoId}"` : ''
      return await pb.collection('projeto_equipe').getFullList<ProjetoEquipeMembro>({
        filter,
        sort: 'created',
        expand: 'projeto,usuario',
      })
    } catch {
      return []
    }
  },

  async createProjetoEquipeMembro(
    data: Partial<ProjetoEquipeMembro>,
  ): Promise<ProjetoEquipeMembro> {
    return await pb.collection('projeto_equipe').create<ProjetoEquipeMembro>(data)
  },

  async updateProjetoEquipeMembro(
    id: string,
    data: Partial<ProjetoEquipeMembro>,
  ): Promise<ProjetoEquipeMembro> {
    return await pb.collection('projeto_equipe').update<ProjetoEquipeMembro>(id, data)
  },

  async deleteProjetoEquipeMembro(id: string): Promise<boolean> {
    return await pb.collection('projeto_equipe').delete(id)
  },

  // Projeto Investidores
  async listProjetoInvestidores(projetoId?: string): Promise<ProjetoInvestidor[]> {
    try {
      const filter = projetoId ? `projeto = "${projetoId}"` : ''
      return await pb.collection('projeto_investidores').getFullList<ProjetoInvestidor>({
        filter,
        sort: '-data_aporte,created',
        expand: 'projeto',
      })
    } catch {
      return []
    }
  },

  async createProjetoInvestidor(data: Partial<ProjetoInvestidor>): Promise<ProjetoInvestidor> {
    return await pb.collection('projeto_investidores').create<ProjetoInvestidor>(data)
  },

  async updateProjetoInvestidor(
    id: string,
    data: Partial<ProjetoInvestidor>,
  ): Promise<ProjetoInvestidor> {
    return await pb.collection('projeto_investidores').update<ProjetoInvestidor>(id, data)
  },

  async deleteProjetoInvestidor(id: string): Promise<boolean> {
    return await pb.collection('projeto_investidores').delete(id)
  },

  // Projeto Financeiro
  async listProjetoFinanceiro(projetoId?: string): Promise<ProjetoFinanceiroLancamento[]> {
    try {
      const filter = projetoId ? `projeto = "${projetoId}"` : ''
      return await pb.collection('projeto_financeiro').getFullList<ProjetoFinanceiroLancamento>({
        filter,
        sort: '-data,created',
        expand: 'projeto,fase',
      })
    } catch {
      return []
    }
  },

  async createProjetoFinanceiro(
    data: Partial<ProjetoFinanceiroLancamento>,
  ): Promise<ProjetoFinanceiroLancamento> {
    return await pb.collection('projeto_financeiro').create<ProjetoFinanceiroLancamento>(data)
  },

  async updateProjetoFinanceiro(
    id: string,
    data: Partial<ProjetoFinanceiroLancamento>,
  ): Promise<ProjetoFinanceiroLancamento> {
    return await pb.collection('projeto_financeiro').update<ProjetoFinanceiroLancamento>(id, data)
  },

  async deleteProjetoFinanceiro(id: string): Promise<boolean> {
    return await pb.collection('projeto_financeiro').delete(id)
  },

  // Negócios
  async listNegocios(): Promise<Negocio[]> {
    return await pb.collection('negocios').getFullList<Negocio>({
      sort: 'nome',
    })
  },

  async createNegocio(data: Partial<Negocio>): Promise<Negocio> {
    return await pb.collection('negocios').create<Negocio>(data)
  },

  // Contatos
  async listContatos(): Promise<Contato[]> {
    return await pb.collection('contatos').getFullList<Contato>({
      sort: 'nome',
      expand: 'projetos,negocios',
    })
  },

  /**
   * Busca lista enxuta de contatos para deduplicação em memória (campos nome, telefone, email).
   * Itera em lotes paginados com tolerância a limites.
   */
  async listContatosParaDeduplicacao(): Promise<
    { id: string; nome: string; telefone?: string; email?: string }[]
  > {
    const todos: { id: string; nome: string; telefone?: string; email?: string }[] = []
    let page = 1
    const perPage = 500

    while (true) {
      const res = await pb
        .collection('contatos')
        .getList<{ id: string; nome: string; telefone?: string; email?: string }>(page, perPage, {
          fields: 'id,nome,telefone,email',
          sort: 'nome',
        })
      todos.push(...res.items)
      if (res.items.length < perPage || page >= res.totalPages) {
        break
      }
      page++
    }

    return todos
  },

  async getContato(id: string): Promise<Contato> {
    return await pb.collection('contatos').getOne<Contato>(id, {
      expand: 'projetos,negocios',
    })
  },

  async createContato(data: Partial<Contato>): Promise<Contato> {
    return await pb.collection('contatos').create<Contato>(data)
  },

  async updateContato(id: string, data: Partial<Contato>): Promise<Contato> {
    return await pb.collection('contatos').update<Contato>(id, data)
  },

  async deleteContato(id: string): Promise<boolean> {
    return await pb.collection('contatos').delete(id)
  },

  // Folha do Dia
  async listFolhaDia(data?: string, filtroExtra?: string): Promise<FolhaDia[]> {
    const filters: string[] = []
    if (data) {
      filters.push(`data = "${data}"`)
    }
    if (filtroExtra) {
      filters.push(filtroExtra)
    }
    return await pb.collection('folha_dia').getFullList<FolhaDia>({
      filter: filters.join(' && '),
      sort: '-fixado,ordem,created',
      expand: 'projeto,negocio,contato,tese_semente',
    })
  },

  async listFolhaDiaPaginado(params: {
    page?: number
    perPage?: number
    filter?: string
    sort?: string
  }) {
    const page = params.page || 1
    const perPage = params.perPage || 30
    return await pb.collection('folha_dia').getList<FolhaDia>(page, perPage, {
      filter: params.filter || '',
      sort: params.sort || '-fixado,-created',
      expand: 'projeto,negocio,contato,tese_semente',
    })
  },

  async arquivarFolhaDia(id: string, arquivado = true): Promise<FolhaDia> {
    return await pb.collection('folha_dia').update<FolhaDia>(id, { arquivado })
  },

  async fixarFolhaDia(id: string, fixado = true): Promise<FolhaDia> {
    return await pb.collection('folha_dia').update<FolhaDia>(id, { fixado })
  },

  async arquivarComoSemente(
    id: string,
    dados: {
      condicao_reativacao?: string
      data_revisao_semente?: string
      observacao?: string
      tese_semente?: string
      /** Parceiro da semente (texto livre, sugestão de contatos existentes). */
      semente_parceiro?: string
      /** Negócio da semente (texto livre ou negócio/projeto existente). */
      semente_negocio?: string
    },
  ): Promise<FolhaDia> {
    const itemAtual = await pb.collection('folha_dia').getOne<FolhaDia>(id)
    let registroAtualizado = itemAtual.registro || ''
    if (dados.observacao && dados.observacao.trim()) {
      registroAtualizado = `${registroAtualizado}\n\n[Observação da Semente]: ${dados.observacao.trim()}`
    }

    const payload: Record<string, unknown> = {
      estado_semente: true,
      arquivado: true,
      condicao_reativacao: dados.condicao_reativacao || '',
      data_revisao_semente: dados.data_revisao_semente || '',
      registro: registroAtualizado,
    }
    if (dados.tese_semente !== undefined) {
      payload.tese_semente = dados.tese_semente || ''
    }
    if (dados.semente_parceiro !== undefined) {
      payload.semente_parceiro = dados.semente_parceiro.trim()
    }
    if (dados.semente_negocio !== undefined) {
      payload.semente_negocio = dados.semente_negocio.trim()
    }

    return await pb.collection('folha_dia').update<FolhaDia>(id, payload, {
      expand: 'projeto,negocio,contato,tese_semente',
    })
  },

  async atribuirTeseSemente(id: string, teseId: string): Promise<FolhaDia> {
    return await pb
      .collection('folha_dia')
      .update<FolhaDia>(
        id,
        { tese_semente: teseId || '' },
        { expand: 'projeto,negocio,contato,tese_semente' },
      )
  },

  async reativarSemente(id: string): Promise<FolhaDia> {
    const agoraData = new Date().toISOString().slice(0, 10)
    return await pb.collection('folha_dia').update<FolhaDia>(
      id,
      {
        estado_semente: false,
        arquivado: false,
        reativada_em: agoraData,
      },
      { expand: 'projeto,negocio,contato,tese_semente' },
    )
  },

  async listSementes(): Promise<FolhaDia[]> {
    return await pb.collection('folha_dia').getFullList<FolhaDia>({
      filter: 'estado_semente = true',
      sort: '-created',
      expand: 'projeto,negocio,contato,tese_semente',
    })
  },

  async listSementesRevisaoMes(ano?: number, mes?: number): Promise<FolhaDia[]> {
    const now = new Date()
    const targetAno = ano ?? now.getFullYear()
    const targetMes = mes ?? now.getMonth() + 1
    const mesStr = String(targetMes).padStart(2, '0')
    const prefix = `${targetAno}-${mesStr}`

    try {
      return await pb.collection('folha_dia').getFullList<FolhaDia>({
        filter: `estado_semente = true && data_revisao_semente ~ '${prefix}'`,
        sort: 'data_revisao_semente',
        expand: 'projeto,negocio,contato,tese_semente',
      })
    } catch {
      // Fallback em memória caso a query com operador ~ encontre alguma restrição
      try {
        const todas = await pb.collection('folha_dia').getFullList<FolhaDia>({
          filter: 'estado_semente = true',
          sort: 'data_revisao_semente',
          expand: 'projeto,negocio,contato,tese_semente',
        })
        return todas.filter(
          (s) => s.data_revisao_semente && s.data_revisao_semente.startsWith(prefix),
        )
      } catch (err) {
        console.warn('Erro ao listar sementes com revisão no mês:', err)
        return []
      }
    }
  },

  // Teses de Mercado para o Cofre de Sementes
  async listTesesSementes(): Promise<any[]> {
    try {
      return await pb.collection('teses_sementes').getFullList({
        sort: 'ordem,nome',
      })
    } catch (err) {
      console.warn('Erro ao listar teses_sementes:', err)
      return []
    }
  },

  async createTeseSemente(dados: {
    nome: string
    descricao?: string
    cor?: string
    ordem?: number
  }): Promise<any> {
    return await pb.collection('teses_sementes').create(dados)
  },

  async updateTeseSemente(
    id: string,
    dados: Partial<{
      nome: string
      descricao?: string
      cor?: string
      ordem?: number
    }>,
  ): Promise<any> {
    return await pb.collection('teses_sementes').update(id, dados)
  },

  async deleteTeseSemente(id: string): Promise<boolean> {
    return await pb.collection('teses_sementes').delete(id)
  },

  async loteArquivarFolhaDia(ids: string[], arquivado = true): Promise<number> {
    let alterados = 0
    for (const id of ids) {
      try {
        await pb.collection('folha_dia').update(id, { arquivado })
        alterados++
      } catch (err) {
        console.error(`Erro ao alterar arquivado folha ${id}:`, err)
      }
    }
    return alterados
  },

  async loteExcluirFolhaDia(ids: string[]): Promise<number> {
    let excluidos = 0
    for (const id of ids) {
      try {
        await pb.collection('folha_dia').delete(id)
        excluidos++
      } catch (err) {
        console.error(`Erro ao excluir folha ${id}:`, err)
      }
    }
    return excluidos
  },

  async loteReligarFluxoFolhaDia(ids: string[], novoFluxo: string): Promise<number> {
    let alterados = 0
    for (const id of ids) {
      try {
        await pb.collection('folha_dia').update(id, { fluxo: novoFluxo })
        alterados++
      } catch (err) {
        console.error(`Erro ao religar fluxo folha ${id}:`, err)
      }
    }
    return alterados
  },

  async createFolhaDia(data: Partial<FolhaDia> | FormData): Promise<FolhaDia> {
    return await pb.collection('folha_dia').create<FolhaDia>(data)
  },

  async updateFolhaDia(id: string, data: Partial<FolhaDia> | FormData): Promise<FolhaDia> {
    return await pb.collection('folha_dia').update<FolhaDia>(id, data)
  },

  getAudioUrl(record: { id: string; audio_gravacao?: string }): string | null {
    if (!record.audio_gravacao) return null
    return pb.files.getURL(record as any, record.audio_gravacao)
  },

  async transcreverEExtrairReuniao(dados: {
    audio_base64?: string
    mime_type?: string
    nome_arquivo?: string
    texto_transcrito?: string
    data_referencia?: string
    fuso_horario?: string
  }): Promise<{
    sucesso: boolean
    transcricao: string
    analise: {
      titulo_sugerido: string
      data_detectada: boolean
      data_texto_original: string | null
      data_inicio: string | null
      data_fim: string | null
      participantes: string[]
      resumo: string
      decisoes: string[]
      proximos_passos: string[]
      link_reuniao_sugerido: string
      sala_jitsi: string
      projeto_id: string | null
      contato_id: string | null
      urgencia: 'baixa' | 'media' | 'alta' | 'urgente'
    }
    codigo?: string
    mensagem?: string
  }> {
    const res = await fetch(
      `${import.meta.env.VITE_POCKETBASE_URL}/backend/v1/transcrever-reuniao`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: pb.authStore.token,
        },
        body: JSON.stringify(dados),
      },
    )
    const json = await res.json().catch(() => ({}))
    if (!res.ok) {
      const err = new Error(json.mensagem || 'Falha ao processar reunião com OpenAI')
      ;(err as any).codigo = json.codigo
      throw err
    }
    return json
  },

  async organizarReuniao(dados: {
    folha_id?: string
    titulo?: string
    texto_transcricao?: string
    projeto_id?: string
    contato_id?: string
    negocio_id?: string
  }): Promise<{ sucesso: boolean; folha_id: string | null; ata: AtaOrganizadaReuniao }> {
    const res = await fetch(`${import.meta.env.VITE_POCKETBASE_URL}/backend/v1/organizar-reuniao`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: pb.authStore.token,
      },
      body: JSON.stringify(dados),
    })
    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      throw new Error(err.error || 'Falha ao organizar reunião com IA')
    }
    return await res.json()
  },

  async deleteFolhaDia(id: string): Promise<boolean> {
    return await pb.collection('folha_dia').delete(id)
  },

  // Cards (Kanban)
  async listCards(filtroExtra?: string): Promise<Card[]> {
    return await pb.collection('cards').getFullList<Card>({
      filter: filtroExtra || '',
      sort: '-updated',
      expand: 'projeto,negocio,contato,responsavel,grupo_familia,fluxo_id,card_pai',
    })
  },

  async getCard(id: string): Promise<Card> {
    return await pb.collection('cards').getOne<Card>(id, {
      expand: 'projeto,negocio,contato,responsavel,grupo_familia,fluxo_id,card_pai',
    })
  },

  async createCard(data: Partial<Card>): Promise<Card> {
    return await pb.collection('cards').create<Card>(data)
  },

  async updateCard(id: string, data: Partial<Card>): Promise<Card> {
    return await pb.collection('cards').update<Card>(id, data)
  },

  async deleteCard(id: string): Promise<boolean> {
    return await pb.collection('cards').delete(id)
  },

  // Cards - Arquivos Vinculados
  async listCardArquivos(cardId: string): Promise<CardArquivo[]> {
    try {
      return await pb.collection('card_arquivos').getFullList<CardArquivo>({
        filter: `card = "${cardId}"`,
        sort: '-created',
        expand: 'criado_por',
      })
    } catch {
      return []
    }
  },

  async uploadCardArquivo(formData: FormData): Promise<CardArquivo> {
    return await pb.collection('card_arquivos').create<CardArquivo>(formData)
  },

  async deleteCardArquivo(id: string): Promise<boolean> {
    return await pb.collection('card_arquivos').delete(id)
  },

  getCardArquivoUrl(record: { id: string; arquivo: string }): string {
    return pb.files.getURL(record as any, record.arquivo)
  },

  // Google Drive — cria um anexo de card do tipo vínculo (sem upload local)
  async vincularCardArquivoDrive(dados: {
    card: string
    nome: string
    drive_file_id: string
    drive_url: string
    criado_por?: string
  }): Promise<CardArquivo> {
    return await pb.collection('card_arquivos').create<CardArquivo>({
      card: dados.card,
      nome: dados.nome,
      tipo_origem: 'drive',
      drive_file_id: dados.drive_file_id,
      drive_url: dados.drive_url,
      ...(dados.criado_por ? { criado_por: dados.criado_por } : {}),
    } as any)
  },

  // Cards - Pastas do Google Drive vinculadas (vínculo, sem upload local)
  async listCardPastasDrive(cardId: string): Promise<CardPastaDrive[]> {
    try {
      return await pb.collection('card_pastas_drive').getFullList<CardPastaDrive>({
        filter: `card = "${cardId}"`,
        sort: '-created',
        expand: 'criado_por',
      })
    } catch {
      return []
    }
  },

  async vincularCardPastaDrive(dados: {
    card: string
    nome: string
    drive_file_id: string
    drive_url: string
    criado_por?: string
  }): Promise<CardPastaDrive> {
    return await pb.collection('card_pastas_drive').create<CardPastaDrive>({
      card: dados.card,
      nome: dados.nome,
      drive_file_id: dados.drive_file_id,
      drive_url: dados.drive_url,
      ...(dados.criado_por ? { criado_por: dados.criado_por } : {}),
    } as any)
  },

  async deleteCardPastaDrive(id: string): Promise<boolean> {
    return await pb.collection('card_pastas_drive').delete(id)
  },

  /** Renomeia o apelido do vínculo de uma pasta do Drive do card. */
  async renomearCardPastaDrive(id: string, nome: string): Promise<CardPastaDrive> {
    return await pb.collection('card_pastas_drive').update<CardPastaDrive>(id, { nome })
  },

  /** Move um vínculo de pasta do card para cima/baixo na lista (troca de ordem). */
  async moverCardPastaDrive(id: string, ordem: number): Promise<CardPastaDrive> {
    return await pb.collection('card_pastas_drive').update<CardPastaDrive>(id, { ordem })
  },

  // Área /arquivos — Pastas do Google Drive (coleção arquivos_pastas_drive,
  // vínculo avulso sem card obrigatório)
  async listPastasDriveArquivos(): Promise<PastaDriveArquivos[]> {
    try {
      return await pb.collection('arquivos_pastas_drive').getFullList<PastaDriveArquivos>({
        sort: '-created',
        expand: 'criado_por',
      })
    } catch {
      return []
    }
  },

  async vincularPastaDriveArquivos(dados: {
    nome: string
    drive_file_id: string
    drive_url: string
    criado_por?: string
  }): Promise<PastaDriveArquivos> {
    return await pb.collection('arquivos_pastas_drive').create<PastaDriveArquivos>({
      nome: dados.nome,
      drive_file_id: dados.drive_file_id,
      drive_url: dados.drive_url,
      ...(dados.criado_por ? { criado_por: dados.criado_por } : {}),
    } as any)
  },

  async deletePastaDriveArquivos(id: string): Promise<boolean> {
    return await pb.collection('arquivos_pastas_drive').delete(id)
  },

  // Cards - Hierarquia Pais e Filhos
  async listCardsFilhos(cardPaiId: string): Promise<Card[]> {
    try {
      return await pb.collection('cards').getFullList<Card>({
        filter: `card_pai = "${cardPaiId}"`,
        sort: 'created',
        expand: 'responsavel,fluxo_id',
      })
    } catch {
      return []
    }
  },

  // Demandas
  async listDemandas(filtroExtra?: string): Promise<Demanda[]> {
    return await pb.collection('demandas').getFullList<Demanda>({
      filter: filtroExtra || '',
      sort: '-created',
      expand: 'card_origem,atribuido_a,projeto,contato',
    })
  },

  async createDemanda(data: Partial<Demanda>): Promise<Demanda> {
    return await pb.collection('demandas').create<Demanda>(data)
  },

  async updateDemanda(id: string, data: Partial<Demanda>): Promise<Demanda> {
    return await pb.collection('demandas').update<Demanda>(id, data)
  },

  async deleteDemanda(id: string): Promise<boolean> {
    return await pb.collection('demandas').delete(id)
  },

  // Listas
  async listListas(): Promise<Lista[]> {
    return await pb.collection('listas').getFullList<Lista>({
      sort: 'nome',
      expand: 'itens_contatos,itens_demandas',
    })
  },

  async createLista(data: Partial<Lista>): Promise<Lista> {
    return await pb.collection('listas').create<Lista>(data)
  },

  async updateLista(id: string, data: Partial<Lista>): Promise<Lista> {
    return await pb.collection('listas').update<Lista>(id, data)
  },

  async deleteLista(id: string): Promise<boolean> {
    return await pb.collection('listas').delete(id)
  },

  // Pastas e Arquivos
  async listPastas(): Promise<Pasta[]> {
    return await pb.collection('pastas').getFullList<Pasta>({
      sort: 'nome',
    })
  },

  async createPasta(data: Partial<Pasta>): Promise<Pasta> {
    return await pb.collection('pastas').create<Pasta>(data)
  },

  async listArquivos(pastaId?: string, projetoId?: string): Promise<Arquivo[]> {
    const filters: string[] = []
    if (pastaId) filters.push(`pasta = "${pastaId}"`)
    if (projetoId) filters.push(`projeto = "${projetoId}"`)

    return await pb.collection('arquivos').getFullList<Arquivo>({
      filter: filters.join(' && '),
      sort: '-created',
      expand: 'pasta,projeto',
    })
  },

  async uploadArquivo(formData: FormData): Promise<Arquivo> {
    return await pb.collection('arquivos').create<Arquivo>(formData)
  },

  async deleteArquivo(id: string): Promise<boolean> {
    return await pb.collection('arquivos').delete(id)
  },

  // Google Drive — cria/atualiza um registro de vínculo (arquivo do Drive, sem upload local)
  async vincularArquivoDrive(dados: {
    nome: string
    drive_file_id: string
    drive_url: string
    pasta?: string
    projeto?: string
  }): Promise<Arquivo> {
    return await pb.collection('arquivos').create<Arquivo>({
      nome: dados.nome,
      tipo_origem: 'drive',
      drive_file_id: dados.drive_file_id,
      drive_url: dados.drive_url,
      ...(dados.pasta ? { pasta: dados.pasta } : {}),
      ...(dados.projeto ? { projeto: dados.projeto } : {}),
    } as any)
  },

  // Resumos do Dia
  async listResumos(): Promise<ResumoDia[]> {
    return await pb.collection('resumos_dia').getFullList<ResumoDia>({
      sort: '-data',
    })
  },

  async getLatestResumo(): Promise<ResumoDia | null> {
    try {
      const list = await pb.collection('resumos_dia').getList<ResumoDia>(1, 1, {
        sort: '-data',
      })
      return list.items[0] || null
    } catch {
      return null
    }
  },

  async createResumo(data: Partial<ResumoDia>): Promise<ResumoDia> {
    return await pb.collection('resumos_dia').create<ResumoDia>(data)
  },

  // Clientes e Clientes_Projetos
  async listClientes(): Promise<Cliente[]> {
    return await pb.collection('clientes').getFullList<Cliente>({
      sort: 'nome',
      expand: 'cadastrado_por',
    })
  },

  async createCliente(data: Partial<Cliente>): Promise<Cliente> {
    return await pb.collection('clientes').create<Cliente>(data)
  },

  async updateCliente(id: string, data: Partial<Cliente>): Promise<Cliente> {
    return await pb.collection('clientes').update<Cliente>(id, data)
  },

  async deleteCliente(id: string): Promise<boolean> {
    return await pb.collection('clientes').delete(id)
  },

  async listClienteProjetos(): Promise<ClienteProjeto[]> {
    return await pb.collection('clientes_projetos').getFullList<ClienteProjeto>({
      expand: 'cliente,projeto',
    })
  },

  async setClienteProjetoAcesso(
    clienteId: string,
    projetoId: string,
    ativo: boolean,
  ): Promise<ClienteProjeto> {
    try {
      const existing = await pb
        .collection('clientes_projetos')
        .getFirstListItem<ClienteProjeto>(`cliente = "${clienteId}" && projeto = "${projetoId}"`)
      return await pb.collection('clientes_projetos').update<ClienteProjeto>(existing.id, {
        acesso_ativado: ativo,
      })
    } catch {
      return await pb.collection('clientes_projetos').create<ClienteProjeto>({
        cliente: clienteId,
        projeto: projetoId,
        acesso_ativado: ativo,
      })
    }
  },

  // AI Backend Calls
  async organizarFolha(data?: string) {
    const res = await fetch(`${import.meta.env.VITE_POCKETBASE_URL}/backend/v1/organizar-folha`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: pb.authStore.token,
      },
      body: JSON.stringify({ data }),
    })
    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      throw new Error(err.error || 'Falha ao organizar com IA')
    }
    return await res.json()
  },

  async consolidarSemana() {
    const res = await fetch(`${import.meta.env.VITE_POCKETBASE_URL}/backend/v1/consolidar-semana`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: pb.authStore.token,
      },
    })
    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      throw new Error(err.error || 'Falha ao consolidar semana')
    }
    return await res.json()
  },

  async resumirArquivo(file: File) {
    const formData = new FormData()
    formData.append('arquivo', file)
    const res = await fetch(`${import.meta.env.VITE_POCKETBASE_URL}/backend/v1/arquivos/resumir`, {
      method: 'POST',
      headers: {
        Authorization: pb.authStore.token,
      },
      body: formData,
    })
    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      throw new Error(err.error || 'Falha ao resumir documento')
    }
    return await res.json()
  },

  // Categorias do Fluxo
  async listCategoriasFluxo(): Promise<CategoriaFluxo[]> {
    try {
      return await pb.collection('categorias_fluxo').getFullList<CategoriaFluxo>({
        sort: 'ordem,created',
      })
    } catch {
      return []
    }
  },

  async createCategoriaFluxo(data: Partial<CategoriaFluxo>): Promise<CategoriaFluxo> {
    return await pb.collection('categorias_fluxo').create<CategoriaFluxo>(data)
  },

  async updateCategoriaFluxo(id: string, data: Partial<CategoriaFluxo>): Promise<CategoriaFluxo> {
    return await pb.collection('categorias_fluxo').update<CategoriaFluxo>(id, data)
  },

  async deleteCategoriaFluxo(id: string): Promise<boolean> {
    return await pb.collection('categorias_fluxo').delete(id)
  },

  // Fluxos Kanban (Entidade Fluxo em Categorias)
  async listFluxosKanban(categoriaId?: string, apenasAtivos = false): Promise<FluxoKanban[]> {
    try {
      const filters: string[] = []
      if (categoriaId && categoriaId !== 'all') {
        filters.push(`categoria = "${categoriaId}"`)
      }
      if (apenasAtivos) {
        filters.push('(ativo = true || ativo = null)')
      }
      return await pb.collection('fluxos_kanban').getFullList<FluxoKanban>({
        filter: filters.join(' && '),
        sort: 'ordem,created',
      })
    } catch {
      return []
    }
  },

  async createFluxoKanban(data: Partial<FluxoKanban>): Promise<FluxoKanban> {
    return await pb.collection('fluxos_kanban').create<FluxoKanban>(data)
  },

  async updateFluxoKanban(id: string, data: Partial<FluxoKanban>): Promise<FluxoKanban> {
    return await pb.collection('fluxos_kanban').update<FluxoKanban>(id, data)
  },

  async deleteFluxoKanban(id: string): Promise<boolean> {
    return await pb.collection('fluxos_kanban').delete(id)
  },

  // Colunas/Fases do Fluxo
  async listColunasFluxo(categoriaId?: string): Promise<ColunaFluxo[]> {
    try {
      let filter = ''
      if (categoriaId && categoriaId !== 'all') {
        filter = `categoria = "${categoriaId}"`
      }
      return await pb.collection('colunas_fluxo').getFullList<ColunaFluxo>({
        filter,
        sort: 'ordem,created',
        expand: 'categoria',
      })
    } catch {
      return [
        { id: '1', chave: 'novo', titulo: 'Novo / Triagem', cor: '#5B6470', ordem: 1 },
        { id: '2', chave: 'em_andamento', titulo: 'Em Andamento', cor: '#0F766E', ordem: 2 },
        { id: '3', chave: 'bloqueado', titulo: 'Bloqueado', cor: '#DC2626', ordem: 3 },
        { id: '4', chave: 'concluido', titulo: 'Concluído', cor: '#16A34A', ordem: 4 },
      ]
    }
  },

  async createColunaFluxo(data: Partial<ColunaFluxo>): Promise<ColunaFluxo> {
    return await pb.collection('colunas_fluxo').create<ColunaFluxo>(data)
  },

  async updateColunaFluxo(id: string, data: Partial<ColunaFluxo>): Promise<ColunaFluxo> {
    return await pb.collection('colunas_fluxo').update<ColunaFluxo>(id, data)
  },

  async deleteColunaFluxo(id: string): Promise<boolean> {
    return await pb.collection('colunas_fluxo').delete(id)
  },

  // Grupos de Família
  async listGruposFamilia(categoriaId?: string, colunaId?: string): Promise<GrupoFamilia[]> {
    try {
      const filters: string[] = []
      if (categoriaId && categoriaId !== 'all') {
        filters.push(`categoria = "${categoriaId}"`)
      }
      if (colunaId && colunaId !== 'all') {
        filters.push(`coluna = "${colunaId}"`)
      }
      return await pb.collection('grupos_familia').getFullList<GrupoFamilia>({
        filter: filters.join(' && '),
        sort: 'ordem,created',
        expand: 'coluna,categoria',
      })
    } catch {
      return []
    }
  },

  async createGrupoFamilia(data: Partial<GrupoFamilia>): Promise<GrupoFamilia> {
    return await pb.collection('grupos_familia').create<GrupoFamilia>(data)
  },

  async updateGrupoFamilia(id: string, data: Partial<GrupoFamilia>): Promise<GrupoFamilia> {
    return await pb.collection('grupos_familia').update<GrupoFamilia>(id, data)
  },

  async deleteGrupoFamilia(id: string): Promise<boolean> {
    return await pb.collection('grupos_familia').delete(id)
  },

  // Marcos da Timeline
  async listMarcosTimeline(projetoId?: string): Promise<MarcoTimeline[]> {
    try {
      let filter = ''
      if (projetoId && projetoId !== 'none') {
        filter = `projeto = "${projetoId}" || projeto = null || projeto = ""`
      }
      return await pb.collection('marcos_timeline').getFullList<MarcoTimeline>({
        filter,
        sort: '-created',
      })
    } catch {
      return []
    }
  },

  async createMarcoTimeline(data: Partial<MarcoTimeline>): Promise<MarcoTimeline> {
    return await pb.collection('marcos_timeline').create<MarcoTimeline>(data)
  },

  async updateMarcoTimeline(id: string, data: Partial<MarcoTimeline>): Promise<MarcoTimeline> {
    return await pb.collection('marcos_timeline').update<MarcoTimeline>(id, data)
  },

  async deleteMarcoTimeline(id: string): Promise<boolean> {
    return await pb.collection('marcos_timeline').delete(id)
  },

  // Eventos do Calendário
  async listEventosCalendario(filtroExtra?: string): Promise<EventoCalendario[]> {
    try {
      return await pb.collection('eventos_calendario').getFullList<EventoCalendario>({
        filter: filtroExtra || '',
        sort: 'data_inicio',
        expand: 'projeto,contato,criado_por',
      })
    } catch {
      return []
    }
  },

  async createEventoCalendario(data: Partial<EventoCalendario>): Promise<EventoCalendario> {
    return await pb.collection('eventos_calendario').create<EventoCalendario>(data)
  },

  async updateEventoCalendario(
    id: string,
    data: Partial<EventoCalendario>,
  ): Promise<EventoCalendario> {
    return await pb.collection('eventos_calendario').update<EventoCalendario>(id, data)
  },

  async deleteEventoCalendario(id: string): Promise<boolean> {
    return await pb.collection('eventos_calendario').delete(id)
  },

  // Equipe & Colaboração
  async listMembrosEquipe(): Promise<MembroEquipe[]> {
    try {
      const records = await pb.collection('membros_equipe').getFullList<MembroEquipe>({
        sort: '-created',
        expand: 'usuario,adicionado_por',
      })
      return records.map((m) => {
        let parsedEscopos: EscopoItem[] = []
        if (typeof m.escopos === 'string') {
          try {
            parsedEscopos = JSON.parse(m.escopos)
          } catch {
            parsedEscopos = []
          }
        } else if (Array.isArray(m.escopos)) {
          parsedEscopos = m.escopos
        }
        return {
          ...m,
          escopos: parsedEscopos,
        }
      })
    } catch {
      return []
    }
  },

  async createMembroEquipe(data: Partial<MembroEquipe>): Promise<MembroEquipe> {
    const payload = {
      ...data,
      escopos: typeof data.escopos === 'object' ? JSON.stringify(data.escopos) : data.escopos,
    }
    return await pb.collection('membros_equipe').create<MembroEquipe>(payload)
  },

  async updateMembroEquipe(id: string, data: Partial<MembroEquipe>): Promise<MembroEquipe> {
    const payload = {
      ...data,
      escopos: typeof data.escopos === 'object' ? JSON.stringify(data.escopos) : data.escopos,
    }
    return await pb.collection('membros_equipe').update<MembroEquipe>(id, payload)
  },

  async deleteMembroEquipe(id: string): Promise<boolean> {
    return await pb.collection('membros_equipe').delete(id)
  },

  async elegerAdmin(id: string): Promise<MembroEquipe> {
    return await pb.collection('membros_equipe').update<MembroEquipe>(id, {
      funcao: 'admin',
      nivel_acesso: 'admin',
      is_master: false,
    })
  },

  async removerAdmin(id: string): Promise<MembroEquipe> {
    return await pb.collection('membros_equipe').update<MembroEquipe>(id, {
      funcao: 'membro',
      nivel_acesso: 'edicao',
      is_master: false,
    })
  },

  async promoverParaAdmin(id: string): Promise<MembroEquipe> {
    return await this.elegerAdmin(id)
  },

  async rebaixarDeAdmin(id: string): Promise<MembroEquipe> {
    return await this.removerAdmin(id)
  },

  // Licença Comercial da Conta & Limites
  async getLicencaConta(): Promise<import('../types').LicencaConta | null> {
    try {
      const records = await pb
        .collection('licencas_conta')
        .getList<import('../types').LicencaConta>(1, 1, {
          sort: 'created',
        })
      if (records.items && records.items.length > 0) {
        return records.items[0]
      }
      return null
    } catch {
      return null
    }
  },

  async listTodasLicencas(): Promise<import('../types').LicencaConta[]> {
    try {
      return await pb.collection('licencas_conta').getFullList<import('../types').LicencaConta>({
        sort: 'created',
      })
    } catch {
      return []
    }
  },

  async updateLicencaConta(
    id: string,
    data: Partial<import('../types').LicencaConta>,
  ): Promise<import('../types').LicencaConta> {
    return await pb.collection('licencas_conta').update<import('../types').LicencaConta>(id, data)
  },

  async getConfigPlanoGratuito(): Promise<import('../types').ConfigPlanoGratuito> {
    try {
      const records = await pb
        .collection('config_plano_gratuito')
        .getList<import('../types').ConfigPlanoGratuito>(1, 1, {
          sort: '-created',
        })
      if (records.items.length > 0) {
        const item = records.items[0]
        let modulos = item.modulos_inclusos
        if (typeof modulos === 'string') {
          try {
            modulos = JSON.parse(modulos)
          } catch {
            modulos = ['nucleo', 'folha_dia', 'projetos']
          }
        }
        return {
          id: item.id,
          max_dias_folha: Number(item.max_dias_folha) || 2,
          max_projetos: Number(item.max_projetos) || 2,
          permite_convites: Boolean(item.permite_convites),
          permite_whatsapp: Boolean(item.permite_whatsapp),
          permite_ia: Boolean(item.permite_ia),
          permite_financas: Boolean(item.permite_financas),
          modulos_inclusos: Array.isArray(modulos) ? modulos : ['nucleo', 'folha_dia', 'projetos'],
          nome_exibicao: item.nome_exibicao || 'Prova Viva',
          descricao: item.descricao || '',
          created: item.created,
          updated: item.updated,
        }
      }
    } catch {
      /* fallback se não existir registro */
    }

    return {
      id: '',
      max_dias_folha: 2,
      max_projetos: 2,
      permite_convites: false,
      permite_whatsapp: false,
      permite_ia: false,
      permite_financas: false,
      modulos_inclusos: ['nucleo', 'folha_dia', 'projetos'],
      nome_exibicao: 'Prova Viva',
      descricao: 'Plano gratuito inicial com limites configuráveis pelo Master.',
    }
  },

  async salvarConfigPlanoGratuito(
    dados: Partial<import('../types').ConfigPlanoGratuito>,
    aplicarNasContasGratuitasExistentes: boolean = true,
  ): Promise<import('../types').ConfigPlanoGratuito> {
    const atual = await this.getConfigPlanoGratuito()
    const payload = {
      max_dias_folha:
        typeof dados.max_dias_folha === 'number' ? dados.max_dias_folha : atual.max_dias_folha,
      max_projetos:
        typeof dados.max_projetos === 'number' ? dados.max_projetos : atual.max_projetos,
      permite_convites:
        typeof dados.permite_convites === 'boolean'
          ? dados.permite_convites
          : atual.permite_convites,
      permite_whatsapp:
        typeof dados.permite_whatsapp === 'boolean'
          ? dados.permite_whatsapp
          : atual.permite_whatsapp,
      permite_ia: typeof dados.permite_ia === 'boolean' ? dados.permite_ia : atual.permite_ia,
      permite_financas:
        typeof dados.permite_financas === 'boolean'
          ? dados.permite_financas
          : atual.permite_financas,
      modulos_inclusos: dados.modulos_inclusos || atual.modulos_inclusos,
      nome_exibicao: dados.nome_exibicao || atual.nome_exibicao || 'Prova Viva',
      descricao: dados.descricao !== undefined ? dados.descricao : atual.descricao,
    }

    let savedItem: import('../types').ConfigPlanoGratuito
    if (atual.id) {
      savedItem = await pb
        .collection('config_plano_gratuito')
        .update<import('../types').ConfigPlanoGratuito>(atual.id, payload)
    } else {
      savedItem = await pb
        .collection('config_plano_gratuito')
        .create<import('../types').ConfigPlanoGratuito>(payload)
    }

    // Se solicitado, sincroniza também os limites nas licenças atualmente gratuitas para efeito imediato
    if (aplicarNasContasGratuitasExistentes) {
      try {
        const licencas = await pb
          .collection('licencas_conta')
          .getFullList<import('../types').LicencaConta>({
            filter: 'plano = "gratuito"',
          })
        for (const lic of licencas) {
          await pb
            .collection('licencas_conta')
            .update(lic.id, {
              max_dias_folha: payload.max_dias_folha,
              max_projetos: payload.max_projetos,
              permite_convites: payload.permite_convites,
              permite_whatsapp: payload.permite_whatsapp,
              observacoes: `Plano Gratuito Prova Viva: ${payload.max_dias_folha} dias de folha, ${payload.max_projetos} projetos e convites ${payload.permite_convites ? 'liberados' : 'bloqueados'} (configurado pelo Master)`,
            })
            .catch(() => null)

          // Sincronizar módulos da licença gratuita
          const modulos = await this.listModulosLicenca(lic.id).catch(() => [])
          for (const m of modulos) {
            const deveEstarAtivo =
              m.codigo === 'nucleo' || payload.modulos_inclusos.includes(m.codigo)
            if (m.ativo !== deveEstarAtivo) {
              await this.toggleModuloLicenca(m.id, deveEstarAtivo).catch(() => null)
            }
          }
        }
      } catch {
        /* best-effort */
      }
    }

    return savedItem
  },

  async alterarPlanoConta(
    licencaId: string,
    plano: import('../types').PlanoLicencaTipo,
    status: import('../types').StatusLicencaTipo = 'ativo',
  ): Promise<import('../types').LicencaConta> {
    const isPago = plano === 'pro' || plano === 'diamond_executive'
    const configGratuito = !isPago ? await this.getConfigPlanoGratuito() : null

    const payload: Partial<import('../types').LicencaConta> = {
      plano,
      status,
      max_dias_folha: isPago ? 99999 : (configGratuito?.max_dias_folha ?? 2),
      max_projetos: isPago ? 99999 : (configGratuito?.max_projetos ?? 2),
      permite_convites: isPago ? true : (configGratuito?.permite_convites ?? false),
      permite_whatsapp: isPago ? true : (configGratuito?.permite_whatsapp ?? false),
      permite_relatorios_avancados: isPago,
      observacoes: isPago
        ? `Plano ${plano === 'diamond_executive' ? 'Diamond Executive Ilimitado' : 'Pro Empresarial'} ativado pelo Master`
        : `Plano Gratuito Prova Viva: ${configGratuito?.max_dias_folha ?? 2} dias de folha, ${configGratuito?.max_projetos ?? 2} projetos e convites ${configGratuito?.permite_convites ? 'liberados' : 'bloqueados'}`,
    }
    const updated = await pb
      .collection('licencas_conta')
      .update<import('../types').LicencaConta>(licencaId, payload)

    // Ajustar módulos da conta
    try {
      const modulos = await this.listModulosLicenca(licencaId)
      for (const m of modulos) {
        const deveAtivo =
          isPago ||
          m.codigo === 'nucleo' ||
          (configGratuito?.modulos_inclusos || []).includes(m.codigo)
        if (m.ativo !== deveAtivo) {
          await this.toggleModuloLicenca(m.id, deveAtivo).catch(() => null)
        }
      }
    } catch {
      /* best-effort */
    }

    return updated
  },

  async getPainelMasterDados(): Promise<import('../types').ResumoContaMaster[]> {
    const [licencas, membros, convites, itensFolha, proj] = await Promise.all([
      this.listTodasLicencas(),
      this.listMembrosEquipe(),
      this.listConvitesEquipe('todos'),
      pb
        .collection('folha_dia')
        .getFullList<{ data?: string; data_hora?: string; created?: string }>({
          fields: 'data,data_hora,created',
        })
        .catch(() => []),
      pb
        .collection('projetos')
        .getList(1, 1, { fields: 'id' })
        .catch(() => ({ totalItems: 0 })),
    ])

    // Dias distintos na folha
    const diasSet = new Set<string>()
    itensFolha.forEach((i) => {
      const d =
        (i.data_hora
          ? i.data_hora.slice(0, 10)
          : i.data
            ? i.data.slice(0, 10)
            : i.created?.slice(0, 10)) || ''
      if (d) diasSet.add(d)
    })
    const diasFolhaTotal = diasSet.size
    const projetosTotal = proj.totalItems

    const resumos: import('../types').ResumoContaMaster[] = []

    for (const lic of licencas) {
      const modulos = await this.listModulosLicenca(lic.id).catch(() => [])
      const admins = membros.filter(
        (m) => m.funcao === 'admin' || m.nivel_acesso === 'admin' || m.is_master,
      )

      resumos.push({
        id: lic.id,
        nome_conta: lic.nome_conta || 'Conta Diamond',
        plano: lic.plano,
        status: lic.status,
        max_dias_folha: lic.max_dias_folha,
        max_projetos: lic.max_projetos,
        permite_convites: lic.permite_convites,
        titular_nome: lic.titular_nome,
        titular_email: lic.titular_email,
        observacoes: lic.observacoes,
        stripe_payment_link: lic.stripe_payment_link,
        preco_recorrencia: lic.preco_recorrencia || 197,
        ciclo_cobranca: lic.ciclo_cobranca || 'mensal',
        data_inicio: lic.data_inicio,
        data_renovacao: lic.data_renovacao,
        data_expiracao: lic.data_expiracao,
        conta_teste: Boolean(lic.conta_teste),
        diasFolhaUsados: diasFolhaTotal,
        projetosUsados: projetosTotal,
        convitesTotal: convites.length,
        admins,
        membros,
        modulos,
        created: lic.created,
        updated: lic.updated,
      })
    }

    return resumos
  },

  async listModulosLicenca(licencaId?: string): Promise<import('../types').ModuloLicenca[]> {
    try {
      const filter = licencaId ? `licenca = "${licencaId}"` : ''
      return await pb.collection('modulos_licenca').getFullList<import('../types').ModuloLicenca>({
        filter,
        sort: 'codigo',
      })
    } catch {
      return []
    }
  },

  async toggleModuloLicenca(id: string, ativo: boolean): Promise<import('../types').ModuloLicenca> {
    return await pb
      .collection('modulos_licenca')
      .update<import('../types').ModuloLicenca>(id, { ativo })
  },

  /**
   * Calcula o consumo da conta contra os limites do plano
   * - Dias distintos na Folha do Dia
   * - Total de projetos cadastrados
   * - Permissão de convite
   */
  async getLimitesConsumoConta(
    usuarioAtualId?: string,
    usuarioEmail?: string,
  ): Promise<import('../types').LimitesConsumoConta> {
    const licenca = await this.getLicencaConta()

    // 1. Contar dias distintos na Folha do Dia
    let diasFolhaCount = 0
    try {
      const itensFolha = await pb
        .collection('folha_dia')
        .getFullList<{ data?: string; data_hora?: string; created?: string }>({
          fields: 'data,data_hora,created',
        })
      const diasSet = new Set<string>()
      itensFolha.forEach((i) => {
        const d =
          (i.data_hora
            ? i.data_hora.slice(0, 10)
            : i.data
              ? i.data.slice(0, 10)
              : i.created?.slice(0, 10)) || ''
        if (d) diasSet.add(d)
      })
      diasFolhaCount = diasSet.size
    } catch {
      diasFolhaCount = 0
    }

    // 2. Contar projetos cadastrados
    let projetosCount = 0
    try {
      const proj = await pb.collection('projetos').getList(1, 1, { fields: 'id' })
      projetosCount = proj.totalItems
    } catch {
      projetosCount = 0
    }

    // 3. Obter módulos
    let modulosCodigos: string[] = []
    try {
      const modulos = await this.listModulosLicenca(licenca?.id)
      modulosCodigos = modulos.filter((m) => m.ativo).map((m) => m.codigo)
    } catch {
      modulosCodigos = []
    }

    // 4. Checar se usuário logado é Master ou Admin
    let isMaster = false
    let isAdmin = false

    if (usuarioEmail === 'marcoschagasdiamond@icloud.com') {
      isMaster = true
      isAdmin = true
    } else if (usuarioAtualId || usuarioEmail) {
      try {
        const conds: string[] = []
        if (usuarioAtualId) conds.push(`usuario = "${usuarioAtualId}"`)
        if (usuarioEmail) conds.push(`email = "${usuarioEmail}"`)
        const m = await pb
          .collection('membros_equipe')
          .getFirstListItem<import('../types').MembroEquipe>(conds.join(' || '))
        if (m) {
          if (m.is_master) isMaster = true
          if (m.funcao === 'admin' || m.nivel_acesso === 'admin' || m.is_master) isAdmin = true
        }
      } catch {
        // Fallback
      }
    }

    const plano = licenca?.plano || 'gratuito'
    const status = licenca?.status || 'ativo'

    // Se a licença não possuir valores definidos ou for gratuita, carrega da configuração do plano gratuito vigente
    let fallbackDias = 2
    let fallbackProj = 2
    let fallbackPermiteConv = false
    let fallbackPermiteWhats = false
    if (plano === 'gratuito') {
      try {
        const cfg = await this.getConfigPlanoGratuito()
        if (cfg) {
          fallbackDias = cfg.max_dias_folha
          fallbackProj = cfg.max_projetos
          fallbackPermiteConv = cfg.permite_convites
          fallbackPermiteWhats = cfg.permite_whatsapp
        }
      } catch {
        /* fallback silencioso */
      }
    }

    const maxDias =
      typeof licenca?.max_dias_folha === 'number' && licenca.max_dias_folha > 0
        ? licenca.max_dias_folha
        : fallbackDias
    const maxProj =
      typeof licenca?.max_projetos === 'number' && licenca.max_projetos > 0
        ? licenca.max_projetos
        : fallbackProj
    const permiteConv =
      typeof licenca?.permite_convites === 'boolean'
        ? licenca.permite_convites
        : fallbackPermiteConv

    const isPago = plano === 'pro' || plano === 'diamond_executive'
    const isContaTeste = Boolean(licenca?.conta_teste)

    // Se a conta estiver em teste, os recursos são liberados para testes (sem travas),
    // mas os botões de pagamento e avisos continuam exibidos de forma desabilitada.
    const liberadoPorTeste = isContaTeste

    // Checagem modular padronizada:
    // Se a licença é paga ou em teste, todos os módulos são ativos; se gratuita, checa os registros
    const moduloWhatsappAtivo =
      isPago ||
      liberadoPorTeste ||
      modulosCodigos.includes('whatsapp') ||
      modulosCodigos.includes('whatsapp_radar') ||
      !!licenca?.permite_whatsapp

    const moduloIaAtivo = isPago || liberadoPorTeste || modulosCodigos.includes('ia')

    const moduloFinancasAtivo =
      isPago ||
      liberadoPorTeste ||
      modulosCodigos.includes('financas') ||
      modulosCodigos.includes('contabilidade_5_0')

    const precoNum = licenca?.preco_recorrencia || 197
    const cicloStr = licenca?.ciclo_cobranca === 'anual' ? 'ano' : 'mês'
    const precoMensalTexto = `R$ ${precoNum}/${cicloStr}`

    return {
      plano,
      status,
      nome_conta: licenca?.nome_conta || 'Conta Diamond',
      diasFolhaUsados: diasFolhaCount,
      diasFolhaMax: liberadoPorTeste ? 99999 : maxDias,
      bloqueadoFolha: !liberadoPorTeste && plano === 'gratuito' && diasFolhaCount >= maxDias,
      projetosUsados: projetosCount,
      projetosMax: liberadoPorTeste ? 99999 : maxProj,
      bloqueadoProjetos: !liberadoPorTeste && plano === 'gratuito' && projetosCount >= maxProj,
      permiteConvites: liberadoPorTeste ? true : permiteConv,
      bloqueadoConvites: !liberadoPorTeste && plano === 'gratuito' && !permiteConv,
      modulosAtivos: modulosCodigos,
      moduloWhatsappAtivo,
      moduloIaAtivo,
      moduloFinancasAtivo,
      stripePaymentLink: licenca?.stripe_payment_link,
      precoMensal: licenca?.preco_recorrencia || 197,
      precoMensalTexto,
      isContaTeste,
      isMaster,
      isAdmin,
    }
  },

  async alternarContaTeste(
    licencaId: string,
    contaTeste: boolean,
  ): Promise<import('../types').LicencaConta> {
    return await pb
      .collection('licencas_conta')
      .update<import('../types').LicencaConta>(licencaId, {
        conta_teste: contaTeste,
      })
  },

  async salvarConfiguracaoCheckoutGlobal(
    paymentLink: string,
    precoMensal: number = 197,
  ): Promise<void> {
    try {
      const licencas = await pb.collection('licencas_conta').getFullList()
      for (const lic of licencas) {
        await pb.collection('licencas_conta').update(lic.id, {
          stripe_payment_link: paymentLink.trim(),
          preco_recorrencia: precoMensal,
          ciclo_cobranca: 'mensal',
        })
      }
    } catch (err) {
      console.error('Falha ao salvar configuração global de checkout', err)
      throw err
    }
  },

  // Convites de Equipe
  async listConvitesEquipe(statusFiltro?: string): Promise<ConviteEquipe[]> {
    try {
      let filter = ''
      if (statusFiltro && statusFiltro !== 'todos') {
        filter = `status = "${statusFiltro}"`
      }
      return await pb.collection('convites_equipe').getFullList<ConviteEquipe>({
        filter,
        sort: '-created',
        expand:
          'convidado_por,usuario_aceitou,projeto_ref,cliente_ref,fluxo_ref,categoria_ref,demanda_ref',
      })
    } catch {
      return []
    }
  },

  async getConvitePorToken(token: string): Promise<ConviteEquipe | null> {
    try {
      return await pb
        .collection('convites_equipe')
        .getFirstListItem<ConviteEquipe>(`token = "${token}"`, {
          expand: 'convidado_por,projeto_ref,cliente_ref,fluxo_ref,categoria_ref,demanda_ref',
        })
    } catch {
      return null
    }
  },

  async criarConvite(data: {
    email: string
    telefone?: string
    escopo_tipo: string
    escopo_id?: string
    escopo_nome?: string
    nivel_acesso: string
    mensagem?: string
    convidado_por?: string
  }): Promise<ConviteEquipe> {
    const token =
      Math.random().toString(36).substring(2, 12) +
      Math.random().toString(36).substring(2, 12) +
      Date.now().toString(36)

    const expiraEm = new Date()
    expiraEm.setDate(expiraEm.getDate() + 7)

    const payload: Record<string, unknown> = {
      email: data.email.trim().toLowerCase(),
      telefone: data.telefone ? data.telefone.trim() : '',
      token,
      escopo_tipo: data.escopo_tipo,
      escopo_id: data.escopo_id || '',
      escopo_nome: data.escopo_nome || '',
      nivel_acesso: data.nivel_acesso,
      status: 'pendente',
      mensagem: data.mensagem || '',
      expira_em: expiraEm.toISOString(),
      convidado_por: data.convidado_por || pb.authStore.record?.id || '',
    }

    if (data.escopo_tipo === 'projeto' && data.escopo_id) {
      payload.projeto_ref = data.escopo_id
    } else if (data.escopo_tipo === 'cliente' && data.escopo_id) {
      payload.cliente_ref = data.escopo_id
    } else if (data.escopo_tipo === 'fluxo' && data.escopo_id) {
      payload.fluxo_ref = data.escopo_id
    } else if (data.escopo_tipo === 'categoria' && data.escopo_id) {
      payload.categoria_ref = data.escopo_id
    } else if (data.escopo_tipo === 'demanda' && data.escopo_id) {
      payload.demanda_ref = data.escopo_id
    }

    return await pb.collection('convites_equipe').create<ConviteEquipe>(payload)
  },

  async reenviarConvite(
    conviteId: string,
    canal?: 'email' | 'whatsapp' | 'ambos',
  ): Promise<{
    sucesso: boolean
    canal?: string
    email_processado?: boolean
    email_enviado?: boolean
    email_erro?: string
    whatsapp_processado?: boolean
    whatsapp_enviado?: boolean
    whatsapp_erro?: string
    mensagem: string
    erro?: string
  }> {
    const res = await fetch(`${import.meta.env.VITE_POCKETBASE_URL}/backend/v1/convites/reenviar`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: pb.authStore.token,
      },
      body: JSON.stringify({ convite_id: conviteId, canal: canal || 'ambos' }),
    })
    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      throw new Error(err.error || err.erro || 'Falha ao reenviar convite')
    }
    return await res.json()
  },

  async getStatusWhatsAppMaster(): Promise<{
    status: 'conectado' | 'desconectado' | 'ativo_com_alertas'
    provedor: string
    modo: string
    master_conectado: boolean
    numero_master?: string
    erro_master?: string
    estatisticas: {
      total_convites: number
      total_com_telefone: number
      total_enviados: number
      total_falhas: number
      ultimo_erro: string
    }
    mensagem: string
  }> {
    const res = await fetch(
      `${import.meta.env.VITE_POCKETBASE_URL}/backend/v1/master/status-whatsapp`,
      {
        method: 'GET',
        headers: {
          Authorization: pb.authStore.token,
        },
      },
    )
    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      throw new Error(err.error || 'Falha ao verificar status do WhatsApp')
    }
    return await res.json()
  },

  async getStatusResend(): Promise<{
    sucesso: boolean
    conectado: boolean
    detalhe: string
    remetente_padrao?: string
    uso?: any
    testado_em?: string
  }> {
    const res = await fetch(
      `${import.meta.env.VITE_POCKETBASE_URL}/backend/v1/master/status-resend`,
      {
        method: 'GET',
        headers: {
          Authorization: pb.authStore.token,
        },
      },
    )
    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      throw new Error(err.error || 'Falha ao verificar status do Resend')
    }
    return await res.json()
  },

  async revogarConvite(conviteId: string): Promise<ConviteEquipe> {
    return await pb.collection('convites_equipe').update<ConviteEquipe>(conviteId, {
      status: 'revogado',
    })
  },

  async excluirConvite(conviteId: string): Promise<boolean> {
    return await pb.collection('convites_equipe').delete(conviteId)
  },

  async aceitarConvite(dados: {
    token: string
    nome?: string
    usuario_id?: string
  }): Promise<{ sucesso: boolean; mensagem: string; ja_aceito?: boolean }> {
    const res = await fetch(
      `${import.meta.env.VITE_POCKETBASE_URL}/backend/v1/equipe/aceitar-convite`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(pb.authStore.token ? { Authorization: pb.authStore.token } : {}),
        },
        body: JSON.stringify(dados),
      },
    )
    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      throw new Error(err.error || 'Falha ao aceitar convite')
    }
    return await res.json()
  },

  // Tags do Sistema
  async listTagsSistema(): Promise<TagSistema[]> {
    try {
      return await pb.collection('tags_sistema').getFullList<TagSistema>({
        sort: 'nome',
      })
    } catch {
      return []
    }
  },

  async createTagSistema(data: Partial<TagSistema>): Promise<TagSistema> {
    return await pb.collection('tags_sistema').create<TagSistema>(data)
  },

  async updateTagSistema(id: string, data: Partial<TagSistema>): Promise<TagSistema> {
    return await pb.collection('tags_sistema').update<TagSistema>(id, data)
  },

  async deleteTagSistema(id: string): Promise<boolean> {
    return await pb.collection('tags_sistema').delete(id)
  },

  // Pastas de Formulários
  async listPastasFormularios(): Promise<PastaFormulario[]> {
    try {
      return await pb.collection('pastas_formularios').getFullList<PastaFormulario>({
        sort: 'nome',
      })
    } catch {
      return []
    }
  },

  async createPastaFormulario(data: Partial<PastaFormulario>): Promise<PastaFormulario> {
    return await pb.collection('pastas_formularios').create<PastaFormulario>(data)
  },

  async updatePastaFormulario(
    id: string,
    data: Partial<PastaFormulario>,
  ): Promise<PastaFormulario> {
    return await pb.collection('pastas_formularios').update<PastaFormulario>(id, data)
  },

  async deletePastaFormulario(id: string): Promise<boolean> {
    return await pb.collection('pastas_formularios').delete(id)
  },

  // Formulários
  async listFormularios(): Promise<Formulario[]> {
    try {
      const records = await pb.collection('formularios').getFullList<Formulario>({
        sort: '-created',
        expand: 'criado_por',
      })
      return records.map((f) => {
        let parsedCampos: FormCampoConfig[] = []
        if (typeof f.campos === 'string') {
          try {
            parsedCampos = JSON.parse(f.campos)
          } catch {
            parsedCampos = []
          }
        } else if (Array.isArray(f.campos)) {
          parsedCampos = f.campos
        }
        return {
          ...f,
          campos: parsedCampos,
        }
      })
    } catch {
      return []
    }
  },

  async getFormularioPorSlug(slug: string): Promise<Formulario | null> {
    try {
      const f = await pb.collection('formularios').getFirstListItem<Formulario>(`slug = "${slug}"`)
      let parsedCampos: FormCampoConfig[] = []
      if (typeof f.campos === 'string') {
        try {
          parsedCampos = JSON.parse(f.campos)
        } catch {
          parsedCampos = []
        }
      } else if (Array.isArray(f.campos)) {
        parsedCampos = f.campos
      }
      return {
        ...f,
        campos: parsedCampos,
      }
    } catch {
      return null
    }
  },

  async getFormulario(id: string): Promise<Formulario> {
    const f = await pb.collection('formularios').getOne<Formulario>(id)
    let parsedCampos: FormCampoConfig[] = []
    if (typeof f.campos === 'string') {
      try {
        parsedCampos = JSON.parse(f.campos)
      } catch {
        parsedCampos = []
      }
    } else if (Array.isArray(f.campos)) {
      parsedCampos = f.campos
    }
    return {
      ...f,
      campos: parsedCampos,
    }
  },

  async createFormulario(data: Partial<Formulario>): Promise<Formulario> {
    const payload = {
      ...data,
      campos: typeof data.campos === 'object' ? JSON.stringify(data.campos) : data.campos,
    }
    const created = await pb.collection('formularios').create<Formulario>(payload)
    return {
      ...created,
      campos: Array.isArray(data.campos) ? data.campos : [],
    }
  },

  async updateFormulario(id: string, data: Partial<Formulario>): Promise<Formulario> {
    const payload = {
      ...data,
      campos: typeof data.campos === 'object' ? JSON.stringify(data.campos) : data.campos,
    }
    const updated = await pb.collection('formularios').update<Formulario>(id, payload)
    return {
      ...updated,
      campos: Array.isArray(data.campos) ? data.campos : [],
    }
  },

  async deleteFormulario(id: string): Promise<boolean> {
    return await pb.collection('formularios').delete(id)
  },

  async duplicarFormulario(id: string): Promise<Formulario> {
    const original = await this.getFormulario(id)
    const novoSlug = `${original.slug}-copia-${Date.now().toString(36).slice(-4)}`
    return await this.createFormulario({
      titulo: `${original.titulo} (Cópia)`,
      descricao: original.descricao,
      slug: novoSlug,
      publicado: false,
      pasta_grupo: original.pasta_grupo,
      campos: original.campos,
      cor_tema: original.cor_tema,
      mensagem_sucesso: original.mensagem_sucesso,
    })
  },

  // Respostas de Formulário
  async listRespostasFormulario(formularioId?: string): Promise<FormularioResposta[]> {
    try {
      const filter = formularioId ? `formulario = "${formularioId}"` : ''
      const records = await pb.collection('formulario_respostas').getFullList<FormularioResposta>({
        filter,
        sort: '-created',
        expand: 'formulario',
      })
      return records.map((r) => {
        let parsedDados: Record<string, unknown> = {}
        if (typeof r.dados === 'string') {
          try {
            parsedDados = JSON.parse(r.dados)
          } catch {
            parsedDados = {}
          }
        } else if (typeof r.dados === 'object' && r.dados !== null) {
          parsedDados = r.dados as Record<string, unknown>
        }
        return {
          ...r,
          dados: parsedDados,
        }
      })
    } catch {
      return []
    }
  },

  async enviarRespostaPublica(
    formularioId: string,
    dados: Record<string, unknown>,
    ident?: { nome?: string; email?: string },
  ): Promise<FormularioResposta> {
    return await pb.collection('formulario_respostas').create<FormularioResposta>({
      formulario: formularioId,
      dados: JSON.stringify(dados),
      respondente_identificacao: ident?.nome || '',
      respondente_email: ident?.email || '',
    })
  },

  async deleteRespostaFormulario(id: string): Promise<boolean> {
    return await pb.collection('formulario_respostas').delete(id)
  },

  // =========================================================================
  // SISTEMA DE LEMBRETES & NOTIFICAÇÕES (SINO & E-MAIL)
  // =========================================================================
  async getConfiguracaoLembretes(usuarioId?: string): Promise<ConfiguracaoLembretes | null> {
    try {
      const uId = usuarioId || pb.authStore.record?.id
      let filter = ''
      if (uId) {
        filter = `usuario = "${uId}"`
      }
      const records = await pb
        .collection('configuracoes_lembretes')
        .getList<ConfiguracaoLembretes>(1, 1, {
          filter,
          sort: '-created',
        })
      if (records.items.length > 0) {
        const item = records.items[0]
        let parsedReunioes = ['15m', '1h', '1d']
        let parsedTarefas = ['1h', '1d']
        if (typeof item.antecedencias_reunioes === 'string') {
          try {
            parsedReunioes = JSON.parse(item.antecedencias_reunioes)
          } catch {
            /* intentionally ignored */
          }
        } else if (Array.isArray(item.antecedencias_reunioes)) {
          parsedReunioes = item.antecedencias_reunioes as any
        }

        if (typeof item.antecedencias_tarefas === 'string') {
          try {
            parsedTarefas = JSON.parse(item.antecedencias_tarefas)
          } catch {
            /* intentionally ignored */
          }
        } else if (Array.isArray(item.antecedencias_tarefas)) {
          parsedTarefas = item.antecedencias_tarefas as any
        }

        return {
          ...item,
          antecedencias_reunioes: parsedReunioes as any,
          antecedencias_tarefas: parsedTarefas as any,
        }
      }
      return null
    } catch {
      return null
    }
  },

  async salvarConfiguracaoLembretes(
    dados: Partial<ConfiguracaoLembretes>,
  ): Promise<ConfiguracaoLembretes> {
    const uId = dados.usuario || pb.authStore.record?.id
    const payload = {
      usuario: uId,
      antecedencias_reunioes:
        typeof dados.antecedencias_reunioes === 'object'
          ? JSON.stringify(dados.antecedencias_reunioes)
          : dados.antecedencias_reunioes,
      antecedencias_tarefas:
        typeof dados.antecedencias_tarefas === 'object'
          ? JSON.stringify(dados.antecedencias_tarefas)
          : dados.antecedencias_tarefas,
      email_reunioes_ativo: !!dados.email_reunioes_ativo,
      sino_reunioes_ativo: !!dados.sino_reunioes_ativo,
      email_tarefas_ativo: !!dados.email_tarefas_ativo,
      sino_tarefas_ativo: !!dados.sino_tarefas_ativo,
      avisar_atrasos_tarefas: dados.avisar_atrasos_tarefas !== false,
    }

    if (dados.id) {
      const res = await pb
        .collection('configuracoes_lembretes')
        .update<ConfiguracaoLembretes>(dados.id, payload)
      return res
    }

    // Checar se já existe antes de criar
    const existing = await this.getConfiguracaoLembretes(uId)
    if (existing?.id) {
      const res = await pb
        .collection('configuracoes_lembretes')
        .update<ConfiguracaoLembretes>(existing.id, payload)
      return res
    }

    const res = await pb
      .collection('configuracoes_lembretes')
      .create<ConfiguracaoLembretes>(payload)
    return res
  },

  // Notificações do Sino
  async listNotificacoesSistema(apenasNaoLidas = false): Promise<NotificacaoSistema[]> {
    try {
      const uId = pb.authStore.record?.id
      const filters: string[] = []
      if (uId) {
        filters.push(`(usuario = "${uId}" || usuario = "")`)
      }
      if (apenasNaoLidas) {
        filters.push('lida = false')
      }

      return await pb.collection('notificacoes_sistema').getFullList<NotificacaoSistema>({
        filter: filters.join(' && '),
        sort: '-created',
      })
    } catch {
      return []
    }
  },

  async marcarNotificacaoLida(id: string): Promise<NotificacaoSistema> {
    return await pb.collection('notificacoes_sistema').update<NotificacaoSistema>(id, {
      lida: true,
      lida_em: new Date().toISOString(),
    })
  },

  async marcarTodasNotificacoesLidas(): Promise<boolean> {
    try {
      const pendentes = await this.listNotificacoesSistema(true)
      const agora = new Date().toISOString()
      await Promise.all(
        pendentes.map((n) =>
          pb.collection('notificacoes_sistema').update(n.id, {
            lida: true,
            lida_em: agora,
          }),
        ),
      )
      return true
    } catch {
      return false
    }
  },

  async excluirNotificacao(id: string): Promise<boolean> {
    try {
      return await pb.collection('notificacoes_sistema').delete(id)
    } catch {
      return false
    }
  },

  // Disparo manual para checar e disparar avisos imediatamente
  async verificarLembretesAgora(): Promise<{ sucesso: boolean; mensagem: string }> {
    const res = await fetch(
      `${import.meta.env.VITE_POCKETBASE_URL}/backend/v1/lembretes/verificar-agora`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(pb.authStore.token ? { Authorization: pb.authStore.token } : {}),
        },
      },
    )
    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      throw new Error(err.error || 'Falha ao verificar lembretes')
    }
    return await res.json()
  },

  // ---------------------------------------------------------
  // INTEGRAÇÃO WHATSAPP (CONECTORES POR USUÁRIO)
  // ---------------------------------------------------------

  async getWhatsAppStatus(): Promise<import('../types').WhatsAppStatusResponse> {
    const res = await fetch(`${import.meta.env.VITE_POCKETBASE_URL}/backend/v1/whatsapp/status`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...(pb.authStore.token ? { Authorization: pb.authStore.token } : {}),
      },
    })
    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      throw new Error(err.error || 'Falha ao carregar status do WhatsApp')
    }
    return await res.json()
  },

  async salvarWhatsAppConfig(
    config: Partial<import('../types').WhatsAppConfig>,
  ): Promise<{ sucesso: boolean; mensagem: string }> {
    const res = await fetch(`${import.meta.env.VITE_POCKETBASE_URL}/backend/v1/whatsapp/config`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(pb.authStore.token ? { Authorization: pb.authStore.token } : {}),
      },
      body: JSON.stringify(config),
    })
    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      throw new Error(err.error || 'Falha ao salvar configurações do WhatsApp')
    }
    return await res.json()
  },

  async getWhatsAppContatosGrupos(): Promise<import('../types').WhatsAppContatosGruposResponse> {
    const res = await fetch(
      `${import.meta.env.VITE_POCKETBASE_URL}/backend/v1/whatsapp/contatos-grupos`,
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          ...(pb.authStore.token ? { Authorization: pb.authStore.token } : {}),
        },
      },
    )
    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      throw new Error(err.error || 'Falha ao listar contatos e grupos do WhatsApp')
    }
    return await res.json()
  },

  async sincronizarWhatsAppAgora(): Promise<import('../types').WhatsAppSyncResponse> {
    const res = await fetch(
      `${import.meta.env.VITE_POCKETBASE_URL}/backend/v1/whatsapp/sincronizar`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(pb.authStore.token ? { Authorization: pb.authStore.token } : {}),
        },
      },
    )
    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      throw new Error(err.error || 'Falha ao sincronizar mensagens do WhatsApp')
    }
    return await res.json()
  },

  async ignorarRemetenteWhatsApp(params: {
    remetente?: string
    folha_id?: string
  }): Promise<{ sucesso: boolean; remetente_ignorado: string; contatos_ignorados: string[] }> {
    const res = await fetch(
      `${import.meta.env.VITE_POCKETBASE_URL}/backend/v1/whatsapp/ignorar-remetente`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(pb.authStore.token ? { Authorization: pb.authStore.token } : {}),
        },
        body: JSON.stringify(params),
      },
    )
    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      throw new Error(err.error || 'Falha ao adicionar remetente aos ignorados')
    }
    return await res.json()
  },

  /* ========================================================================== */
  /* GESTÃO DE FEEDBACK DE TESTE (BUGS, SUGESTÕES, IDEIAS)                     */
  /* ========================================================================== */

  /**
   * Envia um novo feedback de teste
   */
  async enviarFeedbackTeste(
    input: import('../types').CriarFeedbackTesteInput,
  ): Promise<import('../types').FeedbackTesteItem> {
    const dados: Record<string, unknown> = {
      texto: input.texto.trim(),
      tipo: input.tipo,
      status: 'novo',
      tela_origem: input.tela_origem || window.location.pathname,
    }

    if (input.usuario) {
      dados.usuario = input.usuario
    } else if (pb.authStore.record?.id) {
      dados.usuario = pb.authStore.record.id
    }

    if (input.usuario_nome) {
      dados.usuario_nome = input.usuario_nome
    } else if (pb.authStore.record?.name) {
      dados.usuario_nome = pb.authStore.record.name
    }

    if (input.usuario_email) {
      dados.usuario_email = input.usuario_email
    } else if (pb.authStore.record?.email) {
      dados.usuario_email = pb.authStore.record.email
    }

    if (input.conta) {
      dados.conta = input.conta
    } else {
      try {
        const lic = await this.getLicencaConta()
        if (lic?.id) dados.conta = lic.id
      } catch {
        /* conta opcional */
      }
    }

    return await pb.collection('feedback_teste').create<import('../types').FeedbackTesteItem>(dados)
  },

  /**
   * Lista feedbacks com suporte a filtros de tipo, status e ordenação
   */
  async listarFeedbacksTeste(filtros?: {
    tipo?: import('../types').TipoFeedbackTeste | 'todos'
    status?: import('../types').StatusFeedbackTeste | 'todos'
    termo?: string
  }): Promise<import('../types').FeedbackTesteItem[]> {
    try {
      const conds: string[] = []
      if (filtros?.tipo && filtros.tipo !== 'todos') {
        conds.push(`tipo = "${filtros.tipo}"`)
      }
      if (filtros?.status && filtros.status !== 'todos') {
        conds.push(`status = "${filtros.status}"`)
      }
      if (filtros?.termo && filtros.termo.trim()) {
        const t = filtros.termo.trim()
        conds.push(
          `(texto ~ "${t}" || tela_origem ~ "${t}" || usuario_nome ~ "${t}" || usuario_email ~ "${t}")`,
        )
      }

      const filter = conds.join(' && ')

      return await pb
        .collection('feedback_teste')
        .getFullList<import('../types').FeedbackTesteItem>({
          filter: filter || undefined,
          sort: '-created',
          expand: 'usuario,conta',
        })
    } catch {
      return []
    }
  },

  /**
   * Atualiza o status do feedback (novo / em_analise / resolvido)
   */
  async atualizarStatusFeedback(
    id: string,
    status: import('../types').StatusFeedbackTeste,
    resposta?: string,
    nomeMaster?: string,
  ): Promise<import('../types').FeedbackTesteItem> {
    const payload: Record<string, unknown> = { status }
    if (status === 'resolvido') {
      payload.resolvido_em = new Date().toISOString()
      if (nomeMaster) payload.resolvido_por = nomeMaster
    }
    if (resposta !== undefined) {
      payload.resposta_master = resposta
    }
    return await pb
      .collection('feedback_teste')
      .update<import('../types').FeedbackTesteItem>(id, payload)
  },

  /**
   * Remove um feedback de teste
   */
  async excluirFeedbackTeste(id: string): Promise<boolean> {
    return await pb.collection('feedback_teste').delete(id)
  },

  // -------------------------------------------------------------
  // Configurações de E-mail (Sistema / Master e Usuário Pessoal)
  // -------------------------------------------------------------
  async getConfigEmailSistema(): Promise<import('../types').ConfigEmailSistema | null> {
    try {
      const list = await pb
        .collection('config_email')
        .getList<import('../types').ConfigEmailSistema>(1, 1, {
          filter: 'ativo = true',
          sort: '-created',
        })
      if (list.items && list.items.length > 0) {
        return list.items[0]
      }
    } catch (err) {
      console.warn('Erro ao carregar config_email do sistema:', err)
    }
    return null
  },

  async salvarConfigEmailSistema(
    dados: Partial<import('../types').ConfigEmailSistema>,
  ): Promise<import('../types').ConfigEmailSistema> {
    const atual = await this.getConfigEmailSistema()
    const payload = {
      remetente_nome: dados.remetente_nome ?? 'Agenda IA Diamond',
      remetente_email: dados.remetente_email ?? 'onboarding@resend.dev',
      assunto_convite:
        dados.assunto_convite ??
        'Convite de Equipe: {convidador} convidou você para o Agenda IA Diamond',
      titulo_cabecalho: dados.titulo_cabecalho ?? 'AGENDA IA DIAMOND',
      subtitulo_cabecalho:
        dados.subtitulo_cabecalho ?? 'Gestão Estratégica & Segundo Cérebro Executivo',
      texto_apresentacao:
        dados.texto_apresentacao ??
        'convidou você para colaborar na plataforma Agenda IA Diamond com acesso dedicado.',
      texto_botao_aceite: dados.texto_botao_aceite ?? 'Aceitar Convite e Acessar',
      cor_primaria: dados.cor_primaria ?? '#0F766E',
      cor_cabecalho: dados.cor_cabecalho ?? '#1A1D21',
      texto_rodape:
        dados.texto_rodape ??
        'Enviado automaticamente por Agenda IA Diamond • Não responda a este e-mail.',
      ativo: true,
    }

    if (atual && atual.id) {
      return await pb
        .collection('config_email')
        .update<import('../types').ConfigEmailSistema>(atual.id, payload)
    } else {
      return await pb
        .collection('config_email')
        .create<import('../types').ConfigEmailSistema>(payload)
    }
  },

  async getConfigEmailUsuario(
    userId: string,
  ): Promise<import('../types').ConfigEmailUsuario | null> {
    if (!userId) return null
    try {
      const list = await pb
        .collection('config_email_usuario')
        .getList<import('../types').ConfigEmailUsuario>(1, 1, {
          filter: `usuario = '${userId}'`,
          sort: '-created',
        })
      if (list.items && list.items.length > 0) {
        return list.items[0]
      }
    } catch (err) {
      console.warn('Erro ao carregar config_email_usuario:', err)
    }
    return null
  },

  async salvarConfigEmailUsuario(
    userId: string,
    dados: Partial<import('../types').ConfigEmailUsuario>,
  ): Promise<import('../types').ConfigEmailUsuario> {
    const atual = await this.getConfigEmailUsuario(userId)
    const msg = dados.mensagem_personalizada ?? dados.mensagem_personalizada_convite ?? ''
    const nome = dados.remetente_nome ?? dados.remetente_nome_preferido ?? ''
    const payload = {
      usuario: userId,
      usar_resend_proprio: dados.usar_resend_proprio ?? false,
      remetente_nome_preferido: nome,
      remetente_nome: nome,
      remetente_email: dados.remetente_email ?? '',
      mensagem_personalizada_convite: msg,
      mensagem_personalizada: msg,
      rodape_personalizado: dados.rodape_personalizado ?? '',
    }

    if (atual && atual.id) {
      return await pb
        .collection('config_email_usuario')
        .update<import('../types').ConfigEmailUsuario>(atual.id, payload)
    } else {
      return await pb
        .collection('config_email_usuario')
        .create<import('../types').ConfigEmailUsuario>(payload)
    }
  },

  async obterConfigEmailUsuario(
    userId: string,
  ): Promise<import('../types').ConfigEmailUsuario | null> {
    return await this.getConfigEmailUsuario(userId)
  },

  async dispararEmailTesteUsuario(): Promise<import('../types').RespostaEnvioEmailTeste> {
    return await this.testarEnvioEmailUsuario()
  },

  async testarEnvioEmailUsuario(): Promise<import('../types').RespostaEnvioEmailTeste> {
    const res = await fetch(
      `${import.meta.env.VITE_POCKETBASE_URL}/backend/v1/email/teste-usuario`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: pb.authStore.token,
        },
      },
    )
    const data = await res.json().catch(() => ({}))
    if (!res.ok) {
      return {
        sucesso: false,
        erro: data.erro || data.error || 'Falha ao disparar e-mail de teste.',
      }
    }
    return data
  },
}
