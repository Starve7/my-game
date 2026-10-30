'use strict';

export * from './buildings/index.js';

import { inventory, state, showToast, TILE, WORLD_W, WORLD_H, RES, ctx } from './game.js';
import { world, oreAmount, oreInitial, CORE, fog } from './world.js';
import { playBuildSound } from './audio.js';
import { drawShadow, drawBuildingSprite } from './sprites.js';

import { 
  buildings, conveyors, splitters, undergrounds, turretBeams,
  MINE_COST, FURNACE_COST, CONVEYOR_COST, SPLITTER_COST, UNDERGROUND_COST, RADAR_COST, INSERTER_COST,
  LAB_IRON_COST, LAB_COPPER_COST, CUTTER_IRON_COST, CUTTER_COPPER_COST, ASSEMBLER_IRON_COST, ASSEMBLER_COPPER_COST,
  CHEMPLANT_IRON_COST, CHEMPLANT_COPPER_COST, CHEMPLANT_WIRE_COST, STORAGE_IRON_COST, STORAGE_COPPER_COST,
  TURRET_CORPS_COST, TURRET_ENGINE_COST, TURRET_CIRCUIT_COST, BUILDING_HP, DIR_DELTA
} from './buildings/index.js';

import { 
  getBuildingAt, getConveyorAt, getSplitterAt, getUndergroundAt, 
  checkLimit, updateFog, drawArrow, drawBrokenOverlay, drawHpCircle 
} from './buildings/index.js';

import { Mine, Furnace, Lab, Cutter, Assembler, Chemplant, Storage, MiniCore } from './buildings/index.js';
import { Inserter, updateConveyors, drawConveyors } from './buildings/index.js';
import { Turret, Radar } from './buildings/index.js';

export function tryPlaceBuilding(type, tx, ty, isUnlockedFn) {
  if (fog[ty] && fog[ty][tx] === 1) { showToast('Нельзя строить в тумане'); return false; }
  if (isUnlockedFn && !isUnlockedFn(type)) { showToast('Здание не изучено'); return false; }
  
  // ПРОВЕРКА НА ЗАНЯТОСТЬ КЛЕТКИ (БАГ 1)
  if (getBuildingAt(tx, ty) || getConveyorAt(tx, ty) || getSplitterAt(tx, ty) || getUndergroundAt(tx, ty)) { 
    showToast('Место занято'); 
    return false; 
  }

  const nearCore = Math.abs(tx - CORE.x) <= 2 && Math.abs(ty - CORE.y) <= 2;
  const onCore = Math.abs(tx - CORE.x) <= 1 && Math.abs(ty - CORE.y) <= 1;
  if (type === 'conveyor' || type === 'underground' || type === 'splitter') { if (onCore) { showToast('На ядро нельзя'); return false; } } 
  else if (nearCore) { showToast('Слишком близко к ядру'); return false; }

  let newBuilding = null;

  if (type === 'mine') {
    if (!checkLimit('mine')) { showToast(`Лимит шахт`); return false; }
    const res = world[ty][tx];
    if (res === 0) { if (oreInitial[ty][tx] > 0) showToast('Эта жила истощена'); else showToast('Шахта — только на месторождение'); return false; }
    if (oreAmount[ty][tx] <= 0) { showToast('Эта жила истощена'); return false; }
    if (inventory[RES.IRON] < MINE_COST) { showToast('Не хватает железа'); return false; }
    inventory[RES.IRON] -= MINE_COST; newBuilding = new Mine(tx, ty, res);
  } else if (type === 'furnace') {
    if (!checkLimit('furnace')) { showToast(`Лимит печей`); return false; }
    if (world[ty][tx] !== 0) { showToast('Только на пустую землю'); return false; }
    if (inventory[RES.IRON] < FURNACE_COST) { showToast('Не хватает железа'); return false; }
    inventory[RES.IRON] -= FURNACE_COST; newBuilding = new Furnace(tx, ty);
  } else if (type === 'lab') {
    if (!checkLimit('lab')) { showToast(`Лимит лабораторий`); return false; }
    if (world[ty][tx] !== 0) { showToast('Только на пустую землю'); return false; }
    if (inventory[RES.PLATE_IRON] < LAB_IRON_COST || inventory[RES.PLATE_COPPER] < LAB_COPPER_COST) { showToast('Не хватает плит'); return false; }
    inventory[RES.PLATE_IRON] -= LAB_IRON_COST; inventory[RES.PLATE_COPPER] -= LAB_COPPER_COST; newBuilding = new Lab(tx, ty);
  } else if (type === 'cutter') {
    if (!checkLimit('cutter')) { showToast(`Лимит резаков`); return false; }
    if (world[ty][tx] !== 0) { showToast('Только на пустую землю'); return false; }
    if (inventory[RES.PLATE_IRON] < CUTTER_IRON_COST || inventory[RES.PLATE_COPPER] < CUTTER_COPPER_COST) { showToast('Не хватает плит'); return false; }
    inventory[RES.PLATE_IRON] -= CUTTER_IRON_COST; inventory[RES.PLATE_COPPER] -= CUTTER_COPPER_COST; newBuilding = new Cutter(tx, ty);
  } else if (type === 'assembler') {
    if (!checkLimit('assembler')) { showToast(`Лимит сборщиков`); return false; }
    if (world[ty][tx] !== 0) { showToast('Только на пустую землю'); return false; }
    if (inventory[RES.PLATE_IRON] < ASSEMBLER_IRON_COST || inventory[RES.PLATE_COPPER] < ASSEMBLER_COPPER_COST) { showToast('Не хватает плит'); return false; }
    inventory[RES.PLATE_IRON] -= ASSEMBLER_IRON_COST; inventory[RES.PLATE_COPPER] -= ASSEMBLER_COPPER_COST; newBuilding = new Assembler(tx, ty);
  } else if (type === 'chemplant') {
    if (!checkLimit('chemplant')) { showToast(`Лимит химзаводов`); return false; }
    if (world[ty][tx] !== 0) { showToast('Только на пустую землю'); return false; }
    if (inventory[RES.PLATE_IRON] < CHEMPLANT_IRON_COST || inventory[RES.PLATE_COPPER] < CHEMPLANT_COPPER_COST || inventory[RES.WIRE] < CHEMPLANT_WIRE_COST) { showToast('Не хватает ресурсов'); return false; }
    inventory[RES.PLATE_IRON] -= CHEMPLANT_IRON_COST; inventory[RES.PLATE_COPPER] -= CHEMPLANT_COPPER_COST; inventory[RES.WIRE] -= CHEMPLANT_WIRE_COST; newBuilding = new Chemplant(tx, ty);
  } else if (type === 'storage') {
    if (!checkLimit('storage')) { showToast(`Лимит складов`); return false; }
    if (world[ty][tx] !== 0) { showToast('Только на пустую землю'); return false; }
    if (inventory[RES.PLATE_IRON] < STORAGE_IRON_COST || inventory[RES.PLATE_COPPER] < STORAGE_COPPER_COST) { showToast('Не хватает плит'); return false; }
    inventory[RES.PLATE_IRON] -= STORAGE_IRON_COST; inventory[RES.PLATE_COPPER] -= STORAGE_COPPER_COST; newBuilding = new Storage(tx, ty);
  } else if (type === 'turret') {
    if (!checkLimit('turret')) { showToast(`Лимит турелей`); return false; }
    if (world[ty][tx] !== 0) { showToast('Только на пустую землю'); return false; }
    if (inventory[RES.CORPS] < TURRET_CORPS_COST || inventory[RES.ENGINE] < TURRET_ENGINE_COST || inventory[RES.CIRCUIT] < TURRET_CIRCUIT_COST) { showToast('Не хватает деталей'); return false; }
    inventory[RES.CORPS] -= TURRET_CORPS_COST; inventory[RES.ENGINE] -= TURRET_ENGINE_COST; inventory[RES.CIRCUIT] -= TURRET_CIRCUIT_COST; newBuilding = new Turret(tx, ty);
  } else if (type === 'radar') {
    if (!checkLimit('radar')) { showToast(`Лимит радаров`); return false; }
    if (world[ty][tx] !== 0) { showToast('Только на пустую землю'); return false; }
    if (inventory[RES.CIRCUIT] < RADAR_COST.circuit || inventory[RES.CORPS] < RADAR_COST.corps || inventory[RES.PLATE_IRON] < RADAR_COST.plate_iron) { showToast('Не хватает деталей'); return false; }
    inventory[RES.CIRCUIT] -= RADAR_COST.circuit; inventory[RES.CORPS] -= RADAR_COST.corps; inventory[RES.PLATE_IRON] -= RADAR_COST.plate_iron;
    newBuilding = new Radar(tx, ty);
  } else if (type === 'inserter') {
    if (!checkLimit('inserter')) { showToast(`Лимит манипуляторов`); return false; }
    if (world[ty][tx] !== 0) { showToast('Только на пустую землю'); return false; }
    if (inventory[RES.IRON] < INSERTER_COST.iron || inventory[RES.GEAR] < INSERTER_COST.gear || inventory[RES.PLATE_IRON] < INSERTER_COST.plate_iron) { showToast('Не хватает деталей'); return false; }
    inventory[RES.IRON] -= INSERTER_COST.iron; inventory[RES.GEAR] -= INSERTER_COST.gear; inventory[RES.PLATE_IRON] -= INSERTER_COST.plate_iron;
    newBuilding = new Inserter(tx, ty);
  } else if (type === 'minicore') {
    if (world[ty][tx] !== 0) { showToast('Только на пустую землю'); return false; }
    if (inventory[RES.IRON] < 100) { showToast('Не хватает железа'); return false; }
    inventory[RES.IRON] -= 100; newBuilding = new MiniCore(tx, ty);
  } else if (type === 'conveyor') {
    if (inventory[RES.IRON] < CONVEYOR_COST) { showToast('Не хватает железа'); return false; }
    inventory[RES.IRON] -= CONVEYOR_COST;
    conveyors.push({ type: 'conveyor', tx, ty, dir: state.newConveyorDir, items: [], paidCost: CONVEYOR_COST, hp: BUILDING_HP.conveyor, maxHp: BUILDING_HP.conveyor, isBroken: false });
    playBuildSound(); return true;
  } else if (type === 'underground') {
    if (inventory[RES.IRON] < UNDERGROUND_COST.iron) { showToast('Не хватает железа'); return false; }
    inventory[RES.IRON] -= UNDERGROUND_COST.iron;
    const dir = state.newConveyorDir;
    const [dx, dy] = DIR_DELTA[dir];
    let partner = null, isEntrance = true;

    for (let i = 1; i <= 4; i++) {
      const nx = tx + dx * i, ny = ty + dy * i;
      const found = getUndergroundAt(nx, ny);
      if (found && found.dir === (dir + 2) % 4 && !found.partner) { partner = found; isEntrance = true; break; }
    }
    if (!partner) {
      for (let i = 1; i <= 4; i++) {
        const nx = tx - dx * i, ny = ty - dy * i;
        const found = getUndergroundAt(nx, ny);
        if (found && found.dir === dir && !found.partner) { partner = found; isEntrance = false; break; }
      }
    }

    const u = { type: 'underground', tx, ty, dir, items: [], paidCost: UNDERGROUND_COST.iron, hp: BUILDING_HP.underground, maxHp: BUILDING_HP.underground, isBroken: false, isEntrance, partner };
    if (partner) partner.partner = u;
    undergrounds.push(u);
    playBuildSound(); return true;
  } else if (type === 'splitter') {
    const dir = state.newConveyorDir;
    const isH = dir === 0 || dir === 2; 
    
    const tx2 = isH ? tx + 1 : tx;
    const ty2 = isH ? ty : ty + 1;
    
    if (tx2 < 0 || tx2 >= WORLD_W || ty2 < 0 || ty2 >= WORLD_H) { showToast('Не влезает'); return false; }
    if (fog[ty2] && fog[ty2][tx2] === 1) { showToast('Вторая клетка в тумане'); return false; }

    if (getBuildingAt(tx2, ty2) || getConveyorAt(tx2, ty2) || getSplitterAt(tx2, ty2) || getUndergroundAt(tx2, ty2)) { showToast('Второй тайл занят'); return false; }
    
    if (inventory[RES.IRON] < SPLITTER_COST.iron || inventory[RES.PLATE_IRON] < SPLITTER_COST.plate_iron) { showToast('Не хватает ресурсов'); return false; }
    inventory[RES.IRON] -= SPLITTER_COST.iron; inventory[RES.PLATE_IRON] -= SPLITTER_COST.plate_iron;
    
    splitters.push({ type: 'splitter', tx, ty, dir, items: [], filterLeft: null, filterRight: null, paidCost: SPLITTER_COST, hp: BUILDING_HP.splitter, maxHp: BUILDING_HP.splitter, isBroken: false, lastOut: 1 });
    playBuildSound(); return true;
  }

  if (newBuilding) { buildings.push(newBuilding); playBuildSound(); updateFog(); return true; }
  return false;
}

export function canPlaceGhost(type, tx, ty) {
  if (fog[ty] && fog[ty][tx] === 1) return false;
  if (tx < 0 || tx >= WORLD_W || ty < 0 || ty >= WORLD_H) return false;
  if (type === 'conveyor' || type === 'underground' || type === 'splitter') { if (Math.abs(tx - CORE.x) <= 1 && Math.abs(ty - CORE.y) <= 1) return false; }
  else if (Math.abs(tx - CORE.x) <= 2 && Math.abs(ty - CORE.y) <= 2) return false;
  
  if (getBuildingAt(tx, ty) || getConveyorAt(tx, ty) || getSplitterAt(tx, ty) || getUndergroundAt(tx, ty)) return false;
  
  if (type === 'splitter') {
    const dir = state.newConveyorDir;
    const isH = dir === 0 || dir === 2;
    const tx2 = isH ? tx + 1 : tx;
    const ty2 = isH ? ty : ty + 1;
    if (tx2 < 0 || tx2 >= WORLD_W || ty2 < 0 || ty2 >= WORLD_H) return false;
    if (fog[ty2] && fog[ty2][tx2] === 1) return false;
    if (getBuildingAt(tx2, ty2) || getConveyorAt(tx2, ty2) || getSplitterAt(tx2, ty2) || getUndergroundAt(tx2, ty2)) return false;
  }
  
  if (type === 'mine') { if (world[ty][tx] === 0 || oreAmount[ty][tx] <= 0) return false; }
  else if (type !== 'conveyor' && type !== 'underground' && type !== 'splitter') { if (world[ty][tx] !== 0) return false; }
  if (type !== 'conveyor' && type !== 'underground' && type !== 'splitter' && !checkLimit(type)) return false;
  return true;
}

export function demolishAt(tx, ty) {
  const b = getBuildingAt(tx, ty); if (b) { demolishBuilding(b); return true; }
  const c = getConveyorAt(tx, ty); if (c) { demolishConveyor(c); return true; }
  const s = getSplitterAt(tx, ty); if (s) { demolishSplitter(s); return true; }
  const u = getUndergroundAt(tx, ty); if (u) { demolishUnderground(u); return true; }
  return false;
}

export function demolishBuilding(b) {
  const half = (v) => Math.floor(v * 0.5);
  
  if (b.type === 'minicore') {
    // При сносе мини-ядра ресурсы пропадают из инвентаря
    for (const k in b.items) { inventory[k] -= b.items[k]; if (inventory[k] < 0) inventory[k] = 0; }
  }
  else if (b.type === 'mine') { inventory[RES.IRON] += half(b.paidCost); inventory[b.resourceType] += b.outputBuffer; }
  else if (b.type === 'furnace') { inventory[RES.IRON] += half(b.paidCost); if (b.inputOreType) inventory[b.inputOreType] += b.inputOre; inventory[RES.COAL] += b.inputCoal; if (b.outputBufferType) inventory[b.outputBufferType] += b.outputBuffer; }
  else if (b.type === 'lab') { inventory[RES.PLATE_IRON] += half(b.paidCost.ironPlate); inventory[RES.PLATE_COPPER] += half(b.paidCost.copperPlate); }
  else if (b.type === 'cutter') { inventory[RES.PLATE_IRON] += half(b.paidCost.ironPlate); inventory[RES.PLATE_COPPER] += half(b.paidCost.copperPlate); inventory[RES.PLATE_COPPER] += b.inputBuffer; if (b.outputBufferType) inventory[b.outputBufferType] += b.outputBuffer; }
  else if (b.type === 'assembler') { inventory[RES.PLATE_IRON] += half(b.paidCost.ironPlate); inventory[RES.PLATE_COPPER] += half(b.paidCost.copperPlate); for (const r in b.inputBuffer) inventory[r] += b.inputBuffer[r]; if (b.outputBufferType) inventory[b.outputBufferType] += b.outputBuffer; }
  else if (b.type === 'chemplant') { inventory[RES.PLATE_IRON] += half(b.paidCost.ironPlate); inventory[RES.PLATE_COPPER] += half(b.paidCost.copperPlate); inventory[RES.WIRE] += half(b.paidCost.wire); for (const r in b.inputBuffer) inventory[r] += b.inputBuffer[r]; if (b.outputBufferType) inventory[b.outputBufferType] += b.outputBuffer; }
  else if (b.type === 'storage') { inventory[RES.PLATE_IRON] += half(b.paidCost.ironPlate); inventory[RES.PLATE_COPPER] += half(b.paidCost.copperPlate); for (const k in b.items) inventory[k] = (inventory[k] || 0) + b.items[k]; }
  else if (b.type === 'turret') { inventory[RES.CORPS] += half(b.paidCost.corps); inventory[RES.ENGINE] += half(b.paidCost.engine); inventory[RES.CIRCUIT] += half(b.paidCost.circuit); }
  else if (b.type === 'radar') { inventory[RES.CIRCUIT] += half(b.paidCost.circuit); inventory[RES.CORPS] += half(b.paidCost.corps); inventory[RES.PLATE_IRON] += half(b.paidCost.plate_iron); }
  else if (b.type === 'inserter') { inventory[RES.IRON] += half(b.paidCost.iron); inventory[RES.GEAR] += half(b.paidCost.gear); inventory[RES.PLATE_IRON] += half(b.paidCost.plate_iron); }
  
  const idx = buildings.indexOf(b); if (idx !== -1) buildings.splice(idx, 1);
  updateFog();
}

export function demolishConveyor(c) {
  inventory[RES.IRON] += Math.floor(c.paidCost * 0.5);
  for (const it of c.items) inventory[it.type]++;
  const idx = conveyors.indexOf(c); if (idx !== -1) conveyors.splice(idx, 1);
}

export function demolishSplitter(s) {
  inventory[RES.IRON] += Math.floor(SPLITTER_COST.iron * 0.5);
  inventory[RES.PLATE_IRON] += Math.floor(SPLITTER_COST.plate_iron * 0.5);
  for (const it of s.items) inventory[it.type]++;
  const idx = splitters.indexOf(s); if (idx !== -1) splitters.splice(idx, 1);
}

export function demolishUnderground(u) {
  inventory[RES.IRON] += Math.floor(UNDERGROUND_COST.iron * 0.5);
  if (u.partner) { u.partner.partner = null; u.partner = null; }
  for (const it of u.items) inventory[it.type]++;
  const idx = undergrounds.indexOf(u); if (idx !== -1) undergrounds.splice(idx, 1);
}

export function repairBuilding(b) {
  if (!b.isBroken) return false;
  const half = (v) => Math.floor(v * 0.5);
  if (b.type === 'mine' || b.type === 'furnace') {
    const cost = half(b.paidCost);
    if (inventory[RES.IRON] < cost) return false;
    inventory[RES.IRON] -= cost;
  } else if (b.type === 'lab' || b.type === 'cutter' || b.type === 'assembler' || b.type === 'storage') {
    const ci = half(b.paidCost.ironPlate), cc = half(b.paidCost.copperPlate);
    if (inventory[RES.PLATE_IRON] < ci || inventory[RES.PLATE_COPPER] < cc) return false;
    inventory[RES.PLATE_IRON] -= ci; inventory[RES.PLATE_COPPER] -= cc;
  } else if (b.type === 'chemplant') {
    const ci = half(b.paidCost.ironPlate), cc = half(b.paidCost.copperPlate), cw = half(b.paidCost.wire);
    if (inventory[RES.PLATE_IRON] < ci || inventory[RES.PLATE_COPPER] < cc || inventory[RES.WIRE] < cw) return false;
    inventory[RES.PLATE_IRON] -= ci; inventory[RES.PLATE_COPPER] -= cc; inventory[RES.WIRE] -= cw;
  } else if (b.type === 'turret') {
    const cc = half(b.paidCost.corps), ce = half(b.paidCost.engine), ci = half(b.paidCost.circuit);
    if (inventory[RES.CORPS] < cc || inventory[RES.ENGINE] < ce || inventory[RES.CIRCUIT] < ci) return false;
    inventory[RES.CORPS] -= cc; inventory[RES.ENGINE] -= ce; inventory[RES.CIRCUIT] -= ci;
  } else if (b.type === 'radar') {
    const ci = half(b.paidCost.circuit), cc = half(b.paidCost.corps), cp = half(b.paidCost.plate_iron);
    if (inventory[RES.CIRCUIT] < ci || inventory[RES.CORPS] < cc || inventory[RES.PLATE_IRON] < cp) return false;
    inventory[RES.CIRCUIT] -= ci; inventory[RES.CORPS] -= cc; inventory[RES.PLATE_IRON] -= cp;
  } else if (b.type === 'inserter') {
    const ci = half(b.paidCost.iron), cg = half(b.paidCost.gear), cp = half(b.paidCost.plate_iron);
    if (inventory[RES.IRON] < ci || inventory[RES.GEAR] < cg || inventory[RES.PLATE_IRON] < cp) return false;
    inventory[RES.IRON] -= ci; inventory[RES.GEAR] -= cg; inventory[RES.PLATE_IRON] -= cp;
  } else if (b.type === 'minicore') {
    if (inventory[RES.IRON] < half(b.paidCost)) return false;
    inventory[RES.IRON] -= half(b.paidCost);
  }
  b.isBroken = false; b.hp = b.maxHp; return true;
}

export function repairConveyor(c) {
  if (!c.isBroken) return false;
  let costIron = 0;
  if (c.type === 'conveyor') costIron = Math.floor(CONVEYOR_COST * 0.5);
  else if (c.type === 'splitter') costIron = Math.floor(SPLITTER_COST.iron * 0.5) + Math.floor(SPLITTER_COST.plate_iron * 0.5);
  else if (c.type === 'underground') costIron = Math.floor(UNDERGROUND_COST.iron * 0.5);

  if (inventory[RES.IRON] < costIron) return false;
  inventory[RES.IRON] -= costIron;
  c.isBroken = false; c.hp = c.maxHp; return true;
}

export function updateBuildings(dt) {
  for (const b of buildings) { if (b.isBroken) continue; b.update(dt); }
  for (let i = turretBeams.length - 1; i >= 0; i--) { turretBeams[i].life -= dt; if (turretBeams[i].life <= 0) turretBeams.splice(i, 1); }
  updateFog();
}

export function drawBuildings() {
  const sorted = [...buildings].sort((a, b) => a.ty - b.ty);
  for (const b of sorted) { if (!b.isBroken && typeof b.drawAmbient === 'function') b.drawAmbient(); }
  for (const b of sorted) {
    const emptyMine = b.type === 'mine' && oreAmount[b.ty][b.tx] <= 0;
    ctx.save();
    if (b.isBroken) ctx.globalAlpha = 0.35; else if (emptyMine) ctx.globalAlpha = 0.5;
    drawShadow(b.tx * TILE, b.ty * TILE, TILE, b.type);
    ctx.restore();
  }
  for (const b of sorted) {
    if (b.isBroken) {
      ctx.save(); ctx.globalAlpha = 0.35;
      if (!drawBuildingSprite(b.type, b.tx * TILE, b.ty * TILE, TILE)) { ctx.fillStyle = '#444'; ctx.fillRect(b.tx * TILE + 2, b.ty * TILE + 2, TILE - 4, TILE - 4); }
      ctx.restore();
      drawBrokenOverlay(b.tx * TILE, b.ty * TILE, TILE);
    } else {
      if (typeof b.drawSpecific === 'function') b.drawSpecific();
      if (b.hp !== undefined) drawHpCircle(b.tx * TILE, b.ty * TILE, b.hp, b.maxHp);
    }
  }
  for (const b of sorted) {
    if (b.isBroken || b.outputDir === null || b.outputDir === undefined) continue;
    drawArrow(b.tx * TILE, b.ty * TILE, b.outputDir, b.type === 'mine' ? '#c8b060' : '#ffa040');
  }
  for (const beam of turretBeams) {
    const alpha = Math.max(0, beam.life / 0.1);
    ctx.strokeStyle = `rgba(255, 220, 100, ${alpha})`; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(beam.fromX, beam.fromY); ctx.lineTo(beam.toX, beam.toY); ctx.stroke();
    ctx.strokeStyle = `rgba(255, 255, 200, ${alpha})`; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(beam.fromX, beam.fromY); ctx.lineTo(beam.toX, beam.toY); ctx.stroke();
  }
}

export { Mine, Furnace, Lab, Cutter, Assembler, Chemplant, Storage, Turret, Radar, Inserter, MiniCore };

if (typeof window !== 'undefined') window.__monsters = window.__monsters || [];
console.debug('[buildings] loaded');