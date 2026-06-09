import { useState } from 'react'
import { useAppSelector } from './hooks'
import Layout from './components/Layout'
import LandingView from './components/LandingView'
import PublicView from './components/PublicView'
import LoginView from './components/LoginView'
import AdminView from './components/AdminView'
import RefereeView from './components/RefereeView'

export type View = 'landing' | 'public' | 'login' | 'app'

export default function App() {
  const { token, role } = useAppSelector((s) => s.auth)
  const [view, setView] = useState<View>('landing')
  const [publicTid, setPublicTid] = useState<string | null>(null)

  if (view === 'app' && token) {
    return (
      <Layout onNavigate={setView}>
        {role === 'referee' ? <RefereeView /> : <AdminView />}
      </Layout>
    )
  }
  if (view === 'login') {
    return (
      <LoginView
        onSuccess={() => setView('app')}
        onBack={() => setView('landing')}
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
