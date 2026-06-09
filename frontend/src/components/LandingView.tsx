import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { api } from '../services/api'
import { Brand, Button, Card, Eyebrow, Icon, LiveChip } from './ui'

const FEATURES = [
  { icon: 'bolt', title: 'En tiempo real', desc: 'El árbitro carga goles, tarjetas y cambios desde el celular; el público lo ve al instante.' },
  { icon: 'account_tree', title: 'Grupos y eliminatorias', desc: 'Fase de grupos, liga, suizo y bracket de eliminación con 3er puesto y auto-avance.' },
  { icon: 'sports_soccer', title: 'Multideporte', desc: 'Fútbol, microfútbol y baloncesto, cada uno con su lógica de puntuación.' },
  { icon: 'leaderboard', title: 'Posiciones y desempates', desc: 'Tabla configurable: puntos, diferencia, fair-play y enfrentamiento directo.' },
  { icon: 'insights', title: 'Estadísticas y gráficas', desc: 'Goleadores, curva de puntos, goles por fecha y un dashboard profesional.' },
  { icon: 'install_mobile', title: 'PWA instalable', desc: 'Funciona desde el celular del árbitro y del público, también offline.' },
]

const STEPS = [
  { icon: 'add_circle', title: 'Crea el torneo', desc: 'Define deporte, puntos y criterios de desempate.' },
  { icon: 'shuffle', title: 'Sortea y arma el fixture', desc: 'Equipos, jugadores, grupos al azar y calendario automático.' },
  { icon: 'sports', title: 'Carga resultados en vivo', desc: 'El árbitro registra desde el celular, minuto a minuto.' },
  { icon: 'public', title: 'Comparte el marcador', desc: 'Posiciones, bracket y estadísticas públicas, sin login.' },
]

const SPORT: Record<string, { label: string; icon: string; grad: string; ring: string }> = {
  football: { label: 'Fútbol', icon: 'sports_soccer', grad: 'from-secondary/35 via-secondary/10 to-transparent', ring: 'text-secondary' },
  micro: { label: 'Microfútbol', icon: 'sports_soccer', grad: 'from-tertiary/35 via-tertiary/10 to-transparent', ring: 'text-tertiary' },
  basketball: { label: 'Baloncesto', icon: 'sports_basketball', grad: 'from-primary/35 via-primary/10 to-transparent', ring: 'text-primary' },
}

export default function LandingView({
  authed,
  onLogin,
  onPublic,
  onEnter,
  onOpenTournament,
}: {
  authed: boolean
  onLogin: () => void
  onPublic: () => void
  onEnter: () => void
  onOpenTournament: (id: string) => void
}) {
  const [tournaments, setTournaments] = useState<any[]>([])
  useEffect(() => {
    api.getTournaments().then(setTournaments).catch(() => setTournaments([]))
  }, [])
  const active = tournaments.filter((t) => t.status === 'active')
  const showcased = [...tournaments].sort((a, b) => (a.status === 'active' ? -1 : 1)).slice(0, 6)

  return (
    <div className="relative min-h-screen overflow-x-hidden bg-surface text-on-surface">
      {/* Glows de fondo (foco de estadio) */}
      <div className="pointer-events-none absolute -top-48 right-0 h-[28rem] w-[28rem] rounded-full bg-secondary/20 blur-[140px]" />
      <div className="pointer-events-none absolute top-72 -left-44 h-96 w-96 rounded-full bg-primary/10 blur-[130px]" />
      <div className="pointer-events-none absolute top-[120%] left-1/3 h-96 w-96 rounded-full bg-tertiary/10 blur-[130px]" />

      {/* Nav */}
      <header className="sticky top-0 z-30 border-b border-outline-variant/30 bg-surface/70 backdrop-blur-lg">
        <nav className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
          <span className="flex items-center gap-2">
            <span className="grid h-8 w-8 place-items-center rounded-lg bg-secondary text-on-secondary">
              <Icon name="emoji_events" className="text-lg" />
            </span>
            <Brand className="text-lg" />
          </span>
          <div className="hidden items-center gap-7 text-sm text-on-surface-variant md:flex">
            <a href="#torneos" className="transition hover:text-on-surface">Torneos</a>
            <a href="#features" className="transition hover:text-on-surface">Características</a>
            <a href="#como" className="transition hover:text-on-surface">Cómo funciona</a>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={onPublic} className="hidden text-sm text-on-surface-variant transition hover:text-on-surface sm:block">
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
          <span className="inline-flex items-center gap-1.5 rounded-full border border-secondary/30 bg-secondary/10 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-secondary">
            <Icon name="bolt" className="text-sm" /> Gestión de torneos en tiempo real
          </span>
          <h1 className="mt-5 font-display text-4xl font-extrabold uppercase leading-[1.05] tracking-tight sm:text-5xl md:text-6xl">
            Domina la cancha.{' '}
            <span className="text-secondary">Gestiona con precisión.</span>
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
              <Icon name="scoreboard" /> Ver marcador en vivo
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
          <div className="pointer-events-none absolute -inset-6 rounded-[2.5rem] bg-secondary/10 blur-3xl" />
          <div className="card-accent relative overflow-hidden rounded-3xl border border-outline-variant/40 bg-gradient-to-br from-surface-container-high to-surface-container p-5 shadow-2xl shadow-black/40">
            <div className="mb-4 flex items-center justify-between">
              <span className="flex items-center gap-2 text-sm font-semibold">
                <Icon name="emoji_events" className="text-secondary" /> Final · Champions
              </span>
              <LiveChip />
            </div>
            <div className="space-y-2">
              {[
                { a: 'Pumas', b: 'Águilas', s1: 4, s2: 0 },
                { a: 'Toros', b: 'Tiburones', s1: 4, s2: 1 },
              ].map((m, i) => (
                <div key={i} className="rounded-xl bg-surface-container-low p-3">
                  <div className="flex items-center justify-between text-sm font-bold text-secondary">
                    <span className="flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-full bg-secondary" /> {m.a}</span>
                    <span className="tabular-nums">{m.s1}</span>
                  </div>
                  <div className="mt-1 flex items-center justify-between text-sm text-on-surface-variant">
                    <span className="flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-full bg-tertiary" /> {m.b}</span>
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
            <p className="mt-2 text-center text-xs uppercase tracking-wide text-on-surface-variant">Goles por fecha</p>
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

      {/* Torneos en juego (estilo Stitch: tarjetas con cabecera en degradado) */}
      {tournaments.length > 0 && (
        <section id="torneos" className="mx-auto max-w-6xl px-4 py-20">
          <div className="flex items-end justify-between">
            <div>
              <Eyebrow>En vivo</Eyebrow>
              <h2 className="mt-2 font-display text-3xl font-bold md:text-4xl">Torneos en juego</h2>
              <p className="mt-2 text-on-surface-variant">
                {active.length > 0 ? `${active.length} en vivo ahora mismo.` : 'Explora los campeonatos.'}
              </p>
            </div>
            <button onClick={onPublic} className="hidden text-sm font-semibold text-secondary transition hover:underline sm:block">
              Ver todos →
            </button>
          </div>
          <div className="mt-8 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {showcased.map((t, i) => {
              const sp = SPORT[t.sport_type] || SPORT.football
              return (
                <motion.button
                  key={t.id}
                  onClick={() => onOpenTournament(t.id)}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: '-60px' }}
                  transition={{ duration: 0.4, delay: 0.05 * i }}
                  className="group text-left"
                >
                  <Card className="h-full overflow-hidden transition duration-200 group-hover:-translate-y-1 group-hover:border-secondary/60">
                    <div className={`relative h-24 bg-gradient-to-br ${sp.grad}`}>
                      <Icon name={sp.icon} className={`absolute right-3 top-2 text-6xl opacity-20 ${sp.ring}`} />
                      {t.status === 'active' && (
                        <div className="absolute left-3 top-3">
                          <LiveChip />
                        </div>
                      )}
                      <span className="absolute -bottom-6 left-4 grid h-12 w-12 place-items-center overflow-hidden rounded-xl border-2 border-surface bg-surface-container-high text-secondary shadow-lg">
                        {t.logo_url ? (
                          <img src={t.logo_url} alt="" className="h-full w-full object-cover" />
                        ) : (
                          <Icon name="emoji_events" />
                        )}
                      </span>
                    </div>
                    <div className="px-4 pb-4 pt-8">
                      <h3 className="truncate font-display font-semibold">{t.name}</h3>
                      <p className="text-xs uppercase tracking-wide text-on-surface-variant">{sp.label}</p>
                      <div className="mt-3 flex items-center gap-1.5 text-xs text-on-surface-variant">
                        <Icon name="visibility" className="text-sm" /> Posiciones · bracket · calendario
                      </div>
                    </div>
                  </Card>
                </motion.button>
              )
            })}
          </div>
        </section>
      )}

      {/* Features: "Diseñado para ganar" con tarjeta verde destacada */}
      <section id="features" className="border-y border-outline-variant/30 bg-surface-container-lowest/40">
        <div className="mx-auto max-w-6xl px-4 py-20">
          <div className="mx-auto max-w-2xl text-center">
            <Eyebrow>Diseñado para ganar</Eyebrow>
            <h2 className="mt-2 font-display text-3xl font-bold md:text-4xl">
              Todo lo que un torneo necesita
            </h2>
            <p className="mt-3 text-on-surface-variant">Desde la inscripción hasta el campeón, en una sola herramienta.</p>
          </div>
          <div className="mt-12 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map((f, i) => {
              const hot = i === 0
              return (
                <motion.div
                  key={f.title}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: '-60px' }}
                  transition={{ duration: 0.4, delay: 0.05 * i }}
                  className={`group rounded-2xl border p-6 transition ${
                    hot
                      ? 'border-transparent bg-secondary text-on-secondary shadow-xl shadow-secondary/20'
                      : 'border-outline-variant/40 bg-surface-container hover:border-secondary/50'
                  }`}
                >
                  <span
                    className={`grid h-12 w-12 place-items-center rounded-xl transition group-hover:scale-110 ${
                      hot ? 'bg-on-secondary/15 text-on-secondary' : 'bg-secondary/15 text-secondary'
                    }`}
                  >
                    <Icon name={f.icon} className="text-2xl" />
                  </span>
                  <h3 className="mt-4 font-display text-lg font-semibold">{f.title}</h3>
                  <p className={`mt-1.5 text-sm ${hot ? 'text-on-secondary/80' : 'text-on-surface-variant'}`}>{f.desc}</p>
                </motion.div>
              )
            })}
          </div>
        </div>
      </section>

      {/* Cómo funciona */}
      <section id="como" className="mx-auto max-w-6xl px-4 py-20">
        <div className="mx-auto max-w-2xl text-center">
          <Eyebrow>Cómo funciona</Eyebrow>
          <h2 className="mt-2 font-display text-3xl font-bold md:text-4xl">En 4 pasos</h2>
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
      </section>

      {/* Showcase bracket */}
      <section className="border-y border-outline-variant/30 bg-surface-container-lowest/40">
        <div className="mx-auto grid max-w-6xl items-center gap-10 px-4 py-20 lg:grid-cols-2">
          <motion.div initial={{ opacity: 0, x: -24 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} transition={{ duration: 0.5 }}>
            <Eyebrow>Bracket estilo Champions</Eyebrow>
            <h2 className="mt-2 font-display text-3xl font-bold md:text-4xl">Eliminatorias que se ven de campeonato</h2>
            <p className="mt-4 text-on-surface-variant">
              Cuadros con conectores, ganadores que avanzan solos, partido por el 3er puesto y el trofeo
              del campeón. Más un <span className="text-on-surface">dashboard profesional</span> con
              KPIs, goleadores y gráficas en vivo.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Button variant="ghost" onClick={onPublic}><Icon name="scoreboard" /> Marcador en vivo</Button>
            </div>
          </motion.div>
          <motion.div initial={{ opacity: 0, x: 24 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} transition={{ duration: 0.5 }}>
            <Card accent="green" className="p-5">
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

      {/* CTA final */}
      <section className="mx-auto max-w-6xl px-4 py-24">
        <div className="relative overflow-hidden rounded-3xl border border-secondary/30 bg-gradient-to-br from-secondary/15 via-surface-container to-surface-container p-10 text-center sm:p-14">
          <div className="pointer-events-none absolute -top-20 left-1/2 h-60 w-60 -translate-x-1/2 rounded-full bg-secondary/20 blur-[100px]" />
          <Eyebrow className="relative">Entra a la colmena</Eyebrow>
          <h2 className="relative mt-2 font-display text-3xl font-extrabold md:text-4xl">¿Listo para tu próximo campeonato?</h2>
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

      {/* Footer multi-columna */}
      <footer className="border-t border-outline-variant/30 bg-surface-container-lowest/40">
        <div className="mx-auto max-w-6xl px-4 py-12">
          <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
            <div className="sm:col-span-2 lg:col-span-1">
              <span className="flex items-center gap-2">
                <span className="grid h-8 w-8 place-items-center rounded-lg bg-secondary text-on-secondary"><Icon name="emoji_events" className="text-base" /></span>
                <Brand className="text-lg" />
              </span>
              <p className="mt-3 max-w-xs text-sm text-on-surface-variant">
                Gestión de torneos deportivos en tiempo real, del primer equipo al campeón.
              </p>
            </div>
            <div>
              <p className="font-display text-sm font-semibold">Producto</p>
              <ul className="mt-3 space-y-2 text-sm text-on-surface-variant">
                <li><a href="#features" className="transition hover:text-on-surface">Características</a></li>
                <li><a href="#como" className="transition hover:text-on-surface">Cómo funciona</a></li>
                <li><button onClick={onPublic} className="transition hover:text-on-surface">Marcador público</button></li>
              </ul>
            </div>
            <div>
              <p className="font-display text-sm font-semibold">Plataforma</p>
              <ul className="mt-3 space-y-2 text-sm text-on-surface-variant">
                <li><a href="#torneos" className="transition hover:text-on-surface">Torneos en juego</a></li>
                <li className="flex items-center gap-1.5"><Icon name="install_mobile" className="text-sm text-secondary" /> PWA instalable</li>
                <li className="flex items-center gap-1.5"><Icon name="sports_soccer" className="text-sm text-secondary" /> Multideporte</li>
              </ul>
            </div>
            <div>
              <p className="font-display text-sm font-semibold">Empezar</p>
              <ul className="mt-3 space-y-2 text-sm text-on-surface-variant">
                <li><button onClick={onEnter} className="transition hover:text-on-surface">{authed ? 'Ir al panel' : 'Entrar'}</button></li>
                {!authed && <li><button onClick={onLogin} className="transition hover:text-on-surface">Iniciar sesión</button></li>}
              </ul>
            </div>
          </div>
          <div className="mt-10 flex flex-col items-center justify-between gap-3 border-t border-outline-variant/30 pt-6 text-sm text-on-surface-variant sm:flex-row">
            <span>© Champion Hive</span>
            <span className="flex items-center gap-1.5"><Icon name="bolt" className="text-sm text-secondary" /> Hecho para el día de partido</span>
          </div>
        </div>
      </footer>
    </div>
  )
}
