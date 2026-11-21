import test from 'node:test';
import assert from 'node:assert/strict';
import { GOAL_LEAF_RECT, LEVEL_UPDRAFT } from './levelData';
import { createWorldState, PHYSICS, stepWorld } from './physics';
import type { InputSnapshot } from './types';

const IDLE_INPUT: InputSnapshot = { moveX: 0, jumpHeld: false, jumpJustPressed: false };

function stepSeconds(
  world: ReturnType<typeof createWorldState>,
  seconds: number,
  inputFn: (elapsed: number, stepIdx: number) => InputSnapshot
): void {
  const dt = 1 / 60;
  const steps = Math.round(seconds / dt);
  for (let i = 0; i < steps; i++) {
    stepWorld(world, dt, inputFn(i * dt, i));
  }
}

test('goat spawns safely on Floor 1 Left and survives 3 seconds with no input', () => {
  const world = createWorldState('playing');
  stepSeconds(world, 3, () => IDLE_INPUT);

  assert.equal(world.phase, 'playing');
  assert.equal(world.player.hearts, 3);
  assert.equal(world.player.grounded, true);
  assert.equal(world.player.floor, 1);
  assert.equal(Math.round(world.player.y + world.player.h), 936);
});

test('coyote time allows jumping briefly after walking off a ledge', () => {
  const world = createWorldState('playing');
  // Place goat right at the edge of Floor 1 Left (x = 545) moving right
  world.player.x = 544;
  world.player.y = 890;
  world.player.vx = 240;
  world.player.grounded = true;

  // Walk right off ledge for 3 frames (~50ms, within 110ms coyote window)
  stepSeconds(world, 0.05, () => ({ moveX: 1, jumpHeld: false, jumpJustPressed: false }));
  assert.equal(world.player.grounded, false);
  assert.ok(world.player.coyoteTimer > 0);

  // Trigger jump during coyote time
  stepWorld(world, 1 / 60, { moveX: 1, jumpHeld: true, jumpJustPressed: true });
  assert.ok(world.player.vy <= PHYSICS.JUMP_VY + 40);
});

test('goat can cleanly jump over the Floor 1 X-totem spike without taking damage', () => {
  const world = createWorldState('playing');
  world.player.x = 210;
  world.player.y = 890;

  // Run right and jump just before the X-totem spike (x = 280..326)
  stepSeconds(world, 1.0, (t, idx) => ({
    moveX: 1,
    jumpHeld: t < 0.65,
    jumpJustPressed: idx === 1,
  }));

  assert.equal(world.player.hearts, 3);
  assert.ok(world.player.x > 335, `Expected goat past spike (>335), got ${world.player.x}`);
});

test('soaring birds updraft lifts goat from Floor 1 Right onto Floor 2 Right', () => {
  const world = createWorldState('playing');
  world.player.x = LEVEL_UPDRAFT.x + 10;
  world.player.y = 890;

  // Jump slightly into the updraft then let it lift and settle onto Floor 2 Right (y = 602)
  stepSeconds(world, 1.6, (_t, idx) => ({
    moveX: 0,
    jumpHeld: idx < 15,
    jumpJustPressed: idx === 1,
  }));

  assert.equal(world.player.floor, 2);
  assert.equal(world.player.grounded, true);
  assert.equal(Math.round(world.player.y + world.player.h), 602);
});

test('upper level jumps from Floor 2 Plinth -> Ledge -> Star Bridge -> Altar -> Tree Leaf are reachable', () => {
  const maxJumpHeight = (PHYSICS.JUMP_VY * PHYSICS.JUMP_VY) / (2 * PHYSICS.GRAVITY);
  // Plinth (540) -> Far-Right Ledge (424) = 116px
  assert.ok(maxJumpHeight > 116 + 25, `Max jump height ${maxJumpHeight} must clear 116px with margin`);
  // Far-Right Ledge (424) -> Star Bridge (342) = 82px
  assert.ok(maxJumpHeight > 82 + 40);
  // Floor 3 Right (332) -> Altar Box (256) = 76px
  assert.ok(maxJumpHeight > 76 + 40);
  // Altar Box (256) -> Tree Pedestal (140) = 116px
  assert.ok(maxJumpHeight > 116 + 25);

  // Verify touching the Sacred Tree Leaf triggers victory
  const world = createWorldState('playing');
  world.player.x = GOAL_LEAF_RECT.x + 12;
  world.player.y = GOAL_LEAF_RECT.y + 30;
  stepWorld(world, 1 / 60, IDLE_INPUT);

  assert.equal(world.goalReached, true);
  assert.equal(world.phase, 'victory');
});

test('hitting spikes reduces hearts and transitions cleanly to defeat after losing all 3 hearts', () => {
  const world = createWorldState('playing');
  for (let hit = 0; hit < 3; hit++) {
    world.player.invulnTimer = 0;
    world.hitstopTimer = 0;
    world.player.x = 285; // inside Floor 1 X-totem spike
    world.player.y = 886;
    stepWorld(world, 1 / 60, IDLE_INPUT);
  }
  assert.equal(world.player.hearts, 0);

  // Advance through defeat beat delay (~0.5s)
  stepSeconds(world, 0.7, () => IDLE_INPUT);
  assert.equal(world.phase, 'defeat');
});
