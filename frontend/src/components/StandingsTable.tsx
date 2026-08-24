export default function StandingsTable({
  rows,
  onRowClick,
  logos,
  motivos,
}: {
  rows: any[]
  onRowClick?: (row: any) => void
  /** team_id → logo_url; si algún equipo tiene logo, se muestra a la izquierda del nombre. */
  logos?: Record<string, string | null | undefined>
  /** team_id → motivo de la sanción de puntos. Los puntos vienen en la fila
   *  (`points_adjustment`); el motivo va aparte porque una tabla con un -3 sin
   *  explicación es lo que le hace perder la discusión al organizador. */
  motivos?: Record<string, string | null | undefined>
}) {
  if (!rows || rows.length === 0) {
    return (
      <p className="px-2 py-3 text-sm text-on-surface-variant">
        Aún no hay resultados para esta tabla.
      </p>
    )
  }
  const conLogos = rows.some((r) => logos?.[r.team_id])
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
              onClick={() => onRowClick && onRowClick(r)}
              className={`border-t border-outline-variant/30 hover:bg-surface-container-high/50 ${
                onRowClick ? 'cursor-pointer' : ''
              }`}
            >
              <td className="px-2 py-2 text-on-surface-variant">
                {r.position ?? i + 1}
              </td>
              <td className="px-2 py-2 font-medium">
                <span className="flex items-center gap-2">
                  {conLogos &&
                    (logos?.[r.team_id] ? (
                      <img
                        src={logos[r.team_id] as string}
                        alt=""
                        className="h-5 w-5 shrink-0 rounded object-cover"
                      />
                    ) : (
                      <span className="grid h-5 w-5 shrink-0 place-items-center rounded-full bg-surface-container-highest text-[10px] font-bold text-on-surface-variant">
                        {(r.team_name || '?').trim().charAt(0).toUpperCase()}
                      </span>
                    ))}
                  <span className="truncate">{r.team_name || String(r.team_id).slice(0, 8)}</span>
                  {!!r.points_adjustment && (
                    <span
                      title={`Sanción de puntos: ${r.points_adjustment > 0 ? '+' : ''}${
                        r.points_adjustment
                      }${motivos?.[r.team_id] ? ` · ${motivos[r.team_id]}` : ''}`}
                      className={`shrink-0 rounded px-1 py-0.5 text-[10px] font-bold tabular-nums ${
                        r.points_adjustment < 0
                          ? 'bg-error-container text-on-error-container'
                          : 'bg-secondary/20 text-secondary'
                      }`}
                    >
                      {r.points_adjustment > 0 ? '+' : ''}
                      {r.points_adjustment}
                    </span>
                  )}
                </span>
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
