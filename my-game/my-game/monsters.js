'use strict';

import { TILE, WORLD_W, WORLD_H, state, canvas, ctx, RES_COLOR, RES } from './game.js';
import { CORE, fog } from './world.js';
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

const MONSTER_SPAWN_INTERVAL = 2.5, MONSTER_MAX_ALIVE = 20;
const CORE_ATTACK_INTERVAL = 0.6, CORE_ATTACK_DAMAGE = 1, CORE_ATTACK_RANGE = TILE * 6;
let monsterSpawnTimer = 0, coreAttackTimer = 0;
export const coreBeams = [];

const MONSTER_TYPES = {
  grunt: { hp: 20, dmg: 5, speed: 1.0, color: '#c83030', size: 22 },
  runner: { hp: 12, dmg: 3, speed: 1.8, color: '#e89a4a', size: 18 },
  tank: { hp: 60, dmg: 15, speed: 0.5, color: '#8a2070', size: 30 },
  exploder: { hp: 30, dmg: 8, speed: 1.2, color: '#40a040', size: 24, explodeDmg: 50, explodeRadius: TILE * 2 }
};

const MAX_NESTS = 8;
const NEST_POLLUTION_THRESHOLD = 70;
let nestSpawnTimer = 0;

export function trySpawnNest() {
  const angle = Math.random() * Math.PI * 2;
  const dist = 40 + Math.random() * 50;
  const tx = Math.floor(CORE.x + Math.cos(angle) * dist);
  const ty = Math.floor(CORE.y + Math.sin(angle) * dist);

  if (tx > 0 && tx < WORLD_W && ty > 0 && ty < WORLD_H) {
    nests.push({
      tx, ty,
      hp: 500,
      maxHp: 500,
      level: 1 + Math.floor(state.day / 3),
      spawnTimer: 0,
      radius: 3
    });
    if (window.__showToast) window.__showToast('⚠️ Загрязнение породило новый кокон!');
  }
}

export function updateNests(dt) {
  if (state.pollution >= NEST_POLLUTION_THRESHOLD && nests.length < MAX_NESTS) {
    nestSpawnTimer += dt;
    if (nestSpawnTimer >= 45) {
      nestSpawnTimer = 0;
      trySpawnNest();
    }
  }

  for (const n of nests) {
    n.radius = 3 + Math.floor(state.pollution / 50) + n.level;
    n.level = 1 + Math.floor(state.day / 3);

    if (monsters.length < MONSTER_MAX_ALIVE) {
      n.spawnTimer += dt;
      if (n.spawnTimer >= 20) {
        n.spawnTimer = 0;
        spawnMonsterFromNest(n);
      }
    }
  }
}

function spawnMonsterFromNest(nest) {
  let type = 'grunt';
  if (nest.level >= 3 && Math.random() < 0.3) type = 'exploder';
  else if (nest.level >= 2 && Math.random() < 0.3) type = 'tank';
  else if (nest.level >= 1 && Math.random() < 0.4) type = 'runner';

  const base = MONSTER_TYPES[type];
  // УМЕНЬШЕН СКЕЙЛИНГ (было 0.1, стало 0.02)
  const hpScale = 1 + (state.day - 1) * 0.02;
  const dmgScale = 1 + (state.day - 1) * 0.02;

  monsters.push({
    x: nest.tx * TILE + TILE / 2 + (Math.random() - 0.5) * TILE,
    y: nest.ty * TILE + TILE / 2 + (Math.random() - 0.5) * TILE,
    type,
    hp: base.hp * hpScale,
    maxHp: base.hp * hpScale,
    damage: base.dmg * dmgScale,
    speed: base.speed,
    color: base.color,
    size: base.size,
    explodeDmg: base.explodeDmg ? base.explodeDmg * dmgScale : 0,
    explodeRadius: base.explodeRadius || 0,
    attackRange: TILE * 1.5,
    attackTimer: 0,
    targetNest: nest,
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
    
    ctx.fillStyle = '#3a1040';
    ctx.beginPath();
    ctx.ellipse(sx + TILE/2, sy + TILE/2, TILE * 0.6, TILE * 0.7, 0, 0, Math.PI * 2);
    ctx.fill();

    const pulse = 0.5 + 0.5 * Math.sin(performance.now() / 300 + n.tx);
    ctx.strokeStyle = `rgba(200, 50, 255, ${0.3 + pulse * 0.4})`;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(sx + TILE/2, sy + TILE/2, TILE * 0.4, 0, Math.PI * 2);
    ctx.stroke();
    
    const pct = Math.max(0, n.hp / n.maxHp);
    ctx.fillStyle = 'rgba(0,0,0,0.7)'; ctx.fillRect(sx + 2, sy - 6, TILE - 4, 4);
    ctx.fillStyle = '#e040e0'; ctx.fillRect(sx + 2, sy - 6, (TILE - 4) * pct, 4);
  }
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
  if (m.type === 'exploder') {
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
      target.hp -= (CORE_ATTACK_DAMAGE + state.coreDamageBonus);
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
      const dx = coreX - m.x, dy = coreY - m.y, dist = Math.hypot(dx, dy);
      if (dist > 0) { m.x += (dx / dist) * m.speed * TILE * dt; m.y += (dy / dist) * m.speed * TILE * dt; }
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
    ctx.fillStyle = 'rgba(0,0,0,0.3)'; ctx.beginPath(); ctx.ellipse(m.x, m.y + size / 2 - 2, size / 2.4, size / 6, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = m.color; ctx.beginPath(); ctx.arc(m.x, m.y, size / 2, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#100'; const eyeOff = size / 6, eyeY = m.y - size / 8;
    ctx.beginPath(); ctx.arc(m.x - eyeOff, eyeY, size / 10, 0, Math.PI * 2); ctx.arc(m.x + eyeOff, eyeY, size / 10, 0, Math.PI * 2); ctx.fill();
    const barW = size, barH = 4, barX = m.x - barW / 2, barY = m.y - size / 2 - 10;
    ctx.fillStyle = 'rgba(0,0,0,0.65)'; ctx.fillRect(barX, barY, barW, barH);
    ctx.fillStyle = m.color; ctx.fillRect(barX, barY, barW * (m.hp / m.maxHp), barH);
  }
  for (const e of explosions) {
    const p = 1 - (e.life / e.maxLife);
    ctx.fillStyle = `rgba(255, 100, 0, ${1 - p})`; ctx.beginPath(); ctx.arc(e.x, e.y, e.radius * p, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = `rgba(255, 255, 0, ${1 - p})`; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(e.x, e.y, e.radius * p, 0, Math.PI * 2); ctx.stroke();
  }
}

export function drawMonstersHUD() {
  if (monsters.length === 0) return;
  const text = `🐛 ${monsters.length}`;
  ctx.font = 'bold 16px sans-serif';
  const w = ctx.measureText(text).width + 24, h = 32;
  const x = canvas.width - w - 16, y = 70;
  ctx.fillStyle = 'rgba(140, 30, 30, 0.85)'; ctx.strokeStyle = 'rgba(230, 80, 80, 0.9)'; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.roundRect(x, y, w, h, 8); ctx.fill(); ctx.stroke();
  ctx.fillStyle = '#fff'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(text, x + w / 2, y + h / 2);
}
console.debug('[monsters] loaded');