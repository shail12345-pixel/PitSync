import { useState } from 'react';
import { ConnectionBar, Screen } from './Chrome';

/**
 * TeamEntry — one field between "Start scouting" and a live session.
 * Replaces the old window.prompt() team-number ask.
 *
 * props:
 *   connection  'good' | 'spotty' | 'offline'
 *   onBack()               return to Landing
 *   onSubmit(team)          team is already trimmed + uppercased
 *   submitting  boolean     session is being created — disable + show state
 *   progress    'signing-in'|'creating'|null   real stage, not a guess —
 *               shown instead of a static "Starting…" so a slow attempt
 *               reads as working, not frozen
 *   error       string|null e.g. "Could not start a session — try again."
 */
const PROGRESS_LABEL = {
  'signing-in': 'Signing in…',
  creating: 'Starting session…',
};

export default function TeamEntry({
  connection = 'good',
  onBack,
  onSubmit,
  submitting = false,
  progress = null,
  error = null,
  framed = false,
}) {
  const [team, setTeam] = useState('');
  const canSubmit = team.trim().length > 0 && !submitting;

  const submit = () => {
    if (!canSubmit) return;
    onSubmit?.(team.trim().toUpperCase());
  };

  return (
    <Screen framed={framed}>
      <ConnectionBar connection={connection} />

      <div className="flex shrink-0 items-center gap-3 px-[22px] pb-1 pt-5">
        <button
          type="button"
          aria-label="Back to landing"
          onClick={onBack}
          className="h-[34px] w-[34px] shrink-0 rounded-[10px] border border-white/[0.12] text-base leading-none text-white/60 active:bg-white/[0.05]"
        >
          ←
        </button>
        <span className="font-['IBM_Plex_Mono'] text-[10px] tracking-[0.14em] text-white/[0.28]">
          NEW SESSION · HOST
        </span>
      </div>

      <div className="flex flex-1 flex-col justify-between px-7 pb-8 pt-6">
        <div className="flex flex-col gap-2">
          <div className="text-[28px] font-semibold leading-[1.15] tracking-[-0.02em]">
            Which team are
            <br />
            you scouting?
          </div>
          <p className="max-w-[260px] text-pretty text-[15px] leading-[1.45] text-white/[0.5]">
            This starts a new session your drivers can join with a 4-char code.
          </p>
        </div>

        <div className="flex flex-col gap-3.5">
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
            disabled={submitting}
            className="h-16 rounded-[14px] border border-white/[0.12] bg-white/[0.03] px-[18px] text-[22px] font-semibold uppercase tracking-[0.02em] text-[oklch(0.95_0.005_90)] outline-none placeholder:text-white/20 placeholder:normal-case focus:border-white/[0.28] disabled:opacity-50"
          />

          {error && (
            <div className="font-['IBM_Plex_Mono'] text-[11px] tracking-[0.04em] text-[oklch(0.72_0.10_32)]">
              {error}
            </div>
          )}

          <button
            type="button"
            onClick={submit}
            disabled={!canSubmit}
            className="flex h-16 items-center justify-center rounded-[14px] text-[17px] font-semibold tracking-[-0.01em] transition-transform active:scale-[0.985]"
            style={{
              background: canSubmit ? 'oklch(0.94 0.012 95)' : 'rgba(255,255,255,0.06)',
              color: canSubmit ? '#08090b' : 'rgba(255,255,255,0.4)',
            }}
          >
            {submitting ? PROGRESS_LABEL[progress] ?? 'Starting…' : 'Start session'}
          </button>
        </div>
      </div>
    </Screen>
  );
}
