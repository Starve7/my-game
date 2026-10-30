'use strict';

export const TILE = 32;
export const WORLD_W = 200;
export const WORLD_H = 200;
export const MINE_INTERVAL = 1.5;
export const FURNACE_INTERVAL = 2.0;
export const POLLUTION_PER_PLATE = 0.01;
export const MINE_COST = 10;
export const FURNACE_COST = 25;
export const MIN_ZOOM = 0.6;
export const MAX_ZOOM = 3;
export const DAY_LENGTH = 300; // БЫЛО 120, СТАЛО 300 (медленнее день)

export const DIR_DELTA = [[0, -1], [1, 0], [0, 1], [-1, 0]];

export const RES = { IRON: 1, COPPER: 2, COAL: 3, PLATE_IRON: 4, PLATE_COPPER: 5, WIRE: 6, GEAR: 7, CORPS: 8, CIRCUIT: 9, ENGINE: 10, POWDER: 11, AMMO: 12 };
export const RES_COLOR = { 1: '#c87d5e', 2: '#e89a4a', 3: '#555555', 4: '#c0c0d0', 5: '#ff8844', 6: '#c08040', 7: '#888888', 8: '#606060', 9: '#40a040', 10: '#a040a0', 11: '#202020', 12: '#c0a040' };
export const RES_NAME = { 1: 'Железо', 2: 'Медь', 3: 'Уголь', 4: 'Железные плиты', 5: 'Медные плиты', 6: 'Провод', 7: 'Шестерня', 8: 'Корпус', 9: 'Электросхема', 10: 'Двигатель', 11: 'Порох', 12: 'Патроны' };

export const canvas = document.getElementById('game');
export const ctx = canvas.getContext('2d');
export const camera = { x: 0, y: 0, zoom: 1 };

export const inventory = { 1: 25, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0, 7: 0, 8: 0, 9: 0, 10: 0, 11: 0, 12: 0 };

export const state = {
  panel: null, activeBuilding: null, activeConveyor: null, activeSplitter: null, selectedBuilding: null, ghostPos: null,
  pollution: 0, coreHP: 1000, dna: 0, gameOver: false, newConveyorDir: 1, savedOutputDir: null,
  miningSpeedMult: 1.0, labSpeedMult: 1.0, coreDamageBonus: 0, turretFireRateMult: 1.0,
  turretRangeBonus: 0, turretDamageBonus: 0, turretHpBonus: 0,
  soundEnabled: true, gameStarted: false, inMenu: true,
  demolishMode: false, currentSaveSlot: null, totalKills: 0,
  LIMITS: { mine: 30, furnace: 10, lab: 5, cutter: 10, assembler: 5, chemplant: 5, storage: 5, turret: 15, radar: 20, inserter: 50 },
  techState: {}, statHistory: {}, activeStudyTechId: null, studyProgressByTech: {}, studyTickTimer: 0,
  day: 1, timeOfDay: 0.25,
};

export const STAT_WINDOW_SEC = 30;

export function getViewportSize() {
  if (window.visualViewport) return { w: Math.floor(window.visualViewport.width), h: Math.floor(window.visualViewport.height) };
  return { w: window.innerWidth, h: window.innerHeight };
}

export function clampCamera() {
  const halfW = canvas.width / (2 * camera.zoom);
  const halfH = canvas.height / (2 * camera.zoom);
  const minX = halfW, maxX = WORLD_W * TILE - halfW;
  const minY = halfH, maxY = WORLD_H * TILE - halfH;
  camera.x = minX > maxX ? (minX + maxX) / 2 : Math.max(minX, Math.min(maxX, camera.x));
  camera.y = minY > maxY ? (minY + maxY) / 2 : Math.max(minY, Math.min(maxY, camera.y));
}

export function initialZoom() {
  const { w, h } = getViewportSize();
  return Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, Math.min(w, h) / 400));
}

export function resize() {
  const { w, h } = getViewportSize();
  canvas.width = Math.max(1, w);
  canvas.height = Math.max(1, h);
  clampCamera();
}

resize();
if (window.visualViewport) window.visualViewport.addEventListener('resize', resize);
window.addEventListener('resize', resize);
window.addEventListener('orientationchange', () => setTimeout(resize, 120));

export const popups = [];
const popupPool = [];

export function addPopup(worldX, worldY, text, color) {
  let p = popupPool.pop();
  if (!p) p = {};
  p.x = worldX; p.y = worldY; p.text = text; p.color = color || '#7fbf7f'; p.life = 1.2; p.maxLife = 1.2;
  popups.push(p);
}

export function updatePopups(dt) {
  for (let i = popups.length - 1; i >= 0; i--) {
    popups[i].life -= dt;
    popups[i].y -= dt * 30;
    if (popups[i].life <= 0) { popupPool.push(popups[i]); popups.splice(i, 1); }
  }
}

let _errorCount = 0;
export function safeCall(fn, name, ...args) {
  if (typeof fn !== 'function') return;
  try { return fn(...args); } 
  catch (e) { _errorCount++; if (_errorCount < 20) console.error(`[${name}] error #${_errorCount}:`, e); }
}

export const hooks = { onTap: null, onConveyorDragStep: null, onDemolishDrag: null };

const pointers = new Map();
let dragState = null, pinchState = null;

function pinchDist() { const [a, b] = [...pointers.values()]; return Math.hypot(a.x - b.x, a.y - b.y); }
function pinchMid() { const [a, b] = [...pointers.values()]; return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 }; }

export function screenToCell(sx, sy) {
  const wx = (sx - canvas.width / 2) / camera.zoom + camera.x;
  const wy = (sy - canvas.height / 2) / camera.zoom + camera.y;
  const tx = Math.floor(wx / TILE);
  const ty = Math.floor(wy / TILE);
  if (tx < 0 || tx >= WORLD_W || ty < 0 || ty >= WORLD_H) return null;
  return { tx, ty };
}

canvas.addEventListener('pointerdown', e => {
  canvas.setPointerCapture(e.pointerId);
  pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });

  if (pointers.size === 1) {
    if (state.selectedBuilding) {
      const cell = screenToCell(e.clientX, e.clientY);
      if (cell) state.ghostPos = cell;
      if (state.selectedBuilding === 'conveyor' || state.selectedBuilding === 'underground') {
        dragState = { mode: 'conveyor-drag', startX: e.clientX, startY: e.clientY, moved: 0, lastCell: cell };
      } else {
        dragState = { mode: 'ghost', startX: e.clientX, startY: e.clientY, moved: 0 };
      }
    } else if (state.demolishMode) {
      dragState = { mode: 'demolish', startX: e.clientX, startY: e.clientY, moved: 0, lastCell: null };
    } else {
      dragState = { mode: 'camera', startX: e.clientX, startY: e.clientY, camX: camera.x, camY: camera.y, moved: 0 };
    }
    pinchState = null;
  } else if (pointers.size === 2) {
    const mid = pinchMid();
    pinchState = { startDist: pinchDist(), startZoom: camera.zoom, startMidX: mid.x, startMidY: mid.y, startCamX: camera.x, startCamY: camera.y };
    dragState = null;
  }
});

canvas.addEventListener('pointermove', e => {
  if (!pointers.has(e.pointerId)) return;
  pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });

  if (pointers.size === 1 && dragState) {
    const dx = e.clientX - dragState.startX;
    const dy = e.clientY - dragState.startY;
    dragState.moved = Math.max(dragState.moved, Math.hypot(dx, dy));

    if (dragState.mode === 'camera') {
      camera.x = dragState.camX - dx / camera.zoom;
      camera.y = dragState.camY - dy / camera.zoom;
      clampCamera();
    } else if (dragState.mode === 'ghost') {
      const cell = screenToCell(e.clientX, e.clientY);
      if (cell) state.ghostPos = cell;
    } else if (dragState.mode === 'conveyor-drag') {
      const cell = screenToCell(e.clientX, e.clientY);
      if (cell) {
        state.ghostPos = cell;
        if (!dragState.lastCell || cell.tx !== dragState.lastCell.tx || cell.ty !== dragState.lastCell.ty) {
          if (hooks.onConveyorDragStep) hooks.onConveyorDragStep(cell, dragState.lastCell);
          dragState.lastCell = cell;
        }
      }
    } else if (dragState.mode === 'demolish') {
      const cell = screenToCell(e.clientX, e.clientY);
      if (cell && (!dragState.lastCell || cell.tx !== dragState.lastCell.tx || cell.ty !== dragState.lastCell.ty)) {
        if (hooks.onDemolishDrag) hooks.onDemolishDrag(cell);
        dragState.lastCell = cell;
      }
    }
  } else if (pointers.size === 2 && pinchState) {
    const dist = pinchDist(), mid = pinchMid();
    const newZoom = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, pinchState.startZoom * (dist / pinchState.startDist)));
    const wx = (pinchState.startMidX - canvas.width / 2) / pinchState.startZoom + pinchState.startCamX;
    const wy = (pinchState.startMidY - canvas.height / 2) / pinchState.startZoom + pinchState.startCamY;
    camera.zoom = newZoom;
    camera.x = wx - (mid.x - canvas.width / 2) / newZoom;
    camera.y = wy - (mid.y - canvas.height / 2) / newZoom;
    clampCamera();
  }
});

function endPointer(e) {
  if (!pointers.has(e.pointerId)) return;
  pointers.delete(e.pointerId);
  if (pointers.size === 0) {
    if (dragState && dragState.mode === 'demolish') {
      if (!dragState.lastCell) {
        const cell = screenToCell(e.clientX, e.clientY);
        if (cell && hooks.onDemolishDrag) hooks.onDemolishDrag(cell);
      }
      dragState = null;
      pinchState = null;
      return;
    }
    if (dragState && dragState.mode === 'camera' && dragState.moved < 10) {
      if (hooks.onTap) hooks.onTap(e.clientX, e.clientY);
    }
    dragState = null;
    pinchState = null;
  } else if (pointers.size === 1) {
    const [p] = [...pointers.values()];
    if (state.selectedBuilding) {
      const cell = screenToCell(p.x, p.y);
      if (cell) state.ghostPos = cell;
      dragState = { mode: 'ghost', startX: p.x, startY: p.y, moved: 100 };
      if (state.selectedBuilding === 'conveyor' || state.selectedBuilding === 'underground') dragState = { mode: 'conveyor-drag', startX: p.x, startY: p.y, moved: 100, lastCell: cell };
    } else if (state.demolishMode) {
      dragState = { mode: 'demolish', startX: p.x, startY: p.y, moved: 100, lastCell: null };
    } else {
      dragState = { mode: 'camera', startX: p.x, startY: p.y, camX: camera.x, camY: camera.y, moved: 100 };
    }
    pinchState = null;
  }
}
canvas.addEventListener('pointerup', endPointer);
canvas.addEventListener('pointercancel', endPointer);

canvas.addEventListener('wheel', e => {
  e.preventDefault();
  const factor = e.deltaY > 0 ? 0.9 : 1.1;
  const newZoom = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, camera.zoom * factor));
  const wx = (e.clientX - canvas.width / 2) / camera.zoom + camera.x;
  const wy = (e.clientY - canvas.height / 2) / camera.zoom + camera.y;
  camera.zoom = newZoom;
  camera.x = wx - (e.clientX - canvas.width / 2) / newZoom;
  camera.y = wy - (e.clientY - canvas.height / 2) / newZoom;
  clampCamera();
}, { passive: false });

export function drawBackground(world, oreAmount, oreInitial, getBuildingAt, drawResIcon, variantForTile) {
  const left = camera.x - canvas.width / (2 * camera.zoom);
  const right = camera.x + canvas.width / (2 * camera.zoom);
  const top = camera.y - canvas.height / (2 * camera.zoom);
  const bottom = camera.y + canvas.height / (2 * camera.zoom);
  const tx0 = Math.max(0, Math.floor(left / TILE));
  const tx1 = Math.min(WORLD_W - 1, Math.floor(right / TILE));
  const ty0 = Math.max(0, Math.floor(top / TILE));
  const ty1 = Math.min(WORLD_H - 1, Math.floor(bottom / TILE));

  for (let ty = ty0; ty <= ty1; ty++) {
    for (let tx = tx0; tx <= tx1; tx++) {
      const sx = tx * TILE, sy = ty * TILE;
      ctx.fillStyle = ((tx + ty) & 1) ? '#4a5a3a' : '#475738';
      ctx.fillRect(sx, sy, TILE, TILE);

      const r = world[ty][tx];
      if (r > 0) {
        const hasBuilding = getBuildingAt && getBuildingAt(tx, ty);
        if (hasBuilding) continue;
        const amount = oreAmount[ty][tx], initial = oreInitial[ty][tx];
        let alpha = 1;
        if (amount <= 0) alpha = 0.15;
        else if (initial !== Infinity && initial > 0) alpha = 0.4 + 0.6 * (amount / initial);
        ctx.globalAlpha = alpha;
        const v = variantForTile(tx, ty) % 3;
        drawResIcon(r, sx, sy, TILE, v);
        ctx.globalAlpha = 1;
      }
    }
  }

  if (camera.zoom >= 0.9) {
    ctx.strokeStyle = 'rgba(0,0,0,0.08)';
    ctx.lineWidth = 1 / camera.zoom;
    ctx.beginPath();
    for (let tx = tx0; tx <= tx1 + 1; tx++) { ctx.moveTo(tx * TILE, ty0 * TILE); ctx.lineTo(tx * TILE, (ty1 + 1) * TILE); }
    for (let ty = ty0; ty <= ty1 + 1; ty++) { ctx.moveTo(tx0 * TILE, ty * TILE); ctx.lineTo((tx1 + 1) * TILE, ty * TILE); }
    ctx.stroke();
  }
}

export function drawGhost(type, tx, ty, canPlace) {
  const sx = tx * TILE, sy = ty * TILE;
  
  if (type === 'splitter') {
    const dir = state.newConveyorDir;
    const isH = dir === 0 || dir === 2; 
    const w = isH ? TILE * 2 : TILE;
    const h = isH ? TILE : TILE * 2;
    
    ctx.fillStyle = canPlace ? 'rgba(120, 200, 120, 0.45)' : 'rgba(220, 80, 80, 0.45)';
    ctx.fillRect(sx, sy, w, h);
    ctx.strokeStyle = canPlace ? '#9fe09f' : '#e07070';
    ctx.lineWidth = 2 / camera.zoom;
    ctx.strokeRect(sx + 1.5, sy + 1.5, w - 3, h - 3);
    
    ctx.strokeStyle = canPlace ? '#fff' : '#ffb0b0';
    ctx.lineWidth = 3 / camera.zoom;
    const cx = sx + (isH ? TILE : TILE/2);
    const cy = sy + (isH ? TILE/2 : TILE);
    const [dx, dy] = DIR_DELTA[dir];
    
    ctx.beginPath(); ctx.moveTo(cx - dx * TILE/2, cy - dy * TILE/2); ctx.lineTo(cx, cy); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(cx, cy);
    if (isH) ctx.lineTo(cx + dx * TILE/2, cy - TILE/2); else ctx.lineTo(cx - TILE/2, cy + dy * TILE/2); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(cx, cy);
    if (isH) ctx.lineTo(cx + dx * TILE/2, cy + TILE/2); else ctx.lineTo(cx + TILE/2, cy + dy * TILE/2); ctx.stroke();
  } else {
    ctx.fillStyle = canPlace ? 'rgba(120, 200, 120, 0.45)' : 'rgba(220, 80, 80, 0.45)';
    ctx.fillRect(sx, sy, TILE, TILE);
    ctx.strokeStyle = canPlace ? '#9fe09f' : '#e07070';
    ctx.lineWidth = 2 / camera.zoom;
    ctx.strokeRect(sx + 1.5, sy + 1.5, TILE - 3, TILE - 3);
    const icon = { mine: '⛏', furnace: '🔥', lab: '🧪', cutter: '✂️', assembler: '⚙️', chemplant: '🧪', storage: '📦', turret: '🎯', conveyor: '↔️', underground: '⬇️', splitter: '↔️', radar: '📡', inserter: '🦾', minicore: '💠' }[type] || '?';
    ctx.font = 'bold 18px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillStyle = canPlace ? '#ffffff' : '#ffb0b0';
    ctx.fillText(icon, sx + TILE / 2, sy + TILE / 2);
  }
}

export function drawCore(CORE, CORE_HP_MAX, drawCoreSprite) {
  const coreLeft = CORE.x * TILE - TILE, coreTop = CORE.y * TILE - TILE, coreSize = TILE * 3;
  ctx.fillStyle = 'rgba(0,0,0,0.3)';
  ctx.beginPath(); ctx.ellipse(coreLeft + coreSize / 2, coreTop + coreSize - 6, coreSize * 0.42, coreSize * 0.13, 0, 0, Math.PI * 2); ctx.fill();
  const coreHasSprite = typeof drawCoreSprite === 'function' && drawCoreSprite(coreLeft, coreTop, coreSize);
  if (!coreHasSprite) {
    ctx.fillStyle = '#1e2a40'; ctx.fillRect(coreLeft, coreTop, coreSize, coreSize);
    ctx.fillStyle = '#3a5a8a'; ctx.fillRect(coreLeft + 4, coreTop + 4, coreSize - 8, coreSize - 8);
    const glow = 0.5 + 0.5 * Math.sin(performance.now() / 600);
    ctx.fillStyle = `rgba(120,200,255,${0.5 + glow * 0.4})`; ctx.fillRect(coreLeft + TILE + 4, coreTop + TILE + 4, TILE - 8, TILE - 8);
    ctx.fillStyle = '#e0f0ff'; ctx.fillRect(coreLeft + TILE + 10, coreTop + TILE + 10, TILE - 20, TILE - 20);
  }
  ctx.fillStyle = 'rgba(0,0,0,0.65)'; ctx.fillRect(coreLeft, coreTop - 20, coreSize, 16);
  ctx.fillStyle = '#5ac05a'; ctx.fillRect(coreLeft + 2, coreTop - 18, (coreSize - 4) * (state.coreHP / CORE_HP_MAX), 12);
  ctx.fillStyle = '#fff'; ctx.font = 'bold 10px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText(`${state.coreHP} / ${CORE_HP_MAX}`, coreLeft + coreSize / 2, coreTop - 12);
}

export function drawPopups() {
  const zoomInv = 1 / camera.zoom;
  for (const p of popups) {
    const a = Math.min(1, p.life / p.maxLife * 1.5);
    ctx.globalAlpha = a; ctx.font = `bold ${12 * zoomInv}px sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.strokeStyle = 'rgba(0,0,0,0.8)'; ctx.lineWidth = 3 * zoomInv;
    ctx.strokeText(p.text, p.x, p.y); ctx.fillStyle = p.color; ctx.fillText(p.text, p.x, p.y);
    ctx.globalAlpha = 1;
  }
}

const MINIMAP_SIZE = 100, MINIMAP_MARGIN = 12;
export function getMinimapRect() { return { x: canvas.width - MINIMAP_SIZE - MINIMAP_MARGIN, y: 46 + MINIMAP_MARGIN, w: MINIMAP_SIZE, h: MINIMAP_SIZE }; }

export function drawMinimap(CORE, buildings, conveyors, monsters, splitters, undergrounds) {
  const rect = getMinimapRect(); const scale = MINIMAP_SIZE / (WORLD_W * TILE);
  ctx.fillStyle = 'rgba(15,25,15,0.85)'; ctx.fillRect(rect.x, rect.y, rect.w, rect.h);
  ctx.strokeStyle = 'rgba(120,160,120,0.7)'; ctx.lineWidth = 2; ctx.strokeRect(rect.x, rect.y, rect.w, rect.h);
  
  const fog = window.__fog || [];

  ctx.fillStyle = 'rgba(180,160,90,0.7)';
  for (const c of conveyors) {
    if (fog[c.ty] && fog[c.ty][c.tx] === 0) ctx.fillRect(rect.x + c.tx * TILE * scale, rect.y + c.ty * TILE * scale, 1, 1);
  }
  if (splitters) {
    for (const s of splitters) {
      if (fog[s.ty] && fog[s.ty][s.tx] === 0) ctx.fillRect(rect.x + s.tx * TILE * scale, rect.y + s.ty * TILE * scale, 2, 1);
    }
  }
  if (undergrounds) {
    ctx.fillStyle = '#a060c0';
    for (const u of undergrounds) {
      if (fog[u.ty] && fog[u.ty][u.tx] === 0) ctx.fillRect(rect.x + u.tx * TILE * scale, rect.y + u.ty * TILE * scale, 1, 1);
    }
  }
  
  ctx.fillStyle = '#e0e0e0';
  for (const b of buildings) {
    if (fog[b.ty] && fog[b.ty][b.tx] === 0) ctx.fillRect(rect.x + b.tx * TILE * scale - 1, rect.y + b.ty * TILE * scale - 1, 3, 3);
  }
  
  ctx.fillStyle = '#4a8aff';
  const coreMinX = rect.x + (CORE.x - 1) * TILE * scale, coreMinY = rect.y + (CORE.y - 1) * TILE * scale;
  ctx.fillRect(coreMinX, coreMinY, 3 * TILE * scale, 3 * TILE * scale);
  
  if (monsters && monsters.length > 0) {
    ctx.fillStyle = '#ff3030';
    for (const m of monsters) {
      const mtx = Math.floor(m.x / TILE);
      const mty = Math.floor(m.y / TILE);
      if (fog[mty] && fog[mty][mtx] === 0) {
        ctx.fillRect(rect.x + m.x * scale - 1, rect.y + m.y * scale - 1, 2, 2);
      }
    }
  }
  const camWorldX = camera.x - canvas.width / (2 * camera.zoom), camWorldY = camera.y - canvas.height / (2 * camera.zoom);
  const camWorldW = canvas.width / camera.zoom, camWorldH = canvas.height / camera.zoom;
  ctx.strokeStyle = 'rgba(255,220,60,0.9)'; ctx.lineWidth = 1;
  ctx.strokeRect(rect.x + camWorldX * scale, rect.y + camWorldY * scale, camWorldW * scale, camWorldH * scale);
}

export function handleMinimapClick(sx, sy) {
  const rect = getMinimapRect();
  if (sx < rect.x || sx > rect.x + rect.w || sy < rect.y || sy > rect.y + rect.h) return false;
  const scale = (WORLD_W * TILE) / MINIMAP_SIZE;
  camera.x = (sx - rect.x) * scale; camera.y = (sy - rect.y) * scale;
  clampCamera();
  return true;
}

const toastEl = document.getElementById('toast');
let toastTimer;
export function showToast(msg) {
  if (!toastEl) return;
  toastEl.textContent = msg; toastEl.classList.add('show');
  clearTimeout(toastTimer); toastTimer = setTimeout(() => toastEl.classList.remove('show'), 1800);
}
console.debug('[game] loaded');