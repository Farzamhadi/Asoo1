import { FilesetResolver, HandLandmarker } from '@mediapipe/tasks-vision';
import {
  classifyHandsToControl,
  createIdleGestureFrame,
  PINCH_LEFT_MAX_X,
  PINCH_RIGHT_MIN_X,
} from './gestures';
import type { CameraStatus, HandGestureFrame, Point2D } from './types';

const WASM_URLS = [
  'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@1.2.3/wasm',
  'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/wasm',
];

const MODEL_URL =
  'https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task';

// Hand skeleton bone connections (21 MediaPipe landmarks)
const HAND_CONNECTIONS: Array<[number, number]> = [
  [0, 1], [1, 2], [2, 3], [3, 4], // Thumb
  [0, 5], [5, 6], [6, 7], [7, 8], // Index
  [5, 9], [9, 10], [10, 11], [11, 12], // Middle
  [9, 13], [13, 14], [14, 15], [15, 16], // Ring
  [13, 17], [0, 17], [17, 18], [18, 19], [19, 20], // Pinky
];

export interface HandTrackerCallbacks {
  onStatus: (status: CameraStatus, errorMessage?: string) => void;
  onGesture: (frame: HandGestureFrame) => void;
}

export class MediaPipeHandTracker {
  private landmarker: HandLandmarker | null = null;
  private stream: MediaStream | null = null;
  private videoEl: HTMLVideoElement | null = null;
  private overlayCanvas: HTMLCanvasElement | null = null;
  private rafId = 0;
  private lastVideoTime = -1;
  private running = false;
  private callbacks: HandTrackerCallbacks;

  constructor(callbacks: HandTrackerCallbacks) {
    this.callbacks = callbacks;
  }

  public async start(videoEl: HTMLVideoElement, overlayCanvas: HTMLCanvasElement): Promise<void> {
    this.stop();
    this.videoEl = videoEl;
    this.overlayCanvas = overlayCanvas;
    this.running = true;

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      this.callbacks.onStatus('error', 'Camera API is not available in this browser.');
      return;
    }

    this.callbacks.onStatus('requesting');

    try {
      const timeoutPromise = new Promise<never>((_, reject) => {
        window.setTimeout(() => {
          reject(new DOMException('Camera permission request timed out.', 'TimeoutError'));
        }, 6000);
      });

      const stream = await Promise.race([
        navigator.mediaDevices.getUserMedia({
          video: {
            width: { ideal: 640 },
            height: { ideal: 480 },
            facingMode: 'user',
          },
          audio: false,
        }),
        timeoutPromise,
      ]);

      if (!this.running) {
        stream.getTracks().forEach((t) => t.stop());
        return;
      }

      this.stream = stream;
      videoEl.srcObject = stream;
      await videoEl.play();
    } catch (err) {
      if (!this.running) return;
      const name = err instanceof DOMException ? err.name : '';
      if (name === 'NotAllowedError' || name === 'PermissionDeniedError') {
        this.callbacks.onStatus(
          'denied',
          'Webcam access was blocked. Allow camera permission in your browser, or use the gesture pad below.'
        );
      } else if (name === 'TimeoutError') {
        this.callbacks.onStatus(
          'denied',
          'Webcam permission did not respond. Click Enable Webcam to retry, or use the gesture pad below.'
        );
      } else {
        this.callbacks.onStatus(
          'error',
          'No webcam detected. Connect a camera, use the gesture test pad below, or switch to keyboard.'
        );
      }
      return;
    }

    this.callbacks.onStatus('loading-model');

    try {
      if (!this.landmarker) {
        this.landmarker = await this.createLandmarker();
      }
      if (!this.running) return;
      this.callbacks.onStatus('tracking');
      this.loop();
    } catch (err) {
      if (!this.running) return;
      const msg = err instanceof Error ? err.message : 'Unable to load MediaPipe Hand Landmarker.';
      this.callbacks.onStatus('error', `Hand tracking model failed to load: ${msg}`);
    }
  }

  private async createLandmarker(): Promise<HandLandmarker> {
    let lastErr: unknown;
    for (const wasmUrl of WASM_URLS) {
      try {
        const vision = await FilesetResolver.forVisionTasks(wasmUrl);
        return await HandLandmarker.createFromOptions(vision, {
          baseOptions: {
            modelAssetPath: MODEL_URL,
            delegate: 'GPU',
          },
          runningMode: 'VIDEO',
          numHands: 2,
          minHandDetectionConfidence: 0.55,
          minHandPresenceConfidence: 0.5,
          minTrackingConfidence: 0.5,
        });
      } catch (err) {
        lastErr = err;
        try {
          const vision = await FilesetResolver.forVisionTasks(wasmUrl);
          return await HandLandmarker.createFromOptions(vision, {
            baseOptions: {
              modelAssetPath: MODEL_URL,
              delegate: 'CPU',
            },
            runningMode: 'VIDEO',
            numHands: 2,
            minHandDetectionConfidence: 0.55,
            minHandPresenceConfidence: 0.5,
            minTrackingConfidence: 0.5,
          });
        } catch (cpuErr) {
          lastErr = cpuErr;
        }
      }
    }
    throw lastErr ?? new Error('MediaPipe WASM initialization failed');
  }

  private loop = (): void => {
    if (!this.running || !this.videoEl || !this.overlayCanvas) return;

    const video = this.videoEl;
    if (this.landmarker && video.readyState >= 2 && video.currentTime !== this.lastVideoTime) {
      this.lastVideoTime = video.currentTime;
      const nowMs = performance.now();
      try {
        const result = this.landmarker.detectForVideo(video, nowMs);
        const hands: Point2D[][] = (result.landmarks ?? []).map((lmList) =>
          lmList.map((lm) => ({ x: lm.x, y: lm.y, z: lm.z }))
        );
        const gesture = classifyHandsToControl(hands);
        this.callbacks.onGesture(gesture);
        this.drawOverlay(this.overlayCanvas, hands, gesture);
      } catch {
        // Ignore transient video timestamp frame skips
      }
    }

    this.rafId = window.requestAnimationFrame(this.loop);
  };

  private drawOverlay(canvas: HTMLCanvasElement, hands: Point2D[][], gesture: HandGestureFrame): void {
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const w = canvas.width;
    const h = canvas.height;
    ctx.clearRect(0, 0, w, h);

    // Subtle steering zone guides (mirrored: Left < 0.44, Right > 0.56)
    const leftEdge = PINCH_LEFT_MAX_X * w;
    const rightEdge = PINCH_RIGHT_MIN_X * w;

    if (gesture.action === 'PINCH_LEFT') {
      ctx.fillStyle = 'rgba(220, 152, 98, 0.22)';
      ctx.fillRect(0, 0, leftEdge, h);
    } else if (gesture.action === 'PINCH_RIGHT') {
      ctx.fillStyle = 'rgba(220, 152, 98, 0.22)';
      ctx.fillRect(rightEdge, 0, w - rightEdge, h);
    } else if (gesture.action === 'FIST_JUMP') {
      ctx.fillStyle = 'rgba(126, 224, 143, 0.18)';
      ctx.fillRect(0, 0, w, h);
    }

    ctx.strokeStyle = 'rgba(244, 223, 196, 0.26)';
    ctx.setLineDash([4, 4]);
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(leftEdge, 0);
    ctx.lineTo(leftEdge, h);
    ctx.moveTo(rightEdge, 0);
    ctx.lineTo(rightEdge, h);
    ctx.stroke();
    ctx.setLineDash([]);

    // Draw each detected hand mirrored horizontally to match selfie video
    for (const hand of hands) {
      const toScreen = (pt: Point2D) => ({
        x: (1 - pt.x) * w,
        y: pt.y * h,
      });

      // Bones
      ctx.strokeStyle = gesture.isFist ? '#7EE08F' : '#F4DFC4';
      ctx.lineWidth = 2.2;
      ctx.beginPath();
      for (const [a, b] of HAND_CONNECTIONS) {
        const pa = toScreen(hand[a]);
        const pb = toScreen(hand[b]);
        ctx.moveTo(pa.x, pa.y);
        ctx.lineTo(pb.x, pb.y);
      }
      ctx.stroke();

      // Pinch connector beam between thumb tip (4) and index tip (8)
      const thumb = toScreen(hand[4]);
      const index = toScreen(hand[8]);
      ctx.strokeStyle = gesture.isPinching ? '#DC9862' : 'rgba(244, 223, 196, 0.4)';
      ctx.lineWidth = gesture.isPinching ? 4 : 1.5;
      ctx.beginPath();
      ctx.moveTo(thumb.x, thumb.y);
      ctx.lineTo(index.x, index.y);
      ctx.stroke();

      // Pinch midpoint glow ring
      if (gesture.isPinching) {
        const mx = (thumb.x + index.x) * 0.5;
        const my = (thumb.y + index.y) * 0.5;
        ctx.strokeStyle = '#DC9862';
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.arc(mx, my, 12, 0, Math.PI * 2);
        ctx.stroke();
      }

      // 21 Landmark dots
      for (let i = 0; i < hand.length; i++) {
        const pt = toScreen(hand[i]);
        const isTip = i === 4 || i === 8 || i === 12 || i === 16 || i === 20;
        ctx.fillStyle =
          gesture.isFist && isTip
            ? '#7EE08F'
            : (i === 4 || i === 8) && gesture.isPinching
              ? '#DC9862'
              : '#0B0F19';
        ctx.strokeStyle = '#F4DFC4';
        ctx.lineWidth = 1.4;
        ctx.beginPath();
        ctx.arc(pt.x, pt.y, isTip ? 4.2 : 2.8, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
      }
    }
  }

  public stop(): void {
    this.running = false;
    if (this.rafId) {
      window.cancelAnimationFrame(this.rafId);
      this.rafId = 0;
    }
    if (this.stream) {
      this.stream.getTracks().forEach((t) => t.stop());
      this.stream = null;
    }
    if (this.videoEl) {
      this.videoEl.srcObject = null;
    }
    this.callbacks.onGesture(createIdleGestureFrame());
  }

  public dispose(): void {
    this.stop();
    if (this.landmarker) {
      try {
        this.landmarker.close();
      } catch {
        // Ignore close errors
      }
      this.landmarker = null;
    }
  }
}
