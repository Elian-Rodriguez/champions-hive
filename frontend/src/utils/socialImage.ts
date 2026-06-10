// Generador de imágenes para redes (WhatsApp/Instagram): resultado, próximo
// partido y tabla de posiciones, con logo, banner y patrocinadores del torneo.
// Dibuja en un canvas 1080×1080 y devuelve un PNG (Blob) para descargar/compartir.

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

async function newCanvas(): Promise<{ canvas: HTMLCanvasElement; ctx: Ctx }> {
  try {
    await (document as any).fonts?.ready
  } catch {
    /* sin API de fonts: seguimos */
  }
  const canvas = document.createElement('canvas')
  canvas.width = W
  canvas.height = H
  const ctx = canvas.getContext('2d') as Ctx
  return { canvas, ctx }
}

// Fondo de marca + cabecera con logo + nombre del torneo. Devuelve la Y donde
// puede empezar el contenido.
async function drawBase(ctx: Ctx, t: any, eyebrow: string): Promise<number> {
  // Fondo base
  const bg = ctx.createLinearGradient(0, 0, W, H)
  bg.addColorStop(0, '#0a1424')
  bg.addColorStop(1, '#0d1f33')
  ctx.fillStyle = bg
  ctx.fillRect(0, 0, W, H)

  // Banner difuminado arriba (si hay)
  const banner = await loadImg(t.banner_url)
  if (banner) {
    ctx.save()
    rr(ctx, 0, 0, W, 360, 0)
    ctx.clip()
    const scale = Math.max(W / banner.width, 360 / banner.height)
    const bw = banner.width * scale
    const bh = banner.height * scale
    ctx.globalAlpha = 0.35
    ctx.drawImage(banner, (W - bw) / 2, (360 - bh) / 2, bw, bh)
    ctx.globalAlpha = 1
    const fade = ctx.createLinearGradient(0, 0, 0, 360)
    fade.addColorStop(0, 'rgba(10,20,36,0.45)')
    fade.addColorStop(1, 'rgba(10,20,36,1)')
    ctx.fillStyle = fade
    ctx.fillRect(0, 0, W, 360)
    ctx.restore()
  }

  // Glow verde
  const glow = ctx.createRadialGradient(W - 120, 80, 0, W - 120, 80, 520)
  glow.addColorStop(0, 'rgba(74,225,118,0.16)')
  glow.addColorStop(1, 'rgba(74,225,118,0)')
  ctx.fillStyle = glow
  ctx.fillRect(0, 0, W, H)

  // Barra de acento superior
  const top = ctx.createLinearGradient(0, 0, W, 0)
  top.addColorStop(0, GREEN)
  top.addColorStop(1, GREEN_DK)
  ctx.fillStyle = top
  ctx.fillRect(0, 0, W, 10)

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
  ctx.fillText(eyebrow.toUpperCase(), x, cy - 24)
  ctx.fillStyle = TEXT
  ctx.font = '800 48px Lexend, sans-serif'
  ctx.fillText(ellipsize(ctx, t.name || 'Torneo', W - x - 64), x, cy + 24)

  // Marca Champion Hive (arriba derecha)
  ctx.textAlign = 'right'
  ctx.fillStyle = MUTED
  ctx.font = '700 22px Lexend, sans-serif'
  ctx.fillText('CHAMPION HIVE', W - 64, 56)
  ctx.textAlign = 'left'

  return 260
}

// Franja de patrocinadores al pie. Devuelve nada; ocupa los últimos ~150px.
async function drawSponsors(ctx: Ctx, sponsors: any[]) {
  const list = (sponsors || []).slice(0, 5)
  const baseY = H - 150
  // separador
  ctx.fillStyle = 'rgba(216,227,251,0.08)'
  ctx.fillRect(64, baseY, W - 128, 2)
  ctx.fillStyle = MUTED
  ctx.font = '700 22px Inter, sans-serif'
  ctx.textAlign = 'center'
  ctx.fillText('PATROCINAN', W / 2, baseY + 44)
  ctx.textAlign = 'left'

  if (!list.length) {
    ctx.fillStyle = MUTED
    ctx.font = '600 24px Lexend, sans-serif'
    ctx.textAlign = 'center'
    ctx.fillText('Champion Hive', W / 2, baseY + 96)
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
  let x = (W - total) / 2
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

function teamRow(ctx: Ctx, name: string, score: string | null, y: number, win: boolean) {
  ctx.fillStyle = win ? GREEN : TEXT
  ctx.font = `${win ? 800 : 700} 64px Lexend, sans-serif`
  ctx.textAlign = 'left'
  ctx.fillText(ellipsize(ctx, name || 'Por definir', 640), 90, y)
  if (score != null) {
    ctx.textAlign = 'right'
    ctx.fillStyle = win ? GREEN : TEXT
    ctx.font = '800 76px Lexend, sans-serif'
    ctx.fillText(score, W - 90, y + 6)
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

export async function makeStandingsImage(
  t: any,
  group: string,
  rows: any[],
  sponsors: any[],
): Promise<Blob> {
  const { canvas, ctx } = await newCanvas()
  await drawBase(ctx, t, 'Tabla de posiciones')

  const title = group && group !== 'Sin Grupo' ? `Grupo ${group}` : 'Clasificación'
  ctx.fillStyle = TEXT
  ctx.font = '800 40px Lexend, sans-serif'
  ctx.textAlign = 'center'
  ctx.fillText(title, W / 2, 300)
  ctx.textAlign = 'left'

  const top = (rows || []).slice(0, 10)
  const x0 = 64
  const tw = W - 128
  let y = 360
  const rowH = Math.min(58, (H - 150 - y) / Math.max(top.length + 1, 1))

  // encabezado
  ctx.fillStyle = MUTED
  ctx.font = '700 24px Inter, sans-serif'
  ctx.fillText('#', x0 + 16, y + 36)
  ctx.fillText('EQUIPO', x0 + 80, y + 36)
  ctx.textAlign = 'right'
  ctx.fillText('PJ', x0 + tw - 230, y + 36)
  ctx.fillText('DG', x0 + tw - 120, y + 36)
  ctx.fillText('PTS', x0 + tw - 24, y + 36)
  ctx.textAlign = 'left'
  y += rowH

  top.forEach((r: any, i: number) => {
    if (i % 2 === 0) {
      ctx.fillStyle = 'rgba(216,227,251,0.05)'
      rr(ctx, x0, y, tw, rowH - 6, 12)
      ctx.fill()
    }
    const qualified = i < 2
    ctx.fillStyle = qualified ? GREEN : MUTED
    ctx.font = '800 30px Lexend, sans-serif'
    ctx.fillText(String(r.position ?? i + 1), x0 + 18, y + rowH / 2 + 10)

    ctx.fillStyle = TEXT
    ctx.font = '700 30px Lexend, sans-serif'
    ctx.textBaseline = 'middle'
    ctx.fillText(ellipsize(ctx, r.team_name || '—', tw - 420), x0 + 80, y + rowH / 2)
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
