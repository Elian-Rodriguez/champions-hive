import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { api } from '../services/api'
import { Button, Card, Icon } from './ui'

const FEATURES = [
  { icon: 'sports_soccer', title: 'Multideporte', desc: 'Fútbol, microfútbol y baloncesto, cada uno con su lógica de puntuación.' },
  { icon: 'account_tree', title: 'Grupos y eliminatorias', desc: 'Fase de grupos, liga, suizo y bracket de eliminación con 3er puesto.' },
  { icon: 'bolt', title: 'En tiempo real', desc: 'El árbitro carga goles, tarjetas y cambios; el público lo ve al instante.' },
  { icon: 'leaderboard', title: 'Posiciones y desempates', desc: 'Tabla configurable: puntos, diferencia, fair-play, enfrentamiento directo.' },
  { icon: 'insights', title: 'Estadísticas y gráficas', desc: 'Goleadores, curva de puntos, goles por fecha y un dashboard profesional.' },
  { icon: 'install_mobile', title: 'PWA instalable', desc: 'Funciona desde el celular del árbitro y del público, también offline.' },
]

const STEPS = [
  { icon: 'add_circle', title: 'Crea el torneo', desc: 'Define deporte, puntos y criterios de desempate.' },
  { icon: 'shuffle', title: 'Sortea y arma el fixture', desc: 'Equipos, jugadores, grupos al azar y calendario automático.' },
  { icon: 'sports', title: 'Carga resultados en vivo', desc: 'El árbitro registra desde el celular, minuto a minuto.' },
  { icon: 'public', title: 'Comparte el marcador', desc: 'Posiciones, bracket y estadísticas públicas, sin login.' },
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
  const active = tournaments.filter((t) => t.status === 'active')

  return (
    <div className="relative min-h-screen overflow-x-hidden bg-surface text-on-surface">
      {/* Glows de fondo */}
      <div className="pointer-events-none absolute -top-40 -right-32 h-96 w-96 rounded-full bg-secondary/20 blur-[120px]" />
      <div className="pointer-events-none absolute top-80 -left-40 h-96 w-96 rounded-full bg-primary/10 blur-[120px]" />

      {/* Nav */}
      <header className="sticky top-0 z-30 border-b border-outline-variant/30 bg-surface/70 backdrop-blur-lg">
        <nav className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
          <span className="flex items-center gap-2">
            <span className="grid h-8 w-8 place-items-center rounded-lg bg-secondary text-on-secondary">
              <Icon name="emoji_events" className="text-lg" />
            </span>
            <span className="font-display text-lg font-bold tracking-tight">Champion Hive</span>
          </span>
          <div className="hidden items-center gap-6 text-sm text-on-surface-variant md:flex">
            <a href="#features" className="hover:text-on-surface">Características</a>
            <a href="#como" className="hover:text-on-surface">Cómo funciona</a>
            <a href="#torneos" className="hover:text-on-surface">Torneos</a>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={onPublic} className="hidden text-sm text-on-surface-variant hover:text-on-surface sm:block">
              Marcador público
            </button>
            <Button onClick={onEnter} className="px-4 py-2">
              {authed ? 'Ir al panel' : 'Entrar'}
            </Button>
          </div>
        </nav>
      </header>

      {/* Hero */}
      <section className="relative mx-auto grid max-w-6xl items-center gap-10 px-4 py-16 lg:grid-cols-2 lg:py-24">
        <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
          <span className="inline-flex items-center gap-1.5 rounded-full border border-secondary/30 bg-secondary/10 px-3 py-1 text-xs font-semibold text-secondary">
            <Icon name="bolt" className="text-sm" /> Gestión de torneos en tiempo real
          </span>
          <h1 className="mt-5 font-display text-5xl font-extrabold leading-[1.05] tracking-tight md:text-6xl">
            Organiza torneos como un <span className="text-secondary">profesional</span>.
          </h1>
          <p className="mt-5 max-w-lg text-lg text-on-surface-variant">
            La plataforma todo-en-uno para gestionar campeonatos deportivos: equipos, fixtures,
            eliminatorias, resultados en vivo y un marcador público que enamora.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Button onClick={onEnter} className="px-6 py-3 text-base">
              <Icon name="rocket_launch" /> {authed ? 'Ir al panel' : 'Empezar gratis'}
            </Button>
            <Button variant="outline" onClick={onPublic} className="px-6 py-3 text-base">
              <Icon name="scoreboard" /> Ver marcador público
            </Button>
          </div>
          <div className="mt-6 flex flex-wrap items-center gap-x-6 gap-y-2 text-sm text-on-surface-variant">
            <span className="flex items-center gap-1.5"><Icon name="check_circle" className="text-base text-secondary" /> Sin instalar nada</span>
            <span className="flex items-center gap-1.5"><Icon name="check_circle" className="text-base text-secondary" /> Multideporte</span>
            <span className="flex items-center gap-1.5"><Icon name="check_circle" className="text-base text-secondary" /> Marcador público</span>
          </div>
        </motion.div>

        {/* Preview del producto */}
        <motion.div
          initial={{ opacity: 0, scale: 0.94, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.15 }}
          className="relative"
        >
          <div className="rounded-3xl border border-outline-variant/40 bg-gradient-to-br from-surface-container-high to-surface-container p-5 shadow-2xl shadow-black/40">
            <div className="mb-4 flex items-center justify-between">
              <span className="flex items-center gap-2 text-sm font-semibold">
                <Icon name="emoji_events" className="text-secondary" /> Final · Champions
              </span>
              <span className="inline-flex items-center gap-1 rounded-full bg-error-container/40 px-2 py-0.5 text-xs font-bold text-error">
                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-error" /> EN VIVO
              </span>
            </div>
            <div className="space-y-2">
              {[
                { a: 'Pumas', b: 'Águilas', s1: 4, s2: 0, win: 'a' },
                { a: 'Toros', b: 'Tiburones', s1: 4, s2: 1, win: 'a' },
              ].map((m, i) => (
                <div key={i} className="rounded-xl bg-surface-container-low p-3">
                  <div className={`flex items-center justify-between text-sm ${m.win === 'a' ? 'font-bold text-secondary' : ''}`}>
                    <span className="flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-full bg-secondary" /> {m.a}</span>
                    <span className="tabular-nums">{m.s1}</span>
                  </div>
                  <div className="mt-1 flex items-center justify-between text-sm text-on-surface-variant">
                    <span className="flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-full bg-primary" /> {m.b}</span>
                    <span className="tabular-nums">{m.s2}</span>
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-4 flex items-end gap-1.5">
              {[40, 65, 30, 80, 55, 70, 45].map((h, i) => (
                <div key={i} className="flex-1 rounded-t bg-secondary/80" style={{ height: `${h}px` }} />
              ))}
            </div>
            <p className="mt-2 text-center text-xs text-on-surface-variant">Goles por fecha</p>
          </div>
          <div className="absolute -bottom-4 -left-4 hidden rounded-2xl border border-outline-variant/40 bg-surface-container px-4 py-3 shadow-xl sm:block">
            <p className="font-display text-2xl font-bold text-secondary">+128</p>
            <p className="text-xs text-on-surface-variant">goles esta jornada</p>
          </div>
        </motion.div>
      </section>

      {/* Trust strip */}
      <section className="border-y border-outline-variant/30 bg-surface-container-lowest/50">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-center gap-x-10 gap-y-3 px-4 py-5 text-sm text-on-surface-variant">
          <span className="flex items-center gap-2"><Icon name="sports_soccer" className="text-secondary" /> Fútbol · Micro · Básquet</span>
          <span className="flex items-center gap-2"><Icon name="bolt" className="text-secondary" /> Tiempo real</span>
          <span className="flex items-center gap-2"><Icon name="install_mobile" className="text-secondary" /> PWA</span>
          <span className="flex items-center gap-2"><Icon name="lock" className="text-secondary" /> Roles y seguridad</span>
          <span className="flex items-center gap-2"><Icon name="picture_as_pdf" className="text-secondary" /> Export PDF</span>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="mx-auto max-w-6xl px-4 py-20">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="font-display text-3xl font-bold md:text-4xl">Todo lo que un torneo necesita</h2>
          <p className="mt-3 text-on-surface-variant">Desde la inscripción hasta el campeón, en una sola herramienta.</p>
        </div>
        <div className="mt-12 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((f, i) => (
            <motion.div
              key={f.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-60px' }}
              transition={{ duration: 0.4, delay: 0.05 * i }}
              className="group rounded-2xl border border-outline-variant/40 bg-surface-container p-6 transition hover:border-secondary/50"
            >
              <span className="grid h-12 w-12 place-items-center rounded-xl bg-secondary/15 text-secondary transition group-hover:scale-110">
                <Icon name={f.icon} className="text-2xl" />
              </span>
              <h3 className="mt-4 font-display text-lg font-semibold">{f.title}</h3>
              <p className="mt-1.5 text-sm text-on-surface-variant">{f.desc}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Cómo funciona */}
      <section id="como" className="border-y border-outline-variant/30 bg-surface-container-lowest/40">
        <div className="mx-auto max-w-6xl px-4 py-20">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="font-display text-3xl font-bold md:text-4xl">En 4 pasos</h2>
            <p className="mt-3 text-on-surface-variant">Del primer equipo al campeón, sin hojas de cálculo.</p>
          </div>
          <div className="mt-12 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {STEPS.map((s, i) => (
              <motion.div
                key={s.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: 0.08 * i }}
                className="relative rounded-2xl border border-outline-variant/40 bg-surface-container p-6"
              >
                <span className="absolute right-4 top-4 font-display text-4xl font-extrabold text-on-surface-variant/15">
                  {i + 1}
                </span>
                <span className="grid h-11 w-11 place-items-center rounded-xl bg-secondary/15 text-secondary">
                  <Icon name={s.icon} />
                </span>
                <h3 className="mt-4 font-display font-semibold">{s.title}</h3>
                <p className="mt-1 text-sm text-on-surface-variant">{s.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Showcase */}
      <section className="mx-auto max-w-6xl px-4 py-20">
        <div className="grid items-center gap-10 lg:grid-cols-2">
          <motion.div initial={{ opacity: 0, x: -24 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} transition={{ duration: 0.5 }}>
            <span className="text-sm font-semibold uppercase tracking-wide text-secondary">Bracket estilo Champions</span>
            <h2 className="mt-2 font-display text-3xl font-bold md:text-4xl">Eliminatorias que se ven de campeonato</h2>
            <p className="mt-4 text-on-surface-variant">
              Cuadros con conectores, ganadores que avanzan solos, partido por el 3er puesto y el trofeo
              del campeón. Más un <span className="text-on-surface">dashboard profesional</span> con
              KPIs, goleadores y gráficas en vivo.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Button variant="outline" onClick={onScreens}><Icon name="palette" /> Ver galería de diseños</Button>
              <Button variant="ghost" onClick={onPublic}><Icon name="scoreboard" /> Marcador en vivo</Button>
            </div>
          </motion.div>
          <motion.div initial={{ opacity: 0, x: 24 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} transition={{ duration: 0.5 }}>
            <Card className="p-5">
              <div className="flex items-center justify-around gap-2">
                <div className="space-y-3">
                  {['Pumas', 'Toros'].map((n) => (
                    <div key={n} className="rounded-lg border border-outline-variant/40 bg-surface-container-high p-2.5 text-xs">
                      <div className="flex justify-between font-semibold text-secondary"><span>{n}</span><span>2</span></div>
                      <div className="mt-1 flex justify-between text-on-surface-variant"><span>Rival</span><span>1</span></div>
                    </div>
                  ))}
                </div>
                <Icon name="trending_flat" className="text-on-surface-variant" />
                <div className="rounded-lg border border-outline-variant/40 bg-surface-container-high p-2.5 text-xs">
                  <div className="flex justify-between font-semibold text-secondary"><span>Pumas</span><span>4</span></div>
                  <div className="mt-1 flex justify-between text-on-surface-variant"><span>Toros</span><span>0</span></div>
                </div>
                <Icon name="trending_flat" className="text-on-surface-variant" />
                <div className="flex flex-col items-center">
                  <Icon name="emoji_events" className="text-4xl text-amber-300" />
                  <span className="mt-1 text-xs font-bold text-secondary">Campeón</span>
                </div>
              </div>
            </Card>
          </motion.div>
        </div>
      </section>

      {/* Torneos en juego */}
      {tournaments.length > 0 && (
        <section id="torneos" className="border-t border-outline-variant/30 bg-surface-container-lowest/40">
          <div className="mx-auto max-w-6xl px-4 py-20">
            <div className="flex items-end justify-between">
              <div>
                <h2 className="font-display text-3xl font-bold">Torneos en juego</h2>
                <p className="mt-2 text-on-surface-variant">
                  {active.length > 0 ? `${active.length} en vivo ahora mismo.` : 'Explora los campeonatos.'}
                </p>
              </div>
              <button onClick={onPublic} className="hidden text-sm text-secondary hover:underline sm:block">Ver todos →</button>
            </div>
            <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {[...tournaments]
                .sort((a, b) => (a.status === 'active' ? -1 : 1))
                .slice(0, 6)
                .map((t) => (
                  <button key={t.id} onClick={() => onOpenTournament(t.id)} className="text-left">
                    <Card className="h-full p-5 transition hover:border-secondary/60">
                      <div className="flex items-center gap-3">
                        <span className="grid h-11 w-11 place-items-center overflow-hidden rounded-lg bg-secondary-container/40 text-secondary">
                          {t.logo_url ? <img src={t.logo_url} alt="" className="h-full w-full object-cover" /> : <Icon name="emoji_events" />}
                        </span>
                        <div className="min-w-0">
                          <h3 className="truncate font-display font-semibold">{t.name}</h3>
                          <p className="text-xs uppercase tracking-wide text-on-surface-variant">{t.sport_type}</p>
                        </div>
                        <span className={`ml-auto rounded-full px-2 py-0.5 text-xs font-semibold ${t.status === 'active' ? 'bg-secondary-container/40 text-secondary' : 'bg-surface-container-highest text-on-surface-variant'}`}>
                          {t.status === 'active' ? 'En juego' : t.status}
                        </span>
                      </div>
                      <div className="mt-3 flex items-center gap-1 text-xs text-on-surface-variant">
                        <Icon name="visibility" className="text-sm" /> Grupos · posiciones · bracket · calendario
                      </div>
                    </Card>
                  </button>
                ))}
            </div>
          </div>
        </section>
      )}

      {/* CTA final */}
      <section className="mx-auto max-w-6xl px-4 py-24">
        <div className="relative overflow-hidden rounded-3xl border border-secondary/30 bg-gradient-to-br from-secondary/15 via-surface-container to-surface-container p-10 text-center">
          <div className="pointer-events-none absolute -top-20 left-1/2 h-60 w-60 -translate-x-1/2 rounded-full bg-secondary/20 blur-[100px]" />
          <h2 className="relative font-display text-3xl font-extrabold md:text-4xl">¿Listo para tu próximo campeonato?</h2>
          <p className="relative mx-auto mt-3 max-w-xl text-on-surface-variant">
            Crea tu torneo, invita a tus árbitros y comparte el marcador. Gratis para empezar.
          </p>
          <div className="relative mt-7 flex flex-wrap justify-center gap-3">
            <Button onClick={onEnter} className="px-7 py-3 text-base">
              <Icon name="rocket_launch" /> {authed ? 'Ir al panel' : 'Empezar gratis'}
            </Button>
            {!authed && (
              <Button variant="ghost" onClick={onLogin} className="px-7 py-3 text-base">Iniciar sesión</Button>
            )}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-outline-variant/30">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-4 py-8 text-sm text-on-surface-variant sm:flex-row">
          <span className="flex items-center gap-2">
            <span className="grid h-7 w-7 place-items-center rounded-lg bg-secondary text-on-secondary"><Icon name="emoji_events" className="text-base" /></span>
            <span className="font-display font-bold text-on-surface">Champion Hive</span>
          </span>
          <div className="flex items-center gap-5">
            <a href="#features" className="hover:text-on-surface">Características</a>
            <a href="#como" className="hover:text-on-surface">Cómo funciona</a>
            <button onClick={onPublic} className="hover:text-on-surface">Marcador público</button>
          </div>
          <span>© Champion Hive</span>
        </div>
      </footer>
    </div>
  )
}
