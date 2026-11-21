import type { HandActionLabel, HandGestureFrame, Point2D } from './types';

// MediaPipe Hand Landmark indices
const WRIST = 0;
const THUMB_TIP = 4;
const INDEX_MCP = 5;
const INDEX_PIP = 6;
const INDEX_TIP = 8;
const MIDDLE_MCP = 9;
const MIDDLE_PIP = 10;
const MIDDLE_TIP = 12;
const RING_MCP = 13;
const RING_PIP = 14;
const RING_TIP = 16;
const PINKY_MCP = 17;
const PINKY_PIP = 18;
const PINKY_TIP = 20;

export const PINCH_LEFT_MAX_X = 0.44;
export const PINCH_RIGHT_MIN_X = 0.56;
export const PINCH_RATIO_THRESHOLD = 0.44;
export const FIST_CURL_THRESHOLD = 0.68;

function dist2D(a: Point2D, b: Point2D): number {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  return Math.hypot(dx, dy);
}

export interface SingleHandClassification {
  isPinching: boolean;
  isFist: boolean;
  pinchStrength: number; // 0..1
  fistStrength: number; // 0..1
  mirroredX: number; // 0 = left of screen, 1 = right of screen
  mirroredY: number;
}

/**
 * Classifies a single MediaPipe 21-point hand into pinch vs fist metrics.
 * MediaPipe video coordinates have x=0 on the raw camera's left, so in a
 * mirrored selfie view, screen X = 1 - landmark.x.
 */
export function classifySingleHand(landmarks: Point2D[]): SingleHandClassification {
  if (!landmarks || landmarks.length < 21) {
    return {
      isPinching: false,
      isFist: false,
      pinchStrength: 0,
      fistStrength: 0,
      mirroredX: 0.5,
      mirroredY: 0.5,
    };
  }

  const wrist = landmarks[WRIST];
  const middleMcp = landmarks[MIDDLE_MCP];
  const palmScale = Math.max(dist2D(wrist, middleMcp), 0.04);

  // Palm center reference (average of wrist + 4 finger MCP knuckles)
  const palmCenter: Point2D = {
    x:
      (wrist.x +
        landmarks[INDEX_MCP].x +
        middleMcp.x +
        landmarks[RING_MCP].x +
        landmarks[PINKY_MCP].x) /
      5,
    y:
      (wrist.y +
        landmarks[INDEX_MCP].y +
        middleMcp.y +
        landmarks[RING_MCP].y +
        landmarks[PINKY_MCP].y) /
      5,
  };

  // 1. Pinch distance: thumb tip (4) to index tip (8), normalized by palm length
  const pinchDist = dist2D(landmarks[THUMB_TIP], landmarks[INDEX_TIP]);
  const pinchRatio = pinchDist / palmScale;
  const pinchStrength = Math.max(0, Math.min(1, 1 - (pinchRatio - 0.18) / 0.65));

  // 2. Finger curl ratio for all 4 main fingers (index, middle, ring, pinky)
  const fingerPairs: Array<[number, number, number]> = [
    [INDEX_MCP, INDEX_PIP, INDEX_TIP],
    [MIDDLE_MCP, MIDDLE_PIP, MIDDLE_TIP],
    [RING_MCP, RING_PIP, RING_TIP],
    [PINKY_MCP, PINKY_PIP, PINKY_TIP],
  ];

  let curledCount = 0;
  let curlSum = 0;
  let nonIndexCurledCount = 0;

  for (let i = 0; i < fingerPairs.length; i++) {
    const [, pipIdx, tipIdx] = fingerPairs[i];
    const tipToWrist = dist2D(landmarks[tipIdx], wrist);
    const pipToWrist = dist2D(landmarks[pipIdx], wrist);
    const tipToPalm = dist2D(landmarks[tipIdx], palmCenter) / palmScale;

    // A finger is curled when its tip is close to palm or closer to wrist than its PIP knuckle
    const isCurled = tipToWrist < pipToWrist * 1.06 || tipToPalm < 0.72;
    if (isCurled) {
      curledCount++;
      if (i > 0) nonIndexCurledCount++;
    }
    const fingerCurl = Math.max(0, Math.min(1, 1 - (tipToPalm - 0.42) / 0.95));
    curlSum += fingerCurl;
  }

  const avgCurl = curlSum / 4;
  // Require at least 3 of 4 fingers tightly curled (including at least 2 of middle/ring/pinky)
  // so an index+thumb pinch with open back fingers never falsely triggers Fist Jump!
  const isFist =
    curledCount >= 4 || (curledCount >= 3 && nonIndexCurledCount >= 2 && avgCurl >= FIST_CURL_THRESHOLD);

  // Pinch is active when thumb & index are close AND hand is not a closed fist
  const isPinching = !isFist && pinchRatio <= PINCH_RATIO_THRESHOLD;

  // Compute mirrored pinch midpoint (screen left = 0, screen right = 1)
  const rawAnchorX = isPinching
    ? (landmarks[THUMB_TIP].x + landmarks[INDEX_TIP].x) * 0.5
    : palmCenter.x;
  const rawAnchorY = isPinching
    ? (landmarks[THUMB_TIP].y + landmarks[INDEX_TIP].y) * 0.5
    : palmCenter.y;

  const mirroredX = Math.max(0, Math.min(1, 1 - rawAnchorX));
  const mirroredY = Math.max(0, Math.min(1, rawAnchorY));

  return {
    isPinching,
    isFist,
    pinchStrength,
    fistStrength: Math.max(0, Math.min(1, avgCurl)),
    mirroredX,
    mirroredY,
  };
}

/**
 * Combines 0, 1, or 2 detected hands into a clean game control frame:
 * - Pinch in the left zone (x < 0.44) => Move Left (-1)
 * - Pinch in the right zone (x > 0.56) => Move Right (+1)
 * - Any hand making a Fist => Jump
 * Supports both single-hand control and two-hand control (one hand pinches to steer, other fists to jump).
 */
export function classifyHandsToControl(allHands: Point2D[][]): HandGestureFrame {
  if (!allHands || allHands.length === 0) {
    return {
      handsDetected: 0,
      action: 'NONE',
      moveX: 0,
      isFist: false,
      isPinching: false,
      pinchStrength: 0,
      fistStrength: 0,
      pointerX: null,
      pointerY: null,
    };
  }

  const classified = allHands.map(classifySingleHand);

  let anyFist = false;
  let anyPinch = false;
  let maxPinchStrength = 0;
  let maxFistStrength = 0;
  let moveX: -1 | 0 | 1 = 0;
  let pointerX: number | null = null;
  let pointerY: number | null = null;

  for (const h of classified) {
    if (h.pinchStrength > maxPinchStrength) maxPinchStrength = h.pinchStrength;
    if (h.fistStrength > maxFistStrength) maxFistStrength = h.fistStrength;
    if (h.isFist) anyFist = true;
    if (h.isPinching) {
      anyPinch = true;
      pointerX = h.mirroredX;
      pointerY = h.mirroredY;
      if (h.mirroredX < PINCH_LEFT_MAX_X) {
        moveX = -1;
      } else if (h.mirroredX > PINCH_RIGHT_MIN_X) {
        moveX = 1;
      }
    }
  }

  if (pointerX === null && classified.length > 0) {
    pointerX = classified[0].mirroredX;
    pointerY = classified[0].mirroredY;
  }

  let action: HandActionLabel = 'OPEN';
  if (anyFist) {
    action = 'FIST_JUMP';
  } else if (anyPinch) {
    if (moveX < 0) action = 'PINCH_LEFT';
    else if (moveX > 0) action = 'PINCH_RIGHT';
    else action = 'PINCH_CENTER';
  }

  return {
    handsDetected: classified.length,
    action,
    moveX,
    isFist: anyFist,
    isPinching: anyPinch,
    pinchStrength: maxPinchStrength,
    fistStrength: maxFistStrength,
    pointerX,
    pointerY,
  };
}

export function createIdleGestureFrame(): HandGestureFrame {
  return {
    handsDetected: 0,
    action: 'NONE',
    moveX: 0,
    isFist: false,
    isPinching: false,
    pinchStrength: 0,
    fistStrength: 0,
    pointerX: null,
    pointerY: null,
  };
}
