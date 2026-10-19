/**
 * Primitivos del sistema «Hive Arena».
 *
 * Todo lo que se ve en la plataforma sale de aquí, así que un cambio en este
 * archivo —más los tokens de tailwind.config.js— mueve las cuatro vistas a la
 * vez. Dos ideas lo gobiernan: el hexágono es la forma de la marca (la casa se
 * llama colmena) y el acento es voltaje, reservado para lo que se puede hacer
 * y para lo que está pasando ahora.
 */
import type {
  ButtonHTMLAttributes,
  HTMLAttributes,
  InputHTMLAttributes,
  ReactNode,
  SelectHTMLAttributes,
} from 'react'

export function Icon({
  name,
  className = '',
  title,
}: {
  name: string
  className?: string
  /** Tooltip nativo; util cuando el icono es la unica pista de lo que pasa. */
  title?: string
}) {
  return (
    <span className={`material-symbols-outlined ${className}`} title={title}>
      {name}
    </span>
  )
}

export function Card({
  children,
  className = '',
  accent,
  hover,
  glass,
}: {
  children: ReactNode
  className?: string
  accent?: 'green' | 'orange'
  /** Se levanta al pasar por encima; para tarjetas que son botón. */
  hover?: boolean
  /** Vidrio esmerilado, para lo que flota sobre otro contenido. */
  glass?: boolean
}) {
  const acc = accent
    ? `card-accent overflow-hidden ${accent === 'orange' ? 'card-accent-orange' : ''}`
    : ''
  return (
    <div
      className={`rounded-xl border border-outline-variant/70 ${
        glass ? 'glass' : 'bg-surface-container'
      } ${acc} ${hover ? 'hover-lift hover:border-secondary/50' : ''} ${className}`}
    >
      {children}
    </div>
  )
}

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'primary' | 'ghost' | 'outline' | 'danger'
}

export function Button({
  children,
  variant = 'primary',
  className = '',
  ...props
}: ButtonProps) {
  const variants: Record<string, string> = {
    // El botón de acción es una pieza de voltaje: degradado, filo inferior
    // más oscuro y un destello que lo cruza al pasar por encima.
    primary:
      'btn-sheen bg-volt text-on-secondary shadow-volt-sm border-b-2 border-secondary-container hover:brightness-[1.07] active:translate-y-px active:border-b',
    ghost:
      'bg-surface-container-high text-on-surface hover:bg-surface-bright hover:text-on-surface',
    outline:
      'border border-outline-variant text-on-surface hover:border-secondary/70 hover:bg-secondary/5 hover:text-secondary',
    danger: 'bg-error-container text-on-error-container hover:brightness-110',
  }
  return (
    <button
      className={`inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2 font-display text-sm font-bold tracking-tight transition duration-200 ease-snap disabled:cursor-not-allowed disabled:opacity-50 ${variants[variant]} ${className}`}
      {...props}
    >
      {children}
    </button>
  )
}

export function Input(props: InputHTMLAttributes<HTMLInputElement>) {
  const { className = '', ...rest } = props
  return (
    <input
      className={`w-full rounded-lg border border-outline-variant bg-surface-container-low px-3 py-2 text-on-surface transition placeholder:text-on-surface-variant/60 focus:border-secondary/70 focus:bg-surface-container focus:outline-none ${className}`}
      {...rest}
    />
  )
}

export function Select(props: SelectHTMLAttributes<HTMLSelectElement>) {
  const { className = '', children, ...rest } = props
  return (
    <select
      className={`w-full rounded-lg border border-outline-variant bg-surface-container-low px-3 py-2 text-on-surface transition focus:border-secondary/70 focus:outline-none ${className}`}
      {...rest}
    >
      {children}
    </select>
  )
}

export function Badge({
  children,
  className = '',
  ...props
}: HTMLAttributes<HTMLSpanElement> & { children: ReactNode }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${className}`}
      {...props}
    >
      {children}
    </span>
  )
}

export function Spinner({ className = '' }: { className?: string }) {
  return (
    <span
      className={`inline-block h-5 w-5 animate-spin rounded-full border-2 border-on-surface-variant/30 border-t-secondary ${className}`}
    />
  )
}

export function Eyebrow({
  children,
  className = '',
}: {
  children: ReactNode
  className?: string
}) {
  return (
    <span
      className={`inline-flex items-center gap-2 text-xs font-bold uppercase tracking-[0.2em] text-secondary ${className}`}
    >
      <span className="h-3 w-[3px] rounded-full bg-volt" />
      {children}
    </span>
  )
}

/** El emblema: un hexágono de voltaje, que es la colmena. */
export function HiveMark({
  className = 'h-9 w-9',
  icon = 'emoji_events',
}: {
  className?: string
  icon?: string
}) {
  return (
    <span className={`relative grid shrink-0 place-items-center ${className}`}>
      <span className="clip-hex absolute inset-0 bg-volt" />
      <span className="clip-hex absolute inset-[2px] bg-surface-container-lowest" />
      <Icon name={icon} className="relative text-[60%] leading-none text-secondary" />
    </span>
  )
}

export function Brand({ className = '' }: { className?: string }) {
  return <span className={`brand-wordmark ${className}`}>Champion Hive</span>
}

export function LiveChip({
  label = 'En vivo',
  className = '',
}: {
  label?: string
  className?: string
}) {
  return (
    <span
      className={`live-ring inline-flex items-center gap-1.5 rounded-full border border-tertiary/50 bg-tertiary/10 px-2.5 py-0.5 text-xs font-bold uppercase tracking-[0.12em] text-tertiary ${className}`}
    >
      <span className="live-dot h-2 w-2 rounded-full bg-tertiary" />
      {label}
    </span>
  )
}

/** Cifra grande con su etiqueta: el ladrillo de los paneles de resumen. */
export function Stat({
  label,
  value,
  icon,
  hint,
  tone = 'text-secondary',
  className = '',
}: {
  label: string
  value: ReactNode
  icon?: string
  hint?: string
  tone?: string
  className?: string
}) {
  return (
    <div
      className={`group relative overflow-hidden rounded-xl border border-outline-variant/70 bg-surface-container p-4 transition duration-200 ease-snap hover:border-secondary/40 ${className}`}
    >
      <span className="pointer-events-none absolute -right-3 -top-3 opacity-[0.07] transition group-hover:opacity-[0.13]">
        {icon && <Icon name={icon} className="text-7xl" />}
      </span>
      <div className="flex items-center gap-1.5">
        {icon && <Icon name={icon} className={`text-base ${tone}`} />}
        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-on-surface-variant">
          {label}
        </p>
      </div>
      <p className="tnum mt-1.5 font-display text-3xl font-extrabold leading-none">{value}</p>
      {hint && <p className="mt-1 text-xs text-on-surface-variant">{hint}</p>}
    </div>
  )
}

/** Título de sección con su riel de acento, para no repetir el mismo bloque. */
export function SectionTitle({
  children,
  eyebrow,
  hint,
  right,
  className = '',
}: {
  children: ReactNode
  eyebrow?: string
  hint?: string
  right?: ReactNode
  className?: string
}) {
  return (
    <div className={`flex flex-wrap items-end justify-between gap-3 ${className}`}>
      <div>
        {eyebrow && <Eyebrow className="mb-2">{eyebrow}</Eyebrow>}
        <h2 className="headline text-2xl md:text-3xl">{children}</h2>
        {hint && <p className="mt-2 text-sm text-on-surface-variant">{hint}</p>}
      </div>
      {right}
    </div>
  )
}

export function EmptyState({
  icon,
  title,
  hint,
}: {
  icon: string
  title: string
  hint?: string
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-14 text-center text-on-surface-variant">
      <span className="relative grid h-16 w-16 place-items-center">
        <span className="clip-hex absolute inset-0 bg-surface-container-high" />
        <Icon name={icon} className="relative text-3xl opacity-70" />
      </span>
      <p className="font-display text-lg font-bold text-on-surface">{title}</p>
      {hint && <p className="max-w-sm text-sm opacity-80">{hint}</p>}
    </div>
  )
}
