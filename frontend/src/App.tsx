import { useState } from 'react'
import { useAppSelector } from './hooks'
import Layout from './components/Layout'
import LandingView from './components/LandingView'
import PublicView from './components/PublicView'
import LoginView from './components/LoginView'
import AdminView from './components/AdminView'
import RefereeView from './components/RefereeView'
import ScreensGallery from './components/ScreensGallery'

export type View = 'landing' | 'public' | 'login' | 'app' | 'screens'

export default function App() {
  const { token, role } = useAppSelector((s) => s.auth)
  const [view, setView] = useState<View>('landing')

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
    return <PublicView onBack={() => setView('landing')} />
  }
  if (view === 'screens') {
    return <ScreensGallery onBack={() => setView('landing')} />
  }
  return (
    <LandingView
      authed={!!token}
      onLogin={() => setView('login')}
      onPublic={() => setView('public')}
      onEnter={() => setView(token ? 'app' : 'login')}
      onScreens={() => setView('screens')}
    />
  )
}
