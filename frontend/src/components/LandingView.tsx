import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { api } from '../services/api'
import { Button, Card, Icon } from './ui'

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
  onScreens,
  onOpenTournament,
}: {
  authed: boolean
  onLogin: () => void
  onPublic: () => void
  onEnter: () => void
  onScreens: () => void
  onOpenTournament: (id: string) => void
}) {
  const [tournaments, setTournaments] = useState<any[]>([])

  useEffect(() => {
    api.getTournaments().then(setTournaments).catch(() => setTournaments([]))
  }, [])

  const ordered = [...tournaments].sort((a, b) => {
    const w = (t: any) => (t.status === 'active' ? 0 : t.status === 'draft' ? 2 : 1)
    return w(a) - w(b)
  })

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
            <Button variant="outline" onClick={onPublic} className="px-6 py-3 text-base">
              <Icon name="scoreboard" /> Marcador público
            </Button>
            {!authed && (
              <Button variant="ghost" onClick={onLogin} className="px-6 py-3 text-base">
                Iniciar sesión
              </Button>
            )}
          </div>
          <button onClick={onScreens} className="mt-5 flex items-center gap-1 text-sm text-on-surface-variant hover:text-secondary">
            <Icon name="palette" className="text-base" /> Ver galería de diseños
          </button>
        </motion.div>

        {/* Torneos en juego */}
        {ordered.length > 0 && (
          <div className="mt-16">
            <h2 className="mb-4 flex items-center gap-2 font-display text-2xl font-bold">
              <Icon name="stadium" className="text-secondary" /> Torneos
            </h2>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {ordered.map((t, i) => (
                <motion.button
                  key={t.id}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, delay: 0.04 * i }}
                  onClick={() => onOpenTournament(t.id)}
                  className="text-left"
                >
                  <Card className="h-full p-5 transition hover:border-secondary/60">
                    <div className="flex items-center gap-3">
                      <span className="grid h-11 w-11 place-items-center overflow-hidden rounded-lg bg-secondary-container/40 text-secondary">
                        {t.logo_url ? <img src={t.logo_url} alt="" className="h-full w-full object-cover" /> : <Icon name="emoji_events" />}
                      </span>
                      <div className="min-w-0">
                        <h3 className="truncate font-display font-semibold">{t.name}</h3>
                        <p className="text-xs uppercase tracking-wide text-on-surface-variant">{t.sport_type}</p>
                      </div>
                      <span
                        className={`ml-auto rounded-full px-2 py-0.5 text-xs font-semibold ${
                          t.status === 'active'
                            ? 'bg-secondary-container/40 text-secondary'
                            : 'bg-surface-container-highest text-on-surface-variant'
                        }`}
                      >
                        {t.status === 'active' ? 'En juego' : t.status}
                      </span>
                    </div>
                    <div className="mt-3 flex items-center gap-1 text-xs text-on-surface-variant">
                      <Icon name="visibility" className="text-sm" /> Ver grupos, posiciones, bracket y calendario
                    </div>
                  </Card>
                </motion.button>
              ))}
            </div>
          </div>
        )}

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
              <h3 className="mt-3 font-display text-lg font-semibold">{f.title}</h3>
              <p className="mt-1 text-sm text-on-surface-variant">{f.desc}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  )
}
