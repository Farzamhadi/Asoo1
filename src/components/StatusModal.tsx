import type { ControlMode, GamePhase, HudSnapshot, RunStats } from '../game/types';

interface StatusModalProps {
  phase: GamePhase;
  hud: HudSnapshot;
  runStats: RunStats | null;
  mode: ControlMode;
  onResume: () => void;
  onRestart: () => void;
  onSwitchMode: () => void;
  onReturnTitle: () => void;
  onDownloadGame: () => void;
  downloadNotice: string;
}

function formatTime(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

export function StatusModal({
  phase,
  hud,
  runStats,
  mode,
  onResume,
  onRestart,
  onSwitchMode,
  onReturnTitle,
  onDownloadGame,
  downloadNotice,
}: StatusModalProps) {
  if (phase !== 'paused' && phase !== 'victory' && phase !== 'defeat') {
    return null;
  }

  const isPaused = phase === 'paused';
  const isVictory = phase === 'victory';

  const heading = isPaused
    ? 'Game Paused'
    : isVictory
      ? 'Sacred Leaf Reached'
      : 'Ascent Interrupted';

  const subcopy = isPaused
    ? 'Rest on the terracotta ledge before continuing your climb.'
    : isVictory
      ? 'The mountain goat crossed all three ancient floors and reached the tree crown.'
      : 'The ancient spikes halted your climb. Rise and attempt the ascent again.';

  const timeVal = runStats && !isPaused ? runStats.clearTimeSeconds : hud.elapsedSeconds;
  const floorVal = runStats && !isPaused ? runStats.floorReached : hud.floor;
  const sealsVal = runStats && !isPaused ? runStats.sealsCollected : hud.sealsCollected;
  const totalSeals = runStats && !isPaused ? runStats.totalSeals : hud.totalSeals;
  const heartsVal = runStats && !isPaused ? runStats.heartsRemaining : hud.hearts;
  const maxHearts = runStats && !isPaused ? runStats.maxHearts : hud.maxHearts;

  return (
    <div
      className="fixed inset-0 z-30 flex items-center justify-center bg-[#0B0F19]/80 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="status-modal-title"
    >
      <div className="w-full max-w-[440px] rounded-xl border border-[#DC9862]/45 bg-[#14100E] p-6 shadow-[0_24px_70px_rgba(0,0,0,0.72)] sm:p-7">
        <h2
          id="status-modal-title"
          className={`font-display text-2xl font-bold tracking-wider ${
            isVictory ? 'text-[#7EE08F]' : 'text-[#DC9862]'
          }`}
        >
          {heading}
        </h2>
        <p className="mt-1.5 text-sm leading-relaxed text-[#F4DFC4]/80">{subcopy}</p>

        {/* Tabular stats strip */}
        <div className="my-5 grid grid-cols-3 gap-2.5">
          <div className="rounded-lg border border-[#DC9862]/25 bg-[#0B0F19] px-3 py-2.5 text-center">
            <div className="font-mono-tabular text-lg font-bold text-[#F4DFC4]">
              {formatTime(timeVal)}
            </div>
            <div className="mt-0.5 text-[11px] text-[#DC9862]">Time</div>
          </div>

          <div className="rounded-lg border border-[#DC9862]/25 bg-[#0B0F19] px-3 py-2.5 text-center">
            <div className="font-mono-tabular text-lg font-bold text-[#F4DFC4]">
              {floorVal}/3
            </div>
            <div className="mt-0.5 text-[11px] text-[#DC9862]">Floor</div>
          </div>

          <div className="rounded-lg border border-[#DC9862]/25 bg-[#0B0F19] px-3 py-2.5 text-center">
            <div className="font-mono-tabular text-lg font-bold text-[#F4DFC4]">
              {isVictory ? `${sealsVal}/${totalSeals}` : `${heartsVal}/${maxHearts}`}
            </div>
            <div className="mt-0.5 text-[11px] text-[#DC9862]">
              {isVictory ? 'Sun Seals' : 'Hearts'}
            </div>
          </div>
        </div>

        {/* Primary & Secondary Actions */}
        <div className="flex flex-col gap-2.5">
          {isPaused ? (
            <button
              type="button"
              onClick={onResume}
              className="w-full rounded-lg bg-[#DC9862] py-3 text-sm font-bold text-[#0B0F19] transition-colors hover:bg-[#E7AA76]"
            >
              Resume Climb
            </button>
          ) : (
            <button
              type="button"
              data-start="true"
              onClick={onRestart}
              className={`w-full rounded-lg py-3 text-sm font-bold transition-colors ${
                isVictory
                  ? 'bg-[#4C9A5E] text-[#07130B] hover:bg-[#5FB473]'
                  : 'bg-[#DC9862] text-[#0B0F19] hover:bg-[#E7AA76]'
              }`}
            >
              {isVictory ? 'Play Again' : 'Try Again'}
            </button>
          )}

          <div className="grid grid-cols-2 gap-2.5">
            {isPaused && (
              <button
                type="button"
                onClick={onRestart}
                className="rounded-lg border border-[#F4DFC4]/25 bg-[#1B1614] py-2.5 text-xs font-semibold text-[#F4DFC4] transition-colors hover:border-[#DC9862]"
              >
                Restart
              </button>
            )}
            <button
              type="button"
              onClick={onSwitchMode}
              className={`rounded-lg border border-[#F4DFC4]/25 bg-[#1B1614] py-2.5 text-xs font-semibold text-[#F4DFC4] transition-colors hover:border-[#DC9862] ${
                isPaused ? '' : 'col-span-1'
              }`}
            >
              {mode === 'hand' ? 'Switch to Keyboard' : 'Switch to Hand Mode'}
            </button>
            <button
              type="button"
              onClick={onReturnTitle}
              className={`rounded-lg border border-[#F4DFC4]/25 bg-[#1B1614] py-2.5 text-xs font-semibold text-[#F4DFC4] transition-colors hover:border-[#DC9862] ${
                isPaused ? 'col-span-2' : 'col-span-1'
              }`}
            >
              Title Screen
            </button>
          </div>

          <div className="mt-1 flex items-center justify-between border-t border-[#DC9862]/20 pt-3">
            <button
              type="button"
              onClick={onDownloadGame}
              className="text-xs font-semibold text-[#DC9862] underline-offset-4 hover:underline"
            >
              Download Standalone Game (.html)
            </button>
            {downloadNotice && (
              <span className="text-xs font-medium text-[#7EE08F]">{downloadNotice}</span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
