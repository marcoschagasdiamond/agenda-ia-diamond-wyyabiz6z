/// <reference path="../pb_data/types.d.ts" />
migrate(
  (app) => {
    const users = app.findCollectionByNameOrId('_pb_users_auth_')
    const adminEmail = 'marcoschagasdiamond@icloud.com'

    let adminUser
    try {
      adminUser = app.findAuthRecordByEmail('_pb_users_auth_', adminEmail)
    } catch (_) {
      adminUser = new Record(users)
      adminUser.setEmail(adminEmail)
      adminUser.setPassword('Skip@Pass')
      adminUser.setVerified(true)
      adminUser.set('name', 'Marcos Chagas Diamond')
      app.save(adminUser)
    }

    // 1. Seed Profile
    const profilesCol = app.findCollectionByNameOrId('profiles')
    try {
      app.findFirstRecordByData('profiles', 'user', adminUser.id)
    } catch (_) {
      const profile = new Record(profilesCol)
      profile.set('user', adminUser.id)
      profile.set(
        'respostas_onboarding',
        JSON.stringify({
          quem_e_voce: 'Marcos Chagas, estrategista de negócios e fundador da Diamond Consultoria.',
          o_que_faz:
            'Desenvolvo estratégias de posicionamento de alto valor, precificação e implementação de projetos digitais/devices para marcas e clientes seletos.',
          quais_projetos:
            'Expansão de franquias digitais, e-commerce Loja Y, consultoria de precificação para agências e mentoria freelance.',
          quais_objetivos:
            'Consolidar o segundo cérebro da empresa, manter histórico impecável de decisões com cada cliente e acelerar execução diária.',
        }),
      )
      profile.set('posicionamento', 'Consultor Premium de Estratégia, Tecnologia e Posicionamento')
      profile.set(
        'precos',
        'Consultoria estratégica R$ 15.000/mês; Projetos pontuais R$ 25k - R$ 60k',
      )
      profile.set(
        'objetivos',
        'Escalar operação para 10 clientes de alta retenção com satisfação máxima.',
      )
      profile.set(
        'preferencias',
        'Decisões orientadas a dados e execução rápida; foco em entregas com prazo rígido.',
      )
      app.save(profile)
    }

    // 2. Seed Pastas
    const pastasCol = app.findCollectionByNameOrId('pastas')
    let pastaRaiz
    try {
      pastaRaiz = app.findFirstRecordByData('pastas', 'nome', 'Loja Y - Documentos')
    } catch (_) {
      pastaRaiz = new Record(pastasCol)
      pastaRaiz.set('nome', 'Loja Y - Documentos')
      app.save(pastaRaiz)
    }

    // 3. Seed Negócio
    const negociosCol = app.findCollectionByNameOrId('negocios')
    let negocioY
    try {
      negocioY = app.findFirstRecordByData('negocios', 'nome', 'Grupo Varejo Y')
    } catch (_) {
      negocioY = new Record(negociosCol)
      negocioY.set('nome', 'Grupo Varejo Y')
      negocioY.set('descricao', 'Rede de varejo e moda sustentável com expansão omnicanal.')
      negocioY.set('tipo', 'Varejo & E-commerce')
      negocioY.set('status', 'ativo')
      app.save(negocioY)
    }

    // 4. Seed Projeto
    const projetosCol = app.findCollectionByNameOrId('projetos')
    let projetoLojaY
    try {
      projetoLojaY = app.findFirstRecordByData('projetos', 'nome', 'Loja Y - E-commerce e Expansão')
    } catch (_) {
      projetoLojaY = new Record(projetosCol)
      projetoLojaY.set('nome', 'Loja Y - E-commerce e Expansão')
      projetoLojaY.set(
        'descricao',
        'Reformulação da plataforma de e-commerce, precificação e integração de catálogo para a Loja Y.',
      )
      projetoLojaY.set('tipo', 'cliente')
      projetoLojaY.set('status', 'ativo')
      projetoLojaY.set('pasta_raiz', pastaRaiz.id)
      projetoLojaY.set(
        'contexto_resumido',
        'Definida a paleta verde profunda e layout mobile-first. Cliente aprovou escopo inicial e aguarda revisão final do catálogo.',
      )
      app.save(projetoLojaY)

      // Link pasta to project
      pastaRaiz.set('projeto', projetoLojaY.id)
      app.save(pastaRaiz)
    }

    // 5. Seed Contato
    const contatosCol = app.findCollectionByNameOrId('contatos')
    let contatoHelena
    try {
      contatoHelena = app.findFirstRecordByData(
        'contatos',
        'email',
        'helena.martins@lojayecommerce.com.br',
      )
    } catch (_) {
      contatoHelena = new Record(contatosCol)
      contatoHelena.set('nome', 'Helena Martins')
      contatoHelena.set('empresa', 'Loja Y')
      contatoHelena.set('email', 'helena.martins@lojayecommerce.com.br')
      contatoHelena.set('telefone', '+55 (11) 98765-4321')
      contatoHelena.set('cargo', 'Diretora de Operações')
      contatoHelena.set('tags', JSON.stringify(['decisao', 'cliente', 'prioritario']))
      contatoHelena.set('projetos', [projetoLojaY.id])
      contatoHelena.set('negocios', [negocioY.id])
      contatoHelena.set('origem', 'whatsapp')
      contatoHelena.set(
        'contexto_resumido',
        'Ponto focal da Loja Y. Prefere comunicações objetivas via WhatsApp pela manhã.',
      )
      app.save(contatoHelena)
    }

    // 6. Seed Cards
    const cardsCol = app.findCollectionByNameOrId('cards')
    try {
      app.findFirstRecordByData('cards', 'titulo', 'Validar protótipo de checkout Loja Y')
    } catch (_) {
      const card1 = new Record(cardsCol)
      card1.set('titulo', 'Validar protótipo de checkout Loja Y')
      card1.set(
        'descricao',
        'Apresentar fluxo simplificado de pagamento PIX e cartão com checkout transparente.',
      )
      card1.set('projeto', projetoLojaY.id)
      card1.set('negocio', negocioY.id)
      card1.set('contato', contatoHelena.id)
      card1.set('tags', JSON.stringify(['revisao', 'decisao', 'pagamento']))
      card1.set('prioridade', 'alta')
      card1.set('status', 'em_andamento')
      card1.set(
        'proximo_passo',
        'Enviar link interativo do Figma e colher aprovação da Helena até quinta-feira.',
      )
      card1.set('responsavel', adminUser.id)
      card1.set('criado_por_ia', false)
      app.save(card1)

      const card2 = new Record(cardsCol)
      card2.set('titulo', 'Definição de tabela de precificação para coleção de inverno')
      card2.set(
        'descricao',
        'Calcular margem de contribuição com fornecedores e posicionamento frente à concorrência.',
      )
      card2.set('projeto', projetoLojaY.id)
      card2.set('negocio', negocioY.id)
      card2.set('contato', contatoHelena.id)
      card2.set('tags', JSON.stringify(['precos', 'posicionamento']))
      card2.set('prioridade', 'media')
      card2.set('status', 'novo')
      card2.set('proximo_passo', 'Reunir planilha de custos da equipe financeira.')
      card2.set('responsavel', adminUser.id)
      card2.set('criado_por_ia', true)
      app.save(card2)
    }

    // 7. Seed Clientes (painel e portal)
    const clientesCol = app.findCollectionByNameOrId('clientes')
    let clienteY
    try {
      clienteY = app.findFirstRecordByData(
        'clientes',
        'email',
        'helena.martins@lojayecommerce.com.br',
      )
    } catch (_) {
      clienteY = new Record(clientesCol)
      clienteY.set('nome', 'Helena Martins')
      clienteY.set('email', 'helena.martins@lojayecommerce.com.br')
      clienteY.set('telefone', '+55 (11) 98765-4321')
      clienteY.set('empresa', 'Loja Y')
      clienteY.set('cadastrado_por', adminUser.id)
      clienteY.set('tags', JSON.stringify(['varejo', 'ecommerce', 'vip']))
      app.save(clienteY)
    }

    // 8. Seed Clientes_Projetos
    const cpCol = app.findCollectionByNameOrId('clientes_projetos')
    try {
      app.findFirstRecordByData('clientes_projetos', 'cliente', clienteY.id)
    } catch (_) {
      const cp = new Record(cpCol)
      cp.set('cliente', clienteY.id)
      cp.set('projeto', projetoLojaY.id)
      cp.set('acesso_ativado', true)
      app.save(cp)
    }

    // 9. Seed Resumo do Dia inicial
    const resumosCol = app.findCollectionByNameOrId('resumos_dia')
    const hoje = new Date().toISOString().split('T')[0]
    try {
      app.findFirstRecordByData('resumos_dia', 'data', hoje)
    } catch (_) {
      const resumo = new Record(resumosCol)
      resumo.set('data', hoje)
      resumo.set(
        'feito',
        '- Alinhamento com Helena Martins sobre arquitetura do novo e-commerce.\n- Configuração do Segundo Cérebro e onboarding institucional.',
      )
      resumo.set(
        'a_fazer',
        '- Enviar protótipo de checkout interativo para a diretoria da Loja Y.\n- Consolidar tabela de custos para precificação da coleção.',
      )
      resumo.set(
        'prioridades',
        'Aprovação do checkout até o fim da semana para liberação do squad técnico.',
      )
      resumo.set(
        'decisoes',
        'Adotar paleta de cor verde profundo (#0F766E) com design minimalista de alta conversão.',
      )
      resumo.set(
        'proximos_passos',
        'Agendar call de demonstração às 14h de amanhã com stakeholders.',
      )
      resumo.set('contagem_cards_criados', 2)
      app.save(resumo)
    }
  },
  (app) => {
    // Safe rollback
  },
)
