import type { ControlMode } from '../game/types';

interface TitleOverlayProps {
  onSelectMode: (mode: ControlMode) => void;
  onDownloadGame: () => void;
  downloadNotice: string;
}

export function TitleOverlay({
  onSelectMode,
  onDownloadGame,
  downloadNotice,
}: TitleOverlayProps) {
  return (
    <div
      className="fixed inset-0 z-20 flex flex-col justify-between bg-gradient-to-r from-[#0B0F19]/90 via-[#0B0F19]/68 to-[#0B0F19]/28 p-5 sm:p-8 lg:p-12"
      role="dialog"
      aria-label="Asoorik game start menu"
    >
      {/* Top spacer for vertical balance */}
      <div className="h-2" />

      {/* Left-third negative-space title plaque leaving live goat & top-right tree visible */}
      <div className="w-full max-w-[460px] rounded-xl border border-[#DC9862]/45 bg-[#120E0D]/94 p-6 shadow-[0_24px_70px_rgba(0,0,0,0.68)] sm:p-8">
        {/* Bespoke inline SVG Title Lockup (Ibex Horn + Sacred Palm Leaf Crest) */}
        <div className="mb-5">
          <svg
            viewBox="0 0 360 88"
            className="h-auto w-full max-w-[330px]"
            role="img"
            aria-label="Asoorik: Ascent to the Sacred Leaf"
          >
            {/* Carved Ibex Horn & Sacred Leaf Emblem */}
            <g transform="translate(8, 8)">
              <rect
                x="0"
                y="4"
                width="58"
                height="58"
                rx="6"
                fill="#0B0F19"
                stroke="#DC9862"
                strokeWidth="2"
              />
              {/* Sweeping Ibex Horn */}
              <path
                d="M36 44 C38 22, 18 14, 13 30 C11 36, 16 40, 21 37"
                fill="none"
                stroke="#DC9862"
                strokeWidth="3.2"
                strokeLinecap="round"
              />
              {/* Sacred Leaf Frond */}
              <path
                d="M34 48 Q38 30 47 16 M39 32 Q31 28 28 22 M41 28 Q47 26 51 22"
                fill="none"
                stroke="#7EE08F"
                strokeWidth="2.6"
                strokeLinecap="round"
              />
            </g>

            {/* Monumental Display Wordmark */}
            <text
              x="82"
              y="46"
              fill="#F4DFC4"
              fontFamily="Cinzel, Georgia, serif"
              fontSize="36"
              fontWeight="800"
              letterSpacing="5"
            >
              ASOORIK
            </text>
            <line x1="82" y1="56" x2="342" y2="56" stroke="#DC9862" strokeOpacity="0.45" strokeWidth="1.2" />
            <text
              x="82"
              y="74"
              fill="#DC9862"
              fontFamily="Plus Jakarta Sans, system-ui, sans-serif"
              fontSize="12.5"
              fontWeight="600"
              letterSpacing="2.2"
            >
              ASCENT TO THE SACRED LEAF
            </text>
          </svg>
        </div>

        <p className="mb-6 text-sm leading-relaxed text-[#F4DFC4]/80">
          Guide the mountain goat across three ancient pottery floors, dodge spikes and the scalloped pit, ride the soaring birds, and reach the glowing tree leaf at the top right.
        </p>

        {/* The 2 Prototype Mode Options */}
        <div className="flex flex-col gap-3">
          <button
            type="button"
            data-start="true"
            onClick={() => onSelectMode('keyboard')}
            className="group flex w-full items-center justify-between gap-3 rounded-lg border border-[#DC9862] bg-[#DC9862] px-4 py-3.5 text-left text-[#0B0F19] transition-colors duration-150 hover:bg-[#E7AA76]"
          >
            <div>
              <div className="text-sm font-bold leading-tight sm:text-[15px]">
                Prototype 1 · Keyboard Controls
              </div>
              <div className="mt-0.5 text-xs font-medium text-[#0B0F19]/80">
                A / D or Arrow keys to move · Space to jump
              </div>
            </div>
            <span className="shrink-0 font-mono text-sm font-bold" aria-hidden="true">
              ▶
            </span>
          </button>

          <button
            type="button"
            data-testid="start-hand-mode"
            onClick={() => onSelectMode('hand')}
            className="group flex w-full items-center justify-between gap-3 rounded-lg border border-[#7EE08F]/60 bg-[#17281C] px-4 py-3.5 text-left text-[#F4DFC4] transition-colors duration-150 hover:border-[#7EE08F] hover:bg-[#1E3625]"
          >
            <div>
              <div className="text-sm font-bold leading-tight text-[#7EE08F] sm:text-[15px]">
                Prototype 2 · Webcam Hand Tracking
              </div>
              <div className="mt-0.5 text-xs font-medium text-[#F4DFC4]/80">
                MediaPipe hands · Pinch left/right to move · Fist to jump
              </div>
            </div>
            <span className="shrink-0 font-mono text-sm font-bold text-[#7EE08F]" aria-hidden="true">
              ▶
            </span>
          </button>

          <div className="mt-1 flex items-center justify-between gap-3 border-t border-[#DC9862]/20 pt-3.5">
            <button
              type="button"
              data-testid="download-game-btn"
              onClick={onDownloadGame}
              className="inline-flex items-center gap-2 whitespace-nowrap rounded-md border border-[#F4DFC4]/25 bg-[#1B1513] px-3.5 py-2 text-xs font-semibold text-[#F4DFC4] transition-colors duration-150 hover:border-[#DC9862] hover:text-[#DC9862]"
            >
              <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="7 10 12 15 17 10" />
                <line x1="12" y1="15" x2="12" y2="3" />
              </svg>
              Download Web Game (.html)
            </button>
            {downloadNotice && (
              <span className="text-xs font-medium text-[#7EE08F]">{downloadNotice}</span>
            )}
          </div>
        </div>
      </div>

      {/* Single flat borderless control-hint line in bottom safe margin */}
      <div className="text-xs font-medium tracking-wide text-[#F4DFC4]/70 hud-text-shadow">
        Enter Start Keyboard · A/D or ←/→ Move · Space Jump · P Pause · M Mute
      </div>
    </div>
  );
}
