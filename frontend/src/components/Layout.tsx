import type { ReactNode } from 'react'
import { useAppDispatch, useAppSelector } from '../hooks'
import { logout } from '../store/authSlice'
import type { View } from '../App'
import { Badge, Icon } from './ui'

export default function Layout({
  children,
  onNavigate,
}: {
  children: ReactNode
  onNavigate: (v: View) => void
}) {
  const dispatch = useAppDispatch()
  const { username, role } = useAppSelector((s) => s.auth)

  return (
    <div className="min-h-screen bg-surface text-on-surface">
      <header className="sticky top-0 z-20 border-b border-outline-variant/40 bg-surface-container-low/90 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3">
          <button
            onClick={() => onNavigate('landing')}
            className="flex items-center gap-2"
          >
            <span className="grid h-9 w-9 place-items-center rounded-lg bg-secondary text-on-secondary">
              <Icon name="emoji_events" />
            </span>
            <span className="font-display text-lg font-bold tracking-tight">
              Champion Hive
            </span>
          </button>
          <div className="flex items-center gap-3">
            <button
              onClick={() => onNavigate('public')}
              className="hidden items-center gap-1 text-sm text-on-surface-variant hover:text-on-surface sm:flex"
            >
              <Icon name="scoreboard" className="text-base" /> Marcador público
            </button>
            <Badge className="bg-primary-container text-on-primary-container">
              {role === 'referee' ? 'Árbitro' : 'Admin'}
            </Badge>
            <span className="hidden text-sm text-on-surface-variant md:block">
              {username}
            </span>
            <button
              onClick={() => {
                dispatch(logout())
                onNavigate('landing')
              }}
              className="flex items-center gap-1 rounded-lg bg-surface-container-high px-3 py-1.5 text-sm hover:bg-surface-bright"
            >
              <Icon name="logout" className="text-base" /> Salir
            </button>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-7xl px-4 py-6">{children}</main>
    </div>
  )
}
