import { useEffect, useState } from 'react'
import { api } from '../services/api'
import { exportStandingsPDF } from '../utils/pdf'
import { downloadImage, makeMatchImage, makeStandingsImage, shareImage } from '../utils/socialImage'
import { Badge, Button, Card, EmptyState, Icon, Spinner } from './ui'
import StandingsTable from './StandingsTable'
import TournamentBracket from './TournamentBracket'

const STATUS_LABEL: Record<string, string> = {
  scheduled: 'Programado',
  live: 'En vivo',
  finished: 'Finalizado',
}
type PubTab = 'posiciones' | 'bracket' | 'calendario' | 'estadisticas'

// Calcula quién clasifica a la siguiente fase: 2 primeros de cada grupo + los
// mejores terceros necesarios para completar un cuadro (potencia de 2).
function computeQualifiers(standings: Record<string, any[]>) {
  const groups = Object.keys(standings).filter((g) => g !== 'Sin Grupo' && standings[g]?.length)
  if (groups.length < 2) return null
  const metric = (r: any) => [r.league_points || 0, r.diff || 0, r.points_scored || 0]
  const cmp = (a: any, b: any) => {
    const ma = metric(a.row)
    const mb = metric(b.row)
    for (let i = 0; i < 3; i++) if (mb[i] !== ma[i]) return mb[i] - ma[i]
    return 0
  }
  const thirds = groups
    .map((g) => ({ group: g, row: standings[g][2] }))
    .filter((x) => x.row)
    .sort(cmp)
  const base = groups.reduce((a, g) => a + Math.min(2, standings[g].length), 0)
  const total = base + thirds.length
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
  if (!(size <= base + thirds.length && size <= total)) size = prevPow2(Math.min(total, base + thirds.length))
  size = Math.max(2, size)
  return { groups, thirds, thirdsNeeded: Math.max(0, size - base), size }
}

export default function PublicView({
  onBack,
  initialTournamentId,
}: {
  onBack: () => void
  initialTournamentId?: string | null
}) {
  const [tournaments, setTournaments] = useState<any[]>([])
  const [selected, setSelected] = useState<any>(null)
  const [stages, setStages] = useState<any[]>([])
  const [tab, setTab] = useState<PubTab>('posiciones')
  const [posStage, setPosStage] = useState<any>(null)
  const [standings, setStandings] = useState<Record<string, any[]>>({})
  const [koStage, setKoStage] = useState<any>(null)
  const [bracket, setBracket] = useState<any>(null)
  const [allMatches, setAllMatches] = useState<any[]>([])
  const [stats, setStats] = useState<any>(null)
  const [sponsors, setSponsors] = useState<any[]>([])
  const [photos, setPhotos] = useState<any[]>([])
  const [playerStats, setPlayerStats] = useState<any[]>([])
  const [teamStats, setTeamStats] = useState<any[]>([])
  const [metrics, setMetrics] = useState<any>(null)
  const [fairPlay, setFairPlay] = useState<any[]>([])
  const [shareImg, setShareImg] = useState<{ url: string; blob: Blob; label: string } | null>(null)
  const [shareBusy, setShareBusy] = useState(false)

  async function genShare(label: string, make: () => Promise<Blob>) {
    setShareBusy(true)
    try {
      const blob = await make()
      setShareImg({ url: URL.createObjectURL(blob), blob, label })
    } catch {
      /* no se pudo generar la imagen */
    } finally {
      setShareBusy(false)
    }
  }
  function closeShare() {
    if (shareImg) URL.revokeObjectURL(shareImg.url)
    setShareImg(null)
  }
  const [profile, setProfile] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api
      .getTournaments()
      .then((ts) => {
        setTournaments(ts)
        if (initialTournamentId) {
          const t = ts.find((x: any) => x.id === initialTournamentId)
          if (t) openTournament(t)
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function openTournament(t: any) {
    setSelected(t)
    setTab('posiciones')
    setStats(null)
    setSponsors([])
    setPhotos([])
    setPlayerStats([])
    setTeamStats([])
    setMetrics(null)
    setFairPlay([])
    setStandings({})
    setBracket(null)
    setAllMatches([])
    setPosStage(null)
    setKoStage(null)
    const st = await api.getStages(t.id)
    setStages(st)
    api.tournamentStats(t.id).then(setStats).catch(() => {})
    api.getSponsors(t.id).then(setSponsors).catch(() => {})
    api.getPhotos(t.id).then(setPhotos).catch(() => {})
    api.playerStats(t.id).then(setPlayerStats).catch(() => {})
    api.teamStats(t.id).then(setTeamStats).catch(() => {})
    api.metrics(t.id).then(setMetrics).catch(() => {})
    api.fairplay(t.id).then(setFairPlay).catch(() => {})
    const groupStages = st.filter((s: any) => s.type !== 'knockout')
    const koStages = st.filter((s: any) => s.type === 'knockout')
    if (groupStages[0]) selectPosStage(groupStages[0])
    if (koStages[0]) selectKoStage(koStages[0])
    const all = (
      await Promise.all(
        st.map((s: any) =>
          api
            .stageMatches(s.id)
            .then((ms: any[]) => ms.map((m) => ({ ...m, stage_name: s.name })))
            .catch(() => []),
        ),
      )
    ).flat()
    setAllMatches(all)
  }

  async function selectPosStage(s: any) {
    setPosStage(s)
    setStandings(await api.standingsByGroup(s.id).catch(() => ({})))
  }
  async function selectKoStage(s: any) {
    setKoStage(s)
    setBracket(await api.bracketTree(s.id).catch(() => null))
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

  // Auto-refresco (tiempo real ligero)
  useEffect(() => {
    if (!selected) return
    const id = setInterval(() => {
      if (posStage) api.standingsByGroup(posStage.id).then(setStandings).catch(() => {})
      if (koStage) api.bracketTree(koStage.id).then(setBracket).catch(() => {})
      api.playerStats(selected.id).then(setPlayerStats).catch(() => {})
      api.teamStats(selected.id).then(setTeamStats).catch(() => {})
      api.metrics(selected.id).then(setMetrics).catch(() => {})
      api.fairplay(selected.id).then(setFairPlay).catch(() => {})
    }, 15000)
    return () => clearInterval(id)
  }, [selected, posStage, koStage])

  const groupStages = stages.filter((s) => s.type !== 'knockout')
  const koStages = stages.filter((s) => s.type === 'knockout')
  const goalsSeries: any[] = metrics?.goals_by_date || []
  const goalsMax = Math.max(1, ...goalsSeries.map((d: any) => d.goals || 0))
  const sport = selected?.sport_type
  const scoreLabel = sport === 'basketball' ? 'Puntos' : 'Goles'
  const discCols: { key: string; label: string }[] =
    sport === 'basketball'
      ? [{ key: 'fouls', label: 'Faltas' }]
      : sport === 'micro'
        ? [{ key: 'yellow', label: '🟨' }, { key: 'blue', label: '🟦' }, { key: 'red', label: '🟥' }]
        : [{ key: 'yellow', label: '🟨' }, { key: 'red', label: '🟥' }]

  const byDate: Record<string, any[]> = {}
  allMatches.forEach((m) => {
    const d = m.scheduled_start ? String(m.scheduled_start).slice(0, 10) : 'Sin programar'
    ;(byDate[d] = byDate[d] || []).push(m)
  })
  const dates = Object.keys(byDate).sort()

  const TABS: { key: PubTab; label: string; icon: string }[] = [
    { key: 'posiciones', label: 'Posiciones / Grupos', icon: 'leaderboard' },
    { key: 'bracket', label: 'Bracket', icon: 'account_tree' },
    { key: 'calendario', label: 'Calendario', icon: 'calendar_month' },
    { key: 'estadisticas', label: 'Estadísticas', icon: 'bar_chart' },
  ]

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
            <EmptyState icon="trophy" title="No hay torneos todavía" />
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
            {selected.banner_url && <img src={selected.banner_url} alt="" className="mb-4 h-40 w-full rounded-xl object-cover" />}
            <div className="flex items-center gap-3">
              {selected.logo_url && (
                <img
                  src={selected.logo_url}
                  alt=""
                  className="h-12 w-12 shrink-0 rounded-xl border border-outline-variant/40 object-cover"
                />
              )}
              <h2 className="font-display text-2xl font-bold">{selected.name}</h2>
            </div>

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

            {sponsors.length > 0 && (
              <div className="mt-4 flex flex-wrap items-center gap-3">
                <span className="text-xs uppercase text-on-surface-variant">Patrocinan:</span>
                {sponsors.map((sp) => (
                  <a key={sp.id} href={sp.website_url || '#'} target="_blank" rel="noreferrer" className="flex items-center gap-1 text-sm hover:text-secondary">
                    {sp.logo_url ? <img src={sp.logo_url} alt={sp.name} className="h-6" /> : <Icon name="handshake" className="text-base" />}
                    {sp.name}
                  </a>
                ))}
              </div>
            )}

            {/* Tabs */}
            <div className="mt-5 flex flex-wrap gap-2 border-b border-outline-variant/30 pb-3">
              {TABS.map((t) => (
                <button
                  key={t.key}
                  onClick={() => setTab(t.key)}
                  className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition ${
                    tab === t.key ? 'bg-secondary text-on-secondary' : 'text-on-surface-variant hover:bg-surface-container-high'
                  }`}
                >
                  <Icon name={t.icon} className="text-base" /> {t.label}
                </button>
              ))}
            </div>

            <div className="mt-6">
              {tab === 'posiciones' && (
                <div>
                  <div className="mb-3 flex flex-wrap gap-2">
                    {groupStages.map((s) => (
                      <Button key={s.id} variant={posStage?.id === s.id ? 'primary' : 'ghost'} onClick={() => selectPosStage(s)}>
                        {s.name}
                      </Button>
                    ))}
                    {Object.keys(standings).length > 0 && (
                      <Button variant="outline" className="ml-auto" onClick={() => exportStandingsPDF(selected.name, standings)}>
                        <Icon name="picture_as_pdf" /> PDF
                      </Button>
                    )}
                  </div>
                  {groupStages.length === 0 ? (
                    <EmptyState icon="leaderboard" title="Sin fases de grupos/liga" />
                  ) : (
                    <div className="space-y-6">
                      {Object.entries(standings).map(([group, rows]) => (
                        <Card key={group} className="p-4">
                          <div className="mb-2 flex items-center justify-between gap-2">
                            <h3 className="font-display font-semibold">{group === 'Sin Grupo' ? 'Tabla general' : `Grupo ${group}`}</h3>
                            <button
                              onClick={() => genShare('tabla', () => makeStandingsImage(selected, group, rows, sponsors))}
                              className="flex shrink-0 items-center gap-1 rounded-lg bg-surface-container-high px-2.5 py-1.5 text-xs font-semibold text-secondary transition hover:bg-surface-bright"
                              title="Generar imagen para redes"
                            >
                              <Icon name="ios_share" className="text-sm" /> Compartir
                            </button>
                          </div>
                          <StandingsTable rows={rows} onRowClick={openProfile} />
                        </Card>
                      ))}
                      {(() => {
                        const q = computeQualifiers(standings)
                        if (!q) return null
                        return (
                          <Card accent="green" className="p-4">
                            <h3 className="mb-1 flex items-center gap-2 font-display font-semibold">
                              <Icon name="emoji_events" className="text-secondary" /> Clasificados a la siguiente fase
                            </h3>
                            <p className="mb-3 text-xs text-on-surface-variant">
                              {q.size} equipos · 2 primeros de cada grupo
                              {q.thirdsNeeded > 0
                                ? ` + ${q.thirdsNeeded} mejor${q.thirdsNeeded > 1 ? 'es' : ''} tercero${q.thirdsNeeded > 1 ? 's' : ''}`
                                : ''}
                              .
                            </p>
                            <div className="grid gap-3 sm:grid-cols-2">
                              {q.groups.map((g) => (
                                <div key={g} className="rounded-lg border border-outline-variant/30 p-2.5">
                                  <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-on-surface-variant">
                                    Grupo {g}
                                  </p>
                                  {[0, 1].map((pos) => {
                                    const r = standings[g][pos]
                                    if (!r) return null
                                    return (
                                      <div key={pos} className="flex items-center gap-2 text-sm">
                                        <Icon name="check_circle" className="text-sm text-secondary" />
                                        <span className="w-5 text-on-surface-variant">{pos + 1}.º</span>
                                        <span className="flex-1 truncate">{r.team_name}</span>
                                        <span className="text-xs text-on-surface-variant">{r.league_points ?? 0} pts</span>
                                      </div>
                                    )
                                  })}
                                </div>
                              ))}
                            </div>
                            {q.thirds.length > 0 && (
                              <div className="mt-3">
                                <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-on-surface-variant">
                                  Mejores terceros {q.thirdsNeeded > 0 ? `· clasifican ${q.thirdsNeeded}` : '· no clasifican'}
                                </p>
                                <ul className="space-y-1 text-sm">
                                  {q.thirds.map((t, i) => {
                                    const ok = i < q.thirdsNeeded
                                    return (
                                      <li
                                        key={t.group}
                                        className={`flex items-center gap-2 rounded-lg px-2 py-1.5 ${ok ? 'bg-secondary/10' : 'opacity-60'}`}
                                      >
                                        <Icon
                                          name={ok ? 'check_circle' : 'cancel'}
                                          className={`text-sm ${ok ? 'text-secondary' : 'text-on-surface-variant'}`}
                                        />
                                        <span className="flex-1 truncate">{t.row.team_name}</span>
                                        <Badge className="bg-surface-container-highest text-on-surface-variant">Grupo {t.group}</Badge>
                                        <span className="w-14 text-right text-xs text-on-surface-variant">{t.row.league_points ?? 0} pts</span>
                                      </li>
                                    )
                                  })}
                                </ul>
                              </div>
                            )}
                            <p className="mt-3 text-[11px] text-on-surface-variant">
                              Provisional: se actualiza con los resultados.
                            </p>
                          </Card>
                        )
                      })()}
                    </div>
                  )}
                </div>
              )}

              {tab === 'bracket' && (
                <div>
                  <div className="mb-3 flex flex-wrap gap-2">
                    {koStages.map((s) => (
                      <Button key={s.id} variant={koStage?.id === s.id ? 'primary' : 'ghost'} onClick={() => selectKoStage(s)}>
                        {s.name}
                      </Button>
                    ))}
                  </div>
                  {koStages.length === 0 ? (
                    <EmptyState icon="account_tree" title="Sin fases de eliminación" />
                  ) : (
                    <Card className="p-4">
                      <TournamentBracket tree={bracket} />
                    </Card>
                  )}
                </div>
              )}

              {tab === 'calendario' && (
                allMatches.length === 0 ? (
                  <EmptyState icon="event_busy" title="Sin partidos" />
                ) : (
                  <div className="space-y-5">
                    {dates.map((d) => (
                      <div key={d}>
                        <h3 className="mb-2 font-display font-semibold text-secondary">
                          {d === 'Sin programar' ? 'Sin programar' : d}
                        </h3>
                        <div className="space-y-2">
                          {byDate[d]
                            .slice()
                            .sort((a, b) => String(a.scheduled_start || '').localeCompare(String(b.scheduled_start || '')))
                            .map((m) => (
                              <Card key={m.id} className="flex flex-wrap items-center gap-2 p-3 text-sm">
                                <span className="w-12 text-on-surface-variant">
                                  {m.scheduled_start ? String(m.scheduled_start).slice(11, 16) : '--:--'}
                                </span>
                                <span className="flex-1 truncate text-right font-medium">{m.home_team_name || 'Por definir'}</span>
                                <span className="font-display font-bold tabular-nums">
                                  {m.status === 'scheduled' ? 'vs' : `${m.home_score ?? 0} - ${m.away_score ?? 0}`}
                                </span>
                                <span className="flex-1 truncate font-medium">{m.away_team_name || 'Por definir'}</span>
                                <Badge className="bg-surface-container-highest text-on-surface-variant">{STATUS_LABEL[m.status] || m.status}</Badge>
                                <button
                                  onClick={() => genShare('partido', () => makeMatchImage(selected, m, sponsors))}
                                  className="shrink-0 rounded-lg p-1.5 text-on-surface-variant transition hover:bg-surface-bright hover:text-secondary"
                                  title="Imagen para redes"
                                >
                                  <Icon name="ios_share" className="text-base" />
                                </button>
                                {(m.stage_name || m.group_name || m.court_name || m.venue_name) && (
                                  <div className="flex w-full flex-wrap items-center gap-x-3 gap-y-1 border-t border-outline-variant/20 pt-1.5 text-xs text-on-surface-variant">
                                    {m.stage_name && (
                                      <span className="flex items-center gap-1"><Icon name="account_tree" className="text-sm" /> {m.stage_name}</span>
                                    )}
                                    {m.group_name && (
                                      <span className="flex items-center gap-1"><Icon name="workspaces" className="text-sm" /> Grupo {m.group_name}</span>
                                    )}
                                    {(m.court_name || m.venue_name) && (
                                      <span className="flex items-center gap-1">
                                        <Icon name="stadium" className="text-sm" /> {[m.court_name, m.venue_name].filter(Boolean).join(' · ')}
                                      </span>
                                    )}
                                  </div>
                                )}
                              </Card>
                            ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )
              )}

              {tab === 'estadisticas' && (
                <div className="space-y-6">
                  {metrics && (
                    <Card className="p-4">
                      <h3 className="mb-3 flex items-center gap-2 font-display font-semibold">
                        <Icon name="bar_chart" className="text-secondary" /> Métricas del torneo
                      </h3>
                      <div className="mb-4 flex flex-wrap gap-3 text-sm">
                        {[
                          { label: 'Goles', v: metrics.totals?.goals },
                          { label: 'Partidos', v: metrics.totals?.matches },
                          { label: 'Amarillas', v: metrics.totals?.yellow },
                          { label: 'Rojas', v: metrics.totals?.red },
                        ].map((s) => (
                          <div key={s.label} className="rounded-lg bg-surface-container-high px-3 py-2">
                            <span className="text-on-surface-variant">{s.label}: </span>
                            <span className="font-bold text-secondary">{s.v ?? 0}</span>
                          </div>
                        ))}
                      </div>
                      {goalsSeries.length > 0 ? (
                        <div className="flex h-36 items-end gap-1.5">
                          {goalsSeries.map((d, i) => (
                            <div key={i} className="flex h-full flex-1 flex-col items-center justify-end">
                              <span className="text-[10px] font-bold">{d.goals}</span>
                              <div
                                className="w-full max-w-[30px] rounded-t bg-secondary"
                                style={{ height: `${Math.max(4, (d.goals / goalsMax) * 80)}%` }}
                                title={`${d.goals} goles`}
                              />
                              <span className="mt-1 text-[9px] text-on-surface-variant">
                                {d.date === 'Sin fecha' ? 's/f' : String(d.date).slice(5)}
                              </span>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-sm text-on-surface-variant">Aún sin goles registrados.</p>
                      )}
                      {metrics.points_progression && metrics.points_progression.length > 0 && (() => {
                        const series = metrics.points_progression
                        const maxLen = Math.max(2, ...series.map((s: any) => s.points.length))
                        const maxPts = Math.max(1, ...series.flatMap((s: any) => s.points))
                        const W = 320
                        const Hh = 120
                        const colors = ['#4ae176', '#bec6e0', '#ffb690', '#7fd1ff', '#ff9db1', '#ffd479']
                        const xx = (i: number) => (maxLen > 1 ? (i / (maxLen - 1)) * W : 0)
                        const yy = (p: number) => Hh - (p / maxPts) * Hh
                        return (
                          <div className="mt-5">
                            <p className="mb-1 text-xs font-semibold uppercase text-on-surface-variant">
                              Evolución de puntos
                            </p>
                            <svg viewBox={`0 0 ${W} ${Hh}`} preserveAspectRatio="none" className="h-32 w-full">
                              {series.map((s: any, si: number) => (
                                <polyline
                                  key={si}
                                  fill="none"
                                  stroke={colors[si % colors.length]}
                                  strokeWidth="2"
                                  points={s.points
                                    .map((p: number, i: number) => `${xx(i).toFixed(1)},${yy(p).toFixed(1)}`)
                                    .join(' ')}
                                />
                              ))}
                            </svg>
                            <div className="mt-1 flex flex-wrap gap-3 text-xs">
                              {series.map((s: any, si: number) => (
                                <span key={si} className="flex items-center gap-1">
                                  <span className="h-2 w-2 rounded-full" style={{ background: colors[si % colors.length] }} />
                                  {s.team_name}
                                </span>
                              ))}
                            </div>
                          </div>
                        )
                      })()}
                    </Card>
                  )}
                  <div className="grid gap-6 lg:grid-cols-2">
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
                              <th className="px-2 py-1 text-center">{scoreLabel}</th>
                              {discCols.map((dc) => (
                                <th key={dc.key} className="px-2 py-1 text-center">{dc.label}</th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {playerStats.slice(0, 20).map((p, i) => (
                              <tr key={p.player_id} className="border-t border-outline-variant/30">
                                <td className="px-2 py-1 text-on-surface-variant">{i + 1}</td>
                                <td className="px-2 py-1 font-medium">{p.player_name}</td>
                                <td className="px-2 py-1 text-on-surface-variant">{p.team_name || '—'}</td>
                                <td className="px-2 py-1 text-center font-bold text-secondary">{p.goals}</td>
                                {discCols.map((dc) => (
                                  <td key={dc.key} className="px-2 py-1 text-center">{p[dc.key] ?? 0}</td>
                                ))}
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
                  {fairPlay.length > 0 && (
                    <Card className="p-4">
                      <h3 className="mb-3 flex items-center gap-2 font-display font-semibold">
                        <Icon name="handshake" className="text-secondary" /> Tabla de juego limpio
                      </h3>
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="text-on-surface-variant">
                              <th className="px-2 py-1 text-left">#</th>
                              <th className="px-2 py-1 text-left">Equipo</th>
                              <th className="px-2 py-1 text-center">PJ</th>
                              {discCols.map((dc) => (
                                <th key={dc.key} className="px-2 py-1 text-center">{dc.label}</th>
                              ))}
                              <th className="px-2 py-1 text-center font-bold">Pts</th>
                            </tr>
                          </thead>
                          <tbody>
                            {fairPlay.map((r, i) => (
                              <tr key={r.team_id} className="border-t border-outline-variant/30">
                                <td className="px-2 py-1 text-on-surface-variant">{r.position ?? i + 1}</td>
                                <td className="px-2 py-1 font-medium">{r.team_name || '—'}</td>
                                <td className="px-2 py-1 text-center">{r.matches_played ?? 0}</td>
                                {discCols.map((dc) => (
                                  <td key={dc.key} className="px-2 py-1 text-center">{r[dc.key] ?? 0}</td>
                                ))}
                                <td className="px-2 py-1 text-center font-bold text-secondary">{r.penalty}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                      <p className="mt-2 text-xs text-on-surface-variant">
                        Menos puntos = juego más limpio (amarilla 1 · azul 2 · roja 3 · falta 1).
                      </p>
                    </Card>
                  )}
                </div>
              )}
            </div>

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

      {profile && (
        <div className="fixed inset-0 z-30 grid place-items-center bg-black/60 p-4" onClick={() => setProfile(null)}>
          <Card className="max-h-[85vh] w-full max-w-md overflow-y-auto p-6">
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
              {(() => {
                const tid = profile.row?.team_id
                const ts = teamStats.find((s: any) => String(s.team_id) === String(tid))
                const fp = fairPlay.find((s: any) => String(s.team_id) === String(tid))
                const micro = selected?.sport_type === 'micro'
                const cells = [
                  { label: 'Goles', value: ts?.points_scored ?? profile.row?.points_scored ?? 0 },
                  { label: 'En contra', value: ts?.points_conceded ?? profile.row?.points_conceded ?? 0 },
                  { label: 'Faltas', value: fp?.fouls ?? 0 },
                  { label: '🟨 Amar.', value: fp?.yellow ?? 0 },
                  ...(micro ? [{ label: '🟦 Azul', value: fp?.blue ?? 0 }] : []),
                  { label: '🟥 Rojas', value: fp?.red ?? 0 },
                ]
                return (
                  <div className="mb-4">
                    <h4 className="mb-1.5 text-sm font-semibold text-on-surface-variant">Estadísticas del equipo</h4>
                    <div className="grid grid-cols-3 gap-2 text-center">
                      {cells.map((c) => (
                        <div key={c.label} className="rounded-lg bg-surface-container-high p-2">
                          <p className="font-display text-xl font-bold tabular-nums">{c.value}</p>
                          <p className="text-[10px] uppercase tracking-wide text-on-surface-variant">{c.label}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )
              })()}
              {(() => {
                const entry = Object.entries(standings).find(([, rows]) =>
                  (rows as any[]).some((r) => r.team_id === profile.row?.team_id),
                )
                if (!entry) return null
                const [grp, rows] = entry as [string, any[]]
                return (
                  <div className="mb-4">
                    <h4 className="mb-1 text-sm font-semibold text-on-surface-variant">
                      Clasificación · {grp === 'Sin Grupo' ? 'General' : `Grupo ${grp}`}
                    </h4>
                    <ul className="overflow-hidden rounded-lg border border-outline-variant/30 text-sm">
                      {rows.map((r: any, i: number) => (
                        <li
                          key={r.team_id || i}
                          className={`flex items-center gap-2 px-2.5 py-1.5 ${
                            r.team_id === profile.row?.team_id
                              ? 'bg-secondary/15 font-semibold text-secondary'
                              : i % 2
                                ? 'bg-surface-container-high/40'
                                : ''
                          }`}
                        >
                          <span className="w-5 text-on-surface-variant">{r.position ?? i + 1}</span>
                          <span className="flex-1 truncate">{r.team_name}</span>
                          <span className="w-7 text-right text-xs text-on-surface-variant" title="Partidos jugados">
                            {r.matches_played ?? 0}
                          </span>
                          <span className="w-9 text-right font-bold" title="Puntos">
                            {r.league_points ?? 0}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )
              })()}

              <h4 className="mb-1.5 text-sm font-semibold text-on-surface-variant">Nómina · estadísticas por jugador</h4>
              {profile.players.length === 0 ? (
                <p className="text-sm text-on-surface-variant">Sin jugadores registrados.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-outline-variant/30 text-[10px] uppercase tracking-wide text-on-surface-variant">
                        <th className="py-1.5 text-left font-semibold">Jugador</th>
                        <th className="px-1.5 py-1.5 text-center font-semibold" title="Goles">⚽</th>
                        <th className="px-1.5 py-1.5 text-center font-semibold" title="Faltas">Fal</th>
                        <th className="px-1.5 py-1.5 text-center font-semibold" title="Amarillas">🟨</th>
                        {selected?.sport_type === 'micro' && (
                          <th className="px-1.5 py-1.5 text-center font-semibold" title="Azules">🟦</th>
                        )}
                        <th className="px-1.5 py-1.5 text-center font-semibold" title="Rojas">🟥</th>
                      </tr>
                    </thead>
                    <tbody>
                      {profile.players.map((p: any) => {
                        const ps = (playerStats.find((s: any) => s.player_id === p.id) || {}) as any
                        return (
                          <tr key={p.id} className="border-b border-outline-variant/10">
                            <td className="py-1.5 text-left">
                              {p.number != null && <span className="mr-1.5 text-on-surface-variant">#{p.number}</span>}
                              {p.name}
                            </td>
                            <td className="px-1.5 py-1.5 text-center font-semibold tabular-nums text-secondary">{ps.goals || 0}</td>
                            <td className="px-1.5 py-1.5 text-center tabular-nums text-on-surface-variant">{ps.fouls || 0}</td>
                            <td className="px-1.5 py-1.5 text-center tabular-nums text-on-surface-variant">{ps.yellow || 0}</td>
                            {selected?.sport_type === 'micro' && (
                              <td className="px-1.5 py-1.5 text-center tabular-nums text-on-surface-variant">{ps.blue || 0}</td>
                            )}
                            <td className="px-1.5 py-1.5 text-center tabular-nums text-on-surface-variant">{ps.red || 0}</td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </Card>
        </div>
      )}

      {shareBusy && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/60 backdrop-blur-sm">
          <div className="flex items-center gap-3 rounded-xl border border-outline-variant/40 bg-surface-container px-5 py-4">
            <Spinner /> Generando imagen…
          </div>
        </div>
      )}
      {shareImg && (
        <div
          className="fixed inset-0 z-50 grid place-items-center bg-black/70 p-4 backdrop-blur-sm"
          onClick={closeShare}
        >
          <div
            className="w-full max-w-sm rounded-2xl border border-outline-variant/40 bg-surface-container p-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-3 flex items-center justify-between">
              <h3 className="font-display font-semibold">Imagen para redes</h3>
              <button onClick={closeShare} className="text-on-surface-variant hover:text-on-surface">
                <Icon name="close" />
              </button>
            </div>
            <img src={shareImg.url} alt="" className="w-full rounded-xl border border-outline-variant/40" />
            <div className="mt-4 flex gap-2">
              <Button
                className="flex-1"
                onClick={() =>
                  shareImage(shareImg.blob, `championhive-${shareImg.label}.png`, selected?.name || 'Champion Hive')
                }
              >
                <Icon name="share" /> Compartir
              </Button>
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => downloadImage(shareImg.blob, `championhive-${shareImg.label}.png`)}
              >
                <Icon name="download" /> Descargar
              </Button>
            </div>
            <p className="mt-2 text-center text-xs text-on-surface-variant">
              «Compartir» abre WhatsApp/Instagram en el celular.
            </p>
          </div>
        </div>
      )}
    </div>
  )
}
