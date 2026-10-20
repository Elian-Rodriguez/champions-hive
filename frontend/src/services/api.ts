import {
  applyOptimistic,
  cacheDelete,
  cacheGet,
  cacheSet,
  dropQueuedEvent,
  enqueue,
  getOutbox,
  isOnline,
  isQueueable,
  notifyOffline,
  patchQueuedEvent,
  shiftOutbox,
} from './offline'

const API_URL = import.meta.env.VITE_API_URL || '/api/v1'

/** Desde qué fase cuentan las estadísticas (goleadores, valla, juego limpio).
 *  `mode: 'from'` suma esa fase y las posteriores; `'only'` solo esa fase.
 *  Sin `stageId` cuentan todas las fases del torneo. */
export type StatScope = { stageId?: string | null; mode?: 'from' | 'only' }

function scopeQuery(scope?: StatScope): string {
  if (!scope?.stageId) return ''
  return `?stage_id=${encodeURIComponent(scope.stageId)}&mode=${scope.mode || 'from'}`
}

function authHeaders(): Record<string, string> {
  const token = localStorage.getItem('token')
  return token ? { Authorization: `Bearer ${token}` } : {}
}

async function rawReq(path: string, options: RequestInit = {}): Promise<any> {
  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...authHeaders(),
      ...(options.headers || {}),
    },
  })
  if (res.status === 401 && localStorage.getItem('token')) {
    // Sesión expirada o token inválido: limpiar y volver al inicio de sesión.
    localStorage.removeItem('token')
    localStorage.removeItem('role')
    localStorage.removeItem('username')
    localStorage.removeItem('mustChangePassword')
    if (typeof window !== 'undefined') window.location.reload()
    throw new Error('Tu sesión expiró. Vuelve a iniciar sesión.')
  }
  if (!res.ok) {
    let detail: any = res.statusText
    try {
      const body = await res.json()
      detail = body.detail ?? detail
    } catch {
      /* respuesta sin cuerpo JSON */
    }
    throw new Error(typeof detail === 'string' ? detail : JSON.stringify(detail))
  }
  if (res.status === 204) return null
  return res.json()
}

// Envoltura offline-first: cachea los GET y encola las mutaciones del árbitro
// (goles, tarjetas, cambios, marcador) cuando no hay red.
async function req(path: string, options: RequestInit = {}): Promise<any> {
  const method = (options.method || 'GET').toUpperCase()

  if (method === 'GET') {
    if (!isOnline()) {
      const cached = cacheGet(path)
      if (cached !== undefined) return cached
    }
    try {
      const data = await rawReq(path, options)
      cacheSet(path, data)
      return data
    } catch (e) {
      // La caché solo cubre fallas de red (fetch lanza TypeError). Un error
      // del servidor es una respuesta legítima y debe propagarse: si el
      // organizador dejó de publicar una sección, devolver la copia vieja
      // seguiría mostrando datos que ya no son públicos.
      if (e instanceof TypeError) {
        const cached = cacheGet(path)
        if (cached !== undefined) return cached
      }
      cacheDelete(path)
      throw e
    }
  }

  if (isQueueable(path, method)) {
    const body = options.body ? JSON.parse(options.body as string) : null

    // Un evento cargado sin red todavía no existe en el servidor: corregirlo o
    // borrarlo es tocar su envío pendiente, no mandar un id que allá no está.
    const pendiente = path.match(/^\/matches\/events\/(tmp_[^/]+)$/)
    if (pendiente) {
      const tempId = pendiente[1]
      const enCola =
        method === 'DELETE' ? dropQueuedEvent(tempId) : patchQueuedEvent(tempId, body)
      // Si ya no está en la cola es que se envió: ahora tiene id del servidor y
      // este tmp_ no existe en ningún lado. Avisar es mejor que fingir que se
      // guardó y que el próximo refresco lo revierta.
      if (!enCola)
        throw new Error('El evento ya se sincronizó; actualiza el registro e inténtalo de nuevo.')
      return applyOptimistic(path, method, body)
    }

    if (!isOnline()) {
      const tempId = enqueue(path, method, body)
      return applyOptimistic(path, method, body, tempId)
    }
    try {
      return await rawReq(path, options)
    } catch (e) {
      if (e instanceof TypeError) {
        // Error de red: encolar para no perder la acción del árbitro.
        const tempId = enqueue(path, method, body)
        return applyOptimistic(path, method, body, tempId)
      }
      throw e
    }
  }

  return rawReq(path, options)
}

// Reenvía la cola pendiente al servidor, en orden, al recuperar la conexión.
let _flushing = false
export async function syncOutbox(): Promise<void> {
  if (_flushing || !isOnline()) return
  _flushing = true
  try {
    while (getOutbox().length) {
      const item = getOutbox()[0]
      try {
        await rawReq(item.path, {
          method: item.method,
          ...(item.body == null ? {} : { body: JSON.stringify(item.body) }),
        })
      } catch (e) {
        if (e instanceof TypeError) break // se cayó la red otra vez: reintentar luego
        // rechazo del servidor (4xx): descartar el item para no bloquear la cola
      }
      shiftOutbox()
    }
    notifyOffline()
  } finally {
    _flushing = false
  }
}

if (typeof window !== 'undefined') {
  window.addEventListener('online', () => {
    notifyOffline()
    syncOutbox()
  })
  window.addEventListener('offline', () => notifyOffline())
  syncOutbox() // por si quedó cola de una sesión anterior
}


/**
 * URL absoluta de un archivo servido por el backend (hoy, los clips).
 *
 * El backend devuelve rutas relativas («/api/v1/media/jugadas/x.webm»), que es
 * lo correcto: en la imagen combinada el frontend y el API comparten origen y
 * esa ruta resuelve sola. Pero cuando el backend vive en otro host —el
 * servidor de desarrollo de Vite, o un despliegue con el API en su propio
 * dominio— el navegador la resuelve contra la PÁGINA, y ahí el servidor de la
 * SPA responde su index.html con un 200: el `<video>` recibe HTML donde
 * esperaba video y falla con un error que no dice nada.
 *
 * Así que la ruta relativa se ancla al origen de VITE_API_URL, que es el único
 * que sabe dónde está de verdad el archivo.
 */
export function mediaUrl(url?: string | null): string | null {
  if (!url) return null
  if (/^(https?:|blob:|data:)/i.test(url)) return url
  try {
    const base = new URL(API_URL, window.location.origin)
    return new URL(url, base.origin).toString()
  } catch {
    return url
  }
}

/** Campos de una jugada destacada al subirla. */
export type JugadaCampos = {
  play_type?: string | null
  title?: string | null
  match_id?: string | null
  team_id?: string | null
  player_id?: string | null
  minute?: number | null
  duration_seconds?: number | null
  poster_url?: string | null
  published?: boolean
}

/**
 * Sube un clip de «mejores jugadas».
 *
 * Va por XMLHttpRequest y no por fetch por una sola razón: fetch no informa
 * del progreso de SUBIDA, y aquí se están mandando decenas de megabytes desde
 * un teléfono con datos móviles en una tribuna. Sin barra de progreso la
 * pantalla parece colgada y la gente cierra la aplicación a medio subir.
 *
 * Tampoco pasa por la cola offline: un clip de 20 MB en el almacenamiento del
 * navegador es cómo se corrompe la cola del árbitro entera. Si no hay red,
 * esto falla y lo dice (ver isQueueable en services/offline.ts, que es una
 * lista blanca y no incluye esta ruta).
 */
export function subirJugada(
  tournamentId: string,
  archivo: File,
  campos: JugadaCampos = {},
  onProgreso?: (fraccion: number) => void,
): Promise<any> {
  return new Promise((resolve, reject) => {
    if (!isOnline()) {
      reject(
        new Error(
          'Subir un video necesita conexión. Guarda el clip y súbelo cuando tengas señal.',
        ),
      )
      return
    }
    const form = new FormData()
    form.append('file', archivo, archivo.name)
    Object.entries(campos).forEach(([clave, valor]) => {
      if (valor === null || valor === undefined || valor === '') return
      form.append(clave, typeof valor === 'boolean' ? String(valor) : String(valor))
    })

    const xhr = new XMLHttpRequest()
    xhr.open('POST', `${API_URL}/tournaments/${tournamentId}/highlights`)
    const token = localStorage.getItem('token')
    if (token) xhr.setRequestHeader('Authorization', `Bearer ${token}`)
    // El Content-Type NO se pone: lo escribe el navegador con el separador
    // del multipart, y ponerlo a mano rompe el cuerpo.

    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) onProgreso?.(e.loaded / e.total)
    }
    xhr.onload = () => {
      let cuerpo: any = null
      try {
        cuerpo = JSON.parse(xhr.responseText)
      } catch {
        /* respuesta sin JSON */
      }
      if (xhr.status >= 200 && xhr.status < 300) {
        onProgreso?.(1)
        resolve(cuerpo)
        return
      }
      if (xhr.status === 401 && localStorage.getItem('token')) {
        localStorage.removeItem('token')
        localStorage.removeItem('role')
        if (typeof window !== 'undefined') window.location.reload()
      }
      const detalle = cuerpo?.detail
      reject(
        new Error(
          typeof detalle === 'string'
            ? detalle
            : detalle
              ? JSON.stringify(detalle)
              : 'No se pudo subir el clip.',
        ),
      )
    }
    xhr.onerror = () =>
      reject(new Error('Se cortó la conexión mientras subía el clip.'))
    xhr.onabort = () => reject(new Error('Subida cancelada.'))
    xhr.send(form)
  })
}

export const api = {
  // ---- Auth ----
  async login(email: string, password: string) {
    const body = new URLSearchParams({ username: email, password })
    const res = await fetch(`${API_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body,
    })
    if (!res.ok) {
      const j = await res.json().catch(() => ({}))
      throw new Error(j.detail || 'Credenciales inválidas')
    }
    return res.json()
  },
  register: (data: any) =>
    req('/auth/register', { method: 'POST', body: JSON.stringify(data) }),
  /** Cuentas que el solicitante gestiona: todas si es superadmin, las que creó
   *  si es organizador. */
  listUsers: () => req('/auth/users'),
  /** Perfil propio, con el cupo de campeonatos y cuántos lleva usados. */
  me: () => req('/auth/me'),
  listRoles: () => req('/auth/roles'),
  updateUser: (id: string, data: any) =>
    req(`/auth/users/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  /** Reseteo de soporte: devuelve la contraseña temporal una sola vez. */
  resetUserPassword: (id: string, new_password?: string) =>
    req(`/auth/users/${id}/reset_password`, {
      method: 'POST',
      body: JSON.stringify(new_password ? { new_password } : {}),
    }),
  /** Árbitros asignables. A diferencia de listUsers, la puede llamar un admin. */
  listReferees: () => req('/auth/referees'),
  deleteUser: (id: string) => req(`/auth/users/${id}`, { method: 'DELETE' }),
  changePassword: (current_password: string, new_password: string) =>
    req('/auth/change_password', {
      method: 'POST',
      body: JSON.stringify({ current_password, new_password }),
    }),
  /** Pide el enlace de recuperación. Responde lo mismo exista o no la cuenta,
   *  así que el frontend nunca sabe (ni muestra) si el correo está registrado. */
  forgotPassword: (email: string) =>
    req('/auth/forgot_password', { method: 'POST', body: JSON.stringify({ email }) }),
  /** Canjea el enlace del correo por una contraseña nueva. */
  resetPasswordWithToken: (token: string, new_password: string) =>
    req('/auth/reset_password_confirm', {
      method: 'POST',
      body: JSON.stringify({ token, new_password }),
    }),
  /** Historial de la plataforma (altas, reseteos, recuperaciones). Superadmin. */
  platformAudit: (limit = 200) => req(`/auth/audit?limit=${limit}`),

  // ---- Capitanes del equipo ----
  teamManagers: (teamId: string) => req(`/teams/${teamId}/managers`),
  addTeamManager: (teamId: string, data: any) =>
    req(`/teams/${teamId}/managers`, { method: 'POST', body: JSON.stringify(data) }),
  removeTeamManager: (teamId: string, userId: string) =>
    req(`/teams/${teamId}/managers/${userId}`, { method: 'DELETE' }),

  // ---- Notificaciones ----
  notifications: (unreadOnly = false) =>
    req(`/notifications${unreadOnly ? '?unread_only=true' : ''}`),
  unreadCount: () => req('/notifications/unread_count'),
  markNotificationRead: (id: string) =>
    req(`/notifications/${id}/read`, { method: 'POST' }),
  markAllNotificationsRead: () => req('/notifications/read_all', { method: 'POST' }),
  deleteNotification: (id: string) => req(`/notifications/${id}`, { method: 'DELETE' }),
  /** Aviso manual del organizador a los capitanes de un torneo. */
  broadcast: (tid: string, data: any) =>
    req(`/notifications/broadcast/${tid}`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  // ---- Panel del capitán ----
  captainTeams: () => req('/captain/teams'),
  captainMatches: (teamId?: string) =>
    req(`/captain/matches${teamId ? `?team_id=${teamId}` : ''}`),
  /** Las mejores jugadas de los partidos del capitán: las de su equipo y las
   *  del partido que jugó (incluido el gol del rival, que `is_mine` distingue).
   *  Un campeonato cuyo organizador apagó el interruptor se cae de la lista en
   *  vez de responder 403, porque la consulta cruza todos sus campeonatos. */
  captainHighlights: (teamId?: string) =>
    req(`/captain/highlights${teamId ? `?team_id=${teamId}` : ''}`),
  captainSummary: (teamId: string, tournamentId?: string) =>
    req(
      `/captain/teams/${teamId}/summary${
        tournamentId ? `?tournament_id=${tournamentId}` : ''
      }`,
    ),

  // ---- Tournaments ----
  getTournaments: () => req('/tournaments'),
  dashboard: () => req('/tournaments/dashboard'),
  getTournament: (id: string) => req(`/tournaments/${id}`),
  createTournament: (data: any) =>
    req('/tournaments', { method: 'POST', body: JSON.stringify(data) }),
  updateTournament: (id: string, data: any) =>
    req(`/tournaments/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  updateStatus: (id: string, status: string) =>
    req(`/tournaments/${id}/status`, {
      method: 'PUT',
      body: JSON.stringify({ status }),
    }),
  renameTournament: (id: string, name: string) =>
    req(`/tournaments/${id}/rename`, {
      method: 'PUT',
      body: JSON.stringify({ name }),
    }),
  deleteTournament: (id: string) =>
    req(`/tournaments/${id}`, { method: 'DELETE' }),
  resetAll: () => req('/tournaments/reset_all', { method: 'DELETE' }),
  getTiebreakerOptions: () => req('/tournaments/tiebreaker_options'),
  tournamentStats: (id: string) => req(`/tournaments/${id}/stats`),
  playerStats: (id: string, scope?: StatScope) =>
    req(`/tournaments/${id}/player_stats${scopeQuery(scope)}`),
  teamStats: (id: string, scope?: StatScope) =>
    req(`/tournaments/${id}/team_stats${scopeQuery(scope)}`),
  metrics: (id: string) => req(`/tournaments/${id}/metrics`),
  fairplay: (id: string, scope?: StatScope) =>
    req(`/tournaments/${id}/fairplay${scopeQuery(scope)}`),
  valla: (id: string, scope?: StatScope) =>
    req(`/tournaments/${id}/valla${scopeQuery(scope)}`),
  updateLogo: (id: string, url: string) =>
    req(`/tournaments/${id}/logo`, { method: 'PUT', body: JSON.stringify({ url }) }),
  updateBanner: (id: string, url: string) =>
    req(`/tournaments/${id}/banner`, {
      method: 'PUT',
      body: JSON.stringify({ url }),
    }),
  scheduleCalendar: (id: string, data: any) =>
    req(`/tournaments/${id}/schedule`, {
      method: 'POST',
      body: JSON.stringify(data || {}),
    }),
  /** Cruces del calendario: cancha ocupada, equipo o árbitro duplicado, llave
   *  antes de su clasificatorio, poco descanso y partidos sin fecha o cancha. */
  /** Suspendidos por tarjetas y quién está a una de estarlo. Con el reglamento
   *  disciplinario apagado devuelve `enabled: false` y listas vacías. */
  tournamentDiscipline: (id: string) => req(`/tournaments/${id}/discipline`),
  /** Historial del campeonato: quién cambió qué y qué decía antes. */
  tournamentAudit: (
    id: string,
    opts?: { matchId?: string | null; action?: string | null; limit?: number },
  ) => {
    const q = new URLSearchParams()
    if (opts?.matchId) q.set('match_id', opts.matchId)
    if (opts?.action) q.set('action', opts.action)
    q.set('limit', String(opts?.limit ?? 200))
    return req(`/tournaments/${id}/audit?${q.toString()}`)
  },
  scheduleConflicts: (id: string, minRestMinutes?: number) =>
    req(
      `/tournaments/${id}/schedule_conflicts${
        minRestMinutes != null ? `?min_rest_minutes=${minRestMinutes}` : ''
      }`,
    ),

  // ---- Sponsors ----
  getSponsors: (tid: string) => req(`/tournaments/${tid}/sponsors`),
  createSponsor: (tid: string, data: any) =>
    req(`/tournaments/${tid}/sponsors`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  deleteSponsor: (tid: string, sponsorId: string) =>
    req(`/tournaments/${tid}/sponsors/${sponsorId}`, { method: 'DELETE' }),
  updateSponsor: (tid: string, sponsorId: string, data: any) =>
    req(`/tournaments/${tid}/sponsors/${sponsorId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  // ---- Photos ----
  getPhotos: (tid: string) => req(`/tournaments/${tid}/photos`),
  addPhoto: (tid: string, data: any) =>
    req(`/tournaments/${tid}/photos`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  deletePhoto: (tid: string, photoId: string) =>
    req(`/tournaments/${tid}/photos/${photoId}`, { method: 'DELETE' }),
  updatePhoto: (tid: string, photoId: string, data: any) =>
    req(`/tournaments/${tid}/photos/${photoId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  // ---- Mejores jugadas ----
  /** Tope de MB por clip y si el espejo en Contentful está encendido. */
  highlightsConfig: () => req('/highlights/config'),
  /** Jugadas destacadas de la disciplina del torneo. El front ya las tiene en
   *  sports.ts; esto es para que la API se explique sola y para no duplicar la
   *  verdad si mañana se configuran por torneo. */
  highlightPlays: (tid: string) => req(`/tournaments/${tid}/highlight_plays`),
  /** El reel. `includeUnpublished` solo lo atiende el dueño del torneo. */
  highlights: (
    tid: string,
    opts?: { matchId?: string | null; playType?: string | null; includeUnpublished?: boolean },
  ) => {
    const q = new URLSearchParams()
    if (opts?.matchId) q.set('match_id', opts.matchId)
    if (opts?.playType) q.set('play_type', opts.playType)
    if (opts?.includeUnpublished) q.set('include_unpublished', 'true')
    const cola = q.toString()
    return req(`/tournaments/${tid}/highlights${cola ? `?${cola}` : ''}`)
  },
  /** Jugada que vive fuera (YouTube, Instagram): se guarda el enlace. */
  linkHighlight: (tid: string, data: any) =>
    req(`/tournaments/${tid}/highlights/link`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  updateHighlight: (id: string, data: any) =>
    req(`/highlights/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteHighlight: (id: string) => req(`/highlights/${id}`, { method: 'DELETE' }),
  /** Reintenta el espejo en Contentful de una jugada ya subida. */
  mirrorHighlight: (id: string) =>
    req(`/highlights/${id}/mirror`, { method: 'POST' }),

  // ---- Stages / fixtures / brackets ----
  getStages: (tid: string) => req(`/tournaments/${tid}/stages`),
  createStage: (tid: string, data: any) =>
    req(`/tournaments/${tid}/stages`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  updateStage: (sid: string, data: any) =>
    req(`/tournaments/stages/${sid}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
  reorderStages: (tid: string, stageIds: string[]) =>
    req(`/tournaments/${tid}/stages/reorder`, {
      method: 'POST',
      body: JSON.stringify({ stage_ids: stageIds }),
    }),
  deleteStage: (sid: string) =>
    req(`/tournaments/stages/${sid}`, { method: 'DELETE' }),
  generateFixture: (sid: string) =>
    req(`/tournaments/stages/${sid}/generate_fixture`, { method: 'POST' }),
  swissRound: (sid: string) =>
    req(`/tournaments/stages/${sid}/swiss_round`, { method: 'POST' }),
  standingsByGroup: (sid: string) =>
    req(`/tournaments/stages/${sid}/standings_by_group`),
  stageMatches: (sid: string) => req(`/tournaments/stages/${sid}/matches`),
  bracketTree: (sid: string) => req(`/tournaments/stages/${sid}/bracket_tree`),
  seedBracket: (sid: string, data: any) =>
    req(`/tournaments/stages/${sid}/seed_bracket`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  advance: (sid: string, data: any) =>
    req(`/tournaments/stages/${sid}/advance`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  resolveSlots: (sid: string) =>
    req(`/tournaments/stages/${sid}/resolve_position_slots`, { method: 'POST' }),
  bestThirds: (sid: string, count = 4) =>
    req(`/tournaments/stages/${sid}/best_thirds?count=${count}`),
  qualifiers: (sid: string) => req(`/tournaments/stages/${sid}/qualifiers`),
  bracketPreview: (sid: string) => req(`/tournaments/stages/${sid}/bracket_preview`),
  qualificationPresets: () => req('/tournaments/qualification_presets'),

  // ---- Teams & players ----
  getTeams: (tid: string) => req(`/tournaments/${tid}/teams`),
  addTeam: (tid: string, data: any) =>
    req(`/tournaments/${tid}/teams`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  /** Sanción de puntos del reglamento: negativa descuenta, positiva bonifica.
   *  Con 0 se quita (y se borra el motivo). */
  updateTeamPointsAdjustment: (
    tid: string,
    teamId: string,
    points_adjustment: number,
    points_adjustment_reason?: string | null,
  ) =>
    req(`/tournaments/${tid}/teams/${teamId}/points_adjustment`, {
      method: 'PUT',
      body: JSON.stringify({ points_adjustment, points_adjustment_reason }),
    }),
  // `group_name: null` saca al equipo de todo grupo ("Sin grupo").
  updateTeamGroup: (tid: string, teamId: string, group_name: string | null) =>
    req(`/tournaments/${tid}/teams/${teamId}/group`, {
      method: 'PUT',
      body: JSON.stringify({ group_name }),
    }),
  /** Sorteo de grupos. `pots` son los bombos (el primero, los cabezas de
   *  serie): cada bombo se reparte uno por grupo, que es lo que impide que
   *  los candidatos caigan juntos. `keep_apart` son los que no pueden
   *  compartir grupo; si no hay forma, el servidor avisa y no bloquea. */
  shuffleGroups: (
    tid: string,
    num_groups: number,
    pots?: string[][] | null,
    keep_apart?: string[][] | null,
  ) =>
    req(`/tournaments/${tid}/teams/shuffle_groups`, {
      method: 'POST',
      body: JSON.stringify({
        num_groups,
        ...(pots?.length ? { pots } : {}),
        ...(keep_apart?.length ? { keep_apart } : {}),
      }),
    }),
  removeTeam: (tid: string, teamId: string) =>
    req(`/tournaments/${tid}/teams/${teamId}`, { method: 'DELETE' }),
  updateTeam: (teamId: string, data: any) =>
    req(`/teams/${teamId}`, { method: 'PUT', body: JSON.stringify(data) }),
  getPlayers: (teamId: string) => req(`/teams/${teamId}/players`),
  addPlayer: (teamId: string, data: any) =>
    req(`/teams/${teamId}/players`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  removePlayer: (teamId: string, playerId: string) =>
    req(`/teams/${teamId}/players/${playerId}`, { method: 'DELETE' }),
  updatePlayer: (teamId: string, playerId: string, data: any) =>
    req(`/teams/${teamId}/players/${playerId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  // ---- Venues & courts ----
  getVenues: () => req('/venues'),
  createVenue: (data: any) =>
    req('/venues', { method: 'POST', body: JSON.stringify(data) }),
  createCourt: (venueId: string, data: any) =>
    req(`/venues/${venueId}/courts`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  updateVenue: (venueId: string, data: any) =>
    req(`/venues/${venueId}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteVenue: (venueId: string) =>
    req(`/venues/${venueId}`, { method: 'DELETE' }),
  updateCourt: (courtId: string, data: any) =>
    req(`/venues/courts/${courtId}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteCourt: (courtId: string) =>
    req(`/venues/courts/${courtId}`, { method: 'DELETE' }),

  // ---- Matches & events ----
  listMatches: (query = '') => req(`/matches${query}`),
  scheduleMatch: (data: any) =>
    req('/matches/schedule', { method: 'POST', body: JSON.stringify(data) }),
  updateMatchSchedule: (matchId: string, data: any) =>
    req(`/matches/${matchId}/schedule`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
  updateMatchStatus: (matchId: string, data: any) =>
    req(`/matches/${matchId}/status`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
  matchEvents: (matchId: string) => req(`/matches/${matchId}/events`),
  /** Planilla del partido: quiénes jugaron, de los dos equipos. */
  matchLineup: (matchId: string) => req(`/matches/${matchId}/lineup`),
  /** Reemplaza la planilla de UN equipo. Se encola si no hay red: el delegado
   *  entrega la lista en la cancha, que es donde no hay señal. */
  setMatchLineup: (matchId: string, teamId: string, players: any[]) =>
    req(`/matches/${matchId}/lineup`, {
      method: 'PUT',
      body: JSON.stringify({ team_id: teamId, players }),
    }),
  recordEvent: (data: any) =>
    req('/matches/events', { method: 'POST', body: JSON.stringify(data) }),
  updateEvent: (eventId: string, data: any) =>
    req(`/matches/events/${eventId}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteEvent: (eventId: string) =>
    req(`/matches/events/${eventId}`, { method: 'DELETE' }),
  standings: (data: any) =>
    req('/matches/standings', { method: 'POST', body: JSON.stringify(data) }),
}

export default api
