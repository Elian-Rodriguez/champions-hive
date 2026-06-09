import ArenaDashboard from './ArenaDashboard'
import ElitePlatform from './ElitePlatform'
import LeagueMetrics1 from './LeagueMetrics1'
import LeagueMetrics2 from './LeagueMetrics2'
import LeagueStandings from './LeagueStandings'
import LiveMatchConsole from './LiveMatchConsole'
import LoginScreen from './LoginScreen'
import PostMatchReport from './PostMatchReport'
import RefereeDashboard from './RefereeDashboard'
import RefereeSchedule from './RefereeSchedule'
import StatisticsLeaderboards from './StatisticsLeaderboards'
import TeamProfile from './TeamProfile'
import TournamentManagement1 from './TournamentManagement1'
import TournamentManagement2 from './TournamentManagement2'
import TournamentManagement3 from './TournamentManagement3'

import type { ComponentType } from 'react'

export interface StitchScreen {
  key: string
  title: string
  group: string
  Component: ComponentType
}

export const STITCH_SCREENS: StitchScreen[] = [
  { key: 'elite', title: 'Plataforma (landing)', group: 'Público', Component: ElitePlatform },
  { key: 'login', title: 'Login', group: 'Público', Component: LoginScreen },
  { key: 'standings', title: 'Tabla de posiciones', group: 'Público', Component: LeagueStandings },
  { key: 'stats', title: 'Estadísticas / líderes', group: 'Público', Component: StatisticsLeaderboards },
  { key: 'team', title: 'Perfil de equipo', group: 'Público', Component: TeamProfile },
  { key: 'tm1', title: 'Gestión de torneo I', group: 'Admin', Component: TournamentManagement1 },
  { key: 'tm2', title: 'Gestión de torneo II', group: 'Admin', Component: TournamentManagement2 },
  { key: 'tm3', title: 'Gestión de torneo III', group: 'Admin', Component: TournamentManagement3 },
  { key: 'arena', title: 'Arena dashboard', group: 'Admin', Component: ArenaDashboard },
  { key: 'metrics1', title: 'Métricas de liga I', group: 'Admin', Component: LeagueMetrics1 },
  { key: 'metrics2', title: 'Métricas de liga II', group: 'Admin', Component: LeagueMetrics2 },
  { key: 'live', title: 'Consola en vivo', group: 'Árbitro', Component: LiveMatchConsole },
  { key: 'refdash', title: 'Dashboard de árbitro', group: 'Árbitro', Component: RefereeDashboard },
  { key: 'refsched', title: 'Calendario de árbitro', group: 'Árbitro', Component: RefereeSchedule },
  { key: 'report', title: 'Reporte post-partido', group: 'Árbitro', Component: PostMatchReport },
]
