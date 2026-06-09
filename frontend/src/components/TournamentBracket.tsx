import { Icon } from './ui'

function roundLabel(count: number): string {
  return count === 1
    ? 'Final'
    : count === 2
      ? 'Semifinales'
      : count === 4
        ? 'Cuartos de final'
        : count === 8
          ? 'Octavos de final'
          : count === 16
            ? 'Dieciseisavos'
            : `Ronda de ${count * 2}`
}

function Crest({ name }: { name: string | null }) {
  const initials = (name || '?')
    .split(' ')
    .map((w) => w[0])
    .slice(0, 2)
    .join('')
    .toUpperCase()
  return (
    <span className="grid h-5 w-5 shrink-0 place-items-center rounded-full bg-surface-bright text-[9px] font-bold text-on-surface">
      {initials}
    </span>
  )
}

function TeamRow({
  name,
  score,
  win,
}: {
  name: string | null
  score: number | null
  win: boolean
}) {
  return (
    <div className={`flex items-center gap-2 ${win ? 'text-secondary' : 'text-on-surface'}`}>
      <Crest name={name} />
      <span className={`flex-1 truncate text-sm ${win ? 'font-bold' : ''}`}>
        {name || 'Por definir'}
      </span>
      <span className={`tabular-nums text-sm ${win ? 'font-bold' : ''}`}>{score ?? '-'}</span>
    </div>
  )
}

function MatchCard({ m }: { m: any }) {
  const finished = m.status === 'finished'
  const live = m.status === 'live'
  const homeWin = finished && (m.home_score ?? 0) >= (m.away_score ?? 0)
  const awayWin = finished && (m.away_score ?? 0) > (m.home_score ?? 0)
  const statusText = m.is_third_place
    ? '3er puesto'
    : finished
      ? 'Final'
      : live
        ? 'En vivo'
        : 'Programado'
  const winnerName = homeWin ? m.home_team_name : awayWin ? m.away_team_name : null
  return (
    <div className="rounded-xl border border-outline-variant/50 bg-surface-container-high p-2.5 shadow-sm">
      <div className="mb-1 flex items-center justify-between">
        <span className="text-[10px] font-semibold uppercase tracking-wide text-on-surface-variant">
          {statusText}
        </span>
        <span
          className={`grid h-4 w-4 place-items-center rounded-full ${
            live ? 'bg-secondary text-on-secondary' : 'bg-surface-bright text-on-surface-variant'
          }`}
        >
          <Icon name={live ? 'play_arrow' : 'sports_soccer'} className="text-[11px]" />
        </span>
      </div>
      {finished && winnerName && (
        <p className="mb-1 truncate text-[11px] text-on-surface-variant">
          {m.home_score}-{m.away_score} · Gana {winnerName}
        </p>
      )}
      <div className="space-y-1">
        <TeamRow name={m.home_team_name} score={m.home_score} win={homeWin} />
        <TeamRow name={m.away_team_name} score={m.away_score} win={awayWin} />
      </div>
    </div>
  )
}

export default function TournamentBracket({ tree }: { tree: any }) {
  const rounds: any[] = tree?.rounds || []
  if (rounds.length === 0) {
    return (
      <p className="px-2 py-3 text-sm text-on-surface-variant">
        El bracket aún no ha sido generado.
      </p>
    )
  }

  const finalRound = rounds[rounds.length - 1]
  const finalMatch = (finalRound?.matches || []).find((m: any) => !m.is_third_place)
  const champion =
    finalMatch && finalMatch.status === 'finished'
      ? (finalMatch.home_score ?? 0) >= (finalMatch.away_score ?? 0)
        ? finalMatch.home_team_name
        : finalMatch.away_team_name
      : null

  return (
    <div className="overflow-x-auto pb-4">
      <div className="bk">
        {rounds.map((rnd, ri) => {
          const isFinal = ri === rounds.length - 1
          // El partido por el 3er puesto se muestra aparte, no se empareja.
          const mainMatches = (rnd.matches || []).filter((m: any) => !m.is_third_place)
          const thirdPlace = (rnd.matches || []).find((m: any) => m.is_third_place)
          const pairs: any[][] = []
          for (let i = 0; i < mainMatches.length; i += 2) {
            pairs.push(mainMatches.slice(i, i + 2))
          }
          return (
            <div key={rnd.round} className={`bk-round ${isFinal ? 'bk-final' : ''}`}>
              <div className="bk-round-head">{roundLabel(mainMatches.length || 1)}</div>
              <div className="bk-pairs">
                {pairs.map((pair, pi) => (
                  <div key={pi} className={`bk-pair ${pair.length < 2 ? 'bk-solo' : ''}`}>
                    {pair.map((m) => (
                      <div key={m.match_id} className="bk-cell">
                        <MatchCard m={m} />
                      </div>
                    ))}
                  </div>
                ))}
                {thirdPlace && (
                  <div className="bk-pair bk-solo mt-2">
                    <div className="bk-cell">
                      <MatchCard m={thirdPlace} />
                    </div>
                  </div>
                )}
              </div>
            </div>
          )
        })}

        {champion && (
          <div className="bk-round bk-final flex flex-col items-center justify-center px-6">
            <Icon name="emoji_events" className="text-7xl text-amber-300" />
            <p className="mt-2 max-w-[180px] text-center font-display text-lg font-bold text-secondary">
              {champion}
            </p>
            <p className="text-xs uppercase tracking-wide text-on-surface-variant">Campeón</p>
          </div>
        )}
      </div>
    </div>
  )
}
