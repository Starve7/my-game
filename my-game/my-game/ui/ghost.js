'use strict';

import { state } from '../game.js';
import { CONVEYOR_COST, UNDERGROUND_COST, MINE_COST, FURNACE_COST, INSERTER_COST, tryConveyorDragStep, tryPlaceBuilding } from '../buildings.js';
import { isBuildingUnlocked } from '../research.js';
import { ghostPanel } from './core.js';
import { costHtml, BUILDING_ICONS } from './utils.js';
import { playClick } from '../audio.js';

export function updateGhostPanel() {
  if (!state.selectedBuilding) { ghostPanel.classList.add('hidden'); state.ghostPos = null; return; }
  const type = state.selectedBuilding;
  const isConveyor = type === 'conveyor' || type === 'underground' || type === 'splitter' || type === 'inserter';
  const currentDir = isConveyor ? state.newConveyorDir : state.savedOutputDir;

  let label, cost = null;
  if (type === 'mine') { label = 'Угольный бур'; cost = MINE_COST; }
  else if (type === 'furnace') { label = 'Угольная печь'; cost = FURNACE_COST; }
  else if (type === 'conveyor') { label = 'Конвейер'; cost = CONVEYOR_COST; }
  else if (type === 'underground') { label = 'Подземный'; cost = UNDERGROUND_COST.iron; }
  else if (type === 'splitter') { label = 'Распределитель'; }
  else if (type === 'lab') label = 'Лаборатория';
  else if (type === 'cutter') label = 'Резак';
  else if (type === 'assembler') label = 'Сборщик';
  else if (type === 'chemplant') label = 'Химзавод';
  else if (type === 'storage') label = 'Склад';
  else if (type === 'turret') label = 'Турель';
  else if (type === 'radar') label = 'Радар';
  else if (type === 'inserter') label = 'Манипулятор';
  else if (type === 'minicore') label = 'Мини-ядро';

  const icon = BUILDING_ICONS[type] || '?';
  const costStr = cost ? ` · ${costHtml(cost, 1)}` : ''; // 1 = железо (RES.IRON)
  const dirs = ['↑', '→', '↓', '←'];
  let dirsHtml = '';
  
  if (!isConveyor) dirsHtml += `<button data-ghost-dir="null" class="${currentDir === null ? 'active' : ''}" style="font-size:11px;">—</button>`;
  for (let i = 0; i < 4; i++) dirsHtml += `<button data-ghost-dir="${i}" class="${currentDir === i ? 'active' : ''}">${dirs[i]}</button>`;

  ghostPanel.innerHTML = `
    <div id="ghost-label"><span class="ghost-icon">${icon}</span><span>${label}${costStr}</span></div>
    <div id="ghost-dirs">${dirsHtml}</div>
    <div id="ghost-actions"><button id="ghost-cancel">✕</button><button id="ghost-confirm">✓</button></div>
  `;
  ghostPanel.classList.remove('hidden');

  ghostPanel.querySelectorAll('[data-ghost-dir]').forEach(b => {
    b.addEventListener('click', (e) => {
      e.stopPropagation(); playClick();
      const val = b.dataset.ghostDir;
      if (isConveyor) state.newConveyorDir = parseInt(val);
      else state.savedOutputDir = (val === 'null') ? null : parseInt(val);
      updateGhostPanel();
    });
  });
  document.getElementById('ghost-cancel').addEventListener('click', (e) => {
    e.stopPropagation(); playClick(); state.selectedBuilding = null; state.ghostPos = null; updateGhostPanel();
  });
  document.getElementById('ghost-confirm').addEventListener('click', (e) => {
    e.stopPropagation(); playClick();
    if (!state.selectedBuilding || !state.ghostPos) return;
    if (state.selectedBuilding === 'conveyor' || state.selectedBuilding === 'underground') tryConveyorDragStep(state.ghostPos, null);
    else tryPlaceBuilding(state.selectedBuilding, state.ghostPos.tx, state.ghostPos.ty, isBuildingUnlocked);
  });
}

export function updateModeBadge() { updateGhostPanel(); }