'use strict';

import { RES, RES_NAME, inventory, state, showToast } from '../game.js';
import { uiDay, uiDNA, uiPollution, uiPollutionLevel, pollutionWidget, hudResourcesContainer, hudSettingsBtn, panelContent, openModal } from './core.js';
import { formatPct, getPollutionLevel, checkPollutionThresholds, iconStyle } from './utils.js';
import { hasAvailableResearch } from '../research.js';
import { updateInfoCardLive } from './infoCard.js';
import { updateResearchLive } from './research.js';
import { updateStatsLive } from './stats.js';
import { updateActivePanelLive } from './panels/index.js';
import { playClick } from '../audio.js';

// Строит HTML-элементы для ресурсов в HUD
export function buildHudResourcesDOM() {
  if (!hudResourcesContainer) return;
  hudResourcesContainer.innerHTML = '';
  
  state.hudResources.forEach(resId => {
    const div = document.createElement('div');
    div.className = 'res';
    // ЖЕСТКО ЗАДАЕМ РАЗМЕРЫ И ЗАПРЕЩАЕМ СЖАТИЕ
    div.innerHTML = `<div class="res-dot" style="width:11px; height:11px; flex-shrink:0; display:block; border-radius:2px; ${iconStyle(resId)}"></div><span data-res-val="${resId}">${inventory[resId] || 0}</span>`;
    hudResourcesContainer.appendChild(div);
  });
}

// Открывает модалку настройки HUD
export function openHudSettings() {
  playClick();
  openModal('⚙️ Настройки HUD');
  
  let html = `<div style="font-size:12px; color:#888; margin-bottom:10px;">Выбери ресурсы, которые будут отображаться на верхней панели:</div>`;
  html += `<div style="display:grid; grid-template-columns:1fr 1fr; gap:8px;">`;
  
  for (const [idStr, name] of Object.entries(RES_NAME)) {
    const id = parseInt(idStr);
    const isSelected = state.hudResources.includes(id);
    
    html += `
      <label style="display:flex; align-items:center; gap:6px; background:#222; padding:8px; border-radius:6px; cursor:pointer; border:1px solid ${isSelected ? '#7fbf7f' : '#444'};">
        <input type="checkbox" data-res-id="${id}" ${isSelected ? 'checked' : ''} style="accent-color:#7fbf7f; width:16px; height:16px;">
        <div class="dot" style="width:16px; height:16px; flex-shrink:0; border-radius:2px; ${iconStyle(id)}"></div>
        <span style="font-size:12px; color:#ccc;">${name}</span>
      </label>
    `;
  }
  
  html += `</div>`;
  panelContent.innerHTML = html;

  panelContent.querySelectorAll('input[type="checkbox"]').forEach(cb => {
    cb.addEventListener('change', (e) => {
      playClick();
      const id = parseInt(e.target.dataset.resId);
      if (e.target.checked) {
        if (!state.hudResources.includes(id)) state.hudResources.push(id);
      } else {
        state.hudResources = state.hudResources.filter(r => r !== id);
      }
      buildHudResourcesDOM();
      openHudSettings(); // Перерисовываем модалку, чтобы обновить рамки
    });
  });
}

export function updateHUD() {
  if (uiDay) uiDay.textContent = `День ${state.day}`;
  if (uiDNA) uiDNA.textContent = state.dna;
  
  if (uiPollution) uiPollution.textContent = formatPct(state.pollution);
  const lvl = getPollutionLevel(state.pollution);
  if (pollutionWidget) {
    pollutionWidget.classList.remove('warn', 'danger', 'critical', 'extreme');
    if (lvl.cls) pollutionWidget.classList.add(lvl.cls);
  }
  if (uiPollutionLevel) uiPollutionLevel.textContent = lvl.label;
  
  checkPollutionThresholds(state.pollution);

  // Обновляем цифры в HUD
  if (hudResourcesContainer) {
    state.hudResources.forEach(resId => {
      const span = hudResourcesContainer.querySelector(`[data-res-val="${resId}"]`);
      if (span) span.textContent = inventory[resId] || 0;
    });
  }

  // Вызываем обновления интерфейсов
  updateInfoCardLive();
  updateActivePanelLive();
  updateResearchLive();
  updateStatsLive();
  
  updateResearchBadge();
}

export function updateResearchBadge() {
  const researchTabBtn = document.querySelector('.dtab[data-tab="research"]');
  if (!researchTabBtn) return;
  const old = researchTabBtn.querySelector('.research-badge'); 
  if (old) old.remove();
  if (hasAvailableResearch()) {
    const badge = document.createElement('span');
    badge.className = 'research-badge'; badge.textContent = '!';
    researchTabBtn.appendChild(badge);
  }
}

// Инициализация кнопки настроек HUD
if (hudSettingsBtn) {
  hudSettingsBtn.addEventListener('click', openHudSettings);
}