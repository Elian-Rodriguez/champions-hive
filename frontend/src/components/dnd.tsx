import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
} from 'react'
import { Reorder, useDragControls, type DragControls } from 'framer-motion'
import { Icon } from './ui'

// Primitivas de arrastrar y soltar compartidas por el panel de administración.
// Todo va sobre eventos de puntero (no sobre la API HTML5 de drag) para que
// funcione igual con mouse y con el dedo, que es como se usa la PWA en cancha.

// ---------------------------------------------------------------------------
// Listas ordenables (reordenar dentro de la misma lista)
// ---------------------------------------------------------------------------

type ContextoAsa = {
  controls: DragControls
  mover: (delta: number) => void
  arrastrando: boolean
}

const AsaContext = createContext<ContextoAsa | null>(null)

/**
 * Lista vertical reordenable con arrastre. El item se agarra solo desde el
 * `<AsaArrastre />` que pinte `children`, para que los botones que viven en la
 * misma fila sigan siendo clicables.
 *
 * `onReordenar` se dispara mientras se arrastra (orden en pantalla) y
 * `onSoltar` una sola vez al terminar, que es donde conviene persistir.
 */
export function ListaOrdenable<T>({
  items,
  idDe,
  onReordenar,
  onSoltar,
  className = '',
  claseItem = '',
  children,
}: {
  items: T[]
  idDe: (item: T) => string
  onReordenar: (items: T[]) => void
  onSoltar?: (items: T[]) => void
  className?: string
  claseItem?: string
  children: (item: T, index: number) => ReactNode
}) {
  // El orden vivo se guarda en una ref: al soltar, el padre ya re-renderizó con
  // el orden nuevo y de ahí sale lo que se persiste.
  const ultimo = useRef(items)
  ultimo.current = items

  return (
    <Reorder.Group
      as="ul"
      axis="y"
      values={items}
      onReorder={onReordenar}
      className={className}
    >
      {items.map((item, i) => (
        <ItemOrdenable
          key={idDe(item)}
          value={item}
          className={claseItem}
          mover={(delta) => {
            const next = [...ultimo.current]
            const j = i + delta
            if (j < 0 || j >= next.length) return
            ;[next[i], next[j]] = [next[j], next[i]]
            onReordenar(next)
            onSoltar?.(next)
          }}
          alSoltar={() => onSoltar?.(ultimo.current)}
        >
          {children(item, i)}
        </ItemOrdenable>
      ))}
    </Reorder.Group>
  )
}

function ItemOrdenable<T>({
  value,
  className,
  mover,
  alSoltar,
  children,
}: {
  value: T
  className: string
  mover: (delta: number) => void
  alSoltar: () => void
  children: ReactNode
}) {
  const controls = useDragControls()
  const [arrastrando, setArrastrando] = useState(false)
  return (
    <Reorder.Item
      as="li"
      value={value}
      dragListener={false}
      dragControls={controls}
      onDragStart={() => setArrastrando(true)}
      onDragEnd={() => {
        setArrastrando(false)
        alSoltar()
      }}
      className={`${className} ${
        arrastrando ? 'relative z-20 shadow-lg ring-1 ring-secondary/50' : ''
      }`}
    >
      <AsaContext.Provider value={{ controls, mover, arrastrando }}>
        {children}
      </AsaContext.Provider>
    </Reorder.Item>
  )
}

/**
 * Agarradera del item. Con teclado (flechas arriba/abajo) mueve el item una
 * posición, así el reordenamiento no depende de poder arrastrar.
 */
export function AsaArrastre({
  className = '',
  titulo = 'Arrastra para reordenar (o usa las flechas ↑ ↓)',
}: {
  className?: string
  titulo?: string
}) {
  const ctx = useContext(AsaContext)
  if (!ctx) return null
  return (
    <button
      type="button"
      title={titulo}
      aria-label={titulo}
      onPointerDown={(e) => {
        e.preventDefault()
        ctx.controls.start(e)
      }}
      onKeyDown={(e) => {
        if (e.key === 'ArrowUp') {
          e.preventDefault()
          ctx.mover(-1)
        }
        if (e.key === 'ArrowDown') {
          e.preventDefault()
          ctx.mover(1)
        }
      }}
      style={{ touchAction: 'none' }}
      className={`shrink-0 rounded text-on-surface-variant transition hover:text-on-surface focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-secondary/40 ${
        ctx.arrastrando ? 'cursor-grabbing text-secondary' : 'cursor-grab'
      } ${className}`}
    >
      <Icon name="drag_indicator" className="text-lg" />
    </button>
  )
}

// ---------------------------------------------------------------------------
// Arrastre entre zonas (mover un item de un contenedor a otro)
// ---------------------------------------------------------------------------

type EnArrastre = { id: string; etiqueta: ReactNode }

/**
 * Arrastre de un item entre contenedores. Cada zona se marca con
 * `data-zona="<id>"`; al soltar se busca la zona bajo el puntero con
 * `elementFromPoint`, por lo que sirve igual con mouse que con dedo.
 *
 * Devuelve `iniciar` (para el onPointerDown del item), la zona resaltada y el
 * `fantasma` que sigue al puntero (hay que pintarlo en el árbol).
 */
export function useArrastreEntreZonas(onSoltar: (id: string, zona: string) => void) {
  const [arrastre, setArrastre] = useState<EnArrastre | null>(null)
  const [zonaActiva, setZonaActiva] = useState<string | null>(null)
  const [pos, setPos] = useState({ x: 0, y: 0 })
  // El callback puede cambiar en cada render; la ref evita re-suscribir listeners.
  const cb = useRef(onSoltar)
  cb.current = onSoltar

  useEffect(() => {
    if (!arrastre) return
    const zonaEn = (x: number, y: number) => {
      const el = document.elementFromPoint(x, y) as HTMLElement | null
      return (el?.closest('[data-zona]') as HTMLElement | null)?.dataset.zona ?? null
    }
    const mover = (e: PointerEvent) => {
      setPos({ x: e.clientX, y: e.clientY })
      setZonaActiva(zonaEn(e.clientX, e.clientY))
    }
    const soltar = (e: PointerEvent) => {
      const zona = zonaEn(e.clientX, e.clientY)
      if (zona) cb.current(arrastre.id, zona)
      setArrastre(null)
      setZonaActiva(null)
    }
    const cancelar = () => {
      setArrastre(null)
      setZonaActiva(null)
    }
    window.addEventListener('pointermove', mover)
    window.addEventListener('pointerup', soltar)
    window.addEventListener('pointercancel', cancelar)
    return () => {
      window.removeEventListener('pointermove', mover)
      window.removeEventListener('pointerup', soltar)
      window.removeEventListener('pointercancel', cancelar)
    }
  }, [arrastre])

  const iniciar = (id: string, etiqueta: ReactNode) => (e: ReactPointerEvent) => {
    e.preventDefault()
    setPos({ x: e.clientX, y: e.clientY })
    setArrastre({ id, etiqueta })
  }

  // `pointer-events-none` es obligatorio: si no, el fantasma tapa la zona y
  // `elementFromPoint` nunca encontraría el destino.
  const fantasma = arrastre ? (
    <div
      className="pointer-events-none fixed z-50 -translate-x-1/2 -translate-y-1/2 rounded-full border border-secondary bg-surface-container-highest px-3 py-1 text-xs font-semibold text-on-surface shadow-lg"
      style={{ left: pos.x, top: pos.y }}
    >
      {arrastre.etiqueta}
    </div>
  ) : null

  return { idArrastrado: arrastre?.id ?? null, zonaActiva, iniciar, fantasma }
}
