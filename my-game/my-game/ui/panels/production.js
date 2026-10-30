'use strict';

import { state, inventory, RES, RES_NAME, oreAmount, oreInitial, TILE, MINE_INTERVAL, FURNACE_INTERVAL } from '../../game.js';
import { LAB_INTERVAL, CUTTER_INTERVAL, flushOutputBuffer, getRecipeById, getRecipesForBuilding, demolishBuilding } from '../../buildings.js';
import { isTechOwned } from '../../research.js';
import { panelContent, closePanel, openModal } from '../core.js';
import { iconStyle } from '../utils.js';
import { playClick } from '../../audio.js';

export function getDirPickerHtml(currentDir) {
  const dirs = ['↑', '→', '↓', '←'];
  let html = `<div style="display:flex; gap:4px; margin-top:10px;"><span style="display:flex;align-items:center;font-size:12px;color:#888;margin-right:4px;">Выход:</span>`;
  html += `<button class="option-btn ${currentDir === null ? 'selected' : ''}" style="flex:1;padding:6px;justify-content:center;font-size:11px;" data-dir-picker="null">—</button>`;
  for (let i = 0; i < 4; i++) {
    html += `<button class="option-btn ${currentDir === i ? 'selected' : ''}" style="flex:1;padding:6px;justify-content:center;font-size:16px;" data-dir-picker="${i}">${dirs[i]}</button>`;
  }
  html += `</div>`;
  return html;
}

export function bindDirPicker(b) {
  panelContent.querySelectorAll('[data-dir-picker]').forEach(btn => {
    btn.addEventListener('click', () => {
      playClick();
      const val = btn.dataset.dirPicker;
      b.outputDir = (val === 'null') ? null : parseInt(val);
      if (b.outputDir !== null) flushOutputBuffer(b);
      panelContent.querySelectorAll('[data-dir-picker]').forEach(x => x.classList.toggle('selected', x.dataset.dirPicker === val));
    });
  });
}

export function renderMinePanel(b) {
  const amount = oreAmount[b.ty][b.tx], initial = oreInitial[b.ty][b.tx];
  const amountStr = Math.round(amount), minedStr = Math.round(initial - amount);
  const emptyNote = amount <= 0 ? '<div class="warn">Жила истощена</div>' : '', interval = MINE_INTERVAL / state.miningSpeedMult;
  panelContent.innerHTML = `<div class="info-line">Добывает: <strong>${RES_NAME[b.resourceType]}</strong></div><div class="info-line">Скорость: 1 ед. / ${interval.toFixed(2)} сек</div><div class="stats-box"><div class="row"><span>Осталось в жиле</span><span id="mine-remaining">${amountStr}</span></div><div class="row"><span>Добыто из жилы</span><span id="mine-mined">${minedStr}</span></div><div class="row"><span>В буфере</span><span id="mine-buf">${b.outputBuffer} / ${b.outputBufferMax}</span></div></div>${emptyNote}${getDirPickerHtml(b.outputDir)}<button class="remove-btn" id="remove-btn">Удалить (вернуть 50%)</button>`;
  bindDirPicker(b);
  document.getElementById('remove-btn').addEventListener('click', () => { playClick(); demolishBuilding(b); closePanel(); });
}

export function renderFurnacePanel(b) {
  const oreName = b.inputOreType === RES.IRON ? 'Железо' : b.inputOreType === RES.COPPER ? 'Медь' : '—';
  let recipeHtml = b.inputOreType ? `<div class="recipe"><div class="item"><div class="dot" style="${iconStyle(b.inputOreType)}"></div>1</div><span class="arrow">+</span><div class="item"><div class="dot" style="${iconStyle(RES.COAL)}"></div>1 уголь</div><span class="arrow">→</span><div class="item"><div class="dot" style="${iconStyle(b.inputOreType === RES.IRON ? RES.PLATE_IRON : RES.PLATE_COPPER)}"></div>1 плита</div></div>` : '<div class="recipe" style="color:#888">Ожидание руды с конвейера…</div>';
  panelContent.innerHTML = `<div class="info-line">Рецепт: <strong>${oreName}</strong> → плиты</div><div class="info-line">Скорость: 1 плита / ${FURNACE_INTERVAL.toFixed(1)} сек</div>${recipeHtml}<div class="stats-box"><div class="row"><span>Руда в буфере</span><span id="furnace-buffer-ore">${b.inputOre}</span></div><div class="row"><span>Уголь в буфере</span><span id="furnace-buffer-coal">${b.inputCoal}</span></div><div class="row"><span>Готовое (буфер)</span><span id="furnace-buf-out">${b.outputBuffer} / ${b.outputBufferMax}</span></div><div class="row"><span>Загрязнение печью</span><span id="furnace-live-pollution">${(b.pollutionMade || 0).toFixed(1)}%</span></div></div>${getDirPickerHtml(b.outputDir)}<button class="remove-btn" id="remove-btn">Удалить (вернуть 50%)</button>`;
  bindDirPicker(b);
  document.getElementById('remove-btn').addEventListener('click', () => { playClick(); demolishBuilding(b); closePanel(); });
}

export function renderLabPanel(b) {
  const interval = LAB_INTERVAL / state.labSpeedMult;
  panelContent.innerHTML = `<div class="info-line">Производит: <strong>1 🧬 / ${interval.toFixed(1)} сек</strong></div><div class="info-line">Расход: 1 🟤 плита + 1 🟠 плита</div><div class="info-line" style="color:#7fbf7f;font-size:12px;">ДНК капает в склад ядра</div><div class="stats-box"><div class="row"><span>Железных плит в ядре</span><span id="lab-plate-iron">${inventory[RES.PLATE_IRON]}</span></div><div class="row"><span>Медных плит в ядре</span><span id="lab-plate-copper">${inventory[RES.PLATE_COPPER]}</span></div><div class="row"><span>ДНК всего</span><span id="lab-dna">🧬 ${state.dna}</span></div></div><button class="remove-btn" id="remove-btn">Удалить (вернуть 50%)</button>`;
  document.getElementById('remove-btn').addEventListener('click', () => { playClick(); demolishBuilding(b); closePanel(); });
}

export function renderCutterPanel(b) {
  panelContent.innerHTML = `<div class="info-line">Рецепт: <strong>1 медная плита → 2 провода</strong></div><div class="info-line">Скорость: ${CUTTER_INTERVAL.toFixed(2)} сек</div><div class="recipe"><div class="item"><div class="dot" style="${iconStyle(RES.PLATE_COPPER)}"></div>1</div><span class="arrow">→</span><div class="item"><div class="dot" style="${iconStyle(RES.WIRE)}"></div>2</div></div><div class="stats-box"><div class="row"><span>Медных плит в буфере</span><span id="cutter-in">${b.inputBuffer}</span></div><div class="row"><span>Проводов в буфере</span><span id="cutter-out">${b.outputBuffer} / ${b.outputBufferMax}</span></div></div>${getDirPickerHtml(b.outputDir)}<button class="remove-btn" id="remove-btn">Удалить (вернуть 50%)</button>`;
  bindDirPicker(b);
  document.getElementById('remove-btn').addEventListener('click', () => { playClick(); demolishBuilding(b); closePanel(); });
}

export function recipeInputsHtml(recipe, b) {
  let html = '';
  for (const [resType, count] of recipe.inputs) {
    const have = b && b.inputBuffer ? (b.inputBuffer[resType] || 0) : null;
    const enough = have === null ? true : have >= count;
    const color = enough ? '#ccc' : '#e06060', haveStr = have !== null ? ` (${have}/${count})` : '';
    html += `<div class="item"><div class="dot" style="${iconStyle(resType)}"></div><span style="color:${color}">${count}${haveStr}</span></div>`;
  }
  return html;
}

export function openRecipePicker(b) {
  state.panel = 'recipe-pick'; state.activeBuilding = b;
  openModal(b.type === 'assembler' ? '⚙️ Сборщик — рецепт' : '🧪 Химзавод — рецепт');
  renderRecipePicker(b);
}

export function renderRecipePicker(b) {
  let recipes = getRecipesForBuilding(b);
  if (b.type === 'assembler' && !isTechOwned('unlock_basic_ammo')) {
    recipes = recipes.filter(r => r.id !== 'ammo');
  }

  let html = `<div style="font-size:12px;color:#888;margin-bottom:10px;">Выбери, что производить:</div>`;
  for (const r of recipes) {
    const isSelected = b.selectedRecipe === r.id;
    html += `<div class="tech-card ${isSelected ? 'owned' : ''}" style="cursor:pointer;" data-recipe="${r.id}"><div class="tech-head"><div class="tech-name">${r.name}${isSelected ? ' ✓' : ''}</div><div class="tech-status" style="color:#aaa;font-size:11px;">${r.time.toFixed(1)} сек</div></div><div style="display:flex;align-items:center;gap:6px;margin-top:6px;flex-wrap:wrap;">${recipeInputsHtml(r, null)}<span style="color:#888;font-size:14px;">→</span><div class="item"><div class="dot" style="${iconStyle(r.output)}"></div>${r.count} ${RES_NAME[r.output]}</div></div></div>`;
  }
  panelContent.innerHTML = html;
  panelContent.querySelectorAll('[data-recipe]').forEach(el => el.addEventListener('click', () => { playClick(); b.selectedRecipe = el.dataset.recipe; b.timer = 0; import('./index.js').then(m => m.openInfoPanel(b)); }));
}

export function renderCrafterPanel(b) {
  const currentRecipe = b.selectedRecipe ? getRecipesForBuilding(b).find(r => r.id === b.selectedRecipe) : null;
  let recipeHtml = currentRecipe ? `<div class="info-line">Производит: <strong>${currentRecipe.name}</strong></div><div class="info-line">Скорость: ${currentRecipe.count} шт / ${currentRecipe.time.toFixed(1)} сек</div><div class="recipe">${recipeInputsHtml(currentRecipe, b)}<span class="arrow">→</span><div class="item"><div class="dot" style="${iconStyle(currentRecipe.output)}"></div>${currentRecipe.count}</div></div>` : `<div class="recipe" style="color:#888">Рецепт не выбран</div>`;
  let bufferRows = '';
  for (const resType in b.inputBuffer) { const count = b.inputBuffer[resType]; if (count <= 0) continue; bufferRows += `<div class="row"><span><div class="dot" style="display:inline-block;width:12px;height:12px;vertical-align:middle;margin-right:6px;background-size:contain;background-repeat:no-repeat;background-position:center;image-rendering:pixelated;${iconStyle(parseInt(resType))}"></div>${RES_NAME[resType]}</span><span>${count}</span></div>`; }
  if (!bufferRows) bufferRows = '<div class="row"><span style="color:#888;">Вход пуст</span><span></span></div>';
  panelContent.innerHTML = `${recipeHtml}<button class="option-btn" id="change-recipe-btn" style="margin-top:10px;justify-content:center;"><span class="opt-label">${currentRecipe ? 'Сменить рецепт' : 'Выбрать рецепт'}</span></button><div class="stats-box"><div style="font-size:11px;color:#888;margin-bottom:6px;">Буферы входа:</div>${bufferRows}<div class="row"><span>Готовое (буфер)</span><span id="crafter-buf-out">${b.outputBuffer} / ${b.outputBufferMax}</span></div></div>${getDirPickerHtml(b.outputDir)}<button class="remove-btn" id="remove-btn">Удалить (вернуть 50%)</button>`;
  bindDirPicker(b);
  document.getElementById('change-recipe-btn').addEventListener('click', () => { playClick(); openRecipePicker(b); });
  document.getElementById('remove-btn').addEventListener('click', () => { playClick(); demolishBuilding(b); closePanel(); });
}