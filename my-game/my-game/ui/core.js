'use strict';

import { state, showToast, RES } from '../game.js';
import { setHudIcon } from '../sprites.js';

export const uiDay = document.getElementById('ui-day');
export const uiIron = document.getElementById('ui-iron');
export const uiCopper = document.getElementById('ui-copper');
export const uiCoal = document.getElementById('ui-coal');
export const uiDNA = document.getElementById('ui-dna');
export const uiPollution = document.getElementById('ui-pollution');
export const uiPollutionLevel = document.getElementById('ui-pollution-level');
export const pollutionWidget = document.getElementById('pollution-widget');
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
  const isHidden = drawer.classList.contains('hidden');
  if (forceOpen === true || (forceOpen === undefined && isHidden)) {
    drawer.classList.remove('hidden'); drawerToggle.classList.add('open');
  } else {
    drawer.classList.add('hidden'); drawerToggle.classList.remove('open');
  }
}

export function openModal(title) {
  panelTitle.textContent = title; 
  modal.classList.remove('hidden'); 
  modalBackdrop.classList.remove('hidden');
  modal.style.pointerEvents = 'none'; 
  modalBackdrop.style.pointerEvents = 'none';
  clearTimeout(modalBlockTimer);
  modalBlockTimer = setTimeout(() => { 
    modal.style.pointerEvents = ''; 
    modalBackdrop.style.pointerEvents = ''; 
    modalBlockTimer = null; 
  }, 250);
}

export function closeModal() {
  modal.classList.add('hidden'); 
  modalBackdrop.classList.add('hidden');
  if (modalBlockTimer) { clearTimeout(modalBlockTimer); modalBlockTimer = null; }
  modal.style.pointerEvents = ''; 
  modalBackdrop.style.pointerEvents = '';
}

export function closePanel() { 
  closeModal(); 
  state.panel = null; 
  state.activeBuilding = null; 
  state.activeConveyor = null; 
}

export function applyHudIcons() {
  setHudIcon('dot-iron', RES.IRON); 
  setHudIcon('dot-copper', RES.COPPER); 
  setHudIcon('dot-coal', RES.COAL);
}