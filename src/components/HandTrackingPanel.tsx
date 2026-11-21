import { useEffect, useRef, useState } from 'react';
import { createIdleGestureFrame } from '../game/gestures';
import { MediaPipeHandTracker } from '../game/handTracker';
import type { CameraStatus, HandActionLabel, HandGestureFrame } from '../game/types';

interface HandTrackingPanelProps {
  active: boolean;
  onGestureFrame: (frame: HandGestureFrame) => void;
  onSwitchToKeyboard: () => void;
}

const ACTION_COPY: Record<HandActionLabel, { text: string; tone: string }> = {
  NONE: { text: 'Show hand to camera', tone: 'text-[#F4DFC4]/75' },
  OPEN: { text: 'Open hand · Idle', tone: 'text-[#F4DFC4]' },
  PINCH_LEFT: { text: 'Pinch Left · Moving Left', tone: 'text-[#DC9862]' },
  PINCH_RIGHT: { text: 'Pinch Right · Moving Right', tone: 'text-[#DC9862]' },
  PINCH_CENTER: { text: 'Pinch Center · Hold', tone: 'text-[#F4DFC4]' },
  FIST_JUMP: { text: 'Fist Clenched · Jump', tone: 'text-[#7EE08F]' },
};

const STATUS_LABEL: Record<CameraStatus, string> = {
  idle: 'Webcam off',
  requesting: 'Requesting webcam…',
  'loading-model': 'Loading MediaPipe…',
  tracking: 'MediaPipe active',
  denied: 'Permission needed',
  error: 'Camera unavailable',
  simulator: 'Gesture pad active',
};

export function HandTrackingPanel({
  active,
  onGestureFrame,
  onSwitchToKeyboard,
}: HandTrackingPanelProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const overlayRef = useRef<HTMLCanvasElement | null>(null);
  const trackerRef = useRef<MediaPipeHandTracker | null>(null);
  const onGestureRef = useRef(onGestureFrame);
  onGestureRef.current = onGestureFrame;

  const [status, setStatus] = useState<CameraStatus>('idle');
  const [errorMsg, setErrorMsg] = useState<string>('');
  const [gesture, setGesture] = useState<HandGestureFrame>(createIdleGestureFrame);

  const enableWebcam = () => {
    if (!videoRef.current || !overlayRef.current) return;
    setErrorMsg('');
    trackerRef.current?.start(videoRef.current, overlayRef.current);
  };

  useEffect(() => {
    const tracker = new MediaPipeHandTracker({
      onStatus: (nextStatus, message) => {
        setStatus(nextStatus);
        setErrorMsg(message ?? '');
      },
      onGesture: (frame) => {
        setGesture(frame);
        onGestureRef.current(frame);
      },
    });
    trackerRef.current = tracker;

    return () => {
      tracker.dispose();
      trackerRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (!active) {
      trackerRef.current?.stop();
      setStatus('idle');
      setErrorMsg('');
      setGesture(createIdleGestureFrame());
    }
  }, [active]);

  const triggerSimulatedGesture = (
    action: HandActionLabel,
    moveX: -1 | 0 | 1,
    isPinching: boolean,
    isFist: boolean,
    pointerX: number | null
  ) => {
    if (status !== 'tracking') {
      setStatus('simulator');
    }
    const frame: HandGestureFrame = {
      handsDetected: action === 'NONE' ? 0 : 1,
      action,
      moveX,
      isFist,
      isPinching,
      pinchStrength: isPinching ? 0.94 : 0.12,
      fistStrength: isFist ? 0.96 : 0.14,
      pointerX,
      pointerY: 0.5,
    };
    setGesture(frame);
    onGestureRef.current(frame);
  };

  if (!active) return null;

  const actionMeta = ACTION_COPY[gesture.action];
  const pinchPct = Math.round(gesture.pinchStrength * 100);
  const fistPct = Math.round(gesture.fistStrength * 100);
  const pointerLeftPct = gesture.pointerX !== null ? Math.round(gesture.pointerX * 100) : 50;
  const needsEnablePrompt = status === 'idle' || status === 'denied' || status === 'error';

  return (
    <aside
      aria-label="Webcam hand tracking feedback"
      data-testid="hand-tracking-panel"
      className="flex w-full shrink-0 flex-col gap-3 rounded-lg border border-[#DC9862]/40 bg-[#120F0E] p-3.5 shadow-[0_16px_44px_rgba(0,0,0,0.55)] lg:w-[308px]"
    >
      {/* Header row (unboxed metadata, zero pills) */}
      <div className="flex items-baseline justify-between gap-2 border-b border-[#DC9862]/20 pb-2">
        <h2 className="font-display text-sm font-bold tracking-wider text-[#DC9862]">
          HAND TRACKING
        </h2>
        <span data-testid="camera-status" className="text-xs font-medium text-[#F4DFC4]/80">
          {STATUS_LABEL[status]}
        </span>
      </div>

      {/* Live mirrored webcam feed + 21-point MediaPipe landmark overlay */}
      <div className="relative aspect-[4/3] w-full overflow-hidden rounded-md border border-[#DC9862]/30 bg-[#090B10]">
        <video
          ref={videoRef}
          playsInline
          muted
          className="h-full w-full -scale-x-100 object-cover"
        />
        <canvas
          ref={overlayRef}
          width={320}
          height={240}
          className="pointer-events-none absolute inset-0 h-full w-full"
        />

        {/* Zone captions along top edge */}
        <div className="pointer-events-none absolute inset-x-2 top-1.5 flex justify-between text-[10px] font-semibold tracking-wide text-[#F4DFC4]/75">
          <span>◀ PINCH LEFT</span>
          <span>PINCH RIGHT ▶</span>
        </div>

        {/* Prompt / Loading / Error scrim */}
        {(needsEnablePrompt || status === 'requesting' || status === 'loading-model') && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2.5 bg-[#0B0F19]/92 px-4 text-center">
            {status === 'requesting' || status === 'loading-model' ? (
              <p className="text-xs font-medium text-[#F4DFC4]">
                {status === 'requesting'
                  ? 'Waiting for webcam permission…'
                  : 'Loading MediaPipe Hand Landmarker…'}
              </p>
            ) : (
              <>
                <p className="text-xs leading-relaxed text-[#F4DFC4]/90">
                  {errorMsg ||
                    'Enable your webcam so MediaPipe can track your hands. Pinch left or right to run, and clench a fist to jump.'}
                </p>
                <button
                  type="button"
                  data-testid="enable-webcam-btn"
                  onClick={enableWebcam}
                  className="rounded-md bg-[#4C9A5E] px-4 py-2 text-xs font-bold text-[#07130B] transition-colors hover:bg-[#5FB473]"
                >
                  Enable Webcam
                </button>
              </>
            )}
          </div>
        )}
      </div>

      {/* Active Gesture Readout (Non-hue-only: explicit label + steering track) */}
      <div className="rounded-md border border-[#DC9862]/25 bg-[#0B0F19] px-3 py-2.5">
        <div className="flex items-center justify-between gap-2">
          <span className="text-[11px] font-medium text-[#F4DFC4]/65">Detected Gesture</span>
          <span className="font-mono-tabular text-[11px] text-[#F4DFC4]/70">
            {gesture.handsDetected} {gesture.handsDetected === 1 ? 'hand' : 'hands'}
          </span>
        </div>
        <div
          data-testid="gesture-readout"
          className={`mt-1 text-sm font-bold tracking-tight ${actionMeta.tone}`}
        >
          {actionMeta.text}
        </div>

        {/* Horizontal Pinch Steering Zone Bar */}
        <div className="mt-2.5">
          <div className="flex justify-between text-[10px] font-medium text-[#F4DFC4]/60">
            <span className={gesture.moveX === -1 ? 'font-bold text-[#DC9862]' : ''}>Left</span>
            <span>Neutral</span>
            <span className={gesture.moveX === 1 ? 'font-bold text-[#DC9862]' : ''}>Right</span>
          </div>
          <div className="relative mt-1 h-2 w-full rounded-full bg-[#F4DFC4]/10">
            <div className="absolute inset-y-0 left-[44%] w-px bg-[#F4DFC4]/30" />
            <div className="absolute inset-y-0 left-[56%] w-px bg-[#F4DFC4]/30" />
            <div
              className="absolute top-1/2 h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full border border-[#0B0F19] transition-transform duration-75"
              style={{
                left: `${pointerLeftPct}%`,
                backgroundColor: gesture.isFist
                  ? '#7EE08F'
                  : gesture.isPinching
                    ? '#DC9862'
                    : '#F4DFC4',
              }}
            />
          </div>
        </div>
      </div>

      {/* Pinch & Fist Proximity Gauges */}
      <div className="grid grid-cols-2 gap-2.5">
        <div>
          <div className="flex justify-between text-[11px]">
            <span className="text-[#F4DFC4]/75">Pinch</span>
            <span className="font-mono-tabular font-semibold text-[#DC9862]">{pinchPct}%</span>
          </div>
          <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-[#F4DFC4]/12">
            <div
              className="h-full bg-[#DC9862] transition-all duration-75"
              style={{ width: `${pinchPct}%` }}
            />
          </div>
        </div>

        <div>
          <div className="flex justify-between text-[11px]">
            <span className="text-[#F4DFC4]/75">Fist Jump</span>
            <span className="font-mono-tabular font-semibold text-[#7EE08F]">{fistPct}%</span>
          </div>
          <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-[#F4DFC4]/12">
            <div
              className="h-full bg-[#7EE08F] transition-all duration-75"
              style={{ width: `${fistPct}%` }}
            />
          </div>
        </div>
      </div>

      {/* Clear Gesture Guide */}
      <div className="space-y-1 text-xs leading-snug text-[#F4DFC4]/75">
        <p>
          <strong className="font-semibold text-[#F4DFC4]">Pinch (Thumb + Index):</strong> Hold on left or right side to move.
        </p>
        <p>
          <strong className="font-semibold text-[#7EE08F]">Closed Fist:</strong> Clench either hand to jump.
        </p>
      </div>

      {/* Gesture Test Pad for testing gestures without a webcam */}
      {status !== 'tracking' && (
        <div className="border-t border-[#DC9862]/20 pt-2.5">
          <div className="mb-1.5 flex items-center justify-between text-[11px] text-[#F4DFC4]/70">
            <span>Gesture Test Pad</span>
            {status === 'simulator' && (
              <button
                type="button"
                onClick={enableWebcam}
                className="font-semibold text-[#7EE08F] underline-offset-2 hover:underline"
              >
                Use Webcam
              </button>
            )}
          </div>
          <div className="grid grid-cols-3 gap-1.5">
            <button
              type="button"
              onPointerDown={() => triggerSimulatedGesture('PINCH_LEFT', -1, true, false, 0.2)}
              onPointerUp={() => triggerSimulatedGesture('OPEN', 0, false, false, 0.5)}
              onPointerLeave={() => triggerSimulatedGesture('OPEN', 0, false, false, 0.5)}
              className="rounded-md border border-[#DC9862]/40 bg-[#1B1614] py-2 text-xs font-semibold text-[#F4DFC4] transition-colors hover:border-[#DC9862] active:bg-[#DC9862] active:text-[#0B0F19]"
            >
              ◀ Pinch L
            </button>
            <button
              type="button"
              onPointerDown={() => triggerSimulatedGesture('FIST_JUMP', 0, false, true, 0.5)}
              onPointerUp={() => triggerSimulatedGesture('OPEN', 0, false, false, 0.5)}
              onPointerLeave={() => triggerSimulatedGesture('OPEN', 0, false, false, 0.5)}
              className="rounded-md border border-[#7EE08F]/50 bg-[#132018] py-2 text-xs font-semibold text-[#7EE08F] transition-colors hover:border-[#7EE08F] active:bg-[#4C9A5E] active:text-[#0B0F19]"
            >
              Fist Jump
            </button>
            <button
              type="button"
              onPointerDown={() => triggerSimulatedGesture('PINCH_RIGHT', 1, true, false, 0.82)}
              onPointerUp={() => triggerSimulatedGesture('OPEN', 0, false, false, 0.5)}
              onPointerLeave={() => triggerSimulatedGesture('OPEN', 0, false, false, 0.5)}
              className="rounded-md border border-[#DC9862]/40 bg-[#1B1614] py-2 text-xs font-semibold text-[#F4DFC4] transition-colors hover:border-[#DC9862] active:bg-[#DC9862] active:text-[#0B0F19]"
            >
              Pinch R ▶
            </button>
          </div>
        </div>
      )}

      {/* Quick switch back to Keyboard mode */}
      <button
        type="button"
        onClick={onSwitchToKeyboard}
        className="w-full rounded-md border border-[#F4DFC4]/20 bg-[#191514] py-2 text-xs font-semibold text-[#F4DFC4]/90 transition-colors hover:border-[#DC9862]/60 hover:text-[#F4DFC4]"
      >
        Switch to Prototype 1 (Keyboard)
      </button>
    </aside>
  );
}
