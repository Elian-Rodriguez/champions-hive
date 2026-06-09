import { useState } from 'react'
import { motion } from 'framer-motion'
import { api } from '../services/api'
import { useAppDispatch } from '../hooks'
import { setCredentials } from '../store/authSlice'
import { Button, Icon, Input } from './ui'

export default function LoginView({
  onSuccess,
  onBack,
}: {
  onSuccess: () => void
  onBack: () => void
}) {
  const dispatch = useAppDispatch()
  const [mode, setMode] = useState<'login' | 'register'>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [role, setRole] = useState('admin')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      if (mode === 'register') {
        await api.register({ email, password, role })
      }
      const data = await api.login(email, password)
      dispatch(
        setCredentials({
          token: data.access_token,
          role: data.role,
          username: email,
        }),
      )
      onSuccess()
    } catch (err: any) {
      setError(err.message || 'Error de autenticación')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="grid min-h-screen place-items-center bg-surface px-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.3 }}
        className="w-full max-w-md rounded-2xl border border-outline-variant/40 bg-surface-container p-8"
      >
        <button
          onClick={onBack}
          className="mb-4 flex items-center gap-1 text-sm text-on-surface-variant hover:text-on-surface"
        >
          <Icon name="arrow_back" className="text-base" /> Volver
        </button>
        <div className="mb-6 flex items-center gap-3">
          <span className="grid h-11 w-11 place-items-center rounded-xl bg-secondary text-on-secondary">
            <Icon name="emoji_events" />
          </span>
          <div>
            <h1 className="font-display text-2xl font-bold">Champion Hive</h1>
            <p className="text-sm text-on-surface-variant">
              {mode === 'login' ? 'Inicia sesión' : 'Crea una cuenta'}
            </p>
          </div>
        </div>

        <form onSubmit={submit} className="space-y-4">
          <div>
            <label className="mb-1 block text-sm text-on-surface-variant">
              Email
            </label>
            <Input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="admin@championhive.com"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm text-on-surface-variant">
              Contraseña
            </label>
            <Input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
            />
          </div>
          {mode === 'register' && (
            <div>
              <label className="mb-1 block text-sm text-on-surface-variant">
                Rol
              </label>
              <select
                value={role}
                onChange={(e) => setRole(e.target.value)}
                className="w-full rounded-lg border border-outline-variant bg-surface-container-low px-3 py-2 text-on-surface focus:border-secondary focus:outline-none"
              >
                <option value="admin">Administrador</option>
                <option value="referee">Árbitro</option>
              </select>
            </div>
          )}

          {error && (
            <div className="flex items-center gap-2 rounded-lg bg-error-container/40 px-3 py-2 text-sm text-error">
              <Icon name="error" className="text-base" /> {error}
            </div>
          )}

          <Button type="submit" disabled={loading} className="w-full py-2.5">
            {loading ? 'Procesando…' : mode === 'login' ? 'Entrar' : 'Registrarme'}
          </Button>
        </form>

        <p className="mt-5 text-center text-sm text-on-surface-variant">
          {mode === 'login' ? '¿Primera vez?' : '¿Ya tienes cuenta?'}{' '}
          <button
            onClick={() => {
              setMode(mode === 'login' ? 'register' : 'login')
              setError(null)
            }}
            className="font-semibold text-secondary hover:underline"
          >
            {mode === 'login' ? 'Crea una cuenta' : 'Inicia sesión'}
          </button>
        </p>
      </motion.div>
    </div>
  )
}
