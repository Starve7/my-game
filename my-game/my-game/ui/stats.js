'use strict';

import { RES, inventory, state, STAT_WINDOW_SEC } from '../game.js';
import { openModal, panelContent } from './core.js';
import { iconStyle } from './utils.js';

const STATS_TABS = [
  { id: 'resources', name: '📦 Ресурсы' },
  { id: 'energy', name: '⚡ Электричество' },
  { id: 'liquids', name: '💧 Жидкости' }
];
let activeStatsTab = 'resources';

// Подкатегории для ресурсов
const RES_CATEGORIES = [
  { id: 'raw', name: '🪨 Сырьё' },
  { id: 'industry', name: '⚙️ Промышленность' },
  { id: 'misc', name: '📦 Разное' }
];
let activeResCategory = 'raw';

const STAT_ROWS = [
  // Сырьё
  { key: 'iron', name: 'Железо', res: RES.IRON, cat: 'raw' },
  { key: 'copper', name: 'Медь', res: RES.COPPER, cat: 'raw' },
  { key: 'coal', name: 'Уголь', res: RES.COAL, cat: 'raw' },
  // Промышленность
  { key: 'plate_iron', name: 'Железные плиты', res: RES.PLATE_IRON, cat: 'industry' },
  { key: 'plate_copper', name: 'Медные плиты', res: RES.PLATE_COPPER, cat: 'industry' },
  { key: 'wire', name: 'Провод', res: RES.WIRE, cat: 'industry' },
  { key: 'gear', name: 'Шестерня', res: RES.GEAR, cat: 'industry' },
  { key: 'corps', name: 'Корпус', res: RES.CORPS, cat: 'industry' },
  { key: 'circuit', name: 'Электросхема', res: RES.CIRCUIT, cat: 'industry' },
  { key: 'engine', name: 'Двигатель', res: RES.ENGINE, cat: 'industry' },
  // Разное
  { key: 'powder', name: 'Порох', res: RES.POWDER, cat: 'misc' },
  { key: 'ammo', name: 'Патроны', res: RES.AMMO, cat: 'misc' },
  { key: 'dna', name: '🧬 ДНК', res: null, cat: 'misc' },
];

function getStatValue(key) {
  if (key === 'dna') return state.dna;
  const row = STAT_ROWS.find(r => r.key === key);
  return (row && row.res) ? inventory[row.res] : 0;
}

function getStatRate(key) {
  const hist = state.statHistory[key];
  if (!hist || hist.length < 2) return 0;
  const dt = hist[hist.length - 1].t - hist[0].t;
  return dt < 1 ? 0 : (hist[hist.length - 1].v - hist[0].v) / dt * 60;
}

function makeSparkline(history, options = {}) {
  const { width = 70, height = 24, color = '#7fbf7f' } = options;
  if (!history || history.length < 2) {
    return `<svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" class="sparkline-svg"></svg>`;
  }
  const t0 = history[0].t;
  const t1 = history[history.length - 1].t;
  const tRange = Math.max(0.1, t1 - t0);
  let minV = Infinity, maxV = -Infinity;
  for (const h of history) {
    if (h.v < minV) minV = h.v;
    if (h.v > maxV) maxV = h.v;
  }
  const vRange = Math.max(1, maxV - minV);
  const points = [];
  for (const h of history) {
    const x = ((h.t - t0) / tRange) * width;
    const y = height - ((h.v - minV) / vRange) * (height - 4) - 2;
    points.push(`${x.toFixed(1)},${y.toFixed(1)}`);
  }
  const areaPoints = [`0,${height}`, ...points, `${width},${height}`].join(' ');
  return `<svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" class="sparkline-svg">
    <polygon points="${areaPoints}" fill="${color}" fill-opacity="0.15"/>
    <polyline points="${points.join(' ')}" fill="none" stroke="${color}" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
  </svg>`;
}

function renderStatRow(row) {
  const val = getStatValue(row.key);
  const rate = getStatRate(row.key);
  const hist = state.statHistory[row.key] || [];
  let rateClass = 'zero', rateText = '0', color = '#666';
  if (rate > 0.5) { rateClass = 'positive'; rateText = '+' + Math.round(rate); color = '#7fbf7f'; }
  else if (rate < -0.5) { rateClass = 'negative'; rateText = Math.round(rate).toString(); color = '#e06060'; }
  
  const iconHtml = row.res
    ? `<div class="stat-row-icon" style="${iconStyle(row.res)}"></div>`
    : `<div class="stat-row-icon stat-row-icon-dna">🧬</div>`;
  const sparkline = makeSparkline(hist, { width: 70, height: 24, color });
  return `
    <div class="stat-row-game" data-stat-key="${row.key}">
      ${iconHtml}
      <div class="stat-row-info">
        <div class="stat-row-name">${row.name}</div>
        <div class="stat-row-rate ${rateClass}" data-rate>${rateText} /мин</div>
      </div>
      <div class="stat-row-sparkline" data-spark>${sparkline}</div>
      <div class="stat-row-val" data-val>${val}</div>
    </div>
  `;
}

export function openStatsPanel() { openModal('📊 Статистика'); renderStatsPanel(); }

function renderStatsPanel() {
  // Главные вкладки
  let tabsHtml = `<div class="stats-tabs">`;
  for (const tab of STATS_TABS) {
    const isActive = tab.id === activeStatsTab;
    tabsHtml += `<button class="stats-tab ${isActive ? 'active' : ''}" data-stat-tab="${tab.id}">${tab.name}</button>`;
  }
  tabsHtml += `</div>`;

  let contentHtml = '';

  if (activeStatsTab === 'resources') {
    // Подвкладки для ресурсов
    let subTabsHtml = `<div style="display:flex; gap:4px; margin-bottom:12px; overflow-x:auto; padding-bottom:4px;">`;
    for (const sub of RES_CATEGORIES) {
      const isSubActive = sub.id === activeResCategory;
      subTabsHtml += `<button data-res-cat="${sub.id}" style="flex-shrink:0; padding:4px 10px; border-radius:6px; font-size:11px; font-weight:bold; cursor:pointer; border:1px solid ${isSubActive ? '#c8a040' : '#444'}; background:${isSubActive ? '#3a3020' : '#1a1a1a'}; color:${isSubActive ? '#ffd700' : '#888'};">${sub.name}</button>`;
    }
    subTabsHtml += `</div>`;

    // Считаем общую сумму только для текущей категории (или для всех?)
    // Лучше считать общую сумму для всего, чтобы не путать.
    let totalAmount = 0, totalRate = 0;
    for (const row of STAT_ROWS) {
      if (row.key === 'dna') continue;
      totalAmount += getStatValue(row.key);
      totalRate += getStatRate(row.key);
    }
    const totalRateClass = totalRate > 0.5 ? 'positive' : totalRate < -0.5 ? 'negative' : '';
    const totalRateText = totalRate > 0.5 ? '+' + Math.round(totalRate) : totalRate < -0.5 ? Math.round(totalRate).toString() : '0';

    contentHtml += `<div class="stats-overview">
      <div class="stats-overview-item">
        <div class="stats-overview-label">Всего</div>
        <div class="stats-overview-value">${Math.round(totalAmount)}</div>
      </div>
      <div class="stats-overview-item">
        <div class="stats-overview-label">Прирост</div>
        <div class="stats-overview-value ${totalRateClass}">${totalRateText}/м</div>
      </div>
      <div class="stats-overview-item">
        <div class="stats-overview-label">ДНК</div>
        <div class="stats-overview-value">${state.dna}</div>
      </div>
    </div>`;

    contentHtml += subTabsHtml;
    contentHtml += `<div class="stats-section-title">Список ресурсов</div><div class="stats-list">`;
    
    // Фильтруем строки по активной подкатегории
    const filteredRows = STAT_ROWS.filter(r => r.cat === activeResCategory);
    for (const row of filteredRows) {
      contentHtml += renderStatRow(row);
    }
    
    contentHtml += `</div>`;
    contentHtml += `<div class="stats-footer-hint">График за последние ${STAT_WINDOW_SEC} секунд</div>`;

  } else if (activeStatsTab === 'energy') {
    contentHtml += `<div class="stats-coming-soon">
      <div class="stats-coming-soon-icon">⚡</div>
      <div class="stats-coming-soon-title">Электричество</div>
      <div class="stats-coming-soon-text">Скоро здесь будет статистика производства и потребления энергии</div>
    </div>`;
  } else if (activeStatsTab === 'liquids') {
    contentHtml += `<div class="stats-coming-soon">
      <div class="stats-coming-soon-icon">💧</div>
      <div class="stats-coming-soon-title">Жидкости</div>
      <div class="stats-coming-soon-text">Скоро здесь будет статистика по нефти, воде и кислотам</div>
    </div>`;
  }

  panelContent.innerHTML = tabsHtml + contentHtml;

  // Обработчики главных вкладок
  panelContent.querySelectorAll('[data-stat-tab]').forEach(btn => {
    btn.addEventListener('click', () => {
      activeStatsTab = btn.dataset.statTab;
      renderStatsPanel();
    });
  });

  // Обработчики подвкладок ресурсов
  panelContent.querySelectorAll('[data-res-cat]').forEach(btn => {
    btn.addEventListener('click', () => {
      activeResCategory = btn.dataset.resCat;
      renderStatsPanel();
    });
  });
}

export function updateStatsLive() {
  if (state.panel !== 'stats' || activeStatsTab !== 'resources') return;
  
  // Обновляем только те строки, которые сейчас видны
  const filteredRows = STAT_ROWS.filter(r => r.cat === activeResCategory);
  
  filteredRows.forEach(row => {
    const rowEl = panelContent.querySelector(`[data-stat-key="${row.key}"]`);
    if (!rowEl) return;

    const val = getStatValue(row.key);
    const rate = getStatRate(row.key);
    const hist = state.statHistory[row.key] || [];

    const valEl = rowEl.querySelector('[data-val]');
    if (valEl) valEl.textContent = val;

    const rateEl = rowEl.querySelector('[data-rate]');
    let rateClass = '', rateText = '0', color = '#666';
    if (rate > 0.5) { rateClass = 'positive'; rateText = '+' + Math.round(rate); color = '#7fbf7f'; }
    else if (rate < -0.5) { rateClass = 'negative'; rateText = Math.round(rate).toString(); color = '#e06060'; }
    
    if (rateEl) {
      rateEl.className = 'stat-row-rate ' + rateClass;
      rateEl.textContent = rateText + ' /мин';
    }

    const sparkEl = rowEl.querySelector('[data-spark]');
    if (sparkEl) sparkEl.innerHTML = makeSparkline(hist, { width: 70, height: 24, color });
  });
}