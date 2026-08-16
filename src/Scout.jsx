import { useState } from 'react';
import { CATEGORIES, AMBER, noteStyle } from './categories';
import { ConnectionBar, Screen } from './Chrome';

/**
 * Scout — stands side. Pick a category, type, send.
 *
 * props:
 *   team          string          e.g. '1234A'
 *   match         number
 *   onMatchChange(next)
 *   sessionCode   string
 *   driverCount   number
 *   onCopyCode()
 *   notes         Array<{ id, category, text, meta, status: 'sending'|'queued'|'sent' }>
 *                 newest first — the log renders in the order you give it
 *   onSend(categoryId, text)      you own the write + status transitions
 *   connection    'good' | 'spotty' | 'offline'
 *   categories    override CATEGORIES
 *   defaultCategory
 */
export default function Scout({
  team = '1234A',
  match = 1,
  onMatchChange,
  sessionCode = '',
  driverCount = 0,
  onCopyCode,
  notes = [],
  onSend,
  connection = 'good',
  categories = CATEGORIES,
  defaultCategory,
  onLeave,
  framed = false,
}) {
  const [category, setCategory] = useState(defaultCategory || categories[0].id);
  const [draft, setDraft] = useState('');

  const offline = connection === 'offline';
  const canSend = draft.trim().length > 0;

  const submit = () => {
    const text = draft.trim();
    if (!text) return;
    onSend?.(category, text);
    setDraft('');
  };

  const hint = offline
    ? 'no signal — notes hold here and go the moment wifi returns'
    : connection === 'spotty'
      ? 'weak venue wifi — sent notes show a transit line until confirmed'
      : 'return to send · category sticks until you change it';

  return (
    <Screen framed={framed}>
      <ConnectionBar connection={connection} />

      <div className="flex shrink-0 items-end justify-between px-[22px] pb-3.5 pt-5">
        <div className="flex items-center gap-3">
          <button
            type="button"
            aria-label="Leave session"
            onClick={onLeave}
            className="h-[30px] w-[30px] rounded-[9px] border border-white/[0.12] text-base leading-none text-white/60 active:bg-white/[0.05]"
          >
            ←
          </button>
          <div className="flex flex-col gap-1">
            <span className="font-['IBM_Plex_Mono'] text-[10px] tracking-[0.14em] text-white/[0.28]">
              SCOUTING
            </span>
            <span className="text-[26px] font-semibold leading-none tracking-[-0.02em]">{team}</span>
          </div>
        </div>
        <div className="flex items-center gap-2.5">
          <button
            type="button"
            aria-label="Previous match"
            onClick={() => onMatchChange?.(Math.max(1, match - 1))}
            className="h-[30px] w-[30px] rounded-[9px] border border-white/[0.12] text-base leading-none text-white/60 active:bg-white/[0.05]"
          >
            −
          </button>
          <div className="flex min-w-[46px] flex-col items-center gap-0.5">
            <span className="font-['IBM_Plex_Mono'] text-[10px] tracking-[0.14em] text-white/[0.28]">
              MATCH
            </span>
            <span className="font-['IBM_Plex_Mono'] text-[17px] text-white/[0.86]">Q{match}</span>
          </div>
          <button
            type="button"
            aria-label="Next match"
            onClick={() => onMatchChange?.(match + 1)}
            className="h-[30px] w-[30px] rounded-[9px] border border-white/[0.12] text-base leading-none text-white/60 active:bg-white/[0.05]"
          >
            +
          </button>
        </div>
      </div>

      <div className="flex shrink-0 items-center justify-between px-[22px] pb-3 font-['IBM_Plex_Mono'] text-[11px] text-white/30">
        <span>
          SESSION {sessionCode} · {driverCount} in pit
        </span>
        <button type="button" onClick={onCopyCode} className="text-white/50">
          copy code
        </button>
      </div>

      <div className="h-px shrink-0 bg-white/[0.07]" />

      <div className="pitsync-scroll flex-1 overflow-y-auto px-[22px] pb-[18px] pt-1.5">
        {notes.map((note) => {
          const s = noteStyle(note, categories);
          return (
            <div
              key={note.id}
              className="pitsync-arrive flex gap-3 border-b border-white/[0.045] py-[13px] transition-opacity duration-300"
              style={{ opacity: s.opacity }}
            >
              <div className="w-0.5 shrink-0 rounded-sm" style={{ background: s.tick }} />
              <div className="flex min-w-0 flex-1 flex-col gap-[5px]">
                <div className="flex items-baseline gap-2 font-['IBM_Plex_Mono'] text-[10px] tracking-[0.12em]">
                  <span style={{ color: s.labelColor }}>{s.label}</span>
                  <span className="text-white/[0.24]">{note.meta}</span>
                  <span className="ml-auto tracking-[0.08em]" style={{ color: s.statusColor }}>
                    {s.statusText}
                  </span>
                </div>
                <div className="text-pretty text-[15px] leading-[1.4] text-white/[0.82]">{note.text}</div>
                {s.shimmer && (
                  <div className="mt-0.5 h-px overflow-hidden bg-white/[0.07]">
                    <div className="pitsync-transit h-px w-[30%]" style={{ background: s.cat.color }} />
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <div className="flex shrink-0 flex-col gap-3 border-t border-white/[0.08] bg-[#0a0b0d] px-[18px] pb-[26px] pt-3.5">
        <div className="flex flex-wrap gap-[7px]">
          {categories.map((c) => {
            const on = category === c.id;
            return (
              <button
                key={c.id}
                type="button"
                onClick={() => setCategory(c.id)}
                className="h-10 rounded-[11px] border px-3.5 font-['IBM_Plex_Mono'] text-[11.5px] tracking-[0.1em] transition-colors"
                style={{
                  borderColor: on ? c.color : 'rgba(255,255,255,0.11)',
                  background: on ? `color-mix(in oklab, ${c.color} 14%, transparent)` : 'transparent',
                  color: on ? c.color : 'rgba(255,255,255,0.5)',
                }}
              >
                {c.label}
              </button>
            );
          })}
        </div>

        <div className="flex items-stretch gap-[9px]">
          <input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && submit()}
            placeholder={`Note on ${team}…`}
            enterKeyHint="send"
            className="h-12 min-w-0 flex-1 rounded-xl border border-white/[0.12] bg-white/[0.03] px-3.5 text-[15px] outline-none placeholder:text-white/25 focus:border-white/[0.26]"
          />
          <button
            type="button"
            onClick={submit}
            disabled={!canSend}
            className="h-12 w-[84px] rounded-xl font-['IBM_Plex_Mono'] text-xs tracking-[0.1em] transition-colors"
            style={{
              background: canSend
                ? offline
                  ? 'rgba(255,255,255,0.1)'
                  : 'oklch(0.94 0.012 95)'
                : 'rgba(255,255,255,0.06)',
              color: canSend && !offline ? '#08090b' : 'rgba(255,255,255,0.5)',
            }}
          >
            {offline ? 'QUEUE' : 'SEND'}
          </button>
        </div>

        <div
          className="font-['IBM_Plex_Mono'] text-[10px] tracking-[0.08em]"
          style={{ color: offline ? AMBER : 'rgba(255,255,255,0.28)' }}
        >
          {hint}
        </div>
      </div>
    </Screen>
  );
}
