import { useEffect, useState } from 'react'
import { api } from '../services/api'
import { Badge, Button, Card, EmptyState, Icon, Input, Select, Spinner } from './ui'

export default function UsersPanel() {
  const [users, setUsers] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [role, setRole] = useState('referee')
  const [error, setError] = useState<string | null>(null)

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

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-[320px_1fr]">
      <Card className="h-fit p-4">
        <h2 className="mb-3 font-display font-semibold">Nuevo usuario</h2>
        <form
          onSubmit={async (e) => {
            e.preventDefault()
            if (!email.trim() || !password) return
            try {
              await api.register({ email, password, role })
              setEmail('')
              setPassword('')
              load()
            } catch (e: any) {
              setError(e.message)
            }
          }}
          className="space-y-2"
        >
          <Input type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} />
          <Input type="password" placeholder="Contraseña" value={password} onChange={(e) => setPassword(e.target.value)} />
          <Select value={role} onChange={(e) => setRole(e.target.value)}>
            <option value="admin">Administrador</option>
            <option value="referee">Árbitro</option>
          </Select>
          <Button type="submit" className="w-full">
            <Icon name="person_add" /> Crear usuario
          </Button>
        </form>
      </Card>

      <Card className="p-2">
        {error && <p className="px-3 py-2 text-sm text-error">{error}</p>}
        {loading ? (
          <div className="grid place-items-center py-16">
            <Spinner />
          </div>
        ) : users.length === 0 ? (
          <EmptyState icon="group" title="Sin usuarios" />
        ) : (
          <ul className="divide-y divide-outline-variant/30">
            {users.map((u) => (
              <li key={u.id} className="flex items-center justify-between px-3 py-3">
                <span className="flex items-center gap-2">
                  <Icon name="account_circle" className="text-on-surface-variant" />
                  {u.email}
                </span>
                <span className="flex items-center gap-3">
                  <Badge className="bg-primary-container text-on-primary-container">
                    {u.role}
                  </Badge>
                  <button
                    onClick={async () => {
                      if (confirm(`¿Eliminar a ${u.email}?`)) {
                        await api.deleteUser(u.id)
                        load()
                      }
                    }}
                    className="text-error/80 hover:text-error"
                  >
                    <Icon name="delete" className="text-lg" />
                  </button>
                </span>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  )
}
