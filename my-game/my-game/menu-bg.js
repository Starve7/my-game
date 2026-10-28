'use strict';

import { canvas, ctx, TILE, RES } from './game.js';
import { drawResIcon, drawBuildingSprite, drawConveyorSprite, drawCoreSprite } from './sprites.js';

const DEMO_CORE = { x: 20, y: 20 };
const DEMO_TILE_SIZE = TILE;
const demoCamera = { x: 0, y: 0, zoom: 1.8 };

const DEMO_GRASS = [];
for (let ty = 0; ty < 40; ty++) {
  for (let tx = 0; tx < 40; tx++) {
    DEMO_GRASS.push({ tx, ty });
  }
}

const DEMO_ORES = [
  { tx: 18, ty: 17, type: RES.IRON },
  { tx: 19, ty: 17, type: RES.IRON },
  { tx: 22, ty: 17, type: RES.COPPER },
  { tx: 23, ty: 17, type: RES.COPPER },
  { tx: 18, ty: 23, type: RES.COAL },
  { tx: 19, ty: 23, type: RES.COAL },
  { tx: 22, ty: 23, type: RES.COAL },
  { tx: 23, ty: 23, type: RES.COAL },
  { tx: 15, ty: 15, type: RES.IRON },
  { tx: 16, ty: 15, type: RES.IRON },
  { tx: 25, ty: 15, type: RES.COPPER },
  { tx: 26, ty: 15, type: RES.COPPER },
  { tx: 14, ty: 22, type: RES.COAL },
  { tx: 13, ty: 22, type: RES.COAL },
  { tx: 26, ty: 22, type: RES.IRON },
  { tx: 27, ty: 22, type: RES.IRON },
];

const DEMO_BUILDINGS = [
  { type: 'mine',      tx: 18, ty: 17, resourceType: RES.IRON },
  { type: 'mine',      tx: 22, ty: 17, resourceType: RES.COPPER },
  { type: 'mine',      tx: 18, ty: 23, resourceType: RES.COAL },
  { type: 'furnace',   tx: 18, ty: 19 },
  { type: 'furnace',   tx: 22, ty: 19 },
  { type: 'lab',       tx: 20, ty: 18 },
  { type: 'assembler', tx: 20, ty: 22 },
  { type: 'storage',   tx: 22, ty: 22 },
  { type: 'turret',    tx: 16, ty: 20 },
  { type: 'turret',    tx: 24, ty: 20 },
  { type: 'turret',    tx: 20, ty: 16 },
];

const DEMO_CONVEYORS = [
  { dir: 2, tx: 18, ty: 18 },
  { dir: 2, tx: 22, ty: 18 },
  { dir: 1, tx: 19, ty: 18 },
  { dir: 3, tx: 21, ty: 18 },
  { dir: 2, tx: 18, ty: 20 },
  { dir: 2, tx: 22, ty: 20 },
  { dir: 2, tx: 18, ty: 21 },
  { dir: 2, tx: 22, ty: 21 },
];

let animId = null;
let time = 0;
let lastTime = 0;

function drawBackground() {
  const coreX = DEMO_CORE.x * DEMO_TILE_SIZE + DEMO_TILE_SIZE / 2;
  const coreY = DEMO_CORE.y * DEMO_TILE_SIZE + DEMO_TILE_SIZE / 2;
  const t = time * 0.15;
  
  demoCamera.x = coreX + Math.sin(t * 0.6) * 90;
  demoCamera.y = coreY + Math.cos(t * 0.45) * 70;
  demoCamera.zoom = 1.9 + Math.sin(t * 0.3) * 0.15;

  // Очистка экрана
  ctx.fillStyle = '#2a2a2a';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.save();
  ctx.translate(canvas.width / 2, canvas.height / 2);
  ctx.scale(demoCamera.zoom, demoCamera.zoom);
  ctx.translate(-demoCamera.x, -demoCamera.y);
  ctx.imageSmoothingEnabled = false;

  // Трава
  for (const g of DEMO_GRASS) {
    const sx = g.tx * DEMO_TILE_SIZE;
    const sy = g.ty * DEMO_TILE_SIZE;
    ctx.fillStyle = ((g.tx + g.ty) & 1) ? '#4a5a3a' : '#475738';
    ctx.fillRect(sx, sy, DEMO_TILE_SIZE, DEMO_TILE_SIZE);
  }

  // Сетка
  ctx.strokeStyle = 'rgba(0,0,0,0.06)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  for (let i = 0; i <= 40; i++) {
    ctx.moveTo(i * DEMO_TILE_SIZE, 0);
    ctx.lineTo(i * DEMO_TILE_SIZE, 40 * DEMO_TILE_SIZE);
    ctx.moveTo(0, i * DEMO_TILE_SIZE);
    ctx.lineTo(40 * DEMO_TILE_SIZE, i * DEMO_TILE_SIZE);
  }
  ctx.stroke();

  // Руда
  for (const o of DEMO_ORES) {
    drawResIcon(o.type, o.tx * DEMO_TILE_SIZE, o.ty * DEMO_TILE_SIZE, DEMO_TILE_SIZE, 0);
  }

  // Конвейеры
  for (const c of DEMO_CONVEYORS) {
    const sx = c.tx * DEMO_TILE_SIZE;
    const sy = c.ty * DEMO_TILE_SIZE;
    const spriteOk = drawConveyorSprite(c.dir, sx, sy, DEMO_TILE_SIZE);
    if (!spriteOk) {
      ctx.fillStyle = '#3a3a3a';
      ctx.fillRect(sx + 1, sy + 1, DEMO_TILE_SIZE - 2, DEMO_TILE_SIZE - 2);
      ctx.fillStyle = '#4a4a4a';
      ctx.fillRect(sx + 3, sy + 3, DEMO_TILE_SIZE - 6, DEMO_TILE_SIZE - 6);
    }
  }

  // Здания
  for (const b of DEMO_BUILDINGS) {
    const sx = b.tx * DEMO_TILE_SIZE;
    const sy = b.ty * DEMO_TILE_SIZE;
    const spriteOk = drawBuildingSprite(b.type, sx, sy, DEMO_TILE_SIZE);
    if (!spriteOk) {
      const colorMap = {
        mine: '#5a5a5a', furnace: '#5a3a2a', lab: '#2a3a5a',
        assembler: '#3a4a3a', storage: '#3a3a3a', turret: '#4a4a4a',
      };
      ctx.fillStyle = colorMap[b.type] || '#444';
      ctx.fillRect(sx + 2, sy + 2, DEMO_TILE_SIZE - 4, DEMO_TILE_SIZE - 4);
    }
  }

  // Ядро
  const coreLeft = DEMO_CORE.x * DEMO_TILE_SIZE - DEMO_TILE_SIZE;
  const coreTop = DEMO_CORE.y * DEMO_TILE_SIZE - DEMO_TILE_SIZE;
  const coreSize = DEMO_TILE_SIZE * 3;
  const coreOk = drawCoreSprite(coreLeft, coreTop, coreSize);
  if (!coreOk) {
    ctx.fillStyle = '#1e2a40';
    ctx.fillRect(coreLeft, coreTop, coreSize, coreSize);
    ctx.fillStyle = '#3a5a8a';
    ctx.fillRect(coreLeft + 4, coreTop + 4, coreSize - 8, coreSize - 8);
    const glow = 0.5 + 0.5 * Math.sin(performance.now() / 600);
    ctx.fillStyle = `rgba(120,200,255,${0.5 + glow * 0.4})`;
    ctx.fillRect(coreLeft + DEMO_TILE_SIZE + 4, coreTop + DEMO_TILE_SIZE + 4, DEMO_TILE_SIZE - 8, DEMO_TILE_SIZE - 8);
  }

  ctx.restore();
}

function loop(now) {
  if (!lastTime) lastTime = now;
  const dt = Math.min(0.05, (now - lastTime) / 1000);
  lastTime = now;
  time += dt;
  
  try {
    drawBackground();
  } catch (e) {
    console.error("Ошибка отрисовки меню:", e);
  }
  
  animId = requestAnimationFrame(loop);
}

export function startMenuBackground() {
  if (animId) return;
  lastTime = 0;
  animId = requestAnimationFrame(loop);
}

export function stopMenuBackground() {
  if (animId) {
    cancelAnimationFrame(animId);
    animId = null;
  }
}

console.debug('[menu-bg] loaded');