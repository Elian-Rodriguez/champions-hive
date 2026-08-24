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
