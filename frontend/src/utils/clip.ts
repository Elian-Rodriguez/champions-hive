/**
 * El archivo de video que elige el organizador, antes de que salga del
 * navegador: comprobarlo, medirlo y sacarle una portada.
 *
 * Es el equivalente de utils/imagen.ts para los clips, con una diferencia que
 * decide todo: el escudo se reduce y se manda dentro del JSON, y el video NO
 * se puede tocar —reducirlo en el navegador sería recodificarlo, que tarda más
 * que subirlo y pierde calidad—. Así que aquí no se transforma el video: se
 * comprueba que sea reproducible, se mide y se le saca un fotograma de portada.
 *
 * La portada importa más de lo que parece: sin ella, pintar la grilla del reel
 * obligaría a bajar todos los videos del campeonato para mostrar una miniatura.
 * Con ella son unos KB de data URI, igual que los escudos.
 */

/** Lado mayor de la portada. Se muestra en una tarjeta de 200-400 px. */
const LADO_PORTADA = 640

/** Tope del data URI de la portada: el backend rechaza por encima de 400 000
 *  (la misma puerta que los escudos). */
const MAX_PORTADA = 300_000

export type ClipLeido = {
  archivo: File
  /** Fotograma de portada en data URI, o null si el navegador no pudo
   *  decodificar el video (pasa con .mov grabado en HEVC en Chrome). La
   *  subida sigue siendo válida: el reel muestra el emblema de la jugada. */
  portada: string | null
  /** Segundos, redondeados. null si el navegador no los pudo leer. */
  duracion: number | null
  ancho: number
  alto: number
  /** True si el navegador no pudo reproducirlo. No bloquea la subida —el clip
   *  puede ser perfectamente válido para otro navegador— pero el panel lo
   *  advierte, porque lo más probable es que tampoco se vea en el marcador. */
  ilegible: boolean
}

export const TIPOS_ACEPTADOS = 'video/mp4,video/quicktime,video/webm,video/ogg'

/** Lo que el `<input type="file">` ofrece. Los teléfonos lo usan para abrir la
 *  galería de video en vez de la de fotos. */
export const ACCEPT_VIDEO = `${TIPOS_ACEPTADOS},.mp4,.mov,.webm`

function extension(nombre: string): string {
  const i = nombre.lastIndexOf('.')
  return i < 0 ? '' : nombre.slice(i).toLowerCase()
}

/** Si el archivo tiene pinta de video admitido. El backend vuelve a
 *  comprobarlo mirando los primeros bytes —aquí solo se evita el viaje. */
export function pareceVideo(archivo: File): boolean {
  if (archivo.type.startsWith('video/')) return true
  return ['.mp4', '.m4v', '.mov', '.webm', '.ogv'].includes(extension(archivo.name))
}

export function pesoLegible(bytes?: number | null): string {
  if (!bytes) return '—'
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export function duracionLegible(segundos?: number | null): string {
  if (segundos == null) return '—'
  const s = Math.round(segundos)
  const m = Math.floor(s / 60)
  return m ? `${m}:${String(s % 60).padStart(2, '0')}` : `${s}s`
}

function portadaDesde(video: HTMLVideoElement): string | null {
  const ancho = video.videoWidth
  const alto = video.videoHeight
  if (!ancho || !alto) return null
  const k = Math.min(1, LADO_PORTADA / Math.max(ancho, alto))
  const c = document.createElement('canvas')
  c.width = Math.max(1, Math.round(ancho * k))
  c.height = Math.max(1, Math.round(alto * k))
  const ctx = c.getContext('2d')
  if (!ctx) return null
  try {
    ctx.drawImage(video, 0, 0, c.width, c.height)
  } catch {
    return null
  }
  // webp pesa la mitad que jpeg a igual calidad; si el navegador no lo sabe
  // generar devuelve otra cosa, y por eso se comprueba el prefijo.
  for (const calidad of [0.72, 0.55, 0.4]) {
    const webp = c.toDataURL('image/webp', calidad)
    if (webp.startsWith('data:image/webp') && webp.length <= MAX_PORTADA) return webp
    const jpeg = c.toDataURL('image/jpeg', calidad)
    if (jpeg.startsWith('data:image/jpeg') && jpeg.length <= MAX_PORTADA) return jpeg
  }
  return null
}

/**
 * Mide el clip y le saca la portada. Nunca lanza por no poder leer el video:
 * devuelve `ilegible: true` y deja decidir a quien llama.
 */
export function leerClip(archivo: File, maxMB: number): Promise<ClipLeido> {
  return new Promise((resolve, reject) => {
    if (!pareceVideo(archivo)) {
      reject(new Error('Ese archivo no es un video. Elige un MP4, MOV o WEBM.'))
      return
    }
    if (archivo.size > maxMB * 1024 * 1024) {
      reject(
        new Error(
          `El clip pesa ${pesoLegible(archivo.size)} y el tope es ${maxMB} MB. ` +
            'Recórtalo a la jugada: diez o quince segundos bastan.',
        ),
      )
      return
    }

    const url = URL.createObjectURL(archivo)
    const video = document.createElement('video')
    video.preload = 'auto'
    video.muted = true
    video.playsInline = true

    const vacio = (ilegible: boolean): ClipLeido => ({
      archivo,
      portada: null,
      duracion: null,
      ancho: 0,
      alto: 0,
      ilegible,
    })

    const cerrar = () => {
      clearTimeout(reloj)
      URL.revokeObjectURL(url)
      video.removeAttribute('src')
    }

    // Si el navegador no decodifica el contenedor se queda callado para
    // siempre, así que el reloj es la única salida.
    const reloj = setTimeout(() => {
      cerrar()
      resolve(vacio(true))
    }, 12000)

    video.onerror = () => {
      cerrar()
      resolve(vacio(true))
    }

    video.onloadeddata = () => {
      const duracion =
        Number.isFinite(video.duration) && video.duration > 0 ? video.duration : null
      // Un fotograma del primer tercio: el primero suele ser negro o el
      // arranque de la cámara, y la jugada todavía no empezó.
      const instante = duracion ? Math.min(duracion * 0.33, duracion - 0.05) : 0

      const sacar = () => {
        const portada = portadaDesde(video)
        const ancho = video.videoWidth
        const alto = video.videoHeight
        cerrar()
        resolve({
          archivo,
          portada,
          duracion: duracion == null ? null : Math.round(duracion),
          ancho,
          alto,
          ilegible: false,
        })
      }

      if (instante > 0.05) {
        video.onseeked = sacar
        try {
          video.currentTime = instante
        } catch {
          sacar()
        }
      } else {
        sacar()
      }
    }

    video.src = url
  })
}
