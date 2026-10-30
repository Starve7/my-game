'use strict';

import { drawerToggle, drawerHide, drawerTabs, modalClose, modalBackdrop, toggleDrawer, closeModal } from './core.js';
import { state, showToast } from '../game.js';
import { playClick } from '../audio.js';
import { openBuildPanel } from './build.js';
import { openResearchPanel } from './research.js';
import { openStatsPanel } from './stats.js';
import { openSettingsPanel } from './settings.js';
import { buildHudResourcesDOM } from './hud.js';

export * from './core.js';
export * from './utils.js';
export * from './hud.js';
export * from './infoCard.js';
export * from './ghost.js';
export * from './build.js';
export * from './research.js';
export * from './stats.js';
export * from './settings.js';
export * from './gameOver.js';
export * from './panels/index.js';

// Инициализация меню
drawerToggle.addEventListener('click', () => { playClick(); toggleDrawer(); });
drawerHide.addEventListener('click', () => { toggleDrawer(false); });
modalClose.addEventListener('click', () => { playClick(); closeModal(); });
modalBackdrop.addEventListener('click', () => { closeModal(); });

drawerTabs.forEach(btn => {
  btn.addEventListener('click', () => {
    playClick();
    const tab = btn.dataset.tab;

    if (tab === 'demolish') {
      state.demolishMode = !state.demolishMode;
      btn.classList.toggle('active', state.demolishMode);
      showToast(state.demolishMode ? '🔨 Режим сноса ВКЛ' : 'Режим сноса ВЫКЛ');
      return;
    }

    state.demolishMode = false;
    const demolishBtn = document.querySelector('.dtab[data-tab="demolish"]');
    if (demolishBtn) demolishBtn.classList.remove('active');

    drawerTabs.forEach(b => b.classList.toggle('active', b === btn));
    if (tab === 'build') { state.panel = 'build'; openBuildPanel(); }
    else if (tab === 'research') { openResearchPanel(); }
    else if (tab === 'stats') { state.panel = 'stats'; openStatsPanel(); }
    else if (tab === 'settings') { state.panel = 'settings'; openSettingsPanel(); }
  });
});

// Строим HUD при загрузке и обновляем, когда подгрузятся PNG
buildHudResourcesDOM();
setTimeout(buildHudResourcesDOM, 500);
setTimeout(buildHudResourcesDOM, 1500);