import React, { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '@/hooks/use-auth'
import { Sparkles, ArrowRight, UserPlus, Lock, Mail, User } from 'lucide-react'
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

export default function Signup() {
  const { signUp } = useAuth()
  const navigate = useNavigate()
  const { toast } = useToast()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email || !password || password.length < 8) {
      toast({
        title: 'Dados inválidos',
        description: 'A senha deve conter no mínimo 8 caracteres.',
        variant: 'destructive',
      })
      return
    }
    setLoading(true)

    const { error } = await signUp(email, password, name)
    setLoading(false)

    if (error) {
      toast({
        title: 'Erro ao criar conta',
        description: error.message || 'Não foi possível concluir o cadastro.',
        variant: 'destructive',
      })
      return
    }

    toast({
      title: 'Conta criada com sucesso!',
      description: 'Vamos configurar seu Segundo Cérebro.',
    })
    // Redireciona para o onboarding fixo obrigatório
    navigate('/onboarding')
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-[#F4F2EE]">
      <div className="w-full max-w-md animate-fade-in-up">
        <div className="text-center mb-6">
          <div className="w-12 h-12 rounded-xl bg-[#0F766E] mx-auto flex items-center justify-center text-white shadow-md mb-3">
            <Sparkles className="w-6 h-6" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-[#1A1D21]">AGENDA IA DIAMOND</h1>
          <p className="text-xs text-[#5B6470] mt-1 font-medium">
            Crie sua conta para ativar seu Segundo Cérebro
          </p>
        </div>

        <Card className="border-[#E5E1D8] shadow-sm bg-white">
          <CardHeader className="space-y-1 pb-4">
            <CardTitle className="text-lg font-semibold text-[#1A1D21]">Novo Cadastro</CardTitle>
            <CardDescription className="text-xs text-[#5B6470]">
              Após o cadastro, você responderá ao template inicial de perguntas.
            </CardDescription>
          </CardHeader>
          <form onSubmit={handleSubmit}>
            <CardContent className="space-y-4">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-[#1A1D21]">Nome Completo</Label>
                <div className="relative">
                  <User className="w-4 h-4 absolute left-3 top-3 text-[#5B6470]" />
                  <Input
                    type="text"
                    required
                    placeholder="Seu nome executivo"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="pl-9 text-sm border-[#E5E1D8]"
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-[#1A1D21]">E-mail Profissional</Label>
                <div className="relative">
                  <Mail className="w-4 h-4 absolute left-3 top-3 text-[#5B6470]" />
                  <Input
                    type="email"
                    required
                    placeholder="seu.email@diamond.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="pl-9 text-sm border-[#E5E1D8]"
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-[#1A1D21]">
                  Senha de Acesso (mín. 8 dígitos)
                </Label>
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
            </CardContent>
            <CardFooter className="flex flex-col gap-3 pt-2">
              <Button
                type="submit"
                disabled={loading}
                className="w-full bg-[#0F766E] hover:bg-[#0D5C56] text-white text-xs font-medium h-10 shadow-sm"
              >
                {loading ? 'Criando conta...' : 'Cadastrar e Iniciar Onboarding'}
                <ArrowRight className="w-4 h-4 ml-1.5" />
              </Button>
              <div className="text-center text-xs text-[#5B6470]">
                Já possui conta?{' '}
                <Link to="/login" className="text-[#0F766E] font-semibold hover:underline">
                  Faça login
                </Link>
              </div>
            </CardFooter>
          </form>
        </Card>
      </div>
    </div>
  )
}
