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
  opts: { tournamentName?: string; homePlayers?: any[]; awayPlayers?: any[] } = {},
) {
  const doc = new jsPDF()
  const W = doc.internal.pageSize.getWidth()
  const home = match.home_team_name || 'Local'
  const away = match.away_team_name || 'Visitante'
  const evs = events || []

  // Encabezado
  doc.setFontSize(11)
  doc.setTextColor(120)
  doc.text('CHAMPION HIVE', W / 2, 14, { align: 'center' })
  doc.setFontSize(18)
  doc.setTextColor(20)
  doc.text('ACTA DEL PARTIDO', W / 2, 23, { align: 'center' })

  const sub = [
    opts.tournamentName,
    match.stage_name,
    match.group_name ? `Grupo ${match.group_name}` : null,
  ]
    .filter(Boolean)
    .join('   ·   ')
  if (sub) {
    doc.setFontSize(10)
    doc.setTextColor(110)
    doc.text(sub, W / 2, 30, { align: 'center' })
  }

  const fecha = match.scheduled_start
    ? String(match.scheduled_start).slice(0, 16).replace('T', '  ')
    : '________________'
  const lugar =
    [match.venue_name, match.court_name].filter(Boolean).join(' · ') || '________________'
  doc.setFontSize(10)
  doc.setTextColor(60)
  doc.text(`Fecha: ${fecha}`, 14, 40)
  doc.text(`Sede: ${lugar}`, W - 14, 40, { align: 'right' })

  // Marcador
  doc.setDrawColor(GREEN[0], GREEN[1], GREEN[2])
  doc.setLineWidth(0.6)
  doc.roundedRect(14, 45, W - 28, 18, 2, 2)
  doc.setFontSize(13)
  doc.setTextColor(20)
  doc.text(home, 22, 56)
  doc.text(away, W - 22, 56, { align: 'right' })
  doc.setFontSize(20)
  doc.text(`${match.home_score ?? 0} - ${match.away_score ?? 0}`, W / 2, 57, { align: 'center' })

  let y = 72
  const teamOf = (e: any) =>
    e.event_data?.team === 'home' ? home : e.event_data?.team === 'away' ? away : ''
  const minOf = (e: any) => (e.event_data?.minute != null ? `${e.event_data.minute}'` : '')
  const section = (title: string, head: string[], body: any[][]) => {
    if (!body.length) return
    if (y > 250) {
      doc.addPage()
      y = 20
    }
    doc.setFontSize(12)
    doc.setTextColor(20)
    doc.text(title, 14, y)
    autoTable(doc, {
      startY: y + 2,
      head: [head],
      body,
      theme: 'striped',
      headStyles: { fillColor: GREEN, textColor: 20 },
      styles: { fontSize: 9 },
      margin: { left: 14, right: 14 },
    })
    y = (doc as any).lastAutoTable.finalY + 8
  }

  const goals = evs.filter((e) => e.event_type === 'GOL' || e.event_type === 'GOAL')
  section(
    'Goles',
    ['Min', 'Equipo', 'Jugador'],
    goals.map((e) => [minOf(e), teamOf(e), playerName(e.player_id) || '—']),
  )

  const disc = evs.filter((e) =>
    ['AMARILLA', 'AZUL', 'ROJA', 'FALTA', 'TECNICA', 'ANTIDEPORTIVA', 'FOUL'].includes(e.event_type),
  )
  section(
    'Disciplina (tarjetas y faltas)',
    ['Min', 'Tipo', 'Equipo', 'Jugador'],
    disc.map((e) => [minOf(e), e.event_type, teamOf(e), playerName(e.player_id) || '—']),
  )

  const subs = evs.filter((e) => e.event_type === 'CAMBIO')
  section(
    'Sustituciones',
    ['Min', 'Equipo', 'Entra', 'Sale'],
    subs.map((e) => [
      minOf(e),
      teamOf(e),
      playerName(e.player_id) || '?',
      playerName(e.event_data?.player_out) || '?',
    ]),
  )

  // Planteles (dos columnas)
  const roster = (players?: any[]) =>
    (players || [])
      .map((p) => [p.number != null ? `#${p.number}` : '', p.name])
      .filter((r) => r[1])
  const hr = roster(opts.homePlayers)
  const ar = roster(opts.awayPlayers)
  if (hr.length || ar.length) {
    if (y > 235) {
      doc.addPage()
      y = 20
    }
    doc.setFontSize(12)
    doc.setTextColor(20)
    doc.text('Planteles', 14, y)
    const startY = y + 2
    const colW = (W - 34) / 2
    autoTable(doc, {
      startY,
      head: [['#', home]],
      body: hr.length ? hr : [['', '—']],
      theme: 'grid',
      headStyles: { fillColor: GREEN, textColor: 20 },
      styles: { fontSize: 8 },
      margin: { left: 14 },
      tableWidth: colW,
    })
    const leftEnd = (doc as any).lastAutoTable.finalY
    autoTable(doc, {
      startY,
      head: [['#', away]],
      body: ar.length ? ar : [['', '—']],
      theme: 'grid',
      headStyles: { fillColor: GREEN, textColor: 20 },
      styles: { fontSize: 8 },
      margin: { left: W / 2 + 3 },
      tableWidth: colW,
    })
    y = Math.max(leftEnd, (doc as any).lastAutoTable.finalY) + 8
  }

  // Firmas
  let sy = y + 14
  if (sy > 272) {
    doc.addPage()
    sy = 60
  }
  sy = Math.max(sy, 262)
  doc.setDrawColor(120)
  doc.setLineWidth(0.3)
  const cols = [W / 6, W / 2, (5 * W) / 6]
  const labels = ['Árbitro', 'Delegado local', 'Delegado visitante']
  doc.setFontSize(9)
  doc.setTextColor(80)
  cols.forEach((cx, i) => {
    doc.line(cx - 28, sy, cx + 28, sy)
    doc.text(labels[i], cx, sy + 5, { align: 'center' })
  })

  doc.save(`acta-${home}-vs-${away}.pdf`)
}
