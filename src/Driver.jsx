import { CATEGORIES, AMBER, noteStyle } from './categories';
import { ConnectionBar, Screen } from './Chrome';

/**
 * Driver — pit side. Newest note owns the top; the rest is a scannable log.
 *
 * props:
 *   team         string
 *   sessionCode  string
 *   notes        Array<{ id, category, text, meta, status }>  newest first
 *   filter       'all' | category id            (controlled)
 *   onFilterChange(next)
 *   connection   'good' | 'spotty' | 'offline'
 *   syncedAt     string   e.g. '9:41' — shown when nothing is in transit
 *   largeText    boolean  bumps the headline note for glance-from-the-pit
 *   categories   override CATEGORIES
 */
export default function Driver({
  team = '1234A',
  sessionCode = '',
  notes = [],
  filter = 'all',
  onFilterChange,
  connection = 'good',
  syncedAt = '',
  largeText = false,
  categories = CATEGORIES,
  framed = false,
}) {
  const visible = filter === 'all' ? notes : notes.filter((n) => n.category === filter);
  const [latest, ...rest] = visible;
  const inTransit = notes.filter((n) => n.status && n.status !== 'sent').length;
  const latestStyle = latest ? noteStyle(latest, categories) : null;

  const chips = [{ id: 'all', label: 'ALL', color: 'oklch(0.94 0.01 95)' }, ...categories];

  return (
    <Screen framed={framed}>
      <ConnectionBar connection={connection} />

      <div className="flex shrink-0 items-end justify-between px-[22px] pb-3.5 pt-5">
        <div className="flex flex-col gap-1">
          <span className="font-['IBM_Plex_Mono'] text-[10px] tracking-[0.14em] text-white/[0.28]">
            SESSION {sessionCode}
          </span>
          <span className="text-[26px] font-semibold leading-none tracking-[-0.02em]">{team}</span>
        </div>
        <span
          className="text-right font-['IBM_Plex_Mono'] text-[11px] tracking-[0.06em]"
          style={{ color: inTransit > 0 ? AMBER : 'rgba(255,255,255,0.34)' }}
        >
          {inTransit > 0 ? `${inTransit} in transit` : syncedAt ? `synced ${syncedAt}` : 'synced'}
        </span>
      </div>

      <div className="h-px shrink-0 bg-white/[0.07]" />

      {latest && (
        <div
          className="pitsync-arrive flex shrink-0 gap-3.5 px-[22px] pb-[22px] pt-5 transition-colors duration-500"
          style={{ background: latestStyle.shimmer ? 'rgba(255,255,255,0.015)' : 'transparent' }}
        >
          <div className="w-0.5 shrink-0 rounded-sm" style={{ background: latestStyle.tick }} />
          <div className="flex min-w-0 flex-col gap-[9px]">
            <div className="flex items-baseline gap-[9px] font-['IBM_Plex_Mono'] text-[10.5px] tracking-[0.12em]">
              <span style={{ color: latestStyle.labelColor }}>{latestStyle.label}</span>
              <span className="text-white/[0.26]">{latest.meta}</span>
              <span style={{ color: latestStyle.statusColor }}>{latestStyle.statusText}</span>
            </div>
            <div
              className={
                'text-pretty leading-[1.32] tracking-[-0.012em] text-white/[0.94] ' +
                (largeText ? 'text-[25px]' : 'text-[21px]')
              }
            >
              {latest.text}
            </div>
          </div>
        </div>
      )}

      <div className="pitsync-scroll flex shrink-0 gap-[7px] overflow-x-auto px-[22px] pb-3">
        {chips.map((c) => {
          const on = filter === c.id;
          return (
            <button
              key={c.id}
              type="button"
              onClick={() => onFilterChange?.(c.id)}
              className="h-[34px] shrink-0 rounded-[10px] border px-3 font-['IBM_Plex_Mono'] text-[11px] tracking-[0.1em] transition-colors"
              style={{
                borderColor: on ? c.color : 'rgba(255,255,255,0.1)',
                background: on ? `color-mix(in oklab, ${c.color} 14%, transparent)` : 'transparent',
                color: on ? c.color : 'rgba(255,255,255,0.45)',
              }}
            >
              {c.label}
            </button>
          );
        })}
      </div>

      <div className="h-px shrink-0 bg-white/[0.06]" />

      <div className="pitsync-scroll flex-1 overflow-y-auto px-[22px] pb-[26px] pt-1">
        {rest.map((note) => {
          const s = noteStyle(note, categories);
          return (
            <div
              key={note.id}
              className="flex gap-3 border-b border-white/[0.045] py-3"
              style={{ opacity: s.opacity }}
            >
              <div className="w-0.5 shrink-0 rounded-sm" style={{ background: s.tick }} />
              <div className="flex min-w-0 flex-1 flex-col gap-1">
                <div className="flex items-baseline gap-2 font-['IBM_Plex_Mono'] text-[10px] tracking-[0.12em]">
                  <span style={{ color: s.labelColor }}>{s.label}</span>
                  <span className="text-white/[0.24]">{note.meta}</span>
                </div>
                <div className="text-pretty text-[14.5px] leading-[1.4] text-white/70">{note.text}</div>
              </div>
            </div>
          );
        })}
      </div>
    </Screen>
  );
}
