import { useEffect, useState } from 'react'
import { api } from '../services/api'
import { exportStandingsPDF } from '../utils/pdf'
import { Badge, Button, Card, EmptyState, Icon, Spinner } from './ui'
import StandingsTable from './StandingsTable'
import TournamentBracket from './TournamentBracket'

export default function PublicView({ onBack }: { onBack: () => void }) {
  const [tournaments, setTournaments] = useState<any[]>([])
  const [selected, setSelected] = useState<any>(null)
  const [stages, setStages] = useState<any[]>([])
  const [activeStage, setActiveStage] = useState<any>(null)
  const [standings, setStandings] = useState<Record<string, any[]>>({})
  const [bracket, setBracket] = useState<any>(null)
  const [stats, setStats] = useState<any>(null)
  const [sponsors, setSponsors] = useState<any[]>([])
  const [photos, setPhotos] = useState<any[]>([])
  const [playerStats, setPlayerStats] = useState<any[]>([])
  const [teamStats, setTeamStats] = useState<any[]>([])
  const [profile, setProfile] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.getTournaments().then(setTournaments).catch(() => setTournaments([])).finally(() => setLoading(false))
  }, [])

  async function openTournament(t: any) {
    setSelected(t)
    setStats(null)
    setSponsors([])
    setPhotos([])
    setPlayerStats([])
    setTeamStats([])
    const st = await api.getStages(t.id)
    setStages(st)
    api.tournamentStats(t.id).then(setStats).catch(() => {})
    api.getSponsors(t.id).then(setSponsors).catch(() => {})
    api.getPhotos(t.id).then(setPhotos).catch(() => {})
    api.playerStats(t.id).then(setPlayerStats).catch(() => setPlayerStats([]))
    api.teamStats(t.id).then(setTeamStats).catch(() => setTeamStats([]))
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

  async function openProfile(row: any) {
    if (!row.team_id) return
    let players: any[] = []
    try {
      players = await api.getPlayers(row.team_id)
    } catch {
      /* sin plantilla */
    }
    setProfile({ name: row.team_name || 'Equipo', row, players })
  }

  // Auto-refresco (tiempo real ligero) cada 15s del torneo abierto
  useEffect(() => {
    if (!selected) return
    const id = setInterval(() => {
      if (activeStage) {
        if (activeStage.type === 'knockout')
          api.bracketTree(activeStage.id).then(setBracket).catch(() => {})
        else api.standingsByGroup(activeStage.id).then(setStandings).catch(() => {})
      }
      api.playerStats(selected.id).then(setPlayerStats).catch(() => {})
      api.teamStats(selected.id).then(setTeamStats).catch(() => {})
    }, 15000)
    return () => clearInterval(id)
  }, [selected, activeStage])

  const hasStandings = Object.keys(standings).length > 0

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
                      <span className="grid h-10 w-10 place-items-center overflow-hidden rounded-lg bg-secondary-container/40 text-secondary">
                        {t.logo_url ? <img src={t.logo_url} alt="" className="h-full w-full object-cover" /> : <Icon name="emoji_events" />}
                      </span>
                      <div>
                        <h3 className="font-display font-semibold">{t.name}</h3>
                        <p className="text-xs uppercase tracking-wide text-on-surface-variant">{t.sport_type} · {t.status}</p>
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

            {selected.banner_url && (
              <img src={selected.banner_url} alt="" className="mb-4 h-40 w-full rounded-xl object-cover" />
            )}
            <h2 className="font-display text-2xl font-bold">{selected.name}</h2>

            {/* Stats */}
            {stats && (
              <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
                {[
                  { k: 'teams', label: 'Equipos', icon: 'groups' },
                  { k: 'stages', label: 'Fases', icon: 'account_tree' },
                  { k: 'matches', label: 'Partidos', icon: 'sports_soccer' },
                  { k: 'finished_matches', label: 'Jugados', icon: 'check_circle' },
                ].map((s) => (
                  <div key={s.k} className="rounded-xl bg-surface-container p-4">
                    <Icon name={s.icon} className="text-secondary" />
                    <p className="mt-1 font-display text-2xl font-bold">{stats[s.k]}</p>
                    <p className="text-xs text-on-surface-variant">{s.label}</p>
                  </div>
                ))}
              </div>
            )}

            {/* Sponsors */}
            {sponsors.length > 0 && (
              <div className="mt-4 flex flex-wrap items-center gap-3">
                <span className="text-xs uppercase text-on-surface-variant">Patrocinan:</span>
                {sponsors.map((sp) => (
                  <a key={sp.id} href={sp.website_url || '#'} target="_blank" rel="noreferrer" className="flex items-center gap-1 text-sm text-on-surface hover:text-secondary">
                    {sp.logo_url ? <img src={sp.logo_url} alt={sp.name} className="h-6" /> : <Icon name="handshake" className="text-base" />}
                    {sp.name}
                  </a>
                ))}
              </div>
            )}

            {/* Stage tabs */}
            <div className="mt-5 flex flex-wrap items-center gap-2">
              {stages.map((s) => (
                <Button key={s.id} variant={activeStage?.id === s.id ? 'primary' : 'ghost'} onClick={() => selectStage(s)}>
                  {s.name}
                </Button>
              ))}
              {hasStandings && (
                <Button variant="outline" className="ml-auto" onClick={() => exportStandingsPDF(selected.name, standings)}>
                  <Icon name="picture_as_pdf" /> Exportar PDF
                </Button>
              )}
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
                      <StandingsTable rows={rows} onRowClick={openProfile} />
                    </Card>
                  ))}
                </div>
              )}
            </div>

            {/* Estadísticas del torneo */}
            {(playerStats.length > 0 || teamStats.length > 0) && (
              <div className="mt-8 grid gap-6 lg:grid-cols-2">
                <Card className="p-4">
                  <h3 className="mb-3 flex items-center gap-2 font-display font-semibold">
                    <Icon name="sports_soccer" className="text-secondary" /> Goleadores
                  </h3>
                  {playerStats.length === 0 ? (
                    <p className="text-sm text-on-surface-variant">Sin datos de jugadores.</p>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="text-on-surface-variant">
                            <th className="px-2 py-1 text-left">#</th>
                            <th className="px-2 py-1 text-left">Jugador</th>
                            <th className="px-2 py-1 text-left">Equipo</th>
                            <th className="px-2 py-1 text-center">Goles</th>
                            <th className="px-2 py-1 text-center">PJ</th>
                            <th className="px-2 py-1 text-center">🟨</th>
                            <th className="px-2 py-1 text-center">🟥</th>
                          </tr>
                        </thead>
                        <tbody>
                          {playerStats.slice(0, 15).map((p, i) => (
                            <tr key={p.player_id} className="border-t border-outline-variant/30">
                              <td className="px-2 py-1 text-on-surface-variant">{i + 1}</td>
                              <td className="px-2 py-1 font-medium">{p.player_name}</td>
                              <td className="px-2 py-1 text-on-surface-variant">{p.team_name || '—'}</td>
                              <td className="px-2 py-1 text-center font-bold text-secondary">{p.goals}</td>
                              <td className="px-2 py-1 text-center">{p.matches}</td>
                              <td className="px-2 py-1 text-center">{p.yellow}</td>
                              <td className="px-2 py-1 text-center">{p.red}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </Card>
                <Card className="p-4">
                  <h3 className="mb-3 flex items-center gap-2 font-display font-semibold">
                    <Icon name="groups" className="text-secondary" /> Estadísticas por equipo
                  </h3>
                  <StandingsTable rows={teamStats} onRowClick={openProfile} />
                </Card>
              </div>
            )}

            {/* Photos */}
            {photos.length > 0 && (
              <div className="mt-8">
                <h3 className="mb-2 font-display font-semibold">Galería</h3>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                  {photos.map((p) => (
                    <figure key={p.id}>
                      <img src={p.url} alt={p.caption || ''} className="h-28 w-full rounded-lg object-cover" />
                      {p.caption && <figcaption className="mt-1 text-xs text-on-surface-variant">{p.caption}</figcaption>}
                    </figure>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </main>

      {/* Perfil de equipo */}
      {profile && (
        <div className="fixed inset-0 z-30 grid place-items-center bg-black/60 p-4" onClick={() => setProfile(null)}>
          <Card className="w-full max-w-md p-6" >
            <div className="mb-4 flex items-center justify-between" onClick={(e) => e.stopPropagation()}>
              <h3 className="font-display text-xl font-bold">{profile.name}</h3>
              <button onClick={() => setProfile(null)}>
                <Icon name="close" />
              </button>
            </div>
            <div onClick={(e) => e.stopPropagation()}>
              <div className="mb-3 flex gap-2">
                <Badge className="bg-surface-container-highest text-on-surface-variant">Pts: {profile.row?.league_points ?? 0}</Badge>
                <Badge className="bg-surface-container-highest text-on-surface-variant">PJ: {profile.row?.matches_played ?? 0}</Badge>
                <Badge className="bg-surface-container-highest text-on-surface-variant">DIF: {profile.row?.diff ?? 0}</Badge>
              </div>
              <h4 className="mb-1 text-sm font-semibold text-on-surface-variant">Plantilla</h4>
              {profile.players.length === 0 ? (
                <p className="text-sm text-on-surface-variant">Sin jugadores registrados.</p>
              ) : (
                <ul className="space-y-1 text-sm">
                  {profile.players.map((p: any) => (
                    <li key={p.id} className="flex items-center gap-2">
                      {p.number != null && <span className="w-6 text-on-surface-variant">#{p.number}</span>}
                      {p.name}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </Card>
        </div>
      )}
    </div>
  )
}
