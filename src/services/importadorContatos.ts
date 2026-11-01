export interface ContatoImportado {
  idTemp: string
  nome: string
  empresa?: string
  email?: string
  telefone?: string
  cargo?: string
  origem: 'importado'
  tags: string[]
  isDuplicado?: boolean
  motivoDuplicata?: string
  selecionado: boolean
}

/**
 * Normaliza número de telefone removendo formatação para comparação de duplicata
 */
export function normalizarTelefone(tel?: string): string {
  if (!tel) return ''
  return tel.replace(/\D/g, '')
}

/**
 * Normaliza nome para comparação case-insensitive
 */
export function normalizarNome(nome?: string): string {
  if (!nome) return ''
  return nome
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
}

/**
 * Decodifica texto em quoted-printable ou escaped vCard (\n, \;, \,, etc.)
 */
function decodificarValorVCard(valor: string, encoding?: string, charset?: string): string {
  let res = valor

  if (encoding && encoding.toUpperCase() === 'QUOTED-PRINTABLE') {
    // Decodificar quoted-printable
    res = res.replace(/=([0-9A-Fa-f]{2})/g, (_, hex) => {
      return String.fromCharCode(parseInt(hex, 16))
    })
    // Se o charset for UTF-8 e foi decodificado como latin1, tentar converter bytes se necessário
    try {
      if (charset && charset.toUpperCase().includes('UTF-8')) {
        res = decodeURIComponent(escape(res))
      }
    } catch {
      // mantém como está
    }
  }

  // Remove quebras e escapes de barra invertida do vCard: \n -> newline, \, -> ,, \; -> ;
  res = res
    .replace(/\\n/gi, ' ')
    .replace(/\\r/gi, '')
    .replace(/\\,/g, ',')
    .replace(/\\;/g, ';')
    .replace(/\\\\/g, '\\')

  return res.trim()
}

/**
 * Desdobra linhas de vCard (unfolding RFC 2425/2426/6350)
 * Linhas que começam com espaço ou tabulação são continuação da linha anterior
 */
function desdobrarLinhasVCard(vcfTexto: string): string[] {
  const rawLines = vcfTexto.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n')
  const linhasDesdobradas: string[] = []

  for (const rawLine of rawLines) {
    if ((rawLine.startsWith(' ') || rawLine.startsWith('\t')) && linhasDesdobradas.length > 0) {
      linhasDesdobradas[linhasDesdobradas.length - 1] += rawLine.slice(1)
    } else if (rawLine.trim().length > 0) {
      linhasDesdobradas.push(rawLine.trim())
    }
  }

  return linhasDesdobradas
}

/**
 * Faz parse de conteúdo vCard (.vcf) nativamente
 * Suporta múltiplos contatos BEGIN:VCARD ... END:VCARD
 * Suporta vCard v2.1, v3.0 e v4.0 (formato padrão do iPhone / iCloud)
 */
export function parseVCard(vcfContent: string): ContatoImportado[] {
  if (!vcfContent) return []

  const linhas = desdobrarLinhasVCard(vcfContent)
  const contatos: ContatoImportado[] = []

  let emCard = false
  let fn: string | null = null
  let nParts: {
    sobrenome?: string
    primeiro?: string
    outros?: string
    prefixo?: string
    sufixo?: string
  } | null = null
  let telefones: { tipo: string; numero: string; preferido: boolean }[] = []
  let emails: string[] = []
  let org: string | null = null
  let title: string | null = null

  const resetVCard = () => {
    fn = null
    nParts = null
    telefones = []
    emails = []
    org = null
    title = null
  }

  const salvarContatoAtual = () => {
    let nomeFinal = fn?.trim() || ''

    if (!nomeFinal && nParts) {
      const nomes = [nParts.primeiro, nParts.outros, nParts.sobrenome].filter(Boolean)
      nomeFinal = nomes.join(' ').trim()
    }

    // Se ainda assim não tiver nome, tenta usar empresa ou e-mail se existir
    if (!nomeFinal) {
      if (org) nomeFinal = org.trim()
      else if (emails[0]) nomeFinal = emails[0].split('@')[0]
      else if (telefones[0]) nomeFinal = `Contato ${telefones[0].numero}`
    }

    if (nomeFinal) {
      // Escolher melhor telefone (preferido ou CELL/MOBILE ou o primeiro)
      let melhorTelefone = ''
      if (telefones.length > 0) {
        const cel = telefones.find((t) => t.preferido || /cell|mobile|celular/i.test(t.tipo))
        melhorTelefone = (cel ? cel.numero : telefones[0].numero).trim()
      }

      contatos.push({
        idTemp: `vcf_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
        nome: nomeFinal,
        empresa: org?.trim() || undefined,
        email: emails[0]?.trim() || undefined,
        telefone: melhorTelefone || undefined,
        cargo: title?.trim() || undefined,
        origem: 'importado',
        tags: ['importado', 'vcard', 'icloud'],
        selecionado: true,
      })
    }
  }

  for (const linha of linhas) {
    const idxDoisPontos = linha.indexOf(':')
    if (idxDoisPontos === -1) continue

    const propEParam = linha.slice(0, idxDoisPontos)
    const valorCru = linha.slice(idxDoisPontos + 1)

    // Separar nome da propriedade e parâmetros (ex: TEL;TYPE=CELL,VOICE;PREF)
    const partesProp = propEParam.split(';')
    const propNome = partesProp[0].trim().toUpperCase()
    const params = partesProp.slice(1)

    // Analisar parâmetros como ENCODING=QUOTED-PRINTABLE e CHARSET=UTF-8
    let encoding: string | undefined
    let charset: string | undefined
    const tipos: string[] = []
    let isPref = false

    for (const p of params) {
      const [chave, val] = p.split('=')
      const chaveUpper = chave.trim().toUpperCase()
      const valUpper = val ? val.trim().toUpperCase() : ''

      if (chaveUpper === 'ENCODING') encoding = valUpper
      else if (chaveUpper === 'CHARSET') charset = valUpper
      else if (chaveUpper === 'TYPE') {
        tipos.push(valUpper)
        if (valUpper.includes('PREF')) isPref = true
      } else if (chaveUpper === 'PREF') {
        isPref = true
      } else {
        // Pode ser apenas TYPE diretamente no v2.1 (ex: TEL;CELL;VOICE:)
        tipos.push(chaveUpper)
        if (chaveUpper === 'PREF') isPref = true
      }
    }

    const valor = decodificarValorVCard(valorCru, encoding, charset)

    if (propNome === 'BEGIN' && valor.toUpperCase() === 'VCARD') {
      emCard = true
      resetVCard()
      continue
    }

    if (propNome === 'END' && valor.toUpperCase() === 'VCARD') {
      if (emCard) {
        salvarContatoAtual()
        emCard = false
      }
      resetVCard()
      continue
    }

    if (!emCard) continue

    // Extrair FN (Formatted Name)
    if (propNome === 'FN' && valor) {
      fn = valor
    }

    // Extrair N (Structured Name: Sobrenome;Primeiro;Outros;Prefixo;Sufixo)
    if (propNome === 'N' && valor) {
      const parts = valor.split(';').map((s) => s.trim())
      nParts = {
        sobrenome: parts[0] || '',
        primeiro: parts[1] || '',
        outros: parts[2] || '',
        prefixo: parts[3] || '',
        sufixo: parts[4] || '',
      }
    }

    // Extrair TEL
    if (propNome === 'TEL' && valor) {
      telefones.push({
        tipo: tipos.join(','),
        numero: valor,
        preferido: isPref,
      })
    }

    // Extrair EMAIL
    if (propNome === 'EMAIL' && valor) {
      emails.push(valor)
    }

    // Extrair ORG (Organização / Empresa)
    if (propNome === 'ORG' && valor) {
      // No vCard, ORG pode ser "Empresa;Departamento;Setor"
      const orgLimpo = valor.split(';')[0]?.trim()
      if (orgLimpo) org = orgLimpo
    }

    // Extrair TITLE (Cargo)
    if (propNome === 'TITLE' && valor) {
      title = valor.trim()
    }
  }

  // Caso o arquivo termine sem END:VCARD explícito
  if (emCard) {
    salvarContatoAtual()
  }

  return contatos
}

/**
 * Faz parse de conteúdo CSV de contatos
 * Suporta vírgula ou ponto-e-vírgula como delimitador
 * Cabeçalhos comuns: Nome, Empresa, Email, Telefone, Cargo
 */
export function parseCSV(csvContent: string): ContatoImportado[] {
  if (!csvContent) return []

  const lines = csvContent
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean)

  if (lines.length === 0) return []

  // Descobrir delimitador pela primeira linha (; ou ,)
  const primeiraLinha = lines[0]
  const countPontoVirgula = (primeiraLinha.match(/;/g) || []).length
  const countVirgula = (primeiraLinha.match(/,/g) || []).length
  const sep = countPontoVirgula >= countVirgula && countPontoVirgula > 0 ? ';' : ','

  const contatos: ContatoImportado[] = []

  let startIndex = 0
  const cabecalho = lines[0].toLowerCase()
  // Se a primeira linha contiver cabeçalho reconhecido, pula
  if (cabecalho.includes('nome') || cabecalho.includes('name') || cabecalho.includes('email')) {
    startIndex = 1
  }

  for (let i = startIndex; i < lines.length; i++) {
    const line = lines[i]
    if (!line) continue

    // Divisão respeitando aspas básicas se houver
    const parts = line.split(sep).map((p) => p.replace(/^"(.*)"$/, '$1').trim())
    if (parts.length < 1 || !parts[0]) continue

    const [cNome, cEmpresa, cEmail, cTelefone, cCargo] = parts

    contatos.push({
      idTemp: `csv_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
      nome: cNome,
      empresa: cEmpresa || undefined,
      email: cEmail || undefined,
      telefone: cTelefone || undefined,
      cargo: cCargo || undefined,
      origem: 'importado',
      tags: ['importado', 'csv'],
      selecionado: true,
    })
  }

  return contatos
}

/**
 * Marca duplicatas comparando contatos a importar com a base de contatos existente
 * e também duplicatas internas do próprio arquivo.
 */
export function verificarDuplicatas(
  novos: ContatoImportado[],
  existentes: { nome?: string; telefone?: string; email?: string }[],
): ContatoImportado[] {
  // Índices para busca rápida
  const nomesExistentes = new Set(existentes.map((e) => normalizarNome(e.nome)).filter(Boolean))
  const telefonesExistentes = new Set(
    existentes.map((e) => normalizarTelefone(e.telefone)).filter((t) => t.length >= 8),
  )
  const emailsExistentes = new Set(
    existentes.map((e) => e.email?.trim().toLowerCase()).filter(Boolean),
  )

  // Rastrear dentro do próprio lote novo
  const nomesNoLote = new Set<string>()
  const telefonesNoLote = new Set<string>()
  const emailsNoLote = new Set<string>()

  return novos.map((item) => {
    const nomeNorm = normalizarNome(item.nome)
    const telNorm = normalizarTelefone(item.telefone)
    const emailNorm = item.email?.trim().toLowerCase()

    let motivo: string | undefined
    let isDup = false

    // Verificar se já existe na base
    if (telNorm.length >= 8 && telefonesExistentes.has(telNorm)) {
      isDup = true
      motivo = 'Telefone já cadastrado no sistema'
    } else if (emailNorm && emailsExistentes.has(emailNorm)) {
      isDup = true
      motivo = 'E-mail já cadastrado no sistema'
    } else if (nomeNorm && nomesExistentes.has(nomeNorm)) {
      isDup = true
      motivo = 'Nome idêntico a contato já cadastrado'
    }
    // Verificar se repete dentro do arquivo
    else if (telNorm.length >= 8 && telefonesNoLote.has(telNorm)) {
      isDup = true
      motivo = 'Duplicado no próprio arquivo (mesmo telefone)'
    } else if (emailNorm && emailsNoLote.has(emailNorm)) {
      isDup = true
      motivo = 'Duplicado no próprio arquivo (mesmo e-mail)'
    } else if (nomeNorm && nomesNoLote.has(nomeNorm)) {
      isDup = true
      motivo = 'Duplicado no próprio arquivo (mesmo nome)'
    }

    if (nomeNorm) nomesNoLote.add(nomeNorm)
    if (telNorm.length >= 8) telefonesNoLote.add(telNorm)
    if (emailNorm) emailsNoLote.add(emailNorm)

    return {
      ...item,
      isDuplicado: isDup,
      motivoDuplicata: motivo,
      // Se for duplicado, por padrão desmarcar para não importar duplicado
      selecionado: !isDup,
    }
  })
}
