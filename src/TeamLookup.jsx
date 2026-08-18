import { useState } from 'react';
import { ConnectionBar, Screen } from './Chrome';

/**
 * TeamLookup — "which team am I about to face?" Entry point into
 * TeamNotes from the Driver view. Purely local: no network round
 * trip, just picks which team's already-loaded notes to group.
 *
 * props:
 *   connection  'good' | 'spotty' | 'offline'
 *   onBack()
 *   onSubmit(team)      team is trimmed + uppercased
 *   notes       Array<{ team }>   used only to surface a "scouted so
 *                                 far" shortlist — omit or pass [] to
 *                                 skip it
 */
export default function TeamLookup({
  connection = 'good',
  onBack,
  onSubmit,
  notes = [],
  framed = false,
}) {
  const [team, setTeam] = useState('');

  const submit = (value = team) => {
    const t = value.trim().toUpperCase();
    if (!t) return;
    onSubmit?.(t);
  };

  const knownTeams = [...new Set(notes.map((n) => n.team).filter(Boolean))].sort();

  return (
    <Screen framed={framed}>
      <ConnectionBar connection={connection} />

      <div className="flex shrink-0 items-center gap-3 px-[22px] pb-1 pt-5">
        <button
          type="button"
          aria-label="Back"
          onClick={onBack}
          className="h-[34px] w-[34px] shrink-0 rounded-[10px] border border-white/[0.12] text-base leading-none text-white/60 active:bg-white/[0.05]"
        >
          ←
        </button>
        <span className="font-['IBM_Plex_Mono'] text-[10px] tracking-[0.14em] text-white/[0.48]">
          LOOK UP TEAM
        </span>
      </div>

      <div className="flex flex-1 flex-col justify-between px-7 pb-8 pt-6">
        <div className="flex flex-col gap-2">
          <div className="text-[28px] font-semibold leading-[1.15] tracking-[-0.02em]">
            Who are you
            <br />
            about to face?
          </div>
          <p className="max-w-[260px] text-pretty text-[15px] leading-[1.45] text-white/[0.5]">
            See everything scouted on them this session, grouped by category.
          </p>
        </div>

        <div className="flex flex-col gap-3.5">
          {knownTeams.length > 0 && (
            <div className="flex flex-col gap-2">
              <span className="font-['IBM_Plex_Mono'] text-[10px] tracking-[0.14em] text-white/[0.48]">
                SCOUTED SO FAR
              </span>
              <div className="pitsync-scroll flex gap-[7px] overflow-x-auto pb-1">
                {knownTeams.map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => submit(t)}
                    className="h-9 shrink-0 rounded-[10px] border border-white/[0.12] px-3.5 font-['IBM_Plex_Mono'] text-[12px] tracking-[0.06em] text-white/70 active:bg-white/[0.05]"
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>
          )}

          <input
            value={team}
            onChange={(e) => setTeam(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && submit()}
            placeholder="1234A"
            autoFocus
            autoCapitalize="characters"
            autoCorrect="off"
            spellCheck={false}
            enterKeyHint="go"
            className="h-16 rounded-[14px] border border-white/[0.12] bg-white/[0.03] px-[18px] text-[22px] font-semibold uppercase tracking-[0.02em] text-[oklch(0.95_0.005_90)] outline-none placeholder:text-white/20 placeholder:normal-case focus:border-white/[0.28]"
          />

          <button
            type="button"
            onClick={() => submit()}
            disabled={team.trim().length === 0}
            className="flex h-16 items-center justify-center rounded-[14px] text-[17px] font-semibold tracking-[-0.01em] transition-transform active:scale-[0.985]"
            style={{
              background: team.trim().length > 0 ? 'oklch(0.94 0.012 95)' : 'rgba(255,255,255,0.06)',
              color: team.trim().length > 0 ? '#08090b' : 'rgba(255,255,255,0.55)',
            }}
          >
            View team
          </button>
        </div>
      </div>
    </Screen>
  );
}
