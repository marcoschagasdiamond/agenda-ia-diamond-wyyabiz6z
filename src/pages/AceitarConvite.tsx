import React, { useEffect, useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import pb from '@/lib/pocketbase/client'
import { diamondApi } from '@/services/diamondApi'
import { useAuth } from '@/hooks/use-auth'
import type { ConviteEquipe } from '@/types'
import {
  Users,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  Shield,
  Lock,
  Mail,
  User,
  Sparkles,
  Layers,
  FolderKanban,
  KanbanSquare,
  ListTodo,
  UserCheck,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { useToast } from '@/hooks/use-toast'

export default function AceitarConvite() {
  const { token } = useParams<{ token: string }>()
  const navigate = useNavigate()
  const { user } = useAuth()
  const { toast } = useToast()

  const [convite, setConvite] = useState<ConviteEquipe | null>(null)
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState<string | null>(null)
  const [sucesso, setSucesso] = useState(false)
  const [processando, setProcessando] = useState(false)

  // Campos para cadastro de novo usuário caso não tenha conta
  const [nome, setNome] = useState('')
  const [password, setPassword] = useState('')
  const [passwordConfirm, setPasswordConfirm] = useState('')

  // 1. Carregar detalhes do convite pelo token
  useEffect(() => {
    async function carregar() {
      if (!token) {
        setErro('Token de convite não informado.')
        setCarregando(false)
        return
      }

      try {
        const c = await diamondApi.getConvitePorToken(token)
        if (!c) {
          setErro('Convite não encontrado ou token inválido.')
        } else if (c.status === 'revogado') {
          setErro('Este convite foi revogado pelo administrador.')
        } else if (c.status === 'expirado') {
          setErro('Este convite expirou. Peça ao administrador para reenviá-lo.')
        } else {
          setConvite(c)
          if (c.status === 'aceito') {
            setSucesso(true)
          }
        }
      } catch (err: unknown) {
        setErro('Erro ao verificar o convite. Verifique sua conexão.')
      } finally {
        setCarregando(false)
      }
    }

    carregar()
  }, [token])

  // Se o usuário logado for o mesmo do convite (ou se já tiver logado), pode aceitar direto
  const handleAceitarLogado = async () => {
    if (!token) return
    setProcessando(true)
    try {
      await diamondApi.aceitarConvite({
        token,
        usuario_id: user?.id,
        nome: user?.name,
      })
      setSucesso(true)
      toast({
        title: 'Convite aceito com sucesso!',
        description: 'Seu acesso foi vinculado à sua conta.',
      })
      setTimeout(() => {
        redirecionarParaEscopo()
      }, 1500)
    } catch (err: unknown) {
      toast({
        title: 'Erro ao aceitar convite',
        description: (err as Error)?.message || 'Tente novamente.',
        variant: 'destructive',
      })
    } finally {
      setProcessando(false)
    }
  }

  // Se for novo usuário sem conta: criar conta PocketBase e aceitar convite
  const handleCriarContaEAceitar = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!token || !convite) return

    if (password !== passwordConfirm) {
      toast({
        title: 'Senhas não coincidem',
        description: 'Digite a mesma senha nos dois campos.',
        variant: 'destructive',
      })
      return
    }

    if (password.length < 8) {
      toast({
        title: 'Senha muito curta',
        description: 'A senha deve conter no mínimo 8 caracteres.',
        variant: 'destructive',
      })
      return
    }

    setProcessando(true)
    try {
      // 1. Criar usuário no PocketBase
      const createdUser = await pb.collection('users').create({
        email: convite.email,
        password: password,
        passwordConfirm: passwordConfirm,
        name: nome.trim() || convite.email.split('@')[0],
      })

      // 2. Fazer login
      await pb.collection('users').authWithPassword(convite.email, password)

      // 3. Chamar backend para aceitar convite
      await diamondApi.aceitarConvite({
        token,
        usuario_id: createdUser.id,
        nome: nome.trim(),
      })

      setSucesso(true)
      toast({
        title: 'Conta criada e convite aceito!',
        description: 'Bem-vindo ao Agenda IA Diamond.',
      })

      setTimeout(() => {
        redirecionarParaEscopo()
      }, 1500)
    } catch (err: unknown) {
      const msg = (err as Error)?.message || ''
      if (msg.includes('email') || msg.includes('unique')) {
        toast({
          title: 'Você já possui uma conta',
          description: 'Faça login com seu e-mail e senha para ativar este convite.',
        })
        navigate(`/login?redirect=/convite/${token}`)
      } else {
        toast({
          title: 'Erro ao criar conta',
          description: msg || 'Ocorreu um erro ao processar seu cadastro.',
          variant: 'destructive',
        })
      }
    } finally {
      setProcessando(false)
    }
  }

  // Redirecionamento inteligente para a tela do escopo
  const redirecionarParaEscopo = () => {
    if (!convite) {
      navigate('/dashboard')
      return
    }
    switch (convite.escopo_tipo) {
      case 'fluxo':
        navigate(`/fluxo?id=${convite.escopo_id}`)
        break
      case 'categoria':
        navigate(`/fluxo?cat=${convite.escopo_id}`)
        break
      case 'projeto':
        navigate(`/projetos/${convite.escopo_id}`)
        break
      case 'cliente':
        navigate('/clientes')
        break
      case 'demanda':
        navigate('/listas')
        break
      default:
        navigate('/dashboard')
        break
    }
  }

  // Helper de ícone de escopo
  const renderIconeEscopo = (tipo: string) => {
    switch (tipo) {
      case 'projeto':
        return <FolderKanban className="w-4 h-4 text-[#0F766E]" />
      case 'fluxo':
        return <KanbanSquare className="w-4 h-4 text-emerald-600" />
      case 'categoria':
        return <Shield className="w-4 h-4 text-purple-600" />
      case 'cliente':
        return <UserCheck className="w-4 h-4 text-blue-600" />
      case 'demanda':
        return <ListTodo className="w-4 h-4 text-amber-600" />
      default:
        return <Sparkles className="w-4 h-4 text-[#0F766E]" />
    }
  }

  if (carregando) {
    return (
      <div className="min-h-screen bg-[#F4F2EE] flex items-center justify-center p-4">
        <div className="text-center space-y-3">
          <div className="w-10 h-10 border-3 border-[#0F766E] border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-xs text-[#5B6470] font-medium">Verificando convite de equipe...</p>
        </div>
      </div>
    )
  }

  if (erro) {
    return (
      <div className="min-h-screen bg-[#F4F2EE] flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-2xl border border-[#E5E1D8] p-8 text-center shadow-lg space-y-4">
          <div className="w-14 h-14 rounded-2xl bg-red-50 text-red-600 flex items-center justify-center mx-auto">
            <AlertCircle className="w-7 h-7" />
          </div>
          <h1 className="text-lg font-bold text-[#1A1D21]">Convite Não Disponível</h1>
          <p className="text-xs text-[#5B6470] leading-relaxed">{erro}</p>
          <div className="pt-2">
            <Button
              onClick={() => navigate('/login')}
              className="bg-[#1A1D21] hover:bg-[#2A2E33] text-white text-xs"
            >
              Ir para Tela de Login
            </Button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#F4F2EE] flex flex-col justify-center items-center p-4">
      <div className="max-w-lg w-full bg-white rounded-2xl border border-[#E5E1D8] overflow-hidden shadow-lg">
        {/* Top Header Diamond */}
        <div className="bg-[#1A1D21] text-white p-6 text-center border-b-2 border-[#0F766E]">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-[#0F766E] text-white mb-3 shadow-xs">
            <Users className="w-6 h-6" />
          </div>
          <h1 className="text-lg font-bold tracking-tight">Convite de Equipe Diamond</h1>
          <p className="text-xs text-zinc-400 mt-0.5">
            Você foi convidado para colaborar no Agenda IA Diamond
          </p>
        </div>

        <div className="p-6 md:p-8 space-y-6">
          {/* Card do Escopo Compartilhado */}
          <div className="p-4 rounded-xl border border-[#E5E1D8] bg-[#FAFAF9] space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#5B6470]">
                Escopo Compartilhado
              </span>
              <Badge className="bg-[#0F766E]/10 text-[#0F766E] border-none text-[10px] font-bold uppercase">
                {convite?.nivel_acesso === 'admin'
                  ? 'Administrador'
                  : convite?.nivel_acesso === 'edicao'
                    ? 'Pode Editar'
                    : 'Somente Leitura'}
              </Badge>
            </div>

            <div className="flex items-center gap-2 pt-1">
              <div className="p-1.5 rounded-lg bg-white border border-[#E5E1D8]">
                {renderIconeEscopo(convite?.escopo_tipo || 'geral')}
              </div>
              <div>
                <span className="text-sm font-bold text-[#1A1D21] block">
                  {convite?.escopo_nome || 'Workspace Diamond'}
                </span>
                <span className="text-[11px] text-[#5B6470] capitalize">
                  Tipo: {convite?.escopo_tipo}
                </span>
              </div>
            </div>

            {convite?.mensagem && (
              <div className="pt-2 mt-2 border-t border-[#E5E1D8]/60 text-xs italic text-[#5B6470]">
                "{convite.mensagem}"
              </div>
            )}
          </div>

          {/* Estado de Sucesso */}
          {sucesso ? (
            <div className="text-center py-4 space-y-3">
              <div className="w-12 h-12 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <h2 className="text-base font-bold text-[#1A1D21]">Convite Aceito com Sucesso!</h2>
              <p className="text-xs text-[#5B6470]">
                Seu acesso já está liberado. Você será redirecionado para a plataforma.
              </p>
              <Button
                onClick={redirecionarParaEscopo}
                className="bg-[#0F766E] hover:bg-[#0D5C56] text-white text-xs gap-1.5 mt-2"
              >
                <span>Acessar Agora</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Button>
            </div>
          ) : user ? (
            /* Usuário já está logado na aplicação */
            <div className="space-y-4 text-center">
              <p className="text-xs text-[#5B6470]">
                Você está conectado como <strong>{user.email}</strong>. Clique abaixo para aceitar o
                convite e vincular este escopo à sua conta.
              </p>
              <Button
                disabled={processando}
                onClick={handleAceitarLogado}
                className="w-full bg-[#0F766E] hover:bg-[#0D5C56] text-white font-semibold text-xs h-10 shadow-xs"
              >
                {processando ? 'Vinculando Acesso...' : 'Aceitar Convite com esta Conta'}
              </Button>
            </div>
          ) : (
            /* Usuário não autenticado: formulário de cadastro / definir senha */
            <div className="space-y-4">
              <div className="text-center">
                <h2 className="text-sm font-bold text-[#1A1D21]">Defina seu Acesso</h2>
                <p className="text-xs text-[#5B6470] mt-0.5">
                  Crie sua senha para entrar com o e-mail <strong>{convite?.email}</strong>
                </p>
              </div>

              <form onSubmit={handleCriarContaEAceitar} className="space-y-3">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-[#1A1D21] flex items-center gap-1.5">
                    <User className="w-3.5 h-3.5 text-[#5B6470]" />
                    Seu Nome Completo
                  </label>
                  <Input
                    required
                    placeholder="Ex: Carlos Eduardo"
                    value={nome}
                    onChange={(e) => setNome(e.target.value)}
                    className="text-xs border-[#E5E1D8]"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-[#1A1D21] flex items-center gap-1.5">
                    <Mail className="w-3.5 h-3.5 text-[#5B6470]" />
                    E-mail do Convite
                  </label>
                  <Input
                    disabled
                    value={convite?.email || ''}
                    className="text-xs border-[#E5E1D8] bg-[#F4F2EE] text-[#5B6470]"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-[#1A1D21] flex items-center gap-1.5">
                    <Lock className="w-3.5 h-3.5 text-[#5B6470]" />
                    Criar Senha de Acesso *
                  </label>
                  <Input
                    required
                    type="password"
                    placeholder="Mínimo de 8 caracteres"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="text-xs border-[#E5E1D8]"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-[#1A1D21] flex items-center gap-1.5">
                    <Lock className="w-3.5 h-3.5 text-[#5B6470]" />
                    Confirmar Senha *
                  </label>
                  <Input
                    required
                    type="password"
                    placeholder="Repita a senha"
                    value={passwordConfirm}
                    onChange={(e) => setPasswordConfirm(e.target.value)}
                    className="text-xs border-[#E5E1D8]"
                  />
                </div>

                <Button
                  type="submit"
                  disabled={processando}
                  className="w-full bg-[#0F766E] hover:bg-[#0D5C56] text-white font-semibold text-xs h-10 shadow-xs mt-2"
                >
                  {processando ? 'Criando Conta...' : 'Aceitar Convite e Começar'}
                </Button>
              </form>

              <div className="text-center pt-2 border-t border-[#E5E1D8]">
                <p className="text-[11px] text-[#5B6470]">
                  Já tem uma conta cadastrada com este e-mail?{' '}
                  <Link
                    to={`/login?redirect=/convite/${token}`}
                    className="text-[#0F766E] font-semibold hover:underline"
                  >
                    Fazer Login
                  </Link>
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
