import { useEffect, useState } from 'react'
import { api } from '../services/api'
import { Badge, Button, Card, EmptyState, Icon, Input, Spinner } from './ui'

export default function VenuesPanel() {
  const [venues, setVenues] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [name, setName] = useState('')
  const [location, setLocation] = useState('')
  const [courtName, setCourtName] = useState<Record<string, string>>({})
  const [editing, setEditing] = useState<string | null>(null)
  const [edit, setEdit] = useState<{ name: string; location: string }>({ name: '', location: '' })
  const [error, setError] = useState<string | null>(null)

  async function load() {
    setLoading(true)
    try {
      setVenues(await api.getVenues())
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
        <h2 className="mb-3 font-display font-semibold">Nueva sede</h2>
        <form
          onSubmit={async (e) => {
            e.preventDefault()
            if (!name.trim()) return
            await api.createVenue({ name, location })
            setName('')
            setLocation('')
            load()
          }}
          className="space-y-2"
        >
          <Input placeholder="Nombre" value={name} onChange={(e) => setName(e.target.value)} />
          <Input placeholder="Ubicación" value={location} onChange={(e) => setLocation(e.target.value)} />
          <Button type="submit" className="w-full">
            <Icon name="add" /> Crear sede
          </Button>
        </form>
      </Card>

      <div className="space-y-4">
        {error && <p className="text-sm text-error">{error}</p>}
        {loading ? (
          <div className="grid place-items-center py-16">
            <Spinner />
          </div>
        ) : venues.length === 0 ? (
          <EmptyState icon="stadium" title="Sin sedes" hint="Crea una sede y sus canchas para generar fixtures." />
        ) : (
          venues.map((v) => (
            <Card key={v.id} className="p-4">
              {editing === v.id ? (
                <div className="flex flex-wrap items-center gap-2">
                  <Input value={edit.name} onChange={(e) => setEdit({ ...edit, name: e.target.value })} className="flex-1" />
                  <Input value={edit.location} onChange={(e) => setEdit({ ...edit, location: e.target.value })} className="flex-1" placeholder="Ubicación" />
                  <Button
                    variant="outline"
                    onClick={async () => {
                      await api.updateVenue(v.id, edit)
                      setEditing(null)
                      load()
                    }}
                  >
                    <Icon name="save" />
                  </Button>
                  <button onClick={() => setEditing(null)} className="text-on-surface-variant hover:text-on-surface">
                    <Icon name="close" />
                  </button>
                </div>
              ) : (
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-display font-semibold">{v.name}</h3>
                    {v.location && <p className="text-sm text-on-surface-variant">{v.location}</p>}
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge className="bg-surface-container-highest text-on-surface-variant">{(v.courts || []).length} cancha(s)</Badge>
                    <button
                      onClick={() => {
                        setEditing(v.id)
                        setEdit({ name: v.name, location: v.location || '' })
                      }}
                      className="text-on-surface-variant hover:text-on-surface"
                    >
                      <Icon name="edit" className="text-lg" />
                    </button>
                    <button
                      onClick={async () => {
                        if (confirm(`¿Eliminar la sede "${v.name}" y sus canchas?`)) {
                          await api.deleteVenue(v.id)
                          load()
                        }
                      }}
                      className="text-error/80 hover:text-error"
                    >
                      <Icon name="delete" className="text-lg" />
                    </button>
                  </div>
                </div>
              )}

              <div className="mt-3 flex flex-wrap gap-2">
                {(v.courts || []).map((c: any) => (
                  <span key={c.id} className="inline-flex items-center gap-1 rounded-full bg-secondary-container/30 px-2.5 py-0.5 text-xs font-semibold text-secondary">
                    <Icon name="sports_soccer" className="text-sm" /> {c.name}
                    <button
                      onClick={async () => {
                        await api.deleteCourt(c.id)
                        load()
                      }}
                      className="ml-1 text-secondary/70 hover:text-error"
                    >
                      <Icon name="close" className="text-sm" />
                    </button>
                  </span>
                ))}
              </div>

              <div className="mt-3 flex gap-2">
                <Input
                  placeholder="Nueva cancha"
                  value={courtName[v.id] || ''}
                  onChange={(e) => setCourtName({ ...courtName, [v.id]: e.target.value })}
                />
                <Button
                  variant="outline"
                  onClick={async () => {
                    const cn = (courtName[v.id] || '').trim()
                    if (!cn) return
                    await api.createCourt(v.id, { name: cn, is_active: true })
                    setCourtName({ ...courtName, [v.id]: '' })
                    load()
                  }}
                >
                  <Icon name="add" /> Cancha
                </Button>
              </div>
            </Card>
          ))
        )}
      </div>
    </div>
  )
}
