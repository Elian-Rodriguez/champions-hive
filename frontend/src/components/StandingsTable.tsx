/** La tabla de posiciones, que es lo primero que mira todo el mundo.
 *
 *  El líder se marca con el hexágono de la casa y las columnas que deciden
 *  (PJ, G, E, P, GF, GC, DIF) van en cifra de ancho fijo para que la columna
 *  no baile entre un 9 y un 11. Los puntos quedan en el acento: es el número
 *  por el que se discute. */
import { sportOf } from '../sports'

export default function StandingsTable({
  rows,
  onRowClick,
  logos,
  motivos,
  sport,
}: {
  rows: any[]
  onRowClick?: (row: any) => void
  /** team_id → logo_url; si algún equipo tiene logo, se muestra a la izquierda del nombre. */
  logos?: Record<string, string | null | undefined>
  /** team_id → motivo de la sanción de puntos. Los puntos vienen en la fila
   *  (`points_adjustment`); el motivo va aparte porque una tabla con un -3 sin
   *  explicación es lo que le hace perder la discusión al organizador. */
  motivos?: Record<string, string | null | undefined>
  /** Disciplina del torneo: decide si se muestra la columna de empates. */
  sport?: string | null
}) {
  if (!rows || rows.length === 0) {
    return (
      <p className="px-2 py-3 text-sm text-on-surface-variant">
        Aún no hay resultados para esta tabla.
      </p>
    )
  }
  const conLogos = rows.some((r) => logos?.[r.team_id])
  // En las disciplinas que se juegan a un tanteo no hay empate posible, así
  // que la columna «E» sería una fila de ceros con aire de dato.
  const hayEmpates = sportOf(sport).drawsPossible
  const COLS = [
    { key: 'matches_played', label: 'PJ', title: 'Partidos jugados' },
    { key: 'wins', label: 'G', title: 'Ganados' },
    ...(hayEmpates ? [{ key: 'draws', label: 'E', title: 'Empatados' }] : []),
    { key: 'losses', label: 'P', title: 'Perdidos' },
    { key: 'points_scored', label: 'GF', title: 'A favor' },
    { key: 'points_conceded', label: 'GC', title: 'En contra' },
  ]
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-outline-variant/60 text-[11px] uppercase tracking-[0.12em] text-on-surface-variant">
            <th className="w-9 px-2 py-2 text-left font-semibold">#</th>
            <th className="px-2 py-2 text-left font-semibold">Equipo</th>
            {COLS.map((c) => (
              <th key={c.key} className="px-2 py-2 text-center font-semibold" title={c.title}>
                {c.label}
              </th>
            ))}
            <th className="px-2 py-2 text-center font-semibold" title="Diferencia">
              DIF
            </th>
            <th className="px-2 py-2 text-center font-bold text-secondary">Pts</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => {
            const pos = r.position ?? i + 1
            const lider = pos === 1
            return (
              <tr
                key={r.team_id || i}
                onClick={() => onRowClick && onRowClick(r)}
                className={`group border-t border-outline-variant/30 transition hover:bg-secondary/[0.06] ${
                  onRowClick ? 'cursor-pointer' : ''
                } ${lider ? 'bg-secondary/[0.04]' : ''}`}
              >
                <td className="px-2 py-2">
                  <span className="relative grid h-6 w-6 place-items-center">
                    {lider && <span className="clip-hex absolute inset-0 bg-volt" />}
                    <span
                      className={`tnum relative text-xs font-bold ${
                        lider ? 'text-on-secondary' : 'text-on-surface-variant'
                      }`}
                    >
                      {pos}
                    </span>
                  </span>
                </td>
                <td className="px-2 py-2 font-medium">
                  <span className="flex items-center gap-2">
                    {conLogos &&
                      (logos?.[r.team_id] ? (
                        <span className="clip-hex grid h-6 w-6 shrink-0 place-items-center overflow-hidden bg-surface-container-highest">
                          <img
                            src={logos[r.team_id] as string}
                            alt=""
                            className="h-full w-full object-cover"
                          />
                        </span>
                      ) : (
                        <span className="clip-hex grid h-6 w-6 shrink-0 place-items-center bg-surface-container-highest text-[10px] font-bold text-on-surface-variant">
                          {(r.team_name || '?').trim().charAt(0).toUpperCase()}
                        </span>
                      ))}
                    <span className="truncate font-display font-semibold">
                      {r.team_name || String(r.team_id).slice(0, 8)}
                    </span>
                    {!!r.points_adjustment && (
                      <span
                        title={`Sanción de puntos: ${r.points_adjustment > 0 ? '+' : ''}${
                          r.points_adjustment
                        }${motivos?.[r.team_id] ? ` · ${motivos[r.team_id]}` : ''}`}
                        className={`tnum shrink-0 rounded px-1 py-0.5 text-[10px] font-bold ${
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
                {COLS.map((c) => (
                  <td key={c.key} className="tnum px-2 py-2 text-center text-on-surface-variant">
                    {r[c.key] ?? 0}
                  </td>
                ))}
                <td className="tnum px-2 py-2 text-center">
                  {(r.diff ?? 0) > 0 ? '+' : ''}
                  {r.diff ?? 0}
                </td>
                <td className="tnum px-2 py-2 text-center font-display text-base font-extrabold text-secondary">
                  {r.league_points ?? 0}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
