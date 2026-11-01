import React, { useState, useRef } from 'react'
import {
  Upload,
  FileText,
  AlertTriangle,
  CheckCircle2,
  Users,
  Building,
  Mail,
  Phone,
  Briefcase,
  X,
  FileSpreadsheet,
  Check,
  Filter,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { useToast } from '@/hooks/use-toast'
import { diamondApi } from '@/services/diamondApi'
import type { Contato } from '@/types'
import {
  type ContatoImportado,
  parseVCard,
  parseCSV,
  verificarDuplicatas,
} from '@/services/importadorContatos'

interface ModalImportarContatosProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  contatosExistentes: Contato[]
  onSucesso: () => void
}

export function ModalImportarContatos({
  open,
  onOpenChange,
  contatosExistentes,
  onSucesso,
}: ModalImportarContatosProps) {
  const { toast } = useToast()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [etapa, setEtapa] = useState<'selecionar' | 'previa'>('selecionar')
  const [tipoOrigem, setTipoOrigem] = useState<'vcf' | 'csv'>('vcf')
  const [nomeArquivo, setNomeArquivo] = useState('')
  const [tamanhoArquivo, setTamanhoArquivo] = useState('')
  const [contatosParaPrevia, setContatosParaPrevia] = useState<ContatoImportado[]>([])
  const [processandoArquivo, setProcessandoArquivo] = useState(false)
  const [importando, setImportando] = useState(false)
  const [progresso, setProgresso] = useState({ atual: 0, total: 0 })
  const [filtroPrevia, setFiltroPrevia] = useState<'todos' | 'duplicados' | 'novos'>('todos')
  const [textoManual, setTextoManual] = useState('')

  const resetar = () => {
    setEtapa('selecionar')
    setNomeArquivo('')
    setTamanhoArquivo('')
    setContatosParaPrevia([])
    setProcessandoArquivo(false)
    setImportando(false)
    setProgresso({ atual: 0, total: 0 })
    setFiltroPrevia('todos')
    setTextoManual('')
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const handleModalClose = (aberto: boolean) => {
    if (!aberto && !importando) {
      resetar()
    }
    onOpenChange(aberto)
  }

  const processarConteudoTexto = (conteudo: string, formato: 'vcf' | 'csv', nome = '') => {
    setProcessandoArquivo(true)
    try {
      let extraidos: ContatoImportado[] = []

      if (formato === 'vcf' || conteudo.includes('BEGIN:VCARD')) {
        extraidos = parseVCard(conteudo)
      } else {
        extraidos = parseCSV(conteudo)
      }

      if (extraidos.length === 0) {
        toast({
          title: 'Nenhum contato encontrado',
          description:
            formato === 'vcf'
              ? 'O arquivo .vcf não contém blocos BEGIN:VCARD válidos com nome ou dados de contato.'
              : 'O conteúdo CSV não possui linhas válidas no formato esperado.',
          variant: 'destructive',
        })
        setProcessandoArquivo(false)
        return
      }

      // Passar pelo filtro de duplicatas contra os contatos do sistema
      const contatosAvaliados = verificarDuplicatas(extraidos, contatosExistentes)

      setContatosParaPrevia(contatosAvaliados)
      setNomeArquivo(nome || (formato === 'vcf' ? 'contatos.vcf' : 'contatos.csv'))
      setEtapa('previa')
    } catch (err) {
      console.error(err)
      toast({
        title: 'Erro ao processar arquivo',
        description: (err as Error)?.message || 'Não foi possível ler o arquivo selecionado.',
        variant: 'destructive',
      })
    } finally {
      setProcessandoArquivo(false)
    }
  }

  const handleArquivoSelecionado = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const ext = file.name.split('.').pop()?.toLowerCase() || ''
    const formato: 'vcf' | 'csv' = ext === 'vcf' ? 'vcf' : 'csv'

    setNomeArquivo(file.name)
    setTamanhoArquivo(`${(file.size / 1024).toFixed(1)} KB`)
    setTipoOrigem(formato)

    const reader = new FileReader()
    reader.onload = (event) => {
      const conteudo = (event.target?.result as string) || ''
      processarConteudoTexto(conteudo, formato, file.name)
    }
    reader.onerror = () => {
      toast({ title: 'Erro ao ler arquivo', variant: 'destructive' })
    }
    reader.readAsText(file, 'utf-8')
  }

  const handleProcessarManual = () => {
    if (!textoManual.trim()) {
      toast({ title: 'Insira o conteúdo para importação', variant: 'destructive' })
      return
    }

    const formato: 'vcf' | 'csv' = textoManual.includes('BEGIN:VCARD') ? 'vcf' : 'csv'
    setTipoOrigem(formato)
    processarConteudoTexto(textoManual, formato, 'Texto colado manualmente')
  }

  const alternarSelecao = (idTemp: string) => {
    setContatosParaPrevia((prev) =>
      prev.map((c) => (c.idTemp === idTemp ? { ...c, selecionado: !c.selecionado } : c)),
    )
  }

  const selecionarTodos = (selecionar: boolean) => {
    setContatosParaPrevia((prev) => prev.map((c) => ({ ...c, selecionado: selecionar })))
  }

  const selecionarApenasNaoDuplicados = () => {
    setContatosParaPrevia((prev) => prev.map((c) => ({ ...c, selecionado: !c.isDuplicado })))
  }

  const handleConfirmarImportacao = async () => {
    const contatosAImportar = contatosParaPrevia.filter((c) => c.selecionado)

    if (contatosAImportar.length === 0) {
      toast({
        title: 'Nenhum contato selecionado',
        description: 'Selecione pelo menos um contato para importar.',
        variant: 'destructive',
      })
      return
    }

    setImportando(true)
    setProgresso({ atual: 0, total: contatosAImportar.length })

    let importados = 0
    let falhas = 0

    for (let i = 0; i < contatosAImportar.length; i++) {
      const c = contatosAImportar[i]
      try {
        await diamondApi.createContato({
          nome: c.nome,
          empresa: c.empresa || undefined,
          email: c.email || undefined,
          telefone: c.telefone || undefined,
          cargo: c.cargo || undefined,
          origem: 'importado',
          tags: c.tags,
        })
        importados++
      } catch (err) {
        console.warn('Erro ao importar contato:', c.nome, err)
        falhas++
      }
      setProgresso({ atual: i + 1, total: contatosAImportar.length })
    }

    setImportando(false)

    toast({
      title: 'Importação concluída com sucesso!',
      description: `${importados} contato(s) adicionado(s) à sua agenda.${falhas > 0 ? ` (${falhas} falha(s))` : ''}`,
    })

    resetar()
    onOpenChange(false)
    onSucesso()
  }

  // Filtragem na prévia
  const contatosFiltrados = contatosParaPrevia.filter((c) => {
    if (filtroPrevia === 'duplicados') return c.isDuplicado
    if (filtroPrevia === 'novos') return !c.isDuplicado
    return true
  })

  const totalSelecionados = contatosParaPrevia.filter((c) => c.selecionado).length
  const totalDuplicados = contatosParaPrevia.filter((c) => c.isDuplicado).length
  const totalNovos = contatosParaPrevia.filter((c) => !c.isDuplicado).length

  return (
    <Dialog open={open} onOpenChange={handleModalClose}>
      <DialogContent className="max-w-2xl bg-white border border-[#E5E1D8] p-0 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Cabeçalho */}
        <DialogHeader className="p-5 pb-4 border-b border-[#E5E1D8] bg-[#FAFAF9]">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-lg bg-[#0F766E]/10 flex items-center justify-center text-[#0F766E]">
                <Upload className="w-5 h-5" />
              </div>
              <div>
                <DialogTitle className="text-base font-bold text-[#1A1D21]">
                  Importar Contatos (.vcf / .csv)
                </DialogTitle>
                <p className="text-xs text-[#5B6470] mt-0.5">
                  Importe contatos exportados do iPhone/iCloud (.vcf) ou planilhas (.csv).
                </p>
              </div>
            </div>
            {etapa === 'previa' && (
              <Badge variant="outline" className="text-[11px] font-medium border-[#E5E1D8]">
                {contatosParaPrevia.length} contatos encontrados
              </Badge>
            )}
          </div>
        </DialogHeader>

        {/* Conteúdo Etapa 1: Selecionar Arquivo */}
        {etapa === 'selecionar' && (
          <div className="p-5 space-y-4 overflow-y-auto">
            <Tabs defaultValue="arquivo" className="w-full">
              <TabsList className="grid w-full grid-cols-2 bg-[#F4F2EE] h-9 p-1">
                <TabsTrigger value="arquivo" className="text-xs">
                  Selecionar Arquivo (.vcf ou .csv)
                </TabsTrigger>
                <TabsTrigger value="manual" className="text-xs">
                  Colar Conteúdo
                </TabsTrigger>
              </TabsList>

              {/* Aba Arquivo */}
              <TabsContent value="arquivo" className="space-y-4 pt-3">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".vcf,.csv,text/vcard,text/x-vcard,text/csv"
                  className="hidden"
                  onChange={handleArquivoSelecionado}
                />

                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="border-2 border-dashed border-[#E5E1D8] hover:border-[#0F766E] rounded-xl p-8 text-center cursor-pointer transition-colors bg-[#FAFAF9] hover:bg-[#0F766E]/5 group"
                >
                  <div className="w-12 h-12 rounded-full bg-white border border-[#E5E1D8] group-hover:border-[#0F766E]/40 mx-auto flex items-center justify-center text-[#0F766E] shadow-2xs mb-3">
                    <Upload className="w-6 h-6" />
                  </div>
                  <h4 className="text-sm font-semibold text-[#1A1D21]">
                    Clique para escolher o arquivo
                  </h4>
                  <p className="text-xs text-[#5B6470] mt-1 max-w-sm mx-auto">
                    Suporta arquivos <strong>.vcf</strong> (vCard do iPhone, iCloud, Mac, Google) e{' '}
                    <strong>.csv</strong> (planilhas de contatos).
                  </p>
                  <div className="flex items-center justify-center gap-2 mt-4">
                    <Badge
                      variant="secondary"
                      className="bg-white border border-[#E5E1D8] text-[11px] text-[#1A1D21] gap-1"
                    >
                      <FileText className="w-3 h-3 text-[#0F766E]" />
                      .vcf (iCloud / vCard)
                    </Badge>
                    <Badge
                      variant="secondary"
                      className="bg-white border border-[#E5E1D8] text-[11px] text-[#1A1D21] gap-1"
                    >
                      <FileSpreadsheet className="w-3 h-3 text-[#0F766E]" />
                      .csv (Planilha)
                    </Badge>
                  </div>
                </div>

                <div className="bg-[#F4F2EE]/60 rounded-lg p-3 text-[11px] text-[#5B6470] space-y-1 border border-[#E5E1D8]/60">
                  <p className="font-semibold text-[#1A1D21] flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-[#0F766E]" />
                    Como exportar do iPhone / iCloud em .vcf:
                  </p>
                  <p>
                    Acesse <strong>icloud.com/contacts</strong> no computador ou celular, selecione
                    seus contatos e clique na engrenagem/menu &gt;{' '}
                    <strong>&quot;Exportar vCard...&quot;</strong>.
                  </p>
                  <p className="text-[#5B6470]">
                    O sistema extrai automaticamente nome, telefone principal/celular, e-mail e
                    empresa.
                  </p>
                </div>
              </TabsContent>

              {/* Aba Manual */}
              <TabsContent value="manual" className="space-y-3 pt-3">
                <p className="text-xs text-[#5B6470]">
                  Cole o código vCard (BEGIN:VCARD...) ou linhas CSV (Nome, Empresa, Email,
                  Telefone, Cargo):
                </p>
                <textarea
                  rows={8}
                  value={textoManual}
                  onChange={(e) => setTextoManual(e.target.value)}
                  placeholder={`Exemplo vCard:\nBEGIN:VCARD\nVERSION:3.0\nFN:Helena Martins\nTEL;TYPE=CELL:11987654321\nEMAIL:helena@empresa.com\nORG:Loja Y\nEND:VCARD\n\nOu CSV:\nNome, Empresa, Email, Telefone, Cargo\nHelena Martins, Loja Y, helena@lojay.com, 11987654321, Diretora`}
                  className="w-full text-xs p-3 font-mono border border-[#E5E1D8] rounded-md bg-[#FAFAF9]"
                />
                <Button
                  size="sm"
                  onClick={handleProcessarManual}
                  className="w-full bg-[#0F766E] hover:bg-[#0D5C56] text-white text-xs h-9"
                >
                  Carregar Prévia de Contatos
                </Button>
              </TabsContent>
            </Tabs>
          </div>
        )}

        {/* Conteúdo Etapa 2: Prévia e Duplicatas */}
        {etapa === 'previa' && (
          <div className="flex-1 flex flex-col min-h-0">
            {/* Barra de Status e Filtros */}
            <div className="p-4 bg-[#FAFAF9] border-b border-[#E5E1D8] space-y-2.5">
              <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-[#1A1D21] truncate max-w-[200px]">
                    {nomeArquivo}
                  </span>
                  {tamanhoArquivo && (
                    <span className="text-[#5B6470] text-[11px]">({tamanhoArquivo})</span>
                  )}
                  <Badge className="bg-[#0F766E]/10 text-[#0F766E] border-none text-[10px] uppercase">
                    {tipoOrigem}
                  </Badge>
                </div>

                <div className="flex items-center gap-1.5 text-xs">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => selecionarTodos(true)}
                    className="h-7 text-[11px] px-2 text-[#0F766E]"
                  >
                    Marcar Todos
                  </Button>
                  <span className="text-[#E5E1D8]">|</span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={selecionarApenasNaoDuplicados}
                    className="h-7 text-[11px] px-2 text-[#5B6470]"
                  >
                    Desmarcar Duplicados
                  </Button>
                  <span className="text-[#E5E1D8]">|</span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => selecionarTodos(false)}
                    className="h-7 text-[11px] px-2 text-[#5B6470]"
                  >
                    Limpar
                  </Button>
                </div>
              </div>

              {/* Botões de filtro */}
              <div className="flex items-center gap-1.5">
                <Button
                  size="sm"
                  variant={filtroPrevia === 'todos' ? 'default' : 'outline'}
                  onClick={() => setFiltroPrevia('todos')}
                  className={`h-7 text-[11px] px-2.5 ${filtroPrevia === 'todos' ? 'bg-[#1A1D21] text-white' : 'border-[#E5E1D8] text-[#5B6470]'}`}
                >
                  Todos ({contatosParaPrevia.length})
                </Button>
                <Button
                  size="sm"
                  variant={filtroPrevia === 'novos' ? 'default' : 'outline'}
                  onClick={() => setFiltroPrevia('novos')}
                  className={`h-7 text-[11px] px-2.5 ${filtroPrevia === 'novos' ? 'bg-[#0F766E] text-white' : 'border-[#E5E1D8] text-[#0F766E]'}`}
                >
                  <CheckCircle2 className="w-3 h-3 mr-1" />
                  Novos ({totalNovos})
                </Button>
                {totalDuplicados > 0 && (
                  <Button
                    size="sm"
                    variant={filtroPrevia === 'duplicados' ? 'default' : 'outline'}
                    onClick={() => setFiltroPrevia('duplicados')}
                    className={`h-7 text-[11px] px-2.5 ${filtroPrevia === 'duplicados' ? 'bg-amber-600 text-white' : 'border-amber-200 text-amber-700 bg-amber-50'}`}
                  >
                    <AlertTriangle className="w-3 h-3 mr-1" />
                    Duplicados ({totalDuplicados})
                  </Button>
                )}
              </div>
            </div>

            {/* Lista com scroll */}
            <div className="flex-1 overflow-y-auto divide-y divide-[#E5E1D8] p-2 space-y-1 max-h-[380px]">
              {contatosFiltrados.map((item) => (
                <div
                  key={item.idTemp}
                  onClick={() => alternarSelecao(item.idTemp)}
                  className={`p-3 rounded-lg border transition-colors cursor-pointer flex items-start gap-3 ${
                    item.selecionado
                      ? item.isDuplicado
                        ? 'bg-amber-50/60 border-amber-200'
                        : 'bg-teal-50/40 border-[#0F766E]/30'
                      : 'bg-white border-[#E5E1D8]/60 opacity-60 hover:opacity-100'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={item.selecionado}
                    onChange={() => alternarSelecao(item.idTemp)}
                    onClick={(e) => e.stopPropagation()}
                    className="mt-1 rounded border-gray-300 text-[#0F766E] focus:ring-[#0F766E]"
                  />

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-[#1A1D21] truncate">
                          {item.nome}
                        </span>
                        {item.cargo && (
                          <span className="text-[11px] text-[#5B6470] truncate">
                            · {item.cargo}
                          </span>
                        )}
                      </div>
                      {item.isDuplicado ? (
                        <Badge
                          variant="outline"
                          className="bg-amber-50 text-amber-700 border-amber-300 text-[10px] shrink-0 gap-1"
                        >
                          <AlertTriangle className="w-2.5 h-2.5" />
                          Duplicata
                        </Badge>
                      ) : (
                        <Badge
                          variant="outline"
                          className="bg-emerald-50 text-emerald-700 border-emerald-200 text-[10px] shrink-0"
                        >
                          Novo
                        </Badge>
                      )}
                    </div>

                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-[#5B6470] mt-1">
                      {item.empresa && (
                        <span className="flex items-center gap-1 font-medium text-[#1A1D21]">
                          <Building className="w-3 h-3 text-[#0F766E]" />
                          <span>{item.empresa}</span>
                        </span>
                      )}
                      {item.telefone && (
                        <span className="flex items-center gap-1">
                          <Phone className="w-3 h-3 text-[#0F766E]" />
                          <span>{item.telefone}</span>
                        </span>
                      )}
                      {item.email && (
                        <span className="flex items-center gap-1 truncate max-w-[200px]">
                          <Mail className="w-3 h-3" />
                          <span className="truncate">{item.email}</span>
                        </span>
                      )}
                    </div>

                    {item.isDuplicado && item.motivoDuplicata && (
                      <p className="text-[10px] text-amber-700 mt-1 font-medium">
                        ⚠️ {item.motivoDuplicata}
                      </p>
                    )}
                  </div>
                </div>
              ))}

              {contatosFiltrados.length === 0 && (
                <div className="p-8 text-center text-xs text-[#5B6470]">
                  Nenhum contato encontrado neste filtro.
                </div>
              )}
            </div>

            {/* Barra de Progresso durante importação */}
            {importando && (
              <div className="p-3 bg-teal-50 border-t border-[#0F766E]/20 text-xs text-[#0F766E] flex items-center justify-between">
                <span>
                  Importando contatos... ({progresso.atual} de {progresso.total})
                </span>
                <div className="w-24 bg-teal-200 rounded-full h-2 overflow-hidden">
                  <div
                    className="bg-[#0F766E] h-full transition-all"
                    style={{
                      width: `${progresso.total > 0 ? (progresso.atual / progresso.total) * 100 : 0}%`,
                    }}
                  />
                </div>
              </div>
            )}
          </div>
        )}

        {/* Rodapé */}
        <DialogFooter className="p-4 border-t border-[#E5E1D8] bg-[#FAFAF9] flex items-center justify-between sm:justify-between">
          {etapa === 'previa' ? (
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setEtapa('selecionar')}
                disabled={importando}
                className="text-xs border-[#E5E1D8]"
              >
                Voltar
              </Button>
              <div className="flex items-center gap-2">
                <span className="text-xs text-[#5B6470]">
                  {totalSelecionados} selecionado(s) para importar
                </span>
                <Button
                  size="sm"
                  onClick={handleConfirmarImportacao}
                  disabled={importando || totalSelecionados === 0}
                  className="bg-[#0F766E] hover:bg-[#0D5C56] text-white text-xs h-8 px-4 gap-1.5"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>
                    {importando ? 'Importando...' : `Confirmar Importação (${totalSelecionados})`}
                  </span>
                </Button>
              </div>
            </>
          ) : (
            <div className="w-full flex justify-end">
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleModalClose(false)}
                className="text-xs"
              >
                Cancelar
              </Button>
            </div>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
