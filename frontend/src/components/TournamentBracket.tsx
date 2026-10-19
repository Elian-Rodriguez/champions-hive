import { Icon } from './ui'
import { legLabel, penalesLabel, resumenLlave, woLabel } from '../utils/partido'

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
    <span className="clip-hex grid h-5 w-5 shrink-0 place-items-center bg-surface-container-highest text-[9px] font-bold text-on-surface">
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
      <span className={`tnum text-sm ${win ? 'font-bold' : ''}`}>{score ?? '-'}</span>
    </div>
  )
}

function MatchCard({ m }: { m: any }) {
  const finished = m.status === 'finished'
  const live = m.status === 'live'
  // Quién pasó lo dice el servidor, no el marcador: con una tanda de penales
  // o una llave a ida y vuelta, el que tiene el número más alto en ESTE
  // partido puede ser perfectamente el que quedó eliminado.
  const ganador = m.llave?.ganador_id ? String(m.llave.ganador_id) : null
  const homeWin = ganador
    ? ganador === String(m.home_team_id)
    : finished && (m.home_score ?? 0) >= (m.away_score ?? 0)
  const awayWin = ganador
    ? ganador === String(m.away_team_id)
    : finished && (m.away_score ?? 0) > (m.home_score ?? 0)
  // Un W.O. en una llave se dice: el equipo pasó sin jugar y la gente pregunta.
  const wo = woLabel(m.walkover)
  const leg = legLabel(m.leg)
  const statusText = m.is_third_place
    ? '3er puesto'
    : finished
      ? wo || leg || 'Final'
      : leg || (live ? 'En vivo' : m.status === 'postponed' ? 'Aplazado' : 'Programado')
  const resumen = resumenLlave(
    m.llave,
    m.home_team_name,
    m.away_team_name,
    m.home_team_id,
  )
  return (
    <div
      className={`rounded-xl border bg-surface-container-high p-2.5 transition duration-200 ease-snap ${
        live
          ? 'border-tertiary/50 shadow-flare'
          : 'border-outline-variant/50 hover:border-secondary/40'
      }`}
    >
      <div className="mb-1 flex items-center justify-between gap-2">
        <span
          className={`truncate text-[10px] font-semibold uppercase tracking-[0.14em] ${
            live ? 'text-tertiary' : 'text-on-surface-variant'
          }`}
        >
          {statusText}
        </span>
        <span
          className={`relative grid h-4 w-4 shrink-0 place-items-center ${
            live ? 'text-tertiary' : 'text-on-surface-variant'
          }`}
        >
          <span
            className={`clip-hex absolute inset-0 ${
              live ? 'live-dot bg-current' : 'bg-current opacity-25'
            }`}
          />
          <Icon
            name={live ? 'play_arrow' : 'sports_soccer'}
            className={`relative text-[11px] ${live ? 'text-on-tertiary' : ''}`}
          />
        </span>
      </div>
      {finished && resumen && (
        <p className="mb-1 truncate text-[11px] text-on-surface-variant">
          <span className="tnum">
            {m.home_score}-{m.away_score}
          </span>
          {penalesLabel(m) ? ` (${penalesLabel(m)})` : ''} · {resumen}
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
            <span className="relative grid h-20 w-20 place-items-center">
              <span className="clip-hex absolute inset-0 bg-volt-soft" />
              <Icon name="emoji_events" className="relative text-6xl text-ember" />
            </span>
            <p className="headline mt-2 max-w-[180px] text-center text-lg text-volt-gradient">
              {champion}
            </p>
            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-on-surface-variant">
              Campeón
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
