'use strict';

import {
  RES, RES_COLOR, RES_NAME, TILE, MINE_COST, FURNACE_COST, MINE_INTERVAL, FURNACE_INTERVAL,
  inventory, state, showToast, STAT_WINDOW_SEC,
} from './game.js';
import { CORE, oreAmount, oreInitial } from './world.js';
import { spriteUrl, setHudIcon } from './sprites.js';
import {
  buildings, conveyors, splitters, undergrounds,
  countBuildings, getStorageTotal, getRecipesForBuilding, getRecipeById,
  LAB_INTERVAL, LAB_IRON_COST, LAB_COPPER_COST, CUTTER_INTERVAL, CUTTER_IRON_COST, CUTTER_COPPER_COST,
  ASSEMBLER_IRON_COST, ASSEMBLER_COPPER_COST, CHEMPLANT_IRON_COST, CHEMPLANT_COPPER_COST, CHEMPLANT_WIRE_COST,
  STORAGE_IRON_COST, STORAGE_COPPER_COST, STORAGE_CAPACITY,
  TURRET_CORPS_COST, TURRET_ENGINE_COST, TURRET_CIRCUIT_COST,
  TURRET_DAMAGE_BASE, TURRET_RANGE_BASE, TURRET_FIRE_INTERVAL,
  CONVEYOR_COST, CONVEYOR_CAPACITY, tryPlaceBuilding, tryConveyorDragStep,
  demolishBuilding, demolishConveyor, demolishSplitter, demolishUnderground,
  repairBuilding, repairConveyor,
  SPLITTER_COST, UNDERGROUND_COST, RADAR_COST, INSERTER_COST,
  flushOutputBuffer,
} from './buildings.js';
import {
  RESEARCH_TABS, TECHNOLOGIES, BRANCHES, isTechOwned, selectStudyTech, cancelStudy,
  getTechProgressPct, activeResearchTab, setActiveResearchTab, isBuildingUnlocked, hasAvailableResearch,
} from './research.js';
import { playClick } from './audio.js';
import { deleteSlot } from './save.js';

const uiDay = document.getElementById('ui-day');
const uiIron = document.getElementById('ui-iron');
const uiCopper = document.getElementById('ui-copper');
const uiCoal = document.getElementById('ui-coal');
const uiDNA = document.getElementById('ui-dna');
const uiPollution = document.getElementById('ui-pollution');
const uiPollutionLevel = document.getElementById('ui-pollution-level');
const pollutionWidget = document.getElementById('pollution-widget');
const drawerToggle = document.getElementById('drawer-toggle');
const drawer = document.getElementById('drawer');
const drawerHide = document.getElementById('drawer-hide');
const drawerTabs = document.querySelectorAll('.dtab');
const modalBackdrop = document.getElementById('modal-backdrop');
const modal = document.getElementById('modal');
const modalClose = document.getElementById('modal-close');
const panelTitle = document.getElementById('panel-title');
const panelContent = document.getElementById('panel-content');
const ghostPanel = document.getElementById('ghost-panel');
const infoCardEl = document.getElementById('info-card');
const infoCardContent = document.getElementById('info-card-content');

let currentInfoCardEntity = null;

function applyHudIcons() { setHudIcon('dot-iron', RES.IRON); setHudIcon('dot-copper', RES.COPPER); setHudIcon('dot-coal', RES.COAL); }
applyHudIcons(); setTimeout(applyHudIcons, 500); setTimeout(applyHudIcons, 1500);

let modalBlockTimer = null;

function toggleDrawer(forceOpen) {
  const isHidden = drawer.classList.contains('hidden');
  if (forceOpen === true || (forceOpen === undefined && isHidden)) {
    drawer.classList.remove('hidden'); drawerToggle.classList.add('open');
  } else {
    drawer.classList.add('hidden'); drawerToggle.classList.remove('open');
  }
}

function openModal(title) {
  panelTitle.textContent = title; modal.classList.remove('hidden'); modalBackdrop.classList.remove('hidden');
  modal.style.pointerEvents = 'none'; modalBackdrop.style.pointerEvents = 'none';
  clearTimeout(modalBlockTimer);
  modalBlockTimer = setTimeout(() => { modal.style.pointerEvents = ''; modalBackdrop.style.pointerEvents = ''; modalBlockTimer = null; }, 250);
}

function closeModal() {
  modal.classList.add('hidden'); modalBackdrop.classList.add('hidden');
  if (modalBlockTimer) { clearTimeout(modalBlockTimer); modalBlockTimer = null; }
  modal.style.pointerEvents = ''; modalBackdrop.style.pointerEvents = '';
}

export function closePanel() { closeModal(); state.panel = null; state.activeBuilding = null; state.activeConveyor = null; }

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

export function showInfoCard(e) {
  currentInfoCardEntity = e;
  let html = '', title = '', icon = '';

  if (e.isMonster) {
    const names = { grunt: 'Обычный', runner: 'Бегун', tank: 'Танк', exploder: 'Взрывник' };
    title = names[e.type] || 'Монстр'; icon = '👾';
    html = `<div class="card-header"><span>${icon} ${title}</span><button class="card-close">✕</button></div>
            <div class="card-row"><span>HP:</span><span id="card-monster-hp">${Math.ceil(e.hp)} / ${Math.ceil(e.maxHp)}</span></div>
            <div class="card-row"><span>Урон:</span><span>${Math.round(e.damage)}</span></div>
            <div class="card-row"><span>Скорость:</span><span>${e.speed.toFixed(1)}</span></div>`;
  } else if (e.isNest) {
    title = 'Кокон'; icon = '🕸️';
    html = `<div class="card-header"><span>${icon} ${title}</span><button class="card-close">✕</button></div>
            <div class="card-row"><span>HP:</span><span>${Math.ceil(e.hp)} / ${Math.ceil(e.maxHp)}</span></div>
            <div class="card-row"><span>Уровень:</span><span>${e.level}</span></div>
            <div class="card-row"><span>Заражение:</span><span>${e.radius} клеток</span></div>
            <div class="warn" style="margin-top:8px;">Уничтожать коконы можно будет с помощью ракет (в будущем).</div>`;
  } else if (e.type === 'core') {
    title = 'Ядро'; icon = '💎';
    html = `<div class="card-header"><span>${icon} ${title}</span><button class="card-close">✕</button></div>
            <div class="card-row"><span>HP:</span><span id="card-core-hp">${Math.round(state.coreHP)} / 1000</span></div>
            <div class="card-row"><span>Загрязнение:</span><span id="card-core-poll">${state.pollution.toFixed(1)}%</span></div>
            <div class="card-row"><span>День:</span><span>${state.day}</span></div>`;
  } else if (e.type === 'conveyor' || e.type === 'splitter' || e.type === 'underground') {
    if (e.type === 'conveyor') { title = 'Конвейер'; icon = '↔️'; }
    else if (e.type === 'splitter') { title = 'Распределитель'; icon = '↔️'; }
    else if (e.type === 'underground') { title = 'Подземный'; icon = '⬇️'; }

    html = `<div class="card-header"><span>${icon} ${title}</span><button class="card-close">✕</button></div>`;
    if (e.type === 'conveyor') {
      html += `<div class="card-row"><span>Направление:</span><span>${['Север', 'Восток', 'Юг', 'Запад'][e.dir]}</span></div>
               <div class="card-row"><span>Предметы:</span><span id="card-conv-items">${e.items.length} / ${CONVEYOR_CAPACITY}</span></div>`;
    } else if (e.type === 'splitter') {
      html += `<div class="card-row"><span>Выход 1:</span><span>${e.filterLeft ? RES_NAME[e.filterLeft] : 'Любой'}</span></div>
               <div class="card-row"><span>Выход 2:</span><span>${e.filterRight ? RES_NAME[e.filterRight] : 'Любой'}</span></div>`;
    } else if (e.type === 'underground') {
      html += `<div class="card-row"><span>Статус:</span><span>${e.partner ? '✅ Связан' : '❌ Нет пары'}</span></div>`;
    }
    
    html += `<div class="card-row"><span>HP:</span><span>${Math.round(e.hp)} / ${Math.round(e.maxHp)}</span></div>`;
    if (e.isBroken) html += `<button class="card-manage-btn" id="repair-action-btn" style="background:#7a5a2a; border-color:#c8a040;">🔧 Починить</button>`;
    else html += `<button class="card-manage-btn">Управление</button>`;
  } else {
    let name = '';
    if (e.type === 'mine') { name = 'Шахта'; icon = '⛏'; }
    else if (e.type === 'furnace') { name = 'Печь'; icon = '🔥'; }
    else if (e.type === 'lab') { name = 'Лаборатория'; icon = '🧪'; }
    else if (e.type === 'cutter') { name = 'Резак'; icon = '✂️'; }
    else if (e.type === 'assembler') { name = 'Сборщик'; icon = '⚙️'; }
    else if (e.type === 'chemplant') { name = 'Химзавод'; icon = '🧪'; }
    else if (e.type === 'storage') { name = 'Склад'; icon = '📦'; }
    else if (e.type === 'turret') { name = 'Турель'; icon = '🎯'; }
    else if (e.type === 'radar') { name = 'Радар'; icon = '📡'; }
    else if (e.type === 'inserter') { name = 'Манипулятор'; icon = '🦾'; }
    title = name;
    if (e.isBroken) title += ' (Сломано)';

    html = `<div class="card-header"><span>${icon} ${title}</span><button class="card-close">✕</button></div>
            <div class="card-row"><span>HP:</span><span>${Math.round(e.hp)} / ${Math.round(e.maxHp)}</span></div>`;

    if (e.type === 'mine') {
      const amount = oreAmount[e.ty][e.tx];
      html += `<div class="card-row"><span>Добывает:</span><span>${RES_NAME[e.resourceType]}</span></div>`;
      html += `<div class="card-row"><span>Остаток в жиле:</span><span id="card-mine-amount">${amount <= 0 ? 'Истощено' : Math.round(amount)}</span></div>`;
      html += `<div class="card-row"><span>В буфере:</span><span id="card-mine-buf">${e.outputBuffer}</span></div>`;
    } else if (e.type === 'furnace') {
      html += `<div class="card-row"><span>Руда в буфере:</span><span id="card-furn-ore">${e.inputOre} ${e.inputOreType ? RES_NAME[e.inputOreType] : ''}</span></div>`;
      html += `<div class="card-row"><span>Уголь:</span><span id="card-furn-coal">${e.inputCoal}</span></div>`;
      html += `<div class="card-row"><span>Загрязнение:</span><span id="card-furn-poll">${((e.pollutionMade || 0)).toFixed(1)}%</span></div>`;
    } else if (e.type === 'lab') { html += `<div class="card-row"><span>ДНК в ядре:</span><span>${state.dna}</span></div>`; }
    else if (e.type === 'cutter') { html += `<div class="card-row"><span>Медных плит:</span><span id="card-cut-in">${e.inputBuffer}</span></div>`; }
    else if (e.type === 'assembler' || e.type === 'chemplant') {
      const recipe = e.selectedRecipe ? getRecipeById(e.selectedRecipe) : null;
      html += `<div class="card-row"><span>Рецепт:</span><span>${recipe ? recipe.name : '—'}</span></div>`;
      if (recipe) for (const [res, count] of recipe.inputs) {
        const have = e.inputBuffer[res] || 0;
        html += `<div class="card-row"><span>${RES_NAME[res]}:</span><span>${have} / ${count}</span></div>`;
      }
    } else if (e.type === 'storage') { html += `<div class="card-row"><span>Заполнено:</span><span>${getStorageTotal(e)} / ${STORAGE_CAPACITY}</span></div>`; }
    else if (e.type === 'turret') {
      html += `<div class="card-row"><span>Патроны:</span><span>${inventory[RES.AMMO]}</span></div>`;
      html += `<div class="card-row"><span>Убийств:</span><span>${e.totalKills || 0}</span></div>`;
    } else if (e.type === 'radar') { html += `<div class="card-row"><span>Радиус:</span><span>10 клеток</span></div>`; }
    else if (e.type === 'inserter') {
      html += `<div class="card-row"><span>Направление:</span><span>${['Север', 'Восток', 'Юг', 'Запад'][e.dir]}</span></div>`;
      html += `<div class="card-row"><span>В руке:</span><span>${e.heldItem ? RES_NAME[e.heldItem] : 'Пусто'}</span></div>`;
    }

    if (e.isBroken) html += `<button class="card-manage-btn" id="repair-action-btn" style="background:#7a5a2a; border-color:#c8a040;">🔧 Починить</button>`;
    else if (e.type !== 'inserter' && e.type !== 'radar') html += `<button class="card-manage-btn">Управление</button>`;
    else if (e.type === 'inserter') html += `<button class="card-manage-btn" style="background:transparent; border-color:#555; color:#aaa;">Управление</button>`;
  }

  infoCardContent.innerHTML = html;
  infoCardEl.classList.remove('hidden');

  infoCardContent.querySelector('.card-close').addEventListener('click', (ev) => { ev.stopPropagation(); hideInfoCard(); });

  const repairBtn = infoCardContent.querySelector('#repair-action-btn');
  if (repairBtn) {
    repairBtn.addEventListener('click', (ev) => {
      ev.stopPropagation();
      let ok = false;
      if (e.type === 'conveyor' || e.type === 'splitter' || e.type === 'underground') ok = repairConveyor(e);
      else ok = repairBuilding(e);
      if (ok) { showToast('🔧 Починено'); hideInfoCard(); }
      else showToast('Не хватает ресурсов');
    });
  }

  const manageBtn = infoCardContent.querySelector('.card-manage-btn:not(#repair-action-btn)');
  if (manageBtn) {
    manageBtn.addEventListener('click', (ev) => {
      ev.stopPropagation();
      if (e.type === 'conveyor' || e.type === 'splitter' || e.type === 'underground') openConveyorPanel(e);
      else if (e.type === 'inserter') { showToast('Манипулятор не имеет настроек'); return; }
      else openInfoPanel(e);
      hideInfoCard();
    });
  }
}

export function hideInfoCard() { currentInfoCardEntity = null; infoCardEl.classList.add('hidden'); }

const POLLUTION_THRESHOLDS = [100, 300, 600, 1000];
let lastThresholdShown = 0;
function checkPollutionThresholds() {
  for (const t of POLLUTION_THRESHOLDS) {
    if (state.pollution >= t && lastThresholdShown < t) { showToast(`☣ Загрязнение ${t}%`); lastThresholdShown = t; }
  }
}
function getPollutionLevel(p) {
  if (p >= 1000) return { cls: 'extreme', label: 'катастрофа' };
  if (p >= 600)  return { cls: 'critical', label: 'ужасное' };
  if (p >= 300)  return { cls: 'danger', label: 'сильное' };
  if (p >= 100)  return { cls: 'warn', label: 'среднее' };
  return { cls: '', label: 'чисто' };
}
function formatPct(p) { return (p < 10 ? p.toFixed(1) : Math.floor(p).toString()) + '%'; }
function iconStyle(resType) {
  const url = spriteUrl(resType);
  if (url) return `background-image:${url}`;
  return `background:${RES_COLOR[resType] || '#888'}`;
}
function costHtml(amount, resType) {
  return `${amount}<span style="display:inline-block;width:14px;height:14px;vertical-align:middle;margin:0 2px 3px 0;border-radius:2px;background-size:contain;background-repeat:no-repeat;background-position:center;image-rendering:pixelated;${iconStyle(resType)}"></span>`;
}

const BUILDING_ICONS = { mine: '⛏', furnace: '🔥', lab: '🧪', cutter: '✂️', assembler: '⚙️', chemplant: '🧪', storage: '📦', turret: '🎯', conveyor: '↔️', splitter: '↔️', underground: '⬇️', radar: '📡', inserter: '🦾' };

function updateGhostPanel() {
  if (!state.selectedBuilding) { ghostPanel.classList.add('hidden'); state.ghostPos = null; return; }
  const type = state.selectedBuilding;
  const isConveyor = type === 'conveyor' || type === 'underground' || type === 'splitter' || type === 'inserter';
  const currentDir = isConveyor ? state.newConveyorDir : state.savedOutputDir;

  let label, cost = null;
  if (type === 'mine') { label = 'Шахта'; cost = MINE_COST; }
  else if (type === 'furnace') { label = 'Печь'; cost = FURNACE_COST; }
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

  const icon = BUILDING_ICONS[type] || '?';
  const costStr = cost ? ` · ${costHtml(cost, RES.IRON)}` : '';
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
      e.stopPropagation();
      const val = b.dataset.ghostDir;
      if (isConveyor) state.newConveyorDir = parseInt(val);
      else state.savedOutputDir = (val === 'null') ? null : parseInt(val);
      updateGhostPanel();
    });
  });
  document.getElementById('ghost-cancel').addEventListener('click', (e) => {
    e.stopPropagation(); state.selectedBuilding = null; state.ghostPos = null; updateGhostPanel();
  });
  document.getElementById('ghost-confirm').addEventListener('click', (e) => {
    e.stopPropagation();
    if (!state.selectedBuilding || !state.ghostPos) return;
    if (state.selectedBuilding === 'conveyor' || state.selectedBuilding === 'underground') tryConveyorDragStep(state.ghostPos, null);
    else tryPlaceBuilding(state.selectedBuilding, state.ghostPos.tx, state.ghostPos.ty, isBuildingUnlocked);
  });
}

export function updateModeBadge() { updateGhostPanel(); }

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

function openBuildPanel() { openModal('🏗️ Постройки'); renderBuildPanel(); }

function renderBuildPanel() {
  let html = `<div style="display:flex;gap:6px;overflow-x:auto;padding-bottom:8px;margin-bottom:6px;"><style>button[data-btab]{flex-shrink:0;padding:6px 12px;border-radius:8px;font-family:inherit;font-size:12px;font-weight:600;cursor:pointer;white-space:nowrap;}</style>`;
  for (const tab of BUILD_TABS) {
    const isActive = tab.id === activeBuildTab;
    html += `<button data-btab="${tab.id}" style="border:2px solid ${isActive ? '#c8a040' : '#444'};background:${isActive ? '#3a3020' : '#2a2a2a'};color:${isActive ? '#ffd700' : '#aaa'};">${tab.name}</button>`;
  }
  html += `</div>`;

  if (activeBuildTab === 'industry') {
    const iron = inventory[RES.IRON];
    const mineCount = countBuildings('mine'), furnaceCount = countBuildings('furnace');
    const labCount = countBuildings('lab'), cutterCount = countBuildings('cutter');
    const assemblerCount = countBuildings('assembler'), chemplantCount = countBuildings('chemplant');
    const storageCount = countBuildings('storage'), radarCount = countBuildings('radar'), inserterCount = countBuildings('inserter');

    const mineOk = mineCount < state.LIMITS.mine && iron >= MINE_COST;
    const furnaceOk = furnaceCount < state.LIMITS.furnace && iron >= FURNACE_COST;
    const labOk = labCount < state.LIMITS.lab && canAffordLab();
    const cutterOk = isBuildingUnlocked('cutter') && cutterCount < state.LIMITS.cutter && canAffordCutter();
    const assemblerOk = isBuildingUnlocked('assembler') && assemblerCount < state.LIMITS.assembler && canAffordAssembler();
    const chemplantOk = isBuildingUnlocked('chemplant') && chemplantCount < state.LIMITS.chemplant && canAffordChemplant();
    const storageOk = isBuildingUnlocked('storage') && storageCount < state.LIMITS.storage && canAffordStorage();
    const splitterOk = isBuildingUnlocked('splitter') && inventory[RES.IRON] >= SPLITTER_COST.iron && inventory[RES.PLATE_IRON] >= SPLITTER_COST.plate_iron;
    const undergroundOk = isBuildingUnlocked('underground') && inventory[RES.IRON] >= UNDERGROUND_COST.iron;
    const radarOk = radarCount < state.LIMITS.radar && canAffordRadar();
    const inserterOk = inserterCount < state.LIMITS.inserter && canAffordInserter();

    html += `
      <button class="option-btn ${mineOk ? '' : 'disabled'}" data-type="mine" ${mineOk ? '' : 'disabled'}><span class="opt-icon">⛏</span><span class="opt-label">Шахта <span style="color:#888;font-size:11px;">(${mineCount}/${state.LIMITS.mine})</span></span><span class="opt-cost ${iron >= MINE_COST ? '' : 'disabled'}">${costHtml(MINE_COST, RES.IRON)}</span></button>
      <button class="option-btn ${furnaceOk ? '' : 'disabled'}" data-type="furnace" ${furnaceOk ? '' : 'disabled'}><span class="opt-icon">🔥</span><span class="opt-label">Печь <span style="color:#888;font-size:11px;">(${furnaceCount}/${state.LIMITS.furnace})</span></span><span class="opt-cost ${iron >= FURNACE_COST ? '' : 'disabled'}">${costHtml(FURNACE_COST, RES.IRON)}</span></button>
      <button class="option-btn ${labOk ? '' : 'disabled'}" data-type="lab" ${labOk ? '' : 'disabled'}><span class="opt-icon">🧪</span><span class="opt-label">Лаборатория <span style="color:#888;font-size:11px;">(${labCount}/${state.LIMITS.lab})</span></span><span class="opt-cost ${canAffordLab() ? '' : 'disabled'}">${costHtml(LAB_IRON_COST, RES.PLATE_IRON)} + ${costHtml(LAB_COPPER_COST, RES.PLATE_COPPER)}</span></button>
      ${isBuildingUnlocked('cutter') ? `<button class="option-btn ${cutterOk ? '' : 'disabled'}" data-type="cutter" ${cutterOk ? '' : 'disabled'}><span class="opt-icon">✂️</span><span class="opt-label">Резак <span style="color:#888;font-size:11px;">(${cutterCount}/${state.LIMITS.cutter})</span></span><span class="opt-cost ${canAffordCutter() ? '' : 'disabled'}">${costHtml(CUTTER_IRON_COST, RES.PLATE_IRON)} + ${costHtml(CUTTER_COPPER_COST, RES.PLATE_COPPER)}</span></button>` : ''}
      ${isBuildingUnlocked('assembler') ? `<button class="option-btn ${assemblerOk ? '' : 'disabled'}" data-type="assembler" ${assemblerOk ? '' : 'disabled'}><span class="opt-icon">⚙️</span><span class="opt-label">Сборщик <span style="color:#888;font-size:11px;">(${assemblerCount}/${state.LIMITS.assembler})</span></span><span class="opt-cost ${canAffordAssembler() ? '' : 'disabled'}">${costHtml(ASSEMBLER_IRON_COST, RES.PLATE_IRON)} + ${costHtml(ASSEMBLER_COPPER_COST, RES.PLATE_COPPER)}</span></button>` : ''}
      ${isBuildingUnlocked('chemplant') ? `<button class="option-btn ${chemplantOk ? '' : 'disabled'}" data-type="chemplant" ${chemplantOk ? '' : 'disabled'}><span class="opt-icon">🧪</span><span class="opt-label">Химзавод <span style="color:#888;font-size:11px;">(${chemplantCount}/${state.LIMITS.chemplant})</span></span><span class="opt-cost ${canAffordChemplant() ? '' : 'disabled'}">${costHtml(CHEMPLANT_IRON_COST, RES.PLATE_IRON)} + ${costHtml(CHEMPLANT_COPPER_COST, RES.PLATE_COPPER)} + ${costHtml(CHEMPLANT_WIRE_COST, RES.WIRE)}</span></button>` : ''}
      ${isBuildingUnlocked('storage') ? `<button class="option-btn ${storageOk ? '' : 'disabled'}" data-type="storage" ${storageOk ? '' : 'disabled'}><span class="opt-icon">📦</span><span class="opt-label">Склад <span style="color:#888;font-size:11px;">(${storageCount}/${state.LIMITS.storage})</span></span><span class="opt-cost ${canAffordStorage() ? '' : 'disabled'}">${costHtml(STORAGE_IRON_COST, RES.PLATE_IRON)} + ${costHtml(STORAGE_COPPER_COST, RES.PLATE_COPPER)}</span></button>` : ''}
      
      <button class="option-btn ${radarOk ? '' : 'disabled'}" data-type="radar" ${radarOk ? '' : 'disabled'}><span class="opt-icon">📡</span><span class="opt-label">Радар <span style="color:#888;font-size:11px;">(${radarCount}/${state.LIMITS.radar})</span></span><span class="opt-cost ${canAffordRadar() ? '' : 'disabled'}">${costHtml(RADAR_COST.plate_iron, RES.PLATE_IRON)} + ${costHtml(RADAR_COST.corps, RES.CORPS)} + ${costHtml(RADAR_COST.circuit, RES.CIRCUIT)}</span></button>

      <div style="margin-top:10px; margin-bottom:4px; font-size:12px; color:#888;">Логистика:</div>
      <button class="option-btn" data-type="conveyor"><span class="opt-icon">↔️</span><span class="opt-label">Конвейер <span style="color:#7fbf7f;font-size:10px;">(drag)</span></span><span class="opt-cost ${iron >= CONVEYOR_COST ? '' : 'disabled'}">${costHtml(CONVEYOR_COST, RES.IRON)}</span></button>
      <button class="option-btn ${inserterOk ? '' : 'disabled'}" data-type="inserter" ${inserterOk ? '' : 'disabled'}><span class="opt-icon">🦾</span><span class="opt-label">Манипулятор <span style="color:#888;font-size:11px;">(${inserterCount}/${state.LIMITS.inserter})</span></span><span class="opt-cost ${inserterOk ? '' : 'disabled'}">${costHtml(INSERTER_COST.iron, RES.IRON)} + ${costHtml(INSERTER_COST.gear, RES.GEAR)} + ${costHtml(INSERTER_COST.plate_iron, RES.PLATE_IRON)}</span></button>
      ${isBuildingUnlocked('splitter') ? `<button class="option-btn ${splitterOk ? '' : 'disabled'}" data-type="splitter" ${splitterOk ? '' : 'disabled'}><span class="opt-icon">↔️</span><span class="opt-label">Распределитель</span><span class="opt-cost ${splitterOk ? '' : 'disabled'}">${costHtml(SPLITTER_COST.iron, RES.IRON)} + ${costHtml(SPLITTER_COST.plate_iron, RES.PLATE_IRON)}</span></button>` : ''}
      ${isBuildingUnlocked('underground') ? `<button class="option-btn ${undergroundOk ? '' : 'disabled'}" data-type="underground" ${undergroundOk ? '' : 'disabled'}><span class="opt-icon">⬇️</span><span class="opt-label">Подземный <span style="color:#7fbf7f;font-size:10px;">(drag)</span></span><span class="opt-cost ${undergroundOk ? '' : 'disabled'}">${costHtml(UNDERGROUND_COST.iron, RES.IRON)}</span></button>` : ''}
    `;
  } else if (activeBuildTab === 'military') {
    const turretCount = countBuildings('turret'), turretUnlocked = isBuildingUnlocked('turret');
    const turretOk = turretUnlocked && turretCount < state.LIMITS.turret && canAffordTurret();
    if (!turretUnlocked) html += `<div style="padding:40px 20px;text-align:center;color:#888;font-size:13px;">Изучи «Турель» в разделе 🧬</div>`;
    else html += `<button class="option-btn ${turretOk ? '' : 'disabled'}" data-type="turret" ${turretOk ? '' : 'disabled'}><span class="opt-icon">🎯</span><span class="opt-label">Турель <span style="color:#888;font-size:11px;">(${turretCount}/${state.LIMITS.turret})</span></span><span class="opt-cost ${canAffordTurret() ? '' : 'disabled'}">${costHtml(TURRET_CORPS_COST, RES.CORPS)} + ${costHtml(TURRET_ENGINE_COST, RES.ENGINE)} + ${costHtml(TURRET_CIRCUIT_COST, RES.CIRCUIT)}</span></button>`;
  } else html += `<div style="padding:40px 20px;text-align:center;color:#888;font-size:13px;">Генераторы и провода — скоро</div>`;

  panelContent.innerHTML = html;
  panelContent.querySelectorAll('[data-btab]').forEach(btn => btn.addEventListener('click', () => { activeBuildTab = btn.dataset.btab; renderBuildPanel(); }));
  panelContent.querySelectorAll('[data-type]').forEach(btn => {
    btn.addEventListener('click', () => {
      if (btn.disabled) return;
      state.selectedBuilding = btn.dataset.type;
      state.ghostPos = { tx: CORE.x + 3, ty: CORE.y };
      closeModal(); updateGhostPanel();
    });
  });
}

const researchScreen = document.getElementById('research-screen');
const researchTabs = document.getElementById('research-tabs');
const researchClose = document.getElementById('research-close');
const researchViewport = document.getElementById('research-viewport');
const researchWorld = document.getElementById('research-world');
const researchSvg = document.getElementById('research-svg');
const researchNodes = document.getElementById('research-nodes');

let cam = { x: 0, y: 0, scale: 1 }, isDragging = false, startX = 0, startY = 0, initialCamX = 0, initialCamY = 0, uiLastStudyTechId = null;
if (researchClose) researchClose.addEventListener('click', closeResearchPanel);
function applyCamera() { researchWorld.style.transform = `translate(${cam.x}px, ${cam.y}px) scale(${cam.scale})`; }
function resetCamera() { cam = { x: 0, y: 0, scale: 1 }; applyCamera(); }

researchViewport.addEventListener('wheel', (e) => {
  e.preventDefault();
  const zoomFactor = e.deltaY > 0 ? 0.9 : 1.1;
  const newScale = Math.max(0.4, Math.min(2, cam.scale * zoomFactor));
  const rect = researchViewport.getBoundingClientRect();
  const mouseX = e.clientX - rect.left, mouseY = e.clientY - rect.top;
  cam.x = mouseX - (mouseX - cam.x) * (newScale / cam.scale);
  cam.y = mouseY - (mouseY - cam.y) * (newScale / cam.scale);
  cam.scale = newScale; applyCamera();
}, { passive: false });

let pinchStartDist = 0, initialScale = 1;
const activePointers = new Map();

researchViewport.addEventListener('pointerdown', (e) => {
  if (e.target.closest('.tech-card button') || e.target.closest('#research-topbar')) return;
  researchViewport.setPointerCapture(e.pointerId);
  activePointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
  if (activePointers.size === 1) {
    isDragging = true; startX = e.clientX; startY = e.clientY; initialCamX = cam.x; initialCamY = cam.y;
  } else if (activePointers.size === 2) {
    isDragging = false;
    const pts = [...activePointers.values()];
    pinchStartDist = Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y);
    initialScale = cam.scale;
  }
});

researchViewport.addEventListener('pointermove', (e) => {
  if (!activePointers.has(e.pointerId)) return;
  activePointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
  if (activePointers.size === 1 && isDragging) {
    cam.x = initialCamX + (e.clientX - startX); cam.y = initialCamY + (e.clientY - startY); applyCamera();
  } else if (activePointers.size === 2) {
    const pts = [...activePointers.values()];
    const dist = Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y);
    const newScale = Math.max(0.4, Math.min(2, initialScale * (dist / pinchStartDist)));
    const midX = (pts[0].x + pts[1].x) / 2, midY = (pts[0].y + pts[1].y) / 2;
    const rect = researchViewport.getBoundingClientRect();
    const localMidX = midX - rect.left, localMidY = midY - rect.top;
    cam.x = localMidX - (localMidX - cam.x) * (newScale / cam.scale);
    cam.y = localMidY - (localMidY - cam.y) * (newScale / cam.scale);
    cam.scale = newScale; applyCamera();
  }
});

function endPointer(e) {
  activePointers.delete(e.pointerId);
  if (activePointers.size === 0) isDragging = false;
  else if (activePointers.size === 1) {
    const pts = [...activePointers.values()];
    startX = pts[0].x; startY = pts[0].y; initialCamX = cam.x; initialCamY = cam.y; isDragging = true;
  }
}
researchViewport.addEventListener('pointerup', endPointer);
researchViewport.addEventListener('pointercancel', endPointer);

export function openResearchPanel() { closeModal(); state.panel = 'research'; if (researchScreen) researchScreen.classList.remove('hidden'); renderResearchPanel(); }
export function closeResearchPanel() { if (researchScreen) researchScreen.classList.add('hidden'); state.panel = null; }

function renderResearchPanel() {
  uiLastStudyTechId = state.activeStudyTechId;
  researchTabs.innerHTML = '';
  for (const tab of RESEARCH_TABS) {
    const btn = document.createElement('button');
    btn.textContent = tab.name;
    btn.className = tab.id === activeResearchTab ? 'active' : '';
    btn.onclick = () => { setActiveResearchTab(tab.id); resetCamera(); renderResearchPanel(); };
    researchTabs.appendChild(btn);
  }
  
  researchNodes.innerHTML = ''; researchSvg.innerHTML = '';
  const branches = BRANCHES[activeResearchTab] || [];
  
  let currentBranchY = 120;
  let maxTotalX = 0;
  let allSvgLines = '';

  for (const branch of branches) {
    const branchTechs = TECHNOLOGIES.filter(t => t.tab === activeResearchTab && t.branch === branch.id);
    if (branchTechs.length === 0) continue;

    const techMap = {}; 
    for (const t of branchTechs) techMap[t.id] = t;
    const children = {}; const roots = [];
    
    for (const t of branchTechs) {
      const parents = (t.requires || []).filter(r => techMap[r]);
      if (parents.length === 0) roots.push(t.id);
      for (const p of parents) { 
        if (!children[p]) children[p] = []; 
        children[p].push(t.id); 
      }
    }

    const NODE_W = 180, NODE_H = 140, GAP_X = 80, GAP_Y = 50;
    const positions = {}; let nextLeafY = 0;

    function computeY(id) {
      const kids = children[id] || [];
      if (kids.length === 0) {
        positions[id] = { y: nextLeafY };
        nextLeafY += NODE_H + GAP_Y;
        return { top: positions[id].y, bottom: positions[id].y + NODE_H };
      }
      const ranges = kids.map(cid => computeY(cid));
      const top = ranges[0].top;
      let y = top;
      positions[id] = { y: Math.max(0, y) };
      return { top: positions[id].y, bottom: positions[id].y + NODE_H };
    }
    for (const rid of roots) computeY(rid);

    const depths = {};
    function setDepth(id, d) { 
      if (depths[id] !== undefined) return; 
      depths[id] = d; 
      for (const cid of (children[id] || [])) setDepth(cid, d + 1); 
    }
    for (const rid of roots) setDepth(rid, 0);
    
    let branchMaxX = 0, branchMaxY = 0;
    let minY = Infinity;

    for (const id in positions) {
      positions[id].x = 50 + depths[id] * (NODE_W + GAP_X);
      positions[id].y += currentBranchY; 
      
      minY = Math.min(minY, positions[id].y);
      branchMaxX = Math.max(branchMaxX, positions[id].x + NODE_W);
      branchMaxY = Math.max(branchMaxY, positions[id].y + NODE_H);
    }

    const headerDiv = document.createElement('div');
    headerDiv.textContent = branch.name;
    headerDiv.style.position = 'absolute';
    headerDiv.style.left = '50px';
    headerDiv.style.top = (minY - 60) + 'px'; 
    headerDiv.style.fontSize = '26px';
    headerDiv.style.fontWeight = '900';
    headerDiv.style.color = '#ffd700';
    headerDiv.style.textShadow = '0 2px 4px rgba(0,0,0,0.8)';
    headerDiv.style.pointerEvents = 'none';
    headerDiv.style.whiteSpace = 'nowrap';
    researchNodes.appendChild(headerDiv);

    for (const id in positions) {
      for (const cid of (children[id] || [])) {
        const x1 = positions[id].x + NODE_W, y1 = positions[id].y + NODE_H / 2;
        const x2 = positions[cid].x, y2 = positions[cid].y + NODE_H / 2;
        const ctrl1X = x1 + (x2 - x1) * 0.4, ctrl2X = x2 - (x2 - x1) * 0.4;
        const strokeColor = isTechOwned(id) ? '#5a7a5a' : '#333';
        allSvgLines += `<path d="M ${x1} ${y1} C ${ctrl1X} ${y1}, ${ctrl2X} ${y2}, ${x2} ${y2}" stroke="${strokeColor}" stroke-width="3" fill="none" />`;
      }
    }

    for (const id in positions) {
      const t = techMap[id];
      const cardDiv = document.createElement('div');
      cardDiv.style.position = 'absolute';
      cardDiv.style.left = positions[id].x + 'px';
      cardDiv.style.top = positions[id].y + 'px';
      cardDiv.innerHTML = renderTechCardHtml(t);
      researchNodes.appendChild(cardDiv);
    }

    maxTotalX = Math.max(maxTotalX, branchMaxX);
    currentBranchY = branchMaxY + 140; 
  }

  researchSvg.style.width = maxTotalX + 'px';
  researchSvg.style.height = currentBranchY + 'px';
  researchSvg.innerHTML = allSvgLines;

  researchNodes.querySelectorAll('[data-start-study]').forEach(btn => btn.addEventListener('click', (e) => { e.stopPropagation(); if (selectStudyTech(btn.dataset.startStudy)) renderResearchPanel(); else showToast('Нельзя изучать'); }));
  researchNodes.querySelectorAll('[data-cancel-study]').forEach(btn => btn.addEventListener('click', (e) => { e.stopPropagation(); cancelStudy(); renderResearchPanel(); }));
}

function renderTechCardHtml(t) {
  const owned = isTechOwned(t.id), locked = t.requires.some(r => !isTechOwned(r));
  const isActive = state.activeStudyTechId === t.id, progressPct = getTechProgressPct(t.id);
  let statusText, statusColor;
  if (owned) { statusText = '✓'; statusColor = '#7fbf7f'; }
  else if (locked) { statusText = '🔒'; statusColor = '#888'; }
  else if (isActive) { statusText = progressPct.toFixed(1) + '%'; statusColor = '#7fbfff'; }
  else if (progressPct > 0) { statusText = progressPct.toFixed(0) + '%'; statusColor = '#aaa'; }
  else { statusText = `${t.studyPercent * 2}🧬`; statusColor = '#aaa'; }

  let barHtml = '';
  if (!owned && !locked) barHtml = `<div style="height:4px;background:#333;border-radius:3px;margin-top:8px;overflow:hidden;"><div class="tech-progress-bar" style="height:100%;background:${isActive ? '#4a8aff' : '#555'};width:${progressPct}%;transition:width 0.3s;"></div></div>`;
  let btnHtml = '';
  if (!owned && !locked) {
    if (isActive) btnHtml = `<button class="option-btn" data-cancel-study="1" style="margin-top:8px;padding:5px 8px;font-size:11px;justify-content:center;width:100%;background:#7a3a3a;border-color:#a04040;color:#fff;">Отменить</button>`;
    else btnHtml = `<button class="option-btn" data-start-study="${t.id}" style="margin-top:8px;padding:5px 8px;font-size:11px;justify-content:center;width:100%;">Изучать</button>`;
  }
  let reqHtml = '';
  if (locked && t.requires.length > 0) {
    const names = t.requires.map(r => { const rt = TECHNOLOGIES.find(x => x.id === r); return rt ? rt.name : r; });
    reqHtml = `<div style="font-size:10px;color:#a06060;margin-top:4px;">Требуется: ${names.join(', ')}</div>`;
  }
  return `<div class="tech-card ${owned ? 'owned' : ''} ${locked ? 'locked' : ''} ${isActive ? 'selected' : ''}">
    <div class="tech-head"><div class="tech-name">${t.name}</div><div class="tech-status" style="color:${statusColor};">${statusText}</div></div>
    <div class="tech-desc">${t.desc}</div>${reqHtml}${barHtml}${btnHtml}</div>`;
}

const STATS_TABS = [
  { id: 'resources', name: '📦 Ресурсы' },
  { id: 'energy', name: '⚡ Электричество' },
  { id: 'liquids', name: '💧 Жидкости' }
];
let activeStatsTab = 'resources';

const STAT_ROWS = [
  { key: 'iron', name: 'Железо', res: RES.IRON },
  { key: 'copper', name: 'Медь', res: RES.COPPER },
  { key: 'coal', name: 'Уголь', res: RES.COAL },
  { key: 'plate_iron', name: 'Железные плиты', res: RES.PLATE_IRON },
  { key: 'plate_copper', name: 'Медные плиты', res: RES.PLATE_COPPER },
  { key: 'wire', name: 'Провод', res: RES.WIRE },
  { key: 'gear', name: 'Шестерня', res: RES.GEAR },
  { key: 'corps', name: 'Корпус', res: RES.CORPS },
  { key: 'circuit', name: 'Электросхема', res: RES.CIRCUIT },
  { key: 'engine', name: 'Двигатель', res: RES.ENGINE },
  { key: 'powder', name: 'Порох', res: RES.POWDER },
  { key: 'ammo', name: 'Патроны', res: RES.AMMO },
  { key: 'dna', name: '🧬 ДНК', res: null },
];

function getStatValue(key) {
  if (key === 'dna') return state.dna;
  const row = STAT_ROWS.find(r => r.key === key);
  return (row && row.res) ? inventory[row.res] : 0;
}

function getStatRate(key) {
  const hist = state.statHistory[key];
  if (!hist || hist.length < 2) return 0;
  const dt = hist[hist.length - 1].t - hist[0].t;
  return dt < 1 ? 0 : (hist[hist.length - 1].v - hist[0].v) / dt * 60;
}

function makeSparkline(history, options = {}) {
  const { width = 70, height = 24, color = '#7fbf7f' } = options;
  if (!history || history.length < 2) {
    return `<svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" class="sparkline-svg"></svg>`;
  }
  const t0 = history[0].t;
  const t1 = history[history.length - 1].t;
  const tRange = Math.max(0.1, t1 - t0);
  let minV = Infinity, maxV = -Infinity;
  for (const h of history) {
    if (h.v < minV) minV = h.v;
    if (h.v > maxV) maxV = h.v;
  }
  const vRange = Math.max(1, maxV - minV);
  const points = [];
  for (const h of history) {
    const x = ((h.t - t0) / tRange) * width;
    const y = height - ((h.v - minV) / vRange) * (height - 4) - 2;
    points.push(`${x.toFixed(1)},${y.toFixed(1)}`);
  }
  const areaPoints = [`0,${height}`, ...points, `${width},${height}`].join(' ');
  return `<svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" class="sparkline-svg">
    <polygon points="${areaPoints}" fill="${color}" fill-opacity="0.15"/>
    <polyline points="${points.join(' ')}" fill="none" stroke="${color}" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
  </svg>`;
}

function renderStatRow(row) {
  const val = getStatValue(row.key);
  const rate = getStatRate(row.key);
  const hist = state.statHistory[row.key] || [];
  let rateClass = 'zero', rateText = '0', color = '#666';
  if (rate > 0.5) { rateClass = 'positive'; rateText = '+' + Math.round(rate); color = '#7fbf7f'; }
  else if (rate < -0.5) { rateClass = 'negative'; rateText = Math.round(rate).toString(); color = '#e06060'; }
  const iconHtml = row.res
    ? `<div class="stat-row-icon" style="${iconStyle(row.res)}"></div>`
    : `<div class="stat-row-icon stat-row-icon-dna">🧬</div>`;
  const sparkline = makeSparkline(hist, { width: 70, height: 24, color });
  return `
    <div class="stat-row-game" data-stat-key="${row.key}">
      ${iconHtml}
      <div class="stat-row-info">
        <div class="stat-row-name">${row.name}</div>
        <div class="stat-row-rate ${rateClass}" data-rate>${rateText} /мин</div>
      </div>
      <div class="stat-row-sparkline" data-spark>${sparkline}</div>
      <div class="stat-row-val" data-val>${val}</div>
    </div>
  `;
}

function openStatsPanel() { openModal('📊 Статистика'); renderStatsPanel(); }
function renderStatsPanel() {
  let tabsHtml = `<div class="stats-tabs">`;
  for (const tab of STATS_TABS) {
    const isActive = tab.id === activeStatsTab;
    tabsHtml += `<button class="stats-tab ${isActive ? 'active' : ''}" data-stat-tab="${tab.id}">${tab.name}</button>`;
  }
  tabsHtml += `</div>`;

  let contentHtml = '';

  if (activeStatsTab === 'resources') {
    let totalAmount = 0;
    let totalRate = 0;
    for (const row of STAT_ROWS) {
      if (row.key === 'dna') continue;
      totalAmount += getStatValue(row.key);
      totalRate += getStatRate(row.key);
    }
    const totalRateClass = totalRate > 0.5 ? 'positive' : totalRate < -0.5 ? 'negative' : '';
    const totalRateText = totalRate > 0.5 ? '+' + Math.round(totalRate) : totalRate < -0.5 ? Math.round(totalRate).toString() : '0';

    contentHtml += `<div class="stats-overview">
      <div class="stats-overview-item">
        <div class="stats-overview-label">Всего</div>
        <div class="stats-overview-value">${Math.round(totalAmount)}</div>
      </div>
      <div class="stats-overview-item">
        <div class="stats-overview-label">Прирост</div>
        <div class="stats-overview-value ${totalRateClass}">${totalRateText}/м</div>
      </div>
      <div class="stats-overview-item">
        <div class="stats-overview-label">ДНК</div>
        <div class="stats-overview-value">${state.dna}</div>
      </div>
    </div>`;

    contentHtml += `<div class="stats-section-title">📦 Все ресурсы</div><div class="stats-list">`;
    for (const row of STAT_ROWS) {
      contentHtml += renderStatRow(row);
    }
    contentHtml += `</div>`;
    contentHtml += `<div class="stats-footer-hint">График за последние ${STAT_WINDOW_SEC} секунд</div>`;
  } else if (activeStatsTab === 'energy') {
    contentHtml += `<div class="stats-coming-soon">
      <div class="stats-coming-soon-icon">⚡</div>
      <div class="stats-coming-soon-title">Электричество</div>
      <div class="stats-coming-soon-text">Скоро здесь будет статистика производства и потребления энергии</div>
    </div>`;
  } else if (activeStatsTab === 'liquids') {
    contentHtml += `<div class="stats-coming-soon">
      <div class="stats-coming-soon-icon">💧</div>
      <div class="stats-coming-soon-title">Жидкости</div>
      <div class="stats-coming-soon-text">Скоро здесь будет статистика по нефти, воде и кислотам</div>
    </div>`;
  }

  panelContent.innerHTML = tabsHtml + contentHtml;

  panelContent.querySelectorAll('[data-stat-tab]').forEach(btn => {
    btn.addEventListener('click', () => {
      activeStatsTab = btn.dataset.statTab;
      renderStatsPanel();
    });
  });
}

function openSettingsPanel() { openModal('⚙️ Настройки'); renderSettingsPanel(); }
function renderSettingsPanel() {
  panelContent.innerHTML = `
    <button class="option-btn ${state.soundEnabled ? 'selected' : ''}" id="settings-sound"><span class="opt-icon">${state.soundEnabled ? '🔊' : '🔇'}</span><span class="opt-label">Звук</span><span class="opt-cost">${state.soundEnabled ? 'ВКЛ' : 'ВЫКЛ'}</span></button>
    <button class="option-btn" id="settings-save"><span class="opt-icon">💾</span><span class="opt-label">Сохранить игру</span></button>
    <button class="option-btn" id="settings-menu"><span class="opt-icon">🏠</span><span class="opt-label">В главное меню</span></button>
    <div style="margin-top:20px;padding:16px;background:#141414;border-radius:8px;color:#888;font-size:12px;text-align:center;line-height:1.5;">Больше настроек появится позже:<br>автосейв · сложность · темы · язык</div>
  `;
  document.getElementById('settings-sound').addEventListener('click', () => { state.soundEnabled = !state.soundEnabled; if (state.soundEnabled) playClick(); renderSettingsPanel(); });
  document.getElementById('settings-save').addEventListener('click', () => { closeModal(); if (window.__openSaveSlots) window.__openSaveSlots('save'); });
  document.getElementById('settings-menu').addEventListener('click', () => {
    if (confirm('Выйти в главное меню?\nНесохранённый прогресс останется в памяти.')) { closeModal(); if (window.__showMainMenu) window.__showMainMenu(); }
  });
}

function recipeInputsHtml(recipe, b) {
  let html = '';
  for (const [resType, count] of recipe.inputs) {
    const have = b && b.inputBuffer ? (b.inputBuffer[resType] || 0) : null;
    const enough = have === null ? true : have >= count;
    const color = enough ? '#ccc' : '#e06060', haveStr = have !== null ? ` (${have}/${count})` : '';
    html += `<div class="item"><div class="dot" style="${iconStyle(resType)}"></div><span style="color:${color}">${count}${haveStr}</span></div>`;
  }
  return html;
}

function openRecipePicker(b) {
  state.panel = 'recipe-pick'; state.activeBuilding = b;
  openModal(b.type === 'assembler' ? '⚙️ Сборщик — рецепт' : '🧪 Химзавод — рецепт');
  renderRecipePicker(b);
}
function renderRecipePicker(b) {
  const recipes = getRecipesForBuilding(b);
  let html = `<div style="font-size:12px;color:#888;margin-bottom:10px;">Выбери, что производить:</div>`;
  for (const r of recipes) {
    const isSelected = b.selectedRecipe === r.id;
    html += `<div class="tech-card ${isSelected ? 'owned' : ''}" style="cursor:pointer;" data-recipe="${r.id}"><div class="tech-head"><div class="tech-name">${r.name}${isSelected ? ' ✓' : ''}</div><div class="tech-status" style="color:#aaa;font-size:11px;">${r.time.toFixed(1)} сек</div></div><div style="display:flex;align-items:center;gap:6px;margin-top:6px;flex-wrap:wrap;">${recipeInputsHtml(r, null)}<span style="color:#888;font-size:14px;">→</span><div class="item"><div class="dot" style="${iconStyle(r.output)}"></div>${r.count} ${RES_NAME[r.output]}</div></div></div>`;
  }
  panelContent.innerHTML = html;
  panelContent.querySelectorAll('[data-recipe]').forEach(el => el.addEventListener('click', () => { b.selectedRecipe = el.dataset.recipe; b.timer = 0; openInfoPanel(b); }));
}

export function openInfoPanel(b) {
  state.panel = 'info'; state.activeBuilding = b;
  let title = '';
  if (b.type === 'mine') title = '⛏ Шахта';
  else if (b.type === 'furnace') title = '🔥 Печь';
  else if (b.type === 'lab') title = '🧪 Лаборатория';
  else if (b.type === 'cutter') title = '✂️ Резак';
  else if (b.type === 'assembler') title = '⚙️ Сборщик';
  else if (b.type === 'chemplant') title = '🧪 Химзавод';
  else if (b.type === 'storage') title = '📦 Склад';
  else if (b.type === 'turret') title = '🎯 Турель';
  else if (b.type === 'radar') title = '📡 Радар';
  else if (b.type === 'inserter') title = '🦾 Манипулятор';
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
}

function getDirPickerHtml(currentDir) {
  const dirs = ['↑', '→', '↓', '←'];
  let html = `<div style="display:flex; gap:4px; margin-top:10px;"><span style="display:flex;align-items:center;font-size:12px;color:#888;margin-right:4px;">Выход:</span>`;
  html += `<button class="option-btn ${currentDir === null ? 'selected' : ''}" style="flex:1;padding:6px;justify-content:center;font-size:11px;" data-dir-picker="null">—</button>`;
  for (let i = 0; i < 4; i++) {
    html += `<button class="option-btn ${currentDir === i ? 'selected' : ''}" style="flex:1;padding:6px;justify-content:center;font-size:16px;" data-dir-picker="${i}">${dirs[i]}</button>`;
  }
  html += `</div>`;
  return html;
}

function bindDirPicker(b) {
  panelContent.querySelectorAll('[data-dir-picker]').forEach(btn => {
    btn.addEventListener('click', () => {
      const val = btn.dataset.dirPicker;
      b.outputDir = (val === 'null') ? null : parseInt(val);
      if (b.outputDir !== null) flushOutputBuffer(b);
      panelContent.querySelectorAll('[data-dir-picker]').forEach(x => x.classList.toggle('selected', x.dataset.dirPicker === val));
    });
  });
}

function renderMinePanel(b) {
  const amount = oreAmount[b.ty][b.tx], initial = oreInitial[b.ty][b.tx];
  const amountStr = Math.round(amount), minedStr = Math.round(initial - amount);
  const emptyNote = amount <= 0 ? '<div class="warn">Жила истощена</div>' : '', interval = MINE_INTERVAL / state.miningSpeedMult;
  panelContent.innerHTML = `<div class="info-line">Добывает: <strong>${RES_NAME[b.resourceType]}</strong></div><div class="info-line">Скорость: 1 ед. / ${interval.toFixed(2)} сек</div><div class="stats-box"><div class="row"><span>Осталось в жиле</span><span id="mine-remaining">${amountStr}</span></div><div class="row"><span>Добыто из жилы</span><span id="mine-mined">${minedStr}</span></div><div class="row"><span>В буфере</span><span id="mine-buf">${b.outputBuffer} / ${b.outputBufferMax}</span></div></div>${emptyNote}${getDirPickerHtml(b.outputDir)}<button class="remove-btn" id="remove-btn">Удалить (вернуть 50%)</button>`;
  bindDirPicker(b);
  document.getElementById('remove-btn').addEventListener('click', () => { demolishBuilding(b); closePanel(); });
}

function renderFurnacePanel(b) {
  const oreName = b.inputOreType === RES.IRON ? 'Железо' : b.inputOreType === RES.COPPER ? 'Медь' : '—';
  let recipeHtml = b.inputOreType ? `<div class="recipe"><div class="item"><div class="dot" style="${iconStyle(b.inputOreType)}"></div>1</div><span class="arrow">+</span><div class="item"><div class="dot" style="${iconStyle(RES.COAL)}"></div>1 уголь</div><span class="arrow">→</span><div class="item"><div class="dot" style="${iconStyle(b.inputOreType === RES.IRON ? RES.PLATE_IRON : RES.PLATE_COPPER)}"></div>1 плита</div></div>` : '<div class="recipe" style="color:#888">Ожидание руды с конвейера…</div>';
  panelContent.innerHTML = `<div class="info-line">Рецепт: <strong>${oreName}</strong> → плиты</div><div class="info-line">Скорость: 1 плита / ${FURNACE_INTERVAL.toFixed(1)} сек</div>${recipeHtml}<div class="stats-box"><div class="row"><span>Руда в буфере</span><span id="furnace-buffer-ore">${b.inputOre}</span></div><div class="row"><span>Уголь в буфере</span><span id="furnace-buffer-coal">${b.inputCoal}</span></div><div class="row"><span>Готовое (буфер)</span><span id="furnace-buf-out">${b.outputBuffer} / ${b.outputBufferMax}</span></div><div class="row"><span>Загрязнение печью</span><span id="furnace-live-pollution">${(b.pollutionMade || 0).toFixed(1)}%</span></div></div>${getDirPickerHtml(b.outputDir)}<button class="remove-btn" id="remove-btn">Удалить (вернуть 50%)</button>`;
  bindDirPicker(b);
  document.getElementById('remove-btn').addEventListener('click', () => { demolishBuilding(b); closePanel(); });
}

function renderLabPanel(b) {
  const interval = LAB_INTERVAL / state.labSpeedMult;
  panelContent.innerHTML = `<div class="info-line">Производит: <strong>1 🧬 / ${interval.toFixed(1)} сек</strong></div><div class="info-line">Расход: 1 🟤 плита + 1 🟠 плита</div><div class="info-line" style="color:#7fbf7f;font-size:12px;">ДНК капает в склад ядра</div><div class="stats-box"><div class="row"><span>Железных плит в ядре</span><span id="lab-plate-iron">${inventory[RES.PLATE_IRON]}</span></div><div class="row"><span>Медных плит в ядре</span><span id="lab-plate-copper">${inventory[RES.PLATE_COPPER]}</span></div><div class="row"><span>ДНК всего</span><span id="lab-dna">🧬 ${state.dna}</span></div></div><button class="remove-btn" id="remove-btn">Удалить (вернуть 50%)</button>`;
  document.getElementById('remove-btn').addEventListener('click', () => { demolishBuilding(b); closePanel(); });
}

function renderCutterPanel(b) {
  panelContent.innerHTML = `<div class="info-line">Рецепт: <strong>1 медная плита → 2 провода</strong></div><div class="info-line">Скорость: ${CUTTER_INTERVAL.toFixed(2)} сек</div><div class="recipe"><div class="item"><div class="dot" style="${iconStyle(RES.PLATE_COPPER)}"></div>1</div><span class="arrow">→</span><div class="item"><div class="dot" style="${iconStyle(RES.WIRE)}"></div>2</div></div><div class="stats-box"><div class="row"><span>Медных плит в буфере</span><span id="cutter-in">${b.inputBuffer}</span></div><div class="row"><span>Проводов в буфере</span><span id="cutter-out">${b.outputBuffer} / ${b.outputBufferMax}</span></div></div>${getDirPickerHtml(b.outputDir)}<button class="remove-btn" id="remove-btn">Удалить (вернуть 50%)</button>`;
  bindDirPicker(b);
  document.getElementById('remove-btn').addEventListener('click', () => { demolishBuilding(b); closePanel(); });
}

function renderCrafterPanel(b) {
  const currentRecipe = b.selectedRecipe ? getRecipesForBuilding(b).find(r => r.id === b.selectedRecipe) : null;
  let recipeHtml = currentRecipe ? `<div class="info-line">Производит: <strong>${currentRecipe.name}</strong></div><div class="info-line">Скорость: ${currentRecipe.count} шт / ${currentRecipe.time.toFixed(1)} сек</div><div class="recipe">${recipeInputsHtml(currentRecipe, b)}<span class="arrow">→</span><div class="item"><div class="dot" style="${iconStyle(currentRecipe.output)}"></div>${currentRecipe.count}</div></div>` : `<div class="recipe" style="color:#888">Рецепт не выбран</div>`;
  let bufferRows = '';
  for (const resType in b.inputBuffer) { const count = b.inputBuffer[resType]; if (count <= 0) continue; bufferRows += `<div class="row"><span><div class="dot" style="display:inline-block;width:12px;height:12px;vertical-align:middle;margin-right:6px;background-size:contain;background-repeat:no-repeat;background-position:center;image-rendering:pixelated;${iconStyle(parseInt(resType))}"></div>${RES_NAME[resType]}</span><span>${count}</span></div>`; }
  if (!bufferRows) bufferRows = '<div class="row"><span style="color:#888;">Вход пуст</span><span></span></div>';
  panelContent.innerHTML = `${recipeHtml}<button class="option-btn" id="change-recipe-btn" style="margin-top:10px;justify-content:center;"><span class="opt-label">${currentRecipe ? 'Сменить рецепт' : 'Выбрать рецепт'}</span></button><div class="stats-box"><div style="font-size:11px;color:#888;margin-bottom:6px;">Буферы входа:</div>${bufferRows}<div class="row"><span>Готовое (буфер)</span><span id="crafter-buf-out">${b.outputBuffer} / ${b.outputBufferMax}</span></div></div>${getDirPickerHtml(b.outputDir)}<button class="remove-btn" id="remove-btn">Удалить (вернуть 50%)</button>`;
  bindDirPicker(b);
  document.getElementById('change-recipe-btn').addEventListener('click', () => openRecipePicker(b));
  document.getElementById('remove-btn').addEventListener('click', () => { demolishBuilding(b); closePanel(); });
}

function renderStoragePanel(b) {
  const total = getStorageTotal(b), pct = total / STORAGE_CAPACITY;
  let rowsHtml = ''; const keys = Object.keys(b.items).filter(k => b.items[k] > 0);
  if (keys.length === 0) rowsHtml = '<div class="row"><span style="color:#888;">Склад пуст</span><span></span></div>';
  else for (const k of keys) { const resType = parseInt(k); rowsHtml += `<div class="row"><span><div class="dot" style="display:inline-block;width:12px;height:12px;vertical-align:middle;margin-right:6px;background-size:contain;background-repeat:no-repeat;background-position:center;image-rendering:pixelated;${iconStyle(resType)}"></div>${RES_NAME[resType]}</span><span>${b.items[k]}</span></div>`; }
  panelContent.innerHTML = `<div class="info-line">Вместимость: <strong>${total} / ${STORAGE_CAPACITY}</strong></div><div style="height:8px;background:#333;border-radius:4px;margin:8px 0;overflow:hidden;"><div style="height:100%;background:#a0a0c0;width:${Math.round(pct * 100)}%;"></div></div><div class="info-line" style="color:#e06060;font-size:12px;">⚠ При разрушении всё содержимое пропадёт</div><div class="stats-box">${rowsHtml}</div><button class="remove-btn" id="remove-btn">Удалить (вернуть 50%)</button>`;
  document.getElementById('remove-btn').addEventListener('click', () => { demolishBuilding(b); closePanel(); });
}

function renderTurretPanel(b) {
  const range = TURRET_RANGE_BASE + state.turretRangeBonus * TILE, rangeTiles = Math.round(range / TILE);
  const damage = TURRET_DAMAGE_BASE + state.turretDamageBonus, fireInterval = TURRET_FIRE_INTERVAL / state.turretFireRateMult;
  panelContent.innerHTML = `<div class="info-line">Урон: <strong>${damage}</strong> за выстрел</div><div class="info-line">Скорострельность: <strong>1 / ${fireInterval.toFixed(2)} сек</strong></div><div class="info-line">Радиус: <strong>${rangeTiles} тайлов</strong></div><div class="info-line">Патроны в ядре: <strong style="color:${inventory[RES.AMMO] > 0 ? '#7fbf7f' : '#e06060'}">${inventory[RES.AMMO]}</strong></div><div class="info-line" style="color:#888;font-size:12px;">Тратит 1 патрон за выстрел. Нет патронов — не стреляет.</div><div class="stats-box"><div class="row"><span>Убийств</span><span id="turret-kills">${b.totalKills || 0}</span></div><div class="row"><span>HP</span><span id="turret-hp">${Math.round(b.hp)} / ${Math.round(b.maxHp)}</span></div></div><button class="remove-btn" id="remove-btn">Удалить (вернуть 50%)</button>`;
  document.getElementById('remove-btn').addEventListener('click', () => { demolishBuilding(b); closePanel(); });
}

function renderRadarPanel(b) {
  panelContent.innerHTML = `<div class="info-line">Сканирует территорию в радиусе 10 клеток.</div><div class="info-line" style="color:#7fbf7f;font-size:12px;">Снимает туман войны с окружающей территории.</div><div class="info-line" style="color:#e06060;font-size:12px;">Если радар сломают, туман вернется!</div><button class="remove-btn" id="remove-btn">Удалить (вернуть 50%)</button>`;
  document.getElementById('remove-btn').addEventListener('click', () => { demolishBuilding(b); closePanel(); });
}

function renderInserterPanel(b) {
  panelContent.innerHTML = `<div class="info-line">Берет предметы сзади, кладет спереди.</div><div class="info-line">Направление: <strong>${['Север', 'Восток', 'Юг', 'Запад'][b.dir]}</strong></div><div class="info-line" style="margin-top:8px;">В руке: <strong>${b.heldItem ? RES_NAME[b.heldItem] : 'Пусто'}</strong></div><button class="remove-btn" id="remove-btn" style="margin-top:16px;">Удалить (вернуть 50%)</button>`;
  document.getElementById('remove-btn').addEventListener('click', () => { demolishBuilding(b); closePanel(); });
}

export function openConveyorPanel(c) {
  state.panel = 'conveyor'; state.activeConveyor = c;
  
  if (c.type === 'conveyor') {
    openModal('↔️ Конвейер');
    const dirName = ['Север', 'Восток', 'Юг', 'Запад'][c.dir];
    panelContent.innerHTML = `<div class="info-line">Направление: <strong id="conveyor-dir-name">${dirName}</strong></div><div style="display:flex; gap:6px; margin:12px 0;"><button class="option-btn ${c.dir === 0 ? 'selected' : ''}" style="flex:1; padding:14px; font-size:22px; justify-content:center;" data-dir="0">↑</button><button class="option-btn ${c.dir === 1 ? 'selected' : ''}" style="flex:1; padding:14px; font-size:22px; justify-content:center;" data-dir="1">→</button><button class="option-btn ${c.dir === 2 ? 'selected' : ''}" style="flex:1; padding:14px; font-size:22px; justify-content:center;" data-dir="2">↓</button><button class="option-btn ${c.dir === 3 ? 'selected' : ''}" style="flex:1; padding:14px; font-size:22px; justify-content:center;" data-dir="3">←</button></div><div class="info-line">Предметов на ленте: <strong id="conveyor-items">${c.items.length}</strong> / ${CONVEYOR_CAPACITY}</div><button class="remove-btn" id="remove-btn">Удалить (вернуть 50%)</button>`;
    panelContent.querySelectorAll('[data-dir]').forEach(btn => {
      btn.addEventListener('click', () => {
        c.dir = parseInt(btn.dataset.dir);
        panelContent.querySelectorAll('[data-dir]').forEach(b => b.classList.toggle('selected', parseInt(b.dataset.dir) === c.dir));
        const nameEl = document.getElementById('conveyor-dir-name');
        if (nameEl) nameEl.textContent = ['Север', 'Восток', 'Юг', 'Запад'][c.dir];
      });
    });
    document.getElementById('remove-btn').addEventListener('click', () => { demolishConveyor(c); closePanel(); });
  
  } else if (c.type === 'splitter') {
    openModal('↔️ Распределитель');
    
    const filtersHtml = (currentFilter) => {
      let opt = `<option value="null">Любой</option>`;
      for (const key in RES_NAME) {
        opt += `<option value="${key}" ${currentFilter === parseInt(key) ? 'selected' : ''}>${RES_NAME[key]}</option>`;
      }
      return opt;
    };
    
    panelContent.innerHTML = `
      <div class="info-line">Разделяет поток на 2 направления.</div>
      <div class="info-line" style="margin-top:8px;">Выход 1: <select id="split-left" style="background:#222; color:#fff; border:1px solid #555; padding:6px; border-radius:4px; margin-left:8px;">${filtersHtml(c.filterLeft)}</select></div>
      <div class="info-line" style="margin-top:8px;">Выход 2: <select id="split-right" style="background:#222; color:#fff; border:1px solid #555; padding:6px; border-radius:4px; margin-left:8px;">${filtersHtml(c.filterRight)}</select></div>
      <button class="remove-btn" id="remove-btn" style="margin-top:16px;">Удалить (вернуть 50%)</button>
    `;
    
    document.getElementById('split-left').addEventListener('change', (e) => { 
      c.filterLeft = e.target.value === 'null' ? null : parseInt(e.target.value); 
    });
    document.getElementById('split-right').addEventListener('change', (e) => { 
      c.filterRight = e.target.value === 'null' ? null : parseInt(e.target.value); 
    });
    document.getElementById('remove-btn').addEventListener('click', () => { demolishSplitter(c); closePanel(); });

  } else if (c.type === 'underground') {
    openModal('⬇️ Подземный конвейер');
    const status = c.partner ? '✅ Связан' : '❌ Нет выхода';
    panelContent.innerHTML = `
      <div class="info-line">Статус: <strong>${status}</strong></div>
      <div class="info-line">Длина туннеля: до 4 тайлов</div>
      ${!c.partner ? '<div class="warn">Постройте второй конец на той же линии</div>' : ''}
      <button class="remove-btn" id="remove-btn" style="margin-top:16px;">Удалить (вернуть 50%)</button>
    `;
    document.getElementById('remove-btn').addEventListener('click', () => { demolishUnderground(c); closePanel(); });
  }
}

export function updateHUD() {
  if (uiDay) uiDay.textContent = `День ${state.day}`;
  uiIron.textContent = inventory[RES.IRON]; uiCopper.textContent = inventory[RES.COPPER]; uiCoal.textContent = inventory[RES.COAL];
  if (uiDNA) uiDNA.textContent = state.dna;
  uiPollution.textContent = formatPct(state.pollution);
  const lvl = getPollutionLevel(state.pollution);
  pollutionWidget.classList.remove('warn', 'danger', 'critical', 'extreme');
  if (lvl.cls) pollutionWidget.classList.add(lvl.cls);
  uiPollutionLevel.textContent = lvl.label;
  checkPollutionThresholds();

  if (currentInfoCardEntity) {
    const e = currentInfoCardEntity;
    if (e.isMonster) { const hpEl = document.getElementById('card-monster-hp'); if (hpEl) hpEl.textContent = `${Math.ceil(e.hp)} / ${Math.ceil(e.maxHp)}`; }
    else if (e.isNest) { const hpEl = document.getElementById('card-nest-hp'); if (hpEl) hpEl.textContent = `${Math.ceil(e.hp)} / ${Math.ceil(e.maxHp)}`; }
    else if (e.type === 'core') {
      const hpEl = document.getElementById('card-core-hp'); if (hpEl) hpEl.textContent = `${Math.round(state.coreHP)} / 1000`;
      const pollEl = document.getElementById('card-core-poll'); if (pollEl) pollEl.textContent = `${state.pollution.toFixed(1)}%`;
    } else if (e.type === 'mine') {
      const amountEl = document.getElementById('card-mine-amount');
      if (amountEl) { const amt = oreAmount[e.ty][e.tx]; amountEl.textContent = amt <= 0 ? 'Истощено' : Math.round(amt); }
      const bufEl = document.getElementById('card-mine-buf'); if (bufEl) bufEl.textContent = e.outputBuffer;
    } else if (e.type === 'furnace') {
      const oreEl = document.getElementById('card-furn-ore'); if (oreEl) oreEl.textContent = `${e.inputOre} ${e.inputOreType ? RES_NAME[e.inputOreType] : ''}`;
      const coalEl = document.getElementById('card-furn-coal'); if (coalEl) coalEl.textContent = e.inputCoal;
      const pollEl = document.getElementById('card-furn-poll'); if (pollEl) pollEl.textContent = `${((e.pollutionMade || 0)).toFixed(1)}%`;
    } else if (e.type === 'cutter') { const el = document.getElementById('card-cut-in'); if (el) el.textContent = e.inputBuffer; }
    else if (e.type === 'conveyor') { const el = document.getElementById('card-conv-items'); if (el) el.textContent = `${e.items.length} / ${CONVEYOR_CAPACITY}`; }
    else if (e.type === 'lab') { const el = document.getElementById('card-lab-dna'); if (el) el.textContent = state.dna; }
  }

  if (state.panel === 'info' && state.activeBuilding) {
    const b = state.activeBuilding;
    if (b.type === 'mine') {
      const el = document.getElementById('mine-remaining'); if (el) el.textContent = Math.round(oreAmount[b.ty][b.tx]);
      const el2 = document.getElementById('mine-buf'); if (el2) el2.textContent = b.outputBuffer + ' / ' + b.outputBufferMax;
    } else if (b.type === 'furnace') {
      const el = document.getElementById('furnace-buffer-ore'); if (el) el.textContent = b.inputOre;
      const el2 = document.getElementById('furnace-buffer-coal'); if (el2) el2.textContent = b.inputCoal;
      const el3 = document.getElementById('furnace-buf-out'); if (el3) el3.textContent = b.outputBuffer + ' / ' + b.outputBufferMax;
    } else if (b.type === 'lab') { const el = document.getElementById('lab-dna'); if (el) el.textContent = '🧬 ' + state.dna; }
    else if (b.type === 'cutter') {
      const el = document.getElementById('cutter-in'); if (el) el.textContent = b.inputBuffer;
      const el2 = document.getElementById('cutter-out'); if (el2) el2.textContent = b.outputBuffer + ' / ' + b.outputBufferMax;
    } else if (b.type === 'assembler' || b.type === 'chemplant') { const el = document.getElementById('crafter-buf-out'); if (el) el.textContent = b.outputBuffer + ' / ' + b.outputBufferMax; }
    else if (b.type === 'turret') {
      const el = document.getElementById('turret-kills'); if (el) el.textContent = b.totalKills || 0;
      const el2 = document.getElementById('turret-hp'); if (el2) el2.textContent = Math.round(b.hp) + ' / ' + Math.round(b.maxHp);
    }
  } else if (state.panel === 'conveyor' && state.activeConveyor) {
    const el = document.getElementById('conveyor-items'); if (el) el.textContent = state.activeConveyor.items.length;
  } else if (state.panel === 'research') {
    if (uiLastStudyTechId && !state.activeStudyTechId) renderResearchPanel();
    uiLastStudyTechId = state.activeStudyTechId;
    if (state.activeStudyTechId) {
      const activeCard = researchNodes.querySelector('.tech-card.selected');
      if (activeCard) {
        const statusEl = activeCard.querySelector('.tech-status');
        const barEl = activeCard.querySelector('.tech-progress-bar');
        const pct = getTechProgressPct(state.activeStudyTechId);
        if (statusEl) statusEl.textContent = pct.toFixed(1) + '%';
        if (barEl) barEl.style.width = pct + '%';
      }
    }
  } else if (state.panel === 'stats' && activeStatsTab === 'resources') {
    STAT_ROWS.forEach(row => {
      const rowEl = panelContent.querySelector(`[data-stat-key="${row.key}"]`);
      if (!rowEl) return;

      const val = getStatValue(row.key);
      const rate = getStatRate(row.key);
      const hist = state.statHistory[row.key] || [];

      const valEl = rowEl.querySelector('[data-val]');
      if (valEl) valEl.textContent = val;

      const rateEl = rowEl.querySelector('[data-rate]');
      let rateClass = '', rateText = '0', color = '#666';
      if (rate > 0.5) { rateClass = 'positive'; rateText = '+' + Math.round(rate); color = '#7fbf7f'; }
      else if (rate < -0.5) { rateClass = 'negative'; rateText = Math.round(rate).toString(); color = '#e06060'; }
      if (rateEl) {
        rateEl.className = 'stat-row-rate ' + rateClass;
        rateEl.textContent = rateText + ' /мин';
      }

      const sparkEl = rowEl.querySelector('[data-spark]');
      if (sparkEl) sparkEl.innerHTML = makeSparkline(hist, { width: 70, height: 24, color });
    });
  }
  updateResearchBadge();
}

function updateResearchBadge() {
  const researchTabBtn = document.querySelector('.dtab[data-tab="research"]');
  if (!researchTabBtn) return;
  const old = researchTabBtn.querySelector('.research-badge'); if (old) old.remove();
  if (hasAvailableResearch()) {
    const badge = document.createElement('span');
    badge.className = 'research-badge'; badge.textContent = '!';
    researchTabBtn.appendChild(badge);
  }
}

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

console.debug('[ui] loaded');