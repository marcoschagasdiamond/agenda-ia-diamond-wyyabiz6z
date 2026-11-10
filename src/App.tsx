import React from 'react'
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from '@/hooks/use-auth'
import { NavegacaoProvider } from '@/contexts/NavegacaoContext'
import Layout from '@/components/Layout'
import { Toaster } from '@/components/ui/toaster'

// Páginas de Autenticação & Onboarding
import Login from '@/pages/Login'
import Signup from '@/pages/Signup'
import VerifyEmail from '@/pages/VerifyEmail'
import ForgotPassword from '@/pages/ForgotPassword'
import ResetPassword from '@/pages/ResetPassword'
import Onboarding from '@/pages/Onboarding'
import FormularioPublico from '@/pages/FormularioPublico'

// Páginas Principais
import Dashboard from '@/pages/Dashboard'
import Folha from '@/pages/Folha'
import Calendario from '@/pages/Calendario'
import Fluxo from '@/pages/Fluxo'
import CardDetalhes from '@/pages/CardDetalhes'
import Projetos from '@/pages/Projetos'
import ProjetoDetalhes from '@/pages/ProjetoDetalhes'
import Contatos from '@/pages/Contatos'
import ContatoDetalhes from '@/pages/ContatoDetalhes'
import Arquivos from '@/pages/Arquivos'
import Listas from '@/pages/Listas'
import Clientes from '@/pages/Clientes'
import Agente from '@/pages/Agente'
import Resumos from '@/pages/Resumos'
import Config from '@/pages/Config'
import Equipe from '@/pages/Equipe'
import Master from '@/pages/Master'
import AceitarConvite from '@/pages/AceitarConvite'
import PortalCliente from '@/pages/PortalCliente'
import Perfil from '@/pages/Perfil'
import MinhaConta from '@/pages/MinhaConta'
import NotFound from '@/pages/NotFound'
import { TelaAcessoRestrito } from '@/components/comercial/TelaAcessoRestrito'
import { podeAcessarRecurso, type RecursoApp } from '@/lib/permissoes'

const ROTULOS_RECURSO: Record<RecursoApp, string> = {
  dashboard: 'Dashboard',
  folha: 'Folha do Dia',
  calendario: 'Calendário',
  fluxo: 'Fluxo Kanban',
  projetos: 'Projetos',
  contatos: 'Contatos',
  arquivos: 'Arquivos & Pastas',
  listas: 'Listas & Demandas',
  clientes: 'Clientes & Portal',
  equipe: 'Equipe & Convites',
  agente: 'Agente IA Diamond',
  resumos: 'Resumos do Dia',
  config: 'Configurações',
  master: 'Painel Master',
  portal: 'Portal do Cliente',
}

function ProtectedRoute({
  children,
  somenteMaster = false,
  recursoTipo,
}: {
  children: React.ReactNode
  somenteMaster?: boolean
  recursoTipo?:
    | 'folha'
    | 'calendario'
    | 'fluxo'
    | 'projetos'
    | 'contatos'
    | 'arquivos'
    | 'listas'
    | 'clientes'
    | 'equipe'
    | 'agente'
    | 'resumos'
    | 'config'
    | 'dashboard'
}) {
  const { user, loading, isMaster, isConvidadoExterno, meusEscopos, funcaoEquipe } = useAuth()

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F4F2EE] text-xs text-[#5B6470]">
        Carregando Agenda IA Diamond...
      </div>
    )
  }
  if (!user) {
    return <Navigate to="/login" replace />
  }

  // Cerco por função da equipe: membro comum não acessa Equipe nem Configurações;
  // portal do cliente não acessa módulos internos. Aplica a TelaAcessoRestrito.
  if (recursoTipo && !podeAcessarRecurso(funcaoEquipe, recursoTipo)) {
    return (
      <TelaAcessoRestrito
        escopos={meusEscopos}
        rotaTentada={ROTULOS_RECURSO[recursoTipo] || recursoTipo.toUpperCase()}
        userEmail={user.email}
      />
    )
  }

  // Trava de Administrador Master
  if (somenteMaster && !isMaster) {
    return (
      <TelaAcessoRestrito
        escopos={meusEscopos}
        rotaTentada="Painel do Administrador Master"
        userEmail={user.email}
      />
    )
  }

  // Cerco do Convidado Externo:
  // Se o usuário é convidado externo com escopo restrito (ex.: projeto ou fluxo específico),
  // e tentar acessar rotas fora do seu escopo (ex.: equipe, config, contatos, financeiro, listas), bloqueia!
  if (isConvidadoExterno && recursoTipo) {
    const escopoPrincipal = meusEscopos[0]
    let permitido = false

    if (recursoTipo === 'projetos' && escopoPrincipal?.tipo === 'projeto') {
      permitido = true
    } else if (
      recursoTipo === 'fluxo' &&
      (escopoPrincipal?.tipo === 'fluxo' || escopoPrincipal?.tipo === 'categoria')
    ) {
      permitido = true
    } else if (recursoTipo === 'folha' && escopoPrincipal?.tipo === 'demanda') {
      permitido = true
    } else if (recursoTipo === 'clientes' && escopoPrincipal?.tipo === 'cliente') {
      permitido = true
    }

    if (!permitido) {
      return (
        <TelaAcessoRestrito
          escopos={meusEscopos}
          rotaTentada={recursoTipo.toUpperCase()}
          userEmail={user.email}
        />
      )
    }
  }

  return <>{children}</>
}

export default function App() {
  return (
    <AuthProvider>
      <Router>
        <NavegacaoProvider>
          <Layout>
            <Routes>
              {/* Rotas Públicas */}
              <Route path="/login" element={<Login />} />
              <Route path="/signup" element={<Signup />} />
              <Route path="/verify-email" element={<VerifyEmail />} />
              <Route path="/forgot-password" element={<ForgotPassword />} />
              <Route path="/reset-password" element={<ResetPassword />} />
              <Route path="/convite/:token" element={<AceitarConvite />} />
              <Route path="/f/:slug" element={<FormularioPublico />} />

              {/* Onboarding Obrigatório Fixo */}
              <Route
                path="/onboarding"
                element={
                  <ProtectedRoute>
                    <Onboarding />
                  </ProtectedRoute>
                }
              />

              {/* Rotas Principais do Sistema */}
              <Route
                path="/"
                element={
                  <ProtectedRoute recursoTipo="dashboard">
                    <Dashboard />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/folha"
                element={
                  <ProtectedRoute recursoTipo="folha">
                    <Folha />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/calendario"
                element={
                  <ProtectedRoute recursoTipo="calendario">
                    <Calendario />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/fluxo"
                element={
                  <ProtectedRoute recursoTipo="fluxo">
                    <Fluxo />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/card/:id"
                element={
                  <ProtectedRoute recursoTipo="fluxo">
                    <CardDetalhes />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/projetos"
                element={
                  <ProtectedRoute recursoTipo="projetos">
                    <Projetos />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/projetos/:id"
                element={
                  <ProtectedRoute recursoTipo="projetos">
                    <ProjetoDetalhes />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/contatos"
                element={
                  <ProtectedRoute recursoTipo="contatos">
                    <Contatos />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/contatos/:id"
                element={
                  <ProtectedRoute recursoTipo="contatos">
                    <ContatoDetalhes />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/arquivos"
                element={
                  <ProtectedRoute recursoTipo="arquivos">
                    <Arquivos />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/listas"
                element={
                  <ProtectedRoute recursoTipo="listas">
                    <Listas />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/clientes"
                element={
                  <ProtectedRoute recursoTipo="clientes">
                    <Clientes />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/equipe"
                element={
                  <ProtectedRoute recursoTipo="equipe">
                    <Equipe />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/master"
                element={
                  <ProtectedRoute somenteMaster>
                    <Master />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/agente"
                element={
                  <ProtectedRoute recursoTipo="agente">
                    <Agente />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/resumos"
                element={
                  <ProtectedRoute recursoTipo="resumos">
                    <Resumos />
                  </ProtectedRoute>
                }
              />
              {/* Perfil do Usuário (nome e senha) — todos os perfis autenticados */}
              <Route
                path="/perfil"
                element={
                  <ProtectedRoute>
                    <Perfil />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/config"
                element={
                  <ProtectedRoute recursoTipo="config">
                    <Config />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/config/formularios"
                element={<Navigate to="/config?aba=formularios" replace />}
              />

              {/* Minha Conta — todos os perfis autenticados, incluindo portal do cliente */}
              <Route
                path="/conta"
                element={
                  <ProtectedRoute>
                    <MinhaConta />
                  </ProtectedRoute>
                }
              />

              {/* Portal do Cliente */}
              <Route
                path="/portal"
                element={
                  <ProtectedRoute>
                    <PortalCliente />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/portal/demandas"
                element={
                  <ProtectedRoute>
                    <PortalCliente />
                  </ProtectedRoute>
                }
              />

              {/* 404 */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </Layout>
        </NavegacaoProvider>
        <Toaster />
      </Router>
    </AuthProvider>
  )
}
