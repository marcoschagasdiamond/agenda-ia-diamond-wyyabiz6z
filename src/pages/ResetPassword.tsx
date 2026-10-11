import React, { useState } from 'react'
import { useSearchParams, useNavigate, Link } from 'react-router-dom'
import { useAuth } from '@/hooks/use-auth'
import { Sparkles, Lock, ArrowRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  CardFooter,
} from '@/components/ui/card'
import { useToast } from '@/hooks/use-toast'

export default function ResetPassword() {
  const [searchParams] = useSearchParams()
  const token = searchParams.get('token') || ''
  const { confirmPasswordReset } = useAuth()
  const navigate = useNavigate()
  const { toast } = useToast()

  const [password, setPassword] = useState('')
  const [passwordConfirm, setPasswordConfirm] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (password.length < 8) {
      toast({
        title: 'Senha muito curta',
        description: 'A nova senha deve ter no mínimo 8 caracteres.',
        variant: 'destructive',
      })
      return
    }
    if (password !== passwordConfirm) {
      toast({
        title: 'Senhas não coincidem',
        description: 'A confirmação de senha deve ser idêntica.',
        variant: 'destructive',
      })
      return
    }

    setLoading(true)
    const { error } = await confirmPasswordReset(token, password)
    setLoading(false)

    if (error) {
      toast({
        title: 'Erro ao redefinir',
        description: error.message || 'Token expirado ou inválido.',
        variant: 'destructive',
      })
      return
    }

    toast({
      title: 'Senha alterada!',
      description: 'Você já pode acessar o sistema com sua nova senha.',
    })
    navigate('/login')
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-[#F4F2EE]">
      <div className="w-full max-w-md animate-fade-in-up">
        <div className="text-center mb-6">
          <div className="w-12 h-12 rounded-xl bg-[#0F766E] mx-auto flex items-center justify-center text-white shadow-md mb-3">
            <Sparkles className="w-6 h-6" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-[#1A1D21]">AGENDA IA DIAMOND</h1>
          <p className="text-xs text-[#5B6470] mt-1 font-medium">Definir Nova Senha</p>
        </div>

        <Card className="border-[#E5E1D8] shadow-sm bg-white">
          <CardHeader className="space-y-1 pb-4">
            <CardTitle className="text-lg font-semibold text-[#1A1D21]">Nova Senha</CardTitle>
            <CardDescription className="text-xs text-[#5B6470]">
              Crie uma senha forte com pelo menos 8 caracteres.
            </CardDescription>
          </CardHeader>
          <form onSubmit={handleSubmit}>
            <CardContent className="space-y-4">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-[#1A1D21]">Nova Senha</Label>
                <div className="relative">
                  <Lock className="w-4 h-4 absolute left-3 top-3 text-[#5B6470]" />
                  <Input
                    type="password"
                    required
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pl-9 text-sm border-[#E5E1D8]"
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-[#1A1D21]">Confirmar Nova Senha</Label>
                <div className="relative">
                  <Lock className="w-4 h-4 absolute left-3 top-3 text-[#5B6470]" />
                  <Input
                    type="password"
                    required
                    placeholder="••••••••"
                    value={passwordConfirm}
                    onChange={(e) => setPasswordConfirm(e.target.value)}
                    className="pl-9 text-sm border-[#E5E1D8]"
                  />
                </div>
              </div>
            </CardContent>
            <CardFooter className="flex flex-col gap-3 pt-2">
              <Button
                type="submit"
                disabled={loading}
                className="w-full bg-[#0F766E] hover:bg-[#0D5C56] text-white text-xs font-medium h-10 shadow-sm"
              >
                {loading ? 'Salvando...' : 'Salvar Nova Senha'}
                <ArrowRight className="w-4 h-4 ml-1.5" />
              </Button>
              <div className="text-center text-xs text-[#5B6470]">
                <Link to="/login" className="text-[#0F766E] font-semibold hover:underline">
                  Cancelar e ir ao login
                </Link>
              </div>
            </CardFooter>
          </form>
        </Card>
      </div>
    </div>
  )
}
