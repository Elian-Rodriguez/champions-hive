import { useEffect, useMemo, useState } from 'react'
import { api } from '../services/api'
import { Badge, Card, EmptyState, Icon, LiveChip, Spinner } from './ui'
import { sportOf } from '../sports'
import { estadoLabel, woDetalle, woLabel } from '../utils/partido'

/**
 * Panel del capitán: solo lo que le afecta a su equipo.
 *
 * No administra nada — el backend ni siquiera le responde los endpoints de
 * gestión. Aquí ve cuándo y dónde juega, cómo va en la tabla, cómo van sus
 * jugadores y los avisos de reprogramación (la campana vive en el Layout).
 */

const DIAS = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado']
const MESES = [
  'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
  'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre',
]

/** Las fechas llegan en UTC sin sufijo; se normalizan antes de mostrarlas. */
function comoFecha(iso?: string | null): Date | null {
  if (!iso) return null
  const d = new Date(iso.endsWith('Z') ? iso : `${iso}Z`)
  return isNaN(d.getTime()) ? null : d
}

function fechaLarga(iso?: string | null): string {
  const d = comoFecha(iso)
  if (!d) return 'Sin fecha asignada'
  return `${DIAS[d.getDay()]} ${d.getDate()} de ${MESES[d.getMonth()]} · ${String(
    d.getHours(),
  ).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

function fechaCorta(iso?: string | null): string {
  const d = comoFecha(iso)
  if (!d) return 'Sin fecha'
  return `${d.getDate()}/${d.getMonth() + 1} ${String(d.getHours()).padStart(2, '0')}:${String(
    d.getMinutes(),
  ).padStart(2, '0')}`
}

function cuentaRegresiva(iso?: string | null): string | null {
  const d = comoFecha(iso)
  if (!d) return null
  const min = Math.round((d.getTime() - Date.now()) / 60000)
  if (min < 0) return null
  if (min < 60) return `en ${min} min`
  if (min < 1440) return `en ${Math.round(min / 60)} h`
  return `en ${Math.round(min / 1440)} día(s)`
}

function Lugar({ m }: { m: any }) {
  if (!m.court_name) return <span className="text-on-surface-variant">Cancha por definir</span>
  return (
    <span className="flex items-center gap-1 text-on-surface-variant">
      <Icon name="stadium" className="text-base" />
      {m.venue_name ? `${m.venue_name} · ${m.court_name}` : m.court_name}
    </span>
  )
}

function FormaChip({ r }: { r: string }) {
  const color =
    r === 'G'
      ? 'bg-secondary text-on-secondary'
      : r === 'E'
        ? 'bg-surface-container-high text-on-surface'
        : 'bg-error-container text-on-error-container'
  return (
    <span className={`grid h-6 w-6 place-items-center rounded-md text-xs font-bold ${color}`}>
      {r}
    </span>
  )
}

function ProximoPartido({ m }: { m: any }) {
  const falta = cuentaRegresiva(m.scheduled_start)
  return (
    <Card accent="green" className="p-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.14em] text-secondary">
          <Icon name="event_upcoming" className="text-base" /> Próximo partido
        </span>
        {falta && <Badge className="bg-secondary/15 text-secondary">{falta}</Badge>}
      </div>
      <p className="mt-3 font-display text-2xl font-bold leading-tight">
        {m.is_home ? m.team_name : m.rival_name}
        <span className="mx-2 text-on-surface-variant">vs</span>
        {m.is_home ? m.rival_name : m.team_name}
      </p>
      <div className="mt-3 grid gap-1.5 text-sm">
        <span className="flex items-center gap-1 text-on-surface-variant">
          <Icon name="schedule" className="text-base" /> {fechaLarga(m.scheduled_start)}
        </span>
        <Lugar m={m} />
        <span className="flex items-center gap-1 text-on-surface-variant">
          <Icon name="emoji_events" className="text-base" /> {m.tournament_name} · {m.stage_name}
        </span>
        <span className="flex items-center gap-1 text-on-surface-variant">
          <Icon name={m.is_home ? 'home' : 'flight'} className="text-base" />
          {m.is_home ? 'Juegas de local' : 'Juegas de visitante'}
        </span>
      </div>
    </Card>
  )
}

function FilaPartido({ m, jugado }: { m: any; jugado?: boolean }) {
  const gano = (m.my_score ?? 0) > (m.rival_score ?? 0)
  const empate = (m.my_score ?? 0) === (m.rival_score ?? 0)
  return (
    <li className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
      <div className="min-w-0">
        <p className="flex items-center gap-2 font-semibold">
          {m.rival_logo_url ? (
            <img src={m.rival_logo_url} alt="" className="h-6 w-6 rounded-full object-cover" />
          ) : (
            <span className="grid h-6 w-6 place-items-center rounded-full bg-surface-container-high text-[11px] font-bold">
              {(m.rival_name || '?').charAt(0)}
            </span>
          )}
          <span className="truncate">
            {m.is_home ? 'vs' : '@'} {m.rival_name}
          </span>
          {m.status === 'live' && <LiveChip />}
        </p>
        <p className="mt-0.5 flex flex-wrap items-center gap-3 text-xs text-on-surface-variant">
          <span>{fechaCorta(m.scheduled_start)}</span>
          {m.court_name && (
            <span>{m.venue_name ? `${m.venue_name} · ${m.court_name}` : m.court_name}</span>
          )}
          <span>{m.stage_name}</span>
        </p>
      </div>
      {jugado ? (
        <span className="flex items-center gap-1.5">
          {m.walkover && (
            <Badge
              className="bg-tertiary/15 text-tertiary"
              title={woDetalle(m.walkover, m.is_home ? m.team_name : m.rival_name, m.is_home ? m.rival_name : m.team_name) || ''}
            >
              {woLabel(m.walkover)}
            </Badge>
          )}
          <span
            className={`rounded-lg px-3 py-1 font-display text-lg font-bold ${
              empate
                ? 'bg-surface-container-high'
                : gano
                  ? 'bg-secondary/15 text-secondary'
                  : 'bg-error-container/40 text-error'
            }`}
          >
            {m.my_score ?? 0} - {m.rival_score ?? 0}
          </span>
        </span>
      ) : (
        <Badge
          className={
            m.status === 'postponed'
              ? 'bg-tertiary/15 text-tertiary'
              : 'bg-surface-container-high text-on-surface-variant'
          }
        >
          {m.status === 'live' ? 'En juego' : estadoLabel(m.status)}
        </Badge>
      )}
    </li>
  )
}

export default function CaptainView() {
  const [teams, setTeams] = useState<any[]>([])
  const [sel, setSel] = useState<any>(null)
  const [castigados, setCastigados] = useState<any[]>([])
  const [agenda, setAgenda] = useState<any>({ upcoming: [], played: [], live: [] })
  const [resumen, setResumen] = useState<any>(null)
  const [tab, setTab] = useState<'agenda' | 'equipo'>('agenda')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    api
      .captainTeams()
      .then((t) => {
        setTeams(t)
        setSel(t[0] || null)
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    if (!sel) return
    api.captainMatches(sel.team_id).then(setAgenda).catch(() => {})
    api
      .captainSummary(sel.team_id, sel.tournament_id)
      .then(setResumen)
      .catch(() => setResumen(null))
    // Suspendidos del campeonato, filtrados a los de mi equipo. Solo trae algo
    // si el organizador encendió el reglamento disciplinario.
    api
      .tournamentDiscipline(sel.tournament_id)
      .then((d: any) =>
        setCastigados(
          (d?.sanctions || []).filter(
            (s: any) => String(s.team_id) === String(sel.team_id),
          ),
        ),
      )
      .catch(() => setCastigados([]))
  }, [sel])

  const deporte = useMemo(() => sportOf(sel?.sport_type), [sel])
  const proximo = agenda.live?.[0] || agenda.upcoming?.[0] || null

  if (loading)
    return (
      <div className="grid place-items-center py-24">
        <Spinner />
      </div>
    )

  if (error)
    return <EmptyState icon="error" title="No se pudo cargar tu equipo" hint={error} />

  if (!teams.length)
    return (
      <EmptyState
        icon="groups"
        title="Todavía no tienes un equipo asignado"
        hint="Pídele al organizador del campeonato que registre tu correo como capitán de tu equipo. Cuando lo haga, aquí verás tu calendario, tu posición y los avisos de cambios."
      />
    )

  const record = resumen?.record

  return (
    <div className="space-y-5">
      {/* Cabecera con el equipo (selector si dirige más de uno) */}
      <Card className="flex flex-wrap items-center justify-between gap-4 p-4">
        <div className="flex items-center gap-3">
          {sel?.logo_url ? (
            <img src={sel.logo_url} alt="" className="h-12 w-12 rounded-xl object-cover" />
          ) : (
            <span className="grid h-12 w-12 place-items-center rounded-xl bg-secondary/15 font-display text-xl font-bold text-secondary">
              {(sel?.team_name || '?').charAt(0)}
            </span>
          )}
          <div>
            <p className="font-display text-xl font-bold leading-tight">{sel?.team_name}</p>
            <p className="flex flex-wrap items-center gap-2 text-sm text-on-surface-variant">
              <Icon name={deporte.icon} className="text-base" />
              {sel?.tournament_name}
              {sel?.group_name && (
                <Badge className="bg-primary-container text-on-primary-container">
                  Grupo {sel.group_name}
                </Badge>
              )}
            </p>
          </div>
        </div>
        {teams.length > 1 && (
          <div className="flex flex-wrap gap-2">
            {teams.map((t) => (
              <button
                key={`${t.team_id}-${t.tournament_id}`}
                onClick={() => setSel(t)}
                className={`rounded-lg px-3 py-1.5 text-sm font-semibold transition ${
                  sel?.team_id === t.team_id && sel?.tournament_id === t.tournament_id
                    ? 'bg-secondary text-on-secondary'
                    : 'bg-surface-container-high hover:bg-surface-bright'
                }`}
              >
                {t.team_name}
                <span className="ml-1 opacity-70">· {t.tournament_name}</span>
              </button>
            ))}
          </div>
        )}
      </Card>

      {proximo && <ProximoPartido m={proximo} />}

      <nav className="flex flex-wrap gap-2">
        {(
          [
            { key: 'agenda', label: 'Calendario', icon: 'calendar_month' },
            { key: 'equipo', label: 'Mi equipo', icon: 'insights' },
          ] as const
        ).map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm font-semibold transition ${
              tab === t.key
                ? 'bg-secondary text-on-secondary'
                : 'bg-surface-container-high hover:bg-surface-bright'
            }`}
          >
            <Icon name={t.icon} className="text-base" /> {t.label}
          </button>
        ))}
      </nav>

      {tab === 'agenda' ? (
        <div className="grid gap-5 lg:grid-cols-2">
          <Card className="p-2">
            <h3 className="px-3 py-2 font-display font-semibold">Próximos partidos</h3>
            {agenda.upcoming?.length ? (
              <ul className="divide-y divide-outline-variant/25">
                {agenda.upcoming.map((m: any) => (
                  <FilaPartido key={m.match_id} m={m} />
                ))}
              </ul>
            ) : (
              <EmptyState icon="event_busy" title="Sin partidos programados" />
            )}
          </Card>
          <Card className="p-2">
            <h3 className="px-3 py-2 font-display font-semibold">Partidos jugados</h3>
            {agenda.played?.length ? (
              <ul className="divide-y divide-outline-variant/25">
                {agenda.played.map((m: any) => (
                  <FilaPartido key={m.match_id} m={m} jugado />
                ))}
              </ul>
            ) : (
              <EmptyState icon="sports_score" title="Todavía no juegan" />
            )}
          </Card>
        </div>
      ) : (
        <div className="space-y-5">
          {record && (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-7">
              {[
                { label: 'PJ', value: record.played },
                { label: 'PG', value: record.wins },
                { label: 'PE', value: record.draws },
                { label: 'PP', value: record.losses },
                { label: deporte.scoreLabel === 'Puntos' ? 'PF' : 'GF', value: record.goals_for },
                { label: deporte.scoreLabel === 'Puntos' ? 'PC' : 'GC', value: record.goals_against },
                { label: 'DIF', value: record.goal_diff },
              ].map((s) => (
                <Card key={s.label} className="p-3 text-center">
                  <p className="font-display text-2xl font-bold">{s.value}</p>
                  <p className="text-xs text-on-surface-variant">{s.label}</p>
                </Card>
              ))}
            </div>
          )}

          {!!record?.form?.length && (
            <Card className="flex items-center gap-3 p-4">
              <span className="text-sm text-on-surface-variant">Últimos partidos</span>
              <span className="flex gap-1.5">
                {record.form.map((r: string, i: number) => (
                  <FormaChip key={i} r={r} />
                ))}
              </span>
            </Card>
          )}

          {!!resumen?.standings?.length && (
            <Card className="p-4">
              <h3 className="mb-3 font-display font-semibold">Posición por fase</h3>
              <ul className="space-y-2">
                {resumen.standings.map((p: any) => (
                  <li
                    key={`${p.stage_id}-${p.group_name}`}
                    className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-surface-container-high px-3 py-2"
                  >
                    <span className="text-sm">
                      {p.stage_name}
                      <span className="text-on-surface-variant"> · Grupo {p.group_name}</span>
                    </span>
                    <span className="flex items-center gap-3 text-sm">
                      <Badge className="bg-secondary/15 text-secondary">
                        {p.position}º de {p.of}
                      </Badge>
                      <span className="text-on-surface-variant">{p.league_points} pts</span>
                    </span>
                  </li>
                ))}
              </ul>
            </Card>
          )}

          {/* Lo primero que quiere saber un capitán el sábado: con quién NO
              cuenta mañana. Solo aparece si el torneo calcula suspensiones. */}
          {castigados.length > 0 && (
            <Card className="p-2">
              <h3 className="flex items-center gap-2 px-3 py-2 font-display font-semibold">
                <Icon name="gavel" className="text-error" /> No pueden jugar
              </h3>
              <ul className="space-y-1.5 px-3 pb-3">
                {castigados.map((s) => (
                  <li
                    key={`${s.player_id}-${s.since_match_id}`}
                    className="flex flex-wrap items-center gap-x-2 rounded-lg bg-error-container/25 px-3 py-2 text-sm"
                  >
                    <span className="font-semibold">{s.player_name}</span>
                    <span className="ml-auto text-xs text-on-surface-variant">
                      {s.reason}
                      {' · '}
                      {s.pending === 1
                        ? 'la próxima fecha'
                        : `${s.pending} fechas`}
                    </span>
                  </li>
                ))}
              </ul>
            </Card>
          )}

          <Card className="p-2">
            <h3 className="px-3 py-2 font-display font-semibold">Mis jugadores</h3>
            {resumen?.squad_stats?.length ? (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="text-left text-xs uppercase tracking-wide text-on-surface-variant">
                    <tr className="border-b border-outline-variant/30">
                      <th className="px-3 py-2">#</th>
                      <th className="px-3 py-2">Jugador</th>
                      <th className="px-3 py-2 text-center">
                        {deporte.scoreLabel}
                      </th>
                      {deporte.discColumns.map((c) => (
                        <th key={c.key} className="px-3 py-2 text-center" title={c.title}>
                          {c.label}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {resumen.squad_stats.map((p: any) => (
                      <tr key={p.player_id} className="border-b border-outline-variant/15">
                        <td className="px-3 py-2 text-on-surface-variant">{p.number ?? '—'}</td>
                        <td className="px-3 py-2 font-medium">{p.player_name}</td>
                        <td className="px-3 py-2 text-center font-semibold">{p.goals}</td>
                        {deporte.discColumns.map((c) => (
                          <td key={c.key} className="px-3 py-2 text-center">
                            {p[c.key] ?? 0}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <EmptyState
                icon="groups"
                title="Sin estadísticas todavía"
                hint="Aparecen en cuanto el árbitro cargue goles o tarjetas de tus jugadores."
              />
            )}
          </Card>
        </div>
      )}
    </div>
  )
}
