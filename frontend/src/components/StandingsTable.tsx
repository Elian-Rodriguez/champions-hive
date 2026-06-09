export default function StandingsTable({ rows }: { rows: any[] }) {
  if (!rows || rows.length === 0) {
    return (
      <p className="px-2 py-3 text-sm text-on-surface-variant">
        Aún no hay resultados para esta tabla.
      </p>
    )
  }
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-on-surface-variant">
            <th className="w-8 px-2 py-2 text-left">#</th>
            <th className="px-2 py-2 text-left">Equipo</th>
            <th className="px-2 py-2 text-center">PJ</th>
            <th className="px-2 py-2 text-center">G</th>
            <th className="px-2 py-2 text-center">E</th>
            <th className="px-2 py-2 text-center">P</th>
            <th className="px-2 py-2 text-center">GF</th>
            <th className="px-2 py-2 text-center">GC</th>
            <th className="px-2 py-2 text-center">DIF</th>
            <th className="px-2 py-2 text-center font-bold">Pts</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr
              key={r.team_id || i}
              className="border-t border-outline-variant/30 hover:bg-surface-container-high/50"
            >
              <td className="px-2 py-2 text-on-surface-variant">
                {r.position ?? i + 1}
              </td>
              <td className="px-2 py-2 font-medium">
                {r.team_name || String(r.team_id).slice(0, 8)}
              </td>
              <td className="px-2 py-2 text-center">{r.matches_played ?? 0}</td>
              <td className="px-2 py-2 text-center">{r.wins ?? 0}</td>
              <td className="px-2 py-2 text-center">{r.draws ?? 0}</td>
              <td className="px-2 py-2 text-center">{r.losses ?? 0}</td>
              <td className="px-2 py-2 text-center">{r.points_scored ?? 0}</td>
              <td className="px-2 py-2 text-center">{r.points_conceded ?? 0}</td>
              <td className="px-2 py-2 text-center">
                {(r.diff ?? 0) > 0 ? '+' : ''}
                {r.diff ?? 0}
              </td>
              <td className="px-2 py-2 text-center font-bold text-secondary">
                {r.league_points ?? 0}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
