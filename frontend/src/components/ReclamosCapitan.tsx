/**
 * Reclamos del capitán: presentarlos con la prueba y seguir su resolución.
 *
 * La prueba es lo que decide un reclamo, así que el formulario la pide en el
 * mismo paso: una jugada ya publicada del partido (el gol que se discute), un
 * video propio grabado desde la tribuna o un enlace. El video propio se sube
 * después de crear el reclamo —es multipart y no viaja en el JSON—, y si falla
 * el reclamo igual queda presentado y se puede adjuntar de nuevo.
 *
 * Apelar una sanción del comité es un reclamo más: elegir la sanción fija el
 * tipo, y la resolución del organizador puede bajarla o anularla.
 */
import { useEffect, useRef, useState } from 'react'
import { api } from '../services/api'
import { Badge, Button, Card, EmptyState, Icon, Input, Select, Spinner } from './ui'
import { PruebaReclamo } from './GobiernoPanel'
import { TIPOS_RECLAMO, estadoReclamo, fechaCorta, fechasLabel, reclamoPendiente } from '../utils/gobierno'

const AREA =
  'w-full rounded-lg border border-outline-variant bg-surface-container-low px-3 py-2 text-sm text-on-surface placeholder:text-on-surface-variant/60 focus:border-secondary/70 focus:outline-none'

export default function ReclamosCapitan({
  sel,
  jugados,
  jugadas,
  sanciones,
}: {
  /** El equipo elegido en el panel: `team_id` + `tournament_id`. */
  sel: any
  /** Partidos ya jugados por el equipo (de /captain/matches). */
  jugados: any[]
  /** Jugadas publicadas de sus partidos, para citarlas como prueba. */
  jugadas: any[]
  /** Sanciones vigentes del equipo (de /discipline); se apelan las del comité. */
  sanciones: any[]
}) {
  const [reclamos, setReclamos] = useState<any[]>([])
  const [cargando, setCargando] = useState(true)
  const [abierto, setAbierto] = useState(false)
  const [kind, setKind] = useState('resultado')
  const [matchId, setMatchId] = useState('')
  const [sanctionId, setSanctionId] = useState('')
  const [highlightId, setHighlightId] = useState('')
  const [enlace, setEnlace] = useState('')
  const [video, setVideo] = useState<File | null>(null)
  const [texto, setTexto] = useState('')
  const [enviando, setEnviando] = useState(false)
  const [msg, setMsg] = useState<{ texto: string; error?: boolean } | null>(null)
  const archivo = useRef<HTMLInputElement>(null)

  async function cargar() {
    try {
      setReclamos(await api.claims(sel.tournament_id))
    } catch {
      setReclamos([])
    } finally {
      setCargando(false)
    }
  }

  useEffect(() => {
    setCargando(true)
    cargar()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sel?.team_id, sel?.tournament_id])

  const delEquipo = reclamos.filter((r) => String(r.team_id) === String(sel.team_id))
  const apelables = sanciones.filter((s) => s.source === 'manual' && s.sanction_id)
  const jugadasDelPartido = jugadas.filter((j: any) => !matchId || String(j.match_id) === matchId)

  function limpiar() {
    setKind('resultado')
    setMatchId('')
    setSanctionId('')
    setHighlightId('')
    setEnlace('')
    setVideo(null)
    setTexto('')
  }

  async function enviar() {
    setEnviando(true)
    setMsg(null)
    try {
      const c = await api.createClaim(sel.tournament_id, {
        team_id: sel.team_id,
        kind: sanctionId ? 'sancion' : kind,
        description: texto,
        match_id: matchId || null,
        sanction_id: sanctionId || null,
        highlight_id: highlightId || null,
        evidence_url: enlace.trim() || null,
      })
      let videoFallo = false
      if (video) {
        try {
          await api.claimEvidence(c.id, video)
        } catch (e: any) {
          videoFallo = true
          setMsg({
            texto: `El reclamo quedó presentado, pero el video no subió: ${e.message}. Puedes adjuntarlo de nuevo abajo.`,
            error: true,
          })
        }
      }
      limpiar()
      setAbierto(false)
      if (!videoFallo) setMsg({ texto: 'Reclamo presentado. El organizador ya tiene el aviso.' })
      await cargar()
    } catch (e: any) {
      setMsg({ texto: e.message, error: true })
    } finally {
      setEnviando(false)
    }
  }

  async function adjuntar(c: any, f: File) {
    setMsg(null)
    try {
      await api.claimEvidence(c.id, f)
      setMsg({ texto: 'Video adjuntado.' })
      await cargar()
    } catch (e: any) {
      setMsg({ texto: e.message, error: true })
    }
  }

  async function retirar(c: any) {
    try {
      await api.withdrawClaim(c.id)
      await cargar()
    } catch (e: any) {
      setMsg({ texto: e.message, error: true })
    }
  }

  if (cargando) return <Spinner />

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <h3 className="font-display text-lg font-bold">Reclamos</h3>
          <p className="mt-1 text-sm text-on-surface-variant">
            Reclama un resultado, una alineación o una sanción, con el video como prueba. La resolución te
            llega a la campana.
          </p>
        </div>
        {!abierto && (
          <Button onClick={() => setAbierto(true)}>
            <Icon name="add" className="text-base" /> Nuevo reclamo
          </Button>
        )}
      </div>

      {msg && (
        <p className={`rounded-lg px-3 py-2 text-sm ${msg.error ? 'bg-error-container/40 text-error' : 'bg-secondary/15 text-secondary'}`}>
          {msg.texto}
        </p>
      )}

      {abierto && (
        <Card className="space-y-3 p-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block text-xs font-semibold text-on-surface-variant">
              Qué reclamas
              <Select
                className="mt-1"
                value={sanctionId ? 'sancion' : kind}
                disabled={!!sanctionId}
                onChange={(e) => setKind(e.target.value)}
              >
                {TIPOS_RECLAMO.filter((t) => t.value !== 'sancion' || apelables.length).map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </Select>
            </label>
            <label className="block text-xs font-semibold text-on-surface-variant">
              Partido
              <Select
                className="mt-1"
                value={matchId}
                onChange={(e) => {
                  setMatchId(e.target.value)
                  setHighlightId('')
                }}
              >
                <option value="">Ninguno en particular</option>
                {jugados.map((m) => (
                  <option key={m.match_id} value={m.match_id}>
                    vs {m.rival_name} · {m.my_score ?? 0}-{m.rival_score ?? 0}
                    {m.scheduled_start ? ` · ${fechaCorta(m.scheduled_start)}` : ''}
                  </option>
                ))}
              </Select>
            </label>
          </div>
          {(kind === 'sancion' || sanctionId) && apelables.length > 0 && (
            <label className="block text-xs font-semibold text-on-surface-variant">
              Sanción que apelas
              <Select className="mt-1" value={sanctionId} onChange={(e) => setSanctionId(e.target.value)}>
                <option value="">Elige la sanción…</option>
                {apelables.map((s) => (
                  <option key={s.sanction_id} value={s.sanction_id}>
                    {s.player_name} · {fechasLabel(s.matches)} · {s.reason}
                  </option>
                ))}
              </Select>
            </label>
          )}
          <label className="block text-xs font-semibold text-on-surface-variant">
            El reclamo
            <textarea
              className={`${AREA} mt-1`}
              rows={4}
              maxLength={2000}
              placeholder="Qué pasó y qué pides. Sé concreto: el minuto, el jugador, la jugada."
              value={texto}
              onChange={(e) => setTexto(e.target.value)}
            />
          </label>

          <div className="rounded-lg bg-surface-container-low p-3">
            <p className="mb-2 text-xs font-semibold text-on-surface-variant">
              <Icon name="movie" className="mr-1 align-middle text-sm" /> Prueba (opcional, pero es lo que decide)
            </p>
            <div className="grid gap-2 sm:grid-cols-3">
              <Select value={highlightId} onChange={(e) => setHighlightId(e.target.value)} disabled={!jugadasDelPartido.length}>
                <option value="">{jugadasDelPartido.length ? 'Una jugada publicada…' : 'Sin jugadas publicadas'}</option>
                {jugadasDelPartido.map((j: any) => (
                  <option key={j.id} value={j.id}>
                    {j.title || j.play_label || 'Jugada'}
                    {j.minute != null ? ` · ${j.minute}'` : ''}
                    {j.match_label ? ` · ${j.match_label}` : ''}
                  </option>
                ))}
              </Select>
              <input
                ref={archivo}
                type="file"
                accept="video/mp4,video/quicktime,video/webm,.mp4,.mov,.webm"
                className="hidden"
                onChange={(e) => {
                  setVideo(e.target.files?.[0] || null)
                  e.target.value = ''
                }}
              />
              <Button variant="outline" className="truncate" onClick={() => archivo.current?.click()}>
                <Icon name="upload" className="text-base" />
                {video ? video.name : 'Subir mi video'}
              </Button>
              <Input placeholder="…o pega un enlace" value={enlace} onChange={(e) => setEnlace(e.target.value)} />
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button disabled={!texto.trim() || enviando || (kind === 'sancion' && !sanctionId)} onClick={enviar}>
              <Icon name="send" className="text-base" />
              {enviando ? 'Enviando…' : 'Presentar reclamo'}
            </Button>
            <Button
              variant="ghost"
              onClick={() => {
                limpiar()
                setAbierto(false)
              }}
            >
              Cancelar
            </Button>
          </div>
        </Card>
      )}

      {delEquipo.length === 0 ? (
        !abierto && <EmptyState icon="balance" title="Sin reclamos" hint="Ojalá siga así." />
      ) : (
        <ul className="space-y-3">
          {delEquipo.map((c) => {
            const estado = estadoReclamo(c.status)
            const pendiente = reclamoPendiente(c.status)
            return (
              <li key={c.id}>
                <Card className="p-4" accent={pendiente ? 'orange' : undefined}>
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <p className="font-display font-bold">{c.kind_label}</p>
                      <p className="text-xs text-on-surface-variant">
                        {fechaCorta(c.created_at)}
                        {c.match_label && ` · ${c.match_label}`}
                      </p>
                    </div>
                    <Badge className={estado.tone}>
                      <Icon name={estado.icon} className="mr-1 text-sm" /> {estado.label}
                    </Badge>
                  </div>
                  <p className="mt-2 whitespace-pre-line text-sm">{c.description}</p>
                  {c.sanction && (
                    <p className="mt-2 text-sm text-on-surface-variant">
                      <Icon name="gavel" className="mr-1 align-middle text-base" />
                      {c.sanction.player_name}: {fechasLabel(c.sanction.matches)}
                      {c.sanction.status === 'annulled' && ' (anulada)'}
                    </p>
                  )}
                  <PruebaReclamo claim={c} />
                  {c.resolution && (
                    <div className="mt-3 rounded-lg bg-surface-container-low px-3 py-2 text-sm">
                      <p className="mb-0.5 text-xs font-semibold text-on-surface-variant">
                        Resolución {c.resolved_at && `· ${fechaCorta(c.resolved_at)}`}
                        {c.published && ' · publicada en el marcador'}
                      </p>
                      <p className="whitespace-pre-line">{c.resolution}</p>
                    </div>
                  )}
                  {pendiente && (
                    <div className="mt-3 flex flex-wrap gap-2">
                      <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg bg-surface-container-high px-3 py-1.5 text-xs font-bold hover:bg-surface-bright">
                        <Icon name="upload" className="text-base" />
                        {c.evidence ? 'Cambiar mi video' : 'Adjuntar mi video'}
                        <input
                          type="file"
                          accept="video/mp4,video/quicktime,video/webm,.mp4,.mov,.webm"
                          className="hidden"
                          onChange={(e) => {
                            const f = e.target.files?.[0]
                            e.target.value = ''
                            if (f) adjuntar(c, f)
                          }}
                        />
                      </label>
                      <Button variant="ghost" className="px-3 py-1.5 text-xs" onClick={() => retirar(c)}>
                        <Icon name="undo" className="text-base" /> Retirar
                      </Button>
                    </div>
                  )}
                </Card>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
