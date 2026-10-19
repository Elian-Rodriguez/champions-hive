/**
 * Estado de un partido, y lo que pasa cuando no se juega: aplazado y W.O.
 *
 * Vive aparte porque estas etiquetas las pintan el marcador público, el panel
 * del organizador, la pantalla arbitral, el acta y el panel del capitán: un
 * estado nuevo mostrado en crudo («postponed») es un error visible al público
 * en cinco pantallas a la vez.
 */

export const ESTADO_LABEL: Record<string, string> = {
  scheduled: 'Programado',
  live: 'En vivo',
  finished: 'Finalizado',
  postponed: 'Aplazado',
}

export const estadoLabel = (estado?: string | null): string =>
  ESTADO_LABEL[String(estado)] || String(estado || '')

/** Etiqueta corta para la ficha del partido, o null si se jugó normal. */
export const woLabel = (walkover?: string | null): string | null =>
  !walkover ? null : walkover === 'both' ? 'Doble W.O.' : 'W.O.'

/** Frase completa con el nombre del que no se presentó. */
export function woDetalle(
  walkover?: string | null,
  local?: string | null,
  visitante?: string | null,
): string | null {
  if (!walkover) return null
  if (walkover === 'both') return 'No se presentó ninguno de los dos equipos'
  const ausente = walkover === 'home' ? local : visitante
  return `No se presentó ${ausente || (walkover === 'home' ? 'el local' : 'el visitante')}`
}

/** Un partido aplazado no se jugó ni tiene fecha: no cuenta para la tabla y no
 *  debe mostrarse como si estuviera programado. */
export const estaAplazado = (m: any): boolean => m?.status === 'postponed'

/**
 * La tanda de penales y la llave a ida y vuelta.
 *
 * Un 2-2 que se definió 4-3 se guardaba antes como 3-2 —el ganador arriba—
 * porque no había dónde poner la tanda. Ahora el marcador queda como terminó
 * y la tanda viaja al lado, así que todas las pantallas tienen que saber
 * pintarla: sin esto el público ve un empate y un equipo que pasó sin motivo.
 */

/** ¿Hubo tanda, y con un ganador? Un 4-4 cargado a medias no define nada. */
export const hayPenales = (m: any): boolean =>
  m?.home_penalties != null &&
  m?.away_penalties != null &&
  m.home_penalties !== m.away_penalties

/** «4-3 en penales», o null si no hubo tanda. */
export const penalesLabel = (m: any): string | null =>
  m?.home_penalties == null || m?.away_penalties == null
    ? null
    : `${m.home_penalties}-${m.away_penalties} en penales`

/** Ida o vuelta de una llave a dos partidos; null en un partido único. */
export const legLabel = (leg?: number | null): string | null =>
  leg === 1 ? 'Ida' : leg === 2 ? 'Vuelta' : null

/** Motivos por los que una llave quedó definida (los mismos del backend). */
export const MOTIVO_LLAVE: Record<string, string> = {
  marcador: 'por el resultado',
  global: 'por el global',
  gol_visitante: 'por gol de visitante',
  penales: 'en penales',
  localia: 'por localía',
}

/**
 * Una frase que explica quién pasó y por qué: «Pasa Los Tigres por el global
 * 3-2». El marcador solo no alcanza —un 2-2 no dice quién sigue— y es
 * justamente lo que el público, el acta y el capitán necesitan leer.
 */
export function resumenLlave(
  llave: any,
  localName?: string | null,
  visitanteName?: string | null,
  localId?: string | null,
): string | null {
  if (!llave?.ganador_id) return null
  const esLocal = String(llave.ganador_id) === String(localId)
  const quien = (esLocal ? localName : visitanteName) || 'el ganador'
  const motivo = MOTIVO_LLAVE[llave.motivo] || ''
  if (llave.motivo === 'global')
    return `Pasa ${quien} con global ${llave.global_local}-${llave.global_visitante}`
  if (llave.motivo === 'marcador') return `Pasa ${quien}`
  return `Pasa ${quien} ${motivo}`.trim()
}
