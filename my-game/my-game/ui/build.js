'use strict';

import { state, inventory, RES } from '../game.js';
import { CORE } from '../world.js';
import { buildingImages, isReady } from '../sprites.js';
import { openModal, closeModal, panelContent } from './core.js';
import { countBuildings } from '../buildings.js';
import { isBuildingUnlocked } from '../research.js';
import { 
  MINE_COST, FURNACE_COST, CONVEYOR_COST, SPLITTER_COST, UNDERGROUND_COST, RADAR_COST, INSERTER_COST,
  LAB_IRON_COST, LAB_COPPER_COST, CUTTER_IRON_COST, CUTTER_COPPER_COST, ASSEMBLER_IRON_COST, ASSEMBLER_COPPER_COST,
  CHEMPLANT_IRON_COST, CHEMPLANT_COPPER_COST, CHEMPLANT_WIRE_COST, STORAGE_IRON_COST, STORAGE_COPPER_COST,
  TURRET_CORPS_COST, TURRET_ENGINE_COST, TURRET_CIRCUIT_COST
} from '../buildings.js';
import { costHtml, BUILDING_ICONS } from './utils.js';
import { playClick } from '../audio.js';

const BUILD_TABS = [{ id: 'industry', name: '🏭 Индустрия' }, { id: 'military', name: '⚔️ Военная' }, { id: 'energy', name: '⚡ Энергетика' }];
let activeBuildTab = 'industry';

function canAffordLab() { return inventory[RES.PLATE_IRON] >= LAB_IRON_COST && inventory[RES.PLATE_COPPER] >= LAB_COPPER_COST; }
function canAffordCutter() { return inventory[RES.PLATE_IRON] >= CUTTER_IRON_COST && inventory[RES.PLATE_COPPER] >= CUTTER_COPPER_COST; }
function canAffordAssembler() { return inventory[RES.PLATE_IRON] >= ASSEMBLER_IRON_COST && inventory[RES.PLATE_COPPER] >= ASSEMBLER_COPPER_COST; }
function canAffordChemplant() { return inventory[RES.PLATE_IRON] >= CHEMPLANT_IRON_COST && inventory[RES.PLATE_COPPER] >= CHEMPLANT_COPPER_COST && inventory[RES.WIRE] >= CHEMPLANT_WIRE_COST; }
function canAffordStorage() { return inventory[RES.PLATE_IRON] >= STORAGE_IRON_COST && inventory[RES.PLATE_COPPER] >= STORAGE_COPPER_COST; }
function canAffordTurret() { return inventory[RES.CORPS] >= TURRET_CORPS_COST && inventory[RES.ENGINE] >= TURRET_ENGINE_COST && inventory[RES.CIRCUIT] >= TURRET_CIRCUIT_COST; }
function canAffordRadar() { return inventory[RES.CIRCUIT] >= RADAR_COST.circuit && inventory[RES.CORPS] >= RADAR_COST.corps && inventory[RES.PLATE_IRON] >= RADAR_COST.plate_iron; }
function canAffordInserter() { return inventory[RES.IRON] >= INSERTER_COST.iron && inventory[RES.GEAR] >= INSERTER_COST.gear && inventory[RES.PLATE_IRON] >= INSERTER_COST.plate_iron; }

function getBuildingSpriteStyle(type) {
  const img = buildingImages[type];
  if (isReady(img)) return `background-image:url('${img.src}'); background-size:contain; background-repeat:no-repeat; background-position:center bottom;`;
  return `display:flex; align-items:center; justify-content:center; font-size:24px;`;
}

export function openBuildPanel() { openModal('🏗️ Постройки'); renderBuildPanel(); }

function renderBuildCard(type, name, costHtmlStr, isOk, countStr = '') {
  const icon = BUILDING_ICONS[type] || '?';
  const spriteStyle = getBuildingSpriteStyle(type);
  
  return `<div class="build-card ${isOk ? '' : 'disabled'}" data-type="${type}">
    <div class="build-card-img" style="${spriteStyle}">${spriteStyle.includes('font-size') ? icon : ''}</div>
    <div class="build-card-info">
      <div class="build-card-name">${name}</div>
      ${countStr ? `<div class="build-card-count">${countStr}</div>` : ''}
      <div class="build-card-cost">${costHtmlStr}</div>
    </div>
  </div>`;
}

function renderBuildPanel() {
  let html = `<style>
    .build-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; margin-bottom: 16px; }
    @media (max-width: 360px) { .build-grid { grid-template-columns: repeat(2, 1fr); } }
    .build-card { background: #222; border: 2px solid #444; border-radius: 8px; overflow: hidden; display: flex; flex-direction: column; cursor: pointer; transition: transform 0.1s, border-color 0.1s; }
    .build-card:active { transform: scale(0.96); }
    .build-card:not(.disabled):hover { border-color: #7fbf7f; }
    .build-card.disabled { opacity: 0.5; cursor: not-allowed; filter: grayscale(1); }
    .build-card-img { height: 50px; background-color: #1a1a1a; border-bottom: 1px solid #333; }
    .build-card-info { padding: 4px 6px; display: flex; flex-direction: column; gap: 2px; }
    .build-card-name { font-size: 11px; font-weight: bold; color: #fff; line-height: 1.1; }
    .build-card-count { font-size: 9px; color: #888; }
    .build-card-cost { font-size: 10px; color: #c8a040; display: flex; flex-wrap: wrap; gap: 2px; margin-top: 2px; }
    .build-group-title { font-size: 13px; font-weight: bold; color: #aaa; margin: 12px 0 6px 4px; }
  </style>`;

  html += `<div style="display:flex;gap:6px;overflow-x:auto;padding-bottom:8px;margin-bottom:8px;">`;
  for (const tab of BUILD_TABS) {
    const isActive = tab.id === activeBuildTab;
    html += `<button data-btab="${tab.id}" style="flex-shrink:0;padding:6px 12px;border-radius:8px;font-family:inherit;font-size:12px;font-weight:600;cursor:pointer;white-space:nowrap;border:2px solid ${isActive ? '#c8a040' : '#444'};background:${isActive ? '#3a3020' : '#2a2a2a'};color:${isActive ? '#ffd700' : '#aaa'};">${tab.name}</button>`;
  }
  html += `</div>`;

  if (activeBuildTab === 'industry') {
    const iron = inventory[RES.IRON];
    const mineCount = countBuildings('mine'), furnaceCount = countBuildings('furnace');
    const labCount = countBuildings('lab'), cutterCount = countBuildings('cutter');
    const assemblerCount = countBuildings('assembler'), chemplantCount = countBuildings('chemplant');
    const storageCount = countBuildings('storage'), radarCount = countBuildings('radar'), inserterCount = countBuildings('inserter');

    const mineOk = iron >= MINE_COST;
    const furnaceOk = iron >= FURNACE_COST;
    const labOk = canAffordLab();
    const cutterOk = isBuildingUnlocked('cutter') && canAffordCutter();
    const assemblerOk = isBuildingUnlocked('assembler') && canAffordAssembler();
    const chemplantOk = isBuildingUnlocked('chemplant') && canAffordChemplant();
    const storageOk = isBuildingUnlocked('storage') && canAffordStorage();
    const radarOk = canAffordRadar();
    const inserterOk = canAffordInserter();

    html += `<div class="build-group-title">⛏ Добыча и плавка</div><div class="build-grid">`;
    html += renderBuildCard('mine', 'Угольный бур', costHtml(MINE_COST, RES.IRON), mineOk, `${mineCount}`);
    html += renderBuildCard('furnace', 'Угольная печь', costHtml(FURNACE_COST, RES.IRON), furnaceOk, `${furnaceCount}`);
    html += `</div>`;

    html += `<div class="build-group-title">⚙️ Переработка</div><div class="build-grid">`;
    html += renderBuildCard('lab', 'Лаборатория', `${costHtml(LAB_IRON_COST, RES.PLATE_IRON)}+${costHtml(LAB_COPPER_COST, RES.PLATE_COPPER)}`, labOk, `${labCount}`);
    if (isBuildingUnlocked('cutter')) html += renderBuildCard('cutter', 'Резак', `${costHtml(CUTTER_IRON_COST, RES.PLATE_IRON)}+${costHtml(CUTTER_COPPER_COST, RES.PLATE_COPPER)}`, cutterOk, `${cutterCount}`);
    if (isBuildingUnlocked('assembler')) html += renderBuildCard('assembler', 'Сборщик', `${costHtml(ASSEMBLER_IRON_COST, RES.PLATE_IRON)}+${costHtml(ASSEMBLER_COPPER_COST, RES.PLATE_COPPER)}`, assemblerOk, `${assemblerCount}`);
    if (isBuildingUnlocked('chemplant')) html += renderBuildCard('chemplant', 'Химзавод', `${costHtml(CHEMPLANT_IRON_COST, RES.PLATE_IRON)}+${costHtml(CHEMPLANT_COPPER_COST, RES.PLATE_COPPER)}+${costHtml(CHEMPLANT_WIRE_COST, RES.WIRE)}`, chemplantOk, `${chemplantCount}`);
    if (isBuildingUnlocked('storage')) html += renderBuildCard('storage', 'Склад', `${costHtml(STORAGE_IRON_COST, RES.PLATE_IRON)}+${costHtml(STORAGE_COPPER_COST, RES.PLATE_COPPER)}`, storageOk, `${storageCount}`);
    html += `</div>`;

    html += `<div class="build-group-title">↔️ Логистика</div><div class="build-grid">`;
    html += renderBuildCard('conveyor', 'Конвейер', costHtml(CONVEYOR_COST, RES.IRON), iron >= CONVEYOR_COST);
    html += renderBuildCard('inserter', 'Манипулятор', `${costHtml(INSERTER_COST.iron, RES.IRON)}+${costHtml(INSERTER_COST.gear, RES.GEAR)}+${costHtml(INSERTER_COST.plate_iron, RES.PLATE_IRON)}`, inserterOk, `${inserterCount}`);
    if (isBuildingUnlocked('splitter')) html += renderBuildCard('splitter', 'Распределитель', `${costHtml(SPLITTER_COST.iron, RES.IRON)}+${costHtml(SPLITTER_COST.plate_iron, RES.PLATE_IRON)}`, iron >= SPLITTER_COST.iron && inventory[RES.PLATE_IRON] >= SPLITTER_COST.plate_iron);
    if (isBuildingUnlocked('underground')) html += renderBuildCard('underground', 'Подземный', costHtml(UNDERGROUND_COST.iron, RES.IRON), iron >= UNDERGROUND_COST.iron);
    html += `</div>`;

    html += `<div class="build-group-title">📡 Разное</div><div class="build-grid">`;
    html += renderBuildCard('radar', 'Радар', `${costHtml(RADAR_COST.plate_iron, RES.PLATE_IRON)}+${costHtml(RADAR_COST.corps, RES.CORPS)}+${costHtml(RADAR_COST.circuit, RES.CIRCUIT)}`, radarOk, `${radarCount}`);
    html += renderBuildCard('minicore', 'Мини-ядро', costHtml(100, RES.IRON), iron >= 100, '');
    html += `</div>`;

  } else if (activeBuildTab === 'military') {
    const turretCount = countBuildings('turret'), turretUnlocked = isBuildingUnlocked('turret');
    const turretOk = turretUnlocked && canAffordTurret();
    
    if (!turretUnlocked) {
      html += `<div style="padding:40px 20px;text-align:center;color:#888;font-size:13px;">Изучи «Пулемётную турель» в разделе 🧬</div>`;
    } else {
      html += `<div class="build-group-title">🎯 Оборона</div><div class="build-grid">`;
      html += renderBuildCard('turret', 'Турель', `${costHtml(TURRET_CORPS_COST, RES.CORPS)}+${costHtml(TURRET_ENGINE_COST, RES.ENGINE)}+${costHtml(TURRET_CIRCUIT_COST, RES.CIRCUIT)}`, turretOk, `${turretCount}`);
      html += `</div>`;
    }
  } else {
    html += `<div style="padding:40px 20px;text-align:center;color:#888;font-size:13px;">Генераторы и провода — скоро</div>`;
  }

  panelContent.innerHTML = html;

  panelContent.querySelectorAll('[data-btab]').forEach(btn => btn.addEventListener('click', () => { playClick(); activeBuildTab = btn.dataset.btab; renderBuildPanel(); }));
  panelContent.querySelectorAll('[data-type]').forEach(btn => {
    btn.addEventListener('click', () => {
      if (btn.classList.contains('disabled')) return;
      playClick();
      state.selectedBuilding = btn.dataset.type;
      state.ghostPos = { tx: CORE.x + 3, ty: CORE.y };
      closeModal(); import('./ghost.js').then(m => m.updateGhostPanel());
    });
  });
}
// КОНЕЦ ФАЙЛА ui/build.js