'use strict';

import { TILE, WORLD_W, WORLD_H, state, canvas, ctx, RES_COLOR, RES } from './game.js';
import { CORE, fog, world } from './world.js';
import { buildings, conveyors, damageBuildingAt, damageConveyorAt } from './buildings.js';
import { drawResIcon } from './sprites.js';
import { playExplosion } from './audio.js';

export const monsters = [];
export const explosions = [];
export const nests = []; 

if (typeof window !== 'undefined') {
  window.__monsters = monsters;
  window.__nests = nests; 
}

// УВЕЛИЧЕННЫЕ ЛИМИТЫ
const MONSTER_MAX_ALIVE = 400; 
const MOBS_PER_NEST = 25;       

const CORE_ATTACK_INTERVAL = 0.6, CORE_ATTACK_DAMAGE = 1, CORE_ATTACK_RANGE = TILE * 6;
let coreAttackTimer = 0;
export const coreBeams = [];

// 10 УРОВНЕЙ ЖУКОВ (с бронёй)
const MONSTER_TYPES = {
  1: { name: 'Рабочий', hp: 20, dmg: 5, speed: 1.0, color: '#c83030', size: 20, armor: 0 },
  2: { name: 'Бегун', hp: 15, dmg: 4, speed: 2.0, color: '#e89a4a', size: 16, armor: 0 },
  3: { name: 'Солдат', hp: 40, dmg: 8, speed: 1.0, color: '#a02020', size: 22, armor: 2 },
  4: { name: 'Танк', hp: 100, dmg: 15, speed: 0.5, color: '#8a2070', size: 30, armor: 5 },
  5: { name: 'Взрывник', hp: 50, dmg: 10, speed: 1.2, color: '#40a040', size: 24, armor: 2, explodeDmg: 50, explodeRadius: TILE * 2 },
  6: { name: 'Бронежук', hp: 150, dmg: 20, speed: 0.7, color: '#606080', size: 26, armor: 15 },
  7: { name: 'Летун', hp: 60, dmg: 12, speed: 1.8, color: '#80c0ff', size: 20, armor: 5, isFlyer: true },
  8: { name: 'Ульевой страж', hp: 300, dmg: 25, speed: 0.8, color: '#333', size: 32, armor: 25 },
  9: { name: 'Королевский солдат', hp: 500, dmg: 40, speed: 0.6, color: '#900', size: 34, armor: 35 },
  10: { name: 'КОРОЛЬ', hp: 3000, dmg: 60, speed: 0.3, color: '#000', size: 48, armor: 50 }
};

// 6 УРОВНЕЙ УЛЬЕВ (с бронёй)
const HIVE_TYPES = {
  1: { hp: 500, aggroRadius: TILE * 8, spawnRate: 15, name: 'Слабый улей', mobs: [1, 2], armor: 0 },
  2: { hp: 1000, aggroRadius: TILE * 10, spawnRate: 12, name: 'Средний улей', mobs: [1, 2, 3, 4], armor: 10 },
  3: { hp: 2000, aggroRadius: TILE * 12, spawnRate: 10, name: 'Большой улей', mobs: [3, 4, 5, 6], armor: 30 },
  4: { hp: 4000, aggroRadius: TILE * 15, spawnRate: 8, name: 'Мутированный улей', mobs: [4, 5, 6, 7], armor: 50 },
  5: { hp: 8000, aggroRadius: TILE * 18, spawnRate: 5, name: 'Улей погибели', mobs: [6, 7, 8, 9], armor: 80 },
  6: { hp: 15000, aggroRadius: TILE * 20, spawnRate: 2, name: 'Королева', mobs: [1, 2, 3, 4, 5, 6, 7, 8, 9], armor: 100, isKing: true }
};

const NEST_POLLUTION_THRESHOLD = 70; 
let nestSpawnTimer = 0;

export function trySpawnNest(level = 1, tx = null, ty = null) {
  if (nests.length >= 60) return; // Увеличено до 60

  if (tx === null || ty === null) {
    const angle = Math.random() * Math.PI * 2;
    const dist = 50 + Math.random() * 50;
    tx = Math.floor(CORE.x + Math.cos(angle) * dist);
    ty = Math.floor(CORE.y + Math.sin(angle) * dist);
  }

  if (tx > 0 && tx < WORLD_W && ty > 0 && ty < WORLD_H) {
    const type = HIVE_TYPES[level];
    nests.push({
      tx, ty,
      level: level,
      hp: type.hp,
      maxHp: type.hp,
      spawnTimer: 0,
      radius: 3,
      aggroRadius: type.aggroRadius,
      isProvoked: false,
      isKing: type.isKing || false,
      moveTimer: 0,
      armor: type.armor,
      spawnedCounts: {}
    });
    if (window.__showToast) window.__showToast(`⚠️ Обнаружен ${type.name}!`);
  }
}

export function updateNests(dt) {
  // Спавн от загрязнения
  if (state.pollution >= NEST_POLLUTION_THRESHOLD && nests.length < 60) {
    nestSpawnTimer += dt;
    if (nestSpawnTimer >= 20) { // Раз в 20 секунд (было 30)
      nestSpawnTimer = 0;
      let level = 1;
      if (state.pollution > 300) level = 2;
      if (state.pollution > 600) level = 3;
      if (state.pollution > 1000) level = 4;
      trySpawnNest(level);
    }
  }

  for (const n of nests) {
    const type = HIVE_TYPES[n.level];
    
    // Агр по постройке
    if (!n.isProvoked) {
      for (const b of buildings) {
        if (b.isBroken) continue;
        const d = Math.hypot(b.tx * TILE + TILE/2 - (n.tx * TILE + TILE/2), b.ty * TILE + TILE/2 - (n.ty * TILE + TILE/2));
        if (d < n.aggroRadius) { 
          n.isProvoked = true; 
          if (window.__showToast) window.__showToast(`🕷️ ${type.name} разъярен!`);
          break; 
        }
      }
    }

    // Движение Короля
    if (n.isKing && n.isProvoked) {
      n.moveTimer += dt;
      if (n.moveTimer >= 2) { 
        n.moveTimer = 0;
        const dx = CORE.x - n.tx;
        const dy = CORE.y - n.ty;
        const dist = Math.hypot(dx, dy);
        if (dist > 5) {
          n.tx += Math.sign(dx);
          n.ty += Math.sign(dy);
        }
      }
    }

    // Спавн жуков с лимитом НА УЛЕЙ (25)
    const myMobs = monsters.filter(m => m.targetNest === n).length;
    
    if (myMobs < MOBS_PER_NEST) {
      n.spawnTimer += dt;
      const rate = n.isProvoked ? (type.spawnRate / 2) : type.spawnRate;
      if (n.spawnTimer >= rate) {
        n.spawnTimer = 0;
        spawnMonsterFromNest(n);
      }
    }
  }
}

function spawnMonsterFromNest(nest) {
  const type = HIVE_TYPES[nest.level];
  let mobLevel;

  if (nest.isKing) {
    // Король спавнит по 25 каждого уровня
    const availableLevels = [];
    for (let i = 1; i <= 9; i++) {
      if ((nest.spawnedCounts[i] || 0) < 25) availableLevels.push(i);
    }
    if (availableLevels.length === 0) return;
    
    mobLevel = availableLevels[Math.floor(Math.random() * availableLevels.length)];
    nest.spawnedCounts[mobLevel] = (nest.spawnedCounts[mobLevel] || 0) + 1;
  } else {
    mobLevel = type.mobs[Math.floor(Math.random() * type.mobs.length)];
  }

  const base = MONSTER_TYPES[mobLevel];
  const hpScale = 1 + (state.day - 1) * 0.03;
  const dmgScale = 1 + (state.day - 1) * 0.03;

  monsters.push({
    x: nest.tx * TILE + TILE / 2 + (Math.random() - 0.5) * TILE,
    y: nest.ty * TILE + TILE / 2 + (Math.random() - 0.5) * TILE,
    level: mobLevel,
    name: base.name,
    hp: base.hp * hpScale,
    maxHp: base.hp * hpScale,
    damage: base.dmg * dmgScale,
    speed: base.speed,
    color: base.color,
    size: base.size,
    armor: base.armor,
    explodeDmg: base.explodeDmg ? base.explodeDmg * dmgScale : 0,
    explodeRadius: base.explodeRadius || 0,
    isFlyer: base.isFlyer || false,
    attackRange: TILE * 1.5,
    attackTimer: 0,
    targetNest: nest,
    isMonster: true
  });
}

export function drawNestsAndInfection() {
  for (const n of nests) {
    if (n.hp <= 0) continue;
    const nx = n.tx * TILE + TILE / 2;
    const ny = n.ty * TILE + TILE / 2;
    const r = n.radius * TILE;

    const grad = ctx.createRadialGradient(nx, ny, 0, nx, ny, r);
    grad.addColorStop(0, 'rgba(130, 20, 160, 0.6)');
    grad.addColorStop(0.4, 'rgba(80, 0, 100, 0.4)');
    grad.addColorStop(1, 'rgba(0, 0, 0, 0)');

    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(nx, ny, r, 0, Math.PI * 2);
    ctx.fill();
  }

  for (const n of nests) {
    if (n.hp <= 0) continue;
    const sx = n.tx * TILE, sy = n.ty * TILE;
    
    ctx.fillStyle = 'rgba(0,0,0,0.5)';
    ctx.beginPath(); ctx.ellipse(sx + TILE/2, sy + TILE - 4, TILE*0.7, TILE*0.2, 0, 0, Math.PI*2); ctx.fill();
    
    ctx.fillStyle = n.isProvoked ? '#8a1010' : '#3a1040';
    ctx.beginPath();
    ctx.ellipse(sx + TILE/2, sy + TILE/2, TILE * 0.6, TILE * 0.7, 0, 0, Math.PI * 2);
    ctx.fill();

    const pulse = 0.5 + 0.5 * Math.sin(performance.now() / 300 + n.tx);
    ctx.strokeStyle = n.isProvoked ? `rgba(255, 50, 50, ${0.5 + pulse * 0.5})` : `rgba(200, 50, 255, ${0.3 + pulse * 0.4})`;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(sx + TILE/2, sy + TILE/2, TILE * 0.4, 0, Math.PI * 2);
    ctx.stroke();
    
    const pct = Math.max(0, n.hp / n.maxHp);
    ctx.fillStyle = 'rgba(0,0,0,0.7)'; ctx.fillRect(sx + 2, sy - 6, TILE - 4, 4);
    ctx.fillStyle = '#e040e0'; ctx.fillRect(sx + 2, sy - 6, (TILE - 4) * pct, 4);

    if (n.isKing) {
      ctx.fillStyle = '#ffd700'; ctx.font = 'bold 16px sans-serif'; ctx.textAlign = 'center';
      ctx.fillText('👑', sx + TILE/2, sy - 10);
    }
  }
}

function isWalkable(tx, ty) {
  if (tx < 0 || tx >= WORLD_W || ty < 0 || ty >= WORLD_H) return false;
  if (world[ty][tx] === RES.WATER) return false; 
  return true;
}

function findNearbyTarget(m, coreX, coreY) {
  let best = null;
  let bestDist = Infinity;

  const dCore = Math.hypot(coreX - m.x, coreY - m.y);
  if (dCore < m.attackRange + TILE) return { kind: 'core', dist: dCore };

  for (const b of buildings) {
    if (b.isBroken) continue;
    const d = Math.hypot(b.tx * TILE + TILE / 2 - m.x, b.ty * TILE + TILE / 2 - m.y);
    if (d < m.attackRange && d < bestDist) { bestDist = d; best = { kind: 'building', ref: b, dist: d }; }
  }
  for (const c of conveyors) {
    if (c.isBroken) continue;
    const d = Math.hypot(c.tx * TILE + TILE / 2 - m.x, c.ty * TILE + TILE / 2 - m.y);
    if (d < m.attackRange && d < bestDist) { bestDist = d; best = { kind: 'conveyor', ref: c, dist: d }; }
  }
  return best;
}

export function handleMonsterDeath(m) {
  state.totalKills = (state.totalKills || 0) + 1;
  if (m.level === 5) {
    playExplosion();
    explosions.push({ x: m.x, y: m.y, radius: m.explodeRadius, life: 0.5, maxLife: 0.5 });
    for (const b of [...buildings]) {
      if (Math.hypot(b.tx * TILE + TILE / 2 - m.x, b.ty * TILE + TILE / 2 - m.y) <= m.explodeRadius) damageBuildingAt(b.tx, b.ty, m.explodeDmg);
    }
    for (const c of [...conveyors]) {
      if (Math.hypot(c.tx * TILE + TILE / 2 - m.x, c.ty * TILE + TILE / 2 - m.y) <= m.explodeRadius) damageConveyorAt(c.tx, c.ty, m.explodeDmg);
    }
    if (Math.hypot(CORE.x * TILE + TILE * 1.5 - m.x, CORE.y * TILE + TILE * 1.5 - m.y) <= m.explodeRadius) {
      state.coreHP -= m.explodeDmg;
      if (state.coreHP <= 0) { state.coreHP = 0; state.gameOver = true; if (window.__showGameOver) window.__showGameOver(); }
    }
  }
  
  if (m.targetNest && m.targetNest.isKing) {
    if (m.targetNest.spawnedCounts[m.level] > 0) {
      m.targetNest.spawnedCounts[m.level]--;
    }
  }
}

export function updateMonsters(dt) {
  if (state.gameOver) return;

  updateNests(dt);

  const coreX = CORE.x * TILE + TILE * 1.5, coreY = CORE.y * TILE + TILE * 1.5;

  coreAttackTimer += dt;
  if (coreAttackTimer >= CORE_ATTACK_INTERVAL) {
    coreAttackTimer -= CORE_ATTACK_INTERVAL;
    let target = null, nearestDist = Infinity;
    for (const m of monsters) {
      const d = Math.hypot(m.x - coreX, m.y - coreY);
      if (d < CORE_ATTACK_RANGE && d < nearestDist) { target = m; nearestDist = d; }
    }
    if (target) {
      const damage = Math.max(0, 20 + state.coreDamageBonus - target.armor);
      if (damage > 0) target.hp -= damage;
      
      coreBeams.push({ fromX: coreX, fromY: coreY, toX: target.x, toY: target.y, life: 0.12 });
      if (target.hp <= 0) {
        handleMonsterDeath(target);
        const idx = monsters.indexOf(target);
        if (idx !== -1) monsters.splice(idx, 1);
      }
    }
  }

  for (let i = coreBeams.length - 1; i >= 0; i--) { coreBeams[i].life -= dt; if (coreBeams[i].life <= 0) coreBeams.splice(i, 1); }
  for (let i = explosions.length - 1; i >= 0; i--) { explosions[i].life -= dt; if (explosions[i].life <= 0) explosions.splice(i, 1); }

  for (const m of monsters) {
    const dToCore = Math.hypot(coreX - m.x, coreY - m.y);
    
    if (dToCore < m.attackRange + TILE * 1.5) {
      m.attackTimer += dt;
      while (m.attackTimer >= 1) {
        m.attackTimer -= 1;
        state.coreHP -= m.damage;
        if (state.coreHP <= 0) {
          state.coreHP = 0; state.gameOver = true;
          if (window.__showGameOver) window.__showGameOver();
          return;
        }
      }
      continue;
    }

    const t = findNearbyTarget(m, coreX, coreY);
    if (t && t.kind !== 'core') {
      m.attackTimer += dt;
      while (m.attackTimer >= 1) {
        m.attackTimer -= 1;
        if (t.kind === 'building') {
          const b = t.ref;
          if (buildings.includes(b) && !b.isBroken) { if (damageBuildingAt(b.tx, b.ty, m.damage)) break; } else break;
        } else if (t.kind === 'conveyor') {
          const c = t.ref;
          if (conveyors.includes(c) && !c.isBroken) { if (damageConveyorAt(c.tx, c.ty, m.damage)) break; } else break;
        }
      }
    } else {
      let targetX = coreX, targetY = coreY;
      
      if (m.targetNest && !m.targetNest.isProvoked) {
        targetX = m.targetNest.tx * TILE + TILE/2;
        targetY = m.targetNest.ty * TILE + TILE/2;
        targetX += Math.sin(performance.now() / 1000 + m.hp) * TILE * 2;
        targetY += Math.cos(performance.now() / 1000 + m.hp) * TILE * 2;
      }

      const dx = targetX - m.x, dy = targetY - m.y, dist = Math.hypot(dx, dy);
      if (dist > 5) {
        let nextX = m.x + (dx / dist) * m.speed * TILE * dt;
        let nextY = m.y + (dy / dist) * m.speed * TILE * dt;

        if (!m.isFlyer) {
          const cellX = Math.floor(nextX / TILE);
          const cellY = Math.floor(nextY / TILE);
          if (!isWalkable(cellX, cellY)) {
             nextX = m.x + (dy / dist) * m.speed * TILE * dt;
             nextY = m.y - (dx / dist) * m.speed * TILE * dt;
          }
        }
        m.x = nextX;
        m.y = nextY;
      }
    }
  }
}

export function drawMonsters() {
  for (const beam of coreBeams) {
    const alpha = Math.max(0, beam.life / 0.12);
    ctx.strokeStyle = `rgba(140, 220, 255, ${alpha})`; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(beam.fromX, beam.fromY); ctx.lineTo(beam.toX, beam.toY); ctx.stroke();
    ctx.strokeStyle = `rgba(255, 255, 255, ${alpha})`; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(beam.fromX, beam.fromY); ctx.lineTo(beam.toX, beam.toY); ctx.stroke();
  }

  for (const m of monsters) {
    const size = m.size;
    const x = m.x, y = m.y;
    
    ctx.fillStyle = 'rgba(0,0,0,0.3)'; 
    ctx.beginPath(); ctx.ellipse(x, y + size / 2 - 2, size / 2.4, size / 6, 0, 0, Math.PI * 2); ctx.fill();
    
    ctx.fillStyle = m.color; 
    ctx.beginPath(); ctx.arc(x, y, size / 2, 0, Math.PI * 2); ctx.fill();

    if (m.level === 6 || m.level === 8 || m.level === 9) {
      ctx.strokeStyle = '#aaa'; ctx.lineWidth = 2;
      for (let i = 0; i < 8; i++) {
        const angle = (i / 8) * Math.PI * 2;
        ctx.beginPath();
        ctx.moveTo(x + Math.cos(angle) * (size/2 - 2), y + Math.sin(angle) * (size/2 - 2));
        ctx.lineTo(x + Math.cos(angle) * (size/2 + 4), y + Math.sin(angle) * (size/2 + 4));
        ctx.stroke();
      }
    }
    if (m.level === 7) {
      ctx.fillStyle = 'rgba(200, 240, 255, 0.6)';
      ctx.beginPath(); ctx.ellipse(x - size/2, y, size/2, size/4, -Math.PI/4, 0, Math.PI*2); ctx.fill();
      ctx.beginPath(); ctx.ellipse(x + size/2, y, size/2, size/4, Math.PI/4, 0, Math.PI*2); ctx.fill();
    }
    if (m.level === 10) {
      ctx.fillStyle = '#ffd700';
      ctx.beginPath();
      ctx.moveTo(x - 15, y - size/2);
      ctx.lineTo(x - 10, y - size/2 - 15);
      ctx.lineTo(x - 5, y - size/2 - 5);
      ctx.lineTo(x, y - size/2 - 20);
      ctx.lineTo(x + 5, y - size/2 - 5);
      ctx.lineTo(x + 10, y - size/2 - 15);
      ctx.lineTo(x + 15, y - size/2);
      ctx.fill();
    }

    ctx.fillStyle = '#100'; 
    const eyeOff = size / 6, eyeY = y - size / 8;
    ctx.beginPath(); 
    ctx.arc(x - eyeOff, eyeY, size / 10, 0, Math.PI * 2); 
    ctx.arc(x + eyeOff, eyeY, size / 10, 0, Math.PI * 2); 
    ctx.fill();

    const barW = size, barH = 4, barX = x - barW / 2, barY = y - size / 2 - 10;
    ctx.fillStyle = 'rgba(0,0,0,0.65)'; ctx.fillRect(barX, barY, barW, barH);
    ctx.fillStyle = m.color; ctx.fillRect(barX, barY, barW * (m.hp / m.maxHp), barH);
  }

  for (const e of explosions) {
    const p = 1 - (e.life / e.maxLife);
    ctx.fillStyle = `rgba(255, 100, 0, ${1 - p})`; ctx.beginPath(); ctx.arc(e.x, e.y, e.radius * p, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = `rgba(255, 255, 0, ${1 - p})`; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(e.x, e.y, e.radius * p, 0, Math.PI * 2); ctx.stroke();
  }
}