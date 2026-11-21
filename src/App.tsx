import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { GameCanvas, type GameCanvasHandle } from './components/GameCanvas';
import { GameHUD } from './components/GameHUD';
import { HandTrackingPanel } from './components/HandTrackingPanel';
import { StatusModal } from './components/StatusModal';
import { TitleOverlay } from './components/TitleOverlay';
import { triggerStandaloneGameDownload } from './game/standaloneExporter';
import type { ControlMode, HandGestureFrame, HudSnapshot, RunStats } from './game/types';

function readBootParams(): { autostart: boolean; initialMode: ControlMode } {
  if (typeof window === 'undefined') {
    return { autostart: false, initialMode: 'keyboard' };
  }
  const params = new URLSearchParams(window.location.search);
  const autostart = params.get('autostart') === '1';
  const modeParam = params.get('mode');
  const initialMode: ControlMode = modeParam === 'hand' ? 'hand' : 'keyboard';
  return { autostart, initialMode };
}

export default function App() {
  const boot = useMemo(() => readBootParams(), []);
  const canvasRef = useRef<GameCanvasHandle | null>(null);

  const [mode, setMode] = useState<ControlMode>(boot.initialMode);
  const [muted, setMuted] = useState(false);
  const [runStats, setRunStats] = useState<RunStats | null>(null);
  const [downloadNotice, setDownloadNotice] = useState('');
  const [hud, setHud] = useState<HudSnapshot>({
    phase: boot.autostart ? 'playing' : 'title',
    hearts: 3,
    maxHearts: 3,
    floor: 1,
    elapsedSeconds: 0,
    sealsCollected: 0,
    totalSeals: 3,
    goalReached: false,
  });

  // Mirror state machine to document.body.dataset.state ('title' | 'playing' | 'paused' | 'gameover')
  useEffect(() => {
    const mapped =
      hud.phase === 'victory' || hud.phase === 'defeat' ? 'gameover' : hud.phase;
    document.body.dataset.state = mapped;
    document.body.dataset.mode = mode;
  }, [hud.phase, mode]);

  const startMode = useCallback((chosenMode: ControlMode) => {
    setMode(chosenMode);
    setRunStats(null);
    document.body.dataset.state = 'playing';
    if (document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }
    canvasRef.current?.startRun(chosenMode);
  }, []);

  // Bind Enter / Space on Title screen to trigger primary Start CTA immediately
  useEffect(() => {
    if (hud.phase !== 'title') return;
    const onTitleKey = (e: KeyboardEvent) => {
      if (e.code === 'Enter' || e.code === 'Space') {
        e.preventDefault();
        startMode('keyboard');
      }
    };
    window.addEventListener('keydown', onTitleKey);
    return () => window.removeEventListener('keydown', onTitleKey);
  }, [hud.phase, startMode]);

  const handlePauseToggle = useCallback(() => {
    if (hud.phase === 'playing') {
      canvasRef.current?.setPhase('paused');
    } else if (hud.phase === 'paused') {
      canvasRef.current?.setPhase('playing');
    }
  }, [hud.phase]);

  const handleRestart = useCallback(() => {
    setRunStats(null);
    if (document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }
    canvasRef.current?.restartRun();
  }, []);

  const handleReturnTitle = useCallback(() => {
    setRunStats(null);
    canvasRef.current?.setPhase('title');
  }, []);

  const handleSwitchMode = useCallback(() => {
    const nextMode: ControlMode = mode === 'keyboard' ? 'hand' : 'keyboard';
    setMode(nextMode);
    canvasRef.current?.setMode(nextMode);
    if (hud.phase === 'paused') {
      canvasRef.current?.setPhase('playing');
    }
  }, [mode, hud.phase]);

  const handleToggleMute = useCallback(() => {
    canvasRef.current?.toggleMute();
  }, []);

  const handleHandGesture = useCallback((frame: HandGestureFrame) => {
    canvasRef.current?.updateHandGesture(frame);
  }, []);

  const handleDownloadGame = useCallback(() => {
    const img = canvasRef.current?.getArtworkImage() ?? null;
    triggerStandaloneGameDownload(img);
    setDownloadNotice('Downloaded asoorik-goat-platformer.html');
    window.setTimeout(() => setDownloadNotice(''), 4000);
  }, []);

  const isHandPanelVisible = mode === 'hand' && hud.phase !== 'title';
  const showHudStrip = hud.phase !== 'title';

  return (
    <main className="relative flex h-screen w-screen flex-col items-center justify-center overflow-y-auto overflow-x-hidden bg-[#16100C] p-2.5 sm:p-3.5 lg:overflow-hidden">
      {/* Main responsive shell: stage + optional docked Hand Tracking panel */}
      <div className="flex w-full max-w-[1410px] flex-col items-center justify-center gap-3 lg:h-full lg:flex-row lg:items-center">
        {/* Stage column: slim HUD strip above + strictly aspect-locked 13:10 canvas below */}
        <div className="flex w-full min-w-0 flex-col items-center justify-center gap-2 lg:h-full lg:flex-1">
          {showHudStrip && (
            <div className="w-full max-w-[1090px]">
              <GameHUD
                hud={hud}
                mode={mode}
                muted={muted}
                onToggleMute={handleToggleMute}
                onRestart={handleRestart}
                onPause={handlePauseToggle}
                onSwitchMode={handleSwitchMode}
              />
            </div>
          )}

          {/* Strictly viewport-bounded 13:10 canvas wrapper so 100% of all 3 floors fit with zero clipping */}
          <div
            className="relative flex w-full items-center justify-center lg:min-h-0 lg:flex-1"
          >
            <div
              className="relative aspect-[13/10] w-full max-w-full lg:h-full lg:w-auto"
              style={{
                maxHeight: showHudStrip ? 'calc(100vh - 84px)' : 'calc(100vh - 28px)',
                maxWidth: '100%',
              }}
            >
              <GameCanvas
                ref={canvasRef}
                initialAutostart={boot.autostart}
                initialMode={boot.initialMode}
                onHudChange={setHud}
                onRunEnd={setRunStats}
                onMuteChange={setMuted}
                onPauseToggle={handlePauseToggle}
              />
            </div>
          </div>

          {/* Mobile touch controls strictly below canvas on narrow screens during Keyboard mode */}
          {showHudStrip && mode === 'keyboard' && (
            <div className="flex w-full items-center justify-between gap-3 pt-1 md:hidden">
              <div className="flex gap-2">
                <button
                  type="button"
                  aria-label="Move Left"
                  onPointerDown={() => canvasRef.current?.setVirtualInput(-1, false, false)}
                  onPointerUp={() => canvasRef.current?.setVirtualInput(0, false, false)}
                  onPointerCancel={() => canvasRef.current?.setVirtualInput(0, false, false)}
                  onPointerLeave={() => canvasRef.current?.setVirtualInput(0, false, false)}
                  className="flex h-12 w-16 items-center justify-center rounded-lg border border-[#DC9862]/50 bg-[#0B0F19] text-base font-bold text-[#F4DFC4] active:bg-[#DC9862] active:text-[#0B0F19]"
                >
                  ◀
                </button>
                <button
                  type="button"
                  aria-label="Move Right"
                  onPointerDown={() => canvasRef.current?.setVirtualInput(1, false, false)}
                  onPointerUp={() => canvasRef.current?.setVirtualInput(0, false, false)}
                  onPointerCancel={() => canvasRef.current?.setVirtualInput(0, false, false)}
                  onPointerLeave={() => canvasRef.current?.setVirtualInput(0, false, false)}
                  className="flex h-12 w-16 items-center justify-center rounded-lg border border-[#DC9862]/50 bg-[#0B0F19] text-base font-bold text-[#F4DFC4] active:bg-[#DC9862] active:text-[#0B0F19]"
                >
                  ▶
                </button>
              </div>
              <button
                type="button"
                aria-label="Jump"
                onPointerDown={() => canvasRef.current?.setVirtualInput(0, true, true)}
                onPointerUp={() => canvasRef.current?.setVirtualInput(0, false, false)}
                onPointerCancel={() => canvasRef.current?.setVirtualInput(0, false, false)}
                className="flex h-12 items-center justify-center rounded-lg border border-[#7EE08F]/60 bg-[#132018] px-6 text-sm font-bold text-[#7EE08F] active:bg-[#4C9A5E] active:text-[#0B0F19]"
              >
                Jump
              </button>
            </div>
          )}
        </div>

        {/* Responsive Hand Tracking Panel (right side on desktop, stacked below canvas on mobile) */}
        <HandTrackingPanel
          active={isHandPanelVisible}
          onGestureFrame={handleHandGesture}
          onSwitchToKeyboard={() => {
            setMode('keyboard');
            canvasRef.current?.setMode('keyboard');
          }}
        />
      </div>

      {/* Title Screen Overlay */}
      {hud.phase === 'title' && (
        <TitleOverlay
          onSelectMode={startMode}
          onDownloadGame={handleDownloadGame}
          downloadNotice={downloadNotice}
        />
      )}

      {/* Pause / Victory / Defeat Modal */}
      <StatusModal
        phase={hud.phase}
        hud={hud}
        runStats={runStats}
        mode={mode}
        onResume={() => canvasRef.current?.setPhase('playing')}
        onRestart={handleRestart}
        onSwitchMode={handleSwitchMode}
        onReturnTitle={handleReturnTitle}
        onDownloadGame={handleDownloadGame}
        downloadNotice={downloadNotice}
      />
    </main>
  );
}
