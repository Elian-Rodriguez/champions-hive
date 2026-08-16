import { useEffect, useState } from 'react'
import { api } from '../services/api'
import { exportStandingsPDF } from '../utils/pdf'
import { downloadImage, makeMatchImage, makeStandingsImage, shareImage } from '../utils/socialImage'
import QRCode from 'qrcode'
import { Badge, Button, Card, EmptyState, Icon, Spinner } from './ui'
import StandingsTable from './StandingsTable'
import TournamentBracket from './TournamentBracket'
import { hasBlueCard, sportOf } from '../sports'
import type { StatScope } from '../services/api'

const STATUS_LABEL: Record<string, string> = {
  scheduled: 'Programado',
  live: 'En vivo',
  finished: 'Finalizado',
}
type PubTab = 'posiciones' | 'bracket' | 'calendario' | 'estadisticas'

// Alcance por defecto de las estadísticas: todas las fases del torneo.
const TODAS_LAS_FASES: StatScope = { stageId: null, mode: 'from' }

// Racha (forma) de un equipo: secuencia W/D/L de sus partidos finalizados, en
// orden cronológico (los más recientes al final).
function teamForm(allMatches: any[], teamId: string): string[] {
  return (allMatches || [])
    .filter((m) => m.status === 'finished' && (m.home_team_id === teamId || m.away_team_id === teamId))
    .sort((a, b) => String(a.scheduled_start || '').localeCompare(String(b.scheduled_start || '')))
    .map((m) => {
      const home = m.home_team_id === teamId
      const gf = home ? m.home_score ?? 0 : m.away_score ?? 0
      const ga = home ? m.away_score ?? 0 : m.home_score ?? 0
      return gf > ga ? 'W' : gf < ga ? 'L' : 'D'
    })
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
  const [qualifiers, setQualifiers] = useState<any>(null)
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
  const [valla, setValla] = useState<any[]>([])
  const [statScope, setStatScope] = useState<StatScope>(TODAS_LAS_FASES)
  const [shareImg, setShareImg] = useState<{ url: string; blob: Blob; label: string } | null>(null)
  const [shareBusy, setShareBusy] = useState(false)
  const [qr, setQr] = useState<{ data: string; link: string } | null>(null)

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
  async function showQR() {
    if (!selected) return
    const link = `${window.location.origin}/?t=${selected.id}`
    try {
      const data = await QRCode.toDataURL(link, {
        width: 600,
        margin: 2,
        color: { dark: '#081425', light: '#ffffff' },
      })
      setQr({ data, link })
    } catch {
      /* no se pudo generar el QR */
    }
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

  // Las estadísticas (goleadores, valla, sancionados) se recalculan según el
  // alcance elegido; por defecto cuentan todas las fases del torneo.
  function loadStats(tid: string, scope: StatScope) {
    api.playerStats(tid, scope).then(setPlayerStats).catch(() => {})
    api.teamStats(tid, scope).then(setTeamStats).catch(() => {})
    api.valla(tid, scope).then(setValla).catch(() => setValla([]))
    // Si el organizador oculta las sanciones el backend responde 403: se deja
    // la tabla vacía y la sección simplemente no se muestra.
    api.fairplay(tid, scope).then(setFairPlay).catch(() => setFairPlay([]))
  }

  async function openTournament(t: any) {
    setSelected(t)
    setTab('posiciones')
    setStatScope(TODAS_LAS_FASES)
    setStats(null)
    setSponsors([])
    setPhotos([])
    setPlayerStats([])
    setTeamStats([])
    setMetrics(null)
    setFairPlay([])
    setStandings({})
    setQualifiers(null)
    setBracket(null)
    setAllMatches([])
    setPosStage(null)
    setKoStage(null)
    const st = await api.getStages(t.id)
    setStages(st)
    api.tournamentStats(t.id).then(setStats).catch(() => {})
    api.getSponsors(t.id).then(setSponsors).catch(() => {})
    api.getPhotos(t.id).then(setPhotos).catch(() => {})
    api.metrics(t.id).then(setMetrics).catch(() => {})
    loadStats(t.id, TODAS_LAS_FASES)
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
    setQualifiers(await api.qualifiers(s.id).catch(() => null))
  }
  async function selectKoStage(s: any) {
    setKoStage(s)
    setBracket(await api.bracketTree(s.id).catch(() => null))
  }
  async function openProfile(row: any) {
    if (!row.team_id) return
    let players: any[] = []
    // El organizador puede ocultar las nóminas: el backend responde 403 y se
    // distingue de "el equipo no cargó jugadores" para no dar a entender que
    // la plantilla está vacía.
    let oculta = false
    try {
      players = await api.getPlayers(row.team_id)
    } catch (e: any) {
      oculta = /no publica/i.test(e?.message || '')
    }
    setProfile({ name: row.team_name || 'Equipo', row, players, oculta })
  }

  // Recarga inmediata al cambiar desde qué fase cuentan las estadísticas
  // (sin esperar al auto-refresco).
  useEffect(() => {
    if (selected) loadStats(selected.id, statScope)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statScope])

  // Auto-refresco (tiempo real ligero)
  useEffect(() => {
    if (!selected) return
    const id = setInterval(() => {
      if (posStage) {
        api.standingsByGroup(posStage.id).then(setStandings).catch(() => {})
        api.qualifiers(posStage.id).then(setQualifiers).catch(() => {})
      }
      if (koStage) api.bracketTree(koStage.id).then(setBracket).catch(() => {})
      api.metrics(selected.id).then(setMetrics).catch(() => {})
      loadStats(selected.id, statScope)
    }, 15000)
    return () => clearInterval(id)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selected, posStage, koStage, statScope])

  const groupStages = stages.filter((s) => s.type !== 'knockout')
  const koStages = stages.filter((s) => s.type === 'knockout')
  const goalsSeries: any[] = metrics?.goals_by_date || []
  const goalsMax = Math.max(1, ...goalsSeries.map((d: any) => d.goals || 0))
  const sport = selected?.sport_type
  const scoreLabel = sportOf(sport).scoreLabel
  const discCols = sportOf(sport).discColumns

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
            <div className="mb-4 flex items-center justify-between gap-2">
              <button onClick={() => setSelected(null)} className="flex items-center gap-1 text-sm text-on-surface-variant hover:text-on-surface">
                <Icon name="arrow_back" className="text-base" /> Todos los torneos
              </button>
              <button
                onClick={showQR}
                className="flex items-center gap-1.5 rounded-lg bg-surface-container-high px-3 py-1.5 text-sm font-semibold text-secondary transition hover:bg-surface-bright"
                title="Código QR del marcador en vivo"
              >
                <Icon name="qr_code_2" className="text-base" /> QR
              </button>
            </div>
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
                        const q = qualifiers
                        if (!q) return null
                        const perGroup = q.qualifiers_per_group
                        const repLabel = perGroup === 1 ? 'segundos' : 'terceros'
                        return (
                          <Card accent="green" className="p-4">
                            <h3 className="mb-1 flex items-center gap-2 font-display font-semibold">
                              <Icon name="emoji_events" className="text-secondary" /> Clasificados a la siguiente fase
                            </h3>
                            <p className="mb-3 text-xs text-on-surface-variant">
                              {q.bracket_size} equipos · {perGroup} primero{perGroup > 1 ? 's' : ''} de cada grupo
                              {q.extras_needed > 0
                                ? ` + ${q.extras_needed} mejor${q.extras_needed > 1 ? 'es' : ''} ${perGroup === 1 ? 'segundo' : 'tercero'}${q.extras_needed > 1 ? 's' : ''}`
                                : ''}
                              .
                            </p>
                            <div className="grid gap-3 sm:grid-cols-2">
                              {q.groups.map((g: string) => (
                                <div key={g} className="rounded-lg border border-outline-variant/30 p-2.5">
                                  <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-on-surface-variant">
                                    Grupo {g}
                                  </p>
                                  {q.direct
                                    .filter((r: any) => r.from_group === g)
                                    .map((r: any, pos: number) => (
                                      <div key={r.team_id} className="flex items-center gap-2 text-sm">
                                        <Icon name="check_circle" className="text-sm text-secondary" />
                                        <span className="w-5 text-on-surface-variant">{pos + 1}.º</span>
                                        <span className="flex-1 truncate">{r.team_name}</span>
                                        <span className="text-xs text-on-surface-variant">{r.league_points ?? 0} pts</span>
                                      </div>
                                    ))}
                                </div>
                              ))}
                            </div>
                            {q.extras.length > 0 && (
                              <div className="mt-3">
                                <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-on-surface-variant">
                                  Mejores {repLabel} {q.extras_needed > 0 ? `· clasifican ${q.extras_needed}` : '· no clasifican'}
                                </p>
                                <ul className="space-y-1 text-sm">
                                  {q.extras.map((t: any) => (
                                    <li
                                      key={t.team_id}
                                      className={`flex items-center gap-2 rounded-lg px-2 py-1.5 ${t.qualifies ? 'bg-secondary/10' : 'opacity-60'}`}
                                    >
                                      <Icon
                                        name={t.qualifies ? 'check_circle' : 'cancel'}
                                        className={`text-sm ${t.qualifies ? 'text-secondary' : 'text-on-surface-variant'}`}
                                      />
                                      <span className="flex-1 truncate">{t.team_name}</span>
                                      <Badge className="bg-surface-container-highest text-on-surface-variant">Grupo {t.from_group}</Badge>
                                      <span className="w-14 text-right text-xs text-on-surface-variant">{t.league_points ?? 0} pts</span>
                                    </li>
                                  ))}
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
                  {stages.length > 1 && (
                    <Card className="p-3">
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
                        <span className="flex items-center gap-1.5 text-sm font-semibold">
                          <Icon name="filter_alt" className="text-base text-secondary" />
                          Cuentan desde
                        </span>
                        <div className="flex flex-wrap gap-1.5">
                          <button
                            onClick={() => setStatScope(TODAS_LAS_FASES)}
                            className={`rounded-full border px-2.5 py-1 text-xs transition ${
                              !statScope.stageId
                                ? 'border-secondary bg-secondary/15 text-secondary'
                                : 'border-outline-variant text-on-surface-variant hover:border-outline'
                            }`}
                          >
                            Todas las fases
                          </button>
                          {stages.map((s) => (
                            <button
                              key={s.id}
                              onClick={() =>
                                setStatScope({ stageId: s.id, mode: statScope.mode })
                              }
                              className={`rounded-full border px-2.5 py-1 text-xs transition ${
                                statScope.stageId === s.id
                                  ? 'border-secondary bg-secondary/15 text-secondary'
                                  : 'border-outline-variant text-on-surface-variant hover:border-outline'
                              }`}
                            >
                              {s.name}
                            </button>
                          ))}
                        </div>
                        {statScope.stageId && (
                          <label className="flex items-center gap-1.5 text-xs text-on-surface-variant">
                            <input
                              type="checkbox"
                              checked={statScope.mode === 'only'}
                              onChange={(e) =>
                                setStatScope({
                                  stageId: statScope.stageId,
                                  mode: e.target.checked ? 'only' : 'from',
                                })
                              }
                              className="h-3.5 w-3.5 accent-secondary"
                            />
                            Solo esa fase
                          </label>
                        )}
                      </div>
                      <p className="mt-1.5 text-xs text-on-surface-variant">
                        {!statScope.stageId
                          ? 'Goleadores, valla menos vencida y sanciones suman todo el torneo.'
                          : statScope.mode === 'only'
                            ? 'Solo se cuenta lo ocurrido en esa fase.'
                            : 'Se cuenta esa fase y todas las posteriores.'}
                      </p>
                    </Card>
                  )}
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
                  {valla.length > 0 && (
                    <Card className="p-4">
                      <h3 className="mb-3 flex items-center gap-2 font-display font-semibold">
                        <Icon name="shield" className="text-secondary" /> Valla menos vencida
                      </h3>
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="text-[10px] uppercase tracking-wide text-on-surface-variant">
                              <th className="px-2 py-1 text-left">#</th>
                              <th className="px-2 py-1 text-left">Equipo</th>
                              <th className="px-2 py-1 text-center">PJ</th>
                              <th className="px-2 py-1 text-center" title="Goles en contra">GC</th>
                              <th className="px-2 py-1 text-center" title="Promedio de goles en contra por partido">
                                Prom.
                              </th>
                              <th className="px-2 py-1 text-center" title="Partidos sin recibir gol">
                                Invicta
                              </th>
                            </tr>
                          </thead>
                          <tbody>
                            {valla.map((r: any) => (
                              <tr
                                key={r.team_id}
                                className={`border-t border-outline-variant/30 ${
                                  r.position === 1 ? 'bg-secondary/10' : ''
                                }`}
                              >
                                <td className="px-2 py-1 text-on-surface-variant">{r.position}</td>
                                <td className="px-2 py-1 font-medium">
                                  {r.team_name}
                                  {r.position === 1 ? ' 🛡️' : ''}
                                </td>
                                <td className="px-2 py-1 text-center text-on-surface-variant">
                                  {r.matches_played}
                                </td>
                                <td className="px-2 py-1 text-center font-semibold tabular-nums text-secondary">
                                  {r.conceded}
                                </td>
                                <td className="px-2 py-1 text-center tabular-nums text-on-surface-variant">
                                  {r.conceded_avg}
                                </td>
                                <td className="px-2 py-1 text-center tabular-nums text-on-surface-variant">
                                  {r.clean_sheets}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </Card>
                  )}
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
                  {(() => {
                    const teams = (teamStats || []).filter((t: any) => (t.matches_played || 0) > 0)
                    if (!teams.length) return null
                    const lider = valla[0]
                    const dot = (r: string) =>
                      r === 'W' ? 'bg-secondary' : r === 'L' ? 'bg-red-500' : 'bg-on-surface-variant/50'
                    return (
                      <Card className="p-4">
                        <h3 className="mb-3 flex items-center gap-2 font-display font-semibold">
                          <Icon name="insights" className="text-secondary" /> Forma y promedios por equipo
                        </h3>
                        {lider && (
                          <div className="mb-3 inline-flex items-center gap-2 rounded-lg bg-secondary/10 px-3 py-1.5 text-sm text-secondary">
                            <Icon name="shield" className="text-base" /> Valla menos vencida:&nbsp;
                            <b>{lider.team_name}</b>&nbsp;({lider.conceded ?? 0} en contra)
                          </div>
                        )}
                        <div className="overflow-x-auto">
                          <table className="w-full text-sm">
                            <thead>
                              <tr className="text-on-surface-variant">
                                <th className="px-2 py-1 text-left">Equipo</th>
                                <th className="px-2 py-1 text-center">PJ</th>
                                <th className="px-2 py-1 text-center" title="Promedio de goles a favor por partido">GF/P</th>
                                <th className="px-2 py-1 text-center" title="Promedio de goles en contra por partido">GC/P</th>
                                <th className="px-2 py-1 text-center">Racha</th>
                              </tr>
                            </thead>
                            <tbody>
                              {teams.map((t: any) => {
                                const pj = t.matches_played || 1
                                const form = teamForm(allMatches, t.team_id).slice(-5)
                                return (
                                  <tr key={t.team_id} className="border-t border-outline-variant/30">
                                    <td className="px-2 py-1 font-medium">
                                      {t.team_name}
                                      {lider && t.team_id === lider.team_id ? ' 🛡️' : ''}
                                    </td>
                                    <td className="px-2 py-1 text-center text-on-surface-variant">{t.matches_played ?? 0}</td>
                                    <td className="px-2 py-1 text-center font-semibold text-secondary">
                                      {((t.points_scored || 0) / pj).toFixed(1)}
                                    </td>
                                    <td className="px-2 py-1 text-center">{((t.points_conceded || 0) / pj).toFixed(1)}</td>
                                    <td className="px-2 py-1">
                                      <span className="flex items-center justify-center gap-0.5">
                                        {form.length ? (
                                          form.map((r, i) => (
                                            <span key={i} title={r} className={`h-2.5 w-2.5 rounded-full ${dot(r)}`} />
                                          ))
                                        ) : (
                                          <span className="text-xs text-on-surface-variant">—</span>
                                        )}
                                      </span>
                                    </td>
                                  </tr>
                                )
                              })}
                            </tbody>
                          </table>
                        </div>
                        <p className="mt-2 text-xs text-on-surface-variant">
                          Racha = últimos 5 (🟢 victoria · ⚪ empate · 🔴 derrota). GF/P y GC/P = promedio por partido.
                        </p>
                      </Card>
                    )
                  })()}
                  {(() => {
                    const sanc = [...playerStats]
                      .map((p: any) => ({
                        ...p,
                        _pen: (p.red || 0) * 3 + (p.blue || 0) * 2 + (p.yellow || 0) + (p.fouls || 0),
                      }))
                      .filter((p: any) => p._pen > 0)
                      .sort((a: any, b: any) => b._pen - a._pen || (b.red || 0) - (a.red || 0))
                      .slice(0, 15)
                    if (!sanc.length) return null
                    return (
                      <Card className="p-4">
                        <h3 className="mb-3 flex items-center gap-2 font-display font-semibold">
                          <Icon name="gavel" className="text-tertiary" /> Sancionados · jugadores
                        </h3>
                        <div className="overflow-x-auto">
                          <table className="w-full text-sm">
                            <thead>
                              <tr className="text-on-surface-variant">
                                <th className="px-2 py-1 text-left">#</th>
                                <th className="px-2 py-1 text-left">Jugador</th>
                                <th className="px-2 py-1 text-left">Equipo</th>
                                {discCols.map((dc) => (
                                  <th key={dc.key} className="px-2 py-1 text-center">{dc.label}</th>
                                ))}
                              </tr>
                            </thead>
                            <tbody>
                              {sanc.map((p: any, i: number) => (
                                <tr key={p.player_id} className="border-t border-outline-variant/30">
                                  <td className="px-2 py-1 text-on-surface-variant">{i + 1}</td>
                                  <td className="px-2 py-1 font-medium">{p.player_name}</td>
                                  <td className="px-2 py-1 text-on-surface-variant">{p.team_name || '—'}</td>
                                  {discCols.map((dc) => (
                                    <td key={dc.key} className="px-2 py-1 text-center">{p[dc.key] ?? 0}</td>
                                  ))}
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                        <p className="mt-2 text-xs text-on-surface-variant">
                          Ordenado por gravedad (roja 3 · azul 2 · amarilla 1 · falta 1).
                        </p>
                      </Card>
                    )
                  })()}
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
                const blueCard = hasBlueCard(selected?.sport_type)
                const cells = [
                  { label: 'Goles', value: ts?.points_scored ?? profile.row?.points_scored ?? 0 },
                  { label: 'En contra', value: ts?.points_conceded ?? profile.row?.points_conceded ?? 0 },
                  { label: 'Faltas', value: fp?.fouls ?? 0 },
                  { label: '🟨 Amar.', value: fp?.yellow ?? 0 },
                  ...(blueCard ? [{ label: '🟦 Azul', value: fp?.blue ?? 0 }] : []),
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
              {profile.oculta ? (
                <p className="flex items-center gap-1.5 text-sm text-on-surface-variant">
                  <Icon name="visibility_off" className="text-base" />
                  El organizador no publica las nóminas de este torneo.
                </p>
              ) : profile.players.length === 0 ? (
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
                        {hasBlueCard(selected?.sport_type) && (
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
                            {hasBlueCard(selected?.sport_type) && (
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
      {qr && (
        <div
          className="fixed inset-0 z-50 grid place-items-center bg-black/70 p-4 backdrop-blur-sm"
          onClick={() => setQr(null)}
        >
          <div
            className="w-full max-w-xs rounded-2xl border border-outline-variant/40 bg-surface-container p-5 text-center"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-3 flex items-center justify-between">
              <h3 className="font-display font-semibold">QR del torneo</h3>
              <button onClick={() => setQr(null)} className="text-on-surface-variant hover:text-on-surface">
                <Icon name="close" />
              </button>
            </div>
            <div className="rounded-xl bg-white p-3">
              <img src={qr.data} alt="QR" className="mx-auto h-auto w-full max-w-[220px]" />
            </div>
            <p className="mt-3 font-semibold">{selected?.name}</p>
            <p className="text-xs text-on-surface-variant">Escanea para ver el marcador en vivo</p>
            <div className="mt-4 flex gap-2">
              <Button
                className="flex-1"
                onClick={() => {
                  const a = document.createElement('a')
                  a.href = qr.data
                  a.download = `qr-${selected?.name || 'torneo'}.png`
                  a.click()
                }}
              >
                <Icon name="download" /> Descargar
              </Button>
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => navigator.clipboard?.writeText(qr.link)}
              >
                <Icon name="link" /> Copiar
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
