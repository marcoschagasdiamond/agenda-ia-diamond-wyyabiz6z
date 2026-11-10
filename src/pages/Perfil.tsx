import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import pb from '@/lib/pocketbase/client'
import { useAuth } from '@/hooks/use-auth'
import { getErrorMessage } from '@/lib/pocketbase/errors'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useToast } from '@/hooks/use-toast'
import { ArrowLeft, KeyRound, Loader2, Save, UserRound } from 'lucide-react'

type Erros = { nome?: string; senhaAtual?: string; novaSenha?: string; confirma?: string }

export default function Perfil() {
  const { user, clienteProfile, isClientPortal } = useAuth()
  const { toast } = useToast()
  const navigate = useNavigate()

  // Nome
  const [nome, setNome] = useState(user?.name ?? '')
  const [salvandoNome, setSalvandoNome] = useState(false)

  // Senha
  const [senhaAtual, setSenhaAtual] = useState('')
  const [novaSenha, setNovaSenha] = useState('')
  const [confirma, setConfirma] = useState('')
  const [salvandoSenha, setSalvandoSenha] = useState(false)

  const [erros, setErros] = useState<Erros>({})

  useEffect(() => {
    if (user) setNome(user.name ?? '')
  }, [user])

  if (!user) return null

  const salvarNome = async () => {
    setErros({})
    if (!nome.trim()) {
      setErros({ nome: 'Informe o seu nome.' })
      return
    }
    setSalvandoNome(true)
    try {
      await pb.collection('users').update(user.id, { name: nome.trim() })
      // Reautentica silenciosamente para renovar o registro em cache do authStore
      await pb.collection('users').authRefresh()
      toast({ title: 'Nome atualizado', description: 'Seu nome foi alterado com sucesso.' })
    } catch (err) {
      toast({
        title: 'Erro ao salvar o nome',
        description: getErrorMessage(err),
        variant: 'destructive',
      })
    } finally {
      setSalvandoNome(false)
    }
  }

  const trocarSenha = async () => {
    setErros({})
    if (!senhaAtual) {
      setErros({ senhaAtual: 'Informe a senha atual.' })
      return
    }
    if (novaSenha.length < 8) {
      setErros({ novaSenha: 'A nova senha deve ter pelo menos 8 caracteres.' })
      return
    }
    if (novaSenha !== confirma) {
      setErros({ confirma: 'As senhas não coincidem.' })
      return
    }
    if (novaSenha === senhaAtual) {
      setErros({ novaSenha: 'A nova senha deve ser diferente da atual.' })
      return
    }

    setSalvandoSenha(true)
    try {
      // Confirma a identidade reautenticando com a senha atual
      await pb.collection('users').authWithPassword(user.email, senhaAtual)
      await pb.collection('users').update(user.id, {
        password: novaSenha,
        passwordConfirm: novaSenha,
        oldPassword: senhaAtual,
      })
      await pb.collection('users').authRefresh()
      toast({ title: 'Senha alterada', description: 'Sua senha foi atualizada com sucesso.' })
      setSenhaAtual('')
      setNovaSenha('')
      setConfirma('')
    } catch (err) {
      const msg = getErrorMessage(err)
      toast({ title: 'Erro ao trocar a senha', description: msg, variant: 'destructive' })
      // Erro típico: senha atual incorreta (falha no authWithPassword)
      if (msg.toLowerCase().includes('autenti') || msg.toLowerCase().includes('invalid')) {
        setErros({ senhaAtual: 'A senha atual está incorreta.' })
      }
    } finally {
      setSalvandoSenha(false)
    }
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Cabeçalho */}
      <div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate(-1)}
          className="mb-3 text-xs text-[#5B6470] hover:text-[#1A1D21] gap-1.5"
        >
          <ArrowLeft className="w-4 h-4" />
          Voltar
        </Button>
        <h1 className="text-xl font-bold text-[#1A1D21]">Meu Perfil</h1>
        <p className="text-sm text-[#5B6470] mt-0.5">
          Edite o seu nome e gerencie a senha da sua conta.
        </p>
      </div>

      {/* Informações da conta (somente leitura) */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold text-[#1A1D21] flex items-center gap-2">
            <UserRound className="w-4 h-4 text-[#0F766E]" />
            Conta
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-3">
            <span className="text-xs font-medium text-[#5B6470] w-24 shrink-0">E-mail</span>
            <span className="text-[#1A1D21] break-all">{user.email}</span>
          </div>
          {isClientPortal && clienteProfile && (
            <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-3">
              <span className="text-xs font-medium text-[#5B6470] w-24 shrink-0">Empresa</span>
              <span className="text-[#1A1D21]">
                {clienteProfile.empresa || clienteProfile.nome}
              </span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Editar nome */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold text-[#1A1D21] flex items-center gap-2">
            <UserRound className="w-4 h-4 text-[#0F766E]" />
            Nome
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-3 sm:items-end">
            <div className="flex-1 space-y-1.5">
              <Label htmlFor="nome" className="text-xs text-[#5B6470]">
                Nome completo
              </Label>
              <Input
                id="nome"
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                placeholder="Seu nome"
                disabled={salvandoNome}
              />
              {erros.nome && <p className="text-xs text-red-600">{erros.nome}</p>}
            </div>
            <Button
              onClick={salvarNome}
              disabled={salvandoNome || nome.trim() === (user.name ?? '')}
              className="bg-[#0F766E] hover:bg-[#0D5C56] text-white text-xs h-9 gap-1.5"
            >
              {salvandoNome ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Save className="w-3.5 h-3.5" />
              )}
              Salvar
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Trocar senha */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold text-[#1A1D21] flex items-center gap-2">
            <KeyRound className="w-4 h-4 text-[#0F766E]" />
            Senha
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="senhaAtual" className="text-xs text-[#5B6470]">
              Senha atual
            </Label>
            <Input
              id="senhaAtual"
              type="password"
              value={senhaAtual}
              onChange={(e) => setSenhaAtual(e.target.value)}
              placeholder="••••••••"
              disabled={salvandoSenha}
            />
            {erros.senhaAtual && <p className="text-xs text-red-600">{erros.senhaAtual}</p>}
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="novaSenha" className="text-xs text-[#5B6470]">
                Nova senha
              </Label>
              <Input
                id="novaSenha"
                type="password"
                value={novaSenha}
                onChange={(e) => setNovaSenha(e.target.value)}
                placeholder="Mínimo de 8 caracteres"
                disabled={salvandoSenha}
              />
              {erros.novaSenha && <p className="text-xs text-red-600">{erros.novaSenha}</p>}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="confirma" className="text-xs text-[#5B6470]">
                Confirmar nova senha
              </Label>
              <Input
                id="confirma"
                type="password"
                value={confirma}
                onChange={(e) => setConfirma(e.target.value)}
                placeholder="Repita a nova senha"
                disabled={salvandoSenha}
              />
              {erros.confirma && <p className="text-xs text-red-600">{erros.confirma}</p>}
            </div>
          </div>
          <Button
            onClick={trocarSenha}
            disabled={salvandoSenha}
            className="bg-[#0F766E] hover:bg-[#0D5C56] text-white text-xs h-9 gap-1.5"
          >
            {salvandoSenha ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <KeyRound className="w-3.5 h-3.5" />
            )}
            Trocar senha
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
