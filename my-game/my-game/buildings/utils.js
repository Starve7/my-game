'use strict';

import { inventory, state, showToast, TILE, RES, RES_COLOR, ctx } from '../game.js';
import { CORE } from '../world.js';
import { buildings, conveyors, splitters, undergrounds, CONVEYOR_CAPACITY, DIR_DELTA } from './data.js';

// ======================
// Логика поиска и работы
// ======================
export function getConveyorAt(tx, ty) { return conveyors.find(c => c.tx === tx && c.ty === ty); }
export function getBuildingAt(tx, ty) { return buildings.find(b => b.tx === tx && b.ty === ty); }
export function getSplitterAt(tx, ty) {
  return splitters.find(s => {
    if (s.dir === 1 || s.dir === 3) return s.tx === tx && (s.ty === ty || s.ty === ty - 1);
    else return s.ty === ty && (s.tx === tx || s.tx === tx - 1);
  });
}
export function getUndergroundAt(tx, ty) { return undergrounds.find(u => u.tx === tx && u.ty === ty); }
export function isCoreTile(tx, ty) { return Math.abs(tx - CORE.x) <= 1 && Math.abs(ty - CORE.y) <= 1; }
export function countBuildings(type) { return buildings.filter(b => b.type === type).length; }
export function checkLimit(type) { if (type === 'conveyor' || type === 'splitter' || type === 'underground') return true; return countBuildings(type) < state.LIMITS[type]; }
export function getStorageTotal(b) { let total = 0; for (const k in b.items) total += b.items[k]; return total; }

export function getOutputConveyor(b) {
  if (b.outputDir === null || b.outputDir === undefined) return null;
  const [dx, dy] = DIR_DELTA[b.outputDir];
  const tx = b.tx + dx, ty = b.ty + dy;
  const c = getConveyorAt(tx, ty); if (c && !c.isBroken) return c;
  const s = getSplitterAt(tx, ty); if (s && !s.isBroken) return s;
  const u = getUndergroundAt(tx, ty); if (u && !u.isBroken && u.isEntrance) return u;
  return null;
}

export function tryAcceptItem(b, itemType) {
  if (!b || b.isBroken) return false;
  if (typeof b.tryAccept === 'function') return b.tryAccept(itemType);
  return false;
}
export function acceptItem(b, itemType) {
  if (!b || b.isBroken) return;
  if (typeof b.accept === 'function') b.accept(itemType);
}

export function damageBuildingAt(tx, ty, dmg) {
  const b = getBuildingAt(tx, ty);
  if (!b || b.hp === undefined || b.isBroken) return false;
  b.hp -= dmg;
  if (b.hp <= 0) { b.hp = 0; b.isBroken = true; return true; }
  return false;
}

export function damageConveyorAt(tx, ty, dmg) {
  const c = getConveyorAt(tx, ty);
  if (c) {
    if (c.isBroken) return false;
    c.hp -= dmg;
    if (c.hp <= 0) { c.hp = 0; c.isBroken = true; return true; }
    return false;
  }
  const s = getSplitterAt(tx, ty);
  if (s) {
    if (s.isBroken) return false;
    s.hp -= dmg;
    if (s.hp <= 0) { s.hp = 0; s.isBroken = true; return true; }
    return false;
  }
  const u = getUndergroundAt(tx, ty);
  if (u) {
    if (u.isBroken) return false;
    u.hp -= dmg;
    if (u.hp <= 0) { u.hp = 0; u.isBroken = true; return true; }
    return false;
  }
  return false;
}

export function tryOutputItem(b, itemType) {
  if (b.isBroken) return false;
  const outC = getOutputConveyor(b);
  if (outC) {
    if (outC.items.length < CONVEYOR_CAPACITY) { outC.items.push({ type: itemType, progress: 0 }); return true; }
  }
  if (b.outputBuffer < b.outputBufferMax) { b.outputBuffer++; b.outputBufferType = itemType; return true; }
  return false;
}

export function flushOutputBuffer(b) {
  if (b.outputBuffer <= 0 || !b.outputBufferType) return;
  while (b.outputBuffer > 0) {
    const outC = getOutputConveyor(b);
    if (outC && outC.items.length < CONVEYOR_CAPACITY) {
      outC.items.push({ type: b.outputBufferType, progress: 0 });
      b.outputBuffer--;
    } else break;
  }
  if (b.outputBuffer === 0) b.outputBufferType = null;
}

export function outputSpace(b) {
  const outC = getOutputConveyor(b);
  const convSpace = outC ? (CONVEYOR_CAPACITY - outC.items.length) : 0;
  return convSpace + (b.outputBufferMax - b.outputBuffer);
}

// ======================
// Графические хелперы (ВСЕ С EXPORT)
// ======================
export function drawProgressBar(sx, sy, pct, color) {
  pct = Math.min(1, Math.max(0, pct));
  ctx.fillStyle = 'rgba(0,0,0,0.5)'; ctx.fillRect(sx + 4, sy + TILE - 6, TILE - 8, 3);
  ctx.fillStyle = color; ctx.fillRect(sx + 4, sy + TILE - 6, (TILE - 8) * pct, 3);
}

export function drawBufferBadge(sx, sy, count, itemType) {
  if (count <= 0) return;
  const color = RES_COLOR[itemType] || '#c8b060';
  ctx.fillStyle = 'rgba(0,0,0,0.75)'; ctx.fillRect(sx + 1, sy + TILE - 20, 24, 14);
  ctx.fillStyle = color; ctx.fillRect(sx + 2, sy + TILE - 19, 10, 12);
  ctx.fillStyle = '#fff'; ctx.font = 'bold 10px sans-serif'; ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
  ctx.fillText('×' + count, sx + 14, sy + TILE - 12);
}

export function drawArrow(sx, sy, dir, color) {
  ctx.strokeStyle = color; ctx.lineWidth = 3;
  const cx = sx + TILE / 2, cy = sy + TILE / 2;
  ctx.beginPath();
  if (dir === 0) { ctx.moveTo(cx - 6, cy + 4); ctx.lineTo(cx, cy - 4); ctx.lineTo(cx + 6, cy + 4); }
  else if (dir === 2) { ctx.moveTo(cx - 6, cy - 4); ctx.lineTo(cx, cy + 4); ctx.lineTo(cx + 6, cy - 4); }
  else if (dir === 1) { ctx.moveTo(cx - 4, cy - 6); ctx.lineTo(cx + 4, cy); ctx.lineTo(cx - 4, cy + 6); }
  else { ctx.moveTo(cx + 4, cy - 6); ctx.lineTo(cx - 4, cy); ctx.lineTo(cx + 4, cy + 6); }
  ctx.stroke();
}

export function drawBrokenOverlay(sx, sy, size) {
  ctx.save();
  ctx.strokeStyle = '#ff3030'; ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(sx + 8, sy + 8); ctx.lineTo(sx + size - 8, sy + size - 8);
  ctx.moveTo(sx + size - 8, sy + 8); ctx.lineTo(sx + 8, sy + size - 8);
  ctx.stroke();
  ctx.restore();
}

export function drawHpCircle(sx, sy, hp, maxHp) {
  if (hp >= maxHp) return;
  const cx = sx + TILE / 2, cy = sy + TILE / 2, radius = 9, pct = Math.max(0, hp / maxHp);
  ctx.fillStyle = 'rgba(0,0,0,0.7)'; ctx.beginPath(); ctx.arc(cx, cy, radius + 1, 0, Math.PI * 2); ctx.fill();
  const color = pct > 0.6 ? '#5ac05a' : pct > 0.3 ? '#e0c040' : '#e04040';
  const startAngle = -Math.PI / 2, endAngle = startAngle + pct * Math.PI * 2;
  ctx.fillStyle = color; ctx.beginPath(); ctx.moveTo(cx, cy); ctx.arc(cx, cy, radius, startAngle, endAngle); ctx.closePath(); ctx.fill();
  ctx.strokeStyle = 'rgba(255,255,255,0.5)'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(cx, cy, radius, 0, Math.PI * 2); ctx.stroke();
}