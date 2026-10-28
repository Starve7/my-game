'use strict';

import { inventory, state, addPopup, TILE, WORLD_W, WORLD_H, RES, RES_COLOR, ctx } from '../game.js';
import { playTurretShot } from '../audio.js';
import { drawBuildingSprite, isReady, buildingImages } from '../sprites.js';
import { CORE, fog } from '../world.js';
import { 
  Building, turretBeams, buildings,
  BUILDING_HP, TURRET_RANGE_BASE, TURRET_FIRE_INTERVAL, TURRET_AMMO_PER_SHOT, 
  TURRET_DAMAGE_BASE, TURRET_HP_BASE, TURRET_CORPS_COST, TURRET_ENGINE_COST, 
  TURRET_CIRCUIT_COST, RADAR_COST 
} from './data.js';
import { drawProgressBar, drawHpCircle } from './utils.js';

export class Turret extends Building {
  constructor(tx, ty) {
    super(tx, ty, 'turret', TURRET_HP_BASE + state.turretHpBonus);
    this.paidCost = { corps: TURRET_CORPS_COST, engine: TURRET_ENGINE_COST, circuit: TURRET_CIRCUIT_COST };
    this.fireTimer = 0; this.totalKills = 0;
  }
  update(dt) {
    const range = TURRET_RANGE_BASE + state.turretRangeBonus * TILE;
    const fireInterval = TURRET_FIRE_INTERVAL / state.turretFireRateMult;
    const bx = this.tx * TILE + TILE / 2, by = this.ty * TILE + TILE / 2;
    this.fireTimer += dt;
    if (this.fireTimer >= fireInterval) {
      let target = null, nearestDist = Infinity;
      for (const m of window.__monsters || []) {
        const d = Math.hypot(m.x - bx, m.y - by);
        if (d <= range && d < nearestDist) { target = m; nearestDist = d; }
      }
      if (target) {
        if (inventory[RES.AMMO] >= TURRET_AMMO_PER_SHOT) {
          inventory[RES.AMMO] -= TURRET_AMMO_PER_SHOT;
          target.hp -= (TURRET_DAMAGE_BASE + state.turretDamageBonus);
          this.fireTimer -= fireInterval; playTurretShot();
          turretBeams.push({ fromX: bx, fromY: by, toX: target.x, toY: target.y, life: 0.1 });
          if (target.hp <= 0) {
            const arr = window.__monsters;
            if (arr) { const idx = arr.indexOf(target); if (idx !== -1) arr.splice(idx, 1); }
            this.totalKills = (this.totalKills || 0) + 1;
            if (window.__handleMonsterDeath) window.__handleMonsterDeath(target);
          }
        } else this.fireTimer = fireInterval;
      } else if (this.fireTimer > fireInterval) this.fireTimer = fireInterval;
    }
  }
  drawSpecific() {
    const sx = this.tx * TILE, sy = this.ty * TILE;
    if (!drawBuildingSprite('turret', sx, sy, TILE)) {
      ctx.fillStyle = '#4a4a4a'; ctx.beginPath(); ctx.arc(sx + TILE/2, sy + TILE/2, TILE/2 - 2, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#6a6a7a'; ctx.beginPath(); ctx.arc(sx + TILE/2, sy + TILE/2, TILE/2 - 4, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#3a3a4a'; ctx.beginPath(); ctx.arc(sx + TILE/2, sy + TILE/2, TILE/2 - 8, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = '#202030'; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(sx + TILE/2, sy + TILE/2); ctx.lineTo(sx + TILE/2, sy + 4); ctx.stroke();
    }
    if (inventory[RES.AMMO] <= 0) {
      if (Math.sin(performance.now() / 200) > 0) { ctx.fillStyle = '#ff5050'; ctx.font = 'bold 14px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('!', sx + TILE / 2, sy + TILE - 4); }
    } else {
      ctx.fillStyle = '#c0a040'; ctx.font = 'bold 9px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(inventory[RES.AMMO], sx + TILE / 2, sy + TILE - 4);
    }
  }
}

export class Radar extends Building {
  constructor(tx, ty) {
    super(tx, ty, 'radar', BUILDING_HP.radar);
    this.paidCost = RADAR_COST;
  }
  drawSpecific() {
    const sx = this.tx * TILE, sy = this.ty * TILE;
    if (!drawBuildingSprite('radar', sx, sy, TILE)) {
      ctx.fillStyle = '#2a3a2a'; ctx.fillRect(sx + 2, sy + 2, TILE - 4, TILE - 4);
      ctx.fillStyle = '#3a5a3a'; ctx.fillRect(sx + 4, sy + 4, TILE - 8, TILE - 8);
      ctx.fillStyle = '#7fbf7f'; ctx.beginPath(); ctx.arc(sx + TILE/2, sy + TILE/2, 8, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = '#a0e0a0'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(sx + TILE/2, sy + TILE/2, 10, 0, Math.PI * 2); ctx.stroke();
    }
  }
}

export function updateFog() {
  for (let y = 0; y < WORLD_H; y++) for (let x = 0; x < WORLD_W; x++) fog[y][x] = 1;

  const CORE_VISION = 12;
  for (let y = -CORE_VISION; y <= CORE_VISION; y++) {
    for (let x = -CORE_VISION; x <= CORE_VISION; x++) {
      if (x*x + y*y <= CORE_VISION*CORE_VISION) {
        const nx = CORE.x + x, ny = CORE.y + y;
        if (nx >= 0 && nx < WORLD_W && ny >= 0 && ny < WORLD_H) fog[ny][nx] = 0;
      }
    }
  }

  const RADAR_RADIUS = 10;
  for (const b of buildings) {
    if (b.type === 'radar' && !b.isBroken) {
      for (let y = -RADAR_RADIUS; y <= RADAR_RADIUS; y++) {
        for (let x = -RADAR_RADIUS; x <= RADAR_RADIUS; x++) {
          if (x*x + y*y <= RADAR_RADIUS*RADAR_RADIUS) {
            const nx = b.tx + x, ny = b.ty + y;
            if (nx >= 0 && nx < WORLD_W && ny >= 0 && ny < WORLD_H) fog[ny][nx] = 0;
          }
        }
      }
    }
  }
}