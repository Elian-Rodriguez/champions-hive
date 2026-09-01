import { useState } from 'react'
import { motion } from 'framer-motion'
import { api } from '../services/api'
import { useAppDispatch } from '../hooks'
import { setCredentials } from '../store/authSlice'
import { Brand, Button, Eyebrow, Icon, Input } from './ui'

const FEATURES = [
  { icon: 'account_tree', label: 'Brackets en vivo' },
  { icon: 'insights', label: 'Estadísticas en tiempo real' },
  { icon: 'sports', label: 'Multideporte' },
]

/** Las tres caras de esta pantalla: entrar, pedir el enlace y ponerse una
 *  contraseña nueva con el enlace que llegó al correo. */
type Modo = 'login' | 'olvide' | 'reset'

const TITULOS: Record<Modo, { titulo: string; bajada: string }> = {
  login: {
    titulo: 'Bienvenido de nuevo',
    bajada: 'Inicia sesión para gestionar tus torneos.',
  },
  olvide: {
    titulo: '¿Perdiste el acceso?',
    bajada: 'Escribe tu correo y te mandamos un enlace para entrar de nuevo.',
  },
  reset: {
    titulo: 'Elige tu contraseña',
    bajada: 'El enlace sirve una sola vez. Escribe la nueva y ya puedes entrar.',
  },
}

export default function LoginView({
  onSuccess,
  onBack,
  resetToken,
  onResetDone,
}: {
  onSuccess: () => void
  onBack: () => void
  /** Token del enlace de recuperación (?reset=…), si se llegó por correo. */
  resetToken?: string | null
  onResetDone?: () => void
}) {
  const dispatch = useAppDispatch()
  const [modo, setModo] = useState<Modo>(resetToken ? 'reset' : 'login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [password2, setPassword2] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [aviso, setAviso] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  function cambiarModo(nuevo: Modo) {
    setModo(nuevo)
    setError(null)
    setAviso(null)
    setPassword('')
    setPassword2('')
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      const data = await api.login(email, password)
      dispatch(
        setCredentials({
          token: data.access_token,
          role: data.role,
          username: email,
          userId: data.user_id,
          mustChangePassword: !!data.must_change_password,
        }),
      )
      onSuccess()
    } catch (err: any) {
      setError(err.message || 'Error de autenticación')
    } finally {
      setLoading(false)
    }
  }

  /** Pide el enlace. La respuesta es la misma exista o no la cuenta, así que
   *  aquí tampoco se puede saber si ese correo está registrado. */
  async function pedirEnlace(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setAviso(null)
    setLoading(true)
    try {
      const r = await api.forgotPassword(email)
      setAviso(r?.message || 'Si esa cuenta existe, te enviamos un correo.')
    } catch (err: any) {
      setError(err.message || 'No se pudo enviar el correo')
    } finally {
      setLoading(false)
    }
  }

  async function guardarNueva(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    if (password.length < 6) {
      setError('La contraseña debe tener al menos 6 caracteres')
      return
    }
    if (password !== password2) {
      setError('Las dos contraseñas no coinciden')
      return
    }
    setLoading(true)
    try {
      const r = await api.resetPasswordWithToken(resetToken || '', password)
      if (r?.email) setEmail(r.email)
      onResetDone?.()
      cambiarModo('login')
      setAviso(r?.message || 'Contraseña actualizada. Ya puedes iniciar sesión.')
    } catch (err: any) {
      setError(err.message || 'No se pudo cambiar la contraseña')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      {/* Panel hero (solo escritorio) */}
      <div className="hero-glow relative hidden flex-col justify-between overflow-hidden border-r border-outline-variant/30 bg-surface-container-lowest p-10 lg:flex">
        <button
          onClick={onBack}
          className="flex w-fit items-center gap-1 text-sm text-on-surface-variant transition hover:text-on-surface"
        >
          <Icon name="arrow_back" className="text-base" /> Volver
        </button>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="space-y-7"
        >
          <Brand className="block text-5xl leading-none" />
          <p className="max-w-sm text-xl text-on-surface-variant">
            Domina el juego. Orquesta la gloria.
          </p>

          <div className="relative mx-auto w-fit">
            <div className="absolute inset-0 rounded-3xl bg-secondary/20 blur-2xl" />
            <img
              src="/icon-512.png"
              alt="Champion Hive"
              className="relative h-44 w-44 rounded-3xl border border-secondary/30 object-cover"
            />
          </div>

          <div>
            <div className="flex items-center gap-2">
              <span className="inline-block h-0.5 w-10 rounded-full bg-secondary" />
              <Eyebrow>El estándar profesional</Eyebrow>
            </div>
            <p className="mt-3 max-w-sm text-on-surface-variant">
              Brackets profesionales, estadísticas en tiempo real y gestión integral de torneos
              en una sola plataforma.
            </p>
          </div>
        </motion.div>

        <div className="flex flex-wrap gap-2">
          {FEATURES.map((f) => (
            <span
              key={f.label}
              className="inline-flex items-center gap-1.5 rounded-full border border-outline-variant/40 bg-surface-container/60 px-3 py-1.5 text-sm text-on-surface-variant"
            >
              <Icon name={f.icon} className="text-base text-secondary" /> {f.label}
            </span>
          ))}
        </div>
      </div>

      {/* Formulario */}
      <div className="flex items-center justify-center bg-surface px-4 py-10">
        <motion.div
          initial={{ opacity: 0, scale: 0.97 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.3 }}
          className="w-full max-w-md"
        >
          {/* Marca compacta (móvil) */}
          <button
            onClick={onBack}
            className="mb-6 flex items-center gap-1 text-sm text-on-surface-variant transition hover:text-on-surface lg:hidden"
          >
            <Icon name="arrow_back" className="text-base" /> Volver
          </button>
          <div className="mb-6 flex items-center gap-3 lg:hidden">
            <img src="/icon-192.png" alt="" className="h-10 w-10 rounded-xl" />
            <Brand className="text-2xl" />
          </div>

          <h1 className="font-display text-3xl font-bold">{TITULOS[modo].titulo}</h1>
          <p className="mt-1 text-sm text-on-surface-variant">{TITULOS[modo].bajada}</p>

          <form
            onSubmit={
              modo === 'login' ? submit : modo === 'olvide' ? pedirEnlace : guardarNueva
            }
            className="mt-7 space-y-4"
          >
            {modo !== 'reset' && (
              <div>
                <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-on-surface-variant">
                  Correo
                </label>
                <Input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@championhive.com"
                />
              </div>
            )}
            {modo === 'login' && (
              <div>
                <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-on-surface-variant">
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
            )}
            {modo === 'reset' && (
              <>
                <div>
                  <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-on-surface-variant">
                    Contraseña nueva
                  </label>
                  <Input
                    type="password"
                    required
                    autoFocus
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Al menos 6 caracteres"
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-on-surface-variant">
                    Repítela
                  </label>
                  <Input
                    type="password"
                    required
                    value={password2}
                    onChange={(e) => setPassword2(e.target.value)}
                    placeholder="••••••••"
                  />
                </div>
              </>
            )}

            {error && (
              <div className="flex items-center gap-2 rounded-lg bg-error-container/40 px-3 py-2 text-sm text-error">
                <Icon name="error" className="text-base" /> {error}
              </div>
            )}
            {aviso && (
              <div className="flex items-start gap-2 rounded-lg bg-secondary/10 px-3 py-2 text-sm text-secondary">
                <Icon name="mark_email_read" className="text-base" /> {aviso}
              </div>
            )}

            <Button type="submit" disabled={loading} className="w-full py-3 text-base">
              {loading
                ? 'Procesando…'
                : modo === 'login'
                  ? 'Iniciar sesión'
                  : modo === 'olvide'
                    ? 'Enviarme el enlace'
                    : 'Guardar y entrar'}
            </Button>
          </form>

          {modo === 'login' ? (
            <button
              type="button"
              onClick={() => cambiarModo('olvide')}
              className="mt-4 block w-full text-center text-sm text-on-surface-variant transition hover:text-secondary"
            >
              ¿Olvidaste tu contraseña?
            </button>
          ) : (
            <button
              type="button"
              onClick={() => {
                onResetDone?.()
                cambiarModo('login')
              }}
              className="mt-4 flex w-full items-center justify-center gap-1 text-sm text-on-surface-variant transition hover:text-on-surface"
            >
              <Icon name="arrow_back" className="text-base" /> Volver a iniciar sesión
            </button>
          )}

          <p className="mt-6 text-center text-xs text-on-surface-variant">
            {modo === 'olvide'
              ? 'Si no te llega en unos minutos, revisa el spam o pídele al organizador que te la restablezca.'
              : 'Las cuentas las crea un administrador desde el panel.'}
          </p>
        </motion.div>
      </div>
    </div>
  )
}
