import { CATEGORIES, groupNotesByCategory, noteStyle } from './categories';
import { ConnectionBar, Screen } from './Chrome';

/**
 * TeamNotes — every note on one team, grouped by category, newest
 * first within each group. The accumulated picture ("what do we know
 * about 4610T") as opposed to Driver's live chronological feed.
 *
 * Same note-row treatment as Driver's log, minus the per-note category
 * label (redundant once it's the section heading) and status text
 * (this is historical, not the live-arrival headline).
 *
 * props:
 *   connection  'good' | 'spotty' | 'offline'
 *   team        string              the team being looked up
 *   notes       Array<PitSyncNote>  the full session note list —
 *                                   filtered to `team` here
 *   onBack()
 *   categories  override CATEGORIES
 */
export default function TeamNotes({
  connection = 'good',
  team = '',
  notes = [],
  onBack,
  categories = CATEGORIES,
  framed = false,
}) {
  const teamNotes = notes.filter((n) => n.team === team);
  const groups = groupNotesByCategory(teamNotes, categories);

  return (
    <Screen framed={framed}>
      <ConnectionBar connection={connection} />

      <div className="flex shrink-0 items-center gap-3 px-[22px] pb-3.5 pt-5">
        <button
          type="button"
          aria-label="Back"
          onClick={onBack}
          className="h-[30px] w-[30px] shrink-0 rounded-[9px] border border-white/[0.12] text-base leading-none text-white/60 active:bg-white/[0.05]"
        >
          ←
        </button>
        <div className="flex flex-col gap-1">
          <span className="font-['IBM_Plex_Sans'] text-[10px] font-semibold tracking-[0.08em] text-white/[0.48]">
            TEAM · ACCUMULATED
          </span>
          <span className="text-[26px] font-semibold leading-none tracking-[-0.02em]">{team}</span>
        </div>
      </div>

      <div className="h-px shrink-0 bg-white/[0.07]" />

      {groups.length === 0 ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-2 px-10 text-center">
          <div className="text-[17px] font-semibold text-white/[0.7]">No notes on {team} yet</div>
          <p className="max-w-[240px] text-pretty text-[14px] leading-[1.45] text-white/[0.5]">
            Nothing's been scouted on this team this session — check back once a scout sends something in.
          </p>
        </div>
      ) : (
        <div className="pitsync-scroll flex-1 overflow-y-auto px-[22px] pb-[26px] pt-4">
          {groups.map(({ cat, items }) => (
            <div key={cat.id} className="mb-5 flex flex-col gap-2 last:mb-0">
              <div
                className="font-['IBM_Plex_Mono'] text-[11px] tracking-[0.14em]"
                style={{ color: cat.color }}
              >
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
                        <div className="font-['IBM_Plex_Mono'] text-[10px] tracking-[0.12em] text-white/[0.6]">
                          {[note.meta, note.author].filter(Boolean).join(' · ')}
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
      )}
    </Screen>
  );
}
