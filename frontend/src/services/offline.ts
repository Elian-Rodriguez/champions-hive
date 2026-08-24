// Capa offline-first para el árbitro: cachea las respuestas GET (partidos,
// planteles, eventos del día) y encola las mutaciones (goles, tarjetas, cambios,
// marcador) cuando no hay red, sincronizándolas al reconectar.

const CACHE_PREFIX = 'ch_cache:'
const OUTBOX_KEY = 'ch_outbox'

export type OutboxItem = {
  id: string
  path: string
  method: string
  body: any
  ts: number
}

// ---- estado de conexión / suscripción ----
const listeners = new Set<() => void>()
export function subscribeOffline(fn: () => void): () => void {
  listeners.add(fn)
  return () => listeners.delete(fn)
}
export function notifyOffline() {
  listeners.forEach((fn) => fn())
}
export function isOnline(): boolean {
  return typeof navigator === 'undefined' ? true : navigator.onLine
}

// ---- caché de GET ----
export function cacheGet(path: string): any {
  try {
    const v = localStorage.getItem(CACHE_PREFIX + path)
    return v == null ? undefined : JSON.parse(v)
  } catch {
    return undefined
  }
}
export function cacheSet(path: string, data: any) {
  try {
    localStorage.setItem(CACHE_PREFIX + path, JSON.stringify(data))
  } catch {
    /* cuota llena: ignorar */
  }
}
/** Borra la copia local de un recurso: se usa cuando el servidor deja de
 *  entregarlo (el organizador dejó de publicar la sección, o ya no existe). */
export function cacheDelete(path: string) {
  try {
    localStorage.removeItem(CACHE_PREFIX + path)
  } catch {
    /* nada que borrar */
  }
}

// ---- bandeja de salida (outbox) ----
export function getOutbox(): OutboxItem[] {
  try {
    return JSON.parse(localStorage.getItem(OUTBOX_KEY) || '[]')
  } catch {
    return []
  }
}
function setOutbox(arr: OutboxItem[]) {
  localStorage.setItem(OUTBOX_KEY, JSON.stringify(arr))
}
export function pendingCount(): number {
  return getOutbox().length
}
export function shiftOutbox() {
  const o = getOutbox()
  o.shift()
  setOutbox(o)
  notifyOffline()
}
/** Encola una mutación y devuelve su id, que es también el id provisional del
 *  objeto optimista: así, corregir o borrar algo que todavía no salió de la
 *  cola es encontrar su envío pendiente. */
export function enqueue(path: string, method: string, body: any): string {
  const o = getOutbox()
  const id = 'tmp_' + Date.now() + '_' + Math.random().toString(36).slice(2, 7)
  o.push({ id, path, method, body, ts: Date.now() })
  setOutbox(o)
  notifyOffline()
  return id
}

/** Corrige un evento que sigue en la cola: se toca el envío pendiente, no el
 *  servidor, que todavía no sabe que existe. `event_data` se mezcla, igual que
 *  hace el backend. */
export function patchQueuedEvent(tempId: string, cambios: any): boolean {
  const o = getOutbox()
  const item = o.find((x) => x.id === tempId && x.path === '/matches/events')
  if (!item) return false
  const detalle = { ...(item.body?.event_data || {}), ...(cambios?.event_data || {}) }
  item.body = { ...item.body, ...cambios, event_data: detalle }
  setOutbox(o)
  notifyOffline()
  return true
}

/** Borra un evento que sigue en la cola: cancelar el envío es todo lo que hay
 *  que hacer. */
export function dropQueuedEvent(tempId: string): boolean {
  const o = getOutbox()
  const idx = o.findIndex((x) => x.id === tempId && x.path === '/matches/events')
  if (idx === -1) return false
  o.splice(idx, 1)
  setOutbox(o)
  notifyOffline()
  return true
}

// ¿La mutación es de las que el árbitro hace en cancha y debe poder encolarse?
export function isQueueable(path: string, method: string): boolean {
  const m = method.toUpperCase()
  return (
    (m === 'POST' && path === '/matches/events') ||
    ((m === 'PUT' || m === 'DELETE') && /^\/matches\/events\/[^/]+$/.test(path)) ||
    (m === 'PUT' && /^\/matches\/[^/]+\/status$/.test(path)) ||
    (m === 'PUT' && /^\/matches\/[^/]+\/lineup$/.test(path))
  )
}

// Aplica el efecto de la mutación al caché local para que la UI lo refleje al
// instante (optimista) aunque no haya red. Devuelve un resultado sintético.
export function applyOptimistic(
  path: string,
  method: string,
  body: any,
  tempId?: string,
): any {
  const id = tempId || 'tmp_' + Date.now() + '_' + Math.random().toString(36).slice(2, 7)

  if (path === '/matches/events' && body) {
    const evPath = `/matches/${body.match_id}/events`
    const list = cacheGet(evPath)
    const ev = { id, ...body, _pending: true }
    cacheSet(evPath, Array.isArray(list) ? [...list, ev] : [ev])
    return ev
  }

  // Corregir o borrar un evento: el registro en vivo tiene que reflejarlo aunque
  // el árbitro esté sin señal en media cancha.
  const corr = path.match(/^\/matches\/events\/([^/]+)$/)
  if (corr) {
    const eventId = corr[1]
    if (method.toUpperCase() === 'DELETE') {
      patchInCaches(eventId, null)
      return null
    }
    patchInCaches(eventId, (prev: any) => ({
      ...prev,
      ...body,
      // Mezcla, como el backend: corregir el minuto no borra el equipo.
      event_data: { ...(prev.event_data || {}), ...(body?.event_data || {}) },
      _pending: true,
    }))
    return { id: eventId, ...body, _pending: true }
  }

  const st = path.match(/^\/matches\/([^/]+)\/status$/)
  if (st && body) {
    // `walkover` solo se toca si vino en el cuerpo, igual que hace el backend
    // con exclude_unset: guardar el marcador de un partido no puede borrarle
    // la marca de W.O. a la copia local.
    const parche: Record<string, any> = {
      status: body.status,
      home_score: body.home_score,
      away_score: body.away_score,
    }
    if ('walkover' in body) parche.walkover = body.walkover
    patchInCaches(st[1], parche)
    return { id: st[1], ...body, _pending: true }
  }

  // Planilla: reemplaza la del equipo en la copia local y deja la del rival
  // como estaba, igual que hace el servidor.
  const lu = path.match(/^\/matches\/([^/]+)\/lineup$/)
  if (lu && body) {
    const luPath = `/matches/${lu[1]}/lineup`
    const previa = cacheGet(luPath)
    const otros = Array.isArray(previa)
      ? previa.filter((f: any) => String(f.team_id) !== String(body.team_id))
      : []
    const filas = (body.players || []).map((p: any, i: number) => ({
      id: `${id}_${i}`,
      match_id: lu[1],
      team_id: body.team_id,
      is_starter: true,
      is_captain: false,
      number: null,
      ...p,
      _pending: true,
    }))
    cacheSet(luPath, [...otros, ...filas])
    return filas
  }
  return { _pending: true }
}

// Actualiza un objeto (por id) en cualquier lista cacheada que lo contenga: los
// partidos de la fase que ve el árbitro, los eventos del partido abierto.
// `patch` puede ser los campos a mezclar, una función (prev) => siguiente, o
// `null` para sacarlo de la lista.
function patchInCaches(
  id: string,
  patch: Record<string, any> | ((prev: any) => any) | null,
) {
  for (const key of Object.keys(localStorage)) {
    if (!key.startsWith(CACHE_PREFIX)) continue
    try {
      const val = JSON.parse(localStorage.getItem(key) || 'null')
      if (!Array.isArray(val) || !val.some((x: any) => x && x.id === id)) continue
      cacheSetRaw(
        key,
        patch === null
          ? val.filter((x: any) => !x || x.id !== id)
          : val.map((x: any) =>
              x && x.id === id
                ? typeof patch === 'function'
                  ? patch(x)
                  : { ...x, ...patch }
                : x,
            ),
      )
    } catch {
      /* ignorar entradas no-JSON */
    }
  }
}
function cacheSetRaw(fullKey: string, data: any) {
  try {
    localStorage.setItem(fullKey, JSON.stringify(data))
  } catch {
    /* ignorar */
  }
}
