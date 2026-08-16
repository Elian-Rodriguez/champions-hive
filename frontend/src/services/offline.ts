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
export function enqueue(path: string, method: string, body: any) {
  const o = getOutbox()
  o.push({
    id: 'q_' + Date.now() + '_' + Math.random().toString(36).slice(2, 7),
    path,
    method,
    body,
    ts: Date.now(),
  })
  setOutbox(o)
  notifyOffline()
}

// ¿La mutación es de las que el árbitro hace en cancha y debe poder encolarse?
export function isQueueable(path: string, method: string): boolean {
  const m = method.toUpperCase()
  return (
    (m === 'POST' && path === '/matches/events') ||
    (m === 'PUT' && /^\/matches\/[^/]+\/status$/.test(path))
  )
}

// Aplica el efecto de la mutación al caché local para que la UI lo refleje al
// instante (optimista) aunque no haya red. Devuelve un resultado sintético.
export function applyOptimistic(path: string, _method: string, body: any): any {
  const id = 'tmp_' + Date.now() + '_' + Math.random().toString(36).slice(2, 7)

  if (path === '/matches/events' && body) {
    const evPath = `/matches/${body.match_id}/events`
    const list = cacheGet(evPath)
    const ev = { id, ...body, _pending: true }
    cacheSet(evPath, Array.isArray(list) ? [...list, ev] : [ev])
    return ev
  }

  const st = path.match(/^\/matches\/([^/]+)\/status$/)
  if (st && body) {
    patchMatchInCaches(st[1], {
      status: body.status,
      home_score: body.home_score,
      away_score: body.away_score,
    })
    return { id: st[1], ...body, _pending: true }
  }
  return { _pending: true }
}

// Actualiza el partido (por id) en cualquier lista cacheada que lo contenga
// (p. ej. los partidos de la fase que ve el árbitro).
function patchMatchInCaches(matchId: string, patch: Record<string, any>) {
  for (const key of Object.keys(localStorage)) {
    if (!key.startsWith(CACHE_PREFIX)) continue
    try {
      const val = JSON.parse(localStorage.getItem(key) || 'null')
      if (Array.isArray(val) && val.some((m: any) => m && m.id === matchId)) {
        cacheSetRaw(
          key,
          val.map((m: any) => (m && m.id === matchId ? { ...m, ...patch } : m)),
        )
      }
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
