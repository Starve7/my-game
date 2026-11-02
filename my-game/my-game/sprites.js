'use strict';

import { RES, RES_COLOR, ctx } from './game.js';

export const RES_SCALE = {
  [RES.IRON]: 0.7, 
  [RES.COPPER]: 0.7, 
  [RES.COAL]: 1.0, 
  [RES.STONE]: 0.8,
  [RES.WOOD]: 1.0,
  [RES.URANIUM]: 1.0,
  [RES.LEAD]: 1.0,
};

export const SPRITES = {
  [RES.IRON]:         ['assets/iron_1.png'],
  [RES.COPPER]:       ['assets/copper_1.png'],
  [RES.COAL]:         ['assets/coal.png'],
  [RES.PLATE_IRON]:   ['assets/plate_iron.png'],
  [RES.PLATE_COPPER]: ['assets/plate_copper.png'],
  [RES.WIRE]:         ['assets/wire.png'],
  [RES.GEAR]:         ['assets/gear.png'],
  [RES.CORPS]:        ['assets/corps.png'],
  [RES.CIRCUIT]:      ['assets/circuit.png'],
  [RES.ENGINE]:       ['assets/engine.png'],
  [RES.POWDER]:       ['assets/powder.png'],
  [RES.AMMO]:         ['assets/ammo.png'],
  [RES.STONE]:        ['assets/stone.png'],
  [RES.WOOD]:         ['assets/wood.png'],
  [RES.URANIUM]:      ['assets/uranium.png'],
  [RES.LEAD]:         ['assets/lead.png'],
};

export const BUILDING_SPRITES = {
  mine:      'assets/mine.png',
  furnace:   'assets/furnace.png',
  lab:       'assets/lab.png',
  cutter:    'assets/cutter.png',
  assembler: 'assets/assembler.png',
  chemplant: 'assets/chemplant.png',
  storage:   'assets/storage.png',
  turret:    'assets/turret.png',
  radar:     'assets/radar.png',
  inserter_base: 'assets/inserter_base.png',
  inserter_arm:  'assets/inserter_arm.png',
  splitter: 'assets/splitter.png',
  underground: 'assets/underground.png',
  lumberjack: 'assets/lumberjack.png', // <--- ДОБАВЛЕНА ЛЕСОРУБКА
  sawmill: 'assets/sawmill.png'        // <--- ДОБАВЛЕН КОМБИНАТ
};

export const BUILDING_SCALE = {
  mine:      1.4,
  furnace:   1.0,
  lab:       1.0,
  cutter:    1.0,
  assembler: 1.0,
  chemplant: 1.0,
  storage:   1.0,
  turret:    1.0,
  radar:     1.0,
  inserter_base: 1.0,
  inserter_arm: 1.5,
  splitter: 1.0,
  underground: 1.0,
  lumberjack: 1.0,
  sawmill: 1.0
};

const CONVEYOR_SPRITES = [
  'assets/conveyor_n.png', 'assets/conveyor_e.png', 'assets/conveyor_s.png',
  'assets/conveyor_w.png', 'assets/conveyor_ne.png', 'assets/conveyor_t.png'
];

const CORE_SPRITE = 'assets/core.png';

export const images = {};
export const buildingImages = {};
const conveyorImages = [];
let coreImage = null;

// ФУНКЦИЯ ДЛЯ ПРИНУДИТЕЛЬНОЙ ПЕРЕРИСОВКИ (ФИКС БАГА С СЕЙВАМИ)
function triggerRedraw() {
  if (typeof window !== 'undefined' && window.__forceRedraw) {
    window.__forceRedraw();
  }
}

for (const [resType, paths] of Object.entries(SPRITES)) {
  images[resType] = paths.map(path => { 
    const img = new Image(); 
    img.onload = triggerRedraw; // <--- ПЕРЕРИСОВКА ПРИ ЗАГРУЗКЕ
    img.src = path; 
    return img; 
  });
}

for (const [type, path] of Object.entries(BUILDING_SPRITES)) {
  const img = new Image(); 
  img.onload = triggerRedraw; // <--- ПЕРЕРИСОВКА ПРИ ЗАГРУЗКЕ
  img.src = path; 
  buildingImages[type] = img;
}

CONVEYOR_SPRITES.forEach(path => { 
  const img = new Image(); 
  img.onload = triggerRedraw;
  img.src = path; 
  conveyorImages.push(img); 
});

{ 
  const img = new Image(); 
  img.onload = triggerRedraw;
  img.src = CORE_SPRITE; 
  coreImage = img; 
}

export function isReady(img) { return img && img.complete && img.naturalWidth > 0; }
export function imgReady(resType, variant = 0) { const arr = images[resType]; if (!arr || !arr[variant]) return false; return isReady(arr[variant]); }
export function variantForTile(tx, ty) { return (tx * 73856093 ^ ty * 19349663) >>> 0; }

export function drawResIcon(resType, x, y, size, variant = 0) {
  const arr = images[resType];
  const scale = RES_SCALE[resType] || 1.0;
  const finalSize = size * scale;
  const offsetX = x + (size - finalSize) / 2;
  const offsetY = y + (size - finalSize) / 2;
  
  if (arr) {
    if (variant < arr.length && imgReady(resType, variant)) { 
      ctx.drawImage(arr[variant], offsetX, offsetY, finalSize, finalSize); 
      return true;
    }
    if (imgReady(resType, 0)) { 
      ctx.drawImage(arr[0], offsetX, offsetY, finalSize, finalSize); 
      return true; 
    }
  }
  ctx.fillStyle = RES_COLOR[resType] || '#888'; 
  ctx.fillRect(offsetX, offsetY, finalSize, finalSize);
  return false;
}

export function drawBuildingSprite(type, sx, sy, size) {
  const img = buildingImages[type];
  if (!isReady(img)) return false;
  const scale = BUILDING_SCALE[type] || 1.0;
  const aspect = img.naturalHeight / img.naturalWidth;
  const w = size * scale;
  const h = w * aspect;
  const drawX = sx + size / 2 - w / 2;
  const drawY = sy + size - h;
  ctx.drawImage(img, drawX, drawY, w, h);
  return true;
}

export function drawInserterArm(angle, heldItem, cx, cy) {
  ctx.save(); ctx.translate(cx, cy); ctx.rotate(angle);
  const img = buildingImages['inserter_arm'];
  if (isReady(img)) {
    const size = 32 * (BUILDING_SCALE['inserter_arm'] || 1.5);
    ctx.drawImage(img, -size / 4, -size / 2, size, size); 
  } else {
    ctx.fillStyle = '#a0a0a0'; ctx.fillRect(0, -3, 16 + 6, 6);
  }
  if (heldItem) { const itemSize = 12; drawResIcon(heldItem, 20 - itemSize/2, -itemSize/2, itemSize, 0); }
  ctx.restore();
}

export function drawConveyorSprite(dir, sx, sy, size, inDirs = []) {
  const oppDir = (dir + 2) % 4;
  const hasStraight = inDirs.includes(oppDir);
  const sideIns = inDirs.filter(d => d !== oppDir);
  let imgIndex = dir, angle = 0, flipX = false;

  if (sideIns.length >= 2) {
    imgIndex = 5; 
    if (dir === 0) angle = 0; else if (dir === 1) angle = Math.PI / 2; else if (dir === 2) angle = Math.PI; else if (dir === 3) angle = -Math.PI / 2;
  } else if (hasStraight && sideIns.length === 0) { imgIndex = dir; } 
  else if (sideIns.length === 1) {
    imgIndex = 4; const inDir = sideIns[0];
    if (inDir === 0 && dir === 1) { angle = 0; flipX = false; }             
    else if (inDir === 1 && dir === 2) { angle = Math.PI / 2; flipX = false; }  
    else if (inDir === 2 && dir === 3) { angle = Math.PI; flipX = false; }      
    else if (inDir === 3 && dir === 0) { angle = -Math.PI / 2; flipX = false; } 
    else if (inDir === 0 && dir === 3) { angle = 0; flipX = true; }             
    else if (inDir === 1 && dir === 0) { angle = Math.PI / 2; flipX = true; }   
    else if (inDir === 2 && dir === 1) { angle = Math.PI; flipX = true; }       
    else if (inDir === 3 && dir === 2) { angle = -Math.PI / 2; flipX = true; }  
  }

  const img = conveyorImages[imgIndex];
  if (isReady(img)) {
    ctx.save(); ctx.translate(sx + size / 2, sy + size / 2);
    if (angle !== 0) ctx.rotate(angle); if (flipX) ctx.scale(-1, 1);
    ctx.drawImage(img, -size / 2, -size / 2, size, size); ctx.restore();
    return true;
  }
  return false;
}

export function drawCoreSprite(cx, cy, size3) {
  if (!isReady(coreImage)) return false;
  const aspect = coreImage.naturalHeight / coreImage.naturalWidth;
  const w = size3; const h = size3 * aspect;
  const drawX = cx + (size3 - w) / 2; const drawY = cy + size3 - h;
  ctx.drawImage(coreImage, drawX, drawY, w, h); return true;
}

export function drawShadow(sx, sy, size, type) {
  const scale = BUILDING_SCALE[type] || 1.0;
  const cx = sx + size / 2; const cy = sy + size - 4;
  const rx = (size * 0.42) * Math.min(scale, 1.6); const ry = size * 0.14;
  ctx.fillStyle = 'rgba(0,0,0,0.28)';
  ctx.beginPath(); ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2); ctx.fill();
}

export function setHudIcon(elId, resType) {
  const el = document.getElementById(elId); if (!el) return;
  if (imgReady(resType, 0)) {
    el.style.backgroundImage = `url('${images[resType][0].src}')`;
    el.style.backgroundColor = 'transparent'; el.style.border = 'none';
  }
}

export function spriteUrl(resType) { if (imgReady(resType, 0)) return `url('${images[resType][0].src}')`; return null; }

export function drawSplitterSprite(dir, sx, sy, size) {
  const img = buildingImages['splitter'];
  if (!isReady(img)) return false;
  const isVertical = dir === 1 || dir === 3; 
  const w = isVertical ? size : size * 2;
  const h = isVertical ? size * 2 : size;
  const cx = sx + w / 2; const cy = sy + h / 2;
  let angle = 0;
  if (dir === 1) angle = 0; else if (dir === 2) angle = Math.PI / 2; else if (dir === 3) angle = Math.PI; else if (dir === 0) angle = -Math.PI / 2;
  ctx.save(); ctx.translate(cx, cy); ctx.rotate(angle);
  const drawW = size; const drawH = size * 2;
  ctx.drawImage(img, -drawW / 2, -drawH / 2, drawW, drawH);
  ctx.restore();
  return true;
}

export function drawUndergroundSprite(dir, isEntrance, sx, sy, size) {
  const img = buildingImages['underground'];
  if (!isReady(img)) return false;
  const cx = sx + size / 2, cy = sy + size / 2;
  let angle = 0;
  if (dir === 1) angle = 0; else if (dir === 2) angle = Math.PI / 2; else if (dir === 3) angle = Math.PI; else if (dir === 0) angle = -Math.PI / 2;
  if (isEntrance) angle += Math.PI;
  ctx.save(); ctx.translate(cx, cy); ctx.rotate(angle);
  ctx.drawImage(img, -size / 2, -size / 2, size, size);
  ctx.restore();
  return true;
}

console.debug('[sprites] loaded');