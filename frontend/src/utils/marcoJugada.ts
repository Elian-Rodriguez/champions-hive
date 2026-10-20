/**
 * El marco de las mejores jugadas: la gráfica que envuelve el clip.
 *
 * **Por qué canvas y no CSS.** Un overlay de CSS se ve bien en la aplicación y
 * desaparece en el momento en que alguien descarga el video —que es justo
 * cuando el patrocinador necesita estar ahí—. El clip no se ve donde se ve la
 * aplicación: se ve en un grupo de WhatsApp o en una historia de Instagram. Es
 * el mismo razonamiento que ya está escrito en utils/socialImage.ts para las
 * imágenes de posiciones y calendario, aplicado a video.
 *
 * Y por eso el reproductor de la aplicación usa ESTE mismo canvas en vez de un
 * `<video>` con divs encima: así hay un solo dibujante (no dos diseños que se
 * separan con el tiempo) y la vista previa es literalmente el archivo que se
 * va a exportar, que es lo que el organizador está revisando cuando mira dónde
 * quedó el logo del patrocinador.
 *
 * **El diseño.** Transmisión deportiva pero juvenil: el acento es voltaje, los
 * bloques van inclinados (nada en una gráfica de ESPN es un rectángulo recto),
 * el tipo va ensanchado y en mayúsculas, y el tercio inferior es una pieza de
 * color con tinta oscura encima. Se mide todo en unidades relativas a la
 * ALTURA (`u = alto / 100`) porque la mitad de los clips van a llegar
 * verticales desde un celular, y un marco medido en píxeles fijos se ve
 * diminuto en 1080×1920 y gigante en 640×360.
 */
import { THEME } from '../theme'
import { jugadaDestacada, sportOf, type HighlightPlay } from '../sports'

/** Qué se pinta en el marco. Todo es opcional menos el campeonato: un torneo
 *  recién creado no tiene logo ni patrocinadores y el marco tiene que verse
 *  bien igual. */
export type DatosMarco = {
  campeonato: string
  deporte?: string | null
  logo?: string | null
  /** Máximo 5, como en las imágenes para redes: más no se leen. */
  patrocinadores?: { name?: string | null; logo_url?: string | null }[]
  jugada?: string | null
  titulo?: string | null
  jugador?: string | null
  equipo?: string | null
  partido?: string | null
  minuto?: number | null
}

/** Imágenes ya cargadas. Dibujar es sincrónico (se llama 60 veces por segundo),
 *  así que todo lo que haya que bajar se baja una vez, antes. */
export type RecursosMarco = {
  logo: HTMLImageElement | null
  patrocinadores: { img: HTMLImageElement | null; name: string }[]
}

const TOPE_PATROCINADORES = 5

/** Hex del tono de la jugada. El token viene de sports.ts y el color de
 *  theme.ts: el canvas no puede leer una clase de Tailwind. */
function hexDelTono(play: HighlightPlay): string {
  const mapa: Record<string, string> = {
    volt: THEME.volt,
    ice: THEME.ice,
    plasma: THEME.plasma,
    flare: THEME.flare,
    ember: THEME.ember,
    outline: THEME.outline,
  }
  return mapa[play.tone] || THEME.volt
}

function cargarImagen(src?: string | null): Promise<HTMLImageElement | null> {
  if (!src) return Promise.resolve(null)
  return new Promise((resolve) => {
    const img = new Image()
    // Un logo que viene por http y niega CORS mancharía el canvas y rompería
    // la exportación entera. Pedirlo como anónimo es lo que deja que un
    // `data:` o un servidor con CORS entre, y que el resto se descarte sin
    // llevarse el clip por delante.
    img.crossOrigin = 'anonymous'
    const fin = setTimeout(() => resolve(null), 4000)
    img.onload = () => {
      clearTimeout(fin)
      resolve(img.width && img.height ? img : null)
    }
    img.onerror = () => {
      clearTimeout(fin)
      resolve(null)
    }
    img.src = src
  })
}

/** Baja el logo y los escudos de los patrocinadores una sola vez. */
export async function cargarRecursos(datos: DatosMarco): Promise<RecursosMarco> {
  const lista = (datos.patrocinadores || []).slice(0, TOPE_PATROCINADORES)
  const [logo, ...sponsors] = await Promise.all([
    cargarImagen(datos.logo),
    ...lista.map((s) => cargarImagen(s.logo_url)),
  ])
  return {
    logo,
    patrocinadores: lista.map((s, i) => ({
      img: sponsors[i] || null,
      name: (s.name || '').trim(),
    })),
  }
}

// --------------------------------------------------------------------------- #
//  Piezas de dibujo
// --------------------------------------------------------------------------- #
/** Paralelogramo: el bloque inclinado del que está hecha toda la gráfica. */
function tajada(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  sesgo: number,
) {
  ctx.beginPath()
  ctx.moveTo(x + sesgo, y)
  ctx.lineTo(x + w + sesgo, y)
  ctx.lineTo(x + w, y + h)
  ctx.lineTo(x, y + h)
  ctx.closePath()
}

/** Hexágono: la forma de la marca (la casa se llama colmena). */
function hexagono(ctx: CanvasRenderingContext2D, cx: number, cy: number, r: number) {
  ctx.beginPath()
  for (let i = 0; i < 6; i++) {
    const a = (Math.PI / 3) * i - Math.PI / 2
    const px = cx + r * Math.cos(a)
    const py = cy + r * Math.sin(a)
    i ? ctx.lineTo(px, py) : ctx.moveTo(px, py)
  }
  ctx.closePath()
}

function fuente(px: number, peso = 800, ancho = 120): string {
  // Archivo es variable y tiene eje de ancho; si no cargó, cualquier sans
  // sirve y el marco se ve igual de legible.
  return `${peso} ${Math.round(px)}px "Archivo", "Archivo Expanded", Inter, system-ui, sans-serif`
}

/** Dibuja texto recortándolo con «…» si no cabe. Devuelve el ancho usado. */
function texto(
  ctx: CanvasRenderingContext2D,
  s: string,
  x: number,
  y: number,
  maxAncho: number,
): number {
  let t = s
  while (t.length > 1 && ctx.measureText(t).width > maxAncho) t = t.slice(0, -1)
  if (t !== s && t.length > 1) t = t.slice(0, -1) + '…'
  ctx.fillText(t, x, y)
  return Math.min(ctx.measureText(t).width, maxAncho)
}

/** Imagen encajada dentro de una caja, sin deformarla. */
function encajar(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  x: number,
  y: number,
  w: number,
  h: number,
) {
  const k = Math.min(w / img.width, h / img.height)
  const iw = img.width * k
  const ih = img.height * k
  ctx.drawImage(img, x + (w - iw) / 2, y + (h - ih) / 2, iw, ih)
}

// --------------------------------------------------------------------------- #
//  El marco
// --------------------------------------------------------------------------- #
/**
 * Pinta el marco SOBRE lo que ya haya en el canvas (el fotograma del video).
 *
 * No dibuja el video: eso lo hace quien llama, porque el reproductor lo saca
 * de un `<video>` en vivo y la exportación del mismo elemento mientras graba.
 */
export function dibujarMarco(
  ctx: CanvasRenderingContext2D,
  ancho: number,
  alto: number,
  datos: DatosMarco,
  recursos: RecursosMarco,
) {
  const u = alto / 100 // unidad: 1% de la altura
  const play = jugadaDestacada(datos.deporte, datos.jugada)
  const acento = hexDelTono(play)
  const vertical = alto > ancho

  ctx.save()
  ctx.textBaseline = 'alphabetic'

  // --- Viñeta: el texto blanco tiene que leerse sobre un video que puede ser
  // una cancha al sol. Es la única forma de garantizar contraste sin tapar la
  // jugada, que es lo que la gente vino a ver.
  const arriba = ctx.createLinearGradient(0, 0, 0, alto * 0.22)
  arriba.addColorStop(0, 'rgba(4,5,10,.78)')
  arriba.addColorStop(1, 'rgba(4,5,10,0)')
  ctx.fillStyle = arriba
  ctx.fillRect(0, 0, ancho, alto * 0.22)

  const abajo = ctx.createLinearGradient(0, alto, 0, alto * 0.58)
  abajo.addColorStop(0, 'rgba(4,5,10,.92)')
  abajo.addColorStop(1, 'rgba(4,5,10,0)')
  ctx.fillStyle = abajo
  ctx.fillRect(0, alto * 0.58, ancho, alto * 0.42)

  // --- Filo de voltaje en el borde superior: lo primero que dice que esto es
  // una transmisión y no un video suelto.
  ctx.fillStyle = acento
  ctx.fillRect(0, 0, ancho, Math.max(2, u * 0.5))

  // ======================= CABECERA =======================
  const margen = u * 4.5
  let x = margen
  const yCab = margen + u * 1.5
  const altoCab = u * 9

  // El emblema: hexágono con el logo del campeonato dentro, o el icono de la
  // disciplina si el torneo todavía no tiene logo.
  const rHex = altoCab / 2
  const cx = x + rHex
  const cy = yCab + rHex
  ctx.save()
  hexagono(ctx, cx, cy, rHex)
  ctx.fillStyle = acento
  ctx.fill()
  hexagono(ctx, cx, cy, rHex - Math.max(1.5, u * 0.42))
  ctx.fillStyle = THEME.inkDeep
  ctx.fill()
  if (recursos.logo) {
    ctx.save()
    hexagono(ctx, cx, cy, rHex - Math.max(2, u * 0.7))
    ctx.clip()
    encajar(ctx, recursos.logo, cx - rHex, cy - rHex, rHex * 2, rHex * 2)
    ctx.restore()
  } else {
    ctx.fillStyle = acento
    ctx.font = fuente(rHex * 0.95, 900)
    ctx.textAlign = 'center'
    ctx.fillText(
      (datos.campeonato || '?').trim().charAt(0).toUpperCase() || '?',
      cx,
      cy + rHex * 0.34,
    )
    ctx.textAlign = 'left'
  }
  ctx.restore()
  x = cx + rHex + u * 2.2

  // Nombre del campeonato, ensanchado y en mayúsculas.
  const anchoChip = vertical ? 0 : u * 26
  const maxNombre = ancho - x - margen - anchoChip - u * 2
  ctx.fillStyle = THEME.text
  ctx.font = fuente(u * 4.4, 800)
  ctx.letterSpacing = `${u * 0.12}px`
  texto(ctx, (datos.campeonato || '').toUpperCase(), x, yCab + u * 4.1, maxNombre)
  ctx.letterSpacing = '0px'

  // Disciplina, debajo y en gris.
  ctx.fillStyle = THEME.textDim
  ctx.font = fuente(u * 2.5, 700)
  ctx.letterSpacing = `${u * 0.2}px`
  texto(
    ctx,
    sportOf(datos.deporte).label.toUpperCase() + ' · MEJORES JUGADAS',
    x,
    yCab + u * 8.2,
    maxNombre,
  )
  ctx.letterSpacing = '0px'

  // Chip de la jugada, arriba a la derecha. En vertical no cabe al lado del
  // nombre, así que baja al tercio inferior (ver más abajo).
  if (!vertical) {
    const etiqueta = play.label.toUpperCase()
    ctx.font = fuente(u * 3.3, 900)
    const anchoTexto = ctx.measureText(etiqueta).width
    const padChip = u * 2.4
    const wChip = anchoTexto + padChip * 2
    const hChip = u * 6.4
    const xChip = ancho - margen - wChip
    tajada(ctx, xChip, yCab + u * 1.2, wChip, hChip, hChip * 0.22)
    ctx.fillStyle = acento
    ctx.fill()
    ctx.fillStyle = THEME.inkDeep
    ctx.fillText(etiqueta, xChip + padChip + hChip * 0.11, yCab + u * 1.2 + hChip * 0.68)
  }

  // ======================= TERCIO INFERIOR =======================
  const hBanda = recursos.patrocinadores.length ? u * 11 : 0
  const baseTercio = alto - hBanda
  const sesgo = u * 2.6

  // Pieza de color con la jugada. Es lo que hace que el clip se lea de un
  // golpe cuando pasa en un muro: antes del título y antes del nombre.
  const etiqueta = play.label.toUpperCase()
  ctx.font = fuente(u * 4.6, 900)
  ctx.letterSpacing = `${u * 0.18}px`
  const wEtiqueta = ctx.measureText(etiqueta).width
  const hPieza = u * 8
  const wPieza = wEtiqueta + u * 6
  const yPieza = baseTercio - u * 20
  tajada(ctx, margen, yPieza, wPieza, hPieza, sesgo)
  ctx.fillStyle = acento
  ctx.fill()
  ctx.fillStyle = THEME.inkDeep
  ctx.fillText(etiqueta, margen + u * 3 + sesgo * 0.5, yPieza + hPieza * 0.69)
  ctx.letterSpacing = '0px'

  // Minuto, pegado a la pieza: en tinta sobre un bloque oscuro.
  if (datos.minuto != null) {
    const min = `${datos.minuto}'`
    ctx.font = fuente(u * 4.2, 900)
    const wMin = ctx.measureText(min).width + u * 4
    tajada(ctx, margen + wPieza + u * 0.9, yPieza, wMin, hPieza, sesgo)
    ctx.fillStyle = 'rgba(4,5,10,.9)'
    ctx.fill()
    ctx.fillStyle = acento
    ctx.fillText(min, margen + wPieza + u * 0.9 + u * 2 + sesgo * 0.5, yPieza + hPieza * 0.69)
  }

  // Título de la jugada (o el nombre del jugador si no hay título).
  const titular = (datos.titulo || datos.jugador || '').trim()
  let y = yPieza + hPieza + u * 6.4
  if (titular) {
    ctx.fillStyle = THEME.text
    ctx.font = fuente(u * 6.2, 800)
    texto(ctx, titular.toUpperCase(), margen, y, ancho - margen * 2)
    y += u * 5
  }

  // Línea de pie: jugador · equipo · partido. Lo que explica el clip al que lo
  // encuentra dos semanas después sin contexto.
  const pie = [
    datos.titulo && datos.jugador ? datos.jugador : null,
    datos.equipo,
    datos.partido,
  ]
    .map((p) => (p || '').trim())
    .filter(Boolean)
    .join('  ·  ')
  if (pie) {
    ctx.fillStyle = THEME.textDim
    ctx.font = fuente(u * 3, 700)
    texto(ctx, pie, margen, y, ancho - margen * 2)
  }

  // ======================= PATROCINADORES =======================
  // Es la razón comercial de que esto exista: el clip circula y el logo va
  // encima. Van en una banda propia abajo —no flotando sobre la jugada— porque
  // ahí se leen sin tapar nada y porque es donde el ojo ya los busca.
  if (recursos.patrocinadores.length) {
    ctx.fillStyle = 'rgba(4,5,10,.88)'
    ctx.fillRect(0, baseTercio, ancho, hBanda)
    ctx.fillStyle = 'rgba(199,255,63,.35)'
    ctx.fillRect(0, baseTercio, ancho, Math.max(1, u * 0.22))

    ctx.fillStyle = THEME.textDim
    ctx.font = fuente(u * 2.1, 800)
    ctx.letterSpacing = `${u * 0.26}px`
    const rotulo = 'PATROCINA'
    const wRotulo = ctx.measureText(rotulo).width
    ctx.fillText(rotulo, margen, baseTercio + hBanda * 0.62)
    ctx.letterSpacing = '0px'

    const xLogos = margen + wRotulo + u * 3
    const dispon = ancho - xLogos - margen
    const hLogo = hBanda * 0.56
    const paso = dispon / recursos.patrocinadores.length
    recursos.patrocinadores.forEach((s, i) => {
      const xs = xLogos + paso * i
      const w = Math.min(paso - u * 1.5, hLogo * 2.8)
      const yl = baseTercio + (hBanda - hLogo) / 2
      if (s.img) {
        encajar(ctx, s.img, xs, yl, w, hLogo)
      } else if (s.name) {
        // Sin logo, el nombre: un hueco diría que el patrocinador no está.
        ctx.fillStyle = THEME.text
        ctx.font = fuente(u * 2.6, 800)
        texto(ctx, s.name.toUpperCase(), xs, baseTercio + hBanda * 0.62, w)
      }
    })
  }

  // Marca de la plataforma, discreta, arriba a la derecha en vertical y abajo
  // a la derecha en horizontal (donde no choca con el tercio inferior).
  ctx.fillStyle = 'rgba(234,240,250,.5)'
  ctx.font = fuente(u * 2.2, 800)
  ctx.letterSpacing = `${u * 0.2}px`
  ctx.textAlign = 'right'
  ctx.fillText(
    'CHAMPION HIVE',
    ancho - margen,
    vertical ? margen + u * 5.4 : baseTercio - u * 2.4,
  )
  ctx.textAlign = 'left'
  ctx.letterSpacing = '0px'

  ctx.restore()
}
