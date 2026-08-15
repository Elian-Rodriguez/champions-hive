/**
 * Catálogo de disciplinas: etiquetas, identidad visual, eventos que puede
 * cargar el árbitro y columnas de disciplina de las tablas públicas.
 * Es la única fuente de verdad del front — para sumar un deporte basta con
 * agregar una entrada aquí (y el valor equivalente en SportType del backend).
 */

export type DisciplineEvent = {
  type: string
  label: string
  short: string
  color: string
}

export type DiscColumn = { key: string; label: string; title: string }

export type SportMeta = {
  value: string
  label: string
  icon: string
  grad: string
  ring: string
  /** Cómo se llama la unidad del marcador (goles / puntos). */
  scoreLabel: string
  /** Eventos disciplinarios disponibles en el panel del árbitro. */
  events: DisciplineEvent[]
  /** Columnas de disciplina en las tablas públicas. */
  discColumns: DiscColumn[]
}

const AMARILLA: DisciplineEvent = {
  type: 'AMARILLA',
  label: 'Amarilla',
  short: 'AM',
  color: 'bg-yellow-400 text-black',
}
const AZUL: DisciplineEvent = {
  type: 'AZUL',
  label: 'Azul',
  short: 'AZ',
  color: 'bg-blue-500 text-white',
}
const ROJA: DisciplineEvent = {
  type: 'ROJA',
  label: 'Roja',
  short: 'RJ',
  color: 'bg-red-500 text-white',
}
const FALTA: DisciplineEvent = {
  type: 'FALTA',
  label: 'Falta',
  short: 'FAL',
  color: 'bg-orange-500 text-white',
}

const COL_YELLOW: DiscColumn = { key: 'yellow', label: '🟨', title: 'Amarillas' }
const COL_BLUE: DiscColumn = { key: 'blue', label: '🟦', title: 'Azules' }
const COL_RED: DiscColumn = { key: 'red', label: '🟥', title: 'Rojas' }
const COL_FOULS: DiscColumn = { key: 'fouls', label: 'Fal', title: 'Faltas' }

export const SPORTS: Record<string, SportMeta> = {
  football: {
    value: 'football',
    label: 'Fútbol',
    icon: 'sports_soccer',
    grad: 'from-secondary/35 via-secondary/10 to-transparent',
    ring: 'text-secondary',
    scoreLabel: 'Goles',
    events: [AMARILLA, ROJA],
    discColumns: [COL_YELLOW, COL_RED],
  },
  micro: {
    value: 'micro',
    label: 'Microfútbol',
    icon: 'sports_soccer',
    grad: 'from-tertiary/35 via-tertiary/10 to-transparent',
    ring: 'text-tertiary',
    scoreLabel: 'Goles',
    events: [AMARILLA, AZUL, ROJA],
    discColumns: [COL_YELLOW, COL_BLUE, COL_RED],
  },
  basketball: {
    value: 'basketball',
    label: 'Baloncesto',
    icon: 'sports_basketball',
    grad: 'from-primary/35 via-primary/10 to-transparent',
    ring: 'text-primary',
    scoreLabel: 'Puntos',
    events: [
      FALTA,
      { type: 'TECNICA', label: 'Técnica', short: 'TÉC', color: 'bg-purple-500 text-white' },
      {
        type: 'ANTIDEPORTIVA',
        label: 'Antideportiva',
        short: 'ANT',
        color: 'bg-red-500 text-white',
      },
    ],
    discColumns: [{ key: 'fouls', label: 'Faltas', title: 'Faltas' }],
  },
  // Banquitas: fútbol de canchas pequeñas, partidos cortos por tiempo. Puntúa
  // como fútbol (3/1/0, con empate) y el árbitro lleva tarjetas —incluida la
  // azul de expulsión temporal— además del conteo de faltas.
  banquitas: {
    value: 'banquitas',
    label: 'Banquitas',
    icon: 'sports_soccer',
    grad: 'from-secondary-container/45 via-secondary-container/15 to-transparent',
    ring: 'text-secondary-container',
    scoreLabel: 'Goles',
    events: [AMARILLA, AZUL, ROJA, FALTA],
    discColumns: [COL_YELLOW, COL_BLUE, COL_RED, COL_FOULS],
  },
}

/** Orden en que se ofrecen las disciplinas al crear un torneo. */
export const SPORT_LIST: SportMeta[] = [
  SPORTS.football,
  SPORTS.micro,
  SPORTS.banquitas,
  SPORTS.basketball,
]

/** Metadatos de una disciplina, con fútbol como respaldo. */
export const sportOf = (key?: string | null): SportMeta =>
  (key && SPORTS[key]) || SPORTS.football

export const sportLabel = (key?: string | null): string => sportOf(key).label

/** True si la disciplina usa tarjeta azul (expulsión temporal). */
export const hasBlueCard = (key?: string | null): boolean =>
  sportOf(key).events.some((e) => e.type === 'AZUL')
