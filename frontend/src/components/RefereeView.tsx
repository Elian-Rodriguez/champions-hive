import { useEffect, useState } from 'react'
import { api, syncOutbox } from '../services/api'
import { isOnline, pendingCount, subscribeOffline } from '../services/offline'
import { Badge, Button, Card, EmptyState, Icon, LiveChip, Spinner } from './ui'
import { exportMatchReportPDF } from '../utils/pdf'
import { useAppSelector } from '../hooks'
import { marcadorWalkover, sportOf, type DisciplineEvent } from '../sports'
import { ESTADO_LABEL as STATUS_LABEL, woDetalle, woLabel } from '../utils/partido'

/** Un jugador dentro de la planilla del partido. Estar en el mapa es haber
 *  jugado; `starter` distingue titular de suplente. */
type Alineado = { starter: boolean; captain: boolean }

const fmtClock = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`

function useNet() {
  const [net, setNet] = useState({ online: isOnline(), pending: pendingCount() })
  useEffect(
    () => subscribeOffline(() => setNet({ online: isOnline(), pending: pendingCount() })),
    [],
  )
  return net
}

function NetBanner() {
  const { online, pending } = useNet()
  useEffect(() => {
    if (online && pending > 0) syncOutbox()
  }, [online, pending])
  if (online && pending === 0) return null
  return (
    <div
      className={`mb-4 flex items-center justify-between gap-2 rounded-lg border px-3 py-2 text-sm ${
        online
          ? 'border-secondary/40 bg-secondary/10 text-secondary'
          : 'border-tertiary/40 bg-tertiary/10 text-tertiary'
      }`}
    >
      <span className="flex items-center gap-2">
        <Icon name={online ? 'cloud_sync' : 'cloud_off'} className="text-base" />
        {online
          ? `Sincronizando… ${pending} cambio(s) pendiente(s)`
          : `Sin conexión — los cambios se guardan y se envían al reconectar${
              pending > 0 ? ` · ${pending} en cola` : ''
            }`}
      </span>
      {online && pending > 0 && (
        <button
          onClick={() => syncOutbox()}
          className="shrink-0 rounded-md bg-secondary px-2.5 py-1 text-xs font-semibold text-on-secondary"
        >
          Sincronizar
        </button>
      )}
    </div>
  )
}

export default function RefereeView() {
  const [tournaments, setTournaments] = useState<any[]>([])
  const [stages, setStages] = useState<any[]>([])
  const [matches, setMatches] = useState<any[]>([])
  const [tournament, setTournament] = useState<any>(null)
  const [stage, setStage] = useState<any>(null)
  const [match, setMatch] = useState<any>(null)
  const [home, setHome] = useState(0)
  const [away, setAway] = useState(0)
  const [homePlayers, setHomePlayers] = useState<any[]>([])
  const [awayPlayers, setAwayPlayers] = useState<any[]>([])
  const [selHome, setSelHome] = useState('')
  const [selAway, setSelAway] = useState('')
  const [events, setEvents] = useState<any[]>([])
  // Planilla del partido: equipo → jugador → titular/capitán. Se carga con el
  // partido y se guarda por equipo, como llegan los delegados.
  const [lineup, setLineup] = useState<Record<string, Record<string, Alineado>>>({})
  const [lineupSucia, setLineupSucia] = useState<Record<string, boolean>>({})
  const [guardandoLineup, setGuardandoLineup] = useState<string | null>(null)
  // Panel de "no se jugó" (aplazar / W.O.), cerrado por defecto.
  const [noJugado, setNoJugado] = useState(false)
  // Jugadores suspendidos por tarjetas, si el torneo tiene encendido el
  // reglamento disciplinario. La planilla avisa antes de que entren a la
  // cancha, que es donde se atrapa una alineación indebida.
  const [suspendidos, setSuspendidos] = useState<Record<string, string>>({})
  const [minute, setMinute] = useState('')
  const [running, setRunning] = useState(false)
  const [elapsed, setElapsed] = useState(0)
  const [equipos, setEquipos] = useState<Record<string, any>>({})
  const [msg, setMsg] = useState<string | null>(null)
  const [msgError, setMsgError] = useState(false)
  const [acta, setActa] = useState(false)
  // Corrección de eventos: cuál se está editando y cuál espera confirmación de
  // borrado (dos toques, que en cancha el dedo se va).
  const [editing, setEditing] = useState<any>(null)
  const [confirmDel, setConfirmDel] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  // Por defecto el árbitro ve solo los partidos que va a pitar; puede destildar
  // para consultar el resto del campeonato (que ve, pero no puede cargar).
  const [mineOnly, setMineOnly] = useState(true)
  const { userId, role } = useAppSelector((s) => s.auth)

  useEffect(() => {
    api.getTournaments().then(setTournaments).finally(() => setLoading(false))
  }, [])

  // Cronómetro del partido (corre/pausa); el minuto del evento sigue al reloj.
  useEffect(() => {
    if (!running) return
    const id = setInterval(() => setElapsed((e) => e + 1), 1000)
    return () => clearInterval(id)
  }, [running])
  useEffect(() => {
    if (running) setMinute(String(Math.floor(elapsed / 60)))
  }, [elapsed, running])

  // Auto-refresco cada 15s: eventos del partido abierto, o la lista de partidos.
  // No toca el marcador local en edición.
  useEffect(() => {
    const id = setInterval(() => {
      if (match) api.matchEvents(match.id).then(setEvents).catch(() => {})
      else if (stage) api.stageMatches(stage.id).then(setMatches).catch(() => {})
    }, 15000)
    return () => clearInterval(id)
  }, [match, stage])

  function aviso(texto: string | null, error = false) {
    setMsg(texto)
    setMsgError(error)
  }

  async function pickTournament(t: any) {
    setTournament(t)
    setStage(null)
    setMatch(null)
    setStages(await api.getStages(t.id))
    const teams = await api.getTeams(t.id).catch(() => [])
    setEquipos(
      Object.fromEntries(
        teams.map((x: any) => [
          String(x.id),
          { ...x, colors: x.colors?.length ? x.colors : x.color ? [x.color] : [] },
        ]),
      ),
    )
  }
  async function pickStage(s: any) {
    setStage(s)
    setMatch(null)
    setMatches(await api.stageMatches(s.id))
  }
  async function openMatch(m: any) {
    setMatch(m)
    setHome(m.home_score || 0)
    setAway(m.away_score || 0)
    aviso(null)
    setEditing(null)
    setConfirmDel(null)
    setMinute('')
    setRunning(false)
    setElapsed(0)
    setSelHome('')
    setSelAway('')
    setNoJugado(false)
    setLineupSucia({})
    setHomePlayers(m.home_team_id ? await api.getPlayers(m.home_team_id) : [])
    setAwayPlayers(m.away_team_id ? await api.getPlayers(m.away_team_id) : [])
    setEvents(await api.matchEvents(m.id))
    setLineup(aMapa(await api.matchLineup(m.id).catch(() => [])))
    // Si el organizador no publica sanciones el backend responde 403 y la
    // planilla simplemente no avisa nada.
    api
      .tournamentDiscipline(tournament.id)
      .then((d: any) =>
        setSuspendidos(
          Object.fromEntries(
            (d?.sanctions || []).map((s: any) => [String(s.player_id), s.reason]),
          ),
        ),
      )
      .catch(() => setSuspendidos({}))
  }
  /** Las filas que devuelve el servidor, al mapa que edita la pantalla. */
  function aMapa(filas: any[]): Record<string, Record<string, Alineado>> {
    const mapa: Record<string, Record<string, Alineado>> = {}
    for (const f of filas || []) {
      const equipo = String(f.team_id)
      mapa[equipo] = mapa[equipo] || {}
      mapa[equipo][String(f.player_id)] = {
        starter: !!f.is_starter,
        captain: !!f.is_captain,
      }
    }
    return mapa
  }
  async function refreshEvents() {
    setEvents(await api.matchEvents(match.id))
  }
  async function persist(status: string) {
    await api.updateMatchStatus(match.id, { status, home_score: home, away_score: away })
    setMatch((m: any) => ({ ...m, status, home_score: home, away_score: away }))
    aviso(`Marcador guardado (${STATUS_LABEL[status]})`)
    if (stage) setMatches(await api.stageMatches(stage.id))
  }

  /** Aplazado: no se juega y todavía no hay fecha nueva. No cuenta para la
   *  tabla y sale del calendario hasta que el organizador lo reprograme. */
  async function aplazar() {
    try {
      await api.updateMatchStatus(match.id, { status: 'postponed' })
      setMatch((m: any) => ({ ...m, status: 'postponed' }))
      setNoJugado(false)
      aviso('Partido aplazado — el organizador le pondrá fecha nueva')
      if (stage) setMatches(await api.stageMatches(stage.id))
    } catch (e: any) {
      aviso(e?.message || 'No se pudo aplazar el partido', true)
    }
  }

  /** W.O.: el partido se da por terminado con el marcador del reglamento y
   *  queda dicho que no se jugó. El marcador se calcula aquí además de en el
   *  servidor para que sin señal el árbitro vea el número correcto. */
  async function marcarWalkover(ausente: 'home' | 'away' | 'both') {
    const [local, visitante] = marcadorWalkover(tournament?.sport_type, ausente)
    try {
      await api.updateMatchStatus(match.id, {
        status: 'finished',
        walkover: ausente,
        home_score: local,
        away_score: visitante,
      })
      setHome(local)
      setAway(visitante)
      setMatch((m: any) => ({
        ...m,
        status: 'finished',
        walkover: ausente,
        home_score: local,
        away_score: visitante,
      }))
      setNoJugado(false)
      aviso(`${woDetalle(ausente, match.home_team_name, match.away_team_name)} · ${local}-${visitante}`)
      if (stage) setMatches(await api.stageMatches(stage.id))
    } catch (e: any) {
      aviso(e?.message || 'No se pudo cargar el W.O.', true)
    }
  }

  /** Deshace el W.O.: el partido vuelve a ser uno jugado y el marcador queda
   *  en manos del árbitro. */
  async function quitarWalkover() {
    try {
      await api.updateMatchStatus(match.id, { status: match.status, walkover: null })
      setMatch((m: any) => ({ ...m, walkover: null }))
      aviso('W.O. quitado — carga el marcador del partido')
    } catch (e: any) {
      aviso(e?.message || 'No se pudo quitar el W.O.', true)
    }
  }

  // ---- Planilla ----
  function tocarLineup(equipo: string, jugador: string, cambio: Partial<Alineado> | null) {
    setLineup((prev) => {
      const delEquipo = { ...(prev[equipo] || {}) }
      if (cambio === null) delete delEquipo[jugador]
      else
        delEquipo[jugador] = {
          starter: true,
          captain: false,
          ...(delEquipo[jugador] || {}),
          ...cambio,
        }
      // El capitán es uno solo por equipo.
      if (cambio?.captain)
        for (const id of Object.keys(delEquipo))
          if (id !== jugador) delEquipo[id] = { ...delEquipo[id], captain: false }
      return { ...prev, [equipo]: delEquipo }
    })
    setLineupSucia((s) => ({ ...s, [equipo]: true }))
  }

  function todosTitulares(equipo: string, jugadores: any[]) {
    setLineup((prev) => ({
      ...prev,
      [equipo]: Object.fromEntries(
        jugadores.map((p) => [
          String(p.id),
          { starter: true, captain: !!prev[equipo]?.[String(p.id)]?.captain },
        ]),
      ),
    }))
    setLineupSucia((s) => ({ ...s, [equipo]: true }))
  }

  async function guardarLineup(equipo: string) {
    setGuardandoLineup(equipo)
    try {
      const filas = Object.entries(lineup[equipo] || {}).map(([player_id, v]) => ({
        player_id,
        is_starter: v.starter,
        is_captain: v.captain,
      }))
      await api.setMatchLineup(match.id, equipo, filas)
      setLineupSucia((s) => ({ ...s, [equipo]: false }))
      aviso(`Planilla guardada (${filas.length} jugador(es))`)
    } catch (e: any) {
      aviso(e?.message || 'No se pudo guardar la planilla', true)
    } finally {
      setGuardandoLineup(null)
    }
  }
  async function goal(side: 'home' | 'away') {
    const player = side === 'home' ? selHome : selAway
    if (side === 'home') setHome((h) => h + 1)
    else setAway((a) => a + 1)
    await api.recordEvent({
      match_id: match.id,
      player_id: player || null,
      event_type: 'GOL',
      event_data: { team: side, kind: 'goal', minute: minute ? Number(minute) : null },
    })
    await refreshEvents()
  }
  async function card(side: 'home' | 'away', type: string) {
    const player = side === 'home' ? selHome : selAway
    await api.recordEvent({
      match_id: match.id,
      player_id: player || null,
      event_type: type,
      event_data: { team: side, kind: 'card', minute: minute ? Number(minute) : null },
    })
    await refreshEvents()
  }
  async function sub(side: 'home' | 'away', outId: string, inId: string) {
    await api.recordEvent({
      match_id: match.id,
      player_id: inId || null,
      event_type: 'CAMBIO',
      event_data: {
        team: side,
        kind: 'sub',
        player_out: outId || null,
        minute: minute ? Number(minute) : null,
      },
    })
    await refreshEvents()
  }

  // El marcador no se deriva de los eventos (el árbitro también lo mueve a
  // mano), así que corregir o borrar un gol tiene que mover el número igual que
  // lo movió el botón "Gol" al cargarlo. Devuelve si lo tocó.
  function ajustarMarcador(antes: any, despues: any | null): boolean {
    const lado = (ev: any) => (ev?.event_type === 'GOL' ? ev.event_data?.team || null : null)
    const sale = lado(antes)
    const entra = lado(despues)
    if (sale === entra) return false
    if (sale === 'home') setHome((h) => Math.max(0, h - 1))
    if (sale === 'away') setAway((a) => Math.max(0, a - 1))
    if (entra === 'home') setHome((h) => h + 1)
    if (entra === 'away') setAway((a) => a + 1)
    return true
  }

  async function saveEvent(ev: any, cambios: any) {
    try {
      await api.updateEvent(ev.id, cambios)
      const movio = ajustarMarcador(ev, { ...ev, ...cambios })
      setEditing(null)
      await refreshEvents()
      aviso(movio ? 'Evento corregido — el marcador cambió, recuerda guardar' : 'Evento corregido')
    } catch (e: any) {
      aviso(e?.message || 'No se pudo corregir el evento', true)
      // Volver a leer deja el registro con lo que el servidor tiene de verdad.
      await refreshEvents().catch(() => {})
    }
  }

  async function removeEvent(ev: any) {
    try {
      await api.deleteEvent(ev.id)
      const movio = ajustarMarcador(ev, null)
      setConfirmDel(null)
      await refreshEvents()
      aviso(movio ? 'Evento eliminado — el marcador cambió, recuerda guardar' : 'Evento eliminado')
    } catch (e: any) {
      aviso(e?.message || 'No se pudo eliminar el evento', true)
      // Volver a leer deja el registro con lo que el servidor tiene de verdad.
      await refreshEvents().catch(() => {})
    }
  }

  // El acta trae escudos y QR (red), así que puede tardar un segundo: se
  // bloquea el botón mientras se arma y se avisa si algo falla.
  async function descargarActa() {
    setActa(true)
    try {
      await exportMatchReportPDF(
        { ...match, home_score: home, away_score: away },
        events,
        playerName,
        {
          tournament,
          tournamentName: tournament?.name,
          homePlayers,
          awayPlayers,
          homeLineup: planillaDe(String(match.home_team_id), homePlayers),
          awayLineup: planillaDe(String(match.away_team_id), awayPlayers),
          homeTeam: equipos[String(match.home_team_id)],
          awayTeam: equipos[String(match.away_team_id)],
          refereeName: match.referee_name,
        },
      )
    } catch (e: any) {
      aviso(e?.message || 'No se pudo generar el acta', true)
    } finally {
      setActa(false)
    }
  }

  function playerName(id: string | null) {
    if (!id) return ''
    const p = [...homePlayers, ...awayPlayers].find((x) => x.id === id)
    return p ? p.name : ''
  }

  /** Los jugadores de la planilla de un equipo, con sus datos completos, en el
   *  orden de la nómina. Es lo que imprime el acta. */
  function planillaDe(equipo: string, jugadores: any[]) {
    const marcados = lineup[equipo]
    if (!marcados || !Object.keys(marcados).length) return []
    return jugadores
      .filter((p) => marcados[String(p.id)])
      .map((p) => ({
        ...p,
        is_starter: marcados[String(p.id)].starter,
        is_captain: marcados[String(p.id)].captain,
      }))
  }

  const cards = sportOf(tournament?.sport_type).events
  // Tipos que se pueden elegir al corregir. Si el evento cargado es de un tipo
  // que la disciplina ya no ofrece, se suma para no cambiárselo sin querer.
  const eventTypes = [
    { type: 'GOL', label: 'Gol' },
    ...cards.map((c) => ({ type: c.type, label: c.label })),
    { type: 'CAMBIO', label: 'Cambio' },
  ]
  if (editing && !eventTypes.some((t) => t.type === editing.event_type))
    eventTypes.push({ type: editing.event_type, label: editing.event_type })
  const shownMatches =
    mineOnly && userId ? matches.filter((m: any) => m.referee_id === userId) : matches

  if (loading)
    return (
      <div className="grid place-items-center py-20">
        <Spinner className="h-8 w-8" />
      </div>
    )

  if (match) {
    const isLive = match.status === 'live'
    // Corregir un evento tiene el mismo alcance que cargarlo: el árbitro
    // asignado y el dueño del torneo. No ofrecer lo que va a devolver 403.
    const puedeCorregir = role !== 'referee' || match.referee_id === userId
    const meta = [match.stage_name, match.group_name ? `Grupo ${match.group_name}` : null]
      .filter(Boolean)
      .join(' · ')
    const eventStyle = (type: string) => {
      if (type === 'GOL') return { border: 'border-secondary', icon: 'sports_soccer', tone: 'text-secondary' }
      if (type === 'CAMBIO') return { border: 'border-primary', icon: 'swap_horiz', tone: 'text-primary' }
      if (type === 'ROJA' || type === 'ANTIDEPORTIVA')
        return { border: 'border-red-500', icon: 'style', tone: 'text-red-400' }
      if (type === 'AMARILLA') return { border: 'border-yellow-400', icon: 'style', tone: 'text-yellow-400' }
      if (type === 'AZUL') return { border: 'border-blue-500', icon: 'style', tone: 'text-blue-400' }
      return { border: 'border-tertiary', icon: 'sports', tone: 'text-tertiary' }
    }
    return (
      <div className="mx-auto max-w-5xl">
        <NetBanner />
        <button
          onClick={() => setMatch(null)}
          className="mb-4 flex items-center gap-1 text-sm text-on-surface-variant transition hover:text-on-surface"
        >
          <Icon name="arrow_back" className="text-base" /> Volver a partidos
        </button>

        <div className="grid gap-4 lg:grid-cols-3">
          {/* Tablero principal */}
          <Card accent="green" className="p-4 sm:p-6 lg:col-span-2">
            <div className="mb-5 flex items-center justify-between gap-2">
              <div className="flex min-w-0 items-center gap-2">
                {isLive ? (
                  <LiveChip />
                ) : (
                  <Badge className="bg-surface-container-highest text-on-surface-variant">
                    {STATUS_LABEL[match.status] || match.status}
                  </Badge>
                )}
                {match.walkover && (
                  <button
                    onClick={puedeCorregir ? quitarWalkover : undefined}
                    title={`${woDetalle(
                      match.walkover,
                      match.home_team_name,
                      match.away_team_name,
                    )}${puedeCorregir ? ' · toca para quitarlo' : ''}`}
                    className="shrink-0 rounded-full bg-tertiary/15 px-2 py-0.5 font-display text-xs font-bold text-tertiary"
                  >
                    {woLabel(match.walkover)}
                    {puedeCorregir ? ' ×' : ''}
                  </button>
                )}
                {meta && (
                  <span className="hidden truncate text-xs uppercase tracking-wide text-on-surface-variant sm:inline">
                    {meta}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2">
                {/* Cronómetro */}
                <div className="flex items-center gap-1 rounded-full border border-outline-variant bg-surface-container-low px-2 py-1 text-sm">
                  <Icon name="timer" className="text-base text-secondary" />
                  <span className="w-11 text-center font-display font-semibold tabular-nums">{fmtClock(elapsed)}</span>
                  <button
                    onClick={() => setRunning((r) => !r)}
                    className="grid h-6 w-6 place-items-center rounded-full text-secondary hover:bg-surface-bright"
                    title={running ? 'Pausar' : 'Iniciar'}
                  >
                    <Icon name={running ? 'pause' : 'play_arrow'} className="text-base" />
                  </button>
                  <button
                    onClick={() => {
                      setRunning(false)
                      setElapsed(0)
                    }}
                    className="grid h-6 w-6 place-items-center rounded-full text-on-surface-variant hover:bg-surface-bright"
                    title="Reiniciar"
                  >
                    <Icon name="restart_alt" className="text-base" />
                  </button>
                </div>
                {/* Minuto del evento (sigue al reloj o manual) */}
                <label
                  className="flex items-center gap-1 rounded-full border border-outline-variant bg-surface-container-low px-3 py-1 text-sm"
                  title="Minuto del evento"
                >
                  <input
                    type="number"
                    min={0}
                    value={minute}
                    onChange={(e) => setMinute(e.target.value)}
                    placeholder="min"
                    className="w-10 bg-transparent text-center text-on-surface focus:outline-none"
                  />
                  <span className="text-on-surface-variant">'</span>
                </label>
              </div>
            </div>

            <div className="grid grid-cols-3 items-start gap-2 text-center">
              <SideColumn
                name={match.home_team_name}
                score={home}
                colors={equipos[String(match.home_team_id)]?.colors}
                cards={cards}
                players={homePlayers}
                selected={selHome}
                onSelect={setSelHome}
                onInc={() => setHome((h) => h + 1)}
                onDec={() => setHome((h) => Math.max(0, h - 1))}
                onGoal={() => goal('home')}
                onCard={(t) => card('home', t)}
              />
              <div className="pt-12 font-display text-xl font-bold text-on-surface-variant">VS</div>
              <SideColumn
                name={match.away_team_name}
                score={away}
                colors={equipos[String(match.away_team_id)]?.colors}
                cards={cards}
                players={awayPlayers}
                selected={selAway}
                onSelect={setSelAway}
                onInc={() => setAway((a) => a + 1)}
                onDec={() => setAway((a) => Math.max(0, a - 1))}
                onGoal={() => goal('away')}
                onCard={(t) => card('away', t)}
                scoreClass="text-tertiary"
              />
            </div>

            <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <p className="mb-1 text-center text-xs uppercase tracking-wide text-on-surface-variant">Cambio local</p>
                <SubControl players={homePlayers} onSub={(o, i) => sub('home', o, i)} />
              </div>
              <div>
                <p className="mb-1 text-center text-xs uppercase tracking-wide text-on-surface-variant">Cambio visitante</p>
                <SubControl players={awayPlayers} onSub={(o, i) => sub('away', o, i)} />
              </div>
            </div>

            {msg && (
              <p
                className={`mt-4 text-center text-sm ${msgError ? 'text-red-400' : 'text-secondary'}`}
              >
                {msg}
              </p>
            )}

            <div className="mt-6 flex flex-wrap justify-center gap-2 border-t border-outline-variant/30 pt-5">
              <Button variant="outline" onClick={() => persist('live')}>
                <Icon name="play_circle" /> En vivo
              </Button>
              <Button variant="ghost" onClick={() => persist('live')}>
                <Icon name="save" /> Guardar
              </Button>
              <Button onClick={() => persist('finished')}>
                <Icon name="flag" /> Finalizar
              </Button>
              <Button
                variant={noJugado ? 'outline' : 'ghost'}
                onClick={() => setNoJugado((v) => !v)}
              >
                <Icon name="event_busy" /> No se jugó
              </Button>
              <Button variant="ghost" onClick={descargarActa} disabled={acta}>
                <Icon name="picture_as_pdf" /> {acta ? 'Generando…' : 'Acta'}
              </Button>
            </div>

            {/* Lo que pasa cuando el partido no se juega: se aplaza (no cuenta
                para la tabla) o alguien no se presenta (W.O., con el marcador
                que fija el reglamento). Hasta ahora la única salida era
                escribir un 3-0 a mano, indistinguible de un partido jugado. */}
            {noJugado && (
              <div className="mt-4 rounded-xl border border-tertiary/40 bg-tertiary/5 p-3">
                <div className="flex flex-wrap justify-center gap-2">
                  <Button variant="outline" onClick={aplazar}>
                    <Icon name="event_repeat" /> Aplazar
                  </Button>
                  <Button variant="ghost" onClick={() => marcarWalkover('away')}>
                    <Icon name="person_off" /> No llegó {match.away_team_name || 'el visitante'}
                  </Button>
                  <Button variant="ghost" onClick={() => marcarWalkover('home')}>
                    <Icon name="person_off" /> No llegó {match.home_team_name || 'el local'}
                  </Button>
                  <Button variant="ghost" onClick={() => marcarWalkover('both')}>
                    <Icon name="group_off" /> No llegó ninguno
                  </Button>
                </div>
                <p className="mt-2 text-center text-xs text-on-surface-variant">
                  Aplazado sale del calendario y no cuenta para la tabla. El W.O. deja el
                  partido finalizado {sportOf(tournament?.sport_type).walkoverScore[0]}-
                  {sportOf(tournament?.sport_type).walkoverScore[1]} y anotado como no jugado.
                </p>
              </div>
            )}
          </Card>

          {/* Registro en vivo */}
          <Card className="flex max-h-[72vh] flex-col p-4">
            <h4 className="mb-3 flex items-center gap-2 font-display text-sm font-semibold">
              <Icon name="bolt" className="text-secondary" /> Registro en vivo
            </h4>
            {events.length === 0 ? (
              <p className="py-10 text-center text-sm text-on-surface-variant">Sin eventos todavía.</p>
            ) : (
              <ul className="space-y-2 overflow-y-auto pr-1">
                {[...events].reverse().map((ev) => {
                  const isSub = ev.event_type === 'CAMBIO'
                  const st = eventStyle(ev.event_type)
                  const teamName =
                    ev.event_data?.team === 'home'
                      ? match.home_team_name
                      : ev.event_data?.team === 'away'
                        ? match.away_team_name
                        : ''
                  const min = ev.event_data?.minute
                  if (editing?.id === ev.id)
                    return (
                      <li
                        key={ev.id}
                        className={`rounded-lg border-l-2 bg-surface-container-high px-3 py-2 ${st.border}`}
                      >
                        <EventEditor
                          event={ev}
                          types={eventTypes}
                          homeName={match.home_team_name}
                          awayName={match.away_team_name}
                          homePlayers={homePlayers}
                          awayPlayers={awayPlayers}
                          onCancel={() => setEditing(null)}
                          onSave={(cambios) => saveEvent(ev, cambios)}
                        />
                      </li>
                    )
                  return (
                    <li
                      key={ev.id}
                      className={`flex items-start gap-2 rounded-lg border-l-2 bg-surface-container-high px-3 py-2 text-sm ${st.border}`}
                    >
                      <span className="mt-0.5 w-9 shrink-0 text-right font-display font-bold tabular-nums text-on-surface-variant">
                        {min != null ? `${min}'` : '—'}
                      </span>
                      <Icon name={st.icon} className={`mt-0.5 text-base ${st.tone}`} />
                      <span className="min-w-0 flex-1">
                        <span className={`font-semibold ${st.tone}`}>{ev.event_type}</span>
                        <span className="block truncate text-xs text-on-surface-variant">
                          {teamName}
                          {isSub
                            ? ` · entra ${playerName(ev.player_id) || '?'} / sale ${playerName(ev.event_data?.player_out) || '?'}`
                            : playerName(ev.player_id)
                              ? ` · ${playerName(ev.player_id)}`
                              : ''}
                        </span>
                      </span>
                      {puedeCorregir && (
                        <span className="flex shrink-0 items-center gap-0.5">
                          {confirmDel === ev.id ? (
                            <>
                              <button
                                onClick={() => removeEvent(ev)}
                                className="rounded px-1.5 py-0.5 text-[11px] font-bold text-red-400 hover:bg-red-500/15"
                              >
                                Borrar
                              </button>
                              <button
                                onClick={() => setConfirmDel(null)}
                                className="rounded px-1.5 py-0.5 text-[11px] text-on-surface-variant hover:bg-surface-bright"
                              >
                                No
                              </button>
                            </>
                          ) : (
                            <>
                              <button
                                onClick={() => {
                                  setConfirmDel(null)
                                  setEditing(ev)
                                }}
                                title="Corregir"
                                className="grid h-6 w-6 place-items-center rounded-full text-on-surface-variant hover:bg-surface-bright hover:text-on-surface"
                              >
                                <Icon name="edit" className="text-sm" />
                              </button>
                              <button
                                onClick={() => setConfirmDel(ev.id)}
                                title="Eliminar"
                                className="grid h-6 w-6 place-items-center rounded-full text-on-surface-variant hover:bg-red-500/15 hover:text-red-400"
                              >
                                <Icon name="delete" className="text-sm" />
                              </button>
                            </>
                          )}
                        </span>
                      )}
                    </li>
                  )
                })}
              </ul>
            )}
          </Card>
        </div>

        {/* Planilla: quiénes jugaron ese día. El acta se firma para dejar
            constancia de eso, y hasta ahora imprimía el plantel entero. */}
        <Card className="mt-4 p-4">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <h4 className="flex items-center gap-2 font-display text-sm font-semibold">
              <Icon name="assignment_ind" className="text-secondary" /> Planilla del partido
            </h4>
            <span className="text-xs text-on-surface-variant">
              Marca quién jugó: es lo que sale en el acta
            </span>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            {[
              { id: String(match.home_team_id), nombre: match.home_team_name, jugadores: homePlayers },
              { id: String(match.away_team_id), nombre: match.away_team_name, jugadores: awayPlayers },
            ].map((eq) => (
              <TeamLineup
                key={eq.id}
                teamName={eq.nombre}
                players={eq.jugadores}
                value={lineup[eq.id] || {}}
                suspendidos={suspendidos}
                dirty={!!lineupSucia[eq.id]}
                saving={guardandoLineup === eq.id}
                readOnly={!puedeCorregir}
                onToggle={(pid, activo) => tocarLineup(eq.id, pid, activo ? {} : null)}
                onStarter={(pid, starter) => tocarLineup(eq.id, pid, { starter })}
                onCaptain={(pid, captain) => tocarLineup(eq.id, pid, { captain })}
                onAll={() => todosTitulares(eq.id, eq.jugadores)}
                onSave={() => guardarLineup(eq.id)}
              />
            ))}
          </div>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-5">
      <NetBanner />
      <div>
        <p className="mb-2 text-sm text-on-surface-variant">Torneo</p>
        <div className="flex flex-wrap gap-2">
          {tournaments.map((t) => (
            <Button key={t.id} variant={tournament?.id === t.id ? 'primary' : 'ghost'} onClick={() => pickTournament(t)}>
              {t.name}
            </Button>
          ))}
        </div>
      </div>
      {tournament && (
        <div>
          <p className="mb-2 text-sm text-on-surface-variant">Fase</p>
          <div className="flex flex-wrap gap-2">
            {stages.map((s) => (
              <Button key={s.id} variant={stage?.id === s.id ? 'primary' : 'ghost'} onClick={() => pickStage(s)}>
                {s.name}
              </Button>
            ))}
          </div>
        </div>
      )}
      {stage && (
        <div>
          <label className="mb-3 flex w-fit cursor-pointer items-center gap-2 text-sm text-on-surface-variant">
            <input
              type="checkbox"
              checked={mineOnly}
              onChange={(e) => setMineOnly(e.target.checked)}
              className="accent-secondary"
            />
            Solo mis partidos asignados
          </label>
          {shownMatches.length === 0 ? (
            <EmptyState
              icon="sports_soccer"
              title={mineOnly ? 'No tienes partidos asignados en esta fase' : 'No hay partidos en esta fase'}
              hint={mineOnly ? undefined : 'Genera el fixture desde el panel de administración.'}
            />
          ) : (
            <ul className="grid gap-2 sm:grid-cols-2">
              {shownMatches.map((m) => (
                <li key={m.id}>
                  <button onClick={() => openMatch(m)} className="w-full text-left">
                    <Card className="p-4 transition hover:border-secondary/60">
                      <div className="flex items-center justify-between gap-2">
                        <span className="flex flex-1 items-center gap-1.5 truncate font-medium">
                          <span
                            className="h-2.5 w-2.5 shrink-0 rounded-full"
                            style={{ background: (equipos[String(m.home_team_id)]?.colors || [])[0] || '#64748b' }}
                          />
                          {m.home_team_name || 'Por definir'}
                        </span>
                        <span className="font-display font-bold tabular-nums">
                          {m.home_score ?? 0} - {m.away_score ?? 0}
                        </span>
                        <span className="flex flex-1 items-center justify-end gap-1.5 truncate text-right font-medium">
                          {m.away_team_name || 'Por definir'}
                          <span
                            className="h-2.5 w-2.5 shrink-0 rounded-full"
                            style={{ background: (equipos[String(m.away_team_id)]?.colors || [])[0] || '#64748b' }}
                          />
                        </span>
                      </div>
                      <div className="mt-2 flex justify-center gap-1.5">
                        {m.status === 'live' ? (
                          <LiveChip />
                        ) : (
                          <Badge className="bg-surface-container-highest text-on-surface-variant">{STATUS_LABEL[m.status] || m.status}</Badge>
                        )}
                        {m.walkover && (
                          <Badge className="bg-tertiary/15 text-tertiary">{woLabel(m.walkover)}</Badge>
                        )}
                      </div>
                      {m.referee_name && (
                        <p className="mt-1.5 flex items-center justify-center gap-1 text-xs text-on-surface-variant">
                          <Icon name="sports" className="text-sm" />
                          <span className={m.referee_id === userId ? 'font-semibold text-secondary' : ''}>
                            {m.referee_name}
                            {m.referee_id === userId ? ' · tú' : ''}
                          </span>
                        </p>
                      )}
                    </Card>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  )
}

/** Planilla de un equipo: quién jugó, quién fue titular y quién es el capitán.
 *  El delegado entrega la lista en la cancha, así que se guarda por equipo y
 *  entra en la cola de salida si no hay señal. */
function TeamLineup({
  teamName,
  players,
  value,
  suspendidos,
  dirty,
  saving,
  readOnly,
  onToggle,
  onStarter,
  onCaptain,
  onAll,
  onSave,
}: {
  teamName: string | null
  players: any[]
  value: Record<string, Alineado>
  /** jugador → motivo de su suspensión, si el torneo la calcula. */
  suspendidos: Record<string, string>
  dirty: boolean
  saving: boolean
  readOnly: boolean
  onToggle: (playerId: string, activo: boolean) => void
  onStarter: (playerId: string, starter: boolean) => void
  onCaptain: (playerId: string, captain: boolean) => void
  onAll: () => void
  onSave: () => void
}) {
  const enPlanilla = players.filter((p) => value[String(p.id)]).length
  const titulares = players.filter((p) => value[String(p.id)]?.starter).length
  return (
    <div className="rounded-xl border border-outline-variant/60 bg-surface-container-low p-3">
      <div className="mb-2 flex items-center justify-between gap-2">
        <p className="truncate font-display text-sm font-semibold">{teamName || 'Por definir'}</p>
        <span className="shrink-0 text-xs tabular-nums text-on-surface-variant">
          {enPlanilla} en planilla · {titulares} titular(es)
        </span>
      </div>
      {players.length === 0 ? (
        <p className="py-6 text-center text-xs text-on-surface-variant">
          Sin nómina cargada. El organizador la inscribe desde el panel.
        </p>
      ) : (
        <>
          <ul className="max-h-64 space-y-1 overflow-y-auto pr-1">
            {players.map((p) => {
              const v = value[String(p.id)]
              const castigo = suspendidos[String(p.id)]
              return (
                <li
                  key={p.id}
                  className={`flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm ${
                    castigo && v
                      ? 'bg-error-container/30'
                      : v
                        ? 'bg-surface-container-high'
                        : ''
                  }`}
                >
                  <button
                    disabled={readOnly}
                    onClick={() => onToggle(String(p.id), !v)}
                    title={v ? 'Sacar de la planilla' : 'Poner en la planilla'}
                    className={`grid h-6 w-6 shrink-0 place-items-center rounded ${
                      v ? 'text-secondary' : 'text-on-surface-variant'
                    } disabled:opacity-40`}
                  >
                    <Icon
                      name={v ? 'check_box' : 'check_box_outline_blank'}
                      className="text-lg"
                    />
                  </button>
                  <span className="w-6 shrink-0 text-right font-display text-xs font-bold tabular-nums text-on-surface-variant">
                    {p.number ?? ''}
                  </span>
                  <span className={`min-w-0 flex-1 truncate ${v ? '' : 'text-on-surface-variant'}`}>
                    {p.name}
                    {castigo && (
                      <span
                        title={`Suspendido: ${castigo}. La app avisa, la decisión es del organizador.`}
                        className="ml-1.5 rounded bg-error-container px-1 py-0.5 text-[10px] font-bold text-on-error-container"
                      >
                        SUSPENDIDO
                      </span>
                    )}
                  </span>
                  {v && (
                    <span className="flex shrink-0 items-center gap-1">
                      <button
                        disabled={readOnly}
                        onClick={() => onStarter(String(p.id), !v.starter)}
                        title={v.starter ? 'Titular (toca para suplente)' : 'Suplente (toca para titular)'}
                        className={`h-6 w-6 rounded-full font-display text-[11px] font-bold disabled:opacity-40 ${
                          v.starter
                            ? 'bg-secondary/20 text-secondary'
                            : 'bg-surface-bright text-on-surface-variant'
                        }`}
                      >
                        {v.starter ? 'T' : 'S'}
                      </button>
                      <button
                        disabled={readOnly}
                        onClick={() => onCaptain(String(p.id), !v.captain)}
                        title="Capitán"
                        className={`grid h-6 w-6 place-items-center rounded-full disabled:opacity-40 ${
                          v.captain ? 'text-tertiary' : 'text-on-surface-variant'
                        }`}
                      >
                        <Icon name={v.captain ? 'star' : 'star_outline'} className="text-sm" />
                      </button>
                    </span>
                  )}
                </li>
              )
            })}
          </ul>
          {!readOnly && (
            <div className="mt-2 flex items-center justify-between gap-2">
              <button
                onClick={onAll}
                className="rounded-md px-2 py-1 text-xs text-on-surface-variant hover:bg-surface-bright hover:text-on-surface"
              >
                Todos titulares
              </button>
              <Button
                variant={dirty ? 'primary' : 'ghost'}
                onClick={onSave}
                disabled={saving}
                className="px-3 py-1 text-xs"
              >
                <Icon name={dirty ? 'save' : 'check'} className="text-sm" />
                {saving ? 'Guardando…' : dirty ? 'Guardar planilla' : 'Guardada'}
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  )
}

function SideColumn({
  name,
  score,
  colors,
  cards,
  players,
  selected,
  onSelect,
  onInc,
  onDec,
  onGoal,
  onCard,
  scoreClass = 'text-secondary',
}: {
  name: string | null
  score: number
  colors?: string[]
  cards: DisciplineEvent[]
  players: any[]
  selected: string
  onSelect: (id: string) => void
  onInc: () => void
  onDec: () => void
  onGoal: () => void
  onCard: (type: string) => void
  scoreClass?: string
}) {
  const kit = colors && colors.length ? colors : ['#64748b']
  const initial = (name || '?').trim().charAt(0).toUpperCase()
  return (
    <div>
      <div
        className="mx-auto grid h-12 w-12 place-items-center rounded-full border-2 font-display text-lg font-bold"
        style={{ borderColor: kit[0], color: kit[0] }}
      >
        {initial}
      </div>
      <div className="mx-auto mb-1.5 mt-2 flex w-14 justify-center gap-0.5" title="Uniformes">
        {kit.map((col, i) => (
          <div key={i} className="h-1.5 flex-1 rounded-full" style={{ background: col }} />
        ))}
      </div>
      <p className="mb-2 truncate font-display font-semibold">{name || 'Por definir'}</p>
      <div className={`font-display text-4xl font-extrabold tabular-nums sm:text-5xl ${scoreClass}`}>
        {score}
      </div>
      <div className="mt-2 flex justify-center gap-2">
        <button onClick={onDec} className="grid h-8 w-8 place-items-center rounded-full bg-surface-container-high hover:bg-surface-bright">
          <Icon name="remove" className="text-base" />
        </button>
        <button onClick={onInc} className="grid h-8 w-8 place-items-center rounded-full bg-surface-container-high hover:bg-surface-bright">
          <Icon name="add" className="text-base" />
        </button>
      </div>
      <select
        value={selected}
        onChange={(e) => onSelect(e.target.value)}
        className="mt-3 w-full rounded-lg border border-outline-variant bg-surface-container-low px-2 py-1.5 text-sm text-on-surface"
      >
        <option value="">Jugador…</option>
        {players.map((p) => (
          <option key={p.id} value={p.id}>
            {p.number != null ? `#${p.number} ` : ''}{p.name}
          </option>
        ))}
      </select>
      <button
        onClick={onGoal}
        className="mt-2 flex w-full items-center justify-center gap-1 rounded-lg bg-secondary py-1.5 text-sm font-semibold text-on-secondary hover:brightness-110"
      >
        <Icon name="sports_soccer" className="text-base" /> Gol
      </button>
      <div className="mt-2 flex flex-wrap justify-center gap-1.5">
        {cards.map((c) => (
          <button
            key={c.type}
            onClick={() => onCard(c.type)}
            className={`rounded px-1.5 py-1 ${c.color} text-[9px] font-bold shadow`}
            title={c.label}
          >
            {c.short}
          </button>
        ))}
      </div>
    </div>
  )
}

/** Corrección de un evento ya cargado: equipo, tipo, jugador y minuto.
 *  Manda `event_data` completo para que la mezcla del backend deje el evento
 *  exactamente como se ve aquí (incluido limpiar el "sale" de un cambio que
 *  dejó de serlo). */
function EventEditor({
  event,
  types,
  homeName,
  awayName,
  homePlayers,
  awayPlayers,
  onSave,
  onCancel,
}: {
  event: any
  types: { type: string; label: string }[]
  homeName: string | null
  awayName: string | null
  homePlayers: any[]
  awayPlayers: any[]
  onSave: (cambios: any) => void
  onCancel: () => void
}) {
  const [team, setTeam] = useState<string>(event.event_data?.team || 'home')
  const [tipo, setTipo] = useState<string>(event.event_type)
  const [playerId, setPlayerId] = useState<string>(event.player_id || '')
  const [playerOut, setPlayerOut] = useState<string>(event.event_data?.player_out || '')
  const [minuto, setMinuto] = useState<string>(
    event.event_data?.minute != null ? String(event.event_data.minute) : '',
  )
  const isSub = tipo === 'CAMBIO'
  const players = team === 'away' ? awayPlayers : homePlayers
  const sel =
    'min-w-0 flex-1 rounded border border-outline-variant bg-surface-container-low px-1.5 py-1 text-xs text-on-surface'

  const opciones = players.map((p) => (
    <option key={p.id} value={p.id}>
      {p.number != null ? `#${p.number} ` : ''}
      {p.name}
    </option>
  ))

  return (
    <div className="space-y-1.5">
      <div className="flex gap-1.5">
        <select
          value={team}
          onChange={(e) => {
            // Al cambiar de equipo, el jugador elegido ya no juega ahí.
            setTeam(e.target.value)
            setPlayerId('')
            setPlayerOut('')
          }}
          className={sel}
        >
          <option value="home">{homeName || 'Local'}</option>
          <option value="away">{awayName || 'Visitante'}</option>
        </select>
        <select value={tipo} onChange={(e) => setTipo(e.target.value)} className={sel}>
          {types.map((t) => (
            <option key={t.type} value={t.type}>
              {t.label}
            </option>
          ))}
        </select>
        <label className="flex shrink-0 items-center gap-0.5 rounded border border-outline-variant bg-surface-container-low px-1.5 text-xs">
          <input
            type="number"
            min={0}
            value={minuto}
            onChange={(e) => setMinuto(e.target.value)}
            placeholder="min"
            className="w-9 bg-transparent text-center text-on-surface focus:outline-none"
          />
          <span className="text-on-surface-variant">'</span>
        </label>
      </div>
      <div className="flex gap-1.5">
        <select
          value={playerId}
          onChange={(e) => setPlayerId(e.target.value)}
          className={sel}
        >
          <option value="">{isSub ? 'Entra…' : 'Sin jugador'}</option>
          {opciones}
        </select>
        {isSub && (
          <select
            value={playerOut}
            onChange={(e) => setPlayerOut(e.target.value)}
            className={sel}
          >
            <option value="">Sale…</option>
            {opciones}
          </select>
        )}
      </div>
      <div className="flex justify-end gap-1.5">
        <button
          onClick={onCancel}
          className="rounded px-2 py-1 text-xs text-on-surface-variant hover:bg-surface-bright"
        >
          Cancelar
        </button>
        <button
          onClick={() =>
            onSave({
              player_id: playerId || null,
              event_type: tipo,
              event_data: {
                team,
                kind: tipo === 'GOL' ? 'goal' : isSub ? 'sub' : 'card',
                minute: minuto === '' ? null : Number(minuto),
                player_out: isSub ? playerOut || null : null,
              },
            })
          }
          className="rounded bg-secondary px-2 py-1 text-xs font-semibold text-on-secondary"
        >
          Guardar
        </button>
      </div>
    </div>
  )
}

function SubControl({
  players,
  onSub,
}: {
  players: any[]
  onSub: (out: string, inn: string) => void
}) {
  const [out, setOut] = useState('')
  const [inn, setInn] = useState('')
  const sel =
    'min-w-0 flex-1 rounded border border-outline-variant bg-surface-container-low px-1 py-1 text-xs text-on-surface'
  return (
    <div className="flex items-center gap-1">
      <select value={out} onChange={(e) => setOut(e.target.value)} className={sel}>
        <option value="">Sale…</option>
        {players.map((p) => (
          <option key={p.id} value={p.id}>
            {p.number != null ? `#${p.number} ` : ''}
            {p.name}
          </option>
        ))}
      </select>
      <Icon name="swap_horiz" className="text-base text-on-surface-variant" />
      <select value={inn} onChange={(e) => setInn(e.target.value)} className={sel}>
        <option value="">Entra…</option>
        {players.map((p) => (
          <option key={p.id} value={p.id}>
            {p.number != null ? `#${p.number} ` : ''}
            {p.name}
          </option>
        ))}
      </select>
      <button
        onClick={() => {
          if (out && inn) {
            onSub(out, inn)
            setOut('')
            setInn('')
          }
        }}
        className="grid h-7 w-7 shrink-0 place-items-center rounded bg-secondary text-on-secondary"
      >
        <Icon name="check" className="text-sm" />
      </button>
    </div>
  )
}
