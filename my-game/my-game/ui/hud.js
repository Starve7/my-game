'use strict';

import { RES, inventory, state, showToast } from '../game.js';
import { uiDay, uiIron, uiCopper, uiCoal, uiDNA, uiPollution, uiPollutionLevel, pollutionWidget } from './core.js';
import { formatPct, getPollutionLevel, checkPollutionThresholds } from './utils.js';
import { hasAvailableResearch } from '../research.js';

// Импортируем лайв-обновления из других модулей (будут созданы в следующих пачках)
import { updateInfoCardLive } from './infoCard.js';
import { updateResearchLive } from './research.js';
import { updateStatsLive } from './stats.js';
import { updateActivePanelLive } from './panels/index.js';

export function updateHUD() {
  if (uiDay) uiDay.textContent = `День ${state.day}`;
  if (uiIron) uiIron.textContent = inventory[RES.IRON]; 
  if (uiCopper) uiCopper.textContent = inventory[RES.COPPER]; 
  if (uiCoal) uiCoal.textContent = inventory[RES.COAL];
  if (uiDNA) uiDNA.textContent = state.dna;
  
  if (uiPollution) uiPollution.textContent = formatPct(state.pollution);
  const lvl = getPollutionLevel(state.pollution);
  pollutionWidget.classList.remove('warn', 'danger', 'critical', 'extreme');
  if (lvl.cls) pollutionWidget.classList.add(lvl.cls);
  if (uiPollutionLevel) uiPollutionLevel.textContent = lvl.label;
  
  checkPollutionThresholds(state.pollution);

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