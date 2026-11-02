'use strict';

import { state, showToast, RES } from '../game.js';
import { setHudIcon } from '../sprites.js';

export const uiDay = document.getElementById('ui-day');
export const uiDNA = document.getElementById('ui-dna');
export const uiPollution = document.getElementById('ui-pollution');
export const uiPollutionLevel = document.getElementById('ui-pollution-level');
export const pollutionWidget = document.getElementById('pollution-widget');
export const hudResourcesContainer = document.getElementById('hud-resources');
export const hudSettingsBtn = document.getElementById('hud-settings-btn');
export const drawerToggle = document.getElementById('drawer-toggle');
export const drawer = document.getElementById('drawer');
export const drawerHide = document.getElementById('drawer-hide');
export const drawerTabs = document.querySelectorAll('.dtab');
export const modalBackdrop = document.getElementById('modal-backdrop');
export const modal = document.getElementById('modal');
export const modalClose = document.getElementById('modal-close');
export const panelTitle = document.getElementById('panel-title');
export const panelContent = document.getElementById('panel-content');
export const ghostPanel = document.getElementById('ghost-panel');
export const infoCardEl = document.getElementById('info-card');
export const infoCardContent = document.getElementById('info-card-content');

let modalBlockTimer = null;

export function toggleDrawer(forceOpen) {
  if (!drawer) return;
  const isHidden = drawer.classList.contains('hidden');
  if (forceOpen === true || (forceOpen === undefined && isHidden)) {
    drawer.classList.remove('hidden'); if (drawerToggle) drawerToggle.classList.add('open');
  } else {
    drawer.classList.add('hidden'); if (drawerToggle) drawerToggle.classList.remove('open');
  }
}

export function openModal(title) {
  if (!modal) return;
  if (panelTitle) panelTitle.textContent = title; 
  modal.classList.remove('hidden'); 
  if (modalBackdrop) modalBackdrop.classList.remove('hidden');
  modal.style.pointerEvents = 'none'; 
  if (modalBackdrop) modalBackdrop.style.pointerEvents = 'none';
  clearTimeout(modalBlockTimer);
  modalBlockTimer = setTimeout(() => { 
    modal.style.pointerEvents = ''; 
    if (modalBackdrop) modalBackdrop.style.pointerEvents = ''; 
    modalBlockTimer = null; 
  }, 250);
}

export function closeModal() {
  if (!modal) return;
  modal.classList.add('hidden'); 
  if (modalBackdrop) modalBackdrop.classList.add('hidden');
  if (modalBlockTimer) { clearTimeout(modalBlockTimer); modalBlockTimer = null; }
  modal.style.pointerEvents = ''; 
  if (modalBackdrop) modalBackdrop.style.pointerEvents = '';
}

export function closePanel() { 
  closeModal(); 
  state.panel = null; 
  state.activeBuilding = null; 
  state.activeConveyor = null; 
}

export function applyHudIcons() {
  if (typeof setHudIcon === 'function') {
    setHudIcon('dot-iron', RES.IRON); 
    setHudIcon('dot-copper', RES.COPPER); 
    setHudIcon('dot-coal', RES.COAL);
  }
}