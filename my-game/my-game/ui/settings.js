'use strict';

import { state } from '../game.js';
import { playClick } from '../audio.js';
import { openModal, closeModal, panelContent } from './core.js';

export function openSettingsPanel() { openModal('⚙️ Настройки'); renderSettingsPanel(); }

function renderSettingsPanel() {
  panelContent.innerHTML = `
    <button class="option-btn ${state.soundEnabled ? 'selected' : ''}" id="settings-sound"><span class="opt-icon">${state.soundEnabled ? '🔊' : '🔇'}</span><span class="opt-label">Звук</span><span class="opt-cost">${state.soundEnabled ? 'ВКЛ' : 'ВЫКЛ'}</span></button>
    <button class="option-btn" id="settings-save"><span class="opt-icon">💾</span><span class="opt-label">Сохранить игру</span></button>
    <button class="option-btn" id="settings-menu"><span class="opt-icon">🏠</span><span class="opt-label">В главное меню</span></button>
    <div style="margin-top:20px;padding:16px;background:#141414;border-radius:8px;color:#888;font-size:12px;text-align:center;line-height:1.5;">Больше настроек появится позже:<br>автосейв · сложность · темы · язык</div>
  `;
  document.getElementById('settings-sound').addEventListener('click', () => { playClick(); state.soundEnabled = !state.soundEnabled; if (state.soundEnabled) playClick(); renderSettingsPanel(); });
  document.getElementById('settings-save').addEventListener('click', () => { playClick(); closeModal(); if (window.__openSaveSlots) window.__openSaveSlots('save'); });
  document.getElementById('settings-menu').addEventListener('click', () => {
    playClick();
    if (confirm('Выйти в главное меню?\nНесохранённый прогресс останется в памяти.')) { closeModal(); if (window.__showMainMenu) window.__showMainMenu(); }
  });
}