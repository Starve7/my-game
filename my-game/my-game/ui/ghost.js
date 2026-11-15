'use strict';

import { state, RES } from '../game.js';
import { CONVEYOR_COST, UNDERGROUND_COST, MINE_COST, FURNACE_COST, INSERTER_COST, SPLITTER_COST, tryConveyorDragStep, tryPlaceBuilding } from '../buildings.js';
import { isBuildingUnlocked } from '../research.js';
import { ghostPanel } from './core.js';
import { costHtml, BUILDING_ICONS } from './utils.js';
import { playClick } from '../audio.js';

export function updateGhostPanel() {
  if (!state.selectedBuilding) { ghostPanel.classList.add('hidden'); state.ghostPos = null; return; }
  const type = state.selectedBuilding;
  const isConveyor = type === 'conveyor' || type === 'underground' || type === 'splitter';
  const currentDir = isConveyor ? state.newConveyorDir : state.savedOutputDir;

  let label = '';
  let costParts = null;

  if (type === 'mine') { label = 'Угольный бур'; costParts = [{ amount: MINE_COST, res: RES.IRON }]; }
  else if (type === 'lumberjack') { label = 'Лесорубка'; costParts = [{ amount: 10, res: RES.IRON }]; }
  else if (type === 'furnace') { label = 'Угольная печь'; costParts = [{ amount: FURNACE_COST, res: RES.IRON }]; }
  else if (type === 'conveyor') { label = 'Конвейер'; costParts = [{ amount: CONVEYOR_COST, res: RES.IRON }]; }
  else if (type === 'underground') { label = 'Подземный'; costParts = [{ amount: UNDERGROUND_COST.iron, res: RES.IRON }]; }
  else if (type === 'splitter') { label = 'Распределитель'; costParts = [{ amount: SPLITTER_COST.iron, res: RES.IRON }, { amount: SPLITTER_COST.plate_iron, res: RES.PLATE_IRON }]; }
  else if (type === 'inserter') { label = 'Манипулятор'; costParts = [{ amount: INSERTER_COST.iron, res: RES.IRON }, { amount: INSERTER_COST.gear, res: RES.GEAR }]; }
  else if (type === 'lab') label = 'Лаборатория';
  else if (type === 'cutter') label = 'Резак';
  else if (type === 'assembler') label = 'Сборщик';
  else if (type === 'chemplant') label = 'Химзавод';
  else if (type === 'storage') label = 'Склад';
  else if (type === 'turret') label = 'Турель';
  else if (type === 'radar') label = 'Радар';
  else if (type === 'minicore') label = 'Мини-ядро';
  else if (type === 'sawmill') label = 'Лесопильный комбинат';
  else if (type === 'rolling_mill') label = 'Прокатный стан';
  else if (type === 'fastener_factory') label = 'Метизный завод';
  else if (type === 'mechanical_factory') label = 'Механический завод';
  else if (type === 'assembly_plant') label = 'Сборочный завод';

  const icon = BUILDING_ICONS[type] || '?';
  const costStr = costParts ? ' · ' + costParts.map(p => costHtml(p.amount, p.res)).join('+') : '';
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