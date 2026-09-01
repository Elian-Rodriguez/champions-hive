import { useEffect, useRef, useState } from 'react'
import { api } from '../services/api'
import { Badge, Button, Card, EmptyState, Icon, Input, Select, Spinner } from './ui'
import { AsaArrastre, ListaOrdenable, useArrastreEntreZonas } from './dnd'
import StandingsTable from './StandingsTable'
import TournamentBracket from './TournamentBracket'
import VenuesPanel from './VenuesPanel'
import UsersPanel from './UsersPanel'
import DashboardView from './DashboardView'
import { exportMatchReportPDF, exportStandingsPDF } from '../utils/pdf'
import { escudoDesdeArchivo } from '../utils/imagen'
import { ESTADO_LABEL, woDetalle, woLabel } from '../utils/partido'
import { SPORT_LIST } from '../sports'
import { useAppSelector } from '../hooks'

const SPORTS = SPORT_LIST
const STAGE_TYPES = [
  { value: 'group', label: 'Grupos' },
  { value: 'league', label: 'Liga' },
  { value: 'knockout', label: 'Eliminación' },
  { value: 'swiss', label: 'Suizo' },
]
type Tab =
  | 'resumen'
  | 'config'
  | 'equipos'
  | 'fases'
  | 'calendario'
  | 'posiciones'
  | 'avance'
  | 'marca'
  | 'historial'
type Section = 'dashboard' | 'torneos' | 'sedes' | 'usuarios'

// Las cuatro secciones las ve cualquier administrador: el superadmin gestiona
// la plataforma entera y el organizador ve solo lo suyo (sus torneos, sus sedes
// y las cuentas que él creó), porque eso es lo que le devuelve el backend. Lo
// único reservado al superadmin es el botón de reset global.
const SECTIONS: { key: Section; label: string; icon: string }[] = [
  { key: 'dashboard', label: 'Dashboard', icon: 'dashboard' },
  { key: 'torneos', label: 'Torneos', icon: 'emoji_events' },
  { key: 'sedes', label: 'Sedes', icon: 'stadium' },
  { key: 'usuarios', label: 'Usuarios', icon: 'group' },
]

export default function AdminView() {
  const role = useAppSelector((s) => s.auth.role)
  const esSuperadmin = role === 'superadmin'
  const [section, setSection] = useState<Section>('dashboard')
  const [tournaments, setTournaments] = useState<any[]>([])
  const [selected, setSelected] = useState<any>(null)
  const [tab, setTab] = useState<Tab>('resumen')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [newName, setNewName] = useState('')
  const [newSport, setNewSport] = useState('football')
  const [helpOpen, setHelpOpen] = useState(false)
  // Perfil propio: trae el cupo de campeonatos del plan y cuántos van usados.
  const [perfil, setPerfil] = useState<any>(null)

  async function refresh() {
    setLoading(true)
    try {
      setTournaments(await api.getTournaments())
      setPerfil(await api.me().catch(() => null))
    } catch (e: any) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }
  useEffect(() => {
    refresh()
  }, [])

  const cupo: number | null = perfil?.max_tournaments ?? null
  const usados: number = perfil?.tournaments_count ?? tournaments.length
  const sinCupo = cupo != null && usados >= cupo

  async function createTournament(e: React.FormEvent) {
    e.preventDefault()
    if (!newName.trim()) return
    try {
      await api.createTournament({ name: newName, sport_type: newSport })
      setNewName('')
      refresh()
    } catch (e: any) {
      setError(e.message)
    }
  }

  async function resetAll() {
    if (
      !confirm(
        '¿Eliminar TODOS los torneos creados? Se borrarán equipos, jugadores, fases y partidos. Esta acción NO se puede deshacer.',
      )
    )
      return
    if (!confirm('Confirmación final: el listado de torneos quedará vacío. ¿Continuar?')) return
    try {
      const r = await api.resetAll()
      setSelected(null)
      setSection('dashboard')
      await refresh()
      alert(r?.message || 'Torneos eliminados')
    } catch (e: any) {
      setError(e.message)
    }
  }

  return (
    <div className="space-y-5">
      <nav className="flex flex-wrap items-center gap-2">
        {SECTIONS.map((s) => (
          <button
            key={s.key}
            onClick={() => setSection(s.key)}
            className={`flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm font-semibold transition ${
              section === s.key
                ? 'bg-secondary text-on-secondary'
                : 'bg-surface-container-high text-on-surface hover:bg-surface-bright'
            }`}
          >
            <Icon name={s.icon} className="text-base" /> {s.label}
          </button>
        ))}
        <button
          onClick={() => setHelpOpen(true)}
          className="ml-auto flex items-center gap-1.5 rounded-lg border border-secondary/40 bg-secondary/10 px-4 py-2 text-sm font-semibold text-secondary transition hover:bg-secondary/20"
        >
          <Icon name="help" className="text-base" /> Ayuda
        </button>
        {esSuperadmin && (
          <button
            onClick={resetAll}
            title="Eliminar todos los torneos"
            className="flex items-center gap-1.5 rounded-lg border border-error/40 bg-error-container/30 px-4 py-2 text-sm font-semibold text-error transition hover:bg-error-container/50"
          >
            <Icon name="delete_sweep" className="text-base" /> Reset
          </button>
        )}
      </nav>

      {section === 'dashboard' ? (
        <DashboardView />
      ) : section === 'sedes' ? (
        <VenuesPanel />
      ) : section === 'usuarios' ? (
        <UsersPanel />
      ) : (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[320px_1fr]">
          <div className="space-y-4">
            <Card className="p-4">
              <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                <h2 className="font-display font-semibold">Nuevo torneo</h2>
                {cupo != null && (
                  <Badge
                    className={
                      sinCupo
                        ? 'bg-error-container text-on-error-container'
                        : 'bg-secondary/15 text-secondary'
                    }
                  >
                    {usados} de {cupo} campeonatos
                  </Badge>
                )}
              </div>
              <form onSubmit={createTournament} className="space-y-2">
                <Input placeholder="Nombre del torneo" value={newName} onChange={(e) => setNewName(e.target.value)} disabled={sinCupo} />
                <Select value={newSport} onChange={(e) => setNewSport(e.target.value)} disabled={sinCupo}>
                  {SPORTS.map((s) => (
                    <option key={s.value} value={s.value}>
                      {s.label}
                    </option>
                  ))}
                </Select>
                <Button type="submit" className="w-full" disabled={sinCupo}>
                  <Icon name="add" /> Crear
                </Button>
                {sinCupo && (
                  <p className="rounded-lg border border-error/30 bg-error-container/20 px-3 py-2 text-xs text-error">
                    Alcanzaste el límite de tu plan. Pide una ampliación al administrador
                    de la plataforma para crear más campeonatos.
                  </p>
                )}
              </form>
            </Card>

            <Card className="p-2">
              {loading ? (
                <div className="grid place-items-center py-10">
                  <Spinner />
                </div>
              ) : tournaments.length === 0 ? (
                <EmptyState icon="trophy" title="Sin torneos" hint="Crea el primero arriba." />
              ) : (
                <ul className="divide-y divide-outline-variant/30">
                  {tournaments.map((t) => (
                    <li key={t.id}>
                      <button
                        onClick={() => {
                          setSelected(t)
                          setTab('resumen')
                        }}
                        className={`flex w-full items-center justify-between px-3 py-3 text-left transition hover:bg-surface-container-high ${
                          selected?.id === t.id ? 'bg-surface-container-high' : ''
                        }`}
                      >
                        <span>
                          <span className="block font-medium">{t.name}</span>
                          <span className="text-xs uppercase text-on-surface-variant">{t.sport_type}</span>
                        </span>
                        <Badge className="bg-primary-container text-on-primary-container">{t.status}</Badge>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          </div>

          <div>
            {error && (
              <div className="mb-4 flex items-center gap-2 rounded-lg bg-error-container/40 px-3 py-2 text-sm text-error">
                <Icon name="error" className="text-base" /> {error}
                <button onClick={() => setError(null)} className="ml-auto">
                  <Icon name="close" className="text-base" />
                </button>
              </div>
            )}
            {!selected ? (
              <EmptyState icon="touch_app" title="Selecciona un torneo" hint="Elige o crea un torneo para gestionarlo." />
            ) : (
              <Card className="p-5">
                <div className="mb-4 flex items-center justify-between">
                  <h2 className="font-display text-2xl font-bold">{selected.name}</h2>
                  <Badge className="bg-secondary-container/40 text-secondary">{selected.sport_type}</Badge>
                </div>
                <div className="mb-5 flex flex-wrap gap-2 border-b border-outline-variant/30 pb-3">
                  {(['resumen', 'config', 'equipos', 'fases', 'calendario', 'posiciones', 'avance', 'marca', 'historial'] as Tab[]).map((t) => (
                    <button
                      key={t}
                      onClick={() => setTab(t)}
                      className={`rounded-lg px-3 py-1.5 text-sm font-medium capitalize transition ${
                        tab === t ? 'bg-secondary text-on-secondary' : 'text-on-surface-variant hover:bg-surface-container-high'
                      }`}
                    >
                      {t}
                    </button>
                  ))}
                </div>

                {tab === 'resumen' && <ResumenTab tournament={selected} onChanged={refresh} />}
                {tab === 'config' && <ConfigTab tournament={selected} onChanged={refresh} />}
                {tab === 'equipos' && <EquiposTab tournament={selected} />}
                {tab === 'fases' && <FasesTab tournament={selected} />}
                {tab === 'calendario' && <CalendarioTab tournament={selected} />}
                {tab === 'posiciones' && <PosicionesTab tournament={selected} />}
                {tab === 'avance' && <AvanceTab tournament={selected} />}
                {tab === 'marca' && <MarcaTab tournament={selected} />}
                {tab === 'historial' && <HistorialTab tournament={selected} />}
              </Card>
            )}
          </div>
        </div>
      )}

      {helpOpen && <HelpModal onClose={() => setHelpOpen(false)} />}
    </div>
  )
}

const HELP_STEPS: { icon: string; title: string; body: string }[] = [
  {
    icon: 'add_circle',
    title: '1. Crea el torneo',
    body: 'En la pestaña Torneos escribe el nombre, elige el deporte (fútbol, microfútbol, banquitas o baloncesto) y pulsa Crear.',
  },
  {
    icon: 'tune',
    title: '2. Configura puntos y desempates',
    body: 'Abre el torneo → pestaña Config. Define puntos por victoria/empate/derrota, ordena los criterios de desempate y, si quieres, el máximo de partidos por día.',
  },
  {
    icon: 'stadium',
    title: '3. Registra sedes y canchas',
    body: 'En la sección Sedes crea las sedes y sus canchas. Son necesarias para generar el fixture y el calendario.',
  },
  {
    icon: 'groups',
    title: '4. Inscribe equipos y jugadores',
    body: 'Pestaña Equipos: añade cada equipo con su color de uniforme y despliégalo para cargar los jugadores con su dorsal.',
  },
  {
    icon: 'shuffle',
    title: '5. Arma los grupos',
    body: 'Usa «Sortear en N grupos» para repartirlos al azar, o asigna el grupo de cada equipo a mano.',
  },
  {
    icon: 'account_tree',
    title: '6. Crea las fases y el fixture',
    body: 'Pestaña Fases: crea fases de Grupos, Liga, Eliminación o Suizo y pulsa Fixture para generar los partidos de cada fase.',
  },
  {
    icon: 'calendar_month',
    title: '7. Programa el calendario',
    body: 'Pestaña Calendario: elige fecha de inicio y recurrencia (días de la semana o cada N días), define máx/día y asigna canchas a cada partido.',
  },
  {
    icon: 'sports',
    title: '8. Crea los árbitros',
    body: 'En Usuarios crea cuentas de árbitro. Ellos cargan los marcadores en vivo desde su panel, incluso desde el celular.',
  },
  {
    icon: 'scoreboard',
    title: '9. Carga los resultados',
    body: 'A medida que se juega, marcadores, tarjetas y faltas actualizan solos las posiciones, las estadísticas y la tabla de juego limpio.',
  },
  {
    icon: 'emoji_events',
    title: '10. Avanza a eliminatorias',
    body: 'Pestaña Avance: siembra el bracket desde las posiciones de los grupos (con 3er puesto si quieres). Los ganadores avanzan automáticamente.',
  },
]

function HelpModal({ onClose }: { onClose: () => void }) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="max-h-[85vh] w-full max-w-2xl overflow-y-auto rounded-2xl border border-outline-variant/40 bg-surface-container p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            <h2 className="flex items-center gap-2 font-display text-2xl font-bold">
              <Icon name="help" className="text-secondary" /> Cómo configurar un torneo
            </h2>
            <p className="mt-1 text-sm text-on-surface-variant">
              Sigue estos pasos en orden. Puedes reabrir esta guía cuando quieras.
            </p>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1 text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface"
          >
            <Icon name="close" />
          </button>
        </div>
        <ol className="space-y-3">
          {HELP_STEPS.map((s) => (
            <li key={s.title} className="flex gap-3 rounded-xl bg-surface-container-high p-3">
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-secondary/15 text-secondary">
                <Icon name={s.icon} />
              </span>
              <div>
                <p className="font-display font-semibold">{s.title}</p>
                <p className="text-sm text-on-surface-variant">{s.body}</p>
              </div>
            </li>
          ))}
        </ol>
        <div className="mt-5 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-secondary/30 bg-secondary/10 p-3 text-sm">
          <span className="flex items-center gap-2 text-on-surface-variant">
            <Icon name="lightbulb" className="text-secondary" />
            El marcador público no necesita inicio de sesión: comparte el enlace del torneo.
          </span>
          <Button onClick={onClose}>Entendido</Button>
        </div>
      </div>
    </div>
  )
}

/**
 * Aviso manual a los capitanes del torneo.
 *
 * Los cambios de horario y cancha ya avisan solos; esto cubre lo que no
 * dispara ningún cambio de partido: reunión de delegados, cambio de
 * reglamento, jornada suspendida por lluvia.
 */
function AvisoEquipos({ tournament }: { tournament: any }) {
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null)
  const [enviando, setEnviando] = useState(false)
  return (
    <Card className="p-4">
      <h3 className="mb-1 flex items-center gap-2 font-display font-semibold">
        <Icon name="campaign" className="text-secondary" /> Avisar a los equipos
      </h3>
      <p className="mb-3 text-xs text-on-surface-variant">
        Llega a la bandeja de los capitanes registrados de este torneo. Los cambios de
        horario y de cancha se avisan solos al reprogramar.
      </p>
      <form
        onSubmit={async (e) => {
          e.preventDefault()
          if (!title.trim()) return
          setEnviando(true)
          setMsg(null)
          try {
            const r = await api.broadcast(tournament.id, { title, body: body || null })
            setMsg({ ok: true, text: r.message })
            setTitle('')
            setBody('')
          } catch (e: any) {
            setMsg({ ok: false, text: e.message })
          } finally {
            setEnviando(false)
          }
        }}
        className="space-y-2"
      >
        <Input
          placeholder="Título del aviso"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />
        <Input
          placeholder="Detalle (opcional)"
          value={body}
          onChange={(e) => setBody(e.target.value)}
        />
        {msg && (
          <p className={`text-sm ${msg.ok ? 'text-secondary' : 'text-error'}`}>{msg.text}</p>
        )}
        <Button type="submit" disabled={enviando}>
          <Icon name="send" /> Enviar aviso
        </Button>
      </form>
    </Card>
  )
}

function ResumenTab({ tournament, onChanged }: { tournament: any; onChanged: () => void }) {
  const [stats, setStats] = useState<any>(null)
  useEffect(() => {
    api.tournamentStats(tournament.id).then(setStats).catch(() => setStats(null))
  }, [tournament.id])
  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { k: 'teams', label: 'Equipos', icon: 'groups' },
          { k: 'stages', label: 'Fases', icon: 'account_tree' },
          { k: 'matches', label: 'Partidos', icon: 'sports_soccer' },
          { k: 'finished_matches', label: 'Jugados', icon: 'check_circle' },
        ].map((s) => (
          <div key={s.k} className="rounded-xl bg-surface-container-high p-4">
            <Icon name={s.icon} className="text-secondary" />
            <p className="mt-1 font-display text-2xl font-bold">{stats ? stats[s.k] : '—'}</p>
            <p className="text-xs text-on-surface-variant">{s.label}</p>
          </div>
        ))}
      </div>
      <div>
        <p className="mb-2 text-sm text-on-surface-variant">Estado del torneo</p>
        <div className="flex flex-wrap gap-2">
          {['draft', 'active', 'finished'].map((s) => (
            <Button
              key={s}
              variant={tournament.status === s ? 'primary' : 'ghost'}
              onClick={async () => {
                await api.updateStatus(tournament.id, s)
                onChanged()
              }}
            >
              {s}
            </Button>
          ))}
        </div>
      </div>
      <AvisoEquipos tournament={tournament} />

      <Button
        variant="danger"
        onClick={async () => {
          if (confirm(`¿Eliminar el torneo "${tournament.name}"?`)) {
            await api.deleteTournament(tournament.id)
            onChanged()
          }
        }}
      >
        <Icon name="delete" /> Eliminar torneo
      </Button>
    </div>
  )
}

/**
 * Capitanes y delegados del equipo.
 *
 * Da de alta la cuenta con la que el responsable del equipo entra a ver su
 * calendario y sus estadísticas, y a la que le llegan los avisos cuando se
 * mueve un partido. Si no se escribe contraseña, el backend genera una
 * temporal y la devuelve una sola vez para entregarla.
 */
function CaptainsBlock({ teamId, teamName }: { teamId: string; teamName: string }) {
  const [managers, setManagers] = useState<any[]>([])
  const [email, setEmail] = useState('')
  const [nombre, setNombre] = useState('')
  const [temp, setTemp] = useState<{ email: string; password: string } | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function load() {
    try {
      setManagers(await api.teamManagers(teamId))
    } catch (e: any) {
      setError(e.message)
    }
  }
  useEffect(() => {
    load()
  }, [teamId])

  return (
    <div className="mt-2 rounded-lg bg-surface-container-low p-3">
      <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-on-surface-variant">
        <Icon name="shield_person" className="text-base text-secondary" /> Capitanes de{' '}
        {teamName}
      </p>
      <form
        onSubmit={async (e) => {
          e.preventDefault()
          if (!email.trim()) return
          setError(null)
          try {
            const r = await api.addTeamManager(teamId, { email, name: nombre || null })
            if (r?.temp_password) setTemp({ email: r.email, password: r.temp_password })
            setEmail('')
            setNombre('')
            load()
          } catch (e: any) {
            setError(e.message)
          }
        }}
        className="flex flex-wrap gap-2"
      >
        <Input
          type="email"
          placeholder="Email del capitán"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="min-w-[12rem] flex-1"
        />
        <Input
          placeholder="Nombre (opcional)"
          value={nombre}
          onChange={(e) => setNombre(e.target.value)}
          className="min-w-[9rem] flex-1"
        />
        <Button type="submit" variant="outline">
          <Icon name="person_add" />
        </Button>
      </form>
      {error && <p className="mt-2 text-xs text-error">{error}</p>}
      {temp && (
        <div className="mt-2 flex flex-wrap items-center gap-2 rounded-lg border border-tertiary/40 bg-tertiary/10 px-2 py-1.5 text-xs">
          <Icon name="key" className="text-tertiary" />
          <span>
            Entrega estos datos a {temp.email}:
            <code className="ml-1 rounded bg-surface-container-high px-1.5 py-0.5 font-mono">
              {temp.password}
            </code>
          </span>
          <button
            onClick={() => navigator.clipboard?.writeText(temp.password)}
            className="text-secondary hover:underline"
          >
            Copiar
          </button>
          <button onClick={() => setTemp(null)} className="ml-auto">
            <Icon name="close" className="text-sm" />
          </button>
        </div>
      )}
      <ul className="mt-2 space-y-1">
        {managers.map((m) => (
          <li key={m.id} className="flex items-center justify-between text-sm">
            <span className="min-w-0 truncate">
              {m.name ? `${m.name} · ` : ''}
              <span className="text-on-surface-variant">{m.email}</span>
              {!m.is_active && <span className="ml-2 text-xs text-error">inactivo</span>}
            </span>
            <button
              onClick={async () => {
                if (confirm(`¿Quitar a ${m.email} como capitán de ${teamName}?`)) {
                  await api.removeTeamManager(teamId, m.user_id)
                  load()
                }
              }}
              className="text-error/80 hover:text-error"
              title="Quitar capitán"
            >
              <Icon name="close" className="text-base" />
            </button>
          </li>
        ))}
        {managers.length === 0 && (
          <li className="text-xs text-on-surface-variant">
            Sin capitán. Sin él, nadie del equipo recibe los avisos de cambio de horario.
          </li>
        )}
      </ul>
    </div>
  )
}

function PlayersBlock({ teamId }: { teamId: string }) {
  const [players, setPlayers] = useState<any[]>([])
  const [name, setName] = useState('')
  const [number, setNumber] = useState('')
  async function load() {
    setPlayers(await api.getPlayers(teamId))
  }
  useEffect(() => {
    load()
  }, [teamId])
  return (
    <div className="mt-2 rounded-lg bg-surface-container-low p-3">
      <form
        onSubmit={async (e) => {
          e.preventDefault()
          if (!name.trim()) return
          await api.addPlayer(teamId, { name, number: number ? parseInt(number) : null })
          setName('')
          setNumber('')
          load()
        }}
        className="flex gap-2"
      >
        <Input placeholder="Jugador" value={name} onChange={(e) => setName(e.target.value)} />
        <Input placeholder="#" value={number} onChange={(e) => setNumber(e.target.value)} className="w-16" />
        <Button type="submit" variant="outline">
          <Icon name="add" />
        </Button>
      </form>
      <ul className="mt-2 space-y-1">
        {players.map((p) => (
          <li key={p.id} className="flex items-center justify-between text-sm">
            <span>
              {p.number != null && <span className="mr-2 text-on-surface-variant">#{p.number}</span>}
              {p.name}
            </span>
            <span className="flex items-center gap-2">
              <button
                onClick={async () => {
                  const n = prompt('Nombre del jugador', p.name) || p.name
                  const num = prompt('Dorsal', p.number != null ? String(p.number) : '')
                  await api.updatePlayer(teamId, p.id, {
                    name: n,
                    number: num ? parseInt(num) : null,
                  })
                  load()
                }}
                className="text-on-surface-variant hover:text-on-surface"
              >
                <Icon name="edit" className="text-base" />
              </button>
              <button
                onClick={async () => {
                  await api.removePlayer(teamId, p.id)
                  load()
                }}
                className="text-error/80 hover:text-error"
              >
                <Icon name="close" className="text-base" />
              </button>
            </span>
          </li>
        ))}
        {players.length === 0 && <li className="text-xs text-on-surface-variant">Sin jugadores.</li>}
      </ul>
    </div>
  )
}

function TeamColors({
  team,
  onChange,
}: {
  team: any
  onChange: (colors: string[]) => void
}) {
  const colors: string[] =
    team.colors && team.colors.length ? team.colors : team.color ? [team.color] : []
  const [pick, setPick] = useState('#39d353')
  return (
    <span className="flex items-center gap-1">
      {colors.map((col, i) => (
        <button
          key={i}
          type="button"
          onClick={() => colors.length > 1 && onChange(colors.filter((_, j) => j !== i))}
          title="Quitar uniforme"
          className="h-5 w-5 rounded-full border border-outline-variant"
          style={{ background: col }}
        />
      ))}
      <input
        type="color"
        value={pick}
        onChange={(e) => setPick(e.target.value)}
        className="h-5 w-5 cursor-pointer rounded border border-outline-variant bg-transparent"
      />
      <button
        type="button"
        onClick={() => onChange([...colors, pick])}
        className="grid h-5 w-5 place-items-center rounded bg-surface-bright text-on-surface"
        title="Agregar uniforme"
      >
        <Icon name="add" className="text-xs" />
      </button>
    </span>
  )
}

/** Escudo del equipo: vista previa, subir y quitar.
 *
 *  La imagen se reduce en el navegador y se guarda como data URI dentro de
 *  `logo_url` (ver `utils/imagen.ts`), así que subir un escudo no necesita
 *  servidor de archivos y el acta lo dibuja sin pelear con CORS. */
function TeamLogo({
  team,
  onChange,
}: {
  team: any
  onChange: (logo: string | null) => Promise<void>
}) {
  const [error, setError] = useState<string | null>(null)
  const [ocupado, setOcupado] = useState(false)
  const archivo = useRef<HTMLInputElement>(null)
  const inicial = (team.name || '?').trim().charAt(0).toUpperCase()

  async function elegir(f: File | undefined) {
    if (!f) return
    setError(null)
    setOcupado(true)
    try {
      await onChange(await escudoDesdeArchivo(f))
    } catch (e: any) {
      setError(e?.message || 'No se pudo subir el escudo')
    } finally {
      setOcupado(false)
      // Permite volver a elegir el mismo archivo si el primer intento falló.
      if (archivo.current) archivo.current.value = ''
    }
  }

  return (
    <span className="relative flex items-center gap-1">
      <input
        ref={archivo}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => elegir(e.target.files?.[0])}
      />
      <button
        type="button"
        onClick={() => archivo.current?.click()}
        disabled={ocupado}
        title={team.logo_url ? 'Cambiar escudo' : 'Subir escudo'}
        className="grid h-7 w-7 place-items-center overflow-hidden rounded-full border border-outline-variant bg-surface-container-low text-[10px] font-bold text-on-surface-variant transition hover:border-secondary disabled:opacity-50"
      >
        {ocupado ? (
          <Icon name="progress_activity" className="animate-spin text-sm" />
        ) : team.logo_url ? (
          <img src={team.logo_url} alt="" className="h-full w-full object-cover" />
        ) : (
          <Icon name="add_photo_alternate" className="text-sm" />
        )}
      </button>
      {team.logo_url && !ocupado && (
        <button
          type="button"
          onClick={() => onChange(null)}
          title="Quitar escudo"
          className="text-on-surface-variant hover:text-error"
        >
          <Icon name="close" className="text-sm" />
        </button>
      )}
      {error && (
        <span className="absolute left-0 top-8 z-10 w-52 rounded border border-error/40 bg-surface-container-high px-2 py-1 text-[11px] text-error shadow-lg">
          {error}
          <button
            type="button"
            onClick={() => setError(null)}
            className="ml-1 font-bold"
          >
            ×
          </button>
        </span>
      )}
      <span className="sr-only">{inicial}</span>
    </span>
  )
}

// Zona del tablero para los equipos que todavía no tienen grupo.
const SIN_GRUPO = '__sin__'

// Tablero de grupos: cada tarjeta es una zona donde soltar equipos. Arrastrar
// un equipo a otra tarjeta lo reasigna de grupo.
function TableroGrupos({
  teams,
  grupos,
  onMover,
  onNuevoGrupo,
}: {
  teams: any[]
  grupos: string[]
  onMover: (teamId: string, grupo: string | null) => void
  onNuevoGrupo: () => void
}) {
  const { idArrastrado, zonaActiva, iniciar, fantasma } = useArrastreEntreZonas(
    (id, zona) => {
      const grupo = zona === SIN_GRUPO ? null : zona
      const equipo = teams.find((t) => t.id === id)
      if (!equipo || (equipo.group_name || null) === grupo) return
      onMover(id, grupo)
    },
  )

  const zonas = [
    ...grupos.map((g) => ({
      id: g,
      titulo: `Grupo ${g}`,
      equipos: teams.filter((t) => t.group_name === g),
    })),
    {
      id: SIN_GRUPO,
      titulo: 'Sin grupo',
      equipos: teams.filter((t) => !t.group_name),
    },
  ]

  return (
    <div>
      <div className="mb-2 flex items-center justify-between gap-2">
        <p className="flex items-center gap-1 text-xs text-on-surface-variant">
          <Icon name="drag_indicator" className="text-base" />
          Arrastra un equipo a otra tarjeta para cambiarlo de grupo.
        </p>
        <Button variant="ghost" onClick={onNuevoGrupo}>
          <Icon name="add" /> Grupo
        </Button>
      </div>
      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {zonas.map((z) => {
          const activa = zonaActiva === z.id
          return (
            <div
              key={z.id}
              data-zona={z.id}
              className={`min-h-[5.5rem] rounded-xl border-2 border-dashed p-2.5 transition ${
                activa
                  ? 'border-secondary bg-secondary/10'
                  : idArrastrado
                    ? 'border-outline-variant bg-surface-container-high/60'
                    : 'border-transparent bg-surface-container-high'
              }`}
            >
              <p className="mb-1.5 flex items-center justify-between text-xs font-semibold uppercase tracking-wide text-on-surface-variant">
                <span>{z.titulo}</span>
                <span className="font-normal normal-case">{z.equipos.length}</span>
              </p>
              <div className="flex flex-wrap gap-1.5">
                {z.equipos.map((t) => (
                  <span
                    key={t.id}
                    onPointerDown={(e) => {
                      // Con mouse se agarra desde cualquier punto del chip; con
                      // el dedo solo desde el asa, para no bloquear el scroll.
                      if (e.pointerType === 'mouse') iniciar(t.id, t.name)(e)
                    }}
                    className={`inline-flex select-none items-center gap-1 rounded-full border border-outline-variant bg-surface-container-lowest px-2 py-1 text-xs transition ${
                      idArrastrado === t.id ? 'opacity-40' : ''
                    }`}
                  >
                    <button
                      type="button"
                      aria-label={`Arrastrar ${t.name} a otro grupo`}
                      onPointerDown={(e) => {
                        e.stopPropagation()
                        iniciar(t.id, t.name)(e)
                      }}
                      style={{ touchAction: 'none' }}
                      className="cursor-grab text-on-surface-variant active:cursor-grabbing"
                    >
                      <Icon name="drag_indicator" className="text-sm" />
                    </button>
                    <span
                      className="h-2.5 w-2.5 shrink-0 rounded-full border border-outline-variant"
                      style={{ background: t.color || '#64748b' }}
                    />
                    {t.name}
                  </span>
                ))}
                {z.equipos.length === 0 && (
                  <span className="text-xs text-on-surface-variant/70">
                    {idArrastrado ? 'Suelta aquí' : 'Vacío'}
                  </span>
                )}
              </div>
            </div>
          )
        })}
      </div>
      {fantasma}
    </div>
  )
}

function EquiposTab({ tournament }: { tournament: any }) {
  const [teams, setTeams] = useState<any[]>([])
  const [name, setName] = useState('')
  const [group, setGroup] = useState('')
  const [color, setColor] = useState('#39d353')
  const [numGroups, setNumGroups] = useState(2)
  const [expanded, setExpanded] = useState<string | null>(null)
  // Grupos creados a mano que todavía no tienen equipos.
  const [gruposExtra, setGruposExtra] = useState<string[]>([])
  const [msg, setMsg] = useState<string | null>(null)
  async function load() {
    setTeams(await api.getTeams(tournament.id))
  }
  useEffect(() => {
    load()
  }, [tournament.id])

  const grupos = Array.from(
    new Set([...teams.map((t) => t.group_name).filter(Boolean), ...gruposExtra]),
  ).sort() as string[]

  // Reasigna de grupo de forma optimista y revierte si el backend la rechaza.
  async function moverEquipo(teamId: string, grupo: string | null) {
    const previos = teams
    setMsg(null)
    setTeams((ts) => ts.map((t) => (t.id === teamId ? { ...t, group_name: grupo } : t)))
    try {
      await api.updateTeamGroup(tournament.id, teamId, grupo)
    } catch (e: any) {
      setTeams(previos)
      setMsg(e.message)
    }
  }

  function nuevoGrupo() {
    for (let i = 0; i < 26; i++) {
      const letra = String.fromCharCode(65 + i)
      if (!grupos.includes(letra)) {
        setGruposExtra([...gruposExtra, letra])
        return
      }
    }
  }
  return (
    <div className="space-y-4">
      <form
        onSubmit={async (e) => {
          e.preventDefault()
          if (!name.trim()) return
          await api.addTeam(tournament.id, { name, group_name: group || null, color, colors: [color] })
          setName('')
          setGroup('')
          load()
        }}
        className="flex flex-wrap items-end gap-2"
      >
        <div className="flex-1">
          <label className="mb-1 block text-xs text-on-surface-variant">Equipo</label>
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Nombre del equipo" />
        </div>
        <div className="w-24">
          <label className="mb-1 block text-xs text-on-surface-variant">Grupo</label>
          <Input value={group} onChange={(e) => setGroup(e.target.value)} placeholder="A" />
        </div>
        <div>
          <label className="mb-1 block text-xs text-on-surface-variant">Color</label>
          <input
            type="color"
            value={color}
            onChange={(e) => setColor(e.target.value)}
            className="h-9 w-12 cursor-pointer rounded border border-outline-variant bg-surface-container-low"
            title="Color del uniforme"
          />
        </div>
        <Button type="submit">
          <Icon name="add" /> Añadir
        </Button>
      </form>

      <div className="flex items-center gap-2">
        <span className="text-sm text-on-surface-variant">Sortear en</span>
        <Input type="number" min={1} value={numGroups} onChange={(e) => setNumGroups(parseInt(e.target.value) || 1)} className="w-20" />
        <span className="text-sm text-on-surface-variant">grupos</span>
        <Button
          variant="outline"
          onClick={async () => {
            await api.shuffleGroups(tournament.id, numGroups)
            load()
          }}
        >
          <Icon name="shuffle" /> Sortear
        </Button>
      </div>

      {msg && <p className="text-sm text-error">{msg}</p>}

      {teams.length > 0 && (
        <TableroGrupos
          teams={teams}
          grupos={grupos}
          onMover={moverEquipo}
          onNuevoGrupo={nuevoGrupo}
        />
      )}

      {teams.length === 0 ? (
        <EmptyState icon="groups" title="Sin equipos inscritos" />
      ) : (
        <ul className="divide-y divide-outline-variant/30">
          {teams.map((t) => (
            <li key={t.id} className="py-2.5">
              <div className="flex items-center justify-between">
                <button
                  onClick={() => setExpanded(expanded === t.id ? null : t.id)}
                  className="flex items-center gap-2 font-medium"
                >
                  <Icon name={expanded === t.id ? 'expand_more' : 'chevron_right'} className="text-base text-on-surface-variant" />
                  {t.logo_url ? (
                    <img
                      src={t.logo_url}
                      alt=""
                      className="h-5 w-5 shrink-0 rounded-full object-cover"
                    />
                  ) : (
                    <span
                      className="h-3 w-3 shrink-0 rounded-full border border-outline-variant"
                      style={{ background: t.color || '#64748b' }}
                    />
                  )}
                  {t.name}
                  {!!t.points_adjustment && (
                    <span
                      title={`Sanción de puntos: ${t.points_adjustment > 0 ? '+' : ''}${
                        t.points_adjustment
                      }${t.points_adjustment_reason ? ` · ${t.points_adjustment_reason}` : ''}`}
                      className={`rounded px-1 py-0.5 text-[10px] font-bold tabular-nums ${
                        t.points_adjustment < 0
                          ? 'bg-error-container text-on-error-container'
                          : 'bg-secondary/20 text-secondary'
                      }`}
                    >
                      {t.points_adjustment > 0 ? '+' : ''}
                      {t.points_adjustment}
                    </span>
                  )}
                </button>
                <span className="flex items-center gap-2">
                  <Select
                    value={t.group_name || ''}
                    onChange={(e) => moverEquipo(t.id, e.target.value || null)}
                    className="w-28 px-2 py-1 text-xs"
                    title="Grupo del equipo"
                  >
                    <option value="">Sin grupo</option>
                    {grupos.map((g) => (
                      <option key={g} value={g}>
                        Grupo {g}
                      </option>
                    ))}
                  </Select>
                  <TeamLogo
                    team={t}
                    onChange={async (logo) => {
                      await api.updateTeam(t.id, { logo_url: logo })
                      load()
                    }}
                  />
                  <TeamColors
                    team={t}
                    onChange={async (cols) => {
                      await api.updateTeam(t.id, { colors: cols, color: cols[0] || null })
                      load()
                    }}
                  />
                  {/* Sanción de puntos: la otra mitad del reglamento. Descontar
                      no se hace tocando resultados —eso es mentirle a la tabla—
                      sino sumándole al equipo puntos negativos, con su motivo. */}
                  <button
                    onClick={async () => {
                      const txt = prompt(
                        `Sanción de puntos para ${t.name}\n` +
                          'Negativa descuenta (por ejemplo -3), positiva bonifica, 0 la quita.',
                        String(t.points_adjustment || 0),
                      )
                      if (txt === null) return
                      const puntos = Number(txt.trim())
                      if (!Number.isFinite(puntos)) {
                        setMsg('Escribe un número, por ejemplo -3')
                        return
                      }
                      const motivo = puntos
                        ? prompt(
                            'Motivo (se ve al lado del descuento en la tabla)',
                            t.points_adjustment_reason || '',
                          )
                        : null
                      if (puntos && motivo === null) return
                      try {
                        await api.updateTeamPointsAdjustment(
                          tournament.id,
                          t.id,
                          puntos,
                          motivo,
                        )
                        load()
                      } catch (e: any) {
                        setMsg(e.message)
                      }
                    }}
                    title={
                      t.points_adjustment
                        ? `Sanción: ${t.points_adjustment} pts${
                            t.points_adjustment_reason ? ` · ${t.points_adjustment_reason}` : ''
                          }`
                        : 'Sanción de puntos del reglamento'
                    }
                    className={
                      t.points_adjustment
                        ? 'text-error hover:brightness-125'
                        : 'text-on-surface-variant hover:text-on-surface'
                    }
                  >
                    <Icon name="gavel" className="text-lg" />
                  </button>
                  <button
                    onClick={async () => {
                      const n = prompt('Nuevo nombre del equipo', t.name)
                      if (n && n.trim()) {
                        await api.updateTeam(t.id, { name: n.trim() })
                        load()
                      }
                    }}
                    className="text-on-surface-variant hover:text-on-surface"
                  >
                    <Icon name="edit" className="text-lg" />
                  </button>
                  <button
                    onClick={async () => {
                      await api.removeTeam(tournament.id, t.id)
                      load()
                    }}
                    className="text-error/80 hover:text-error"
                  >
                    <Icon name="delete" className="text-lg" />
                  </button>
                </span>
              </div>
              {expanded === t.id && (
                <>
                  <PlayersBlock teamId={t.id} />
                  <CaptainsBlock teamId={t.id} teamName={t.name} />
                </>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

// Panel de configuración de una fase: nombre, tipo, ida y vuelta, cuántos
// clasifican y qué equipos la disputan.
function StageConfig({
  stage,
  teams,
  onSaved,
}: {
  stage: any
  teams: any[]
  onSaved: () => void
}) {
  const cfg = stage.config || {}
  const [name, setName] = useState(stage.name)
  const [type, setType] = useState(stage.type)
  const [doubleRound, setDoubleRound] = useState(!!cfg.double_round)
  const [perGroup, setPerGroup] = useState(String(cfg.qualifiers_per_group ?? 2))
  const [extras, setExtras] = useState(
    cfg.best_thirds_count === undefined || cfg.best_thirds_count === null
      ? 'auto'
      : String(cfg.best_thirds_count),
  )
  const [teamIds, setTeamIds] = useState<string[]>(cfg.team_ids || [])
  const [preset, setPreset] = useState<string>(cfg.preset || '')
  const [crossTb, setCrossTb] = useState<string[]>(cfg.cross_tiebreakers || [])
  const [presets, setPresets] = useState<any>(null)
  const [preview, setPreview] = useState<any>(null)
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  useEffect(() => {
    api.qualificationPresets().then(setPresets).catch(() => setPresets(null))
    api.bracketPreview(stage.id).then(setPreview).catch(() => setPreview(null))
  }, [stage.id])

  const toggleTeam = (id: string) =>
    setTeamIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]))

  async function save() {
    setSaving(true)
    setErr(null)
    try {
      await api.updateStage(stage.id, {
        name,
        type,
        config: {
          ...cfg,
          double_round: doubleRound,
          preset: preset || null,
          qualifiers_per_group: Number(perGroup) || 2,
          best_thirds_count: extras === 'auto' ? 'auto' : Number(extras),
          cross_tiebreakers: crossTb.length ? crossTb : null,
          team_ids: teamIds,
        },
      })
      api.bracketPreview(stage.id).then(setPreview).catch(() => setPreview(null))
      onSaved()
    } catch (e: any) {
      setErr(e.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="mt-3 space-y-4 rounded-lg border border-outline-variant/40 bg-surface-container p-3">
      <div className="flex flex-wrap items-end gap-2">
        <div className="min-w-[10rem] flex-1">
          <label className="mb-1 block text-xs text-on-surface-variant">Nombre</label>
          <Input value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        <div className="w-40">
          <label className="mb-1 block text-xs text-on-surface-variant">Tipo</label>
          <Select value={type} onChange={(e) => setType(e.target.value)}>
            {STAGE_TYPES.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </Select>
        </div>
      </div>

      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={doubleRound}
          onChange={(e) => setDoubleRound(e.target.checked)}
          className="h-4 w-4 accent-secondary"
        />
        Ida y vuelta (todos contra todos dos veces)
      </label>

      <div>
        <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-on-surface-variant">
          Sistema de clasificación
        </p>
        <Select
          value={preset}
          onChange={(e) => {
            const v = e.target.value
            setPreset(v)
            const p = (presets?.presets || []).find((x: any) => x.value === v)
            if (p) {
              setPerGroup(String(p.qualifiers_per_group))
              setExtras(String(p.best_thirds_count))
            }
          }}
        >
          <option value="">Personalizado</option>
          {(presets?.presets || []).map((p: any) => (
            <option key={p.value} value={p.value}>
              {p.label}
            </option>
          ))}
        </Select>
        <div className="mt-2 flex flex-wrap items-end gap-2">
          <div className="w-40">
            <label className="mb-1 block text-xs text-on-surface-variant">
              Clasifican por grupo
            </label>
            <Input
              type="number"
              min={1}
              value={perGroup}
              onChange={(e) => setPerGroup(e.target.value)}
            />
          </div>
          <div className="w-44">
            <label className="mb-1 block text-xs text-on-surface-variant">Repescados</label>
            <Select value={extras} onChange={(e) => setExtras(e.target.value)}>
              <option value="auto">Auto (completa el cuadro)</option>
              {[0, 1, 2, 3, 4, 6, 8].map((n) => (
                <option key={n} value={String(n)}>
                  {n}
                </option>
              ))}
            </Select>
          </div>
        </div>
        <p className="mt-1 text-xs text-on-surface-variant">
          Los repescados son los que quedan justo debajo del corte en cada grupo (los
          terceros si pasan 2, los segundos si pasa 1). Elegir un sistema rellena estos
          dos valores; si los cambias a mano, mandan los tuyos.
        </p>
      </div>

      <div>
        <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-on-surface-variant">
          Desempate entre grupos
        </p>
        <p className="mb-1.5 text-xs text-on-surface-variant">
          Orden para comparar equipos de grupos distintos (los repescados). Sin criterios
          propios se usa: {(presets?.default_cross_tiebreakers || []).join(' → ')}.
        </p>
        {crossTb.length > 0 && (
          <ListaOrdenable
            items={crossTb}
            idDe={(k) => k}
            onReordenar={setCrossTb}
            className="mb-2 space-y-1"
            claseItem="flex items-center gap-2 rounded-lg bg-surface-container-high px-2 py-1 text-sm"
          >
            {(k, i) => (
              <>
                <AsaArrastre />
                <span className="text-xs text-on-surface-variant">{i + 1}.</span>
                <span className="flex-1">
                  {(presets?.cross_tiebreaker_options || []).find((o: any) => o.value === k)
                    ?.label || k}
                </span>
                <button
                  onClick={() => setCrossTb(crossTb.filter((x) => x !== k))}
                  className="text-error/80 hover:text-error"
                >
                  <Icon name="close" className="text-base" />
                </button>
              </>
            )}
          </ListaOrdenable>
        )}
        <div className="flex flex-wrap gap-1.5">
          {(presets?.cross_tiebreaker_options || [])
            .filter((o: any) => !crossTb.includes(o.value))
            .map((o: any) => (
              <button
                key={o.value}
                type="button"
                onClick={() => setCrossTb([...crossTb, o.value])}
                className="rounded-full border border-outline-variant px-2.5 py-1 text-xs text-on-surface-variant transition hover:border-outline"
              >
                + {o.label}
              </button>
            ))}
        </div>
      </div>

      {preview && preview.pairings?.length > 0 && (
        <div>
          <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-on-surface-variant">
            Vista previa del cuadro
          </p>
          <p className="mb-2 text-xs text-on-surface-variant">
            {preview.bracket_size} equipos ·{' '}
            {preview.es_potencia_de_dos
              ? 'cuadro completo'
              : '⚠ no es potencia de 2, faltarían o sobrarían cruces'}
            . Se siembra por mérito: mejor contra peor. Guardar la fase actualiza esto.
          </p>
          <ul className="space-y-1 text-sm">
            {preview.pairings.map((p: any) => (
              <li
                key={p.match}
                className="flex items-center gap-2 rounded-lg bg-surface-container-high px-2 py-1.5"
              >
                <span className="w-6 text-xs text-on-surface-variant">#{p.match}</span>
                <span className="flex-1 truncate text-right">
                  {p.home_team_name}
                  <span className="ml-1 text-xs text-on-surface-variant">
                    ({p.home_seed}º{p.home_group ? ` · ${p.home_group}` : ''})
                  </span>
                </span>
                <span className="text-xs text-on-surface-variant">vs</span>
                <span className="flex-1 truncate">
                  {p.away_team_name}
                  <span className="ml-1 text-xs text-on-surface-variant">
                    ({p.away_seed}º{p.away_group ? ` · ${p.away_group}` : ''})
                  </span>
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div>
        <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-on-surface-variant">
          Equipos de la fase
        </p>
        {teams.length === 0 ? (
          <p className="text-xs text-on-surface-variant">Aún no hay equipos inscritos.</p>
        ) : (
          <>
            <div className="flex flex-wrap gap-1.5">
              {teams.map((t) => {
                const on = teamIds.includes(t.id)
                return (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => toggleTeam(t.id)}
                    className={`rounded-full border px-2.5 py-1 text-xs transition ${
                      on
                        ? 'border-secondary bg-secondary/15 text-secondary'
                        : 'border-outline-variant text-on-surface-variant hover:border-outline'
                    }`}
                  >
                    {t.name}
                  </button>
                )
              })}
            </div>
            <p className="mt-1 text-xs text-on-surface-variant">
              {teamIds.length === 0
                ? 'Ninguno marcado: juegan todos los equipos del torneo.'
                : `${teamIds.length} equipo(s) disputan esta fase.`}
            </p>
          </>
        )}
      </div>

      {err && <p className="text-sm text-error">{err}</p>}
      <Button onClick={save} disabled={saving}>
        <Icon name="save" /> {saving ? 'Guardando…' : 'Guardar fase'}
      </Button>
    </div>
  )
}

function FasesTab({ tournament }: { tournament: any }) {
  const [stages, setStages] = useState<any[]>([])
  const [teams, setTeams] = useState<any[]>([])
  const [name, setName] = useState('')
  const [type, setType] = useState('group')
  const [msg, setMsg] = useState<string | null>(null)
  const [openId, setOpenId] = useState<string | null>(null)
  // Último orden que el backend confirmó, para no reenviarlo si soltaste la
  // fase donde mismo estaba.
  const ordenGuardado = useRef<string[]>([])
  async function load() {
    const st = await api.getStages(tournament.id)
    ordenGuardado.current = st.map((s: any) => s.id)
    setStages(st)
  }
  useEffect(() => {
    load()
    api.getTeams(tournament.id).then(setTeams).catch(() => setTeams([]))
  }, [tournament.id])

  // Persiste el orden completo tras soltar (o mover con el teclado) una fase.
  async function guardarOrden(next: any[]) {
    const ids = next.map((s) => s.id)
    if (ids.join() === ordenGuardado.current.join()) return
    setMsg(null)
    try {
      const st = await api.reorderStages(tournament.id, ids)
      ordenGuardado.current = st.map((s: any) => s.id)
      setStages(st)
    } catch (e: any) {
      setMsg(e.message)
      load()
    }
  }

  return (
    <div className="space-y-4">
      <form
        onSubmit={async (e) => {
          e.preventDefault()
          if (!name.trim()) return
          await api.createStage(tournament.id, { name, type })
          setName('')
          load()
        }}
        className="flex flex-wrap items-end gap-2"
      >
        <div className="flex-1">
          <label className="mb-1 block text-xs text-on-surface-variant">Fase</label>
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Fase de grupos" />
        </div>
        <div className="w-40">
          <label className="mb-1 block text-xs text-on-surface-variant">Tipo</label>
          <Select value={type} onChange={(e) => setType(e.target.value)}>
            {STAGE_TYPES.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </Select>
        </div>
        <Button type="submit">
          <Icon name="add" /> Crear fase
        </Button>
      </form>
      {msg && <p className="text-sm text-secondary">{msg}</p>}
      {stages.length === 0 ? (
        <EmptyState icon="account_tree" title="Sin fases" />
      ) : (
        <>
        {stages.length > 1 && (
          <p className="flex items-center gap-1 text-xs text-on-surface-variant">
            <Icon name="drag_indicator" className="text-base" />
            Arrastra las fases para cambiar su orden en el torneo.
          </p>
        )}
        <ListaOrdenable
          items={stages}
          idDe={(s: any) => s.id}
          onReordenar={setStages}
          onSoltar={guardarOrden}
          className="space-y-2"
          claseItem="rounded-lg bg-surface-container-high px-3 py-2.5"
        >
          {(s: any, i: number) => (
            <>
              <div className="flex items-center justify-between gap-2">
              <span className="flex min-w-0 items-center gap-1">
                <AsaArrastre className="mr-1" titulo="Arrastra para reordenar la fase (o usa ↑ ↓)" />
                <span className="truncate">
                  <span className="mr-1 text-xs text-on-surface-variant">{i + 1}.</span>
                  <span className="font-medium">{s.name}</span>{' '}
                  <Badge className="ml-1 bg-surface-container-highest text-on-surface-variant">{s.type}</Badge>
                  {s.config?.double_round && (
                    <Badge className="ml-1 bg-secondary/15 text-secondary">ida y vuelta</Badge>
                  )}
                </span>
              </span>
              <span className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  onClick={() => setOpenId(openId === s.id ? null : s.id)}
                >
                  <Icon name="tune" /> Configurar
                </Button>
                <Button
                  variant="outline"
                  onClick={async () => {
                    setMsg(null)
                    try {
                      const r = await api.generateFixture(s.id)
                      setMsg(r.message)
                    } catch (e: any) {
                      setMsg(e.message)
                    }
                  }}
                >
                  <Icon name="event" /> Fixture
                </Button>
                {s.type === 'swiss' && (
                  <Button
                    variant="ghost"
                    onClick={async () => {
                      setMsg(null)
                      try {
                        const r = await api.swissRound(s.id)
                        setMsg(r.message)
                      } catch (e: any) {
                        setMsg(e.message)
                      }
                    }}
                  >
                    <Icon name="casino" /> Ronda suiza
                  </Button>
                )}
                <button
                  onClick={async () => {
                    await api.deleteStage(s.id)
                    setOpenId(null)
                    load()
                  }}
                  className="text-error/80 hover:text-error"
                >
                  <Icon name="delete" className="text-lg" />
                </button>
              </span>
              </div>
              {openId === s.id && (
                <StageConfig
                  stage={s}
                  teams={teams}
                  onSaved={() => {
                    setMsg('Fase actualizada')
                    setOpenId(null)
                    load()
                  }}
                />
              )}
            </>
          )}
        </ListaOrdenable>
        </>
      )}
    </div>
  )
}

function PosicionesTab({ tournament }: { tournament: any }) {
  const [stages, setStages] = useState<any[]>([])
  const [active, setActive] = useState<any>(null)
  const [standings, setStandings] = useState<Record<string, any[]>>({})
  const [bracket, setBracket] = useState<any>(null)
  useEffect(() => {
    api.getStages(tournament.id).then((st) => {
      setStages(st)
      if (st[0]) select(st[0])
    })
  }, [tournament.id])
  async function select(s: any) {
    setActive(s)
    setBracket(null)
    setStandings({})
    if (s.type === 'knockout') setBracket(await api.bracketTree(s.id))
    else setStandings(await api.standingsByGroup(s.id))
  }
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        {stages.map((s) => (
          <Button key={s.id} variant={active?.id === s.id ? 'primary' : 'ghost'} onClick={() => select(s)}>
            {s.name}
          </Button>
        ))}
        {Object.keys(standings).length > 0 && (
          <Button variant="outline" className="ml-auto" onClick={() => exportStandingsPDF(tournament.name, standings)}>
            <Icon name="picture_as_pdf" /> PDF
          </Button>
        )}
      </div>
      {!active ? (
        <EmptyState icon="leaderboard" title="Crea una fase para ver posiciones" />
      ) : bracket ? (
        <TournamentBracket tree={bracket} />
      ) : (
        <div className="space-y-5">
          {Object.entries(standings).map(([group, rows]) => (
            <div key={group}>
              <h3 className="mb-2 font-display font-semibold">{group === 'Sin Grupo' ? 'Tabla general' : `Grupo ${group}`}</h3>
              <StandingsTable rows={rows} />
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function AvanceTab({ tournament }: { tournament: any }) {
  const [stages, setStages] = useState<any[]>([])
  const [sourceId, setSourceId] = useState('')
  const [targetId, setTargetId] = useState('')
  const [groups, setGroups] = useState<string[]>([])
  const [standings, setStandings] = useState<Record<string, any[]>>({})
  const [thirds, setThirds] = useState<any[]>([])
  const [rows, setRows] = useState<any[]>([{ hg: '', hp: 1, ag: '', ap: 2 }])
  const [thirdPlace, setThirdPlace] = useState(false)
  const [msg, setMsg] = useState<string | null>(null)
  useEffect(() => {
    api.getStages(tournament.id).then(setStages)
  }, [tournament.id])
  async function onSource(id: string) {
    setSourceId(id)
    setStandings({})
    setThirds([])
    if (!id) return setGroups([])
    const gs = await api.standingsByGroup(id)
    setGroups(Object.keys(gs))
    setStandings(gs)
    api.bestThirds(id, 4).then((r) => setThirds(r.best_thirds || [])).catch(() => setThirds([]))
  }
  const groupOpts = [...groups, '__best_thirds__']

  async function run(action: 'seed' | 'advance') {
    setMsg(null)
    try {
      if (!sourceId || !targetId) {
        setMsg('Selecciona fase origen y destino.')
        return
      }
      if (action === 'seed') {
        const r = await api.seedBracket(targetId, {
          source_stage_id: sourceId,
          third_place: thirdPlace,
          round1: rows.map((c) => ({
            home_group: c.hg,
            home_position: Number(c.hp),
            away_group: c.ag,
            away_position: Number(c.ap),
          })),
        })
        setMsg(r.message)
      } else {
        const r = await api.advance(sourceId, {
          next_stage_id: targetId,
          pairings: rows.map((c) => ({
            h_group: c.hg,
            h_pos: Number(c.hp),
            a_group: c.ag,
            a_pos: Number(c.ap),
          })),
        })
        setMsg(r.message)
      }
    } catch (e: any) {
      setMsg(e.message)
    }
  }

  async function autoBracket() {
    setMsg(null)
    try {
      const allStages = await api.getStages(tournament.id)
      const groupStage = allStages.find((s: any) => s.type === 'group')
      if (!groupStage) {
        setMsg('No hay una fase de grupos de la cual generar las eliminatorias.')
        return
      }
      const sbg: Record<string, any[]> = await api.standingsByGroup(groupStage.id)
      const grps = Object.keys(sbg).filter((g) => g !== 'Sin Grupo' && sbg[g].length)
      if (grps.length < 1) {
        setMsg('La fase de grupos no tiene equipos en grupos.')
        return
      }
      const metric = (r: any) => [r.league_points || 0, r.diff || 0, r.points_scored || 0]
      const cmp = (a: any, b: any) => {
        const ma = metric(a.row)
        const mb = metric(b.row)
        for (let i = 0; i < 3; i++) if (mb[i] !== ma[i]) return mb[i] - ma[i]
        return 0
      }
      const maxpos = Math.max(...grps.map((g) => sbg[g].length))
      let seeds: any[] = []
      for (let pos = 1; pos <= maxpos; pos++) {
        const tier = grps
          .filter((g) => sbg[g].length >= pos)
          .map((g) => ({ group: g, position: pos, row: sbg[g][pos - 1] }))
        tier.sort(cmp)
        seeds.push(...tier)
      }
      const base = grps.reduce((a, g) => a + Math.min(2, sbg[g].length), 0)
      const thirdsAvail = grps.filter((g) => sbg[g].length >= 3).length
      const total = seeds.length
      const nextPow2 = (x: number) => {
        let p = 1
        while (p < x) p *= 2
        return p
      }
      const prevPow2 = (x: number) => {
        let p = 1
        while (p * 2 <= x) p *= 2
        return p
      }
      let size = nextPow2(base)
      if (!(size <= base + thirdsAvail && size <= total)) {
        size = prevPow2(Math.min(total, base + thirdsAvail))
      }
      size = Math.max(2, size)
      if (total < size || size < 2) {
        setMsg('No hay suficientes equipos clasificados para armar las eliminatorias.')
        return
      }
      seeds = seeds.slice(0, size)
      // Orden de siembra estándar (1 vs N, …) para que el 1.º y 2.º solo se crucen en la final.
      let order = [1, 2]
      while (order.length < size) {
        const m = order.length * 2 + 1
        const out: number[] = []
        for (const r of order) {
          out.push(r)
          out.push(m - r)
        }
        order = out
      }
      const round1: any[] = []
      for (let i = 0; i < size; i += 2) {
        const a = seeds[order[i] - 1]
        const b = seeds[order[i + 1] - 1]
        round1.push({
          home_group: a.group,
          home_position: a.position,
          away_group: b.group,
          away_position: b.position,
        })
      }
      const gm = await api.stageMatches(groupStage.id)
      const allDone = gm.length > 0 && gm.every((m: any) => m.status === 'finished')
      const ko = await api.createStage(tournament.id, { name: 'Eliminatorias', type: 'knockout' })
      await api.seedBracket(ko.id, { source_stage_id: groupStage.id, third_place: true, round1 })
      if (allDone) await api.resolveSlots(ko.id)
      setStages(await api.getStages(tournament.id))
      setMsg(
        allDone
          ? `🎯 Eliminatorias generadas (${size} equipos) y cruces resueltos.`
          : `🎯 Estructura de eliminatorias creada (${size} equipos). Se llenará al terminar los grupos.`,
      )
    } catch (e: any) {
      setMsg(e.message)
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-secondary/30 bg-secondary/10 p-4">
        <div className="min-w-0">
          <p className="flex items-center gap-2 font-display font-semibold text-secondary">
            <Icon name="auto_awesome" /> Generar eliminatorias automáticamente
          </p>
          <p className="mt-0.5 text-xs text-on-surface-variant">
            Toma 1.º y 2.º de cada grupo + los mejores terceros y siembra cuartos/semis/3.º/final.
          </p>
        </div>
        <Button onClick={autoBracket}>
          <Icon name="bolt" /> Generar
        </Button>
      </div>
      <p className="text-sm text-on-surface-variant">
        O define los cruces manualmente tomando posiciones de la fase origen y créalos en la fase destino.
      </p>
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label className="mb-1 block text-xs text-on-surface-variant">Fase origen (grupos/liga)</label>
          <Select value={sourceId} onChange={(e) => onSource(e.target.value)}>
            <option value="">—</option>
            {stages.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </Select>
        </div>
        <div>
          <label className="mb-1 block text-xs text-on-surface-variant">Fase destino</label>
          <Select value={targetId} onChange={(e) => setTargetId(e.target.value)}>
            <option value="">—</option>
            {stages.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name} ({s.type})
              </option>
            ))}
          </Select>
        </div>
      </div>

      {Object.keys(standings).length > 0 && (
        <div className="space-y-3 rounded-lg bg-surface-container-low p-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-on-surface-variant">
            Posiciones de la fase origen
          </p>
          {Object.entries(standings).map(([group, rws]) => (
            <div key={group}>
              <h4 className="mb-1 text-sm font-medium">
                {group === 'Sin Grupo' ? 'Tabla general' : `Grupo ${group}`}
              </h4>
              <StandingsTable rows={rws} />
            </div>
          ))}
          {thirds.length > 0 && (
            <p className="text-xs text-on-surface-variant">
              Mejores terceros:{' '}
              {thirds.map((t, i) => `${t.team_name || t.team_id} (${t.from_group})`).join(' · ')}
            </p>
          )}
        </div>
      )}

      <div className="space-y-2">
        {rows.map((c, i) => (
          <div key={i} className="flex flex-wrap items-center gap-2 rounded-lg bg-surface-container-high p-2">
            <Select value={c.hg} onChange={(e) => setRows(rows.map((r, j) => (j === i ? { ...r, hg: e.target.value } : r)))} className="w-32">
              <option value="">grupo</option>
              {groupOpts.map((g) => (
                <option key={g} value={g}>
                  {g === '__best_thirds__' ? 'Mej. terceros' : g}
                </option>
              ))}
            </Select>
            <Input type="number" min={1} value={c.hp} onChange={(e) => setRows(rows.map((r, j) => (j === i ? { ...r, hp: e.target.value } : r)))} className="w-16" />
            <span className="text-on-surface-variant">vs</span>
            <Select value={c.ag} onChange={(e) => setRows(rows.map((r, j) => (j === i ? { ...r, ag: e.target.value } : r)))} className="w-32">
              <option value="">grupo</option>
              {groupOpts.map((g) => (
                <option key={g} value={g}>
                  {g === '__best_thirds__' ? 'Mej. terceros' : g}
                </option>
              ))}
            </Select>
            <Input type="number" min={1} value={c.ap} onChange={(e) => setRows(rows.map((r, j) => (j === i ? { ...r, ap: e.target.value } : r)))} className="w-16" />
            <button onClick={() => setRows(rows.filter((_, j) => j !== i))} className="text-error/80 hover:text-error">
              <Icon name="close" />
            </button>
          </div>
        ))}
        <Button variant="ghost" onClick={() => setRows([...rows, { hg: '', hp: 1, ag: '', ap: 2 }])}>
          <Icon name="add" /> Cruce
        </Button>
      </div>

      <label className="flex items-center gap-2 text-sm text-on-surface-variant">
        <input
          type="checkbox"
          checked={thirdPlace}
          onChange={(e) => setThirdPlace(e.target.checked)}
          className="accent-secondary"
        />
        Incluir partido por el 3er puesto
      </label>

      <div className="flex flex-wrap gap-2">
        <Button onClick={() => run('seed')}>
          <Icon name="account_tree" /> Sembrar bracket
        </Button>
        <Button variant="outline" onClick={() => run('advance')}>
          <Icon name="arrow_forward" /> Avanzar (crear cruces)
        </Button>
        <Button
          variant="ghost"
          onClick={async () => {
            if (!targetId) return setMsg('Selecciona la fase destino.')
            const r = await api.resolveSlots(targetId)
            setMsg(r.message)
          }}
        >
          <Icon name="sync" /> Resolver cruces
        </Button>
      </div>
      {msg && <p className="text-sm text-secondary">{msg}</p>}
    </div>
  )
}

function ConfigTab({ tournament, onChanged }: { tournament: any; onChanged: () => void }) {
  const [options, setOptions] = useState<any[]>([])
  const pc = tournament.points_config || {}
  const [win, setWin] = useState(pc.win ?? 3)
  const [draw, setDraw] = useState(pc.draw ?? 1)
  const [loss, setLoss] = useState(pc.loss ?? 0)
  const [category, setCategory] = useState(tournament.category || 'masculino')
  const [duration, setDuration] = useState(tournament.match_duration ?? 60)
  const [waiting, setWaiting] = useState(tournament.waiting_time ?? 10)
  const [maxPerDay, setMaxPerDay] = useState(tournament.max_matches_per_day ?? '')
  const [rules, setRules] = useState<string[]>(
    tournament.tiebreaker_rules || ['PUNTOS', 'DIF_GOLES', 'GOLES_FAVOR', 'PARTIDO_DIRECTO'],
  )
  const vis = tournament.visibility || {}
  const [visibility, setVisibility] = useState<Record<string, boolean>>({
    sanciones: vis.sanciones !== false,
    nominas: vis.nominas !== false,
    metricas: vis.metricas !== false,
  })
  const [msg, setMsg] = useState<string | null>(null)

  useEffect(() => {
    api.getTiebreakerOptions().then(setOptions).catch(() => setOptions([]))
  }, [])

  const labelOf = (k: string) => options.find((o) => o.key === k)?.label || k
  const available = options.filter((o) => !rules.includes(o.key))

  async function save() {
    try {
      await api.updateTournament(tournament.id, {
        category,
        match_duration: Number(duration),
        waiting_time: Number(waiting),
        max_matches_per_day: maxPerDay ? Number(maxPerDay) : null,
        points_config: { win: Number(win), draw: Number(draw), loss: Number(loss) },
        tiebreaker_rules: rules,
        visibility,
      })
      setMsg('Configuración guardada')
      onChanged()
    } catch (e: any) {
      setMsg(e.message)
    }
  }

  const SECCIONES_PUBLICAS: { key: string; label: string; hint: string }[] = [
    {
      key: 'sanciones',
      label: 'Sanciones y juego limpio',
      hint: 'Tabla de sancionados por jugador y ranking de juego limpio.',
    },
    {
      key: 'nominas',
      label: 'Nóminas de jugadores',
      hint: 'Plantilla de cada equipo con sus jugadores.',
    },
    {
      key: 'metricas',
      label: 'Métricas del torneo',
      hint: 'Curva de puntos, goles por fecha y panel de métricas.',
    },
  ]

  return (
    <div className="space-y-6">
      <div>
        <h3 className="mb-1 font-display font-semibold">Qué se ve en el marcador público</h3>
        <p className="mb-2 text-xs text-on-surface-variant">
          Posiciones, calendario, goleadores y valla menos vencida son siempre públicos.
          Lo que apagues aquí solo lo verás tú y el superadministrador.
        </p>
        <div className="space-y-1.5">
          {SECCIONES_PUBLICAS.map((s) => (
            <label
              key={s.key}
              className="flex items-start gap-2 rounded-lg bg-surface-container-high px-3 py-2"
            >
              <input
                type="checkbox"
                checked={visibility[s.key]}
                onChange={(e) =>
                  setVisibility({ ...visibility, [s.key]: e.target.checked })
                }
                className="mt-0.5 h-4 w-4 accent-secondary"
              />
              <span>
                <span className="text-sm font-medium">{s.label}</span>
                <span className="block text-xs text-on-surface-variant">{s.hint}</span>
              </span>
            </label>
          ))}
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="mb-1 block text-xs text-on-surface-variant">Categoría</label>
          <Input value={category} onChange={(e) => setCategory(e.target.value)} placeholder="masculino" />
        </div>
        <div className="grid grid-cols-3 gap-2">
          <div>
            <label className="mb-1 block text-xs text-on-surface-variant">Pts victoria</label>
            <Input type="number" value={win} onChange={(e) => setWin(e.target.value)} />
          </div>
          <div>
            <label className="mb-1 block text-xs text-on-surface-variant">Empate</label>
            <Input type="number" value={draw} onChange={(e) => setDraw(e.target.value)} />
          </div>
          <div>
            <label className="mb-1 block text-xs text-on-surface-variant">Derrota</label>
            <Input type="number" value={loss} onChange={(e) => setLoss(e.target.value)} />
          </div>
        </div>
        <div>
          <label className="mb-1 block text-xs text-on-surface-variant">Duración partido (min)</label>
          <Input type="number" value={duration} onChange={(e) => setDuration(e.target.value)} />
        </div>
        <div>
          <label className="mb-1 block text-xs text-on-surface-variant">Espera entre partidos (min)</label>
          <Input type="number" value={waiting} onChange={(e) => setWaiting(e.target.value)} />
        </div>
        <div>
          <label className="mb-1 block text-xs text-on-surface-variant">Máx. partidos por día (opcional)</label>
          <Input
            type="number"
            min={0}
            value={maxPerDay}
            onChange={(e) => setMaxPerDay(e.target.value)}
            placeholder="sin límite"
          />
        </div>
      </div>

      <div>
        <h3 className="mb-1 font-display font-semibold">Criterios de desempate (en orden)</h3>
        <p className="mb-2 text-xs text-on-surface-variant">
          Define cómo se clasifican los equipos empatados. El primero tiene mayor
          prioridad: arrastra los criterios para cambiar el orden.
        </p>
        <ListaOrdenable
          items={rules}
          idDe={(r) => r}
          onReordenar={setRules}
          className="space-y-1.5"
          claseItem="flex items-center gap-2 rounded-lg bg-surface-container-high px-3 py-2"
        >
          {(r, i) => (
            <>
              <AsaArrastre />
              <span className="w-5 text-on-surface-variant">{i + 1}.</span>
              <span className="flex-1">{labelOf(r)}</span>
              <span className="text-xs text-on-surface-variant/60">{r}</span>
              <button onClick={() => setRules(rules.filter((x) => x !== r))} className="text-error/80 hover:text-error">
                <Icon name="close" className="text-base" />
              </button>
            </>
          )}
        </ListaOrdenable>
        {available.length > 0 && (
          <Select
            value=""
            onChange={(e) => e.target.value && setRules([...rules, e.target.value])}
            className="mt-2"
          >
            <option value="">+ Agregar criterio…</option>
            {available.map((o) => (
              <option key={o.key} value={o.key}>
                {o.label} ({o.key})
              </option>
            ))}
          </Select>
        )}
      </div>

      <div className="flex items-center gap-3">
        <Button onClick={save}>
          <Icon name="save" /> Guardar configuración
        </Button>
        {msg && <span className="text-sm text-secondary">{msg}</span>}
      </div>
    </div>
  )
}

/** Icono por tipo de cruce; las claves las fija services/validacion_calendario.py. */
const CONFLICTO_ICONO: Record<string, string> = {
  cancha_ocupada: 'stadium',
  equipo_solapado: 'groups',
  equipo_sin_descanso: 'hourglass_bottom',
  arbitro_ocupado: 'sports',
  orden_de_llave: 'account_tree',
  sin_fecha: 'event_busy',
  sin_cancha: 'location_off',
}

/**
 * Validación del calendario.
 *
 * La programación automática no se pisa sola, pero en cuanto el organizador
 * mueve una hora a mano puede dejar dos partidos en la misma cancha, un equipo
 * jugando dos veces a la vez o una llave antes de su clasificatorio. Esto lo
 * avisa; no bloquea nada, porque a veces el organizador sabe algo que el
 * sistema no.
 */
function ValidacionCalendario({ data }: { data: any }) {
  const [abierto, setAbierto] = useState(true)
  if (!data) return null
  if (data.ok)
    return (
      <div className="flex items-center gap-2 rounded-lg border border-secondary/40 bg-secondary/10 px-3 py-2 text-sm text-secondary">
        <Icon name="event_available" className="text-base" />
        Calendario sin cruces: ninguna cancha repetida, ningún equipo ni árbitro
        con dos partidos a la vez.
      </div>
    )
  const errores = data.errors || 0
  const avisos = data.warnings || 0
  return (
    <div
      className={`rounded-lg border ${
        errores ? 'border-error/40 bg-error-container/15' : 'border-tertiary/40 bg-tertiary/10'
      }`}
    >
      <button
        onClick={() => setAbierto((v) => !v)}
        className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm font-semibold"
      >
        <Icon
          name={errores ? 'error' : 'warning'}
          className={`text-base ${errores ? 'text-error' : 'text-tertiary'}`}
        />
        <span className={errores ? 'text-error' : 'text-tertiary'}>
          {errores > 0 && `${errores} cruce(s) que impiden jugar`}
          {errores > 0 && avisos > 0 && ' · '}
          {avisos > 0 && `${avisos} aviso(s)`}
        </span>
        <Icon name={abierto ? 'expand_less' : 'expand_more'} className="ml-auto text-base" />
      </button>
      {abierto && (
        <ul className="space-y-1.5 px-3 pb-3">
          {data.conflicts.map((c: any, i: number) => (
            <li key={i} className="flex gap-2 rounded-lg bg-surface-container-low px-3 py-2">
              <Icon
                name={CONFLICTO_ICONO[c.type] || 'help'}
                className={`mt-0.5 text-base ${
                  c.severity === 'error' ? 'text-error' : 'text-tertiary'
                }`}
              />
              <div className="min-w-0">
                <p className="text-sm font-semibold">{c.title}</p>
                <p className="text-xs text-on-surface-variant">{c.detail}</p>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

function CalendarioTab({ tournament }: { tournament: any }) {
  const [stages, setStages] = useState<any[]>([])
  const [active, setActive] = useState<any>(null)
  const [matches, setMatches] = useState<any[]>([])
  const [courts, setCourts] = useState<any[]>([])
  const [start, setStart] = useState('')
  const [maxPerDay, setMaxPerDay] = useState('')
  const [dows, setDows] = useState<number[]>([])
  const [interval, setIntervalDays] = useState('')
  const [parallel, setParallel] = useState(false)
  const [refs, setRefs] = useState<any[]>([])
  const [msg, setMsg] = useState<string | null>(null)
  // Cruces del calendario; se revisa al entrar y despues de cada cambio.
  const [validacion, setValidacion] = useState<any>(null)
  // Equipos del torneo (escudo y colores para el acta) y acta en curso.
  const [equipos, setEquipos] = useState<Record<string, any>>({})
  const [acta, setActa] = useState<string | null>(null)

  async function revisar() {
    setValidacion(await api.scheduleConflicts(tournament.id).catch(() => null))
  }

  useEffect(() => {
    revisar()
    api.getStages(tournament.id).then(setStages)
    api.getVenues().then((vs: any[]) =>
      setCourts(vs.flatMap((v) => (v.courts || []).map((c: any) => ({ ...c, venue: v.name })))),
    )
    api
      .listReferees()
      .then(setRefs)
      .catch(() => setRefs([]))
    api
      .getTeams(tournament.id)
      .then((ts: any[]) => setEquipos(Object.fromEntries(ts.map((x) => [String(x.id), x]))))
      .catch(() => setEquipos({}))
  }, [tournament.id])

  async function pick(s: any) {
    setActive(s)
    setMatches(await api.stageMatches(s.id))
    revisar()
  }
  async function autoSchedule() {
    try {
      const r = await api.scheduleCalendar(tournament.id, {
        start: start || undefined,
        match_duration: tournament.match_duration,
        waiting_time: tournament.waiting_time,
        max_matches_per_day: maxPerDay ? Number(maxPerDay) : undefined,
        days_of_week: dows.length ? dows : undefined,
        days_interval: interval ? Number(interval) : undefined,
        parallel_courts: parallel,
      })
      setMsg(r.message)
      if (active) pick(active)
      else revisar()
    } catch (e: any) {
      setMsg(e.message)
    }
  }
  async function surpriseDraw() {
    if (
      !confirm(
        '🎲 Sorteo sorpresa: se re-sortean los grupos al azar y se regenera el fixture y el calendario (con descanso). No funciona si hay partidos en vivo o finalizados. ¿Continuar?',
      )
    )
      return
    setMsg('Sorteando…')
    try {
      const teams = await api.getTeams(tournament.id)
      const groups = new Set(teams.map((t: any) => t.group_name).filter(Boolean))
      const numGroups = Math.max(2, groups.size || 2)
      await api.shuffleGroups(tournament.id, numGroups)
      const st = await api.getStages(tournament.id)
      let fix = ''
      for (const s of st) {
        if (s.type === 'group') {
          const r = await api.generateFixture(s.id)
          fix = r.message
        }
      }
      const cal = await api.scheduleCalendar(tournament.id, {
        start: start || undefined,
        match_duration: tournament.match_duration,
        waiting_time: tournament.waiting_time,
        max_matches_per_day: maxPerDay ? Number(maxPerDay) : undefined,
        days_of_week: dows.length ? dows : undefined,
        days_interval: interval ? Number(interval) : undefined,
        parallel_courts: parallel,
      })
      setStages(st)
      setMsg(`🎲 Sorteo listo · ${numGroups} grupos · ${fix} · ${cal.message}`)
      if (active) pick(active)
      else revisar()
    } catch (e: any) {
      setMsg(e.message)
    }
  }
  async function descargarActa(m: any) {
    setActa(m.id)
    setMsg(null)
    try {
      const [eventos, planilla, local, visita] = await Promise.all([
        api.matchEvents(m.id),
        api.matchLineup(m.id).catch(() => []),
        m.home_team_id ? api.getPlayers(m.home_team_id) : Promise.resolve([]),
        m.away_team_id ? api.getPlayers(m.away_team_id) : Promise.resolve([]),
      ])
      const nombre = (id: string | null) =>
        [...local, ...visita].find((p: any) => p.id === id)?.name || ''
      // La planilla (quiénes jugaron) es lo que imprime el acta; sin ella se
      // sigue imprimiendo la nómina completa del equipo.
      const alineados = (jugadores: any[], teamId: any) =>
        jugadores
          .map((p: any) => {
            const fila = (planilla || []).find(
              (f: any) =>
                String(f.player_id) === String(p.id) && String(f.team_id) === String(teamId),
            )
            return fila
              ? { ...p, is_starter: fila.is_starter, is_captain: fila.is_captain }
              : null
          })
          .filter(Boolean)
      await exportMatchReportPDF(m, eventos, nombre, {
        tournament,
        tournamentName: tournament.name,
        homePlayers: local,
        awayPlayers: visita,
        homeLineup: alineados(local, m.home_team_id),
        awayLineup: alineados(visita, m.away_team_id),
        homeTeam: equipos[String(m.home_team_id)],
        awayTeam: equipos[String(m.away_team_id)],
        refereeName: m.referee_name,
      })
    } catch (e: any) {
      setMsg(e?.message || 'No se pudo generar el acta')
    } finally {
      setActa(null)
    }
  }
  async function patch(m: any, field: string, value: any) {
    await api.updateMatchSchedule(m.id, { [field]: value || null })
    if (active) pick(active)
    else revisar()
  }

  /** Aplaza un partido o lo devuelve al calendario. Un aplazado no cuenta para
   *  la tabla ni entra en la validación: se juega cuando haya fecha nueva
   *  (ponerle una lo reactiva solo). */
  async function alternarAplazado(m: any) {
    try {
      await api.updateMatchStatus(m.id, {
        status: m.status === 'postponed' ? 'scheduled' : 'postponed',
      })
      if (active) pick(active)
      else revisar()
    } catch (e: any) {
      setMsg(e?.message || 'No se pudo cambiar el estado del partido')
    }
  }

  // Partidos señalados por el validador, para marcar la fila y explicar por qué.
  const marcados: Record<string, { severity: string; titles: string[] }> = {}
  for (const c of validacion?.conflicts || []) {
    // "Sin fecha" abarca todos los partidos por programar: marcar cada fila
    // seria ruido, y el campo de fecha vacio ya lo dice.
    if (c.type === 'sin_fecha') continue
    for (const id of c.match_ids || []) {
      const previo = marcados[id]
      marcados[id] = {
        severity: previo?.severity === 'error' ? 'error' : c.severity,
        titles: [...(previo?.titles || []), c.title],
      }
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end gap-2 rounded-lg bg-surface-container-high p-3">
        <div>
          <label className="mb-1 block text-xs text-on-surface-variant">Inicio (auto-programación)</label>
          <input
            type="datetime-local"
            value={start}
            onChange={(e) => setStart(e.target.value)}
            className="rounded-lg border border-outline-variant bg-surface-container-low px-3 py-2 text-on-surface"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs text-on-surface-variant">Máx/día</label>
          <input
            type="number"
            min={0}
            value={maxPerDay}
            onChange={(e) => setMaxPerDay(e.target.value)}
            placeholder="—"
            className="w-20 rounded-lg border border-outline-variant bg-surface-container-low px-2 py-2 text-center text-on-surface"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs text-on-surface-variant">Días de la semana</label>
          <div className="flex gap-1">
            {['Lu', 'Ma', 'Mi', 'Ju', 'Vi', 'Sá', 'Do'].map((d, i) => (
              <button
                key={i}
                type="button"
                onClick={() => setDows(dows.includes(i) ? dows.filter((x) => x !== i) : [...dows, i])}
                className={`h-9 w-9 rounded-lg text-xs font-semibold transition ${
                  dows.includes(i) ? 'bg-secondary text-on-secondary' : 'bg-surface-container-low text-on-surface-variant'
                }`}
              >
                {d}
              </button>
            ))}
          </div>
        </div>
        <div>
          <label className="mb-1 block text-xs text-on-surface-variant">o cada (días)</label>
          <input
            type="number"
            min={1}
            value={interval}
            onChange={(e) => setIntervalDays(e.target.value)}
            placeholder="—"
            className="w-20 rounded-lg border border-outline-variant bg-surface-container-low px-2 py-2 text-center text-on-surface"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs text-on-surface-variant">Canchas</label>
          <select
            value={parallel ? '1' : '0'}
            onChange={(e) => setParallel(e.target.value === '1')}
            className="rounded-lg border border-outline-variant bg-surface-container-low px-3 py-2 text-on-surface"
          >
            <option value="0">1 a la vez (en secuencia)</option>
            <option value="1">Varias en paralelo</option>
          </select>
        </div>
        <Button variant="outline" onClick={autoSchedule}>
          <Icon name="schedule" /> Programar partidos
        </Button>
        <Button onClick={surpriseDraw} title="Re-sortea grupos y regenera fixture + calendario con descanso">
          <Icon name="casino" /> Sorteo sorpresa
        </Button>
        {msg && <span className="text-sm text-secondary">{msg}</span>}
      </div>

      <ValidacionCalendario data={validacion} />

      <div className="flex flex-wrap gap-2">
        {stages.map((s) => (
          <Button key={s.id} variant={active?.id === s.id ? 'primary' : 'ghost'} onClick={() => pick(s)}>
            {s.name}
          </Button>
        ))}
      </div>

      {!active ? (
        <EmptyState icon="calendar_month" title="Elige una fase para ver/editar fechas" />
      ) : matches.length === 0 ? (
        <EmptyState icon="event_busy" title="Sin partidos" hint="Genera el fixture primero." />
      ) : (
        <ul className="space-y-2">
          {matches.map((m) => (
            <li
              key={m.id}
              className={`flex flex-wrap items-center gap-2 rounded-lg bg-surface-container-high px-3 py-2 text-sm ${
                marcados[m.id]
                  ? marcados[m.id].severity === 'error'
                    ? 'border-l-4 border-error'
                    : 'border-l-4 border-tertiary'
                  : ''
              }`}
            >
              <span className="min-w-[160px] flex-1 truncate">
                {marcados[m.id] && (
                  <Icon
                    name={marcados[m.id].severity === 'error' ? 'error' : 'warning'}
                    className={`mr-1 align-middle text-base ${
                      marcados[m.id].severity === 'error' ? 'text-error' : 'text-tertiary'
                    }`}
                    title={marcados[m.id].titles.join(' · ')}
                  />
                )}
                {m.home_team_name || 'Por definir'} <span className="text-on-surface-variant">vs</span> {m.away_team_name || 'Por definir'}
              </span>
              {m.group_name && (
                <span className="rounded bg-secondary/15 px-2 py-0.5 text-xs font-medium text-secondary">
                  Grupo {m.group_name}
                </span>
              )}
              {(m.status === 'postponed' || m.walkover) && (
                <span
                  title={
                    m.walkover
                      ? woDetalle(m.walkover, m.home_team_name, m.away_team_name) || ''
                      : 'No se juega en su fecha; ponle una nueva y vuelve al calendario'
                  }
                  className="rounded bg-tertiary/15 px-2 py-0.5 text-xs font-medium text-tertiary"
                >
                  {m.walkover ? woLabel(m.walkover) : ESTADO_LABEL.postponed}
                </span>
              )}
              <input
                type="datetime-local"
                value={m.scheduled_start ? String(m.scheduled_start).slice(0, 16) : ''}
                onChange={(e) => patch(m, 'scheduled_start', e.target.value)}
                className="rounded border border-outline-variant bg-surface-container-low px-2 py-1 text-on-surface"
              />
              <select
                value={m.court_id || ''}
                onChange={(e) => patch(m, 'court_id', e.target.value)}
                className="rounded border border-outline-variant bg-surface-container-low px-2 py-1 text-on-surface"
              >
                <option value="">Cancha…</option>
                {courts.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.venue} · {c.name}
                  </option>
                ))}
              </select>
              <select
                value={m.referee_id || ''}
                onChange={(e) => patch(m, 'referee_id', e.target.value)}
                className="rounded border border-outline-variant bg-surface-container-low px-2 py-1 text-on-surface"
                title="Árbitro asignado"
              >
                <option value="">Árbitro…</option>
                {refs.map((r) => (
                  <option key={r.id} value={r.id}>
                    {(r.email || '').split('@')[0]}
                  </option>
                ))}
              </select>
              <button
                onClick={() => alternarAplazado(m)}
                title={
                  m.status === 'postponed'
                    ? 'Devolver al calendario'
                    : 'Aplazar (no se juega en su fecha ni cuenta para la tabla)'
                }
                className={`rounded-lg border border-outline-variant px-2 py-1.5 transition hover:border-tertiary/60 ${
                  m.status === 'postponed'
                    ? 'text-tertiary'
                    : 'text-on-surface-variant hover:text-tertiary'
                }`}
              >
                <Icon
                  name={m.status === 'postponed' ? 'event_available' : 'event_busy'}
                  className="align-middle text-base"
                />
              </button>
              <button
                onClick={() => descargarActa(m)}
                disabled={acta === m.id}
                title="Descargar el acta del partido en PDF"
                className="rounded-lg border border-outline-variant px-2 py-1.5 text-on-surface-variant transition hover:border-secondary/60 hover:text-secondary disabled:opacity-50"
              >
                <Icon
                  name={acta === m.id ? 'hourglass_top' : 'picture_as_pdf'}
                  className="align-middle text-base"
                />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

// Icono y color de cada tipo de cambio del historial.
const ACCION_ESTILO: Record<string, { icon: string; tone: string }> = {
  marcador: { icon: 'scoreboard', tone: 'text-secondary' },
  evento: { icon: 'bolt', tone: 'text-tertiary' },
  planilla: { icon: 'assignment_ind', tone: 'text-primary' },
  programacion: { icon: 'event_repeat', tone: 'text-primary' },
  sancion: { icon: 'gavel', tone: 'text-error' },
  cuenta: { icon: 'manage_accounts', tone: 'text-on-surface-variant' },
  torneo: { icon: 'delete_forever', tone: 'text-error' },
}

// Cómo se nombra cada campo en el detalle de un cambio.
const CAMPO_HISTORIAL: Record<string, string> = {
  local: 'Goles del local',
  visitante: 'Goles del visitante',
  estado: 'Estado',
  walkover: 'W.O.',
  fecha: 'Fecha',
  cancha: 'Cancha',
  arbitro: 'Árbitro',
  antes: 'Antes',
  despues: 'Después',
  motivo: 'Motivo',
  jugadores: 'Jugadores',
  rol: 'Rol',
  cupo: 'Cupo',
  email: 'Correo',
}

/** Las fechas del backend son UTC sin sufijo; sin la Z el navegador las lee
 *  como hora local y el historial mostraría horas que nunca pasaron. */
function fechaHistorial(iso?: string | null): string {
  if (!iso) return ''
  const d = new Date(/[Zz]|[+-]\d{2}:?\d{2}$/.test(iso) ? iso : `${iso}Z`)
  return d.toLocaleString(undefined, {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

// Lo que se guarda es el valor crudo (es el registro), pero lo que se lee tiene
// que estar en el mismo idioma que el resumen de arriba.
const VALOR_HISTORIAL: Record<string, Record<string, string>> = {
  estado: ESTADO_LABEL,
  walkover: {
    home: 'no llegó el local',
    away: 'no llegó el visitante',
    both: 'no llegó ninguno',
  },
}

function valorLegible(campo: string, v: any): string {
  if (v === null || v === undefined || v === '') return '—'
  if (typeof v === 'boolean') return v ? 'sí' : 'no'
  const traducido = VALOR_HISTORIAL[campo]?.[String(v)]
  if (traducido) return traducido
  if (campo === 'fecha') return fechaHistorial(String(v))
  return String(v)
}

/** El detalle de un cambio: lo que decía antes y lo que dice ahora. Es la
 *  mitad que hace útil el historial —sin el valor anterior no se puede
 *  deshacer— así que se muestra tal cual quedó guardado. */
function DetalleCambio({ data }: { data: any }) {
  const filas = Object.entries(data || {})
  if (!filas.length) return null
  return (
    <div className="mt-2 space-y-1 border-t border-outline-variant/30 pt-2 text-xs">
      {filas.map(([campo, valor]: [string, any]) => {
        const esCambio = valor && typeof valor === 'object' && 'despues' in valor
        return (
          <div key={campo} className="flex flex-wrap items-center gap-x-2">
            <span className="text-on-surface-variant">
              {CAMPO_HISTORIAL[campo] || campo}:
            </span>
            {esCambio ? (
              <>
                <span className="rounded bg-error-container/40 px-1.5 py-0.5 text-on-error-container line-through">
                  {valorLegible(campo, valor.antes)}
                </span>
                <Icon name="arrow_forward" className="text-sm text-on-surface-variant" />
                <span className="rounded bg-secondary/15 px-1.5 py-0.5 font-semibold text-secondary">
                  {valorLegible(campo, valor.despues)}
                </span>
              </>
            ) : (
              <span className="font-medium">{valorLegible(campo, valor)}</span>
            )}
          </div>
        )
      })}
    </div>
  )
}

// El historial del campeonato: quién cambió qué y qué decía antes. Existe por
// una discusión concreta —«alguien me cambió un resultado»— que hasta ahora no
// tenía respuesta, porque el marcador es una columna que se sobrescribe.
function HistorialTab({ tournament }: { tournament: any }) {
  const [filas, setFilas] = useState<any[]>([])
  const [accion, setAccion] = useState<string | null>(null)
  const [cargando, setCargando] = useState(true)
  const [abierta, setAbierta] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let vivo = true
    setCargando(true)
    api
      .tournamentAudit(tournament.id, { action: accion })
      .then((r: any[]) => vivo && setFilas(r))
      .catch((e: any) => vivo && setError(e.message))
      .finally(() => vivo && setCargando(false))
    return () => {
      vivo = false
    }
  }, [tournament.id, accion])

  // Los filtros salen de lo que hay: un campeonato sin sanciones no muestra
  // un filtro de sanciones vacío.
  const tipos = Array.from(
    new Map(filas.map((f) => [f.action, f.action_label || f.action])).entries(),
  )

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <h3 className="font-display font-semibold">Historial del campeonato</h3>
        <span className="text-xs text-on-surface-variant">
          Quién cambió qué y qué decía antes. Lo ves tú, no el árbitro ni el público.
        </span>
      </div>

      {(accion || tipos.length > 1) && (
        <div className="flex flex-wrap gap-1.5">
          <button
            onClick={() => setAccion(null)}
            className={`rounded-full px-3 py-1 text-xs font-semibold transition ${
              accion === null
                ? 'bg-secondary text-on-secondary'
                : 'bg-surface-container-high text-on-surface-variant hover:bg-surface-bright'
            }`}
          >
            Todo
          </button>
          {tipos.map(([valor, etiqueta]) => (
            <button
              key={valor}
              onClick={() => setAccion(valor)}
              className={`rounded-full px-3 py-1 text-xs font-semibold transition ${
                accion === valor
                  ? 'bg-secondary text-on-secondary'
                  : 'bg-surface-container-high text-on-surface-variant hover:bg-surface-bright'
              }`}
            >
              {etiqueta}
            </button>
          ))}
        </div>
      )}

      {error && <p className="text-sm text-error">{error}</p>}
      {cargando ? (
        <div className="grid place-items-center py-10">
          <Spinner className="h-6 w-6" />
        </div>
      ) : filas.length === 0 ? (
        <EmptyState
          icon="history"
          title="Todavía no hay movimientos"
          hint="Aquí van quedando los marcadores, los eventos, las sanciones y las reprogramaciones."
        />
      ) : (
        <ul className="space-y-1.5">
          {filas.map((f) => {
            const estilo = ACCION_ESTILO[f.action] || {
              icon: 'history',
              tone: 'text-on-surface-variant',
            }
            const abierto = abierta === f.id
            const tieneDetalle = Object.keys(f.data || {}).length > 0
            return (
              <li key={f.id} className="rounded-lg bg-surface-container-high px-3 py-2">
                <button
                  onClick={() => setAbierta(abierto ? null : f.id)}
                  className="flex w-full items-start gap-2 text-left"
                  disabled={!tieneDetalle}
                >
                  <Icon name={estilo.icon} className={`mt-0.5 text-base ${estilo.tone}`} />
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm">{f.summary}</span>
                    <span className="mt-0.5 flex flex-wrap items-center gap-x-2 text-xs text-on-surface-variant">
                      <span>{fechaHistorial(f.created_at)}</span>
                      <span>·</span>
                      <span className="font-medium">{f.user_email || 'sistema'}</span>
                    </span>
                  </span>
                  {tieneDetalle && (
                    <Icon
                      name={abierto ? 'expand_less' : 'expand_more'}
                      className="text-base text-on-surface-variant"
                    />
                  )}
                </button>
                {abierto && <DetalleCambio data={f.data} />}
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}

function MarcaTab({ tournament }: { tournament: any }) {
  const [logo, setLogo] = useState(tournament.logo_url || '')
  const [banner, setBanner] = useState(tournament.banner_url || '')
  const [sponsors, setSponsors] = useState<any[]>([])
  const [photos, setPhotos] = useState<any[]>([])
  const [sp, setSp] = useState({ name: '', logo_url: '', website_url: '' })
  const [ph, setPh] = useState({ url: '', caption: '' })
  const [msg, setMsg] = useState<string | null>(null)
  async function load() {
    setSponsors(await api.getSponsors(tournament.id))
    setPhotos(await api.getPhotos(tournament.id))
  }
  useEffect(() => {
    load()
  }, [tournament.id])
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h3 className="font-display font-semibold">Branding</h3>
        <label className="block text-xs text-on-surface-variant">URL del logo</label>
        <div className="flex gap-2">
          <Input value={logo} onChange={(e) => setLogo(e.target.value)} placeholder="https://…" />
          <Button variant="outline" onClick={async () => { await api.updateLogo(tournament.id, logo); setMsg('Logo actualizado') }}>
            Guardar
          </Button>
        </div>
        <label className="block text-xs text-on-surface-variant">URL del banner</label>
        <div className="flex gap-2">
          <Input value={banner} onChange={(e) => setBanner(e.target.value)} placeholder="https://…" />
          <Button variant="outline" onClick={async () => { await api.updateBanner(tournament.id, banner); setMsg('Banner actualizado') }}>
            Guardar
          </Button>
        </div>
      </div>

      <div className="space-y-2">
        <h3 className="font-display font-semibold">Patrocinadores</h3>
        <form
          onSubmit={async (e) => {
            e.preventDefault()
            if (!sp.name.trim()) return
            await api.createSponsor(tournament.id, sp)
            setSp({ name: '', logo_url: '', website_url: '' })
            load()
          }}
          className="flex flex-wrap gap-2"
        >
          <Input placeholder="Nombre" value={sp.name} onChange={(e) => setSp({ ...sp, name: e.target.value })} className="flex-1" />
          <Input placeholder="Logo URL" value={sp.logo_url} onChange={(e) => setSp({ ...sp, logo_url: e.target.value })} className="flex-1" />
          <Button type="submit" variant="outline">
            <Icon name="add" />
          </Button>
        </form>
        <ul className="space-y-1">
          {sponsors.map((s) => (
            <li key={s.id} className="flex items-center justify-between rounded bg-surface-container-high px-3 py-1.5 text-sm">
              {s.name}
              <button onClick={async () => { await api.deleteSponsor(tournament.id, s.id); load() }} className="text-error/80 hover:text-error">
                <Icon name="close" className="text-base" />
              </button>
            </li>
          ))}
        </ul>
      </div>

      <div className="space-y-2">
        <h3 className="font-display font-semibold">Galería de fotos</h3>
        <form
          onSubmit={async (e) => {
            e.preventDefault()
            if (!ph.url.trim()) return
            await api.addPhoto(tournament.id, ph)
            setPh({ url: '', caption: '' })
            load()
          }}
          className="flex flex-wrap gap-2"
        >
          <Input placeholder="URL imagen" value={ph.url} onChange={(e) => setPh({ ...ph, url: e.target.value })} className="flex-1" />
          <Input placeholder="Pie de foto" value={ph.caption} onChange={(e) => setPh({ ...ph, caption: e.target.value })} className="flex-1" />
          <Button type="submit" variant="outline">
            <Icon name="add" />
          </Button>
        </form>
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
          {photos.map((p) => (
            <div key={p.id} className="group relative">
              <img src={p.url} alt={p.caption || ''} className="h-24 w-full rounded-lg object-cover" />
              <button
                onClick={async () => { await api.deletePhoto(tournament.id, p.id); load() }}
                className="absolute right-1 top-1 rounded-full bg-surface/80 p-0.5 text-error opacity-0 group-hover:opacity-100"
              >
                <Icon name="close" className="text-base" />
              </button>
            </div>
          ))}
        </div>
      </div>
      {msg && <p className="text-sm text-secondary">{msg}</p>}
    </div>
  )
}
