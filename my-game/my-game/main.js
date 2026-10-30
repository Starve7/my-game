'use strict';

import {
  TILE, RES, RES_COLOR, RES_NAME, DAY_LENGTH, MINE_INTERVAL, FURNACE_INTERVAL, MINE_COST, FURNACE_COST, POLLUTION_PER_PLATE,
  canvas, ctx, camera, inventory, state, popups, hooks, drawBackground, drawGhost, drawCore, drawPopups,
  drawMinimap, handleMinimapClick, updatePopups, safeCall, screenToCell, showToast, STAT_WINDOW_SEC,
  WORLD_W, WORLD_H, drawRangeCircle // <--- ДОБАВЛЕНО
} from './game.js';
import { CORE, CORE_HP_MAX, world, oreAmount, oreInitial, fog } from './world.js';
import { drawResIcon, drawCoreSprite } from './sprites.js';
import {
  buildings, conveyors, splitters, undergrounds, turretBeams, tryPlaceBuilding, tryConveyorDragStep,
  updateConveyors, updateBuildings, drawConveyors, drawBuildings, canPlaceGhost,
  getBuildingAt, getConveyorAt, getSplitterAt, getUndergroundAt, demolishAt, TURRET_RANGE_BASE // <--- ДОБАВЛЕНО
} from './buildings.js';
import { updateStudy, TECHNOLOGIES } from './research.js';
import { updateHUD, openInfoPanel, openConveyorPanel, closePanel, showGameOver, updateModeBadge, showInfoCard, hideInfoCard } from './ui.js';
import { monsters, nests, updateMonsters, drawMonsters, drawMonstersHUD, handleMonsterDeath, drawNestsAndInfection } from './monsters.js';
import { initAudio, playGameOver } from './audio.js';
import { showMainMenu } from './menu.js';

if (typeof window !== 'undefined') {
  window.__showGameOver = showGameOver;
  window.__showToast = showToast;
  window.__handleMonsterDeath = handleMonsterDeath;
  window.__fog = fog;

  window.cheat = (amount = 1000) => { for (let i = 1; i <= 12; i++) inventory[i] += amount; showToast(`💰 +${amount} всех ресурсов`); };
  window.cheatDna = (amount = 1000) => { state.dna += amount; showToast(`🧬 +${amount} ДНК`); };
  window.cheatUnlockAll = () => { for (const t of TECHNOLOGIES) { state.techState[t.id] = true; if (t.effect) t.effect(); } showToast('🔓 Все технологии изучены'); };
  window.cheatKill = () => { if (window.__monsters) window.__monsters.length = 0; showToast('💀 Все монстры убиты'); };
  window.cheatClear = () => { for (let i = 1; i <= 12; i++) inventory[i] = 0; state.dna = 0; showToast('🧹 Инвентарь и ДНК очищены'); };
  window.cheatReveal = () => { for (let y = 0; y < WORLD_H; y++) for (let x = 0; x < WORLD_W; x++) fog[y][x] = 0; showToast('🗺 Карта открыта'); };
  window.cheatPollution = (amount = 100) => { state.pollution = amount; showToast(`☣ Загрязнение установлено на ${amount}%`); };
}

function updateTime(dt) {
  state.timeOfDay += dt / DAY_LENGTH;
  if (state.timeOfDay >= 1) { state.timeOfDay -= 1; state.day++; }
}

function drawAtmosphere() {
  let darkness = 0;
  if (state.timeOfDay < 0.2) darkness = 0.2;
  else if (state.timeOfDay < 0.3) darkness = 0.2 * (1 - (state.timeOfDay - 0.2) / 0.1);
  else if (state.timeOfDay < 0.7) darkness = 0;
  else if (state.timeOfDay < 0.8) darkness = 0.2 * ((state.timeOfDay - 0.7) / 0.1);
  else darkness = 0.2;
  const pTint = Math.min(0.12, state.pollution / 8000);
  if (darkness > 0 || pTint > 0) {
    const r = Math.floor(10 + pTint * 90), g = Math.floor(10 + pTint * 20), b = Math.floor(30 + darkness * 20);
    ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${Math.max(darkness, pTint)})`;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }
}

function handleTap(sx, sy) {
  initAudio();
  if (state.gameOver) return;
  if (state.panel) { closePanel(); return; }
  if (handleMinimapClick(sx, sy)) return;
  const cell = screenToCell(sx, sy);
  if (!cell) { hideInfoCard(); return; }
  const { tx, ty } = cell;
  
  if (fog[ty] && fog[ty][tx] === 1) return;

  const existingB = buildings.find(b => b.tx === tx && b.ty === ty);
  if (existingB) {
    state.selectedBuilding = null; state.ghostPos = null; updateModeBadge();
    showInfoCard(existingB); return;
  }
  const existingC = conveyors.find(c => c.tx === tx && c.ty === ty);
  if (existingC) {
    state.selectedBuilding = null; state.ghostPos = null; updateModeBadge();
    showInfoCard(existingC); return;
  }
  const existingS = getSplitterAt(tx, ty);
  if (existingS) {
    state.selectedBuilding = null; state.ghostPos = null; updateModeBadge();
    showInfoCard(existingS); return;
  }
  const existingU = getUndergroundAt(tx, ty);
  if (existingU) {
    state.selectedBuilding = null; state.ghostPos = null; updateModeBadge();
    showInfoCard(existingU); return;
  }
  
  if (Math.abs(tx - CORE.x) <= 1 && Math.abs(ty - CORE.y) <= 1) { showInfoCard({ type: 'core' }); return; }
  const worldX = tx * TILE + TILE / 2, worldY = ty * TILE + TILE / 2;
  const monster = monsters.find(m => Math.hypot(m.x - worldX, m.y - worldY) < 20);
  if (monster) { monster.isMonster = true; showInfoCard(monster); return; }
  
  const nest = nests.find(n => n.hp > 0 && n.tx === tx && n.ty === ty);
  if (nest) {
    showInfoCard({ isNest: true, ...nest });
    return;
  }
  
  hideInfoCard();
}

hooks.onTap = handleTap;
hooks.onConveyorDragStep = tryConveyorDragStep;
hooks.onDemolishDrag = (cell) => demolishAt(cell.tx, cell.ty);

function recordStatHistory() {
  const now = performance.now() / 1000;
  const keys = ['iron','copper','coal','plate_iron','plate_copper','wire','gear','corps','circuit','engine','powder','ammo','dna'];
  const values = {
    iron: inventory[RES.IRON], copper: inventory[RES.COPPER], coal: inventory[RES.COAL],
    plate_iron: inventory[RES.PLATE_IRON], plate_copper: inventory[RES.PLATE_COPPER],
    wire: inventory[RES.WIRE], gear: inventory[RES.GEAR], corps: inventory[RES.CORPS],
    circuit: inventory[RES.CIRCUIT], engine: inventory[RES.ENGINE], powder: inventory[RES.POWDER],
    ammo: inventory[RES.AMMO], dna: state.dna,
  };
  for (const k of keys) {
    if (!state.statHistory[k]) state.statHistory[k] = [];
    state.statHistory[k].push({ t: now, v: values[k] });
    while (state.statHistory[k].length > 0 && state.statHistory[k][0].t < now - STAT_WINDOW_SEC) state.statHistory[k].shift();
  }
}

setInterval(recordStatHistory, 1000);
recordStatHistory();

function update(dt) {
  safeCall(updateTime, 'updateTime', dt);
  safeCall(updateConveyors, 'updateConveyors', dt);
  safeCall(updateBuildings, 'updateBuildings', dt);
  safeCall(updateStudy, 'updateStudy', dt);
  safeCall(updatePopups, 'updatePopups', dt);
}

function draw() {
  ctx.fillStyle = '#2a2a2a'; ctx.fillRect(0, 0, canvas.width, canvas.height);
  
  ctx.save();
  ctx.translate(canvas.width / 2, canvas.height / 2);
  ctx.scale(camera.zoom, camera.zoom);
  ctx.translate(-camera.x, -camera.y);
  ctx.imageSmoothingEnabled = false;

  drawBackground(world, oreAmount, oreInitial, getBuildingAt, drawResIcon, (tx,ty) => (tx*73856093 ^ ty*19349663)>>>0);

  safeCall(drawNestsAndInfection, 'drawNestsAndInfection');

  if (state.selectedBuilding && state.ghostPos) {
    const canPlace = canPlaceGhost(state.selectedBuilding, state.ghostPos.tx, state.ghostPos.ty);
    drawGhost(state.selectedBuilding, state.ghostPos.tx, state.ghostPos.ty, canPlace);
  }

  safeCall(drawConveyors, 'drawConveyors');
  safeCall(drawBuildings, 'drawBuildings');
  drawCore(CORE, CORE_HP_MAX, drawCoreSprite);
  safeCall(drawMonsters, 'drawMonsters');
  
  // === РИСУЕМ РАДИУСЫ СТРЕЛЬБЫ ===
  if (state.selectedBuilding === 'turret' && state.ghostPos) {
    const { tx, ty } = state.ghostPos;
    const range = TURRET_RANGE_BASE + state.turretRangeBonus * TILE;
    drawRangeCircle(tx * TILE + TILE/2, ty * TILE + TILE/2, range, true);
  } else if (state.selectedInfoCard) {
    if (state.selectedInfoCard.type === 'turret') {
      const b = state.selectedInfoCard;
      const range = TURRET_RANGE_BASE + state.turretRangeBonus * TILE;
      drawRangeCircle(b.tx * TILE + TILE/2, b.ty * TILE + TILE/2, range, false);
    } else if (state.selectedInfoCard.type === 'core') {
      drawRangeCircle(CORE.x * TILE + TILE*1.5, CORE.y * TILE + TILE*1.5, TILE * 6, false);
    }
  }
  // ================================

  drawPopups();

  // === РИСУЕМ ТУМАН ===
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
      if (fog[ty][tx] === 1) {
        const noise = ((tx * 73856093) ^ (ty * 19349663)) % 12 / 100; 
        ctx.fillStyle = `rgba(8, 10, 14, ${0.88 + noise})`; 
        ctx.fillRect(tx * TILE, ty * TILE, TILE, TILE);
      }
    }
  }

  ctx.restore();

  drawAtmosphere();
  drawMinimap(CORE, buildings, conveyors, monsters, splitters, undergrounds);
  safeCall(drawMonstersHUD, 'drawMonstersHUD');
}

let lastTime = performance.now();
function loop(now) {
  const dt = Math.min(0.1, (now - lastTime) / 1000);
  lastTime = now;
  if (!state.inMenu) {
    safeCall(update, 'update', dt);
    safeCall(updateHUD, 'updateHUD');
    safeCall(updateMonsters, 'updateMonsters', dt);
    safeCall(draw, 'draw');
  }
  requestAnimationFrame(loop);
}
requestAnimationFrame(loop);
showMainMenu();

setInterval(() => {
  if (state.gameOver && state.soundEnabled) { state.soundEnabled = false; playGameOver(); }
}, 500);
console.debug('[main] started');