import React, { useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '@/hooks/use-auth'
import { Sparkles, Mail, ArrowLeft, CheckCircle2 } from 'lucide-react'
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

export default function ForgotPassword() {
  const { requestPasswordReset } = useAuth()
  const { toast } = useToast()
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email) return
    setLoading(true)

    const { error } = await requestPasswordReset(email)
    setLoading(false)

    if (error) {
      toast({
        title: 'Falha na solicitação',
        description: error.message || 'Erro ao enviar e-mail de recuperação.',
        variant: 'destructive',
      })
      return
    }

    setSent(true)
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-[#F4F2EE]">
      <div className="w-full max-w-md animate-fade-in-up">
        <div className="text-center mb-6">
          <div className="w-12 h-12 rounded-xl bg-[#0F766E] mx-auto flex items-center justify-center text-white shadow-md mb-3">
            <Sparkles className="w-6 h-6" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-[#1A1D21]">AGENDA IA DIAMOND</h1>
          <p className="text-xs text-[#5B6470] mt-1 font-medium">Recuperação de Acesso</p>
        </div>

        <Card className="border-[#E5E1D8] shadow-sm bg-white">
          <CardHeader className="space-y-1 pb-4">
            <CardTitle className="text-lg font-semibold text-[#1A1D21]">
              Esqueceu a Senha?
            </CardTitle>
            <CardDescription className="text-xs text-[#5B6470]">
              Informe seu e-mail de cadastro para receber as instruções de redefinição.
            </CardDescription>
          </CardHeader>
          {sent ? (
            <CardContent className="space-y-4 text-center py-6">
              <CheckCircle2 className="w-12 h-12 text-emerald-600 mx-auto" />
              <p className="text-sm font-semibold text-[#1A1D21]">E-mail enviado com sucesso!</p>
              <p className="text-xs text-[#5B6470]">
                Verifique sua caixa de entrada e spam no endereço <strong>{email}</strong>.
              </p>
              <Link to="/login" className="inline-block mt-3">
                <Button variant="outline" size="sm" className="text-xs">
                  <ArrowLeft className="w-3.5 h-3.5 mr-1" />
                  Voltar ao Login
                </Button>
              </Link>
            </CardContent>
          ) : (
            <form onSubmit={handleSubmit}>
              <CardContent className="space-y-4">
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-[#1A1D21]">E-mail Cadastrado</Label>
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
              </CardContent>
              <CardFooter className="flex flex-col gap-3 pt-2">
                <Button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-[#0F766E] hover:bg-[#0D5C56] text-white text-xs font-medium h-10 shadow-sm"
                >
                  {loading ? 'Enviando...' : 'Enviar Link de Redefinição'}
                </Button>
                <div className="text-center text-xs text-[#5B6470]">
                  <Link
                    to="/login"
                    className="text-[#0F766E] font-semibold hover:underline inline-flex items-center"
                  >
                    <ArrowLeft className="w-3.5 h-3.5 mr-1" />
                    Voltar para o Login
                  </Link>
                </div>
              </CardFooter>
            </form>
          )}
        </Card>
      </div>
    </div>
  )
}
