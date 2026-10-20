/**
 * Importar equipos y nóminas desde Excel, en dos pasos que no se saltan.
 *
 * Primero se valida (`dry_run`) y se muestra lo que pasaría: qué equipos son
 * nuevos, qué jugadores se crean o se actualizan, y cada error con su número
 * de fila para corregirlo en el Excel. Recién entonces se importa, y con un
 * solo error el botón no se habilita: el backend tampoco importaría nada, y
 * una nómina a medias es peor que ninguna.
 */
import { useRef, useState } from 'react'
import { api } from '../services/api'
import { Badge, Button, Card, Icon, Spinner } from './ui'

export default function ImportarNomina({
  tournament,
  onClose,
  onImported,
}: {
  tournament: any
  onClose: () => void
  onImported: () => void
}) {
  const [archivo, setArchivo] = useState<File | null>(null)
  const [analisis, setAnalisis] = useState<any>(null)
  const [estado, setEstado] = useState<'idle' | 'validando' | 'importando' | 'listo'>('idle')
  const [error, setError] = useState<string | null>(null)
  const [abierto, setAbierto] = useState<string | null>(null)
  const input = useRef<HTMLInputElement>(null)

  async function validar(f: File) {
    setArchivo(f)
    setAnalisis(null)
    setError(null)
    setEstado('validando')
    try {
      setAnalisis(await api.importRoster(tournament.id, f, true))
    } catch (e: any) {
      setError(e.message)
    } finally {
      setEstado('idle')
    }
  }

  async function importar() {
    if (!archivo) return
    setEstado('importando')
    setError(null)
    try {
      setAnalisis(await api.importRoster(tournament.id, archivo, false))
      setEstado('listo')
      onImported()
    } catch (e: any) {
      setError(e.message)
      setEstado('idle')
    }
  }

  const r = analisis?.summary
  const errores: any[] = analisis?.errors || []
  const avisos: any[] = analisis?.warnings || []
  const hecho = estado === 'listo' ? analisis?.result : null

  return (
    <Card className="p-4">
      <div className="mb-3 flex flex-wrap items-start justify-between gap-2">
        <div>
          <h3 className="headline text-lg">Importar nómina desde Excel</h3>
          <p className="text-xs text-on-surface-variant">
            Una fila por jugador: Equipo, Jugador y, si los tienes, Grupo, Documento, Dorsal y Correo. Subir
            la misma planilla otra vez actualiza; no duplica.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="ghost" className="px-3 py-1.5 text-xs" onClick={() => api.rosterTemplate().catch((e) => setError(e.message))}>
            <Icon name="download" className="text-base" /> Plantilla
          </Button>
          <button onClick={onClose} className="text-on-surface-variant hover:text-on-surface" title="Cerrar">
            <Icon name="close" />
          </button>
        </div>
      </div>

      <input
        ref={input}
        type="file"
        accept=".xlsx,.csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,text/csv"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0]
          e.target.value = ''
          if (f) validar(f)
        }}
      />
      <button
        onClick={() => input.current?.click()}
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => {
          e.preventDefault()
          const f = e.dataTransfer.files?.[0]
          if (f) validar(f)
        }}
        className="flex w-full flex-col items-center gap-1 rounded-xl border-2 border-dashed border-outline-variant px-4 py-6 text-sm text-on-surface-variant transition hover:border-secondary/60 hover:text-secondary"
      >
        {estado === 'validando' ? (
          <Spinner />
        ) : (
          <Icon name="upload_file" className="text-3xl" />
        )}
        <span className="font-semibold">
          {archivo ? archivo.name : 'Elige o arrastra la planilla (.xlsx o .csv)'}
        </span>
        {archivo && <span className="text-xs">Toca para elegir otra</span>}
      </button>

      {error && (
        <p className="mt-3 flex items-center gap-2 rounded-lg bg-error-container/40 px-3 py-2 text-sm text-error">
          <Icon name="error" className="text-base" /> {error}
        </p>
      )}

      {hecho && (
        <p className="mt-3 flex items-center gap-2 rounded-lg bg-secondary/15 px-3 py-2 text-sm text-secondary">
          <Icon name="task_alt" className="text-base" />
          Listo: {hecho.teams_created} equipo(s) nuevo(s), {hecho.players_created} jugador(es) nuevo(s),{' '}
          {hecho.players_updated} actualizado(s).
        </p>
      )}

      {analisis && !hecho && (
        <div className="mt-4 space-y-3">
          <div className="flex flex-wrap gap-2 text-xs">
            <Badge className="bg-secondary/15 text-secondary">{r.teams_new} equipo(s) nuevo(s)</Badge>
            <Badge className="bg-surface-container-high text-on-surface">{r.teams_existing} ya inscrito(s)</Badge>
            <Badge className="bg-secondary/15 text-secondary">{r.players_new} jugador(es) nuevo(s)</Badge>
            <Badge className="bg-primary/15 text-primary">{r.players_updated} a actualizar</Badge>
            {r.players_same > 0 && (
              <Badge className="bg-surface-container-high text-on-surface-variant">{r.players_same} sin cambios</Badge>
            )}
          </div>

          {errores.length > 0 && (
            <div className="rounded-lg border border-error/40 bg-error-container/20 p-3">
              <p className="mb-1 text-sm font-bold text-error">
                <Icon name="error" className="mr-1 align-middle text-base" />
                {errores.length} error(es): corrígelos en el Excel y vuelve a subirlo. No se importa nada
                hasta entonces.
              </p>
              <ul className="max-h-48 space-y-0.5 overflow-y-auto text-sm">
                {errores.map((e, i) => (
                  <li key={i}>
                    {e.row && <span className="tnum mr-1 font-semibold">Fila {e.row}:</span>}
                    {e.message}
                  </li>
                ))}
              </ul>
            </div>
          )}
          {avisos.length > 0 && (
            <div className="rounded-lg border border-tertiary/40 bg-tertiary/10 p-3">
              <p className="mb-1 text-sm font-bold text-tertiary">
                <Icon name="warning" className="mr-1 align-middle text-base" />
                {avisos.length} aviso(s) — no impiden importar
              </p>
              <ul className="max-h-36 space-y-0.5 overflow-y-auto text-sm">
                {avisos.map((a, i) => (
                  <li key={i}>
                    {a.row && <span className="tnum mr-1 font-semibold">Fila {a.row}:</span>}
                    {a.message}
                  </li>
                ))}
              </ul>
            </div>
          )}

          <ul className="divide-y divide-outline-variant/30 rounded-lg border border-outline-variant/50">
            {analisis.teams.map((t: any) => (
              <li key={t.name}>
                <button
                  className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-surface-container-high"
                  onClick={() => setAbierto(abierto === t.name ? null : t.name)}
                >
                  <Icon name={abierto === t.name ? 'expand_less' : 'expand_more'} className="text-base" />
                  <span className="font-semibold">{t.name}</span>
                  {t.group && <span className="text-on-surface-variant">· Grupo {t.group}</span>}
                  <Badge
                    className={`ml-auto ${t.exists ? 'bg-surface-container-high text-on-surface-variant' : 'bg-secondary/15 text-secondary'}`}
                  >
                    {t.exists ? 'Ya inscrito' : 'Nuevo'}
                  </Badge>
                  <span className="tnum text-xs text-on-surface-variant">{t.players.length} jug.</span>
                </button>
                {abierto === t.name && (
                  <ul className="space-y-0.5 px-9 pb-2 text-xs">
                    {t.players.length === 0 && <li className="text-on-surface-variant">Sin jugadores en la planilla.</li>}
                    {t.players.map((p: any) => (
                      <li key={p.row} className="flex items-center gap-2">
                        <span className="tnum w-6 text-right text-on-surface-variant">{p.number ?? '—'}</span>
                        <span>{p.name}</span>
                        {p.identification_number && (
                          <span className="text-on-surface-variant">{p.identification_number}</span>
                        )}
                        <span
                          className={`ml-auto ${
                            p.action === 'new'
                              ? 'text-secondary'
                              : p.action === 'update'
                                ? 'text-primary'
                                : 'text-on-surface-variant'
                          }`}
                        >
                          {p.action === 'new' ? 'nuevo' : p.action === 'update' ? 'se actualiza' : 'igual'}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </li>
            ))}
          </ul>

          <Button disabled={errores.length > 0 || estado === 'importando'} onClick={importar}>
            <Icon name="done_all" className="text-base" />
            {estado === 'importando' ? 'Importando…' : 'Importar'}
          </Button>
        </div>
      )}
    </Card>
  )
}
