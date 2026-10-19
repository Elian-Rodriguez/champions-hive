/**
 * Catálogo de disciplinas: etiquetas, identidad visual, jugadas que suman al
 * marcador, eventos disciplinarios que puede cargar el árbitro y columnas de
 * disciplina de las tablas públicas.
 * Es la única fuente de verdad del front — para sumar un deporte basta con
 * agregar una entrada aquí (y el valor equivalente en SportType del backend).
 */

export type DisciplineEvent = {
  type: string
  label: string
  short: string
  color: string
}

/** Jugada que suma al marcador. En casi todas las disciplinas es una sola —el
 *  gol, que vale 1 y el árbitro repite— y en tejo son cuatro que valen
 *  distinto, que es lo que lo hace una disciplina aparte. */
export type ScoreEvent = {
  type: string
  label: string
  short: string
  /** Cuánto suma al marcador. */
  points: number
  icon: string
  /** Qué es la jugada, para el que nunca cargó un partido de esto. */
  hint?: string
}

export type DiscColumn = { key: string; label: string; title: string }

export type SportMeta = {
  value: string
  label: string
  icon: string
  grad: string
  ring: string
  /** Color de acento de la disciplina (clase de texto). */
  accent: string
  /** Cómo se llama la unidad del marcador (goles / puntos). */
  scoreLabel: string
  /** Si el empate es un resultado posible. En las disciplinas que se juegan a
   *  un tanteo (baloncesto, tejo) no lo es, y una columna «E» llena de ceros
   *  es ruido en la tabla. */
  drawsPossible: boolean
  /** Cómo se llama el cuadro de los que anotan. «Goleadores» en un torneo de
   *  tejo es de otro deporte. */
  scorersLabel: string
  /** Cómo se llama el cuadro del que menos recibe. Un cajón de tejo no tiene
   *  valla que vencer. */
  defenseLabel: string
  /** Jugadas que mueven el marcador, en el orden en que se ofrecen. */
  scoreEvents: ScoreEvent[]
  /** Eventos disciplinarios disponibles en el panel del árbitro. */
  events: DisciplineEvent[]
  /** Columnas de disciplina en las tablas públicas. */
  discColumns: DiscColumn[]
  /** Marcador [a favor, en contra] que fija el reglamento en un W.O. Es el
   *  mismo que pone el backend; aquí está para que el árbitro sin señal vea el
   *  número correcto sin esperar la respuesta del servidor. */
  walkoverScore: [number, number]
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

/** El gol de toda la vida: una jugada, un punto. */
const GOL: ScoreEvent = { type: 'GOL', label: 'Gol', short: 'GOL', points: 1, icon: 'sports_soccer' }

export const SPORTS: Record<string, SportMeta> = {
  football: {
    value: 'football',
    label: 'Fútbol',
    icon: 'sports_soccer',
    grad: 'from-volt/30 via-volt/8 to-transparent',
    ring: 'text-volt',
    accent: 'text-volt',
    scoreLabel: 'Goles',
    drawsPossible: true,
    scorersLabel: 'Goleadores',
    defenseLabel: 'Valla menos vencida',
    scoreEvents: [GOL],
    events: [AMARILLA, ROJA],
    discColumns: [COL_YELLOW, COL_RED],
    walkoverScore: [3, 0],
  },
  micro: {
    value: 'micro',
    label: 'Microfútbol',
    icon: 'sports_soccer',
    grad: 'from-ice/30 via-ice/8 to-transparent',
    ring: 'text-ice',
    accent: 'text-ice',
    scoreLabel: 'Goles',
    drawsPossible: true,
    scorersLabel: 'Goleadores',
    defenseLabel: 'Valla menos vencida',
    scoreEvents: [GOL],
    events: [AMARILLA, AZUL, ROJA],
    discColumns: [COL_YELLOW, COL_BLUE, COL_RED],
    walkoverScore: [3, 0],
  },
  basketball: {
    value: 'basketball',
    label: 'Baloncesto',
    icon: 'sports_basketball',
    grad: 'from-flare/30 via-flare/8 to-transparent',
    ring: 'text-flare',
    accent: 'text-flare',
    scoreLabel: 'Puntos',
    drawsPossible: false,
    scorersLabel: 'Anotadores',
    defenseLabel: 'Mejor defensa',
    scoreEvents: [
      { type: 'GOL', label: 'Punto', short: 'PT', points: 1, icon: 'sports_basketball' },
    ],
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
    // Como en FIBA: el que no se presenta pierde 20-0.
    walkoverScore: [20, 0],
  },
  // Banquitas: fútbol de canchas pequeñas, partidos cortos por tiempo. Puntúa
  // como fútbol (3/1/0, con empate) y el árbitro lleva tarjetas —incluida la
  // azul de expulsión temporal— además del conteo de faltas.
  banquitas: {
    value: 'banquitas',
    label: 'Banquitas',
    icon: 'sports_soccer',
    grad: 'from-plasma/30 via-plasma/8 to-transparent',
    ring: 'text-plasma',
    accent: 'text-plasma',
    scoreLabel: 'Goles',
    drawsPossible: true,
    scorersLabel: 'Goleadores',
    defenseLabel: 'Valla menos vencida',
    scoreEvents: [GOL],
    events: [AMARILLA, AZUL, ROJA, FALTA],
    discColumns: [COL_YELLOW, COL_BLUE, COL_RED, COL_FOULS],
    walkoverScore: [3, 0],
  },
  // Tejo: no se juega por tiempo sino a 21 puntos, y el marcador no se mueve
  // de a uno. Las cuatro jugadas valen distinto y son la razón de que el panel
  // del árbitro no pueda tener un solo botón de «gol»: la mano es el tejo más
  // cerca del bocín, la mecha es el fulminante que revienta, la embocinada es
  // el tejo dentro del bocín y la moñona es las dos cosas en el mismo tiro.
  tejo: {
    value: 'tejo',
    label: 'Tejo',
    icon: 'track_changes',
    grad: 'from-ember/30 via-ember/8 to-transparent',
    ring: 'text-ember',
    accent: 'text-ember',
    scoreLabel: 'Puntos',
    drawsPossible: false,
    scorersLabel: 'Anotadores',
    defenseLabel: 'Menos puntos recibidos',
    scoreEvents: [
      {
        type: 'MANO',
        label: 'Mano',
        short: 'MAN',
        points: 1,
        icon: 'adjust',
        hint: 'El tejo más cerca del bocín',
      },
      {
        type: 'MECHA',
        label: 'Mecha',
        short: 'MEC',
        points: 3,
        icon: 'local_fire_department',
        hint: 'Revienta el fulminante',
      },
      {
        type: 'EMBOCINADA',
        label: 'Embocinada',
        short: 'EMB',
        points: 6,
        icon: 'radio_button_checked',
        hint: 'El tejo queda dentro del bocín',
      },
      {
        type: 'MOÑONA',
        label: 'Moñona',
        short: 'MOÑ',
        points: 9,
        icon: 'auto_awesome',
        hint: 'Mecha y bocín en el mismo tiro',
      },
    ],
    // En tejo no hay tarjetas: lo que se anota es la falta de línea.
    events: [FALTA],
    discColumns: [COL_FOULS],
    // La partida se juega a 21, así que ese es el marcador del que no llegó.
    walkoverScore: [21, 0],
  },
}

/** Orden en que se ofrecen las disciplinas al crear un torneo. */
export const SPORT_LIST: SportMeta[] = [
  SPORTS.football,
  SPORTS.micro,
  SPORTS.banquitas,
  SPORTS.basketball,
  SPORTS.tejo,
]

/** Metadatos de una disciplina, con fútbol como respaldo. */
export const sportOf = (key?: string | null): SportMeta =>
  (key && SPORTS[key]) || SPORTS.football

export const sportLabel = (key?: string | null): string => sportOf(key).label

/** True si la disciplina usa tarjeta azul (expulsión temporal). */
export const hasBlueCard = (key?: string | null): boolean =>
  sportOf(key).events.some((e) => e.type === 'AZUL')

/** Cuánto suma al marcador cada jugada, mirando todas las disciplinas. Espeja
 *  PUNTOS_POR_EVENTO del backend: el evento se guarda con su tipo y el valor
 *  lo pone esta tabla, para que corregir un evento mueva el marcador lo que
 *  de verdad vale. */
export const PUNTOS_POR_EVENTO: Record<string, number> = {
  GOL: 1,
  GOAL: 1,
  ...Object.fromEntries(
    Object.values(SPORTS).flatMap((s) => s.scoreEvents.map((e) => [e.type, e.points])),
  ),
}

/** Lo que suma al marcador un evento cargado; 0 si no es de anotación. */
export const puntosDelEvento = (type?: string | null): number =>
  PUNTOS_POR_EVENTO[(type || '').toUpperCase()] || 0

/** True si el evento mueve el marcador (gol, mano, mecha, moñona…). */
export const esAnotacion = (type?: string | null): boolean => puntosDelEvento(type) > 0

/** Marcador [local, visitante] de un W.O. según quién no se presentó.
 *  Con `both` no llegó nadie: 0-0, y la tabla lo cuenta como derrota de los dos. */
export function marcadorWalkover(
  sport: string | null | undefined,
  ausente: 'home' | 'away' | 'both',
): [number, number] {
  const [aFavor, enContra] = sportOf(sport).walkoverScore
  if (ausente === 'both') return [0, 0]
  return ausente === 'home' ? [enContra, aFavor] : [aFavor, enContra]
}
