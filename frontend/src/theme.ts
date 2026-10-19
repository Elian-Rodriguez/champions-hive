/**
 * Los colores del sistema «Hive Arena», en crudo.
 *
 * Tailwind no llega a donde hay que pintar a mano —un canvas de las imágenes
 * para redes, una gráfica de recharts, el QR—, así que los mismos tokens de
 * tailwind.config.js viven aquí como hex. Son dos archivos y un solo sistema:
 * si cambia el acento, cambia en los dos.
 *
 * El acta en PDF NO usa esto a propósito: se imprime en papel blanco con
 * tinta navy, y un verde de pantalla ahí no se lee.
 */
export const THEME = {
  ink: '#070910',
  inkDeep: '#04050A',
  surface: '#11151F',
  surfaceHigh: '#191E2A',
  line: '#272E3D',
  text: '#EAF0FA',
  textDim: '#99A4B8',
  volt: '#C7FF3F',
  voltDeep: '#9BE000',
  onVolt: '#0F1A00',
  outline: '#7A8396',
  ice: '#35E7FF',
  plasma: '#B15CFF',
  flare: '#FF6A3D',
  ember: '#FFB03A',
  periwinkle: '#A9B8FF',
} as const

/** Serie categórica para gráficas: arranca en el acento y se abre en frío,
 *  cálido y violeta, que es el orden en que se distinguen entre sí. */
export const CHART_SERIES = [
  THEME.volt,
  THEME.ice,
  THEME.flare,
  THEME.plasma,
  THEME.ember,
  THEME.periwinkle,
]

/**
 * Colores de los uniformes, que son dato del equipo y no del sistema.
 *
 * Viven aquí por la misma razón que el resto: el chip del uniforme se pinta
 * con un `style` en línea y ningún componente debería llevar un hex suelto.
 * `UNIFORME_POR_DEFECTO` es solo el valor con el que arranca el selector —lo
 * elige el organizador— y `SIN_UNIFORME` es con qué se pinta el equipo que
 * todavía no eligió ninguno, que eso sí es decisión del sistema.
 */
export const UNIFORME_POR_DEFECTO = '#39d353'
export const SIN_UNIFORME = THEME.outline

/** Estilo del tooltip de recharts (no acepta clases de Tailwind). */
export const chartTooltip = {
  background: THEME.surfaceHigh,
  border: `1px solid ${THEME.line}`,
  borderRadius: 12,
  color: THEME.text,
  fontSize: 12,
}
