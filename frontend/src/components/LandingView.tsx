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

const MARQUEE = [
  { icon: 'sports_soccer', label: 'Fútbol' },
  { icon: 'sports_basketball', label: 'Baloncesto' },
  { icon: 'bolt', label: 'Tiempo real' },
  { icon: 'account_tree', label: 'Brackets' },
  { icon: 'leaderboard', label: 'Posiciones' },
  { icon: 'install_mobile', label: 'PWA · Offline' },
  { icon: 'cloud_off', label: 'Árbitro sin red' },
  { icon: 'lock', label: 'Roles y seguridad' },
  { icon: 'picture_as_pdf', label: 'Acta y export PDF' },
  { icon: 'style', label: 'Juego limpio' },
]

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
      {/* Rejilla técnica + glows animados (foco de estadio) */}
      <div className="pointer-events-none absolute inset-x-0 top-0 h-[120vh] bg-grid-faint" />
      <motion.div
        className="pointer-events-none absolute -top-48 right-0 h-[30rem] w-[30rem] rounded-full bg-secondary/20 blur-[150px]"
        animate={{ scale: [1, 1.15, 1], opacity: [0.6, 0.95, 0.6] }}
        transition={{ duration: 9, repeat: Infinity, ease: 'easeInOut' }}
      />
      <motion.div
        className="pointer-events-none absolute top-72 -left-44 h-96 w-96 rounded-full bg-primary/10 blur-[140px]"
        animate={{ scale: [1, 1.2, 1] }}
        transition={{ duration: 11, repeat: Infinity, ease: 'easeInOut', delay: 1 }}
      />
      <motion.div
        className="pointer-events-none absolute top-[120%] left-1/3 h-96 w-96 rounded-full bg-tertiary/10 blur-[140px]"
        animate={{ scale: [1, 1.18, 1], opacity: [0.5, 0.85, 0.5] }}
        transition={{ duration: 13, repeat: Infinity, ease: 'easeInOut', delay: 2 }}
      />

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

        {/* Emblema de la colmena (estilo arena Stitch) */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.6, delay: 0.15 }}
          className="relative mx-auto w-full max-w-md"
        >
          <div className="pointer-events-none absolute inset-0 -z-10 rounded-full bg-secondary/15 blur-[90px]" />
          <div className="relative aspect-square">
            {/* Anillos de arena */}
            <div className="absolute inset-0 rounded-full border border-secondary/20" />
            <div className="absolute inset-[7%] rounded-full border border-outline-variant/30" />
            <div className="absolute inset-[16%] rounded-full border border-secondary/10" />
            {/* Barrido tipo radar */}
            <motion.div
              aria-hidden
              className="absolute inset-[7%] rounded-full"
              style={{
                background:
                  'conic-gradient(from 0deg, transparent 0deg, rgba(74,225,118,0.18) 40deg, transparent 110deg)',
              }}
              animate={{ rotate: 360 }}
              transition={{ duration: 16, repeat: Infinity, ease: 'linear' }}
            />
            {/* Emblema */}
            <div className="absolute inset-[19%] grid place-items-center">
              <img
                src="/icon-512.png"
                alt="Champion Hive"
                className="h-full w-full object-contain drop-shadow-[0_0_45px_rgba(74,225,118,0.35)]"
              />
            </div>

            {/* Chips flotantes */}
            <motion.div
              className="absolute left-0 top-8"
              animate={{ y: [0, -10, 0] }}
              transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
            >
              <LiveChip />
            </motion.div>

            <motion.div
              className="absolute -right-2 top-1/3 rounded-2xl border border-outline-variant/40 bg-surface-container/95 p-3 shadow-xl backdrop-blur"
              animate={{ y: [0, 10, 0] }}
              transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut', delay: 0.5 }}
            >
              <p className="mb-1 text-[10px] uppercase tracking-wide text-on-surface-variant">Final</p>
              <div className="flex items-center justify-between gap-5 text-sm font-bold text-secondary">
                <span>Pumas</span>
                <span className="tabular-nums">4</span>
              </div>
              <div className="flex items-center justify-between gap-5 text-sm text-on-surface-variant">
                <span>Águilas</span>
                <span className="tabular-nums">0</span>
              </div>
            </motion.div>

            <motion.div
              className="absolute -bottom-1 left-6 flex items-center gap-2 rounded-full border border-secondary/30 bg-surface-container/95 px-3 py-1.5 shadow-xl backdrop-blur"
              animate={{ y: [0, -8, 0] }}
              transition={{ duration: 4.5, repeat: Infinity, ease: 'easeInOut', delay: 1 }}
            >
              <Icon name="emoji_events" className="text-base text-amber-300" />
              <span className="text-xs font-bold text-secondary">Campeón</span>
            </motion.div>
          </div>
        </motion.div>
      </section>

      {/* Marquee de capacidades */}
      <section className="relative border-y border-outline-variant/30 bg-surface-container-lowest/50 py-4">
        <div className="flex overflow-hidden [mask-image:linear-gradient(to_right,transparent,#000_7%,#000_93%,transparent)]">
          <div className="animate-marquee flex shrink-0 items-center gap-10 pr-10 text-sm text-on-surface-variant">
            {[...MARQUEE, ...MARQUEE].map((m, i) => (
              <span key={i} className="flex shrink-0 items-center gap-2 whitespace-nowrap">
                <Icon name={m.icon} className="text-secondary" /> {m.label}
                <span className="ml-8 h-1 w-1 rounded-full bg-outline-variant" />
              </span>
            ))}
          </div>
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
                    <div className={`relative h-24 overflow-hidden bg-gradient-to-br ${sp.grad}`}>
                      {t.banner_url ? (
                        <>
                          <img src={t.banner_url} alt="" className="absolute inset-0 h-full w-full object-cover" />
                          <div className="absolute inset-0 bg-gradient-to-t from-surface-container via-surface-container/40 to-transparent" />
                        </>
                      ) : (
                        <Icon name={sp.icon} className={`absolute right-3 top-2 text-6xl opacity-20 ${sp.ring}`} />
                      )}
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
          <div className="mt-12 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:auto-rows-fr lg:grid-cols-3">
            {FEATURES.map((f, i) => {
              const hot = i === 0
              return (
                <motion.div
                  key={f.title}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: '-60px' }}
                  transition={{ duration: 0.4, delay: 0.05 * i }}
                  className={`group relative flex flex-col overflow-hidden rounded-2xl border p-6 transition ${
                    hot
                      ? 'border-transparent bg-gradient-to-br from-secondary to-secondary-container text-on-secondary shadow-xl shadow-secondary/20 sm:col-span-2 lg:col-span-2 lg:row-span-2'
                      : 'border-outline-variant/40 bg-surface-container hover:-translate-y-0.5 hover:border-secondary/50 hover:shadow-lg hover:shadow-black/20'
                  }`}
                >
                  {hot && (
                    <Icon
                      name={f.icon}
                      className="pointer-events-none absolute -right-5 -top-5 text-[8rem] text-on-secondary/10"
                    />
                  )}
                  <span
                    className={`grid place-items-center rounded-xl transition group-hover:scale-110 ${
                      hot ? 'h-14 w-14 bg-on-secondary/15 text-on-secondary' : 'h-12 w-12 bg-secondary/15 text-secondary'
                    }`}
                  >
                    <Icon name={f.icon} className={hot ? 'text-3xl' : 'text-2xl'} />
                  </span>
                  <h3 className={`mt-4 font-display font-semibold ${hot ? 'text-2xl' : 'text-lg'}`}>{f.title}</h3>
                  <p className={`mt-1.5 ${hot ? 'max-w-md text-on-secondary/85' : 'text-sm text-on-surface-variant'}`}>
                    {f.desc}
                  </p>
                  {hot && (
                    <div className="mt-auto flex flex-wrap gap-2 pt-6">
                      {['Goles', 'Tarjetas', 'Cambios', 'Marcador', 'Acta'].map((tag) => (
                        <span key={tag} className="rounded-full bg-on-secondary/15 px-2.5 py-1 text-xs font-semibold">
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}
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
