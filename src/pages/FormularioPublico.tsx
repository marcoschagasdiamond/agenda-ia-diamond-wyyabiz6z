import React, { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { diamondApi } from '@/services/diamondApi'
import type { Formulario, FormCampoConfig } from '@/types'
import {
  FileText,
  CheckCircle2,
  Send,
  AlertCircle,
  Calendar,
  Clock,
  Sparkles,
  Star,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

export default function FormularioPublico() {
  const { slug } = useParams<{ slug: string }>()
  const [formulario, setFormulario] = useState<Formulario | null>(null)
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState<string | null>(null)

  // Estado das respostas dos campos
  const [respostas, setRespostas] = useState<Record<string, any>>({})
  const [nomeRespondente, setNomeRespondente] = useState('')
  const [emailRespondente, setEmailRespondente] = useState('')
  const [enviando, setEnviando] = useState(false)
  const [sucesso, setSucesso] = useState(false)

  useEffect(() => {
    async function carregar() {
      if (!slug) {
        setErro('Endereço de formulário inválido.')
        setCarregando(false)
        return
      }
      try {
        const f = await diamondApi.getFormularioPorSlug(slug)
        if (!f) {
          setErro('Formulário não encontrado ou não está mais ativo.')
        } else if (!f.publicado) {
          setErro('Este formulário está em rascunho e ainda não foi publicado.')
        } else {
          setFormulario(f)
        }
      } catch (e: any) {
        setErro('Não foi possível carregar as informações deste formulário.')
      } finally {
        setCarregando(false)
      }
    }
    carregar()
  }, [slug])

  const handleValorChange = (campoId: string, valor: any) => {
    setRespostas((prev) => ({
      ...prev,
      [campoId]: valor,
    }))
  }

  const handleMultiplaEscolhaChange = (campoId: string, opcao: string, checked: boolean) => {
    const atuais: string[] = Array.isArray(respostas[campoId]) ? [...respostas[campoId]] : []
    let novos: string[]
    if (checked) {
      novos = [...atuais, opcao]
    } else {
      novos = atuais.filter((o) => o !== opcao)
    }
    handleValorChange(campoId, novos)
  }

  const handleEnviar = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formulario) return

    // Validação de obrigatórios (ignora titulo_secao)
    const camposList: FormCampoConfig[] = Array.isArray(formulario.campos) ? formulario.campos : []
    for (const c of camposList) {
      if (c.tipo === 'titulo_secao') continue
      if (c.obrigatorio) {
        const val = respostas[c.id]
        if (
          val === undefined ||
          val === null ||
          val === '' ||
          (Array.isArray(val) && val.length === 0)
        ) {
          alert(`Por favor, preencha o campo obrigatório: "${c.label}"`)
          return
        }
      }
    }

    setEnviando(true)
    try {
      // Extrair nome ou e-mail caso tenham sido preenchidos em campos do formulário
      let detectNome = nomeRespondente
      let detectEmail = emailRespondente
      camposList.forEach((c) => {
        if (c.tipo === 'email' && respostas[c.id]) {
          detectEmail = String(respostas[c.id])
        }
        if (c.tipo === 'texto' && /nome/i.test(c.label) && respostas[c.id]) {
          detectNome = String(respostas[c.id])
        }
      })

      await diamondApi.enviarRespostaPublica(formulario.id, respostas, {
        nome: detectNome,
        email: detectEmail,
      })
      setSucesso(true)
    } catch {
      alert('Houve uma falha ao enviar sua resposta. Por favor, tente novamente.')
    } finally {
      setEnviando(false)
    }
  }

  if (carregando) {
    return (
      <div className="min-h-screen bg-[#F4F2EE] flex items-center justify-center p-4">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-3 border-[#0F766E] border-t-transparent rounded-full animate-spin" />
          <p className="text-xs text-[#5B6470] font-medium">Carregando formulário seguro...</p>
        </div>
      </div>
    )
  }

  if (erro || !formulario) {
    return (
      <div className="min-h-screen bg-[#F4F2EE] flex items-center justify-center p-4">
        <Card className="max-w-md w-full border-[#E5E1D8] bg-white shadow-md text-center p-6">
          <div className="w-12 h-12 rounded-full bg-red-50 text-red-600 flex items-center justify-center mx-auto mb-3">
            <AlertCircle className="w-6 h-6" />
          </div>
          <CardTitle className="text-base text-[#1A1D21] mb-2">Formulário Indisponível</CardTitle>
          <p className="text-xs text-[#5B6470] mb-6 leading-relaxed">
            {erro || 'O formulário solicitado não está disponível.'}
          </p>
          <Link to="/">
            <Button variant="outline" size="sm" className="text-xs border-[#E5E1D8]">
              Voltar ao Início
            </Button>
          </Link>
        </Card>
      </div>
    )
  }

  if (sucesso) {
    return (
      <div className="min-h-screen bg-[#F4F2EE] flex items-center justify-center p-4">
        <Card className="max-w-md w-full border-[#E5E1D8] bg-white shadow-lg text-center p-8 space-y-4 animate-in fade-in zoom-in-95 duration-200">
          <div
            className="w-16 h-16 rounded-full flex items-center justify-center mx-auto text-white shadow-md"
            style={{ backgroundColor: formulario.cor_tema || '#0F766E' }}
          >
            <CheckCircle2 className="w-8 h-8" />
          </div>
          <CardTitle className="text-lg font-bold text-[#1A1D21]">
            Resposta Enviada com Sucesso!
          </CardTitle>
          <p className="text-xs text-[#5B6470] leading-relaxed">
            {formulario.mensagem_sucesso ||
              'Agradecemos as suas respostas. Nossa equipe analisará e retornará em breve.'}
          </p>
          <div className="pt-4 border-t border-[#E5E1D8] flex items-center justify-center gap-2 text-[11px] text-[#5B6470]">
            <Sparkles className="w-3.5 h-3.5 text-[#0F766E]" />
            <span>Processado com segurança pelo Agenda IA Diamond</span>
          </div>
        </Card>
      </div>
    )
  }

  const camposList: FormCampoConfig[] = Array.isArray(formulario.campos) ? formulario.campos : []

  return (
    <div className="min-h-screen bg-[#F4F2EE] py-10 px-4 sm:px-6 flex flex-col justify-between">
      <div className="max-w-2xl w-full mx-auto space-y-6">
        {/* Cabeçalho do Formulário */}
        <div className="bg-white rounded-2xl border border-[#E5E1D8] shadow-xs overflow-hidden">
          <div
            className="h-3 w-full"
            style={{ backgroundColor: formulario.cor_tema || '#0F766E' }}
          />
          <div className="p-6 sm:p-8 space-y-3">
            <div className="flex items-center gap-2 text-[#0F766E] text-xs font-semibold tracking-wider uppercase">
              <FileText className="w-4 h-4" />
              <span>{formulario.pasta_grupo || 'Diamond Group · Formulário Oficial'}</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-bold text-[#1A1D21] tracking-tight">
              {formulario.titulo}
            </h1>
            {formulario.descricao && (
              <p className="text-xs sm:text-sm text-[#5B6470] leading-relaxed whitespace-pre-line">
                {formulario.descricao}
              </p>
            )}
          </div>
        </div>

        {/* Formulário Interativo */}
        <form onSubmit={handleEnviar} className="space-y-4">
          {camposList.map((campo) => {
            // Título / Seção informativa (não coleta resposta)
            if (campo.tipo === 'titulo_secao') {
              return (
                <div
                  key={campo.id}
                  className="bg-[#FAFAF9] rounded-xl border-l-4 border-l-[#0F766E] border border-[#E5E1D8] p-5 shadow-2xs space-y-1.5"
                >
                  <h3 className="text-sm sm:text-base font-bold text-[#1A1D21] tracking-tight">
                    {campo.label}
                  </h3>
                  {campo.placeholder && (
                    <p className="text-xs text-[#5B6470] leading-relaxed whitespace-pre-line">
                      {campo.placeholder}
                    </p>
                  )}
                </div>
              )
            }

            const valorAtual = respostas[campo.id] ?? ''

            return (
              <div
                key={campo.id}
                className="bg-white rounded-xl border border-[#E5E1D8] p-5 shadow-2xs space-y-2 hover:border-[#0F766E]/30 transition-colors"
              >
                <div className="flex items-start justify-between gap-2">
                  <label className="text-xs sm:text-sm font-semibold text-[#1A1D21] block">
                    {campo.label}
                    {campo.obrigatorio && (
                      <span className="text-red-500 ml-1 font-bold" title="Campo obrigatório">
                        *
                      </span>
                    )}
                  </label>
                </div>

                {/* Tipos de campos suportados */}
                {campo.tipo === 'texto' && (
                  <Input
                    required={campo.obrigatorio}
                    value={valorAtual}
                    onChange={(e) => handleValorChange(campo.id, e.target.value)}
                    placeholder={campo.placeholder || 'Sua resposta'}
                    className="text-xs sm:text-sm border-[#E5E1D8] bg-white h-10"
                  />
                )}

                {campo.tipo === 'email' && (
                  <Input
                    type="email"
                    required={campo.obrigatorio}
                    value={valorAtual}
                    onChange={(e) => handleValorChange(campo.id, e.target.value)}
                    placeholder={campo.placeholder || 'seuemail@exemplo.com'}
                    className="text-xs sm:text-sm border-[#E5E1D8] bg-white h-10"
                  />
                )}

                {campo.tipo === 'telefone' && (
                  <Input
                    type="tel"
                    required={campo.obrigatorio}
                    value={valorAtual}
                    onChange={(e) => handleValorChange(campo.id, e.target.value)}
                    placeholder={campo.placeholder || '(11) 99999-9999'}
                    className="text-xs sm:text-sm border-[#E5E1D8] bg-white h-10"
                  />
                )}

                {campo.tipo === 'data' && (
                  <Input
                    type="date"
                    required={campo.obrigatorio}
                    value={valorAtual}
                    onChange={(e) => handleValorChange(campo.id, e.target.value)}
                    className="text-xs sm:text-sm border-[#E5E1D8] bg-white h-10 max-w-xs"
                  />
                )}

                {campo.tipo === 'texto_longo' && (
                  <Textarea
                    required={campo.obrigatorio}
                    rows={4}
                    value={valorAtual}
                    onChange={(e) => handleValorChange(campo.id, e.target.value)}
                    placeholder={campo.placeholder || 'Digite sua resposta detalhada aqui...'}
                    className="text-xs sm:text-sm border-[#E5E1D8] bg-white"
                  />
                )}

                {/* Dropdown / Lista suspensa de escolha única */}
                {campo.tipo === 'dropdown' && (
                  <div className="pt-1">
                    <Select
                      value={valorAtual ? String(valorAtual) : undefined}
                      onValueChange={(val) => handleValorChange(campo.id, val)}
                    >
                      <SelectTrigger className="text-xs sm:text-sm border-[#E5E1D8] bg-white h-10 w-full">
                        <SelectValue placeholder={campo.placeholder || 'Selecione uma opção...'} />
                      </SelectTrigger>
                      <SelectContent>
                        {(campo.opcoes || []).map((op, opIdx) => (
                          <SelectItem key={opIdx} value={op} className="text-xs sm:text-sm">
                            {op}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {/* Sim / Não (Booleano) */}
                {campo.tipo === 'sim_nao' && (
                  <div className="grid grid-cols-2 gap-3 pt-1">
                    <button
                      type="button"
                      onClick={() => handleValorChange(campo.id, 'Sim')}
                      className={`h-11 rounded-lg border text-xs sm:text-sm font-semibold transition-all flex items-center justify-center gap-2 ${
                        valorAtual === 'Sim'
                          ? 'border-[#0F766E] bg-[#0F766E]/10 text-[#0F766E] shadow-2xs'
                          : 'border-[#E5E1D8] bg-white hover:bg-[#FAFAF9] text-[#1A1D21]'
                      }`}
                    >
                      <span>Sim</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleValorChange(campo.id, 'Não')}
                      className={`h-11 rounded-lg border text-xs sm:text-sm font-semibold transition-all flex items-center justify-center gap-2 ${
                        valorAtual === 'Não'
                          ? 'border-red-500 bg-red-50 text-red-700 shadow-2xs'
                          : 'border-[#E5E1D8] bg-white hover:bg-[#FAFAF9] text-[#1A1D21]'
                      }`}
                    >
                      <span>Não</span>
                    </button>
                  </div>
                )}

                {/* Número ou Moeda */}
                {campo.tipo === 'numero' && (
                  <div className="relative pt-1 max-w-sm">
                    {campo.moeda && (
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs sm:text-sm font-bold text-[#5B6470]">
                        {campo.prefixoMoeda || 'R$'}
                      </span>
                    )}
                    <Input
                      type="number"
                      step={campo.moeda ? '0.01' : 'any'}
                      required={campo.obrigatorio}
                      value={valorAtual}
                      onChange={(e) => handleValorChange(campo.id, e.target.value)}
                      placeholder={campo.placeholder || (campo.moeda ? '0,00' : '0')}
                      className={`text-xs sm:text-sm border-[#E5E1D8] bg-white h-10 ${
                        campo.moeda ? 'pl-11' : ''
                      }`}
                    />
                  </div>
                )}

                {/* Avaliação (1 a 5 estrelas) */}
                {campo.tipo === 'avaliacao' && (
                  <div className="pt-2 flex flex-col gap-2">
                    <div className="flex items-center gap-2">
                      {[1, 2, 3, 4, 5].map((nota) => {
                        const selecionada = Number(valorAtual) >= nota
                        return (
                          <button
                            key={nota}
                            type="button"
                            onClick={() => handleValorChange(campo.id, nota)}
                            className="p-1 hover:scale-110 transition-transform focus:outline-none"
                            title={`${nota} de 5 estrelas`}
                          >
                            <Star
                              className={`w-7 h-7 sm:w-8 sm:h-8 transition-colors ${
                                selecionada
                                  ? 'text-amber-400 fill-amber-400 drop-shadow-xs'
                                  : 'text-gray-300 hover:text-amber-200'
                              }`}
                            />
                          </button>
                        )
                      })}
                      {valorAtual ? (
                        <span className="text-xs sm:text-sm font-bold text-[#1A1D21] ml-2">
                          {valorAtual} / 5 estrelas
                        </span>
                      ) : (
                        <span className="text-xs text-[#5B6470] ml-2">Selecione de 1 a 5</span>
                      )}
                    </div>
                  </div>
                )}

                {campo.tipo === 'escolha_unica' && (
                  <div className="space-y-2 pt-1">
                    {(campo.opcoes || []).map((op, opIdx) => (
                      <label
                        key={opIdx}
                        className="flex items-center gap-3 p-2.5 rounded-lg border border-[#E5E1D8] hover:bg-[#FAFAF9] cursor-pointer transition-colors"
                      >
                        <input
                          type="radio"
                          name={campo.id}
                          value={op}
                          checked={valorAtual === op}
                          onChange={(e) => handleValorChange(campo.id, e.target.value)}
                          required={campo.obrigatorio}
                          className="text-[#0F766E] focus:ring-[#0F766E] h-4 w-4"
                        />
                        <span className="text-xs sm:text-sm text-[#1A1D21]">{op}</span>
                      </label>
                    ))}
                  </div>
                )}

                {campo.tipo === 'escolha_multipla' && (
                  <div className="space-y-2 pt-1">
                    {(campo.opcoes || []).map((op, opIdx) => {
                      const selecionados: string[] = Array.isArray(valorAtual) ? valorAtual : []
                      const estaMarcado = selecionados.includes(op)
                      return (
                        <label
                          key={opIdx}
                          className="flex items-center gap-3 p-2.5 rounded-lg border border-[#E5E1D8] hover:bg-[#FAFAF9] cursor-pointer transition-colors"
                        >
                          <input
                            type="checkbox"
                            checked={estaMarcado}
                            onChange={(e) =>
                              handleMultiplaEscolhaChange(campo.id, op, e.target.checked)
                            }
                            className="text-[#0F766E] rounded border-[#E5E1D8] focus:ring-[#0F766E] h-4 w-4"
                          />
                          <span className="text-xs sm:text-sm text-[#1A1D21]">{op}</span>
                        </label>
                      )
                    })}
                  </div>
                )}
              </div>
            )
          })}

          <div className="flex items-center justify-between pt-4">
            <span className="text-[11px] text-[#5B6470]">* Campos obrigatórios sinalizados</span>

            <Button
              type="submit"
              disabled={enviando}
              className="bg-[#0F766E] hover:bg-[#0D5C56] text-white text-xs sm:text-sm px-6 h-10 gap-2 font-semibold shadow-xs"
              style={{ backgroundColor: formulario.cor_tema || '#0F766E' }}
            >
              <Send className="w-4 h-4" />
              <span>{enviando ? 'Enviando respostas...' : 'Enviar Formulário'}</span>
            </Button>
          </div>
        </form>
      </div>

      <footer className="text-center pt-8 text-[11px] text-[#5B6470]">
        <span>Powered by </span>
        <span className="font-semibold text-[#1A1D21]">Agenda IA Diamond</span>
        <span> · Plataforma Executiva de Alta Governança</span>
      </footer>
    </div>
  )
}
