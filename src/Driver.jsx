import { useState } from 'react';
import { CATEGORIES, AMBER, groupNotesByCategory, noteStyle } from './categories';
import { ConnectionBar, Screen } from './Chrome';

/**
 * Driver — pit side. Defaults to "which teams have been scouted this
 * session" (grouped by team, then category — same grouping TeamNotes uses
 * for one team, just stacked across every team this session has touched)
 * since a session now spans multiple teams. The old newest-first live
 * feed is one tap away, not gone — some moments call for "what just came
 * in," not "what do we know."
 *
 * props:
 *   sessionCode  string
 *   notes        Array<{ id, category, text, meta, team, author, status, created_at }>  newest first
 *   filter       'all' | category id            (controlled — feed mode only)
 *   onFilterChange(next)
 *   connection   'good' | 'spotty' | 'offline'
 *   syncedAt     string   e.g. '9:41' — shown when nothing is in transit
 *   largeText    boolean  bumps the headline note for glance-from-the-pit (feed mode)
 *   categories   override CATEGORIES
 */
export default function Driver({
  sessionCode = '',
  notes = [],
  filter = 'all',
  onFilterChange,
  connection = 'good',
  syncedAt = '',
  largeText = false,
  categories = CATEGORIES,
  onLeave,
  onLookupTeam,
  framed = false,
}) {
  // Local, not lifted — nothing outside this screen needs to know which
  // view a driver is looking at, and it should always start on "teams"
  // fresh, same as any other screen default.
  const [mode, setMode] = useState('teams');
  const inTransit = notes.filter((n) => n.status && n.status !== 'sent').length;
  const chips = [{ id: 'all', label: 'ALL', color: 'oklch(0.94 0.01 95)' }, ...categories];

  // Most-recently-active team first — the grouped view's answer to "what's
  // fresh," since it can't lead with a single newest note the way the feed does.
  const teamGroups = (() => {
    const byTeam = new Map();
    for (const n of notes) {
      if (!n.team) continue;
      if (!byTeam.has(n.team)) byTeam.set(n.team, []);
      byTeam.get(n.team).push(n);
    }
    return [...byTeam.entries()]
      .map(([team, teamNotes]) => ({
        team,
        count: teamNotes.length,
        latestAt: Math.max(...teamNotes.map((n) => new Date(n.created_at).getTime())),
        groups: groupNotesByCategory(teamNotes, categories),
      }))
      .sort((a, b) => b.latestAt - a.latestAt);
  })();

  const visible = filter === 'all' ? notes : notes.filter((n) => n.category === filter);
  const [latest, ...rest] = visible;
  const latestStyle = latest ? noteStyle(latest, categories) : null;

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
              DRIVER
            </span>
            <span className="text-[26px] font-semibold leading-none tracking-[-0.02em]">{sessionCode}</span>
          </div>
        </div>
        <span
          className="text-right font-['IBM_Plex_Mono'] text-[11px] tracking-[0.06em]"
          style={{ color: inTransit > 0 ? AMBER : 'rgba(255,255,255,0.34)' }}
        >
          {inTransit > 0 ? `${inTransit} in transit` : syncedAt ? `synced ${syncedAt}` : 'synced'}
        </span>
      </div>

      <div className="flex shrink-0 items-center justify-between px-[22px] pb-3 font-['IBM_Plex_Mono'] text-[11px] text-white/[0.48]">
        <span>{notes.length} notes this session</span>
        <button type="button" onClick={onLookupTeam} className="text-white/50">
          look up team →
        </button>
      </div>

      <div className="flex shrink-0 items-center gap-[7px] px-[22px] pb-3">
        {[
          { id: 'teams', label: 'TEAMS' },
          { id: 'feed', label: 'LIVE FEED' },
        ].map((m) => {
          const on = mode === m.id;
          return (
            <button
              key={m.id}
              type="button"
              onClick={() => setMode(m.id)}
              className="h-[30px] rounded-[4px] border px-3 font-['IBM_Plex_Mono'] text-[10.5px] tracking-[0.1em] transition-colors"
              style={{
                borderColor: on ? 'oklch(0.94 0.01 95)' : 'rgba(255,255,255,0.1)',
                background: on ? 'rgba(255,255,255,0.08)' : 'transparent',
                color: on ? 'oklch(0.94 0.01 95)' : 'rgba(255,255,255,0.45)',
              }}
            >
              {m.label}
            </button>
          );
        })}
      </div>

      <div className="h-px shrink-0 bg-white/[0.07]" />

      {mode === 'teams' ? (
        teamGroups.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-2 px-10 text-center">
            <div className="text-[17px] font-semibold text-white/[0.7]">No teams scouted yet</div>
            <p className="max-w-[240px] text-pretty text-[14px] leading-[1.45] text-white/[0.5]">
              Notes will group here by team the moment your scout sends the first one in.
            </p>
          </div>
        ) : (
          <div className="pitsync-scroll flex-1 overflow-y-auto px-[22px] pb-[26px] pt-4">
            {teamGroups.map(({ team, count, groups }) => (
              <div key={team} className="mb-6 flex flex-col gap-3 last:mb-0">
                <div className="flex items-baseline justify-between">
                  <span className="text-[19px] font-semibold tracking-[-0.01em]">{team}</span>
                  <span className="font-['IBM_Plex_Mono'] text-[10.5px] tracking-[0.1em] text-white/[0.48]">
                    {count} note{count === 1 ? '' : 's'}
                  </span>
                </div>
                {groups.map(({ cat, items }) => (
                  <div key={cat.id} className="flex flex-col gap-2">
                    <div className="font-['IBM_Plex_Mono'] text-[11px] tracking-[0.14em]" style={{ color: cat.color }}>
                      {cat.label} · {items.length}
                    </div>
                    <div className="flex flex-col">
                      {items.map((note) => {
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
                                <span className="text-white/[0.6]">
                                  {[note.meta, note.author].filter(Boolean).join(' · ')}
                                </span>
                                {s.statusText && (
                                  <span className="ml-auto tracking-[0.08em]" style={{ color: s.statusColor }}>
                                    {s.statusText}
                                  </span>
                                )}
                              </div>
                              <div className="text-pretty text-[14.5px] leading-[1.4] text-white/70">{note.text}</div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            ))}
          </div>
        )
      ) : (
        <>
          {latest && (
            <div
              className="pitsync-arrive flex shrink-0 gap-3.5 px-[22px] pb-[22px] pt-5 transition-colors duration-500"
              style={{ background: latestStyle.shimmer ? 'rgba(255,255,255,0.015)' : 'transparent' }}
            >
              <div className="w-0.5 shrink-0 rounded-sm" style={{ background: latestStyle.tick }} />
              <div className="flex min-w-0 flex-col gap-[9px]">
                <div className="flex items-baseline gap-[9px] font-['IBM_Plex_Mono'] text-[10.5px] tracking-[0.12em]">
                  <span style={{ color: latestStyle.labelColor }}>{latestStyle.label}</span>
                  <span className="text-white/[0.6]">
                    {[latest.team, latest.meta, latest.author].filter(Boolean).join(' · ')}
                  </span>
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
                  className="h-[34px] shrink-0 rounded-[4px] border px-3 font-['IBM_Plex_Mono'] text-[11px] tracking-[0.1em] transition-colors"
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
                <div key={note.id} className="flex gap-3 border-b border-white/[0.045] py-3" style={{ opacity: s.opacity }}>
                  <div className="w-0.5 shrink-0 rounded-sm" style={{ background: s.tick }} />
                  <div className="flex min-w-0 flex-1 flex-col gap-1">
                    <div className="flex items-baseline gap-2 font-['IBM_Plex_Mono'] text-[10px] tracking-[0.12em]">
                      <span style={{ color: s.labelColor }}>{s.label}</span>
                      <span className="text-white/[0.6]">
                        {[note.team, note.meta, note.author].filter(Boolean).join(' · ')}
                      </span>
                    </div>
                    <div className="text-pretty text-[14.5px] leading-[1.4] text-white/70">{note.text}</div>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}
    </Screen>
  );
}
