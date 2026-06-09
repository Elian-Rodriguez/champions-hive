import { useEffect, useState } from 'react'
import { api } from '../services/api'
import { Badge, Button, Card, EmptyState, Icon, Spinner } from './ui'
import { exportMatchReportPDF } from '../utils/pdf'

const CARDS = [
  { type: 'AMARILLA', label: 'Amarilla', color: 'bg-yellow-400 text-black' },
  { type: 'AZUL', label: 'Azul', color: 'bg-blue-500 text-white' },
  { type: 'ROJA', label: 'Roja', color: 'bg-red-500 text-white' },
]
const STATUS_LABEL: Record<string, string> = {
  scheduled: 'Programado',
  live: 'En vivo',
  finished: 'Finalizado',
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
  const [msg, setMsg] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.getTournaments().then(setTournaments).finally(() => setLoading(false))
  }, [])

  // Auto-refresco cada 15s: eventos del partido abierto, o la lista de partidos.
  // No toca el marcador local en edición.
  useEffect(() => {
    const id = setInterval(() => {
      if (match) api.matchEvents(match.id).then(setEvents).catch(() => {})
      else if (stage) api.stageMatches(stage.id).then(setMatches).catch(() => {})
    }, 15000)
    return () => clearInterval(id)
  }, [match, stage])

  async function pickTournament(t: any) {
    setTournament(t)
    setStage(null)
    setMatch(null)
    setStages(await api.getStages(t.id))
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
    setMsg(null)
    setMinute('')
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
    setMsg(`Marcador guardado (${STATUS_LABEL[status]})`)
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

  function playerName(id: string | null) {
    if (!id) return ''
    const p = [...homePlayers, ...awayPlayers].find((x) => x.id === id)
    return p ? p.name : ''
  }

  if (loading)
    return (
      <div className="grid place-items-center py-20">
        <Spinner className="h-8 w-8" />
      </div>
    )

  if (match) {
    return (
      <div className="mx-auto max-w-3xl">
        <button onClick={() => setMatch(null)} className="mb-4 flex items-center gap-1 text-sm text-on-surface-variant hover:text-on-surface">
          <Icon name="arrow_back" className="text-base" /> Volver a partidos
        </button>
        <Card className="p-6">
          <div className="mb-4 flex items-center justify-center gap-3">
            <Badge className="bg-surface-container-highest text-on-surface-variant">
              {STATUS_LABEL[match.status] || match.status}
            </Badge>
            <span className="flex items-center gap-1 text-sm text-on-surface-variant">
              <Icon name="timer" className="text-base" />
              <input
                type="number"
                min={0}
                value={minute}
                onChange={(e) => setMinute(e.target.value)}
                placeholder="min"
                className="w-16 rounded-lg border border-outline-variant bg-surface-container-low px-2 py-1 text-center text-on-surface"
              />
              '
            </span>
          </div>
          <div className="grid grid-cols-3 items-start gap-2 text-center">
            <SideColumn
              name={match.home_team_name}
              score={home}
              players={homePlayers}
              selected={selHome}
              onSelect={setSelHome}
              onInc={() => setHome((h) => h + 1)}
              onDec={() => setHome((h) => Math.max(0, h - 1))}
              onGoal={() => goal('home')}
              onCard={(t) => card('home', t)}
            />
            <div className="pt-10 font-display text-2xl text-on-surface-variant">VS</div>
            <SideColumn
              name={match.away_team_name}
              score={away}
              players={awayPlayers}
              selected={selAway}
              onSelect={setSelAway}
              onInc={() => setAway((a) => a + 1)}
              onDec={() => setAway((a) => Math.max(0, a - 1))}
              onGoal={() => goal('away')}
              onCard={(t) => card('away', t)}
            />
          </div>

          <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <p className="mb-1 text-center text-xs uppercase text-on-surface-variant">Cambio local</p>
              <SubControl players={homePlayers} onSub={(o, i) => sub('home', o, i)} />
            </div>
            <div>
              <p className="mb-1 text-center text-xs uppercase text-on-surface-variant">Cambio visitante</p>
              <SubControl players={awayPlayers} onSub={(o, i) => sub('away', o, i)} />
            </div>
          </div>

          {msg && <p className="mt-4 text-center text-sm text-secondary">{msg}</p>}

          <div className="mt-6 flex flex-wrap justify-center gap-2">
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
              variant="ghost"
              onClick={() =>
                exportMatchReportPDF({ ...match, home_score: home, away_score: away }, events, playerName)
              }
            >
              <Icon name="picture_as_pdf" /> Reporte
            </Button>
          </div>

          {events.length > 0 && (
            <div className="mt-6 border-t border-outline-variant/30 pt-4">
              <h4 className="mb-2 font-display text-sm font-semibold text-on-surface-variant">Eventos</h4>
              <ul className="space-y-1 text-sm">
                {events.map((ev) => {
                  const isSub = ev.event_type === 'CAMBIO'
                  const teamName =
                    ev.event_data?.team === 'home'
                      ? match.home_team_name
                      : ev.event_data?.team === 'away'
                        ? match.away_team_name
                        : ''
                  const min = ev.event_data?.minute
                  return (
                    <li key={ev.id} className="flex items-center gap-2">
                      <Icon
                        name={isSub ? 'swap_horiz' : ev.event_type === 'GOL' ? 'sports_soccer' : 'style'}
                        className="text-base text-secondary"
                      />
                      <span className="w-8 text-right text-on-surface-variant">
                        {min != null ? `${min}'` : ''}
                      </span>
                      <span className="font-medium">{ev.event_type}</span>
                      <span className="text-on-surface-variant">
                        {teamName}
                        {isSub
                          ? ` · entra ${playerName(ev.player_id) || '?'} / sale ${playerName(ev.event_data?.player_out) || '?'}`
                          : playerName(ev.player_id)
                            ? ` · ${playerName(ev.player_id)}`
                            : ''}
                      </span>
                    </li>
                  )
                })}
              </ul>
            </div>
          )}
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-5">
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
          {matches.length === 0 ? (
            <EmptyState icon="sports_soccer" title="No hay partidos en esta fase" hint="Genera el fixture desde el panel de administración." />
          ) : (
            <ul className="grid gap-2 sm:grid-cols-2">
              {matches.map((m) => (
                <li key={m.id}>
                  <button onClick={() => openMatch(m)} className="w-full text-left">
                    <Card className="p-4 transition hover:border-secondary/60">
                      <div className="flex items-center justify-between gap-2">
                        <span className="flex-1 truncate font-medium">{m.home_team_name || 'Por definir'}</span>
                        <span className="font-display font-bold tabular-nums">
                          {m.home_score ?? 0} - {m.away_score ?? 0}
                        </span>
                        <span className="flex-1 truncate text-right font-medium">{m.away_team_name || 'Por definir'}</span>
                      </div>
                      <div className="mt-2 text-center">
                        <Badge className="bg-surface-container-highest text-on-surface-variant">{STATUS_LABEL[m.status] || m.status}</Badge>
                      </div>
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
  players,
  selected,
  onSelect,
  onInc,
  onDec,
  onGoal,
  onCard,
}: {
  name: string | null
  score: number
  players: any[]
  selected: string
  onSelect: (id: string) => void
  onInc: () => void
  onDec: () => void
  onGoal: () => void
  onCard: (type: string) => void
}) {
  return (
    <div>
      <p className="mb-2 truncate font-display font-semibold">{name || 'Por definir'}</p>
      <div className="font-display text-5xl font-extrabold tabular-nums text-secondary">{score}</div>
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
      <div className="mt-2 flex justify-center gap-1.5">
        {CARDS.map((c) => (
          <button key={c.type} onClick={() => onCard(c.type)} className={`h-8 w-6 rounded ${c.color} text-xs font-bold shadow`} title={c.label} />
        ))}
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
