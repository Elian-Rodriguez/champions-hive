import { useState } from 'react'
import { STITCH_SCREENS } from '../screens'
import { Icon } from './ui'

export default function ScreensGallery({ onBack }: { onBack: () => void }) {
  const [active, setActive] = useState(STITCH_SCREENS[0].key)
  const screen = STITCH_SCREENS.find((s) => s.key === active) || STITCH_SCREENS[0]
  const Active = screen.Component

  const groups = Array.from(new Set(STITCH_SCREENS.map((s) => s.group)))

  return (
    <div className="flex h-screen flex-col bg-surface text-on-surface">
      <header className="flex items-center justify-between border-b border-outline-variant/40 bg-surface-container-low px-4 py-3">
        <button
          onClick={onBack}
          className="flex items-center gap-1 text-sm text-on-surface-variant hover:text-on-surface"
        >
          <Icon name="arrow_back" className="text-base" /> Volver a la app
        </button>
        <span className="flex items-center gap-2 font-display font-bold">
          <Icon name="palette" className="text-secondary" /> Diseños Stitch · {screen.title}
        </span>
        <span className="w-24" />
      </header>

      <div className="grid flex-1 grid-cols-1 overflow-hidden lg:grid-cols-[260px_1fr]">
        <aside className="hidden overflow-y-auto border-r border-outline-variant/40 bg-surface-container-lowest p-3 lg:block">
          {groups.map((g) => (
            <div key={g} className="mb-4">
              <p className="px-2 pb-1 text-xs font-semibold uppercase tracking-wide text-on-surface-variant/70">
                {g}
              </p>
              {STITCH_SCREENS.filter((s) => s.group === g).map((s) => (
                <button
                  key={s.key}
                  onClick={() => setActive(s.key)}
                  className={`mb-0.5 flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm transition ${
                    active === s.key
                      ? 'bg-secondary text-on-secondary'
                      : 'text-on-surface hover:bg-surface-container-high'
                  }`}
                >
                  {s.title}
                </button>
              ))}
            </div>
          ))}
        </aside>

        <div className="overflow-y-auto bg-surface">
          {/* selector móvil */}
          <div className="border-b border-outline-variant/40 p-2 lg:hidden">
            <select
              value={active}
              onChange={(e) => setActive(e.target.value)}
              className="w-full rounded-lg border border-outline-variant bg-surface-container-low px-3 py-2 text-on-surface"
            >
              {STITCH_SCREENS.map((s) => (
                <option key={s.key} value={s.key}>
                  {s.group} · {s.title}
                </option>
              ))}
            </select>
          </div>
          <Active />
        </div>
      </div>
    </div>
  )
}
