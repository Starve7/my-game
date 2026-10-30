'use strict';

import { TILE, WORLD_W, WORLD_H, RES, camera, clampCamera, initialZoom } from './game.js';

export const CORE = { x: Math.floor(WORLD_W / 2), y: Math.floor(WORLD_H / 2) };
export const CORE_HP_MAX = 1000;

// УВЕЛИЧЕНЫ ЗАПАСЫ РУДЫ
const ORE_NEAR_MIN = 5000,  ORE_NEAR_MAX = 10000;
const ORE_MID_MIN  = 10000, ORE_MID_MAX  = 20000;
const ORE_FAR_MIN  = 20000, ORE_FAR_MAX  = 40000;
const ORE_EDGE_MIN = 50000, ORE_EDGE_MAX = 100000;

export const world = [];
export const oreAmount = [];
export const oreInitial = [];
export const fog = [];

for (let y = 0; y < WORLD_H; y++) {
  world.push(new Array(WORLD_W).fill(0));
  oreAmount.push(new Array(WORLD_W).fill(0));
  oreInitial.push(new Array(WORLD_W).fill(0));
  fog.push(new Array(WORLD_W).fill(1));
}

function scatterResource(type, patchCount, minR, maxR, centerX, centerY, minDist, maxDist) {
  for (let p = 0; p < patchCount; p++) {
    let cx, cy;
    if (centerX !== undefined) {
      const angle = Math.random() * Math.PI * 2;
      const dist = minDist + Math.random() * (maxDist - minDist);
      cx = Math.round(centerX + Math.cos(angle) * dist);
      cy = Math.round(centerY + Math.sin(angle) * dist);
    } else {
      cx = Math.floor(Math.random() * WORLD_W);
      cy = Math.floor(Math.random() * WORLD_H);
    }
    const r = minR + Math.random() * (maxR - minR);
    const r2 = r * r;
    for (let y = Math.max(0, Math.floor(cy - r - 1)); y <= Math.min(WORLD_H - 1, Math.ceil(cy + r + 1)); y++) {
      for (let x = Math.max(0, Math.floor(cx - r - 1)); x <= Math.min(WORLD_W - 1, Math.ceil(cx + r + 1)); x++) {
        const dx = x - cx, dy = y - cy;
        if (dx * dx + dy * dy <= r2 + Math.random() * 3 && world[y][x] === 0) world[y][x] = type;
      }
    }
  }
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

  scatterResource(RES.IRON,   7, 1, 2);
  scatterResource(RES.COPPER, 5, 1, 2);
  scatterResource(RES.COAL,   4, 1, 2);
  scatterResource(RES.IRON,   3, 1, 2, CORE.x, CORE.y, 5, 9);
  scatterResource(RES.COPPER, 3, 1, 2, CORE.x, CORE.y, 5, 9);
  scatterResource(RES.COAL,   3, 1, 2, CORE.x, CORE.y, 5, 9);

  for (let y = CORE.y - 3; y <= CORE.y + 3; y++)
    for (let x = CORE.x - 3; x <= CORE.x + 3; x++)
      if (x >= 0 && x < WORLD_W && y >= 0 && y < WORLD_H) world[y][x] = 0;

  for (let y = 0; y < WORLD_H; y++) {
    for (let x = 0; x < WORLD_W; x++) {
      if (world[y][x] === 0) continue;
      const dist = Math.hypot(x - CORE.x, y - CORE.y);
      let amount;
      if (dist >= 26) amount = ORE_EDGE_MIN + Math.random() * (ORE_EDGE_MAX - ORE_EDGE_MIN);
      else if (dist >= 18) amount = ORE_FAR_MIN + Math.random() * (ORE_FAR_MAX - ORE_FAR_MIN);
      else if (dist >= 10) amount = ORE_MID_MIN + Math.random() * (ORE_MID_MAX - ORE_MID_MIN);
      else amount = ORE_NEAR_MIN + Math.random() * (ORE_NEAR_MAX - ORE_NEAR_MIN);
      amount = Math.round(amount);
      oreAmount[y][x] = amount;
      oreInitial[y][x] = amount;
    }
  }
}

generateWorld();
camera.x = CORE.x * TILE + TILE / 2;
camera.y = CORE.y * TILE + TILE / 2;
camera.zoom = initialZoom();
clampCamera();
console.debug('[world] generated, CORE:', CORE.x, CORE.y);