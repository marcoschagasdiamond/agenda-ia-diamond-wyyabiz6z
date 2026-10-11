import React, { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '@/hooks/use-auth'
import { Sparkles, ArrowRight, ShieldCheck, Lock, Mail } from 'lucide-react'
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

export default function Login() {
  const { signIn } = useAuth()
  const navigate = useNavigate()
  const { toast } = useToast()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email || !password) return
    setLoading(true)

    const { error } = await signIn(email, password)
    setLoading(false)

    if (error) {
      toast({
        title: 'Falha no acesso',
        description: error.message || 'Verifique seu e-mail e senha e tente novamente.',
        variant: 'destructive',
      })
      return
    }

    toast({
      title: 'Acesso liberado',
      description: 'Bem-vindo ao Agenda IA Diamond.',
    })
    navigate('/')
  }

  const fillDemo = () => {
    setEmail('marcoschagasdiamond@icloud.com')
    setPassword('Skip@Pass')
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
            Segundo Cérebro & Agenda Inteligente para Negócios e Clientes
          </p>
        </div>

        <Card className="border-[#E5E1D8] shadow-sm bg-white">
          <CardHeader className="space-y-1 pb-4">
            <CardTitle className="text-lg font-semibold text-[#1A1D21]">Acessar Conta</CardTitle>
            <CardDescription className="text-xs text-[#5B6470]">
              Entre com suas credenciais para gerenciar demandas, contatos e fluxos.
            </CardDescription>
          </CardHeader>
          <form onSubmit={handleSubmit}>
            <CardContent className="space-y-4">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-[#1A1D21]">E-mail</Label>
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
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-semibold text-[#1A1D21]">Senha</Label>
                  <Link
                    to="/forgot-password"
                    className="text-[11px] text-[#0F766E] hover:underline font-medium"
                  >
                    Esqueceu a senha?
                  </Link>
                </div>
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

              <div className="pt-1">
                <Button
                  type="button"
                  variant="outline"
                  onClick={fillDemo}
                  className="w-full text-xs text-[#0F766E] border-[#0F766E]/30 hover:bg-[#0F766E]/5"
                >
                  Preencher dados de demonstração (Admin)
                </Button>
              </div>
            </CardContent>
            <CardFooter className="flex flex-col gap-3 pt-2">
              <Button
                type="submit"
                disabled={loading}
                className="w-full bg-[#0F766E] hover:bg-[#0D5C56] text-white text-xs font-medium h-10 shadow-sm"
              >
                {loading ? 'Acessando...' : 'Entrar no Sistema'}
                <ArrowRight className="w-4 h-4 ml-1.5" />
              </Button>
              <div className="text-center text-xs text-[#5B6470]">
                Ainda não tem conta?{' '}
                <Link to="/signup" className="text-[#0F766E] font-semibold hover:underline">
                  Cadastre-se
                </Link>
              </div>
            </CardFooter>
          </form>
        </Card>
      </div>
    </div>
  )
}
