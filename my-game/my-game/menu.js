'use strict';
import { state, showToast } from './game.js';
import { saveGame, loadSlotData, getSlotInfo, deleteSlot as deleteSaveSlot, captureGameData, restoreGameData, resetGameData } from './save.js';
import { startMenuBackground, stopMenuBackground } from './menu-bg.js';

const menuEl = document.getElementById('main-menu');
const slotsModal = document.getElementById('save-slots-modal');
const slotsList = document.getElementById('save-slots-list');
const slotsClose = document.getElementById('save-slots-close');
const slotsTitle = document.getElementById('save-slots-title');
const changelogModal = document.getElementById('changelog-modal');
const changelogClose = document.getElementById('changelog-close');
const changelogContent = document.getElementById('changelog-content');
const settingsModal = document.getElementById('menu-settings-modal');
const settingsClose = document.getElementById('menu-settings-close');
const settingsContent = document.getElementById('menu-settings-content');

const CHANGELOG = [
  { version: '0.2 alpha', date: 'Октябрь 2026', items: ['Главное меню с живым фоном', 'Система сохранений — 3 слота', 'Загрузка / удаление сохранений', 'Чейнджлог и настройки в меню', 'Кнопки «Сохранить» и «В меню» в настройках игры', 'Фиксы: звук по умолчанию, тосты изучения', 'Фиксы: конвейер, резак, сборщик'] },
  { version: '0.1 alpha', date: 'Октябрь 2026', items: ['Прототип: шахты, печи, лаборатория', 'Сборщик, химзавод, резак, склад', 'Турели и монстры', 'Изучение технологий', 'День/ночь и загрязнение'] },
];

export function showMainMenu() { state.inMenu = true; document.body.classList.add('in-menu'); if (menuEl) menuEl.classList.remove('hidden'); startMenuBackground(); }
export function hideMainMenu() { document.body.classList.remove('in-menu'); if (menuEl) menuEl.classList.add('hidden'); state.inMenu = false; stopMenuBackground(); }

if (menuEl) {
  menuEl.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-action]'); if (!btn) return;
    const action = btn.dataset.action;
    if (action === 'play') handlePlay();
    else if (action === 'continue') openSlotsModal('load');
    else if (action === 'leaderboard') showToast('🏆 Лидерборд — скоро');
    else if (action === 'accounts') showToast('👤 Аккаунт — скоро');
    else if (action === 'changelog') openChangelog();
    else if (action === 'settings') openSettings();
  });
}

function handlePlay() {
  if (state.gameStarted) { if (!confirm('Начать новую игру?\nТекущий прогресс будет потерян (если не сохранён).')) return; }
  resetGameData(); state.gameStarted = true; hideMainMenu();
}

export function openSlotsModal(mode = 'load') {
  if (!slotsModal) return; slotsModal.dataset.mode = mode;
  if (slotsTitle) slotsTitle.textContent = mode === 'save' ? '💾 Сохранить игру' : '📁 Загрузить игру';
  renderSlots(mode); slotsModal.classList.remove('hidden');
}
function closeSlotsModal() { if (slotsModal) slotsModal.classList.add('hidden'); }
if (slotsClose) slotsClose.addEventListener('click', closeSlotsModal);
if (slotsModal) slotsModal.addEventListener('click', (e) => { if (e.target === slotsModal) closeSlotsModal(); });

function renderSlots(mode) {
  if (!slotsList) return; let html = '';
  for (let slot = 1; slot <= 3; slot++) {
    const info = getSlotInfo(slot);
    if (info.empty) {
      html += `<div class="save-slot empty"><div class="save-slot-info"><div class="save-slot-title">Слот ${slot}</div><div class="save-slot-sub">Пусто</div></div><div class="save-slot-actions">${mode === 'save' ? `<button class="save-slot-action" data-save="${slot}">💾</button>` : ''}</div></div>`;
    } else {
      const date = new Date(info.timestamp);
      const dateStr = date.toLocaleString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
      html += `<div class="save-slot"><div class="save-slot-info"><div class="save-slot-title">Слот ${slot} · День ${info.day}</div><div class="save-slot-sub">${dateStr} · 🧬 ${info.dna} · ☣ ${info.pollution.toFixed(1)}%</div></div><div class="save-slot-actions">${mode === 'save' ? `<button class="save-slot-action" data-save="${slot}">💾</button>` : ''}${mode === 'load' ? `<button class="save-slot-action primary" data-load="${slot}">▶</button>` : ''}<button class="save-slot-action danger" data-delete="${slot}">🗑</button></div></div>`;
    }
  }
  slotsList.innerHTML = html;
  slotsList.querySelectorAll('[data-load]').forEach(btn => btn.addEventListener('click', () => loadGameFromSlot(parseInt(btn.dataset.load))));
  slotsList.querySelectorAll('[data-save]').forEach(btn => btn.addEventListener('click', () => saveGameToSlot(parseInt(btn.dataset.save))));
  slotsList.querySelectorAll('[data-delete]').forEach(btn => btn.addEventListener('click', () => {
    const slot = parseInt(btn.dataset.delete);
    if (confirm(`Удалить сохранение в слоте ${slot}?`)) { deleteSaveSlot(slot); renderSlots(mode); showToast(`🗑 Слот ${slot} удалён`); }
  }));
}

function saveGameToSlot(slot) {
  state.currentSaveSlot = slot;
  const ok = saveGame(slot, captureGameData());
  if (ok) { showToast(`💾 Сохранено в слот ${slot}`); closeSlotsModal(); } else showToast('Не удалось сохранить');
}

function loadGameFromSlot(slot) {
  const data = loadSlotData(slot);
  if (!data) { showToast('Не удалось загрузить'); return; }
  restoreGameData(data);
  state.currentSaveSlot = slot; state.gameStarted = true; state.inMenu = false;
  closeSlotsModal(); hideMainMenu(); showToast(`▶ Загружено из слота ${slot}`);
}

function openChangelog() {
  if (!changelogModal || !changelogContent) return;
  let html = '';
  for (const entry of CHANGELOG) {
    html += `<div class="changelog-entry"><div class="changelog-version">${entry.version} <span class="changelog-date">${entry.date}</span></div><ul class="changelog-list">${entry.items.map(item => `<li>${item}</li>`).join('')}</ul></div>`;
  }
  changelogContent.innerHTML = html; changelogModal.classList.remove('hidden');
}
if (changelogClose) changelogClose.addEventListener('click', () => changelogModal.classList.add('hidden'));
if (changelogModal) changelogModal.addEventListener('click', (e) => { if (e.target === changelogModal) changelogModal.classList.add('hidden'); });

function openSettings() { if (!settingsModal || !settingsContent) return; renderSettings(); settingsModal.classList.remove('hidden'); }
function renderSettings() {
  if (!settingsContent) return;
  settingsContent.innerHTML = `<button class="menu-settings-row" id="menu-sound-btn"><span>${state.soundEnabled ? '🔊' : '🔇'} Звук</span><span class="menu-settings-value">${state.soundEnabled ? 'ВКЛ' : 'ВЫКЛ'}</span></button><div class="menu-settings-hint">Больше настроек появится позже</div>`;
  const soundBtn = document.getElementById('menu-sound-btn');
  if (soundBtn) soundBtn.addEventListener('click', () => { state.soundEnabled = !state.soundEnabled; renderSettings(); });
}
if (settingsClose) settingsClose.addEventListener('click', () => settingsModal.classList.add('hidden'));
if (settingsModal) settingsModal.addEventListener('click', (e) => { if (e.target === settingsModal) settingsModal.classList.add('hidden'); });

if (typeof window !== 'undefined') { window.__openSaveSlots = (mode) => openSlotsModal(mode); window.__showMainMenu = showMainMenu; }
console.debug('[menu] loaded');