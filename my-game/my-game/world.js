'use strict';

import { TILE, WORLD_W, WORLD_H, camera, clampCamera, initialZoom } from './game.js';
import { RES } from './resources.js'; // ИМПОРТИРУЕМ НОВЫЕ РЕСУРСЫ

export const CORE = { x: Math.floor(WORLD_W / 2), y: Math.floor(WORLD_H / 2) };
export const CORE_HP_MAX = 1000;

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

// Специальная генерация для нефти (мелкие пятна)
function scatterOilPatches() {
  for (let p = 0; p < 25; p++) { // 25 пятен нефти
    const cx = Math.floor(Math.random() * WORLD_W);
    const cy = Math.floor(Math.random() * WORLD_H);
    const distToCore = Math.hypot(cx - CORE.x, cy - CORE.y);
    if (distToCore < 15) continue; // Не спавним близко к ядру

    // Маленькое пятно (от 1 до 3 клеток)
    for (let i = 0; i < 3; i++) {
      const ox = cx + Math.floor(Math.random() * 3) - 1;
      const oy = cy + Math.floor(Math.random() * 3) - 1;
      if (ox >= 0 && ox < WORLD_W && oy >= 0 && oy < WORLD_H && world[oy][ox] === 0) {
        world[oy][ox] = RES.OIL;
      }
    }
  }
}

// Специальная генерация озер
function generateLakes() {
  for (let l = 0; l < 5; l++) {
    const cx = Math.floor(Math.random() * WORLD_W);
    const cy = Math.floor(Math.random() * WORLD_H);
    const distToCore = Math.hypot(cx - CORE.x, cy - CORE.y);
    if (distToCore < 20) continue;

    const radius = 4 + Math.floor(Math.random() * 4); // 4-7 клеток радиус
    for (let y = cy - radius; y <= cy + radius; y++) {
      for (let x = cx - radius; x <= cx + radius; x++) {
        if (x >= 0 && x < WORLD_W && y >= 0 && y < WORLD_H) {
          const d = Math.hypot(x - cx, y - cy);
          // Делаем края озера неровными
          if (d < radius + (Math.random() * 1.5 - 0.75) && world[y][x] === 0) {
             world[y][x] = RES.WATER;
          }
        }
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

  // 1. Старые ресурсы
  scatterResource(RES.IRON,   7, 1, 2);
  scatterResource(RES.COPPER, 5, 1, 2);
  scatterResource(RES.COAL,   4, 1, 2);
  scatterResource(RES.IRON,   3, 1, 2, CORE.x, CORE.y, 5, 9);
  scatterResource(RES.COPPER, 3, 1, 2, CORE.x, CORE.y, 5, 9);
  scatterResource(RES.COAL,   3, 1, 2, CORE.x, CORE.y, 5, 9);

  // 2. Новые ресурсы
  scatterResource(RES.STONE, 15, 1, 2); // Камень
  scatterResource(RES.CLAY,  10, 1, 2); // Глина
  scatterResource(RES.WOOD,  15, 1, 2); // Дерево (леса)
  
  // Бокситы, свинец и т.д. (2-3 эпоха) - пока просто раскидаем
  scatterResource(RES.BAUXITE, 5, 1, 2);
  scatterResource(RES.TITANIUM, 3, 1, 2);

  scatterOilPatches();
  generateLakes();

  // 3. Очистка зоны вокруг ядра
  for (let y = CORE.y - 4; y <= CORE.y + 4; y++)
    for (let x = CORE.x - 4; x <= CORE.x + 4; x++)
      if (x >= 0 && x < WORLD_W && y >= 0 && y < WORLD_H) world[y][x] = 0;

  // 4. Расстановка запасов (кроме воды, нефти, дерева)
  for (let y = 0; y < WORLD_H; y++) {
    for (let x = 0; x < WORLD_W; x++) {
      if (world[y][x] === 0 || world[y][x] === RES.WATER || world[y][x] === RES.OIL) continue;
      
      const dist = Math.hypot(x - CORE.x, y - CORE.y);
      let amount;
      if (dist >= 26) amount = ORE_EDGE_MIN + Math.random() * (ORE_EDGE_MAX - ORE_EDGE_MIN);
      else if (dist >= 18) amount = ORE_FAR_MIN + Math.random() * (ORE_FAR_MAX - ORE_FAR_MIN);
      else if (dist >= 10) amount = ORE_MID_MIN + Math.random() * (ORE_MID_MAX - ORE_MID_MIN);
      else amount = ORE_NEAR_MIN + Math.random() * (ORE_NEAR_MAX - ORE_NEAR_MIN);
      
      // Дерево не истощается, ставим бесконечность
      if (world[y][x] === RES.WOOD) amount = Infinity;
      
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
console.debug('[world] generated, CORE:', CORE.x, CORE.y);l