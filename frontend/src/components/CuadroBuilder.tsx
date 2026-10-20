/**
 * El cuadro, armado a mano y arrastrando.
 *
 * Armar las eliminatorias era una fila de desplegables por cruce: «grupo A» +
 * «1» + vs + «grupo B» + «2», otra lista aparte para los byes, y tres botones
 * —sembrar, avanzar, resolver— cuya diferencia no se veía por ningún lado. El
 * organizador tenía que saber de memoria que un cuadro de seis necesita dos
 * cruces y dos byes, porque la única forma de enterarse era el 400 del
 * servidor, y nunca veía el árbol que estaba definiendo.
 *
 * Acá el cuadro se dibuja: las llaves de la primera ronda son casillas y los
 * clasificados son fichas que se arrastran (o se tocan, que en el celular es
 * lo que se puede hacer con una sola mano). Tres cosas que esto resuelve y la
 * pantalla anterior no:
 *
 * - **Se ve el árbol.** Las llaves van en el orden del cuadro y de a pares, el
 *   mismo par que después se enfrenta: así se nota que el 1.º y el 2.º quedaron
 *   en mitades distintas, que es justamente lo que una lista de cruces esconde.
 * - **El bye es una casilla vacía.** No una lista paralela: dejar un lado sin
 *   equipo ES pasar directo, y la llave lo dice con letras.
 * - **Las cuentas se revisan acá.** El botón de crear se habilita cuando el
 *   árbol cierra, y mientras no cierra la pantalla dice qué falta en lugar de
 *   dejar que el servidor responda un error.
 *
 * El plan (qué llave se juega y qué llave es bye, en el orden del cuadro) viaja
 * al backend, porque sin él el servidor reparte los byes por mérito y el cuadro
 * creado no es el que se dibujó.
 */
import { useEffect, useMemo, useState } from 'react'
import { api } from '../services/api'
import { Badge, Button, Icon, Select } from './ui'
import { useArrastreEntreZonas } from './dnd'
import StandingsTable from './StandingsTable'

// El grupo virtual de los repescados, tal como lo nombra el backend.
const REPESCA = '__best_thirds__'

/** De dónde sale un equipo del cuadro. */
type Fuente =
  | { tipo: 'pos'; grupo: string; pos: number }
  | { tipo: 'ganador'; partido: string }

/** Una llave de la primera ronda. Un lado vacío es un bye. */
type Llave = { local: Fuente | null; visita: Fuente | null }

type Lado = 'local' | 'visita'

/** Ficha del banco: la fuente más cómo se lee en pantalla. */
type Ficha = {
  f: Fuente
  titulo: string
  equipo: string | null
  clase: 'directo' | 'extra' | 'repesca' | 'ganador'
}

const clave = (f: Fuente) =>
  f.tipo === 'ganador' ? `w|${f.partido}` : `p|${f.grupo}|${f.pos}`

const mismaFuente = (a: Fuente | null, b: Fuente | null) =>
  !!a && !!b && clave(a) === clave(b)

/** La casilla que nombra un id de arrastre o una zona («c|2|visita»). */
function leerCasilla(id: string): { i: number; lado: Lado } | null {
  const [t, i, lado] = id.split('|')
  if (t !== 'c') return null
  return { i: Number(i), lado: lado as Lado }
}

const idCasilla = (i: number, lado: Lado) => `c|${i}|${lado}`

function esPotenciaDeDos(n: number) {
  return n >= 2 && (n & (n - 1)) === 0
}

function siguientePotencia(n: number) {
  let p = 1
  while (p < n) p *= 2
  return p
}

/**
 * Los números de siembra en el orden del cuadro: para 8 da
 * [1, 8, 4, 5, 2, 7, 3, 6].
 *
 * Es el mismo orden que usa el backend (`_orden_siembra`) y lo que hace que el
 * 1.º y el 2.º caigan en mitades distintas: sembrar por mérito y después cruzar
 * la llave 1 con la 2 dejaba al mejor contra el segundo en semifinales, o sea
 * el premio por salir primero duraba una ronda.
 */
function ordenSiembra(size: number): number[] {
  let orden = [1]
  while (orden.length < size) {
    const espejo = orden.length * 2 + 1
    orden = orden.flatMap((s) => [s, espejo - s])
  }
  return orden
}

function rotuloRonda(llaves: number): string {
  return llaves === 1
    ? 'Final'
    : llaves === 2
      ? 'Semifinales'
      : llaves === 4
        ? 'Cuartos de final'
        : llaves === 8
          ? 'Octavos de final'
          : llaves === 16
            ? 'Dieciseisavos'
            : `Ronda de ${llaves * 2}`
}

/** Los nombres de las rondas del cuadro, de la primera a la final. */
function cadenaDeRondas(llaves: number): string[] {
  const out: string[] = []
  for (let n = llaves; n >= 1; n = n / 2) out.push(rotuloRonda(n))
  return out
}

const vacia = (l: Llave) => !l.local && !l.visita
const completa = (l: Llave) => !!l.local && !!l.visita

/** Ajusta la cantidad de llaves conservando lo que ya estaba colocado. */
function redimensionar(llaves: Llave[], size: number): Llave[] {
  const n = size / 2
  const next = llaves.slice(0, n)
  while (next.length < n) next.push({ local: null, visita: null })
  return next
}

/**
 * Los clasificados en orden de siembra: primero todos los campeones de grupo
 * ordenados entre sí, después todos los segundos, y así.
 *
 * Es el orden de cualquier copa —ser primero de grupo vale más que ser el mejor
 * segundo— y es el que ya usaba el generador automático de esta pantalla.
 */
type Sembrado = { f: Fuente; grupo: string }

function sembradosPorMerito(
  standings: Record<string, any[]>,
  cupo: number,
): Sembrado[] {
  const conEquipos = Object.keys(standings).filter((g) => standings[g].length)
  // Una liga tiene una sola tabla («Sin Grupo») y entonces el orden de siembra
  // es el de la tabla; con grupos de verdad esa clave es un resto y se ignora.
  const grupos =
    conEquipos.length === 1 ? conEquipos : conEquipos.filter((g) => g !== 'Sin Grupo')
  const metrica = (r: any) => [r.league_points || 0, r.diff || 0, r.points_scored || 0]
  const cmp = (a: any, b: any) => {
    const ma = metrica(a.row)
    const mb = metrica(b.row)
    for (let i = 0; i < 3; i++) if (mb[i] !== ma[i]) return mb[i] - ma[i]
    return 0
  }
  const maxpos = Math.max(0, ...grupos.map((g) => standings[g].length))
  const out: Sembrado[] = []
  for (let pos = 1; pos <= maxpos; pos++) {
    const tramo = grupos
      .filter((g) => standings[g].length >= pos)
      .map((g) => ({ grupo: g, row: standings[g][pos - 1] }))
    tramo.sort(cmp)
    // La fila justo debajo del corte es la repesca, y esos cupos no son «el
    // tercero del grupo A» sino «el mejor tercero»: así los resuelve el
    // servidor y así la ficha se llama igual en el banco y en el cuadro —si no,
    // el mismo equipo aparecía dos veces con dos nombres distintos.
    const repesca = grupos.length > 1 && pos === cupo + 1
    out.push(
      ...tramo.map((t, j) => ({
        f: repesca
          ? ({ tipo: 'pos', grupo: REPESCA, pos: j + 1 } as Fuente)
          : ({ tipo: 'pos', grupo: t.grupo, pos } as Fuente),
        // El grupo del que sale, aunque la ficha sea un repescado: es lo que
        // permite no cruzar en primera ronda a dos que vienen del mismo grupo.
        grupo: t.grupo,
      })),
    )
  }
  return out
}

/** El cuadro sembrado por mérito, en el orden del árbol y con sus byes. */
function cuadroPorMerito(orden: Sembrado[], equipos: number): Llave[] {
  const size = siguientePotencia(equipos)
  const siembra = ordenSiembra(size)
  const pares: { local: Sembrado | null; visita: Sembrado | null }[] = []
  for (let i = 0; i < size; i += 2) {
    const mejor = Math.min(siembra[i], siembra[i + 1])
    const peor = Math.max(siembra[i], siembra[i + 1])
    pares.push({
      local: orden[mejor - 1] ?? null,
      // La casilla de enfrente quedó fuera del cupo: ese sembrado pasa directo.
      visita: peor > equipos ? null : (orden[peor - 1] ?? null),
    })
  }
  evitarReencuentros(pares)
  return pares.map((p) => ({ local: p.local?.f ?? null, visita: p.visita?.f ?? null }))
}

/**
 * Deshace los cruces de primera ronda entre dos equipos del mismo grupo.
 *
 * Dos que acaban de enfrentarse en la fase de grupos no deberían reencontrarse
 * en la primera llave: es regla estándar en cualquier copa y la siembra por
 * mérito sola no la garantiza. Se arregla intercambiando visitantes entre
 * llaves, que deja intacta la jerarquía de locales. Es el mismo criterio que
 * aplica el servidor en su vista previa (`_evitar_reencuentros`), y si no hay
 * intercambio posible se deja como está: el organizador puede arrastrar.
 */
function evitarReencuentros(
  pares: { local: Sembrado | null; visita: Sembrado | null }[],
): void {
  pares.forEach((par, i) => {
    if (!par.local || !par.visita || par.local.grupo !== par.visita.grupo) return
    for (let j = 0; j < pares.length; j++) {
      const otro = pares[j]
      if (j === i || !otro.local || !otro.visita) continue
      // El intercambio solo sirve si deja limpias a las dos llaves.
      if (
        par.local.grupo !== otro.visita.grupo &&
        otro.local.grupo !== par.visita.grupo
      ) {
        const tmp = par.visita
        par.visita = otro.visita
        otro.visita = tmp
        return
      }
    }
  })
}

// --------------------------------------------------------------------------- //
//  La pestaña
// --------------------------------------------------------------------------- //
export default function CuadroTab({ tournament }: { tournament: any }) {
  const [stages, setStages] = useState<any[]>([])
  const [sourceId, setSourceId] = useState('')
  const [targetId, setTargetId] = useState('')
  const [standings, setStandings] = useState<Record<string, any[]>>({})
  const [clasif, setClasif] = useState<any>(null)
  const [repescados, setRepescados] = useState<any[]>([])
  const [partidosFuente, setPartidosFuente] = useState<any[]>([])
  const [llaves, setLlaves] = useState<Llave[]>([])
  const [tercerPuesto, setTercerPuesto] = useState(true)
  const [verTabla, setVerTabla] = useState(false)
  const [verTodas, setVerTodas] = useState(false)
  const [msg, setMsg] = useState<string | null>(null)
  const [err, setErr] = useState<string | null>(null)
  const [trabajando, setTrabajando] = useState(false)

  const destino = stages.find((s) => s.id === targetId)
  const esLlave = !destino || destino.type === 'knockout'
  const cupo = Math.max(1, Number(clasif?.qualifiers_per_group) || 2)

  async function cargarFases() {
    const st = await api.getStages(tournament.id)
    setStages(st)
    return st
  }

  useEffect(() => {
    cargarFases().then((st: any[]) => {
      // Lo normal es grupos → eliminatorias, así que se eligen solas: el
      // organizador abre la pestaña con el tablero listo en vez de con dos
      // desplegables vacíos.
      const origen = st.find((s) => s.type === 'group') || st.find((s) => s.type !== 'knockout')
      const llave = st.find((s) => s.type === 'knockout')
      if (origen) setSourceId(origen.id)
      if (llave) setTargetId(llave.id)
    })
  }, [tournament.id])

  // Los partidos de las eliminatorias ya creadas: cualquiera puede alimentar
  // una llave («juega el ganador de…»), que es lo que hace de un repechaje un
  // partido de verdad y no un ranking en papel.
  useEffect(() => {
    const llaves = stages.filter((s) => s.type === 'knockout' && s.id !== targetId)
    if (!llaves.length) return setPartidosFuente([])
    Promise.all(
      llaves.map((s) =>
        api
          .stageMatches(s.id)
          .then((ms: any[]) => ms.map((m) => ({ ...m, stage_name: s.name })))
          .catch(() => []),
      ),
    ).then((listas) => setPartidosFuente(listas.flat()))
  }, [stages, targetId])

  useEffect(() => {
    if (!sourceId) return
    setStandings({})
    setClasif(null)
    setRepescados([])
    api.standingsByGroup(sourceId).then(setStandings).catch(() => setStandings({}))
    api.qualifiers(sourceId).then(setClasif).catch(() => setClasif(null))
    api
      .bestThirds(sourceId, 8)
      .then((r) => setRepescados(r.all_thirds || r.best_thirds || []))
      .catch(() => setRepescados([]))
  }, [sourceId])

  const rotuloPartido = (m: any) =>
    `${m.stage_name}: ${m.home_team_name || 'Por definir'} vs ${
      m.away_team_name || 'Por definir'
    }`

  const grupos = useMemo(
    () => Object.keys(standings).sort(),
    [standings],
  )

  /** Todas las fichas posibles, clasifiquen o no: el cuadro se arma a mano. */
  const fichas = useMemo<Ficha[]>(() => {
    const out: Ficha[] = []
    for (const g of grupos) {
      standings[g].forEach((row: any, i: number) => {
        out.push({
          f: { tipo: 'pos', grupo: g, pos: i + 1 },
          titulo:
            g === 'Sin Grupo' ? `${i + 1}º de la tabla` : `${i + 1}º Grupo ${g}`,
          equipo: row.team_name || null,
          clase: i < cupo ? 'directo' : 'extra',
        })
      })
    }
    // Solo los repescados que el sistema de la fase hace entrar: el tercero de
    // un grupo ya está en el banco como «3º Grupo A», y ofrecer dos fichas del
    // mismo equipo con nombres distintos es la clase de ayuda que confunde.
    repescados.slice(0, Number(clasif?.extras_needed) || 0).forEach((r: any, i: number) => {
      out.push({
        f: { tipo: 'pos', grupo: REPESCA, pos: i + 1 },
        titulo: `Repescado ${i + 1}`,
        equipo: r.team_name || null,
        clase: 'repesca',
      })
    })
    // El ganador de un partido solo se puede sembrar en un cuadro: `advance`
    // crea partidos con equipos, no casillas que se resuelven después.
    if (esLlave) {
      partidosFuente.forEach((m: any) => {
        out.push({
          f: { tipo: 'ganador', partido: m.id },
          titulo: 'Ganador de',
          equipo: rotuloPartido(m),
          clase: 'ganador',
        })
      })
    }
    return out
  }, [grupos, standings, repescados, partidosFuente, cupo, esLlave, clasif])

  const fichaDe = (f: Fuente | null): Ficha | null =>
    f ? fichas.find((x) => clave(x.f) === clave(f)) || null : null

  const etiqueta = (f: Fuente | null): string => {
    const fi = fichaDe(f)
    if (!fi) return 'Por definir'
    return fi.clase === 'ganador' ? `Ganador de ${fi.equipo}` : fi.titulo
  }

  const colocadas = useMemo(() => {
    const s = new Set<string>()
    for (const l of llaves) {
      if (l.local) s.add(clave(l.local))
      if (l.visita) s.add(clave(l.visita))
    }
    return s
  }, [llaves])

  const banco = fichas.filter(
    (x) =>
      !colocadas.has(clave(x.f)) && (verTodas || x.clase !== 'extra'),
  )

  // ------------------------------------------------------------------- //
  //  Arrastrar y tocar
  // ------------------------------------------------------------------- //
  const [elegida, setElegida] = useState<string | null>(null)

  function colocar(f: Fuente, i: number, lado: Lado) {
    setLlaves((prev) => {
      const next = prev.map((l) => ({ ...l }))
      // La misma ficha no puede estar en dos casillas: si venía de otra, se va
      // de allí (y lo que había en el destino vuelve al banco, que es derivado).
      next.forEach((l) => {
        if (mismaFuente(l.local, f)) l.local = null
        if (mismaFuente(l.visita, f)) l.visita = null
      })
      next[i][lado] = f
      return next
    })
  }

  function mover(desde: { i: number; lado: Lado }, hasta: { i: number; lado: Lado } | null) {
    setLlaves((prev) => {
      const next = prev.map((l) => ({ ...l }))
      const f = next[desde.i][desde.lado]
      next[desde.i][desde.lado] = null
      if (hasta) {
        // Intercambio: lo que estaba en el destino cae en la casilla liberada.
        next[desde.i][desde.lado] = next[hasta.i][hasta.lado]
        next[hasta.i][hasta.lado] = f
      }
      return next
    })
  }

  const { idArrastrado, zonaActiva, iniciar, fantasma } = useArrastreEntreZonas(
    (id, zona) => {
      if (id === zona) return
      const desde = leerCasilla(id)
      const hasta = leerCasilla(zona)
      if (desde) return mover(desde, hasta)
      if (!hasta) return
      const f = fichas.find((x) => `f|${clave(x.f)}` === id)?.f
      if (f) colocar(f, hasta.i, hasta.lado)
    },
  )

  /** Tocar: una ficha (o una casilla ocupada) y después la casilla destino. */
  function tocarCasilla(i: number, lado: Lado) {
    const actual = llaves[i][lado]
    if (!elegida) {
      if (actual) setElegida(idCasilla(i, lado))
      return
    }
    const desde = leerCasilla(elegida)
    if (desde) {
      if (desde.i === i && desde.lado === lado) return setElegida(null)
      mover(desde, { i, lado })
    } else {
      const f = fichas.find((x) => `f|${clave(x.f)}` === elegida)?.f
      if (f) colocar(f, i, lado)
    }
    setElegida(null)
  }

  function quitar(i: number, lado: Lado) {
    setLlaves((prev) => {
      const next = prev.map((l) => ({ ...l }))
      next[i][lado] = null
      return next
    })
  }

  // ------------------------------------------------------------------- //
  //  El cuadro
  // ------------------------------------------------------------------- //
  const equipos = llaves.reduce(
    (a, l) => a + (l.local ? 1 : 0) + (l.visita ? 1 : 0),
    0,
  )
  const cruces = llaves.filter(completa).length
  const byes = llaves.filter((l) => !vacia(l) && !completa(l)).length
  const size = llaves.length * 2

  /** Lo que falta para que el árbol cierre, en el orden en que conviene leerlo. */
  const problemas = useMemo<string[]>(() => {
    const out: string[] = []
    if (!llaves.length) return ['Elige el tamaño del cuadro para empezar.']
    const huecos = llaves.map((l, i) => (vacia(l) ? i + 1 : 0)).filter(Boolean)
    if (huecos.length)
      out.push(
        `La llave ${huecos.join(', ')} está vacía: arrástrale un equipo o achica el cuadro.`,
      )
    if (!cruces)
      out.push('Al menos una llave tiene que tener dos equipos; si no, nadie juega.')
    if (esLlave && cruces && !huecos.length && siguientePotencia(equipos) !== size)
      out.push(`Con ${equipos} equipos el cuadro no cierra en ${size}.`)
    if (!esLlave && byes)
      out.push(
        `«${destino?.name}» no es una fase de eliminación: cada cruce necesita sus dos equipos.`,
      )
    if (!esLlave && llaves.some((l) => l.local?.tipo === 'ganador' || l.visita?.tipo === 'ganador'))
      out.push(
        `«${destino?.name}» no es una fase de eliminación: no puede esperar al ganador de otro partido, necesita equipos.`,
      )
    return out
  }, [llaves, cruces, byes, equipos, size, esLlave, destino])

  const listo = !!sourceId && !!targetId && problemas.length === 0

  function lado(f: Fuente, prefijo: 'home' | 'away') {
    if (f.tipo === 'ganador') return { [`${prefijo}_winner_of`]: f.partido }
    return { [`${prefijo}_group`]: f.grupo, [`${prefijo}_position`]: f.pos }
  }

  async function crear() {
    setMsg(null)
    setErr(null)
    setTrabajando(true)
    try {
      if (esLlave) {
        const r = await api.seedBracket(targetId, {
          source_stage_id: sourceId,
          third_place: tercerPuesto,
          // El plan dice en qué llave espera cada bye. Sin él el servidor los
          // reparte por mérito y el cuadro creado no es el que se dibujó.
          plan: llaves.map((l) => (completa(l) ? 'match' : 'bye')),
          round1: llaves
            .filter(completa)
            .map((l) => ({ ...lado(l.local!, 'home'), ...lado(l.visita!, 'away') })),
          byes: llaves
            .filter((l) => !vacia(l) && !completa(l))
            .map((l) => {
              const f = (l.local || l.visita)!
              return f.tipo === 'ganador'
                ? { winner_of: f.partido }
                : { group: f.grupo, position: f.pos }
            }),
        })
        setMsg(r.message)
        // Si los grupos ya terminaron, los nombres entran en el acto: dejar el
        // cuadro con «Por definir» cuando los equipos se conocen no sirve.
        const resuelto = await api.resolveSlots(targetId).catch(() => null)
        if (resuelto?.resolved_positions) setMsg(`${r.message}. ${resuelto.message}`)
      } else {
        const r = await api.advance(sourceId, {
          next_stage_id: targetId,
          pairings: llaves.filter(completa).map((l) => ({
            h_group: (l.local as any).grupo,
            h_pos: (l.local as any).pos,
            a_group: (l.visita as any).grupo,
            a_pos: (l.visita as any).pos,
          })),
        })
        setMsg(r.message)
      }
      await cargarFases()
    } catch (e: any) {
      setErr(e.message)
    } finally {
      setTrabajando(false)
    }
  }

  function sembrar() {
    const orden = sembradosPorMerito(standings, cupo)
    // Si ya eligió un tamaño, manda el suyo; si no, el que sale del sistema de
    // clasificación de la fase origen.
    const objetivo = size || Number(clasif?.bracket_size) || orden.length
    const n = Math.min(objetivo, orden.length)
    if (n < 2) {
      setErr('No hay clasificados suficientes para sembrar el cuadro.')
      return
    }
    setErr(null)
    setLlaves(cuadroPorMerito(orden, n))
  }

  async function crearFaseDestino() {
    setErr(null)
    try {
      const nueva = await api.createStage(tournament.id, {
        name: 'Eliminatorias',
        type: 'knockout',
      })
      await cargarFases()
      setTargetId(nueva.id)
    } catch (e: any) {
      setErr(e.message)
    }
  }

  const sinGrupos = grupos.filter((g) => g !== 'Sin Grupo').length === 0

  return (
    <div className="space-y-5">
      {/* ---- Paso 1 y 2: de dónde salen y dónde se juegan ---- */}
      <div className="grid gap-3 sm:grid-cols-2">
        <Paso n={1} titulo="¿De dónde salen los clasificados?">
          <Select value={sourceId} onChange={(e) => setSourceId(e.target.value)}>
            <option value="">Elige una fase…</option>
            {stages
              .filter((s) => s.type !== 'knockout')
              .map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
          </Select>
          {sourceId && (
            <p className="mt-1.5 text-xs text-on-surface-variant">
              {sinGrupos
                ? 'Una sola tabla: las fichas son las posiciones de la general.'
                : `${grupos.length} grupo(s) · pasan ${cupo} por grupo${
                    clasif?.extras_needed ? ` + ${clasif.extras_needed} repescado(s)` : ''
                  }.`}
            </p>
          )}
        </Paso>
        <Paso n={2} titulo="¿Dónde se juega el cuadro?">
          <div className="flex gap-2">
            <Select value={targetId} onChange={(e) => setTargetId(e.target.value)}>
              <option value="">Elige una fase…</option>
              {stages
                .filter((s) => s.id !== sourceId)
                .map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
            </Select>
            {!stages.some((s) => s.type === 'knockout') && (
              <Button variant="outline" className="shrink-0" onClick={crearFaseDestino}>
                <Icon name="add" /> Crear
              </Button>
            )}
          </div>
          {targetId && (
            <p className="mt-1.5 text-xs text-on-surface-variant">
              {esLlave
                ? 'Se arma el árbol completo: esta ronda, las siguientes y la final.'
                : 'No es eliminación directa: se crean los partidos de los cruces, sin árbol.'}
            </p>
          )}
        </Paso>
      </div>

      {!sourceId || !targetId ? (
        <p className="rounded-xl border border-outline-variant/50 bg-surface-container-low px-4 py-6 text-center text-sm text-on-surface-variant">
          Elige las dos fases y acá aparece el tablero para armar los cruces.
        </p>
      ) : (
        <>
          {/* ---- Paso 3: el tablero ---- */}
          <div className="rounded-xl border border-outline-variant/50 bg-surface-container-low p-3">
            <div className="mb-3 flex flex-wrap items-end justify-between gap-2">
              <p className="headline flex items-center gap-2 text-base tracking-[0.08em]">
                <span className="relative grid h-6 w-6 shrink-0 place-items-center">
                  <span className="clip-hex absolute inset-0 bg-volt-soft" />
                  <span className="tnum relative text-xs font-bold text-secondary">3</span>
                </span>
                Arma los cruces
              </p>
              <div className="flex flex-wrap items-center gap-2">
                <label className="flex items-center gap-1.5 text-xs text-on-surface-variant">
                  Cuadro de
                  <Select
                    value={String(size || '')}
                    onChange={(e) =>
                      setLlaves((prev) => redimensionar(prev, Number(e.target.value)))
                    }
                    className="w-24"
                  >
                    <option value="">—</option>
                    {[2, 4, 8, 16, 32].map((n) => (
                      <option key={n} value={String(n)}>
                        {n} equipos
                      </option>
                    ))}
                  </Select>
                </label>
                <Button variant="outline" onClick={sembrar} disabled={!fichas.length}>
                  <Icon name="auto_awesome" /> Sembrar por mérito
                </Button>
                {llaves.length > 0 && (
                  <Button
                    variant="ghost"
                    onClick={() => setLlaves(redimensionar([], size))}
                    title="Vaciar todas las casillas"
                  >
                    <Icon name="backspace" /> Vaciar
                  </Button>
                )}
              </div>
            </div>

            {llaves.length === 0 ? (
              <p className="px-2 py-6 text-center text-sm text-on-surface-variant">
                Elige el tamaño del cuadro, o toca <strong>Sembrar por mérito</strong> y
                después acomoda a mano lo que quieras cambiar.
              </p>
            ) : (
              <div className="grid gap-4 lg:grid-cols-[minmax(0,15rem)_minmax(0,1fr)]">
                {/* Banco de clasificados */}
                <div
                  data-zona="banco"
                  className={`rounded-xl border-2 border-dashed p-2.5 transition ${
                    zonaActiva === 'banco'
                      ? 'border-secondary bg-secondary/10'
                      : idArrastrado
                        ? 'border-outline-variant bg-surface-container-high/60'
                        : 'border-transparent bg-surface-container-high'
                  }`}
                >
                  <p className="mb-2 flex items-center justify-between text-[11px] font-semibold uppercase tracking-[0.14em] text-on-surface-variant">
                    <span>Clasificados</span>
                    <span className="tnum font-bold normal-case tracking-normal">
                      {banco.length}
                    </span>
                  </p>
                  <div className="flex flex-wrap gap-1.5 lg:flex-col lg:items-stretch">
                    {banco.map((x) => (
                      <FichaChip
                        key={clave(x.f)}
                        ficha={x}
                        elegida={elegida === `f|${clave(x.f)}`}
                        arrastrada={idArrastrado === `f|${clave(x.f)}`}
                        onTocar={() =>
                          setElegida((prev) =>
                            prev === `f|${clave(x.f)}` ? null : `f|${clave(x.f)}`,
                          )
                        }
                        iniciar={iniciar(`f|${clave(x.f)}`, x.titulo)}
                      />
                    ))}
                    {banco.length === 0 && (
                      <p className="text-xs text-on-surface-variant/70">
                        {idArrastrado ? 'Suelta acá para quitarlo del cuadro' : 'Todos colocados'}
                      </p>
                    )}
                  </div>
                  {fichas.some((x) => x.clase === 'extra') && (
                    <button
                      type="button"
                      onClick={() => setVerTodas((v) => !v)}
                      className="mt-2 text-[11px] text-secondary underline-offset-2 hover:underline"
                    >
                      {verTodas ? 'Ver solo los clasificados' : 'Ver todas las posiciones'}
                    </button>
                  )}
                  <p className="mt-2 flex items-start gap-1 text-[11px] leading-snug text-on-surface-variant">
                    <Icon name="drag_indicator" className="text-sm" />
                    Arrastra una ficha a una casilla, o tócala y después toca la casilla.
                  </p>
                </div>

                {/* El árbol */}
                <div className="overflow-x-auto pb-2">
                  <div className="bk">
                    <div className="bk-round">
                      <div className="bk-round-head">{rotuloRonda(llaves.length)}</div>
                      <div className="bk-pairs">
                        {Array.from({ length: Math.ceil(llaves.length / 2) }).map((_, pi) => (
                          <div
                            key={pi}
                            className={`bk-pair ${llaves.length < 2 ? 'bk-solo' : ''}`}
                          >
                            {[pi * 2, pi * 2 + 1]
                              .filter((i) => i < llaves.length)
                              .map((i) => (
                                <div key={i} className="bk-cell">
                                  <LlaveCard
                                    n={i + 1}
                                    llave={llaves[i]}
                                    etiqueta={etiqueta}
                                    ficha={fichaDe}
                                    esLlave={esLlave}
                                    elegida={elegida}
                                    idArrastrado={idArrastrado}
                                    zonaActiva={zonaActiva}
                                    iniciar={iniciar}
                                    onTocar={(lado) => tocarCasilla(i, lado)}
                                    onQuitar={(lado) => quitar(i, lado)}
                                  />
                                </div>
                              ))}
                          </div>
                        ))}
                      </div>
                    </div>
                    {/* Las rondas que el cuadro va a crear solo. Sirve para ver
                        que el 1.º y el 2.º quedaron en mitades distintas, que es
                        lo que una lista de cruces esconde. */}
                    {esLlave && llaves.length > 1 && (
                      <div className="bk-round bk-final">
                        <div className="bk-round-head">Después</div>
                        <div className="bk-pairs">
                          {Array.from({ length: Math.ceil(llaves.length / 2) }).map((_, pi) => (
                            <div key={pi} className="bk-pair bk-solo">
                              <div className="bk-cell">
                                <div className="rounded-xl border border-dashed border-outline-variant/60 bg-surface-container/60 p-2.5 text-xs text-on-surface-variant">
                                  {[pi * 2, pi * 2 + 1]
                                    .filter((i) => i < llaves.length)
                                    .map((i) => (
                                      <p key={i} className="truncate">
                                        {completa(llaves[i])
                                          ? `Ganador llave ${i + 1}`
                                          : etiqueta(llaves[i].local || llaves[i].visita)}
                                      </p>
                                    ))}
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                  {esLlave && llaves.length > 1 && (
                    <p className="mt-1 text-[11px] text-on-surface-variant">
                      {cadenaDeRondas(llaves.length).join(' → ')}
                      {tercerPuesto ? ' (+ 3er puesto)' : ''}
                    </p>
                  )}
                </div>
              </div>
            )}
            {fantasma}
          </div>

          {/* ---- Estado del cuadro y creación ---- */}
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2 text-xs text-on-surface-variant">
              <Badge className="tnum bg-surface-container-highest text-on-surface-variant">
                {`${equipos} equipos`}
              </Badge>
              <Badge className="tnum bg-surface-container-highest text-on-surface-variant">
                {`${cruces} cruce(s)`}
              </Badge>
              {esLlave && (
                <Badge
                  className={`tnum ${
                    byes
                      ? 'bg-secondary/15 text-secondary'
                      : 'bg-surface-container-highest text-on-surface-variant'
                  }`}
                >
                  {`${byes} pasa(n) directo`}
                </Badge>
              )}
              {esPotenciaDeDos(equipos) && !byes && <span>el cuadro cierra exacto</span>}
            </div>

            {problemas.map((p) => (
              <p
                key={p}
                className="flex items-start gap-1.5 rounded-lg bg-tertiary/10 px-3 py-2 text-xs text-tertiary"
              >
                <Icon name="info" className="text-base" /> {p}
              </p>
            ))}

            {esLlave && (
              <label className="flex items-center gap-2 text-sm text-on-surface-variant">
                <input
                  type="checkbox"
                  checked={tercerPuesto}
                  onChange={(e) => setTercerPuesto(e.target.checked)}
                  className="h-4 w-4 accent-secondary"
                />
                Incluir partido por el 3er puesto
              </label>
            )}

            <div className="flex flex-wrap items-center gap-2">
              <Button onClick={crear} disabled={!listo || trabajando}>
                <Icon name="account_tree" />{' '}
                {trabajando
                  ? 'Creando…'
                  : esLlave
                    ? 'Crear el cuadro'
                    : 'Crear los partidos'}
              </Button>
              <Button
                variant="ghost"
                onClick={async () => {
                  setErr(null)
                  try {
                    const r = await api.resolveSlots(targetId)
                    setMsg(r.message)
                  } catch (e: any) {
                    setErr(e.message)
                  }
                }}
                title="Vuelve a leer las posiciones y los ganadores y llena las casillas pendientes"
              >
                <Icon name="sync" /> Actualizar con los resultados
              </Button>
              {Object.keys(standings).length > 0 && (
                <button
                  type="button"
                  onClick={() => setVerTabla((v) => !v)}
                  className="ml-auto text-xs text-secondary underline-offset-2 hover:underline"
                >
                  {verTabla ? 'Ocultar posiciones' : 'Ver posiciones de la fase origen'}
                </button>
              )}
            </div>

            {esLlave && (
              <p className="text-[11px] leading-relaxed text-on-surface-variant">
                Crear el cuadro <strong>reemplaza</strong> los partidos que tenga la fase
                destino. Las casillas se llenan con los equipos cuando la fase origen
                termine; hasta entonces el cuadro muestra «Por definir».
              </p>
            )}

            {msg && (
              <p className="rounded-lg bg-secondary/10 px-3 py-2 text-sm text-secondary">
                {msg}
              </p>
            )}
            {err && (
              <p className="rounded-lg bg-error-container/30 px-3 py-2 text-sm text-error">
                {err}
              </p>
            )}
          </div>

          {verTabla && (
            <div className="space-y-3 rounded-xl bg-surface-container-low p-3">
              {Object.entries(standings).map(([g, rows]) => (
                <div key={g}>
                  <h4 className="mb-1 font-display text-sm font-bold">
                    {g === 'Sin Grupo' ? 'Tabla general' : `Grupo ${g}`}
                  </h4>
                  <StandingsTable rows={rows} sport={tournament?.sport_type} />
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  )
}

// --------------------------------------------------------------------------- //
//  Piezas
// --------------------------------------------------------------------------- //
function Paso({
  n,
  titulo,
  children,
}: {
  n: number
  titulo: string
  children: React.ReactNode
}) {
  return (
    <div className="rounded-xl border border-outline-variant/50 bg-surface-container-low p-3">
      <p className="mb-2 flex items-center gap-2 text-sm font-semibold text-on-surface">
        <span className="relative grid h-6 w-6 shrink-0 place-items-center">
          <span className="clip-hex absolute inset-0 bg-volt-soft" />
          <span className="tnum relative text-xs font-bold text-secondary">{n}</span>
        </span>
        {titulo}
      </p>
      {children}
    </div>
  )
}

const TONO: Record<Ficha['clase'], string> = {
  directo: 'border-secondary/50 bg-secondary/10 text-on-surface',
  extra: 'border-outline-variant bg-surface-container-lowest text-on-surface-variant',
  repesca: 'border-tertiary/50 bg-tertiary/10 text-on-surface',
  ganador: 'border-outline-variant bg-surface-container-lowest text-on-surface',
}

function FichaChip({
  ficha,
  elegida,
  arrastrada,
  onTocar,
  iniciar,
}: {
  ficha: Ficha
  elegida: boolean
  arrastrada: boolean
  onTocar: () => void
  iniciar: (e: React.PointerEvent) => void
}) {
  return (
    <span
      onPointerDown={(e) => {
        // Con mouse se agarra desde cualquier punto de la ficha; con el dedo
        // solo desde el asa, para no bloquear el scroll de la lista.
        if (e.pointerType === 'mouse') iniciar(e)
      }}
      className={`inline-flex select-none items-center gap-1.5 rounded-lg border px-2 py-1 text-left text-xs transition ${
        TONO[ficha.clase]
      } ${arrastrada ? 'opacity-40' : ''} ${
        elegida ? 'ring-2 ring-secondary' : ''
      }`}
    >
      <button
        type="button"
        aria-label={`Arrastrar ${ficha.titulo}`}
        onPointerDown={(e) => {
          e.stopPropagation()
          iniciar(e)
        }}
        style={{ touchAction: 'none' }}
        className="cursor-grab text-on-surface-variant active:cursor-grabbing"
      >
        <Icon name="drag_indicator" className="text-sm" />
      </button>
      <button type="button" onClick={onTocar} className="min-w-0 flex-1 text-left">
        <span className="block truncate font-semibold">{ficha.titulo}</span>
        {ficha.equipo && (
          <span className="block truncate text-[10px] opacity-80">{ficha.equipo}</span>
        )}
      </button>
    </span>
  )
}

function LlaveCard({
  n,
  llave,
  etiqueta,
  ficha,
  esLlave,
  elegida,
  idArrastrado,
  zonaActiva,
  iniciar,
  onTocar,
  onQuitar,
}: {
  n: number
  llave: Llave
  etiqueta: (f: Fuente | null) => string
  ficha: (f: Fuente | null) => Ficha | null
  esLlave: boolean
  elegida: string | null
  idArrastrado: string | null
  zonaActiva: string | null
  iniciar: (id: string, etiqueta: React.ReactNode) => (e: React.PointerEvent) => void
  onTocar: (lado: Lado) => void
  onQuitar: (lado: Lado) => void
}) {
  const pasaDirecto = esLlave && !vacia(llave) && !completa(llave)
  return (
    <div
      className={`rounded-xl border bg-surface-container-high p-2.5 transition ${
        vacia(llave)
          ? 'border-dashed border-outline-variant/60'
          : pasaDirecto
            ? 'border-secondary/40'
            : 'border-outline-variant/50'
      }`}
    >
      <p className="mb-1 flex items-center justify-between gap-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-on-surface-variant">
        <span>
          {esLlave ? 'Llave' : 'Cruce'} <span className="tnum">{n}</span>
        </span>
        {pasaDirecto && (
          <span className="text-secondary">Pasa directo</span>
        )}
      </p>
      <div className="space-y-1">
        {(['local', 'visita'] as Lado[]).map((lado) => (
          <Casilla
            key={lado}
            id={`c|${n - 1}|${lado}`}
            f={llave[lado]}
            etiqueta={etiqueta}
            ficha={ficha}
            elegida={elegida}
            idArrastrado={idArrastrado}
            zonaActiva={zonaActiva}
            iniciar={iniciar}
            onTocar={() => onTocar(lado)}
            onQuitar={() => onQuitar(lado)}
          />
        ))}
      </div>
    </div>
  )
}

function Casilla({
  id,
  f,
  etiqueta,
  ficha,
  elegida,
  idArrastrado,
  zonaActiva,
  iniciar,
  onTocar,
  onQuitar,
}: {
  id: string
  f: Fuente | null
  etiqueta: (f: Fuente | null) => string
  ficha: (f: Fuente | null) => Ficha | null
  elegida: string | null
  idArrastrado: string | null
  zonaActiva: string | null
  iniciar: (id: string, etiqueta: React.ReactNode) => (e: React.PointerEvent) => void
  onTocar: () => void
  onQuitar: () => void
}) {
  const fi = ficha(f)
  const activa = zonaActiva === id
  return (
    <div
      data-zona={id}
      onPointerDown={(e) => {
        if (f && e.pointerType === 'mouse') iniciar(id, etiqueta(f))(e)
      }}
      className={`flex min-h-[2.25rem] select-none items-center gap-1.5 rounded-lg border px-2 py-1 transition ${
        activa
          ? 'border-secondary bg-secondary/15'
          : f
            ? 'border-outline-variant/50 bg-surface-container-lowest'
            : `border-dashed ${
                idArrastrado || elegida
                  ? 'border-secondary/60 bg-secondary/5'
                  : 'border-outline-variant/60'
              }`
      } ${idArrastrado === id ? 'opacity-40' : ''} ${
        elegida === id ? 'ring-2 ring-secondary' : ''
      }`}
    >
      {f ? (
        <>
          <button
            type="button"
            aria-label={`Mover ${etiqueta(f)}`}
            onPointerDown={(e) => {
              e.stopPropagation()
              iniciar(id, etiqueta(f))(e)
            }}
            style={{ touchAction: 'none' }}
            className="cursor-grab text-on-surface-variant active:cursor-grabbing"
          >
            <Icon name="drag_indicator" className="text-sm" />
          </button>
          <button type="button" onClick={onTocar} className="min-w-0 flex-1 text-left">
            <span className="block truncate text-xs font-semibold">{etiqueta(f)}</span>
            {fi?.equipo && fi.clase !== 'ganador' && (
              <span className="block truncate text-[10px] text-on-surface-variant">
                {fi.equipo}
              </span>
            )}
          </button>
          <button
            type="button"
            aria-label="Quitar del cuadro"
            onClick={onQuitar}
            className="shrink-0 text-error/70 transition hover:text-error"
          >
            <Icon name="close" className="text-sm" />
          </button>
        </>
      ) : (
        <button
          type="button"
          onClick={onTocar}
          className="w-full text-left text-[11px] text-on-surface-variant/70"
        >
          {elegida ? 'Toca para colocar acá' : 'Vacío · pasa directo'}
        </button>
      )}
    </div>
  )
}
