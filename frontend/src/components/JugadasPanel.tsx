/**
 * Panel de «mejores jugadas»: subir el clip, etiquetarlo y decidir si sale.
 *
 * El mismo componente lo usan el organizador (pestaña del torneo, con todos
 * los partidos) y el árbitro (tarjeta de su partido, con el partido fijo), por
 * lo mismo que el backend usa un solo permiso: el que está en la cancha con el
 * video en el teléfono es el árbitro, y pedirle que se lo mande al organizador
 * para que lo suba es como se pierden los clips.
 *
 * Las jugadas que se ofrecen salen de la disciplina del torneo
 * (`jugadasDestacadas`), nunca de una lista fija: un cajón de tejo no tiene
 * atajada, tiene moñona.
 */
import { useEffect, useMemo, useRef, useState } from 'react'
import { api, subirJugada } from '../services/api'
import { Badge, Button, Card, EmptyState, Icon, Input, Select, SectionTitle, Spinner } from './ui'
import JugadaPlayer, { ChipJugada, type JugadaLike } from './JugadaPlayer'
import { jugadasDestacadas, sportOf } from '../sports'
import { ACCEPT_VIDEO, duracionLegible, leerClip, pesoLegible, type ClipLeido } from '../utils/clip'
import { ESTADO_LABEL } from '../utils/partido'

type Modo = 'archivo' | 'enlace'

const VACIO = {
  play_type: '',
  title: '',
  match_id: '',
  team_id: '',
  player_id: '',
  minute: '',
  published: true,
}

export default function JugadasPanel({
  tournament,
  matchId = null,
  readOnly = false,
  titulo = 'Mejores jugadas',
}: {
  tournament: any
  /** Fija el partido (panel del árbitro). Con esto no se ofrece el selector. */
  matchId?: string | null
  /** El árbitro que no dirige ese partido lo ve pero no lo toca. */
  readOnly?: boolean
  titulo?: string
}) {
  const deporte = tournament?.sport_type
  const plays = jugadasDestacadas(deporte)

  const [jugadas, setJugadas] = useState<JugadaLike[]>([])
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [ok, setOk] = useState<string | null>(null)

  const [config, setConfig] = useState<any>(null)
  const [partidos, setPartidos] = useState<any[]>([])
  const [equipos, setEquipos] = useState<any[]>([])
  const [patrocinadores, setPatrocinadores] = useState<any[]>([])
  const [nomina, setNomina] = useState<any[]>([])

  const [modo, setModo] = useState<Modo>('archivo')
  const [form, setForm] = useState({ ...VACIO, match_id: matchId || '' })
  const [clip, setClip] = useState<ClipLeido | null>(null)
  const [enlace, setEnlace] = useState('')
  const [subiendo, setSubiendo] = useState(false)
  const [avance, setAvance] = useState(0)
  const [abierta, setAbierta] = useState<JugadaLike | null>(null)
  const [filtro, setFiltro] = useState('')
  const archivoRef = useRef<HTMLInputElement | null>(null)

  const maxMB = config?.max_video_mb ?? 40
  const contentful = config?.contentful
  const puedeEditar = !readOnly

  // --- Carga ---
  const refrescar = async () => {
    if (!tournament?.id) return
    setCargando(true)
    setError(null)
    try {
      const lista = await api.highlights(tournament.id, {
        matchId: matchId || undefined,
        includeUnpublished: true,
      })
      setJugadas(Array.isArray(lista) ? lista : [])
    } catch (e: any) {
      setError(e?.message || 'No se pudieron cargar las jugadas')
    } finally {
      setCargando(false)
    }
  }

  useEffect(() => {
    refrescar()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tournament?.id, matchId])

  useEffect(() => {
    api.highlightsConfig().then(setConfig).catch(() => {})
  }, [])

  useEffect(() => {
    if (!tournament?.id) return
    api.getSponsors(tournament.id).then(setPatrocinadores).catch(() => setPatrocinadores([]))
    api.getTeams(tournament.id).then(setEquipos).catch(() => setEquipos([]))
    // El selector de partidos solo hace falta cuando no viene fijo.
    if (matchId) return
    api
      .getStages(tournament.id)
      .then(async (fases: any[]) => {
        const porFase = await Promise.all(
          (fases || []).map(async (f) => {
            const ms = await api.stageMatches(f.id).catch(() => [])
            return (ms || []).map((m: any) => ({ ...m, _fase: f.name }))
          }),
        )
        setPartidos(porFase.flat())
      })
      .catch(() => setPartidos([]))
  }, [tournament?.id, matchId])

  // La nómina se pide cuando se elige equipo: pedir las de veinte equipos por
  // adelantado son veinte consultas que casi nunca se usan.
  useEffect(() => {
    if (!form.team_id) {
      setNomina([])
      return
    }
    api.getPlayers(form.team_id).then(setNomina).catch(() => setNomina([]))
  }, [form.team_id])

  const nombreEquipo = (id?: string | null) =>
    equipos.find((e) => e.id === id)?.name || ''

  const rotuloPartido = (m: any) => {
    const local = nombreEquipo(m.home_team_id) || 'Por definir'
    const visita = nombreEquipo(m.away_team_id) || 'Por definir'
    const estado = m.status && m.status !== 'scheduled' ? ` · ${ESTADO_LABEL[m.status] || m.status}` : ''
    return `${m._fase ? `${m._fase}: ` : ''}${local} vs ${visita}${estado}`
  }

  // --- Elegir el archivo ---
  const elegirArchivo = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const archivo = e.target.files?.[0]
    if (!archivo) return
    setError(null)
    setOk(null)
    try {
      const leido = await leerClip(archivo, maxMB)
      setClip(leido)
      // La duración y la portada se mandan con la ficha: la portada es lo que
      // deja que la grilla cargue sin bajar un solo video.
      if (leido.ilegible)
        setError(
          'El navegador no pudo leer este video, así que no hay portada. Se puede subir igual, ' +
            'pero si tampoco se ve en el marcador, vuelve a exportarlo como MP4.',
        )
    } catch (err: any) {
      setClip(null)
      setError(err?.message || 'No se pudo leer el archivo')
    }
  }

  const limpiar = () => {
    setForm({ ...VACIO, match_id: matchId || '' })
    setClip(null)
    setEnlace('')
    setAvance(0)
    if (archivoRef.current) archivoRef.current.value = ''
  }

  const subir = async () => {
    if (!tournament?.id) return
    setError(null)
    setOk(null)
    setSubiendo(true)
    try {
      const comun = {
        play_type: form.play_type || undefined,
        title: form.title || undefined,
        match_id: form.match_id || undefined,
        team_id: form.team_id || undefined,
        player_id: form.player_id || undefined,
        minute: form.minute ? Number(form.minute) : undefined,
        published: form.published,
      }
      if (modo === 'enlace') {
        await api.linkHighlight(tournament.id, { ...comun, video_url: enlace.trim() })
      } else {
        if (!clip) throw new Error('Elige el video de la jugada.')
        await subirJugada(
          tournament.id,
          clip.archivo,
          {
            ...comun,
            duration_seconds: clip.duracion ?? undefined,
            poster_url: clip.portada ?? undefined,
          },
          setAvance,
        )
      }
      setOk(
        contentful?.configured
          ? 'Jugada subida. El espejo en Contentful corre por detrás; refresca en un minuto.'
          : 'Jugada subida.',
      )
      limpiar()
      refrescar()
    } catch (e: any) {
      setError(e?.message || 'No se pudo subir la jugada')
    } finally {
      setSubiendo(false)
    }
  }

  const alternarPublicada = async (j: JugadaLike) => {
    try {
      await api.updateHighlight(j.id, { published: !j.published })
      refrescar()
    } catch (e: any) {
      setError(e?.message || 'No se pudo cambiar la publicación')
    }
  }

  const borrar = async (j: JugadaLike) => {
    try {
      await api.deleteHighlight(j.id)
      if (abierta?.id === j.id) setAbierta(null)
      refrescar()
    } catch (e: any) {
      setError(e?.message || 'No se pudo borrar la jugada')
    }
  }

  const espejar = async (j: JugadaLike) => {
    try {
      await api.mirrorHighlight(j.id)
      setOk('Se mandó al CDN; la URL aparece en un momento.')
    } catch (e: any) {
      setError(e?.message || 'No se pudo subir al CDN')
    }
  }

  const visibles = useMemo(
    () => (filtro ? jugadas.filter((j) => (j.play_type || '') === filtro) : jugadas),
    [jugadas, filtro],
  )
  const tiposPresentes = useMemo(
    () => plays.filter((p) => jugadas.some((j) => j.play_type === p.type)),
    [jugadas, plays],
  )

  const puedeSubir =
    puedeEditar && !subiendo && (modo === 'enlace' ? enlace.trim().length > 8 : !!clip)

  return (
    <div className="space-y-5">
      <SectionTitle
        eyebrow={sportOf(deporte).label}
        hint="El clip sale al marcador público dentro de un marco con el nombre del campeonato, su logo y los patrocinadores."
        right={
          <Badge className="bg-secondary-container/40 text-secondary">
            {jugadas.length} {jugadas.length === 1 ? 'jugada' : 'jugadas'}
          </Badge>
        }
      >
        {titulo}
      </SectionTitle>

      {error && (
        <div className="rounded-lg border border-tertiary/40 bg-tertiary/10 p-3 text-xs text-tertiary">
          {error}
        </div>
      )}
      {ok && (
        <div className="rounded-lg border border-secondary/40 bg-secondary/10 p-3 text-xs text-secondary">
          {ok}
        </div>
      )}

      {/* ---------------- Subir ---------------- */}
      {puedeEditar && (
        <Card className="p-4">
          <div className="mb-3 flex flex-wrap items-center gap-2">
            {(['archivo', 'enlace'] as Modo[]).map((m) => (
              <button
                key={m}
                onClick={() => setModo(m)}
                className={`rounded-lg px-3 py-1.5 font-display text-xs font-bold transition ${
                  modo === m
                    ? 'bg-volt text-on-secondary'
                    : 'border border-outline-variant text-on-surface-variant hover:text-on-surface'
                }`}
              >
                {m === 'archivo' ? 'Subir video' : 'Pegar enlace'}
              </button>
            ))}
            <span className="ml-auto text-[11px] text-on-surface-variant">
              {modo === 'archivo'
                ? `MP4, MOV o WEBM · hasta ${maxMB} MB`
                : 'YouTube, Instagram o un enlace directo'}
            </span>
          </div>

          {modo === 'archivo' ? (
            <div className="space-y-3">
              <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-dashed border-outline-variant bg-surface-container-low p-4 transition hover:border-secondary/60">
                <span className="relative grid h-11 w-11 shrink-0 place-items-center">
                  <span className="clip-hex absolute inset-0 bg-surface-container-high" />
                  <Icon name="movie" className="relative text-xl text-secondary" />
                </span>
                <span className="min-w-0">
                  <span className="block font-display text-sm font-bold">
                    {clip ? clip.archivo.name : 'Elige el clip de la jugada'}
                  </span>
                  <span className="block text-xs text-on-surface-variant">
                    {clip
                      ? `${pesoLegible(clip.archivo.size)} · ${duracionLegible(clip.duracion)}${
                          clip.ancho ? ` · ${clip.ancho}×${clip.alto}` : ''
                        }`
                      : 'Diez o quince segundos: la jugada, no el partido'}
                  </span>
                </span>
                <input
                  ref={archivoRef}
                  type="file"
                  accept={ACCEPT_VIDEO}
                  className="hidden"
                  onChange={elegirArchivo}
                />
              </label>

              {clip?.portada && (
                <div className="flex items-center gap-3">
                  <img
                    src={clip.portada}
                    alt="Portada"
                    className="h-16 w-28 rounded-lg border border-outline-variant object-cover"
                  />
                  <p className="text-[11px] text-on-surface-variant">
                    Portada tomada del clip. Es lo que se ve en la grilla sin tener que
                    bajar el video.
                  </p>
                </div>
              )}
            </div>
          ) : (
            <Input
              value={enlace}
              onChange={(e) => setEnlace(e.target.value)}
              placeholder="https://www.youtube.com/watch?v=…"
            />
          )}

          {/* ---- Ficha ---- */}
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            {!matchId && (
              <label className="block">
                <span className="mb-1 block text-xs font-semibold text-on-surface-variant">
                  Partido
                </span>
                <Select
                  value={form.match_id}
                  onChange={(e) => setForm((f) => ({ ...f, match_id: e.target.value }))}
                >
                  <option value="">Sin partido (del campeonato)</option>
                  {partidos.map((m) => (
                    <option key={m.id} value={m.id}>
                      {rotuloPartido(m)}
                    </option>
                  ))}
                </Select>
              </label>
            )}

            <label className="block">
              <span className="mb-1 block text-xs font-semibold text-on-surface-variant">
                Jugada
              </span>
              <Select
                value={form.play_type}
                onChange={(e) => setForm((f) => ({ ...f, play_type: e.target.value }))}
              >
                {/* Lo que se ofrece son las jugadas de ESTA disciplina. */}
                {plays.map((p) => (
                  <option key={p.type} value={p.type}>
                    {p.label}
                  </option>
                ))}
              </Select>
            </label>

            <label className="block">
              <span className="mb-1 block text-xs font-semibold text-on-surface-variant">
                Equipo
              </span>
              <Select
                value={form.team_id}
                onChange={(e) =>
                  setForm((f) => ({ ...f, team_id: e.target.value, player_id: '' }))
                }
              >
                <option value="">Sin equipo</option>
                {equipos.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </Select>
            </label>

            <label className="block">
              <span className="mb-1 block text-xs font-semibold text-on-surface-variant">
                Jugador
              </span>
              <Select
                value={form.player_id}
                onChange={(e) => setForm((f) => ({ ...f, player_id: e.target.value }))}
                disabled={!form.team_id}
              >
                <option value="">{form.team_id ? 'Sin jugador' : 'Elige el equipo'}</option>
                {nomina.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.number ? `${p.number} · ` : ''}
                    {p.name}
                  </option>
                ))}
              </Select>
            </label>

            <label className="block md:col-span-2">
              <span className="mb-1 block text-xs font-semibold text-on-surface-variant">
                Título
              </span>
              <Input
                value={form.title}
                onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                placeholder="Golazo de media cancha"
              />
            </label>

            <label className="block">
              <span className="mb-1 block text-xs font-semibold text-on-surface-variant">
                Minuto
              </span>
              <Input
                type="number"
                min={0}
                value={form.minute}
                onChange={(e) => setForm((f) => ({ ...f, minute: e.target.value }))}
                placeholder="23"
              />
            </label>

            <label className="flex items-end gap-2 pb-2">
              <input
                type="checkbox"
                checked={form.published}
                onChange={(e) => setForm((f) => ({ ...f, published: e.target.checked }))}
                className="h-4 w-4 accent-volt"
              />
              <span className="text-xs text-on-surface-variant">
                Publicar en el marcador
              </span>
            </label>
          </div>

          {subiendo && modo === 'archivo' && (
            <div className="mt-3">
              <div className="h-1.5 overflow-hidden rounded-full bg-surface-container-high">
                <div
                  className="h-full rounded-full bg-volt transition-[width] duration-150"
                  style={{ width: `${Math.round(avance * 100)}%` }}
                />
              </div>
              <p className="mt-1 text-[11px] text-on-surface-variant">
                Subiendo… {Math.round(avance * 100)}%
              </p>
            </div>
          )}

          <div className="mt-4 flex flex-wrap items-center gap-2">
            <Button onClick={subir} disabled={!puedeSubir}>
              {subiendo ? <Spinner className="h-4 w-4" /> : <Icon name="upload" className="text-base" />}
              {subiendo ? 'Subiendo' : 'Subir jugada'}
            </Button>
            {(clip || enlace) && (
              <Button variant="ghost" onClick={limpiar} disabled={subiendo}>
                Limpiar
              </Button>
            )}
            {contentful && !contentful.enabled && (
              <span className="text-[11px] text-on-surface-variant">
                El video se guarda en este servidor. El espejo en Contentful está apagado.
              </span>
            )}
          </div>
        </Card>
      )}

      {/* ---------------- Listado ---------------- */}
      {tiposPresentes.length > 1 && (
        <div className="flex flex-wrap gap-1.5">
          <button
            onClick={() => setFiltro('')}
            className={`rounded-full px-3 py-1 text-xs font-bold transition ${
              !filtro ? 'bg-volt text-on-secondary' : 'border border-outline-variant text-on-surface-variant'
            }`}
          >
            Todas
          </button>
          {tiposPresentes.map((p) => (
            <button key={p.type} onClick={() => setFiltro(p.type)} className="transition">
              <ChipJugada
                sport={deporte}
                type={p.type}
                className={filtro === p.type ? 'ring-1 ring-secondary' : 'opacity-70'}
              />
            </button>
          ))}
        </div>
      )}

      {cargando ? (
        <div className="grid place-items-center py-10">
          <Spinner />
        </div>
      ) : !visibles.length ? (
        <EmptyState
          icon="movie"
          title="Todavía no hay jugadas"
          hint={
            puedeEditar
              ? 'Sube el clip del gol o de la atajada y queda pegado al partido, con el marco del campeonato.'
              : 'El organizador todavía no publicó jugadas de este campeonato.'
          }
        />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {visibles.map((j) => (
            <Card key={j.id} className="overflow-hidden p-0" hover>
              <button
                onClick={() => setAbierta(j)}
                className="relative block w-full"
                aria-label={`Ver ${j.title || j.play_label || 'la jugada'}`}
              >
                <span className="block aspect-video w-full bg-surface-container-lowest">
                  {j.poster_url ? (
                    <img
                      src={j.poster_url}
                      alt=""
                      className="h-full w-full object-cover"
                      loading="lazy"
                    />
                  ) : (
                    <span className="grid h-full place-items-center">
                      <Icon name="movie" className="text-3xl opacity-30" />
                    </span>
                  )}
                </span>
                <span className="absolute inset-0 grid place-items-center bg-surface-container-lowest/25 transition hover:bg-surface-container-lowest/5">
                  <span className="relative grid h-11 w-11 place-items-center">
                    <span className="clip-hex absolute inset-0 bg-volt/90" />
                    <Icon name="play_arrow" className="relative text-xl text-on-secondary" />
                  </span>
                </span>
                <span className="absolute left-2 top-2">
                  <ChipJugada sport={deporte} type={j.play_type} />
                </span>
                {!j.published && (
                  <span className="absolute right-2 top-2 rounded-full bg-surface-container-lowest/85 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-tertiary">
                    Sin publicar
                  </span>
                )}
                {j.duration_seconds ? (
                  <span className="tnum absolute bottom-2 right-2 rounded bg-surface-container-lowest/85 px-1.5 py-0.5 text-[10px] font-bold">
                    {duracionLegible(j.duration_seconds)}
                  </span>
                ) : null}
              </button>

              <div className="p-3">
                <p className="truncate font-display text-sm font-bold">
                  {j.title || j.play_label || 'Jugada'}
                </p>
                <p className="mt-0.5 truncate text-[11px] text-on-surface-variant">
                  {[j.player_name, j.team_name, j.match_label].filter(Boolean).join(' · ') ||
                    'Del campeonato'}
                  {j.minute != null ? ` · ${j.minute}'` : ''}
                </p>
                {puedeEditar && (
                  <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
                    <button
                      onClick={() => alternarPublicada(j)}
                      className="inline-flex items-center gap-1 rounded-lg border border-outline-variant px-2 py-1 text-[11px] font-bold transition hover:border-secondary/70 hover:text-secondary"
                    >
                      <Icon
                        name={j.published ? 'visibility_off' : 'visibility'}
                        className="text-sm"
                      />
                      {j.published ? 'Ocultar' : 'Publicar'}
                    </button>
                    {contentful?.configured && j.storage === 'local' && (
                      <button
                        onClick={() => espejar(j)}
                        title={
                          j.external_url
                            ? 'Ya está en el CDN; vuelve a subirlo'
                            : 'Subir al CDN'
                        }
                        className="inline-flex items-center gap-1 rounded-lg border border-outline-variant px-2 py-1 text-[11px] font-bold transition hover:border-secondary/70 hover:text-secondary"
                      >
                        <Icon name="cloud_upload" className="text-sm" />
                        {j.external_url ? 'En el CDN' : 'Al CDN'}
                      </button>
                    )}
                    <BotonBorrar onConfirm={() => borrar(j)} />
                  </div>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* ---------------- Reproductor ---------------- */}
      {abierta && (
        <div
          className="fixed inset-0 z-50 grid place-items-center bg-surface-container-lowest/90 p-4"
          onClick={() => setAbierta(null)}
        >
          <div
            className="w-full max-w-3xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-2 flex items-center justify-between gap-3">
              <p className="truncate font-display text-base font-bold">
                {abierta.title || abierta.play_label}
              </p>
              <button
                onClick={() => setAbierta(null)}
                aria-label="Cerrar"
                className="grid h-9 w-9 place-items-center rounded-full bg-surface-container-high transition hover:bg-surface-bright"
              >
                <Icon name="close" />
              </button>
            </div>
            <JugadaPlayer
              jugada={abierta}
              torneo={tournament}
              patrocinadores={patrocinadores}
              autoPlay
            />
          </div>
        </div>
      )}
    </div>
  )
}

/** Borrar pide un segundo toque: en la cancha el pulgar se va solo, que es la
 *  misma razón por la que el panel del árbitro confirma el borrado de un
 *  evento. */
function BotonBorrar({ onConfirm }: { onConfirm: () => void }) {
  const [seguro, setSeguro] = useState(false)
  useEffect(() => {
    if (!seguro) return
    const t = setTimeout(() => setSeguro(false), 4000)
    return () => clearTimeout(t)
  }, [seguro])
  return (
    <button
      onClick={() => (seguro ? onConfirm() : setSeguro(true))}
      className={`inline-flex items-center gap-1 rounded-lg border px-2 py-1 text-[11px] font-bold transition ${
        seguro
          ? 'border-tertiary bg-tertiary/15 text-tertiary'
          : 'border-outline-variant text-on-surface-variant hover:border-tertiary/60 hover:text-tertiary'
      }`}
    >
      <Icon name="delete" className="text-sm" />
      {seguro ? '¿Seguro?' : 'Borrar'}
    </button>
  )
}
