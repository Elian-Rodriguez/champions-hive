/**
 * Etiquetas del gobierno del campeonato: incidencias del informe arbitral,
 * tipos y estados de reclamo. Es la mitad del frontend de los catálogos de
 * `services/gobierno.py`: las claves las valida el backend, el texto, el icono
 * y el tono viven aquí, igual que `highlightPlays` en sports.ts.
 */

export const INCIDENCIAS: { value: string; label: string; icon: string }[] = [
  { value: 'agresion', label: 'Agresión', icon: 'back_hand' },
  { value: 'conducta_antideportiva', label: 'Conducta antideportiva', icon: 'thumb_down' },
  { value: 'insulto_arbitro', label: 'Insultos al árbitro', icon: 'sports' },
  { value: 'alineacion_indebida', label: 'Alineación indebida', icon: 'person_off' },
  { value: 'invasion', label: 'Invasión de campo / público', icon: 'groups' },
  { value: 'retraso', label: 'Retraso o falta de presentación', icon: 'schedule' },
  { value: 'lesion', label: 'Lesión', icon: 'healing' },
  { value: 'instalaciones', label: 'Instalaciones o seguridad', icon: 'warning' },
  { value: 'otro', label: 'Otra incidencia', icon: 'more_horiz' },
]

export const incidencia = (kind?: string | null) =>
  INCIDENCIAS.find((i) => i.value === kind) || INCIDENCIAS[INCIDENCIAS.length - 1]

export const TIPOS_RECLAMO: { value: string; label: string }[] = [
  { value: 'resultado', label: 'Resultado del partido' },
  { value: 'alineacion_indebida', label: 'Alineación indebida' },
  { value: 'arbitraje', label: 'Arbitraje' },
  { value: 'sancion', label: 'Apelación de una sanción' },
  { value: 'otro', label: 'Otro' },
]

/** Estado de un reclamo: etiqueta e icono, y el tono de la píldora. Lo
 *  pendiente va en naranja (urgencia), lo aceptado en voltaje. */
export const ESTADO_RECLAMO: Record<string, { label: string; icon: string; tone: string }> = {
  open: { label: 'Recibido', icon: 'mark_email_unread', tone: 'bg-tertiary/15 text-tertiary' },
  in_review: { label: 'En revisión', icon: 'manage_search', tone: 'bg-primary/15 text-primary' },
  accepted: { label: 'Aceptado', icon: 'check_circle', tone: 'bg-secondary/15 text-secondary' },
  rejected: { label: 'Rechazado', icon: 'cancel', tone: 'bg-error-container/50 text-error' },
  withdrawn: { label: 'Retirado', icon: 'undo', tone: 'bg-surface-container-high text-on-surface-variant' },
}

export const estadoReclamo = (s?: string | null) => ESTADO_RECLAMO[s || 'open'] || ESTADO_RECLAMO.open
export const reclamoPendiente = (s?: string | null) => s === 'open' || s === 'in_review'

/** Las fechas del backend son UTC sin sufijo. */
export function fechaCorta(iso?: string | null): string {
  if (!iso) return ''
  const d = new Date(/[Zz]|[+-]\d{2}:?\d{2}$/.test(iso) ? iso : `${iso}Z`)
  if (isNaN(d.getTime())) return ''
  return d.toLocaleString(undefined, {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  })
}

/** «2 fechas», «1 fecha», «Amonestación». */
export const fechasLabel = (n?: number | null) =>
  !n ? 'Amonestación' : n === 1 ? '1 fecha' : `${n} fechas`
