import React, { createContext, useContext, useEffect, useState } from 'react'
import pb from '@/lib/pocketbase/client'
import type { User, Profile, Cliente, MembroEquipe, EscopoItem } from '@/types'

interface AuthContextType {
  user: User | null
  profile: Profile | null
  clienteProfile: Cliente | null
  membroEquipe: MembroEquipe | null
  meusEscopos: EscopoItem[]
  isConvidadoExterno: boolean
  escopoPrincipal: EscopoItem | null
  isClientPortal: boolean
  isMaster: boolean
  isAdmin: boolean
  loading: boolean
  signIn: (email: string, pass: string) => Promise<{ error: Error | null }>
  signUp: (email: string, pass: string, name?: string) => Promise<{ error: Error | null }>
  signOut: () => void
  refreshProfile: () => Promise<void>
  requestPasswordReset: (email: string) => Promise<{ error: Error | null }>
  confirmPasswordReset: (token: string, pass: string) => Promise<{ error: Error | null }>
  requestEmailChange: (newEmail: string) => Promise<{ error: Error | null }>
  confirmEmailChange: (token: string, pass: string) => Promise<{ error: Error | null }>
}

const AuthContext = createContext<AuthContextType | null>(null)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(
    () => (pb.authStore.record as unknown as User) || null,
  )
  const [profile, setProfile] = useState<Profile | null>(null)
  const [clienteProfile, setClienteProfile] = useState<Cliente | null>(null)
  const [membroEquipe, setMembroEquipe] = useState<MembroEquipe | null>(null)
  const [loading, setLoading] = useState<boolean>(true)

  const fetchProfileAndRole = async (currentUser: User | null) => {
    if (!currentUser) {
      setProfile(null)
      setClienteProfile(null)
      setMembroEquipe(null)
      return
    }
    try {
      // 1. Tentar buscar perfil de usuário interno
      const p = await pb
        .collection('profiles')
        .getFirstListItem<Profile>(`user = "${currentUser.id}"`)
        .catch(() => null)
      setProfile(p)

      // 2. Tentar buscar se o e-mail do usuário é de um cliente cadastrado
      const c = await pb
        .collection('clientes')
        .getFirstListItem<Cliente>(`email = "${currentUser.email}"`)
        .catch(() => null)
      setClienteProfile(c)

      // 3. Tentar buscar registro em membros_equipe
      const m = await pb
        .collection('membros_equipe')
        .getFirstListItem<MembroEquipe>(
          `usuario = "${currentUser.id}" || email = "${currentUser.email}"`,
        )
        .catch(() => null)
      if (m) {
        let parsed: EscopoItem[] = []
        if (typeof m.escopos === 'string') {
          try {
            parsed = JSON.parse(m.escopos)
          } catch {
            parsed = []
          }
        } else if (Array.isArray(m.escopos)) {
          parsed = m.escopos
        }
        setMembroEquipe({ ...m, escopos: parsed })
      } else {
        setMembroEquipe(null)
      }
    } catch {
      // Best-effort
    }
  }

  useEffect(() => {
    const init = async () => {
      setLoading(true)
      const currentUser = (pb.authStore.record as unknown as User) || null
      setUser(currentUser)
      await fetchProfileAndRole(currentUser)
      setLoading(false)
    }

    init()

    const unsubscribe = pb.authStore.onChange(async () => {
      const updatedUser = (pb.authStore.record as unknown as User) || null
      setUser(updatedUser)
      await fetchProfileAndRole(updatedUser)
    })

    return () => {
      unsubscribe()
    }
  }, [])

  const signIn = async (email: string, pass: string) => {
    try {
      const authData = await pb.collection('users').authWithPassword(email, pass)
      const currentUser = authData.record as unknown as User
      setUser(currentUser)
      await fetchProfileAndRole(currentUser)
      return { error: null }
    } catch (err) {
      return { error: err as Error }
    }
  }

  const signUp = async (email: string, pass: string, name?: string) => {
    try {
      const record = await pb.collection('users').create({
        email,
        password: pass,
        passwordConfirm: pass,
        name: name || '',
      })
      try {
        await pb.collection('users').requestVerification(email)
      } catch {
        /* best-effort */
      }
      // Autenticar logo após o cadastro
      await pb.collection('users').authWithPassword(email, pass)
      const currentUser = record as unknown as User
      setUser(currentUser)
      return { error: null }
    } catch (err) {
      return { error: err as Error }
    }
  }

  const signOut = () => {
    pb.authStore.clear()
    setUser(null)
    setProfile(null)
    setClienteProfile(null)
    setMembroEquipe(null)
  }

  const refreshProfile = async () => {
    if (user) {
      await fetchProfileAndRole(user)
    }
  }

  const requestPasswordReset = async (email: string) => {
    try {
      await pb.collection('users').requestPasswordReset(email)
      return { error: null }
    } catch (error) {
      return { error: error as Error }
    }
  }

  const confirmPasswordReset = async (token: string, password: string) => {
    try {
      await pb.collection('users').confirmPasswordReset(token, password, password)
      return { error: null }
    } catch (error) {
      return { error: error as Error }
    }
  }

  const requestEmailChange = async (newEmail: string) => {
    try {
      await pb.collection('users').requestEmailChange(newEmail)
      return { error: null }
    } catch (error) {
      return { error: error as Error }
    }
  }

  const confirmEmailChange = async (token: string, password: string) => {
    try {
      await pb.collection('users').confirmEmailChange(token, password)
      pb.authStore.clear()
      return { error: null }
    } catch (error) {
      return { error: error as Error }
    }
  }

  // Se o usuário tiver registro de cliente e não tiver perfil admin/interno completo
  const isClientPortal = Boolean(clienteProfile && (!profile || !profile.respostas_onboarding))

  // Escopos e Papéis do usuário logado (Master / Admin)
  const isOwner = user?.email === 'marcoschagasdiamond@icloud.com'
  const isMaster = Boolean(isOwner || membroEquipe?.is_master)
  const isAdmin = Boolean(
    isMaster || membroEquipe?.funcao === 'admin' || membroEquipe?.nivel_acesso === 'admin',
  )

  const meusEscopos: EscopoItem[] = isOwner
    ? [{ tipo: 'geral', nome: 'Acesso Geral Diamond', nivel: 'admin' }]
    : Array.isArray(membroEquipe?.escopos)
      ? (membroEquipe.escopos as EscopoItem[])
      : []

  // Convidado externo: quem entrou por convite e NÃO é Master nem Admin geral.
  // Possui escopo restrito (ex.: projeto, fluxo, demanda, cliente, categoria)
  const temEscopoGeral = meusEscopos.some((e) => e.tipo === 'geral')
  const isConvidadoExterno = Boolean(
    !isMaster && !isAdmin && meusEscopos.length > 0 && !temEscopoGeral,
  )
  const escopoPrincipal = isConvidadoExterno ? meusEscopos[0] || null : null

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        clienteProfile,
        membroEquipe,
        meusEscopos,
        isConvidadoExterno,
        escopoPrincipal,
        isClientPortal,
        isMaster,
        isAdmin,
        loading,
        signIn,
        signUp,
        signOut,
        refreshProfile,
        requestPasswordReset,
        confirmPasswordReset,
        requestEmailChange,
        confirmEmailChange,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider')
  return ctx
}
