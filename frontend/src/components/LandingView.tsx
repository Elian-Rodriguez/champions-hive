import { motion } from 'framer-motion'
import { Button, Icon } from './ui'

const features = [
  { icon: 'sports_soccer', title: 'Multideporte', desc: 'Fútbol, microfútbol y baloncesto.' },
  { icon: 'account_tree', title: 'Fases y brackets', desc: 'Grupos, liga, suizo y eliminación directa.' },
  { icon: 'leaderboard', title: 'Posiciones', desc: 'Desempates configurables en tiempo real.' },
  { icon: 'sports', title: 'Panel de árbitro', desc: 'Registro de eventos en vivo.' },
]

export default function LandingView({
  authed,
  onLogin,
  onPublic,
  onEnter,
}: {
  authed: boolean
  onLogin: () => void
  onPublic: () => void
  onEnter: () => void
}) {
  return (
    <div className="min-h-screen bg-surface text-on-surface">
      <div className="mx-auto max-w-6xl px-4 py-16">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="flex flex-col items-center text-center"
        >
          <span className="mb-6 grid h-16 w-16 place-items-center rounded-2xl bg-secondary text-on-secondary shadow-lg shadow-secondary/20">
            <Icon name="emoji_events" className="text-4xl" />
          </span>
          <h1 className="font-display text-5xl font-extrabold tracking-tight md:text-6xl">
            Champion <span className="text-secondary">Hive</span>
          </h1>
          <p className="mt-4 max-w-xl text-lg text-on-surface-variant">
            Gestión de torneos deportivos multideporte: equipos, fixtures,
            eliminatorias y resultados en vivo.
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <Button onClick={onEnter} className="px-6 py-3 text-base">
              <Icon name={authed ? 'dashboard' : 'login'} />
              {authed ? 'Ir al panel' : 'Entrar'}
            </Button>
            <Button
              variant="outline"
              onClick={onPublic}
              className="px-6 py-3 text-base"
            >
              <Icon name="scoreboard" /> Ver marcador público
            </Button>
            {!authed && (
              <Button variant="ghost" onClick={onLogin} className="px-6 py-3 text-base">
                Iniciar sesión
              </Button>
            )}
          </div>
        </motion.div>

        <div className="mt-20 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {features.map((f, i) => (
            <motion.div
              key={f.title}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.1 * i }}
              className="rounded-xl border border-outline-variant/40 bg-surface-container p-5"
            >
              <Icon name={f.icon} className="text-3xl text-secondary" />
              <h3 className="mt-3 font-display text-lg font-semibold">
                {f.title}
              </h3>
              <p className="mt-1 text-sm text-on-surface-variant">{f.desc}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  )
}
