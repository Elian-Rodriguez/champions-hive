/**
 * La mesa del comité: sanciones, informes arbitrales y reclamos.
 *
 * Es una pestaña del organizador con tres partes porque son tres eslabones de
 * la misma cadena: el árbitro anota la incidencia en el informe, el comité
 * sanciona (con un clic desde la incidencia, que deja la sanción colgada de
 * ella) y el equipo que no está de acuerdo reclama con el clip. Separarlas en
 * tres pestañas sueltas haría que el organizador copie a mano de una a otra.
 *
 * Lo que decide el backend (`services/gobierno.py`) no se recalcula aquí: las
 * fechas cumplidas, las pendientes y si una incidencia ya tiene sanción llegan
 * resueltas en cada fila.
 */
import { useEffect, useMemo, useState } from 'react'
import { api, mediaUrl } from '../services/api'
import { Badge, Button, Card, EmptyState, Icon, Input, Select, Spinner } from './ui'
import {
  estadoReclamo,
  fechaCorta,
  fechasLabel,
  incidencia,
  reclamoPendiente,
} from '../utils/gobierno'

type Parte = 'sanciones' | 'informes' | 'reclamos'
type Borrador = {
  team_id: string
  player_id: string
  matches: number
  reason: string
  match_id: string
  incident_id?: string | null
}

const VACIO: Borrador = { team_id: '', player_id: '', matches: 1, reason: '', match_id: '' }
const AREA =
  'w-full rounded-lg border border-outline-variant bg-surface-container-low px-3 py-2 text-sm text-on-surface placeholder:text-on-surface-variant/60 focus:border-secondary/70 focus:outline-none'

/** Los partidos de todas las fases, para elegir «dónde ocurrió». */
function usePartidos(tournamentId: string) {
  const [partidos, setPartidos] = useState<any[]>([])
  useEffect(() => {
    let vivo = true
    api
      .getStages(tournamentId)
      .then((fases: any[]) => Promise.all(fases.map((f) => api.stageMatches(f.id))))
      .then((listas: any[][]) => {
        if (!vivo) return
        const todos = listas.flat()
        todos.sort((a, b) => String(a.scheduled_start || '~').localeCompare(String(b.scheduled_start || '~')))
        setPartidos(todos)
      })
      .catch(() => vivo && setPartidos([]))
    return () => {
      vivo = false
    }
  }, [tournamentId])
  return partidos
}

const rotulo = (m: any) =>
  `${m.home_team_name || 'Por definir'} vs ${m.away_team_name || 'Por definir'}` +
  (m.scheduled_start ? ` · ${fechaCorta(m.scheduled_start)}` : '')

export default function GobiernoPanel({ tournament }: { tournament: any }) {
  const [parte, setParte] = useState<Parte>('sanciones')
  const [sanciones, setSanciones] = useState<any[]>([])
  const [informes, setInformes] = useState<any[]>([])
  const [reclamos, setReclamos] = useState<any[]>([])
  const [equipos, setEquipos] = useState<any[]>([])
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [borrador, setBorrador] = useState<Borrador>(VACIO)
  const partidos = usePartidos(tournament.id)

  async function cargar() {
    try {
      const [s, i, r, e] = await Promise.all([
        api.sanctions(tournament.id),
        api.tournamentReports(tournament.id),
        api.claims(tournament.id),
        api.getTeams(tournament.id),
      ])
      setSanciones(s)
      setInformes(i)
      setReclamos(r)
      setEquipos(e)
    } catch (e: any) {
      setError(e.message)
    } finally {
      setCargando(false)
    }
  }

  useEffect(() => {
    setCargando(true)
    setBorrador(VACIO)
    cargar()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tournament.id])

  /** Desde una incidencia del informe: la sanción nace con todo cargado. */
  function sancionarIncidencia(informe: any, inc: any) {
    setBorrador({
      team_id: inc.team_id || '',
      player_id: inc.player_id || '',
      matches: 1,
      reason: `${inc.kind_label}${inc.minute != null ? ` (min ${inc.minute})` : ''}${
        inc.description ? `: ${inc.description}` : ''
      }`.slice(0, 500),
      match_id: informe.match_id,
      incident_id: inc.id,
    })
    setParte('sanciones')
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const activas = sanciones.filter((s) => s.status === 'active' && s.pending > 0).length
  const porSancionar = informes.reduce((n, i) => n + (i.pending || 0), 0)
  const abiertos = reclamos.filter((r) => reclamoPendiente(r.status)).length

  const PARTES: { key: Parte; label: string; icon: string; n: number }[] = [
    { key: 'sanciones', label: 'Sanciones', icon: 'gavel', n: activas },
    { key: 'informes', label: 'Informes arbitrales', icon: 'assignment', n: porSancionar },
    { key: 'reclamos', label: 'Reclamos', icon: 'balance', n: abiertos },
  ]

  if (cargando) return <Spinner />

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap gap-1.5 rounded-xl border border-outline-variant/60 bg-surface-container-low p-1.5">
        {PARTES.map((p) => (
          <button
            key={p.key}
            onClick={() => setParte(p.key)}
            className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 font-display text-sm font-bold tracking-tight transition duration-200 ease-snap ${
              parte === p.key
                ? 'bg-volt text-on-secondary shadow-volt-sm'
                : 'text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface'
            }`}
          >
            <Icon name={p.icon} className="text-base" />
            {p.label}
            {p.n > 0 && (
              <span
                className={`tnum rounded-full px-1.5 text-[11px] ${
                  parte === p.key ? 'bg-on-secondary/15' : 'bg-tertiary/20 text-tertiary'
                }`}
              >
                {p.n}
              </span>
            )}
          </button>
        ))}
      </div>

      {error && (
        <div className="flex items-center gap-2 rounded-lg bg-error-container/40 px-3 py-2 text-sm text-error">
          <Icon name="error" className="text-base" /> {error}
          <button onClick={() => setError(null)} className="ml-auto">
            <Icon name="close" className="text-base" />
          </button>
        </div>
      )}

      {parte === 'sanciones' && (
        <Sanciones
          tournament={tournament}
          sanciones={sanciones}
          equipos={equipos}
          partidos={partidos}
          borrador={borrador}
          setBorrador={setBorrador}
          onCambio={cargar}
          onError={setError}
        />
      )}
      {parte === 'informes' && (
        <Informes informes={informes} onSancionar={sancionarIncidencia} onCambio={cargar} onError={setError} />
      )}
      {parte === 'reclamos' && <Reclamos reclamos={reclamos} onCambio={cargar} onError={setError} />}
    </div>
  )
}

// --------------------------------------------------------------------------- //
//  Sanciones
// --------------------------------------------------------------------------- //
function Sanciones({
  tournament,
  sanciones,
  equipos,
  partidos,
  borrador,
  setBorrador,
  onCambio,
  onError,
}: {
  tournament: any
  sanciones: any[]
  equipos: any[]
  partidos: any[]
  borrador: Borrador
  setBorrador: (b: Borrador) => void
  onCambio: () => Promise<void>
  onError: (e: string | null) => void
}) {
  const [nomina, setNomina] = useState<any[]>([])
  const [guardando, setGuardando] = useState(false)
  const [borrar, setBorrar] = useState<string | null>(null)
  const [ver, setVer] = useState<'vigentes' | 'todas'>('vigentes')

  useEffect(() => {
    if (!borrador.team_id) {
      setNomina([])
      return
    }
    api
      .getPlayers(borrador.team_id)
      .then(setNomina)
      .catch(() => setNomina([]))
  }, [borrador.team_id])

  const delEquipo = useMemo(
    () =>
      partidos.filter(
        (m) => !borrador.team_id || [m.home_team_id, m.away_team_id].includes(borrador.team_id),
      ),
    [partidos, borrador.team_id],
  )

  async function guardar() {
    setGuardando(true)
    onError(null)
    try {
      await api.createSanction(tournament.id, {
        player_id: borrador.player_id,
        team_id: borrador.team_id || null,
        matches: Number(borrador.matches) || 0,
        reason: borrador.reason,
        match_id: borrador.match_id || null,
        incident_id: borrador.incident_id || null,
      })
      setBorrador(VACIO)
      await onCambio()
    } catch (e: any) {
      onError(e.message)
    } finally {
      setGuardando(false)
    }
  }

  async function cambiar(id: string, data: any) {
    onError(null)
    try {
      await api.updateSanction(id, data)
      await onCambio()
    } catch (e: any) {
      onError(e.message)
    }
  }

  async function eliminar(id: string) {
    if (borrar !== id) {
      setBorrar(id)
      return
    }
    setBorrar(null)
    try {
      await api.deleteSanction(id)
      await onCambio()
    } catch (e: any) {
      onError(e.message)
    }
  }

  const lista = ver === 'vigentes' ? sanciones.filter((s) => s.status === 'active' && s.pending > 0) : sanciones
  const puede = borrador.player_id && borrador.reason.trim()

  return (
    <div className="grid gap-5 xl:grid-cols-[minmax(0,22rem)_minmax(0,1fr)]">
      <Card className="h-fit p-4">
        <h3 className="headline mb-1 text-lg">Nueva sanción</h3>
        <p className="mb-3 text-xs text-on-surface-variant">
          La decide el comité: funciona aunque la suspensión automática por tarjetas esté apagada, y la
          planilla del árbitro marca al jugador igual.
        </p>
        {borrador.incident_id && (
          <div className="mb-3 flex items-center gap-2 rounded-lg bg-primary/10 px-3 py-2 text-xs text-primary">
            <Icon name="link" className="text-sm" /> Sale de una incidencia del informe arbitral.
            <button className="ml-auto" onClick={() => setBorrador(VACIO)} title="Empezar de cero">
              <Icon name="close" className="text-sm" />
            </button>
          </div>
        )}
        <div className="space-y-3">
          <label className="block text-xs font-semibold text-on-surface-variant">
            Equipo
            <Select
              className="mt-1"
              value={borrador.team_id}
              onChange={(e) => setBorrador({ ...borrador, team_id: e.target.value, player_id: '' })}
            >
              <option value="">Elige el equipo…</option>
              {equipos.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.name}
                </option>
              ))}
            </Select>
          </label>
          <label className="block text-xs font-semibold text-on-surface-variant">
            Jugador
            <Select
              className="mt-1"
              value={borrador.player_id}
              disabled={!borrador.team_id}
              onChange={(e) => setBorrador({ ...borrador, player_id: e.target.value })}
            >
              <option value="">{borrador.team_id ? 'Elige el jugador…' : 'Primero el equipo'}</option>
              {nomina.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.number != null ? `${p.number} · ` : ''}
                  {p.name}
                </option>
              ))}
            </Select>
          </label>
          <div className="grid grid-cols-[6rem_1fr] gap-2">
            <label className="block text-xs font-semibold text-on-surface-variant">
              Fechas
              <Input
                type="number"
                min={0}
                max={50}
                className="mt-1 tnum"
                value={borrador.matches}
                onChange={(e) => setBorrador({ ...borrador, matches: Number(e.target.value) })}
              />
            </label>
            <label className="block text-xs font-semibold text-on-surface-variant">
              Dónde ocurrió (opcional)
              <Select
                className="mt-1"
                value={borrador.match_id}
                onChange={(e) => setBorrador({ ...borrador, match_id: e.target.value })}
              >
                <option value="">Desde hoy</option>
                {delEquipo.map((m) => (
                  <option key={m.id} value={m.id}>
                    {rotulo(m)}
                  </option>
                ))}
              </Select>
            </label>
          </div>
          <p className="-mt-1 text-[11px] text-on-surface-variant">
            {Number(borrador.matches) === 0
              ? 'Con 0 fechas queda como amonestación: en el registro, sin suspender.'
              : 'Se cumple con los partidos que su equipo termine después de ese partido.'}
          </p>
          <label className="block text-xs font-semibold text-on-surface-variant">
            Motivo
            <textarea
              className={`${AREA} mt-1`}
              rows={3}
              maxLength={2000}
              placeholder="Agresión al rival en el minuto 70, según el informe arbitral."
              value={borrador.reason}
              onChange={(e) => setBorrador({ ...borrador, reason: e.target.value })}
            />
          </label>
          <Button className="w-full" disabled={!puede || guardando} onClick={guardar}>
            <Icon name="gavel" className="text-base" />
            {guardando ? 'Guardando…' : 'Sancionar'}
          </Button>
        </div>
      </Card>

      <div className="min-w-0 space-y-3">
        <div className="flex items-center justify-between gap-2">
          <h3 className="headline text-lg">Registro del comité</h3>
          <Select
            className="w-auto py-1 text-sm"
            value={ver}
            onChange={(e) => setVer(e.target.value as any)}
          >
            <option value="vigentes">Vigentes</option>
            <option value="todas">Todas (cumplidas y anuladas)</option>
          </Select>
        </div>
        {lista.length === 0 ? (
          <EmptyState
            icon="gavel"
            title={ver === 'vigentes' ? 'Nadie está suspendido por el comité' : 'Todavía no hay sanciones'}
            hint="Las suspensiones por acumulación de tarjetas se calculan solas y salen en Configuración."
          />
        ) : (
          <ul className="space-y-2">
            {lista.map((s) => {
              const anulada = s.status === 'annulled'
              const cumplida = !anulada && s.pending === 0
              return (
                <li key={s.id}>
                  <Card className={`p-3 ${anulada ? 'opacity-60' : ''}`}>
                    <div className="flex flex-wrap items-start gap-3">
                      <span className="clip-hex grid h-10 w-10 shrink-0 place-items-center bg-error-container/50 text-error">
                        <Icon name="gavel" className="text-lg" />
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="font-display font-bold">
                          {s.player_name}{' '}
                          <span className="font-normal text-on-surface-variant">· {s.team_name}</span>
                        </p>
                        <p className="text-sm text-on-surface-variant">{s.reason}</p>
                        <div className="mt-1.5 flex flex-wrap items-center gap-1.5 text-xs">
                          <Badge className="bg-error-container/40 text-error">{fechasLabel(s.matches)}</Badge>
                          {anulada ? (
                            <Badge className="bg-surface-container-high text-on-surface-variant">Anulada</Badge>
                          ) : cumplida ? (
                            <Badge className="bg-secondary/15 text-secondary">Cumplida</Badge>
                          ) : (
                            <Badge className="tnum bg-tertiary/15 text-tertiary">
                              {s.served}/{s.matches} cumplidas
                            </Badge>
                          )}
                          {s.match_label && (
                            <span className="text-on-surface-variant">
                              <Icon name="sports_soccer" className="align-middle text-sm" /> {s.match_label}
                            </span>
                          )}
                          {s.incident_id && (
                            <span className="text-primary">
                              <Icon name="assignment" className="align-middle text-sm" /> del informe
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex shrink-0 items-center gap-1">
                        {!anulada && (
                          <Input
                            type="number"
                            min={0}
                            max={50}
                            title="Fechas de suspensión"
                            className="tnum w-16 py-1 text-sm"
                            defaultValue={s.matches}
                            onBlur={(e) => {
                              const n = Number(e.target.value)
                              if (n !== s.matches) cambiar(s.id, { matches: n })
                            }}
                          />
                        )}
                        <Button
                          variant="ghost"
                          className="px-2 py-1 text-xs"
                          onClick={() => cambiar(s.id, { status: anulada ? 'active' : 'annulled' })}
                          title={anulada ? 'Volver a aplicarla' : 'Anularla sin borrarla (queda en el registro)'}
                        >
                          <Icon name={anulada ? 'restart_alt' : 'block'} className="text-base" />
                          {anulada ? 'Reactivar' : 'Anular'}
                        </Button>
                        <button
                          onClick={() => eliminar(s.id)}
                          title="Borrar (solo si se cargó por error)"
                          className={`rounded-lg px-2 py-1 text-xs transition ${
                            borrar === s.id
                              ? 'bg-error-container text-on-error-container'
                              : 'text-on-surface-variant hover:text-error'
                          }`}
                        >
                          <Icon name="delete" className="align-middle text-base" />
                          {borrar === s.id && ' ¿Borrar?'}
                        </button>
                      </div>
                    </div>
                  </Card>
                </li>
              )
            })}
          </ul>
        )}
      </div>
    </div>
  )
}

// --------------------------------------------------------------------------- //
//  Informes arbitrales
// --------------------------------------------------------------------------- //
function Informes({
  informes,
  onSancionar,
  onCambio,
  onError,
}: {
  informes: any[]
  onSancionar: (informe: any, inc: any) => void
  onCambio: () => Promise<void>
  onError: (e: string | null) => void
}) {
  async function reabrir(matchId: string) {
    onError(null)
    try {
      await api.reopenMatchReport(matchId)
      await onCambio()
    } catch (e: any) {
      onError(e.message)
    }
  }

  if (!informes.length)
    return (
      <EmptyState
        icon="assignment"
        title="Todavía no hay informes"
        hint="El árbitro escribe y firma el informe desde su panel, al lado de la planilla del partido."
      />
    )

  return (
    <ul className="space-y-3">
      {informes.map((inf) => (
        <li key={inf.match_id}>
          <Card className="p-4">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <p className="font-display text-lg font-bold">{inf.match_label}</p>
                <p className="text-xs text-on-surface-variant">
                  {inf.match_date ? fechaCorta(inf.match_date) : 'Sin fecha'}
                  {inf.author_email && ` · ${inf.author_email.split('@')[0]}`}
                </p>
              </div>
              <div className="flex items-center gap-2">
                {inf.submitted_at ? (
                  <Badge className="bg-secondary/15 text-secondary">
                    <Icon name="verified" className="mr-1 text-sm" /> Firmado {fechaCorta(inf.submitted_at)}
                  </Badge>
                ) : (
                  <Badge className="bg-surface-container-high text-on-surface-variant">Borrador</Badge>
                )}
                {inf.submitted_at && (
                  <Button
                    variant="ghost"
                    className="px-2 py-1 text-xs"
                    onClick={() => reabrir(inf.match_id)}
                    title="Devolverlo al árbitro para que lo corrija (queda en el historial)"
                  >
                    <Icon name="lock_open" className="text-base" /> Reabrir
                  </Button>
                )}
              </div>
            </div>
            {inf.observations && (
              <p className="mt-3 whitespace-pre-line rounded-lg bg-surface-container-low px-3 py-2 text-sm">
                {inf.observations}
              </p>
            )}
            {inf.incidents.length === 0 ? (
              <p className="mt-3 text-sm text-on-surface-variant">
                <Icon name="check" className="align-middle text-base text-secondary" /> Sin novedad.
              </p>
            ) : (
              <ul className="mt-3 divide-y divide-outline-variant/30">
                {inf.incidents.map((inc: any) => {
                  const tipo = incidencia(inc.kind)
                  return (
                    <li key={inc.id} className="flex flex-wrap items-start gap-3 py-2">
                      <Icon name={tipo.icon} className="mt-0.5 text-lg text-tertiary" />
                      <div className="min-w-0 flex-1 text-sm">
                        <p className="font-semibold">
                          {inc.kind_label}
                          {inc.minute != null && (
                            <span className="tnum ml-1 font-normal text-on-surface-variant">· min {inc.minute}</span>
                          )}
                        </p>
                        <p className="text-on-surface-variant">
                          {[inc.player_name, inc.team_name].filter(Boolean).join(' · ') || 'Sin jugador'}
                        </p>
                        {inc.description && <p className="mt-0.5">{inc.description}</p>}
                      </div>
                      {inc.sanction ? (
                        <Badge
                          className={
                            inc.sanction.status === 'annulled'
                              ? 'bg-surface-container-high text-on-surface-variant'
                              : 'bg-error-container/40 text-error'
                          }
                        >
                          <Icon name="gavel" className="mr-1 text-sm" />
                          {inc.sanction.status === 'annulled' ? 'Sanción anulada' : fechasLabel(inc.sanction.matches)}
                        </Badge>
                      ) : (
                        inc.player_id && (
                          <Button variant="outline" className="px-2 py-1 text-xs" onClick={() => onSancionar(inf, inc)}>
                            <Icon name="gavel" className="text-base" /> Sancionar
                          </Button>
                        )
                      )}
                    </li>
                  )
                })}
              </ul>
            )}
          </Card>
        </li>
      ))}
    </ul>
  )
}

// --------------------------------------------------------------------------- //
//  Reclamos
// --------------------------------------------------------------------------- //
/** La prueba del reclamo: la jugada oficial o el video propio del equipo. Un
 *  enlace de otro sitio no se puede incrustar sin saber qué sitio es, así que
 *  se abre aparte. */
export function PruebaReclamo({ claim }: { claim: any }) {
  const pruebas: { titulo: string; url: string | null; local: boolean; poster?: string | null }[] = []
  if (claim.highlight)
    pruebas.push({
      titulo: claim.highlight.title || 'Jugada del partido',
      url: claim.highlight.video_url,
      local: claim.highlight.storage !== 'link',
      poster: claim.highlight.poster_url,
    })
  if (claim.evidence?.url)
    pruebas.push({
      titulo: 'Video del equipo',
      url: claim.evidence.url,
      local: claim.evidence.storage === 'local',
    })
  if (!pruebas.length) return null
  return (
    <div className="mt-3 grid gap-2 sm:grid-cols-2">
      {pruebas.map((p) =>
        p.local ? (
          <figure key={p.titulo} className="overflow-hidden rounded-lg border border-outline-variant/60 bg-black">
            <video
              src={mediaUrl(p.url) || undefined}
              poster={p.poster || undefined}
              controls
              playsInline
              preload="metadata"
              className="aspect-video w-full"
            />
            <figcaption className="bg-surface-container-low px-2 py-1 text-xs text-on-surface-variant">
              <Icon name="movie" className="align-middle text-sm" /> {p.titulo}
            </figcaption>
          </figure>
        ) : (
          <a
            key={p.titulo}
            href={p.url || '#'}
            target="_blank"
            rel="noreferrer noopener"
            className="flex items-center gap-2 rounded-lg border border-outline-variant/60 px-3 py-2 text-sm text-secondary hover:border-secondary/60"
          >
            <Icon name="open_in_new" className="text-base" /> {p.titulo}
          </a>
        ),
      )}
    </div>
  )
}

function Reclamos({
  reclamos,
  onCambio,
  onError,
}: {
  reclamos: any[]
  onCambio: () => Promise<void>
  onError: (e: string | null) => void
}) {
  const [filtro, setFiltro] = useState<'pendientes' | 'resueltos' | 'todos'>('pendientes')
  const lista = reclamos.filter((r) =>
    filtro === 'todos'
      ? true
      : filtro === 'pendientes'
        ? reclamoPendiente(r.status)
        : !reclamoPendiente(r.status),
  )
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-1.5">
        {(
          [
            ['pendientes', 'Por resolver'],
            ['resueltos', 'Resueltos'],
            ['todos', 'Todos'],
          ] as const
        ).map(([k, label]) => (
          <button
            key={k}
            onClick={() => setFiltro(k)}
            className={`rounded-full px-3 py-1 text-xs font-bold transition ${
              filtro === k
                ? 'bg-volt text-on-secondary'
                : 'bg-surface-container-high text-on-surface-variant hover:text-on-surface'
            }`}
          >
            {label}
          </button>
        ))}
      </div>
      {lista.length === 0 ? (
        <EmptyState
          icon="balance"
          title={filtro === 'pendientes' ? 'No hay reclamos por resolver' : 'Nada por aquí'}
          hint="Los capitanes reclaman desde su panel, con el clip de la jugada como prueba."
        />
      ) : (
        <ul className="space-y-3">
          {lista.map((c) => (
            <li key={c.id}>
              <TarjetaReclamo claim={c} onCambio={onCambio} onError={onError} />
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

function TarjetaReclamo({
  claim,
  onCambio,
  onError,
}: {
  claim: any
  onCambio: () => Promise<void>
  onError: (e: string | null) => void
}) {
  const estado = estadoReclamo(claim.status)
  const pendiente = reclamoPendiente(claim.status)
  const [decision, setDecision] = useState<'accepted' | 'rejected'>('rejected')
  const [texto, setTexto] = useState(claim.resolution || '')
  const [publicar, setPublicar] = useState(true)
  const [fechas, setFechas] = useState<string>('')
  const [guardando, setGuardando] = useState(false)
  const [borrar, setBorrar] = useState(false)

  async function hacer(fn: () => Promise<any>) {
    setGuardando(true)
    onError(null)
    try {
      await fn()
      await onCambio()
    } catch (e: any) {
      onError(e.message)
    } finally {
      setGuardando(false)
    }
  }

  const resolver = () =>
    hacer(() =>
      api.decideClaim(claim.id, {
        status: decision,
        resolution: texto,
        published: publicar,
        sanction_matches: claim.sanction && fechas !== '' ? Number(fechas) : null,
      }),
    )

  return (
    <Card className="p-4" accent={pendiente ? 'orange' : undefined}>
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="font-display text-lg font-bold">
            {claim.team_name} <span className="font-normal text-on-surface-variant">· {claim.kind_label}</span>
          </p>
          <p className="text-xs text-on-surface-variant">
            {fechaCorta(claim.created_at)}
            {claim.created_by_email && ` · ${claim.created_by_email}`}
            {claim.match_label && ` · ${claim.match_label}`}
          </p>
        </div>
        <Badge className={estado.tone}>
          <Icon name={estado.icon} className="mr-1 text-sm" /> {estado.label}
        </Badge>
      </div>
      <p className="mt-3 whitespace-pre-line text-sm">{claim.description}</p>
      {claim.sanction && (
        <p className="mt-2 rounded-lg bg-error-container/20 px-3 py-2 text-sm">
          <Icon name="gavel" className="mr-1 align-middle text-base text-error" />
          Apela la sanción de <b>{claim.sanction.player_name}</b>: {fechasLabel(claim.sanction.matches)} —{' '}
          {claim.sanction.reason}
          {claim.sanction.status === 'annulled' && ' (anulada)'}
        </p>
      )}
      <PruebaReclamo claim={claim} />

      {pendiente ? (
        <div className="mt-4 space-y-3 border-t border-outline-variant/40 pt-4">
          <div className="flex flex-wrap items-center gap-2">
            {(['accepted', 'rejected'] as const).map((d) => (
              <button
                key={d}
                onClick={() => setDecision(d)}
                className={`flex items-center gap-1 rounded-lg px-3 py-1.5 text-sm font-bold transition ${
                  decision === d
                    ? d === 'accepted'
                      ? 'bg-volt text-on-secondary'
                      : 'bg-error-container text-on-error-container'
                    : 'bg-surface-container-high text-on-surface-variant'
                }`}
              >
                <Icon name={d === 'accepted' ? 'check' : 'close'} className="text-base" />
                {d === 'accepted' ? 'Aceptar' : 'Rechazar'}
              </button>
            ))}
            {claim.status === 'open' && (
              <Button
                variant="ghost"
                className="ml-auto px-2 py-1 text-xs"
                disabled={guardando}
                onClick={() => hacer(() => api.decideClaim(claim.id, { status: 'in_review' }))}
              >
                <Icon name="manage_search" className="text-base" /> Marcar en revisión
              </Button>
            )}
          </div>
          <textarea
            className={AREA}
            rows={3}
            maxLength={2000}
            placeholder="La resolución, como se va a leer: qué se decidió y por qué."
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
          />
          {claim.sanction && claim.sanction.status !== 'annulled' && (
            <label className="flex flex-wrap items-center gap-2 text-sm">
              Dejar la sanción en
              <Input
                type="number"
                min={0}
                max={50}
                className="tnum w-20 py-1"
                placeholder={String(claim.sanction.matches)}
                value={fechas}
                onChange={(e) => setFechas(e.target.value)}
              />
              fechas <span className="text-xs text-on-surface-variant">(0 la anula; vacío no la toca)</span>
            </label>
          )}
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={publicar} onChange={(e) => setPublicar(e.target.checked)} />
            Publicar la resolución en el marcador público
          </label>
          <Button disabled={!texto.trim() || guardando} onClick={resolver}>
            <Icon name="gavel" className="text-base" />
            {guardando ? 'Guardando…' : 'Resolver'}
          </Button>
        </div>
      ) : (
        <div className="mt-4 border-t border-outline-variant/40 pt-3">
          {claim.resolution && (
            <p className="whitespace-pre-line text-sm">
              <span className="font-semibold">Resolución: </span>
              {claim.resolution}
            </p>
          )}
          <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-on-surface-variant">
            {claim.resolved_at && <span>{fechaCorta(claim.resolved_at)}</span>}
            {claim.status !== 'withdrawn' && (
              <label className="ml-auto flex items-center gap-1.5">
                <input
                  type="checkbox"
                  checked={claim.published}
                  disabled={guardando}
                  onChange={(e) => hacer(() => api.publishClaim(claim.id, e.target.checked))}
                />
                Publicada en el marcador
              </label>
            )}
            <button
              onClick={() => (borrar ? hacer(() => api.deleteClaim(claim.id)) : setBorrar(true))}
              className={`rounded-lg px-2 py-1 transition ${
                borrar ? 'bg-error-container text-on-error-container' : 'hover:text-error'
              } ${claim.status === 'withdrawn' ? 'ml-auto' : ''}`}
              title="Borrar el reclamo y su video"
            >
              <Icon name="delete" className="align-middle text-base" />
              {borrar && ' ¿Borrar?'}
            </button>
          </div>
        </div>
      )}
    </Card>
  )
}

