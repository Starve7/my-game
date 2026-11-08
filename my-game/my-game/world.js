'use strict';

import { TILE, WORLD_W, WORLD_H, camera, clampCamera, initialZoom } from './game.js';
import { RES } from './resources.js';

export const CORE = { x: Math.floor(WORLD_W / 2), y: Math.floor(WORLD_H / 2) };
export const CORE_HP_MAX = 1000;

const ORE_NEAR_MIN = 8000,  ORE_NEAR_MAX = 15000;
const ORE_MID_MIN  = 15000, ORE_MID_MAX  = 25000;
const ORE_FAR_MIN  = 25000, ORE_FAR_MAX  = 45000;
const ORE_EDGE_MIN = 50000, ORE_EDGE_MAX = 100000;

export const world = [];
export const oreAmount = [];
export const oreInitial = [];
export const fog = [];
export const initialNests = [];

// НОВЫЙ ХОЛСТ ДЛЯ ТУМАНА
export const fogCanvas = document.createElement('canvas');
fogCanvas.width = WORLD_W;
fogCanvas.height = WORLD_H;
export const fogCtx = fogCanvas.getContext('2d');

for (let y = 0; y < WORLD_H; y++) {
  world.push(new Array(WORLD_W).fill(0));
  oreAmount.push(new Array(WORLD_W).fill(0));
  oreInitial.push(new Array(WORLD_W).fill(0));
  fog.push(new Array(WORLD_W).fill(1));
}

// НОВАЯ ФУНКЦИЯ ПЕРЕРИСОВКИ ХОЛСТА ТУМАНА
export function updateFogCanvas() {
  const imgData = fogCtx.createImageData(WORLD_W, WORLD_H);
  const data = imgData.data;
  for (let y = 0; y < WORLD_H; y++) {
    for (let x = 0; x < WORLD_W; x++) {
      const idx = (y * WORLD_W + x) * 4;
      if (fog[y][x] === 1) {
        const noise = ((x * 73856093) ^ (y * 19349663)) % 12;
        data[idx] = 8;
        data[idx + 1] = 10;
        data[idx + 2] = 14;
        data[idx + 3] = 220 + noise; 
      } else {
        data[idx + 3] = 0;
      }
    }
  }
  fogCtx.putImageData(imgData, 0, 0);
}

function scatterResource(type, patchCount, minR, maxR, minDistFromCore = 0, maxDistFromCore = 999) {
  let spawned = 0;
  let attempts = 0;
  while (spawned < patchCount && attempts < patchCount * 50) {
    attempts++;
    const angle = Math.random() * Math.PI * 2;
    const dist = minDistFromCore + Math.random() * (maxDistFromCore - minDistFromCore);
    const cx = Math.floor(CORE.x + Math.cos(angle) * dist);
    const cy = Math.floor(CORE.y + Math.sin(angle) * dist);
    
    if (cx < 2 || cx >= WORLD_W - 2 || cy < 2 || cy >= WORLD_H - 2) continue;

    const r = minR + Math.random() * (maxR - minR);
    const r2 = r * r;
    
    let hasPlaced = false;
    for (let y = Math.max(0, Math.floor(cy - r - 1)); y <= Math.min(WORLD_H - 1, Math.ceil(cy + r + 1)); y++) {
      for (let x = Math.max(0, Math.floor(cx - r - 1)); x <= Math.min(WORLD_W - 1, Math.ceil(cx + r + 1)); x++) {
        const dx = x - cx, dy = y - cy;
        if (dx * dx + dy * dy <= r2 + Math.random() * 3 && world[y][x] === 0) {
          world[y][x] = type;
          hasPlaced = true;
        }
      }
    }
    if (hasPlaced) spawned++;
  }
}

function scatterOilPatches() {
  for (let p = 0; p < 25; p++) {
    const angle = Math.random() * Math.PI * 2;
    const dist = 35 + Math.random() * 40;
    const cx = Math.floor(CORE.x + Math.cos(angle) * dist);
    const cy = Math.floor(CORE.y + Math.sin(angle) * dist);

    for (let i = 0; i < 4; i++) {
      const ox = cx + Math.floor(Math.random() * 3) - 1;
      const oy = cy + Math.floor(Math.random() * 3) - 1;
      if (ox >= 0 && ox < WORLD_W && oy >= 0 && oy < WORLD_H && world[oy][ox] === 0) {
        world[oy][ox] = RES.OIL;
      }
    }
  }
}

function generateLakes() {
  for (let l = 0; l < 8; l++) {
    const angle = Math.random() * Math.PI * 2;
    const dist = 20 + Math.random() * 100;
    const cx = Math.floor(CORE.x + Math.cos(angle) * dist);
    const cy = Math.floor(CORE.y + Math.sin(angle) * dist);

    const radius = 5 + Math.floor(Math.random() * 6);
    for (let y = cy - radius; y <= cy + radius; y++) {
      for (let x = cx - radius; x <= cx + radius; x++) {
        if (x >= 0 && x < WORLD_W && y >= 0 && y < WORLD_H) {
          const d = Math.hypot(x - cx, y - cy);
          if (d < radius + (Math.random() * 2 - 1) && world[y][x] === 0) {
             world[y][x] = RES.WATER;
          }
        }
      }
    }
  }
}

function spawnNestsInSector(level, count, minDist, maxDist, startAngle, endAngle) {
  for (let i = 0; i < count; i++) {
    const angle = startAngle + Math.random() * (endAngle - startAngle);
    const dist = minDist + Math.random() * (maxDist - minDist);
    const tx = Math.floor(CORE.x + Math.cos(angle) * dist);
    const ty = Math.floor(CORE.y + Math.sin(angle) * dist);
    initialNests.push({ tx, ty, level });
  }
}

function generateNaturalNests() {
  initialNests.length = 0;
  const PI2 = Math.PI * 2;
  
  const sectors = [
    { start: 0, end: Math.PI / 2 },
    { start: Math.PI / 2, end: Math.PI },
    { start: Math.PI, end: Math.PI * 1.5 },
    { start: Math.PI * 1.5, end: PI2 }
  ];

  sectors.forEach(s => spawnNestsInSector(1, 2, 35, 70, s.start, s.end));
  sectors.forEach(s => spawnNestsInSector(2, 2, 75, 105, s.start, s.end));
  sectors.forEach(s => spawnNestsInSector(3, 2, 110, 140, s.start, s.end));

  for (let i = 0; i < 6; i++) {
    const s = sectors[Math.floor(Math.random() * 4)];
    spawnNestsInSector(4, 1, 110, 145, s.start, s.end);
  }

  for (let i = 0; i < 3; i++) {
    const s = sectors[Math.floor(Math.random() * 4)];
    spawnNestsInSector(5, 1, 130, 148, s.start, s.end);
  }

  const s6 = sectors[Math.floor(Math.random() * 4)];
  const angle6 = s6.start + Math.random() * (s6.end - s6.start);
  initialNests.push({ 
    tx: Math.floor(CORE.x + Math.cos(angle6) * 145), 
    ty: Math.floor(CORE.y + Math.sin(angle6) * 145), 
    level: 6 
  });
}

export function generateWorld() {
  for (let y = 0; y < WORLD_H; y++) {
    for (let x = 0; x < WORLD_W; x++) {
      world[y][x] = 0;
      oreAmount[y][x] = 0;
      oreInitial[y][x] = 0;
      fog[y][x] = 1;
    }
  }

  scatterResource(RES.IRON,   1, 1.5, 2, 6, 10);
  scatterResource(RES.COPPER, 1, 1.5, 2, 6, 10);
  scatterResource(RES.COAL,   1, 1.5, 2, 6, 10);
  scatterResource(RES.STONE,  2, 1.5, 2, 6, 10);

  scatterResource(RES.IRON,   4, 1.5, 2.5, 10, 35);
  scatterResource(RES.COPPER, 4, 1.5, 2.5, 10, 35);
  scatterResource(RES.COAL,   4, 1.5, 2.5, 10, 35);
  scatterResource(RES.STONE,  6, 1.5, 3, 10, 35);
  scatterResource(RES.WOOD,   12, 1.5, 3, 5, 35);

  scatterResource(RES.IRON,   10, 2, 3.5, 35, 75);
  scatterResource(RES.COPPER, 10, 2, 3.5, 35, 75);
  scatterResource(RES.COAL,   10, 2, 3.5, 35, 75);
  scatterResource(RES.CLAY,   8, 2, 3, 35, 75);
  
  scatterResource(RES.BAUXITE, 4, 1.5, 2, 35, 75);
  scatterResource(RES.LEAD,    4, 1.5, 2, 35, 75);
  scatterResource(RES.TIN,     4, 1.5, 2, 35, 75);
  scatterResource(RES.ZINC,    4, 1.5, 2, 35, 75);
  scatterOilPatches();

  scatterResource(RES.BAUXITE, 8, 2, 3, 75, 110);
  scatterResource(RES.LEAD,    8, 2, 3, 75, 110);
  scatterResource(RES.TIN,     8, 2, 3, 75, 110);
  scatterResource(RES.ZINC,    8, 2, 3, 75, 110);
  
  scatterResource(RES.TITANIUM, 4, 1.5, 2, 75, 110);
  scatterResource(RES.TUNGSTEN, 4, 1.5, 2, 75, 110);
  scatterResource(RES.URANIUM,  4, 1.5, 2, 75, 110);
  scatterResource(RES.SILICON,  4, 1.5, 2, 75, 110);

  scatterResource(RES.TITANIUM, 10, 2, 3.5, 110, 160);
  scatterResource(RES.TUNGSTEN, 10, 2, 3.5, 110, 160);
  scatterResource(RES.URANIUM,  10, 2, 3.5, 110, 160);
  scatterResource(RES.SILICON,  10, 2, 3.5, 110, 160);
  
  scatterResource(RES.IRON,   6, 2, 3, 110, 160);
  scatterResource(RES.COPPER, 6, 2, 3, 110, 160);

  generateLakes();
  generateNaturalNests();

  for (let y = CORE.y - 5; y <= CORE.y + 5; y++)
    for (let x = CORE.x - 5; x <= CORE.x + 5; x++)
      if (x >= 0 && x < WORLD_W && y >= 0 && y < WORLD_H) world[y][x] = 0;

  for (let y = 0; y < WORLD_H; y++) {
    for (let x = 0; x < WORLD_W; x++) {
      if (world[y][x] === 0 || world[y][x] === RES.WATER || world[y][x] === RES.OIL) continue;
      
      const dist = Math.hypot(x - CORE.x, y - CORE.y);
      let amount;
      if (dist >= 110) amount = ORE_EDGE_MIN + Math.random() * (ORE_EDGE_MAX - ORE_EDGE_MIN);
      else if (dist >= 75) amount = ORE_FAR_MIN + Math.random() * (ORE_FAR_MAX - ORE_FAR_MIN);
      else if (dist >= 35) amount = ORE_MID_MIN + Math.random() * (ORE_MID_MAX - ORE_MID_MIN);
      else amount = ORE_NEAR_MIN + Math.random() * (ORE_NEAR_MAX - ORE_NEAR_MIN);
      
      amount = Math.round(amount);
      oreAmount[y][x] = amount;
      oreInitial[y][x] = amount;
    }
  }

  updateFogCanvas(); // ВЫЗОВ ПРИ ГЕНЕРАЦИИ
}

generateWorld();
camera.x = CORE.x * TILE + TILE / 2;
camera.y = CORE.y * TILE + TILE / 2;
camera.zoom = initialZoom();
clampCamera();
console.debug('[world] generated, CORE:', CORE.x, CORE.y);