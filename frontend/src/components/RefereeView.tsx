import { useEffect, useState } from 'react'
import { api } from '../services/api'
import { Badge, Button, Card, EmptyState, Icon, Spinner } from './ui'

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
  const [msg, setMsg] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api
      .getTournaments()
      .then(setTournaments)
      .finally(() => setLoading(false))
  }, [])

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
  function openMatch(m: any) {
    setMatch(m)
    setHome(m.home_score || 0)
    setAway(m.away_score || 0)
    setMsg(null)
  }

  async function persist(status: string) {
    await api.updateMatchStatus(match.id, {
      status,
      home_score: home,
      away_score: away,
    })
    setMsg(`Marcador guardado (${STATUS_LABEL[status]})`)
    if (stage) setMatches(await api.stageMatches(stage.id))
  }
  async function card(team: 'home' | 'away', type: string) {
    await api.recordEvent({
      match_id: match.id,
      event_type: type,
      event_data: { team, kind: 'card' },
    })
    setMsg(`Tarjeta ${type} registrada (${team === 'home' ? 'local' : 'visitante'})`)
  }

  if (loading)
    return (
      <div className="grid place-items-center py-20">
        <Spinner className="h-8 w-8" />
      </div>
    )

  // --- Consola de un partido ---
  if (match) {
    return (
      <div className="mx-auto max-w-2xl">
        <button
          onClick={() => setMatch(null)}
          className="mb-4 flex items-center gap-1 text-sm text-on-surface-variant hover:text-on-surface"
        >
          <Icon name="arrow_back" className="text-base" /> Volver a partidos
        </button>
        <Card className="p-6">
          <div className="mb-4 flex items-center justify-center">
            <Badge className="bg-surface-container-highest text-on-surface-variant">
              {STATUS_LABEL[match.status] || match.status}
            </Badge>
          </div>
          <div className="grid grid-cols-3 items-center gap-2 text-center">
            <ScoreColumn
              name={match.home_team_name}
              score={home}
              onInc={() => setHome((h) => h + 1)}
              onDec={() => setHome((h) => Math.max(0, h - 1))}
            />
            <div className="font-display text-2xl text-on-surface-variant">VS</div>
            <ScoreColumn
              name={match.away_team_name}
              score={away}
              onInc={() => setAway((a) => a + 1)}
              onDec={() => setAway((a) => Math.max(0, a - 1))}
            />
          </div>

          <div className="mt-6 grid grid-cols-2 gap-4">
            {(['home', 'away'] as const).map((side) => (
              <div key={side}>
                <p className="mb-2 text-center text-xs uppercase text-on-surface-variant">
                  Tarjetas {side === 'home' ? 'local' : 'visitante'}
                </p>
                <div className="flex justify-center gap-2">
                  {CARDS.map((c) => (
                    <button
                      key={c.type}
                      onClick={() => card(side, c.type)}
                      className={`h-9 w-7 rounded ${c.color} text-xs font-bold shadow`}
                      title={c.label}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>

          {msg && (
            <p className="mt-4 text-center text-sm text-secondary">{msg}</p>
          )}

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
          </div>
        </Card>
      </div>
    )
  }

  // --- Navegación: torneo -> fase -> partidos ---
  return (
    <div className="space-y-5">
      <div>
        <p className="mb-2 text-sm text-on-surface-variant">Torneo</p>
        <div className="flex flex-wrap gap-2">
          {tournaments.map((t) => (
            <Button
              key={t.id}
              variant={tournament?.id === t.id ? 'primary' : 'ghost'}
              onClick={() => pickTournament(t)}
            >
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
              <Button
                key={s.id}
                variant={stage?.id === s.id ? 'primary' : 'ghost'}
                onClick={() => pickStage(s)}
              >
                {s.name}
              </Button>
            ))}
          </div>
        </div>
      )}

      {stage && (
        <div>
          {matches.length === 0 ? (
            <EmptyState
              icon="sports_soccer"
              title="No hay partidos en esta fase"
              hint="Genera el fixture desde el panel de administración."
            />
          ) : (
            <ul className="grid gap-2 sm:grid-cols-2">
              {matches.map((m) => (
                <li key={m.id}>
                  <button onClick={() => openMatch(m)} className="w-full text-left">
                    <Card className="p-4 transition hover:border-secondary/60">
                      <div className="flex items-center justify-between">
                        <span className="font-medium">
                          {m.home_team_name || 'Por definir'}
                        </span>
                        <span className="font-display font-bold tabular-nums">
                          {m.home_score ?? 0} - {m.away_score ?? 0}
                        </span>
                        <span className="font-medium">
                          {m.away_team_name || 'Por definir'}
                        </span>
                      </div>
                      <div className="mt-2 text-center">
                        <Badge className="bg-surface-container-highest text-on-surface-variant">
                          {STATUS_LABEL[m.status] || m.status}
                        </Badge>
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

function ScoreColumn({
  name,
  score,
  onInc,
  onDec,
}: {
  name: string | null
  score: number
  onInc: () => void
  onDec: () => void
}) {
  return (
    <div>
      <p className="mb-2 truncate font-display font-semibold">
        {name || 'Por definir'}
      </p>
      <div className="font-display text-5xl font-extrabold tabular-nums text-secondary">
        {score}
      </div>
      <div className="mt-2 flex justify-center gap-2">
        <button
          onClick={onDec}
          className="grid h-9 w-9 place-items-center rounded-full bg-surface-container-high hover:bg-surface-bright"
        >
          <Icon name="remove" />
        </button>
        <button
          onClick={onInc}
          className="grid h-9 w-9 place-items-center rounded-full bg-secondary text-on-secondary hover:brightness-110"
        >
          <Icon name="add" />
        </button>
      </div>
    </div>
  )
}
