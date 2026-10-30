'use strict';

import { RES_COLOR, showToast } from '../game.js';
import { spriteUrl } from '../sprites.js';

export const POLLUTION_THRESHOLDS = [100, 300, 600, 1000];
export let lastThresholdShown = 0;

export function checkPollutionThresholds(pollution) {
  for (const t of POLLUTION_THRESHOLDS) {
    if (pollution >= t && lastThresholdShown < t) { 
      showToast(`☣ Загрязнение ${t}%`); 
      lastThresholdShown = t; 
    }
  }
}

export function getPollutionLevel(p) {
  if (p >= 1000) return { cls: 'extreme', label: 'катастрофа' };
  if (p >= 600)  return { cls: 'critical', label: 'ужасное' };
  if (p >= 300)  return { cls: 'danger', label: 'сильное' };
  if (p >= 100)  return { cls: 'warn', label: 'среднее' };
  return { cls: '', label: 'чисто' };
}

export function formatPct(p) { return (p < 10 ? p.toFixed(1) : Math.floor(p).toString()) + '%'; }

export function iconStyle(resType) {
  const url = spriteUrl(resType);
  if (url) return `background-image:${url}; background-size:contain; background-repeat:no-repeat; background-position:center;`;
  return `background-color:${RES_COLOR[resType] || '#888'};`; // Используем background-color, чтобы не сбрасывать размеры
}

export function costHtml(amount, resType) {
  return `${amount}<span style="display:inline-block;width:12px;height:12px;vertical-align:middle;margin:0 2px 2px 0;border-radius:2px;background-size:contain;background-repeat:no-repeat;background-position:center;image-rendering:pixelated;${iconStyle(resType)}"></span>`;
}

export const BUILDING_ICONS = { 
  mine: '⛏', furnace: '🔥', lab: '🧪', cutter: '✂️', assembler: '⚙️', chemplant: '🧪', 
  storage: '📦', turret: '🎯', conveyor: '↔️', splitter: '↔️', underground: '⬇️', 
  radar: '📡', inserter: '🦾', minicore: '💠' 
};