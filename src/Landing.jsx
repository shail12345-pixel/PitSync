import { ConnectionBar, Screen } from './Chrome';

/**
 * Landing — one tap to host or join. No accounts.
 *
 * props:
 *   connection  'good' | 'spotty' | 'offline'
 *   onStart()             start a new scouting session (host)
 *   onJoin()              open the 4-char code entry
 *   lastCode    string|null   previous session code, shows a rejoin row
 *   onRejoin(code)
 *   framed      boolean   false = fill the viewport (use in the real app)
 */
export default function Landing({
  connection = 'good',
  onStart,
  onJoin,
  lastCode = null,
  onRejoin,
  framed = false,
}) {
  return (
    <Screen framed={framed}>
      <ConnectionBar connection={connection} />

      <div className="flex flex-1 flex-col justify-between px-7 pb-8 pt-10">
        <div className="flex flex-col gap-[18px]">
          <div className="flex flex-col gap-1.5">
            <div className="text-[34px] font-semibold leading-none tracking-[-0.025em]">PitSync</div>
            <div className="font-['IBM_Plex_Mono'] text-[11px] tracking-[0.14em] text-white/[0.48]">
              VEX V5 · SCOUT → DRIVE
            </div>
          </div>
          <p className="max-w-[250px] text-pretty text-base leading-[1.45] text-white/[0.58]">
            Scouting notes reach your drivers before the field resets. No accounts, no waiting.
          </p>
        </div>

        <div className="flex flex-col gap-3.5">
          {lastCode && (
            <button
              type="button"
              onClick={() => onRejoin?.(lastCode)}
              className="flex items-center justify-between rounded-xl border border-dashed border-white/10 px-3.5 py-3 text-left active:bg-white/[0.03]"
            >
              <span className="flex flex-col gap-[3px]">
                <span className="font-['IBM_Plex_Mono'] text-[10px] tracking-[0.14em] text-white/[0.48]">
                  LAST SESSION
                </span>
                <span className="font-['IBM_Plex_Mono'] text-[15px] tracking-[0.1em] text-white/[0.72]">
                  {lastCode}
                </span>
              </span>
              <span className="font-['IBM_Plex_Mono'] text-xs text-[oklch(0.78_0.08_250)]">rejoin →</span>
            </button>
          )}

          <div className="flex flex-col gap-2.5">
            <button
              type="button"
              onClick={onStart}
              className="flex h-16 items-center justify-between rounded-[14px] bg-[oklch(0.94_0.012_95)] px-[22px] text-[17px] font-semibold tracking-[-0.01em] text-[#08090b] transition-transform active:scale-[0.985]"
            >
              <span>Start scouting</span>
              <span className="font-['IBM_Plex_Mono'] text-[11px] tracking-[0.1em] opacity-[0.65]">HOST</span>
            </button>
            <button
              type="button"
              onClick={onJoin}
              className="flex h-16 items-center justify-between rounded-[14px] border border-white/15 px-[22px] text-[17px] font-medium active:bg-white/[0.04]"
            >
              <span>Join as driver</span>
              <span className="font-['IBM_Plex_Mono'] text-[11px] tracking-[0.1em] text-white/[0.48]">
                4-CHAR CODE
              </span>
            </button>
          </div>

          <div className="flex items-center gap-2 pt-1">
            <div className="h-px w-3.5 bg-white/[0.18]" />
            <span className="font-['IBM_Plex_Mono'] text-[10.5px] tracking-[0.08em] text-white/[0.48]">
              add to home screen · works offline, syncs later
            </span>
          </div>
        </div>
      </div>
    </Screen>
  );
}
