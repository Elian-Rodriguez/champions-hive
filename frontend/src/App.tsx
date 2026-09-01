import { useEffect, useState } from 'react'
import { useAppSelector } from './hooks'
import Layout from './components/Layout'
import LandingView from './components/LandingView'
import PublicView from './components/PublicView'
import LoginView from './components/LoginView'
import AdminView from './components/AdminView'
import RefereeView from './components/RefereeView'
import CaptainView from './components/CaptainView'

export type View = 'landing' | 'public' | 'login' | 'app'

export default function App() {
  const { token, role } = useAppSelector((s) => s.auth)
  const [view, setView] = useState<View>('landing')
  const [publicTid, setPublicTid] = useState<string | null>(null)
  // Token del enlace de recuperación que llegó por correo (?reset=…).
  const [resetToken, setResetToken] = useState<string | null>(null)

  // Deep-links: ?t=<id> abre el marcador público de ese torneo (QR del
  // torneo) y ?reset=<token> abre la pantalla de contraseña nueva.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const t = params.get('t')
    if (t) {
      setPublicTid(t)
      setView('public')
    }
    const reset = params.get('reset')
    if (reset) {
      setResetToken(reset)
      setView('login')
      // El token sale de la barra de direcciones en cuanto se lee: es una
      // credencial y no tiene por qué quedar en el historial del navegador.
      params.delete('reset')
      const query = params.toString()
      window.history.replaceState(
        {},
        '',
        window.location.pathname + (query ? `?${query}` : ''),
      )
    }
  }, [])

  if (view === 'app' && token) {
    // Cada rol entra a su propio panel: el árbitro carga partidos, el capitán
    // solo consulta lo de su equipo y el resto administra.
    return (
      <Layout onNavigate={setView}>
        {role === 'referee' ? (
          <RefereeView />
        ) : role === 'captain' ? (
          <CaptainView />
        ) : (
          <AdminView />
        )}
      </Layout>
    )
  }
  if (view === 'login') {
    return (
      <LoginView
        onSuccess={() => setView('app')}
        onBack={() => setView('landing')}
        resetToken={resetToken}
        onResetDone={() => setResetToken(null)}
      />
    )
  }
  if (view === 'public') {
    return (
      <PublicView onBack={() => setView('landing')} initialTournamentId={publicTid} />
    )
  }
  return (
    <LandingView
      authed={!!token}
      onLogin={() => setView('login')}
      onPublic={() => {
        setPublicTid(null)
        setView('public')
      }}
      onEnter={() => setView(token ? 'app' : 'login')}
      onOpenTournament={(id) => {
        setPublicTid(id)
        setView('public')
      }}
    />
  )
}
