import { jsPDF } from 'jspdf'
import autoTable from 'jspdf-autotable'
import QRCode from 'qrcode'
import { sportOf } from '../sports'

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

// Exporta un PNG ya generado (p. ej. la imagen del bracket) como PDF de una
// página, centrado y ajustado al tamaño de la hoja.
export async function exportImagePDF(
  blob: Blob,
  filename: string,
  opts: { landscape?: boolean } = {},
) {
  const dataUrl = await new Promise<string>((resolve, reject) => {
    const fr = new FileReader()
    fr.onload = () => resolve(String(fr.result))
    fr.onerror = () => reject(new Error('No se pudo leer la imagen'))
    fr.readAsDataURL(blob)
  })
  const { width, height } = await new Promise<{ width: number; height: number }>(
    (resolve, reject) => {
      const img = new Image()
      img.onload = () => resolve({ width: img.width, height: img.height })
      img.onerror = () => reject(new Error('No se pudo leer la imagen'))
      img.src = dataUrl
    },
  )
  const doc = new jsPDF({ orientation: opts.landscape ? 'landscape' : 'portrait' })
  const pw = doc.internal.pageSize.getWidth()
  const ph = doc.internal.pageSize.getHeight()
  const margin = 8
  const scale = Math.min((pw - margin * 2) / width, (ph - margin * 2) / height)
  const w = width * scale
  const h = height * scale
  doc.addImage(dataUrl, 'PNG', (pw - w) / 2, (ph - h) / 2, w, h)
  doc.save(filename)
}

// --------------------------------------------------------------------------- //
//  Acta del partido
// --------------------------------------------------------------------------- //
// El acta es el papel que queda: se imprime, se firma en la cancha y muchas
// veces es lo único que el club se lleva del campeonato. Por eso se arma como
// un documento oficial —cabecera con la marca del torneo, marcador, planillas
// de goles y sanciones, planteles, observaciones y firmas— y no como un volcado
// de la base. Todo lo que puede faltar (logos, árbitro, jugadores) degrada solo.

type RGB = [number, number, number]

const NAVY: RGB = [10, 20, 36]
const NAVY_2: RGB = [24, 40, 64]
const GREEN_DK: RGB = [0, 168, 79]
const INK: RGB = [30, 39, 52]
const MUTED: RGB = [124, 138, 158]
const LINE: RGB = [223, 230, 239]
const SOFT: RGB = [246, 249, 252]
const PAPER: RGB = [252, 253, 255]
const WHITE: RGB = [255, 255, 255]

const ESTADO: Record<string, { label: string; bg: RGB; fg: RGB }> = {
  scheduled: { label: 'Programado', bg: [226, 232, 240], fg: [71, 85, 105] },
  live: { label: 'En juego', bg: [255, 138, 76], fg: WHITE },
  finished: { label: 'Finalizado', bg: GREEN, fg: [8, 20, 37] },
  postponed: { label: 'Aplazado', bg: [253, 224, 71], fg: [69, 44, 4] },
}

// Cómo se pinta cada sanción en la planilla de disciplina. La clave es el tipo
// de evento que carga el árbitro (ver sports.ts).
const SANCION: Record<string, { label: string; bg: RGB; fg: RGB; corto: string }> = {
  AMARILLA: { label: 'Amarilla', bg: [250, 204, 21], fg: [58, 42, 0], corto: 'AM' },
  AZUL: { label: 'Azul', bg: [59, 130, 246], fg: WHITE, corto: 'AZ' },
  ROJA: { label: 'Roja', bg: [225, 60, 60], fg: WHITE, corto: 'RJ' },
  FALTA: { label: 'Falta', bg: [237, 242, 248], fg: [80, 94, 112], corto: 'F' },
  FOUL: { label: 'Falta', bg: [237, 242, 248], fg: [80, 94, 112], corto: 'F' },
  TECNICA: { label: 'Técnica', bg: [168, 85, 247], fg: WHITE, corto: 'TC' },
  ANTIDEPORTIVA: { label: 'Antideportiva', bg: [244, 114, 60], fg: WHITE, corto: 'AD' },
}
const TIPOS_SANCION = Object.keys(SANCION)

const DIAS = ['dom', 'lun', 'mar', 'mié', 'jue', 'vie', 'sáb']

/** La fecha se guarda tal como la escribió el organizador: se lee, no se
 *  convierte de zona (igual que el calendario y las imágenes para redes). */
function partesFecha(iso?: string | null): { dia: string; hora: string | null } | null {
  const s = iso ? String(iso) : ''
  if (s.length < 10) return null
  const y = Number(s.slice(0, 4))
  const m = Number(s.slice(5, 7))
  const d = Number(s.slice(8, 10))
  if (!y || !m || !d) return null
  const dt = new Date(y, m - 1, d)
  const nombre = isNaN(dt.getTime()) ? '' : `${DIAS[dt.getDay()]} `
  return {
    dia: `${nombre}${String(d).padStart(2, '0')}/${String(m).padStart(2, '0')}/${y}`,
    hora: s.length >= 16 ? s.slice(11, 16) : null,
  }
}

function selloDeHoy(): string {
  const d = new Date()
  const p = (n: number) => String(n).padStart(2, '0')
  return `${p(d.getDate())}/${p(d.getMonth() + 1)}/${d.getFullYear()} ${p(d.getHours())}:${p(d.getMinutes())}`
}

function slug(s: string): string {
  return (
    (s || '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '') || 'equipo'
  )
}

function hexRgb(hex?: string | null): RGB | null {
  const m = /^#?([0-9a-f]{6})$/i.exec(String(hex || '').trim())
  if (!m) return null
  const n = parseInt(m[1], 16)
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255]
}

function iniciales(nombre: string): string {
  const p = String(nombre || '').trim().split(/\s+/).filter(Boolean)
  if (!p.length) return '?'
  return (p[0][0] + (p.length > 1 ? p[1][0] : '')).toUpperCase()
}

/** Negro o blanco según el fondo, para que la inicial del escudo se lea. */
function contraste(c: RGB): RGB {
  return c[0] * 0.299 + c[1] * 0.587 + c[2] * 0.114 > 150 ? [15, 23, 38] : WHITE
}

function contener(iw: number, ih: number, bw: number, bh: number) {
  const k = Math.min(bw / iw, bh / ih)
  return { w: iw * k, h: ih * k }
}

/** Trae una imagen remota como data URL. Devuelve null si el servidor del logo
 *  no permite CORS (el canvas quedaría contaminado) o si la URL no carga: el
 *  acta se dibuja igual, con la inicial del equipo en vez del escudo. */
async function cargarImagen(
  url?: string | null,
): Promise<{ data: string; w: number; h: number } | null> {
  if (!url) return null
  try {
    const img = await new Promise<HTMLImageElement | null>((resolve) => {
      // Con mala señal el logo puede no contestar nunca: a los 4 s se sigue sin
      // él antes que dejar al árbitro esperando un acta que no baja.
      const reloj = setTimeout(() => resolve(null), 4000)
      const listo = (v: HTMLImageElement | null) => {
        clearTimeout(reloj)
        resolve(v)
      }
      const i = new Image()
      i.crossOrigin = 'anonymous'
      i.onload = () => listo(i)
      i.onerror = () => listo(null)
      i.src = String(url)
    })
    if (!img || !img.width || !img.height) return null
    // El escudo se imprime en 14-18 mm: más de 360 px al lado largo no se nota
    // y sí infla el PDF (un logo grande pesa más que el acta entera).
    const k = Math.min(1, 360 / Math.max(img.width, img.height))
    const c = document.createElement('canvas')
    c.width = Math.max(1, Math.round(img.width * k))
    c.height = Math.max(1, Math.round(img.height * k))
    const ctx = c.getContext('2d')
    if (!ctx) return null
    ctx.drawImage(img, 0, 0, c.width, c.height)
    return { data: c.toDataURL('image/png'), w: c.width, h: c.height }
  } catch {
    return null
  }
}

/** QR al marcador público del torneo: el acta impresa también vende. */
async function qrDelTorneo(id?: string | null) {
  try {
    const origen = typeof window !== 'undefined' ? window.location.origin : ''
    if (!origen) return null
    const link = id ? `${origen}/?t=${id}` : origen
    const data = await QRCode.toDataURL(link, {
      width: 260,
      margin: 1,
      color: { dark: '#0a1424', light: '#ffffff' },
    })
    return { data, link, host: origen.replace(/^https?:\/\//, '') }
  } catch {
    return null
  }
}

type TextoOpts = {
  size?: number
  bold?: boolean
  color?: RGB
  align?: 'left' | 'center' | 'right'
  space?: number
  max?: number
}

/** Un solo helper de texto: tamaño, peso, color, alineación, interletrado y
 *  recorte con puntos suspensivos cuando no cabe. */
function texto(doc: jsPDF, txt: any, x: number, y: number, o: TextoOpts = {}): number {
  doc.setFont('helvetica', o.bold ? 'bold' : 'normal')
  doc.setFontSize(o.size ?? 9)
  const c = o.color || INK
  doc.setTextColor(c[0], c[1], c[2])
  const space = o.space || 0
  const ancho = (t: string) => doc.getTextWidth(t) + space * Math.max(0, t.length - 1)
  let s = txt == null ? '' : String(txt)
  if (o.max && ancho(s) > o.max) {
    while (s.length > 1 && ancho(`${s}...`) > o.max) s = s.slice(0, -1)
    s = `${s.replace(/[\s.]+$/, '')}...`
  }
  const w = ancho(s)
  const px = o.align === 'center' ? x - w / 2 : o.align === 'right' ? x - w : x
  doc.text(s, px, y, space ? { charSpace: space } : undefined)
  return w
}

/** Tamaño de fuente más grande que hace caber el texto en el ancho dado. */
function ajustar(doc: jsPDF, txt: string, max: number, desde: number, hasta: number): number {
  doc.setFont('helvetica', 'bold')
  let s = desde
  while (s > hasta) {
    doc.setFontSize(s)
    if (doc.getTextWidth(String(txt || '')) <= max) break
    s -= 0.5
  }
  return s
}

function caja(
  doc: jsPDF,
  x: number,
  y: number,
  w: number,
  h: number,
  o: { r?: number; fill?: RGB; border?: RGB; lw?: number } = {},
) {
  const r = o.r ?? 2
  if (o.fill) doc.setFillColor(o.fill[0], o.fill[1], o.fill[2])
  if (o.border) {
    doc.setDrawColor(o.border[0], o.border[1], o.border[2])
    doc.setLineWidth(o.lw ?? 0.2)
  }
  doc.roundedRect(x, y, w, h, r, r, o.fill && o.border ? 'FD' : o.fill ? 'F' : 'S')
}

function linea(
  doc: jsPDF,
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  color: RGB = LINE,
  lw = 0.2,
  dash?: number[],
) {
  doc.setDrawColor(color[0], color[1], color[2])
  doc.setLineWidth(lw)
  if (dash) doc.setLineDashPattern(dash, 0)
  doc.line(x1, y1, x2, y2)
  if (dash) doc.setLineDashPattern([], 0)
}

/** jsPDF no tiene degradados: se fingen con tajadas verticales. */
function barra(doc: jsPDF, x: number, y: number, w: number, h: number, a: RGB, b: RGB, pasos = 64) {
  const paso = w / pasos
  for (let i = 0; i < pasos; i++) {
    const t = pasos === 1 ? 0 : i / (pasos - 1)
    doc.setFillColor(
      Math.round(a[0] + (b[0] - a[0]) * t),
      Math.round(a[1] + (b[1] - a[1]) * t),
      Math.round(a[2] + (b[2] - a[2]) * t),
    )
    doc.rect(x + i * paso, y, paso + 0.2, h, 'F')
  }
}

/** Escudo del equipo: el logo si cargó, si no un chip con los colores del
 *  uniforme y la inicial. */
function escudo(
  doc: jsPDF,
  x: number,
  y: number,
  s: number,
  img: { data: string; w: number; h: number } | null,
  colores: string[] | undefined,
  nombre: string,
) {
  if (img) {
    caja(doc, x, y, s, s, { r: s * 0.22, fill: WHITE, border: LINE, lw: 0.2 })
    const f = contener(img.w, img.h, s - 2.6, s - 2.6)
    doc.addImage(img.data, 'PNG', x + (s - f.w) / 2, y + (s - f.h) / 2, f.w, f.h, undefined, 'FAST')
    return
  }
  const base = hexRgb((colores || [])[0]) || NAVY_2
  caja(doc, x, y, s, s, { r: s * 0.22, fill: base })
  const dos = hexRgb((colores || [])[1])
  if (dos) {
    doc.setFillColor(dos[0], dos[1], dos[2])
    doc.rect(x + s * 0.58, y, s * 0.16, s, 'F')
  }
  texto(doc, iniciales(nombre), x + s / 2, y + s / 2 + s * 0.16, {
    size: s * 1.9,
    bold: true,
    color: contraste(base),
    align: 'center',
  })
}

/** Sello diagonal para el acta de un partido que todavía no está cerrado: que
 *  nadie la haga pasar por definitiva. */
function marcaDeAgua(doc: jsPDF, W: number, H: number, txt: string) {
  const G = (doc as any).GState
  if (G) doc.setGState(new G({ opacity: 0.07 }))
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(54)
  doc.setTextColor(NAVY[0], NAVY[1], NAVY[2])
  doc.text(txt, W / 2, H / 2 + 24, { align: 'center', angle: 30 })
  if (G) doc.setGState(new G({ opacity: 1 }))
}

export type ActaOptions = {
  /** Torneo completo: logo, disciplina, categoría e id (para el QR). */
  tournament?: any
  /** Compatibilidad: alcanza el nombre si no se tiene el torneo entero. */
  tournamentName?: string
  homePlayers?: any[]
  awayPlayers?: any[]
  /** Planilla del partido: quiénes jugaron de verdad, con `is_starter` y
   *  `is_captain`. Si viene, es la que se imprime; el acta que enumera el
   *  plantel entero no prueba quién estuvo en cancha, que es para lo que se
   *  firma. Sin planilla se sigue imprimiendo la nómina completa. */
  homeLineup?: any[]
  awayLineup?: any[]
  /** Equipos tal como los devuelve /teams: logo_url y colores del uniforme. */
  homeTeam?: any
  awayTeam?: any
  refereeName?: string | null
}

export async function exportMatchReportPDF(
  match: any,
  events: any[],
  playerName: (id: string | null) => string,
  opts: ActaOptions = {},
) {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' })
  const W = doc.internal.pageSize.getWidth()
  const H = doc.internal.pageSize.getHeight()
  const M = 14
  const CW = W - M * 2
  const PIE = H - 17

  const t = opts.tournament || {}
  const torneo = opts.tournamentName || t.name || 'Campeonato'
  const disciplina = sportOf(t.sport_type)
  const home = match.home_team_name || 'Local'
  const away = match.away_team_name || 'Visitante'
  const hs = match.home_score ?? 0
  const as = match.away_score ?? 0
  const evs = events || []
  const estado = String(match.status || 'scheduled')
  const arbitro = opts.refereeName || match.referee_name || ''
  const codigo = `ACT-${(String(match.id || '').replace(/-/g, '').slice(0, 6) || '000000').toUpperCase()}`
  const emitida = selloDeHoy()
  const fecha = partesFecha(match.scheduled_start)

  // Recursos remotos primero: el dibujo es síncrono y necesita las imágenes.
  const [logoTorneo, logoLocal, logoVisita, qr] = await Promise.all([
    cargarImagen(t.logo_url),
    cargarImagen(opts.homeTeam?.logo_url),
    cargarImagen(opts.awayTeam?.logo_url),
    qrDelTorneo(t.id),
  ])

  // ------------------------------------------------------------------ marco --
  function cabecera(primera: boolean): number {
    const h = primera ? 34 : 16
    doc.setFillColor(NAVY[0], NAVY[1], NAVY[2])
    doc.rect(0, 0, W, h, 'F')
    barra(doc, 0, 0, W, 1.8, GREEN, GREEN_DK)
    if (!primera) {
      texto(doc, `${home}  vs  ${away}`, M, 10.6, {
        size: 9,
        bold: true,
        color: WHITE,
        max: CW - 62,
      })
      texto(doc, `${codigo} · continuación`, W - M, 10.6, {
        size: 7.4,
        color: [150, 168, 190],
        align: 'right',
      })
      return h + 10
    }
    const bs = 18
    if (logoTorneo) {
      caja(doc, M, 8, bs, bs, { r: 4, fill: WHITE })
      const f = contener(logoTorneo.w, logoTorneo.h, bs - 3, bs - 3)
      doc.addImage(
        logoTorneo.data, 'PNG', M + (bs - f.w) / 2, 8 + (bs - f.h) / 2, f.w, f.h, 'logo', 'FAST',
      )
    } else {
      caja(doc, M, 8, bs, bs, { r: 4, fill: GREEN })
      texto(doc, 'CH', M + bs / 2, 8 + bs / 2 + 2.4, {
        size: 13,
        bold: true,
        color: NAVY,
        align: 'center',
      })
    }
    const tx = M + bs + 6
    texto(doc, torneo, tx, 17, { size: 13, bold: true, color: WHITE, max: 104 })
    const sub = [disciplina.label, t.category, match.stage_name, match.group_name ? `Grupo ${match.group_name}` : null]
      .filter(Boolean)
      .map((s: any) => String(s).toUpperCase())
      .join('  ·  ')
    texto(doc, sub, tx, 23.5, { size: 6.8, color: [140, 158, 180], space: 0.5, max: 104 })
    texto(doc, 'ACTA OFICIAL DE PARTIDO', W - M, 13.5, {
      size: 9,
      bold: true,
      color: GREEN,
      align: 'right',
      space: 0.35,
    })
    texto(doc, codigo, W - M, 19.5, { size: 8.4, color: WHITE, align: 'right', space: 0.7 })
    texto(doc, `Emitida ${emitida}`, W - M, 24.5, {
      size: 6.6,
      color: [140, 158, 180],
      align: 'right',
    })
    return h + 8
  }

  const conCabecera = new Set<number>([1])
  const paginaActual = () => (doc as any).internal.getCurrentPageInfo().pageNumber
  function cabeceraSiFalta() {
    const n = paginaActual()
    if (conCabecera.has(n)) return
    conCabecera.add(n)
    cabecera(false)
  }
  let y = cabecera(true)
  function nuevaPagina() {
    doc.addPage()
    conCabecera.add(paginaActual())
    y = cabecera(false)
  }
  const asegurar = (alto: number) => {
    if (y + alto > PIE) nuevaPagina()
  }

  // --------------------------------------------------------------- marcador --
  const HERO = 50
  caja(doc, M, y, CW, HERO, { r: 3.5, fill: SOFT, border: LINE, lw: 0.25 })
  const pill = ESTADO[estado] || ESTADO.scheduled
  caja(doc, W / 2 - 18, y - 3.5, 36, 7, { r: 3.5, fill: pill.bg })
  texto(doc, pill.label.toUpperCase(), W / 2, y + 0.9, {
    size: 7,
    bold: true,
    color: pill.fg,
    align: 'center',
    space: 0.5,
  })

  const bs = 14
  const cy = y + 15
  const nx = M + 7 + bs + 5
  const anchoNombre = W / 2 - 20 - nx
  escudo(doc, M + 7, cy - bs / 2, bs, logoLocal, opts.homeTeam?.colors, home)
  texto(doc, home, nx, cy + 0.6, {
    size: ajustar(doc, home, anchoNombre, 11.5, 8),
    bold: true,
    color: NAVY,
    max: anchoNombre,
  })
  texto(doc, 'LOCAL', nx, cy + 5.8, { size: 6, color: MUTED, space: 0.8 })

  const ax = W - M - 7 - bs - 5
  escudo(doc, W - M - 7 - bs, cy - bs / 2, bs, logoVisita, opts.awayTeam?.colors, away)
  texto(doc, away, ax, cy + 0.6, {
    size: ajustar(doc, away, anchoNombre, 11.5, 8),
    bold: true,
    color: NAVY,
    align: 'right',
    max: anchoNombre,
  })
  texto(doc, 'VISITANTE', ax, cy + 5.8, { size: 6, color: MUTED, space: 0.8, align: 'right' })

  texto(doc, `${hs}  -  ${as}`, W / 2, cy + 3.4, { size: 23, bold: true, color: NAVY, align: 'center' })
  // W.O.: el marcador existe pero el partido no se jugó, y el acta tiene que
  // decirlo — es lo que justifica el 3-0 ante quien la lee semanas después.
  const wo = match.walkover || null
  const desenlace =
    estado === 'postponed'
      ? 'PARTIDO APLAZADO'
      : estado === 'finished'
        ? wo === 'both'
          ? 'DOBLE W.O.'
          : wo
            ? `GANA ${wo === 'home' ? away : home} POR W.O.`
            : hs > as
              ? `GANA ${home}`
              : as > hs
                ? `GANA ${away}`
                : 'EMPATE'
        : estado === 'live'
          ? 'MARCADOR PARCIAL'
          : 'RESULTADO PENDIENTE'
  texto(doc, desenlace, W / 2, cy + 9.4, {
    size: 6.4,
    color: MUTED,
    align: 'center',
    space: 0.2,
    max: 64,
  })

  linea(doc, M + 6, y + 30, W - M - 6, y + 30)
  const celdas = [
    { l: 'FECHA Y HORA', v: fecha?.dia || 'Sin programar', s: fecha?.hora || 'Hora por definir', w: 44 },
    {
      l: 'SEDE Y CANCHA',
      v: match.venue_name || 'Sede por asignar',
      s: match.court_name || 'Cancha por asignar',
      w: 52,
    },
    {
      l: 'FASE',
      v: match.stage_name || 'Sin fase',
      s: match.group_name ? `Grupo ${match.group_name}` : '',
      w: 42,
    },
    { l: 'ÁRBITRO', v: arbitro || 'Por designar', s: arbitro ? 'Central' : '', w: 44 },
  ]
  let cx = M
  celdas.forEach((c, i) => {
    if (i) linea(doc, cx, y + 33, cx, y + 46.5)
    texto(doc, c.l, cx + 5, y + 36.8, { size: 5.8, color: MUTED, space: 0.7 })
    texto(doc, c.v, cx + 5, y + 41.6, { size: 8.2, bold: true, color: NAVY, max: c.w - 8 })
    if (c.s) texto(doc, c.s, cx + 5, y + 45.8, { size: 6.8, color: MUTED, max: c.w - 8 })
    cx += c.w
  })
  y += HERO + 11

  // --------------------------------------------------------------- planillas --
  function titulo(txt: string, nota?: string) {
    asegurar(30)
    doc.setFillColor(GREEN[0], GREEN[1], GREEN[2])
    doc.roundedRect(M, y - 3.3, 2.6, 5, 1.3, 1.3, 'F')
    texto(doc, txt.toUpperCase(), M + 6, y, { size: 9.4, bold: true, color: NAVY, space: 0.4, max: CW - 60 })
    if (nota) texto(doc, nota, W - M, y, { size: 7.2, color: MUTED, align: 'right' })
    linea(doc, M, y + 2.8, W - M, y + 2.8)
    y += 7.5
  }

  function tabla(head: any[], body: any[][], extra: any = {}) {
    autoTable(doc, {
      startY: y,
      head: [head],
      body,
      theme: 'grid',
      styles: {
        font: 'helvetica',
        fontSize: 8.2,
        textColor: INK,
        lineColor: LINE,
        lineWidth: 0.1,
        cellPadding: { top: 1.9, bottom: 1.9, left: 2.6, right: 2.6 },
      },
      headStyles: {
        fillColor: NAVY,
        textColor: WHITE,
        fontSize: 7.2,
        fontStyle: 'bold',
        lineWidth: 0,
        cellPadding: { top: 2.1, bottom: 2.1, left: 2.6, right: 2.6 },
      },
      alternateRowStyles: { fillColor: [248, 250, 253] },
      margin: { left: M, right: M, top: 26 },
      didDrawPage: () => cabeceraSiFalta(),
      ...extra,
    })
    y = (doc as any).lastAutoTable.finalY + 9
  }

  function vacio(msg: string) {
    asegurar(13)
    caja(doc, M, y, CW, 11, { r: 2, fill: SOFT, border: LINE, lw: 0.15 })
    texto(doc, msg, W / 2, y + 7, { size: 8, color: MUTED, align: 'center' })
    y += 20
  }

  const lado = (e: any) => e.event_data?.team
  const equipoDe = (e: any) => (lado(e) === 'home' ? home : lado(e) === 'away' ? away : '—')
  const minuto = (e: any) => (e.event_data?.minute != null ? `${e.event_data.minute}'` : '—')
  const dorsales = new Map<string, any>()
  ;[...(opts.homePlayers || []), ...(opts.awayPlayers || [])].forEach((p) =>
    dorsales.set(String(p.id), p),
  )
  const jugador = (id: string | null) => {
    const p = id ? dorsales.get(String(id)) : null
    const nombre = (p?.name || playerName(id) || '').trim()
    if (!nombre) return 'Sin identificar'
    return p?.number != null ? `#${p.number}  ${nombre}` : nombre
  }

  // Goles: el marcador no se deriva de los eventos (el árbitro también lo mueve
  // a mano), así que la columna del parcial solo se muestra cuando los goles
  // cargados cuadran con el resultado. Si no cuadran, el acta no inventa.
  const goles = evs.filter((e) => e.event_type === 'GOL' || e.event_type === 'GOAL')
  const golesH = goles.filter((e) => lado(e) === 'home').length
  const golesA = goles.filter((e) => lado(e) === 'away').length
  const cuadra = goles.length > 0 && golesH === hs && golesA === as
  titulo(disciplina.scoreLabel, `${goles.length} anotación(es)`)
  if (!goles.length) {
    vacio(`Sin ${disciplina.scoreLabel.toLowerCase()} registrados en el acta.`)
  } else {
    let ph = 0
    let pa = 0
    const filas = goles.map((e) => {
      if (lado(e) === 'home') ph++
      if (lado(e) === 'away') pa++
      const f = [minuto(e), equipoDe(e), jugador(e.player_id)]
      if (cuadra) f.push(`${ph} - ${pa}`)
      return f
    })
    tabla(
      cuadra ? ['Min', 'Equipo', 'Jugador', 'Parcial'] : ['Min', 'Equipo', 'Jugador'],
      filas,
      {
        columnStyles: {
          0: { cellWidth: 15, halign: 'center', fontStyle: 'bold', textColor: NAVY },
          1: { cellWidth: 54 },
          3: { cellWidth: 24, halign: 'center', fontStyle: 'bold', textColor: NAVY },
        },
      },
    )
  }

  // Disciplina
  const sanciones = evs.filter((e) => TIPOS_SANCION.includes(e.event_type))
  titulo('Disciplina', `${sanciones.length} sanción(es)`)
  if (!sanciones.length) {
    vacio('Sin tarjetas ni faltas registradas.')
  } else {
    tabla(
      ['Min', 'Sanción', 'Equipo', 'Jugador'],
      sanciones.map((e) => [
        minuto(e),
        SANCION[e.event_type]?.label || e.event_type,
        equipoDe(e),
        jugador(e.player_id),
      ]),
      {
        columnStyles: {
          0: { cellWidth: 15, halign: 'center', fontStyle: 'bold', textColor: NAVY },
          1: { cellWidth: 30, halign: 'center', fontStyle: 'bold' },
          2: { cellWidth: 50 },
        },
        // La celda del tipo se pinta con el color de la tarjeta: se lee de un
        // vistazo aunque el acta esté sobre una mesa en la cancha.
        didParseCell: (data: any) => {
          if (data.section !== 'body' || data.column.index !== 1) return
          const s = SANCION[sanciones[data.row.index]?.event_type]
          if (!s) return
          data.cell.styles.fillColor = s.bg
          data.cell.styles.textColor = s.fg
        },
      },
    )
  }

  // Sustituciones: solo si las hubo, para no estirar el acta con secciones vacías.
  const cambios = evs.filter((e) => e.event_type === 'CAMBIO')
  if (cambios.length) {
    titulo('Sustituciones', `${cambios.length} cambio(s)`)
    tabla(
      ['Min', 'Equipo', 'Entra', 'Sale'],
      cambios.map((e) => [
        minuto(e),
        equipoDe(e),
        jugador(e.player_id),
        jugador(e.event_data?.player_out),
      ]),
      {
        columnStyles: {
          0: { cellWidth: 15, halign: 'center', fontStyle: 'bold', textColor: NAVY },
          1: { cellWidth: 45 },
        },
      },
    )
  }

  // Resumen por equipo: las columnas de sanción salen de la disciplina, no de
  // un if por deporte (sports.ts es la fuente de verdad).
  if (evs.length) {
    const cuenta = (equipo: 'home' | 'away', tipo: string) =>
      evs.filter((e) => lado(e) === equipo && e.event_type === tipo).length
    titulo('Resumen del partido')
    const cols = disciplina.events
    tabla(
      [{ content: 'Equipo', styles: { halign: 'left' } }, disciplina.scoreLabel, ...cols.map((c) => c.short)],
      (['home', 'away'] as const).map((s) => [
        s === 'home' ? home : away,
        String(s === 'home' ? hs : as),
        ...cols.map((c) => String(cuenta(s, c.type) || '—')),
      ]),
      {
        columnStyles: {
          0: { fontStyle: 'bold', textColor: NAVY, halign: 'left' },
          1: { cellWidth: 22, halign: 'center', fontStyle: 'bold' },
        },
        styles: {
          font: 'helvetica',
          fontSize: 8.2,
          textColor: INK,
          lineColor: LINE,
          lineWidth: 0.1,
          halign: 'center',
          cellPadding: { top: 2.1, bottom: 2.1, left: 2.6, right: 2.6 },
        },
      },
    )
  }

  // Planteles, con lo que hizo cada jugador en el partido.
  const rendimiento = new Map<string, { g: number; s: string[] }>()
  evs.forEach((e) => {
    if (!e.player_id) return
    const k = String(e.player_id)
    const r = rendimiento.get(k) || { g: 0, s: [] }
    if (e.event_type === 'GOL' || e.event_type === 'GOAL') r.g += 1
    else if (SANCION[e.event_type]) r.s.push(SANCION[e.event_type].corto)
    rendimiento.set(k, r)
  })
  // La planilla (quiénes jugaron) manda sobre la nómina completa del equipo:
  // el acta se firma para dejar constancia de quién estuvo en cancha.
  const hl = opts.homeLineup || []
  const al = opts.awayLineup || []
  const hp = hl.length ? hl : opts.homePlayers || []
  const ap = al.length ? al : opts.awayPlayers || []
  const conPlanilla = hl.length > 0 || al.length > 0
  if (hp.length || ap.length) {
    const conDoc = [...hp, ...ap].some((p) => p.identification_number)
    const filas = (js: any[]) =>
      js.length
        ? js.map((p) => {
            const r = rendimiento.get(String(p.id))
            const fila = [
              p.number != null ? String(p.number) : '',
              (p.name || '—') + (p.is_captain ? ' (C)' : ''),
            ]
            if (conDoc) fila.push(p.identification_number || '')
            fila.push(r?.g ? String(r.g) : '', (r?.s || []).slice(0, 4).join(' '))
            return fila
          })
        : [conDoc ? ['', 'Sin nómina cargada', '', '', ''] : ['', 'Sin nómina cargada', '', '']]
    const cabezas = ['#', 'Jugador', ...(conDoc ? ['Documento'] : []), 'G', 'Sanc.']
    // Con planilla, titulares y suplentes van separados por un renglón de
    // sección: cuesta menos ancho que una columna y es como se lee un acta.
    const seccion = (rotulo: string) => [
      {
        content: rotulo,
        colSpan: cabezas.length,
        styles: {
          fillColor: [237, 242, 249] as any,
          textColor: MUTED as any,
          fontStyle: 'bold' as any,
          fontSize: 6.2,
          cellPadding: { top: 0.9, bottom: 0.9, left: 2, right: 2 },
        },
      },
    ]
    const cuerpo = (js: any[], conPlanillaEquipo: boolean): any[] => {
      if (!conPlanillaEquipo || !js.length) return filas(js)
      const titulares = js.filter((p) => p.is_starter !== false)
      const suplentes = js.filter((p) => p.is_starter === false)
      const out: any[] = []
      if (titulares.length) out.push(seccion('TITULARES'), ...filas(titulares))
      if (suplentes.length) out.push(seccion('SUPLENTES'), ...filas(suplentes))
      return out.length ? out : filas(js)
    }
    const anchoCol = (CW - 6) / 2
    const cols: any = conDoc
      ? {
          0: { cellWidth: 7, halign: 'center', fontStyle: 'bold' },
          2: { cellWidth: 20, textColor: MUTED, fontSize: 7 },
          3: { cellWidth: 7, halign: 'center', fontStyle: 'bold', textColor: NAVY },
          4: { cellWidth: 14, halign: 'center', fontSize: 7, fontStyle: 'bold' },
        }
      : {
          0: { cellWidth: 8, halign: 'center', fontStyle: 'bold' },
          2: { cellWidth: 8, halign: 'center', fontStyle: 'bold', textColor: NAVY },
          3: { cellWidth: 16, halign: 'center', fontSize: 7, fontStyle: 'bold' },
        }
    titulo(
      conPlanilla ? 'Planilla del partido' : 'Planteles',
      // Sin "en planilla" a secas: si solo un equipo entregó la suya, el otro
      // lado sigue mostrando su nómina y el número sería mentira.
      conPlanilla
        ? `${hp.length + ap.length} jugador(es)`
        : `${hp.length + ap.length} jugador(es) inscritos`,
    )
    // Si las dos nóminas no caben enteras, se pasan juntas a la página
    // siguiente: partidas por la mitad no se leen.
    // +2 renglones cuando hay planilla: los rótulos de titulares y suplentes.
    asegurar(14 + (Math.max(hp.length, ap.length, 1) + (conPlanilla ? 2 : 0)) * 5.4)
    const arriba = y
    const nomina = (js: any[], equipo: string, left: number, planilla: boolean) => {
      autoTable(doc, {
        startY: arriba,
        head: [
          [{ content: equipo.toUpperCase(), colSpan: cabezas.length, styles: { halign: 'left' } }],
          cabezas,
        ],
        body: cuerpo(js, planilla),
        theme: 'grid',
        styles: {
          font: 'helvetica',
          fontSize: 7.6,
          textColor: INK,
          lineColor: LINE,
          lineWidth: 0.1,
          cellPadding: { top: 1.4, bottom: 1.4, left: 2, right: 2 },
        },
        headStyles: { fillColor: NAVY, textColor: WHITE, fontSize: 7, fontStyle: 'bold', lineWidth: 0 },
        alternateRowStyles: { fillColor: [248, 250, 253] },
        columnStyles: cols,
        margin: { left, right: W - left - anchoCol, top: 26 },
        tableWidth: anchoCol,
        didDrawPage: () => cabeceraSiFalta(),
      })
      return (doc as any).lastAutoTable.finalY
    }
    const finL = nomina(hp, home, M, hl.length > 0)
    const finR = nomina(ap, away, M + anchoCol + 6, al.length > 0)
    y = Math.max(finL, finR) + 9
  }

  // Observaciones: el renglón que el árbitro llena a mano en la cancha. El
  // recuadro se estira hasta donde arrancan las firmas para que la última hoja
  // no quede con un hueco en la mitad, y da más espacio para escribir.
  const ALTO_FIRMA = 34
  const bloque = 13 + ALTO_FIRMA + (qr ? 30 : 0)
  titulo('Observaciones del árbitro')
  const hueco = PIE - y - bloque - 11
  const OBS = hueco >= 26 ? Math.min(hueco, 110) : 24
  asegurar(OBS + 4)
  caja(doc, M, y, CW, OBS, { r: 2.5, fill: PAPER, border: LINE, lw: 0.2 })
  for (let i = 1; i * 6 < OBS - 2; i++)
    linea(doc, M + 5, y + i * 6, W - M - 5, y + i * 6, [214, 222, 233], 0.2, [0.8, 1.2])
  y += OBS + 11

  // ----------------------------------------------------------------- firmas --
  if (y + bloque > PIE) nuevaPagina()
  // Pegadas al pie de la última página, como en el acta de papel.
  y = Math.max(y, PIE - bloque)

  titulo('Firmas y conformidad')
  texto(
    doc,
    'Con su firma, las partes declaran conocer y aceptar el resultado y las novedades registradas en esta acta.',
    M,
    y - 1,
    { size: 6.8, color: MUTED, max: CW },
  )
  y += 4
  const anchoFirma = (CW - 8) / 3
  const firmas = [
    { rol: 'Delegado local', quien: home },
    { rol: 'Árbitro', quien: arbitro },
    { rol: 'Delegado visitante', quien: away },
  ]
  firmas.forEach((f, i) => {
    const x = M + i * (anchoFirma + 4)
    caja(doc, x, y, anchoFirma, ALTO_FIRMA, { r: 2.5, fill: PAPER, border: LINE, lw: 0.2 })
    linea(doc, x + 6, y + 19, x + anchoFirma - 6, y + 19, [140, 152, 168], 0.3)
    texto(doc, f.rol.toUpperCase(), x + anchoFirma / 2, y + 23.4, {
      size: 7.4,
      bold: true,
      color: NAVY,
      align: 'center',
      space: 0.4,
      max: anchoFirma - 8,
    })
    texto(doc, f.quien || 'Nombre y apellido', x + anchoFirma / 2, y + 27.4, {
      size: 7,
      color: MUTED,
      align: 'center',
      max: anchoFirma - 8,
    })
    texto(doc, 'C.C. ________________', x + anchoFirma / 2, y + 31.4, {
      size: 6.2,
      color: [170, 180, 194],
      align: 'center',
    })
  })
  y += ALTO_FIRMA + 6

  // El acta impresa circula por toda la liga: que lleve el marcador en vivo.
  if (qr) {
    caja(doc, M, y, CW, 24, { r: 3, fill: NAVY })
    barra(doc, M, y, 3, 24, GREEN, GREEN_DK, 8)
    caja(doc, M + 6, y + 4, 16, 16, { r: 1.5, fill: WHITE })
    doc.addImage(qr.data, 'PNG', M + 6.8, y + 4.8, 14.4, 14.4, 'qr', 'FAST')
    texto(doc, 'Sigue el campeonato en vivo', M + 28, y + 10, { size: 9.5, bold: true, color: WHITE })
    texto(
      doc,
      'Escanea el código: posiciones, calendario, goleadores y resultados al instante.',
      M + 28,
      y + 14.8,
      { size: 6.8, color: [150, 168, 190], max: CW - 36 },
    )
    texto(doc, qr.host, M + 28, y + 19.6, { size: 7.2, bold: true, color: GREEN, max: CW - 36 })
  }

  // ------------------------------------------------------------------- pie ---
  const total = doc.getNumberOfPages()
  for (let p = 1; p <= total; p++) {
    doc.setPage(p)
    linea(doc, M, H - 12.5, W - M, H - 12.5)
    texto(doc, `${codigo} · ${home} vs ${away}`, M, H - 8.6, { size: 6.4, color: MUTED, max: 58 })
    texto(doc, `Champion Hive · ${torneo}`, W / 2, H - 8.6, {
      size: 6.4,
      color: MUTED,
      align: 'center',
      max: 52,
    })
    texto(doc, `Página ${p} de ${total}`, W - M, H - 8.6, {
      size: 6.4,
      color: MUTED,
      align: 'right',
    })
    if (estado !== 'finished')
      marcaDeAgua(
        doc,
        W,
        H,
        estado === 'live' ? 'EN JUEGO' : estado === 'postponed' ? 'APLAZADO' : 'PROVISIONAL',
      )
    else if (wo) marcaDeAgua(doc, W, H, 'NO JUGADO')
  }

  doc.save(`acta-${slug(home)}-vs-${slug(away)}-${codigo.toLowerCase()}.pdf`)
}
