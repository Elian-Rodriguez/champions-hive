/**
 * Quema el marco DENTRO del clip, para que viaje con el archivo.
 *
 * Esto es lo que separa la función de ser una decoración de la aplicación a ser
 * algo que sirve: el overlay pintado en pantalla desaparece cuando alguien
 * descarga el video y lo manda por WhatsApp, y ese es exactamente el momento en
 * que el patrocinador tenía que estar ahí. Así que se graba un archivo nuevo con
 * el marco encima, igual que utils/socialImage.ts arma la imagen de posiciones
 * en vez de pedirle a la gente que haga una captura de pantalla.
 *
 * Cómo: se pinta cada fotograma del `<video>` en un canvas, se le dibuja el
 * marco arriba y se graba el canvas con `MediaRecorder`. El audio se saca del
 * mismo elemento con un `AudioContext` y se mezcla en el mismo stream —sin eso
 * el gol saldría muteado, que es media jugada—. Todo en el navegador: no hace
 * falta ffmpeg en el servidor ni que el clip viaje dos veces.
 *
 * **Dos límites que hay que contar en pantalla, no esconder:**
 *
 * - **Solo funciona con el video propio.** Un clip enlazado de YouTube o
 *   Instagram no se puede leer en un canvas (el navegador lo prohíbe por
 *   origen cruzado: «mancha» el canvas), así que esas jugadas se reproducen
 *   pero no se exportan. `motivoSinExportar()` devuelve la frase que lo
 *   explica.
 * - **Graba en tiempo real.** Un clip de 15 segundos tarda 15 segundos en
 *   exportarse, porque el fotograma se captura mientras se reproduce. De ahí
 *   el callback de progreso: sin él parecería colgado.
 */
import { dibujarMarco, cargarRecursos, type DatosMarco, type RecursosMarco } from './marcoJugada'

/** Lado mayor del archivo exportado. Un celular graba en 1080 o 4K y el clip
 *  se va a ver en un teléfono: 1280 se ve igual y pesa una fracción, que
 *  importa cuando se sube con datos móviles desde la tribuna. */
export const LADO_EXPORTADO = 1280

/** Cuadros por segundo de la grabación. 30 es lo que graba un celular. */
const FPS = 30

/** Formatos que se intentan, del mejor al que haya. vp9 pesa menos que vp8 a
 *  igual calidad; mp4 es lo único que graba Safari. */
const FORMATOS = [
  'video/webm;codecs=vp9,opus',
  'video/webm;codecs=vp8,opus',
  'video/webm',
  'video/mp4;codecs=avc1,mp4a.40.2',
  'video/mp4',
]

function formatoDisponible(): string | null {
  if (typeof MediaRecorder === 'undefined') return null
  for (const f of FORMATOS) {
    try {
      if (MediaRecorder.isTypeSupported(f)) return f
    } catch {
      /* navegadores viejos no tienen isTypeSupported */
    }
  }
  return null
}

/** Si este navegador puede quemar el marco en un archivo. */
export function soportaExportar(): boolean {
  return (
    typeof HTMLCanvasElement !== 'undefined' &&
    typeof HTMLCanvasElement.prototype.captureStream === 'function' &&
    !!formatoDisponible()
  )
}

/** Por qué no se puede exportar esta jugada, o null si sí se puede.
 *  Devuelve la frase lista para mostrar: un botón deshabilitado sin
 *  explicación es una función que parece rota. */
export function motivoSinExportar(storage?: string | null): string | null {
  if (storage === 'link')
    return 'Esta jugada es un enlace a otro sitio: el navegador no permite leer un video de otro dominio para ponerle el marco. Sube el archivo para poder exportarlo.'
  if (!soportaExportar())
    return 'Este navegador no puede grabar video. Prueba con Chrome, Edge o Firefox actualizados.'
  return null
}

export type OpcionesExportar = {
  /** URL del video. Tiene que ser del mismo origen (o servir CORS). */
  src: string
  datos: DatosMarco
  /** Recursos ya cargados; si no vienen, se cargan aquí. */
  recursos?: RecursosMarco
  /** 0 a 1. Se llama seguido: la grabación va en tiempo real y sin esto
   *  parecería que no pasa nada. */
  onProgreso?: (fraccion: number) => void
}

export type ClipExportado = { blob: Blob; extension: string }

function esperar(
  elemento: HTMLVideoElement,
  evento: string,
  ms: number,
): Promise<void> {
  return new Promise((resolve, reject) => {
    const limpiar = () => {
      elemento.removeEventListener(evento, ok)
      elemento.removeEventListener('error', mal)
      clearTimeout(reloj)
    }
    const ok = () => {
      limpiar()
      resolve()
    }
    const mal = () => {
      limpiar()
      reject(new Error('No se pudo leer el video.'))
    }
    const reloj = setTimeout(() => {
      limpiar()
      reject(new Error('El video tardó demasiado en cargar.'))
    }, ms)
    elemento.addEventListener(evento, ok, { once: true })
    elemento.addEventListener('error', mal, { once: true })
  })
}

/**
 * Graba el clip con el marco puesto y devuelve el archivo.
 *
 * Usa un `<video>` propio y no el del reproductor a propósito: enchufar un
 * elemento a un `AudioContext` le quita la salida a los altavoces para
 * siempre, así que hacerlo sobre el del reproductor dejaría la vista previa
 * muda después de la primera exportación.
 */
export async function exportarConMarco(
  opciones: OpcionesExportar,
): Promise<ClipExportado> {
  const formato = formatoDisponible()
  if (!formato) throw new Error('Este navegador no puede grabar video.')

  const recursos = opciones.recursos || (await cargarRecursos(opciones.datos))

  const video = document.createElement('video')
  video.crossOrigin = 'anonymous'
  video.preload = 'auto'
  video.playsInline = true
  video.src = opciones.src
  await esperar(video, 'loadedmetadata', 20000)

  const anchoNativo = video.videoWidth || 1280
  const altoNativo = video.videoHeight || 720
  const k = Math.min(1, LADO_EXPORTADO / Math.max(anchoNativo, altoNativo))
  const ancho = Math.max(2, Math.round((anchoNativo * k) / 2) * 2)
  const alto = Math.max(2, Math.round((altoNativo * k) / 2) * 2)

  const canvas = document.createElement('canvas')
  canvas.width = ancho
  canvas.height = alto
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('El navegador no pudo preparar el lienzo.')

  // Primer fotograma antes de grabar: si el video es de otro origen, el canvas
  // queda «manchado» y esto lo descubre AHORA con un mensaje claro, en vez de
  // entregar quince segundos de negro.
  ctx.drawImage(video, 0, 0, ancho, alto)
  try {
    ctx.getImageData(0, 0, 1, 1)
  } catch {
    throw new Error(
      'El navegador no permite ponerle marco a un video de otro dominio. ' +
        'Sube el archivo al campeonato para poder exportarlo.',
    )
  }

  const stream = canvas.captureStream(FPS)

  // Audio: el gol sin el grito de la tribuna es media jugada. Si el clip no
  // trae pista o el navegador no deja, se graba muteado y se sigue: mejor un
  // clip sin sonido que ningún clip.
  let audioCtx: AudioContext | null = null
  try {
    const Ctor = window.AudioContext || (window as any).webkitAudioContext
    if (Ctor) {
      audioCtx = new Ctor()
      if (audioCtx.state === 'suspended') await audioCtx.resume()
      const fuente = audioCtx.createMediaElementSource(video)
      const destino = audioCtx.createMediaStreamDestination()
      fuente.connect(destino)
      destino.stream.getAudioTracks().forEach((t) => stream.addTrack(t))
    }
  } catch {
    audioCtx = null
  }

  const grabadora = new MediaRecorder(stream, {
    mimeType: formato,
    videoBitsPerSecond: 4_000_000,
  })
  const trozos: Blob[] = []
  grabadora.ondataavailable = (e) => {
    if (e.data && e.data.size) trozos.push(e.data)
  }

  const duracion = Number.isFinite(video.duration) && video.duration > 0 ? video.duration : 0
  let pintando = true

  const terminado = new Promise<void>((resolve) => {
    grabadora.onstop = () => resolve()
  })

  const pintar = () => {
    if (!pintando) return
    ctx.drawImage(video, 0, 0, ancho, alto)
    dibujarMarco(ctx, ancho, alto, opciones.datos, recursos)
    if (duracion) opciones.onProgreso?.(Math.min(1, video.currentTime / duracion))
    requestAnimationFrame(pintar)
  }

  const detener = () => {
    if (!pintando) return
    pintando = false
    try {
      if (grabadora.state !== 'inactive') grabadora.stop()
    } catch {
      /* ya estaba detenida */
    }
    stream.getTracks().forEach((t) => t.stop())
  }

  video.addEventListener('ended', detener, { once: true })
  // Red de seguridad: si 'ended' no llega (un clip con duración mal escrita,
  // una pista cortada), la grabación no puede quedarse abierta para siempre.
  const tope = setTimeout(detener, Math.max(5000, duracion * 1500 + 5000))

  grabadora.start(250)
  try {
    video.currentTime = 0
    await video.play()
  } catch {
    detener()
    clearTimeout(tope)
    audioCtx?.close().catch(() => {})
    throw new Error('El navegador no dejó reproducir el clip para grabarlo.')
  }
  requestAnimationFrame(pintar)

  await terminado
  clearTimeout(tope)
  video.pause()
  audioCtx?.close().catch(() => {})
  opciones.onProgreso?.(1)

  const tipo = grabadora.mimeType || formato
  const blob = new Blob(trozos, { type: tipo })
  if (!blob.size) throw new Error('La grabación salió vacía; inténtalo de nuevo.')
  return { blob, extension: tipo.includes('mp4') ? 'mp4' : 'webm' }
}

/** Nombre de archivo legible: lo que va a quedar en la galería del teléfono. */
export function nombreDeArchivo(datos: DatosMarco, extension: string): string {
  const partes = [datos.campeonato, datos.jugada, datos.jugador || datos.titulo]
    .map((p) => (p || '').trim())
    .filter(Boolean)
    .join('-')
  const limpio =
    partes
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .replace(/[^a-zA-Z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .toLowerCase() || 'jugada'
  return `${limpio.slice(0, 70)}.${extension}`
}

/** Descarga el blob. Es lo que hace el botón de «Descargar con marco». */
export function descargar(blob: Blob, nombre: string) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = nombre
  document.body.appendChild(a)
  a.click()
  a.remove()
  // Revocar en el mismo tick cancela la descarga en algunos navegadores.
  setTimeout(() => URL.revokeObjectURL(url), 10000)
}

/** Comparte el clip por el menú nativo del sistema (WhatsApp, Instagram…).
 *  Devuelve si se pudo: en escritorio casi nunca, y ahí el botón de descargar
 *  es el que sirve. */
export async function compartirClip(blob: Blob, nombre: string, texto: string) {
  const nav = navigator as any
  if (!nav.share || !nav.canShare) return false
  const archivo = new File([blob], nombre, { type: blob.type })
  if (!nav.canShare({ files: [archivo] })) return false
  try {
    await nav.share({ files: [archivo], text: texto })
    return true
  } catch {
    return false
  }
}
