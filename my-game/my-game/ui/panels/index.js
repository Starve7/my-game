'use strict';

import { state } from '../../game.js';
import { oreAmount } from '../../world.js'; // <--- ВОТ ТУТ ИСПРАВЛЕНО
import { openModal, panelContent } from '../core.js';

import { renderMinePanel, renderFurnacePanel, renderLabPanel, renderCutterPanel, renderCrafterPanel } from './production.js';
import { renderStoragePanel, renderInserterPanel, renderConveyorPanel } from './logistics.js';
import { renderTurretPanel, renderRadarPanel } from './defense.js';
import { renderMiniCorePanel } from './misc.js';

export function openInfoPanel(b) {
  state.panel = 'info'; state.activeBuilding = b;
  let title = '';
  if (b.type === 'mine') title = '⛏ Угольный бур';
  else if (b.type === 'furnace') title = '🔥 Угольная печь';
  else if (b.type === 'lab') title = '🧪 Лаборатория';
  else if (b.type === 'cutter') title = '✂️ Резак';
  else if (b.type === 'assembler') title = '⚙️ Сборщик';
  else if (b.type === 'chemplant') title = '🧪 Химзавод';
  else if (b.type === 'storage') title = '📦 Склад';
  else if (b.type === 'turret') title = '🎯 Турель';
  else if (b.type === 'radar') title = '📡 Радар';
  else if (b.type === 'inserter') title = '🦾 Манипулятор';
  else if (b.type === 'minicore') title = '💠 Мини-ядро';
  
  openModal(title);
  
  if (b.type === 'mine') renderMinePanel(b);
  else if (b.type === 'furnace') renderFurnacePanel(b);
  else if (b.type === 'lab') renderLabPanel(b);
  else if (b.type === 'cutter') renderCutterPanel(b);
  else if (b.type === 'assembler' || b.type === 'chemplant') renderCrafterPanel(b);
  else if (b.type === 'storage') renderStoragePanel(b);
  else if (b.type === 'turret') renderTurretPanel(b);
  else if (b.type === 'radar') renderRadarPanel(b);
  else if (b.type === 'inserter') renderInserterPanel(b);
  else if (b.type === 'minicore') renderMiniCorePanel(b);
}

export function openConveyorPanel(c) {
  state.panel = 'conveyor'; state.activeConveyor = c;
  if (c.type === 'conveyor') { openModal('↔️ Конвейер'); renderConveyorPanel(c); }
  else if (c.type === 'splitter') { openModal('↔️ Распределитель'); renderConveyorPanel(c); }
  else if (c.type === 'underground') { openModal('⬇️ Подземный конвейер'); renderConveyorPanel(c); }
}

export function updateActivePanelLive() {
  if (state.panel === 'info' && state.activeBuilding) {
    const b = state.activeBuilding;
    if (b.type === 'mine') {
      const el = document.getElementById('mine-remaining'); if (el) el.textContent = Math.round(oreAmount[b.ty][b.tx]);
      const el2 = document.getElementById('mine-buf'); if (el2) el2.textContent = b.outputBuffer + ' / ' + b.outputBufferMax;
    } else if (b.type === 'furnace') {
      const el = document.getElementById('furnace-buffer-ore'); if (el) el.textContent = b.inputOre;
      const el2 = document.getElementById('furnace-buffer-coal'); if (el2) el2.textContent = b.inputCoal;
      const el3 = document.getElementById('furnace-buf-out'); if (el3) el3.textContent = b.outputBuffer + ' / ' + b.outputBufferMax;
    } else if (b.type === 'lab') { 
      const el = document.getElementById('lab-dna'); if (el) el.textContent = '🧬 ' + state.dna; 
    }
    else if (b.type === 'cutter') {
      const el = document.getElementById('cutter-in'); if (el) el.textContent = b.inputBuffer;
      const el2 = document.getElementById('cutter-out'); if (el2) el2.textContent = b.outputBuffer + ' / ' + b.outputBufferMax;
    } else if (b.type === 'assembler' || b.type === 'chemplant') { 
      const el = document.getElementById('crafter-buf-out'); if (el) el.textContent = b.outputBuffer + ' / ' + b.outputBufferMax; 
    }
    else if (b.type === 'turret') {
      const el = document.getElementById('turret-kills'); if (el) el.textContent = b.totalKills || 0;
      const el2 = document.getElementById('turret-hp'); if (el2) el2.textContent = Math.round(b.hp) + ' / ' + Math.round(b.maxHp);
    }
  } else if (state.panel === 'conveyor' && state.activeConveyor) {
    const el = document.getElementById('conveyor-items'); if (el) el.textContent = state.activeConveyor.items.length;
  }
}