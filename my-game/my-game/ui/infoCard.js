'use strict';

import { RES, RES_NAME, inventory, state, oreAmount } from '../game.js';
import { getStorageTotal, STORAGE_CAPACITY, CONVEYOR_CAPACITY, getRecipeById, repairBuilding, repairConveyor } from '../buildings.js';
import { infoCardEl, infoCardContent } from './core.js';
import { showToast } from '../game.js';
import { openConveyorPanel } from './panels/index.js';
import { openInfoPanel } from './panels/index.js';
import { iconStyle } from './utils.js';
import { playClick } from '../audio.js';

let currentInfoCardEntity = null;

export function showInfoCard(e) {
  currentInfoCardEntity = e;
  let html = '', title = '', icon = '';

  if (e.isMonster) {
    const names = { grunt: 'Обычный', runner: 'Бегун', tank: 'Танк', exploder: 'Взрывник' };
    title = names[e.type] || 'Монстр'; icon = '👾';
    html = `<div class="card-header"><span>${icon} ${title}</span><button class="card-close">✕</button></div>
            <div class="card-row"><span>HP:</span><span id="card-monster-hp">${Math.ceil(e.hp)} / ${Math.ceil(e.maxHp)}</span></div>
            <div class="card-row"><span>Урон:</span><span>${Math.round(e.damage)}</span></div>
            <div class="card-row"><span>Скорость:</span><span>${e.speed.toFixed(1)}</span></div>`;
  } else if (e.isNest) {
    title = 'Кокон'; icon = '🕸️';
    html = `<div class="card-header"><span>${icon} ${title}</span><button class="card-close">✕</button></div>
            <div class="card-row"><span>HP:</span><span>${Math.ceil(e.hp)} / ${Math.ceil(e.maxHp)}</span></div>
            <div class="card-row"><span>Уровень:</span><span>${e.level}</span></div>
            <div class="card-row"><span>Заражение:</span><span>${e.radius} клеток</span></div>
            <div class="warn" style="margin-top:8px;">Уничтожать коконы можно будет с помощью ракет.</div>`;
  } else if (e.type === 'core') {
    title = 'Ядро'; icon = '💎';
    html = `<div class="card-header"><span>${icon} ${title}</span><button class="card-close">✕</button></div>
            <div class="card-row"><span>HP:</span><span id="card-core-hp">${Math.round(state.coreHP)} / 1000</span></div>
            <div class="card-row"><span>Загрязнение:</span><span id="card-core-poll">${state.pollution.toFixed(1)}%</span></div>
            <div class="card-row"><span>День:</span><span>${state.day}</span></div>`;
  } else if (e.type === 'minicore') {
    title = 'Мини-ядро'; icon = '💠';
    html = `<div class="card-header"><span>${icon} ${title}</span><button class="card-close">✕</button></div>
            <div class="card-row"><span>HP:</span><span>${Math.round(e.hp)} / ${Math.round(e.maxHp)}</span></div>`;
    const keys = Object.keys(e.items).filter(k => e.items[k] > 0);
    if (keys.length === 0) html += `<div class="card-row"><span>Пусто</span><span></span></div>`;
    else for (const k of keys) {
      html += `<div class="card-row"><span>${RES_NAME[k]}:</span><span>${e.items[k]} / 1000</span></div>`;
    }
  } else if (e.type === 'conveyor' || e.type === 'splitter' || e.type === 'underground') {
    if (e.type === 'conveyor') { title = 'Конвейер'; icon = '↔️'; }
    else if (e.type === 'splitter') { title = 'Распределитель'; icon = '↔️'; }
    else if (e.type === 'underground') { title = 'Подземный'; icon = '⬇️'; }

    html = `<div class="card-header"><span>${icon} ${title}</span><button class="card-close">✕</button></div>`;
    if (e.type === 'conveyor') {
      html += `<div class="card-row"><span>Направление:</span><span>${['Север', 'Восток', 'Юг', 'Запад'][e.dir]}</span></div>
               <div class="card-row"><span>Предметы:</span><span id="card-conv-items">${e.items.length} / ${CONVEYOR_CAPACITY}</span></div>`;
    } else if (e.type === 'splitter') {
      html += `<div class="card-row"><span>Выход 1:</span><span>${e.filterLeft ? RES_NAME[e.filterLeft] : 'Любой'}</span></div>
               <div class="card-row"><span>Выход 2:</span><span>${e.filterRight ? RES_NAME[e.filterRight] : 'Любой'}</span></div>`;
    } else if (e.type === 'underground') {
      html += `<div class="card-row"><span>Статус:</span><span>${e.partner ? '✅ Связан' : '❌ Нет пары'}</span></div>`;
    }
    
    html += `<div class="card-row"><span>HP:</span><span>${Math.round(e.hp)} / ${Math.round(e.maxHp)}</span></div>`;
    if (e.isBroken) html += `<button class="card-manage-btn" id="repair-action-btn" style="background:#7a5a2a; border-color:#c8a040;">🔧 Починить</button>`;
    else html += `<button class="card-manage-btn">Управление</button>`;
  } else {
    let name = '';
    if (e.type === 'mine') { name = 'Угольный бур'; icon = '⛏'; }
    else if (e.type === 'furnace') { name = 'Угольная печь'; icon = '🔥'; }
    else if (e.type === 'lab') { name = 'Лаборатория'; icon = '🧪'; }
    else if (e.type === 'cutter') { name = 'Резак'; icon = '✂️'; }
    else if (e.type === 'assembler') { name = 'Сборщик'; icon = '⚙️'; }
    else if (e.type === 'chemplant') { name = 'Химзавод'; icon = '🧪'; }
    else if (e.type === 'storage') { name = 'Склад'; icon = '📦'; }
    else if (e.type === 'turret') { name = 'Турель'; icon = '🎯'; }
    else if (e.type === 'radar') { name = 'Радар'; icon = '📡'; }
    else if (e.type === 'inserter') { name = 'Манипулятор'; icon = '🦾'; }
    title = name;
    if (e.isBroken) title += ' (Сломано)';

    html = `<div class="card-header"><span>${icon} ${title}</span><button class="card-close">✕</button></div>
            <div class="card-row"><span>HP:</span><span>${Math.round(e.hp)} / ${Math.round(e.maxHp)}</span></div>`;

    if (e.type === 'mine') {
      const amount = oreAmount[e.ty][e.tx];
      html += `<div class="card-row"><span>Добывает:</span><span>${RES_NAME[e.resourceType]}</span></div>`;
      html += `<div class="card-row"><span>Остаток в жиле:</span><span id="card-mine-amount">${amount <= 0 ? 'Истощено' : Math.round(amount)}</span></div>`;
      html += `<div class="card-row"><span>В буфере:</span><span id="card-mine-buf">${e.outputBuffer}</span></div>`;
    } else if (e.type === 'furnace') {
      html += `<div class="card-row"><span>Руда в буфере:</span><span id="card-furn-ore">${e.inputOre} ${e.inputOreType ? RES_NAME[e.inputOreType] : ''}</span></div>`;
      html += `<div class="card-row"><span>Уголь:</span><span id="card-furn-coal">${e.inputCoal}</span></div>`;
      html += `<div class="card-row"><span>Загрязнение:</span><span id="card-furn-poll">${((e.pollutionMade || 0)).toFixed(1)}%</span></div>`;
    } else if (e.type === 'lab') { html += `<div class="card-row"><span>ДНК в ядре:</span><span>${state.dna}</span></div>`; }
    else if (e.type === 'cutter') { html += `<div class="card-row"><span>Медных плит:</span><span id="card-cut-in">${e.inputBuffer}</span></div>`; }
    else if (e.type === 'assembler' || e.type === 'chemplant') {
      const recipe = e.selectedRecipe ? getRecipeById(e.selectedRecipe) : null;
      html += `<div class="card-row"><span>Рецепт:</span><span>${recipe ? recipe.name : '—'}</span></div>`;
      if (recipe) for (const [res, count] of recipe.inputs) {
        const have = e.inputBuffer[res] || 0;
        html += `<div class="card-row"><span>${RES_NAME[res]}:</span><span>${have} / ${count}</span></div>`;
      }
    } else if (e.type === 'storage') { html += `<div class="card-row"><span>Заполнено:</span><span>${getStorageTotal(e)} / ${STORAGE_CAPACITY}</span></div>`; }
    else if (e.type === 'turret') {
      html += `<div class="card-row"><span>Патроны:</span><span>${inventory[RES.AMMO]}</span></div>`;
      html += `<div class="card-row"><span>Убийств:</span><span>${e.totalKills || 0}</span></div>`;
    } else if (e.type === 'radar') { html += `<div class="card-row"><span>Радиус:</span><span>10 клеток</span></div>`; }
    else if (e.type === 'inserter') {
      html += `<div class="card-row"><span>Направление:</span><span>${['Север', 'Восток', 'Юг', 'Запад'][e.dir]}</span></div>`;
      html += `<div class="card-row"><span>В руке:</span><span>${e.heldItem ? RES_NAME[e.heldItem] : 'Пусто'}</span></div>`;
    }

    if (e.isBroken) html += `<button class="card-manage-btn" id="repair-action-btn" style="background:#7a5a2a; border-color:#c8a040;">🔧 Починить</button>`;
    else if (e.type !== 'inserter' && e.type !== 'radar') html += `<button class="card-manage-btn">Управление</button>`;
    else if (e.type === 'inserter') html += `<button class="card-manage-btn" style="background:transparent; border-color:#555; color:#aaa;">Управление</button>`;
  }

  infoCardContent.innerHTML = html;
  infoCardEl.classList.remove('hidden');

  infoCardContent.querySelector('.card-close').addEventListener('click', (ev) => { ev.stopPropagation(); playClick(); hideInfoCard(); });

  const repairBtn = infoCardContent.querySelector('#repair-action-btn');
  if (repairBtn) {
    repairBtn.addEventListener('click', (ev) => {
      ev.stopPropagation();
      playClick();
      let ok = false;
      if (e.type === 'conveyor' || e.type === 'splitter' || e.type === 'underground') ok = repairConveyor(e);
      else ok = repairBuilding(e);
      if (ok) { showToast('🔧 Починено'); hideInfoCard(); }
      else showToast('Не хватает ресурсов');
    });
  }

  const manageBtn = infoCardContent.querySelector('.card-manage-btn:not(#repair-action-btn)');
  if (manageBtn) {
    manageBtn.addEventListener('click', (ev) => {
      ev.stopPropagation();
      playClick();
      if (e.type === 'conveyor' || e.type === 'splitter' || e.type === 'underground') openConveyorPanel(e);
      else if (e.type === 'inserter') { showToast('Манипулятор не имеет настроек'); return; }
      else openInfoPanel(e);
      hideInfoCard();
    });
  }
}

export function hideInfoCard() { currentInfoCardEntity = null; infoCardEl.classList.add('hidden'); }

export function updateInfoCardLive() {
  if (!currentInfoCardEntity) return;
  const e = currentInfoCardEntity;
  if (e.isMonster) { 
    const hpEl = document.getElementById('card-monster-hp'); 
    if (hpEl) hpEl.textContent = `${Math.ceil(e.hp)} / ${Math.ceil(e.maxHp)}`; 
  }
  else if (e.type === 'core') {
    const hpEl = document.getElementById('card-core-hp'); if (hpEl) hpEl.textContent = `${Math.round(state.coreHP)} / 1000`;
    const pollEl = document.getElementById('card-core-poll'); if (pollEl) pollEl.textContent = `${state.pollution.toFixed(1)}%`;
  } else if (e.type === 'mine') {
    const amountEl = document.getElementById('card-mine-amount');
    if (amountEl) { const amt = oreAmount[e.ty][e.tx]; amountEl.textContent = amt <= 0 ? 'Истощено' : Math.round(amt); }
    const bufEl = document.getElementById('card-mine-buf'); if (bufEl) bufEl.textContent = e.outputBuffer;
  } else if (e.type === 'furnace') {
    const oreEl = document.getElementById('card-furn-ore'); if (oreEl) oreEl.textContent = `${e.inputOre} ${e.inputOreType ? RES_NAME[e.inputOreType] : ''}`;
    const coalEl = document.getElementById('card-furn-coal'); if (coalEl) coalEl.textContent = e.inputCoal;
    const pollEl = document.getElementById('card-furn-poll'); if (pollEl) pollEl.textContent = `${((e.pollutionMade || 0)).toFixed(1)}%`;
  } else if (e.type === 'cutter') { 
    const el = document.getElementById('card-cut-in'); if (el) el.textContent = e.inputBuffer; 
  }
  else if (e.type === 'conveyor') { 
    const el = document.getElementById('card-conv-items'); if (el) el.textContent = `${e.items.length} / ${CONVEYOR_CAPACITY}`; 
  }
  else if (e.type === 'lab') { 
    const el = document.getElementById('card-lab-dna'); if (el) el.textContent = state.dna; 
  }
}