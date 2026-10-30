'use strict';

import { RES_NAME, RES } from '../../game.js';
import { demolishBuilding } from '../../buildings.js';
import { panelContent, closePanel } from '../core.js';
import { iconStyle } from '../utils.js';
import { playClick } from '../../audio.js';

export function renderMiniCorePanel(b) {
  let rowsHtml = ''; const keys = Object.keys(b.items).filter(k => b.items[k] > 0);
  if (keys.length === 0) rowsHtml = '<div class="row"><span style="color:#888;">Пусто</span><span></span></div>';
  else for (const k of keys) { const resType = parseInt(k); rowsHtml += `<div class="row"><span><div class="dot" style="display:inline-block;width:12px;height:12px;vertical-align:middle;margin-right:6px;background-size:contain;background-repeat:no-repeat;background-position:center;image-rendering:pixelated;${iconStyle(resType)}"></div>${RES_NAME[resType]}</span><span>${b.items[k]} / 1000</span></div>`; }
  panelContent.innerHTML = `<div class="info-line">Мини-ядро принимает ресурсы и добавляет их в общий инвентарь.</div><div class="info-line" style="color:#e06060;font-size:12px;">⚠ При разрушении накопленные ресурсы пропадут!</div><div class="stats-box">${rowsHtml}</div><button class="remove-btn" id="remove-btn">Удалить (вернуть 50%)</button>`;
  document.getElementById('remove-btn').addEventListener('click', () => { playClick(); demolishBuilding(b); closePanel(); });
}