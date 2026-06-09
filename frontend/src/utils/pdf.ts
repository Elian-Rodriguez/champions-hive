import { jsPDF } from 'jspdf'
import autoTable from 'jspdf-autotable'

const GREEN: [number, number, number] = [74, 225, 118]

export function exportStandingsPDF(
  tournamentName: string,
  groups: Record<string, any[]>,
) {
  const doc = new jsPDF()
  doc.setFontSize(16)
  doc.text(`Champion Hive — ${tournamentName}`, 14, 18)
  doc.setFontSize(10)
  doc.text('Tabla de posiciones', 14, 25)

  let y = 32
  Object.entries(groups).forEach(([group, rows]) => {
    doc.setFontSize(12)
    doc.text(group === 'Sin Grupo' ? 'Tabla general' : `Grupo ${group}`, 14, y)
    autoTable(doc, {
      startY: y + 3,
      head: [['#', 'Equipo', 'PJ', 'G', 'E', 'P', 'GF', 'GC', 'DIF', 'Pts']],
      body: rows.map((r, i) => [
        r.position ?? i + 1,
        r.team_name || String(r.team_id).slice(0, 8),
        r.matches_played ?? 0,
        r.wins ?? 0,
        r.draws ?? 0,
        r.losses ?? 0,
        r.points_scored ?? 0,
        r.points_conceded ?? 0,
        r.diff ?? 0,
        r.league_points ?? 0,
      ]),
      theme: 'grid',
      headStyles: { fillColor: GREEN, textColor: 20 },
      styles: { fontSize: 8 },
    })
    y = (doc as any).lastAutoTable.finalY + 10
  })
  doc.save(`posiciones-${tournamentName}.pdf`)
}

export function exportMatchReportPDF(
  match: any,
  events: any[],
  playerName: (id: string | null) => string,
) {
  const doc = new jsPDF()
  doc.setFontSize(16)
  doc.text('Champion Hive — Reporte de partido', 14, 18)
  doc.setFontSize(14)
  const home = match.home_team_name || 'Local'
  const away = match.away_team_name || 'Visitante'
  doc.text(
    `${home}  ${match.home_score ?? 0} - ${match.away_score ?? 0}  ${away}`,
    14,
    30,
  )
  doc.setFontSize(10)
  doc.text(`Estado: ${match.status || ''}`, 14, 37)

  autoTable(doc, {
    startY: 44,
    head: [['Min', 'Evento', 'Equipo', 'Jugador']],
    body: (events || []).map((e) => {
      const team =
        e.event_data?.team === 'home' ? home : e.event_data?.team === 'away' ? away : ''
      const detail =
        e.event_type === 'CAMBIO'
          ? `Entra ${playerName(e.player_id) || '?'} / Sale ${playerName(e.event_data?.player_out) || '?'}`
          : playerName(e.player_id) || '—'
      const min = e.event_data?.minute
      return [min != null ? `${min}'` : '', e.event_type, team, detail]
    }),
    theme: 'striped',
    headStyles: { fillColor: GREEN, textColor: 20 },
    styles: { fontSize: 9 },
  })
  doc.save(`reporte-${home}-vs-${away}.pdf`)
}
