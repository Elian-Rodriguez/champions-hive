/**
 * El informe arbitral: lo que el árbitro firma además del marcador.
 *
 * El acta dice cuánto terminó; esto dice qué pasó —la agresión del minuto 70,
 * el equipo que llegó tarde— y es la prueba con la que el comité sanciona
 * desde la pestaña Disciplina. Se escribe en la cancha, así que se guarda en
 * la cola sin señal como la planilla (ver isQueueable).
 *
 * Firmado ya no se toca: el botón pide dos toques porque firmar es lo único de
 * esta pantalla que no se deshace desde aquí (solo el organizador lo reabre).
 */
import { useEffect, useState } from 'react'
import { api } from '../services/api'
import { Badge, Button, Icon, Input, Select, Spinner } from './ui'
import { INCIDENCIAS, fechaCorta, incidencia } from '../utils/gobierno'

type Incidencia = {
  id?: string
  kind: string
  minute: number | null
  team: 'home' | 'away' | null
  player_id: string | null
  description: string
}

const NUEVA: Incidencia = { kind: 'conducta_antideportiva', minute: null, team: null, player_id: null, description: '' }
const AREA =
  'w-full rounded-lg border border-outline-variant bg-surface-container-low px-3 py-2 text-sm text-on-surface placeholder:text-on-surface-variant/60 focus:border-secondary/70 focus:outline-none disabled:opacity-60'

export default function InformeArbitral({
  match,
  homePlayers,
  awayPlayers,
  readOnly,
  minutoActual,
}: {
  match: any
  homePlayers: any[]
  awayPlayers: any[]
  readOnly: boolean
  /** El minuto del cronómetro: la incidencia nace con él, como un evento. */
  minutoActual?: number | null
}) {
  const [informe, setInforme] = useState<any>(null)
  const [incidencias, setIncidencias] = useState<Incidencia[]>([])
  const [observaciones, setObservaciones] = useState('')
  const [nueva, setNueva] = useState<Incidencia>(NUEVA)
  const [sucio, setSucio] = useState(false)
  const [guardando, setGuardando] = useState(false)
  const [firmar, setFirmar] = useState(false)
  const [oculto, setOculto] = useState(false)
  const [msg, setMsg] = useState<{ texto: string; error?: boolean } | null>(null)

  function aplicar(r: any) {
    setInforme(r)
    setObservaciones(r?.observations || '')
    setIncidencias(
      (r?.incidents || []).map((i: any) => ({
        id: i.id,
        kind: i.kind,
        minute: i.minute ?? null,
        team: i.team ?? null,
        player_id: i.player_id ?? null,
        description: i.description || '',
      })),
    )
    setSucio(false)
  }

  useEffect(() => {
    let vivo = true
    setInforme(null)
    setOculto(false)
    setMsg(null)
    api
      .matchReport(String(match.id))
      .then((r: any) => vivo && aplicar(r))
      // 403: un árbitro mirando un partido que no dirige. El informe no es suyo
      // ni de lectura pública, así que la tarjeta simplemente no aparece.
      .catch(() => vivo && setOculto(true))
    return () => {
      vivo = false
    }
  }, [match.id])

  if (oculto) return null
  if (!informe) return <Spinner />

  const firmado = !!informe.submitted_at
  const bloqueado = readOnly || firmado
  const nombre = (lado: string | null, pid: string | null) => {
    const lista = lado === 'away' ? awayPlayers : lado === 'home' ? homePlayers : [...homePlayers, ...awayPlayers]
    return lista.find((p) => String(p.id) === String(pid))?.name
  }

  async function guardar(lista = incidencias, obs = observaciones) {
    setGuardando(true)
    setMsg(null)
    try {
      const r = await api.saveMatchReport(String(match.id), {
        observations: obs,
        incidents: lista.map((i) => ({ ...i, description: i.description || null })),
      })
      aplicar(r)
      setMsg({ texto: r?._pending ? 'Guardado sin señal: se envía al recuperar la conexión.' : 'Borrador guardado.' })
      return true
    } catch (e: any) {
      setMsg({ texto: e.message, error: true })
      return false
    } finally {
      setGuardando(false)
    }
  }

  async function firmarInforme() {
    if (!firmar) {
      setFirmar(true)
      return
    }
    setFirmar(false)
    if (sucio && !(await guardar())) return
    setGuardando(true)
    try {
      const r = await api.submitMatchReport(String(match.id))
      aplicar(r)
      setMsg({ texto: r?._pending ? 'Firma en cola: se envía al recuperar la señal.' : 'Informe firmado.' })
    } catch (e: any) {
      setMsg({ texto: e.message, error: true })
    } finally {
      setGuardando(false)
    }
  }

  function agregar() {
    setIncidencias([...incidencias, { ...nueva, minute: nueva.minute ?? minutoActual ?? null }])
    setNueva(NUEVA)
    setSucio(true)
  }

  const jugadoresDelLado = nueva.team === 'away' ? awayPlayers : nueva.team === 'home' ? homePlayers : []

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h4 className="flex items-center gap-2 font-display text-sm font-semibold">
          <Icon name="assignment" className="text-secondary" /> Informe arbitral
        </h4>
        {firmado ? (
          <Badge className="bg-secondary/15 text-secondary">
            <Icon name="verified" className="mr-1 text-sm" /> Firmado {fechaCorta(informe.submitted_at)}
          </Badge>
        ) : (
          <span className="text-xs text-on-surface-variant">
            Lo que pasó además del marcador. Firmado, lo lee el comité y los capitanes.
          </span>
        )}
      </div>

      {incidencias.length === 0 ? (
        <p className="mb-3 text-sm text-on-surface-variant">
          {firmado ? 'Sin novedad.' : 'Sin incidencias todavía. Si no pasó nada, fírmalo así: «sin novedad».'}
        </p>
      ) : (
        <ul className="mb-3 divide-y divide-outline-variant/30 rounded-lg border border-outline-variant/50">
          {incidencias.map((inc, i) => {
            const tipo = incidencia(inc.kind)
            const equipo = inc.team === 'home' ? match.home_team_name : inc.team === 'away' ? match.away_team_name : null
            return (
              <li key={inc.id || i} className="flex items-start gap-2 px-3 py-2 text-sm">
                <Icon name={tipo.icon} className="mt-0.5 text-base text-tertiary" />
                <div className="min-w-0 flex-1">
                  <p className="font-semibold">
                    {tipo.label}
                    {inc.minute != null && <span className="tnum ml-1 font-normal text-on-surface-variant">· min {inc.minute}</span>}
                  </p>
                  <p className="text-xs text-on-surface-variant">
                    {[nombre(inc.team, inc.player_id), equipo].filter(Boolean).join(' · ') || 'Sin jugador'}
                  </p>
                  {inc.description && <p className="mt-0.5">{inc.description}</p>}
                </div>
                {!bloqueado && (
                  <button
                    className="text-on-surface-variant hover:text-error"
                    title="Quitar"
                    onClick={() => {
                      setIncidencias(incidencias.filter((_, j) => j !== i))
                      setSucio(true)
                    }}
                  >
                    <Icon name="close" className="text-base" />
                  </button>
                )}
              </li>
            )
          })}
        </ul>
      )}

      {!bloqueado && (
        <div className="mb-3 space-y-2 rounded-lg bg-surface-container-low p-3">
          <div className="grid gap-2 sm:grid-cols-[1fr_5rem]">
            <Select value={nueva.kind} onChange={(e) => setNueva({ ...nueva, kind: e.target.value })}>
              {INCIDENCIAS.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </Select>
            <Input
              type="number"
              min={0}
              max={200}
              placeholder={minutoActual != null ? String(minutoActual) : 'Min'}
              className="tnum"
              value={nueva.minute ?? ''}
              onChange={(e) => setNueva({ ...nueva, minute: e.target.value === '' ? null : Number(e.target.value) })}
            />
          </div>
          <div className="grid gap-2 sm:grid-cols-2">
            <Select
              value={nueva.team || ''}
              onChange={(e) => setNueva({ ...nueva, team: (e.target.value || null) as any, player_id: null })}
            >
              <option value="">Sin equipo (público, cancha…)</option>
              <option value="home">{match.home_team_name || 'Local'}</option>
              <option value="away">{match.away_team_name || 'Visitante'}</option>
            </Select>
            <Select
              value={nueva.player_id || ''}
              disabled={!nueva.team}
              onChange={(e) => setNueva({ ...nueva, player_id: e.target.value || null })}
            >
              <option value="">{nueva.team ? 'Sin jugador' : 'Elige el equipo'}</option>
              {jugadoresDelLado.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.number != null ? `${p.number} · ` : ''}
                  {p.name}
                </option>
              ))}
            </Select>
          </div>
          <textarea
            className={AREA}
            rows={2}
            maxLength={2000}
            placeholder="Qué pasó, como lo escribirías en el informe en papel."
            value={nueva.description}
            onChange={(e) => setNueva({ ...nueva, description: e.target.value })}
          />
          <Button variant="outline" className="py-1.5 text-xs" onClick={agregar}>
            <Icon name="add" className="text-base" /> Agregar incidencia
          </Button>
        </div>
      )}

      <textarea
        className={`${AREA} mb-3`}
        rows={2}
        maxLength={2000}
        disabled={bloqueado}
        placeholder={bloqueado ? 'Sin observaciones.' : 'Observaciones generales (estado de la cancha, demoras, comportamiento del público…)'}
        value={observaciones}
        onChange={(e) => {
          setObservaciones(e.target.value)
          setSucio(true)
        }}
      />

      {!bloqueado && (
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="ghost" disabled={guardando || !sucio} onClick={() => guardar()}>
            <Icon name="save" className="text-base" /> Guardar borrador
          </Button>
          <Button variant={firmar ? 'danger' : 'primary'} disabled={guardando} onClick={firmarInforme}>
            <Icon name="draw" className="text-base" />
            {firmar ? '¿Firmar? Ya no se podrá cambiar' : 'Firmar informe'}
          </Button>
        </div>
      )}
      {firmado && !readOnly && (
        <p className="text-xs text-on-surface-variant">
          Para corregirlo, pide al organizador que lo reabra desde la pestaña Disciplina.
        </p>
      )}
      {msg && <p className={`mt-2 text-xs ${msg.error ? 'text-error' : 'text-secondary'}`}>{msg.texto}</p>}
    </div>
  )
}
