import { useEffect, useRef, useState } from 'react'
import { api } from '../services/api'
import { Badge, Icon, Spinner } from './ui'

/** Icono y color por tipo de aviso; el tipo lo fija services/notifications.py. */
const ESTILO: Record<string, { icon: string; color: string }> = {
  partido_reprogramado: { icon: 'event_repeat', color: 'text-tertiary' },
  partido_cancha: { icon: 'stadium', color: 'text-secondary' },
  partido_programado: { icon: 'event_available', color: 'text-secondary' },
  partido_resultado: { icon: 'scoreboard', color: 'text-primary' },
  partido_en_vivo: { icon: 'play_circle', color: 'text-tertiary' },
  general: { icon: 'campaign', color: 'text-on-surface-variant' },
}

/** "hace 5 min", "hace 2 h", "hace 3 d" — el detalle exacto va en el cuerpo. */
function haceCuanto(iso?: string | null): string {
  if (!iso) return ''
  const t = new Date(iso.endsWith('Z') ? iso : `${iso}Z`).getTime()
  const min = Math.max(0, Math.round((Date.now() - t) / 60000))
  if (min < 1) return 'ahora'
  if (min < 60) return `hace ${min} min`
  if (min < 1440) return `hace ${Math.round(min / 60)} h`
  return `hace ${Math.round(min / 1440)} d`
}

export default function NotificationsBell() {
  const [open, setOpen] = useState(false)
  const [items, setItems] = useState<any[]>([])
  const [unread, setUnread] = useState(0)
  const [loading, setLoading] = useState(false)
  const caja = useRef<HTMLDivElement>(null)

  async function cargarContador() {
    try {
      setUnread((await api.unreadCount())?.unread || 0)
    } catch {
      /* sin sesión o sin red: la campana simplemente no muestra número */
    }
  }

  useEffect(() => {
    cargarContador()
    const id = setInterval(cargarContador, 60000)
    return () => clearInterval(id)
  }, [])

  // Cerrar al hacer clic fuera del panel.
  useEffect(() => {
    if (!open) return
    const fuera = (e: MouseEvent) => {
      if (caja.current && !caja.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', fuera)
    return () => document.removeEventListener('mousedown', fuera)
  }, [open])

  async function abrir() {
    setOpen((v) => !v)
    if (open) return
    setLoading(true)
    try {
      setItems(await api.notifications())
    } catch {
      setItems([])
    } finally {
      setLoading(false)
    }
  }

  async function marcarTodos() {
    await api.markAllNotificationsRead().catch(() => {})
    setItems((xs) => xs.map((x) => ({ ...x, read_at: x.read_at || new Date().toISOString() })))
    setUnread(0)
  }

  async function marcarUno(id: string) {
    await api.markNotificationRead(id).catch(() => {})
    setItems((xs) =>
      xs.map((x) => (x.id === id ? { ...x, read_at: new Date().toISOString() } : x)),
    )
    setUnread((n) => Math.max(0, n - 1))
  }

  return (
    <div className="relative" ref={caja}>
      <button
        onClick={abrir}
        title="Avisos"
        className="relative flex items-center gap-1 rounded-lg bg-surface-container-high px-3 py-1.5 text-sm hover:bg-surface-bright"
      >
        <Icon name="notifications" className="text-base" />
        {unread > 0 && (
          <span className="absolute -right-1 -top-1 grid h-4 min-w-4 place-items-center rounded-full bg-error px-1 text-[10px] font-bold text-on-error">
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 z-40 mt-2 w-[min(92vw,26rem)] overflow-hidden rounded-xl border border-outline-variant/40 bg-surface-container shadow-2xl">
          <div className="flex items-center justify-between border-b border-outline-variant/30 px-4 py-2.5">
            <span className="flex items-center gap-2 font-display text-sm font-semibold">
              <Icon name="notifications" className="text-base text-secondary" /> Avisos
              {unread > 0 && (
                <Badge className="bg-error-container text-on-error-container">{unread}</Badge>
              )}
            </span>
            {items.some((x) => !x.read_at) && (
              <button onClick={marcarTodos} className="text-xs text-secondary hover:underline">
                Marcar todo leído
              </button>
            )}
          </div>
          <div className="max-h-[60vh] overflow-y-auto">
            {loading ? (
              <div className="grid place-items-center py-10">
                <Spinner />
              </div>
            ) : items.length === 0 ? (
              <p className="px-4 py-8 text-center text-sm text-on-surface-variant">
                Sin avisos por ahora. Aquí llegan los cambios de horario y cancha de tus
                partidos.
              </p>
            ) : (
              <ul className="divide-y divide-outline-variant/25">
                {items.map((n) => {
                  const est = ESTILO[n.type] || ESTILO.general
                  return (
                    <li
                      key={n.id}
                      onClick={() => !n.read_at && marcarUno(n.id)}
                      className={`flex cursor-pointer gap-3 px-4 py-3 transition hover:bg-surface-container-high ${
                        n.read_at ? 'opacity-60' : ''
                      }`}
                    >
                      <Icon name={est.icon} className={`mt-0.5 text-lg ${est.color}`} />
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold leading-snug">{n.title}</p>
                        {n.body && (
                          <p className="mt-0.5 text-xs text-on-surface-variant">{n.body}</p>
                        )}
                        <p className="mt-1 text-[11px] text-on-surface-variant/70">
                          {haceCuanto(n.created_at)}
                        </p>
                      </div>
                      {!n.read_at && (
                        <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-secondary" />
                      )}
                    </li>
                  )
                })}
              </ul>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
