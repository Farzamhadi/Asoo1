import type { Collectible, Hazard, MovingPlatform, PatrolEnemy, Platform, Rect, Updraft } from './types';

export const WORLD_WIDTH = 1300;
export const WORLD_HEIGHT = 1000;

export const LEVEL_ARTWORK_PATH = './assets/aistudio/AsoorikNewFace_65417697.jpg';

export const PLAYER_SPAWN = {
  x: 42,
  y: 890, // standing on Floor 1 Left (y = 936, player h = 46)
};

export const GOAL_LEAF_RECT: Rect = {
  x: 1094,
  y: 44,
  w: 98,
  h: 104,
};

/**
 * Regions in the uploaded artwork that contain static illustrations of
 * animated actors (goat, beetle+diamonds, guardian, tree fronds) so the
 * offscreen renderer cleanly patches them with sampled clay background color.
 */
export const ARTWORK_PATCH_RECTS: Array<Rect & { sampleX: number; sampleY: number }> = [
  // Static goat at bottom-left Floor 1
  { x: 24, y: 854, w: 80, h: 82, sampleX: 140, sampleY: 880 },
  // Static hovering beetle + diamond blocks above Floor 1 pit
  { x: 604, y: 790, w: 136, h: 102, sampleX: 575, sampleY: 820 },
  // Static horned warrior on Floor 3 Left
  { x: 72, y: 218, w: 78, h: 114, sampleX: 40, sampleY: 250 },
  // Static tree leaf crown at top-right (re-drawn animated with sway & emerald aura)
  { x: 1098, y: 40, w: 96, h: 100, sampleX: 1040, sampleY: 80 },
];

export const LEVEL_PLATFORMS: Platform[] = [
  // === FLOOR 1 (Bottom) ===
  { id: 'f1-left', x: 0, y: 936, w: 545, h: 64, kind: 'floor' },
  { id: 'f1-right', x: 730, y: 936, w: 570, h: 64, kind: 'floor' },

  // === FLOOR 2 (Middle) ===
  { id: 'f2-left', x: 0, y: 602, w: 545, h: 66, kind: 'floor' },
  // Underside hanging blocks on Floor 2 Left (solid bodies above sawtooth spikes)
  { id: 'f2-under-l', x: 0, y: 668, w: 260, h: 66, kind: 'ceiling' },
  { id: 'f2-under-r', x: 342, y: 668, w: 263, h: 66, kind: 'ceiling' },
  // Floor 2 Right is one-way from below so the Soaring Birds updraft lifts the goat seamlessly onto Floor 2!
  { id: 'f2-right', x: 730, y: 602, w: 570, h: 66, kind: 'floor', oneWay: true },
  // Elevated plinth on Floor 2 Far Right
  { id: 'f2-plinth', x: 1040, y: 540, w: 260, h: 62, kind: 'plinth', oneWay: true },
  // Far-Right Wall Ledge stepping from Floor 2 Plinth up to Floor 3
  { id: 'f2-right-ledge', x: 1226, y: 424, w: 74, h: 42, kind: 'ledge', oneWay: true },

  // === FLOOR 3 (Upper) ===
  // Star-Dot Ancient Bridge connecting Far-Right Ledge to Floor 3 Right
  { id: 'f3-star-bridge', x: 1102, y: 342, w: 96, h: 24, kind: 'star-bridge', oneWay: true },
  // Floor 3 Right patterned beam
  { id: 'f3-right-beam', x: 604, y: 332, w: 498, h: 36, kind: 'floor', oneWay: true },
  // Floor 3 Left patterned blocks
  { id: 'f3-left-a', x: 0, y: 332, w: 260, h: 64, kind: 'floor' },
  { id: 'f3-left-b', x: 342, y: 332, w: 262, h: 64, kind: 'floor' },

  // Upper Ceiling Blocks above Floor 3 (solid upper bodies; sawtooth spikes below)
  { id: 'f3-ceil-l', x: 272, y: 172, w: 262, h: 64, kind: 'ceiling' },
  { id: 'f3-ceil-r', x: 614, y: 172, w: 264, h: 64, kind: 'ceiling' },

  // Black Combed Altar / Stepping Crate on Floor 3 Right
  { id: 'f3-altar', x: 930, y: 256, w: 84, h: 56, kind: 'altar', oneWay: true },

  // Top-Right Sacred Tree Pedestal
  { id: 'f3-tree-pedestal', x: 1048, y: 140, w: 124, h: 60, kind: 'pedestal', oneWay: true },
];

export const LEVEL_HAZARDS: Hazard[] = [
  // Floor 1 Left X-Totem Spike (slightly inset from visual edges for fair platforming)
  { id: 'h-f1-xspike', x: 280, y: 886, w: 46, h: 50, kind: 'x-spike' },
  // Floor 1 Scalloped Pit Hazard
  { id: 'h-f1-pit', x: 552, y: 956, w: 172, h: 44, kind: 'pit' },
  // Floor 2 Left Underside Sawtooth Spikes
  { id: 'h-f2-under-l', x: 6, y: 724, w: 248, h: 14, kind: 'ceiling-spikes' },
  { id: 'h-f2-under-r', x: 348, y: 724, w: 252, h: 14, kind: 'ceiling-spikes' },
  // Floor 2 Left X-Totem Spike
  { id: 'h-f2-xspike', x: 280, y: 552, w: 46, h: 50, kind: 'x-spike' },
  // Floor 3 Left Underside Sawtooth Spikes
  { id: 'h-f3-under-l', x: 6, y: 396, w: 248, h: 16, kind: 'ceiling-spikes' },
  { id: 'h-f3-under-r', x: 348, y: 396, w: 250, h: 16, kind: 'ceiling-spikes' },
  // Floor 3 Left Vertical Double-Hourglass Spike Totem
  { id: 'h-f3-totem-l', x: 282, y: 356, w: 44, h: 108, kind: 'totem-column' },
  // Upper Ceiling Sawtooth Spikes above Floor 3
  { id: 'h-ceil-l', x: 278, y: 236, w: 250, h: 14, kind: 'ceiling-spikes' },
  { id: 'h-ceil-r', x: 620, y: 236, w: 252, h: 14, kind: 'ceiling-spikes' },
  // Center Vertical Double-Hourglass Spike Totem between upper ceiling blocks
  { id: 'h-ceil-totem', x: 552, y: 196, w: 44, h: 108, kind: 'totem-column' },
];

export const LEVEL_UPDRAFT: Updraft = {
  // Soaring 3-bird thermal on Floor 1 Right leading straight up to Floor 2 Right
  id: 'birds-updraft',
  x: 985,
  y: 748,
  w: 92,
  h: 170,
  boostVy: -1080,
  targetFloor: 2,
};

export function createInitialBeetlePlatforms(): MovingPlatform[] {
  // Two diagonal diamond stepping stones carried by the hovering horned beetle above the Floor 1 pit.
  // Landing on the upper diamond grants a lively spring bounce up toward Floor 2!
  return [
    {
      id: 'beetle-lower',
      x: 634,
      y: 840,
      w: 54,
      h: 44,
      baseX: 634,
      baseY: 840,
      ampX: 0,
      ampY: 11,
      speed: 2.1,
      phase: 0,
      vx: 0,
      vy: 0,
    },
    {
      id: 'beetle-upper',
      x: 684,
      y: 794,
      w: 50,
      h: 44,
      baseX: 684,
      baseY: 794,
      ampX: 0,
      ampY: 11,
      speed: 2.1,
      phase: 0,
      bounceVy: -790,
      vx: 0,
      vy: 0,
    },
  ];
}

export function createInitialGuardian(): PatrolEnemy {
  return {
    id: 'horned-guardian',
    x: 92,
    y: 230,
    w: 48,
    h: 102,
    minX: 28,
    maxX: 204,
    vx: 68,
    facing: 1,
    stompTimer: 0,
    stompCooldown: 2.6,
    state: 'patrol',
  };
}

export function createInitialCollectibles(): Collectible[] {
  return [
    {
      id: 'seal-f1',
      x: 845,
      y: 888,
      r: 18,
      collected: false,
      label: 'Floor 1 Sun Seal',
    },
    {
      id: 'seal-f2',
      x: 132,
      y: 552,
      r: 18,
      collected: false,
      label: 'Floor 2 Terrace Seal',
    },
    {
      id: 'seal-f3',
      x: 745,
      y: 292,
      r: 18,
      collected: false,
      label: 'Floor 3 Canopy Seal',
    },
  ];
}
