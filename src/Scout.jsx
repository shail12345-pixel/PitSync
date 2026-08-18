import { useState } from 'react';
import { CATEGORIES, AMBER, noteStyle } from './categories';
import { ConnectionBar, Screen } from './Chrome';

/**
 * Scout — stands side. Set the team, pick a category, type, send.
 *
 * A session isn't scoped to one team — a scout can note different teams
 * across the same session without leaving it, so team lives on the
 * composer, not the header. The last team typed in stays as the default
 * for the next note (scouts often watch one team across a few matches in
 * a row); changing it per note is just editing the field.
 *
 * props:
 *   match         number
 *   onMatchChange(next)
 *   sessionCode   string
 *   driverCount   number
 *   onCopyCode()
 *   notes         Array<{ id, category, text, meta, team, author, status: 'sending'|'queued'|'sent' }>
 *                 newest first — the log renders in the order you give it
 *   onSend(categoryId, text, team)      you own the write + status transitions
 *   connection    'good' | 'spotty' | 'offline'
 *   categories    override CATEGORIES
 *   defaultCategory
 *   defaultTeam   string   prefill for the team field, e.g. on rejoin
 */
export default function Scout({
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
  defaultTeam = '',
  onLeave,
  framed = false,
}) {
  const [category, setCategory] = useState(defaultCategory || categories[0].id);
  const [teamInput, setTeamInput] = useState(defaultTeam);
  const [draft, setDraft] = useState('');

  const offline = connection === 'offline';
  const team = teamInput.trim().toUpperCase();
  const canSend = draft.trim().length > 0 && team.length > 0;

  const submit = () => {
    const text = draft.trim();
    if (!text || !team) return;
    onSend?.(category, text, team);
    setDraft('');
    // teamInput itself is left alone — it's the remembered default for
    // whatever note comes next, on purpose.
  };

  const hint = offline
    ? 'no signal — notes hold here and go the moment wifi returns'
    : connection === 'spotty'
      ? 'weak venue wifi — sent notes show a transit line until confirmed'
      : 'return to send · team and category stick until you change them';

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
            <span className="font-['IBM_Plex_Sans'] text-[10px] font-semibold tracking-[0.08em] text-white/[0.48]">
              SCOUTING
            </span>
            <span className="text-[26px] font-semibold leading-none tracking-[-0.02em]">{sessionCode}</span>
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
            <span className="font-['IBM_Plex_Mono'] text-[10px] tracking-[0.14em] text-white/[0.48]">
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

      <div className="flex shrink-0 items-center justify-between px-[22px] pb-3 font-['IBM_Plex_Mono'] text-[11px] text-white/[0.48]">
        <span>{driverCount} in pit</span>
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
                  <span className="text-white/[0.6]">
                    {[note.team, note.meta, note.author].filter(Boolean).join(' · ')}
                  </span>
                  <span className="ml-auto tracking-[0.08em]" style={{ color: s.statusColor }}>
                    {s.statusText}
                  </span>
                </div>
                <div className="text-pretty text-[16.5px] leading-[1.42] text-white/[0.82]">{note.text}</div>
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
        <div className="flex flex-col gap-1">
          <span className="font-['IBM_Plex_Mono'] text-[10px] tracking-[0.14em] text-white/[0.48]">TEAM</span>
          <input
            value={teamInput}
            onChange={(e) => setTeamInput(e.target.value)}
            placeholder="1234A"
            autoCapitalize="characters"
            autoCorrect="off"
            spellCheck={false}
            enterKeyHint="next"
            className="h-11 rounded-xl border border-white/[0.12] bg-white/[0.03] px-3.5 text-[17px] font-semibold uppercase tracking-[0.02em] text-[oklch(0.95_0.005_90)] outline-none placeholder:text-white/20 placeholder:normal-case focus:border-white/[0.26]"
          />
        </div>

        <div className="flex flex-wrap gap-[7px]">
          {categories.map((c) => {
            const on = category === c.id;
            return (
              <button
                key={c.id}
                type="button"
                onClick={() => setCategory(c.id)}
                className="h-10 rounded-[4px] border px-3.5 font-['IBM_Plex_Mono'] text-[11.5px] tracking-[0.1em] transition-colors"
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
            placeholder={team ? `Note on ${team}…` : 'Note…'}
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
          style={{ color: offline ? AMBER : 'rgba(255,255,255,0.48)' }}
        >
          {hint}
        </div>
      </div>
    </Screen>
  );
}
