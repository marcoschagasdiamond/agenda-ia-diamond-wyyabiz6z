import React, { useEffect, useState } from 'react'
import { useSearchParams, useNavigate, Link } from 'react-router-dom'
import pb from '@/lib/pocketbase/client'
import { CheckCircle2, XCircle, Loader2, Sparkles, ArrowRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'

export default function VerifyEmail() {
  const [searchParams] = useSearchParams()
  const token = searchParams.get('token') || ''
  const navigate = useNavigate()
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading')
  const [errorMessage, setErrorMessage] = useState('')

  useEffect(() => {
    if (!token) {
      setStatus('error')
      setErrorMessage('Token de verificação ausente na URL.')
      return
    }

    const verify = async () => {
      try {
        await pb.collection('users').confirmVerification(token)
        setStatus('success')
      } catch (err) {
        setStatus('error')
        setErrorMessage((err as Error)?.message || 'Token expirado ou inválido.')
      }
    }

    verify()
  }, [token])

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-[#F4F2EE]">
      <div className="w-full max-w-md animate-fade-in-up">
        <Card className="border-[#E5E1D8] shadow-sm bg-white text-center p-6">
          <CardHeader>
            <div className="w-12 h-12 rounded-xl bg-[#0F766E] mx-auto flex items-center justify-center text-white mb-2">
              <Sparkles className="w-6 h-6" />
            </div>
            <CardTitle className="text-xl font-bold text-[#1A1D21]">
              Confirmação de E-mail
            </CardTitle>
            <CardDescription className="text-xs text-[#5B6470]">
              Agenda IA Diamond — Verificação de Segurança
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 pt-2">
            {status === 'loading' && (
              <div className="flex flex-col items-center gap-3 py-4">
                <Loader2 className="w-8 h-8 animate-spin text-[#0F766E]" />
                <p className="text-sm text-[#5B6470]">Validando seu token de confirmação...</p>
              </div>
            )}

            {status === 'success' && (
              <div className="flex flex-col items-center gap-3 py-4">
                <CheckCircle2 className="w-12 h-12 text-emerald-600" />
                <p className="text-sm font-semibold text-[#1A1D21]">
                  E-mail verificado com sucesso!
                </p>
                <p className="text-xs text-[#5B6470]">
                  Sua conta está ativa e pronta para uso integral.
                </p>
                <Button
                  onClick={() => navigate('/')}
                  className="mt-2 bg-[#0F766E] hover:bg-[#0D5C56] text-white text-xs"
                >
                  Ir para o Dashboard
                  <ArrowRight className="w-4 h-4 ml-1.5" />
                </Button>
              </div>
            )}

            {status === 'error' && (
              <div className="flex flex-col items-center gap-3 py-4">
                <XCircle className="w-12 h-12 text-red-600" />
                <p className="text-sm font-semibold text-red-700">
                  Não foi possível validar seu e-mail
                </p>
                <p className="text-xs text-[#5B6470]">{errorMessage}</p>
                <Link to="/login">
                  <Button variant="outline" className="mt-2 text-xs">
                    Voltar ao Login
                  </Button>
                </Link>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
