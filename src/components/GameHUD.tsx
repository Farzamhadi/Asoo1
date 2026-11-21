import type { ControlMode, HudSnapshot } from '../game/types';

interface GameHUDProps {
  hud: HudSnapshot;
  mode: ControlMode;
  muted: boolean;
  onToggleMute: () => void;
  onRestart: () => void;
  onPause: () => void;
  onSwitchMode: () => void;
}

function formatClock(totalSeconds: number): string {
  const mins = Math.floor(totalSeconds / 60);
  const secs = Math.floor(totalSeconds % 60);
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

function VitalitySocket({ filled }: { filled: boolean }) {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5 shrink-0" aria-hidden="true">
      <path
        d="M12 20.6C11.5 20.2 3.5 14.5 3.5 8.8C3.5 5.9 5.7 3.8 8.3 3.8C10 3.8 11.3 4.8 12 6C12.7 4.8 14 3.8 15.7 3.8C18.3 3.8 20.5 5.9 20.5 8.8C20.5 14.5 12.5 20.2 12 20.6Z"
        fill={filled ? '#DC9862' : 'rgba(244, 223, 196, 0.08)'}
        stroke="#0B0F19"
        strokeWidth="2.2"
      />
      {filled ? (
        <path
          d="M8.5 6.4C7.2 6.4 6.1 7.4 6.1 8.8"
          stroke="#FCE7B2"
          strokeWidth="1.6"
          strokeLinecap="round"
          fill="none"
        />
      ) : (
        <path
          d="M9 10L15 14"
          stroke="rgba(244, 223, 196, 0.25)"
          strokeWidth="1.4"
          strokeLinecap="round"
        />
      )}
    </svg>
  );
}

/**
 * Slim world-matched perimeter HUD bar positioned cleanly above the level canvas
 * so 100% of the three-floor artwork and Top-Right Sacred Tree Leaf remain unobstructed.
 */
export function GameHUD({
  hud,
  mode,
  muted,
  onToggleMute,
  onRestart,
  onPause,
  onSwitchMode,
}: GameHUDProps) {
  return (
    <div
      className="flex w-full shrink-0 items-center justify-between gap-2 rounded-lg border border-[#DC9862]/35 bg-[#0B0F19]/95 px-3 py-1.5 shadow-[0_8px_24px_rgba(0,0,0,0.45)]"
      aria-label="Game status"
    >
      {/* Left vitality & progression readouts (zero pill enclosures) */}
      <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5">
        <div className="flex items-center gap-1" aria-label={`Hearts ${hud.hearts} of ${hud.maxHearts}`}>
          {Array.from({ length: hud.maxHearts }).map((_, idx) => (
            <VitalitySocket key={idx} filled={idx < hud.hearts} />
          ))}
        </div>

        <span className="text-[#DC9862]/40" aria-hidden="true">·</span>

        <div className="flex items-baseline gap-1.5">
          <span className="text-[10px] font-semibold tracking-wider text-[#DC9862]">FLOOR</span>
          <span
            data-testid="hud-floor"
            className="font-mono-tabular text-sm font-bold text-[#F4DFC4] sm:text-base"
          >
            {hud.floor}/3
          </span>
        </div>

        <span className="text-[#DC9862]/40" aria-hidden="true">·</span>

        <div className="flex items-baseline gap-1.5">
          <span className="text-[10px] font-semibold tracking-wider text-[#DC9862]">SEALS</span>
          <span
            data-testid="hud-seals"
            className="font-mono-tabular text-sm font-bold text-[#F4DFC4] sm:text-base"
          >
            {hud.sealsCollected}/{hud.totalSeals}
          </span>
        </div>

        <span className="hidden text-[#DC9862]/40 sm:inline" aria-hidden="true">·</span>

        <span
          data-testid="hud-timer"
          className="hidden font-mono-tabular text-sm font-semibold text-[#F4DFC4]/90 sm:inline"
        >
          {formatClock(hud.elapsedSeconds)}
        </span>

        <span className="hidden text-[#DC9862]/40 md:inline" aria-hidden="true">·</span>

        <span className="hidden text-xs font-semibold text-[#7EE08F] md:inline">
          {mode === 'hand' ? 'Prototype 2 · Hand Tracking' : 'Prototype 1 · Keyboard'}
        </span>
      </div>

      {/* Right utility controls */}
      <div className="flex items-center gap-1.5">
        <button
          type="button"
          tabIndex={-1}
          onClick={(e) => {
            e.currentTarget.blur();
            onSwitchMode();
          }}
          aria-label={mode === 'hand' ? 'Switch to Keyboard controls' : 'Switch to Hand Tracking controls'}
          className="flex h-8 items-center whitespace-nowrap shrink-0 rounded-md border border-[#DC9862]/40 bg-[#171312] px-2.5 text-xs font-semibold text-[#F4DFC4] transition-colors duration-150 hover:border-[#DC9862] hover:bg-[#231D1A]"
        >
          {mode === 'hand' ? 'Keyboard' : 'Hand Mode'}
        </button>

        <button
          type="button"
          tabIndex={-1}
          onClick={(e) => {
            e.currentTarget.blur();
            onToggleMute();
          }}
          aria-label={muted ? 'Unmute audio' : 'Mute audio'}
          title="Mute [M]"
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-[#DC9862]/40 bg-[#171312] text-[#F4DFC4] transition-colors duration-150 hover:border-[#DC9862] hover:bg-[#231D1A]"
        >
          {muted ? (
            <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M11 5L6 9H2v6h4l5 4V5z" />
              <line x1="23" y1="9" x2="17" y2="15" />
              <line x1="17" y1="9" x2="23" y2="15" />
            </svg>
          ) : (
            <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M11 5L6 9H2v6h4l5 4V5z" />
              <path d="M15.5 8.5a5 5 0 0 1 0 7" />
              <path d="M19 5a10 10 0 0 1 0 14" />
            </svg>
          )}
        </button>

        <button
          type="button"
          tabIndex={-1}
          onClick={(e) => {
            e.currentTarget.blur();
            onRestart();
          }}
          aria-label="Restart level"
          title="Restart [R]"
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-[#DC9862]/40 bg-[#171312] text-[#F4DFC4] transition-colors duration-150 hover:border-[#DC9862] hover:bg-[#231D1A]"
        >
          <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 12a9 9 0 1 0 3-6.7L3 8" />
            <path d="M3 3v5h5" />
          </svg>
        </button>

        <button
          type="button"
          tabIndex={-1}
          onClick={(e) => {
            e.currentTarget.blur();
            onPause();
          }}
          aria-label="Pause game"
          title="Pause [P]"
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-[#DC9862]/40 bg-[#171312] text-[#F4DFC4] transition-colors duration-150 hover:border-[#DC9862] hover:bg-[#231D1A]"
        >
          <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor">
            <rect x="6" y="4" width="4" height="16" rx="1" />
            <rect x="14" y="4" width="4" height="16" rx="1" />
          </svg>
        </button>
      </div>
    </div>
  );
}
