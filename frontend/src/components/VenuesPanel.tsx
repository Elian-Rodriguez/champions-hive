import { useEffect, useState } from 'react'
import { api } from '../services/api'
import { Badge, Button, Card, EmptyState, Icon, Input, Spinner } from './ui'

export default function VenuesPanel() {
  const [venues, setVenues] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [name, setName] = useState('')
  const [location, setLocation] = useState('')
  const [courtName, setCourtName] = useState<Record<string, string>>({})
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
          <EmptyState icon="stadium" title="Sin sedes" hint="Crea una sede y sus canchas para poder generar fixtures." />
        ) : (
          venues.map((v) => (
            <Card key={v.id} className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-display font-semibold">{v.name}</h3>
                  {v.location && <p className="text-sm text-on-surface-variant">{v.location}</p>}
                </div>
                <Badge className="bg-surface-container-highest text-on-surface-variant">
                  {(v.courts || []).length} cancha(s)
                </Badge>
              </div>

              <div className="mt-3 flex flex-wrap gap-2">
                {(v.courts || []).map((c: any) => (
                  <Badge key={c.id} className="bg-secondary-container/30 text-secondary">
                    <Icon name="sports_soccer" className="mr-1 text-sm" /> {c.name}
                  </Badge>
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
