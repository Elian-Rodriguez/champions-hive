function BracketRow({
  name,
  score,
  winner,
}: {
  name: string | null
  score: number | null
  winner: boolean
}) {
  return (
    <div
      className={`flex items-center justify-between gap-2 ${
        winner ? 'font-semibold text-secondary' : 'text-on-surface'
      }`}
    >
      <span className="truncate">{name || 'Por definir'}</span>
      <span className="tabular-nums">{score ?? '-'}</span>
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
  return (
    <div className="flex gap-6 overflow-x-auto pb-4">
      {rounds.map((rnd) => (
        <div key={rnd.round} className="flex min-w-[230px] flex-col gap-4">
          <h4 className="font-display text-sm font-semibold text-on-surface-variant">
            Ronda {rnd.round}
          </h4>
          <div className="flex h-full flex-col justify-around gap-4">
            {rnd.matches.map((m: any) => {
              const finished = m.status === 'finished'
              return (
                <div
                  key={m.match_id}
                  className="rounded-lg border border-outline-variant/40 bg-surface-container-high p-3 text-sm"
                >
                  <BracketRow
                    name={m.home_team_name}
                    score={m.home_score}
                    winner={finished && m.home_score >= m.away_score}
                  />
                  <div className="my-1.5 border-t border-outline-variant/30" />
                  <BracketRow
                    name={m.away_team_name}
                    score={m.away_score}
                    winner={finished && m.away_score > m.home_score}
                  />
                </div>
              )
            })}
          </div>
        </div>
      ))}
    </div>
  )
}
