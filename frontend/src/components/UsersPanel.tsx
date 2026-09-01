import { useEffect, useMemo, useState } from 'react'
import { api } from '../services/api'
import { useAppSelector } from '../hooks'
import { Badge, Button, Card, EmptyState, Icon, Input, Select, Spinner } from './ui'

/**
 * Gestión de cuentas de la plataforma.
 *
 * El superadministrador ve y administra todo (es soporte): crea organizadores,
 * les fija el cupo de campeonatos, resetea contraseñas y activa o desactiva
 * cuentas. Un organizador entra al mismo panel pero el backend solo le
 * devuelve las cuentas que él dio de alta (sus capitanes y árbitros), así que
 * nunca ve la configuración de otro organizador.
 */

const ROLES = [
  {
    value: 'admin',
    label: 'Organizador',
    icon: 'emoji_events',
    hint: 'Crea y gestiona sus propios campeonatos. No ve los de otros organizadores.',
    soloSuper: true,
  },
  {
    value: 'referee',
    label: 'Árbitro',
    icon: 'sports',
    hint: 'Carga marcador y eventos solo de los partidos que tiene asignados.',
  },
  {
    value: 'captain',
    label: 'Capitán',
    icon: 'shield_person',
    hint: 'Consulta el calendario, la posición y las estadísticas de su equipo.',
  },
  {
    value: 'superadmin',
    label: 'Superadministrador',
    icon: 'admin_panel_settings',
    hint: 'Administra toda la plataforma, los organizadores y su cupo.',
    soloSuper: true,
  },
]

const ROL_META = Object.fromEntries(ROLES.map((r) => [r.value, r]))

const COLOR_ROL: Record<string, string> = {
  superadmin: 'bg-error-container text-on-error-container',
  admin: 'bg-secondary/20 text-secondary',
  referee: 'bg-primary-container text-on-primary-container',
  captain: 'bg-tertiary/20 text-tertiary',
}

function fecha(iso?: string | null): string {
  if (!iso) return '—'
  const d = new Date(iso.endsWith('Z') ? iso : `${iso}Z`)
  return isNaN(d.getTime()) ? '—' : d.toLocaleDateString()
}

/** Ficha de una cuenta: rol, cupo, actividad y las acciones de soporte. */
function FilaUsuario({
  u,
  esSuper,
  yo,
  onChanged,
  onError,
}: {
  u: any
  esSuper: boolean
  yo: string | null
  onChanged: () => void
  onError: (m: string) => void
}) {
  const [abierto, setAbierto] = useState(false)
  const [rol, setRol] = useState(u.role)
  const [cupo, setCupo] = useState(u.max_tournaments ?? '')
  const [nombre, setNombre] = useState(u.name || '')
  const [temp, setTemp] = useState<string | null>(null)
  const [guardando, setGuardando] = useState(false)
  const esYo = String(u.id) === String(yo)
  const meta = ROL_META[u.role]

  async function guardar() {
    setGuardando(true)
    try {
      const data: any = { name: nombre || null }
      if (esSuper) {
        data.role = rol
        data.max_tournaments = cupo === '' ? null : Number(cupo)
      }
      await api.updateUser(u.id, data)
      setAbierto(false)
      onChanged()
    } catch (e: any) {
      onError(e.message)
    } finally {
      setGuardando(false)
    }
  }

  async function resetear() {
    if (!confirm(`¿Restablecer la contraseña de ${u.email}? La actual dejará de servir.`))
      return
    try {
      const r = await api.resetUserPassword(u.id)
      setTemp(r.temp_password)
      onChanged()
    } catch (e: any) {
      onError(e.message)
    }
  }

  async function alternarEstado() {
    try {
      await api.updateUser(u.id, { is_active: !u.is_active })
      onChanged()
    } catch (e: any) {
      onError(e.message)
    }
  }

  return (
    <li className="px-3 py-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <span
            className={`grid h-9 w-9 shrink-0 place-items-center rounded-lg ${
              COLOR_ROL[u.role] || 'bg-surface-container-high'
            }`}
          >
            <Icon name={meta?.icon || 'account_circle'} className="text-lg" />
          </span>
          <div className="min-w-0">
            <p className="flex flex-wrap items-center gap-2 font-medium">
              <span className="truncate">{u.name || u.email}</span>
              {!u.is_active && (
                <Badge className="bg-error-container text-on-error-container">Inactivo</Badge>
              )}
              {u.must_change_password && (
                <Badge className="bg-tertiary/20 text-tertiary">Clave temporal</Badge>
              )}
              {esYo && <Badge className="bg-surface-container-high">Tú</Badge>}
            </p>
            <p className="truncate text-xs text-on-surface-variant">
              {u.name ? `${u.email} · ` : ''}
              {u.role === 'admin'
                ? `${u.tournaments_count ?? 0} campeonato(s)${
                    u.max_tournaments != null ? ` de ${u.max_tournaments}` : ' · sin límite'
                  }`
                : u.role === 'captain'
                  ? `${u.teams_count ?? 0} equipo(s)`
                  : `Alta ${fecha(u.created_at)}`}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge className={COLOR_ROL[u.role] || 'bg-surface-container-high'}>
            {meta?.label || u.role}
          </Badge>
          <button
            onClick={() => setAbierto((v) => !v)}
            title="Editar"
            className="rounded-lg bg-surface-container-high px-2 py-1.5 hover:bg-surface-bright"
          >
            <Icon name={abierto ? 'expand_less' : 'edit'} className="text-base" />
          </button>
          <button
            onClick={resetear}
            title="Restablecer contraseña"
            className="rounded-lg bg-surface-container-high px-2 py-1.5 hover:bg-surface-bright"
          >
            <Icon name="lock_reset" className="text-base" />
          </button>
          {!esYo && (
            <button
              onClick={async () => {
                if (confirm(`¿Eliminar a ${u.email}?`)) {
                  try {
                    await api.deleteUser(u.id)
                    onChanged()
                  } catch (e: any) {
                    onError(e.message)
                  }
                }
              }}
              title="Eliminar"
              className="rounded-lg px-2 py-1.5 text-error/80 hover:text-error"
            >
              <Icon name="delete" className="text-base" />
            </button>
          )}
        </div>
      </div>

      {temp && (
        <div className="mt-3 flex flex-wrap items-center gap-3 rounded-lg border border-tertiary/40 bg-tertiary/10 px-3 py-2 text-sm">
          <Icon name="key" className="text-tertiary" />
          <span>
            Contraseña temporal de <b>{u.email}</b>:
            <code className="ml-2 rounded bg-surface-container-high px-2 py-0.5 font-mono">
              {temp}
            </code>
          </span>
          <button
            onClick={() => navigator.clipboard?.writeText(temp)}
            className="text-xs text-secondary hover:underline"
          >
            Copiar
          </button>
          <span className="text-xs text-on-surface-variant">
            Se muestra una sola vez; la tendrá que cambiar al entrar.
          </span>
          <button onClick={() => setTemp(null)} className="ml-auto">
            <Icon name="close" className="text-base" />
          </button>
        </div>
      )}

      {abierto && (
        <div className="mt-3 grid gap-2 rounded-lg bg-surface-container-high p-3 sm:grid-cols-2">
          <label className="text-xs text-on-surface-variant">
            Nombre visible
            <Input
              className="mt-1"
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              placeholder="Nombre y apellido"
            />
          </label>
          {esSuper && (
            <label className="text-xs text-on-surface-variant">
              Rol
              <Select className="mt-1" value={rol} onChange={(e) => setRol(e.target.value)}>
                {ROLES.map((r) => (
                  <option key={r.value} value={r.value}>
                    {r.label}
                  </option>
                ))}
              </Select>
            </label>
          )}
          {esSuper && rol === 'admin' && (
            <label className="text-xs text-on-surface-variant sm:col-span-2">
              Campeonatos que puede crear (vacío = sin límite)
              <Input
                className="mt-1"
                type="number"
                min={0}
                value={cupo}
                onChange={(e) => setCupo(e.target.value)}
                placeholder="Sin límite"
              />
              <span className="mt-1 block">
                Lleva {u.tournaments_count ?? 0} creado(s). Al alcanzar el cupo, la
                plataforma le bloquea la creación de nuevos campeonatos.
              </span>
            </label>
          )}
          <div className="flex items-end gap-2 sm:col-span-2">
            <Button onClick={guardar} disabled={guardando}>
              <Icon name="save" /> Guardar
            </Button>
            {!esYo && (
              <Button variant={u.is_active ? 'outline' : 'primary'} onClick={alternarEstado}>
                <Icon name={u.is_active ? 'block' : 'check_circle'} />
                {u.is_active ? 'Desactivar' : 'Activar'}
              </Button>
            )}
          </div>
        </div>
      )}
    </li>
  )
}

export default function UsersPanel() {
  const { role, userId } = useAppSelector((s) => s.auth)
  const esSuper = role === 'superadmin'
  const [users, setUsers] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [email, setEmail] = useState('')
  const [nombre, setNombre] = useState('')
  const [password, setPassword] = useState('')
  const [rol, setRol] = useState(esSuper ? 'admin' : 'captain')
  const [cupo, setCupo] = useState('')
  const [filtro, setFiltro] = useState('')
  const [filtroRol, setFiltroRol] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [ok, setOk] = useState<string | null>(null)

  const disponibles = ROLES.filter((r) => esSuper || !r.soloSuper)

  async function load() {
    setLoading(true)
    try {
      setUsers(await api.listUsers())
    } catch (e: any) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }
  useEffect(() => {
    load()
  }, [])

  const visibles = useMemo(() => {
    const q = filtro.trim().toLowerCase()
    return users
      .filter((u) => !filtroRol || u.role === filtroRol)
      .filter(
        (u) =>
          !q ||
          (u.email || '').toLowerCase().includes(q) ||
          (u.name || '').toLowerCase().includes(q),
      )
      .sort((a, b) => (a.role || '').localeCompare(b.role || ''))
  }, [users, filtro, filtroRol])

  const totales = useMemo(() => {
    const t: Record<string, number> = {}
    users.forEach((u) => (t[u.role] = (t[u.role] || 0) + 1))
    return t
  }, [users])

  async function crear(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setOk(null)
    if (!email.trim() || !password) return
    try {
      await api.register({
        email,
        password,
        role: rol,
        name: nombre || null,
        ...(esSuper && rol === 'admin' && cupo !== '' ? { max_tournaments: Number(cupo) } : {}),
      })
      setOk(`Cuenta creada para ${email}`)
      setEmail('')
      setNombre('')
      setPassword('')
      setCupo('')
      load()
    } catch (e: any) {
      setError(e.message)
    }
  }

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-[340px_1fr]">
      <div className="space-y-4">
        <Card className="h-fit p-4">
          <h2 className="mb-3 flex items-center gap-2 font-display font-semibold">
            <Icon name="person_add" className="text-secondary" /> Nueva cuenta
          </h2>
          <form onSubmit={crear} className="space-y-2">
            <Input
              type="email"
              placeholder="Email (será el usuario)"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            <Input
              placeholder="Nombre visible (opcional)"
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
            />
            <Input
              type="password"
              placeholder="Contraseña (mínimo 6 caracteres)"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            <Select value={rol} onChange={(e) => setRol(e.target.value)}>
              {disponibles.map((r) => (
                <option key={r.value} value={r.value}>
                  {r.label}
                </option>
              ))}
            </Select>
            {esSuper && rol === 'admin' && (
              <Input
                type="number"
                min={0}
                placeholder="Campeonatos permitidos (vacío = sin límite)"
                value={cupo}
                onChange={(e) => setCupo(e.target.value)}
              />
            )}
            <p className="text-xs text-on-surface-variant">{ROL_META[rol]?.hint}</p>
            {error && <p className="text-sm text-error">{error}</p>}
            {ok && <p className="text-sm text-secondary">{ok}</p>}
            <Button type="submit" className="w-full">
              <Icon name="person_add" /> Crear cuenta
            </Button>
          </form>
        </Card>

        <Card className="p-4">
          <h3 className="mb-2 font-display text-sm font-semibold">Roles de la plataforma</h3>
          <ul className="space-y-2 text-xs text-on-surface-variant">
            {ROLES.map((r) => (
              <li key={r.value} className="flex gap-2">
                <Icon name={r.icon} className="text-base text-secondary" />
                <span>
                  <b className="text-on-surface">{r.label}</b>
                  {totales[r.value] ? ` (${totales[r.value]})` : ''} — {r.hint}
                </span>
              </li>
            ))}
          </ul>
          {!esSuper && (
            <p className="mt-3 rounded-lg bg-surface-container-high p-2 text-xs text-on-surface-variant">
              Solo ves las cuentas que tú creaste. Las de otros organizadores y las altas
              de la plataforma las gestiona el superadministrador.
            </p>
          )}
        </Card>
      </div>

      <Card className="p-2">
        <div className="flex flex-wrap items-center gap-2 border-b border-outline-variant/30 p-2">
          <Input
            className="max-w-xs"
            placeholder="Buscar por nombre o email…"
            value={filtro}
            onChange={(e) => setFiltro(e.target.value)}
          />
          <Select
            className="max-w-[12rem]"
            value={filtroRol}
            onChange={(e) => setFiltroRol(e.target.value)}
          >
            <option value="">Todos los roles</option>
            {ROLES.map((r) => (
              <option key={r.value} value={r.value}>
                {r.label}
              </option>
            ))}
          </Select>
          <span className="ml-auto text-sm text-on-surface-variant">
            {visibles.length} cuenta(s)
          </span>
        </div>
        {error && <p className="px-3 py-2 text-sm text-error">{error}</p>}
        {loading ? (
          <div className="grid place-items-center py-16">
            <Spinner />
          </div>
        ) : visibles.length === 0 ? (
          <EmptyState
            icon="group"
            title="Sin cuentas que mostrar"
            hint="Crea la primera con el formulario de la izquierda."
          />
        ) : (
          <ul className="divide-y divide-outline-variant/30">
            {visibles.map((u) => (
              <FilaUsuario
                key={u.id}
                u={u}
                esSuper={esSuper}
                yo={userId}
                onChanged={load}
                onError={setError}
              />
            ))}
          </ul>
        )}
        {esSuper && <ActividadDeCuentas />}
      </Card>
    </div>
  )
}

/** Historial de las cuentas: altas, reseteos y recuperaciones por correo.
 *
 *  Es lo que responde «¿quién me restableció la clave?» y «¿alguien pidió
 *  recuperar mi cuenta?». Solo para el superadministrador, que es quien da
 *  soporte; lo de cada campeonato se lee en la pestaña Historial del torneo. */
function ActividadDeCuentas() {
  const [filas, setFilas] = useState<any[]>([])
  const [abierto, setAbierto] = useState(false)
  const [cargado, setCargado] = useState(false)

  useEffect(() => {
    if (!abierto || cargado) return
    api
      .platformAudit(100)
      .then(setFilas)
      .catch(() => setFilas([]))
      .finally(() => setCargado(true))
  }, [abierto, cargado])

  return (
    <div className="border-t border-outline-variant/30">
      <button
        onClick={() => setAbierto((v) => !v)}
        className="flex w-full items-center gap-2 px-3 py-2.5 text-sm font-semibold text-on-surface-variant transition hover:text-on-surface"
      >
        <Icon name="history" className="text-base" />
        Actividad de cuentas
        <Icon
          name={abierto ? 'expand_less' : 'expand_more'}
          className="ml-auto text-base"
        />
      </button>
      {abierto && (
        <div className="px-3 pb-3">
          {!cargado ? (
            <div className="grid place-items-center py-6">
              <Spinner className="h-5 w-5" />
            </div>
          ) : filas.length === 0 ? (
            <p className="py-4 text-center text-sm text-on-surface-variant">
              Todavía no hay movimientos de cuentas.
            </p>
          ) : (
            <ul className="space-y-1">
              {filas.map((f) => (
                <li
                  key={f.id}
                  className="flex flex-wrap items-center gap-x-2 rounded-lg bg-surface-container-high px-3 py-1.5 text-sm"
                >
                  <span className="min-w-0 flex-1 truncate">{f.summary}</span>
                  <span className="text-xs text-on-surface-variant">
                    {fecha(f.created_at)} · {f.user_email || 'sin sesión'}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  )
}
