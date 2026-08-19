// Generador de imágenes para redes (WhatsApp/Instagram): resultado, próximo
// partido, tabla de posiciones, calendario (por fecha y/o cancha), bracket y
// cuadros de estadísticas, con logo, banner y patrocinadores del torneo.
// Dibuja en un canvas (1080×1080; el bracket en 1920×1080) y devuelve un PNG
// (Blob) para descargar/compartir.

const W = 1080
const H = 1080
const GREEN = '#4ae176'
const GREEN_DK = '#00b954'
const ORANGE = '#ffb690'
const TEXT = '#d8e3fb'
const MUTED = '#9fb0c9'

type Ctx = CanvasRenderingContext2D

function loadImg(url?: string | null): Promise<HTMLImageElement | null> {
  if (!url) return Promise.resolve(null)
  return new Promise((resolve) => {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => resolve(img)
    img.onerror = () => resolve(null)
    img.src = url
  })
}

function rr(ctx: Ctx, x: number, y: number, w: number, h: number, r: number) {
  const k = Math.min(r, w / 2, h / 2)
  ctx.beginPath()
  ctx.moveTo(x + k, y)
  ctx.arcTo(x + w, y, x + w, y + h, k)
  ctx.arcTo(x + w, y + h, x, y + h, k)
  ctx.arcTo(x, y + h, x, y, k)
  ctx.arcTo(x, y, x + w, y, k)
  ctx.closePath()
}

function ellipsize(ctx: Ctx, text: string, max: number): string {
  if (ctx.measureText(text).width <= max) return text
  let t = text
  while (t.length > 1 && ctx.measureText(t + '…').width > max) t = t.slice(0, -1)
  return t + '…'
}

function canvasBlob(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('No se pudo generar la imagen'))), 'image/png'),
  )
}

async function newCanvas(w = W, h = H): Promise<{ canvas: HTMLCanvasElement; ctx: Ctx }> {
  try {
    await (document as any).fonts?.ready
  } catch {
    /* sin API de fonts: seguimos */
  }
  const canvas = document.createElement('canvas')
  canvas.width = w
  canvas.height = h
  const ctx = canvas.getContext('2d') as Ctx
  return { canvas, ctx }
}

// Fondo de marca + cabecera con logo + nombre del torneo. Devuelve la Y donde
// puede empezar el contenido. Se adapta al tamaño real del canvas.
async function drawBase(ctx: Ctx, t: any, eyebrow: string): Promise<number> {
  const cw = ctx.canvas.width
  const ch = ctx.canvas.height

  // Fondo base
  const bg = ctx.createLinearGradient(0, 0, cw, ch)
  bg.addColorStop(0, '#0a1424')
  bg.addColorStop(1, '#0d1f33')
  ctx.fillStyle = bg
  ctx.fillRect(0, 0, cw, ch)

  // Banner difuminado arriba (si hay)
  const banner = await loadImg(t.banner_url)
  if (banner) {
    ctx.save()
    rr(ctx, 0, 0, cw, 360, 0)
    ctx.clip()
    const scale = Math.max(cw / banner.width, 360 / banner.height)
    const bw = banner.width * scale
    const bh = banner.height * scale
    ctx.globalAlpha = 0.35
    ctx.drawImage(banner, (cw - bw) / 2, (360 - bh) / 2, bw, bh)
    ctx.globalAlpha = 1
    const fade = ctx.createLinearGradient(0, 0, 0, 360)
    fade.addColorStop(0, 'rgba(10,20,36,0.45)')
    fade.addColorStop(1, 'rgba(10,20,36,1)')
    ctx.fillStyle = fade
    ctx.fillRect(0, 0, cw, 360)
    ctx.restore()
  }

  // Glow verde
  const glow = ctx.createRadialGradient(cw - 120, 80, 0, cw - 120, 80, 520)
  glow.addColorStop(0, 'rgba(74,225,118,0.16)')
  glow.addColorStop(1, 'rgba(74,225,118,0)')
  ctx.fillStyle = glow
  ctx.fillRect(0, 0, cw, ch)

  // Barra de acento superior
  const top = ctx.createLinearGradient(0, 0, cw, 0)
  top.addColorStop(0, GREEN)
  top.addColorStop(1, GREEN_DK)
  ctx.fillStyle = top
  ctx.fillRect(0, 0, cw, 10)

  // Cabecera: logo + nombre
  const logo = await loadImg(t.logo_url)
  let x = 64
  const cy = 132
  if (logo) {
    ctx.save()
    rr(ctx, x, cy - 52, 104, 104, 24)
    ctx.clip()
    ctx.drawImage(logo, x, cy - 52, 104, 104)
    ctx.restore()
    ctx.lineWidth = 3
    ctx.strokeStyle = 'rgba(74,225,118,0.5)'
    rr(ctx, x, cy - 52, 104, 104, 24)
    ctx.stroke()
    x += 130
  } else {
    ctx.fillStyle = GREEN
    rr(ctx, x, cy - 52, 104, 104, 24)
    ctx.fill()
    ctx.fillStyle = '#003915'
    ctx.font = '800 56px Lexend, sans-serif'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText('🏆', x + 52, cy + 2)
    x += 130
  }

  ctx.textAlign = 'left'
  ctx.textBaseline = 'alphabetic'
  ctx.fillStyle = GREEN
  ctx.font = '700 26px Inter, sans-serif'
  ctx.fillText(ellipsize(ctx, eyebrow.toUpperCase(), cw - x - 64), x, cy - 24)
  ctx.fillStyle = TEXT
  ctx.font = '800 48px Lexend, sans-serif'
  ctx.fillText(ellipsize(ctx, t.name || 'Torneo', cw - x - 64), x, cy + 24)

  // Marca Champion Hive (arriba derecha)
  ctx.textAlign = 'right'
  ctx.fillStyle = MUTED
  ctx.font = '700 22px Lexend, sans-serif'
  ctx.fillText('CHAMPION HIVE', cw - 64, 56)
  ctx.textAlign = 'left'

  return 260
}

// Franja de patrocinadores al pie. Ocupa los últimos ~150px del canvas.
async function drawSponsors(ctx: Ctx, sponsors: any[]) {
  const cw = ctx.canvas.width
  const ch = ctx.canvas.height
  const list = (sponsors || []).slice(0, 5)
  const baseY = ch - 150
  // separador
  ctx.fillStyle = 'rgba(216,227,251,0.08)'
  ctx.fillRect(64, baseY, cw - 128, 2)
  ctx.fillStyle = MUTED
  ctx.font = '700 22px Inter, sans-serif'
  ctx.textAlign = 'center'
  ctx.fillText('PATROCINAN', cw / 2, baseY + 44)
  ctx.textAlign = 'left'

  if (!list.length) {
    ctx.fillStyle = MUTED
    ctx.font = '600 24px Lexend, sans-serif'
    ctx.textAlign = 'center'
    ctx.fillText('Champion Hive', cw / 2, baseY + 96)
    ctx.textAlign = 'left'
    return
  }

  const imgs = await Promise.all(list.map((s) => loadImg(s.logo_url)))
  const cellH = 64
  const y = baseY + 70
  const gap = 28
  // medir anchos
  ctx.font = '700 26px Lexend, sans-serif'
  const widths = list.map((s, i) =>
    imgs[i] ? cellH * (imgs[i]!.width / imgs[i]!.height) : ctx.measureText(s.name || '').width,
  )
  const total = widths.reduce((a, b) => a + b, 0) + gap * (list.length - 1)
  let x = (cw - total) / 2
  for (let i = 0; i < list.length; i++) {
    if (imgs[i]) {
      const w = widths[i]
      ctx.drawImage(imgs[i]!, x, y, w, cellH)
      x += w + gap
    } else {
      ctx.fillStyle = TEXT
      ctx.font = '700 26px Lexend, sans-serif'
      ctx.textBaseline = 'middle'
      ctx.fillText(list[i].name || '', x, y + cellH / 2)
      ctx.textBaseline = 'alphabetic'
      x += widths[i] + gap
    }
  }
}

function pill(ctx: Ctx, label: string, cx: number, y: number, color: string) {
  ctx.font = '800 24px Inter, sans-serif'
  const w = ctx.measureText(label.toUpperCase()).width + 56
  rr(ctx, cx - w / 2, y, w, 50, 25)
  ctx.fillStyle = color
  ctx.fill()
  ctx.fillStyle = '#06210f'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText(label.toUpperCase(), cx, y + 26)
  ctx.textAlign = 'left'
  ctx.textBaseline = 'alphabetic'
}

function metaLine(ctx: Ctx, m: any): string {
  return [
    m.stage_name,
    m.group_name ? `Grupo ${m.group_name}` : null,
    [m.venue_name, m.court_name].filter(Boolean).join(' · ') || null,
  ]
    .filter(Boolean)
    .join('  ·  ')
}

function fmtDate(iso?: string): string {
  if (!iso) return ''
  const s = String(iso)
  const d = s.slice(8, 10) + '/' + s.slice(5, 7)
  const hm = s.slice(11, 16)
  return hm ? `${d} · ${hm}` : d
}

// Mapa team_id → logo_url que arman las vistas; las funciones que lo reciben
// dibujan el logo junto al nombre cuando el equipo tiene uno.
export type TeamLogos = Record<string, string | null | undefined>

// Logo cuadrado con esquinas redondeadas; si el equipo no tiene, un círculo
// tenue con la inicial para que la columna quede alineada.
function drawTeamLogo(
  ctx: Ctx,
  img: HTMLImageElement | null,
  name: string,
  x: number,
  yC: number,
  size: number,
) {
  const y = yC - size / 2
  if (img) {
    ctx.save()
    rr(ctx, x, y, size, size, size * 0.28)
    ctx.clip()
    ctx.drawImage(img, x, y, size, size)
    ctx.restore()
    return
  }
  ctx.fillStyle = 'rgba(216,227,251,0.12)'
  rr(ctx, x, y, size, size, size / 2)
  ctx.fill()
  ctx.fillStyle = MUTED
  ctx.font = `800 ${Math.round(size * 0.52)}px Lexend, sans-serif`
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText((name || '?').trim().charAt(0).toUpperCase(), x + size / 2, yC + 1)
  ctx.textAlign = 'left'
  ctx.textBaseline = 'alphabetic'
}

function teamRow(ctx: Ctx, name: string, score: string | null, y: number, win: boolean) {
  const cw = ctx.canvas.width
  ctx.fillStyle = win ? GREEN : TEXT
  ctx.font = `${win ? 800 : 700} 64px Lexend, sans-serif`
  ctx.textAlign = 'left'
  ctx.fillText(ellipsize(ctx, name || 'Por definir', 640), 90, y)
  if (score != null) {
    ctx.textAlign = 'right'
    ctx.fillStyle = win ? GREEN : TEXT
    ctx.font = '800 76px Lexend, sans-serif'
    ctx.fillText(score, cw - 90, y + 6)
    ctx.textAlign = 'left'
  }
}

export async function makeMatchImage(t: any, m: any, sponsors: any[]): Promise<Blob> {
  const { canvas, ctx } = await newCanvas()
  const finished = m.status === 'finished'
  await drawBase(ctx, t, finished ? 'Resultado' : 'Próximo partido')

  pill(ctx, finished ? 'Final' : 'Próximo', W / 2, 300, finished ? GREEN : ORANGE)

  const hs = finished ? String(m.home_score ?? 0) : null
  const as = finished ? String(m.away_score ?? 0) : null
  const hw = finished && (m.home_score ?? 0) > (m.away_score ?? 0)
  const aw = finished && (m.away_score ?? 0) > (m.home_score ?? 0)
  teamRow(ctx, m.home_team_name, hs, 470, hw)
  if (!finished) {
    ctx.fillStyle = MUTED
    ctx.font = '800 44px Lexend, sans-serif'
    ctx.textAlign = 'center'
    ctx.fillText('VS', W / 2, 540)
    ctx.textAlign = 'left'
  }
  teamRow(ctx, m.away_team_name, as, finished ? 590 : 640, aw)

  // separador
  ctx.fillStyle = 'rgba(216,227,251,0.08)'
  ctx.fillRect(90, finished ? 640 : 700, W - 180, 2)

  // fecha + meta
  ctx.textAlign = 'center'
  if (m.scheduled_start) {
    ctx.fillStyle = GREEN
    ctx.font = '800 40px Lexend, sans-serif'
    ctx.fillText(fmtDate(m.scheduled_start), W / 2, finished ? 712 : 772)
  }
  const meta = metaLine(ctx, m)
  if (meta) {
    ctx.fillStyle = MUTED
    ctx.font = '600 26px Inter, sans-serif'
    ctx.fillText(ellipsize(ctx, meta, W - 160), W / 2, finished ? 760 : 820)
  }
  ctx.textAlign = 'left'

  await drawSponsors(ctx, sponsors)
  return canvasBlob(canvas)
}

// ---- Listas largas: varias imágenes en vez de recortar ----

// Un calendario de 20 partidos o una liga de 16 equipos no caben en 1080×1080.
// Recortar con un "+ 12 más" es lo peor que se puede publicar, porque el equipo
// que falta suele ser justo el que iba a compartir la imagen: en vez de eso la
// lista se reparte en varias imágenes numeradas —un carrusel— con el mismo alto
// de fila en todas para que se vean como una sola publicación.

/** Reparte las filas en páginas de a lo sumo `porPagina`, parejas entre sí:
 *  13 filas con tope de 10 salen 7 y 6, no 10 y 3. */
export function paginar<T>(filas: T[], porPagina: number): T[][] {
  const todas = filas || []
  const tope = Math.max(1, porPagina)
  if (todas.length <= tope) return [todas]
  const paginas = Math.ceil(todas.length / tope)
  const base = Math.floor(todas.length / paginas)
  let resto = todas.length % paginas // se reparte de a una entre las primeras
  const out: T[][] = []
  let i = 0
  for (let p = 0; p < paginas; p++) {
    const tam = base + (resto > 0 ? 1 : 0)
    if (resto > 0) resto--
    out.push(todas.slice(i, i + tam))
    i += tam
  }
  return out
}

/** Chip "2 / 3" bajo la marca; solo aparece cuando hay más de una imagen. */
function marcaDePagina(ctx: Ctx, indice: number, total: number) {
  if (total <= 1) return
  const cw = ctx.canvas.width
  const label = `${indice + 1} / ${total}`
  ctx.font = '800 22px Inter, sans-serif'
  const w = ctx.measureText(label).width + 40
  rr(ctx, cw - 64 - w, 74, w, 40, 20)
  ctx.fillStyle = 'rgba(74,225,118,0.14)'
  ctx.fill()
  ctx.strokeStyle = 'rgba(74,225,118,0.45)'
  ctx.lineWidth = 2
  ctx.stroke()
  ctx.fillStyle = GREEN
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText(label, cw - 64 - w / 2, 95)
  ctx.textAlign = 'left'
  ctx.textBaseline = 'alphabetic'
}

/** Cuántas filas caben en `alto` sin bajar de `minimo` px por fila. */
function filasQueCaben(alto: number, minimo: number, piso = 4): number {
  return Math.max(piso, Math.floor(alto / minimo))
}

// Tabla de posiciones. Devuelve una imagen por página: ningún equipo se queda
// fuera de la tabla que se publica.
export async function makeStandingsImage(
  t: any,
  group: string,
  rows: any[],
  sponsors: any[],
  logos?: TeamLogos,
): Promise<Blob[]> {
  const filas = rows || []
  const title = group && group !== 'Sin Grupo' ? `Grupo ${group}` : 'Clasificación'
  const yTabla = 360
  const areaH = H - 150 - yTabla
  // Una fila de menos de 50 px queda apretada; el encabezado ocupa una.
  const paginas = paginar(filas, filasQueCaben(areaH, 50) - 1)
  const mayor = Math.max(1, ...paginas.map((p) => p.length))
  const rowH = Math.min(58, areaH / (mayor + 1))

  // Los logos se cargan una sola vez para todas las páginas.
  const logoImgs = await Promise.all(filas.map((r: any) => loadImg(logos?.[r.team_id])))
  const conLogos = logoImgs.some(Boolean)
  const logoCol = conLogos ? 52 : 0
  const x0 = 64
  const tw = W - 128

  const out: Blob[] = []
  let desde = 0
  for (let p = 0; p < paginas.length; p++) {
    const { canvas, ctx } = await newCanvas()
    await drawBase(ctx, t, 'Tabla de posiciones')
    marcaDePagina(ctx, p, paginas.length)

    ctx.fillStyle = TEXT
    ctx.font = '800 40px Lexend, sans-serif'
    ctx.textAlign = 'center'
    ctx.fillText(title, W / 2, 300)
    ctx.textAlign = 'left'

    let y = yTabla
    ctx.fillStyle = MUTED
    ctx.font = '700 24px Inter, sans-serif'
    ctx.fillText('#', x0 + 16, y + 36)
    ctx.fillText('EQUIPO', x0 + 80 + logoCol, y + 36)
    ctx.textAlign = 'right'
    ctx.fillText('PJ', x0 + tw - 230, y + 36)
    ctx.fillText('DG', x0 + tw - 120, y + 36)
    ctx.fillText('PTS', x0 + tw - 24, y + 36)
    ctx.textAlign = 'left'
    y += rowH

    paginas[p].forEach((r: any, i: number) => {
      // g es la posición real en la tabla; i, la fila dentro de esta imagen.
      const g = desde + i
      if (i % 2 === 0) {
        ctx.fillStyle = 'rgba(216,227,251,0.05)'
        rr(ctx, x0, y, tw, rowH - 6, 12)
        ctx.fill()
      }
      const qualified = g < 2
      ctx.fillStyle = qualified ? GREEN : MUTED
      ctx.font = '800 30px Lexend, sans-serif'
      ctx.fillText(String(r.position ?? g + 1), x0 + 18, y + rowH / 2 + 10)

      if (conLogos) {
        drawTeamLogo(ctx, logoImgs[g], r.team_name || '', x0 + 76, y + rowH / 2, Math.min(40, rowH - 14))
      }
      ctx.fillStyle = TEXT
      ctx.font = '700 30px Lexend, sans-serif'
      ctx.textBaseline = 'middle'
      ctx.fillText(
        ellipsize(ctx, r.team_name || '—', tw - 420 - logoCol),
        x0 + 80 + logoCol,
        y + rowH / 2,
      )
      ctx.textBaseline = 'alphabetic'

      ctx.textAlign = 'right'
      ctx.fillStyle = MUTED
      ctx.font = '600 28px Inter, sans-serif'
      ctx.fillText(String(r.matches_played ?? 0), x0 + tw - 230, y + rowH / 2 + 9)
      const dg = r.diff ?? 0
      ctx.fillText((dg > 0 ? '+' : '') + dg, x0 + tw - 120, y + rowH / 2 + 9)
      ctx.fillStyle = GREEN
      ctx.font = '800 32px Lexend, sans-serif'
      ctx.fillText(String(r.league_points ?? 0), x0 + tw - 24, y + rowH / 2 + 10)
      ctx.textAlign = 'left'
      y += rowH
    })
    desde += paginas[p].length

    await drawSponsors(ctx, sponsors)
    out.push(await canvasBlob(canvas))
  }
  return out
}

// ---- Calendario (por fecha y/o cancha) ----

// Imagen publicitaria de la programación: los partidos ya vienen filtrados por
// el llamador (por fecha y/o cancha) y los filtros aplicados se muestran como
// título y chip. Si abarca varias fechas, cada fila incluye su fecha.
export async function makeCalendarImage(
  t: any,
  matches: any[],
  opts: { dateLabel?: string | null; courtLabel?: string | null },
  sponsors: any[],
  logos?: TeamLogos,
): Promise<Blob[]> {
  // Los partidos sin programar van al final, no encabezando la imagen.
  const list = (matches || [])
    .slice()
    .sort((a, b) =>
      String(a.scheduled_start || '9999').localeCompare(String(b.scheduled_start || '9999')),
    )
  const multiDate = !opts.dateLabel
  const showCourt = !opts.courtLabel

  const x0 = 64
  const tw = W - 128
  const yTabla = opts.courtLabel ? 376 : 340
  const areaH = H - 170 - yTabla

  const titulo = (ctx: Ctx) => {
    ctx.fillStyle = TEXT
    ctx.font = '800 40px Lexend, sans-serif'
    ctx.textAlign = 'center'
    ctx.fillText(ellipsize(ctx, opts.dateLabel || 'Todas las fechas', W - 128), W / 2, 300)
    if (opts.courtLabel) {
      ctx.fillStyle = ORANGE
      ctx.font = '700 26px Inter, sans-serif'
      ctx.fillText(ellipsize(ctx, `📍 ${opts.courtLabel}`, W - 128), W / 2, 344)
    }
    ctx.textAlign = 'left'
  }

  if (!list.length) {
    const { canvas, ctx } = await newCanvas()
    await drawBase(ctx, t, 'Calendario')
    titulo(ctx)
    ctx.fillStyle = MUTED
    ctx.font = '600 30px Lexend, sans-serif'
    ctx.textAlign = 'center'
    ctx.fillText('Sin partidos programados', W / 2, yTabla + 80)
    ctx.textAlign = 'left'
    await drawSponsors(ctx, sponsors)
    return [await canvasBlob(canvas)]
  }

  const paginas = paginar(list, filasQueCaben(areaH, 60, 3))
  const mayor = Math.max(1, ...paginas.map((p) => p.length))
  const rowH = Math.min(92, areaH / mayor)

  // Logos junto al nombre: el local queda a la izquierda del centro, así que
  // su logo se antepone al nombre; el visitante queda a la derecha y su logo
  // va después del nombre. Se cargan una sola vez para todas las páginas.
  const logoImgs = await Promise.all(
    list.map((m) =>
      Promise.all([loadImg(logos?.[m.home_team_id]), loadImg(logos?.[m.away_team_id])]),
    ),
  )
  const conLogos = logoImgs.some(([h, a]) => h || a)
  const logoSize = Math.min(34, rowH - 22)

  const timeW = multiDate ? 180 : 110
  const courtW = showCourt ? 200 : 0
  const nameArea = tw - timeW - courtW
  const cxm = x0 + timeW + nameArea / 2
  const nameMax = nameArea / 2 - 70 - (conLogos ? logoSize + 10 : 0)

  const out: Blob[] = []
  let desde = 0
  for (let p = 0; p < paginas.length; p++) {
    const { canvas, ctx } = await newCanvas()
    await drawBase(ctx, t, 'Calendario')
    marcaDePagina(ctx, p, paginas.length)
    titulo(ctx)

    let y = yTabla
    paginas[p].forEach((m: any, i: number) => {
      const g = desde + i
      if (i % 2 === 0) {
        ctx.fillStyle = 'rgba(216,227,251,0.05)'
        rr(ctx, x0, y + 2, tw, rowH - 6, 12)
        ctx.fill()
      }
      const cy = y + rowH / 2
      ctx.textBaseline = 'middle'

      // hora (y fecha si abarca varias)
      const s = m.scheduled_start ? String(m.scheduled_start) : ''
      const hora = s ? s.slice(11, 16) : '--:--'
      const cuando = multiDate && s ? `${s.slice(8, 10)}/${s.slice(5, 7)} ${hora}` : hora
      ctx.fillStyle = GREEN
      ctx.font = '800 26px Lexend, sans-serif'
      ctx.textAlign = 'left'
      ctx.fillText(cuando, x0 + 12, cy)

      // marcador o "vs"
      const finished = m.status === 'finished'
      const live = m.status === 'live'
      ctx.textAlign = 'center'
      ctx.fillStyle = finished ? GREEN : live ? ORANGE : MUTED
      ctx.font = `800 ${finished || live ? 30 : 24}px Lexend, sans-serif`
      ctx.fillText(finished || live ? `${m.home_score ?? 0} - ${m.away_score ?? 0}` : 'vs', cxm, cy)

      // equipos (con su logo si lo tienen)
      ctx.fillStyle = TEXT
      ctx.font = '700 28px Lexend, sans-serif'
      const homeName = ellipsize(ctx, m.home_team_name || 'Por definir', nameMax)
      const awayName = ellipsize(ctx, m.away_team_name || 'Por definir', nameMax)
      ctx.textAlign = 'right'
      ctx.fillText(homeName, cxm - 58, cy)
      ctx.textAlign = 'left'
      ctx.fillText(awayName, cxm + 58, cy)
      const [homeLogo, awayLogo] = logoImgs[g]
      if (homeLogo) {
        ctx.font = '700 28px Lexend, sans-serif'
        const wName = ctx.measureText(homeName).width
        drawTeamLogo(ctx, homeLogo, m.home_team_name || '', cxm - 58 - wName - 10 - logoSize, cy, logoSize)
      }
      if (awayLogo) {
        ctx.font = '700 28px Lexend, sans-serif'
        const wName = ctx.measureText(awayName).width
        drawTeamLogo(ctx, awayLogo, m.away_team_name || '', cxm + 58 + wName + 10, cy, logoSize)
      }
      // drawTeamLogo restablece la baseline; la fila sigue dibujando centrada.
      ctx.textBaseline = 'middle'
      ctx.textAlign = 'left'
      ctx.fillStyle = TEXT

      // cancha (si no se filtró por una sola)
      if (showCourt) {
        const cancha = [m.court_name, m.venue_name].filter(Boolean).join(' · ')
        if (cancha) {
          ctx.fillStyle = MUTED
          ctx.font = '600 20px Inter, sans-serif'
          ctx.textAlign = 'right'
          ctx.fillText(ellipsize(ctx, cancha, courtW - 16), x0 + tw - 12, cy)
        }
      }
      ctx.textAlign = 'left'
      ctx.textBaseline = 'alphabetic'
      y += rowH
    })
    desde += paginas[p].length

    await drawSponsors(ctx, sponsors)
    out.push(await canvasBlob(canvas))
  }
  return out
}

// ---- Cuadros de estadísticas (tabla genérica) ----

export type TableCol = {
  header: string
  cell: (r: any, i: number) => string
  /** Ancho fijo en px; la (única) columna sin ancho se estira. */
  width?: number
  align?: 'left' | 'right'
  /** Resaltada en verde (la métrica principal del cuadro). */
  accent?: boolean
}

// Imagen de un cuadro de estadísticas (goleadores, valla, sanciones, juego
// limpio…): título + subtítulo (alcance de fases) y una tabla de columnas
// configurables.
export async function makeStatsImage(
  t: any,
  title: string,
  subtitle: string | null,
  cols: TableCol[],
  rows: any[],
  sponsors: any[],
): Promise<Blob[]> {
  const filas = rows || []
  const x0 = 64
  const tw = W - 128
  const gap = 18
  const fixed = cols.reduce((a, c) => a + (c.width || 0), 0)
  const flexW = Math.max(120, tw - fixed - gap * (cols.length - 1))
  const xs: number[] = []
  let acc = x0
  for (const c of cols) {
    xs.push(acc)
    acc += (c.width || flexW) + gap
  }

  const yTabla = subtitle ? 372 : 348
  const areaH = H - 170 - yTabla - 44
  const paginas = paginar(filas, filasQueCaben(areaH, 41))
  const mayor = Math.max(1, ...paginas.map((p) => p.length))
  const rowH = Math.min(56, areaH / mayor)

  const out: Blob[] = []
  let desde = 0
  for (let p = 0; p < paginas.length; p++) {
    const { canvas, ctx } = await newCanvas()
    await drawBase(ctx, t, 'Estadísticas')
    marcaDePagina(ctx, p, paginas.length)

    ctx.textAlign = 'center'
    ctx.fillStyle = TEXT
    ctx.font = '800 40px Lexend, sans-serif'
    ctx.fillText(ellipsize(ctx, title, W - 128), W / 2, 300)
    if (subtitle) {
      ctx.fillStyle = MUTED
      ctx.font = '600 24px Inter, sans-serif'
      ctx.fillText(ellipsize(ctx, subtitle, W - 128), W / 2, 340)
    }
    ctx.textAlign = 'left'

    let y = yTabla
    ctx.fillStyle = MUTED
    ctx.font = '700 22px Inter, sans-serif'
    cols.forEach((c, ci) => {
      const cwCol = c.width || flexW
      ctx.textAlign = c.align === 'right' ? 'right' : 'left'
      ctx.fillText(
        ellipsize(ctx, c.header.toUpperCase(), cwCol),
        c.align === 'right' ? xs[ci] + cwCol : xs[ci],
        y + 26,
      )
    })
    ctx.textAlign = 'left'
    y += 44

    paginas[p].forEach((r: any, i: number) => {
      // Al pintar la celda se pasa la posición real (g), no la de la página:
      // la columna "#" de goleadores sigue numerando 11, 12, 13…
      const g = desde + i
      if (i % 2 === 0) {
        ctx.fillStyle = 'rgba(216,227,251,0.05)'
        rr(ctx, x0 - 12, y, tw + 24, rowH - 5, 10)
        ctx.fill()
      }
      ctx.textBaseline = 'middle'
      const cy = y + (rowH - 5) / 2
      cols.forEach((c, ci) => {
        const cwCol = c.width || flexW
        if (c.accent) {
          ctx.fillStyle = GREEN
          ctx.font = '800 30px Lexend, sans-serif'
        } else if (!c.width) {
          // la columna flexible es el nombre principal del cuadro
          ctx.fillStyle = TEXT
          ctx.font = '700 28px Lexend, sans-serif'
        } else {
          ctx.fillStyle = MUTED
          ctx.font = '600 26px Inter, sans-serif'
        }
        const val = String(c.cell(r, g) ?? '')
        ctx.textAlign = c.align === 'right' ? 'right' : 'left'
        ctx.fillText(ellipsize(ctx, val, cwCol), c.align === 'right' ? xs[ci] + cwCol : xs[ci], cy)
      })
      ctx.textBaseline = 'alphabetic'
      ctx.textAlign = 'left'
      y += rowH
    })
    desde += paginas[p].length

    await drawSponsors(ctx, sponsors)
    out.push(await canvasBlob(canvas))
  }
  return out
}

// ---- Bracket ----

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

function drawKoMatch(ctx: Ctx, m: any, x: number, yC: number, w: number, h: number) {
  const finished = m.status === 'finished'
  const live = m.status === 'live'
  const homeWin = finished && (m.home_score ?? 0) >= (m.away_score ?? 0)
  const awayWin = finished && (m.away_score ?? 0) > (m.home_score ?? 0)
  const y = yC - h / 2

  ctx.fillStyle = 'rgba(216,227,251,0.06)'
  rr(ctx, x, y, w, h, 14)
  ctx.fill()
  ctx.lineWidth = 2
  ctx.strokeStyle = live ? 'rgba(255,182,144,0.8)' : 'rgba(216,227,251,0.14)'
  rr(ctx, x, y, w, h, 14)
  ctx.stroke()

  const nameFont = h >= 80 ? 24 : 20
  const row = (name: string | null, score: number | null, win: boolean, ry: number) => {
    ctx.textBaseline = 'middle'
    ctx.textAlign = 'left'
    ctx.fillStyle = win ? GREEN : TEXT
    ctx.font = `${win ? 800 : 600} ${nameFont}px Lexend, sans-serif`
    ctx.fillText(ellipsize(ctx, name || 'Por definir', w - 74), x + 16, ry)
    ctx.textAlign = 'right'
    ctx.fillStyle = win ? GREEN : finished || live ? TEXT : MUTED
    ctx.font = `800 ${nameFont + 2}px Lexend, sans-serif`
    ctx.fillText(finished || live ? String(score ?? 0) : '–', x + w - 14, ry)
    ctx.textAlign = 'left'
    ctx.textBaseline = 'alphabetic'
  }
  row(m.home_team_name, m.home_score, homeWin, y + h * 0.3)
  row(m.away_team_name, m.away_score, awayWin, y + h * 0.72)
}

// Imagen del bracket completo en formato horizontal (1920×1080): columnas por
// ronda con conectores, tercer puesto aparte y campeón si la final terminó.
export async function makeBracketImage(
  t: any,
  stageName: string | null,
  tree: any,
  sponsors: any[],
): Promise<Blob> {
  const CW = 1920
  const CH = 1080
  const { canvas, ctx } = await newCanvas(CW, CH)
  await drawBase(ctx, t, stageName ? `Bracket · ${stageName}` : 'Bracket')

  const rounds: any[] = tree?.rounds || []
  if (!rounds.length) {
    ctx.fillStyle = MUTED
    ctx.font = '600 34px Lexend, sans-serif'
    ctx.textAlign = 'center'
    ctx.fillText('El bracket aún no ha sido generado', CW / 2, CH / 2)
    ctx.textAlign = 'left'
    await drawSponsors(ctx, sponsors)
    return canvasBlob(canvas)
  }

  const finalRound = rounds[rounds.length - 1]
  const finalMatch = (finalRound?.matches || []).find((m: any) => !m.is_third_place)
  const champion =
    finalMatch && finalMatch.status === 'finished'
      ? (finalMatch.home_score ?? 0) >= (finalMatch.away_score ?? 0)
        ? finalMatch.home_team_name
        : finalMatch.away_team_name
      : null

  const x0 = 64
  const rightPad = champion ? 360 : 64
  const availW = CW - x0 - rightPad
  const colW = availW / rounds.length
  const boxW = Math.min(colW - 24, 330)
  const y0 = 250
  const areaH = CH - 180 - y0

  const mains = rounds.map((rnd) => (rnd.matches || []).filter((m: any) => !m.is_third_place))
  const slot0 = areaH / Math.max(mains[0].length, 1)
  const boxH = Math.max(54, Math.min(96, slot0 - 14))

  // centros verticales: la primera ronda se reparte pareja; las siguientes se
  // centran entre sus dos partidos de origen (o heredan si no cuadra el árbol)
  const centers: number[][] = []
  mains.forEach((main: any[], ri: number) => {
    const cs: number[] = []
    const prev = centers[ri - 1]
    main.forEach((_m, i) => {
      if (ri > 0 && prev && prev.length >= (i + 1) * 2) {
        cs.push((prev[2 * i] + prev[2 * i + 1]) / 2)
      } else if (ri > 0 && prev && prev.length === main.length) {
        cs.push(prev[i])
      } else {
        const slot = areaH / main.length
        cs.push(y0 + slot * i + slot / 2)
      }
    })
    centers.push(cs)
  })

  const colX = (ri: number) => x0 + colW * ri + (colW - boxW) / 2

  // conectores (debajo de las cajas)
  ctx.strokeStyle = 'rgba(216,227,251,0.18)'
  ctx.lineWidth = 2
  for (let ri = 1; ri < mains.length; ri++) {
    const prev = centers[ri - 1]
    mains[ri].forEach((_m: any, i: number) => {
      if (prev.length < (i + 1) * 2) return
      const xFrom = colX(ri - 1) + boxW
      const xTo = colX(ri)
      const xMid = (xFrom + xTo) / 2
      for (const child of [2 * i, 2 * i + 1]) {
        ctx.beginPath()
        ctx.moveTo(xFrom, prev[child])
        ctx.lineTo(xMid, prev[child])
        ctx.lineTo(xMid, centers[ri][i])
        ctx.lineTo(xTo, centers[ri][i])
        ctx.stroke()
      }
    })
  }

  // rondas
  mains.forEach((main: any[], ri: number) => {
    ctx.fillStyle = MUTED
    ctx.font = '700 22px Inter, sans-serif'
    ctx.textAlign = 'center'
    ctx.fillText(roundLabel(main.length || 1).toUpperCase(), x0 + colW * ri + colW / 2, y0 - 22)
    ctx.textAlign = 'left'
    main.forEach((m, i) => drawKoMatch(ctx, m, colX(ri), centers[ri][i], boxW, boxH))
  })

  // tercer puesto (abajo, en la columna de la final)
  const thirdPlace = (finalRound?.matches || []).find((m: any) => m.is_third_place)
  if (thirdPlace) {
    const ri = rounds.length - 1
    const yC = y0 + areaH - boxH / 2
    if (Math.abs(yC - centers[ri][0]) > boxH + 30) {
      ctx.fillStyle = MUTED
      ctx.font = '700 20px Inter, sans-serif'
      ctx.textAlign = 'center'
      ctx.fillText('TERCER PUESTO', x0 + colW * ri + colW / 2, yC - boxH / 2 - 12)
      ctx.textAlign = 'left'
      drawKoMatch(ctx, thirdPlace, colX(ri), yC, boxW, boxH)
    }
  }

  // campeón
  if (champion) {
    const cx = CW - rightPad / 2 - 20
    ctx.textAlign = 'center'
    ctx.font = '110px sans-serif'
    ctx.fillText('🏆', cx, y0 + areaH / 2 - 40)
    ctx.fillStyle = GREEN
    ctx.font = '800 42px Lexend, sans-serif'
    ctx.fillText(ellipsize(ctx, champion, rightPad - 60), cx, y0 + areaH / 2 + 40)
    ctx.fillStyle = MUTED
    ctx.font = '700 24px Inter, sans-serif'
    ctx.fillText('CAMPEÓN', cx, y0 + areaH / 2 + 84)
    ctx.textAlign = 'left'
  }

  await drawSponsors(ctx, sponsors)
  return canvasBlob(canvas)
}

// Comparte el PNG (WhatsApp/Instagram en móvil) o lo descarga en escritorio.
export async function shareImage(blob: Blob, filename: string, text: string) {
  const file = new File([blob], filename, { type: 'image/png' })
  const nav = navigator as any
  if (nav.canShare && nav.canShare({ files: [file] })) {
    try {
      await nav.share({ files: [file], text })
      return
    } catch {
      /* el usuario canceló: caemos a descarga */
    }
  }
  downloadImage(blob, filename)
}

export function downloadImage(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 2000)
}

// ---- Varias imágenes de una lista paginada ----

/** Nombre de archivo por página: sin sufijo si es una sola. */
function nombrePagina(base: string, i: number, total: number): string {
  return total > 1 ? `${base}-${i + 1}de${total}.png` : `${base}.png`
}

/** Comparte el carrusel completo: si el navegador acepta varios archivos van
 *  todos en una publicación; si no, se descargan uno por uno. */
export async function shareImages(blobs: Blob[], base: string, text: string) {
  const lista = blobs || []
  if (!lista.length) return
  if (lista.length === 1) return shareImage(lista[0], nombrePagina(base, 0, 1), text)
  const files = lista.map((b, i) => new File([b], nombrePagina(base, i, lista.length), { type: 'image/png' }))
  const nav = navigator as any
  if (nav.canShare && nav.canShare({ files })) {
    try {
      await nav.share({ files, text })
      return
    } catch {
      /* el usuario canceló: caemos a descarga */
    }
  }
  downloadImages(lista, base)
}

/** Descarga todas las páginas. Se escalonan porque el navegador bloquea la
 *  ráfaga de descargas si salen todas en el mismo instante. */
export function downloadImages(blobs: Blob[], base: string) {
  const lista = blobs || []
  lista.forEach((b, i) =>
    setTimeout(() => downloadImage(b, nombrePagina(base, i, lista.length)), i * 350),
  )
}
