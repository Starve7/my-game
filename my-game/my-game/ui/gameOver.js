'use strict';

import { state } from '../game.js';
import { deleteSlot } from '../save.js';
import { buildings } from '../buildings.js';

export function showGameOver() {
  if (state.currentSaveSlot != null) { deleteSlot(state.currentSaveSlot); state.currentSaveSlot = null; }
  
  const div = document.createElement('div'); div.id = 'game-over-screen';
  div.style.cssText = ['position:fixed', 'inset:0', 'background:rgba(10,0,0,0.9)', 'z-index:200', 'display:flex', 'flex-direction:column', 'align-items:center', 'justify-content:center', 'gap:16px', 'padding:24px', 'text-align:center', 'font-family:-apple-system,system-ui,sans-serif'].join(';');
  
  div.innerHTML = `
    <div style="font-size:56px;line-height:1;">💥</div>
    <div style="color:#f55;font-size:26px;font-weight:bold;letter-spacing:1px;">Ядро уничтожено!</div>
    <div style="color:#aaa;font-size:13px;margin-bottom:4px;">Сохранение этого слота было удалено</div>
    
    <div style="background:#1a0a0a; border:1px solid #442222; border-radius:12px; padding:16px 24px; width:min(320px, 100%); display:flex; flex-direction:column; gap:8px; font-size:14px; color:#ddd;">
      <div style="display:flex; justify-content:space-between; align-items:center;"><span>📅 Прожито дней:</span><b style="color:#fff">${state.day}</b></div>
      <div style="display:flex; justify-content:space-between; align-items:center;"><span>🏗 Построено зданий:</span><b style="color:#fff">${buildings.length}</b></div>
      <div style="display:flex; justify-content:space-between; align-items:center;"><span>🧬 Добыто ДНК:</span><b style="color:#fff">${state.dna}</b></div>
      <div style="display:flex; justify-content:space-between; align-items:center;"><span>💀 Убито монстров:</span><b style="color:#fff">${state.totalKills || 0}</b></div>
      <div style="display:flex; justify-content:space-between; align-items:center;"><span>☣ Загрязнение:</span><b style="color:#fff">${state.pollution.toFixed(1)}%</b></div>
    </div>

    <button id="game-over-restart" style="margin-top:12px; padding:16px 40px; background:linear-gradient(180deg,#ffb000,#d96a00); color:#1a0d00; border:3px solid #0a0a0a; border-radius:12px; font-size:16px; font-weight:900; letter-spacing:2px; cursor:pointer; font-family:inherit; text-transform:uppercase;">В меню</button>
  `;
  document.body.appendChild(div);
  document.getElementById('game-over-restart').addEventListener('click', () => location.reload());
}