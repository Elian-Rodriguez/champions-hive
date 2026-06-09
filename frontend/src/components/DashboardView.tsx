import { useEffect, useState } from 'react'
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { api } from '../services/api'
import { Card, Icon, Spinner } from './ui'

const PALETTE = ['#4ae176', '#bec6e0', '#ffb690', '#7fd1ff', '#ff9db1', '#ffd479']
const SPORT_LABEL: Record<string, string> = {
  football: 'Fútbol',
  micro: 'Microfútbol',
  basketball: 'Baloncesto',
}
const STATUS_LABEL: Record<string, string> = {
  draft: 'Borrador',
  active: 'En juego',
  finished: 'Finalizado',
}

const tooltipStyle = {
  background: '#152031',
  border: '1px solid #45464d',
  borderRadius: 10,
  color: '#d8e3fb',
  fontSize: 12,
}

function Kpi({
  icon,
  label,
  value,
  accent = 'text-secondary',
}: {
  icon: string
  label: string
  value: number | string
  accent?: string
}) {
  return (
    <div className="relative overflow-hidden rounded-2xl border border-outline-variant/40 bg-gradient-to-br from-surface-container-high to-surface-container p-5">
      <span className={`grid h-10 w-10 place-items-center rounded-xl bg-surface-bright/60 ${accent}`}>
        <Icon name={icon} />
      </span>
      <p className="mt-3 font-display text-3xl font-extrabold tabular-nums">{value}</p>
      <p className="text-sm text-on-surface-variant">{label}</p>
    </div>
  )
}

export default function DashboardView() {
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api
      .dashboard()
      .then(setData)
      .catch(() => setData(null))
      .finally(() => setLoading(false))
  }, [])

  if (loading)
    return (
      <div className="grid place-items-center py-24">
        <Spinner className="h-8 w-8" />
      </div>
    )
  if (!data) return <p className="text-sm text-on-surface-variant">No se pudo cargar el panel.</p>

  const t = data.totals || {}
  const sportData = Object.entries(data.by_sport || {}).map(([k, v]) => ({
    name: SPORT_LABEL[k] || k,
    value: v as number,
  }))
  const statusData = Object.entries(data.by_status || {}).map(([k, v]) => ({
    name: STATUS_LABEL[k] || k,
    value: v as number,
  }))
  const goals = data.goals_by_date || []
  const scorers = (data.top_scorers || []).map((s: any) => ({
    name: s.player_name,
    goals: s.goals,
  }))

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold">Panel general</h1>
        <p className="text-sm text-on-surface-variant">Resumen de toda tu actividad en Champion Hive.</p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        <Kpi icon="emoji_events" label="Torneos" value={t.tournaments ?? 0} />
        <Kpi icon="groups" label="Equipos" value={t.teams ?? 0} accent="text-primary" />
        <Kpi icon="person" label="Jugadores" value={t.players ?? 0} accent="text-tertiary" />
        <Kpi icon="sports_soccer" label="Partidos" value={t.matches ?? 0} />
        <Kpi icon="check_circle" label="Jugados" value={t.finished ?? 0} accent="text-primary" />
        <Kpi icon="scoreboard" label="Goles" value={t.goals ?? 0} accent="text-tertiary" />
      </div>

      {(t.live ?? 0) > 0 && (
        <div className="flex items-center gap-2 rounded-xl border border-tertiary/40 bg-tertiary/10 px-4 py-2 text-sm text-tertiary">
          <span className="relative flex h-2.5 w-2.5">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-tertiary opacity-75" />
            <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-tertiary" />
          </span>
          {t.live} partido(s) en vivo ahora mismo
        </div>
      )}

      {/* Disciplina */}
      {data.discipline && (
        <Card className="p-4">
          <h3 className="mb-3 flex items-center gap-2 font-display font-semibold">
            <Icon name="style" className="text-secondary" /> Disciplina
          </h3>
          <div className="flex flex-wrap gap-3">
            {[
              { label: 'Amarillas', v: data.discipline.yellow, dot: '#facc15' },
              { label: 'Azules', v: data.discipline.blue, dot: '#3b82f6' },
              { label: 'Rojas', v: data.discipline.red, dot: '#ef4444' },
              { label: 'Faltas', v: data.discipline.fouls, dot: '#f97316' },
            ].map((d) => (
              <div key={d.label} className="flex items-center gap-2 rounded-lg bg-surface-container-high px-3 py-2 text-sm">
                <span className="h-3 w-3 rounded-full" style={{ background: d.dot }} />
                <span className="text-on-surface-variant">{d.label}</span>
                <span className="font-bold tabular-nums">{d.v ?? 0}</span>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Charts */}
      <div className="grid gap-4 lg:grid-cols-3">
        <Card accent="green" className="p-4 lg:col-span-2">
          <h3 className="mb-3 flex items-center gap-2 font-display font-semibold">
            <Icon name="show_chart" className="text-secondary" /> Goles por fecha
          </h3>
          {goals.length === 0 ? (
            <p className="py-10 text-center text-sm text-on-surface-variant">Aún sin goles registrados.</p>
          ) : (
            <ResponsiveContainer width="100%" height={240}>
              <AreaChart data={goals} margin={{ top: 5, right: 10, left: -18, bottom: 0 }}>
                <defs>
                  <linearGradient id="gGoals" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#4ae176" stopOpacity={0.45} />
                    <stop offset="95%" stopColor="#4ae176" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis
                  dataKey="date"
                  tick={{ fill: '#c6c6cd', fontSize: 11 }}
                  tickFormatter={(d) => (d === 'Sin fecha' ? 's/f' : String(d).slice(5))}
                  axisLine={{ stroke: '#2a3548' }}
                  tickLine={false}
                />
                <YAxis tick={{ fill: '#c6c6cd', fontSize: 11 }} allowDecimals={false} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={tooltipStyle} cursor={{ stroke: '#45464d' }} />
                <Area type="monotone" dataKey="goals" stroke="#4ae176" strokeWidth={2.5} fill="url(#gGoals)" />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </Card>

        <Card className="p-4">
          <h3 className="mb-3 flex items-center gap-2 font-display font-semibold">
            <Icon name="donut_small" className="text-secondary" /> Torneos por deporte
          </h3>
          {sportData.length === 0 ? (
            <p className="py-10 text-center text-sm text-on-surface-variant">Sin torneos.</p>
          ) : (
            <ResponsiveContainer width="100%" height={240}>
              <PieChart>
                <Pie data={sportData} dataKey="value" nameKey="name" innerRadius={52} outerRadius={84} paddingAngle={3} stroke="none">
                  {sportData.map((_, i) => (
                    <Cell key={i} fill={PALETTE[i % PALETTE.length]} />
                  ))}
                </Pie>
                <Tooltip contentStyle={tooltipStyle} />
              </PieChart>
            </ResponsiveContainer>
          )}
          <div className="mt-2 flex flex-wrap justify-center gap-3 text-xs">
            {sportData.map((s, i) => (
              <span key={s.name} className="flex items-center gap-1">
                <span className="h-2 w-2 rounded-full" style={{ background: PALETTE[i % PALETTE.length] }} />
                {s.name} ({s.value})
              </span>
            ))}
          </div>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="p-4 lg:col-span-2">
          <h3 className="mb-3 flex items-center gap-2 font-display font-semibold">
            <Icon name="leaderboard" className="text-secondary" /> Goleadores
          </h3>
          {scorers.length === 0 ? (
            <p className="py-10 text-center text-sm text-on-surface-variant">Aún sin goleadores.</p>
          ) : (
            <ResponsiveContainer width="100%" height={Math.max(180, scorers.length * 34)}>
              <BarChart data={scorers} layout="vertical" margin={{ top: 0, right: 16, left: 8, bottom: 0 }}>
                <XAxis type="number" tick={{ fill: '#c6c6cd', fontSize: 11 }} allowDecimals={false} axisLine={false} tickLine={false} />
                <YAxis type="category" dataKey="name" width={120} tick={{ fill: '#d8e3fb', fontSize: 11 }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={tooltipStyle} cursor={{ fill: '#1f2a3c' }} />
                <Bar dataKey="goals" fill="#4ae176" radius={[0, 6, 6, 0]} barSize={16} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </Card>

        <Card className="p-4">
          <h3 className="mb-3 flex items-center gap-2 font-display font-semibold">
            <Icon name="emoji_events" className="text-secondary" /> Torneos
          </h3>
          <ul className="space-y-2">
            {(data.tournaments || []).slice(0, 8).map((tt: any) => (
              <li key={tt.id} className="flex items-center justify-between rounded-lg bg-surface-container-high px-3 py-2 text-sm">
                <span className="truncate">
                  <span className="font-medium">{tt.name}</span>
                  <span className="ml-2 text-xs uppercase text-on-surface-variant">{tt.sport_type}</span>
                </span>
                <span
                  className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-semibold ${
                    tt.status === 'active'
                      ? 'bg-secondary-container/40 text-secondary'
                      : 'bg-surface-container-highest text-on-surface-variant'
                  }`}
                >
                  {STATUS_LABEL[tt.status] || tt.status}
                </span>
              </li>
            ))}
            {(data.tournaments || []).length === 0 && (
              <li className="text-sm text-on-surface-variant">Aún no hay torneos.</li>
            )}
          </ul>
        </Card>
      </div>
    </div>
  )
}
