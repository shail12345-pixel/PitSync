import { useRef, useState } from 'react';
import { ConnectionBar, Screen } from './Chrome';

const CODE_LENGTH = 4;

/**
 * JoinCode — 4-char session code entry, after "Join as driver".
 * Replaces the old window.prompt() code ask. One box per character —
 * big, unmissable tap targets and auto-advance so it types like an SMS
 * code, not a form field.
 *
 * props:
 *   connection  'good' | 'spotty' | 'offline'
 *   onBack()               return to Landing
 *   onSubmit(code, name)    code is already uppercased, length 4; name is
 *                           trimmed, may be '' — no account, so it's never
 *                           required
 *   submitting  boolean     join is in flight — disable + show state
 *   progress    'signing-in'|'joining'|null   real stage, not a guess —
 *               shown instead of a static "Joining…" so a slow attempt
 *               reads as working, not frozen
 *   error       string|null e.g. "No session found for code ABCD."
 */
const PROGRESS_LABEL = {
  'signing-in': 'Signing in…',
  joining: 'Joining session…',
};

export default function JoinCode({
  connection = 'good',
  onBack,
  onSubmit,
  submitting = false,
  progress = null,
  error = null,
  framed = false,
}) {
  const [chars, setChars] = useState(Array(CODE_LENGTH).fill(''));
  const [name, setName] = useState('');
  const inputs = useRef([]);

  const code = chars.join('');
  const canSubmit = code.length === CODE_LENGTH && !submitting;

  const submit = (value = code) => {
    if (value.length !== CODE_LENGTH || submitting) return;
    onSubmit?.(value, name.trim());
  };

  const setChar = (i, raw) => {
    const v = raw
      .replace(/[^a-z0-9]/gi, '')
      .slice(-1)
      .toUpperCase();
    setChars((current) => {
      const next = [...current];
      next[i] = v;
      if (v && i < CODE_LENGTH - 1) inputs.current[i + 1]?.focus();
      const joined = next.join('');
      if (joined.length === CODE_LENGTH) submit(joined);
      return next;
    });
  };

  const onKeyDown = (i, e) => {
    if (e.key === 'Backspace' && !chars[i] && i > 0) {
      inputs.current[i - 1]?.focus();
    }
    if (e.key === 'Enter') submit();
  };

  const onPaste = (e) => {
    const text = e.clipboardData
      .getData('text')
      .replace(/[^a-z0-9]/gi, '')
      .slice(0, CODE_LENGTH)
      .toUpperCase();
    if (!text) return;
    e.preventDefault();
    const next = Array(CODE_LENGTH).fill('');
    for (let i = 0; i < text.length; i++) next[i] = text[i];
    setChars(next);
    inputs.current[Math.min(text.length, CODE_LENGTH) - 1]?.focus();
    if (text.length === CODE_LENGTH) submit(text);
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
          JOIN · DRIVER
        </span>
      </div>

      <div className="flex flex-1 flex-col justify-between px-7 pb-8 pt-6">
        <div className="flex flex-col gap-2">
          <div className="text-[28px] font-semibold leading-[1.15] tracking-[-0.02em]">
            Enter session
            <br />
            code
          </div>
          <p className="max-w-[260px] text-pretty text-[15px] leading-[1.45] text-white/[0.5]">
            Your scout has it on their screen — 4 characters, no 0/O or 1/I.
          </p>
        </div>

        <div className="flex flex-col gap-3.5">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Your name (optional)"
            autoCorrect="off"
            spellCheck={false}
            enterKeyHint="next"
            disabled={submitting}
            className="h-12 rounded-xl border border-white/[0.12] bg-white/[0.03] px-3.5 text-[15px] text-[oklch(0.95_0.005_90)] outline-none placeholder:text-white/25 focus:border-white/[0.26] disabled:opacity-50"
          />

          <div className="flex justify-between gap-2.5">
            {chars.map((c, i) => (
              <input
                key={i}
                ref={(el) => {
                  inputs.current[i] = el;
                }}
                value={c}
                onChange={(e) => setChar(i, e.target.value)}
                onKeyDown={(e) => onKeyDown(i, e)}
                onPaste={onPaste}
                autoFocus={i === 0}
                inputMode="text"
                autoCapitalize="characters"
                autoCorrect="off"
                spellCheck={false}
                maxLength={1}
                disabled={submitting}
                className="h-20 min-w-0 flex-1 rounded-[14px] border border-white/[0.12] bg-white/[0.03] text-center font-['IBM_Plex_Mono'] text-[28px] font-semibold uppercase tracking-[0.02em] text-[oklch(0.95_0.005_90)] outline-none focus:border-white/[0.28] disabled:opacity-50"
              />
            ))}
          </div>

          {error && (
            <div className="font-['IBM_Plex_Mono'] text-[11px] tracking-[0.04em] text-[oklch(0.72_0.10_32)]">
              {error}
            </div>
          )}

          <button
            type="button"
            onClick={() => submit()}
            disabled={!canSubmit}
            className="flex h-16 items-center justify-center rounded-[14px] text-[17px] font-semibold tracking-[-0.01em] transition-transform active:scale-[0.985]"
            style={{
              background: canSubmit ? 'oklch(0.94 0.012 95)' : 'rgba(255,255,255,0.06)',
              color: canSubmit ? '#08090b' : 'rgba(255,255,255,0.55)',
            }}
          >
            {submitting ? PROGRESS_LABEL[progress] ?? 'Joining…' : 'Join session'}
          </button>
        </div>
      </div>
    </Screen>
  );
}
