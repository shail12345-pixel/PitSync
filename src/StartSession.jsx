import { useState } from 'react';
import { ConnectionBar, Screen } from './Chrome';

/**
 * StartSession — the one optional field between "Start scouting" and a
 * live session. A session isn't scoped to a team anymore (a scout notes
 * whatever team's in front of them, per note), so the only thing worth
 * asking here is who's scouting — and even that's optional, matching the
 * "no accounts" model.
 *
 * props:
 *   connection  'good' | 'spotty' | 'offline'
 *   onBack()               return to Landing
 *   onSubmit(name)          name is trimmed, may be '' — never required
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

export default function StartSession({
  connection = 'good',
  onBack,
  onSubmit,
  submitting = false,
  progress = null,
  error = null,
  framed = false,
}) {
  const [name, setName] = useState('');
  const canSubmit = !submitting;

  const submit = () => {
    if (!canSubmit) return;
    onSubmit?.(name.trim());
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
        <span className="font-['IBM_Plex_Mono'] text-[10px] tracking-[0.14em] text-white/[0.48]">
          NEW SESSION · HOST
        </span>
      </div>

      <div className="flex flex-1 flex-col justify-between px-7 pb-8 pt-6">
        <div className="flex flex-col gap-2">
          <div className="text-[28px] font-semibold leading-[1.15] tracking-[-0.02em]">
            What should we
            <br />
            call you?
          </div>
          <p className="max-w-[260px] text-pretty text-[15px] leading-[1.45] text-white/[0.5]">
            Shows up on the notes you send. Skip it if you'd rather stay anonymous — you can note any team once
            you're in.
          </p>
        </div>

        <div className="flex flex-col gap-3.5">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && submit()}
            placeholder="Your name (optional)"
            autoFocus
            autoCorrect="off"
            spellCheck={false}
            enterKeyHint="go"
            disabled={submitting}
            className="h-16 rounded-[14px] border border-white/[0.12] bg-white/[0.03] px-[18px] text-[19px] font-semibold text-[oklch(0.95_0.005_90)] outline-none placeholder:text-white/20 focus:border-white/[0.28] disabled:opacity-50"
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
              color: canSubmit ? '#08090b' : 'rgba(255,255,255,0.55)',
            }}
          >
            {submitting ? PROGRESS_LABEL[progress] ?? 'Starting…' : 'Start session'}
          </button>
        </div>
      </div>
    </Screen>
  );
}
