'use strict';

import { state, RES_NAME, RES } from '../../game.js';
import { getStorageTotal, STORAGE_CAPACITY, CONVEYOR_CAPACITY, demolishBuilding, demolishConveyor, demolishSplitter, demolishUnderground } from '../../buildings.js';
import { panelContent, closePanel, openModal } from '../core.js';
import { iconStyle } from '../utils.js';
import { playClick } from '../../audio.js';

export function renderStoragePanel(b) {
  const total = getStorageTotal(b), pct = total / STORAGE_CAPACITY;
  let rowsHtml = ''; const keys = Object.keys(b.items).filter(k => b.items[k] > 0);
  if (keys.length === 0) rowsHtml = '<div class="row"><span style="color:#888;">Склад пуст</span><span></span></div>';
  else for (const k of keys) { const resType = parseInt(k); rowsHtml += `<div class="row"><span><div class="dot" style="display:inline-block;width:12px;height:12px;vertical-align:middle;margin-right:6px;background-size:contain;background-repeat:no-repeat;background-position:center;image-rendering:pixelated;${iconStyle(resType)}"></div>${RES_NAME[resType]}</span><span>${b.items[k]}</span></div>`; }
  panelContent.innerHTML = `<div class="info-line">Вместимость: <strong>${total} / ${STORAGE_CAPACITY}</strong></div><div style="height:8px;background:#333;border-radius:4px;margin:8px 0;overflow:hidden;"><div style="height:100%;background:#a0a0c0;width:${Math.round(pct * 100)}%;"></div></div><div class="info-line" style="color:#e06060;font-size:12px;">⚠ При разрушении всё содержимое пропадёт</div><div class="stats-box">${rowsHtml}</div><button class="remove-btn" id="remove-btn">Удалить (вернуть 50%)</button>`;
  document.getElementById('remove-btn').addEventListener('click', () => { playClick(); demolishBuilding(b); closePanel(); });
}

export function renderInserterPanel(b) {
  panelContent.innerHTML = `<div class="info-line">Берет предметы сзади, кладет спереди.</div><div class="info-line">Направление: <strong>${['Север', 'Восток', 'Юг', 'Запад'][b.dir]}</strong></div><div class="info-line" style="margin-top:8px;">В руке: <strong>${b.heldItem ? RES_NAME[b.heldItem] : 'Пусто'}</strong></div><button class="remove-btn" id="remove-btn" style="margin-top:16px;">Удалить (вернуть 50%)</button>`;
  document.getElementById('remove-btn').addEventListener('click', () => { playClick(); demolishBuilding(b); closePanel(); });
}

export function renderConveyorPanel(c) {
  if (c.type === 'conveyor') {
    const dirName = ['Север', 'Восток', 'Юг', 'Запад'][c.dir];
    panelContent.innerHTML = `<div class="info-line">Направление: <strong id="conveyor-dir-name">${dirName}</strong></div><div style="display:flex; gap:6px; margin:12px 0;"><button class="option-btn ${c.dir === 0 ? 'selected' : ''}" style="flex:1; padding:14px; font-size:22px; justify-content:center;" data-dir="0">↑</button><button class="option-btn ${c.dir === 1 ? 'selected' : ''}" style="flex:1; padding:14px; font-size:22px; justify-content:center;" data-dir="1">→</button><button class="option-btn ${c.dir === 2 ? 'selected' : ''}" style="flex:1; padding:14px; font-size:22px; justify-content:center;" data-dir="2">↓</button><button class="option-btn ${c.dir === 3 ? 'selected' : ''}" style="flex:1; padding:14px; font-size:22px; justify-content:center;" data-dir="3">←</button></div><div class="info-line">Предметов на ленте: <strong id="conveyor-items">${c.items.length}</strong> / ${CONVEYOR_CAPACITY}</div><button class="remove-btn" id="remove-btn">Удалить (вернуть 50%)</button>`;
    panelContent.querySelectorAll('[data-dir]').forEach(btn => {
      btn.addEventListener('click', () => {
        playClick();
        c.dir = parseInt(btn.dataset.dir);
        panelContent.querySelectorAll('[data-dir]').forEach(b => b.classList.toggle('selected', parseInt(b.dataset.dir) === c.dir));
        const nameEl = document.getElementById('conveyor-dir-name');
        if (nameEl) nameEl.textContent = ['Север', 'Восток', 'Юг', 'Запад'][c.dir];
      });
    });
    document.getElementById('remove-btn').addEventListener('click', () => { playClick(); demolishConveyor(c); closePanel(); });
  
  } else if (c.type === 'splitter') {
    const filtersHtml = (currentFilter) => {
      let opt = `<option value="null">Любой</option>`;
      for (const key in RES_NAME) {
        opt += `<option value="${key}" ${currentFilter === parseInt(key) ? 'selected' : ''}>${RES_NAME[key]}</option>`;
      }
      return opt;
    };
    
    panelContent.innerHTML = `
      <div class="info-line">Разделяет поток на 2 направления.</div>
      <div class="info-line" style="margin-top:8px;">Выход 1: <select id="split-left" style="background:#222; color:#fff; border:1px solid #555; padding:6px; border-radius:4px; margin-left:8px;">${filtersHtml(c.filterLeft)}</select></div>
      <div class="info-line" style="margin-top:8px;">Выход 2: <select id="split-right" style="background:#222; color:#fff; border:1px solid #555; padding:6px; border-radius:4px; margin-left:8px;">${filtersHtml(c.filterRight)}</select></div>
      <button class="remove-btn" id="remove-btn" style="margin-top:16px;">Удалить (вернуть 50%)</button>
    `;
    
    document.getElementById('split-left').addEventListener('change', (e) => { 
      c.filterLeft = e.target.value === 'null' ? null : parseInt(e.target.value); 
    });
    document.getElementById('split-right').addEventListener('change', (e) => { 
      c.filterRight = e.target.value === 'null' ? null : parseInt(e.target.value); 
    });
    document.getElementById('remove-btn').addEventListener('click', () => { playClick(); demolishSplitter(c); closePanel(); });

  } else if (c.type === 'underground') {
    const status = c.partner ? '✅ Связан' : '❌ Нет выхода';
    panelContent.innerHTML = `
      <div class="info-line">Статус: <strong>${status}</strong></div>
      <div class="info-line">Длина туннеля: до 4 тайлов</div>
      ${!c.partner ? '<div class="warn">Постройте второй конец на той же линии</div>' : ''}
      <button class="remove-btn" id="remove-btn" style="margin-top:16px;">Удалить (вернуть 50%)</button>
    `;
    document.getElementById('remove-btn').addEventListener('click', () => { playClick(); demolishUnderground(c); closePanel(); });
  }
}