import { useEffect, useState } from 'react'
import { api } from '../services/api'
import { Badge, Button, Card, EmptyState, Icon, Input, Select, Spinner } from './ui'
import StandingsTable from './StandingsTable'
import TournamentBracket from './TournamentBracket'

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
type Tab = 'resumen' | 'equipos' | 'fases' | 'posiciones'

export default function AdminView() {
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
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-[320px_1fr]">
      {/* Lista de torneos */}
      <div className="space-y-4">
        <Card className="p-4">
          <h2 className="mb-3 font-display font-semibold">Nuevo torneo</h2>
          <form onSubmit={createTournament} className="space-y-2">
            <Input
              placeholder="Nombre del torneo"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
            />
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
                      <span className="text-xs uppercase text-on-surface-variant">
                        {t.sport_type}
                      </span>
                    </span>
                    <Badge className="bg-primary-container text-on-primary-container">
                      {t.status}
                    </Badge>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      {/* Detalle del torneo */}
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
          <EmptyState
            icon="touch_app"
            title="Selecciona un torneo"
            hint="Elige un torneo de la lista o crea uno nuevo para gestionarlo."
          />
        ) : (
          <Card className="p-5">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="font-display text-2xl font-bold">{selected.name}</h2>
              <Badge className="bg-secondary-container/40 text-secondary">
                {selected.sport_type}
              </Badge>
            </div>
            <div className="mb-5 flex flex-wrap gap-2 border-b border-outline-variant/30 pb-3">
              {(['resumen', 'equipos', 'fases', 'posiciones'] as Tab[]).map((t) => (
                <button
                  key={t}
                  onClick={() => setTab(t)}
                  className={`rounded-lg px-3 py-1.5 text-sm font-medium capitalize transition ${
                    tab === t
                      ? 'bg-secondary text-on-secondary'
                      : 'text-on-surface-variant hover:bg-surface-container-high'
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>

            {tab === 'resumen' && (
              <ResumenTab tournament={selected} onChanged={refresh} />
            )}
            {tab === 'equipos' && <EquiposTab tournament={selected} />}
            {tab === 'fases' && <FasesTab tournament={selected} />}
            {tab === 'posiciones' && <PosicionesTab tournament={selected} />}
          </Card>
        )}
      </div>
    </div>
  )
}

function ResumenTab({
  tournament,
  onChanged,
}: {
  tournament: any
  onChanged: () => void
}) {
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
            <p className="mt-1 font-display text-2xl font-bold">
              {stats ? stats[s.k] : '—'}
            </p>
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

function EquiposTab({ tournament }: { tournament: any }) {
  const [teams, setTeams] = useState<any[]>([])
  const [name, setName] = useState('')
  const [group, setGroup] = useState('')
  const [numGroups, setNumGroups] = useState(2)

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
          await api.addTeam(tournament.id, { name, group_name: group || null })
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
        <Button type="submit">
          <Icon name="add" /> Añadir
        </Button>
      </form>

      <div className="flex items-center gap-2">
        <span className="text-sm text-on-surface-variant">Sortear en</span>
        <Input
          type="number"
          min={1}
          value={numGroups}
          onChange={(e) => setNumGroups(parseInt(e.target.value) || 1)}
          className="w-20"
        />
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
            <li key={t.id} className="flex items-center justify-between py-2.5">
              <span className="font-medium">{t.name}</span>
              <span className="flex items-center gap-2">
                <Badge className="bg-surface-container-highest text-on-surface-variant">
                  {t.group_name || 'Sin grupo'}
                </Badge>
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
            <li
              key={s.id}
              className="flex items-center justify-between rounded-lg bg-surface-container-high px-3 py-2.5"
            >
              <span>
                <span className="font-medium">{s.name}</span>{' '}
                <Badge className="ml-1 bg-surface-container-highest text-on-surface-variant">
                  {s.type}
                </Badge>
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
          <Button
            key={s.id}
            variant={active?.id === s.id ? 'primary' : 'ghost'}
            onClick={() => select(s)}
          >
            {s.name}
          </Button>
        ))}
      </div>

      {!active ? (
        <EmptyState icon="leaderboard" title="Crea una fase para ver posiciones" />
      ) : bracket ? (
        <div>
          <Button
            variant="outline"
            className="mb-3"
            onClick={async () => {
              await api.resolveSlots(active.id)
              setBracket(await api.bracketTree(active.id))
            }}
          >
            <Icon name="sync" /> Resolver cruces
          </Button>
          <TournamentBracket tree={bracket} />
        </div>
      ) : (
        <div className="space-y-5">
          {Object.entries(standings).map(([group, rows]) => (
            <div key={group}>
              <h3 className="mb-2 font-display font-semibold">
                {group === 'Sin Grupo' ? 'Tabla general' : `Grupo ${group}`}
              </h3>
              <StandingsTable rows={rows} />
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
