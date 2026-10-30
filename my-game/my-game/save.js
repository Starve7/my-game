'use strict';

import {
  state, inventory, camera, TILE, WORLD_W, WORLD_H,
  clampCamera, initialZoom,
} from './game.js';
import { world, oreAmount, oreInitial, CORE, generateWorld, fog } from './world.js';
import {
  buildings, conveyors, splitters, undergrounds, turretBeams, updateFog,
  Mine, Furnace, Lab, Cutter, Assembler, Chemplant, Storage, Turret, Radar, Inserter, MiniCore
} from './buildings.js';
import { monsters, coreBeams, explosions, nests } from './monsters.js';

const KEY_PREFIX = 'factory_save_';
const CURRENT_VERSION = 1;

const TRANSIENT_STATE_KEYS = [
  'panel', 'activeBuilding', 'activeConveyor', 'selectedBuilding', 'ghostPos',
  'gameOver', 'gameStarted', 'inMenu', 'statHistory', 'demolishMode', 'currentSaveSlot',
];

function isPersistentStateValue(key, value) {
  if (TRANSIENT_STATE_KEYS.includes(key)) return false;
  if (typeof value === 'function') return false;
  try { JSON.stringify(value); return true; } 
  catch { console.warn('[save] skip non-serializable state field:', key); return false; }
}

function captureState() {
  const out = {};
  for (const key in state) {
    if (!Object.prototype.hasOwnProperty.call(state, key)) continue;
    const value = state[key];
    if (isPersistentStateValue(key, value)) out[key] = value;
  }
  return out;
}

export function captureGameData() {
  return {
    version: CURRENT_VERSION,
    timestamp: Date.now(),
    state: captureState(),
    inventory: { ...inventory },
    camera: { x: camera.x, y: camera.y, zoom: camera.zoom },
    world: world.map(row => [...row]),
    oreAmount: oreAmount.map(row => [...row]),
    oreInitial: oreInitial.map(row => [...row]),
    buildings: buildings.map(b => ({ ...b })),
    conveyors: conveyors.map(c => ({ ...c })),
    splitters: splitters.map(s => ({ ...s })),
    undergrounds: undergrounds.map(u => {
      const copy = { ...u };
      delete copy.partner;
      copy.partnerTx = u.partner ? u.partner.tx : null;
      copy.partnerTy = u.partner ? u.partner.ty : null;
      return copy;
    }),
    monsters: monsters.map(m => ({ ...m })),
    nests: nests.map(n => ({ ...n })),
  };
}

export function saveGame(slot, data) {
  try { localStorage.setItem(KEY_PREFIX + slot, JSON.stringify(data || captureGameData())); return true; } 
  catch (e) { console.error('[save] failed:', e); return false; }
}

export function loadSlotData(slot) {
  try { const raw = localStorage.getItem(KEY_PREFIX + slot); if (!raw) return null; return JSON.parse(raw); } 
  catch (e) { console.error('[load] failed:', e); return null; }
}

export function getSlotInfo(slot) {
  const data = loadSlotData(slot);
  if (!data) return { empty: true };
  return { empty: false, timestamp: data.timestamp || 0, day: data.state?.day || 1, dna: data.state?.dna || 0, pollution: data.state?.pollution || 0 };
}

export function deleteSlot(slot) { localStorage.removeItem(KEY_PREFIX + slot); }

export function restoreGameData(data) {
  buildings.length = 0;
  conveyors.length = 0;
  splitters.length = 0;
  undergrounds.length = 0;
  monsters.length = 0;
  nests.length = 0;
  turretBeams.length = 0;
  coreBeams.length = 0;
  explosions.length = 0;

  state.panel = null; state.activeBuilding = null; state.activeConveyor = null;
  state.selectedBuilding = null; state.ghostPos = null; state.gameOver = false;
  state.statHistory = {}; state.demolishMode = false;

  if (data.state) {
    for (const key in data.state) {
      if (TRANSIENT_STATE_KEYS.includes(key)) continue;
      state[key] = data.state[key];
    }
  }

  if (data.inventory) {
    for (const k in inventory) delete inventory[k];
    Object.assign(inventory, data.inventory);
  }

  if (data.camera) {
    camera.x = data.camera.x; camera.y = data.camera.y; camera.zoom = data.camera.zoom;
    clampCamera();
  }

  if (data.world && data.oreAmount && data.oreInitial) {
    for (let y = 0; y < WORLD_H; y++) {
      for (let x = 0; x < WORLD_W; x++) {
        world[y][x] = data.world[y][x] || 0;
        oreAmount[y][x] = data.oreAmount[y][x] || 0;
        oreInitial[y][x] = data.oreInitial[y][x] || 0;
      }
    }
  }

  if (data.buildings) {
    for (const bData of data.buildings) {
      const b = makeBuilding(bData);
      if (b) buildings.push(b);
    }
  }

  if (data.conveyors) for (const c of data.conveyors) conveyors.push({ ...c });
  if (data.splitters) for (const s of data.splitters) splitters.push({ ...s });
  
  if (data.undergrounds) {
    const map = new Map();
    for (const u of data.undergrounds) {
      const under = { ...u, partner: null };
      map.set(under.tx + ',' + under.ty, under);
      undergrounds.push(under);
    }
    for (const u of undergrounds) {
      if (u.partnerTx != null && u.partnerTy != null) {
        const partner = map.get(u.partnerTx + ',' + u.partnerTy);
        if (partner) { u.partner = partner; partner.partner = u; }
      }
    }
  }

  if (data.monsters) for (const m of data.monsters) monsters.push({ ...m });
  
  if (data.nests && data.nests.length > 0) {
    for (const n of data.nests) nests.push({ ...n });
  }

  updateFog();
}

function makeBuilding(data) {
  let b;
  try {
    if (data.type === 'mine') b = new Mine(data.tx, data.ty, data.resourceType);
    else if (data.type === 'furnace') b = new Furnace(data.tx, data.ty);
    else if (data.type === 'lab') b = new Lab(data.tx, data.ty);
    else if (data.type === 'cutter') b = new Cutter(data.tx, data.ty);
    else if (data.type === 'assembler') b = new Assembler(data.tx, data.ty);
    else if (data.type === 'chemplant') b = new Chemplant(data.tx, data.ty);
    else if (data.type === 'storage') b = new Storage(data.tx, data.ty);
    else if (data.type === 'turret') b = new Turret(data.tx, data.ty);
    else if (data.type === 'radar') b = new Radar(data.tx, data.ty);
    else if (data.type === 'inserter') b = new Inserter(data.tx, data.ty);
    else if (data.type === 'minicore') b = new MiniCore(data.tx, data.ty);
    else return null;
  } catch (e) { console.error('[load] failed to create building:', data.type, e); return null; }
  Object.assign(b, data);
  return b;
}

export function resetGameData() {
  state.pollution = 0; state.coreHP = 1000; state.dna = 0; state.day = 1; state.timeOfDay = 0.25;
  state.gameOver = false; state.newConveyorDir = 1; state.savedOutputDir = null;
  state.miningSpeedMult = 1.0; state.labSpeedMult = 1.0; state.coreDamageBonus = 0;
  state.turretFireRateMult = 1.0; state.turretRangeBonus = 0; state.turretDamageBonus = 0; state.turretHpBonus = 0;
  state.LIMITS = { mine: 30, furnace: 10, lab: 5, cutter: 10, assembler: 5, chemplant: 5, storage: 5, turret: 15, radar: 20, inserter: 50 };
  state.techState = {}; state.studyProgressByTech = {}; state.activeStudyTechId = null; state.studyTickTimer = 0;
  state.statHistory = {}; state.panel = null; state.activeBuilding = null; state.activeConveyor = null;
  state.selectedBuilding = null; state.ghostPos = null; state.demolishMode = false; state.currentSaveSlot = null; state.totalKills = 0;

  for (const k in inventory) delete inventory[k];
  Object.assign(inventory, { 1: 25, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0, 7: 0, 8: 0, 9: 0, 10: 0, 11: 0, 12: 0 });
  
  generateWorld();
  camera.x = CORE.x * TILE + TILE / 2; camera.y = CORE.y * TILE + TILE / 2;
  camera.zoom = initialZoom(); clampCamera();
  
  buildings.length = 0; conveyors.length = 0; splitters.length = 0; undergrounds.length = 0;
  monsters.length = 0; nests.length = 0; turretBeams.length = 0; coreBeams.length = 0; explosions.length = 0;

  updateFog();
}

console.debug('[save] loaded');