import {
  ARTWORK_PATCH_RECTS,
  GOAL_LEAF_RECT,
  LEVEL_ARTWORK_PATH,
  LEVEL_HAZARDS,
  LEVEL_PLATFORMS,
  LEVEL_UPDRAFT,
  WORLD_HEIGHT,
  WORLD_WIDTH,
} from './levelData';
import type { PlayerState, SimEvent, WorldState } from './types';

interface Particle {
  active: boolean;
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  size: number;
  color: string;
  gravity: number;
}

const POOL_SIZE = 128;

export class GameRenderer {
  private bgCanvas: HTMLCanvasElement | null = null;
  private bgImage: HTMLImageElement | null = null;
  private bgLoaded = false;
  private particles: Particle[] = [];
  private poolCursor = 0;

  constructor() {
    for (let i = 0; i < POOL_SIZE; i++) {
      this.particles.push({
        active: false,
        x: 0,
        y: 0,
        vx: 0,
        vy: 0,
        life: 0,
        maxLife: 1,
        size: 4,
        color: '#F4DFC4',
        gravity: 0,
      });
    }
    this.loadLevelArtwork();
  }

  public getSourceImage(): HTMLImageElement | null {
    return this.bgLoaded ? this.bgImage : null;
  }

  private loadLevelArtwork(): void {
    if (typeof window === 'undefined') return;
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      this.bgImage = img;
      this.buildPatchedBackground(img);
      this.bgLoaded = true;
    };
    img.onerror = () => {
      this.bgLoaded = false;
    };
    img.src = LEVEL_ARTWORK_PATH;
  }

  private buildPatchedBackground(img: HTMLImageElement): void {
    const off = document.createElement('canvas');
    off.width = WORLD_WIDTH;
    off.height = WORLD_HEIGHT;
    const ctx = off.getContext('2d', { willReadFrequently: true });
    if (!ctx) return;

    ctx.drawImage(img, 0, 0, WORLD_WIDTH, WORLD_HEIGHT);

    // Cleanly patch out static actors from the artwork by sampling their exact
    // neighboring terracotta clay pixels so animations sit seamlessly inside the art.
    for (const patch of ARTWORK_PATCH_RECTS) {
      let fill = '#DA9561';
      try {
        const px = ctx.getImageData(
          Math.max(0, Math.min(WORLD_WIDTH - 1, Math.round(patch.sampleX))),
          Math.max(0, Math.min(WORLD_HEIGHT - 1, Math.round(patch.sampleY))),
          1,
          1
        ).data;
        fill = `rgb(${px[0]}, ${px[1]}, ${px[2]})`;
      } catch {
        fill = '#DA9561';
      }
      ctx.fillStyle = fill;
      ctx.fillRect(patch.x, patch.y, patch.w, patch.h);
    }

    this.bgCanvas = off;
  }

  private spawnParticle(
    x: number,
    y: number,
    vx: number,
    vy: number,
    life: number,
    size: number,
    color: string,
    gravity = 320
  ): void {
    const p = this.particles[this.poolCursor];
    this.poolCursor = (this.poolCursor + 1) % POOL_SIZE;
    p.active = true;
    p.x = x;
    p.y = y;
    p.vx = vx;
    p.vy = vy;
    p.life = life;
    p.maxLife = life;
    p.size = size;
    p.color = color;
    p.gravity = gravity;
  }

  public emitFromEvents(events: SimEvent[]): void {
    for (const ev of events) {
      switch (ev.type) {
        case 'jump':
          for (let i = 0; i < 6; i++) {
            this.spawnParticle(
              ev.x + (Math.random() - 0.5) * 20,
              ev.y - 2,
              (Math.random() - 0.5) * 140,
              -30 - Math.random() * 85,
              0.32 + Math.random() * 0.2,
              3.5 + Math.random() * 3,
              '#F4DFC4',
              260
            );
          }
          break;
        case 'land':
          for (let i = 0; i < 6; i++) {
            const side = i % 2 === 0 ? -1 : 1;
            this.spawnParticle(
              ev.x + side * (6 + Math.random() * 10),
              ev.y - 2,
              side * (60 + Math.random() * 110),
              -25 - Math.random() * 70,
              0.28 + Math.random() * 0.18,
              3 + Math.random() * 3,
              '#7C4523',
              340
            );
          }
          break;
        case 'bounce':
        case 'updraft':
          for (let i = 0; i < 14; i++) {
            this.spawnParticle(
              ev.x + (Math.random() - 0.5) * 44,
              ev.y + (Math.random() - 0.5) * 20,
              (Math.random() - 0.5) * 110,
              -120 - Math.random() * 210,
              0.48 + Math.random() * 0.35,
              4 + Math.random() * 3.5,
              i % 2 === 0 ? '#F4DFC4' : '#7EE08F',
              -80
            );
          }
          break;
        case 'collect':
          for (let i = 0; i < 16; i++) {
            const a = (i / 16) * Math.PI * 2;
            const spd = 90 + Math.random() * 130;
            this.spawnParticle(
              ev.x,
              ev.y,
              Math.cos(a) * spd,
              Math.sin(a) * spd,
              0.45 + Math.random() * 0.25,
              4 + Math.random() * 3,
              i % 2 === 0 ? '#FCE7B2' : '#7EE08F',
              60
            );
          }
          break;
        case 'hurt':
        case 'defeat':
          for (let i = 0; i < 20; i++) {
            const a = Math.random() * Math.PI * 2;
            const spd = 110 + Math.random() * 220;
            this.spawnParticle(
              ev.x,
              ev.y,
              Math.cos(a) * spd,
              Math.sin(a) * spd - 60,
              0.4 + Math.random() * 0.3,
              4.5 + Math.random() * 4,
              i % 3 === 0 ? '#C93B2B' : '#0B0F19',
              460
            );
          }
          break;
        case 'stomp':
          for (let i = 0; i < 8; i++) {
            this.spawnParticle(
              ev.x + (Math.random() - 0.5) * 46,
              ev.y - 2,
              (Math.random() - 0.5) * 140,
              -40 - Math.random() * 60,
              0.35,
              4,
              '#2D1910',
              320
            );
          }
          break;
        case 'victory':
          for (let i = 0; i < 32; i++) {
            const a = Math.random() * Math.PI * 2;
            const spd = 80 + Math.random() * 240;
            this.spawnParticle(
              ev.x,
              ev.y,
              Math.cos(a) * spd,
              Math.sin(a) * spd - 90,
              0.7 + Math.random() * 0.55,
              5 + Math.random() * 4.5,
              i % 2 === 0 ? '#7EE08F' : '#F6E2B3',
              180
            );
          }
          break;
      }
    }
  }

  public updateParticles(dt: number): void {
    for (let i = 0; i < POOL_SIZE; i++) {
      const p = this.particles[i];
      if (!p.active) continue;
      p.life -= dt;
      if (p.life <= 0) {
        p.active = false;
        continue;
      }
      p.vy += p.gravity * dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
    }
  }

  public render(ctx: CanvasRenderingContext2D, world: WorldState, canvasW: number, canvasH: number): void {
    ctx.save();
    ctx.clearRect(0, 0, canvasW, canvasH);

    // Scale logical 1300x1000 world cleanly to fit the canvas
    const scaleX = canvasW / WORLD_WIDTH;
    const scaleY = canvasH / WORLD_HEIGHT;
    ctx.scale(scaleX, scaleY);

    // Decaying trauma^2 camera shake
    const shake = world.trauma * world.trauma * 14;
    if (shake > 0.1) {
      const ox = (Math.random() * 2 - 1) * shake;
      const oy = (Math.random() * 2 - 1) * shake;
      ctx.translate(ox, oy);
    }

    // 1. Level Artwork Backdrop (or procedural terracotta fallback)
    if (this.bgCanvas) {
      ctx.drawImage(this.bgCanvas, 0, 0, WORLD_WIDTH, WORLD_HEIGHT);
    } else {
      this.drawProceduralFallbackLevel(ctx);
    }

    // 2. Living Updraft Ribbons over the Soaring Birds (Floor 1 Right -> Floor 2 Right)
    this.drawSoaringBirdsUpdraft(ctx, world.time);

    // 3. Subtle Shimmer on the Star-Dot Bridge (Floor 3 Far Right)
    this.drawStarBridgeShimmer(ctx, world.time);

    // 4. Hovering Beetle Carrier & Two Diamond Stepping Blocks
    this.drawBeetleCarrier(ctx, world);

    // 5. Optional Sacred Sun Seals
    this.drawCollectibles(ctx, world);

    // 6. Animated Swaying Sacred Tree Leaf (Goal at Top-Right)
    this.drawSacredTreeLeaf(ctx, world.time, world.goalReached);

    // 7. Animated Horned Guardian on Floor 3 Left
    this.drawHornedGuardian(ctx, world);

    // 8. Animated Mountain Goat (Player)
    this.drawGoat(ctx, world.player, world.time);

    // 9. Pooled Particles
    this.drawParticles(ctx);

    // 10. Subtle low-health peripheral crimson vignette (gaze-routed cue)
    if (world.phase === 'playing' && world.player.hearts === 1) {
      const pulse = 0.16 + Math.sin(world.time * 5.5) * 0.06;
      const grad = ctx.createRadialGradient(
        WORLD_WIDTH * 0.5,
        WORLD_HEIGHT * 0.5,
        WORLD_WIDTH * 0.34,
        WORLD_WIDTH * 0.5,
        WORLD_HEIGHT * 0.5,
        WORLD_WIDTH * 0.7
      );
      grad.addColorStop(0, 'rgba(201, 59, 43, 0)');
      grad.addColorStop(1, `rgba(170, 32, 22, ${pulse.toFixed(3)})`);
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, WORLD_WIDTH, WORLD_HEIGHT);
    }

    ctx.restore();
  }

  private drawProceduralFallbackLevel(ctx: CanvasRenderingContext2D): void {
    ctx.fillStyle = '#DC9862';
    ctx.fillRect(0, 0, WORLD_WIDTH, WORLD_HEIGHT);

    // Draw platforms in deep obsidian pottery motif
    for (const p of LEVEL_PLATFORMS) {
      ctx.fillStyle = '#0B0F19';
      ctx.fillRect(p.x, p.y, p.w, p.h);
      ctx.strokeStyle = '#DC9862';
      ctx.lineWidth = 2;
      ctx.strokeRect(p.x + 4, p.y + 4, Math.max(0, p.w - 8), Math.max(0, p.h - 8));
    }
    // Draw hazards
    for (const h of LEVEL_HAZARDS) {
      ctx.fillStyle = '#0B0F19';
      ctx.fillRect(h.x, h.y, h.w, h.h);
      ctx.strokeStyle = '#C93B2B';
      ctx.lineWidth = 2;
      ctx.strokeRect(h.x + 2, h.y + 2, h.w - 4, h.h - 4);
    }
  }

  private drawSoaringBirdsUpdraft(ctx: CanvasRenderingContext2D, time: number): void {
    const u = LEVEL_UPDRAFT;
    const cx = u.x + u.w * 0.5;
    ctx.save();

    // Gentle rising golden-parchment thermal ribbons signaling upward lift
    for (let i = 0; i < 3; i++) {
      const progress = ((time * 0.65 + i * 0.33) % 1);
      const y = u.y + u.h - progress * (u.h + 100);
      const alpha = Math.sin(progress * Math.PI) * 0.42;
      const offsetX = Math.sin(time * 3 + i * 2) * 14;

      ctx.strokeStyle = `rgba(248, 228, 194, ${alpha.toFixed(3)})`;
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.moveTo(cx + offsetX - 24, y + 18);
      ctx.quadraticCurveTo(cx + offsetX, y - 6, cx + offsetX + 24, y + 18);
      ctx.stroke();
    }

    // Upward subtle chevron hint near the soaring birds
    const chevronAlpha = 0.25 + Math.sin(time * 4) * 0.14;
    ctx.strokeStyle = `rgba(246, 226, 179, ${chevronAlpha.toFixed(3)})`;
    ctx.lineWidth = 2.2;
    const cy = u.y + 18 - ((time * 28) % 24);
    ctx.beginPath();
    ctx.moveTo(cx - 12, cy + 8);
    ctx.lineTo(cx, cy - 4);
    ctx.lineTo(cx + 12, cy + 8);
    ctx.stroke();

    ctx.restore();
  }

  private drawStarBridgeShimmer(ctx: CanvasRenderingContext2D, time: number): void {
    const glow = 0.14 + Math.sin(time * 3.4) * 0.08;
    ctx.save();
    ctx.fillStyle = `rgba(246, 226, 179, ${glow.toFixed(3)})`;
    ctx.fillRect(1102, 340, 96, 24);
    ctx.restore();
  }

  private drawBeetleCarrier(ctx: CanvasRenderingContext2D, world: WorldState): void {
    const lower = world.beetlePlatforms[0];
    const upper = world.beetlePlatforms[1];
    if (!lower || !upper) return;

    ctx.save();

    // Draw the two diamond patterned blocks faithfully matching the user's pottery art
    const drawDiamondTile = (x: number, y: number, w: number, h: number, bouncy: boolean) => {
      ctx.save();
      if (bouncy) {
        const pulse = 0.18 + Math.sin(world.time * 4.5) * 0.08;
        ctx.shadowColor = `rgba(126, 224, 143, ${pulse + 0.3})`;
        ctx.shadowBlur = 12;
      }
      ctx.fillStyle = '#090D16';
      ctx.fillRect(x, y, w, h);

      // Incised ochre X diagonals inside the black block
      ctx.strokeStyle = '#DC9862';
      ctx.lineWidth = 2.6;
      ctx.beginPath();
      ctx.moveTo(x + 2, y + 2);
      ctx.lineTo(x + w - 2, y + h - 2);
      ctx.moveTo(x + w - 2, y + 2);
      ctx.lineTo(x + 2, y + h - 2);
      ctx.stroke();

      // Subtle emerald spring highlight along the top edge of the bouncy upper tile
      if (bouncy) {
        ctx.fillStyle = '#7EE08F';
        ctx.fillRect(x + 6, y - 2, w - 12, 3);
      }
      ctx.restore();
    };

    drawDiamondTile(lower.x, lower.y, lower.w, lower.h, false);
    drawDiamondTile(upper.x, upper.y, upper.w, upper.h, true);

    // Draw the ancient horned beetle head attached to the left of the lower diamond
    const bx = lower.x - 24;
    const by = lower.y + lower.h * 0.5;
    ctx.fillStyle = '#090D16';
    ctx.beginPath();
    ctx.ellipse(bx + 14, by, 14, 15, 0, 0, Math.PI * 2);
    ctx.fill();

    // Curved mandibles/horns facing left
    ctx.strokeStyle = '#090D16';
    ctx.lineWidth = 3.5;
    ctx.beginPath();
    ctx.arc(bx + 2, by, 11, Math.PI * 0.65, Math.PI * 1.35);
    ctx.stroke();

    // Two expressive ochre-ringed pottery eyes
    ctx.fillStyle = '#DC9862';
    ctx.beginPath();
    ctx.arc(bx + 14, by - 5, 3.6, 0, Math.PI * 2);
    ctx.arc(bx + 14, by + 5, 3.6, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#090D16';
    ctx.beginPath();
    ctx.arc(bx + 13.5, by - 5, 1.8, 0, Math.PI * 2);
    ctx.arc(bx + 13.5, by + 5, 1.8, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }

  private drawCollectibles(ctx: CanvasRenderingContext2D, world: WorldState): void {
    for (const col of world.collectibles) {
      if (col.collected) continue;
      const bobY = col.y + Math.sin(world.time * 3.2 + col.x * 0.02) * 5;
      ctx.save();
      ctx.translate(col.x, bobY);

      // Soft warm sunlit aura
      const grad = ctx.createRadialGradient(0, 0, 3, 0, 0, 26);
      grad.addColorStop(0, 'rgba(252, 231, 178, 0.55)');
      grad.addColorStop(1, 'rgba(252, 231, 178, 0)');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(0, 0, 26, 0, Math.PI * 2);
      ctx.fill();

      // Rotating ancient Susa sun-seal rosette
      ctx.rotate(world.time * 0.9);
      ctx.fillStyle = '#0B0F19';
      ctx.beginPath();
      ctx.arc(0, 0, 13, 0, Math.PI * 2);
      ctx.fill();

      ctx.strokeStyle = '#FCE7B2';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(0, 0, 10, 0, Math.PI * 2);
      ctx.stroke();

      for (let i = 0; i < 8; i++) {
        const a = (i / 8) * Math.PI * 2;
        ctx.beginPath();
        ctx.moveTo(Math.cos(a) * 4, Math.sin(a) * 4);
        ctx.lineTo(Math.cos(a) * 14, Math.sin(a) * 14);
        ctx.stroke();
      }

      ctx.fillStyle = '#7EE08F';
      ctx.beginPath();
      ctx.arc(0, 0, 3.5, 0, Math.PI * 2);
      ctx.fill();

      ctx.restore();
    }
  }

  private drawSacredTreeLeaf(ctx: CanvasRenderingContext2D, time: number, reached: boolean): void {
    const baseX = GOAL_LEAF_RECT.x + 54;
    const baseY = GOAL_LEAF_RECT.y + 96;
    const sway = Math.sin(time * 2.4) * 0.055;

    ctx.save();
    ctx.translate(baseX, baseY);

    // Emerald luminescence echoing the user's original green halo on the top-right tree!
    const auraR = reached ? 92 : 66 + Math.sin(time * 3.1) * 7;
    const grad = ctx.createRadialGradient(0, -48, 8, 0, -48, auraR);
    grad.addColorStop(0, reached ? 'rgba(126, 224, 143, 0.72)' : 'rgba(92, 186, 114, 0.56)');
    grad.addColorStop(0.6, 'rgba(76, 154, 94, 0.22)');
    grad.addColorStop(1, 'rgba(76, 154, 94, 0)');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(0, -48, auraR, 0, Math.PI * 2);
    ctx.fill();

    ctx.rotate(sway);

    // Stylized ancient Mesopotamian date-palm / sacred Asurig tree fronds in obsidian ink
    ctx.strokeStyle = '#090D16';
    ctx.fillStyle = '#090D16';
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    // Central trunk/stem
    ctx.lineWidth = 7;
    ctx.beginPath();
    ctx.moveTo(-2, 2);
    ctx.quadraticCurveTo(0, -34, 4, -84);
    ctx.stroke();

    // Left lower frond
    ctx.lineWidth = 5.5;
    ctx.beginPath();
    ctx.moveTo(-2, -18);
    ctx.quadraticCurveTo(-22, -32, -34, -52);
    ctx.stroke();

    // Left upper frond
    ctx.beginPath();
    ctx.moveTo(0, -40);
    ctx.quadraticCurveTo(-18, -56, -24, -76);
    ctx.stroke();

    // Right arching frond
    ctx.beginPath();
    ctx.moveTo(1, -24);
    ctx.quadraticCurveTo(22, -38, 30, -54);
    ctx.stroke();

    // Top-right crown frond
    ctx.beginPath();
    ctx.moveTo(3, -52);
    ctx.quadraticCurveTo(20, -68, 28, -82);
    ctx.stroke();

    // Serrated palm leaf notches (silhouetted fronds)
    const leafTips: Array<[number, number, number]> = [
      [-32, -52, -0.7],
      [-24, -74, -0.4],
      [4, -86, 0.05],
      [27, -80, 0.5],
      [28, -54, 0.7],
      [-16, -34, -0.9],
      [16, -40, 0.85],
    ];
    for (const [lx, ly, ang] of leafTips) {
      ctx.save();
      ctx.translate(lx, ly);
      ctx.rotate(ang);
      ctx.beginPath();
      ctx.ellipse(0, 0, 5.5, 11, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    // Subtle shimmering emerald rim on top leaf
    ctx.strokeStyle = 'rgba(148, 240, 166, 0.65)';
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.arc(4, -76, 16, -Math.PI * 0.85, -Math.PI * 0.15);
    ctx.stroke();

    ctx.restore();

    // Floating emerald leaf motes
    for (let i = 0; i < 4; i++) {
      const mPhase = (time * 0.5 + i * 0.25) % 1;
      const mx = baseX + Math.sin(time * 2 + i * 1.9) * 32;
      const my = baseY - 24 - mPhase * 70;
      const ma = Math.sin(mPhase * Math.PI) * 0.8;
      ctx.fillStyle = `rgba(148, 240, 166, ${ma.toFixed(3)})`;
      ctx.beginPath();
      ctx.arc(mx, my, 2.5, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  private drawHornedGuardian(ctx: CanvasRenderingContext2D, world: WorldState): void {
    const g = world.guardian;
    const cx = g.x + g.w * 0.5;
    const footY = g.y + g.h;
    const walkBob = g.state === 'patrol' ? Math.abs(Math.sin(world.time * 6)) * 4 : 0;
    const crouch = g.state === 'windup' ? 8 : 0;

    ctx.save();
    ctx.translate(cx, footY);

    // Windup telegraph glow ring before stomp
    if (g.state === 'windup') {
      const pulse = 0.45 + Math.sin(world.time * 28) * 0.3;
      ctx.strokeStyle = `rgba(201, 59, 43, ${pulse.toFixed(3)})`;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.ellipse(0, -4, 34, 9, 0, 0, Math.PI * 2);
      ctx.stroke();
    }

    ctx.scale(g.facing, 1);
    ctx.fillStyle = '#090D16';
    ctx.strokeStyle = '#090D16';
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    const stride = g.state === 'patrol' ? Math.sin(world.time * 6) * 9 : 0;

    // Legs (ancient stylized angular silhouette matching AsoorikNewFace warrior)
    ctx.lineWidth = 7;
    ctx.beginPath();
    ctx.moveTo(-6, -42 + crouch);
    ctx.lineTo(-10 - stride, -20 + crouch * 0.5);
    ctx.lineTo(-7 - stride * 0.6, -2);
    ctx.moveTo(6, -42 + crouch);
    ctx.lineTo(10 + stride, -20 + crouch * 0.5);
    ctx.lineTo(7 + stride * 0.6, -2);
    ctx.stroke();

    // Muscular triangular torso
    ctx.beginPath();
    ctx.moveTo(-20, -82 + crouch - walkBob);
    ctx.lineTo(20, -82 + crouch - walkBob);
    ctx.lineTo(8, -42 + crouch - walkBob * 0.5);
    ctx.lineTo(-8, -42 + crouch - walkBob * 0.5);
    ctx.closePath();
    ctx.fill();

    // Raised/bent arms
    const armRaise = g.state === 'windup' ? -18 : g.state === 'stomp' ? 8 : 0;
    ctx.lineWidth = 6.5;
    ctx.beginPath();
    ctx.moveTo(-18, -78 + crouch - walkBob);
    ctx.lineTo(-28, -64 + crouch + armRaise);
    ctx.lineTo(-22, -48 + crouch + armRaise);
    ctx.moveTo(18, -78 + crouch - walkBob);
    ctx.lineTo(28, -64 + crouch + armRaise);
    ctx.lineTo(22, -48 + crouch + armRaise);
    ctx.stroke();

    // Bull/horned head
    ctx.beginPath();
    ctx.ellipse(0, -90 + crouch - walkBob, 11, 10, 0, 0, Math.PI * 2);
    ctx.fill();

    // Curved warrior horns
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(-8, -94 + crouch - walkBob);
    ctx.quadraticCurveTo(-20, -104 + crouch - walkBob, -17, -112 + crouch - walkBob);
    ctx.moveTo(8, -94 + crouch - walkBob);
    ctx.quadraticCurveTo(20, -104 + crouch - walkBob, 17, -112 + crouch - walkBob);
    ctx.stroke();

    // Ochre mask eye marks
    ctx.fillStyle = g.state === 'windup' ? '#F06A4B' : '#DC9862';
    ctx.fillRect(-5, -93 + crouch - walkBob, 3.5, 2.5);
    ctx.fillRect(1.5, -93 + crouch - walkBob, 3.5, 2.5);

    ctx.restore();
  }

  private drawGoat(ctx: CanvasRenderingContext2D, p: PlayerState, time: number): void {
    // Blink subtly during invulnerability frames after hurt
    if (p.invulnTimer > 0 && Math.floor(time * 16) % 2 === 0 && p.hitFlashTimer <= 0) {
      return;
    }

    const cx = p.x + p.w * 0.5;
    const footY = p.y + p.h;
    const speedRatio = Math.min(1, Math.abs(p.vx) / 260);
    const gait = Math.sin(p.strideDistance * 0.14);
    const runBob = p.grounded ? Math.abs(gait) * 3.5 * speedRatio : 0;

    ctx.save();
    ctx.translate(cx, footY);

    // Subtle warm terracotta-sand aura echoing the original goat silhouette glow!
    const auraGrad = ctx.createRadialGradient(0, -28, 8, 0, -28, 42);
    auraGrad.addColorStop(0, 'rgba(248, 224, 190, 0.34)');
    auraGrad.addColorStop(1, 'rgba(248, 224, 190, 0)');
    ctx.fillStyle = auraGrad;
    ctx.beginPath();
    ctx.arc(0, -28, 42, 0, Math.PI * 2);
    ctx.fill();

    // Squash & stretch anchored at the hooves
    ctx.scale(p.facing * p.scaleX, p.scaleY);

    const bodyColor = p.hitFlashTimer > 0 ? '#FFF6E8' : '#090D16';
    ctx.fillStyle = bodyColor;
    ctx.strokeStyle = bodyColor;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    // Articulated goat legs (stride-synced when grounded, tucked/extended when jumping)
    const frontSwing = p.grounded ? gait * 10 * speedRatio : p.vy < 0 ? 7 : -5;
    const backSwing = p.grounded ? -gait * 10 * speedRatio : p.vy < 0 ? -8 : 6;
    const liftFront = p.grounded ? Math.max(0, gait) * 4 * speedRatio : 5;
    const liftBack = p.grounded ? Math.max(0, -gait) * 4 * speedRatio : 4;

    ctx.lineWidth = 4.2;
    // Back legs
    ctx.beginPath();
    ctx.moveTo(-12, -18 - runBob);
    ctx.lineTo(-15 + backSwing * 0.6, -9 - liftBack * 0.4);
    ctx.lineTo(-13 + backSwing, -1 - liftBack);
    ctx.moveTo(-7, -18 - runBob);
    ctx.lineTo(-9 - backSwing * 0.5, -9);
    ctx.lineTo(-8 - backSwing * 0.8, -1);
    ctx.stroke();

    // Front legs
    ctx.beginPath();
    ctx.moveTo(10, -19 - runBob);
    ctx.lineTo(13 + frontSwing * 0.6, -9 - liftFront * 0.4);
    ctx.lineTo(11 + frontSwing, -1 - liftFront);
    ctx.moveTo(5, -19 - runBob);
    ctx.lineTo(7 - frontSwing * 0.5, -9);
    ctx.lineTo(6 - frontSwing * 0.8, -1);
    ctx.stroke();

    // Stylized ancient Elamite ibex torso (slender arched waist, muscular chest)
    ctx.beginPath();
    ctx.moveTo(-18, -24 - runBob);
    ctx.quadraticCurveTo(-4, -29 - runBob, 14, -27 - runBob);
    ctx.quadraticCurveTo(18, -22 - runBob, 13, -15 - runBob);
    ctx.quadraticCurveTo(-2, -13 - runBob, -16, -16 - runBob);
    ctx.closePath();
    ctx.fill();

    // Perky little tail
    ctx.lineWidth = 3.5;
    ctx.beginPath();
    ctx.moveTo(-16, -24 - runBob);
    ctx.lineTo(-23, -30 - runBob);
    ctx.stroke();

    // Upright neck & head
    ctx.beginPath();
    ctx.moveTo(9, -24 - runBob);
    ctx.lineTo(15, -39 - runBob);
    ctx.lineTo(24, -36 - runBob);
    ctx.lineTo(22, -31 - runBob);
    ctx.lineTo(15, -29 - runBob);
    ctx.lineTo(14, -19 - runBob);
    ctx.closePath();
    ctx.fill();

    // Classic goat chin beard
    ctx.lineWidth = 2.6;
    ctx.beginPath();
    ctx.moveTo(20, -31 - runBob);
    ctx.lineTo(21, -24 - runBob);
    ctx.stroke();

    // Iconic sweeping double arched Ibex horns (the signature Susa pottery silhouette!)
    ctx.lineWidth = 3.8;
    ctx.beginPath();
    ctx.moveTo(15, -39 - runBob);
    ctx.bezierCurveTo(10, -64 - runBob, -18, -66 - runBob, -23, -44 - runBob);
    ctx.stroke();

    ctx.lineWidth = 2.6;
    ctx.beginPath();
    ctx.moveTo(17, -39 - runBob);
    ctx.bezierCurveTo(14, -58 - runBob, -10, -60 - runBob, -17, -45 - runBob);
    ctx.stroke();

    // Small pointed ear
    ctx.beginPath();
    ctx.moveTo(13, -38 - runBob);
    ctx.lineTo(8, -42 - runBob);
    ctx.lineTo(12, -35 - runBob);
    ctx.fill();

    // Bright ochre eye dot for clear facing readability
    ctx.fillStyle = p.hitFlashTimer > 0 ? '#090D16' : '#F4DFC4';
    ctx.beginPath();
    ctx.arc(18.5, -36 - runBob, 1.8, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }

  private drawParticles(ctx: CanvasRenderingContext2D): void {
    for (let i = 0; i < POOL_SIZE; i++) {
      const p = this.particles[i];
      if (!p.active) continue;
      const alpha = Math.max(0, p.life / p.maxLife);
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size * (0.4 + 0.6 * alpha), 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }
}
