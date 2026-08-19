import { useEffect, useState } from 'react'
import { api, syncOutbox } from '../services/api'
import { isOnline, pendingCount, subscribeOffline } from '../services/offline'
import { Badge, Button, Card, EmptyState, Icon, LiveChip, Spinner } from './ui'
import { exportMatchReportPDF } from '../utils/pdf'
import { useAppSelector } from '../hooks'
import { sportOf, type DisciplineEvent } from '../sports'

const STATUS_LABEL: Record<string, string> = {
  scheduled: 'Programado',
  live: 'En vivo',
  finished: 'Finalizado',
}

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
    setHomePlayers(m.home_team_id ? await api.getPlayers(m.home_team_id) : [])
    setAwayPlayers(m.away_team_id ? await api.getPlayers(m.away_team_id) : [])
    setEvents(await api.matchEvents(m.id))
  }
  async function refreshEvents() {
    setEvents(await api.matchEvents(match.id))
  }
  async function persist(status: string) {
    await api.updateMatchStatus(match.id, { status, home_score: home, away_score: away })
    aviso(`Marcador guardado (${STATUS_LABEL[status]})`)
    if (stage) setMatches(await api.stageMatches(stage.id))
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
              <Button variant="ghost" onClick={descargarActa} disabled={acta}>
                <Icon name="picture_as_pdf" /> {acta ? 'Generando…' : 'Acta'}
              </Button>
            </div>
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
                      <div className="mt-2 flex justify-center">
                        {m.status === 'live' ? (
                          <LiveChip />
                        ) : (
                          <Badge className="bg-surface-container-highest text-on-surface-variant">{STATUS_LABEL[m.status] || m.status}</Badge>
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
