import pb from '@/lib/pocketbase/client'
import type {
  Projeto,
  Negocio,
  Contato,
  FolhaDia,
  Card,
  Demanda,
  Lista,
  Pasta,
  Arquivo,
  ResumoDia,
  Cliente,
  ClienteProjeto,
  Profile,
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
      sort: '-updated',
      expand: 'pasta_raiz',
    })
  },

  async getProjeto(id: string): Promise<Projeto> {
    return await pb.collection('projetos').getOne<Projeto>(id, {
      expand: 'pasta_raiz',
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
  async listFolhaDia(data?: string): Promise<FolhaDia[]> {
    let filter = ''
    if (data) {
      filter = `data = "${data}"`
    }
    return await pb.collection('folha_dia').getFullList<FolhaDia>({
      filter,
      sort: '-created',
      expand: 'projeto,negocio,contato',
    })
  },

  async createFolhaDia(data: Partial<FolhaDia>): Promise<FolhaDia> {
    return await pb.collection('folha_dia').create<FolhaDia>(data)
  },

  async updateFolhaDia(id: string, data: Partial<FolhaDia>): Promise<FolhaDia> {
    return await pb.collection('folha_dia').update<FolhaDia>(id, data)
  },

  async deleteFolhaDia(id: string): Promise<boolean> {
    return await pb.collection('folha_dia').delete(id)
  },

  // Cards (Kanban)
  async listCards(filtroExtra?: string): Promise<Card[]> {
    return await pb.collection('cards').getFullList<Card>({
      filter: filtroExtra || '',
      sort: '-updated',
      expand: 'projeto,negocio,contato,responsavel',
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

  // Demandas
  async listDemandas(filtroExtra?: string): Promise<Demanda[]> {
    return await pb.collection('demandas').getFullList<Demanda>({
      filter: filtroExtra || '',
      sort: '-created',
      expand: 'card_origem,atribuido_a',
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
}
