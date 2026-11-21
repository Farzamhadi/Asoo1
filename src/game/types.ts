export type GamePhase = 'title' | 'playing' | 'paused' | 'victory' | 'defeat';

export type ControlMode = 'keyboard' | 'hand';

export type HandActionLabel =
  | 'NONE'
  | 'OPEN'
  | 'PINCH_LEFT'
  | 'PINCH_RIGHT'
  | 'PINCH_CENTER'
  | 'FIST_JUMP';

export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface Platform extends Rect {
  id: string;
  oneWay?: boolean;
  kind: 'floor' | 'plinth' | 'ledge' | 'star-bridge' | 'altar' | 'pedestal' | 'ceiling';
  bounceVy?: number;
}

export interface Hazard extends Rect {
  id: string;
  kind: 'x-spike' | 'pit' | 'ceiling-spikes' | 'totem-column';
}

export interface Updraft extends Rect {
  id: string;
  boostVy: number;
  targetFloor: number;
}

export interface Collectible {
  id: string;
  x: number;
  y: number;
  r: number;
  collected: boolean;
  label: string;
}

export interface MovingPlatform extends Rect {
  id: string;
  baseX: number;
  baseY: number;
  ampX: number;
  ampY: number;
  speed: number;
  phase: number;
  bounceVy?: number;
  vx: number;
  vy: number;
}

export interface PatrolEnemy {
  id: string;
  x: number;
  y: number;
  w: number;
  h: number;
  minX: number;
  maxX: number;
  vx: number;
  facing: 1 | -1;
  stompTimer: number;
  stompCooldown: number;
  state: 'patrol' | 'windup' | 'stomp';
}

export interface PlayerState {
  x: number;
  y: number;
  w: number;
  h: number;
  vx: number;
  vy: number;
  facing: 1 | -1;
  grounded: boolean;
  coyoteTimer: number;
  jumpBufferTimer: number;
  invulnTimer: number;
  hitFlashTimer: number;
  hearts: number;
  maxHearts: number;
  scaleX: number;
  scaleY: number;
  strideDistance: number;
  floor: 1 | 2 | 3;
  lastSafeX: number;
  lastSafeY: number;
  updraftCooldown: number;
}

export interface InputSnapshot {
  moveX: -1 | 0 | 1;
  jumpHeld: boolean;
  jumpJustPressed: boolean;
}

export interface SimEvent {
  type:
    | 'jump'
    | 'land'
    | 'updraft'
    | 'bounce'
    | 'hurt'
    | 'collect'
    | 'victory'
    | 'defeat'
    | 'stomp';
  x: number;
  y: number;
  intensity?: number;
}

export interface WorldState {
  phase: GamePhase;
  time: number;
  elapsedPlayTime: number;
  hitstopTimer: number;
  trauma: number;
  defeatDelayTimer: number;
  player: PlayerState;
  beetlePlatforms: MovingPlatform[];
  guardian: PatrolEnemy;
  collectibles: Collectible[];
  goalReached: boolean;
  events: SimEvent[];
}

export interface HudSnapshot {
  phase: GamePhase;
  hearts: number;
  maxHearts: number;
  floor: 1 | 2 | 3;
  elapsedSeconds: number;
  sealsCollected: number;
  totalSeals: number;
  goalReached: boolean;
}

export interface RunStats {
  outcome: 'victory' | 'defeat';
  clearTimeSeconds: number;
  floorReached: 1 | 2 | 3;
  sealsCollected: number;
  totalSeals: number;
  heartsRemaining: number;
  maxHearts: number;
  mode: ControlMode;
}

export interface Point2D {
  x: number;
  y: number;
  z?: number;
}

export interface HandGestureFrame {
  handsDetected: number;
  action: HandActionLabel;
  moveX: -1 | 0 | 1;
  isFist: boolean;
  isPinching: boolean;
  pinchStrength: number; // 0..1 (1 = tightly pinched)
  fistStrength: number; // 0..1 (1 = fully closed fist)
  pointerX: number | null; // mirrored normalized X (0 = left, 1 = right)
  pointerY: number | null;
}

export type CameraStatus =
  | 'idle'
  | 'requesting'
  | 'loading-model'
  | 'tracking'
  | 'denied'
  | 'error'
  | 'simulator';
