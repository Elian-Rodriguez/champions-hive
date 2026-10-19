import { useState, type ReactNode } from 'react'
import { useAppDispatch, useAppSelector } from '../hooks'
import { logout, passwordChanged } from '../store/authSlice'
import { api } from '../services/api'
import type { View } from '../App'
import { Badge, Brand, Button, Card, HiveMark, Icon, Input } from './ui'
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
      <header className="edge-glow glass sticky top-0 z-20">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-2.5">
          <button
            onClick={() => onNavigate('landing')}
            className="group flex items-center gap-2.5"
            title="Inicio"
          >
            <HiveMark className="h-9 w-9 transition duration-300 ease-snap group-hover:rotate-[20deg]" />
            <Brand className="text-lg" />
          </button>
          <div className="flex items-center gap-2">
            <button
              onClick={() => onNavigate('public')}
              className="hidden items-center gap-1.5 rounded-full border border-outline-variant/70 px-3 py-1.5 text-sm text-on-surface-variant transition hover:border-secondary/60 hover:text-secondary sm:flex"
            >
              <Icon name="scoreboard" className="text-base" /> Marcador público
            </button>
            <Badge className="border border-primary/25 bg-primary-container text-on-primary-container">
              {ROL_LABEL[role || ''] || 'Admin'}
            </Badge>
            <span className="hidden max-w-[14rem] truncate text-sm text-on-surface-variant md:block">
              {username}
            </span>
            <NotificationsBell />
            <button
              onClick={() => {
                setMsg(null)
                setPwOpen(true)
              }}
              className="grid h-9 w-9 place-items-center rounded-lg bg-surface-container-high text-on-surface-variant transition hover:bg-surface-bright hover:text-secondary"
              title="Cambiar contraseña"
            >
              <Icon name="key" className="text-base" />
            </button>
            <button
              onClick={() => {
                dispatch(logout())
                onNavigate('landing')
              }}
              className="flex items-center gap-1 rounded-lg bg-surface-container-high px-3 py-1.5 text-sm transition hover:bg-error-container/40 hover:text-on-error-container"
            >
              <Icon name="logout" className="text-base" /> Salir
            </button>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-7xl px-4 py-6">{children}</main>

      {abierto && (
        <div
          className="fixed inset-0 z-30 grid place-items-center bg-black/75 p-4 backdrop-blur-sm"
          onClick={() => !forzado && setPwOpen(false)}
        >
          <Card className="w-full max-w-sm p-6">
            <div onClick={(e) => e.stopPropagation()}>
              <div className="mb-4 flex items-center justify-between">
                <h3 className="headline flex items-center gap-2 text-lg">
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
