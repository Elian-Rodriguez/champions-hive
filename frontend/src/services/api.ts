const API_URL = import.meta.env.VITE_API_URL || '/api/v1'

function authHeaders(): Record<string, string> {
  const token = localStorage.getItem('token')
  return token ? { Authorization: `Bearer ${token}` } : {}
}

async function req(path: string, options: RequestInit = {}): Promise<any> {
  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...authHeaders(),
      ...(options.headers || {}),
    },
  })
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
  listUsers: () => req('/auth/users'),
  deleteUser: (id: string) => req(`/auth/users/${id}`, { method: 'DELETE' }),

  // ---- Tournaments ----
  getTournaments: () => req('/tournaments'),
  getTournament: (id: string) => req(`/tournaments/${id}`),
  createTournament: (data: any) =>
    req('/tournaments', { method: 'POST', body: JSON.stringify(data) }),
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
  getTiebreakerOptions: () => req('/tournaments/tiebreaker_options'),
  tournamentStats: (id: string) => req(`/tournaments/${id}/stats`),
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

  // ---- Sponsors ----
  getSponsors: (tid: string) => req(`/tournaments/${tid}/sponsors`),
  createSponsor: (tid: string, data: any) =>
    req(`/tournaments/${tid}/sponsors`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  deleteSponsor: (tid: string, sponsorId: string) =>
    req(`/tournaments/${tid}/sponsors/${sponsorId}`, { method: 'DELETE' }),

  // ---- Photos ----
  getPhotos: (tid: string) => req(`/tournaments/${tid}/photos`),
  addPhoto: (tid: string, data: any) =>
    req(`/tournaments/${tid}/photos`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  deletePhoto: (tid: string, photoId: string) =>
    req(`/tournaments/${tid}/photos/${photoId}`, { method: 'DELETE' }),

  // ---- Stages / fixtures / brackets ----
  getStages: (tid: string) => req(`/tournaments/${tid}/stages`),
  createStage: (tid: string, data: any) =>
    req(`/tournaments/${tid}/stages`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  deleteStage: (sid: string) =>
    req(`/tournaments/stages/${sid}`, { method: 'DELETE' }),
  generateFixture: (sid: string) =>
    req(`/tournaments/stages/${sid}/generate_fixture`, { method: 'POST' }),
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

  // ---- Teams & players ----
  getTeams: (tid: string) => req(`/tournaments/${tid}/teams`),
  addTeam: (tid: string, data: any) =>
    req(`/tournaments/${tid}/teams`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  updateTeamGroup: (tid: string, teamId: string, group_name: string) =>
    req(`/tournaments/${tid}/teams/${teamId}/group`, {
      method: 'PUT',
      body: JSON.stringify({ group_name }),
    }),
  shuffleGroups: (tid: string, num_groups: number) =>
    req(`/tournaments/${tid}/teams/shuffle_groups`, {
      method: 'POST',
      body: JSON.stringify({ num_groups }),
    }),
  removeTeam: (tid: string, teamId: string) =>
    req(`/tournaments/${tid}/teams/${teamId}`, { method: 'DELETE' }),
  getPlayers: (teamId: string) => req(`/teams/${teamId}/players`),
  addPlayer: (teamId: string, data: any) =>
    req(`/teams/${teamId}/players`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  removePlayer: (teamId: string, playerId: string) =>
    req(`/teams/${teamId}/players/${playerId}`, { method: 'DELETE' }),

  // ---- Venues & courts ----
  getVenues: () => req('/venues'),
  createVenue: (data: any) =>
    req('/venues', { method: 'POST', body: JSON.stringify(data) }),
  createCourt: (venueId: string, data: any) =>
    req(`/venues/${venueId}/courts`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  // ---- Matches & events ----
  listMatches: (query = '') => req(`/matches${query}`),
  scheduleMatch: (data: any) =>
    req('/matches/schedule', { method: 'POST', body: JSON.stringify(data) }),
  updateMatchStatus: (matchId: string, data: any) =>
    req(`/matches/${matchId}/status`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
  matchEvents: (matchId: string) => req(`/matches/${matchId}/events`),
  recordEvent: (data: any) =>
    req('/matches/events', { method: 'POST', body: JSON.stringify(data) }),
  standings: (data: any) =>
    req('/matches/standings', { method: 'POST', body: JSON.stringify(data) }),
}

export default api
