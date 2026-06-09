import { useEffect, useState } from 'react'
import { api } from '../services/api'
import { Badge, Button, Card, EmptyState, Icon, Input, Select, Spinner } from './ui'
import StandingsTable from './StandingsTable'
import TournamentBracket from './TournamentBracket'
import VenuesPanel from './VenuesPanel'
import UsersPanel from './UsersPanel'
import { exportStandingsPDF } from '../utils/pdf'

const SPORTS = [
  { value: 'football', label: 'Fútbol' },
  { value: 'micro', label: 'Microfútbol' },
  { value: 'basketball', label: 'Baloncesto' },
]
const STAGE_TYPES = [
  { value: 'group', label: 'Grupos' },
  { value: 'league', label: 'Liga' },
  { value: 'knockout', label: 'Eliminación' },
  { value: 'swiss', label: 'Suizo' },
]
type Tab =
  | 'resumen'
  | 'config'
  | 'equipos'
  | 'fases'
  | 'calendario'
  | 'posiciones'
  | 'avance'
  | 'marca'
type Section = 'torneos' | 'sedes' | 'usuarios'

const SECTIONS: { key: Section; label: string; icon: string }[] = [
  { key: 'torneos', label: 'Torneos', icon: 'emoji_events' },
  { key: 'sedes', label: 'Sedes', icon: 'stadium' },
  { key: 'usuarios', label: 'Usuarios', icon: 'group' },
]

export default function AdminView() {
  const [section, setSection] = useState<Section>('torneos')
  const [tournaments, setTournaments] = useState<any[]>([])
  const [selected, setSelected] = useState<any>(null)
  const [tab, setTab] = useState<Tab>('resumen')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [newName, setNewName] = useState('')
  const [newSport, setNewSport] = useState('football')

  async function refresh() {
    setLoading(true)
    try {
      setTournaments(await api.getTournaments())
    } catch (e: any) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }
  useEffect(() => {
    refresh()
  }, [])

  async function createTournament(e: React.FormEvent) {
    e.preventDefault()
    if (!newName.trim()) return
    try {
      await api.createTournament({ name: newName, sport_type: newSport })
      setNewName('')
      refresh()
    } catch (e: any) {
      setError(e.message)
    }
  }

  return (
    <div className="space-y-5">
      <nav className="flex gap-2">
        {SECTIONS.map((s) => (
          <button
            key={s.key}
            onClick={() => setSection(s.key)}
            className={`flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm font-semibold transition ${
              section === s.key
                ? 'bg-secondary text-on-secondary'
                : 'bg-surface-container-high text-on-surface hover:bg-surface-bright'
            }`}
          >
            <Icon name={s.icon} className="text-base" /> {s.label}
          </button>
        ))}
      </nav>

      {section === 'sedes' ? (
        <VenuesPanel />
      ) : section === 'usuarios' ? (
        <UsersPanel />
      ) : (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[320px_1fr]">
          <div className="space-y-4">
            <Card className="p-4">
              <h2 className="mb-3 font-display font-semibold">Nuevo torneo</h2>
              <form onSubmit={createTournament} className="space-y-2">
                <Input placeholder="Nombre del torneo" value={newName} onChange={(e) => setNewName(e.target.value)} />
                <Select value={newSport} onChange={(e) => setNewSport(e.target.value)}>
                  {SPORTS.map((s) => (
                    <option key={s.value} value={s.value}>
                      {s.label}
                    </option>
                  ))}
                </Select>
                <Button type="submit" className="w-full">
                  <Icon name="add" /> Crear
                </Button>
              </form>
            </Card>

            <Card className="p-2">
              {loading ? (
                <div className="grid place-items-center py-10">
                  <Spinner />
                </div>
              ) : tournaments.length === 0 ? (
                <EmptyState icon="trophy" title="Sin torneos" hint="Crea el primero arriba." />
              ) : (
                <ul className="divide-y divide-outline-variant/30">
                  {tournaments.map((t) => (
                    <li key={t.id}>
                      <button
                        onClick={() => {
                          setSelected(t)
                          setTab('resumen')
                        }}
                        className={`flex w-full items-center justify-between px-3 py-3 text-left transition hover:bg-surface-container-high ${
                          selected?.id === t.id ? 'bg-surface-container-high' : ''
                        }`}
                      >
                        <span>
                          <span className="block font-medium">{t.name}</span>
                          <span className="text-xs uppercase text-on-surface-variant">{t.sport_type}</span>
                        </span>
                        <Badge className="bg-primary-container text-on-primary-container">{t.status}</Badge>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          </div>

          <div>
            {error && (
              <div className="mb-4 flex items-center gap-2 rounded-lg bg-error-container/40 px-3 py-2 text-sm text-error">
                <Icon name="error" className="text-base" /> {error}
                <button onClick={() => setError(null)} className="ml-auto">
                  <Icon name="close" className="text-base" />
                </button>
              </div>
            )}
            {!selected ? (
              <EmptyState icon="touch_app" title="Selecciona un torneo" hint="Elige o crea un torneo para gestionarlo." />
            ) : (
              <Card className="p-5">
                <div className="mb-4 flex items-center justify-between">
                  <h2 className="font-display text-2xl font-bold">{selected.name}</h2>
                  <Badge className="bg-secondary-container/40 text-secondary">{selected.sport_type}</Badge>
                </div>
                <div className="mb-5 flex flex-wrap gap-2 border-b border-outline-variant/30 pb-3">
                  {(['resumen', 'config', 'equipos', 'fases', 'calendario', 'posiciones', 'avance', 'marca'] as Tab[]).map((t) => (
                    <button
                      key={t}
                      onClick={() => setTab(t)}
                      className={`rounded-lg px-3 py-1.5 text-sm font-medium capitalize transition ${
                        tab === t ? 'bg-secondary text-on-secondary' : 'text-on-surface-variant hover:bg-surface-container-high'
                      }`}
                    >
                      {t}
                    </button>
                  ))}
                </div>

                {tab === 'resumen' && <ResumenTab tournament={selected} onChanged={refresh} />}
                {tab === 'config' && <ConfigTab tournament={selected} onChanged={refresh} />}
                {tab === 'equipos' && <EquiposTab tournament={selected} />}
                {tab === 'fases' && <FasesTab tournament={selected} />}
                {tab === 'calendario' && <CalendarioTab tournament={selected} />}
                {tab === 'posiciones' && <PosicionesTab tournament={selected} />}
                {tab === 'avance' && <AvanceTab tournament={selected} />}
                {tab === 'marca' && <MarcaTab tournament={selected} />}
              </Card>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

function ResumenTab({ tournament, onChanged }: { tournament: any; onChanged: () => void }) {
  const [stats, setStats] = useState<any>(null)
  useEffect(() => {
    api.tournamentStats(tournament.id).then(setStats).catch(() => setStats(null))
  }, [tournament.id])
  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { k: 'teams', label: 'Equipos', icon: 'groups' },
          { k: 'stages', label: 'Fases', icon: 'account_tree' },
          { k: 'matches', label: 'Partidos', icon: 'sports_soccer' },
          { k: 'finished_matches', label: 'Jugados', icon: 'check_circle' },
        ].map((s) => (
          <div key={s.k} className="rounded-xl bg-surface-container-high p-4">
            <Icon name={s.icon} className="text-secondary" />
            <p className="mt-1 font-display text-2xl font-bold">{stats ? stats[s.k] : '—'}</p>
            <p className="text-xs text-on-surface-variant">{s.label}</p>
          </div>
        ))}
      </div>
      <div>
        <p className="mb-2 text-sm text-on-surface-variant">Estado del torneo</p>
        <div className="flex flex-wrap gap-2">
          {['draft', 'active', 'finished'].map((s) => (
            <Button
              key={s}
              variant={tournament.status === s ? 'primary' : 'ghost'}
              onClick={async () => {
                await api.updateStatus(tournament.id, s)
                onChanged()
              }}
            >
              {s}
            </Button>
          ))}
        </div>
      </div>
      <Button
        variant="danger"
        onClick={async () => {
          if (confirm(`¿Eliminar el torneo "${tournament.name}"?`)) {
            await api.deleteTournament(tournament.id)
            onChanged()
          }
        }}
      >
        <Icon name="delete" /> Eliminar torneo
      </Button>
    </div>
  )
}

function PlayersBlock({ teamId }: { teamId: string }) {
  const [players, setPlayers] = useState<any[]>([])
  const [name, setName] = useState('')
  const [number, setNumber] = useState('')
  async function load() {
    setPlayers(await api.getPlayers(teamId))
  }
  useEffect(() => {
    load()
  }, [teamId])
  return (
    <div className="mt-2 rounded-lg bg-surface-container-low p-3">
      <form
        onSubmit={async (e) => {
          e.preventDefault()
          if (!name.trim()) return
          await api.addPlayer(teamId, { name, number: number ? parseInt(number) : null })
          setName('')
          setNumber('')
          load()
        }}
        className="flex gap-2"
      >
        <Input placeholder="Jugador" value={name} onChange={(e) => setName(e.target.value)} />
        <Input placeholder="#" value={number} onChange={(e) => setNumber(e.target.value)} className="w-16" />
        <Button type="submit" variant="outline">
          <Icon name="add" />
        </Button>
      </form>
      <ul className="mt-2 space-y-1">
        {players.map((p) => (
          <li key={p.id} className="flex items-center justify-between text-sm">
            <span>
              {p.number != null && <span className="mr-2 text-on-surface-variant">#{p.number}</span>}
              {p.name}
            </span>
            <span className="flex items-center gap-2">
              <button
                onClick={async () => {
                  const n = prompt('Nombre del jugador', p.name) || p.name
                  const num = prompt('Dorsal', p.number != null ? String(p.number) : '')
                  await api.updatePlayer(teamId, p.id, {
                    name: n,
                    number: num ? parseInt(num) : null,
                  })
                  load()
                }}
                className="text-on-surface-variant hover:text-on-surface"
              >
                <Icon name="edit" className="text-base" />
              </button>
              <button
                onClick={async () => {
                  await api.removePlayer(teamId, p.id)
                  load()
                }}
                className="text-error/80 hover:text-error"
              >
                <Icon name="close" className="text-base" />
              </button>
            </span>
          </li>
        ))}
        {players.length === 0 && <li className="text-xs text-on-surface-variant">Sin jugadores.</li>}
      </ul>
    </div>
  )
}

function TeamColors({
  team,
  onChange,
}: {
  team: any
  onChange: (colors: string[]) => void
}) {
  const colors: string[] =
    team.colors && team.colors.length ? team.colors : team.color ? [team.color] : []
  const [pick, setPick] = useState('#39d353')
  return (
    <span className="flex items-center gap-1">
      {colors.map((col, i) => (
        <button
          key={i}
          type="button"
          onClick={() => colors.length > 1 && onChange(colors.filter((_, j) => j !== i))}
          title="Quitar uniforme"
          className="h-5 w-5 rounded-full border border-outline-variant"
          style={{ background: col }}
        />
      ))}
      <input
        type="color"
        value={pick}
        onChange={(e) => setPick(e.target.value)}
        className="h-5 w-5 cursor-pointer rounded border border-outline-variant bg-transparent"
      />
      <button
        type="button"
        onClick={() => onChange([...colors, pick])}
        className="grid h-5 w-5 place-items-center rounded bg-surface-bright text-on-surface"
        title="Agregar uniforme"
      >
        <Icon name="add" className="text-xs" />
      </button>
    </span>
  )
}

function EquiposTab({ tournament }: { tournament: any }) {
  const [teams, setTeams] = useState<any[]>([])
  const [name, setName] = useState('')
  const [group, setGroup] = useState('')
  const [color, setColor] = useState('#39d353')
  const [numGroups, setNumGroups] = useState(2)
  const [expanded, setExpanded] = useState<string | null>(null)
  async function load() {
    setTeams(await api.getTeams(tournament.id))
  }
  useEffect(() => {
    load()
  }, [tournament.id])
  return (
    <div className="space-y-4">
      <form
        onSubmit={async (e) => {
          e.preventDefault()
          if (!name.trim()) return
          await api.addTeam(tournament.id, { name, group_name: group || null, color, colors: [color] })
          setName('')
          setGroup('')
          load()
        }}
        className="flex flex-wrap items-end gap-2"
      >
        <div className="flex-1">
          <label className="mb-1 block text-xs text-on-surface-variant">Equipo</label>
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Nombre del equipo" />
        </div>
        <div className="w-24">
          <label className="mb-1 block text-xs text-on-surface-variant">Grupo</label>
          <Input value={group} onChange={(e) => setGroup(e.target.value)} placeholder="A" />
        </div>
        <div>
          <label className="mb-1 block text-xs text-on-surface-variant">Color</label>
          <input
            type="color"
            value={color}
            onChange={(e) => setColor(e.target.value)}
            className="h-9 w-12 cursor-pointer rounded border border-outline-variant bg-surface-container-low"
            title="Color del uniforme"
          />
        </div>
        <Button type="submit">
          <Icon name="add" /> Añadir
        </Button>
      </form>

      <div className="flex items-center gap-2">
        <span className="text-sm text-on-surface-variant">Sortear en</span>
        <Input type="number" min={1} value={numGroups} onChange={(e) => setNumGroups(parseInt(e.target.value) || 1)} className="w-20" />
        <span className="text-sm text-on-surface-variant">grupos</span>
        <Button
          variant="outline"
          onClick={async () => {
            await api.shuffleGroups(tournament.id, numGroups)
            load()
          }}
        >
          <Icon name="shuffle" /> Sortear
        </Button>
      </div>

      {teams.length === 0 ? (
        <EmptyState icon="groups" title="Sin equipos inscritos" />
      ) : (
        <ul className="divide-y divide-outline-variant/30">
          {teams.map((t) => (
            <li key={t.id} className="py-2.5">
              <div className="flex items-center justify-between">
                <button
                  onClick={() => setExpanded(expanded === t.id ? null : t.id)}
                  className="flex items-center gap-2 font-medium"
                >
                  <Icon name={expanded === t.id ? 'expand_more' : 'chevron_right'} className="text-base text-on-surface-variant" />
                  <span
                    className="h-3 w-3 shrink-0 rounded-full border border-outline-variant"
                    style={{ background: t.color || '#64748b' }}
                  />
                  {t.name}
                </button>
                <span className="flex items-center gap-2">
                  <Badge className="bg-surface-container-highest text-on-surface-variant">{t.group_name || 'Sin grupo'}</Badge>
                  <TeamColors
                    team={t}
                    onChange={async (cols) => {
                      await api.updateTeam(t.id, { colors: cols, color: cols[0] || null })
                      load()
                    }}
                  />
                  <button
                    onClick={async () => {
                      const n = prompt('Nuevo nombre del equipo', t.name)
                      if (n && n.trim()) {
                        await api.updateTeam(t.id, { name: n.trim() })
                        load()
                      }
                    }}
                    className="text-on-surface-variant hover:text-on-surface"
                  >
                    <Icon name="edit" className="text-lg" />
                  </button>
                  <button
                    onClick={async () => {
                      await api.removeTeam(tournament.id, t.id)
                      load()
                    }}
                    className="text-error/80 hover:text-error"
                  >
                    <Icon name="delete" className="text-lg" />
                  </button>
                </span>
              </div>
              {expanded === t.id && <PlayersBlock teamId={t.id} />}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

function FasesTab({ tournament }: { tournament: any }) {
  const [stages, setStages] = useState<any[]>([])
  const [name, setName] = useState('')
  const [type, setType] = useState('group')
  const [msg, setMsg] = useState<string | null>(null)
  async function load() {
    setStages(await api.getStages(tournament.id))
  }
  useEffect(() => {
    load()
  }, [tournament.id])
  return (
    <div className="space-y-4">
      <form
        onSubmit={async (e) => {
          e.preventDefault()
          if (!name.trim()) return
          await api.createStage(tournament.id, { name, type })
          setName('')
          load()
        }}
        className="flex flex-wrap items-end gap-2"
      >
        <div className="flex-1">
          <label className="mb-1 block text-xs text-on-surface-variant">Fase</label>
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Fase de grupos" />
        </div>
        <div className="w-40">
          <label className="mb-1 block text-xs text-on-surface-variant">Tipo</label>
          <Select value={type} onChange={(e) => setType(e.target.value)}>
            {STAGE_TYPES.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </Select>
        </div>
        <Button type="submit">
          <Icon name="add" /> Crear fase
        </Button>
      </form>
      {msg && <p className="text-sm text-secondary">{msg}</p>}
      {stages.length === 0 ? (
        <EmptyState icon="account_tree" title="Sin fases" />
      ) : (
        <ul className="space-y-2">
          {stages.map((s) => (
            <li key={s.id} className="flex items-center justify-between rounded-lg bg-surface-container-high px-3 py-2.5">
              <span>
                <span className="font-medium">{s.name}</span>{' '}
                <Badge className="ml-1 bg-surface-container-highest text-on-surface-variant">{s.type}</Badge>
              </span>
              <span className="flex items-center gap-2">
                <Button
                  variant="outline"
                  onClick={async () => {
                    setMsg(null)
                    try {
                      const r = await api.generateFixture(s.id)
                      setMsg(r.message)
                    } catch (e: any) {
                      setMsg(e.message)
                    }
                  }}
                >
                  <Icon name="event" /> Fixture
                </Button>
                {s.type === 'swiss' && (
                  <Button
                    variant="ghost"
                    onClick={async () => {
                      setMsg(null)
                      try {
                        const r = await api.swissRound(s.id)
                        setMsg(r.message)
                      } catch (e: any) {
                        setMsg(e.message)
                      }
                    }}
                  >
                    <Icon name="casino" /> Ronda suiza
                  </Button>
                )}
                <button
                  onClick={async () => {
                    await api.deleteStage(s.id)
                    load()
                  }}
                  className="text-error/80 hover:text-error"
                >
                  <Icon name="delete" className="text-lg" />
                </button>
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

function PosicionesTab({ tournament }: { tournament: any }) {
  const [stages, setStages] = useState<any[]>([])
  const [active, setActive] = useState<any>(null)
  const [standings, setStandings] = useState<Record<string, any[]>>({})
  const [bracket, setBracket] = useState<any>(null)
  useEffect(() => {
    api.getStages(tournament.id).then((st) => {
      setStages(st)
      if (st[0]) select(st[0])
    })
  }, [tournament.id])
  async function select(s: any) {
    setActive(s)
    setBracket(null)
    setStandings({})
    if (s.type === 'knockout') setBracket(await api.bracketTree(s.id))
    else setStandings(await api.standingsByGroup(s.id))
  }
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        {stages.map((s) => (
          <Button key={s.id} variant={active?.id === s.id ? 'primary' : 'ghost'} onClick={() => select(s)}>
            {s.name}
          </Button>
        ))}
        {Object.keys(standings).length > 0 && (
          <Button variant="outline" className="ml-auto" onClick={() => exportStandingsPDF(tournament.name, standings)}>
            <Icon name="picture_as_pdf" /> PDF
          </Button>
        )}
      </div>
      {!active ? (
        <EmptyState icon="leaderboard" title="Crea una fase para ver posiciones" />
      ) : bracket ? (
        <TournamentBracket tree={bracket} />
      ) : (
        <div className="space-y-5">
          {Object.entries(standings).map(([group, rows]) => (
            <div key={group}>
              <h3 className="mb-2 font-display font-semibold">{group === 'Sin Grupo' ? 'Tabla general' : `Grupo ${group}`}</h3>
              <StandingsTable rows={rows} />
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function AvanceTab({ tournament }: { tournament: any }) {
  const [stages, setStages] = useState<any[]>([])
  const [sourceId, setSourceId] = useState('')
  const [targetId, setTargetId] = useState('')
  const [groups, setGroups] = useState<string[]>([])
  const [standings, setStandings] = useState<Record<string, any[]>>({})
  const [thirds, setThirds] = useState<any[]>([])
  const [rows, setRows] = useState<any[]>([{ hg: '', hp: 1, ag: '', ap: 2 }])
  const [thirdPlace, setThirdPlace] = useState(false)
  const [msg, setMsg] = useState<string | null>(null)
  useEffect(() => {
    api.getStages(tournament.id).then(setStages)
  }, [tournament.id])
  async function onSource(id: string) {
    setSourceId(id)
    setStandings({})
    setThirds([])
    if (!id) return setGroups([])
    const gs = await api.standingsByGroup(id)
    setGroups(Object.keys(gs))
    setStandings(gs)
    api.bestThirds(id, 4).then((r) => setThirds(r.best_thirds || [])).catch(() => setThirds([]))
  }
  const groupOpts = [...groups, '__best_thirds__']

  async function run(action: 'seed' | 'advance') {
    setMsg(null)
    try {
      if (!sourceId || !targetId) {
        setMsg('Selecciona fase origen y destino.')
        return
      }
      if (action === 'seed') {
        const r = await api.seedBracket(targetId, {
          source_stage_id: sourceId,
          third_place: thirdPlace,
          round1: rows.map((c) => ({
            home_group: c.hg,
            home_position: Number(c.hp),
            away_group: c.ag,
            away_position: Number(c.ap),
          })),
        })
        setMsg(r.message)
      } else {
        const r = await api.advance(sourceId, {
          next_stage_id: targetId,
          pairings: rows.map((c) => ({
            h_group: c.hg,
            h_pos: Number(c.hp),
            a_group: c.ag,
            a_pos: Number(c.ap),
          })),
        })
        setMsg(r.message)
      }
    } catch (e: any) {
      setMsg(e.message)
    }
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-on-surface-variant">
        Define los cruces tomando posiciones de la fase origen y créalos en la fase destino.
      </p>
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label className="mb-1 block text-xs text-on-surface-variant">Fase origen (grupos/liga)</label>
          <Select value={sourceId} onChange={(e) => onSource(e.target.value)}>
            <option value="">—</option>
            {stages.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </Select>
        </div>
        <div>
          <label className="mb-1 block text-xs text-on-surface-variant">Fase destino</label>
          <Select value={targetId} onChange={(e) => setTargetId(e.target.value)}>
            <option value="">—</option>
            {stages.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name} ({s.type})
              </option>
            ))}
          </Select>
        </div>
      </div>

      {Object.keys(standings).length > 0 && (
        <div className="space-y-3 rounded-lg bg-surface-container-low p-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-on-surface-variant">
            Posiciones de la fase origen
          </p>
          {Object.entries(standings).map(([group, rws]) => (
            <div key={group}>
              <h4 className="mb-1 text-sm font-medium">
                {group === 'Sin Grupo' ? 'Tabla general' : `Grupo ${group}`}
              </h4>
              <StandingsTable rows={rws} />
            </div>
          ))}
          {thirds.length > 0 && (
            <p className="text-xs text-on-surface-variant">
              Mejores terceros:{' '}
              {thirds.map((t, i) => `${t.team_name || t.team_id} (${t.from_group})`).join(' · ')}
            </p>
          )}
        </div>
      )}

      <div className="space-y-2">
        {rows.map((c, i) => (
          <div key={i} className="flex flex-wrap items-center gap-2 rounded-lg bg-surface-container-high p-2">
            <Select value={c.hg} onChange={(e) => setRows(rows.map((r, j) => (j === i ? { ...r, hg: e.target.value } : r)))} className="w-32">
              <option value="">grupo</option>
              {groupOpts.map((g) => (
                <option key={g} value={g}>
                  {g === '__best_thirds__' ? 'Mej. terceros' : g}
                </option>
              ))}
            </Select>
            <Input type="number" min={1} value={c.hp} onChange={(e) => setRows(rows.map((r, j) => (j === i ? { ...r, hp: e.target.value } : r)))} className="w-16" />
            <span className="text-on-surface-variant">vs</span>
            <Select value={c.ag} onChange={(e) => setRows(rows.map((r, j) => (j === i ? { ...r, ag: e.target.value } : r)))} className="w-32">
              <option value="">grupo</option>
              {groupOpts.map((g) => (
                <option key={g} value={g}>
                  {g === '__best_thirds__' ? 'Mej. terceros' : g}
                </option>
              ))}
            </Select>
            <Input type="number" min={1} value={c.ap} onChange={(e) => setRows(rows.map((r, j) => (j === i ? { ...r, ap: e.target.value } : r)))} className="w-16" />
            <button onClick={() => setRows(rows.filter((_, j) => j !== i))} className="text-error/80 hover:text-error">
              <Icon name="close" />
            </button>
          </div>
        ))}
        <Button variant="ghost" onClick={() => setRows([...rows, { hg: '', hp: 1, ag: '', ap: 2 }])}>
          <Icon name="add" /> Cruce
        </Button>
      </div>

      <label className="flex items-center gap-2 text-sm text-on-surface-variant">
        <input
          type="checkbox"
          checked={thirdPlace}
          onChange={(e) => setThirdPlace(e.target.checked)}
          className="accent-secondary"
        />
        Incluir partido por el 3er puesto
      </label>

      <div className="flex flex-wrap gap-2">
        <Button onClick={() => run('seed')}>
          <Icon name="account_tree" /> Sembrar bracket
        </Button>
        <Button variant="outline" onClick={() => run('advance')}>
          <Icon name="arrow_forward" /> Avanzar (crear cruces)
        </Button>
        <Button
          variant="ghost"
          onClick={async () => {
            if (!targetId) return setMsg('Selecciona la fase destino.')
            const r = await api.resolveSlots(targetId)
            setMsg(r.message)
          }}
        >
          <Icon name="sync" /> Resolver cruces
        </Button>
      </div>
      {msg && <p className="text-sm text-secondary">{msg}</p>}
    </div>
  )
}

function ConfigTab({ tournament, onChanged }: { tournament: any; onChanged: () => void }) {
  const [options, setOptions] = useState<any[]>([])
  const pc = tournament.points_config || {}
  const [win, setWin] = useState(pc.win ?? 3)
  const [draw, setDraw] = useState(pc.draw ?? 1)
  const [loss, setLoss] = useState(pc.loss ?? 0)
  const [category, setCategory] = useState(tournament.category || 'masculino')
  const [duration, setDuration] = useState(tournament.match_duration ?? 60)
  const [waiting, setWaiting] = useState(tournament.waiting_time ?? 10)
  const [maxPerDay, setMaxPerDay] = useState(tournament.max_matches_per_day ?? '')
  const [rules, setRules] = useState<string[]>(
    tournament.tiebreaker_rules || ['PUNTOS', 'DIF_GOLES', 'GOLES_FAVOR', 'PARTIDO_DIRECTO'],
  )
  const [msg, setMsg] = useState<string | null>(null)

  useEffect(() => {
    api.getTiebreakerOptions().then(setOptions).catch(() => setOptions([]))
  }, [])

  const labelOf = (k: string) => options.find((o) => o.key === k)?.label || k
  const available = options.filter((o) => !rules.includes(o.key))
  function move(i: number, dir: number) {
    const j = i + dir
    if (j < 0 || j >= rules.length) return
    const r = [...rules]
    ;[r[i], r[j]] = [r[j], r[i]]
    setRules(r)
  }

  async function save() {
    try {
      await api.updateTournament(tournament.id, {
        category,
        match_duration: Number(duration),
        waiting_time: Number(waiting),
        max_matches_per_day: maxPerDay ? Number(maxPerDay) : null,
        points_config: { win: Number(win), draw: Number(draw), loss: Number(loss) },
        tiebreaker_rules: rules,
      })
      setMsg('Configuración guardada')
      onChanged()
    } catch (e: any) {
      setMsg(e.message)
    }
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="mb-1 block text-xs text-on-surface-variant">Categoría</label>
          <Input value={category} onChange={(e) => setCategory(e.target.value)} placeholder="masculino" />
        </div>
        <div className="grid grid-cols-3 gap-2">
          <div>
            <label className="mb-1 block text-xs text-on-surface-variant">Pts victoria</label>
            <Input type="number" value={win} onChange={(e) => setWin(e.target.value)} />
          </div>
          <div>
            <label className="mb-1 block text-xs text-on-surface-variant">Empate</label>
            <Input type="number" value={draw} onChange={(e) => setDraw(e.target.value)} />
          </div>
          <div>
            <label className="mb-1 block text-xs text-on-surface-variant">Derrota</label>
            <Input type="number" value={loss} onChange={(e) => setLoss(e.target.value)} />
          </div>
        </div>
        <div>
          <label className="mb-1 block text-xs text-on-surface-variant">Duración partido (min)</label>
          <Input type="number" value={duration} onChange={(e) => setDuration(e.target.value)} />
        </div>
        <div>
          <label className="mb-1 block text-xs text-on-surface-variant">Espera entre partidos (min)</label>
          <Input type="number" value={waiting} onChange={(e) => setWaiting(e.target.value)} />
        </div>
        <div>
          <label className="mb-1 block text-xs text-on-surface-variant">Máx. partidos por día (opcional)</label>
          <Input
            type="number"
            min={0}
            value={maxPerDay}
            onChange={(e) => setMaxPerDay(e.target.value)}
            placeholder="sin límite"
          />
        </div>
      </div>

      <div>
        <h3 className="mb-1 font-display font-semibold">Criterios de desempate (en orden)</h3>
        <p className="mb-2 text-xs text-on-surface-variant">
          Define cómo se clasifican los equipos empatados. El primero tiene mayor prioridad.
        </p>
        <ul className="space-y-1.5">
          {rules.map((r, i) => (
            <li key={r} className="flex items-center gap-2 rounded-lg bg-surface-container-high px-3 py-2">
              <span className="w-5 text-on-surface-variant">{i + 1}.</span>
              <span className="flex-1">{labelOf(r)}</span>
              <span className="text-xs text-on-surface-variant/60">{r}</span>
              <button onClick={() => move(i, -1)} className="text-on-surface-variant hover:text-on-surface">
                <Icon name="arrow_upward" className="text-base" />
              </button>
              <button onClick={() => move(i, 1)} className="text-on-surface-variant hover:text-on-surface">
                <Icon name="arrow_downward" className="text-base" />
              </button>
              <button onClick={() => setRules(rules.filter((x) => x !== r))} className="text-error/80 hover:text-error">
                <Icon name="close" className="text-base" />
              </button>
            </li>
          ))}
        </ul>
        {available.length > 0 && (
          <Select
            value=""
            onChange={(e) => e.target.value && setRules([...rules, e.target.value])}
            className="mt-2"
          >
            <option value="">+ Agregar criterio…</option>
            {available.map((o) => (
              <option key={o.key} value={o.key}>
                {o.label} ({o.key})
              </option>
            ))}
          </Select>
        )}
      </div>

      <div className="flex items-center gap-3">
        <Button onClick={save}>
          <Icon name="save" /> Guardar configuración
        </Button>
        {msg && <span className="text-sm text-secondary">{msg}</span>}
      </div>
    </div>
  )
}

function CalendarioTab({ tournament }: { tournament: any }) {
  const [stages, setStages] = useState<any[]>([])
  const [active, setActive] = useState<any>(null)
  const [matches, setMatches] = useState<any[]>([])
  const [courts, setCourts] = useState<any[]>([])
  const [start, setStart] = useState('')
  const [msg, setMsg] = useState<string | null>(null)

  useEffect(() => {
    api.getStages(tournament.id).then(setStages)
    api.getVenues().then((vs: any[]) =>
      setCourts(vs.flatMap((v) => (v.courts || []).map((c: any) => ({ ...c, venue: v.name })))),
    )
  }, [tournament.id])

  async function pick(s: any) {
    setActive(s)
    setMatches(await api.stageMatches(s.id))
  }
  async function autoSchedule() {
    try {
      const r = await api.scheduleCalendar(tournament.id, {
        start: start || undefined,
        match_duration: tournament.match_duration,
        waiting_time: tournament.waiting_time,
      })
      setMsg(r.message)
      if (active) pick(active)
    } catch (e: any) {
      setMsg(e.message)
    }
  }
  async function patch(m: any, field: string, value: any) {
    await api.updateMatchSchedule(m.id, { [field]: value || null })
    if (active) pick(active)
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end gap-2 rounded-lg bg-surface-container-high p-3">
        <div>
          <label className="mb-1 block text-xs text-on-surface-variant">Inicio (auto-programación)</label>
          <input
            type="datetime-local"
            value={start}
            onChange={(e) => setStart(e.target.value)}
            className="rounded-lg border border-outline-variant bg-surface-container-low px-3 py-2 text-on-surface"
          />
        </div>
        <Button variant="outline" onClick={autoSchedule}>
          <Icon name="schedule" /> Programar todos los partidos
        </Button>
        {msg && <span className="text-sm text-secondary">{msg}</span>}
      </div>

      <div className="flex flex-wrap gap-2">
        {stages.map((s) => (
          <Button key={s.id} variant={active?.id === s.id ? 'primary' : 'ghost'} onClick={() => pick(s)}>
            {s.name}
          </Button>
        ))}
      </div>

      {!active ? (
        <EmptyState icon="calendar_month" title="Elige una fase para ver/editar fechas" />
      ) : matches.length === 0 ? (
        <EmptyState icon="event_busy" title="Sin partidos" hint="Genera el fixture primero." />
      ) : (
        <ul className="space-y-2">
          {matches.map((m) => (
            <li key={m.id} className="flex flex-wrap items-center gap-2 rounded-lg bg-surface-container-high px-3 py-2 text-sm">
              <span className="min-w-[160px] flex-1 truncate">
                {m.home_team_name || 'Por definir'} <span className="text-on-surface-variant">vs</span> {m.away_team_name || 'Por definir'}
              </span>
              <input
                type="datetime-local"
                value={m.scheduled_start ? String(m.scheduled_start).slice(0, 16) : ''}
                onChange={(e) => patch(m, 'scheduled_start', e.target.value)}
                className="rounded border border-outline-variant bg-surface-container-low px-2 py-1 text-on-surface"
              />
              <select
                value={m.court_id || ''}
                onChange={(e) => patch(m, 'court_id', e.target.value)}
                className="rounded border border-outline-variant bg-surface-container-low px-2 py-1 text-on-surface"
              >
                <option value="">Cancha…</option>
                {courts.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.venue} · {c.name}
                  </option>
                ))}
              </select>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

function MarcaTab({ tournament }: { tournament: any }) {
  const [logo, setLogo] = useState(tournament.logo_url || '')
  const [banner, setBanner] = useState(tournament.banner_url || '')
  const [sponsors, setSponsors] = useState<any[]>([])
  const [photos, setPhotos] = useState<any[]>([])
  const [sp, setSp] = useState({ name: '', logo_url: '', website_url: '' })
  const [ph, setPh] = useState({ url: '', caption: '' })
  const [msg, setMsg] = useState<string | null>(null)
  async function load() {
    setSponsors(await api.getSponsors(tournament.id))
    setPhotos(await api.getPhotos(tournament.id))
  }
  useEffect(() => {
    load()
  }, [tournament.id])
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h3 className="font-display font-semibold">Branding</h3>
        <label className="block text-xs text-on-surface-variant">URL del logo</label>
        <div className="flex gap-2">
          <Input value={logo} onChange={(e) => setLogo(e.target.value)} placeholder="https://…" />
          <Button variant="outline" onClick={async () => { await api.updateLogo(tournament.id, logo); setMsg('Logo actualizado') }}>
            Guardar
          </Button>
        </div>
        <label className="block text-xs text-on-surface-variant">URL del banner</label>
        <div className="flex gap-2">
          <Input value={banner} onChange={(e) => setBanner(e.target.value)} placeholder="https://…" />
          <Button variant="outline" onClick={async () => { await api.updateBanner(tournament.id, banner); setMsg('Banner actualizado') }}>
            Guardar
          </Button>
        </div>
      </div>

      <div className="space-y-2">
        <h3 className="font-display font-semibold">Patrocinadores</h3>
        <form
          onSubmit={async (e) => {
            e.preventDefault()
            if (!sp.name.trim()) return
            await api.createSponsor(tournament.id, sp)
            setSp({ name: '', logo_url: '', website_url: '' })
            load()
          }}
          className="flex flex-wrap gap-2"
        >
          <Input placeholder="Nombre" value={sp.name} onChange={(e) => setSp({ ...sp, name: e.target.value })} className="flex-1" />
          <Input placeholder="Logo URL" value={sp.logo_url} onChange={(e) => setSp({ ...sp, logo_url: e.target.value })} className="flex-1" />
          <Button type="submit" variant="outline">
            <Icon name="add" />
          </Button>
        </form>
        <ul className="space-y-1">
          {sponsors.map((s) => (
            <li key={s.id} className="flex items-center justify-between rounded bg-surface-container-high px-3 py-1.5 text-sm">
              {s.name}
              <button onClick={async () => { await api.deleteSponsor(tournament.id, s.id); load() }} className="text-error/80 hover:text-error">
                <Icon name="close" className="text-base" />
              </button>
            </li>
          ))}
        </ul>
      </div>

      <div className="space-y-2">
        <h3 className="font-display font-semibold">Galería de fotos</h3>
        <form
          onSubmit={async (e) => {
            e.preventDefault()
            if (!ph.url.trim()) return
            await api.addPhoto(tournament.id, ph)
            setPh({ url: '', caption: '' })
            load()
          }}
          className="flex flex-wrap gap-2"
        >
          <Input placeholder="URL imagen" value={ph.url} onChange={(e) => setPh({ ...ph, url: e.target.value })} className="flex-1" />
          <Input placeholder="Pie de foto" value={ph.caption} onChange={(e) => setPh({ ...ph, caption: e.target.value })} className="flex-1" />
          <Button type="submit" variant="outline">
            <Icon name="add" />
          </Button>
        </form>
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
          {photos.map((p) => (
            <div key={p.id} className="group relative">
              <img src={p.url} alt={p.caption || ''} className="h-24 w-full rounded-lg object-cover" />
              <button
                onClick={async () => { await api.deletePhoto(tournament.id, p.id); load() }}
                className="absolute right-1 top-1 rounded-full bg-surface/80 p-0.5 text-error opacity-0 group-hover:opacity-100"
              >
                <Icon name="close" className="text-base" />
              </button>
            </div>
          ))}
        </div>
      </div>
      {msg && <p className="text-sm text-secondary">{msg}</p>}
    </div>
  )
}
