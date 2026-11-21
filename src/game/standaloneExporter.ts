import {
  ARTWORK_PATCH_RECTS,
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
import { PHYSICS } from './physics';

/**
 * Captures the loaded level artwork into an optimized JPEG Data URL so the
 * downloaded standalone HTML file renders the exact user-designed level offline.
 */
function captureArtworkDataUrl(img: HTMLImageElement | null): string {
  if (!img || !img.complete || img.naturalWidth === 0) return '';
  try {
    const canvas = document.createElement('canvas');
    canvas.width = WORLD_WIDTH;
    canvas.height = WORLD_HEIGHT;
    const ctx = canvas.getContext('2d');
    if (!ctx) return '';
    ctx.drawImage(img, 0, 0, WORLD_WIDTH, WORLD_HEIGHT);
    return canvas.toDataURL('image/jpeg', 0.86);
  } catch {
    return '';
  }
}

/**
 * Builds a complete, self-contained single-file HTML game containing:
 * - Both Prototype 1 (Keyboard) and Prototype 2 (Webcam + MediaPipe Hand Tracking)
 * - Embedded base64 level artwork matching AsoorikNewFace_65417697.jpg
 * - Complete 60fps platformer physics, animated Ibex Goat, Beetle Carrier,
 *   Soaring Birds updraft, Horned Guardian, Sun Seals, and Sacred Tree Leaf goal
 * - Procedural Web Audio sound effects and responsive hand-tracking visual HUD
 */
export function buildStandaloneHtml(img: HTMLImageElement | null): string {
  const artworkDataUrl = captureArtworkDataUrl(img);
  const embeddedConfig = JSON.stringify({
    worldW: WORLD_WIDTH,
    worldH: WORLD_HEIGHT,
    spawn: PLAYER_SPAWN,
    goal: GOAL_LEAF_RECT,
    patches: ARTWORK_PATCH_RECTS,
    platforms: LEVEL_PLATFORMS,
    hazards: LEVEL_HAZARDS,
    updraft: LEVEL_UPDRAFT,
    beetles: createInitialBeetlePlatforms(),
    guardian: createInitialGuardian(),
    collectibles: createInitialCollectibles(),
    physics: PHYSICS,
  });

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Asoorik: Ascent to the Sacred Leaf — Standalone Web Game</title>
  <style>
    :root {
      --clay: #DC9862;
      --obsidian: #0B0F19;
      --parchment: #F4DFC4;
      --leaf: #4C9A5E;
      --leaf-glow: #7EE08F;
      --hazard: #C93B2B;
    }
    * { box-sizing: border-box; }
    html, body {
      margin: 0; padding: 0; width: 100%; height: 100%; overflow: hidden;
      background: #16100C; color: var(--parchment);
      font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
    }
    .shell {
      display: flex; width: 100%; height: 100%; align-items: center; justify-content: center;
      gap: 16px; padding: 12px;
    }
    .stage-wrap {
      position: relative; flex: 1; height: 100%; display: flex; align-items: center; justify-content: center;
      min-width: 0;
    }
    canvas#gameCanvas {
      max-width: 100%; max-height: 100%; aspect-ratio: 13 / 10;
      border: 2px solid rgba(244, 223, 196, 0.25); border-radius: 8px;
      box-shadow: 0 20px 60px rgba(0, 0, 0, 0.55); background: var(--clay); display: block;
    }
    .hud-top {
      position: absolute; top: 16px; left: 16px; right: 16px;
      display: flex; justify-content: space-between; align-items: flex-start;
      pointer-events: none; z-index: 10;
    }
    .hud-cluster {
      background: rgba(11, 15, 25, 0.88); border: 1px solid rgba(220, 152, 98, 0.35);
      border-radius: 8px; padding: 8px 14px; display: flex; align-items: center; gap: 14px;
      font-variant-numeric: tabular-nums; font-size: 13px;
    }
    .hud-actions { display: flex; gap: 8px; pointer-events: auto; }
    .btn {
      cursor: pointer; border: 1px solid rgba(244, 223, 196, 0.3);
      background: rgba(11, 15, 25, 0.92); color: var(--parchment);
      padding: 8px 14px; border-radius: 6px; font-weight: 600; font-size: 13px;
      transition: transform 0.12s ease, background 0.15s ease;
    }
    .btn:hover { background: #1e2433; }
    .btn:active { transform: scale(0.98); }
    .btn-primary {
      background: var(--clay); color: var(--obsidian); border-color: var(--clay);
    }
    .btn-primary:hover { background: #e8aa76; }
    .btn-leaf {
      background: var(--leaf); color: #06120A; border-color: var(--leaf-glow);
    }
    .btn-leaf:hover { background: #5eb271; }
    .overlay {
      position: fixed; inset: 0; background: rgba(11, 15, 25, 0.78);
      display: flex; align-items: center; justify-content: center; z-index: 30; padding: 20px;
    }
    .hidden { display: none !important; }
    .card {
      width: 100%; max-width: 520px; background: #141214;
      border: 1.5px solid rgba(220, 152, 98, 0.45); border-radius: 12px;
      padding: 28px; box-shadow: 0 24px 70px rgba(0, 0, 0, 0.65);
    }
    .title {
      font-family: Georgia, serif; font-size: 34px; letter-spacing: 0.14em;
      margin: 0 0 6px; color: var(--clay);
    }
    .subtitle { margin: 0 0 22px; color: rgba(244, 223, 196, 0.8); font-size: 14px; line-height: 1.5; }
    .mode-grid { display: grid; gap: 12px; margin-bottom: 18px; }
    .mode-btn {
      text-align: left; padding: 14px 16px; border-radius: 8px; cursor: pointer;
      display: flex; flex-direction: column; gap: 4px;
    }
    .mode-btn strong { font-size: 15px; }
    .mode-btn span { font-size: 12px; opacity: 0.85; }
    .hint { font-size: 12px; color: rgba(244, 223, 196, 0.65); text-align: center; }
    .hand-panel {
      width: 300px; flex-shrink: 0; background: #121114;
      border: 1px solid rgba(220, 152, 98, 0.35); border-radius: 10px;
      padding: 12px; display: flex; flex-direction: column; gap: 10px;
    }
    .cam-box {
      position: relative; width: 100%; aspect-ratio: 4 / 3; background: #090b10;
      border-radius: 8px; overflow: hidden; border: 1px solid rgba(244, 223, 196, 0.18);
    }
    .cam-box video {
      width: 100%; height: 100%; object-fit: cover; transform: scaleX(-1); display: block;
    }
    .cam-box canvas {
      position: absolute; inset: 0; width: 100%; height: 100%; pointer-events: none;
    }
    .meter-row { display: flex; flex-direction: column; gap: 4px; font-size: 12px; }
    .meter-track {
      height: 7px; border-radius: 99px; background: rgba(244, 223, 196, 0.12); overflow: hidden;
    }
    .meter-fill { height: 100%; width: 0%; transition: width 0.08s linear; }
    .stat-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; margin: 16px 0 22px; }
    .stat-box {
      background: rgba(244, 223, 196, 0.06); border: 1px solid rgba(220, 152, 98, 0.25);
      border-radius: 8px; padding: 10px; text-align: center;
    }
    .stat-box .val { font-size: 20px; font-weight: 700; font-variant-numeric: tabular-nums; }
    .stat-box .lbl { font-size: 11px; opacity: 0.7; margin-top: 2px; }
    @media (max-width: 960px) {
      .shell { flex-direction: column; overflow-y: auto; }
      .stage-wrap { width: 100%; height: auto; flex: none; }
      .hand-panel { width: 100%; max-width: 480px; }
    }
  </style>
</head>
<body>
  <div class="shell">
    <div class="stage-wrap">
      <div id="hudTop" class="hud-top hidden">
        <div class="hud-cluster">
          <span id="hudHearts">♥ ♥ ♥</span>
          <span>·</span>
          <span id="hudFloor">Floor 1/3</span>
          <span>·</span>
          <span id="hudTime">00:00</span>
          <span>·</span>
          <span id="hudSeals">Seals 0/3</span>
          <span>·</span>
          <span id="hudMode">Keyboard</span>
        </div>
        <div class="hud-actions">
          <button id="btnMute" class="btn" type="button">Sound On</button>
          <button id="btnRestart" class="btn" type="button">Restart</button>
          <button id="btnPause" class="btn" type="button">Pause</button>
        </div>
      </div>
      <canvas id="gameCanvas" width="1300" height="1000"></canvas>
    </div>

    <aside id="handPanel" class="hand-panel hidden" aria-label="Hand Tracking Feedback">
      <div style="display:flex;justify-content:space-between;align-items:center;">
        <strong style="font-size:13px;letter-spacing:0.06em;color:var(--clay);">HAND TRACKING</strong>
        <span id="camStateText" style="font-size:11px;opacity:0.8;">Idle</span>
      </div>
      <div class="cam-box">
        <video id="camVideo" playsinline muted></video>
        <canvas id="camOverlay" width="320" height="240"></canvas>
      </div>
      <div style="display:flex;justify-content:space-between;align-items:center;font-size:13px;">
        <span>Gesture</span>
        <strong id="gestureLabel" style="color:var(--leaf-glow);">SHOW HAND</strong>
      </div>
      <div class="meter-row">
        <div style="display:flex;justify-content:space-between;"><span>Pinch (Move L/R)</span><span id="pinchPct">0%</span></div>
        <div class="meter-track"><div id="pinchBar" class="meter-fill" style="background:var(--clay);"></div></div>
      </div>
      <div class="meter-row">
        <div style="display:flex;justify-content:space-between;"><span>Fist (Jump)</span><span id="fistPct">0%</span></div>
        <div class="meter-track"><div id="fistBar" class="meter-fill" style="background:var(--leaf-glow);"></div></div>
      </div>
      <div style="font-size:11px;opacity:0.75;line-height:1.45;">
        Pinch in the left half to move Left, right half to move Right. Clench a Fist to Jump.
      </div>
      <div style="display:flex;gap:8px;">
        <button id="btnRetryCam" class="btn" style="flex:1;" type="button">Enable Camera</button>
        <button id="btnToKeyboard" class="btn" style="flex:1;" type="button">Use Keyboard</button>
      </div>
    </aside>
  </div>

  <!-- Title Overlay -->
  <div id="titleOverlay" class="overlay">
    <div class="card">
      <h1 class="title">ASOORIK</h1>
      <p class="subtitle">Guide the mountain goat across three ancient pottery floors, leap over spikes and the scalloped pit, ride the soaring birds, and reach the sacred tree leaf at the top right.</p>
      <div class="mode-grid">
        <button id="startKeyboard" class="btn btn-primary mode-btn" type="button">
          <strong>1. Prototype 1 — Keyboard Controls</strong>
          <span>A / D or Arrow Keys to move · Space / W / Up to jump</span>
        </button>
        <button id="startHand" class="btn btn-leaf mode-btn" type="button">
          <strong>2. Prototype 2 — Webcam &amp; MediaPipe Hand Tracking</strong>
          <span>Pinch Left/Right to steer · Clench Fist to jump</span>
        </button>
      </div>
      <div class="hint">Standalone Web Game · Press Enter for Keyboard Mode · Esc / P to Pause</div>
    </div>
  </div>

  <!-- Status Modal (Pause / Victory / Defeat) -->
  <div id="statusOverlay" class="overlay hidden">
    <div class="card">
      <h2 id="statusTitle" class="title" style="font-size:26px;">Paused</h2>
      <p id="statusDesc" class="subtitle" style="margin-bottom:12px;"></p>
      <div class="stat-grid">
        <div class="stat-box"><div id="stTime" class="val">00:00</div><div class="lbl">Time</div></div>
        <div class="stat-box"><div id="stFloor" class="val">1/3</div><div class="lbl">Floor</div></div>
        <div class="stat-box"><div id="stSeals" class="val">0/3</div><div class="lbl">Sun Seals</div></div>
      </div>
      <div style="display:flex;gap:10px;flex-wrap:wrap;">
        <button id="btnModalPrimary" class="btn btn-primary" style="flex:1;" type="button">Play Again</button>
        <button id="btnModalTitle" class="btn" type="button">Title Screen</button>
      </div>
    </div>
  </div>

  <script type="module">
    const CONFIG = ${embeddedConfig};
    const ARTWORK_DATA_URL = ${JSON.stringify(artworkDataUrl)};

    const canvas = document.getElementById('gameCanvas');
    const ctx = canvas.getContext('2d');
    const hudTop = document.getElementById('hudTop');
    const titleOverlay = document.getElementById('titleOverlay');
    const statusOverlay = document.getElementById('statusOverlay');
    const handPanel = document.getElementById('handPanel');

    let phase = 'title';
    let mode = 'keyboard';
    let muted = false;
    let audioCtx = null;

    function beep(f1, f2, dur, type = 'triangle', vol = 0.11) {
      if (muted) return;
      try {
        if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        if (audioCtx.state === 'suspended') audioCtx.resume();
        const now = audioCtx.currentTime;
        const o = audioCtx.createOscillator();
        const g = audioCtx.createGain();
        o.type = type;
        o.frequency.setValueAtTime(f1, now);
        o.frequency.exponentialRampToValueAtTime(Math.max(40, f2), now + dur);
        g.gain.setValueAtTime(0.0001, now);
        g.gain.linearRampToValueAtTime(vol, now + 0.01);
        g.gain.exponentialRampToValueAtTime(0.0001, now + dur);
        o.connect(g); g.connect(audioCtx.destination);
        o.start(now); o.stop(now + dur + 0.02);
      } catch {}
    }

    // Build offscreen patched background
    let bgCanvas = null;
    if (ARTWORK_DATA_URL) {
      const img = new Image();
      img.onload = () => {
        const off = document.createElement('canvas');
        off.width = CONFIG.worldW; off.height = CONFIG.worldH;
        const octx = off.getContext('2d', { willReadFrequently: true });
        octx.drawImage(img, 0, 0, CONFIG.worldW, CONFIG.worldH);
        for (const p of CONFIG.patches) {
          let fill = '#DA9561';
          try {
            const d = octx.getImageData(Math.round(p.sampleX), Math.round(p.sampleY), 1, 1).data;
            fill = 'rgb(' + d[0] + ',' + d[1] + ',' + d[2] + ')';
          } catch {}
          octx.fillStyle = fill;
          octx.fillRect(p.x, p.y, p.w, p.h);
        }
        bgCanvas = off;
      };
      img.src = ARTWORK_DATA_URL;
    }

    const keys = new Set();
    let jumpPressedEdge = false;
    let handState = { moveX: 0, isFist: false, prevFist: false };

    window.addEventListener('keydown', (e) => {
      if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Space'].includes(e.code)) e.preventDefault();
      if (phase === 'title' && (e.code === 'Enter' || e.code === 'Space')) {
        startGame('keyboard');
        return;
      }
      if ((e.code === 'Escape' || e.code === 'KeyP') && (phase === 'playing' || phase === 'paused')) {
        togglePause();
        return;
      }
      if (e.code === 'KeyR' && phase === 'playing') {
        resetWorld();
        return;
      }
      if (e.code === 'KeyM') {
        muted = !muted;
        document.getElementById('btnMute').textContent = muted ? 'Muted' : 'Sound On';
        return;
      }
      if ((e.code === 'Space' || e.code === 'ArrowUp' || e.code === 'KeyW') && !keys.has(e.code)) {
        jumpPressedEdge = true;
      }
      keys.add(e.code);
    });
    window.addEventListener('keyup', (e) => keys.delete(e.code));
    window.addEventListener('blur', () => keys.clear());

    let world = null;
    function resetWorld() {
      world = {
        time: 0, elapsed: 0, trauma: 0, hitstop: 0, defeatDelay: 0, goalReached: false,
        player: {
          x: CONFIG.spawn.x, y: CONFIG.spawn.y, w: CONFIG.physics.PLAYER_W, h: CONFIG.physics.PLAYER_H,
          vx: 0, vy: 0, facing: 1, grounded: true, coyote: CONFIG.physics.COYOTE_TIME, jumpBuf: 0,
          invuln: 0, flash: 0, hearts: 3, maxHearts: 3, sx: 1, sy: 1, stride: 0, floor: 1,
          safeX: CONFIG.spawn.x, safeY: CONFIG.spawn.y, updraftCd: 0
        },
        beetles: JSON.parse(JSON.stringify(CONFIG.beetles)),
        guardian: JSON.parse(JSON.stringify(CONFIG.guardian)),
        collectibles: JSON.parse(JSON.stringify(CONFIG.collectibles))
      };
    }
    resetWorld();

    function overlap(a, b) {
      return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
    }

    function formatTime(sec) {
      const m = Math.floor(sec / 60);
      const s = Math.floor(sec % 60);
      return String(m).padStart(2, '0') + ':' + String(s).padStart(2, '0');
    }

    function showStatusModal(title, desc, primaryText, onPrimary) {
      document.getElementById('statusTitle').textContent = title;
      document.getElementById('statusDesc').textContent = desc;
      document.getElementById('stTime').textContent = formatTime(world.elapsed);
      document.getElementById('stFloor').textContent = world.player.floor + '/3';
      const seals = world.collectibles.filter(c => c.collected).length;
      document.getElementById('stSeals').textContent = seals + '/' + world.collectibles.length;
      const btn = document.getElementById('btnModalPrimary');
      btn.textContent = primaryText;
      btn.onclick = onPrimary;
      statusOverlay.classList.remove('hidden');
    }

    function startGame(chosenMode) {
      mode = chosenMode;
      resetWorld();
      phase = 'playing';
      titleOverlay.classList.add('hidden');
      statusOverlay.classList.add('hidden');
      hudTop.classList.remove('hidden');
      document.getElementById('hudMode').textContent = mode === 'hand' ? 'Hand Tracking' : 'Keyboard';
      if (mode === 'hand') {
        handPanel.classList.remove('hidden');
        startMediaPipeCamera();
      } else {
        handPanel.classList.add('hidden');
        stopMediaPipeCamera();
      }
    }

    function togglePause() {
      if (phase === 'playing') {
        phase = 'paused';
        showStatusModal('Paused', 'Take a breath on the pottery terrace.', 'Resume', () => {
          phase = 'playing';
          statusOverlay.classList.add('hidden');
        });
      } else if (phase === 'paused') {
        phase = 'playing';
        statusOverlay.classList.add('hidden');
      }
    }

    document.getElementById('startKeyboard').onclick = () => startGame('keyboard');
    document.getElementById('startHand').onclick = () => startGame('hand');
    document.getElementById('btnPause').onclick = togglePause;
    document.getElementById('btnRestart').onclick = () => { resetWorld(); phase = 'playing'; statusOverlay.classList.add('hidden'); };
    document.getElementById('btnMute').onclick = () => {
      muted = !muted;
      document.getElementById('btnMute').textContent = muted ? 'Muted' : 'Sound On';
    };
    document.getElementById('btnModalTitle').onclick = () => {
      phase = 'title';
      stopMediaPipeCamera();
      handPanel.classList.add('hidden');
      hudTop.classList.add('hidden');
      statusOverlay.classList.add('hidden');
      titleOverlay.classList.remove('hidden');
      resetWorld();
    };
    document.getElementById('btnToKeyboard').onclick = () => startGame('keyboard');
    document.getElementById('btnRetryCam').onclick = () => startMediaPipeCamera();

    // === MediaPipe Hand Tracking ===
    let camStream = null;
    let handLandmarker = null;
    let camRaf = 0;
    let lastVidTime = -1;

    function stopMediaPipeCamera() {
      if (camRaf) cancelAnimationFrame(camRaf);
      camRaf = 0;
      if (camStream) { camStream.getTracks().forEach(t => t.stop()); camStream = null; }
      const v = document.getElementById('camVideo');
      if (v) v.srcObject = null;
      handState = { moveX: 0, isFist: false, prevFist: false };
    }

    async function startMediaPipeCamera() {
      stopMediaPipeCamera();
      const statusEl = document.getElementById('camStateText');
      const video = document.getElementById('camVideo');
      const oCanvas = document.getElementById('camOverlay');
      const oCtx = oCanvas.getContext('2d');
      statusEl.textContent = 'Requesting camera…';
      try {
        camStream = await navigator.mediaDevices.getUserMedia({ video: { width: 640, height: 480, facingMode: 'user' }, audio: false });
        video.srcObject = camStream;
        await video.play();
      } catch {
        statusEl.textContent = 'Camera blocked/missing';
        return;
      }
      statusEl.textContent = 'Loading MediaPipe…';
      try {
        const visionMod = await import('https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/vision_bundle.mjs');
        const vision = await visionMod.FilesetResolver.forVisionTasks('https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/wasm');
        handLandmarker = await visionMod.HandLandmarker.createFromOptions(vision, {
          baseOptions: {
            modelAssetPath: 'https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task'
          },
          runningMode: 'VIDEO', numHands: 2
        });
        statusEl.textContent = 'Tracking Active';
      } catch {
        statusEl.textContent = 'Model CDN unavailable';
        return;
      }

      const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
      const tickCam = () => {
        if (!camStream || !handLandmarker) return;
        if (video.readyState >= 2 && video.currentTime !== lastVidTime) {
          lastVidTime = video.currentTime;
          const res = handLandmarker.detectForVideo(video, performance.now());
          const hands = res.landmarks || [];
          let moveX = 0, isFist = false, maxPinch = 0, maxFist = 0, label = hands.length ? 'OPEN HAND' : 'SHOW HAND';
          oCtx.clearRect(0, 0, oCanvas.width, oCanvas.height);
          oCtx.strokeStyle = 'rgba(244,223,196,0.28)';
          oCtx.setLineDash([4,4]);
          oCtx.beginPath();
          oCtx.moveTo(oCanvas.width * 0.44, 0); oCtx.lineTo(oCanvas.width * 0.44, oCanvas.height);
          oCtx.moveTo(oCanvas.width * 0.56, 0); oCtx.lineTo(oCanvas.width * 0.56, oCanvas.height);
          oCtx.stroke(); oCtx.setLineDash([]);

          for (const lm of hands) {
            const scale = Math.max(dist(lm[0], lm[9]), 0.04);
            const pinchRatio = dist(lm[4], lm[8]) / scale;
            maxPinch = Math.max(maxPinch, Math.max(0, Math.min(1, 1 - (pinchRatio - 0.18) / 0.65)));
            const palm = {
              x: (lm[0].x + lm[5].x + lm[9].x + lm[13].x + lm[17].x) / 5,
              y: (lm[0].y + lm[5].y + lm[9].y + lm[13].y + lm[17].y) / 5
            };
            const pairs = [[6,8],[10,12],[14,16],[18,20]];
            let curled = 0, nonIdx = 0, cSum = 0;
            pairs.forEach(([pip, tip], i) => {
              const tp = dist(lm[tip], palm) / scale;
              if (dist(lm[tip], lm[0]) < dist(lm[pip], lm[0]) * 1.06 || tp < 0.72) {
                curled++; if (i > 0) nonIdx++;
              }
              cSum += Math.max(0, Math.min(1, 1 - (tp - 0.42) / 0.95));
            });
            const avgC = cSum / 4;
            maxFist = Math.max(maxFist, avgC);
            const fist = curled >= 4 || (curled >= 3 && nonIdx >= 2 && avgC >= 0.68);
            const pinch = !fist && pinchRatio <= 0.44;
            if (fist) { isFist = true; label = 'FIST · JUMP!'; }
            if (pinch) {
              const mx = 1 - (lm[4].x + lm[8].x) * 0.5;
              if (mx < 0.44) { moveX = -1; if (!isFist) label = 'PINCH LEFT'; }
              else if (mx > 0.56) { moveX = 1; if (!isFist) label = 'PINCH RIGHT'; }
              else if (!isFist) label = 'PINCH CENTER';
            }
            for (const pt of lm) {
              oCtx.fillStyle = fist ? '#7EE08F' : '#DC9862';
              oCtx.beginPath();
              oCtx.arc((1 - pt.x) * oCanvas.width, pt.y * oCanvas.height, 3, 0, Math.PI * 2);
              oCtx.fill();
            }
          }
          if (isFist && !handState.prevFist) jumpPressedEdge = true;
          handState.prevFist = isFist;
          handState.moveX = moveX;
          handState.isFist = isFist;
          document.getElementById('gestureLabel').textContent = label;
          document.getElementById('pinchPct').textContent = Math.round(maxPinch * 100) + '%';
          document.getElementById('pinchBar').style.width = Math.round(maxPinch * 100) + '%';
          document.getElementById('fistPct').textContent = Math.round(maxFist * 100) + '%';
          document.getElementById('fistBar').style.width = Math.round(maxFist * 100) + '%';
        }
        camRaf = requestAnimationFrame(tickCam);
      };
      camRaf = requestAnimationFrame(tickCam);
    }

    // === Main 60fps Game Loop ===
    let lastTs = performance.now();
    function step(ts) {
      const dt = Math.min((ts - lastTs) / 1000, 0.05);
      lastTs = ts;
      const P = CONFIG.physics;
      world.trauma = Math.max(0, world.trauma - dt * 1.9);
      if (world.player.flash > 0) world.player.flash = Math.max(0, world.player.flash - dt);

      if (phase === 'title') {
        world.time += dt;
        world.beetles.forEach(b => b.y = b.baseY + Math.sin(world.time * b.speed) * b.ampY);
      } else if (phase === 'playing') {
        if (world.defeatDelay > 0) {
          world.defeatDelay -= dt;
          if (world.defeatDelay <= 0) {
            phase = 'defeat';
            showStatusModal('Fallen on the Terrace', 'The ancient spikes stopped the ascent. Try again!', 'Try Again', () => startGame(mode));
          }
        } else if (world.hitstop > 0) {
          world.hitstop -= dt;
        } else {
          world.time += dt;
          world.elapsed += dt;
          world.beetles.forEach(b => b.y = b.baseY + Math.sin(world.time * b.speed) * b.ampY);
          const g = world.guardian;
          g.x += g.vx * dt;
          if (g.x <= g.minX) { g.x = g.minX; g.vx = Math.abs(g.vx); g.facing = 1; }
          if (g.x >= g.maxX) { g.x = g.maxX; g.vx = -Math.abs(g.vx); g.facing = -1; }

          const p = world.player;
          if (p.invuln > 0) p.invuln -= dt;
          if (p.updraftCd > 0) p.updraftCd -= dt;
          const damp = 1 - Math.exp(-14 * dt);
          p.sx += (1 - p.sx) * damp; p.sy += (1 - p.sy) * damp;

          let moveX = 0;
          if (keys.has('ArrowLeft') || keys.has('KeyA')) moveX -= 1;
          if (keys.has('ArrowRight') || keys.has('KeyD')) moveX += 1;
          if (mode === 'hand' && handState.moveX !== 0) moveX = handState.moveX;
          const jumpHeld = keys.has('Space') || keys.has('ArrowUp') || keys.has('KeyW') || (mode === 'hand' && handState.isFist);
          const jumpJust = jumpPressedEdge;
          jumpPressedEdge = false;

          const tvx = moveX * P.MOVE_SPEED;
          if (moveX !== 0) {
            p.facing = moveX > 0 ? 1 : -1;
            const acc = p.grounded ? P.GROUND_ACCEL : P.AIR_ACCEL;
            p.vx = p.vx < tvx ? Math.min(tvx, p.vx + acc * dt) : Math.max(tvx, p.vx - acc * dt);
          } else {
            const dec = p.grounded ? P.GROUND_DECEL : P.AIR_DECEL;
            p.vx = Math.abs(p.vx) <= dec * dt ? 0 : p.vx - Math.sign(p.vx) * dec * dt;
          }

          p.coyote = p.grounded ? P.COYOTE_TIME : Math.max(0, p.coyote - dt);
          p.jumpBuf = jumpJust ? P.JUMP_BUFFER_TIME : Math.max(0, p.jumpBuf - dt);
          if (p.jumpBuf > 0 && p.coyote > 0) {
            p.vy = P.JUMP_VY; p.grounded = false; p.coyote = 0; p.jumpBuf = 0;
            p.sx = 0.84; p.sy = 1.2; beep(240, 490, 0.13);
          }
          if (!jumpHeld && p.vy < -220 && p.updraftCd <= 0) p.vy *= Math.pow(P.JUMP_CUT_MULT, dt * 18);
          p.vy = Math.min(P.MAX_FALL_SPEED, p.vy + (p.vy > 0 ? P.GRAVITY * P.FALL_GRAVITY_MULT : P.GRAVITY) * dt);

          const prevBot = p.y + p.h;
          p.x = Math.max(4, Math.min(CONFIG.worldW - 4 - p.w, p.x + p.vx * dt));
          for (const pl of CONFIG.platforms) {
            if (pl.oneWay) continue;
            if (overlap(p, pl)) { p.x = p.vx > 0 ? pl.x - p.w : pl.x + pl.w; p.vx = 0; }
          }
          p.y = Math.max(8, p.y + p.vy * dt);
          p.grounded = false;
          for (const pl of CONFIG.platforms) {
            if (!overlap(p, pl)) continue;
            if (pl.oneWay) {
              if (p.vy >= 0 && prevBot <= pl.y + 16) { p.y = pl.y - p.h; p.vy = 0; p.grounded = true; }
            } else if (p.vy >= 0 && prevBot <= pl.y + 20) {
              p.y = pl.y - p.h; p.vy = 0; p.grounded = true;
            } else if (p.vy < 0) {
              p.y = pl.y + pl.h; p.vy = 0;
            }
          }
          for (const bp of world.beetles) {
            if (p.vy >= 0 && prevBot <= bp.y + 20 && overlap(p, bp)) {
              p.y = bp.y - p.h;
              if (bp.bounceVy) { p.vy = bp.bounceVy; p.updraftCd = 0.28; p.sx = 0.8; p.sy = 1.24; beep(320, 740, 0.17); }
              else { p.vy = 0; p.grounded = true; }
            }
          }
          if (p.grounded) {
            p.stride += Math.abs(p.vx) * dt;
            if (!CONFIG.hazards.some(h => overlap({ x: p.x - 16, y: p.y, w: p.w + 32, h: p.h + 4 }, h))) {
              p.safeX = p.x; p.safeY = p.y;
            }
          }
          p.floor = (p.y + p.h) <= 445 ? 3 : (p.y + p.h) <= 740 ? 2 : 1;

          if (p.updraftCd <= 0 && overlap(p, CONFIG.updraft)) {
            p.vy = CONFIG.updraft.boostVy; p.grounded = false; p.updraftCd = 0.55; beep(290, 680, 0.22, 'sine');
          }
          for (const c of world.collectibles) {
            if (!c.collected && Math.hypot(p.x + p.w * 0.5 - c.x, p.y + p.h * 0.5 - c.y) < c.r + 24) {
              c.collected = true; beep(580, 980, 0.18);
            }
          }
          if (overlap(p, CONFIG.goal)) {
            world.goalReached = true; phase = 'victory'; beep(440, 880, 0.3);
            showStatusModal('Sacred Leaf Reached!', 'The mountain goat ascended all three ancient floors to the tree crown.', 'Play Again', () => startGame(mode));
          }

          const hb = { x: p.x + 5, y: p.y + 6, w: p.w - 10, h: p.h - 10 };
          let hit = CONFIG.hazards.find(h => overlap(hb, h)) || (overlap(hb, g) ? { kind: 'guardian', x: g.x, w: g.w } : null);
          if (hit && p.invuln <= 0) {
            p.hearts = Math.max(0, p.hearts - 1); p.invuln = P.INVULN_TIME; p.flash = 0.08;
            world.hitstop = P.HITSTOP_HURT; world.trauma = 0.6; beep(180, 70, 0.22, 'sawtooth', 0.14);
            if (p.hearts <= 0) { world.defeatDelay = 0.45; p.vy = -300; }
            else if (hit.kind === 'pit') { p.x = p.safeX; p.y = p.safeY - 8; p.vx = 0; p.vy = -220; }
            else { p.vx = (p.x >= hit.x ? 1 : -1) * 240; p.vy = -320; }
          }
        }
      }

      // Update HUD text
      document.getElementById('hudHearts').textContent = '♥'.repeat(world.player.hearts) + '♡'.repeat(world.player.maxHearts - world.player.hearts);
      document.getElementById('hudFloor').textContent = 'Floor ' + world.player.floor + '/3';
      document.getElementById('hudTime').textContent = formatTime(world.elapsed);
      document.getElementById('hudSeals').textContent = 'Seals ' + world.collectibles.filter(c => c.collected).length + '/' + world.collectibles.length;

      // Render
      ctx.save();
      ctx.clearRect(0, 0, CONFIG.worldW, CONFIG.worldH);
      const shk = world.trauma * world.trauma * 12;
      if (shk > 0.1) ctx.translate((Math.random() * 2 - 1) * shk, (Math.random() * 2 - 1) * shk);

      if (bgCanvas) {
        ctx.drawImage(bgCanvas, 0, 0, CONFIG.worldW, CONFIG.worldH);
      } else {
        ctx.fillStyle = '#DC9862'; ctx.fillRect(0, 0, CONFIG.worldW, CONFIG.worldH);
        ctx.fillStyle = '#0B0F19';
        CONFIG.platforms.forEach(pl => ctx.fillRect(pl.x, pl.y, pl.w, pl.h));
        ctx.fillStyle = '#C93B2B';
        CONFIG.hazards.forEach(hz => ctx.fillRect(hz.x, hz.y, hz.w, hz.h));
      }

      // Beetle diamonds
      world.beetles.forEach((b, i) => {
        ctx.fillStyle = '#090D16'; ctx.fillRect(b.x, b.y, b.w, b.h);
        ctx.strokeStyle = '#DC9862'; ctx.lineWidth = 2.5;
        ctx.beginPath(); ctx.moveTo(b.x, b.y); ctx.lineTo(b.x + b.w, b.y + b.h); ctx.moveTo(b.x + b.w, b.y); ctx.lineTo(b.x, b.y + b.h); ctx.stroke();
        if (i === 1) { ctx.fillStyle = '#7EE08F'; ctx.fillRect(b.x + 6, b.y - 2, b.w - 12, 3); }
      });

      // Collectibles
      world.collectibles.forEach(c => {
        if (c.collected) return;
        ctx.fillStyle = '#0B0F19'; ctx.beginPath(); ctx.arc(c.x, c.y + Math.sin(world.time * 3) * 4, 13, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = '#FCE7B2'; ctx.lineWidth = 2; ctx.stroke();
      });

      // Sacred Leaf
      const gx = CONFIG.goal.x + 54, gy = CONFIG.goal.y + 96;
      ctx.save(); ctx.translate(gx, gy); ctx.rotate(Math.sin(world.time * 2.4) * 0.05);
      const grad = ctx.createRadialGradient(0, -48, 8, 0, -48, 66);
      grad.addColorStop(0, 'rgba(92,186,114,0.6)'); grad.addColorStop(1, 'rgba(92,186,114,0)');
      ctx.fillStyle = grad; ctx.beginPath(); ctx.arc(0, -48, 66, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = '#090D16'; ctx.lineWidth = 6; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(4, -84); ctx.moveTo(0, -24); ctx.lineTo(-32, -52); ctx.moveTo(0, -34); ctx.lineTo(30, -56); ctx.stroke();
      ctx.restore();

      // Guardian
      const grd = world.guardian;
      ctx.fillStyle = '#090D16'; ctx.fillRect(grd.x + 8, grd.y + 20, grd.w - 16, grd.h - 20);
      ctx.beginPath(); ctx.arc(grd.x + grd.w * 0.5, grd.y + 14, 11, 0, Math.PI * 2); ctx.fill();

      // Goat
      const p = world.player;
      ctx.save();
      ctx.translate(p.x + p.w * 0.5, p.y + p.h);
      ctx.scale(p.facing * p.sx, p.sy);
      ctx.fillStyle = p.flash > 0 ? '#FFF6E8' : '#090D16';
      ctx.strokeStyle = ctx.fillStyle; ctx.lineWidth = 4; ctx.lineCap = 'round';
      ctx.fillRect(-16, -28, 30, 14);
      ctx.fillRect(8, -40, 14, 15);
      ctx.beginPath(); ctx.moveTo(-12, -16); ctx.lineTo(-14, -1); ctx.moveTo(10, -16); ctx.lineTo(12, -1); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(14, -40); ctx.bezierCurveTo(10, -64, -18, -66, -22, -44); ctx.stroke();
      ctx.restore();

      ctx.restore();
      requestAnimationFrame(step);
    }
    requestAnimationFrame(step);
  </script>
</body>
</html>`;
}

export function triggerStandaloneGameDownload(img: HTMLImageElement | null): void {
  const html = buildStandaloneHtml(img);
  const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'asoorik-goat-platformer.html';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  window.setTimeout(() => URL.revokeObjectURL(url), 4000);
}
