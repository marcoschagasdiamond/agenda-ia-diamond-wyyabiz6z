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
      expand: 'projeto,negocio,contato',
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
      expand: 'projeto,negocio,contato',
    })
  },

  async arquivarFolhaDia(id: string, arquivado = true): Promise<FolhaDia> {
    return await pb.collection('folha_dia').update<FolhaDia>(id, { arquivado })
  },

  async fixarFolhaDia(id: string, fixado = true): Promise<FolhaDia> {
    return await pb.collection('folha_dia').update<FolhaDia>(id, { fixado })
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

  async reenviarConvite(conviteId: string): Promise<{ sucesso: boolean; mensagem: string }> {
    const res = await fetch(
      `${import.meta.env.VITE_POCKETBASE_URL}/backend/v1/equipe/reenviar-convite`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: pb.authStore.token,
        },
        body: JSON.stringify({ convite_id: conviteId }),
      },
    )
    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      throw new Error(err.error || 'Falha ao reenviar convite')
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
}
