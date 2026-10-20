/**
 * El reproductor de las mejores jugadas: el clip dentro de su marco.
 *
 * Pinta el video en un CANVAS y no en un `<video>` con divs encima, por dos
 * razones que se explican en utils/marcoJugada.ts: hay un solo dibujante (no
 * dos diseños que se separan con el tiempo) y lo que se ve aquí es literalmente
 * el archivo que sale al exportar, que es lo que el organizador está revisando
 * cuando comprueba dónde quedó el logo del patrocinador.
 *
 * El `<video>` sigue existiendo —es el que decodifica y el que tiene el audio—
 * pero está oculto: de él se leen los fotogramas.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Icon } from './ui'
import { mediaUrl } from '../services/api'
import { jugadaDestacada, sportOf } from '../sports'
import { duracionLegible } from '../utils/clip'
import {
  cargarRecursos,
  dibujarMarco,
  type DatosMarco,
  type RecursosMarco,
} from '../utils/marcoJugada'
import {
  compartirClip,
  descargar,
  exportarConMarco,
  motivoSinExportar,
  nombreDeArchivo,
} from '../utils/exportarJugada'

/** Tope del factor de densidad. En un móvil con dpr 3 el canvas sería nueve
 *  veces más grande en píxeles y la cuenta de dibujar no vale la diferencia. */
const MAX_DPR = 2

/** Un enlace que apunta a un archivo de video se puede reproducir tal cual;
 *  uno que apunta a una página (YouTube, Instagram) no. */
const ENLACE_DIRECTO = /\.(mp4|m4v|mov|webm|ogv)(\?|#|$)/i

export type JugadaLike = {
  id: string
  play_type?: string | null
  play_label?: string | null
  title?: string | null
  minute?: number | null
  storage?: string | null
  video_url?: string | null
  /** URL del espejo en Contentful; vacío si no se subió (el caso por defecto). */
  external_url?: string | null
  poster_url?: string | null
  duration_seconds?: number | null
  player_name?: string | null
  team_name?: string | null
  match_label?: string | null
  published?: boolean
}

export type TorneoLike = {
  name?: string | null
  logo_url?: string | null
  sport_type?: string | null
}

/** Clases del chip según el tono de la jugada. El tono viaja como nombre de
 *  token desde sports.ts (lo comparte el canvas, que necesita el hex), así que
 *  la traducción a clases de Tailwind vive acá, en un solo sitio. */
const CLASES_TONO: Record<string, string> = {
  volt: 'bg-volt/15 text-volt border-volt/40',
  ice: 'bg-ice/15 text-ice border-ice/40',
  plasma: 'bg-plasma/15 text-plasma border-plasma/40',
  flare: 'bg-flare/15 text-flare border-flare/40',
  ember: 'bg-ember/15 text-ember border-ember/40',
  outline: 'bg-surface-container-high text-on-surface-variant border-outline-variant',
}

/** El chip de la jugada: el mismo en el panel, en el reel y en el reproductor.
 *  Es lo que hace que un clip se lea de un golpe al pasar por una grilla. */
export function ChipJugada({
  sport,
  type,
  className = '',
}: {
  sport?: string | null
  type?: string | null
  className?: string
}) {
  const play = jugadaDestacada(sport, type)
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.1em] ${
        CLASES_TONO[play.tone] || CLASES_TONO.outline
      } ${className}`}
    >
      <Icon name={play.icon} className="text-[13px] leading-none" />
      {play.label}
    </span>
  )
}

export function datosDelMarco(
  jugada: JugadaLike,
  torneo: TorneoLike,
  patrocinadores?: { name?: string | null; logo_url?: string | null }[],
): DatosMarco {
  return {
    campeonato: torneo.name || 'Champion Hive',
    deporte: torneo.sport_type,
    logo: torneo.logo_url,
    patrocinadores,
    jugada: jugada.play_type,
    titulo: jugada.title,
    jugador: jugada.player_name,
    equipo: jugada.team_name,
    partido: jugada.match_label,
    minuto: jugada.minute,
  }
}

export default function JugadaPlayer({
  jugada,
  torneo,
  patrocinadores,
  autoPlay = false,
  className = '',
  onExportado,
}: {
  jugada: JugadaLike
  torneo: TorneoLike
  patrocinadores?: { name?: string | null; logo_url?: string | null }[]
  autoPlay?: boolean
  className?: string
  onExportado?: () => void
}) {
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const cajaRef = useRef<HTMLDivElement | null>(null)
  const rafRef = useRef<number | null>(null)
  const recursosRef = useRef<RecursosMarco | null>(null)

  const [listo, setListo] = useState(false)
  const [sonando, setSonando] = useState(false)
  const [mudo, setMudo] = useState(false)
  const [tiempo, setTiempo] = useState(0)
  const [duracion, setDuracion] = useState(jugada.duration_seconds || 0)
  const [proporcion, setProporcion] = useState(16 / 9)
  const [fallo, setFallo] = useState<string | null>(null)
  const [exportando, setExportando] = useState(false)
  const [avance, setAvance] = useState(0)
  const [aviso, setAviso] = useState<string | null>(null)

  // El backend devuelve la ruta relativa; esto la ancla al origen del API
  // (ver mediaUrl en services/api.ts). Sin esto, con el backend en otro host
  // el `<video>` recibe el index.html de la SPA en vez del clip.
  const fuente = mediaUrl(jugada.video_url)
  const play = jugadaDestacada(torneo.sport_type, jugada.play_type)
  const datos = useMemo(
    () => datosDelMarco(jugada, torneo, patrocinadores),
    [jugada, torneo, patrocinadores],
  )

  // Un enlace externo que no es un archivo de video no se puede ni decodificar
  // ni dibujar: se ofrece abrirlo donde vive.
  const esEnlace = jugada.storage === 'link'
  const soloExterno = esEnlace && !ENLACE_DIRECTO.test(jugada.video_url || '')
  const sinMarco = esEnlace // origen cruzado: el canvas quedaría manchado
  const motivo = motivoSinExportar(jugada.storage)

  // --- Recursos del marco (logo y patrocinadores), una sola vez ---
  useEffect(() => {
    let vivo = true
    recursosRef.current = null
    cargarRecursos(datos).then((r) => {
      if (vivo) {
        recursosRef.current = r
        pintar()
      }
    })
    return () => {
      vivo = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [datos])

  /** Un fotograma: el video y el marco encima. */
  const pintar = useCallback(() => {
    const canvas = canvasRef.current
    const video = videoRef.current
    const caja = cajaRef.current
    if (!canvas || !video || !caja) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const dpr = Math.min(MAX_DPR, window.devicePixelRatio || 1)
    const anchoCss = caja.clientWidth || 640
    const altoCss = Math.round(anchoCss / proporcion)
    const ancho = Math.max(2, Math.round(anchoCss * dpr))
    const alto = Math.max(2, Math.round(altoCss * dpr))
    if (canvas.width !== ancho || canvas.height !== alto) {
      canvas.width = ancho
      canvas.height = alto
      canvas.style.height = `${altoCss}px`
    }

    ctx.fillStyle = '#04050A'
    ctx.fillRect(0, 0, ancho, alto)
    if (video.readyState >= 2) {
      try {
        ctx.drawImage(video, 0, 0, ancho, alto)
      } catch {
        /* fotograma no disponible todavía */
      }
    }
    if (!sinMarco && recursosRef.current) {
      dibujarMarco(ctx, ancho, alto, datos, recursosRef.current)
    }
  }, [datos, proporcion, sinMarco])

  // --- Bucle de dibujo: solo mientras suena ---
  useEffect(() => {
    if (!sonando) {
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
      rafRef.current = null
      pintar()
      return
    }
    const vuelta = () => {
      pintar()
      const v = videoRef.current
      if (v) setTiempo(v.currentTime)
      rafRef.current = requestAnimationFrame(vuelta)
    }
    rafRef.current = requestAnimationFrame(vuelta)
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
      rafRef.current = null
    }
  }, [sonando, pintar])

  // --- Repintar al cambiar de tamaño: el marco se mide en % de la altura ---
  useEffect(() => {
    const obs = new ResizeObserver(() => pintar())
    if (cajaRef.current) obs.observe(cajaRef.current)
    return () => obs.disconnect()
  }, [pintar])

  const alternar = () => {
    const v = videoRef.current
    if (!v) return
    if (v.paused) {
      v.play()
        .then(() => setSonando(true))
        .catch(() => setFallo('El navegador no dejó reproducir el clip.'))
    } else {
      v.pause()
      setSonando(false)
    }
  }

  const buscar = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = videoRef.current
    if (!v || !duracion) return
    v.currentTime = (Number(e.target.value) / 1000) * duracion
    setTiempo(v.currentTime)
    if (!sonando) requestAnimationFrame(pintar)
  }

  const exportar = async (compartir: boolean) => {
    if (motivo || !fuente) {
      setAviso(motivo)
      return
    }
    setExportando(true)
    setAvance(0)
    setAviso(null)
    try {
      videoRef.current?.pause()
      setSonando(false)
      const { blob, extension } = await exportarConMarco({
        src: fuente,
        datos,
        recursos: recursosRef.current || undefined,
        onProgreso: setAvance,
      })
      const nombre = nombreDeArchivo(datos, extension)
      const compartido =
        compartir &&
        (await compartirClip(blob, nombre, `${play.label} · ${datos.campeonato}`))
      if (!compartido) descargar(blob, nombre)
      onExportado?.()
    } catch (e: any) {
      setAviso(e?.message || 'No se pudo exportar el clip.')
    } finally {
      setExportando(false)
    }
  }

  // ------------------------------------------------------------------- #
  //  Enlace a otro sitio: no se decodifica acá
  // ------------------------------------------------------------------- #
  if (soloExterno) {
    return (
      <div className={`overflow-hidden rounded-xl border border-outline-variant/70 bg-surface-container-lowest ${className}`}>
        <div
          className="relative grid aspect-video place-items-center bg-cover bg-center"
          style={
            jugada.poster_url ? { backgroundImage: `url(${jugada.poster_url})` } : undefined
          }
        >
          <div className="absolute inset-0 bg-surface-container-lowest/80" />
          <div className="relative flex flex-col items-center gap-3 p-6 text-center">
            <span className="relative grid h-14 w-14 place-items-center">
              <span className="clip-hex absolute inset-0 bg-volt" />
              <Icon name="open_in_new" className="relative text-2xl text-on-secondary" />
            </span>
            <p className="font-display text-base font-bold">
              {jugada.title || play.label}
            </p>
            <p className="max-w-xs text-xs text-on-surface-variant">
              Esta jugada está publicada en otro sitio, así que se ve allá. El marco del
              campeonato solo se puede poner en los clips subidos acá.
            </p>
            <a
              href={jugada.video_url || '#'}
              target="_blank"
              rel="noopener noreferrer"
              className="btn-sheen inline-flex items-center gap-2 rounded-lg bg-volt px-4 py-2 font-display text-sm font-bold text-on-secondary"
            >
              <Icon name="play_arrow" className="text-base" /> Ver la jugada
            </a>
          </div>
        </div>
      </div>
    )
  }

  const progreso = duracion ? (tiempo / duracion) * 1000 : 0

  return (
    <div className={className}>
      <div
        ref={cajaRef}
        className="relative overflow-hidden rounded-xl border border-outline-variant/70 bg-surface-container-lowest"
      >
        {/* El canvas ES la imagen: el video solo decodifica y suena. */}
        <canvas ref={canvasRef} className="block w-full" />

        <video
          ref={videoRef}
          src={fuente || undefined}
          poster={jugada.poster_url || undefined}
          // Anónimo para que el canvas no quede manchado cuando el backend
          // está en otro puerto (desarrollo): el middleware de CORS ya manda
          // las cabeceras. En producción es el mismo origen y no estorba.
          crossOrigin="anonymous"
          playsInline
          preload="metadata"
          muted={mudo}
          autoPlay={autoPlay}
          className="hidden"
          onLoadedMetadata={(e) => {
            const v = e.currentTarget
            if (v.videoWidth && v.videoHeight) setProporcion(v.videoWidth / v.videoHeight)
            if (Number.isFinite(v.duration) && v.duration > 0) setDuracion(v.duration)
            setListo(true)
            requestAnimationFrame(pintar)
          }}
          onLoadedData={() => requestAnimationFrame(pintar)}
          onSeeked={() => requestAnimationFrame(pintar)}
          onPlay={() => setSonando(true)}
          onPause={() => setSonando(false)}
          onEnded={() => setSonando(false)}
          onError={() =>
            setFallo(
              'No se pudo reproducir el clip. Si lo acabas de subir desde un iPhone, ' +
                'vuelve a exportarlo como MP4: el formato .mov no lo abren todos los navegadores.',
            )
          }
        />

        {/* Botón grande de reproducir, sobre el fotograma */}
        {!sonando && !exportando && !fallo && (
          <button
            onClick={alternar}
            aria-label="Reproducir"
            className="group absolute inset-0 grid place-items-center"
          >
            <span className="relative grid h-16 w-16 place-items-center transition duration-200 ease-snap group-hover:scale-105">
              <span className="clip-hex absolute inset-0 bg-volt shadow-volt" />
              <Icon
                name="play_arrow"
                className="relative text-3xl leading-none text-on-secondary"
              />
            </span>
          </button>
        )}

        {/* Grabando: el marco se quema en tiempo real, así que hay que decirlo */}
        {exportando && (
          <div className="absolute inset-0 grid place-items-center bg-surface-container-lowest/85 px-6 text-center">
            <div className="w-full max-w-xs">
              <p className="font-display text-sm font-bold">Grabando el clip con marco…</p>
              <p className="mt-1 text-xs text-on-surface-variant">
                Va en tiempo real: tarda lo que dura la jugada.
              </p>
              <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-surface-container-high">
                <div
                  className="h-full rounded-full bg-volt transition-[width] duration-200"
                  style={{ width: `${Math.round(avance * 100)}%` }}
                />
              </div>
            </div>
          </div>
        )}

        {fallo && (
          <div className="absolute inset-0 grid place-items-center bg-surface-container-lowest/90 px-6">
            <p className="max-w-sm text-center text-xs text-tertiary">{fallo}</p>
          </div>
        )}
      </div>

      {/* --- Controles --- */}
      <div className="mt-2 flex items-center gap-2.5">
        <button
          onClick={alternar}
          disabled={!!fallo}
          aria-label={sonando ? 'Pausar' : 'Reproducir'}
          className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-surface-container-high text-on-surface transition hover:bg-surface-bright disabled:opacity-40"
        >
          <Icon name={sonando ? 'pause' : 'play_arrow'} className="text-lg" />
        </button>
        <input
          type="range"
          min={0}
          max={1000}
          value={progreso}
          onChange={buscar}
          disabled={!listo || !duracion}
          aria-label="Avance del clip"
          className="h-1 flex-1 cursor-pointer appearance-none rounded-full bg-surface-container-high accent-volt"
        />
        <span className="tnum shrink-0 text-xs text-on-surface-variant">
          {duracionLegible(tiempo)} / {duracionLegible(duracion)}
        </span>
        <button
          onClick={() => setMudo((m) => !m)}
          aria-label={mudo ? 'Activar sonido' : 'Silenciar'}
          className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-surface-container-high text-on-surface transition hover:bg-surface-bright"
        >
          <Icon name={mudo ? 'volume_off' : 'volume_up'} className="text-base" />
        </button>
      </div>

      {/* --- Exportar: el marco quemado en el archivo --- */}
      <div className="mt-2.5 flex flex-wrap items-center gap-2">
        <button
          onClick={() => exportar(true)}
          disabled={exportando || !!motivo}
          title={motivo || 'Graba el clip con el marco puesto'}
          className="btn-sheen inline-flex items-center gap-1.5 rounded-lg bg-volt px-3 py-1.5 font-display text-xs font-bold text-on-secondary transition disabled:cursor-not-allowed disabled:opacity-40"
        >
          <Icon name="ios_share" className="text-sm" /> Compartir con marco
        </button>
        <button
          onClick={() => exportar(false)}
          disabled={exportando || !!motivo}
          title={motivo || 'Descarga el archivo con el marco quemado'}
          className="inline-flex items-center gap-1.5 rounded-lg border border-outline-variant px-3 py-1.5 font-display text-xs font-bold text-on-surface transition hover:border-secondary/70 hover:text-secondary disabled:cursor-not-allowed disabled:opacity-40"
        >
          <Icon name="download" className="text-sm" /> Descargar
        </button>
        <span className="text-[11px] text-on-surface-variant">
          {sportOf(torneo.sport_type).label}
        </span>
      </div>

      {(aviso || motivo) && (
        <p className="mt-2 text-[11px] leading-snug text-tertiary">{aviso || motivo}</p>
      )}
    </div>
  )
}
