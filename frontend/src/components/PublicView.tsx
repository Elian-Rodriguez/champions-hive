import { useEffect, useState } from 'react'
import { api } from '../services/api'
import { Button, Card, EmptyState, Icon, Spinner } from './ui'
import StandingsTable from './StandingsTable'
import TournamentBracket from './TournamentBracket'

export default function PublicView({ onBack }: { onBack: () => void }) {
  const [tournaments, setTournaments] = useState<any[]>([])
  const [selected, setSelected] = useState<any>(null)
  const [stages, setStages] = useState<any[]>([])
  const [activeStage, setActiveStage] = useState<any>(null)
  const [standings, setStandings] = useState<Record<string, any[]>>({})
  const [bracket, setBracket] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api
      .getTournaments()
      .then(setTournaments)
      .catch(() => setTournaments([]))
      .finally(() => setLoading(false))
  }, [])

  async function openTournament(t: any) {
    setSelected(t)
    const st = await api.getStages(t.id)
    setStages(st)
    if (st[0]) selectStage(st[0])
    else {
      setActiveStage(null)
      setStandings({})
      setBracket(null)
    }
  }

  async function selectStage(s: any) {
    setActiveStage(s)
    setBracket(null)
    setStandings({})
    if (s.type === 'knockout') setBracket(await api.bracketTree(s.id))
    else setStandings(await api.standingsByGroup(s.id))
  }

  return (
    <div className="min-h-screen bg-surface text-on-surface">
      <header className="border-b border-outline-variant/40 bg-surface-container-low">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
          <button onClick={onBack} className="flex items-center gap-1 text-sm text-on-surface-variant hover:text-on-surface">
            <Icon name="arrow_back" className="text-base" /> Inicio
          </button>
          <span className="flex items-center gap-2 font-display font-bold">
            <Icon name="scoreboard" className="text-secondary" /> Marcador público
          </span>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-6">
        {loading ? (
          <div className="grid place-items-center py-20">
            <Spinner className="h-8 w-8" />
          </div>
        ) : !selected ? (
          tournaments.length === 0 ? (
            <EmptyState icon="trophy" title="No hay torneos públicos todavía" />
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {tournaments.map((t) => (
                <button key={t.id} onClick={() => openTournament(t)} className="text-left">
                  <Card className="h-full p-5 transition hover:border-secondary/60">
                    <div className="flex items-center gap-3">
                      <span className="grid h-10 w-10 place-items-center rounded-lg bg-secondary-container/40 text-secondary">
                        <Icon name="emoji_events" />
                      </span>
                      <div>
                        <h3 className="font-display font-semibold">{t.name}</h3>
                        <p className="text-xs uppercase tracking-wide text-on-surface-variant">
                          {t.sport_type} · {t.status}
                        </p>
                      </div>
                    </div>
                  </Card>
                </button>
              ))}
            </div>
          )
        ) : (
          <div>
            <button onClick={() => setSelected(null)} className="mb-4 flex items-center gap-1 text-sm text-on-surface-variant hover:text-on-surface">
              <Icon name="arrow_back" className="text-base" /> Todos los torneos
            </button>
            <h2 className="font-display text-2xl font-bold">{selected.name}</h2>

            <div className="mt-4 flex flex-wrap gap-2">
              {stages.map((s) => (
                <Button
                  key={s.id}
                  variant={activeStage?.id === s.id ? 'primary' : 'ghost'}
                  onClick={() => selectStage(s)}
                >
                  {s.name}
                </Button>
              ))}
            </div>

            <div className="mt-6">
              {!activeStage ? (
                <EmptyState icon="account_tree" title="Este torneo aún no tiene fases" />
              ) : bracket ? (
                <Card className="p-4">
                  <TournamentBracket tree={bracket} />
                </Card>
              ) : (
                <div className="space-y-6">
                  {Object.entries(standings).map(([group, rows]) => (
                    <Card key={group} className="p-4">
                      <h3 className="mb-2 font-display font-semibold">
                        {group === 'Sin Grupo' ? 'Tabla general' : `Grupo ${group}`}
                      </h3>
                      <StandingsTable rows={rows} />
                    </Card>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
