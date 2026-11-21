import test from 'node:test';
import assert from 'node:assert/strict';
import { classifyHandsToControl, classifySingleHand } from './gestures';
import type { Point2D } from './types';

function makeOpenHand(centerX: number, centerY = 0.5): Point2D[] {
  // Build a realistic 21-point open hand centered around raw camera (centerX, centerY)
  const pts: Point2D[] = new Array(21).fill(null).map(() => ({ x: centerX, y: centerY }));
  pts[0] = { x: centerX, y: centerY + 0.18 }; // wrist
  pts[4] = { x: centerX - 0.12, y: centerY - 0.02 }; // thumb tip far from index
  pts[5] = { x: centerX - 0.05, y: centerY + 0.02 }; // index MCP
  pts[6] = { x: centerX - 0.05, y: centerY - 0.06 }; // index PIP
  pts[8] = { x: centerX - 0.05, y: centerY - 0.15 }; // index tip
  pts[9] = { x: centerX, y: centerY }; // middle MCP (palm scale = 0.18)
  pts[10] = { x: centerX, y: centerY - 0.09 }; // middle PIP
  pts[12] = { x: centerX, y: centerY - 0.19 }; // middle tip
  pts[13] = { x: centerX + 0.05, y: centerY + 0.01 }; // ring MCP
  pts[14] = { x: centerX + 0.05, y: centerY - 0.07 }; // ring PIP
  pts[16] = { x: centerX + 0.05, y: centerY - 0.16 }; // ring tip
  pts[17] = { x: centerX + 0.09, y: centerY + 0.04 }; // pinky MCP
  pts[18] = { x: centerX + 0.09, y: centerY - 0.03 }; // pinky PIP
  pts[20] = { x: centerX + 0.09, y: centerY - 0.11 }; // pinky tip
  return pts;
}

function makePinchHand(rawX: number, centerY = 0.5): Point2D[] {
  const pts = makeOpenHand(rawX, centerY);
  // Bring thumb tip (4) and index tip (8) right together while keeping other fingers open
  pts[4] = { x: rawX - 0.02, y: centerY - 0.08 };
  pts[8] = { x: rawX - 0.01, y: centerY - 0.085 };
  return pts;
}

function makeFistHand(rawX: number, centerY = 0.5): Point2D[] {
  const pts = makeOpenHand(rawX, centerY);
  // Curl all four finger tips down into the palm center
  pts[4] = { x: rawX - 0.02, y: centerY + 0.05 };
  pts[8] = { x: rawX - 0.04, y: centerY + 0.06 };
  pts[12] = { x: rawX, y: centerY + 0.06 };
  pts[16] = { x: rawX + 0.04, y: centerY + 0.06 };
  pts[20] = { x: rawX + 0.07, y: centerY + 0.07 };
  return pts;
}

test('empty hands list returns NONE and zero movement', () => {
  const res = classifyHandsToControl([]);
  assert.equal(res.handsDetected, 0);
  assert.equal(res.action, 'NONE');
  assert.equal(res.moveX, 0);
  assert.equal(res.isFist, false);
});

test('open hand classifies as OPEN without pinch or fist', () => {
  const res = classifyHandsToControl([makeOpenHand(0.5)]);
  assert.equal(res.action, 'OPEN');
  assert.equal(res.isPinching, false);
  assert.equal(res.isFist, false);
  assert.equal(res.moveX, 0);
});

test('pinching on mirrored left side steers LEFT (-1)', () => {
  // In raw camera coordinates, rawX = 0.80 mirrors to screenX = 0.20 (left side)
  const res = classifyHandsToControl([makePinchHand(0.8)]);
  assert.equal(res.isPinching, true);
  assert.equal(res.isFist, false);
  assert.equal(res.moveX, -1);
  assert.equal(res.action, 'PINCH_LEFT');
});

test('pinching on mirrored right side steers RIGHT (+1)', () => {
  // In raw camera coordinates, rawX = 0.20 mirrors to screenX = 0.80 (right side)
  const res = classifyHandsToControl([makePinchHand(0.2)]);
  assert.equal(res.isPinching, true);
  assert.equal(res.isFist, false);
  assert.equal(res.moveX, 1);
  assert.equal(res.action, 'PINCH_RIGHT');
});

test('closed fist classifies as FIST_JUMP and not pinch', () => {
  const single = classifySingleHand(makeFistHand(0.5));
  assert.equal(single.isFist, true);
  assert.equal(single.isPinching, false);

  const res = classifyHandsToControl([makeFistHand(0.5)]);
  assert.equal(res.isFist, true);
  assert.equal(res.action, 'FIST_JUMP');
});

test('two hands support simultaneous pinch steering and fist jumping', () => {
  const pinchRight = makePinchHand(0.18); // mirroredX = 0.82 -> right
  const fistOther = makeFistHand(0.75);
  const res = classifyHandsToControl([pinchRight, fistOther]);
  assert.equal(res.handsDetected, 2);
  assert.equal(res.moveX, 1);
  assert.equal(res.isFist, true);
  assert.equal(res.isPinching, true);
  assert.equal(res.action, 'FIST_JUMP');
});
