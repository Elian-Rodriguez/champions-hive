import { useEffect, useState } from 'react'
import { STITCH_SCREENS } from '../screens'
import { api } from '../services/api'
import { Icon } from './ui'

export default function ScreensGallery({ onBack }: { onBack: () => void }) {
  const [active, setActive] = useState(STITCH_SCREENS[0].key)
  const [tournaments, setTournaments] = useState<any[]>([])
  const [tid, setTid] = useState('')
  const [stages, setStages] = useState<any[]>([])
  const [sid, setSid] = useState('')
  const [data, setData] = useState<any>({ tournaments: [] })

  // Torneos
  useEffect(() => {
    api
      .getTournaments()
      .then((ts) => {
        setTournaments(ts)
        setData((d: any) => ({ ...d, tournaments: ts }))
        if (ts[0]) setTid(ts[0].id)
      })
      .catch(() => {})
  }, [])

  // Nivel torneo
  useEffect(() => {
    if (!tid) return
    const t = tournaments.find((x) => x.id === tid)
    Promise.all([
      api.getStages(tid).catch(() => []),
      api.tournamentStats(tid).catch(() => null),
      api.getTeams(tid).catch(() => []),
      api.getSponsors(tid).catch(() => []),
      api.getPhotos(tid).catch(() => []),
    ]).then(async ([stg, stats, teams, sponsors, photos]) => {
      setStages(stg)
      const firstTeamPlayers = teams[0] ? await api.getPlayers(teams[0].id).catch(() => []) : []
      setData((d: any) => ({ ...d, tournament: t, stats, stages: stg, teams, sponsors, photos, firstTeamPlayers }))
      setSid(stg[0] ? stg[0].id : '')
    })
  }, [tid, tournaments])

  // Nivel fase
  useEffect(() => {
    if (!sid) return
    const stage = stages.find((s) => s.id === sid)
    ;(async () => {
      const matches = await api.stageMatches(sid).catch(() => [])
      let standings: any = {}
      let bracket: any = null
      if (stage && stage.type === 'knockout') bracket = await api.bracketTree(sid).catch(() => null)
      else standings = await api.standingsByGroup(sid).catch(() => ({}))
      const standingsFlat = Object.values(standings).flat()
      const liveMatch = matches.find((m: any) => m.status === 'live') || matches[0] || null
      const liveMatchEvents = liveMatch ? await api.matchEvents(liveMatch.id).catch(() => []) : []
      setData((d: any) => ({ ...d, stage, matches, standings, standingsFlat, bracket, liveMatch, liveMatchEvents }))
    })()
  }, [sid, stages])

  const screen = STITCH_SCREENS.find((s) => s.key === active) || STITCH_SCREENS[0]
  const Active: any = screen.Component
  const groups = Array.from(new Set(STITCH_SCREENS.map((s) => s.group)))

  return (
    <div className="flex h-screen flex-col bg-surface text-on-surface">
      <header className="flex flex-wrap items-center justify-between gap-2 border-b border-outline-variant/40 bg-surface-container-low px-4 py-3">
        <button onClick={onBack} className="flex items-center gap-1 text-sm text-on-surface-variant hover:text-on-surface">
          <Icon name="arrow_back" className="text-base" /> Volver a la app
        </button>
        <span className="flex items-center gap-2 font-display font-bold">
          <Icon name="palette" className="text-secondary" /> {screen.title}
        </span>
        <div className="flex items-center gap-2">
          <select
            value={tid}
            onChange={(e) => setTid(e.target.value)}
            className="rounded-lg border border-outline-variant bg-surface-container-low px-2 py-1 text-sm text-on-surface"
          >
            <option value="">Torneo…</option>
            {tournaments.map((t) => (
              <option key={t.id} value={t.id}>{t.name}</option>
            ))}
          </select>
          <select
            value={sid}
            onChange={(e) => setSid(e.target.value)}
            className="rounded-lg border border-outline-variant bg-surface-container-low px-2 py-1 text-sm text-on-surface"
          >
            <option value="">Fase…</option>
            {stages.map((s) => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
        </div>
      </header>

      <div className="grid flex-1 grid-cols-1 overflow-hidden lg:grid-cols-[260px_1fr]">
        <aside className="hidden overflow-y-auto border-r border-outline-variant/40 bg-surface-container-lowest p-3 lg:block">
          {groups.map((g) => (
            <div key={g} className="mb-4">
              <p className="px-2 pb-1 text-xs font-semibold uppercase tracking-wide text-on-surface-variant/70">{g}</p>
              {STITCH_SCREENS.filter((s) => s.group === g).map((s) => (
                <button
                  key={s.key}
                  onClick={() => setActive(s.key)}
                  className={`mb-0.5 flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm transition ${
                    active === s.key ? 'bg-secondary text-on-secondary' : 'text-on-surface hover:bg-surface-container-high'
                  }`}
                >
                  {s.title}
                </button>
              ))}
            </div>
          ))}
        </aside>

        <div className="overflow-y-auto bg-surface">
          <div className="border-b border-outline-variant/40 p-2 lg:hidden">
            <select
              value={active}
              onChange={(e) => setActive(e.target.value)}
              className="w-full rounded-lg border border-outline-variant bg-surface-container-low px-3 py-2 text-on-surface"
            >
              {STITCH_SCREENS.map((s) => (
                <option key={s.key} value={s.key}>{s.group} · {s.title}</option>
              ))}
            </select>
          </div>
          <Active data={data} />
        </div>
      </div>
    </div>
  )
}
