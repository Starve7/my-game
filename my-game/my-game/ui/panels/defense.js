'use strict';

import { state, inventory, RES, TILE } from '../../game.js';
import { TURRET_RANGE_BASE, TURRET_DAMAGE_BASE, TURRET_FIRE_INTERVAL, demolishBuilding } from '../../buildings.js';
import { panelContent, closePanel } from '../core.js';
import { playClick } from '../../audio.js';

export function renderTurretPanel(b) {
  const range = TURRET_RANGE_BASE + state.turretRangeBonus * TILE, rangeTiles = Math.round(range / TILE);
  const damage = TURRET_DAMAGE_BASE + state.turretDamageBonus, fireInterval = TURRET_FIRE_INTERVAL / state.turretFireRateMult;
  panelContent.innerHTML = `<div class="info-line">Урон: <strong>${damage}</strong> за выстрел</div><div class="info-line">Скорострельность: <strong>1 / ${fireInterval.toFixed(2)} сек</strong></div><div class="info-line">Радиус: <strong>${rangeTiles} тайлов</strong></div><div class="info-line">Патроны в ядре: <strong style="color:${inventory[RES.AMMO] > 0 ? '#7fbf7f' : '#e06060'}">${inventory[RES.AMMO]}</strong></div><div class="info-line" style="color:#888;font-size:12px;">Тратит 1 патрон за выстрел. Нет патронов — не стреляет.</div><div class="stats-box"><div class="row"><span>Убийств</span><span id="turret-kills">${b.totalKills || 0}</span></div><div class="row"><span>HP</span><span id="turret-hp">${Math.round(b.hp)} / ${Math.round(b.maxHp)}</span></div></div><button class="remove-btn" id="remove-btn">Удалить (вернуть 50%)</button>`;
  document.getElementById('remove-btn').addEventListener('click', () => { playClick(); demolishBuilding(b); closePanel(); });
}

export function renderRadarPanel(b) {
  panelContent.innerHTML = `<div class="info-line">Сканирует территорию в радиусе 10 клеток.</div><div class="info-line" style="color:#7fbf7f;font-size:12px;">Снимает туман войны с окружающей территории.</div><div class="info-line" style="color:#e06060;font-size:12px;">Если радар сломают, туман вернется!</div><button class="remove-btn" id="remove-btn">Удалить (вернуть 50%)</button>`;
  document.getElementById('remove-btn').addEventListener('click', () => { playClick(); demolishBuilding(b); closePanel(); });
}