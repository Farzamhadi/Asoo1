import {
  GOAL_LEAF_RECT,
  LEVEL_HAZARDS,
  LEVEL_PLATFORMS,
  LEVEL_UPDRAFT,
  PLAYER_SPAWN,
  WORLD_HEIGHT,
  WORLD_WIDTH,
  createInitialBeetlePlatforms,
  createInitialCollectibles,
  createInitialGuardian,
} from './levelData';
import type {
  ControlMode,
  GamePhase,
  HudSnapshot,
  InputSnapshot,
  PlayerState,
  Rect,
  RunStats,
  WorldState,
} from './types';

export const PHYSICS = {
  GRAVITY: 1480,
  FALL_GRAVITY_MULT: 1.15,
  MAX_FALL_SPEED: 880,
  MOVE_SPEED: 290,
  GROUND_ACCEL: 2400,
  GROUND_DECEL: 2200,
  AIR_ACCEL: 1700,
  AIR_DECEL: 750,
  JUMP_VY: -652,
  JUMP_CUT_MULT: 0.48,
  COYOTE_TIME: 0.11,
  JUMP_BUFFER_TIME: 0.12,
  INVULN_TIME: 1.35,
  HITSTOP_HURT: 0.055,
  HITSTOP_WIN: 0.06,
  PLAYER_W: 38,
  PLAYER_H: 46,
  MAX_DT: 0.05,
};

export function rectsOverlap(a: Rect, b: Rect): boolean {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}

export function computeFloor(playerBottomY: number): 1 | 2 | 3 {
  if (playerBottomY <= 445) return 3;
  if (playerBottomY <= 740) return 2;
  return 1;
}

export function createInitialPlayer(): PlayerState {
  return {
    x: PLAYER_SPAWN.x,
    y: PLAYER_SPAWN.y,
    w: PHYSICS.PLAYER_W,
    h: PHYSICS.PLAYER_H,
    vx: 0,
    vy: 0,
    facing: 1,
    grounded: true,
    coyoteTimer: PHYSICS.COYOTE_TIME,
    jumpBufferTimer: 0,
    invulnTimer: 0,
    hitFlashTimer: 0,
    hearts: 3,
    maxHearts: 3,
    scaleX: 1,
    scaleY: 1,
    strideDistance: 0,
    floor: 1,
    lastSafeX: PLAYER_SPAWN.x,
    lastSafeY: PLAYER_SPAWN.y,
    updraftCooldown: 0,
  };
}

export function createWorldState(initialPhase: GamePhase = 'title'): WorldState {
  return {
    phase: initialPhase,
    time: 0,
    elapsedPlayTime: 0,
    hitstopTimer: 0,
    trauma: 0,
    defeatDelayTimer: 0,
    player: createInitialPlayer(),
    beetlePlatforms: createInitialBeetlePlatforms(),
    guardian: createInitialGuardian(),
    collectibles: createInitialCollectibles(),
    goalReached: false,
    events: [],
  };
}

function stepAmbientActors(world: WorldState, dt: number): void {
  // Update hovering Beetle + Diamond platforms
  for (const bp of world.beetlePlatforms) {
    const prevX = bp.x;
    const prevY = bp.y;
    bp.x = bp.baseX + Math.sin(world.time * bp.speed + bp.phase) * bp.ampX;
    bp.y = bp.baseY + Math.sin(world.time * bp.speed + bp.phase) * bp.ampY;
    bp.vx = dt > 0 ? (bp.x - prevX) / dt : 0;
    bp.vy = dt > 0 ? (bp.y - prevY) / dt : 0;
  }

  // Update Horned Guardian on Floor 3 Left (patrol -> windup telegraph -> stomp)
  const g = world.guardian;
  if (g.state === 'patrol') {
    g.x += g.vx * dt;
    if (g.x <= g.minX) {
      g.x = g.minX;
      g.vx = Math.abs(g.vx);
      g.facing = 1;
    } else if (g.x >= g.maxX) {
      g.x = g.maxX;
      g.vx = -Math.abs(g.vx);
      g.facing = -1;
    }
    g.stompCooldown -= dt;
    if (g.stompCooldown <= 0) {
      g.state = 'windup';
      g.stompTimer = 0.45;
    }
  } else if (g.state === 'windup') {
    g.stompTimer -= dt;
    if (g.stompTimer <= 0) {
      g.state = 'stomp';
      g.stompTimer = 0.35;
      world.events.push({ type: 'stomp', x: g.x + g.w * 0.5, y: g.y + g.h });
    }
  } else if (g.state === 'stomp') {
    g.stompTimer -= dt;
    if (g.stompTimer <= 0) {
      g.state = 'patrol';
      g.stompCooldown = 2.8;
    }
  }
}

export function stepWorld(world: WorldState, rawDt: number, input: InputSnapshot): void {
  const dt = Math.min(Math.max(rawDt, 0), PHYSICS.MAX_DT);
  world.events.length = 0;

  // Decay camera trauma & hit flash in real time
  world.trauma = Math.max(0, world.trauma - dt * 1.9);
  if (world.player.hitFlashTimer > 0) {
    world.player.hitFlashTimer = Math.max(0, world.player.hitFlashTimer - dt);
  }

  // Keep world subtly alive during Title screen (player safe and idle)
  if (world.phase === 'title') {
    world.time += dt;
    stepAmbientActors(world, dt);
    return;
  }

  if (world.phase !== 'playing') {
    return;
  }

  // Brief final beat on defeat before showing Game Over modal
  if (world.defeatDelayTimer > 0) {
    world.defeatDelayTimer -= dt;
    if (world.defeatDelayTimer <= 0) {
      world.phase = 'defeat';
    }
    return;
  }

  // Sim-level hitstop freeze (rendering + trauma still decay above)
  if (world.hitstopTimer > 0) {
    world.hitstopTimer = Math.max(0, world.hitstopTimer - dt);
    return;
  }

  world.time += dt;
  world.elapsedPlayTime += dt;

  stepAmbientActors(world, dt);

  const p = world.player;
  const wasGrounded = p.grounded;
  const prevBottom = p.y + p.h;

  if (p.invulnTimer > 0) p.invulnTimer = Math.max(0, p.invulnTimer - dt);
  if (p.updraftCooldown > 0) p.updraftCooldown = Math.max(0, p.updraftCooldown - dt);

  // Smooth exponential damping of squash-and-stretch back to (1, 1)
  const damp = 1 - Math.exp(-14 * dt);
  p.scaleX += (1 - p.scaleX) * damp;
  p.scaleY += (1 - p.scaleY) * damp;

  // Horizontal movement acceleration / deceleration
  const targetVx = input.moveX * PHYSICS.MOVE_SPEED;
  if (input.moveX !== 0) {
    p.facing = input.moveX > 0 ? 1 : -1;
    const accel = p.grounded ? PHYSICS.GROUND_ACCEL : PHYSICS.AIR_ACCEL;
    if (p.vx < targetVx) {
      p.vx = Math.min(targetVx, p.vx + accel * dt);
    } else if (p.vx > targetVx) {
      p.vx = Math.max(targetVx, p.vx - accel * dt);
    }
  } else {
    const decel = p.grounded ? PHYSICS.GROUND_DECEL : PHYSICS.AIR_DECEL;
    if (Math.abs(p.vx) <= decel * dt) {
      p.vx = 0;
    } else {
      p.vx -= Math.sign(p.vx) * decel * dt;
    }
  }

  // Coyote time & jump buffer
  if (p.grounded) {
    p.coyoteTimer = PHYSICS.COYOTE_TIME;
  } else {
    p.coyoteTimer = Math.max(0, p.coyoteTimer - dt);
  }

  if (input.jumpJustPressed) {
    p.jumpBufferTimer = PHYSICS.JUMP_BUFFER_TIME;
  } else {
    p.jumpBufferTimer = Math.max(0, p.jumpBufferTimer - dt);
  }

  if (p.jumpBufferTimer > 0 && p.coyoteTimer > 0) {
    p.vy = PHYSICS.JUMP_VY;
    p.grounded = false;
    p.coyoteTimer = 0;
    p.jumpBufferTimer = 0;
    p.scaleX = 0.84;
    p.scaleY = 1.2;
    world.events.push({ type: 'jump', x: p.x + p.w * 0.5, y: p.y + p.h });
  }

  // Variable jump height cut when jump button released early while ascending
  if (!input.jumpHeld && p.vy < -220 && p.updraftCooldown <= 0) {
    p.vy *= Math.pow(PHYSICS.JUMP_CUT_MULT, dt * 18);
  }

  // Apply gravity
  const grav = p.vy > 0 ? PHYSICS.GRAVITY * PHYSICS.FALL_GRAVITY_MULT : PHYSICS.GRAVITY;
  p.vy = Math.min(PHYSICS.MAX_FALL_SPEED, p.vy + grav * dt);

  // === HORIZONTAL INTEGRATION & SOLID COLLISION ===
  p.x += p.vx * dt;
  if (p.x < 4) {
    p.x = 4;
    p.vx = 0;
  } else if (p.x + p.w > WORLD_WIDTH - 4) {
    p.x = WORLD_WIDTH - 4 - p.w;
    p.vx = 0;
  }

  for (const plat of LEVEL_PLATFORMS) {
    if (plat.oneWay) continue;
    if (rectsOverlap(p, plat)) {
      if (p.vx > 0) {
        p.x = plat.x - p.w;
        p.vx = 0;
      } else if (p.vx < 0) {
        p.x = plat.x + plat.w;
        p.vx = 0;
      }
    }
  }

  // === VERTICAL INTEGRATION & PLATFORM RESOLUTION ===
  p.y += p.vy * dt;
  if (p.y < 8) {
    p.y = 8;
    if (p.vy < 0) p.vy = 0;
  }

  p.grounded = false;
  let landedImpactSpeed = 0;
  let standingOnSafeFloor = false;

  // Static platforms
  for (const plat of LEVEL_PLATFORMS) {
    if (!rectsOverlap(p, plat)) continue;

    if (plat.oneWay) {
      // One-way platform: land from above only when descending
      if (p.vy >= 0 && prevBottom <= plat.y + 16) {
        landedImpactSpeed = Math.max(landedImpactSpeed, p.vy);
        p.y = plat.y - p.h;
        p.vy = 0;
        p.grounded = true;
        if (plat.kind === 'floor' || plat.kind === 'plinth') {
          standingOnSafeFloor = true;
        }
      }
    } else {
      if (p.vy >= 0 && prevBottom <= plat.y + 20) {
        landedImpactSpeed = Math.max(landedImpactSpeed, p.vy);
        p.y = plat.y - p.h;
        p.vy = 0;
        p.grounded = true;
        if (plat.kind === 'floor' || plat.kind === 'plinth') {
          standingOnSafeFloor = true;
        }
      } else if (p.vy < 0 && p.y < plat.y + plat.h) {
        p.y = plat.y + plat.h;
        p.vy = 0;
      }
    }
  }

  // Moving Beetle Diamond Platforms (one-way top + optional spring bounce on upper diamond!)
  for (const bp of world.beetlePlatforms) {
    if (p.vy >= 0 && prevBottom <= bp.y + 20 && rectsOverlap(p, bp)) {
      p.y = bp.y - p.h;
      if (bp.bounceVy) {
        p.vy = bp.bounceVy;
        p.grounded = false;
        p.coyoteTimer = 0;
        p.jumpBufferTimer = 0;
        p.updraftCooldown = 0.28;
        p.scaleX = 0.8;
        p.scaleY = 1.24;
        world.events.push({ type: 'bounce', x: p.x + p.w * 0.5, y: p.y + p.h });
      } else {
        landedImpactSpeed = Math.max(landedImpactSpeed, p.vy);
        p.vy = 0;
        p.grounded = true;
      }
    }
  }

  // Landing squash & dust event
  if (!wasGrounded && p.grounded && landedImpactSpeed > 150) {
    p.scaleX = 1.22;
    p.scaleY = 0.78;
    world.events.push({
      type: 'land',
      x: p.x + p.w * 0.5,
      y: p.y + p.h,
      intensity: Math.min(1, landedImpactSpeed / 650),
    });
  }

  // Track distance walked for gait-synced leg animation
  if (p.grounded) {
    p.strideDistance += Math.abs(p.vx) * dt;
  }

  // Update safe respawn anchor when firmly on a safe floor away from spikes
  if (p.grounded && standingOnSafeFloor) {
    const safeCheckRect: Rect = { x: p.x - 18, y: p.y, w: p.w + 36, h: p.h + 4 };
    const nearHazard = LEVEL_HAZARDS.some((h) => rectsOverlap(safeCheckRect, h));
    if (!nearHazard) {
      p.lastSafeX = p.x;
      p.lastSafeY = p.y;
    }
  }

  // Update current floor indicator (1, 2, or 3)
  p.floor = computeFloor(p.y + p.h);

  // === SOARING BIRDS UPDRAFT (Floor 1 Right -> Floor 2 Right) ===
  if (p.updraftCooldown <= 0 && rectsOverlap(p, LEVEL_UPDRAFT)) {
    p.vy = LEVEL_UPDRAFT.boostVy;
    p.grounded = false;
    p.coyoteTimer = 0;
    p.jumpBufferTimer = 0;
    p.updraftCooldown = 0.9;
    p.scaleX = 0.82;
    p.scaleY = 1.22;
    world.events.push({
      type: 'updraft',
      x: p.x + p.w * 0.5,
      y: p.y + p.h * 0.5,
    });
  }

  // === COLLECTIBLES (Sacred Sun Seals) ===
  const playerCenterX = p.x + p.w * 0.5;
  const playerCenterY = p.y + p.h * 0.5;
  for (const col of world.collectibles) {
    if (col.collected) continue;
    const d = Math.hypot(playerCenterX - col.x, playerCenterY - col.y);
    if (d <= col.r + 24) {
      col.collected = true;
      world.events.push({ type: 'collect', x: col.x, y: col.y });
    }
  }

  // === GOAL CHECK: SACRED TREE LEAF AT TOP RIGHT ===
  if (rectsOverlap(p, GOAL_LEAF_RECT)) {
    world.goalReached = true;
    world.phase = 'victory';
    world.hitstopTimer = PHYSICS.HITSTOP_WIN;
    world.trauma = 0.25;
    world.events.push({
      type: 'victory',
      x: GOAL_LEAF_RECT.x + GOAL_LEAF_RECT.w * 0.5,
      y: GOAL_LEAF_RECT.y + GOAL_LEAF_RECT.h * 0.5,
    });
    return;
  }

  // === HAZARDS & GUARDIAN COLLISION ===
  const hurtBox: Rect = {
    x: p.x + 5,
    y: p.y + 6,
    w: p.w - 10,
    h: p.h - 10,
  };

  let hitHazard: { kind: string; cx: number } | null = null;
  if (p.y > WORLD_HEIGHT + 16) {
    hitHazard = { kind: 'pit', cx: p.x + p.w * 0.5 };
  } else {
    for (const haz of LEVEL_HAZARDS) {
      if (rectsOverlap(hurtBox, haz)) {
        hitHazard = { kind: haz.kind, cx: haz.x + haz.w * 0.5 };
        break;
      }
    }
    if (!hitHazard) {
      const g = world.guardian;
      const gBox: Rect = { x: g.x + 8, y: g.y + 12, w: g.w - 16, h: g.h - 14 };
      if (rectsOverlap(hurtBox, gBox)) {
        hitHazard = { kind: 'guardian', cx: g.x + g.w * 0.5 };
      }
    }
  }

  if (hitHazard && p.invulnTimer <= 0) {
    p.hearts = Math.max(0, p.hearts - 1);
    p.invulnTimer = PHYSICS.INVULN_TIME;
    p.hitFlashTimer = 0.08;
    world.hitstopTimer = PHYSICS.HITSTOP_HURT;
    world.trauma = 0.65;

    world.events.push({
      type: 'hurt',
      x: p.x + p.w * 0.5,
      y: p.y + p.h * 0.5,
      intensity: 1,
    });

    if (p.hearts <= 0) {
      p.vx = 0;
      p.vy = -320;
      world.defeatDelayTimer = 0.5;
      world.events.push({ type: 'defeat', x: p.x + p.w * 0.5, y: p.y + p.h * 0.5 });
    } else if (hitHazard.kind === 'pit') {
      // Return goat to last safe footing before pit
      p.x = p.lastSafeX;
      p.y = p.lastSafeY - 8;
      p.vx = 0;
      p.vy = -220;
      p.grounded = false;
    } else {
      // Directional knockback away from spike/guardian
      const pushDir = p.x + p.w * 0.5 >= hitHazard.cx ? 1 : -1;
      p.vx = pushDir * 240;
      p.vy = hitHazard.kind === 'ceiling-spikes' ? 180 : -340;
      p.grounded = false;
    }
  }
}

export function getHudSnapshot(world: WorldState): HudSnapshot {
  const sealsCollected = world.collectibles.reduce((acc, c) => acc + (c.collected ? 1 : 0), 0);
  return {
    phase: world.phase,
    hearts: world.player.hearts,
    maxHearts: world.player.maxHearts,
    floor: world.player.floor,
    elapsedSeconds: Math.floor(world.elapsedPlayTime),
    sealsCollected,
    totalSeals: world.collectibles.length,
    goalReached: world.goalReached,
  };
}

export function buildRunStats(world: WorldState, mode: ControlMode): RunStats {
  const sealsCollected = world.collectibles.reduce((acc, c) => acc + (c.collected ? 1 : 0), 0);
  return {
    outcome: world.goalReached ? 'victory' : 'defeat',
    clearTimeSeconds: Math.round(world.elapsedPlayTime),
    floorReached: world.player.floor,
    sealsCollected,
    totalSeals: world.collectibles.length,
    heartsRemaining: world.player.hearts,
    maxHearts: world.player.maxHearts,
    mode,
  };
}
