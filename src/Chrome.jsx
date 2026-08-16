import { connectionStyle } from './categories';

/* Shared top chrome: connection hairline + status row.
   Used by Landing, Scout and Driver so the three stay identical. */
export function ConnectionBar({ connection = 'good', clock = '9:41' }) {
  const c = connectionStyle(connection);
  return (
    <>
      <div className="relative h-0.5 shrink-0 bg-white/5">
        <div
          className="absolute inset-y-0 left-0 transition-[width] duration-500"
          style={{ width: c.width, background: c.color }}
        />
      </div>
      <div className="flex shrink-0 items-center justify-between px-6 pt-3.5 font-['IBM_Plex_Mono'] text-[11px] text-white/35">
        <span>{clock}</span>
        <span>{c.label}</span>
      </div>
    </>
  );
}

/* Phone-sized shell. Drop it and render children directly if you're
   full-screen on device — the rounded frame is for desktop preview. */
export function Screen({ children, framed = true }) {
  return (
    <div
      className={
        'flex flex-col overflow-hidden bg-[#08090b] font-["IBM_Plex_Sans"] text-[oklch(0.95_0.005_90)] ' +
        (framed
          ? 'h-[812px] w-[390px] rounded-[36px] border border-white/[0.07] shadow-[0_40px_80px_-40px_rgba(0,0,0,0.9)]'
          : 'min-h-screen w-full')
      }
    >
      {children}
    </div>
  );
}
