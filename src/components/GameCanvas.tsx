import { forwardRef, useEffect, useImperativeHandle, useRef } from 'react';
import { GameAudio } from '../game/audio';
import { WORLD_HEIGHT, WORLD_WIDTH } from '../game/levelData';
import { buildRunStats, createWorldState, getHudSnapshot, stepWorld } from '../game/physics';
import { GameRenderer } from '../game/renderer';
import type {
  ControlMode,
  GamePhase,
  HandGestureFrame,
  HudSnapshot,
  RunStats,
  WorldState,
} from '../game/types';

export interface GameCanvasHandle {
  startRun: (mode: ControlMode) => void;
  restartRun: () => void;
  setPhase: (phase: GamePhase) => void;
  setMode: (mode: ControlMode) => void;
  toggleMute: () => boolean;
  getArtworkImage: () => HTMLImageElement | null;
  updateHandGesture: (frame: HandGestureFrame) => void;
  setVirtualInput: (dir: -1 | 0 | 1, jumpPressed?: boolean, jumpHeld?: boolean) => void;
}

interface GameCanvasProps {
  initialAutostart: boolean;
  initialMode: ControlMode;
  onHudChange: (hud: HudSnapshot) => void;
  onRunEnd: (stats: RunStats) => void;
  onMuteChange: (muted: boolean) => void;
  onPauseToggle: () => void;
}

export const GameCanvas = forwardRef<GameCanvasHandle, GameCanvasProps>(function GameCanvas(
  { initialAutostart, initialMode, onHudChange, onRunEnd, onMuteChange, onPauseToggle },
  ref
) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const worldRef = useRef<WorldState>(createWorldState(initialAutostart ? 'playing' : 'title'));
  const modeRef = useRef<ControlMode>(initialMode);
  const rendererRef = useRef<GameRenderer | null>(null);
  const audioRef = useRef<GameAudio | null>(null);

  // Input state kept strictly outside React state for zero-latency 60fps loop
  const keysHeldRef = useRef<Set<string>>(new Set());
  const jumpEdgeRef = useRef<boolean>(false);
  const handMoveXRef = useRef<-1 | 0 | 1>(0);
  const handFistHeldRef = useRef<boolean>(false);
  const prevHandFistRef = useRef<boolean>(false);
  const virtualMoveXRef = useRef<-1 | 0 | 1>(0);
  const virtualJumpHeldRef = useRef<boolean>(false);

  // Callback refs so useEffect([], []) never re-mounts the canvas loop
  const callbacksRef = useRef({ onHudChange, onRunEnd, onMuteChange, onPauseToggle });
  callbacksRef.current = { onHudChange, onRunEnd, onMuteChange, onPauseToggle };

  const lastHudKeyRef = useRef<string>('');
  const runEndedNotifiedRef = useRef<boolean>(false);

  const pushHudIfChanged = (world: WorldState) => {
    const snap = getHudSnapshot(world);
    const key = `${snap.phase}|${snap.hearts}|${snap.floor}|${snap.elapsedSeconds}|${snap.sealsCollected}|${snap.goalReached}`;
    if (key !== lastHudKeyRef.current) {
      lastHudKeyRef.current = key;
      callbacksRef.current.onHudChange(snap);
    }
  };

  useImperativeHandle(ref, () => ({
    startRun(nextMode: ControlMode) {
      modeRef.current = nextMode;
      keysHeldRef.current.clear();
      jumpEdgeRef.current = false;
      handMoveXRef.current = 0;
      handFistHeldRef.current = false;
      prevHandFistRef.current = false;
      virtualMoveXRef.current = 0;
      virtualJumpHeldRef.current = false;
      runEndedNotifiedRef.current = false;
      worldRef.current = createWorldState('playing');
      audioRef.current?.unlock();
      pushHudIfChanged(worldRef.current);
    },
    restartRun() {
      keysHeldRef.current.clear();
      jumpEdgeRef.current = false;
      virtualMoveXRef.current = 0;
      virtualJumpHeldRef.current = false;
      runEndedNotifiedRef.current = false;
      worldRef.current = createWorldState('playing');
      audioRef.current?.unlock();
      pushHudIfChanged(worldRef.current);
    },
    setPhase(phase: GamePhase) {
      keysHeldRef.current.clear();
      jumpEdgeRef.current = false;
      virtualMoveXRef.current = 0;
      virtualJumpHeldRef.current = false;
      if (phase === 'title') {
        runEndedNotifiedRef.current = false;
        worldRef.current = createWorldState('title');
      } else {
        worldRef.current.phase = phase;
      }
      pushHudIfChanged(worldRef.current);
    },
    setMode(nextMode: ControlMode) {
      modeRef.current = nextMode;
      handMoveXRef.current = 0;
      handFistHeldRef.current = false;
      prevHandFistRef.current = false;
    },
    toggleMute() {
      const muted = audioRef.current ? audioRef.current.toggleMute() : false;
      callbacksRef.current.onMuteChange(muted);
      return muted;
    },
    getArtworkImage() {
      return rendererRef.current?.getSourceImage() ?? null;
    },
    updateHandGesture(frame: HandGestureFrame) {
      handMoveXRef.current = frame.moveX;
      if (frame.isFist && !prevHandFistRef.current) {
        jumpEdgeRef.current = true;
      }
      prevHandFistRef.current = frame.isFist;
      handFistHeldRef.current = frame.isFist;
    },
    setVirtualInput(dir: -1 | 0 | 1, jumpPressed = false, jumpHeld = false) {
      virtualMoveXRef.current = dir;
      if (jumpPressed) jumpEdgeRef.current = true;
      virtualJumpHeldRef.current = jumpHeld;
    },
  }));

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const renderer = new GameRenderer();
    const audio = new GameAudio();
    rendererRef.current = renderer;
    audioRef.current = audio;

    // Push initial HUD state once
    pushHudIfChanged(worldRef.current);

    const handleKeyDown = (e: KeyboardEvent) => {
      if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Space'].includes(e.code)) {
        e.preventDefault();
      }

      const phase = worldRef.current.phase;

      if (e.code === 'KeyM' && !e.repeat) {
        const nextMuted = audio.toggleMute();
        callbacksRef.current.onMuteChange(nextMuted);
        return;
      }

      if ((e.code === 'Escape' || e.code === 'KeyP') && !e.repeat) {
        if (phase === 'playing' || phase === 'paused') {
          callbacksRef.current.onPauseToggle();
          return;
        }
      }

      if (e.code === 'KeyR' && !e.repeat && phase === 'playing') {
        keysHeldRef.current.clear();
        jumpEdgeRef.current = false;
        runEndedNotifiedRef.current = false;
        worldRef.current = createWorldState('playing');
        pushHudIfChanged(worldRef.current);
        return;
      }

      if (
        (e.code === 'Space' || e.code === 'ArrowUp' || e.code === 'KeyW') &&
        !keysHeldRef.current.has(e.code)
      ) {
        jumpEdgeRef.current = true;
        audio.unlock();
      }

      keysHeldRef.current.add(e.code);
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      keysHeldRef.current.delete(e.code);
    };

    const clearHeld = () => {
      keysHeldRef.current.clear();
      virtualMoveXRef.current = 0;
      virtualJumpHeldRef.current = false;
    };

    const handleVisibility = () => {
      if (document.hidden) clearHeld();
    };

    window.addEventListener('keydown', handleKeyDown, { passive: false });
    window.addEventListener('keyup', handleKeyUp);
    window.addEventListener('blur', clearHeld);
    document.addEventListener('visibilitychange', handleVisibility);

    let rafId = 0;
    let lastTs = performance.now();

    const frame = (ts: number) => {
      const rawDt = (ts - lastTs) / 1000;
      lastTs = ts;
      const dt = Math.min(Math.max(rawDt, 0), 0.05);

      const keys = keysHeldRef.current;
      let moveX: -1 | 0 | 1 = 0;
      if (keys.has('ArrowLeft') || keys.has('KeyA')) moveX = (moveX - 1) as -1 | 0 | 1;
      if (keys.has('ArrowRight') || keys.has('KeyD')) moveX = (moveX + 1) as -1 | 0 | 1;

      if (virtualMoveXRef.current !== 0) {
        moveX = virtualMoveXRef.current;
      } else if (modeRef.current === 'hand' && handMoveXRef.current !== 0 && moveX === 0) {
        moveX = handMoveXRef.current;
      }

      const jumpHeld =
        keys.has('Space') ||
        keys.has('ArrowUp') ||
        keys.has('KeyW') ||
        virtualJumpHeldRef.current ||
        (modeRef.current === 'hand' && handFistHeldRef.current);

      const jumpJustPressed = jumpEdgeRef.current;
      jumpEdgeRef.current = false;

      const world = worldRef.current;
      stepWorld(world, dt, { moveX, jumpHeld, jumpJustPressed });

      if (world.events.length > 0) {
        renderer.emitFromEvents(world.events);
        for (const ev of world.events) {
          audio.handleEvent(ev);
        }
      }

      renderer.updateParticles(dt);
      renderer.render(ctx, world, WORLD_WIDTH, WORLD_HEIGHT);

      pushHudIfChanged(world);

      if ((world.phase === 'victory' || world.phase === 'defeat') && !runEndedNotifiedRef.current) {
        runEndedNotifiedRef.current = true;
        callbacksRef.current.onRunEnd(buildRunStats(world, modeRef.current));
      }

      rafId = window.requestAnimationFrame(frame);
    };

    rafId = window.requestAnimationFrame(frame);

    return () => {
      window.cancelAnimationFrame(rafId);
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      window.removeEventListener('blur', clearHeld);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      width={WORLD_WIDTH}
      height={WORLD_HEIGHT}
      data-testid="game-canvas"
      aria-label="Asoorik three-floor platformer level canvas"
      className="block h-full w-full rounded-lg border-2 border-[#DC9862]/40 bg-[#DC9862] shadow-[0_20px_56px_rgba(0,0,0,0.62)]"
    />
  );
});
