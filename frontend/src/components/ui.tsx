import type {
  ButtonHTMLAttributes,
  InputHTMLAttributes,
  ReactNode,
  SelectHTMLAttributes,
} from 'react'

export function Icon({
  name,
  className = '',
}: {
  name: string
  className?: string
}) {
  return <span className={`material-symbols-outlined ${className}`}>{name}</span>
}

export function Card({
  children,
  className = '',
  accent,
}: {
  children: ReactNode
  className?: string
  accent?: 'green' | 'orange'
}) {
  const acc = accent
    ? `card-accent overflow-hidden ${accent === 'orange' ? 'card-accent-orange' : ''}`
    : ''
  return (
    <div
      className={`rounded-xl border border-outline-variant/40 bg-surface-container ${acc} ${className}`}
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
    primary:
      'bg-secondary text-on-secondary border-b-2 border-secondary-container hover:brightness-110 active:translate-y-px active:border-b',
    ghost: 'bg-surface-container-high text-on-surface hover:bg-surface-bright',
    outline:
      'border border-outline text-on-surface hover:border-secondary/60 hover:bg-surface-container-high',
    danger:
      'bg-error-container text-on-error-container hover:brightness-110',
  }
  return (
    <button
      className={`inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2 font-display text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-secondary/40 focus-visible:ring-offset-2 focus-visible:ring-offset-surface disabled:cursor-not-allowed disabled:opacity-50 ${variants[variant]} ${className}`}
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
      className={`w-full rounded-lg border border-outline-variant bg-surface-container-low px-3 py-2 text-on-surface transition placeholder:text-on-surface-variant/60 focus:border-secondary focus:outline-none focus:ring-2 focus:ring-secondary/25 ${className}`}
      {...rest}
    />
  )
}

export function Select(props: SelectHTMLAttributes<HTMLSelectElement>) {
  const { className = '', children, ...rest } = props
  return (
    <select
      className={`w-full rounded-lg border border-outline-variant bg-surface-container-low px-3 py-2 text-on-surface transition focus:border-secondary focus:outline-none focus:ring-2 focus:ring-secondary/25 ${className}`}
      {...rest}
    >
      {children}
    </select>
  )
}

export function Badge({
  children,
  className = '',
}: {
  children: ReactNode
  className?: string
}) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${className}`}
    >
      {children}
    </span>
  )
}

export function Spinner({ className = '' }: { className?: string }) {
  return (
    <span
      className={`inline-block h-5 w-5 animate-spin rounded-full border-2 border-on-surface-variant/40 border-t-secondary ${className}`}
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
    <span className={`text-xs font-semibold uppercase tracking-[0.14em] text-secondary ${className}`}>
      {children}
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
      className={`inline-flex items-center gap-1.5 rounded-full border border-tertiary/50 bg-tertiary/10 px-2.5 py-0.5 text-xs font-semibold uppercase tracking-wide text-tertiary ${className}`}
    >
      <span className="live-dot h-2 w-2 rounded-full bg-tertiary" />
      {label}
    </span>
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
    <div className="flex flex-col items-center justify-center gap-2 py-12 text-center text-on-surface-variant">
      <Icon name={icon} className="text-4xl opacity-60" />
      <p className="font-display text-lg text-on-surface">{title}</p>
      {hint && <p className="max-w-sm text-sm opacity-80">{hint}</p>}
    </div>
  )
}
