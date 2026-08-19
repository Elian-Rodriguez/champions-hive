import { useState, type ReactNode } from 'react'
import { useAppDispatch, useAppSelector } from '../hooks'
import { logout, passwordChanged } from '../store/authSlice'
import { api } from '../services/api'
import type { View } from '../App'
import { Badge, Button, Card, Icon, Input } from './ui'
import NotificationsBell from './NotificationsBell'

const ROL_LABEL: Record<string, string> = {
  superadmin: 'Superadmin',
  admin: 'Organizador',
  referee: 'Árbitro',
  captain: 'Capitán',
}

export default function Layout({
  children,
  onNavigate,
}: {
  children: ReactNode
  onNavigate: (v: View) => void
}) {
  const dispatch = useAppDispatch()
  const { username, role, mustChangePassword } = useAppSelector((s) => s.auth)
  const [pwOpen, setPwOpen] = useState(false)
  const [cur, setCur] = useState('')
  const [next, setNext] = useState('')
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null)

  // Tras un reseteo de soporte la clave es temporal: el modal se abre solo y
  // no se puede cerrar hasta cambiarla.
  const forzado = !!mustChangePassword
  const abierto = pwOpen || forzado

  async function submitPassword(e: React.FormEvent) {
    e.preventDefault()
    setMsg(null)
    try {
      await api.changePassword(cur, next)
      setMsg({ ok: true, text: 'Contraseña actualizada' })
      setCur('')
      setNext('')
      dispatch(passwordChanged())
      if (forzado) setPwOpen(false)
    } catch (err: any) {
      setMsg({ ok: false, text: err.message || 'Error' })
    }
  }

  return (
    <div className="min-h-screen bg-surface text-on-surface">
      <header className="sticky top-0 z-20 border-b border-outline-variant/40 bg-surface-container-low/90 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3">
          <button onClick={() => onNavigate('landing')} className="flex items-center gap-2">
            <span className="grid h-9 w-9 place-items-center rounded-lg bg-secondary text-on-secondary">
              <Icon name="emoji_events" />
            </span>
            <span className="font-display text-lg font-bold tracking-tight">Champion Hive</span>
          </button>
          <div className="flex items-center gap-3">
            <button
              onClick={() => onNavigate('public')}
              className="hidden items-center gap-1 text-sm text-on-surface-variant hover:text-on-surface sm:flex"
            >
              <Icon name="scoreboard" className="text-base" /> Marcador público
            </button>
            <Badge className="bg-primary-container text-on-primary-container">
              {ROL_LABEL[role || ''] || 'Admin'}
            </Badge>
            <span className="hidden text-sm text-on-surface-variant md:block">{username}</span>
            <NotificationsBell />
            <button
              onClick={() => {
                setMsg(null)
                setPwOpen(true)
              }}
              className="flex items-center gap-1 rounded-lg bg-surface-container-high px-3 py-1.5 text-sm hover:bg-surface-bright"
              title="Cambiar contraseña"
            >
              <Icon name="key" className="text-base" />
            </button>
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

      {abierto && (
        <div
          className="fixed inset-0 z-30 grid place-items-center bg-black/60 p-4"
          onClick={() => !forzado && setPwOpen(false)}
        >
          <Card className="w-full max-w-sm p-6">
            <div onClick={(e) => e.stopPropagation()}>
              <div className="mb-4 flex items-center justify-between">
                <h3 className="flex items-center gap-2 font-display text-lg font-bold">
                  <Icon name="key" className="text-secondary" /> Cambiar contraseña
                </h3>
                {!forzado && (
                  <button onClick={() => setPwOpen(false)}>
                    <Icon name="close" />
                  </button>
                )}
              </div>
              {forzado && (
                <p className="mb-3 rounded-lg border border-tertiary/40 bg-tertiary/10 px-3 py-2 text-sm text-tertiary">
                  Tu contraseña fue restablecida por el administrador. Define una nueva
                  para continuar.
                </p>
              )}
              <form onSubmit={submitPassword} className="space-y-3">
                <Input
                  type="password"
                  placeholder={forzado ? 'Contraseña temporal' : 'Contraseña actual'}
                  value={cur}
                  onChange={(e) => setCur(e.target.value)}
                  required
                />
                <Input
                  type="password"
                  placeholder="Nueva contraseña (mínimo 6 caracteres)"
                  value={next}
                  onChange={(e) => setNext(e.target.value)}
                  required
                />
                {msg && (
                  <p className={`text-sm ${msg.ok ? 'text-secondary' : 'text-error'}`}>{msg.text}</p>
                )}
                <Button type="submit" className="w-full">
                  Guardar
                </Button>
              </form>
            </div>
          </Card>
        </div>
      )}
    </div>
  )
}
