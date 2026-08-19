/**
 * Escudos de equipo: pasa el archivo que eligió el organizador a una imagen
 * chica lista para guardar.
 *
 * El escudo se guarda dentro de `logo_url` como data URI, no como archivo en el
 * servidor: así viaja con la base (backup, cambio de servidor, Postgres o
 * SQLite) y no depende de un sitio ajeno que mañana responda 404 o niegue CORS
 * justo cuando el acta lo va a dibujar en el canvas. Para que eso sea razonable
 * la imagen tiene que ser chica, y de eso se encarga este módulo antes de que
 * nada salga del navegador.
 */

/** Lado máximo del escudo. Se muestra en 24-48 px en pantalla y se imprime en
 *  14-18 mm en el acta: más de 256 px no se nota y sí pesa. */
export const LADO_ESCUDO = 256

/** Tope del data URI ya codificado. El backend rechaza por encima de 400 000,
 *  así que aquí se corta antes para poder explicarlo en la misma pantalla. */
export const MAX_ESCUDO = 300_000

function leerImagen(archivo: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(archivo)
    const img = new Image()
    img.onload = () => {
      URL.revokeObjectURL(url)
      resolve(img)
    }
    img.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error('No se pudo leer la imagen'))
    }
    img.src = url
  })
}

/** Reduce el archivo a un escudo chico y lo devuelve como data URI. */
export async function escudoDesdeArchivo(archivo: File): Promise<string> {
  if (!archivo.type.startsWith('image/')) throw new Error('El archivo no es una imagen')
  const img = await leerImagen(archivo)
  // Un SVG sin tamaño propio llega con 0×0 y el canvas saldría en blanco.
  if (!img.width || !img.height)
    throw new Error('La imagen no tiene tamaño; prueba con un PNG o un JPG')

  const k = Math.min(1, LADO_ESCUDO / Math.max(img.width, img.height))
  const c = document.createElement('canvas')
  c.width = Math.max(1, Math.round(img.width * k))
  c.height = Math.max(1, Math.round(img.height * k))
  const ctx = c.getContext('2d')
  if (!ctx) throw new Error('El navegador no pudo procesar la imagen')
  ctx.drawImage(img, 0, 0, c.width, c.height)

  // webp mantiene la transparencia del escudo y pesa la mitad que png. Si el
  // navegador no sabe generarlo, toDataURL devuelve un png igual, y por eso se
  // comprueba el prefijo en vez de confiar en el formato pedido.
  for (const calidad of [0.9, 0.75, 0.6]) {
    const webp = c.toDataURL('image/webp', calidad)
    if (webp.startsWith('data:image/webp') && webp.length <= MAX_ESCUDO) return webp
  }
  const png = c.toDataURL('image/png')
  if (png.length <= MAX_ESCUDO) return png
  throw new Error('La imagen pesa demasiado; prueba con una más simple')
}
