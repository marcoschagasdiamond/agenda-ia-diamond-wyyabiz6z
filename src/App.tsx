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

// Páginas Principais
import Dashboard from '@/pages/Dashboard'
import Folha from '@/pages/Folha'
import Fluxo from '@/pages/Fluxo'
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
import PortalCliente from '@/pages/PortalCliente'
import NotFound from '@/pages/NotFound'

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth()
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
                  <ProtectedRoute>
                    <Dashboard />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/folha"
                element={
                  <ProtectedRoute>
                    <Folha />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/fluxo"
                element={
                  <ProtectedRoute>
                    <Fluxo />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/projetos"
                element={
                  <ProtectedRoute>
                    <Projetos />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/projetos/:id"
                element={
                  <ProtectedRoute>
                    <ProjetoDetalhes />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/contatos"
                element={
                  <ProtectedRoute>
                    <Contatos />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/contatos/:id"
                element={
                  <ProtectedRoute>
                    <ContatoDetalhes />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/arquivos"
                element={
                  <ProtectedRoute>
                    <Arquivos />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/listas"
                element={
                  <ProtectedRoute>
                    <Listas />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/clientes"
                element={
                  <ProtectedRoute>
                    <Clientes />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/agente"
                element={
                  <ProtectedRoute>
                    <Agente />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/resumos"
                element={
                  <ProtectedRoute>
                    <Resumos />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/config"
                element={
                  <ProtectedRoute>
                    <Config />
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
